"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { simulateDeflectionAngle, DEFAULT_DRUM_RADIUS, DEFAULT_GRAVITY } from "@/physics/momentOfInertia";
import {
  SvgMetalGradients,
  useMetalGradientIds,
  SvgGridBackground,
} from "@/components/simulation/visual";

interface DeflectionAngleProps {
  massKg: number;
  kappaTrue: number;
  className?: string;
}

export function DeflectionAngle({ massKg, kappaTrue, className = "" }: DeflectionAngleProps) {
  const [angleDeg, setAngleDeg] = useState(0);
  const gradientIds = useMetalGradientIds("deflect");
  
  // Ref untuk simulasi spring animation (damped oscillation)
  const reqRef = useRef<number>(null);

  useEffect(() => {
    // Setiap kali massa diganti, kita hitung ground truth angle dengan sedikit noise
    // seperti membaca dari mata manusia + paralaks.
    const { angleDeg: finalAngle } = simulateDeflectionAngle(massKg, kappaTrue, DEFAULT_DRUM_RADIUS, DEFAULT_GRAVITY, true);
    
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

  // Generate high-contrast ticks for protractor (0 to 180 degrees)
  // Highly legible at both 1440px and 375px viewports
  const protractorTicks = useMemo(() => {
    const ticks: React.ReactNode[] = [];
    for (let deg = 0; deg <= 180; deg++) {
      const isTen = deg % 10 === 0;
      const isFive = deg % 5 === 0 && !isTen;
      
      const length = isTen ? 16 : isFive ? 10 : 5;
      const strokeWidth = isTen ? 2 : isFive ? 1.4 : 0.8;
      const color = isTen ? "#38bdf8" : isFive ? "#0ea5e9" : "rgba(148, 163, 184, 0.4)";

      const visualAngle = deg - 90;
      const rad = (visualAngle * Math.PI) / 180;
      
      const outerRadius = 152;
      const innerRadius = outerRadius - length;

      const x1 = 200 + innerRadius * Math.cos(rad);
      const y1 = 200 + innerRadius * Math.sin(rad);
      const x2 = 200 + outerRadius * Math.cos(rad);
      const y2 = 200 + outerRadius * Math.sin(rad);

      ticks.push(
        <line
          key={`tick-${deg}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={color}
          strokeWidth={strokeWidth}
        />
      );

      if (isTen) {
        const textRadius = outerRadius + 16;
        const tx = 200 + textRadius * Math.cos(rad);
        const ty = 200 + textRadius * Math.sin(rad);
        ticks.push(
          <text
            key={`lbl-${deg}`}
            x={tx}
            y={ty + 4}
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
            fill="#f1f5f9"
            textAnchor="middle"
          >
            {deg}°
          </text>
        );
      }
    }
    return ticks;
  }, []);

  const DRUM_VISUAL_RADIUS = 50; 
  const torque = massKg * DEFAULT_GRAVITY * DEFAULT_DRUM_RADIUS;

  return (
    <div className={`relative w-full rounded-2xl border border-cyan-500/20 bg-[#080d1a] overflow-hidden shadow-2xl flex flex-col ${className}`}>
      {/* Header Panel */}
      <div className="bg-[#0b1324] px-5 py-3.5 flex flex-wrap justify-between items-center z-10 border-b border-white/10 gap-2 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <h3 className="font-bold text-sm tracking-wider text-slate-100 font-mono">
              ALAT MOMEN INERSIA (BAGIAN A)
            </h3>
          </div>
          <p className="text-cyan-400 text-xs font-mono mt-0.5 font-bold tracking-wide">
            JARI-JARI DRUM (R) = 2.5 cm (0.025 m) · BEBAN = {(massKg * 1000).toFixed(0)} g
          </p>
        </div>

        {/* Real-time Angle & Torque Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/[0.04] border border-white/10 text-xs font-mono">
            <span className="text-slate-400 text-[10px]">τ:</span>
            <span className="text-amber-300 font-bold">{torque.toFixed(4)} N·m</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-cyan-950/40 border border-cyan-500/30 text-xs font-mono">
            <span className="text-slate-400 text-[10px]">θ:</span>
            <span className="text-cyan-300 font-bold">{angleDeg.toFixed(1)}°</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex justify-center items-center relative overflow-hidden min-h-[460px] bg-[#060a14]">
        {/* SVG Area */}
        <svg viewBox="0 0 400 460" className="w-full h-full max-h-[560px] select-none">
          <SvgMetalGradients ids={gradientIds} />
          <SvgGridBackground
            width={400}
            height={460}
            gridSize={40}
            opacity={0.6}
          />

          {/* 1. Base Stand Footing & Mast */}
          <rect x="120" y="420" width="160" height="22" rx="4" fill={`url(#${gradientIds.chassisDark})`} stroke="#334155" strokeWidth="1.5" />
          <circle cx="135" cy="444" r="5.5" fill="#475569" stroke="#0f172a" strokeWidth="1.2" />
          <circle cx="265" cy="444" r="5.5" fill="#475569" stroke="#0f172a" strokeWidth="1.2" />

          {/* Vertical Support Mast */}
          <rect x="187" y="195" width="26" height="230" fill={`url(#${gradientIds.steelVertical})`} stroke="#1e293b" strokeWidth="1.2" />
          <line x1="200" y1="195" x2="200" y2="425" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />

          {/* 2. Precision Protractor Arch Background Track */}
          <path
            d="M 200 46 A 154 154 0 0 1 200 354"
            fill="none"
            stroke="#0a1020"
            strokeWidth="36"
          />
          <path
            d="M 200 46 A 154 154 0 0 1 200 354"
            fill="none"
            stroke="#1e293b"
            strokeWidth="34"
          />
          <path
            d="M 200 48 A 152 152 0 0 1 200 352"
            fill="none"
            stroke="rgba(6, 182, 212, 0.35)"
            strokeWidth="1.5"
          />

          {/* Degree Ticks */}
          {protractorTicks}

          {/* 3. Center Axle & Drum (Winding Spool R = 2.5 cm) */}
          <circle cx="200" cy="200" r={DRUM_VISUAL_RADIUS} fill={`url(#${gradientIds.aluminum})`} stroke="#334155" strokeWidth="2" />
          <circle cx="200" cy="200" r={DRUM_VISUAL_RADIUS - 4} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          
          {/* Drum Cord Guide Groove */}
          <circle cx="200" cy="200" r={DRUM_VISUAL_RADIUS - 8} fill={`url(#${gradientIds.chassisDark})`} stroke="#0f172a" strokeWidth="1.5" />
          <circle cx="200" cy="200" r={16} fill={`url(#${gradientIds.brass})`} stroke="#78350f" strokeWidth="1.5" />
          <circle cx="200" cy="200" r="7" fill="#0f172a" stroke="#475569" strokeWidth="1" />
          <circle cx="200" cy="200" r="2.5" fill="#f8fafc" />

          {/* 4. Rotating Assembly (Needle + Spool Index) */}
          {/* Strictly ZERO SVG filters on moving needle for 60 FPS */}
          <g style={{ transform: `rotate(${angleDeg}deg)`, transformOrigin: "200px 200px" }}>
            {/* Drum rotation witness marks */}
            <circle cx="200" cy="200" r={DRUM_VISUAL_RADIUS - 12} fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="6 4" />
            <line x1="200" y1="160" x2="200" y2="188" stroke="#38bdf8" strokeWidth="2" />

            {/* Precision Pointer Needle pointing to scale (0 deg = UP) */}
            <polygon points="196,200 204,200 200.8,50 199.2,50" fill="#ef4444" stroke="#991b1b" strokeWidth="0.8" />
            {/* Fine Needle Indicator Tip */}
            <circle cx="200" cy="48" r="2.5" fill="#f87171" stroke="#ffffff" strokeWidth="0.8" />

            {/* Needle Counterweight Hub at Center */}
            <circle cx="200" cy="200" r="11" fill={`url(#${gradientIds.brass})`} stroke="#78350f" strokeWidth="1" />
            <circle cx="200" cy="200" r="4" fill="#0f172a" />
          </g>

          {/* 5. Suspension String & Slotted Weight */}
          {/* Unspools from right rim of the drum at x = 250 */}
          <line
            x1="250"
            y1="200"
            x2="250"
            y2={massKg > 0 ? 375 : 300}
            stroke="#94a3b8"
            strokeWidth="1.8"
          />

          {/* Hanging Load Hanger & Slotted Mass */}
          {massKg > 0 ? (
            <g transform="translate(250, 375)">
              {/* Metal Suspension Hook */}
              <path d="M 0 0 C 8 -10 8 -18 0 -22 C -6 -18 -6 -10 0 0 Z" fill="none" stroke="#e2e8f0" strokeWidth="2" />
              {/* Slotted Brass Mass Cylinder */}
              <rect x="-18" y="0" width="36" height="42" rx="3" fill={`url(#${gradientIds.brass})`} stroke="#78350f" strokeWidth="1.5" />
              {/* Chamfer Highlights */}
              <line x1="-16" y1="2" x2="16" y2="2" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
              <line x1="-16" y1="40" x2="16" y2="40" stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
              {/* Mass Weight Text */}
              <text
                x="0"
                y="25"
                fill="#451a03"
                fontSize="11"
                fontWeight="bold"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {(massKg * 1000).toFixed(0)}g
              </text>
            </g>
          ) : (
            <g transform="translate(250, 300)">
              {/* Empty hanging ring */}
              <circle cx="0" cy="0" r="5" fill="none" stroke="#94a3b8" strokeWidth="2" />
            </g>
          )}

          {/* Technical Formula Tag */}
          <g transform="translate(20, 30)" opacity="0.65">
            <rect x="0" y="0" width="105" height="42" rx="4" fill="#070c18" stroke="#334155" strokeWidth="0.8" />
            <text x="8" y="14" fill="#06b6d4" fontSize="8" fontFamily="monospace" fontWeight="bold">
              τ = M · g · R
            </text>
            <text x="8" y="26" fill="#94a3b8" fontSize="8" fontFamily="monospace">
              θ = τ / κ
            </text>
            <text x="8" y="36" fill="#64748b" fontSize="7" fontFamily="monospace">
              R = 0.025 m
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
