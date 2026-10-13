"use client";

import React from "react";
import { Sliders, Lock, Check } from "lucide-react";
import { SCIENTIFIC_THEME } from "./tokens";

export interface VectorControlsState {
  showVelocity: boolean;
  showMomentum: boolean;
  showTotalMomentum: boolean;
  arrowScale: number; // 0.5 to 2.0
  showValues: boolean;
}

export interface VectorCategoryConfig {
  id: string;
  label: string;
  color: string;
  checked: boolean;
  title?: string;
}

export interface ExtraToggleConfig {
  id: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
  title?: string;
}

export interface VectorControlsProps {
  /** Classic HKM state (optional if using categories) */
  state?: VectorControlsState;
  onChange?: (newState: VectorControlsState) => void;
  /** Custom categories for other modules (Atwood, Menggelinding, etc.) */
  categories?: VectorCategoryConfig[];
  onToggleCategory?: (id: string) => void;
  /** Slider scale multiplier (default 1.0) */
  arrowScale?: number;
  onScaleChange?: (scale: number) => void;
  /** Toggle numeric display */
  showValues?: boolean;
  onToggleShowValues?: () => void;
  /** Additional toggles like 'Uraikan berat' */
  extraToggles?: ExtraToggleConfig[];
  /** If true, numeric values are suppressed (Practicum mode) */
  isQualitative?: boolean;
  /** If true, the entire overlay is locked */
  isLocked?: boolean;
  /** Lock explanation message displayed to students */
  lockMessage?: string;
  className?: string;
}

export function VectorControls({
  state,
  onChange,
  categories,
  onToggleCategory,
  arrowScale,
  onScaleChange,
  showValues,
  onToggleShowValues,
  extraToggles,
  isQualitative = false,
  isLocked = false,
  lockMessage,
  className = "",
}: VectorControlsProps) {
  const currentScale = arrowScale ?? state?.arrowScale ?? 1.0;
  const currentShowValues = showValues ?? state?.showValues ?? true;

  const handleToggle = (key: keyof Omit<VectorControlsState, "arrowScale">) => {
    if (isLocked) return;
    if (state && onChange) {
      onChange({
        ...state,
        [key]: !state[key],
      });
    }
  };

  const handleScaleChange = (scale: number) => {
    if (isLocked) return;
    if (onScaleChange) {
      onScaleChange(scale);
    } else if (state && onChange) {
      onChange({
        ...state,
        arrowScale: scale,
      });
    }
  };

  const handleShowValuesChange = () => {
    if (isLocked) return;
    if (onToggleShowValues) {
      onToggleShowValues();
    } else if (state && onChange) {
      onChange({
        ...state,
        showValues: !state.showValues,
      });
    }
  };

  return (
    <div
      className={`rounded-xl border transition-all ${
        isLocked
          ? "bg-slate-950/60 border-slate-800/80 text-slate-500"
          : "bg-slate-900/90 border-slate-800 shadow-xl text-slate-200"
      } p-3.5 flex flex-col gap-3 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-cyan-400">
          <Sliders className="w-3.5 h-3.5" />
          <span>Vektor Fisika (Overlay)</span>
        </div>
        {isLocked ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/60 text-amber-400 border border-amber-600/30">
            <Lock className="w-3 h-3" />
            Terkunci
          </div>
        ) : isQualitative ? (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/30">
            Mode Kualitatif
          </span>
        ) : null}
      </div>

      {/* Lock banner if locked */}
      {isLocked && lockMessage && (
        <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-[11px] font-mono text-amber-300 flex items-start gap-2 leading-relaxed">
          <Lock className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div>{lockMessage}</div>
        </div>
      )}

      {/* Category Checkboxes */}
      <div
        className={`grid grid-cols-1 ${
          categories && categories.length > 3 ? "sm:grid-cols-4" : "sm:grid-cols-3"
        } gap-2 text-xs font-mono ${
          isLocked ? "opacity-40 pointer-events-none" : ""
        }`}
      >
        {categories ? (
          categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                if (isLocked) return;
                onToggleCategory?.(cat.id);
              }}
              className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                cat.checked
                  ? "bg-slate-900 border-cyan-500/80 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
              title={cat.title ?? cat.label}
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="truncate">{cat.label}</span>
              </div>
              <div
                className={`w-4 h-4 rounded shrink-0 flex items-center justify-center border ${
                  cat.checked
                    ? "bg-cyan-600 border-cyan-400 text-white"
                    : "border-slate-700 bg-slate-900"
                }`}
              >
                {cat.checked && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>
          ))
        ) : state ? (
          <>
            {/* Kecepatan */}
            <button
              type="button"
              onClick={() => handleToggle("showVelocity")}
              className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                state.showVelocity
                  ? "bg-emerald-950/70 border-emerald-500 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
              title="Tampilkan vektor kecepatan (vA, vB)"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: SCIENTIFIC_THEME.vectors.velocity }}
                />
                <span>Kecepatan</span>
              </div>
              <div
                className={`w-4 h-4 rounded flex items-center justify-center border ${
                  state.showVelocity
                    ? "bg-emerald-600 border-emerald-400 text-white"
                    : "border-slate-700 bg-slate-900"
                }`}
              >
                {state.showVelocity && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>

            {/* Momentum */}
            <button
              type="button"
              onClick={() => handleToggle("showMomentum")}
              className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                state.showMomentum
                  ? "bg-blue-950/70 border-blue-500 text-blue-200 shadow-[0_0_10px_rgba(37,99,235,0.2)]"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
              title="Tampilkan vektor momentum kereta (pA, pB)"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: SCIENTIFIC_THEME.vectors.momentum }}
                />
                <span>Momentum</span>
              </div>
              <div
                className={`w-4 h-4 rounded flex items-center justify-center border ${
                  state.showMomentum
                    ? "bg-blue-600 border-blue-400 text-white"
                    : "border-slate-700 bg-slate-900"
                }`}
              >
                {state.showMomentum && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>

            {/* Momentum Total */}
            <button
              type="button"
              onClick={() => handleToggle("showTotalMomentum")}
              className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                state.showTotalMomentum
                  ? "bg-pink-950/70 border-pink-500 text-pink-200 shadow-[0_0_10px_rgba(236,72,153,0.2)]"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
              title="Tampilkan vektor momentum total sistem (p_total)"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: SCIENTIFIC_THEME.vectors.momentumTotal }}
                />
                <span>Momentum total</span>
              </div>
              <div
                className={`w-4 h-4 rounded flex items-center justify-center border ${
                  state.showTotalMomentum
                    ? "bg-pink-600 border-pink-400 text-white"
                    : "border-slate-700 bg-slate-900"
                }`}
              >
                {state.showTotalMomentum && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>
          </>
        ) : null}
      </div>

      {/* Sliders and Toggles Row */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 pt-1 ${
          isLocked ? "opacity-40 pointer-events-none" : ""
        }`}
      >
        {/* Skala Panah */}
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <span className="text-xs font-mono text-slate-400 whitespace-nowrap">
            Skala panah:
          </span>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={currentScale}
            onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            aria-label="Skala panah"
          />
          <span className="text-xs font-mono font-bold text-cyan-300 w-10 text-right">
            {currentScale.toFixed(1)}×
          </span>
        </div>

        {/* Extra Toggles (e.g. Uraikan berat) */}
        {extraToggles && extraToggles.length > 0 && (
          <div className="flex items-center gap-3">
            {extraToggles.map((tog) => (
              <label
                key={tog.id}
                className="flex items-center gap-2 cursor-pointer select-none"
                title={tog.title}
              >
                <input
                  type="checkbox"
                  checked={tog.checked}
                  onChange={tog.onToggle}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-600 relative"></div>
                <span className="text-xs font-mono text-slate-300">
                  {tog.label}
                </span>
              </label>
            ))}
          </div>
        )}

        {/* Tampilkan Nilai Toggle (Only shown / enabled in Explore mode) */}
        {!isQualitative ? (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={currentShowValues}
              onChange={handleShowValuesChange}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600 relative"></div>
            <span className="text-xs font-mono text-slate-300">
              Tampilkan nilai
            </span>
          </label>
        ) : (
          <div className="text-[11px] font-mono text-slate-400 italic">
            * Kualitatif (arah &amp; panjang relatif, tanpa membocorkan angka)
          </div>
        )}
      </div>
    </div>
  );
}
