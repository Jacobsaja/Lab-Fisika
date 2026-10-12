"use client";

import React, { useMemo } from "react";
import { SCIENTIFIC_THEME } from "./tokens";

export interface SvgRulerProps {
  orientation?: "vertical" | "horizontal";
  x: number;
  y: number;
  lengthPx: number;
  minValue: number;
  maxValue: number;
  majorStep: number;
  minorStep?: number;
  mediumStep?: number;
  unitLabel?: string;
  tickSide?: "left" | "right" | "top" | "bottom";
  rulerWidthPx?: number;
  invertDirection?: boolean; // e.g. if 0 is at top or bottom
  valueFormatter?: (val: number) => string;
  metalFillId?: string;
  className?: string;
}

export function SvgRuler({
  orientation = "vertical",
  x,
  y,
  lengthPx,
  minValue,
  maxValue,
  majorStep,
  minorStep = 1,
  mediumStep = 5,
  unitLabel = "cm",
  tickSide = "left",
  rulerWidthPx = 32,
  invertDirection = false,
  valueFormatter = (val) => String(Math.round(val)),
  metalFillId,
  className = "",
}: SvgRulerProps) {
  const isVertical = orientation === "vertical";
  const totalValueRange = maxValue - minValue;

  const ticks = useMemo(() => {
    if (totalValueRange <= 0 || lengthPx <= 0) return [];

    const result: React.ReactNode[] = [];
    const pxPerUnit = lengthPx / totalValueRange;
    const totalSteps = Math.round(totalValueRange / minorStep);

    for (let i = 0; i <= totalSteps; i++) {
      const val = minValue + i * minorStep;
      const normalizedPos = (val - minValue) * pxPerUnit;
      const posPx = invertDirection ? lengthPx - normalizedPos : normalizedPos;

      const isMajor = Math.abs(val % majorStep) < 1e-4;
      const isMedium = !isMajor && mediumStep && Math.abs(val % mediumStep) < 1e-4;

      const tickLen = isMajor ? 14 : isMedium ? 8 : 4;
      const tickWidth = isMajor ? 1.5 : 1;
      const tickColor = isMajor
        ? SCIENTIFIC_THEME.typography.scaleTickMajor
        : SCIENTIFIC_THEME.typography.scaleTick;

      if (isVertical) {
        const tickY = y + posPx;
        const tickX1 = tickSide === "left" ? x : x + rulerWidthPx - tickLen;
        const tickX2 = tickSide === "left" ? x + tickLen : x + rulerWidthPx;

        result.push(
          <line
            key={`t-${i}`}
            x1={tickX1}
            y1={tickY}
            x2={tickX2}
            y2={tickY}
            stroke={tickColor}
            strokeWidth={tickWidth}
          />
        );

        if (isMajor) {
          const textX = tickSide === "left" ? x - 6 : x + rulerWidthPx + 6;
          const anchor = tickSide === "left" ? "end" : "start";

          result.push(
            <text
              key={`lbl-${i}`}
              x={textX}
              y={tickY + 4}
              fontSize="11"
              fontFamily={SCIENTIFIC_THEME.typography.fontMono}
              fill={SCIENTIFIC_THEME.typography.scaleTextMajor}
              textAnchor={anchor}
              fontWeight="600"
            >
              {valueFormatter(val)}
            </text>
          );
        }
      } else {
        const tickX = x + posPx;
        const tickY1 = tickSide === "top" ? y : y + rulerWidthPx - tickLen;
        const tickY2 = tickSide === "top" ? y + tickLen : y + rulerWidthPx;

        result.push(
          <line
            key={`t-${i}`}
            x1={tickX}
            y1={tickY1}
            x2={tickX}
            y2={tickY2}
            stroke={tickColor}
            strokeWidth={tickWidth}
          />
        );

        if (isMajor) {
          const textY = tickSide === "top" ? y - 6 : y + rulerWidthPx + 14;

          result.push(
            <text
              key={`lbl-${i}`}
              x={tickX}
              y={textY}
              fontSize="11"
              fontFamily={SCIENTIFIC_THEME.typography.fontMono}
              fill={SCIENTIFIC_THEME.typography.scaleTextMajor}
              textAnchor="middle"
              fontWeight="600"
            >
              {valueFormatter(val)}
            </text>
          );
        }
      }
    }

    return result;
  }, [
    isVertical,
    minValue,
    maxValue,
    lengthPx,
    totalValueRange,
    minorStep,
    majorStep,
    mediumStep,
    invertDirection,
    x,
    y,
    tickSide,
    rulerWidthPx,
    valueFormatter,
  ]);

  return (
    <g className={className}>
      {/* Ruler Body Backing (Metal Beam) */}
      <rect
        x={x}
        y={y}
        width={isVertical ? rulerWidthPx : lengthPx}
        height={isVertical ? lengthPx : rulerWidthPx}
        fill={metalFillId ? `url(#${metalFillId})` : "#1e293b"}
        stroke="#475569"
        strokeWidth="1"
        rx="2"
      />

      {/* Ticks and Number Labels */}
      {ticks}

      {/* Unit label at the end */}
      {unitLabel && (
        <text
          x={isVertical ? x + rulerWidthPx / 2 : x + lengthPx + 14}
          y={isVertical ? y + lengthPx + 22 : y + rulerWidthPx / 2 + 4}
          fontSize="10"
          fontFamily={SCIENTIFIC_THEME.typography.fontMono}
          fill={SCIENTIFIC_THEME.typography.labelMuted}
          textAnchor={isVertical ? "middle" : "start"}
        >
          ({unitLabel})
        </text>
      )}
    </g>
  );
}
