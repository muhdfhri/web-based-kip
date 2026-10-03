import { Router } from 'express';
import { dbPoolPlc } from '../config/db.js';

const router = Router();

// In-memory cache for realtime tag values, updated by Redis subscriber
export const liveDataCache = {};

// GET /api/{station}/monitor/realtime
router.get('/realtime', (req, res) => {
  res.json({ success: true, data: liveDataCache });
});

// GET /api/{station}/monitor/historical
// Query parameters: period (2H, 5H, 8H, D), metric (LOAD, PV, TEMP)
router.get('/historical', async (req, res) => {
  const { period = '5H', metric = 'LOAD' } = req.query;

  let intervalCondition = '';
  let bucketMinutes = 1;
  let resolution = 60;

  if (period === '2H') {
    intervalCondition = 'NOW() - INTERVAL 2 HOUR';
    bucketMinutes = 1;
    resolution = 120;
  } else if (period === '5H' || period === 'H') {
    intervalCondition = 'NOW() - INTERVAL 5 HOUR';
    bucketMinutes = 1;
    resolution = 300;
  } else if (period === '8H') {
    intervalCondition = 'NOW() - INTERVAL 8 HOUR';
    bucketMinutes = 2;
    resolution = 240;
  } else if (period === 'D') {
    intervalCondition = 'NOW() - INTERVAL 24 HOUR';
    bucketMinutes = 5;
    resolution = 288;
  } else {
    intervalCondition = 'NOW() - INTERVAL 5 HOUR';
    bucketMinutes = 1;
    resolution = 300;
  }

  const isFlowMetric = metric === 'FLOW';
  const signalKey = metric === 'PV' ? 'PV' : metric === 'TEMP' ? 'TEMP' : metric === 'FLOW' ? 'FLOW' : 'LOAD';

  try {
    // 1. Get mapped tag IDs for EFB 1-4, Total Load, or Flow Sensors
    let mappings = [];
    if (isFlowMetric) {
      const [rows] = await dbPoolPlc.query(
        `SELECT equipment, signal_key, tag_id FROM station_tag_mappings 
         WHERE (signal_key IN ('WATER_FLOW', 'OIL_FLOW') 
            OR (equipment IN ('water_flow', 'oil_flow', 'card_water_flow', 'card_oil_flow', 'efb_water_flow', 'efb_oil_flow') AND signal_key = 'MONITOR')
            OR (equipment IN ('single_efb_1_value_sensor', 'single_efb_2_value_sensor', 'single_efb_3_value_sensor', 'single_efb_4_value_sensor', 'single_efb_1', 'single_efb_2', 'single_efb_3', 'single_efb_4') AND signal_key IN ('WATER_FLOW', 'OIL_FLOW')))`
      );
      mappings = rows;
    } else {
      const [rows] = await dbPoolPlc.query(
        `SELECT equipment, signal_key, tag_id FROM station_tag_mappings 
         WHERE (equipment IN ('efb_no_1', 'efb_no_2', 'efb_no_3', 'efb_no_4', 'efb1_card', 'efb2_card', 'efb3_card', 'efb4_card', 'efb_total_load', 'temp1', 'temp2', 'temp3', 'temp4', 'single_efb_1_value_sensor', 'single_efb_2_value_sensor', 'single_efb_3_value_sensor', 'single_efb_4_value_sensor') 
                AND (signal_key = ? OR signal_key = 'MONITOR'))`,
        [signalKey]
      );
      mappings = rows;
    }

    const tagToEqs = {};
    const tagIds = [];

    const eqToValues = {
      efb1: new Array(resolution).fill(0),
      efb2: new Array(resolution).fill(0),
      efb3: new Array(resolution).fill(0),
      efb4: new Array(resolution).fill(0),
      totalLoad: new Array(resolution).fill(0),
    };

    if (mappings && mappings.length > 0) {
      for (const m of mappings) {
        if (!m.tag_id) continue;
        const eq = (m.equipment || '').toLowerCase();
        const sig = (m.signal_key || '').toUpperCase();
        let targetKey = null;

        if (isFlowMetric) {
          if (sig === 'WATER_FLOW' || eq.includes('water')) {
            targetKey = 'efb1'; // Line 1 Water Flow di trend flow
          } else if (sig === 'OIL_FLOW' || eq.includes('oil')) {
            targetKey = 'efb2'; // Line 2 Oil Flow di trend flow
          }
        } else {
          if (eq.includes('1') || eq.includes('efb1') || eq.includes('efb_no_1') || eq.includes('temp1')) targetKey = 'efb1';
          else if (eq.includes('2') || eq.includes('efb2') || eq.includes('efb_no_2') || eq.includes('temp2')) targetKey = 'efb2';
          else if (eq.includes('3') || eq.includes('efb3') || eq.includes('efb_no_3') || eq.includes('temp3')) targetKey = 'efb3';
          else if (eq.includes('4') || eq.includes('efb4') || eq.includes('efb_no_4') || eq.includes('temp4')) targetKey = 'efb4';
          else if (eq.includes('total')) targetKey = 'totalLoad';
        }

        if (targetKey) {
          const tId = String(m.tag_id);
          if (!tagToEqs[tId]) tagToEqs[tId] = new Set();
          tagToEqs[tId].add(targetKey);
          if (!tagIds.includes(m.tag_id)) {
            tagIds.push(m.tag_id);
          }
        }
      }
    }

    // 2. Fetch latest live tag values as baseline fallback
    const latestMap = {};
    if (tagIds.length > 0) {
      try {
        const [latestRows] = await dbPoolPlc.query(
          'SELECT tag_id, value FROM plc_tag_latest WHERE tag_id IN (?)',
          [tagIds]
        );
        latestRows.forEach((r) => {
          const num = parseFloat(r.value);
          if (!isNaN(num)) latestMap[String(r.tag_id)] = num;
        });
      } catch (err) {
        console.warn('Failed to query plc_tag_latest:', err.message);
      }
    }

    // 3. Fetch logs from plc_tag_values
    let logs = [];
    if (tagIds.length > 0) {
      try {
        const [logRows] = await dbPoolPlc.query(
          `SELECT tag_id, value, timestamp 
           FROM plc_tag_values 
           WHERE tag_id IN (?) AND timestamp >= ${intervalCondition}
           ORDER BY timestamp ASC`,
          [tagIds]
        );
        logs = logRows;
      } catch (err) {
        console.warn('Failed to query plc_tag_values:', err.message);
      }
    }

    // 4. Process into buckets
    const now = Date.now();
    const bucketMs = bucketMinutes * 60 * 1000;
    const startTime = now - (resolution * bucketMs);

    const buckets = {};

    for (const log of logs) {
      const eqSet = tagToEqs[String(log.tag_id)];
      if (!eqSet) continue;
      const val = parseFloat(log.value);
      if (isNaN(val)) continue;

      const logTime = new Date(log.timestamp).getTime();
      let bucketIdx = Math.floor((logTime - startTime) / bucketMs);

      if (bucketIdx < 0) bucketIdx = 0;
      if (bucketIdx >= resolution) bucketIdx = resolution - 1;

      for (const eq of eqSet) {
        if (!buckets[eq]) buckets[eq] = {};
        if (!buckets[eq][bucketIdx]) buckets[eq][bucketIdx] = [];
        buckets[eq][bucketIdx].push(val);
      }
    }

    // 5. Fill array with actual averages or latest fallback
    for (const eq of Object.keys(eqToValues)) {
      // Find latest fallback value for this equipment
      let baselineVal = 0;
      for (const [tId, eqSet] of Object.entries(tagToEqs)) {
        if (eqSet.has(eq) && latestMap[tId] !== undefined) {
          baselineVal = latestMap[tId];
          break;
        }
      }

      let lastAvg = baselineVal;
      for (let i = 0; i < resolution; i++) {
        const vals = buckets[eq]?.[i];
        if (vals && vals.length > 0) {
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          eqToValues[eq][i] = parseFloat(avg.toFixed(1));
          lastAvg = parseFloat(avg.toFixed(1));
        } else {
          eqToValues[eq][i] = lastAvg;
        }
      }
    }

    res.json({
      success: true,
      data: {
        ...eqToValues,
        resolution,
      },
    });
  } catch (err) {
    console.error('EFB Historical API error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
