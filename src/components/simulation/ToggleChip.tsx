"use client";

import React from "react";

interface ToggleChipProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  color?: string;
  disabled?: boolean;
}

/** Accessible pill-shaped toggle (role="switch") for simulation overlays. */
export function ToggleChip({ id, label, checked, onChange, color = "var(--color-primary)", disabled = false }: ToggleChipProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        borderColor: checked ? color : "rgba(255,255,255,0.12)",
        background: checked ? `color-mix(in srgb, ${color} 16%, transparent)` : "rgba(255,255,255,0.03)",
        color: checked ? color : "rgba(255,255,255,0.55)",
      }}
    >
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 rounded-full transition-colors"
        style={{ background: checked ? color : "rgba(255,255,255,0.25)", boxShadow: checked ? `0 0 8px ${color}` : "none" }}
      />
      {label}
    </button>
  );
}
