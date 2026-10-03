import React, { useState, useEffect } from "react";
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
  selectedMetric = "TEMP",
  setSelectedMetric,
}) {
  const [activeMetric, setActiveMetric] = useState(selectedMetric || "TEMP");

  useEffect(() => {
    if (selectedMetric && selectedMetric !== activeMetric) {
      setActiveMetric(selectedMetric);
    }
  }, [selectedMetric]);

  const handleMetricChange = (metric) => {
    setActiveMetric(metric);
    if (setSelectedMetric) setSelectedMetric(metric);
  };

  const getLatestValue = (line) => {
    let arr = [];
    if (line === "1") arr = trendData?.efb1;
    else if (line === "2") arr = trendData?.efb2;
    else if (line === "3") arr = trendData?.efb3;
    else if (line === "4") arr = trendData?.efb4;

    if (!arr || arr.length === 0) return "0.0";
    const val = arr[arr.length - 1];
    return val !== undefined && val !== null ? Number(val).toFixed(1) : "0.0";
  };

  // Y-axis configuration based on metric (Scale 0 - 250, Step 25, or Flow 0 - 6.0, Step 0.6)
  const yAxisConfig = activeMetric === "FLOW"
    ? { label: "WATER & STEAM FLOW (m³/h)", max: 6.0, step: 0.6, unit: "m³/h", decimals: 1 }
    : { label: "TEMPERATURE (°C)", max: 250, step: 25, unit: "°C", decimals: 0 };

  const yTicks = [];
  if (activeMetric === "FLOW") {
    for (let i = 10; i >= 0; i--) {
      yTicks.push(Number((i * 0.6).toFixed(1)));
    }
  } else {
    for (let val = yAxisConfig.max; val >= 0; val -= yAxisConfig.step) {
      yTicks.push(val);
    }
  }

  const res = trendData?.resolution || (getResolution ? getResolution(trendPeriod) : 60);

  return (
    <div className="som-trend-container">
      {/* TOP: SCADA GRAPH AREA */}
      <div className="som-trend-graph-main">
        {/* Top Header: Centered Graphic Title & Tools */}
        <div className="som-trend-header-row">
          <div className="som-trend-header-left" />

          <div className="som-trend-center-title">
            {activeMetric === "FLOW" ? "Graphic Water & Steam Flow" : "Graphic Temperature"}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="som-trend-tools">
              <button
                className={`som-trend-tool-btn ${showTrendSettings ? "active" : ""}`}
                onClick={() => setShowTrendSettings(!showTrendSettings)}
                title="Trend Settings"
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
          </div>
        </div>

        {/* Middle Plot Row: Y-Axis and SVG aligned side-by-side */}
        <div className="som-trend-body-row">
          {/* Left Y-Axis */}
          <div className="som-trend-y-axis">
            <div className="som-trend-y-label">{yAxisConfig.label}</div>
            <div className="som-trend-y-ticks">
              {yTicks.map((t) => (
                <span
                  key={t}
                  className="som-y-tick"
                  style={{
                    top: `${((yAxisConfig.max - t) / yAxisConfig.max) * 100}%`,
                    ...(t >= yAxisConfig.max ? { transform: "translateY(2px)" } : {}),
                  }}
                >
                  {yAxisConfig.decimals === 1 ? (t === 0 ? "0" : t.toFixed(1)) : t.toFixed(0)}
                </span>
              ))}
            </div>
          </div>

          {/* Graph Plot Area */}
          <div
            className="som-trend-plot-wrapper"
            onMouseLeave={handleTrendMouseLeave}
          >
            <svg
              className="som-trend-svg"
              viewBox="0 0 1000 300"
              preserveAspectRatio="none"
              onMouseMove={handleTrendMouseMove}
            >
              {/* Horizontal Grid */}
              {yTicks.map((val) => (
                <line
                  key={val}
                  x1="0"
                  y1={300 - (val / yAxisConfig.max) * 300}
                  x2="1000"
                  y2={300 - (val / yAxisConfig.max) * 300}
                  stroke={val === 0 ? "#0f172a" : "#cbd5e1"}
                  strokeWidth={val === 0 ? "1.5" : "0.75"}
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
                  stroke="#cbd5e1"
                  strokeWidth="0.75"
                />
              ))}

              {/* Trend Lines */}
              {trendData?.efb1 && trendData.efb1.length > 0 && (
                <polyline
                  fill="none"
                  stroke={activeMetric === "FLOW" ? "#3b82f6" : "#10b981"}
                  strokeWidth="1.6"
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={trendData.efb1
                    .map(
                      (val, i) =>
                        `${(i / (res - 1)) * 1000},${300 - (Math.min(yAxisConfig.max, Math.max(0, val)) / yAxisConfig.max) * 300}`
                    )
                    .join(" ")}
                />
              )}

              {trendData?.efb2 && trendData.efb2.length > 0 && (
                <polyline
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="1.6"
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={trendData.efb2
                    .map(
                      (val, i) =>
                        `${(i / (res - 1)) * 1000},${300 - (Math.min(yAxisConfig.max, Math.max(0, val)) / yAxisConfig.max) * 300}`
                    )
                    .join(" ")}
                />
              )}

              {activeMetric !== "FLOW" && trendData?.efb3 && trendData.efb3.length > 0 && (
                <polyline
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.6"
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={trendData.efb3
                    .map(
                      (val, i) =>
                        `${(i / (res - 1)) * 1000},${300 - (Math.min(yAxisConfig.max, Math.max(0, val)) / yAxisConfig.max) * 300}`
                    )
                    .join(" ")}
                />
              )}

              {activeMetric !== "FLOW" && trendData?.efb4 && trendData.efb4.length > 0 && (
                <polyline
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="1.6"
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={trendData.efb4
                    .map(
                      (val, i) =>
                        `${(i / (res - 1)) * 1000},${300 - (Math.min(yAxisConfig.max, Math.max(0, val)) / yAxisConfig.max) * 300}`
                    )
                    .join(" ")}
                />
              )}

              {/* Hover Crosshair & Data Points */}
              {hoverData && (
                <g>
                  <line
                    x1={(hoverData.index / (res - 1)) * 1000}
                    y1="0"
                    x2={(hoverData.index / (res - 1)) * 1000}
                    y2="300"
                    stroke="#94a3b8"
                    strokeWidth="1"
                    strokeDasharray="4 2"
                  />
                  {hoverData.values && hoverData.values.slice(0, activeMetric === "FLOW" ? 2 : 4).map((val, idx) => (
                    <circle
                      key={idx}
                      cx={(hoverData.index / (res - 1)) * 1000}
                      cy={300 - (Math.min(yAxisConfig.max, Math.max(0, val)) / yAxisConfig.max) * 300}
                      r="4"
                      fill={
                        activeMetric === "FLOW"
                          ? (idx === 0 ? "#3b82f6" : "#ef4444")
                          : (idx === 0
                            ? "#10b981"
                            : idx === 1
                              ? "#ef4444"
                              : idx === 2
                                ? "#f59e0b"
                                : "#3b82f6")
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
                    (hoverData.left !== undefined
                      ? hoverData.left < 220
                      : hoverData.index < (getResolution ? getResolution(trendPeriod) * 0.25 : 5))
                      ? "translateX(5%)"
                      : "translateX(-105%)",
                }}
              >
                <div className="tooltip-header">
                  {hoverData.timestamp}
                </div>
                <div className="tooltip-body">
                  {activeMetric === "FLOW" ? (
                    <>
                      <div className="tooltip-row">
                        <span className="dot" style={{ background: "#3b82f6", boxShadow: "0 0 6px rgba(59, 130, 246, 0.5)" }}></span>
                        <span className="label">Water Flow:</span>
                        <span className="value">
                          {hoverData.values[0]?.toFixed(1) ?? "0.0"} {yAxisConfig.unit}
                        </span>
                      </div>
                      <div className="tooltip-row">
                        <span className="dot" style={{ background: "#ef4444", boxShadow: "0 0 6px rgba(239, 68, 68, 0.5)" }}></span>
                        <span className="label">Oil Flow:</span>
                        <span className="value">
                          {hoverData.values[1]?.toFixed(1) ?? "0.0"} {yAxisConfig.unit}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="tooltip-row efb1">
                        <span className="dot"></span>
                        <span className="label">TEMP 1:</span>
                        <span className="value">
                          {hoverData.values[0]?.toFixed(1) ?? "0.0"} {yAxisConfig.unit}
                        </span>
                      </div>
                      <div className="tooltip-row efb2">
                        <span className="dot"></span>
                        <span className="label">TEMP 2:</span>
                        <span className="value">
                          {hoverData.values[1]?.toFixed(1) ?? "0.0"} {yAxisConfig.unit}
                        </span>
                      </div>
                      <div className="tooltip-row efb3">
                        <span className="dot"></span>
                        <span className="label">TEMP 3:</span>
                        <span className="value">
                          {hoverData.values[2]?.toFixed(1) ?? "0.0"} {yAxisConfig.unit}
                        </span>
                      </div>
                      <div className="tooltip-row efb4">
                        <span className="dot"></span>
                        <span className="label">TEMP 4:</span>
                        <span className="value">
                          {hoverData.values[3]?.toFixed(1) ?? "0.0"} {yAxisConfig.unit}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom X-Axis Row */}
        <div className="som-trend-x-axis-row">
          <div className="som-trend-y-axis-spacer" />
          <div className="som-trend-x-axis">
            {getXAxisLabels(trendPeriod).map((label, idx) => (
              <span key={idx}>{label}</span>
            ))}
          </div>
        </div>

        {/* Historical Timeline Controller */}
        <div className="som-trend-timeline-controller">
          <button
            className="som-timeline-nav-btn"
            onClick={() => setTrendOffset((prev) => prev + 1)}
            title="Go Back in Time"
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
            onClick={() => setTrendOffset((prev) => Math.max(0, prev - 1))}
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

        {/* Legend */}
        <div className="som-trend-legend">
          {activeMetric === "FLOW" ? (
            <>
              <div className="som-legend-item">
                <div className="som-box efb1" style={{ backgroundColor: "#3b82f6" }}></div> WATER FLOW
              </div>
              <div className="som-legend-item">
                <div className="som-box efb2" style={{ backgroundColor: "#ef4444" }}></div> OIL FLOW
              </div>
            </>
          ) : (
            <>
              <div className="som-legend-item">
                <div className="som-box efb1" style={{ backgroundColor: "#10b981" }}></div> TEMP 1
              </div>
              <div className="som-legend-item">
                <div className="som-box efb2" style={{ backgroundColor: "#ef4444" }}></div> TEMP 2
              </div>
              <div className="som-legend-item">
                <div className="som-box efb3" style={{ backgroundColor: "#f59e0b" }}></div> TEMP 3
              </div>
              <div className="som-legend-item">
                <div className="som-box efb4" style={{ backgroundColor: "#3b82f6" }}></div> TEMP 4
              </div>
            </>
          )}
        </div>
      </div>

      {/* BOTTOM: INDUSTRIAL SUMMARY CARDS */}
      <div
        className="som-trend-summary-footer"
        style={{
          gridTemplateColumns: activeMetric === "FLOW" ? "repeat(2, 1fr) 1.25fr" : "repeat(4, 1fr) 1.25fr"
        }}
      >
        {activeMetric === "FLOW" ? (
          [
            {
              key: "water",
              label: "WATER FLOW",
              color: "#3b82f6",
              num: "1",
              tags: [
                "single_efb_1_value_sensor__WATER_FLOW",
                "single_efb_2_value_sensor__WATER_FLOW",
                "single_efb_3_value_sensor__WATER_FLOW",
                "single_efb_4_value_sensor__WATER_FLOW",
                "single_efb_1__WATER_FLOW",
                "single_efb_2__WATER_FLOW",
                "single_efb_3__WATER_FLOW",
                "single_efb_4__WATER_FLOW",
                "water_flow",
                "water_flow__MONITOR",
                "efb_water_flow",
                "flow_water",
                "card_water_flow"
              ]
            },
            {
              key: "oil",
              label: "OIL FLOW",
              color: "#ef4444",
              num: "2",
              tags: [
                "single_efb_1_value_sensor__OIL_FLOW",
                "single_efb_2_value_sensor__OIL_FLOW",
                "single_efb_3_value_sensor__OIL_FLOW",
                "single_efb_4_value_sensor__OIL_FLOW",
                "single_efb_1__OIL_FLOW",
                "single_efb_2__OIL_FLOW",
                "single_efb_3__OIL_FLOW",
                "single_efb_4__OIL_FLOW",
                "oil_flow",
                "oil_flow__MONITOR",
                "efb_oil_flow",
                "flow_oil",
                "card_oil_flow"
              ]
            }
          ].map((item) => {
            let flowVal = null;
            for (const c of item.tags) {
              const val = c.includes("__")
                ? getMappedValue ? getMappedValue(c.split("__")[0], c.split("__")[1], "--") : "--"
                : getMappedValue ? getMappedValue(c, "MONITOR", "--") : "--";
              if (val !== "No Tag" && val !== "--" && val !== undefined && val !== null) {
                flowVal = val;
                break;
              }
            }
            if (!flowVal) flowVal = getLatestValue(item.num);

            const formatNum = (v) => {
              if (v === null || v === undefined || v === "" || v === "No Tag" || v === "--") return "--";
              const n = Number(v);
              return !isNaN(n) ? n.toFixed(1) : v;
            };

            return (
              <div key={item.key} className="som-trend-card som-trend-temp-card">
                <div
                  className="som-temp-indicator-box"
                  style={{ backgroundColor: item.color }}
                />
                <div className="som-trend-card-section">
                  <div className="som-trend-card-label">{item.label}</div>
                  <div className="som-trend-card-val som-trend-accent-val">
                    {formatNum(flowVal)} <span className="som-unit">m³/h</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          ["1", "2", "3", "4"].map((num) => {
            let tempVal = null;
            const tCandidates = [
              `efb${num}_card__TEMP`,
              `temp${num}__MONITOR`,
              `temp${num}`,
              `efb_no_${num}__TEMP`,
              `temp_efb_${num}`,
              `efb_no_${num}`,
            ];
            for (const c of tCandidates) {
              const val = c.includes("__")
                ? getMappedValue ? getMappedValue(c.split("__")[0], c.split("__")[1], "--") : "--"
                : getMappedValue ? getMappedValue(c, "MONITOR", "--") : "--";
              if (val !== "No Tag" && val !== "--" && val !== undefined && val !== null) {
                tempVal = val;
                break;
              }
            }
            if (!tempVal) tempVal = getLatestValue(num);

            const formatNum = (v) => {
              if (v === null || v === undefined || v === "" || v === "No Tag" || v === "--") return "--";
              const n = Number(v);
              return !isNaN(n) ? n.toFixed(1) : v;
            };

            const tempColors = {
              "1": "#10b981",
              "2": "#ef4444",
              "3": "#f59e0b",
              "4": "#3b82f6",
            };

            return (
              <div key={num} className="som-trend-card som-trend-temp-card">
                <div
                  className="som-temp-indicator-box"
                  style={{ backgroundColor: tempColors[num] }}
                />
                <div className="som-trend-card-section">
                  <div className="som-trend-card-label">TEMP {num}</div>
                  <div className="som-trend-card-val som-trend-accent-val">
                    {formatNum(tempVal)} <span className="som-unit">°C</span>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Action card: To Graphic Flow / NEXT */}
        <div className="som-trend-card som-trend-nav-card">
          <div className="som-trend-nav-label">
            {activeMetric === "FLOW" ? "To Graphic Temp" : "To Graphic Flow"}
          </div>
          <button
            type="button"
            className="som-trend-next-btn"
            onClick={() => handleMetricChange(activeMetric === "FLOW" ? "TEMP" : "FLOW")}
            title={activeMetric === "FLOW" ? "Pindah ke Graphic Temperature" : "Pindah ke Graphic Water & Steam Flow"}
          >
            <span>NEXT</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
