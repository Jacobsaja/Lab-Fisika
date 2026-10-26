"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import {
  DEFAULT_LASER_WAVELENGTH,
  DEFAULT_SCREEN_DISTANCE_L,
  READING_RESOLUTION_MM,
  ZOOM_READING_RESOLUTION_MM,
  SSG_SLIT_PRESETS,
  fraunhoferIntensity,
  quantizeToResolution,
} from "@/physics/waveOptics";
import { ZoomIn, Eye, Sun, Maximize2, Crosshair, Sparkles } from "lucide-react";

export interface MarkerPoint {
  id: string;
  tn: number;
  label: string;
  yMm: number;
  isAssisted?: boolean;
}

export interface ScreenPatternViewProps {
  lambda?: number;
  L?: number;
  a?: number;
  d?: number;
  N?: number;
  dimmer?: number; // 0.1 to 1.0
  exposure?: number; // 0.5 to 5.0 (gain / contrast multiplier)
  onExposureChange?: (val: number) => void;
  markers?: MarkerPoint[];
  activeMarkerTn?: number;
  onMarkerChange?: (tn: number, yMm: number) => void;
  onSelectMarker?: (tn: number) => void;
  readOnly?: boolean;
  showSecondaryHighlight?: boolean;
  className?: string;
}

/**
 * Millimeter block projection screen visualizing physical Fraunhofer diffraction
 * and multi-slit interference patterns with optical bloom, exposure/contrast scaling,
 * digital millimeter ruler, and interactive 0.1 mm precision zoom lens.
 */
export function ScreenPatternView({
  lambda = DEFAULT_LASER_WAVELENGTH,
  L = DEFAULT_SCREEN_DISTANCE_L,
  a = SSG_SLIT_PRESETS.slit2.a,
  d = SSG_SLIT_PRESETS.slit2.d,
  N = 2,
  dimmer = 1.0,
  exposure = 1.8, // Default praktikum: secondary peaks N=5 are faint but visible
  onExposureChange,
  markers = [],
  activeMarkerTn = 0,
  onMarkerChange,
  onSelectMarker,
  readOnly = false,
  showSecondaryHighlight = false,
  className = "",
}: ScreenPatternViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const zoomCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Screen horizontal span: -12.0 mm to +12.0 mm
  const spanMm = 12.0;

  // Zoom magnifier state
  const [isZoomActive, setIsZoomActive] = useState<boolean>(false);
  const [hoverYMm, setHoverYMm] = useState<number | null>(null);

  // Current active resolution
  const activeResolutionMm = isZoomActive
    ? ZOOM_READING_RESOLUTION_MM
    : READING_RESOLUTION_MM;

  // Converts wavelength in meters to RGB string for visual realism
  const laserRgb = useMemo(() => {
    const nm = lambda * 1e9;
    if (nm < 480) return "139, 92, 246"; // Violet / blue
    if (nm < 510) return "6, 182, 212";  // Cyan
    if (nm < 560) return "34, 197, 94";  // Green
    if (nm < 590) return "234, 179, 8";  // Yellow
    if (nm < 620) return "249, 115, 22"; // Orange
    return "239, 68, 68";                // Red 632 nm
  }, [lambda]);

  // Main canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Coordinate mapping: x in [0, width] -> yMm in [-spanMm, +spanMm]
    const centerY = height / 2;

    // Draw background millimeter grid
    // mm block background: dark slate with subtle millimeter grid
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, width, height);

    // Draw millimeter vertical grid lines
    const pxPerMm = width / (2 * spanMm);
    const originX = width / 2;

    // Sub-millimeter & millimeter lines
    for (let mm = -Math.floor(spanMm); mm <= Math.floor(spanMm); mm++) {
      const x = originX + mm * pxPerMm;
      const isOrigin = mm === 0;
      const isFiveMm = mm % 5 === 0;

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);

      if (isOrigin) {
        ctx.strokeStyle = "rgba(6, 182, 212, 0.7)"; // Cyan center line
        ctx.lineWidth = 1.5;
      } else if (isFiveMm) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.lineWidth = 1;
      } else {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 0.5;
      }
      ctx.stroke();

      // Millimeter numbers along bottom
      if (isFiveMm || isOrigin) {
        ctx.fillStyle = isOrigin ? "#38bdf8" : "rgba(255, 255, 255, 0.4)";
        ctx.font = isOrigin ? "bold 10px monospace" : "9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${mm > 0 ? "+" : ""}${mm}`, x, height - 6);
      }
    }

    // Horizontal center beam track
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Render Fraunhofer diffraction/interference pattern
    // Compute intensity per pixel column
    const beamHalfH = 32; // Vertical height of beam spot
    const stepPx = 1;

    for (let px = 0; px < width; px += stepPx) {
      const yMm = ((px - originX) / pxPerMm);
      const yMeters = yMm * 1e-3;

      const physicalI = fraunhoferIntensity(yMeters, lambda, L, a, d, N);
      // Intensity scaled by laser dimmer (power) and exposure (camera / visual contrast)
      const visibleI = Math.min(1.0, physicalI * dimmer * exposure);

      if (visibleI > 0.003) {
        // Core vertical diffraction streak with bloom gradient
        const grad = ctx.createLinearGradient(px, centerY - beamHalfH, px, centerY + beamHalfH);
        grad.addColorStop(0, `rgba(${laserRgb}, 0)`);
        grad.addColorStop(0.3, `rgba(${laserRgb}, ${visibleI * 0.4})`);
        grad.addColorStop(0.5, `rgba(${laserRgb}, ${visibleI * 0.95})`);
        grad.addColorStop(0.7, `rgba(${laserRgb}, ${visibleI * 0.4})`);
        grad.addColorStop(1, `rgba(${laserRgb}, 0)`);

        ctx.fillStyle = grad;
        ctx.fillRect(px, centerY - beamHalfH, stepPx, beamHalfH * 2);

        // Intense center filament for high brightness
        if (visibleI > 0.5) {
          const coreH = beamHalfH * 0.35;
          const coreAlpha = (visibleI - 0.5) * 2;
          ctx.fillStyle = `rgba(255, 255, 255, ${coreAlpha * 0.8})`;
          ctx.fillRect(px, centerY - coreH, stepPx, coreH * 2);
        }
      }
    }
  }, [lambda, L, a, d, N, dimmer, exposure, spanMm, laserRgb]);

  // Zoom lens canvas rendering (around hoverYMm or active marker)
  useEffect(() => {
    if (!isZoomActive) return;
    const zoomCanvas = zoomCanvasRef.current;
    if (!zoomCanvas) return;
    const ctx = zoomCanvas.getContext("2d");
    if (!ctx) return;

    const width = zoomCanvas.width;
    const height = zoomCanvas.height;
    ctx.clearRect(0, 0, width, height);

    // Center zoom window at hoverYMm or active marker
    const activeMarker = markers.find((m) => m.tn === activeMarkerTn);
    const centerFocusMm = hoverYMm !== null ? hoverYMm : activeMarker ? activeMarker.yMm : 0;

    // Zoom window shows +/- 1.5 mm around centerFocusMm
    const zoomSpanMm = 1.5;
    const pxPerMm = width / (2 * zoomSpanMm);
    const originX = width / 2;

    // Background
    ctx.fillStyle = "#060913";
    ctx.fillRect(0, 0, width, height);

    // Draw 0.1 mm precision grid in zoom view
    const startMm = Math.floor((centerFocusMm - zoomSpanMm) * 10) / 10;
    const endMm = Math.ceil((centerFocusMm + zoomSpanMm) * 10) / 10;

    for (let mm10 = Math.round(startMm * 10); mm10 <= Math.round(endMm * 10); mm10++) {
      const curMm = mm10 / 10;
      const x = originX + (curMm - centerFocusMm) * pxPerMm;

      const isOneMm = Math.abs(curMm - Math.round(curMm)) < 1e-4;
      const isHalfMm = Math.abs((curMm * 2) - Math.round(curMm * 2)) < 1e-4;

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);

      if (isOneMm) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1.5;
      } else if (isHalfMm) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 1;
      } else {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 0.5;
      }
      ctx.stroke();

      // Coordinate labels at 0.5 mm or 1.0 mm
      if (isHalfMm || isOneMm) {
        ctx.fillStyle = isOneMm ? "#38bdf8" : "rgba(255, 255, 255, 0.5)";
        ctx.font = isOneMm ? "bold 10px monospace" : "9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(curMm.toFixed(1), x, height - 6);
      }
    }

    // Render zoomed Fraunhofer beam
    const centerY = height / 2;
    const beamHalfH = 30;

    for (let px = 0; px < width; px += 1) {
      const curMm = centerFocusMm + (px - originX) / pxPerMm;
      const yMeters = curMm * 1e-3;

      const physicalI = fraunhoferIntensity(yMeters, lambda, L, a, d, N);
      const visibleI = Math.min(1.0, physicalI * dimmer * exposure);

      if (visibleI > 0.003) {
        const grad = ctx.createLinearGradient(px, centerY - beamHalfH, px, centerY + beamHalfH);
        grad.addColorStop(0, `rgba(${laserRgb}, 0)`);
        grad.addColorStop(0.3, `rgba(${laserRgb}, ${visibleI * 0.4})`);
        grad.addColorStop(0.5, `rgba(${laserRgb}, ${visibleI * 0.95})`);
        grad.addColorStop(0.7, `rgba(${laserRgb}, ${visibleI * 0.4})`);
        grad.addColorStop(1, `rgba(${laserRgb}, 0)`);

        ctx.fillStyle = grad;
        ctx.fillRect(px, centerY - beamHalfH, 1, beamHalfH * 2);

        if (visibleI > 0.5) {
          const coreH = beamHalfH * 0.35;
          const coreAlpha = (visibleI - 0.5) * 2;
          ctx.fillStyle = `rgba(255, 255, 255, ${coreAlpha * 0.8})`;
          ctx.fillRect(px, centerY - coreH, 1, coreH * 2);
        }
      }
    }

    // Center reticle
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [isZoomActive, hoverYMm, activeMarkerTn, markers, lambda, L, a, d, N, dimmer, exposure, laserRgb]);

  // Handle click on screen to place / move active marker
  const handleScreenClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (readOnly || onMarkerChange === undefined) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const normalizedRatio = clickX / rect.width; // 0 to 1
      const rawYMm = (normalizedRatio - 0.5) * (2 * spanMm);

      // Quantize to active resolution
      const quantizedMm = quantizeToResolution(Math.max(0, rawYMm), activeResolutionMm);
      onMarkerChange(activeMarkerTn, quantizedMm);
    },
    [readOnly, onMarkerChange, activeMarkerTn, spanMm, activeResolutionMm]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const moveX = e.clientX - rect.left;
      const normalizedRatio = moveX / rect.width;
      const rawYMm = (normalizedRatio - 0.5) * (2 * spanMm);
      setHoverYMm(quantizeToResolution(rawYMm, activeResolutionMm));
    },
    [spanMm, activeResolutionMm]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverYMm(null);
  }, []);

  return (
    <div className={`flex flex-col gap-3 glass-panel p-4 rounded-xl border border-slate-800 ${className}`}>
      {/* Top Header & Resolution Readout */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 flex items-center gap-2">
              Layar Proyeksi Milimeter Blok
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                L = {L.toFixed(2)} m
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Pola interferensi-difraksi cahaya laser (λ = {(lambda * 1e9).toFixed(0)} nm)
            </p>
          </div>
        </div>

        {/* Active Resolution Indicator */}
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1 rounded-lg border font-mono text-xs flex items-center gap-2 transition-colors ${
              isZoomActive
                ? "bg-cyan-950/70 border-cyan-500/50 text-cyan-300"
                : "bg-slate-900 border-slate-700 text-slate-300"
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Resolusi Aktif: <strong className="font-bold">{activeResolutionMm.toFixed(1)} mm</strong></span>
            {isZoomActive && (
              <span className="text-[10px] bg-cyan-500/20 px-1.5 py-0.2 rounded text-cyan-200">
                Zoom 5×
              </span>
            )}
          </div>

          {/* Toggle Zoom Button */}
          <button
            type="button"
            onClick={() => setIsZoomActive(!isZoomActive)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
              isZoomActive
                ? "bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-400"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
            }`}
            title="Aktifkan Kaca Pembesar Zoom (Resolusi 0,1 mm)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
            <span>{isZoomActive ? "Tutup Zoom" : "Kaca Pembesar Zoom"}</span>
          </button>
        </div>
      </div>

      {/* Main Millimeter Block Projection Screen */}
      <div
        className="relative w-full h-44 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-inner cursor-crosshair group select-none"
        onClick={handleScreenClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={176}
          className="w-full h-full block"
        />

        {/* Render Markers Overlay */}
        {markers.map((m) => {
          // Convert m.yMm to screen percentage:
          // origin is at 50%
          const pct = 50 + (m.yMm / (2 * spanMm)) * 100;
          if (pct < 0 || pct > 100) return null;
          const isSelected = m.tn === activeMarkerTn;

          return (
            <div
              key={m.id || `marker-${m.tn}`}
              style={{ left: `${pct}%` }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectMarker?.(m.tn);
              }}
              className="absolute top-0 bottom-0 -translate-x-1/2 pointer-events-auto flex flex-col items-center justify-between group/marker"
            >
              {/* Top Pin Label */}
              <div
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border shadow-md transition-transform ${
                  isSelected
                    ? "bg-amber-500 text-black border-amber-300 scale-110 z-20"
                    : "bg-slate-900/90 text-amber-300 border-amber-500/40 hover:scale-105 z-10"
                }`}
              >
                {m.label} ({m.yMm.toFixed(isZoomActive ? 1 : 1)} mm)
              </div>

              {/* Vertical Marker Line */}
              <div
                className={`w-0.5 flex-1 transition-colors ${
                  isSelected ? "bg-amber-400 shadow-[0_0_8px_#f59e0b]" : "bg-amber-500/50"
                }`}
              />

              {/* Bottom Marker Triangle */}
              <div
                className={`w-2 h-2 rotate-45 mb-1 ${
                  isSelected ? "bg-amber-400" : "bg-amber-500/60"
                }`}
              />
            </div>
          );
        })}

        {/* Hover Coordinate Crosshair Guideline */}
        {hoverYMm !== null && (
          <div
            style={{ left: `${50 + (hoverYMm / (2 * spanMm)) * 100}%` }}
            className="absolute top-0 bottom-0 -translate-x-1/2 pointer-events-none flex flex-col items-center justify-start z-30"
          >
            <div className="bg-cyan-900/90 text-cyan-200 border border-cyan-400/50 text-[10px] font-mono px-1.5 py-0.5 rounded shadow">
              {hoverYMm >= 0 ? `+${hoverYMm.toFixed(1)}` : hoverYMm.toFixed(1)} mm
            </div>
            <div className="w-px flex-1 border-r border-dashed border-cyan-400/60" />
          </div>
        )}

        {/* Screen Millimeter Paper Grid Legend Badge */}
        <div className="absolute top-2 left-2 pointer-events-none bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded text-[10px] font-mono text-slate-400">
          Kertas Milimeter Blok (Skala Utama: 1 mm | Mayor: 5 mm)
        </div>
      </div>

      {/* Zoom Lens Window (Magnifier) */}
      {isZoomActive && (
        <div className="p-3 bg-slate-900/90 rounded-lg border border-cyan-500/40 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              Jendela Pembesar Zoom 5× (Resolusi Skala 0,1 mm)
            </span>
            <span className="text-slate-400 text-[11px]">
              Garis halus = 0,1 mm | Garis sedang = 0,5 mm | Garis tebal = 1,0 mm
            </span>
          </div>

          <div className="relative w-full h-28 bg-black rounded overflow-hidden border border-slate-700 shadow-inner">
            <canvas
              ref={zoomCanvasRef}
              width={700}
              height={112}
              className="w-full h-full block"
            />
          </div>
        </div>
      )}

      {/* Bottom Controls: Exposure / Contrast & Marker Quick Guidance */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-slate-800/60 text-xs">
        {/* Exposure / Contrast Slider (Available in Explore AND Practicum) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium">Kontras / Eksposur Layar:</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={4.5}
            step={0.1}
            value={exposure}
            onChange={(e) => onExposureChange?.(parseFloat(e.target.value))}
            className="w-32 accent-amber-500 cursor-pointer"
            title="Atur kontras kamera untuk memperjelas terang sekunder celah majemuk"
          />
          <span className="font-mono text-slate-400 text-[11px] w-10">
            {exposure.toFixed(1)}×
          </span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            (Naikkan kontras jika terang sekunder N=5 redup)
          </span>
        </div>

        {/* Tip / Guidance for Marking */}
        <div className="text-[11px] text-slate-400 italic">
          💡 Klik pada layar milimeter blok untuk meletakkan penanda titik terang{" "}
          <strong className="text-amber-400 font-bold">T{activeMarkerTn}</strong>.
        </div>
      </div>
    </div>
  );
}
