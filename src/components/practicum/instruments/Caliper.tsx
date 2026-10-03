"use client";

import React, { useState, useRef, useCallback } from "react";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { readVernierCaliper } from "@/physics/measurement";

interface CaliperProps {
  objectWidthMm?: number;
  objectName?: string;
  nstMm?: number;
  measurementMode?: "outer" | "inner" | "depth";
  className?: string;
  vertical?: boolean;
}

// ── Configuration ─────────────────────────────────────────────────────────────
const PPM = 8;               // increased pixels per mm for better detail
const MAX_MM = 150;          // max opening of the caliper (in mm)
const BEAM_Y = 180;          // y-coordinate of the scale baseline
const BEAM_X0 = 100;         // x where mm=0 sits (left of fixed jaw tip)
const CANVAS_H = 480;        // total SVG canvas height
const N_DIV = 20;            // vernier divisions
const VERNIER_SPACING = 1.95;// mm per vernier division

// ── Component ─────────────────────────────────────────────────────────────────
export function Caliper({
  objectWidthMm = 0,
  objectName = "",
  nstMm = 0.05,
  measurementMode = "outer",
  className = "",
  vertical = false,
}: CaliperProps) {
  const maxMm = MAX_MM;
  const initialOpenMm = measurementMode === "outer" ? maxMm : 0;
  const [openMm, setOpenMm] = useState(initialOpenMm);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync openMm when object or mode changes
  React.useEffect(() => {
    setOpenMm(measurementMode === "outer" ? MAX_MM : 0);
    setZoom(1);
  }, [measurementMode, objectWidthMm]);

  const totalCanvasW = BEAM_X0 + maxMm * PPM + N_DIV * VERNIER_SPACING * PPM + 40;
  // Dynamic viewbox: only expand when in depth mode. 
  // We prevent the "jump cut" scale issue by locking the SVG's physical height rather than its width.
  const viewboxW = measurementMode === "depth" ? totalCanvasW + maxMm * PPM + 60 : totalCanvasW;

  let minOpen = 0;
  let maxOpen = MAX_MM;

  if (objectWidthMm > 0) {
    if (measurementMode === "outer") {
      minOpen = objectWidthMm;
    } else {
      maxOpen = objectWidthMm;
    }
  }

  const clampedOpen = Math.min(Math.max(openMm, minOpen), maxOpen);

  const { mainScaleReading, vernierReading, totalReading } = readVernierCaliper(clampedOpen, nstMm);

  const sliderX = BEAM_X0 + clampedOpen * PPM;

  const isClamped = objectWidthMm > 0 && 
    (measurementMode === "outer" ? clampedOpen <= minOpen + 0.01 : clampedOpen >= maxOpen - 0.01);

  return (
    <div className={`flex flex-col gap-4 w-full ${className}`}>

      {/* ── HEADER ROW ─── */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold text-white/40 tracking-[0.16em] uppercase">
          Jangka Sorong · NST {nstMm} mm
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(z => Math.min(3, parseFloat((z + 0.5).toFixed(1))))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-500/25 transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" /> ZOOM IN
          </button>
          <button
            onClick={() => setZoom(1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-400 text-xs font-bold hover:bg-teal-500/25 transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" /> RESET ZOOM
          </button>
          <button
            onClick={() => { setOpenMm(measurementMode === "outer" ? MAX_MM : 0); setZoom(1); }}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white/80 transition-colors"
            title="Reset posisi"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── SVG CANVAS ─── */}
      <div
        ref={containerRef}
        className="w-full rounded-xl border border-white/10 bg-[#f5f7fa] overflow-hidden shadow-2xl relative"
        style={{ cursor: "default" }}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: zoom > 1 ? "30% 40%" : "50% 50%",
            transition: "transform 0.3s ease",
            overflow: "hidden",
          }}
        >
          <svg
            viewBox={vertical ? `0 0 ${CANVAS_H} ${viewboxW}` : `0 0 ${viewboxW} ${CANVAS_H}`}
            className={`transition-all duration-300 ease-in-out ${vertical ? "h-[550px] w-auto mx-auto" : "w-full h-auto"}`}
            style={{ display: "block" }}
          >
            <defs>
              {/* Body gradients — flat industrial grey */}
              <linearGradient id="g-body" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="#b0b5be" />
                <stop offset="40%" stopColor="#d0d5de" />
                <stop offset="100%" stopColor="#989eaa" />
              </linearGradient>
              <linearGradient id="g-jaw" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="#8a9099" />
                <stop offset="50%" stopColor="#b0b8c6" />
                <stop offset="100%" stopColor="#787f8a" />
              </linearGradient>
              <linearGradient id="g-slide" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="#9098a6" />
                <stop offset="40%" stopColor="#c0c8d8" />
                <stop offset="100%" stopColor="#808898" />
              </linearGradient>
              <linearGradient id="g-scale" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="#e8eaf0" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>
              <filter id="f-drop">
                <feDropShadow dx="2" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.3" />
              </filter>
              <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#fff" />
              </marker>
              <marker id="arrow-dark" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#000" />
              </marker>
            </defs>

            <g transform={vertical ? `translate(${CANVAS_H}, 0) rotate(90)` : undefined}>
            {/* ══════════════════════════════════════════ */}
            {/* FIXED BODY + JAW                           */}
            {/* ══════════════════════════════════════════ */}

            {/* Main beam (fixed) */}
            <g filter="url(#f-drop)">
              <rect
                x={0} y={BEAM_Y - 50}
                width={totalCanvasW} height={60}
                fill="url(#g-body)" stroke="#606878" strokeWidth={0.5}
              />
              {/* top edge highlight */}
              <rect x={0} y={BEAM_Y - 50} width={totalCanvasW} height={2} fill="rgba(255,255,255,0.5)" />

              {/* Fixed left jaw — upper (for inner measurement) */}
              <path
                opacity={measurementMode === "inner" ? 1 : 0.3}
                d={`M ${BEAM_X0 - 50} ${BEAM_Y - 50}
                    L ${BEAM_X0 - 50} ${BEAM_Y - 120}
                    L ${BEAM_X0} ${BEAM_Y - 100}
                    L ${BEAM_X0} ${BEAM_Y - 50}
                    Z`}
                fill="url(#g-jaw)" stroke="#606878" strokeWidth={0.5}
              />

              {/* White scale area (where ticks are drawn) */}
              <rect
                x={BEAM_X0 - 15} y={BEAM_Y - 50}
                width={maxMm * PPM + 30} height={48}
                fill="url(#g-scale)"
              />

              {/* Fixed left jaw — lower (for outer measurement) */}
              <g opacity={measurementMode === "outer" ? 1 : 0.3}>
                <path
                  d={`M ${BEAM_X0 - 50} ${BEAM_Y}
                      L ${BEAM_X0 - 50} ${BEAM_Y + 180}
                      Q ${BEAM_X0 - 50} ${BEAM_Y + 220} ${BEAM_X0} ${BEAM_Y + 220}
                      L ${BEAM_X0} ${BEAM_Y}
                      Z`}
                  fill="url(#g-jaw)" stroke="#606878" strokeWidth={0.5}
                />
                {/* Inner chamfer */}
                <line
                  x1={BEAM_X0} y1={BEAM_Y}
                  x2={BEAM_X0} y2={BEAM_Y + 220}
                  stroke="rgba(255,255,255,0.4)" strokeWidth={2}
                />
              </g>
            </g>

            {/* ══════════════════════════════════════════ */}
            {/* MAIN SCALE TICKS (on the fixed beam)       */}
            {/* ══════════════════════════════════════════ */}
            {Array.from({ length: maxMm + 1 }).map((_, i) => {
              const x = BEAM_X0 + i * PPM;
              const isCm = i % 10 === 0;
              const isHalf = i % 5 === 0 && !isCm;
              const tickH = isCm ? 28 : isHalf ? 20 : 12;

              return (
                <g key={i}>
                  <line
                    x1={x} y1={BEAM_Y - 2}
                    x2={x} y2={BEAM_Y - 2 - tickH}
                    stroke="#1e293b"
                    strokeWidth={isCm ? 1.8 : 1.2}
                  />
                  {isCm && (
                    <text
                      x={x} y={BEAM_Y - 35}
                      fontSize={14}
                      fill="#1e293b"
                      textAnchor="middle"
                      fontWeight="bold"
                      fontFamily="'JetBrains Mono', monospace"
                    >
                      {`${i / 10}`}
                    </text>
                  )}
                </g>
              );
            })}

            {/* ══════════════════════════════════════════ */}
            {/* OBJECT (benda ukur)                        */}
            {/* ══════════════════════════════════════════ */}
            {objectWidthMm > 0 && measurementMode === "outer" && (
              <g>
                <rect
                  x={BEAM_X0}
                  y={BEAM_Y}
                  width={objectWidthMm * PPM}
                  height={150}
                  rx={4}
                  fill="#d97706"
                  stroke="#92400e"
                  strokeWidth={2}
                />
                <rect
                  x={BEAM_X0}
                  y={BEAM_Y}
                  width={objectWidthMm * PPM}
                  height={12}
                  rx={4}
                  fill="rgba(255,240,150,0.3)"
                />
                {isClamped && (
                  <>
                    <line x1={BEAM_X0} y1={BEAM_Y} x2={BEAM_X0} y2={BEAM_Y + 150} stroke="#34d399" strokeWidth={4} />
                    <line x1={BEAM_X0 + objectWidthMm * PPM} y1={BEAM_Y} x2={BEAM_X0 + objectWidthMm * PPM} y2={BEAM_Y + 150} stroke="#34d399" strokeWidth={4} />
                  </>
                )}
                {/* Measurement dimension arrow */}
                {objectWidthMm * PPM > 20 && (
                  <path d={`M ${BEAM_X0 + 15} ${BEAM_Y + 40} L ${BEAM_X0 + objectWidthMm * PPM - 15} ${BEAM_Y + 40}`} stroke="#fff" strokeWidth={1.5} markerEnd="url(#arrow)" markerStart="url(#arrow)" />
                )}
                <text
                  x={BEAM_X0 + (objectWidthMm * PPM) / 2}
                  y={BEAM_Y + 55}
                  fontSize={10}
                  fill="#78350f"
                  textAnchor="middle"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {objectName}
                </text>
              </g>
            )}

            {objectWidthMm > 0 && measurementMode === "inner" && (
              <g>
                {/* Object for inner measurement (like a pipe cross section or gap) */}
                <path 
                  d={`M ${BEAM_X0 - 20} ${BEAM_Y - 130} 
                      L ${BEAM_X0} ${BEAM_Y - 130} 
                      L ${BEAM_X0} ${BEAM_Y - 50} 
                      L ${BEAM_X0 - 20} ${BEAM_Y - 50} Z`} 
                  fill="#475569" stroke="#1e293b" 
                />
                <path 
                  d={`M ${BEAM_X0 + objectWidthMm * PPM} ${BEAM_Y - 130} 
                      L ${BEAM_X0 + objectWidthMm * PPM + 20} ${BEAM_Y - 130} 
                      L ${BEAM_X0 + objectWidthMm * PPM + 20} ${BEAM_Y - 50} 
                      L ${BEAM_X0 + objectWidthMm * PPM} ${BEAM_Y - 50} Z`} 
                  fill="#475569" stroke="#1e293b" 
                />
                {isClamped && (
                  <>
                    <line x1={BEAM_X0} y1={BEAM_Y - 130} x2={BEAM_X0} y2={BEAM_Y - 50} stroke="#34d399" strokeWidth={4} />
                    <line x1={BEAM_X0 + objectWidthMm * PPM} y1={BEAM_Y - 130} x2={BEAM_X0 + objectWidthMm * PPM} y2={BEAM_Y - 50} stroke="#34d399" strokeWidth={4} />
                  </>
                )}
                {/* Measurement dimension arrow */}
                {objectWidthMm * PPM > 20 && (
                  <path d={`M ${BEAM_X0 + 15} ${BEAM_Y - 90} L ${BEAM_X0 + objectWidthMm * PPM - 15} ${BEAM_Y - 90}`} stroke="#fff" strokeWidth={1.5} markerEnd="url(#arrow)" markerStart="url(#arrow)" />
                )}
                {/* Gap label */}
                <text
                  x={BEAM_X0 + (objectWidthMm * PPM) / 2}
                  y={BEAM_Y - 100}
                  fontSize={10}
                  fill="#fff"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {objectName} (Lebar Celah)
                </text>
              </g>
            )}

            {objectWidthMm > 0 && measurementMode === "depth" && (
              <g transform={`translate(${totalCanvasW}, ${BEAM_Y - 40})`}>
                {/* A block with a horizontal hole where the depth probe goes into */}
                <rect x={0} y={0} width={objectWidthMm * PPM + 10} height={40} fill="#cbd5e1" stroke="#475569" strokeWidth={2} />
                {/* The hole itself */}
                <rect x={0} y={10} width={objectWidthMm * PPM} height={20} fill="#f8fafc" />
                {isClamped && (
                  <line x1={objectWidthMm * PPM} y1={10} x2={objectWidthMm * PPM} y2={30} stroke="#34d399" strokeWidth={4} />
                )}
                {/* Measurement dimension arrow */}
                {objectWidthMm * PPM > 20 && (
                  <path d={`M 15 20 L ${objectWidthMm * PPM - 15} 20`} stroke="#94a3b8" strokeWidth={1.5} markerEnd="url(#arrow-dark)" markerStart="url(#arrow-dark)" />
                )}
                <text
                  x={(objectWidthMm * PPM) / 2}
                  y={48}
                  fontSize={10}
                  fill="#000"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {objectName} (Kedalaman)
                </text>
              </g>
            )}

            {/* ══════════════════════════════════════════ */}
            {/* SLIDING JAW                                */}
            {/* ══════════════════════════════════════════ */}
            <g transform={`translate(${sliderX}, 0)`} filter="url(#f-drop)">

              {/* Vernier plate (sits on top of main beam) */}
              <rect
                x={-10} y={BEAM_Y - 2}
                width={N_DIV * VERNIER_SPACING * PPM + 20} height={60}
                fill="url(#g-slide)" stroke="#606878" strokeWidth={0.5}
              />

              {/* Vernier white scale strip */}
              <rect
                x={0} y={BEAM_Y - 2}
                width={N_DIV * VERNIER_SPACING * PPM} height={45}
                fill="url(#g-scale)"
              />

              {/* Vernier ticks pointing DOWN into scale strip */}
              {Array.from({ length: N_DIV + 1 }).map((_, i) => {
                const vx = i * VERNIER_SPACING * PPM;
                const isMajor = i % 5 === 0;
                const h = isMajor ? 24 : 14;
                return (
                  <g key={i}>
                    <line
                      x1={vx} y1={BEAM_Y - 2}
                      x2={vx} y2={BEAM_Y - 2 + h}
                      stroke="#1e293b"
                      strokeWidth={isMajor ? 1.8 : 1.2}
                    />
                    {isMajor && (
                      <text
                        x={vx}
                        y={BEAM_Y + 36}
                        fontSize={12}
                        fill="#1e293b"
                        textAnchor="middle"
                        fontWeight="bold"
                        fontFamily="'JetBrains Mono', monospace"
                      >
                        {i === N_DIV ? 0 : i}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* RED alignment line (vernier zero reference) */}
              <line
                x1={0} y1={BEAM_Y - 50}
                x2={0} y2={BEAM_Y + 58}
                stroke="#ef4444"
                strokeWidth={2}
              />

              {/* Slider knob (thumb) */}
              <rect
                x={-10} y={BEAM_Y - 2}
                width={32} height={60}
                rx={3} fill="#a0a8b8"
                opacity={0.85}
              />
              {/* Knurling */}
              {Array.from({ length: 8 }).map((_, i) => (
                <rect key={i} x={-4} y={BEAM_Y + 6 + i * 6} width={20} height={3} rx={1} fill="rgba(0,0,0,0.15)" />
              ))}

              {/* Sliding lower jaw (outer measurement) */}
              <g opacity={measurementMode === "outer" ? 1 : 0.3}>
                <path
                  d={`M 0 ${BEAM_Y}
                      L 0 ${BEAM_Y + 180}
                      Q 0 ${BEAM_Y + 220} 30 ${BEAM_Y + 220}
                      L 60 ${BEAM_Y + 220}
                      Q 90 ${BEAM_Y + 220} 90 ${BEAM_Y + 180}
                      L 90 ${BEAM_Y + 58}
                      L 50 ${BEAM_Y + 58}
                      Z`}
                  fill="url(#g-slide)" stroke="#606878" strokeWidth={0.5}
                />
                {/* Jaw left edge (measurement face) */}
                <line
                  x1={0} y1={BEAM_Y}
                  x2={0} y2={BEAM_Y + 220}
                  stroke="rgba(255,255,255,0.45)" strokeWidth={2}
                />
              </g>

              {/* Sliding upper jaw (inner measurement) */}
              <path
                opacity={measurementMode === "inner" ? 1 : 0.3}
                d={`M 50 ${BEAM_Y - 50}
                    L 50 ${BEAM_Y - 120}
                    L 0 ${BEAM_Y - 100}
                    L 0 ${BEAM_Y - 50}
                    Z`}
                fill="url(#g-slide)" stroke="#606878" strokeWidth={0.5}
              />
              
              {/* Depth Probe (Tangkai Kedalaman) */}
              <rect
                opacity={measurementMode === "depth" ? 1 : 0.3}
                x={0} y={BEAM_Y - 30}
                width={totalCanvasW - BEAM_X0} height={20}
                fill={measurementMode === "depth" && isClamped ? "#cbd5e1" : "#94a3b8"} 
                stroke={measurementMode === "depth" && isClamped ? "#34d399" : "#64748b"} 
                strokeWidth={measurementMode === "depth" && isClamped ? 1.5 : 0.5}
              />
            </g>
            </g>

          </svg>
        </div>
      </div>

      {/* ── CONTROLS ── */}
      <div className="flex flex-col gap-3 px-1">
        <div className="flex justify-between text-[11px] text-white/35 font-mono">
          <span>0 mm</span>
          <span>{maxMm} mm</span>
        </div>
        <input
          type="range"
          min={0} max={maxMm} step={0.05} value={openMm}
          onChange={e => setOpenMm(parseFloat(e.target.value))}
          className="w-full h-2 rounded-full cursor-grab active:cursor-grabbing accent-blue-500"
        />
        <div className="h-6 flex items-center justify-center">
          {isClamped ? (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-900/25 border border-emerald-500/30 px-4 py-1 rounded-full animate-pulse">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              Alat ukur telah menyentuh benda!
            </div>
          ) : objectWidthMm > 0 ? (
            <span className="text-xs text-white/25 italic">
              {measurementMode === "outer" ? "← Geser ke kiri untuk menjepit benda" : "Geser ke kanan untuk mengukur celah/kedalaman →"}
            </span>
          ) : null}
        </div>
      </div>

      {/* ── READINGS PANEL ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Resolusi", val: `${nstMm} mm`, color: "white/60" },
          { label: "Hasil Pengukuran", val: "? mm", color: "white" },
          { label: "Skala Utama", val: "? mm", color: "blue-300" },
          { label: "Skala Nonius", val: "? mm", color: "amber-300" },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <p className="text-[10px] text-white/40 mb-1">{label}</p>
            <p className={`text-base font-mono font-bold text-${color}`}>{val}</p>
          </div>
        ))}
      </div>

    </div>
  );
}
