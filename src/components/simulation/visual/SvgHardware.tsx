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

export interface SvgElectromagnetProps {
  x: number;
  y: number;
  armed: boolean;
  coilFillId?: string;
  chassisFillId?: string;
  isDragging?: boolean;
  disabled?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  className?: string;
}

export function SvgElectromagnet({
  x,
  y,
  armed,
  coilFillId,
  chassisFillId,
  isDragging = false,
  disabled = false,
  onPointerDown,
  className = "",
}: SvgElectromagnetProps) {
  return (
    <g
      transform={`translate(${x}, ${y})`}
      onPointerDown={onPointerDown}
      className={`${
        disabled
          ? "cursor-not-allowed"
          : isDragging
            ? "cursor-grabbing"
            : "cursor-grab"
      } ${className}`}
    >
      {/* Precision Height Alignment Pointer (points directly to physical magnetY) */}
      <g pointerEvents="none">
        <line
          x1="-45"
          y1="0"
          x2="-5"
          y2="0"
          stroke={SCIENTIFIC_THEME.accents.red}
          strokeWidth="1.8"
          strokeDasharray="4 2"
        />
        <polygon points="-45,0 -35,-4.5 -35,4.5" fill={SCIENTIFIC_THEME.accents.red} />
      </g>

      {/* Main Bracket Clamped to Mast */}
      <rect
        x="0"
        y="-18"
        width="86"
        height="36"
        rx="3"
        fill={chassisFillId ? `url(#${chassisFillId})` : "#0f172a"}
        stroke="#475569"
        strokeWidth="1.2"
      />

      {/* Copper Solenoid Coil Cylinder */}
      <rect
        x="-14"
        y="-8"
        width="14"
        height="16"
        rx="2"
        fill={coilFillId ? `url(#${coilFillId})` : "#ea580c"}
        stroke="#7c2d12"
        strokeWidth="1"
      />
      {/* Winding highlight ridges */}
      <line x1="-12" y1="-3" x2="-2" y2="-3" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      <line x1="-12" y1="2" x2="-2" y2="2" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />

      {/* Soft Iron Core Tip (facing downward to hold the ball) */}
      <rect x="-10" y="8" width="10" height="6" fill="#64748b" stroke="#334155" strokeWidth="1" rx="1" />

      {/* Status LED & Bezel */}
      <circle cx="68" cy="0" r="6" fill="#0f172a" stroke="#334155" strokeWidth="1" />
      <circle
        cx="68"
        cy="0"
        r="4"
        fill={armed ? "#10b981" : "#ef4444"}
      />

      {/* Label & Drag Indicator Lines */}
      <text
        x="24"
        y="4"
        fontSize="10"
        fill="#ffffff"
        fontWeight="bold"
        fontFamily={SCIENTIFIC_THEME.typography.fontMono}
        letterSpacing="1"
        pointerEvents="none"
      >
        MAGNET
      </text>

      {/* Drag Grip Texture */}
      <g stroke="#64748b" strokeWidth="1" opacity="0.6">
        <line x1="5" y1="-10" x2="15" y2="-10" />
        <line x1="5" y1="10" x2="15" y2="10" />
      </g>
    </g>
  );
}

export interface SvgContactPlateProps {
  x: number;
  y: number;
  width?: number;
  brassFillId?: string;
  chassisFillId?: string;
  className?: string;
}

export function SvgContactPlate({
  x,
  y,
  width = 130,
  brassFillId,
  chassisFillId,
  className = "",
}: SvgContactPlateProps) {
  const halfW = width / 2;

  return (
    <g className={className}>
      {/* Heavy Base Footing */}
      <rect
        x={x - halfW - 25}
        y={y + 18}
        width={width + 50}
        height="26"
        rx="3"
        fill={chassisFillId ? `url(#${chassisFillId})` : "#0f172a"}
        stroke="#334155"
        strokeWidth="1.5"
      />
      {/* Leveling Screws */}
      <circle cx={x - halfW - 15} cy={y + 36} r="7" fill="#475569" stroke="#0f172a" strokeWidth="1.5" />
      <circle cx={x + halfW + 15} cy={y + 36} r="7" fill="#475569" stroke="#0f172a" strokeWidth="1.5" />

      {/* Contact Plate Frame */}
      <rect
        x={x - halfW}
        y={y}
        width={width}
        height="18"
        rx="2"
        fill={chassisFillId ? `url(#${chassisFillId})` : "#1e293b"}
        stroke="#475569"
        strokeWidth="1.2"
      />

      {/* Solid Brass Contact Pad (where the sphere strikes to trigger timer stop) */}
      <rect
        x={x - halfW + 16}
        y={y - 5}
        width={width - 32}
        height="6"
        rx="1"
        fill={brassFillId ? `url(#${brassFillId})` : "#f59e0b"}
        stroke="#b45309"
        strokeWidth="1"
      />

      {/* Contact Sensor LED */}
      <circle cx={x - halfW + 8} cy={y + 9} r="2.5" fill="#10b981" />
      <circle cx={x + halfW - 8} cy={y + 9} r="2.5" fill="#10b981" />
    </g>
  );
}

export interface SvgMetalBallProps {
  cx: number;
  cy: number;
  r: number;
  fillId?: string;
  baseColor?: string;
  className?: string;
}

export const SvgMetalBall = React.forwardRef<SVGCircleElement, SvgMetalBallProps>(
  ({ cx, cy, r, fillId, baseColor = "#cbd5e1", className = "" }, ref) => {
    // Pure radial gradient / clean fill, strictly zero SVG filters for 60 FPS
    return (
      <circle
        ref={ref}
        cx={cx}
        cy={cy}
        r={r}
        fill={fillId ? `url(#${fillId})` : baseColor}
        stroke="#1e293b"
        strokeWidth="1.2"
        className={className}
      />
    );
  }
);
SvgMetalBall.displayName = "SvgMetalBall";

export interface SvgRollingCylinderProps {
  x: number;
  y: number;
  r: number;
  rInner?: number;
  shape: "solid" | "hollow" | "block";
  rotationRad: number;
  fillColor?: string;
  rimFillId?: string;
  className?: string;
}

export function SvgRollingCylinder({
  x,
  y,
  r,
  rInner = 0,
  shape,
  rotationRad,
  fillColor = "#38bdf8",
  rimFillId,
  className = "",
}: SvgRollingCylinderProps) {
  const deg = (rotationRad * 180) / Math.PI;

  return (
    <g transform={`translate(${x}, ${y})`} className={className}>
      {shape === "block" ? (
        <rect
          x={-r}
          y={-r}
          width={r * 2}
          height={r * 2}
          rx="2"
          fill={fillColor}
          stroke="#0f172a"
          strokeWidth="1.5"
        />
      ) : shape === "hollow" ? (
        <g transform={`rotate(${deg})`}>
          {/*
            Hollow Cylinder: Outer circle with inner hole using evenodd rule.
            The hollow interior is truly transparent, exposing background grid!
          */}
          <path
            d={`
              M 0 ${-r}
              A ${r} ${r} 0 1 0 0 ${r}
              A ${r} ${r} 0 1 0 0 ${-r}
              Z
              M 0 ${-rInner}
              A ${rInner} ${rInner} 0 1 1 0 ${rInner}
              A ${rInner} ${rInner} 0 1 1 0 ${-rInner}
              Z
            `}
            fillRule="evenodd"
            fill={rimFillId ? `url(#${rimFillId})` : fillColor}
            stroke="#0f172a"
            strokeWidth="1.5"
          />

          {/* 4 Rotation Spoke / Index Ribs connecting outer rim to inner tube */}
          <line x1={-r} y1="0" x2={-rInner} y2="0" stroke="#0f172a" strokeWidth="2.5" />
          <line x1={r} y1="0" x2={rInner} y2="0" stroke="#0f172a" strokeWidth="2.5" />
          <line x1="0" y1={-r} x2="0" y2={-rInner} stroke="#0f172a" strokeWidth="2.5" />
          <line x1="0" y1={r} x2="0" y2={rInner} stroke="#0f172a" strokeWidth="2.5" />

          {/* Alignment alignment dots on rim */}
          <circle cx={-r * 0.8} cy="0" r="1.5" fill="#ffffff" />
          <circle cx={r * 0.8} cy="0" r="1.5" fill="#ffffff" />
        </g>
      ) : (
        /* Solid Cylinder with rotating crosshairs and perimeter index notch */
        <g transform={`rotate(${deg})`}>
          <circle
            cx="0"
            cy="0"
            r={r}
            fill={rimFillId ? `url(#${rimFillId})` : fillColor}
            stroke="#0f172a"
            strokeWidth="1.5"
          />
          {/* Subtle Chamfer Rim */}
          <circle cx="0" cy="0" r={r - 3} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />

          {/* Rotating Crosshair Stripes */}
          <line x1={-r + 2} y1="0" x2={r - 2} y2="0" stroke="#0f172a" strokeWidth="2" />
          <line x1="0" y1={-r + 2} x2="0" y2={r - 2} stroke="#0f172a" strokeWidth="2" />

          {/* High-visibility rolling index dot at top perimeter */}
          <circle cx="0" cy={-r + 6} r="3" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
        </g>
      )}
    </g>
  );
}

