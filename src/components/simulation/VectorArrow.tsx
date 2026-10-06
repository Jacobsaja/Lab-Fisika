"use client";

import React from "react";
import { Vector2 } from "@/physics/core";

interface VectorArrowProps {
  /** Tail position in SVG coordinates */
  from: Vector2;
  /** Arrow delta in SVG pixels (already y-flipped) */
  delta: Vector2;
  color: string;
  label?: string;
  /** Optional subscript appended to the label (e.g. "c" for a_c) */
  labelSubscript?: string;
  strokeWidth?: number;
  headSize?: number;
}

/**
 * Self-contained SVG vector arrow (no <marker> ids, so multiple instances
 * never collide). Renders nothing for zero-length vectors.
 */
export function VectorArrow({ from, delta, color, label, labelSubscript, strokeWidth = 3, headSize = 10 }: VectorArrowProps) {
  const length = Math.hypot(delta.x, delta.y);
  if (length < 1) return null;

  const ux = delta.x / length;
  const uy = delta.y / length;
  const tip = { x: from.x + delta.x, y: from.y + delta.y };
  const head = Math.min(headSize, length * 0.6);
  const base = { x: tip.x - ux * head, y: tip.y - uy * head };
  // Perpendicular for the arrowhead wings
  const px = -uy * head * 0.55;
  const py = ux * head * 0.55;
  const labelPos = { x: tip.x + ux * 14, y: tip.y + uy * 14 };

  return (
    <g pointerEvents="none">
      <line
        x1={from.x}
        y1={from.y}
        x2={base.x}
        y2={base.y}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      <polygon
        points={`${tip.x},${tip.y} ${base.x + px},${base.y + py} ${base.x - px},${base.y - py}`}
        fill={color}
      />
      {label && (
        <text
          x={labelPos.x}
          y={labelPos.y}
          fill={color}
          fontSize={15}
          fontWeight={700}
          fontFamily="'JetBrains Mono', monospace"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {label}
          {labelSubscript && (
            <tspan baselineShift="sub" fontSize={11}>
              {labelSubscript}
            </tspan>
          )}
        </text>
      )}
    </g>
  );
}
