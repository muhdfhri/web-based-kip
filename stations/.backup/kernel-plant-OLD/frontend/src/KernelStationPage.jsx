import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import kernelStationImageUrl from './assets/kernel-station.png'
import nutCrackingImgUrl from './assets/kernel_nut_cracking.webp'
import kernelStorageImgUrl from './assets/kernel_storage_dispatch.webp'
import usePlcStore from '@core/store'

// SVG Icons
import motorSvg from './assets/item/motor.svg'
import backMotorSvg from './assets/item/back_motor.svg'
import fanSvg from './assets/item/fan.svg'
import ringFanSvg from './assets/item/ring_fan.svg'

import './KernelStationPage.css'

// Auth helper
const authHeaders = () => {
    const token = localStorage.getItem("kip_token");
    return {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
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
                    const key = `${data.targetId}__${sig.key || sig}`;
                    initial[key] = tagMap[key] || "";
                });
            } else {
                const targets = data.subs && data.subs.length > 0 ? data.subs : [data.targetId];
                targets.forEach((t) => {
                    initial[`${t}__STATUS`] = tagMap[`${t}__STATUS`] || "";
                    initial[`${t}__START`] = tagMap[`${t}__START`] || "";
                    initial[`${t}__STOP`] = tagMap[`${t}__STOP`] || "";
                });
                if (!data.subs || data.subs.length === 0) {
                    initial[`${data.targetId}__MONITOR`] =
                        tagMap[`${data.targetId}__MONITOR`] || "";
                }
            }
            setLocalTags(initial);
        }
    }, [data, tagMap]);

    if (!data) return null;

    const isGroup = data.subs && data.subs.length > 0;
    const hasSignals = data.signals && data.signals.length > 0;
    const allTags = availableTags; // show all tags

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
                <option value="">— No Tag —</option>
                {tagList.map((t) => (
                    <option key={t.id} value={t.id}>
                        {t.tag_name}
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
                paddingTop: "10vh",
                position: "fixed",
                top: 0, left: 0, right: 0, bottom: 0
            }}
        >
            <div
                className="som-equipment-modal"
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
                    width: "400px",
                    borderRadius: "16px",
                    overflow: "hidden",
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
                                display: "block"
                            }}
                        >
                            Hardware Mapping: {data.targetId}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "#94a3b8",
                            cursor: "pointer",
                            fontSize: "16px",
                        }}
                    >
                        ✕
                    </button>
                </div>

                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                    {hasSignals ? (
                        data.signals.map((sig) => {
                            const sigKey = sig.key || sig;
                            const sigLabel = sig.label || sigKey;
                            const k = `${data.targetId}__${sigKey}`;
                            return (
                                <div key={k}>
                                    {renderTagSelect(
                                        localTags[k],
                                        (val) => setLocalTags((prev) => ({ ...prev, [k]: val })),
                                        allTags,
                                        sigLabel
                                    )}
                                </div>
                            );
                        })
                    ) : isGroup ? (
                        data.subs.map((sub) => (
                            <div
                                key={sub}
                                style={{
                                    background: "rgba(255,255,255,0.02)",
                                    padding: "16px",
                                    borderRadius: "8px",
                                    border: "1px solid rgba(255,255,255,0.05)",
                                }}
                            >
                                <h4
                                    style={{
                                        margin: "0 0 16px 0",
                                        fontSize: "11px",
                                        color: "#f1f5f9",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Sub-Equipment: {sub}
                                </h4>
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    {renderTagSelect(
                                        localTags[`${sub}__STATUS`],
                                        (val) => setLocalTags((prev) => ({ ...prev, [`${sub}__STATUS`]: val })),
                                        allTags,
                                        "Status/Feedback (READ)"
                                    )}
                                    {renderTagSelect(
                                        localTags[`${sub}__START`],
                                        (val) => setLocalTags((prev) => ({ ...prev, [`${sub}__START`]: val })),
                                        allTags,
                                        "Start Command (WRITE)"
                                    )}
                                    {renderTagSelect(
                                        localTags[`${sub}__STOP`],
                                        (val) => setLocalTags((prev) => ({ ...prev, [`${sub}__STOP`]: val })),
                                        allTags,
                                        "Stop Command (WRITE)"
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {renderTagSelect(
                                localTags[`${data.targetId}__MONITOR`],
                                (val) => setLocalTags((prev) => ({ ...prev, [`${data.targetId}__MONITOR`]: val })),
                                allTags,
                                "MONITORING POINT (READ)"
                            )}
                        </div>
                    )}
                </div>

                <div
                    style={{
                        padding: "16px 24px",
                        background: "rgba(0,0,0,0.2)",
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "12px",
                    }}
                >
                    <button
                        onClick={onClose}
                        style={{
                            padding: "8px 16px",
                            background: "transparent",
                            color: "#e2e8f0",
                            border: "1px solid rgba(255,255,255,0.2)",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(localTags, data)}
                        style={{
                            padding: "8px 16px",
                            background: "#3b82f6",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                            opacity: saving ? 0.7 : 1,
                        }}
                        disabled={saving}
                    >
                        {saving ? "Saving..." : "Apply Mapping"}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

/**
 * Standardized Hooks & Components
 */

function useAmpHover() {
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef(null)
  const [popupPos, setPopupPos] = useState(null)
  const hoverTimeoutRef = useRef(null)

  const handleMouseEnter = () => {
    setIsHovered(true)
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect()
      setPopupPos({
        top: rect.top,
        right: rect.right,
        left: rect.left,
        bottom: rect.bottom,
      })
    }
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false)
      setPopupPos(null)
    }, 150)
  }

  const handlePopupMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setIsHovered(true)
  }

  const handlePopupMouseLeave = () => {
    setIsHovered(false)
    setPopupPos(null)
  }

  return {
    cardRef,
    isHovered,
    popupPos,
    handleMouseEnter,
    handleMouseLeave,
    handlePopupMouseEnter,
    handlePopupMouseLeave,
  }
}



/**
 * Trend Popup component (Standardized)
 */
function StatusGraphPopup({ position, equipmentName, tagName, hzTag, hzValue, type = 'Current', value = 0, unit = 'A', onMouseEnter, onMouseLeave }) {
  const popupRef = useRef(null)
  const [style, setStyle] = useState({ opacity: 0, pointerEvents: 'none' })
  const [historyPoints, setHistoryPoints] = useState([])
  const [hzHistoryPoints, setHzHistoryPoints] = useState([])
  const [hoverData, setHoverData] = useState(null)

  // Fetch history - Ampere
  useEffect(() => {
    if (!tagName) return
    const limitValue = 24
    const BASE_URL = import.meta.env.VITE_SOCKET_URL || '';
    const fetchUrl = BASE_URL ? `${BASE_URL}/api/plc/historical/tag/${tagName}?limit=${limitValue}&filter=daily` : `/api/plc/historical/tag/${tagName}?limit=${limitValue}&filter=daily`;

    fetch(fetchUrl)
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) setHistoryPoints(json.data);
      })
      .catch(e => console.error("Error fetching amp historical points", e))
  }, [tagName])

  // Fetch history - Hz
  useEffect(() => {
    if (!hzTag) return
    const limitValue = 24
    const BASE_URL = import.meta.env.VITE_SOCKET_URL || '';
    const fetchUrl = BASE_URL ? `${BASE_URL}/api/plc/historical/tag/${hzTag}?limit=${limitValue}&filter=daily` : `/api/plc/historical/tag/${hzTag}?limit=${limitValue}&filter=daily`;

    fetch(fetchUrl)
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) setHzHistoryPoints(json.data);
      })
      .catch(e => console.error("Error fetching hz historical points", e))
  }, [hzTag])

  // Only layout popup once based on position
  useEffect(() => {
    if (!position || !popupRef.current) return
    const viewportWidth = window.innerWidth
    const padding = 20
    const popupWidth = 450

    let left = position.right + 15
    let top = position.top - 10

    if (left + popupWidth > viewportWidth - padding) left = position.left - popupWidth - 15

    const popupHeight = 350
    const viewportHeight = window.innerHeight
    if (top + popupHeight > viewportHeight - padding) top = viewportHeight - popupHeight - padding
    if (top < padding) top = padding
    if (left < padding) left = padding

    setStyle({ top: `${top}px`, left: `${left}px`, opacity: 1, pointerEvents: 'auto' })
  }, [position])

  const width = 400
  const height = 200
  const plotLeft = 40
  const plotRight = 360
  const plotTop = 20
  const plotBottom = 160

  const { ampPoints, hzPoints, fullData, dynamicMax } = useMemo(() => {
    const now = new Date();
    const opStart = new Date(now);
    // If before 07:00 AM, shift starts at 07:00 yesterday
    if (now.getHours() < 7) {
      opStart.setDate(now.getDate() - 1);
    }
    opStart.setHours(7, 0, 0, 0);

    // Create 24 buckets representing each hour of the operational day
    const buckets = Array.from({ length: 24 }).map((_, i) => {
      const d = new Date(opStart);
      d.setHours(opStart.getHours() + i);
      return { hr: d.getHours(), dt: d.getDate(), ampVal: 0, hzVal: 0, hasData: false };
    });

    historyPoints.forEach(h => {
      const hDate = new Date(h.timestamp.replace(' ', 'T'));
      if (isNaN(hDate.getTime())) return;
      const bIdx = buckets.findIndex(b => b.hr === hDate.getHours() && b.dt === hDate.getDate());
      if (bIdx !== -1) {
        buckets[bIdx].ampVal = parseFloat(h.value);
        buckets[bIdx].hasData = true;
      }
    });

    hzHistoryPoints.forEach(h => {
      const hDate = new Date(h.timestamp.replace(' ', 'T'));
      if (isNaN(hDate.getTime())) return;
      const bIdx = buckets.findIndex(b => b.hr === hDate.getHours() && b.dt === hDate.getDate());
      if (bIdx !== -1) {
        buckets[bIdx].hzVal = parseFloat(h.value);
        buckets[bIdx].hasData = true;
      }
    });

    // Determine Dynamic Max
    let maxVal = 0;
    buckets.forEach(b => {
      if (b.ampVal > maxVal) maxVal = b.ampVal;
      if (b.hzVal > maxVal) maxVal = b.hzVal;
    });

    // If no data or small data, default to 50
    if (maxVal < 10) maxVal = 50;

    // Add ~15% margin and snap to nice numbers
    const targetMax = maxVal * 1.15;

    let snapStep = 10;
    if (targetMax > 100) snapStep = 20;
    if (targetMax > 200) snapStep = 50;
    if (targetMax > 500) snapStep = 100;

    let calcMax = Math.ceil(targetMax / snapStep) * snapStep;

    const aPts = buckets.map((b, i) => {
      const x = plotLeft + ((plotRight - plotLeft) * i) / 23;
      const t = Math.max(0, b.ampVal) / calcMax;
      const y = plotBottom - t * (plotBottom - plotTop);
      return { x, y };
    });

    const hPts = buckets.map((b, i) => {
      const x = plotLeft + ((plotRight - plotLeft) * i) / 23;
      const t = Math.max(0, b.hzVal) / calcMax;
      const y = plotBottom - t * (plotBottom - plotTop);
      return { x, y };
    });

    const fData = buckets.map((b, i) => {
      return {
        x: plotLeft + ((plotRight - plotLeft) * i) / 23,
        hour: b.hr,
        date: b.dt,
        amp: b.ampVal,
        hz: b.hzVal,
        hasData: b.hasData
      };
    });

    return { ampPoints: aPts, hzPoints: hPts, fullData: fData, dynamicMax: calcMax };
  }, [historyPoints, hzHistoryPoints])

  // Generate SVG path for Ampere (Blue)
  const ampPath = useMemo(() => {
    if (!fullData || fullData.length === 0) return '';
    let path = `M ${fullData[0].x},${plotBottom - (Math.max(0, fullData[0].amp) / dynamicMax) * (plotBottom - plotTop)}`;
    for (let i = 1; i < fullData.length; i++) {
      path += ` L ${fullData[i].x},${plotBottom - (Math.max(0, fullData[i].amp) / dynamicMax) * (plotBottom - plotTop)}`;
    }
    return path;
  }, [fullData, dynamicMax]);

  // Area fill under Ampere
  const areaPath = useMemo(() => {
    if (!fullData || fullData.length === 0) return '';
    return `${ampPath} L ${plotRight},${plotBottom} L ${plotLeft},${plotBottom} Z`;
  }, [ampPath]);

  const handleGraphMouseMove = (e) => {
    if (!fullData || fullData.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const xPos = ratio * width; // Scale screen pixels back to SVG coordinates (0 - 400)

    // Find closest point by X coordinate
    let closest = fullData[0];
    let minDiff = Math.abs(xPos - fullData[0].x);
    for (let i = 1; i < fullData.length; i++) {
      const diff = Math.abs(xPos - fullData[i].x);
      if (diff < minDiff) {
        minDiff = diff;
        closest = fullData[i];
      }
    }

    // Only show if reasonably close to the graph area
    if (xPos >= plotLeft - 10 && xPos <= plotRight + 10) {
      setHoverData(closest);
    } else {
      setHoverData(null);
    }
  };

  const handleGraphMouseLeave = () => {
    setHoverData(null);
  };

  return createPortal(
    <div ref={popupRef} className="som-amp-popup" style={{ ...style, pointerEvents: 'auto' }} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className="som-amp-popup-header">
        <div className="som-amp-popup-title">{type} Trend (24H Shift)</div>
        <div className="som-amp-popup-subtitle">
          <span>{equipmentName}</span>
          <span style={{ color: '#ffdb3b' }}><b>Amp [A]:</b> {value ? value.toFixed(1) : '0.0'}</span>
          <span style={{ color: '#0f172a' }}><b>Hz:</b> {hzValue ? hzValue.toFixed(1) : '0.0'}</span>
        </div>
      </div>
      <div className="som-amp-popup-body" style={{ pointerEvents: 'auto' }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="som-amp-graph-svg" onMouseMove={handleGraphMouseMove} onMouseLeave={handleGraphMouseLeave}>
          <defs>
            <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffdb3b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ffdb3b" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <rect x={plotLeft} y={plotTop} width={plotRight - plotLeft} height={plotBottom - plotTop} fill="rgba(0,0,0,0.02)" />

          {/* Y-Axis Grid & Labels */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
            const y = plotBottom - ratio * (plotBottom - plotTop);
            const val = (ratio * dynamicMax).toPrecision(3).replace(/\.0+$/, '');
            return (
              <g key={`y-${ratio}`}>
                <line x1={plotLeft} y1={y} x2={plotRight} y2={y} stroke="rgba(0,0,0,0.06)" strokeDasharray={ratio === 0 ? "0" : "4 4"} />
                <text x={plotLeft - 8} y={y + 3} fill="#64748b" fontSize="9" fontWeight="bold" textAnchor="end" fontFamily="Inter, sans-serif">{parseInt(val)}</text>
              </g>
            )
          })}

          {/* X-Axis Grid & Labels */}
          {[0, 3, 6, 9, 12, 15, 18, 21, 23].map((hrIndex) => {
            const x = plotLeft + ((plotRight - plotLeft) * hrIndex) / 23;
            const hrCalc = (7 + hrIndex) % 24;
            const label = String(hrCalc).padStart(2, '0') + ":00";
            return (
              <g key={`x-${hrIndex}`}>
                <line x1={x} y1={plotTop} x2={x} y2={plotBottom} stroke="rgba(0,0,0,0.04)" />
                <line x1={x} y1={plotBottom} x2={x} y2={plotBottom + 5} stroke="rgba(0,0,0,0.2)" />
                <text x={x} y={plotBottom + 16} fill="#64748b" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="Inter, sans-serif">{label}</text>
              </g>
            )
          })}


          <path d={areaPath} style={{ fill: 'url(#trendGradient)' }} className="som-amp-graph-area" />

          <g>
            {fullData.map((d, i) => {
              if (i === 0) return null;
              const prev = fullData[i - 1];
              const isMissingData = !d.hasData && !prev.hasData;
              const yAmp1 = plotBottom - (Math.max(0, prev.amp) / dynamicMax) * (plotBottom - plotTop);
              const yAmp2 = plotBottom - (Math.max(0, d.amp) / dynamicMax) * (plotBottom - plotTop);
              const yHz1 = plotBottom - (Math.max(0, prev.hz) / dynamicMax) * (plotBottom - plotTop);
              const yHz2 = plotBottom - (Math.max(0, d.hz) / dynamicMax) * (plotBottom - plotTop);

              return (
                <g key={`seg-${i}`}>
                  <line
                    x1={prev.x} y1={yAmp1} x2={d.x} y2={yAmp2}
                    stroke="#ffdb3b"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={isMissingData ? "4 4" : "0"}
                    opacity={isMissingData ? 0.3 : 1}
                  />
                  <line
                    x1={prev.x} y1={yHz1} x2={d.x} y2={yHz2}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeDasharray={isMissingData ? "2 6" : "4 2"}
                    opacity={isMissingData ? 0.3 : 1}
                  />
                </g>
              );
            })}
          </g>

          <rect x={plotLeft} y={plotTop} width={plotRight - plotLeft} height={plotBottom - plotTop} fill="transparent" pointerEvents="all" />

          {hoverData && (
            <g>
              <line x1={hoverData.x} y1={plotTop} x2={hoverData.x} y2={plotBottom} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx={hoverData.x} cy={plotBottom - (Math.max(0, hoverData.amp) / dynamicMax) * (plotBottom - plotTop)} r="4" fill="#ffdb3b" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx={hoverData.x} cy={plotBottom - (Math.max(0, hoverData.hz) / dynamicMax) * (plotBottom - plotTop)} r="4" fill="#0f172a" stroke="#ffffff" strokeWidth="1.5" />

              <g transform={`translate(${hoverData.x > (plotLeft + plotRight) / 2 ? hoverData.x - 90 : hoverData.x + 10}, ${plotTop + 10})`}>
                <rect width="80" height="45" rx="4" fill="rgba(255, 255, 255, 0.95)" stroke="#cbd5e1" strokeWidth="1" style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))' }} />
                <text x="40" y="14" fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="Inter, sans-serif">
                  {String(hoverData.hour).padStart(2, '0')}:00
                </text>
                <text x="8" y="28" fill="#ffdb3b" fontSize="9" fontWeight="bold" fontFamily="Inter, sans-serif">
                  Amp: {hoverData.amp.toFixed(1)}
                </text>
                <text x="8" y="40" fill="#0f172a" fontSize="9" fontWeight="bold" fontFamily="Inter, sans-serif">
                  Hz: {hoverData.hz.toFixed(1)}
                </text>
              </g>
            </g>
          )}

        </svg>
      </div>
    </div>,
    document.body
  )
}

/**
 * Reusable Motor SVG Component (Card + Icon)
 */
const MotorCardSVG = ({ x, y, id, label, frequency = 0, ampere = 0, ampTag, hzTag, onClick, size = 110, isEditable }) => {
  const isRunning = ampere > 0
  const computedHzTag = hzTag || (ampTag ? ampTag.replace('_AMP', '_HZ') : null);
  const { cardRef, isHovered, popupPos, handleMouseEnter, handleMouseLeave, handlePopupMouseEnter, handlePopupMouseLeave } = useAmpHover()

  return (
    <g id={id} className={`svg-equipment motor-group ${isRunning ? 'motor-on' : 'motor-off'}`} onClick={() => onClick && onClick(id)} style={{ cursor: isEditable ? 'pointer' : 'default' }}>
      <foreignObject x={x - 150} y={y - 60} width="300" height="150" style={{ overflow: 'visible' }}>
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div ref={cardRef} className={`som-motor-mini-card ${isEditable ? 'som-editable' : ''}`} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <div className="som-motor-mini-header">
              <span className="som-motor-mini-label">{label}</span>
              <div className={`som-status-indicator ${isRunning ? 'running' : 'stop'}`}></div>
            </div>
            <div className="som-motor-mini-body">
              <div className="som-motor-param-row">
                <span className="som-motor-param-label">Speed</span>
                <span className="som-motor-mini-value" data-unit="Hz">{Number(frequency || 0).toFixed(1)}</span>
              </div>
              <div className="som-motor-param-row">
                <span className="som-motor-param-label">Load</span>
                <span className="som-motor-mini-value" data-unit="A">{Number(ampere || 0).toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>
      </foreignObject>
      {isHovered && popupPos && (
        <StatusGraphPopup
          position={popupPos}
          equipmentName={label}
          tagName={ampTag}
          hzTag={computedHzTag}
          type="Current"
          value={ampere}
          hzValue={frequency}
          unit="A"
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
        />
      )}
    </g>
  )
}


const EquipmentIconSVG = ({ x, y, icon, isRunning, size = 60, rotation = 0, scaleX = 1, className = "" }) => {
  return (
    <image
      href={icon}
      x={x - (size / 2)}
      y={y - (size / 2)}
      width={size}
      height={size}
      className={className}
      style={{
        transform: `rotate(${rotation}deg) scaleX(${scaleX})`,
        transformOrigin: `${x}px ${y}px`,
        pointerEvents: 'none',
        filter: isRunning ? 'url(#tint-green)' : 'url(#tint-red)'
      }}
    />
  )
}

const FanIconSVG = ({ x, y, isRunning, size = 80 }) => {
  return (
    <g>
      <image
        href={ringFanSvg}
        x={x - (size / 2)}
        y={y - (size / 2)}
        width={size}
        height={size}
        style={{ filter: isRunning ? 'url(#tint-green)' : 'url(#tint-red)' }}
      />
      <image
        href={fanSvg}
        x={x - (size / 2)}
        y={y - (size / 2)}
        width={size}
        height={size}
        className={isRunning ? 'som-kernel-fan-blades--running' : ''}
        style={{
          transformOrigin: `${x}px ${y}px`,
          filter: isRunning ? 'url(#tint-green)' : 'url(#tint-red)'
        }}
      />
    </g>
  )
}

const KernelLabelSVG = ({ x, y, label, fontSize = "16px", hasOutline = true }) => {
  const lines = String(label).split('\n')
  return (
    <text
      x={x} y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      className="som-kernel-label-svg"
      style={{
        fontSize: fontSize,
        stroke: hasOutline ? '#FFFFFF' : 'none',
      }}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : '1.1em'}>{line}</tspan>
      ))}
    </text>
  )
}

const KSTCardSVG = ({ x, y, id, label, values = [], status = null, isRunning = true, onClick, isEditable }) => {
  return (
    <g id={id} className={`svg-equipment ${isRunning ? 'motor-on' : 'motor-off'}`} onClick={() => onClick && onClick(id)} style={{ cursor: isEditable ? 'pointer' : 'default' }}>
      <foreignObject x={x - 85} y={y - 80} width="170" height="200" style={{ overflow: 'visible' }}>
        <div className={`som-kernel-card-mini ${isEditable ? 'som-editable' : ''}`} style={{ minWidth: '170px' }}>
          <div className="som-kernel-card-header">
            <span className="som-kernel-card-title">{label}</span>
            <svg className="som-oc-gear-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '12px', height: '12px', color: '#64748b' }}>
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </div>
          <div className="som-kernel-card-body">
            {values.map((v, i) => (
              <div key={i} className="som-kernel-card-row">
                <span className="som-kernel-card-label">{v.label}</span>
                <span className="som-kernel-card-value" data-unit={v.unit}>
                  {v.value}
                </span>
              </div>
            ))}
            {status && (
              <div className={`som-kernel-card-status ${isRunning ? 'status-running' : 'status-stop'}`}>
                {status}
              </div>
            )}
          </div>
        </div>
      </foreignObject>
    </g>
  )
}

const KSTBunkerCardSVG = ({ x, y, label, stock, moisture, ds }) => (
  <foreignObject x={x - 85} y={y - 80} width="170" height="180" style={{ overflow: 'visible' }}>
    <div className="som-kernel-card-mini" style={{ minWidth: '170px', borderTop: '3px solid #ffdb3b' }}>
      <div className="som-kernel-card-header" style={{ background: '#0f172a' }}>
        <span className="som-kernel-card-title" style={{ color: '#ffffff' }}>{label}</span>
      </div>
      <div className="som-kernel-card-body">
        <div className="som-kernel-card-row">
          <span className="som-kernel-card-label">Stock</span>
          <span className="som-kernel-card-value" color="#0f172a" data-unit="mt">{stock}</span>
        </div>
        <div className="som-kernel-card-row">
          <span className="som-kernel-card-label">Moisture</span>
          <span className="som-kernel-card-value" color="#0f172a" data-unit="%">{moisture}</span>
        </div>
        <div className="som-kernel-card-row">
          <span className="som-kernel-card-label">D&S</span>
          <span className="som-kernel-card-value" color="#0f172a" data-unit="%">{ds}</span>
        </div>
      </div>
    </div>
  </foreignObject>
)

const KSTProductionBoxSVG = ({ x, y, data }) => (
  <foreignObject x={x - 1100} y={y - 130} width="800" height="120" style={{ overflow: 'visible' }}>
    <div className="som-kernel-card-mini" style={{ minWidth: '800px', borderLeft: '4px solid #ffdb3b' }}>
      <div className="som-kernel-card-header" style={{ background: '#0f172a' }}>
        <span className="som-kernel-card-title" style={{ color: '#ffffff' }}>Daily Production Summary</span>
      </div>
      <div className="som-kernel-card-body" style={{ display: 'flex', flexDirection: 'row', gap: '30px', padding: '12px 20px' }}>
        {data.map((item, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderRight: i === data.length - 1 ? 'none' : '1px solid #e2e8f0', paddingRight: '30px' }}>
            <span className="som-kernel-card-label" style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap' }}>{item.label}</span>
            <span className="som-kernel-card-value" style={{ fontSize: '20px', color: '#0f172a', whiteSpace: 'nowrap' }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  </foreignObject>
)

const KSTSimpleTextBoxSVG = ({ x, y, lines = [] }) => (
  <foreignObject x={x - -270} y={y - 610} width="220" height="300" style={{ overflow: 'visible' }}>
    <div className="som-kernel-card-mini" style={{ minWidth: '220px' }}>
      <div className="som-kernel-card-header">
        <span className="som-kernel-card-title">Production</span>
      </div>
      <div className="som-kernel-card-body" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {lines.map((text, i) => {
          const [label, value] = text.split(' = ');
          return (
            <div key={i} className="som-kernel-card-row" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: i === lines.length - 1 ? 'none' : '1px solid #f1f5f9', paddingBottom: i === lines.length - 1 ? '0' : '6px', gap: '4px' }}>
              <span className="som-kernel-card-label" style={{ fontSize: '10px', whiteSpace: 'normal', lineHeight: '1.2' }}>{label}</span>
              <span className="som-kernel-card-value" style={{ fontSize: '14px', whiteSpace: 'normal', color: '#0f172a' }}>{value}</span>
            </div>
          )
        })}
      </div>
    </div>
  </foreignObject>
)

const KSTTableSVG = ({ x, y, title, headers, rows }) => (
  <foreignObject x={x - 225} y={y - 130} width="450" height="260" style={{ overflow: 'visible' }}>
    <div className="som-kernel-card-mini" style={{ minWidth: '450px' }}>
      <div className="som-kernel-card-header">
        <span className="som-kernel-card-title">{title}</span>
      </div>
      <div className="som-kernel-card-body" style={{ padding: '0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#0f172a', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: 'rgba(15, 23, 42, 0.05)' }}>
              <th style={{ padding: '8px', textAlign: 'left', color: '#64748b' }}>Unit</th>
              {headers.map((h, i) => <th key={i} style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px', fontWeight: '800', color: '#0f172a' }}>{row.label}</td>
                {row.values.map((v, j) => (
                  <td key={j} style={{ padding: '8px', textAlign: 'center', color: '#0f172a', fontWeight: '900', fontSize: '13px' }}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </foreignObject>
)

const DefsOverlay = () => (
  <defs>
    <pattern id="diagGrid" width="100" height="100" patternUnits="userSpaceOnUse">
      <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255, 219, 59, 0.2)" strokeWidth="1" />
      <circle cx="0" cy="0" r="1.5" fill="rgba(255, 219, 59, 0.4)" />
    </pattern>
    <filter id="tint-red">
      <feColorMatrix type="matrix"
        values="0.244 0.822 0.083 0 0
                0     0     0     0 0
                0     0     0     0 0
                0 0 0 1 0"/>
    </filter>
    <filter id="tint-green">
      <feColorMatrix type="matrix"
        values="0.0638 0.2146 0.0216 0 0
                0.2551 0.8582 0.0867 0 0
                0.0425 0.1430 0.0144 0 0
                0 0 0 1 0"/>
    </filter>
  </defs>
)

const DiagOverlay = ({ viewX, viewWidth, bannerX }) => (
  <g className="som-diag-group">
    <rect x={viewX} y="-55" width={viewWidth} height="1150" fill="url(#diagGrid)" className="som-diag-grid" />
    <foreignObject x={viewX} y="-55" width={viewWidth} height="1150" style={{ pointerEvents: 'none', overflow: 'visible' }}>
      <div className="som-diag-scanline"></div>
    </foreignObject>
    <foreignObject x={bannerX} y="20" width="600" height="60" style={{ overflow: 'visible' }}>
      <div className="som-diagnostic-banner">
        TECHNICAL DIAGNOSTIC ACTIVE
      </div>
    </foreignObject>
  </g>
)

const MaintenanceCardSVG = ({ x, y, id, label, params = [], onClick, width = 300, isEditable }) => (
  <g id={id} className="svg-equipment motor-group maintenance-card-group" onClick={() => onClick && onClick(id)} style={{ cursor: isEditable ? 'pointer' : 'default' }}>
    <foreignObject x={x - (width / 2)} y={y - 40} width={width} height="120" style={{ overflow: 'visible' }}>
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <div className={`som-motor-mini-card maintenance-card ${isEditable ? 'som-editable' : ''}`}>
          <div className="som-motor-mini-header">
            <div className="som-motor-mini-label">{label}</div>
            <div className="som-maintenance-mini-icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
              </svg>
            </div>
          </div>
          <div className="som-motor-mini-body">
            {params.map((p, idx) => (
              <div key={idx} className="som-motor-param-row">
                <span className="som-motor-param-label">{p.label}</span>
                <span className="som-motor-mini-value" data-unit={p.unit}>{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </foreignObject>
  </g>
)

function KernelStationPage({ user, onSelectSubmenu }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [viewMode, setViewMode] = useState('process')
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const svgRef = useRef(null)

  const handleMouseMove = (e) => {
    if (!svgRef.current) return
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
    setCoords({ x: Math.round(svgP.x), y: Math.round(svgP.y) })
  }

  const initSocket = usePlcStore(state => state.initSocket)
  const tags = usePlcStore(state => state.tags)
  const getTag = (tagName) => {
    // Simulation layer for development
    const simulationTags = {
      'KRN_PD_AMP': 22.4, 'KRN_PD_HZ': 50.0, 'KRN_PD_RUN': 1,
      'KRN_FC_AMP': 45.1, 'KRN_FC_HZ': 48.2, 'KRN_FC_RUN': 1,
      'KRN_FC_AL_RUN': 1,
      'KRN_DS_AMP': 42.8, 'KRN_DS_HZ': 47.5, 'KRN_DS_RUN': 1,
      'KRN_DS_AL_RUN': 1,
      'KRN_NC_AMP': 12.4, 'KRN_NC_HZ': 50.0, 'KRN_NC_RUN': 1,
      'KRN_RM1_AMP': 44.1, 'KRN_RM1_HZ': 48.0, 'KRN_RM1_RUN': 1,
      'KRN_RM2_AMP': 43.5, 'KRN_RM2_HZ': 48.0, 'KRN_RM2_RUN': 1,
      'KRN_RM3_AMP': 45.0, 'KRN_RM3_HZ': 48.0, 'KRN_RM3_RUN': 1,
      'KRN_RM4_AMP': 44.2, 'KRN_RM4_HZ': 48.0, 'KRN_RM4_RUN': 1,
      'KRN_RM5_AMP': 43.8, 'KRN_RM5_HZ': 48.0, 'KRN_RM5_RUN': 1,
      'KRN_RM6_AMP': 44.5, 'KRN_RM6_HZ': 48.0, 'KRN_RM6_RUN': 1,
      'KRN_LT1_AMP': 18.2, 'KRN_LT1_HZ': 46.5, 'KRN_LT1_RUN': 1,
      'KRN_LT1_AL_RUN': 1,
      'KRN_LT2_AMP': 17.9, 'KRN_LT2_HZ': 46.2, 'KRN_LT2_RUN': 1,
      'KRN_LT2_AL_RUN': 1,
      'KRN_MXC_AMP': 14.8, 'KRN_MXC_HZ': 50.0, 'KRN_MXC_RUN': 1,
      'KRN_MXE_AMP': 15.2, 'KRN_MXE_HZ': 50.0, 'KRN_MXE_RUN': 1,
    }

    if (tags[tagName]) return tags[tagName];
    if (simulationTags[tagName] !== undefined) {
      return { value: simulationTags[tagName], status: simulationTags[tagName] > 0 ? 'RUN' : 'STOP', timestamp: new Date().toISOString() };
    }
    return { value: 0, status: 'STOP', timestamp: null };
  }

  useEffect(() => {
    initSocket()
  }, [initSocket])

  // --- PLC CONFIG STATE ---
  const [configMode, setConfigMode] = useState(false);
  const [tagEdit, setTagEdit] = useState(null);
  const [tagMap, setTagMap] = useState({});
  const [availableTags, setAvailableTags] = useState([]);
  const [savingTags, setSavingTags] = useState(false);
  const [liveValues, setLiveValues] = useState({});

  const tagIdToName = useMemo(() => {
      const map = {};
      availableTags.forEach((t) => { map[t.id] = t.tag_name; });
      return map;
  }, [availableTags]);

  useEffect(() => {
      const isDev = user?.userRole?.toLowerCase() === 'developer' || user?.role?.toLowerCase() === 'developer';
      if (!isDev) return;
      const onKeyDown = (e) => {
          if (e.ctrlKey && e.key === 'x') {
              e.preventDefault();
              setConfigMode(prev => !prev);
          }
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
  }, [user]);

  useEffect(() => {
      const fetchAvailableTags = async () => {
          try {
              const res = await fetch("/api/kernel-plant/plc-config/tags", { headers: authHeaders() });
              if (res.ok) {
                  const data = await res.json();
                  if (data.success) setAvailableTags(data.data);
              }
          } catch (err) { }
      };
      fetchAvailableTags();
  }, []);

  useEffect(() => {
      const loadMappings = async () => {
          try {
              const res = await fetch("/api/kernel-plant/plc-config/station-mappings/KERNEL-PLANT", { headers: authHeaders() });
              if (res.ok) {
                  const data = await res.json();
                  if (data.success && data.data.length > 0) {
                      const restored = {};
                      data.data.forEach((m) => { restored[`${m.equipment}__${m.signal_key}`] = String(m.tag_id); });
                      setTagMap(restored);
                  }
              }
          } catch (err) { }
      };
      loadMappings();
  }, []);

  const fetchLiveValues = useCallback(async () => {
      try {
          const res = await fetch("/api/kernel-plant/plc-config/tags-live", { headers: authHeaders() });
          if (res.ok) {
              const data = await res.json();
              if (data.success) setLiveValues(data.data);
          }
      } catch { }
  }, []);

  useEffect(() => {
      fetchLiveValues();
      const interval = setInterval(fetchLiveValues, 2000);
      return () => clearInterval(interval);
  }, [fetchLiveValues]);

  const getLiveValue = useCallback((equipmentKey, signalKey = "MONITOR") => {
      const tagId = tagMap[`${equipmentKey}__${signalKey}`];
      if (!tagId) return null;
      const tagName = tagIdToName[tagId];
      if (!tagName) return null;
      if (liveValues[tagName] !== undefined) return liveValues[tagName];
      return null;
  }, [tagMap, tagIdToName, liveValues]);

  const lv = (cardId, signalKey = "MONITOR", fallback, decimals = 1) => {
      const tagId = tagMap[`${cardId}__${signalKey}`];
      if (!tagId) return fallback;
      const v = getLiveValue(cardId, signalKey);
      if (v === null || v === undefined) return "--";
      const num = parseFloat(v);
      if (isNaN(num)) return v;
      return num.toFixed(decimals);
  };

  const handleTagEditRequest = (id, subs = [], signals = null) => {
      setTagEdit({ targetId: id, subs, signals, pos: { top: 0, left: 0 } });
  };

  const handleTagSave = async (updatedTags, editData) => {
      setSavingTags(true);
      try {
          const mappings = [];
          for (const [key, tagId] of Object.entries(updatedTags)) {
              if (!tagId) continue;
              const parts = key.split("__");
              if (parts.length !== 2) continue;
              mappings.push({ station: "KERNEL-PLANT", equipment: parts[0], signal_key: parts[1], tag_id: parseInt(tagId) });
          }
          if (mappings.length > 0) {
              await fetch("/api/kernel-plant/plc-config/station-mappings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", ...authHeaders() },
                  body: JSON.stringify({ mappings }),
              });
          }
          setTagMap((prev) => ({ ...prev, ...updatedTags }));
          setTagEdit(null);
      } catch (err) {
          alert("Failed to save tag configuration.");
      } finally {
          setSavingTags(false);
      }
  };

  const handleEquipmentClick = (id, subs = []) => {
      if (configMode) {
          handleTagEditRequest(id, subs, null);
          return;
      }
      console.log(`Equipment clicked: ${id}`);
  };

  // --- REAL-TIME STATUS FROM PLC STORE ---
  const kernelStatus = useMemo(() => {
    return {
      fiberCyclone: { run: getTag('KRN_FC_RUN')?.value === 1 ? 'run' : 'stop', amp: Number(getTag('KRN_FC_AMP')?.value || 0), hz: Number(getTag('KRN_FC_HZ')?.value || 0), airlock: getTag('KRN_FC_AL_RUN')?.value === 1 ? 'run' : 'stop' },
      polishingDrum: { run: getTag('KRN_PD_RUN')?.value === 1 ? 'run' : 'stop', amp: Number(getTag('KRN_PD_AMP')?.value || 0), hz: Number(getTag('KRN_PD_HZ')?.value || 0) },
      destoner: { run: getTag('KRN_DS_RUN')?.value === 1 ? 'run' : 'stop', amp: Number(getTag('KRN_DS_AMP')?.value || 0), hz: Number(getTag('KRN_DS_HZ')?.value || 0), airlock: getTag('KRN_DS_AL_RUN')?.value === 1 ? 'run' : 'stop' },
      nutConveyor: { run: getTag('KRN_NC_RUN')?.value === 1 ? 'run' : 'stop', amp: Number(getTag('KRN_NC_AMP')?.value || 0), hz: Number(getTag('KRN_NC_HZ')?.value || 0) },
      ltds1: { run: getTag('KRN_LT1_RUN')?.value === 1 ? 'run' : 'stop', amp: Number(getTag('KRN_LT1_AMP')?.value || 0), hz: Number(getTag('KRN_LT1_HZ')?.value || 0), airlock: getTag('KRN_LT1_AL_RUN')?.value === 1 ? 'run' : 'stop' },
      ltds2: { run: getTag('KRN_LT2_RUN')?.value === 1 ? 'run' : 'stop', amp: Number(getTag('KRN_LT2_AMP')?.value || 0), hz: Number(getTag('KRN_LT2_HZ')?.value || 0), airlock: getTag('KRN_LT2_AL_RUN')?.value === 1 ? 'run' : 'stop' },
      rippleMills: [
        { id: 1, run: getTag('KRN_RM1_RUN')?.value === 1 ? 'run' : 'stop', amp: Number(getTag('KRN_RM1_AMP')?.value || 0), hz: Number(getTag('KRN_RM1_HZ')?.value || 0) },
        { id: 2, run: getTag('KRN_RM2_RUN')?.value === 1 ? 'run' : 'stop', amp: Number(getTag('KRN_RM2_AMP')?.value || 0), hz: Number(getTag('KRN_RM2_HZ')?.value || 0) },
        { id: 3, run: getTag('KRN_RM3_RUN')?.value === 1 ? 'run' : 'stop', amp: Number(getTag('KRN_RM3_AMP')?.value || 0), hz: Number(getTag('KRN_RM3_HZ')?.value || 0) },
        { id: 4, run: getTag('KRN_RM4_RUN')?.value === 1 ? 'run' : 'stop', amp: Number(getTag('KRN_RM4_AMP')?.value || 0), hz: Number(getTag('KRN_RM4_HZ')?.value || 0) },
        { id: 5, run: getTag('KRN_RM5_RUN')?.value === 1 ? 'run' : 'stop', amp: Number(getTag('KRN_RM5_AMP')?.value || 0), hz: Number(getTag('KRN_RM5_HZ')?.value || 0) },
        { id: 6, run: getTag('KRN_RM6_RUN')?.value === 1 ? 'run' : 'stop', amp: Number(getTag('KRN_RM6_AMP')?.value || 0), hz: Number(getTag('KRN_RM6_HZ')?.value || 0) },
      ],
      mixtureConv: { run: getTag('KRN_MXC_RUN')?.value === 1 ? 'run' : 'stop', amp: Number(getTag('KRN_MXC_AMP')?.value || 0), hz: Number(getTag('KRN_MXC_HZ')?.value || 0) },
      mixtureElev: { run: getTag('KRN_MXE_RUN')?.value === 1 ? 'run' : 'stop', amp: Number(getTag('KRN_MXE_AMP')?.value || 0), hz: Number(getTag('KRN_MXE_HZ')?.value || 0) },
    }
  }, [getTag])

  return (
    <section className="som-kernel-station">
      <header className="som-kernel-station-header">
        <div className="som-header-left">
          <h1 className="som-kernel-station-title">KERNEL PLANT STATION</h1>

          <div className="som-station-tabs">
            <button
              className={`som-station-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              NUT CRACKING & SEPARATION
            </button>
            <button
              className={`som-station-tab ${activeTab === 'nut_cracking' ? 'active' : ''}`}
              onClick={() => setActiveTab('nut_cracking')}
            >
              KERNEL SEPARATION & DRYING
            </button>
            <button
              className={`som-station-tab ${activeTab === 'kernel_storage' ? 'active' : ''}`}
              onClick={() => setActiveTab('kernel_storage')}
            >
              KERNEL STORAGE DISPATCH
            </button>
          </div>
        </div>

        <div className="som-view-toggle-container" style={{ marginLeft: 'auto', marginRight: '0' }}>
          <button className={`som-view-btn ${viewMode === 'process' ? 'active' : ''}`} onClick={() => setViewMode('process')}>PROCESS VIEW</button>
          <button className="som-view-btn" disabled style={{ cursor: 'not-allowed', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
            MAINTENANCE VIEW
            <svg width="10" height="12" viewBox="0 0 448 512" fill="currentColor" style={{ marginLeft: '4px' }}><path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z"/></svg>
          </button>
          {onSelectSubmenu && (
            <button className="som-view-btn" onClick={() => onSelectSubmenu('Kernel Plant', 'Settings')} style={{ marginLeft: '8px' }}>⚙️ SETTINGS</button>
          )}
        </div>

        {/* <div className="som-coord-display">
          X: {coords.x} | Y: {coords.y}
        </div> */}
      </header>

      <main className={`som-kernel-main-modern ${viewMode === 'maintenance' ? 'som-mode-maintenance' : ''}`}>
        {activeTab === 'overview' && (
          <div className="som-kernel-layout">
            <div className="som-kernel-flow-card">
              <div className="som-kernel-flow-body">
                <svg ref={svgRef} viewBox="-350 0 2625 1080" className="station-svg-canvas" preserveAspectRatio="xMidYMid meet" onMouseMove={handleMouseMove}>
                  <DefsOverlay />
                  <image href={kernelStationImageUrl} width="2625" x="-350" y="-29" />

                  {/* MAIN STEAM PIPE */}
                  {activeTab === 'overview' && (
                    <foreignObject x="-250" y="20" width="300" height="100" style={{ overflow: 'visible' }}>
                        <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                            <div
                                onClick={() => handleEquipmentClick('main_steam')}
                                className={`som-motor-mini-card ${configMode ? 'som-editable' : ''}`}
                                style={{ cursor: configMode ? 'pointer' : 'default', background: 'rgba(2, 6, 23, 0.85)' }}
                            >
                                <div className="som-motor-mini-header">
                                    <span className="som-motor-mini-label">MAIN STEAM PIPE</span>
                                    <div className="som-status-indicator running"></div>
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
                                    <span
                                        className="som-motor-mini-value"
                                        style={{ fontSize: "20px" }}
                                    >
                                        {lv('main_steam', 'MONITOR', '2.6', 2)}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: "12px",
                                            fontWeight: "800",
                                            color: "#94a3b8",
                                        }}
                                    >
                                        Bar
                                    </span>
                                </div>
                            </div>
                        </div>
                    </foreignObject>
                  )}

                  {/* --- HUD DIAGNOSTIC BANNER --- */}
                  {viewMode === 'maintenance' && (
                    <DiagOverlay viewX="-350" viewWidth="2625" bannerX="700" />
                  )}

                  {/* --- ICONS --- */}
                  <EquipmentIconSVG x={-20} y={1008} icon={motorSvg} isRunning={kernelStatus.polishingDrum.run === 'run'} size={60} />
                  <FanIconSVG x={120} y={320} isRunning={kernelStatus.fiberCyclone.run === 'run'} size={80} />
                  <EquipmentIconSVG x={215} y={360} icon={backMotorSvg} isRunning={kernelStatus.fiberCyclone.run === 'run'} size={90} />
                  <EquipmentIconSVG x={-148} y={421} icon={motorSvg} isRunning={kernelStatus.fiberCyclone.airlock === 'run'} size={70} />
                  <FanIconSVG x={835} y={320} isRunning={kernelStatus.destoner.run === 'run'} size={80} />
                  <EquipmentIconSVG x={929} y={365} icon={backMotorSvg} isRunning={kernelStatus.destoner.run === 'run'} size={90} />
                  <EquipmentIconSVG x={570} y={420} icon={motorSvg} isRunning={kernelStatus.destoner.airlock === 'run'} size={70} />
                  <EquipmentIconSVG x={210} y={970} icon={backMotorSvg} isRunning={kernelStatus.nutConveyor.run === 'run'} size={60} />
                  <EquipmentIconSVG x={670} y={871} icon={motorSvg} isRunning={kernelStatus.rippleMills[0].run === 'run'} scaleX={-1} size={53} />
                  <EquipmentIconSVG x={814} y={875} icon={motorSvg} isRunning={kernelStatus.rippleMills[1].run === 'run'} scaleX={-1} size={53} />
                  <EquipmentIconSVG x={952} y={873} icon={motorSvg} isRunning={kernelStatus.rippleMills[2].run === 'run'} scaleX={-1} size={53} />
                  <EquipmentIconSVG x={1093} y={876} icon={motorSvg} isRunning={kernelStatus.rippleMills[3].run === 'run'} scaleX={-1} size={53} />
                  <EquipmentIconSVG x={1233} y={874} icon={motorSvg} isRunning={kernelStatus.rippleMills[4].run === 'run'} scaleX={-1} size={53} />
                  <EquipmentIconSVG x={1376} y={877} icon={motorSvg} isRunning={kernelStatus.rippleMills[5].run === 'run'} scaleX={-1} size={53} />
                  <FanIconSVG x={1162} y={345} isRunning={kernelStatus.ltds1.run === 'run'} size={80} />
                  <EquipmentIconSVG x={1075} y={390} icon={backMotorSvg} isRunning={kernelStatus.ltds1.run === 'run'} size={90} />
                  <EquipmentIconSVG x={1318} y={415} icon={motorSvg} isRunning={kernelStatus.ltds1.airlock === 'run'} size={70} />
                  <FanIconSVG x={2140} y={335} isRunning={kernelStatus.ltds2.run === 'run'} size={80} />
                  <EquipmentIconSVG x={2235} y={378} icon={backMotorSvg} isRunning={kernelStatus.ltds2.run === 'run'} size={90} />
                  <EquipmentIconSVG x={1875} y={429} icon={motorSvg} isRunning={kernelStatus.ltds2.airlock === 'run'} size={70} />
                  <EquipmentIconSVG x={535} y={1038} icon={motorSvg} isRunning={kernelStatus.mixtureConv.run === 'run'} size={70} />
                  <EquipmentIconSVG x={1435} y={1030} icon={backMotorSvg} isRunning={kernelStatus.mixtureElev.run === 'run'} size={60} />


                  {/* --- CARDS (PROCESS VS MAINTENANCE) --- */}
                  {viewMode === 'process' ? (
                    <g>
                      <MotorCardSVG isEditable={configMode} x={-85} y={1020} id="drum" label="Polishing Drum" ampere={kernelStatus.polishingDrum.amp} frequency={kernelStatus.polishingDrum.hz} ampTag="KRN_PD_AMP" hzTag="KRN_PD_HZ" onClick={handleEquipmentClick} />
                      <MotorCardSVG isEditable={configMode} x={195} y={240} id="fibFan" label="Cyclone Fan" ampere={kernelStatus.fiberCyclone.amp} frequency={kernelStatus.fiberCyclone.hz} ampTag="KRN_FC_AMP" hzTag="KRN_FC_HZ" onClick={handleEquipmentClick} />
                      <MotorCardSVG isEditable={configMode} x={-160} y={365} id="fibAir" label="Cyc Airlock" ampere={0} frequency={0} ampTag="" hzTag="" onClick={handleEquipmentClick} />
                      <MotorCardSVG isEditable={configMode} x={910} y={240} id="desFan" label="Destoner Fan" ampere={kernelStatus.destoner.amp} frequency={kernelStatus.destoner.hz} ampTag="KRN_DS_AMP" hzTag="KRN_DS_HZ" onClick={handleEquipmentClick} />
                      <MotorCardSVG isEditable={configMode} x={555} y={365} id="desAir" label="Dst Airlock" ampere={0} frequency={0} ampTag="" hzTag="" onClick={handleEquipmentClick} />
                      <MotorCardSVG isEditable={configMode} x={330} y={940} id="nutConv" label="Nut Conv" ampere={kernelStatus.nutConveyor.amp} frequency={kernelStatus.nutConveyor.hz} ampTag="KRN_NC_AMP" hzTag="KRN_NC_HZ" onClick={handleEquipmentClick} />
                      <MotorCardSVG isEditable={configMode} x={635} y={960} id="rm1" label="Ripple Mill 1" ampere={kernelStatus.rippleMills[0].amp} frequency={kernelStatus.rippleMills[0].hz} ampTag="KRN_RM1_AMP" hzTag="KRN_RM1_HZ" onClick={handleEquipmentClick} />
                      <MotorCardSVG isEditable={configMode} x={780} y={960} id="rm2" label="Ripple Mill 2" ampere={kernelStatus.rippleMills[1].amp} frequency={kernelStatus.rippleMills[1].hz} ampTag="KRN_RM2_AMP" hzTag="KRN_RM2_HZ" onClick={handleEquipmentClick} />
                      <MotorCardSVG isEditable={configMode} x={920} y={960} id="rm3" label="Ripple Mill 3" ampere={kernelStatus.rippleMills[2].amp} frequency={kernelStatus.rippleMills[2].hz} ampTag="KRN_RM3_AMP" hzTag="KRN_RM3_HZ" onClick={handleEquipmentClick} />
                      <MotorCardSVG isEditable={configMode} x={1060} y={960} id="rm4" label="Ripple Mill 4" ampere={kernelStatus.rippleMills[3].amp} frequency={kernelStatus.rippleMills[3].hz} ampTag="KRN_RM4_AMP" hzTag="KRN_RM4_HZ" onClick={handleEquipmentClick} />
                      <MotorCardSVG isEditable={configMode} x={1205} y={960} id="rm5" label="Ripple Mill 5" ampere={kernelStatus.rippleMills[4].amp} frequency={kernelStatus.rippleMills[4].hz} ampTag="KRN_RM5_AMP" hzTag="KRN_RM5_HZ" onClick={handleEquipmentClick} />
                      <MotorCardSVG isEditable={configMode} x={1345} y={960} id="rm6" label="Ripple Mill 6" ampere={kernelStatus.rippleMills[5].amp} frequency={kernelStatus.rippleMills[5].hz} ampTag="KRN_RM6_AMP" hzTag="KRN_RM6_HZ" onClick={handleEquipmentClick} />
                      <MotorCardSVG isEditable={configMode} x={1145} y={270} id="ltdsFan1" label="LTDS Fan 1" ampere={kernelStatus.ltds1.amp} frequency={kernelStatus.ltds1.hz} ampTag="KRN_LT1_AMP" hzTag="KRN_LT1_HZ" onClick={handleEquipmentClick} />
                      <MotorCardSVG isEditable={configMode} x={2217} y={255} id="ltdsFan2" label="LTDS Fan 2" ampere={kernelStatus.ltds2.amp} frequency={kernelStatus.ltds2.hz} ampTag="KRN_LT2_AMP" hzTag="KRN_LT2_HZ" onClick={handleEquipmentClick} />
                      <MotorCardSVG isEditable={configMode} x={1310} y={365} id="ltdsAir1" label="LTDS Airlock 1" ampere={0} frequency={0} ampTag="" hzTag="" onClick={handleEquipmentClick} />
                      <MotorCardSVG isEditable={configMode} x={1860} y={380} id="ltdsAir2" label="LTDS Airlock 2" ampere={0} frequency={0} ampTag="" hzTag="" onClick={handleEquipmentClick} />
                      <MotorCardSVG isEditable={configMode} x={470} y={1050} id="mixConv" label="Mixture Conv" ampere={kernelStatus.mixtureConv.amp} frequency={kernelStatus.mixtureConv.hz} ampTag="KRN_MXC_AMP" hzTag="KRN_MXC_HZ" onClick={handleEquipmentClick} />
                      <MotorCardSVG isEditable={configMode} x={1520} y={1040} id="mixElev" label="Mixture Elev" ampere={kernelStatus.mixtureElev.amp} frequency={kernelStatus.mixtureElev.hz} ampTag="KRN_MXE_AMP" hzTag="KRN_MXE_HZ" onClick={handleEquipmentClick} />
                    </g>
                  ) : (
                    <g>
                      <MaintenanceCardSVG isEditable={configMode} x={-85} y={1020} id="m-drum" label="M-DRUM" params={[{ label: 'AMP', value: kernelStatus.polishingDrum.amp.toFixed(1), unit: 'A' }, { label: 'HZ', value: kernelStatus.polishingDrum.hz.toFixed(1), unit: 'Hz' }]} onClick={handleEquipmentClick} />
                      <MaintenanceCardSVG isEditable={configMode} x={195} y={240} id="m-fibfan" label="M-FCFAN" params={[{ label: 'AMP', value: kernelStatus.fiberCyclone.amp.toFixed(1), unit: 'A' }, { label: 'HZ', value: kernelStatus.fiberCyclone.hz.toFixed(1), unit: 'Hz' }]} onClick={handleEquipmentClick} />
                      <MaintenanceCardSVG isEditable={configMode} x={910} y={240} id="m-desfan" label="M-DSFAN" params={[{ label: 'AMP', value: kernelStatus.destoner.amp.toFixed(1), unit: 'A' }, { label: 'HZ', value: kernelStatus.destoner.hz.toFixed(1), unit: 'Hz' }]} onClick={handleEquipmentClick} />
                      <MaintenanceCardSVG isEditable={configMode} x={635} y={960} id="m-rm1" label="M-RM_1" params={[{ label: 'AMP', value: kernelStatus.rippleMills[0].amp.toFixed(1), unit: 'A' }, { label: 'HZ', value: kernelStatus.rippleMills[0].hz.toFixed(1), unit: 'Hz' }]} onClick={handleEquipmentClick} />
                      <MaintenanceCardSVG isEditable={configMode} x={780} y={960} id="m-rm2" label="M-RM_2" params={[{ label: 'AMP', value: kernelStatus.rippleMills[1].amp.toFixed(1), unit: 'A' }, { label: 'HZ', value: kernelStatus.rippleMills[1].hz.toFixed(1), unit: 'Hz' }]} onClick={handleEquipmentClick} />
                      <MaintenanceCardSVG isEditable={configMode} x={920} y={960} id="m-rm3" label="M-RM_3" params={[{ label: 'AMP', value: kernelStatus.rippleMills[2].amp.toFixed(1), unit: 'A' }, { label: 'HZ', value: kernelStatus.rippleMills[2].hz.toFixed(1), unit: 'Hz' }]} onClick={handleEquipmentClick} />
                      <MaintenanceCardSVG isEditable={configMode} x={1060} y={960} id="m-rm4" label="M-RM_4" params={[{ label: 'AMP', value: kernelStatus.rippleMills[3].amp.toFixed(1), unit: 'A' }, { label: 'HZ', value: kernelStatus.rippleMills[3].hz.toFixed(1), unit: 'Hz' }]} onClick={handleEquipmentClick} />
                      <MaintenanceCardSVG isEditable={configMode} x={1205} y={960} id="m-rm5" label="M-RM_5" params={[{ label: 'AMP', value: kernelStatus.rippleMills[4].amp.toFixed(1), unit: 'A' }, { label: 'HZ', value: kernelStatus.rippleMills[4].hz.toFixed(1), unit: 'Hz' }]} onClick={handleEquipmentClick} />
                      <MaintenanceCardSVG isEditable={configMode} x={1345} y={960} id="m-rm6" label="M-RM_6" params={[{ label: 'AMP', value: kernelStatus.rippleMills[5].amp.toFixed(1), unit: 'A' }, { label: 'HZ', value: kernelStatus.rippleMills[5].hz.toFixed(1), unit: 'Hz' }]} onClick={handleEquipmentClick} />
                      <MaintenanceCardSVG isEditable={configMode} x={1145} y={270} id="m-lt1" label="M-LTDS_1" params={[{ label: 'AMP', value: kernelStatus.ltds1.amp.toFixed(1), unit: 'A' }, { label: 'HZ', value: kernelStatus.ltds1.hz.toFixed(1), unit: 'Hz' }]} onClick={handleEquipmentClick} />
                      <MaintenanceCardSVG isEditable={configMode} x={2217} y={255} id="m-lt2" label="M-LTDS_2" params={[{ label: 'AMP', value: kernelStatus.ltds2.amp.toFixed(1), unit: 'A' }, { label: 'HZ', value: kernelStatus.ltds2.hz.toFixed(1), unit: 'Hz' }]} onClick={handleEquipmentClick} />
                    </g>
                  )}

                </svg>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'nut_cracking' && (
          <div className="som-kernel-scada-container">
            <img src={nutCrackingImgUrl} alt="Nut Cracking & Separation" className="som-full-tab-image" />

            <svg ref={svgRef} viewBox="0 0 1920 1080" className="som-kernel-svg-layer" preserveAspectRatio="xMidYMid meet" onMouseMove={handleMouseMove}>
              <DefsOverlay />
              {viewMode === 'maintenance' && (
                <DiagOverlay viewX="0" viewWidth="1920" bannerX="660" />
              )}
              <KernelLabelSVG x={940} y={280} label="Kernel Silo 1" fontSize="18px" />
              <KernelLabelSVG x={1190} y={280} label="Kernel Silo 2" fontSize="18px" />
              <KernelLabelSVG x={1440} y={280} label="Kernel Silo 3" fontSize="18px" />
              <KernelLabelSVG x={1690} y={280} label="Kernel Silo 4" fontSize="18px" />

              <KernelLabelSVG x={940} y={350} label="V1" fontSize='18px'/>
              <KernelLabelSVG x={940} y={540} label="V2" fontSize='18px'/>
              <KernelLabelSVG x={940} y={725} label="V3" fontSize='18px'/>

              <KernelLabelSVG x={1190} y={350} label="V1" fontSize='18px'/>
              <KernelLabelSVG x={1190} y={540} label="V2" fontSize='18px'/>
              <KernelLabelSVG x={1190} y={725} label="V3" fontSize='18px'/>

              <KernelLabelSVG x={1440} y={350} label="V1" fontSize='18px'/>
              <KernelLabelSVG x={1440} y={540} label="V2" fontSize='18px'/>
              <KernelLabelSVG x={1440} y={725} label="V3" fontSize='18px'/>

              <KernelLabelSVG x={1690} y={350} label="V1" fontSize='18px'/>
              <KernelLabelSVG x={1690} y={540} label="V2" fontSize='18px'/>
              <KernelLabelSVG x={1690} y={725} label="V3" fontSize='18px'/>

              {/* Silo Identifiers */}
              <KernelLabelSVG x={940} y={330} label="Kernel Silo 1" fontSize="18px" />
              <KernelLabelSVG x={1190} y={330} label="Kernel Silo 2" fontSize="18px" />
              <KernelLabelSVG x={1440} y={330} label="Kernel Silo 3" fontSize="18px" />
              <KernelLabelSVG x={1690} y={330} label="Kernel Silo 4" fontSize="18px" />

              {/* Row 1 - Cards Grouped in Center */}
              <KSTCardSVG
                id="vibScreen"
                isEditable={configMode}
                onClick={handleEquipmentClick}
                x={250} y={660}
                label="Vibrating Screen"
                values={[
                  { label: 'Wet Shell', value: '2.33', unit: 'A' },
                  { label: 'Wet Kernel', value: '2.33', unit: 'A' }
                ]}
                isRunning={true}
              />
              <KSTCardSVG
                id="clayDensity"
                isEditable={configMode}
                onClick={handleEquipmentClick}
                x={180} y={908}
                label="Clay Density"
                values={[{ label: 'Density', value: '1.16', unit: 'mg/L' }]}
                isRunning={true}
              />
              <KSTCardSVG
                id="wetShellBlower"
                isEditable={configMode}
                onClick={handleEquipmentClick}
                x={800} y={1010}
                label="Wet Shell Blower"
                values={[{ label: 'Load', value: '11.88', unit: 'A' }]}
                status="RUN"
                isRunning={true}
              />
              <KSTCardSVG
                id="wetKernelElev"
                isEditable={configMode}
                onClick={handleEquipmentClick}
                x={950} y={130}
                label="Wet Kernel Elev"
                values={[{ label: 'Load', value: '12.33', unit: 'A' }]}
                isRunning={true}
              />

              {/* Row 2 - Cards Grouped in Center */}
              <KSTCardSVG
                id="clayPump1"
                isEditable={configMode}
                onClick={handleEquipmentClick}
                x={-100} y={1030}
                label="Claybath Pump 1"
                values={[{ label: 'Load', value: '2.33', unit: 'A' }]}
                status="RUNNING"
                isRunning={true}
              />
              <KSTCardSVG
                id="clayPump2"
                isEditable={configMode}
                onClick={handleEquipmentClick}
                x={80} y={1030}
                label="Claybath Pump 2"
                values={[{ label: 'Load', value: '0.00', unit: 'A' }]}
                status="STOP"
                isRunning={false}
              />
              <KSTCardSVG
                id="wetKernelConv"
                isEditable={configMode}
                onClick={handleEquipmentClick}
                x={1900} y={130}
                label="Wet Kernel Conv"
                values={[{ label: 'Load', value: '4.33', unit: 'A' }]}
                isRunning={true}
              />

              {/* Dried Kernel Monitoring */}
              <KSTCardSVG
                x={710} y={770}
                label="D. Kernel Conv"
                values={[{ label: 'Load', value: '2.33', unit: 'A' }]}
                isRunning={true}
              />
              <KSTCardSVG
                x={1640} y={940}
                label="D. Kernel Airlock"
                values={[{ label: 'Load', value: '2.33', unit: 'A' }]}
                isRunning={true}
              />
              <KSTCardSVG
                x={1840} y={1060}
                label="D. Kernel Blower"
                values={[{ label: 'Load', value: '12.22', unit: 'A' }]}
                isRunning={true}
              />

              {/* Data Tables */}
              <KSTTableSVG
                x={10} y={180}
                title="Kernel Silo Temperatures & Moisture"
                headers={["T1", "T2", "T3", "T4", "Moist"]}
                rows={[
                  { label: "Silo 1", values: ["35", "38", "43", "51", "7.55%"] },
                  { label: "Silo 2", values: ["45", "48", "55", "65", "6.00%"] },
                  { label: "Silo 3", values: ["38", "40", "44", "49", "7.65%"] },
                  { label: "Silo 4", values: ["40", "45", "52", "60", "6.50%"] }
                ]}
              />

              <KSTTableSVG
                x={10} y={380}
                title="Bunker Storage Management"
                headers={["Storage (MT)"]}
                rows={[
                  { label: "Bunker 1", values: ["0.00 MT"] },
                  { label: "Bunker 2", values: ["128.00 MT"] },
                  { label: "Bunker 3", values: ["32.00 MT"] },
                  { label: "Bunker 4", values: ["68.00 MT"] },
                  { label: "Shell Flour", values: ["1,010 MT"] }
                ]}
              />

              <KSTSimpleTextBoxSVG
                x={10} y={660}
                lines={[
                  "PK WEIGHT INCREASED TODAY = 34 MT",
                  "EXPECTED KER = 4.89% PER FFB",
                  "PKS WEIGHT INCREASED TODAY = 68 MT",
                  "EXPECTED SER = 9.67%"
                ]}
              />
            </svg>
          </div>
        )}

        {activeTab === 'kernel_storage' && (
          <div className="som-kernel-scada-container">
            <img src={kernelStorageImgUrl} alt="Kernel Storage Dispatch" className="som-full-tab-image" />

            <svg ref={svgRef} viewBox="0 0 1920 1080" className="som-kernel-svg-layer" preserveAspectRatio="xMidYMid meet" onMouseMove={handleMouseMove}>
              <DefsOverlay />
              {viewMode === 'maintenance' && (
                <DiagOverlay viewX="0" viewWidth="1920" bannerX="660" />
              )}

              {/* Row 1 - Bunker Identifiers */}
              <KernelLabelSVG x={185} y={450} label={"KERNEL BUNKER\n1"} fontSize="20px" />
              <KernelLabelSVG x={700} y={450} label={"KERNEL BUNKER\n2"} fontSize="20px" />
              <KernelLabelSVG x={1212} y={450} label={"KERNEL BUNKER\n3"} fontSize="20px" />
              <KernelLabelSVG x={1735} y={450} label={"KERNEL BUNKER\n4"} fontSize="20px" />

              {/* Row 2 - Bunker Detailed Cards */}
              <KSTBunkerCardSVG x={185} y={570} label="Bunker 1 Status" stock="100" moisture="7.0" ds="7.0" />
              <KSTBunkerCardSVG x={700} y={570} label="Bunker 2 Status" stock="100" moisture="7.0" ds="7.0" />
              <KSTBunkerCardSVG x={1212} y={570} label="Bunker 3 Status" stock="100" moisture="7.0" ds="7.0" />
              <KSTBunkerCardSVG x={1735} y={570} label="Bunker 4 Status" stock="100" moisture="7.0" ds="7.0" />

              {/* Top Right - Production Summary Box */}
              <KSTProductionBoxSVG
                x={1650} y={150}
                data={[
                  { label: "PK WEIGHT TODAY", value: "34 MT" },
                  { label: "EXPECTED KER", value: "4.89% PER FFB", color: "#ffdb3b" },
                  { label: "Total Kernel Stock", value: "24 MT" },
                  { label: "Kernel Ready for Dispatch", value: "30 MT" }
                ]}
              />

              <KSTTableSVG
                x={1575} y={150}
                title="Bunker Storage Management"
                headers={["Storage (MT)"]}
                rows={[
                  { label: "Bunker 1", values: ["0.00 MT"] },
                  { label: "Bunker 2", values: ["128.00 MT"] },
                  { label: "Bunker 3", values: ["32.00 MT"] },
                  { label: "Bunker 4", values: ["68.00 MT"] },
                  // { label: "Shell Flour", values: ["1,010 MT"] }
                ]}
              />

            </svg>
          </div>
        )}
      </main>
      {tagEdit && (
          <TagEditorModal
              data={tagEdit}
              onClose={() => setTagEdit(null)}
              onSave={handleTagSave}
              tagMap={tagMap}
              availableTags={availableTags}
              saving={savingTags}
          />
      )}
    </section>
  )
}

export default KernelStationPage
