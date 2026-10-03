import React from 'react';

export const EquipmentImageSVG = ({ src, x, y, width = 100, height = 100, preserveAspect = true }) => (
  <image
    href={src}
    x={x}
    y={y}
    width={width}
    height={height}
    preserveAspectRatio={preserveAspect ? "xMidYMid meet" : "none"}
    style={{ pointerEvents: "none" }}
  />
);

export const OCLabelSVG = ({ x, y, label, fontSize = "18px", hasOutline = false, color = "#000000" }) => {
  const lines = String(label).split("\n");
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      style={{
        pointerEvents: "none",
        fill: color,
        fontWeight: "900",
        fontSize: fontSize,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        paintOrder: "stroke fill",
        stroke: hasOutline ? "#FFFFFF" : "none",
        strokeWidth: hasOutline ? "3px" : "0",
        strokeLinejoin: "round",
        textShadow: hasOutline ? "none" : "0 1px 2px rgba(255,255,255,0.2)",
      }}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : "1.1em"}>
          {line}
        </tspan>
      ))}
    </text>
  );
};

export const OCCardSVG = ({
  x,
  y,
  label,
  values = [],
  status = null,
  isRunning = true,
  onClick,
  tour,
  actionLabel,
  onActionClick
}) => (
  <g
    className={`svg-equipment ${isRunning ? "motor-on" : "motor-off"}`}
    onClick={onClick}
    data-tour={tour}
  >
    <foreignObject
      x={x - 65}
      y={y - 80}
      width="130"
      height="260"
      style={{ overflow: "visible" }}
    >
      <div className="som-oc-mini-card">
        <div className="som-oc-mini-header">
          <span className="som-oc-mini-label">{label}</span>
          <span
            className={`som-status-indicator ${isRunning ? "running" : "stop"}`}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isRunning ? '#22c55e' : '#ef4444',
              border: '1.5px solid #ffffff',
              boxShadow: isRunning ? '0 0 6px rgba(34, 197, 94, 0.8)' : '0 0 6px rgba(239, 68, 68, 0.8)',
              flexShrink: 0
            }}
          />
        </div>
        <div className="som-oc-mini-body">
          {values.map((v, i) => (
            <div key={i} className="som-oc-param-row">
              <span className="som-oc-param-label">{v.label}</span>
              <span
                className={`som-oc-mini-value ${v.type === "temp" ? "temp" : ""}`}
                data-unit={v.unit}
              >
                {v.value}
              </span>
            </div>
          ))}
          {status && (
            <div
              className={`som-oc-mini-status ${isRunning ? "status-running" : "status-stop"}`}
            >
              {status}
            </div>
          )}
          {actionLabel && (
            <button
              className="som-oc-card-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (onActionClick) onActionClick();
              }}
              style={{
                marginTop: '6px',
                width: '100%',
                padding: '4px 6px',
                fontSize: '9px',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                color: '#0f172a',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}
            >
              ⚙️ {actionLabel}
            </button>
          )}
        </div>
      </div>
    </foreignObject>
  </g>
);

export const MaintenanceCardSVG = ({
  x,
  y,
  id,
  label,
  params = [],
  onClick,
  width = 130,
}) => (
  <g id={id} className="svg-equipment motor-group" onClick={() => onClick(id)}>
    <foreignObject
      x={x - width / 2}
      y={y - 40}
      width={width}
      height="180"
      style={{ overflow: "visible" }}
    >
      <div className="som-maintenance-mini-card">
        <div className="som-maintenance-mini-header">
          <div className="som-maintenance-mini-title">{label}</div>
        </div>
        <div className="som-maintenance-mini-body">
          {params.map((p, idx) => (
            <div key={idx} className="som-maintenance-mini-row">
              <span className="som-maintenance-mini-row-label">{p.label}</span>
              <span className="som-maintenance-mini-row-value">
                {p.value} <small>{p.unit}</small>
              </span>
            </div>
          ))}
        </div>
      </div>
    </foreignObject>
  </g>
);

const OilClarificationOverviewTab = ({
  viewMode,
  simData = {},
  handleEquipmentClick,
  LiquidFlowSVG,
  waterGif,
  WaterBottomGif,
  pompaKananSvg,
  valveKiriSvg,
  valveAtasSvg,
  flowMeterKananSvg,
  flowMeterKiriSvg,
  onOpenAutoSkimmerModal
}) => {
  const cstX = 1085;
  const cstWidth = 310;

  return (
    <g>
      {/* Station Labels */}
      <OCLabelSVG x={588} y={150} label={"Sand Trap\nTank"} fontSize="22px" />
      <OCLabelSVG x={1635} y={410} label={"Sludge\nTank 1"} fontSize="16px" />
      <OCLabelSVG x={1854} y={410} label={"Sludge\nTank 2"} fontSize="16px" />
      <OCLabelSVG x={2076} y={410} label="POT" fontSize="16px" />
      <OCLabelSVG x={-100} y={445} label={"Vibration \nScreen 1"} fontSize="13px" />
      <OCLabelSVG x={76} y={445} label={"Vibration \nScreen 2"} fontSize="13px" />
      <OCLabelSVG x={250} y={445} label={"Vibration \nScreen 3"} fontSize="13px" />
      <OCLabelSVG x={425} y={445} label={"Vibration \nScreen 4"} fontSize="13px" />

      {/* Flow Lines */}
      <LiquidFlowSVG d="M -233,76 L 497,76" isRunning={true} color="#da8c62ff" thickness={15} />
      <LiquidFlowSVG d="M 497,311 L -234,312" isRunning={true} color="#da8c62ff" thickness={15} />
      <LiquidFlowSVG d="M -96,328 L -96,419" isRunning={true} color="#da8c62ff" thickness={15} />
      <LiquidFlowSVG d="M 80,331 L 81,414" isRunning={true} color="#da8c62ff" thickness={15} />
      <LiquidFlowSVG d="M 251,333 L 252,407" isRunning={true} color="#da8c62ff" thickness={15} />
      <LiquidFlowSVG d="M 426,333 L 428,408" isRunning={true} color="#da8c62ff" thickness={15} />
      <LiquidFlowSVG d="M 499,595 L -232,594" isRunning={true} color="#da8c62ff" thickness={15} />

      {viewMode === "process" ? (
        <g>
          <OCCardSVG
            x={590}
            y={265}
            label="Sand Trap"
            tour="oc-overview-sandtrap"
            values={[{ label: "Temp", value: simData.sandTrapTemp || "75.0", unit: "°C", type: "temp" }]}
            status="BLOWDOWN"
            isRunning={true}
            onClick={() => handleEquipmentClick("sandtrap")}
          />
          <OCCardSVG
            x={848}
            y={350}
            label="POT Pipe Flow"
            values={[{ label: "Pressure", value: simData.pressure || "20.0", unit: "bar" }]}
            isRunning={true}
            onClick={() => handleEquipmentClick("sandtrap")}
          />
          <OCCardSVG
            x={1029}
            y={350}
            label="CST Pipe Flow"
            values={[{ label: "Pressure", value: simData.pressure || "20.0", unit: "bar" }]}
            isRunning={true}
            onClick={() => handleEquipmentClick("sandtrap")}
          />
          <OCCardSVG
            x={-98}
            y={555}
            label="Vibration Screen 1"
            tour="oc-overview-vibration"
            values={[{ label: "Ampere", value: simData.vibScreen || "100" }]}
            isRunning={true}
          />
          <OCCardSVG
            x={76}
            y={555}
            label="Vibration Screen 2"
            values={[{ label: "Ampere", value: simData.vibScreen || "100" }]}
            isRunning={true}
          />
          <OCCardSVG
            x={254}
            y={555}
            label="Vibration Screen 3"
            values={[{ label: "Ampere", value: simData.vibScreen || "100" }]}
            isRunning={true}
          />
          <OCCardSVG
            x={420}
            y={555}
            label="Vibration Screen 4"
            values={[{ label: "Ampere", value: simData.vibScreen || "100" }]}
            isRunning={true}
          />
          <OCCardSVG
            x={1632}
            y={518}
            label="Sludge Tank 1"
            tour="oc-overview-sludge-tank"
            values={[
              { label: "Temp", value: simData.sludgeTemp || "90.0", unit: "°C", type: "temp" },
              { label: "Level", value: simData.sludgeLevel || "311", unit: "mm" },
              { label: "Steam", value: simData.steam || "30", unit: "%" },
            ]}
            onClick={() => handleEquipmentClick("sludge1")}
          />
          <OCCardSVG
            x={1852}
            y={518}
            label="Sludge Tank 2"
            values={[
              { label: "Temp", value: simData.sludgeTemp || "90.0", unit: "°C", type: "temp" },
              { label: "Level", value: simData.sludgeLevel || "311", unit: "mm" },
              { label: "Steam", value: simData.steam || "30", unit: "%" },
            ]}
            isRunning={true}
            onClick={() => handleEquipmentClick("sludge2")}
          />
        </g>
      ) : viewMode === "maintenance" ? (
        <g>
          <MaintenanceCardSVG
            x={605}
            y={280}
            id="m-sandtrap"
            label="M-SAND_TRAP"
            params={[
              { label: "TEMP", value: "75.2", unit: "°C" },
              { label: "VIB", value: "0.3", unit: "mm/s" },
            ]}
            onClick={handleEquipmentClick}
          />
          <MaintenanceCardSVG
            x={1240}
            y={425}
            id="m-cst"
            label="M-CST_TANK"
            params={[
              { label: "TEMP", value: "90.1", unit: "°C" },
              { label: "LEVEL", value: "311", unit: "mm" },
              { label: "VIB", value: "0.5", unit: "mm/s" },
            ]}
            onClick={handleEquipmentClick}
          />
        </g>
      ) : null}

      {/* WATER GIF ANIMATION PADA TANGKI CST */}
      <g>
        {/* 1. CPO Layer */}
        <foreignObject
          x={cstX}
          y={253}
          width={cstWidth}
          height={55}
          style={{ pointerEvents: "none", overflow: "hidden" }}
        >
          <div style={{ width: "100%", height: "100%" }}>
            <img
              src={waterGif}
              alt="CPO Water Layer"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "fill",
                opacity: 0.85,
                display: "block",
                filter: "sepia(1) saturate(2.5) hue-rotate(350deg) brightness(0.95)"
              }}
            />
          </div>
        </foreignObject>

        {/* 2. Water Layer */}
        <foreignObject
          x={cstX}
          y={305}
          width={cstWidth}
          height={150}
          style={{ pointerEvents: "none", overflow: "hidden" }}
        >
          <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
            <img
              src={WaterBottomGif}
              alt="Water Layer"
              style={{
                width: "100%",
                height: "calc(100% + 20px)",
                marginTop: "-20px",
                objectFit: "fill",
                opacity: 0.8,
                display: "block"
              }}
            />
          </div>
        </foreignObject>
      </g>

      <OCLabelSVG x={1235} y={380} label="CST" fontSize="26px" color="#000000" hasOutline={true} />
      <OCCardSVG
        x={1240}
        y={478}
        label="CST Tank 1"
        values={[
          { label: "Temp", value: simData.sludgeTemp || "90.0", unit: "°C", type: "temp" },
          { label: "Level", value: simData.sludgeLevel || "311", unit: "mm" },
          { label: "Steam", value: simData.steam || "30", unit: "%" },
        ]}
        actionLabel="AUTO SKIMMER"
        onActionClick={() => {
          if (onOpenAutoSkimmerModal) onOpenAutoSkimmerModal(1);
        }}
        onClick={() => handleEquipmentClick("cst1")}
      />
      <EquipmentImageSVG src={pompaKananSvg} x={770} y={761} width={108} height={108} preserveAspect={false} />
      <EquipmentImageSVG src={valveKiriSvg} x={-168} y={340} width={90} height={90} preserveAspect={false} />
      <EquipmentImageSVG src={valveAtasSvg} x={705} y={390} width={75} height={75} preserveAspect={false} />
      <EquipmentImageSVG src={flowMeterKananSvg} x={938} y={370} width={70} height={80} preserveAspect={false} />
      <EquipmentImageSVG src={flowMeterKiriSvg} x={867} y={370} width={70} height={80} preserveAspect={false} />
    </g>
  );
};

export default OilClarificationOverviewTab;
