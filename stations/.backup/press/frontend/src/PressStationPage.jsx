import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import usePlcStore from '@core/store'
import pressStationImageUrl from './assets/press-station2.webp'
import waterGifUrl from './assets/water.gif'
// SVG Icons
import motorSvg from './assets/item/motor.svg'
import motorCrookedSvg from './assets/item/motor_crooked.svg'
import valvePneumaticSvg from './assets/item/valve_pneumatic_actuator.svg'
import valveControlSvg from './assets/item/valve_control.svg'
import flowmeterSvg from './assets/item/flowmeter.svg'

import {
    PressMotorCardSVG,
    EquipmentIconSVG,
    LiquidFlowSVG,
    StationLabelSVG,
    IpomasMonitorCardSVG
} from './components/PressStationComponents.jsx';
import './PressStationPage.css'

/**
 * Modern Maintenance Card for Press Station (Dark Tech Look)
 */
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

const MaintenanceCardSVG = ({ x, y, label, params = [], id, onClick }) => {
    return (
        <g
            className="maintenance-card-group"
            transform={`translate(${x - 150}, ${y - 65})`}
            onClick={() => onClick && onClick(id)}
            style={{ cursor: 'pointer' }}
        >
            <foreignObject width="300" height="130" style={{ overflow: 'visible' }}>
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <div className="som-motor-mini-card maintenance-card">
                        <div className="som-motor-mini-header">
                            <span className="som-motor-mini-label">{label}</span>
                            <div className="som-maintenance-mini-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
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
}

function PressStationPage({ user, onSelectSubmenu }) {
    const [viewMode, setViewMode] = useState('process')
    const svgRef = useRef(null)

    const handleMouseMove = (e) => {
        if (!svgRef.current) return
        const svg = svgRef.current
        const pt = svg.createSVGPoint()
        pt.x = e.clientX; pt.y = e.clientY
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
    }

    const initSocket = usePlcStore(state => state.initSocket)
    const tags = usePlcStore(state => state.tags)
    const getTag = (tagName) => tags[tagName] || { value: 0, status: 'STOP', timestamp: null }

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
                const res = await fetch("/api/press/plc-config/tags", { headers: authHeaders() });
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
                const res = await fetch("/api/press/plc-config/station-mappings/PRESS", { headers: authHeaders() });
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
            const res = await fetch("/api/press/plc-config/tags-live", { headers: authHeaders() });
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
                mappings.push({ station: "PRESS", equipment: parts[0], signal_key: parts[1], tag_id: parseInt(tagId) });
            }
            if (mappings.length > 0) {
                await fetch("/api/press/plc-config/station-mappings", {
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

    const handleEquipmentClick = (id) => {
        if (configMode && id === 'main_steam') {
            handleTagEditRequest(id, [], null);
            return;
        }
        console.log(`Equipment clicked: ${id}`);
    };

    const pressStatus = useMemo(() => {
        return {
            fruitDist: {
                run: getTag('PRS_FD_RUN')?.value === 1,
                amp: Number(getTag('PRS_FD_AMP')?.value || 0)
            },
            digester: [
                { id: 'dig1', idx: 1, run: getTag('PRS_DG1_RUN')?.value === 1, amp: Number(getTag('PRS_DG1_AMP')?.value || 0), level: Number(getTag('PRS_DG1_LEV')?.value || 0), temp: Number(getTag('PRS_DG1_TEMP')?.value || 0) },
                { id: 'dig2', idx: 2, run: getTag('PRS_DG2_RUN')?.value === 1, amp: Number(getTag('PRS_DG2_AMP')?.value || 0), level: Number(getTag('PRS_DG2_LEV')?.value || 0), temp: Number(getTag('PRS_DG2_TEMP')?.value || 0) },
                { id: 'dig3', idx: 3, run: getTag('PRS_DG3_RUN')?.value === 1, amp: Number(getTag('PRS_DG3_AMP')?.value || 0), level: Number(getTag('PRS_DG3_LEV')?.value || 0), temp: Number(getTag('PRS_DG3_TEMP')?.value || 0) },
                { id: 'dig4', idx: 4, run: getTag('PRS_DG4_RUN')?.value === 1, amp: Number(getTag('PRS_DG4_AMP')?.value || 0), level: Number(getTag('PRS_DG4_LEV')?.value || 0), temp: Number(getTag('PRS_DG4_TEMP')?.value || 0) },
            ],
            press: [
                { id: 'prs1', idx: 1, run: getTag('PRS_P1_RUN')?.value === 1, amp: Number(getTag('PRS_P1_AMP')?.value || 0), load: Number(getTag('PRS_P1_LOAD')?.value || 0), pressure: Number(getTag('PRS_P1_PRES')?.value || 0), mode: getTag('PRS_P1_MODE')?.value === 1 ? 'Auto' : 'Manual' },
                { id: 'prs2', idx: 2, run: getTag('PRS_P2_RUN')?.value === 1, amp: Number(getTag('PRS_P2_AMP')?.value || 0), load: Number(getTag('PRS_P2_LOAD')?.value || 0), pressure: Number(getTag('PRS_P2_PRES')?.value || 0), mode: getTag('PRS_P2_MODE')?.value === 1 ? 'Auto' : 'Manual' },
                { id: 'prs3', idx: 3, run: getTag('PRS_P3_RUN')?.value === 1, amp: Number(getTag('PRS_P3_AMP')?.value || 0), load: Number(getTag('PRS_P3_LOAD')?.value || 0), pressure: Number(getTag('PRS_P3_PRES')?.value || 0), mode: getTag('PRS_P3_MODE')?.value === 1 ? 'Auto' : 'Manual' },
                { id: 'prs4', idx: 4, run: getTag('PRS_P4_RUN')?.value === 1, amp: Number(getTag('PRS_P4_AMP')?.value || 0), load: Number(getTag('PRS_P4_LOAD')?.value || 0), pressure: Number(getTag('PRS_P4_PRES')?.value || 0), mode: getTag('PRS_P4_MODE')?.value === 1 ? 'Auto' : 'Manual' },
            ],
            cakeBreaker: {
                run: getTag('PRS_CBC_RUN')?.value === 1,
                amp: Number(getTag('PRS_CBC_AMP')?.value || 0)
            },
            dilution: {
                run: getTag('PRS_DIL_RUN')?.value === 1,
                flow: Number(getTag('PRS_DIL_FLOW')?.value || 0),
                cv: Number(getTag('PRS_DIL_CV')?.value || 0),
                waterLevel: Number(getTag('PRS_WAT_LEV')?.value || 0),
                condLevel: Number(getTag('PRS_CON_LEV')?.value || 0)
            }
        }
    }, [getTag])

    return (
        <section className={`som-press-station som-mode-${viewMode}`}>
            <header className="som-press-station-header">
                <div className="som-header-left">
                    <h1 className="som-press-station-title">PRESS STATION</h1>

                    <div className="som-station-tabs">
                        <button className="som-station-tab active">Overview</button>
                    </div>
                </div>

                <div className="som-view-toggle-container" style={{ marginLeft: 'auto' }}>
                    <button className={`som-view-btn ${viewMode === 'process' ? 'active' : ''}`} onClick={() => setViewMode('process')}>PROCESS VIEW</button>
                    <button className="som-view-btn" disabled style={{ cursor: 'not-allowed', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        MAINTENANCE VIEW
                        <svg width="10" height="12" viewBox="0 0 448 512" fill="currentColor" style={{ marginLeft: '4px' }}><path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z"/></svg>
                    </button>
                    {onSelectSubmenu && (
                        <button className="som-view-btn" onClick={() => onSelectSubmenu('Press Station', 'Settings')} style={{ marginLeft: '8px' }}>⚙️ SETTINGS</button>
                    )}
                </div>
            </header>

            <div className="som-press-main">
                <div className="som-press-layout">
                    <div className="som-press-flow-card">
                        <div className="som-press-flow-body">
                            <svg ref={svgRef} viewBox="-350 -55 2620 1150" className="station-svg-canvas" preserveAspectRatio="xMidYMid meet" onMouseMove={handleMouseMove}>
                                <defs>
                                    {/* <linearGradient id="waterGradientRealistic" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="transparent" />
                                        <stop offset="50%" stopColor="#ffffff88" />
                                        <stop offset="100%" stopColor="transparent" />
                                        <animateTransform attributeName="gradientTransform" type="translate" from="-1" to="1" dur="2s" repeatCount="indefinite" />
                                    </linearGradient> */}

                                    {/* Diagnostic Grid Pattern */}
                                    {/* <pattern id="diagGrid" width="100" height="100" patternUnits="userSpaceOnUse">
                                        <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255, 219, 59, 0.2)" strokeWidth="1" />
                                        <circle cx="0" cy="0" r="1.5" fill="rgba(255, 219, 59, 0.4)" />
                                    </pattern> */}

                                    {/* Amber Glow for Maintenance */}
                                    {/* <filter id="neonGlowAmber" x="-20%" y="-20%" width="140%" height="140%">
                                        <feGaussianBlur stdDeviation="3" result="blur" />
                                        <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#ffdb3b" />
                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                    </filter> */}
                                    <filter id="tint-red" color-interpolation-filters="sRGB">
                                        <feColorMatrix type="matrix" values="0.244 0.822 0.083 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"/>
                                    </filter>
                                    <filter id="tint-green" color-interpolation-filters="sRGB">
                                        <feColorMatrix type="matrix" values="0.0638 0.2146 0.0216 0 0 0.2551 0.8582 0.0867 0 0 0.0425 0.1430 0.0144 0 0 0 0 0 1 0"/>
                                    </filter>
                                </defs>

                                {/* Background Image with Dynamic Filter */}
                                <image
                                    href={pressStationImageUrl}
                                    width="2620"
                                    x="-350"
                                    y="-30"
                                    className="som-station-bg-image"
                                />

                                {/* MAIN STEAM PIPE */}
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

                                {/* --- MAINTENANCE DIAGNOSTIC OVERLAYS --- */}
                                {viewMode === 'maintenance' && (
                                    <>
                                        <rect x="-350" y="-55" width="2620" height="1150" fill="url(#diagGrid)" className="som-diag-grid" />

                                        {/* Standardized CSS Scanline */}
                                        <foreignObject x="-350" y="-55" width="2620" height="1150" style={{ pointerEvents: 'none' }}>
                                            <div className="som-diag-scanline"></div>
                                        </foreignObject>
                                    </>
                                )}

                                {/* --- ANIMATED TANK LIQUID LEVELS --- */}
                                {/* Water Tank */}
                                <defs>
                                    <clipPath id="waterTankClip">
                                        <rect x="1750" y="20" width="400" height="230" />
                                    </clipPath>
                                </defs>
                                <image
                                    href={waterGifUrl}
                                    preserveAspectRatio="none"
                                    x="1680"
                                    y={20}
                                    width="468"
                                    height={230}
                                    opacity="0.65"
                                    clipPath="url(#waterTankClip)"
                                    style={{ filter: viewMode === 'maintenance' ? 'drop-shadow(0 0 15px rgba(0, 150, 255, 0.4))' : 'none' }}
                                />

                                {/* Condensate Tank */}
                                <defs>
                                    <clipPath id="condensateTankClip">
                                        <rect x="1750" y="340" width="400" height="230" />
                                    </clipPath>
                                </defs>
                                <image
                                    href={waterGifUrl}
                                    preserveAspectRatio="none"
                                    x="1680"
                                    y={335}
                                    width="520"
                                    height={270 * (96 / 100)}
                                    opacity="0.65"
                                    clipPath="url(#condensateTankClip)"
                                    style={{
                                        filter: viewMode === 'maintenance'
                                            ? 'hue-rotate(180deg) brightness(1.2) sepia(0.3) drop-shadow(0 0 15px rgba(255, 100, 0, 0.4))'
                                            : 'hue-rotate(180deg) brightness(0.9) sepia(0.3)'
                                    }}
                                />

                                {/* --- HUD DIAGNOSTIC BANNER --- */}
                                {viewMode === 'maintenance' && (
                                    <foreignObject x="360" y="10" width="1200" height="120" style={{ overflow: 'visible' }}>
                                        <div className="som-diagnostic-banner">
                                            TECHNICAL DIAGNOSTIC ACTIVE
                                        </div>
                                    </foreignObject>
                                )}

                                {/* --- MAIN FLOWS --- */}
                                <LiquidFlowSVG d={"M 2177 501 L 2198 507 L 2215 522 L 2225 551 L 2222 584 L 2220 931 L 2210 972 L 2174 994 L 2133 996 L 2044 994 L 1791 994 L 1692 994 L 1656 996 L 1622 977 L 1608 950 L 1613 360 L 1615 322 L 1606 290 L 1577 276 L 1488 276 M 1319 281 L 1052 283 M 881 281 L 575 281 M 406 278 L 110 278 M -64 278 L -191 281"} isRunning={true} flowing={true} mode="dotted" color="#da8c62ff" thickness={18} />

                                {/* Steam CV & Disch PV Flow */}
                                <LiquidFlowSVG d={"M -127 323 L -128 565 L -120 583 L -103 592"} isRunning={true} flowing={true} mode="dotted" color="#da8c62ff" thickness={18} />
                                <LiquidFlowSVG d={"M 341 323 L 339 551 L 348 584 L 370 592"} isRunning={true} flowing={true} mode="dotted" color="#da8c62ff" thickness={18} />
                                <LiquidFlowSVG d={"M 816 323 L 816 401"} isRunning={true} flowing={true} mode="dotted" color="#da8c62ff" thickness={18} />
                                <LiquidFlowSVG d={"M 1256 323 L 1256 401"} isRunning={true} flowing={true} mode="dotted" color="#da8c62ff" thickness={18} />

                                {/* Press Discharge Flows */}
                                <LiquidFlowSVG
                                    d={"M 476 676 Q 473 780, 473 873 Q 473 885, 473 890 Q 250 888, -4 888 M 1 676 Q 0 780, -1 871 Q -1 880, -1 888 Q -150 888, -350 888"}
                                    isRunning={true}
                                    flowing={true}
                                    mode="dotted"
                                    color="#da8c62ff"
                                    thickness={18}
                                    curved={true}
                                />

                                {/* Water Tank Flow */}
                                <LiquidFlowSVG
                                    d="M 2175 176 L 2195 175 L 2220 193 L 2220 425 L 2198 450 L 2178 450"
                                    isRunning={true}
                                    mode="dotted"
                                    color={"#bae6fd"}
                                />

                                {/* --- ICONS --- */}
                                <EquipmentIconSVG x={1650} y={40} icon={motorSvg} isRunning={pressStatus.fruitDist.amp > 0.0} scaleX={-1} size={120} />
                                <EquipmentIconSVG x={1660} y={210} icon={motorSvg} isRunning={pressStatus.fruitDist.amp > 0.0} scaleX={-1} size={120} />
                                <EquipmentIconSVG x={-10} y={140} icon={motorSvg} isRunning={pressStatus.digester[0].amp > 0.0} rotation={270} size={130} />
                                <EquipmentIconSVG x={455} y={140} icon={motorSvg} isRunning={pressStatus.digester[1].amp > 0.0} rotation={270} size={130} />
                                <EquipmentIconSVG x={930} y={140} icon={motorSvg} isRunning={pressStatus.digester[2].amp > 0.0} rotation={270} size={130} />
                                <EquipmentIconSVG x={1365} y={140} icon={motorSvg} isRunning={pressStatus.digester[3].amp > 0.0} rotation={270} size={130} />

                                <EquipmentIconSVG x={145} y={728} icon={motorCrookedSvg} isRunning={pressStatus.press[0].run} size={65} />
                                <EquipmentIconSVG x={618} y={728} icon={motorCrookedSvg} isRunning={pressStatus.press[1].run} size={65} />
                                <EquipmentIconSVG x={1095} y={728} icon={motorCrookedSvg} isRunning={pressStatus.press[2].run} size={65} />
                                <EquipmentIconSVG x={1545} y={728} icon={motorCrookedSvg} isRunning={pressStatus.press[3].run} size={65} />

                                <EquipmentIconSVG x={-250} y={1010} icon={motorSvg} isRunning={pressStatus.cakeBreaker.run} size={110} />

                                <EquipmentIconSVG x={-150} y={438} icon={valvePneumaticSvg} isRunning={parseFloat("45.2") > 0} size={115} />
                                <EquipmentIconSVG x={317} y={440} icon={valvePneumaticSvg} isRunning={parseFloat("42.8") > 0} size={115} />
                                <EquipmentIconSVG x={793} y={439} icon={valvePneumaticSvg} isRunning={parseFloat("0.0") > 0} size={115} />
                                <EquipmentIconSVG x={1232} y={438} icon={valvePneumaticSvg} isRunning={parseFloat("0.0") > 0} size={115} />
                                <EquipmentIconSVG x={1652} y={547} icon={flowmeterSvg} isRunning={false} size={143} />
                                <EquipmentIconSVG x={1920} y={912} icon={valveControlSvg} isRunning={parseFloat("0.0") > 0} size={280} />

                                {/* --- VALVE PRESS --- */}
                                <g transform="translate(-20, 775) rotate(180)">
                                    <EquipmentIconSVG x={-40} y={0} icon={valvePneumaticSvg} isRunning={parseFloat("75.2") > 0} size={100} />
                                </g>
                                <g transform="translate(473, 790) rotate(180)">
                                    <EquipmentIconSVG x={-20} y={0} icon={valvePneumaticSvg} isRunning={parseFloat("70.8") > 0} size={100} />
                                </g>
                                <g transform="translate(953, 787) rotate(180)">
                                    <EquipmentIconSVG x={-20} y={0} icon={valvePneumaticSvg} isRunning={parseFloat("0.0") > 0} size={100} />
                                </g>
                                <g transform="translate(1391, 783) rotate(180)">
                                    <EquipmentIconSVG x={-20} y={-10} icon={valvePneumaticSvg} isRunning={parseFloat("0.0") > 0} size={100} />
                                </g>

                                {/* --- CARDS (PROCESS VS MAINTENANCE) --- */}
                                {viewMode === 'process' ? (
                                    <g>
                                        {/* Digesters */}
                                        <IpomasMonitorCardSVG x={-168} y={100} id="dig1" title="DIGESTER NO.1" isManual={true} params={[{ label: 'LOAD', value: Number(pressStatus.digester[0].amp || 0).toFixed(1), unit: 'A' }, { label: 'LEVEL', value: Number(pressStatus.digester[0].level || 0).toFixed(1), unit: '%' }, { label: 'TEMP', value: Number(pressStatus.digester[0].temp || 0).toFixed(1), unit: '°C' }]} onClick={handleEquipmentClick} />
                                        <IpomasMonitorCardSVG x={300} y={100} id="dig2" title="DIGESTER NO.2" isManual={true} params={[{ label: 'LOAD', value: Number(pressStatus.digester[1].amp || 0).toFixed(1), unit: 'A' }, { label: 'LEVEL', value: Number(pressStatus.digester[1].level || 0).toFixed(1), unit: '%' }, { label: 'TEMP', value: Number(pressStatus.digester[1].temp || 0).toFixed(1), unit: '°C' }]} onClick={handleEquipmentClick} />
                                        <IpomasMonitorCardSVG x={748} y={100} id="dig3" title="DIGESTER NO.3" isManual={true} params={[{ label: 'LOAD', value: Number(pressStatus.digester[2].amp || 0).toFixed(1), unit: 'A' }, { label: 'LEVEL', value: Number(pressStatus.digester[2].level || 0).toFixed(1), unit: '%' }, { label: 'TEMP', value: Number(pressStatus.digester[2].temp || 0).toFixed(1), unit: '°C' }]} onClick={handleEquipmentClick} />
                                        <IpomasMonitorCardSVG x={1165} y={100} id="dig4" title="DIGESTER NO.4" isManual={true} params={[{ label: 'LOAD', value: Number(pressStatus.digester[3].amp || 0).toFixed(1), unit: 'A' }, { label: 'LEVEL', value: Number(pressStatus.digester[3].level || 0).toFixed(1), unit: '%' }, { label: 'TEMP', value: Number(pressStatus.digester[3].temp || 0).toFixed(1), unit: '°C' }]} onClick={handleEquipmentClick} />

                                        {/* STEAM CVs */}
                                        <IpomasMonitorCardSVG x={-280} y={450} id="tc1" title="STEAM CV" isManual={true} singleValue="45.2" singleUnit="%" width={90} onClick={handleEquipmentClick} />
                                        <IpomasMonitorCardSVG x={205} y={450} id="tc2" title="STEAM CV" isManual={true} singleValue="42.8" singleUnit="%" width={90} onClick={handleEquipmentClick} />
                                        <IpomasMonitorCardSVG x={680} y={450} id="tc3" title="STEAM CV" isManual={true} singleValue="0.0" singleUnit="%" width={90} onClick={handleEquipmentClick} />
                                        <IpomasMonitorCardSVG x={1130} y={450} id="tc4" title="STEAM CV" isManual={true} singleValue="0.0" singleUnit="%" width={90} onClick={handleEquipmentClick} />

                                        {/* DISCH PV */}
                                        <IpomasMonitorCardSVG x={35} y={450} id="dc1" title="DISCH PV" isManual={true} singleValue="32" singleUnit="%" width={90} onClick={handleEquipmentClick} />
                                        <IpomasMonitorCardSVG x={505} y={450} id="dc2" title="DISCH PV" isManual={true} singleValue="28" singleUnit="%" width={90} onClick={handleEquipmentClick} />
                                        <IpomasMonitorCardSVG x={975} y={450} id="dc3" title="DISCH PV" isManual={true} singleValue="0" singleUnit="%" width={90} onClick={handleEquipmentClick} />
                                        <IpomasMonitorCardSVG x={1415} y={450} id="dc4" title="DISCH PV" isManual={true} singleValue="0" singleUnit="%" width={90} onClick={handleEquipmentClick} />

                                        {/* Presses */}
                                        <IpomasMonitorCardSVG x={-83.5} y={685} id="prs1" title="PRESS NO.1" isManual={true} params={[{ label: 'PRESS AMP', value: Number(pressStatus.press[0].amp || 0).toFixed(1), unit: 'A' }, { label: 'LOAD', value: '75.2', unit: '%' }, { label: 'PRESS.DBG', value: Number(pressStatus.press[0].pressure || 0).toFixed(1), unit: 'Bar' }]} onClick={handleEquipmentClick} />
                                        <IpomasMonitorCardSVG x={390.5} y={685} id="prs2" title="PRESS NO.2" isManual={true} params={[{ label: 'PRESS AMP', value: Number(pressStatus.press[1].amp || 0).toFixed(1), unit: 'A' }, { label: 'LOAD', value: '70.8', unit: '%' }, { label: 'PRESS.DBG', value: Number(pressStatus.press[1].pressure || 0).toFixed(1), unit: 'Bar' }]} onClick={handleEquipmentClick} />
                                        <IpomasMonitorCardSVG x={870} y={685} id="prs3" title="PRESS NO.3" isManual={true} params={[{ label: 'PRESS AMP', value: Number(pressStatus.press[2].amp || 0).toFixed(1), unit: 'A' }, { label: 'LOAD', value: '0.0', unit: '%' }, { label: 'PRESS.DBG', value: Number(pressStatus.press[2].pressure || 0).toFixed(1), unit: 'Bar' }]} onClick={handleEquipmentClick} />
                                        <IpomasMonitorCardSVG x={1309} y={685} id="prs4" title="PRESS NO.4" isManual={true} params={[{ label: 'PRESS AMP', value: Number(pressStatus.press[3].amp || 0).toFixed(1), unit: 'A' }, { label: 'LOAD', value: '0.0', unit: '%' }, { label: 'PRESS.DBG', value: Number(pressStatus.press[3].pressure || 0).toFixed(1), unit: 'Bar' }]} onClick={handleEquipmentClick} />

                                        {/* Standalone Variables */}
                                        <IpomasMonitorCardSVG x={1520} y={45} id="fd1" title="FRUIT DIST" singleValue={Number(pressStatus.fruitDist.amp || 30).toFixed(1)} singleUnit="A" width={110} onClick={handleEquipmentClick} />
                                        <IpomasMonitorCardSVG x={1550} y={215} id="fd1" title="RETURN CONVEYOR" singleValue={Number(pressStatus.fruitDist.amp || 30).toFixed(1)} singleUnit="A" width={110} onClick={handleEquipmentClick} />
                                        <IpomasMonitorCardSVG x={-130} y={1015} id="cbc1" title="CAKE BREAKER" singleValue={Number(pressStatus.cakeBreaker.amp || 30).toFixed(1)} singleUnit="A" width={120} onClick={handleEquipmentClick} />
                                        <IpomasMonitorCardSVG x={1710} y={650} id="flow" title="FLOWRATE" singleValue={Number(pressStatus.dilution.flow || 0).toFixed(1)} singleUnit="M3/H" width={110} onClick={handleEquipmentClick} />
                                        <IpomasMonitorCardSVG x={1800} y={855} id="vcv" title="VALVE CV" singleValue={pressStatus.dilution.cv.toFixed(0)} singleUnit="%" width={90} onClick={handleEquipmentClick} />
                                        <IpomasMonitorCardSVG x={2070} y={80} id="w_lvl" title="WATER LEVEL" singleValue={pressStatus.dilution.waterLevel.toFixed(1)} singleUnit="%" width={120} onClick={handleEquipmentClick} />
                                        <IpomasMonitorCardSVG x={2070} y={400} id="c_lvl" title="COND. LEVEL" singleValue={pressStatus.dilution.condLevel.toFixed(1)} singleUnit="%" width={120} onClick={handleEquipmentClick} />
                                    </g>
                                ) : (
                                    <g>
                                        {/* Maintenance Cards for Digesters */}
                                        <MaintenanceCardSVG x={-100} y={175} id="m-dig1" label="M-DIG_1" params={[{ label: 'AMP', value: pressStatus.digester[0].amp.toFixed(1), unit: 'A' }, { label: 'LVL', value: pressStatus.digester[0].level.toFixed(1), unit: '%' }]} onClick={handleEquipmentClick} />
                                        <MaintenanceCardSVG x={325} y={175} id="m-dig2" label="M-DIG_2" params={[{ label: 'AMP', value: pressStatus.digester[1].amp.toFixed(1), unit: 'A' }, { label: 'LVL', value: pressStatus.digester[1].level.toFixed(1), unit: '%' }]} onClick={handleEquipmentClick} />
                                        <MaintenanceCardSVG x={755} y={175} id="m-dig3" label="M-DIG_3" params={[{ label: 'AMP', value: pressStatus.digester[2].amp.toFixed(1), unit: 'A' }, { label: 'LVL', value: pressStatus.digester[2].level.toFixed(1), unit: '%' }]} onClick={handleEquipmentClick} />
                                        <MaintenanceCardSVG x={1155} y={175} id="m-dig4" label="M-DIG_4" params={[{ label: 'AMP', value: pressStatus.digester[3].amp.toFixed(1), unit: 'A' }, { label: 'LVL', value: pressStatus.digester[3].level.toFixed(1), unit: '%' }]} onClick={handleEquipmentClick} />

                                        {/* Maintenance Cards for Presses */}
                                        <MaintenanceCardSVG x={-60} y={650} id="m-prs1" label="M-PRS_1" params={[{ label: 'AMP', value: pressStatus.press[0].amp.toFixed(1), unit: 'A' }, { label: 'BAR', value: pressStatus.press[0].pressure.toFixed(1), unit: 'Bar' }]} onClick={handleEquipmentClick} />
                                        <MaintenanceCardSVG x={365} y={650} id="m-prs2" label="M-PRS_2" params={[{ label: 'AMP', value: pressStatus.press[1].amp.toFixed(1), unit: 'A' }, { label: 'BAR', value: pressStatus.press[1].pressure.toFixed(1), unit: 'Bar' }]} onClick={handleEquipmentClick} />
                                        <MaintenanceCardSVG x={795} y={650} id="m-prs3" label="M-PRS_3" params={[{ label: 'AMP', value: pressStatus.press[2].amp.toFixed(1), unit: 'A' }, { label: 'BAR', value: pressStatus.press[2].pressure.toFixed(1), unit: 'Bar' }]} onClick={handleEquipmentClick} />
                                        <MaintenanceCardSVG x={1195} y={650} id="m-prs4" label="M-PRS_4" params={[{ label: 'AMP', value: pressStatus.press[3].amp.toFixed(1), unit: 'A' }, { label: 'BAR', value: pressStatus.press[3].pressure.toFixed(1), unit: 'Bar' }]} onClick={handleEquipmentClick} />
                                    </g>
                                )}

                            </svg>
                        </div>
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

export default PressStationPage;