import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import boilerHouseImageUrl from './assets/Boiler House Mewah.webp'
import fanSvg from './assets/item/fan.svg'
import ringFanOnUrl from './assets/item/ring_fan_on.png'
import ringFanOffUrl from './assets/item/ring_fan_off.png'
import fireGif from './assets/fire.gif'
import waterGif from './assets/water.gif'
import smokeGif from './assets/smoke.gif'
import waterTreatmentImageUrl from './assets/Boiler House Water Treatment.webp'
import valveActuatorSvg from './assets/item/valve_actuator.svg'
import motorSvg from './assets/motor.svg'
import './BoilerHousePage.css'
import {
  useCoordinatePicker,
  CoordinatePanel,
  InteractivePath,
  CrosshairOverlay,
  PickerBanner,
} from "./components/CoordinatePicker.jsx";

/**
 * ValveImage — render valve actuator SVG di posisi x,y dengan rotasi opsional.
 * Rotasi terjadi di titik tengah gambar secara otomatis.
 * @param {number} x - koordinat X kiri atas
 * @param {number} y - koordinat Y kiri atas
 * @param {number} size - lebar & tinggi gambar (default 50)
 * @param {number} rotate - derajat rotasi (0, 90, 180, 270)
 * @param {string} filter - CSS filter string untuk warna
 */
const ValveImage = ({ x, y, size = 50, rotate = 0, filter = '' }) => (
  <g transform={`translate(${x}, ${y}) rotate(${rotate}, ${size / 2}, ${size / 2})`}>
    <image href={valveActuatorSvg} x={0} y={0} width={size} height={size} style={{ filter }} />
  </g>
);

/**
 * MotorImage — render motor SVG di posisi x,y dengan rotasi opsional.
 * Rotasi terjadi di titik tengah gambar secara otomatis.
 * @param {number} x - koordinat X kiri atas
 * @param {number} y - koordinat Y kiri atas
 * @param {number} size - lebar & tinggi gambar (default 60)
 * @param {number} rotate - derajat rotasi (0, 90, 180, 270)
 * @param {string} filter - CSS filter string untuk warna
 */
const MotorImage = ({ x, y, size = 60, rotate = 0, filter = '' }) => (
  <g transform={`translate(${x}, ${y}) rotate(${rotate}, ${size / 2}, ${size / 2})`}>
    <image href={motorSvg} x={0} y={0} width={size} height={size} style={{ filter }} />
  </g>
);

/**
 * TextLabel — render teks di posisi x,y dengan rotasi opsional.
 * Rotasi terjadi di titik tengah teks secara otomatis.
 * @param {number} x - koordinat X
 * @param {number} y - koordinat Y
 * @param {string} text - teks yang akan ditampilkan
 * @param {number} rotate - derajat rotasi (0, 90, 180, 270)
 * @param {string} color - warna teks (default #ffffff)
 * @param {number} fontSize - ukuran font (default 16)
 * @param {string} fontWeight - ketebalan font (default bold)
 */
const TextLabel = ({ x, y, text, rotate = 0, color = '#ffffff', fontSize = 16, fontWeight = 'bold' }) => (
  <g transform={`translate(${x}, ${y}) rotate(${rotate})`}>
    <text
      x={0}
      y={0}
      fill={color}
      fontSize={fontSize}
      fontWeight={fontWeight}
      textAnchor="middle"
      dominantBaseline="middle"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {text}
    </text>
  </g>
);



import FurnaceStation from './components/FurnaceStation'
import WaterLevelStation from './components/WaterLevelStation'
import GraphicsStation from './components/GraphicsStation'
import { BoilerMachineCard, BoilerLabelCard, BoilerStatusLamps } from './components/BoilerSharedComponents'
import { useWTFlowBuilder, WTFlowOverlay, WTFlowPanel } from './components/WTFlowBuilder'
import usePlcStore from '@core/store'

const authHeaders = () => {
  const token = localStorage.getItem("kip_token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const STATION_ID = 'BOILER_HOUSE';

/* ════════════════════════════════════════════════════════
   Tag Editor Modal — Developer Config Mode
   Saves to database via station_tag_mappings API
   ════════════════════════════════════════════════════════ */
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

/* ════════════════════════════════════════════════════════
   Control Modal — Start/Stop Equipment (Functional + Smart Position)
   ════════════════════════════════════════════════════════ */
const ControlModal = ({ data, onClose, tagMap, onCommand, commandStatus, canControl }) => {
  if (!data) return null;

  const handleCommand = (equipKey, action) => {
    // Always allow command for testing, just warn if no permission
    if (!canControl) {
      console.warn("⚠️ No control permission, but allowing for testing");
    }

    const signalKey = `${equipKey}__${action}`;
    const tagId = tagMap[signalKey];

    console.log(`🎯 Control clicked: ${equipKey} → ${action}`);
    console.log(`📋 SignalKey: ${signalKey}, TagId: ${tagId}`);

    // If no tag mapped, use simulation mode with dummy tagId
    if (!tagId) {
      console.warn(`⚠️ No PLC tag mapped for ${signalKey}. Using simulation mode.`);
      const dummyTagId = 9999; // Dummy tag ID for simulation
      const value = action === 'START' ? 1 : 0;
      onCommand(dummyTagId, value, signalKey);
      return;
    }

    // Send 1 for START, 0 for STOP
    const value = action === 'START' ? 1 : 0;
    onCommand(tagId, value, signalKey);
  };

  // Smart positioning: keep popup within viewport
  const rawTop = data.position?.top || 200;
  const rawLeft = data.position?.left || 400;
  const popupW = 220;
  const popupH = data.subEquipments.length * 48 + 50;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;

  let top = rawTop;
  let left = rawLeft;

  // Flip left if overflows right edge
  if (left + popupW > vw - 20) left = rawLeft - popupW - 30;
  // Push up if overflows bottom
  if (top + popupH > vh - 20) top = vh - popupH - 20;
  // Never go above 10px
  if (top < 10) top = 10;
  if (left < 10) left = 10;

  return createPortal(
    <div className="som-equipment-modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        width: `${popupW}px`,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(245,158,11,0.12)',
        overflow: 'hidden',
        animation: 'fadeIn 0.15s ease-out',
      }}>
        {/* Header — compact, Mewah amber theme */}
        <div style={{
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(180deg, #ffdb3b 0%, #f59e0b 100%)',
          borderBottom: '1px solid #d97706',
        }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{data.title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#0f172a', fontSize: '1rem', cursor: 'pointer', lineHeight: 1, padding: 0, opacity: 0.6 }}>&times;</button>
        </div>

        {/* Equipment rows — ultra compact */}
        <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {data.subEquipments.map((sub, idx) => {
            const startKey = `${sub}__START`;
            const stopKey = `${sub}__STOP`;
            const hasStart = !!tagMap[startKey];
            const hasStop = !!tagMap[stopKey];
            const cmdKey = commandStatus?.key;
            const isSending = commandStatus?.sending;

            // Always enable buttons for testing (remove canControl dependency)
            const canStart = true;
            const canStop = true;

            return (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 6px',
                borderRadius: '6px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}>
                <span style={{ flex: 1, fontSize: '0.65rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{sub}</span>
                <button
                  disabled={isSending && cmdKey === startKey}
                  onClick={() => handleCommand(sub, 'START')}
                  title={!canControl ? "Testing mode - no permission" : (hasStart ? "Mapped to PLC" : "Simulation mode")}
                  style={{
                    padding: '4px 10px',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.6rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    background: (isSending && cmdKey === startKey) ? '#94a3b8' : '#16a34a',
                    color: '#ffffff',
                    transition: 'all 0.15s',
                    boxShadow: '0 1px 4px rgba(22,163,74,0.3)',
                    opacity: (isSending && cmdKey === startKey) ? 0.6 : 1,
                  }}
                >
                  {isSending && cmdKey === startKey ? '•••' : 'START'}
                </button>
                <button
                  disabled={isSending && cmdKey === stopKey}
                  onClick={() => handleCommand(sub, 'STOP')}
                  title={!canControl ? "Testing mode - no permission" : (hasStop ? "Mapped to PLC" : "Simulation mode")}
                  style={{
                    padding: '4px 10px',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.6rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    background: (isSending && cmdKey === stopKey) ? '#94a3b8' : '#dc2626',
                    color: '#ffffff',
                    transition: 'all 0.15s',
                    boxShadow: '0 1px 4px rgba(220,38,38,0.3)',
                    opacity: (isSending && cmdKey === stopKey) ? 0.6 : 1,
                  }}
                >
                  {isSending && cmdKey === stopKey ? '•••' : 'STOP'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ════════════════════════════════════════════════════════
   Main Boiler House Page
   ════════════════════════════════════════════════════════ */
const BoilerHousePage = ({ user, onSelectSubmenu }) => {
  const svgRef = useRef(null)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const {
    isPickerMode,
    isPathMode,
    paths,
    activePathIndex,
    setActivePathIndex,
    addNewPath,
    updatePoint,
    addPointToPath,
    deletePoint,
    radius,
    setRadius,
    flowType,
    setFlowType,
  } = useCoordinatePicker();
  const wtFlow = useWTFlowBuilder();
  const [viewMode, setViewMode] = useState('process')
  const [activeView, setActiveView] = useState('OVERVIEW');
  const [controlPopup, setControlPopup] = useState(null);
  const [configMode, setConfigMode] = useState(false);
  const [tagEdit, setTagEdit] = useState(null);
  const [availableTags, setAvailableTags] = useState([]);
  const [savingTags, setSavingTags] = useState(false);
  const [commandStatus, setCommandStatus] = useState(null);
  const [thresholds, setThresholds] = useState({});

  // Manual input values for combined card
  const [manualTemp, setManualTemp] = useState('69.97');
  const [manualBrightness, setManualBrightness] = useState('85.0');
  const [manualDraft, setManualDraft] = useState('15.21');
  const [showCombinedCard, setShowCombinedCard] = useState(false);

  // Manual input values for STEAM card
  const [manualSteamPress, setManualSteamPress] = useState('20.00');
  const [manualSteamFlow, setManualSteamFlow] = useState('19');
  const [manualSteamTemp, setManualSteamTemp] = useState('0');
  const [showSteamCard, setShowSteamCard] = useState(false);

  // ✨ Local simulation state for equipment status (fallback when no PLC tags)
  const [localEquipmentStatus, setLocalEquipmentStatus] = useState({});

  // Debug: Log state changes
  useEffect(() => {
    console.log('🔄 localEquipmentStatus updated:', localEquipmentStatus);
  }, [localEquipmentStatus]);

  // 1. Fetch thresholds for Boiler House
  useEffect(() => {
    const fetchThresholds = async () => {
      try {
        const res = await fetch('/api/settings/BOILER_HOUSE', { headers: authHeaders() });
        const data = await res.json();
        if (data.success) {
          const tMap = {};
          data.data.forEach(t => {
            tMap[t.parameter_key] = t;
          });
          setThresholds(tMap);
        }
      } catch (err) {
        console.error('Failed to fetch thresholds:', err);
      }
    };
    fetchThresholds();
  }, []);

  // 2. Helper to determine alert status
  const getAlertState = (paramKey, value) => {
    const config = thresholds[paramKey];
    if (!config || value === null || value === '--') return 'normal';

    const num = parseFloat(value);
    if (isNaN(num)) return 'normal';

    if (num >= config.danger_val) return 'danger';
    if (num >= config.warning_val) return 'warning';
    return 'normal';
  };

  // ✅ Zustand PLC Store — shared WebSocket data
  const plcTags = usePlcStore(state => state.tags);
  const initSocket = usePlcStore(state => state.initSocket);
  const sendCommand = usePlcStore(state => state.sendCommand);  // ⚡ Direct socket relay

  // Initialize WebSocket on mount
  useEffect(() => { initSocket(); }, [initSocket]);

  // tagMap stores tag_id (integer) keyed by "equipment__signal"
  const [tagMap, setTagMap] = useState({});

  // Reverse lookup: tag_id → tag_name
  const tagIdToName = useMemo(() => {
    const map = {};
    availableTags.forEach(t => { map[t.id] = t.tag_name; });
    return map;
  }, [availableTags]);

  // ── Fetch available tags from PLC Config ──
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch('/api/plc-config/tags', { headers: authHeaders() });
        const data = await res.json();
        if (data.success) setAvailableTags(data.data);
      } catch (err) { console.error('Failed to fetch tags', err); }
    };
    fetchTags();
  }, []);

  // ── FIX #1: Load saved mappings from DB on mount ──
  useEffect(() => {
    const loadMappings = async () => {
      try {
        const res = await fetch(`/api/plc-config/station-mappings/${STATION_ID}`, { headers: authHeaders() });
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          const restored = {};
          data.data.forEach(m => {
            restored[`${m.equipment}__${m.signal_key}`] = String(m.tag_id);
          });
          setTagMap(restored);
          console.log(`✅ Loaded ${data.data.length} tag mappings for ${STATION_ID}`);
        }
      } catch (err) {
        console.error('Failed to load station mappings', err);
      }
    };
    loadMappings();
  }, []);


  // ── Helper: Get live value for a monitoring tag mapping key ──
  const getLiveValue = useCallback((equipmentKey, signalKey = 'MONITOR') => {
    const tagId = tagMap[`${equipmentKey}__${signalKey}`];
    if (!tagId) return null;
    const tagName = tagIdToName[tagId];
    if (!tagName) return null;
    const tagData = plcTags[tagName];
    return tagData ? tagData.value : null;
  }, [tagMap, tagIdToName, plcTags]);

  const isDeveloper = user?.role === 'Developer';
  const canControl = isDeveloper || user?.permissions?.includes('control_boilerhouse');

  // Fullscreen detection state
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Debug logging for permissions
  useEffect(() => {
    console.log('👤 User Info:', {
      role: user?.role,
      permissions: user?.permissions,
      isDeveloper,
      canControl
    });
  }, [user, isDeveloper, canControl]);

  // F11 Fullscreen Handler using native-scaling HTML5 fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F11') {
        e.preventDefault();
        const elem = document.documentElement;
        if (elem) {
          if (!document.fullscreenElement) {
            if (elem.requestFullscreen) {
              elem.requestFullscreen().catch(err => console.error(err));
            }
          } else {
            if (document.exitFullscreen) {
              document.exitFullscreen();
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── FIX #1: Save mappings to database ──
  const handleTagSave = async (updatedTags, editData) => {
    setSavingTags(true);
    try {
      // Build mappings array for API
      const mappings = [];
      for (const [key, tagId] of Object.entries(updatedTags)) {
        if (!tagId) continue; // Skip empty selections
        // key format: "EQUIPMENT__SIGNAL" e.g. "FEEDER 1__START"
        const parts = key.split('__');
        if (parts.length !== 2) continue;
        mappings.push({
          station: STATION_ID,
          equipment: parts[0],
          signal_key: parts[1],
          tag_id: parseInt(tagId)
        });
      }

      if (mappings.length > 0) {
        const res = await fetch('/api/plc-config/station-mappings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ mappings })
        });
        const result = await res.json();
        if (result.success) {
          console.log(`✅ Saved ${result.count} mappings to database`);
        }
      }

      // Update local state
      setTagMap(prev => ({ ...prev, ...updatedTags }));
      setTagEdit(null);
    } catch (err) {
      console.error('Failed to save tag mappings', err);
      alert('Failed to save tag configuration. Check console for details.');
    } finally {
      setSavingTags(false);
    }
  };

  // ⚡ Send PLC commands — Direct Socket.IO relay (HMI-speed, ~60ms)
  const handleCommand = (tagId, value, signalKey) => {
    console.log(`🎯 Sending command: ${signalKey} | tagId: ${tagId} | value: ${value}`);
    setCommandStatus({ key: signalKey, sending: true });

    // Extract equipment name from signalKey (e.g., "FEEDER 1__START" -> "FEEDER 1")
    const equipmentName = signalKey.split('__')[0];
    console.log(`📝 Equipment name extracted: "${equipmentName}"`);

    // Update local simulation state
    setLocalEquipmentStatus(prev => {
      const newState = {
        ...prev,
        [equipmentName]: value === 1 // true if START (1), false if STOP (0)
      };
      console.log(`🔄 Updated localEquipmentStatus:`, newState);
      return newState;
    });

    // Try to send to PLC if connected
    const ok = sendCommand(parseInt(tagId), value);
    if (!ok) {
      console.warn('⚠️ Socket not connected. Using local simulation mode.');
    } else {
      console.log(`⚡ Command relayed successfully: ${signalKey} tagId=${tagId} → ${value}`);
    }
    setTimeout(() => setCommandStatus(null), 800);
  };

  const handleTagEditRequest = (e, id, subs = []) => {
    e.stopPropagation();
    setTagEdit({ targetId: id, subs: subs, pos: { top: 0, left: 0 } });
  };

  const [controlState, setControlState] = useState({
    mode: 'AUTO',
    level: { pv: 54.25, sp: 50.0, mv: 32 },
    flow: { pv: 30, sp: 30.0, mv: 45 }
  });

  const toggleMode = () => {
    setControlState(prev => ({ ...prev, mode: prev.mode === 'AUTO' ? 'MANUAL' : 'AUTO' }));
  };

  const handleMouseMove = (e) => {
    if (!svgRef.current) return
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())

    // Adjust for the <g transform="translate(200,110) scale(0.8)"> in normal mode
    // In fullscreen: translate(0,0) scale(1.0) — no adjustment needed
    if (!isFullscreen) {
      const adjustedX = Math.round((svgP.x - 200) / 0.8)
      const adjustedY = Math.round((svgP.y - 110) / 0.8)
      setCoords({ x: adjustedX, y: adjustedY })
    } else {
      setCoords({ x: Math.round(svgP.x), y: Math.round(svgP.y) })
    }
  }

  const openControl = (e, title, subs = []) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setControlPopup({ title, subEquipments: subs.length > 0 ? subs : [title], position: { top: rect.top, left: rect.right + 15 } });
  };

  // Helper: Get display value for monitoring cards (live or fallback)
  // decimals: optional fixed decimal places (for REAL values from PLC)
  const monVal = (equipKey, fallback = '--', decimals = null) => {
    const val = getLiveValue(equipKey);
    if (val === null) return fallback;
    if (decimals !== null) {
      const num = parseFloat(val);
      return isNaN(num) ? fallback : num.toFixed(decimals);
    }
    return val;
  };


  // Helper to check if equipment is in RUN status
  const isRunning = useCallback((equip, signal = 'STATUS') => {
    // First, try to get from PLC tags
    const val = getLiveValue(equip, signal);

    // If PLC value exists, use it
    if (val !== null && val !== undefined) {
      const running = val === 1 || val === true || String(val).toLowerCase() === 'true' || String(val) === '1';
      console.log(`✅ ${equip} PLC status: ${running}`);
      return running;
    }

    // Fallback to local simulation state
    const localStatus = localEquipmentStatus[equip];
    if (localStatus !== undefined) {
      console.log(`🎮 ${equip} local simulation: ${localStatus}`);
      return localStatus;
    }

    // Default to false if no data
    console.log(`❌ ${equip} no data, defaulting to false`);
    return false;
  }, [getLiveValue, localEquipmentStatus]);

  return (
    <div className={`som-boiler-house som-mode-${viewMode}`}>
      <header className="som-boiler-station-header">
        <div className="som-header-left">
          <h2 className="som-boiler-station-title">Boiler House Station</h2>

          <div className="som-station-tabs">
            <button className={`som-station-tab ${activeView === 'OVERVIEW' ? 'active' : ''}`} onClick={() => setActiveView('OVERVIEW')}>OVERVIEW</button>
            <button className={`som-station-tab ${activeView === 'FURNACE' ? 'active' : ''}`} onClick={() => setActiveView('FURNACE')}>FURNACE STATION</button>
            <button className={`som-station-tab ${activeView === 'WATERLEVEL' ? 'active' : ''}`} onClick={() => setActiveView('WATERLEVEL')}>Water Level & TDS Control</button>
            <button className={`som-station-tab ${activeView === 'GRAPHICS' ? 'active' : ''}`} onClick={() => setActiveView('GRAPHICS')}>GRAFIK</button>
            <button className={`som-station-tab ${activeView === 'WATERTREATMENT' ? 'active' : ''}`} onClick={() => setActiveView('WATERTREATMENT')}>WATER TREATMENT</button>
          </div>
        </div>

        <div className="som-view-toggle-container">
          <button className={`som-view-btn ${viewMode === 'process' ? 'active' : ''}`} onClick={() => setViewMode('process')}>PROCESS VIEW</button>
          <button className={`som-view-btn ${viewMode === 'maintenance' ? 'active' : ''}`} disabled style={{ cursor: 'not-allowed', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
            MAINTENANCE VIEW
            <svg width="10" height="12" viewBox="0 0 448 512" fill="currentColor"><path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z" /></svg>
          </button>
          {onSelectSubmenu && (
            <button className="som-view-btn" onClick={() => onSelectSubmenu('Boiler House', 'Settings')} style={{ marginLeft: '8px' }}>⚙️ SETTINGS</button>
          )}
        </div>

      </header>


      {isDeveloper && (
        <div className={`som-dev-config-toggle ${configMode ? 'active' : ''}`} onClick={() => setConfigMode(!configMode)}>
          <div className="toggle-text">{configMode ? 'Config Mode ON' : 'Config Mode'}</div>
          <div className="som-boiler-status-indicator active" style={{ backgroundColor: configMode ? '#0f172a' : '#ffdb3b' }}></div>
        </div>
      )}

      <main className="som-boiler-main">
        {activeView === 'OVERVIEW' ? (
          <div className="som-boiler-layout">
            <div className="som-boiler-flow-card">
              <div className="som-boiler-flow-body">
                {isPickerMode && <PickerBanner isPathMode={isPathMode} />}
                <svg ref={svgRef} viewBox={isFullscreen ? "0 0 2000 1100" : "80 0 1850 1100"} className="station-svg-canvas" preserveAspectRatio="xMidYMid slice" onMouseMove={handleMouseMove}>
                  <DefsOverlay />
                  <g transform={isFullscreen ? "translate(0, 0) scale(1.0)" : "translate(200, 110) scale(0.8)"}>
                    <image href={boilerHouseImageUrl} width="2000" height="1100" x="-10" y="14" />

                    {/* --- MAINTENANCE DIAGNOSTIC OVERLAYS --- */}
                    {viewMode === 'maintenance' && (
                      <DiagOverlay viewX="0" viewWidth="2000" bannerX="600" />
                    )}

                    {/* ANIMATION OVERLAYS */}
                    <foreignObject x={290} y={58} width="310" height="850" style={{ pointerEvents: 'none' }} className="fire-fx"><img src={fireGif} alt="Fire" className="som-boiler-video" /></foreignObject>
                    <foreignObject x={740} y={150} width="93" height="93" style={{ pointerEvents: 'none' }} className="water-fx"><img src={waterGif} alt="Water" className="som-boiler-video" /></foreignObject>
                    <foreignObject x={740} y={687} width="95" height="95" style={{ pointerEvents: 'none' }} className="water-fx water-full"><img src={waterGif} alt="Water" className="som-boiler-video" /></foreignObject>
                    <foreignObject x={1460} y={-170} width="780" height="500" style={{ pointerEvents: 'none' }} className="smoke-fx"><img src={smokeGif} alt="Smoke" className="som-boiler-video" /></foreignObject>

                    {/* ✅ FIX #3: Monitoring cards now read live values */}
                    {viewMode === 'process' && (
                      <>
                        <foreignObject x={90} y={165} width="280" height="200" style={{ overflow: "visible" }}>
                          <div className={`som-boiler-mini-card ${configMode ? 'som-editable' : ''}`} onClick={(e) => handleTagEditRequest(e, 'main_steam')} style={{ cursor: configMode ? 'pointer' : 'default', minWidth: '220px' }}>
                            <div className="som-boiler-mini-header">
                              <span className="som-boiler-mini-tag">MAIN STEAM PIPE</span>
                              <div className="som-boiler-status-indicator active"></div>
                            </div>
                            <div className="som-boiler-mini-body" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                              <div className="som-boiler-mini-param" style={{ width: "100%", textAlign: "center" }}>
                                <span className="som-boiler-mini-label">PRESS</span>
                                <span className="som-boiler-mini-value">{monVal('main_steam', '--', 2)}</span>
                                <span className="som-boiler-mini-unit">Bar</span>
                              </div>
                            </div>
                          </div>
                        </foreignObject>

                        <foreignObject x={360} y={440} width="260" height="260" style={{ overflow: 'visible' }}>
                          <div className="som-boiler-mini-card" onClick={() => setShowCombinedCard(true)} style={{ cursor: 'pointer', minWidth: '220px' }}>
                            <div className="som-boiler-mini-header">
                              <span className="som-boiler-mini-tag">FURNACE</span>
                              <div className="som-boiler-status-indicator active"></div>
                            </div>
                            <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                                <span className="som-boiler-mini-label">TEMP</span>
                                <span className="som-boiler-mini-value">{manualTemp}</span>
                                <span className="som-boiler-mini-unit">°C</span>
                              </div>
                              <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                                <span className="som-boiler-mini-label">BRIGHTNESS</span>
                                <span className="som-boiler-mini-value">{manualBrightness}</span>
                                <span className="som-boiler-mini-unit">lm</span>
                              </div>
                              <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                                <span className="som-boiler-mini-label">DRAFT</span>
                                <span className="som-boiler-mini-value">{manualDraft}</span>
                                <span className="som-boiler-mini-unit">mm h2o</span>
                              </div>
                            </div>
                          </div>
                        </foreignObject>

                        {/* Sub-ID Fans area - Increased vertical spacing to avoid overlap */}
                        <foreignObject x={1470} y={640} width="340" height="200" style={{ overflow: 'visible' }}><BoilerMachineCard title="SPEED" params={[{ label: 'RPM', value: monVal('SPEED', '0'), unit: 'RPM' }]} configMode={configMode} onTagEdit={handleTagEditRequest} /></foreignObject>
                        <foreignObject x={1470} y={750} width="340" height="200" style={{ overflow: 'visible' }}><BoilerMachineCard title="CURRENT" params={[{ label: 'LOAD', value: monVal('CURRENT', '43.30', 1), unit: 'A' }]} alertState={getAlertState('ampereIdf', monVal('CURRENT'))} configMode={configMode} onTagEdit={handleTagEditRequest} /></foreignObject>
                      </>
                    )}

                    {/* Equipment label cards (interactive) */}
                    <foreignObject x={40} y={310} width="220" height="200" style={{ overflow: 'visible' }}>
                      {viewMode === 'process' ? (
                        <div className="som-boiler-mini-card" style={{ minWidth: '200px', cursor: 'pointer' }}
                          onClick={(e) => openControl(e, 'FUEL FEEDER', ['FEEDER 1', 'FEEDER 2'])}>
                          <div className="som-boiler-mini-header">
                            <span className="som-boiler-mini-tag">FUEL FEEDER</span>
                            <div className="som-boiler-status-indicator active"></div>
                          </div>
                          <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">No.1</span>
                              <span className="som-boiler-mini-value">40,5</span>
                              <span className="som-boiler-mini-unit">Hz</span>
                            </div>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">No.2</span>
                              <span className="som-boiler-mini-value">43,2</span>
                              <span className="som-boiler-mini-unit">Hz</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <BoilerMachineCard title="FUEL FEEDER" isMaintenance params={[{ label: 'AMP', value: '14.2', unit: 'A' }, { label: 'HZ', value: '45.0', unit: 'Hz' }, { label: 'VIB', value: '1.2', unit: 'mm/s' }]} />
                      )}
                    </foreignObject>

                    {/* Feed Pump Labels - Ubah x dan y untuk tukar posisi */}

                    {/* FEED WATER PUMP Card 1 (No.1 RUN) - Ubah x dan y untuk tukar posisi */}
                    <foreignObject x={1300} y={480} width="220" height="160" style={{ overflow: 'visible' }}>
                      {viewMode === 'process' ? (
                        <div className="som-boiler-mini-card" style={{ minWidth: '200px', cursor: 'pointer' }}
                          onClick={(e) => openControl(e, 'FW PUMP', ['PUMP 1'])}>
                          <div className="som-boiler-mini-header">
                            <span className="som-boiler-mini-tag">FEED WATER PUMP</span>
                            <div className="som-boiler-status-indicator active"></div>
                          </div>
                          <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">No. 1</span>
                              <span className="som-boiler-mini-value" style={{ color: '#10b981', fontSize: '14px' }}>RUN</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <BoilerMachineCard title="FWP 1" isMaintenance params={[{ label: 'AMP', value: '28.5', unit: 'A' }, { label: 'VIB', value: '2.1', unit: 'mm/s' }]} />
                      )}
                    </foreignObject>

                    {/* FEED WATER PUMP Card 2 (No.2 STOP) - Ubah x dan y untuk tukar posisi */}
                    <foreignObject x={1470} y={480} width="220" height="160" style={{ overflow: 'visible' }}>
                      {viewMode === 'process' ? (
                        <div className="som-boiler-mini-card" style={{ minWidth: '200px', cursor: 'pointer' }}
                          onClick={(e) => openControl(e, 'FW PUMP', ['PUMP 2'])}>
                          <div className="som-boiler-mini-header">
                            <span className="som-boiler-mini-tag">FEED WATER PUMP</span>
                            <div className="som-boiler-status-indicator" style={{ background: '#ef4444', boxShadow: '0 0 10px rgba(239,68,68,0.8)' }}></div>
                          </div>
                          <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">No. 2</span>
                              <span className="som-boiler-mini-value" style={{ color: '#ef4444', fontSize: '14px' }}>STOP</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <BoilerMachineCard title="FWP 2" isMaintenance params={[{ label: 'AMP', value: '0.0', unit: 'A' }, { label: 'VIB', value: '0.0', unit: 'mm/s' }]} />
                      )}
                    </foreignObject>

                    {/* FLUED GAS Card - Ubah x dan y foreignObject untuk tukar posisi */}
                    <foreignObject x={1960} y={450} width="280" height="380" style={{ overflow: 'visible' }}>
                      <BoilerMachineCard
                        title="FLUED GAS"
                        params={[
                          { label: 'TEMPERATURE', value: '290', unit: '°C' },
                          { label: 'O2', value: '--', unit: '%' },
                          { label: 'CO2', value: '--', unit: '%' },
                          { label: 'CO', value: '--', unit: 'ppm' },
                          { label: 'NOX', value: '--', unit: 'ppm' },
                          { label: 'SO2', value: '--', unit: 'ppm' },
                          { label: 'PM', value: '--', unit: 'mg/m³' },
                          { label: 'H2O', value: '--', unit: '%' },
                        ]}
                        configMode={configMode}
                        onTagEdit={handleTagEditRequest}
                      />
                    </foreignObject>



                    <foreignObject x={1400} y={900} width="220" height="200" style={{ overflow: 'visible' }}>
                      {viewMode === 'process' ? (
                        <div className="som-boiler-mini-card" style={{ minWidth: '200px', cursor: 'pointer' }}
                          onClick={(e) => openControl(e, 'IDF FAN')}>
                          <div className="som-boiler-mini-header">
                            <span className="som-boiler-mini-tag">IDF FAN</span>
                            <div className="som-boiler-status-indicator active"></div>
                          </div>
                          <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">AMP</span>
                              <span className="som-boiler-mini-value">110,6</span>
                              <span className="som-boiler-mini-unit">A</span>
                            </div>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">DRAFT</span>
                              <span className="som-boiler-mini-value">-25</span>
                              <span className="som-boiler-mini-unit">mmH₂O</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <BoilerMachineCard title="IDF FAN" isMaintenance params={[{ label: 'AMP', value: '142.1', unit: 'A' }, { label: 'HZ', value: '48.2', unit: 'Hz' }, { label: 'VIB', value: '3.4', unit: 'mm/s' }]} />
                      )}
                    </foreignObject>



                    <foreignObject x={525} y={920} width="220" height="160" style={{ overflow: 'visible', zIndex: 10 }}>
                      {viewMode === 'process' ? (
                        <div className="som-boiler-mini-card" style={{ minWidth: '200px', cursor: 'pointer' }}
                          onClick={(e) => openControl(e, 'FF FAN')}>
                          <div className="som-boiler-mini-header">
                            <span className="som-boiler-mini-tag">FF FAN</span>
                            <div className="som-boiler-status-indicator active"></div>
                          </div>
                          <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">AMP</span>
                              <span className="som-boiler-mini-value">6,6</span>
                              <span className="som-boiler-mini-unit">A</span>
                            </div>
                          </div>
                        </div>
                      ) : <BoilerMachineCard title="FF FAN" isMaintenance params={[{ label: 'AMP', value: '78.5', unit: 'A' }, { label: 'HZ', value: '45.0', unit: 'Hz' }, { label: 'VIB', value: '2.5', unit: 'mm/s' }]} />}
                    </foreignObject>

                    <foreignObject x={80} y={920} width="220" height="160" style={{ overflow: 'visible', zIndex: 10 }}>
                      {viewMode === 'process' ? (
                        <div className="som-boiler-mini-card" style={{ minWidth: '200px', cursor: 'pointer' }}
                          onClick={(e) => openControl(e, 'FD FAN')}>
                          <div className="som-boiler-mini-header">
                            <span className="som-boiler-mini-tag">FD FAN</span>
                            <div className="som-boiler-status-indicator active"></div>
                          </div>
                          <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">AMP</span>
                              <span className="som-boiler-mini-value">11,6</span>
                              <span className="som-boiler-mini-unit">A</span>
                            </div>
                          </div>
                        </div>
                      ) : <BoilerMachineCard title="FD FAN" isMaintenance params={[{ label: 'AMP', value: '80.1', unit: 'A' }, { label: 'HZ', value: '45.2', unit: 'Hz' }, { label: 'VIB', value: '2.4', unit: 'mm/s' }]} />}
                    </foreignObject>

                    <foreignObject x={740} y={880} width="220" height="160" style={{ overflow: 'visible', zIndex: 10 }}>
                      {viewMode === 'process' ? (
                        <div className="som-boiler-mini-card" style={{ minWidth: '200px', cursor: 'pointer' }}
                          onClick={(e) => openControl(e, 'SD FAN')}>
                          <div className="som-boiler-mini-header">
                            <span className="som-boiler-mini-tag">SD FAN</span>
                            <div className="som-boiler-status-indicator active"></div>
                          </div>
                          <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">AMP</span>
                              <span className="som-boiler-mini-value">8,9</span>
                              <span className="som-boiler-mini-unit">A</span>
                            </div>
                          </div>
                        </div>
                      ) : <BoilerMachineCard title="SD FAN" isMaintenance params={[{ label: 'AMP', value: '62.4', unit: 'A' }, { label: 'HZ', value: '48.5', unit: 'Hz' }, { label: 'VIB', value: '1.8', unit: 'mm/s' }]} />}
                    </foreignObject>

                    {/* DUST AIRLOCK Card - Ubah x dan y untuk tukar posisi */}
                    <foreignObject x={800} y={800} width="220" height="160" style={{ overflow: 'visible', zIndex: 10 }}>
                      <div className="som-boiler-mini-card" style={{ minWidth: '200px', cursor: 'pointer' }}
                        onClick={(e) => openControl(e, 'AIRLOCK', ['AIRLOCK'])}>
                        <div className="som-boiler-mini-header">
                          <span className="som-boiler-mini-tag">DUST AIRLOCK</span>
                          <div className="som-boiler-status-indicator active"></div>
                        </div>
                        <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                            <span className="som-boiler-mini-label">AMP</span>
                            <span className="som-boiler-mini-value">3,4</span>
                            <span className="som-boiler-mini-unit">A</span>
                          </div>
                        </div>
                      </div>
                    </foreignObject>

                    {/* DUST CONVEYOR Card - Ubah x dan y untuk tukar posisi */}
                    <foreignObject x={860} y={880} width="220" height="160" style={{ overflow: 'visible', zIndex: 10 }}>
                      <div className="som-boiler-mini-card" style={{ minWidth: '200px', cursor: 'pointer' }}
                        onClick={(e) => openControl(e, 'DUST CONVEYOR', ['DUST CONVEYOR'])}>
                        <div className="som-boiler-mini-header">
                          <span className="som-boiler-mini-tag">DUST CONVEYOR</span>
                          <div className="som-boiler-status-indicator active"></div>
                        </div>
                        <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                            <span className="som-boiler-mini-label">AMP</span>
                            <span className="som-boiler-mini-value">5,6</span>
                            <span className="som-boiler-mini-unit">A</span>
                          </div>
                        </div>
                      </div>
                    </foreignObject>

                    {/* Icons & Flows */}
                    <Flows viewMode={viewMode} isRunning={isRunning} />
                    <FanIconSVG x={47} y={425} isRunning={isRunning('FEEDER 1')} size={40} viewMode={viewMode} />
                    <FanIconSVG x={52} y={508} isRunning={isRunning('FEEDER 2')} size={40} viewMode={viewMode} />
                    <FanIconSVG x={668} y={962} isRunning={isRunning('FF FAN')} size={50} viewMode={viewMode} />
                    <FanIconSVG x={695} y={925} isRunning={isRunning('SD FAN')} size={40} viewMode={viewMode} />
                    <FanIconSVG x={220} y={971} isRunning={isRunning('FD FAN')} size={40} viewMode={viewMode} />
                    <FanIconSVG x={995} y={835} isRunning={isRunning('DUST CONVEYOR')} size={30} viewMode={viewMode} />
                    <FanIconSVG x={1233} y={932} isRunning={isRunning('AIRLOCK')} size={103} viewMode={viewMode} />
                    <FanIconSVG x={995} y={870} isRunning={isRunning('IDF FAN')} size={40} viewMode={viewMode} />
                    <FanIconSVG x={1355} y={413} isRunning={isRunning('PUMP 1')} size={40} viewMode={viewMode} />
                    <FanIconSVG x={1525} y={413} isRunning={isRunning('PUMP 2')} size={40} viewMode={viewMode} />

                    {/* Valve Actuators - Ubah x dan y untuk tukar posisi */}
                    <image href={valveActuatorSvg} x={650} y={80} width={80} height={80} />
                    <image href={valveActuatorSvg} x={950} y={125} width={80} height={80} />
                    <image href={valveActuatorSvg} x={1060} y={785} width={80} height={80}
                      style={{ transform: 'rotate(90deg)', transformBox: 'fill-box', transformOrigin: 'center' }}
                    />
                    {/* Valve ke-3 - Ubah x, y untuk posisi dan rotate untuk putaran (0, 90, 180, 270) */}

                    {/* TDS & BLOWDOWN Card - Ubah x dan y foreignObject untuk tukar posisi */}
                    <foreignObject x={1085} y={700} width="220" height="160" style={{ overflow: 'visible' }}>
                      <div className="som-boiler-mini-card" style={{ minWidth: '200px' }}>
                        <div className="som-boiler-mini-header">
                          <span className="som-boiler-mini-tag">BOILER WATER</span>
                          <div className="som-boiler-status-indicator active"></div>
                        </div>
                        <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                            <span className="som-boiler-mini-label">TDS</span>
                            <span className="som-boiler-mini-value">1,348</span>
                            <span className="som-boiler-mini-unit">mg/L</span>
                          </div>
                          <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                            <span className="som-boiler-mini-label">BLOWDOWN</span>
                            <span className="som-boiler-mini-value" style={{ color: '#ef4444', fontSize: '14px' }}>ON</span>
                          </div>
                        </div>
                      </div>
                    </foreignObject>
                    {/* ✅ Coordinate picker overlays */}
                    {isPickerMode && <CrosshairOverlay coords={coords} />}
                    {paths.map((points, i) => (
                      <InteractivePath
                        key={i}
                        points={points}
                        radius={radius}
                        isActive={i === activePathIndex}
                        isPickerMode={isPickerMode}
                        onSelect={() => setActivePathIndex(i)}
                        onPointDrag={(ptIdx, x, y) => updatePoint(i, ptIdx, x, y)}
                        onAddPoint={(insertIdx, x, y) =>
                          addPointToPath(i, insertIdx, x, y)
                        }
                        onPointDelete={(ptIdx) => deletePoint(i, ptIdx)}
                      />
                    ))}
                  </g>
                </svg>
                {isPickerMode && (
                  <CoordinatePanel
                    paths={paths}
                    activePathIndex={activePathIndex}
                    onSelectPath={setActivePathIndex}
                    onAddNewPath={addNewPath}
                    onUpdatePoint={updatePoint}
                    onAddPoint={addPointToPath}
                    onDeletePoint={deletePoint}
                    radius={radius}
                    setRadius={setRadius}
                    flowType={flowType}
                    setFlowType={setFlowType}
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="station-page-container">
            {activeView === 'FURNACE' && <FurnaceStation />}
            {activeView === 'WATERLEVEL' && <WaterLevelStation controlState={controlState} setControlState={setControlState} toggleMode={toggleMode} />}
            {activeView === 'GRAPHICS' && <GraphicsStation />}
            {activeView === 'WATERTREATMENT' && (
              <div className="som-boiler-flow-card" style={{ flex: 1, padding: '0', position: 'relative' }}>
                {/* WT Flow Builder Toggle */}
                <button
                  className={`wt-flow-toggle-btn ${wtFlow.isActive ? 'active' : ''}`}
                  onClick={wtFlow.toggle}
                  style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 150 }}
                >
                  <span>{wtFlow.isActive ? '🔴' : '🔧'}</span>
                  {wtFlow.isActive ? 'Exit Flow Builder' : 'Flow Builder'}
                </button>

                <div className="som-boiler-flow-body">
                  <svg ref={svgRef} viewBox="0 0 2000 1100" className="station-svg-canvas" preserveAspectRatio="xMidYMid slice" onMouseMove={handleMouseMove}>
                    <g transform="translate(200, 110) scale(0.8)">
                      <image href={waterTreatmentImageUrl} width="2000" height="1100" />
                      {/* TOP SUMMARY PANELS (Boiler Style) */}
                      <foreignObject x={40} y={140} width="700" height="300" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card" style={{ minWidth: '680px', borderTop: '3px solid #3b82f6' }}>
                          <div className="som-boiler-mini-header">
                            <span className="som-boiler-mini-tag">DASHBOARD SUMMARY</span>
                          </div>
                          <div className="som-boiler-mini-body">
                            <div className="som-boiler-mini-param">
                              <span className="som-boiler-mini-label">Feedwater Level</span>
                              <span className="som-boiler-mini-value">{monVal('WT FEEDWATER LEVEL', '80')}<span className="som-boiler-mini-unit">%</span></span>
                            </div>
                            <div className="som-boiler-mini-param">
                              <span className="som-boiler-mini-label">Feedwater TDS</span>
                              <span className="som-boiler-mini-value">{monVal('WT FEEDWATER TDS', '45')}<span className="som-boiler-mini-unit">ppm</span></span>
                            </div>
                            <div className="som-boiler-mini-param">
                              <span className="som-boiler-mini-label">Hardness</span>
                              <span className="som-boiler-mini-value">{monVal('WT FEEDWATER HARDNESS', '0')}<span className="som-boiler-mini-unit">ppm</span></span>
                            </div>
                          </div>
                        </div>
                      </foreignObject>

                      <foreignObject x={250} y={140} width="550" height="300" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card" style={{ minWidth: '530px', borderTop: '3px solid #f59e0b' }}>
                          <div className="som-boiler-mini-header">
                            <span className="som-boiler-mini-tag">SYSTEM PROCESS</span>
                          </div>
                          <div className="som-boiler-mini-body">
                            <div className="som-boiler-mini-param">
                              <span className="som-boiler-mini-label">Softener</span>
                              <span className="som-boiler-mini-value" style={{ fontSize: '14px', color: '#f59e0b' }}>RUNNING</span>
                            </div>
                            <div className="som-boiler-mini-param">
                              <span className="som-boiler-mini-label">Demin</span>
                              <span className="som-boiler-mini-value" style={{ fontSize: '14px', color: '#f59e0b' }}>RUNNING</span>
                            </div>
                            <div className="som-boiler-mini-param">
                              <span className="som-boiler-mini-label">Feedwater</span>
                              <span className="som-boiler-mini-value" style={{ fontSize: '14px', color: '#cbd5e1' }}>NORMAL</span>
                            </div>
                          </div>
                        </div>
                      </foreignObject>

                      {/* EQUIPMENT OVERLAYS (Boiler Style) */}
                      <foreignObject x={280} y={670} width="220" height="150" style={{ overflow: 'visible' }}>
                        <BoilerMachineCard title="SOFTENER" params={[{ label: 'PRESS', value: '3.65', unit: 'bar' }]} configMode={configMode} onTagEdit={handleTagEditRequest} />
                      </foreignObject>

                      <foreignObject x={750} y={670} width="220" height="150" style={{ overflow: 'visible' }}>
                        <BoilerMachineCard title="DEMIN" params={[{ label: 'PRESS', value: '3.65', unit: 'bar' }]} configMode={configMode} onTagEdit={handleTagEditRequest} />
                      </foreignObject>

                      {/* Hardness Indicators (Alert Style) */}
                      <foreignObject x={35} y={380} width="200" height="100" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card" style={{ minWidth: '180px', borderColor: 'rgba(239, 68, 68, 0.5)', background: 'rgba(15, 23, 42, 0.95)', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' }}>
                          <div className="som-boiler-mini-header" style={{ background: 'rgba(239, 68, 68, 0.2)', borderBottom: 'none' }}>
                            <span className="som-boiler-mini-tag" style={{ color: '#f87171' }}>HARDNESS</span>
                          </div>
                          <div className="som-boiler-mini-body">
                            <span className="som-boiler-mini-value" style={{ color: '#f87171', textAlign: 'center', fontSize: '24px' }}>35<span className="som-boiler-mini-unit" style={{ color: '#fca5a5' }}>ppm</span></span>
                          </div>
                        </div>
                      </foreignObject>

                      <foreignObject x={480} y={380} width="200" height="100" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card" style={{ minWidth: '180px', borderColor: 'rgba(239, 68, 68, 0.5)', background: 'rgba(15, 23, 42, 0.95)', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' }}>
                          <div className="som-boiler-mini-header" style={{ background: 'rgba(239, 68, 68, 0.2)', borderBottom: 'none' }}>
                            <span className="som-boiler-mini-tag" style={{ color: '#f87171' }}>HARDNESS</span>
                          </div>
                          <div className="som-boiler-mini-body">
                            <span className="som-boiler-mini-value" style={{ color: '#f87171', textAlign: 'center', fontSize: '24px' }}>15<span className="som-boiler-mini-unit" style={{ color: '#fca5a5' }}>ppm</span></span>
                          </div>
                        </div>
                      </foreignObject>

                      <foreignObject x={950} y={975} width="200" height="100" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card" style={{ minWidth: '180px', borderColor: 'rgba(56, 189, 248, 0.5)', background: 'rgba(15, 23, 42, 0.95)', boxShadow: '0 4px 15px rgba(56, 189, 248, 0.2)' }}>
                          <div className="som-boiler-mini-header" style={{ background: 'rgba(56, 189, 248, 0.1)', borderBottom: 'none' }}>
                            <span className="som-boiler-mini-tag" style={{ color: '#38bdf8' }}>HARDNESS</span>
                          </div>
                          <div className="som-boiler-mini-body">
                            <span className="som-boiler-mini-value" style={{ color: '#38bdf8', textAlign: 'center', fontSize: '24px' }}>0<span className="som-boiler-mini-unit" style={{ color: '#7dd3fc' }}>ppm</span></span>
                          </div>
                        </div>
                      </foreignObject>

                      <foreignObject x={170} y={850} width="200" height="100" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card" style={{ minWidth: '180px', borderColor: 'rgba(56, 189, 248, 0.5)', background: 'rgba(15, 23, 42, 0.95)', boxShadow: '0 4px 15px rgba(56, 189, 248, 0.2)' }}>
                          <div className="som-boiler-mini-header" style={{ background: 'rgba(56, 189, 248, 0.1)', borderBottom: 'none' }}>
                            <span className="som-boiler-mini-tag" style={{ color: '#38bdf8' }}>PUMP 1</span>
                          </div>
                          <div className="som-boiler-mini-body">
                            <span className="som-boiler-mini-value" style={{ color: '#38bdf8', textAlign: 'center', fontSize: '24px' }}>10<span className="som-boiler-mini-unit" style={{ color: '#7dd3fc' }}>A</span></span>
                          </div>
                        </div>
                      </foreignObject>
                      <foreignObject x={690} y={850} width="200" height="100" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card" style={{ minWidth: '180px', borderColor: 'rgba(56, 189, 248, 0.5)', background: 'rgba(15, 23, 42, 0.95)', boxShadow: '0 4px 15px rgba(56, 189, 248, 0.2)' }}>
                          <div className="som-boiler-mini-header" style={{ background: 'rgba(56, 189, 248, 0.1)', borderBottom: 'none' }}>
                            <span className="som-boiler-mini-tag" style={{ color: '#38bdf8' }}>PUMP 2</span>
                          </div>
                          <div className="som-boiler-mini-body">
                            <span className="som-boiler-mini-value" style={{ color: '#38bdf8', textAlign: 'center', fontSize: '24px' }}>10<span className="som-boiler-mini-unit" style={{ color: '#7dd3fc' }}>A</span></span>
                          </div>
                        </div>
                      </foreignObject>
                      <foreignObject x={940} y={865} width="200" height="100" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card" style={{ minWidth: '180px', borderColor: 'rgba(56, 189, 248, 0.5)', background: 'rgba(15, 23, 42, 0.95)', boxShadow: '0 4px 15px rgba(56, 189, 248, 0.2)' }}>
                          <div className="som-boiler-mini-header" style={{ background: 'rgba(56, 189, 248, 0.1)', borderBottom: 'none' }}>
                            <span className="som-boiler-mini-tag" style={{ color: '#38bdf8' }}>PUMP 3</span>
                          </div>
                          <div className="som-boiler-mini-body">
                            <span className="som-boiler-mini-value" style={{ color: '#38bdf8', textAlign: 'center', fontSize: '24px' }}>10<span className="som-boiler-mini-unit" style={{ color: '#7dd3fc' }}>A</span></span>
                          </div>
                        </div>
                      </foreignObject>
                      <foreignObject x={1165} y={865} width="200" height="100" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card" style={{ minWidth: '180px', borderColor: 'rgba(56, 189, 248, 0.5)', background: 'rgba(15, 23, 42, 0.95)', boxShadow: '0 4px 15px rgba(56, 189, 248, 0.2)' }}>
                          <div className="som-boiler-mini-header" style={{ background: 'rgba(56, 189, 248, 0.1)', borderBottom: 'none' }}>
                            <span className="som-boiler-mini-tag" style={{ color: '#38bdf8' }}>PUMP 4</span>
                          </div>
                          <div className="som-boiler-mini-body">
                            <span className="som-boiler-mini-value" style={{ color: '#38bdf8', textAlign: 'center', fontSize: '24px' }}>10<span className="som-boiler-mini-unit" style={{ color: '#7dd3fc' }}>A</span></span>
                          </div>
                        </div>
                      </foreignObject>
                      <foreignObject x={1530} y={780} width="200" height="140" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card" style={{ minWidth: '180px', borderColor: 'rgba(56, 189, 248, 0.5)', background: 'rgba(15, 23, 42, 0.95)', boxShadow: '0 4px 15px rgba(56, 189, 248, 0.2)' }}>
                          <div className="som-boiler-mini-header" style={{ background: 'rgba(56, 189, 248, 0.1)', borderBottom: 'none' }}>
                            <span className="som-boiler-mini-tag" style={{ color: '#38bdf8' }}>DEAERATOR PUMP</span>
                          </div>
                          <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">PUMP 1</span>
                              <span className="som-boiler-mini-value">10<span className="som-boiler-mini-unit">A</span></span>
                            </div>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">PUMP 2</span>
                              <span className="som-boiler-mini-value">10<span className="som-boiler-mini-unit">A</span></span>
                            </div>
                          </div>
                        </div>
                      </foreignObject>
                      <foreignObject x={1890} y={770} width="200" height="140" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card" style={{ minWidth: '180px', borderColor: 'rgba(56, 189, 248, 0.5)', background: 'rgba(15, 23, 42, 0.95)', boxShadow: '0 4px 15px rgba(56, 189, 248, 0.2)' }}>
                          <div className="som-boiler-mini-header" style={{ background: 'rgba(56, 189, 248, 0.1)', borderBottom: 'none' }}>
                            <span className="som-boiler-mini-tag" style={{ color: '#38bdf8' }}>VALVE PUMP</span>
                          </div>
                          <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">PUMP 1</span>
                              <span className="som-boiler-mini-value">10<span className="som-boiler-mini-unit">A</span></span>
                            </div>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">PUMP 2</span>
                              <span className="som-boiler-mini-value">10<span className="som-boiler-mini-unit">A</span></span>
                            </div>
                          </div>
                        </div>
                      </foreignObject>
                      <foreignObject x={1850} y={245} width="200" height="140" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card" style={{ minWidth: '180px', borderColor: 'rgba(56, 189, 248, 0.5)', background: 'rgba(15, 23, 42, 0.95)', boxShadow: '0 4px 15px rgba(56, 189, 248, 0.2)' }}>
                          <div className="som-boiler-mini-header" style={{ background: 'rgba(56, 189, 248, 0.1)', borderBottom: 'none' }}>
                            <span className="som-boiler-mini-tag" style={{ color: '#38bdf8' }}>TO BOILER PUMP</span>
                          </div>
                          <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">PUMP 1</span>
                              <span className="som-boiler-mini-value">10<span className="som-boiler-mini-unit">A</span></span>
                            </div>
                            <div className="som-boiler-mini-param" style={{ width: '100%' }}>
                              <span className="som-boiler-mini-label">PUMP 2</span>
                              <span className="som-boiler-mini-value">10<span className="som-boiler-mini-unit">A</span></span>
                            </div>
                          </div>
                        </div>
                      </foreignObject>

                      {/* MAIN TANKS (Boiler Style) */}
                      <foreignObject x={1340} y={635} width="220" height="150" style={{ overflow: 'visible' }}>
                        <BoilerMachineCard title="FW TANK" params={[{ label: 'LEVEL', value: '80.0', unit: '%' }, { label: 'TEMP', value: '110.6', unit: '°C' }]} configMode={configMode} onTagEdit={handleTagEditRequest} />
                      </foreignObject>

                      <foreignObject x={1160} y={250} width="220" height="150" style={{ overflow: 'visible' }}>
                        <BoilerMachineCard title="DEAERATOR" params={[{ label: 'PRESS', value: '3.65', unit: 'bar' }, { label: 'TEMP', value: '110.6', unit: '°C' }]} configMode={configMode} onTagEdit={handleTagEditRequest} />
                      </foreignObject>

                      {/* SMALL LABELS */}
                      <foreignObject x={1478} y={195} width="200" height="150" style={{ overflow: 'visible' }}>
                        <BoilerMachineCard title="LP VALVE" params={[{ label: 'PRESS', value: '3.65', unit: 'bar' }]} configMode={configMode} onTagEdit={handleTagEditRequest} />
                      </foreignObject>

                      <foreignObject x={1745} y={935} width="200" height="150" style={{ overflow: 'visible' }}>
                        <BoilerMachineCard title="STEAM IN" params={[{ label: 'PRESS', value: '3.05', unit: 'bar' }]} configMode={configMode} onTagEdit={handleTagEditRequest} />
                      </foreignObject>

                      <foreignObject x={1930} y={450} width="140" height="150" style={{ overflow: 'visible' }}>
                        <div className="som-boiler-mini-card interactive-label pulsate" style={{ border: '1px solid #f59e0b' }}>
                          <div className="som-boiler-mini-header"><span className="som-boiler-mini-tag">TO BOILER</span></div>
                          <div className="som-boiler-mini-body">
                            <span className="som-boiler-mini-value" style={{ textAlign: 'center', fontSize: '18px' }}>23.6<span className="som-boiler-mini-unit">m3/hr</span></span>
                          </div>
                        </div>
                      </foreignObject>

                      {/* WT Flow Builder Overlay */}
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

                      {/* Crosshair overlay when builder is active */}
                      {wtFlow.isActive && <CrosshairOverlay coords={coords} />}

                      {/* Permanent Water Flows — di atas semua overlay agar terlihat */}
                      <g className="wt-permanent-flows">
                        <LiquidFlowSVG
                          d="M 571,967 L 1124,967 Q 1142,967 1142,949 L 1142,930"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 143,846 L 145,455"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 17,455 L 433,454"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 329,461 L 329,531"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 186,738 L 187,528 Q 187,503 212,503 L 261,503 Q 278,503 279,520 L 279,536"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 336,939 L 336,966"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 126,968 L 470,968 Q 495,968 495,943 L 494,479 Q 494,454 519,454 L 946,454"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 656,850 L 656,463"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 839,460 L 839,531"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 694,745 L 692,524 Q 692,504 712,504 L 770,504 Q 784,504 784,519 L 784,533"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 838,936 L 838,962"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1083,964 L 1084,935"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1084,860 L 1086,839 Q 1088,826 1102,826 L 1102,826 Q 1115,825 1115,811 L 1114,530 Q 1114,510 1134,510 L 1182,511"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1142,875 L 1143,845 Q 1143,831 1129,828 L 1115,824"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1634,881 L 1717,880 Q 1734,880 1736,863 L 1737,846"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1677,879 L 1677,845"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <SteamFlowSVG
                          d="M 1294,874 L 1293,947 Q 1292,972 1317,972 L 1732,971"
                          active={true}
                          mode="flowing"
                          color="#38bdf8"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1680,776 L 1680,762 Q 1679,747 1693,743 L 1693,743 Q 1707,738 1707,723 L 1706,468 Q 1706,443 1681,443 L 1037,442 Q 1012,442 1012,417 L 1014,226 Q 1014,201 1039,201 L 1132,201"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1185,373 L 1184,393 Q 1182,412 1202,412 L 1748,411 Q 1773,411 1773,436 L 1773,861 Q 1773,880 1792,882 L 1792,882 Q 1810,884 1810,865 L 1809,842"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1810,778 L 1811,756 Q 1812,743 1825,742 L 1825,742 Q 1838,740 1838,727 L 1839,459 Q 1839,434 1864,433 L 1891,431"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1827,342 L 1894,342 Q 1919,342 1918,367 L 1917,409 Q 1916,434 1941,434 L 1982,433"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1798,882 L 1845,882 Q 1861,882 1865,867 L 1869,851"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1737,790 L 1736,766 Q 1736,749 1721,743 L 1705,737"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1868,774 L 1868,762 Q 1867,749 1856,744 L 1839,736"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1892,433 L 1892,399 Q 1892,374 1867,374 L 1713,374"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1676,351 L 1676,316"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />

                        {/* New flow: horizontal pipe M 17,454 → 433,454 */}
                        <LiquidFlowSVG
                          d="M 17,454 L 433,454"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <LiquidFlowSVG
                          d="M 1850,433 L 1981,434"
                          isRunning={true}
                          color="#38bdf8"
                          dotColor="#ffffff"
                          thickness={8}
                        />
                        <SteamFlowSVG
                          d="M 1347,215 L 1346,193 Q 1345,170 1368,170 L 1483,172"
                          active={true}
                          mode="flowing"
                          color="#38bdf8"
                          thickness={8}
                        />

                        {/* Valve Actuators — 6 green (OPEN), 6 red (CLOSED) */}
                        {/* Green valves */}
                        <ValveImage x={230} y={415} rotate={0} size={50} filter="hue-rotate(330deg) saturate(4) brightness(1.1)" />
                        <ValveImage x={360} y={930} rotate={0} size={50} filter="hue-rotate(330deg) saturate(4) brightness(1.1)" />
                        <ValveImage x={750} y={415} rotate={0} size={50} filter="hue-rotate(360deg) saturate(4) brightness(1.1)" />
                        <ValveImage x={880} y={930} rotate={0} size={50} filter="hue-rotate(330deg) saturate(4) brightness(1.1)" />
                        <ValveImage x={1380} y={132} rotate={0} size={50} filter="hue-rotate(330deg) saturate(4) brightness(1.1)" />



                        {/* Red valves */}
                        <ValveImage x={360} y={415} rotate={0} filter="sepia(1) saturate(5) hue-rotate(310deg) brightness(1.1)" />
                        <ValveImage x={230} y={930} rotate={0} filter="sepia(1) saturate(5) hue-rotate(310deg) brightness(1.1)" />
                        <ValveImage x={880} y={415} rotate={0} filter="sepia(1) saturate(5) hue-rotate(310deg) brightness(1.1)" />
                        <ValveImage x={750} y={930} rotate={0} filter="sepia(1) saturate(5) hue-rotate(310deg) brightness(1.1)" />
                        <ValveImage x={205} y={472} rotate={0} size={40} filter="sepia(1) saturate(5) hue-rotate(310deg) brightness(1.1)" />
                        <ValveImage x={720} y={472} rotate={0} size={40} filter="sepia(1) saturate(5) hue-rotate(310deg) brightness(1.1)" />
                        <ValveImage x={105} y={502} rotate={270} filter="sepia(1) saturate(5) hue-rotate(310deg) brightness(1.1)" />
                        <ValveImage x={617} y={502} rotate={270} filter="sepia(1) saturate(5) hue-rotate(310deg) brightness(1.1)" />

                        {/* Motor Icons - 2 motors */}
                        <MotorImage x={45} y={710} rotate={90} />
                        <MotorImage x={560} y={710} rotate={90} />
                        <MotorImage x={1650} y={110} rotate={90} />
                        <MotorImage x={1768} y={110} rotate={90} />

                        {/* Text Labels */}
                        <TextLabel x={100} y={810} text="NaCl" rotate={270} color="#0e0d0d" fontSize={28} fontWeight="bold" />
                        <TextLabel x={615} y={814} text="H2S04" rotate={270} color="#0e0d0d" fontSize={28} fontWeight="bold" />
                        <TextLabel x={1095} y={680} text="SOFTENER PUMP 1" rotate={270} color="#0e0d0d" fontSize={20} fontWeight="bold" />
                        <TextLabel x={1140} y={680} text="SOFTENER PUMP 2" rotate={270} color="#0e0d0d" fontSize={20} fontWeight="bold" />
                        <TextLabel x={1680} y={590} text="DEAREATOR PUMP 1" rotate={270} color="#0e0d0d" fontSize={20} fontWeight="bold" />
                        <TextLabel x={1735} y={590} text="DEAREATOR PUMP 2" rotate={270} color="#0e0d0d" fontSize={20} fontWeight="bold" />
                        <TextLabel x={1814} y={590} text="FEED WATER PUMP 1" rotate={270} color="#0e0d0d" fontSize={20} fontWeight="bold" />
                        <TextLabel x={1870} y={590} text="FEED WATER PUMP 2" rotate={270} color="#0e0d0d" fontSize={20} fontWeight="bold" />
                        <TextLabel x={230} y={400} text="SOFTENER" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={230} y={412} text="INLET" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={370} y={385} text="SOFTENER" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={370} y={400} text="BACKWASH" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={370} y={413} text="INLET" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={170} y={610} text="Air Relief Valve " rotate={270} color="#0e0d0d" fontSize={20} fontWeight="bold" />
                        <TextLabel x={640} y={620} text="Air Relief Valve " rotate={270} color="#0e0d0d" fontSize={20} fontWeight="bold" />
                        <TextLabel x={750} y={400} text="DEMIN" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={750} y={412} text="INLET" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={880} y={385} text="DEMIN" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={880} y={400} text="BACKWASH" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={880} y={413} text="INLET" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={230} y={990} text="SOFTENER" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={230} y={1005} text="BACKWASH" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={230} y={1020} text="INLET" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={390} y={990} text="SOFTENER" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={390} y={1005} text="INLET" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={750} y={990} text="DEMIN" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={750} y={1020} text="INLET" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={880} y={990} text="DEMIN" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={750} y={1005} text="BACKWASH" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={880} y={1005} text="INLET" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={1680} y={300} text="VALVE 1" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={1800} y={300} text="VALVE 2" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={1820} y={400} text="CHEMICAL 1" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />
                        <TextLabel x={1970} y={350} text="CHEMICAL 2" rotate={0} color="#0e0d0d" fontSize={15} fontWeight="bold" />



                      </g>
                    </g>
                  </svg>

                  {/* WT Flow Builder Panel */}
                  {wtFlow.isActive && (
                    <WTFlowPanel
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
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <ControlModal
        data={controlPopup}
        onClose={() => setControlPopup(null)}
        tagMap={tagMap}
        onCommand={handleCommand}
        commandStatus={commandStatus}
        canControl={canControl}
      />
      <TagEditorModal data={tagEdit} tagMap={tagMap} availableTags={availableTags} onClose={() => setTagEdit(null)} onSave={handleTagSave} saving={savingTags} />

      {/* Combined Card Edit Modal */}
      {showCombinedCard && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }} onClick={() => setShowCombinedCard(false)}>
          <div style={{
            background: '#ffffff', borderRadius: '12px', padding: '0',
            width: '340px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
            border: '1px solid #e2e8f0', overflow: 'hidden'
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ background: '#ffdb3b', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>FURNACE</span>
              <button onClick={() => setShowCombinedCard(false)} style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#0f172a', lineHeight: 1 }}>×</button>
            </div>
            {/* Body */}
            <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Temperature */}
              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                  TEMPERATURE (°C)
                </label>
                <input
                  type="number"
                  value={manualTemp}
                  onChange={e => setManualTemp(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0',
                    borderRadius: '6px', fontSize: '20px', fontWeight: '900',
                    color: '#0f172a', outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'Inter, system-ui, sans-serif'
                  }}
                />
              </div>
              {/* Brightness */}
              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                  BRIGHTNESS (lm)
                </label>
                <input
                  type="number"
                  value={manualBrightness}
                  onChange={e => setManualBrightness(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0',
                    borderRadius: '6px', fontSize: '20px', fontWeight: '900',
                    color: '#0f172a', outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'Inter, system-ui, sans-serif'
                  }}
                />
              </div>
              {/* Draft */}
              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                  DRAFT (mm h2o)
                </label>
                <input
                  type="number"
                  value={manualDraft}
                  onChange={e => setManualDraft(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0',
                    borderRadius: '6px', fontSize: '20px', fontWeight: '900',
                    color: '#0f172a', outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'Inter, system-ui, sans-serif'
                  }}
                />
              </div>
              {/* Save Button */}
              <button
                onClick={() => setShowCombinedCard(false)}
                style={{
                  background: '#ffdb3b', border: 'none', borderRadius: '8px',
                  padding: '10px', fontSize: '12px', fontWeight: '900',
                  color: '#0f172a', cursor: 'pointer', textTransform: 'uppercase',
                  letterSpacing: '0.05em', marginTop: '4px'
                }}
              >
                SAVE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEAM Card Edit Modal */}
      {showSteamCard && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }} onClick={() => setShowSteamCard(false)}>
          <div style={{
            background: '#ffffff', borderRadius: '12px', padding: '0',
            width: '340px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
            border: '1px solid #e2e8f0', overflow: 'hidden'
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ background: '#ffdb3b', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>STEAM</span>
              <button onClick={() => setShowSteamCard(false)} style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#0f172a', lineHeight: 1 }}>×</button>
            </div>
            {/* Body */}
            <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Pressure */}
              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                  PRESSURE (Bar)
                </label>
                <input
                  type="number"
                  value={manualSteamPress}
                  onChange={e => setManualSteamPress(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0',
                    borderRadius: '6px', fontSize: '20px', fontWeight: '900',
                    color: '#0f172a', outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'Inter, system-ui, sans-serif'
                  }}
                />
              </div>
              {/* Flow */}
              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                  FLOW (T/H)
                </label>
                <input
                  type="number"
                  value={manualSteamFlow}
                  onChange={e => setManualSteamFlow(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0',
                    borderRadius: '6px', fontSize: '20px', fontWeight: '900',
                    color: '#0f172a', outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'Inter, system-ui, sans-serif'
                  }}
                />
              </div>
              {/* Temp */}
              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                  TEMPERATURE (°C)
                </label>
                <input
                  type="number"
                  value={manualSteamTemp}
                  onChange={e => setManualSteamTemp(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0',
                    borderRadius: '6px', fontSize: '20px', fontWeight: '900',
                    color: '#0f172a', outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'Inter, system-ui, sans-serif'
                  }}
                />
              </div>
              {/* Save Button */}
              <button
                onClick={() => setShowSteamCard(false)}
                style={{
                  background: '#ffdb3b', border: 'none', borderRadius: '8px',
                  padding: '10px', fontSize: '12px', fontWeight: '900',
                  color: '#0f172a', cursor: 'pointer', textTransform: 'uppercase',
                  letterSpacing: '0.05em', marginTop: '4px'
                }}
              >
                SAVE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const DefsOverlay = () => (
  <defs>
    <pattern id="diagGrid" width="100" height="100" patternUnits="userSpaceOnUse">
      <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255, 219, 59, 0.2)" strokeWidth="1" />
      <circle cx="0" cy="0" r="1.5" fill="rgba(255, 219, 59, 0.4)" />
    </pattern>
    <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#ffdb3b" />
    </filter>

    {/* Water Flow Gradient - Blue realistic water */}
    <linearGradient id="waterGradientRealistic" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#0284c7" stopOpacity="0.4" />
      <stop offset="30%" stopColor="#0ea5e9" stopOpacity="0.85" />
      <stop offset="50%" stopColor="#38bdf8" stopOpacity="1" />
      <stop offset="70%" stopColor="#0ea5e9" stopOpacity="0.85" />
      <stop offset="100%" stopColor="#0284c7" stopOpacity="0.4" />
    </linearGradient>

    {/* Steam Flow Gradient - White/gray steam */}
    <linearGradient id="steamGradientRealistic" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.3" />
      <stop offset="30%" stopColor="#e2e8f0" stopOpacity="0.7" />
      <stop offset="50%" stopColor="#ffffff" stopOpacity="0.9" />
      <stop offset="70%" stopColor="#e2e8f0" stopOpacity="0.7" />
      <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.3" />
    </linearGradient>
  </defs>
)

const DiagOverlay = ({ viewX, viewWidth, bannerX }) => (
  <g className="som-diag-group">
    <rect x={viewX} y="-100" width={viewWidth} height="1300" fill="url(#diagGrid)" className="som-diag-grid" />
    <foreignObject x={viewX} y="-100" width={viewWidth} height="1300" style={{ pointerEvents: 'none', overflow: 'visible' }}>
      <div className="som-diag-scanline"></div>
    </foreignObject>
    <foreignObject x={bannerX} y="30" width="800" height="100" style={{ overflow: 'visible' }}>
      <div className="som-diagnostic-banner">
        TECHNICAL DIAGNOSTIC ACTIVE
      </div>
    </foreignObject>
  </g>
)

const FanIconSVG = ({ x, y, isRunning, size = 80, viewMode }) => {
  const isMaintenance = viewMode === 'maintenance';
  const cx = x;  // center x
  const cy = y;  // center y
  const half = size / 2;

  // Glow filter id unique per position to avoid conflicts
  const filterId = `fan-glow-${x}-${y}`;
  const shadowId = `fan-shadow-${x}-${y}`;

  // Color based on mode - Mewah amber theme
  const glowColor = isMaintenance ? '14, 165, 233' : '245, 158, 11';
  const ringImg = isRunning ? ringFanOnUrl : ringFanOffUrl;

  return (
    <g>
      <defs>
        {/* Enhanced glow filter for running state */}
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={isRunning ? '4' : '0'} result="blur" />
          <feFlood floodColor={`rgb(${glowColor})`} floodOpacity={isRunning ? '0.8' : '0'} result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Outer shadow/outline for running state */}
        <filter id={shadowId} x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#ffdb3b" floodOpacity={isRunning ? '0.6' : '0'} />
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#f59e0b" floodOpacity={isRunning ? '0.8' : '0'} />
        </filter>
      </defs>

      {/* Ring image — switches color based on status with enhanced filter */}
      <image
        href={ringImg}
        x={cx - half}
        y={cy - half}
        width={size}
        height={size}
        filter={isRunning ? `url(#${filterId}) url(#${shadowId})` : 'none'}
        style={{
          transition: 'all 0.3s ease'
        }}
      />

      {/* Fan blades — spinning when running */}
      <foreignObject
        x={cx - half}
        y={cy - half}
        width={size}
        height={size}
        style={{ pointerEvents: 'none' }}
      >
        <div
          className={isRunning ? 'm-v7-visual spinning' : 'm-v7-visual'}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            boxShadow: 'none'
          }}
        >
          <img
            src={fanSvg}
            style={{
              width: '100%',
              height: '100%',
              opacity: isRunning ? 1 : 0.6,
              filter: isRunning ? 'drop-shadow(0 0 4px rgba(255, 219, 59, 0.5))' : 'grayscale(0.3)',
              transition: 'all 0.3s ease'
            }}
          />
        </div>
      </foreignObject>
    </g>
  );
};


const Flows = ({ viewMode, isRunning }) => (
  <>

    {/* branch from Pump 2 - Always show for testing */}
    <LiquidFlowSVG
      d="M 1439,392 L 1438,224 Q 1438,208 1427,198 L 1415,187"
      isRunning={true}
      color="#38bdf8"
      thickness={15}
    />

    {/* branch from Pump 1 - Always show for testing */}
    <LiquidFlowSVG
      d="M 1621,391 L 1622,250 Q 1622,230 1618,211 L 1618,211 Q 1613,192 1594,189 L 1591,189 Q 1568,185 1545,185 L 842,188"
      isRunning={true}
      color="#38bdf8"
      thickness={15}
    />

    {/* Steam flow output */}
    <SteamFlowSVG
      d="M 800,155 L 795,149 Q 789,143 781,143 L 157,143"
      active={true}
      mode="flowing"
      color="#38bdf8"
      thickness={4}
    />
  </>
);

export const LiquidFlowSVG = ({
  d,
  points,
  isRunning,
  mode = "liquid",
  flowing = true,
  color = "#38bdf8",
  dotColor,
  thickness = 8,
}) => {
  if (!isRunning) return null;

  const pathD = d || (points ? `M ${points}` : "");
  if (!pathD) return null;

  return (
    <g style={{ pointerEvents: "none" }}>
      {/* 1. Outer Glow */}
      <path
        d={pathD}
        className="oc-water-path-base"
        style={{
          stroke: color,
          strokeWidth: `${thickness + Math.min(12, thickness * 0.8)}px`,
          filter: `blur(${Math.min(6, thickness * 0.4)}px)`,
          opacity: 0.4,
        }}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 2. Inner Rim */}
      <path
        d={pathD}
        className="oc-water-path-base"
        style={{
          stroke: color,
          strokeWidth: `${thickness + Math.min(2, thickness * 0.2)}px`,
          filter: `blur(${Math.min(3, thickness * 0.2)}px)`,
          opacity: 0.6,
        }}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 3. Core */}
      <path
        d={pathD}
        className="oc-water-path-stream"
        style={{
          stroke: color,
          strokeWidth: `${Math.max(thickness * 0.7, 1)}px`,
          filter: `blur(${thickness < 8 ? 0 : 1.5}px) drop-shadow(0px 0px 5px rgba(0,0,0,0.7))`,
          opacity: 1,
        }}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 4. Surface Highlight / Dotted */}
      <path
        d={pathD}
        className={
          mode === "dotted" ? "oc-water-path-dotted" : "oc-water-path-highlight"
        }
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          animationPlayState: flowing ? "running" : "paused",
          strokeWidth: `${Math.max(2.5, thickness / 6)}px`,
          ...(dotColor ? { stroke: dotColor } : {})
        }}
      />
    </g>
  );
};

export const WaterFlowSVG = ({ d, points, isRunning }) => (
  <LiquidFlowSVG d={d} points={points} isRunning={isRunning} color="#38bdf8" thickness={15} />
);

export const SteamFlowSVG = ({ d, points, active, isRunning, mode = "flowing", color = "#f59e0b", thickness = 2 }) => {
  const isActive = active !== undefined ? active : isRunning;
  if (!isActive) return null;

  const pathD = d || (points ? `M ${points}` : "");
  if (!pathD) return null;

  let modeClass = "liquid-flow--flowing";
  if (mode === "standby") modeClass = "liquid-flow--standby";
  if (mode === "liquid") modeClass = "liquid-flow--liquid";

  return (
    <g className={modeClass} style={{ pointerEvents: "none" }}>
      <path
        d={pathD}
        fill="none"
        stroke={color}
        className="liquid-flow-glow"
        style={{
          strokeWidth: `${thickness * 2.2}px`,
          filter: `blur(${Math.max(1, thickness * 0.8)}px)`,
        }}
        pointerEvents="none"
      />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        className="liquid-flow-aura"
        style={{
          strokeWidth: `${thickness}px`,
          filter: `blur(${Math.max(0.5, thickness * 0.3)}px)`,
        }}
        pointerEvents="none"
      />
    </g>
  );
};

export default BoilerHousePage;

