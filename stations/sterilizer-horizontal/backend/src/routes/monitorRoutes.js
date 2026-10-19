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
  const { period = "H", start, end } = req.query;

  let intervalCondition = "";
  let bucketMinutes = 1;
  let resolution = 60;

  const isCustomRange = start && end;
  let parsedStart, parsedEnd;

  if (isCustomRange) {
    parsedStart = new Date(Number(start) || start);
    parsedEnd = new Date(Number(end) || end);
    const diffMs = parsedEnd.getTime() - parsedStart.getTime();
    const diffSec = diffMs / 1000;
    // We want high-density (per second / 2 seconds / 5 seconds) representation.
    // Let's set resolution equal to diffSec up to a limit of 7200 points.
    resolution = Math.min(7200, Math.max(60, Math.floor(diffSec)));
  } else {
    if (period === "H") {
      intervalCondition = "NOW() - INTERVAL 1 HOUR";
      bucketMinutes = 1;
      resolution = 60;
    } else if (period === "D") {
      intervalCondition = "NOW() - INTERVAL 24 HOUR";
      bucketMinutes = 60;
      resolution = 24;
    } else if (period === "W") {
      intervalCondition = "NOW() - INTERVAL 7 DAY";
      bucketMinutes = 60 * 24; // 1 day bucket
      resolution = 7;
    } else if (period === "M") {
      intervalCondition = "NOW() - INTERVAL 30 DAY";
      bucketMinutes = 60 * 24;
      resolution = 30;
    } else {
      return res.status(400).json({ success: false, error: "Invalid period" });
    }
  }

  try {
    // 1. Get mapped tag IDs
    const [mappings] = await dbPoolPlc.query(
      `SELECT equipment, tag_id FROM station_tag_mappings 
       WHERE equipment IN (
         'st1_pressure', 'st2_pressure', 'st3_pressure', 'st4_pressure', 
         'bpv_pres', 'bpv_pressure', 'main_steam_pipe_flow',
         'st1_temp', 'st2_temp', 'st3_temp', 'st4_temp'
       )`
    );

    const tagToEq = {};
    const eqToValues = {
      st1_pressure: new Array(resolution).fill(0),
      st2_pressure: new Array(resolution).fill(0),
      st3_pressure: new Array(resolution).fill(0),
      st4_pressure: new Array(resolution).fill(0),
      bpv_pressure: new Array(resolution).fill(0),
      main_steam_pipe_flow: new Array(resolution).fill(0),
      st1_temp: new Array(resolution).fill(0),
      st2_temp: new Array(resolution).fill(0),
      st3_temp: new Array(resolution).fill(0),
      st4_temp: new Array(resolution).fill(0),
    };

    if (mappings.length === 0) {
      return res.json({
        success: true,
        data: {
          s1: eqToValues.st1_pressure,
          s2: eqToValues.st2_pressure,
          s3: eqToValues.st3_pressure,
          s4: eqToValues.st4_pressure,
          bpv: eqToValues.bpv_pressure,
          s1_press: eqToValues.st1_pressure,
          s2_press: eqToValues.st2_pressure,
          s3_press: eqToValues.st3_pressure,
          s4_press: eqToValues.st4_pressure,
          bpv_press: eqToValues.bpv_pressure,
          main_steam: eqToValues.main_steam_pipe_flow,
          s1_temp: eqToValues.st1_temp,
          s2_temp: eqToValues.st2_temp,
          s3_temp: eqToValues.st3_temp,
          s4_temp: eqToValues.st4_temp,
          resolution,
        },
      });
    }

    const tagIds = [];
    for (const m of mappings) {
      let eqKey = m.equipment;
      if (eqKey === 'bpv_pres') eqKey = 'bpv_pressure';
      tagToEq[m.tag_id] = eqKey;
      tagIds.push(m.tag_id);
    }

    // 2. Fetch data from plc_tag_values
    const queryCondition = isCustomRange 
      ? `timestamp BETWEEN ? AND ?`
      : `timestamp >= ${intervalCondition}`;
    const queryParams = isCustomRange 
      ? [tagIds, parsedStart, parsedEnd]
      : [tagIds];

    const [logs] = await dbPoolPlc.query(
      `SELECT tag_id, value, timestamp 
       FROM plc_tag_values 
       WHERE tag_id IN (?) AND ${queryCondition}
       ORDER BY timestamp ASC`,
      queryParams
    );

    // 3. Process into buckets in node.js
    const now = Date.now();
    const bucketMs = isCustomRange
      ? (parsedEnd.getTime() - parsedStart.getTime()) / resolution
      : bucketMinutes * 60 * 1000;
    const startTime = isCustomRange
      ? parsedStart.getTime()
      : now - (resolution * bucketMs);

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
          eqToValues[eq][i] = parseFloat(avg.toFixed(1));
          lastAvg = parseFloat(avg.toFixed(1));
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
        bpv: eqToValues.bpv_pressure,
        s1_press: eqToValues.st1_pressure,
        s2_press: eqToValues.st2_pressure,
        s3_press: eqToValues.st3_pressure,
        s4_press: eqToValues.st4_pressure,
        bpv_press: eqToValues.bpv_pressure,
        main_steam: eqToValues.main_steam_pipe_flow,
        s1_temp: eqToValues.st1_temp,
        s2_temp: eqToValues.st2_temp,
        s3_temp: eqToValues.st3_temp,
        s4_temp: eqToValues.st4_temp,
        resolution,
      },
    });

  } catch (err) {
    console.error("Historical API error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
