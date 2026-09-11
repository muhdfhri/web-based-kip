import React, { useRef } from "react";
import "./BpvTab.css";
import bpvImageUrl from "../../assets/BPV-PT-KIP.webp";
import valvePositionerSvg from "../../assets/item/valve_positioner.svg";
import { EquipmentIconSVG, IpomasMonitorCardSVG } from "../../components/SharedComponents.jsx";
import { WTFlowOverlay } from "../../components/WTFlowBuilder.jsx";

export const SteamFlowSVG = ({ d, active, isRunning, mode = "flowing", color = "#a9dbe1ff", thickness = 8, className = "" }) => {
  const isActive = active || isRunning;
  if (!isActive) return null;

  let modeClass = "liquid-flow--flowing";
  if (mode === "standby") modeClass = "liquid-flow--standby";
  if (mode === "liquid") modeClass = "liquid-flow--liquid";

  const isSolid = mode === "liquid" || mode === "standby";

  return (
    <g className={`${modeClass} ${className}`}>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={thickness + 6}
        className="liquid-flow-glow"
        pointerEvents="none"
        style={isSolid ? { strokeDasharray: "none" } : {}}
      />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        className="liquid-flow-aura"
        pointerEvents="none"
        style={isSolid ? { strokeDasharray: "none" } : {}}
      />
    </g>
  );
};

export const ValveModernCardSVG = ({ x, y, scale = 1, title = "", position = "0.0", onClick, style = {} }) => {
  const isNoTag = !position || String(position).toLowerCase() === "no tag";
  const isOffline = String(position) === "--";
  const numPos = isNoTag || isOffline ? 0 : Math.min(100, Math.max(0, parseFloat(position) || 0));
  const displayPos = isNoTag ? "No Tag" : isOffline ? "--" : `${numPos.toFixed(1)}%`;

  const statusLabel = isNoTag ? "No Tag" : isOffline ? "Offline" : numPos === 0 ? "CLOSED" : numPos === 100 ? "FULLY OPEN" : `${numPos.toFixed(0)}% OPEN`;
  const badgeBg = isNoTag || isOffline ? "#f1f5f9" : numPos > 0 ? "#f0fdf4" : "#fef2f2";
  const badgeColor = isNoTag || isOffline ? "#64748b" : numPos > 0 ? "#16a34a" : "#ef4444";

  return (
    <g transform={`translate(${x}, ${y}) scale(${scale}) translate(-95, -55)`}>
      <foreignObject width="190" height="115" style={{ overflow: "visible", pointerEvents: "none" }}>
        <div
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClick && onClick(); }}
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onClick && onClick(); }}
          style={{
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
            padding: "10px 12px",
            fontFamily: "'Inter', sans-serif",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            cursor: onClick ? "pointer" : "default",
            pointerEvents: "auto",
            userSelect: "none",
            ...style
          }}
        >
          <div style={{ textAlign: "center", fontSize: "11px", fontWeight: "950", color: "#0f172a", borderBottom: "2px solid #ffdb3b", paddingBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {title}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
            <span style={{ fontSize: "9px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              POSITION
            </span>
            <span style={{ fontSize: "9px", fontWeight: "900", background: badgeBg, color: badgeColor, padding: "2px 6px", borderRadius: "4px", border: `1px solid ${badgeColor}33` }}>
              {statusLabel}
            </span>
          </div>

          <div style={{ position: "relative", width: "100%", height: "24px", background: "#f1f5f9", borderRadius: "6px", overflow: "hidden", border: "1px solid #cbd5e1" }}>
            <div style={{
              width: `${numPos}%`,
              height: "100%",
              background: numPos > 0 ? "linear-gradient(90deg, #ffdb3b, #d4ac0d)" : "transparent",
              transition: "width 0.4s ease"
            }} />
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: "950",
              color: isNoTag ? "#94a3b8" : "#0f172a"
            }}>
              {displayPos}
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

export const BpvModernStatusCardSVG = ({ x, y, scale = 1, status = "EMERGENCY", makeup = "OPEN", surplus = "OPEN", pressure = "0.0", onClick, style = {} }) => {
  let displayStatus = status;
  const s = String(status).trim();
  if (s === "0") displayStatus = "AUTO";
  else if (s === "1") displayStatus = "MANUAL";
  else if (s === "2") displayStatus = "STOP";
  else if (s === "--") displayStatus = "--";
  else if (s.toLowerCase() === "no tag") displayStatus = "No Tag";

  const getStatusColor = (val) => {
    if (val === "No Tag" || val === "--") return "#0f172a";
    return "#0f172a";
  };
  const getValveColor = (val) => {
    if (val === "No Tag" || val === "--") return "#64748b";
    return "#0f172a";
  };
  const getPressureColor = (val) => {
    if (val === "No Tag" || val === "--") return "#0f172a";
    return "#0f172a";
  };

  let displayMakeup = makeup;
  if (String(makeup).trim() === "0") displayMakeup = "CLOSE";
  else if (String(makeup).trim() === "1") displayMakeup = "OPEN";
  else if (String(makeup).toLowerCase() === "no tag") displayMakeup = "No Tag";

  let displaySurplus = surplus;
  if (String(surplus).trim() === "0") displaySurplus = "CLOSE";
  else if (String(surplus).trim() === "1") displaySurplus = "OPEN";
  else if (String(surplus).toLowerCase() === "no tag") displaySurplus = "No Tag";

  return (
    <g transform={`translate(${x}, ${y}) scale(${scale}) translate(-165, -95)`}>
      <foreignObject width="330" height="195" style={{ overflow: "visible", pointerEvents: "none" }}>
        <div
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClick && onClick(); }}
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onClick && onClick(); }}
          style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", padding: "16px", fontFamily: "'Inter', sans-serif", cursor: "pointer", pointerEvents: "auto", ...style }}>
          <div style={{ textAlign: "center", fontSize: "14px", fontWeight: "950", color: "#0f172a", borderBottom: "2px solid #ffdb3b", paddingBottom: "8px", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>BACK PRESSURE VESSEL</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "4px" }}>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "800" }}>STATUS</span>
              <span style={{ fontSize: "14px", color: getStatusColor(displayStatus), fontWeight: "950" }}>{displayStatus}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "4px" }}>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "800" }}>MAKE-UP</span>
              <span style={{ fontSize: "14px", color: getValveColor(displayMakeup), fontWeight: "950" }}>{displayMakeup}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "4px" }}>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "800" }}>SURPLUS</span>
              <span style={{ fontSize: "14px", color: getValveColor(displaySurplus), fontWeight: "950" }}>{displaySurplus}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "800" }}>PRESSURE</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                <span style={{ fontSize: "22px", color: getPressureColor(pressure), fontWeight: "950" }}>{pressure}</span>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "bold" }}>BAR</span>
              </div>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

export const AtmosphereLabelSVG = ({ x, y }) => (
  <g transform={`translate(${x}, ${y})`}>
    <path d="M -25,-18 L 25,-18 M 15,-25 L 25,-18 L 15,-11" stroke="rgba(255,255,255,0.8)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" style={{ fill: "rgba(255,255,255,0.8)", fontWeight: "900", fontSize: "15px", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "'Inter', sans-serif" }}>To Atmosfer</text>
  </g>
);

export const BpvControlSwitchPanelSVG = ({
  x,
  y,
  scale = 1,
  mode = "--",
  modeAuto = "AUTO",
  modeManual = "MANUAL",
  makeupOpen = "CLOSE",
  makeupClose = "CLOSE",
  blowoffOpen = "OPEN",
  blowoffClose = "OPEN",
  onModeAuto,
  onModeManual,
  onMakeupOpen,
  onMakeupClose,
  onBlowoffOpen,
  onBlowoffClose,
  onClick,
  style = {}
}) => {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale}) translate(-185, -82)`} className="bpv-modern-control-group">
      <foreignObject width="370" height="165" style={{ overflow: "visible", pointerEvents: "none" }}>
        <div
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClick && onClick(); }}
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onClick && onClick(); }}
          style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)", padding: "15px", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif", cursor: "pointer", pointerEvents: "auto", ...style }}>
          <div style={{ textAlign: "center", fontSize: "14px", fontWeight: "950", color: "#0f172a", borderBottom: "2px solid #ffdb3b", paddingBottom: "10px", marginBottom: "15px", textTransform: "uppercase", letterSpacing: "1px" }}>CONTROL PANEL</div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100px" }}>
              <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "800", marginBottom: "6px", textTransform: "uppercase" }}>
                {mode === "AUTO" ? "AUTO" : (mode === "MANUAL" || mode === "MAN") ? "MANUAL" : "MODE"}
              </span>
              <div style={{ display: "flex", background: "#f8fafc", padding: "3px", borderRadius: "8px", border: "1px solid #e2e8f0", width: "100%", position: "relative", overflow: "hidden" }}>
                {modeAuto !== "No Tag" && modeManual !== "No Tag" && (mode === "AUTO" || mode === "MANUAL" || mode === "MAN") && (
                  <div style={{
                    position: "absolute",
                    top: "3px",
                    bottom: "3px",
                    left: mode === "AUTO" ? "3px" : "calc(50% + 1.5px)",
                    width: "calc(50% - 4.5px)",
                    background: mode === "AUTO" ? "#ffdb3b" : "#fbbf24",
                    borderRadius: "6px",
                    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    zIndex: 1
                  }} />
                )}
                {modeAuto === "No Tag" ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed #cbd5e1", borderRadius: "6px", height: "22px", fontSize: "9px", color: "#94a3b8", fontWeight: "bold" }}>No Tag</div>
                ) : (
                  <div onClick={(e) => { e.stopPropagation(); onModeAuto && onModeAuto(); }} style={{ flex: 1, textAlign: "center", fontSize: "10px", fontWeight: "950", padding: "6px 0", zIndex: 2, color: "#0f172a", position: "relative", cursor: "pointer" }}>AUTO</div>
                )}
                {modeManual === "No Tag" ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed #cbd5e1", borderRadius: "6px", height: "22px", fontSize: "9px", color: "#94a3b8", fontWeight: "bold" }}>No Tag</div>
                ) : (
                  <div onClick={(e) => { e.stopPropagation(); onModeManual && onModeManual(); }} style={{ flex: 1, textAlign: "center", fontSize: "10px", fontWeight: "950", padding: "6px 0", zIndex: 2, color: "#0f172a", position: "relative", cursor: "pointer" }}>MAN</div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100px" }}>
              <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "800", marginBottom: "6px" }}>MAKE-UP</span>
              <div style={{ display: "flex", background: "#f8fafc", padding: "3px", borderRadius: "8px", border: "1px solid #e2e8f0", width: "100%" }}>
                {makeupOpen === "No Tag" ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed #cbd5e1", borderRadius: "6px", height: "22px", fontSize: "9px", color: "#94a3b8", fontWeight: "bold" }}>No Tag</div>
                ) : (
                  <div onClick={(e) => { e.stopPropagation(); onMakeupOpen && onMakeupOpen(); }} style={{ flex: 1, textAlign: "center", fontSize: "10px", fontWeight: "950", padding: "6px 0", borderRadius: "6px", background: "#1FE921", color: "#fff", cursor: "pointer" }}>OPEN</div>
                )}
                {makeupClose === "No Tag" ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed #cbd5e1", borderRadius: "6px", height: "22px", fontSize: "9px", color: "#94a3b8", fontWeight: "bold" }}>No Tag</div>
                ) : (
                  <div onClick={(e) => { e.stopPropagation(); onMakeupClose && onMakeupClose(); }} style={{ flex: 1, textAlign: "center", fontSize: "10px", fontWeight: "950", padding: "6px 0", borderRadius: "6px", background: "#EF4444", color: "#fff", cursor: "pointer" }}>CLOSE</div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100px" }}>
              <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "800", marginBottom: "6px" }}>BLOW-OFF</span>
              <div style={{ display: "flex", background: "#f8fafc", padding: "3px", borderRadius: "8px", border: "1px solid #e2e8f0", width: "100%" }}>
                {blowoffOpen === "No Tag" ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed #cbd5e1", borderRadius: "6px", height: "22px", fontSize: "9px", color: "#94a3b8", fontWeight: "bold" }}>No Tag</div>
                ) : (
                  <div onClick={(e) => { e.stopPropagation(); onBlowoffOpen && onBlowoffOpen(); }} style={{ flex: 1, textAlign: "center", fontSize: "10px", fontWeight: "950", padding: "6px 0", borderRadius: "6px", background: "#1FE921", color: "#fff", cursor: "pointer" }}>ON</div>
                )}
                {blowoffClose === "No Tag" ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed #cbd5e1", borderRadius: "6px", height: "22px", fontSize: "9px", color: "#94a3b8", fontWeight: "bold" }}>No Tag</div>
                ) : (
                  <div onClick={(e) => { e.stopPropagation(); onBlowoffClose && onBlowoffClose(); }} style={{ flex: 1, textAlign: "center", fontSize: "10px", fontWeight: "950", padding: "6px 0", borderRadius: "6px", background: "#EF4444", color: "#fff", cursor: "pointer" }}>OFF</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

export default function BpvTab({
  viewMode,
  bpvMakeup,
  bpvBlowoff,
  bpvMode,
  bpvMakeupPos,
  bpvBlowoffPos,
  setBpvMakeup,
  setBpvBlowoff,
  setBpvMode,
  setBpvMakeupPos,
  setBpvBlowoffPos,
  handleEquipmentClick,
  getMappedValue,
  configMode = false,
  tagMap = {},
  flowBuilder,
}) {
  const svgRef = useRef(null);

  const checkMapping = (id) => {
    return tagMap && Object.keys(tagMap).some(key => key.startsWith(`${id}__`) && tagMap[key] && tagMap[key] !== "null" && tagMap[key] !== "undefined" && tagMap[key] !== "");
  };

  const getDeveloperStyle = (id) => {
    if (!configMode) return {};
    const hasMapping = checkMapping(id);
    return {
      outline: hasMapping ? "2px solid #3b82f6" : "2px dashed #ef4444",
      boxShadow: hasMapping ? "0 0 8px rgba(59, 130, 246, 0.6)" : "0 0 8px rgba(239, 68, 68, 0.6)",
      backgroundColor: hasMapping ? "transparent" : "rgba(239, 68, 68, 0.15)",
      cursor: "pointer",
    };
  };

  let displayMakeupPos = getMappedValue ? getMappedValue("bpv_makeup_valve", "MONITOR", typeof bpvMakeupPos === "number" ? bpvMakeupPos.toFixed(1) : bpvMakeupPos) : bpvMakeupPos;
  if (displayMakeupPos === "No Tag" || displayMakeupPos === "--") displayMakeupPos = bpvMakeupPos;
  const currentMakeupPos = parseFloat(displayMakeupPos) || 0;

  let displayBlowoffPos = getMappedValue ? getMappedValue("bpv_blowoff_valve", "MONITOR", typeof bpvBlowoffPos === "number" ? bpvBlowoffPos.toFixed(1) : bpvBlowoffPos) : bpvBlowoffPos;
  if (displayBlowoffPos === "No Tag" || displayBlowoffPos === "--") displayBlowoffPos = bpvBlowoffPos;
  const currentBlowoffPos = parseFloat(displayBlowoffPos) || 0;

  return (
    <div className="som-sterilizer-station-layout">
      <div className="som-sterilizer-station-flow-card">
        <div className="som-sterilizer-station-flow-body">
          <svg
            ref={svgRef}
            viewBox="-260 -30 2660 1260"
            className="station-svg-canvas"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <filter id="tint-red" color-interpolation-filters="sRGB">
                <feColorMatrix type="matrix"
                  values="0.244 0.822 0.083 0 0
                          0     0     0     0 0
                          0     0     0     0 0
                          0     0     0     1 0"/>
              </filter>
              <filter id="tint-green" color-interpolation-filters="sRGB">
                <feColorMatrix type="matrix"
                  values="0      0      0      0 0
                          0.2445 0.8225 0.0830 0 0
                          0      0      0      0 0
                          0     0     0     1 0"/>
              </filter>
            </defs>
            <image href={bpvImageUrl} width="2600" x="-230" />

            {viewMode === "maintenance" && (
              <foreignObject x="650" y="20" width="600" height="60" style={{ overflow: "visible" }}>
                <div className="som-diagnostic-banner">TECHNICAL DIAGNOSTIC ACTIVE</div>
              </foreignObject>
            )}



            {/* BPV Flow Pipe Paths */}
            <g className="bpv-pipe-flows">
              {/* Dynamic Make-Up Valve Flow Logic */}
              {currentMakeupPos > 0.5 ? (
                /* Flowing Mode when Make-Up Valve OPEN (> 0) */
                <SteamFlowSVG
                  d="M -227,654 L -205,657 Q -183,660 -183,682 L -186,919 Q -186,928 -181,935 L -181,935 Q -176,942 -168,944 L -166,944 Q -157,946 -147,946 L 670,944 Q 695,944 695,919 L 694,680 Q 694,655 719,655 L 1008,653 Q 1019,653 1028,660 L 1029,661 Q 1037,667 1037,677 L 1036,686"
                  active={true}
                  mode="flowing"
                  color="#38bdf8"
                  thickness={14}
                />
              ) : (
                /* Standby Pulsing Mode when Make-Up Valve CLOSED (= 0) */
                <SteamFlowSVG
                  d="M -225,656 L -204,659 Q -183,662 -183,683 L -187,906 Q -187,918 -184,930 L -184,930 Q -181,942 -169,945 L -168,945 Q -156,948 -143,948 L 384,945"
                  active={true}
                  mode="liquid"
                  className="pulsing-flow-anim"
                  color="#38bdf8"
                  thickness={18}
                />
              )}
              {/* Flow 1 */}
              <SteamFlowSVG
                d="M 1118,706 L 1116,542 Q 1116,522 1096,522 L -189,522 Q -209,522 -209,502 L -208,1"
                active={true}
                mode="flowing"
                color="#38bdf8"
                thickness={15}
              />
              {/* Flow 2 */}
              <SteamFlowSVG
                d="M 1205,709 L 1205,508 Q 1205,488 1185,488 L -150,488 Q -170,488 -170,468 L -173,3"
                active={true}
                mode="flowing"
                color="#38bdf8"
                thickness={15}
              />
              {/* Flow 3 */}
              <SteamFlowSVG
                d="M 2362,392 L 1346,395 Q 1326,395 1326,415 L 1323,657"
                active={true}
                mode="flowing"
                color="#38bdf8"
                thickness={15}
              />
              {/* Flow 4 */}
              <SteamFlowSVG
                d="M 1466,741 L 1466,348"
                active={true}
                mode="flowing"
                color="#38bdf8"
                thickness={15}
              />
              {/* Flow 5 */}
              <SteamFlowSVG
                d="M 2360,440 L 1580,446 Q 1560,446 1560,466 L 1557,658"
                active={true}
                mode="flowing"
                color="#38bdf8"
                thickness={15}
              />
              {/* Flow 6 */}
              <SteamFlowSVG
                d="M 1698,744 L 1698,351"
                active={true}
                mode="flowing"
                color="#38bdf8"
                thickness={20}
              />
              {/* Flow 7 */}
              <SteamFlowSVG
                d="M 1767,718 L 1766,532 Q 1766,520 1770,509 L 1770,506 Q 1774,495 1786,494 L 1793,494 Q 1805,493 1817,493 L 2363,496"
                active={true}
                mode="flowing"
                color="#38bdf8"
                thickness={15}
              />
              {/* Flow 8 */}
              <SteamFlowSVG
                d="M 1856,719 L 1856,550 Q 1856,536 1870,536 L 2367,533"
                active={true}
                mode="flowing"
                color="#38bdf8"
                thickness={15}
              />
              {/* Flow 9 */}
              <SteamFlowSVG
                d="M 1959,671 L 1961,625 Q 1961,610 1966,596 L 1966,596 Q 1971,582 1986,581 L 1987,581 Q 2003,579 2019,579 L 2367,577"
                active={true}
                mode="flowing"
                color="#38bdf8"
                thickness={20}
              />
              {/* Dynamic Blow-Off Valve Flow Logic (Hanya flowing jika OPEN > 0) */}
              {currentBlowoffPos > 0.5 && (
                <SteamFlowSVG
                  d="M 2073,775 L 2072,664 Q 2072,639 2097,639 L 2365,638"
                  active={true}
                  mode="flowing"
                  color="#38bdf8"
                  thickness={12}
                />
              )}
            </g>

            {/* Group to shift all overlay elements to match background image offset (+140px) */}
            <g transform="translate(110, 0)">

              <EquipmentIconSVG x={310} y={893} icon={valvePositionerSvg} isRunning={currentMakeupPos > 0.5} size={190} rotation={270} />
              <ValveModernCardSVG
                x={310}
                y={1080}
                scale={1.4}
                title="MAKE-UP VALVE"
                position={displayMakeupPos}
                onClick={() => handleEquipmentClick && handleEquipmentClick("bpv_makeup_valve")}
                style={getDeveloperStyle && getDeveloperStyle("bpv_makeup_valve")}
              />

              <EquipmentIconSVG x={1989} y={760} icon={valvePositionerSvg} isRunning={currentBlowoffPos > 0.5} size={100} rotation={0} />
              <ValveModernCardSVG
                x={2160}
                y={740}
                scale={1.1}
                title="BLOW-OFF VALVE"
                position={displayBlowoffPos}
                onClick={() => handleEquipmentClick && handleEquipmentClick("bpv_blowoff_valve")}
                style={getDeveloperStyle && getDeveloperStyle("bpv_blowoff_valve")}
              />

              <AtmosphereLabelSVG x={2170} y={210} />

              <IpomasMonitorCardSVG x={-180} y={700} id="blr_pres" title="BOILER PRESSURE" singleValue={getMappedValue ? getMappedValue("blr_pres", "MONITOR", "--") : "--"} singleUnit="Bar" width={160} scale={1.2} onClick={handleEquipmentClick} style={getDeveloperStyle("blr_pres")} />
              <IpomasMonitorCardSVG x={1400} y={1000} id="bpv_pres" title="PRESSURE BPV" singleValue={getMappedValue ? getMappedValue("bpv_pres", "MONITOR", "--") : "--"} singleUnit="BAR" width={200} scale={1.4} onClick={handleEquipmentClick} style={getDeveloperStyle("bpv_pres")} />

              <BpvModernStatusCardSVG
                x={200}
                y={180}
                scale={1.4}
                status={getMappedValue ? getMappedValue("bpv_status", "STATUS", "--") : "--"}
                makeup={getMappedValue ? getMappedValue("bpv_status", "MAKEUP", "--") : "--"}
                surplus={getMappedValue ? getMappedValue("bpv_status", "SURPLUS", "--") : "--"}
                pressure={getMappedValue ? getMappedValue("bpv_status", "PRESSURE", "--") : "--"}
                onClick={() => handleEquipmentClick && handleEquipmentClick("bpv_status")}
                style={getDeveloperStyle("bpv_status")}
              />
            </g>

            {/* WT FLOW BUILDER OVERLAY (BPV Tab) */}
            {flowBuilder && (
              <WTFlowOverlay
                flows={flowBuilder.flows}
                activeFlowIdx={flowBuilder.activeFlowIdx}
                isActive={flowBuilder.isActive}
                isPlacing={flowBuilder.isPlacing}
                onPointDrag={flowBuilder.updatePoint}
                onInsertPoint={flowBuilder.insertPoint}
                onDeletePoint={flowBuilder.deletePoint}
                onSelectFlow={flowBuilder.setActiveFlowIdx}
                onCanvasClick={flowBuilder.addPointToActiveFlow}
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
