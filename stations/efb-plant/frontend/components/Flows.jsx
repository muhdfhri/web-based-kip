import React from 'react';

export const LiquidFlowSVG = ({
  d,
  points,
  isRunning = true,
  mode = "liquid",
  flowing = true,
  color = "#38bdf8",
  dotColor,
  thickness = 8,
  glowOpacity = 0.1,
  duration = 0.45,
}) => {
  if (!isRunning) return null;

  const pathD = d || (points ? `M ${points}` : "");
  if (!pathD) return null;

  const durationStyle = duration ? { animationDuration: typeof duration === 'number' ? `${duration}s` : duration } : {};

  return (
    <g style={{ pointerEvents: "none", ...(duration ? { '--flow-duration': typeof duration === 'number' ? `${duration}s` : duration } : {}) }}>
      {/* 1. Outer Glow */}
      <path
        d={pathD}
        className="oc-water-path-base"
        style={{
          stroke: color,
          strokeWidth: `${thickness + Math.min(3, thickness * 0.2)}px`,
          filter: `blur(${Math.min(1.5, thickness * 0.15)}px)`,
          opacity: glowOpacity,
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
          strokeWidth: `${thickness + 1}px`,
          filter: `blur(1px)`,
          opacity: 0.2,
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
          filter: `drop-shadow(0px 0px 2px rgba(0,0,0,0.5))`,
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
          ...(dotColor ? { stroke: dotColor } : {}),
          ...durationStyle,
        }}
      />
    </g>
  );
};

export const WaterFlowSVG = ({ d, points, isRunning, duration }) => (
  <LiquidFlowSVG d={d} points={points} isRunning={isRunning} color="#38bdf8" thickness={15} duration={duration} />
);

export const SteamFlowSVG = ({ d, points, active, isRunning, mode = "flowing", color = "#f59e0b", thickness = 2, duration }) => {
  const isActive = active !== undefined ? active : isRunning;
  if (!isActive) return null;

  const pathD = d || (points ? `M ${points}` : "");
  if (!pathD) return null;

  let modeClass = "steam-flow--flowing";
  if (mode === "standby") modeClass = "steam-flow--standby";
  if (mode === "liquid") modeClass = "steam-flow--liquid";

  const durationStyle = duration ? { animationDuration: typeof duration === 'number' ? `${duration}s` : duration } : {};

  return (
    <g className={modeClass} style={{ pointerEvents: "none", '--base-thickness': `${thickness}px`, '--base-blur': `${Math.max(1, thickness * 0.8)}px`, ...(duration ? { '--flow-duration': typeof duration === 'number' ? `${duration}s` : duration } : {}) }}>
      <path
        d={pathD}
        fill="none"
        stroke={color}
        className="steam-flow-glow"
        pointerEvents="none"
        style={durationStyle}
      />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        className="steam-flow-aura"
        pointerEvents="none"
        style={durationStyle}
      />
    </g>
  );
};

export const LiquidSteamFlowSVG = ({ d, points, active = true, isRunning, mode = "flowing", color = "#00d2ff", thickness = 10, duration }) => {
  const isActive = active !== undefined ? active : (isRunning !== undefined ? isRunning : true);
  if (!isActive) return null;

  const pathD = d || (points ? `M ${points}` : "");
  if (!pathD) return null;

  let modeClass = "liquid-flow--flowing";
  if (mode === "standby") modeClass = "liquid-flow--standby";
  if (mode === "liquid") modeClass = "liquid-flow--liquid";

  const durationStyle = duration ? { animationDuration: typeof duration === 'number' ? `${duration}s` : duration } : {};

  return (
    <g className={modeClass} style={{ pointerEvents: "none", ...(duration ? { '--flow-duration': typeof duration === 'number' ? `${duration}s` : duration } : {}) }}>
      <path
        d={pathD}
        fill="none"
        stroke={color}
        className="liquid-flow-glow"
        pointerEvents="none"
        style={{ strokeWidth: `${thickness + 4}px`, ...durationStyle }}
      />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        className="liquid-flow-aura"
        pointerEvents="none"
        style={{ strokeWidth: `${thickness}px`, ...durationStyle }}
      />
    </g>
  );
};
