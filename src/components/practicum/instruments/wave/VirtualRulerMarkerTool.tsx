"use client";

import React, { useMemo, useRef, useEffect } from "react";
import {
  MarkerPoint,
} from "./ScreenPatternView";
import {
  READING_RESOLUTION_MM,
  ZOOM_READING_RESOLUTION_MM,
  findFraunhoferPeakNumerical,
  getPatternClassification,
  quantizeToResolution,
} from "@/physics/waveOptics";
import {
  MapPin,
  Sparkles,
  RotateCcw,
  Plus,
  Minus,
  CheckCircle2,
  Table as TableIcon,
  Lock,
  Info,
  SlidersHorizontal,
  ArrowRight,
} from "lucide-react";

export interface VirtualRulerMarkerToolProps {
  N: number;
  lambda?: number;
  L?: number;
  a?: number;
  d?: number;
  markers: MarkerPoint[];
  activeTn: number;
  onSelectTn: (tn: number) => void;
  onUpdateMarker: (tn: number, yMm: number, isAssisted?: boolean) => void;
  onResetMarkers: () => void;
  onAutoAssistAll?: () => void;
  onApplyToTable?: (measurements: Record<number, number>) => void;
  isZoomActive?: boolean;
  className?: string;
}

/**
 * Interactive virtual ruler and marking tool for recording fringe positions y (mm)
 * from the central bright maximum (y0 = 0).
 *
 * Features:
 * - Clear step-by-step guidance banner for student usability.
 * - Interactive horizontal position slider (0 to 12 mm) with fine-tuning steppers (+/-).
 * - Fixed reference lock for central maximum (T0 = 0.0 mm).
 * - Instant single-peak (Bantu Cari Tn) and all-peaks (Bantu Semua Puncak) Fraunhofer assistance.
 * - Enforces discrete digital ruler reading resolution (0.5 mm standard, 0.1 mm zoom).
 */
export function VirtualRulerMarkerTool({
  N,
  lambda,
  L,
  a,
  d,
  markers,
  activeTn,
  onSelectTn,
  onUpdateMarker,
  onResetMarkers,
  onAutoAssistAll,
  onApplyToTable,
  isZoomActive = false,
  className = "",
}: VirtualRulerMarkerToolProps) {
  const activeResolution = isZoomActive
    ? ZOOM_READING_RESOLUTION_MM
    : READING_RESOLUTION_MM;

  // Permanent rule: callback props stored in useRef
  const onResetMarkersRef = useRef(onResetMarkers);
  onResetMarkersRef.current = onResetMarkers;
  const onSelectTnRef = useRef(onSelectTn);
  onSelectTnRef.current = onSelectTn;

  // Auto-reset when N changes
  const prevNRef = useRef(N);
  useEffect(() => {
    if (prevNRef.current !== N) {
      prevNRef.current = N;
      onResetMarkersRef.current?.();
      onSelectTnRef.current?.(1);
    }
  }, [N]);

  const activeMarker = useMemo(
    () =>
      markers.find((m) => m.tn === activeTn) || {
        id: `marker-${activeTn}`,
        tn: activeTn,
        label: `T${activeTn}`,
        yMm: 0,
        isAssisted: false,
      },
    [markers, activeTn]
  );

  const activeClassification = useMemo(
    () => getPatternClassification(activeTn, N),
    [activeTn, N]
  );

  // Manual step adjustment (+/- active resolution)
  const handleStep = (delta: number) => {
    if (activeTn === 0) return;
    const newY = Math.max(0, Math.min(12.0, activeMarker.yMm + delta));
    const quantized = quantizeToResolution(newY, activeResolution);
    onUpdateMarker(activeTn, quantized, false);
  };

  // Slider change handler
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeTn === 0) return;
    const rawVal = parseFloat(e.target.value);
    const quantized = quantizeToResolution(rawVal, activeResolution);
    onUpdateMarker(activeTn, quantized, false);
  };

  // Assist single active peak
  const handleAssistCurrent = () => {
    if (activeTn === 0) {
      onUpdateMarker(0, 0, true);
      return;
    }
    const assistedValMm = findFraunhoferPeakNumerical(
      activeTn,
      N,
      lambda,
      L,
      a,
      d,
      activeResolution
    );
    onUpdateMarker(activeTn, assistedValMm, true);
  };

  // Assist all peaks (fallback if parent doesn't provide onAutoAssistAll)
  const handleAssistAll = () => {
    if (onAutoAssistAll) {
      onAutoAssistAll();
      return;
    }
    // Set T0 = 0
    onUpdateMarker(0, 0, true);
    // Find peaks for T1 to T4
    for (let tn = 1; tn <= 4; tn++) {
      const peakMm = findFraunhoferPeakNumerical(
        tn,
        N,
        lambda,
        L,
        a,
        d,
        activeResolution
      );
      onUpdateMarker(tn, peakMm, true);
    }
  };

  // Check how many markers are set
  const markedCount = markers.filter((m) => m.yMm > 0 || m.tn === 0).length;

  return (
    <div className={`p-4 rounded-xl glass-panel border border-slate-800 flex flex-col gap-4 text-xs ${className}`}>
      {/* ── Header & Active Resolution Chip ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-400 shadow-sm shadow-amber-500/10">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-100 text-sm tracking-tight">
              Alat Ukur Penanda Titik Terang (Virtual Ruler)
            </h4>
            <p className="text-[11px] text-slate-400">
              Ukur jarak puncak terang (y) dari terang pusat (T₀ = 0 mm)
            </p>
          </div>
        </div>

        {/* Active Resolution & Quick Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-[11px]">
            <span className="text-slate-400">Resolusi:</span>
            <strong className="font-mono text-cyan-300 font-bold">
              {activeResolution.toFixed(1)} mm
            </strong>
          </div>

          <button
            type="button"
            onClick={handleAssistAll}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-200 border border-cyan-500/40 text-xs font-medium shadow-sm transition-colors active:scale-95"
            title="Deteksi otomatis seluruh puncak terang T0 sampai T4"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>Bantu Semua Puncak</span>
          </button>

          <button
            type="button"
            onClick={onResetMarkers}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
            title="Reset seluruh posisi penanda ke 0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Friendly Step-by-Step Guide Banner ── */}
      <div className="p-3 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-slate-900/60 rounded-xl border border-blue-500/20 flex items-start gap-3 text-[11px] text-slate-300">
        <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="font-bold text-slate-100 flex items-center gap-2">
            <span>Petunjuk Penggunaan:</span>
            <span className="font-normal text-slate-400 text-[10px]">
              (3 langkah mudah untuk mengisi tabel)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-slate-300">
            <div className="flex items-start gap-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800">
              <span className="w-4 h-4 rounded-full bg-blue-500/30 text-blue-300 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
              <span>Pilih tab terang yang ingin diukur (<strong>T₁</strong> sampai <strong>T₄</strong>).</span>
            </div>
            <div className="flex items-start gap-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800">
              <span className="w-4 h-4 rounded-full bg-blue-500/30 text-blue-300 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
              <span>Geser <strong>slider posisi</strong>, seret pin di layar, atau klik <strong>"Bantu Cari"</strong>.</span>
            </div>
            <div className="flex items-start gap-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800">
              <span className="w-4 h-4 rounded-full bg-blue-500/30 text-blue-300 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
              <span>Jarak <em>y</em> (mm) otomatis tersimpan dan siap disalin ke tabel.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Marker Selection Tabs (T0 to T4) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[0, 1, 2, 3, 4].map((tn) => {
          const m = markers.find((item) => item.tn === tn);
          const isSelected = tn === activeTn;
          const isT0 = tn === 0;
          const isMarked = m !== undefined && (m.yMm > 0 || isT0);
          const type = getPatternClassification(tn, N);

          return (
            <button
              key={tn}
              type="button"
              onClick={() => onSelectTn(tn)}
              className={`flex-1 min-w-[85px] py-2.5 px-3 rounded-xl border font-mono flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                isSelected
                  ? "bg-amber-500/20 border-amber-400 text-amber-200 shadow-md shadow-amber-500/15 ring-2 ring-amber-400/30 scale-[1.02]"
                  : isMarked
                  ? "bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500"
                  : "bg-slate-950/60 border-slate-800/80 text-slate-500 hover:text-slate-300 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                {isT0 && <Lock className="w-3 h-3 text-emerald-400" />}
                <span>T{tn}</span>
                {isMarked && !isT0 && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
              </div>
              <span className="text-[11px] font-bold text-slate-200">
                {m ? `${m.yMm.toFixed(1)} mm` : "-- mm"}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-sans uppercase font-semibold ${
                  isT0
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : type === "primer"
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                    : "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                }`}
              >
                {isT0 ? "Pusat" : type}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Active Marker Control Panel ── */}
      {activeTn === 0 ? (
        /* Case A: T0 is selected (Central Maximum - Locked Reference) */
        <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-emerald-200 text-sm flex items-center gap-2">
                <span>Terang Pusat (T₀) = 0.0 mm</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-500/40 font-mono font-normal">
                  Pusat Acuan Nol
                </span>
              </div>
              <p className="text-[11px] text-emerald-300/80 mt-0.5">
                Terang pusat adalah posisi sumbu simetri (y₀ = 0 mm). Tidak perlu digeser.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectTn(1)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <span>Mulai Ukur Terang T₁</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Case B: Tn > 0 (T1, T2, T3, T4 - Interactive Slider & Assist) */
        <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col gap-3 shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">Sedang Mengatur:</span>
              <span className="font-bold text-white text-sm flex items-center gap-1.5 font-mono">
                T{activeTn} ({activeClassification})
                {activeMarker.isAssisted && (
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded font-sans font-medium">
                    bantuan otomatis
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAssistCurrent}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-900/50 hover:bg-purple-900/80 text-purple-200 border border-purple-500/40 text-xs font-medium shadow-sm transition-all active:scale-95"
                title={`Deteksi puncak fisik Fraunhofer untuk T${activeTn}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                <span>Bantu Cari T{activeTn}</span>
              </button>
            </div>
          </div>

          {/* Interactive Horizontal Range Slider with Fine-Tuning Steppers */}
          <div className="flex items-center gap-3 pt-1">
            {/* Minus Button */}
            <button
              type="button"
              onClick={() => handleStep(-activeResolution)}
              disabled={activeMarker.yMm <= 0}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 border border-slate-700 active:scale-95 transition-all"
              title={`Kurangi ${activeResolution} mm`}
            >
              <Minus className="w-4 h-4" />
            </button>

            {/* Range Slider */}
            <div className="flex-1 flex flex-col gap-1">
              <input
                type="range"
                min={0}
                max={12}
                step={activeResolution}
                value={activeMarker.yMm}
                onChange={handleSliderChange}
                className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                title={`Geser posisi T${activeTn} (0 sampai 12 mm)`}
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono px-0.5">
                <span>0 mm</span>
                <span>2 mm</span>
                <span>4 mm</span>
                <span>6 mm</span>
                <span>8 mm</span>
                <span>10 mm</span>
                <span>12 mm</span>
              </div>
            </div>

            {/* Plus Button */}
            <button
              type="button"
              onClick={() => handleStep(+activeResolution)}
              disabled={activeMarker.yMm >= 12}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 border border-slate-700 active:scale-95 transition-all"
              title={`Tambah ${activeResolution} mm`}
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Big Digital Readout */}
            <div className="flex flex-col items-end pl-2">
              <span className="text-[10px] text-slate-400">Jarak (y):</span>
              <div className="px-3.5 py-1.5 bg-slate-950 border border-amber-500/40 rounded-lg font-mono text-base font-bold text-amber-300 min-w-[85px] text-center shadow-inner">
                {activeMarker.yMm.toFixed(1)} mm
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Copy / Apply to Practicum Table Button ── */}
      {onApplyToTable && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-400">
            Terisi <strong>{markedCount}</strong> dari 5 penanda terang (T₀ - T₄)
          </span>

          <button
            type="button"
            onClick={() => {
              const result: Record<number, number> = {};
              markers.forEach((m) => {
                result[m.tn] = m.yMm;
              });
              onApplyToTable(result);
            }}
            disabled={markedCount < 5}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium text-xs shadow-md transition-all active:scale-95"
          >
            <TableIcon className="w-4 h-4" />
            <span>Salin Pengukuran ke Kolom y_praktikum</span>
          </button>
        </div>
      )}
    </div>
  );
}
