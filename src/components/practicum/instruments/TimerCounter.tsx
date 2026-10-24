"use client";

import React from "react";
import { Timer, Zap } from "lucide-react";
import { DigitalDisplayPanel, DigitalDisplayCard } from "@/components/simulation/visual/DigitalDisplay";

export interface TimerCounterProps {
  /** Operating mode: COLLISION (default, for momentum) or ACCELERATION (for HKEM and H2N) */
  mode?: "COLLISION" | "ACCELERATION";
  p11?: number | null; // tA (Gate 1, pulse 1) in seconds (COLLISION mode)
  p21?: number | null; // tB' (Gate 2, pulse 1) in seconds (COLLISION mode)
  p22?: number | null; // tA' (Gate 2, pulse 2) in seconds, null if absent (COLLISION mode)
  t1?: number | null; // Gate 1 transit time (ACCELERATION mode)
  t2?: number | null; // Gate 2 transit time (ACCELERATION mode)
  t12?: number | null; // Time between Gate 1 and Gate 2 (ACCELERATION mode)
  gate1Active?: boolean; // LED beam 1 blocked indicator
  gate2Active?: boolean; // LED beam 2 blocked indicator
  hasP22Expected?: boolean; // If false (e.g. Case A), P22 is physically not expected
  onReset?: () => void;
  className?: string;
  label?: string;
}

/**
 * Precision Digital Timer Counter (Pudak/Daesung AT-01 style).
 * Supports MODE: COLLISION (momentum) and MODE: ACCELERATION (HKEM & H2N).
 * Backed by the unified DigitalDisplay primitive from the visual system.
 */
export function TimerCounter({
  mode = "COLLISION",
  p11 = null,
  p21 = null,
  p22 = null,
  t1 = null,
  t2 = null,
  t12 = null,
  gate1Active = false,
  gate2Active = false,
  hasP22Expected = true,
  onReset,
  className = "",
  label = "DIGITAL TIMER COUNTER (Pudak/Daesung AT-01)",
}: TimerCounterProps) {
  const formatTime = (val: number | null | undefined, isExpected: boolean = true) => {
    if (!isExpected) return "--.----";
    if (val === null || val === undefined || isNaN(val)) return "--.----";
    return val.toFixed(4);
  };

  const isAccelMode = mode === "ACCELERATION";

  return (
    <DigitalDisplayPanel
      title={label}
      modeText={isAccelMode ? "MODE: ACCELERATION" : "MODE: COLLISION"}
      onReset={onReset}
      className={className}
      footerLegend={
        <>
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {isAccelMode
                ? "Fungsi Percutan: t1 (Gerbang 1), t2 (Gerbang 2), t1-2 (Selang Waktu)"
                : "Sensor Inframerah: Gerbang 1 (G1), Gerbang 2 (G2)"}
            </span>
          </div>
          <div className="text-slate-500 font-mono font-bold">Presisi 0.0001 s</div>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {isAccelMode ? (
          <>
            {/* Gate 1 Transit Time t1 */}
            <DigitalDisplayCard
              label="G1"
              sublabel="t1"
              value={formatTime(t1 !== undefined && t1 !== null ? t1 : p11, true)}
              unit="s"
              variant="cyan"
              size="md"
              indicatorLed={{
                active: gate1Active,
                color: "red",
                label: "G1",
              }}
            />

            {/* Gate 2 Transit Time t2 */}
            <DigitalDisplayCard
              label="G2"
              sublabel="t2"
              value={formatTime(t2 !== undefined && t2 !== null ? t2 : p21, true)}
              unit="s"
              variant="cyan"
              size="md"
              indicatorLed={{
                active: gate2Active,
                color: "red",
                label: "G2",
              }}
            />

            {/* Travel Time between G1 and G2 */}
            <DigitalDisplayCard
              label="G1→G2"
              sublabel="t12"
              value={formatTime(t12, true)}
              unit="s"
              variant="emerald"
              size="md"
              indicatorLed={{
                active: gate1Active || gate2Active,
                color: "emerald",
                label: "Δt",
              }}
            />
          </>
        ) : (
          <>
            {/* Pulse P11 (Gate 1, Cart A before collision) */}
            <DigitalDisplayCard
              label="P11"
              sublabel="t_A"
              value={formatTime(p11, true)}
              unit="s"
              variant="cyan"
              size="md"
              indicatorLed={{
                active: gate1Active,
                color: "red",
                label: "G1",
              }}
            />

            {/* Pulse P21 (Gate 2, Cart B after collision) */}
            <DigitalDisplayCard
              label="P21"
              sublabel="t_B'"
              value={formatTime(p21, true)}
              unit="s"
              variant="cyan"
              size="md"
              indicatorLed={{
                active: gate2Active,
                color: "red",
                label: "G2",
              }}
            />

            {/* Pulse P22 (Gate 2, Cart A after collision if moving forward) */}
            <DigitalDisplayCard
              label="P22"
              sublabel="t_A'"
              value={formatTime(p22, hasP22Expected)}
              unit={hasP22Expected ? "s" : undefined}
              variant="amber"
              size="md"
              disabled={!hasP22Expected}
              disabledNote="DIAM"
              indicatorLed={{
                active: hasP22Expected && gate2Active,
                color: "amber",
                label: !hasP22Expected ? "DIAM" : "G2",
              }}
            />
          </>
        )}
      </div>
    </DigitalDisplayPanel>
  );
}
