"use client";

import React, { useMemo } from "react";

interface CartesianPlaneProps {
  width: number;
  height: number;
  /** Scale factor: how many pixels per unit */
  pixelsPerUnit?: number;
  /** Origin position in SVG pixels (from top-left). Defaults to center. */
  origin?: { x: number; y: number };
  showGrid?: boolean;
  showAxes?: boolean;
  children?: React.ReactNode;
}

/**
 * A reusable Cartesian coordinate system SVG.
 * Flips the Y axis so that positive Y is UP.
 * Translates the origin to the specified point (default center).
 */
export function CartesianPlane({
  width,
  height,
  pixelsPerUnit = 50,
  origin,
  showGrid = true,
  showAxes = true,
  children
}: CartesianPlaneProps) {
  const ox = origin ? origin.x : width / 2;
  const oy = origin ? origin.y : height / 2;

  const gridLines = useMemo(() => {
    if (!showGrid) return null;
    const lines = [];
    const ppu = pixelsPerUnit;

    // Vertical lines
    for (let x = ox % ppu; x <= width; x += ppu) {
      lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />);
    }
    // Horizontal lines
    for (let y = oy % ppu; y <= height; y += ppu) {
      lines.push(<line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />);
    }
    return lines;
  }, [width, height, ox, oy, pixelsPerUnit, showGrid]);

  return (
    <svg width={width} height={height} className="w-full h-full bg-transparent">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.3)" />
        </marker>
      </defs>

      {/* Grid */}
      {gridLines}

      {/* Axes */}
      {showAxes && (
        <g stroke="rgba(255,255,255,0.3)" strokeWidth={2}>
          {/* X Axis */}
          <line x1={0} y1={oy} x2={width} y2={oy} markerEnd="url(#arrow)" markerStart="url(#arrow)" />
          {/* Y Axis */}
          <line x1={ox} y1={height} x2={ox} y2={0} markerEnd="url(#arrow)" markerStart="url(#arrow)" />
          
          {/* Axis Labels */}
          <text x={width - 20} y={oy + 20} fill="rgba(255,255,255,0.5)" stroke="none" fontSize="12" fontFamily="sans-serif">X</text>
          <text x={ox + 10} y={20} fill="rgba(255,255,255,0.5)" stroke="none" fontSize="12" fontFamily="sans-serif">Y</text>
        </g>
      )}

      {/* 
        World Coordinates Group
        Translate to origin, then scale: 
        X is positive to the right (scale X = pixelsPerUnit)
        Y is positive UP (scale Y = -pixelsPerUnit) 
      */}
      <g transform={`translate(${ox}, ${oy}) scale(${pixelsPerUnit}, ${-pixelsPerUnit})`}>
        {/*
          IMPORTANT for children:
          Because we scale Y by a negative amount, text and strokes will be inverted/scaled.
          Elements inside here should either avoid relying on stroke-width (use vector-effect="non-scaling-stroke")
          and avoid text, OR they should counter-scale themselves.
        */}
        {children}
      </g>
    </svg>
  );
}
