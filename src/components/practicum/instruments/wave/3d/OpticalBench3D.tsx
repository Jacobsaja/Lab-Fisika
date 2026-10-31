"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isWebGLAvailable } from "./webglUtils";
import { OpticalBenchApparatus } from "../OpticalBenchApparatus";
import OpticalBench3DScene from "./OpticalBench3DScene";
import {
  DEFAULT_LASER_WAVELENGTH,
  DEFAULT_SCREEN_DISTANCE_L,
  SSG_SLIT_PRESETS,
  classifyInterference,
  fraunhoferIntensity,
  getAdjacentPrimaryPeakYMm,
  pathDifference,
  pathDifferenceInWavelengths,
  wavelengthToHex,
  wavelengthToRgb,
} from "@/physics/waveOptics";
import {
  AlertTriangle,
  Box,
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers,
  Sliders,
} from "lucide-react";
import type { CameraPreset, OpticalBench3DTelemetry } from "./OpticalBench3DScene";

export interface OpticalBench3DProps {
  slitKey?: "slit2" | "slit3" | "slit5";
  onSelectSlit?: (slitKey: "slit2" | "slit3" | "slit5") => void;
  lambdaNm?: number;
  N?: number;
  aMm?: number;
  dMm?: number;
  distanceL?: number;
  isLaserOn?: boolean;
  onToggleLaser?: () => void;
  dimmer?: number;
  onDimmerChange?: (dimmer: number) => void;
  exposure?: number;
  spanMm?: number;
  mode?: "explore" | "practicum";
  showGeometry?: boolean;
  onToggleGeometry?: () => void;
  pointPYMm?: number;
  onPointPYChange?: (yMm: number) => void;
  cameraPreset?: CameraPreset;
  onCameraPresetChange?: (preset: CameraPreset) => void;
  onFrameRendered?: () => void;
  onTelemetryUpdate?: (telemetry: OpticalBench3DTelemetry) => void;
  onFallbackTriggered?: () => void;
  className?: string;
  forceFallback2D?: boolean;
}

/**
 * OpticalBench3D: Wraps Three.js/R3F with runtime WebGL detection and context-loss handling.
 * Shares the exact same props and DOM controls (Laser switch, Dimmer, Geometri Sinar / Titik P)
 * as the 2.5D OpticalBenchApparatus. If WebGL is unavailable or context is lost, it seamlessly
 * degrades to the 2.5D OpticalBenchApparatus with a clear status message.
 */
export function OpticalBench3D({
  slitKey = "slit2",
  onSelectSlit,
  lambdaNm = 632.8,
  N = 2,
  aMm = 0.04,
  dMm = 0.5,
  distanceL = DEFAULT_SCREEN_DISTANCE_L,
  isLaserOn = true,
  onToggleLaser,
  dimmer = 1.0,
  onDimmerChange,
  exposure = 1.8,
  spanMm = 12.0,
  mode = "explore",
  showGeometry = false,
  onToggleGeometry,
  pointPYMm = 0,
  onPointPYChange,
  cameraPreset = "oblique",
  onCameraPresetChange,
  onFrameRendered,
  onTelemetryUpdate,
  onFallbackTriggered,
  className = "",
  forceFallback2D = false,
}: OpticalBench3DProps) {
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null);
  const [contextLost, setContextLost] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<CameraPreset>(cameraPreset);

  // Permanent Rule: callback props stored in useRef
  const onFallbackTriggeredRef = useRef(onFallbackTriggered);
  onFallbackTriggeredRef.current = onFallbackTriggered;
  const onCameraPresetChangeRef = useRef(onCameraPresetChange);
  onCameraPresetChangeRef.current = onCameraPresetChange;
  const onPointPYChangeRef = useRef(onPointPYChange);
  onPointPYChangeRef.current = onPointPYChange;

  useEffect(() => {
    setActivePreset(cameraPreset);
  }, [cameraPreset]);

  // Check WebGL availability on client mount
  useEffect(() => {
    if (forceFallback2D) {
      setHasWebGL(false);
      onFallbackTriggeredRef.current?.();
      return;
    }
    const available = isWebGLAvailable();
    setHasWebGL(available);
    if (!available) {
      onFallbackTriggeredRef.current?.();
    }
  }, [forceFallback2D]);

  const handleContextLost = useCallback(() => {
    setContextLost(true);
    onFallbackTriggeredRef.current?.();
  }, []);

  const handlePresetSelect = (preset: CameraPreset) => {
    setActivePreset(preset);
    onCameraPresetChangeRef.current?.(preset);
  };

  const currentSlit = SSG_SLIT_PRESETS[slitKey];
  const activeLambdaNm = lambdaNm ?? Math.round(DEFAULT_LASER_WAVELENGTH * 1e9);
  const laserRgb = useMemo(() => wavelengthToRgb(activeLambdaNm), [activeLambdaNm]);
  const laserHex = useMemo(() => wavelengthToHex(activeLambdaNm), [activeLambdaNm]);

  const activeN = N ?? currentSlit.N;
  const activeAMm = aMm ?? currentSlit.a * 1e3;
  const activeDMm = dMm ?? currentSlit.d * 1e3;

  const lambdaSI = activeLambdaNm * 1e-9;
  const dSI = activeDMm * 1e-3;
  const aSI = activeAMm * 1e-3;
  const currentYMm = pointPYMm ?? (dSI > 0 ? ((lambdaSI * distanceL) / dSI) * 1000 : 2.0);
  const currentYM = currentYMm * 1e-3;

  const thetaRad = Math.atan(currentYM / distanceL);
  const thetaDeg = (thetaRad * 180) / Math.PI;
  const deltaM = pathDifference(currentYM, dSI, distanceL);
  const deltaNm = deltaM * 1e9;
  const deltaOverLambda = pathDifferenceInWavelengths(currentYM, dSI, distanceL, lambdaSI);
  const pClassification = classifyInterference(deltaOverLambda, activeN);
  const pIntensity = fraunhoferIntensity(currentYM, lambdaSI, distanceL, aSI, dSI, activeN);

  const handleJumpPrev = useCallback(() => {
    if (!onPointPYChangeRef.current) return;
    const nextY = getAdjacentPrimaryPeakYMm(currentYMm, "prev", lambdaSI, distanceL, dSI, spanMm);
    onPointPYChangeRef.current(nextY);
  }, [currentYMm, lambdaSI, distanceL, dSI, spanMm]);

  const handleJumpNext = useCallback(() => {
    if (!onPointPYChangeRef.current) return;
    const nextY = getAdjacentPrimaryPeakYMm(currentYMm, "next", lambdaSI, distanceL, dSI, spanMm);
    onPointPYChangeRef.current(nextY);
  }, [currentYMm, lambdaSI, distanceL, dSI, spanMm]);

  const isBeamActive = isLaserOn && dimmer > 0.01;
  const isFallbackNeeded = forceFallback2D || hasWebGL === false || contextLost;

  // ─── 2.5D Fallback Mode ─────────────────────────────────────────────────────
  if (isFallbackNeeded) {
    return (
      <div className={`flex flex-col gap-3 ${className}`} data-testid="optical-bench-3d-fallback">
        <div
          role="status"
          className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs shadow-md"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            {forceFallback2D
              ? "Mode simulasi cadangan aktif: WebGL dinonaktifkan secara manual."
              : contextLost
              ? "Konteks WebGL terputus. Beralih otomatis ke Bangku Optik 2.5D."
              : "Akselerasi WebGL tidak didukung pada peramban ini. Menampilkan Bangku Optik 2.5D sebagai cadangan visual."}
          </span>
        </div>

        <OpticalBenchApparatus
          mode={mode}
          slitKey={slitKey}
          onSelectSlit={onSelectSlit}
          lambdaNm={activeLambdaNm}
          N={activeN}
          aMm={activeAMm}
          dMm={activeDMm}
          distanceL={distanceL}
          isLaserOn={isLaserOn}
          onToggleLaser={onToggleLaser}
          dimmer={dimmer}
          onDimmerChange={onDimmerChange}
          showGeometry={showGeometry}
          onToggleGeometry={onToggleGeometry}
          pointPYMm={pointPYMm}
          onPointPYChange={onPointPYChange}
          spanMm={spanMm}
        />
      </div>
    );
  }

  // ─── 3D R3F Interactive Scene & Unified DOM Controls ───────────────────────
  return (
    <div
      className={`p-4 rounded-2xl glass-panel border border-slate-800 flex flex-col gap-3 text-xs ${className}`}
      data-testid="optical-bench-3d-wrapper"
    >
      {/* ── Single Unified Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2.5">
          <div
            className="p-1.5 rounded-xl border transition-colors shadow-sm"
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

        <div className="flex flex-wrap items-center gap-2">
          {/* Camera Preset Selector */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-800">
            <Box className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-slate-200">Kamera 3D (Preset):</span>
            <div className="flex items-center gap-1" role="group" aria-label="Pilihan Preset Kamera 3D">
              {(
                [
                  { key: "oblique", label: "Serong (3/4)", ariaLabel: "Preset kamera Serong (3/4)", icon: Eye },
                  { key: "side", label: "Samping", ariaLabel: "Preset kamera Samping", icon: Layers },
                  { key: "top", label: "Tampak Atas", ariaLabel: "Preset kamera Tampak Atas", icon: Box },
                ] as const
              ).map(({ key, label, ariaLabel, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePresetSelect(key)}
                  aria-label={ariaLabel}
                  aria-pressed={activePreset === key}
                  className={`min-h-[32px] px-2.5 py-1 rounded-lg font-medium text-xs border transition-all flex items-center gap-1.5 cursor-pointer ${
                    activePreset === key
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-sm shadow-cyan-500/20"
                      : "bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              ))}
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
      </div>

      {/* ── Main 3D Canvas & Docked Laser/Geometry Toolbar (Identical DOM to 2.5D) ── */}
      <div className="relative w-full overflow-hidden bg-gradient-to-b from-[#020617] via-[#050b18] to-[#02050e] rounded-xl border border-slate-800/90 shadow-2xl flex flex-col">
        <OpticalBench3DScene
          lambdaNm={activeLambdaNm}
          N={activeN}
          aMm={activeAMm}
          dMm={activeDMm}
          distanceL={distanceL}
          isLaserOn={isLaserOn}
          dimmer={dimmer}
          exposure={exposure}
          spanMm={spanMm}
          showGeometry={showGeometry}
          pointPYMm={currentYMm}
          cameraPreset={activePreset}
          onFrameRendered={onFrameRendered}
          onTelemetryUpdate={onTelemetryUpdate}
          onContextLost={handleContextLost}
          className="rounded-none border-0"
        />

        {/* ── Bottom Docked Laser Switch, Dimmer, & Geometri Sinar (Titik P) ── */}
        {(onToggleLaser || onDimmerChange || (mode === "explore" && onToggleGeometry)) && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 bg-slate-950/90 border-t border-slate-800/90 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {onToggleLaser && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={isLaserOn}
                  aria-label={
                    isLaserOn
                      ? "Saklar Laser: Aktif (klik untuk mematikan)"
                      : "Saklar Laser: Mati (klik untuk menyalakan)"
                  }
                  onClick={onToggleLaser}
                  className={`min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl text-xs font-medium border transition-all duration-200 flex items-center gap-2.5 cursor-pointer select-none active:scale-95 ${
                    isLaserOn
                      ? "bg-slate-900 border-slate-700 shadow-md hover:border-slate-600"
                      : "bg-slate-950 hover:bg-slate-900 text-slate-400 border-slate-800"
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      isLaserOn ? "animate-pulse" : ""
                    }`}
                    style={{
                      backgroundColor: isLaserOn ? laserHex : "#475569",
                      boxShadow: isLaserOn ? `0 0 8px ${laserHex}` : "none",
                    }}
                  />
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
                  <span
                    className={`font-semibold text-xs ${
                      isLaserOn ? "text-slate-100" : "text-slate-400"
                    }`}
                  >
                    Laser: {isLaserOn ? "Aktif" : "Mati"}
                  </span>
                </button>
              )}

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

            {mode === "explore" && onToggleGeometry && (
              <button
                type="button"
                onClick={onToggleGeometry}
                aria-label="Diagram Geometri Sinar (Titik P)"
                aria-pressed={showGeometry}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 active:scale-95 ${
                  showGeometry
                    ? "bg-amber-500/20 text-amber-300 border-amber-400/60 shadow-sm shadow-amber-500/20"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
              >
                <Eye className="w-4 h-4 text-amber-400" />
                <span>Geometri Sinar (Titik P)</span>
              </button>
            )}
          </div>
        )}

        {/* ── Compact Mono Panel for Point P (Explore Mode & showGeometry Active) ── */}
        {mode === "explore" && showGeometry && (
          <div
            data-testid="point-p-mono-panel"
            className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950 border-t border-slate-800/90 text-xs font-mono"
          >
            {activeN <= 1 ? (
              <div className="text-amber-400 font-sans text-xs flex items-center gap-2">
                <span>Celah tunggal (N = 1): Fitur Titik P interferensi celah majemuk dinonaktifkan.</span>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">y:</span>
                    <span className="text-cyan-300 font-bold">
                      {currentYMm >= 0 ? `+${currentYMm.toFixed(2)}` : currentYMm.toFixed(2)} mm
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">θ:</span>
                    <span className="text-amber-300 font-bold">{thetaDeg.toFixed(3)}°</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Δ = d·sin(θ):</span>
                    <span className="text-purple-300 font-bold">{deltaNm.toFixed(1)} nm</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Δ/λ:</span>
                    <span className="text-pink-300 font-bold">{deltaOverLambda.toFixed(3)}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">I/I₀:</span>
                    <span className="text-emerald-300 font-bold">{pIntensity.toFixed(3)}</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-xs font-sans font-semibold border ${
                      pClassification.type === "terang_primer"
                        ? "bg-amber-500/20 text-amber-200 border-amber-400/50"
                        : pClassification.type === "gelap"
                        ? "bg-slate-800 text-slate-300 border-slate-700"
                        : "bg-cyan-950/60 text-cyan-300 border-cyan-800/60"
                    }`}
                  >
                    {pClassification.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-sans">
                  <button
                    type="button"
                    onClick={handleJumpPrev}
                    aria-label="Lompat ke terang primer sebelumnya"
                    className="min-h-[44px] px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer text-xs font-medium"
                  >
                    <ChevronLeft className="w-4 h-4 text-amber-400" />
                    <span>Terang Sebelumnya</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleJumpNext}
                    aria-label="Lompat ke terang primer berikutnya"
                    className="min-h-[44px] px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer text-xs font-medium"
                  >
                    <span>Terang Berikutnya</span>
                    <ChevronRight className="w-4 h-4 text-amber-400" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default OpticalBench3D;
