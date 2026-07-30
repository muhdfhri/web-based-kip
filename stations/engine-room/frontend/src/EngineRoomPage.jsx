import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import './EngineRoomPage.css'

// Assets
import engineRoomImageUrl from './assets/engine-room.webp'
import motorSvg from './assets/item/motor.svg'
import valve_positionerSvg from './assets/item/valve_positioner.svg'

/**
 * Custom hook for hover effects and sound
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

    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
        }
    }, [])

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
 * Trend Popup component (Portaled)
 */
function StatusGraphPopup({ position, equipmentName, type = 'Load', value = 0, unit = 'A', onMouseEnter, onMouseLeave }) {
    const popupRef = useRef(null)
    const [style, setStyle] = useState({ opacity: 0, pointerEvents: 'none' })

    useEffect(() => {
        if (!position || !popupRef.current) return

        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        const popupWidth = 450
        const popupHeight = 400
        const padding = 20

        let left = position.right + 15
        let top = position.top - 10

        if (left + popupWidth > viewportWidth - padding) {
            left = position.left - popupWidth - 15
        }
        if (top + popupHeight > viewportHeight - padding) {
            top = viewportHeight - popupHeight - padding
        }
        if (top < padding) top = padding
        if (left < padding) left = padding

        setStyle({
            top: `${top}px`,
            left: `${left}px`,
            opacity: 1,
            pointerEvents: 'auto'
        })
    }, [position])

    const width = 400
    const height = 200
    const plotLeft = 40
    const plotRight = 360
    const plotTop = 20
    const plotBottom = 160

    const points = useMemo(() => {
        return Array.from({ length: 20 }).map((_, i) => {
            const x = plotLeft + ((plotRight - plotLeft) * i) / 19
            const yVal = Math.max(0, value)
            const maxRange = type === 'Temperature' ? 150 : (type === 'Frequency' ? 60 : 2000)
            const t = yVal / maxRange
            const y = plotBottom - t * (plotBottom - plotTop)
            return { x, y }
        })
    }, [value, type])

    const polyPoints = points.map((p) => `${p.x},${p.y}`).join(' ')

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
                        <linearGradient id="trendGradientER" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05" />
                        </linearGradient>
                    </defs>
                    <rect x={plotLeft} y={plotTop} width={plotRight - plotLeft} height={plotBottom - plotTop} fill="rgba(255, 255, 255, 0.02)" />
                    <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke="rgba(255,255,255,0.2)" />
                    <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke="rgba(255,255,255,0.2)" />
                    <polygon className="som-amp-graph-area" points={`${plotLeft},${plotBottom} ${polyPoints} ${plotRight},${plotBottom}`} style={{ fill: 'url(#trendGradientER)' }} />
                    <polyline className="som-amp-graph-line-main" points={polyPoints} fill="none" stroke="#f59e0b" strokeWidth="2" />
                    {points.map((p, idx) => (
                        <circle key={idx} cx={p.x} cy={p.y} r="2.5" fill="#f59e0b" />
                    ))}
                </svg>
            </div>
        </div>,
        document.body
    )
}

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

                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", maxHeight: "60vh", overflowY: "auto" }}>
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
 * Standard Boiler Mini Card
 */
const GenericMiniCard = ({ x, y, title, params, status = "active", width = 110, height = 80, utilization = null, configMode = false, onTagEdit = null, cardId = null }) => (
    <foreignObject x={x} y={y} width={width} height={height + (utilization ? 15 : 0)} style={{ overflow: 'visible' }}>
        <div 
            className={`som-boiler-mini-card ${configMode ? 'som-editable' : ''}`}
            onClick={(e) => {
                if (configMode && onTagEdit && cardId) {
                    onTagEdit(e, cardId, []);
                }
            }}
            style={{ cursor: configMode ? 'pointer' : 'default' }}
        >
            <div className={`som-boiler-mini-header ${status === 'standby' ? 'standby' : ''}`}>
                <span className="som-boiler-mini-tag">{title}</span>
                <div className={`som-boiler-status-indicator ${status === 'active' ? 'active' : ''}`}></div>
            </div>
            <div className="som-boiler-mini-body">
                {params.map((p, i) => (
                    <div key={i} className="som-boiler-mini-param">
                        <span className="som-boiler-mini-label">{p.label}</span>
                        <span className="som-v2-value" style={{ textShadow: 'none' }}>{p.value}</span>
                        {p.unit && <span className="som-boiler-mini-unit">{p.unit}</span>}
                    </div>
                ))}
                {utilization !== null && (
                    <div className="som-boiler-mini-util-badge">
                        UTIL: {utilization}%
                    </div>
                )}
            </div>
        </div>
    </foreignObject>
)

/**
 * Simple Box Component for Header Bar
 */
const PowerBox = ({ x, y, label, value, colorClass = "green" }) => (
    <foreignObject x={x} y={y} width="145" height="65" style={{ overflow: 'visible' }}>
        <div className={`som-power-dist-box ${colorClass}`}>
            <span className="box-label">{label}</span>
            <span className="box-value">{value} <span className="box-unit">KW</span></span>
        </div>
    </foreignObject>
)

/**
 * Reusable Steam/Liquid Flow Animation Component
 * Identical to Sterilizer Station SteamFlowSVG
 */
const SteamFlowSVG = ({ d, active = true, mode = 'flowing', color = '#a9dbe1ff' }) => {
    if (!active) return null;

    let modeClass = 'liquid-flow--flowing';
    if (mode === 'standby') modeClass = 'liquid-flow--standby';
    if (mode === 'liquid') modeClass = 'liquid-flow--liquid';

    return (
        <g className={modeClass}>
            <path d={d} fill="none" stroke={color} className="liquid-flow-glow" pointerEvents="none" />
            <path d={d} fill="none" stroke={color} className="liquid-flow-aura" pointerEvents="none" />
        </g>
    );
};

/**
 * Dedicated Steam Consumption Card (Individual Row)
 */
const SteamRowCard = ({ x, y, label, hr, day }) => (
    <foreignObject x={x} y={y} width="257" height="35" style={{ overflow: 'visible' }}>
        <div className="som-er-steam-card-row">
            <div className="steam-card-label">{label}</div>
            <div className="steam-card-values">
                <div className="steam-card-val-hr">
                    {hr} <span className="steam-card-unit">/hr</span>
                </div>
                <div className="steam-card-val-day">
                    {day} <span className="steam-card-unit">/day</span>
                </div>
            </div>
        </div>
    </foreignObject>
)

function EngineRoomPage({ user, onSelectSubmenu }) {
    const [viewMode, setViewMode] = useState('process')
    const svgRef = useRef(null)

    const handleMouseMove = (e) => {
        if (!svgRef.current) return
        const svg = svgRef.current
        const pt = svg.createSVGPoint()
        pt.x = e.clientX
        pt.y = e.clientY
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
    }

    const [isFullscreen, setIsFullscreen] = useState(false)

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

    const fetchLiveValues = useCallback(async () => {
        try {
            const res = await fetch("/api/engine-room/plc-config/tags-live", { headers: authHeaders() });
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
                const res = await fetch("/api/engine-room/plc-config/tags", { headers: authHeaders() });
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
                const res = await fetch("/api/engine-room/plc-config/station-mappings/ENGINE_ROOM", { headers: authHeaders() });
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

    const handleTagEditRequest = (e, id, subs = []) => {
        e.stopPropagation();
        setTagEdit({ targetId: id, subs: subs, pos: { top: 0, left: 0 } });
    };

    const handleTagSave = async (updatedTags, editData) => {
        setSavingTags(true);
        try {
            const mappings = [];
            for (const [key, tagId] of Object.entries(updatedTags)) {
                if (!tagId) continue;
                const parts = key.split("__");
                if (parts.length !== 2) continue;
                mappings.push({ station: "ENGINE_ROOM", equipment: parts[0], signal_key: parts[1], tag_id: parseInt(tagId) });
            }
            if (mappings.length > 0) {
                await fetch("/api/engine-room/plc-config/station-mappings", {
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

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement || !!document.webkitIsFullScreen);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    const steamData = [
        { label: 'STERILIZER', hr: '18.50', day: '118.50' },
        { label: 'EFB & PRESS', hr: '3.10', day: '13.10' },
        { label: 'KERNEL PLT', hr: '3.20', day: '13.20' },
        { label: 'OIL ROOM', hr: '2.30', day: '12.30' },
        { label: 'BOILER', hr: '8.00', day: '18.00' },
        { label: 'SURPLUS', hr: '0.00', day: '10.00' },
        { label: 'SAFETY', hr: '0.00', day: '10.00' },
    ]

    return (
        <section className="som-engine-room">
            <header className="som-engine-room-station-header">
                <div className="som-header-left">
                    <h2 className="som-engine-room-station-title">ENGINE ROOM</h2>
                    <div className="som-station-tabs">
                        <button className="som-station-tab active">Overview</button>
                    </div>
                </div>

                {user && (user.role === 'Developer' || user.userRole === 'Developer') && (
                    <div className={`som-dev-config-toggle ${configMode ? 'active' : ''}`} onClick={() => setConfigMode(!configMode)} style={{position: 'absolute', top: '100px', right: '20px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(2, 6, 23, 0.8)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)'}}>
                        <div className="toggle-text" style={{color: '#f1f5f9', fontSize: '10px', fontWeight: 'bold'}}>{configMode ? 'Config Mode ON' : 'Config Mode'}</div>
                        <div className="som-boiler-status-indicator active" style={{ backgroundColor: configMode ? '#0f172a' : '#ffdb3b', width: '8px', height: '8px', borderRadius: '50%' }}></div>
                    </div>
                )}

                <div className="som-view-toggle-container" style={{ marginLeft: 'auto' }}>
                    <button
                        className={`som-view-btn ${viewMode === 'process' ? 'active' : ''}`}
                        onClick={() => setViewMode('process')}
                    >
                        PROCESS VIEW
                    </button>
                    <button
                        className="som-view-btn"
                        disabled
                        style={{ cursor: 'not-allowed', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        MAINTENANCE VIEW
                        <svg width="10" height="12" viewBox="0 0 448 512" fill="currentColor" style={{ marginLeft: '4px' }}>
                            <path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z" />
                        </svg>
                    </button>
                    {onSelectSubmenu && (
                        <button className="som-view-btn" onClick={() => onSelectSubmenu('Engine Room', 'Settings')} style={{ marginLeft: '8px' }}>⚙️ SETTINGS</button>
                    )}
                </div>
            </header>

            <div className="som-engine-room-main">
                <div className="som-engine-room-layout">
                    <div className="som-engine-room-flow-body">
                        <svg
                            ref={svgRef}
                            viewBox={isFullscreen ? "0 0 1920 1080" : "0 0 1980 980"}
                            className="station-svg-canvas"
                            preserveAspectRatio="xMidYMid meet"
                            onMouseMove={handleMouseMove}
                        >
                            <image href={engineRoomImageUrl} width="1920" height="1080" />

                            {/* Power Distribution Header Bar (Top 12 items) */}
                            <PowerBox x={20} y={120} label="OFFICE" value="126" colorClass="purple" />
                            <PowerBox x={175} y={120} label="GRADING" value="60" colorClass="green" />
                            <PowerBox x={330} y={120} label="STERILIZER" value="140" colorClass="green" />
                            <PowerBox x={485} y={120} label="THRESHER" value="60" colorClass="green" />
                            <PowerBox x={640} y={120} label="EFB PLANT" value="200" colorClass="green" />
                            <PowerBox x={795} y={120} label="PRESS" value="200" colorClass="green" />
                            <PowerBox x={950} y={120} label="KERNEL" value="200" colorClass="green" />
                            <PowerBox x={1105} y={120} label="OIL ROOM" value="200" colorClass="green" />
                            <PowerBox x={1260} y={120} label="BOILER" value="400" colorClass="green" />
                            <PowerBox x={1415} y={120} label="RWT" value="40" colorClass="blue" />
                            <PowerBox x={1570} y={120} label="ETP" value="40" colorClass="yellow" />
                            <PowerBox x={1725} y={120} label="HOUSING" value="30" colorClass="blue-dark" />

                            {/* Top Left Stats Box */}
                            <foreignObject x={180} y={210} width="280" height="100">
                                <div className="som-er-purple-box">
                                    <div className="er-stat-row">Today Electricity from Genset</div>
                                    <div className="er-stat-value er-stat-value-neon">1,200 kWh</div>
                                    <div className="er-stat-row">Today Diesel Consumption</div>
                                    <div className="er-stat-value">480 L, rated 2.5 kWh/L Diesel</div>
                                </div>
                            </foreignObject>

                            {/* Gensets */}
                            <g>
                                <GenericMiniCard x={330} y={350} title="GENSET 1" status="standby" utilization="00" params={[
                                    { label: 'POWER', value: '---', unit: 'KW' },
                                    { label: 'FREQ', value: '---', unit: 'Hz' }
                                ]} width={120} configMode={configMode} onTagEdit={handleTagEditRequest} cardId="GENSET 1" />

                                <GenericMiniCard x={330} y={570} title="GENSET 2" status="standby" utilization="00" params={[
                                    { label: 'POWER', value: '---', unit: 'KW' },
                                    { label: 'FREQ', value: '---', unit: 'Hz' }
                                ]} width={120} configMode={configMode} onTagEdit={handleTagEditRequest} cardId="GENSET 2" />

                                <GenericMiniCard x={330} y={800} title="GENSET 3" status="standby" utilization="00" params={[
                                    { label: 'POWER', value: '---', unit: 'KW' },
                                    { label: 'FREQ', value: '---', unit: 'Hz' }
                                ]} width={120} configMode={configMode} onTagEdit={handleTagEditRequest} cardId="GENSET 3" />
                            </g>

                            {/* Turbines */}
                            <g>
                                <GenericMiniCard x={890} y={240} title="TURBINE 1" utilization="80" params={[
                                    { label: 'POWER', value: '1,023', unit: 'KW' },
                                    { label: 'SPEED', value: '1500', unit: 'RPM' },
                                    { label: 'FREQ', value: '50.1', unit: 'Hz' }
                                ]} width={140} height={100} configMode={configMode} onTagEdit={handleTagEditRequest} cardId="TURBINE 1" />

                                <GenericMiniCard x={1540} y={240} title="TURBINE 2" status="standby" utilization="00" params={[
                                    { label: 'POWER', value: '---', unit: 'KW' },
                                    { label: 'SPEED', value: '---', unit: 'RPM' },
                                    { label: 'FREQ', value: '---', unit: 'Hz' }
                                ]} width={140} height={100} configMode={configMode} onTagEdit={handleTagEditRequest} cardId="TURBINE 2" />
                            </g>

                            {/* Steam Highlights */}
                            <foreignObject x={1700} y={350} width="220" height="100" style={{ overflow: 'visible' }}>
                                <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                                    <div
                                        onClick={(e) => {
                                            if (configMode) handleTagEditRequest(e, 'main_steam');
                                        }}
                                        className={`som-boiler-mini-card ${configMode ? 'som-editable' : ''}`}
                                        style={{ cursor: configMode ? 'pointer' : 'default', minWidth: '180px' }}
                                    >
                                        <div className="som-boiler-mini-header">
                                            <span className="som-boiler-mini-tag">MAIN STEAM PIPE</span>
                                            <div className="som-boiler-status-indicator active"></div>
                                        </div>
                                        <div className="som-boiler-mini-body" style={{ flexDirection: "row", justifyContent: "center", alignItems: "baseline", gap: "5px" }}>
                                            <span className="som-v2-value" style={{ textShadow: "none", fontSize: "20px" }}>
                                                {lv('main_steam', 'MONITOR', '--', 2)}
                                            </span>
                                            <span className="som-boiler-mini-unit">bar</span>
                                        </div>
                                    </div>
                                </div>
                            </foreignObject>

                            <GenericMiniCard x={1750} y={239} title="STEAM FLOW" params={[
                                { label: 'FROM BOILER', value: '26', unit: 'ton/hr' }
                            ]} width={120} />

                            <GenericMiniCard x={530} y={500} title="MAKE-UP" params={[
                                { label: 'VALVE', value: '45', unit: '%' }
                            ]} width={100} />

                            {/* BPV Tank */}
                            <text x={1060} y={770} fill="#000000ff" fontSize="24" fontWeight="900">BPV</text>
                            <GenericMiniCard x={920} y={730} title="BPV PRESSURE" params={[
                                { label: 'CURRENT', value: '3.6', unit: 'bar' }
                            ]} width={120} />

                            {steamData.map((d, i) => (
                                <SteamRowCard
                                    key={i}
                                    x={1615}
                                    y={496 + (i * 42)}
                                    label={d.label}
                                    hr={d.hr}
                                    day={d.day}
                                />
                            ))}

                            {/* Adjustable Valve */}
                            {(() => {
                                const valveX = 620;
                                const valveY = 554;
                                const valveSize = 80;
                                const valveRot = 270; // Anda dapat mengubah rotasi di sini (dalam derajat)

                                return (
                                    <image
                                        href={valve_positionerSvg}
                                        x={valveX}
                                        y={valveY}
                                        width={valveSize}
                                        height={valveSize}
                                        transform={`rotate(${valveRot} ${valveX + valveSize / 2} ${valveY + valveSize / 2})`}
                                    />
                                );
                            })()}

                            {/* Bottom Right Stats Box */}
                            <foreignObject x={1570} y={800} width="280" height="100">
                                <div className="som-er-purple-box">
                                    <div className="er-stat-row">Today Electricity from Turbine</div>
                                    <div className="er-stat-value er-stat-value-neon">12,000 kWh</div>
                                    <div className="er-stat-row">Today Steam Consumed</div>
                                    <div className="er-stat-value">6,000, rated 2.0 kWh/ton steam</div>
                                </div>
                            </foreignObject>

                        </svg>
                    </div>
                </div>
            </div>
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

export default EngineRoomPage;