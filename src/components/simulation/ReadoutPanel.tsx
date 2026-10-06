"use client";

import React from "react";

export interface ReadoutItem {
  id: string;
  label: string;
  symbol: string;
  value: string;
  unit?: string;
  color?: string;
}

interface ReadoutPanelProps {
  items: ReadoutItem[];
  className?: string;
}

/** Formats a number for live readouts; handles ∞ and non-finite values. */
export function formatReadout(value: number, digits = 2): string {
  if (value === Infinity) return "∞";
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

/**
 * Grid of live numeric readouts in JetBrains Mono.
 * Pure presentational; reusable across simulations.
 */
export function ReadoutPanel({ items, className = "" }: ReadoutPanelProps) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 ${className}`} aria-live="off">
      {items.map((item) => (
        <div
          key={item.id}
          id={`readout-${item.id}`}
          className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 transition-colors hover:border-white/20"
        >
          <div className="text-[0.68rem] uppercase tracking-wider text-white/45 truncate" title={item.label}>
            {item.label}
          </div>
          <div className="font-mono tabular-nums text-sm sm:text-base font-semibold" style={{ color: item.color ?? "var(--color-text)" }}>
            <span className="text-white/50 mr-1">{item.symbol} =</span>
            {item.value}
            {item.unit && <span className="ml-1 text-xs text-white/50">{item.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
