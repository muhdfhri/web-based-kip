import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ValvePositionerModal.css';

/**
 * Modern Interactive SCADA Valve Positioner Representation Modal
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Close modal callback
 * @param {object} valveData - Valve metadata & live values { name, type, pressNum, position, isOpen, tag }
 * @param {function} onSimulatePosition - Optional callback when testing simulated %
 */
export const ValvePositionerModal = ({
  isOpen,
  onClose,
  valveData = {},
  onSimulatePosition
}) => {
  if (!isOpen) return null;

  const {
    name = "V. DILUTION PRESS 1",
    type = "DILUTION", // "DILUTION" | "STEAM"
    pressNum = 1,
    position = 0,
    isOpen: isValveOpen = false,
    tag = "PLC_TAG_V_POS",
  } = valveData;

  // Numerical value
  const numVal = typeof position === 'number'
    ? position
    : (parseFloat(String(position).replace(/[^0-9.-]+/g, '')) || 0);

  const [testMode, setTestMode] = useState(false);
  const [testPosition, setTestPosition] = useState(numVal);

  useEffect(() => {
    if (!testMode) {
      setTestPosition(numVal);
    }
  }, [numVal, testMode]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const activePosition = testMode ? testPosition : numVal;
  const isSteam = String(type).toUpperCase().includes('STEAM');
  const themeColor = isSteam ? '#38bdf8' : '#fbbf24';
  const themeGlow = isSteam ? 'rgba(56, 189, 248, 0.4)' : 'rgba(251, 191, 36, 0.4)';

  // Telemetry calculations
  const mA = (4 + (activePosition / 100) * 16).toFixed(2);
  const airPressure = activePosition > 0 ? (2.0 + (activePosition / 100) * 2.2).toFixed(1) : '0.0';
  const travelMm = ((activePosition / 100) * 35).toFixed(1); // 35mm full stroke

  // Speed Tier
  let tierLabel = "STANDBY (0%)";
  let tierClass = "t-standby";
  let tierSpeed = "0.0s (Standby)";
  if (activePosition > 75) {
    tierLabel = "HIGH SPEED (76-100%)";
    tierClass = "t-high";
    tierSpeed = "0.6s (Kecepatan Penuh)";
  } else if (activePosition > 25) {
    tierLabel = "MEDIUM SPEED (26-75%)";
    tierClass = "t-med";
    tierSpeed = "1.2s (Kecepatan Sedang)";
  } else if (activePosition > 0) {
    tierLabel = "LOW SPEED (1-25%)";
    tierClass = "t-low";
    tierSpeed = "2.4s (Kecepatan Rendah)";
  }

  // Visual stem lift height (0 to 45px displacement)
  const stemLift = (activePosition / 100) * 45;
  // Plug lift in valve body
  const plugLift = (activePosition / 100) * 28;

  const handleSliderChange = (e) => {
    const v = parseFloat(e.target.value);
    setTestPosition(v);
    if (onSimulatePosition) {
      onSimulatePosition(v);
    }
  };

  return createPortal(
    <div className="vpm-backdrop" onClick={onClose}>
      <div
        className={`vpm-card ${isSteam ? 'vpm-steam' : 'vpm-dilution'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="vpm-header">
          <div className="vpm-header-left">
            <span className={`vpm-badge-type ${isSteam ? 'vpm-badge-steam' : 'vpm-badge-dilution'}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v10M8 12h8" />
              </svg>
              {isSteam ? 'STEAM CONTROL VALVE' : 'DILUTION WATER VALVE'}
            </span>
            <div>
              <h2 className="vpm-title">{name || `EFB PRESS ${pressNum} - ${isSteam ? 'STEAM' : 'DILUTION'} VALVE`}</h2>
              <p className="vpm-subtitle">Smart Digital Positioner | Station EFB Plant</p>
            </div>
          </div>
          <button className="vpm-close-btn" onClick={onClose} title="Close (ESC)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="vpm-body">
          {/* Left: Interactive Valve Positioner Graphical Diagram (Matching Physical Photo) */}
          <div className="vpm-visual-panel">
            <div className="vpm-panel-tag-header">
              <span className="vpm-mini-title">PNEUMATIC ACTUATOR & POSITIONER ASSEMBLY</span>
              <span className="vpm-tag-live">{activePosition > 0 ? 'STROKE ACTIVE' : 'ZERO POSITION'}</span>
            </div>

            <svg
              className="vpm-visual-svg"
              viewBox="-20 -20 440 430"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Glow & Soft Shadow Filters */}
                <filter id="vpmSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="vpmShadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="2" dy="5" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.18" />
                </filter>

                {/* Metallic & Coating Gradients */}
                <linearGradient id="bodySteelH" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#64748b" />
                  <stop offset="20%" stopColor="#cbd5e1" />
                  <stop offset="50%" stopColor="#f8fafc" />
                  <stop offset="80%" stopColor="#94a3b8" />
                  <stop offset="100%" stopColor="#475569" />
                </linearGradient>

                <linearGradient id="bodySteelV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f1f5f9" />
                  <stop offset="25%" stopColor="#cbd5e1" />
                  <stop offset="60%" stopColor="#94a3b8" />
                  <stop offset="90%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#475569" />
                </linearGradient>

                <linearGradient id="shaftChrome" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="30%" stopColor="#e2e8f0" />
                  <stop offset="55%" stopColor="#64748b" />
                  <stop offset="80%" stopColor="#cbd5e1" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>

                <linearGradient id="whiteCoating" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="40%" stopColor="#f8fafc" />
                  <stop offset="80%" stopColor="#e2e8f0" />
                  <stop offset="100%" stopColor="#cbd5e1" />
                </linearGradient>

                <linearGradient id="posGreyGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#94a3b8" />
                  <stop offset="40%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#334155" />
                </linearGradient>

                <linearGradient id="fluidFlowGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={isSteam ? '#0284c7' : '#d97706'} />
                  <stop offset="50%" stopColor={isSteam ? '#38bdf8' : '#fbbf24'} />
                  <stop offset="100%" stopColor={isSteam ? '#0284c7' : '#d97706'} />
                </linearGradient>
              </defs>

              {/* Vertical Stroke Lift: 0 to 72px displacement calibrated with 0-100% scale */}
              {(() => {
                const strokeLift = (activePosition / 100) * 72; // 0px at 0% up to 72px at 100%
                const armAngle = 8 - (activePosition / 100) * 44; // +8deg at 0% down to -36deg at 100%

                return (
                  <g filter="url(#vpmShadow)">

                    {/* =========================================================
                        1. PNEUMATIC DIAPHRAGM ACTUATOR HEAD (BAGIAN KEPALA ATAS)
                        Bergerak naik/turun (stroke) bersama stem shaft
                        ========================================================= */}
                    <g id="actuator_assembly" transform="translate(90, 18)">
                      {/* Base Mounting Ring attached to Yoke (Static Base) */}
                      <rect x="36" y="80" width="148" height="12" rx="2" fill="url(#whiteCoating)" stroke="#94a3b8" strokeWidth="1.5" />

                      {/* Moving Actuator Head Assembly (Dome + Multi-bolt Flange + Top Indicator) */}
                      <g id="moving_actuator_head" transform={`translate(0, ${-strokeLift * 0.15})`} style={{ transition: 'transform 0.3s ease' }}>
                        {/* Center Top Pneumatic Air Feed Port & Top Indicator Stem */}
                        <rect x="104" y="-4" width="12" height="14" rx="2" fill="url(#shaftChrome)" stroke="#475569" strokeWidth="1" />
                        <circle cx="110" cy="3" r="3" fill="#ef4444" />

                        {/* Main Actuator Diaphragm Upper Dome Casing */}
                        <path
                          d="M 24,54 L 24,18 C 24,10 30,6 38,6 L 182,6 C 190,6 196,10 196,18 L 196,54 Z"
                          fill="url(#whiteCoating)"
                          stroke="#94a3b8"
                          strokeWidth="1.5"
                        />

                        {/* Multi-Bolt Ribbed Flange (6 Protruding Bolt Heads as in photo) */}
                        <rect x="12" y="54" width="196" height="22" rx="3" fill="url(#whiteCoating)" stroke="#94a3b8" strokeWidth="1.5" />

                        {[24, 56, 88, 120, 152, 184].map((bx, i) => (
                          <g key={i} transform={`translate(${bx}, 58)`}>
                            {/* Hex Nut / Bolt Head */}
                            <rect x="0" y="0" width="12" height="14" rx="2" fill="url(#whiteCoating)" stroke="#64748b" strokeWidth="1.2" />
                            <circle cx="6" cy="7" r="2.5" fill="#cbd5e1" />
                          </g>
                        ))}
                      </g>
                    </g>

                    {/* =========================================================
                        2. YOKE FRAME & FEEDBACK MECHANISM (MIDDLE SECTION)
                        ========================================================= */}
                    <g id="yoke_assembly" transform="translate(122, 108)">
                      {/* Heavy Cast White Yoke Outer Frame [   ] (Static Body) */}
                      <path
                        d="M 22,0 L 22,145 L 134,145 L 134,0 L 118,0 L 118,128 L 38,128 L 38,0 Z"
                        fill="url(#whiteCoating)"
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                      />

                      {/* Positioner Stepped Bracket & Module (Mounted on Left Side of Yoke) */}
                      <g transform="translate(-56, 20)">
                        {/* Stepped Arm connecting Positioner to Yoke */}
                        <path
                          d="M 0,0 L 0,35 L 20,55 L 20,105 L 34,105 L 34,0 Z"
                          fill="url(#posGreyGrad)"
                          stroke="#334155"
                          strokeWidth="1.2"
                        />
                        {/* Stepped Grooves on Bracket */}
                        <line x1="4" y1="10" x2="14" y2="10" stroke="#cbd5e1" strokeWidth="1" />
                        <line x1="4" y1="18" x2="14" y2="18" stroke="#cbd5e1" strokeWidth="1" />
                        <line x1="4" y1="26" x2="14" y2="26" stroke="#cbd5e1" strokeWidth="1" />

                        {/* Smart Positioner Unit Body Casting */}
                        <rect x="-18" y="25" width="46" height="75" rx="4" fill="url(#posGreyGrad)" stroke="#1e293b" strokeWidth="1.5" />
                        <rect x="-14" y="32" width="38" height="38" rx="2" fill="#475569" stroke="#334155" strokeWidth="1" />

                        {/* Positioner Model Markings */}
                        <text x="5" y="50" fill="#cbd5e1" fontSize="7.5" fontWeight="bold" textAnchor="middle">433L</text>
                        <text x="5" y="62" fill="#94a3b8" fontSize="7" fontWeight="bold" textAnchor="middle">HMG</text>
                        <circle cx="5" cy="84" r="3.5" fill="#334155" stroke="#94a3b8" strokeWidth="1" />

                        {/* Pivoting Mechanical Feedback Arm to Stem Fork */}
                        <g transform={`translate(24, 75) rotate(${armAngle})`}>
                          <rect x="0" y="-3" width="70" height="6" rx="2" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
                          <circle cx="66" cy="0" r="2.5" fill="#ef4444" />
                        </g>
                      </g>

                      {/* Moving Shaft, Collar & Fork (Vertical Motion) */}
                      <g id="vertical_stem_moving_group" transform={`translate(0, ${-strokeLift})`} style={{ transition: 'transform 0.3s ease' }}>
                        {/* Polished Chrome Linear Stem Shaft (Continuous Long Rod) */}
                        <rect
                          x="72"
                          y="5"
                          width="12"
                          height="160"
                          rx="2"
                          fill="url(#shaftChrome)"
                          stroke="#64748b"
                          strokeWidth="1"
                        />

                        {/* Stem Coupling / Shaft Collar */}
                        <g transform="translate(62, 58)">
                          <rect x="0" y="0" width="32" height="18" rx="2" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
                          <rect x="4" y="3" width="24" height="12" rx="1" fill="#475569" />
                          <circle cx="16" cy="9" r="2.5" fill="#cbd5e1" />
                        </g>

                        {/* Mechanical Feedback Fork & Pin Bracket (Positioned at 0% tick mark by default) */}
                        <g transform="translate(36, 98)">
                          {/* Horizontal Cross Pin */}
                          <rect x="14" y="-6" width="3" height="26" fill="#64748b" stroke="#334155" strokeWidth="0.8" />
                          {/* Fork Clamp */}
                          <path
                            d="M 0,0 L 22,0 L 22,6 L 4,6 L 4,12 L 22,12 L 22,18 L 0,18 Z"
                            fill="#1e293b"
                            stroke="#0f172a"
                            strokeWidth="1"
                          />
                          <circle cx="9" cy="9" r="2.5" fill="#ef4444" />
                          {/* Red Indicator Needle pointing to Scale */}
                          <polygon points="23,9 29,5 29,13" fill="#ef4444" />
                        </g>
                      </g>

                      {/* Travel Stroke Calibrated Scale on Right Yoke Leg */}
                      <g transform="translate(118, 25)">
                        <rect x="0" y="0" width="14" height="92" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" rx="1" />
                        {[10, 20, 30, 40, 46, 55, 64, 73, 82].map((ty, idx) => (
                          <line key={idx} x1="0" y1={ty} x2={ty === 10 || ty === 46 || ty === 82 ? 7 : 4} y2={ty} stroke="#475569" strokeWidth="1" />
                        ))}
                        <text x="7" y="10" fill="#64748b" fontSize="5.5" fontWeight="bold" textAnchor="middle">100%</text>
                        <text x="7" y="46" fill="#64748b" fontSize="5.5" fontWeight="bold" textAnchor="middle">50%</text>
                        <text x="7" y="82" fill="#64748b" fontSize="5.5" fontWeight="bold" textAnchor="middle">0%</text>
                      </g>

                      {/* Bottom Gland Packing Bushing & Seal */}
                      <rect x="66" y="130" width="24" height="26" rx="2" fill="url(#bodySteelH)" stroke="#475569" strokeWidth="1.5" />
                      <rect x="70" y="134" width="16" height="20" rx="1" fill="url(#shaftChrome)" stroke="#64748b" strokeWidth="1" />
                    </g>

                    {/* =========================================================
                        3. VALVE BODY (BOTTOM - CAST STAINLESS STEEL 2-WAY IN-LINE)
                        ========================================================= */}
                    <g id="valve_body" transform="translate(68, 265)">
                      {/* Flange Left Inlet Port */}
                      <rect x="0" y="42" width="30" height="56" rx="3" fill="url(#bodySteelV)" stroke="#64748b" strokeWidth="1.5" />
                      <path d="M 6,42 L 6,98 M 24,42 L 24,98" stroke="#94a3b8" strokeWidth="1" />

                      {/* Flange Right Outlet Port */}
                      <rect x="234" y="42" width="30" height="56" rx="3" fill="url(#bodySteelV)" stroke="#64748b" strokeWidth="1.5" />
                      <path d="M 240,42 L 240,98 M 258,42 L 258,98" stroke="#94a3b8" strokeWidth="1" />

                      {/* Main Cast Spherical Body Belly (Smooth 2-Way Globe Body) */}
                      <path
                        d="M 28,42 C 45,42 65,28 100,28 L 164,28 C 199,28 219,42 236,42 L 236,98 C 219,98 199,122 164,122 L 100,122 C 65,122 45,98 28,98 Z"
                        fill="url(#bodySteelH)"
                        stroke="#475569"
                        strokeWidth="1.5"
                      />

                      {/* Cast Model Engraving Text */}
                      <text
                        x="132"
                        y="95"
                        fill="#64748b"
                        fontSize="8"
                        fontWeight="bold"
                        letterSpacing="1"
                        textAnchor="middle"
                        opacity="0.85"
                      >
                        HSH Sec Titanium
                      </text>

                      {/* Internal Flow Channel Pipe Cavity (Background - Empty Neutral Gray when 0%) */}
                      <rect x="6" y="62" width="252" height="16" rx="3" fill="#0f172a" opacity="0.08" />

                      {/* Flow Channel & Active Fluid Wave Animation (Only visible when valve > 0%) */}
                      {activePosition > 0 && (
                        <g opacity={Math.min(1, 0.45 + (activePosition / 100) * 0.55)}>
                          {/* 1. Outer Glow Sheath */}
                          <line
                            x1="6"
                            y1="70"
                            x2="258"
                            y2="70"
                            className="vpm-liquid-glow"
                            stroke={isSteam ? '#38bdf8' : '#f59e0b'}
                            strokeWidth="16"
                            opacity="0.22"
                            style={{ filter: 'blur(2px)' }}
                          />
                          {/* 2. Inner Rim */}
                          <line
                            x1="6"
                            y1="70"
                            x2="258"
                            y2="70"
                            className="vpm-liquid-rim"
                            stroke={isSteam ? '#38bdf8' : '#f59e0b'}
                            strokeWidth="12"
                            opacity="0.35"
                            style={{ filter: 'blur(0.8px)' }}
                          />
                          {/* 3. Solid Liquid Core Stream */}
                          <line
                            x1="6"
                            y1="70"
                            x2="258"
                            y2="70"
                            className="vpm-liquid-core"
                            stroke={isSteam ? '#38bdf8' : '#f59e0b'}
                            strokeWidth="8"
                            opacity="1"
                          />
                          {/* 4. Gliding Surface Highlight Dashes (Matching Overview Light Pulses) */}
                          <line
                            x1="6"
                            y1="70"
                            x2="258"
                            y2="70"
                            className="vpm-liquid-highlight"
                            strokeWidth="2.8"
                            style={{
                              '--vpm-flow-spd': `${Math.max(1.2, Math.min(6.5, +(6.5 - (activePosition / 100) * 5.3).toFixed(2)))}s`
                            }}
                          />
                        </g>
                      )}

                      {/* Flow Direction & Type Label */}
                      <g transform="translate(132, 114)">
                        <rect x="-70" y="-8" width="140" height="16" rx="4" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
                        <text
                          x="0"
                          y="3.5"
                          fill={activePosition > 0 ? (isSteam ? '#0284c7' : '#b45309') : '#94a3b8'}
                          fontSize="7.5"
                          fontWeight="800"
                          textAnchor="middle"
                          letterSpacing="0.6"
                        >
                          {activePosition > 0
                            ? (isSteam ? '▶ STEAM FLOW ACTIVE ▶' : '▶ DILUTION WATER FLOW ▶')
                            : '■ VALVE STANDBY / CLOSED ■'}
                        </text>
                      </g>

                      {/* Valve Seat Ring in Center */}
                      <rect x="124" y="68" width="16" height="4" fill="#cbd5e1" stroke="#475569" strokeWidth="0.8" rx="1" />

                      {/* Moving Internal Valve Plug (Lifting above Seat inside Valve Body) */}
                      <g transform={`translate(126, ${54 - strokeLift * 0.35})`} style={{ transition: 'transform 0.3s ease' }}>
                        {/* Stem extension into body */}
                        <rect x="3" y="-30" width="6" height="32" fill="url(#shaftChrome)" stroke="#64748b" />
                        {/* Conical Valve Plug Head */}
                        <path d="M 0,0 L 12,0 L 9,14 L 3,14 Z" fill="#475569" stroke="#1e293b" strokeWidth="1" />
                      </g>

                      {/* Top Neck Connection Boss */}
                      <rect x="114" y="0" width="36" height="28" rx="2" fill="url(#bodySteelH)" stroke="#475569" strokeWidth="1.5" />
                    </g>

                  </g>
                );
              })()}
            </svg>

            {/* Positioner LCD Digital Readout Bar */}
            <div className="vpm-lcd-box">
              <div className="vpm-lcd-label">LIVE VALVE POSITION & SIGNAL COMMAND</div>
              <div className={`vpm-lcd-value ${!isSteam ? 'dilution-val' : ''}`}>
                {activePosition.toFixed(1)} % <span style={{ fontSize: '15px', color: '#94a3b8', fontWeight: 600 }}>({mA} mA)</span>
              </div>
            </div>
          </div>

          {/* Right: Telemetry, Speed & Diagnostic Parameters */}
          <div className="vpm-data-panel">
            {/* Status Banner */}
            <div className="vpm-status-banner">
              <div className="vpm-status-indicator">
                <span className={`vpm-status-dot ${activePosition > 0 ? 'active' : 'standby'}`} />
                <span className="vpm-status-text">
                  {activePosition >= 100 ? 'FULLY OPEN' : activePosition > 0 ? `OPENING (${activePosition.toFixed(0)}%)` : 'CLOSED / STANDBY'}
                </span>
              </div>
              <span className={`vpm-tier-tag ${tierClass}`}>
                {tierLabel}
              </span>
            </div>

            {/* Grid Metrics */}
            <div className="vpm-metric-grid">
              <div className="vpm-metric-card">
                <span className="vpm-metric-label">Signal Command</span>
                <div className="vpm-metric-num">
                  {mA} <span className="vpm-metric-unit">mA (4-20mA)</span>
                </div>
              </div>
              <div className="vpm-metric-card">
                <span className="vpm-metric-label">Supply Air Pressure</span>
                <div className="vpm-metric-num">
                  {airPressure} <span className="vpm-metric-unit">Bar</span>
                </div>
              </div>
              <div className="vpm-metric-card">
                <span className="vpm-metric-label">Stem Travel Stroke</span>
                <div className="vpm-metric-num">
                  {travelMm} <span className="vpm-metric-unit">mm / 35mm</span>
                </div>
              </div>
              <div className="vpm-metric-card">
                <span className="vpm-metric-label">Pipe Flow Speed</span>
                <div className="vpm-metric-num" style={{ fontSize: '16px', color: themeColor }}>
                  {tierSpeed}
                </div>
              </div>
            </div>

            {/* Valve Position Tier Gauge */}
            <div className="vpm-tier-card">
              <div className="vpm-tier-header">
                <span>VALVE TRAVEL PROGRESSION</span>
                <span style={{ color: themeColor }}>{activePosition.toFixed(1)}%</span>
              </div>
              <div className="vpm-tier-progress-track">
                <div
                  className={`vpm-tier-progress-fill ${isSteam ? 'steam-fill' : 'dilution-fill'}`}
                  style={{ width: `${Math.min(100, Math.max(0, activePosition))}%` }}
                />
              </div>
              <div className="vpm-tier-markers">
                <span>0% (Standby)</span>
                <span>25% (Slow)</span>
                <span>75% (Med)</span>
                <span>100% (Fast)</span>
              </div>
            </div>

            {/* Interactive Simulation / Test Control */}
            <div className="vpm-sim-card">
              <div className="vpm-sim-header">
                <span className="vpm-sim-title">
                  {testMode ? '⚠️ TEST SIMULATION ACTIVE' : '🎮 LIVE PLC / TEST OVERRIDE'}
                </span>
                <button
                  className="vpm-btn-outline"
                  onClick={() => {
                    if (testMode) {
                      setTestMode(false);
                      setTestPosition(numVal);
                    } else {
                      setTestMode(true);
                    }
                  }}
                >
                  {testMode ? 'Reset to PLC Live' : 'Enable Test Slider'}
                </button>
              </div>

              {testMode && (
                <>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={testPosition}
                    onChange={handleSliderChange}
                    className={`vpm-sim-slider ${!isSteam ? 'dilution-slider' : ''}`}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                    <span>Slider: <b style={{ color: '#0f172a' }}>{testPosition}%</b></span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="vpm-btn-pill" onClick={() => setTestPosition(0)}>0%</button>
                      <button className="vpm-btn-pill" onClick={() => setTestPosition(25)}>25%</button>
                      <button className="vpm-btn-pill" onClick={() => setTestPosition(50)}>50%</button>
                      <button className="vpm-btn-pill" onClick={() => setTestPosition(100)}>100%</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="vpm-footer">
          <div className="vpm-footer-info">
            <span><b>PLC Tag:</b> {tag || 'Unmapped'}</span>
            <span><b>Type:</b> Pneumatic Linear Globe Valve</span>
            <span><b>Protocol:</b> 4-20mA + HART</span>
          </div>
          <button className="vpm-btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
