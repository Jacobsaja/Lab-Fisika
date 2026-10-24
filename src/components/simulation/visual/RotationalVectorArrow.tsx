"use client";

import React from "react";
import { SvgCalloutBadge } from "./SvgCalloutBadge";
import { SCIENTIFIC_THEME } from "./tokens";

export interface RotationalVectorArrowProps {
  id?: string;
  /** Center of rotation in SVG coordinates */
  center: { x: number; y: number };
  /** Radius of the curved arc from center in pixels */
  radius: number;
  /** Rotational direction: "cw" (clockwise) or "ccw" (counter-clockwise) */
  direction?: "cw" | "ccw";
  /** Physical magnitude value (e.g. angular velocity in rad/s, angular acceleration in rad/s²) */
  value: number;
  /** Primary label symbol, e.g. "ω" or "α" */
  label: string;
  /** Category color token */
  color: string;
  /** Base arc span in degrees (default 65°) */
  arcSpanDeg?: number;
  /** Start angle in degrees in SVG coordinates (0 = right, 90 = down). Default -135° (top-left) */
  startAngleDeg?: number;
  /** Optional custom angle for badge position in degrees */
  badgeAngleDeg?: number;
  /** Scale factor from user slider (default 1.0) */
  userScale?: number;
  /** Stroke width in pixels (default 3) */
  strokeWidth?: number;
  /** Arrowhead size in pixels (default 9) */
  headSize?: number;
  /** Whether to show formatted numerical value in badge */
  showValue?: boolean;
  /** Formatted numerical value text (e.g. "12.4 rad/s") */
  valueText?: string;
  /** Minimum threshold below which arrow is not rendered (default 1e-4) */
  minThreshold?: number;
  /** Dashed stroke styling */
  dashed?: boolean;
  strokeDasharray?: string;
  className?: string;
}

/**
 * Reusable SVG component for physical rotational vector arrows (Angular Velocity ω, Angular Acceleration α).
 * - Curved circular arc matching standard physics rotational representation.
 * - Tangential arrowhead oriented strictly along rotation direction (CW/CCW).
 * - SvgCalloutBadge integration with zero-filter performance compliance.
 */
export const RotationalVectorArrow = React.memo(function RotationalVectorArrow({
  id,
  center,
  radius,
  direction = "cw",
  value,
  label,
  color,
  arcSpanDeg = 65,
  startAngleDeg = -135,
  badgeAngleDeg,
  userScale = 1.0,
  strokeWidth = 3,
  headSize = 9,
  showValue = false,
  valueText,
  minThreshold = 1e-4,
  dashed = false,
  strokeDasharray,
  className = "",
}: RotationalVectorArrowProps) {
  const mag = Math.abs(value);
  if (mag < minThreshold || radius <= 0) {
    return null;
  }

  const isCW = direction === "cw";
  // Scale arc span with user scale, clamped between 30° and 135°
  const effectiveSpanDeg = Math.min(135, Math.max(30, arcSpanDeg * Math.min(1.5, Math.max(0.7, userScale))));
  const spanRad = (effectiveSpanDeg * Math.PI) / 180;
  const startRad = (startAngleDeg * Math.PI) / 180;
  
  // In SVG coordinates (+y down), increasing angle moves CLOCKWISE.
  const endRad = isCW ? startRad + spanRad : startRad - spanRad;

  // Start point
  const sx = center.x + radius * Math.cos(startRad);
  const sy = center.y + radius * Math.sin(startRad);

  // Tip point
  const tipX = center.x + radius * Math.cos(endRad);
  const tipY = center.y + radius * Math.sin(endRad);

  // Unit tangent vector at the tip point along rotation direction
  // Derivative of (cos t, sin t) is (-sin t, cos t) which points clockwise (+angle).
  const tangentX = isCW ? -Math.sin(endRad) : Math.sin(endRad);
  const tangentY = isCW ? Math.cos(endRad) : -Math.cos(endRad);

  // Base of the arrowhead
  const actualHead = Math.min(headSize, radius * 0.5);
  const baseX = tipX - tangentX * actualHead;
  const baseY = tipY - tangentY * actualHead;

  // Arrowhead wings (perpendicular)
  const wingNormX = -tangentY * (actualHead * 0.55);
  const wingNormY = tangentX * (actualHead * 0.55);

  const wing1X = baseX + wingNormX;
  const wing1Y = baseY + wingNormY;
  const wing2X = baseX - wingNormX;
  const wing2Y = baseY - wingNormY;

  // Angle for badge chip positioning
  const midRad = isCW ? startRad + spanRad * 0.5 : startRad - spanRad * 0.5;
  const badgeRad = badgeAngleDeg !== undefined ? (badgeAngleDeg * Math.PI) / 180 : midRad;
  const badgeTargetX = center.x + radius * Math.cos(badgeRad);
  const badgeTargetY = center.y + radius * Math.sin(badgeRad);
  
  // Offset badge slightly outwards from arc radius so it floats cleanly above the curve
  const badgeDistance = radius + 15;
  const badgeX = center.x + badgeDistance * Math.cos(badgeRad);
  const badgeY = center.y + badgeDistance * Math.sin(badgeRad);

  const largeArc = spanRad > Math.PI ? 1 : 0;
  const sweepFlag = isCW ? 1 : 0;

  // Arc path ending at the base of the arrowhead
  const arcD = `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 ${largeArc} ${sweepFlag} ${baseX.toFixed(2)} ${baseY.toFixed(2)}`;

  const subLabel = showValue && valueText ? valueText : undefined;

  return (
    <g id={id} className={className} pointerEvents="none" aria-label={`Vektor Rotasi ${label}`}>
      {/* Rotational Arc Path */}
      <path
        d={arcD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={strokeDasharray ?? (dashed ? "4 3" : undefined)}
      />

      {/* Tangential Arrowhead */}
      <polygon
        points={`${tipX.toFixed(2)},${tipY.toFixed(2)} ${wing1X.toFixed(2)},${wing1Y.toFixed(2)} ${wing2X.toFixed(2)},${wing2Y.toFixed(2)}`}
        fill={color}
      />

      {/* Callout Badge Chip */}
      <SvgCalloutBadge
        label={label}
        subLabel={subLabel}
        targetX={badgeTargetX}
        targetY={badgeTargetY}
        badgeX={badgeX}
        badgeY={badgeY}
        color={color}
        showPointerLine={false}
        size="sm"
      />
    </g>
  );
});
