"use client";

import React from "react";
import { SCIENTIFIC_THEME } from "./tokens";

export interface SvgPulleyProps {
  cx: number;
  cy: number;
  radius: number;
  rimFillId?: string;
  hubFillId?: string;
  showSpokes?: boolean;
  showRadiusLine?: boolean;
  className?: string;
}

export function SvgPulley({
  cx,
  cy,
  radius,
  rimFillId,
  hubFillId,
  showSpokes = true,
  showRadiusLine = false,
  className = "",
}: SvgPulleyProps) {
  const hubRadius = Math.max(6, radius * 0.22);

  return (
    <g className={className}>
      {/* Outer Rim Shadow Rim */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={rimFillId ? `url(#${rimFillId})` : "#64748b"}
        stroke="#1e293b"
        strokeWidth="3"
      />

      {/* Rope Groove Inner Ring */}
      <circle
        cx={cx}
        cy={cy}
        r={radius - 4}
        fill="none"
        stroke="#0f172a"
        strokeWidth="1.5"
        opacity="0.6"
      />

      {/* Spokes (Crossarms / Lightening Holes) */}
      {showSpokes && (
        <g stroke="#334155" strokeWidth="2.5" opacity="0.7">
          <line x1={cx - radius + 8} y1={cy} x2={cx + radius - 8} y2={cy} />
          <line x1={cx} y1={cy - radius + 8} x2={cx} y2={cy + radius - 8} />
          {/* 4 Lightening Circles */}
          {[0, 90, 180, 270].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const dist = radius * 0.55;
            return (
              <circle
                key={deg}
                cx={cx + dist * Math.cos(rad)}
                cy={cy + dist * Math.sin(rad)}
                r={radius * 0.16}
                fill="#0f172a"
                stroke="#475569"
                strokeWidth="1"
              />
            );
          })}
        </g>
      )}

      {/* Brass Center Hub / Bearing */}
      <circle
        cx={cx}
        cy={cy}
        r={hubRadius}
        fill={hubFillId ? `url(#${hubFillId})` : "#f59e0b"}
        stroke="#78350f"
        strokeWidth="1.5"
      />

      {/* Center Pivot Screw */}
      <circle cx={cx} cy={cy} r={hubRadius * 0.4} fill="#0f172a" />
      <circle cx={cx} cy={cy} r={hubRadius * 0.2} fill="#94a3b8" />

      {/* Optional Radius Measurement Guide */}
      {showRadiusLine && (
        <g>
          <line
            x1={cx}
            y1={cy}
            x2={cx + radius * 0.707}
            y2={cy - radius * 0.707}
            stroke={SCIENTIFIC_THEME.accents.red}
            strokeWidth="1.5"
            strokeDasharray="3,2"
          />
          <text
            x={cx + radius * 0.4}
            y={cy - radius * 0.4}
            fontSize="12"
            fill={SCIENTIFIC_THEME.accents.red}
            fontWeight="bold"
            fontFamily={SCIENTIFIC_THEME.typography.fontMono}
          >
            r
          </text>
        </g>
      )}
    </g>
  );
}

export interface SvgMassBlockProps {
  x: number; // Center X
  y: number; // Top of the block (excluding hanger)
  width: number;
  height: number;
  label: string;
  subLabel?: string;
  fillId?: string;
  baseColor?: string;
  showHanger?: boolean;
  className?: string;
}

export function SvgMassBlock({
  x,
  y,
  width,
  height,
  label,
  subLabel,
  fillId,
  baseColor = "#1e3a8a",
  showHanger = true,
  className = "",
}: SvgMassBlockProps) {
  const halfW = width / 2;

  return (
    <g className={className}>
      {/* Top Wire Eyelet / Hanger */}
      {showHanger && (
        <g>
          <ellipse
            cx={x}
            cy={y - 6}
            rx="5"
            ry="6"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          <rect x={x - 4} y={y - 2} width="8" height="4" fill="#475569" rx="1" />
        </g>
      )}

      {/* Main Cylinder/Block Body */}
      <rect
        x={x - halfW}
        y={y}
        width={width}
        height={height}
        rx="3"
        fill={fillId ? `url(#${fillId})` : baseColor}
        stroke="#475569"
        strokeWidth="1.5"
      />

      {/* Metallic Chamfer Highlights (Top and Bottom edge lines) */}
      <line
        x1={x - halfW + 2}
        y1={y + 2}
        x2={x + halfW - 2}
        y2={y + 2}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="1"
      />
      <line
        x1={x - halfW + 2}
        y1={y + height - 2}
        x2={x + halfW - 2}
        y2={y + height - 2}
        stroke="rgba(0,0,0,0.4)"
        strokeWidth="1"
      />

      {/* Mass Label */}
      <text
        x={x}
        y={y + height / 2 + (subLabel ? 0 : 4)}
        textAnchor="middle"
        fill="#ffffff"
        fontSize="12"
        fontWeight="bold"
        fontFamily={SCIENTIFIC_THEME.typography.fontMono}
      >
        {label}
      </text>

      {subLabel && (
        <text
          x={x}
          y={y + height / 2 + 12}
          textAnchor="middle"
          fill="rgba(255,255,255,0.8)"
          fontSize="9"
          fontFamily={SCIENTIFIC_THEME.typography.fontMono}
        >
          {subLabel}
        </text>
      )}
    </g>
  );
}

export interface SvgSlottedDiskProps {
  x: number; // Center X
  y: number; // Top Y
  width: number;
  height: number;
  label: string;
  fillId?: string;
  className?: string;
}

export function SvgSlottedDisk({
  x,
  y,
  width,
  height,
  label,
  fillId,
  className = "",
}: SvgSlottedDiskProps) {
  const halfW = width / 2;

  return (
    <g className={className}>
      {/* Slotted disk body */}
      <rect
        x={x - halfW}
        y={y}
        width={width}
        height={height}
        rx="2"
        fill={fillId ? `url(#${fillId})` : SCIENTIFIC_THEME.accents.red}
        stroke="#7f1d1d"
        strokeWidth="1"
      />
      {/* Slot groove on right */}
      <rect
        x={x + halfW - 6}
        y={y + 2}
        width="6"
        height={height - 4}
        fill="#0f172a"
        opacity="0.8"
      />
      {/* Label */}
      <text
        x={x - 2}
        y={y + height - 3}
        textAnchor="middle"
        fill="#ffffff"
        fontSize="9"
        fontWeight="bold"
        fontFamily={SCIENTIFIC_THEME.typography.fontMono}
      >
        {label}
      </text>
    </g>
  );
}

export interface SvgMechanicalClampProps {
  x: number;
  y: number;
  retracted?: boolean;
  className?: string;
}

export function SvgMechanicalClamp({
  x,
  y,
  retracted = false,
  className = "",
}: SvgMechanicalClampProps) {
  const plungerOffset = retracted ? 24 : 8;

  return (
    <g className={className} transform={`translate(${x}, ${y})`}>
      {/* Base mounting bracket */}
      <rect x="25" y="-14" width="28" height="28" fill="#1e293b" stroke="#475569" rx="2" />
      {/* Guide sleeve */}
      <rect x="10" y="-8" width="18" height="16" fill="#334155" stroke="#64748b" rx="1" />

      {/* Retractable Plunger Head */}
      <g
        transform={`translate(${plungerOffset}, 0)`}
        style={{ transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
      >
        <line x1="-10" y1="0" x2="10" y2="0" stroke="#cbd5e1" strokeWidth="4" />
        <path
          d="M -10 -8 L 0 0 L -10 8 Z"
          fill={SCIENTIFIC_THEME.accents.yellow}
          stroke="#b45309"
          strokeWidth="1"
        />
      </g>
    </g>
  );
}
