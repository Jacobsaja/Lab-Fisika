"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Timer, Play, Pause, RotateCcw, AlertTriangle } from "lucide-react";

export type TimerStatus = "idle" | "running" | "paused";

interface ExperimentTimerProps {
  /** Optional recommended duration in seconds; gentle warning shown when exceeded */
  recommendedDurationSec?: number;
  /** Called on every tick with elapsed seconds */
  onTick?: (elapsedSec: number) => void;
  className?: string;
}

function formatTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ExperimentTimer({
  recommendedDurationSec,
  onTick,
  className = "",
}: ExperimentTimerProps) {
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    setStatus("running");
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        onTick?.(next);
        return next;
      });
    }, 1000);
  }, [onTick]);

  const pause = useCallback(() => {
    clearTimer();
    setStatus("paused");
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setStatus("idle");
    setElapsed(0);
  }, [clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const isOverRecommended =
    recommendedDurationSec !== undefined && elapsed > recommendedDurationSec;

  const timeColor = isOverRecommended
    ? "var(--color-warning)"
    : status === "running"
    ? "var(--color-success)"
    : "var(--color-text)";

  return (
    <div
      className={className}
      style={{
        background: "var(--color-surface)",
        border: `1px solid ${isOverRecommended ? "rgba(251, 191, 36, 0.4)" : "var(--color-border)"}`,
        borderRadius: "var(--radius-md)",
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
      aria-label="Timer percobaan"
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Timer className="w-4 h-4 text-gray-400" />
        <span
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "var(--color-text-2)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Waktu
        </span>
        {status === "running" && (
          <span
            className="animate-pulse"
            style={{
              marginLeft: "auto",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "var(--color-success)",
            }}
            aria-label="Berjalan"
          />
        )}
      </div>

      {/* Elapsed display */}
      <div
        aria-live="polite"
        aria-label={`Waktu berlalu: ${formatTime(elapsed)}`}
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "2.25rem",
          fontWeight: 700,
          color: timeColor,
          letterSpacing: "0.05em",
          lineHeight: 1,
          transition: "color 300ms ease",
        }}
      >
        {formatTime(elapsed)}
      </div>

      {/* Recommended duration warning */}
      {isOverRecommended && (
        <div
          role="alert"
          className="animate-fade-in"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 12px",
            background: "rgba(251, 191, 36, 0.1)",
            border: "1px solid rgba(251, 191, 36, 0.3)",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.8125rem",
            color: "var(--color-warning)",
          }}
        >
          <span aria-hidden="true"><AlertTriangle className="w-4 h-4" /></span>
          Melewati durasi rekomendasi ({formatTime(recommendedDurationSec!)})
        </div>
      )}

      {/* Controls */}
      <div style={{ display: "flex", gap: "8px" }}>
        {status === "idle" && (
          <button
            onClick={start}
            className="btn-primary"
            style={{ flex: 1, justifyContent: "center", display: "inline-flex", alignItems: "center", gap: "6px" }}
            aria-label="Mulai timer"
          >
            <Play className="w-4 h-4" /> Mulai
          </button>
        )}
        {status === "running" && (
          <button
            onClick={pause}
            className="btn-ghost"
            style={{ flex: 1, justifyContent: "center", display: "inline-flex", alignItems: "center", gap: "6px" }}
            aria-label="Jeda timer"
          >
            <Pause className="w-4 h-4" /> Jeda
          </button>
        )}
        {status === "paused" && (
          <button
            onClick={start}
            className="btn-primary"
            style={{ flex: 1, justifyContent: "center", display: "inline-flex", alignItems: "center", gap: "6px" }}
            aria-label="Lanjutkan timer"
          >
            <Play className="w-4 h-4" /> Lanjutkan
          </button>
        )}
        {status !== "idle" && (
          <button
            onClick={reset}
            className="btn-ghost"
            aria-label="Reset timer"
            style={{ padding: "10px 14px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Pure function: formats elapsed seconds to MM:SS or HH:MM:SS string.
 * Exported for unit testing.
 */
export { formatTime };
