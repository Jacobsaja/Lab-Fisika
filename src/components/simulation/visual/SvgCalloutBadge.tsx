"use client";

import React from "react";
import { SCIENTIFIC_THEME } from "./tokens";

export interface SvgCalloutBadgeProps {
  label: string;
  subLabel?: string;
  targetX: number;
  targetY: number;
  badgeX: number;
  badgeY: number;
  color?: string;
  accentBg?: string;
  showPointerLine?: boolean;
  shape?: "pill" | "circle";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function SvgCalloutBadge({
  label,
  subLabel,
  targetX,
  targetY,
  badgeX,
  badgeY,
  color = SCIENTIFIC_THEME.accents.cyan,
  accentBg = "rgba(15, 23, 42, 0.9)",
  showPointerLine = true,
  shape = "pill",
  size = "md",
  className = "",
}: SvgCalloutBadgeProps) {
  const isCircle = shape === "circle" && !subLabel;
  const height = size === "sm" ? 20 : size === "lg" ? 28 : 24;
  const radius = height / 2;
  const minWidth = isCircle ? height : size === "sm" ? 36 : size === "lg" ? 64 : 52;

  // Approximate width calculation based on text length
  const textLen = label.length + (subLabel ? subLabel.length + 1 : 0);
  const pillWidth = Math.max(minWidth, textLen * (size === "sm" ? 6.5 : 8) + 16);

  return (
    <g className={className}>
      {/* Target Crosshair / Pointer Target Point */}
      <circle cx={targetX} cy={targetY} r="3" fill={color} />
      <circle cx={targetX} cy={targetY} r="6" fill="none" stroke={color} strokeWidth="1" strokeDasharray="2,2" opacity="0.6" />

      {/* Pointer Line */}
      {showPointerLine && (
        <line
          x1={targetX}
          y1={targetY}
          x2={badgeX}
          y2={badgeY}
          stroke={color}
          strokeWidth="1.2"
          strokeDasharray="3,3"
          opacity="0.8"
        />
      )}

      {/* Badge Container */}
      <g transform={`translate(${badgeX}, ${badgeY})`}>
        {isCircle ? (
          <circle
            cx="0"
            cy="0"
            r={radius}
            fill={accentBg}
            stroke={color}
            strokeWidth="1.5"
          />
        ) : (
          <rect
            x={-pillWidth / 2}
            y={-height / 2}
            width={pillWidth}
            height={height}
            rx={radius}
            fill={accentBg}
            stroke={color}
            strokeWidth="1.5"
          />
        )}

        {/* Text */}
        <text
          x="0"
          y={size === "sm" ? 3.5 : 4}
          fill="#ffffff"
          fontSize={size === "sm" ? "10" : size === "lg" ? "13" : "11"}
          fontWeight="bold"
          fontFamily={SCIENTIFIC_THEME.typography.fontMono}
          textAnchor="middle"
        >
          {label}
          {subLabel && (
            <tspan fill={color} fontSize="9" fontWeight="normal" dx="4">
              {subLabel}
            </tspan>
          )}
        </text>
      </g>
    </g>
  );
}
