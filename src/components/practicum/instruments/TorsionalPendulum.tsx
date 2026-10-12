"use client";

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useMemo } from "react";
import { period, angleAt } from "@/physics/torsionalOscillation";
import { Activity } from "lucide-react";
import {
  SvgMetalGradients,
  useMetalGradientIds,
  SvgGridBackground,
} from "@/components/simulation/visual";

export interface TorsionalPendulumProps {
  mode?: "practicum" | "explore";
  rodLengthCm: number;
  radiusCm: number;
  totalInertia: number;
  kappa: number;
  initialAngleDeg?: number;
  className?: string;
  onTimeChange?: (t: number, isRunning: boolean, reset: boolean) => void;
  onStateUpdate?: (t: number, angleDeg: number, omega: number) => void;
  onOscillationEnd?: (totalTime: number) => void;
}

export interface TorsionalPendulumRef {
  start: () => void;
  pause: () => void;
  reset: () => void;
}

export const TorsionalPendulum = forwardRef<TorsionalPendulumRef, TorsionalPendulumProps>(
  ({ mode = "practicum", rodLengthCm, radiusCm, totalInertia, kappa, initialAngleDeg = 90, className = "", onTimeChange, onStateUpdate, onOscillationEnd }, ref) => {
    
    const [angleDeg, setAngleDeg] = useState(0);
    const [isPulled, setIsPulled] = useState(false);
    const [isOscillating, setIsOscillating] = useState(false);
    const [displayedTime, setDisplayedTime] = useState<number>(0);
    
    const reqRef = useRef<number | null>(null);
    const timeAccumulator = useRef<number>(0);
    const lastTimestampRef = useRef<number | null>(null);
    const cyclesTarget = 5;

    // Callback refs to decouple animation loop from parent callback identities
    const onTimeChangeRef = useRef(onTimeChange);
    onTimeChangeRef.current = onTimeChange;
    const onStateUpdateRef = useRef(onStateUpdate);
    onStateUpdateRef.current = onStateUpdate;
    const onOscillationEndRef = useRef(onOscillationEnd);
    onOscillationEndRef.current = onOscillationEnd;

    const handlePull = () => {
      if (isOscillating) return;
      setIsPulled(true);
      setAngleDeg(initialAngleDeg);
      setDisplayedTime(0);
      timeAccumulator.current = 0;
      onStateUpdateRef.current?.(0, initialAngleDeg, 0);
      onTimeChangeRef.current?.(0, false, true);
    };

    const handleRelease = useCallback(() => {
      if (!isPulled || isOscillating) return;
      
      setIsPulled(false);
      setIsOscillating(true);
      if (mode === "practicum") {
        setDisplayedTime(0);
      }
      
      const T_theory = period(totalInertia, kappa);
      // Optional: Add measurement noise to Practicum mode for realistic variance
      const noise = mode === "practicum" ? (1 + (Math.random() - 0.5) * 0.01) : 1;
      const T_measured = T_theory * noise;
      const omega = (2 * Math.PI) / T_measured; 
      const startAngle = initialAngleDeg * (Math.PI / 180);
      
      const totalSimTime = T_measured * cyclesTarget;

      lastTimestampRef.current = null;

      const animate = (timestamp: number) => {
        if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
        const delta = timestamp - lastTimestampRef.current;
        lastTimestampRef.current = timestamp;

        timeAccumulator.current += delta / 1000;
        const currentT = timeAccumulator.current;

        if (mode === "practicum") {
          if (currentT >= totalSimTime) {
            setAngleDeg(0); 
            setDisplayedTime(totalSimTime);
            setIsOscillating(false);
            onTimeChangeRef.current?.(totalSimTime, false, false);
            onOscillationEndRef.current?.(totalSimTime);
            return;
          } else {
            // Slight damping for visual realism
            const gamma = 0.05;
            const damping = Math.exp(-gamma * currentT);
            const currentAngleRad = angleAt(currentT, startAngle * damping, omega, 0);
            const currentAngleDeg = currentAngleRad * (180 / Math.PI);
            
            setAngleDeg(currentAngleDeg);
            setDisplayedTime(currentT);
            
            // Calculate instantaneous omega for graph
            const vOmega = -startAngle * damping * omega * Math.sin(omega * currentT);
            onStateUpdateRef.current?.(currentT, currentAngleDeg, vOmega);
            
            reqRef.current = requestAnimationFrame(animate);
          }
        } else {
          // Explore Mode: runs continuously
          const currentAngleRad = angleAt(currentT, startAngle, omega, 0);
          const currentAngleDeg = currentAngleRad * (180 / Math.PI);
          
          setAngleDeg(currentAngleDeg);
          setDisplayedTime(currentT);
          
          const vOmega = -startAngle * omega * Math.sin(omega * currentT);
          onStateUpdateRef.current?.(currentT, currentAngleDeg, vOmega);
          
          reqRef.current = requestAnimationFrame(animate);
        }
      };

      reqRef.current = requestAnimationFrame(animate);
    }, [isPulled, isOscillating, mode, totalInertia, kappa, initialAngleDeg]);

    const handleStop = useCallback(() => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
      reqRef.current = null;
      setIsOscillating(false);
      onTimeChangeRef.current?.(displayedTime, false, false);
    }, [displayedTime]);

    const handleReset = useCallback(() => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
      reqRef.current = null;
      setIsOscillating(false);
      setIsPulled(false);
      setAngleDeg(0);
      setDisplayedTime(0);
      timeAccumulator.current = 0;
      onTimeChangeRef.current?.(0, false, true);
      onStateUpdateRef.current?.(0, 0, 0);
    }, []);

    useImperativeHandle(ref, () => ({
      start: () => {
        if (!isPulled && !isOscillating) {
          handlePull();
          setTimeout(handleRelease, 100); // Autorelease
        } else if (isPulled) {
          handleRelease();
        }
      },
      pause: handleStop,
      reset: handleReset
    }));

    useEffect(() => {
      return () => {
        if (reqRef.current) cancelAnimationFrame(reqRef.current);
      };
    }, []);

    // Format time for LED display
    const formatTime = (timeInSecs: number) => {
      return timeInSecs.toFixed(3).padStart(6, '0');
    };

    // Calculate dynamic scaling for rod and loads
    // rod is rodLengthCm long. In SVG, let's say 1 cm = 3px. Max length is 100cm (300px)
    const scale = 3; 
    const svgRodLength = rodLengthCm * scale;
    const loadRadius = 15; // Visual size of the loads
    const loadOffset = radiusCm * scale; // Distance from center

    const gradientIds = useMetalGradientIds("pendulum");
    const isCrossingZero = Math.abs(angleDeg % 180) < 5;

    // Protractor graduation ticks around the perimeter dial
    const dialTicks = useMemo(() => {
      const ticks: React.ReactNode[] = [];
      const dialR = 170;
      for (let deg = -120; deg <= 120; deg += 5) {
        const isFifteen = deg % 15 === 0;
        const isThirty = deg % 30 === 0;
        const len = isThirty ? 14 : isFifteen ? 9 : 5;
        const rad = ((deg - 90) * Math.PI) / 180;
        const x1 = (dialR - len) * Math.cos(rad);
        const y1 = (dialR - len) * Math.sin(rad);
        const x2 = dialR * Math.cos(rad);
        const y2 = dialR * Math.sin(rad);
        
        ticks.push(
          <line
            key={`dtick-${deg}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={isThirty ? "#38bdf8" : isFifteen ? "#0ea5e9" : "rgba(100, 116, 139, 0.45)"}
            strokeWidth={isThirty ? 2 : isFifteen ? 1.2 : 0.8}
          />
        );

        if (isThirty) {
          const tx = (dialR - 24) * Math.cos(rad);
          const ty = (dialR - 24) * Math.sin(rad);
          ticks.push(
            <text
              key={`dlbl-${deg}`}
              x={tx}
              y={ty + 3.5}
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
              fill={deg === 0 ? "#38bdf8" : "#94a3b8"}
              textAnchor="middle"
            >
              {Math.abs(deg)}°
            </text>
          );
        }
      }
      return ticks;
    }, []);

    // Millimeter ticks along the rod
    const rodTicks = useMemo(() => {
      const ticks: React.ReactNode[] = [];
      const halfL = svgRodLength / 2;
      const maxCm = rodLengthCm / 2;
      for (let cm = -maxCm; cm <= maxCm; cm += 1) {
        const x = cm * scale;
        const isFive = cm % 5 === 0;
        const isTen = cm % 10 === 0;
        const len = isTen ? 6 : isFive ? 4 : 2.5;
        ticks.push(
          <line
            key={`rtick-${cm}`}
            x1={x}
            y1={-len / 2}
            x2={x}
            y2={len / 2}
            stroke={isTen ? "#1e293b" : "rgba(30, 41, 59, 0.6)"}
            strokeWidth={isTen ? 1.2 : 0.7}
          />
        );
      }
      return ticks;
    }, [svgRodLength, rodLengthCm, scale]);

    return (
      <div className={`relative flex flex-col items-center justify-center p-5 bg-[#080d1a] rounded-2xl border border-cyan-500/20 shadow-2xl overflow-hidden ${className}`}>
        
        {/* Background Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="w-full h-full [background-image:linear-gradient(rgba(6,182,212,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.08)_1px,transparent_1px)] [background-size:40px_40px]" />
        </div>

        {/* LED Timer Display (Practicum mode) */}
        {mode === "practicum" && (
          <div className="absolute top-4 right-4 z-10 bg-[#050811] border border-cyan-500/30 px-4 py-2.5 rounded-xl shadow-2xl">
            <div className="text-[10px] text-cyan-400 font-mono font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-red-500 animate-pulse" />
              <span>PENCACAH WAKTU (5T)</span>
            </div>
            <div
              className="font-mono text-2xl text-red-500 font-bold tracking-widest tabular-nums"
              style={{ textShadow: "0 0 10px rgba(239, 68, 68, 0.65)" }}
            >
              {formatTime(displayedTime)}
            </div>
          </div>
        )}

        {/* Explore mode live status badges */}
        {mode === "explore" && (
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <div className="bg-[#0b1324] border border-white/10 px-3 py-1.5 rounded-lg text-xs font-mono">
              <span className="text-slate-400 text-[10px]">T: </span>
              <span className="text-cyan-300 font-bold">{period(totalInertia, kappa).toFixed(3)} s</span>
            </div>
            <div className="bg-[#0b1324] border border-white/10 px-3 py-1.5 rounded-lg text-xs font-mono">
              <span className="text-slate-400 text-[10px]">θ: </span>
              <span className="text-emerald-300 font-bold">{angleDeg.toFixed(1)}°</span>
            </div>
            <div className="bg-[#0b1324] border border-white/10 px-3 py-1.5 rounded-lg text-xs font-mono">
              <span className="text-slate-400 text-[10px]">d: </span>
              <span className="text-amber-300 font-bold">{radiusCm} cm</span>
            </div>
          </div>
        )}

        {/* Interactive / Visual Area */}
        <div className="relative w-full h-[420px] flex items-center justify-center z-0">
          <svg width="400" height="400" viewBox="-200 -200 400 400" className="select-none max-w-full max-h-full">
            <SvgMetalGradients ids={gradientIds} />

            {/* 1. Concentric Protractor Dial Background */}
            <circle cx="0" cy="0" r="172" fill="#060a14" stroke="#1e293b" strokeWidth="2.5" />
            <circle cx="0" cy="0" r="168" fill="none" stroke="rgba(6, 182, 212, 0.2)" strokeWidth="1" />
            <circle cx="0" cy="0" r="140" fill="none" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="0" cy="0" r="100" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />

            {/* Dial Graduation Ticks */}
            {dialTicks}

            {/* 2. Optical Equilibrium Sensor Line (Setimbang / 0°) */}
            <line x1="0" y1="-185" x2="0" y2="185" stroke="rgba(6, 182, 212, 0.3)" strokeWidth="1.5" strokeDasharray="4 3" />
            {/* Top Equilibrium Sensor Housing */}
            <g transform="translate(0, -172)">
              <rect x="-14" y="-14" width="28" height="14" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="1" />
              <circle cx="0" cy="-7" r="3" fill={isCrossingZero ? "#ef4444" : "#10b981"} />
            </g>
            <text x="0" y="-148" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle" letterSpacing="0.5">
              SETIMBANG (0°)
            </text>

            {/* 3. Real-time Deflection Angle Arc (Visible during pull or oscillation) */}
            {angleDeg !== 0 && (
              <path 
                d={`M 0 -90 A 90 90 0 0 ${angleDeg > 0 ? 1 : 0} ${90 * Math.sin(angleDeg * Math.PI / 180)} ${-90 * Math.cos(angleDeg * Math.PI / 180)}`} 
                fill="none" 
                stroke={isOscillating ? "rgba(6, 182, 212, 0.8)" : "#10b981"} 
                strokeWidth="2" 
                strokeDasharray={isOscillating ? "none" : "3 3"}
              />
            )}

            {/* 4. The Rotating Dumbbell Assembly */}
            {/* Strictly ZERO SVG filters on this moving group for 60 FPS performance */}
            <g transform={`rotate(${angleDeg})`}>
              
              {/* Precision Extruded Stainless Steel Rod */}
              <rect 
                x={-svgRodLength / 2} 
                y={-5} 
                width={svgRodLength} 
                height={10} 
                rx="3" 
                fill={`url(#${gradientIds.steel})`} 
                stroke="#1e293b" 
                strokeWidth="1.2"
              />
              {/* Rod Top Chamfer Highlight */}
              <line
                x1={-svgRodLength / 2 + 2}
                y1={-3}
                x2={svgRodLength / 2 - 2}
                y2={-3}
                stroke="rgba(255, 255, 255, 0.4)"
                strokeWidth="1"
              />

              {/* Rod Millimeter Graduation Ticks */}
              {rodTicks}

              {/* Left Sliding Load (Beban Silinder Geser Kiri) */}
              <g transform={`translate(${-loadOffset}, 0)`}>
                {/* Cylindrical Brass Weight */}
                <rect
                  x={-loadRadius}
                  y={-loadRadius}
                  width={loadRadius * 2}
                  height={loadRadius * 2}
                  rx="3"
                  fill={`url(#${gradientIds.brass})`}
                  stroke="#78350f"
                  strokeWidth="1.5"
                />
                {/* Knurled Collar Texture */}
                <line x1={-loadRadius + 3} y1={-loadRadius} x2={-loadRadius + 3} y2={loadRadius} stroke="#451a03" strokeWidth="1" opacity="0.4" />
                <line x1={loadRadius - 3} y1={-loadRadius} x2={loadRadius - 3} y2={loadRadius} stroke="#451a03" strokeWidth="1" opacity="0.4" />
                {/* Top Clamp Thumbscrew */}
                <circle cx="0" cy={-loadRadius - 3} r="3" fill="#64748b" stroke="#0f172a" strokeWidth="1" />
                {/* Center Bore Pin */}
                <circle cx="0" cy="0" r="4" fill="#451a03" />
                <circle cx="0" cy="0" r="1.5" fill="#fef3c7" />
              </g>

              {/* Right Sliding Load (Beban Silinder Geser Kanan) */}
              <g transform={`translate(${loadOffset}, 0)`}>
                {/* Cylindrical Brass Weight */}
                <rect
                  x={-loadRadius}
                  y={-loadRadius}
                  width={loadRadius * 2}
                  height={loadRadius * 2}
                  rx="3"
                  fill={`url(#${gradientIds.brass})`}
                  stroke="#78350f"
                  strokeWidth="1.5"
                />
                {/* Knurled Collar Texture */}
                <line x1={-loadRadius + 3} y1={-loadRadius} x2={-loadRadius + 3} y2={loadRadius} stroke="#451a03" strokeWidth="1" opacity="0.4" />
                <line x1={loadRadius - 3} y1={-loadRadius} x2={loadRadius - 3} y2={loadRadius} stroke="#451a03" strokeWidth="1" opacity="0.4" />
                {/* Top Clamp Thumbscrew */}
                <circle cx="0" cy={-loadRadius - 3} r="3" fill="#64748b" stroke="#0f172a" strokeWidth="1" />
                {/* Center Bore Pin */}
                <circle cx="0" cy="0" r="4" fill="#451a03" />
                <circle cx="0" cy="0" r="1.5" fill="#fef3c7" />
              </g>

              {/* Distance Callout Tags on Weights */}
              <g pointerEvents="none">
                <text
                  x={-loadOffset}
                  y={loadRadius + 14}
                  fill="#fef3c7"
                  fontSize="8"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  d={radiusCm}cm
                </text>
                <text
                  x={loadOffset}
                  y={loadRadius + 14}
                  fill="#fef3c7"
                  fontSize="8"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  d={radiusCm}cm
                </text>
              </g>

              {/* Center Torsion Pivot / Wire Arbor Clamp */}
              <circle cx="0" cy="0" r="14" fill={`url(#${gradientIds.brass})`} stroke="#78350f" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="9" fill="#1e293b" stroke="#0f172a" strokeWidth="1.2" />
              <circle cx="0" cy="0" r="4" fill="#06b6d4" stroke="#0284c7" strokeWidth="1" />
              {/* Pointer witness tick */}
              <line x1="0" y1="-14" x2="0" y2="-22" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
            </g>
          </svg>
        </div>

        {/* Controls for Practicum Mode */}
        {mode === "practicum" && (
          <div className="flex gap-3 z-10 mt-2">
            {!isPulled && !isOscillating && (
              <button 
                onClick={handlePull}
                className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold rounded-xl shadow-lg border border-cyan-400/30 transition-all active:scale-95"
              >
                Simpangkan ({initialAngleDeg}°)
              </button>
            )}
            {isPulled && !isOscillating && (
              <button 
                onClick={handleRelease}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-bold rounded-xl shadow-lg border border-emerald-400/30 transition-all active:scale-95 animate-pulse"
              >
                Lepas & Mulai Timer
              </button>
            )}
            {isOscillating && (
              <button 
                disabled
                className="px-5 py-2 bg-slate-800 text-slate-400 font-mono text-xs font-bold rounded-xl cursor-not-allowed border border-slate-700"
              >
                Sedang Berosilasi...
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
);

TorsionalPendulum.displayName = "TorsionalPendulum";
