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
  getPatternClassification,
  wavelengthToRgb,
} from "@/physics/waveOptics";
import { ZoomIn, Eye, Sun, Maximize2, Crosshair, Sparkles, RotateCcw } from "lucide-react";

export interface MarkerPoint {
  id: string;
  tn: number;
  label: string;
  yMm: number;
  isAssisted?: boolean;
}

export interface ScreenPatternViewProps {
  mode?: "explore" | "practicum";
  lambda?: number;
  L?: number;
  a?: number;
  d?: number;
  N?: number;
  spanMm?: number; // Screen horizontal span (-spanMm to +spanMm, default 12.0 mm)
  dimmer?: number; // 0.1 to 1.0
  exposure?: number; // 0.5 to 5.0 (gain / contrast multiplier)
  onExposureChange?: (val: number) => void;
  markers?: MarkerPoint[];
  activeMarkerTn?: number;
  onMarkerChange?: (tn: number, yMm: number) => void;
  onSelectMarker?: (tn: number) => void;
  onResetMarkers?: () => void;
  isZoomActive?: boolean;
  onToggleZoom?: () => void;
  onResetZoom?: () => void;
  readOnly?: boolean;
  showSecondaryHighlight?: boolean;
  className?: string;
}

/**
 * Millimeter block projection screen visualizing physical Fraunhofer diffraction
 * and multi-slit interference patterns with optical bloom, exposure/contrast scaling,
 * digital millimeter ruler, draggable pin markers, and interactive 0.1 mm precision zoom lens.
 */
export function ScreenPatternView({
  mode = "practicum",
  lambda = DEFAULT_LASER_WAVELENGTH,
  L = DEFAULT_SCREEN_DISTANCE_L,
  a = SSG_SLIT_PRESETS.slit2.a,
  d = SSG_SLIT_PRESETS.slit2.d,
  N = 2,
  spanMm = 12.0,
  dimmer = 1.0,
  exposure = 1.8, // Default praktikum: secondary peaks N=5 are faint but visible
  onExposureChange,
  markers = [],
  activeMarkerTn = 1,
  onMarkerChange,
  onSelectMarker,
  onResetMarkers,
  isZoomActive: controlledZoom,
  onToggleZoom,
  onResetZoom,
  readOnly = false,
  showSecondaryHighlight = false,
  className = "",
}: ScreenPatternViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const zoomCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenRef = useRef<HTMLDivElement | null>(null);

  // Zoom magnifier state (controlled or uncontrolled fallback)
  const [internalZoomActive, setInternalZoomActive] = useState<boolean>(false);
  const isZoomActive = controlledZoom !== undefined ? controlledZoom : internalZoomActive;

  const handleToggleZoom = useCallback(() => {
    if (onToggleZoom) {
      onToggleZoom();
    } else {
      setInternalZoomActive((prev) => !prev);
    }
  }, [onToggleZoom]);

  const [hoverYMm, setHoverYMm] = useState<number | null>(null);
  const [zoomFocusMm, setZoomFocusMm] = useState<number>(0);
  const [draggingTn, setDraggingTn] = useState<number | null>(null);

  // Permanent rule: callback props stored in useRef
  const onMarkerChangeRef = useRef(onMarkerChange);
  onMarkerChangeRef.current = onMarkerChange;
  const onSelectMarkerRef = useRef(onSelectMarker);
  onSelectMarkerRef.current = onSelectMarker;
  const onResetMarkersRef = useRef(onResetMarkers);
  onResetMarkersRef.current = onResetMarkers;
  const onResetZoomRef = useRef(onResetZoom);
  onResetZoomRef.current = onResetZoom;

  const handleResetZoom = useCallback(() => {
    setZoomFocusMm(0);
    onResetZoomRef.current?.();
  }, []);

  // Auto-reset marker positions and classifications immediately when slit N changes
  const prevNRef = useRef(N);
  useEffect(() => {
    if (prevNRef.current !== N) {
      prevNRef.current = N;
      if (onResetMarkersRef.current) {
        onResetMarkersRef.current();
      } else if (onMarkerChangeRef.current) {
        for (let tn = 1; tn <= 4; tn++) {
          onMarkerChangeRef.current(tn, 0);
        }
      }
      onSelectMarkerRef.current?.(1);
    }
  }, [N]);

  // Current active resolution
  const activeResolutionMm = isZoomActive
    ? ZOOM_READING_RESOLUTION_MM
    : READING_RESOLUTION_MM;

  // Converts wavelength in meters to RGB string for visual realism
  const laserRgb = useMemo(() => wavelengthToRgb(lambda * 1e9), [lambda]);

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

    const pxPerMm = width / (2 * spanMm);
    const originX = width / 2;

    // Draw millimeter horizontal grid lines (authentic millimeter block paper grid)
    for (let mmH = -10; mmH <= 10; mmH++) {
      const y = centerY + mmH * pxPerMm;
      if (y >= 0 && y <= height) {
        const isCenter = mmH === 0;
        const isFive = mmH % 5 === 0;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        if (isCenter) {
          ctx.strokeStyle = "rgba(6, 182, 212, 0.25)";
          ctx.lineWidth = 1;
        } else if (isFive) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
          ctx.lineWidth = 0.75;
        } else {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
          ctx.lineWidth = 0.5;
        }
        ctx.stroke();
      }
    }

    // Sub-millimeter & millimeter vertical lines
    for (let mm = -Math.floor(spanMm); mm <= Math.floor(spanMm); mm++) {
      const x = originX + mm * pxPerMm;
      const isOrigin = mm === 0;
      const isFiveMm = mm % 5 === 0;

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);

      if (isOrigin) {
        ctx.strokeStyle = "rgba(6, 182, 212, 0.45)"; // Cyan center origin line
        ctx.lineWidth = 1.0;
      } else if (isFiveMm) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)"; // 5 mm mayor line slightly clearer
        ctx.lineWidth = 0.75;
      } else {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.025)"; // 1 mm line very thin & low contrast
        ctx.lineWidth = 0.5;
      }
      ctx.stroke();

      // Millimeter numbers ONLY along bottom on major ticks (multiples of 5 mm)
      if (isFiveMm || isOrigin) {
        ctx.fillStyle = isOrigin ? "rgba(56, 189, 248, 0.65)" : "rgba(148, 163, 184, 0.35)";
        ctx.font = isOrigin ? "bold 9px monospace" : "9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${mm > 0 ? "+" : ""}${mm}`, x, height - 5);
      }
    }

    // Render Fraunhofer diffraction/interference pattern as tall vertical light streaks
    const beamTop = 8;
    const beamBottom = height - 18;
    const beamH = beamBottom - beamTop;
    const beamCenterY = (beamTop + beamBottom) / 2;

    for (let px = 0; px < width; px += 1) {
      const yMm = ((px - originX) / pxPerMm);
      const yMeters = yMm * 1e-3;

      const physicalI = fraunhoferIntensity(yMeters, lambda, L, a, d, N);
      // Perceptual gamma compression (gamma = 0.55) makes secondary peaks discernible
      const gammaI = Math.pow(Math.max(0, physicalI), 0.55);
      const visibleI = Math.min(1.0, gammaI * dimmer * exposure);

      if (visibleI > 0.002) {
        // Vertical diffraction streak: tall, almost full height, smooth fade at top and bottom
        const grad = ctx.createLinearGradient(px, beamTop, px, beamBottom);
        grad.addColorStop(0, `rgba(${laserRgb}, 0)`);
        grad.addColorStop(0.18, `rgba(${laserRgb}, ${visibleI * 0.25})`);
        grad.addColorStop(0.35, `rgba(${laserRgb}, ${visibleI * 0.7})`);
        grad.addColorStop(0.5, `rgba(${laserRgb}, ${visibleI * 0.95})`);
        grad.addColorStop(0.65, `rgba(${laserRgb}, ${visibleI * 0.7})`);
        grad.addColorStop(0.82, `rgba(${laserRgb}, ${visibleI * 0.25})`);
        grad.addColorStop(1, `rgba(${laserRgb}, 0)`);

        ctx.fillStyle = grad;
        ctx.fillRect(px, beamTop, 1, beamH);

        // Soft white core filament for high brightness regions, smoothly faded vertically
        if (visibleI > 0.35) {
          const coreH = beamH * 0.65;
          const coreTop = beamCenterY - coreH / 2;
          const coreBottom = beamCenterY + coreH / 2;
          const coreAlpha = Math.pow((visibleI - 0.35) / 0.65, 1.2) * 0.85;

          const coreGrad = ctx.createLinearGradient(px, coreTop, px, coreBottom);
          coreGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
          coreGrad.addColorStop(0.25, `rgba(255, 255, 255, ${coreAlpha * 0.4})`);
          coreGrad.addColorStop(0.5, `rgba(255, 255, 255, ${coreAlpha})`);
          coreGrad.addColorStop(0.75, `rgba(255, 255, 255, ${coreAlpha * 0.4})`);
          coreGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

          ctx.fillStyle = coreGrad;
          ctx.fillRect(px, coreTop, 1, coreH);
        }
      }
    }
  }, [lambda, L, a, d, N, dimmer, exposure, spanMm, laserRgb]);

  // Zoom lens canvas rendering (around hoverYMm, zoomFocusMm, or active marker)
  useEffect(() => {
    if (!isZoomActive) return;
    const zoomCanvas = zoomCanvasRef.current;
    if (!zoomCanvas) return;
    const ctx = zoomCanvas.getContext("2d");
    if (!ctx) return;

    const width = zoomCanvas.width;
    const height = zoomCanvas.height;
    ctx.clearRect(0, 0, width, height);

    // Center zoom window at hoverYMm, zoomFocusMm, or active marker
    const activeMarker = markers.find((m) => m.tn === activeMarkerTn);
    const centerFocusMm = hoverYMm !== null ? hoverYMm : zoomFocusMm !== 0 ? zoomFocusMm : activeMarker ? activeMarker.yMm : 0;

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
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 1.2;
      } else if (isHalfMm) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 0.8;
      } else {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
        ctx.lineWidth = 0.5;
      }
      ctx.stroke();

      // Coordinate labels at 0.5 mm or 1.0 mm
      if (isHalfMm || isOneMm) {
        ctx.fillStyle = isOneMm ? "#38bdf8" : "rgba(255, 255, 255, 0.45)";
        ctx.font = isOneMm ? "bold 10px monospace" : "9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(curMm.toFixed(1), x, height - 6);
      }
    }

    // Render zoomed Fraunhofer beam
    const beamTop = 6;
    const beamBottom = height - 16;
    const beamH = beamBottom - beamTop;
    const beamCenterY = (beamTop + beamBottom) / 2;

    for (let px = 0; px < width; px += 1) {
      const curMm = centerFocusMm + (px - originX) / pxPerMm;
      const yMeters = curMm * 1e-3;

      const physicalI = fraunhoferIntensity(yMeters, lambda, L, a, d, N);
      const gammaI = Math.pow(Math.max(0, physicalI), 0.55);
      const visibleI = Math.min(1.0, gammaI * dimmer * exposure);

      if (visibleI > 0.002) {
        const grad = ctx.createLinearGradient(px, beamTop, px, beamBottom);
        grad.addColorStop(0, `rgba(${laserRgb}, 0)`);
        grad.addColorStop(0.2, `rgba(${laserRgb}, ${visibleI * 0.3})`);
        grad.addColorStop(0.5, `rgba(${laserRgb}, ${visibleI * 0.95})`);
        grad.addColorStop(0.8, `rgba(${laserRgb}, ${visibleI * 0.3})`);
        grad.addColorStop(1, `rgba(${laserRgb}, 0)`);

        ctx.fillStyle = grad;
        ctx.fillRect(px, beamTop, 1, beamH);

        if (visibleI > 0.35) {
          const coreH = beamH * 0.65;
          const coreTop = beamCenterY - coreH / 2;
          const coreBottom = beamCenterY + coreH / 2;
          const coreAlpha = Math.pow((visibleI - 0.35) / 0.65, 1.2) * 0.85;

          const coreGrad = ctx.createLinearGradient(px, coreTop, px, coreBottom);
          coreGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
          coreGrad.addColorStop(0.25, `rgba(255, 255, 255, ${coreAlpha * 0.4})`);
          coreGrad.addColorStop(0.5, `rgba(255, 255, 255, ${coreAlpha})`);
          coreGrad.addColorStop(0.75, `rgba(255, 255, 255, ${coreAlpha * 0.4})`);
          coreGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

          ctx.fillStyle = coreGrad;
          ctx.fillRect(px, coreTop, 1, coreH);
        }
      }
    }

    // Center reticle
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Reticle Center Readout Tag
    ctx.fillStyle = "rgba(6, 182, 212, 0.9)";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`Target: ${centerFocusMm.toFixed(1)} mm`, originX, 12);
  }, [isZoomActive, hoverYMm, zoomFocusMm, activeMarkerTn, markers, lambda, L, a, d, N, dimmer, exposure, laserRgb]);

  // Updates marker position based on a clientX coordinate
  const updateMarkerFromClientX = useCallback(
    (clientX: number, targetTn: number) => {
      if (!screenRef.current || readOnly || onMarkerChange === undefined || targetTn === 0) return;
      const rect = screenRef.current.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const normalizedRatio = Math.max(0, Math.min(1, clickX / rect.width));
      const rawYMm = (normalizedRatio - 0.5) * (2 * spanMm);
      const quantizedMm = quantizeToResolution(Math.max(0, rawYMm), activeResolutionMm);
      onMarkerChange(targetTn, quantizedMm);
    },
    [readOnly, onMarkerChange, spanMm, activeResolutionMm]
  );

  // Global mousemove and mouseup listeners when dragging a marker pin (practicum mode)
  useEffect(() => {
    if (draggingTn === null) return;

    const handleGlobalMove = (e: MouseEvent) => {
      updateMarkerFromClientX(e.clientX, draggingTn);
    };

    const handleGlobalUp = () => {
      setDraggingTn(null);
    };

    window.addEventListener("mousemove", handleGlobalMove);
    window.addEventListener("mouseup", handleGlobalUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMove);
      window.removeEventListener("mouseup", handleGlobalUp);
    };
  }, [draggingTn, updateMarkerFromClientX]);

  // Handle clicking / dragging directly on the screen
  const handleScreenMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (mode === "explore" || readOnly || onMarkerChange === undefined) return;
      // If T0 is currently selected, switch to T1 so T0 isn't shifted
      const targetTn = activeMarkerTn === 0 ? 1 : activeMarkerTn;
      if (activeMarkerTn === 0) {
        onSelectMarker?.(1);
      }
      updateMarkerFromClientX(e.clientX, targetTn);
      setDraggingTn(targetTn);
    },
    [mode, readOnly, onMarkerChange, activeMarkerTn, onSelectMarker, updateMarkerFromClientX]
  );

  const handlePinMouseDown = (e: React.MouseEvent, tn: number) => {
    e.stopPropagation();
    if (readOnly || tn === 0) return;
    onSelectMarker?.(tn);
    setDraggingTn(tn);
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const moveX = e.clientX - rect.left;
      const normalizedRatio = Math.max(0, Math.min(1, moveX / rect.width));
      const rawYMm = (normalizedRatio - 0.5) * (2 * spanMm);
      const quantized =
        mode === "explore"
          ? Math.round(rawYMm * 100) / 100
          : quantizeToResolution(rawYMm, activeResolutionMm);
      setHoverYMm(quantized);
      if (isZoomActive) {
        setZoomFocusMm(quantized);
      }
    },
    [mode, spanMm, activeResolutionMm, isZoomActive]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverYMm(null);
  }, []);

  const handleTouch = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      const moveX = touch.clientX - rect.left;
      const normalizedRatio = Math.max(0, Math.min(1, moveX / rect.width));
      const rawYMm = (normalizedRatio - 0.5) * (2 * spanMm);
      const quantized =
        mode === "explore"
          ? Math.round(rawYMm * 100) / 100
          : quantizeToResolution(rawYMm, activeResolutionMm);
      setHoverYMm(quantized);
      if (isZoomActive) {
        setZoomFocusMm(quantized);
      }
    },
    [mode, spanMm, activeResolutionMm, isZoomActive]
  );

  // Compute hover physical intensity normalized to I0
  const hoverIntensity = useMemo(() => {
    if (hoverYMm === null) return 0;
    const physicalI = fraunhoferIntensity(hoverYMm * 1e-3, lambda, L, a, d, N);
    return Math.max(0, Math.min(1, physicalI));
  }, [hoverYMm, lambda, L, a, d, N]);

  return (
    <div className={`flex flex-col gap-3 glass-panel p-4 rounded-xl border border-slate-800 ${className}`}>
      {/* ─── Header & Toolbar ─── */}
      {mode === "explore" ? (
        // Explore Mode Single Clean Header
        <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-bold text-slate-100 text-sm tracking-wide">
              Layar Proyeksi
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              L = {L.toFixed(2).replace(".", ",")} m · rentang ±{spanMm.toFixed(0)} mm · 1 kotak = 1 mm
              {isZoomActive && (
                <span className="text-cyan-400"> · resolusi aktif: 0,1 mm</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Reset Zoom Button: Appears only when zoom is active */}
            {isZoomActive && (
              <button
                type="button"
                onClick={handleResetZoom}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                title="Reset fokus zoom ke posisi tengah (0 mm)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset zoom</span>
              </button>
            )}

            {/* Toggle Zoom Button */}
            <button
              type="button"
              onClick={handleToggleZoom}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isZoomActive
                  ? "bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-400 shadow-sm shadow-cyan-500/20"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
              }`}
              title="Aktifkan Kaca Pembesar Zoom (Resolusi 0,1 mm)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>{isZoomActive ? "Tutup zoom" : "Kaca pembesar"}</span>
            </button>
          </div>
        </div>
      ) : (
        // Practicum Mode Header (Preserved for Step 4)
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
                Pola interferensi-difraksi cahaya laser (λ = {(lambda * 1e9).toFixed(0)} nm). Klik atau seret jarum penanda langsung pada layar.
              </p>
            </div>
          </div>

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

            {onResetMarkers && (
              <button
                type="button"
                onClick={() => {
                  onResetMarkersRef.current?.();
                  onSelectMarkerRef.current?.(1);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                title="Reset seluruh posisi penanda ke 0 mm"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleZoom}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
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
      )}

      {/* Main Millimeter Block Projection Screen */}
      <div
        ref={screenRef}
        className="relative w-full h-44 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-inner cursor-crosshair group select-none"
        onMouseDown={handleScreenMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouch}
        onTouchMove={handleTouch}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={176}
          className="w-full h-full block"
        />

        {/* Laser Standby Overlay (when laser is turned off) */}
        {dimmer <= 0 && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 text-center p-4 z-40 select-none">
            <div className="p-2.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400">
              <Sun className="w-5 h-5 opacity-40" />
            </div>
            <div className="text-xs font-bold text-slate-200">
              Laser Nonaktif (Standby)
            </div>
            <p className="text-[11px] text-slate-400 max-w-sm">
              Nyalakan tombol laser pada Bangku Optik (Instrumen 1) untuk memproyeksikan pola interferensi-difraksi cahaya.
            </p>
          </div>
        )}

        {/* Practicum Mode: Render Draggable Marker Pins T0-T4 */}
        {mode === "practicum" &&
          markers.map((m) => {
            const pct = 50 + (m.yMm / (2 * spanMm)) * 100;
            if (pct < 0 || pct > 100) return null;
            const isSelected = m.tn === activeMarkerTn;
            const isT0 = m.tn === 0;
            const type = getPatternClassification(m.tn, N);
            const isSekunder = !isT0 && type === "sekunder";
            const typeLabel = isT0 ? "Pusat" : isSekunder ? "Sekunder" : "Primer";

            const isTopTier = m.tn % 2 === 0;
            const tierStyle: React.CSSProperties = isTopTier
              ? { top: m.tn === 0 ? 4 : m.tn === 2 ? 25 : 46 }
              : { bottom: m.tn === 1 ? 4 : 25 };

            const colorClasses = isT0
              ? {
                  badge: isSelected
                    ? "bg-emerald-500 text-black border-emerald-300 ring-2 ring-emerald-400/50 shadow-emerald-500/30"
                    : "bg-slate-950/95 text-emerald-300 border-emerald-500/60 hover:border-emerald-400",
                  line: isSelected ? "bg-emerald-400 shadow-[0_0_8px_#10b981]" : "bg-emerald-500/50",
                  diamond: isSelected
                    ? "bg-emerald-400 border-emerald-200 shadow-[0_0_10px_#10b981]"
                    : "bg-emerald-500/80 border-emerald-400/60",
                  typeTag: "bg-emerald-900/60 text-emerald-200 border-emerald-500/40",
                }
              : isSekunder
              ? {
                  badge: isSelected
                    ? "bg-purple-500 text-white border-purple-300 ring-2 ring-purple-400/50 shadow-purple-500/30 font-bold"
                    : "bg-slate-950/95 text-purple-300 border-purple-500/60 hover:border-purple-400",
                  line: isSelected ? "bg-purple-400 shadow-[0_0_8px_#c084fc]" : "bg-purple-500/50",
                  diamond: isSelected
                    ? "bg-purple-400 border-purple-200 shadow-[0_0_10px_#c084fc]"
                    : "bg-purple-500/80 border-purple-400/60",
                  typeTag: "bg-purple-900/60 text-purple-200 border-purple-500/40",
                }
              : {
                  badge: isSelected
                    ? "bg-amber-500 text-black border-amber-300 ring-2 ring-amber-400/50 shadow-amber-500/30 font-bold"
                    : "bg-slate-950/95 text-amber-300 border-amber-500/60 hover:border-amber-400",
                  line: isSelected ? "bg-amber-400 shadow-[0_0_8px_#f59e0b]" : "bg-amber-500/50",
                  diamond: isSelected
                    ? "bg-amber-400 border-amber-200 shadow-[0_0_10px_#f59e0b]"
                    : "bg-amber-500/80 border-amber-400/60",
                  typeTag: "bg-amber-900/60 text-amber-200 border-amber-500/40",
                };

            return (
              <div
                key={m.id || `marker-${m.tn}`}
                style={{ left: `${pct}%` }}
                onMouseDown={(e) => handlePinMouseDown(e, m.tn)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectMarker?.(m.tn);
                }}
                className={`absolute top-0 bottom-0 -translate-x-1/2 pointer-events-auto flex flex-col items-center group/marker ${
                  isSelected ? "z-30" : "z-20"
                } ${isT0 ? "cursor-default" : "cursor-ew-resize"}`}
                title={
                  isT0
                    ? "T0 (Terang Pusat): titik acuan 0.0 mm (terkunci)"
                    : `T${m.tn} (${typeLabel}): seret untuk mengubah posisi (saat ini ${m.yMm.toFixed(1)} mm)`
                }
              >
                <div
                  className={`absolute top-0 bottom-0 w-0.5 transition-colors ${colorClasses.line}`}
                />
                <div
                  className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 border transition-transform ${
                    colorClasses.diamond
                  } ${isSelected ? "scale-125 ring-2 ring-white/50" : "group-hover/marker:scale-110"}`}
                />
                <div
                  style={tierStyle}
                  className={`absolute px-2 py-0.5 rounded-md text-[10px] font-mono border shadow-lg transition-transform select-none flex items-center gap-1.5 whitespace-nowrap ${
                    colorClasses.badge
                  } ${isSelected ? "scale-105 z-30" : "group-hover/marker:scale-105"}`}
                >
                  <span className="font-bold">T{m.tn}</span>
                  <span className="text-[10px] opacity-90">{m.yMm.toFixed(1)} mm</span>
                  <span
                    className={`text-[8px] px-1 py-0.1 rounded font-sans uppercase font-bold border ${
                      isSelected ? "bg-black/30 text-white border-white/20" : colorClasses.typeTag
                    }`}
                  >
                    {typeLabel}
                  </span>
                </div>
              </div>
            );
          })}

        {/* Explore Mode: Single Hairline with Floating Readout following cursor */}
        {mode === "explore" && hoverYMm !== null && (
          <div
            style={{ left: `${Math.max(2, Math.min(98, 50 + (hoverYMm / (2 * spanMm)) * 100))}%` }}
            className="absolute top-0 bottom-0 -translate-x-1/2 pointer-events-none flex flex-col items-center z-30"
          >
            <div className="bg-slate-900/95 text-cyan-300 border border-cyan-400/50 text-[10px] font-mono px-2 py-0.5 rounded shadow-lg backdrop-blur-sm whitespace-nowrap mt-1.5 flex items-center gap-1.5">
              <span>y = {hoverYMm.toFixed(2).replace(".", ",")} mm</span>
              <span className="text-slate-500">·</span>
              <span>I/I0 = {hoverIntensity.toFixed(2).replace(".", ",")}</span>
            </div>
            <div className="w-px flex-1 border-r border-dashed border-cyan-400/70" />
          </div>
        )}

        {/* Practicum Mode: Hover Coordinate Crosshair Guideline */}
        {mode === "practicum" && hoverYMm !== null && (
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

        {/* Practicum Mode: Screen Millimeter Paper Grid Legend Badge */}
        {mode === "practicum" && (
          <div className="absolute top-2 left-2 pointer-events-none bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded text-[10px] font-mono text-slate-400">
            Kertas Milimeter Blok (Skala Utama: 1 mm | Mayor: 5 mm)
          </div>
        )}
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

      {/* Bottom Controls: Exposure / Contrast Slider */}
      {mode === "explore" ? (
        // Explore Mode Minimal Contrast Bar: single row, slider + value
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/40 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-medium text-slate-300">Kontras Layar:</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={4.5}
              step={0.1}
              value={exposure}
              onChange={(e) => onExposureChange?.(parseFloat(e.target.value))}
              className="w-32 sm:w-44 accent-amber-500 cursor-pointer"
              title="Atur kontras kamera untuk memperjelas terang sekunder celah majemuk"
            />
            <span className="font-mono text-slate-400 text-xs w-10">
              {exposure.toFixed(1)}×
            </span>
          </div>
        </div>
      ) : (
        // Practicum Mode Bottom Bar (Presets & Guidance)
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-slate-800/60 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-medium">Kontras Layar:</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={4.5}
              step={0.1}
              value={exposure}
              onChange={(e) => onExposureChange?.(parseFloat(e.target.value))}
              className="w-28 accent-amber-500 cursor-pointer"
              title="Atur kontras kamera untuk memperjelas terang sekunder celah majemuk"
            />
            <span className="font-mono text-slate-400 text-[11px] w-8">
              {exposure.toFixed(1)}×
            </span>

            <div className="flex items-center gap-1">
              {[
                { label: "1.0× Normal", val: 1.0 },
                { label: "1.8× Praktikum", val: 1.8 },
                { label: "3.0× Terang N=5", val: 3.0 },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => onExposureChange?.(p.val)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                    Math.abs(exposure - p.val) < 0.05
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="text-amber-400">💡</span>
            <span>
              Klik pada layar atau seret pin untuk memposisikan penanda{" "}
              <strong className="text-amber-300 font-bold">
                T{activeMarkerTn} ({activeMarkerTn === 0 ? "Pusat" : getPatternClassification(activeMarkerTn, N)})
              </strong>.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
