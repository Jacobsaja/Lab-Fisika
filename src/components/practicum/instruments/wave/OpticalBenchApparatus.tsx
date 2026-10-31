"use client";

import React, { useId, useMemo } from "react";
import {
  DEFAULT_LASER_WAVELENGTH,
  DEFAULT_SCREEN_DISTANCE_L,
  SSG_SLIT_PRESETS,
  wavelengthToRgb,
  wavelengthToHex,
} from "@/physics/waveOptics";
import { Sliders, Layers, Check, Eye } from "lucide-react";

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

  // Modernized presentation props (non-breaking optional)
  lambdaNm?: number;
  N?: number;
  aMm?: number;
  dMm?: number;
  mode?: "explore" | "practicum";
  showGeometry?: boolean;
  onToggleGeometry?: () => void;
}

/**
 * Modernized 2.5D Pseudo-Isometric Laboratory Optical Bench (Bangku Optik 2.5D).
 *
 * Polished features:
 * - A. Skala rel konsisten dengan L: pembacaan jarak L eksplisit via garis ukur presisi dengan leader lines.
 *      Angka cm statis dihapus dari badan rel untuk mencegah ketidakcocokan visual untuk L 0.5 hingga 3.0 m.
 * - B. Inset "Perbesar Celah" berada di atas garis panah L dengan jarak aman (zero collision).
 *      Teks "a = ..." dan "d = ..." terpisah tegas tanpa tumpang tindih untuk N = 1..6.
 * - C. Orientasi pola layar: celah di inset vertikal, dan miniatur pola di layar digambar menghadap penonton
 *      sebagai garis-garis vertikal yang tersebar mendatar (sesuai fisika difraksi Fraunhofer dan ScreenPatternView).
 * - D. Kontrol laser saklar switch dengan lampu indikator glowing, label "Laser: Aktif/Mati", dimmer di strip yang sama,
 *      aria-label lengkap, dan target sentuh >= 44 px.
 * - E. Tata ruang: viewBox kompak 920x270 mengeliminasi ruang kosong atas-bawah, semua label >= 12 px,
 *      responsif tanpa tumpang tindih di 375, 768, dan 1280 px.
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
  lambdaNm,
  N,
  aMm,
  dMm,
  mode = "practicum",
  showGeometry = false,
  onToggleGeometry,
}: OpticalBenchApparatusProps) {
  const instanceId = useId().replace(/[:]/g, "_");
  const currentSlit = SSG_SLIT_PRESETS[slitKey];

  // Dynamic wavelength & color mapping
  const activeLambdaNm = lambdaNm ?? Math.round(DEFAULT_LASER_WAVELENGTH * 1e9);
  const laserRgb = useMemo(() => wavelengthToRgb(activeLambdaNm), [activeLambdaNm]);
  const laserHex = useMemo(() => wavelengthToHex(activeLambdaNm), [activeLambdaNm]);

  // Dynamic slit parameters (fallback to preset if not provided)
  const activeN = N ?? currentSlit.N;
  const activeAMm = aMm ?? currentSlit.a * 1e3;
  const activeDMm = dMm ?? currentSlit.d * 1e3;

  // Optical axis height in 2.5D canvas
  const yOpt = 140;

  // Key horizontal coordinates along the bench
  const xLaserNozzle = 185;
  const xSlit = 285;

  // ── Skala rel: 1 m = RAIL_PX_PER_M px, angka skala diukur dari piringan celah (0 cm).
  // Posisi layar = xSlit + L·RAIL_PX_PER_M, sehingga selisih angka skala celah→layar = L (cm).
  // Berlaku untuk L 0,5–3,0 m (di luar rentang di-clamp hanya untuk penggambaran).
  const RAIL_PX_PER_M = 180;
  const L_DRAW_MIN = 0.5;
  const L_DRAW_MAX = 3.0;
  const drawnL = Math.min(L_DRAW_MAX, Math.max(L_DRAW_MIN, distanceL));
  const xScreen = xSlit + drawnL * RAIL_PX_PER_M;
  const benchSpan = xScreen - xSlit;
  const xBenchMid = (xSlit + xScreen) / 2;
  // Pil "L = ..." diletakkan di tengah garis ukur bila muat; jika L pendek, di kanan layar.
  const isLPillCentered = benchSpan >= 160;
  const lPillX = isLPillCentered ? xBenchMid - 60 : xScreen + 44;

  // Slit disk rotation angle
  const diskRotationDeg = useMemo(() => {
    if (mode === "explore" && N !== undefined) {
      return (N - 1) * 60;
    }
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
  }, [slitKey, mode, N]);

  // Beam state & opacity
  const isBeamActive = isLaserOn && dimmer > 0.01;
  const beamOpacity = isBeamActive ? Math.min(1.0, Math.max(0.12, dimmer)) : 0;

  return (
    <div className={`p-4 rounded-2xl glass-panel border border-slate-800 flex flex-col gap-3 text-xs ${className}`}>
      {/* ── Single Unified Header Bar ── */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="p-2 rounded-xl border transition-colors shadow-sm"
            style={{
              backgroundColor: `rgba(${laserRgb}, 0.15)`,
              borderColor: `rgba(${laserRgb}, 0.35)`,
              color: laserHex,
            }}
          >
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-100 text-sm tracking-tight">
              Bangku Optik
            </h4>
          </div>
        </div>

        {/* Right Mono Readout: L = 1.60 m · λ = xxx nm */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full font-mono text-xs border bg-slate-900/90 border-slate-800 text-slate-300">
          <span
            className={`w-2 h-2 rounded-full ${isBeamActive ? "animate-pulse" : ""}`}
            style={{ backgroundColor: isBeamActive ? laserHex : "#64748b" }}
          />
          <span>
            L = {distanceL.toFixed(2)} m · λ = {Math.round(activeLambdaNm)} nm
          </span>
        </div>
      </div>

      {/* ── Main 2.5D Isometric SVG Canvas & Docked Laser Toolbar ── */}
      <div className="relative w-full overflow-hidden bg-gradient-to-b from-[#020617] via-[#050b18] to-[#02050e] rounded-xl border border-slate-800/90 shadow-2xl flex flex-col">
        {/* SVG Drawing Wrapper */}
        <div className="w-full flex items-center justify-center p-2 sm:p-3 overflow-x-auto">
          <svg
            viewBox="0 0 920 270"
            className="w-full h-auto min-w-[640px] sm:min-w-0 block select-none"
            style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.65))" }}
          >
            <defs>
              {/* Lab Table Gradients */}
              <linearGradient id={`${instanceId}_tableShadow`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#000000" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </linearGradient>

              {/* Extruded Aluminum Rail Gradients */}
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

              {/* Laser Diode Cylinder */}
              <linearGradient id={`${instanceId}_laserCylinder`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#475569" />
                <stop offset="30%" stopColor="#64748b" />
                <stop offset="55%" stopColor="#1e293b" />
                <stop offset="85%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#020617" />
              </linearGradient>

              {/* Laser Front Nozzle Cone */}
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

              {/* Dynamic Volumetric Laser Diffraction Fan */}
              <linearGradient id={`${instanceId}_fanGrad`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={laserHex} stopOpacity={0.85 * beamOpacity} />
                <stop offset="25%" stopColor={`rgba(${laserRgb}, ${0.5 * beamOpacity})`} />
                <stop offset="70%" stopColor={`rgba(${laserRgb}, ${0.2 * beamOpacity})`} />
                <stop offset="100%" stopColor={`rgba(${laserRgb}, ${0.35 * beamOpacity})`} />
              </linearGradient>

              {/* Dynamic Radial Laser Aperture Bloom */}
              <radialGradient id={`${instanceId}_nozzleGlow`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={beamOpacity} />
                <stop offset="40%" stopColor={laserHex} stopOpacity={0.9 * beamOpacity} />
                <stop offset="100%" stopColor={laserHex} stopOpacity={0} />
              </radialGradient>

              {/* Dynamic Radial Screen Bloom */}
              <radialGradient id={`${instanceId}_screenHitGlow`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95 * beamOpacity} />
                <stop offset="35%" stopColor={laserHex} stopOpacity={0.85 * beamOpacity} />
                <stop offset="100%" stopColor={laserHex} stopOpacity={0} />
              </radialGradient>

              {/* Stainless Steel Support Post Gradient */}
              <linearGradient id={`${instanceId}_postGrad`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#64748b" />
                <stop offset="35%" stopColor="#cbd5e1" />
                <stop offset="70%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>

              {/* Laser Glow Filter */}
              <filter id={`${instanceId}_beamBlur`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 1. TABLE TOP LAB AMBIENCE & RAIL GROUND SHADOW                    */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            <path
              d="M 30,256 L 890,256 M 50,246 L 870,246"
              stroke="#1e293b"
              strokeWidth="0.5"
              strokeDasharray="4 8"
              opacity="0.25"
            />

            {/* Ambient Drop Shadows under Component Posts */}
            <ellipse cx="120" cy="246" rx="42" ry="6" fill="#000000" opacity="0.65" />
            <ellipse cx="285" cy="246" rx="38" ry="6" fill="#000000" opacity="0.65" />
            <ellipse cx="815" cy="246" rx="46" ry="6" fill="#000000" opacity="0.65" />

            {/* Deep Ambient Drop Shadow under Entire Rail */}
            <polygon
              points="45,242 875,242 900,254 35,254"
              fill={`url(#${instanceId}_tableShadow)`}
              opacity="0.55"
            />
            <ellipse cx="460" cy="250" rx="420" ry="8" fill="#000000" opacity="0.7" />

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 2. 2.5D EXTRUDED ALUMINUM OPTICAL RAIL (A. Skala Rel Konsisten)   */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* Left Foot at X = 85 */}
            <g transform="translate(70, 224)">
              <rect x="0" y="6" width="40" height="20" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="1" />
              <circle cx="8" cy="18" r="4.5" fill={`url(#${instanceId}_brass3D)`} stroke="#451a03" strokeWidth="0.8" />
              <circle cx="32" cy="18" r="4.5" fill={`url(#${instanceId}_brass3D)`} stroke="#451a03" strokeWidth="0.8" />
            </g>

            {/* Right Foot at X = 845 */}
            <g transform="translate(830, 224)">
              <rect x="0" y="6" width="40" height="20" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="1" />
              <circle cx="8" cy="18" r="4.5" fill={`url(#${instanceId}_brass3D)`} stroke="#451a03" strokeWidth="0.8" />
              <circle cx="32" cy="18" r="4.5" fill={`url(#${instanceId}_brass3D)`} stroke="#451a03" strokeWidth="0.8" />
            </g>

            {/* Rail Front Face (Vertical Extrusion, y = 210 to 238) */}
            <polygon
              points="40,210 880,210 880,238 40,238"
              fill={`url(#${instanceId}_railFront)`}
              stroke="#475569"
              strokeWidth="1"
            />
            <line x1="40" y1="211" x2="880" y2="211" stroke="#f8fafc" strokeWidth="1" opacity="0.8" />

            {/* Rail Top Face (Skewed 2.5D profile: y = 196 to 210) */}
            <polygon
              points="40,210 880,210 912,196 72,196"
              fill={`url(#${instanceId}_railTop)`}
              stroke="#475569"
              strokeWidth="1"
            />

            {/* Rail Left End Profile */}
            <polygon
              points="40,210 72,196 72,224 40,238"
              fill={`url(#${instanceId}_railEnd)`}
              stroke="#334155"
              strokeWidth="1"
            />

            {/* Rail Right End Profile */}
            <polygon
              points="880,210 912,196 912,224 880,238"
              fill={`url(#${instanceId}_railEnd)`}
              stroke="#334155"
              strokeWidth="1"
            />

            {/* Central T-Slot Guide Channel */}
            <polygon
              points="55,204 895,204 904,200 64,200"
              fill="#0f172a"
              stroke="#1e293b"
              strokeWidth="0.8"
            />
            <line x1="56" y1="205" x2="896" y2="205" stroke="#ffffff" strokeWidth="0.6" opacity="0.5" />

            {/* Skala rel berskala nyata: 0 cm di piringan celah, tiap 10 cm garis kecil, tiap 50 cm angka.
                Selisih angka celah→layar sama dengan L (mis. L = 1,70 m → layar di 170 cm). */}
            <g data-testid="rail-scale">
              {Array.from({ length: Math.round(L_DRAW_MAX * 10) + 1 }).map((_, idx) => {
                const cm = idx * 10;
                const xPos = xSlit + (cm / 100) * RAIL_PX_PER_M;
                const isMajor = cm % 50 === 0;
                return (
                  <g key={cm}>
                    <line
                      x1={xPos}
                      y1={211}
                      x2={xPos}
                      y2={isMajor ? 222 : 216}
                      stroke={isMajor ? "#0f172a" : "#334155"}
                      strokeWidth={isMajor ? 1.4 : 0.8}
                    />
                    {isMajor && (
                      <text
                        x={xPos}
                        y={235}
                        fill="#f1f5f9"
                        fontSize="12"
                        fontFamily="monospace"
                        fontWeight="bold"
                        textAnchor="middle"
                        stroke="#0f172a"
                        strokeWidth="2.5"
                        paintOrder="stroke"
                      >
                        {cm}
                      </text>
                    )}
                  </g>
                );
              })}
              {/* Satuan skala, di sisi kiri rel (di bawah laser) */}
              <text
                x={xSlit - 22}
                y={235}
                fill="#cbd5e1"
                fontSize="12"
                fontFamily="monospace"
                textAnchor="end"
                stroke="#0f172a"
                strokeWidth="2.5"
                paintOrder="stroke"
              >
                cm
              </text>
              {/* Penunjuk posisi layar pada skala (segitiga di tepi atas muka rel) */}
              <polygon
                data-testid="rail-screen-index"
                points={`${xScreen - 5},211 ${xScreen + 5},211 ${xScreen},218`}
                fill="#06b6d4"
              />
            </g>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 3. VOLUMETRIC LASER BEAM                                          */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {isBeamActive && (
              <g>
                {/* Beam Section 1: Collimated Ray (Laser Nozzle to Slit Center) */}
                <line
                  x1={xLaserNozzle}
                  y1={yOpt}
                  x2={xSlit}
                  y2={yOpt}
                  stroke={laserHex}
                  strokeWidth={7}
                  opacity={0.45 * beamOpacity}
                  filter={`url(#${instanceId}_beamBlur)`}
                />
                <line
                  x1={xLaserNozzle}
                  y1={yOpt}
                  x2={xSlit}
                  y2={yOpt}
                  stroke={laserHex}
                  strokeWidth={3.0}
                  opacity={0.9 * beamOpacity}
                />
                <line
                  x1={xLaserNozzle}
                  y1={yOpt}
                  x2={xSlit}
                  y2={yOpt}
                  stroke="#ffffff"
                  strokeWidth={1.2}
                  opacity={0.95 * beamOpacity}
                />

                {/* Glowing Aperture Blooms */}
                <circle cx={xLaserNozzle} cy={yOpt} r={8} fill={`url(#${instanceId}_nozzleGlow)`} />
                <circle cx={xSlit} cy={yOpt} r={7} fill={`url(#${instanceId}_nozzleGlow)`} />

                {/* Beam Section 2: Diverging Diffraction Cone (Slit to Screen) */}
                <polygon
                  points={`${xSlit},${yOpt} ${xScreen},${yOpt - 38} ${xScreen},${yOpt + 38}`}
                  fill={`url(#${instanceId}_fanGrad)`}
                />

                {/* Central Direct Ray Line */}
                <line
                  x1={xSlit}
                  y1={yOpt}
                  x2={xScreen}
                  y2={yOpt}
                  stroke={laserHex}
                  strokeWidth={3.5}
                  opacity={0.4 * beamOpacity}
                  filter={`url(#${instanceId}_beamBlur)`}
                />
                <line
                  x1={xSlit}
                  y1={yOpt}
                  x2={xScreen}
                  y2={yOpt}
                  stroke={laserHex}
                  strokeWidth={2.2}
                  opacity={0.85 * beamOpacity}
                />
                <line
                  x1={xSlit}
                  y1={yOpt}
                  x2={xScreen}
                  y2={yOpt}
                  stroke="#ffffff"
                  strokeWidth={1}
                  opacity={0.9 * beamOpacity}
                />

                {/* Optical Diffraction Wavefront Arcs */}
                {[0.25, 0.5, 0.75].map((frac) => {
                  const dist = frac * benchSpan;
                  const xPos = xSlit + dist;
                  const fanHalfH = frac * 34;
                  return (
                    <path
                      key={frac}
                      d={`M ${xPos - 6},${yOpt - fanHalfH} Q ${xPos + 10},${yOpt} ${xPos - 6},${yOpt + fanHalfH}`}
                      fill="none"
                      stroke={laserHex}
                      strokeWidth={0.8}
                      strokeDasharray="3 4"
                      opacity={0.35 * beamOpacity}
                    />
                  );
                })}

                {/* Notice text on diffraction fan (hanya bila ruang di antara celah-layar cukup) */}
                {benchSpan >= 260 && (
                  <text
                    x={xBenchMid + 20}
                    y={yOpt + 28}
                    fill="#94a3b8"
                    fontSize="12"
                    fontFamily="sans-serif"
                    fontStyle="italic"
                    opacity="0.8"
                    textAnchor="middle"
                  >
                    skema, tidak berskala
                  </text>
                )}
              </g>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 4. COMPONENT 1: 2.5D LASER MODULE (at X = 120)                   */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            <g transform="translate(100, 0)">
              {/* 3D Carrier Base Saddle on Track */}
              <polygon points="-25,200 25,200 33,190 -17,190" fill="#475569" stroke="#334155" strokeWidth="0.8" />
              <polygon points="-25,200 25,200 25,212 -25,212" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
              <circle cx="0" cy="206" r="5" fill={`url(#${instanceId}_brass3D)`} stroke="#451a03" strokeWidth="0.8" />
              <line x1="-3" y1="206" x2="3" y2="206" stroke="#451a03" strokeWidth="1" />

              {/* Stainless Steel Support Post */}
              <rect x="-6" y="155" width="12" height="48" rx="1.5" fill={`url(#${instanceId}_postGrad)`} stroke="#475569" strokeWidth="0.8" />
              <rect x="-8" y="165" width="16" height="7" rx="1.5" fill="#1e293b" stroke="#64748b" strokeWidth="0.7" />
              <circle cx="8" cy="168" r="2.8" fill={`url(#${instanceId}_brass3D)`} />

              {/* 2.5D Laser Main Housing (Centered at yOpt = 140) */}
              <polygon
                points="-25,118 60,118 70,108 -15,108"
                fill="#475569"
                stroke="#64748b"
                strokeWidth="1"
              />
              <rect
                x="-25"
                y="118"
                width="85"
                height="44"
                rx="3"
                fill={`url(#${instanceId}_laserCylinder)`}
                stroke="#64748b"
                strokeWidth="1.2"
              />
              <polygon
                points="60,118 70,108 70,152 60,162"
                fill="#1e293b"
                stroke="#475569"
                strokeWidth="1"
              />

              {/* Cooling Heatsink Ribs */}
              <line x1="-15" y1="123" x2="-15" y2="157" stroke="#0f172a" strokeWidth="2.5" />
              <line x1="-8" y1="123" x2="-8" y2="157" stroke="#0f172a" strokeWidth="2.5" />
              <line x1="-1" y1="123" x2="-1" y2="157" stroke="#0f172a" strokeWidth="2.5" />

              {/* Laser Warning Triangle (Yellow/Black) */}
              <rect x="15" y="125" width="26" height="15" rx="1.5" fill="#facc15" stroke="#ca8a04" strokeWidth="0.8" />
              <polygon points="21,137 28,127 35,137" fill="#000000" />
              <circle cx="28" cy="134" r="1" fill="#facc15" />

              {/* Power LED Indicator */}
              <circle
                cx="5"
                cy="128"
                r="3"
                fill={isLaserOn ? "#22c55e" : "#475569"}
                stroke={isLaserOn ? "#86efac" : "#1e293b"}
                strokeWidth={0.8}
              />

              {/* Front Aperture Nozzle Assembly */}
              <rect x="60" y="127" width="8" height="26" rx="1.5" fill="#334155" stroke="#475569" strokeWidth="0.8" />
              <polygon points="68,130 85,133 85,147 68,150" fill={`url(#${instanceId}_nozzleCone)`} stroke="#64748b" strokeWidth="0.8" />
              <rect x="74" y="132" width="4" height="16" rx="1" fill={`url(#${instanceId}_brass3D)`} />
              {/* Emission Diode Tip at Global x = 185 */}
              <circle
                cx="85"
                cy={yOpt}
                r={3.8}
                fill={isBeamActive ? "#ffffff" : "#334155"}
                stroke={isBeamActive ? laserHex : "#1e293b"}
                strokeWidth={1.8}
              />

              {/* Laser Equipment Name Label (>= 12px) */}
              <g transform="translate(18, 178)">
                <rect x="-60" y="0" width="120" height="22" rx="4" fill="#020617" stroke={isBeamActive ? laserHex : "#334155"} strokeWidth="1" />
                <text x="0" y="15" fill="#e2e8f0" fontSize="12" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
                  Laser {Math.round(activeLambdaNm)} nm
                </text>
              </g>
            </g>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 5. COMPONENT 2: ROTATABLE SLIT DISK (at X = 285)                 */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            <g transform={`translate(${xSlit}, 0)`}>
              {/* 3D Carrier Base Saddle on Track */}
              <polygon points="-25,200 25,200 33,190 -17,190" fill="#475569" stroke="#334155" strokeWidth="0.8" />
              <polygon points="-25,200 25,200 25,212 -25,212" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
              <circle cx="0" cy="206" r="5" fill={`url(#${instanceId}_brass3D)`} stroke="#451a03" strokeWidth="0.8" />
              <line x1="-3" y1="206" x2="3" y2="206" stroke="#451a03" strokeWidth="1" />

              {/* Stainless Steel Support Post */}
              <rect x="-6" y="160" width="12" height="43" rx="1.5" fill={`url(#${instanceId}_postGrad)`} stroke="#475569" strokeWidth="0.8" />
              <rect x="-8" y="168" width="16" height="7" rx="1.5" fill="#1e293b" stroke="#64748b" strokeWidth="0.7" />
              <circle cx="8" cy="171" r="2.8" fill={`url(#${instanceId}_brass3D)`} />

              {/* Yoke Bracket */}
              <path d="M -5,160 L -5,150 L 0,145 L 5,150 L 5,160 Z" fill="#334155" stroke="#64748b" strokeWidth="0.8" />

              {/* ── Rotatable Slit Wheel ── */}
              <g
                style={{
                  transformOrigin: `0px ${yOpt}px`,
                  transform: `rotate(${diskRotationDeg}deg)`,
                  transition: "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                {/* Outer Knurled Rim Disk (Radius 40px) */}
                <circle cx="0" cy={yOpt} r="40" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2.6" />
                {/* Knurled Grooves */}
                {Array.from({ length: 24 }).map((_, i) => {
                  const ang = (i * 360) / 24;
                  const rad = (ang * Math.PI) / 180;
                  const x1 = Math.round(Math.cos(rad) * 37 * 100) / 100;
                  const y1 = Math.round((yOpt + Math.sin(rad) * 37) * 100) / 100;
                  const x2 = Math.round(Math.cos(rad) * 40 * 100) / 100;
                  const y2 = Math.round((yOpt + Math.sin(rad) * 40) * 100) / 100;
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#94a3b8"
                      strokeWidth={1.2}
                    />
                  );
                })}

                {/* Inner Metallic Slit Disk Face */}
                <circle cx="0" cy={yOpt} r="33" fill={`url(#${instanceId}_diskRadial)`} stroke="#475569" strokeWidth="1.2" />

                {/* Perimeter Aperture Windows (5 windows for presets, 72° apart) */}
                {[0, 72, 144, 216, 288].map((ang) => (
                  <g key={ang} transform={`rotate(${ang}, 0, ${yOpt})`}>
                    <rect x="-4" y={yOpt - 28} width="8" height="14" rx="1.5" fill="#000000" stroke="#94a3b8" strokeWidth="0.8" />
                    <line x1="-1.5" y1={yOpt - 25} x2="-1.5" y2={yOpt - 17} stroke="#64748b" strokeWidth="0.8" />
                    <line x1="1.5" y1={yOpt - 25} x2="1.5" y2={yOpt - 17} stroke="#64748b" strokeWidth="0.8" />
                  </g>
                ))}

                {/* Center Hub */}
                <circle cx="0" cy={yOpt} r="8" fill={`url(#${instanceId}_postGrad)`} stroke="#334155" strokeWidth="1" />
                <circle cx="0" cy={yOpt} r="3" fill="#0f172a" />
              </g>

              {/* Static Aligned Optical Aperture (Active Slit Window directly on Beam Axis) */}
              <rect
                x="-10"
                y={yOpt - 15}
                width="20"
                height="30"
                rx="2.5"
                fill="#000000"
                stroke="#38bdf8"
                strokeWidth="1.2"
                opacity="0.95"
              />

              {/* Dynamic Rendering of N Vertical Slit Openings (N = 1..6) */}
              {Array.from({ length: activeN }).map((_, idx) => {
                const sep = activeN > 1 ? Math.min(3.2, 12 / (activeN - 1)) : 0;
                const xOffset = activeN === 1 ? 0 : -((activeN - 1) / 2) * sep + idx * sep;
                return (
                  <g key={idx}>
                    <line
                      x1={xOffset}
                      y1={yOpt - 11}
                      x2={xOffset}
                      y2={yOpt + 11}
                      stroke={isBeamActive ? laserHex : "#64748b"}
                      strokeWidth={activeN === 1 ? 2.8 : 1.2}
                      opacity={isBeamActive ? 0.9 : 0.6}
                    />
                    {isBeamActive && (
                      <line
                        x1={xOffset}
                        y1={yOpt - 10}
                        x2={xOffset}
                        y2={yOpt + 10}
                        stroke="#ffffff"
                        strokeWidth={activeN === 1 ? 1.4 : 0.6}
                        opacity={0.95}
                      />
                    )}
                  </g>
                );
              })}

              {/* Equipment Name Label (>= 12px) */}
              <g transform="translate(0, 178)">
                <rect x="-70" y="0" width="140" height="22" rx="4" fill="#020617" stroke="#38bdf8" strokeWidth="1" />
                <text x="0" y="15" fill="#e2e8f0" fontSize="12" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
                  {activeN === 1 ? "Celah Tunggal (N=1)" : `Piringan Celah (N=${activeN})`}
                </text>
              </g>
            </g>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 6. COMPONENT 3: 2.5D PROJECTION SCREEN (at X = 815)              */}
            {/*    C. Orientasi Pola: Garis-garis vertikal tersebar mendatar     */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            <g transform={`translate(${xScreen}, 0)`}>
              {/* 3D Carrier Base Saddle on Track */}
              <polygon points="-25,200 25,200 33,190 -17,190" fill="#475569" stroke="#334155" strokeWidth="0.8" />
              <polygon points="-25,200 25,200 25,212 -25,212" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
              <circle cx="0" cy="206" r="5" fill={`url(#${instanceId}_brass3D)`} stroke="#451a03" strokeWidth="0.8" />
              <line x1="-3" y1="206" x2="3" y2="206" stroke="#451a03" strokeWidth="1" />

              {/* Stainless Steel Support Post */}
              <rect x="-6" y="160" width="12" height="43" rx="1.5" fill={`url(#${instanceId}_postGrad)`} stroke="#475569" strokeWidth="0.8" />

              {/* 2.5D Screen Holder Plate Frame */}
              <polygon points="-28,66 28,66 36,58 -20,58" fill="#334155" stroke="#64748b" strokeWidth="1" />
              <rect x="-28" y="66" width="56" height="132" rx="3" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
              <polygon points="28,66 36,58 36,190 28,198" fill="#1e293b" stroke="#334155" strokeWidth="1" />

              {/* Inner Millimeter Block Paper Sheet */}
              <rect
                x="-22"
                y="72"
                width="44"
                height="120"
                rx="1.5"
                fill={`url(#${instanceId}_screenPaper)`}
                stroke="#cbd5e1"
                strokeWidth="0.6"
              />

              {/* Millimeter Grid Texture on Screen Paper */}
              {[-44, -33, -22, -11, 0, 11, 22, 33, 44].map((offset) => (
                <line
                  key={offset}
                  x1="-22"
                  y1={yOpt + offset}
                  x2="22"
                  y2={yOpt + offset}
                  stroke="#06b6d4"
                  strokeWidth={offset === 0 ? 0.9 : 0.4}
                  opacity={offset === 0 ? 0.85 : 0.3}
                />
              ))}
              <line x1="0" y1="72" x2="0" y2="192" stroke="#06b6d4" strokeWidth="0.8" opacity="0.5" />

              {/* Metal Paper Spring Clips */}
              <rect x="-14" y="68" width="28" height="5" rx="1.2" fill="#64748b" stroke="#334155" strokeWidth="0.6" />
              <rect x="-14" y="188" width="28" height="5" rx="1.2" fill="#64748b" stroke="#334155" strokeWidth="0.6" />

              {/* ── C. MINIATUR POLA DIFRAKSI/INTERFERENSI: GARIS VERTIKAL TERSEBAR MENDATAR ── */}
              {isBeamActive && (
                <g>
                  {/* Soft Background Surface Bloom */}
                  <ellipse cx="0" cy={yOpt} rx="16" ry="24" fill={`url(#${instanceId}_screenHitGlow)`} />

                  {/* Terang Pusat (T0) - Garis vertikal tebal di x = 0 */}
                  <line
                    x1="0"
                    y1={yOpt - 24}
                    x2="0"
                    y2={yOpt + 24}
                    stroke={laserHex}
                    strokeWidth="6"
                    opacity={0.85 * beamOpacity}
                    filter={`url(#${instanceId}_beamBlur)`}
                  />
                  <line
                    x1="0"
                    y1={yOpt - 22}
                    x2="0"
                    y2={yOpt + 22}
                    stroke={laserHex}
                    strokeWidth="3.4"
                    opacity={0.95 * beamOpacity}
                  />
                  <line
                    x1="0"
                    y1={yOpt - 20}
                    x2="0"
                    y2={yOpt + 20}
                    stroke="#ffffff"
                    strokeWidth="1.4"
                    opacity={0.98 * beamOpacity}
                  />

                  {/* Case N = 1 (Celah Tunggal): Pita difraksi lebar di pusat + pita tipis sekunder */}
                  {activeN === 1 && (
                    <g>
                      <line
                        x1="0"
                        y1={yOpt - 26}
                        x2="0"
                        y2={yOpt + 26}
                        stroke={laserHex}
                        strokeWidth="8"
                        opacity={0.5 * beamOpacity}
                      />
                      {[-14, 14].map((dx) => (
                        <line
                          key={dx}
                          x1={dx}
                          y1={yOpt - 14}
                          x2={dx}
                          y2={yOpt + 14}
                          stroke={laserHex}
                          strokeWidth="1.6"
                          opacity={0.3 * beamOpacity}
                        />
                      ))}
                    </g>
                  )}

                  {/* Case N >= 2: Puncak Primer & Puncak Sekunder (Garis-garis vertikal tersebar mendatar) */}
                  {activeN >= 2 && (
                    <g>
                      {/* Puncak Primer Orde 1 di x = ±14 px */}
                      {[-14, 14].map((dx) => (
                        <g key={`pri-${dx}`}>
                          <line
                            x1={dx}
                            y1={yOpt - 18}
                            x2={dx}
                            y2={yOpt + 18}
                            stroke={laserHex}
                            strokeWidth="4.2"
                            opacity={0.8 * beamOpacity}
                            filter={`url(#${instanceId}_beamBlur)`}
                          />
                          <line
                            x1={dx}
                            y1={yOpt - 17}
                            x2={dx}
                            y2={yOpt + 17}
                            stroke={laserHex}
                            strokeWidth="2.2"
                            opacity={0.9 * beamOpacity}
                          />
                          <line
                            x1={dx}
                            y1={yOpt - 15}
                            x2={dx}
                            y2={yOpt + 15}
                            stroke="#ffffff"
                            strokeWidth="0.9"
                            opacity={0.95 * beamOpacity}
                          />
                        </g>
                      ))}

                      {/* Puncak Sekunder antara x = 0 dan x = ±14 px (N - 2 puncak) */}
                      {/* N = 3: 1 puncak sekunder di x = ±7 px */}
                      {activeN === 3 &&
                        [-7, 7].map((dx) => (
                          <line
                            key={`sec3-${dx}`}
                            x1={dx}
                            y1={yOpt - 11}
                            x2={dx}
                            y2={yOpt + 11}
                            stroke={laserHex}
                            strokeWidth="1.6"
                            opacity={0.45 * beamOpacity}
                          />
                        ))}

                      {/* N = 4: 2 puncak sekunder di x = ±4.7 px dan ±9.3 px */}
                      {activeN === 4 &&
                        [-9.3, -4.7, 4.7, 9.3].map((dx) => (
                          <line
                            key={`sec4-${dx}`}
                            x1={dx}
                            y1={yOpt - 9}
                            x2={dx}
                            y2={yOpt + 9}
                            stroke={laserHex}
                            strokeWidth="1.3"
                            opacity={0.35 * beamOpacity}
                          />
                        ))}

                      {/* N = 5: 3 puncak sekunder di x = ±3.5, ±7, ±10.5 px */}
                      {activeN === 5 &&
                        [-10.5, -7, -3.5, 3.5, 7, 10.5].map((dx) => (
                          <line
                            key={`sec5-${dx}`}
                            x1={dx}
                            y1={yOpt - 8}
                            x2={dx}
                            y2={yOpt + 8}
                            stroke={laserHex}
                            strokeWidth="1.1"
                            opacity={0.28 * beamOpacity}
                          />
                        ))}

                      {/* N = 6: 4 puncak sekunder di x = ±2.8, ±5.6, ±8.4, ±11.2 px */}
                      {activeN === 6 &&
                        [-11.2, -8.4, -5.6, -2.8, 2.8, 5.6, 8.4, 11.2].map((dx) => (
                          <line
                            key={`sec6-${dx}`}
                            x1={dx}
                            y1={yOpt - 7}
                            x2={dx}
                            y2={yOpt + 7}
                            stroke={laserHex}
                            strokeWidth="1.0"
                            opacity={0.24 * beamOpacity}
                          />
                        ))}
                    </g>
                  )}

                  {/* Catatan kecil 'skema' di bagian bawah lembar kertas */}
                  <text
                    x="0"
                    y="184"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="sans-serif"
                    fontStyle="italic"
                    textAnchor="middle"
                  >
                    skema
                  </text>
                </g>
              )}

              {/* Equipment Name Label (>= 12px) */}
              <g transform="translate(0, 178)">
                <rect x="-42" y="0" width="84" height="22" rx="4" fill="#020617" stroke="#38bdf8" strokeWidth="1" />
                <text x="0" y="15" fill="#e2e8f0" fontSize="12" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
                  Layar
                </text>
              </g>
            </g>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 7. INSET "PERBESAR CELAH" (B. Di atas panah L, zero collision)     */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            <g transform="translate(340, 8)">
              {/* Box Container (Lebar 240, Tinggi 64) */}
              <rect
                x="0"
                y="0"
                width="240"
                height="64"
                rx="8"
                fill="#020617"
                fillOpacity="0.96"
                stroke="#0891b2"
                strokeWidth="1.2"
                filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))"
              />
              {/* Inset Header (>= 12px) */}
              <text x="120" y="17" fill="#38bdf8" fontSize="12" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
                Perbesar Celah (N = {activeN})
              </text>

              {/* Slit Plate Representation */}
              <rect x="18" y="24" width="204" height="22" rx="3" fill="#090d16" stroke="#334155" strokeWidth="1" />

              {/* Slit Apertures inside Inset Plate */}
              {Array.from({ length: activeN }).map((_, i) => {
                const spacing = activeN > 1 ? Math.min(22, 110 / (activeN - 1)) : 0;
                const xPos = activeN === 1 ? 120 : 120 - ((activeN - 1) / 2) * spacing + i * spacing;
                return (
                  <g key={i}>
                    <rect
                      x={xPos - (activeN === 1 ? 2.5 : 1.6)}
                      y={26}
                      width={activeN === 1 ? 5 : 3.2}
                      height={18}
                      fill={isBeamActive ? laserHex : "#64748b"}
                      stroke="#ffffff"
                      strokeWidth={0.5}
                    />
                    {isBeamActive && (
                      <line
                        x1={xPos}
                        y1={27}
                        x2={xPos}
                        y2={43}
                        stroke="#ffffff"
                        strokeWidth={0.8}
                      />
                    )}
                  </g>
                );
              })}

              {/* Bottom Labels with Generous Horizontal Separation (>= 12px, zero overlap) */}
              <text x="20" y="58" fill="#e2e8f0" fontSize="12" fontFamily="monospace" fontWeight="600" textAnchor="start">
                a = {activeAMm.toFixed(2)} mm
              </text>

              {activeN >= 2 ? (
                <text x="220" y="58" fill="#e2e8f0" fontSize="12" fontFamily="monospace" fontWeight="600" textAnchor="end">
                  d = {activeDMm.toFixed(2)} mm
                </text>
              ) : (
                <text x="220" y="58" fill="#38bdf8" fontSize="12" fontFamily="sans-serif" fontWeight="600" textAnchor="end">
                  celah tunggal
                </text>
              )}

              {/* Subtle Callout Leader Line to Slit Wheel */}
              <path d="M 0,32 Q -35,55 -55,80" fill="none" stroke="#0891b2" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
            </g>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 8. PROMINENT DIMENSION RAY L (A & B: Terletak bersih di y = 80)    */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            <g>
              {/* Slit Leader Line: dari puncak roda celah (y=100) naik ke y=76 */}
              <line x1={xSlit} y1="76" x2={xSlit} y2="100" stroke="#38bdf8" strokeWidth="0.9" strokeDasharray="3 3" opacity="0.6" />
              {/* Screen Leader Line: dari puncak layar (y=66) turun ke y=84 */}
              <line x1={xScreen} y1="66" x2={xScreen} y2="84" stroke="#38bdf8" strokeWidth="0.9" strokeDasharray="3 3" opacity="0.6" />

              {/* Horizontal Dimension Arrow Line at y = 80 */}
              <line x1={xSlit + 8} y1="80" x2={xScreen - 8} y2="80" stroke="#38bdf8" strokeWidth="1.6" />
              <polygon points={`${xSlit},80 ${xSlit + 8},76 ${xSlit + 8},84`} fill="#38bdf8" />
              <polygon points={`${xScreen},80 ${xScreen - 8},76 ${xScreen - 8},84`} fill="#38bdf8" />

              {/* Readout Pill L: di tengah garis ukur bila muat, selain itu di kanan layar */}
              <rect
                data-testid="l-pill"
                x={lPillX}
                y="70"
                width="120"
                height="22"
                rx="6"
                fill="#020617"
                stroke="#06b6d4"
                strokeWidth="1.3"
              />
              <text
                x={lPillX + 60}
                y="85"
                fill="#38bdf8"
                fontSize="13"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                L = {distanceL.toFixed(2)} m
              </text>
            </g>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 9. OPTIONAL GEOMETRY RAY DIAGRAM (Explore Only)                   */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {mode === "explore" && showGeometry && (
              <g>
                {/* Rays from upper and lower slit edges to Point P (first fringe) */}
                <line
                  x1={xSlit}
                  y1={yOpt - 4}
                  x2={xScreen}
                  y2={yOpt - 18}
                  stroke="#f59e0b"
                  strokeWidth={1.4}
                  strokeDasharray="4 3"
                  opacity={0.85}
                />
                <line
                  x1={xSlit}
                  y1={yOpt + 4}
                  x2={xScreen}
                  y2={yOpt - 18}
                  stroke="#f59e0b"
                  strokeWidth={1.4}
                  strokeDasharray="4 3"
                  opacity={0.85}
                />

                {/* Point P marker on screen */}
                <circle cx={xScreen} cy={yOpt - 18} r={3.5} fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
                {(() => {
                  // Label Titik P: kiri layar bila ruang cukup, kanan layar bila L pendek (hindari kotak Δr)
                  const pX = benchSpan >= 280 ? xScreen - 132 : xScreen + 44;
                  return (
                    <>
                      <rect x={pX} y={yOpt - 32} width={116} height={20} rx="3" fill="#020617" stroke="#f59e0b" strokeWidth="0.8" />
                      <text x={pX + 58} y={yOpt - 18} fill="#f59e0b" fontSize="12" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
                        Titik P (Orde 1)
                      </text>
                    </>
                  );
                })()}

                {/* Path difference perpendicular leg */}
                <line
                  x1={xSlit + 4}
                  y1={yOpt - 4}
                  x2={xSlit + 4}
                  y2={yOpt + 4}
                  stroke="#38bdf8"
                  strokeWidth={1.4}
                />

                {/* Path difference callout box */}
                <rect x={xSlit + 12} y={yOpt - 25} width={120} height={22} rx="4" fill="#020617" stroke="#f59e0b" strokeWidth="1" />
                <text x={xSlit + 72} y={yOpt - 10} fill="#f59e0b" fontSize="12" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                  Δr = d·sin(θ) = λ
                </text>

                {/* Angle theta arc */}
                <path
                  d={`M ${xSlit + 35},${yOpt} A 35 35 0 0 0 ${xSlit + 34},${yOpt - 6}`}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={1.2}
                />
                <text x={xSlit + 42} y={yOpt - 2} fill="#f59e0b" fontSize="12" fontFamily="serif" fontStyle="italic">
                  θ
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* ── D. DOCKED LASER CONTROLS TOOLBAR (Saklar, Lampu Indikator, Dimmer, Geometri) ── */}
        {(onToggleLaser || onDimmerChange || (mode === "explore" && onToggleGeometry)) && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 sm:px-4 sm:py-3 bg-slate-950/85 border-t border-slate-800/80 backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* D. Saklar Laser dengan Lampu Indikator & Label "Laser: Aktif/Mati" (Target Sentuh >= 44 px) */}
              {onToggleLaser && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={isLaserOn}
                  aria-label={isLaserOn ? "Saklar Laser: Aktif (klik untuk mematikan)" : "Saklar Laser: Mati (klik untuk menyalakan)"}
                  onClick={onToggleLaser}
                  className={`min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl text-xs font-medium border transition-all duration-200 flex items-center gap-2.5 cursor-pointer select-none active:scale-95 ${
                    isLaserOn
                      ? "bg-slate-900 border-slate-700 shadow-md hover:border-slate-600"
                      : "bg-slate-950 hover:bg-slate-900 text-slate-400 border-slate-800"
                  }`}
                >
                  {/* Glowing LED Indicator Lamp */}
                  <span
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${isLaserOn ? "animate-pulse" : ""}`}
                    style={{
                      backgroundColor: isLaserOn ? laserHex : "#475569",
                      boxShadow: isLaserOn ? `0 0 8px ${laserHex}` : "none",
                    }}
                  />

                  {/* Toggle Switch Track & Thumb */}
                  <span
                    className={`w-8 h-4.5 rounded-full relative transition-colors duration-200 border flex items-center px-0.5 ${
                      isLaserOn
                        ? "bg-slate-800 border-slate-600"
                        : "bg-slate-900 border-slate-700"
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-200 shadow-sm ${
                        isLaserOn ? "translate-x-3.5" : "translate-x-0 bg-slate-500"
                      }`}
                      style={{
                        backgroundColor: isLaserOn ? laserHex : undefined,
                      }}
                    />
                  </span>

                  {/* Clear Label: "Laser: Aktif" / "Laser: Mati" */}
                  <span
                    className={`font-semibold text-xs ${
                      isLaserOn ? "text-slate-100" : "text-slate-400"
                    }`}
                  >
                    Laser: {isLaserOn ? "Aktif" : "Mati"}
                  </span>
                </button>
              )}

              {/* D. Dimmer di Strip yang Sama dengan Pembacaan Persen (Target Sentuh >= 44 px) */}
              {onDimmerChange && (
                <div className="flex items-center gap-2.5 min-h-[44px] px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-medium text-slate-300">Dimmer:</span>
                  <input
                    type="range"
                    min={0.0}
                    max={1.0}
                    step={0.05}
                    value={dimmer}
                    onChange={(e) => onDimmerChange(parseFloat(e.target.value))}
                    aria-label="Atur intensitas dimmer sinar laser (0 sampai 100%)"
                    className="w-20 sm:w-28 cursor-pointer"
                    style={{ accentColor: laserHex }}
                  />
                  <span className="font-mono text-xs font-bold text-slate-100 w-10 text-right">
                    {Math.round(dimmer * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Geometri Sinar Toggle (Explore Mode Only) */}
            {mode === "explore" && onToggleGeometry && (
              <button
                type="button"
                onClick={onToggleGeometry}
                aria-label="Tampilkan atau sembunyikan diagram geometri berkas sinar"
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 active:scale-95 ${
                  showGeometry
                    ? "bg-amber-500/20 text-amber-300 border-amber-400/60 shadow-sm shadow-amber-500/20"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
              >
                <Eye className="w-4 h-4 text-amber-400" />
                <span>Geometri Sinar</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Slit Selector Bar & Physical Parameters Summary (Praktikum Mode Only) ── */}
      {mode === "practicum" && onSelectSlit && (
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
                  className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold border transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
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
