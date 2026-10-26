"use client";

import React, { useId } from "react";
import {
  DEFAULT_LASER_WAVELENGTH,
  DEFAULT_SCREEN_DISTANCE_L,
  SSG_SLIT_PRESETS,
} from "@/physics/waveOptics";
import { Power, Sliders, Layers, Sparkles, Check } from "lucide-react";

export interface OpticalBenchApparatusProps {
  slitKey?: "slit2" | "slit3" | "slit5";
  onSelectSlit?: (slitKey: "slit2" | "slit3" | "slit5") => void;
  isLaserOn?: boolean;
  onToggleLaser?: () => void;
  dimmer?: number;
  onDimmerChange?: (dimmer: number) => void;
  distanceL?: number; // default 1.6 m
  assemblyStep?: number;
  onAssemblyStepChange?: (step: number) => void;
  isAssemblyMode?: boolean;
  className?: string;
}

/**
 * State-of-the-Art Laboratory Optical Bench Apparatus (Bangku Optik & Laser).
 *
 * Visual Features:
 * - Extruded aluminum precision rail with millimeter scale (0 - 200 cm) and leveling feet.
 * - Solid carrier clamps with knurled brass thumbscrews.
 * - Monochromatic semiconductor laser head (632 nm) with warning badge, LED indicator, and aperture nozzle.
 * - High-precision rotatable slit disk with knurled rim and index markers (Celah II, III, IIIII).
 * - Screen holder with millimeter block paper and dynamic Fraunhofer diffraction spot perfectly aligned on the optical axis.
 * - Sleek engineering dimension callout L = 1.60 m.
 */
export function OpticalBenchApparatus({
  slitKey = "slit2",
  onSelectSlit,
  isLaserOn = true,
  onToggleLaser,
  dimmer = 1.0,
  onDimmerChange,
  distanceL = DEFAULT_SCREEN_DISTANCE_L,
  className = "",
}: OpticalBenchApparatusProps) {
  const instanceId = useId().replace(/[:]/g, "_");
  const currentSlit = SSG_SLIT_PRESETS[slitKey];

  // Optical axis height in SVG coordinates
  const yOpt = 100;

  // Horizontal positions of key components on the 860px wide canvas:
  // Rail runs from x = 50 to x = 810
  const xLaserAperture = 175; // Laser nozzle
  const xSlit = 265;          // Slit wheel center
  const xScreen = 740;        // Screen plate surface

  // Dynamic laser color & opacity
  const laserColor = "#ef4444";
  const beamOpacity = isLaserOn ? Math.max(0.15, dimmer) : 0;

  return (
    <div className={`p-4 rounded-xl glass-panel border border-slate-800 flex flex-col gap-4 text-xs ${className}`}>
      {/* ── Top Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/10">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-100 text-sm tracking-tight">
                Bangku Optik & Sumber Laser Semikonduktor
              </h4>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] border transition-all ${
                  isLaserOn
                    ? "bg-rose-950/60 border-rose-500/50 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.2)]"
                    : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isLaserOn ? "bg-rose-500 animate-pulse shadow-[0_0_6px_#f43f5e]" : "bg-slate-600"
                  }`}
                />
                <span>{isLaserOn ? "LASER AKTIF (632 nm)" : "LASER STANDBY"}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Rel aluminium optik presisi, pemutar piringan celah, dan dudukan layar berskala
            </p>
          </div>
        </div>

        {/* ── Laser Controls (Power & Dimmer) ── */}
        <div className="flex items-center gap-3">
          {onToggleLaser && (
            <button
              type="button"
              onClick={onToggleLaser}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium text-xs border transition-all duration-200 ${
                isLaserOn
                  ? "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white border-rose-400/80 shadow-md shadow-rose-600/30 active:scale-95"
                  : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700 active:scale-95"
              }`}
            >
              <Power className={`w-3.5 h-3.5 ${isLaserOn ? "text-white" : "text-slate-400"}`} />
              <span>{isLaserOn ? "Matikan Laser" : "Nyalakan Laser"}</span>
            </button>
          )}

          {onDimmerChange && (
            <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg shadow-inner">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400 text-[11px] font-medium">Dimmer:</span>
              <input
                type="range"
                min={0.2}
                max={1.0}
                step={0.05}
                value={dimmer}
                onChange={(e) => onDimmerChange(parseFloat(e.target.value))}
                className="w-24 accent-rose-500 cursor-pointer"
                title="Atur intensitas daya sinar laser"
              />
              <span className="font-mono text-slate-200 text-[11px] font-bold w-9 text-right">
                {Math.round(dimmer * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Apparatus SVG Canvas ── */}
      <div className="relative w-full bg-gradient-to-b from-slate-950 via-[#060a14] to-slate-950 rounded-xl p-3 overflow-hidden border border-slate-800/80 shadow-2xl">
        <svg
          viewBox="0 0 860 250"
          className="w-full h-auto block select-none"
          style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}
        >
          <defs>
            {/* Extruded Aluminum Rail Gradient */}
            <linearGradient id={`${instanceId}_railSurface`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="20%" stopColor="#f8fafc" />
              <stop offset="45%" stopColor="#94a3b8" />
              <stop offset="80%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Aluminum Profile Chamfer */}
            <linearGradient id={`${instanceId}_chamfer`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Cast-Iron Support Brackets */}
            <linearGradient id={`${instanceId}_castIron`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="30%" stopColor="#334155" />
              <stop offset="80%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Brass Thumbscrew Gradient */}
            <linearGradient id={`${instanceId}_brass`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            {/* Laser Cylindrical Barrel Gradient */}
            <linearGradient id={`${instanceId}_laserBarrel`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="35%" stopColor="#64748b" />
              <stop offset="60%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Laser Nozzle Gold / Brass Ring */}
            <linearGradient id={`${instanceId}_goldRing`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#a16207" />
            </linearGradient>

            {/* Rotatable Disk Radial Sheen */}
            <radialGradient id={`${instanceId}_diskSheen`} cx="40%" cy="40%" r="65%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="45%" stopColor="#1e293b" />
              <stop offset="85%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>

            {/* Screen Surface White Cardboard */}
            <linearGradient id={`${instanceId}_screenMat`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>

            {/* Laser Beam Fan Gradient (Slit -> Screen) */}
            <linearGradient id={`${instanceId}_laserFan`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ff2222" stopOpacity={0.9 * beamOpacity} />
              <stop offset="15%" stopColor="#ff3333" stopOpacity={0.45 * beamOpacity} />
              <stop offset="60%" stopColor="#ff4444" stopOpacity={0.25 * beamOpacity} />
              <stop offset="100%" stopColor="#ff2222" stopOpacity={0.35 * beamOpacity} />
            </linearGradient>

            {/* Soft Laser Glow Filter */}
            <filter id={`${instanceId}_laserGlow`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* 1. OPTICAL RAIL (Rel Aluminium Presisi)                          */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* Ground Shadow */}
          <ellipse cx="430" cy="226" rx="400" ry="10" fill="#000000" opacity="0.6" />

          {/* Sturdy Leveling Feet / Brackets */}
          {/* Left Foot at x = 70 */}
          <path d="M 55,200 L 95,200 L 105,225 L 45,225 Z" fill="url(#railGrad)" stroke="#334155" strokeWidth="1" />
          <rect x="42" y="224" width="66" height="5" rx="1.5" fill="#0f172a" />
          <circle cx="55" cy="221" r="3" fill="#cbd5e1" stroke="#475569" />
          <circle cx="95" cy="221" r="3" fill="#cbd5e1" stroke="#475569" />

          {/* Right Foot at x = 770 */}
          <path d="M 745,200 L 785,200 L 795,225 L 735,225 Z" fill="url(#railGrad)" stroke="#334155" strokeWidth="1" />
          <rect x="732" y="224" width="66" height="5" rx="1.5" fill="#0f172a" />
          <circle cx="745" cy="221" r="3" fill="#cbd5e1" stroke="#475569" />
          <circle cx="785" cy="221" r="3" fill="#cbd5e1" stroke="#475569" />

          {/* Center Foot at x = 420 */}
          <path d="M 405,200 L 435,200 L 442,225 L 398,225 Z" fill="url(#railGrad)" stroke="#334155" strokeWidth="1" />
          <rect x="395" y="224" width="50" height="5" rx="1.5" fill="#0f172a" />

          {/* Main Aluminum Extrusion Bar (Length 760px, y = 175 to 202) */}
          <rect
            x="50"
            y="174"
            width="750"
            height="28"
            rx="2.5"
            fill="url(#railGrad)"
            stroke="#475569"
            strokeWidth="1.2"
          />

          {/* Top T-Slot Groove (Guide Track for Optical Carriers) */}
          <rect x="52" y="174" width="746" height="4" fill="#1e293b" />
          <line x1="52" y1="178" x2="798" y2="178" stroke="#f8fafc" strokeWidth="0.8" opacity="0.6" />

          {/* Longitudinal Side Channel */}
          <rect x="52" y="184" width="746" height="6" fill="#0f172a" opacity="0.5" />
          <line x1="52" y1="184" x2="798" y2="184" stroke="#334155" strokeWidth="1" />
          <line x1="52" y1="190" x2="798" y2="190" stroke="#64748b" strokeWidth="0.8" />

          {/* Precision Millimeter Scale Markings (0 cm to 200 cm) */}
          {Array.from({ length: 21 }).map((_, idx) => {
            const cm = idx * 10;
            const x = 60 + (cm / 200) * 720;
            const isMajor = cm % 20 === 0;
            return (
              <g key={cm}>
                <line
                  x1={x}
                  y1={178}
                  x2={x}
                  y2={isMajor ? 186 : 182}
                  stroke={isMajor ? "#0f172a" : "#334155"}
                  strokeWidth={isMajor ? 1.2 : 0.7}
                />
                {isMajor && (
                  <text
                    x={x}
                    y={198}
                    fill="#0f172a"
                    fontSize="7.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {cm}
                  </text>
                )}
              </g>
            );
          })}
          <text x="788" y="198" fill="#0f172a" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
            cm
          </text>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* 2. LASER BEAM PATH (RAY TRACING ALIGNED AT y = yOpt = 100)       */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {isLaserOn && (
            <g>
              {/* Beam Section 1: Collimated Ray (Laser Nozzle to Slit Wheel) */}
              {/* Outer Bloom Aura */}
              <line
                x1={xLaserAperture}
                y1={yOpt}
                x2={xSlit}
                y2={yOpt}
                stroke={laserColor}
                strokeWidth={5}
                opacity={0.45 * beamOpacity}
                filter={`url(#${instanceId}_laserGlow)`}
              />
              {/* Red Beam Core */}
              <line
                x1={xLaserAperture}
                y1={yOpt}
                x2={xSlit}
                y2={yOpt}
                stroke="#ff2222"
                strokeWidth={2.2}
                opacity={0.9 * beamOpacity}
              />
              {/* Hot White Filament */}
              <line
                x1={xLaserAperture}
                y1={yOpt}
                x2={xSlit}
                y2={yOpt}
                stroke="#ffffff"
                strokeWidth={0.8}
                opacity={0.95 * beamOpacity}
              />

              {/* Beam Section 2: Diverging Diffraction Fan (Slit Wheel to Screen) */}
              {/* The diffraction envelope spreads vertically towards the screen (y = yOpt - 30 to yOpt + 30) */}
              <polygon
                points={`${xSlit},${yOpt} ${xScreen},${yOpt - 32} ${xScreen},${yOpt + 32}`}
                fill={`url(#${instanceId}_laserFan)`}
              />

              {/* Central Intense Ray Line */}
              <line
                x1={xSlit}
                y1={yOpt}
                x2={xScreen}
                y2={yOpt}
                stroke={laserColor}
                strokeWidth={3}
                opacity={0.35 * beamOpacity}
                filter={`url(#${instanceId}_laserGlow)`}
              />
              <line
                x1={xSlit}
                y1={yOpt}
                x2={xScreen}
                y2={yOpt}
                stroke="#ff3333"
                strokeWidth={1.8}
                opacity={0.85 * beamOpacity}
              />
              <line
                x1={xSlit}
                y1={yOpt}
                x2={xScreen}
                y2={yOpt}
                stroke="#ffffff"
                strokeWidth={0.6}
                opacity={0.9 * beamOpacity}
              />

              {/* Diffraction Wavefront Guides (Subtle geometric arcs indicating wave nature) */}
              {[120, 240, 360].map((dist) => {
                const xPos = xSlit + dist;
                const halfH = (dist / (xScreen - xSlit)) * 26;
                return (
                  <path
                    key={dist}
                    d={`M ${xPos - 4},${yOpt - halfH} Q ${xPos + 6},${yOpt} ${xPos - 4},${yOpt + halfH}`}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth={0.6}
                    strokeDasharray="2 3"
                    opacity={0.35 * beamOpacity}
                  />
                );
              })}
            </g>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* 3. COMPONENT 1: LASER SOURCE MODULE (at x = 125)                 */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          <g transform="translate(100, 0)">
            {/* Optical Carrier Base on Rail (x = 25 in group) */}
            <rect x="10" y="166" width="34" height="12" rx="2" fill="url(#railGrad)" stroke="#334155" strokeWidth="1" />
            {/* Clamping Thumbscrew */}
            <circle cx="27" cy="182" r="5" fill={`url(#${instanceId}_brass)`} stroke="#78350f" strokeWidth="0.8" />
            <line x1="24" y1="182" x2="30" y2="182" stroke="#451a03" strokeWidth="1" />

            {/* Stainless Steel Support Rod */}
            <rect x="22" y="112" width="10" height="56" rx="1.5" fill="url(#railGrad)" stroke="#475569" strokeWidth="0.8" />
            {/* Rod Height Collar */}
            <rect x="20" y="125" width="14" height="6" rx="1" fill="#1e293b" stroke="#64748b" strokeWidth="0.6" />
            <circle cx="34" cy="128" r="2.5" fill={`url(#${instanceId}_brass)`} />

            {/* Laser Cylindrical Head (Centered vertically at y = yOpt = 100) */}
            {/* Main Laser Housing Body: y = 84 to 116, height = 32px */}
            <rect
              x="-10"
              y="84"
              width="68"
              height="32"
              rx="4"
              fill={`url(#${instanceId}_laserBarrel)`}
              stroke="#64748b"
              strokeWidth="1.2"
            />
            {/* Top metallic chamfer */}
            <rect x="-8" y="85" width="64" height="2" rx="1" fill="#94a3b8" opacity="0.4" />
            {/* Rear heatsink ribs */}
            <line x1="-5" y1="88" x2="-5" y2="112" stroke="#0f172a" strokeWidth="2" />
            <line x1="-1" y1="88" x2="-1" y2="112" stroke="#0f172a" strokeWidth="2" />

            {/* Front Aperture Collar */}
            <rect x="58" y="89" width="14" height="22" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="1" />
            {/* Gold/Brass Aperture Ring at x = 72 */}
            <rect x="72" y="93" width="4" height="14" rx="1" fill={`url(#${instanceId}_goldRing)`} />
            {/* Optical Emission Nozzle at (x = 75, y = 100) -> Global (175, 100) */}
            <circle
              cx="75"
              cy={yOpt}
              r={3}
              fill={isLaserOn ? "#ffffff" : "#475569"}
              stroke={isLaserOn ? "#ff2222" : "#1e293b"}
              strokeWidth={1.5}
            />

            {/* Power LED Indicator */}
            <circle
              cx="12"
              cy="92"
              r="2.5"
              fill={isLaserOn ? "#22c55e" : "#475569"}
              stroke={isLaserOn ? "#86efac" : "#1e293b"}
              strokeWidth={0.8}
            />

            {/* Laser Hazard Warning Label (Yellow/Black emblem) */}
            <rect x="22" y="90" width="22" height="10" rx="1.5" fill="#facc15" stroke="#ca8a04" strokeWidth="0.6" />
            <polygon points="28,98 33,91 38,98" fill="#000000" />
            <circle cx="33" cy="96" r="0.8" fill="#facc15" />

            {/* Text Labels */}
            <text x="24" y="112" fill="#94a3b8" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
              632nm
            </text>
            <text x="27" y="145" fill="#cbd5e1" fontSize="9" fontFamily="sans-serif" textAnchor="middle" fontWeight="500">
              Laser Semikonduktor
            </text>
          </g>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* 4. COMPONENT 2: ROTATABLE SLIT WHEEL (at x = 265, y = yOpt = 100) */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          <g transform={`translate(${xSlit}, 0)`}>
            {/* Optical Carrier Base on Rail */}
            <rect x="-17" y="166" width="34" height="12" rx="2" fill="url(#railGrad)" stroke="#334155" strokeWidth="1" />
            {/* Clamping Thumbscrew */}
            <circle cx="0" cy="182" r="5" fill={`url(#${instanceId}_brass)`} stroke="#78350f" strokeWidth="0.8" />
            <line x1="-3" y1="182" x2="3" y2="182" stroke="#451a03" strokeWidth="1" />

            {/* Stainless Steel Support Rod */}
            <rect x="-5" y="126" width="10" height="42" rx="1.5" fill="url(#railGrad)" stroke="#475569" strokeWidth="0.8" />
            {/* Rod Height Collar */}
            <rect x="-7" y="136" width="14" height="6" rx="1" fill="#1e293b" stroke="#64748b" strokeWidth="0.6" />
            <circle cx="7" cy="139" r="2.5" fill={`url(#${instanceId}_brass)`} />

            {/* Mounting Arm / Yoke */}
            <path
              d="M -4,126 L -4,115 L 0,110 L 4,115 L 4,126 Z"
              fill="#334155"
              stroke="#64748b"
              strokeWidth="0.8"
            />

            {/* Circular Slit Disk (Outer Knurled Rim, Radius = 30px) */}
            <circle cx="0" cy={yOpt} r="31" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2.5" />
            {/* Knurled Ridges around Outer Rim */}
            {Array.from({ length: 24 }).map((_, i) => {
              const ang = (i * 360) / 24;
              const rad = (ang * Math.PI) / 180;
              const x1 = Math.cos(rad) * 29;
              const y1 = yOpt + Math.sin(rad) * 29;
              const x2 = Math.cos(rad) * 31;
              const y2 = yOpt + Math.sin(rad) * 31;
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#64748b" strokeWidth="1" />;
            })}

            {/* Inner Metallic Slit Disk Body */}
            <circle cx="0" cy={yOpt} r="26" fill={`url(#${instanceId}_diskSheen)`} stroke="#475569" strokeWidth="1.2" />

            {/* Auxiliary Slit Windows around the wheel (representing multiple presets) */}
            {/* Window Top (Active) at (0, yOpt) */}
            <rect x="-3" y={yOpt - 10} width="6" height="20" rx="1" fill="#000000" stroke="#94a3b8" strokeWidth="0.8" />
            {/* Fine Slit Lines at center */}
            <line x1="-1" y1={yOpt - 8} x2="-1" y2={yOpt + 8} stroke={isLaserOn ? "#ffffff" : "#475569"} strokeWidth="0.8" />
            <line x1="1" y1={yOpt - 8} x2="1" y2={yOpt + 8} stroke={isLaserOn ? "#ffffff" : "#475569"} strokeWidth="0.8" />

            {/* Window Left */}
            <rect x="-21" y={yOpt - 3} width="12" height="6" rx="1" fill="#090d16" stroke="#475569" strokeWidth="0.5" />
            {/* Window Right */}
            <rect x="9" y={yOpt - 3} width="12" height="6" rx="1" fill="#090d16" stroke="#475569" strokeWidth="0.5" />

            {/* Disk Center Hub */}
            <circle cx="0" cy={yOpt} r="6" fill="url(#railGrad)" stroke="#334155" strokeWidth="1" />
            <circle cx="0" cy={yOpt} r="2.5" fill="#0f172a" />

            {/* Active Position Indicator Triangle */}
            <polygon points="-4,65 4,65 0,70" fill="#38bdf8" />

            {/* Labels */}
            <rect x="-38" y="50" width="76" height="15" rx="3" fill="#020617" stroke="#38bdf8" strokeWidth="1" opacity="0.9" />
            <text x="0" y="61" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              {currentSlit.name}
            </text>

            <text x="0" y="152" fill="#cbd5e1" fontSize="9" fontFamily="sans-serif" textAnchor="middle" fontWeight="500">
              Set Celah Pemutar
            </text>
          </g>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* 5. COMPONENT 3: PROJECTION SCREEN (at x = 740, y = yOpt = 100)   */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          <g transform={`translate(${xScreen}, 0)`}>
            {/* Optical Carrier Base on Rail */}
            <rect x="-17" y="166" width="34" height="12" rx="2" fill="url(#railGrad)" stroke="#334155" strokeWidth="1" />
            {/* Clamping Thumbscrew */}
            <circle cx="0" cy="182" r="5" fill={`url(#${instanceId}_brass)`} stroke="#78350f" strokeWidth="0.8" />
            <line x1="-3" y1="182" x2="3" y2="182" stroke="#451a03" strokeWidth="1" />

            {/* Stainless Steel Support Rod */}
            <rect x="-5" y="145" width="10" height="23" rx="1.5" fill="url(#railGrad)" stroke="#475569" strokeWidth="0.8" />

            {/* Sturdy Screen Holder Plate (Centered at y = yOpt = 100) */}
            {/* Height = 104px (y = 48 to 152), Width = 38px (x = -19 to +19) */}
            <rect
              x="-19"
              y="48"
              width="38"
              height="104"
              rx="3"
              fill="#0f172a"
              stroke="#475569"
              strokeWidth="1.5"
            />
            {/* Screen Inner Frame */}
            <rect
              x="-16"
              y="51"
              width="32"
              height="98"
              rx="1.5"
              fill="#1e293b"
              stroke="#334155"
              strokeWidth="0.8"
            />

            {/* Millimeter Block Paper Sheet */}
            <rect
              x="-13"
              y="54"
              width="26"
              height="92"
              rx="1"
              fill="#f8fafc"
              stroke="#cbd5e1"
              strokeWidth="0.5"
            />

            {/* Millimeter Grid Texture on Screen Paper */}
            {[-35, -25, -15, -5, 5, 15, 25, 35].map((offset) => (
              <line
                key={offset}
                x1="-13"
                y1={yOpt + offset}
                x2="13"
                y2={yOpt + offset}
                stroke="#94a3b8"
                strokeWidth={offset === 0 ? 0.8 : 0.4}
                opacity={offset === 0 ? 0.9 : 0.45}
              />
            ))}
            {/* Vertical Center Line on Paper */}
            <line x1="0" y1="54" x2="0" y2="146" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6" />

            {/* Top and Bottom Spring Paper Clips */}
            <rect x="-8" y="52" width="16" height="4" rx="1" fill="#64748b" stroke="#334155" strokeWidth="0.5" />
            <rect x="-8" y="142" width="16" height="4" rx="1" fill="#64748b" stroke="#334155" strokeWidth="0.5" />

            {/* ── Realistic Laser Diffraction Pattern Projected on Screen ── */}
            {isLaserOn && (
              <g>
                {/* Central Principal Maximum (T0) at (0, yOpt = 100) */}
                <ellipse
                  cx="0"
                  cy={yOpt}
                  rx="6.5"
                  ry="9"
                  fill="#ff2222"
                  opacity={0.9 * beamOpacity}
                  filter={`url(#${instanceId}_laserGlow)`}
                />
                <ellipse
                  cx="0"
                  cy={yOpt}
                  rx="3.5"
                  ry="5"
                  fill="#ffffff"
                  opacity={0.95 * beamOpacity}
                />

                {/* Vertical Secondary & Primary Fringes on the Screen (Symmetric +/- y) */}
                {/* For Celah II (N=2): distinct fringes */}
                {currentSlit.N === 2 && (
                  <g>
                    {[-18, 18].map((dy) => (
                      <ellipse
                        key={dy}
                        cx="0"
                        cy={yOpt + dy}
                        rx="4.5"
                        ry="6"
                        fill="#ff3333"
                        opacity={0.7 * beamOpacity}
                      />
                    ))}
                  </g>
                )}

                {/* For Celah III (N=3): primary fringes + 1 secondary fringe */}
                {currentSlit.N === 3 && (
                  <g>
                    {[-10, 10].map((dy) => (
                      <ellipse
                        key={`sec-${dy}`}
                        cx="0"
                        cy={yOpt + dy}
                        rx="2.5"
                        ry="3.5"
                        fill="#ff4444"
                        opacity={0.35 * beamOpacity}
                      />
                    ))}
                    {[-20, 20].map((dy) => (
                      <ellipse
                        key={`pri-${dy}`}
                        cx="0"
                        cy={yOpt + dy}
                        rx="4.5"
                        ry="6"
                        fill="#ff3333"
                        opacity={0.75 * beamOpacity}
                      />
                    ))}
                  </g>
                )}

                {/* For Celah IIIII (N=5): primary fringes + 3 secondary fringes */}
                {currentSlit.N === 5 && (
                  <g>
                    {[-6, -12, 6, 12].map((dy) => (
                      <ellipse
                        key={`sec-${dy}`}
                        cx="0"
                        cy={yOpt + dy}
                        rx="2"
                        ry="2.5"
                        fill="#ff5555"
                        opacity={0.25 * beamOpacity}
                      />
                    ))}
                    {[-20, 20].map((dy) => (
                      <ellipse
                        key={`pri-${dy}`}
                        cx="0"
                        cy={yOpt + dy}
                        rx="4"
                        ry="5.5"
                        fill="#ff3333"
                        opacity={0.8 * beamOpacity}
                      />
                    ))}
                  </g>
                )}
              </g>
            )}

            {/* Screen Header & Footer Labels */}
            <rect x="-24" y="30" width="48" height="15" rx="3" fill="#020617" stroke="#38bdf8" strokeWidth="1" opacity="0.9" />
            <text x="0" y="41" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              Layar
            </text>

            <text x="0" y="162" fill="#cbd5e1" fontSize="9" fontFamily="sans-serif" textAnchor="middle" fontWeight="500">
              Kertas mm
            </text>
          </g>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* 6. ENGINEERING DIMENSION LINE: DISTANCE L = 1.60 m               */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          <g>
            {/* Left Vertical Extension Line from Slit Wheel */}
            <line x1={xSlit} y1="36" x2={xSlit} y2="80" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.5" />
            {/* Right Vertical Extension Line from Screen */}
            <line x1={xScreen} y1="36" x2={xScreen} y2="80" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.5" />

            {/* Horizontal Dimension Line */}
            <line x1={xSlit + 8} y1="26" x2={xScreen - 8} y2="26" stroke="#38bdf8" strokeWidth="1.2" />

            {/* Dimension Arrows */}
            <polygon points={`${xSlit},26 ${xSlit + 9},22 ${xSlit + 9},30`} fill="#38bdf8" />
            <polygon points={`${xScreen},26 ${xScreen - 9},22 ${xScreen - 9},30`} fill="#38bdf8" />

            {/* Frosted Glass Pill Badge */}
            <rect
              x={(xSlit + xScreen) / 2 - 50}
              y="14"
              width="100"
              height="24"
              rx="6"
              fill="#060913"
              stroke="#06b6d4"
              strokeWidth="1.2"
              className="shadow-lg"
            />
            <text
              x={(xSlit + xScreen) / 2}
              y="30"
              fill="#38bdf8"
              fontSize="11"
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              L = {distanceL.toFixed(2)} m
            </text>
          </g>
        </svg>
      </div>

      {/* ── Slit Presets Selector Bar ── */}
      {onSelectSlit && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/80 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-semibold text-xs">Pilih Piringan Celah:</span>
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
                  className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold border transition-all duration-150 flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm shadow-cyan-500/20 scale-105"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>
                    {def.name} (N={def.N})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-[11px] font-mono text-slate-400 bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800/80">
            N = <span className="text-cyan-300 font-bold">{currentSlit.N}</span> celah | a ={" "}
            <span className="text-slate-200">{(currentSlit.a * 1e3).toFixed(2)} mm</span> | d ={" "}
            <span className="text-slate-200">{(currentSlit.d * 1e3).toFixed(2)} mm</span>
          </div>
        </div>
      )}
    </div>
  );
}
