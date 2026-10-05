import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./AiGradingTab.css";

const CATEGORY_META = [
  { id: "all", label: "ALL", color: "#0f172a" },
  { id: "ripe", label: "RIPE", color: "#10b981" },
  { id: "unripe", label: "UNRIPE", color: "#f59e0b" },
  { id: "overripe", label: "OVERRIPE", color: "#f97316" },
];

const getDefaultApiBase = () => {
  return "";
};

const initialCounts = { ripe: 0, unripe: 0, overripe: 0 };
const initialMetrics = { average_confidence: 0, detections_per_minute: 0 };

const CameraOffIcon = () => (
  <svg viewBox="0 0 64 64" width="52" height="52" aria-hidden="true">
    <rect x="10" y="19" width="31" height="26" rx="5" />
    <path d="m41 27 13-7v24l-13-7" />
    <path d="M9 9 55 55" />
  </svg>
);

export default function AiGradingTab({ configMode }) {
  const [selectedTimeFilter, setSelectedTimeFilter] = useState("DAY");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLine, setSelectedLine] = useState(1);
  const [availableLines, setAvailableLines] = useState([1, 2]);
  const [categoryCounts, setCategoryCounts] = useState(initialCounts);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [currentDecision, setCurrentDecision] = useState(null);
  const [runtimeStatus, setRuntimeStatus] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [message, setMessage] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState(
    () => localStorage.getItem("som_ffb_ai_api_base") ?? getDefaultApiBase()
  );
  const [rtspUrl, setRtspUrl] = useState("");
  const [cameraName, setCameraName] = useState("FFB Conveyor Inlet Line 1");
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [serverConfig, setServerConfig] = useState(null);

  const apiUrl = useCallback(
    (path) => `${apiBaseUrl.replace(/\/$/, "")}/api/sterilizer-ai${path}`,
    [apiBaseUrl]
  );

  const loadRuntimeData = useCallback(async () => {
    try {
      const [healthResponse, statsResponse, currentResponse] = await Promise.all([
        fetch(apiUrl("/health")),
        fetch(apiUrl(`/stats?line_no=${selectedLine}&period=${selectedTimeFilter}`)),
        fetch(apiUrl(`/current?line_no=${selectedLine}`)),
      ]);
      if (!healthResponse.ok || !statsResponse.ok || !currentResponse.ok) {
        throw new Error("AI grading service is unavailable");
      }

      const [health, stats, current] = await Promise.all([
        healthResponse.json(),
        statsResponse.json(),
        currentResponse.json(),
      ]);
      setRuntimeStatus(health);
      setCategoryCounts({ ...initialCounts, ...(stats.counts || {}) });
      setMetrics({ ...initialMetrics, ...(stats.metrics || {}) });
      setCurrentDecision(current.data || null);
    } catch {
      setRuntimeStatus(null);
      setCategoryCounts(initialCounts);
      setMetrics(initialMetrics);
      setCurrentDecision(null);
    }
  }, [apiUrl, selectedLine, selectedTimeFilter]);

  useEffect(() => {
    loadRuntimeData();
    const interval = window.setInterval(loadRuntimeData, 2000);
    return () => window.clearInterval(interval);
  }, [loadRuntimeData]);

  const openConfiguration = async () => {
    setRtspUrl("");
    try {
      const response = await fetch(apiUrl("/config"));
      if (!response.ok) throw new Error("Unable to read AI configuration");
      const result = await response.json();
      const config = result.data;
      const lines = config.lines.map((line) => Number(line.line_no));
      setServerConfig(config);
      setAvailableLines(lines);
      const line = config.lines.find((item) => Number(item.line_no) === selectedLine) || config.lines[0];
      setSelectedLine(Number(line.line_no));
      setCameraName(line.camera.camera_name);
      setCameraEnabled(Boolean(line.enabled));
    } catch {
      setServerConfig(null);
      setMessage("AI service port 4105 is not reachable. Start the Python service first.");
      window.setTimeout(() => setMessage(""), 5000);
    }
    setShowConfigModal(true);
  };

  const selectConfigLine = (lineNo) => {
    const numericLine = Number(lineNo);
    setSelectedLine(numericLine);
    const line = serverConfig?.lines.find((item) => Number(item.line_no) === numericLine);
    if (line) {
      setCameraName(line.camera.camera_name);
      setCameraEnabled(Boolean(line.enabled));
      setRtspUrl("");
    }
  };

  const handleSaveConfig = async () => {
    localStorage.setItem("som_ffb_ai_api_base", apiBaseUrl);
    if (!serverConfig) {
      setShowConfigModal(false);
      return;
    }

    const nextConfig = structuredClone(serverConfig);
    const line = nextConfig.lines.find((item) => Number(item.line_no) === selectedLine);
    line.enabled = cameraEnabled;
    line.camera.camera_name = cameraName.trim();
    if (rtspUrl.trim()) line.camera.rtsp_url = rtspUrl.trim();

    setSavingConfig(true);
    try {
      const response = await fetch(apiUrl("/config"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextConfig),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Configuration failed");
      setServerConfig(result.data);
      setShowConfigModal(false);
      setMessage(`Line ${selectedLine} camera configuration saved.`);
      window.setTimeout(() => setMessage(""), 4000);
      loadRuntimeData();
    } catch (error) {
      setMessage(error.message);
      window.setTimeout(() => setMessage(""), 5000);
    } finally {
      setSavingConfig(false);
    }
  };

  const cameraStatus = runtimeStatus?.cameras?.[selectedLine] || runtimeStatus?.cameras?.[String(selectedLine)];
  const liveCamera = Boolean(cameraStatus?.connected);
  const modelReady = Boolean(runtimeStatus?.model_ready);
  const databaseReady = Boolean(runtimeStatus?.database_ready);

  const categoryStats = useMemo(() => {
    const total = Object.values(categoryCounts).reduce((sum, count) => sum + Number(count || 0), 0);
    return CATEGORY_META.map((category) => ({
      ...category,
      count: category.id === "all" ? total : Number(categoryCounts[category.id] || 0),
    }));
  }, [categoryCounts]);
  const totalCount = categoryStats[0].count;
  const decisionReady = currentDecision?.decision_status === "READY";

  return (
    <div className="som-ai-grading-container">
      {message && <div className="som-grading-alert-popup">{message}</div>}

      <section className="som-ai-grading-card som-ai-live-card">
        <header className="som-ai-card-header">
          <h3>LIVE FFB STREAMING</h3>
          <div className="som-ai-camera-meta">
            <span>LINE {selectedLine} | CAM-FFB-{String(selectedLine).padStart(2, "0")} | {liveCamera ? "ACTIVE" : "OFFLINE"}</span>
            {configMode && (
              <button type="button" className="som-ai-settings-button" onClick={openConfiguration} aria-label="Setup FFB CCTV and AI" title="Setup FFB CCTV & AI">
                ⚙
              </button>
            )}
          </div>
        </header>

        <div className="som-ai-video-container">
          {liveCamera ? (
            <img src={apiUrl(`/stream?line_no=${selectedLine}`)} alt={`Live AI FFB Camera Line ${selectedLine}`} />
          ) : (
            <div className="som-ai-video-placeholder">
              <CameraOffIcon />
              <strong>{runtimeStatus ? "CCTV NOT CONNECTED" : "FFB CLASSIFICATION SERVICE OFFLINE"}</strong>
              <span>
                {runtimeStatus
                  ? cameraStatus?.error || "Configure a valid RTSP source to start the live stream."
                  : "Start the Sterilizer FFB classification service and verify its API address."}
              </span>
            </div>
          )}

          <div className="som-ai-stream-overlay">
            <span className={`som-ai-live-badge ${liveCamera ? "" : "offline"}`}>
              <i /> {liveCamera ? "LIVE CAM" : "CAMERA OFFLINE"}
            </span>
            <span className="som-ai-stream-stats">
              {liveCamera ? "REALTIME CLASSIFICATION INPUT" : cameraStatus?.error || runtimeStatus?.model_error || "WAITING FOR CCTV CONFIGURATION"}
            </span>
          </div>

          {showConfigModal && (
            <div className="som-ai-config-overlay" onClick={() => setShowConfigModal(false)}>
              <div className="som-ai-config-modal" onClick={(event) => event.stopPropagation()}>
                <h4>FFB CCTV & AI CONFIGURATION</h4>
                <div className="som-ai-config-fields">
                  <label>
                    AI Service Base URL
                    <input value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} placeholder="http://localhost:4105" />
                  </label>
                  <label>
                    Sterilizer Line
                    <select value={selectedLine} onChange={(event) => selectConfigLine(event.target.value)}>
                      {availableLines.map((lineNo) => <option key={lineNo} value={lineNo}>Line {lineNo}</option>)}
                    </select>
                  </label>
                  <label>
                    Camera Name
                    <input value={cameraName} onChange={(event) => setCameraName(event.target.value)} placeholder="FFB Conveyor Inlet Line 1" />
                  </label>
                  <label>
                    New RTSP URL
                    <input type="password" value={rtspUrl} onChange={(event) => setRtspUrl(event.target.value)} placeholder="Leave empty to keep the saved credential" autoComplete="new-password" />
                  </label>
                  <label className="som-ai-config-checkbox">
                    <input type="checkbox" checked={cameraEnabled} onChange={(event) => setCameraEnabled(event.target.checked)} />
                    Enable camera and AI grading for this line
                  </label>
                  <p className="som-ai-config-note">RTSP credentials are stored only in the backend runtime configuration and are never returned to this UI.</p>
                </div>
                <footer>
                  <button type="button" onClick={() => setShowConfigModal(false)}>Cancel</button>
                  <button type="button" className="primary" disabled={savingConfig || !serverConfig} onClick={handleSaveConfig}>
                    {savingConfig ? "Saving..." : "Save & Reconnect"}
                  </button>
                </footer>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="som-ai-grading-card som-ai-analysis-card premium-theme">
        <header className="som-ai-card-header">
          <h3>CATEGORY ANALYSIS</h3>
          <div className="som-ai-header-controls">
            <select className="som-ai-line-select" value={selectedLine} onChange={(event) => setSelectedLine(Number(event.target.value))}>
              {availableLines.map((lineNo) => <option key={lineNo} value={lineNo}>LINE {lineNo}</option>)}
            </select>
            <div className="som-ai-time-filters">
              {["DAY", "WEEK", "MONTH"].map((filter) => (
                <button type="button" key={filter} className={selectedTimeFilter === filter ? "active" : ""} onClick={() => setSelectedTimeFilter(filter)}>
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="som-ai-analysis-body">
          {/* TOP METRICS */}
          <div className="som-ai-metrics-grid">
             <div className="som-ai-metric-box glow-green">
                <div className="metric-content">
                  <span className="label">QUALITY SCORE</span>
                  <span className="value">
                    {totalCount > 0 ? Math.round(((categoryCounts.ripe || 0) / totalCount) * 100) : 0}%
                  </span>
                </div>
             </div>
             <div className="som-ai-metric-box glow-blue">
                <div className="metric-content">
                  <span className="label">THROUGHPUT</span>
                  <span className="value">{Number(metrics.detections_per_minute || 0).toFixed(0)} <small>FFB/m</small></span>
                </div>
             </div>
             <div className="som-ai-metric-box glow-purple">
                <div className="metric-content">
                  <span className="label">AI CONFIDENCE</span>
                  <span className="value">{Number(metrics.average_confidence || 0).toFixed(1)}%</span>
                </div>
             </div>
          </div>

          {/* VISUAL CHART & STATUS */}
          <div className="som-ai-chart-section">
            <div className="som-ai-chart-wrapper">
               <div className="donut-chart" style={{
                 background: `conic-gradient(
                   #10b981 0% ${totalCount ? Math.round((categoryCounts.ripe || 0)/totalCount*100) : 0}%,
                   #f59e0b ${totalCount ? Math.round((categoryCounts.ripe || 0)/totalCount*100) : 0}% ${totalCount ? Math.round(((categoryCounts.ripe || 0) + (categoryCounts.unripe || 0))/totalCount*100) : 0}%,
                   #f97316 ${totalCount ? Math.round(((categoryCounts.ripe || 0) + (categoryCounts.unripe || 0))/totalCount*100) : 0}% 100%
                 )`
               }}>
                 <div className="donut-hole">
                    <strong>{totalCount > 0 ? Math.round(((categoryCounts.ripe || 0) / totalCount) * 100) : 0}%</strong>
                    <span>RIPE</span>
                 </div>
               </div>
            </div>
            <div className="som-ai-status-list">
               <div className="som-ai-status-item"><span className={`som-ai-status-dot ${liveCamera ? "pulse-green" : "pulse-orange"}`}></span> Camera: <strong>{liveCamera ? "ONLINE" : "OFFLINE"}</strong></div>
               <div className="som-ai-status-item"><span className={`som-ai-status-dot ${modelReady ? "pulse-green" : "pulse-orange"}`}></span> Model: <strong>{modelReady ? "READY" : "WAITING"}</strong></div>
               <div className="som-ai-status-item"><span className={`som-ai-status-dot ${databaseReady ? "pulse-blue" : "pulse-orange"}`}></span> Database: <strong>{databaseReady ? "SYNCED" : "OFFLINE"}</strong></div>
            </div>
          </div>

          {/* CATEGORY LIST */}
          <div className="som-ai-category-list-wrapper">
            <h4 className="list-title">CLASSIFICATION RESULT</h4>
            {categoryStats.map((category) => {
              const percentage = category.id === "all"
                ? (totalCount > 0 ? 100 : 0)
                : (totalCount > 0 ? Math.round((category.count / totalCount) * 100) : 0);
              const isSelected = selectedCategory === category.id;

              return (
                <button
                  type="button"
                  key={category.id}
                  className={`som-ai-category-row premium-row ${isSelected ? "active" : ""}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <span className="som-ai-category-heading">
                    <span className="som-ai-category-name">
                      <i style={{ backgroundColor: category.color, boxShadow: `0 0 10px ${category.color}` }} />
                      {category.label}
                    </span>
                    <span className="som-ai-category-values">
                      <strong className={category.id === "all" ? "total" : ""}>{category.count.toLocaleString("en-US")}</strong>
                      <small className="percentage-badge" style={{ color: category.color, backgroundColor: `${category.color}15` }}>{percentage}%</small>
                    </span>
                  </span>
                  <span className="som-ai-progress-track">
                    <i style={{ width: `${percentage}%`, backgroundColor: category.color, boxShadow: `0 0 8px ${category.color}` }} />
                  </span>
                </button>
              );
            })}
          </div>

          <div className={`som-ai-decision-summary ${decisionReady ? "ready" : "waiting"} premium-decision`}>
            <div>
              <span className="label">LINE {selectedLine} MAJORITY</span>
              <strong>{decisionReady ? currentDecision.majority_category : "WAITING FOR VALID DATA"}</strong>
              <small>{decisionReady ? `${Number(currentDecision.majority_percentage).toFixed(1)}% in current decision window` : "No recipe will be released until the minimum detection requirement is met."}</small>
            </div>
            <div className="som-ai-recipe-result">
              <span className="label">RECOMMENDED RECIPE</span>
              <strong>{decisionReady ? currentDecision.recommended_recipe_name : "—"}</strong>
              <small>{decisionReady ? currentDecision.recommended_recipe_code : "Decision status: INSUFFICIENT DATA"}</small>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
