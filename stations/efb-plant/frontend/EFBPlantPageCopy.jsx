import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './EFBPlantPage.css';

// ==========================================
// 1. ASSETS IMPORT
// ==========================================
import efbPlantImageUrl from './assets/efb-plant2.webp';
import efbSingleLineImageUrl from './assets/EFB IPOMAS SINGLE.webp';
import cstCpoLayerGif from './assets/cst_cpo_layer.gif';
import pumpRunSvg from './assets/pump-run.svg';
import valvePositionerSvg from './assets/valve_positioner.svg';
import pipeSvg from './assets/Pipe.svg';
import motorSvg from './assets/motor.svg';
import motorbackSvg from './assets/motor-back.svg';

import { useWTFlowBuilder, WTFlowOverlay, WTFlowPanel } from './components/WTFlowBuilder.jsx';
import { LiquidFlowSVG, SteamFlowSVG, LiquidSteamFlowSVG } from './components/Flows.jsx';
import { ValvePositionerModal } from './application/ValvePositionerModal.jsx';
import TrendTab from './tabs/Trend/TrendTab.jsx';
import SettingsView from './SettingsView.jsx';
import usePlcStore from '@core/store';

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
// 2.1 HELPER EQUIVALENT KEYS UNTUK SINKRONISASI TAG OVERVIEW & SINGLE LINE
// ==========================================
export const getEquivalentKeys = (id, signalKey) => {
    const keys = [];
    if (signalKey) {
        keys.push(`${id}__${signalKey}`);
    } else if (id && id.includes('__')) {
        keys.push(id);
        const parts = id.split('__');
        id = parts[0];
        signalKey = parts[1];
    } else if (id) {
        keys.push(id);
    }

    if (!signalKey) {
        if (id && id.includes('motor_conveyor')) {
            keys.push(
                'motor_conveyor',
                'single_efb_1_motor_conveyor',
                'single_efb_2_motor_conveyor',
                'single_efb_3_motor_conveyor',
                'single_efb_4_motor_conveyor'
            );
        } else if (id && id.includes('motor_pump')) {
            keys.push(
                'motor_pump',
                'single_efb_1_motor_pump',
                'single_efb_2_motor_pump'
            );
        }
        const match = id ? id.match(/\d+/) : null;
        const n = match ? match[0] : null;
        if (n) {
            if (id.includes('card')) {
                keys.push(`efb${n}_card`);
            } else if (id.includes('press') || id.startsWith('efb_no_')) {
                keys.push(`efb_no_${n}`, `single_efb_${n}_press`);
            } else if (id.includes('reset_runtime')) {
                keys.push(`single_efb_${n}_reset_runtime`);
            } else if (id.includes('value_sensor') || id.includes('temp')) {
                keys.push(`single_efb_${n}_value_sensor`, `temp${n}`);
            }
        }
        return Array.from(new Set(keys));
    }

    // With signalKey
    if (signalKey === 'CONV_IN' || signalKey === 'CONV_OUT') {
        keys.push(
            `motor_conveyor__${signalKey}`,
            `single_efb_1_motor_conveyor__${signalKey}`,
            `single_efb_2_motor_conveyor__${signalKey}`,
            `single_efb_3_motor_conveyor__${signalKey}`,
            `single_efb_4_motor_conveyor__${signalKey}`
        );
    } else if (signalKey === 'PUMP1' || signalKey === 'PUMP2') {
        keys.push(
            `motor_pump__${signalKey}`,
            `single_efb_1_motor_pump__${signalKey}`,
            `single_efb_2_motor_pump__${signalKey}`
        );
    } else {
        const match = id ? id.match(/\d+/) : null;
        const n = match ? match[0] : null;
        if (n) {
            if (signalKey === 'STATUS' || signalKey === 'LOAD' || signalKey === 'PV') {
                keys.push(
                    `efb_no_${n}__${signalKey}`,
                    `single_efb_${n}_press__${signalKey}`,
                    `single_efb_${n}__${signalKey}`
                );
            }
            if (signalKey === 'STEAM') {
                keys.push(
                    `valve_press_${n}_steam__STEAM`,
                    `valve_press_${n}_steam__STATUS`,
                    `valve_press_${n}_steam__MONITOR`,
                    `valve_press_${n}_steam_single__STEAM`,
                    `valve_press_${n}_steam_single__STATUS`,
                    `valve_press_${n}_steam`,
                    `valve_press_${n}_steam_single`,
                    `efb_no_${n}__STEAM`
                );
            }
            if (signalKey === 'V_STEAM') {
                keys.push(
                    `efb${n}_card__V_STEAM`,
                    `efb_no_${n}__V_STEAM`
                );
            }
            if (signalKey === 'DILUTION') {
                keys.push(
                    `valve_press_${n}_dilution__DILUTION`,
                    `valve_press_${n}_dilution__STATUS`,
                    `valve_press_${n}_dilution__MONITOR`,
                    `valve_press_${n}_dilution_single__DILUTION`,
                    `valve_press_${n}_dilution_single__STATUS`,
                    `valve_press_${n}_dilution`,
                    `valve_press_${n}_dilution_single`,
                    `efb_no_${n}__DILUTION`
                );
            }
            if (signalKey === 'V_DILUTION') {
                keys.push(
                    `efb${n}_card__V_DILUTION`,
                    `efb_no_${n}__V_DILUTION`
                );
            }
            if (signalKey === 'TEMP') {
                keys.push(
                    `single_efb_${n}_value_sensor__TEMP`,
                    `efb${n}_card__TEMP`,
                    `temp${n}__MONITOR`,
                    `efb_no_${n}__TEMP`
                );
            }
            if (signalKey === 'WATER_FLOW') {
                keys.push(
                    `single_efb_${n}_value_sensor__WATER_FLOW`,
                    `water_flow__MONITOR`
                );
            }
            if (signalKey === 'OIL_FLOW') {
                keys.push(
                    `single_efb_${n}_value_sensor__OIL_FLOW`,
                    `oil_flow__MONITOR`
                );
            }
            if (signalKey === 'RESET' || signalKey === 'RUN_TIME') {
                keys.push(
                    `single_efb_${n}_reset_runtime__RESET`,
                    `efb${n}_card__RUN_TIME`
                );
            }
        }
    }
    return Array.from(new Set(keys));
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
                    const sigKey = sig.key || sig;
                    const key = `${data.targetId}__${sigKey}`;
                    let val = tagMap[key] || "";
                    if (!val) {
                        const altKeys = getEquivalentKeys(data.targetId, sigKey);
                        for (const ak of altKeys) {
                            if (tagMap[ak] && tagMap[ak] !== "null" && tagMap[ak] !== "undefined" && tagMap[ak] !== "") {
                                val = tagMap[ak];
                                break;
                            }
                        }
                    }
                    initial[key] = val;
                });
            } else {
                const targets = data.subs && data.subs.length > 0 ? data.subs : [data.targetId];
                targets.forEach((t) => {
                    initial[`${t}__STATUS`] = tagMap[`${t}__STATUS`] || "";
                    initial[`${t}__START`] = tagMap[`${t}__START`] || "";
                    initial[`${t}__STOP`] = tagMap[`${t}__STOP`] || "";
                });
                if (!data.subs || data.subs.length === 0) {
                    let monVal = tagMap[`${data.targetId}__MONITOR`] || "";
                    if (!monVal) {
                        const altKeys = getEquivalentKeys(data.targetId, "MONITOR");
                        for (const ak of altKeys) {
                            if (tagMap[ak] && tagMap[ak] !== "null" && tagMap[ak] !== "undefined" && tagMap[ak] !== "") {
                                monVal = tagMap[ak];
                                break;
                            }
                        }
                    }
                    initial[`${data.targetId}__MONITOR`] = monVal;
                }
            }
            setLocalTags(initial);
        }
    }, [data, tagMap]);

    if (!data) return null;

    const isGroup = data.subs && data.subs.length > 0;
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
function StatusGraphPopup({ position, equipmentName, type = 'Load', value = 0, unit = '', onMouseEnter, onMouseLeave }) {
    const popupRef = useRef(null);
    const [style, setStyle] = useState({ opacity: 0, pointerEvents: 'none' });

    useEffect(() => {
        if (!position || !popupRef.current) return;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const popupWidth = 420;
        const popupHeight = 270;
        const padding = 16;

        let left = position.right + 12;
        let top = position.top - 10;

        if (left + popupWidth > viewportWidth - padding) {
            left = position.left - popupWidth - 12;
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

    const width = 380;
    const height = 175;
    const plotLeft = 45;
    const plotRight = 355;
    const plotTop = 18;
    const plotBottom = 140;

    const numVal = parseFloat(value);
    const isValValid = !isNaN(numVal);
    const safeVal = isValValid ? Math.max(0, numVal) : 0;

    let maxRange = 100;
    const typeStr = String(type).toLowerCase();
    if (typeStr.includes('temp')) maxRange = 150;
    else if (typeStr.includes('pv') || typeStr.includes('current') || unit === 'A') maxRange = Math.max(50, Math.ceil((safeVal * 1.35 || 30) / 10) * 10);
    else if (typeStr.includes('load') || unit === '%') maxRange = 100;
    else if (typeStr.includes('flow')) maxRange = Math.max(100, Math.ceil((safeVal * 1.35 || 50) / 10) * 10);
    else if (typeStr.includes('valve')) maxRange = 100;

    const points = useMemo(() => {
        return Array.from({ length: 20 }).map((_, i) => {
            const x = plotLeft + ((plotRight - plotLeft) * i) / 19;
            const wave = Math.sin((i / 19) * Math.PI * 3 + safeVal) * (safeVal * 0.06);
            const ptVal = Math.max(0, safeVal + (i === 19 ? 0 : wave));
            const t = Math.min(1, Math.max(0, ptVal / maxRange));
            const y = plotBottom - t * (plotBottom - plotTop);
            return { x, y, val: ptVal.toFixed(1) };
        });
    }, [safeVal, maxRange]);

    const polyPoints = points.map((p) => `${p.x},${p.y}`).join(' ');
    const strokeColor = typeStr.includes('temp') ? '#ef4444' : typeStr.includes('pv') || typeStr.includes('current') || typeStr.includes('load') ? '#f59e0b' : '#38bdf8';
    const gradColor = strokeColor;
    const safeTypeId = type.replace(/[^a-zA-Z0-9]/g, '_');

    return createPortal(
        <div
            ref={popupRef}
            className="som-amp-popup som-efb-trend-popup"
            style={style}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="som-amp-popup-header" style={{ background: '#facc15', borderBottom: '2px solid #eab308' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="som-amp-popup-title" style={{ color: '#0f172a', fontWeight: 900, fontSize: '11px', letterSpacing: '0.04em' }}>
                        {type} Trend
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e', display: 'inline-block' }}></span>
                        <span style={{ fontSize: '9px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>LIVE</span>
                    </div>
                </div>
                <div className="som-amp-popup-subtitle" style={{ color: '#1e293b', fontWeight: 800, fontSize: '10px', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{equipmentName}</span>
                    <span style={{ color: '#0f172a', fontWeight: 900, background: 'rgba(255, 255, 255, 0.75)', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.08)', whiteSpace: 'nowrap' }}>
                        Current: <strong style={{ color: '#0f172a', fontWeight: 950 }}>{isValValid ? value : 'no tag'}{isValValid && unit ? ` ${unit}` : ''}</strong>
                    </span>
                </div>
            </div>
            <div className="som-amp-popup-body" style={{ padding: '12px 14px 8px 14px', background: '#ffffff' }}>
                <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="som-amp-graph-svg" style={{ display: 'block', margin: '0 auto' }}>
                    <defs>
                        <linearGradient id={`efbTrendGrad_${safeTypeId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={gradColor} stopOpacity="0.45" />
                            <stop offset="100%" stopColor={gradColor} stopOpacity="0.02" />
                        </linearGradient>
                    </defs>
                    <rect x={plotLeft} y={plotTop} width={plotRight - plotLeft} height={plotBottom - plotTop} fill="rgba(248, 250, 252, 0.8)" rx="4" />
                    {[0, 0.5, 1].map((ratio) => {
                        const y = plotBottom - ratio * (plotBottom - plotTop);
                        const val = Math.round(ratio * maxRange);
                        return (
                            <g key={ratio}>
                                <line x1={plotLeft} y1={y} x2={plotRight} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="1" />
                                <text x={plotLeft - 6} y={y + 3} fill="#64748b" fontSize="8.5" fontWeight="700" textAnchor="end">{val}{unit ? ` ${unit}` : ''}</text>
                            </g>
                        );
                    })}
                    <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke="#cbd5e1" strokeWidth="1.5" />
                    <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke="#cbd5e1" strokeWidth="1.5" />
                    <polygon
                        points={`${plotLeft},${plotBottom} ${polyPoints} ${plotRight},${plotBottom}`}
                        style={{ fill: `url(#efbTrendGrad_${safeTypeId})` }}
                    />
                    <polyline points={polyPoints} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {points.map((p, idx) => (
                        (idx === 0 || idx === 9 || idx === 19) ? (
                            <circle key={idx} cx={p.x} cy={p.y} r="3.5" fill={strokeColor} stroke="#ffffff" strokeWidth="1.5" />
                        ) : null
                    ))}
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 45px 0 45px', fontSize: '8.5px', color: '#94a3b8', fontWeight: 700 }}>
                    <span>-30m</span>
                    <span>-15m</span>
                    <span>Now</span>
                </div>
            </div>
        </div>,
        document.body
    );
}

/**
 * Component Card Single Sensor / Monitor (Temp, Pump Status, dll)
 */
const MonitorCard = ({ id, x, y, label, value = "no tag", unit, equipmentName, trendType, status = "RUNNING", scale = 1, onClick, isEditable, statusDot, style = {} }) => {
    const {
        cardRef, isHovered, popupPos,
        handleMouseEnter, handleMouseLeave, handlePopupMouseEnter, handlePopupMouseLeave
    } = useAmpHover();

    const isNoTag = value === undefined || value === null || value === "" || String(value).trim().toLowerCase() === "no tag" || String(value).trim() === "--";
    const displayVal = isNoTag ? "no tag" : value;

    // Evaluasi status dot: Jika statusDot diberikan (boolean), pakai nilainya.
    // Jika tidak, periksa apakah nilainya berupa angka valid dan > 0 (bukan 'no tag' / '--' / <= 0)
    let isDotActive = false;
    if (statusDot !== undefined) {
        isDotActive = Boolean(statusDot);
    } else if (!isNoTag) {
        const num = parseFloat(value);
        if (!isNaN(num)) {
            isDotActive = num > 0;
        } else {
            // Default fallback hanya jika status prop diset eksplisit bukan default RUNNING saat value no tag
            isDotActive = status !== undefined && status !== null && status !== "STOPPED" && status !== "RUNNING" ? status.toUpperCase() === "RUNNING" : false;
        }
    }

    const dotColor = isNoTag ? '#94a3b8' : (isDotActive ? '#22c55e' : '#ef4444');
    const dotShadow = isNoTag ? 'none' : (isDotActive ? '0 0 4px rgba(34, 197, 94, 0.8)' : '0 0 4px rgba(239, 68, 68, 0.8)');

    return (
        <g id={id} className="svg-equipment sensor-group" onClick={() => onClick && onClick(id)} style={{ cursor: isEditable ? 'pointer' : 'default' }}>
            <foreignObject x={x - 100} y={y - 30} width="200" height="120" style={{ overflow: 'visible' }}>
                <div style={{ display: 'flex', justifyContent: 'center', transform: `scale(${scale})`, transformOrigin: 'center' }}>
                    <div
                        ref={cardRef}
                        className={`som-station-card ${isEditable ? 'som-editable' : ''}`}
                        style={style}
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
                                <span
                                    className="som-station-value"
                                    style={{
                                        color: isNoTag ? "#94a3b8" : undefined,
                                        fontStyle: isNoTag ? "italic" : "normal",
                                        fontSize: isNoTag ? "12px" : undefined,
                                        fontWeight: isNoTag ? 600 : 900
                                    }}
                                >
                                    {displayVal}
                                </span>
                                {unit && !isNoTag && <span className="som-station-unit">{unit}</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </foreignObject>
            {isHovered && popupPos && !isNoTag && (
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
const MachineParams = ({ id, x, y, title, params = [], scale = 1, onClick, isEditable, statusDot, style = {} }) => {
    let hasAnyConfigured = params.some(p => p.value !== undefined && p.value !== null && p.value !== "" && String(p.value).trim().toLowerCase() !== "no tag" && String(p.value).trim() !== "--");
    let isDotActive = false;
    if (statusDot !== undefined) {
        isDotActive = Boolean(statusDot);
    } else if (params && params.length > 0) {
        isDotActive = params.some(p => {
            if (p.value === undefined || p.value === null || p.value === '' || p.value === 'no tag' || p.value === '--') return false;
            const num = parseFloat(p.value);
            return !isNaN(num) && num > 0;
        });
    }

    const dotColor = !hasAnyConfigured ? '#94a3b8' : (isDotActive ? '#22c55e' : '#ef4444');
    const dotShadow = !hasAnyConfigured ? 'none' : (isDotActive ? '0 0 4px rgba(34, 197, 94, 0.8)' : '0 0 4px rgba(239, 68, 68, 0.8)');

    return (
        <g id={id} className="svg-equipment motor-group" onClick={() => onClick && onClick(id)} style={{ cursor: isEditable ? 'pointer' : 'default' }}>
            <foreignObject x={x - 100} y={y - 90} width="200" height="240" style={{ overflow: 'visible' }}>
                <div style={{ display: 'flex', justifyContent: 'center', transform: `scale(${scale})`, transformOrigin: 'center' }}>
                    <div className={`som-station-card ${isEditable ? 'som-editable' : ''}`} style={style}>
                        <div className="som-station-header">
                            <div className="som-station-title">{title}</div>
                            <div className="som-station-status-dot" style={{ backgroundColor: dotColor, boxShadow: dotShadow }}></div>
                        </div>
                        <div className="som-station-body">
                            <div className="som-station-data-list">
                                {params.map((p, i) => {
                                    const isNoTag = p.value === undefined || p.value === null || p.value === "" || String(p.value).trim().toLowerCase() === "no tag" || String(p.value).trim() === "--";
                                    const displayVal = isNoTag ? "no tag" : p.value;
                                    return (
                                        <div key={i} className="som-station-row">
                                            <span className="som-station-label">{p.label}</span>
                                            <div className="som-station-value-group">
                                                <span
                                                    className={`som-station-value ${p.color === 'red' && !isNoTag ? 'red' : ''}`}
                                                    style={{
                                                        color: isNoTag ? "#94a3b8" : undefined,
                                                        fontStyle: isNoTag ? "italic" : "normal",
                                                        fontSize: isNoTag ? "11px" : undefined,
                                                        fontWeight: isNoTag ? 600 : 900
                                                    }}
                                                >
                                                    {displayVal}
                                                </span>
                                                {p.unit && !isNoTag && <span className="som-station-unit">{p.unit}</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </foreignObject>
        </g>
    );
};

/**
 * EquipmentIconSVG — Reusable SVG Equipment / Valve Component (sesuai standar Sterilizer Overview)
 */
export const EquipmentIconSVG = ({
    id,
    x,
    y,
    icon,
    size = 35,
    rotation = 0,
    isRunning = false,
    filter,
    onClick,
    isEditable = false,
    style = {},
}) => {
    const half = size / 2;
    const filterStyle = filter || (isRunning ? "url(#tint-green)" : "url(#tint-red)");
    const isMapped = style?.outline?.includes("#3b82f6");
    const isDev = Boolean(style?.outline);
    return (
        <g
            id={id}
            transform={`translate(${x}, ${y}) rotate(${rotation})`}
            onClick={(e) => {
                if (onClick) {
                    e.stopPropagation();
                    onClick(e);
                }
            }}
            style={{ cursor: onClick ? "pointer" : (isEditable || isDev ? "pointer" : "default") }}
        >
            <image
                href={icon}
                x={-half}
                y={-half}
                width={size}
                height={size}
                filter={filterStyle}
                style={{ filter: filterStyle, pointerEvents: "all" }}
            />
            {isDev && (
                <rect
                    x={-half - 4}
                    y={-half - 4}
                    width={size + 8}
                    height={size + 8}
                    fill="none"
                    stroke={isMapped ? "#3b82f6" : "#ef4444"}
                    strokeWidth={isMapped ? 2.5 : 2}
                    strokeDasharray={isMapped ? "none" : "4 3"}
                    rx={6}
                    style={{ filter: isMapped ? "drop-shadow(0 0 6px rgba(59, 130, 246, 0.7))" : "drop-shadow(0 0 6px rgba(239, 68, 68, 0.7))" }}
                />
            )}
        </g>
    );
};

/**
 * ValveModernCardSVG — Card Persenan Valve Sesuai Standar BPV Sterilizer
 */
export const ValveModernCardSVG = ({
    id,
    x,
    y,
    scale = 0.52,
    title = "",
    position = "no tag",
    onClick,
    isEditable = false,
    style = {}
}) => {
    const { cardRef, isHovered, popupPos, handleMouseEnter, handleMouseLeave, handlePopupMouseEnter, handlePopupMouseLeave } = useAmpHover();
    const s = String(position).trim().toLowerCase();
    const isNoTag = position === undefined || position === null || position === "" || s === "no tag";
    const isOffline = s === "--";

    let numPos = parseFloat(position);
    if (s === "open" || s === "true" || s === "run") numPos = 100;
    if (s === "close" || s === "false" || s === "stop") numPos = 0;

    const validNum = !isNaN(numPos) ? Math.min(100, Math.max(0, numPos)) : 0;

    let displayPos = "no tag";
    if (isOffline) {
        displayPos = "--";
    } else if (!isNoTag && !isNaN(numPos)) {
        displayPos = `${Number.isInteger(numPos) ? numPos : numPos.toFixed(1)}%`;
    } else if (!isNoTag) {
        displayPos = String(position);
    }

    const isDev = Boolean(style?.outline);

    return (
        <g
            id={id}
            className="svg-equipment valve-modern-group"
            transform={`translate(${x}, ${y}) scale(${scale}) translate(-100, -50)`}
            onClick={(e) => {
                if (onClick) {
                    e.stopPropagation();
                    onClick(e);
                }
            }}
            style={{ cursor: onClick ? "pointer" : (isEditable || isDev ? "pointer" : "default") }}
        >
            <foreignObject width="200" height="100" style={{ overflow: "visible", pointerEvents: "auto" }}>
                <div
                    ref={cardRef}
                    className="som-valve-modern-card"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => {
                        if (onClick) {
                            e.stopPropagation();
                            e.preventDefault();
                            onClick(e);
                        }
                    }}
                    onPointerDown={(e) => {
                        if (onClick && (isEditable || isDev)) {
                            e.stopPropagation();
                            e.preventDefault();
                            onClick(e);
                        }
                    }}
                    style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "14px",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                        overflow: "hidden",
                        fontFamily: "'Inter', sans-serif",
                        display: "flex",
                        flexDirection: "column",
                        cursor: onClick || isEditable || isDev ? "pointer" : "default",
                        pointerEvents: "auto",
                        boxSizing: "border-box",
                        width: "200px",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        ...style
                    }}
                >
                    {/* Header Kuning Sterilizer Style */}
                    <div
                        style={{
                            background: "#facc15",
                            padding: "6px 8px",
                            textAlign: "center",
                            borderBottom: "1.5px solid #eab308",
                        }}
                    >
                        <span
                            style={{
                                fontSize: "12px",
                                fontWeight: "950",
                                color: "#0f172a",
                                letterSpacing: "0.5px",
                                textTransform: "uppercase",
                                display: "block"
                            }}
                        >
                            {title}
                        </span>
                    </div>

                    {/* Card Body */}
                    <div
                        style={{
                            padding: "8px 12px 10px 12px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "3px"
                        }}
                    >
                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>POSITION</span>
                        <div style={{ position: "relative", width: "100%", height: "24px", background: "#f1f5f9", borderRadius: "6px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                            <div
                                style={{
                                    width: isNoTag || isOffline ? "0%" : `${validNum}%`,
                                    height: "100%",
                                    background: "linear-gradient(90deg, #ffdb3b, #d4ac0d)",
                                    transition: "width 0.15s ease"
                                }}
                            />
                            <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "950", color: isNoTag ? "#64748b" : "#0f172a" }}>
                                {displayPos}
                            </div>
                        </div>
                    </div>
                </div>
            </foreignObject>
            {isHovered && popupPos && !isNoTag && !isOffline && (
                <StatusGraphPopup
                    position={popupPos}
                    equipmentName={title || "Valve Actuator"}
                    type="Valve Opening"
                    value={validNum}
                    unit="%"
                    onMouseEnter={handlePopupMouseEnter}
                    onMouseLeave={handlePopupMouseLeave}
                />
            )}
        </g>
    );
};

/**
 * Component Press Data Card (EFB NO. 1 - 4 Press Data)
 * Desain sesuai referensi Image: Header kuning #facc15, Indikator Run & Fault LED, Label Load & PV di kiri, Value di dalam box kuning di kanan
 */
export const PressDataCardSVG = ({
    id,
    x,
    y,
    title = "EFB NO. 1",
    isRun = false,
    isFault = true,
    loadVal = "no tag",
    loadUnit = "%",
    pvVal = "no tag",
    pvUnit = "A",
    width = 135,
    height = 108,
    scale = 1,
    onClick,
    onToggleStatus,
    isEditable = false,
    style = {}
}) => {
    const isLoadNoTag = loadVal === undefined || loadVal === null || loadVal === "" || String(loadVal).trim().toLowerCase() === "no tag" || String(loadVal).trim() === "--";
    const isPvNoTag = pvVal === undefined || pvVal === null || pvVal === "" || String(pvVal).trim().toLowerCase() === "no tag" || String(pvVal).trim() === "--";
    const displayLoad = isLoadNoTag ? "no tag" : loadVal;
    const displayPv = isPvNoTag ? "no tag" : pvVal;

    return (
        <g
            id={id}
            className="svg-equipment press-data-group"
            transform={`translate(${x}, ${y}) scale(${scale})`}
            onClick={() => onClick && onClick(id)}
            style={{ cursor: isEditable || onClick ? 'pointer' : 'default' }}
        >
            <foreignObject
                x={-width / 2}
                y={-height / 2}
                width={width}
                height={height}
                style={{ overflow: 'visible', pointerEvents: 'auto' }}
            >
                <div
                    className="som-press-data-card"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onClick) onClick(id);
                    }}
                    style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "7px",
                        boxShadow: "0 3px 10px rgba(15, 23, 42, 0.12)",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        width: "100%",
                        height: "100%",
                        boxSizing: "border-box",
                        fontFamily: "'Inter', sans-serif",
                        pointerEvents: "auto",
                        cursor: isEditable || onClick ? 'pointer' : 'default',
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        ...style
                    }}
                >
                    {/* Header Kuning Sterilizer Style */}
                    <div
                        style={{
                            background: "#facc15",
                            padding: "4px 6px",
                            textAlign: "center",
                            borderBottom: "1px solid #eab308",
                        }}
                    >
                        <span
                            style={{
                                fontSize: "11px",
                                fontWeight: 900,
                                color: "#0f172a",
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                            }}
                        >
                            {title}
                        </span>
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: "5px 8px", display: "flex", flexDirection: "column", gap: "4px", flex: 1, justifyContent: "space-between" }}>
                        {/* Run & Fault LED Status Row */}
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-around",
                            padding: "0 0 3px 0",
                            borderBottom: "1px solid #f1f5f9"
                        }}>
                            {/* RUN */}
                            <div
                                onClick={(e) => {
                                    if (onToggleStatus) {
                                        e.stopPropagation();
                                        onToggleStatus(id, 'RUN');
                                    }
                                }}
                                style={{ display: "flex", alignItems: "center", gap: "5px", cursor: onToggleStatus ? "pointer" : "default" }}
                            >
                                <span style={{ fontSize: "11px", fontWeight: 900, color: "#0f172a" }}>Run</span>
                                <div
                                    style={{
                                        width: "12px",
                                        height: "12px",
                                        borderRadius: "50%",
                                        backgroundColor: isRun ? "#22c55e" : "#e2e8f0",
                                        border: isRun ? "1.5px solid #16a34a" : "1.5px solid #cbd5e1",
                                        boxShadow: isRun ? "0 0 8px rgba(34, 197, 94, 0.85), inset 0 1px 2px #bbf7d0" : "inset 0 1px 2px rgba(0,0,0,0.1)",
                                        transition: "all 0.3s ease"
                                    }}
                                    title={isRun ? "RUNNING" : "STOPPED"}
                                />
                            </div>

                            {/* FAULT */}
                            <div
                                onClick={(e) => {
                                    if (onToggleStatus) {
                                        e.stopPropagation();
                                        onToggleStatus(id, 'FAULT');
                                    }
                                }}
                                style={{ display: "flex", alignItems: "center", gap: "5px", cursor: onToggleStatus ? "pointer" : "default" }}
                            >
                                <span style={{ fontSize: "11px", fontWeight: 900, color: "#0f172a" }}>Fault</span>
                                <div
                                    style={{
                                        width: "12px",
                                        height: "12px",
                                        borderRadius: "50%",
                                        backgroundColor: isFault ? "#ef4444" : "#e2e8f0",
                                        border: isFault ? "1.5px solid #b91c1c" : "1.5px solid #cbd5e1",
                                        boxShadow: isFault ? "0 0 8px rgba(239, 68, 68, 0.85), inset 0 1px 2px #fecaca" : "inset 0 1px 2px rgba(0,0,0,0.1)",
                                        transition: "all 0.3s ease"
                                    }}
                                    title={isFault ? "FAULT" : "NORMAL"}
                                />
                            </div>
                        </div>

                        {/* LOAD Row (Label di kiri, Box kuning nilai di kanan) */}
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "0 2px",
                        }}>
                            <span style={{ fontSize: "11px", fontWeight: 800, color: "#0f172a" }}>Load</span>
                            <div style={{
                                border: "1px solid #facc15",
                                background: "#ffffff",
                                borderRadius: "4px",
                                padding: "1.5px 8px",
                                minWidth: "48px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "3px",
                                boxShadow: "inset 0 1px 2px rgba(250, 204, 21, 0.1)"
                            }}>
                                <span style={{
                                    fontSize: isLoadNoTag ? "11px" : "12px",
                                    fontWeight: isLoadNoTag ? 600 : 900,
                                    color: isLoadNoTag ? "#94a3b8" : "#ef4444",
                                    fontStyle: isLoadNoTag ? "italic" : "normal"
                                }}>
                                    {displayLoad}
                                </span>
                                {!isLoadNoTag && (
                                    <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#0f172a" }}>
                                        {loadUnit}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* PV Row (Label di kiri, Box kuning nilai di kanan) */}
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "0 2px",
                        }}>
                            <span style={{ fontSize: "11px", fontWeight: 800, color: "#0f172a" }}>PV</span>
                            <div style={{
                                border: "1px solid #facc15",
                                background: "#ffffff",
                                borderRadius: "4px",
                                padding: "1.5px 8px",
                                minWidth: "48px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "3px",
                                boxShadow: "inset 0 1px 2px rgba(250, 204, 21, 0.1)"
                            }}>
                                <span style={{
                                    fontSize: isPvNoTag ? "11px" : "12px",
                                    fontWeight: isPvNoTag ? 600 : 900,
                                    color: isPvNoTag ? "#94a3b8" : "#ef4444",
                                    fontStyle: isPvNoTag ? "italic" : "normal"
                                }}>
                                    {displayPv}
                                </span>
                                {!isPvNoTag && (
                                    <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#0f172a" }}>
                                        {pvUnit}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </foreignObject>
        </g>
    );
};

/**
 * TagMonitorCardSVG — Card Pemantau Sensor/Valve untuk Single Line & Overview
 */
export const TagMonitorCardSVG = ({
    id,
    x,
    y,
    title = "VALVE",
    parameterLabel = "",
    value = "no tag",
    unit = "",
    statusDot = "grey",
    width = 110,
    height = 55,
    scale = 1,
    onClick,
    isEditable = false,
    style = {},
}) => {
    const { cardRef, isHovered, popupPos, handleMouseEnter, handleMouseLeave, handlePopupMouseEnter, handlePopupMouseLeave } = useAmpHover();
    const isNoTag = value === undefined || value === null || value === "" || String(value).trim().toLowerCase() === "no tag" || String(value).trim() === "--";
    const displayVal = isNoTag ? "no tag" : value;
    const dotColor = isNoTag ? "#94a3b8" : (statusDot === "green" ? "#22c55e" : statusDot === "red" ? "#ef4444" : statusDot === "yellow" ? "#eab308" : "#94a3b8");
    const valueColor = isNoTag ? "#94a3b8" : (statusDot === "green" ? "#16a34a" : statusDot === "red" ? "#dc2626" : "#0f172a");

    return (
        <g
            id={id}
            className="svg-equipment tag-monitor-group"
            transform={`translate(${x}, ${y}) scale(${scale})`}
            onClick={() => onClick && onClick(id)}
            style={{ cursor: isEditable || onClick ? "pointer" : "default" }}
        >
            <foreignObject
                x={-width / 2}
                y={-height / 2}
                width={width}
                height={height}
                style={{ overflow: "visible", pointerEvents: "auto" }}
            >
                <div
                    ref={cardRef}
                    className="som-tag-monitor-card"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onClick) onClick(id);
                    }}
                    style={{
                        background: "#ffffff",
                        border: isEditable ? "2px dashed #ef4444" : "1px solid #cbd5e1",
                        borderRadius: "7px",
                        boxShadow: "0 3px 10px rgba(15, 23, 42, 0.12)",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        width: "100%",
                        height: "100%",
                        boxSizing: "border-box",
                        fontFamily: "'Inter', sans-serif",
                        pointerEvents: "auto",
                        cursor: isEditable || onClick ? "pointer" : "default",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        ...style,
                    }}
                >
                    <div
                        style={{
                            background: "#facc15",
                            padding: "3px 6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderBottom: "1px solid #eab308",
                        }}
                    >
                        <span
                            style={{
                                fontSize: "9.5px",
                                fontWeight: 900,
                                color: "#0f172a",
                                letterSpacing: "0.02em",
                                textTransform: "uppercase",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {title}
                        </span>
                        <div
                            style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                backgroundColor: dotColor,
                                border: "1px solid #ffffff",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                                flexShrink: 0,
                            }}
                        />
                    </div>
                    <div
                        style={{
                            padding: "4px 6px",
                            textAlign: "center",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "3px",
                            flex: 1,
                        }}
                    >
                        {parameterLabel && (
                            <span style={{ fontSize: "9px", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                                {parameterLabel}:
                            </span>
                        )}
                        <span
                            style={{
                                fontSize: isNoTag ? "10.5px" : "12px",
                                fontWeight: isNoTag ? 600 : 900,
                                color: valueColor,
                                fontStyle: isNoTag ? "italic" : "normal",
                            }}
                        >
                            {displayVal}
                            {unit && !isNoTag && (
                                <span style={{ fontSize: "9px", fontWeight: 700, marginLeft: "2px", opacity: 0.8 }}>
                                    {unit}
                                </span>
                            )}
                        </span>
                    </div>
                </div>
            </foreignObject>
            {isHovered && popupPos && !isNoTag && (
                <StatusGraphPopup
                    position={popupPos}
                    equipmentName={title}
                    type={title}
                    value={parseFloat(value) || 0}
                    unit={unit}
                    onMouseEnter={handlePopupMouseEnter}
                    onMouseLeave={handlePopupMouseLeave}
                />
            )}
        </g>
    );
};

/**
 * EFBStatusPanelSVG — Telemetri Panel Lengkap untuk Single Line EFB Press
 */
export const EFBStatusPanelSVG = ({
    id,
    x,
    y,
    title = "EFB PRESS 1",
    status = "RUN",
    mode = "no tag",
    load = "no tag",
    pv = "no tag",
    temp = "no tag",
    steamValve = "CLOSE",
    dilutionValve = "CLOSE",
    slidingChute = "no tag",
    runTime = "no tag",
    width = 200,
    scale = 1,
    onClick,
    isEditable = false,
    style = {},
}) => {
    const { cardRef, isHovered, popupPos, handleMouseEnter, handleMouseLeave, handlePopupMouseEnter, handlePopupMouseLeave } = useAmpHover();
    const isFault = status === "FAULT" || status === "0" || status === 0 || status === false;
    const isRun = status === "RUN" || status === "1" || status === 1 || status === true;

    const Row = ({ label, value, unit, valueColor = "#0f172a" }) => {
        const isNoTag = value === undefined || value === null || value === "" || String(value).trim().toLowerCase() === "no tag" || String(value).trim() === "--";
        const finalColor = isNoTag ? "#94a3b8" : valueColor;
        const displayVal = isNoTag ? "no tag" : value;
        return (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2.5px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#475569", fontSize: "10.5px", fontWeight: 700 }}>{label}</span>
                <div style={{ textAlign: "right", display: "flex", alignItems: "baseline", gap: "2px" }}>
                    <span style={{ color: finalColor, fontSize: isNoTag ? "10px" : "11px", fontWeight: isNoTag ? 600 : 900, fontStyle: isNoTag ? "italic" : "normal" }}>{displayVal}</span>
                    {unit && !isNoTag && <span style={{ color: "#64748b", fontSize: "9px", fontWeight: 700 }}>{unit}</span>}
                </div>
            </div>
        );
    };

    const isTempValid = temp && String(temp).toLowerCase() !== "no tag" && String(temp).trim() !== "--";

    return (
        <g
            id={id}
            className="svg-equipment efb-status-panel-group"
            transform={`translate(${x}, ${y}) scale(${scale})`}
            onClick={() => onClick && onClick(id)}
            style={{ cursor: isEditable || onClick ? "pointer" : "default" }}
        >
            <foreignObject
                x={-width / 2}
                y={-140}
                width={width}
                height={280}
                style={{ overflow: "visible", pointerEvents: "auto" }}
            >
                <div
                    ref={cardRef}
                    className="som-status-panel-card"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onClick) onClick(id);
                    }}
                    style={{
                        background: "#ffffff",
                        border: isEditable ? "2px dashed #ef4444" : "1px solid #cbd5e1",
                        borderRadius: "8px",
                        boxShadow: "0 4px 15px rgba(15, 23, 42, 0.15)",
                        overflow: "hidden",
                        fontFamily: "'Inter', sans-serif",
                        width: "100%",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        ...style,
                    }}
                >
                    <div
                        style={{
                            background: "#0f172a",
                            color: "#ffffff",
                            padding: "6px 10px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderBottom: "2px solid #facc15",
                        }}
                    >
                        <span style={{ fontSize: "11px", fontWeight: 900, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                            {title}
                        </span>
                        <div
                            style={{
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "9px",
                                fontWeight: 900,
                                background: isFault ? "#ef4444" : isRun ? "#22c55e" : "#64748b",
                                color: "#ffffff",
                            }}
                        >
                            {isFault ? "FAULT" : isRun ? "RUNNING" : "STOPPED"}
                        </div>
                    </div>

                    <div style={{ padding: "6px 10px" }}>
                        <Row label="MODE" value={mode} valueColor="#2563eb" />
                        <Row label="LOAD" value={load} unit="%" valueColor="#d97706" />
                        <Row label="CURRENT (PV)" value={pv} unit="A" valueColor="#0f172a" />
                        <Row label="TEMPERATURE" value={temp} unit="°C" valueColor="#dc2626" />
                        <Row label="V. STEAM" value={steamValve} valueColor={steamValve === "OPEN" ? "#16a34a" : "#dc2626"} />
                        <Row label="V. DILUTION" value={dilutionValve} valueColor={dilutionValve === "OPEN" ? "#16a34a" : "#dc2626"} />
                        <Row label="SLIDING CHUTE" value={slidingChute} unit="%" />
                        <Row label="RUN TIME" value={runTime} unit="h" />
                    </div>
                </div>
            </foreignObject>
            {isHovered && popupPos && isTempValid && (
                <StatusGraphPopup
                    position={popupPos}
                    equipmentName={title}
                    type="Temperature"
                    value={parseFloat(temp) || 0}
                    unit="°C"
                    onMouseEnter={handlePopupMouseEnter}
                    onMouseLeave={handlePopupMouseLeave}
                />
            )}
        </g>
    );
};

/**
 * Component Card Mini untuk Maintenance Mode
 */
const MaintenanceCardSVG = ({ x, y, id, label, params = [], onClick, width = 160, style = {}, isEditable = false }) => {
    const { cardRef, isHovered, popupPos, handleMouseEnter, handleMouseLeave, handlePopupMouseEnter, handlePopupMouseLeave } = useAmpHover();
    const primaryParam = params[0];

    return (
        <g id={id} className="svg-equipment motor-group maintenance-card-group" onClick={() => onClick && onClick(id)}>
            <foreignObject x={x} y={y} width="250" height="120" style={{ overflow: 'visible', pointerEvents: 'auto' }}>
                <div
                    ref={cardRef}
                    className="som-maintenance-mini-card"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onClick) onClick(id);
                    }}
                    style={{ width: 'fit-content', cursor: isEditable || onClick ? 'pointer' : 'default', transition: 'all 0.2s ease', ...style }}
                >
                    <div className="som-maintenance-mini-header">
                        <div className="som-maintenance-mini-title">{label}</div>
                        <div className="som-maintenance-mini-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                            </svg>
                        </div>
                    </div>
                    <div className="som-maintenance-mini-body">
                        {params.map((p, idx) => {
                            const isNoTag = p.value === undefined || p.value === null || p.value === "" || String(p.value).trim().toLowerCase() === "no tag" || String(p.value).trim() === "--";
                            const displayVal = isNoTag ? "no tag" : p.value;
                            return (
                                <div key={idx} className="som-maintenance-mini-row">
                                    <span className="som-maintenance-mini-row-label">{p.label}</span>
                                    <span
                                        className="som-maintenance-mini-row-value"
                                        style={{
                                            color: isNoTag ? "#94a3b8" : undefined,
                                            fontStyle: isNoTag ? "italic" : "normal",
                                            fontWeight: isNoTag ? 600 : 900
                                        }}
                                    >
                                        {displayVal} {!isNoTag && p.unit && <small>{p.unit}</small>}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </foreignObject>
            {isHovered && popupPos && primaryParam && primaryParam.value && String(primaryParam.value).toLowerCase() !== 'no tag' && (
                <StatusGraphPopup
                    position={popupPos}
                    equipmentName={label}
                    type="Load Trend"
                    value={parseFloat(primaryParam.value) || 0}
                    unit={primaryParam.unit || 'A'}
                    onMouseEnter={handlePopupMouseEnter}
                    onMouseLeave={handlePopupMouseLeave}
                />
            )}
        </g>
    );
};

/**
 * Component EFB Status Card (EFB NO. 1 - 4)
 * Desain presisi seragam dengan SterilizerStatusPanelSVG di Overview Sterilizer
 */
const EFBCardSVG = ({
    id,
    x,
    y,
    efbNo = 1,
    temp = 'no tag',
    mode = 'no tag',
    vSteam = 'no tag',
    vDilution = 'no tag',
    slidingChute = 'no tag',
    runTime = 'no tag',
    width = 160,
    height = 180,
    scale = 1,
    onClick,
    isEditable = false,
    style = {}
}) => {
    const { cardRef, isHovered, popupPos, handleMouseEnter, handleMouseLeave, handlePopupMouseEnter, handlePopupMouseLeave } = useAmpHover();
    const cardWidth = width;
    const cardHeight = height;

    const Row = ({ label, value, unit, valueColor = "#ef4444" }) => {
        const isNoTag = value === undefined || value === null || value === "" || String(value).trim().toLowerCase() === "no tag" || String(value).trim() === "--";
        const finalColor = isNoTag ? "#94a3b8" : valueColor;
        const displayVal = isNoTag ? "no tag" : value;
        return (
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "2px 0",
                borderBottom: "1px solid #f1f5f9"
            }}>
                <span style={{ color: "#475569", fontSize: "10px", fontWeight: 700 }}>{label}</span>
                <div style={{ textAlign: "right", display: "flex", alignItems: "baseline", gap: "3px" }}>
                    <span style={{
                        color: finalColor,
                        fontSize: isNoTag ? "10px" : "11px",
                        fontWeight: isNoTag ? 600 : 900,
                        fontStyle: isNoTag ? "italic" : "normal"
                    }}>
                        {displayVal}
                    </span>
                    {unit && !isNoTag && (
                        <span style={{ color: "#475569", fontSize: "9px", fontWeight: 700 }}>
                            {unit}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    const isTempValid = temp && String(temp).toLowerCase() !== "no tag" && String(temp).trim() !== "--";

    return (
        <g
            id={id}
            className="svg-equipment efb-card-group"
            transform={`translate(${x}, ${y}) scale(${scale})`}
            onClick={() => onClick && onClick(id)}
            style={{ cursor: isEditable || onClick ? 'pointer' : 'default' }}
        >
            <foreignObject
                x={-cardWidth / 2}
                y={-cardHeight / 2}
                width={cardWidth}
                height={cardHeight}
                style={{ overflow: 'visible', pointerEvents: 'auto' }}
            >
                <div
                    ref={cardRef}
                    className="som-status-panel-card"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onClick) onClick(id);
                    }}
                    style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        boxShadow: "0 4px 14px rgba(15, 23, 42, 0.15)",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        width: "100%",
                        height: "100%",
                        boxSizing: "border-box",
                        fontFamily: "'Inter', sans-serif",
                        pointerEvents: "auto",
                        cursor: isEditable || onClick ? 'pointer' : 'default',
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        ...style
                    }}
                >
                    {/* Header Mewah Kuning Seragam Sterilizer */}
                    <div
                        style={{
                            background: "#facc15",
                            padding: "4.5px 8px",
                            textAlign: "center",
                            borderBottom: "1px solid #eab308",
                        }}
                    >
                        <span
                            style={{
                                fontSize: "10.5px",
                                fontWeight: 900,
                                color: "#0f172a",
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                            }}
                        >
                            EFB NO. {efbNo}
                        </span>
                    </div>

                    {/* Body List Parameters */}
                    <div style={{ padding: "4px 10px", display: "flex", flexDirection: "column", gap: "1px", flex: 1, justifyContent: "space-around" }}>
                        <Row label={`TEMP ${efbNo}`} value={temp} unit="°C" valueColor="#ef4444" />
                        <Row label="MODE" value={mode} valueColor="#0f172a" />
                        <Row label="V.STEAM" value={vSteam} unit="%" valueColor="#ef4444" />
                        <Row label="V.DILUTION" value={vDilution} unit="%" valueColor="#ef4444" />
                        <Row label="SLIDING CHUTE" value={slidingChute} unit="%" valueColor="#ef4444" />
                        <Row label="RUN TIME" value={runTime} unit="h" valueColor="#ef4444" />
                    </div>
                </div>
            </foreignObject>
            {isHovered && popupPos && isTempValid && (
                <StatusGraphPopup
                    position={popupPos}
                    equipmentName={`EFB NO. ${efbNo}`}
                    type="Temperature"
                    value={parseFloat(temp) || 0}
                    unit="°C"
                    onMouseEnter={handlePopupMouseEnter}
                    onMouseLeave={handlePopupMouseLeave}
                />
            )}
        </g>
    );
};

/**
 * Component Total Load Card (Horizontal Status Card)
 * Desain seragam dengan sistem: Card putih dengan border kuning/slate, label bold, dark pill badge & unit %
 */
export const TotalLoadCardSVG = ({
    id = "efb_total_load",
    x = 495,
    y = 990,
    label = "Total Load",
    value = "no tag",
    unit = "%",
    width = 380,
    height = 46,
    scale = 1,
    onClick,
    isEditable = false,
    style = {}
}) => {
    const { cardRef, isHovered, popupPos, handleMouseEnter, handleMouseLeave, handlePopupMouseEnter, handlePopupMouseLeave } = useAmpHover();
    const isNoTag = value === undefined || value === null || value === "" || String(value).trim().toLowerCase() === "no tag" || String(value).trim() === "--";
    const displayVal = isNoTag ? "no tag" : value;
    const num = parseFloat(value);
    const isActive = !isNoTag && !isNaN(num) && num > 0;

    return (
        <g
            id={id}
            className="svg-equipment total-load-group"
            transform={`translate(${x}, ${y}) scale(${scale})`}
            onClick={() => onClick && onClick(id)}
            style={{ cursor: isEditable || onClick ? 'pointer' : 'default' }}
        >
            <foreignObject
                x={-width / 2}
                y={-height / 2}
                width={width}
                height={height}
                style={{ overflow: 'visible', pointerEvents: 'auto' }}
            >
                <div
                    ref={cardRef}
                    className="som-total-load-card"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onClick) onClick(id);
                    }}
                    style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        boxShadow: "0 4px 14px rgba(15, 23, 42, 0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 20px",
                        width: "100%",
                        height: "100%",
                        boxSizing: "border-box",
                        fontFamily: "'Inter', sans-serif",
                        pointerEvents: "auto",
                        cursor: isEditable || onClick ? 'pointer' : 'default',
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        ...style
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                            style={{
                                width: "10px",
                                height: "10px",
                                borderRadius: "50%",
                                backgroundColor: isNoTag ? "#94a3b8" : (isActive ? "#22c55e" : "#ef4444"),
                                boxShadow: isNoTag ? "none" : (isActive ? "0 0 6px rgba(34, 197, 94, 0.8)" : "0 0 4px rgba(239, 68, 68, 0.6)")
                            }}
                        />
                        <span
                            style={{
                                fontSize: "13px",
                                fontWeight: 800,
                                color: "#0f172a",
                                letterSpacing: "0.02em",
                                textTransform: "uppercase"
                            }}
                        >
                            {label}
                        </span>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "baseline",
                            justifyContent: "center",
                            gap: "4px",
                            padding: "3px 14px",
                            background: "#ffffff",
                            border: "1.5px solid #facc15",
                            borderRadius: "6px",
                            minWidth: "65px",
                            boxShadow: "0 1px 4px rgba(250, 204, 21, 0.2)"
                        }}
                    >
                        <span
                            style={{
                                color: isNoTag ? "#94a3b8" : "#ef4444",
                                fontSize: isNoTag ? "13px" : "16px",
                                fontWeight: isNoTag ? 700 : 900,
                                fontStyle: isNoTag ? "italic" : "normal"
                            }}
                        >
                            {displayVal}
                        </span>
                        {unit && !isNoTag && (
                            <span style={{ color: "#475569", fontSize: "12px", fontWeight: 700 }}>
                                {unit}
                            </span>
                        )}
                    </div>
                </div>
            </foreignObject>
            {isHovered && popupPos && !isNoTag && (
                <StatusGraphPopup
                    position={popupPos}
                    equipmentName="EFB Total Load"
                    type="Total Load"
                    value={parseFloat(value) || 0}
                    unit={unit}
                    onMouseEnter={handlePopupMouseEnter}
                    onMouseLeave={handlePopupMouseLeave}
                />
            )}
        </g>
    );
};

/**
 * ResetRunTimeCardSVG — Card Tombol Reset Run Time untuk EFB Line
 * Desain Elegan & Premium SCADA: Background glossy, typography tegas, dan tombol 3D gold gradient
 */
export const ResetRunTimeCardSVG = ({
    id,
    x,
    y,
    label = "Reset Run Time",
    btnLabel = "RESET",
    scale = 1,
    width = 240,
    height = 38,
    onClick,
    onReset,
    isEditable = false,
    style = {}
}) => {
    return (
        <g
            id={id}
            className="svg-equipment reset-runtime-group"
            transform={`translate(${x}, ${y}) scale(${scale})`}
            onClick={() => onClick && onClick(id)}
            style={{ cursor: isEditable || onClick ? 'pointer' : 'default' }}
        >
            <foreignObject
                x={-width / 2}
                y={-height / 2}
                width={width}
                height={height}
                style={{ overflow: 'visible', pointerEvents: 'auto' }}
            >
                <div
                    className="som-reset-runtime-card"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onClick) onClick(id);
                    }}
                    style={{
                        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                        border: "1.5px solid #cbd5e1",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0,0,0,0.04)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0 12px",
                        width: "100%",
                        height: "100%",
                        boxSizing: "border-box",
                        fontFamily: "'Inter', sans-serif",
                        pointerEvents: "auto",
                        cursor: isEditable || onClick ? 'pointer' : 'default',
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        ...style
                    }}
                >
                    {/* Left Icon & Label */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                            style={{
                                width: "7px",
                                height: "7px",
                                borderRadius: "50%",
                                background: "#facc15",
                                boxShadow: "0 0 6px rgba(250, 204, 21, 0.9)",
                                border: "1px solid #eab308"
                            }}
                        />
                        <span
                            style={{
                                fontSize: "11px",
                                fontWeight: 800,
                                color: "#1e293b",
                                letterSpacing: "0.03em",
                                textTransform: "uppercase"
                            }}
                        >
                            {label}
                        </span>
                    </div>

                    {/* Right Action Button */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isEditable) {
                                if (onClick) onClick(id);
                            } else {
                                if (onReset) onReset(id);
                            }
                        }}
                        style={{
                            background: "#facc15",
                            color: "#0f172a",
                            border: "1px solid #ca8a04",
                            borderRadius: "5px",
                            padding: "4px 14px",
                            fontSize: "10.5px",
                            fontWeight: 900,
                            letterSpacing: "0.06em",
                            cursor: "pointer",
                            boxShadow: "0 2px 4px rgba(202, 138, 4, 0.3)",
                            transition: "all 0.15s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            textTransform: "uppercase"
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#eab308";
                            e.currentTarget.style.boxShadow = "0 3px 6px rgba(202, 138, 4, 0.45)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#facc15";
                            e.currentTarget.style.boxShadow = "0 2px 4px rgba(202, 138, 4, 0.3)";
                        }}
                        onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
                        onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                    >
                        {btnLabel}
                    </button>
                </div>
            </foreignObject>
        </g>
    );
};

/**
 * Component Status Motor Card (STATUS MOTOR CONVEYOR & STATUS MOTOR PUMP)
 * Desain seragam dengan EFB Status Card: Header kuning #facc15, container putih bersih, LED indikator Run/Fault
 */
export const MotorStatusCardSVG = ({
    id,
    x,
    y,
    title = "STATUS MOTOR",
    items = [], // Array of { label, key, isRun, isFault }
    width = 175,
    height = 105,
    scale = 1,
    onClick,
    onToggleMotor,
    isEditable = false,
    style = {}
}) => {
    return (
        <g
            id={id}
            className="svg-equipment motor-status-group"
            transform={`translate(${x}, ${y}) scale(${scale})`}
            onClick={() => onClick && onClick(id)}
            style={{ cursor: isEditable || onClick ? 'pointer' : 'default' }}
        >
            <foreignObject
                x={-width / 2}
                y={-height / 2}
                width={width}
                height={height}
                style={{ overflow: 'visible', pointerEvents: 'auto' }}
            >
                <div
                    className="som-motor-status-card"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onClick) onClick(id);
                    }}
                    style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        boxShadow: "0 4px 14px rgba(15, 23, 42, 0.15)",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        width: "100%",
                        height: "100%",
                        boxSizing: "border-box",
                        fontFamily: "'Inter', sans-serif",
                        pointerEvents: "auto",
                        cursor: isEditable || onClick ? 'pointer' : 'default',
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        ...style
                    }}
                >
                    {/* Header Kuning Mewah Sterilizer Style */}
                    <div
                        style={{
                            background: "#facc15",
                            padding: "5.5px 8px",
                            textAlign: "center",
                            borderBottom: "1px solid #eab308",
                        }}
                    >
                        <span
                            style={{
                                fontSize: "10.5px",
                                fontWeight: 900,
                                color: "#0f172a",
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                            }}
                        >
                            {title}
                        </span>
                    </div>

                    {/* Table Body */}
                    <div style={{ padding: "6px 12px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-around" }}>
                        {/* Table Header Row */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 34px 34px", alignItems: "center", paddingBottom: "3px", borderBottom: "1.5px solid #e2e8f0" }}>
                            <span style={{ fontSize: "10px", fontWeight: 900, color: "#0f172a", textTransform: "uppercase" }}>MOTOR</span>
                            <span style={{ fontSize: "10px", fontWeight: 900, color: "#002060", textAlign: "center", textTransform: "uppercase" }}>RUN</span>
                            <span style={{ fontSize: "10px", fontWeight: 900, color: "#002060", textAlign: "center", textTransform: "uppercase" }}>FAULT</span>
                        </div>

                        {/* Motor Rows */}
                        {items.map((item, idx) => {
                            const isRun = Boolean(item.isRun);
                            const isFault = Boolean(item.isFault);

                            return (
                                <div
                                    key={idx}
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr 34px 34px",
                                        alignItems: "center",
                                        padding: "3px 0",
                                        borderBottom: idx < items.length - 1 ? "1px solid #f1f5f9" : "none"
                                    }}
                                >
                                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
                                        {item.label}
                                    </span>

                                    {/* Run Indicator LED (Green) */}
                                    <div
                                        style={{ display: "flex", justifyContent: "center", alignItems: "center", cursor: "default" }}
                                    >
                                        <div
                                            style={{
                                                width: "12px",
                                                height: "12px",
                                                borderRadius: "50%",
                                                backgroundColor: isRun ? "#22c55e" : "#d8dee9",
                                                border: isRun ? "1.5px solid #16a34a" : "1.5px solid #cbd5e1",
                                                boxShadow: isRun ? "0 0 8px rgba(34, 197, 94, 0.9), inset 0 1px 2px #bbf7d0" : "inset 0 1px 2px rgba(0,0,0,0.1)",
                                                transition: "all 0.3s ease"
                                            }}
                                            title={isRun ? "RUNNING" : "STOPPED"}
                                        />
                                    </div>

                                    {/* Fault Indicator LED (Red) */}
                                    <div
                                        style={{ display: "flex", justifyContent: "center", alignItems: "center", cursor: "default" }}
                                    >
                                        <div
                                            style={{
                                                width: "12px",
                                                height: "12px",
                                                borderRadius: "50%",
                                                backgroundColor: isFault ? "#ef4444" : "#d8dee9",
                                                border: isFault ? "1.5px solid #dc2626" : "1.5px solid #cbd5e1",
                                                boxShadow: isFault ? "0 0 8px rgba(239, 68, 68, 0.9), inset 0 1px 2px #fecaca" : "inset 0 1px 2px rgba(0,0,0,0.1)",
                                                transition: "all 0.3s ease"
                                            }}
                                            title={isFault ? "FAULT" : "NORMAL"}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </foreignObject>
        </g>
    );
};

/**
 * Component Value Sensor Card (VALUE SENSOR)
 * Desain seragam dengan EFB Status Card: Header kuning #facc15, container putih bersih, nilai sensor dengan dark badge & unit
 */
export const ValueSensorCardSVG = ({
    id,
    x,
    y,
    title = "VALUE SENSOR",
    items = [], // Array of { label, value, unit, key }
    width = 185,
    height = 110,
    scale = 1,
    onClick,
    isEditable = false,
    style = {}
}) => {
    const { cardRef, isHovered, popupPos, handleMouseEnter, handleMouseLeave, handlePopupMouseEnter, handlePopupMouseLeave } = useAmpHover();
    const primaryItem = items.find(i => i.value && String(i.value).toLowerCase() !== 'no tag' && String(i.value).trim() !== '--') || items[0];

    return (
        <g
            id={id}
            className="svg-equipment value-sensor-group"
            transform={`translate(${x}, ${y}) scale(${scale})`}
            onClick={() => onClick && onClick(id)}
            style={{ cursor: isEditable || onClick ? 'pointer' : 'default' }}
        >
            <foreignObject
                x={-width / 2}
                y={-height / 2}
                width={width}
                height={height}
                style={{ overflow: 'visible', pointerEvents: 'auto' }}
            >
                <div
                    ref={cardRef}
                    className="som-value-sensor-card"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onClick) onClick(id);
                    }}
                    style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        boxShadow: "0 4px 14px rgba(15, 23, 42, 0.15)",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        width: "100%",
                        height: "100%",
                        boxSizing: "border-box",
                        fontFamily: "'Inter', sans-serif",
                        pointerEvents: "auto",
                        cursor: isEditable || onClick ? 'pointer' : 'default',
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        ...style
                    }}
                >
                    {/* Header Kuning Mewah Sterilizer Style */}
                    <div
                        style={{
                            background: "#facc15",
                            padding: "5.5px 8px",
                            textAlign: "center",
                            borderBottom: "1px solid #eab308",
                        }}
                    >
                        <span
                            style={{
                                fontSize: "10.5px",
                                fontWeight: 900,
                                color: "#0f172a",
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                            }}
                        >
                            {title}
                        </span>
                    </div>

                    {/* Sensor Data Rows */}
                    <div style={{ padding: "6px 12px", display: "flex", flexDirection: "column", gap: "2px", flex: 1, justifyContent: "space-around" }}>
                        {items.map((item, idx) => {
                            const isNoTag = !item.value || String(item.value).trim().toLowerCase() === "no tag" || String(item.value).trim() === "--";
                            const finalColor = isNoTag ? "#94a3b8" : (item.valueColor || "#ef4444");
                            const displayVal = isNoTag ? "no tag" : item.value;
                            return (
                                <div
                                    key={idx}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "3px 0",
                                        borderBottom: idx < items.length - 1 ? "1px solid #f1f5f9" : "none"
                                    }}
                                >
                                    <span style={{ color: "#475569", fontSize: "11px", fontWeight: 700 }}>
                                        {item.label}
                                    </span>
                                    <div style={{ textAlign: "right", display: "flex", alignItems: "baseline", gap: "4px" }}>
                                        <span style={{
                                            color: finalColor,
                                            fontSize: isNoTag ? "11px" : "12px",
                                            fontWeight: isNoTag ? 600 : 900,
                                            fontStyle: isNoTag ? "italic" : "normal"
                                        }}>
                                            {displayVal}
                                        </span>
                                        {item.unit && !isNoTag && (
                                            <span style={{ color: "#475569", fontSize: "10px", fontWeight: 700 }}>
                                                {item.unit}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </foreignObject>
            {isHovered && popupPos && primaryItem && primaryItem.value && String(primaryItem.value).toLowerCase() !== 'no tag' && (
                <StatusGraphPopup
                    position={popupPos}
                    equipmentName={primaryItem.label}
                    type="Sensor Trend"
                    value={parseFloat(primaryItem.value) || 0}
                    unit={primaryItem.unit || ''}
                    onMouseEnter={handlePopupMouseEnter}
                    onMouseLeave={handlePopupMouseLeave}
                />
            )}
        </g>
    );
};

/**
 * EfbLineDualStatusCardSVG — Status Panel Dual Section (STATUS MOTOR & VALUE SENSOR)
 * Sesuai desain SCADA: Container berbingkai kuning elegan dengan 2 seksi (Motor Conveyor Status & Nilai Sensor)
 */
export const EfbLineDualStatusCardSVG = ({
    id,
    x = 1450,
    y = 560,
    scale = 1.3,
    efbNo = 1,
    width = 390,
    height = 155,
    motorItems = [],
    sensorItems = [],
    onClick,
    onToggleMotor,
    isEditable = false,
    style = {}
}) => {
    return (
        <g
            id={id}
            className="svg-equipment efb-line-dual-group"
            transform={`translate(${x}, ${y}) scale(${scale})`}
            onClick={() => onClick && onClick(id)}
            style={{ cursor: isEditable || onClick ? 'pointer' : 'default' }}
        >
            <foreignObject
                x={-width / 2}
                y={-height / 2}
                width={width}
                height={height}
                style={{ overflow: 'visible', pointerEvents: 'auto' }}
            >
                <div
                    className="som-efb-line-dual-card"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onClick) onClick(id);
                    }}
                    style={{
                        background: "#fffef0",
                        border: isEditable ? "2px dashed #ef4444" : "2px solid #facc15",
                        borderRadius: "14px",
                        boxShadow: "0 6px 18px rgba(15, 23, 42, 0.15)",
                        padding: "10px 14px",
                        boxSizing: "border-box",
                        fontFamily: "'Inter', sans-serif",
                        pointerEvents: "auto",
                        cursor: isEditable || onClick ? 'pointer' : 'default',
                        display: "grid",
                        gridTemplateColumns: "1fr 1.15fr",
                        gap: "14px",
                        width: "100%",
                        height: "100%",
                        transition: "all 0.2s ease",
                        ...style
                    }}
                >
                    {/* --- LEFT SECTION: STATUS MOTOR --- */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {/* Header Pill */}
                        <div style={{
                            background: "#facc15",
                            borderRadius: "20px",
                            padding: "4px 8px",
                            textAlign: "center",
                            boxShadow: "0 2px 4px rgba(234, 179, 8, 0.3)",
                            border: "1px solid #eab308"
                        }}>
                            <span style={{ fontSize: "11px", fontWeight: 900, color: "#0f172a", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                STATUS MOTOR
                            </span>
                        </div>

                        {/* Table Header */}
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 32px 32px",
                            alignItems: "center",
                            padding: "2px 2px",
                            borderBottom: "1.5px solid #e2e8f0"
                        }}>
                            <span style={{ fontSize: "10.5px", fontWeight: 900, color: "#0f172a" }}>Motor</span>
                            <span style={{ fontSize: "10.5px", fontWeight: 900, color: "#0f172a", textAlign: "center" }}>Run</span>
                            <span style={{ fontSize: "10.5px", fontWeight: 900, color: "#0f172a", textAlign: "center" }}>Fault</span>
                        </div>

                        {/* Table Rows */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, justifyContent: "space-around" }}>
                            {motorItems.map((item, idx) => {
                                const isRun = Boolean(item.isRun);
                                const isFault = Boolean(item.isFault);

                                return (
                                    <div
                                        key={idx}
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: "1fr 32px 32px",
                                            alignItems: "center",
                                            padding: "2px 0"
                                        }}
                                    >
                                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
                                            {item.label}
                                        </span>

                                        {/* Run Indicator LED (Green) */}
                                        <div
                                            style={{ display: "flex", justifyContent: "center", alignItems: "center", cursor: "default" }}
                                        >
                                            <div
                                                style={{
                                                    width: "13px",
                                                    height: "13px",
                                                    borderRadius: "50%",
                                                    backgroundColor: isRun ? "#22c55e" : "#cbd5e1",
                                                    border: isRun ? "1.5px solid #16a34a" : "1.5px solid #94a3b8",
                                                    boxShadow: isRun ? "0 0 8px rgba(34, 197, 94, 0.9), inset 0 1px 2px #bbf7d0" : "inset 0 1px 2px rgba(0,0,0,0.15)",
                                                    transition: "all 0.25s ease"
                                                }}
                                                title={isRun ? "RUNNING" : "STOPPED"}
                                            />
                                        </div>

                                        {/* Fault Indicator LED (Red) */}
                                        <div
                                            style={{ display: "flex", justifyContent: "center", alignItems: "center", cursor: "default" }}
                                        >
                                            <div
                                                style={{
                                                    width: "13px",
                                                    height: "13px",
                                                    borderRadius: "50%",
                                                    backgroundColor: isFault ? "#ef4444" : "#cbd5e1",
                                                    border: isFault ? "1.5px solid #dc2626" : "1.5px solid #94a3b8",
                                                    boxShadow: isFault ? "0 0 8px rgba(239, 68, 68, 0.9), inset 0 1px 2px #fecaca" : "inset 0 1px 2px rgba(0,0,0,0.15)",
                                                    transition: "all 0.25s ease"
                                                }}
                                                title={isFault ? "FAULT" : "NORMAL"}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* --- RIGHT SECTION: VALUE SENSOR --- */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {/* Header Pill */}
                        <div style={{
                            background: "#facc15",
                            borderRadius: "20px",
                            padding: "4px 8px",
                            textAlign: "center",
                            boxShadow: "0 2px 4px rgba(234, 179, 8, 0.3)",
                            border: "1px solid #eab308"
                        }}>
                            <span style={{ fontSize: "11px", fontWeight: 900, color: "#0f172a", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                VALUE SENSOR
                            </span>
                        </div>

                        {/* Value Rows */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "5px", flex: 1, justifyContent: "space-around" }}>
                            {sensorItems.map((sensor, idx) => {
                                const isNoTag = !sensor.value || String(sensor.value).trim().toLowerCase() === "no tag" || String(sensor.value).trim() === "--";
                                return (
                                    <div
                                        key={idx}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: "8px"
                                        }}
                                    >
                                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
                                            {sensor.label}
                                        </span>

                                        {/* Value Display Box */}
                                        <div
                                            style={{
                                                background: "#0f172a",
                                                borderRadius: "4px",
                                                padding: "3px 8px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                minWidth: "75px",
                                                boxShadow: "inset 0 1px 3px rgba(0,0,0,0.4)",
                                                border: "1px solid #334155"
                                            }}
                                        >
                                            <span style={{
                                                fontSize: isNoTag ? "10.5px" : "12px",
                                                fontWeight: isNoTag ? 600 : 900,
                                                color: isNoTag ? "#94a3b8" : "#ffffff",
                                                fontStyle: isNoTag ? "italic" : "normal"
                                            }}>
                                                {isNoTag ? "no tag" : sensor.value}
                                            </span>
                                            {sensor.unit && !isNoTag && (
                                                <span style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", marginLeft: "4px" }}>
                                                    {sensor.unit}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </foreignObject>
        </g>
    );
};

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
    const [viewMode, setViewMode] = useState('process'); // 'process', 'maintenance', or 'settings'
    const [showSettings, setShowSettings] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const wtFlow = useWTFlowBuilder();

    // Dynamic SVG Viewbox based on active tab (sesuai standar Sterilizer Line & Overview)
    const getSvgViewBox = () => {
        switch (activeTab) {
            case 'efb1':
            case 'efb2':
            case 'efb3':
            case 'efb4':
                return "-100 40 2150 940";
            case 'overview':
            default:
                return "268 113 1370 892";
        }
    };

    // --- PLC CONFIG STATE & WEBSOCKET REALTIME ---
    const [configMode, setConfigMode] = useState(false);
    const [tagEdit, setTagEdit] = useState(null);
    const [tagMap, setTagMap] = useState({});
    const [availableTags, setAvailableTags] = useState([]);
    const [savingTags, setSavingTags] = useState(false);
    const [liveValues, setLiveValues] = useState({});
    const [selectedValvePositioner, setSelectedValvePositioner] = useState(null);

    // Hubungkan WebSocket PLC Store (@core/store) untuk live update tanpa delay (0ms)
    const tags = usePlcStore((state) => state.tags);
    const initSocket = usePlcStore((state) => state.initSocket);
    const isConnected = usePlcStore((state) => state.isConnected);

    useEffect(() => {
        if (initSocket) initSocket();
    }, [initSocket]);

    // Map Tag ID ke Tag Object & Name untuk akses instan O(1)
    const availableTagsMap = useMemo(() => {
        const map = {};
        for (let i = 0; i < availableTags.length; i++) {
            const t = availableTags[i];
            map[String(t.id)] = t;
        }
        return map;
    }, [availableTags]);

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

    // Global shortcut to toggle Flow Builder: Ctrl + B or Ctrl + Shift + B
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B")) {
                e.preventDefault();
                wtFlow.toggle();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [wtFlow]);

    // Fetch daftar Tag PLC yang tersedia
    useEffect(() => {
        const fetchAvailableTags = async () => {
            try {
                const res = await fetch("/api/efb-plant/plc-config/tags", { headers: authHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) setAvailableTags(data.data || []);
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
                    if (data.success) {
                        const restored = {};
                        (data.data || []).forEach((m) => { restored[`${m.equipment}__${m.signal_key}`] = String(m.tag_id); });
                        setTagMap(restored);
                    }
                }
            } catch (err) { }
        };
        loadMappings();
    }, []);

    // Smart Low-Latency HTTP Polling (Standby ketika WebSocket online, 200ms failover ketika offline)
    useEffect(() => {
        let active = true;
        let interval = null;

        const fetchLive = async () => {
            try {
                const res = await fetch("/api/efb-plant/monitor/realtime", { headers: authHeaders() });
                if (res.ok) {
                    const json = await res.json();
                    if (active && json.success) {
                        setLiveValues(json.data || {});
                    }
                }
            } catch (err) {
                console.error("Failed to fetch live monitoring data (efb-plant)", err);
            }
        };

        fetchLive();

        if (!isConnected) {
            // WebSocket terputus / belum connected: HTTP polling cepat 200ms agar responsif tanpa delay
            interval = setInterval(fetchLive, 200);
        } else {
            // WebSocket aktif: HTTP polling cadangan setiap 2 detik
            interval = setInterval(fetchLive, 2000);
        }

        return () => {
            active = false;
            if (interval) clearInterval(interval);
        };
    }, [isConnected]);

    // Helper untuk mengambil nilai live spesifik berdasarkan nama equipment & signal (O(1) lookup)
    const getLiveValue = useCallback((equipmentKey, signalKey = "MONITOR") => {
        const key = `${equipmentKey}__${signalKey}`;
        const tagId = tagMap[key];
        if (!tagId || tagId === "null" || tagId === "undefined" || tagId === "none" || tagId === "") {
            return null;
        }

        const tagObj = availableTagsMap[String(tagId)];
        const tagName = tagObj ? tagObj.tag_name : tagIdToName[tagId];

        // 1. Prioritas Utama: WebSocket store (tags)
        if (tagName && tags[tagName]?.value !== undefined && tags[tagName]?.value !== null) {
            return tags[tagName].value;
        }

        // 2. Prioritas Kedua: HTTP liveValues by tagName
        if (tagName && liveValues[tagName] !== undefined && liveValues[tagName] !== null) {
            const raw = liveValues[tagName];
            return typeof raw === 'object' && raw.value !== undefined ? raw.value : raw;
        }

        // 3. Prioritas Ketiga: HTTP liveValues by tagId
        if (liveValues[tagId] !== undefined && liveValues[tagId] !== null) {
            const raw = liveValues[tagId];
            return typeof raw === 'object' && raw.value !== undefined ? raw.value : raw;
        }

        return null;
    }, [tagMap, availableTagsMap, tagIdToName, liveValues, tags]);

    // Helper formatter nilai live untuk ditayangkan di Card & Overview
    const lv = (cardId, signalKey = "MONITOR", fallback = "no tag", decimals = 1) => {
        const key = `${cardId}__${signalKey}`;
        let tagId = tagMap[key];
        if (!tagId || tagId === "null" || tagId === "undefined" || tagId === "none" || tagId === "") {
            const altKeys = getEquivalentKeys(cardId, signalKey);
            for (const ak of altKeys) {
                if (tagMap[ak] && tagMap[ak] !== "null" && tagMap[ak] !== "undefined" && tagMap[ak] !== "none" && tagMap[ak] !== "") {
                    tagId = tagMap[ak];
                    break;
                }
            }
        }
        // JIKA BELUM ADA TAG CONFIGURATION -> return "no tag"
        if (!tagId || tagId === "null" || tagId === "undefined" || tagId === "none" || tagId === "") {
            return fallback !== undefined && fallback !== "0" && fallback !== 0 ? fallback : "no tag";
        }
        // JIKA SUDAH ADA TAG CONFIGURATION:
        let v = getLiveValue(cardId, signalKey);
        if (v === null || v === undefined || v === "") {
            const altKeys = getEquivalentKeys(cardId, signalKey);
            for (const ak of altKeys) {
                const parts = ak.split("__");
                if (parts.length === 2) {
                    v = getLiveValue(parts[0], parts[1]);
                    if (v !== null && v !== undefined && v !== "") break;
                }
            }
        }
        // Tag sudah ada di konfigurasi tetapi belum ada nilai dari PLC -> default 0 (dan sesuaikan format/mode)
        if (v === null || v === undefined || v === "") {
            if (signalKey === "MODE") return "AUTO";
            return decimals === 0 ? "0" : Number(0).toFixed(decimals);
        }
        if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
        const num = parseFloat(v);
        if (isNaN(num)) return String(v);
        if (decimals === 0) return Math.round(num);
        return +(Math.round(num + `e+${decimals}`) + `e-${decimals}`);
    };

    // --- TREND STATE & HOOKS (Initialized after lv helper to prevent TDZ error) ---
    const [showTrendSettings, setShowTrendSettings] = useState(false);
    const [trendPeriod, setTrendPeriod] = useState("5H");
    const [trendOffset, setTrendOffset] = useState(0);
    const [selectedMetric, setSelectedMetric] = useState("TEMP");
    const [currentDateTime, setCurrentDateTime] = useState(new Date());
    const [hoverData, setHoverData] = useState(null);
    const [trendData, setTrendData] = useState({
        efb1: [],
        efb2: [],
        efb3: [],
        efb4: [],
        totalLoad: [],
        resolution: 60,
    });

    // --- PID VALVE & PROCESS SIMULATION STATE ---
    // Steam PID Settings: SP default 0°C, Dilution PID Settings: SP default 0%
    const [steamPidSettings, setSteamPidSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('efb_settings_steam_pid');
            return saved ? JSON.parse(saved) : {
                1: {
                    efb1: { sp: 0, p: 0, i: 0, d: 0, min: 0, max: 0, startValue: 0 },
                    efb2: { sp: 0, p: 0, i: 0, d: 0, min: 0, max: 0, startValue: 0 },
                    efb3: { sp: 0, p: 0, i: 0, d: 0, min: 0, max: 0, startValue: 0 },
                    efb4: { sp: 0, p: 0, i: 0, d: 0, min: 0, max: 0, startValue: 0 },
                }
            };
        } catch {
            return {
                1: {
                    efb1: { sp: 0, p: 0, i: 0, d: 0, min: 0, max: 0, startValue: 0 },
                    efb2: { sp: 0, p: 0, i: 0, d: 0, min: 0, max: 0, startValue: 0 },
                    efb3: { sp: 0, p: 0, i: 0, d: 0, min: 0, max: 0, startValue: 0 },
                    efb4: { sp: 0, p: 0, i: 0, d: 0, min: 0, max: 0, startValue: 0 },
                }
            };
        }
    });

    const [dilutionPidSettings, setDilutionPidSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('efb_settings_dilution_pid');
            return saved ? JSON.parse(saved) : {
                1: {
                    efb1: { sp: 0, p: 0, i: 0, d: 0, min: 0, max: 0, startValue: 0 },
                    efb2: { sp: 0, p: 0, i: 0, d: 0, min: 0, max: 0, startValue: 0 },
                    efb3: { sp: 0, p: 0, i: 0, d: 0, min: 0, max: 0, startValue: 0 },
                    efb4: { sp: 0, p: 0, i: 0, d: 0, min: 0, max: 0, startValue: 0 },
                }
            };
        } catch {
            return {
                1: {
                    efb1: { sp: 0, p: 0, i: 0, d: 0, min: 0, max: 0, startValue: 0 },
                    efb2: { sp: 0, p: 0, i: 0, d: 0, min: 0, max: 0, startValue: 0 },
                    efb3: { sp: 0, p: 0, i: 0, d: 0, min: 0, max: 0, startValue: 0 },
                    efb4: { sp: 0, p: 0, i: 0, d: 0, min: 0, max: 0, startValue: 0 },
                }
            };
        }
    });

    // Fetch PID settings from backend
    useEffect(() => {
        const fetchPidSettings = async () => {
            try {
                const res = await fetch('/api/efb-plant/settings/all', { headers: authHeaders() });
                if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.data) {
                        if (json.data.steamPid && Object.keys(json.data.steamPid).length > 0) {
                            setSteamPidSettings(json.data.steamPid);
                            localStorage.setItem('efb_settings_steam_pid', JSON.stringify(json.data.steamPid));
                        }
                        if (json.data.dilutionPid && Object.keys(json.data.dilutionPid).length > 0) {
                            setDilutionPidSettings(json.data.dilutionPid);
                            localStorage.setItem('efb_settings_dilution_pid', JSON.stringify(json.data.dilutionPid));
                        }
                    }
                }
            } catch (err) { }
        };
        fetchPidSettings();
    }, [showSettings]);

    // Dynamic state for PID valves & process variables settings
    const [pidSimState, setPidSimState] = useState({
        efb1: { temp: 0, steamValvePct: 0, dilution: 0, dilutionValvePct: 0 },
        efb2: { temp: 0, steamValvePct: 0, dilution: 0, dilutionValvePct: 0 },
        efb3: { temp: 0, steamValvePct: 0, dilution: 0, dilutionValvePct: 0 },
        efb4: { temp: 0, steamValvePct: 0, dilution: 0, dilutionValvePct: 0 },
    });

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentDateTime(new Date());
        }, 1000 * 60);
        return () => clearInterval(timer);
    }, []);

    const getTrendTimeRange = useCallback(() => {
        const now = Date.now();
        let durationMs = 5 * 60 * 60 * 1000;
        let stepMs = 1 * 60 * 60 * 1000;

        if (trendPeriod === "2H") {
            durationMs = 2 * 60 * 60 * 1000;
            stepMs = 1 * 60 * 60 * 1000;
        } else if (trendPeriod === "8H") {
            durationMs = 8 * 60 * 60 * 1000;
            stepMs = 1 * 60 * 60 * 1000;
        } else if (trendPeriod === "D") {
            durationMs = 24 * 60 * 60 * 1000;
            stepMs = 6 * 60 * 60 * 1000;
        }

        const end = now - (trendOffset * stepMs);
        const start = end - durationMs;
        return { start, end };
    }, [trendPeriod, trendOffset]);

    const getXAxisLabels = useCallback((period) => {
        const labels = [];
        const { start } = getTrendTimeRange();
        if (period === "2H") {
            for (let i = 0; i <= 8; i++) {
                const t = new Date(start + i * 15 * 60 * 1000);
                labels.push(t.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":"));
            }
        } else if (period === "5H") {
            for (let i = 0; i <= 10; i++) {
                const t = new Date(start + i * 30 * 60 * 1000);
                labels.push(t.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":"));
            }
        } else if (period === "8H") {
            for (let i = 0; i <= 8; i++) {
                const t = new Date(start + i * 60 * 60 * 1000);
                labels.push(t.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":"));
            }
        } else if (period === "D") {
            for (let i = 0; i <= 12; i++) {
                const t = new Date(start + i * 2 * 60 * 60 * 1000);
                labels.push(t.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":"));
            }
        }
        return labels;
    }, [getTrendTimeRange]);

    const getResolution = useCallback((period) =>
        period === "2H" ? 120 : period === "5H" ? 300 : period === "8H" ? 240 : period === "D" ? 288 : 300
        , []);

    // Fallback simulation when database logs are empty (uses real live PLC values as baseline, 0 if no tag/offline)
    const generateFallbackTrend = useCallback((resolution, metric) => {
        const genLine = (base, variance = 0.2) => {
            const arr = [];
            let val = base;
            for (let i = 0; i < resolution; i++) {
                if (base === 0) {
                    arr.push(0);
                    continue;
                }
                val += (Math.random() - 0.48) * variance;
                const maxVal = metric === 'PV' ? 120 : metric === 'TEMP' ? 250 : metric === 'FLOW' ? 5.8 : 100;
                const minVal = metric === 'FLOW' ? 0.4 : 0;
                val = Math.max(minVal, Math.min(maxVal, val));
                arr.push(parseFloat(val.toFixed(1)));
            }
            return arr;
        };

        if (metric === 'PV') {
            const p1 = parseFloat(lv('efb_no_1', 'PV', '0', 1)) || 0;
            const p2 = parseFloat(lv('efb_no_2', 'PV', '0', 1)) || 0;
            const p3 = parseFloat(lv('efb_no_3', 'PV', '0', 1)) || 0;
            const p4 = parseFloat(lv('efb_no_4', 'PV', '0', 1)) || 0;
            return {
                efb1: genLine(p1, 0.5),
                efb2: genLine(p2, 0.5),
                efb3: genLine(p3, 0.5),
                efb4: genLine(p4, 0.5),
                totalLoad: genLine((p1 + p2 + p3 + p4) / 4, 0.5),
                resolution,
            };
        } else if (metric === 'TEMP') {
            const t1 = parseFloat(lv('efb1_card', 'TEMP', lv('temp1', 'MONITOR', '0', 1), 1)) || 0;
            const t2 = parseFloat(lv('efb2_card', 'TEMP', lv('temp2', 'MONITOR', '0', 1), 1)) || 0;
            const t3 = parseFloat(lv('efb3_card', 'TEMP', lv('temp3', 'MONITOR', '0', 1), 1)) || 0;
            const t4 = parseFloat(lv('efb4_card', 'TEMP', lv('temp4', 'MONITOR', '0', 1), 1)) || 0;
            return {
                efb1: genLine(t1, 0.2),
                efb2: genLine(t2, 0.2),
                efb3: genLine(t3, 0.2),
                efb4: genLine(t4, 0.2),
                totalLoad: genLine((t1 + t2 + t3 + t4) / 4, 0.2),
                resolution,
            };
        } else if (metric === 'FLOW') {
            const f1 = parseFloat(lv('water_flow', 'MONITOR', '0', 1)) || 0;
            const f2 = parseFloat(lv('oil_flow', 'MONITOR', '0', 1)) || 0;
            return {
                efb1: genLine(f1, 0.1),
                efb2: genLine(f2, 0.1),
                efb3: genLine(0, 0),
                efb4: genLine(0, 0),
                totalLoad: genLine((f1 + f2) / 2, 0.1),
                resolution,
            };
        } else {
            const l1 = parseFloat(lv('efb_no_1', 'LOAD', '0', 1)) || 0;
            const l2 = parseFloat(lv('efb_no_2', 'LOAD', '0', 1)) || 0;
            const l3 = parseFloat(lv('efb_no_3', 'LOAD', '0', 1)) || 0;
            const l4 = parseFloat(lv('efb_no_4', 'LOAD', '0', 1)) || 0;
            return {
                efb1: genLine(l1, 0.5),
                efb2: genLine(l2, 0.5),
                efb3: genLine(l3, 0.5),
                efb4: genLine(l4, 0.5),
                totalLoad: genLine((l1 + l2 + l3 + l4) / 4, 0.5),
                resolution,
            };
        }
    }, [lv]);

    // Fetch Historical Trend Data
    useEffect(() => {
        let active = true;
        const fetchTrendData = async () => {
            try {
                const { start, end } = getTrendTimeRange();
                const res = await fetch(`/api/efb-plant/monitor/historical?start=${start}&end=${end}&period=${trendPeriod}&metric=${selectedMetric}`, {
                    headers: authHeaders(),
                });
                if (res.ok) {
                    const json = await res.json();
                    if (active && json.success && json.data) {
                        const hasData = Array.isArray(json.data.efb1) && json.data.efb1.length > 0;
                        if (hasData) {
                            setTrendData(json.data);
                            return;
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch historical trend data", err);
            }

            if (active) {
                const resCount = getResolution(trendPeriod);
                setTrendData(generateFallbackTrend(resCount, selectedMetric));
            }
        };

        fetchTrendData();
        let interval;
        if (trendOffset === 0) {
            interval = setInterval(fetchTrendData, 10000);
        }
        return () => {
            active = false;
            if (interval) clearInterval(interval);
        };
    }, [trendPeriod, trendOffset, selectedMetric, getTrendTimeRange, getResolution, generateFallbackTrend]);

    const handleTrendMouseMove = (e) => {
        const svg = e.currentTarget;
        const rect = svg.getBoundingClientRect();
        const x = e.clientX - rect.left;

        const padding = 15;
        const plotWidth = rect.width - padding * 2;
        const relativeX = Math.max(0, Math.min(plotWidth, x - padding));

        const res = trendData?.resolution || getResolution(trendPeriod);
        const index = Math.round((relativeX / plotWidth) * (res - 1));
        const safeIndex = Math.max(0, Math.min(index, res - 1));

        const { start, end } = getTrendTimeRange();
        const timeAtPoint = new Date(start + (safeIndex / (res - 1)) * (end - start));
        const formattedTime = `${timeAtPoint.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit" })} ${timeAtPoint.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).replace(/\./g, ":")}`;

        const v1 = trendData?.efb1?.[safeIndex] ?? 0;
        const v2 = trendData?.efb2?.[safeIndex] ?? 0;
        const v3 = trendData?.efb3?.[safeIndex] ?? 0;
        const v4 = trendData?.efb4?.[safeIndex] ?? 0;

        setHoverData({
            index: safeIndex,
            left: x,
            timestamp: formattedTime,
            values: [v1, v2, v3, v4],
        });
    };

    const handleTrendMouseLeave = () => {
        setHoverData(null);
    };

    // Helper untuk memeriksa apakah equipment sudah dimapping PLC (termasuk sinkronisasi dengan Overview)
    const checkMapping = useCallback((id, signalKey) => {
        if (!tagMap) return false;
        const altKeys = getEquivalentKeys(id, signalKey);
        for (const k of altKeys) {
            if (signalKey || k.includes("__")) {
                if (tagMap[k] && tagMap[k] !== "null" && tagMap[k] !== "undefined" && tagMap[k] !== "" && tagMap[k] !== "none") {
                    return true;
                }
            } else {
                const match = k.match(/\d+/);
                const n = match ? match[0] : null;

                // Khusus Press Data Card (efb_no_X atau single_efb_X_press): hanya cek signal STATUS, LOAD, PV
                if (n && (k.startsWith('efb_no_') || k.includes('press'))) {
                    const pressSignals = ['STATUS', 'LOAD', 'PV'];
                    const hasPressTag = pressSignals.some((sig) => {
                        const directKey = `${k}__${sig}`;
                        if (tagMap[directKey] && tagMap[directKey] !== "null" && tagMap[directKey] !== "undefined" && tagMap[directKey] !== "" && tagMap[directKey] !== "none") {
                            return true;
                        }
                        const altSigKeys = getEquivalentKeys(k, sig);
                        return altSigKeys.some((ask) => tagMap[ask] && tagMap[ask] !== "null" && tagMap[ask] !== "undefined" && tagMap[ask] !== "" && tagMap[ask] !== "none");
                    });
                    if (hasPressTag) return true;
                    continue;
                }

                // Khusus EFB Card (efbX_card): hanya cek signal TEMP, MODE, V_STEAM, V_DILUTION, SLIDING_CHUTE, RUN_TIME
                if (n && k.includes('card')) {
                    const cardSignals = ['TEMP', 'MODE', 'V_STEAM', 'V_DILUTION', 'SLIDING_CHUTE', 'RUN_TIME'];
                    const hasCardTag = cardSignals.some((sig) => {
                        const directKey = `${k}__${sig}`;
                        if (tagMap[directKey] && tagMap[directKey] !== "null" && tagMap[directKey] !== "undefined" && tagMap[directKey] !== "" && tagMap[directKey] !== "none") {
                            return true;
                        }
                        const altSigKeys = getEquivalentKeys(k, sig);
                        return altSigKeys.some((ask) => tagMap[ask] && tagMap[ask] !== "null" && tagMap[ask] !== "undefined" && tagMap[ask] !== "" && tagMap[ask] !== "none");
                    });
                    if (hasCardTag) return true;
                    continue;
                }

                // Khusus Motor Conveyor Card
                if (k.includes('motor_conveyor')) {
                    const convSignals = ['CONV_IN', 'CONV_OUT'];
                    const hasConvTag = convSignals.some((sig) => {
                        const altSigKeys = getEquivalentKeys(k, sig);
                        return altSigKeys.some((ask) => tagMap[ask] && tagMap[ask] !== "null" && tagMap[ask] !== "undefined" && tagMap[ask] !== "" && tagMap[ask] !== "none");
                    });
                    if (hasConvTag) return true;
                    continue;
                }

                // Khusus Motor Pump Card
                if (k.includes('motor_pump')) {
                    const pumpSignals = ['PUMP1', 'PUMP2'];
                    const hasPumpTag = pumpSignals.some((sig) => {
                        const altSigKeys = getEquivalentKeys(k, sig);
                        return altSigKeys.some((ask) => tagMap[ask] && tagMap[ask] !== "null" && tagMap[ask] !== "undefined" && tagMap[ask] !== "" && tagMap[ask] !== "none");
                    });
                    if (hasPumpTag) return true;
                    continue;
                }

                const has = Object.keys(tagMap).some(
                    (mapKey) => (mapKey === k || mapKey.startsWith(`${k}__`)) && tagMap[mapKey] && tagMap[mapKey] !== "null" && tagMap[mapKey] !== "undefined" && tagMap[mapKey] !== "" && tagMap[mapKey] !== "none"
                );
                if (has) return true;
            }
        }
        return false;
    }, [tagMap]);

    // Helper developer style (border biru solid 2.5px jika sudah mapped, merah dashed 2px jika belum) sesuai standar Sterilizer
    const getDeveloperStyle = useCallback((id, signalKey) => {
        if (!configMode) return {};
        const hasMapping = checkMapping(id, signalKey);
        return {
            outline: hasMapping ? "2.5px solid #3b82f6" : "2px dashed #ef4444",
            boxShadow: hasMapping ? "0 0 8px rgba(59, 130, 246, 0.6)" : "0 0 8px rgba(239, 68, 68, 0.6)",
            cursor: "pointer",
        };
    }, [configMode, checkMapping]);

    // Handler untuk membuka modal konfig tag PLC
    const handleTagEditRequest = (id, subs = [], signals = null) => {
        setTagEdit({ targetId: id, subs, signals, pos: { top: 0, left: 0 } });
    };

    // Handler untuk menyimpan hasil konfigurasi tag PLC
    const handleTagSave = async (updatedTags, editData) => {
        setSavingTags(true);
        try {
            const mappings = [];
            const mergedTags = { ...updatedTags };
            for (const [key, tagId] of Object.entries(updatedTags)) {
                const parts = key.split("__");
                if (parts.length !== 2) continue;
                const parsedTagId = tagId ? parseInt(tagId, 10) : null;
                mappings.push({ station: "EFB-PLANT", equipment: parts[0], signal_key: parts[1], tag_id: parsedTagId });

                // Sinkronisasi otomatis ke semua key peralatan padanannya (Overview & Single Line)
                const altKeys = getEquivalentKeys(parts[0], parts[1]);
                for (const ak of altKeys) {
                    const akParts = ak.split("__");
                    if (akParts.length === 2) {
                        mappings.push({ station: "EFB-PLANT", equipment: akParts[0], signal_key: akParts[1], tag_id: parsedTagId });
                        mergedTags[ak] = tagId || "";
                    }
                }
            }
            if (mappings.length > 0) {
                await fetch("/api/efb-plant/plc-config/station-mappings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...authHeaders() },
                    body: JSON.stringify({ mappings }),
                });
            }
            setTagMap((prev) => ({ ...prev, ...mergedTags }));
            setTagEdit(null);
        } catch (err) {
            console.error("Failed to save tag configuration", err);
            alert("Failed to save tag configuration.");
        } finally {
            setSavingTags(false);
        }
    };

    // Handler klik pada peralatan
    const handleEquipmentClick = (id, subs = [], customSignals = null) => {
        if (configMode) {
            handleTagEditRequest(id, subs, customSignals);
            return;
        }
        console.log(`Equipment clicked: ${id}`);
    };

    const getEfbSignals = (no) => [
        { key: "TEMP", label: `Temp ${no}` },
        { key: "MODE", label: "Mode" },
        { key: "V_STEAM", label: "V.Steam" },
        { key: "V_DILUTION", label: "V.Dilution" },
        { key: "SLIDING_CHUTE", label: "Sliding Chute" },
        { key: "RUN_TIME", label: "Run Time" },
    ];

    // State override / simulasi status saat indikator diklik
    const [simulatedStatus, setSimulatedStatus] = useState({});

    // Helper format status valve sesuai standar PLC EFB Plant:
    // 1 / true = OPEN (Hijau), 0 / false = CLOSE (Merah)
    const formatValveStatus = (rawVal) => {
        if (rawVal === undefined || rawVal === null) return "No Tag";
        if (typeof rawVal === "boolean") {
            return rawVal ? "OPEN" : "CLOSE";
        }
        const str = String(rawVal).trim().toLowerCase();
        if (str === "no tag" || str === "--" || str === "" || str === "none" || str === "null" || str === "undefined") {
            return "No Tag";
        }
        if (str === "true" || str === "1" || str === "open" || str === "run" || str === "on") return "OPEN";
        if (str === "false" || str === "0" || str === "close" || str === "stop" || str === "off" || str === "fault") return "CLOSE";
        const num = parseFloat(rawVal);
        if (!isNaN(num)) {
            if (num === 1 || num >= 0.5) return "OPEN";
            if (num === 0 || num < 0.5) return "CLOSE";
        }
        return "CLOSE";
    };

    // Helper evaluasi status valve (OPEN = Hijau, CLOSE = Merah, No Tag = Abu-abu)
    // Sinkronisasi otomatis antara Overview dan Single Line EFB 1 - 4
    const getValveStatus = (equipmentKey, signalKey = 'VALVE', fallback = '0') => {
        const fullKey = `${equipmentKey}__${signalKey}`;

        // Alternate keys untuk sinkronisasi otomatis antara Overview dan Single Line views
        const alternateKeys = [fullKey];
        const match = equipmentKey.match(/\d+/);
        const n = match ? match[0] : null;
        if (n) {
            if (signalKey === 'STEAM') {
                alternateKeys.push(
                    `valve_press_${n}_steam__STEAM`,
                    `valve_press_${n}_steam__STATUS`,
                    `valve_press_${n}_steam__MONITOR`,
                    `valve_press_${n}_steam_single__STEAM`,
                    `valve_press_${n}_steam_single__STATUS`,
                    `valve_press_${n}_steam`,
                    `valve_press_${n}_steam_single`,
                    `efb_no_${n}__STEAM`
                );
            } else if (signalKey === 'DILUTION') {
                alternateKeys.push(
                    `valve_press_${n}_dilution__DILUTION`,
                    `valve_press_${n}_dilution__STATUS`,
                    `valve_press_${n}_dilution__MONITOR`,
                    `valve_press_${n}_dilution_single__DILUTION`,
                    `valve_press_${n}_dilution_single__STATUS`,
                    `valve_press_${n}_dilution`,
                    `valve_press_${n}_dilution_single`,
                    `efb_no_${n}__DILUTION`
                );
            }
        }

        // 1. Cek manual simulation override jika diklik di UI
        for (const k of alternateKeys) {
            if (simulatedStatus[k] !== undefined) {
                const sim = simulatedStatus[k];
                const isOpen = sim === '1' || sim === 1 || sim === true || String(sim).toLowerCase() === 'open' || String(sim).toLowerCase() === 'run' || String(sim).toLowerCase() === 'true';
                return {
                    rawVal: sim,
                    status: isOpen ? 'OPEN' : 'CLOSE',
                    isNoTag: false,
                    isOpen: isOpen,
                    isClose: !isOpen,
                    colorFilter: isOpen ? 'url(#tint-green)' : 'url(#tint-red)',
                };
            }
        }
        if (simulatedStatus[equipmentKey] !== undefined) {
            const sim = simulatedStatus[equipmentKey];
            const isOpen = sim === '1' || sim === 1 || sim === true || String(sim).toLowerCase() === 'open' || String(sim).toLowerCase() === 'run' || String(sim).toLowerCase() === 'true';
            return {
                rawVal: sim,
                status: isOpen ? 'OPEN' : 'CLOSE',
                isNoTag: false,
                isOpen: isOpen,
                isClose: !isOpen,
                colorFilter: isOpen ? 'url(#tint-green)' : 'url(#tint-red)',
            };
        }

        // 2. Cari tag mapping yang cocok
        let resolvedKey = null;
        let hasTag = null;
        for (const k of alternateKeys) {
            if (tagMap[k] && tagMap[k] !== 'null' && tagMap[k] !== 'undefined' && tagMap[k] !== 'none' && tagMap[k] !== '') {
                resolvedKey = k;
                hasTag = tagMap[k];
                break;
            }
        }

        let rawVal = null;
        if (resolvedKey) {
            const [eqName, sigName] = resolvedKey.split('__');
            rawVal = getLiveValue(eqName, sigName);
        }

        if (!hasTag || !resolvedKey) {
            return {
                rawVal: "0",
                status: "CLOSE",
                isNoTag: true,
                isOpen: false,
                isClose: true,
                colorFilter: "url(#tint-red)",
            };
        }

        if (rawVal === null || rawVal === undefined) {
            rawVal = fallback;
        }

        const status = formatValveStatus(rawVal);
        const isOpen = status === 'OPEN';

        return {
            rawVal,
            status,
            isNoTag: !hasTag,
            isOpen,
            isClose: !isOpen,
            colorFilter: isOpen ? 'url(#tint-green)' : 'url(#tint-red)',
        };
    };

    const handleToggleValveStatus = (equipmentKey, signalKey, explicitVal) => {
        const fullKey = signalKey ? `${equipmentKey}__${signalKey}` : equipmentKey;
        setSimulatedStatus(prev => {
            let nextVal = '1';
            if (explicitVal !== undefined) {
                nextVal = explicitVal;
            } else {
                let current = prev[fullKey];
                if (current === undefined) {
                    let defaultFallback = '0';
                    if (equipmentKey === 'efb_no_1' && signalKey === 'STEAM') defaultFallback = '1';
                    if (equipmentKey === 'efb_no_2' && signalKey === 'DILUTION') defaultFallback = '1';
                    if (equipmentKey === 'efb_no_3') defaultFallback = '1';
                    current = lv(equipmentKey, signalKey, defaultFallback, 0);
                }
                const status = formatValveStatus(current);
                const isCurrentlyOpen = status === 'OPEN';
                nextVal = isCurrentlyOpen ? '0' : '1';
            }

            const match = equipmentKey.match(/\d+/);
            const n = match ? match[0] : null;
            const extra = {};
            if (n) {
                if (signalKey === 'STEAM') {
                    extra[`valve_press_${n}_steam__STEAM`] = nextVal;
                    extra[`valve_press_${n}_steam_single__STEAM`] = nextVal;
                    extra[`valve_press_${n}_steam`] = nextVal;
                    extra[`valve_press_${n}_steam_single`] = nextVal;
                    extra[`efb_no_${n}__STEAM`] = nextVal;
                } else if (signalKey === 'DILUTION') {
                    extra[`valve_press_${n}_dilution__DILUTION`] = nextVal;
                    extra[`valve_press_${n}_dilution_single__DILUTION`] = nextVal;
                    extra[`valve_press_${n}_dilution`] = nextVal;
                    extra[`valve_press_${n}_dilution_single`] = nextVal;
                    extra[`efb_no_${n}__DILUTION`] = nextVal;
                }
            }

            return {
                ...prev,
                [fullKey]: nextVal,
                ...extra,
            };
        });
    };

    const handleTogglePressStatus = (pressId, targetState) => {
        const match = String(pressId).match(/\d+/);
        const globalId = match ? `efb_no_${match[0]}` : pressId;
        setSimulatedStatus(prev => {
            const current = prev[pressId] !== undefined ? prev[pressId] : prev[globalId];
            let nextVal = '1';
            if (targetState === 'FAULT') {
                nextVal = current === '0' ? '1' : '0';
            } else {
                nextVal = current === '1' ? '0' : '1';
            }
            return {
                ...prev,
                [pressId]: nextVal,
                [globalId]: nextVal
            };
        });
    };

    const handleToggleMotorStatus = (cardId, motorKey, targetState) => {
        // Map item label or key to signal key
        const sig = motorKey.includes('Conveyor In') || motorKey === 'CONV_IN' ? 'CONV_IN'
            : motorKey.includes('Conveyor Out') || motorKey === 'CONV_OUT' ? 'CONV_OUT'
                : motorKey.includes('Pump 1') || motorKey === 'PUMP1' ? 'PUMP1'
                    : motorKey.includes('Pump 2') || motorKey === 'PUMP2' ? 'PUMP2'
                        : motorKey;
        const fullKey = `${cardId}__${sig}`;
        setSimulatedStatus(prev => {
            const current = prev[fullKey] !== undefined ? prev[fullKey] : (prev[`motor_conveyor__${sig}`] !== undefined ? prev[`motor_conveyor__${sig}`] : prev[`motor_pump__${sig}`]);
            let nextVal = '1';
            if (targetState === 'FAULT') {
                nextVal = current === '0' ? '1' : '0';
            } else {
                nextVal = current === '1' ? '0' : '1';
            }
            return {
                ...prev,
                [fullKey]: nextVal,
                [`motor_conveyor__${sig}`]: nextVal,
                [`single_efb_1_motor_conveyor__${sig}`]: nextVal,
                [`single_efb_2_motor_conveyor__${sig}`]: nextVal,
                [`single_efb_3_motor_conveyor__${sig}`]: nextVal,
                [`single_efb_4_motor_conveyor__${sig}`]: nextVal,
                [`motor_pump__${sig}`]: nextVal,
            };
        });
    };

    // Helper status motor / press: 1 = RUN (Green LED), 0 = FAULT (Red LED) sesuai ketentuan PLC EFB Plant
    // Sinkronisasi otomatis antara Overview dan Single Line EFB 1 - 4 (Default FAULT jika tidak run / belum terhubung)
    const getMotorStatus = (equipmentKey, signalKey = 'STATUS', fallback = '0') => {
        const fullKey = `${equipmentKey}__${signalKey}`;

        // Fallback key untuk sinkronisasi otomatis antara overview & single-line view
        let alternateKeys = [fullKey, `${equipmentKey}__${signalKey}_RUN`];
        if (equipmentKey.includes('motor_conveyor')) {
            alternateKeys.push(
                `motor_conveyor__${signalKey}`,
                `single_efb_1_motor_conveyor__${signalKey}`,
                `single_efb_2_motor_conveyor__${signalKey}`,
                `single_efb_3_motor_conveyor__${signalKey}`,
                `single_efb_4_motor_conveyor__${signalKey}`
            );
        } else if (equipmentKey.includes('motor_pump')) {
            alternateKeys.push(
                `motor_pump__${signalKey}`,
                `single_efb_1_motor_pump__${signalKey}`,
                `single_efb_2_motor_pump__${signalKey}`
            );
        }

        // 1. Cek manual simulation override jika sedang diklik user di UI
        for (const k of alternateKeys) {
            if (simulatedStatus[k] !== undefined) {
                const sim = simulatedStatus[k];
                const isR = sim === '1' || sim === 1 || sim === true || String(sim).toLowerCase() === 'run';
                return { isRun: isR, isFault: !isR };
            }
        }
        if (simulatedStatus[equipmentKey] !== undefined) {
            const sim = simulatedStatus[equipmentKey];
            const isR = sim === '1' || sim === 1 || sim === true || String(sim).toLowerCase() === 'run';
            return { isRun: isR, isFault: !isR };
        }

        // 2. Cari tag mapping yang cocok (termasuk sinkronisasi alternate keys)
        let resolvedKey = null;
        let hasTag = null;
        for (const k of alternateKeys) {
            if (tagMap[k] && tagMap[k] !== 'null' && tagMap[k] !== 'undefined' && tagMap[k] !== 'none' && tagMap[k] !== '') {
                resolvedKey = k;
                hasTag = tagMap[k];
                break;
            }
        }

        if (!hasTag) {
            // Belum dimapping ke tag PLC -> Default FAULT (isFault: true, isRun: false)
            return { isRun: false, isFault: true, noTag: true };
        }

        // 3. Ambil data live langsung dari getLiveValue menggunakan resolvedKey
        const [eqName, sigName] = resolvedKey.split('__');
        let raw = getLiveValue(eqName, sigName);

        // Jika ada tag terhubung tapi PLC belum merespon nilai
        if (raw === null || raw === undefined) {
            raw = fallback;
        }

        if (raw === null || raw === undefined || raw === 'no tag' || raw === '--' || raw === '') {
            return { isRun: false, isFault: true, noTag: true };
        }

        // 4. Evaluasi nilai Boolean (false = FAULT, true = RUN)
        if (typeof raw === 'boolean') {
            return {
                isRun: raw === true,
                isFault: raw === false,
            };
        }

        // 5. Evaluasi nilai Numerik (0 = FAULT, 1 = RUN)
        const num = parseFloat(raw);
        if (!isNaN(num)) {
            if (num === 1 || num === 1.0) {
                return { isRun: true, isFault: false };
            }
            if (num === 0 || num === 0.0) {
                return { isRun: false, isFault: true };
            }
        }

        // 6. Evaluasi nilai String
        const s = String(raw).trim().toLowerCase();
        if (s === '1' || s === 'true' || s === 'run' || s === 'running' || s === 'on') {
            return { isRun: true, isFault: false };
        }
        if (s === '0' || s === 'false' || s === 'fault' || s === 'stop' || s === 'stopped' || s === 'trip' || s === 'off' || s === 'alarm') {
            return { isRun: false, isFault: true };
        }

        return { isRun: false, isFault: true };
    };

    // Motor Conveyor Signals (1 tag per conveyor - default FAULT '0')
    const convInStatus = getMotorStatus('motor_conveyor', 'CONV_IN', '0');
    const convOutStatus = getMotorStatus('motor_conveyor', 'CONV_OUT', '0');

    // Motor Pump Signals (1 tag per pump - default FAULT '0')
    const pump1Status = getMotorStatus('motor_pump', 'PUMP1', '0');
    const pump2Status = getMotorStatus('motor_pump', 'PUMP2', '0');

    // Press 1 - 4 Signals (Single STATUS tag -> Run/Fault, Load, PV - default 'no tag')
    const press1Status = getMotorStatus('efb_no_1', 'STATUS', '0');
    const press1LoadVal = lv('efb_no_1', 'LOAD', 'no tag', 0);
    const press1PvVal = lv('efb_no_1', 'PV', 'no tag', 0);

    const press2Status = getMotorStatus('efb_no_2', 'STATUS', '0');
    const press2LoadVal = lv('efb_no_2', 'LOAD', 'no tag', 0);
    const press2PvVal = lv('efb_no_2', 'PV', 'no tag', 0);

    const press3Status = getMotorStatus('efb_no_3', 'STATUS', '0');
    const press3LoadVal = lv('efb_no_3', 'LOAD', 'no tag', 0);
    const press3PvVal = lv('efb_no_3', 'PV', 'no tag', 0);

    const press4Status = getMotorStatus('efb_no_4', 'STATUS', '0');
    const press4LoadVal = lv('efb_no_4', 'LOAD', 'no tag', 0);
    const press4PvVal = lv('efb_no_4', 'PV', 'no tag', 0);

    // ==========================================
    // LOGIC & STATUS VALVE PRESS 1 - 4 & BLOWDOWN
    // Sesuai ketentuan PLC: 1 = OPEN (Hijau), 0 = CLOSE (Merah)
    // Default fallback '0' (CLOSE)
    // ==========================================
    // Blow-Down Temp Control Valve
    const blowdownValveStatus = getValveStatus('blowdown_temp', 'MONITOR', '0');
    const isBlowdownTempActive = blowdownValveStatus.isOpen;

    // Press 1 (Steam & Dilution)
    const press1SteamValveStatus = getValveStatus('efb_no_1', 'STEAM', '0');
    const isPress1SteamActive = press1SteamValveStatus.isOpen;
    const press1DilutionValveStatus = getValveStatus('efb_no_1', 'DILUTION', '0');
    const isPress1DilutionActive = press1DilutionValveStatus.isOpen;

    // Press 2 (Steam & Dilution)
    const press2SteamValveStatus = getValveStatus('efb_no_2', 'STEAM', '0');
    const isPress2SteamActive = press2SteamValveStatus.isOpen;
    const press2DilutionValveStatus = getValveStatus('efb_no_2', 'DILUTION', '0');
    const isPress2DilutionActive = press2DilutionValveStatus.isOpen;

    // Press 3 (Steam & Dilution)
    const press3SteamValveStatus = getValveStatus('efb_no_3', 'STEAM', '0');
    const isPress3SteamActive = press3SteamValveStatus.isOpen;
    const press3DilutionValveStatus = getValveStatus('efb_no_3', 'DILUTION', '0');
    const isPress3DilutionActive = press3DilutionValveStatus.isOpen;

    // Press 4 (Steam & Dilution)
    const press4SteamValveStatus = getValveStatus('efb_no_4', 'STEAM', '0');
    const isPress4SteamActive = press4SteamValveStatus.isOpen;
    const press4DilutionValveStatus = getValveStatus('efb_no_4', 'DILUTION', '0');
    const isPress4DilutionActive = press4DilutionValveStatus.isOpen;

    // EFB NO. 1 - 4 Overview Card Values (Default 'no tag' jika belum di-mapping)
    const efb1Temp = lv('efb1_card', 'TEMP', lv('temp1', 'MONITOR', 'no tag', 1), 1);
    const efb1Mode = lv('efb1_card', 'MODE', 'no tag');
    const efb1Steam = lv('efb1_card', 'V_STEAM', 'no tag', 0);
    const efb1Dilution = lv('efb1_card', 'V_DILUTION', 'no tag', 0);
    const efb1SlidingChute = lv('efb1_card', 'SLIDING_CHUTE', lv('efb_no_1', 'DAMPER', 'no tag', 0), 0);
    const efb1RunTime = lv('efb1_card', 'RUN_TIME', 'no tag', 0);

    const efb2Temp = lv('efb2_card', 'TEMP', lv('temp2', 'MONITOR', 'no tag', 1), 1);
    const efb2Mode = lv('efb2_card', 'MODE', 'no tag');
    const efb2Steam = lv('efb2_card', 'V_STEAM', 'no tag', 0);
    const efb2Dilution = lv('efb2_card', 'V_DILUTION', 'no tag', 0);
    const efb2SlidingChute = lv('efb2_card', 'SLIDING_CHUTE', lv('efb_no_2', 'DAMPER', 'no tag', 0), 0);
    const efb2RunTime = lv('efb2_card', 'RUN_TIME', 'no tag', 0);

    const efb3Temp = lv('efb3_card', 'TEMP', lv('temp3', 'MONITOR', 'no tag', 1), 1);
    const efb3Mode = lv('efb3_card', 'MODE', 'no tag');
    const efb3Steam = lv('efb3_card', 'V_STEAM', 'no tag', 0);
    const efb3Dilution = lv('efb3_card', 'V_DILUTION', 'no tag', 0);
    const efb3SlidingChute = lv('efb3_card', 'SLIDING_CHUTE', lv('efb_no_3', 'DAMPER', 'no tag', 0), 0);
    const efb3RunTime = lv('efb3_card', 'RUN_TIME', 'no tag', 0);

    const efb4Temp = lv('efb4_card', 'TEMP', lv('temp4', 'MONITOR', 'no tag', 1), 1);
    const efb4Mode = lv('efb4_card', 'MODE', 'no tag');
    const efb4Steam = lv('efb4_card', 'V_STEAM', 'no tag', 0);
    const efb4Dilution = lv('efb4_card', 'V_DILUTION', 'no tag', 0);
    const efb4SlidingChute = lv('efb4_card', 'SLIDING_CHUTE', lv('efb_no_4', 'DAMPER', 'no tag', 0), 0);
    const efb4RunTime = lv('efb4_card', 'RUN_TIME', 'no tag', 0);

    // Total Load EFB (Default 'no tag' jika belum di-mapping)
    const totalLoadVal = lv('efb_total_load', 'MONITOR', 'no tag', 0);

    // Helper untuk mengambil live position % valve (Press 1 - 4 Dilution & Steam)
    const getValvePosition = (n, type) => {
        const key = type === 'DILUTION' ? `valve_press_${n}_dilution` : `valve_press_${n}_steam`;
        const cardFallback = type === 'DILUTION'
            ? (n === 1 ? efb1Dilution : n === 2 ? efb2Dilution : n === 3 ? efb3Dilution : efb4Dilution)
            : (n === 1 ? efb1Steam : n === 2 ? efb2Steam : n === 3 ? efb3Steam : efb4Steam);

        // 1. Cek simulation override
        if (simulatedStatus[`${key}__${type}`] !== undefined) return simulatedStatus[`${key}__${type}`];
        if (simulatedStatus[key] !== undefined) return simulatedStatus[key];

        // 2. Cek lv dengan fallback
        const val = lv(key, type, lv(key, 'MONITOR', cardFallback, 0), 0);
        return val;
    };

    // Helper untuk mengekstrak nilai persentase valve numerik
    const getEffectiveValveValue = (n, type, isOpen = false) => {
        const raw = getValvePosition(n, type);
        if (raw !== undefined && raw !== null && raw !== '' && raw !== '--' && raw !== 'no tag') {
            const num = parseFloat(String(raw).replace(/[^0-9.-]+/g, ''));
            if (!isNaN(num)) return num;
        }
        return isOpen ? 100 : 0;
    };

    // Helper untuk menghitung status alur & kecepatan animasi proporsional berdasarkan % valve (1% - 100%)
    const getValveFlowSpeed = (valStr) => {
        if (valStr === undefined || valStr === null || valStr === '' || valStr === '--' || valStr === 'no tag') {
            return { isFlowing: false, mode: 'standby', duration: 0.5, liquidDuration: 0.5, percent: 0 };
        }
        const num = typeof valStr === 'number' ? valStr : parseFloat(String(valStr).replace(/[^0-9.-]+/g, ''));
        if (isNaN(num) || num <= 0) {
            return { isFlowing: false, mode: 'standby', duration: 0.5, liquidDuration: 0.5, percent: 0 };
        }
        // Formula perlambatan bertahap & proporsional untuk aliran persenan (kecepatan lebih kencang & responsif):
        // 100% ~ 0.4s (kecepatan penuh / sangat kencang)
        // 75%  ~ 0.8s
        // 50%  ~ 1.3s
        // 25%  ~ 1.9s
        // 1%   ~ 2.8s (creeping flow)
        const calcDuration = Math.max(0.4, Math.min(2.8, +(2.8 - (num / 100) * 2.4).toFixed(2)));
        return { isFlowing: true, mode: 'flowing', duration: calcDuration, liquidDuration: calcDuration, percent: num };
    };

    // Kecepatan & status alur untuk Press 1 - 4 (Dilution & Steam)
    const press1DilutionSpeed = getValveFlowSpeed(getEffectiveValveValue(1, 'DILUTION', press1DilutionValveStatus.isOpen));
    const press2DilutionSpeed = getValveFlowSpeed(getEffectiveValveValue(2, 'DILUTION', press2DilutionValveStatus.isOpen));
    const press3DilutionSpeed = getValveFlowSpeed(getEffectiveValveValue(3, 'DILUTION', press3DilutionValveStatus.isOpen));
    const press4DilutionSpeed = getValveFlowSpeed(getEffectiveValveValue(4, 'DILUTION', press4DilutionValveStatus.isOpen));

    const press1SteamSpeed = getValveFlowSpeed(getEffectiveValveValue(1, 'STEAM', press1SteamValveStatus.isOpen));
    const press2SteamSpeed = getValveFlowSpeed(getEffectiveValveValue(2, 'STEAM', press2SteamValveStatus.isOpen));
    const press3SteamSpeed = getValveFlowSpeed(getEffectiveValveValue(3, 'STEAM', press3SteamValveStatus.isOpen));
    const press4SteamSpeed = getValveFlowSpeed(getEffectiveValveValue(4, 'STEAM', press4SteamValveStatus.isOpen));

    // Motor Signal Evaluation Helper
    const isMotorActive = (equipmentKey, signalKey, fallback = '0') => {
        const v = lv(equipmentKey, signalKey, fallback, 0);
        if (!v || v === 'no tag' || v === '--') return false;
        const num = parseFloat(v);
        if (!isNaN(num)) return num > 0;
        const s = String(v).trim().toLowerCase();
        return s === '1' || s === 'true' || s === 'running' || s === 'on' || s === 'run';
    };

    const getPressSignals = (num) => [
        { key: 'STATUS', label: `EFB NO. ${num} - STATUS` },
        { key: 'LOAD', label: `EFB NO. ${num} - LOAD (%)` },
        { key: 'PV', label: `EFB NO. ${num} - PV (A)` },
    ];

    // Handler untuk membuka Valve Positioner Modal saat diklik
    const handleValvePositionerClick = (pressNum, type, name) => {
        const pos = getValvePosition(pressNum, type);
        const isOpen = type === 'DILUTION'
            ? (pressNum === 1 ? press1DilutionValveStatus.isOpen : pressNum === 2 ? press2DilutionValveStatus.isOpen : pressNum === 3 ? press3DilutionValveStatus.isOpen : press4DilutionValveStatus.isOpen)
            : (pressNum === 1 ? press1SteamValveStatus.isOpen : pressNum === 2 ? press2SteamValveStatus.isOpen : pressNum === 3 ? press3SteamValveStatus.isOpen : press4SteamValveStatus.isOpen);
        const key = type === 'DILUTION' ? `valve_press_${pressNum}_dilution` : `valve_press_${pressNum}_steam`;
        const tag = tagMap[`${key}__${type}`] || tagMap[key] || 'Unmapped';
        setSelectedValvePositioner({
            pressNum,
            type,
            name: name || `EFB PRESS ${pressNum} - ${type === 'STEAM' ? 'STEAM' : 'DILUTION'} VALVE`,
            position: pos,
            isOpen,
            tag
        });
    };

    if (showSettings || viewMode === 'settings') {
        return (
            <SettingsView
                onClose={() => {
                    setShowSettings(false);
                    setViewMode('process');
                }}
                onBack={() => {
                    setShowSettings(false);
                    setViewMode('process');
                }}
                onSelectSubmenu={onSelectSubmenu}
                user={user}
                configMode={configMode}
                handleEquipmentClick={handleEquipmentClick}
                tagMap={tagMap}
                getMappedValue={lv}
            />
        );
    }

    return (
        <section className={`som-efb-plant som-mode-${viewMode}`}>
            {/* --- STATION HEADER --- */}
            <header className="som-efb-plant-header">
                <div className="som-header-left">
                    <h1 className="som-efb-plant-title">EFB PLANT STATION</h1>

                    <div className="som-station-tabs">
                        <button className={`som-station-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
                        <button className={`som-station-tab ${activeTab === 'efb1' ? 'active' : ''}`} onClick={() => setActiveTab('efb1')}>EFB 1</button>
                        <button className={`som-station-tab ${activeTab === 'efb2' ? 'active' : ''}`} onClick={() => setActiveTab('efb2')}>EFB 2</button>
                        <button className={`som-station-tab ${activeTab === 'efb3' ? 'active' : ''}`} onClick={() => setActiveTab('efb3')}>EFB 3</button>
                        <button className={`som-station-tab ${activeTab === 'efb4' ? 'active' : ''}`} onClick={() => setActiveTab('efb4')}>EFB 4</button>
                        <button className={`som-station-tab ${activeTab === 'trend' ? 'active' : ''}`} onClick={() => setActiveTab('trend')}>Trend</button>
                    </div>
                </div>
                <div className="som-view-toggle-container" style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                    <button className={`som-view-btn ${viewMode === 'process' && !showSettings ? 'active' : ''}`} onClick={() => { setShowSettings(false); setViewMode('process'); }}>PROCESS VIEW</button>
                    <button className="som-view-btn" disabled style={{ cursor: 'not-allowed', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        MAINTENANCE VIEW
                        <svg width="10" height="12" viewBox="0 0 448 512" fill="currentColor" style={{ marginLeft: '4px' }}><path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z" /></svg>
                    </button>
                    <button
                        className={`som-view-btn ${showSettings || viewMode === 'settings' ? 'active' : ''}`}
                        onClick={() => {
                            setShowSettings(true);
                            if (onSelectSubmenu) {
                                onSelectSubmenu('EFB Plant', 'Settings');
                            }
                        }}
                        style={{ marginLeft: '4px' }}
                    >
                        ⚙️ SETTINGS
                    </button>
                </div>
            </header>

            {/* --- MAIN INTERACTIVE CANVAS / TREND VIEW --- */}
            <div className="som-efb-plant-main" style={{ position: 'relative' }}>
                {activeTab === 'trend' ? (
                    <TrendTab
                        trendPeriod={trendPeriod}
                        setTrendPeriod={setTrendPeriod}
                        showTrendSettings={showTrendSettings}
                        setShowTrendSettings={setShowTrendSettings}
                        currentDateTime={currentDateTime}
                        handleTrendMouseMove={handleTrendMouseMove}
                        handleTrendMouseLeave={handleTrendMouseLeave}
                        getResolution={getResolution}
                        trendData={trendData}
                        hoverData={hoverData}
                        getXAxisLabels={getXAxisLabels}
                        getMappedValue={lv}
                        trendOffset={trendOffset}
                        setTrendOffset={setTrendOffset}
                        getTrendTimeRange={getTrendTimeRange}
                        selectedMetric={selectedMetric}
                        setSelectedMetric={setSelectedMetric}
                    />
                ) : (
                    <div className="som-efb-plant-layout" style={{ position: 'relative' }}>
                        <div className="som-efb-plant-flow-body">
                            <svg
                                ref={svgRef}
                                viewBox={getSvgViewBox()}
                                className="station-svg-canvas"
                                preserveAspectRatio="xMidYMid meet"
                            >
                                {/* SVG Filters (Matrix Color Tints) */}
                                <defs>
                                    <filter id="tint-red" colorInterpolationFilters="sRGB">
                                        <feColorMatrix type="matrix" values="
                                    0.95 0    0    0 0.05
                                    0    0.15 0    0 0
                                    0    0    0.15 0 0
                                    0    0    0    1 0" />
                                    </filter>
                                    <filter id="tint-green" colorInterpolationFilters="sRGB">
                                        <feColorMatrix type="matrix" values="
                                    0.1  0    0    0 0
                                    0    0.95 0    0 0.05
                                    0    0    0.2  0 0
                                    0    0    0    1 0" />
                                    </filter>
                                    <filter id="tint-grey" colorInterpolationFilters="sRGB">
                                        <feColorMatrix type="matrix" values="
                                    0.33 0.33 0.33 0 0
                                    0.33 0.33 0.33 0 0
                                    0.33 0.33 0.33 0 0
                                    0    0    0    1 0" />
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
                                {/* --- LAYER 1: OVERVIEW FULL PLANT VIEW --- */}
                                {/* ========================================== */}
                                {activeTab === 'overview' && (
                                    <>
                                        {/* Background Diagram Asset */}
                                        <image href={efbPlantImageUrl} width="1920" height="1080" />

                                        {/* CST Tank CPO Oil Animation Layer */}
                                        <g className="som-cst-cpo-layer" style={{ pointerEvents: 'none' }}>
                                            <defs>
                                                <clipPath id="cstTankClip">
                                                    <rect x="1285" y="768" width="425" height="197" rx="6" />
                                                </clipPath>
                                            </defs>
                                            <image
                                                href={cstCpoLayerGif}
                                                x="1044"
                                                y="819"
                                                width="908"
                                                height="127"
                                                preserveAspectRatio="none"
                                                clipPath="url(#cstTankClip)"
                                                style={{
                                                    mixBlendMode: 'normal',
                                                    opacity: 0.95
                                                }}
                                            />
                                        </g>

                                        {/* ========================================== */}
                                        {/* --- STERILIZER-STYLE PIPE FLOW ANIMATIONS (LIQUID STEAM NEON) --- */}
                                        {/* ========================================== */}
                                        <g className="som-steam-flows">

                                            {/* --- 1. PERIWINKLE / VIOLET-BLUE DILUTION WATER PIPE FLOWS (LIQUIDFLOWSVG) --- */}
                                            {/* Upstream / Header (Sebelum Valve - 100% Speed bila ada flow) */}
                                            <LiquidFlowSVG
                                                d="M 1918,273 L 1536,273 Q 1531,273 1526,275 L 1526,275 Q 1521,277 1520,282 L 1519,287 Q 1517,296 1517,306 L 1517,319"
                                                isRunning={true}
                                                flowing={press4DilutionSpeed.isFlowing || press3DilutionSpeed.isFlowing || press2DilutionSpeed.isFlowing || press1DilutionSpeed.isFlowing}
                                                color="#818cf8"
                                                thickness={8}
                                                duration={0.4}
                                            />
                                            <LiquidFlowSVG
                                                d="M 1535,274 L 1062,273 Q 1053,273 1046,278 L 1046,278 Q 1038,283 1038,292 L 1038,319"
                                                isRunning={true}
                                                flowing={press3DilutionSpeed.isFlowing || press2DilutionSpeed.isFlowing || press1DilutionSpeed.isFlowing}
                                                color="#818cf8"
                                                thickness={8}
                                                duration={0.4}
                                            />
                                            <LiquidFlowSVG
                                                d="M 1050,273 L 582,271 Q 573,271 566,277 L 566,277 Q 559,282 559,291 L 560,317"
                                                isRunning={true}
                                                flowing={press2DilutionSpeed.isFlowing || press1DilutionSpeed.isFlowing}
                                                color="#818cf8"
                                                thickness={8}
                                                duration={0.4}
                                            />
                                            <LiquidFlowSVG
                                                d="M 574,272 L 103,271 Q 94,271 87,276 L 87,276 Q 79,281 79,290 L 80,320"
                                                isRunning={true}
                                                flowing={press1DilutionSpeed.isFlowing}
                                                color="#818cf8"
                                                thickness={8}
                                                duration={0.4}
                                            />

                                            {/* Downstream (Setelah Valve - Kecepatan sesuai 1-25%, 26-75%, 76-100%) */}
                                            <LiquidFlowSVG
                                                d="M 1516,342 L 1517,351 Q 1517,359 1522,366 L 1522,366 Q 1526,373 1534,373 L 1568,373"
                                                isRunning={press4DilutionSpeed.isFlowing}
                                                flowing={press4DilutionSpeed.isFlowing}
                                                color="#818cf8"
                                                thickness={8}
                                                duration={press4DilutionSpeed.liquidDuration}
                                            />
                                            <LiquidFlowSVG
                                                d="M 1038,317 L 1038,329 L 1038,352 Q 1038,361 1046,366 L 1046,366 Q 1054,371 1063,371 L 1089,372"
                                                isRunning={press3DilutionSpeed.isFlowing}
                                                flowing={press3DilutionSpeed.isFlowing}
                                                color="#818cf8"
                                                thickness={8}
                                                duration={press3DilutionSpeed.liquidDuration}
                                            />
                                            <LiquidFlowSVG
                                                d="M 560,317 L 559,348 Q 559,356 562,363 L 562,363 Q 565,370 573,370 L 609,370"
                                                isRunning={press2DilutionSpeed.isFlowing}
                                                flowing={press2DilutionSpeed.isFlowing}
                                                color="#818cf8"
                                                thickness={8}
                                                duration={press2DilutionSpeed.liquidDuration}
                                            />
                                            <LiquidFlowSVG
                                                d="M 81,341 L 82,355 Q 82,361 86,366 L 86,366 Q 89,370 95,370 L 129,370"
                                                isRunning={press1DilutionSpeed.isFlowing}
                                                flowing={press1DilutionSpeed.isFlowing}
                                                color="#818cf8"
                                                thickness={8}
                                                duration={press1DilutionSpeed.liquidDuration}
                                            />

                                            {/* --- 2. BLUE STEAM PIPE FLOWS (STERILIZER STYLE) --- */}
                                            {/* Upstream / Header (Sebelum Valve - 100% Speed bila ada flow) */}
                                            <LiquidSteamFlowSVG
                                                d="M 1916,299 L 1595,300 Q 1586,300 1581,308 L 1581,308 Q 1576,316 1573,316"
                                                active={true}
                                                mode={press4SteamSpeed.isFlowing || press3SteamSpeed.isFlowing || press2SteamSpeed.isFlowing || press1SteamSpeed.isFlowing ? "flowing" : "standby"}
                                                color="#00d2ff"
                                                thickness={8}
                                                duration={0.6}
                                            />
                                            <LiquidSteamFlowSVG
                                                d="M 1591,299 L 1114,297 Q 1105,297 1100,304 L 1100,304 Q 1094,311 1095,319"
                                                active={true}
                                                mode={press3SteamSpeed.isFlowing || press2SteamSpeed.isFlowing || press1SteamSpeed.isFlowing ? "flowing" : "standby"}
                                                color="#00d2ff"
                                                thickness={8}
                                                duration={0.6}
                                            />
                                            <LiquidSteamFlowSVG
                                                d="M 1103,300 L 638,297 Q 630,297 624,302 L 624,302 Q 617,307 616,317"
                                                active={true}
                                                mode={press2SteamSpeed.isFlowing || press1SteamSpeed.isFlowing ? "flowing" : "standby"}
                                                color="#00d2ff"
                                                thickness={8}
                                                duration={0.6}
                                            />
                                            <LiquidSteamFlowSVG
                                                d="M 617,299 L 159,297 Q 150,297 143,302 L 143,302 Q 136,307 136,317"
                                                active={true}
                                                mode={press1SteamSpeed.isFlowing ? "flowing" : "standby"}
                                                color="#00d2ff"
                                                thickness={8}
                                                duration={0.6}
                                            />

                                            {/* Downstream (Setelah Valve - Kecepatan sesuai 1-25%, 26-75%, 76-100%) */}
                                            <LiquidSteamFlowSVG
                                                d="M 1573,316 L 1576,325 L 1575,409 Q 1575,416 1577,423 L 1577,423 Q 1578,429 1585,430 L 1601,432"
                                                active={press4SteamSpeed.isFlowing}
                                                mode={press4SteamSpeed.mode}
                                                color="#00d2ff"
                                                thickness={8}
                                                duration={press4SteamSpeed.duration}
                                            />
                                            <LiquidSteamFlowSVG
                                                d="M 1095,319 L 1094,320 L 1096,411 Q 1096,417 1099,422 L 1099,422 Q 1101,427 1107,428 L 1122,430"
                                                active={press3SteamSpeed.isFlowing}
                                                mode={press3SteamSpeed.mode}
                                                color="#00d2ff"
                                                thickness={8}
                                                duration={press3SteamSpeed.duration}
                                            />
                                            <LiquidSteamFlowSVG
                                                d="M 616,317 L 616,318 Q 615,329 615,340 L 614,411 Q 614,418 618,424 L 618,424 Q 621,429 628,429 L 641,430"
                                                active={press2SteamSpeed.isFlowing}
                                                mode={press2SteamSpeed.mode}
                                                color="#00d2ff"
                                                thickness={8}
                                                duration={press2SteamSpeed.duration}
                                            />
                                            <LiquidSteamFlowSVG
                                                d="M 136,317 L 137,409 Q 137,416 139,423 L 139,423 Q 140,429 147,430 L 162,432"
                                                active={press1SteamSpeed.isFlowing}
                                                mode={press1SteamSpeed.mode}
                                                color="#00d2ff"
                                                thickness={8}
                                                duration={press1SteamSpeed.duration}
                                            />

                                            {/* --- 3. BOTTOM USER FLOWS (LIQUIDFLOWSVG - TETAP DIPERTAHANKAN) --- */}
                                            <LiquidFlowSVG
                                                d="M 1900,282 L 1899,342"
                                                isRunning={true}
                                                flowing={press1DilutionValveStatus.isOpen || press2DilutionValveStatus.isOpen || press3DilutionValveStatus.isOpen || press4DilutionValveStatus.isOpen}
                                                color="#f59e0b"
                                                thickness={8}
                                            />

                                            <LiquidFlowSVG
                                                d="M 1899,370 L 1901,547 Q 1901,558 1891,562 L 1891,562 Q 1881,566 1870,566 L 77,562 Q 70,562 64,565 L 64,565 Q 57,568 57,575 L 57,617"
                                                isRunning={true}
                                                flowing={press1DilutionValveStatus.isOpen || press2DilutionValveStatus.isOpen || press3DilutionValveStatus.isOpen || press4DilutionValveStatus.isOpen}
                                                color="#f59e0b"
                                                thickness={8}
                                            />

                                            <LiquidFlowSVG
                                                d="M 56,644 L 55,677 Q 55,686 61,693 L 61,693 Q 67,699 76,699 L 465,700"
                                                isRunning={true}
                                                flowing={press1DilutionValveStatus.isOpen || press2DilutionValveStatus.isOpen || press3DilutionValveStatus.isOpen || press4DilutionValveStatus.isOpen}
                                                color="#f59e0b"
                                                thickness={8}
                                            />

                                            <LiquidFlowSVG
                                                d="M 464,699 L 467,708 Q 469,713 474,715 L 474,715 Q 479,717 484,717 L 828,717 Q 835,717 842,719 L 843,719 Q 849,721 850,727 L 851,733"
                                                isRunning={true}
                                                flowing={press1DilutionValveStatus.isOpen || press2DilutionValveStatus.isOpen || press3DilutionValveStatus.isOpen || press4DilutionValveStatus.isOpen}
                                                color="#f59e0b"
                                                thickness={8}
                                            />

                                            <LiquidFlowSVG
                                                d="M 466,696 L 469,691 Q 472,686 478,685 L 481,685 Q 490,684 499,684 L 1078,684 Q 1087,684 1095,690 L 1102,695"
                                                isRunning={true}
                                                flowing={press1DilutionValveStatus.isOpen || press2DilutionValveStatus.isOpen || press3DilutionValveStatus.isOpen || press4DilutionValveStatus.isOpen}
                                                color="#f59e0b"
                                                thickness={8}
                                            />

                                            <LiquidFlowSVG
                                                d="M 1550,529 L 1550,559"
                                                isRunning={press4DilutionSpeed.isFlowing}
                                                flowing={press4DilutionSpeed.isFlowing}
                                                color="#f59e0b"
                                                thickness={8}
                                                duration={press4DilutionSpeed.liquidDuration}
                                            />

                                            <LiquidFlowSVG
                                                d="M 1071,526 L 1071,556"
                                                isRunning={press3DilutionSpeed.isFlowing}
                                                flowing={press3DilutionSpeed.isFlowing}
                                                color="#f59e0b"
                                                thickness={8}
                                                duration={press3DilutionSpeed.liquidDuration}
                                            />

                                            <LiquidFlowSVG
                                                d="M 593,526 L 593,554"
                                                isRunning={press2DilutionSpeed.isFlowing}
                                                flowing={press2DilutionSpeed.isFlowing}
                                                color="#f59e0b"
                                                thickness={8}
                                                duration={press2DilutionSpeed.liquidDuration}
                                            />

                                            <LiquidFlowSVG
                                                d="M 113,528 L 113,554"
                                                isRunning={press1DilutionSpeed.isFlowing}
                                                flowing={press1DilutionSpeed.isFlowing}
                                                color="#f59e0b"
                                                thickness={8}
                                                duration={press1DilutionSpeed.liquidDuration}
                                            />

                                            <LiquidFlowSVG
                                                d="M 970,823 L 975,831 Q 979,838 988,838 L 1009,838"
                                                isRunning={true}
                                                flowing={press1DilutionValveStatus.isOpen || press2DilutionValveStatus.isOpen || press3DilutionValveStatus.isOpen || press4DilutionValveStatus.isOpen}
                                                color="#f59e0b"
                                                thickness={8}
                                            />

                                            <LiquidFlowSVG
                                                d="M 1163,841 L 1285,840"
                                                isRunning={true}
                                                flowing={press1DilutionValveStatus.isOpen || press2DilutionValveStatus.isOpen || press3DilutionValveStatus.isOpen || press4DilutionValveStatus.isOpen}
                                                color="#f59e0b"
                                                thickness={8}
                                            />

                                            <LiquidFlowSVG
                                                d="M 1216,794 L 1219,800 Q 1222,806 1229,806 L 1283,806"
                                                isRunning={true}
                                                flowing={press1DilutionValveStatus.isOpen || press2DilutionValveStatus.isOpen || press3DilutionValveStatus.isOpen || press4DilutionValveStatus.isOpen}
                                                color="#f59e0b"
                                                thickness={8}
                                            />

                                            <LiquidFlowSVG
                                                d="M 1712,845 L 1731,845"
                                                isRunning={true}
                                                flowing={press1DilutionValveStatus.isOpen || press2DilutionValveStatus.isOpen || press3DilutionValveStatus.isOpen || press4DilutionValveStatus.isOpen}
                                                color="#f59e0b"
                                                thickness={8}
                                            />

                                            <LiquidFlowSVG
                                                d="M 1754,801 L 1757,795 Q 1759,788 1766,786 L 1766,786 Q 1772,783 1779,783 L 1917,781"
                                                isRunning={true}
                                                flowing={press1DilutionValveStatus.isOpen || press2DilutionValveStatus.isOpen || press3DilutionValveStatus.isOpen || press4DilutionValveStatus.isOpen}
                                                color="#f59e0b"
                                                thickness={8}
                                            />

                                            <LiquidFlowSVG
                                                d="M 1715,922 L 1808,922"
                                                isRunning={true}
                                                flowing={press1DilutionValveStatus.isOpen || press2DilutionValveStatus.isOpen || press3DilutionValveStatus.isOpen || press4DilutionValveStatus.isOpen}
                                                color="#f59e0b"
                                                thickness={8}
                                            />

                                            <LiquidFlowSVG
                                                d="M 1831,880 L 1832,871 Q 1832,862 1841,862 L 1916,860"
                                                isRunning={true}
                                                flowing={press1DilutionValveStatus.isOpen || press2DilutionValveStatus.isOpen || press3DilutionValveStatus.isOpen || press4DilutionValveStatus.isOpen}
                                                color="#f59e0b"
                                                thickness={8}
                                            />
                                        </g>

                                        {/* Motor Assets */}
                                        <image href={motorbackSvg} x={1830} y={135} width="55" style={{ pointerEvents: 'none' }} />

                                        {/* Press 1 Inlet Valve Actuators & Position Cards */}
                                        <ValveModernCardSVG
                                            id="card_valve_press_1_dilution"
                                            x={5}
                                            y={330}
                                            scale={0.52}
                                            title="V. DILUTION"
                                            position={getValvePosition(1, 'DILUTION')}
                                            isEditable={configMode}
                                            style={getDeveloperStyle('valve_press_1_dilution', 'DILUTION')}
                                            onClick={() => {
                                                if (configMode) {
                                                    handleEquipmentClick('valve_press_1_dilution', [], [{ key: 'DILUTION', label: 'Press 1 - Dilution Valve' }]);
                                                } else {
                                                    handleValvePositionerClick(1, 'DILUTION', 'EFB PRESS 1 - DILUTION VALVE');
                                                }
                                            }}
                                        />
                                        <EquipmentIconSVG
                                            id="valve_press_1_dilution"
                                            x={97}
                                            y={330}
                                            icon={valvePositionerSvg}
                                            size={60}
                                            rotation={0}
                                            isRunning={press1DilutionValveStatus.isOpen}
                                            filter={press1DilutionValveStatus.colorFilter}
                                            style={getDeveloperStyle('valve_press_1_dilution', 'DILUTION')}
                                            isEditable={configMode}
                                            onClick={() => {
                                                if (configMode) {
                                                    handleEquipmentClick('valve_press_1_dilution', [], [{ key: 'DILUTION', label: 'Press 1 - Dilution Valve' }]);
                                                } else {
                                                    handleValvePositionerClick(1, 'DILUTION', 'EFB PRESS 1 - DILUTION VALVE');
                                                }
                                            }}
                                        />
                                        <ValveModernCardSVG
                                            id="card_valve_press_1_steam"
                                            x={6}
                                            y={385}
                                            scale={0.52}
                                            title="V. STEAM"
                                            position={getValvePosition(1, 'STEAM')}
                                            isEditable={configMode}
                                            style={getDeveloperStyle('valve_press_1_steam', 'STEAM')}
                                            onClick={() => {
                                                if (configMode) {
                                                    handleEquipmentClick('valve_press_1_steam', [], [{ key: 'STEAM', label: 'Press 1 - Steam Valve' }]);
                                                } else {
                                                    handleValvePositionerClick(1, 'STEAM', 'EFB PRESS 1 - STEAM VALVE');
                                                }
                                            }}
                                        />
                                        <EquipmentIconSVG
                                            id="valve_press_1_steam"
                                            x={155}
                                            y={330}
                                            icon={valvePositionerSvg}
                                            size={60}
                                            rotation={0}
                                            isRunning={press1SteamValveStatus.isOpen}
                                            filter={press1SteamValveStatus.colorFilter}
                                            style={getDeveloperStyle('valve_press_1_steam', 'STEAM')}
                                            isEditable={configMode}
                                            onClick={() => {
                                                if (configMode) {
                                                    handleEquipmentClick('valve_press_1_steam', [], [{ key: 'STEAM', label: 'Press 1 - Steam Valve' }]);
                                                } else {
                                                    handleValvePositionerClick(1, 'STEAM', 'EFB PRESS 1 - STEAM VALVE');
                                                }
                                            }}
                                        />

                                        {/* Press 2 Inlet Valve Actuators & Position Cards */}
                                        <ValveModernCardSVG
                                            id="card_valve_press_2_dilution"
                                            x={468}
                                            y={332}
                                            scale={0.52}
                                            title="V. DILUTION"
                                            position={getValvePosition(2, 'DILUTION')}
                                            isEditable={configMode}
                                            style={getDeveloperStyle('valve_press_2_dilution', 'DILUTION')}
                                            onClick={() => {
                                                if (configMode) {
                                                    handleEquipmentClick('valve_press_2_dilution', [], [{ key: 'DILUTION', label: 'Press 2 - Dilution Valve' }]);
                                                } else {
                                                    handleValvePositionerClick(2, 'DILUTION', 'EFB PRESS 2 - DILUTION VALVE');
                                                }
                                            }}
                                        />
                                        <EquipmentIconSVG
                                            id="valve_press_2_dilution"
                                            x={577}
                                            y={330}
                                            icon={valvePositionerSvg}
                                            size={60}
                                            rotation={0}
                                            isRunning={press2DilutionValveStatus.isOpen}
                                            filter={press2DilutionValveStatus.colorFilter}
                                            style={getDeveloperStyle('valve_press_2_dilution', 'DILUTION')}
                                            isEditable={configMode}
                                            onClick={() => {
                                                if (configMode) {
                                                    handleEquipmentClick('valve_press_2_dilution', [], [{ key: 'DILUTION', label: 'Press 2 - Dilution Valve' }]);
                                                } else {
                                                    handleValvePositionerClick(2, 'DILUTION', 'EFB PRESS 2 - DILUTION VALVE');
                                                }
                                            }}
                                        />
                                        <ValveModernCardSVG
                                            id="card_valve_press_2_steam"
                                            x={467}
                                            y={390}
                                            scale={0.52}
                                            title="V. STEAM"
                                            position={getValvePosition(2, 'STEAM')}
                                            isEditable={configMode}
                                            style={getDeveloperStyle('valve_press_2_steam', 'STEAM')}
                                            onClick={() => {
                                                if (configMode) {
                                                    handleEquipmentClick('valve_press_2_steam', [], [{ key: 'STEAM', label: 'Press 2 - Steam Valve' }]);
                                                } else {
                                                    handleValvePositionerClick(2, 'STEAM', 'EFB PRESS 2 - STEAM VALVE');
                                                }
                                            }}
                                        />
                                        <EquipmentIconSVG
                                            id="valve_press_2_steam"
                                            x={635}
                                            y={330}
                                            icon={valvePositionerSvg}
                                            size={60}
                                            rotation={0}
                                            isRunning={press2SteamValveStatus.isOpen}
                                            filter={press2SteamValveStatus.colorFilter}
                                            style={getDeveloperStyle('valve_press_2_steam', 'STEAM')}
                                            isEditable={configMode}
                                            onClick={() => {
                                                if (configMode) {
                                                    handleEquipmentClick('valve_press_2_steam', [], [{ key: 'STEAM', label: 'Press 2 - Steam Valve' }]);
                                                } else {
                                                    handleValvePositionerClick(2, 'STEAM', 'EFB PRESS 2 - STEAM VALVE');
                                                }
                                            }}
                                        />

                                        {/* Press 3 Inlet Valve Actuators & Position Cards */}
                                        <ValveModernCardSVG
                                            id="card_valve_press_3_dilution"
                                            x={946}
                                            y={335}
                                            scale={0.52}
                                            title="V. DILUTION"
                                            position={getValvePosition(3, 'DILUTION')}
                                            isEditable={configMode}
                                            style={getDeveloperStyle('valve_press_3_dilution', 'DILUTION')}
                                            onClick={() => {
                                                if (configMode) {
                                                    handleEquipmentClick('valve_press_3_dilution', [], [{ key: 'DILUTION', label: 'Press 3 - Dilution Valve' }]);
                                                } else {
                                                    handleValvePositionerClick(3, 'DILUTION', 'EFB PRESS 3 - DILUTION VALVE');
                                                }
                                            }}
                                        />
                                        <EquipmentIconSVG
                                            id="valve_press_3_dilution"
                                            x={1055}
                                            y={330}
                                            icon={valvePositionerSvg}
                                            size={60}
                                            rotation={0}
                                            isRunning={press3DilutionValveStatus.isOpen}
                                            filter={press3DilutionValveStatus.colorFilter}
                                            style={getDeveloperStyle('valve_press_3_dilution', 'DILUTION')}
                                            isEditable={configMode}
                                            onClick={() => {
                                                if (configMode) {
                                                    handleEquipmentClick('valve_press_3_dilution', [], [{ key: 'DILUTION', label: 'Press 3 - Dilution Valve' }]);
                                                } else {
                                                    handleValvePositionerClick(3, 'DILUTION', 'EFB PRESS 3 - DILUTION VALVE');
                                                }
                                            }}
                                        />
                                        <ValveModernCardSVG
                                            id="card_valve_press_3_steam"
                                            x={945}
                                            y={392}
                                            scale={0.52}
                                            title="V. STEAM"
                                            position={getValvePosition(3, 'STEAM')}
                                            isEditable={configMode}
                                            style={getDeveloperStyle('valve_press_3_steam', 'STEAM')}
                                            onClick={() => {
                                                if (configMode) {
                                                    handleEquipmentClick('valve_press_3_steam', [], [{ key: 'STEAM', label: 'Press 3 - Steam Valve' }]);
                                                } else {
                                                    handleValvePositionerClick(3, 'STEAM', 'EFB PRESS 3 - STEAM VALVE');
                                                }
                                            }}
                                        />
                                        <EquipmentIconSVG
                                            id="valve_press_3_steam"
                                            x={1112}
                                            y={330}
                                            icon={valvePositionerSvg}
                                            size={60}
                                            rotation={0}
                                            isRunning={press3SteamValveStatus.isOpen}
                                            filter={press3SteamValveStatus.colorFilter}
                                            style={getDeveloperStyle('valve_press_3_steam', 'STEAM')}
                                            isEditable={configMode}
                                            onClick={() => {
                                                if (configMode) {
                                                    handleEquipmentClick('valve_press_3_steam', [], [{ key: 'STEAM', label: 'Press 3 - Steam Valve' }]);
                                                } else {
                                                    handleValvePositionerClick(3, 'STEAM', 'EFB PRESS 3 - STEAM VALVE');
                                                }
                                            }}
                                        />

                                        {/* Press 4 Inlet Valve Actuators & Position Cards */}
                                        <ValveModernCardSVG
                                            id="card_valve_press_4_dilution"
                                            x={1425}
                                            y={335}
                                            scale={0.52}
                                            title="V. DILUTION"
                                            position={getValvePosition(4, 'DILUTION')}
                                            isEditable={configMode}
                                            style={getDeveloperStyle('valve_press_4_dilution', 'DILUTION')}
                                            onClick={() => {
                                                if (configMode) {
                                                    handleEquipmentClick('valve_press_4_dilution', [], [{ key: 'DILUTION', label: 'Press 4 - Dilution Valve' }]);
                                                } else {
                                                    handleValvePositionerClick(4, 'DILUTION', 'EFB PRESS 4 - DILUTION VALVE');
                                                }
                                            }}
                                        />
                                        <EquipmentIconSVG
                                            id="valve_press_4_dilution"
                                            x={1534}
                                            y={330}
                                            icon={valvePositionerSvg}
                                            size={60}
                                            rotation={0}
                                            isRunning={press4DilutionValveStatus.isOpen}
                                            filter={press4DilutionValveStatus.colorFilter}
                                            style={getDeveloperStyle('valve_press_4_dilution', 'DILUTION')}
                                            isEditable={configMode}
                                            onClick={() => {
                                                if (configMode) {
                                                    handleEquipmentClick('valve_press_4_dilution', [], [{ key: 'DILUTION', label: 'Press 4 - Dilution Valve' }]);
                                                } else {
                                                    handleValvePositionerClick(4, 'DILUTION', 'EFB PRESS 4 - DILUTION VALVE');
                                                }
                                            }}
                                        />
                                        <ValveModernCardSVG
                                            id="card_valve_press_4_steam"
                                            x={1425}
                                            y={390}
                                            scale={0.52}
                                            title="V. STEAM"
                                            position={getValvePosition(4, 'STEAM')}
                                            isEditable={configMode}
                                            style={getDeveloperStyle('valve_press_4_steam', 'STEAM')}
                                            onClick={() => {
                                                if (configMode) {
                                                    handleEquipmentClick('valve_press_4_steam', [], [{ key: 'STEAM', label: 'Press 4 - Steam Valve' }]);
                                                } else {
                                                    handleValvePositionerClick(4, 'STEAM', 'EFB PRESS 4 - STEAM VALVE');
                                                }
                                            }}
                                        />
                                        <EquipmentIconSVG
                                            id="valve_press_4_steam"
                                            x={1592}
                                            y={330}
                                            icon={valvePositionerSvg}
                                            size={60}
                                            rotation={0}
                                            isRunning={press4SteamValveStatus.isOpen}
                                            filter={press4SteamValveStatus.colorFilter}
                                            style={getDeveloperStyle('valve_press_4_steam', 'STEAM')}
                                            isEditable={configMode}
                                            onClick={() => {
                                                if (configMode) {
                                                    handleEquipmentClick('valve_press_4_steam', [], [{ key: 'STEAM', label: 'Press 4 - Steam Valve' }]);
                                                } else {
                                                    handleValvePositionerClick(4, 'STEAM', 'EFB PRESS 4 - STEAM VALVE');
                                                }
                                            }}
                                        />

                                        {/* Press 1 - 4 Data Cards */}
                                        <PressDataCardSVG
                                            id="efb_no_1"
                                            title="EFB NO. 1"
                                            x={310}
                                            y={360}
                                            isRun={press1Status.isRun}
                                            isFault={press1Status.isFault}
                                            loadVal={press1LoadVal}
                                            loadUnit="%"
                                            pvVal={press1PvVal}
                                            pvUnit="A"
                                            onClick={(id) => handleEquipmentClick(id, [], getPressSignals(1))}
                                            onToggleStatus={handleTogglePressStatus}
                                            isEditable={configMode}
                                            style={getDeveloperStyle('efb_no_1')}
                                        />
                                        <PressDataCardSVG
                                            id="efb_no_2"
                                            title="EFB NO. 2"
                                            x={790}
                                            y={360}
                                            isRun={press2Status.isRun}
                                            isFault={press2Status.isFault}
                                            loadVal={press2LoadVal}
                                            loadUnit="%"
                                            pvVal={press2PvVal}
                                            pvUnit="A"
                                            onClick={(id) => handleEquipmentClick(id, [], getPressSignals(2))}
                                            onToggleStatus={handleTogglePressStatus}
                                            isEditable={configMode}
                                            style={getDeveloperStyle('efb_no_2')}
                                        />
                                        <PressDataCardSVG
                                            id="efb_no_3"
                                            title="EFB NO. 3"
                                            x={1270}
                                            y={360}
                                            isRun={press3Status.isRun}
                                            isFault={press3Status.isFault}
                                            loadVal={press3LoadVal}
                                            loadUnit="%"
                                            pvVal={press3PvVal}
                                            pvUnit="A"
                                            onClick={(id) => handleEquipmentClick(id, [], getPressSignals(3))}
                                            onToggleStatus={handleTogglePressStatus}
                                            isEditable={configMode}
                                            style={getDeveloperStyle('efb_no_3')}
                                        />
                                        <PressDataCardSVG
                                            id="efb_no_4"
                                            title="EFB NO. 4"
                                            x={1750}
                                            y={360}
                                            isRun={press4Status.isRun}
                                            isFault={press4Status.isFault}
                                            loadVal={press4LoadVal}
                                            loadUnit="%"
                                            pvVal={press4PvVal}
                                            pvUnit="A"
                                            onClick={(id) => handleEquipmentClick(id, [], getPressSignals(4))}
                                            onToggleStatus={handleTogglePressStatus}
                                            isEditable={configMode}
                                            style={getDeveloperStyle('efb_no_4')}
                                        />

                                        {/* Left Side Monitoring Points */}
                                        <MonitorCard id="tank_level" onClick={handleEquipmentClick} isEditable={configMode} style={getDeveloperStyle('tank_level')} x={490} y={1060} label="TANK LEVEL" value="no tag" unit="%" equipmentName="Liquor Tank Level" trendType="Level" />
                                        <MonitorCard id="tank_temp" onClick={handleEquipmentClick} isEditable={configMode} style={getDeveloperStyle('tank_temp')} x={605} y={1060} label="TANK TEMP" value="no tag" unit="°C" equipmentName="Liquor Tank Temp" trendType="Temperature" />

                                        {/* EFB NO. 1 - 4 STATUS CARDS (BOTTOM) */}
                                        <EFBCardSVG
                                            id="efb1_card"
                                            efbNo={1}
                                            x={120}
                                            y={820}
                                            temp={efb1Temp}
                                            mode={efb1Mode}
                                            vSteam={efb1Steam}
                                            vDilution={efb1Dilution}
                                            slidingChute={efb1SlidingChute}
                                            runTime={efb1RunTime}
                                            onClick={(id) => handleEquipmentClick(id, [], getEfbSignals(1))}
                                            isEditable={configMode}
                                            style={getDeveloperStyle('efb1_card')}
                                        />
                                        <EFBCardSVG
                                            id="efb2_card"
                                            efbNo={2}
                                            x={300}
                                            y={820}
                                            temp={efb2Temp}
                                            mode={efb2Mode}
                                            vSteam={efb2Steam}
                                            vDilution={efb2Dilution}
                                            slidingChute={efb2SlidingChute}
                                            runTime={efb2RunTime}
                                            onClick={(id) => handleEquipmentClick(id, [], getEfbSignals(2))}
                                            isEditable={configMode}
                                            style={getDeveloperStyle('efb2_card')}
                                        />
                                        <EFBCardSVG
                                            id="efb3_card"
                                            efbNo={3}
                                            x={480}
                                            y={820}
                                            temp={efb3Temp}
                                            mode={efb3Mode}
                                            vSteam={efb3Steam}
                                            vDilution={efb3Dilution}
                                            slidingChute={efb3SlidingChute}
                                            runTime={efb3RunTime}
                                            onClick={(id) => handleEquipmentClick(id, [], getEfbSignals(3))}
                                            isEditable={configMode}
                                            style={getDeveloperStyle('efb3_card')}
                                        />
                                        <EFBCardSVG
                                            id="efb4_card"
                                            efbNo={4}
                                            x={660}
                                            y={820}
                                            temp={efb4Temp}
                                            mode={efb4Mode}
                                            vSteam={efb4Steam}
                                            vDilution={efb4Dilution}
                                            slidingChute={efb4SlidingChute}
                                            runTime={efb4RunTime}
                                            onClick={(id) => handleEquipmentClick(id, [], getEfbSignals(4))}
                                            isEditable={configMode}
                                            style={getDeveloperStyle('efb4_card')}
                                        />

                                        {/* Total Load Monitor Card below EFB NO. 1 - 4 */}
                                        <TotalLoadCardSVG
                                            id="efb_total_load"
                                            x={395}
                                            y={960}
                                            label="Total Load"
                                            value={totalLoadVal}
                                            unit="%"
                                            onClick={(id) => handleEquipmentClick(id, [], [{ key: 'MONITOR', label: 'Total Load (%)' }])}
                                            isEditable={configMode}
                                            style={getDeveloperStyle('efb_total_load')}
                                        />

                                        {/* STATUS MOTOR CONVEYOR & PUMP CARDS */}
                                        <MotorStatusCardSVG
                                            id="motor_conveyor"
                                            x={1540}
                                            y={715}
                                            title="STATUS MOTOR CONVEYOR"
                                            items={[
                                                { label: 'Conveyor In', key: 'CONV_IN', isRun: convInStatus.isRun, isFault: convInStatus.isFault },
                                                { label: 'Conveyor Out', key: 'CONV_OUT', isRun: convOutStatus.isRun, isFault: convOutStatus.isFault }
                                            ]}
                                            onClick={(id) => handleEquipmentClick(id, [], [
                                                { key: 'CONV_IN', label: 'Conveyor In - STATUS' },
                                                { key: 'CONV_OUT', label: 'Conveyor Out - STATUS' }
                                            ])}
                                            onToggleMotor={handleToggleMotorStatus}
                                            isEditable={configMode}
                                            style={getDeveloperStyle('motor_conveyor')}
                                        />
                                        <MotorStatusCardSVG
                                            id="motor_pump"
                                            x={1740}
                                            y={715}
                                            title="STATUS MOTOR PUMP"
                                            items={[
                                                { label: 'Pump 1', key: 'PUMP1', isRun: pump1Status.isRun, isFault: pump1Status.isFault },
                                                { label: 'Pump 2', key: 'PUMP2', isRun: pump2Status.isRun, isFault: pump2Status.isFault }
                                            ]}
                                            onClick={(id) => handleEquipmentClick(id, [], [
                                                { key: 'PUMP1', label: 'Pump 1 - STATUS' },
                                                { key: 'PUMP2', label: 'Pump 2 - STATUS' }
                                            ])}
                                            onToggleMotor={handleToggleMotorStatus}
                                            isEditable={configMode}
                                            style={getDeveloperStyle('motor_pump')}
                                        />
                                    </>
                                )}

                                {/* ========================================== */}
                                {/* --- LAYER 2: SINGLE LINE EFB 1 - 4 VIEW --- */}
                                {/* ========================================== */}
                                {(activeTab === 'efb1' || activeTab === 'efb2' || activeTab === 'efb3' || activeTab === 'efb4') && (() => {
                                    const n = activeTab === 'efb1' ? 1 : activeTab === 'efb2' ? 2 : activeTab === 'efb3' ? 3 : 4;
                                    const currentTemp = n === 1 ? efb1Temp : n === 2 ? efb2Temp : n === 3 ? efb3Temp : efb4Temp;
                                    const currentMode = n === 1 ? efb1Mode : n === 2 ? efb2Mode : n === 3 ? efb3Mode : efb4Mode;
                                    const currentSteam = n === 1 ? efb1Steam : n === 2 ? efb2Steam : n === 3 ? efb3Steam : efb4Steam;
                                    const currentDilution = n === 1 ? efb1Dilution : n === 2 ? efb2Dilution : n === 3 ? efb3Dilution : efb4Dilution;
                                    const currentChute = n === 1 ? efb1SlidingChute : n === 2 ? efb2SlidingChute : n === 3 ? efb3SlidingChute : efb4SlidingChute;
                                    const currentRunTime = n === 1 ? efb1RunTime : n === 2 ? efb2RunTime : n === 3 ? efb3RunTime : efb4RunTime;
                                    const lineConvIn = getMotorStatus(`single_efb_${n}_motor_conveyor`, 'CONV_IN', convInStatus.isRun ? '1' : '0');
                                    const lineConvOut = getMotorStatus(`single_efb_${n}_motor_conveyor`, 'CONV_OUT', convOutStatus.isRun ? '1' : '0');
                                    const lineSteamValveStatus = n === 1 ? press1SteamValveStatus : n === 2 ? press2SteamValveStatus : n === 3 ? press3SteamValveStatus : press4SteamValveStatus;
                                    const lineDilutionValveStatus = n === 1 ? press1DilutionValveStatus : n === 2 ? press2DilutionValveStatus : n === 3 ? press3DilutionValveStatus : press4DilutionValveStatus;
                                    const lineSteamSpeed = getValveFlowSpeed(getEffectiveValveValue(n, 'STEAM', lineSteamValveStatus.isOpen));
                                    const lineDilutionSpeed = getValveFlowSpeed(getEffectiveValveValue(n, 'DILUTION', lineDilutionValveStatus.isOpen));

                                    return (
                                        <g id="single_line_efb_view">
                                            {/* Background Diagram Single Line Asset */}
                                            <image
                                                href={efbSingleLineImageUrl}
                                                width="2000"
                                                height="885"
                                                x="-30"
                                                y="60"
                                                style={{ mixBlendMode: "multiply" }}
                                            />

                                            {/* ========================================== */}
                                            {/* --- SINGLE LINE PIPE FLOW ANIMATIONS --- */}
                                            {/* ========================================== */}
                                            <g className="som-steam-flows">
                                                {/* --- 1. DILUTION FLOW (PERIWINKLE / VIOLET-BLUE LIQUID - TOP PIPE) --- */}
                                                {/* Upstream (Sebelum Valve - 100% Speed bila ada flow) */}
                                                <LiquidFlowSVG
                                                    d="M 1967,291 L 1284,291 Q 1272,291 1264,300 L 1264,300 Q 1255,308 1255,320 L 1254,347"
                                                    isRunning={true}
                                                    flowing={lineDilutionSpeed.isFlowing}
                                                    color="#818cf8"
                                                    thickness={12}
                                                    duration={0.4}
                                                />
                                                <LiquidFlowSVG
                                                    d="M 1270,293 L -27,286"
                                                    isRunning={true}
                                                    flowing={lineDilutionSpeed.isFlowing}
                                                    color="#818cf8"
                                                    thickness={12}
                                                    duration={0.4}
                                                />

                                                {/* Downstream (Setelah Valve - Kecepatan sesuai 1-25%, 26-75%, 76-100%) */}
                                                <LiquidFlowSVG
                                                    d="M 1254,347 L 1254,422 Q 1254,436 1263,447 L 1263,447 Q 1272,457 1286,457 L 1338,457"
                                                    isRunning={lineDilutionSpeed.isFlowing}
                                                    flowing={lineDilutionSpeed.isFlowing}
                                                    color="#818cf8"
                                                    thickness={12}
                                                    duration={lineDilutionSpeed.liquidDuration}
                                                />

                                                {/* --- 2. STEAM FLOW (BLUE LIQUID STEAM - BOTTOM PIPE) --- */}
                                                {/* Upstream (Sebelum Valve - 100% Speed bila ada flow) */}
                                                <LiquidSteamFlowSVG
                                                    d="M 1968,332 L 1380,331 Q 1369,331 1361,338 L 1353,345"
                                                    active={true}
                                                    mode={lineSteamSpeed.isFlowing ? "flowing" : "standby"}
                                                    color="#00d2ff"
                                                    thickness={12}
                                                    duration={0.6}
                                                />
                                                <LiquidSteamFlowSVG
                                                    d="M 1381,332 L -26,330"
                                                    active={true}
                                                    mode={lineSteamSpeed.isFlowing ? "flowing" : "standby"}
                                                    color="#00d2ff"
                                                    thickness={12}
                                                    duration={0.6}
                                                />

                                                {/* Downstream (Setelah Valve - Kecepatan sesuai 1-25%, 26-75%, 76-100%) */}
                                                <LiquidSteamFlowSVG
                                                    d="M 1353,345 L 1353,356 L 1349,525 Q 1349,537 1355,547 L 1355,547 Q 1361,557 1373,558 L 1393,560"
                                                    active={lineSteamSpeed.isFlowing}
                                                    mode={lineSteamSpeed.mode}
                                                    color="#00d2ff"
                                                    thickness={12}
                                                    duration={lineSteamSpeed.duration}
                                                />

                                                <LiquidFlowSVG
                                                    d="M 1966,783 L -22,782"
                                                    isRunning={true}
                                                    flowing={lineDilutionValveStatus.isOpen || lineSteamValveStatus.isOpen || (n === 1 ? press1Status.isRun : n === 2 ? press2Status.isRun : n === 3 ? press3Status.isRun : press4Status.isRun)}
                                                    color="#f59e0b"
                                                    thickness={12}
                                                />

                                                {/* --- 3. BOTTOM PRESS DRAIN / LIQUOR FLOW (AMBER / ORANGE LIQUID) --- */}
                                                <LiquidFlowSVG
                                                    d="M 1311,723 L 1312,780"
                                                    isRunning={lineDilutionSpeed.isFlowing}
                                                    flowing={lineDilutionSpeed.isFlowing}
                                                    color="#f59e0b"
                                                    thickness={12}
                                                    duration={lineDilutionSpeed.liquidDuration}
                                                />
                                            </g>

                                            {/* Dilution Valve Actuator (Left / Top Pipe) */}
                                            <EquipmentIconSVG
                                                id={`valve_press_${n}_dilution_single`}
                                                x={1278}
                                                y={370}
                                                icon={valvePositionerSvg}
                                                size={90}
                                                rotation={0}
                                                isRunning={lineDilutionValveStatus.isOpen}
                                                filter={lineDilutionValveStatus.colorFilter}
                                                style={getDeveloperStyle(`valve_press_${n}_dilution`, 'DILUTION')}
                                                isEditable={configMode}
                                                onClick={() => {
                                                    if (configMode) {
                                                        handleEquipmentClick(`valve_press_${n}_dilution_single`, [], [{ key: 'DILUTION', label: `Press ${n} - Dilution Valve` }]);
                                                    } else {
                                                        handleValvePositionerClick(n, 'DILUTION', `EFB PRESS ${n} - DILUTION VALVE`);
                                                    }
                                                }}
                                            />
                                            {/* Dilution Valve Position Card */}
                                            <ValveModernCardSVG
                                                id={`card_valve_press_${n}_dilution_single`}
                                                x={1078}
                                                y={400}
                                                scale={0.92}
                                                title="V. DILUTION"
                                                position={getValvePosition(n, 'DILUTION')}
                                                isEditable={configMode}
                                                style={getDeveloperStyle(`valve_press_${n}_dilution`, 'DILUTION')}
                                                onClick={() => {
                                                    if (configMode) {
                                                        handleEquipmentClick(`valve_press_${n}_dilution_single`, [], [{ key: 'DILUTION', label: `Press ${n} - Dilution Valve` }]);
                                                    } else {
                                                        handleValvePositionerClick(n, 'DILUTION', `EFB PRESS ${n} - DILUTION VALVE`);
                                                    }
                                                }}
                                            />

                                            {/* Steam Valve Actuator (Right / Bottom Pipe) */}
                                            <EquipmentIconSVG
                                                id={`valve_press_${n}_steam_single`}
                                                x={1375}
                                                y={370}
                                                icon={valvePositionerSvg}
                                                size={90}
                                                rotation={0}
                                                isRunning={lineSteamValveStatus.isOpen}
                                                filter={lineSteamValveStatus.colorFilter}
                                                style={getDeveloperStyle(`valve_press_${n}_steam`, 'STEAM')}
                                                isEditable={configMode}
                                                onClick={() => {
                                                    if (configMode) {
                                                        handleEquipmentClick(`valve_press_${n}_steam_single`, [], [{ key: 'STEAM', label: `Press ${n} - Steam Valve` }]);
                                                    } else {
                                                        handleValvePositionerClick(n, 'STEAM', `EFB PRESS ${n} - STEAM VALVE`);
                                                    }
                                                }}
                                            />
                                            {/* Steam Valve Position Card */}
                                            <ValveModernCardSVG
                                                id={`card_valve_press_${n}_steam_single`}
                                                x={1080}
                                                y={500}
                                                scale={0.92}
                                                title="V. STEAM"
                                                position={getValvePosition(n, 'STEAM')}
                                                isEditable={configMode}
                                                style={getDeveloperStyle(`valve_press_${n}_steam`, 'STEAM')}
                                                onClick={() => {
                                                    if (configMode) {
                                                        handleEquipmentClick(`valve_press_${n}_steam_single`, [], [{ key: 'STEAM', label: `Press ${n} - Steam Valve` }]);
                                                    } else {
                                                        handleValvePositionerClick(n, 'STEAM', `EFB PRESS ${n} - STEAM VALVE`);
                                                    }
                                                }}
                                            />

                                            {/* EFB Status Card Khusus Masing-masing Line */}
                                            <EFBCardSVG
                                                id={`efb${n}_card`}
                                                efbNo={n}
                                                x={590}
                                                y={350}
                                                scale={2.3}
                                                width={240}
                                                height={210}
                                                temp={currentTemp}
                                                mode={currentMode}
                                                vSteam={currentSteam}
                                                vDilution={currentDilution}
                                                slidingChute={currentChute}
                                                runTime={currentRunTime}
                                                onClick={(id) => handleEquipmentClick(id, [], getEfbSignals(n))}
                                                isEditable={configMode}
                                                style={getDeveloperStyle(`efb${n}_card`)}
                                            />

                                            {/* Reset Run Time Card di Bawah Card EFB */}
                                            <ResetRunTimeCardSVG
                                                id={`single_efb_${n}_reset_runtime`}
                                                x={590}
                                                y={670}
                                                scale={2.2}
                                                width={240}
                                                height={36}
                                                label="Reset Run Time"
                                                btnLabel="RESET"
                                                onClick={(id) => handleEquipmentClick(id, [], [{ key: 'RESET', label: `EFB ${n} - Reset Run Time` }])}
                                                onReset={() => {
                                                    alert(`Reset Run Time untuk EFB ${n} telah diklik.`);
                                                }}
                                                isEditable={configMode}
                                                style={getDeveloperStyle(`single_efb_${n}_reset_runtime`, 'RESET')}
                                            />

                                            {/* Status Motor Conveyor Card Khusus Masing-masing Line */}
                                            <MotorStatusCardSVG
                                                id={`single_efb_${n}_motor_conveyor`}
                                                x={420}
                                                y={890}
                                                scale={1.5}
                                                width={185}
                                                height={110}
                                                title="STATUS MOTOR CONVEYOR"
                                                items={[
                                                    { label: 'Conveyor In', key: 'CONV_IN', isRun: lineConvIn.isRun, isFault: lineConvIn.isFault },
                                                    { label: 'Conveyor Out', key: 'CONV_OUT', isRun: lineConvOut.isRun, isFault: lineConvOut.isFault }
                                                ]}
                                                onClick={(id) => handleEquipmentClick(id, [], [
                                                    { key: 'CONV_IN', label: `EFB ${n} - Conveyor In Status` },
                                                    { key: 'CONV_OUT', label: `EFB ${n} - Conveyor Out Status` }
                                                ])}
                                                onToggleMotor={handleToggleMotorStatus}
                                                isEditable={configMode}
                                                style={getDeveloperStyle(`single_efb_${n}_motor_conveyor`)}
                                            />

                                            {/* Value Sensor Card Disamping Status Motor Conveyor */}
                                            <ValueSensorCardSVG
                                                id={`single_efb_${n}_value_sensor`}
                                                x={750}
                                                y={890}
                                                scale={1.5}
                                                width={185}
                                                height={110}
                                                title="VALUE SENSOR"
                                                items={[
                                                    { label: `Temp ${n}`, value: currentTemp, unit: '°C', key: 'TEMP' },
                                                    { label: 'Water Flow', value: lv(`single_efb_${n}`, 'WATER_FLOW', lv('water_flow', 'MONITOR', 'no tag', 0), 0), unit: 'M³/h', key: 'WATER_FLOW' },
                                                    { label: 'Oil Flow', value: lv(`single_efb_${n}`, 'OIL_FLOW', lv('oil_flow', 'MONITOR', 'no tag', 0), 0), unit: 'M³/h', key: 'OIL_FLOW' }
                                                ]}
                                                onClick={(id) => handleEquipmentClick(id, [], [
                                                    { key: 'TEMP', label: `EFB ${n} - Temp Sensor (°C)` },
                                                    { key: 'WATER_FLOW', label: `EFB ${n} - Water Flow (M³/h)` },
                                                    { key: 'OIL_FLOW', label: `EFB ${n} - Oil Flow (M³/h)` }
                                                ])}
                                                isEditable={configMode}
                                                style={getDeveloperStyle(`single_efb_${n}_value_sensor`)}
                                            />

                                            {/* Press Data Card Khusus Masing-masing Line (EFB NO. 1 - 4) */}
                                            <PressDataCardSVG
                                                id={`single_efb_${n}_press`}
                                                title={`EFB NO. ${n}`}
                                                x={1720}
                                                y={440}
                                                scale={1.5}
                                                isRun={(n === 1 ? press1Status : n === 2 ? press2Status : n === 3 ? press3Status : press4Status).isRun}
                                                isFault={(n === 1 ? press1Status : n === 2 ? press2Status : n === 3 ? press3Status : press4Status).isFault}
                                                loadVal={n === 1 ? press1LoadVal : n === 2 ? press2LoadVal : n === 3 ? press3LoadVal : press4LoadVal}
                                                loadUnit="%"
                                                pvVal={n === 1 ? press1PvVal : n === 2 ? press2PvVal : n === 3 ? press3PvVal : press4PvVal}
                                                pvUnit="A"
                                                onClick={(id) => handleEquipmentClick(id, [], getPressSignals(n))}
                                                onToggleStatus={handleTogglePressStatus}
                                                isEditable={configMode}
                                                style={getDeveloperStyle(`efb_no_${n}`)}
                                            />
                                        </g>
                                    );
                                })()}

                                {/* Elements khusus Maintenance Mode */}
                                {viewMode === 'maintenance' && (
                                    <>
                                        <MaintenanceCardSVG x={240} y={150} label="MANDO 1 CTRL" params={[{ label: 'LOAD', value: 'no tag', unit: 'A' }]} id="mando1_mnt" isEditable={configMode} style={getDeveloperStyle('mando1_mnt')} onClick={(id) => handleEquipmentClick(id, [], [{ key: 'LOAD', label: 'Mando 1 - LOAD' }])} />
                                        <MaintenanceCardSVG x={240} y={320} label="MANDO 2 CTRL" params={[{ label: 'LOAD', value: 'no tag', unit: 'A' }]} id="mando2_mnt" isEditable={configMode} style={getDeveloperStyle('mando2_mnt')} onClick={(id) => handleEquipmentClick(id, [], [{ key: 'LOAD', label: 'Mando 2 - LOAD' }])} />
                                    </>
                                )}

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
                )}
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

            {/* Valve Positioner SCADA Representation Modal */}
            <ValvePositionerModal
                isOpen={!!selectedValvePositioner}
                onClose={() => setSelectedValvePositioner(null)}
                valveData={selectedValvePositioner ? {
                    ...selectedValvePositioner,
                    position: getValvePosition(selectedValvePositioner.pressNum, selectedValvePositioner.type)
                } : {}}
                onSimulatePosition={(newPos) => {
                    if (selectedValvePositioner) {
                        const { pressNum: n, type } = selectedValvePositioner;
                        const key = type === 'DILUTION' ? `valve_press_${n}_dilution` : `valve_press_${n}_steam`;
                        setSimulatedStatus(prev => ({
                            ...prev,
                            [`${key}__${type}`]: newPos,
                            [`${key}_single__${type}`]: newPos,
                            [key]: newPos,
                            [`${key}_single`]: newPos,
                            [`efb_no_${n}__${type}`]: newPos,
                            [`efb${n}_card__V_${type}`]: newPos
                        }));
                    }
                }}
            />

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