"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { RotateCcw, ZoomIn, ZoomOut, CheckCircle2 } from "lucide-react";
import { readVernierCaliper } from "@/physics/measurement";
import { useMetalGradientIds, SvgMetalGradients } from "@/components/simulation/visual/SvgMetalGradients";

interface CaliperProps {
  objectWidthMm?: number;
  objectName?: string;
  nstMm?: number;
  measurementMode?: "outer" | "inner" | "depth";
  className?: string;
  vertical?: boolean;
  mode?: "practicum" | "explore";
  onReadingChange?: (reading: number) => void;
}

// ── Configuration ─────────────────────────────────────────────────────────────
const PPM = 8; // pixels per mm for high-precision detail
const MAX_MM = 150; // max opening of the caliper (in mm)
const BEAM_Y = 180; // y-coordinate of the scale baseline
const BEAM_X0 = 100; // x where mm=0 sits (left of fixed jaw tip)
const CANVAS_H = 480; // total SVG canvas height
const N_DIV = 20; // vernier divisions
const VERNIER_SPACING = 1.95; // mm per vernier division

export function Caliper({
  objectWidthMm = 0,
  objectName = "",
  nstMm = 0.05,
  measurementMode = "outer",
  className = "",
  vertical = false,
  mode = "practicum",
  onReadingChange,
}: CaliperProps) {
  const instanceId = useId().replace(/[:]/g, "_");
  const gradientIds = useMetalGradientIds(`caliper_${instanceId}`);

  const maxMm = MAX_MM;
  const initialOpenMm = measurementMode === "outer" ? maxMm : 0;
  const [openMm, setOpenMm] = useState(initialOpenMm);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync openMm when object or mode changes
  useEffect(() => {
    setOpenMm(measurementMode === "outer" ? MAX_MM : 0);
    setZoom(1);
  }, [measurementMode, objectWidthMm]);

  const totalCanvasW = BEAM_X0 + maxMm * PPM + N_DIV * VERNIER_SPACING * PPM + 40;
  // Dynamic viewbox: expand when in depth mode without layout shift
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

  // Permanent rule: store callback in useRef and isolate from effect deps
  const onReadingChangeRef = useRef(onReadingChange);
  onReadingChangeRef.current = onReadingChange;

  useEffect(() => {
    onReadingChangeRef.current?.(totalReading);
  }, [totalReading]);

  const sliderX = BEAM_X0 + clampedOpen * PPM;
  const isClamped =
    objectWidthMm > 0 &&
    (measurementMode === "outer" ? clampedOpen <= minOpen + 0.01 : clampedOpen >= maxOpen - 0.01);

  return (
    <div className={`flex flex-col gap-4 w-full ${className}`}>
      {/* ── HEADER ROW ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span className="text-xs font-bold font-mono tracking-wider text-slate-200 uppercase">
            Jangka Sorong Presisi · NST {nstMm} mm
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 font-bold">
            DIN 862
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.min(3, parseFloat((z + 0.5).toFixed(1))))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold hover:bg-cyan-900/50 transition-colors active:scale-95 shadow-sm"
          >
            <ZoomIn className="w-3.5 h-3.5" /> ZOOM IN ({zoom}x)
          </button>
          <button
            onClick={() => setZoom(1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-mono font-bold hover:bg-slate-700/60 transition-colors active:scale-95 shadow-sm"
          >
            <ZoomOut className="w-3.5 h-3.5" /> RESET ZOOM
          </button>
          <button
            onClick={() => {
              setOpenMm(measurementMode === "outer" ? MAX_MM : 0);
              setZoom(1);
            }}
            className="p-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-400 hover:text-white transition-colors active:scale-95"
            title="Reset posisi rahang"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── SVG CANVAS ─── */}
      <div
        ref={containerRef}
        className="w-full rounded-2xl border border-slate-700/70 bg-[#0d131f] overflow-hidden shadow-2xl relative"
        style={{ cursor: "default" }}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: zoom > 1 ? "25% 40%" : "50% 50%",
            transition: "transform 0.3s ease",
            overflow: "hidden",
          }}
        >
          <svg
            viewBox={vertical ? `0 0 ${CANVAS_H} ${viewboxW}` : `0 0 ${viewboxW} ${CANVAS_H}`}
            className={`transition-all duration-300 ease-in-out ${
              vertical ? "h-[550px] w-auto mx-auto" : "w-full h-auto"
            }`}
            style={{ display: "block" }}
          >
            <SvgMetalGradients ids={gradientIds} />

            <defs>
              {/* Ultra High-Contrast Satin White / Matte Silver Scale Plates */}
              <linearGradient id={`g-scale-plate-${instanceId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="60%" stopColor="#f8fafc" />
                <stop offset="100%" stopColor="#e2e8f0" />
              </linearGradient>

              {/* Tool Steel Chamfer Gradient */}
              <linearGradient id={`g-chamfer-${instanceId}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.2" />
              </linearGradient>

              {/* Dimension Arrow Markers */}
              <marker
                id={`caliper-arrow-${instanceId}`}
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
              </marker>
              <marker
                id={`caliper-arrow-dark-${instanceId}`}
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f172a" />
              </marker>
            </defs>

            <g transform={vertical ? `translate(${CANVAS_H}, 0) rotate(90)` : undefined}>
              {/* ══════════════════════════════════════════ */}
              {/* FIXED BODY + JAW                           */}
              {/* ══════════════════════════════════════════ */}

              {/* Main Beam (Fixed Steel Bar) */}
              <g>
                <rect
                  x={0}
                  y={BEAM_Y - 50}
                  width={totalCanvasW}
                  height={60}
                  fill={`url(#${gradientIds.steel})`}
                  stroke="#1e293b"
                  strokeWidth={1}
                />
                {/* Top Chamfer Bevel Highlight */}
                <rect
                  x={0}
                  y={BEAM_Y - 50}
                  width={totalCanvasW}
                  height={2.5}
                  fill="rgba(255, 255, 255, 0.45)"
                />

                {/* Fixed Upper Jaw (for inner measurement) */}
                <path
                  opacity={measurementMode === "inner" ? 1 : 0.35}
                  d={`M ${BEAM_X0 - 50} ${BEAM_Y - 50}
                      L ${BEAM_X0 - 50} ${BEAM_Y - 120}
                      L ${BEAM_X0} ${BEAM_Y - 100}
                      L ${BEAM_X0} ${BEAM_Y - 50}
                      Z`}
                  fill={`url(#${gradientIds.steel})`}
                  stroke="#1e293b"
                  strokeWidth={1}
                />

                {/* High-Contrast White Scale Plate for Main Scale */}
                <rect
                  data-scale-plate="true"
                  data-testid="scale-plate"
                  x={BEAM_X0 - 15}
                  y={BEAM_Y - 50}
                  width={maxMm * PPM + 30}
                  height={48}
                  fill={`url(#g-scale-plate-${instanceId})`}
                  stroke="#cbd5e1"
                  strokeWidth={0.8}
                />
                {/* Plate top bevel highlight */}
                <line
                  x1={BEAM_X0 - 15}
                  y1={BEAM_Y - 49}
                  x2={BEAM_X0 + maxMm * PPM + 15}
                  y2={BEAM_Y - 49}
                  stroke="#ffffff"
                  strokeWidth={1.2}
                />

                {/* Fixed Lower Jaw (for outer measurement) */}
                <g opacity={measurementMode === "outer" ? 1 : 0.35}>
                  <path
                    d={`M ${BEAM_X0 - 50} ${BEAM_Y}
                        L ${BEAM_X0 - 50} ${BEAM_Y + 180}
                        Q ${BEAM_X0 - 50} ${BEAM_Y + 220} ${BEAM_X0} ${BEAM_Y + 220}
                        L ${BEAM_X0} ${BEAM_Y}
                        Z`}
                    fill={`url(#${gradientIds.steel})`}
                    stroke="#1e293b"
                    strokeWidth={1}
                  />
                  {/* Inner measurement face chamfer */}
                  <line
                    x1={BEAM_X0}
                    y1={BEAM_Y}
                    x2={BEAM_X0}
                    y2={BEAM_Y + 220}
                    stroke="rgba(255, 255, 255, 0.5)"
                    strokeWidth={2}
                  />
                  {/* Jaw outer grip pattern */}
                  {Array.from({ length: 6 }).map((_, i) => (
                    <line
                      key={`fixed-grip-${i}`}
                      x1={BEAM_X0 - 45}
                      y1={BEAM_Y + 80 + i * 14}
                      x2={BEAM_X0 - 20}
                      y2={BEAM_Y + 80 + i * 14}
                      stroke="rgba(0,0,0,0.25)"
                      strokeWidth={1.5}
                    />
                  ))}
                </g>
              </g>

              {/* ══════════════════════════════════════════ */}
              {/* MAIN SCALE TICKS (Ultra High Contrast)     */}
              {/* ══════════════════════════════════════════ */}
              {Array.from({ length: maxMm + 1 }).map((_, i) => {
                const x = BEAM_X0 + i * PPM;
                const isCm = i % 10 === 0;
                const isHalf = i % 5 === 0 && !isCm;
                const tickH = isCm ? 28 : isHalf ? 20 : 12;

                return (
                  <g key={`main-tick-${i}`}>
                    <line
                      x1={x}
                      y1={BEAM_Y - 2}
                      x2={x}
                      y2={BEAM_Y - 2 - tickH}
                      stroke={isCm ? "#020617" : isHalf ? "#0f172a" : "#334155"}
                      strokeWidth={isCm ? 2 : isHalf ? 1.4 : 1.1}
                    />
                    {isCm && (
                      <text
                        x={x}
                        y={BEAM_Y - 35}
                        fontSize={14}
                        fill="#020617"
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
              {/* OBJECT (Benda Ukur)                        */}
              {/* ══════════════════════════════════════════ */}
              {objectWidthMm > 0 && measurementMode === "outer" && (
                <g>
                  {/* Solid Brass / Steel Test Specimen */}
                  <rect
                    x={BEAM_X0}
                    y={BEAM_Y}
                    width={objectWidthMm * PPM}
                    height={150}
                    rx={4}
                    fill={`url(#${gradientIds.brass})`}
                    stroke="#78350f"
                    strokeWidth={1.8}
                  />
                  {/* Specimen Surface Highlight */}
                  <rect
                    x={BEAM_X0 + 2}
                    y={BEAM_Y + 2}
                    width={objectWidthMm * PPM - 4}
                    height={10}
                    rx={2}
                    fill="rgba(255, 255, 255, 0.4)"
                  />
                  {isClamped && (
                    <>
                      <line
                        x1={BEAM_X0}
                        y1={BEAM_Y}
                        x2={BEAM_X0}
                        y2={BEAM_Y + 150}
                        stroke="#10b981"
                        strokeWidth={3.5}
                      />
                      <line
                        x1={BEAM_X0 + objectWidthMm * PPM}
                        y1={BEAM_Y}
                        x2={BEAM_X0 + objectWidthMm * PPM}
                        y2={BEAM_Y + 150}
                        stroke="#10b981"
                        strokeWidth={3.5}
                      />
                    </>
                  )}
                  {/* Measurement Dimension Arrow */}
                  {objectWidthMm * PPM > 20 && (
                    <path
                      d={`M ${BEAM_X0 + 15} ${BEAM_Y + 40} L ${
                        BEAM_X0 + objectWidthMm * PPM - 15
                      } ${BEAM_Y + 40}`}
                      stroke="#38bdf8"
                      strokeWidth={1.8}
                      markerEnd={`url(#caliper-arrow-${instanceId})`}
                      markerStart={`url(#caliper-arrow-${instanceId})`}
                    />
                  )}
                  <g
                    transform={`translate(${BEAM_X0 + (objectWidthMm * PPM) / 2}, ${
                      BEAM_Y + 65
                    })`}
                  >
                    <rect
                      x="-40"
                      y="-10"
                      width="80"
                      height="20"
                      rx="4"
                      fill="#0f172a"
                      stroke="#38bdf8"
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="4"
                      fontSize="10"
                      fill="#38bdf8"
                      textAnchor="middle"
                      fontWeight="bold"
                      fontFamily="'JetBrains Mono', monospace"
                    >
                      {objectName || "Benda"}
                    </text>
                  </g>
                </g>
              )}

              {objectWidthMm > 0 && measurementMode === "inner" && (
                <g>
                  {/* Test Ring Gap / Cylinder Bore */}
                  <path
                    d={`M ${BEAM_X0 - 24} ${BEAM_Y - 130} 
                        L ${BEAM_X0} ${BEAM_Y - 130} 
                        L ${BEAM_X0} ${BEAM_Y - 50} 
                        L ${BEAM_X0 - 24} ${BEAM_Y - 50} Z`}
                    fill="#334155"
                    stroke="#0f172a"
                    strokeWidth={1.5}
                  />
                  <path
                    d={`M ${BEAM_X0 + objectWidthMm * PPM} ${BEAM_Y - 130} 
                        L ${BEAM_X0 + objectWidthMm * PPM + 24} ${BEAM_Y - 130} 
                        L ${BEAM_X0 + objectWidthMm * PPM + 24} ${BEAM_Y - 50} 
                        L ${BEAM_X0 + objectWidthMm * PPM} ${BEAM_Y - 50} Z`}
                    fill="#334155"
                    stroke="#0f172a"
                    strokeWidth={1.5}
                  />
                  {isClamped && (
                    <>
                      <line
                        x1={BEAM_X0}
                        y1={BEAM_Y - 130}
                        x2={BEAM_X0}
                        y2={BEAM_Y - 50}
                        stroke="#10b981"
                        strokeWidth={3.5}
                      />
                      <line
                        x1={BEAM_X0 + objectWidthMm * PPM}
                        y1={BEAM_Y - 130}
                        x2={BEAM_X0 + objectWidthMm * PPM}
                        y2={BEAM_Y - 50}
                        stroke="#10b981"
                        strokeWidth={3.5}
                      />
                    </>
                  )}
                  {objectWidthMm * PPM > 20 && (
                    <path
                      d={`M ${BEAM_X0 + 15} ${BEAM_Y - 90} L ${
                        BEAM_X0 + objectWidthMm * PPM - 15
                      } ${BEAM_Y - 90}`}
                      stroke="#38bdf8"
                      strokeWidth={1.8}
                      markerEnd={`url(#caliper-arrow-${instanceId})`}
                      markerStart={`url(#caliper-arrow-${instanceId})`}
                    />
                  )}
                  <text
                    x={BEAM_X0 + (objectWidthMm * PPM) / 2}
                    y={BEAM_Y - 102}
                    fontSize={10}
                    fill="#38bdf8"
                    textAnchor="middle"
                    fontWeight="bold"
                    fontFamily="'JetBrains Mono', monospace"
                  >
                    {objectName} (Diameter Dalam)
                  </text>
                </g>
              )}

              {objectWidthMm > 0 && measurementMode === "depth" && (
                <g transform={`translate(${totalCanvasW}, ${BEAM_Y - 40})`}>
                  {/* Block with depth hole */}
                  <rect
                    x={0}
                    y={0}
                    width={objectWidthMm * PPM + 12}
                    height={40}
                    fill="#1e293b"
                    stroke="#475569"
                    strokeWidth={2}
                    rx={2}
                  />
                  <rect
                    x={0}
                    y={10}
                    width={objectWidthMm * PPM}
                    height={20}
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth={1}
                  />
                  {isClamped && (
                    <line
                      x1={objectWidthMm * PPM}
                      y1={10}
                      x2={objectWidthMm * PPM}
                      y2={30}
                      stroke="#10b981"
                      strokeWidth={3.5}
                    />
                  )}
                  {objectWidthMm * PPM > 20 && (
                    <path
                      d={`M 15 20 L ${objectWidthMm * PPM - 15} 20`}
                      stroke="#38bdf8"
                      strokeWidth={1.8}
                      markerEnd={`url(#caliper-arrow-${instanceId})`}
                      markerStart={`url(#caliper-arrow-${instanceId})`}
                    />
                  )}
                  <text
                    x={(objectWidthMm * PPM) / 2}
                    y={52}
                    fontSize={10}
                    fill="#94a3b8"
                    textAnchor="middle"
                    fontWeight="bold"
                    fontFamily="'JetBrains Mono', monospace"
                  >
                    {objectName} (Kedalaman)
                  </text>
                </g>
              )}

              {/* ══════════════════════════════════════════ */}
              {/* SLIDING JAW (Zero SVG filter for 60 FPS)   */}
              {/* ══════════════════════════════════════════ */}
              <g transform={`translate(${sliderX}, 0)`}>
                {/* Vernier Plate Carrier Body */}
                <rect
                  x={-10}
                  y={BEAM_Y - 2}
                  width={N_DIV * VERNIER_SPACING * PPM + 20}
                  height={60}
                  fill={`url(#${gradientIds.aluminum})`}
                  stroke="#1e293b"
                  strokeWidth={1}
                />
                {/* Slider carrier top border highlight */}
                <line
                  x1={-10}
                  y1={BEAM_Y - 1}
                  x2={N_DIV * VERNIER_SPACING * PPM + 10}
                  y2={BEAM_Y - 1}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />

                {/* Ultra High-Contrast Vernier White Scale Strip */}
                <rect
                  data-scale-plate="true"
                  data-testid="scale-plate"
                  x={0}
                  y={BEAM_Y - 2}
                  width={N_DIV * VERNIER_SPACING * PPM}
                  height={45}
                  fill={`url(#g-scale-plate-${instanceId})`}
                  stroke="#cbd5e1"
                  strokeWidth={0.8}
                />

                {/* Vernier Scale Ticks */}
                {Array.from({ length: N_DIV + 1 }).map((_, i) => {
                  const vx = i * VERNIER_SPACING * PPM;
                  const isMajor = i % 5 === 0;
                  const h = isMajor ? 24 : 14;
                  return (
                    <g key={`vernier-tick-${i}`}>
                      <line
                        x1={vx}
                        y1={BEAM_Y - 2}
                        x2={vx}
                        y2={BEAM_Y - 2 + h}
                        stroke={isMajor ? "#020617" : "#334155"}
                        strokeWidth={isMajor ? 1.8 : 1.1}
                      />
                      {isMajor && (
                        <text
                          x={vx}
                          y={BEAM_Y + 36}
                          fontSize={12}
                          fill="#020617"
                          textAnchor="middle"
                          fontWeight="bold"
                          fontFamily="'JetBrains Mono', monospace"
                        >
                          {i === N_DIV ? 0 : i / 2}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* RED Laser Alignment Line (Vernier Zero Reference) */}
                <line
                  x1={0}
                  y1={BEAM_Y - 50}
                  x2={0}
                  y2={BEAM_Y + 58}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeLinecap="round"
                />

                {/* Slider Knurled Thumb Grip */}
                <rect
                  x={-12}
                  y={BEAM_Y - 2}
                  width={34}
                  height={60}
                  rx={4}
                  fill={`url(#${gradientIds.chassisDark})`}
                  stroke="#334155"
                  strokeWidth={1}
                />
                {/* Knurled Ridges */}
                {Array.from({ length: 8 }).map((_, i) => (
                  <rect
                    key={`knurl-${i}`}
                    x={-6}
                    y={BEAM_Y + 6 + i * 6}
                    width={22}
                    height={3}
                    rx={1}
                    fill="#64748b"
                    opacity={0.8}
                  />
                ))}

                {/* Sliding Lower Jaw (Outer measurement) */}
                <g opacity={measurementMode === "outer" ? 1 : 0.35}>
                  <path
                    d={`M 0 ${BEAM_Y}
                        L 0 ${BEAM_Y + 180}
                        Q 0 ${BEAM_Y + 220} 30 ${BEAM_Y + 220}
                        L 60 ${BEAM_Y + 220}
                        Q 90 ${BEAM_Y + 220} 90 ${BEAM_Y + 180}
                        L 90 ${BEAM_Y + 58}
                        L 50 ${BEAM_Y + 58}
                        Z`}
                    fill={`url(#${gradientIds.steel})`}
                    stroke="#1e293b"
                    strokeWidth={1}
                  />
                  {/* Jaw left measurement face highlight */}
                  <line
                    x1={0}
                    y1={BEAM_Y}
                    x2={0}
                    y2={BEAM_Y + 220}
                    stroke="rgba(255, 255, 255, 0.55)"
                    strokeWidth={2}
                  />
                </g>

                {/* Sliding Upper Jaw (Inner measurement) */}
                <path
                  opacity={measurementMode === "inner" ? 1 : 0.35}
                  d={`M 50 ${BEAM_Y - 50}
                      L 50 ${BEAM_Y - 120}
                      L 0 ${BEAM_Y - 100}
                      L 0 ${BEAM_Y - 50}
                      Z`}
                  fill={`url(#${gradientIds.steel})`}
                  stroke="#1e293b"
                  strokeWidth={1}
                />

                {/* Depth Probe Rod (Tangkai Kedalaman) */}
                <rect
                  opacity={measurementMode === "depth" ? 1 : 0.35}
                  x={0}
                  y={BEAM_Y - 30}
                  width={totalCanvasW - BEAM_X0}
                  height={20}
                  fill={`url(#${gradientIds.steel})`}
                  stroke={measurementMode === "depth" && isClamped ? "#10b981" : "#475569"}
                  strokeWidth={measurementMode === "depth" && isClamped ? 1.8 : 0.8}
                />
              </g>
            </g>
          </svg>
        </div>
      </div>

      {/* ── CONTROLS ── */}
      <div className="flex flex-col gap-3 px-1">
        <div className="flex justify-between text-xs text-slate-400 font-mono">
          <span>0 mm (Tertutup)</span>
          <span className="text-cyan-400 font-bold">{clampedOpen.toFixed(2)} mm</span>
          <span>{maxMm} mm (Maksimum)</span>
        </div>
        <input
          type="range"
          min={0}
          max={maxMm}
          step={0.05}
          value={openMm}
          onChange={(e) => setOpenMm(parseFloat(e.target.value))}
          className="w-full h-2.5 rounded-full cursor-grab active:cursor-grabbing accent-cyan-500 bg-slate-800"
        />
        <div className="h-6 flex items-center justify-center">
          {isClamped ? (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold font-mono bg-emerald-950/50 border border-emerald-500/40 px-4 py-1 rounded-full animate-pulse shadow-md">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Alat ukur telah menyentuh & mengunci benda uji!
            </div>
          ) : objectWidthMm > 0 ? (
            <span className="text-xs text-slate-400/80 italic font-mono">
              {measurementMode === "outer"
                ? "← Geser ke kiri untuk menjepit benda"
                : "Geser ke kanan untuk mengukur celah/kedalaman →"}
            </span>
          ) : null}
        </div>
      </div>

      {/* ── READINGS PANEL ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Resolusi (NST)", val: `${nstMm} mm`, color: "text-slate-300" },
          {
            label: "Hasil Pengukuran",
            val: mode === "explore" ? `${totalReading.toFixed(2)} mm` : "? mm",
            color: "text-cyan-300",
          },
          {
            label: "Skala Utama",
            val: mode === "explore" ? `${mainScaleReading} mm` : "? mm",
            color: "text-blue-300",
          },
          {
            label: "Skala Nonius",
            val: mode === "explore" ? `${vernierReading.toFixed(2)} mm` : "? mm",
            color: "text-amber-300",
          },
        ].map(({ label, val, color }) => (
          <div
            key={label}
            className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 text-center shadow-lg"
          >
            <p className="text-[10px] text-slate-400 font-mono mb-1">{label}</p>
            <p className={`text-base font-mono font-bold ${color}`}>{val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
