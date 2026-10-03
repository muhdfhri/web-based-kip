import React, { useState, useEffect, Fragment, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import "./EFBCalibrationView.css";
import usePlcStore from "@core/store";

const ValBox = ({ value, decimals = 1, onClick, style, isEdited, isEditable = false }) => {
  const formatValue = (v) => {
    if (v === null || v === undefined || v === "" || v === "No Tag" || v === "no tag" || v === "--") {
      return decimals === 0 ? "0" : Number(0).toFixed(decimals);
    }
    if (typeof v === "number") return v.toFixed(decimals);
    if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Number(v).toFixed(decimals);
    return v;
  };
  return (
    <div
      className={`som-calib-val-box ${isEditable ? "som-calib-val-box--editable" : "som-calib-val-box--readonly"} ${isEdited ? "som-edited-field" : ""}`}
      onClick={onClick}
      style={style}
    >
      {formatValue(value)}
    </div>
  );
};

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
          const key = `${data.targetId}__${sig.key}`;
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
          initial[`${data.targetId}__MONITOR`] = tagMap[`${data.targetId}__MONITOR`] || "";
        }
      }
      setLocalTags(initial);
    }
  }, [data, tagMap]);

  if (!data) return null;

  const hasSignals = data.signals && data.signals.length > 0;
  const isGroup = data.subs && data.subs.length > 0;

  const renderTagSelect = (value, onChange, tagList, label) => (
    <div className="tag-field" style={{ marginBottom: 0 }}>
      <label
        className="som-control-item-label"
        style={{
          fontSize: "13px",
          fontWeight: 700,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "8px",
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
          padding: "12px 16px",
          borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.15)",
          background: "#0f172a",
          color: "#f8fafc",
          fontSize: "15px",
          fontWeight: 600,
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
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <div
        className="som-equipment-control-popup som-tag-edit-popup"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isGroup ? "min(960px, 92vw)" : "min(600px, 90vw)",
          maxHeight: "88vh",
          background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: "20px",
          border: "1px solid rgba(59, 130, 246, 0.35)",
          boxShadow: "0 25px 60px -12px rgba(0,0,0,0.7), 0 0 30px rgba(59,130,246,0.15)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "24px 32px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 800,
                color: "#f8fafc",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              ⚙️ PLC Tag Configuration
            </h2>
            <span style={{ fontSize: "13px", color: "#94a3b8", marginTop: "6px", display: "block", fontWeight: 500 }}>
              Hardware Mapping: <strong style={{ color: "#60a5fa" }}>{data.targetId}</strong>
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#cbd5e1",
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "28px 32px", overflowY: "auto", flex: 1 }}>
          {hasSignals ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {data.signals.map((sig) => (
                <div key={sig.key}>
                  {renderTagSelect(
                    localTags[`${data.targetId}__${sig.key}`] || "",
                    (val) => setLocalTags((prev) => ({ ...prev, [`${data.targetId}__${sig.key}`]: val })),
                    availableTags,
                    sig.label
                  )}
                </div>
              ))}
            </div>
          ) : isGroup ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {data.subs.map((sub, index) => (
                <div key={index} style={{ background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "12px", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                  <h3 style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#60a5fa", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>{sub}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                    {renderTagSelect(localTags[`${sub}__STATUS`] || "", (val) => setLocalTags((prev) => ({ ...prev, [`${sub}__STATUS`]: val })), availableTags, "STATUS (READ)")}
                    {renderTagSelect(localTags[`${sub}__START`] || "", (val) => setLocalTags((prev) => ({ ...prev, [`${sub}__START`]: val })), availableTags, "START (WRITE)")}
                    {renderTagSelect(localTags[`${sub}__STOP`] || "", (val) => setLocalTags((prev) => ({ ...prev, [`${sub}__STOP`]: val })), availableTags, "STOP (WRITE)")}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ width: "100%", margin: "0 auto" }}>
              {renderTagSelect(localTags[`${data.targetId}__MONITOR`] || "", (val) => setLocalTags((prev) => ({ ...prev, [`${data.targetId}__MONITOR`]: val })), availableTags, "MONITORING POINT (READ)")}
            </div>
          )}
        </div>

        <div style={{ padding: "20px 32px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: "16px", justifyContent: "flex-end", background: "rgba(15, 23, 42, 0.6)" }}>
          <button
            onClick={onClose}
            style={{
              padding: "12px 24px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.05)",
              color: "#cbd5e1",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            CANCEL
          </button>
          <button
            disabled={saving}
            onClick={() => onSave(localTags, data)}
            style={{
              padding: "12px 32px",
              borderRadius: "8px",
              border: "none",
              background: saving ? "#475569" : "#2563eb",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              opacity: saving ? 0.6 : 1,
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
            }}
          >
            {saving ? "SAVING..." : "CONFIRM MAPPING"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default function EFBCalibrationView({ configMode = false }) {
  const STATION_SLUG = "efb-plant";

  const [tagMap, setTagMap] = useState({});
  const [availableTags, setAvailableTags] = useState([]);
  const [tagEdit, setTagEdit] = useState(null);
  const [savingTags, setSavingTags] = useState(false);
  const [stagedEdits, setStagedEdits] = useState({});
  const [activeKeypad, setActiveKeypad] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [liveValues, setLiveValues] = useState({});

  // Live PLC Data Hook
  const tags = usePlcStore((state) => state.tags);
  const initSocket = usePlcStore((state) => state.initSocket);
  const isConnected = usePlcStore((state) => state.isConnected);

  // Initial Calibration State matching user images exactly:
  // Calibration 1: Amp 1-4
  // Calibration 2: Temp 1-4, Oil Flow, Water Flow, Water Flow
  const [calib1, setCalib1] = useState({
    amp1: { label: "Amp 1", maxSensor: 0.0, maxUnit: "A", calibrationValue: 0, rawValue: 0, outValue: 0.0, outUnit: "A" },
    amp2: { label: "Amp 2", maxSensor: 0.0, maxUnit: "A", calibrationValue: 0, rawValue: 0, outValue: 0.0, outUnit: "A" },
    amp3: { label: "Amp 3", maxSensor: 0.0, maxUnit: "A", calibrationValue: 0, rawValue: 0, outValue: 0.0, outUnit: "A" },
    amp4: { label: "Amp 4", maxSensor: 0.0, maxUnit: "A", calibrationValue: 0, rawValue: 0, outValue: 0.0, outUnit: "A" },
  });

  const [calib2, setCalib2] = useState({
    temp1: { label: "Temp 1", maxSensor: 0.0, maxUnit: "°C", calibrationValue: 0, rawValue: 0, outValue: 0.0, outUnit: "°C" },
    temp2: { label: "Temp 2", maxSensor: 0.0, maxUnit: "°C", calibrationValue: 0, rawValue: 0, outValue: 0.0, outUnit: "°C" },
    temp3: { label: "Temp 3", maxSensor: 0.0, maxUnit: "°C", calibrationValue: 0, rawValue: 0, outValue: 0.0, outUnit: "°C" },
    temp4: { label: "Temp 4", maxSensor: 0.0, maxUnit: "°C", calibrationValue: 0, rawValue: 0, outValue: 0.0, outUnit: "°C" },
    oilFlow: { label: "Oil Flow", maxSensor: 0.0, maxUnit: "M³/h", calibrationValue: 0, rawValue: 0, outValue: 0.0, outUnit: "T/h" },
    waterFlow1: { label: "Water Flow", maxSensor: 0.0, maxUnit: "M³/h", calibrationValue: 0, rawValue: 0, outValue: 0.0, outUnit: "T/h" },
    waterFlow2: { label: "Water Flow", maxSensor: 0.0, maxUnit: "M³/h", calibrationValue: 0, rawValue: 0, outValue: 0.0, outUnit: "T/h" },
  });

  useEffect(() => {
    if (initSocket) initSocket();
  }, [initSocket]);

  // Load saved calibration from localStorage & API
  useEffect(() => {
    const saved1 = localStorage.getItem("efb_calib1");
    const saved2 = localStorage.getItem("efb_calib2");
    if (saved1) {
      try { setCalib1(JSON.parse(saved1)); } catch (e) { console.error(e); }
    }
    if (saved2) {
      try { setCalib2(JSON.parse(saved2)); } catch (e) { console.error(e); }
    }

    const fetchCalib = async () => {
      try {
        const res = await fetch(`/api/${STATION_SLUG}/settings/recipes-and-params`, { headers: authHeaders() });
        if (res.ok) {
          const json = await res.json();
          if (json.data?.parameters?.calib1) setCalib1(json.data.parameters.calib1);
          if (json.data?.parameters?.calib2) setCalib2(json.data.parameters.calib2);
        }
      } catch (err) {
        // Fallback gracefully
      }
    };
    fetchCalib();
  }, [STATION_SLUG]);

  // Fetch Available Tags & Station Mappings for PLC Mapping
  const fetchAvailableTags = useCallback(async () => {
    try {
      const res = await fetch(`/api/${STATION_SLUG}/plc-config/tags`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) setAvailableTags(data.data || []);
    } catch (err) {
      console.error("Failed to fetch PLC tags", err);
    }
  }, [STATION_SLUG]);

  useEffect(() => {
    fetchAvailableTags();
  }, [fetchAvailableTags]);

  useEffect(() => {
    const loadMappings = async () => {
      try {
        const res = await fetch(`/api/${STATION_SLUG}/plc-config/station-mappings/EFB-PLANT`, { headers: authHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const map = {};
          data.data.forEach((m) => {
            map[`${m.equipment}__${m.signal_key}`] = String(m.tag_id);
          });
          setTagMap(map);
        }
      } catch (err) {
        console.error("Failed to fetch PLC mappings", err);
      }
    };
    loadMappings();
  }, [STATION_SLUG]);

  // Fallback Polling Live Values (200ms failover offline, 2s standby)
  const fetchLiveValues = useCallback(async () => {
    try {
      const res = await fetch(`/api/${STATION_SLUG}/plc-config/tags-live`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setLiveValues(data.data || {});
      }
    } catch {}
  }, [STATION_SLUG]);

  useEffect(() => {
    fetchLiveValues();
    const interval = setInterval(fetchLiveValues, isConnected ? 2000 : 200);
    return () => clearInterval(interval);
  }, [fetchLiveValues, isConnected]);

  const availableTagsMap = useMemo(() => {
    const map = {};
    availableTags.forEach((t) => {
      map[String(t.id)] = t;
    });
    return map;
  }, [availableTags]);

  const idToName = useMemo(() => {
    const map = {};
    availableTags.forEach((t) => {
      map[String(t.id)] = t.tag_name;
    });
    return map;
  }, [availableTags]);

  const getLive = useCallback((equipmentKey, signalKey) => {
    const key = `${equipmentKey}__${signalKey}`;
    const tagId = tagMap[key];
    if (!tagId || tagId === "null" || tagId === "undefined" || tagId === "none" || tagId === "") {
      return null;
    }

    const tagName = idToName[String(tagId)] || availableTagsMap[String(tagId)]?.tag_name;

    // 1. WebSocket store
    if (tagName && tags && tags[tagName] !== undefined && tags[tagName] !== null) {
      const raw = typeof tags[tagName] === 'object' && tags[tagName].value !== undefined ? tags[tagName].value : tags[tagName];
      if (raw !== null && raw !== undefined && raw !== "") {
        const num = parseFloat(raw);
        return isNaN(num) ? raw : num;
      }
    }
    if (tags && tags[String(tagId)] !== undefined && tags[String(tagId)] !== null) {
      const raw = typeof tags[String(tagId)] === 'object' && tags[String(tagId)].value !== undefined ? tags[String(tagId)].value : tags[String(tagId)];
      if (raw !== null && raw !== undefined && raw !== "") {
        const num = parseFloat(raw);
        return isNaN(num) ? raw : num;
      }
    }

    // 2. HTTP liveValues by tagName
    if (tagName && liveValues && liveValues[tagName] !== undefined && liveValues[tagName] !== null) {
      const raw = typeof liveValues[tagName] === 'object' && liveValues[tagName].value !== undefined ? liveValues[tagName].value : liveValues[tagName];
      if (raw !== null && raw !== undefined && raw !== "") {
        const num = parseFloat(raw);
        return isNaN(num) ? raw : num;
      }
    }
    if (liveValues && liveValues[String(tagId)] !== undefined && liveValues[String(tagId)] !== null) {
      const raw = typeof liveValues[String(tagId)] === 'object' && liveValues[String(tagId)].value !== undefined ? liveValues[String(tagId)].value : liveValues[String(tagId)];
      if (raw !== null && raw !== undefined && raw !== "") {
        const num = parseFloat(raw);
        return isNaN(num) ? raw : num;
      }
    }

    return 0;
  }, [tagMap, idToName, availableTagsMap, tags, liveValues]);

  const getStagedVal = (key, fallback) => {
    if (stagedEdits[key] !== undefined) return stagedEdits[key];
    if (fallback !== undefined && fallback !== null && fallback !== "" && fallback !== "No Tag" && fallback !== "no tag" && fallback !== "--") {
      return fallback;
    }
    return 0;
  };

  const handleKeypadConfirm = (val) => {
    if (!activeKeypad) return;
    const { key, field } = activeKeypad;
    const editKey = `${key}__${field}`;
    setStagedEdits((prev) => ({ ...prev, [editKey]: val }));
    setActiveKeypad(null);
  };

  const handleSaveMapping = async (newTags) => {
    setSavingTags(true);
    try {
      const mappings = [];
      Object.entries(newTags).forEach(([key, tagId]) => {
        const [equipment, ...sigParts] = key.split("__");
        const signal_key = sigParts.join("__");
        mappings.push({
          station: "EFB-PLANT",
          equipment,
          signal_key,
          tag_id: tagId ? parseInt(tagId, 10) : null,
        });
      });

      const res = await fetch(`/api/${STATION_SLUG}/plc-config/station-mappings`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ mappings }),
      });

      if (res.ok) {
        setTagMap((prev) => ({ ...prev, ...newTags }));
        setTagEdit(null);
      } else {
        alert("Failed to save mapping");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving mapping");
    } finally {
      setSavingTags(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const nextCalib1 = { ...calib1 };
      const nextCalib2 = { ...calib2 };

      Object.keys(nextCalib1).forEach((k) => {
        if (stagedEdits[`${k}__maxSensor`] !== undefined) {
          nextCalib1[k].maxSensor = stagedEdits[`${k}__maxSensor`];
        }
        if (stagedEdits[`${k}__calibrationValue`] !== undefined) {
          nextCalib1[k].calibrationValue = stagedEdits[`${k}__calibrationValue`];
        }
      });

      Object.keys(nextCalib2).forEach((k) => {
        if (stagedEdits[`${k}__maxSensor`] !== undefined) {
          nextCalib2[k].maxSensor = stagedEdits[`${k}__maxSensor`];
        }
        if (stagedEdits[`${k}__calibrationValue`] !== undefined) {
          nextCalib2[k].calibrationValue = stagedEdits[`${k}__calibrationValue`];
        }
      });

      setCalib1(nextCalib1);
      setCalib2(nextCalib2);
      localStorage.setItem("efb_calib1", JSON.stringify(nextCalib1));
      localStorage.setItem("efb_calib2", JSON.stringify(nextCalib2));

      // 1. Post to backend (which executes writeTagDirect to PLC via snap7)
      const res = await fetch(`/api/${STATION_SLUG}/settings/recipes-and-params`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          parameters: {
            calib1: nextCalib1,
            calib2: nextCalib2,
          },
        }),
      });

      // 2. Also trigger sendCommand via usePlcStore for real-time WebSocket broadcast
      const sendPlc = (val, eqKey, sigKey) => {
        if (val === undefined || val === null) return;
        const fullKey = `${eqKey}__${sigKey}`;
        const tagId = tagMap[fullKey] || tagMap[`${eqKey}__SETPOINT`] || tagMap[`${eqKey}__VALUE`];
        if (tagId && usePlcStore.getState().sendCommand) {
          usePlcStore.getState().sendCommand(tagId, Number(val), fullKey, STATION_SLUG);
        }
      };

      Object.entries(nextCalib1).forEach(([k, item]) => {
        sendPlc(item.maxSensor, `calib_${k}`, "MAX");
        sendPlc(item.calibrationValue, `calib_${k}`, "CALIB");
      });

      Object.entries(nextCalib2).forEach(([k, item]) => {
        sendPlc(item.maxSensor, `calib_${k}`, "MAX");
        sendPlc(item.calibrationValue, `calib_${k}`, "CALIB");
      });

      setStagedEdits({});
      fetchLiveValues();
      alert("Calibration settings saved & written to PLC successfully!");
    } catch (e) {
      console.error("Save error:", e);
      alert("Error saving calibration: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getDeveloperStyle = (targetId, sigKey) => {
    if (!configMode) return undefined;
    const isMapped = Boolean(tagMap[`${targetId}__${sigKey}`]);
    return {
      outline: isMapped ? "2px solid #3b82f6" : "2px dashed #ef4444",
      outlineOffset: "1px",
      boxShadow: isMapped ? "0 0 8px rgba(59, 130, 246, 0.5)" : "0 0 8px rgba(239, 68, 68, 0.5)",
      cursor: "pointer",
    };
  };

  const handleBoxClick = (deviceKey, field, label, unit) => {
    if (configMode) {
      const sigKey = field === "maxSensor" ? "MAX" : field === "calibrationValue" ? "CALIB" : field === "rawValue" ? "RAW" : "OUT";
      setTagEdit({
        targetId: `calib_${deviceKey}`,
        signals: [{ key: sigKey, label: `${label} (${sigKey})` }],
      });
      return;
    }

    if (field === "maxSensor" || field === "calibrationValue") {
      setActiveKeypad({
        key: deviceKey,
        field,
        label,
        unit: field === "maxSensor" ? unit : "",
      });
    }
  };

  return (
    <section className="som-efb-calib-page">
      {/* Header bar matching Sterilizer standard */}
      <header className="som-sterilizer-station-header">
        <div className="som-header-left">
          <h2 className="som-sterilizer-station-title">EFB Plant Calibration</h2>
        </div>
        <div className="som-view-toggle-container" style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
          <button
            className="som-view-btn active"
            onClick={handleSave}
            disabled={isSaving}
            style={{ marginLeft: "8px", fontWeight: "bold" }}
          >
            {isSaving ? "SAVING..." : "SAVE CALIBRATION"}
          </button>
        </div>
      </header>

      {/* Main calibration content viewport */}
      <div className="som-efb-calib-container">
        <div className="som-efb-calib-card-main">
          {/* ── CARD 1: ANALOG INPUT CALIBRATION 1 (Amp 1 - 4) ── */}
          <div className="som-efb-logic-section">
            <h4 className="som-efb-logic-section-title">ANALOG INPUT CALIBRATION 1</h4>
            <table className="som-efb-calib-table">
              <thead>
                <tr>
                  <th style={{ width: "110px" }}></th>
                  <th>MAX SENSOR</th>
                  <th>CALIBRATION VALUE</th>
                  <th>RAW VALUE</th>
                  <th>OUT</th>
                  <th style={{ width: "38px" }}></th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(calib1).map(([k, item]) => {
                  const liveMax = getLive(`calib_${k}`, "MAX");
                  const valMax = liveMax !== null && liveMax !== undefined ? liveMax : item.maxSensor;
                  const liveCalib = getLive(`calib_${k}`, "CALIB");
                  const valCalib = liveCalib !== null && liveCalib !== undefined ? liveCalib : item.calibrationValue;
                  const liveRaw = getLive(`calib_${k}`, "RAW");
                  const valRaw = liveRaw !== null && liveRaw !== undefined ? liveRaw : item.rawValue;
                  const liveOut = getLive(`calib_${k}`, "OUT") ?? getLive(`calib_${k}`, "MONITOR");
                  const valOut = liveOut !== null && liveOut !== undefined ? liveOut : item.outValue;

                  return (
                    <tr key={k}>
                      <td className="som-device-name">{item.label}</td>
                      <td style={{ padding: "2px 4px" }}>
                        <ValBox
                          value={getStagedVal(`${k}__maxSensor`, valMax)}
                          decimals={1}
                          isEditable={true}
                          isEdited={stagedEdits[`${k}__maxSensor`] !== undefined}
                          onClick={() => handleBoxClick(k, "maxSensor", `${item.label} MAX SENSOR`, item.maxUnit)}
                          style={getDeveloperStyle(`calib_${k}`, "MAX")}
                        />
                      </td>
                      <td style={{ padding: "2px 4px" }}>
                        <ValBox
                          value={getStagedVal(`${k}__calibrationValue`, valCalib)}
                          decimals={0}
                          isEditable={true}
                          isEdited={stagedEdits[`${k}__calibrationValue`] !== undefined}
                          onClick={() => handleBoxClick(k, "calibrationValue", `${item.label} CALIBRATION VALUE`, "")}
                          style={getDeveloperStyle(`calib_${k}`, "CALIB")}
                        />
                      </td>
                      <td style={{ padding: "2px 4px" }}>
                        <ValBox
                          value={valRaw}
                          decimals={0}
                          isEditable={false}
                          onClick={configMode ? () => handleBoxClick(k, "rawValue", `${item.label} RAW VALUE`, "") : undefined}
                          style={getDeveloperStyle(`calib_${k}`, "RAW")}
                        />
                      </td>
                      <td style={{ padding: "2px 4px" }}>
                        <ValBox
                          value={valOut}
                          decimals={1}
                          isEditable={false}
                          onClick={configMode ? () => handleBoxClick(k, "outValue", `${item.label} OUT`, item.outUnit) : undefined}
                          style={getDeveloperStyle(`calib_${k}`, "OUT")}
                        />
                      </td>
                      <td className="som-unit-cell">{item.outUnit || item.maxUnit}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── CARD 2: ANALOG INPUT CALIBRATION 2 (Temp 1-4, Oil Flow, Water Flow 1 & 2) ── */}
          <div className="som-efb-logic-section">
            <h4 className="som-efb-logic-section-title">ANALOG INPUT CALIBRATION 2</h4>
            <table className="som-efb-calib-table">
              <thead>
                <tr>
                  <th style={{ width: "110px" }}></th>
                  <th>MAX SENSOR</th>
                  <th>CALIBRATION VALUE</th>
                  <th>RAW VALUE</th>
                  <th>OUT</th>
                  <th style={{ width: "38px" }}></th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(calib2).map(([k, item]) => {
                  const liveMax = getLive(`calib_${k}`, "MAX");
                  const valMax = liveMax !== null && liveMax !== undefined ? liveMax : item.maxSensor;
                  const liveCalib = getLive(`calib_${k}`, "CALIB");
                  const valCalib = liveCalib !== null && liveCalib !== undefined ? liveCalib : item.calibrationValue;
                  const liveRaw = getLive(`calib_${k}`, "RAW");
                  const valRaw = liveRaw !== null && liveRaw !== undefined ? liveRaw : item.rawValue;
                  const liveOut = getLive(`calib_${k}`, "OUT") ?? getLive(`calib_${k}`, "MONITOR");
                  const valOut = liveOut !== null && liveOut !== undefined ? liveOut : item.outValue;

                  return (
                    <tr key={k}>
                      <td className="som-device-name">{item.label}</td>
                      <td style={{ padding: "2px 4px" }}>
                        <ValBox
                          value={getStagedVal(`${k}__maxSensor`, valMax)}
                          decimals={1}
                          isEditable={true}
                          isEdited={stagedEdits[`${k}__maxSensor`] !== undefined}
                          onClick={() => handleBoxClick(k, "maxSensor", `${item.label} MAX SENSOR`, item.maxUnit)}
                          style={getDeveloperStyle(`calib_${k}`, "MAX")}
                        />
                      </td>
                      <td style={{ padding: "2px 4px" }}>
                        <ValBox
                          value={getStagedVal(`${k}__calibrationValue`, valCalib)}
                          decimals={0}
                          isEditable={true}
                          isEdited={stagedEdits[`${k}__calibrationValue`] !== undefined}
                          onClick={() => handleBoxClick(k, "calibrationValue", `${item.label} CALIBRATION VALUE`, "")}
                          style={getDeveloperStyle(`calib_${k}`, "CALIB")}
                        />
                      </td>
                      <td style={{ padding: "2px 4px" }}>
                        <ValBox
                          value={valRaw}
                          decimals={0}
                          isEditable={false}
                          onClick={configMode ? () => handleBoxClick(k, "rawValue", `${item.label} RAW VALUE`, "") : undefined}
                          style={getDeveloperStyle(`calib_${k}`, "RAW")}
                        />
                      </td>
                      <td style={{ padding: "2px 4px" }}>
                        <ValBox
                          value={valOut}
                          decimals={1}
                          isEditable={false}
                          onClick={configMode ? () => handleBoxClick(k, "outValue", `${item.label} OUT`, item.outUnit) : undefined}
                          style={getDeveloperStyle(`calib_${k}`, "OUT")}
                        />
                      </td>
                      <td className="som-unit-cell">{item.outUnit || item.maxUnit}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Numeric Keypad Modal Portal */}
      {activeKeypad && (
        <NumericKeypad
          value={(() => {
            const { key, field } = activeKeypad;
            const currentObj = calib1[key] || calib2[key];
            return getStagedVal(`${key}__${field}`, currentObj?.[field] ?? 0);
          })()}
          label={activeKeypad.label}
          unit={activeKeypad.unit || ""}
          onClose={() => setActiveKeypad(null)}
          onConfirm={handleKeypadConfirm}
        />
      )}

      {/* Tag Mapping Modal */}
      {tagEdit && (
        <TagEditorModal
          data={tagEdit}
          onClose={() => setTagEdit(null)}
          onSave={handleSaveMapping}
          tagMap={tagMap}
          availableTags={availableTags}
          saving={savingTags}
        />
      )}
    </section>
  );
}

function NumericKeypad({ value, onConfirm, onClose, label, unit }) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (typeof value === "number") {
      return Number.isInteger(value) ? value.toString() : value.toFixed(1);
    }
    return "0";
  });

  const handleNumber = (n) => {
    setDisplayValue((prev) => (prev === "0" ? n.toString() : prev + n.toString()));
  };
  const handleDecimal = () => {
    if (!displayValue.includes(".")) setDisplayValue(displayValue + ".");
  };
  const handleBack = () => setDisplayValue((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
  const handleEnter = useCallback(() => onConfirm(parseFloat(displayValue) || 0), [displayValue, onConfirm]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleNumber(parseInt(e.key));
      } else if (e.key === ".") {
        e.preventDefault();
        handleDecimal();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBack();
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        handleEnter();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [displayValue, onConfirm, onClose, handleEnter]);

  const btnStyle = {
    padding: "14px",
    fontSize: "18px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#1e293b",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s ease",
    userSelect: "none",
  };

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
            style={{
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#475569",
              transition: "all 0.2s ease",
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#fee2e2";
              e.currentTarget.style.color = "#dc2626";
              e.currentTarget.style.borderColor = "#fca5a5";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f1f5f9";
              e.currentTarget.style.color = "#475569";
              e.currentTarget.style.borderColor = "#cbd5e1";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="som-numeric-keypad-display">
          <span className="som-numeric-keypad-value">{displayValue}</span>
          {unit && <span className="som-numeric-keypad-unit">{unit}</span>}
        </div>
        <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((n) => (
            <button type="button" key={n} onClick={() => handleNumber(n)} style={btnStyle}>
              {n}
            </button>
          ))}
          <button type="button" onClick={handleDecimal} style={btnStyle}>
            .
          </button>
          <button type="button" onClick={() => handleNumber(0)} style={btnStyle}>
            0
          </button>
          <button
            type="button"
            onClick={handleBack}
            style={{ ...btnStyle, background: "#f1f5f9" }}
            title="Backspace"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
              <line x1="18" y1="9" x2="12" y2="15" />
              <line x1="12" y1="9" x2="18" y2="15" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setDisplayValue("0")}
            style={{
              gridColumn: "span 1",
              padding: "12px",
              background: "#fee2e2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              borderRadius: "10px",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            CLEAR
          </button>
          <button
            type="button"
            onClick={handleEnter}
            style={{
              gridColumn: "span 2",
              padding: "12px",
              background: "#F59E0B",
              border: "none",
              color: "white",
              borderRadius: "10px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "15px",
              transition: "all 0.15s ease",
              boxShadow: "0 4px 6px -1px rgba(245, 158, 11, 0.3)",
            }}
          >
            ENTER
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
