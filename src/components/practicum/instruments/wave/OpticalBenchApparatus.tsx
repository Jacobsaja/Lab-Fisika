"use client";

import React, { useId, useMemo } from "react";
import {
  DEFAULT_LASER_WAVELENGTH,
  DEFAULT_SCREEN_DISTANCE_L,
  SSG_SLIT_PRESETS,
} from "@/physics/waveOptics";
import { Power, Sliders, Layers, Check, Sparkles } from "lucide-react";

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
 * Concept B: 2.5D Pseudo-Isometric Laboratory Optical Bench (Bangku Optik 2.5D).
 *
 * Immersive 3D-perspective features:
 * - Extruded 2.5D aluminum optical rail with bevels, longitudinal guide slot, and printed millimeter scale.
 * - Solid optical carriers with knurled brass thumbscrews riding on the track.
 * - 2.5D cylindrical laser source with warning hazard plate, status LED, and aperture collar.
 * - Rotatable slit wheel with knurled rim and index windows that physically rotates when switching slits.
 * - Angled screen holder showing the front surface of the millimeter paper with live Fraunhofer diffraction fringes.
 * - Perfectly aligned optical axis (Laser -> Slit Center -> Screen Center).
 * - Volumetric laser beam glow with realistic dust scattering in a darkroom lab atmosphere.
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

  // Optical axis height in 2.5D canvas
  const yOpt = 108;

  // Key horizontal coordinates along the bench
  const xLaserNozzle = 195;
  const xSlit = 285;
  const xScreen = 735;

  // Slit disk rotation angle based on active slit
  const diskRotationDeg = useMemo(() => {
    switch (slitKey) {
      case "slit2":
        return 0;
      case "slit3":
        return 72;
      case "slit5":
        return 144;
      default:
        return 0;
    }
  }, [slitKey]);

  const beamOpacity = isLaserOn ? Math.max(0.12, dimmer) : 0;

  return (
    <div className={`p-4 rounded-xl glass-panel border border-slate-800 flex flex-col gap-4 text-xs ${className}`}>
      {/* ── Top Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/10">
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
                    ? "bg-rose-950/60 border-rose-500/50 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.25)]"
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
              Tampilan 2.5D Meja Laboratorium: rel aluminium ekstrusi, piringan celah rotatif, dan layar proyeksi berskala
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

      {/* ── Main 2.5D Isometric SVG Canvas ── */}
      <div className="relative w-full bg-gradient-to-b from-[#030712] via-[#050b18] to-[#02050e] rounded-xl p-3 overflow-hidden border border-slate-800/90 shadow-2xl">
        <svg
          viewBox="0 0 900 290"
          className="w-full h-auto block select-none"
          style={{ filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.6))" }}
        >
          <defs>
            {/* Dark Lab Bench Floor Ambient Grid */}
            <linearGradient id={`${instanceId}_tableShadow`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#000000" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </linearGradient>

            {/* Extruded Aluminum Rail Gradients (Top, Front, Side) */}
            <linearGradient id={`${instanceId}_railTop`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="25%" stopColor="#e2e8f0" />
              <stop offset="60%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>

            <linearGradient id={`${instanceId}_railFront`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="20%" stopColor="#94a3b8" />
              <stop offset="60%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            <linearGradient id={`${instanceId}_railEnd`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Brass Knurled Thumbscrews */}
            <linearGradient id={`${instanceId}_brass3D`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#451a03" />
            </linearGradient>

            {/* Laser Diode Housing (Metallic Deep Blue-Black Anodized) */}
            <linearGradient id={`${instanceId}_laserCylinder`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="30%" stopColor="#64748b" />
              <stop offset="55%" stopColor="#1e293b" />
              <stop offset="85%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Laser Front Aperture Cone */}
            <linearGradient id={`${instanceId}_nozzleCone`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>

            {/* Slit Disk Brushed Sheen */}
            <radialGradient id={`${instanceId}_diskRadial`} cx="45%" cy="45%" r="60%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="40%" stopColor="#334155" />
              <stop offset="80%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#090d16" />
            </radialGradient>

            {/* Screen Paper Material */}
            <linearGradient id={`${instanceId}_screenPaper`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="40%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>

            {/* Volumetric Laser Diffraction Fan */}
            <linearGradient id={`${instanceId}_fanGrad`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9 * beamOpacity} />
              <stop offset="20%" stopColor="#f43f5e" stopOpacity={0.45 * beamOpacity} />
              <stop offset="65%" stopColor="#ff2222" stopOpacity={0.22 * beamOpacity} />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.35 * beamOpacity} />
            </linearGradient>

            {/* Stainless Steel Support Post Gradient */}
            <linearGradient id={`${instanceId}_postGrad`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="35%" stopColor="#cbd5e1" />
              <stop offset="70%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Laser Glow Filter */}
            <filter id={`${instanceId}_beamBlur`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* 1. TABLE TOP LAB AMBIENCE & RAIL GROUND SHADOW                  */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* Faint Grid Texture of Black Epoxy Lab Bench */}
          <path
            d="M 40,265 L 860,265 M 70,245 L 830,245 M 100,225 L 800,225"
            stroke="#1e293b"
            strokeWidth="0.5"
            strokeDasharray="4 8"
            opacity="0.3"
          />

          {/* Deep Ambient Drop Shadow under the Rail */}
          <polygon
            points="65,248 835,248 870,262 100,262"
            fill={`url(#${instanceId}_tableShadow)`}
            opacity="0.5"
          />
          <ellipse cx="450" cy="254" rx="390" ry="10" fill="#000000" opacity="0.65" />

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* 2. 2.5D EXTRUDED ALUMINUM OPTICAL RAIL (Length 760px)            */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* Leveling Feet Brackets (Anchoring rail to lab table) */}
          {/* Left Foot at X = 120 */}
          <g transform="translate(105, 222)">
            <rect x="0" y="8" width="40" height="20" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <circle cx="8" cy="22" r="4.5" fill={`url(#${instanceId}_brass3D)`} stroke="#451a03" strokeWidth="0.8" />
            <circle cx="32" cy="22" r="4.5" fill={`url(#${instanceId}_brass3D)`} stroke="#451a03" strokeWidth="0.8" />
          </g>

          {/* Right Foot at X = 740 */}
          <g transform="translate(725, 222)">
            <rect x="0" y="8" width="40" height="20" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <circle cx="8" cy="22" r="4.5" fill={`url(#${instanceId}_brass3D)`} stroke="#451a03" strokeWidth="0.8" />
            <circle cx="32" cy="22" r="4.5" fill={`url(#${instanceId}_brass3D)`} stroke="#451a03" strokeWidth="0.8" />
          </g>

          {/* Rail Front Face (Vertical Extrusion, y = 208 to 234) */}
          <polygon
            points="70,208 810,208 810,234 70,234"
            fill={`url(#${instanceId}_railFront)`}
            stroke="#475569"
            strokeWidth="1"
          />
          {/* Front Bevel Highlight */}
          <line x1="70" y1="209" x2="810" y2="209" stroke="#f8fafc" strokeWidth="1" opacity="0.8" />

          {/* Rail Top Face (Isometric Extrusion, skewed back: y = 192 to 208) */}
          <polygon
            points="70,208 810,208 845,192 105,192"
            fill={`url(#${instanceId}_railTop)`}
            stroke="#475569"
            strokeWidth="1"
          />

          {/* Rail Left End Profile (Oblique Cut) */}
          <polygon
            points="70,208 105,192 105,218 70,234"
            fill={`url(#${instanceId}_railEnd)`}
            stroke="#334155"
            strokeWidth="1"
          />

          {/* Rail Right End Profile (Oblique Cut) */}
          <polygon
            points="810,208 845,192 845,218 810,234"
            fill={`url(#${instanceId}_railEnd)`}
            stroke="#334155"
            strokeWidth="1"
          />

          {/* Central T-Slot Guide Channel (Where optical carriers slide) */}
          <polygon
            points="85,201 825,201 835,197 95,197"
            fill="#0f172a"
            stroke="#1e293b"
            strokeWidth="0.8"
          />
          <line x1="86" y1="202" x2="826" y2="202" stroke="#ffffff" strokeWidth="0.6" opacity="0.5" />

          {/* Precision Centimeter Scale on Front Face (0 to 200 cm) */}
          {Array.from({ length: 21 }).map((_, idx) => {
            const cm = idx * 10;
            const x = 80 + (cm / 200) * 715;
            const isMajor = cm % 20 === 0;
            return (
              <g key={cm}>
                <line
                  x1={x}
                  y1={209}
                  x2={x}
                  y2={isMajor ? 219 : 214}
                  stroke={isMajor ? "#0f172a" : "#334155"}
                  strokeWidth={isMajor ? 1.3 : 0.7}
                />
                {isMajor && (
                  <text
                    x={x}
                    y={228}
                    fill="#0f172a"
                    fontSize="8"
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
          <text x="798" y="228" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="bold">
            cm
          </text>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* 3. VOLUMETRIC LASER BEAM (PERFECTLY ALIGNED AT y = yOpt = 108)   */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {isLaserOn && (
            <g>
              {/* Beam Section 1: Collimated Ray (Laser Nozzle to Slit Center) */}
              {/* Soft Radial Ambient Scatter Glow */}
              <line
                x1={xLaserNozzle}
                y1={yOpt}
                x2={xSlit}
                y2={yOpt}
                stroke="#ff2222"
                strokeWidth={7}
                opacity={0.45 * beamOpacity}
                filter={`url(#${instanceId}_beamBlur)`}
              />
              {/* Bright Core Red Ray */}
              <line
                x1={xLaserNozzle}
                y1={yOpt}
                x2={xSlit}
                y2={yOpt}
                stroke="#ff1111"
                strokeWidth={2.6}
                opacity={0.9 * beamOpacity}
              />
              {/* Intense White Filament Core */}
              <line
                x1={xLaserNozzle}
                y1={yOpt}
                x2={xSlit}
                y2={yOpt}
                stroke="#ffffff"
                strokeWidth={1}
                opacity={0.95 * beamOpacity}
              />

              {/* Beam Section 2: Diverging Diffraction Cone (Slit to Screen) */}
              {/* Spreads vertically onto the screen plate (from yOpt - 32 to yOpt + 32) */}
              <polygon
                points={`${xSlit},${yOpt} ${xScreen},${yOpt - 34} ${xScreen},${yOpt + 34}`}
                fill={`url(#${instanceId}_fanGrad)`}
              />

              {/* Central Direct Ray Line */}
              <line
                x1={xSlit}
                y1={yOpt}
                x2={xScreen}
                y2={yOpt}
                stroke="#ff2222"
                strokeWidth={3}
                opacity={0.4 * beamOpacity}
                filter={`url(#${instanceId}_beamBlur)`}
              />
              <line
                x1={xSlit}
                y1={yOpt}
                x2={xScreen}
                y2={yOpt}
                stroke="#ff3333"
                strokeWidth={2}
                opacity={0.85 * beamOpacity}
              />
              <line
                x1={xSlit}
                y1={yOpt}
                x2={xScreen}
                y2={yOpt}
                stroke="#ffffff"
                strokeWidth={0.8}
                opacity={0.9 * beamOpacity}
              />

              {/* Optical Diffraction Wavefront Arcs (Geometric curvature) */}
              {[110, 220, 330].map((dist) => {
                const xPos = xSlit + dist;
                const fanHalfH = (dist / (xScreen - xSlit)) * 28;
                return (
                  <path
                    key={dist}
                    d={`M ${xPos - 5},${yOpt - fanHalfH} Q ${xPos + 8},${yOpt} ${xPos - 5},${yOpt + fanHalfH}`}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth={0.7}
                    strokeDasharray="2 3"
                    opacity={0.35 * beamOpacity}
                  />
                );
              })}
            </g>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* 4. COMPONENT 1: 2.5D LASER MODULE (at X = 150)                   */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          <g transform="translate(130, 0)">
            {/* 3D Carrier Base Saddle on Track */}
            <polygon points="5,196 45,196 52,188 12,188" fill="#475569" stroke="#334155" strokeWidth="0.8" />
            <polygon points="5,196 45,196 45,206 5,206" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
            {/* Knurled Brass Thumbscrew */}
            <circle cx="25" cy="201" r="5" fill={`url(#${instanceId}_brass3D)`} stroke="#451a03" strokeWidth="0.8" />
            <line x1="22" y1="201" x2="28" y2="201" stroke="#451a03" strokeWidth="1" />

            {/* Stainless Steel Support Post */}
            <rect x="20" y="122" width="10" height="68" rx="1.5" fill={`url(#${instanceId}_postGrad)`} stroke="#475569" strokeWidth="0.8" />
            {/* Height Adjustment Collar */}
            <rect x="18" y="136" width="14" height="7" rx="1.5" fill="#1e293b" stroke="#64748b" strokeWidth="0.7" />
            <circle cx="32" cy="139" r="2.5" fill={`url(#${instanceId}_brass3D)`} />

            {/* 2.5D Laser Main Housing (Centered at yOpt = 108) */}
            {/* Top Surface (3D depth) */}
            <polygon
              points="-12,92 56,92 65,84 -3,84"
              fill="#475569"
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* Front Face of Housing (y = 92 to 124, height = 32px) */}
            <rect
              x="-12"
              y="92"
              width="68"
              height="32"
              rx="3"
              fill={`url(#${instanceId}_laserCylinder)`}
              stroke="#64748b"
              strokeWidth="1.2"
            />
            {/* Right End Face of Housing */}
            <polygon
              points="56,92 65,84 65,116 56,124"
              fill="#1e293b"
              stroke="#475569"
              strokeWidth="1"
            />

            {/* Cooling Heatsink Ribs */}
            <line x1="-6" y1="96" x2="-6" y2="120" stroke="#0f172a" strokeWidth="2" />
            <line x1="-1" y1="96" x2="-1" y2="120" stroke="#0f172a" strokeWidth="2" />

            {/* Laser Warning Triangle (Yellow/Black) */}
            <rect x="15" y="97" width="22" height="11" rx="1.5" fill="#facc15" stroke="#ca8a04" strokeWidth="0.7" />
            <polygon points="21,106 26,98 31,106" fill="#000000" />
            <circle cx="26" cy="104" r="0.8" fill="#facc15" />

            {/* Power LED Indicator */}
            <circle
              cx="5"
              cy="98"
              r="2.5"
              fill={isLaserOn ? "#22c55e" : "#475569"}
              stroke={isLaserOn ? "#86efac" : "#1e293b"}
              strokeWidth={0.8}
            />

            {/* Front Aperture Nozzle Assembly (Centered at y = yOpt = 108) */}
            <rect x="56" y="97" width="6" height="22" rx="1.5" fill="#334155" stroke="#475569" strokeWidth="0.8" />
            <polygon points="62,99 71,102 71,114 62,117" fill={`url(#${instanceId}_nozzleCone)`} stroke="#64748b" strokeWidth="0.8" />
            {/* Gold Ring & Emission Diode at x = 65 in group -> Global x = 195 */}
            <rect x="63" y="101" width="3" height="14" rx="0.8" fill={`url(#${instanceId}_brass3D)`} />
            <circle
              cx="65"
              cy={yOpt}
              r={3}
              fill={isLaserOn ? "#ffffff" : "#334155"}
              stroke={isLaserOn ? "#ff2222" : "#1e293b"}
              strokeWidth={1.5}
            />

            {/* Equipment Name Label */}
            <text x="25" y="148" fill="#cbd5e1" fontSize="9" fontFamily="sans-serif" textAnchor="middle" fontWeight="600">
              Laser 632nm
            </text>
          </g>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* 5. COMPONENT 2: ROTATABLE SLIT DISK (at X = 285)                 */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          <g transform={`translate(${xSlit}, 0)`}>
            {/* 3D Carrier Base Saddle on Track */}
            <polygon points="-20,196 20,196 27,188 -13,188" fill="#475569" stroke="#334155" strokeWidth="0.8" />
            <polygon points="-20,196 20,196 20,206 -20,206" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
            {/* Knurled Brass Thumbscrew */}
            <circle cx="0" cy="201" r="5" fill={`url(#${instanceId}_brass3D)`} stroke="#451a03" strokeWidth="0.8" />
            <line x1="-3" y1="201" x2="3" y2="201" stroke="#451a03" strokeWidth="1" />

            {/* Stainless Steel Support Post */}
            <rect x="-5" y="132" width="10" height="58" rx="1.5" fill={`url(#${instanceId}_postGrad)`} stroke="#475569" strokeWidth="0.8" />
            {/* Height Collar */}
            <rect x="-7" y="144" width="14" height="7" rx="1.5" fill="#1e293b" stroke="#64748b" strokeWidth="0.7" />
            <circle cx="7" cy="147" r="2.5" fill={`url(#${instanceId}_brass3D)`} />

            {/* Yoke / Bracket Mounting */}
            <path d="M -4,132 L -4,120 L 0,116 L 4,120 L 4,132 Z" fill="#334155" stroke="#64748b" strokeWidth="0.8" />

            {/* ── Rotatable Disk Assembly (Rotates with CSS transform) ── */}
            <g
              style={{
                transformOrigin: `0px ${yOpt}px`,
                transform: `rotate(${diskRotationDeg}deg)`,
                transition: "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              {/* Outer Knurled Rim Disk */}
              <circle cx="0" cy={yOpt} r="32" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2.5" />
              {/* Knurled Grooves */}
              {Array.from({ length: 24 }).map((_, i) => {
                const ang = (i * 360) / 24;
                const rad = (ang * Math.PI) / 180;
                return (
                  <line
                    key={i}
                    x1={Math.cos(rad) * 30}
                    y1={yOpt + Math.sin(rad) * 30}
                    x2={Math.cos(rad) * 32}
                    y2={yOpt + Math.sin(rad) * 32}
                    stroke="#94a3b8"
                    strokeWidth={1}
                  />
                );
              })}

              {/* Inner Metallic Slit Disk Face */}
              <circle cx="0" cy={yOpt} r="27" fill={`url(#${instanceId}_diskRadial)`} stroke="#475569" strokeWidth="1.2" />

              {/* Five Aperture Windows around the disk (72° apart) */}
              {[0, 72, 144, 216, 288].map((ang, idx) => {
                const rad = (ang * Math.PI) / 180;
                const wx = Math.cos(rad) * 16;
                const wy = yOpt + Math.sin(rad) * 16;
                return (
                  <g key={ang} transform={`rotate(${ang}, 0, ${yOpt})`}>
                    <rect x="-3.5" y={yOpt - 23} width="7" height="14" rx="1.5" fill="#000000" stroke="#94a3b8" strokeWidth="0.8" />
                    {/* Microscopic Slit Lines inside active aperture */}
                    <line x1="-1.2" y1={yOpt - 21} x2="-1.2" y2={yOpt - 11} stroke={isLaserOn ? "#ffffff" : "#64748b"} strokeWidth={0.8} />
                    <line x1="1.2" y1={yOpt - 21} x2="1.2" y2={yOpt - 11} stroke={isLaserOn ? "#ffffff" : "#64748b"} strokeWidth={0.8} />
                  </g>
                );
              })}

              {/* Center Hub */}
              <circle cx="0" cy={yOpt} r="6.5" fill={`url(#${instanceId}_postGrad)`} stroke="#334155" strokeWidth="1" />
              <circle cx="0" cy={yOpt} r="2.5" fill="#0f172a" />
            </g>

            {/* Static Index Pointer (Indicates currently aligned top aperture) */}
            <polygon points="-4,71 4,71 0,77" fill="#38bdf8" />

            {/* Floating Info Badge for Current Slit */}
            <g transform="translate(0, 52)">
              <rect x="-42" y="0" width="84" height="17" rx="4" fill="#020617" stroke="#38bdf8" strokeWidth="1.2" />
              <text x="0" y="12" fill="#38bdf8" fontSize="9.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                {currentSlit.name}
              </text>
            </g>

            <text x="0" y="158" fill="#cbd5e1" fontSize="9" fontFamily="sans-serif" textAnchor="middle" fontWeight="600">
              Set Celah
            </text>
          </g>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* 6. COMPONENT 3: 2.5D PROJECTION SCREEN (at X = 735)              */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          <g transform={`translate(${xScreen}, 0)`}>
            {/* 3D Carrier Base Saddle on Track */}
            <polygon points="-20,196 20,196 27,188 -13,188" fill="#475569" stroke="#334155" strokeWidth="0.8" />
            <polygon points="-20,196 20,196 20,206 -20,206" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
            {/* Knurled Brass Thumbscrew */}
            <circle cx="0" cy="201" r="5" fill={`url(#${instanceId}_brass3D)`} stroke="#451a03" strokeWidth="0.8" />
            <line x1="-3" y1="201" x2="3" y2="201" stroke="#451a03" strokeWidth="1" />

            {/* Stainless Steel Support Post */}
            <rect x="-5" y="146" width="10" height="44" rx="1.5" fill={`url(#${instanceId}_postGrad)`} stroke="#475569" strokeWidth="0.8" />

            {/* 2.5D Angled Screen Holder Plate (Facing ~20° towards camera) */}
            {/* Outer Sturdy Metal Frame */}
            <polygon
              points="-20,48 20,48 28,42 -12,42"
              fill="#334155"
              stroke="#64748b"
              strokeWidth="1"
            />
            <rect
              x="-20"
              y="48"
              width="40"
              height="106"
              rx="3"
              fill="#0f172a"
              stroke="#475569"
              strokeWidth="1.5"
            />
            {/* Right Face of Plate Frame */}
            <polygon
              points="20,48 28,42 28,148 20,154"
              fill="#1e293b"
              stroke="#334155"
              strokeWidth="1"
            />

            {/* Inner Millimeter Block Paper Sheet (Clean Ivory/White surface) */}
            <rect
              x="-15"
              y="53"
              width="30"
              height="96"
              rx="1.5"
              fill={`url(#${instanceId}_screenPaper)`}
              stroke="#cbd5e1"
              strokeWidth="0.6"
            />

            {/* Millimeter Grid Texture on Screen Paper */}
            {[-36, -24, -12, 0, 12, 24, 36].map((offset) => (
              <line
                key={offset}
                x1="-15"
                y1={yOpt + offset}
                x2="15"
                y2={yOpt + offset}
                stroke="#06b6d4"
                strokeWidth={offset === 0 ? 0.9 : 0.4}
                opacity={offset === 0 ? 0.9 : 0.35}
              />
            ))}
            {/* Vertical Center Alignment Axis */}
            <line x1="0" y1="53" x2="0" y2="149" stroke="#06b6d4" strokeWidth="0.8" opacity="0.6" />

            {/* Metal Paper Spring Clips */}
            <rect x="-9" y="50" width="18" height="4.5" rx="1.2" fill="#64748b" stroke="#334155" strokeWidth="0.6" />
            <rect x="-9" y="145" width="18" height="4.5" rx="1.2" fill="#64748b" stroke="#334155" strokeWidth="0.6" />

            {/* ── LIVE PHYSICAL DIFFRACTION PATTERN ON SCREEN (At y = yOpt = 108) ── */}
            {isLaserOn && (
              <g>
                {/* Central Principal Maximum (T0) */}
                <ellipse
                  cx="0"
                  cy={yOpt}
                  rx="7"
                  ry="9.5"
                  fill="#ff2222"
                  opacity={0.9 * beamOpacity}
                  filter={`url(#${instanceId}_beamBlur)`}
                />
                <ellipse
                  cx="0"
                  cy={yOpt}
                  rx="3.5"
                  ry="5"
                  fill="#ffffff"
                  opacity={0.95 * beamOpacity}
                />

                {/* Vertical Secondary & Primary Fringes matching active slit */}
                {/* For Celah II (N=2) */}
                {currentSlit.N === 2 && (
                  <g>
                    {[-18, 18].map((dy) => (
                      <ellipse
                        key={dy}
                        cx="0"
                        cy={yOpt + dy}
                        rx="5"
                        ry="6.5"
                        fill="#ff3333"
                        opacity={0.75 * beamOpacity}
                      />
                    ))}
                  </g>
                )}

                {/* For Celah III (N=3): 1 secondary between primaries */}
                {currentSlit.N === 3 && (
                  <g>
                    {[-10, 10].map((dy) => (
                      <ellipse
                        key={`sec-${dy}`}
                        cx="0"
                        cy={yOpt + dy}
                        rx="3"
                        ry="4"
                        fill="#ff5555"
                        opacity={0.38 * beamOpacity}
                      />
                    ))}
                    {[-20, 20].map((dy) => (
                      <ellipse
                        key={`pri-${dy}`}
                        cx="0"
                        cy={yOpt + dy}
                        rx="5"
                        ry="6.5"
                        fill="#ff3333"
                        opacity={0.75 * beamOpacity}
                      />
                    ))}
                  </g>
                )}

                {/* For Celah IIIII (N=5): 3 secondaries between primaries */}
                {currentSlit.N === 5 && (
                  <g>
                    {[-6, -12, 6, 12].map((dy) => (
                      <ellipse
                        key={`sec-${dy}`}
                        cx="0"
                        cy={yOpt + dy}
                        rx="2.2"
                        ry="3"
                        fill="#ff5555"
                        opacity={0.28 * beamOpacity}
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
                        opacity={0.8 * beamOpacity}
                      />
                    ))}
                  </g>
                )}
              </g>
            )}

            {/* Screen Top Header Tag */}
            <g transform="translate(0, 28)">
              <rect x="-26" y="0" width="52" height="16" rx="4" fill="#020617" stroke="#38bdf8" strokeWidth="1.2" />
              <text x="0" y="11" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                Layar
              </text>
            </g>

            <text x="0" y="168" fill="#cbd5e1" fontSize="9" fontFamily="sans-serif" textAnchor="middle" fontWeight="600">
              Kertas mm
            </text>
          </g>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* 7. FLOATING 3D DIMENSION CALLOUT: L = 1.60 m                     */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          <g>
            {/* Slit Projection Leader Line */}
            <line x1={xSlit} y1="36" x2={xSlit} y2="84" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
            {/* Screen Projection Leader Line */}
            <line x1={xScreen} y1="36" x2={xScreen} y2="84" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />

            {/* Horizontal Dimension Ray */}
            <line x1={xSlit + 10} y1="26" x2={xScreen - 10} y2="26" stroke="#38bdf8" strokeWidth="1.4" />
            <polygon points={`${xSlit},26 ${xSlit + 9},21 ${xSlit + 9},31`} fill="#38bdf8" />
            <polygon points={`${xScreen},26 ${xScreen - 9},21 ${xScreen - 9},31`} fill="#38bdf8" />

            {/* Floating Glassmorphic Pill Readout */}
            <rect
              x={(xSlit + xScreen) / 2 - 58}
              y="14"
              width="116"
              height="25"
              rx="7"
              fill="#060913"
              stroke="#06b6d4"
              strokeWidth="1.4"
            />
            <text
              x={(xSlit + xScreen) / 2}
              y="31"
              fill="#38bdf8"
              fontSize="12"
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              L = {distanceL.toFixed(2)} m
            </text>
          </g>
        </svg>
      </div>

      {/* ── Slit Selector Bar & Physical Parameters Summary ── */}
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
                  className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold border transition-all duration-200 flex items-center gap-1.5 ${
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
