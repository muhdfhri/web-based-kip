import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { createPortal } from 'react-dom';
import usePlcStore from '@core/store';
import './SettingsView.css';

// ============================================================================
// DEFAULT INITIAL CONFIGURATIONS
// ============================================================================
const DEFAULT_PID_STEAM = {
  efb1: { sp: 0, p: 0, i: 0, d: 0, min: 0, max: 0, startValue: 0 },
  efb2: { sp: 0, p: 0, i: 0, d: 0, min: 0, max: 0, startValue: 0 },
  efb3: { sp: 0, p: 0, i: 0, d: 0, min: 0, max: 0, startValue: 0 },
  efb4: { sp: 0, p: 0, i: 0, d: 0, min: 0, max: 0, startValue: 0 },
};

const DEFAULT_PID_DILUTION = {
  efb1: { sp: 0, p: 0, i: 0, d: 0, min: 0, max: 0, startValue: 0 },
  efb2: { sp: 0, p: 0, i: 0, d: 0, min: 0, max: 0, startValue: 0 },
  efb3: { sp: 0, p: 0, i: 0, d: 0, min: 0, max: 0, startValue: 0 },
  efb4: { sp: 0, p: 0, i: 0, d: 0, min: 0, max: 0, startValue: 0 },
};

const DEFAULT_MIN_MAX_AMP_LOAD = {
  efb1: { ampMin: 0, ampMax: 0, loadMin: 0, loadMax: 0 },
  efb2: { ampMin: 0, ampMax: 0, loadMin: 0, loadMax: 0 },
  efb3: { ampMin: 0, ampMax: 0, loadMin: 0, loadMax: 0 },
  efb4: { ampMin: 0, ampMax: 0, loadMin: 0, loadMax: 0 },
};

const EFB_MACHINES = [
  { key: 'efb1', title: 'EFB NO. 1', num: 1 },
  { key: 'efb2', title: 'EFB NO. 2', num: 2 },
  { key: 'efb3', title: 'EFB NO. 3', num: 3 },
  { key: 'efb4', title: 'EFB NO. 4', num: 4 },
];

const PID_FIELDS = [
  { key: 'sp', label: 'SP' },
  { key: 'p', label: 'P' },
  { key: 'i', label: 'I' },
  { key: 'd', label: 'D' },
  { key: 'min', label: 'Min' },
  { key: 'max', label: 'Max' },
];

const authHeaders = () => {
  const token = localStorage.getItem('kip_token');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ============================================================================
// PLC TAG EDITOR MODAL (Exact Sterilizer Matching)
// ============================================================================
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
          initial[key] = tagMap[key] || '';
        });
      } else {
        const targets = data.subs && data.subs.length > 0 ? data.subs : [data.targetId];
        targets.forEach((t) => {
          initial[`${t}__STATUS`] = tagMap[`${t}__STATUS`] || '';
          initial[`${t}__START`] = tagMap[`${t}__START`] || '';
          initial[`${t}__STOP`] = tagMap[`${t}__STOP`] || '';
        });
        if (!data.subs || data.subs.length === 0) {
          initial[`${data.targetId}__MONITOR`] = tagMap[`${data.targetId}__MONITOR`] || '';
        }
      }
      setLocalTags(initial);
    }
  }, [data, tagMap]);

  if (!data) return null;

  const isGroup = data.subs && data.subs.length > 0;
  const hasSignals = data.signals && data.signals.length > 0;

  const renderTagSelect = (value, onChange, tagList, label) => (
    <div className="tag-field" style={{ marginBottom: 0 }}>
      <label
        style={{
          fontSize: '12px',
          fontWeight: 700,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '6px',
          display: 'block',
        }}
      >
        {label}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.15)',
          background: '#0f172a',
          color: '#f8fafc',
          fontSize: '14px',
          fontWeight: 600,
          outline: 'none',
          cursor: 'pointer',
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
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        className="som-equipment-control-popup som-tag-edit-popup"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isGroup ? 'min(960px, 92vw)' : 'min(560px, 90vw)',
          maxHeight: '88vh',
          background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          boxShadow: '0 25px 60px -12px rgba(0,0,0,0.7), 0 0 30px rgba(59,130,246,0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 800,
                color: '#f8fafc',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              ⚙️ PLC Tag Configuration
            </h2>
            <span
              style={{
                fontSize: '12px',
                color: '#94a3b8',
                marginTop: '4px',
                display: 'block',
                fontWeight: 500,
              }}
            >
              Hardware Mapping: <strong style={{ color: '#60a5fa' }}>{data.targetId}</strong>
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#cbd5e1',
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '24px 28px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {hasSignals ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {data.signals.map((sig) => {
                const sigKey = sig.key || sig;
                const sigLabel = sig.label || sigKey;
                const k = `${data.targetId}__${sigKey}`;
                return (
                  <div key={sigKey}>
                    {renderTagSelect(
                      localTags[k] || '',
                      (val) => setLocalTags((prev) => ({ ...prev, [k]: val })),
                      availableTags,
                      sigLabel
                    )}
                  </div>
                );
              })}
            </div>
          ) : isGroup ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {data.subs.map((sub, index) => (
                <div
                  key={index}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <h3
                    style={{
                      margin: '0 0 12px 0',
                      fontSize: '13px',
                      color: '#60a5fa',
                      textTransform: 'uppercase',
                    }}
                  >
                    {sub}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    {renderTagSelect(
                      localTags[`${sub}__STATUS`] || '',
                      (val) => setLocalTags((prev) => ({ ...prev, [`${sub}__STATUS`]: val })),
                      availableTags,
                      'STATUS (READ)'
                    )}
                    {renderTagSelect(
                      localTags[`${sub}__START`] || '',
                      (val) => setLocalTags((prev) => ({ ...prev, [`${sub}__START`]: val })),
                      availableTags,
                      'START (WRITE)'
                    )}
                    {renderTagSelect(
                      localTags[`${sub}__STOP`] || '',
                      (val) => setLocalTags((prev) => ({ ...prev, [`${sub}__STOP`]: val })),
                      availableTags,
                      'STOP (WRITE)'
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ width: '100%', margin: '0 auto' }}>
              {renderTagSelect(
                localTags[`${data.targetId}__MONITOR`] || '',
                (val) => setLocalTags((prev) => ({ ...prev, [`${data.targetId}__MONITOR`]: val })),
                availableTags,
                'MONITORING POINT (READ)'
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            background: 'rgba(15, 23, 42, 0.6)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)',
              color: '#cbd5e1',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            CANCEL
          </button>
          <button
            disabled={saving}
            onClick={() => onSave(localTags, data)}
            style={{
              padding: '10px 28px',
              borderRadius: '8px',
              border: 'none',
              background: saving ? '#475569' : '#2563eb',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              opacity: saving ? 0.6 : 1,
              boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
            }}
          >
            {saving ? 'SAVING...' : 'CONFIRM MAPPING'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ============================================================================
// MAIN SETTINGS VIEW COMPONENT
// ============================================================================
export default function SettingsView({
  onSelectSubmenu,
  onClose,
  onBack,
  user,
  configMode: propConfigMode = false,
  handleEquipmentClick: propHandleEquipmentClick,
  tagMap: propTagMap,
  getMappedValue: propGetMappedValue,
}) {
  const [configMode, setConfigMode] = useState(propConfigMode);
  const [activeSet, setActiveSet] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [activeKeypad, setActiveKeypad] = useState(null);

  // PLC Config states
  const [tagEdit, setTagEdit] = useState(null);
  const [tagMap, setTagMap] = useState(propTagMap || {});
  const [availableTags, setAvailableTags] = useState([]);
  const [savingTags, setSavingTags] = useState(false);
  const [liveValues, setLiveValues] = useState({});

  const plcTags = usePlcStore((state) => state.tags);
  const initSocket = usePlcStore((state) => state.initSocket);
  const isConnected = usePlcStore((state) => state.isConnected);

  useEffect(() => {
    if (initSocket) initSocket();
  }, [initSocket]);

  useEffect(() => {
    setConfigMode(propConfigMode);
  }, [propConfigMode]);

  useEffect(() => {
    if (propTagMap && Object.keys(propTagMap).length > 0) {
      setTagMap(propTagMap);
    }
  }, [propTagMap]);

  // Global Developer Shortcut (Ctrl + X) to toggle PLC Tag Config Mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        setConfigMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch Available Tags
  const fetchAvailableTags = useCallback(async () => {
    try {
      const res = await fetch('/api/efb-plant/plc-config/tags', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setAvailableTags(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch EFB PLC tags', err);
    }
  }, []);

  useEffect(() => {
    fetchAvailableTags();
  }, [fetchAvailableTags]);

  // Load Station Tag Mappings
  useEffect(() => {
    const loadMappings = async () => {
      try {
        const res = await fetch('/api/efb-plant/plc-config/station-mappings/EFB-PLANT', { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            const restored = {};
            data.data.forEach((m) => {
              restored[`${m.equipment}__${m.signal_key}`] = String(m.tag_id);
            });
            setTagMap((prev) => ({ ...restored, ...prev }));
          }
        }
      } catch (err) {
        console.error('Failed to load EFB station tag mappings', err);
      }
    };
    loadMappings();
  }, []);

  // Map Tag ID -> Tag Name for fast O(1) lookup
  const tagIdToName = useMemo(() => {
    const map = {};
    availableTags.forEach((t) => {
      map[String(t.id)] = t.tag_name;
    });
    return map;
  }, [availableTags]);

  // Fast Available Tags Map O(1)
  const availableTagsMap = useMemo(() => {
    const map = {};
    availableTags.forEach((t) => {
      map[String(t.id)] = t;
    });
    return map;
  }, [availableTags]);

  // Polling Live Values
  const fetchLiveValues = useCallback(async () => {
    try {
      const res = await fetch('/api/efb-plant/plc-config/tags-live', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setLiveValues(data.data || {});
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchLiveValues();
    const interval = setInterval(fetchLiveValues, isConnected ? 2000 : 200);
    return () => clearInterval(interval);
  }, [fetchLiveValues, isConnected]);

  // Internal getMappedValue resolver
  const internalGetMappedValue = useCallback(
    (equipmentKey, signalKey = 'MONITOR') => {
      if (propGetMappedValue) {
        const propVal = propGetMappedValue(equipmentKey, signalKey);
        if (propVal !== undefined && propVal !== null && propVal !== 'No Tag' && propVal !== 'no tag' && propVal !== '--') return propVal;
      }

      const key = `${equipmentKey}__${signalKey}`;
      const tagId = tagMap[key];
      if (!tagId || tagId === 'null' || tagId === 'undefined' || tagId === 'none' || tagId === '') {
        return 0;
      }

      const tagName = tagIdToName[String(tagId)];
      if (tagName && plcTags && plcTags[tagName] !== undefined && plcTags[tagName].value !== undefined) {
        const raw = plcTags[tagName].value;
        const num = parseFloat(raw);
        return isNaN(num) ? (raw ?? 0) : Math.round((num + Number.EPSILON) * 100) / 100;
      }

      if (liveValues[tagId] !== undefined && liveValues[tagId] !== null) {
        const raw = liveValues[tagId];
        const num = parseFloat(raw);
        return isNaN(num) ? (raw ?? 0) : Math.round((num + Number.EPSILON) * 100) / 100;
      }

      if (tagName && liveValues[tagName] !== undefined && liveValues[tagName] !== null) {
        const raw = liveValues[tagName];
        const num = parseFloat(raw);
        return isNaN(num) ? (raw ?? 0) : Math.round((num + Number.EPSILON) * 100) / 100;
      }

      return 0;
    },
    [propGetMappedValue, tagMap, tagIdToName, plcTags, liveValues]
  );

  // Handle Tag Click in Developer / Config Mode
  const handleEquipmentClick = (id, subs = [], signals = null) => {
    if (propHandleEquipmentClick) {
      propHandleEquipmentClick(id, subs, signals);
    }
    setTagEdit({ targetId: id, subs, signals });
  };

  // Save Tag Mapping
  const handleTagSave = async (updatedTags) => {
    setSavingTags(true);
    try {
      const mappings = [];
      for (const [key, tagId] of Object.entries(updatedTags)) {
        const [equipment, ...sigParts] = key.split('__');
        const signal_key = sigParts.join('__');
        mappings.push({
          station: 'EFB-PLANT',
          equipment,
          signal_key,
          tag_id: tagId ? parseInt(tagId, 10) : null,
        });
      }

      await fetch('/api/efb-plant/plc-config/station-mappings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({ mappings }),
      });

      setTagMap((prev) => ({ ...prev, ...updatedTags }));
      setTagEdit(null);
    } catch (err) {
      console.error('Failed to save EFB tag mappings', err);
      alert('Failed to save PLC tag mapping.');
    } finally {
      setSavingTags(false);
    }
  };

  // Developer mode outline style helper (matching Sterilizer standard)
  const getDeveloperStyle = (id, signalKey) => {
    if (!configMode) return {};
    const hasTag = tagMap && (tagMap[`${id}__${signalKey}`] || tagMap[`${id}__VALUE`] || tagMap[`${id}__SETPOINT`]);
    return {
      outline: hasTag ? '1.5px solid #3b82f6' : '2px solid #ef4444',
      boxShadow: hasTag ? '0 0 6px rgba(59, 130, 246, 0.5)' : '0 0 8px rgba(239, 68, 68, 0.6)',
      backgroundColor: hasTag ? 'transparent' : 'rgba(239, 68, 68, 0.12)',
      cursor: 'pointer',
      position: 'relative',
    };
  };

  // Local persistent state
  const [steamPid, setSteamPid] = useState(() => {
    try {
      const saved = localStorage.getItem('efb_settings_steam_pid');
      return saved ? JSON.parse(saved) : { 1: { ...DEFAULT_PID_STEAM } };
    } catch {
      return { 1: { ...DEFAULT_PID_STEAM } };
    }
  });

  const [dilutionPid, setDilutionPid] = useState(() => {
    try {
      const saved = localStorage.getItem('efb_settings_dilution_pid');
      return saved ? JSON.parse(saved) : { 1: { ...DEFAULT_PID_DILUTION } };
    } catch {
      return { 1: { ...DEFAULT_PID_DILUTION } };
    }
  });

  const [minMaxAmpLoad, setMinMaxAmpLoad] = useState(() => {
    try {
      const saved = localStorage.getItem('efb_settings_min_max_amp_load');
      return saved ? JSON.parse(saved) : { 1: { ...DEFAULT_MIN_MAX_AMP_LOAD } };
    } catch {
      return { 1: { ...DEFAULT_MIN_MAX_AMP_LOAD } };
    }
  });

  // Load saved settings from backend API on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/efb-plant/settings/all', { headers: authHeaders() });
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && json.data) {
          const { steamPid: apiSteam, dilutionPid: apiDilution, minMaxAmpLoad: apiMinMax } = json.data;
          if (apiSteam && Object.keys(apiSteam).length > 0) {
            setSteamPid(apiSteam);
            localStorage.setItem('efb_settings_steam_pid', JSON.stringify(apiSteam));
          }
          if (apiDilution && Object.keys(apiDilution).length > 0) {
            setDilutionPid(apiDilution);
            localStorage.setItem('efb_settings_dilution_pid', JSON.stringify(apiDilution));
          }
          if (apiMinMax && Object.keys(apiMinMax).length > 0) {
            setMinMaxAmpLoad(apiMinMax);
            localStorage.setItem('efb_settings_min_max_amp_load', JSON.stringify(apiMinMax));
          }
        }
      } catch (err) {
        console.warn('Failed to load initial EFB plant settings from server:', err);
      }
    };
    loadSettings();
  }, []);

  // Track draft uncommitted edits
  const [pendingEdits, setPendingEdits] = useState({});

  const currentSteam = steamPid[activeSet] || DEFAULT_PID_STEAM;
  const currentDilution = dilutionPid[activeSet] || DEFAULT_PID_DILUTION;
  const currentMinMax = minMaxAmpLoad[activeSet] || DEFAULT_MIN_MAX_AMP_LOAD;

  // Save changes & write to PLC Simulator
  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('efb_settings_steam_pid', JSON.stringify(steamPid));
      localStorage.setItem('efb_settings_dilution_pid', JSON.stringify(dilutionPid));
      localStorage.setItem('efb_settings_min_max_amp_load', JSON.stringify(minMaxAmpLoad));

      const editedKeys = Object.keys(pendingEdits);
      setPendingEdits({});

      const token = localStorage.getItem('kip_token');
      const res = await fetch('/api/efb-plant/settings/all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ steamPid, dilutionPid, minMaxAmpLoad, activeSet, editedKeys }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status: ${res.status}`);
      }
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to save settings.');
      }

      // Also trigger sendCommand via usePlcStore for real-time WebSocket broadcast
      const sendPlc = (val, eqKey, sigKey) => {
        if (val === undefined || val === null) return;
        const fullKey = `${eqKey}__${sigKey}`;
        const tagId = tagMap[fullKey] || tagMap[`${eqKey}__SETPOINT`] || tagMap[`${eqKey}__VALUE`];
        if (tagId && usePlcStore.getState().sendCommand) {
          usePlcStore.getState().sendCommand(tagId, Number(val), fullKey, 'efb-plant');
        }
      };

      const curSteam = steamPid[activeSet] || DEFAULT_PID_STEAM;
      const curDil = dilutionPid[activeSet] || DEFAULT_PID_DILUTION;
      const curMm = minMaxAmpLoad[activeSet] || DEFAULT_MIN_MAX_AMP_LOAD;

      EFB_MACHINES.forEach((m) => {
        PID_FIELDS.forEach((f) => {
          sendPlc(curSteam[m.key]?.[f.key], `efb_steam_pid_efb${m.num}_${f.key}`, f.key.toUpperCase());
          sendPlc(curDil[m.key]?.[f.key], `efb_dilution_pid_efb${m.num}_${f.key}`, f.key.toUpperCase());
        });
        sendPlc(curSteam[m.key]?.startValue, `efb_steam_pid_efb${m.num}_startValue`, 'STARTVALUE');
        sendPlc(curDil[m.key]?.startValue, `efb_dilution_pid_efb${m.num}_startValue`, 'STARTVALUE');

        sendPlc(curMm[m.key]?.ampMin, `efb_minmax_efb${m.num}_ampMin`, 'AMPMIN');
        sendPlc(curMm[m.key]?.ampMax, `efb_minmax_efb${m.num}_ampMax`, 'AMPMAX');
        sendPlc(curMm[m.key]?.loadMin, `efb_minmax_efb${m.num}_loadMin`, 'LOADMIN');
        sendPlc(curMm[m.key]?.loadMax, `efb_minmax_efb${m.num}_loadMax`, 'LOADMAX');
      });

      alert('EFB Plant Settings saved & written to PLC Simulator successfully!');
    } catch (e) {
      console.error('Error saving EFB plant settings:', e);
      alert('Failed to save settings: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Back to overview handler
  const handleBackToOverview = () => {
    if (onClose) {
      onClose();
    }
    if (onBack) {
      onBack();
    }
    if (onSelectSubmenu) {
      onSelectSubmenu('EFB Plant', 'Station View');
    }
  };

  // Cancel draft edits
  const handleCancel = () => {
    try {
      const savedSteam = localStorage.getItem('efb_settings_steam_pid');
      if (savedSteam) setSteamPid(JSON.parse(savedSteam));
      const savedDil = localStorage.getItem('efb_settings_dilution_pid');
      if (savedDil) setDilutionPid(JSON.parse(savedDil));
      const savedMinMax = localStorage.getItem('efb_settings_min_max_amp_load');
      if (savedMinMax) setMinMaxAmpLoad(JSON.parse(savedMinMax));
      setPendingEdits({});
      handleBackToOverview();
    } catch (e) {
      console.error(e);
      handleBackToOverview();
    }
  };

  // Restore defaults
  const handleRestoreDefault = () => {
    if (window.confirm('Restore all EFB Plant settings to default values?')) {
      setSteamPid((prev) => ({ ...prev, [activeSet]: { ...DEFAULT_PID_STEAM } }));
      setDilutionPid((prev) => ({ ...prev, [activeSet]: { ...DEFAULT_PID_DILUTION } }));
      setMinMaxAmpLoad((prev) => ({ ...prev, [activeSet]: { ...DEFAULT_MIN_MAX_AMP_LOAD } }));
      setPendingEdits({});
    }
  };

  // Export settings to JSON
  const handleExport = () => {
    const exportData = {
      steamPid,
      dilutionPid,
      minMaxAmpLoad,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EFB_Plant_Settings_Set_${activeSet}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import settings from JSON
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (json.steamPid) setSteamPid(json.steamPid);
        if (json.dilutionPid) setDilutionPid(json.dilutionPid);
        if (json.minMaxAmpLoad) setMinMaxAmpLoad(json.minMaxAmpLoad);
        alert('Settings imported successfully!');
      } catch (err) {
        alert('Failed to parse settings file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Keypad confirmation
  const handleKeypadConfirm = (newVal) => {
    if (!activeKeypad) return;
    const { type, machineKey, field } = activeKeypad;
    const pendingKey = `${type}_${activeSet}_${machineKey}_${field}`;

    setPendingEdits((prev) => ({ ...prev, [pendingKey]: newVal }));

    if (type === 'steam') {
      setSteamPid((prev) => ({
        ...prev,
        [activeSet]: {
          ...(prev[activeSet] || DEFAULT_PID_STEAM),
          [machineKey]: {
            ...((prev[activeSet] || DEFAULT_PID_STEAM)[machineKey]),
            [field]: newVal,
          },
        },
      }));
    } else if (type === 'dilution') {
      setDilutionPid((prev) => ({
        ...prev,
        [activeSet]: {
          ...(prev[activeSet] || DEFAULT_PID_DILUTION),
          [machineKey]: {
            ...((prev[activeSet] || DEFAULT_PID_DILUTION)[machineKey]),
            [field]: newVal,
          },
        },
      }));
    } else if (type === 'minmax') {
      setMinMaxAmpLoad((prev) => ({
        ...prev,
        [activeSet]: {
          ...(prev[activeSet] || DEFAULT_MIN_MAX_AMP_LOAD),
          [machineKey]: {
            ...((prev[activeSet] || DEFAULT_MIN_MAX_AMP_LOAD)[machineKey]),
            [field]: newVal,
          },
        },
      }));
    }

    setActiveKeypad(null);
  };

  // Helper for PID value box
  const renderPidValBox = (type, machineKey, field, label, efbNum) => {
    const isSteam = type === 'steam';
    const sourceData = isSteam ? currentSteam : currentDilution;
    const machineObj = sourceData[machineKey] || {};
    const val = machineObj[field] !== undefined && machineObj[field] !== null && machineObj[field] !== '' ? machineObj[field] : 0;

    const eqKey = `efb_${type}_pid_efb${efbNum}_${field}`;
    const sigKey = field.toUpperCase();
    const pendingKey = `${type}_${activeSet}_${machineKey}_${field}`;
    const hasDraft = pendingEdits[pendingKey] !== undefined;

    let displayVal = val;
    if (hasDraft) {
      displayVal = pendingEdits[pendingKey];
    } else {
      const mapped = internalGetMappedValue(eqKey, sigKey);
      if (mapped !== 'No Tag' && mapped !== 'no tag' && mapped !== '--' && mapped !== null && mapped !== undefined && mapped !== '') {
        displayVal = mapped;
      } else {
        displayVal = val !== undefined && val !== null ? val : 0;
      }
    }
    if (displayVal === undefined || displayVal === null || displayVal === '' || displayVal === 'No Tag' || displayVal === 'no tag' || displayVal === '--') {
      displayVal = 0;
    }

    return (
      <div
        className={`som-press-box ${hasDraft ? 'has-draft-val' : ''}`}
        style={getDeveloperStyle(eqKey, sigKey)}
        onClick={() => {
          if (configMode) {
            handleEquipmentClick(eqKey, [], [{ key: sigKey, label: `${isSteam ? 'Steam' : 'Dilution'} EFB ${efbNum} ${label}` }]);
          } else {
            setActiveKeypad({
              type,
              machineKey,
              field,
              label: `${isSteam ? 'Steam PID' : 'Dilution PID'} - EFB ${efbNum} ${label}`,
              initialVal: displayVal,
            });
          }
        }}
        title={hasDraft ? 'Draft uncommitted edit' : configMode ? 'Click to configure PLC tag mapping' : `Click to edit ${label}`}
      >
        {displayVal}
      </div>
    );
  };

  // Helper for SETT MIN-MAX Amp & Load value box
  const renderMinMaxValBox = (machineKey, field, label, efbNum) => {
    const machineObj = currentMinMax[machineKey] || {};
    const val = machineObj[field] !== undefined && machineObj[field] !== null && machineObj[field] !== '' ? machineObj[field] : 0;

    const eqKey = `efb_minmax_efb${efbNum}_${field}`;
    const sigKey = field.toUpperCase();
    const pendingKey = `minmax_${activeSet}_${machineKey}_${field}`;
    const hasDraft = pendingEdits[pendingKey] !== undefined;

    let displayVal = val;
    if (hasDraft) {
      displayVal = pendingEdits[pendingKey];
    } else {
      const mapped = internalGetMappedValue(eqKey, sigKey);
      if (mapped !== 'No Tag' && mapped !== 'no tag' && mapped !== '--' && mapped !== null && mapped !== undefined && mapped !== '') {
        displayVal = mapped;
      } else {
        displayVal = val !== undefined && val !== null ? val : 0;
      }
    }
    if (displayVal === undefined || displayVal === null || displayVal === '' || displayVal === 'No Tag' || displayVal === 'no tag' || displayVal === '--') {
      displayVal = 0;
    }

    return (
      <div
        className={`som-press-box som-minmax-val-box ${hasDraft ? 'has-draft-val' : ''}`}
        style={getDeveloperStyle(eqKey, sigKey)}
        onClick={() => {
          if (configMode) {
            handleEquipmentClick(eqKey, [], [{ key: sigKey, label: `EFB ${efbNum} ${label}` }]);
          } else {
            setActiveKeypad({
              type: 'minmax',
              machineKey,
              field,
              label: `EFB ${efbNum} ${label}`,
              initialVal: displayVal,
            });
          }
        }}
        title={hasDraft ? 'Draft uncommitted edit' : configMode ? 'Click to configure PLC tag mapping' : `Click to edit ${label}`}
      >
        {displayVal}
      </div>
    );
  };

  return (
    <section className="som-efb-station-root">
      {/* ── HEADER (Identical to Sterilizer Header) ── */}
      <header className="som-sterilizer-station-header">
        <div className="som-header-left">
          <h2 className="som-sterilizer-station-title">EFB Plant Station</h2>
        </div>

        <div className="som-view-toggle-container" style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="som-view-btn"
            onClick={handleBackToOverview}
          >
            PROCESS VIEW
          </button>
          <button
            type="button"
            className="som-view-btn"
            disabled
            style={{ cursor: 'not-allowed', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            MAINTENANCE VIEW
            <svg width="10" height="12" viewBox="0 0 448 512" fill="currentColor" style={{ marginLeft: '4px' }}>
              <path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z" />
            </svg>
          </button>
          <button
            type="button"
            className="som-view-btn active"
            style={{ marginLeft: '8px' }}
          >
            ⚙️ SETTINGS
          </button>
        </div>
      </header>

      {/* ── MAIN SETTINGS PAGE VIEWPORT ── */}
      <div className="som-ster-page-efb">
        {/* Top Bar with Set Tabs (Matching Sterilizer .som-settings-top-bar) */}
        <div className="som-settings-top-bar">
          <div className="som-line-tabs-container">
            <span className="som-tab-group-label">CONFIGURATION SET:</span>
            <div className="som-line-tabs">
              {[1, 2, 3].map((setNum) => (
                <button
                  key={setNum}
                  type="button"
                  className={`som-line-tab-btn ${activeSet === setNum ? 'active' : ''}`}
                  onClick={() => setActiveSet(setNum)}
                >
                  SET {setNum}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content columns */}
        <div className="som-settings-columns-container-efb">
          {/* Top Half: SETT PID VALVE STEAM & SETT PID VALVE DILUTION */}
          <div className="som-efb-top-split">
            {/* Card 1: SETT PID VALVE STEAM */}
            <div className="som-settings-card">
              <div className="som-settings-card-header">
                <span>SETT PID VALVE STEAM</span>
                <span className="som-card-header-badge">SET {activeSet}</span>
              </div>
              <div className="som-settings-card-body">
                <div className="som-efb-pid-grid">
                  {EFB_MACHINES.map((m) => (
                    <div key={m.key} className="som-efb-machine-col">
                      <div className="som-efb-machine-header-bar">
                        <div className="som-efb-minmax-title-pill">
                          <span className="som-efb-minmax-dot" />
                          <span className="som-efb-minmax-name">{m.title}</span>
                        </div>
                      </div>
                      <div className="som-efb-params-list">
                        {PID_FIELDS.map((f) => (
                          <div key={f.key} className="som-efb-param-row">
                            <span className="som-efb-param-label">{f.label}</span>
                            {renderPidValBox('steam', m.key, f.key, f.label, m.num)}
                          </div>
                        ))}
                      </div>

                      <div className="som-efb-col-divider">
                        <span className="som-efb-divider-pill">START</span>
                      </div>

                      <div className="som-efb-start-row">
                        <span className="som-efb-start-label">Start Value</span>
                        {renderPidValBox('steam', m.key, 'startValue', 'Start Value', m.num)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2: SETT PID VALVE DILUTION */}
            <div className="som-settings-card">
              <div className="som-settings-card-header">
                <span>SETT PID VALVE DILUTION</span>
                <span className="som-card-header-badge">SET {activeSet}</span>
              </div>
              <div className="som-settings-card-body">
                <div className="som-efb-pid-grid">
                  {EFB_MACHINES.map((m) => (
                    <div key={m.key} className="som-efb-machine-col">
                      <div className="som-efb-machine-header-bar">
                        <div className="som-efb-minmax-title-pill">
                          <span className="som-efb-minmax-dot" />
                          <span className="som-efb-minmax-name">{m.title}</span>
                        </div>
                      </div>
                      <div className="som-efb-params-list">
                        {PID_FIELDS.map((f) => (
                          <div key={f.key} className="som-efb-param-row">
                            <span className="som-efb-param-label">{f.label}</span>
                            {renderPidValBox('dilution', m.key, f.key, f.label, m.num)}
                          </div>
                        ))}
                      </div>

                      <div className="som-efb-col-divider">
                        <span className="som-efb-divider-pill">START</span>
                      </div>

                      <div className="som-efb-start-row">
                        <span className="som-efb-start-label">Start Value</span>
                        {renderPidValBox('dilution', m.key, 'startValue', 'Start Value', m.num)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Half: SETT MIN-MAX Amp & Load (Premium Modern Mewah Design) */}
          <div className="som-efb-bottom-split">
            <div className="som-settings-card" style={{ height: '100%' }}>
              <div className="som-settings-card-header">
                <span>SETT MIN-MAX Amp & Load</span>
                <span className="som-card-header-badge">SET {activeSet}</span>
              </div>
              <div className="som-settings-card-body">
                <div className="som-efb-minmax-grid">
                  {EFB_MACHINES.map((m) => (
                    <div key={m.key} className="som-efb-minmax-col">
                      <div className="som-efb-minmax-header-bar">
                        <div className="som-efb-minmax-title-pill">
                          <span className="som-efb-minmax-dot" />
                          <span className="som-efb-minmax-name">{m.title}</span>
                        </div>
                      </div>
                      <div className="som-minmax-content">
                        <div className="som-minmax-row som-minmax-header-row">
                          <span className="som-minmax-label-th">SETT</span>
                          <span className="som-minmax-col-th">MIN</span>
                          <span className="som-minmax-col-th">MAX</span>
                        </div>
                        <div className="som-minmax-row">
                          <div className="som-minmax-param-name">
                            <span>Amp</span>
                            <span className="som-minmax-unit">A</span>
                          </div>
                          <div className="som-minmax-cell">
                            {renderMinMaxValBox(m.key, 'ampMin', 'Amp Min', m.num)}
                          </div>
                          <div className="som-minmax-cell">
                            {renderMinMaxValBox(m.key, 'ampMax', 'Amp Max', m.num)}
                          </div>
                        </div>
                        <div className="som-minmax-row">
                          <div className="som-minmax-param-name">
                            <span>Load</span>
                            <span className="som-minmax-unit">%</span>
                          </div>
                          <div className="som-minmax-cell">
                            {renderMinMaxValBox(m.key, 'loadMin', 'Load Min', m.num)}
                          </div>
                          <div className="som-minmax-cell">
                            {renderMinMaxValBox(m.key, 'loadMax', 'Load Max', m.num)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── FOOTER ACTIONS (Sterilizer Standard) ── */}
        <footer className="som-settings-footer-actions">
          <div className="som-footer-left-group">
            <button
              type="button"
              className="som-footer-btn som-btn-save-settings"
              onClick={handleSave}
              disabled={isSaving}
            >
              <svg width="12" height="12" viewBox="0 0 448 512" fill="currentColor">
                <path d="M433.9 129.9l-83.9-83.9A47.9 47.9 0 0 0 316.1 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V195.9c0-12.7-5.1-25-14.1-34zM224 416c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64zm96-304.8V192H128V111.2h192z" />
              </svg>
              {isSaving ? 'Saving...' : 'Save Setting'}
            </button>
            <button
              type="button"
              className="som-footer-btn som-btn-cancel-settings"
              onClick={handleCancel}
            >
              <svg width="12" height="12" viewBox="0 0 352 512" fill="currentColor">
                <path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.19 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.19 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z" />
              </svg>
              Cancel
            </button>
            <button
              type="button"
              className="som-footer-btn som-btn-restore-settings"
              onClick={handleRestoreDefault}
            >
              <svg width="12" height="12" viewBox="0 0 512 512" fill="currentColor">
                <path d="M485.5 285.5c-4.7-4.7-12.3-4.7-17 0L450 304c-35.3-35.3-84-56-138-56-106 0-192 86-192 192s86 192 192 192c82.3 0 152.9-52 179.9-125 2.7-7.4-1.1-15.5-8.5-18.2s-15.5 1.1-18.2 8.5C439 462.6 378.8 504 312 504c-88.4 0-160-71.6-160-160s71.6-160 160-160c45.1 0 85.8 18.7 115.3 48.7l-24.8 24.8c-4.7 4.7-4.7 12.3 0 17 4.7 4.7 12.3 4.7 17 0l46-46c4.7-4.7 4.7-12.3 0-17z" />
              </svg>
              Restore Default
            </button>
          </div>

          <div className="som-footer-right-group">
            <button
              type="button"
              className="som-footer-btn som-btn-export-settings"
              onClick={handleExport}
            >
              <svg width="12" height="12" viewBox="0 0 448 512" fill="currentColor">
                <path d="M384 128h-80V48c0-8.8-7.2-16-16-16h-128c-8.8 0-16 7.2-16 16v80H64c-35.3 0-64 28.7-64 64v224c0 35.3 28.7 64 64 64h320c35.3 0 64-28.7 64-64V192c0-35.3-28.7-64-64-64zm-144 240v64c0 8.8-7.2 16-16 16h-32c-8.8 0-16-7.2-16-16v-64h-64c-8.8 0-16-7.2-16-16v-32c0-8.8 7.2-16 16-16h64v-64c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v64h64c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16h-64z" />
              </svg>
              Export Setting
            </button>
            <label className="som-footer-btn som-btn-import-settings" style={{ cursor: 'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 448 512" fill="currentColor">
                <path d="M384 384H64v-80c0-8.8-7.2-16-16-16H16c-8.8 0-16 7.2-16 16v96c0 35.3 28.7 64 64 64h320c35.3 0 64-28.7 64-64v-96c0-8.8-7.2-16-16-16h-32c-8.8 0-16 7.2-16 16v80zm-136-192V64c0-8.8-7.2-16-16-16h-32c-8.8 0-16 7.2-16 16v128h-64c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h224c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16h-64z" />
              </svg>
              Import Setting
              <input type="file" accept=".json,.xlsx" style={{ display: 'none' }} onChange={handleImport} />
            </label>
          </div>
        </footer>
      </div>

      {/* ── MODAL EDIT PLC TAG MAPPING (Portal) ── */}
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

      {/* ── NUMERIC KEYPAD MODAL (PORTAL) ── */}
      {activeKeypad && (
        <NumericKeypad
          label={activeKeypad.label}
          unit={activeKeypad.unit || ''}
          value={activeKeypad.initialVal !== undefined ? activeKeypad.initialVal : 0}
          onConfirm={handleKeypadConfirm}
          onClose={() => setActiveKeypad(null)}
        />
      )}
    </section>
  );
}

// ============================================================================
// NUMERIC KEYPAD MODAL COMPONENT (Exact Sterilizer Keypad)
// ============================================================================
function NumericKeypad({ value, onConfirm, onClose, label, unit }) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (typeof value === 'number') {
      return Number.isInteger(value) ? value.toString() : value.toFixed(1);
    }
    return String(value || '0');
  });

  const handleNumber = (n) => {
    setDisplayValue((prev) => (prev === '0' ? n.toString() : prev + n.toString()));
  };

  const handleDecimal = () => {
    if (!displayValue.includes('.')) setDisplayValue(displayValue + '.');
  };

  const handleBack = () => {
    setDisplayValue((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
  };

  const handleEnter = () => {
    const num = parseFloat(displayValue);
    onConfirm(isNaN(num) ? 0 : num);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleNumber(parseInt(e.key, 10));
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

  return createPortal(
    <div className="som-numeric-keypad-backdrop" onClick={onClose}>
      <div className="som-numeric-keypad" onClick={(e) => e.stopPropagation()}>
        <div className="som-numeric-keypad-header">
          <span className="som-numeric-keypad-label">{label}</span>
          <button
            type="button"
            className="som-numeric-keypad-close-btn"
            onClick={onClose}
            title="Tutup (Esc)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="som-numeric-keypad-display">
          <span className="som-numeric-keypad-value">{displayValue}</span>
          {unit && <span className="som-numeric-keypad-unit">{unit}</span>}
        </div>

        <div className="som-keypad-grid-container">
          {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((n) => (
            <button
              type="button"
              key={n}
              className="som-keypad-btn"
              onClick={() => handleNumber(n)}
            >
              {n}
            </button>
          ))}
          <button type="button" className="som-keypad-btn" onClick={handleDecimal}>.</button>
          <button type="button" className="som-keypad-btn" onClick={() => handleNumber(0)}>0</button>
          <button
            type="button"
            className="som-keypad-btn"
            onClick={handleBack}
            title="Backspace"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
              <line x1="18" y1="9" x2="12" y2="15" />
              <line x1="12" y1="9" x2="18" y2="15" />
            </svg>
          </button>
          <button
            type="button"
            className="som-keypad-btn-clear"
            onClick={() => setDisplayValue('0')}
          >
            CLEAR
          </button>
          <button
            type="button"
            className="som-keypad-btn-enter"
            onClick={handleEnter}
          >
            ENTER
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
