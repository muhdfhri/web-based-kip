import React, { useState, useEffect, useMemo } from 'react';
import './CstAutoSkimmerModal.css';

// Import multi-layer graphic assets
import cstTankBg from './assets/cst-tank.svg';
import doubleFloatingRods from './assets/double-floating.svg';
import floatBall from './assets/float-ball.svg';
import skimmerFunnelAssembly from './assets/skimmer_funnel_assembly.svg';
// import cstTopFrameRail from './assets/cst_top_frame_rail.svg';
import cstCpoLayer from './assets/cst_cpo_layer.gif';
import cstWaterLayer from './assets/cst_water_layer.gif';
import cstSludgeLayer from './assets/cst_sludge_layer.gif';

/**
 * Utility clamp helper
 */
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

/**
 * Safe numeric parser helper for PLC tags
 */
const parsePlcVal = (rawVal, defaultVal = null) => {
  if (rawVal === undefined || rawVal === null || rawVal === 'no tag' || rawVal === '--' || rawVal === '') {
    return defaultVal;
  }
  const parsed = parseFloat(rawVal);
  return isNaN(parsed) ? defaultVal : parsed;
};

/**
 * Normalization pipeline for PLC Telemetry / Demo Data
 * Converts raw plcData or simulated inputs into a validated, normalized Telemetry Object.
 */
const normalizeSkimmerTelemetry = (plcData = {}, isDemoMode = false, simStep = 0) => {
  // Configurable fallback setpoint if not provided by PLC
  const defaultSetpoint = 300; // mm

  if (isDemoMode) {
    const radians = (simStep * Math.PI) / 180;
    // Physical level simulation in mm (Scale 0 to 2000 mm)
    // Smooth sinusoidal movement for dynamic preview
    const floatAMm = Math.round(1400 + 120 * Math.sin(radians * 0.8));
    const floatBMm = Math.round(950 + 80 * Math.cos(radians * 0.8));
    const sludgeMm = Math.round(380 + 50 * Math.sin(radians * 0.5));
    const oilThicknessMm = Math.max(0, floatAMm - floatBMm);
    
    // Target position for Funnel/Actuator (mapped to Float A surface level %: 2000mm = 0%, 0mm = 100%)
    const targetPosPct = Math.round(clamp((1 - floatAMm / 2000) * 100, 0, 100));

    // Simulate real actuator movement lag/transition towards target position
    // Actuator lowers when skimming active (oilThickness >= setpoint)
    const isSkimming = oilThicknessMm >= defaultSetpoint;
    const actuatorDirection = isSkimming ? 'LOWERING' : 'HOLDING';
    
    // In demo mode, simulate actuator smoothly moving near target position
    const actuatorPosPct = Math.round(clamp(targetPosPct + 5 * Math.sin(radians * 1.2), 0, 100));

    return {
      isDemoMode: true,
      mode: 'AUTO',
      systemStatus: 'RUNNING',
      emergencyStatus: false,
      motorStatus: 'RUNNING',
      faultStatus: false,

      floatA: {
        levelMm: floatAMm,
        valid: true,
        status: 'OK'
      },

      floatB: {
        levelMm: floatBMm,
        valid: true,
        status: 'OK'
      },

      sludge: {
        levelMm: sludgeMm,
        valid: true,
        status: 'OK'
      },

      oilLayerThicknessMm: oilThicknessMm,
      oilThicknessSetpointMm: defaultSetpoint,
      anomalyDetected: floatAMm < floatBMm,

      actuator: {
        positionPct: actuatorPosPct,
        targetPositionPct: targetPosPct,
        direction: actuatorDirection,
        status: isSkimming ? 'ACTUATOR LOWERING' : 'HOLDING POSITION',
        valid: true,
        fault: false
      },

      skimmingProcessStatus: isSkimming ? 'SKIMMING' : 'STANDBY',

      temperature: {
        pv: 90.5 + Math.sin(radians) * 0.5,
        sp: 90.0,
        valid: true
      },

      steam: {
        valvePct: 45,
        status: 'OPEN'
      },

      outputs: {
        potTank: 'NORMAL',
        sludgeTank: 'NORMAL',
        condensate: 'DRAINING'
      }
    };
  }

  // --- LIVE MODE DATA EXTRACTION ---
  const rawFloatA = plcData.float_a ?? plcData.floatA ?? plcData.surface_level;
  const rawFloatB = plcData.float_b ?? plcData.floatB ?? plcData.interface_level;
  const rawSludge = plcData.sludge_level ?? plcData.sludgeLevel;
  const rawActPos = plcData.skimmer_pos ?? plcData.actuator_pos ?? plcData.actuatorPosition;
  const rawTempPv = plcData.temp ?? plcData.temperature_pv ?? plcData.tempPv;
  const rawTempSp = plcData.temp_sp ?? plcData.temperature_sp ?? plcData.tempSp;
  const rawSteamValve = plcData.steam_valve ?? plcData.steamValve;
  const rawThicknessSp = plcData.oil_thickness_sp ?? plcData.oilThicknessSp;

  // System States
  const mode = String(plcData.mode ?? plcData.system_mode ?? 'AUTO').toUpperCase();
  const systemStatus = String(plcData.status ?? plcData.system_status ?? (plcData.isRunning === false ? 'STOPPED' : 'RUNNING')).toUpperCase();
  const emergencyStatus = Boolean(plcData.emergency ?? plcData.emergency_stop ?? plcData.isEmergency ?? false);
  const motorStatus = String(plcData.motor_status ?? plcData.motorStatus ?? 'RUNNING').toUpperCase();
  const faultStatus = Boolean(plcData.fault ?? plcData.fault_status ?? plcData.isFault ?? false);

  // Sensor Valids
  const floatANum = parsePlcVal(rawFloatA, null);
  const floatBNum = parsePlcVal(rawFloatB, null);
  const sludgeNum = parsePlcVal(rawSludge, null);

  const floatAValid = floatANum !== null && floatANum >= 0 && floatANum <= 3000;
  const floatBValid = floatBNum !== null && floatBNum >= 0 && floatBNum <= 3000;
  const sludgeValid = sludgeNum !== null && sludgeNum >= 0 && sludgeNum <= 3000;

  // Oil Layer Calculation
  let oilLayerThicknessMm = 0;
  let anomalyDetected = false;

  if (floatAValid && floatBValid) {
    if (floatANum < floatBNum) {
      anomalyDetected = true;
      oilLayerThicknessMm = 0; // Display clamp to 0 for UI, but mark anomaly
    } else {
      oilLayerThicknessMm = floatANum - floatBNum;
    }
  }

  const setpointMm = parsePlcVal(rawThicknessSp, defaultSetpoint);

  // Actuator Telemetry
  const actPosNum = parsePlcVal(rawActPos, 0);
  const actPosValid = actPosNum !== null && actPosNum >= 0 && actPosNum <= 100;
  const actuatorFault = Boolean(plcData.actuator_fault ?? plcData.actuatorFault ?? false);
  const actuatorDirection = String(plcData.actuator_dir ?? plcData.actuatorDirection ?? 'HOLDING').toUpperCase();

  // Process Status (Explicit separation from actuator movement)
  const isPlcSkimming = plcData.is_skimming ?? plcData.isSkimming;
  let skimmingProcessStatus = 'STANDBY';
  if (emergencyStatus) {
    skimmingProcessStatus = 'EMERGENCY STOP';
  } else if (faultStatus || actuatorFault) {
    skimmingProcessStatus = 'FAULT';
  } else if (isPlcSkimming !== undefined) {
    skimmingProcessStatus = isPlcSkimming ? 'SKIMMING' : 'STANDBY';
  } else if (floatAValid && floatBValid) {
    skimmingProcessStatus = oilLayerThicknessMm >= setpointMm ? 'SKIMMING' : 'STANDBY';
  } else {
    skimmingProcessStatus = 'SENSOR FAULT';
  }

  // Actuator Status Text
  let actuatorStatusText = 'HOLDING POSITION';
  if (actuatorFault) {
    actuatorStatusText = 'ACTUATOR FAULT';
  } else if (actuatorDirection === 'LOWERING') {
    actuatorStatusText = 'ACTUATOR LOWERING';
  } else if (actuatorDirection === 'RAISING') {
    actuatorStatusText = 'ACTUATOR RAISING';
  } else if (skimmingProcessStatus === 'SKIMMING') {
    actuatorStatusText = 'SKIMMING ACTIVE';
  }

  // Temperature
  const tempPvNum = parsePlcVal(rawTempPv, null);
  const tempSpNum = parsePlcVal(rawTempSp, 90.0);

  // Steam
  const steamValveNum = parsePlcVal(rawSteamValve, 0);

  return {
    isDemoMode: false,
    mode,
    systemStatus,
    emergencyStatus,
    motorStatus,
    faultStatus,

    floatA: {
      levelMm: floatANum,
      valid: floatAValid,
      status: floatAValid ? 'OK' : 'SENSOR FAULT'
    },

    floatB: {
      levelMm: floatBNum,
      valid: floatBValid,
      status: floatBValid ? 'OK' : 'SENSOR FAULT'
    },

    sludge: {
      levelMm: sludgeNum,
      valid: sludgeValid,
      status: sludgeValid ? 'OK' : 'NO SENSOR'
    },

    oilLayerThicknessMm,
    oilThicknessSetpointMm: setpointMm,
    anomalyDetected,

    actuator: {
      positionPct: actPosValid ? actPosNum : 0,
      direction: actuatorDirection,
      status: actuatorStatusText,
      valid: actPosValid,
      fault: actuatorFault
    },

    skimmingProcessStatus,

    temperature: {
      pv: tempPvNum,
      sp: tempSpNum,
      valid: tempPvNum !== null
    },

    steam: {
      valvePct: steamValveNum,
      status: steamValveNum > 0 ? 'OPEN' : 'CLOSED'
    },

    outputs: {
      potTank: String(plcData.pot_tank_status ?? plcData.potTankStatus ?? 'NORMAL').toUpperCase(),
      sludgeTank: String(plcData.sludge_tank_status ?? plcData.sludgeTankStatus ?? 'NORMAL').toUpperCase(),
      condensate: String(plcData.condensate_status ?? plcData.condensateStatus ?? 'NORMAL').toUpperCase()
    }
  };
};

/**
 * CstAutoSkimmerModal Component
 * Real-time CST Automatic Oil Skimmer Web HMI Digital Representation
 */
const CstAutoSkimmerModal = ({ isOpen, onClose, tankNumber = 1, plcData = {} }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [simStep, setSimStep] = useState(0);

  // Continuous loop timer strictly reserved for DEMO MODE preview
  useEffect(() => {
    if (!isOpen || !isDemoMode) return;
    const simInterval = setInterval(() => {
      setSimStep((prev) => (prev + 1) % 360);
    }, 100);

    return () => clearInterval(simInterval);
  }, [isOpen, isDemoMode]);

  // Derived normalized telemetry object
  const telemetry = useMemo(() => {
    return normalizeSkimmerTelemetry(plcData, isDemoMode, simStep);
  }, [plcData, isDemoMode, simStep]);

  if (!isOpen) return null;

  // Visual tank Y-mapping based on actual mm levels (Scale 0 to 2000 mm)
  // Tank height viewport Y range: -140px (2000mm top level) to +140px (0mm bottom level)
  const mapLevelToY = (levelMm) => {
    if (levelMm === null || levelMm === undefined) return 0;
    const clampedLevel = clamp(levelMm, 0, 2000);
    return 140 - (clampedLevel / 2000) * 280;
  };

  // Float A (Surface Level CPO): exact Y matching Float A level mm
  const floatATravelY = telemetry.floatA.valid ? mapLevelToY(telemetry.floatA.levelMm) : 0;
  
  // Float B (Interface Level CPO/Water): exact Y matching Float B level mm
  const floatBTravelY = telemetry.floatB.valid ? mapLevelToY(telemetry.floatB.levelMm) : 40;

  // Actuator & Skimmer Funnel Y-mapping:
  // Position 0% = Actuator Retracted / Top Position (-140px)
  // Position 100% = Actuator Extended / Bottom Position (+140px)
  const mapActuatorToY = (posPct) => {
    const clampedPos = clamp(posPct ?? 0, 0, 100);
    return -140 + (clampedPos / 100) * 280;
  };

  const actualActuatorY = mapActuatorToY(telemetry.actuator.positionPct);
  const skimmerTravelY = telemetry.actuator.valid ? actualActuatorY : floatATravelY;

  // Dynamic Synchronization:
  // CPO Layer height dynamically mirrors the Skimmer Funnel / Float A position
  let cpoHeightPct = 30;
  let waterHeightPct = 15;
  let sludgeHeightPct = 50;

  if (telemetry.floatA.valid) {
    // Sinkronisasi tinggi CPO Layer langsung mengikuti pergerakan skimmerTravelY / Float A
    const surfacePct = clamp(((skimmerTravelY + 140) / 280) * 100, 10, 60);
    cpoHeightPct = clamp(20 + surfacePct * 0.3, 18, 48);
    
    if (telemetry.sludge.valid) {
      waterHeightPct = 15;
      sludgeHeightPct = clamp(100 - cpoHeightPct - waterHeightPct, 35, 65);
    } else {
      waterHeightPct = 15;
      sludgeHeightPct = clamp(100 - cpoHeightPct - waterHeightPct, 35, 65);
    }
  }

  return (
    <div className="auto-skimmer-modal-overlay" onClick={onClose}>
      <div className="auto-skimmer-modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="auto-skimmer-modal-header">
          <div className="auto-skimmer-modal-title">
            <div>
              <h2>CST AUTOMATIC OIL SKIMMER — TANK NO. {tankNumber}</h2>
              <span className="auto-skimmer-subtitle">Linear Actuator Telemetry & Industrial HMI Interface</span>
            </div>
          </div>

          <div className="header-actions">
            {/* Live Mode vs Demo Mode Selector */}
            <div className="mode-toggle-group">
              <button
                type="button"
                className={`mode-btn ${!isDemoMode ? 'active live' : ''}`}
                onClick={() => setIsDemoMode(false)}
              >
                LIVE PLC MODE
              </button>
              <button
                type="button"
                className={`mode-btn ${isDemoMode ? 'active demo' : ''}`}
                onClick={() => setIsDemoMode(true)}
              >
                DEMO PREVIEW
              </button>
            </div>
            <button className="auto-skimmer-modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Emergency / Sensor Anomaly Banner */}
        {telemetry.emergencyStatus && (
          <div className="system-alert-banner emergency">
            ⚠️ EMERGENCY STOP ACTIVE — ALL ACTUATORS & PUMPS HALTED
          </div>
        )}
        {telemetry.faultStatus && !telemetry.emergencyStatus && (
          <div className="system-alert-banner fault">
            ⚠️ SYSTEM FAULT DETECTED — CHECK PLC DIAGNOSTICS
          </div>
        )}
        {telemetry.anomalyDetected && (
          <div className="system-alert-banner anomaly">
            ⚠️ SENSOR ANOMALY: FLOAT A LEVEL ({telemetry.floatA.levelMm}mm) IS LOWER THAN FLOAT B ({telemetry.floatB.levelMm}mm)
          </div>
        )}

        {/* Body */}
        <div className="auto-skimmer-modal-body">
          
          {/* Left Column: CST Tank Graphic Assembly */}
          <div className="cst-skimmer-visual-wrapper">
            
            <div className="cst-tank-assembly-viewport">
              
              {/* Layer 1: Background Tank Body */}
              <img 
                src={cstTankBg} 
                alt="CST Tank Background" 
                className="cst-layer-asset layer-tank-bg" 
              />

              {/* Layer 2: Fluids Stack (CPO, Water, Sludge) */}
              <div className="cst-fluids-stack">
                <div 
                  className="cst-fluid-layer cpo-layer"
                  style={{ height: `${cpoHeightPct}%`, transition: 'height 0.4s ease' }}
                >
                  <img src={cstCpoLayer} alt="CPO Layer" />
                  <span className="fluid-tag cpo-tag">CPO LAYER</span>
                </div>
                <div 
                  className="cst-fluid-layer water-layer"
                  style={{ height: `${waterHeightPct}%`, transition: 'height 0.4s ease' }}
                >
                  <img src={cstWaterLayer} alt="Water Layer" />
                  <span className="fluid-tag water-tag">WATER INTERFACE</span>
                </div>
                <div 
                  className="cst-fluid-layer sludge-layer"
                  style={{ height: `${sludgeHeightPct}%`, transition: 'height 0.4s ease' }}
                >
                  <img src={cstSludgeLayer} alt="Sludge Layer" />
                  <span className="fluid-tag sludge-tag">HEAVY SLUDGE</span>
                </div>
              </div>

              {/* Layer 3: Double Floating Guide Rod (Left Side) */}
              <img 
                src={doubleFloatingRods} 
                alt="Double Floating Sensor Guide Rod" 
                className="cst-layer-asset layer-sensor-rods" 
              />

              {/* Float A Ball (Top Float - Surface Level CPO) */}
              {telemetry.floatA.valid ? (
                <img 
                  src={floatBall} 
                  alt="Float A Ball (Surface)" 
                  className="cst-layer-asset layer-float-ball float-a"
                  style={{ 
                    transform: `translate(var(--float-a-offset-x, 0px), calc(${floatATravelY}px + var(--float-a-offset-y, 0px))) scale(var(--float-a-scale, 1.0))` 
                  }} 
                />
              ) : (
                <div className="sensor-fault-indicator float-a-fault">FLOAT A FAULT</div>
              )}

              {/* Float B Ball (Bottom Float - Interface Level Water) */}
              {telemetry.floatB.valid ? (
                <img 
                  src={floatBall} 
                  alt="Float B Ball (Interface)" 
                  className="cst-layer-asset layer-float-ball float-b"
                  style={{ 
                    transform: `translate(var(--float-b-offset-x, 0px), calc(${floatBTravelY}px + var(--float-b-offset-y, 0px))) scale(var(--float-b-scale, 1.0))` 
                  }} 
                />
              ) : (
                <div className="sensor-fault-indicator float-b-fault">FLOAT B FAULT</div>
              )}

              {/* Moving Skimmer Funnel Assembly */}
              <img 
                src={skimmerFunnelAssembly} 
                alt="Skimmer Funnel Assembly" 
                className={`cst-layer-asset layer-skimmer-funnel ${(telemetry.actuator.direction || 'holding').toLowerCase()}`}
                style={{ 
                  transform: `translate(var(--funnel-offset-x, 0px), calc(${skimmerTravelY}px + var(--funnel-offset-y, 0px))) scale(var(--funnel-scale, 1.0))` 
                }} 
              />

              {/* Top Frame & Guardrail */}
              {/* <img 
                src={cstTopFrameRail} 
                alt="CST Top Frame" 
                className="cst-layer-asset layer-top-frame" 
              /> */}

            </div>

            {/* Live Telemetry Badge below Visualizer */}
            <div className="skimmer-position-badge">
              <span className={`status-indicator-lamp ${telemetry.skimmingProcessStatus === 'SKIMMING' ? 'active' : 'idle'}`} />
              SKIMMER ACTUATOR: {telemetry.actuator.valid ? `${telemetry.actuator.positionPct}%` : '--'} ({telemetry.actuator.status})
            </div>

          </div>

          {/* Right Column: Industrial SCADA Telemetry Panel */}
          <div className="scada-telemetry-panel">
            
            {/* 1. System & Process Status Card */}
            <div className={`scada-card focal-status-card ${telemetry.skimmingProcessStatus === 'SKIMMING' ? 'active-glow' : ''}`}>
              <div className="indicator-header">
                <div className="card-subtitle-group">
                  <span className={`live-pulse-dot ${isDemoMode ? 'demo-dot' : ''}`} />
                  <span className="card-subtitle">
                    SYSTEM STATUS — {telemetry.mode} ({isDemoMode ? 'DEMO MODE' : 'LIVE PLC'})
                  </span>
                </div>
                <span className={`status-pill ${telemetry.skimmingProcessStatus === 'SKIMMING' ? 'active' : 'idle'}`}>
                  {telemetry.skimmingProcessStatus}
                </span>
              </div>

              <div className="indicator-status-row">
                <div className={`indicator-lamp-3d ${
                  telemetry.emergencyStatus ? 'emergency-red' :
                  telemetry.faultStatus ? 'fault-yellow' :
                  telemetry.skimmingProcessStatus === 'SKIMMING' ? 'glowing-green' : 'idle-grey'
                }`}>
                  <div className="lamp-bezel" />
                </div>
                <div className="indicator-status-info">
                  <span className="indicator-title">
                    {telemetry.emergencyStatus ? 'EMERGENCY SHUTDOWN' :
                     telemetry.faultStatus ? 'SYSTEM FAULT ACTIVE' :
                     telemetry.skimmingProcessStatus === 'SKIMMING' ? 'SKIMMING CPO IN PROGRESS' :
                     'SKIMMER IN STANDBY / HOLD'}
                  </span>
                  <span className="indicator-desc">
                    {telemetry.emergencyStatus ? 'E-Stop triggered by operator or safety relay.' :
                     telemetry.skimmingProcessStatus === 'SKIMMING' 
                       ? `Oil thickness (${telemetry.oilLayerThicknessMm}mm) >= Setpoint (${telemetry.oilThicknessSetpointMm}mm)`
                       : `Oil thickness below setpoint (${telemetry.oilThicknessSetpointMm}mm) — Holding position`}
                  </span>
                </div>
              </div>

              {/* Oil Thickness Focal Box */}
              <div className={`disch-focal-box ${telemetry.skimmingProcessStatus === 'SKIMMING' ? 'discharging' : ''}`}>
                <div className="focal-box-header">
                  <span className="focal-label">OIL LAYER THICKNESS (FLOAT A - FLOAT B)</span>
                  <span className="focal-value">
                    {telemetry.floatA.valid && telemetry.floatB.valid ? telemetry.oilLayerThicknessMm : '--'}{' '}
                    <small>mm</small>
                  </span>
                </div>
                <div className="focal-progress-track">
                  <div 
                    className={`focal-progress-bar ${telemetry.skimmingProcessStatus === 'SKIMMING' ? 'active-amber' : 'idle-grey'}`}
                    style={{ 
                      width: `${Math.min(100, (telemetry.oilLayerThicknessMm / (telemetry.oilThicknessSetpointMm * 2 || 600)) * 100)}%` 
                    }}
                  />
                </div>
                <div className="focal-footer-info">
                  <span>SETPOINT: {telemetry.oilThicknessSetpointMm} mm</span>
                  <span>{telemetry.anomalyDetected ? '⚠️ SENSOR ANOMALY' : 'NORMAL RANGE'}</span>
                </div>
              </div>
            </div>

            {/* 2. Sensor Level & Actuator Telemetry */}
            <div className="scada-card operational-telemetry-card">
              <div className="card-header-row">
                <h4 className="card-title">SENSOR TELEMETRY & ACTUATOR POSITION</h4>
              </div>

              <div className="scada-metrics-grid">
                
                {/* Float A Level */}
                <div className="scada-metric-tile">
                  <div className="tile-header">
                    <span className="tile-label">FLOAT A (SURFACE LEVEL)</span>
                    <span className={`tile-tag ${telemetry.floatA.valid ? 'ok' : 'err'}`}>
                      {telemetry.floatA.status}
                    </span>
                  </div>
                  <div className="tile-body">
                    <span className="tile-value blue">
                      {telemetry.floatA.valid ? telemetry.floatA.levelMm : '--'} <small>mm</small>
                    </span>
                  </div>
                  <div className="tile-track">
                    <div 
                      className="tile-bar blue"
                      style={{ width: `${telemetry.floatA.valid ? Math.min(100, (telemetry.floatA.levelMm / 2000) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                {/* Float B Level */}
                <div className="scada-metric-tile">
                  <div className="tile-header">
                    <span className="tile-label">FLOAT B (INTERFACE LEVEL)</span>
                    <span className={`tile-tag ${telemetry.floatB.valid ? 'ok' : 'err'}`}>
                      {telemetry.floatB.status}
                    </span>
                  </div>
                  <div className="tile-body">
                    <span className="tile-value teal">
                      {telemetry.floatB.valid ? telemetry.floatB.levelMm : '--'} <small>mm</small>
                    </span>
                  </div>
                  <div className="tile-track">
                    <div 
                      className="tile-bar teal"
                      style={{ width: `${telemetry.floatB.valid ? Math.min(100, (telemetry.floatB.levelMm / 2000) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                {/* Linear Actuator Position */}
                <div className="scada-metric-tile full-width">
                  <div className="tile-header">
                    <span className="tile-label">LINEAR ACTUATOR POSITION</span>
                    <span className="tile-sub-info">DIR: {telemetry.actuator.direction}</span>
                  </div>
                  <div className="tile-body">
                    <span className="tile-value orange">
                      {telemetry.actuator.valid ? telemetry.actuator.positionPct : '--'} <small>%</small>
                    </span>
                  </div>
                  <div className="tile-track">
                    <div 
                      className="tile-bar orange"
                      style={{ width: `${telemetry.actuator.valid ? telemetry.actuator.positionPct : 0}%` }}
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* 3. Process Temperature & Auxiliary Control Card */}
            <div className="scada-card aux-telemetry-card">
              <div className="scada-metrics-grid">
                
                {/* Temperature PV / SP */}
                <div className="scada-metric-tile">
                  <div className="tile-header">
                    <span className="tile-label">CST TEMP (PV / SP)</span>
                  </div>
                  <div className="tile-body">
                    <span className="tile-value red">
                      {telemetry.temperature.valid ? telemetry.temperature.pv.toFixed(1) : '--'}{' '}
                      <small>°C / {telemetry.temperature.sp.toFixed(1)}°C</small>
                    </span>
                  </div>
                </div>

                {/* Steam Heating Valve */}
                <div className="scada-metric-tile">
                  <div className="tile-header">
                    <span className="tile-label">STEAM VALVE</span>
                  </div>
                  <div className="tile-body">
                    <span className="tile-value green">
                      {telemetry.steam.valvePct}% <small>({telemetry.steam.status})</small>
                    </span>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default CstAutoSkimmerModal;

