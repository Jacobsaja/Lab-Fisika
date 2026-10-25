"use client";

import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useId, useMemo } from "react";
import { TimerCounter } from "./TimerCounter";
import { PlaybackSpeedControl } from "@/components/simulation/PlaybackSpeedControl";
import { usePersistedPlaybackSpeed } from "@/physics/hooks/usePersistedPlaybackSpeed";
import {
  useMetalGradientIds,
  SvgMetalGradients,
  VectorOverlay,
  VectorControls,
  VectorControlsState,
  VectorItem,
  SCIENTIFIC_THEME,
} from "@/components/simulation/visual";
import {
  solve1DCollision,
  restitutionCoefficient,
  momentum,
  velocityFromGate,
  getHkmVectors,
  HkmSimulationConfig,
  HkmSimulationState,
  createInitialHkmState,
  advanceHkmSimulation,
  DEFAULT_HKM_FIXED_DT,
} from "@/physics/momentum/momentum";
import { ModulCase } from "@/physics/momentum/types";
import { Play, RotateCcw, Wind } from "lucide-react";

export interface CollisionCompleteData {
  p11: number;
  p21: number;
  p22: number | null;
  vA: number;
  vBPrime: number;
  vAPrime: number;
  pTotalInitial: number;
  pTotalFinal: number;
  eMeasured: number;
}

export interface AirTrackApparatusProps {
  mode?: "practicum" | "explore";
  // Practicum case control
  activeCase?: ModulCase;
  // Mass parameters
  baseMass?: number; // m in kg (default 0.15)
  addedMass?: number; // M in kg (default 0.05)
  cartAHasAddedMass?: boolean;
  cartBHasAddedMass?: boolean;
  // Collision properties
  bumperType?: "elastic" | "inelastic";
  customRestitution?: number; // for explore mode [0, 1]
  // Launch properties
  launchSpeed?: number; // m/s, default 0.4
  // Playback speed control
  speed?: number;
  onSpeedChange?: (speed: number) => void;
  speedStorageKey?: string;
  // Callbacks
  onCollisionComplete?: (data: CollisionCompleteData) => void;
  // Vector overlay & controls props
  vectorControls?: VectorControlsState;
  onVectorControlsChange?: (state: VectorControlsState) => void;
  isVectorLocked?: boolean;
  vectorLockMessage?: string;
  hideVectorControls?: boolean;
  className?: string;
}

export interface AirTrackApparatusRef {
  launch: () => void;
  reset: () => void;
}

// Coordinate constants
const TRACK_LEN_M = 1.4; // 1.4 meter air track
const SVG_W = 1000;
const SVG_H = 310;
const TRACK_X1 = 80;
const TRACK_X2 = 920;
const TRACK_WIDTH_PX = TRACK_X2 - TRACK_X1; // 840 px
const PX_PER_M = TRACK_WIDTH_PX / TRACK_LEN_M; // 600 px/m

const TRACK_Y = 190;
const CART_Y = TRACK_Y - 32;
const CART_LEN_M = 0.12; // 12 cm long cart
const CART_LEN_PX = CART_LEN_M * PX_PER_M; // 72 px
const FLAG_WIDTH_M = 0.03; // 3 cm double-finger flag
const FLAG_WIDTH_PX = FLAG_WIDTH_M * PX_PER_M; // 18 px

// Photogates default positions (m)
const GATE1_POS_M = 0.40;
const GATE2_POS_M = 0.90;
const GATE1_X_PX = TRACK_X1 + GATE1_POS_M * PX_PER_M;
const GATE2_X_PX = TRACK_X1 + GATE2_POS_M * PX_PER_M;

// Initial positions (m)
const CART_A_INIT_M = 0.15;
const CART_B_INIT_M = 0.65;

export const AirTrackApparatus = forwardRef<AirTrackApparatusRef, AirTrackApparatusProps>(({
  mode = "practicum",
  activeCase = "A",
  baseMass = 0.15,
  addedMass = 0.05,
  cartAHasAddedMass,
  cartBHasAddedMass = false,
  bumperType = "elastic",
  customRestitution,
  launchSpeed = 0.42,
  speed: propSpeed,
  onSpeedChange: propOnSpeedChange,
  speedStorageKey,
  onCollisionComplete,
  vectorControls,
  onVectorControlsChange,
  isVectorLocked = false,
  vectorLockMessage,
  hideVectorControls = false,
  className = "",
}, ref) => {
  const instanceId = useId().replace(/[:]/g, "_");
  const gradientIds = useMetalGradientIds(`airtrack_${instanceId}`);

  // Permanent rule: isolate callback props with useRef
  const onCollisionCompleteRef = useRef(onCollisionComplete);
  onCollisionCompleteRef.current = onCollisionComplete;
  const onVectorControlsChangeRef = useRef(onVectorControlsChange);
  onVectorControlsChangeRef.current = onVectorControlsChange;

  const defaultSpeedKey = speedStorageKey ?? (mode === "practicum" ? "hkm-practicum" : "hkm-explore");
  const [internalSpeed, setInternalSpeed] = usePersistedPlaybackSpeed(defaultSpeedKey, 1.0);
  const activeSpeed = propSpeed ?? internalSpeed;
  const handleSpeedChange = propOnSpeedChange ?? setInternalSpeed;
  const speedRef = useRef(activeSpeed);
  speedRef.current = activeSpeed;

  const [localVectorControls, setLocalVectorControls] = useState<VectorControlsState>({
    showVelocity: true,
    showMomentum: true,
    showTotalMomentum: true,
    arrowScale: 1.0,
    showValues: mode === "explore",
  });

  const activeVectorControls = vectorControls ?? localVectorControls;

  const handleVectorControlsChange = useCallback((newState: VectorControlsState) => {
    if (onVectorControlsChangeRef.current) {
      onVectorControlsChangeRef.current(newState);
    } else {
      setLocalVectorControls(newState);
    }
  }, []);

  // Determine actual masses based on props or activeCase
  const aHasWeight =
    cartAHasAddedMass !== undefined
      ? cartAHasAddedMass
      : activeCase === "B" || activeCase === "D";
  const bHasWeight = cartBHasAddedMass;

  const effectiveMA = baseMass + (aHasWeight ? addedMass : 0);
  const effectiveMB = baseMass + (bHasWeight ? addedMass : 0);

  const effectiveBumper =
    mode === "practicum"
      ? activeCase === "A" || activeCase === "B"
        ? "elastic"
        : "inelastic"
      : bumperType;

  const effectiveRestitution =
    mode === "explore" && customRestitution !== undefined
      ? customRestitution
      : effectiveBumper === "elastic"
      ? 1.0
      : 0.0;

  const hasP22Expected =
    mode === "practicum"
      ? activeCase !== "A"
      : effectiveRestitution > 0 && effectiveMA > effectiveMB;

  // Equipment states
  const [compressorOn, setCompressorOn] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);

  // Configuration for fixed-step physics engine
  const config = useMemo<HkmSimulationConfig>(() => ({
    effectiveMA,
    effectiveMB,
    restitution: effectiveRestitution,
    launchSpeed,
    compressorOn,
    frictionDecel: compressorOn ? 0.005 : 0.85,
    trackLength: TRACK_LEN_M,
    cartLength: CART_LEN_M,
    flagWidth: FLAG_WIDTH_M,
    gate1Pos: GATE1_POS_M,
    gate2Pos: GATE2_POS_M,
    cartAInitPos: CART_A_INIT_M,
    cartBInitPos: CART_B_INIT_M,
    hasP22Expected,
  }), [effectiveMA, effectiveMB, effectiveRestitution, launchSpeed, compressorOn, hasP22Expected]);

  // Fixed-step simulation engine state & accumulator
  const simStateRef = useRef<HkmSimulationState>(createInitialHkmState(config));
  const accumulatorRef = useRef<number>(0);
  const animReqRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const callbackFiredRef = useRef(false);

  // Visual state for React re-render
  const [renderPosA, setRenderPosA] = useState(CART_A_INIT_M);
  const [renderPosB, setRenderPosB] = useState(CART_B_INIT_M);
  const [renderVelA, setRenderVelA] = useState(launchSpeed);
  const [renderVelB, setRenderVelB] = useState(0);

  useEffect(() => {
    if (!isSimulating && simStateRef.current.xA === CART_A_INIT_M) {
      setRenderVelA(launchSpeed);
      setRenderVelB(0);
    }
  }, [launchSpeed, isSimulating]);

  // Photogate indicators and readings
  const [gate1Active, setGate1Active] = useState(false);
  const [gate2Active, setGate2Active] = useState(false);
  const [p11, setP11] = useState<number | null>(null);
  const [p21, setP21] = useState<number | null>(null);
  const [p22, setP22] = useState<number | null>(null);

  // ── Reset function ──
  const handleReset = useCallback(() => {
    if (animReqRef.current) {
      cancelAnimationFrame(animReqRef.current);
      animReqRef.current = null;
    }
    lastTimeRef.current = null;
    accumulatorRef.current = 0;
    simStateRef.current = createInitialHkmState(config);

    setIsSimulating(false);
    setGate1Active(false);
    setGate2Active(false);

    setRenderPosA(CART_A_INIT_M);
    setRenderPosB(CART_B_INIT_M);
    setRenderVelA(launchSpeed);
    setRenderVelB(0);

    setP11(null);
    setP21(null);
    setP22(null);

    callbackFiredRef.current = false;
  }, [config, launchSpeed]);

  // ── Launch function ──
  const handleLaunch = useCallback(() => {
    if (isSimulating) return;
    handleReset();

    simStateRef.current = createInitialHkmState(config);
    accumulatorRef.current = 0;
    lastTimeRef.current = null;
    setRenderVelA(launchSpeed);
    setRenderVelB(0);
    setIsSimulating(true);
  }, [isSimulating, handleReset, config, launchSpeed]);

  useImperativeHandle(ref, () => ({
    launch: handleLaunch,
    reset: handleReset,
  }));

  // Clean reset when activeCase changes in practicum
  useEffect(() => {
    handleReset();
  }, [activeCase, handleReset]);

  // ── Fixed-step Substepping Physics & Animation Loop ──
  useEffect(() => {
    if (!isSimulating) return;

    const loop = (now: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = now;
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // Advance physics with fixed substeps scaled strictly by playback speed
      const result = advanceHkmSimulation(
        simStateRef.current,
        config,
        dt,
        speedRef.current,
        accumulatorRef.current,
        DEFAULT_HKM_FIXED_DT,
        0.05
      );
      simStateRef.current = result.state;
      accumulatorRef.current = result.accumulator;
      const cur = result.state;

      // Update render positions and velocities
      setRenderPosA(cur.xA);
      setRenderPosB(cur.xB);
      setRenderVelA(cur.vA);
      setRenderVelB(cur.vB);
      setGate1Active(cur.gate1Active);
      setGate2Active(cur.gate2Active);

      if (cur.p11 !== null) setP11(cur.p11);
      if (cur.p21 !== null) setP21(cur.p21);
      if (cur.p22 !== null) setP22(cur.p22);

      // Notification upon trial completion
      if (cur.completed && !callbackFiredRef.current) {
        callbackFiredRef.current = true;
        if (onCollisionCompleteRef.current) {
          const finalP11 = cur.p11!;
          const finalP21 = cur.p21!;
          const finalP22 = hasP22Expected ? cur.p22 : null;

          const measuredVA = velocityFromGate(FLAG_WIDTH_M, finalP11);
          const measuredVBPrime = velocityFromGate(FLAG_WIDTH_M, finalP21);
          const measuredVAPrime = finalP22 ? velocityFromGate(FLAG_WIDTH_M, finalP22) : 0;

          const pInit = momentum(effectiveMA, measuredVA);
          const pFin = momentum(effectiveMA, measuredVAPrime) + momentum(effectiveMB, measuredVBPrime);
          const eMeas = restitutionCoefficient(measuredVA, 0, measuredVAPrime, measuredVBPrime);

          onCollisionCompleteRef.current({
            p11: finalP11,
            p21: finalP21,
            p22: finalP22,
            vA: measuredVA,
            vBPrime: measuredVBPrime,
            vAPrime: measuredVAPrime,
            pTotalInitial: pInit,
            pTotalFinal: pFin,
            eMeasured: Math.max(0, Math.min(1, eMeas)),
          });
        }
      }

      // Stop condition: both carts stopped or at end
      if (cur.stopped) {
        setIsSimulating(false);
        setRenderVelA(0);
        setRenderVelB(0);
        return;
      }

      animReqRef.current = requestAnimationFrame(loop);
    };

    animReqRef.current = requestAnimationFrame(loop);

    return () => {
      if (animReqRef.current) cancelAnimationFrame(animReqRef.current);
    };
  }, [
    isSimulating,
    config,
    effectiveMA,
    effectiveMB,
    hasP22Expected,
  ]);

  // Render variables in SVG space
  const cartAX = TRACK_X1 + renderPosA * PX_PER_M;
  const cartBX = TRACK_X1 + renderPosB * PX_PER_M;

  // Physical vectors computation via pure engine
  const liveVectors = getHkmVectors({
    mA: effectiveMA,
    mB: effectiveMB,
    vA: renderVelA,
    vB: renderVelB,
  });

  const centerA = cartAX + CART_LEN_PX / 2;
  const centerB = cartBX + CART_LEN_PX / 2;
  const totalMass = effectiveMA + effectiveMB;
  const xCM = totalMass > 0 ? (effectiveMA * centerA + effectiveMB * centerB) / totalMass : centerA;

  const isQualitative = mode === "practicum";
  const showValuesInOverlay = !isQualitative && activeVectorControls.showValues;

  const vectorItems: VectorItem[] = [];

  // 1. Velocity A & B (Level 1: Y = 142)
  if (activeVectorControls.showVelocity) {
    vectorItems.push({
      id: "vA",
      category: "velocity",
      label: "vA",
      origin: { x: centerA, y: 142 },
      components: { dx: liveVectors.vA, dy: 0 },
      scale: 200,
      color: SCIENTIFIC_THEME.vectors.velocity,
      showValue: showValuesInOverlay,
      valueText: `${liveVectors.vA.toFixed(2)} m/s`,
    });

    vectorItems.push({
      id: "vB",
      category: "velocity",
      label: "vB",
      origin: { x: centerB, y: 142 },
      components: { dx: liveVectors.vB, dy: 0 },
      scale: 200,
      color: SCIENTIFIC_THEME.vectors.velocity,
      showValue: showValuesInOverlay,
      valueText: `${liveVectors.vB.toFixed(2)} m/s`,
    });
  }

  // 2. Momentum A & B (Level 2: Y = 115)
  if (activeVectorControls.showMomentum) {
    vectorItems.push({
      id: "pA",
      category: "momentum",
      label: "pA",
      origin: { x: centerA, y: 115 },
      components: { dx: liveVectors.pA, dy: 0 },
      scale: 1300,
      color: SCIENTIFIC_THEME.vectors.momentum,
      showValue: showValuesInOverlay,
      valueText: `${liveVectors.pA.toFixed(4)} kg·m/s`,
    });

    vectorItems.push({
      id: "pB",
      category: "momentum",
      label: "pB",
      origin: { x: centerB, y: 115 },
      components: { dx: liveVectors.pB, dy: 0 },
      scale: 1300,
      color: SCIENTIFIC_THEME.vectors.momentum,
      showValue: showValuesInOverlay,
      valueText: `${liveVectors.pB.toFixed(4)} kg·m/s`,
    });
  }

  // 3. Momentum Total (Level 3: Y = 80)
  if (activeVectorControls.showTotalMomentum) {
    vectorItems.push({
      id: "pTotal",
      category: "momentumTotal",
      label: "Σp",
      origin: { x: xCM, y: 80 },
      components: { dx: liveVectors.pTotal, dy: 0 },
      scale: 1300,
      color: SCIENTIFIC_THEME.vectors.momentumTotal,
      dashed: true,
      strokeDasharray: "5 3",
      showValue: showValuesInOverlay,
      valueText: `${liveVectors.pTotal.toFixed(4)} kg·m/s`,
    });
  }

  return (
    <div className={`flex flex-col gap-4 w-full select-none ${className}`}>
      {/* Visual Air Track Canvas */}
      <div className="relative w-full rounded-2xl bg-gradient-to-b from-slate-950 via-[#0a0f1d] to-slate-950 border border-cyan-500/20 shadow-[0_10px_40px_rgba(0,0,0,0.7)] p-4 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/4 w-96 h-28 bg-cyan-500/5 blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-28 bg-blue-500/5 blur-3xl pointer-events-none" />

        {/* Top Control Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2 px-2 pb-2 border-b border-slate-800/80 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-cyan-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              REL UDARA PRESISI (AIR TRACK 1.4 m)
            </span>
            <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
              <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                m_A: <strong className="text-cyan-300">{(effectiveMA * 1000).toFixed(0)} g</strong>
              </span>
              <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                m_B: <strong className="text-amber-300">{(effectiveMB * 1000).toFixed(0)} g</strong>
              </span>
              <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                Bumper:{" "}
                <strong className={effectiveBumper === "elastic" ? "text-emerald-400" : "text-purple-400"}>
                  {effectiveBumper === "elastic" ? "Pegas Baja (e = 1)" : "Velcro (e = 0)"}
                </strong>
              </span>
            </div>
          </div>

          {/* Controls button row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Air Compressor Toggle */}
            <button
              onClick={() => setCompressorOn((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                compressorOn
                  ? "bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
              }`}
              title="Kompresor Udara (Bantalan Udara)"
            >
              <Wind className={`w-3.5 h-3.5 ${compressorOn ? "animate-spin text-cyan-400" : ""}`} />
              Kompresor: {compressorOn ? "ON" : "OFF"}
            </button>

            <PlaybackSpeedControl
              speed={activeSpeed}
              onSpeedChange={handleSpeedChange}
            />

            {/* Launch Cart Button */}
            <button
              data-testid="btn-play"
              onClick={handleLaunch}
              disabled={isSimulating}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                isSimulating
                  ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                  : "bg-cyan-600 hover:bg-cyan-500 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95"
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Dorong Kereta A
            </button>

            {/* Reset Button */}
            <button
              data-testid="btn-reset"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Atur Ulang
            </button>
          </div>
        </div>

        {/* SVG Drawing of Air Track and Gliders */}
        <div className="w-full flex justify-center items-center py-2">
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="w-full h-auto max-h-[300px] drop-shadow-2xl overflow-visible"
          >
            <SvgMetalGradients ids={gradientIds} />

            {/* Support Legs */}
            <rect x={TRACK_X1 + 100} y={TRACK_Y + 16} width="22" height="70" fill="#334155" rx="3" />
            <rect x={TRACK_X2 - 122} y={TRACK_Y + 16} width="22" height="70" fill="#334155" rx="3" />
            <ellipse cx={TRACK_X1 + 111} cy={TRACK_Y + 86} rx="26" ry="6" fill="#1e293b" />
            <ellipse cx={TRACK_X2 - 111} cy={TRACK_Y + 86} rx="26" ry="6" fill="#1e293b" />

            {/* Leveling table base */}
            <rect x="40" y={TRACK_Y + 90} width={SVG_W - 80} height="10" fill="#0f172a" rx="2" />

            {/* Triangular Air Track Main Beam */}
            <path
              d={`M ${TRACK_X1 - 20} ${TRACK_Y} L ${TRACK_X2 + 20} ${TRACK_Y} L ${TRACK_X2 + 10} ${TRACK_Y + 18} L ${TRACK_X1 - 10} ${TRACK_Y + 18} Z`}
              fill={`url(#${gradientIds.aluminum})`}
              stroke="#64748b"
              strokeWidth="1.5"
            />
            {/* End Bumpers on track ends */}
            <rect x={TRACK_X1 - 30} y={TRACK_Y - 25} width="12" height="42" fill="#475569" rx="2" />
            <rect x={TRACK_X2 + 18} y={TRACK_Y - 25} width="12" height="42" fill="#475569" rx="2" />

            {/* Air Holes with gentle air streams if compressor ON */}
            {compressorOn && (
              <g opacity="0.6">
                {Array.from({ length: 28 }).map((_, i) => {
                  const hx = TRACK_X1 + 20 + i * 30;
                  return (
                    <g key={hx}>
                      <circle cx={hx} cy={TRACK_Y - 1} r="1.5" fill="#38bdf8" />
                      <line
                        x1={hx}
                        y1={TRACK_Y - 2}
                        x2={hx}
                        y2={TRACK_Y - 8}
                        stroke="#38bdf8"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                        opacity="0.5"
                      />
                    </g>
                  );
                })}
              </g>
            )}

            {/* Centimeter Scale along track */}
            <g opacity="0.7" fontFamily="monospace" fontSize="8" fill="#94a3b8">
              {Array.from({ length: 15 }).map((_, i) => {
                const sx = TRACK_X1 + (i * 0.1 * PX_PER_M);
                return (
                  <g key={sx}>
                    <line x1={sx} y1={TRACK_Y + 3} x2={sx} y2={TRACK_Y + 12} stroke="#cbd5e1" strokeWidth="1" />
                    <text x={sx} y={TRACK_Y + 22} textAnchor="middle">
                      {i * 10}
                    </text>
                  </g>
                );
              })}
              <text x={TRACK_X2 + 5} y={TRACK_Y + 22} textAnchor="start" fill="#64748b">
                (cm)
              </text>
            </g>

            {/* Photogate 1 (Gate 1 at GATE1_X_PX) */}
            <g transform={`translate(${GATE1_X_PX}, 0)`}>
              {/* Gate Stand Pole */}
              <rect x="-5" y={TRACK_Y - 100} width="10" height="120" fill={`url(#${gradientIds.chassisDark})`} stroke="#475569" rx="2" />
              {/* Gate U-Arch */}
              <path
                d={`M -20 ${TRACK_Y - 100} H 20 V ${TRACK_Y - 40} H 12 V ${TRACK_Y - 90} H -12 V ${TRACK_Y - 40} H -20 Z`}
                fill="#1e293b"
                stroke="#06b6d4"
                strokeWidth="1.5"
              />
              {/* Infrared Beam Line */}
              <line
                x1="-12"
                y1={TRACK_Y - 55}
                x2="12"
                y2={TRACK_Y - 55}
                stroke={gate1Active ? "#ef4444" : "rgba(6,182,212,0.5)"}
                strokeWidth={gate1Active ? "2.5" : "1.5"}
                strokeDasharray={gate1Active ? "none" : "2,2"}
              />
              {/* Gate 1 Label & LED */}
              <circle
                cx="0"
                cy={TRACK_Y - 110}
                r="4.5"
                fill={gate1Active ? "#ef4444" : "#334155"}
                stroke={gate1Active ? "#fca5a5" : "#475569"}
                className={gate1Active ? "shadow-[0_0_8px_#ef4444]" : ""}
              />
              <text
                x="0"
                y={TRACK_Y - 120}
                fill="#06b6d4"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="monospace"
              >
                G1 (40 cm)
              </text>
            </g>

            {/* Photogate 2 (Gate 2 at GATE2_X_PX) */}
            <g transform={`translate(${GATE2_X_PX}, 0)`}>
              {/* Gate Stand Pole */}
              <rect x="-5" y={TRACK_Y - 100} width="10" height="120" fill={`url(#${gradientIds.chassisDark})`} stroke="#475569" rx="2" />
              {/* Gate U-Arch */}
              <path
                d={`M -20 ${TRACK_Y - 100} H 20 V ${TRACK_Y - 40} H 12 V ${TRACK_Y - 90} H -12 V ${TRACK_Y - 40} H -20 Z`}
                fill="#1e293b"
                stroke="#06b6d4"
                strokeWidth="1.5"
              />
              {/* Infrared Beam Line */}
              <line
                x1="-12"
                y1={TRACK_Y - 55}
                x2="12"
                y2={TRACK_Y - 55}
                stroke={gate2Active ? "#ef4444" : "rgba(6,182,212,0.5)"}
                strokeWidth={gate2Active ? "2.5" : "1.5"}
                strokeDasharray={gate2Active ? "none" : "2,2"}
              />
              {/* Gate 2 Label & LED */}
              <circle
                cx="0"
                cy={TRACK_Y - 110}
                r="4.5"
                fill={gate2Active ? "#ef4444" : "#334155"}
                stroke={gate2Active ? "#fca5a5" : "#475569"}
                className={gate2Active ? "shadow-[0_0_8px_#ef4444]" : ""}
              />
              <text
                x="0"
                y={TRACK_Y - 120}
                fill="#06b6d4"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="monospace"
              >
                G2 (90 cm)
              </text>
            </g>

            {/* Glider A (Kereta A) */}
            <g transform={`translate(${cartAX}, ${CART_Y})`}>
              {/* Glider Body */}
              <rect
                x="0"
                y="0"
                width={CART_LEN_PX}
                height="28"
                rx="4"
                fill={`url(#${gradientIds.massBlockA})`}
                stroke="#38bdf8"
                strokeWidth="1.5"
              />
              {/* Air Skid Cutout */}
              <polygon
                points={`6,28 14,24 ${CART_LEN_PX - 14},24 ${CART_LEN_PX - 6},28`}
                fill="#0f172a"
              />

              {/* Added Mass Slot on Cart A */}
              {aHasWeight && (
                <g transform={`translate(${CART_LEN_PX / 2 - 16}, -14)`}>
                  <rect x="0" y="0" width="32" height="12" fill={`url(#${gradientIds.brass})`} stroke="#cbd5e1" strokeWidth="1" rx="2" />
                  <text x="16" y="9" fill="#f8fafc" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                    +50g
                  </text>
                </g>
              )}

              {/* Light Blocker Flag (double finger / single flag of 3cm) */}
              <g transform={`translate(${(CART_LEN_PX - FLAG_WIDTH_PX) / 2}, -30)`}>
                <rect x="0" y="0" width={FLAG_WIDTH_PX} height="30" fill="#020617" stroke="#38bdf8" strokeWidth="1" />
                <rect x="2" y="2" width={FLAG_WIDTH_PX - 4} height="26" fill="#0369a1" opacity="0.6" />
                <text x={FLAG_WIDTH_PX / 2} y="18" fill="#e0f2fe" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  d=3cm
                </text>
              </g>

              {/* Front Bumper on Cart A (collides with Cart B) */}
              {effectiveBumper === "elastic" ? (
                /* Steel Loop Spring */
                <path
                  d={`M ${CART_LEN_PX} 6 C ${CART_LEN_PX + 12} 8, ${CART_LEN_PX + 12} 20, ${CART_LEN_PX} 22`}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="2.5"
                />
              ) : (
                /* Velcro / Needle contact */
                <rect x={CART_LEN_PX} y="9" width="7" height="10" fill="#a855f7" rx="1" />
              )}

              {/* Label inside cart */}
              <text
                x={CART_LEN_PX / 2}
                y="18"
                fill="#ffffff"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="monospace"
              >
                A ({(effectiveMA * 1000).toFixed(0)}g)
              </text>
            </g>

            {/* Glider B (Kereta B) */}
            <g transform={`translate(${cartBX}, ${CART_Y})`}>
              {/* Glider Body */}
              <rect
                x="0"
                y="0"
                width={CART_LEN_PX}
                height="28"
                rx="4"
                fill={`url(#${gradientIds.massBlockB})`}
                stroke="#fbbf24"
                strokeWidth="1.5"
              />
              {/* Air Skid Cutout */}
              <polygon
                points={`6,28 14,24 ${CART_LEN_PX - 14},24 ${CART_LEN_PX - 6},28`}
                fill="#0f172a"
              />

              {/* Added Mass Slot on Cart B */}
              {bHasWeight && (
                <g transform={`translate(${CART_LEN_PX / 2 - 16}, -14)`}>
                  <rect x="0" y="0" width="32" height="12" fill={`url(#${gradientIds.brass})`} stroke="#cbd5e1" strokeWidth="1" rx="2" />
                  <text x="16" y="9" fill="#f8fafc" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                    +50g
                  </text>
                </g>
              )}

              {/* Light Blocker Flag */}
              <g transform={`translate(${(CART_LEN_PX - FLAG_WIDTH_PX) / 2}, -30)`}>
                <rect x="0" y="0" width={FLAG_WIDTH_PX} height="30" fill="#020617" stroke="#fbbf24" strokeWidth="1" />
                <rect x="2" y="2" width={FLAG_WIDTH_PX - 4} height="26" fill="#b45309" opacity="0.6" />
                <text x={FLAG_WIDTH_PX / 2} y="18" fill="#fef3c7" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  d=3cm
                </text>
              </g>

              {/* Back Bumper on Cart B (collides with Cart A) */}
              {effectiveBumper === "elastic" ? (
                /* Flat contact buffer */
                <rect x="-4" y="6" width="4" height="16" fill="#cbd5e1" rx="1" />
              ) : (
                /* Velcro receiver pad */
                <rect x="-6" y="9" width="6" height="10" fill="#c084fc" rx="1" />
              )}

              {/* Label inside cart */}
              <text
                x={CART_LEN_PX / 2}
                y="18"
                fill="#ffffff"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="monospace"
              >
                B ({(effectiveMB * 1000).toFixed(0)}g)
              </text>
            </g>

            {/* Spring Launcher on Left End */}
            <g transform={`translate(${TRACK_X1 - 18}, ${CART_Y + 5})`}>
              <rect x="0" y="0" width="10" height="18" fill="#475569" rx="1" />
              <line x1="10" y1="9" x2="24" y2="9" stroke="#94a3b8" strokeWidth="3" />
              <path d="M 12 5 L 14 13 L 16 5 L 18 13 L 20 5 L 22 9" fill="none" stroke="#e2e8f0" strokeWidth="2" />
            </g>

            {/* Physical Vector Overlay */}
            {!isVectorLocked && (
              <VectorOverlay
                vectors={vectorItems}
                userScale={activeVectorControls.arrowScale}
                maxArrowLength={160}
                showValues={showValuesInOverlay}
              />
            )}
          </svg>
        </div>
      </div>

      {/* Vector Controls Panel */}
      {!hideVectorControls && (
        <VectorControls
          state={activeVectorControls}
          onChange={handleVectorControlsChange}
          isQualitative={isQualitative}
          isLocked={isVectorLocked}
          lockMessage={vectorLockMessage}
        />
      )}

      {/* Synchronized Digital Timer Counter */}
      <TimerCounter
        p11={p11}
        p21={p21}
        p22={p22}
        gate1Active={gate1Active}
        gate2Active={gate2Active}
        hasP22Expected={hasP22Expected}
        onReset={handleReset}
      />
    </div>
  );
});

AirTrackApparatus.displayName = "AirTrackApparatus";
