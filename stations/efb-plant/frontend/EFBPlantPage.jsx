import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './EFBPlantPage.css';

// ==========================================
// 1. ASSETS IMPORT
// ==========================================
import efbPlantImageUrl from './assets/efb-plant2.webp';
import pumpRunSvg from './assets/pump-run.svg';
import valveActuatorSvg from './assets/valve_actuator.svg';
import pipeSvg from './assets/Pipe.svg';
import motorSvg from './assets/motor.svg';
import motorbackSvg from './assets/motor-back.svg';

import { useWTFlowBuilder, WTFlowOverlay, WTFlowPanel } from './components/WTFlowBuilder.jsx';
import { LiquidFlowSVG, SteamFlowSVG } from './components/Flows.jsx';

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================
/**
 * Helper untuk menyertakan Authorization Bearer token pada HTTP request
 */
const authHeaders = () => {
    const token = localStorage.getItem("kip_token");
    return {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

// ==========================================
// 3. SUB-COMPONENTS
// ==========================================

/**
 * Modal untuk mengedit dan menghubungkan Tag PLC ke Equipment
 */
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

    const isGroup = data.subs.length > 0;
    const hasSignals = data.signals && data.signals.length > 0;
    const allTags = availableTags;

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
 * Custom hook untuk menghandle posisi & kondisi hover popup grafik/trend
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
 * Component Popup Grafik Trend (Portaled ke Document Body)
 */
function StatusGraphPopup({ position, equipmentName, type = 'Load', value = 0, unit = 'A', onMouseEnter, onMouseLeave }) {
    const popupRef = useRef(null);
    const [style, setStyle] = useState({ opacity: 0, pointerEvents: 'none' });

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
            pointerEvents: 'auto'
        });
    }, [position]);

    const width = 400;
    const height = 200;
    const plotLeft = 40;
    const plotRight = 360;
    const plotTop = 20;
    const plotBottom = 160;

    const points = useMemo(() => {
        return Array.from({ length: 20 }).map((_, i) => {
            const x = plotLeft + ((plotRight - plotLeft) * i) / 19;
            const yVal = Math.max(0, value);
            const maxRange = type === 'Temperature' ? 150 : (type === 'Level' ? 100 : 50);
            const t = yVal / maxRange;
            const y = plotBottom - t * (plotBottom - plotTop);
            return { x, y };
        });
    }, [value, type]);

    const polyPoints = points.map((p) => `${p.x},${p.y}`).join(' ');

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
                    <span>Current: {value} {unit}</span>
                </div>
            </div>
            <div className="som-amp-popup-body">
                <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="som-amp-graph-svg">
                    <defs>
                        <linearGradient id="trendGradientEFB" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05" />
                        </linearGradient>
                    </defs>
                    <rect x={plotLeft} y={plotTop} width={plotRight - plotLeft} height={plotBottom - plotTop} fill="rgba(248, 250, 251, 0.5)" rx="4" />
                    <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke="#e2e8f0" />
                    <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke="#e2e8f0" />
                    <polygon className="som-amp-graph-area" points={`${plotLeft},${plotBottom} ${polyPoints} ${plotRight},${plotBottom}`} style={{ fill: 'url(#trendGradientEFB)' }} />
                    <polyline className="som-amp-graph-line-main" points={polyPoints} fill="none" stroke="#f59e0b" strokeWidth="2" />
                    {points.map((p, idx) => (
                        <circle key={idx} cx={p.x} cy={p.y} r="3" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
                    ))}
                </svg>
            </div>
        </div>,
        document.body
    );
}

/**
 * Component Card Single Sensor / Monitor (Temp, Pump Status, dll)
 */
const MonitorCard = ({ id, x, y, label, value, unit, equipmentName, trendType, status = "RUNNING", scale = 1, onClick, isEditable, statusDot }) => {
    const {
        cardRef, isHovered, popupPos,
        handleMouseEnter, handleMouseLeave, handlePopupMouseEnter, handlePopupMouseLeave
    } = useAmpHover();

    // Evaluasi status dot: Jika statusDot diberikan (boolean), pakai nilainya.
    // Jika tidak, periksa apakah nilainya berupa angka valid dan > 0 (bukan 'no tag' / '--' / <= 0)
    let isDotActive = false;
    if (statusDot !== undefined) {
        isDotActive = Boolean(statusDot);
    } else {
        const num = parseFloat(value);
        if (value !== undefined && value !== null && value !== 'no tag' && value !== '--' && !isNaN(num)) {
            isDotActive = num > 0;
        } else {
            // Default fallback hanya jika status prop diset eksplisit bukan default RUNNING saat value no tag
            isDotActive = status !== undefined && status !== null && status !== "STOPPED" && status !== "RUNNING" ? status.toUpperCase() === "RUNNING" : false;
        }
    }

    const dotColor = isDotActive ? '#22c55e' : '#ef4444';
    const dotShadow = isDotActive ? '0 0 4px rgba(34, 197, 94, 0.8)' : '0 0 4px rgba(239, 68, 68, 0.8)';

    return (
        <g id={id} className="svg-equipment sensor-group" onClick={() => onClick && onClick(id)} style={{ cursor: isEditable ? 'pointer' : 'default' }}>
            <foreignObject x={x - 100} y={y - 30} width="200" height="120" style={{ overflow: 'visible' }}>
                <div style={{ display: 'flex', justifyContent: 'center', transform: `scale(${scale})`, transformOrigin: 'center' }}>
                    <div
                        ref={cardRef}
                        className={`som-station-card ${isEditable ? 'som-editable' : ''}`}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    >
                        <div className="som-station-header">
                            <div className="som-station-title">{label}</div>
                            <div
                                className="som-station-status-dot"
                                style={{
                                    backgroundColor: dotColor,
                                    boxShadow: dotShadow
                                }}
                            ></div>
                        </div>
                        <div className="som-station-body">
                            <div className="som-station-value-group" style={{ justifyContent: 'center', padding: '2px 0' }}>
                                <span className="som-station-value">{value}</span>
                                {unit && <span className="som-station-unit">{unit}</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </foreignObject>
            {isHovered && popupPos && (
                <StatusGraphPopup
                    position={popupPos}
                    equipmentName={equipmentName}
                    type={trendType}
                    value={parseFloat(value)}
                    unit={unit}
                    onMouseEnter={handlePopupMouseEnter}
                    onMouseLeave={handlePopupMouseLeave}
                />
            )}
        </g>
    );
};

/**
 * Component Card Parameter Mesin Utama (Press Data, Liquor Volume, dll)
 * Memiliki indikator dot hijau/merah di header berdasarkan status data
 */
const MachineParams = ({ id, x, y, title, params, scale = 1, onClick, isEditable, statusDot }) => {
    // Logic Indikator Dot Status:
    // Jika statusDot diberikan secara eksplisit, gunakan nilainya.
    // Jika tidak, periksa apakah ada minimal 1 parameter yang bernilai angka valid > 0 (bukan 'no tag' / '--')
    let isDotActive = false;
    if (statusDot !== undefined) {
        isDotActive = Boolean(statusDot);
    } else if (params && params.length > 0) {
        isDotActive = params.some(p => {
            if (!p.value || p.value === 'no tag' || p.value === '--') return false;
            const num = parseFloat(p.value);
            return !isNaN(num) && num > 0;
        });
    }

    const dotColor = isDotActive ? '#22c55e' : '#ef4444';
    const dotShadow = isDotActive ? '0 0 4px rgba(34, 197, 94, 0.8)' : '0 0 4px rgba(239, 68, 68, 0.8)';

    return (
        <g id={id} className="svg-equipment motor-group" onClick={() => onClick && onClick(id)} style={{ cursor: isEditable ? 'pointer' : 'default' }}>
            <foreignObject x={x - 100} y={y - 90} width="200" height="240" style={{ overflow: 'visible' }}>
                <div style={{ display: 'flex', justifyContent: 'center', transform: `scale(${scale})`, transformOrigin: 'center' }}>
                    <div className={`som-station-card ${isEditable ? 'som-editable' : ''}`}>
                        <div className="som-station-header">
                            <div className="som-station-title">{title}</div>
                            <div className="som-station-status-dot" style={{ backgroundColor: dotColor, boxShadow: dotShadow }}></div>
                        </div>
                        <div className="som-station-body">
                            <div className="som-station-data-list">
                                {params.map((p, i) => (
                                    <div key={i} className="som-station-row">
                                        <span className="som-station-label">{p.label}</span>
                                        <div className="som-station-value-group">
                                            <span className={`som-station-value ${p.color === 'red' ? 'red' : ''}`}>
                                                {p.value}
                                            </span>
                                            {p.unit && <span className="som-station-unit">{p.unit}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </foreignObject>
        </g>
    );
};

/**
 * Component Card Mini untuk Maintenance Mode
 */
const MaintenanceCardSVG = ({ x, y, id, label, params = [], onClick, width = 160 }) => (
    <g id={id} className="svg-equipment motor-group" onClick={() => onClick && onClick(id)}>
        <foreignObject x={x} y={y} width="250" height="120" style={{ overflow: 'visible' }}>
            <div className="som-maintenance-mini-card" style={{ width: 'fit-content' }}>
                <div className="som-maintenance-mini-header">
                    <div className="som-maintenance-mini-title">{label}</div>
                    <div className="som-maintenance-mini-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                        </svg>
                    </div>
                </div>
                <div className="som-maintenance-mini-body">
                    {params.map((p, idx) => (
                        <div key={idx} className="som-maintenance-mini-row">
                            <span className="som-maintenance-mini-row-label">{p.label}</span>
                            <span className="som-maintenance-mini-row-value">{p.value} <small>{p.unit}</small></span>
                        </div>
                    ))}
                </div>
            </div>
        </foreignObject>
    </g>
);

/**
 * Component Pipa Flow Animasi dengan Efek Partikel
 */
const FlowLine = ({ points, color = "#ffdb3b", width = 8, speed = "3s" }) => {
    const d = points.length > 0
        ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
        : '';

    if (!d) return null;

    return (
        <g className="som-flow-group">
            {/* Outer Glow */}
            <path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={width * 1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.15"
                filter="blur(4px)"
            />
            {/* Main Tube */}
            <path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={width}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.6"
            />
            {/* Core Flow */}
            <path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={width * 0.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="4, 16"
                strokeOpacity="0.8"
            >
                <animate
                    attributeName="stroke-dashoffset"
                    from="100"
                    to="0"
                    dur={speed}
                    repeatCount="indefinite"
                />
            </path>
            {/* Bright Particles */}
            <path
                d={d}
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="1, 40"
            >
                <animate
                    attributeName="stroke-dashoffset"
                    from="200"
                    to="0"
                    dur={speed}
                    repeatCount="indefinite"
                />
            </path>
        </g>
    );
};

// ==========================================
// 4. MAIN PAGE COMPONENT: EFBPlantPage
// ==========================================
function EFBPlantPage({ user, onSelectSubmenu }) {
    const svgRef = useRef(null);
    const [viewMode, setViewMode] = useState('process'); // 'process' or 'maintenance'
    const [activeTab, setActiveTab] = useState('overview');
    const wtFlow = useWTFlowBuilder();

    // --- PLC CONFIG STATE ---
    const [configMode, setConfigMode] = useState(false);
    const [tagEdit, setTagEdit] = useState(null);
    const [tagMap, setTagMap] = useState({});
    const [availableTags, setAvailableTags] = useState([]);
    const [savingTags, setSavingTags] = useState(false);
    const [liveValues, setLiveValues] = useState({});

    // Map Tag ID ke Tag Name untuk akses cepat nilai live
    const tagIdToName = useMemo(() => {
        const map = {};
        availableTags.forEach((t) => { map[t.id] = t.tag_name; });
        return map;
    }, [availableTags]);

    // Shortcut Keyboard Developer Mode (Ctrl + X) untuk toggle PLC Config Mode
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

    // Fetch daftar Tag PLC yang tersedia
    useEffect(() => {
        const fetchAvailableTags = async () => {
            try {
                const res = await fetch("/api/efb-plant/plc-config/tags", { headers: authHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) setAvailableTags(data.data);
                }
            } catch (err) { }
        };
        fetchAvailableTags();
    }, []);

    // Load Mapping Station PLC EFB-PLANT dari database
    useEffect(() => {
        const loadMappings = async () => {
            try {
                const res = await fetch("/api/efb-plant/plc-config/station-mappings/EFB-PLANT", { headers: authHeaders() });
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

    // Polling data Live Values PLC setiap 2 detik
    const fetchLiveValues = useCallback(async () => {
        try {
            const res = await fetch("/api/efb-plant/plc-config/tags-live", { headers: authHeaders() });
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

    // Helper untuk mengambil nilai live spesifik berdasarkan nama equipment & signal
    const getLiveValue = useCallback((equipmentKey, signalKey = "MONITOR") => {
        const tagId = tagMap[`${equipmentKey}__${signalKey}`];
        if (!tagId) return null;
        const tagName = tagIdToName[tagId];
        if (!tagName) return null;
        if (liveValues[tagName] !== undefined) return liveValues[tagName];
        return null;
    }, [tagMap, tagIdToName, liveValues]);

    // Helper formatter nilai live untuk ditayangkan di Card
    const lv = (cardId, signalKey = "MONITOR", fallback, decimals = 1) => {
        const tagId = tagMap[`${cardId}__${signalKey}`];
        if (!tagId) return fallback;
        const v = getLiveValue(cardId, signalKey);
        if (v === null || v === undefined) return "--";
        const num = parseFloat(v);
        if (isNaN(num)) return v;
        return num.toFixed(decimals);
    };

    // Handler untuk membuka modal konfig tag PLC
    const handleTagEditRequest = (id, subs = [], signals = null) => {
        setTagEdit({ targetId: id, subs, signals, pos: { top: 0, left: 0 } });
    };

    // Handler untuk menyimpan hasil konfigurasi tag PLC
    const handleTagSave = async (updatedTags, editData) => {
        setSavingTags(true);
        try {
            const mappings = [];
            for (const [key, tagId] of Object.entries(updatedTags)) {
                if (!tagId) continue;
                const parts = key.split("__");
                if (parts.length !== 2) continue;
                mappings.push({ station: "EFB-PLANT", equipment: parts[0], signal_key: parts[1], tag_id: parseInt(tagId) });
            }
            if (mappings.length > 0) {
                await fetch("/api/efb-plant/plc-config/station-mappings", {
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

    // Handler klik pada peralatan
    const handleEquipmentClick = (id, subs = []) => {
        if (configMode) {
            handleTagEditRequest(id, subs, null);
            return;
        }
        console.log(`Equipment clicked: ${id}`);
    };

    // ==========================================
    // LOGIC ALIRAN & STATUS VALVE PRESS 1 - 4
    // ==========================================
    // Press 1 (Steam ON = 1, Dilution OFF = 'no tag')
    const press1SteamVal = lv('press1_data', 'STEAM', '1');
    const isPress1SteamActive = parseFloat(press1SteamVal) > 0;
    const press1DilutionVal = lv('press1_data', 'DILUTION', 'no tag');
    const isPress1DilutionActive = parseFloat(press1DilutionVal) > 0;

    // Press 2 (Dilution ON = 1, Steam OFF = 'no tag')
    const press2SteamVal = lv('press2_data', 'STEAM', 'no tag');
    const isPress2SteamActive = parseFloat(press2SteamVal) > 0;
    const press2DilutionVal = lv('press2_data', 'DILUTION', '1');
    const isPress2DilutionActive = parseFloat(press2DilutionVal) > 0;

    // Press 3 (Steam ON = 1, Dilution ON = 1)
    const press3SteamVal = lv('press3_data', 'STEAM', '1');
    const isPress3SteamActive = parseFloat(press3SteamVal) > 0;
    const press3DilutionVal = lv('press3_data', 'DILUTION', '1');
    const isPress3DilutionActive = parseFloat(press3DilutionVal) > 0;

    // Press 4 (Steam OFF = 'no tag', Dilution OFF = 'no tag')
    const press4SteamVal = lv('press4_data', 'STEAM', 'no tag');
    const isPress4SteamActive = parseFloat(press4SteamVal) > 0;
    const press4DilutionVal = lv('press4_data', 'DILUTION', 'no tag');
    const isPress4DilutionActive = parseFloat(press4DilutionVal) > 0;

    // Blow-Down Temp (Default test value = '1')
    const blowdownTempVal = lv('blowdown_temp', 'MONITOR', '1');
    const isBlowdownTempActive = parseFloat(blowdownTempVal) > 0;

    // Pump 1 (Default test value = '1')
    const pump1Val = lv('pump1', 'MONITOR', '1');
    const isPump1Active = parseFloat(pump1Val) > 0 || pump1Val === '1';

    // Pump 2 (Default test value = '1')
    const pump2Val = lv('pump2', 'MONITOR', '1');
    const isPump2Active = parseFloat(pump2Val) > 0 || pump2Val === '1';

    // CST Steam (Default test value = '1')
    const cstSteamVal = lv('cst_steam', 'MONITOR', '1');
    const isCstSteamActive = parseFloat(cstSteamVal) > 0 || cstSteamVal === '1';

    // Cake Breaker (Default test value = '1')
    const cakeBreakerVal = lv('cake_breaker', 'MONITOR', '1');
    const isCakeBreakerActive = parseFloat(cakeBreakerVal) > 0 || cakeBreakerVal === '1';

    return (
        <section className={`som-efb-plant som-mode-${viewMode}`}>
            {/* --- STATION HEADER --- */}
            <header className="som-efb-plant-header">
                <div className="som-header-left">
                    <div className="som-header-titles">
                        <h1 className="som-efb-plant-title">EFB PLANT STATION</h1>
                        <div className="som-efb-plant-subtitle">EMPTY FRUIT BUNCH PRESSING & SHREDDING</div>
                    </div>

                    <div className="som-station-tabs">
                        <button className={`som-station-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
                    </div>
                </div>
                <div className="som-view-toggle-container" style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                    <button className={`som-view-btn ${viewMode === 'process' ? 'active' : ''}`} onClick={() => setViewMode('process')}>PROCESS VIEW</button>
                    <button className="som-view-btn" disabled style={{ cursor: 'not-allowed', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        MAINTENANCE VIEW
                        <svg width="10" height="12" viewBox="0 0 448 512" fill="currentColor" style={{ marginLeft: '4px' }}><path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z" /></svg>
                    </button>
                    {onSelectSubmenu && (
                        <button className="som-view-btn" onClick={() => onSelectSubmenu('EFB Plant', 'Settings')} style={{ marginLeft: '4px' }}>⚙️ SETTINGS</button>
                    )}
                    <button
                        className={`som-view-btn ${wtFlow.isActive ? 'active' : ''}`}
                        onClick={wtFlow.toggle}
                        style={{ marginLeft: '4px', background: wtFlow.isActive ? '#eab308' : undefined, color: wtFlow.isActive ? '#000' : undefined }}
                    >
                        {wtFlow.isActive ? 'EXIT FLOW BUILDER' : 'FLOW BUILDER'}
                    </button>
                </div>
            </header>

            {/* --- MAIN INTERACTIVE CANVAS --- */}
            <div className="som-efb-plant-main" style={{ position: 'relative' }}>
                <div className="som-efb-plant-layout">
                    <div className="som-efb-plant-flow-body">
                        <svg
                            ref={svgRef}
                            viewBox="268 113 1370 892"
                            className="station-svg-canvas"
                            preserveAspectRatio="xMidYMid meet"
                        >
                            {/* Background Diagram Asset */}
                            <image href={efbPlantImageUrl} width="1920" height="1080" />

                            {/* SVG Filters (Matrix Color Tints) */}
                            <defs>
                                <filter id="tint-red" colorInterpolationFilters="sRGB">
                                    <feColorMatrix type="matrix" values="
                                    0.244 0.822 0.083 0 0
                                    0     0     0     0 0
                                    0     0     0     0 0
                                    0 0 0 1 0" />
                                </filter>
                                <filter id="tint-green" colorInterpolationFilters="sRGB">
                                    <feColorMatrix type="matrix" values="
                                    0.0638 0.2146 0.0216 0 0
                                    0.2551 0.8582 0.0867 0 0
                                    0.0425 0.1430 0.0144 0 0
                                    0 0 0 1 0" />
                                </filter>
                            </defs>

                            {/* Diagnostic Banner ketika di mode maintenance */}
                            {viewMode === 'maintenance' && (
                                <foreignObject x="660" y="20" width="600" height="60" style={{ overflow: 'visible' }}>
                                    <div className="som-diagnostic-banner">
                                        DIAGNOSTIC HUD ACTIVE • MAINTENANCE MODE
                                    </div>
                                </foreignObject>
                            )}

                            {/* ========================================== */}
                            {/* --- FLOW LINES (STEAM & LIQUID) --- */}
                            {/* ========================================== */}
                            {/* Press 1 Flows */}
                            <SteamFlowSVG
                                d="M 243,237 L 263,236 Q 282,234 281,254 L 280,301"
                                active={isPress1SteamActive}
                                mode="flowing"
                                color="#a9dbe1ff"
                                thickness={4}
                            />
                            <LiquidFlowSVG
                                d="M 243,272 L 266,272 Q 282,272 280,287 L 280,303"
                                isRunning={isPress1DilutionActive}
                                color="#38bdf8"
                                thickness={6}
                            />

                            {/* Press 2 Flows */}
                            <SteamFlowSVG
                                d="M 716,235 L 735,236 Q 754,236 754,255 L 753,301"
                                active={isPress2SteamActive}
                                mode="flowing"
                                color="#a9dbe1ff"
                                thickness={4}
                            />
                            <LiquidFlowSVG
                                d="M 716,273 L 738,272 Q 754,271 754,287 L 754,303"
                                isRunning={isPress2DilutionActive}
                                color="#38bdf8"
                                thickness={6}
                            />

                            {/* Press 3 Flows */}
                            <SteamFlowSVG
                                d="M 1187,237 L 1210,236 Q 1233,234 1232,257 L 1230,303"
                                active={isPress3SteamActive}
                                mode="flowing"
                                color="#a9dbe1ff"
                                thickness={4}
                            />
                            <LiquidFlowSVG
                                d="M 1187,272 L 1215,272 Q 1230,272 1230,288 L 1230,303"
                                isRunning={isPress3DilutionActive}
                                color="#38bdf8"
                                thickness={6}
                            />

                            {/* Press 4 Flows */}
                            <SteamFlowSVG
                                d="M 1656,237 L 1683,236 Q 1708,235 1708,260 L 1707,304"
                                active={isPress4SteamActive}
                                mode="flowing"
                                color="#a9dbe1ff"
                                thickness={4}
                            />
                            <LiquidFlowSVG
                                d="M 1656,274 L 1692,273 Q 1706,272 1706,287 L 1706,301"
                                isRunning={isPress4DilutionActive}
                                color="#38bdf8"
                                thickness={6}
                            />



                            {/* ========================================== */}
                            {/* --- VISUAL ASSETS (MOTORS, PUMPS, VALVES) --- */}
                            {/* ========================================== */}
                            {/* Motor Assets */}
                            <image href={motorbackSvg} x={1830} y={135} width="55" style={{ pointerEvents: 'none' }} />
                            <image href={motorSvg} x={1930} y={580} width="68" filter={isCakeBreakerActive ? "url(#tint-green)" : "url(#tint-red)"} style={{ pointerEvents: 'none', transform: 'scaleX(-1)', transformOrigin: '1922.5px 466px' }} />

                            {/* Pump Assets (x=1046: Pump 1, x=1095: Pump 2) */}
                            <image href={pumpRunSvg} x={10} y={600} width="60" filter="url(#tint-green)" style={{ pointerEvents: 'none' }} />


                            <image href={pumpRunSvg} x={1666} y={800} width="75" filter={isPump1Active ? "url(#tint-green)" : "url(#tint-red)"} style={{ pointerEvents: 'none' }} />
                            <image href={pumpRunSvg} x={1766} y={877} width="75" filter={isPump2Active ? "url(#tint-green)" : "url(#tint-red)"} style={{ pointerEvents: 'none' }} />

                            {/* CST Steam Valve Actuator */}
                            <image href={valveActuatorSvg} x={1050} y={880} width="50" transform="rotate(90 1193 918)" filter={isCstSteamActive ? "url(#tint-green)" : "url(#tint-red)"} style={{ pointerEvents: 'none' }} />

                            {/* Blow Down Temp Control Valve */}
                            <image href={valveActuatorSvg} x={138} y={580} width="50" transform="rotate(90 366 880)" filter={isBlowdownTempActive ? "url(#tint-green)" : "url(#tint-red)"} style={{ pointerEvents: 'none' }} />

                            {/* Press 1 Inlet Valve Actuators */}
                            <image href={valveActuatorSvg} x={260} y={368} width="35" transform="rotate(90 234 231)" filter={isPress1SteamActive ? "url(#tint-green)" : "url(#tint-red)"} style={{ pointerEvents: 'none' }} />
                            <image href={valveActuatorSvg} x={270} y={347} width="35" transform="rotate(90 234 267)" filter={isPress1DilutionActive ? "url(#tint-green)" : "url(#tint-red)"} style={{ pointerEvents: 'none' }} />

                            {/* Press 2 Inlet Valve Actuators */}
                            <image href={valveActuatorSvg} x={780} y={304} width="35" transform="rotate(90 707 231)" filter={isPress2SteamActive ? "url(#tint-green)" : "url(#tint-red)"} style={{ pointerEvents: 'none' }} />
                            <image href={valveActuatorSvg} x={698} y={397} width="35" transform="rotate(90 707 267)" filter={isPress2DilutionActive ? "url(#tint-green)" : "url(#tint-red)"} style={{ pointerEvents: 'none' }} />

                            {/* Press 3 Inlet Valve Actuators */}
                            <image href={valveActuatorSvg} x={1205} y={352} width="35" transform="rotate(90 1177 231)" filter={isPress3SteamActive ? "url(#tint-green)" : "url(#tint-red)"} style={{ pointerEvents: 'none' }} />
                            <image href={valveActuatorSvg} x={1215} y={331} width="35" transform="rotate(90 1177 267)" filter={isPress3DilutionActive ? "url(#tint-green)" : "url(#tint-red)"} style={{ pointerEvents: 'none' }} />

                            {/* Press 4 Inlet Valve Actuators */}
                            <image href={valveActuatorSvg} x={1676} y={343} width="35" transform="rotate(90 1647 231)" filter={isPress4SteamActive ? "url(#tint-green)" : "url(#tint-red)"} style={{ pointerEvents: 'none' }} />
                            <image href={valveActuatorSvg} x={1685} y={322} width="35" transform="rotate(90 1647 267)" filter={isPress4DilutionActive ? "url(#tint-green)" : "url(#tint-red)"} style={{ pointerEvents: 'none' }} />

                            {/* ========================================== */}
                            {/* --- MONITORING CARDS & HUD OVERLAYS --- */}
                            {/* ========================================== */}
                            {/* Press 1 - 4 Data Cards */}
                            <MachineParams id="press1_data" onClick={handleEquipmentClick} isEditable={configMode} x={440} y={360} title="PRESS 1 DATA" params={[
                                { label: 'STEAM', value: press1SteamVal, unit: '%' },
                                { label: 'DILUTION', value: press1DilutionVal, unit: '%' },
                                { label: 'DAMPER', value: lv('press1_data', 'DAMPER', 'no tag'), unit: '%' },
                                { label: 'EFB COUNT', value: lv('press1_data', 'EFB COUNT', 'no tag'), unit: '/hr' }
                            ]} />
                            <MachineParams id="press2_data" onClick={handleEquipmentClick} isEditable={configMode} x={940} y={290} title="PRESS 2 DATA" params={[
                                { label: 'STEAM', value: press2SteamVal, unit: '%' },
                                { label: 'DILUTION', value: press2DilutionVal, unit: '%' },
                                { label: 'DAMPER', value: lv('press2_data', 'DAMPER', 'no tag'), unit: '%' },
                                { label: 'EFB COUNT', value: lv('press2_data', 'EFB COUNT', 'no tag'), unit: '/hr' }
                            ]} />
                            <MachineParams id="press3_data" onClick={handleEquipmentClick} isEditable={configMode} x={1430} y={290} title="PRESS 3 DATA" params={[
                                { label: 'STEAM', value: press3SteamVal, unit: '%' },
                                { label: 'DILUTION', value: press3DilutionVal, unit: '%' },
                                { label: 'DAMPER', value: lv('press3_data', 'DAMPER', 'no tag'), unit: '%' },
                                { label: 'EFB COUNT', value: lv('press3_data', 'EFB COUNT', 'no tag'), unit: '/hr' }
                            ]} />
                            <MachineParams id="press4_data" onClick={handleEquipmentClick} isEditable={configMode} x={1840} y={290} title="PRESS 4 DATA" params={[
                                { label: 'STEAM', value: press4SteamVal, unit: '%' },
                                { label: 'DILUTION', value: press4DilutionVal, unit: '%' },
                                { label: 'DAMPER', value: lv('press4_data', 'DAMPER', 'no tag'), unit: '%' },
                                { label: 'EFB COUNT', value: lv('press4_data', 'EFB COUNT', 'no tag'), unit: '/hr' }
                            ]} />

                            {/* Temperature Sensors below Presses */}
                            <MonitorCard id="temp1" onClick={handleEquipmentClick} isEditable={configMode} x={260} y={480} label="TEMP 1" value="no tag" unit="°C" equipmentName="Press 1 Temp" trendType="Temperature" />
                            <MonitorCard id="temp2" onClick={handleEquipmentClick} isEditable={configMode} x={740} y={480} label="TEMP 2" value="no tag" unit="°C" equipmentName="Press 2 Temp" trendType="Temperature" />
                            <MonitorCard id="temp3" onClick={handleEquipmentClick} isEditable={configMode} x={1220} y={480} label="TEMP 3" value="no tag" unit="°C" equipmentName="Press 3 Temp" trendType="Temperature" />
                            <MonitorCard id="temp4" onClick={handleEquipmentClick} isEditable={configMode} x={1700} y={480} label="TEMP 4" value="no tag" unit="°C" equipmentName="Press 4 Temp" trendType="Temperature" />

                            {/* Left Side Monitoring Points */}
                            <MachineParams id="heavy_liquor" onClick={handleEquipmentClick} isEditable={configMode} x={145} y={810} title="HEAVY LIQUOR" params={[
                                { label: 'STATUS', value: 'no tag', unit: '' }
                            ]} />
                            <MonitorCard id="tank_level" onClick={handleEquipmentClick} isEditable={configMode} x={490} y={1060} label="TANK LEVEL" value="no tag" unit="%" equipmentName="Liquor Tank Level" trendType="Level" />
                            <MonitorCard id="tank_temp" onClick={handleEquipmentClick} isEditable={configMode} x={605} y={1060} label="TANK TEMP" value="no tag" unit="°C" equipmentName="Liquor Tank Temp" trendType="Temperature" />

                            {/* Pumps, Conveyors & Liquor Volume Cards */}
                            <MonitorCard id="pump1" onClick={handleEquipmentClick} isEditable={configMode} x={1220} y={735} label="PUMP 1" value={pump1Val} unit="A" equipmentName="Pump 1" trendType="Load" status={isPump1Active ? "RUNNING" : "STOPPED"} />
                            <MonitorCard id="pump2" onClick={handleEquipmentClick} isEditable={configMode} x={1150} y={980} label="PUMP 2" value={pump2Val} unit="A" equipmentName="Pump 2" trendType="Load" status={isPump2Active ? "RUNNING" : "STOPPED"} />
                            <MonitorCard id="cst_steam" onClick={handleEquipmentClick} isEditable={configMode} x={1330} y={980} label="CST STEAM" value={cstSteamVal} unit="%" equipmentName="CST Steam Valve" trendType="Valve" />
                            <MonitorCard id="cake_breaker" onClick={handleEquipmentClick} isEditable={configMode} x={1810} y={625} label="CAKE BREAKER" value={cakeBreakerVal} unit="A" equipmentName="Cake Breaker Conveyor" trendType="Load" />
                            <MonitorCard id="feed_conv" onClick={handleEquipmentClick} isEditable={configMode} x={1680} y={163} label="FEED CONV" value="no tag" unit="A" equipmentName="EFB Feed Conveyor" trendType="Load" />

                            <MachineParams id="liquor_volume" onClick={handleEquipmentClick} isEditable={configMode} x={983} y={805} title="LIQUOR COLLECTION TANK" params={[
                                { label: 'TEMPERATURE', value: 'no tag', unit: '°C' },
                                { label: 'LEVEL', value: 'no tag', unit: '%' }
                            ]} />

                            <MonitorCard id="blowdown_temp" onClick={handleEquipmentClick} isEditable={configMode} x={665} y={750} label="BLOW-DOWN TEMP" value={blowdownTempVal} unit="°C" equipmentName="Blow-Down Temp" trendType="Temperature" />

                            {/* Elements khusus Maintenance Mode */}
                            {viewMode === 'maintenance' && (
                                <>
                                    <MaintenanceCardSVG x={240} y={150} label="MANDO 1 CTRL" params={[{ label: 'LOAD', value: 'no tag', unit: 'A' }]} id="mando1_mnt" />
                                    <MaintenanceCardSVG x={240} y={320} label="MANDO 2 CTRL" params={[{ label: 'LOAD', value: 'no tag', unit: 'A' }]} id="mando2_mnt" />
                                </>
                            )}

                            {/* Stats Boxes (Overlay kanan bawah) */}
                            <foreignObject x={1550} y={680} width="220" height="200" style={{ overflow: 'visible' }}>
                                <div className="som-stats-overlay-card" style={{ margin: 0, transform: 'scale(0.85)', transformOrigin: 'top left', width: 'fit-content', minWidth: '140px' }}>
                                    <div className="stats-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px', paddingBottom: '8px' }}>
                                        <span className="stats-label">FFB Processed Today</span>
                                        <span className="stats-value">no tag</span>
                                    </div>
                                    <div className="stats-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px', paddingBottom: '8px' }}>
                                        <span className="stats-label">Oil Recovered from EFB</span>
                                        <span className="stats-value">no tag</span>
                                    </div>
                                    <div className="stats-row highlight" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                                        <span className="stats-label">OER Recovered</span>
                                        <span className="stats-value">no tag</span>
                                    </div>
                                </div>
                            </foreignObject>

                            <foreignObject x={1690} y={680} width="220" height="150" style={{ overflow: 'visible' }}>
                                <div className="som-stats-overlay-card" style={{ margin: 0, transform: 'scale(0.85)', transformOrigin: 'top left', width: 'fit-content', minWidth: '140px' }}>
                                    <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px', borderBottom: '1px solid #ffdb3b', paddingBottom: '4px', color: '#0f172a' }}>
                                        Skimmed oil to POT
                                    </div>
                                    <div className="stats-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px', paddingBottom: '0', borderBottom: 'none' }}>
                                        <span className="stats-label">Daily oil recovered</span>
                                        <span className="stats-value" style={{ color: '#d4ac0d' }}>no tag</span>
                                    </div>
                                </div>
                            </foreignObject>

                            {/* WT Flow Builder Overlay Canvas */}
                            <WTFlowOverlay
                                flows={wtFlow.flows}
                                activeFlowIdx={wtFlow.activeFlowIdx}
                                isActive={wtFlow.isActive}
                                isPlacing={wtFlow.isPlacing}
                                onPointDrag={wtFlow.updatePoint}
                                onInsertPoint={wtFlow.insertPoint}
                                onDeletePoint={wtFlow.deletePoint}
                                onSelectFlow={wtFlow.setActiveFlowIdx}
                                onCanvasClick={(x, y) => wtFlow.addPointToActiveFlow(x, y)}
                            />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Modal Edit PLC Tag Mapping */}
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

            {/* WT Flow Builder Floating Panel */}
            <WTFlowPanel
                isActive={wtFlow.isActive}
                flows={wtFlow.flows}
                activeFlowIdx={wtFlow.activeFlowIdx}
                isPlacing={wtFlow.isPlacing}
                onSelectFlow={wtFlow.setActiveFlowIdx}
                onAddNewFlow={wtFlow.addNewFlow}
                onDeleteFlow={wtFlow.deleteFlow}
                onUpdateFlowSettings={wtFlow.updateFlowSettings}
                onFinishPlacing={wtFlow.finishPlacing}
                onClose={wtFlow.toggle}
            />
        </section>
    );
}

export default EFBPlantPage;