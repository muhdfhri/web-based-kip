import React, { useRef } from "react";
import "./BpvTab.css";
import bpvImageUrl from "../../assets/BPV-PT-SKL.webp";
import valvePositionerSvg from "../../assets/item/valve_positioner.svg";
import { EquipmentIconSVG, IpomasMonitorCardSVG } from "../../components/SharedComponents.jsx";
// import { WTFlowOverlay } from "../../components/WTFlowBuilder.jsx";

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
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale}) translate(-100, -65)`} onClick={onClick} style={{ cursor: "pointer", ...style }}>
      <foreignObject width="200" height="90" style={{ overflow: "visible" }}>
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)", padding: "12px", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ textAlign: "center", fontSize: "12px", fontWeight: "950", color: "#0f172a", borderBottom: "2px solid #ffdb3b", paddingBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>{title}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "2px" }}>
              <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "800", marginBottom: "2px" }}>POSITION</span>
              <div style={{ position: "relative", width: "100%", height: "24px", background: "#f1f5f9", borderRadius: "6px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                <div style={{ width: `${Math.min(100, Math.max(0, parseFloat(position) || 0))}%`, height: "100%", background: `linear-gradient(90deg, #ffdb3b, #d4ac0d)`, transition: "width 0.5s ease" }}></div>
                <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "950", color: "#0f172a" }}>{position}%</div>
              </div>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

export const BpvModernStatusCardSVG = ({ x, y, scale = 1, status = "EMERGENCY", makeup = "OPEN", surplus = "OPEN", pressure = "0.0", onClick, style = {} }) => {
  // 1. Logika penerjemah angka ke teks
  let displayStatus = status;
  const s = String(status).trim();
  if (s === "0") displayStatus = "AUTO";
  else if (s === "1") displayStatus = "MANUAL";
  else if (s === "2") displayStatus = "STOP";
  else if (s === "--") displayStatus = "--";
  else if (s.toLowerCase() === "no tag") displayStatus = "No Tag";

  // 2. Logika warna (Diubah menjadi hitam semua kecuali jika No Tag)
  const getStatusColor = (val) => {
    if (val === "No Tag" || val === "--") return "#0f172a";
    return "#0f172a"; // Warna Hitam
  };
  const getValveColor = (val) => {
    if (val === "No Tag" || val === "--") return "#64748b";
    return "#0f172a"; // Warna Hitam
  };
  const getPressureColor = (val) => {
    if (val === "No Tag" || val === "--") return "#0f172a";
    return "#0f172a"; // Warna Hitam
  };

  let displayMakeup = makeup;
  if (String(makeup).trim() === "0") displayMakeup = "CLOSE";
  else if (String(makeup).trim() === "1") displayMakeup = "OPEN";

  let displaySurplus = surplus;
  if (String(surplus).trim() === "0") displaySurplus = "CLOSE";
  else if (String(surplus).trim() === "1") displaySurplus = "OPEN";

  return (
    <g transform={`translate(${x}, ${y}) scale(${scale}) translate(-160, -90)`} onClick={onClick} style={{ cursor: "pointer", ...style }}>
      <foreignObject width="320" height="180" style={{ overflow: "visible" }}>
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)", padding: "15px", fontFamily: "'Inter', sans-serif" }}>
          <div style={{ textAlign: "center", fontSize: "14px", fontWeight: "950", color: "#0f172a", borderBottom: "2px solid #ffdb3b", paddingBottom: "8px", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>BACK PRESSURE VESSEL</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "4px" }}>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "800" }}>STATUS</span>
              {/* 3. Menampilkan displayStatus yang sudah diterjemahkan */}
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
}
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
    <g transform={`translate(${x}, ${y}) scale(${scale}) translate(-180, -75)`} className="bpv-modern-control-group" onClick={onClick} style={{ cursor: "pointer", ...style }}>
      <foreignObject width="360" height="150" style={{ overflow: "visible" }}>
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)", padding: "15px", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif" }}>
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
  flowBuilder,
  getMappedValue,
  configMode = false,
  tagMap = {},
}) {
  const svgRef = useRef(null);

  const checkMapping = (id) => {
    return tagMap && Object.keys(tagMap).some(key => key.startsWith(`${id}__`) && tagMap[key]);
  };

  const getDeveloperStyle = (id) => {
    if (!configMode) return {};
    const hasMapping = checkMapping(id);
    return {
      outline: hasMapping ? "2px solid #3b82f6" : "2px solid #ef4444",
      boxShadow: hasMapping ? "0 0 8px rgba(59, 130, 246, 0.6)" : "0 0 8px rgba(239, 68, 68, 0.6)",
      backgroundColor: hasMapping ? "transparent" : "rgba(239, 68, 68, 0.15)",
      cursor: "pointer",
    };
  };

  const currentMakeupPos = parseFloat(getMappedValue ? getMappedValue("bpv_makeup_valve", "MONITOR", bpvMakeupPos) : bpvMakeupPos) || 0;
  const currentBlowoffPos = parseFloat(getMappedValue ? getMappedValue("bpv_blowoff_valve", "MONITOR", bpvBlowoffPos) : bpvBlowoffPos) || 0;

  return (
    <div className="som-sterilizer-station-layout">
      <div className="som-sterilizer-station-flow-card">
        <div className="som-sterilizer-station-flow-body">
          <svg
            ref={svgRef}
            viewBox="-400 10 2920 1260"
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

            {/* Group to shift all overlay elements to match the new background image offset (+140px) */}
            <g transform="translate(110, 0)">
              {/* Pulsing Static Flow when Make-Up Valve is CLOSED */}
              <SteamFlowSVG
                d="M -340,657 L -318,657 Q -296,656 -296,678 L -292,920 Q -292,945 -267,945 L -129,945"
                isRunning={currentMakeupPos <= 0.5}
                mode="liquid"
                className="pulsing-flow-anim"
                color="#38bdf8"
                thickness={8}
              />
              <SteamFlowSVG
                d="M -71,947 L 86,947"
                isRunning={currentMakeupPos <= 0.5}
                mode="liquid"
                className="pulsing-flow-anim"
                color="#38bdf8"
                thickness={8}
              />
              <SteamFlowSVG
                d="M 163,947 L 275,947"
                isRunning={currentMakeupPos <= 0.5}
                mode="liquid"
                className="pulsing-flow-anim"
                color="#38bdf8"
                thickness={8}
              />
              <SteamFlowSVG
                d="M 58,943 L 53,678 Q 53,653 78,653 L 280,651"
                isRunning={currentMakeupPos <= 0.5}
                mode="liquid"
                className="pulsing-flow-anim"
                color="#38bdf8"
                thickness={8}
              />

              <SteamFlowSVG
                d="M -339,654 L -317,654 Q -295,654 -295,676 L -295,922 Q -295,947 -270,945 L -129,945"
                isRunning={currentMakeupPos > 0.5}
                color="#38bdf8"
                thickness={8}
              />
              <SteamFlowSVG
                d="M -67,945 L 87,945"
                isRunning={currentMakeupPos > 0.5}
                color="#38bdf8"
                thickness={8}
              />
              <SteamFlowSVG
                d="M 161,945 L 277,945"
                isRunning={currentMakeupPos > 0.5}
                color="#38bdf8"
                thickness={8}
              />
              <SteamFlowSVG
                d="M 347,945 L 381,945"
                isRunning={currentMakeupPos > 0.5}
                color="#38bdf8"
                thickness={8}
              />
              <SteamFlowSVG
                d="M 459,947 L 558,946 Q 583,946 583,921 L 583,679 Q 583,654 608,654 L 896,654 Q 905,654 914,657 L 914,657 Q 923,660 924,669 L 926,686"
                isRunning={currentMakeupPos > 0.5}
                color="#38bdf8"
                thickness={8}
              />
              <SteamFlowSVG
                d="M 53,941 L 53,678 Q 53,653 78,653 L 272,653"
                isRunning={currentMakeupPos > 0.5}
                color="#38bdf8"
                thickness={8}
              />
              <SteamFlowSVG
                d="M 1054,714 L 1053,545 Q 1053,520 1028,520 L -295,521 Q -320,521 -320,496 L -321,-2"
                isRunning={true}
                color="#38bdf8"
                thickness={8}
              />
              <SteamFlowSVG
                d="M 1140,715 L 1145,512 Q 1146,487 1121,487 L -259,488 Q -284,488 -284,463 L -282,2"
                isRunning={true}
                color="#38bdf8"
                thickness={8}
              />
              <SteamFlowSVG
                d="M 2258,348 L 1313,352 Q 1288,352 1288,377 L 1286,675"
                isRunning={true}
                color="#38bdf8"
                thickness={8}
              />
              <SteamFlowSVG
                d="M 1486,711 L 1486,433 Q 1486,408 1511,408 L 2252,408"
                isRunning={true}
                color="#38bdf8"
                thickness={8}
              />
              <SteamFlowSVG
                d="M 1589,709 L 1589,470 Q 1589,445 1614,445 L 2245,445"
                isRunning={true}
                color="#38bdf8"
                thickness={8}
              />
              <SteamFlowSVG
                d="M 2257,505 L 1723,505 Q 1698,505 1698,530 L 1699,667"
                isRunning={true}
                color="#38bdf8"
                thickness={8}
              />
              <SteamFlowSVG
                d="M 1850,669 L 1850,605 Q 1850,580 1875,580 L 2255,580"
                isRunning={true}
                color="#38bdf8"
                thickness={8}
              />
              <SteamFlowSVG
                d="M 1961,741 L 1960,661 Q 1960,636 1985,636 L 2258,636"
                isRunning={currentBlowoffPos > 0.5}
                color="#38bdf8"
                thickness={8}
              />

              <EquipmentIconSVG x={310} y={893} icon={valvePositionerSvg} isRunning={currentMakeupPos > 0.5} size={190} rotation={270} />
              <ValveModernCardSVG 
                x={310} 
                y={1080} 
                scale={1.4} 
                title="MAKE-UP VALVE" 
                position={getMappedValue ? getMappedValue("bpv_makeup_valve", "MONITOR", bpvMakeupPos.toFixed(1)) : bpvMakeupPos.toFixed(1)} 
                onClick={() => handleEquipmentClick && handleEquipmentClick("bpv_makeup_valve")} 
                style={getDeveloperStyle && getDeveloperStyle("bpv_makeup_valve")} 
              />

              <EquipmentIconSVG x={1989} y={760} icon={valvePositionerSvg} isRunning={currentBlowoffPos > 0.5} size={100} rotation={0} />
              <ValveModernCardSVG 
                x={2160} 
                y={740} 
                scale={1.1} 
                title="BLOW-OFF VALVE" 
                position={getMappedValue ? getMappedValue("bpv_blowoff_valve", "MONITOR", bpvBlowoffPos.toFixed(1)) : bpvBlowoffPos.toFixed(1)} 
                onClick={() => handleEquipmentClick && handleEquipmentClick("bpv_blowoff_valve")} 
                style={getDeveloperStyle && getDeveloperStyle("bpv_blowoff_valve")} 
              />

              <AtmosphereLabelSVG x={2170} y={210} />

              <IpomasMonitorCardSVG x={-180} y={700} id="blr_pres" title="BOILER PRESSURE" singleValue={getMappedValue ? getMappedValue("blr_pres", "MONITOR", "--") : "--"} singleUnit="Bar" width={140} scale={1.2} onClick={handleEquipmentClick} style={getDeveloperStyle("blr_pres")} />
              <IpomasMonitorCardSVG x={1400} y={1000} id="bpv_pres" title="PRESSURE BPV" singleValue={getMappedValue ? getMappedValue("bpv_pres", "MONITOR", "--") : "--"} singleUnit="BAR" width={200} scale={1.4} onClick={handleEquipmentClick} style={getDeveloperStyle("bpv_pres")} />

              <BpvModernStatusCardSVG
                x={200}
                y={180}
                scale={1.4}
                status={getMappedValue ? getMappedValue("bpv_status", "STATUS", "--") : "--"}
                makeup={getMappedValue ? getMappedValue("bpv_status", "MAKEUP", "--") : "--"}
                surplus={getMappedValue ? getMappedValue("bpv_status", "SURPLUS", "--") : "--"}
                pressure={getMappedValue ? getMappedValue("bpv_status", "PRESSURE", "--") : "--"}
                onClick={() => handleEquipmentClick("bpv_status")}
                style={getDeveloperStyle("bpv_status")}
              />
              {/*<BpvControlSwitchPanelSVG
                x={700}
                y={180}
                scale={1.4}
                mode={getMappedValue ? getMappedValue("bpv_control", "MODE", bpvMode) : bpvMode}
                modeAuto={getMappedValue ? getMappedValue("bpv_control", "MODE_AUTO", bpvMode === "AUTO" ? "AUTO" : "MANUAL") : (bpvMode === "AUTO" ? "AUTO" : "MANUAL")}
                modeManual={getMappedValue ? getMappedValue("bpv_control", "MODE_MANUAL", bpvMode === "MANUAL" ? "MANUAL" : "AUTO") : (bpvMode === "MANUAL" ? "MANUAL" : "AUTO")}
                makeupOpen={getMappedValue ? getMappedValue("bpv_control", "MAKEUP_OPEN", bpvMakeup === "OPEN" ? "OPEN" : "CLOSE") : (bpvMakeup === "OPEN" ? "OPEN" : "CLOSE")}
                makeupClose={getMappedValue ? getMappedValue("bpv_control", "MAKEUP_CLOSE", bpvMakeup === "CLOSE" ? "CLOSE" : "OPEN") : (bpvMakeup === "CLOSE" ? "CLOSE" : "OPEN")}
                blowoffOpen={getMappedValue ? getMappedValue("bpv_control", "BLOWOFF_OPEN", bpvBlowoff === "OPEN" ? "OPEN" : "CLOSE") : (bpvBlowoff === "OPEN" ? "OPEN" : "CLOSE")}
                blowoffClose={getMappedValue ? getMappedValue("bpv_control", "BLOWOFF_CLOSE", bpvBlowoff === "CLOSE" ? "CLOSE" : "OPEN") : (bpvBlowoff === "CLOSE" ? "CLOSE" : "OPEN")}
                onModeAuto={() => {
                  setBpvMode("AUTO");
                }}
                onModeManual={() => {
                  setBpvMode("MANUAL");
                }}
                onMakeupOpen={() => {
                  if (bpvMode === "MANUAL") {
                    setBpvMakeup("OPEN");
                    setBpvMakeupPos(100);
                  }
                }}
                onMakeupClose={() => {
                  if (bpvMode === "MANUAL") {
                    setBpvMakeup("CLOSE");
                    setBpvMakeupPos(0);
                  }
                }}
                onBlowoffOpen={() => {
                  if (bpvMode === "MANUAL") {
                    setBpvBlowoff("OPEN");
                    setBpvBlowoffPos(100);
                  }
                }}
                onBlowoffClose={() => {
                  if (bpvMode === "MANUAL") {
                    setBpvBlowoff("CLOSE");
                    setBpvBlowoffPos(0);
                  }
                }}
                onClick={() => handleEquipmentClick("bpv_control")} */}
              />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
