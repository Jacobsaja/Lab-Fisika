/**
 * Pure SVG geometry helpers for world (y-up) ↔ SVG (y-down) mapping.
 * Reusable by any 2D simulation view (circular motion, rolling motion, ...).
 */

import { Vector2 } from "@/physics/core";

export interface ViewTransform {
  /** SVG position of the world origin */
  originX: number;
  originY: number;
  /** Pixels per world unit (meter) */
  scale: number;
}

/** Maps a world point (y-up) to SVG coordinates (y-down). */
export function worldToSvg(p: Vector2, view: ViewTransform): Vector2 {
  return { x: view.originX + p.x * view.scale, y: view.originY - p.y * view.scale };
}

/** Maps a world vector/direction (no translation) to an SVG delta. */
export function worldDeltaToSvg(v: Vector2, scale: number): Vector2 {
  return { x: v.x * scale, y: -v.y * scale };
}

/**
 * SVG path for an arc of radius `radius` (px) around `center` (SVG coords),
 * from world angle `start` to `end` (radians, CCW positive in world space).
 */
export function arcPath(center: Vector2, radius: number, start: number, end: number): string {
  const sweep = end - start;
  if (radius <= 0 || Math.abs(sweep) < 1e-6) return "";
  // Clamp to just below a full turn so the arc remains drawable.
  const clamped = Math.sign(sweep) * Math.min(Math.abs(sweep), 2 * Math.PI - 1e-4);
  const endAngle = start + clamped;
  const sx = center.x + radius * Math.cos(start);
  const sy = center.y - radius * Math.sin(start);
  const ex = center.x + radius * Math.cos(endAngle);
  const ey = center.y - radius * Math.sin(endAngle);
  const largeArc = Math.abs(clamped) > Math.PI ? 1 : 0;
  // World CCW (positive) = SVG counter-clockwise = sweep-flag 0.
  const sweepFlag = clamped > 0 ? 0 : 1;
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} ${sweepFlag} ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}

/**
 * Scales a vector magnitude into a drawable pixel length:
 * linear up to `maxLength`, never shorter than `minLength` when non-zero.
 */
export function clampVectorLength(magnitude: number, pxPerUnit: number, minLength: number, maxLength: number): number {
  if (magnitude <= 0 || !Number.isFinite(magnitude)) return 0;
  return Math.min(maxLength, Math.max(minLength, magnitude * pxPerUnit));
}
