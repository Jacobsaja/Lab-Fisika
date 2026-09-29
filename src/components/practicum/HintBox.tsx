"use client";

import React, { useState } from "react";
import { Lightbulb, ArrowRight } from "lucide-react";

interface HintBoxProps {
  /** Ordered list of hint strings, revealed one at a time */
  hints: string[];
  className?: string;
}

/**
 * Progressive hint reveal: shows one hint at a time.
 * The user must explicitly request the next hint.
 */
export function HintBox({ hints, className = "" }: HintBoxProps) {
  const [revealedCount, setRevealedCount] = useState(0);

  if (hints.length === 0) return null;

  const canRevealMore = revealedCount < hints.length;
  const revealedHints = hints.slice(0, revealedCount);

  return (
    <div
      className={className}
      style={{
        background: "rgba(110, 168, 255, 0.05)",
        border: "1px solid rgba(110, 168, 255, 0.25)",
        borderRadius: "var(--radius-md)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
      aria-live="polite"
      aria-label="Kotak petunjuk"
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Lightbulb className="w-4 h-4 text-blue-400" />
        <span
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "var(--color-primary)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Petunjuk
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.75rem",
            color: "var(--color-text-2)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {revealedCount}/{hints.length}
        </span>
      </div>

      {/* Revealed hints */}
      {revealedHints.map((hint, idx) => (
        <div
          key={idx}
          className="animate-fade-in"
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "flex-start",
          }}
        >
          <span
            style={{
              flexShrink: 0,
              width: "22px",
              height: "22px",
              borderRadius: "50%",
              background: "var(--color-primary-dim)",
              border: "1px solid var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.6875rem",
              fontWeight: 600,
              color: "var(--color-primary)",
            }}
            aria-hidden="true"
          >
            {idx + 1}
          </span>
          <p
            style={{
              margin: 0,
              fontSize: "0.875rem",
              color: "var(--color-text)",
              lineHeight: 1.6,
            }}
          >
            {hint}
          </p>
        </div>
      ))}

      {/* Reveal button */}
      {canRevealMore ? (
        <button
          onClick={() => setRevealedCount((c) => c + 1)}
          style={{
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            background: "var(--color-primary-dim)",
            border: "1px solid rgba(110, 168, 255, 0.4)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-primary)",
            fontSize: "0.8125rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "background var(--transition)",
          }}
          onMouseOver={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "rgba(110, 168, 255, 0.2)")
          }
          onMouseOut={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "var(--color-primary-dim)")
          }
          aria-label={`Tampilkan petunjuk ${revealedCount + 1} dari ${hints.length}`}
        >
          {revealedCount === 0 ? "Tampilkan Petunjuk" : "Petunjuk Berikutnya"}
          <ArrowRight className="w-4 h-4" />
        </button>
      ) : (
        <p
          style={{
            margin: 0,
            fontSize: "0.8125rem",
            color: "var(--color-text-2)",
            fontStyle: "italic",
          }}
        >
          Semua petunjuk telah ditampilkan.
        </p>
      )}
    </div>
  );
}

/** Pure logic: returns how many hints should be visible given the count */
export function getVisibleHintCount(
  totalHints: number,
  currentCount: number
): number {
  return Math.min(totalHints, currentCount);
}
