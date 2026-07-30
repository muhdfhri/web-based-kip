import React, { useState, useEffect, useRef } from "react";
import "./AiGradingTab.css";
import usePlcStore from "@core/store/usePlcStore.js";

export default function AiGradingTab({ configMode, availableTags = [], tagMap = {} }) {
  const [isAutoPilot, setIsAutoPilot] = useState(true);
  const [totalFfb, setTotalFfb] = useState(0);
  const [distribution, setDistribution] = useState({
    ripe: 0,
    unripe: 0,
    overripe: 0,
    empty: 0,
    abnormal: 0,
  });

  const [logs, setLogs] = useState([]);
  const [message, setMessage] = useState("");

  // Developer settings state (persisted in localStorage)
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [rtspUrl, setRtspUrl] = useState(() => localStorage.getItem("som_ffb_rtsp_url") || "");
  const [streamUrl, setStreamUrl] = useState(() => localStorage.getItem("som_ffb_stream_url") || "");
  const [ffbTag, setFfbTag] = useState(() => localStorage.getItem("som_ffb_plc_tag") || "");
  const [pilotTag, setPilotTag] = useState(() => localStorage.getItem("som_ffb_pilot_tag") || "");

  // PLC Store for writing autopilot commands
  const plcStore = usePlcStore();

  // Fetch real FFB stats from grading-service
  const fetchStats = async () => {
    try {
      const res = await fetch("/api/grading/stats?period=DAY", { credentials: "include" });
      if (res.ok) {
        const stats = await res.json();

        // Sum total detected bunches
        const total = stats.reduce((sum, s) => sum + s.count, 0);

        const getCount = (cat) => stats.find((s) => s.category === cat)?.count || 0;
        const getPct = (cat) => (total > 0 ? Math.round((getCount(cat) / total) * 100) : 0);

        setTotalFfb(total);
        setDistribution({
          ripe: getPct("ripe"),
          unripe: getPct("unripe"),
          overripe: getPct("overripe"),
          empty: getPct("empty"),
          abnormal: getPct("abnormal"),
        });
      }
    } catch (err) {
      console.error("Failed to fetch FFB grading stats:", err);
    }
  };

  // Fetch real-time recent AI detections
  const fetchRecentDetections = async () => {
    try {
      const res = await fetch("/api/grading/recent?page=1&limit=5", { credentials: "include" });
      if (res.ok) {
        const result = await res.json();
        if (result?.data && Array.isArray(result.data)) {
          const formattedLogs = result.data.map((d) => {
            const timeStr = new Date(d.created_at).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            });
            return {
              time: timeStr,
              action: `Detected ${d.category.toUpperCase()} (${d.confidence}% Confidence)`,
            };
          });
          setLogs(formattedLogs);
        }
      }
    } catch (err) {
      console.error("Failed to fetch recent FFB detections:", err);
    }
  };

  // Poll statistics and recent logs every 5 seconds
  useEffect(() => {
    fetchStats();
    fetchRecentDetections();

    const interval = setInterval(() => {
      fetchStats();
      fetchRecentDetections();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Determine suggested recipe based on unripe percentage
  const getRecipeDetails = () => {
    const { unripe, overripe } = distribution;
    if (unripe > 30) {
      return {
        name: "Cycle 3 (High Steam / Long Moisture)",
        code: "CYCLE_3",
        reason: "High ratio of unripe fruit requires longer steam penetration duration."
      };
    } else if (overripe > 15) {
      return {
        name: "Cycle 1 (Fast Cycle / Low Pressure)",
        code: "CYCLE_1",
        reason: "High ratio of overripe fruit detected, fast cycle recommended to prevent acid contamination."
      };
    } else {
      return {
        name: "Cycle 2 (Standard Double Peaking)",
        code: "CYCLE_2",
        reason: "Normal ripeness distribution, using standard energy-efficient cycle."
      };
    }
  };

  const recipe = getRecipeDetails();

  // Autopilot logic - send PLC commands when suggested recipe shifts
  const prevRecipeCode = useRef(recipe.code);
  useEffect(() => {
    if (isAutoPilot && prevRecipeCode.current !== recipe.code && totalFfb > 0) {
      const now = new Date();
      const timeStr = now.toTimeString().substring(0, 5);

      // Attempt writing to PLC tag if configured
      if (pilotTag) {
        // Map recipe code to an integer value (e.g., CYCLE_1 = 1, CYCLE_2 = 2, CYCLE_3 = 3)
        const plcVal = recipe.code === "CYCLE_1" ? 1 : recipe.code === "CYCLE_2" ? 2 : 3;
        const targetTag = availableTags.find(t => t.tag_name === pilotTag);
        if (targetTag) {
          plcStore.sendCommand(targetTag.id, plcVal, pilotTag, "sterilizer");
        }
      }

      const newLog = {
        time: timeStr,
        action: `Auto-pilot applied ${recipe.name}`,
      };
      setLogs((prev) => [newLog, ...prev.slice(0, 4)]);
      prevRecipeCode.current = recipe.code;

      setMessage(`System automatically applied recipe: ${recipe.name}`);
      setTimeout(() => setMessage(""), 5000);
    }
  }, [recipe.code, isAutoPilot, recipe.name, pilotTag, availableTags, totalFfb]);

  const handleApplyRecipe = () => {
    const now = new Date();
    const timeStr = now.toTimeString().substring(0, 5);

    // Attempt writing to PLC tag manually
    if (pilotTag) {
      const plcVal = recipe.code === "CYCLE_1" ? 1 : recipe.code === "CYCLE_2" ? 2 : 3;
      const targetTag = availableTags.find(t => t.tag_name === pilotTag);
      if (targetTag) {
        plcStore.sendCommand(targetTag.id, plcVal, pilotTag, "sterilizer");
      }
    }

    const newLog = {
      time: timeStr,
      action: `Manually applied ${recipe.name}`,
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 4)]);

    setMessage(`Recipe ${recipe.name} successfully applied to Sterilizer!`);
    setTimeout(() => setMessage(""), 5000);
  };

  const handleSaveConfig = () => {
    localStorage.setItem("som_ffb_rtsp_url", rtspUrl);
    localStorage.setItem("som_ffb_stream_url", streamUrl);
    localStorage.setItem("som_ffb_plc_tag", ffbTag);
    localStorage.setItem("som_ffb_pilot_tag", pilotTag);
    setShowConfigModal(false);

    setMessage("AI Camera & PLC mappings saved successfully!");
    setTimeout(() => setMessage(""), 4000);

    // Refresh FFB stats immediately
    fetchStats();
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
            🎥 LIVE AI VIDEO ANALYTICS - CONVEYOR INLET

            {/* Developer Setup Button */}
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
                  src={streamUrl}
                  alt="AI FFB Camera Feed"
                  className="som-grading-video-element"
                />
              ) : (
                <div className="som-feed-disconnected">
                  <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="som-disconnected-icon">
                    <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.58 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
                  </svg>
                  <p className="som-disconnected-title">CCTV STREAM DISCONNECTED</p>
                  <p className="som-disconnected-subtitle">
                    {configMode ? "Enter WebSocket or HTTP Stream URL in settings to connect." : "No camera signal. Please contact system administrator."}
                  </p>
                </div>
              )}

              {/* Live overlay banner when connected */}
              {streamUrl && (
                <div className="som-video-live-overlay">
                  <span className="som-live-pulse-dot"></span>
                  <span>LIVE FEED</span>
                </div>
              )}

              {/* Dev Active Overlay Info */}
              {configMode && (
                <div className="som-dev-overlay-badge">
                  🛠_DEV CONFIG MODE
                </div>
              )}

              {/* Developer Configuration Modal overlay inside wrapper */}
              {showConfigModal && (
                <div className="som-dev-modal-overlay" onClick={() => setShowConfigModal(false)}>
                  <div className="som-dev-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="som-dev-modal-header">
                      ⚙️ CCTV & PLC CONFIGURATION
                    </div>
                    <div className="som-dev-modal-body">
                      <div className="som-dev-form-group">
                        <label>RTSP Video Source URL</label>
                        <input
                          type="text"
                          value={rtspUrl}
                          onChange={(e) => setRtspUrl(e.target.value)}
                          placeholder="rtsp://admin:admin123@192.168.10.50:554/stream1"
                        />
                      </div>
                      <div className="som-dev-form-group">
                        <label>WebSocket/HTTP Stream URL (Frontend)</label>
                        <input
                          type="text"
                          value={streamUrl}
                          onChange={(e) => setStreamUrl(e.target.value)}
                          placeholder="ws://localhost:9999/live/stream (Leave empty for offline)"
                        />
                      </div>
                      <div className="som-dev-form-group">
                        <label>PLC Tag - FFB Counter</label>
                        <select value={ffbTag} onChange={(e) => setFfbTag(e.target.value)}>
                          <option value="">— Select FFB Tag —</option>
                          {availableTags && availableTags.map((tag) => (
                            <option key={tag.id} value={tag.tag_name}>
                              {tag.tag_name} ({tag.tag_address})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="som-dev-form-group">
                        <label>PLC Tag - Auto-Pilot Signal</label>
                        <select value={pilotTag} onChange={(e) => setPilotTag(e.target.value)}>
                          <option value="">— Select Pilot Tag —</option>
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

      {/* RIGHT COLUMN: BATCH STATS, CHART, RECIPE SUGGESTIONS */}
      <div className="som-grading-right-col">
        {/* Card 1: Batch Statistics & Ripeness Breakdown */}
        <div className="som-minimal-card som-grading-stats-card">
          <div className="som-minimal-header">📊 BATCH STATISTICS</div>
          <div className="som-minimal-body">
            <div className="som-grading-kpi-grid">
              <div className="som-kpi-item">
                <span className="som-kpi-label">TOTAL DETECTED FFB</span>
                <span className="som-kpi-val">{totalFfb}</span>
              </div>
              <div className="som-kpi-item">
                <span className="som-kpi-label">MAJORITY STATUS</span>
                <span className="som-kpi-val som-text-gold">
                  {distribution.unripe > 30 ? "UNRIPE" : totalFfb > 0 ? "RIPE" : "N/A"}
                </span>
              </div>
            </div>

            <div className="som-minimal-divider"></div>

            <span className="som-minimal-section-title">RIPENESS DISTRIBUTION</span>

            <div className="som-distribution-list">
              <div className="som-dist-row">
                <span className="som-dist-label">Ripe</span>
                <div className="som-progress-bar-wrapper">
                  <div className="som-progress-bar ripe" style={{ width: `${distribution.ripe}%` }}></div>
                </div>
                <span className="som-dist-pct ripe">{distribution.ripe}%</span>
              </div>

              <div className="som-dist-row">
                <span className="som-dist-label">Unripe</span>
                <div className="som-progress-bar-wrapper">
                  <div className="som-progress-bar unripe" style={{ width: `${distribution.unripe}%` }}></div>
                </div>
                <span className="som-dist-pct unripe">{distribution.unripe}%</span>
              </div>

              <div className="som-dist-row">
                <span className="som-dist-label">Overripe</span>
                <div className="som-progress-bar-wrapper">
                  <div className="som-progress-bar overripe" style={{ width: `${distribution.overripe}%` }}></div>
                </div>
                <span className="som-dist-pct overripe">{distribution.overripe}%</span>
              </div>

              <div className="som-dist-row">
                <span className="som-dist-label">Empty Bunch</span>
                <div className="som-progress-bar-wrapper">
                  <div className="som-progress-bar empty" style={{ width: `${distribution.empty}%` }}></div>
                </div>
                <span className="som-dist-pct empty">{distribution.empty}%</span>
              </div>

              <div className="som-dist-row">
                <span className="som-dist-label">Abnormal / Damaged</span>
                <div className="som-progress-bar-wrapper">
                  <div className="som-progress-bar abnormal" style={{ width: `${distribution.abnormal}%` }}></div>
                </div>
                <span className="som-dist-pct abnormal">{distribution.abnormal}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: AI Recipe Recommendation & Actions */}
        <div className="som-minimal-card som-grading-actions-card">
          <div className="som-minimal-header">💡 SMART RECIPE DECISION</div>
          <div className="som-minimal-body">
            <div className="som-autopilot-control">
              <div className="som-autopilot-info">
                <span className="som-autopilot-label">AUTO-PILOT MODE</span>
                <p className="som-autopilot-desc">AI automatically adjusts sterilizer recipes in PLC based on FFB ripeness.</p>
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

            <div className="som-recipe-sug-panel">
              <span className="som-sug-badge">RECOMMENDED CYCLE</span>
              <div className="som-sug-title">{recipe.name}</div>
              <div className="som-sug-desc">{recipe.reason}</div>
            </div>

            <button
              onClick={handleApplyRecipe}
              disabled={isAutoPilot}
              className={`som-apply-recipe-btn ${isAutoPilot ? "disabled" : ""}`}
            >
              {isAutoPilot ? "Auto-Pilot Active (Read-Only)" : "Apply Recipe To Line"}
            </button>
          </div>
        </div>

        {/* Card 3: Recent Activity Logs */}
        <div className="som-minimal-card som-grading-logs-card">
          <div className="som-minimal-header">📝 RECENT LOGS</div>
          <div className="som-minimal-body som-logs-body">
            <div className="som-logs-list">
              {logs.map((log, idx) => (
                <div key={idx} className="som-log-item">
                  <span className="som-log-time">{log.time}</span>
                  <span className="som-log-action">{log.action}</span>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="som-log-item-empty">No recent AI grading events logged.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
