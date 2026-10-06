"use client";

import React, { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import { calculateFallTime, calculateGLBTime } from "@/physics/atwood";

interface AtwoodApparatusProps {
  mode: "GLBB" | "GLB" | "explore";
  additionalMassConfig: "m3" | "m3_m4" | "none";
  a_true: number;       // Percepatan teoretis untuk fase A-B
  v_true?: number;      // Kecepatan teoretis awal untuk fase B-C
  a_phase2?: number;    // Percepatan teoretis untuk fase B-C (explore)
  className?: string;
  hideControls?: boolean;
  onTimeChange?: (t: number, isRunning: boolean, isReset: boolean) => void;
  onPosChange?: (sB: number, sC: number) => void;
}

// Konstanta Dimensi Visual & Konversi
const PX_PER_METER = 1000; // 1 meter = 1000 px, 1 cm = 10 px
const VIEW_W = 600;
const VIEW_H = 1350;

const COL_X = 300;
const PULLEY_Y = 150;
const PULLEY_R = 60;
const STR_L_X = COL_X - PULLEY_R; // 240
const STR_R_X = COL_X + PULLEY_R; // 360

const M_W = 40; // Lebar massa m1 dan m2
const M_H = 40; // Tinggi massa m1 dan m2
const M3_W = 60; // Lebar massa tambahan (m3, m4), lebih lebar agar tersangkut
const M3_H = 15; // Tinggi setiap blok massa tambahan

const Y_A = 350; // Posisi dasar m2 di titik A
const Y_M1_INITIAL = 1150; // Posisi dasar m1 awal (di bawah)

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
  const svgRef = useRef<SVGSVGElement>(null);
  
  const m1GroupRef = useRef<SVGGElement>(null);
  const m2GroupRef = useRef<SVGGElement>(null);
  const mTambahanGroupRef = useRef<SVGGElement>(null);
  const ropeLRef = useRef<SVGLineElement>(null);
  const ropeRRef = useRef<SVGLineElement>(null);
  
  // Posisi instrumen (dalam pixel)
  const [posB, setPosB] = useState(mode === "GLB" ? Y_A + 200 : Y_A + 400); 
  const [posC, setPosC] = useState(Y_A + 600);
  const [draggingItem, setDraggingItem] = useState<"B" | "C" | null>(null);

  // Notify parent of initial pos
  useEffect(() => {
    if (onPosChange) onPosChange((posB - Y_A)/PX_PER_METER, (posC - Y_A)/PX_PER_METER);
  }, [posB, posC, onPosChange]);

  // State Animasi & Fisika
  const [isAnimating, setIsAnimating] = useState(false);
  const [clampRetracted, setClampRetracted] = useState(false);
  
  const [m2Y, setM2Y] = useState(Y_A);
  // Y posisi dasar m3 (dan m4 jika ada) bertumpuk
  const [mTambahanY, setMTambahanY] = useState(Y_A); 
  const [m1Y, setM1Y] = useState(Y_M1_INITIAL);
  
  const animReqRef = useRef<number | null>(null);
  const animStartTimeRef = useRef<number | null>(null);

  // State Stopwatch Manual
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

  useEffect(() => {
    return () => {
      if (animReqRef.current) cancelAnimationFrame(animReqRef.current);
      if (swReqRef.current) cancelAnimationFrame(swReqRef.current);
    };
  }, []);

  // --- LOGIKA PEMBATALAN AUTO-SCROLL ---
  useEffect(() => {
    const cancelAutoScroll = () => {
      isAutoScrollingRef.current = false;
    };
    
    // Batal jika user menggulir manual
    window.addEventListener("wheel", cancelAutoScroll, { passive: true });
    window.addEventListener("touchmove", cancelAutoScroll, { passive: true });
    window.addEventListener("mousedown", cancelAutoScroll, { passive: true });
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", " ", "Spacebar"].includes(e.key)) {
        cancelAutoScroll();
      }
    };
    window.addEventListener("keydown", handleKeyDown, { passive: true });

    return () => {
      window.removeEventListener("wheel", cancelAutoScroll);
      window.removeEventListener("touchmove", cancelAutoScroll);
      window.removeEventListener("mousedown", cancelAutoScroll);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // --- LOGIKA DRAG CINCIN B DAN LANDASAN C ---
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

  // --- LOGIKA STOPWATCH MANUAL ---
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

  // --- LOGIKA ANIMASI ALAT ---
  const startDrop = () => {
    if (isAnimating || clampRetracted) return;
    setIsAnimating(true);
    setClampRetracted(true);
    isAutoScrollingRef.current = true;
    
    // Simpan posisi layar Y awal dari m2 sebagai target yang akan dipertahankan (kamera dilock ke posisi ini)
    if (m2GroupRef.current) {
      idealYRef.current = m2GroupRef.current.getBoundingClientRect().top;
    }
    
    lastM2YRef.current = Y_A;

    passedBRef.current = false;

    // Di Modul 2.1 (GLBB), melepas klem P secara OTOMATIS men-start stopwatch
    if (mode === "GLBB") {
      resetStopwatch();
      setTimeout(startStopwatch, 50); // Delay kecil sinkronisasi visual
    } else if (mode === "GLB") {
      resetStopwatch();
    }
    
    if (onTimeChange) onTimeChange(0, true, true);

    const s_AB = (posB - Y_A) / PX_PER_METER;
    const t_AB = a_true > 0 ? calculateFallTime(s_AB, a_true, mode !== "explore") : Infinity;

    let t_BC = 0;
    let s_BC = 0;
    let v_anim = 0; // Kecepatan di B

    if (mode === "GLB" && v_true) {
      s_BC = (posC - posB) / PX_PER_METER;
      t_BC = calculateGLBTime(s_BC, v_true, true);
      v_anim = s_BC / t_BC;
    } else if (mode === "GLBB") {
      s_BC = (Y_M1_INITIAL - posB) / PX_PER_METER; // Biarkan m2 jatuh sampai sejajar P
      v_anim = Math.sqrt(2 * a_true * s_AB);
      t_BC = s_BC / v_anim;
    } else if (mode === "explore") {
      s_BC = (posC - posB) / PX_PER_METER;
      v_anim = Math.sqrt(2 * a_true * s_AB);
      if (a_phase2 === 0) {
        t_BC = v_anim > 0 ? s_BC / v_anim : Infinity;
      } else {
        const det = v_anim*v_anim + 2*a_phase2*s_BC;
        if (det < 0) t_BC = Infinity; // won't reach C
        else t_BC = (-v_anim + Math.sqrt(det)) / a_phase2;
      }
    }

    const a_anim = t_AB !== Infinity ? (2 * s_AB) / (t_AB * t_AB) : 0;
    const a2_anim = a_phase2; // Untuk visual explore fase 2

    animStartTimeRef.current = null;

    const animate = (time: number) => {
      if (!animStartTimeRef.current) animStartTimeRef.current = time;
      const elapsed = (time - animStartTimeRef.current) / 1000;
      
      if (onTimeChange) onTimeChange(elapsed, true, false);

      let currentM2Y = m2Y;
      let currentM1Y = m1Y;
      let currentMTambahanY = mTambahanY;

      if (elapsed <= t_AB) {
        // Fase 1: GLBB (A menuju B)
        const s = 0.5 * a_anim * elapsed * elapsed;
        const yDrop = s * PX_PER_METER;
        
        currentM2Y = Y_A + yDrop;
        currentMTambahanY = Y_A + yDrop;
        currentM1Y = Y_M1_INITIAL - yDrop;
        
        if (isAutoScrollingRef.current && m2GroupRef.current && idealYRef.current !== null) {
          const currentRect = m2GroupRef.current.getBoundingClientRect();
          const diff = currentRect.top - idealYRef.current;
          if (Math.abs(diff) > 1) { 
            window.scrollBy({ top: diff, behavior: 'instant' });
          }
        }

        animReqRef.current = requestAnimationFrame(animate);
      } else if (elapsed <= t_AB + t_BC) {
        if (!passedBRef.current) {
          passedBRef.current = true;
          if (mode === "GLB") {
            startStopwatch(); // Gerbang Cahaya B men-start timer
          } else if (mode === "GLBB") {
            stopStopwatch(); // Gerbang Cahaya B men-stop timer
          }
        }
        // Fase 2: B menuju bawah (m2 jatuh bebas konstan, m3 tertangkap)
        const t2 = elapsed - t_AB;
        let s2 = v_anim * t2;
        if (mode === "explore") {
           s2 += 0.5 * a2_anim * t2 * t2;
        }
        const yDrop = (s_AB + s2) * PX_PER_METER;

        currentM2Y = Y_A + yDrop;
        currentMTambahanY = posB; // Beban tambahan TERTANGKAP TEPAT di cincin B
        currentM1Y = Y_M1_INITIAL - yDrop;
        
        // Auto-scroll tracking m2
        if (isAutoScrollingRef.current && m2GroupRef.current && idealYRef.current !== null) {
          const currentRect = m2GroupRef.current.getBoundingClientRect();
          const diff = currentRect.top - idealYRef.current;
          if (Math.abs(diff) > 1) { 
            window.scrollBy({ top: diff, behavior: 'instant' });
          }
        }
        
        animReqRef.current = requestAnimationFrame(animate);
      } else {
        // Selesai
        if (mode === "GLB") {
          stopStopwatch(); // Gerbang Cahaya C men-stop timer
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

      // DOM Mutation langsung untuk FPS maksimal
      if (m2GroupRef.current) m2GroupRef.current.setAttribute("transform", `translate(0, ${currentM2Y - Y_A})`);
      if (m1GroupRef.current) m1GroupRef.current.setAttribute("transform", `translate(0, ${currentM1Y - Y_M1_INITIAL})`);
      if (mTambahanGroupRef.current) mTambahanGroupRef.current.setAttribute("transform", `translate(0, ${currentMTambahanY - Y_A})`);
      
      if (ropeLRef.current) ropeLRef.current.setAttribute("y2", String(currentM2Y));
      if (ropeRRef.current) ropeRRef.current.setAttribute("y2", String(currentM1Y));

      // Auto-focus kamera (Absolute Tracking Shot)
      if (isAutoScrollingRef.current && m2GroupRef.current && idealYRef.current !== null) {
        const currentRect = m2GroupRef.current.getBoundingClientRect();
        // Selisih antara posisi layar m2 saat ini dengan posisi layar awalnya
        const diff = currentRect.top - idealYRef.current;
        // Jika m2 turun di layar (diff > 0), gulir ke bawah sebanyak diff
        if (diff > 1) { 
          // threshold 1px untuk mencegah getaran kecil
          window.scrollBy({ top: diff, behavior: 'instant' });
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
    
    // Reset DOM transforms
    if (m2GroupRef.current) m2GroupRef.current.setAttribute("transform", `translate(0, 0)`);
    if (m1GroupRef.current) m1GroupRef.current.setAttribute("transform", `translate(0, 0)`);
    if (mTambahanGroupRef.current) mTambahanGroupRef.current.setAttribute("transform", `translate(0, 0)`);
    if (ropeLRef.current) ropeLRef.current.setAttribute("y2", String(Y_A));
    if (ropeRRef.current) ropeRRef.current.setAttribute("y2", String(Y_M1_INITIAL));

    if (animReqRef.current) cancelAnimationFrame(animReqRef.current);
  };

  useImperativeHandle(ref, () => ({
    startDrop,
    resetApparatus
  }));

  // --- RENDER SKALA TIANG ---
  const scaleTicks = useMemo(() => {
    const ticks: React.ReactNode[] = [];
    for (let mm = 0; mm <= 1050; mm++) {
      const y = 200 + mm;
      const isTenCm = mm % 100 === 0;
      const isCm = mm % 10 === 0;
      const isFiveMm = mm % 5 === 0;

      const tickLen = isTenCm ? 20 : isCm ? 10 : isFiveMm ? 5 : 2;
      const sw = isTenCm ? 2 : 1;
      const color = isTenCm ? "#334155" : "#64748b";

      ticks.push(<line key={mm} x1={0} y1={y} x2={tickLen} y2={y} stroke={color} strokeWidth={sw} />);

      if (isTenCm) {
        const valCm = (y - Y_A) / 10;
        ticks.push(
          <text key={`lbl-${mm}`} x={-5} y={y + 4} fontSize="12" fontFamily="monospace" fill="#334155" textAnchor="end">
            {valCm}
          </text>
        );
      }
    }
    return ticks;
  }, []);

  return (
    <div className={`relative w-full rounded-xl border border-white/10 bg-[#f5f7fa] overflow-hidden shadow-2xl flex flex-col md:flex-row ${className}`}>
      
      {/* ── BAGIAN KIRI: SVG ALAT ── */}
      <div className="flex-1 w-full h-full flex justify-center p-4 touch-none select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-full max-h-full w-auto drop-shadow-xl"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Latar Tiang */}
          <rect x={COL_X - 15} y="100" width="30" height="1150" fill="#cbd5e1" stroke="#94a3b8" />
          
          <g transform={`translate(${COL_X - 15}, 0)`}>{scaleTicks}</g>

          {/* Tali */}
          <line ref={ropeLRef} x1={STR_L_X} y1={PULLEY_Y} x2={STR_L_X} y2={m2Y} stroke="#1e293b" strokeWidth="2" />
          <line ref={ropeRRef} x1={STR_R_X} y1={PULLEY_Y} x2={STR_R_X} y2={m1Y} stroke="#1e293b" strokeWidth="2" />
          <path d={`M ${STR_L_X} ${PULLEY_Y} A ${PULLEY_R} ${PULLEY_R} 0 0 1 ${STR_R_X} ${PULLEY_Y}`} fill="none" stroke="#1e293b" strokeWidth="2" />
          
          {/* Katrol */}
          <circle cx={COL_X} cy={PULLEY_Y} r={PULLEY_R} fill="#e2e8f0" stroke="#475569" strokeWidth="4" />
          <circle cx={COL_X} cy={PULLEY_Y} r="8" fill="#1e293b" />
          <line x1={COL_X} y1={PULLEY_Y} x2={COL_X + PULLEY_R * 0.707} y2={PULLEY_Y - PULLEY_R * 0.707} stroke="#ef4444" strokeWidth="2" strokeDasharray="4 2" />
          <text x={COL_X + 10} y={PULLEY_Y - 20} fontSize="14" fill="#ef4444" fontWeight="bold">r</text>

          {/* Titik A */}
          <line x1={STR_L_X - 60} y1={Y_A} x2={STR_L_X + 10} y2={Y_A} stroke="#3b82f6" strokeWidth="2" strokeDasharray="5 5" />
          <text x={STR_L_X - 70} y={Y_A + 5} fontSize="18" fill="#3b82f6" fontWeight="bold" textAnchor="end">A</text>

          {/* CINCIN B */}
          <g 
            transform={`translate(${STR_L_X}, ${posB})`} 
            onPointerDown={handlePointerDownB} 
            cursor={mode === "GLBB" && !isAnimating && !clampRetracted ? "ns-resize" : "default"}
          >
            <rect x="-50" y="0" width="27.5" height="8" fill="#64748b" stroke="#334155" />
            <rect x="22.5" y="0" width="27.5" height="8" fill="#64748b" stroke="#334155" />
            <text x="-65" y="10" fontSize="18" fill="#ef4444" fontWeight="bold" textAnchor="end">B</text>
            
            {mode === "GLBB" && (
              <text x="-65" y="-10" fontSize="12" fill="#64748b" textAnchor="end">
                {((posB - Y_A) / 10).toFixed(1)} cm
              </text>
            )}
          </g>

          {/* LANDASAN C */}
          {mode === "GLB" && (
            <g 
              transform={`translate(${STR_L_X}, ${posC})`} 
              onPointerDown={handlePointerDownC}
              cursor={!isAnimating && !clampRetracted ? "ns-resize" : "default"}
            >
              <rect x="-50" y="0" width="100" height="15" fill="#94a3b8" stroke="#334155" />
              <text x="-65" y="14" fontSize="18" fill="#10b981" fontWeight="bold" textAnchor="end">C</text>
              <text x="-65" y="-10" fontSize="12" fill="#64748b" textAnchor="end">
                {((posC - posB) / 10).toFixed(1)} cm
              </text>
            </g>
          )}

          {/* MEKANISME PENJEPIT P */}
          <g transform={`translate(${STR_R_X}, ${Y_M1_INITIAL})`}>
            <text x="60" y="-10" fontSize="18" fill="#f59e0b" fontWeight="bold">P</text>
            <g transform={`translate(${clampRetracted ? 40 : 15}, 0)`} className="transition-transform duration-300">
              <rect x="0" y="-10" width="30" height="20" fill="#f59e0b" stroke="#b45309" />
              <path d="M 0 0 L -10 -10 L -10 10 Z" fill="#f59e0b" stroke="#b45309" />
            </g>
            <line x1="-30" y1="0" x2="100" y2="0" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
          </g>

          {/* MASSA m1 (Kanan) */}
          <g ref={m1GroupRef}>
            <rect x={STR_R_X - M_W/2} y={Y_M1_INITIAL} width={M_W} height={M_H} fill="#0f172a" rx="2" />
            <text x={STR_R_X} y={Y_M1_INITIAL + 25} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">m1</text>
          </g>

          {/* MASSA m2 (Kiri Bawah) */}
          <g ref={m2GroupRef}>
            <rect x={STR_L_X - M_W/2} y={Y_A} width={M_W} height={M_H} fill="#0f172a" rx="2" />
            <text x={STR_L_X} y={Y_A + 25} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">m2</text>
          </g>

          {/* MASSA TAMBAHAN m3 (dan m4) (Kiri Atas) */}
          <g ref={mTambahanGroupRef}>
            {/* Tumpukan m3 */}
            <rect x={STR_L_X - M3_W/2} y={Y_A - M3_H} width={M3_W} height={M3_H} fill="#ef4444" rx="2" stroke="#7f1d1d" />
            <text x={STR_L_X} y={Y_A - 3} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">m3</text>
            
            {/* Tumpukan m4 (hanya muncul jika additionalMassConfig === 'm3_m4') */}
            {additionalMassConfig === "m3_m4" && (
              <g>
                <rect x={STR_L_X - M3_W/2} y={Y_A - M3_H * 2} width={M3_W} height={M3_H} fill="#f97316" rx="2" stroke="#c2410c" />
                <text x={STR_L_X} y={Y_A - M3_H - 3} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">m4</text>
              </g>
            )}
          </g>

        </svg>
      </div>

      {/* ── BAGIAN KANAN: PANEL KONTROL & STOPWATCH ── */}
      {!hideControls && (
        <div className="w-full md:w-80 bg-[#e2e8f0] border-l border-white/20 p-6 flex flex-col shrink-0 relative shadow-inner z-10">
          
          <div className="mb-8">
            <h3 className="font-bold text-lg text-slate-800 border-b-2 border-slate-300 pb-2 mb-4">
              Kontrol Pesawat Atwood
            </h3>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            {mode === "GLBB" 
              ? "Atur jarak A-B. Tombol Lepas Klem (P) akan melepaskan beban dan secara otomatis men-trigger Stopwatch menggunakan sensor gerbang cahaya."
              : "Jarak A-B tetap (20cm). Atur landasan C. Stopwatch akan secara otomatis di-trigger oleh sensor gerbang cahaya di B dan C."}
          </p>
          
          <div className="flex gap-2">
            <button 
              onClick={startDrop} 
              disabled={clampRetracted} 
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              LEPAS KLEM (P)
            </button>
            <button 
              onClick={resetApparatus} 
              disabled={isAnimating} 
              className="flex-1 py-3 bg-slate-500 hover:bg-slate-400 text-white font-bold rounded shadow-lg disabled:opacity-50 transition-colors"
            >
              RESET ALAT
            </button>
          </div>
        </div>

        <div 
          className="mt-8 md:mt-0 md:absolute left-6 right-6 md:-translate-y-1/2 transition-all duration-200 ease-out z-20"
          style={{ top: `calc(16px + (100% - 32px) * ${(mode === 'GLB' ? posC : posB) / 1350})` }}
        >
          <div className="bg-[#1e293b] p-5 rounded-xl border-4 border-slate-700 shadow-xl flex flex-col items-center">
            <div className="w-full mb-2 flex justify-between items-center text-slate-400 text-xs font-bold tracking-widest">
              <span>MANUAL STOPWATCH</span>
              <div className={`w-2 h-2 rounded-full ${isStopwatchRunning ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
            </div>
            
            <div 
              ref={stopwatchTextRef}
              className="font-mono text-5xl text-emerald-400 bg-black px-6 py-4 rounded-lg border-2 border-slate-900 shadow-inner w-full text-center tracking-widest"
            >
              0.00
            </div>
            
            <div className="flex gap-2 mt-5 w-full">
              <button 
                onClick={toggleStopwatch} 
                className={`flex-1 py-3 font-bold rounded shadow-md transition-colors ${
                  isStopwatchRunning 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                {isStopwatchRunning ? 'STOP' : 'START'}
              </button>
              <button 
                onClick={resetStopwatch} 
                className="flex-1 py-3 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded shadow-md transition-colors"
              >
                RESET
              </button>
            </div>
            
            <p className="text-slate-400 text-[10px] mt-4 text-center leading-tight">
              {mode === "GLBB"
                ? "Sistem Gerbang Cahaya aktif: Stopwatch otomatis START saat beban dilepas (P) dan otomatis STOP saat beban mencapai cincin (B)."
                : "Sistem Gerbang Cahaya aktif: Stopwatch otomatis START saat beban melewati cincin (B) dan otomatis STOP saat mencapai landasan (C)."
              }
            </p>
          </div>
        </div>

      </div>
      )}
    </div>
  );
});
