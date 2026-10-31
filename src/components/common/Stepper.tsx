"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export interface StepperProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  fineStep?: number;
  coarseStep?: number;
  unit?: string;
  precision?: number;
  disabled?: boolean;
  className?: string;
  formatValue?: (val: number) => string;
  ariaLabel?: string;
}

export function Stepper({
  label,
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  fineStep = 1,
  coarseStep = 5,
  unit = "",
  precision = 1,
  disabled = false,
  className = "",
  formatValue,
  ariaLabel,
}: StepperProps) {
  const clamp = (val: number) => {
    let clamped = Math.max(min, Math.min(max, val));
    if (precision !== undefined) {
      clamped = Number(clamped.toFixed(precision));
    }
    return clamped;
  };

  const handleStep = (delta: number) => {
    if (disabled) return;
    const next = clamp(value + delta);
    onChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      e.preventDefault();
      handleStep(e.shiftKey ? coarseStep : fineStep);
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      e.preventDefault();
      handleStep(e.shiftKey ? -coarseStep : -fineStep);
    } else if (e.key === "PageUp") {
      e.preventDefault();
      handleStep(coarseStep);
    } else if (e.key === "PageDown") {
      e.preventDefault();
      handleStep(-coarseStep);
    } else if (e.key === "Home" && min !== -Infinity) {
      e.preventDefault();
      onChange(clamp(min));
    } else if (e.key === "End" && max !== Infinity) {
      e.preventDefault();
      onChange(clamp(max));
    }
  };

  const displayVal = formatValue
    ? formatValue(value)
    : `${value.toFixed(precision)}${unit ? ` ${unit}` : ""}`;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <span className="text-xs font-medium text-white/70">
          {label}
        </span>
      )}
      <div className="flex items-center gap-1 bg-[#0D111A] border border-white/10 rounded-lg p-1 select-none">
        {/* Coarse Dec */}
        <button
          type="button"
          onClick={() => handleStep(-coarseStep)}
          disabled={disabled || value <= min}
          className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title={`-${coarseStep}${unit ? ` ${unit}` : ""} (Langkah Kasar)`}
          aria-label={`Kurangi ${label || 'nilai'} kasar (-${coarseStep})`}
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Fine Dec */}
        <button
          type="button"
          onClick={() => handleStep(-fineStep)}
          disabled={disabled || value <= min}
          className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title={`-${fineStep}${unit ? ` ${unit}` : ""} (Langkah Halus)`}
          aria-label={`Kurangi ${label || 'nilai'} halus (-${fineStep})`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Interactive Value Spinbutton */}
        <div
          role="spinbutton"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={handleKeyDown}
          aria-valuenow={value}
          aria-valuemin={min !== -Infinity ? min : undefined}
          aria-valuemax={max !== Infinity ? max : undefined}
          aria-label={ariaLabel || label || "Pengatur nilai"}
          className="flex-1 text-center font-mono font-bold text-xs sm:text-sm text-cyan-300 px-2 py-1 rounded bg-white/5 border border-white/5 hover:border-cyan-500/30 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 cursor-pointer transition-all"
          title="Fokus dan gunakan tombol panah (←/→ halus, Shift+panah kasar)"
        >
          {displayVal}
        </div>

        {/* Fine Inc */}
        <button
          type="button"
          onClick={() => handleStep(fineStep)}
          disabled={disabled || value >= max}
          className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title={`+${fineStep}${unit ? ` ${unit}` : ""} (Langkah Halus)`}
          aria-label={`Tambah ${label || 'nilai'} halus (+${fineStep})`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Coarse Inc */}
        <button
          type="button"
          onClick={() => handleStep(coarseStep)}
          disabled={disabled || value >= max}
          className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title={`+${coarseStep}${unit ? ` ${unit}` : ""} (Langkah Kasar)`}
          aria-label={`Tambah ${label || 'nilai'} kasar (+${coarseStep})`}
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
