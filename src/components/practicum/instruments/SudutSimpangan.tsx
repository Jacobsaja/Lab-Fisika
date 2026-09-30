"use client";

import React, { useState, useEffect, useRef } from "react";
import { simulateDeflectionAngle, DEFAULT_DRUM_RADIUS } from "@/physics/momentOfInertia";

interface SudutSimpanganProps {
  massKg: number;
  kappaTrue: number;
  className?: string;
}

export function SudutSimpangan({ massKg, kappaTrue, className = "" }: SudutSimpanganProps) {
  const [angleDeg, setAngleDeg] = useState(0);
  
  // Ref untuk simulasi spring animation (damped oscillation)
  const reqRef = useRef<number>(null);

  useEffect(() => {
    // Setiap kali massa diganti, kita hitung ground truth angle dengan sedikit noise
    // seperti membaca dari mata manusia + paralaks.
    const { angleDeg: finalAngle } = simulateDeflectionAngle(massKg, kappaTrue, DEFAULT_DRUM_RADIUS, 9.81, true);
    
    let startAnim: number | null = null;
    const DURATION = 2000; // 2 detik untuk stabil
    const startAngle = angleDeg; // Angle saat ini
    const diff = finalAngle - startAngle;

    const animate = (timestamp: number) => {
      if (!startAnim) startAnim = timestamp;
      const progress = (timestamp - startAnim) / DURATION;

      if (progress >= 1) {
        setAngleDeg(finalAngle); // Stabil di posisi akhir yang tersimulasi
      } else {
        // Damped oscillation (underdamped spring behavior)
        // e^(-3t) * cos(15t) form
        const damping = Math.exp(-4 * progress);
        const oscillation = Math.cos(20 * progress);
        const currentVal = finalAngle - diff * damping * oscillation;
        setAngleDeg(Math.max(0, currentVal));
        reqRef.current = requestAnimationFrame(animate);
      }
    };

    if (reqRef.current) cancelAnimationFrame(reqRef.current);
    reqRef.current = requestAnimationFrame(animate);

    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [massKg, kappaTrue]); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate ticks for protractor (0 to 180 degrees)
  const protractorTicks = React.useMemo(() => {
    const ticks: React.ReactNode[] = [];
    for (let deg = 0; deg <= 180; deg++) {
      const isTen = deg % 10 === 0;
      const isFive = deg % 5 === 0 && !isTen;
      
      const length = isTen ? 15 : isFive ? 10 : 5;
      const strokeWidth = isTen ? 2 : 1;
      const color = isTen ? "#1e293b" : "#64748b";

      // Protractor arc is drawn from left (0) to right (180), or top to bottom.
      // Let's make 0 degrees point STRAIGHT UP, and 180 degrees point STRAIGHT DOWN.
      // Wait, 0 degrees is usually the rest position. 
      // If 0 is straight UP, then it deflects clockwise.
      // Standard angle convention in SVG: 
      // 0 deg = right, 90 deg = down, 180 deg = left.
      // Let's map it: -90 deg SVG = UP (0 deflection).
      // So visual angle = deg - 90.
      const visualAngle = deg - 90;
      const rad = (visualAngle * Math.PI) / 180;
      
      const outerRadius = 150;
      const innerRadius = outerRadius - length;

      const x1 = 200 + innerRadius * Math.cos(rad);
      const y1 = 200 + innerRadius * Math.sin(rad);
      const x2 = 200 + outerRadius * Math.cos(rad);
      const y2 = 200 + outerRadius * Math.sin(rad);

      ticks.push(
        <line
          key={deg}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={color}
          strokeWidth={strokeWidth}
        />
      );

      if (isTen) {
        const textRadius = outerRadius + 15;
        const tx = 200 + textRadius * Math.cos(rad);
        const ty = 200 + textRadius * Math.sin(rad);
        ticks.push(
          <text
            key={`lbl-${deg}`}
            x={tx}
            y={ty + 4}
            fontSize="10"
            fontFamily="monospace"
            fill="#1e293b"
            textAnchor="middle"
          >
            {deg}°
          </text>
        );
      }
    }
    return ticks;
  }, []);

  // Visual string properties
  // The string wraps around the drum (radius R) and hangs down.
  // We'll simulate R visually as e.g. 50px radius.
  const DRUM_VISUAL_RADIUS = 50; 
  // Needle rotation is angleDeg (0 = UP, positive = clockwise)

  return (
    <div className={`relative w-full rounded-xl border border-white/10 bg-[#f5f7fa] overflow-hidden shadow-2xl flex flex-col ${className}`}>
      {/* Header Panel */}
      <div className="bg-[#111827] text-white p-4 flex justify-between items-center z-10 border-b border-white/20 shrink-0">
        <div>
          <h3 className="font-bold text-lg tracking-wide">ALAT MOMEN INERSIA (BAGIAN A)</h3>
          <p className="text-emerald-400 text-sm font-mono mt-1 font-bold">
            SPESIFIKASI ALAT: JARI-JARI DRUM (R) = 2.5 cm = 0.025 m
          </p>
        </div>
      </div>

      <div className="flex-1 flex justify-center items-center relative overflow-hidden min-h-[500px]">
        {/* SVG Area */}
        <svg viewBox="0 0 400 450" className="w-full h-full max-h-[600px] drop-shadow-xl select-none">
          {/* Base Stand */}
          <rect x="185" y="200" width="30" height="250" fill="#94a3b8" />
          <rect x="150" y="430" width="100" height="20" fill="#1e293b" rx="4" />

          {/* Protractor Arch */}
          <path d="M 200 50 A 150 150 0 0 1 200 350" fill="none" stroke="#cbd5e1" strokeWidth="30" />
          {protractorTicks}

          {/* Center Axle */}
          <circle cx="200" cy="200" r={DRUM_VISUAL_RADIUS} fill="#334155" />
          <circle cx="200" cy="200" r="10" fill="#0f172a" />
          <circle cx="200" cy="200" r="4" fill="#64748b" />

          {/* Rotating Assembly (Needle + Drum details) */}
          <g style={{ transform: `rotate(${angleDeg}deg)`, transformOrigin: "200px 200px" }}>
            {/* Drum details rotating */}
            <circle cx="200" cy="200" r={DRUM_VISUAL_RADIUS - 5} fill="none" stroke="#475569" strokeWidth="2" strokeDasharray="5 5" />
            
            {/* Needle pointing UP initially (0 deg) */}
            <polygon points="196,200 204,200 200,60" fill="#ef4444" />
            <circle cx="200" cy="60" r="3" fill="#ef4444" />
          </g>

          {/* String & Mass */}
          {/* String unspools from the right edge of the drum if it rotates clockwise.
              Right edge of drum is x = 200 + DRUM_VISUAL_RADIUS = 250.
              The string will drop down from (250, 200). */}
          <line x1="250" y1="200" x2="250" y2={massKg > 0 ? 380 : 300} stroke="#94a3b8" strokeWidth="2" />
          
          {/* Mass Object */}
          {massKg > 0 ? (
            <g transform={`translate(250, 380)`}>
              <rect x="-15" y="0" width="30" height="40" fill="#3b82f6" rx="2" />
              {/* Hook */}
              <path d="M 0 0 Q 10 -10 0 -15" fill="none" stroke="#cbd5e1" strokeWidth="2" />
              <text x="0" y="25" fill="white" fontSize="12" fontWeight="bold" textAnchor="middle">
                {massKg * 1000}g
              </text>
            </g>
          ) : (
            <g transform={`translate(250, 300)`}>
              {/* Just a loop for hanging */}
              <circle cx="0" cy="0" r="5" fill="none" stroke="#94a3b8" strokeWidth="2" />
            </g>
          )}

        </svg>

        {/* Kosmetik Background Elements */}
        <div className="absolute top-8 left-8 text-[#64748b] text-[10px] font-mono whitespace-pre opacity-50">
          {`PENGUKURAN K:\nθ = τ / κ\nτ = M × g × R`}
        </div>
      </div>
    </div>
  );
}
