"use client";

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { period, angleAt } from "@/physics/torsionalOscillation";
import { Activity } from "lucide-react";

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

    const handlePull = () => {
      if (isOscillating) return;
      setIsPulled(true);
      setAngleDeg(initialAngleDeg);
      setDisplayedTime(0);
      timeAccumulator.current = 0;
      if (onStateUpdate) onStateUpdate(0, initialAngleDeg, 0);
      if (onTimeChange) onTimeChange(0, false, true);
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
            if (onTimeChange) onTimeChange(totalSimTime, false, false);
            if (onOscillationEnd) onOscillationEnd(totalSimTime);
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
            if (onStateUpdate) onStateUpdate(currentT, currentAngleDeg, vOmega);
            
            reqRef.current = requestAnimationFrame(animate);
          }
        } else {
          // Explore Mode: runs continuously
          const currentAngleRad = angleAt(currentT, startAngle, omega, 0);
          const currentAngleDeg = currentAngleRad * (180 / Math.PI);
          
          setAngleDeg(currentAngleDeg);
          setDisplayedTime(currentT);
          
          const vOmega = -startAngle * omega * Math.sin(omega * currentT);
          if (onStateUpdate) onStateUpdate(currentT, currentAngleDeg, vOmega);
          
          reqRef.current = requestAnimationFrame(animate);
        }
      };

      reqRef.current = requestAnimationFrame(animate);
    }, [isPulled, isOscillating, mode, totalInertia, kappa, initialAngleDeg, onTimeChange, onStateUpdate, onOscillationEnd]);

    const handleStop = useCallback(() => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
      reqRef.current = null;
      setIsOscillating(false);
      if (onTimeChange) onTimeChange(displayedTime, false, false);
    }, [displayedTime, onTimeChange]);

    const handleReset = useCallback(() => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
      reqRef.current = null;
      setIsOscillating(false);
      setIsPulled(false);
      setAngleDeg(0);
      setDisplayedTime(0);
      timeAccumulator.current = 0;
      if (onTimeChange) onTimeChange(0, false, true);
      if (onStateUpdate) onStateUpdate(0, 0, 0);
    }, [onTimeChange, onStateUpdate]);

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

    return (
      <div className={`relative flex flex-col items-center justify-center p-6 bg-slate-900 rounded-2xl border border-slate-700 shadow-xl overflow-hidden ${className}`}>
        
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        {/* LED Timer Display (Practicum mode) */}
        {mode === "practicum" && (
          <div className="absolute top-4 right-4 z-10 bg-black border-2 border-slate-700 px-4 py-2 rounded shadow-[0_0_15px_rgba(0,0,0,0.5)]">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
              <Activity className="w-3 h-3 text-red-500" /> Waktu (5T)
            </div>
            <div className="font-mono text-2xl text-red-500 tracking-widest drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] tabular-nums" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              {formatTime(displayedTime)}
            </div>
          </div>
        )}

        {/* Explore mode info overlay */}
        {mode === "explore" && (
          <div className="absolute top-4 left-4 z-10 bg-slate-800/80 backdrop-blur border border-slate-600 px-4 py-2 rounded text-xs text-slate-300">
            <div>T: {period(totalInertia, kappa).toFixed(2)} s</div>
            <div>θ: {angleDeg.toFixed(1)}°</div>
          </div>
        )}

        {/* Interactive / Visual Area */}
        <div className="relative w-full h-[400px] flex items-center justify-center z-0">
          
          <svg width="400" height="400" viewBox="-200 -200 400 400" className="drop-shadow-lg">
            {/* Equilibrium Line / Light Gate Marker */}
            <line x1="0" y1="-180" x2="0" y2="180" stroke="#475569" strokeWidth="2" strokeDasharray="5,5" />
            <polygon points="-5,-160 5,-160 0,-150" fill="#38bdf8" />
            <text x="10" y="-155" fill="#94a3b8" fontSize="12" fontFamily="sans-serif">Setimbang</text>

            {/* The Rotating Dumbbell Assembly */}
            <g transform={`rotate(${angleDeg})`}>
              
              {/* Rod */}
              <rect 
                x={-svgRodLength / 2} 
                y={-4} 
                width={svgRodLength} 
                height={8} 
                rx="4" 
                fill="#94a3b8" 
                stroke="#64748b" 
                strokeWidth="1"
              />
              
              {/* Loads */}
              {/* Left Load */}
              <circle cx={-loadOffset} cy="0" r={loadRadius} fill="#f59e0b" stroke="#b45309" strokeWidth="2" />
              <circle cx={-loadOffset} cy="0" r="4" fill="#fbbf24" />
              
              {/* Right Load */}
              <circle cx={loadOffset} cy="0" r={loadRadius} fill="#f59e0b" stroke="#b45309" strokeWidth="2" />
              <circle cx={loadOffset} cy="0" r="4" fill="#fbbf24" />

              {/* Center pivot / Wire connection */}
              <circle cx="0" cy="0" r="10" fill="#38bdf8" stroke="#0369a1" strokeWidth="2" />
              <circle cx="0" cy="0" r="3" fill="#0284c7" />
            </g>
            
            {/* Angle Indicator Arc (Only show when pulled and not running, or in explore) */}
            {((isPulled && !isOscillating) || mode === "explore") && angleDeg !== 0 && (
              <path 
                d={`M 0 -80 A 80 80 0 0 ${angleDeg > 0 ? 1 : 0} ${80 * Math.sin(angleDeg * Math.PI / 180)} ${-80 * Math.cos(angleDeg * Math.PI / 180)}`} 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="2" 
                strokeDasharray="4,4"
              />
            )}
            
          </svg>
          
        </div>

        {/* Controls for Practicum Mode */}
        {mode === "practicum" && (
          <div className="absolute bottom-6 flex gap-4 z-10">
            {!isPulled && !isOscillating && (
              <button 
                onClick={handlePull}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-full shadow-lg shadow-indigo-500/30 transition-all border border-indigo-400"
              >
                Simpangkan ({initialAngleDeg}°)
              </button>
            )}
            {isPulled && !isOscillating && (
              <button 
                onClick={handleRelease}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-full shadow-lg shadow-emerald-500/30 transition-all border border-emerald-400 animate-pulse"
              >
                Lepas & Mulai Timer
              </button>
            )}
            {isOscillating && (
              <button 
                disabled
                className="px-6 py-2 bg-slate-700 text-slate-400 font-semibold rounded-full cursor-not-allowed border border-slate-600"
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
