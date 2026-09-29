"use client";

import React, { useMemo } from "react";

export interface DataPoint {
  t: number;
  val: number;
}

interface LineGraphProps {
  data: DataPoint[];
  width: number;
  height: number;
  color?: string;
  xLabel?: string;
  yLabel?: string;
  /** Maximum time window to display. If specified, graph scrolls. */
  timeWindow?: number;
  /** Y axis limits */
  yMin?: number;
  yMax?: number;
}

export function LineGraph({
  data,
  width,
  height,
  color = "var(--color-primary)",
  xLabel = "Waktu (s)",
  yLabel = "Nilai",
  timeWindow,
  yMin,
  yMax
}: LineGraphProps) {
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const graphW = width - padding.left - padding.right;
  const graphH = height - padding.top - padding.bottom;

  const { pathData, currentYMin, currentYMax, currentTMin, currentTMax } = useMemo(() => {
    if (data.length === 0 || graphW <= 0 || graphH <= 0) {
      return { pathData: "", currentYMin: 0, currentYMax: 1, currentTMin: 0, currentTMax: 1 };
    }

    const tMax = data[data.length - 1].t;
    const tMin = timeWindow ? Math.max(0, tMax - timeWindow) : data[0].t;

    let cYMin = yMin !== undefined ? yMin : Math.min(...data.map((d) => d.val));
    let cYMax = yMax !== undefined ? yMax : Math.max(...data.map((d) => d.val));

    // Pad Y axis slightly if it's auto-scaled and flat
    if (cYMin === cYMax) {
      cYMin -= 1;
      cYMax += 1;
    } else if (yMin === undefined && yMax === undefined) {
      const range = cYMax - cYMin;
      cYMin -= range * 0.1;
      cYMax += range * 0.1;
    }

    const tRange = Math.max(tMax - tMin, 0.1);
    const yRange = cYMax - cYMin;

    const visibleData = timeWindow ? data.filter(d => d.t >= tMin) : data;

    const mapX = (t: number) => ((t - tMin) / tRange) * graphW;
    const mapY = (val: number) => graphH - ((val - cYMin) / yRange) * graphH;

    const pts = visibleData.map((d, i) => `${i === 0 ? "M" : "L"} ${mapX(d.t).toFixed(2)},${mapY(d.val).toFixed(2)}`);

    return { pathData: pts.join(" "), currentYMin: cYMin, currentYMax: cYMax, currentTMin: tMin, currentTMax: Math.max(tMax, tMin + 0.1) };
  }, [data, graphW, graphH, timeWindow, yMin, yMax]);

  return (
    <svg width={width} height={height} className="bg-transparent font-sans">
      <g transform={`translate(${padding.left}, ${padding.top})`}>
        {/* Grid and Axes */}
        <line x1={0} y1={graphH} x2={graphW} y2={graphH} stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
        <line x1={0} y1={0} x2={0} y2={graphH} stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
        
        {/* Center zero line if applicable */}
        {currentYMin < 0 && currentYMax > 0 && (
          <line 
            x1={0} 
            y1={graphH - ((0 - currentYMin) / (currentYMax - currentYMin)) * graphH} 
            x2={graphW} 
            y2={graphH - ((0 - currentYMin) / (currentYMax - currentYMin)) * graphH} 
            stroke="rgba(255,255,255,0.1)" strokeWidth={1} strokeDasharray="4 4" 
          />
        )}

        {/* Path */}
        <path d={pathData} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Y Axis Labels */}
        <text x={-8} y={5} fill="rgba(255,255,255,0.5)" fontSize={10} textAnchor="end">{currentYMax.toFixed(1)}</text>
        <text x={-8} y={graphH + 4} fill="rgba(255,255,255,0.5)" fontSize={10} textAnchor="end">{currentYMin.toFixed(1)}</text>
        <text x={-padding.left + 10} y={graphH / 2} fill="rgba(255,255,255,0.7)" fontSize={11} textAnchor="middle" transform={`rotate(-90, ${-padding.left + 10}, ${graphH / 2})`}>{yLabel}</text>

        {/* X Axis Labels */}
        <text x={0} y={graphH + 16} fill="rgba(255,255,255,0.5)" fontSize={10} textAnchor="middle">{currentTMin.toFixed(1)}</text>
        <text x={graphW} y={graphH + 16} fill="rgba(255,255,255,0.5)" fontSize={10} textAnchor="middle">{currentTMax.toFixed(1)}</text>
        <text x={graphW / 2} y={graphH + 30} fill="rgba(255,255,255,0.7)" fontSize={11} textAnchor="middle">{xLabel}</text>
      </g>
    </svg>
  );
}
