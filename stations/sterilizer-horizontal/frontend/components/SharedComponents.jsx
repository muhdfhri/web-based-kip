import React from "react";

export function EquipmentIconSVG({
  x,
  y,
  icon,
  size = 120,
  rotation = 0,
  isRunning = false,
}) {
  const half = size / 2;
    const filterStyle = isRunning ? "url(#tint-green)" : "url(#tint-red)";
  return (
    <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
      <image 
        href={icon} 
        x={-half} 
        y={-half} 
        width={size} 
        height={size} 
        style={{ filter: filterStyle }} // TERAPKAN FILTER WARNA DI SINI
      />
    </g>
  );
}

export function IpomasMonitorCardSVG({
  x,
  y,
  id,
  title,
  singleValue,
  singleUnit,
  width = 160,
  scale = 1,
  onClick,
  style = {},
}) {
  const cardWidth = width;
  const cardHeight = 64;

  return (
    <g
      id={id}
      onClick={() => onClick && onClick(id)}
      transform={`translate(${x}, ${y}) scale(${scale})`}
      style={{ cursor: onClick ? "pointer" : "default", ...style }}
    >
      <foreignObject
        x={-cardWidth / 2}
        y={-cardHeight / 2}
        width={cardWidth}
        height={cardHeight}
        style={{ overflow: "visible" }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.96)",
            border: "1px solid #cbd5e1",
            borderRadius: "10px",
            boxShadow: "0 4px 14px rgba(15,23,42,0.12)",
            padding: "6px 10px",
            textAlign: "center",
            color: "#0f172a",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.04em",
              marginBottom: "4px",
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: "22px", fontWeight: 900, lineHeight: 1 }}>
            {singleValue}
            <span style={{ fontSize: "11px", marginLeft: "4px", opacity: 0.7 }}>
              {singleUnit}
            </span>
          </div>
        </div>
      </foreignObject>
    </g>
  );
}
