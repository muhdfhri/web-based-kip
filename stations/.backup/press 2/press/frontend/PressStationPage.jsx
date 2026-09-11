import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import usePlcStore from '@core/store'
import './PressStationPage.css'
import { CrosshairOverlay } from "./components/CoordinatePicker.jsx"
import PressStationSettingsPage from './settings/PressStationSettingsPage.jsx'
import DigesterPressTab from './tabs/DigesterPress/DigesterPressTab.jsx'
import WaterDilutionTab from './tabs/WaterDilution/WaterDilutionTab.jsx'
import motorSvg from './assets/item/motor.svg'
import valveSvg from './assets/item/valve_pneumatic_actuator.svg'
import flowmeterSvg from './assets/item/flowmeter.svg'
import motorCrookedSvg from './assets/item/motor_crooked.svg'
import valveControlSvg from './assets/item/valve_control.svg'
import waterGif from './assets/water.gif'
import { useWTFlowBuilder, WTFlowPanel } from './components/WTFlowBuilder.jsx'

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
    const [showSettings, setShowSettings] = useState(false)
    const [activeTab, setActiveTab] = useState('digester-press')
    const svgRef = useRef(null)

    const [canvasScale, setCanvasScale] = useState(1);
    const canvasContainerRef = useRef(null);

    useEffect(() => {
        const updateScale = () => {
            if (!canvasContainerRef.current) return;
            const container = canvasContainerRef.current.parentElement;
            if (!container) return;
            const { clientWidth, clientHeight } = container;
            const targetW = activeTab === 'digester-press' ? 1485 : 720;
            const targetH = activeTab === 'digester-press' ? 585 : 375;

            const scaleX = clientWidth / targetW;
            const scaleY = clientHeight / targetH;
            const scale = Math.min(scaleX, scaleY);
            setCanvasScale(scale);
        };

        const resizeObserver = new ResizeObserver(updateScale);
        if (canvasContainerRef.current && canvasContainerRef.current.parentElement) {
            resizeObserver.observe(canvasContainerRef.current.parentElement);
        }
        updateScale();

        return () => resizeObserver.disconnect();
    }, [activeTab]);

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
    const flowBuilder = useWTFlowBuilder();
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
        const role = user?.userRole?.toLowerCase() || user?.role?.toLowerCase();
        const isDev = role === 'developer' || role === 'dev';
        if (!isDev) return;

        const onKeyDown = (e) => {
            if (e.ctrlKey && e.key === 'x') {
                e.preventDefault();
                setConfigMode(prev => !prev);
            }
            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
                flowBuilder.toggle();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [user, flowBuilder]);

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
        const entry = liveValues[tagName];
        if (entry !== undefined) {
            if (entry !== null && typeof entry === "object" && entry.value !== undefined) {
                return entry.value;
            }
            return entry;
        }
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

    const handleEquipmentClick = (id, subs = [], signals = null) => {
        const role = user?.userRole?.toLowerCase() || user?.role?.toLowerCase();
        const isDev = role === 'developer' || role === 'dev';

        console.log(`[DEBUG] handleEquipmentClick dipanggil untuk ID: ${id}`);
        console.log(`[DEBUG] State saat ini -> configMode: ${configMode}, isDev: ${isDev}, role: ${role}`);

        if (isDev || configMode) {
            console.log(`[DEBUG] Membuka modal PLC Config untuk: ${id} dengan sinyal:`, signals);
            handleTagEditRequest(id, subs, signals);
            return;
        }

        console.log(`[DEBUG] Gagal membuka modal. Anda bukan developer.`);
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

    if (showSettings) {
        return (
            <PressStationSettingsPage
                onClose={() => setShowSettings(false)}
                onSelectSubmenu={onSelectSubmenu}
                configMode={configMode}
                handleEquipmentClick={handleEquipmentClick}
                tagMap={tagMap}
            />
        );
    }

    return (
        <section className={`som-press-station som-mode-${viewMode} ${configMode ? 'som-config-active' : ''}`}>
            <header className="som-press-station-header">
                <div className="som-header-left">
                    <h1 className="som-press-station-title">PRESS STATION</h1>

                    <div className="som-station-tabs">
                        <button
                            className={`som-station-tab ${activeTab === 'digester-press' ? 'active' : ''}`}
                            onClick={() => setActiveTab('digester-press')}
                        >
                            Digester & Press
                        </button>
                        <button
                            className={`som-station-tab ${activeTab === 'water-dilution' ? 'active' : ''}`}
                            onClick={() => setActiveTab('water-dilution')}
                        >
                            Water Dilution
                        </button>
                    </div>
                </div>

                <div className="som-view-toggle-container" style={{ marginLeft: 'auto' }}>
                    <button className={`som-view-btn ${viewMode === 'process' ? 'active' : ''}`} onClick={() => setViewMode('process')}>PROCESS VIEW</button>
                    <button className="som-view-btn" disabled style={{ cursor: 'not-allowed', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        MAINTENANCE VIEW
                        <svg width="10" height="12" viewBox="0 0 448 512" fill="currentColor" style={{ marginLeft: '4px' }}><path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z" /></svg>
                    </button>
                    {onSelectSubmenu && (
                        <button className="som-view-btn" onClick={() => setShowSettings(true)} style={{ marginLeft: '8px' }}>⚙️ SETTINGS</button>
                    )}
                </div>
            </header>

            <div className="som-press-main">
                <div className="som-press-layout">
                    <div className="som-press-flow-card" style={{ position: 'relative' }}>
                        {/* SVG Tinting Filters (feColorMatrix) */}
                        <svg width="0" height="0" style={{ position: 'absolute' }}>
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
                                <filter id="tint-brown" colorInterpolationFilters="sRGB">
                                    <feColorMatrix type="matrix" values="
                                        0.186 0.626 0.063 0 0
                                        0.132 0.443 0.045 0 0
                                        0.106 0.356 0.036 0 0
                                        0 0 0 1 0" />
                                </filter>
                            </defs>
                        </svg>
                        <div className="som-press-flow-body">
                            <div
                                ref={canvasContainerRef}
                                style={{
                                    position: 'relative',
                                    width: activeTab === 'digester-press' ? 1485 : 720,
                                    height: activeTab === 'digester-press' ? 585 : 375,
                                    transform: `scale(${canvasScale})`,
                                    transformOrigin: 'center center'
                                }}
                            >
                                {activeTab === 'digester-press' ? (
                                    <DigesterPressTab
                                        viewMode={viewMode}
                                        pressStatus={pressStatus}
                                        configMode={configMode}
                                        handleEquipmentClick={handleEquipmentClick}
                                        lv={lv}
                                        getTag={getTag}
                                        flowBuilder={flowBuilder}
                                    />
                                ) : (
                                    <WaterDilutionTab
                                        viewMode={viewMode}
                                        pressStatus={pressStatus}
                                        configMode={configMode}
                                        handleEquipmentClick={handleEquipmentClick}
                                        lv={lv}
                                        getTag={getTag}
                                        flowBuilder={flowBuilder}
                                    />
                                )}
                                {activeTab === 'digester-press' && (
                                    <>
                                        <DraggableCard id="fd1" onClick={(id) => handleEquipmentClick(id, [], ['AMP'])} title="FRUIT DIST" badge="MANUAL" initialX={290} initialY={10} scale={0.45} data={[{ label: 'AMP', value: lv('fd1', 'AMP', '0'), unit: 'A', color: parseFloat(lv('fd1', 'AMP', '0')) > 0 ? 'green' : 'red' }]} canvasScale={canvasScale} />
                                        <DraggableCard id="retconv" onClick={(id) => handleEquipmentClick(id, [], ['AMP'])} title="RETURN CONV" badge="MANUAL" initialX={275} initialY={80} scale={0.45} data={[{ label: 'AMP', value: lv('retconv', 'AMP', '0'), unit: 'A', color: parseFloat(lv('retconv', 'AMP', '0')) > 0 ? 'green' : 'red' }]} canvasScale={canvasScale} />
                                        <DraggableCard id="botconv" onClick={(id) => handleEquipmentClick(id, [], ['AMP'])} title="BOTTOM CONV" badge="MANUAL" initialX={280} initialY={537} scale={0.45} data={[{ label: 'AMP', value: lv('botconv', 'AMP', '0'), unit: 'A', color: parseFloat(lv('botconv', 'AMP', '0')) > 0 ? 'green' : 'red' }]} canvasScale={canvasScale} />
                                        <DraggableCard id="dig1" onClick={(id) => handleEquipmentClick(id, [], ['LOAD', 'LEVEL', 'TEMP'])} title="DIGESTER NO.1" badge="MANUAL" initialX={415} initialY={45} scale={0.65} data={[{ label: 'LOAD', value: lv('dig1', 'LOAD', '0.0'), unit: 'A', color: parseFloat(lv('dig1', 'LOAD', '0.0')) > 0 ? 'green' : 'red' }, { label: 'LEVEL', value: lv('dig1', 'LEVEL', '0.0'), unit: '%', color: parseFloat(lv('dig1', 'LEVEL', '0.0')) > 0 ? 'green' : 'red' }, { label: 'TEMP', value: lv('dig1', 'TEMP', '0.0'), unit: '°C', color: parseFloat(lv('dig1', 'TEMP', '0.0')) > 0 ? 'green' : 'red' }]} canvasScale={canvasScale} />
                                        <DraggableCard id="dig2" onClick={(id) => handleEquipmentClick(id, [], ['LOAD', 'LEVEL', 'TEMP'])} title="DIGESTER NO.2" badge="MANUAL" initialX={700} initialY={45} scale={0.65} data={[{ label: 'LOAD', value: lv('dig2', 'LOAD', '0.0'), unit: 'A', color: parseFloat(lv('dig2', 'LOAD', '0.0')) > 0 ? 'green' : 'red' }, { label: 'LEVEL', value: lv('dig2', 'LEVEL', '0.0'), unit: '%', color: parseFloat(lv('dig2', 'LEVEL', '0.0')) > 0 ? 'green' : 'red' }, { label: 'TEMP', value: lv('dig2', 'TEMP', '0.0'), unit: '°C', color: parseFloat(lv('dig2', 'TEMP', '0.0')) > 0 ? 'green' : 'red' }]} canvasScale={canvasScale} />
                                        <DraggableCard id="dig3" onClick={(id) => handleEquipmentClick(id, [], ['LOAD', 'LEVEL', 'TEMP'])} title="DIGESTER NO.3" badge="MANUAL" initialX={980} initialY={45} scale={0.65} data={[{ label: 'LOAD', value: lv('dig3', 'LOAD', '0.0'), unit: 'A', color: parseFloat(lv('dig3', 'LOAD', '0.0')) > 0 ? 'green' : 'red' }, { label: 'LEVEL', value: lv('dig3', 'LEVEL', '0.0'), unit: '%', color: parseFloat(lv('dig3', 'LEVEL', '0.0')) > 0 ? 'green' : 'red' }, { label: 'TEMP', value: lv('dig3', 'TEMP', '0.0'), unit: '°C', color: parseFloat(lv('dig3', 'TEMP', '0.0')) > 0 ? 'green' : 'red' }]} canvasScale={canvasScale} />
                                        <DraggableCard id="dig4" onClick={(id) => handleEquipmentClick(id, [], ['LOAD', 'LEVEL', 'TEMP'])} title="DIGESTER NO.4" badge="MANUAL" initialX={1260} initialY={45} scale={0.65} data={[{ label: 'LOAD', value: lv('dig4', 'LOAD', '0.0'), unit: 'A', color: parseFloat(lv('dig4', 'LOAD', '0.0')) > 0 ? 'green' : 'red' }, { label: 'LEVEL', value: lv('dig4', 'LEVEL', '0.0'), unit: '%', color: parseFloat(lv('dig4', 'LEVEL', '0.0')) > 0 ? 'green' : 'red' }, { label: 'TEMP', value: lv('dig4', 'TEMP', '0.0'), unit: '°C', color: parseFloat(lv('dig4', 'TEMP', '0.0')) > 0 ? 'green' : 'red' }]} canvasScale={canvasScale} />
                                        <DraggableCard id="prs1" onClick={(id) => handleEquipmentClick(id, [], ['AMP', 'LOAD', 'PRES'])} title="PRESS NO.1" badge="MANUAL" initialX={280} initialY={360} scale={0.65} data={[{ label: 'PRESS AMP', value: lv('prs1', 'AMP', '0.0'), unit: 'A', color: parseFloat(lv('prs1', 'AMP', '0.0')) > 0 ? 'green' : 'red' }, { label: 'LOAD', value: lv('prs1', 'LOAD', '75.2'), unit: '%', color: parseFloat(lv('prs1', 'LOAD', '75.2')) > 0 ? 'green' : 'red' }, { label: 'PRESS.DISC', value: lv('prs1', 'PRES', '0.0'), unit: 'Bar', color: parseFloat(lv('prs1', 'PRES', '0.0')) > 0 ? 'green' : 'red' }]} canvasScale={canvasScale} />
                                        <DraggableCard id="prs2" onClick={(id) => handleEquipmentClick(id, [], ['AMP', 'LOAD', 'PRES'])} title="PRESS NO.2" badge="MANUAL" initialX={550} initialY={360} scale={0.65} data={[{ label: 'PRESS AMP', value: lv('prs2', 'AMP', '0.0'), unit: 'A', color: parseFloat(lv('prs2', 'AMP', '0.0')) > 0 ? 'green' : 'red' }, { label: 'LOAD', value: lv('prs2', 'LOAD', '75.2'), unit: '%', color: parseFloat(lv('prs2', 'LOAD', '75.2')) > 0 ? 'green' : 'red' }, { label: 'PRESS.DISC', value: lv('prs2', 'PRES', '0.0'), unit: 'Bar', color: parseFloat(lv('prs2', 'PRES', '0.0')) > 0 ? 'green' : 'red' }]} canvasScale={canvasScale} />
                                        <DraggableCard id="prs3" onClick={(id) => handleEquipmentClick(id, [], ['AMP', 'LOAD', 'PRES'])} title="PRESS NO.3" badge="MANUAL" initialX={820} initialY={360} scale={0.65} data={[{ label: 'PRESS AMP', value: lv('prs3', 'AMP', '0.0'), unit: 'A', color: parseFloat(lv('prs3', 'AMP', '0.0')) > 0 ? 'green' : 'red' }, { label: 'LOAD', value: lv('prs3', 'LOAD', '75.2'), unit: '%', color: parseFloat(lv('prs3', 'LOAD', '75.2')) > 0 ? 'green' : 'red' }, { label: 'PRESS.DISC', value: lv('prs3', 'PRES', '0.0'), unit: 'Bar', color: parseFloat(lv('prs3', 'PRES', '0.0')) > 0 ? 'green' : 'red' }]} canvasScale={canvasScale} />
                                        <DraggableCard id="prs4" onClick={(id) => handleEquipmentClick(id, [], ['AMP', 'LOAD', 'PRES'])} title="PRESS NO.4" badge="MANUAL" initialX={1110} initialY={360} scale={0.65} data={[{ label: 'PRESS AMP', value: lv('prs4', 'AMP', '0.0'), unit: 'A', color: parseFloat(lv('prs4', 'AMP', '0.0')) > 0 ? 'green' : 'red' }, { label: 'LOAD', value: lv('prs4', 'LOAD', '75.2'), unit: '%', color: parseFloat(lv('prs4', 'LOAD', '75.2')) > 0 ? 'green' : 'red' }, { label: 'PRESS.DISC', value: lv('prs4', 'PRES', '0.0'), unit: 'Bar', color: parseFloat(lv('prs4', 'PRES', '0.0')) > 0 ? 'green' : 'red' }]} canvasScale={canvasScale} />

                                        <DraggableCard id="dc1" onClick={(id) => handleEquipmentClick(id, [], ['CV'])} title="DISCH PV 1" badge="MANUAL" initialX={370} initialY={250} scale={0.45} data={[{ label: 'DISCH PV', value: lv('dc1', 'CV', '32'), unit: '%', color: parseFloat(lv('dc1', 'CV', '32')) > 0 ? 'green' : 'red' }]} canvasScale={canvasScale} />
                                        <DraggableCard id="dc2" onClick={(id) => handleEquipmentClick(id, [], ['CV'])} title="DISCH PV 2" badge="MANUAL" initialX={635} initialY={250} scale={0.55} data={[{ label: 'DISCH PV', value: lv('dc2', 'CV', '28'), unit: '%', color: parseFloat(lv('dc2', 'CV', '28')) > 0 ? 'green' : 'red' }]} canvasScale={canvasScale} />
                                        <DraggableCard id="dc3" onClick={(id) => handleEquipmentClick(id, [], ['CV'])} title="DISCH PV 3" badge="MANUAL" initialX={910} initialY={250} scale={0.55} data={[{ label: 'DISCH PV', value: lv('dc3', 'CV', '0'), unit: '%', color: parseFloat(lv('dc3', 'CV', '0')) > 0 ? 'green' : 'red' }]} canvasScale={canvasScale} />
                                        <DraggableCard id="dc4" onClick={(id) => handleEquipmentClick(id, [], ['CV'])} title="DISCH PV 4" badge="MANUAL" initialX={1180} initialY={250} scale={0.55} data={[{ label: 'DISCH PV', value: lv('dc4', 'CV', '0'), unit: '%', color: parseFloat(lv('dc4', 'CV', '0')) > 0 ? 'green' : 'red' }]} canvasScale={canvasScale} />

                                        <DraggableCard id="tc1" onClick={(id) => handleEquipmentClick(id, [], ['CV'])} title="STEAM CV 1" badge="MANUAL" initialX={215} initialY={250} scale={0.45} data={[{ label: 'STEAM CV', value: lv('tc1', 'CV', '45.2'), unit: '%', color: parseFloat(lv('tc1', 'CV', '45.2')) > 0 ? 'green' : 'red' }]} canvasScale={canvasScale} />
                                        <DraggableCard id="tc2" onClick={(id) => handleEquipmentClick(id, [], ['CV'])} title="STEAM CV 2" badge="MANUAL" initialX={480} initialY={250} scale={0.55} data={[{ label: 'STEAM CV', value: lv('tc2', 'CV', '42.8'), unit: '%', color: parseFloat(lv('tc2', 'CV', '42.8')) > 0 ? 'green' : 'red' }]} canvasScale={canvasScale} />
                                        <DraggableCard id="tc3" onClick={(id) => handleEquipmentClick(id, [], ['CV'])} title="STEAM CV 3" badge="MANUAL" initialX={760} initialY={250} scale={0.55} data={[{ label: 'STEAM CV', value: lv('tc3', 'CV', '0.0'), unit: '%', color: parseFloat(lv('tc3', 'CV', '0.0')) > 0 ? 'green' : 'red' }]} canvasScale={canvasScale} />
                                        <DraggableCard id="tc4" onClick={(id) => handleEquipmentClick(id, [], ['CV'])} title="STEAM CV 4" badge="MANUAL" initialX={1040} initialY={250} scale={0.55} data={[{ label: 'STEAM CV', value: lv('tc4', 'CV', '0.0'), unit: '%', color: parseFloat(lv('tc4', 'CV', '0.0')) > 0 ? 'green' : 'red' }]} canvasScale={canvasScale} />

                                        <DraggableMotor initialX={200} initialY={525} scale={0.6} isRunning={parseFloat(lv('botconv', 'AMP', '0')) > 0} canvasScale={canvasScale} />
                                        <DraggableMotor initialX={328} initialY={77} initialRotation={270} isRunning={parseFloat(lv('dig1', 'LOAD', '0')) > 0} canvasScale={canvasScale} />
                                        <DraggableMotor initialX={610} initialY={77} initialRotation={270} isRunning={parseFloat(lv('dig2', 'LOAD', '0')) > 0} canvasScale={canvasScale} />
                                        <DraggableMotor initialX={890} initialY={77} initialRotation={270} isRunning={parseFloat(lv('dig3', 'LOAD', '0')) > 0} canvasScale={canvasScale} />
                                        <DraggableMotor initialX={1170} initialY={77} initialRotation={270} isRunning={parseFloat(lv('dig4', 'LOAD', '0')) > 0} canvasScale={canvasScale} />
                                        <DraggableMotor initialX={200} initialY={0} initialRotation={360} scale={0.6} isRunning={parseFloat(lv('fd1', 'AMP', '0')) > 0} canvasScale={canvasScale} />
                                        <DraggableMotor initialX={200} initialY={68} initialRotation={360} scale={0.6} isRunning={parseFloat(lv('retconv', 'AMP', '0')) > 0} canvasScale={canvasScale} />

                                        <DraggableValve initialX={270} initialY={240} scale={0.8} isRunning={parseFloat(lv('tc1', 'CV', '0')) > 0} canvasScale={canvasScale} />
                                        <DraggableValve initialX={550} initialY={240} scale={0.8} isRunning={parseFloat(lv('tc2', 'CV', '0')) > 0} canvasScale={canvasScale} />
                                        <DraggableValve initialX={830} initialY={240} scale={0.8} isRunning={parseFloat(lv('tc3', 'CV', '0')) > 0} canvasScale={canvasScale} />
                                        <DraggableValve initialX={1110} initialY={240} scale={0.8} isRunning={parseFloat(lv('tc4', 'CV', '0')) > 0} canvasScale={canvasScale} />
                                        <DraggableValve initialX={360} initialY={400} scale={0.8} initialRotation={180} isRunning={parseFloat(lv('dc1', 'CV', '0')) > 0} canvasScale={canvasScale} />
                                        <DraggableValve initialX={640} initialY={400} scale={0.8} initialRotation={180} isRunning={parseFloat(lv('dc2', 'CV', '0')) > 0} canvasScale={canvasScale} />
                                        <DraggableValve initialX={920} initialY={400} scale={0.8} initialRotation={180} isRunning={parseFloat(lv('dc3', 'CV', '0')) > 0} canvasScale={canvasScale} />
                                        <DraggableValve initialX={1200} initialY={400} scale={0.8} initialRotation={180} isRunning={parseFloat(lv('dc4', 'CV', '0')) > 0} canvasScale={canvasScale} />

                                        <DraggableMotorCrooked initialX={410} initialY={390} scale={0.55} isRunning={parseFloat(lv('prs1', 'AMP', '0')) > 0} canvasScale={canvasScale} />
                                        <DraggableMotorCrooked initialX={690} initialY={390} scale={0.55} isRunning={parseFloat(lv('prs2', 'AMP', '0')) > 0} canvasScale={canvasScale} />
                                        <DraggableMotorCrooked initialX={970} initialY={390} scale={0.55} isRunning={parseFloat(lv('prs3', 'AMP', '0')) > 0} canvasScale={canvasScale} />
                                        <DraggableMotorCrooked initialX={1250} initialY={390} scale={0.55} isRunning={parseFloat(lv('prs4', 'AMP', '0')) > 0} canvasScale={canvasScale} />
                                    </>
                                )}
                                {activeTab === 'water-dilution' && (
                                    <>
                                        <DraggableCard id="flow" onClick={(id) => handleEquipmentClick(id, [], ['FLOW'])} title="FLOWRATE" initialX={-10} initialY={60} scale={0.55} data={[{ label: 'FLOWRATE', value: lv('flow', 'FLOW', '15.5'), unit: 'M3/H', color: parseFloat(lv('flow', 'FLOW', '15.5')) > 0 ? 'green' : 'red' }]} canvasScale={canvasScale} />
                                        <DraggableCard id="vcv" onClick={(id) => handleEquipmentClick(id, [], ['CV'])} title="VALVE CV" initialX={180} initialY={250} scale={0.55} data={[{ label: 'VALVE CV', value: lv('vcv', 'CV', '65.0'), unit: '%', color: parseFloat(lv('vcv', 'CV', '65.0')) > 0 ? 'green' : 'red' }]} canvasScale={canvasScale} />
                                        <DraggableCard id="c_lvl" onClick={(id) => handleEquipmentClick(id, [], ['LEVEL'])} title="COND. LEVEL" initialX={450} initialY={230} scale={0.55} data={[{ label: 'COND. LEVEL', value: lv('c_lvl', 'LEVEL', '0.0'), unit: '%', color: parseFloat(lv('c_lvl', 'LEVEL', '0.0')) > 0 ? 'green' : 'red' }]} canvasScale={canvasScale} />
                                        <DraggableCard id="w_lvl" onClick={(id) => handleEquipmentClick(id, [], ['LEVEL'])} title="WATER LEVEL" initialX={450} initialY={30} scale={0.55} data={[{ label: 'WATER LEVEL', value: lv('w_lvl', 'LEVEL', '0.0'), unit: '%', color: parseFloat(lv('w_lvl', 'LEVEL', '0.0')) > 0 ? 'green' : 'red' }]} canvasScale={canvasScale} />
                                        <DraggableFlowmeter initialX={53} initialY={75} initialRotation={270} isRunning={parseFloat(lv('flow', 'FLOW', '15.5')) > 0} scale={0.6555} canvasScale={canvasScale} />
                                        <DraggableValveControl initialX={252} initialY={282} scale={1.2} isRunning={parseFloat(lv('vcv', 'CV', '65.0')) > 0} canvasScale={canvasScale} />
                                        <DraggableWater initialX={479} initialY={20} scale={1.9} canvasScale={canvasScale} />
                                        <DraggableWater initialX={479} initialY={230} scale={1.9} tintFilter="url(#tint-brown)" canvasScale={canvasScale} />
                                    </>
                                )}
                            </div>
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

            {flowBuilder.isActive && (
                <WTFlowPanel
                    flows={flowBuilder.flows}
                    activeFlowIdx={flowBuilder.activeFlowIdx}
                    isPlacing={flowBuilder.isPlacing}
                    onSelectFlow={flowBuilder.setActiveFlowIdx}
                    onAddNewFlow={flowBuilder.addNewFlow}
                    onDeleteFlow={flowBuilder.deleteFlow}
                    onUpdateFlowSettings={flowBuilder.updateFlowSettings}
                    onFinishPlacing={flowBuilder.finishPlacing}
                    onClose={flowBuilder.toggle}
                    onConfigFlow={(flowId) => handleTagEditRequest(flowId, [], ['FLOW'])}
                />
            )}
        </section>
    );
}

export function DraggableCard({ title, badge, data, initialX = 0, initialY = 0, scale = 0.45, canvasScale = 1, id, onClick }) {
    const handleClick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        console.log(`[DEBUG] Kartu ${id} diklik! Meneruskan event...`);
        if (onClick && id) onClick(id);
    };

    return (
        <div
            className="som-draggable-card"
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                transform: `translate(${initialX}px, ${initialY}px) scale(${scale})`,
                transformOrigin: 'top left'
            }}
            onClick={handleClick}
        >
            <div className="som-draggable-header">
                <div className="som-draggable-title">{title}</div>
                <div className="som-draggable-status-dot"></div>
            </div>

            <div className="som-draggable-body">
                {badge && (
                    <div className="som-draggable-badge-container">
                        <span className="som-draggable-badge">{badge}</span>
                    </div>
                )}

                <div className="som-draggable-data-list">
                    {data.map((item, idx) => (
                        <div key={idx} className="som-draggable-row">
                            <span className="som-draggable-label">{item.label}</span>
                            <div className="som-draggable-value-group">
                                <span className={`som-draggable-value ${item.color || 'green'}`}>
                                    {item.value}
                                </span>
                                {item.unit && <span className="som-draggable-unit">{item.unit}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function DraggableMotor({ initialX = 0, initialY = 0, initialRotation = 0, scale = 1, isRunning = null }) {
    const tintFilter = isRunning === null ? undefined : isRunning ? 'url(#tint-green)' : 'url(#tint-red)';

    return (
        <div
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                transform: `translate(${initialX}px, ${initialY}px) scale(${scale}) rotate(${initialRotation}deg)`,
                pointerEvents: 'none',
                zIndex: 15,
                width: '60px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <img src={motorSvg} alt="Motor" draggable={false} style={{ pointerEvents: 'none', width: '100%', height: '100%', filter: tintFilter }} />
        </div>
    );
}

export function DraggableValve({ initialX = 0, initialY = 0, initialRotation = 0, scale = 1, isRunning = null }) {
    const tintFilter = isRunning === null ? undefined : isRunning ? 'url(#tint-green)' : 'url(#tint-red)';

    return (
        <div
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                transform: `translate(${initialX}px, ${initialY}px) scale(${scale}) rotate(${initialRotation}deg)`,
                pointerEvents: 'none',
                zIndex: 15,
                width: '60px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <img src={valveSvg} alt="Valve" draggable={false} style={{ pointerEvents: 'none', width: '100%', height: '100%', filter: tintFilter }} />
        </div>
    );
}

export function DraggableFlowmeter({ initialX = 0, initialY = 0, initialRotation = 0, scale = 1, isRunning = null }) {
    const tintFilter = isRunning === null ? undefined : isRunning ? 'url(#tint-green)' : 'url(#tint-red)';

    return (
        <div
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                transform: `translate(${initialX}px, ${initialY}px) scale(${scale}) rotate(${initialRotation}deg)`,
                pointerEvents: 'none',
                zIndex: 15,
                width: '60px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <img src={flowmeterSvg} alt="Flowmeter" draggable={false} style={{ pointerEvents: 'none', width: '100%', height: '100%', filter: tintFilter }} />
        </div>
    );
}

export function DraggableMotorCrooked({ initialX = 0, initialY = 0, initialRotation = 0, scale = 1, isRunning = null }) {
    const tintFilter = isRunning === null ? undefined : isRunning ? 'url(#tint-green)' : 'url(#tint-red)';

    return (
        <div
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                transform: `translate(${initialX}px, ${initialY}px) scale(${scale}) rotate(${initialRotation}deg)`,
                pointerEvents: 'none',
                zIndex: 15,
                width: '70px',
                height: '70px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <img src={motorCrookedSvg} alt="Motor Crooked" draggable={false} style={{ pointerEvents: 'none', width: '100%', height: '100%', filter: tintFilter }} />
        </div>
    );
}

export function DraggableValveControl({ initialX = 0, initialY = 0, initialRotation = 0, scale = 1, isRunning = null }) {
    const tintFilter = isRunning === null ? undefined : isRunning ? 'url(#tint-green)' : 'url(#tint-red)';

    return (
        <div
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                transform: `translate(${initialX}px, ${initialY}px) scale(${scale}) rotate(${initialRotation}deg)`,
                pointerEvents: 'none',
                zIndex: 15,
                width: '60px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <img src={valveControlSvg} alt="Valve Control" draggable={false} style={{ pointerEvents: 'none', width: '100%', height: '100%', filter: tintFilter }} />
        </div>
    );
}

export function DraggableWater({ initialX = 0, initialY = 0, initialRotation = 0, scale = 1, tintFilter }) {
    return (
        <div
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                transform: `translate(${initialX}px, ${initialY}px) scale(${scale}) rotate(${initialRotation}deg)`,
                pointerEvents: 'none',
                zIndex: 14,
                width: '120px',
                height: '120px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <img src={waterGif} alt="Water Effect" draggable={false} style={{ pointerEvents: 'none', width: '100%', height: '100%', objectFit: 'contain', filter: tintFilter }} />
        </div>
    );
}

export default PressStationPage;