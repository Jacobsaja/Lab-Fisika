"use client";

import React from "react";
import { Activity, RotateCcw } from "lucide-react";

export type DigitalDisplayVariant = "cyan" | "red" | "emerald" | "amber";

export interface DigitalDisplayCardProps {
  label: string;
  sublabel?: string;
  value: string | number;
  unit?: string;
  variant?: DigitalDisplayVariant;
  size?: "sm" | "md" | "lg";
  isActive?: boolean;
  indicatorLed?: {
    active: boolean;
    color?: "red" | "emerald" | "amber" | "cyan";
    label?: string;
  };
  disabled?: boolean;
  disabledNote?: string;
  className?: string;
}

const VARIANT_STYLES: Record<
  DigitalDisplayVariant,
  {
    text: string;
    shadow: string;
    border: string;
    glowBg: string;
    unitColor: string;
  }
> = {
  red: {
    text: "text-red-500",
    shadow: "0 0 14px rgba(239, 68, 68, 0.65)",
    border: "border-red-500/30",
    glowBg: "rgba(239, 68, 68, 0.04)",
    unitColor: "text-red-400/80",
  },
  cyan: {
    text: "text-cyan-400",
    shadow: "0 0 14px rgba(6, 182, 212, 0.65)",
    border: "border-cyan-500/30",
    glowBg: "rgba(6, 182, 212, 0.04)",
    unitColor: "text-cyan-400/80",
  },
  emerald: {
    text: "text-emerald-400",
    shadow: "0 0 14px rgba(16, 185, 129, 0.65)",
    border: "border-emerald-500/30",
    glowBg: "rgba(16, 185, 129, 0.04)",
    unitColor: "text-emerald-400/80",
  },
  amber: {
    text: "text-amber-400",
    shadow: "0 0 14px rgba(245, 158, 11, 0.65)",
    border: "border-amber-500/30",
    glowBg: "rgba(245, 158, 11, 0.04)",
    unitColor: "text-amber-400/80",
  },
};

const LED_COLORS = {
  red: "bg-red-500 shadow-[0_0_8px_#ef4444]",
  emerald: "bg-emerald-500 shadow-[0_0_8px_#10b981]",
  amber: "bg-amber-400 shadow-[0_0_8px_#fbbf24]",
  cyan: "bg-cyan-400 shadow-[0_0_8px_#06b6d4]",
  inactive: "bg-slate-800",
};

/**
 * Reusable instrument-grade digital readout card (7-segment/monospace style).
 */
export function DigitalDisplayCard({
  label,
  sublabel,
  value,
  unit,
  variant = "cyan",
  size = "md",
  indicatorLed,
  disabled = false,
  disabledNote,
  className = "",
}: DigitalDisplayCardProps) {
  const vStyle = VARIANT_STYLES[variant];

  const fontSizeClass =
    size === "lg"
      ? "text-4xl sm:text-5xl"
      : size === "sm"
      ? "text-lg sm:text-xl"
      : "text-2xl sm:text-3xl";

  return (
    <div
      className={`bg-slate-900/90 border rounded-xl p-3 flex flex-col justify-between relative overflow-hidden transition-all ${
        disabled
          ? "border-slate-800/40 opacity-55"
          : `${vStyle.border} shadow-[0_4px_20px_rgba(0,0,0,0.6)]`
      } ${className}`}
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {/* Top Header Row with Labels and Status LED */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold text-slate-300 tracking-wider">
          {label} {sublabel && <span className="text-slate-500 text-[10px]">({sublabel})</span>}
        </span>

        {indicatorLed && (
          <div className="flex items-center gap-1.5">
            {indicatorLed.label && (
              <span className="text-[9px] text-slate-400 font-bold uppercase">
                {indicatorLed.label}
              </span>
            )}
            <span
              className={`w-2.5 h-2.5 rounded-full transition-all duration-150 ${
                indicatorLed.active
                  ? LED_COLORS[indicatorLed.color || "cyan"]
                  : LED_COLORS.inactive
              }`}
            />
          </div>
        )}
      </div>

      {/* Value Display Box */}
      <div className="bg-black/95 rounded-lg border border-slate-800/80 p-2.5 shadow-inner flex items-baseline justify-end gap-2 relative">
        <span
          className={`font-mono font-bold tracking-widest ${vStyle.text} ${fontSizeClass}`}
          style={{ textShadow: disabled ? "none" : vStyle.shadow }}
        >
          {disabled ? disabledNote || "--.----" : value}
        </span>
        {unit && !disabled && (
          <span className={`text-[10px] font-mono font-bold uppercase ${vStyle.unitColor}`}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

export interface DigitalDisplayPanelProps {
  title?: string;
  badge?: string;
  modeText?: string;
  targetCount?: number;
  isOscillating?: boolean;
  onReset?: () => void;
  children: React.ReactNode;
  footerLegend?: React.ReactNode;
  className?: string;
}

/**
 * Reusable electronic counter / instrument rack enclosure.
 */
export function DigitalDisplayPanel({
  title = "DIGITAL TIMER COUNTER",
  badge,
  modeText,
  targetCount,
  isOscillating = false,
  onReset,
  children,
  footerLegend,
  className = "",
}: DigitalDisplayPanelProps) {
  return (
    <div
      className={`bg-slate-950 border border-cyan-500/30 rounded-2xl p-4 shadow-[0_0_25px_rgba(6,182,212,0.15)] flex flex-col gap-3 ${className}`}
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {/* Panel Bezel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20 gap-2">
        <div className="flex items-center gap-2">
          <Activity
            className={`w-4 h-4 ${
              isOscillating ? "text-red-400 animate-pulse" : "text-cyan-400"
            }`}
          />
          <span className="text-xs font-bold tracking-widest text-cyan-300 uppercase">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {modeText && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 tracking-wider">
              {modeText}
            </span>
          )}
          {targetCount !== undefined && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 border border-amber-500/50 text-amber-300 tracking-wider">
              N = {targetCount}
            </span>
          )}
          {badge && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-300">
              {badge}
            </span>
          )}
          {onReset && (
            <button
              onClick={onReset}
              disabled={isOscillating}
              className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-cyan-300 disabled:opacity-40 transition-colors"
              title="Reset Counter"
              aria-label="Reset Counter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Grid of Display Cards */}
      <div className="w-full">{children}</div>

      {/* Optional Footer Legend */}
      {footerLegend && (
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          {footerLegend}
        </div>
      )}
    </div>
  );
}
