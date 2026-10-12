"use client";

import React from "react";
import { Timer, Zap } from "lucide-react";
import { DigitalDisplayPanel, DigitalDisplayCard } from "@/components/simulation/visual/DigitalDisplay";

export interface TimerCounterProps {
  p11: number | null; // tA (Gate 1, pulse 1) in seconds
  p21: number | null; // tB' (Gate 2, pulse 1) in seconds
  p22: number | null; // tA' (Gate 2, pulse 2) in seconds, null if absent
  gate1Active?: boolean; // LED beam 1 blocked indicator
  gate2Active?: boolean; // LED beam 2 blocked indicator
  hasP22Expected?: boolean; // If false (e.g. Case A), P22 is physically not expected
  onReset?: () => void;
  className?: string;
  label?: string;
}

/**
 * Precision Digital Timer Counter (Pudak/Daesung AT-01 style) for Momentum Conservation experiments.
 * Backed by the unified DigitalDisplay primitive from the visual system.
 */
export function TimerCounter({
  p11,
  p21,
  p22,
  gate1Active = false,
  gate2Active = false,
  hasP22Expected = true,
  onReset,
  className = "",
  label = "DIGITAL TIMER COUNTER (Pudak/Daesung AT-01)",
}: TimerCounterProps) {
  const formatTime = (val: number | null, isExpected: boolean = true) => {
    if (!isExpected) return "--.----";
    if (val === null || val === undefined || isNaN(val)) return "--.----";
    return val.toFixed(4);
  };

  return (
    <DigitalDisplayPanel
      title={label}
      modeText="MODE: COLLISION"
      onReset={onReset}
      className={className}
      footerLegend={
        <>
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sensor Inframerah: Gerbang 1 (G1), Gerbang 2 (G2)</span>
          </div>
          <div className="text-slate-500 font-mono font-bold">Presisi 0.0001 s</div>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
      </div>
    </DigitalDisplayPanel>
  );
}
