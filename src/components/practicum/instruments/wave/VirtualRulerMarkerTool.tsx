"use client";

import React, { useMemo } from "react";
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
 * Enforces discrete digital ruler reading resolution (0.5 mm in standard view, 0.1 mm in zoom view)
 * with zero hidden random noise.
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
    const newY = Math.max(0, activeMarker.yMm + delta);
    const quantized = quantizeToResolution(newY, activeResolution);
    onUpdateMarker(activeTn, quantized, false);
  };

  // Assist single active peak
  const handleAssistCurrent = () => {
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

  // Check how many markers are set
  const markedCount = markers.filter((m) => m.yMm > 0 || m.tn === 0).length;

  return (
    <div className={`p-4 rounded-xl glass-panel border border-slate-800 flex flex-col gap-4 text-xs ${className}`}>
      {/* Header & Quick Summary */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-100">Alat Ukur Penanda Titik Terang</h4>
            <p className="text-[11px] text-slate-400">
              Ukur jarak titik terang dari terang pusat (y₀ = 0 mm)
            </p>
          </div>
        </div>

        {/* Active Resolution Chip */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Resolusi Penggaris:</span>
          <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300">
            {activeResolution.toFixed(1)} mm
          </span>
        </div>
      </div>

      {/* Marker Selection Tabs (T0 to T4) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[0, 1, 2, 3, 4].map((tn) => {
          const m = markers.find((item) => item.tn === tn);
          const isSelected = tn === activeTn;
          const isMarked = m !== undefined && (m.yMm > 0 || tn === 0);
          const type = getPatternClassification(tn, N);

          return (
            <button
              key={tn}
              type="button"
              onClick={() => onSelectTn(tn)}
              className={`flex-1 min-w-[70px] py-2 px-2.5 rounded-lg border font-mono flex flex-col items-center gap-1 transition-all ${
                isSelected
                  ? "bg-amber-500/20 border-amber-400 text-amber-200 shadow-md shadow-amber-500/10 scale-105"
                  : isMarked
                  ? "bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-600"
                  : "bg-slate-950/60 border-slate-800/80 text-slate-500 hover:text-slate-300"
              }`}
            >
              <div className="flex items-center gap-1 font-bold">
                <span>T{tn}</span>
                {isMarked && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
              </div>
              <span className="text-[10px] text-slate-400">
                {m ? `${m.yMm.toFixed(1)} mm` : "-- mm"}
              </span>
              <span
                className={`text-[9px] px-1 py-0.2 rounded font-sans uppercase font-medium ${
                  type === "primer"
                    ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                    : "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                }`}
              >
                {type}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Marker Precision Adjustment Panel */}
      <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-slate-400 text-[11px]">Penanda Terpilih:</span>
            <span className="font-bold text-white text-sm flex items-center gap-1.5">
              T{activeTn} ({activeClassification})
              {activeMarker.isAssisted && (
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded font-mono font-normal">
                  bantuan
                </span>
              )}
            </span>
          </div>

          {/* Stepper Buttons for Fine Adjustment */}
          <div className="flex items-center gap-1 ml-2">
            <button
              type="button"
              onClick={() => handleStep(-activeResolution)}
              disabled={activeMarker.yMm <= 0 || activeTn === 0}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700"
              title={`Kurangi ${activeResolution} mm`}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <div className="px-3 py-1 bg-slate-950 border border-slate-700 rounded font-mono text-sm font-bold text-cyan-300 min-w-[75px] text-center">
              {activeMarker.yMm.toFixed(isZoomActive ? 1 : 1)} mm
            </div>

            <button
              type="button"
              onClick={() => handleStep(+activeResolution)}
              disabled={activeTn === 0}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700"
              title={`Tambah ${activeResolution} mm`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Action Buttons: Assist Current & Reset */}
        <div className="flex items-center gap-2">
          {activeTn > 0 && (
            <button
              type="button"
              onClick={handleAssistCurrent}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-900/40 hover:bg-purple-900/60 text-purple-200 border border-purple-500/30 text-xs transition-colors"
              title="Bantu cari puncak fisik Fraunhofer (dikuantisasi ke resolusi aktif)"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>Bantu Cari T{activeTn}</span>
            </button>
          )}

          {onAutoAssistAll && (
            <button
              type="button"
              onClick={onAutoAssistAll}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-200 border border-cyan-500/30 text-xs transition-colors"
              title="Bantu cari semua posisi puncak T0 - T4"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>Bantu Semua Puncak</span>
            </button>
          )}

          <button
            type="button"
            onClick={onResetMarkers}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700"
            title="Reset semua posisi penanda"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Copy / Apply to Practicum Table Button */}
      {onApplyToTable && (
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-400">
            Terisi {markedCount} dari 5 penanda terang (T₀ - T₄)
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
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium text-xs shadow-sm transition-colors"
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Salin Pengukuran ke Kolom y_praktikum</span>
          </button>
        </div>
      )}
    </div>
  );
}
