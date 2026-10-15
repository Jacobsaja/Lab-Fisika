"use client";

import React, { useState, useRef, useEffect } from "react";
import { LineGraph, DataPoint } from "./LineGraph";
import { SCIENTIFIC_THEME } from "./visual/tokens";
import { calculateLinearRegression } from "@/physics/regression";

interface BrushableLineGraphProps {
  data: DataPoint[];
  width: number;
  height: number;
  color?: string;
  xLabel?: string;
  yLabel?: string;
  onSelectionChange?: (selectedData: DataPoint[], slope: number | null) => void;
}

/**
 * Pure mapping function from relative pixel offset within graph area to time t.
 */
export function mapPixelToTime(px: number, graphW: number, tMin: number, tMax: number): number {
  if (graphW <= 0) return tMin;
  const clampedPx = Math.max(0, Math.min(px, graphW));
  const ratio = clampedPx / graphW;
  return tMin + ratio * (tMax - tMin);
}

/**
 * Pure inverse mapping function from time t to pixel offset within graph area.
 */
export function mapTimeToPixel(t: number, graphW: number, tMin: number, tMax: number): number {
  const tRange = Math.max(tMax - tMin, 1e-6);
  const clampedT = Math.max(tMin, Math.min(t, tMax));
  return ((clampedT - tMin) / tRange) * graphW;
}

export function BrushableLineGraph({
  data,
  width,
  height,
  color = SCIENTIFIC_THEME.vectors.position,
  xLabel,
  yLabel,
  onSelectionChange,
}: BrushableLineGraphProps) {
  // Matched padding with LineGraph
  const padding = { top: 24, right: 24, bottom: 44, left: 60 };
  const graphW = Math.max(0, width - padding.left - padding.right);
  const graphH = Math.max(0, height - padding.top - padding.bottom);

  const [brushStart, setBrushStart] = useState<number | null>(null);
  const [brushEnd, setBrushEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const tMin = data.length > 0 ? data[0].t : 0;
  const tMax = data.length > 0 ? data[data.length - 1].t : 1;

  const getTFromMouse = (e: React.PointerEvent<SVGSVGElement> | React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || graphW <= 0) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - padding.left;
    return mapPixelToTime(x, graphW, tMin, tMax);
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (data.length === 0) return;
    const t = getTFromMouse(e);
    setBrushStart(t);
    setBrushEnd(t);
    setIsDragging(true);
    if (e.target instanceof Element) e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setBrushEnd(getTFromMouse(e));
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    if (e.target instanceof Element) e.target.releasePointerCapture(e.pointerId);
  };

  const actualStart = brushStart !== null && brushEnd !== null ? Math.min(brushStart, brushEnd) : null;
  const actualEnd = brushStart !== null && brushEnd !== null ? Math.max(brushStart, brushEnd) : null;

  let selectedData: DataPoint[] = [];
  let regressionLine = undefined;
  let slope: number | null = null;

  if (actualStart !== null && actualEnd !== null) {
    selectedData = data.filter((d) => d.t >= actualStart && d.t <= actualEnd);
    if (selectedData.length >= 3) {
      // Require at least 3 points for meaningful linear regression
      const reg = calculateLinearRegression(selectedData.map((d) => ({ x: d.t, y: d.val })));
      slope = reg.b;
      regressionLine = { slope: reg.b, intercept: reg.a };
    }
  }

  // Permanent rule: isolate callback prop with useRef
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  useEffect(() => {
    onSelectionChangeRef.current?.(selectedData, slope);
  }, [actualStart, actualEnd, data, slope]);

  const tRange = Math.max(tMax - tMin, 0.05);
  const overlayX = actualStart !== null ? padding.left + ((actualStart - tMin) / tRange) * graphW : 0;
  const overlayW = actualStart !== null && actualEnd !== null ? ((actualEnd - actualStart) / tRange) * graphW : 0;

  return (
    <div className="relative" style={{ width, height, userSelect: "none", touchAction: "none" }}>
      <div className="absolute inset-0 pointer-events-none">
        <LineGraph
          data={data}
          width={width}
          height={height}
          color={color}
          xLabel={xLabel}
          yLabel={yLabel}
          regressionLine={regressionLine}
        />
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="absolute inset-0 cursor-crosshair z-10"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {actualStart !== null && actualEnd !== null && overlayW > 2 && (
          <g pointerEvents="none">
            {/* Luminous Brush Selection Box */}
            <rect
              x={overlayX}
              y={padding.top}
              width={overlayW}
              height={graphH}
              fill="rgba(56, 189, 248, 0.16)"
              stroke="rgba(56, 189, 248, 0.35)"
              strokeWidth="1"
            />

            {/* Left Boundary Line */}
            <line
              x1={overlayX}
              y1={padding.top}
              x2={overlayX}
              y2={padding.top + graphH}
              stroke="#38bdf8"
              strokeWidth="2"
            />
            {/* Left Pill Grip Handle */}
            <rect
              x={overlayX - 3}
              y={padding.top + graphH / 2 - 14}
              width="6"
              height="28"
              rx="3"
              fill="#38bdf8"
              stroke="#0f172a"
              strokeWidth="1"
            />

            {/* Right Boundary Line */}
            <line
              x1={overlayX + overlayW}
              y1={padding.top}
              x2={overlayX + overlayW}
              y2={padding.top + graphH}
              stroke="#38bdf8"
              strokeWidth="2"
            />
            {/* Right Pill Grip Handle */}
            <rect
              x={overlayX + overlayW - 3}
              y={padding.top + graphH / 2 - 14}
              width="6"
              height="28"
              rx="3"
              fill="#38bdf8"
              stroke="#0f172a"
              strokeWidth="1"
            />

            {/* Top Selection Info Badge */}
            <g transform={`translate(${overlayX + overlayW / 2}, ${padding.top - 12})`}>
              <rect
                x="-36"
                y="-9"
                width="72"
                height="18"
                rx="4"
                fill="#0f172a"
                stroke="#38bdf8"
                strokeWidth="0.8"
              />
              <text
                x="0"
                y="3.5"
                fill="#38bdf8"
                fontSize="9"
                fontFamily="'JetBrains Mono', monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                Δt={(actualEnd - actualStart).toFixed(2)}s
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
