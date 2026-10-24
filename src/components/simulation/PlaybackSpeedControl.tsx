"use client";

import React, { useRef, useCallback } from "react";
import { Gauge } from "lucide-react";

/**
 * Standard playback speed multipliers for physics simulations.
 * "1×" represents real-time physical speed.
 * Order strictly from left to right: 1×, 0,75×, 0,5×, 0,25×.
 */
export const DEFAULT_PLAYBACK_SPEEDS = [1, 0.75, 0.5, 0.25] as const;
export type PlaybackSpeed = (typeof DEFAULT_PLAYBACK_SPEEDS)[number];

/**
 * Formats a numerical speed multiplier into an accessible Indonesian display string.
 * Uses decimal comma formatting (e.g. 0.75 -> "0,75×", 1 -> "1×").
 */
export function formatSpeedLabel(speed: number): string {
  if (Number.isInteger(speed)) {
    return `${speed}×`;
  }
  return `${String(speed).replace(".", ",")}×`;
}

export interface PlaybackSpeedControlProps {
  /** Currently selected speed multiplier */
  speed: number;
  /** Callback fired when a new speed is chosen */
  onSpeedChange: (speed: number) => void;
  /** List of available speeds (defaults to DEFAULT_PLAYBACK_SPEEDS) */
  availableSpeeds?: readonly number[];
  /** Optional container class name */
  className?: string;
  /** Whether the control is disabled */
  disabled?: boolean;
}

/**
 * Accessible simulation playback speed control.
 * Adheres to WAI-ARIA Radio Group pattern, keyboard-navigable, and responsive (wraps cleanly on 375px screens).
 */
export function PlaybackSpeedControl({
  speed,
  onSpeedChange,
  availableSpeeds = DEFAULT_PLAYBACK_SPEEDS,
  className = "",
  disabled = false,
}: PlaybackSpeedControlProps) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      if (disabled) return;
      const total = availableSpeeds.length;
      let nextIndex: number | null = null;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % total;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        nextIndex = (currentIndex - 1 + total) % total;
      } else if (e.key === "Home") {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        nextIndex = total - 1;
      }

      if (nextIndex !== null) {
        const nextSpeed = availableSpeeds[nextIndex];
        onSpeedChange(nextSpeed);
        buttonRefs.current[nextIndex]?.focus();
      }
    },
    [availableSpeeds, disabled, onSpeedChange]
  );

  return (
    <div
      role="radiogroup"
      aria-label="Kecepatan simulasi"
      className={`flex flex-wrap items-center gap-1.5 ${className}`}
    >
      <span className="text-[11px] font-mono font-medium text-slate-400 select-none mr-1 flex items-center gap-1">
        <Gauge className="w-3.5 h-3.5 text-cyan-400" />
        Kecepatan:
      </span>

      <div className="flex flex-wrap items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800 shadow-inner">
        {availableSpeeds.map((s, idx) => {
          const isSelected = Math.abs(speed - s) < 1e-4;
          return (
            <button
              key={s}
              ref={(el) => {
                buttonRefs.current[idx] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              disabled={disabled}
              onClick={() => onSpeedChange(s)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              data-testid={`speed-btn-${s}`}
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-all outline-none border focus-visible:ring-2 focus-visible:ring-cyan-400 active:scale-95 ${
                isSelected
                  ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  : "bg-slate-900/60 border-transparent text-slate-400 hover:text-white hover:bg-slate-800"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {formatSpeedLabel(s)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
