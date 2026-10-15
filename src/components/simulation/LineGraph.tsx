"use client";

import React, { useMemo, useId } from "react";

import { SCIENTIFIC_THEME } from "./visual/tokens";

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
  /** Whether to draw the line connecting the data points */
  drawLine?: boolean;
  /** Whether to draw scatter points for data points */
  drawPoints?: boolean;
  /** A regression line to draw, given by slope (b) and intercept (a) */
  regressionLine?: { slope: number; intercept: number };
}

/**
 * High-contrast Scientific Night instrument-grade line graph.
 * Features subtle precision grid lines, monospace typography, and zero SVG filters for 60 FPS live streaming.
 */
export function LineGraph({
  data,
  width,
  height,
  color = SCIENTIFIC_THEME.vectors.position,
  xLabel = "Waktu (s)",
  yLabel = "Nilai",
  timeWindow,
  yMin,
  yMax,
  drawLine = true,
  drawPoints = false,
  regressionLine,
}: LineGraphProps) {
  const instanceId = useId().replace(/[:]/g, "_");

  // Adequate padding for multi-digit monospace axis labels without truncation
  const padding = { top: 24, right: 24, bottom: 44, left: 60 };
  const graphW = Math.max(0, width - padding.left - padding.right);
  const graphH = Math.max(0, height - padding.top - padding.bottom);

  const {
    pathData,
    areaPathData,
    currentYMin,
    currentYMax,
    currentTMin,
    currentTMax,
    plottedPoints,
    regPath,
    yTicks,
    xTicks,
  } = useMemo(() => {
    if (data.length === 0 || graphW <= 0 || graphH <= 0) {
      return {
        pathData: "",
        areaPathData: "",
        currentYMin: 0,
        currentYMax: 1,
        currentTMin: 0,
        currentTMax: 1,
        plottedPoints: [],
        regPath: "",
        yTicks: [
          { val: 0, y: 0 },
          { val: 0.5, y: graphH / 2 },
          { val: 1, y: graphH },
        ],
        xTicks: [
          { t: 0, x: 0 },
          { t: 0.5, x: graphW / 2 },
          { t: 1, x: graphW },
        ],
      };
    }

    const tMax = data[data.length - 1].t;
    const tMin = timeWindow ? Math.max(0, tMax - timeWindow) : data[0].t;

    let cYMin = yMin !== undefined ? yMin : Math.min(...data.map((d) => d.val));
    let cYMax = yMax !== undefined ? yMax : Math.max(...data.map((d) => d.val));

    // Pad Y axis slightly if flat or auto-scaled
    if (cYMin === cYMax) {
      cYMin -= 1;
      cYMax += 1;
    } else if (yMin === undefined && yMax === undefined) {
      const range = cYMax - cYMin;
      cYMin -= range * 0.1;
      cYMax += range * 0.1;
    }

    const tRange = Math.max(tMax - tMin, 0.05);
    const yRange = cYMax - cYMin;

    const visibleData = timeWindow ? data.filter((d) => d.t >= tMin) : data;

    const mapX = (t: number) => ((t - tMin) / tRange) * graphW;
    const mapY = (val: number) => graphH - ((val - cYMin) / yRange) * graphH;

    const pts = visibleData.map(
      (d, i) => `${i === 0 ? "M" : "L"} ${mapX(d.t).toFixed(2)},${mapY(d.val).toFixed(2)}`
    );

    // Area under path (soft gradient fill)
    let areaPathData = "";
    if (pts.length > 0) {
      const firstX = mapX(visibleData[0].t).toFixed(2);
      const lastX = mapX(visibleData[visibleData.length - 1].t).toFixed(2);
      const bottomY = graphH.toFixed(2);
      areaPathData = `${pts.join(" ")} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
    }

    const plottedPoints = visibleData.map((d) => ({ x: mapX(d.t), y: mapY(d.val) }));

    let regPath = "";
    if (regressionLine) {
      const regStartVal = regressionLine.intercept + regressionLine.slope * tMin;
      const regEndVal = regressionLine.intercept + regressionLine.slope * Math.max(tMax, tMin + 0.1);
      regPath = `M 0,${mapY(regStartVal).toFixed(2)} L ${graphW},${mapY(regEndVal).toFixed(2)}`;
    }

    // Generate clean intermediate ticks
    const yTickCount = 4;
    const yTicks = Array.from({ length: yTickCount + 1 }).map((_, i) => {
      const frac = i / yTickCount;
      const val = cYMin + frac * yRange;
      const y = graphH - frac * graphH;
      return { val, y };
    });

    const xTickCount = width < 450 ? 3 : 5;
    const xTicks = Array.from({ length: xTickCount }).map((_, i) => {
      const frac = i / (xTickCount - 1);
      const t = tMin + frac * tRange;
      const x = frac * graphW;
      return { t, x };
    });

    return {
      pathData: pts.join(" "),
      areaPathData,
      currentYMin: cYMin,
      currentYMax: cYMax,
      currentTMin: tMin,
      currentTMax: Math.max(tMax, tMin + 0.1),
      plottedPoints,
      regPath,
      yTicks,
      xTicks,
    };
  }, [data, graphW, graphH, timeWindow, yMin, yMax, regressionLine, width]);

  return (
    <svg width={width} height={height} className="bg-[#090d16] rounded-xl select-none">
      <defs>
        {/* Subtle Area Gradient Under Data Curve */}
        <linearGradient id={`line-area-grad-${instanceId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Outer Enclosure Frame */}
      <rect
        x="0.5"
        y="0.5"
        width={width - 1}
        height={height - 1}
        rx="10"
        fill="#090d16"
        stroke="#1e293b"
        strokeWidth="1"
      />

      <g transform={`translate(${padding.left}, ${padding.top})`}>
        {/* ── Precision Subtle Grid Lines ── */}
        {yTicks.map((tick, idx) => (
          <line
            key={`y-grid-${idx}`}
            x1={0}
            y1={tick.y}
            x2={graphW}
            y2={tick.y}
            stroke="rgba(148, 163, 184, 0.08)"
            strokeWidth={1}
          />
        ))}

        {xTicks.map((tick, idx) => (
          <line
            key={`x-grid-${idx}`}
            x1={tick.x}
            y1={0}
            x2={tick.x}
            y2={graphH}
            stroke="rgba(148, 163, 184, 0.08)"
            strokeWidth={1}
          />
        ))}

        {/* Center zero reference line if applicable */}
        {currentYMin < 0 && currentYMax > 0 && (
          <line
            x1={0}
            y1={graphH - ((0 - currentYMin) / (currentYMax - currentYMin)) * graphH}
            x2={graphW}
            y2={graphH - ((0 - currentYMin) / (currentYMax - currentYMin)) * graphH}
            stroke="rgba(56, 189, 248, 0.35)"
            strokeWidth={1.2}
            strokeDasharray="4 4"
          />
        )}

        {/* Main Axes */}
        <line x1={0} y1={graphH} x2={graphW} y2={graphH} stroke="#334155" strokeWidth={1.5} />
        <line x1={0} y1={0} x2={0} y2={graphH} stroke="#334155" strokeWidth={1.5} />

        {/* Soft Shaded Area Under Curve */}
        {drawLine && areaPathData && (
          <path d={areaPathData} fill={`url(#line-area-grad-${instanceId})`} />
        )}

        {/* Data Curve */}
        {drawLine && pathData && (
          <path
            d={pathData}
            fill="none"
            stroke={color}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Linear Regression Best-Fit Line (Amber Gold - never red) */}
        {regressionLine && regPath && (
          <path
            d={regPath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={2.2}
            strokeDasharray="5 5"
          />
        )}

        {/* Scatter Points with Dark Rings */}
        {drawPoints &&
          plottedPoints.map((pt, i) => (
            <circle
              key={`pt-${i}`}
              cx={pt.x}
              cy={pt.y}
              r={3.8}
              fill={color}
              stroke="#090d16"
              strokeWidth={1.2}
            />
          ))}

        {/* ── Y Axis Numeric Ticks & Label ── */}
        {yTicks.map((tick, idx) => (
          <text
            key={`y-label-${idx}`}
            x={-8}
            y={tick.y + 3.5}
            fill="rgba(148, 163, 184, 0.75)"
            fontSize={11}
            fontFamily="'JetBrains Mono', monospace"
            fontWeight="500"
            textAnchor="end"
          >
            {tick.val.toFixed(1)}
          </text>
        ))}

        {/* Y Axis Title */}
        <text
          x={-padding.left + 16}
          y={graphH / 2}
          fill="#94a3b8"
          fontSize={11}
          fontFamily="'JetBrains Mono', monospace"
          fontWeight="bold"
          textAnchor="middle"
          transform={`rotate(-90, ${-padding.left + 16}, ${graphH / 2})`}
        >
          {yLabel}
        </text>

        {/* ── X Axis Numeric Ticks & Label ── */}
        {xTicks.map((tick, idx) => (
          <text
            key={`x-label-${idx}`}
            x={tick.x}
            y={graphH + 18}
            fill="rgba(148, 163, 184, 0.75)"
            fontSize={11}
            fontFamily="'JetBrains Mono', monospace"
            fontWeight="500"
            textAnchor="middle"
          >
            {tick.t.toFixed(1)}
          </text>
        ))}

        {/* X Axis Title */}
        <text
          x={graphW / 2}
          y={graphH + 34}
          fill="#94a3b8"
          fontSize={11}
          fontFamily="'JetBrains Mono', monospace"
          fontWeight="bold"
          textAnchor="middle"
        >
          {xLabel}
        </text>
      </g>
    </svg>
  );
}
