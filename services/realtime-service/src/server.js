import { createServer } from "http";
import { Server } from "socket.io";
import { createClient } from "redis";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { dbPool } from "./config/db.js";
import plcRoutes from "./routes/plcRoutes.js";
import plcConfigRoutes from "./routes/plcConfigRoutes.js";

dotenv.config();

// ═══════════════════════════════════════════════════════
// DYNAMIC STATION REGISTRY — loaded from mewah_kip_config
// ═══════════════════════════════════════════════════════
let STATIONS = [];
let PREFIX_MAP = [];

async function loadStationRegistry() {
  let pool = dbPool;
  const configDb = process.env.DB_NAME_CONFIG || "mewah_config";
  try {
    const [rows] = await pool.query(
      `SELECT slug, title, db_name, tag_prefixes
       FROM \`${configDb}\`.station_registry
       WHERE is_active = 1
       ORDER BY sort_order`,
    );
    STATIONS = rows.map((r) => r.db_name);
    PREFIX_MAP = rows.map((r) => ({
      slug: r.slug,
      db_name: r.db_name,
      prefixes: JSON.parse(r.tag_prefixes || "[]"),
    }));
    console.log(
      `[realtime-service] Loaded ${STATIONS.length} active stations from registry (${configDb})`,
    );
  } catch (err) {
    try {
      const mysql = await import("mysql2/promise");
      const configPool = mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "kip_backend",
        password: process.env.DB_PASSWORD || "",
        database: configDb,
        waitForConnections: true,
        connectionLimit: 2,
      });
      const [rows] = await configPool.query(
        "SELECT slug, title, db_name, tag_prefixes FROM station_registry WHERE is_active = 1 ORDER BY sort_order",
      );
      STATIONS = rows.map((r) => r.db_name);
      PREFIX_MAP = rows.map((r) => ({
        slug: r.slug,
        db_name: r.db_name,
        prefixes: JSON.parse(r.tag_prefixes || "[]"),
      }));
      await configPool.end();
      console.log(
        `[realtime-service] Loaded ${STATIONS.length} active stations (via config pool for ${configDb})`,
      );
    } catch (err2) {
      console.error(
        `[realtime-service] Failed to load station registry from ${configDb} (all attempts):`,
        err2.message,
      );
    }
  }
}

const PORT = process.env.PORT || 3002;
const REDIS_CHANNEL = process.env.REDIS_CHANNEL || "kip:plc:data";

const app = express();
const httpServer = createServer(app);

// ── Middleware ──
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
  : true;
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

// ── Socket.IO ──
const io = new Server(httpServer, {
  cors: { origin: corsOrigins, methods: ["GET", "POST"], credentials: true },
});

// ── Redis Subscriber ──
const redisSubscriber = createClient({ url: process.env.REDIS_URL });
redisSubscriber
  .connect()
  .then(() => console.log("[realtime-service] Redis subscriber connected"))
  .catch((err) =>
    console.error(
      "[realtime-service] Redis error:",
      err.message || err.toString() || err,
    ),
  );

// Load station registry from mewah_kip_config
loadStationRegistry().then(() => {
  console.log("[realtime-service] Station registry initialized");
});

// Refresh station registry periodically (every 60s)
setInterval(loadStationRegistry, 60000);

function resolveStationSlug(tagName) {
  if (!tagName) return null;
  const upper = tagName.toUpperCase();
  for (const item of PREFIX_MAP) {
    if (item.prefixes.some((p) => upper.startsWith(p))) {
      return item.slug;
    }
  }
  return null;
}

async function getMergedLatestTags() {
  const queries = STATIONS.map(
    (db) =>
      `SELECT t.tag_name as tag, l.value, l.updated_at as timestamp
     FROM \`${db}\`.plc_tag_latest l
     JOIN \`${db}\`.plc_tags t ON l.tag_id = t.id
     WHERE t.enabled = 1`,
  ).join("\nUNION ALL\n");

  const [rows] = await dbPool.query(queries);
  return rows;
}

// ══════════════════════════════════════════════════════════════
// CORE LOGIC: Subscribe Redis → broadcast to all frontend clients
// snap7-collector PUBLISHES to Redis → this service BROADCASTS via Socket.IO
// ══════════════════════════════════════════════════════════════
redisSubscriber.subscribe(REDIS_CHANNEL, async (message) => {
  try {
    const payload = JSON.parse(message);
    // 1. Immediate broadcast to all connected frontend clients
    io.emit("plc:batch", payload);
  } catch {}
});

// Broadcast real-time logsheet events to frontend
redisSubscriber.subscribe("kip:station:logs", async (message) => {
  try {
    const payload = JSON.parse(message);
    io.emit("station:log", payload);
  } catch {}
});

// ── Fallback DB poll (when Redis/collector is offline) ──
let fallbackPollInterval = null;
function startFallbackPolling() {
  if (fallbackPollInterval) return;
  console.log("[realtime-service] Starting DB fallback poll...");
  fallbackPollInterval = setInterval(async () => {
    try {
      const rows = await getMergedLatestTags();
      if (rows.length) {
        io.emit("plc:batch", {
          deviceId: null,
          timestamp: Date.now(),
          tags: rows.map((r) => ({
            id: null,
            tag: r.tag,
            value: parseFloat(r.value) || r.value,
            _fallback: true,
          })),
          source: "DB_FALLBACK",
        });
      }
    } catch {}
  }, 1000);
}
// startFallbackPolling(); // Disabled to prevent race conditions with Redis payload

// ── Socket.IO connection handler ──
io.on("connection", (socket) => {
  console.log(`[realtime-service] Frontend connected: ${socket.id}`);

  // Send snapshot on connect
  getMergedLatestTags()
    .then((rows) => {
      if (rows.length) {
        socket.emit("plc:batch", {
          deviceId: null,
          timestamp: Date.now(),
          tags: rows.map((r) => ({
            id: null,
            tag: r.tag,
            value: parseFloat(r.value) || 0,
          })),
          source: "DB_SNAPSHOT",
        });
      }
    })
    .catch((err) =>
      console.error(
        "[realtime-service] Failed to query snapshot:",
        err.message,
      ),
    );

  // Frontend → PLC command
  socket.on("plc:write", async ({ tagId, value, tagName, stationSlug }) => {
    console.log(`[realtime-service] RECEIVED plc:write -> tagId: ${tagId}, value: ${value}, tagName: ${tagName}, stationSlug: ${stationSlug}`);
    try {
      const resolvedSlug =
        stationSlug || resolveStationSlug(tagName) || "boiler-house";
      
      const stationEntry = PREFIX_MAP.find((item) => item.slug === resolvedSlug);
      const dbName = stationEntry && stationEntry.db_name
        ? stationEntry.db_name
        : `mewah_${resolvedSlug.replace(/-/g, "_")}`;

      const [result] = await dbPool.query(
        `INSERT INTO \`${dbName}\`.plc_commands (tag_id, value, status, created_at) VALUES (?, ?, ?, NOW())`,
        [tagId, String(value), "PENDING"],
      );

      // Publish command to Redis → snap7-collector will pick it up
      const redisPublisher = createClient({ url: process.env.REDIS_URL });
      await redisPublisher.connect();
      await redisPublisher.publish(
        "kip:plc:command",
        JSON.stringify({
          tagId,
          value,
          cmdId: result.insertId,
          stationSlug: resolvedSlug,
        }),
      );
      await redisPublisher.disconnect();
      socket.emit("plc:command:ack", { success: true, cmdId: result.insertId });
    } catch (err) {
      console.error("[realtime-service] plc:write error:", err.message);
      socket.emit("plc:command:ack", { success: false, error: err.message });
    }
  });

  socket.on("disconnect", () =>
    console.log(`[realtime-service] Frontend disconnected: ${socket.id}`),
  );
});

// ── REST Routes ──
app.use("/api/plc", plcRoutes);
app.use("/api/plc-config", plcConfigRoutes);

app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "realtime-service", mill: "KIP" }),
);

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(
    `[realtime-service] listening on port ${PORT} (Socket.IO + REST)`,
  );
});
