import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import usePlcStore from '@core/store'
import './ThreshingStationPage.css'
import ThreshingStationSettingsPage from './settings/ThreshingStationSettingsPage.jsx'
import OverviewTab from './tabs/Overview/OverviewTab.jsx'
import AiGradingMpdTab from './tabs/AiGradingMpd/AiGradingMpdTab.jsx'
import AiGradingEbcTab from './tabs/AiGradingEbc/AiGradingEbcTab.jsx'

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

function ThreshingStationPage({ user, onSelectSubmenu }) {
  const initSocket = usePlcStore(state => state.initSocket)
  const tags = usePlcStore(state => state.tags)
  const getTag = (tagName) => {
    return tags[tagName] || { value: 0, status: 'STOP', timestamp: null };
  }

  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const [viewMode, setViewMode] = useState('process')
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const svgRef = useRef(null)

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
        const res = await fetch("/api/threshing/plc-config/tags", { headers: authHeaders() });
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
        const res = await fetch("/api/threshing/plc-config/station-mappings/THRESHING", { headers: authHeaders() });
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
      const res = await fetch("/api/threshing/plc-config/tags-live", { headers: authHeaders() });
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
    const tagData = tags[tagName];
    if (tagData && tagData.value !== undefined) return tagData.value;
    if (liveValues[tagName] !== undefined) return liveValues[tagName];
    return null;
  }, [tagMap, tagIdToName, tags, liveValues]);

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
        mappings.push({ station: "THRESHING", equipment: parts[0], signal_key: parts[1], tag_id: parseInt(tagId) });
      }
      if (mappings.length > 0) {
        await fetch("/api/threshing/plc-config/station-mappings", {
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
    initSocket()
  }, [initSocket])

  const handleMouseMove = (e) => {
    if (!svgRef.current) return
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
    setCoords({ x: Math.round(svgP.x), y: Math.round(svgP.y) })
  }

  const handleEquipmentClick = (id, subs = [], signals = null) => {
    if (configMode) {
      handleTagEditRequest(id, subs, signals);
      return;
    }
    console.log(`Equipment clicked: ${id}`);
  };

  const motorData = {
    tippler: {
      freq: getTag('TSR_TIP_HZ').value,
      amp: getTag('TSR_TIP_AMP').value,
      ampTag: 'TSR_TIP_AMP',
      run: getTag('TSR_TIP_RUN').value === 1 || getTag('TSR_TIP_RUN').value === true
    },
    sfbAutofeeder: {
      freq: getTag('TSR_AF_HZ').value,
      amp: getTag('TSR_AF_AMP').value,
      ampTag: 'TSR_AF_AMP',
      run: getTag('TSR_AF_RUN').value === 1 || getTag('TSR_AF_RUN').value === true
    },
    sfbConveyor: {
      freq: getTag('TSR_SFBC_HZ').value,
      amp: getTag('TSR_SFBC_AMP').value,
      ampTag: 'TSR_SFBC_AMP',
      run: getTag('TSR_SFBC_RUN').value === 1 || getTag('TSR_SFBC_RUN').value === true
    },
    thresher1: {
      freq: getTag('TSR_TH1_HZ').value,
      amp: getTag('TSR_TH1_AMP').value,
      pct: getTag('TSR_TH1_PCT').value,
      ampTag: 'TSR_TH1_AMP',
      run: getTag('TSR_TH1_RUN').value === 1 || getTag('TSR_TH1_RUN').value === true
    },
    thresher2: {
      freq: getTag('TSR_TH2_HZ').value,
      amp: getTag('TSR_TH2_AMP').value,
      pct: getTag('TSR_TH2_PCT').value,
      ampTag: 'TSR_TH2_AMP',
      run: getTag('TSR_TH2_RUN').value === 1 || getTag('TSR_TH2_RUN').value === true
    },
    thresher3: {
      freq: getTag('TSR_TH3_HZ').value,
      amp: getTag('TSR_TH3_AMP').value,
      pct: getTag('TSR_TH3_PCT').value,
      ampTag: 'TSR_TH3_AMP',
      run: getTag('TSR_TH3_RUN').value === 1 || getTag('TSR_TH3_RUN').value === true
    },
    underThresherConv1: {
      amp: getTag('TSR_BC1_AMP').value,
      ampTag: 'TSR_BC1_AMP',
      run: getTag('TSR_BC1_RUN').value === 1 || getTag('TSR_BC1_RUN').value === true
    },
    underThresherConv2: {
      amp: getTag('TSR_BC2_AMP').value,
      ampTag: 'TSR_BC2_AMP',
      run: getTag('TSR_BC2_RUN').value === 1 || getTag('TSR_BC2_RUN').value === true
    },
    underThresherConv3: {
      amp: getTag('TSR_BC3_AMP').value,
      ampTag: 'TSR_BC3_AMP',
      run: getTag('TSR_BC3_RUN').value === 1 || getTag('TSR_BC3_RUN').value === true
    },
    bottomCrossConv: {
      freq: getTag('TSR_CC_HZ').value,
      amp: getTag('TSR_CC_AMP').value,
      ampTag: 'TSR_CC_AMP',
      run: getTag('TSR_CC_RUN').value === 1 || getTag('TSR_CC_RUN').value === true
    },
    fruitElevator1: {
      amp: getTag('TSR_EL1_AMP').value,
      pct: getTag('TSR_EL1_PCT').value,
      ampTag: 'TSR_EL1_AMP',
      run: getTag('TSR_EL1_RUN').value === 1 || getTag('TSR_EL1_RUN').value === true
    },
    fruitElevator2: {
      amp: getTag('TSR_EL2_AMP').value,
      pct: getTag('TSR_EL2_PCT').value,
      ampTag: 'TSR_EL2_AMP',
      run: getTag('TSR_EL2_RUN').value === 1 || getTag('TSR_EL2_RUN').value === true
    },
    bunchCrusher: {
      amp: getTag('TSR_BCR_AMP').value,
      ampTag: 'TSR_BCR_AMP',
      run: getTag('TSR_BCR_RUN').value === 1 || getTag('TSR_BCR_RUN').value === true
    },
    efbHorizontalConv: {
      amp: getTag('TSR_SFBDC_AMP').value,
      ampTag: 'TSR_SFBDC_AMP',
      run: getTag('TSR_SFBDC_RUN').value === 1 || getTag('TSR_SFBDC_RUN').value === true
    },
    usbElevator: {
      amp: getTag('TSR_USBC_AMP').value,
      ampTag: 'TSR_USBC_AMP',
      run: getTag('TSR_USBC_RUN').value === 1 || getTag('TSR_USBC_RUN').value === true
    },
    efbInclinedConv: {
      amp: getTag('TSR_EFBIC_AMP').value,
      ampTag: 'TSR_EFBIC_AMP',
      run: getTag('TSR_EFBIC_RUN').value === 1 || getTag('TSR_EFBIC_RUN').value === true
    },
  }

  const stationStats = {
    score: getTag('TSR_SCORE').value || 0,
    throughput: getTag('TSR_THROUGHPUT').value || 0,
    usbCount: getTag('TSR_USB_COUNT').value || 0,
    psbCount: getTag('TSR_PSB_COUNT').value || 0,
    totalUsbRejected: getTag('TSR_USB_REJ').value || 0,
    totalPsbRejected: getTag('TSR_PSB_REJ').value || 0,
    sterilEfficiency: getTag('TSR_STER_EFF').value || 0,
    threshEfficiency: getTag('TSR_TH_EFF').value || 0,
  }

  return (
    <>
      {showSettings ? (
        <ThreshingStationSettingsPage
          onClose={() => setShowSettings(false)}
          onSelectSubmenu={onSelectSubmenu}
          configMode={configMode}
          handleEquipmentClick={handleEquipmentClick}
          tagMap={tagMap}
        />
      ) : (
        <section className={`som-thresher-station som-mode-${viewMode} ${configMode ? 'som-config-active' : ''}`}>
      <header className="som-thresher-station-header">
        <div className="som-header-left">
          <h1 className="som-thresher-station-title">THRESHING STATION</h1>

          <div className="som-station-tabs">
            <button className={`som-station-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
            <button className={`som-station-tab ${activeTab === 'ai-grading-mpd' ? 'active' : ''}`} onClick={() => setActiveTab('ai-grading-mpd')}>AI GRADING - MPD</button>
            <button className={`som-station-tab ${activeTab === 'ai-grading-ebc' ? 'active' : ''}`} onClick={() => setActiveTab('ai-grading-ebc')}>AI GRADING - EBC</button>
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

      <div className="som-thresher-main">
        <div className="som-thresher-layout">
          {activeTab === 'overview' ? (
            <OverviewTab
              viewMode={viewMode}
              configMode={configMode}
              tagMap={tagMap}
              handleEquipmentClick={handleEquipmentClick}
              lv={lv}
              motorData={motorData}
              stationStats={stationStats}
              svgRef={svgRef}
              handleMouseMove={handleMouseMove}
            />
          ) : activeTab === 'ai-grading-mpd' ? (
            <AiGradingMpdTab
              configMode={configMode}
              availableTags={availableTags}
              tagMap={tagMap}
            />
          ) : (
            <AiGradingEbcTab
              configMode={configMode}
              availableTags={availableTags}
              tagMap={tagMap}
            />
          )}
        </div>
      </div>
      </section>
      )}

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
    </>
  )
}

export default ThreshingStationPage;
