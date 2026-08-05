/**
 * PLC Collector untuk Station Sterilizer
 *
 * Service ini MANDIRI — hanya membaca device & tag dari database sendiri (mewah_pis_sterilizer_trial),
 * polling PLC sendiri via Snap7, update liveDataCache langsung, dan publish ke Redis.
 *
 * Tidak perlu central plc-collector lagi. Setiap station punya collector sendiri.
 */

import { createClient } from "redis";
import { dbPoolPlc } from "./config/db.js";
import { Snap7ClientWrapper } from "./snap7Client.js";
import { liveDataCache } from "./routes/monitorRoutes.js";

// ═══════════════════════════════════════════════════════
// KONFIGURASI
// ═══════════════════════════════════════════════════════
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || "200");
const REFRESH_CONFIG_INTERVAL_MS = 30000;
const MAX_BACKOFF_MS = 60000;
const STATION_SLUG = process.env.STATION_SLUG || "sterilizer";
const TAG_PREFIX = process.env.TAG_PREFIX || "STERI_";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const REDIS_CHANNEL = process.env.REDIS_CHANNEL || "kip:plc:data";
const COMMAND_CHANNEL = process.env.COMMAND_CHANNEL || "kip:plc:command";

// ═══════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════
let clients = new Map(); // key: deviceId
const lastTagValues = new Map(); // key: "deviceId:tagId"
const reconnectState = new Map(); // key: deviceId
const deviceStatusCache = new Map(); // key: deviceId → "CONNECTED"|"DISCONNECTED"
const deviceHeartbeat = new Map(); // key: deviceId → last heartbeat timestamp

// Redis
let redisPublisher = null;
let redisSubscriber = null;
let redisConnected = false;

// Thresholds (dari DB sendiri)
let thresholds = {};
const alarmStates = {};

// ═══════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════
export async function startPlcCollector() {
  console.log(`[plcCollector-${STATION_SLUG}] Starting...`);

  // 1. Connect Redis
  await connectRedis();

  // 2. Load thresholds
  await loadThresholds();
  setInterval(loadThresholds, 30000);

  // 3. Load configuration (devices + tags)
  await refreshConfiguration();

  console.log(
    `[plcCollector-${STATION_SLUG}] Started (poll every ${POLL_INTERVAL_MS}ms)`,
  );

  // 4. Start polling
  setInterval(pollAllDevices, POLL_INTERVAL_MS);

  // 5. Refresh config periodically
  setInterval(refreshConfiguration, REFRESH_CONFIG_INTERVAL_MS);
}

// ═══════════════════════════════════════════════════════
// REDIS
// ═══════════════════════════════════════════════════════
async function connectRedis() {
  try {
    redisPublisher = createClient({ url: REDIS_URL });
    redisSubscriber = createClient({ url: REDIS_URL });

    redisPublisher.on("connect", () => {
      redisConnected = true;
      console.log(`[plcCollector-${STATION_SLUG}] Redis publisher CONNECTED`);
    });
    redisPublisher.on("error", (err) => {
      redisConnected = false;
      console.error(
        `[plcCollector-${STATION_SLUG}] Redis publisher error: ${err.message}`,
      );
    });
    redisSubscriber.on("error", (err) => {
      console.error(
        `[plcCollector-${STATION_SLUG}] Redis subscriber error: ${err.message}`,
      );
    });

    await redisPublisher.connect();
    await redisSubscriber.connect();

    // Subscribe ke command channel untuk write ke PLC
    await redisSubscriber.subscribe(COMMAND_CHANNEL, handleCommand);
    console.log(
      `[plcCollector-${STATION_SLUG}] Subscribed to ${COMMAND_CHANNEL}`,
    );
  } catch (err) {
    console.warn(
      `[plcCollector-${STATION_SLUG}] Redis not available, running without Redis: ${err.message}`,
    );
  }
}

async function handleCommand(message) {
  let cmd;
  try {
    cmd = JSON.parse(message);
    if (cmd.stationSlug && cmd.stationSlug !== STATION_SLUG) return;

    let entry = null;
    let tag = null;

    for (const [clientId, clientEntry] of clients.entries()) {
      const foundTag = clientEntry.tags.find((t) => String(t.id) === String(cmd.tagId));
      if (foundTag) {
        entry = clientEntry;
        tag = foundTag;
        break;
      }
    }

    if (!entry || !tag) {
      console.warn(
        `[plcCollector-${STATION_SLUG}] Command for unknown tag: ${cmd.tagId}`,
      );
      return;
    }

    let val =
      tag.data_type === "BOOL"
        ? String(cmd.value) === "1" || String(cmd.value) === "true"
        : Number(cmd.value);

    console.log(
      `[plcCollector-${STATION_SLUG}] Write: ${tag.tag_name} → ${val}`,
    );
    await entry.client.writeTag(tag, val);

    // Update command status di DB
    if (cmd.cmdId) {
      await dbPoolPlc.query(
        "UPDATE plc_commands SET status = 'DONE', updated_at = NOW() WHERE id = ?",
        [cmd.cmdId],
      );
    }
  } catch (err) {
    console.error(
      `[plcCollector-${STATION_SLUG}] Command failed: ${err.message}`,
    );
    if (cmd?.cmdId) {
      dbPoolPlc
        .query(
          "UPDATE plc_commands SET status = 'ERROR', error_message = ? WHERE id = ?",
          [err.message, cmd.cmdId],
        )
        .catch(() => {});
    }
  }
}

export async function writeTagDirect(targetId, value) {
  let entry = null;
  let tag = null;

  for (const [clientId, clientEntry] of clients.entries()) {
    const foundTag = clientEntry.tags.find(
      (t) => String(t.id) === String(targetId) || t.tag_name === String(targetId)
    );
    if (foundTag) {
      entry = clientEntry;
      tag = foundTag;
      break;
    }
  }

  if (!entry || !tag) {
    throw new Error(`Tag not active or not found: ${targetId}`);
  }

  let val =
    tag.data_type === "BOOL"
      ? String(value) === "1" || String(value) === "true"
      : Number(value);

  console.log(
    `[plcCollector-${STATION_SLUG}] Direct Write: ${tag.tag_name} → ${val}`,
  );
  await entry.client.writeTag(tag, val);
  return { tag_name: tag.tag_name, value: val };
}

// ═══════════════════════════════════════════════════════
// THRESHOLDS
// ═══════════════════════════════════════════════════════
async function loadThresholds() {
  try {
    const [rows] = await dbPoolPlc.query("SELECT * FROM threshold_settings");
    const temp = {};
    rows.forEach((r) => {
      temp[r.parameter_key] = {
        warning: r.warning_val,
        danger: r.danger_val,
        unit: r.unit,
      };
    });
    thresholds = temp;
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      // Auto-create table jika belum ada
      await dbPoolPlc.query(`
        CREATE TABLE IF NOT EXISTS threshold_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          parameter_key VARCHAR(100) NOT NULL UNIQUE,
          lower_val DOUBLE DEFAULT 0,
          warning_val DOUBLE DEFAULT 50,
          danger_val DOUBLE DEFAULT 80,
          unit VARCHAR(20) DEFAULT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log(
        `[plcCollector-${STATION_SLUG}] Auto-created threshold_settings table`,
      );
    }
  }
}

// ═══════════════════════════════════════════════════════
// CONFIG: Baca device & tag dari DATABASE SENDIRI
// ═══════════════════════════════════════════════════════
async function refreshConfiguration() {
  try {
    const [devices] = await dbPoolPlc.query(
      "SELECT * FROM plc_devices WHERE enabled = 1",
    );
    const activeKeys = new Set();

    for (const device of devices) {
      const clientKey = String(device.id);
      activeKeys.add(clientKey);

      const [tags] = await dbPoolPlc.query(
        "SELECT * FROM plc_tags WHERE plc_id = ? AND enabled = 1",
        [device.id],
      );

      if (!clients.has(clientKey)) {
        console.log(
          `[plcCollector-${STATION_SLUG}] Initializing: ${device.name} (${device.ip_address})`,
        );
        clients.set(clientKey, {
          device,
          client: new Snap7ClientWrapper(device),
          tags: [],
        });
      }

      const entry = clients.get(clientKey);
      entry.device = device;
      entry.tags = tags;

      // Init status cache dari DB
      if (!deviceStatusCache.has(clientKey)) {
        deviceStatusCache.set(clientKey, device.status || "DISCONNECTED");
      }
    }

    // Hapus client yang sudah tidak aktif
    for (const key of clients.keys()) {
      if (!activeKeys.has(key)) {
        console.log(`[plcCollector-${STATION_SLUG}] Removing device: ${key}`);
        const entry = clients.get(key);
        entry.client.disconnect();
        clients.delete(key);
        reconnectState.delete(key);
      }
    }
  } catch (err) {
    console.error(
      `[plcCollector-${STATION_SLUG}] Config refresh failed: ${err.message}`,
    );
  }
}

// ═══════════════════════════════════════════════════════
// CONNECTION
// ═══════════════════════════════════════════════════════
async function connectWithBackoff(entry, clientKey) {
  const state = reconnectState.get(clientKey) || {
    attempts: 0,
    nextRetryAt: 0,
  };

  if (Date.now() < state.nextRetryAt) return false;

  try {
    await entry.client.connect();
    // Do NOT reset attempts to 0 here; only reset on successful read.
    console.log(
      `[plcCollector-${STATION_SLUG}] ✅ PLC ${entry.device.name} connected!`,
    );
    return true;
  } catch (e) {
    state.attempts++;
    const delay = Math.min(1000 * Math.pow(2, state.attempts), MAX_BACKOFF_MS);
    state.nextRetryAt = Date.now() + delay;
    reconnectState.set(clientKey, state);

    if (state.attempts <= 3 || state.attempts % 10 === 0) {
      console.warn(
        `[plcCollector-${STATION_SLUG}] PLC ${entry.device.name} connect failed (#${state.attempts}), retry in ${delay / 1000}s`,
      );
    }
    return false;
  }
}

// ═══════════════════════════════════════════════════════
// POLLING — baca semua PLC setiap 200ms
// ═══════════════════════════════════════════════════════
async function pollAllDevices() {
  const promises = [];

  for (const [clientKey, entry] of clients) {
    promises.push(pollDevice(clientKey, entry));
  }

  await Promise.allSettled(promises);
}

async function pollDevice(clientKey, entry) {
  const { device, client, tags } = entry;

  if (!client.connected) {
    const ok = await connectWithBackoff(entry, clientKey);
    if (!ok) {
      const prevStatus = deviceStatusCache.get(clientKey);
      if (prevStatus !== "DISCONNECTED") {
        deviceStatusCache.set(clientKey, "DISCONNECTED");
        dbPoolPlc
          .query(
            "UPDATE plc_devices SET status = 'DISCONNECTED' WHERE id = ?",
            [device.id],
          )
          .catch(() => {});
      }
      return;
    }
  }

  // ✅ CONNECTION SUCCESSFUL: Update status to CONNECTED in database immediately
  const connStatus = deviceStatusCache.get(clientKey);
  if (connStatus !== "CONNECTED") {
    deviceStatusCache.set(clientKey, "CONNECTED");
    dbPoolPlc
      .query(
        "UPDATE plc_devices SET status = 'CONNECTED', last_seen_at = NOW() WHERE id = ?",
        [device.id],
      )
      .catch(() => {});
  }

  if (!tags.length) return;

  try {
    const results = await client.readMultipleTags(tags);
    
    // ✅ SUCCESSFUL READ: Reset reconnect attempts to 0
    const state = reconnectState.get(clientKey);
    if (state && state.attempts > 0) {
      state.attempts = 0;
      state.nextRetryAt = 0;
      reconnectState.set(clientKey, state);
    }

    const batchPayload = [];
    const changedValues = [];

    for (const tag of tags) {
      const value = results.get(tag.id);
      if (value === undefined) continue;

      const sVal = String(value);
      const valToSave =
        tag.data_type === "BOOL"
          ? sVal === "true" || sVal === "1"
            ? "1"
            : "0"
          : sVal;

      const numericValue =
        tag.data_type === "BOOL"
          ? valToSave === "1"
            ? 1
            : 0
          : parseFloat(valToSave) || 0;

      // Untuk Redis payload
      batchPayload.push({
        id: tag.id,
        tag: tag.tag_name,
        value: numericValue,
      });

      const oldValue = liveDataCache[tag.tag_name];

      // Update liveDataCache — LANGSUNG, tanpa Redis
      liveDataCache[tag.tag_name] = value;

      // Threshold check
      checkThreshold(tag.tag_name, value, oldValue);

      // Simpan ke DB jika berubah
      if (hasValueChanged(clientKey, tag.id, tag.data_type, valToSave)) {
        changedValues.push([tag.id, valToSave]);
        updateLastValue(clientKey, tag.id, valToSave);
      }
    }

    // ⚡ PUBLISH ke Redis untuk service lain (realtime-service, dll)
    if (redisConnected && batchPayload.length > 0) {
      redisPublisher
        .publish(
          REDIS_CHANNEL,
          JSON.stringify({
            deviceId: device.id,
            ip: device.ip_address,
            timestamp: Date.now(),
            tags: batchPayload,
            stationSlug: STATION_SLUG,
          }),
        )
        .catch(() => {});
    }

    // ⚡ SIMPAN ke DB station sendiri
    if (changedValues.length > 0) {
      dbPoolPlc
        .query("INSERT INTO plc_tag_values (tag_id, value) VALUES ?", [
          changedValues,
        ])
        .catch(() => {});
    }

    if (batchPayload.length > 0) {
      const latestValues = batchPayload.map((t) => [t.id, String(t.value)]);
      dbPoolPlc
        .query(
          "INSERT INTO plc_tag_latest (tag_id, value) VALUES ? ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()",
          [latestValues],
        )
        .catch(() => {});
    }

    // Update status device — hanya jika berubah
    const prevStatus = deviceStatusCache.get(clientKey);
    if (prevStatus !== "CONNECTED") {
      deviceStatusCache.set(clientKey, "CONNECTED");
      dbPoolPlc
        .query(
          "UPDATE plc_devices SET status = 'CONNECTED', last_seen_at = NOW() WHERE id = ?",
          [device.id],
        )
        .catch(() => {});
    }

    // Heartbeat periodik (tiap 30 detik update last_seen_at)
    const lastBeat = deviceHeartbeat.get(clientKey) || 0;
    if (Date.now() - lastBeat > 30000) {
      deviceHeartbeat.set(clientKey, Date.now());
      dbPoolPlc
        .query("UPDATE plc_devices SET last_seen_at = NOW() WHERE id = ?", [
          device.id,
        ])
        .catch(() => {});
    }
  } catch (e) {
    // Increment reconnect backoff attempts on read/communication failure
    const state = reconnectState.get(clientKey) || {
      attempts: 0,
      nextRetryAt: 0,
    };
    state.attempts++;
    const delay = Math.min(1000 * Math.pow(2, state.attempts), MAX_BACKOFF_MS);
    state.nextRetryAt = Date.now() + delay;
    reconnectState.set(clientKey, state);

    if (state.attempts <= 3 || state.attempts % 10 === 0) {
      console.warn(
        `[plcCollector-${STATION_SLUG}] PLC ${device.name} communication failed (#${state.attempts}), retry in ${delay / 1000}s`,
      );
    }

    if (!client.connected) {
      console.warn(
        `[plcCollector-${STATION_SLUG}] PLC ${device.name} disconnected`,
      );
      const prevStatus = deviceStatusCache.get(clientKey);
      if (prevStatus !== "DISCONNECTED") {
        deviceStatusCache.set(clientKey, "DISCONNECTED");
        dbPoolPlc
          .query(
            "UPDATE plc_devices SET status = 'DISCONNECTED' WHERE id = ?",
            [device.id],
          )
          .catch(() => {});
      }
    }
  }
}

// ═══════════════════════════════════════════════════════
// CHANGE DETECTION
// ═══════════════════════════════════════════════════════
const DEADBAND = { REAL: 0.01, INT: 0, DINT: 0, BOOL: 0 };

function hasValueChanged(clientKey, tagId, dataType, newValue) {
  const key = `${clientKey}:${tagId}`;
  const lastVal = lastTagValues.get(key);
  if (lastVal === undefined) return true;
  if (dataType === "REAL") {
    return Math.abs(Number(newValue) - Number(lastVal)) > DEADBAND.REAL;
  }
  return String(newValue) !== String(lastVal);
}

function updateLastValue(clientKey, tagId, newValue) {
  const key = `${clientKey}:${tagId}`;
  lastTagValues.set(key, newValue);
}

// ═══════════════════════════════════════════════════════
// THRESHOLD CHECK
// ═══════════════════════════════════════════════════════
function checkThreshold(tagName, value, oldValue = "") {
  const thresh = thresholds[tagName];
  const numVal = parseFloat(value);
  if (!thresh || isNaN(numVal)) return;

  let severity = "INFO";
  if (numVal >= thresh.danger) severity = "ALARM";
  else if (numVal >= thresh.warning) severity = "WARNING";

  const lastState = alarmStates[tagName] || "INFO";
  if (severity !== lastState) {
    alarmStates[tagName] = severity;
    console.log(
      `[plcCollector-${STATION_SLUG}] ⚠️ ${tagName}: ${lastState} → ${severity} (${numVal})`,
    );

    dbPoolPlc
      .query(
        `INSERT INTO station_event_logs (tag_name, old_value, new_value, severity, source)
         VALUES (?, ?, ?, ?, 'PLC')`,
        [
          tagName,
          String(oldValue !== undefined ? oldValue : ""),
          String(numVal),
          severity,
        ],
      )
      .catch(() => {});
  }
}
