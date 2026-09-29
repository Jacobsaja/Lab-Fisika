"use client";

import React, { useState, useRef, useEffect } from "react";
import { calculateOhausBalance, OhausSliders } from "@/physics/balance";
import { CheckCircle2 } from "lucide-react";

interface OhausBalanceProps {
  valueGrams: number; // ground truth
  className?: string;
}

const X0 = 50;
const X1 = 800;
const W = X1 - X0;

const ARM_Y = {
  top: 80,
  middle: 170,
  bottom: 260,
};

export function OhausBalance({ valueGrams, className = "" }: OhausBalanceProps) {
  const [sliders, setSliders] = useState<OhausSliders>({ topGrams: 0, middleGrams: 0, bottomGrams: 0 });
  const [dragging, setDragging] = useState<"top" | "middle" | "bottom" | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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

    setSliders(prev => {
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
      // Snap ke notch terdekat saat di-lepas
      setSliders(prev => ({
        ...prev,
        topGrams: dragging === "top" ? Math.round(prev.topGrams / 10) * 10 : prev.topGrams,
        middleGrams: dragging === "middle" ? Math.round(prev.middleGrams / 100) * 100 : prev.middleGrams,
        bottomGrams: dragging === "bottom" ? Math.round(prev.bottomGrams * 100) / 100 : prev.bottomGrams,
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
  // Dikurangi dari 15 ke 4 derajat agar pergerakan ujung lengan tidak terlalu jauh/lebay
  const MAX_ANGLE = 4;
  const pointerAngle = balanceState.pointerDeflection * MAX_ANGLE; // + is up, - is down

  return (
    <div className={`relative w-full rounded-xl border border-white/10 bg-[#f5f7fa] overflow-hidden shadow-2xl flex flex-col ${className}`} style={{ cursor: dragging ? "ew-resize" : "default" }}>
      
      {/* Header Panel */}
      <div className="bg-[#111827] text-white p-4 flex justify-between items-center z-10 border-b border-white/20">
        <div>
          <h3 className="font-bold text-lg tracking-wide">NERACA O'HAUS 3 LENGAN</h3>
          <p className="text-white/50 text-sm font-mono mt-1">KAPASITAS: 610 G | NST: 0,1 G</p>
        </div>
        <div className="flex gap-4 items-center">
          {balanceState.isBalanced && (
            <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-1.5 rounded-full border border-emerald-500/30 font-bold animate-fade-in shadow-[0_0_15px_rgba(52,211,153,0.2)]">
              <CheckCircle2 className="w-5 h-5" />
              <span>Seimbang!</span>
            </div>
          )}
          <button 
            onClick={() => setSliders({ topGrams: 0, middleGrams: 0, bottomGrams: 0 })}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      <svg 
        ref={svgRef}
        viewBox="0 0 1000 750" 
        className="w-full h-auto select-none touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <defs>
          <linearGradient id="metal-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e5e7eb" />
            <stop offset="50%" stopColor="#d1d5db" />
            <stop offset="100%" stopColor="#9ca3af" />
          </linearGradient>
          <linearGradient id="metal-dark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#374151" />
          </linearGradient>
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="2" dy="5" stdDeviation="3" floodOpacity="0.3"/>
          </filter>
        </defs>

        {/* Backgrounds */}
        <rect width="1000" height="350" fill="#ffffff" /> {/* Panel 1 Background */}
        <rect x="0" y="350" width="1000" height="400" fill="#ffffff" /> {/* Panel 2 Background */}

        {/* =====================================================================================
            PANEL 1: KONTROL (SKEMATIK, DI ATAS)
            ===================================================================================== */}
        <g filter="url(#shadow)">
          {/* Top Arm (0 - 100) */}
          <g>
            <rect x={X0 - 20} y={ARM_Y.top - 15} width={W + 40} height={30} fill="#475569" rx="4" />
            <rect x={X0 - 15} y={ARM_Y.top - 10} width={W + 30} height={20} fill="#64748b" rx="2" />
            {Array.from({ length: 11 }).map((_, i) => {
              const x = X0 + (i / 10) * W;
              return (
                <g key={`top-${i}`}>
                  <line x1={x} y1={ARM_Y.top} x2={x} y2={ARM_Y.top + 10} stroke="#1e293b" strokeWidth="2" />
                  <text x={x} y={ARM_Y.top + 5} fontSize="14" fontWeight="bold" fill="#f8fafc" textAnchor="middle">{i * 10}</text>
                </g>
              );
            })}
            
            {/* Top Slider */}
            <g 
              onPointerDown={(e) => handlePointerDown(e, "top")} 
              style={{ 
                cursor: "ew-resize",
                transform: `translate(${topX}px, ${ARM_Y.top}px)`,
                transition: dragging === "top" ? "none" : "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
                willChange: dragging === "top" ? "transform" : "auto"
              }}
            >
              <path d="M -30 -25 L 30 -25 L 20 25 L -20 25 Z" fill="#e5e5cb" stroke="#a3a380" strokeWidth="2" />
              <line x1="0" y1="-25" x2="0" y2="25" stroke="#ef4444" strokeWidth="3" />
            </g>
          </g>

          {/* Middle Arm (0 - 500) */}
          <g>
            <rect x={X0 - 20} y={ARM_Y.middle - 15} width={W + 40} height={30} fill="#475569" rx="4" />
            <rect x={X0 - 15} y={ARM_Y.middle - 10} width={W + 30} height={20} fill="#64748b" rx="2" />
            {Array.from({ length: 6 }).map((_, i) => {
              const x = X0 + (i / 5) * W;
              return (
                <g key={`mid-${i}`}>
                  <line x1={x} y1={ARM_Y.middle} x2={x} y2={ARM_Y.middle + 10} stroke="#1e293b" strokeWidth="2" />
                  <text x={x} y={ARM_Y.middle + 5} fontSize="14" fontWeight="bold" fill="#f8fafc" textAnchor="middle">{i * 100}</text>
                </g>
              );
            })}
            
            {/* Middle Slider */}
            <g 
              onPointerDown={(e) => handlePointerDown(e, "middle")} 
              style={{ 
                cursor: "ew-resize",
                transform: `translate(${middleX}px, ${ARM_Y.middle}px)`,
                transition: dragging === "middle" ? "none" : "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
                willChange: dragging === "middle" ? "transform" : "auto"
              }}
            >
              <path d="M -40 -35 L 40 -35 L 30 35 L -30 35 Z" fill="#e5e5cb" stroke="#a3a380" strokeWidth="2" />
              <line x1="0" y1="-35" x2="0" y2="35" stroke="#ef4444" strokeWidth="3" />
            </g>
          </g>

          {/* Bottom Arm (0 - 10) */}
          <g>
            <rect x={X0 - 20} y={ARM_Y.bottom - 15} width={W + 40} height={30} fill="#475569" rx="4" />
            <rect x={X0 - 15} y={ARM_Y.bottom - 10} width={W + 30} height={20} fill="#64748b" rx="2" />
            {Array.from({ length: 101 }).map((_, i) => {
              const x = X0 + (i / 100) * W;
              const isMajor = i % 10 === 0;
              const isMedium = i % 5 === 0 && !isMajor;
              const lineY = isMajor ? ARM_Y.bottom - 10 : isMedium ? ARM_Y.bottom - 5 : ARM_Y.bottom;
              return (
                <g key={`bot-${i}`}>
                  <line x1={x} y1={lineY} x2={x} y2={ARM_Y.bottom + 10} stroke="#1e293b" strokeWidth={isMajor ? 2 : 1} />
                  {isMajor && <text x={x} y={ARM_Y.bottom + 5} fontSize="14" fontWeight="bold" fill="#f8fafc" textAnchor="middle">{i / 10}</text>}
                </g>
              );
            })}
            
            {/* Bottom Slider */}
            <g 
              onPointerDown={(e) => handlePointerDown(e, "bottom")} 
              style={{ 
                cursor: "ew-resize",
                transform: `translate(${bottomX}px, ${ARM_Y.bottom}px)`,
                transition: dragging === "bottom" ? "none" : "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
                willChange: dragging === "bottom" ? "transform" : "auto"
              }}
            >
              <path d="M -20 -15 L 20 -15 L 15 20 L -15 20 Z" fill="#e5e5cb" stroke="#a3a380" strokeWidth="2" />
              <line x1="0" y1="-15" x2="0" y2="20" stroke="#ef4444" strokeWidth="3" />
            </g>
          </g>
        </g>


        {/* =====================================================================================
            PANEL 2: TAMPILAN/VISUALISASI (DI BAWAH)
            ===================================================================================== */}
        {/* Menggunakan nested SVG untuk mengisolasi sistem koordinat dan mencegah kebocoran visual */}
        <svg x="0" y="350" width="1000" height="400" viewBox="0 0 1000 400">
          {/* Base Structure (Static) */}
          <g filter="url(#shadow)">
            {/* Left Base & Pivot Support */}
            <path d="M 120 370 L 370 370 L 350 250 L 250 250 Z" fill="#d4d4d8" stroke="#a1a1aa" />
            
            {/* Right Extension of Base */}
            <rect x="300" y="340" width="550" height="30" fill="#d4d4d8" stroke="#a1a1aa" rx="4" />
            
            {/* Right Pillar (for zero mark) */}
            <path d="M 820 370 L 880 370 L 860 150 L 840 150 Z" fill="#d4d4d8" stroke="#a1a1aa" />
            <rect x="850" y="160" width="10" height="80" fill="white" />
            <line x1="840" y1="200" x2="870" y2="200" stroke="#10b981" strokeWidth="3" />
            <text x="880" y="205" fill="#10b981" fontSize="14" fontWeight="bold">0</text>
            
            {/* Fulcrum Pivot */}
            <circle cx="300" cy="220" r="15" fill="#1e293b" />
          </g>

          {/* Pivoting Beam Assembly */}
          <g 
            style={{ 
              transform: `rotate(${-pointerAngle}deg)`, 
              transformOrigin: "300px 220px",
              transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
              willChange: "transform"
            }}
          >
            {/* Left Arm to Pan Linkage */}
            <rect x="180" y="210" width="120" height="20" fill="#1e293b" />
            
            {/* Right Arm Body (Holding the 3 scales) */}
            <rect x="300" y="170" width="530" height="80" fill="#1e293b" rx="4" />
            
            {/* 3 Mini Arms inside Right Arm Body */}
            {/* Top Mini Arm (0-100) */}
            <line x1="330" y1="185" x2="800" y2="185" stroke="#475569" strokeWidth="2" />
            <polygon points="-4,6 4,6 0,0" fill="#e5e5cb" style={{ transform: `translate(${330 + (sliders.topGrams / 100) * 470}px, 185px)`, transition: dragging === "top" ? "none" : "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)" }} />
            
            {/* Middle Mini Arm (0-500) */}
            <line x1="330" y1="205" x2="800" y2="205" stroke="#475569" strokeWidth="2" />
            <polygon points="-6,10 6,10 0,0" fill="#e5e5cb" style={{ transform: `translate(${330 + (sliders.middleGrams / 500) * 470}px, 205px)`, transition: dragging === "middle" ? "none" : "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)" }} />
            
            {/* Bottom Mini Arm (0-10) */}
            <line x1="330" y1="225" x2="800" y2="225" stroke="#475569" strokeWidth="2" />
            <polygon points="-4,6 4,6 0,0" fill="#e5e5cb" style={{ transform: `translate(${330 + (sliders.bottomGrams / 10) * 470}px, 225px)`, transition: dragging === "bottom" ? "none" : "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)" }} />

            {/* Right Pointer Needle */}
            <polygon points="830,195 830,205 850,200" fill="#ef4444" />

            {/* Left Pan Assembly (Moves and tilts slightly with the beam) */}
            <g transform="translate(200, 220)">              {/* Pan Support Bracket */}
              <rect x="-15" y="-80" width="30" height="80" fill="#94a3b8" />
              <path d="M -25 -20 L 25 -20 L 15 20 L -15 20 Z" fill="#64748b" />
              
              {/* Pan Saucer / Plate */}
              <path d="M -90 -80 L 90 -80 L 50 -60 L -50 -60 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
              
              {/* Object Box */}
              {valueGrams > 0 && (
                <g transform="translate(0, -80)">
                  <circle cx="0" cy="-20" r="20" fill="#3b82f6" />
                </g>
              )}
            </g>
            
            {/* Pivot Cover (Draw last so it's on top of beam) */}
            <circle cx="300" cy="220" r="10" fill="#64748b" stroke="#334155" />
          </g>
        </svg>
      </svg>
    </div>
  );
}
