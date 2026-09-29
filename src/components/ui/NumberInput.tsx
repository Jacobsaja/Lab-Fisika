"use client";

import React, { useId } from "react";

interface NumberInputProps {
  label: string;
  unit?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  disabled?: boolean;
  className?: string;
}

export function NumberInput({
  label,
  unit,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
  className = "",
}: NumberInputProps) {
  const id = useId();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseFloat(e.target.value);
    if (isNaN(parsed)) return;
    const clamped =
      min !== undefined && max !== undefined
        ? Math.min(max, Math.max(min, parsed))
        : min !== undefined
        ? Math.max(min, parsed)
        : max !== undefined
        ? Math.min(max, parsed)
        : parsed;
    onChange(clamped);
  };

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label
        htmlFor={id}
        style={{
          fontSize: "0.8125rem",
          fontWeight: 500,
          color: "var(--color-text-2)",
          userSelect: "none",
        }}
      >
        {label}
        {unit && (
          <span
            style={{
              marginLeft: "6px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.75rem",
              color: "var(--color-primary)",
              fontWeight: 400,
            }}
          >
            ({unit})
          </span>
        )}
      </label>
      <div style={{ display: "flex", alignItems: "center" }}>
        <input
          id={id}
          type="number"
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          style={{
            width: "100%",
            padding: "9px 12px",
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.9375rem",
            fontWeight: 500,
            outline: "none",
            transition: "border-color var(--transition)",
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? "not-allowed" : "text",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-primary)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
        />
        {unit && (
          <span
            aria-hidden="true"
            style={{
              marginLeft: "10px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.875rem",
              color: "var(--color-text-2)",
              whiteSpace: "nowrap",
              userSelect: "none",
            }}
          >
            {unit}
          </span>
        )}
      </div>
      {min !== undefined && max !== undefined && (
        <span style={{ fontSize: "0.75rem", color: "var(--color-text-2)" }}>
          Rentang:{" "}
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {min} – {max}
          </span>
        </span>
      )}
    </div>
  );
}

/* ─── ParameterSlider ─── */
interface ParameterSliderProps {
  label: string;
  unit?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  precision?: number;
  disabled?: boolean;
  className?: string;
}

export function ParameterSlider({
  label,
  unit,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  precision = 2,
  disabled = false,
  className = "",
}: ParameterSliderProps) {
  const id = useId();
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Label row */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <label
          htmlFor={id}
          style={{
            fontSize: "0.8125rem",
            fontWeight: 500,
            color: "var(--color-text-2)",
            userSelect: "none",
          }}
        >
          {label}
          {unit && (
            <span
              style={{
                marginLeft: "6px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.75rem",
                color: "var(--color-primary)",
                fontWeight: 400,
              }}
            >
              ({unit})
            </span>
          )}
        </label>
        <span
          aria-live="polite"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.9375rem",
            fontWeight: 600,
            color: "var(--color-text)",
            minWidth: "60px",
            textAlign: "right",
          }}
        >
          {value.toFixed(precision)}
          {unit && (
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-2)", marginLeft: "4px" }}>
              {unit}
            </span>
          )}
        </span>
      </div>
      {/* Slider */}
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type="range"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={`${value.toFixed(precision)} ${unit ?? ""}`}
          style={{
            width: "100%",
            height: "6px",
            appearance: "none",
            WebkitAppearance: "none",
            background: `linear-gradient(to right, var(--color-primary) ${percent}%, var(--color-border) ${percent}%)`,
            borderRadius: "3px",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
          }}
        />
      </div>
      {/* Min/max labels */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.6875rem",
          color: "var(--color-text-2)",
        }}
      >
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
