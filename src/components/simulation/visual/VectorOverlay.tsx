"use client";

import React, { useId } from "react";
import { VectorArrow } from "@/components/simulation/VectorArrow";
import { SvgCalloutBadge } from "./SvgCalloutBadge";

export interface VectorItem {
  id: string;
  category: "velocity" | "momentum" | "momentumTotal" | string;
  label: string; // e.g. "vA", "pA", "Σp"
  subLabel?: string;
  /** Origin point (x, y) in SVG coordinates */
  origin: { x: number; y: number };
  /** 2D components in physical units (e.g. m/s or kg·m/s) */
  components: { dx: number; dy: number };
  color: string;
  /** Whether to display numerical value (true in Explore, false in Practicum) */
  showValue?: boolean;
  /** Formatted numerical value e.g. "0.40 m/s" */
  valueText?: string;
  /** Specific custom scale for this vector item (pixels per physical unit) */
  scale?: number;
}

export interface VectorOverlayProps {
  vectors: VectorItem[];
  /** Default scale factor (pixels per unit) */
  defaultScale?: number;
  /** Global user scale multiplier from slider (default 1.0) */
  userScale?: number;
  /** Maximum arrow pixel length to prevent extending beyond track/canvas */
  maxArrowLength?: number;
  /** Minimum threshold below which vector is considered zero and not rendered */
  minThreshold?: number;
  /** Global override for displaying values */
  showValues?: boolean;
  className?: string;
}

/**
 * Reusable SVG overlay for physical vector arrows and callout badges.
 * - Zero-filter rendering on animated arrows (strict 60 FPS compliance).
 * - Vectors below threshold are hidden (no stubs).
 * - Arrow lengths clamped to maxArrowLength.
 * - Unique SVG element IDs via useId.
 */
export function VectorOverlay({
  vectors,
  defaultScale = 100,
  userScale = 1.0,
  maxArrowLength = 150,
  minThreshold = 1e-4,
  showValues = true,
  className = "",
}: VectorOverlayProps) {
  const baseId = useId().replace(/[:]/g, "_");

  return (
    <g className={className} pointerEvents="none" aria-label="Overlay Vektor Fisika">
      {vectors.map((vec, index) => {
        const mag = Math.hypot(vec.components.dx, vec.components.dy);
        // Do not render stubs for zero or sub-threshold vectors
        if (mag < minThreshold) {
          return null;
        }

        const effectiveScale = (vec.scale ?? defaultScale) * userScale;
        const rawDx = vec.components.dx * effectiveScale;
        const rawDy = vec.components.dy * effectiveScale;
        const rawLen = Math.hypot(rawDx, rawDy);

        if (rawLen < 1) {
          return null;
        }

        // Clamp arrow length to maxArrowLength so it does not exceed air track boundaries
        let dx = rawDx;
        let dy = rawDy;
        if (rawLen > maxArrowLength) {
          const ratio = maxArrowLength / rawLen;
          dx = rawDx * ratio;
          dy = rawDy * ratio;
        }

        const shouldShowValue = vec.showValue !== undefined ? vec.showValue : showValues;
        const subLabel = shouldShowValue && vec.valueText ? vec.valueText : undefined;

        // Position callout badge chip above arrow midpoint/tail
        const badgeX = vec.origin.x + dx * 0.45;
        const badgeY = vec.origin.y - 12;

        const uniqueVectorId = `${baseId}_vector_${vec.id || index}`;

        return (
          <g key={vec.id || index} id={uniqueVectorId}>
            {/* Vector Arrow (Strictly without SVG drop-shadow filter) */}
            <VectorArrow
              from={vec.origin}
              delta={{ x: dx, y: dy }}
              color={vec.color}
              strokeWidth={3}
              headSize={9}
              disableFilter={true}
              id={`${baseId}_arrow_${vec.id || index}`}
            />

            {/* Callout Badge Chip */}
            <SvgCalloutBadge
              label={vec.label}
              subLabel={subLabel}
              targetX={vec.origin.x}
              targetY={vec.origin.y}
              badgeX={badgeX}
              badgeY={badgeY}
              color={vec.color}
              showPointerLine={false}
              size="sm"
            />
          </g>
        );
      })}
    </g>
  );
}
