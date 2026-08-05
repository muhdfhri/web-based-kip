import { Router } from "express";
import { dbPoolPlc } from "../config/db.js";

const router = Router();

// In-memory cache for realtime tag values, updated by Redis subscriber
export const liveDataCache = {};

// GET /api/{station}/monitor/realtime
router.get("/realtime", (req, res) => {
  res.json({ success: true, data: liveDataCache });
});

// GET /api/{station}/monitor/historical
// Query parameters: period (H, D, W, M)
router.get("/historical", async (req, res) => {
  const { period = "H" } = req.query;

  let intervalCondition = "";
  let bucketMinutes = 1;
  let resolution = 60;

  if (period === "2H") {
    intervalCondition = "NOW() - INTERVAL 2 HOUR";
    bucketMinutes = 1;
    resolution = 120;
  } else if (period === "5H" || period === "H") {
    intervalCondition = "NOW() - INTERVAL 5 HOUR";
    bucketMinutes = 1;
    resolution = 300;
  } else if (period === "8H") {
    intervalCondition = "NOW() - INTERVAL 8 HOUR";
    bucketMinutes = 2;
    resolution = 240;
  } else if (period === "D") {
    intervalCondition = "NOW() - INTERVAL 24 HOUR";
    bucketMinutes = 5;
    resolution = 288;
  } else {
    intervalCondition = "NOW() - INTERVAL 5 HOUR";
    bucketMinutes = 1;
    resolution = 300;
  }

  try {
    // 1. Get mapped tag IDs
    const [mappings] = await dbPoolPlc.query(
      `SELECT equipment, tag_id FROM station_tag_mappings 
       WHERE equipment IN ('st1_pressure', 'st2_pressure', 'st3_pressure', 'st4_pressure', 'bpv_pres', 'bpv_pressure')`
    );

    const tagToEq = {};
    const eqToValues = {
      st1_pressure: new Array(resolution).fill(0),
      st2_pressure: new Array(resolution).fill(0),
      st3_pressure: new Array(resolution).fill(0),
      st4_pressure: new Array(resolution).fill(0),
      bpv: new Array(resolution).fill(0),
    };

    if (mappings.length === 0) {
      return res.json({
        success: true,
        data: {
          s1: eqToValues.st1_pressure,
          s2: eqToValues.st2_pressure,
          s3: eqToValues.st3_pressure,
          s4: eqToValues.st4_pressure,
          bpv: eqToValues.bpv,
          resolution,
        },
      });
    }

    const tagIds = [];
    for (const m of mappings) {
      tagToEq[m.tag_id] = m.equipment.startsWith('bpv') ? 'bpv' : m.equipment;
      tagIds.push(m.tag_id);
    }

    // 2. Fetch data from plc_tag_values
    const [logs] = await dbPoolPlc.query(
      `SELECT tag_id, value, timestamp 
       FROM plc_tag_values 
       WHERE tag_id IN (?) AND timestamp >= ${intervalCondition}
       ORDER BY timestamp ASC`,
      [tagIds]
    );

    // 3. Process into buckets in node.js
    const now = Date.now();
    const bucketMs = bucketMinutes * 60 * 1000;
    const startTime = now - (resolution * bucketMs);

    const buckets = {};

    for (const log of logs) {
      const eq = tagToEq[log.tag_id];
      const val = parseFloat(log.value);
      if (isNaN(val)) continue;

      const logTime = new Date(log.timestamp).getTime();
      let bucketIdx = Math.floor((logTime - startTime) / bucketMs);
      
      if (bucketIdx < 0) bucketIdx = 0;
      if (bucketIdx >= resolution) bucketIdx = resolution - 1;

      if (!buckets[eq]) buckets[eq] = {};
      if (!buckets[eq][bucketIdx]) buckets[eq][bucketIdx] = [];
      buckets[eq][bucketIdx].push(val);
    }

    // Average them
    for (const eq of Object.keys(eqToValues)) {
      if (!buckets[eq]) continue;
      
      let lastAvg = 0;
      for (let i = 0; i < resolution; i++) {
        const vals = buckets[eq][i];
        if (vals && vals.length > 0) {
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          eqToValues[eq][i] = parseFloat(avg.toFixed(2));
          lastAvg = parseFloat(avg.toFixed(2));
        } else {
          // Fill missing with previous value (Hold behavior)
          eqToValues[eq][i] = lastAvg;
        }
      }
    }

    res.json({
      success: true,
      data: {
        s1: eqToValues.st1_pressure,
        s2: eqToValues.st2_pressure,
        s3: eqToValues.st3_pressure,
        s4: eqToValues.st4_pressure,
        bpv: eqToValues.bpv,
        resolution,
      },
    });

  } catch (err) {
    console.error("Historical API error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
