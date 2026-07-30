/**
 * PLC Collector untuk Station Sterilizer
 *
 * Service ini MANDIRI — hanya membaca device & tag dari database sendiri (mewah_sterilizer),
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

// ── Cycle Catcher State (Perekam Logsheet Dinamis) ──
const cycleState = new Map(); // key: deviceId → { status, currentStep, stepTimeline: [], lastStepTime, doorInlet: { openAt: null, duration: 0 }, doorOutlet: { openAt: null, duration: 0 } }
const deviceHeartbeat = new Map(); // key: deviceId → last heartbeat timestamp

// Redis
let redisPublisher = null;
let redisSubscriber = null;
let redisConnected = false;

// Thresholds (dari DB sendiri)
let thresholds = {};
const alarmStates = {};

// ═══════════════════════════════════════════════════════
// ─── START
// ─────────────────────────────────────────────────────────────────────────────
export async function publishCommand(tagId, value) {
  if (!redisConnected || !redisPublisher) {
    throw new Error("Redis publisher is not connected");
  }
  const cmd = { tagId, value, stationSlug: STATION_SLUG };
  await redisPublisher.publish(COMMAND_CHANNEL, JSON.stringify(cmd));
}

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

  // 4. Start polling using async loop to prevent overlapping requests
  const runPollLoop = async () => {
    const start = Date.now();
    await pollAllDevices();
    const elapsed = Date.now() - start;
    const delay = Math.max(10, POLL_INTERVAL_MS - elapsed);
    setTimeout(runPollLoop, delay);
  };
  runPollLoop();

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
    try {
      if (changedValues.length > 0) {
        await dbPoolPlc.query("INSERT INTO plc_tag_values (tag_id, value) VALUES ?", [
          changedValues,
        ]);
        await dbPoolPlc.query(
          "INSERT INTO plc_tag_latest (tag_id, value) VALUES ? ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()",
          [changedValues],
        );
      }
    } catch (dbErr) {
      console.error(`[plcCollector-${STATION_SLUG}] DB Insert Error:`, dbErr.message);
    }

    // --- CYCLE CATCHER ---
    await processCycleCatcher(device);

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
const DEADBAND = { REAL: 0.05, INT: 0, DINT: 0, BOOL: 0 };

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
    // DB Logging to station_event_logs has been removed as requested.
  }
}

// ═══════════════════════════════════════════════════════
// CYCLE CATCHER (LOGSHEET OTOMATIS)
// ═══════════════════════════════════════════════════════
async function processCycleCatcher(device) {
  const dId = device.id;
  const currentStepVal = liveDataCache[`CurrentStep[${dId}]`];
  const statusVal = liveDataCache[`status_overview[${dId}]`];
  const doorIn = liveDataCache[`Door_in[${dId}]`];
  const doorOut = liveDataCache[`Door_out[${dId}]`];

  let state = cycleState.get(dId);
  if (!state) {
    state = {
      isCycleRunning: false,
      cycleStartTime: null,
      lastStep: null,
      lastStepTime: null,
      stepTimeline: [],
      doorInlet: { closedAt: null, duration: 0 },
      doorOutlet: { duration: 0 },
      lastDoorIn: false,
      lastDoorOut: false,
      lastSavedCycleId: null,
      cycleStopTime: null,
      lastValidCycleData: null
    };
    cycleState.set(dId, state);
  }

  const now = new Date();

  // 1. Door Tracking
  const isDoorInOpen = (String(doorIn) === "1" || String(doorIn) === "true");
  if (!isDoorInOpen && state.lastDoorIn) {
    // Pintu Inlet ditutup
    state.doorInlet.closedAt = now;
  }
  state.lastDoorIn = isDoorInOpen;

  const isDoorOutOpen = (String(doorOut) === "1" || String(doorOut) === "true");
  if (isDoorOutOpen && !state.lastDoorOut) {
    // Pintu Outlet dibuka
    if (state.lastSavedCycleId && state.cycleStopTime) {
      const unloadDuration = Math.round((now - state.cycleStopTime) / 1000);
      
      // Update the database with the unloading duration
      dbPoolPlc.query(
        `UPDATE sterilizer_cycle_logs SET door_details = JSON_SET(COALESCE(door_details, '{}'), '$.outlet.duration', ?) WHERE id = ?`,
        [unloadDuration, state.lastSavedCycleId]
      ).then(() => {
        console.log(`[plcCollector-${STATION_SLUG}] Updated Unloading Duration for Cycle ID ${state.lastSavedCycleId}: ${unloadDuration}s`);
      }).catch(err => {
        console.error(`[plcCollector-${STATION_SLUG}] Failed to update unloading duration:`, err.message);
      });

      state.lastSavedCycleId = null;
    }
  }
  state.lastDoorOut = isDoorOutOpen;

  // 2. Cycle Start
  const stepNum = parseInt(currentStepVal) || 0;
  
  // Try to find inlet steam % or boolean state
  const inletSteamVal = liveDataCache[`ValvePercent_[${dId}]`] || 0;
  const numInlet = parseFloat(inletSteamVal);
  const isInlet100 = (!isNaN(numInlet) && numInlet >= 99) || String(inletSteamVal).toLowerCase() === "true" || String(inletSteamVal) === "1";

  // Fallback agar logsheet tidak mati jika pembacaan gagal
  const isTagMissing = inletSteamVal === 0 && !Object.keys(liveDataCache).some(k => k.toLowerCase().includes("valvepercent"));
  const canStartCycle = isTagMissing ? (stepNum === 1) : (stepNum === 1 && isInlet100);

  if (!state.isCycleRunning && canStartCycle) {
    state.isCycleRunning = true;
    state.cycleStartTime = now;
    
    // Hitung durasi Loading (FFB In)
    if (state.doorInlet.closedAt) {
      state.doorInlet.duration = Math.round((now - state.doorInlet.closedAt) / 1000);
    } else {
      state.doorInlet.duration = 0;
    }

    state.stepTimeline = [];
    state.lastStep = stepNum;
    state.lastStepTime = now;
    state.lastValidCycleData = { ...liveDataCache };
  }

  if (state.isCycleRunning && stepNum > 1) {
    state.lastValidCycleData = { ...liveDataCache };
  }

  // 3. Step Timeline tracking
  let isCycleFinished = false;

  if (state.isCycleRunning) {
    // If step changed, record the duration of the previous step
    if (stepNum !== state.lastStep) {
      if (state.lastStep > 0 && state.lastStepTime) {
        state.stepTimeline.push({
          step: state.lastStep,
          start_time: state.lastStepTime,
          end_time: now,
          duration: Math.round((now - state.lastStepTime) / 1000)
        });
      }

      // Check for Flexible Cycle Stop condition
      // Jika step melompat kembali ke 1 dari angka berapapun (misal dari 13 atau 15), cycle selesai.
      if (stepNum === 1 && state.lastStep > 1) {
        isCycleFinished = true;
      } 
      else {
        state.lastStep = stepNum;
        state.lastStepTime = now;
      }
    }
  }

  // 4. Cycle Stop (Snapshot & Insert)
  if (isCycleFinished && state.isCycleRunning) {
    state.isCycleRunning = false;

    try {
      const cycleDataJson = JSON.stringify(state.lastValidCycleData || liveDataCache); 
      const doorDetailsJson = JSON.stringify({
        inlet: state.doorInlet,
        outlet: state.doorOutlet
      });
      const stepDetailsJson = JSON.stringify(state.stepTimeline);

      let cycleNumber = 1;
      const todayStr = now.toISOString().split('T')[0];
      const [rows] = await dbPoolPlc.query(
        "SELECT MAX(cycle_number) as maxCycle FROM sterilizer_cycle_logs WHERE device_id = ? AND DATE(start_time) = ?",
        [dId, todayStr]
      );
      if (rows.length > 0 && rows[0].maxCycle) {
        cycleNumber = rows[0].maxCycle + 1;
      }

      const [insertResult] = await dbPoolPlc.query(
        `INSERT INTO sterilizer_cycle_logs 
          (device_id, cycle_number, start_time, end_time, door_details, step_details, cycle_data)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          dId, 
          cycleNumber, 
          state.cycleStartTime || now, 
          now, 
          doorDetailsJson, 
          stepDetailsJson, 
          cycleDataJson
        ]
      );
      
      // Simpan ID & Waktu Stop untuk update Unloading nanti
      state.lastSavedCycleId = insertResult.insertId;
      state.cycleStopTime = now;

      console.log(`[plcCollector-${STATION_SLUG}] Cycle Catch! Device ${dId} Cycle ${cycleNumber} saved to DB.`);
    } catch (e) {
      console.error(`[plcCollector-${STATION_SLUG}] Cycle Catch Error:`, e.message);
    }

    // Reset cycle states
    state.doorInlet = { closedAt: null, duration: 0 };
    state.doorOutlet = { duration: 0 };
    state.cycleStartTime = null;
    state.stepTimeline = [];
    state.lastValidCycleData = null;
  }
}

