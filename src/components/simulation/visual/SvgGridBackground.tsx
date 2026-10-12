"use client";

import React, { useId } from "react";
import { SCIENTIFIC_THEME } from "./tokens";

export interface SvgGridBackgroundProps {
  width: number;
  height: number;
  gridSize?: number;
  patternType?: "lines" | "dots";
  opacity?: number;
}

export function SvgGridBackground({
  width,
  height,
  gridSize = 40,
  patternType = "lines",
  opacity = 0.5,
}: SvgGridBackgroundProps) {
  const reactId = useId().replace(/[:]/g, "_");
  const patternId = `grid_${reactId}`;

  return (
    <g opacity={opacity} pointerEvents="none">
      <defs>
        {patternType === "lines" ? (
          <pattern
            id={patternId}
            width={gridSize}
            height={gridSize}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
              fill="none"
              stroke={SCIENTIFIC_THEME.gridColor}
              strokeWidth="1"
            />
          </pattern>
        ) : (
          <pattern
            id={patternId}
            width={gridSize}
            height={gridSize}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx={gridSize / 2}
              cy={gridSize / 2}
              r="1"
              fill={SCIENTIFIC_THEME.gridDot}
            />
          </pattern>
        )}
      </defs>

      <rect width={width} height={height} fill={`url(#${patternId})`} />
    </g>
  );
}
