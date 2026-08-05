import React, { useState, useRef } from "react";
import "./TrendTab.css";

export default function TrendTab({
  trendPeriod,
  setTrendPeriod,
  showTrendSettings,
  setShowTrendSettings,
  currentDateTime,
  handleTrendMouseMove,
  handleTrendMouseLeave,
  getResolution,
  trendData,
  hoverData,
  getXAxisLabels,
  getMappedValue,
  trendOffset,
  setTrendOffset,
  getTrendTimeRange,
}) {
  const getLatestValue = (line) => {
    let arr = [];
    if (line === "1") arr = trendData?.s1;
    else if (line === "2") arr = trendData?.s2;
    else if (line === "3") arr = trendData?.s3;
    else if (line === "4") arr = trendData?.s4;
    else if (line === "BPV") arr = trendData?.bpv;

    if (!arr || arr.length === 0) return "0.0";
    const val = arr[arr.length - 1];
    return val !== undefined && val !== null ? val.toFixed(1) : "0.0";
  };

  return (
    <div className="som-trend-container">
      {/* TOP: SCADA GRAPH AREA */}
      <div className="som-trend-graph-main">
        {/* Left Y-Axis */}
        <div className="som-trend-y-axis">
          <div className="som-trend-y-label">BAR PRESSURE</div>
          <div className="som-trend-y-ticks">
            {[4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0, 0.5, 0.0].map((t) => (
              <span key={t}>{t.toFixed(1)}</span>
            ))}
          </div>
        </div>

        {/* Graph Plot */}
        <div
          className="som-trend-plot-wrapper"
          onMouseLeave={handleTrendMouseLeave}
        >
          <div className="som-trend-tools">
            <button
              className={`som-trend-tool-btn ${showTrendSettings ? "active" : ""}`}
              onClick={() => setShowTrendSettings(!showTrendSettings)}
            >
              ⚙
            </button>

            {showTrendSettings && (
              <div className="som-trend-settings-dropdown">
                <div className="som-trend-settings-group">
                  <div className="som-settings-label">Filter Period</div>
                  <div className="som-period-grid">
                    {["2H", "5H", "8H", "D"].map((p) => (
                      <button
                        key={p}
                        className={`som-period-btn ${trendPeriod === p ? "active" : ""}`}
                        onClick={() => {
                          setTrendOffset(0);
                          setTrendPeriod(p);
                          setShowTrendSettings(false);
                        }}
                      >
                        {p === "2H"
                          ? "2-Hourly"
                          : p === "5H"
                            ? "5-Hourly"
                            : p === "8H"
                              ? "8-Hourly"
                              : "Daily"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="som-trend-date-stamp">
            {currentDateTime && currentDateTime.toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}{" "}
            {currentDateTime && currentDateTime
              .toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })
              .replace(/\./g, ":")}{" "}
            — HISTORICAL PRESSURE ({trendPeriod})
          </div>

          <svg
            className="som-trend-svg"
            viewBox="0 0 1000 300"
            preserveAspectRatio="none"
            onMouseMove={handleTrendMouseMove}
          >
            {/* Horizontal Grid */}
            {[0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0].map((val) => (
              <line
                key={val}
                x1="0"
                y1={300 - (val / 4) * 300}
                x2="1000"
                y2={300 - (val / 4) * 300}
                stroke={val === 0 ? "#0f172a" : "#e2e8f0"}
                strokeWidth={val === 0 ? "2" : "1"}
              />
            ))}

            {/* Vertical Grid */}
            {getXAxisLabels(trendPeriod).map((_, i, arr) => (
              <line
                key={i}
                x1={(i / (arr.length - 1 || 1)) * 1000}
                y1="0"
                x2={(i / (arr.length - 1 || 1)) * 1000}
                y2="300"
                stroke="#e2e8f0"
                strokeWidth="0.5"
                strokeDasharray="4 4"
              />
            ))}

            {/* Trends */}
            <polyline
              fill="none"
              stroke="#ef4444"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={trendData.s1
                .map(
                  (val, i) =>
                    `${(i / (trendData.resolution - 1)) * 1000},${300 - (val / 4) * 300}`,
                )
                .join(" ")}
            />
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={trendData.s2
                .map(
                  (val, i) =>
                    `${(i / (trendData.resolution - 1)) * 1000},${300 - (val / 4) * 300}`,
                )
                .join(" ")}
            />
            <polyline
              fill="none"
              stroke="#22c55e"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={trendData.s3
                .map(
                  (val, i) =>
                    `${(i / (trendData.resolution - 1)) * 1000},${300 - (val / 4) * 300}`,
                )
                .join(" ")}
            />
            <polyline
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={trendData.s4
                .map(
                  (val, i) =>
                    `${(i / (trendData.resolution - 1)) * 1000},${300 - (val / 4) * 300}`,
                )
                .join(" ")}
            />
            <polyline
              fill="none"
              stroke="#a855f7"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={trendData.bpv
                .map(
                  (val, i) =>
                    `${(i / (trendData.resolution - 1)) * 1000},${300 - (val / 4) * 300}`,
                )
                .join(" ")}
            />

            {/* Hover Indicator */}
            {hoverData && (
              <g>
                <line
                  x1={
                    (hoverData.index / (trendData.resolution - 1)) *
                    1000
                  }
                  y1="0"
                  x2={
                    (hoverData.index / (trendData.resolution - 1)) *
                    1000
                  }
                  y2="300"
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="4 2"
                />
                {hoverData.values.map((val, idx) => (
                  <circle
                    key={idx}
                    cx={
                      (hoverData.index / (trendData.resolution - 1)) *
                      1000
                    }
                    cy={300 - (val / 4) * 300}
                    r="4"
                    fill={
                      idx === 0
                        ? "#ef4444"
                        : idx === 1
                          ? "#3b82f6"
                          : idx === 2
                            ? "#22c55e"
                            : idx === 3
                              ? "#f59e0b"
                              : "#a855f7"
                    }
                    stroke="white"
                    strokeWidth="2"
                  />
                ))}
              </g>
            )}
          </svg>

          {/* Floating Tooltip Card */}
          {hoverData && (
            <div
              className="som-trend-tooltip-card"
              style={{
                left: `${hoverData.left}px`,
                transform:
                  hoverData.index > getResolution(trendPeriod) * 0.7
                    ? "translateX(-105%)"
                    : "translateX(5%)",
              }}
            >
              <div className="tooltip-header">
                {hoverData.timestamp}
              </div>
              <div className="tooltip-body">
                <div className="tooltip-row s1">
                  <span className="dot"></span>
                  <span className="label">S1 Pressure:</span>
                  <span className="value">
                    {hoverData.values[0].toFixed(1)} Bar
                  </span>
                </div>
                <div className="tooltip-row s2">
                  <span className="dot"></span>
                  <span className="label">S2 Pressure:</span>
                  <span className="value">
                    {hoverData.values[1].toFixed(1)} Bar
                  </span>
                </div>
                <div className="tooltip-row s3">
                  <span className="dot"></span>
                  <span className="label">S3 Pressure:</span>
                  <span className="value">
                    {hoverData.values[2].toFixed(1)} Bar
                  </span>
                </div>
                <div className="tooltip-row s4">
                  <span className="dot"></span>
                  <span className="label">S4 Pressure:</span>
                  <span className="value">
                    {hoverData.values[3].toFixed(1)} Bar
                  </span>
                </div>
                <div className="tooltip-row bpv">
                  <span className="dot" style={{ backgroundColor: "#a855f7" }}></span>
                  <span className="label">BPV Pressure:</span>
                  <span className="value">
                    {hoverData.values[4].toFixed(1)} Bar
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="som-trend-x-axis">
            {getXAxisLabels(trendPeriod).map((label, idx) => (
              <span key={idx}>{label}</span>
            ))}
          </div>

          {/* Historical Timeline Controller */}
          <div className="som-trend-timeline-controller">
            <button
              className="som-timeline-nav-btn"
              onClick={() => setTrendOffset(prev => prev + 1)}
              title="Go Back"
            >
              ◀ Previous
            </button>

            <div className="som-timeline-slider-container">
              <span className="som-slider-time-label">
                {(() => {
                  const { start } = getTrendTimeRange();
                  const d = new Date(start);
                  return `${d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":")}`;
                })()}
              </span>
              <input
                type="range"
                className="som-timeline-range-slider"
                min="0"
                max="24"
                value={trendOffset}
                onChange={(e) => setTrendOffset(Number(e.target.value))}
              />
              <span className="som-slider-time-label">
                {(() => {
                  const { end } = getTrendTimeRange();
                  const d = new Date(end);
                  return `${d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":")}`;
                })()}
              </span>
            </div>

            <button
              className="som-timeline-nav-btn"
              disabled={trendOffset === 0}
              onClick={() => setTrendOffset(prev => Math.max(0, prev - 1))}
              title="Go Forward"
            >
              Next ▶
            </button>

            <button
              className={`som-timeline-live-btn ${trendOffset === 0 ? "live-active" : ""}`}
              onClick={() => setTrendOffset(0)}
            >
              <span className="live-dot"></span> Latest
            </button>
          </div>

          <div className="som-trend-legend">
            <div className="som-legend-item">
              <div className="som-box s1"></div> PRESSURE S1
            </div>
            <div className="som-legend-item">
              <div className="som-box s2"></div> PRESSURE S2
            </div>
            <div className="som-legend-item">
              <div className="som-box s3"></div> PRESSURE S3
            </div>
            <div className="som-legend-item">
              <div className="som-box s4"></div> PRESSURE S4
            </div>
            <div className="som-legend-item">
              <div className="som-box bpv" style={{ backgroundColor: "#a855f7" }}></div> PRESSURE BPV
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM: INDUSTRIAL SUMMARY CARDS */}
      <div className="som-trend-summary-footer">
        {["1", "2", "3", "4", "BPV"].map((line) => {
          const tempId = line === "BPV" ? "bpv_temp" : `st${line}_temp`;
          let tempVal = getMappedValue ? getMappedValue(tempId, "MONITOR", "0.0") : "0.0";
          if ((tempVal === "No Tag" || tempVal === "--") && getMappedValue) {
            const altVal = getMappedValue(tempId, "TEMP", "0.0");
            if (altVal !== "No Tag" && altVal !== "--") tempVal = altVal;
          }
          return (
            <div key={line} className="som-trend-card">
              <div className="som-trend-card-section">
                <div className="som-trend-card-label">
                  PRESSURE {line}
                </div>
                <div className="som-trend-card-val som-trend-accent-val">
                  {getLatestValue(line)} <span className="som-unit">BAR</span>
                </div>
              </div>
              <div className="som-trend-card-section">
                <div className="som-trend-card-label">TEMP {line}</div>
                <div className="som-trend-card-val som-trend-accent-val">
                  {typeof tempVal === 'number' ? tempVal.toFixed(1) : (typeof tempVal === 'string' && tempVal.trim() !== '' && !isNaN(Number(tempVal)) ? Number(tempVal).toFixed(1) : tempVal)} <span className="som-unit">°C</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
