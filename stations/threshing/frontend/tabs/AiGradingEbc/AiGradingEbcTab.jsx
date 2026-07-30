import { useState, useEffect } from "react";
import "./AiGradingEbcTab.css";
import cctvFeedEbcUrl from "../../assets/ai_grading_ebc_cctv.png";

export default function AiGradingEbcTab({ configMode, availableTags = [], tagMap = {} }) {
  const [isAutoPilot, setIsAutoPilot] = useState(true);
  const [totalDetected, setTotalDetected] = useState(2596);
  const [distribution, setDistribution] = useState({
    clean: 98.2,
    attached: 1.3,
    unthreshed: 0.5,
  });

  const [logs, setLogs] = useState([
    { time: "16:03", action: "Detected Attached Loose Fruits - 93% Confidence" },
    { time: "15:45", action: "Detected Completely Unthreshed Bunch - 89% Confidence" },
    { time: "15:20", action: "Auto-pilot adjusted thresher frequency to 49.5Hz" },
    { time: "15:10", action: "Detected Attached Loose Fruits - 91% Confidence" },
    { time: "14:55", action: "Threshing efficiency stable within design parameters" },
  ]);
  const [message, setMessage] = useState("");

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [rtspUrl, setRtspUrl] = useState(() => localStorage.getItem("som_ebc_rtsp_url") || "");
  const [streamUrl, setStreamUrl] = useState(() => localStorage.getItem("som_ebc_stream_url") || "local_mock");
  const [ebcTag, setEbcTag] = useState(() => localStorage.getItem("som_ebc_plc_tag") || "");

  const fetchStats = async () => {
    // Stat polling logic (similar to MPD, utilizing backend mock/stats if available, or fallbacks)
    try {
      const res = await fetch("/api/grading/stats?period=DAY", { credentials: "include" });
      if (res.ok) {
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          // Simply scaling total detected count for demo purposes
          setTotalDetected(prev => prev + 1);
        }
      }
    } catch { }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const getRecommendation = () => {
    const { attached, unthreshed } = distribution;
    if (attached > 2.0 || unthreshed > 1.0) {
      return {
        title: "ACTION REQUIRED: Speed Up Thresher Drum & Feed Rate",
        desc: "Attached fruit losses are elevated. Autopilot recommends increasing Thresher speed (Hz) by 2.0Hz or adjusting Autofeeder Gate opening limit.",
        severity: "danger"
      };
    } else {
      return {
        title: "SYSTEM STABLE: Normal Operation",
        desc: "Empty bunch sorting is within target bounds (attached fruit loss <2.0%). Drum speed maintaining standard 48.5Hz setpoint.",
        severity: "success"
      };
    }
  };

  const recommendation = getRecommendation();

  const handleApplyRecipe = () => {
    const now = new Date();
    const timeStr = now.toTimeString().substring(0, 5);

    const newLog = {
      time: timeStr,
      action: `Adjusted thresher speed setpoint.`,
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 4)]);

    setMessage(`Thresher motor configuration successfully written to PLC!`);
    setTimeout(() => setMessage(""), 5000);
  };

  const handleSaveConfig = () => {
    localStorage.setItem("som_ebc_rtsp_url", rtspUrl);
    localStorage.setItem("som_ebc_stream_url", streamUrl);
    localStorage.setItem("som_ebc_plc_tag", ebcTag);
    setShowConfigModal(false);

    setMessage("EBC AI Camera & PLC mappings saved successfully!");
    setTimeout(() => setMessage(""), 4000);
  };

  return (
    <div className="som-ai-grading-container">
      {message && (
        <div className="som-grading-alert-popup">
          <span className="som-grading-alert-icon">⚡</span>
          <span>{message}</span>
        </div>
      )}

      {/* LEFT COLUMN: LIVE CCTV FEED WITH DEPLOYED VIDEO SOURCE */}
      <div className="som-grading-left-col">
        <div className="som-minimal-card som-grading-camera-card">
          <div className="som-minimal-header" style={{ position: "relative" }}>
            🎥 LIVE AI VIDEO ANALYTICS - EMPTY FRUIT BUNCH CONVEYOR (EBC)

            {configMode && (
              <button
                className="som-dev-config-btn"
                onClick={() => setShowConfigModal(true)}
              >
                ⚙️ Setup CCTV & AI
              </button>
            )}
          </div>
          <div className="som-minimal-body som-grading-camera-body">
            <div className="som-video-wrapper">
              {streamUrl ? (
                <img
                  src={cctvFeedEbcUrl}
                  alt="EBC AI Conveyor Feed"
                  className="som-grading-video-element"
                />
              ) : (
                <div className="som-feed-disconnected">
                  <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="som-disconnected-icon">
                    <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.58 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
                  </svg>
                  <p className="som-disconnected-title">CCTV STREAM DISCONNECTED</p>
                  <p className="som-disconnected-subtitle">
                    {configMode ? "Enter Stream URL in settings to connect." : "No camera signal."}
                  </p>
                </div>
              )}

              {streamUrl && (
                <div className="som-video-live-overlay">
                  <span className="som-live-pulse-dot"></span>
                  <span>LIVE FEED (EBC ANALYTICS)</span>
                </div>
              )}

              {configMode && (
                <div className="som-dev-overlay-badge">
                  🛠_DEV CONFIG MODE
                </div>
              )}

              {showConfigModal && (
                <div className="som-dev-modal-overlay" onClick={() => setShowConfigModal(false)}>
                  <div className="som-dev-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="som-dev-modal-header">
                      ⚙️ CCTV & PLC CONFIGURATION (EBC)
                    </div>
                    <div className="som-dev-modal-body">
                      <div className="som-dev-form-group">
                        <label>RTSP Video Source URL</label>
                        <input
                          type="text"
                          value={rtspUrl}
                          onChange={(e) => setRtspUrl(e.target.value)}
                          placeholder="rtsp://admin:admin123@192.168.10.61:554/stream1"
                        />
                      </div>
                      <div className="som-dev-form-group">
                        <label>WebSocket Stream URL (Frontend)</label>
                        <input
                          type="text"
                          value={streamUrl}
                          onChange={(e) => setStreamUrl(e.target.value)}
                          placeholder="ws://localhost:9999/live/ebc"
                        />
                      </div>
                      <div className="som-dev-form-group">
                        <label>PLC Tag - Threshing Efficiency</label>
                        <select value={ebcTag} onChange={(e) => setEbcTag(e.target.value)}>
                          <option value="">— Select Tag —</option>
                          {availableTags && availableTags.map((tag) => (
                            <option key={tag.id} value={tag.tag_name}>
                              {tag.tag_name} ({tag.tag_address})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="som-dev-modal-footer">
                      <button className="som-dev-btn-cancel" onClick={() => setShowConfigModal(false)}>
                        Cancel
                      </button>
                      <button className="som-dev-btn-save" onClick={handleSaveConfig}>
                        Save Settings
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: BATCH STATS, CHART, RECOMMENDATIONS */}
      <div className="som-grading-right-col">
        {/* Card 1: Batch Statistics & Ripeness Breakdown */}
        <div className="som-minimal-card som-grading-stats-card">
          <div className="som-minimal-header">📊 BUNCH CLASSIFICATION (EBC)</div>
          <div className="som-minimal-body">
            <div className="som-grading-kpi-grid">
              <div className="som-kpi-item">
                <span className="som-kpi-label">TOTAL EMPTY BUNCHES</span>
                <span className="som-kpi-val">{totalDetected}</span>
              </div>
              <div className="som-kpi-item">
                <span className="som-kpi-label">THRESHING EFFICIENCY</span>
                <span className={`som-kpi-val ${distribution.clean >= 97 ? "som-text-green" : "som-text-gold"}`}>
                  96.5%
                </span>
              </div>
            </div>

            <div className="som-minimal-divider"></div>

            <span className="som-minimal-section-title">EMPTY BUNCH QUALITY ANALYSIS</span>

            <div className="som-distribution-list">
              <div className="som-dist-row">
                <span className="som-dist-label">Clean Empty Bunches</span>
                <div className="som-progress-bar-wrapper">
                  <div className="som-progress-bar clean" style={{ width: `${distribution.clean}%` }}></div>
                </div>
                <span className="som-dist-pct clean">{distribution.clean}%</span>
              </div>

              <div className="som-dist-row">
                <span className="som-dist-label">Attached Loose Fruits</span>
                <div className="som-progress-bar-wrapper">
                  <div className="som-progress-bar attached" style={{ width: `${distribution.attached}%` }}></div>
                </div>
                <span className="som-dist-pct attached">{distribution.attached}%</span>
              </div>

              <div className="som-dist-row">
                <span className="som-dist-label">Unthreshed Fruit Bunch</span>
                <div className="som-progress-bar-wrapper">
                  <div className="som-progress-bar unthreshed" style={{ width: `${distribution.unthreshed}%` }}></div>
                </div>
                <span className="som-dist-pct unthreshed">{distribution.unthreshed}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: AI Recipe Recommendation & Actions */}
        <div className="som-minimal-card som-grading-actions-card">
          <div className="som-minimal-header">💡 THRESHING CORRECTIVE DECISION</div>
          <div className="som-minimal-body">
            <div className="som-autopilot-control">
              <div className="som-autopilot-info">
                <span className="som-autopilot-label">AUTO-PILOT ADAPTATION</span>
                <p className="som-autopilot-desc">Automatically adjusts Thresher motor Hz and feeder gate openings when EFB loss rises.</p>
              </div>
              <label className="som-switch-container">
                <input
                  type="checkbox"
                  checked={isAutoPilot}
                  onChange={(e) => setIsAutoPilot(e.target.checked)}
                />
                <span className="som-switch-slider"></span>
              </label>
            </div>

            <div className={`som-recipe-sug-panel som-severity-${recommendation.severity}`}>
              <span className="som-sug-badge">DECISION RECOMMENDATION</span>
              <div className="som-sug-title">{recommendation.title}</div>
              <div className="som-sug-desc">{recommendation.desc}</div>
            </div>

            <button
              onClick={handleApplyRecipe}
              disabled={isAutoPilot}
              className={`som-apply-recipe-btn ${isAutoPilot ? "disabled" : ""}`}
            >
              {isAutoPilot ? "Autopilot Active" : "Apply Motor Adjustments"}
            </button>
          </div>
        </div>

        {/* Card 3: Recent Activity Logs */}
        <div className="som-minimal-card som-grading-logs-card">
          <div className="som-minimal-header">📝 RECENT DETECTIONS</div>
          <div className="som-minimal-body som-logs-body">
            <div className="som-logs-list">
              {logs.map((log, idx) => (
                <div key={idx} className="som-log-item">
                  <span className="som-log-time">{log.time}</span>
                  <span className="som-log-action">{log.action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
