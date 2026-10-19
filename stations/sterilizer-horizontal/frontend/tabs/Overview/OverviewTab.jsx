import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import "./OverviewTab.css";

import SterilizerStationSettingsPage from "../../settings/SterilizerStationSettingsPage.jsx";
import usePlcStore from "@core/store";

// Auth helper (sama seperti di PlcConfigView)
const authHeaders = () => {
  const token = localStorage.getItem("kip_token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Assets
import sterilizerStationImageUrl from "../../assets/sterilizer-station.webp";
import sterilizerLineImageUrl from "../../assets/sterilizer-line.webp";
import bpvImageUrl from "../../assets/bpv.webp";
import valveActuatorSvg from "../../assets/item/valve_actuator.svg";
import valvePositionerSvg from "../../assets/item/valve_positioner.svg";

import {
  IpomasMonitorCardSVG,
  EquipmentIconSVG,
} from "../../components/SharedComponents.jsx";
import {
  CoordinatePickerPanel,
  CoordinatePickerMarkers,
} from "@core/components/CoordinatePickerPanel.jsx";
const formatDoorStatus = (rawVal) => {
  if (rawVal === undefined || rawVal === null) return "CLOSE";
  if (rawVal === "--") return "--";
  if (typeof rawVal === "boolean") {
    return rawVal ? "CLOSE" : "OPEN";
  }
  const str = String(rawVal).toLowerCase().trim();
  if (str === "no tag") return "NO TAG";
  if (str === "--") return "--";
  if (str === "true" || str === "1") return "CLOSE";
  if (str === "false" || str === "0") return "OPEN";
  if (str === "open" || str === "close") return str.toUpperCase();
  return "CLOSE";
};

const formatValveStatus = (rawVal) => {
  if (rawVal === undefined || rawVal === null) return "CLOSE";
  if (rawVal === "--") return "--";
  if (typeof rawVal === "boolean") {
    return rawVal ? "OPEN" : "CLOSE";
  }
  const str = String(rawVal).toLowerCase().trim();
  if (str === "no tag") return "NO TAG";
  if (str === "--") return "--";
  if (str === "true" || str === "1" || str === "open") return "OPEN";
  if (str === "false" || str === "0" || str === "close") return "CLOSE";
  const num = parseFloat(rawVal);
  if (!isNaN(num)) {
    return num > 0 ? "OPEN" : "CLOSE";
  }
  return "CLOSE";
};

/**
 * Custom hook for hover effects and sound
 */
function useAmpHover() {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);
  const [popupPos, setPopupPos] = useState(null);
  const hoverTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setPopupPos({
        top: rect.top,
        right: rect.right,
        left: rect.left,
        bottom: rect.bottom,
      });
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setPopupPos(null);
    }, 150);
  };

  const handlePopupMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(true);
  };

  const handlePopupMouseLeave = () => {
    setIsHovered(false);
    setPopupPos(null);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  return {
    cardRef,
    isHovered,
    popupPos,
    handleMouseEnter,
    handleMouseLeave,
    handlePopupMouseEnter,
    handlePopupMouseLeave,
  };
}

/**
 * Trend Popup component (Portaled)
 */
function StatusGraphPopup({
  position,
  equipmentName,
  type = "Pressure",
  value = 0,
  unit = "Bar",
  onMouseEnter,
  onMouseLeave,
  history = [],
}) {
  const popupRef = useRef(null);
  const [style, setStyle] = useState({ opacity: 0, pointerEvents: "none" });

  useEffect(() => {
    if (!position || !popupRef.current) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupWidth = 450;
    const popupHeight = 400;
    const padding = 20;

    let left = position.right + 15;
    let top = position.top - 10;

    if (left + popupWidth > viewportWidth - padding) {
      left = position.left - popupWidth - 15;
    }
    if (top + popupHeight > viewportHeight - padding) {
      top = viewportHeight - popupHeight - padding;
    }
    if (top < padding) top = padding;
    if (left < padding) left = padding;

    setStyle({
      top: `${top}px`,
      left: `${left}px`,
      opacity: 1,
      pointerEvents: "auto",
    });
  }, [position]);

  const width = 400;
  const height = 200;
  const plotLeft = 40;
  const plotRight = 360;
  const plotTop = 20;
  const plotBottom = 160;
  const maxRange = type === "Pressure" ? 3 : 150;

  const yAxisTicks = useMemo(() => {
    if (type === "Pressure") return [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
    return [0, 50, 100, 150];
  }, [type]);

  const xAxisTicks = useMemo(() => {
    const labels = [];
    const now = new Date();
    const ticksCount = 10; // 5 hours / 30 mins
    for (let i = 0; i <= ticksCount; i++) {
      const t = new Date(now.getTime() - (ticksCount - i) * 30 * 60000);
      labels.push({
        label: t.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":"),
        x: plotLeft + ((plotRight - plotLeft) * i) / ticksCount,
      });
    }
    return labels;
  }, [plotLeft, plotRight]);

  const isOffline = value === "--";

  const formattedValue = useMemo(() => {
    if (isOffline) return "--";
    const num = parseFloat(value);
    return isNaN(num) ? String(value) : num.toFixed(1);
  }, [value, isOffline]);

  const points = useMemo(() => {
    if (isOffline) return [];

    // Fallback to flat line if no history data is available
    const dataPoints = (history && history.length > 0)
      ? history
      : Array.from({ length: 20 }).fill(parseFloat(value) || 0);

    const len = dataPoints.length;
    return dataPoints.map((val, i) => {
      const x = plotLeft + ((plotRight - plotLeft) * i) / (len - 1 || 1);
      const yVal = Math.max(0, parseFloat(val) || 0);
      const maxRange = type === "Pressure" ? 3 : 150;
      const t = yVal / maxRange;
      const y = plotBottom - t * (plotBottom - plotTop);
      return { x, y };
    });
  }, [value, type, history, isOffline]);

  const polyPoints = useMemo(() => {
    return points.map((p) => `${p.x},${p.y}`).join(" ");
  }, [points]);

  return createPortal(
    <div
      ref={popupRef}
      className="som-amp-popup"
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="som-amp-popup-header">
        <div className="som-amp-popup-title">{type} Trend</div>
        <div className="som-amp-popup-subtitle">
          <span>{equipmentName}</span>
          <span>
            Current: {formattedValue} {unit}
          </span>
        </div>
      </div>
      <div className="som-amp-popup-body">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="som-amp-graph-svg"
        >
          <defs>
            <linearGradient
              id="trendGradient"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#ffdb3b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ffdb3b" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <rect
            x={plotLeft}
            y={plotTop}
            width={plotRight - plotLeft}
            height={plotBottom - plotTop}
            fill="rgba(248, 250, 252, 0.5)"
            rx="4"
          />
          {/* Y-Axis & Horizontal Grid */}
          {yAxisTicks.map((tick, i) => {
            const y = plotBottom - (tick / maxRange) * (plotBottom - plotTop);
            return (
              <g key={`y-${i}`}>
                <line x1={plotLeft} y1={y} x2={plotRight} y2={y} stroke="#e2e8f0" strokeDasharray="2 2" />
                <text x={plotLeft - 5} y={y} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#64748b" fontWeight="600">
                  {tick}
                </text>
              </g>
            );
          })}
          
          {/* X-Axis & Vertical Grid */}
          {xAxisTicks.map((tick, i) => (
            <g key={`x-${i}`}>
              <line x1={tick.x} y1={plotTop} x2={tick.x} y2={plotBottom} stroke="#e2e8f0" strokeDasharray="2 2" />
              <text x={tick.x} y={plotBottom + 12} textAnchor="end" fontSize="9" fill="#64748b" fontWeight="600" transform={`rotate(-45, ${tick.x}, ${plotBottom + 12})`}>
                {tick.label}
              </text>
            </g>
          ))}

          {/* Border lines */}
          <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke="#94a3b8" />
          <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke="#94a3b8" />
          {isOffline ? (
            <text
              x={(plotLeft + plotRight) / 2}
              y={(plotTop + plotBottom) / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#94a3b8"
              fontSize="12"
              fontWeight="800"
              fontStyle="italic"
            >
              OFFLINE / NO CONNECTION
            </text>
          ) : (
            <>
              {polyPoints && (
                <>
                  <polygon
                    className="som-amp-graph-area"
                    points={`${plotLeft},${plotBottom} ${polyPoints} ${plotRight},${plotBottom}`}
                    style={{ fill: "url(#trendGradient)" }}
                  />
                  <polyline
                    className="som-amp-graph-line-main"
                    points={polyPoints}
                    fill="none"
                    stroke="#d4ac0d"
                    strokeWidth="2"
                  />
                </>
              )}
              {points.length <= 30 && points.map((p, idx) => (
                <circle key={idx} cx={p.x} cy={p.y} r="2.5" fill="#d4ac0d" />
              ))}
            </>
          )}
        </svg>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Reusable Valve SVG Component
 */
const ValveSVG = ({
  x,
  y,
  id,
  type = "actuator",
  status,
  opening,
  label,
  onClick,
  size = 50,
  labelYOffset,
  labelXOffset,
  labelWidth = 60,
  style,
}) => {
  const isNoTag = status.toUpperCase() === "NO TAG";
  const isOpen =
    !isNoTag && (status.toLowerCase() === "open" || (opening !== undefined && opening > 0));
  const icon = type === "positioner" ? valvePositionerSvg : valveActuatorSvg;
  const statusClass = isNoTag ? "valve-off" : isOpen ? "valve-on" : "valve-off";

  const offset = size / 2;
  // Jika labelYOffset tidak diisi, otomatis ditaruh di bawah ikon
  const ly = labelYOffset !== undefined ? labelYOffset : offset - 78;
  const lx = labelXOffset !== undefined ? labelXOffset : offset - 10;

  return (
    <g
      id={id}
      className={`svg-equipment valve-group ${statusClass}`}
      onClick={() => onClick(id)}
      style={style}
    >
      <image
        href={icon}
        x={x - offset}
        y={y - offset}
        width={size}
        height={size}
      />
      <foreignObject x={x + lx} y={y + ly} width={labelWidth} height="45">
        <div
          className="som-sterilizer-mini-card compact"
          style={{
            border: "none",
            background: "transparent",
            boxShadow: "none",
          }}
        >
          <span className="som-mini-label" style={{ textAlign: "center" }}>
            {label}
          </span>
          <span
            className={`som-mini-value ${isNoTag ? "" : isOpen ? "som-mini-value--open" : "som-mini-value--closed"}`}
            style={{
              textAlign: "center",
              color: isNoTag ? "#94a3b8" : undefined,
              fontStyle: isNoTag ? "italic" : "normal",
            }}
          >
            {status}
          </span>
        </div>
      </foreignObject>
    </g>
  );
};

/**
 * Reusable Sensor SVG Component
 */
const SensorCardSVG = ({
  x,
  y,
  id,
  label,
  value,
  unit,
  equipmentName,
  trendType,
  onClick,
  size = 90,
  style,
  trendData = {},
}) => {
  const {
    cardRef,
    isHovered,
    popupPos,
    handleMouseEnter,
    handleMouseLeave,
    handlePopupMouseEnter,
    handlePopupMouseLeave,
  } = useAmpHover();

  const isNoTag = value === "No Tag";
  const isActive = !isNoTag && (parseFloat(value) > 0 || String(value).toLowerCase() === "ripe");

  const history = useMemo(() => {
    if (!trendData) return [];
    if (id === "main_steam_pipe_flow") return trendData.main_steam || [];
    if (id === "bpv_pres" || id === "bpv_pressure") return trendData.bpv_press || [];

    const match = id.match(/^st(\d)_(pressure|temp)$/);
    if (match) {
      const lineNum = match[1];
      const type = match[2];
      if (type === 'pressure') {
        return trendData[`s${lineNum}_press`] || [];
      } else {
        return trendData[`s${lineNum}_temp`] || [];
      }
    }
    return [];
  }, [id, trendData]);

  return (
    <g
      id={id}
      className="svg-equipment sensor-group"
      onClick={() => onClick(id)}
      style={style}
    >
      <foreignObject
        x={x - 150}
        y={y - 35}
        width="300"
        height="70"
        style={{ overflow: "visible" }}
      >
        <div
          style={{ display: "flex", justifyContent: "center", width: "100%" }}
        >
          <div
            ref={cardRef}
            className="som-motor-mini-card"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: "pointer" }}
          >
            <div className="som-motor-mini-header">
              <span className="som-motor-mini-label">{equipmentName}</span>
              <div
                className={`som-status-indicator ${isNoTag ? "" : isActive ? "running" : "stop"}`}
                style={isNoTag ? { background: '#94a3b8', boxShadow: 'none', animation: 'none' } : {}}
              ></div>
            </div>
            <div
              className="som-motor-mini-body"
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "baseline",
                gap: "5px",
              }}
            >
              {isNoTag ? (
                <span
                  className="som-motor-mini-value"
                  style={{
                    fontSize: "20px",
                    color: "#94a3b8",
                    fontStyle: "italic",
                  }}
                >
                  no tag
                </span>
              ) : (
                <>
                  <span
                    className="som-motor-mini-value"
                    style={{ fontSize: "20px" }}
                  >
                    {typeof value === 'number' ? value.toFixed(1) : (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value)) ? Number(value).toFixed(1) : value)}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "800",
                      color: "#94a3b8",
                    }}
                  >
                    {unit}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </foreignObject>
      {!isNoTag && isHovered && popupPos && (trendType === "Pressure" || trendType === "Temperature") && !id.includes("inlet_steam") && (
        <StatusGraphPopup
          position={popupPos}
          equipmentName={equipmentName}
          type={trendType}
          value={value}
          unit={unit}
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
          history={history}
        />
      )}
    </g>
  );
};

/**
 * Reusable Door SVG Component
 */
const DoorCardSVG = ({ x, y, id, label, status, onClick, size = 90, style }) => {
  const s = status.toLowerCase();
  const isNoTag = s === "no tag";
  const isOffline = s === "--";
  const isOpen = !isNoTag && !isOffline && (s === "open" || s === "unlock");

  return (
    <g id={id} className="svg-equipment door-group" onClick={() => onClick(id)} style={style}>
      <foreignObject
        x={x - 150}
        y={y - 30}
        width="300"
        height="60"
        style={{ overflow: "visible" }}
      >
        <div
          style={{ display: "flex", justifyContent: "center", width: "100%" }}
        >
          <div className="som-motor-mini-card">
            <div className="som-motor-mini-header">
              <span className="som-motor-mini-label">{label}</span>
              <div
                className={`som-status-indicator ${(isNoTag || isOffline) ? "" : isOpen ? "running" : "stop"}`}
                style={(isNoTag || isOffline) ? { background: '#94a3b8', boxShadow: 'none', animation: 'none' } : {}}
              ></div>
            </div>
            <div
              className="som-motor-mini-body"
              style={{ justifyContent: "center", alignItems: "center" }}
            >
              <span
                className={`som-motor-mini-value`}
                style={{
                  color: (isNoTag || isOffline) ? "#94a3b8" : isOpen ? "#10b981" : "#ef4444",
                  fontStyle: (isNoTag || isOffline) ? "italic" : "normal",
                }}
              >
                {status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

/**
 * Reusable Flow Animation Component (Liquid Neon Flow)
 * Matched with IPOMAS - 2 layers only (glow + aura)
 */
const SteamFlowSVG = ({ d, active, mode = "flowing", color = "#a9dbe1ff" }) => {
  if (!active) return null;

  let modeClass = "liquid-flow--flowing";
  if (mode === "standby") modeClass = "liquid-flow--standby";
  if (mode === "liquid") modeClass = "liquid-flow--liquid";

  return (
    <g className={modeClass}>
      <path
        d={d}
        fill="none"
        stroke={color}
        className="liquid-flow-glow"
        pointerEvents="none"
      />
      <path
        d={d}
        fill="none"
        stroke={color}
        className="liquid-flow-aura"
        pointerEvents="none"
      />
    </g>
  );
};

/**
 * Reusable Maintenance SVG Component (MEWAH HUD Style)
 */
const MaintenanceCardSVG = ({
  x,
  y,
  id,
  label,
  params = [],
  onClick,
  width = 300,
  style,
}) => (
  <g
    id={id}
    className="svg-equipment motor-group maintenance-card-group"
    onClick={() => onClick && onClick(id)}
    style={style}
  >
    <foreignObject
      x={x - width / 2}
      y={y - 40}
      width={width}
      height="120"
      style={{ overflow: "visible" }}
    >
      <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
        <div className="som-motor-mini-card maintenance-card">
          <div className="som-motor-mini-header">
            <div className="som-motor-mini-label">{label}</div>
            <div className="som-maintenance-mini-icon">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
              </svg>
            </div>
          </div>
          <div className="som-motor-mini-body">
            {params.map((p, idx) => {
              let displayValue = p.value;
              if (p.value !== null && p.value !== undefined) {
                if (typeof p.value === 'number') {
                  displayValue = p.value.toFixed(1);
                } else if (typeof p.value === 'string' && p.value.trim() !== '' && !isNaN(Number(p.value))) {
                  displayValue = Number(p.value).toFixed(1);
                }
              }
              return (
                <div key={idx} className="som-motor-param-row">
                  <span className="som-motor-param-label">{p.label}</span>
                  <span className="som-motor-mini-value" data-unit={p.unit}>
                    {displayValue}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </foreignObject>
  </g>
);

/**
 * Title/Label component
 */
// Definisikan filter ini di dalam SVG parent kamu (sekali saja)

// Component nya
const StationLabelSVG = ({ x, y, label }) => (
  <text
    x={x}
    y={y}
    className="som-line-badge-svg"
    textAnchor="middle"
    dominantBaseline="middle"
    filter="url(#yellow-glow)"
    style={{
      pointerEvents: "none",
      fill: "#000000ff",
      fontWeight: "900",
      fontSize: "24px",
      textTransform: "uppercase",
      opacity: 100,
    }}
  >
    {label}
  </text>
);

/**
 * Summary Table Component
 */
const SummaryTableSVG = ({ x, y, id, title, data, onClick, style }) => (
  <foreignObject x={x} y={y} width="320" height="230">
    <div
      className="som-dig-card"
      id={id}
      onClick={() => onClick && onClick(id)}
      style={{ cursor: onClick ? "pointer" : "default", ...style }}
    >
      <div className="som-dig-card-header" style={{ textAlign: "center" }}>
        {title}
      </div>
      <div className="som-dig-card-body">
        {data.map((row, i) => {
          let displayValue = row.value;
          if (row.label.toLowerCase() === "status") {
            const s = String(row.value).trim();
            if (s === "0") displayValue = "EMERGENCY";
            else if (s === "1") displayValue = "RUN";
            else if (s === "2") displayValue = "STOP";
            else if (s === "--") displayValue = "--";
            else if (s === "no tag") displayValue = "no tag";
          } else {
            if (row.value !== null && row.value !== undefined) {
              if (typeof row.value === 'number') {
                displayValue = row.value.toFixed(1);
              } else if (typeof row.value === 'string' && row.value.trim() !== '' && !isNaN(Number(row.value))) {
                displayValue = Number(row.value).toFixed(1);
              }
            }
          }
          return (
            <div key={i} className="som-dig-row">
              <span className="som-dig-label" style={{ fontSize: "11px" }}>
                {row.label}
              </span>
              <div
                style={{ display: "flex", alignItems: "baseline", gap: "4px" }}
              >
                <span className="som-dig-value" style={{ fontSize: "15px" }}>
                  {displayValue}
                </span>
                <span className="som-dig-unit" style={{ fontSize: "11px" }}>
                  {row.unit}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  </foreignObject>
);

const SettingsCardSVG = ({
  x,
  y,
  titleAuto,
  titleManual,
  dataAuto,
  dataManual,
  width = 580,
}) => (
  <foreignObject x={x} y={y} width={width} height="500">
    <div className="som-minimal-card">
      <div className="som-minimal-header">{titleAuto}</div>
      <div className="som-minimal-body">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
          }}
        >
          {dataAuto.map((row, i) => (
            <div
              key={i}
              className="som-minimal-row"
              style={{ borderBottom: "none" }}
            >
              <span className="som-minimal-label">{row.label}</span>
              <div>
                <span
                  className="som-minimal-value"
                  style={{ color: "#d4ac0d" }}
                >
                  {row.value}
                </span>
                <span className="som-minimal-unit">{row.unit}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="som-minimal-divider" />
        <div className="som-minimal-section-title">{titleManual}</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
          }}
        >
          {dataManual.map((row, i) => (
            <div
              key={i}
              className="som-minimal-row"
              style={{ borderBottom: "none" }}
            >
              <span className="som-minimal-label">{row.label}</span>
              <div>
                <span
                  className="som-minimal-value"
                  style={{ color: "#d4ac0d" }}
                >
                  {row.value}
                </span>
                <span className="som-minimal-unit">{row.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </foreignObject>
);

const StatusTableCardSVG = ({
  x,
  y,
  id,
  title,
  data,
  leftData,
  rightData,
  width = 450,
  height = 650,
  onClick,
  onInputClick,
  style,
  configMode = false,
}) => {
  const isTwoColumn = Boolean(leftData && rightData);

  const renderRow = (row, i) => {
    let displayValue = row.value;
    if (row.label && row.label.toLowerCase() === "status") {
      const s = String(row.value).trim();
      if (s === "0") displayValue = "EMERGENCY";
      else if (s === "1") displayValue = "RUN";
      else if (s === "2") displayValue = "STOP";
      else if (s === "--") displayValue = "--";
      else if (s === "no tag") displayValue = "no tag";
    }

    const isNoTag = String(displayValue).trim().toLowerCase() === "no tag";
    const labelFontSize = isTwoColumn ? "16px" : (row.isInput ? "16px" : "24px");
    const inputWidth = isTwoColumn ? "85px" : "100px";

    return (
      <div
        key={`${id}-${row.signalKey || row.label || i}`}
        className="som-minimal-row"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isTwoColumn ? "4px 0" : (row.isInput ? "6px 0" : "8px 0"),
          borderBottom: isTwoColumn ? "none" : undefined,
          cursor: configMode ? "pointer" : "default",
        }}
        onClick={(e) => {
          if (configMode && onClick) {
            e.stopPropagation();
            onClick(id);
          }
        }}
      >
        <span
          className="som-minimal-label"
          style={{
            color: "black",
            fontSize: labelFontSize,
            fontWeight: "800",
            letterSpacing: "0.01em",
          }}
        >
          {row.label}
        </span>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          {row.isInput ? (
            <input
              type="text"
              className="som-minimal-input"
              value={displayValue}
              readOnly
              onClick={(e) => {
                if (configMode) {
                  e.stopPropagation();
                  if (onClick) onClick(id);
                  return;
                }
                e.stopPropagation();
                if (onInputClick) onInputClick(row);
              }}
              style={{
                width: inputWidth,
                height: "32px",
                textAlign: isNoTag ? "center" : "right",
                color: row.isEdited ? "#1e40af" : "black",
                background: row.isEdited ? "#fef08a" : "white",
                border: "1.5px solid #94a3b8",
                borderRadius: "6px",
                padding: "2px 8px",
                marginRight: "6px",
                fontSize: isNoTag ? "13px" : "18px",
                fontWeight: "bold",
                outline: "none",
                cursor: "pointer",
              }}
            />
          ) : (
            <span
              className="som-minimal-value"
              style={{ color: "black", fontSize: isNoTag ? "16px" : "24px" }}
            >
              {displayValue}
            </span>
          )}
          {row.unit ? (
            <span
              className="som-minimal-unit"
              style={{
                color: "black",
                fontSize: isTwoColumn ? "16px" : "20px",
                fontWeight: "bold",
                minWidth: isTwoColumn ? "28px" : undefined,
                display: isTwoColumn ? "inline-block" : undefined,
                visibility: isNoTag ? "hidden" : "visible",
              }}
            >
              {row.unit}
            </span>
          ) : (
            isTwoColumn && <span style={{ minWidth: "28px", display: "inline-block" }} />
          )}
        </div>
      </div>
    );
  };

  return (
    <foreignObject x={x} y={y} width={width} height={height}>
      <div
        className="som-minimal-card"
        id={id}
        onClick={() => onClick && onClick(id)}
        style={{
          cursor: onClick ? "pointer" : "default",
          borderRadius: "12px",
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
          overflow: "hidden",
          ...style,
        }}
      >
        <div
          className="som-minimal-header"
          style={{
            background: "#ffdb3b",
            color: "#0f172a",
            fontWeight: "900",
            fontSize: "13px",
            letterSpacing: "0.08em",
            padding: "8px 12px",
            textAlign: "center",
          }}
        >
          {title}
        </div>
        <div
          className="som-minimal-body"
          style={{
            padding: isTwoColumn ? "8px 16px" : "12px 20px",
          }}
        >
          {isTwoColumn ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                columnGap: "24px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {leftData.map((row, i) => renderRow(row, `left-${i}`))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {rightData.map((row, i) => renderRow(row, `right-${i}`))}
              </div>
            </div>
          ) : (
            data && data.map((row, i) => renderRow(row, i))
          )}
        </div>
      </div>
    </foreignObject>
  );
};

function NumericKeypad({ value, onConfirm, onClose, label, unit }) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (typeof value === 'number') {
      return Number.isInteger(value) ? value.toString() : value.toFixed(1);
    }
    if (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) {
      return value;
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
    <div className="som-numeric-keypad-backdrop" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
      <div className="som-numeric-keypad" onClick={e => e.stopPropagation()} style={{ width: '320px', background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        <div className="som-numeric-keypad-header" style={{ padding: '14px 18px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="som-numeric-keypad-label" style={{ fontWeight: '800', fontSize: '13px', color: '#1e293b' }}>{label}</span>
          <button style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }} onClick={onClose}>✕</button>
        </div>
        <div className="som-numeric-keypad-display" style={{ padding: '12px 16px', margin: '14px 16px 0 16px', background: '#ffffff', border: '2px solid #e2e8f0', borderRadius: '12px', color: '#0f172a', fontSize: '28px', fontWeight: '900', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: '6px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)' }}>
          <span className="som-numeric-keypad-value" style={{ color: '#0f172a' }}>{displayValue}</span>
          {unit && <span className="som-numeric-keypad-unit" style={{ fontSize: '15px', color: '#475569', fontWeight: '800' }}>{unit}</span>}
        </div>
        <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(n => (
            <button type="button" key={n} onClick={() => handleNumber(n)} style={btnStyle}>{n}</button>
          ))}
          <button type="button" onClick={handleDecimal} style={btnStyle}>.</button>
          <button type="button" onClick={() => handleNumber(0)} style={btnStyle}>0</button>
          <button type="button" onClick={handleBack} style={{ ...btnStyle, background: '#f1f5f9' }}>⌫</button>
          <button type="button" onClick={() => setDisplayValue('0')} style={{ gridColumn: 'span 1', padding: '12px', background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>CLEAR</button>
          <button type="button" onClick={handleEnter} style={{ gridColumn: 'span 2', padding: '12px', background: '#F59E0B', border: 'none', color: 'white', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>ENTER (WRITE PLC)</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Custom IPOMAS Valve Modern Card */
const ValveModernCardSVG = ({
  x,
  y,
  scale = 1,
  title = "",
  command = "CLOSE",
  position = "0.0",
  onClick,
}) => {
  const isOpen = command === "OPEN";
  return (
    <g
      transform={`translate(${x}, ${y}) scale(${scale}) translate(-100, -65)`}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      <foreignObject width="200" height="130" style={{ overflow: "visible" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
            padding: "12px",
            fontFamily: "'Inter', sans-serif",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div
            style={{
              textAlign: "center",
              fontSize: "12px",
              fontWeight: "950",
              color: "#0f172a",
              borderBottom: "2px solid #ffdb3b",
              paddingBottom: "6px",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  color: "#64748b",
                  fontWeight: "800",
                }}
              >
                COMMAND
              </span>
              <div
                style={{
                  padding: "2px 10px",
                  borderRadius: "4px",
                  background: isOpen ? "#f1fdf3" : "#fef2f2",
                  border: `1px solid ${isOpen ? "#1FE921" : "#EF4444"}`,
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: isOpen ? "#1FE921" : "#EF4444",
                    fontWeight: "900",
                  }}
                >
                  {command}
                </span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginTop: "5px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  color: "#64748b",
                  fontWeight: "800",
                  marginBottom: "2px",
                }}
              >
                POSITION
              </span>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "24px",
                  background: "#f1f5f9",
                  borderRadius: "6px",
                  overflow: "hidden",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    width: `${position}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, #ffdb3b, #d4ac0d)`,
                    transition: "width 0.5s ease",
                  }}
                ></div>
                <div
                  style={{
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
                    color: "#0f172a",
                  }}
                >
                  {position}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

/** Custom IPOMAS BPV Status Card */
const BpvModernStatusCardSVG = ({
  x,
  y,
  scale = 1,
  status = "EMERGENCY",
  makeup = "OPEN",
  surplus = "OPEN",
  pressure = "0.0",
  onClick,
}) => {
  return (
    <g
      transform={`translate(${x}, ${y}) scale(${scale}) translate(-160, -90)`}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      <foreignObject width="320" height="180" style={{ overflow: "visible" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
            padding: "15px",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <div
            style={{
              textAlign: "center",
              fontSize: "14px",
              fontWeight: "950",
              color: "#0f172a",
              borderBottom: "2px solid #ffdb3b",
              paddingBottom: "8px",
              marginBottom: "12px",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            BACK PRESSURE VESSEL
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  fontWeight: "800",
                }}
              >
                STATUS
              </span>
              <span
                style={{
                  fontSize: "14px",
                  color: status === "EMERGENCY" ? "#EF4444" : "#1FE921",
                  fontWeight: "950",
                }}
              >
                {status}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  fontWeight: "800",
                }}
              >
                MAKE-UP
              </span>
              <span
                style={{
                  fontSize: "14px",
                  color: makeup === "OPEN" ? "#1FE921" : "#64748b",
                  fontWeight: "950",
                }}
              >
                {makeup}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  fontWeight: "800",
                }}
              >
                SURPLUS
              </span>
              <span
                style={{
                  fontSize: "14px",
                  color: surplus === "OPEN" ? "#1FE921" : "#64748b",
                  fontWeight: "950",
                }}
              >
                {surplus}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  fontWeight: "800",
                }}
              >
                PRESSURE
              </span>
              <div
                style={{ display: "flex", alignItems: "baseline", gap: "4px" }}
              >
                <span
                  style={{
                    fontSize: "22px",
                    color: "#d4ac0d",
                    fontWeight: "950",
                  }}
                >
                  {pressure}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    fontWeight: "bold",
                  }}
                >
                  BAR
                </span>
              </div>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

/** Custom IPOMAS Atmosphere Label */
const AtmosphereLabelSVG = ({ x, y }) => (
  <g transform={`translate(${x}, ${y})`}>
    <path
      d="M -25,-18 L 25,-18 M 15,-25 L 25,-18 L 15,-11"
      stroke="rgba(255,255,255,0.8)"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <text
      x="0"
      y="0"
      textAnchor="middle"
      dominantBaseline="middle"
      style={{
        fill: "rgba(255,255,255,0.8)",
        fontWeight: "900",
        fontSize: "15px",
        textTransform: "uppercase",
        letterSpacing: "1px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      To Atmosfer
    </text>
  </g>
);

/** Custom IPOMAS BPV Control Switch Panel */
const BpvControlSwitchPanelSVG = ({
  x,
  y,
  scale = 1,
  mode = "MANUAL",
  makeup = "CLOSE",
  blowoff = "OPEN",
  onModeToggle,
  onMakeupToggle,
  onBlowoffToggle,
}) => {
  return (
    <g
      transform={`translate(${x}, ${y}) scale(${scale}) translate(-180, -75)`}
      className="bpv-modern-control-group"
    >
      <foreignObject width="360" height="150" style={{ overflow: "visible" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
            padding: "15px",
            display: "flex",
            flexDirection: "column",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <div
            style={{
              textAlign: "center",
              fontSize: "14px",
              fontWeight: "950",
              color: "#0f172a",
              borderBottom: "2px solid #ffdb3b",
              paddingBottom: "10px",
              marginBottom: "15px",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            CONTROL PANEL
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            {/* MODE SECTION */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  color: "#64748b",
                  fontWeight: "800",
                  marginBottom: "6px",
                }}
              >
                MODE
              </span>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onModeToggle();
                }}
                style={{
                  display: "flex",
                  background: "#f8fafc",
                  padding: "3px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  width: "100%",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "10px",
                    fontWeight: "950",
                    padding: "6px 0",
                    borderRadius: "6px",
                    background: mode === "AUTO" ? "#ffdb3b" : "transparent",
                    color: "#0f172a",
                  }}
                >
                  AUTO
                </div>
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "10px",
                    fontWeight: "950",
                    padding: "6px 0",
                    borderRadius: "6px",
                    background: mode === "MANUAL" ? "#fbbf24" : "transparent",
                    color: "#0f172a",
                  }}
                >
                  MAN
                </div>
              </div>
            </div>

            {/* MAKE-UP SECTION */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  color: "#64748b",
                  fontWeight: "800",
                  marginBottom: "6px",
                }}
              >
                MAKE-UP
              </span>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onMakeupToggle();
                }}
                style={{
                  display: "flex",
                  background: "#f8fafc",
                  padding: "3px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  width: "100%",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "10px",
                    fontWeight: "950",
                    padding: "6px 0",
                    borderRadius: "6px",
                    background: makeup === "OPEN" ? "#1FE921" : "transparent",
                    color: makeup === "OPEN" ? "#fff" : "#64748b",
                  }}
                >
                  OPEN
                </div>
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "10px",
                    fontWeight: "950",
                    padding: "6px 0",
                    borderRadius: "6px",
                    background: makeup === "CLOSE" ? "#EF4444" : "transparent",
                    color: makeup === "CLOSE" ? "#fff" : "#64748b",
                  }}
                >
                  CLOSE
                </div>
              </div>
            </div>

            {/* BLOW-OFF SECTION */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  color: "#64748b",
                  fontWeight: "800",
                  marginBottom: "6px",
                }}
              >
                BLOW-OFF
              </span>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onBlowoffToggle();
                }}
                style={{
                  display: "flex",
                  background: "#f8fafc",
                  padding: "3px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  width: "100%",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "10px",
                    fontWeight: "950",
                    padding: "6px 0",
                    borderRadius: "6px",
                    background: blowoff === "OPEN" ? "#1FE921" : "transparent",
                    color: blowoff === "OPEN" ? "#fff" : "#64748b",
                  }}
                >
                  OPEN
                </div>
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "10px",
                    fontWeight: "950",
                    padding: "6px 0",
                    borderRadius: "6px",
                    background: blowoff === "CLOSE" ? "#EF4444" : "transparent",
                    color: blowoff === "CLOSE" ? "#fff" : "#64748b",
                  }}
                >
                  CLOSE
                </div>
              </div>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

const TagEditorModal = ({
  data,
  onClose,
  onSave,
  tagMap,
  availableTags = [],
  saving,
}) => {
  const [localTags, setLocalTags] = useState({});

  useEffect(() => {
    if (data) {
      const initial = {};

      if (data.signals && data.signals.length > 0) {
        data.signals.forEach((sig) => {
          const key = `${data.targetId}__${sig.key}`;
          initial[key] = tagMap[key] || "";
        });
      } else {
        const targets = data.subs.length > 0 ? data.subs : [data.targetId];
        targets.forEach((t) => {
          initial[`${t}__STATUS`] = tagMap[`${t}__STATUS`] || "";
          initial[`${t}__START`] = tagMap[`${t}__START`] || "";
          initial[`${t}__STOP`] = tagMap[`${t}__STOP`] || "";
        });

        if (data.subs.length === 0) {
          initial[`${data.targetId}__MONITOR`] =
            tagMap[`${data.targetId}__MONITOR`] || "";
        }
      }

      setLocalTags(initial);
    }
  }, [data, tagMap]);

  if (!data) return null;

  const isGroup = data.subs.length > 0;
  const hasSignals = data.signals && data.signals.length > 0;

  const renderTagSelect = (value, onChange, tagList, label) => (
    <div className="tag-field" style={{ marginBottom: 0 }}>
      <label
        className="som-control-item-label"
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "6px",
          display: "block",
        }}
      >
        {label}
      </label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: "6px",
          border: "1px solid rgba(255,255,255,0.1)",
          background: "#0f172a",
          color: "#e2e8f0",
          fontSize: "12px",
          outline: "none",
          cursor: "pointer",
        }}
      >
        <option value="" style={{ background: "#0f172a", color: "#e2e8f0" }}>— No Tag —</option>
        {tagList.map((tag) => (
          <option key={tag.id} value={tag.id} style={{ background: "#0f172a", color: "#e2e8f0" }}>
            {tag.tag_name}
          </option>
        ))}
      </select>
    </div>
  );

  return createPortal(
    <div
      className="som-equipment-modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 10000,
        background: "rgba(2, 6, 23, 0.85)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "5vh",
      }}
    >
      <div
        className="som-equipment-control-popup som-tag-edit-popup"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isGroup ? "800px" : "420px",
          maxHeight: "90vh",
          background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: "16px",
          border: "1px solid rgba(59, 130, 246, 0.3)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: 800,
                color: "#f1f5f9",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              ⚙️ PLC Tag Configuration
            </h2>
            <span
              style={{
                fontSize: "11px",
                color: "#64748b",
                marginTop: "4px",
              }}
            >
              Hardware Mapping: {data.targetId}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#94a3b8",
              padding: "6px 14px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            padding: "20px 24px",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {hasSignals ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {data.signals.map((sig) => (
                <div key={sig.key}>
                  {renderTagSelect(
                    localTags[`${data.targetId}__${sig.key}`] || "",
                    (val) =>
                      setLocalTags({
                        ...localTags,
                        [`${data.targetId}__${sig.key}`]: val,
                      }),
                    availableTags,
                    sig.label,
                  )}
                </div>
              ))}
            </div>
          ) : isGroup ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {data.subs.map((sub, index) => (
                <div
                  key={index}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    padding: "16px",
                    borderRadius: "10px",
                    border: "1px solid rgba(59, 130, 246, 0.15)",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 12px 0",
                      fontSize: "12px",
                      color: "#60a5fa",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {sub}
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "12px",
                    }}
                  >
                    {renderTagSelect(
                      localTags[`${sub}__STATUS`] || "",
                      (val) =>
                        setLocalTags({ ...localTags, [`${sub}__STATUS`]: val }),
                      availableTags,
                      "STATUS (READ)",
                    )}
                    {renderTagSelect(
                      localTags[`${sub}__START`] || "",
                      (val) =>
                        setLocalTags({ ...localTags, [`${sub}__START`]: val }),
                      availableTags,
                      "START (WRITE)",
                    )}
                    {renderTagSelect(
                      localTags[`${sub}__STOP`] || "",
                      (val) =>
                        setLocalTags({ ...localTags, [`${sub}__STOP`]: val }),
                      availableTags,
                      "STOP (WRITE)",
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ maxWidth: "320px", margin: "0 auto" }}>
              {renderTagSelect(
                localTags[`${data.targetId}__MONITOR`] || "",
                (val) =>
                  setLocalTags({
                    ...localTags,
                    [`${data.targetId}__MONITOR`]: val,
                  }),
                availableTags,
                "MONITORING POINT (READ)",
              )}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            gap: "12px",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "#94a3b8",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            CANCEL
          </button>
          <button
            disabled={saving}
            onClick={() => onSave(localTags)}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              background: saving ? "#475569" : "#3b82f6",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "SAVING..." : "CONFIRM MAPPING"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default function OverviewTab({
  activeTab,
  viewMode,
  handleEquipmentClick,
  condColor,
  st1_inlet, st1_exhaust, st1_cond,
  st2_inlet, st2_exhaust, st2_cond,
  st3_inlet, st3_exhaust, st3_cond,
  st4_inlet, st4_exhaust, st4_cond,
  getMappedValue,
  configMode = false,
  tagMap = {},
  trendData = {},
}) {
  const svgRef = useRef(null);
  const [modulateVals, setModulateVals] = useState({});
  const [activeKeypad, setActiveKeypad] = useState(null);

  const getModulateVal = (lineNum, cardId, signalKey, fallback) => {
    const itemKey = `${cardId}__${signalKey}`;
    if (modulateVals[itemKey] !== undefined) {
      return modulateVals[itemKey];
    }
    if (getMappedValue) {
      return String(getMappedValue(cardId, signalKey, fallback));
    }
    return fallback;
  };

  const handleOpenKeypad = (cardId, row, lineNum) => {
    const signalKey = row.signalKey || row.label.replace(/\s+/g, "_");
    const tagKey = `${cardId}__${signalKey}`;
    const currentVal = getModulateVal(lineNum, cardId, signalKey, row.value);

    setActiveKeypad({
      cardId,
      signalKey,
      tagKey,
      lineNum,
      label: `Sterilizer ${lineNum} ${row.label}`,
      unit: row.unit,
      value: currentVal
    });
  };

  const handleKeypadConfirm = (newVal) => {
    if (!activeKeypad) return;
    const { cardId, signalKey, tagKey } = activeKeypad;
    const itemKey = `${cardId}__${signalKey}`;

    setModulateVals(prev => ({ ...prev, [itemKey]: newVal }));

    const tagId = tagMap ? tagMap[tagKey] : null;
    if (tagId) {
      usePlcStore.getState().sendCommand(tagId, newVal, tagKey, "sterilizer");
    }

    setActiveKeypad(null);
  };

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

  return (
    <div className="som-sterilizer-station-layout">
      <div className="som-sterilizer-station-flow-card">
        <div className="som-sterilizer-station-flow-body">
          <svg
            ref={svgRef}
            viewBox="-450 -20 2800 1150"
            className="station-svg-canvas"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <filter
                id="neon-glow"
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite
                  in="SourceGraphic"
                  in2="blur"
                  operator="over"
                />
              </filter>
              <filter id="tint-green">
                <feColorMatrix type="matrix" values="0 0 0 0 0   0 1 0 0 0   0 0 0 0 0   0 0 0 1 0" />
              </filter>
              <filter id="tint-red">
                <feColorMatrix type="matrix" values="1 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 1 0" />
              </filter>
            </defs>

            {/* ==========================================
                                    LAYER 1: BACKGROUND
                                   ========================================== */}
            {activeTab === "overview" ? (
              <image
                href={sterilizerStationImageUrl}
                width="2470"
                x="-265"
              />
            ) : (
              <image
                href={sterilizerLineImageUrl}
                width="2470"
                x="-265"
              />
            )}

            {/* --- HUD DIAGNOSTIC BANNER --- */}
            {viewMode === "maintenance" && (
              <foreignObject
                x="650"
                y="20"
                width="600"
                height="60"
                style={{ overflow: "visible" }}
              >
                <div className="som-diagnostic-banner">
                  TECHNICAL DIAGNOSTIC ACTIVE
                </div>
              </foreignObject>
            )}

            {/* ==========================================
                                    LAYER 2: PROCESS FLOWS (PIPES & FLOW ANIMATIONS)
                                   ========================================== */}
            <g className="som-steam-flows">
              {/* Flows temporarily hidden as requested */}
            </g>

            {/* ==========================================
                                    STATION ELEMENTS (ADJUST POSITIONS INDIVIDUALLY BELOW)
                                   ========================================== */}

            {/* --- UNIFIED LINE VIEW (For Line 1, 2, 3, 4) --- */}
            {(activeTab === "line1" ||
              activeTab === "line2" ||
              activeTab === "line3" ||
              activeTab === "line4") &&
              (() => {
                const n =
                  activeTab === "line1"
                    ? 1
                    : activeTab === "line2"
                      ? 2
                      : activeTab === "line3"
                        ? 3
                        : 4;
                const inlet =
                  n === 1
                    ? st1_inlet
                    : n === 2
                      ? st2_inlet
                      : n === 3
                        ? st3_inlet
                        : st4_inlet;
                const exhaust =
                  n === 1
                    ? st1_exhaust
                    : n === 2
                      ? st2_exhaust
                      : n === 3
                        ? st3_exhaust
                        : st4_exhaust;
                const cond =
                  n === 1
                    ? st1_cond
                    : n === 2
                      ? st2_cond
                      : n === 3
                        ? st3_cond
                        : st4_cond;

                const actualInlet = getMappedValue
                  ? getMappedValue("st" + n + "_inlet_steam", "MONITOR", inlet)
                  : inlet;
                const actualExhaust = getMappedValue
                  ? getMappedValue("st" + n + "_exhaust", "MONITOR", exhaust)
                  : exhaust;
                const actualCond = getMappedValue
                  ? getMappedValue("st" + n + "_condensate", "MONITOR", cond)
                  : cond;

                const statusVal = n === 2 ? "STANDBY" : "RUN";
                const stepVal = n === 1 ? "7" : n === 2 ? "0" : n === 3 ? "3" : "5";
                const totalTimeVal = n === 1 ? "3.5" : n === 2 ? "0.0" : n === 3 ? "12.4" : "8.2";
                const stepTimeVal = n === 1 ? "1.2" : n === 2 ? "0.0" : n === 3 ? "4.1" : "2.0";
                const cycleTimeVal = n === 1 ? "10:30" : n === 2 ? "00:00" : n === 3 ? "15:45" : "08:10";
                const totalCycleTimeVal = n === 1 ? "45:15" : n === 2 ? "00:00" : n === 3 ? "55:20" : "38:40";
                const tempVal = n === 1 ? "110.5" : n === 2 ? "30.2" : n === 3 ? "125.8" : "118.4";

                // Local coordinates centered in the wide 2470 canvas (around x=1100)
                return (
                  <g>
                    <StationLabelSVG
                      x={880}
                      y={395}
                      label={`STERILIZER ${n}`}
                    />

                    {/* PROCESS FLOWS FOR LINE VIEW (Synced with Overview) */}
                    <g className="som-line-flows">
                      {/* 1. STEAM INLET FLOW (Gating) */}
                      <SteamFlowSVG
                        d="M -121 41 L 289 41 L 319 67 L 319 95"
                        active={true}
                        mode={
                          parseFloat(actualInlet) >= 0.1 ? "flowing" : "standby"
                        }
                      />
                      {parseFloat(actualInlet) >= 0.1 && (
                        <SteamFlowSVG
                          d="M 319 151 L 319 232"
                          active={true}
                          mode="flowing"
                        />
                      )}

                      {/* 2. STEAM EXHAUST FLOW (Gating) */}
                      <SteamFlowSVG
                        d="M 974 232 L 974 172 L 1000 155 L 1191 155"
                        active={true}
                        mode={
                          formatValveStatus(actualExhaust) === "OPEN"
                            ? "flowing"
                            : "standby"
                        }
                      />
                      {formatValveStatus(actualExhaust) === "OPEN" && (
                        <SteamFlowSVG
                          d="M 1258 153 L 1727 155"
                          active={true}
                          mode="flowing"
                        />
                      )}

                      {/* 3. CONDENSATE FLOW (Gating - Dark Orange) */}
                      <g>
                        {/* Before Valve - Always visible */}
                        <SteamFlowSVG
                          d="M 263 554 L 263 612 L 280 633 L 1870 633"
                          active={true}
                          mode={formatValveStatus(actualCond) === "OPEN" ? "liquid" : "standby"}
                          color={condColor}
                        />
                        <SteamFlowSVG
                          d="M 578 558 L 578 626"
                          active={true}
                          mode={formatValveStatus(actualCond) === "OPEN" ? "liquid" : "standby"}
                          color={condColor}
                        />
                        <SteamFlowSVG
                          d="M 906 558 L 906 628"
                          active={true}
                          mode={formatValveStatus(actualCond) === "OPEN" ? "liquid" : "standby"}
                          color={condColor}
                        />
                        <SteamFlowSVG
                          d="M 1228 554 L 1228 626"
                          active={true}
                          mode={formatValveStatus(actualCond) === "OPEN" ? "liquid" : "standby"}
                          color={condColor}
                        />
                        <SteamFlowSVG
                          d="M 1534 559 L 1534 626"
                          active={true}
                          mode={formatValveStatus(actualCond) === "OPEN" ? "liquid" : "standby"}
                          color={condColor}
                        />

                        {/* After Valve - Conditional */}
                        {formatValveStatus(actualCond) === "OPEN" && (
                          <SteamFlowSVG
                            d="M 1955 635 L 2149 635"
                            active={true}
                            mode="liquid"
                            color={condColor}
                          />
                        )}
                      </g>
                    </g>
                    {viewMode === "process" ? (
                      <g>
                        <SensorCardSVG
                          x={520}
                          y={130}
                          label="Inlet Steam"
                          value={
                            getMappedValue
                              ? String(getMappedValue("st" + n + "_inlet_steam", "MONITOR", inlet))
                              : inlet
                          }
                          unit={
                            getMappedValue && getMappedValue("st" + n + "_inlet_steam", "MONITOR", inlet) === "No Tag"
                              ? ""
                              : "%"
                          }
                          id={`st${n}_inlet_steam`}
                          equipmentName="Inlet Steam"
                          trendType="Pressure"
                          onClick={handleEquipmentClick}
                          style={getDeveloperStyle(`st${n}_inlet_steam`)}
                        />
                        <DoorCardSVG
                          x={1105}
                          y={100}
                          label="Exhaust"
                          status={
                            formatValveStatus(
                              getMappedValue
                                ? getMappedValue("st" + n + "_exhaust", "MONITOR", exhaust)
                                : exhaust
                            )
                          }
                          id={`st${n}_exhaust`}
                          onClick={handleEquipmentClick}
                          style={getDeveloperStyle(`st${n}_exhaust`)}
                        />
                        <SensorCardSVG
                          x={730}
                          y={350}
                          label="Pressure"
                          value={
                            getMappedValue
                              ? String(getMappedValue("st" + n + "_pressure", "MONITOR", "0.0"))
                              : "0.0"
                          }
                          unit="bar"
                          id={`st${n}_pressure`}
                          equipmentName={`ST${n} Pressure`}
                          trendType="Pressure"
                          onClick={handleEquipmentClick}
                          style={getDeveloperStyle(`st${n}_pressure`)}
                          trendData={trendData}
                        />
                        <SensorCardSVG
                          x={1790}
                          y={690}
                          label="Temperature"
                          value={
                            getMappedValue
                              ? String(getMappedValue("st" + n + "_temp", "MONITOR", "110.5"))
                              : "110.5"
                          }
                          unit="°C"
                          id={`st${n}_temp`}
                          equipmentName={`ST${n} Temperature`}
                          trendType="Temperature"
                          onClick={handleEquipmentClick}
                          style={getDeveloperStyle(`st${n}_temp`)}
                          trendData={trendData}
                        />
                        <DoorCardSVG
                          x={1785}
                          y={520}
                          label="Inlet Door"
                          status={
                            formatDoorStatus(
                              getMappedValue
                                ? getMappedValue("st" + n + "_door_in", "MONITOR", "Close")
                                : "Close"
                            )
                          }
                          id={`st${n}_door_in`}
                          onClick={handleEquipmentClick}
                          style={getDeveloperStyle(`st${n}_door_in`)}
                        />
                        <DoorCardSVG
                          x={0}
                          y={520}
                          label="Outlet Door"
                          status={
                            formatDoorStatus(
                              getMappedValue
                                ? getMappedValue("st" + n + "_door_out", "MONITOR", "Close")
                                : "Close"
                            )
                          }
                          id={`st${n}_door_out`}
                          onClick={handleEquipmentClick}
                          style={getDeveloperStyle(`st${n}_door_out`)}
                        />
                        <DoorCardSVG
                          x={1970}
                          y={685}
                          label="Condensate"
                          status={
                            formatValveStatus(
                              getMappedValue
                                ? getMappedValue("st" + n + "_condensate", "MONITOR", cond)
                                : cond
                            )
                          }
                          id={`st${n}_condensate`}
                          onClick={handleEquipmentClick}
                          style={getDeveloperStyle(`st${n}_condensate`)}
                        />

                        {/* Monitoring & Settings Cards at the Bottom side-by-side (Minimalist) */}
                        <StatusTableCardSVG
                          x={450}
                          y={670}
                          id={`st${n}_status`}
                          title={`STERILIZER ${n}`}
                          onClick={handleEquipmentClick}
                          style={getDeveloperStyle(`st${n}_status`)}
                          configMode={configMode}
                          data={[
                            {
                              label: "STATUS",
                              value: getMappedValue
                                ? String(getMappedValue(`st${n}_status`, "STATUS", statusVal))
                                : statusVal,
                              isHighlight: false,
                            },
                            {
                              label: "ACTUAL STEP",
                              value: getMappedValue
                                ? String(getMappedValue(`st${n}_status`, "ACTUAL_STEP", stepVal))
                                : stepVal,
                              isHighlight: true,
                            },
                            {
                              label: "TOTAL TIME",
                              value: getMappedValue
                                ? String(getMappedValue(`st${n}_status`, "TOTAL_TIME", totalTimeVal))
                                : totalTimeVal,
                              unit: ["No Tag", "--"].includes(getMappedValue ? String(getMappedValue(`st${n}_status`, "TOTAL_TIME", totalTimeVal)) : "")
                                ? ""
                                : "min",
                              isHighlight: true,
                            },
                                                        {
                              label: "STEP TIME",
                              value: getMappedValue
                                ? String(getMappedValue(`st${n}_status`, "STEP_TIME", stepTimeVal))
                                : stepTimeVal,
                              unit: ["No Tag", "--"].includes(getMappedValue ? String(getMappedValue(`st${n}_status`, "STEP_TIME", stepTimeVal)) : "")
                                ? ""
                                : "min",
                              isHighlight: true,
                            },
                            {
                              label: "CYCLE TIME",
                              value: getMappedValue
                                ? String(getMappedValue(`st${n}_status`, "CYCLE_TIME", cycleTimeVal))
                                : cycleTimeVal,
                              isHighlight: false,
                            },
                            {
                              label: "TOTAL CYCLE TIME",
                              value: getMappedValue
                                ? String(getMappedValue(`st${n}_status`, "TOTAL_CYCLE_TIME", totalCycleTimeVal))
                                : totalCycleTimeVal,
                              isHighlight: false,
                            },
                            {
                              label: "PRESSURE",
                              value: getMappedValue
                                ? String(getMappedValue(`st${n}_status`, "PRESSURE", "2.8"))
                                : "2.8",
                              unit: ["No Tag", "--"].includes(getMappedValue ? String(getMappedValue(`st${n}_status`, "PRESSURE", "2.8")) : "")
                                ? ""
                                : "Bar",
                              isHighlight: true,
                            },
                          ]}
                        />

                        <StatusTableCardSVG
                          x={950}
                          y={670}
                          id={`st${n}_valve_auto`}
                          title="SETTING VALVE MODULATE AUTO"
                          width={580}
                          height={230}
                          onClick={handleEquipmentClick}
                          onInputClick={(row) => handleOpenKeypad(`st${n}_valve_auto`, row, n)}
                          style={getDeveloperStyle(`st${n}_valve_auto`)}
                          configMode={configMode}
                          leftData={[
                            {
                              label: "MIN",
                              signalKey: "MIN",
                              value: getModulateVal(n, `st${n}_valve_auto`, "MIN", "--"),
                              unit: "%",
                              isInput: true,
                              isEdited: modulateVals[`st${n}_valve_auto__MIN`] !== undefined,
                            },
                            {
                              label: "MAX",
                              signalKey: "MAX",
                              value: getModulateVal(n, `st${n}_valve_auto`, "MAX", "--"),
                              unit: "%",
                              isInput: true,
                              isEdited: modulateVals[`st${n}_valve_auto__MAX`] !== undefined,
                            },
                          ]}
                          rightData={[
                            {
                              label: "SET POINT",
                              signalKey: "SETPOINT",
                              value: getModulateVal(n, `st${n}_valve_auto`, "SETPOINT", "--"),
                              unit: "Bar",
                              isInput: true,
                              isEdited: modulateVals[`st${n}_valve_auto__SETPOINT`] !== undefined,
                            },
                            {
                              label: "P",
                              signalKey: "P",
                              value: getModulateVal(n, `st${n}_valve_auto`, "P", "--"),
                              unit: "",
                              isInput: true,
                              isEdited: modulateVals[`st${n}_valve_auto__P`] !== undefined,
                            },
                            {
                              label: "I",
                              signalKey: "I",
                              value: getModulateVal(n, `st${n}_valve_auto`, "I", "--"),
                              unit: "",
                              isInput: true,
                              isEdited: modulateVals[`st${n}_valve_auto__I`] !== undefined,
                            },
                            {
                              label: "D",
                              signalKey: "D",
                              value: getModulateVal(n, `st${n}_valve_auto`, "D", "--"),
                              unit: "",
                              isInput: true,
                              isEdited: modulateVals[`st${n}_valve_auto__D`] !== undefined,
                            },
                          ]}
                        />

                        <StatusTableCardSVG
                          x={950}
                          y={915}
                          id={`st${n}_valve_manual`}
                          title="SETTING VALVE MODULATE MANUAL"
                          width={580}
                          height={100}
                          onClick={handleEquipmentClick}
                          onInputClick={(row) => handleOpenKeypad(`st${n}_valve_manual`, row, n)}
                          style={getDeveloperStyle(`st${n}_valve_manual`)}
                          configMode={configMode}
                          data={[
                            {
                              label: "SET VALUE",
                              signalKey: "SET_VALUE",
                              value: getModulateVal(n, `st${n}_valve_manual`, "SET_VALUE", "--"),
                              unit: "%",
                              isInput: true,
                              isEdited: modulateVals[`st${n}_valve_manual__SET_VALUE`] !== undefined,
                            },
                          ]}
                        />
                        <EquipmentIconSVG x={366} y={120} icon={valvePositionerSvg} size={160} rotation={0} isRunning={parseFloat(actualInlet) >= 0.1} />
                        <EquipmentIconSVG x={1222} y={120} icon={valveActuatorSvg} size={120} rotation={0} isRunning={formatValveStatus(actualExhaust) === "OPEN"} />
                        <EquipmentIconSVG x={1920} y={599} icon={valveActuatorSvg} size={120} rotation={0} isRunning={formatValveStatus(actualCond) === "OPEN"} />
                      </g>
                    ) : (
                      <g>
                        <MaintenanceCardSVG
                          x={500}
                          y={130}
                          label="M-INLET"
                          params={[
                            { label: "AMP", value: "12.5", unit: "A" },
                            { label: "HZ", value: "45.0", unit: "Hz" },
                          ]}
                          id={`st${n}_mnt_inlet`}
                          onClick={handleEquipmentClick}
                        />
                        <MaintenanceCardSVG
                          x={1120}
                          y={110}
                          label="M-EXHAUST"
                          params={[
                            { label: "AMP", value: "8.2", unit: "A" },
                            {
                              label: "VIB",
                              value: "0.4",
                              unit: "mm/s",
                            },
                          ]}
                          id={`st${n}_mnt_exhaust`}
                          onClick={handleEquipmentClick}
                        />
                        <MaintenanceCardSVG
                          x={1920}
                          y={430}
                          label="M-DOOR (IN)"
                          params={[
                            {
                              label: "VIB",
                              value: "1.2",
                              unit: "mm/s",
                            },
                            { label: "POS", value: "100", unit: "%" },
                          ]}
                          id={`st${n}_mnt_door_in`}
                          onClick={handleEquipmentClick}
                        />
                        <MaintenanceCardSVG
                          x={-100}
                          y={430}
                          label="M-DOOR (OUT)"
                          params={[
                            {
                              label: "VIB",
                              value: "1.1",
                              unit: "mm/s",
                            },
                            { label: "POS", value: "100", unit: "%" },
                          ]}
                          id={`st${n}_mnt_door_out`}
                          onClick={handleEquipmentClick}
                        />
                      </g>
                    )}
                  </g>
                );
              })()}

            {/* --- OVERVIEW CARDS (Line 1, 2, 3, 4 together) --- */}
            {activeTab === "overview" &&
              (() => {
                const st1_inlet_val = getMappedValue ? getMappedValue("st1_inlet_steam", "MONITOR", st1_inlet) : st1_inlet;
                const st2_inlet_val = getMappedValue ? getMappedValue("st2_inlet_steam", "MONITOR", st2_inlet) : st2_inlet;
                const st3_inlet_val = getMappedValue ? getMappedValue("st3_inlet_steam", "MONITOR", st3_inlet) : st3_inlet;
                const st4_inlet_val = getMappedValue ? getMappedValue("st4_inlet_steam", "MONITOR", st4_inlet) : st4_inlet;

                const st1_exhaust_val = getMappedValue ? getMappedValue("st1_exhaust", "MONITOR", st1_exhaust) : st1_exhaust;
                const st2_exhaust_val = getMappedValue ? getMappedValue("st2_exhaust", "MONITOR", st2_exhaust) : st2_exhaust;
                const st3_exhaust_val = getMappedValue ? getMappedValue("st3_exhaust", "MONITOR", st3_exhaust) : st3_exhaust;
                const st4_exhaust_val = getMappedValue ? getMappedValue("st4_exhaust", "MONITOR", st4_exhaust) : st4_exhaust;

                const st1_cond_val = getMappedValue ? getMappedValue("st1_condensate", "MONITOR", st1_cond) : st1_cond;
                const st2_cond_val = getMappedValue ? getMappedValue("st2_condensate", "MONITOR", st2_cond) : st2_cond;
                const st3_cond_val = getMappedValue ? getMappedValue("st3_condensate", "MONITOR", st3_cond) : st3_cond;
                const st4_cond_val = getMappedValue ? getMappedValue("st4_condensate", "MONITOR", st4_cond) : st4_cond;

                const anyInletOpen =
                  parseFloat(st1_inlet_val) >= 0.1 ||
                  parseFloat(st2_inlet_val) >= 0.1 ||
                  parseFloat(st3_inlet_val) >= 0.1 ||
                  parseFloat(st4_inlet_val) >= 0.1;

                return (
                  <g>
                    <g className="som-overview-flows">
                      {/* Main BPV Steam Pipe (Always Standby) */}
                      <SteamFlowSVG
                        d="M 2201 29 L -260 29 L -260 29 L -246 32 L -248 583 L -218 613 L 2203 611"
                        active={true}
                        mode="standby"
                      />

                      {/* Line 1 Inlet Steam Flow */}
                      {parseFloat(st1_inlet_val) >= 0.1 ? (
                        <SteamFlowSVG
                          d="M -6 50 L -8 253"
                          active={true}
                          mode="flowing"
                        />
                      ) : (
                        <SteamFlowSVG
                          d="M -6 50 L -4 169"
                          active={true}
                          mode="standby"
                        />
                      )}

                      {/* Line 2 Inlet Steam Flow (Physically Sterilizer 3, now st3) */}
                      {parseFloat(st3_inlet_val) >= 0.1 ? (
                        <SteamFlowSVG
                          d="M 1190 50 L 1188 250"
                          active={true}
                          mode="flowing"
                        />
                      ) : (
                        <SteamFlowSVG
                          d="M 1190 50 L 1191 171"
                          active={true}
                          mode="standby"
                        />
                      )}

                      {/* Line 3 Inlet Steam Flow (Physically Sterilizer 2, now st2) */}
                      {parseFloat(st2_inlet_val) >= 0.1 ? (
                        <SteamFlowSVG
                          d="M -6 637 L -8 807"
                          active={true}
                          mode="flowing"
                        />
                      ) : (
                        <SteamFlowSVG
                          d="M -8 636 L -8 725"
                          active={true}
                          mode="standby"
                        />
                      )}

                      {/* Line 4 Inlet Steam Flow */}
                      {parseFloat(st4_inlet_val) >= 0.1 ? (
                        <SteamFlowSVG
                          d="M 1184 639 L 1183 804"
                          active={true}
                          mode="flowing"
                        />
                      ) : (
                        <SteamFlowSVG
                          d="M 1184 636 L 1184 725"
                          active={true}
                          mode="standby"
                        />
                      )}

                      {/* Line 1 Exhaust Steam Flow */}
                      {formatValveStatus(st1_exhaust_val) === "OPEN" ? (
                        <SteamFlowSVG
                          d="M 369 252 L 369 217 L 383 206 L 431 208 L 788 208 L 834 208"
                          active={true}
                          mode="flowing"
                        />
                      ) : (
                        <SteamFlowSVG
                          d="M 369 250 L 369 220 L 380 208 L 402 208 L 494 210"
                          active={true}
                          mode="standby"
                        />
                      )}

                      {/* Line 2 Exhaust Steam Flow (Physically Sterilizer 3, now st3) */}
                      {formatValveStatus(st3_exhaust_val) === "OPEN" ? (
                        <SteamFlowSVG
                          d="M 1563 250 L 1565 217 L 1577 206 L 1689 206 L 2029 208"
                          active={true}
                          mode="flowing"
                        />
                      ) : (
                        <SteamFlowSVG
                          d="M 1563 250 L 1565 217 L 1577 206 L 1689 206"
                          active={true}
                          mode="standby"
                        />
                      )}

                      {/* Line 3 Exhaust Steam Flow (Physically Sterilizer 2, now st2) */}
                      {formatValveStatus(st2_exhaust_val) === "OPEN" ? (
                        <SteamFlowSVG
                          d="M 369 804 L 369 769 L 383 758 L 494 758 L 832 760"
                          active={true}
                          mode="flowing"
                        />
                      ) : (
                        <SteamFlowSVG
                          d="M 369 804 L 369 769 L 383 758 L 494 758"
                          active={true}
                          mode="standby"
                        />
                      )}

                      {/* Line 4 Exhaust Steam Flow */}
                      {formatValveStatus(st4_exhaust_val) === "OPEN" ? (
                        <SteamFlowSVG
                          d="M 1558 802 L 1560 767 L 1579 760 L 1682 758 L 2021 760"
                          active={true}
                          mode="flowing"
                        />
                      ) : (
                        <SteamFlowSVG
                          d="M 1558 802 L 1560 767 L 1579 760 L 1682 758"
                          active={true}
                          mode="standby"
                        />
                      )}

                      {/* Line 1 Condensate Flow */}
                      {formatValveStatus(st1_cond_val) === "OPEN" ? (
                        <SteamFlowSVG
                          d="M -41 437 L -39 487 L -24 501 L 502 501 L 895 499 L 1041 499 M 143 437 L 143 495 M 331 437 L 331 497 M 515 439 L 516 499 M 692 437 L 692 497"
                          active={true}
                          mode="liquid"
                          color={condColor}
                        />
                      ) : (
                        <SteamFlowSVG
                          d="M -39 437 L -39 483 L -32 495 L -1 497 L 895 499 M 143 437 L 143 495 M 331 437 L 331 497 M 515 439 L 516 499 M 692 437 L 692 497"
                          active={true}
                          mode="standby"
                          color={condColor}
                        />
                      )}

                      {/* Line 2 Condensate Flow (Physically Sterilizer 3, now st3) */}
                      {formatValveStatus(st3_cond_val) === "OPEN" ? (
                        <SteamFlowSVG
                          d="M 1155 434 L 1155 485 L 1170 494 L 2089 497 L 2229 497 M 1337 436 L 1339 495 M 1526 437 L 1526 495 M 1710 437 L 1710 495 M 1884 436 L 1887 497"
                          active={true}
                          mode="liquid"
                          color={condColor}
                        />
                      ) : (
                        <SteamFlowSVG
                          d="M 1155 436 L 1156 481 L 1167 494 L 1204 495 L 2093 497 M 1337 436 L 1339 495 M 1526 437 L 1526 495 M 1710 437 L 1710 495 M 1884 436 L 1887 497"
                          active={true}
                          mode="standby"
                          color={condColor}
                        />
                      )}

                      {/* Line 3 Condensate Flow (Physically Sterilizer 2, now st2) */}
                      {formatValveStatus(st2_cond_val) === "OPEN" ? (
                        <SteamFlowSVG
                          d="M -41 986 L -41 1034 L -29 1048 L 893 1048 L 1042 1051 M 143 990 L 143 1049 M 331 990 L 331 1048 M 515 990 L 516 1048 M 516 990 L 516 1049 M 692 988 L 692 1049"
                          active={true}
                          mode="liquid"
                          color={condColor}
                        />
                      ) : (
                        <SteamFlowSVG
                          d="M -39 988 L -39 988 L -39 1035 L -31 1046 L 895 1049 M 331 990 L 331 1048 M 515 990 L 516 1048 M 516 990 L 516 1049 M 692 988 L 692 1049"
                          active={true}
                          mode="standby"
                          color={condColor}
                        />
                      )}

                      {/* Line 4 Condensate Flow */}
                      {formatValveStatus(st4_cond_val) === "OPEN" ? (
                        <SteamFlowSVG
                          d="M 1149 988 L 1149 1039 L 1167 1048 L 2236 1049 M 1332 990 L 1333 1048 M 1521 991 L 1523 1049 M 1705 988 L 1705 1046 M 1880 990 L 1882 1048"
                          active={true}
                          mode="liquid"
                          color={condColor}
                        />
                      ) : (
                        <SteamFlowSVG
                          d="M 1148 990 L 1148 1035 L 1160 1049 L 2084 1049 M 1332 990 L 1333 1048 M 1521 991 L 1523 1049 M 1705 988 L 1705 1046 M 1880 990 L 1882 1048"
                          active={true}
                          mode="standby"
                          color={condColor}
                        />
                      )}
                    </g>

                    <SensorCardSVG
                      x={-118}
                      y={90}
                      label="Main Steam Pipe"
                      value={
                        getMappedValue
                          ? String(getMappedValue("main_steam_pipe_flow", "MONITOR", "0.0"))
                          : "0.0"
                      }
                      unit="bar"
                      id="main_steam_pipe_flow"
                      equipmentName="MAIN STEAM PIPE FLOW"
                      trendType="Pressure"
                      onClick={handleEquipmentClick}
                      style={getDeveloperStyle("main_steam_pipe_flow")}
                      trendData={trendData}
                    />

                    <SensorCardSVG
                      x={108}
                      y={90}
                      label="Recipe Mode"
                      value="Ripe"
                      unit=""
                      id="recipe_mode"
                      equipmentName="RECIPE MODE"
                      trendType="Status"
                      onClick={handleEquipmentClick}
                      style={getDeveloperStyle("recipe_mode")}
                    />
                    <SensorCardSVG
                      x={1308}
                      y={90}
                      label="Recipe Mode"
                      value="Unriepe"
                      unit=""
                      id="recipe_mode"
                      equipmentName="RECIPE MODE"
                      trendType="Status"
                      onClick={handleEquipmentClick}
                      style={getDeveloperStyle("recipe_mode")}
                    />
                    <SensorCardSVG
                      x={108}
                      y={670}
                      label="Recipe Mode"
                      value="Overripe"
                      unit=""
                      id="recipe_mode"
                      equipmentName="RECIPE MODE"
                      trendType="Status"
                      onClick={handleEquipmentClick}
                      style={getDeveloperStyle("recipe_mode")}
                    />

                    <SensorCardSVG
                      x={1308}
                      y={670}
                      label="Recipe Mode"
                      value="Ripe"
                      unit=""
                      id="recipe_mode"
                      equipmentName="RECIPE MODE"
                      trendType="Status"
                      onClick={handleEquipmentClick}
                      style={getDeveloperStyle("recipe_mode")}
                    />

                    {/* --- STERILIZER 1 (TOP) --- */}
                    <g>
                      <StationLabelSVG
                        x={345}
                        y={350}
                        label="STERILIZER 1"
                      />
                      {viewMode === "process" ? (
                        <g>
                          <SensorCardSVG
                            x={140}
                            y={200}
                            label="Inlet Steam"
                            value={
                              getMappedValue
                                ? String(getMappedValue("st1_inlet_steam", "MONITOR", st1_inlet))
                                : st1_inlet
                            }
                            unit={
                              getMappedValue && getMappedValue("st1_inlet_steam", "MONITOR", st1_inlet) === "No Tag"
                                ? ""
                                : "%"
                            }
                            id="st1_inlet_steam"
                            equipmentName="Inlet Steam"
                            trendType="Pressure"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st1_inlet_steam")}
                          />
                          <DoorCardSVG
                            x={410}
                            y={150}
                            label="Exhaust"
                            status={
                              formatValveStatus(
                                getMappedValue
                                  ? getMappedValue("st1_exhaust", "MONITOR", st1_exhaust)
                                  : st1_exhaust
                              )
                            }
                            id="st1_exhaust"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st1_exhaust")}
                          />
                          <SensorCardSVG
                            x={180}
                            y={360}
                            label="Pressure"
                            value={
                              getMappedValue
                                ? String(getMappedValue("st1_pressure", "MONITOR", "0.0"))
                                : "0.0"
                            }
                            unit="bar"
                            id="st1_pressure"
                            equipmentName="ST1 Pressure"
                            trendType="Pressure"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st1_pressure")}
                            trendData={trendData}
                          />
                          <SensorCardSVG
                            x={750}
                            y={550}
                            label="Temperature"
                            value={
                              getMappedValue
                                ? String(getMappedValue("st1_temp", "MONITOR", "110.5"))
                                : "110.5"
                            }
                            unit="°C"
                            id="st1_temp"
                            equipmentName="ST1 Temperature"
                            trendType="Temperature"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st1_temp")}
                            trendData={trendData}
                          />
                          <DoorCardSVG
                            x={745}
                            y={380}
                            label="Inlet Door"
                            status={
                              formatDoorStatus(
                                getMappedValue
                                  ? getMappedValue("st1_door_in", "MONITOR", "Close")
                                  : "Close"
                              )
                            }
                            id="st1_door_in"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st1_door_in")}
                          />
                          <DoorCardSVG
                            x={-60}
                            y={380}
                            label="Outlet Door"
                            status={
                              formatDoorStatus(
                                getMappedValue
                                  ? getMappedValue("st1_door_out", "MONITOR", "Close")
                                  : "Close"
                              )
                            }
                            id="st1_door_out"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st1_door_out")}
                          />
                          <DoorCardSVG
                            x={930}
                            y={545}
                            label="Condensate"
                            status={
                              formatValveStatus(
                                getMappedValue
                                  ? getMappedValue("st1_condensate", "MONITOR", st1_cond)
                                  : st1_cond
                              )
                            }
                            id="st1_condensate"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st1_condensate")}
                          />
                          <SummaryTableSVG
                            x={750}
                            y={60}
                            id="st1_summary"
                            title="STERILIZER 1"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st1_summary")}
                            data={[
                              {
                                label: "Status",
                                value: getMappedValue
                                  ? String(getMappedValue("st1_summary", "STATUS", "RUN"))
                                  : "RUN",
                                unit: "",
                              },
                              {
                                label: "Actual Step",
                                value: getMappedValue
                                  ? String(getMappedValue("st1_summary", "ACTUAL_STEP", "7"))
                                  : "7",
                                unit: "",
                              },
                              {
                                label: "Total Time",
                                value: getMappedValue
                                  ? String(getMappedValue("st1_summary", "TOTAL_TIME", "3.5"))
                                  : "3.5",
                                unit: ["No Tag", "--"].includes(getMappedValue ? String(getMappedValue("st1_summary", "TOTAL_TIME", "3.5")) : "")
                                  ? ""
                                  : "min",
                              },
                              {
                                label: "Step Time",
                                value: getMappedValue
                                  ? String(getMappedValue("st1_summary", "STEP_TIME", "1.2"))
                                  : "1.2",
                                unit: ["No Tag", "--"].includes(getMappedValue ? String(getMappedValue("st1_summary", "STEP_TIME", "1.2")) : "")
                                  ? ""
                                  : "min",
                              },
                              {
                                label: "Cycle Time",
                                value: getMappedValue
                                  ? String(getMappedValue("st1_summary", "CYCLE_TIME", "10:30"))
                                  : "10:30",
                                unit: "",
                              },
                              {
                                label: "Total Cycle Time",
                                value: getMappedValue
                                  ? String(getMappedValue("st1_summary", "TOTAL_CYCLE_TIME", "45:15"))
                                  : "45:15",
                                unit: "",
                              },
                              {
                                label: "Pressure",
                                value: getMappedValue
                                  ? String(getMappedValue("st1_summary", "PRESSURE", "2.8"))
                                  : "2.8",
                                unit: ["No Tag", "--"].includes(getMappedValue ? String(getMappedValue("st1_summary", "PRESSURE", "2.8")) : "")
                                  ? ""
                                  : "Bar",
                              },
                            ]}
                          />
                          <EquipmentIconSVG
                            x={20}
                            y={187}
                            icon={valvePositionerSvg}
                            size={95}
                            rotation={0}
                            isRunning={parseFloat(getMappedValue ? getMappedValue("st1_inlet_steam", "MONITOR", st1_inlet) : st1_inlet) >= 0.1}
                          />
                          <EquipmentIconSVG
                            x={1215}
                            y={187}
                            icon={valvePositionerSvg}
                            size={95}
                            rotation={0}
                            isRunning={parseFloat(getMappedValue ? getMappedValue("st3_inlet_steam", "MONITOR", st3_inlet) : st3_inlet) >= 0.1}
                          />
                          <EquipmentIconSVG
                            x={20}
                            y={739}
                            icon={valvePositionerSvg}
                            size={95}
                            rotation={0}
                            isRunning={parseFloat(getMappedValue ? getMappedValue("st2_inlet_steam", "MONITOR", st2_inlet) : st2_inlet) >= 0.1}
                          />
                          <EquipmentIconSVG
                            x={1210}
                            y={739}
                            icon={valvePositionerSvg}
                            size={95}
                            rotation={0}
                            isRunning={parseFloat(getMappedValue ? getMappedValue("st4_inlet_steam", "MONITOR", st4_inlet) : st4_inlet) >= 0.1}
                          />
                          <EquipmentIconSVG
                            x={513}
                            y={188}
                            icon={valveActuatorSvg}
                            size={69}
                            rotation={0}
                            isRunning={formatValveStatus(getMappedValue ? getMappedValue("st1_exhaust", "MONITOR", st1_exhaust) : st1_exhaust) === "OPEN"}
                          />
                          <EquipmentIconSVG
                            x={1708}
                            y={187}
                            icon={valveActuatorSvg}
                            size={69}
                            rotation={0}
                            isRunning={formatValveStatus(getMappedValue ? getMappedValue("st3_exhaust", "MONITOR", st3_exhaust) : st3_exhaust) === "OPEN"}
                          />
                          <EquipmentIconSVG
                            x={513}
                            y={739}
                            icon={valveActuatorSvg}
                            size={69}
                            rotation={0}
                            isRunning={formatValveStatus(getMappedValue ? getMappedValue("st2_exhaust", "MONITOR", st2_exhaust) : st2_exhaust) === "OPEN"}
                          />
                          <EquipmentIconSVG
                            x={1701}
                            y={739}
                            icon={valveActuatorSvg}
                            size={69}
                            rotation={0}
                            isRunning={formatValveStatus(getMappedValue ? getMappedValue("st4_exhaust", "MONITOR", st4_exhaust) : st4_exhaust) === "OPEN"}
                          />
                          <EquipmentIconSVG
                            x={914}
                            y={479}
                            icon={valveActuatorSvg}
                            size={69}
                            rotation={0}
                            isRunning={formatValveStatus(getMappedValue ? getMappedValue("st1_condensate", "MONITOR", st1_cond) : st1_cond) === "OPEN"}
                          />
                          <EquipmentIconSVG
                            x={2110}
                            y={478}
                            icon={valveActuatorSvg}
                            size={69}
                            rotation={0}
                            isRunning={formatValveStatus(getMappedValue ? getMappedValue("st3_condensate", "MONITOR", st3_cond) : st3_cond) === "OPEN"}
                          />
                          <EquipmentIconSVG
                            x={914}
                            y={1030}
                            icon={valveActuatorSvg}
                            size={69}
                            rotation={0}
                            isRunning={formatValveStatus(getMappedValue ? getMappedValue("st2_condensate", "MONITOR", st2_cond) : st2_cond) === "OPEN"}
                          />
                          <EquipmentIconSVG
                            x={2104}
                            y={1030}
                            icon={valveActuatorSvg}
                            size={69}
                            rotation={0}
                            isRunning={formatValveStatus(getMappedValue ? getMappedValue("st4_condensate", "MONITOR", st4_cond) : st4_cond) === "OPEN"}
                          />
                        </g>
                      ) : (
                        <g>
                          <MaintenanceCardSVG
                            x={120}
                            y={200}
                            label="M-INLET"
                            params={[
                              {
                                label: "AMP",
                                value: "12.5",
                                unit: "A",
                              },
                              {
                                label: "HZ",
                                value: "45.0",
                                unit: "Hz",
                              },
                            ]}
                            id="st1_mnt_inlet"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st1_mnt_inlet")}
                          />
                          <MaintenanceCardSVG
                            x={445}
                            y={180}
                            label="M-EXHAUST"
                            params={[
                              { label: "AMP", value: "8.2", unit: "A" },
                              {
                                label: "VIB",
                                value: "0.4",
                                unit: "mm/s",
                              },
                            ]}
                            id="st1_mnt_exhaust"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st1_mnt_exhaust")}
                          />
                          <MaintenanceCardSVG
                            x={745}
                            y={380}
                            label="M-DOOR"
                            params={[
                              {
                                label: "VIB",
                                value: "1.2",
                                unit: "mm/s",
                              },
                              { label: "POS", value: "100", unit: "%" },
                            ]}
                            id="st1_mnt_door"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st1_mnt_door")}
                          />
                        </g>
                      )}
                    </g>

                    {/* --- STERILIZER 3 (MIDDLE) --- */}
                    <g transform="translate(1400, 0)">
                      <StationLabelSVG
                        x={140}
                        y={350}
                        label="STERILIZER 3"
                      />
                      {viewMode === "process" ? (
                        <g>
                          <SensorCardSVG
                            x={-65}
                            y={200}
                            label="Inlet Steam"
                            value={
                              getMappedValue
                                ? String(getMappedValue("st3_inlet_steam", "MONITOR", st3_inlet))
                                : st3_inlet
                            }
                            unit="%"
                            id="st3_inlet_steam"
                            equipmentName="Inlet Steam"
                            trendType="Pressure"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st3_inlet_steam")}
                          />
                          <DoorCardSVG
                            x={200}
                            y={150}
                            label="Exhaust"
                            status={
                              formatValveStatus(
                                getMappedValue
                                  ? getMappedValue("st3_exhaust", "MONITOR", st3_exhaust)
                                  : st3_exhaust
                              )
                            }
                            id="st3_exhaust"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st3_exhaust")}
                          />
                          <SensorCardSVG
                            x={-25}
                            y={360}
                            label="Pressure"
                            value={
                              getMappedValue
                                ? String(getMappedValue("st3_pressure", "MONITOR", "0.0"))
                                : "0.0"
                            }
                            unit="bar"
                            id="st3_pressure"
                            equipmentName="ST3 Pressure"
                            trendType="Pressure"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st3_pressure")}
                            trendData={trendData}
                          />
                          <SensorCardSVG
                            x={550}
                            y={550}
                            label="Temperature"
                            value={
                              getMappedValue
                                ? String(getMappedValue("st3_temp", "MONITOR", "110.5"))
                                : "110.5"
                            }
                            unit="°C"
                            id="st3_temp"
                            equipmentName="ST3 Temperature"
                            trendType="Temperature"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st3_temp")}
                            trendData={trendData}
                          />
                          <DoorCardSVG
                            x={540}
                            y={380}
                            label="Inlet Door"
                            status={
                              formatDoorStatus(
                                getMappedValue
                                  ? getMappedValue("st3_door_in", "MONITOR", "Close")
                                  : "Close"
                              )
                            }
                            id="st3_door_in"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st3_door_in")}
                          />
                          <DoorCardSVG
                            x={-260}
                            y={380}
                            label="Outlet Door"
                            status={
                              formatDoorStatus(
                                getMappedValue
                                  ? getMappedValue("st3_door_out", "MONITOR", "Close")
                                  : "Close"
                              )
                            }
                            id="st3_door_out"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st3_door_out")}
                          />
                          <DoorCardSVG
                            x={730}
                            y={545}
                            label="Condensate"
                            status={
                              formatValveStatus(
                                getMappedValue
                                  ? getMappedValue("st3_condensate", "MONITOR", st3_cond)
                                  : st3_cond
                              )
                            }
                            id="st3_condensate"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st3_condensate")}
                          />
                          <SummaryTableSVG
                            x={550}
                            y={60}
                            id="st3_summary"
                            title="STERILIZER 3"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st3_summary")}
                            data={[
                              {
                                label: "Status",
                                value: getMappedValue
                                  ? String(getMappedValue("st3_summary", "STATUS", "RUN"))
                                  : "RUN",
                                unit: "",
                              },
                              {
                                label: "Actual Step",
                                value: getMappedValue
                                  ? String(getMappedValue("st3_summary", "ACTUAL_STEP", "3"))
                                  : "3",
                                unit: "",
                              },
                              {
                                label: "Total Time",
                                value: getMappedValue
                                  ? String(getMappedValue("st3_summary", "TOTAL_TIME", "12.4"))
                                  : "12.4",
                                unit: ["No Tag", "--"].includes(getMappedValue ? String(getMappedValue("st3_summary", "TOTAL_TIME", "12.4")) : "")
                                  ? ""
                                  : "min",
                              },
                              {
                                label: "Step Time",
                                value: getMappedValue
                                  ? String(getMappedValue("st3_summary", "STEP_TIME", "4.1"))
                                  : "4.1",
                                unit: ["No Tag", "--"].includes(getMappedValue ? String(getMappedValue("st3_summary", "STEP_TIME", "4.1")) : "")
                                  ? ""
                                  : "min",
                              },
                              {
                                label: "Cycle Time",
                                value: getMappedValue
                                  ? String(getMappedValue("st3_summary", "CYCLE_TIME", "15:45"))
                                  : "15:45",
                                unit: "",
                              },
                              {
                                label: "Total Cycle Time",
                                value: getMappedValue
                                  ? String(getMappedValue("st3_summary", "TOTAL_CYCLE_TIME", "55:20"))
                                  : "55:20",
                                unit: "",
                              },
                              {
                                label: "Temp",
                                value: getMappedValue
                                  ? String(getMappedValue("st3_summary", "TEMP", "125.8"))
                                  : "125.8",
                                unit: ["No Tag", "--"].includes(getMappedValue ? String(getMappedValue("st3_summary", "TEMP", "125.8")) : "")
                                  ? ""
                                  : "°C",
                              },
                            ]}
                          />
                        </g>
                      ) : (
                        <g>
                          <MaintenanceCardSVG
                            x={-90}
                            y={200}
                            label="M-INLET"
                            params={[
                              {
                                label: "AMP",
                                value: "14.1",
                                unit: "A",
                              },
                              {
                                label: "HZ",
                                value: "50.0",
                                unit: "Hz",
                              },
                            ]}
                            id="st3_mnt_inlet"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st3_mnt_inlet")}
                          />
                          <MaintenanceCardSVG
                            x={240}
                            y={180}
                            label="M-EXHAUST"
                            params={[
                              { label: "AMP", value: "9.5", unit: "A" },
                              {
                                label: "VIB",
                                value: "0.6",
                                unit: "mm/s",
                              },
                            ]}
                            id="st3_mnt_exhaust"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st3_mnt_exhaust")}
                          />
                          <MaintenanceCardSVG
                            x={540}
                            y={380}
                            label="M-DOOR"
                            params={[
                              {
                                label: "VIB",
                                value: "0.9",
                                unit: "mm/s",
                              },
                              { label: "POS", value: "100", unit: "%" },
                            ]}
                            id="st3_mnt_door"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st3_mnt_door")}
                          />
                        </g>
                      )}
                    </g>

                    {/* --- STERILIZER 2 (BOTTOM LEFT) --- */}
                    <g transform="translate(0, 500)">
                      <StationLabelSVG
                        x={345}
                        y={405}
                        label="STERILIZER 2"
                      />
                      {viewMode === "process" ? (
                        <g>
                          <SensorCardSVG
                            x={140}
                            y={250}
                            label="Inlet Steam"
                            value={
                              getMappedValue
                                ? String(getMappedValue("st2_inlet_steam", "MONITOR", st2_inlet))
                                : st2_inlet
                            }
                            unit="%"
                            id="st2_inlet_steam"
                            equipmentName="Inlet Steam"
                            trendType="Pressure"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st2_inlet_steam")}
                          />
                          <DoorCardSVG
                            x={405}
                            y={200}
                            label="Exhaust"
                            status={
                              formatValveStatus(
                                getMappedValue
                                  ? getMappedValue("st2_exhaust", "MONITOR", st2_exhaust)
                                  : st2_exhaust
                              )
                            }
                            id="st2_exhaust"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st2_exhaust")}
                          />
                          <SensorCardSVG
                            x={180}
                            y={410}
                            label="Pressure"
                            value={
                              getMappedValue
                                ? String(getMappedValue("st2_pressure", "MONITOR", "0.0"))
                                : "0.0"
                            }
                            unit="bar"
                            id="st2_pressure"
                            equipmentName="ST2 Pressure"
                            trendType="Pressure"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st2_pressure")}
                            trendData={trendData}
                          />
                          <SensorCardSVG
                            x={750}
                            y={600}
                            label="Temperature"
                            value={
                              getMappedValue
                                ? String(getMappedValue("st2_temp", "MONITOR", "110.5"))
                                : "110.5"
                            }
                            unit="°C"
                            id="st2_temp"
                            equipmentName="ST2 Temperature"
                            trendType="Temperature"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st2_temp")}
                            trendData={trendData}
                          />
                          <DoorCardSVG
                            x={750}
                            y={430}
                            label="Inlet Door"
                            status={
                              formatDoorStatus(
                                getMappedValue
                                  ? getMappedValue("st2_door_in", "MONITOR", "Close")
                                  : "Close"
                              )
                            }
                            id="st2_door_in"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st2_door_in")}
                          />
                          <DoorCardSVG
                            x={-60}
                            y={430}
                            label="Outlet Door"
                            status={
                              formatDoorStatus(
                                getMappedValue
                                  ? getMappedValue("st2_door_out", "MONITOR", "Close")
                                  : "Close"
                              )
                            }
                            id="st2_door_out"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st2_door_out")}
                          />
                          <DoorCardSVG
                            x={930}
                            y={595}
                            label="Condensate"
                            status={
                              formatValveStatus(
                                getMappedValue
                                  ? getMappedValue("st2_condensate", "MONITOR", st2_cond)
                                  : st2_cond
                              )
                            }
                            id="st2_condensate"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st2_condensate")}
                          />
                          <SummaryTableSVG
                            x={750}
                            y={140}
                            id="st2_summary"
                            title="STERILIZER 2"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st2_summary")}
                            data={[
                              {
                                label: "Status",
                                value: getMappedValue
                                  ? String(getMappedValue("st2_summary", "STATUS", "STANDBY"))
                                  : "STANDBY",
                                unit: "",
                              },
                              {
                                label: "Actual Step",
                                value: getMappedValue
                                  ? String(getMappedValue("st2_summary", "ACTUAL_STEP", "0"))
                                  : "0",
                                unit: "",
                              },
                              {
                                label: "Total Time",
                                value: getMappedValue
                                  ? String(getMappedValue("st2_summary", "TOTAL_TIME", "0.0"))
                                  : "0.0",
                                unit: ["No Tag", "--"].includes(getMappedValue ? String(getMappedValue("st2_summary", "TOTAL_TIME", "0.0")) : "")
                                  ? ""
                                  : "min",
                              },
                              {
                                label: "Step Time",
                                value: getMappedValue
                                  ? String(getMappedValue("st2_summary", "STEP_TIME", "0.0"))
                                  : "0.0",
                                unit: ["No Tag", "--"].includes(getMappedValue ? String(getMappedValue("st2_summary", "STEP_TIME", "0.0")) : "")
                                  ? ""
                                  : "min",
                              },
                              {
                                label: "Cycle Time",
                                value: getMappedValue
                                  ? String(getMappedValue("st2_summary", "CYCLE_TIME", "00:00"))
                                  : "00:00",
                                unit: "",
                              },
                              {
                                label: "Total Cycle Time",
                                value: getMappedValue
                                  ? String(getMappedValue("st2_summary", "TOTAL_CYCLE_TIME", "00:00"))
                                  : "00:00",
                                unit: "",
                              },
                              {
                                label: "Pressure",
                                value: getMappedValue
                                  ? String(getMappedValue("st2_summary", "PRESSURE", "2.8"))
                                  : "2.8",
                                unit: ["No Tag", "--"].includes(getMappedValue ? String(getMappedValue("st2_summary", "PRESSURE", "2.8")) : "")
                                  ? ""
                                  : "Bar",
                              },
                            ]}
                          />
                        </g>
                      ) : (
                        <g>
                          <MaintenanceCardSVG
                            x={120}
                            y={250}
                            label="M-INLET"
                            params={[
                              {
                                label: "AMP",
                                value: "11.8",
                                unit: "A",
                              },
                              {
                                label: "HZ",
                                value: "42.5",
                                unit: "Hz",
                              },
                            ]}
                            id="st2_mnt_inlet"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st2_mnt_inlet")}
                          />
                          <MaintenanceCardSVG
                            x={445}
                            y={240}
                            label="M-EXHAUST"
                            params={[
                              { label: "AMP", value: "7.9", unit: "A" },
                              {
                                label: "VIB",
                                value: "0.5",
                                unit: "mm/s",
                              },
                            ]}
                            id="st2_mnt_exhaust"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st2_mnt_exhaust")}
                          />
                          <MaintenanceCardSVG
                            x={750}
                            y={430}
                            label="M-DOOR"
                            params={[
                              {
                                label: "VIB",
                                value: "1.4",
                                unit: "mm/s",
                              },
                              { label: "POS", value: "100", unit: "%" },
                            ]}
                            id="st2_mnt_door"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st2_mnt_door")}
                          />
                        </g>
                      )}
                    </g>

                    {/* --- STERILIZER 4 (BOTTOM RIGHT) --- */}
                    <g transform="translate(1400, 500)">
                      <StationLabelSVG
                        x={140}
                        y={405}
                        label="STERILIZER 4"
                      />
                      {viewMode === "process" ? (
                        <g>
                          <SensorCardSVG
                            x={-65}
                            y={250}
                            label="Inlet Steam"
                            value={
                              getMappedValue
                                ? String(getMappedValue("st4_inlet_steam", "MONITOR", st4_inlet))
                                : st4_inlet
                            }
                            unit="%"
                            id="st4_inlet_steam"
                            equipmentName="Inlet Steam"
                            trendType="Pressure"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st4_inlet_steam")}
                          />
                          <DoorCardSVG
                            x={200}
                            y={200}
                            label="Exhaust"
                            status={
                              formatValveStatus(
                                getMappedValue
                                  ? getMappedValue("st4_exhaust", "MONITOR", st4_exhaust)
                                  : st4_exhaust
                              )
                            }
                            id="st4_exhaust"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st4_exhaust")}
                          />
                          <SensorCardSVG
                            x={-25}
                            y={415}
                            label="Pressure"
                            value={
                              getMappedValue
                                ? String(getMappedValue("st4_pressure", "MONITOR", "0.0"))
                                : "0.0"
                            }
                            unit="bar"
                            id="st4_pressure"
                            equipmentName="ST4 Pressure"
                            trendType="Pressure"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st4_pressure")}
                            trendData={trendData}
                          />
                          <SensorCardSVG
                            x={550}
                            y={600}
                            label="Temperature"
                            value={
                              getMappedValue
                                ? String(getMappedValue("st4_temp", "MONITOR", "110.5"))
                                : "110.5"
                            }
                            unit="°C"
                            id="st4_temp"
                            equipmentName="ST4 Temperature"
                            trendType="Temperature"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st4_temp")}
                            trendData={trendData}
                          />
                          <DoorCardSVG
                            x={540}
                            y={430}
                            label="Inlet Door"
                            status={
                              formatDoorStatus(
                                getMappedValue
                                  ? getMappedValue("st4_door_in", "MONITOR", "Close")
                                  : "Close"
                              )
                            }
                            id="st4_door_in"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st4_door_in")}
                          />
                          <DoorCardSVG
                            x={-260}
                            y={430}
                            label="Outlet Door"
                            status={
                              formatDoorStatus(
                                getMappedValue
                                  ? getMappedValue("st4_door_out", "MONITOR", "Close")
                                  : "Close"
                              )
                            }
                            id="st4_door_out"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st4_door_out")}
                          />
                          <DoorCardSVG
                            x={730}
                            y={595}
                            label="Condensate"
                            status={
                              formatValveStatus(
                                getMappedValue
                                  ? getMappedValue("st4_condensate", "MONITOR", st4_cond)
                                  : st4_cond
                              )
                            }
                            id="st4_condensate"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st4_condensate")}
                          />
                          <SummaryTableSVG
                            x={550}
                            y={140}
                            id="st4_summary"
                            title="STERILIZER 4"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st4_summary")}
                            data={[
                              {
                                label: "Status",
                                value: getMappedValue
                                  ? String(getMappedValue("st4_summary", "STATUS", "RUN"))
                                  : "RUN",
                                unit: "",
                              },
                              {
                                label: "Actual Step",
                                value: getMappedValue
                                  ? String(getMappedValue("st4_summary", "ACTUAL_STEP", "5"))
                                  : "5",
                                unit: "",
                              },
                              {
                                label: "Total Time",
                                value: getMappedValue
                                  ? String(getMappedValue("st4_summary", "TOTAL_TIME", "8.2"))
                                  : "8.2",
                                unit: ["No Tag", "--"].includes(getMappedValue ? String(getMappedValue("st4_summary", "TOTAL_TIME", "8.2")) : "")
                                  ? ""
                                  : "min",
                              },
                              {
                                label: "Step Time",
                                value: getMappedValue
                                  ? String(getMappedValue("st4_summary", "STEP_TIME", "2.0"))
                                  : "2.0",
                                unit: ["No Tag", "--"].includes(getMappedValue ? String(getMappedValue("st4_summary", "STEP_TIME", "2.0")) : "")
                                  ? ""
                                  : "min",
                              },
                              {
                                label: "Cycle Time",
                                value: getMappedValue
                                  ? String(getMappedValue("st4_summary", "CYCLE_TIME", "08:10"))
                                  : "08:10",
                                unit: "",
                              },
                              {
                                label: "Total Cycle Time",
                                value: getMappedValue
                                  ? String(getMappedValue("st4_summary", "TOTAL_CYCLE_TIME", "38:40"))
                                  : "38:40",
                                unit: "",
                              },
                              {
                                label: "Temp",
                                value: getMappedValue
                                  ? String(getMappedValue("st4_summary", "TEMP", "118.4"))
                                  : "118.4",
                                unit: ["No Tag", "--"].includes(getMappedValue ? String(getMappedValue("st4_summary", "TEMP", "118.4")) : "")
                                  ? ""
                                  : "°C",
                              },
                            ]}
                          />
                        </g>
                      ) : (
                        <g>
                          <MaintenanceCardSVG
                            x={-90}
                            y={250}
                            label="M-INLET"
                            params={[
                              {
                                label: "AMP",
                                value: "13.4",
                                unit: "A",
                              },
                              {
                                label: "HZ",
                                value: "48.0",
                                unit: "Hz",
                              },
                            ]}
                            id="st4_mnt_inlet"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st4_mnt_inlet")}
                          />
                          <MaintenanceCardSVG
                            x={240}
                            y={240}
                            label="M-EXHAUST"
                            params={[
                              { label: "AMP", value: "8.8", unit: "A" },
                              {
                                label: "VIB",
                                value: "0.7",
                                unit: "mm/s",
                              },
                            ]}
                            id="st4_mnt_exhaust"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st4_mnt_exhaust")}
                          />
                          <MaintenanceCardSVG
                            x={540}
                            y={430}
                            label="M-DOOR"
                            params={[
                              {
                                label: "VIB",
                                value: "1.1",
                                unit: "mm/s",
                              },
                              { label: "POS", value: "100", unit: "%" },
                            ]}
                            id="st4_mnt_door"
                            onClick={handleEquipmentClick}
                            style={getDeveloperStyle("st4_mnt_door")}
                          />
                        </g>
                      )}
                    </g>
                  </g>
                );
              })()}
            <defs>
              <filter
                id="yellow-glow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="4"
                  floodColor="#ffdb3b"
                  floodOpacity="1"
                />
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="8"
                  floodColor="#ffdb3b"
                  floodOpacity="0.6"
                />
              </filter>
              <filter id="tint-red">
                <feColorMatrix type="matrix"
                  values="0.244 0.822 0.083 0 0
              0     0     0     0 0
              0     0     0     0 0
              0     0     0     1 0"/>
              </filter>
              <filter id="tint-green">
                <feColorMatrix type="matrix"
                  values="0      0      0      0 0
              0.2445 0.8225 0.0830 0 0
              0      0      0      0 0
              0     0     0     1 0"/>
              </filter>
            </defs>
          </svg>
        </div>
      </div>
      {activeKeypad && (
        <NumericKeypad
          value={activeKeypad.value}
          label={activeKeypad.label}
          unit={activeKeypad.unit || ''}
          onClose={() => setActiveKeypad(null)}
          onConfirm={handleKeypadConfirm}
        />
      )}
    </div>
  );
}