"use client";

import React, { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import { calculateFallTime, calculateGLBTime } from "@/physics/atwood";
import {
  useMetalGradientIds,
  SvgMetalGradients,
  SvgGridBackground,
  SvgPulley,
  SvgCalloutBadge,
  SCIENTIFIC_THEME,
} from "@/components/simulation/visual";

export interface AtwoodApparatusProps {
  mode: "GLBB" | "GLB" | "explore";
  additionalMassConfig: "m3" | "m3_m4" | "none";
  a_true: number;       // Theoretical acceleration for phase A-B
  v_true?: number;      // Theoretical velocity for phase B-C
  a_phase2?: number;    // Theoretical acceleration for phase B-C (explore)
  className?: string;
  hideControls?: boolean;
  onTimeChange?: (t: number, isRunning: boolean, isReset: boolean) => void;
  onPosChange?: (sB: number, sC: number) => void;
}

// Coordinate & Physical Simulation Constants
// Documented scale: 1 meter = 1000 px, 1 cm = 10 px, 1 mm = 1 px
const PX_PER_METER = 1000;
const VIEW_W = 600;
const VIEW_H = 1350;

const COL_X = 300;
const PULLEY_Y = 150;
const PULLEY_R = 60;
const STR_L_X = COL_X - PULLEY_R; // 240
const STR_R_X = COL_X + PULLEY_R; // 360

const M_W = 38;  // Width of main weights m1 and m2
const M_H = 44;  // Height of main weights m1 and m2
const M3_W = 62; // Width of slotted disks (m3, m4) - wider than ring aperture to catch on Ring B
const M3_H = 14; // Height of each slotted disk

const Y_A = 350; // Initial release level (Point A)
const Y_M1_INITIAL = 1150; // Initial resting level for m1 held by Clamp P

export interface AtwoodApparatusRef {
  startDrop: () => void;
  resetApparatus: () => void;
}

export const AtwoodApparatus = forwardRef<AtwoodApparatusRef, AtwoodApparatusProps>(({ 
  mode, 
  additionalMassConfig, 
  a_true, 
  v_true, 
  a_phase2 = 0,
  className = "",
  hideControls = false,
  onTimeChange,
  onPosChange
}, ref) => {
  const gradientIds = useMetalGradientIds("atwood");
  const svgRef = useRef<SVGSVGElement>(null);
  
  // High-performance DOM mutation refs (bypass React render loop for 60 FPS)
  const m1GroupRef = useRef<SVGGElement>(null);
  const m2GroupRef = useRef<SVGGElement>(null);
  const mTambahanGroupRef = useRef<SVGGElement>(null);
  const ropeLRef = useRef<SVGLineElement>(null);
  const ropeRRef = useRef<SVGLineElement>(null);
  
  // Instrument physical positions (in simulation pixels)
  const [posB, setPosB] = useState(mode === "GLB" ? Y_A + 200 : Y_A + 400); 
  const [posC, setPosC] = useState(Y_A + 600);
  const [draggingItem, setDraggingItem] = useState<"B" | "C" | null>(null);

  // Notify parent of initial pos
  useEffect(() => {
    if (onPosChange) onPosChange((posB - Y_A) / PX_PER_METER, (posC - Y_A) / PX_PER_METER);
  }, [posB, posC, onPosChange]);

  // Animation & Physics state
  const [isAnimating, setIsAnimating] = useState(false);
  const [clampRetracted, setClampRetracted] = useState(false);
  
  const [m2Y, setM2Y] = useState(Y_A);
  const [mTambahanY, setMTambahanY] = useState(Y_A); 
  const [m1Y, setM1Y] = useState(Y_M1_INITIAL);
  
  const animReqRef = useRef<number | null>(null);
  const animStartTimeRef = useRef<number | null>(null);

  // Manual & Photogate Stopwatch state
  const stopwatchValueRef = useRef(0);
  const stopwatchTextRef = useRef<HTMLDivElement>(null);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const isStopwatchRunningRef = useRef(false);
  const isAutoScrollingRef = useRef(false);
  const idealYRef = useRef<number | null>(null);
  const lastM2YRef = useRef(Y_A);
  const swStartTimeRef = useRef<number>(0);
  const swReqRef = useRef<number | null>(null);
  const passedBRef = useRef<boolean>(false);

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      if (animReqRef.current) cancelAnimationFrame(animReqRef.current);
      if (swReqRef.current) cancelAnimationFrame(swReqRef.current);
    };
  }, []);

  // --- AUTO-SCROLL CANCELLATION ---
  useEffect(() => {
    const cancelAutoScroll = () => {
      isAutoScrollingRef.current = false;
    };
    
    // Cancel tracking only if user manually scrolls with wheel or touch
    window.addEventListener("wheel", cancelAutoScroll, { passive: true });
    window.addEventListener("touchmove", cancelAutoScroll, { passive: true });
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", " ", "Spacebar"].includes(e.key)) {
        cancelAutoScroll();
      }
    };
    window.addEventListener("keydown", handleKeyDown, { passive: true });

    return () => {
      window.removeEventListener("wheel", cancelAutoScroll);
      window.removeEventListener("touchmove", cancelAutoScroll);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // --- DRAG LOGIC FOR RING B & STOP PLATE C ---
  const handlePointerDownB = (e: React.PointerEvent) => {
    if ((mode !== "GLBB" && mode !== "explore") || isAnimating || clampRetracted) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingItem("B");
  };

  const handlePointerDownC = (e: React.PointerEvent) => {
    if ((mode !== "GLB" && mode !== "explore") || isAnimating || clampRetracted) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingItem("C");
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingItem || !svgRef.current) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());

    if (draggingItem === "B" && (mode === "GLBB" || mode === "explore")) {
      let newY = svgP.y;
      const maxY = mode === "explore" ? posC - 50 : Y_M1_INITIAL - 50;
      newY = Math.max(Y_A + 100, Math.min(newY, maxY));
      setPosB(newY);
    } else if (draggingItem === "C" && (mode === "GLB" || mode === "explore")) {
      let newY = svgP.y;
      const minY = mode === "explore" ? posB + 50 : posB + 100;
      newY = Math.max(minY, Math.min(newY, Y_M1_INITIAL + 50));
      setPosC(newY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingItem) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setDraggingItem(null);
    }
  };

  // --- STOPWATCH LOGIC ---
  const startStopwatch = () => {
    if (isStopwatchRunningRef.current) return;
    setIsStopwatchRunning(true);
    isStopwatchRunningRef.current = true;
    swStartTimeRef.current = performance.now() - stopwatchValueRef.current * 1000;
    
    const updateSw = (time: number) => {
      const elapsed = (time - swStartTimeRef.current) / 1000;
      stopwatchValueRef.current = elapsed;
      if (stopwatchTextRef.current) {
        stopwatchTextRef.current.textContent = elapsed.toFixed(2);
      }
      swReqRef.current = requestAnimationFrame(updateSw);
    };
    swReqRef.current = requestAnimationFrame(updateSw);
  };

  const stopStopwatch = () => {
    setIsStopwatchRunning(false);
    isStopwatchRunningRef.current = false;
    if (swReqRef.current) {
      cancelAnimationFrame(swReqRef.current);
      swReqRef.current = null;
    }
  };

  const toggleStopwatch = () => {
    if (isStopwatchRunningRef.current) {
      stopStopwatch();
    } else {
      startStopwatch();
    }
  };

  const resetStopwatch = () => {
    setIsStopwatchRunning(false);
    isStopwatchRunningRef.current = false;
    stopwatchValueRef.current = 0;
    if (stopwatchTextRef.current) {
      stopwatchTextRef.current.textContent = "0.00";
    }
    if (swReqRef.current) cancelAnimationFrame(swReqRef.current);
  };

  // --- ANIMATION & PHYSICS ENGINE ---
  const startDrop = () => {
    if (isAnimating || clampRetracted) return;
    setIsAnimating(true);
    setClampRetracted(true);
    isAutoScrollingRef.current = true;
    
    // Target posisi vertikal m2 pada layar (~28% dari atas viewport, batas 80px - 260px)
    const targetViewportY = Math.max(80, Math.min(window.innerHeight * 0.28, 260));
    idealYRef.current = targetViewportY;

    // SCROLL LANGSUNG LAYAR: Langsung fokuskan layar ke posisi awal beban m2
    if (m2GroupRef.current) {
      const currentRect = m2GroupRef.current.getBoundingClientRect();
      const initialDiff = currentRect.top - targetViewportY;
      scrollAncestorBy(initialDiff, m2GroupRef.current);
    }
    
    lastM2YRef.current = Y_A;
    passedBRef.current = false;

    // Automatic photogate triggering
    if (mode === "GLBB") {
      resetStopwatch();
      setTimeout(startStopwatch, 50);
    } else if (mode === "GLB") {
      resetStopwatch();
    }
    
    if (onTimeChange) onTimeChange(0, true, true);

    const s_AB = (posB - Y_A) / PX_PER_METER;
    const t_AB = a_true > 0 ? calculateFallTime(s_AB, a_true, mode !== "explore") : Infinity;

    let t_BC = 0;
    let s_BC = 0;
    let v_anim = 0;

    if (mode === "GLB" && v_true) {
      s_BC = (posC - posB) / PX_PER_METER;
      t_BC = calculateGLBTime(s_BC, v_true, true);
      v_anim = s_BC / t_BC;
    } else if (mode === "GLBB") {
      s_BC = (Y_M1_INITIAL - posB) / PX_PER_METER;
      v_anim = Math.sqrt(2 * a_true * s_AB);
      t_BC = s_BC / v_anim;
    } else if (mode === "explore") {
      s_BC = (posC - posB) / PX_PER_METER;
      v_anim = Math.sqrt(2 * a_true * s_AB);
      if (a_phase2 === 0) {
        t_BC = v_anim > 0 ? s_BC / v_anim : Infinity;
      } else {
        const det = v_anim * v_anim + 2 * a_phase2 * s_BC;
        if (det < 0) t_BC = Infinity;
        else t_BC = (-v_anim + Math.sqrt(det)) / a_phase2;
      }
    }

    const a_anim = t_AB !== Infinity ? (2 * s_AB) / (t_AB * t_AB) : 0;
    const a2_anim = a_phase2;

    animStartTimeRef.current = null;

    const animate = (time: number) => {
      if (!animStartTimeRef.current) animStartTimeRef.current = time;
      const elapsed = (time - animStartTimeRef.current) / 1000;
      
      if (onTimeChange) onTimeChange(elapsed, true, false);

      let currentM2Y = m2Y;
      let currentM1Y = m1Y;
      let currentMTambahanY = mTambahanY;

      if (elapsed <= t_AB) {
        // Phase 1: GLBB (Accelerated drop from A to B)
        const s = 0.5 * a_anim * elapsed * elapsed;
        const yDrop = s * PX_PER_METER;
        
        currentM2Y = Y_A + yDrop;
        currentMTambahanY = Y_A + yDrop;
        currentM1Y = Y_M1_INITIAL - yDrop;

        animReqRef.current = requestAnimationFrame(animate);
      } else if (elapsed <= t_AB + t_BC) {
        // Photogate B trigger
        if (!passedBRef.current) {
          passedBRef.current = true;
          if (mode === "GLB") {
            startStopwatch();
          } else if (mode === "GLBB") {
            stopStopwatch();
          }
        }

        // Phase 2: Constant speed GLB (m3 caught on Ring B)
        const t2 = elapsed - t_AB;
        let s2 = v_anim * t2;
        if (mode === "explore") {
          s2 += 0.5 * a2_anim * t2 * t2;
        }
        const yDrop = (s_AB + s2) * PX_PER_METER;

        currentM2Y = Y_A + yDrop;
        currentMTambahanY = posB; // Additional weights caught exactly on Ring B
        currentM1Y = Y_M1_INITIAL - yDrop;
        
        animReqRef.current = requestAnimationFrame(animate);
      } else {
        // Animation finished
        if (mode === "GLB") {
          stopStopwatch();
        }
        if (onTimeChange) onTimeChange(t_AB + t_BC, false, false);
        
        const finalDrop = (s_AB + s_BC) * PX_PER_METER;
        currentM2Y = Y_A + finalDrop;
        currentM1Y = Y_M1_INITIAL - finalDrop;
        currentMTambahanY = posB;
        
        setM2Y(currentM2Y);
        setM1Y(currentM1Y);
        setMTambahanY(currentMTambahanY);
        
        setIsAnimating(false);
      }

      // Direct DOM mutations: zero React state re-renders for steady 60 FPS
      if (m2GroupRef.current) m2GroupRef.current.setAttribute("transform", `translate(0, ${currentM2Y - Y_A})`);
      if (m1GroupRef.current) m1GroupRef.current.setAttribute("transform", `translate(0, ${currentM1Y - Y_M1_INITIAL})`);
      if (mTambahanGroupRef.current) mTambahanGroupRef.current.setAttribute("transform", `translate(0, ${currentMTambahanY - Y_A})`);
      
      if (ropeLRef.current) ropeLRef.current.setAttribute("y2", String(currentM2Y));
      if (ropeRRef.current) ropeRRef.current.setAttribute("y2", String(currentM1Y));

      // Camera tracking shot: ikuti gerakan beban m2 secara mulus
      if (isAutoScrollingRef.current && m2GroupRef.current && idealYRef.current !== null) {
        const currentRect = m2GroupRef.current.getBoundingClientRect();
        const diff = currentRect.top - idealYRef.current;
        if (Math.abs(diff) > 0.5) { 
          scrollAncestorBy(diff, m2GroupRef.current);
        }
      }
      
      lastM2YRef.current = currentM2Y;
    };

    animReqRef.current = requestAnimationFrame(animate);
  };

  const resetApparatus = () => {
    setIsAnimating(false);
    setClampRetracted(false);
    isAutoScrollingRef.current = false;
    
    setM2Y(Y_A);
    setMTambahanY(Y_A);
    setM1Y(Y_M1_INITIAL);
    
    if (m2GroupRef.current) m2GroupRef.current.setAttribute("transform", "translate(0, 0)");
    if (m1GroupRef.current) m1GroupRef.current.setAttribute("transform", "translate(0, 0)");
    if (mTambahanGroupRef.current) mTambahanGroupRef.current.setAttribute("transform", "translate(0, 0)");
    if (ropeLRef.current) ropeLRef.current.setAttribute("y2", String(Y_A));
    if (ropeRRef.current) ropeRRef.current.setAttribute("y2", String(Y_M1_INITIAL));

    if (animReqRef.current) cancelAnimationFrame(animReqRef.current);

    // Scroll kembali untuk memfokuskan m2 di posisi awal (Point A)
    if (m2GroupRef.current) {
      const targetViewportY = Math.max(80, Math.min(window.innerHeight * 0.28, 260));
      const currentRect = m2GroupRef.current.getBoundingClientRect();
      const diff = currentRect.top - targetViewportY;
      scrollAncestorBy(diff, m2GroupRef.current);
    }
  };

  useImperativeHandle(ref, () => ({
    startDrop,
    resetApparatus
  }));

  // --- RENDER HIGH-CONTRAST MILLIMETER SCALE TICKS ---
  // Scale zero is aligned with Point A (Y_A = 350)
  const scaleTicks = useMemo(() => {
    const ticks: React.ReactNode[] = [];
    const minMm = 0;
    const maxMm = 1050; // 0 cm to 105 cm

    for (let mm = minMm; mm <= maxMm; mm++) {
      const y = 200 + mm;
      const isTenCm = mm % 100 === 0;
      const isFiveCm = !isTenCm && mm % 50 === 0;
      const isCm = !isTenCm && !isFiveCm && mm % 10 === 0;

      if (!isTenCm && !isFiveCm && !isCm && mm % 5 !== 0) continue; // Sample every 5mm for clean SVG DOM

      const tickLen = isTenCm ? 22 : isFiveCm ? 15 : isCm ? 10 : 6;
      const sw = isTenCm ? 1.8 : isFiveCm ? 1.4 : 1;
      const color = isTenCm 
        ? SCIENTIFIC_THEME.typography.scaleTickMajor 
        : isFiveCm 
          ? "#cbd5e1" 
          : SCIENTIFIC_THEME.typography.scaleTick;

      ticks.push(
        <line 
          key={mm} 
          x1={0} 
          y1={y} 
          x2={tickLen} 
          y2={y} 
          stroke={color} 
          strokeWidth={sw} 
        />
      );

      if (isTenCm) {
        const valCm = (y - Y_A) / 10;
        ticks.push(
          <text 
            key={`lbl-${mm}`} 
            x={-7} 
            y={y + 4.5} 
            fontSize="12" 
            fontFamily={SCIENTIFIC_THEME.typography.fontMono} 
            fill={valCm === 0 ? SCIENTIFIC_THEME.accents.cyan : SCIENTIFIC_THEME.typography.scaleTextMajor} 
            textAnchor="end"
            fontWeight={valCm === 0 ? "bold" : "600"}
          >
            {valCm}
          </text>
        );
      }
    }
    return ticks;
  }, []);

  return (
    <div 
      className={`relative w-full rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-slate-950 via-[#0a0f1d] to-slate-950 shadow-[0_12px_40px_rgba(0,0,0,0.7)] flex flex-col md:flex-row overflow-hidden ${className}`}
      style={{ fontFamily: SCIENTIFIC_THEME.typography.fontMono }}
    >
      {/* Ambient static lighting glows */}
      <div 
        className="absolute top-0 left-1/4 w-80 h-24 blur-3xl pointer-events-none opacity-40"
        style={{ background: SCIENTIFIC_THEME.glowPrimary }}
      />
      <div 
        className="absolute top-0 right-1/4 w-80 h-24 blur-3xl pointer-events-none opacity-30"
        style={{ background: SCIENTIFIC_THEME.glowSecondary }}
      />

      {/* ── LEFT SECTION: APPARATUS SVG SIMULATION ── */}
      <div className="flex-1 w-full min-h-0 flex flex-col items-center justify-center p-2 sm:p-4 touch-none select-none relative">
        
        {/* Top Header Information Ribbon */}
        <div className="w-full max-w-[560px] flex items-center justify-between pb-2 mb-1 border-b border-slate-800/80 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
            <span className="font-bold tracking-wider text-cyan-300 uppercase">
              PESAWAT ATWOOD
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 font-bold">
              {mode.toUpperCase()}
            </span>
            <span className="px-2 py-0.5 rounded border border-slate-800 bg-slate-900/60 text-slate-300">
              {additionalMassConfig === "m3_m4" 
                ? "m3 + m4 (+20g)" 
                : additionalMassConfig === "m3" 
                  ? "m3 (+10g)" 
                  : "Tanpa Beban Tambahan"}
            </span>
          </div>
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="w-full max-w-full h-auto max-h-[85vh] md:max-h-full drop-shadow-2xl"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
        >
          {/* Unique SVG Metal & Chassis Gradients */}
          <SvgMetalGradients ids={gradientIds} />

          {/* Precision Lab Coordinate Grid Background */}
          <SvgGridBackground width={VIEW_W} height={VIEW_H} gridSize={30} opacity={0.3} />

          {/* ── 1. STRUCTURAL MAST & BASE STAND ── */}
          {/* Heavy Lab Base Stand (Tripod / Baseplate) */}
          <g>
            {/* Leveling Foot Left */}
            <circle cx={COL_X - 110} cy="1285" r="9" fill={metalsDarker(gradientIds.steel)} stroke="#0f172a" strokeWidth="2" />
            <rect x={COL_X - 113} y="1274" width="6" height="12" fill="#64748b" />
            {/* Leveling Foot Right */}
            <circle cx={COL_X + 110} cy="1285" r="9" fill={metalsDarker(gradientIds.steel)} stroke="#0f172a" strokeWidth="2" />
            <rect x={COL_X + 107} y="1274" width="6" height="12" fill="#64748b" />
            {/* Main Base Bar */}
            <rect 
              x={COL_X - 125} 
              y="1265" 
              width="250" 
              height="16" 
              rx="3" 
              fill={`url(#${gradientIds.chassisDark})`} 
              stroke="#334155" 
              strokeWidth="1.5" 
            />
            {/* Center Mast Flange Collar */}
            <rect x={COL_X - 30} y="1255" width="60" height="12" fill={`url(#${gradientIds.steel})`} stroke="#475569" strokeWidth="1" rx="1" />
          </g>

          {/* Vertical Precision Extruded Column (Main Mast) */}
          <rect 
            x={COL_X - 22} 
            y="90" 
            width="44" 
            height="1170" 
            rx="2"
            fill={`url(#${gradientIds.chassisDark})`} 
            stroke="#1e293b" 
            strokeWidth="1.5" 
          />
          {/* Inner Steel Rail */}
          <rect 
            x={COL_X - 16} 
            y="95" 
            width="32" 
            height="1160" 
            fill={`url(#${gradientIds.steelVertical})`} 
            opacity="0.9"
          />

          {/* Engraved Millimeter Scale Ruler along the column */}
          <g transform={`translate(${COL_X - 16}, 0)`}>
            {scaleTicks}
          </g>
          {/* Scale Unit Badge (cm) */}
          <text 
            x={COL_X - 24} 
            y="215" 
            fontSize="10" 
            fontFamily={SCIENTIFIC_THEME.typography.fontMono} 
            fill={SCIENTIFIC_THEME.typography.labelMuted} 
            textAnchor="end"
            fontWeight="bold"
          >
            (cm)
          </text>

          {/* ── 2. PULLEY ASSEMBLY & STRINGS ── */}
          {/* Top Pulley Mounting Yoke / Bracket */}
          <path 
            d={`M ${COL_X - 16} 95 L ${COL_X - 16} ${PULLEY_Y} L ${COL_X - 6} ${PULLEY_Y} L ${COL_X - 6} 95 Z`} 
            fill={`url(#${gradientIds.steel})`} 
            stroke="#1e293b" 
            strokeWidth="1" 
          />
          <path 
            d={`M ${COL_X + 16} 95 L ${COL_X + 16} ${PULLEY_Y} L ${COL_X + 6} ${PULLEY_Y} L ${COL_X + 6} 95 Z`} 
            fill={`url(#${gradientIds.steel})`} 
            stroke="#1e293b" 
            strokeWidth="1" 
          />

          {/* Flexible High-Strength Cord (Left, Right, Arc) - Dynamic elements without filters */}
          <line 
            ref={ropeLRef} 
            x1={STR_L_X} 
            y1={PULLEY_Y} 
            x2={STR_L_X} 
            y2={m2Y} 
            stroke="#e2e8f0" 
            strokeWidth="2.5" 
            strokeLinecap="round"
          />
          <line 
            ref={ropeRRef} 
            x1={STR_R_X} 
            y1={PULLEY_Y} 
            x2={STR_R_X} 
            y2={m1Y} 
            stroke="#e2e8f0" 
            strokeWidth="2.5" 
            strokeLinecap="round"
          />
          <path 
            d={`M ${STR_L_X} ${PULLEY_Y} A ${PULLEY_R} ${PULLEY_R} 0 0 1 ${STR_R_X} ${PULLEY_Y}`} 
            fill="none" 
            stroke="#e2e8f0" 
            strokeWidth="2.5" 
          />

          {/* Precision Pulley Component */}
          <SvgPulley 
            cx={COL_X} 
            cy={PULLEY_Y} 
            radius={PULLEY_R} 
            rimFillId={gradientIds.pulleyRim}
            hubFillId={gradientIds.pulleyHub}
            showSpokes={true}
            showRadiusLine={true}
          />

          {/* ── 3. DATUM LEVEL A (INITIAL RELEASE LEVEL) ── */}
          <g>
            <line 
              x1={STR_L_X - 65} 
              y1={Y_A} 
              x2={STR_L_X + 25} 
              y2={Y_A} 
              stroke={SCIENTIFIC_THEME.accents.cyan} 
              strokeWidth="1.5" 
              strokeDasharray="4 4" 
              opacity="0.8"
            />
            <SvgCalloutBadge
              label="A"
              subLabel="0.0 cm"
              targetX={STR_L_X - 25}
              targetY={Y_A}
              badgeX={STR_L_X - 90}
              badgeY={Y_A}
              color={SCIENTIFIC_THEME.accents.cyan}
              size="md"
            />
          </g>

          {/* ── 4. CINCIN PENAHAN / GERBANG CAHAYA B (RING B) ── */}
          <g 
            transform={`translate(${STR_L_X}, ${posB})`} 
            onPointerDown={handlePointerDownB} 
            cursor={mode === "GLBB" && !isAnimating && !clampRetracted ? "ns-resize" : "default"}
          >
            {/* Mounting Clamp on the Column */}
            <rect 
              x="38" 
              y="-10" 
              width="24" 
              height="20" 
              rx="2"
              fill={`url(#${gradientIds.chassisDark})`} 
              stroke="#64748b" 
              strokeWidth="1" 
            />
            {/* Clamp Clamping Bolt */}
            <circle cx="50" cy="0" r="4" fill={`url(#${gradientIds.brass})`} stroke="#78350f" strokeWidth="1" />

            {/* Support Arm Connecting to Left Ring */}
            <rect x="-48" y="-4" width="90" height="8" rx="1" fill={`url(#${gradientIds.aluminum})`} stroke="#334155" strokeWidth="1" />

            {/* Ring B Aperture: Left and Right Catches */}
            {/* Left Arm Catch Pad */}
            <rect 
              x="-48" 
              y="-6" 
              width="24" 
              height="12" 
              rx="2" 
              fill={`url(#${gradientIds.steel})`} 
              stroke="#1e293b" 
              strokeWidth="1" 
            />
            {/* Right Arm Catch Pad */}
            <rect 
              x="24" 
              y="-6" 
              width="24" 
              height="12" 
              rx="2" 
              fill={`url(#${gradientIds.steel})`} 
              stroke="#1e293b" 
              strokeWidth="1" 
            />

            {/* Optical Photogate Beam across the aperture (48px gap, m2 passes, m3 catches) */}
            <line 
              x1="-24" 
              y1="0" 
              x2="24" 
              y2="0" 
              stroke={SCIENTIFIC_THEME.accents.red} 
              strokeWidth="1.2" 
              strokeDasharray="3 2" 
              opacity="0.8" 
            />
            {/* IR Emitter LED Left */}
            <circle cx="-24" cy="0" r="2.5" fill="#f43f5e" />
            {/* IR Receiver Detector Right */}
            <circle cx="24" cy="0" r="2.5" fill="#10b981" />

            {/* Draggable Grip Indicator (in GLBB or Explore) */}
            {(mode === "GLBB" || mode === "explore") && !isAnimating && !clampRetracted && (
              <g transform="translate(0, -18)">
                <rect x="-14" y="-8" width="28" height="12" rx="3" fill="rgba(15, 23, 42, 0.85)" stroke="#f43f5e" strokeWidth="1" />
                <path d="M -6 -2 L 0 -6 L 6 -2 M -6 2 L 0 6 L 6 2" stroke="#f43f5e" strokeWidth="1.2" fill="none" />
              </g>
            )}

            {/* Callout Badge for Ring B */}
            <SvgCalloutBadge
              label="B"
              subLabel={`${((posB - Y_A) / 10).toFixed(1)} cm`}
              targetX={-48}
              targetY={0}
              badgeX={-90}
              badgeY={0}
              color={SCIENTIFIC_THEME.accents.red}
              size="md"
            />
          </g>

          {/* ── 5. LANDASAN PENGHENTI / GERBANG CAHAYA C (PLATE C) ── */}
          {(mode === "GLB" || mode === "explore") && (
            <g 
              transform={`translate(${STR_L_X}, ${posC})`} 
              onPointerDown={handlePointerDownC}
              cursor={!isAnimating && !clampRetracted ? "ns-resize" : "default"}
            >
              {/* Mounting Clamp on the Column */}
              <rect 
                x="38" 
                y="-10" 
                width="24" 
                height="20" 
                rx="2"
                fill={`url(#${gradientIds.chassisDark})`} 
                stroke="#64748b" 
                strokeWidth="1" 
              />
              <circle cx="50" cy="0" r="4" fill={`url(#${gradientIds.brass})`} stroke="#78350f" strokeWidth="1" />

              {/* Stop Plate Extension Bar */}
              <rect x="-48" y="-5" width="90" height="10" rx="1" fill={`url(#${gradientIds.aluminum})`} stroke="#334155" strokeWidth="1" />

              {/* Solid Heavy Cushioned Landing Plate */}
              <rect 
                x="-48" 
                y="-7" 
                width="96" 
                height="14" 
                rx="2" 
                fill={`url(#${gradientIds.steel})`} 
                stroke="#0f172a" 
                strokeWidth="1.2" 
              />
              {/* Top Rubber Cushioning Pad */}
              <rect x="-46" y="-7" width="92" height="3" fill="#0f172a" rx="1" />

              {/* Photogate Detector Indicator */}
              <circle cx="-42" cy="0" r="2.5" fill="#10b981" />
              <circle cx="42" cy="0" r="2.5" fill="#10b981" />

              {/* Draggable Grip Indicator */}
              {!isAnimating && !clampRetracted && (
                <g transform="translate(0, -18)">
                  <rect x="-14" y="-8" width="28" height="12" rx="3" fill="rgba(15, 23, 42, 0.85)" stroke="#10b981" strokeWidth="1" />
                  <path d="M -6 -2 L 0 -6 L 6 -2 M -6 2 L 0 6 L 6 2" stroke="#10b981" strokeWidth="1.2" fill="none" />
                </g>
              )}

              {/* Callout Badge for Plate C */}
              <SvgCalloutBadge
                label="C"
                subLabel={`${((posC - posB) / 10).toFixed(1)} cm`}
                targetX={-48}
                targetY={0}
                badgeX={-90}
                badgeY={0}
                color={SCIENTIFIC_THEME.accents.emerald}
                size="md"
              />
            </g>
          )}

          {/* ── 6. MEKANISME PELEPAS KLEM P (SOLENOID CLAMP P) ── */}
          <g transform={`translate(${STR_R_X}, ${Y_M1_INITIAL})`}>
            {/* Reference Alignment Line */}
            <line 
              x1="-40" 
              y1="0" 
              x2="110" 
              y2="0" 
              stroke={SCIENTIFIC_THEME.accents.amber} 
              strokeWidth="1.2" 
              strokeDasharray="4 4" 
              opacity="0.6" 
            />

            {/* Solenoid Body on Mast */}
            <rect x="25" y="-14" width="30" height="28" rx="2" fill={`url(#${gradientIds.chassisDark})`} stroke="#475569" strokeWidth="1.2" />
            
            {/* Solenoid Retractable Plunger Shaft */}
            <g 
              transform={`translate(${clampRetracted ? 38 : 12}, 0)`}
              style={{ transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            >
              {/* Plunger Arm */}
              <line x1="-18" y1="0" x2="8" y2="0" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
              {/* Plunger Catch Jaw Head */}
              <path 
                d="M -18 -8 L -4 0 L -18 8 Z" 
                fill={`url(#${gradientIds.brass})`} 
                stroke="#78350f" 
                strokeWidth="1" 
              />
            </g>

            {/* Armed / Released Status LED on Clamp */}
            <circle cx="48" cy="-6" r="3" fill={clampRetracted ? "#ef4444" : "#10b981"} />

            {/* Callout Badge for Clamp P */}
            <SvgCalloutBadge
              label="P"
              subLabel="Klem"
              targetX={30}
              targetY={0}
              badgeX={90}
              badgeY={0}
              color={SCIENTIFIC_THEME.accents.amber}
              size="md"
            />
          </g>

          {/* ── 7. MOVING MASSES (ZERO FILTERS FOR MAXIMUM 60 FPS) ── */}
          {/* MASSA m1 (Right Column, starts at bottom held by Clamp P) */}
          <g ref={m1GroupRef}>
            {/* Top Wire Eyelet */}
            <ellipse cx={STR_R_X} cy={Y_M1_INITIAL - 6} rx="4" ry="6" fill="none" stroke="#cbd5e1" strokeWidth="2" />
            <rect x={STR_R_X - 4} y={Y_M1_INITIAL - 2} width="8" height="4" fill="#64748b" rx="1" />
            {/* Main Mass Cylinder Body */}
            <rect 
              x={STR_R_X - M_W / 2} 
              y={Y_M1_INITIAL} 
              width={M_W} 
              height={M_H} 
              rx="3" 
              fill={`url(#${gradientIds.massBlockA})`} 
              stroke="#475569" 
              strokeWidth="1.5" 
            />
            {/* Chamfer Highlights */}
            <line x1={STR_R_X - M_W / 2 + 2} y1={Y_M1_INITIAL + 2} x2={STR_R_X + M_W / 2 - 2} y2={Y_M1_INITIAL + 2} stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            <line x1={STR_R_X - M_W / 2 + 2} y1={Y_M1_INITIAL + M_H - 2} x2={STR_R_X + M_W / 2 - 2} y2={Y_M1_INITIAL + M_H - 2} stroke="rgba(0,0,0,0.5)" strokeWidth="1" />
            {/* Labels */}
            <text 
              x={STR_R_X} 
              y={Y_M1_INITIAL + 22} 
              textAnchor="middle" 
              fill="#ffffff" 
              fontSize="12" 
              fontWeight="bold" 
              fontFamily={SCIENTIFIC_THEME.typography.fontMono}
            >
              m₁
            </text>
            <text 
              x={STR_R_X} 
              y={Y_M1_INITIAL + 34} 
              textAnchor="middle" 
              fill="rgba(255,255,255,0.75)" 
              fontSize="9" 
              fontFamily={SCIENTIFIC_THEME.typography.fontMono}
            >
              100g
            </text>
          </g>

          {/* MASSA m2 (Left Column, starts at top at Point A) */}
          <g ref={m2GroupRef}>
            {/* Top Wire Eyelet */}
            <ellipse cx={STR_L_X} cy={Y_A - 6} rx="4" ry="6" fill="none" stroke="#cbd5e1" strokeWidth="2" />
            <rect x={STR_L_X - 4} y={Y_A - 2} width="8" height="4" fill="#64748b" rx="1" />
            {/* Main Mass Cylinder Body */}
            <rect 
              x={STR_L_X - M_W / 2} 
              y={Y_A} 
              width={M_W} 
              height={M_H} 
              rx="3" 
              fill={`url(#${gradientIds.massBlockA})`} 
              stroke="#475569" 
              strokeWidth="1.5" 
            />
            {/* Chamfer Highlights */}
            <line x1={STR_L_X - M_W / 2 + 2} y1={Y_A + 2} x2={STR_L_X + M_W / 2 - 2} y2={Y_A + 2} stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            <line x1={STR_L_X - M_W / 2 + 2} y1={Y_A + M_H - 2} x2={STR_L_X + M_W / 2 - 2} y2={Y_A + M_H - 2} stroke="rgba(0,0,0,0.5)" strokeWidth="1" />
            {/* Labels */}
            <text 
              x={STR_L_X} 
              y={Y_A + 22} 
              textAnchor="middle" 
              fill="#ffffff" 
              fontSize="12" 
              fontWeight="bold" 
              fontFamily={SCIENTIFIC_THEME.typography.fontMono}
            >
              m₂
            </text>
            <text 
              x={STR_L_X} 
              y={Y_A + 34} 
              textAnchor="middle" 
              fill="rgba(255,255,255,0.75)" 
              fontSize="9" 
              fontFamily={SCIENTIFIC_THEME.typography.fontMono}
            >
              100g
            </text>
          </g>

          {/* MASSA TAMBAHAN m3 & m4 (Stacked slotted weights on top of m2) */}
          <g ref={mTambahanGroupRef}>
            {/* Slotted Disk m3 */}
            <rect 
              x={STR_L_X - M3_W / 2} 
              y={Y_A - M3_H} 
              width={M3_W} 
              height={M3_H} 
              rx="2" 
              fill={`url(#${gradientIds.slottedDisk})`} 
              stroke="#991b1b" 
              strokeWidth="1" 
            />
            {/* Side Radial Slot Cutout (Real slotted mass feature) */}
            <rect 
              x={STR_L_X + M3_W / 2 - 6} 
              y={Y_A - M3_H + 2} 
              width="6" 
              height={M3_H - 4} 
              fill="#0f172a" 
              opacity="0.8" 
            />
            <text 
              x={STR_L_X - 2} 
              y={Y_A - 3.5} 
              textAnchor="middle" 
              fill="#ffffff" 
              fontSize="9.5" 
              fontWeight="bold" 
              fontFamily={SCIENTIFIC_THEME.typography.fontMono}
            >
              m₃ (10g)
            </text>

            {/* Slotted Disk m4 (rendered when configured) */}
            {additionalMassConfig === "m3_m4" && (
              <g>
                <rect 
                  x={STR_L_X - M3_W / 2} 
                  y={Y_A - M3_H * 2} 
                  width={M3_W} 
                  height={M3_H} 
                  rx="2" 
                  fill={`url(#${gradientIds.massBlockB})`} 
                  stroke="#92400e" 
                  strokeWidth="1" 
                />
                <rect 
                  x={STR_L_X + M3_W / 2 - 6} 
                  y={Y_A - M3_H * 2 + 2} 
                  width="6" 
                  height={M3_H - 4} 
                  fill="#0f172a" 
                  opacity="0.8" 
                />
                <text 
                  x={STR_L_X - 2} 
                  y={Y_A - M3_H - 3.5} 
                  textAnchor="middle" 
                  fill="#ffffff" 
                  fontSize="9.5" 
                  fontWeight="bold" 
                  fontFamily={SCIENTIFIC_THEME.typography.fontMono}
                >
                  m₄ (10g)
                </text>
              </g>
            )}
          </g>

        </svg>
      </div>

      {/* ── RIGHT SECTION: SCIENTIFIC CONTROL PANEL & PHOTOGATE TIMER ── */}
      {!hideControls && (
        <div className="w-full md:w-80 bg-slate-900/90 border-t md:border-t-0 md:border-l border-cyan-500/20 p-5 sm:p-6 flex flex-col justify-between shrink-0 relative shadow-inner z-10 backdrop-blur-md">
          
          {/* Top Panel: Apparatus Operations */}
          <div className="mb-6">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#06b6d4]" />
              <h3 className="font-bold text-sm tracking-wider text-cyan-300 uppercase">
                Panel Kontrol
              </h3>
            </div>

            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              {mode === "GLBB" 
                ? "Atur jarak A-B dengan menggeser cincin B. Tombol 'LEPAS KLEM (P)' melepaskan beban dan secara otomatis mencatat waktu tempuh melalui sensor gerbang cahaya."
                : "Jarak A-B tetap (20.0 cm). Atur posisi landasan C. Stopwatch akan secara otomatis di-trigger oleh sensor gerbang cahaya B (START) dan C (STOP)."}
            </p>
            
            {/* Actuation Buttons */}
            <div className="flex flex-col gap-2.5">
              <button 
                onClick={startDrop} 
                disabled={clampRetracted || isAnimating} 
                className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs tracking-wider rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.35)] disabled:opacity-40 disabled:cursor-not-allowed transition-all uppercase flex items-center justify-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                LEPAS KLEM (P)
              </button>
              <button 
                onClick={resetApparatus} 
                disabled={isAnimating} 
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs tracking-wider rounded-lg border border-slate-700 disabled:opacity-40 transition-colors uppercase"
              >
                RESET ALAT
              </button>
            </div>
          </div>

          {/* Bottom Panel: Digital Photogate Timer / Counter Display */}
          <div className="mt-4">
            <div className="bg-slate-950 p-4 sm:p-5 rounded-xl border border-cyan-500/30 shadow-[0_4px_25px_rgba(0,0,0,0.8)] flex flex-col items-center relative overflow-hidden">
              {/* Subtle status glow behind digits */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{ 
                  background: isStopwatchRunning 
                    ? "radial-gradient(circle at center, #ef4444 0%, transparent 70%)" 
                    : "radial-gradient(circle at center, #10b981 0%, transparent 70%)" 
                }} 
              />

              {/* Timer Header & LED indicator */}
              <div className="w-full mb-3 flex justify-between items-center text-slate-400 text-[10px] font-bold tracking-widest uppercase">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isStopwatchRunning ? "bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" : "bg-emerald-500 shadow-[0_0_8px_#10b981]"}`} />
                  DIGITAL COUNTER
                </span>
                <span className="text-slate-500 font-mono text-[9px]">SISTEM GERBANG CAHAYA</span>
              </div>
              
              {/* Digital 7-Segment style LED readout */}
              <div className="w-full bg-black/90 px-4 py-3.5 rounded-lg border border-slate-800 shadow-inner flex items-baseline justify-center gap-2">
                <span 
                  ref={stopwatchTextRef}
                  className="font-mono text-4xl sm:text-5xl font-bold tracking-widest text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.6)]"
                >
                  0.00
                </span>
                <span className="text-xs font-mono font-bold text-emerald-500/80">s</span>
              </div>
              
              {/* Manual Control Overrides */}
              <div className="flex gap-2 mt-4 w-full">
                <button 
                  onClick={toggleStopwatch} 
                  className={`flex-1 py-2 font-bold text-xs tracking-wider rounded-md shadow-md transition-colors uppercase ${
                    isStopwatchRunning 
                      ? "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)]" 
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  }`}
                >
                  {isStopwatchRunning ? "STOP" : "START"}
                </button>
                <button 
                  onClick={resetStopwatch} 
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs tracking-wider rounded-md border border-slate-700 transition-colors uppercase"
                >
                  RESET
                </button>
              </div>
              
              {/* Photogate explanation */}
              <p className="text-slate-500 text-[10px] mt-3.5 text-center leading-tight">
                {mode === "GLBB"
                  ? "Sistem Gerbang Cahaya: Otomatis START saat klem (P) lepas, otomatis STOP saat beban mencapai cincin (B)."
                  : "Sistem Gerbang Cahaya: Otomatis START saat melewati cincin (B), otomatis STOP saat menyentuh landasan (C)."
                }
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
});

AtwoodApparatus.displayName = "AtwoodApparatus";

function metalsDarker(id: string) {
  return id ? `url(#${id})` : "#334155";
}

/**
 * Robust scroll utility that scrolls ancestor container (if overflow-y-auto exists)
 * or main window, ensuring camera tracking works seamlessly in nested layouts.
 */
function scrollAncestorBy(diff: number, el: Element | null) {
  if (typeof window === "undefined" || Math.abs(diff) < 0.5) return;
  
  let remainingDiff = diff;
  
  // 1. Check scrollable ancestor elements from innermost to outermost
  let curr = el?.parentElement;
  while (curr && curr !== document.body && curr !== document.documentElement) {
    const style = window.getComputedStyle(curr);
    const overflowY = style.overflowY;
    const canScrollY = (overflowY === "auto" || overflowY === "scroll") && curr.scrollHeight > curr.clientHeight;
    if (canScrollY) {
      const prev = curr.scrollTop;
      curr.scrollTop += remainingDiff;
      const scrolledAmount = curr.scrollTop - prev;
      remainingDiff -= scrolledAmount;
      if (Math.abs(remainingDiff) < 0.5) {
        return;
      }
    }
    curr = curr.parentElement;
  }
  
  // 2. Any remaining diff is scrolled on window
  if (Math.abs(remainingDiff) >= 0.5) {
    window.scrollBy({ top: remainingDiff, behavior: "instant" });
  }
}

