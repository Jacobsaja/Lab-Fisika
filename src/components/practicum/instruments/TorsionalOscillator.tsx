"use client";

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { simulateOscillationTime, getTorsionalState } from "@/physics/momentOfInertia";
import { Activity } from "lucide-react";
import {
  SvgMetalGradients,
  useMetalGradientIds,
  SvgGridBackground,
  SvgPhotogate,
  SvgSpiralSpring,
  DigitalDisplayCard,
  DigitalDisplayPanel,
} from "@/components/simulation/visual";

export interface TorsionalOscillatorProps {
  mode?: "practicum" | "explore";
  i0True: number;
  kappaTrue: number;
  attachedBodyInertia?: number;
  attachedBodyShape?: "solid-sphere" | "solid-cylinder" | null;
  attachedBodyRadius?: number; // in meters
  initialAngle?: number; // for explore
  className?: string;
  onTimeChange?: (t: number, isRunning: boolean, reset: boolean) => void;
  onStateUpdate?: (t: number, angleDeg: number, omega: number) => void;
  onCycleComplete?: (period: number) => void;
}

export interface TorsionalOscillatorRef {
  start: () => void;
  pause: () => void;
  reset: () => void;
}

export const TorsionalOscillator = forwardRef<TorsionalOscillatorRef, TorsionalOscillatorProps>(
  ({ mode = "practicum", i0True, kappaTrue, attachedBodyInertia = 0, attachedBodyShape = null, attachedBodyRadius = 0.05, initialAngle = 90, className = "", onTimeChange, onStateUpdate, onCycleComplete }, ref) => {
    const totalInertia = i0True + attachedBodyInertia;
    const [angleDeg, setAngleDeg] = useState(0);
    const [isPulled, setIsPulled] = useState(false);
    const [isOscillating, setIsOscillating] = useState(false);
    const [displayedTime, setDisplayedTime] = useState<number>(0);
    const [finalTime, setFinalTime] = useState<number | null>(null);
    
    // Timer State
    const [timerMode, setTimerMode] = useState<"CYCLE" | "TIMING">("CYCLE"); // We just keep CYCLE for UI
    const cyclesTarget = 5; // Fixed to 5 for Bagian B

    const reqRef = useRef<number | null>(null);
    const startAnim = useRef<number | null>(null);
    const timeAccumulator = useRef<number>(0);
    const lastTimestampRef = useRef<number | null>(null);
    const cyclesCompleted = useRef<number>(0);

    // Callback refs to decouple animation loop from parent callback identities
    const onTimeChangeRef = useRef(onTimeChange);
    onTimeChangeRef.current = onTimeChange;
    const onStateUpdateRef = useRef(onStateUpdate);
    onStateUpdateRef.current = onStateUpdate;
    const onCycleCompleteRef = useRef(onCycleComplete);
    onCycleCompleteRef.current = onCycleComplete;

    const handlePull = () => {
      if (isOscillating) return;
      setIsPulled(true);
      setAngleDeg(initialAngle); // Simpangkan
      setDisplayedTime(0);
      setFinalTime(null);
      timeAccumulator.current = 0;
      cyclesCompleted.current = 0;
      onStateUpdateRef.current?.(0, initialAngle, 0);
      onTimeChangeRef.current?.(0, false, true);
    };

    const handleRelease = useCallback(() => {
      if (!isPulled || isOscillating) return;
      
      setIsPulled(false);
      setIsOscillating(true);
      if (mode === "practicum") {
        setDisplayedTime(0);
      }
      
      const totalTimeSimulated = simulateOscillationTime(totalInertia, kappaTrue, cyclesTarget, true);
      const T0 = totalTimeSimulated / cyclesTarget;
      const omega = (2 * Math.PI) / T0; 
      const startAngle = initialAngle;

      startAnim.current = null;
      lastTimestampRef.current = null;

      const animate = (timestamp: number) => {
        if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
        const delta = timestamp - lastTimestampRef.current;
        lastTimestampRef.current = timestamp;

        timeAccumulator.current += delta / 1000;
        const currentT = timeAccumulator.current;

        if (mode === "practicum") {
          if (currentT >= totalTimeSimulated) {
            setAngleDeg(0); 
            setDisplayedTime(totalTimeSimulated);
            setFinalTime(totalTimeSimulated);
            setIsOscillating(false);
            onTimeChangeRef.current?.(totalTimeSimulated, false, false);
            return;
          } else {
            const gamma = 0.05;
            const damping = Math.exp(-gamma * currentT);
            const currentAngle = startAngle * damping * Math.cos(omega * currentT);
            
            setAngleDeg(currentAngle);
            setDisplayedTime(currentT);
            reqRef.current = requestAnimationFrame(animate);
          }
        } else {
          // Explore Mode uses pure getTorsionalState continuously
          const state = getTorsionalState(currentT, startAngle, totalInertia, kappaTrue);
          setAngleDeg(state.thetaDeg);
          setDisplayedTime(currentT);
          
          onStateUpdateRef.current?.(currentT, state.thetaDeg, state.omegaRad);
          onTimeChangeRef.current?.(currentT, true, false);

          // Detect one full cycle
          if (currentT > (cyclesCompleted.current + 1) * state.period) {
             cyclesCompleted.current++;
             if (cyclesCompleted.current === 1) {
               onCycleCompleteRef.current?.(state.period); // emit measured period after 1 cycle
             }
          }

          reqRef.current = requestAnimationFrame(animate);
        }
      };

      reqRef.current = requestAnimationFrame(animate);
    }, [isPulled, isOscillating, totalInertia, kappaTrue, mode, initialAngle]);

    const handlePause = () => {
      setIsOscillating(false);
      setIsPulled(true); // Treat as pulled so we can resume
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
      onTimeChangeRef.current?.(timeAccumulator.current, false, false);
    };

    const handleReset = () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
      setIsOscillating(false);
      setDisplayedTime(0);
      setFinalTime(null);
      setAngleDeg(0);
      setIsPulled(false);
      timeAccumulator.current = 0;
      cyclesCompleted.current = 0;
      onTimeChangeRef.current?.(0, false, true);
    };

    useImperativeHandle(ref, () => ({
      start: () => {
        if (!isPulled && !isOscillating && timeAccumulator.current === 0) {
          handlePull();
          setTimeout(() => handleRelease(), 10);
        } else {
          handleRelease();
        }
      },
      pause: handlePause,
      reset: handleReset
    }));

    useEffect(() => {
      return () => {
        if (reqRef.current) cancelAnimationFrame(reqRef.current);
      };
    }, []);

    const gradientIds = useMetalGradientIds("torsion");
    const isBeamInterrupted = isOscillating ? Math.abs(angleDeg % 180) < 7 : Math.abs(angleDeg) < 3;

    return (
      <div className={`relative w-full rounded-2xl border border-cyan-500/20 bg-[#080d1a] overflow-hidden shadow-2xl flex flex-col lg:flex-row ${className}`}>
        
        {/* ── Kiri: Visual Alat (Piringan & Gerbang Cahaya) ── */}
        <div className="flex-1 flex flex-col relative border-b lg:border-b-0 lg:border-r border-white/10">
          {/* Header Panel Bar */}
          <div className="bg-[#0b1324] px-5 py-3.5 flex justify-between items-center z-10 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <h3 className="font-bold text-sm tracking-wider text-slate-100 font-mono">
                  ALAT MOMEN INERSIA (BAGIAN B)
                </h3>
              </div>
              <p className="text-cyan-400 text-xs font-mono mt-0.5 font-bold tracking-wide">
                {attachedBodyShape === "solid-sphere"
                  ? "BEBAN: BOLA PEJAL (SOLID SPHERE)"
                  : attachedBodyShape === "solid-cylinder"
                  ? "BEBAN: SILINDER PEJAL (SOLID CYLINDER)"
                  : "PIRINGAN KOSONG (I₀ MURNI)"}
              </p>
            </div>
            
            {/* Real-time Deflection Angle Badge */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/10 text-xs font-mono">
              <span className="text-slate-400 text-[10px]">θ:</span>
              <span className="text-cyan-300 font-bold">{angleDeg.toFixed(1)}°</span>
            </div>
          </div>

          {/* SVG Simulation Stage */}
          <div className="flex-1 min-h-[420px] flex justify-center items-center relative overflow-hidden bg-[#060a14]">
            <svg viewBox="0 0 400 420" className="w-full h-full max-h-[520px] select-none">
              <SvgMetalGradients ids={gradientIds} />
              <SvgGridBackground
                width={400}
                height={420}
                gridSize={40}
                opacity={0.6}
              />

              {/* 1. Base Stand & Vertical Mast */}
              {/* Heavy Machined Base Footing */}
              <rect x="110" y="380" width="180" height="22" rx="4" fill={`url(#${gradientIds.chassisDark})`} stroke="#334155" strokeWidth="1.5" />
              {/* Leveling Feet Screws */}
              <circle cx="125" cy="404" r="6" fill="#475569" stroke="#0f172a" strokeWidth="1.2" />
              <circle cx="275" cy="404" r="6" fill="#475569" stroke="#0f172a" strokeWidth="1.2" />
              {/* Ground Anchor Bolts */}
              <circle cx="160" cy="391" r="3.5" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
              <circle cx="240" cy="391" r="3.5" fill="#1e293b" stroke="#64748b" strokeWidth="1" />

              {/* Heavy Vertical Support Post (Steel Mast) */}
              <rect x="186" y="55" width="28" height="325" fill={`url(#${gradientIds.steelVertical})`} stroke="#1e293b" strokeWidth="1.2" />
              {/* Mast Center Chamfer Highlight */}
              <line x1="200" y1="55" x2="200" y2="380" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />

              {/* Top Support Cap & Axis Bearing Housing */}
              <rect x="176" y="45" width="48" height="18" rx="2" fill={`url(#${gradientIds.chassisDark})`} stroke="#475569" strokeWidth="1" />
              <circle cx="200" cy="54" r="4" fill="#f59e0b" stroke="#78350f" strokeWidth="1" />

              {/* 2. Laboratory Photogate (U-Shape Arch at bottom) */}
              <SvgPhotogate
                x={200}
                y={362}
                orientation="up"
                width={56}
                height={62}
                throatWidth={26}
                throatDepth={38}
                beamActive={isBeamInterrupted}
                label="PHOTOGATE"
                subLabel="0° SENSOR"
                chassisFillId={gradientIds.chassisDark}
              />

              {/* 3. Spiral Torsion Spring (Stationary mount beneath/around rotating disk) */}
              <SvgSpiralSpring
                cx={200}
                cy={200}
                turns={4.2}
                outerRadius={36}
                innerRadius={8}
                strokeFillId={gradientIds.spiralSpring}
              />

              {/* 4. Rotating Assembly: Oscillator Disc (Rotates by angleDeg) */}
              {/* Strictly ZERO SVG filters on this moving group for guaranteed 60 FPS */}
              <g style={{ transform: `rotate(${angleDeg}deg)`, transformOrigin: "200px 200px" }}>
                {/* Main Stainless Steel Turntable Disc */}
                <circle
                  cx="200"
                  cy="200"
                  r="100"
                  fill={`url(#${gradientIds.torsionDisk})`}
                  stroke="#1e293b"
                  strokeWidth="3"
                />

                {/* Disc Beveled Outer Rim */}
                <circle
                  cx="200"
                  cy="200"
                  r="96"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.45)"
                  strokeWidth="1.2"
                />
                <circle
                  cx="200"
                  cy="200"
                  r="78"
                  fill="none"
                  stroke="rgba(0, 0, 0, 0.3)"
                  strokeWidth="1"
                  strokeDasharray="4 2"
                />
                <circle
                  cx="200"
                  cy="200"
                  r="52"
                  fill="none"
                  stroke="rgba(0, 0, 0, 0.25)"
                  strokeWidth="1"
                  strokeDasharray="8 4"
                />

                {/* Laser-Engraved Crosshair Axes */}
                <line x1="200" y1="102" x2="200" y2="298" stroke="#334155" strokeWidth="1.5" />
                <line x1="102" y1="200" x2="298" y2="200" stroke="#334155" strokeWidth="1.5" />

                {/* Radial 30° Graduation Ticks around perimeter */}
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
                  const rad = (deg * Math.PI) / 180;
                  const x1 = Math.round((200 + 88 * Math.cos(rad)) * 100) / 100;
                  const y1 = Math.round((200 + 88 * Math.sin(rad)) * 100) / 100;
                  const x2 = Math.round((200 + 96 * Math.cos(rad)) * 100) / 100;
                  const y2 = Math.round((200 + 96 * Math.sin(rad)) * 100) / 100;
                  return (
                    <line
                      key={deg}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#1e293b"
                      strokeWidth={deg % 90 === 0 ? "2" : "1"}
                    />
                  );
                })}

                {/* Optical Interruption Flag (Extending from bottom rim at 0 deg) */}
                {/* Passes cleanly through photogate throat at y=330..350 */}
                <rect
                  x="197"
                  y="288"
                  width="6"
                  height="26"
                  rx="1"
                  fill="#0f172a"
                  stroke="#334155"
                  strokeWidth="1"
                />

                {/* Central Spindle Flange & Brass Collar */}
                <circle cx="200" cy="200" r="18" fill={`url(#${gradientIds.brass})`} stroke="#78350f" strokeWidth="1.2" />
                <circle cx="200" cy="200" r="8" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
                <circle cx="200" cy="200" r="3.5" fill="#f8fafc" />

                {/* Solid Cylinder Body (Rotating with the disc) */}
                {attachedBodyShape === "solid-cylinder" && (
                  <g>
                    {/* Knurled Outer Collar */}
                    <circle
                      cx="200"
                      cy="200"
                      r={Math.max(12, attachedBodyRadius * 1000)}
                      fill={`url(#${gradientIds.cylinderBody})`}
                      stroke="#451a03"
                      strokeWidth="2"
                    />
                    {/* Cylinder Machined Top Face */}
                    <circle
                      cx="200"
                      cy="200"
                      r={Math.max(8, attachedBodyRadius * 1000 - 4)}
                      fill={`url(#${gradientIds.cylinderTop})`}
                      stroke="#b45309"
                      strokeWidth="1.2"
                    />
                    {/* Concentric Machining Rings */}
                    <circle
                      cx="200"
                      cy="200"
                      r={Math.max(4, attachedBodyRadius * 600)}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.35)"
                      strokeWidth="1"
                      strokeDasharray="4 2"
                    />
                    {/* Center Brass Locking Bolt */}
                    <circle cx="200" cy="200" r="7" fill={`url(#${gradientIds.brass})`} stroke="#78350f" strokeWidth="1" />
                    <circle cx="200" cy="200" r="2.5" fill="#451a03" />

                    {/* Radial Orientation Witness Lines */}
                    <line
                      x1="200"
                      y1={200 - attachedBodyRadius * 1000 + 8}
                      x2="200"
                      y2={200 - attachedBodyRadius * 1000 + 22}
                      stroke="#451a03"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <line
                      x1="200"
                      y1={200 + attachedBodyRadius * 1000 - 22}
                      x2="200"
                      y2={200 + attachedBodyRadius * 1000 - 8}
                      stroke="#451a03"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </g>
                )}
              </g>

              {/* Solid Sphere Body (Stationary specular lighting over the rotating hub) */}
              {attachedBodyShape === "solid-sphere" && (
                <g pointerEvents="none">
                  {/* Sphere Contact Ring Base */}
                  <ellipse
                    cx="200"
                    cy={200 + attachedBodyRadius * 400}
                    rx={attachedBodyRadius * 700}
                    ry={attachedBodyRadius * 250}
                    fill="rgba(0, 0, 0, 0.45)"
                  />
                  {/* 3D Sphere Body with Pure Radial Specular Gradient (No SVG filters) */}
                  <circle
                    cx="200"
                    cy="200"
                    r={attachedBodyRadius * 1000}
                    fill={`url(#${gradientIds.sphereGloss})`}
                    stroke="#0a1128"
                    strokeWidth="1.5"
                  />
                  {/* Specular Glare Reflection Arc */}
                  <ellipse
                    cx={200 - attachedBodyRadius * 360}
                    cy={200 - attachedBodyRadius * 360}
                    rx={Math.max(2, attachedBodyRadius * 320)}
                    ry={Math.max(1, attachedBodyRadius * 160)}
                    fill="rgba(255, 255, 255, 0.55)"
                    transform={`rotate(-45, ${200 - attachedBodyRadius * 360}, ${200 - attachedBodyRadius * 360})`}
                  />
                </g>
              )}
            </svg>

            {/* Manual Controls Overlay (Practicum Only) */}
            {mode === "practicum" && (
              <div className="absolute bottom-5 left-5 flex gap-2.5 z-10">
                <button
                  data-testid="btn-pull"
                  onClick={handlePull}
                  disabled={isOscillating || isPulled}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-mono text-xs font-bold rounded-lg shadow-lg border border-cyan-400/30 transition-all active:scale-95"
                >
                  Simpangkan 90°
                </button>
                <button
                  data-testid="btn-play"
                  onClick={() => {
                    if (!isPulled && !isOscillating) {
                      handlePull();
                      setTimeout(() => {
                        handleRelease();
                      }, 80);
                    } else {
                      handleRelease();
                    }
                  }}
                  disabled={isOscillating}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-mono text-xs font-bold rounded-lg shadow-lg border border-emerald-400/30 transition-all active:scale-95"
                >
                  Lepas (Mulai)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Kanan: Panel Instrumen (Scaler Counter) (Practicum Only) ── */}
        {mode === "practicum" && (
          <div className="w-full lg:w-80 bg-[#090e1c] p-5 flex flex-col gap-5 shrink-0 relative shadow-inner z-10 border-t lg:border-t-0 lg:border-l border-white/10">
            
            {/* Laboratory Rack Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-[11px] font-mono font-bold tracking-widest text-slate-300">
                INSTRUMEN PENCACAH WAKTU
              </span>
              <div className="flex gap-1.5 items-center">
                <span className="text-[9px] font-mono text-slate-400">CH 1</span>
                <span className={`w-2 h-2 rounded-full ${isOscillating ? 'bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]' : 'bg-slate-700'}`} />
              </div>
            </div>

            {/* Scaler Counter Display Enclosure */}
            <DigitalDisplayPanel
              title="DIGITAL SCALER COUNTER"
              modeText={`MODE: ${timerMode}`}
              badge={`N = ${cyclesTarget}`}
              isOscillating={isOscillating}
              className="w-full"
            >
              <DigitalDisplayCard
                label="WAKTU GETARAN"
                sublabel={`N=${cyclesTarget}`}
                value={displayedTime.toFixed(3)}
                unit="s"
                variant="red"
                size="lg"
                indicatorLed={{
                  active: isOscillating,
                  color: "red",
                  label: isOscillating ? "GATE" : "STANDBY",
                }}
              />

              {/* Laboratory Control Pushbuttons */}
              <div className="flex justify-between mt-2 gap-2">
                <button 
                  data-testid="btn-reset"
                  onClick={handleReset}
                  disabled={isOscillating}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 disabled:opacity-40 text-slate-200 text-[10px] font-mono font-bold py-2 rounded border border-slate-700 hover:border-cyan-500/50 transition-all shadow-md"
                >
                  FUNCTION (RESET)
                </button>
                <button 
                  disabled={true}
                  className="flex-1 bg-slate-900 opacity-60 text-slate-400 text-[10px] font-mono font-bold py-2 rounded border border-slate-800 cursor-not-allowed"
                >
                  CH.OVER (5 GET)
                </button>
              </div>
            </DigitalDisplayPanel>

            {/* Feedback / Instructions Box */}
            <div className="p-3.5 bg-slate-900/60 border border-white/10 rounded-xl">
              <h4 className="text-xs font-mono font-bold text-cyan-400 mb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                Instruksi Pengukuran:
              </h4>
              <ol className="text-[11px] text-slate-300 font-mono space-y-1 list-decimal pl-4">
                <li>Simpangkan piringan 90°.</li>
                <li>Lepas untuk memulai osilasi.</li>
                <li>Timer otomatis berhenti pada getaran ke-{cyclesTarget}.</li>
                <li>Catat waktu, lalu tekan FUNCTION untuk reset.</li>
              </ol>
            </div>

            {finalTime !== null && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl animate-fade-in shadow-lg">
                <p className="text-[10px] font-mono text-emerald-400 font-bold text-center tracking-wider">
                  HASIL WAKTU TERCATAT ({cyclesTarget} GETARAN)
                </p>
                <p className="text-xl text-center text-emerald-300 font-mono mt-1 font-bold tracking-widest">
                  {finalTime.toFixed(3)} s
                </p>
              </div>
            )}

          </div>
        )}
      </div>
    );
  }
);
