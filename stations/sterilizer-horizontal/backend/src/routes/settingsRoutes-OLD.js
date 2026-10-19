import { Router } from 'express';
import { dbPool } from '../config/db.js';
import { requireAuth, authorize } from '../middleware/jwtMiddleware.js';
import { publishCommand } from '../plcCollector.js';

const router = Router();

// Auto-create settings tables if they don't exist
async function initDb() {
  try {
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS \`station_parameters\` (
        \`param_key\` VARCHAR(100) PRIMARY KEY,
        \`param_value\` TEXT NOT NULL,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('[station-settings] Database table station_parameters checked/created.');
  } catch (err) {
    console.error('[station-settings] Failed to create settings tables:', err.message);
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
    
    // Log activity
    if (req.user && req.user.userRole !== 'developer') {
      await dbPool.query(
        "INSERT INTO mewah_auth.activity_logs (user_id, username, activity_type, description, ip_address, user_agent) VALUES (?, ?, 'setting_change', ?, ?, ?)",
        [req.user.userId, req.user.username, `Updated threshold for parameter ${parameter_key} in Sterilizer`, req.ip, req.headers['user-agent']]
      ).catch((err) => console.error('[SettingLog] Error:', err));
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/{station}/settings/recipes-and-params
router.get('/recipes-and-params', async (_req, res) => {
  try {
    const [paramRows] = await dbPool.query('SELECT * FROM station_parameters');
    const [recipeRows] = await dbPool.query('SELECT * FROM recipe_settings');
    
    // Fetch live PLC values for mapped settings
    const [mappedValues] = await dbPool.query(`
      SELECT m.equipment, m.signal_key, m.tag_id, l.value 
      FROM station_tag_mappings m 
      LEFT JOIN plc_tag_latest l ON m.tag_id = l.tag_id
    `);

    const parameters = {};
    paramRows.forEach(row => {
      try {
        parameters[row.param_key] = JSON.parse(row.param_value);
      } catch {
        parameters[row.param_key] = row.param_value;
      }
    });

    const recipes = { ripe: {}, unripe: {}, overripe: {} };
    recipeRows.forEach(row => {
      const cat = row.category;
      const line = row.line_number;
      if (!recipes[cat]) recipes[cat] = {};
      if (!recipes[cat][line]) recipes[cat][line] = [];
      recipes[cat][line].push({
        step: row.step_number,
        unf: row.unf,
        nrm: row.nrm,
        wet: row.wet,
        inl: row.inl === 1,
        con: row.con === 1,
        exh: row.exh === 1,
        bar: row.bar,
        mode: row.mode,
        doorIn: row.door_in,
        doorOut: row.door_out
      });
    });

    res.json({
      success: true,
      data: {
        recipes: recipeRows.length > 0 ? recipes : null,
        parameters: paramRows.length > 0 ? parameters : null,
        mappedValues: mappedValues.length > 0 ? mappedValues : null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/{station}/settings/recipes-and-params
router.post('/recipes-and-params', authorize(['developer', 'admin']), async (req, res) => {
  const { parameters, recipes } = req.body; 
  const connection = await dbPool.getConnection();
  try {
    const [oldParamRows] = await connection.query('SELECT param_key, param_value FROM station_parameters');
    const oldParamsMap = {};
    oldParamRows.forEach(r => oldParamsMap[r.param_key] = r.param_value);

    let changes = [];

    await connection.beginTransaction();

    if (parameters) {
      for (const [key, val] of Object.entries(parameters)) {
        const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
        const oldVal = oldParamsMap[key];
        if (oldVal !== strVal) {
          await connection.query(
            'INSERT INTO station_parameters (param_key, param_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE param_value=?',
            [key, strVal, strVal]
          );
          changes.push(`Param ${key}: ${oldVal} -> ${strVal}`);
        }
      }
    }

    if (recipes) {
      for (const cat of ['ripe', 'unripe', 'overripe']) {
        if (recipes[cat]) {
          for (const lineStr of Object.keys(recipes[cat])) {
            const line = Number(lineStr); if (isNaN(line)) continue;
            let steps = recipes[cat][lineStr]; if (steps && typeof steps === "object" && !Array.isArray(steps)) { steps = Object.values(steps); } if (!steps || typeof steps[Symbol.iterator] !== "function") continue;
            for (const stepObj of steps) { if (typeof stepObj !== "object" || !stepObj || isNaN(Number(stepObj.step))) continue;
              const unf = isNaN(Number(stepObj.unf)) ? 0 : Number(stepObj.unf);
              const nrm = isNaN(Number(stepObj.nrm)) ? 0 : Number(stepObj.nrm);
              const wet = isNaN(Number(stepObj.wet)) ? 0 : Number(stepObj.wet);
              const bar = isNaN(Number(stepObj.bar)) ? 0 : Number(stepObj.bar);
              await connection.query(
                `INSERT INTO recipe_settings 
                (category, line_number, step_number, unf, nrm, wet, inl, con, exh, bar, mode, door_in, door_out) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                ON DUPLICATE KEY UPDATE 
                unf=?, nrm=?, wet=?, inl=?, con=?, exh=?, bar=?, mode=?, door_in=?, door_out=?`,
                [
                  cat, line, stepObj.step, 
                  unf, nrm, wet, 
                  stepObj.inl ? 1 : 0, stepObj.con ? 1 : 0, stepObj.exh ? 1 : 0, 
                  bar, stepObj.mode || '-', stepObj.doorIn || '-', stepObj.doorOut || '-',
                  unf, nrm, wet, 
                  stepObj.inl ? 1 : 0, stepObj.con ? 1 : 0, stepObj.exh ? 1 : 0, 
                  bar, stepObj.mode || '-', stepObj.doorIn || '-', stepObj.doorOut || '-'
                ]
              );
            }
          }
        }
      }
      changes.push(`Recipes updated for ripe, unripe, overripe`);
    }

    await connection.commit();

    if (changes.length > 0 && req.user && req.user.userRole !== 'developer') {
      await dbPool.query(
        "INSERT INTO mewah_auth.activity_logs (user_id, username, activity_type, description, ip_address, user_agent) VALUES (?, ?, 'setting_change', ?, ?, ?)",
        [req.user.userId, req.user.username, `Updated sterilizer settings: ${changes.join(', ')}`, req.ip, req.headers['user-agent']]
      ).catch(e => console.error(e));
    }

    res.json({ success: true, message: 'Settings saved' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    connection.release();
  }
});

// POST /api/{station}/settings/send-plc
router.post('/send-plc', async (req, res) => {
  const { equipment, signal_key, value } = req.body;
  try {
    const [rows] = await dbPool.query(
      'SELECT tag_id FROM station_tag_mappings WHERE equipment = ? AND signal_key = ?',
      [equipment, signal_key]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Tag mapping not found' });
    }
    
    await publishCommand(rows[0].tag_id, value);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
