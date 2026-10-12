"use client";

import React from "react";
import { Timer, Zap, RotateCcw } from "lucide-react";

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

export function TimerCounter({
  p11,
  p21,
  p22,
  gate1Active = false,
  gate2Active = false,
  hasP22Expected = true,
  onReset,
  className = "",
  label = "DIGITAL TIMER COUNTER (Pudak/Daesung AT-01)"
}: TimerCounterProps) {
  const formatTime = (val: number | null, isExpected: boolean = true) => {
    if (!isExpected) return "--.----";
    if (val === null || val === undefined || isNaN(val)) return "--.----";
    return val.toFixed(4);
  };

  return (
    <div
      className={`bg-slate-950 border border-cyan-500/30 rounded-xl p-4 shadow-[0_0_25px_rgba(6,182,212,0.15)] ${className}`}
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {/* Header Panel */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-cyan-400" />
          <span className="text-xs font-bold tracking-widest text-cyan-300 uppercase">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 tracking-wider">
            MODE: COLLISION
          </span>
          {onReset && (
            <button
              onClick={onReset}
              className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
              title="Reset Timer"
              aria-label="Reset Timer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Digital Readouts Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Pulse P11 (Gate 1, Kereta A sebelum tumbukan) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-400">
              P11 <span className="text-slate-500 text-[10px]">(t_A)</span>
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-slate-500">G1</span>
              <span
                className={`w-2 h-2 rounded-full transition-all duration-150 ${
                  gate1Active
                    ? "bg-red-500 shadow-[0_0_8px_#ef4444]"
                    : "bg-slate-800"
                }`}
              />
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-mono font-bold text-cyan-400 tracking-wider">
              {formatTime(p11, true)}
            </div>
            <div className="text-[9px] text-slate-500 uppercase">Sekon (s)</div>
          </div>
        </div>

        {/* Pulse P21 (Gate 2, Kereta B setelah tumbukan) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-400">
              P21 <span className="text-slate-500 text-[10px]">(t_B&apos;)</span>
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-slate-500">G2</span>
              <span
                className={`w-2 h-2 rounded-full transition-all duration-150 ${
                  gate2Active
                    ? "bg-red-500 shadow-[0_0_8px_#ef4444]"
                    : "bg-slate-800"
                }`}
              />
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-mono font-bold text-cyan-400 tracking-wider">
              {formatTime(p21, true)}
            </div>
            <div className="text-[9px] text-slate-500 uppercase">Sekon (s)</div>
          </div>
        </div>

        {/* Pulse P22 (Gate 2, Kereta A setelah tumbukan jika maju) */}
        <div
          className={`bg-slate-900/90 border rounded-lg p-2.5 flex flex-col justify-between relative overflow-hidden ${
            !hasP22Expected
              ? "border-slate-800/40 opacity-60"
              : "border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-400">
              P22 <span className="text-slate-500 text-[10px]">(t_A&apos;)</span>
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-slate-500">
                {!hasP22Expected ? "DIAM" : "G2"}
              </span>
              <span
                className={`w-2 h-2 rounded-full transition-all duration-150 ${
                  hasP22Expected && gate2Active
                    ? "bg-amber-400 shadow-[0_0_8px_#fbbf24]"
                    : "bg-slate-800"
                }`}
              />
            </div>
          </div>
          <div className="text-right">
            <div
              className={`text-xl font-mono font-bold tracking-wider ${
                !hasP22Expected ? "text-slate-600" : "text-amber-300"
              }`}
            >
              {formatTime(p22, hasP22Expected)}
            </div>
            <div className="text-[9px] text-slate-500 uppercase">
              {!hasP22Expected ? "Kereta A Berhenti" : "Sekon (s)"}
            </div>
          </div>
        </div>
      </div>

      {/* Sensor Beam Indicator Legend */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-cyan-400" />
          <span>Inframerah: Gerbang 1 (G1), Gerbang 2 (G2)</span>
        </div>
        <div className="text-slate-500 font-mono">Presisi 0.0001 s</div>
      </div>
    </div>
  );
}
