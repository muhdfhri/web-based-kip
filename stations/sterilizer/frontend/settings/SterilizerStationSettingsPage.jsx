import { useState, Fragment, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx-js-style";
import usePlcStore from "@core/store";
import "./SterilizerStationSettingsModal.css";
import "../SterilizerStationPage.css";
import "../tabs/Recipe/RecipeTab.css";

// ==========================================
// Default Values for Steps (matching the provided image)
// ==========================================
const defaultRecipesValues = [
  { step: 1, unf: 300, nrm: 300, wet: 450, inl: true, con: true, exh: false, bar: "0.0", mode: "OFF", doorIn: "Close", doorOut: "Close" },
  { step: 2, unf: 1200, nrm: 1200, wet: 1200, inl: true, con: false, exh: false, bar: "2.2", mode: "HIGH", doorIn: "Close", doorOut: "Close" },
  { step: 3, unf: 300, nrm: 300, wet: 300, inl: false, con: true, exh: false, bar: "1.0", mode: "LOW", doorIn: "Close", doorOut: "Close" },
  { step: 4, unf: 900, nrm: 900, wet: 900, inl: true, con: false, exh: false, bar: "2.4", mode: "HIGH", doorIn: "Close", doorOut: "Close" },
  { step: 5, unf: 300, nrm: 300, wet: 300, inl: false, con: true, exh: false, bar: "1.0", mode: "LOW", doorIn: "Close", doorOut: "Close" },
  { step: 6, unf: 600, nrm: 600, wet: 600, inl: true, con: false, exh: false, bar: "2.8", mode: "HIGH", doorIn: "Close", doorOut: "Close" },
  { step: 7, unf: 300, nrm: 300, wet: 300, inl: true, con: false, exh: false, bar: "2.8", mode: "OFF", doorIn: "Close", doorOut: "Close" },
  { step: 8, unf: 30, nrm: 30, wet: 30, inl: true, con: false, exh: false, bar: "2.6", mode: "LOW", doorIn: "Close", doorOut: "Close" },
  { step: 9, unf: 600, nrm: 600, wet: 600, inl: true, con: false, exh: false, bar: "2.8", mode: "OFF", doorIn: "Close", doorOut: "Close" },
  { step: 10, unf: 30, nrm: 30, wet: 30, inl: true, con: true, exh: false, bar: "2.8", mode: "LOW", doorIn: "Close", doorOut: "Close" },
  { step: 11, unf: 600, nrm: 600, wet: 600, inl: true, con: false, exh: false, bar: "2.8", mode: "OFF", doorIn: "Close", doorOut: "Close" },
  { step: 12, unf: 30, nrm: 30, wet: 30, inl: true, con: true, exh: false, bar: "2.6", mode: "LOW", doorIn: "Close", doorOut: "Close" },
  { step: 13, unf: 600, nrm: 900, wet: 1200, inl: true, con: false, exh: false, bar: "2.8", mode: "OFF", doorIn: "Close", doorOut: "Close" },
  { step: 14, unf: 300, nrm: 300, wet: 300, inl: false, con: true, exh: false, bar: "2.0", mode: "LOW", doorIn: "Close", doorOut: "Close" },
  { step: 15, unf: 300, nrm: 300, wet: 300, inl: false, con: true, exh: true, bar: "0.0", mode: "OFF", doorIn: "Close", doorOut: "Close" },
  { step: 16, unf: 1200, nrm: 1200, wet: 1200, inl: false, con: true, exh: true, bar: "", mode: "", doorIn: "Open", doorOut: "Open" }
];

const STEP_FUNCTIONS = [
  "Deaeration",
  "1st Peak Up",
  "1st Peak Down",
  "2nd Peak Up",
  "2nd Peak Down",
  "3rd Peak Up",
  "Holding",
  "1st Intermitten Blow",
  "Holding",
  "2nd Intermitten Blow",
  "Holding",
  "3rd Intermitten Blow",
  "Holding",
  "Blow-down",
  "Exhaust"
];

const defaultBpvSettings = [
  { pressure: 3.20, makeup: "-", surplus: "100" },
  { pressure: 3.10, makeup: "-", surplus: "0" },
  { pressure: 3.00, makeup: "0", surplus: "-" },
  { pressure: 2.90, makeup: "25", surplus: "-" },
  { pressure: 2.80, makeup: "50", surplus: "-" },
  { pressure: 2.70, makeup: "75", surplus: "-" },
  { pressure: 2.60, makeup: "100", surplus: "-" },
];

const DEFAULT_SCORE_LOGICS = [
  { step: 1, function: "Deaeration", target: 100, actual: 90, unit: "°C", decimals: 0, param: "deaeration_temp" },
  { step: 2, function: "1st Peak Up", target: 2.50, actual: 2.00, unit: "bar", decimals: 1, param: "peak1_press" },
  { step: 3, function: "2nd Peak Up", target: 2.50, actual: 2.30, unit: "bar", decimals: 1, param: "peak2_press" },
  { step: 4, function: "3rd Peak Up", target: 2.80, actual: 2.40, unit: "bar", decimals: 1, param: "peak3_press" },
  { step: 5, function: "Holding", target: 2.80, actual: 2.70, unit: "bar", decimals: 1, param: "holding_press" },
  { step: 6, function: "1st Intermitten Blow", target: 140, actual: 138, unit: "°C", decimals: 0, param: "blow1_temp" },
  { step: 7, function: "Holding", target: 2.80, actual: 2.65, unit: "bar", decimals: 1, param: "holding2_press" },
  { step: 8, function: "2nd Intermitten Blow", target: 140, actual: 139, unit: "°C", decimals: 0, param: "blow2_temp" },
  { step: 9, function: "Holding", target: 2.80, actual: 2.50, unit: "bar", decimals: 1, param: "holding3_press" },
  { step: 10, function: "3rd Intermitten Blow", target: 140, actual: 140, unit: "°C", decimals: 0, param: "blow3_temp" },
  { step: 11, function: "Holding", target: 2.80, actual: 2.80, unit: "bar", decimals: 1, param: "holding4_press" },
  { step: 12, function: "Blow-down", target: 120, actual: 150, unit: "s", decimals: 0, param: "blowdown_time" },
  { step: 13, function: "Exhaust", target: 180, actual: 265, unit: "s", decimals: 0, param: "exhaust_time" },
  { step: "FFB", function: "FFB loading in/out", target: 1200, actual: 900, unit: "s", decimals: 0, param: "ffb_loading" },
  { step: "T_Ster", function: "Target Sterilization Time", target: 6690, actual: 6550, unit: "s", decimals: 0, param: "target_ster_time" },
  { step: "T_Cyc", function: "Target Cycle Time", target: 7890, actual: 7450, unit: "s", decimals: 0, param: "target_cyc_time" },
  { step: "Tput", function: "Throughput", target: 22.81, actual: 24.16, unit: "mt/hr", decimals: 1, param: "throughput_rate" }
];

const ValBox = ({ value, unit, decimals = 1, onClick, style, isEdited }) => {
  const formatValue = (v) => {
    if (v === null || v === undefined) return "-- --";
    if (typeof v === 'number') return v.toFixed(decimals);
    if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v).toFixed(decimals);
    return v;
  };
  return (
    <div className={`som-val-box ${onClick ? 'som-val-box--editable' : ''} ${isEdited ? 'som-edited-field' : ''}`} onClick={onClick} style={style}>
      {formatValue(value)}
      {unit && <span className="som-val-unit">{unit}</span>}
    </div>
  );
};

export default function SterilizerStationSettingsPage({
  onSelectSubmenu,
  onClose,
  recipes,
  setRecipes,
  handleRecipeChange,
  configMode = false,
  handleEquipmentClick,
  tagMap = {},
  availableTags = [],
}) {
  const handleBackToOverview = onClose;
  const getDeveloperStyle = (id, signalKey) => {
    if (!configMode) return {};
    const hasTag = tagMap && tagMap[`${id}__${signalKey}`];
    return {
      outline: hasTag ? "1.5px solid #3b82f6" : "2px solid #ef4444",
      boxShadow: hasTag ? "0 0 6px rgba(59, 130, 246, 0.5)" : "0 0 8px rgba(239, 68, 68, 0.6)",
      backgroundColor: hasTag ? "transparent" : "rgba(239, 68, 68, 0.15)",
      cursor: "pointer",
      position: "relative",
    };
  };
  const [selectedLine, setSelectedLine] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [activeKeypad, setActiveKeypad] = useState(null);

  // Single Master Recipe
  const [recipeSteps, setRecipeSteps] = useState(() => {
    return Array.from({ length: 20 }, (_, i) => {
      const def = defaultRecipesValues[i];
      if (def) return { ...def };
      return { step: i + 1, unf: 0, nrm: 0, wet: 0, inl: false, con: false, exh: false, bar: "0.0", mode: "OFF", doorIn: "Close", doorOut: "Close" };
    });
  });

  // Card 2 State: Design Capacity & Scoring
  const [designCapacity, setDesignCapacity] = useState(null);
  const [numberSterilizer, setNumberSterilizer] = useState(null); // Match spreadsheet default
  const [millDesignCapacity, setMillDesignCapacity] = useState(null);
  const [actualThroughput, setActualThroughput] = useState(null);
  const [overLimitTime, setOverLimitTime] = useState(null);
  const [overLimitScore, setOverLimitScore] = useState(null);
  const [sterilScore, setSterilScore] = useState(null);
  const [leadTimeScore, setLeadTimeScore] = useState(null);
  const [throughputScore, setThroughputScore] = useState(null);

  const [scoreLogicsCache, setScoreLogicsCache] = useState({
    1: DEFAULT_SCORE_LOGICS,
    2: DEFAULT_SCORE_LOGICS,
    3: DEFAULT_SCORE_LOGICS,
    4: DEFAULT_SCORE_LOGICS
  });
  const [scoreLogics, setScoreLogics] = useState(DEFAULT_SCORE_LOGICS);

  const calculateScore = (target, actual, stepKey) => {
    if (target <= 0 || actual <= 0) return 0;
    if (stepKey === 12 || stepKey === 13) {
      const val = (1 - (actual - target) / target) * 100;
      return Math.max(0, Math.round(val));
    }
    if (stepKey === "FFB" || stepKey === "T_Ster" || stepKey === "T_Cyc") {
      return Math.round((target / actual) * 100);
    }
    if (actual > target) return 100;
    return Math.round((actual / target) * 100);
  };

  const getComputedScoreForGlobal = (param, stepKey) => {
    const rowIdx = scoreLogics.findIndex(r => r.param === param);
    if (rowIdx === -1) return 0;
    const row = scoreLogics[rowIdx];
    const cacheLine1 = scoreLogicsCache[1];
    const cacheRow = cacheLine1 ? cacheLine1[rowIdx] : null;
    const targetVal = getStagedVal(`master_score_${row.param}_target`, cacheRow && cacheRow.target !== undefined ? cacheRow.target : row.target);
    const actualKey = `settings_score_logic_line_${selectedLine}_${row.param}_actual__ACTUAL`;
    const actualTagId = tagMap[actualKey];
    let actualVal = 0;
    if (actualTagId) {
      const tagObj = availableTags.find((t) => String(t.id) === String(actualTagId));
      if (tagObj && tags[tagObj.tag_name]) {
        const liveVal = tags[tagObj.tag_name].value;
        if (liveVal !== undefined && liveVal !== null && liveVal !== "--") {
          actualVal = Number(liveVal);
        }
      }
    }
    let actualSafe = actualVal;
    if (Math.abs(actualSafe) < 0.001) actualSafe = 0;
    return calculateScore(Number(targetVal) || 0, actualSafe, stepKey);
  };

  // Card 3 State: Control Logics - NEW HMI-Based Structure
  // -- General Settings --
  const [safetyDoor, setSafetyDoor] = useState(null);
  const [autoBlowdown, setAutoBlowdown] = useState(null);
  const [holdingPressure, setHoldingPressure] = useState(null);
  const [startToStepCycle, setStartToStepCycle] = useState(null);

  // -- Sterilizer Sequencing: On Step and Stop Step per sterilizer (4 sterilizers) --
  const [sequencingOnStep, setSequencingOnStep] = useState(null);
  const [sequencingStopStep, setSequencingStopStep] = useState(null);

  // -- Analog Input Calibration per sterilizer: pressure and temp --
  const defaultAnalogCalib = () => ({ maxSensor: 0, calibrationValue: 0, rawValue: 0, outValue: 0 });
  const [analogCalib, setAnalogCalib] = useState({
    1: { pressure: defaultAnalogCalib(), temp: defaultAnalogCalib() },
    2: { pressure: defaultAnalogCalib(), temp: defaultAnalogCalib() },
    3: { pressure: defaultAnalogCalib(), temp: defaultAnalogCalib() },
    4: { pressure: defaultAnalogCalib(), temp: defaultAnalogCalib() },
  });

  // -- Temperature Overriding During Holding per sterilizer --
  const [tempOverride, setTempOverride] = useState({ 
    safetyPressure: null, 
    holdingStepStart: null,
    holdingStepEnd: null,
    tempIdle: null,
    tempLow: null,
    timeOpenCon: null,
    timeCloseCon: null,
    highTemp: null 
  });

  // -- Main Steam Overriding --
  const [mainSteamMin, setMainSteamMin] = useState(null);

  // -- BPV Settings Lookup Table (8 rows) --
  const [bpvSettings, setBpvSettings] = useState(defaultBpvSettings);

  const [bpvNewSettings, setBpvNewSettings] = useState({
    makeupHighSet: null,
    makeupLowSet: null,
    makeupPosition: null,
    makeupLimitHigh: null,
    makeupLimitLow: null,
    surplusHighSet: null,
    surplusLowSet: null,
    surplusPosition: null,
    surplusLimitHigh: null,
    surplusLimitLow: null
  });

  // -- BPV Analog Calibration --
  const [bpvAnalogCalib, setBpvAnalogCalib] = useState({
    pressureBpv: { max: 0, calibration: 0, rawValue: 0, outActual: 0 },
    pressureBoiler: { max: 0, calibration: 0, rawValue: 0, outActual: 0 },
  });

  const [initialVals, setInitialVals] = useState({});
  const [stagedEdits, setStagedEdits] = useState({});
  const tags = usePlcStore(state => state.tags);
  const getStagedVal = (key, fallback) => {
    return stagedEdits[key] !== undefined ? stagedEdits[key] : fallback;
  };
  const getRecipeStagedVal = (stepIdx, field, fallback) => {
    const dbField = field === 'bar' ? 'press' : field;
    return getStagedVal(`master_recipe_step_${stepIdx + 1}_${dbField}`, fallback);
  };


  useEffect(() => {
    if (!tagMap || Object.keys(tagMap).length === 0) return;
    if (!tags || Object.keys(tags).length === 0) return;

    let changedAny = false;
    const newInit = { ...initialVals };

    const getLiveVal = (eq, sig) => {
      const tagId = tagMap[`${eq}__${sig}`];
      if (!tagId) return undefined;
      const tagObj = availableTags.find((t) => t.id === parseInt(tagId, 10));
      if (!tagObj) return undefined;
      const tagData = tags[tagObj.tag_name];
      return tagData ? tagData.value : undefined;
    };

    const syncGlobal = (dbKey, eq, sig, setter) => {
      const liveVal = getLiveVal(eq, sig);
      if (liveVal !== undefined && Number(liveVal) !== Number(newInit[dbKey])) {
        setter(Number(liveVal));
        newInit[dbKey] = Number(liveVal);
        changedAny = true;
      }
    };

    syncGlobal("actualThroughput", "settings_capacity_actual_throughput", "ACTUAL_THROUGHPUT", setActualThroughput);
    syncGlobal("safetyDoor", "settings_logic_safety_door", "SETPOINT", setSafetyDoor);
    syncGlobal("autoBlowdown", "settings_logic_auto_blowdown", "SETPOINT", setAutoBlowdown);
    syncGlobal("holdingPressure", "settings_logic_holding_pressure", "SETPOINT", setHoldingPressure);
    syncGlobal("startToStepCycle", "settings_logic_start_to_step_cycle", "STEP", setStartToStepCycle);
    syncGlobal("mainSteamMin", "settings_logic_main_steam_min", "SETPOINT", setMainSteamMin);
    syncGlobal("tempOverride_pressureLimit_st1", "settings_logic_temp_override_press_st1", "SETPOINT", (v) => setTempOverride(prev => ({ ...prev, safetyPressure: v })));
    syncGlobal("tempOverride_holdingStepStart_st1", "settings_logic_temp_override_hss_st1", "STEP", (v) => setTempOverride(prev => ({ ...prev, holdingStepStart: v })));
    syncGlobal("tempOverride_holdingStepEnd_st1", "settings_logic_temp_override_hse_st1", "STEP", (v) => setTempOverride(prev => ({ ...prev, holdingStepEnd: v })));
    syncGlobal("tempOverride_tempIdle_st1", "settings_logic_temp_override_idle_st1", "SETPOINT", (v) => setTempOverride(prev => ({ ...prev, tempIdle: v })));
    syncGlobal("tempOverride_tempLow_st1", "settings_logic_temp_override_low_st1", "SETPOINT", (v) => setTempOverride(prev => ({ ...prev, tempLow: v })));
    syncGlobal("tempOverride_timeOpenCon_st1", "settings_logic_temp_override_toc_st1", "DURATION", (v) => setTempOverride(prev => ({ ...prev, timeOpenCon: v })));
    syncGlobal("tempOverride_timeCloseCon_st1", "settings_logic_temp_override_tcc_st1", "DURATION", (v) => setTempOverride(prev => ({ ...prev, timeCloseCon: v })));
    syncGlobal("tempOverride_highTemp_st1", "settings_logic_temp_override_temp_st1", "SETPOINT", (v) => setTempOverride(prev => ({ ...prev, highTemp: v })));

    syncGlobal("bpvNew_makeupHighSet", "settings_bpv_makeup_high_set", "SETPOINT", (v) => setBpvNewSettings(prev => ({ ...prev, makeupHighSet: v })));
    syncGlobal("bpvNew_makeupLowSet", "settings_bpv_makeup_low_set", "SETPOINT", (v) => setBpvNewSettings(prev => ({ ...prev, makeupLowSet: v })));
    syncGlobal("bpvNew_makeupPosition", "settings_bpv_makeup_position", "SETPOINT", (v) => setBpvNewSettings(prev => ({ ...prev, makeupPosition: v })));
    syncGlobal("bpvNew_makeupLimitHigh", "settings_bpv_makeup_limit_high", "SETPOINT", (v) => setBpvNewSettings(prev => ({ ...prev, makeupLimitHigh: v })));
    syncGlobal("bpvNew_makeupLimitLow", "settings_bpv_makeup_limit_low", "SETPOINT", (v) => setBpvNewSettings(prev => ({ ...prev, makeupLimitLow: v })));
    syncGlobal("bpvNew_surplusHighSet", "settings_bpv_surplus_high_set", "SETPOINT", (v) => setBpvNewSettings(prev => ({ ...prev, surplusHighSet: v })));
    syncGlobal("bpvNew_surplusLowSet", "settings_bpv_surplus_low_set", "SETPOINT", (v) => setBpvNewSettings(prev => ({ ...prev, surplusLowSet: v })));
    syncGlobal("bpvNew_surplusPosition", "settings_bpv_surplus_position", "SETPOINT", (v) => setBpvNewSettings(prev => ({ ...prev, surplusPosition: v })));
    syncGlobal("bpvNew_surplusLimitHigh", "settings_bpv_surplus_limit_high", "SETPOINT", (v) => setBpvNewSettings(prev => ({ ...prev, surplusLimitHigh: v })));
    syncGlobal("bpvNew_surplusLimitLow", "settings_bpv_surplus_limit_low", "SETPOINT", (v) => setBpvNewSettings(prev => ({ ...prev, surplusLimitLow: v })));

    ["pressureBpv", "pressureBoiler"].forEach(k => {
      syncGlobal(`bpvAnalogCalib_${k}_max`, `settings_bpv_analog_${k}_max`, "SETPOINT", (v) => setBpvAnalogCalib(prev => ({ ...prev, [k]: { ...prev[k], max: v } })));
      syncGlobal(`bpvAnalogCalib_${k}_calibration`, `settings_bpv_analog_${k}_calib`, "SETPOINT", (v) => setBpvAnalogCalib(prev => ({ ...prev, [k]: { ...prev[k], calibration: v } })));
    });
    for (let st = 1; st <= 4; st++) {
      const onKey = `seqOnStep_st${st}`;
      const stopKey = `seqStopStep_st${st}`;
      const liveOn = getLiveVal(`settings_logic_seq_on_step_st${st}`, "STEP");
      if (liveOn !== undefined && Number(liveOn) !== Number(newInit[onKey])) {
        if (st === 1) setSequencingOnStep(Number(liveOn));
        newInit[onKey] = Number(liveOn); changedAny = true;
      }
      const liveStop = getLiveVal(`settings_logic_seq_stop_step_st${st}`, "STEP");
      if (liveStop !== undefined && Number(liveStop) !== Number(newInit[stopKey])) {
        if (st === 1) setSequencingStopStep(Number(liveStop));
        newInit[stopKey] = Number(liveStop); changedAny = true;
      }
    }

    // Sync Recipes
    let recipesChanged = false;
    const nextSteps = JSON.parse(JSON.stringify(recipeSteps));
    const line = 1;
    nextSteps.forEach((stepObj) => {
      const stepNum = stepObj.step;
      const syncVal = (dbKey, sig, pType, formatter) => {
        const liveVal = getLiveVal(`recipe_line_${line}_step_${stepNum}_${sig}`, pType);
        if (liveVal !== undefined) {
          const formatted = formatter ? formatter(liveVal) : liveVal;
          if (formatted !== newInit[`recipe_step_${stepNum}_${dbKey}`]) {
            stepObj[dbKey] = formatted;
            newInit[`recipe_step_${stepNum}_${dbKey}`] = formatted;
            recipesChanged = true;
          }
        }
      };
      syncVal("bar", "press", "SETPOINT");
      syncVal("nrm", "nrm", "DURATION");
      syncVal("unf", "unf", "DURATION");
      syncVal("wet", "wet", "DURATION");
      syncVal("inl", "inl", "VALVE", v => (v == 1 || String(v).toLowerCase() === "true"));
      syncVal("exh", "exh", "VALVE", v => (v == 1 || String(v).toLowerCase() === "true"));
      syncVal("con", "con", "VALVE", v => (v == 1 || String(v).toLowerCase() === "true"));
      syncVal("mode", "mode", "VALVE_MODE", v => {
        const s = String(v).trim();
        if (s === "1" || s === "HIGH") return "HIGH";
        if (s === "2" || s === "LOW") return "LOW";
        return "OFF";
      });
    });
    if (recipesChanged) {
      setRecipeSteps(nextSteps);
      changedAny = true;
    }

    // Sync BPV
    let bpvChanged = false;
    const nextBpv = [...bpvSettings];
    nextBpv.forEach((row, i) => {
      const livePress = getLiveVal(`settings_bpv_settings_row_${i}_pressure`, "PRESSURE");
      if (livePress !== undefined && livePress !== newInit[`bpv_row_${i}_pressure`]) {
        row.pressure = livePress;
        newInit[`bpv_row_${i}_pressure`] = livePress;
        bpvChanged = true;
      }

      const liveMakeup = getLiveVal(`settings_bpv_settings_row_${i}_makeup`, "VALVE");
      if (liveMakeup !== undefined) {
        const parsedMk = (liveMakeup == 1 || liveMakeup === true || liveMakeup === "true" || liveMakeup === "1");
        const storedMk = parsedMk ? 1 : 0;
        if (storedMk !== newInit[`bpv_row_${i}_makeup`]) {
          row.makeup = parsedMk;
          newInit[`bpv_row_${i}_makeup`] = storedMk;
          bpvChanged = true;
        }
      }

      const liveSurplus = getLiveVal(`settings_bpv_settings_row_${i}_surplus`, "VALVE");
      if (liveSurplus !== undefined) {
        const parsedSp = (liveSurplus == 1 || liveSurplus === true || liveSurplus === "true" || liveSurplus === "1");
        const storedSp = parsedSp ? 1 : 0;
        if (storedSp !== newInit[`bpv_row_${i}_surplus`]) {
          row.surplus = parsedSp;
          newInit[`bpv_row_${i}_surplus`] = storedSp;
          bpvChanged = true;
        }
      }
    });
    if (bpvChanged) {
      setBpvSettings(nextBpv);
      changedAny = true;
    }

    // Sync BPV New Settings
    let bpvNewChanged = false;
    const nextBpvNew = { ...bpvNewSettings };
    const syncBpvNew = (dbKey, eq, sig, paramName) => {
      const isMapped = tagMap && tagMap[`${eq}__${sig}`];
      if (!isMapped) {
        if (newInit[dbKey] !== null) {
          nextBpvNew[paramName] = null;
          newInit[dbKey] = null;
          bpvNewChanged = true;
        }
        return;
      }
      const liveVal = getLiveVal(eq, sig);
      if (liveVal !== undefined && Number(liveVal) !== Number(newInit[dbKey])) {
        nextBpvNew[paramName] = Number(liveVal);
        newInit[dbKey] = Number(liveVal);
        bpvNewChanged = true;
      }
    };

    syncBpvNew("bpv_makeup_high_set", "settings_bpv_makeup_high_set", "SETPOINT", "makeupHighSet");
    syncBpvNew("bpv_makeup_low_set", "settings_bpv_makeup_low_set", "SETPOINT", "makeupLowSet");
    syncBpvNew("bpv_makeup_position", "settings_bpv_makeup_position", "SETPOINT", "makeupPosition");
    syncBpvNew("bpv_makeup_limit_high", "settings_bpv_makeup_limit_high", "SETPOINT", "makeupLimitHigh");
    syncBpvNew("bpv_makeup_limit_low", "settings_bpv_makeup_limit_low", "SETPOINT", "makeupLimitLow");

    syncBpvNew("bpv_surplus_high_set", "settings_bpv_surplus_high_set", "SETPOINT", "surplusHighSet");
    syncBpvNew("bpv_surplus_low_set", "settings_bpv_surplus_low_set", "SETPOINT", "surplusLowSet");
    syncBpvNew("bpv_surplus_position", "settings_bpv_surplus_position", "SETPOINT", "surplusPosition");
    syncBpvNew("bpv_surplus_limit_high", "settings_bpv_surplus_limit_high", "SETPOINT", "surplusLimitHigh");
    syncBpvNew("bpv_surplus_limit_low", "settings_bpv_surplus_limit_low", "SETPOINT", "surplusLimitLow");

    if (bpvNewChanged) {
      setBpvNewSettings(nextBpvNew);
      changedAny = true;
    }

    // Sync Score Logics
    let scoreChanged = false;
    const nextScoreCache = JSON.parse(JSON.stringify(scoreLogicsCache));
    for (let line = 1; line <= 4; line++) {
      const lineLogics = nextScoreCache[line];
      if (lineLogics) {
        lineLogics.forEach(row => {
          // Target logic is web-base only, do not read from PLC

          // Actual
          const mappedKeyAct = tagMap[`settings_score_logic_line_${line}_${row.param}_actual__ACTUAL`]
            ? `settings_score_logic_line_${line}_${row.param}_actual`
            : `settings_score_logic_${row.param}_actual`;
          const liveAct = getLiveVal(mappedKeyAct, "ACTUAL");
          if (liveAct !== undefined && liveAct !== newInit[`line_${line}_scoreLogics_${row.param}_actual`]) {
            row.actual = liveAct;
            newInit[`line_${line}_scoreLogics_${row.param}_actual`] = liveAct;
            scoreChanged = true;
          }

          // Score (override calculated score with direct PLC tag if mapped)
          const mappedKeyScore = tagMap[`settings_score_logic_line_${line}_${row.param}_score__SCORE`]
            ? `settings_score_logic_line_${line}_${row.param}_score`
            : `settings_score_logic_${row.param}_score`;
          const liveScore = getLiveVal(mappedKeyScore, "SCORE");
          if (liveScore !== undefined && liveScore !== newInit[`line_${line}_scoreLogics_${row.param}_score`]) {
            row.score = liveScore;
            newInit[`line_${line}_scoreLogics_${row.param}_score`] = liveScore;
            scoreChanged = true;
          }
        });
      }
    }
    if (scoreChanged) { setScoreLogicsCache(nextScoreCache); changedAny = true; }
    setScoreLogics(JSON.parse(JSON.stringify(nextScoreCache[selectedLine] || DEFAULT_SCORE_LOGICS)));

    if (changedAny) {
      setInitialVals(newInit);
    }
  }, [tags, tagMap, availableTags, initialVals, recipeSteps, bpvSettings, bpvNewSettings, scoreLogicsCache, selectedLine]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = localStorage.getItem("kip_token");
        const res = await fetch("/api/sterilizer/settings/recipes-and-params", {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && json.data) {
          const { recipes: dbRecipes, parameters: dbParams } = json.data;

          const apiMappedValues = json.data.mappedValues || [];
          const getMapVal = (eq, sig) => {
            const row = apiMappedValues.find(m => m.equipment === eq && m.signal_key === sig);
            return row ? row.value : undefined;
          };

          const tempInit = {};

          const checkMap = (eq, sig) => {
            if (!tagMap || !tagMap[`${eq}__${sig}`]) return null;
            const val = getMapVal(eq, sig);
            return val !== undefined ? val : null;
          };

          let nextSteps = JSON.parse(JSON.stringify(recipeSteps));
          if (dbRecipes && dbRecipes.ripe && dbRecipes.ripe[1]) {
             nextSteps = JSON.parse(JSON.stringify(dbRecipes.ripe[1]));
          }
          nextSteps.forEach((stepObj) => {
             const stepNum = stepObj.step;
             const line = 1;
             const checkM = (sig, pType) => checkMap(`recipe_line_${line}_step_${stepNum}_${sig}`, pType);
             
             const b = checkM("press", "SETPOINT"); if(b !== null) { stepObj.bar = b; tempInit[`recipe_step_${stepNum}_bar`] = b; }
             const n = checkM("nrm", "DURATION"); if(n !== null) { stepObj.nrm = n; tempInit[`recipe_step_${stepNum}_nrm`] = n; }
             const u = checkM("unf", "DURATION"); if(u !== null) { stepObj.unf = u; tempInit[`recipe_step_${stepNum}_unf`] = u; }
             const w = checkM("wet", "DURATION"); if(w !== null) { stepObj.wet = w; tempInit[`recipe_step_${stepNum}_wet`] = w; }
             
             const i = checkM("inl", "VALVE"); if(i !== null) { stepObj.inl = (i == 1 || String(i).toLowerCase() === "true"); tempInit[`recipe_step_${stepNum}_inl`] = stepObj.inl ? 1:0; }
             const e = checkM("exh", "VALVE"); if(e !== null) { stepObj.exh = (e == 1 || String(e).toLowerCase() === "true"); tempInit[`recipe_step_${stepNum}_exh`] = stepObj.exh ? 1:0; }
             const c = checkM("con", "VALVE"); if(c !== null) { stepObj.con = (c == 1 || String(c).toLowerCase() === "true"); tempInit[`recipe_step_${stepNum}_con`] = stepObj.con ? 1:0; }
             
             const m = checkM("mode", "VALVE_MODE");
             if(m !== null) {
                let p = "OFF";
                if (m == 1) p = "HIGH"; else if (m == 2) p = "LOW";
                stepObj.mode = p;
                tempInit[`recipe_step_${stepNum}_mode`] = Number(m);
             }
          });
          setRecipeSteps(nextSteps);

          if (dbParams) {
            const initParam = (dbKey, eq, sig, setter) => {
              const isMapped = tagMap && tagMap[`${eq}__${sig}`];
              let finalVal = null;
              if (!isMapped) {
                setter(null);
              } else {
                const liveVal = getMapVal(eq, sig);
                finalVal = liveVal !== undefined ? Number(liveVal) : null;
                setter(finalVal);
              }
              tempInit[dbKey] = finalVal;
            };
            initParam("actualThroughput", "settings_capacity_actual_throughput", "ACTUAL_THROUGHPUT", setActualThroughput);

            let nextScoreCache = { ...scoreLogicsCache };
            let updatedScore = false;
            for (let line = 1; line <= 4; line++) {
              if (dbParams[`line_${line}_scoreLogics`]) {
                nextScoreCache[line] = dbParams[`line_${line}_scoreLogics`];
                updatedScore = true;
              }
            }
            if (updatedScore) {
              setScoreLogicsCache(nextScoreCache);
              setScoreLogics(nextScoreCache[selectedLine] || nextScoreCache[1] || DEFAULT_SCORE_LOGICS);
            }

            if (dbParams.designCapacity !== undefined) setDesignCapacity(Number(dbParams.designCapacity));
            if (dbParams.numberSterilizer !== undefined) setNumberSterilizer(Number(dbParams.numberSterilizer));
            if (dbParams.millDesignCapacity !== undefined) setMillDesignCapacity(Number(dbParams.millDesignCapacity));
            if (dbParams.overLimitTime !== undefined) setOverLimitTime(Number(dbParams.overLimitTime));
            if (dbParams.overLimitScore !== undefined) setOverLimitScore(Number(dbParams.overLimitScore));
          }
          setInitialVals(tempInit);
        }
      } catch (err) {
        console.error("Failed to fetch default settings:", err);
      }
    };
    loadSettings();
    // eslint-disable-next-line
  }, []);

  const toggleField = (idx, field) => {
    const currentVal = getRecipeStagedVal(idx, field, recipeSteps[idx][field]);
    setStagedEdits(prev => ({
      ...prev,
      [`master_recipe_step_${idx + 1}_${field}`]: !currentVal
    }));
  };

  const updateStepField = (idx, field, value) => {
    setStagedEdits(prev => ({
      ...prev,
      [`master_recipe_step_${idx + 1}_${field}`]: value
    }));
  };

  const handleSaveScore = (idx, value, paramKey) => {
    const param = paramKey || scoreLogics[idx].param;
    setStagedEdits(prev => ({
      ...prev,
      [`master_score_line_${selectedLine}_${param}_target`]: value
    }));
  };

  const handleKeypadConfirm = (val) => {
    const kp = activeKeypad;
    if (kp.section === 'recipe') {
      const dbField = kp.param === 'bar' ? 'press' : kp.param;
      setStagedEdits(prev => ({
        ...prev,
        [`master_recipe_step_${kp.stepIdx + 1}_${dbField}`]: val
      }));
    } else if (kp.section === 'scoreLogic') {
      handleSaveScore(kp.idx, val, kp.paramKey);
    } else if (kp.section === 'capacity') {
      setStagedEdits(prev => ({ ...prev, [kp.param]: val }));
    } else if (kp.section === 'generalSettings') {
      setStagedEdits(prev => ({ ...prev, [kp.param]: val }));
    } else if (kp.section === 'sequencing') {
      const key = kp.param === 'onStep' ? 'seqOnStep_st1' : 'seqStopStep_st1';
      setStagedEdits(prev => ({ ...prev, [key]: val }));
    } else if (kp.section === 'tempOverride') {
      setStagedEdits(prev => ({ ...prev, [`tempOverride_${kp.param}_st1`]: val }));
    } else if (kp.section === 'analogCalib') {
      setStagedEdits(prev => ({ ...prev, [`analogCalib_${kp.sterilizer}_${kp.meas}_${kp.field}`]: val }));
    } else if (kp.section === 'bpvRow') {
      setStagedEdits(prev => ({ ...prev, [`bpvRow_${kp.idx}_${kp.param}`]: val }));
    } else if (kp.section === 'bpvNewSettings') {
      setStagedEdits(prev => ({ ...prev, [`bpvNew_${kp.param}`]: val }));
    } else if (kp.section === 'mainSteam') {
      setStagedEdits(prev => ({ ...prev, ['mainSteamMin']: val }));
    } else if (kp.section === 'bpvAnalogCalib') {
      setStagedEdits(prev => ({ ...prev, [`bpvAnalogCalib_${kp.key}_${kp.field}`]: val }));
    }
    setActiveKeypad(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedScoreCache = {
        ...scoreLogicsCache,
        [selectedLine]: JSON.parse(JSON.stringify(scoreLogics))
      };

      for (let line = 1; line <= 4; line++) {
        const lineLogics = updatedScoreCache[line] || [];
        lineLogics.forEach(row => {
          const masterKey = `master_score_line_${line}_${row.param}_target`;
          if (stagedEdits[masterKey] !== undefined) row.target = stagedEdits[masterKey];
        });
      }

      const nextSteps = JSON.parse(JSON.stringify(recipeSteps));
      nextSteps.forEach(stepObj => {
        const stepNum = stepObj.step;
        ["press", "nrm", "unf", "wet", "inl", "exh", "con", "mode"].forEach(f => {
          const masterKey = `master_recipe_step_${stepNum}_${f}`;
          if (stagedEdits[masterKey] !== undefined) {
            if (f === 'press') stepObj.bar = stagedEdits[masterKey];
            else stepObj[f] = stagedEdits[masterKey];
          }
        });
      });
      
      // Removed unifiedRecipesObj construction since recipes are sent directly to PLC

      const parameters = {};
      if (stagedEdits['designCapacity'] !== undefined) parameters.designCapacity = stagedEdits['designCapacity'];
      if (stagedEdits['numberSterilizer'] !== undefined) parameters.numberSterilizer = stagedEdits['numberSterilizer'];
      if (stagedEdits['millDesignCapacity'] !== undefined) parameters.millDesignCapacity = stagedEdits['millDesignCapacity'];
      if (stagedEdits['overLimitTime'] !== undefined) parameters.overLimitTime = stagedEdits['overLimitTime'];
      if (stagedEdits['overLimitScore'] !== undefined) parameters.overLimitScore = stagedEdits['overLimitScore'];

      for (let line = 1; line <= 4; line++) {
        const lineLogics = updatedScoreCache[line] || [];
        const hasChanges = lineLogics.some(row => stagedEdits[`master_score_line_${line}_${row.param}_target`] !== undefined);
        if (hasChanges) {
          parameters[`line_${line}_scoreLogics`] = lineLogics.map(row => ({
            step: row.step,
            function: row.function,
            param: row.param,
            target: row.target,
            unit: row.unit,
            decimals: row.decimals
          }));
        }
      }
      
      const currentSelectedLogics = updatedScoreCache[selectedLine] || [];
      const hasSelectedChanges = currentSelectedLogics.some(row => stagedEdits[`master_score_line_${selectedLine}_${row.param}_target`] !== undefined);
      if (hasSelectedChanges) {
        parameters.scoreLogics = currentSelectedLogics.map(row => ({
          step: row.step,
          function: row.function,
          param: row.param,
          target: row.target,
          unit: row.unit,
          decimals: row.decimals
        }));
      }

      let isBackendSaved = true;
      if (Object.keys(parameters).length > 0) {
        const token = localStorage.getItem("kip_token");
        const res = await fetch("/api/sterilizer/settings/recipes-and-params", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ parameters })
        });
        if (!res.ok) { const text = await res.text(); throw new Error("HTTP " + res.status + " " + text.substring(0, 50)); }
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Failed to save settings.");
      }

      setScoreLogicsCache(updatedScoreCache);
      setScoreLogics(updatedScoreCache[selectedLine]);

      const sendPlc = async (val, dbKey, equipmentKey, signalKey) => {
        // HANYA kirim jika nilai tersebut secara eksplisit diedit (ada di kotak kuning / stagedEdits)
        if (stagedEdits[dbKey] === undefined) return; 
        
        val = stagedEdits[dbKey];
        if (val === null || val === undefined) return;
        
        const key = `${equipmentKey}__${signalKey}`;
        const tagId = tagMap[key];
        if (tagId) {
          usePlcStore.getState().sendCommand(tagId, val, key, "sterilizer");
        }
      };
      sendPlc(actualThroughput, "actualThroughput", "settings_capacity_actual_throughput", "ACTUAL_THROUGHPUT");
      sendPlc(safetyDoor, "safetyDoor", "settings_logic_safety_door", "SETPOINT");
      sendPlc(autoBlowdown, "autoBlowdown", "settings_logic_auto_blowdown", "SETPOINT");
      sendPlc(holdingPressure, "holdingPressure", "settings_holding_pressure", "SETPOINT");
      sendPlc(startToStepCycle, "startToStepCycle", "settings_start_step_cycle", "SETPOINT");
      sendPlc(sequencingOnStep, "seqOnStep_st1", "settings_seq_on_step", "STEP");
      sendPlc(sequencingStopStep, "seqStopStep_st1", "settings_seq_stop_step", "STEP");
      sendPlc(mainSteamMin, "mainSteamMin", "settings_logic_main_steam_min", "SETPOINT");

      // Target scores are web-base only, do not send to PLC
      sendPlc(tempOverride && tempOverride.safetyPressure, `tempOverride_pressureLimit_st1`, `settings_logic_temp_override_press_st1`, "SETPOINT");
      sendPlc(tempOverride && tempOverride.holdingStepStart, `tempOverride_holdingStepStart_st1`, `settings_logic_temp_override_hss_st1`, "STEP");
      sendPlc(tempOverride && tempOverride.holdingStepEnd, `tempOverride_holdingStepEnd_st1`, `settings_logic_temp_override_hse_st1`, "STEP");
      sendPlc(tempOverride && tempOverride.tempIdle, `tempOverride_tempIdle_st1`, `settings_logic_temp_override_idle_st1`, "SETPOINT");
      sendPlc(tempOverride && tempOverride.tempLow, `tempOverride_tempLow_st1`, `settings_logic_temp_override_low_st1`, "SETPOINT");
      sendPlc(tempOverride && tempOverride.timeOpenCon, `tempOverride_timeOpenCon_st1`, `settings_logic_temp_override_toc_st1`, "DURATION");
      sendPlc(tempOverride && tempOverride.timeCloseCon, `tempOverride_timeCloseCon_st1`, `settings_logic_temp_override_tcc_st1`, "DURATION");
      sendPlc(tempOverride && tempOverride.highTemp, `tempOverride_highTemp_st1`, `settings_logic_temp_override_temp_st1`, "SETPOINT");

      for (let st = 1; st <= 4; st++) {
        ["pressure", "temp"].forEach(meas => {
          const calib = (analogCalib && analogCalib[st] && analogCalib[st][meas]) || {};
          sendPlc(calib.maxSensor, `analogCalib_st${st}_${meas}_maxSensor`, `settings_analog_calib_st${st}_${meas}_max`, "SETPOINT");
          sendPlc(calib.calibrationValue, `analogCalib_st${st}_${meas}_calibValue`, `settings_analog_calib_st${st}_${meas}_calib`, "SETPOINT");
        });
      }

      ["pressureBpv", "pressureBoiler"].forEach(k => {
        sendPlc(bpvAnalogCalib && bpvAnalogCalib[k] ? bpvAnalogCalib[k].max : undefined, `bpvAnalogCalib_${k}_max`, `settings_bpv_analog_${k}_max`, "SETPOINT");
        sendPlc(bpvAnalogCalib && bpvAnalogCalib[k] ? bpvAnalogCalib[k].calibration : undefined, `bpvAnalogCalib_${k}_calibration`, `settings_bpv_analog_${k}_calib`, "SETPOINT");
      });

      for (let line = 1; line <= 4; line++) {
        const lineLogics = updatedScoreCache[line] || [];
        // Target scores are web-only, not sent to PLC
      }

      sendPlc(bpvNewSettings.makeupHighSet, "bpvNew_makeupHighSet", "settings_bpv_makeup_high_set", "SETPOINT");
      sendPlc(bpvNewSettings.makeupLowSet, "bpvNew_makeupLowSet", "settings_bpv_makeup_low_set", "SETPOINT");
      sendPlc(bpvNewSettings.makeupPosition, "bpvNew_makeupPosition", "settings_bpv_makeup_position", "SETPOINT");
      sendPlc(bpvNewSettings.makeupLimitHigh, "bpvNew_makeupLimitHigh", "settings_bpv_makeup_limit_high", "SETPOINT");
      sendPlc(bpvNewSettings.makeupLimitLow, "bpvNew_makeupLimitLow", "settings_bpv_makeup_limit_low", "SETPOINT");

      sendPlc(bpvNewSettings.surplusHighSet, "bpvNew_surplusHighSet", "settings_bpv_surplus_high_set", "SETPOINT");
      sendPlc(bpvNewSettings.surplusLowSet, "bpvNew_surplusLowSet", "settings_bpv_surplus_low_set", "SETPOINT");
      sendPlc(bpvNewSettings.surplusPosition, "bpvNew_surplusPosition", "settings_bpv_surplus_position", "SETPOINT");
      sendPlc(bpvNewSettings.surplusLimitHigh, "bpvNew_surplusLimitHigh", "settings_bpv_surplus_limit_high", "SETPOINT");
      sendPlc(bpvNewSettings.surplusLimitLow, "bpvNew_surplusLimitLow", "settings_bpv_surplus_limit_low", "SETPOINT");


      nextSteps.forEach((stepObj) => {
        const stepNum = stepObj.step;
        const line = 1; // Master Line
        if (stagedEdits[`master_recipe_step_${stepNum}_press`] !== undefined) sendPlc(stepObj.bar, `master_recipe_step_${stepNum}_press`, `recipe_line_${line}_step_${stepNum}_press`, "SETPOINT");
        if (stagedEdits[`master_recipe_step_${stepNum}_nrm`] !== undefined) sendPlc(stepObj.nrm, `master_recipe_step_${stepNum}_nrm`, `recipe_line_${line}_step_${stepNum}_nrm`, "DURATION");
        if (stagedEdits[`master_recipe_step_${stepNum}_unf`] !== undefined) sendPlc(stepObj.unf, `master_recipe_step_${stepNum}_unf`, `recipe_line_${line}_step_${stepNum}_unf`, "DURATION");
        if (stagedEdits[`master_recipe_step_${stepNum}_wet`] !== undefined) sendPlc(stepObj.wet, `master_recipe_step_${stepNum}_wet`, `recipe_line_${line}_step_${stepNum}_wet`, "DURATION");
        if (stagedEdits[`master_recipe_step_${stepNum}_inl`] !== undefined) sendPlc(stepObj.inl ? 1 : 0, `master_recipe_step_${stepNum}_inl`, `recipe_line_${line}_step_${stepNum}_inl`, "VALVE");
        if (stagedEdits[`master_recipe_step_${stepNum}_exh`] !== undefined) sendPlc(stepObj.exh ? 1 : 0, `master_recipe_step_${stepNum}_exh`, `recipe_line_${line}_step_${stepNum}_exh`, "VALVE");
        if (stagedEdits[`master_recipe_step_${stepNum}_con`] !== undefined) sendPlc(stepObj.con ? 1 : 0, `master_recipe_step_${stepNum}_con`, `recipe_line_${line}_step_${stepNum}_con`, "VALVE");
        if (stagedEdits[`master_recipe_step_${stepNum}_mode`] !== undefined) {
          let modeVal = 0;
          if (stepObj.mode === "HIGH") modeVal = 1;
          else if (stepObj.mode === "LOW") modeVal = 2;
          sendPlc(modeVal, `master_recipe_step_${stepNum}_mode`, `recipe_line_${line}_step_${stepNum}_mode`, "VALVE_MODE");
        }
      });

      alert("Settings saved successfully to database!");
      // COMMIT PRIMITIVE STATES SO UI DOESN'T REVERT
      if (stagedEdits['designCapacity'] !== undefined) setDesignCapacity(stagedEdits['designCapacity']);
      if (stagedEdits['numberSterilizer'] !== undefined) setNumberSterilizer(stagedEdits['numberSterilizer']);
      if (stagedEdits['millDesignCapacity'] !== undefined) setMillDesignCapacity(stagedEdits['millDesignCapacity']);
      if (stagedEdits['overLimitTime'] !== undefined) setOverLimitTime(stagedEdits['overLimitTime']);
      if (stagedEdits['overLimitScore'] !== undefined) setOverLimitScore(stagedEdits['overLimitScore']);
      if (stagedEdits['safetyDoor'] !== undefined) setSafetyDoor(stagedEdits['safetyDoor']);
      if (stagedEdits['autoBlowdown'] !== undefined) setAutoBlowdown(stagedEdits['autoBlowdown']);
      if (stagedEdits['holdingPressure'] !== undefined) setHoldingPressure(stagedEdits['holdingPressure']);
      if (stagedEdits['startToStepCycle'] !== undefined) setStartToStepCycle(stagedEdits['startToStepCycle']);
      if (stagedEdits['seqOnStep_st1'] !== undefined) setSequencingOnStep(stagedEdits['seqOnStep_st1']);
      if (stagedEdits['seqStopStep_st1'] !== undefined) setSequencingStopStep(stagedEdits['seqStopStep_st1']);
      if (stagedEdits['mainSteamMin'] !== undefined) setMainSteamMin(stagedEdits['mainSteamMin']);
      
      if (
        stagedEdits['tempOverride_pressureLimit_st1'] !== undefined || 
        stagedEdits['tempOverride_holdingStepStart_st1'] !== undefined ||
        stagedEdits['tempOverride_holdingStepEnd_st1'] !== undefined ||
        stagedEdits['tempOverride_tempIdle_st1'] !== undefined ||
        stagedEdits['tempOverride_tempLow_st1'] !== undefined ||
        stagedEdits['tempOverride_timeOpenCon_st1'] !== undefined ||
        stagedEdits['tempOverride_timeCloseCon_st1'] !== undefined ||
        stagedEdits['tempOverride_highTemp_st1'] !== undefined
      ) {
        setTempOverride(prev => ({
          ...prev,
          safetyPressure: stagedEdits['tempOverride_pressureLimit_st1'] !== undefined ? stagedEdits['tempOverride_pressureLimit_st1'] : prev.safetyPressure,
          holdingStepStart: stagedEdits['tempOverride_holdingStepStart_st1'] !== undefined ? stagedEdits['tempOverride_holdingStepStart_st1'] : prev.holdingStepStart,
          holdingStepEnd: stagedEdits['tempOverride_holdingStepEnd_st1'] !== undefined ? stagedEdits['tempOverride_holdingStepEnd_st1'] : prev.holdingStepEnd,
          tempIdle: stagedEdits['tempOverride_tempIdle_st1'] !== undefined ? stagedEdits['tempOverride_tempIdle_st1'] : prev.tempIdle,
          tempLow: stagedEdits['tempOverride_tempLow_st1'] !== undefined ? stagedEdits['tempOverride_tempLow_st1'] : prev.tempLow,
          timeOpenCon: stagedEdits['tempOverride_timeOpenCon_st1'] !== undefined ? stagedEdits['tempOverride_timeOpenCon_st1'] : prev.timeOpenCon,
          timeCloseCon: stagedEdits['tempOverride_timeCloseCon_st1'] !== undefined ? stagedEdits['tempOverride_timeCloseCon_st1'] : prev.timeCloseCon,
          highTemp: stagedEdits['tempOverride_highTemp_st1'] !== undefined ? stagedEdits['tempOverride_highTemp_st1'] : prev.highTemp
        }));
      }

      setBpvNewSettings(prev => {
        const next = { ...prev };
        const keys = ['makeupHighSet', 'makeupLowSet', 'makeupPosition', 'makeupLimitHigh', 'makeupLimitLow', 'surplusHighSet', 'surplusLowSet', 'surplusPosition', 'surplusLimitHigh', 'surplusLimitLow'];
        keys.forEach(k => {
          if (stagedEdits[`bpvNew_${k}`] !== undefined) next[k] = stagedEdits[`bpvNew_${k}`];
        });
        return next;
      });

      setBpvAnalogCalib(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        ["pressureBpv", "pressureBoiler"].forEach(k => {
          if (!next[k]) next[k] = {};
          if (stagedEdits[`bpvAnalogCalib_${k}_max`] !== undefined) next[k].max = stagedEdits[`bpvAnalogCalib_${k}_max`];
          if (stagedEdits[`bpvAnalogCalib_${k}_calibration`] !== undefined) next[k].calibration = stagedEdits[`bpvAnalogCalib_${k}_calibration`];
        });
        return next;
      });

      setAnalogCalib(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        for (let st = 1; st <= 4; st++) {
          if (!next[st]) next[st] = {};
          ["pressure", "temp"].forEach(meas => {
            if (!next[st][meas]) next[st][meas] = {};
            if (stagedEdits[`analogCalib_st${st}_${meas}_maxSensor`] !== undefined) next[st][meas].maxSensor = stagedEdits[`analogCalib_st${st}_${meas}_maxSensor`];
            if (stagedEdits[`analogCalib_st${st}_${meas}_calibValue`] !== undefined) next[st][meas].calibrationValue = stagedEdits[`analogCalib_st${st}_${meas}_calibValue`];
          });
        }
        return next;
      });

      setStagedEdits({});
    } catch (err) {
      console.error(err);
      alert("Failed to save settings: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreDefault = () => {
    if (window.confirm("Are you sure you want to restore default settings?")) {
      setLocalRecipes(() => {
        const restored = { ripe: {}, unripe: {}, overripe: {} };
        const categories = ["ripe", "unripe", "overripe"];
        categories.forEach((cat) => {
          for (let line = 1; line <= 4; line++) {
            restored[cat][line] = Array.from({ length: 20 }, (_, i) => {
              const stepNum = i + 1;
              if (i < 16) {
                const def = defaultRecipesValues[i];
                return {
                  step: stepNum,
                  unf: def.unf,
                  nrm: def.nrm,
                  wet: def.wet,
                  inl: def.inl,
                  con: def.con,
                  exh: def.exh,
                  bar: def.bar,
                  mode: def.mode,
                  doorIn: def.doorIn,
                  doorOut: def.doorOut
                };
              } else {
                return {
                  step: stepNum,
                  unf: 0,
                  nrm: 0,
                  wet: 0,
                  inl: false,
                  con: false,
                  exh: false,
                  bar: "0.0",
                  mode: "OFF",
                  doorIn: "Close",
                  doorOut: "Close"
                };
              }
            });
          }
        });
        return restored;
      });
      setDesignCapacity(null);
      setNumberSterilizer(null); // Match spreadsheet default
      setMillDesignCapacity(null);
      setActualThroughput(null);
      setSterilScore(null);
      setLeadTimeScore(null);
      setThroughputScore(null);
      setOverLimitTime(null);
      setOverLimitScore(null);
      setScoreLogics([
        { step: 1, function: "Deaeration", target: 100, actual: 90, unit: "°C", decimals: 0, param: "deaeration_temp" },
        { step: 2, function: "1st Peak Up", target: 2.50, actual: 2.00, unit: "bar", decimals: 1, param: "peak1_press" },
        { step: 3, function: "2nd Peak Up", target: 2.50, actual: 2.30, unit: "bar", decimals: 1, param: "peak2_press" },
        { step: 4, function: "3rd Peak Up", target: 2.80, actual: 2.40, unit: "bar", decimals: 1, param: "peak3_press" },
        { step: 5, function: "Holding", target: 2.80, actual: 2.70, unit: "bar", decimals: 1, param: "holding_press" },
        { step: 6, function: "1st Intermitten Blow", target: 140, actual: 138, unit: "°C", decimals: 0, param: "blow1_temp" },
        { step: 7, function: "Holding", target: 2.80, actual: 2.65, unit: "bar", decimals: 1, param: "holding2_press" },
        { step: 8, function: "2nd Intermitten Blow", target: 140, actual: 139, unit: "°C", decimals: 0, param: "blow2_temp" },
        { step: 9, function: "Holding", target: 2.80, actual: 2.50, unit: "bar", decimals: 1, param: "holding3_press" },
        { step: 10, function: "3rd Intermitten Blow", target: 140, actual: 140, unit: "°C", decimals: 0, param: "blow3_temp" },
        { step: 11, function: "Holding", target: 2.80, actual: 2.80, unit: "bar", decimals: 1, param: "holding4_press" },
        { step: 12, function: "Blow-down", target: 120, actual: 150, unit: "s", decimals: 0, param: "blowdown_time" },
        { step: 13, function: "Exhaust", target: 180, actual: 265, unit: "s", decimals: 0, param: "exhaust_time" },
        { step: "FFB", function: "FFB loading in/out", target: 1200, actual: 900, unit: "s", decimals: 0, param: "ffb_loading" },
        { step: "T_Ster", function: "Target Sterilization Time", target: 6690, actual: 6550, unit: "s", decimals: 0, param: "target_ster_time" },
        { step: "T_Cyc", function: "Target Cycle Time", target: 7890, actual: 7450, unit: "s", decimals: 0, param: "target_cyc_time" },
        { step: "Tput", function: "Throughput", target: 22.81, actual: 24.16, unit: "mt/hr", decimals: 1, param: "throughput_rate" }
      ]);
      setSafetyDoor(null);
      setAutoBlowdown(null);
      setHoldingPressure(null);
      setStartToStepCycle(null);
      setSequencingOnStep(null);
      setSequencingStopStep(null);
      setTempOverride({ 
        safetyPressure: null, 
        holdingStepStart: null,
        holdingStepEnd: null,
        tempIdle: null,
        tempLow: null,
        timeOpenCon: null,
        timeCloseCon: null,
        highTemp: null 
      });
      setBpvSettings(defaultBpvSettings);
      setBpvNewSettings({
        makeupHighSet: 3.20,
        makeupLowSet: 3.00,
        makeupPosition: 50,
        makeupLimitHigh: 100,
        makeupLimitLow: 0,
        surplusHighSet: 3.10,
        surplusLowSet: 2.90,
        surplusPosition: 50,
        surplusLimitHigh: 100,
        surplusLimitLow: 0
      });
      setMainSteamMin(19.5);
      setBpvAnalogCalib({ pressureBpv: { max: 0, calibration: 0, rawValue: 0, outActual: 0 }, pressureBoiler: { max: 0, calibration: 0, rawValue: 0, outActual: 0 } });
    }
  };

  const handleExport = () => {
    const workbook = XLSX.utils.book_new();

    const generateSheetForCategory = (category) => {
      const grid = [];
      const ensureRow = (r) => {
        while (grid.length <= r) {
          grid.push(Array(25).fill(""));
        }
      };

      const writeBlock = (startRow, startCol, data) => {
        data.forEach((row, rIdx) => {
          const curRow = startRow + rIdx;
          ensureRow(curRow);
          row.forEach((val, cIdx) => {
            grid[curRow][startCol + cIdx] = val !== undefined && val !== null ? val : "";
          });
        });
      };

      // Write Section Header Banners
      ensureRow(0);
      grid[0][0] = "STERILIZER CONTROL LOGICS";
      grid[0][11] = "STERILIZER SCORE LOGICS";
      grid[0][17] = "CONTROL LOGICS";

      // -------------------------------------------------------------
      // SECTION 1: STERILIZER CONTROL LOGICS
      // -------------------------------------------------------------
      const lineSteps = recipeSteps;
      const recipeData = [
        ["RECIPE STEPS"],
        ["Step", "Function", "Inlet Valve", "Exhaust Valve", "Condensate Valve", "Pressure Setpoint (bar)", "Valve Mode", "Normal Duration (s)", "Unfresh Duration (s)", "Wet Duration (s)"],
        ...lineSteps.map((step) => [
          step.step,
          "MODULATE",
          step.inl ? "OPEN" : "CLOSE",
          step.exh ? "OPEN" : "CLOSE",
          step.con ? "OPEN" : "CLOSE",
          step.bar || "0.00",
          step.mode || "OFF",
          step.nrm || 0,
          step.unf || 0,
          step.wet || 0,
        ])
      ];
      writeBlock(2, 0, recipeData);

      // -------------------------------------------------------------
      // SECTION 2: STERILIZER SCORE LOGICS
      // -------------------------------------------------------------
      const stepScoreLogics = scoreLogics.filter(row => typeof row.step === "number");
      const globalPerformanceMetrics = scoreLogics.filter(row => typeof row.step !== "number");

      const stepScoreData = [
        ["STEP SCORE LOGICS"],
        ["Step", "Function", "Target Setpoint", "Actual Value", "Score (%)"],
        ...stepScoreLogics.map((row) => [
          row.step,
          row.function,
          `${row.target}${row.unit || ""}`,
          `${row.actual}${row.unit || ""}`,
          row.score !== undefined && row.score !== null ? `${row.score}%` : `${calculateScore(row.target, row.actual, row.step)}%`
        ])
      ];
      writeBlock(2, 11, stepScoreData);

      const globalPerfData = [
        ["GLOBAL PERFORMANCE METRICS"],
        ["Metric", "Function", "Target Setpoint", "Actual Value", "Score (%)"],
        ...globalPerformanceMetrics.map((row) => [
          row.step,
          row.function,
          `${row.target}${row.unit || ""}`,
          `${row.actual}${row.unit || ""}`,
          row.score !== undefined && row.score !== null ? `${row.score}%` : `${calculateScore(row.target, row.actual, row.step)}%`
        ])
      ];
      writeBlock(19, 11, globalPerfData);

      const capacityData = [
        ["CAPACITY SETTINGS"],
        ["Parameter", "Value", "Unit"],
        ["Sterilizer Design Cap.", designCapacity, "ton"],
        ["No. of Sterilizer", numberSterilizer, "unit"],
        ["Mill Design Cap.", millDesignCapacity, "mt/hr"],
        ["Actual Throughput", actualThroughput, "mt/hr"]
      ];
      writeBlock(27, 11, capacityData);

      const scorePerfData = [
        ["SCORE PERFORMANCE"],
        ["Parameter", "Score"],
        ["Sterilization Score", `${getComputedScoreForGlobal('target_ster_time', 'T_Ster')}%`],
        ["Lead time Score", `${getComputedScoreForGlobal('target_cyc_time', 'T_Cyc')}%`],
        ["Throughput Score", `${getComputedScoreForGlobal('throughput_rate', 'Tput')}%`]
      ];
      writeBlock(35, 11, scorePerfData);

      const tolerancesData = [
        ["OVER LIMIT TOLERANCES"],
        ["Parameter", "Value", "Unit"],
        ["Over Limit (Time)", overLimitTime, "s"],
        ["Over Limit (Score)", overLimitScore, "s"]
      ];
      writeBlock(42, 11, tolerancesData);

      // -------------------------------------------------------------
      // SECTION 3: CONTROL LOGICS
      // -------------------------------------------------------------
      const generalSettingsData = [
        ["GENERAL SETTINGS"],
        ["Parameter", "Value", "Unit"],
        ["Safety Door", safetyDoor, "bar"],
        ["Auto Blowdown", autoBlowdown, "bar"],
        ["Holding Pressure", holdingPressure, "bar"],
        ["Start to Step Cycle", startToStepCycle, "step"]
      ];
      writeBlock(2, 17, generalSettingsData);

      const sequencingData = [
        ["STERILIZER SEQUENCING"],
        ["", "ST1", "ST2", "ST3", "ST4"],
        ["On Step", sequencingOnStep, sequencingOnStep, sequencingOnStep, sequencingOnStep],
        ["Stop - Step", sequencingStopStep, sequencingStopStep, sequencingStopStep, sequencingStopStep]
      ];
      writeBlock(10, 17, sequencingData);

      const tempOvData = [
        ["TEMPERATURE OVERRIDING DURING HOLDING"],
        ["", "ST1", "ST2", "ST3", "ST4"],
        ["Pressure Limit (bar)", tempOverride ? tempOverride.pressureLimit : "", tempOverride ? tempOverride.pressureLimit : "", tempOverride ? tempOverride.pressureLimit : "", tempOverride ? tempOverride.pressureLimit : ""],
        ["High Temp (°C)", tempOverride ? tempOverride.highTemp : "", tempOverride ? tempOverride.highTemp : "", tempOverride ? tempOverride.highTemp : "", tempOverride ? tempOverride.highTemp : ""]
      ];
      writeBlock(16, 17, tempOvData);

      const mainSteamData = [
        ["MAIN STEAM OVERRIDING"],
        ["Parameter", "Value", "Action"],
        ["Main Steam Min Limit", `${mainSteamMin} bar`, "Make-up Close"]
      ];
      writeBlock(23, 17, mainSteamData);

      const bpvData = [
        ["BPV SETTINGS"],
        ["Parameter", "Make-up Valve", "Surplus Valve"],
        ["HIGH SET", `${bpvNewSettings.makeupHighSet} bar`, `${bpvNewSettings.surplusHighSet} bar`],
        ["LOW SET", `${bpvNewSettings.makeupLowSet} bar`, `${bpvNewSettings.surplusLowSet} bar`],
        ["POSITION", `${bpvNewSettings.makeupPosition} %`, `${bpvNewSettings.surplusPosition} %`],
        ["Limit High", `${bpvNewSettings.makeupLimitHigh} %`, `${bpvNewSettings.surplusLimitHigh} %`],
        ["Limit Low", `${bpvNewSettings.makeupLimitLow} %`, `${bpvNewSettings.surplusLimitLow} %`],
      ];
      writeBlock(28, 17, bpvData);

      // Create Worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(grid);

      // Apply Luxury styling via xlsx-js-style
      const isTableTitleCell = (R, C) => {
        if (R === 2 && C >= 0 && C <= 9) return true;
        if (R === 2 && C >= 11 && C <= 15) return true;
        if (R === 19 && C >= 11 && C <= 15) return true;
        if (R === 27 && C >= 11 && C <= 13) return true;
        if (R === 35 && C >= 11 && C <= 12) return true;
        if (R === 42 && C >= 11 && C <= 13) return true;
        if (R === 2 && C >= 17 && C <= 18) return true;
        if (R === 7 && C >= 17 && C <= 19) return true;
        if (R === 13 && C >= 17 && C <= 19) return true;
        if (R === 19 && C >= 17 && C <= 19) return true;
        if (R === 27 && C >= 17 && C <= 19) return true;
        if (R === 37 && C >= 17 && C <= 19) return true;
        if (R === 42 && C >= 17 && C <= 19) return true;
        return false;
      };

      const isColumnHeaderCell = (R, C) => {
        if (R === 3 && C >= 0 && C <= 9) return true;
        if (R === 3 && C >= 11 && C <= 15) return true;
        if (R === 20 && C >= 11 && C <= 15) return true;
        if (R === 28 && C >= 11 && C <= 13) return true;
        if (R === 36 && C >= 11 && C <= 12) return true;
        if (R === 43 && C >= 11 && C <= 13) return true;
        if (R === 3 && C >= 17 && C <= 18) return true;
        if (R === 8 && C >= 17 && C <= 19) return true;
        if (R === 14 && C >= 17 && C <= 19) return true;
        if (R === 20 && C >= 17 && C <= 19) return true;
        if (R === 28 && C >= 17 && C <= 19) return true;
        if (R === 38 && C >= 17 && C <= 19) return true;
        if (R === 43 && C >= 17 && C <= 19) return true;
        return false;
      };

      const range = XLSX.utils.decode_range(worksheet['!ref']);
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          let cell = worksheet[cellRef];

          // Ensure styling spans empty cells in banners/titles
          if (!cell) {
            if (R === 0 && ((C >= 0 && C <= 9) || (C >= 11 && C <= 15) || (C >= 17 && C <= 21))) {
              worksheet[cellRef] = { v: "", t: "s" };
              cell = worksheet[cellRef];
            } else if (isTableTitleCell(R, C)) {
              worksheet[cellRef] = { v: "", t: "s" };
              cell = worksheet[cellRef];
            } else {
              continue;
            }
          }

          cell.s = {
            font: { name: "Arial", size: 10, color: { rgb: "000000" } },
            alignment: { vertical: "center" },
            border: {}
          };

          // Standard borders for cells with values
          if (cell.v !== "") {
            cell.s.border = {
              top: { style: "thin", color: { rgb: "CCCCCC" } },
              bottom: { style: "thin", color: { rgb: "CCCCCC" } },
              left: { style: "thin", color: { rgb: "CCCCCC" } },
              right: { style: "thin", color: { rgb: "CCCCCC" } }
            };
          }

          // Section Banners styling (Row 0)
          if (R === 0) {
            cell.s.font = { name: "Arial", size: 11, bold: true, color: { rgb: "FFFFFF" } };
            cell.s.fill = { fgColor: { rgb: "C5A059" } }; // Darker Mewah Gold
            cell.s.alignment.horizontal = "left";
            continue;
          }

          // Table Title cells styling
          if (isTableTitleCell(R, C)) {
            cell.s.font = { name: "Arial", size: 10, bold: true, color: { rgb: "4A3C20" } };
            cell.s.fill = { fgColor: { rgb: "FFF9E6" } }; // Soft light yellow tint
            cell.s.alignment.horizontal = "left";
            cell.s.border = {
              top: { style: "medium", color: { rgb: "C5A059" } },
              bottom: { style: "thin", color: { rgb: "C5A059" } }
            };
            continue;
          }

          // Column Header cells styling
          if (isColumnHeaderCell(R, C)) {
            cell.s.font = { name: "Arial", size: 10, bold: true, color: { rgb: "000000" } };
            cell.s.fill = { fgColor: { rgb: "F9E79F" } }; // Gold yellow header
            cell.s.alignment.horizontal = "center";
            cell.s.border = {
              top: { style: "thin", color: { rgb: "CCCCCC" } },
              bottom: { style: "medium", color: { rgb: "C5A059" } },
              left: { style: "thin", color: { rgb: "CCCCCC" } },
              right: { style: "thin", color: { rgb: "CCCCCC" } }
            };
            continue;
          }

          // Alignments: Numbers center-aligned, text left-aligned
          if (cell.v !== "") {
            let alignCenter = false;
            if (typeof cell.v === "number") {
              alignCenter = true;
            } else if (typeof cell.v === "string") {
              const trimmed = cell.v.trim();
              if (/^-?\d+(\.\d+)?(%| bar| s|°C| step| ton| unit| mt\/hr)?$/.test(trimmed)) {
                alignCenter = true;
              } else if (trimmed === "OPEN" || trimmed === "CLOSE" || trimmed === "OFF" || trimmed === "LOW" || trimmed === "HIGH" || trimmed === "MODULATE") {
                alignCenter = true;
              }
            }
            cell.s.alignment.horizontal = alignCenter ? "center" : "left";
          }
        }
      }

      // Set custom column widths to prevent truncation
      worksheet['!cols'] = [
        { wch: 8 },  // A: Step
        { wch: 12 }, // B: Function
        { wch: 15 }, // C: Inlet Valve
        { wch: 15 }, // D: Exhaust Valve
        { wch: 15 }, // E: Condensate Valve
        { wch: 22 }, // F: Pressure Setpoint (bar)
        { wch: 12 }, // G: Valve Mode
        { wch: 18 }, // H: Normal Duration (s)
        { wch: 18 }, // I: Unfresh Duration (s)
        { wch: 18 }, // J: Wet Duration (s)
        { wch: 4 },  // K: Spacer
        { wch: 8 },  // L: Metric/Step
        { wch: 25 }, // M: Function
        { wch: 18 }, // N: Target Setpoint
        { wch: 18 }, // O: Actual Value
        { wch: 12 }, // P: Score (%)
        { wch: 4 },  // Q: Spacer
        { wch: 38 }, // R: Parameter
        { wch: 15 }, // S: Value
        { wch: 22 }  // T: Unit/Action
      ];

      return worksheet;
    };

    const wsRipe = generateSheetForCategory("ripe");
    const wsUnripe = generateSheetForCategory("unripe");
    const wsOverripe = generateSheetForCategory("overripe");

    XLSX.utils.book_append_sheet(workbook, wsRipe, "Ripe");
    XLSX.utils.book_append_sheet(workbook, wsUnripe, "Unripe");
    XLSX.utils.book_append_sheet(workbook, wsOverripe, "Overripe");

    XLSX.writeFile(workbook, `sterilizer_setting_line_${selectedLine}.xlsx`);
  };

  

  // Helper calculation formulas for display (Totals calculated dynamically)
  const totals = getTotals({ 1: recipeSteps }, 1);


  const currentLineSteps = recipeSteps;

  return (
    <section className="som-sterilizer-station">
      {/* Header section */}
      <header className="som-sterilizer-station-header">
        <div className="som-header-left">
          <h2 className="som-sterilizer-station-title">Sterilizer Station</h2>
        </div>
        <div className="som-view-toggle-container" style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
          <button className="som-view-btn" onClick={onClose}>
            PROCESS VIEW
          </button>
          <button className="som-view-btn" disabled style={{ cursor: "not-allowed", opacity: 0.6, display: "flex", alignItems: "center", gap: "4px" }}>
            MAINTENANCE VIEW
            <svg width="10" height="12" viewBox="0 0 448 512" fill="currentColor" style={{ marginLeft: "4px" }}>
              <path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z" />
            </svg>
          </button>
          <button className="som-view-btn active" style={{ marginLeft: "8px" }}>
            ⚙️ SETTINGS
          </button>
        </div>
      </header>

      {/* Main Settings Panel */}
      <div className="som-ster-page">

        {/* Content columns */}
        <div className="som-settings-columns-container">
          {/* Column 1: Card 1 - Recipe / Sterilizer Control Logics */}
          <div className="som-settings-col som-col-1" style={{ gridRow: '1 / span 2' }}>
            <div className="som-settings-card som-recipe-card">
              <div className="som-settings-card-header" style={{ justifyContent: "space-between" }}>
                <span>STERILIZER CONTROL LOGICS</span>
              </div>
              <div className="som-settings-card-body">
                <div className="som-recipe-dense-table som-table-wrapper">
                  <table className="som-ultra-table">
                    <thead>
                      <tr>
                        <th rowSpan="2">S</th>
                        <th rowSpan="2">VALVE</th>
                        <th rowSpan="2">INL</th>
                        <th rowSpan="2">EXH</th>
                        <th rowSpan="2">CON</th>
                        <th colSpan="2">PRESS</th>
                        <th rowSpan="2">UNF</th>
                        <th rowSpan="2">NRM</th>
                        <th rowSpan="2">WET</th>
                      </tr>
                      <tr>
                        <th>V</th>
                        <th>M</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentLineSteps.map((step, idx) => (
                        <tr key={step.step || idx}>
                          <td className="som-n">{step.step}</td>
                          <td className="som-tiny-txt" style={{ fontWeight: "800" }}>
                            MODULATE
                          </td>
                          <td
                            onClick={
                              configMode
                                ? () => handleEquipmentClick(
                                  `recipe_line_${selectedLine}_step_${step.step}_inl`,
                                  [],
                                  [{ key: "VALVE", label: `Line ${selectedLine} Step ${step.step} Inlet Valve` }]
                                )
                                : () => toggleField(idx, "inl")
                            }
                          >
                            <div
                              className={`som-rect-status ${getRecipeStagedVal(idx, "inl", step.inl) ? "open" : "close"} som-editable ${stagedEdits[`master_recipe_step_${step.step}_inl`] !== undefined ? "som-edited-field" : ""}`}
                              style={getDeveloperStyle(`recipe_line_${selectedLine}_step_${step.step}_inl`, "VALVE")}
                            >
                              {getRecipeStagedVal(idx, "inl", step.inl) ? "OPEN" : "CLOSE"}
                            </div>
                          </td>
                          <td
                            onClick={
                              configMode
                                ? () => handleEquipmentClick(
                                  `recipe_line_${selectedLine}_step_${step.step}_exh`,
                                  [],
                                  [{ key: "VALVE", label: `Line ${selectedLine} Step ${step.step} Exhaust Valve` }]
                                )
                                : () => toggleField(idx, "exh")
                            }
                          >
                            <div
                              className={`som-rect-status ${getRecipeStagedVal(idx, "exh", step.exh) ? "open" : "close"} som-editable ${stagedEdits[`master_recipe_step_${step.step}_exh`] !== undefined ? "som-edited-field" : ""}`}
                              style={getDeveloperStyle(`recipe_line_${selectedLine}_step_${step.step}_exh`, "VALVE")}
                            >
                              {getRecipeStagedVal(idx, "exh", step.exh) ? "OPEN" : "CLOSE"}
                            </div>
                          </td>
                          <td
                            onClick={
                              configMode
                                ? () => handleEquipmentClick(
                                  `recipe_line_${selectedLine}_step_${step.step}_con`,
                                  [],
                                  [{ key: "VALVE", label: `Line ${selectedLine} Step ${step.step} Condensate Valve` }]
                                )
                                : () => toggleField(idx, "con")
                            }
                          >
                            <div
                              className={`som-rect-status ${getRecipeStagedVal(idx, "con", step.con) ? "open" : "close"} som-editable ${stagedEdits[`master_recipe_step_${step.step}_con`] !== undefined ? "som-edited-field" : ""}`}
                              style={getDeveloperStyle(`recipe_line_${selectedLine}_step_${step.step}_con`, "VALVE")}
                            >
                              {getRecipeStagedVal(idx, "con", step.con) ? "OPEN" : "CLOSE"}
                            </div>
                          </td>
                          <td>
                            <ValBox
                              value={getRecipeStagedVal(idx, "bar", step.bar)} isEdited={stagedEdits[`master_recipe_step_${step.step}_press`] !== undefined}
                              decimals={1}
                              onClick={
                                configMode
                                  ? () => handleEquipmentClick(
                                    `recipe_line_${selectedLine}_step_${step.step}_press`,
                                    [],
                                    [{ key: "SETPOINT", label: `Line ${selectedLine} Step ${step.step} Press Setpoint` }]
                                  )
                                  : () => setActiveKeypad({
                                    section: "recipe",
                                    stepIdx: idx,
                                    param: "bar",
                                    label: `Step ${step.step} PRESS V (bar)`
                                  })
                              }
                              style={getDeveloperStyle(`recipe_line_${selectedLine}_step_${step.step}_press`, "SETPOINT")}
                            />
                          </td>
                          <td>
                            {configMode ? (
                              <div
                                className="som-recipe-select-tiny som-val-box--editable"
                                style={{ ...getDeveloperStyle(`recipe_line_${selectedLine}_step_${step.step}_mode`, "VALVE_MODE"), backgroundColor: stagedEdits[`master_recipe_step_${step.step}_mode`] !== undefined ? "#fef08a" : undefined,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: "850",
                                  fontSize: "8.5px",
                                  height: "18px",
                                }}
                                onClick={() => handleEquipmentClick(
                                  `recipe_line_${selectedLine}_step_${step.step}_mode`,
                                  [],
                                  [{ key: "VALVE_MODE", label: `Line ${selectedLine} Step ${step.step} Valve Mode` }]
                                )}
                              >
                                {getRecipeStagedVal(idx, "mode", step.mode) || "OFF"}
                              </div>
                            ) : (
                              <select
                                className={`som-recipe-select-tiny ${stagedEdits[`master_recipe_step_${step.step}_mode`] !== undefined ? "som-edited-field" : ""}`}
                                value={getRecipeStagedVal(idx, "mode", step.mode)}
                                onChange={(e) => updateStepField(idx, "mode", e.target.value)}
                              >
                                <option value="OFF">OFF</option>
                                <option value="LOW">LOW</option>
                                <option value="HIGH">HIGH</option>
                              </select>
                            )}
                          </td>
                          <td>
                            <ValBox
                              value={getRecipeStagedVal(idx, "unf", step.unf)} isEdited={stagedEdits[`master_recipe_step_${step.step}_unf`] !== undefined}
                              decimals={0}
                              onClick={
                                configMode
                                  ? () => handleEquipmentClick(
                                    `recipe_line_${selectedLine}_step_${step.step}_unf`,
                                    [],
                                    [{ key: "DURATION", label: `Line ${selectedLine} Step ${step.step} UNF Duration` }]
                                  )
                                  : () => setActiveKeypad({
                                    section: "recipe",
                                    stepIdx: idx,
                                    param: "unf",
                                    label: `Step ${step.step} UNF (s)`,
                                    unit: "s"
                                  })
                              }
                              style={getDeveloperStyle(`recipe_line_${selectedLine}_step_${step.step}_unf`, "DURATION")}
                            />
                          </td>
                          <td>
                            <ValBox
                              value={getRecipeStagedVal(idx, "nrm", step.nrm)} isEdited={stagedEdits[`master_recipe_step_${step.step}_nrm`] !== undefined}
                              decimals={0}
                              onClick={
                                configMode
                                  ? () => handleEquipmentClick(
                                    `recipe_line_${selectedLine}_step_${step.step}_nrm`,
                                    [],
                                    [{ key: "DURATION", label: `Line ${selectedLine} Step ${step.step} NRM Duration` }]
                                  )
                                  : () => setActiveKeypad({
                                    section: "recipe",
                                    stepIdx: idx,
                                    param: "nrm",
                                    label: `Step ${step.step} NRM (s)`,
                                    unit: "s"
                                  })
                              }
                              style={getDeveloperStyle(`recipe_line_${selectedLine}_step_${step.step}_nrm`, "DURATION")}
                            />
                          </td>
                          <td>
                            <ValBox
                              value={getRecipeStagedVal(idx, "wet", step.wet)} isEdited={stagedEdits[`master_recipe_step_${step.step}_wet`] !== undefined}
                              decimals={0}
                              onClick={
                                configMode
                                  ? () => handleEquipmentClick(
                                    `recipe_line_${selectedLine}_step_${step.step}_wet`,
                                    [],
                                    [{ key: "DURATION", label: `Line ${selectedLine} Step ${step.step} WET Duration` }]
                                  )
                                  : () => setActiveKeypad({
                                    section: "recipe",
                                    stepIdx: idx,
                                    param: "wet",
                                    label: `Step ${step.step} WET (s)`,
                                    unit: "s"
                                  })
                              }
                              style={getDeveloperStyle(`recipe_line_${selectedLine}_step_${step.step}_wet`, "DURATION")}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals displays */}
                <div className="som-totals-container">
                  <div className="som-total-item">
                    <span className="som-total-label">Total Sterilization Time (second)</span>
                    <div className="som-total-boxes">
                      <div className="som-total-box">
                        <span className="som-total-box-val">{totals.steril.unf}</span>
                        <span className="som-total-box-lbl">(Unfresh)</span>
                      </div>
                      <div className="som-total-box">
                        <span className="som-total-box-val">{totals.steril.nrm}</span>
                        <span className="som-total-box-lbl">(Normal)</span>
                      </div>
                      <div className="som-total-box">
                        <span className="som-total-box-val">{totals.steril.wet}</span>
                        <span className="som-total-box-lbl">(Wet)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Card 2 - Score Logics */}
          <div className="som-settings-col som-col-2" style={{ gap: "6px" }}>
            <div className="som-settings-card som-capacity-card" style={{ flex: 1 }}>
              <div className="som-settings-card-header">
                <span>STERILIZER SCORE LOGICS</span>
              </div>
              <div className="som-settings-card-body som-score-card-body">
                <div className="som-score-table-panel som-table-wrapper">
                  <table className="som-score-logics-table">
                    <thead>
                      <tr>
                        <th rowSpan="2">Step</th>
                        <th rowSpan="2">Function</th>
                        <th rowSpan="2">Target</th>
                        <th colSpan="2" style={{ padding: "0" }}>
                           <div style={{ display: "flex", justifyContent: "space-around", background: "#f1f5f9", padding: "4px" }}>
                             {[1,2,3,4].map(l => (
                                <button key={l} onClick={(e) => { e.stopPropagation(); setSelectedLine(l); }} style={{
                                   border: "none", background: selectedLine === l ? "#3b82f6" : "transparent",
                                   color: selectedLine === l ? "white" : "#475569", borderRadius: "4px", padding: "4px 12px", cursor: "pointer", fontSize: "11px", fontWeight: "bold"
                                }}>Line {l}</button>
                             ))}
                           </div>
                        </th>
                      </tr>
                      <tr>
                        <th style={{width: "20%"}}>Actual</th>
                        <th style={{width: "20%"}}>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scoreLogics.map((row, idx) => {
                        const isFfbStart = row.step === "FFB";
                        return (
                          <Fragment key={row.param || idx}>
                            {isFfbStart && (
                              <tr className="som-table-divider-row">
                                <td colSpan="5">GLOBAL PERFORMANCE METRICS</td>
                              </tr>
                            )}
                            <tr className={typeof row.step !== "number" ? "som-global-metric-row" : ""}>
                              <td className="som-n">{row.step}</td>
                              <td className="som-func-name">{row.function}</td>
                              <td>
                                <ValBox
                                  value={getStagedVal(`master_score_line_${selectedLine}_${row.param}_target`, (scoreLogicsCache[selectedLine] && scoreLogicsCache[selectedLine][idx] && scoreLogicsCache[selectedLine][idx].target !== undefined) ? scoreLogicsCache[selectedLine][idx].target : row.target)}
                                  isEdited={stagedEdits[`master_score_line_${selectedLine}_${row.param}_target`] !== undefined}
                                  decimals={row.decimals > 1 ? 1 : row.decimals}
                                  unit={row.unit}
                                  onClick={() => setActiveKeypad({
                                    section: "scoreLogic",
                                    idx: idx,
                                    paramKey: row.param,
                                    param: "target",
                                    label: `Target ${row.function}`,
                                    unit: row.unit
                                  })}
                                />
                              </td>
                              <td style={{ backgroundColor: "#f8fafc" }}>
                                {(() => {
                                  const key = `settings_score_logic_line_${selectedLine}_${row.param}_actual__ACTUAL`;
                                  const tagId = tagMap[key];
                                  const val = !tagId
                                    ? "No Tag"
                                    : (() => {
                                      const tagObj = availableTags.find((t) => String(t.id) === String(tagId));
                                      if (!tagObj) return "--";
                                      const tagData = tags[tagObj.tag_name];
                                      const liveVal = tagData ? tagData.value : undefined;
                                      return (liveVal === undefined || liveVal === null) ? "--" : liveVal;
                                    })();

                                  return (
                                    <ValBox
                                      value={val}
                                      decimals={row.decimals > 1 ? 1 : row.decimals}
                                      unit={["No Tag", "--"].includes(val) ? "" : row.unit}
                                      onClick={
                                        configMode
                                          ? () => handleEquipmentClick(
                                            `settings_score_logic_line_${selectedLine}_${row.param}_actual`,
                                            [],
                                            [{ key: "ACTUAL", label: `${row.function} Actual Value` }]
                                          )
                                          : null
                                      }
                                      style={getDeveloperStyle(`settings_score_logic_line_${selectedLine}_${row.param}_actual`, "ACTUAL")}
                                    />
                                  );
                                })()}
                              </td>
                              <td
                                className="som-score-cell"
                                style={{
                                  backgroundColor: "#f1f5f9"
                                }}
                              >
                                <span className="som-score-text">
                                  {(() => {
                                    // 1. Get Target Value
                                    const targetVal = getStagedVal(`master_score_line_${selectedLine}_${row.param}_target`, (scoreLogicsCache[selectedLine] && scoreLogicsCache[selectedLine][idx] && scoreLogicsCache[selectedLine][idx].target !== undefined) ? scoreLogicsCache[selectedLine][idx].target : row.target);
                                    
                                    // 2. Get Actual Value
                                    const actualKey = `settings_score_logic_line_${selectedLine}_${row.param}_actual__ACTUAL`;
                                    const actualTagId = tagMap[actualKey];
                                    let actualVal = 0;
                                    if (actualTagId) {
                                      const tagObj = availableTags.find((t) => String(t.id) === String(actualTagId));
                                      if (tagObj) {
                                        const liveVal = (tags[tagObj.tag_name] ? tags[tagObj.tag_name].value : undefined);
                                        if (liveVal !== undefined && liveVal !== null && liveVal !== "--") {
                                          actualVal = Number(liveVal);
                                        }
                                      }
                                    }

                                    // 3. Calculate Score
                                    let actualSafe = actualVal;
                                    if (Math.abs(actualSafe) < 0.001) actualSafe = 0;
                                    const computedScore = calculateScore(Number(targetVal) || 0, actualSafe, row.step);
                                    return `${computedScore}%`;
                                  })()}
                                </span>
                              </td>
                            </tr>
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Card 3 - Control Logics */}
          <div className="som-settings-col som-col-3">
            <div className="som-settings-card som-logic-card">
              <div className="som-settings-card-header">
                <span>CONTROL LOGICS</span>
              </div>
              <div className="som-settings-card-body som-logic-body">
                <div className="som-control-logics-layout">

                  {/* 1. General Settings */}
                  <div className="som-logic-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div className="som-logic-row">
                        <span className="som-logic-label">Safety Door</span>
                        <ValBox value={getStagedVal("safetyDoor", safetyDoor)} isEdited={stagedEdits["safetyDoor"] !== undefined} decimals={2} unit="bar"
                          onClick={configMode ? () => handleEquipmentClick("settings_logic_safety_door", [], [{ key: "SETPOINT", label: "Safety Door Pressure" }]) : () => setActiveKeypad({ section: "generalSettings", param: "safetyDoor", label: "Safety Door", unit: "bar" })}
                          style={getDeveloperStyle("settings_logic_safety_door", "SETPOINT")} />
                      </div>
                      <div className="som-logic-row">
                        <span className="som-logic-label">Auto Blowdown</span>
                        <ValBox value={getStagedVal("autoBlowdown", autoBlowdown)} isEdited={stagedEdits["autoBlowdown"] !== undefined} decimals={2} unit="bar"
                          onClick={configMode ? () => handleEquipmentClick("settings_logic_auto_blowdown", [], [{ key: "SETPOINT", label: "Auto Blowdown Pressure" }]) : () => setActiveKeypad({ section: "generalSettings", param: "autoBlowdown", label: "Auto Blowdown", unit: "bar" })}
                          style={getDeveloperStyle("settings_logic_auto_blowdown", "SETPOINT")} />
                      </div>
                    </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="som-logic-row">
                          <span className="som-logic-label">Holding Pressure</span>
                          <ValBox value={getStagedVal("holdingPressure", holdingPressure)} isEdited={stagedEdits["holdingPressure"] !== undefined} decimals={2} unit="bar"
                            onClick={configMode ? () => handleEquipmentClick("settings_logic_holding_pressure", [], [{ key: "SETPOINT", label: "Holding Pressure" }]) : () => setActiveKeypad({ section: "generalSettings", param: "holdingPressure", label: "Holding Pressure", unit: "bar" })}
                            style={getDeveloperStyle("settings_logic_holding_pressure", "SETPOINT")} />
                        </div>
                        <div className="som-logic-row">
                          <span className="som-logic-label">Start to Step Cycle</span>
                          <ValBox value={getStagedVal("startToStepCycle", startToStepCycle)} isEdited={stagedEdits["startToStepCycle"] !== undefined} decimals={0}
                            onClick={configMode ? () => handleEquipmentClick("settings_logic_start_to_step_cycle", [], [{ key: "STEP", label: "Start to Step Cycle" }]) : () => setActiveKeypad({ section: "generalSettings", param: "startToStepCycle", label: "Start to Step Cycle" })}
                            style={getDeveloperStyle("settings_logic_start_to_step_cycle", "STEP")} />
                        </div>
                        <div className="som-logic-row">
                          <span className="som-logic-label">Safety Pressure</span>
                          <ValBox value={getStagedVal(`tempOverride_pressureLimit_st1`, (tempOverride ? tempOverride.safetyPressure : undefined))} isEdited={stagedEdits[`tempOverride_pressureLimit_st1`] !== undefined} decimals={1} unit="bar"
                            onClick={configMode ? () => handleEquipmentClick(`settings_logic_temp_override_press_st1`, [], [{ key: "SETPOINT", label: `Safety Pressure` }]) : () => setActiveKeypad({ section: "tempOverride", param: "pressureLimit", label: `Safety Pressure`, unit: "bar" })}
                            style={getDeveloperStyle(`settings_logic_temp_override_press_st1`, "SETPOINT")} />
                        </div>
                      </div>
                    </div>

                  {/* 2. Sterilizer Sequencing */}
                  <div className="som-logic-section">
                    <h4 className="som-logic-section-title">Sterilizer Sequencing</h4>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div className="som-logic-row" style={{ flex: 1 }}>
                        <span className="som-logic-label">On Step</span>
                        <ValBox value={getStagedVal(`seqOnStep_st1`, sequencingOnStep)} isEdited={stagedEdits[`seqOnStep_st1`] !== undefined} decimals={0}
                          onClick={configMode ? () => handleEquipmentClick(`settings_logic_seq_on_step_st1`, [], [{ key: "STEP", label: `On Step` }]) : () => setActiveKeypad({ section: "sequencing", param: "onStep", label: `On Step` })}
                          style={getDeveloperStyle(`settings_logic_seq_on_step_st1`, "STEP")} />
                      </div>
                      <div className="som-logic-row" style={{ flex: 1 }}>
                        <span className="som-logic-label">Stop - Step</span>
                        <ValBox value={getStagedVal(`seqStopStep_st1`, sequencingStopStep)} isEdited={stagedEdits[`seqStopStep_st1`] !== undefined} decimals={0}
                          onClick={configMode ? () => handleEquipmentClick(`settings_logic_seq_stop_step_st1`, [], [{ key: "STEP", label: `Stop Step` }]) : () => setActiveKeypad({ section: "sequencing", param: "stopStep", label: `Stop Step` })}
                          style={getDeveloperStyle(`settings_logic_seq_stop_step_st1`, "STEP")} />
                      </div>
                    </div>
                  </div>

                  {/* 4. Temperature Overriding During Holding */}
                  <div className="som-logic-section">
                    <h4 className="som-logic-section-title">Temperature Overriding</h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Holding Step Row */}
                      <div className="som-logic-row flow-direction-row" style={{ paddingLeft: '8px', paddingRight: '8px' }}>
                        <span className="som-logic-label" style={{ minWidth: '120px' }}>Holding Step</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <ValBox value={getStagedVal(`tempOverride_holdingStepStart_st1`, (tempOverride ? tempOverride.holdingStepStart : undefined))} isEdited={stagedEdits[`tempOverride_holdingStepStart_st1`] !== undefined} decimals={0}
                              onClick={configMode ? () => handleEquipmentClick(`settings_logic_temp_override_hss_st1`, [], [{ key: "STEP", label: `Holding Step Start` }]) : () => setActiveKeypad({ section: "tempOverride", param: "holdingStepStart", label: `Holding Step Start` })}
                              style={getDeveloperStyle(`settings_logic_temp_override_hss_st1`, "STEP")} />
                          <span style={{ fontWeight: 'bold', color: '#475569' }}>-</span>
                          <ValBox value={getStagedVal(`tempOverride_holdingStepEnd_st1`, (tempOverride ? tempOverride.holdingStepEnd : undefined))} isEdited={stagedEdits[`tempOverride_holdingStepEnd_st1`] !== undefined} decimals={0}
                              onClick={configMode ? () => handleEquipmentClick(`settings_logic_temp_override_hse_st1`, [], [{ key: "STEP", label: `Holding Step End` }]) : () => setActiveKeypad({ section: "tempOverride", param: "holdingStepEnd", label: `Holding Step End` })}
                              style={getDeveloperStyle(`settings_logic_temp_override_hse_st1`, "STEP")} />
                        </div>
                      </div>

                      {/* Main Grid: Temps and Con Times */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'center', paddingLeft: '8px', paddingRight: '8px' }}>
                        
                        {/* Temps Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div className="som-logic-row flow-direction-row">
                            <span className="som-logic-label" style={{ minWidth: '120px' }}>Temp Idle</span>
                            <ValBox value={getStagedVal(`tempOverride_tempIdle_st1`, (tempOverride ? tempOverride.tempIdle : undefined))} isEdited={stagedEdits[`tempOverride_tempIdle_st1`] !== undefined} decimals={1} unit="°C"
                              onClick={configMode ? () => handleEquipmentClick(`settings_logic_temp_override_idle_st1`, [], [{ key: "SETPOINT", label: `Temp Idle` }]) : () => setActiveKeypad({ section: "tempOverride", param: "tempIdle", label: `Temp Idle`, unit: "°C" })}
                              style={getDeveloperStyle(`settings_logic_temp_override_idle_st1`, "SETPOINT")} />
                          </div>
                          <div className="som-logic-row flow-direction-row">
                            <span className="som-logic-label" style={{ minWidth: '120px' }}>Temp Low</span>
                            <ValBox value={getStagedVal(`tempOverride_tempLow_st1`, (tempOverride ? tempOverride.tempLow : undefined))} isEdited={stagedEdits[`tempOverride_tempLow_st1`] !== undefined} decimals={1} unit="°C"
                              onClick={configMode ? () => handleEquipmentClick(`settings_logic_temp_override_low_st1`, [], [{ key: "SETPOINT", label: `Temp Low` }]) : () => setActiveKeypad({ section: "tempOverride", param: "tempLow", label: `Temp Low`, unit: "°C" })}
                              style={getDeveloperStyle(`settings_logic_temp_override_low_st1`, "SETPOINT")} />
                          </div>
                        </div>

                        {/* Divider Line */}
                        <div style={{ width: '1px', backgroundColor: '#94a3b8', height: '100%' }}></div>

                        {/* CON Times Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div className="som-logic-row flow-direction-row">
                            <span className="som-logic-label" style={{ minWidth: '120px' }}>Time Open CON</span>
                            <ValBox value={getStagedVal(`tempOverride_timeOpenCon_st1`, (tempOverride ? tempOverride.timeOpenCon : undefined))} isEdited={stagedEdits[`tempOverride_timeOpenCon_st1`] !== undefined} decimals={0} unit="s"
                              onClick={configMode ? () => handleEquipmentClick(`settings_logic_temp_override_toc_st1`, [], [{ key: "DURATION", label: `Time Open CON` }]) : () => setActiveKeypad({ section: "tempOverride", param: "timeOpenCon", label: `Time Open CON`, unit: "s" })}
                              style={getDeveloperStyle(`settings_logic_temp_override_toc_st1`, "DURATION")} />
                          </div>
                          <div className="som-logic-row flow-direction-row">
                            <span className="som-logic-label" style={{ minWidth: '120px' }}>Time Close CON</span>
                            <ValBox value={getStagedVal(`tempOverride_timeCloseCon_st1`, (tempOverride ? tempOverride.timeCloseCon : undefined))} isEdited={stagedEdits[`tempOverride_timeCloseCon_st1`] !== undefined} decimals={0} unit="s"
                              onClick={configMode ? () => handleEquipmentClick(`settings_logic_temp_override_tcc_st1`, [], [{ key: "DURATION", label: `Time Close CON` }]) : () => setActiveKeypad({ section: "tempOverride", param: "timeCloseCon", label: `Time Close CON`, unit: "s" })}
                              style={getDeveloperStyle(`settings_logic_temp_override_tcc_st1`, "DURATION")} />
                          </div>
                        </div>

                      </div>

                      {/* High Temp Row */}
                      <div className="som-logic-row flow-direction-row" style={{ paddingLeft: '8px', paddingRight: '8px', marginTop: '8px' }}>
                        <span className="som-logic-label" style={{ minWidth: '120px' }}>High Temp</span>
                        <div style={{ backgroundColor: '#cbd5e1', padding: '2px', borderRadius: '4px', display: 'inline-block' }}>
                          <ValBox value={getStagedVal(`tempOverride_highTemp_st1`, (tempOverride ? tempOverride.highTemp : undefined))} isEdited={stagedEdits[`tempOverride_highTemp_st1`] !== undefined} decimals={1} unit="°C"
                            onClick={configMode ? () => handleEquipmentClick(`settings_logic_temp_override_temp_st1`, [], [{ key: "SETPOINT", label: `High Temp` }]) : () => setActiveKeypad({ section: "tempOverride", param: "highTemp", label: `High Temp`, unit: "°C" })}
                            style={getDeveloperStyle(`settings_logic_temp_override_temp_st1`, "SETPOINT")} />
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* 3. Analog Input Calibration */}
                  <div className="som-logic-section">
                    {/* (Analog Input Calibration migrated to Maintenance Menu) */}
                  </div>

                  {/* 5. Main Steam Overriding */}
                  <div className="som-logic-section">
                    <h4 className="som-logic-section-title">Main Steam Overriding</h4>
                    <div className="som-logic-row flow-direction-row">
                      <div className="som-row-left-aligned">
                        <span className="som-logic-label">Main Steam &lt;</span>
                        <ValBox value={getStagedVal("mainSteamMin", mainSteamMin)} isEdited={stagedEdits["mainSteamMin"] !== undefined} decimals={1} unit="Bar"
                          onClick={configMode ? () => handleEquipmentClick("settings_logic_main_steam_min", [], [{ key: "SETPOINT", label: "Main Steam Min" }]) : () => setActiveKeypad({ section: "mainSteam", param: "mainSteamMin", label: "Main Steam Min", unit: "Bar" })}
                          style={getDeveloperStyle("settings_logic_main_steam_min", "SETPOINT")} />
                      </div>
                      <span className="som-logic-result-label">&#10132; Make-up Valve CLOSE</span>
                    </div>
                  </div>

                  {/* 6. BPV Settings */}
                  <div className="som-logic-section">
                    <h4 className="som-logic-section-title">BPV SETTINGS</h4>
                    <div style={{ display: "flex", gap: "20px" }}>
                      <div style={{ flex: 1 }}>
                        <table className="som-bpv-settings-table">
                          <thead>
                            <tr>
                              <th colSpan={2} style={{ textAlign: "center", textTransform: "uppercase" }}>
                                MAKE-UP VALVE POSITION
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="som-logic-label" style={{ color: '#475569' }}>HIGH SET</td>
                              <td style={{ padding: '3px 6px' }}>
                                <ValBox value={getStagedVal("bpvNew_makeupHighSet", bpvNewSettings.makeupHighSet)} isEdited={stagedEdits["bpvNew_makeupHighSet"] !== undefined} decimals={2} unit="Bar"
                                  onClick={configMode ? () => handleEquipmentClick("settings_bpv_makeup_high_set", [], [{ key: "SETPOINT", label: "Make-up Valve High Set" }]) : () => setActiveKeypad({ section: "bpvNewSettings", param: "makeupHighSet", label: "Make-up Valve High Set", unit: "Bar" })}
                                  style={getDeveloperStyle("settings_bpv_makeup_high_set", "SETPOINT")} />
                              </td>
                            </tr>
                            <tr>
                              <td className="som-logic-label" style={{ color: '#475569' }}>LOW SET</td>
                              <td style={{ padding: '3px 6px' }}>
                                <ValBox value={getStagedVal("bpvNew_makeupLowSet", bpvNewSettings.makeupLowSet)} isEdited={stagedEdits["bpvNew_makeupLowSet"] !== undefined} decimals={2} unit="Bar"
                                  onClick={configMode ? () => handleEquipmentClick("settings_bpv_makeup_low_set", [], [{ key: "SETPOINT", label: "Make-up Valve Low Set" }]) : () => setActiveKeypad({ section: "bpvNewSettings", param: "makeupLowSet", label: "Make-up Valve Low Set", unit: "Bar" })}
                                  style={getDeveloperStyle("settings_bpv_makeup_low_set", "SETPOINT")} />
                              </td>
                            </tr>
                            <tr>
                              <td className="som-logic-label" style={{ color: '#475569' }}>POSITION</td>
                              <td style={{ padding: '3px 6px' }}>
                                <ValBox value={getStagedVal("bpvNew_makeupPosition", bpvNewSettings.makeupPosition)} isEdited={stagedEdits["bpvNew_makeupPosition"] !== undefined} decimals={0} unit="%"
                                  onClick={configMode ? () => handleEquipmentClick("settings_bpv_makeup_position", [], [{ key: "SETPOINT", label: "Make-up Valve Position" }]) : () => setActiveKeypad({ section: "bpvNewSettings", param: "makeupPosition", label: "Make-up Valve Position", unit: "%" })}
                                  style={getDeveloperStyle("settings_bpv_makeup_position", "SETPOINT")} />
                              </td>
                            </tr>
                            <tr>
                              <td className="som-logic-label" style={{ color: '#475569' }}>Limit High</td>
                              <td style={{ padding: '3px 6px' }}>
                                <ValBox value={getStagedVal("bpvNew_makeupLimitHigh", bpvNewSettings.makeupLimitHigh)} isEdited={stagedEdits["bpvNew_makeupLimitHigh"] !== undefined} decimals={0} unit="%"
                                  onClick={configMode ? () => handleEquipmentClick("settings_bpv_makeup_limit_high", [], [{ key: "SETPOINT", label: "Make-up Valve Limit High" }]) : () => setActiveKeypad({ section: "bpvNewSettings", param: "makeupLimitHigh", label: "Make-up Valve Limit High", unit: "%" })}
                                  style={getDeveloperStyle("settings_bpv_makeup_limit_high", "SETPOINT")} />
                              </td>
                            </tr>
                            <tr>
                              <td className="som-logic-label" style={{ color: '#475569' }}>Limit Low</td>
                              <td style={{ padding: '3px 6px' }}>
                                <ValBox value={getStagedVal("bpvNew_makeupLimitLow", bpvNewSettings.makeupLimitLow)} isEdited={stagedEdits["bpvNew_makeupLimitLow"] !== undefined} decimals={0} unit="%"
                                  onClick={configMode ? () => handleEquipmentClick("settings_bpv_makeup_limit_low", [], [{ key: "SETPOINT", label: "Make-up Valve Limit Low" }]) : () => setActiveKeypad({ section: "bpvNewSettings", param: "makeupLimitLow", label: "Make-up Valve Limit Low", unit: "%" })}
                                  style={getDeveloperStyle("settings_bpv_makeup_limit_low", "SETPOINT")} />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div style={{ flex: 1 }}>
                        <table className="som-bpv-settings-table">
                          <thead>
                            <tr>
                              <th colSpan={2} style={{ textAlign: "center", textTransform: "uppercase" }}>
                                SURPLUS VALVE POSITION
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="som-logic-label" style={{ color: '#475569' }}>HIGH SET</td>
                              <td style={{ padding: '3px 6px' }}>
                                <ValBox value={getStagedVal("bpvNew_surplusHighSet", bpvNewSettings.surplusHighSet)} isEdited={stagedEdits["bpvNew_surplusHighSet"] !== undefined} decimals={2} unit="Bar"
                                  onClick={configMode ? () => handleEquipmentClick("settings_bpv_surplus_high_set", [], [{ key: "SETPOINT", label: "Surplus Valve High Set" }]) : () => setActiveKeypad({ section: "bpvNewSettings", param: "surplusHighSet", label: "Surplus Valve High Set", unit: "Bar" })}
                                  style={getDeveloperStyle("settings_bpv_surplus_high_set", "SETPOINT")} />
                              </td>
                            </tr>
                            <tr>
                              <td className="som-logic-label" style={{ color: '#475569' }}>LOW SET</td>
                              <td style={{ padding: '3px 6px' }}>
                                <ValBox value={getStagedVal("bpvNew_surplusLowSet", bpvNewSettings.surplusLowSet)} isEdited={stagedEdits["bpvNew_surplusLowSet"] !== undefined} decimals={2} unit="Bar"
                                  onClick={configMode ? () => handleEquipmentClick("settings_bpv_surplus_low_set", [], [{ key: "SETPOINT", label: "Surplus Valve Low Set" }]) : () => setActiveKeypad({ section: "bpvNewSettings", param: "surplusLowSet", label: "Surplus Valve Low Set", unit: "Bar" })}
                                  style={getDeveloperStyle("settings_bpv_surplus_low_set", "SETPOINT")} />
                              </td>
                            </tr>
                            <tr>
                              <td className="som-logic-label" style={{ color: '#475569' }}>POSITION</td>
                              <td style={{ padding: '3px 6px' }}>
                                <ValBox value={getStagedVal("bpvNew_surplusPosition", bpvNewSettings.surplusPosition)} isEdited={stagedEdits["bpvNew_surplusPosition"] !== undefined} decimals={0} unit="%"
                                  onClick={configMode ? () => handleEquipmentClick("settings_bpv_surplus_position", [], [{ key: "SETPOINT", label: "Surplus Valve Position" }]) : () => setActiveKeypad({ section: "bpvNewSettings", param: "surplusPosition", label: "Surplus Valve Position", unit: "%" })}
                                  style={getDeveloperStyle("settings_bpv_surplus_position", "SETPOINT")} />
                              </td>
                            </tr>
                            <tr>
                              <td className="som-logic-label" style={{ color: '#475569' }}>Limit High</td>
                              <td style={{ padding: '3px 6px' }}>
                                <ValBox value={getStagedVal("bpvNew_surplusLimitHigh", bpvNewSettings.surplusLimitHigh)} isEdited={stagedEdits["bpvNew_surplusLimitHigh"] !== undefined} decimals={0} unit="%"
                                  onClick={configMode ? () => handleEquipmentClick("settings_bpv_surplus_limit_high", [], [{ key: "SETPOINT", label: "Surplus Valve Limit High" }]) : () => setActiveKeypad({ section: "bpvNewSettings", param: "surplusLimitHigh", label: "Surplus Valve Limit High", unit: "%" })}
                                  style={getDeveloperStyle("settings_bpv_surplus_limit_high", "SETPOINT")} />
                              </td>
                            </tr>
                            <tr>
                              <td className="som-logic-label" style={{ color: '#475569' }}>Limit Low</td>
                              <td style={{ padding: '3px 6px' }}>
                                <ValBox value={getStagedVal("bpvNew_surplusLimitLow", bpvNewSettings.surplusLimitLow)} isEdited={stagedEdits["bpvNew_surplusLimitLow"] !== undefined} decimals={0} unit="%"
                                  onClick={configMode ? () => handleEquipmentClick("settings_bpv_surplus_limit_low", [], [{ key: "SETPOINT", label: "Surplus Valve Limit Low" }]) : () => setActiveKeypad({ section: "bpvNewSettings", param: "surplusLimitLow", label: "Surplus Valve Limit Low", unit: "%" })}
                                  style={getDeveloperStyle("settings_bpv_surplus_limit_low", "SETPOINT")} />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* 7. BPV Analog Calibration */}
                  <div className="som-logic-section">
                    {/* (BPV Analog Calibration migrated to Maintenance Menu) */}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GLOBAL PARAMETERS Spanning Col 2 and 3 */}
          <div className="som-settings-card som-capacity-card" style={{ gridColumn: '2 / span 2', flexShrink: 0, height: "auto" }}>
            <div className="som-settings-card-header">
              <span>GLOBAL PARAMETERS</span>
            </div>
            <div className="som-settings-card-body som-score-card-body" style={{ minHeight: "auto" }}>
              {/* Bottom settings panels side-by-side */}
              <div className="som-score-bottom-panels" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', height: 'auto' }}>
                {/* Capacity Settings Group */}
                <div className="som-score-group-box">
                  <h4 className="som-score-group-title">Capacity Settings</h4>
                  <div className="som-capacity-row">
                    <span className="som-capacity-label">Sterilizer Design Cap.</span>
                    <ValBox
                      value={getStagedVal("designCapacity", designCapacity)}
                      isEdited={stagedEdits["designCapacity"] !== undefined}
                      decimals={0}
                      unit="ton"
                      onClick={
                        !configMode
                          ? () => setActiveKeypad({
                            section: "capacity",
                            param: "designCapacity",
                            label: "Sterilizer Design Capacity",
                            unit: "ton"
                          })
                          : null
                      }
                    />
                  </div>
                  <div className="som-capacity-row">
                    <span className="som-capacity-label">No. of Sterilizer</span>
                    <ValBox
                      value={getStagedVal("numberSterilizer", numberSterilizer)}
                      isEdited={stagedEdits["numberSterilizer"] !== undefined}
                      decimals={0}
                      unit="unit"
                      onClick={
                        !configMode
                          ? () => setActiveKeypad({
                            section: "capacity",
                            param: "numberSterilizer",
                            label: "Number of Sterilizer",
                            unit: "unit"
                          })
                          : null
                      }
                    />
                  </div>
                  <div className="som-capacity-row">
                    <span className="som-capacity-label">Mill Design Cap.</span>
                    <ValBox
                      value={getStagedVal("millDesignCapacity", millDesignCapacity)}
                      isEdited={stagedEdits["millDesignCapacity"] !== undefined}
                      decimals={1}
                      unit="mt/hr"
                      onClick={
                        !configMode
                          ? () => setActiveKeypad({
                            section: "capacity",
                            param: "millDesignCapacity",
                            label: "Mill Design Capacity",
                            unit: "mt/hr"
                          })
                          : null
                      }
                    />
                  </div>
                  <div className="som-capacity-row actual-row">
                    <span className="som-capacity-label font-bold">Actual Throughput</span>
                    <ValBox
                      value={actualThroughput}
                      decimals={0}
                      unit="mt/hr"
                      onClick={
                        configMode
                          ? () => handleEquipmentClick(
                            "settings_capacity_actual_throughput",
                            [],
                            [{ key: "ACTUAL_THROUGHPUT", label: "Actual Throughput" }]
                          )
                          : null
                      }
                      style={getDeveloperStyle("settings_capacity_actual_throughput", "ACTUAL_THROUGHPUT")}
                    />
                  </div>
                </div>

                {/* Score Telemetry Panel */}
                <div className="som-score-panel-card">
                  <h4 className="som-score-group-title">Score Performance</h4>
                  <div className="som-score-row">
                    <span className="som-score-label">Sterilization Score</span>
                    <span className="som-score-val">
                      {getComputedScoreForGlobal('target_ster_time', 'T_Ster')}%
                    </span>
                  </div>
                  <div className="som-score-row">
                    <span className="som-score-label">Lead time Score</span>
                    <span className="som-score-val">
                      {getComputedScoreForGlobal('target_cyc_time', 'T_Cyc')}%
                    </span>
                  </div>
                  <div className="som-score-row">
                    <span className="som-score-label">Throughput Score</span>
                    <span className="som-score-val">
                      {getComputedScoreForGlobal('throughput_rate', 'Tput')}%
                    </span>
                  </div>
                </div>

                {/* Over Limit Tolerances Group */}
                <div className="som-score-group-box">
                  <h4 className="som-score-group-title">Over Limit Tolerances</h4>
                  <div className="som-capacity-row">
                    <span className="som-capacity-label">Over Limit (Time)</span>
                    <ValBox
                      value={getStagedVal("overLimitTime", overLimitTime)}
                      isEdited={stagedEdits["overLimitTime"] !== undefined}
                      decimals={0}
                      unit="s"
                      onClick={
                        !configMode
                          ? () => setActiveKeypad({
                            section: "capacity",
                            param: "overLimitTime",
                            label: "Over Limit Tolerance (Time)",
                            unit: "s"
                          })
                          : null
                      }
                    />
                  </div>
                  <div className="som-capacity-row">
                    <span className="som-capacity-label">Over Limit (Score)</span>
                    <ValBox
                      value={getStagedVal("overLimitScore", overLimitScore)}
                      isEdited={stagedEdits["overLimitScore"] !== undefined}
                      decimals={0}
                      unit="%"
                      onClick={
                        !configMode
                          ? () => setActiveKeypad({
                            section: "capacity",
                            param: "overLimitScore",
                            label: "Over Limit Tolerance (Score)",
                            unit: "%"
                          })
                          : null
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Footer actions matching bottom row in image */}
        <footer className="som-settings-footer-actions">
          <div className="som-footer-left-group">
            <button className="som-footer-btn som-btn-save-settings" onClick={handleSave} disabled={isSaving}>
              <svg width="14" height="14" viewBox="0 0 448 512" fill="currentColor">
                <path d="M433.9 129.9l-83.9-83.9A47.9 47.9 0 0 0 316.1 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V195.9c0-12.7-5.1-25-14.1-34zM224 416c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64zm96-304.8V192H128V111.2h192z" />
              </svg>
              {isSaving ? "Saving..." : "Save Setting"}
            </button>
            <button className="som-footer-btn som-btn-cancel-settings" onClick={handleBackToOverview}>
              <svg width="14" height="14" viewBox="0 0 352 512" fill="currentColor">
                <path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.19 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.19 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z" />
              </svg>
              Cancel
            </button>
            <button className="som-footer-btn som-btn-restore-settings" onClick={handleRestoreDefault}>
              <svg width="14" height="14" viewBox="0 0 512 512" fill="currentColor">
                <path d="M485.5 285.5c-4.7-4.7-12.3-4.7-17 0L450 304c-35.3-35.3-84-56-138-56-106 0-192 86-192 192s86 192 192 192c82.3 0 152.9-52 179.9-125 2.7-7.4-1.1-15.5-8.5-18.2s-15.5 1.1-18.2 8.5C439 462.6 378.8 504 312 504c-88.4 0-160-71.6-160-160s71.6-160 160-160c45.1 0 85.8 18.7 115.3 48.7l-24.8 24.8c-4.7 4.7-4.7 12.3 0 17 4.7 4.7 12.3 4.7 17 0l46-46c4.7-4.7 4.7-12.3 0-17z" />
              </svg>
              Restore Default
            </button>
          </div>
          <div className="som-footer-right-group">
            <button className="som-footer-btn som-btn-export-settings" onClick={handleExport}>
              <svg width="14" height="14" viewBox="0 0 448 512" fill="currentColor">
                <path d="M384 128h-80V48c0-8.8-7.2-16-16-16h-128c-8.8 0-16 7.2-16 16v80H64c-35.3 0-64 28.7-64 64v224c0 35.3 28.7 64 64 64h320c35.3 0 64-28.7 64-64V192c0-35.3-28.7-64-64-64zm-144 240v64c0 8.8-7.2 16-16 16h-32c-8.8 0-16-7.2-16-16v-64h-64c-8.8 0-16-7.2-16-16v-32c0-8.8 7.2-16 16-16h64v-64c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v64h64c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16h-64z" />
              </svg>
              Export Setting
            </button>
            
          </div>
        </footer>
      </div>
      {/* Numeric Keypad */}
      {activeKeypad && (
        <NumericKeypad
          value={(() => {
            const kp = activeKeypad;
            if (kp.section === 'recipe') return currentLineSteps[kp.stepIdx][kp.param];
            if (kp.section === 'scoreLogic') {
              if (kp.paramKey) {
                const row = scoreLogics.find(r => r.param === kp.paramKey);
                return row ? row.target : 0;
              }
              return scoreLogics[kp.idx].target;
            }
            if (kp.section === 'capacity') {
              if (kp.param === 'designCapacity') return designCapacity;
              if (kp.param === 'numberSterilizer') return numberSterilizer;
              if (kp.param === 'millDesignCapacity') return millDesignCapacity;
              if (kp.param === 'overLimitTime') return overLimitTime;
              if (kp.param === 'overLimitScore') return overLimitScore;
            }
            if (kp.section === 'generalSettings') {
              if (kp.param === 'safetyDoor') return safetyDoor;
              if (kp.param === 'autoBlowdown') return autoBlowdown;
              if (kp.param === 'holdingPressure') return holdingPressure;
              if (kp.param === 'startToStepCycle') return startToStepCycle;
            }
            if (kp.section === 'sequencing') {
              const st = 1;
              if (kp.param === 'onStep') return sequencingOnStep;
              if (kp.param === 'stopStep') return sequencingStopStep;
            }
            if (kp.section === 'tempOverride') {
              if (kp.param === 'pressureLimit') return (tempOverride ? tempOverride.safetyPressure : undefined);
              if (kp.param === 'holdingStepStart') return (tempOverride ? tempOverride.holdingStepStart : undefined);
              if (kp.param === 'holdingStepEnd') return (tempOverride ? tempOverride.holdingStepEnd : undefined);
              if (kp.param === 'tempIdle') return (tempOverride ? tempOverride.tempIdle : undefined);
              if (kp.param === 'tempLow') return (tempOverride ? tempOverride.tempLow : undefined);
              if (kp.param === 'timeOpenCon') return (tempOverride ? tempOverride.timeOpenCon : undefined);
              if (kp.param === 'timeCloseCon') return (tempOverride ? tempOverride.timeCloseCon : undefined);
              if (kp.param === 'highTemp') return (tempOverride ? tempOverride.highTemp : undefined);
            }
            if (kp.section === 'analogCalib') {
              const { sterilizer: st, meas, field } = kp;
              return (analogCalib && analogCalib[st] && analogCalib[st][meas] && analogCalib[st][meas][field] !== undefined ? analogCalib[st][meas][field] : 0);
            }
            if (kp.section === 'bpvRow') return bpvSettings[kp.idx][kp.param];
            if (kp.section === 'bpvNewSettings') return bpvNewSettings[kp.param];
            if (kp.section === 'mainSteam') return mainSteamMin;
            if (kp.section === 'bpvAnalogCalib') {
              const { key: bKey, field } = kp;
              return (bpvAnalogCalib && bpvAnalogCalib[bKey] && bpvAnalogCalib[bKey][field] !== undefined ? bpvAnalogCalib[bKey][field] : 0);
            }
            return 0;
          })()}
          label={activeKeypad.label}
          unit={activeKeypad.unit || ''}
          onClose={() => setActiveKeypad(null)}
          onConfirm={handleKeypadConfirm}
        />
      )}
    </section>
  );
}

// ==========================================
// Numeric Keypad Component
// ==========================================
function NumericKeypad({ value, onConfirm, onClose, label, unit }) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (typeof value === 'number') {
      return Number.isInteger(value) ? value.toString() : value.toFixed(1);
    }
    return '0';
  });

  const handleNumber = (n) => {
    setDisplayValue(prev => (prev === '0' ? n.toString() : prev + n.toString()));
  };
  const handleDecimal = () => { if (!displayValue.includes('.')) setDisplayValue(displayValue + '.'); };
  const handleBack = () => setDisplayValue(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  const handleEnter = useCallback(() => onConfirm(parseFloat(displayValue) || 0), [displayValue, onConfirm]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleNumber(parseInt(e.key));
      } else if (e.key === '.') {
        e.preventDefault();
        handleDecimal();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBack();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleEnter();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayValue, onConfirm, onClose]);

  const btnStyle = { padding: '14px', fontSize: '18px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' };

  return createPortal(
    <div className="som-numeric-keypad-backdrop" onClick={onClose}>
      <div className="som-numeric-keypad" onClick={e => e.stopPropagation()}>
        <div className="som-numeric-keypad-header">
          <span className="som-numeric-keypad-label">{label}</span>
          <button style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }} onClick={onClose}>✕</button>
        </div>
        <div className="som-numeric-keypad-display">
          <span className="som-numeric-keypad-value">{displayValue}</span>
          {unit && <span className="som-numeric-keypad-unit">{unit}</span>}
        </div>
        <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(n => (
            <button type="button" key={n} onClick={() => handleNumber(n)} style={btnStyle}>{n}</button>
          ))}
          <button type="button" onClick={handleDecimal} style={btnStyle}>.</button>
          <button type="button" onClick={() => handleNumber(0)} style={btnStyle}>0</button>
          <button type="button" onClick={handleBack} style={{ ...btnStyle, background: '#f1f5f9' }}>⌫</button>
          <button type="button" onClick={() => setDisplayValue('0')} style={{ gridColumn: 'span 1', padding: '12px', background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>CLEAR</button>
          <button type="button" onClick={handleEnter} style={{ gridColumn: 'span 2', padding: '12px', background: '#F59E0B', border: 'none', color: 'white', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>ENTER</button>
        </div>
      </div>
    </div>,
    document.body
  );
}


// Calculations helper
function getTotals(localRecipes, lineNum) {
  const lineSteps = localRecipes[lineNum] || [];
  let unfSter = 0, nrmSter = 0, wetSter = 0;
  let unfCycle = 0, nrmCycle = 0, wetCycle = 0;

  lineSteps.forEach((s, idx) => {
    const unf = Number(s.unf) || 0;
    const nrm = Number(s.nrm) || 0;
    const wet = Number(s.wet) || 0;

    unfCycle += unf;
    nrmCycle += nrm;
    wetCycle += wet;

    if (idx < lineSteps.length - 1) {
      unfSter += unf;
      nrmSter += nrm;
      wetSter += wet;
    }
  });

  return {
    steril: { unf: Math.round(unfSter), nrm: Math.round(nrmSter), wet: Math.round(wetSter) },
    cycle: { unf: Math.round(unfCycle), nrm: Math.round(nrmCycle), wet: Math.round(wetCycle) }
  };
}
