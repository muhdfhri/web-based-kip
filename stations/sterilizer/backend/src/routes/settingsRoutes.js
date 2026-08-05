import { Router } from 'express';
import { dbPool } from '../config/db.js';
import { requireAuth, authorize } from '../middleware/jwtMiddleware.js';

const router = Router();

// Auto-create settings tables if they don't exist
async function initDb() {
  try {
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS \`recipe_settings\` (
        \`category\` VARCHAR(50) NOT NULL,
        \`line_number\` INT NOT NULL,
        \`step_number\` INT NOT NULL,
        \`unf\` INT DEFAULT 0,
        \`nrm\` INT DEFAULT 0,
        \`wet\` INT DEFAULT 0,
        \`inl\` TINYINT(1) DEFAULT 0,
        \`con\` TINYINT(1) DEFAULT 0,
        \`exh\` TINYINT(1) DEFAULT 0,
        \`bar\` VARCHAR(20) DEFAULT '0.00',
        \`mode\` VARCHAR(20) DEFAULT 'OFF',
        \`door_in\` VARCHAR(20) DEFAULT 'Close',
        \`door_out\` VARCHAR(20) DEFAULT 'Close',
        PRIMARY KEY (\`category\`, \`line_number\`, \`step_number\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS \`station_parameters\` (
        \`param_key\` VARCHAR(100) PRIMARY KEY,
        \`param_value\` TEXT NOT NULL,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('[station-settings] Database tables recipe_settings and station_parameters checked/created.');
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
        "INSERT INTO mewah_pis_auth_trial.activity_logs (user_id, username, activity_type, description, ip_address, user_agent) VALUES (?, ?, 'setting_change', ?, ?, ?)",
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
    const [recipeRows] = await dbPool.query('SELECT * FROM recipe_settings ORDER BY category, line_number, step_number');
    const [paramRows] = await dbPool.query('SELECT * FROM station_parameters');
    
    // Fetch live PLC values for mapped settings
    const [mappedValues] = await dbPool.query(`
      SELECT m.equipment, m.signal_key, l.value 
      FROM station_tag_mappings m 
      JOIN plc_tag_latest l ON m.tag_id = l.tag_id
    `);

    const recipes = {
      ripe: { 1: [], 2: [], 3: [], 4: [] },
      unripe: { 1: [], 2: [], 3: [], 4: [] },
      overripe: { 1: [], 2: [], 3: [], 4: [] }
    };

    recipeRows.forEach(row => {
      const cat = row.category;
      const line = row.line_number;
      if (recipes[cat] && recipes[cat][line]) {
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
      }
    });

    const parameters = {};
    paramRows.forEach(row => {
      try {
        parameters[row.param_key] = JSON.parse(row.param_value);
      } catch {
        parameters[row.param_key] = row.param_value;
      }
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
  const { recipes, parameters } = req.body;
  const connection = await dbPool.getConnection();
  try {
    // 1. Fetch old data to compute diffs
    const [oldRecipeRows] = await connection.query('SELECT * FROM recipe_settings');
    const oldRecipesMap = {};
    oldRecipeRows.forEach(r => oldRecipesMap[`${r.category}_${r.line_number}_${r.step_number}`] = r);

    const [oldParamRows] = await connection.query('SELECT param_key, param_value FROM station_parameters');
    const oldParamsMap = {};
    oldParamRows.forEach(r => oldParamsMap[r.param_key] = r.param_value);

    let changes = [];

    await connection.beginTransaction();

    if (recipes) {
      const categories = ['ripe', 'unripe', 'overripe'];
      const insertValues = [];
      
      categories.forEach(cat => {
        const catRecipes = recipes[cat];
        if (catRecipes) {
          for (let line = 1; line <= 4; line++) {
            const steps = catRecipes[line];
            if (Array.isArray(steps)) {
              steps.forEach(step => {
                const newInl = step.inl ? 1 : 0;
                const newCon = step.con ? 1 : 0;
                const newExh = step.exh ? 1 : 0;
                const newBar = step.bar || '0.00';
                const newMode = step.mode || 'OFF';
                const newNrm = step.nrm || 0;
                const newUnf = step.unf || 0;
                const newWet = step.wet || 0;
                const newDoorIn = step.doorIn || 'Close';
                const newDoorOut = step.doorOut || 'Close';

                insertValues.push([
                  cat, line, step.step, newUnf, newNrm, newWet, newInl, newCon, newExh, newBar, newMode, newDoorIn, newDoorOut
                ]);

                // Diff
                const key = `${cat}_${line}_${step.step}`;
                const oldR = oldRecipesMap[key];
                if (!oldR) {
                  changes.push(`Added Recipe ${cat.toUpperCase()} L${line} S${step.step}`);
                } else {
                  let stepChanges = [];
                  if (oldR.nrm != newNrm) stepChanges.push(`NRM ${oldR.nrm}->${newNrm}`);
                  if (oldR.unf != newUnf) stepChanges.push(`UNF ${oldR.unf}->${newUnf}`);
                  if (oldR.wet != newWet) stepChanges.push(`WET ${oldR.wet}->${newWet}`);
                  if (oldR.bar != newBar) stepChanges.push(`BAR ${oldR.bar}->${newBar}`);
                  if (oldR.mode != newMode) stepChanges.push(`Mode ${oldR.mode}->${newMode}`);
                  if (oldR.con != newCon) stepChanges.push(`CON ${oldR.con}->${newCon}`);
                  if (oldR.inl != newInl) stepChanges.push(`INL ${oldR.inl}->${newInl}`);
                  if (oldR.exh != newExh) stepChanges.push(`EXH ${oldR.exh}->${newExh}`);
                  
                  if (stepChanges.length > 0) {
                    changes.push(`Recipe ${cat.toUpperCase()} L${line} S${step.step} (${stepChanges.join(', ')})`);
                  }
                }
              });
            }
          }
        }
      });

      if (insertValues.length > 0) {
        await connection.query(`
          INSERT INTO recipe_settings (category, line_number, step_number, unf, nrm, wet, inl, con, exh, bar, mode, door_in, door_out)
          VALUES ?
          ON DUPLICATE KEY UPDATE
            unf = VALUES(unf),
            nrm = VALUES(nrm),
            wet = VALUES(wet),
            inl = VALUES(inl),
            con = VALUES(con),
            exh = VALUES(exh),
            bar = VALUES(bar),
            mode = VALUES(mode),
            door_in = VALUES(door_in),
            door_out = VALUES(door_out)
        `, [insertValues]);
      }
    }

    if (parameters && typeof parameters === 'object') {
      const insertParams = [];
      Object.entries(parameters).forEach(([key, val]) => {
        const newStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
        insertParams.push([key, newStr]);
        
        // Diff
        const oldStr = oldParamsMap[key];
        if (oldStr !== newStr) {
          changes.push(`${key} (${oldStr || 'none'} -> ${newStr})`);
        }
      });

      if (insertParams.length > 0) {
        await connection.query(`
          INSERT INTO station_parameters (param_key, param_value)
          VALUES ?
          ON DUPLICATE KEY UPDATE param_value = VALUES(param_value)
        `, [insertParams]);
      }
    }

    await connection.commit();
    
    // Log activity
    if (req.user && req.user.userRole !== 'developer') {
      let desc = changes.length > 0 ? changes.join(' | ') : 'Saved settings without changes';
      if (desc.length > 1000) desc = desc.substring(0, 997) + '...';
      
      await dbPool.query(
        "INSERT INTO mewah_pis_auth_trial.activity_logs (user_id, username, activity_type, description, ip_address, user_agent) VALUES (?, ?, 'setting_change', ?, ?, ?)",
        [req.user.userId, req.user.username, desc, req.ip, req.headers['user-agent']]
      ).catch((err) => console.error('[SettingLog] Error:', err));
    }
    
    res.json({ success: true });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    connection.release();
  }
});

export default router;
