import { Router } from 'express';
import { dbPool, dbPoolPlc } from '../config/db.js';
import { requireAuth, authorize } from '../middleware/jwtMiddleware.js';
import { writeTagDirect } from '../plcCollector.js';

const router = Router();

// Auto-create settings tables if they don't exist
async function initDb() {
  try {
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS recipe_settings (
        category VARCHAR(50) NOT NULL,
        line_number INT NOT NULL,
        step_number INT NOT NULL,
        unf INT DEFAULT 0,
        nrm INT DEFAULT 0,
        wet INT DEFAULT 0,
        inl SMALLINT DEFAULT 0,
        con SMALLINT DEFAULT 0,
        exh SMALLINT DEFAULT 0,
        bar VARCHAR(20) DEFAULT '0.00',
        mode VARCHAR(20) DEFAULT 'OFF',
        door_in VARCHAR(20) DEFAULT 'Close',
        door_out VARCHAR(20) DEFAULT 'Close',
        inl1 SMALLINT DEFAULT 0,
        inl2 SMALLINT DEFAULT 0,
        dinl SMALLINT DEFAULT 0,
        rcon SMALLINT DEFAULT 0,
        dcon SMALLINT DEFAULT 0,
        PRIMARY KEY (category, line_number, step_number)
      )
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS station_parameters (
        param_key VARCHAR(100) PRIMARY KEY,
        param_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
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
    let recipeRows = [];
    let paramRows = [];
    let mappedValues = [];

    // Safe read from DB (with fallback if tables are empty)
    try {
      const [rRows] = await dbPool.query('SELECT * FROM recipe_settings ORDER BY category, line_number, step_number');
      recipeRows = rRows || [];
      const [pRows] = await dbPool.query('SELECT * FROM station_parameters');
      paramRows = pRows || [];
    } catch (dbErr) {
      console.warn('[station-settings] Could not read recipe_settings or station_parameters from DB:', dbErr.message);
    }

    // Fetch live PLC values from station_tag_mappings + plc_tag_latest
    try {
      const [mValues] = await dbPoolPlc.query(`
        SELECT m.equipment, m.signal_key, l.value 
        FROM station_tag_mappings m 
        JOIN plc_tag_latest l ON m.tag_id = l.tag_id
        WHERE m.station = 'sterilizer'
      `);
      mappedValues = mValues || [];
    } catch (plcErr) {
      console.warn('[station-settings] Could not read live PLC values:', plcErr.message);
    }

    const liveMap = {};
    mappedValues.forEach((m) => {
      liveMap[`${m.equipment}__${m.signal_key}`] = m.value;
    });

    const categories = ['ripe', 'unripe', 'overripe'];
    const recipes = {
      ripe: { 1: [], 2: [], 3: [], 4: [] },
      unripe: { 1: [], 2: [], 3: [], 4: [] },
      overripe: { 1: [], 2: [], 3: [], 4: [] }
    };

    // If recipeRows has records, populate from DB
    if (recipeRows.length > 0) {
      recipeRows.forEach(row => {
        const cat = row.category;
        const line = row.line_number;
        const stepNum = row.step_number;
        const eq = `recipe_line_${line}_step_${stepNum}`;

        // Live PLC values take absolute priority over database
        const livePress = liveMap[`${eq}_press__SETPOINT`];
        const liveNrm = liveMap[`${eq}_nrm__DURATION`];
        const liveUnf = liveMap[`${eq}_unf__DURATION`];
        const liveWet = liveMap[`${eq}_wet__DURATION`];
        const liveMode = liveMap[`${eq}_mode__VALVE_MODE`];
        const liveInl1 = liveMap[`${eq}_inl1__VALVE`];
        const liveInl2 = liveMap[`${eq}_inl2__VALVE`];
        const liveDinl = liveMap[`${eq}_dinl__VALVE`];
        const liveCon = liveMap[`${eq}_con__VALVE`];
        const liveRcon = liveMap[`${eq}_rcon__VALVE`];
        const liveDcon = liveMap[`${eq}_dcon__VALVE`];
        const liveExh = liveMap[`${eq}_exh__VALVE`];
        const liveDoorIn = liveMap[`${eq}_doorin__VALVE`];
        const liveDoorOut = liveMap[`${eq}_doorout__VALVE`];

        if (recipes[cat] && recipes[cat][line]) {
          recipes[cat][line].push({
            step: stepNum,
            unf: liveUnf !== undefined ? Number(liveUnf) : row.unf,
            nrm: liveNrm !== undefined ? Number(liveNrm) : row.nrm,
            wet: liveWet !== undefined ? Number(liveWet) : row.wet,
            inl: (liveInl1 !== undefined || liveInl2 !== undefined || liveDinl !== undefined)
              ? (Number(liveInl1) > 0 || Number(liveInl2) > 0 || Number(liveDinl) > 0)
              : row.inl === 1,
            inl1: liveInl1 !== undefined ? Number(liveInl1) > 0 : row.inl1 === 1,
            inl2: liveInl2 !== undefined ? Number(liveInl2) > 0 : row.inl2 === 1,
            dinl: liveDinl !== undefined ? Number(liveDinl) > 0 : row.dinl === 1,
            con: liveCon !== undefined ? Number(liveCon) > 0 : row.con === 1,
            rcon: liveRcon !== undefined ? Number(liveRcon) > 0 : row.rcon === 1,
            dcon: liveDcon !== undefined ? Number(liveDcon) > 0 : row.dcon === 1,
            exh: liveExh !== undefined ? Number(liveExh) > 0 : row.exh === 1,
            bar: livePress !== undefined ? String(livePress) : row.bar,
            mode: liveMode !== undefined
              ? (liveMode === 1 || liveMode === '1' || liveMode === 'Below' ? 'Below' : liveMode === 2 || liveMode === '2' || liveMode === 'Above' ? 'Above' : 'OFF')
              : row.mode,
            doorIn: liveDoorIn !== undefined
              ? (Number(liveDoorIn) > 0 || String(liveDoorIn).toUpperCase() === 'OPEN' ? 'Open' : 'Close')
              : row.door_in,
            doorOut: liveDoorOut !== undefined
              ? (Number(liveDoorOut) > 0 || String(liveDoorOut).toUpperCase() === 'OPEN' ? 'Open' : 'Close')
              : row.door_out
          });
        }
      });
    } else {
      // If DB is empty, generate standard 10-step template per line and overlay live PLC values directly!
      categories.forEach(cat => {
        for (let line = 1; line <= 4; line++) {
          for (let stepNum = 1; stepNum <= 10; stepNum++) {
            const eq = `recipe_line_${line}_step_${stepNum}`;
            const livePress = liveMap[`${eq}_press__SETPOINT`];
            const liveNrm = liveMap[`${eq}_nrm__DURATION`];
            const liveUnf = liveMap[`${eq}_unf__DURATION`];
            const liveWet = liveMap[`${eq}_wet__DURATION`];
            const liveMode = liveMap[`${eq}_mode__VALVE_MODE`];
            const liveInl1 = liveMap[`${eq}_inl1__VALVE`];
            const liveInl2 = liveMap[`${eq}_inl2__VALVE`];
            const liveDinl = liveMap[`${eq}_dinl__VALVE`];
            const liveCon = liveMap[`${eq}_con__VALVE`];
            const liveRcon = liveMap[`${eq}_rcon__VALVE`];
            const liveDcon = liveMap[`${eq}_dcon__VALVE`];
            const liveExh = liveMap[`${eq}_exh__VALVE`];
            const liveDoorIn = liveMap[`${eq}_doorin__VALVE`];
            const liveDoorOut = liveMap[`${eq}_doorout__VALVE`];

            recipes[cat][line].push({
              step: stepNum,
              unf: liveUnf !== undefined ? Number(liveUnf) : 0,
              nrm: liveNrm !== undefined ? Number(liveNrm) : 0,
              wet: liveWet !== undefined ? Number(liveWet) : 0,
              inl: (Number(liveInl1) > 0 || Number(liveInl2) > 0 || Number(liveDinl) > 0),
              inl1: Number(liveInl1) > 0,
              inl2: Number(liveInl2) > 0,
              dinl: Number(liveDinl) > 0,
              con: Number(liveCon) > 0,
              rcon: Number(liveRcon) > 0,
              dcon: Number(liveDcon) > 0,
              exh: Number(liveExh) > 0,
              bar: livePress !== undefined ? String(livePress) : '0.00',
              mode: (liveMode === 1 || liveMode === '1' || liveMode === 'Below' ? 'Below' : liveMode === 2 || liveMode === '2' || liveMode === 'Above' ? 'Above' : 'OFF'),
              doorIn: (Number(liveDoorIn) > 0 || String(liveDoorIn).toUpperCase() === 'OPEN' ? 'Open' : 'Close'),
              doorOut: (Number(liveDoorOut) > 0 || String(liveDoorOut).toUpperCase() === 'OPEN' ? 'Open' : 'Close')
            });
          }
        }
      });
    }

    const parameters = {};
    paramRows.forEach(row => {
      try {
        parameters[row.param_key] = JSON.parse(row.param_value);
      } catch {
        parameters[row.param_key] = row.param_value;
      }
    });

    // Overlay live PLC values directly onto parameters
    const paramToEqMap = {
      designCapacity: ["settings_capacity_design_capacity", "DESIGN_CAPACITY"],
      numberSterilizer: ["settings_capacity_number_sterilizer", "NUMBER_STERILIZER"],
      millDesignCapacity: ["settings_capacity_mill_design_capacity", "MILL_DESIGN_CAPACITY"],
      actualThroughput: ["settings_capacity_actual_throughput", "ACTUAL_THROUGHPUT"],
      overLimitTime: ["settings_tolerance_over_limit_time", "TIME"],
      overLimitScore: ["settings_tolerance_over_limit_score", "SCORE"],
      safetyDoor: ["settings_logic_safety_door", "SETPOINT"],
      autoBlowdown: ["settings_logic_auto_blowdown", "SETPOINT"],
      holdingPressure: ["settings_logic_holding_pressure", "SETPOINT"],
      startToStepCycle: ["settings_logic_start_to_step_cycle", "SETPOINT"],
      safetyPressure: ["settings_logic_safety_pressure", "SETPOINT"],
      sequencingOnStep: ["settings_sequencing_on_step", "STEP"],
      sequencingStopStep: ["settings_sequencing_stop_step", "STEP"],
      tempHoldingStepStart: ["settings_temp_holding_step_start", "STEP"],
      tempHoldingStepStop: ["settings_temp_holding_step_stop", "STEP"],
      tempIdle: ["settings_temp_idle", "SETPOINT"],
      tempLow: ["settings_temp_low", "SETPOINT"],
      timeOpenCon: ["settings_temp_time_open_con", "TIME"],
      timeCloseCon: ["settings_temp_time_close_con", "TIME"],
      highTemp: ["settings_temp_high", "SETPOINT"],
      mainSteam: ["settings_main_steam", "SETPOINT"],
      bpvMakeupSetPoint: ["settings_bpv_makeup_setpoint", "SETPOINT"],
      bpvMakeupP: ["settings_bpv_makeup_p", "SETPOINT"],
      bpvMakeupI: ["settings_bpv_makeup_i", "SETPOINT"],
      bpvMakeupD: ["settings_bpv_makeup_d", "SETPOINT"],
      bpvMakeupPosition: ["settings_bpv_makeup_position", "POSITION"],
      bpvSurplusSetPoint: ["settings_bpv_surplus_setpoint", "SETPOINT"],
      bpvSurplusP: ["settings_bpv_surplus_p", "SETPOINT"],
      bpvSurplusI: ["settings_bpv_surplus_i", "SETPOINT"],
      bpvSurplusD: ["settings_bpv_surplus_d", "SETPOINT"],
      bpvSurplusPosition: ["settings_bpv_surplus_position", "POSITION"],
    };

    Object.entries(paramToEqMap).forEach(([pKey, [eq, sig]]) => {
      const liveVal = liveMap[`${eq}__${sig}`];
      if (liveVal !== undefined && liveVal !== null && liveVal !== 'No Tag' && liveVal !== '--') {
        parameters[pKey] = Number(liveVal);
      }
    });

    if (parameters.scoreLogics && typeof parameters.scoreLogics === 'object') {
      [1, 2, 3, 4].forEach(ln => {
        const list = parameters.scoreLogics[ln];
        if (Array.isArray(list)) {
          list.forEach(row => {
            const targetLive = liveMap[`recipe_line_${ln}_score_${row.param}__TARGET`];
            const actualLive = liveMap[`recipe_line_${ln}_score_${row.param}__ACTUAL`];
            if (targetLive !== undefined && targetLive !== null && targetLive !== '--') row.target = Number(targetLive);
            if (actualLive !== undefined && actualLive !== null && actualLive !== '--') row.actual = Number(actualLive);
          });
        }
      });
    }

    res.json({
      success: true,
      directPlc: true,
      data: {
        recipes,
        parameters: Object.keys(parameters).length > 0 ? parameters : null,
        mappedValues: mappedValues.length > 0 ? mappedValues : null
      }
    });
  } catch (err) {
    console.error('[Settings-GET] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/{station}/settings/recipes-and-params
// DIRECT PLC READ/WRITE ARCHITECTURE: Writes directly to PLC memory via Snap7.
// Database operates strictly as non-blocking secondary backup/cache.
router.post('/recipes-and-params', authorize(['developer', 'admin']), async (req, res) => {
  const { recipes, parameters, activeCategory, editedKeys } = req.body;
  console.log('[Settings-POST] Direct PLC write requested. activeCategory:', activeCategory, 'editedKeys count:', editedKeys ? editedKeys.length : 0);
  console.log('[Settings-POST] editedKeys content:', JSON.stringify(editedKeys));

  try {
    // 1. Fetch PLC tag mappings to locate register addresses
    let mappings = {};
    try {
      const [mappingRows] = await dbPoolPlc.query(
        "SELECT equipment, signal_key, tag_id FROM station_tag_mappings WHERE station = 'sterilizer' AND tag_id IS NOT NULL"
      );
      (mappingRows || []).forEach((row) => {
        mappings[`${row.equipment}__${row.signal_key}`] = row.tag_id;
      });
      console.log('[Settings-POST] Available mappings count:', Object.keys(mappings).length, 'mappings:', mappings);
    } catch (mapErr) {
      console.warn('[Settings-POST] Warning fetching mappings:', mapErr.message);
    }

    // 2. Fetch current live PLC tag values for comparison
    let livePlcMap = {};
    try {
      const [liveTagRows] = await dbPoolPlc.query(
        `SELECT m.equipment, m.signal_key, l.value 
         FROM station_tag_mappings m 
         JOIN plc_tag_latest l ON m.tag_id = l.tag_id
         WHERE m.station = 'sterilizer'`
      );
      (liveTagRows || []).forEach(row => {
        livePlcMap[`${row.equipment}__${row.signal_key}`] = row.value;
      });
    } catch (liveErr) {
      console.warn('[Settings-POST] Warning fetching live PLC values:', liveErr.message);
    }

    const categories = ['ripe', 'unripe', 'overripe'];
    const insertValues = [];
    const writeTasks = [];
    const plcErrors = [];

    // 3. Compile PLC Write Tasks for Recipes
    if (recipes) {
      categories.forEach(cat => {
        const catRecipes = recipes[cat];
        if (catRecipes) {
          for (let line = 1; line <= 4; line++) {
            const steps = catRecipes[line];
            if (Array.isArray(steps)) {
              steps.forEach(step => {
                const stepInl1 = step.inl1 ? 1 : 0;
                const stepInl2 = step.inl2 ? 1 : 0;
                const stepDinl = step.dinl ? 1 : 0;
                const stepCon = step.con ? 1 : 0;
                const stepRcon = step.rcon ? 1 : 0;
                const stepDcon = step.dcon ? 1 : 0;
                const stepExh = step.exh ? 1 : 0;

                const newInl = (stepInl1 || stepInl2 || stepDinl) ? 1 : 0;
                const newCon = (stepCon || stepRcon || stepDcon) ? 1 : 0;
                const newExh = stepExh;

                const newBar = step.bar || '0.00';
                const newMode = step.mode || 'OFF';
                const newNrm = step.nrm || 0;
                const newUnf = step.unf || 0;
                const newWet = step.wet || 0;
                const newDoorIn = step.doorIn || 'Close';
                const newDoorOut = step.doorOut || 'Close';

                insertValues.push([
                   cat, line, step.step, newUnf, newNrm, newWet, newInl, newCon, newExh, newBar, newMode, newDoorIn, newDoorOut,
                   stepInl1, stepInl2, stepDinl, stepRcon, stepDcon
                ]);

                const eq = `recipe_line_${line}_step_${step.step}`;
                
                const checkAndQueueWrite = (fieldEq, signal, newVal, fieldName) => {
                  const mapKey = `${fieldEq}__${signal}`;
                  const tagId = mappings[mapKey];
                  // Only queue write if there is a real tag mapped for this setting
                  if (!tagId) return;

                  // If editedKeys was provided, filter strictly to what user edited
                  if (Array.isArray(editedKeys) && editedKeys.length > 0 && fieldName) {
                    const pendingKey = `${line}_${step.step}_${fieldName}`;
                    if (!editedKeys.includes(pendingKey)) {
                      return;
                    }
                  }

                  let plcVal = newVal;
                  if (signal === 'VALVE') {
                    plcVal = (newVal === true || newVal === 1 || String(newVal).toUpperCase() === 'OPEN') ? 1 : 0;
                  } else if (signal === 'VALVE_MODE') {
                    plcVal = (newVal === 'Below' || newVal === 1) ? 1 : (newVal === 'Above' || newVal === 2) ? 2 : 0;
                  } else {
                    plcVal = Number(newVal);
                  }
                  
                  writeTasks.push({ tagId, val: plcVal, desc: `Recipe L${line} S${step.step} ${fieldName}` });
                };

                // Queue writes for the active category being modified
                if (cat === activeCategory || !activeCategory) {
                  checkAndQueueWrite(`${eq}_press`, 'SETPOINT', newBar, 'bar');
                  checkAndQueueWrite(`${eq}_nrm`, 'DURATION', newNrm, 'nrm');
                  checkAndQueueWrite(`${eq}_unf`, 'DURATION', newUnf, 'unf');
                  checkAndQueueWrite(`${eq}_wet`, 'DURATION', newWet, 'wet');
                  checkAndQueueWrite(`${eq}_mode`, 'VALVE_MODE', newMode, 'mode');

                  checkAndQueueWrite(`${eq}_inl1`, 'VALVE', stepInl1, 'inl1');
                  checkAndQueueWrite(`${eq}_inl2`, 'VALVE', stepInl2, 'inl2');
                  checkAndQueueWrite(`${eq}_dinl`, 'VALVE', stepDinl, 'dinl');
                  checkAndQueueWrite(`${eq}_con`, 'VALVE', stepCon, 'con');
                  checkAndQueueWrite(`${eq}_rcon`, 'VALVE', stepRcon, 'rcon');
                  checkAndQueueWrite(`${eq}_dcon`, 'VALVE', stepDcon, 'dcon');
                  checkAndQueueWrite(`${eq}_exh`, 'VALVE', stepExh, 'exh');
                  
                  const newDoorInVal = newDoorIn === 'Open' ? 1 : 0;
                  const newDoorOutVal = newDoorOut === 'Open' ? 1 : 0;
                  checkAndQueueWrite(`${eq}_doorIn`, 'VALVE', newDoorInVal, 'doorIn');
                  checkAndQueueWrite(`${eq}_doorOut`, 'VALVE', newDoorOutVal, 'doorOut');
                }
              });
            }
          }
        }
      });
    }

    // 4. Compile PLC Write Tasks for Parameters (scoreLogics, control logics, BPV)
    const insertParams = [];
    if (parameters && typeof parameters === 'object') {
      Object.entries(parameters).forEach(([key, val]) => {
        const newStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
        insertParams.push([key, newStr]);
      });

      // 4a. ScoreLogics TARGET values write directly to PLC
      if (parameters.scoreLogics) {
        const scoreLogicsMap = (typeof parameters.scoreLogics === 'object' && !Array.isArray(parameters.scoreLogics))
          ? parameters.scoreLogics
          : { 1: Array.isArray(parameters.scoreLogics) ? parameters.scoreLogics : [] };

        for (const [lineNum, rows] of Object.entries(scoreLogicsMap)) {
          if (!Array.isArray(rows)) continue;
          for (const row of rows) {
            if (row.param === undefined || row.target === undefined) continue;
            const perLineKey = `recipe_line_${lineNum}_score_${row.param}__TARGET`;
            const globalKey = `settings_score_logic_${row.param}_target__TARGET`;
            const tagId = mappings[perLineKey] || mappings[globalKey];
            if (tagId) {
              writeTasks.push({ tagId, val: Number(row.target), desc: `ScoreLogic L${lineNum} ${row.param}` });
            }
          }
        }
      }

      // 4b. Standard parameters (Capacities, Control Logics, BPV Settings)
      const paramToEqMap = {
        designCapacity: ["settings_capacity_design_capacity", "DESIGN_CAPACITY"],
        numberSterilizer: ["settings_capacity_number_sterilizer", "NUMBER_STERILIZER"],
        millDesignCapacity: ["settings_capacity_mill_design_capacity", "MILL_DESIGN_CAPACITY"],
        actualThroughput: ["settings_capacity_actual_throughput", "ACTUAL_THROUGHPUT"],
        overLimitTime: ["settings_tolerance_over_limit_time", "TIME"],
        overLimitScore: ["settings_tolerance_over_limit_score", "SCORE"],
        safetyDoor: ["settings_logic_safety_door", "SETPOINT"],
        holdingPressure: ["settings_logic_holding_pressure", "SETPOINT"],
        autoBlowdown: ["settings_logic_auto_blowdown", "SETPOINT"],
        startToStepCycle: ["settings_logic_start_to_step_cycle", "SETPOINT"],
        safetyPressure: ["settings_logic_safety_pressure", "SETPOINT"],
        sequencingOnStep: ["settings_sequencing_on_step", "STEP"],
        sequencingStopStep: ["settings_sequencing_stop_step", "STEP"],
        tempHoldingStepStart: ["settings_temp_holding_step_start", "STEP"],
        tempHoldingStepStop: ["settings_temp_holding_step_stop", "STEP"],
        tempIdle: ["settings_temp_idle", "SETPOINT"],
        tempLow: ["settings_temp_low", "SETPOINT"],
        timeOpenCon: ["settings_temp_time_open_con", "TIME"],
        timeCloseCon: ["settings_temp_time_close_con", "TIME"],
        highTemp: ["settings_temp_high", "SETPOINT"],
        mainSteam: ["settings_main_steam", "SETPOINT"],
        bpvMakeupSetPoint: ["settings_bpv_makeup_setpoint", "SETPOINT"],
        bpvMakeupP: ["settings_bpv_makeup_p", "SETPOINT"],
        bpvMakeupI: ["settings_bpv_makeup_i", "SETPOINT"],
        bpvMakeupD: ["settings_bpv_makeup_d", "SETPOINT"],
        bpvMakeupPosition: ["settings_bpv_makeup_position", "POSITION"],
        bpvSurplusSetPoint: ["settings_bpv_surplus_setpoint", "SETPOINT"],
        bpvSurplusP: ["settings_bpv_surplus_p", "SETPOINT"],
        bpvSurplusI: ["settings_bpv_surplus_i", "SETPOINT"],
        bpvSurplusD: ["settings_bpv_surplus_d", "SETPOINT"],
        bpvSurplusPosition: ["settings_bpv_surplus_position", "POSITION"]
      };

      for (const [key, val] of Object.entries(parameters)) {
        if (paramToEqMap[key] && val !== null && val !== undefined) {
          const [eqKey, sigKey] = paramToEqMap[key];
          const mapKey = `${eqKey}__${sigKey}`;
          const tagId = mappings[mapKey];
          if (tagId) {
            writeTasks.push({ tagId, val: Number(val), desc: `Param ${key}` });
          }
        }
      }
    }

    // 5. EXECUTE DIRECT PLC WRITES (Primary Action)
    console.log(`[Settings-POST] Executing ${writeTasks.length} direct PLC write tasks...`);
    let writtenCount = 0;
    for (const task of writeTasks) {
      try {
        console.log(`[Settings-POST] Direct write tag ${task.tagId} (${task.desc}) = ${task.val}`);
        await writeTagDirect(task.tagId, task.val);
        writtenCount++;
      } catch (err) {
        console.warn(`[Settings-POST] writeTagDirect error for tag ${task.tagId}:`, err.message);
        plcErrors.push(`${task.desc || task.tagId}: ${err.message}`);
      }
    }

    // 6. SECONDARY NON-BLOCKING DATABASE BACKUP / CACHE
    // Even if database has an error or is unreachable, the PLC write already succeeded!
    try {
      if (insertValues.length > 0) {
        await dbPool.query(`
          INSERT INTO recipe_settings (category, line_number, step_number, unf, nrm, wet, inl, con, exh, bar, mode, door_in, door_out, inl1, inl2, dinl, rcon, dcon)
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
            door_out = VALUES(door_out),
            inl1 = VALUES(inl1),
            inl2 = VALUES(inl2),
            dinl = VALUES(dinl),
            rcon = VALUES(rcon),
            dcon = VALUES(dcon)
        `, [insertValues]);
      }

      if (insertParams.length > 0) {
        await dbPool.query(`
          INSERT INTO station_parameters (param_key, param_value)
          VALUES ?
          ON DUPLICATE KEY UPDATE param_value = VALUES(param_value)
        `, [insertParams]);
      }
      console.log('[Settings-POST] Secondary DB cache updated successfully.');
    } catch (dbErr) {
      console.warn('[Settings-POST] Non-blocking DB cache save warning:', dbErr.message);
    }

    // Activity log (safely handled with catch)
    if (req.user && req.user.userRole !== 'developer') {
      dbPool.query(
        "INSERT INTO activity_logs (user_id, username, activity_type, description, ip_address, user_agent) VALUES (?, ?, 'setting_change', ?, ?, ?)",
        [req.user.userId, req.user.username, `Applied settings directly to PLC (${writtenCount} tags written)`, req.ip, req.headers['user-agent']]
      ).catch(() => {});
    }

    res.json({
      success: true,
      directPlc: true,
      writtenCount,
      totalTasks: writeTasks.length,
      plcWarnings: plcErrors.length > 0 ? plcErrors : undefined,
      message: 'Settings applied directly to PLC successfully.'
    });
  } catch (err) {
    console.error('[Settings-POST] Fatal error during settings save:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
