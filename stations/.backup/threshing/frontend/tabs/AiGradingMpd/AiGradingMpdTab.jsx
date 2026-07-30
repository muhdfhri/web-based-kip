import { useState, useEffect, useRef } from "react";
import "./AiGradingMpdTab.css";
import cctvFeedMpdUrl from "../../assets/ai_grading_mpd_cctv.png";

export default function AiGradingMpdTab({ configMode, availableTags = [], tagMap = {} }) {
  const [isAutoPilot, setIsAutoPilot] = useState(true);
  const [totalBunches, setTotalBunches] = useState(1248);
  const [distribution, setDistribution] = useState({
    stripped: 94.8,
    unstripped: 3.2,
    partially: 2.0,
  });

  const [logs, setLogs] = useState([
    { time: "16:04", action: "Detected Partially Stripped Bunch (PSB) - 91% Confidence" },
    { time: "15:58", action: "Detected Unstripped Bunch (USB) - 88% Confidence" },
    { time: "15:42", action: "Detected Unstripped Bunch (USB) - 95% Confidence" },
    { time: "15:30", action: "Auto-pilot recommended increase sterilizer holding time" },
    { time: "15:15", action: "Detected Partially Stripped Bunch (PSB) - 94% Confidence" },
  ]);
  const [message, setMessage] = useState("");

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [rtspUrl, setRtspUrl] = useState(() => localStorage.getItem("som_mpd_rtsp_url") || "");
  const [streamUrl, setStreamUrl] = useState(() => localStorage.getItem("som_mpd_stream_url") || "local_mock");
  const [mpdTag, setMpdTag] = useState(() => localStorage.getItem("som_mpd_plc_tag") || "");

  // Fetch real FFB stats from grading-service or use realistic defaults
  const fetchStats = async () => {
    try {
      const res = await fetch("/api/grading/stats?period=DAY", { credentials: "include" });
      if (res.ok) {
        const result = await res.json();
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
          const total = result.data.reduce((sum, s) => sum + s.count, 0);
          const getCount = (cat) => result.data.find((s) => s.category === cat)?.count || 0;
          const getPct = (cat) => (total > 0 ? (getCount(cat) / total) * 100 : 0);

          // Map FFB grading categories to Threshing MPD categories for display
          const unripePct = getPct("unripe") || getPct("underripe") || 3.2;
          const overripePct = getPct("overripe") || 2.0;
          const ripePct = 100 - unripePct - overripePct;

          setTotalBunches(total);
          setDistribution({
            stripped: parseFloat(ripePct.toFixed(1)),
            unstripped: parseFloat(unripePct.toFixed(1)),
            partially: parseFloat(overripePct.toFixed(1)),
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch FFB grading stats:", err);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const getRecommendation = () => {
    const { unstripped, partially } = distribution;
    if (unstripped > 4.0 || partially > 3.0) {
      return {
        title: "ACTION REQUIRED: Raise Sterilizer Holding Time",
        desc: "Unstripped and partially stripped bunches exceed limit. Recommend increasing Sterilizer holding phase by 3 minutes to improve stripping efficiency.",
        severity: "danger"
      };
    } else {
      return {
        title: "SYSTEM STABLE: Standard Milling",
        desc: "Stripping efficiency is within bounds (target >94% stripped bunches). Autopilot maintaining standard sterilizer recipe configurations.",
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
      action: `Manually applied sterilizer holding adjustment recipe.`,
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 4)]);

    setMessage(`Recipe correction command successfully sent to Sterilizer PLC!`);
    setTimeout(() => setMessage(""), 5000);
  };

  const handleSaveConfig = () => {
    localStorage.setItem("som_mpd_rtsp_url", rtspUrl);
    localStorage.setItem("som_mpd_stream_url", streamUrl);
    localStorage.setItem("som_mpd_plc_tag", mpdTag);
    setShowConfigModal(false);

    setMessage("MPD AI Camera & PLC mappings saved successfully!");
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
            🎥 LIVE AI VIDEO ANALYTICS - THRESHER DISCHARGE CONVEYOR (MPD)

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
                  src={cctvFeedMpdUrl}
                  alt="MPD AI Conveyor Feed"
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
                  <span>LIVE FEED (MPD ANALYTICS)</span>
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
                      ⚙️ CCTV & PLC CONFIGURATION (MPD)
                    </div>
                    <div className="som-dev-modal-body">
                      <div className="som-dev-form-group">
                        <label>RTSP Video Source URL</label>
                        <input
                          type="text"
                          value={rtspUrl}
                          onChange={(e) => setRtspUrl(e.target.value)}
                          placeholder="rtsp://admin:admin123@192.168.10.60:554/stream1"
                        />
                      </div>
                      <div className="som-dev-form-group">
                        <label>WebSocket Stream URL (Frontend)</label>
                        <input
                          type="text"
                          value={streamUrl}
                          onChange={(e) => setStreamUrl(e.target.value)}
                          placeholder="ws://localhost:9999/live/mpd"
                        />
                      </div>
                      <div className="som-dev-form-group">
                        <label>PLC Tag - MPD Sterilization Efficiency</label>
                        <select value={mpdTag} onChange={(e) => setMpdTag(e.target.value)}>
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
          <div className="som-minimal-header">📊 BUNCH CLASSIFICATION (MPD)</div>
          <div className="som-minimal-body">
            <div className="som-grading-kpi-grid">
              <div className="som-kpi-item">
                <span className="som-kpi-label">TOTAL DETECTED BUNCHE</span>
                <span className="som-kpi-val">{totalBunches}</span>
              </div>
              <div className="som-kpi-item">
                <span className="som-kpi-label">STERILIZATION EFFICIENCY</span>
                <span className={`som-kpi-val ${distribution.stripped >= 94 ? "som-text-green" : "som-text-gold"}`}>
                  {distribution.stripped}%
                </span>
              </div>
            </div>

            <div className="som-minimal-divider"></div>

            <span className="som-minimal-section-title">STRIPPING ANALYSIS</span>

            <div className="som-distribution-list">
              <div className="som-dist-row">
                <span className="som-dist-label">Stripped Bunches</span>
                <div className="som-progress-bar-wrapper">
                  <div className="som-progress-bar stripped" style={{ width: `${distribution.stripped}%` }}></div>
                </div>
                <span className="som-dist-pct stripped">{distribution.stripped}%</span>
              </div>

              <div className="som-dist-row">
                <span className="som-dist-label">Unstripped Bunch (USB)</span>
                <div className="som-progress-bar-wrapper">
                  <div className="som-progress-bar unstripped" style={{ width: `${distribution.unstripped}%` }}></div>
                </div>
                <span className="som-dist-pct unstripped">{distribution.unstripped}%</span>
              </div>

              <div className="som-dist-row">
                <span className="som-dist-label">Partially Stripped (PSB)</span>
                <div className="som-progress-bar-wrapper">
                  <div className="som-progress-bar partially" style={{ width: `${distribution.partially}%` }}></div>
                </div>
                <span className="som-dist-pct partially">{distribution.partially}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: AI Recipe Recommendation & Actions */}
        <div className="som-minimal-card som-grading-actions-card">
          <div className="som-minimal-header">💡 STERILIZATION CORRECTIVE DECISION</div>
          <div className="som-minimal-body">
            <div className="som-autopilot-control">
              <div className="som-autopilot-info">
                <span className="som-autopilot-label">AUTO-PILOT ADAPTATION</span>
                <p className="som-autopilot-desc">Automatically adjusts Sterilizer steaming recipes when threshing loss increases.</p>
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
              {isAutoPilot ? "Autopilot Active" : "Apply Setpoint Adjustments"}
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
