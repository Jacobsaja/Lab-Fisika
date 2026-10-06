"use client";

import React, { useState, useRef, useEffect } from "react";
import { LineGraph, DataPoint } from "./LineGraph";
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

export function BrushableLineGraph({
  data,
  width,
  height,
  color,
  xLabel,
  yLabel,
  onSelectionChange
}: BrushableLineGraphProps) {
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const graphW = width - padding.left - padding.right;
  const graphH = height - padding.top - padding.bottom;

  const [brushStart, setBrushStart] = useState<number | null>(null);
  const [brushEnd, setBrushEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const tMin = data.length > 0 ? data[0].t : 0;
  const tMax = data.length > 0 ? data[data.length - 1].t : 1;

  const getTFromMouse = (e: React.PointerEvent<SVGSVGElement> | React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - padding.left;
    const px = Math.max(0, Math.min(x, graphW));
    const ratio = px / graphW;
    return tMin + ratio * (tMax - tMin);
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
    selectedData = data.filter(d => d.t >= actualStart && d.t <= actualEnd);
    if (selectedData.length >= 3) { // Require at least 3 points for meaningful regression
      const reg = calculateLinearRegression(selectedData.map(d => ({ x: d.t, y: d.val })));
      slope = reg.b;
      regressionLine = { slope: reg.b, intercept: reg.a };
    }
  }

  // Notify parent on change
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedData, slope);
    }
  }, [actualStart, actualEnd, data, onSelectionChange]);

  const overlayX = actualStart !== null ? padding.left + ((actualStart - tMin) / (tMax - tMin)) * graphW : 0;
  const overlayW = actualStart !== null && actualEnd !== null ? ((actualEnd - actualStart) / (tMax - tMin)) * graphW : 0;

  return (
    <div className="relative" style={{ width, height, userSelect: "none", touchAction: "none" }}>
      <div className="absolute inset-0 pointer-events-none">
        <LineGraph 
          data={data} width={width} height={height} color={color} xLabel={xLabel} yLabel={yLabel}
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
        {actualStart !== null && overlayW > 0 && (
          <rect 
            x={overlayX} 
            y={padding.top} 
            width={overlayW} 
            height={graphH} 
            fill="rgba(59, 130, 246, 0.2)" 
            stroke="rgba(59, 130, 246, 0.5)" 
            strokeWidth="1"
            pointerEvents="none"
          />
        )}
      </svg>
    </div>
  );
}
