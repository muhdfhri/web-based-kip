import { Router } from 'express';
import { dbPool, dbPoolPlc } from '../config/db.js';
import { requireAuth, authorize } from '../middleware/jwtMiddleware.js';
import { writeTagDirect } from '../plcCollector.js';

const router = Router();

// Auto-create settings tables if they don't exist
async function initDb() {
  try {
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS station_parameters (
        param_key VARCHAR(100) PRIMARY KEY,
        param_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[efb-plant-settings] Database table station_parameters checked/created.');
  } catch (err) {
    console.error('[efb-plant-settings] Failed to create settings tables:', err.message);
  }
}
initDb();

router.use(requireAuth);

// GET /api/{station}/settings/thresholds
router.get('/thresholds', async (_req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM threshold_settings ORDER BY parameter_key ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/{station}/settings/thresholds (Upsert single threshold)
router.post('/thresholds', authorize(['developer', 'admin']), async (req, res) => {
  const { parameter_key, lower_val, warning_val, danger_val, unit } = req.body;
  try {
    await dbPool.query(
      `INSERT INTO threshold_settings (parameter_key, lower_val, warning_val, danger_val, unit)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE lower_val=?, warning_val=?, danger_val=?, unit=?`,
      [parameter_key, lower_val, warning_val, danger_val, unit, lower_val, warning_val, danger_val, unit]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/{station}/settings/write-tag-direct (Direct PLC Tag write for testing & control)
router.post('/write-tag-direct', authorize(['developer', 'admin']), async (req, res) => {
  const { tagId, value } = req.body;
  if (tagId === undefined || value === undefined) {
    return res.status(400).json({ success: false, error: 'tagId and value are required' });
  }
  try {
    const result = await writeTagDirect(tagId, value);
    res.json({ success: true, result });
  } catch (err) {
    console.error('[efb-write-tag-direct] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to fetch live mapped values and parameters
async function getSettingsData() {
  // Fetch live PLC values for mapped settings directly from PLC
  let mappedValues = [];
  try {
    const [rows] = await dbPoolPlc.query(`
      SELECT m.equipment, m.signal_key, l.value 
      FROM station_tag_mappings m 
      JOIN plc_tag_latest l ON m.tag_id = l.tag_id
      WHERE m.station = 'EFB-PLANT' OR m.station = 'efb-plant'
    `);
    mappedValues = rows;
  } catch (err) {
    console.warn('[efb-settings] Failed to query mappedValues:', err.message);
  }

  // Fetch stored parameters from station_parameters table
  let parameters = {};
  try {
    const [paramRows] = await dbPool.query('SELECT param_key, param_value FROM station_parameters');
    paramRows.forEach((row) => {
      try {
        parameters[row.param_key] = JSON.parse(row.param_value);
      } catch {
        parameters[row.param_key] = row.param_value;
      }
    });
  } catch (err) {
    console.warn('[efb-settings] Failed to query station_parameters:', err.message);
  }

  return {
    parameters: Object.keys(parameters).length > 0 ? parameters : null,
    mappedValues: mappedValues.length > 0 ? mappedValues : null,
    steamPid: parameters.steamPid || null,
    dilutionPid: parameters.dilutionPid || null,
    minMaxAmpLoad: parameters.minMaxAmpLoad || null,
  };
}

// GET /api/{station}/settings/all
router.get('/all', async (_req, res) => {
  try {
    const data = await getSettingsData();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/{station}/settings/recipes-and-params (compatibility with sterilizer pattern)
router.get('/recipes-and-params', async (_req, res) => {
  try {
    const data = await getSettingsData();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/{station}/settings/all (Save and direct write to PLC)
router.post('/all', authorize(['developer', 'admin']), async (req, res) => {
  const { steamPid, dilutionPid, minMaxAmpLoad, activeSet = 1, parameters, editedKeys } = req.body;
  const connection = await dbPool.getConnection();
  try {
    const plcErrors = [];

    // 1. Save parameters to station_parameters table
    const paramsToSave = {
      ...(parameters || {}),
      ...(steamPid ? { steamPid } : {}),
      ...(dilutionPid ? { dilutionPid } : {}),
      ...(minMaxAmpLoad ? { minMaxAmpLoad } : {}),
    };

    for (const [key, val] of Object.entries(paramsToSave)) {
      if (val === undefined || val === null) continue;
      const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      try {
        await connection.query(
          `INSERT INTO station_parameters (param_key, param_value)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE param_value = VALUES(param_value)`,
          [key, strVal]
        );
      } catch (dbErr) {
        console.error(`[efb-settings] Error saving parameter ${key}:`, dbErr.message);
      }
    }

    // 2. Fetch all tag mappings for EFB-PLANT
    let allTagMappings = [];
    try {
      const [rows] = await dbPoolPlc.query(
        "SELECT equipment, signal_key, tag_id FROM station_tag_mappings WHERE (station = 'EFB-PLANT' OR station = 'efb-plant') AND tag_id IS NOT NULL"
      );
      allTagMappings = rows;
    } catch (err) {
      console.warn('[efb-settings] Failed to load tag mappings:', err.message);
    }

    const tagMap = {};
    allTagMappings.forEach((row) => {
      tagMap[`${row.equipment}__${row.signal_key}`] = row.tag_id;
    });

    // 3. Write changed settings directly to PLC simulator
    const queueWrite = async (eqKey, sigKey, val) => {
      if (val === undefined || val === null) return;
      const mapKey = `${eqKey}__${sigKey}`;
      const tagId = tagMap[mapKey];
      if (tagId) {
        try {
          console.log(`[efb-settings] Writing direct to PLC tag ${tagId} (${mapKey}) = ${val}`);
          await writeTagDirect(tagId, Number(val));
        } catch (err) {
          console.warn(`[efb-settings] Direct write warning for ${mapKey} (tag ${tagId}):`, err.message);
          plcErrors.push(`Tag ${tagId} (${mapKey}): ${err.message}`);
        }
      }
    };

    const currentSet = activeSet || 1;

    // Steam PID
    if (steamPid && steamPid[currentSet]) {
      const setObj = steamPid[currentSet];
      for (const [mKey, pObj] of Object.entries(setObj)) {
        const num = mKey.replace('efb', '');
        for (const [field, val] of Object.entries(pObj)) {
          const eqKey = `efb_steam_pid_efb${num}_${field}`;
          const sigKey = field.toUpperCase();
          await queueWrite(eqKey, sigKey, val);
          await queueWrite(`efb_steam_pid_efb${num}`, sigKey, val);
        }
      }
    }

    // Dilution PID
    if (dilutionPid && dilutionPid[currentSet]) {
      const setObj = dilutionPid[currentSet];
      for (const [mKey, pObj] of Object.entries(setObj)) {
        const num = mKey.replace('efb', '');
        for (const [field, val] of Object.entries(pObj)) {
          const eqKey = `efb_dilution_pid_efb${num}_${field}`;
          const sigKey = field.toUpperCase();
          await queueWrite(eqKey, sigKey, val);
          await queueWrite(`efb_dilution_pid_efb${num}`, sigKey, val);
        }
      }
    }

    // Min-Max Amp & Load
    if (minMaxAmpLoad && minMaxAmpLoad[currentSet]) {
      const setObj = minMaxAmpLoad[currentSet];
      for (const [mKey, pObj] of Object.entries(setObj)) {
        const num = mKey.replace('efb', '');
        for (const [field, val] of Object.entries(pObj)) {
          const eqKey = `efb_minmax_efb${num}_${field}`;
          const sigKey = field.toUpperCase();
          await queueWrite(eqKey, sigKey, val);
          await queueWrite(`efb_minmax_efb${num}`, sigKey, val);
        }
      }
    }

    // Calibration 1 (Amp 1-4)
    if (parameters?.calib1 && typeof parameters.calib1 === 'object') {
      for (const [k, obj] of Object.entries(parameters.calib1)) {
        if (obj.maxSensor !== undefined && obj.maxSensor !== null) {
          await queueWrite(`calib_${k}`, 'MAX', obj.maxSensor);
        }
        if (obj.calibrationValue !== undefined && obj.calibrationValue !== null) {
          await queueWrite(`calib_${k}`, 'CALIB', obj.calibrationValue);
        }
      }
    }

    // Calibration 2 (Temp 1-4, Flow)
    if (parameters?.calib2 && typeof parameters.calib2 === 'object') {
      for (const [k, obj] of Object.entries(parameters.calib2)) {
        if (obj.maxSensor !== undefined && obj.maxSensor !== null) {
          await queueWrite(`calib_${k}`, 'MAX', obj.maxSensor);
        }
        if (obj.calibrationValue !== undefined && obj.calibrationValue !== null) {
          await queueWrite(`calib_${k}`, 'CALIB', obj.calibrationValue);
        }
      }
    }

    // Generic parameters map
    if (parameters && typeof parameters === 'object') {
      for (const [key, val] of Object.entries(parameters)) {
        if (key === 'calib1' || key === 'calib2') continue;
        const tagId = tagMap[`${key}__SETPOINT`] || tagMap[`${key}__VALUE`] || tagMap[key];
        if (tagId) {
          try {
            await writeTagDirect(tagId, Number(val));
          } catch (err) {
            plcErrors.push(`Param ${key}: ${err.message}`);
          }
        }
      }
    }

    res.json({
      success: true,
      plcWarnings: plcErrors.length > 0 ? plcErrors : undefined,
    });
  } catch (err) {
    console.error('[efb-settings] Save error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    connection.release();
  }
});

// POST /api/{station}/settings/recipes-and-params alias
router.post('/recipes-and-params', authorize(['developer', 'admin']), async (req, res, next) => {
  req.url = '/all';
  router.handle(req, res, next);
});

export default router;
