"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { calculateOhausBalance, OhausSliders } from "@/physics/balance";
import { CheckCircle2, RotateCcw, Scale } from "lucide-react";
import { useMetalGradientIds, SvgMetalGradients } from "@/components/simulation/visual/SvgMetalGradients";

interface OhausBalanceProps {
  valueGrams: number; // ground truth
  className?: string;
  onReadingChange?: (reading: number) => void;
}

const X0 = 50;
const X1 = 800;
const W = X1 - X0; // 750 px

const ARM_Y = {
  top: 75,
  middle: 165,
  bottom: 255,
};

export function OhausBalance({ valueGrams, className = "", onReadingChange }: OhausBalanceProps) {
  const instanceId = useId().replace(/[:]/g, "_");
  const gradientIds = useMetalGradientIds(`ohaus_${instanceId}`);

  const [sliders, setSliders] = useState<OhausSliders>({ topGrams: 0, middleGrams: 0, bottomGrams: 0 });
  const [dragging, setDragging] = useState<"top" | "middle" | "bottom" | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const totalReading = sliders.topGrams + sliders.middleGrams + sliders.bottomGrams;

  // Permanent rule: store callback in useRef and isolate from effect deps
  const onReadingChangeRef = useRef(onReadingChange);
  onReadingChangeRef.current = onReadingChange;

  useEffect(() => {
    onReadingChangeRef.current?.(totalReading);
  }, [totalReading]);

  // Reset when object changes
  useEffect(() => {
    setSliders({ topGrams: 0, middleGrams: 0, bottomGrams: 0 });
    setDragging(null);
  }, [valueGrams]);

  const balanceState = calculateOhausBalance(sliders, valueGrams);

  const handlePointerDown = (e: React.PointerEvent, arm: "top" | "middle" | "bottom") => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(arm);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !svgRef.current) return;

    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());

    let ratio = (svgP.x - X0) / W;
    if (ratio < 0) ratio = 0;
    if (ratio > 1) ratio = 1;

    setSliders((prev) => {
      const next = { ...prev };
      if (dragging === "top") {
        next.topGrams = ratio * 100; // Kontinu saat di-drag
      } else if (dragging === "middle") {
        next.middleGrams = ratio * 500; // Kontinu saat di-drag
      } else if (dragging === "bottom") {
        next.bottomGrams = ratio * 10;
      }
      return next;
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragging) {
      // Snap ke notch terdekat saat dilepas
      setSliders((prev) => ({
        ...prev,
        topGrams: dragging === "top" ? Math.round(prev.topGrams / 10) * 10 : prev.topGrams,
        middleGrams: dragging === "middle" ? Math.round(prev.middleGrams / 100) * 100 : prev.middleGrams,
        bottomGrams: dragging === "bottom" ? Math.round(prev.bottomGrams * 10) / 10 : prev.bottomGrams,
      }));

      e.currentTarget.releasePointerCapture(e.pointerId);
      setDragging(null);
    }
  };

  // Convert values back to X coords
  const topX = X0 + (sliders.topGrams / 100) * W;
  const middleX = X0 + (sliders.middleGrams / 500) * W;
  const bottomX = X0 + (sliders.bottomGrams / 10) * W;

  // Pointer deflection angle (maksimum rotasi dalam derajat)
  const MAX_ANGLE = 4;
  const pointerAngle = balanceState.pointerDeflection * MAX_ANGLE; // + is up, - is down

  return (
    <div
      className={`relative w-full rounded-2xl border border-slate-700/70 bg-[#0d131f] overflow-hidden shadow-2xl flex flex-col ${className}`}
      style={{ cursor: dragging ? "ew-resize" : "default" }}
    >
      {/* ── HEADER INSTRUMENT PANEL ── */}
      <div className="bg-slate-900/90 text-white p-4 flex flex-wrap justify-between items-center z-10 border-b border-slate-700/70 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base font-mono tracking-wide text-slate-100">
                NERACA O'HAUS TIGA LENGAN
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 font-bold">
                PRESISI TINGGI
              </span>
            </div>
            <p className="text-slate-400 text-xs font-mono mt-0.5">
              KAPASITAS MAKS: 610,0 g · NST: 0,1 g
            </p>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          {balanceState.isBalanced ? (
            <div className="flex items-center gap-2 bg-emerald-950/70 text-emerald-300 px-4 py-1.5 rounded-full border border-emerald-500/40 font-mono text-xs font-bold animate-pulse shadow-md">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>SEIMBANG! (Jarum Tepat di Nol)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-amber-950/50 text-amber-300 px-3 py-1 rounded-full border border-amber-500/30 font-mono text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>{pointerAngle > 0 ? "Beban Belum Cukup" : "Beban Berlebih"}</span>
            </div>
          )}

          <button
            onClick={() => setSliders({ topGrams: 0, middleGrams: 0, bottomGrams: 0 })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 rounded-xl text-xs font-mono font-bold transition-colors active:scale-95 shadow-sm"
            title="Reset seluruh anak timbangan ke 0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Rider
          </button>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 1000 730"
        className="w-full h-auto select-none touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <SvgMetalGradients ids={gradientIds} />

        <defs>
          {/* Ultra High-Contrast White Scale Plates for Arm Readings */}
          <linearGradient id={`ohaus-plate-grad-${instanceId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="65%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>

          {/* Cast Iron Base Gradient */}
          <linearGradient id={`ohaus-base-grad-${instanceId}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="40%" stopColor="#1e293b" />
            <stop offset="85%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* Rider Brass Knurled Texture */}
          <linearGradient id={`ohaus-rider-brass-${instanceId}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="35%" stopColor="#f59e0b" />
            <stop offset="75%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          {/* Stainless Pan Saucer Radial Gradient */}
          <radialGradient id={`ohaus-pan-grad-${instanceId}`} cx="45%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#e2e8f0" />
            <stop offset="65%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </radialGradient>
        </defs>

        {/* Outer Background Enclosure */}
        <rect width="1000" height="340" fill="#090d16" />
        <rect x="0" y="340" width="1000" height="390" fill="#0b101c" />
        <line x1="0" y1="340" x2="1000" y2="340" stroke="#1e293b" strokeWidth="2" />

        {/* =====================================================================================
            PANEL 1: KONTROL LENGAN SKALA (ULTRA HIGH-CONTRAST WHITE PLATES)
            ===================================================================================== */}
        <g>
          {/* Section Sub-heading Banner */}
          <rect x="20" y="16" width="960" height="28" rx="6" fill="#111827" stroke="#1e293b" strokeWidth="1" />
          <text x="35" y="35" fill="#94a3b8" fontSize="11" fontFamily="'JetBrains Mono', monospace" fontWeight="bold">
            PENGATURAN POSISI ANAK TIMBANGAN (GESER RIDER PADA LENGAN):
          </text>
          <text x="965" y="35" fill="#38bdf8" fontSize="11" fontFamily="'JetBrains Mono', monospace" fontWeight="bold" textAnchor="end">
            TOTAL = {totalReading.toFixed(2)} g
          </text>

          {/* ────────────────────────────────────────────────────────── */}
          {/* Top Arm (0 - 100 g, step 10 g) */}
          {/* ────────────────────────────────────────────────────────── */}
          <g>
            {/* Dark Chassis Slot Housing */}
            <rect x={X0 - 25} y={ARM_Y.top - 20} width={W + 50} height={42} fill="#1e293b" stroke="#334155" strokeWidth="1" rx="6" />

            {/* High-Contrast White Scale Plate */}
            <rect x={X0 - 15} y={ARM_Y.top - 14} width={W + 30} height={30} fill={`url(#ohaus-plate-grad-${instanceId})`} stroke="#cbd5e1" strokeWidth="0.8" rx="3" />

            {/* Guide Rail Groove */}
            <line x1={X0} y1={ARM_Y.top} x2={X1} y2={ARM_Y.top} stroke="#64748b" strokeWidth="1.5" />

            {/* Scale Label Badge */}
            <text x={X0 - 20} y={ARM_Y.top + 5} fill="#38bdf8" fontSize="10" fontFamily="'JetBrains Mono', monospace" fontWeight="bold" textAnchor="end">
              [100g]
            </text>

            {/* Ticks and Notches (0 - 100 g) */}
            {Array.from({ length: 11 }).map((_, i) => {
              const x = X0 + (i / 10) * W;
              return (
                <g key={`top-${i}`}>
                  {/* Notch Detent V-cut */}
                  <polygon points={`${x - 3},${ARM_Y.top - 12} ${x + 3},${ARM_Y.top - 12} ${x},${ARM_Y.top - 4}`} fill="#334155" />
                  <line x1={x} y1={ARM_Y.top - 4} x2={x} y2={ARM_Y.top + 8} stroke="#020617" strokeWidth="2" />
                  <text
                    x={x}
                    y={ARM_Y.top + 12}
                    fontSize="13"
                    fontWeight="bold"
                    fill="#020617"
                    textAnchor="middle"
                    fontFamily="'JetBrains Mono', monospace"
                  >
                    {i * 10}
                  </text>
                </g>
              );
            })}

            {/* Top Slider (Rider 100g) */}
            <g
              onPointerDown={(e) => handlePointerDown(e, "top")}
              style={{
                cursor: "ew-resize",
                transform: `translate(${topX}px, ${ARM_Y.top}px)`,
                transition: dragging === "top" ? "none" : "transform 250ms cubic-bezier(0.4, 0, 0.2, 1)",
                willChange: dragging === "top" ? "transform" : "auto",
              }}
            >
              {/* Machined Brass Weight Body */}
              <path
                d="M -26 -28 L 26 -28 L 18 20 L -18 20 Z"
                fill={`url(#${gradientIds.brass})`}
                stroke="#78350f"
                strokeWidth="1.5"
              />
              {/* Knurled Top Lock Knob */}
              <rect x="-8" y="-34" width="16" height="7" rx="2" fill="#64748b" stroke="#1e293b" strokeWidth="1" />
              {/* Center Pointer Red Index Wire */}
              <line x1="0" y1="-28" x2="0" y2="20" stroke="#ef4444" strokeWidth="2.5" />
              <polygon points="-4,-28 4,-28 0,-18" fill="#ef4444" />
              <text x="0" y="-8" fontSize="9" fontWeight="bold" fill="#451a03" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
                10g
              </text>
            </g>
          </g>

          {/* ────────────────────────────────────────────────────────── */}
          {/* Middle Arm (0 - 500 g, step 100 g) */}
          {/* ────────────────────────────────────────────────────────── */}
          <g>
            {/* Dark Chassis Slot Housing */}
            <rect x={X0 - 25} y={ARM_Y.middle - 22} width={W + 50} height={46} fill="#1e293b" stroke="#334155" strokeWidth="1" rx="6" />

            {/* High-Contrast White Scale Plate */}
            <rect x={X0 - 15} y={ARM_Y.middle - 16} width={W + 30} height={34} fill={`url(#ohaus-plate-grad-${instanceId})`} stroke="#cbd5e1" strokeWidth="0.8" rx="3" />

            {/* Guide Rail Groove */}
            <line x1={X0} y1={ARM_Y.middle} x2={X1} y2={ARM_Y.middle} stroke="#64748b" strokeWidth="1.5" />

            {/* Scale Label Badge */}
            <text x={X0 - 20} y={ARM_Y.middle + 5} fill="#38bdf8" fontSize="10" fontFamily="'JetBrains Mono', monospace" fontWeight="bold" textAnchor="end">
              [500g]
            </text>

            {/* Ticks and Notches (0 - 500 g) */}
            {Array.from({ length: 6 }).map((_, i) => {
              const x = X0 + (i / 5) * W;
              return (
                <g key={`mid-${i}`}>
                  {/* Notch Detent V-cut */}
                  <polygon points={`${x - 4},${ARM_Y.middle - 14} ${x + 4},${ARM_Y.middle - 14} ${x},${ARM_Y.middle - 4}`} fill="#334155" />
                  <line x1={x} y1={ARM_Y.middle - 4} x2={x} y2={ARM_Y.middle + 10} stroke="#020617" strokeWidth="2.2" />
                  <text
                    x={x}
                    y={ARM_Y.middle + 14}
                    fontSize="13"
                    fontWeight="bold"
                    fill="#020617"
                    textAnchor="middle"
                    fontFamily="'JetBrains Mono', monospace"
                  >
                    {i * 100}
                  </text>
                </g>
              );
            })}

            {/* Middle Slider (Heavy 500g Rider) */}
            <g
              onPointerDown={(e) => handlePointerDown(e, "middle")}
              style={{
                cursor: "ew-resize",
                transform: `translate(${middleX}px, ${ARM_Y.middle}px)`,
                transition: dragging === "middle" ? "none" : "transform 250ms cubic-bezier(0.4, 0, 0.2, 1)",
                willChange: dragging === "middle" ? "transform" : "auto",
              }}
            >
              {/* Heavy Machined Metal Body */}
              <path
                d="M -34 -34 L 34 -34 L 24 24 L -24 24 Z"
                fill={`url(#${gradientIds.steel})`}
                stroke="#1e293b"
                strokeWidth="1.5"
              />
              {/* Top Clamp Screw */}
              <rect x="-10" y="-40" width="20" height="7" rx="2" fill="#475569" stroke="#1e293b" strokeWidth="1" />
              {/* Center Pointer Red Index Wire */}
              <line x1="0" y1="-34" x2="0" y2="24" stroke="#ef4444" strokeWidth="3" />
              <polygon points="-5,-34 5,-34 0,-22" fill="#ef4444" />
              <text x="0" y="-10" fontSize="10" fontWeight="bold" fill="#0f172a" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
                100g
              </text>
            </g>
          </g>

          {/* ────────────────────────────────────────────────────────── */}
          {/* Bottom Arm (0 - 10 g, continuous with 0.1 g ticks) */}
          {/* ────────────────────────────────────────────────────────── */}
          <g>
            {/* Dark Chassis Slot Housing */}
            <rect x={X0 - 25} y={ARM_Y.bottom - 20} width={W + 50} height={44} fill="#1e293b" stroke="#334155" strokeWidth="1" rx="6" />

            {/* High-Contrast White Scale Plate */}
            <rect x={X0 - 15} y={ARM_Y.bottom - 14} width={W + 30} height={32} fill={`url(#ohaus-plate-grad-${instanceId})`} stroke="#cbd5e1" strokeWidth="0.8" rx="3" />

            {/* Scale Label Badge */}
            <text x={X0 - 20} y={ARM_Y.bottom + 5} fill="#38bdf8" fontSize="10" fontFamily="'JetBrains Mono', monospace" fontWeight="bold" textAnchor="end">
              [10g]
            </text>

            {/* 101 Tick Marks for 0 - 10 g */}
            {Array.from({ length: 101 }).map((_, i) => {
              const x = X0 + (i / 100) * W;
              const isMajor = i % 10 === 0;
              const isMedium = i % 5 === 0 && !isMajor;
              const lineY = isMajor ? ARM_Y.bottom - 12 : isMedium ? ARM_Y.bottom - 7 : ARM_Y.bottom - 2;

              return (
                <g key={`bot-${i}`}>
                  <line
                    x1={x}
                    y1={lineY}
                    x2={x}
                    y2={ARM_Y.bottom + 6}
                    stroke={isMajor ? "#020617" : isMedium ? "#0f172a" : "#475569"}
                    strokeWidth={isMajor ? 2 : isMedium ? 1.4 : 0.9}
                  />
                  {isMajor && (
                    <text
                      x={x}
                      y={ARM_Y.bottom + 14}
                      fontSize="12"
                      fontWeight="bold"
                      fill="#020617"
                      textAnchor="middle"
                      fontFamily="'JetBrains Mono', monospace"
                    >
                      {i / 10}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Bottom Slider (Fine Sliding Rider 0-10g) */}
            <g
              onPointerDown={(e) => handlePointerDown(e, "bottom")}
              style={{
                cursor: "ew-resize",
                transform: `translate(${bottomX}px, ${ARM_Y.bottom}px)`,
                transition: dragging === "bottom" ? "none" : "transform 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                willChange: dragging === "bottom" ? "transform" : "auto",
              }}
            >
              {/* Fine Brass Sliding Collar */}
              <path
                d="M -16 -24 L 16 -24 L 12 18 L -12 18 Z"
                fill={`url(#${gradientIds.brass})`}
                stroke="#78350f"
                strokeWidth="1.2"
              />
              <line x1="0" y1="-24" x2="0" y2="18" stroke="#ef4444" strokeWidth="2.5" />
              <polygon points="-3,-24 3,-24 0,-14" fill="#ef4444" />
            </g>
          </g>
        </g>

        {/* =====================================================================================
            PANEL 2: VISUALISASI MEKANIK 3D (PIVOTING BEAM, PAN, DAN INDIKATOR 0)
            ===================================================================================== */}
        <svg x="0" y="340" width="1000" height="390" viewBox="0 0 1000 390">
          {/* Heavy Cast Iron Base & Fulcrum Pillar */}
          <g>
            {/* Laboratory Table Leveling Base */}
            <path
              d="M 100 375 L 390 375 L 370 240 L 230 240 Z"
              fill={`url(#ohaus-base-grad-${instanceId})`}
              stroke="#475569"
              strokeWidth="1.5"
            />
            {/* Leveling Feet Thumb Screws */}
            <circle cx="120" cy="380" r="10" fill="#64748b" stroke="#1e293b" strokeWidth="1" />
            <circle cx="370" cy="380" r="10" fill="#64748b" stroke="#1e293b" strokeWidth="1" />

            {/* Horizontal Base Extension */}
            <rect
              x="290"
              y="345"
              width="580"
              height="30"
              fill={`url(#ohaus-base-grad-${instanceId})`}
              stroke="#475569"
              strokeWidth="1.2"
              rx="4"
            />

            {/* Right Equilibrium Indicator Stand / Pillar */}
            <path
              d="M 825 375 L 890 375 L 870 135 L 845 135 Z"
              fill={`url(#ohaus-base-grad-${instanceId})`}
              stroke="#475569"
              strokeWidth="1.5"
            />

            {/* Precision Zero Mark Indicator Scale Plate (White Satin) */}
            <rect
              x="850"
              y="145"
              width="24"
              height="110"
              rx="3"
              fill={`url(#ohaus-plate-grad-${instanceId})`}
              stroke="#cbd5e1"
              strokeWidth="1"
            />
            {/* Upper / Lower Deviation Graduations (+ / -) */}
            {[-30, -20, -10, 10, 20, 30].map((dy) => (
              <line
                key={`zero-mark-${dy}`}
                x1="854"
                y1={200 + dy}
                x2="866"
                y2={200 + dy}
                stroke="#64748b"
                strokeWidth="1.2"
              />
            ))}
            {/* Zero Equilibrium Target Line (Green) */}
            <line x1="848" y1="200" x2="876" y2="200" stroke="#10b981" strokeWidth="3" />
            <text
              x="886"
              y="204"
              fill="#10b981"
              fontSize="14"
              fontWeight="bold"
              fontFamily="'JetBrains Mono', monospace"
            >
              0
            </text>

            {/* Fulcrum Bearing Hub */}
            <circle cx="300" cy="220" r="18" fill={`url(#${gradientIds.chassisDark})`} stroke="#475569" strokeWidth="1.5" />
            <circle cx="300" cy="220" r="10" fill={`url(#${gradientIds.brass})`} stroke="#78350f" strokeWidth="1" />
          </g>

          {/* ────────────────────────────────────────────────────────── */}
          {/* Pivoting Beam Assembly (Rotates with -pointerAngle) */}
          {/* ────────────────────────────────────────────────────────── */}
          <g
            style={{
              transform: `rotate(${-pointerAngle}deg)`,
              transformOrigin: "300px 220px",
              transition: "transform 280ms cubic-bezier(0.4, 0, 0.2, 1)",
              willChange: "transform",
            }}
          >
            {/* Left Arm to Pan Linkage */}
            <rect
              x="170"
              y="210"
              width="130"
              height="20"
              fill={`url(#${gradientIds.steel})`}
              stroke="#1e293b"
              strokeWidth="1"
              rx="2"
            />
            {/* Left Knife-Edge Bearing Pivot */}
            <circle cx="190" cy="220" r="6" fill="#0284c7" stroke="#0f172a" strokeWidth="1" />

            {/* Right Triple-Beam Arm Body */}
            <rect
              x="300"
              y="165"
              width="535"
              height="90"
              fill={`url(#${gradientIds.aluminum})`}
              stroke="#1e293b"
              strokeWidth="1.2"
              rx="4"
            />
            {/* Beam Structural Cutouts (Lightening Windows) */}
            {[0, 1, 2, 3].map((wIdx) => (
              <rect
                key={`beam-cutout-${wIdx}`}
                x={325 + wIdx * 125}
                y="172"
                width="105"
                height="76"
                rx="3"
                fill="#0f172a"
                stroke="#334155"
                strokeWidth="0.8"
              />
            ))}

            {/* 3 Mini-Riders Moving Realtime with Sliders on the Beam */}
            {/* Top Mini-Rider (0-100g) */}
            <line x1="330" y1="185" x2="800" y2="185" stroke="#475569" strokeWidth="2" />
            <polygon
              points="-4,8 4,8 0,0"
              fill={`url(#${gradientIds.brass})`}
              stroke="#78350f"
              strokeWidth="0.5"
              style={{
                transform: `translate(${330 + (sliders.topGrams / 100) * 470}px, 185px)`,
                transition: dragging === "top" ? "none" : "transform 250ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />

            {/* Middle Mini-Rider (0-500g) */}
            <line x1="330" y1="210" x2="800" y2="210" stroke="#475569" strokeWidth="2" />
            <polygon
              points="-6,12 6,12 0,0"
              fill={`url(#${gradientIds.steel})`}
              stroke="#1e293b"
              strokeWidth="0.5"
              style={{
                transform: `translate(${330 + (sliders.middleGrams / 500) * 470}px, 210px)`,
                transition: dragging === "middle" ? "none" : "transform 250ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />

            {/* Bottom Mini-Rider (0-10g) */}
            <line x1="330" y1="235" x2="800" y2="235" stroke="#475569" strokeWidth="2" />
            <polygon
              points="-4,8 4,8 0,0"
              fill={`url(#${gradientIds.brass})`}
              stroke="#78350f"
              strokeWidth="0.5"
              style={{
                transform: `translate(${330 + (sliders.bottomGrams / 10) * 470}px, 235px)`,
                transition: dragging === "bottom" ? "none" : "transform 200ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />

            {/* Right Pointer Needle (Crisp Tapered Red Pointer) */}
            <polygon points="835,196 835,204 860,200" fill="#ef4444" stroke="#991b1b" strokeWidth="0.8" />
            <circle cx="835" cy="200" r="3" fill="#ffffff" />

            {/* ────────────────────────────────────────────────────────── */}
            {/* Left Pan Assembly (Suspension Bow, Saucer, and Specimen) */}
            {/* ────────────────────────────────────────────────────────── */}
            <g transform="translate(190, 220)">
              {/* Pan Suspension Bow / Arm */}
              <rect x="-10" y="-85" width="20" height="85" fill={`url(#${gradientIds.steel})`} stroke="#1e293b" strokeWidth="1" rx="2" />
              <path d="M -22 -15 L 22 -15 L 14 20 L -14 20 Z" fill="#334155" stroke="#0f172a" strokeWidth="1" />

              {/* Stainless Steel Weighing Saucer Pan */}
              <path
                d="M -95 -85 L 95 -85 L 60 -65 L -60 -65 Z"
                fill={`url(#ohaus-pan-grad-${instanceId})`}
                stroke="#475569"
                strokeWidth="1.5"
              />
              {/* Pan Rim Lip Highlight */}
              <line x1="-95" y1="-85" x2="95" y2="-85" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />

              {/* Measured Specimen (Object Box / Cylinder on Pan) */}
              {valueGrams > 0 && (
                <g transform="translate(0, -85)">
                  {/* Brass Specimen Weight */}
                  <rect
                    x="-26"
                    y="-45"
                    width="52"
                    height="45"
                    rx="4"
                    fill={`url(#${gradientIds.brass})`}
                    stroke="#78350f"
                    strokeWidth="1.5"
                  />
                  <rect x="-18" y="-40" width="36" height="8" rx="2" fill="rgba(255,255,255,0.35)" />
                  <text
                    x="0"
                    y="-18"
                    fontSize="11"
                    fontWeight="bold"
                    fill="#451a03"
                    textAnchor="middle"
                    fontFamily="'JetBrains Mono', monospace"
                  >
                    BENDA
                  </text>
                  <text
                    x="0"
                    y="-6"
                    fontSize="9"
                    fontWeight="bold"
                    fill="#78350f"
                    textAnchor="middle"
                    fontFamily="'JetBrains Mono', monospace"
                  >
                    UJI
                  </text>
                </g>
              )}
            </g>

            {/* Center Fulcrum Pivot Hub Cover */}
            <circle cx="300" cy="220" r="14" fill={`url(#${gradientIds.steel})`} stroke="#1e293b" strokeWidth="1.5" />
            <circle cx="300" cy="220" r="5" fill="#38bdf8" />
          </g>
        </svg>
      </svg>
    </div>
  );
}
