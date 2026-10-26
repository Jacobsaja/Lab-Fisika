"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { ExploreShell } from "@/components/explore/ExploreShell";
import {
  ScreenPatternView,
  IntensityProfileGraph,
  OpticalBenchApparatus,
  MarkerPoint,
} from "@/components/practicum/instruments/wave";
import {
  DEFAULT_LASER_WAVELENGTH,
  DEFAULT_SCREEN_DISTANCE_L,
  SSG_SLIT_PRESETS,
  wavelengthToRgb,
  wavelengthToHex,
  calculateAdaptiveScreenSpanMm,
  estimatedPatternPosition,
  findFraunhoferPeakContinuous,
  secondaryMaximaCount,
  darkCountBetweenPrimaries,
  getPatternClassification,
  singleSlitDarkPosition,
  singleSlitBrightPosition,
} from "@/physics/waveOptics";
import {
  RotateCcw,
  Sliders,
  Calculator,
  Scale,
  Eye,
  Activity,
  Layers,
  Sparkles,
  Info,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Sun,
  Maximize2,
} from "lucide-react";

/**
 * Explore Mode: Sifat-Sifat Gelombang (Wave Optics - SSG)
 *
 * Physics & System Architecture Guidelines (AGENTS.md):
 * 1. Static Optical Apparatus:
 *    Interference and diffraction patterns are time-invariant, steady-state physical fields.
 *    Playback speed scaling (PlaybackSpeedControl / usePersistedPlaybackSpeed) does NOT apply.
 * 2. Pure Simulation Engine:
 *    Physical intensity curves and exact peak positions are computed deterministically
 *    using Fraunhofer wave optics formulas without random noise.
 * 3. Physical Constraints:
 *    - lambda: 400 - 700 nm (visible spectrum)
 *    - N: 1 - 6 slits (for N=1, slit separation d is physically not applicable and disabled)
 *    - Slit geometry invariant: d >= a (slits cannot physically overlap)
 *    - L: 0.5 - 3.0 m (optical bench rail span)
 * 4. Adaptive Screen Scale:
 *    Screen window span adapts dynamically to parameters so multiple interference /
 *    diffraction orders remain in visual range, with persistent mm-per-grid scale readout.
 */

// Default physical configuration
const DEFAULT_LAMBDA_NM = 632; // 632 nm (He-Ne / Red diode)
const DEFAULT_N = 2;           // Double slit
const DEFAULT_A_MM = 0.04;     // 0.04 mm
const DEFAULT_D_MM = 0.50;     // 0.50 mm
const DEFAULT_L_M = 1.60;      // 1.60 m
const DEFAULT_EXPOSURE = 1.8;  // Camera gain / screen exposure
const DEFAULT_DIMMER = 1.0;    // Laser intensity

export default function SSGExplorePage() {
  // ─── Optical Parameters State ──────────────────────────────────────────────
  const [lambdaNm, setLambdaNm] = useState<number>(DEFAULT_LAMBDA_NM);
  const [N, setN] = useState<number>(DEFAULT_N);
  const [aMm, setAMm] = useState<number>(DEFAULT_A_MM);
  const [dMm, setDMm] = useState<number>(DEFAULT_D_MM);
  const [LM, setLM] = useState<number>(DEFAULT_L_M);

  // ─── Optical Bench & Screen State ──────────────────────────────────────────
  const [laserOn, setLaserOn] = useState<boolean>(true);
  const [dimmer, setDimmer] = useState<number>(DEFAULT_DIMMER);
  const [exposure, setExposure] = useState<number>(DEFAULT_EXPOSURE);
  const [zoomActive, setZoomActive] = useState<boolean>(false);
  const [autoScaleScreen, setAutoScaleScreen] = useState<boolean>(true);
  const [customSpanMm, setCustomSpanMm] = useState<number>(12.0);

  // ─── Comparative & Overlay Toggles ─────────────────────────────────────────
  const [showCompareModule, setShowCompareModule] = useState<boolean>(false);
  const [showSecondaryHighlight, setShowSecondaryHighlight] = useState<boolean>(true);
  const [showEnvelope, setShowEnvelope] = useState<boolean>(true);
  const [showMinimaMarkers, setShowMinimaMarkers] = useState<boolean>(true);

  // ─── Draggable Screen Markers ──────────────────────────────────────────────
  const [activeMarkerTn, setActiveMarkerTn] = useState<number>(1);
  const [markers, setMarkers] = useState<MarkerPoint[]>([
    { id: "m0", tn: 0, label: "T0", yMm: 0 },
    { id: "m1", tn: 1, label: "T1", yMm: 0 },
    { id: "m2", tn: 2, label: "T2", yMm: 0 },
    { id: "m3", tn: 3, label: "T3", yMm: 0 },
    { id: "m4", tn: 4, label: "T4", yMm: 0 },
  ]);

  // Convert to SI meters for physics calculations
  const lambdaSI = useMemo(() => lambdaNm * 1e-9, [lambdaNm]);
  const aSI = useMemo(() => aMm * 1e-3, [aMm]);
  const dSI = useMemo(() => dMm * 1e-3, [dMm]);

  // Color mapping
  const laserRgb = useMemo(() => wavelengthToRgb(lambdaNm), [lambdaNm]);
  const laserHex = useMemo(() => wavelengthToHex(lambdaNm), [lambdaNm]);

  // Dynamic Adaptive Screen Span Calculation
  // Scaling rule: ensures at least 2 to 4 orders are visible on screen
  const adaptiveSpanMm = useMemo(() => {
    return calculateAdaptiveScreenSpanMm(lambdaSI, LM, aSI, dSI, N);
  }, [lambdaSI, LM, aSI, dSI, N]);

  const activeSpanMm = autoScaleScreen ? adaptiveSpanMm : customSpanMm;

  // Reset markers helper (stored in useCallback for permanent rule compliance)
  const handleResetMarkers = useCallback(() => {
    setMarkers([
      { id: "m0", tn: 0, label: "T0", yMm: 0 },
      { id: "m1", tn: 1, label: "T1", yMm: 0 },
      { id: "m2", tn: 2, label: "T2", yMm: 0 },
      { id: "m3", tn: 3, label: "T3", yMm: 0 },
      { id: "m4", tn: 4, label: "T4", yMm: 0 },
    ]);
    setActiveMarkerTn(1);
  }, []);

  // Auto-reset markers when N changes
  const prevNRef = useRef(N);
  useEffect(() => {
    if (prevNRef.current !== N) {
      prevNRef.current = N;
      handleResetMarkers();
    }
  }, [N, handleResetMarkers]);

  // Handle parameter Reset to Default
  const handleResetAll = useCallback(() => {
    setLambdaNm(DEFAULT_LAMBDA_NM);
    setN(DEFAULT_N);
    setAMm(DEFAULT_A_MM);
    setDMm(DEFAULT_D_MM);
    setLM(DEFAULT_L_M);
    setExposure(DEFAULT_EXPOSURE);
    setDimmer(DEFAULT_DIMMER);
    setLaserOn(true);
    setAutoScaleScreen(true);
    handleResetMarkers();
  }, [handleResetMarkers]);

  // ─── Invariant Enforcers (d >= a) ──────────────────────────────────────────
  // Rule: Do NOT silently modify other values; enforce explicit slider bounds.
  const handleAChange = (newAMm: number) => {
    if (N > 1 && newAMm > dMm) {
      setAMm(dMm);
    } else {
      setAMm(newAMm);
    }
  };

  const handleDChange = (newDMm: number) => {
    if (newDMm < aMm) {
      setDMm(aMm);
    } else {
      setDMm(newDMm);
    }
  };

  // ─── Numerical Quantities (Panel Outputs) ──────────────────────────────────
  const outputs = useMemo(() => {
    // Single slit diffraction envelope first zero: y_dark1 = lambda * L / a
    const lambdaL_over_a_mm = ((lambdaSI * LM) / aSI) * 1000;

    if (N <= 1) {
      return {
        isSingleSlit: true,
        lambdaL_over_d_mm: 0,
        lambdaL_over_a_mm,
        diffractionWidthMm: lambdaL_over_a_mm,
        firstDarkMm: lambdaL_over_a_mm,
        approxFirstBrightMm: 1.5 * lambdaL_over_a_mm,
        centralWidthMm: 2 * lambdaL_over_a_mm,
        secondaryCount: 0,
        darkCount: 0,
        exactOrder1Mm: 0,
      };
    }

    // Multi-slit primary interference fringe separation: y_prim1 = lambda * L / d
    const lambdaL_over_d_mm = ((lambdaSI * LM) / dSI) * 1000;
    const nTs = secondaryMaximaCount(N);
    const nG = darkCountBetweenPrimaries(N);

    // Exact order 1 continuous Fraunhofer peak
    const exactOrder1M = findFraunhoferPeakContinuous(N > 1 ? (N - 1) : 1, N, lambdaSI, LM, aSI, dSI);
    const exactOrder1Mm = exactOrder1M * 1000;

    return {
      isSingleSlit: false,
      lambdaL_over_d_mm,
      lambdaL_over_a_mm,
      diffractionWidthMm: lambdaL_over_a_mm,
      firstDarkMm: lambdaL_over_a_mm,
      approxFirstBrightMm: 0,
      centralWidthMm: 0,
      secondaryCount: nTs,
      darkCount: nG,
      exactOrder1Mm,
    };
  }, [N, lambdaSI, LM, aSI, dSI]);

  // ─── Module Formula Comparison Data ────────────────────────────────────────
  const comparisonData = useMemo(() => {
    if (N <= 1) return [];
    return [0, 1, 2, 3, 4].map((tn) => {
      const type = getPatternClassification(tn, N);
      const exactPosM = findFraunhoferPeakContinuous(tn, N, lambdaSI, LM, aSI, dSI);
      const exactPosMm = exactPosM * 1000;
      const modulePosM = estimatedPatternPosition(tn, N, lambdaSI, LM, dSI, aSI);
      const modulePosMm = modulePosM * 1000;
      const diffUm = Math.abs(exactPosMm - modulePosMm) * 1000;

      return {
        tn,
        type,
        exactPosMm,
        modulePosMm,
        diffUm,
      };
    });
  }, [N, lambdaSI, LM, aSI, dSI]);

  // Slit preset mapping for OpticalBenchApparatus
  const slitKeyMapped = N === 2 ? "slit2" : N === 3 ? "slit3" : "slit5";

  return (
    <ExploreShell
      title="Sifat-Sifat Gelombang: Interferensi & Difraksi Cahaya"
      category="Gelombang"
      description="Eksplorasi bebas fenomena interferensi dan difraksi cahaya laser melalui celah tunggal dan celah majemuk (N = 1 sampai 6). Variasikan panjang gelombang, lebar celah, jarak celah, dan jarak layar secara bebas untuk mengamati perubahan profil intensitas Fraunhofer dan pola proyeksi milimeter blok."
    >
      <div className="flex flex-col gap-6 p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
        {/* ── Top Bar: Title & Global Reset ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-md">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner transition-colors"
              style={{
                backgroundColor: `rgba(${laserRgb}, 0.15)`,
                borderColor: `rgba(${laserRgb}, 0.4)`,
                color: laserHex,
              }}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100">
                  Laboratorium Eksplorasi Gelombang Cahaya
                </h2>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border"
                  style={{
                    backgroundColor: `rgba(${laserRgb}, 0.15)`,
                    borderColor: `rgba(${laserRgb}, 0.35)`,
                    color: laserHex,
                  }}
                >
                  λ = {lambdaNm} nm
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Mode Eksplorasi Bebas · Tanpa batas waktu atau penilaian · Perhitungan Fraunhofer murni
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetAll}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Kembalikan semua parameter ke nilai standar (λ=632nm, N=2, a=0.04mm, d=0.5mm, L=1.6m)"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Reset Parameter</span>
            </button>
          </div>
        </div>

        {/* ── Main Workspace Grid: Controls (Left) & Instruments (Right) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ════════ LEFT COLUMN: Parameter Controls (4 Cols) ════════ */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            {/* Control Panel Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-5 text-xs text-slate-300">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>Kontrol Parameter Bebas</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                  Fisika Murni
                </span>
              </div>

              {/* 1. Wavelength (lambda) */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="slider-lambda" className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <span>Panjang Gelombang (λ)</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      [400 - 700 nm]
                    </span>
                  </label>
                  <span
                    className="font-mono font-bold px-2 py-0.5 rounded text-xs border"
                    style={{
                      backgroundColor: `rgba(${laserRgb}, 0.15)`,
                      borderColor: `rgba(${laserRgb}, 0.4)`,
                      color: laserHex,
                    }}
                  >
                    {lambdaNm} nm
                  </span>
                </div>
                <input
                  id="slider-lambda"
                  type="range"
                  min={400}
                  max={700}
                  step={1}
                  value={lambdaNm}
                  onChange={(e) => setLambdaNm(parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 cursor-pointer"
                  style={{ accentColor: laserHex }}
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>400 nm (Ungu)</span>
                  <span className="text-slate-400">532 nm (Hijau)</span>
                  <span>700 nm (Merah)</span>
                </div>
              </div>

              {/* 2. Number of Slits (N) */}
              <div className="flex flex-col gap-2 border-t border-slate-800/80 pt-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="slider-N" className="font-semibold text-slate-200">
                    Jumlah Celah (N)
                  </label>
                  <span className="font-mono font-bold px-2.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 text-xs">
                    N = {N} {N === 1 ? "(Celah Tunggal)" : "(Celah Majemuk)"}
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setN(num)}
                      className={`py-1.5 rounded-lg font-mono font-bold text-xs border transition-all cursor-pointer ${
                        N === num
                          ? "bg-amber-500 text-black border-amber-300 shadow-sm shadow-amber-500/20 scale-105"
                          : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                {N === 1 && (
                  <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-500/30 text-[11px] text-blue-200 flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span>
                      Pada <strong>Celah Tunggal (N=1)</strong>, interferensi antar-celah tidak terjadi.
                      Pola terbentuk murni dari <strong>difraksi celah tunggal</strong>.
                    </span>
                  </div>
                )}
              </div>

              {/* 3. Slit Width (a) */}
              <div className="flex flex-col gap-2 border-t border-slate-800/80 pt-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="slider-a" className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <span>Lebar Celah (a)</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      [0.02 - {N > 1 ? Math.min(0.20, dMm).toFixed(2) : "0.20"} mm]
                    </span>
                  </label>
                  <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 text-xs">
                    {aMm.toFixed(2)} mm
                  </span>
                </div>
                <input
                  id="slider-a"
                  type="range"
                  min={0.02}
                  max={N > 1 ? Math.min(0.20, dMm) : 0.20}
                  step={0.01}
                  value={aMm}
                  onChange={(e) => handleAChange(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>0.02 mm</span>
                  <span>Maks = {N > 1 ? `min(0.20, d) = ${Math.min(0.20, dMm).toFixed(2)} mm` : "0.20 mm"}</span>
                </div>
              </div>

              {/* 4. Slit Separation (d) */}
              <div className="flex flex-col gap-2 border-t border-slate-800/80 pt-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="slider-d" className={`font-semibold ${N <= 1 ? "text-slate-500" : "text-slate-200"}`}>
                    Jarak Antar-Celah (d)
                  </label>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded border text-xs ${
                      N <= 1
                        ? "bg-slate-900 text-slate-600 border-slate-800"
                        : "bg-slate-800 text-amber-300 border-slate-700"
                    }`}
                  >
                    {N <= 1 ? "N/A" : `${dMm.toFixed(2)} mm`}
                  </span>
                </div>
                <input
                  id="slider-d"
                  type="range"
                  min={Math.max(0.10, aMm)}
                  max={1.00}
                  step={0.01}
                  disabled={N <= 1}
                  value={dMm}
                  onChange={(e) => handleDChange(parseFloat(e.target.value))}
                  className={`w-full cursor-pointer ${
                    N <= 1 ? "opacity-30 cursor-not-allowed" : "accent-amber-400"
                  }`}
                />
                <div className="flex items-center justify-between text-[10px] font-mono">
                  {N <= 1 ? (
                    <span className="text-slate-500 italic">
                      Dinonaktifkan (hanya berlaku untuk N ≥ 2)
                    </span>
                  ) : (
                    <>
                      <span className="text-slate-400">Min = a ({aMm.toFixed(2)} mm)</span>
                      <span className="text-slate-500">1.00 mm</span>
                    </>
                  )}
                </div>

                {/* Constraint badge d >= a */}
                {N > 1 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/30 px-2.5 py-1 rounded-md border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      Aturan Geometris Celah: <strong>d ({dMm.toFixed(2)} mm) ≥ a ({aMm.toFixed(2)} mm)</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* 5. Screen Distance (L) */}
              <div className="flex flex-col gap-2 border-t border-slate-800/80 pt-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="slider-L" className="font-semibold text-slate-200">
                    Jarak Layar ke Celah (L)
                  </label>
                  <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-purple-300 border border-slate-700 text-xs">
                    {LM.toFixed(2)} m
                  </span>
                </div>
                <input
                  id="slider-L"
                  type="range"
                  min={0.5}
                  max={3.0}
                  step={0.1}
                  value={LM}
                  onChange={(e) => setLM(parseFloat(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>0.50 m</span>
                  <span className="text-slate-400">Standar: 1.60 m</span>
                  <span>3.00 m</span>
                </div>
              </div>

              {/* 6. Display & Analysis Options */}
              <div className="flex flex-col gap-2.5 border-t border-slate-800/80 pt-3">
                <span className="font-semibold text-slate-200">Opsi Tampilan & Analisis</span>
                
                {/* Module Formula Comparison Toggle */}
                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCompareModule}
                    onChange={(e) => setShowCompareModule(e.target.checked)}
                    className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-200">
                    Bandingkan dengan Rumus Modul
                  </span>
                </label>

                {/* Auto Screen Scale Toggle */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px]">
                  <span className="text-slate-300">Skala Layar Adaptif (Auto-Span)</span>
                  <button
                    type="button"
                    onClick={() => setAutoScaleScreen(!autoScaleScreen)}
                    className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border transition-colors cursor-pointer ${
                      autoScaleScreen
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    {autoScaleScreen ? `Aktif (±${adaptiveSpanMm} mm)` : "Manual (±12 mm)"}
                  </button>
                </div>
              </div>
            </div>

            {/* ════════ NUMERICAL OUTPUT PANEL ════════ */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-3 font-mono text-xs">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5 text-slate-200 font-sans font-bold">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span>Panel Keluaran Numerik</span>
              </div>

              {outputs.isSingleSlit ? (
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400">λ·L / a (Gelap Orde 1)</span>
                    <span className="text-emerald-400 font-bold">
                      {outputs.firstDarkMm.toFixed(3)} mm
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400">Lebar Terang Pusat (2λ·L/a)</span>
                    <span className="text-cyan-300 font-bold">
                      {outputs.centralWidthMm.toFixed(3)} mm
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400">Perkiraan Terang Sekunder 1</span>
                    <span className="text-purple-300 font-bold">
                      {outputs.approxFirstBrightMm.toFixed(3)} mm
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400">λ·L / d (Pola Interferensi)</span>
                    <span className="text-amber-300 font-bold">
                      {outputs.lambdaL_over_d_mm.toFixed(3)} mm
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400">λ·L / a (Selubung Difraksi)</span>
                    <span className="text-cyan-300 font-bold">
                      {outputs.lambdaL_over_a_mm.toFixed(3)} mm
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400">n(Ts) Terang Sekunder</span>
                    <span className="text-purple-300 font-bold">
                      {outputs.secondaryCount} buah
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400">n(G) Garis Gelap Minimum</span>
                    <span className="text-slate-200 font-bold">
                      {outputs.darkCount} buah
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400">Puncak Terang Primer Orde 1</span>
                    <span className="text-emerald-400 font-bold">
                      {outputs.exactOrder1Mm.toFixed(3)} mm
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ════════ RIGHT COLUMN: Interactive Instruments (8 Cols) ════════ */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* 1. Optical Bench Visual Overview */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>1. Bangku Optik Virtual (Optical Bench)</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  L = {LM.toFixed(2)} m
                </span>
              </div>
              <OpticalBenchApparatus
                slitKey={slitKeyMapped}
                onSelectSlit={(key) => {
                  const preset = SSG_SLIT_PRESETS[key];
                  if (preset) {
                    setN(preset.N);
                    setAMm(preset.a * 1000);
                    setDMm(preset.d * 1000);
                  }
                }}
                isLaserOn={laserOn}
                onToggleLaser={() => setLaserOn(!laserOn)}
                dimmer={dimmer}
                onDimmerChange={setDimmer}
                distanceL={LM}
              />
            </div>

            {/* 2. Projection Screen (ScreenPatternView) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span>2. Layar Proyeksi Milimeter Blok</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Rentang Layar: ±{activeSpanMm.toFixed(1)} mm
                </span>
              </div>
              <ScreenPatternView
                lambda={lambdaSI}
                L={LM}
                a={aSI}
                d={dSI}
                N={N}
                spanMm={activeSpanMm}
                dimmer={laserOn ? dimmer : 0}
                exposure={exposure}
                onExposureChange={setExposure}
                markers={markers}
                activeMarkerTn={activeMarkerTn}
                onMarkerChange={(tn, yMm) => {
                  setMarkers((prev) =>
                    prev.map((m) => (m.tn === tn ? { ...m, yMm } : m))
                  );
                }}
                onSelectMarker={setActiveMarkerTn}
                onResetMarkers={handleResetMarkers}
                isZoomActive={zoomActive}
                onToggleZoom={() => setZoomActive((prev) => !prev)}
                showSecondaryHighlight={showSecondaryHighlight}
              />
            </div>

            {/* 3. Intensity Profile Graph (IntensityProfileGraph) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <span>3. Profil Intensitas Fraunhofer I(y) / I₀</span>
                </span>
                <div className="flex items-center gap-3 text-[11px]">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200">
                    <input
                      type="checkbox"
                      checked={showEnvelope}
                      onChange={(e) => setShowEnvelope(e.target.checked)}
                      className="accent-cyan-400 rounded cursor-pointer"
                    />
                    <span>Selubung Difraksi</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200">
                    <input
                      type="checkbox"
                      checked={showMinimaMarkers}
                      onChange={(e) => setShowMinimaMarkers(e.target.checked)}
                      className="accent-purple-400 rounded cursor-pointer"
                    />
                    <span>Garis Gelap (Minima)</span>
                  </label>
                </div>
              </div>
              <IntensityProfileGraph
                lambda={lambdaSI}
                L={LM}
                a={aSI}
                d={dSI}
                N={N}
                spanMm={activeSpanMm}
                showEnvelope={showEnvelope}
                showMinimaMarkers={showMinimaMarkers}
                showPeakLabels={true}
              />
            </div>

            {/* 4. Comparative Analysis: Fraunhofer vs Module Formula */}
            {showCompareModule && N >= 2 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 border border-amber-500/30 shadow-xl flex flex-col gap-4 text-xs">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                    <Scale className="w-4 h-4" />
                    <span>Perbandingan: Puncak Fraunhofer vs Rumus Modul</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    N = {N} | d = {dMm.toFixed(2)} mm
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                        <th className="py-2 px-3">Titik Terang</th>
                        <th className="py-2 px-3">Jenis Puncak</th>
                        <th className="py-2 px-3">Fraunhofer Sebenarnya</th>
                        <th className="py-2 px-3">Rumus Modul y(Tn, N)</th>
                        <th className="py-2 px-3 text-right">Selisih (|Δy|)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {comparisonData.map((row) => (
                        <tr key={row.tn} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-amber-300">
                            T{row.tn}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-sans font-semibold uppercase ${
                                row.tn === 0
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : row.type === "primer"
                                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                  : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              }`}
                            >
                              {row.tn === 0 ? "Pusat" : row.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-100">
                            {row.exactPosMm.toFixed(4)} mm
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {row.modulePosMm.toFixed(4)} mm
                          </td>
                          <td className="py-2.5 px-3 text-right text-amber-400 font-bold">
                            {row.diffUm < 1
                              ? `${row.diffUm.toFixed(2)} µm (< 1 µm)`
                              : `${(row.diffUm / 1000).toFixed(4)} mm (${row.diffUm.toFixed(0)} µm)`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Important Physics Guidance Note from Module Specification */}
                <div className="p-3 bg-amber-950/30 border border-amber-500/20 rounded-xl text-[11px] text-amber-200/90 leading-relaxed flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Catatan Fisika Penting:</strong> Rumus posisi gelap modul{" "}
                    <code className="text-amber-300 font-mono">y_m = (m - 1/2) · λ·L / d</code>{" "}
                    hanya tepat secara analitik untuk <strong>N = 2</strong> (Celah Ganda).
                    Untuk <strong>N ≥ 3</strong>, pola interferensi menghasilkan garis gelap sejati pada{" "}
                    <code className="text-amber-300 font-mono">k · λ·L / (N·d)</code>,
                    yang tampak presisi pada kurva minimum grafik intensitas di atas.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ExploreShell>
  );
}
