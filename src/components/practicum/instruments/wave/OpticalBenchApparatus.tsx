"use client";

import React, { useState } from "react";
import {
  DEFAULT_LASER_WAVELENGTH,
  DEFAULT_SCREEN_DISTANCE_L,
  SSG_SLIT_PRESETS,
} from "@/physics/waveOptics";
import { Power, Sliders, CheckCircle2, ChevronRight, Layers } from "lucide-react";

export interface OpticalBenchApparatusProps {
  slitKey?: "slit2" | "slit3" | "slit5";
  onSelectSlit?: (slitKey: "slit2" | "slit3" | "slit5") => void;
  isLaserOn?: boolean;
  onToggleLaser?: () => void;
  dimmer?: number;
  onDimmerChange?: (dimmer: number) => void;
  distanceL?: number; // default 1.6 m
  assemblyStep?: number; // for guided procedure assembly (1 to 4)
  onAssemblyStepChange?: (step: number) => void;
  isAssemblyMode?: boolean;
  className?: string;
}

/**
 * Visual illustration of the optical bench apparatus (rel aluminium, laser diode,
 * rotatable slit disk, and screen holder with tape measure L = 1.60 m).
 */
export function OpticalBenchApparatus({
  slitKey = "slit2",
  onSelectSlit,
  isLaserOn = true,
  onToggleLaser,
  dimmer = 1.0,
  onDimmerChange,
  distanceL = DEFAULT_SCREEN_DISTANCE_L,
  assemblyStep = 4,
  onAssemblyStepChange,
  isAssemblyMode = false,
  className = "",
}: OpticalBenchApparatusProps) {
  const currentSlit = SSG_SLIT_PRESETS[slitKey];

  return (
    <div className={`p-4 rounded-xl glass-panel border border-slate-800 flex flex-col gap-4 text-xs ${className}`}>
      {/* Top Header & Equipment Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-100 flex items-center gap-2">
              Bangku Optik & Sumber Laser Semikonduktor
              <span
                className={`text-[10px] px-2 py-0.2 rounded-full font-mono border ${
                  isLaserOn
                    ? "bg-rose-500/10 border-rose-500/40 text-rose-300"
                    : "bg-slate-800 border-slate-700 text-slate-400"
                }`}
              >
                {isLaserOn ? "LASER AKTIF (632 nm)" : "LASER NONAKTIF"}
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Rel aluminium presisi dengan dudukan laser, pemutar celah set, dan dudukan layar
            </p>
          </div>
        </div>

        {/* Laser Quick Controls */}
        <div className="flex items-center gap-3">
          {/* Power Button */}
          {onToggleLaser && (
            <button
              type="button"
              onClick={onToggleLaser}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium border text-xs transition-colors ${
                isLaserOn
                  ? "bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-600/20"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{isLaserOn ? "Matikan Laser" : "Nyalakan Laser"}</span>
            </button>
          )}

          {/* Dimmer Knob */}
          {onDimmerChange && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400 text-[11px]">Dimmer:</span>
              <input
                type="range"
                min={0.2}
                max={1.0}
                step={0.05}
                value={dimmer}
                onChange={(e) => onDimmerChange(parseFloat(e.target.value))}
                className="w-20 accent-rose-500 cursor-pointer"
                title="Atur intensitas daya laser"
              />
              <span className="font-mono text-slate-200 text-[11px] w-8">
                {Math.round(dimmer * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Optical Bench SVG Illustration */}
      <div className="relative w-full bg-slate-950 rounded-lg p-2 overflow-hidden border border-slate-800 shadow-inner">
        <svg viewBox="0 0 800 210" className="w-full h-auto block">
          <defs>
            {/* Aluminum Rail Gradient */}
            <linearGradient id="railGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="25%" stopColor="#cbd5e1" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Laser Stand Gradient */}
            <linearGradient id="chassisGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Laser Beam Glow */}
            <linearGradient id="laserBeamGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ff3333" stopOpacity={isLaserOn ? 0.9 * dimmer : 0} />
              <stop offset="15%" stopColor="#ff4444" stopOpacity={isLaserOn ? 0.8 * dimmer : 0} />
              <stop offset="100%" stopColor="#ff5555" stopOpacity={isLaserOn ? 0.6 * dimmer : 0} />
            </linearGradient>
          </defs>

          {/* Optical Rail (Aluminum Track) */}
          <rect x="40" y="150" width="720" height="28" rx="3" fill="url(#railGrad)" stroke="#475569" strokeWidth="1" />
          <line x1="40" y1="158" x2="760" y2="158" stroke="#1e293b" strokeWidth="1.5" />

          {/* Scale Markings on Rail (0 cm to 200 cm) */}
          {[0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200].map((cm) => {
            const x = 50 + (cm / 200) * 700;
            return (
              <g key={cm}>
                <line x1={x} y1="150" x2={x} y2="157" stroke="#0f172a" strokeWidth="1" />
                <text x={x} y="172" fill="#0f172a" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                  {cm}
                </text>
              </g>
            );
          })}
          <text x="740" y="172" fill="#0f172a" fontSize="8" fontFamily="monospace">
            (cm)
          </text>

          {/* Rail Support Feet */}
          <rect x="80" y="178" width="24" height="18" fill="#1e293b" rx="2" />
          <rect x="696" y="178" width="24" height="18" fill="#1e293b" rx="2" />

          {/* 1. Laser Diode Module on Stand (Position x = 20 cm -> x = 120 px) */}
          <g transform="translate(100, 40)">
            {/* Stand Post & Base */}
            <rect x="18" y="70" width="14" height="40" fill="url(#chassisGrad)" rx="2" stroke="#475569" strokeWidth="1" />
            <rect x="10" y="105" width="30" height="7" fill="#0f172a" rx="1" />

            {/* Laser Cylindrical Head */}
            <rect x="0" y="48" width="50" height="24" rx="4" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
            <rect x="42" y="52" width="12" height="16" rx="2" fill="#475569" />
            <circle cx="53" cy="60" r="3" fill={isLaserOn ? "#ef4444" : "#475569"} />

            {/* Indicator LED */}
            <circle cx="16" cy="54" r="2.5" fill={isLaserOn ? "#22c55e" : "#64748b"} />
            <text x="25" y="90" fill="#94a3b8" fontSize="8" fontFamily="sans-serif" textAnchor="middle">
              Laser 632nm
            </text>
          </g>

          {/* 2. Rotatable Slit Wheel (Piringan Celah) at x = 40 cm -> x = 190 px */}
          <g transform="translate(190, 42)">
            {/* Stand Post & Base */}
            <rect x="16" y="68" width="12" height="42" fill="url(#chassisGrad)" rx="2" stroke="#475569" strokeWidth="1" />
            <rect x="8" y="103" width="28" height="7" fill="#0f172a" rx="1" />

            {/* Circular Slit Wheel Disk */}
            <circle cx="22" cy="58" r="24" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2" />
            <circle cx="22" cy="58" r="20" fill="#1e293b" stroke="#64748b" strokeWidth="1" />

            {/* Slits Aperture at center */}
            <rect x="21" y="52" width="2" height="12" fill={isLaserOn ? "#ffffff" : "#020617"} />

            {/* Wheel Label */}
            <text x="22" y="30" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              {currentSlit.name}
            </text>
            <text x="22" y="96" fill="#94a3b8" fontSize="8" fontFamily="sans-serif" textAnchor="middle">
              Set Celah
            </text>
          </g>

          {/* 3. Screen Holder & Millimeter Screen at x = 180 cm -> x = 680 px */}
          <g transform="translate(670, 18)">
            {/* Stand Post & Base */}
            <rect x="18" y="92" width="14" height="42" fill="url(#chassisGrad)" rx="2" stroke="#475569" strokeWidth="1" />
            <rect x="10" y="127" width="30" height="7" fill="#0f172a" rx="1" />

            {/* Screen Frame */}
            <rect x="12" y="10" width="26" height="84" rx="2" fill="#020617" stroke="#475569" strokeWidth="1.5" />

            {/* Millimeter Block Paper on Screen */}
            <rect x="14" y="12" width="22" height="80" rx="1" fill="#090d16" />

            {/* Target pattern glow on screen */}
            {isLaserOn && (
              <ellipse
                cx="25"
                cy="52"
                rx="6"
                ry="18"
                fill="#ef4444"
                opacity={0.8 * dimmer}
              />
            )}
            <text x="25" y="8" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              Layar
            </text>
            <text x="25" y="118" fill="#94a3b8" fontSize="8" fontFamily="sans-serif" textAnchor="middle">
              Kertas mm
            </text>
          </g>

          {/* Laser Beam Path (Laser -> Slit -> Screen) */}
          {isLaserOn && (
            <g>
              {/* Beam section 1: Laser to Slit Wheel (x = 153 to 212) */}
              <line x1="153" y1="100" x2="212" y2="100" stroke="#ff3333" strokeWidth="2.5" opacity={0.9 * dimmer} />
              <line x1="153" y1="100" x2="212" y2="100" stroke="#ffffff" strokeWidth="1" opacity={0.8 * dimmer} />

              {/* Beam section 2: Slit to Screen (Diffraction Envelope Fan, x = 212 to 684) */}
              <polygon
                points="212,100 684,80 684,120"
                fill="url(#laserBeamGrad)"
                opacity={0.35 * dimmer}
              />
              {/* Core ray */}
              <line x1="212" y1="100" x2="684" y2="100" stroke="#ff3333" strokeWidth="2" opacity={0.8 * dimmer} />
              <line x1="212" y1="100" x2="684" y2="100" stroke="#ffffff" strokeWidth="0.8" opacity={0.8 * dimmer} />
            </g>
          )}

          {/* Dimension Line: Distance L = 1.6 m (from Slit at x = 212 to Screen at x = 684) */}
          <g>
            <line x1="212" y1="20" x2="684" y2="20" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" />
            <polygon points="212,20 220,17 220,23" fill="#38bdf8" />
            <polygon points="684,20 676,17 676,23" fill="#38bdf8" />
            <rect x="410" y="10" width="80" height="18" rx="4" fill="#090d16" stroke="#38bdf8" strokeWidth="1" />
            <text x="450" y="23" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              L = {distanceL.toFixed(2)} m
            </text>
          </g>
        </svg>
      </div>

      {/* Slit Selection Controls */}
      {onSelectSlit && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/60 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-medium">Pilih Piringan Celah:</span>
          </div>

          <div className="flex items-center gap-2">
            {(["slit2", "slit3", "slit5"] as const).map((key) => {
              const def = SSG_SLIT_PRESETS[key];
              const isSelected = slitKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectSlit(key)}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border transition-all ${
                    isSelected
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {def.name} (N={def.N})
                </button>
              );
            })}
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            N = {currentSlit.N} celah | a = {(currentSlit.a * 1e3).toFixed(2)} mm | d = {(currentSlit.d * 1e3).toFixed(2)} mm
          </div>
        </div>
      )}
    </div>
  );
}
