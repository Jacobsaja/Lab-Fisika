"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useImperativeHandle,
  forwardRef,
  useId,
} from "react";
import { TimerCounter } from "./TimerCounter";
import { PlaybackSpeedControl } from "@/components/simulation/PlaybackSpeedControl";
import { usePersistedPlaybackSpeed } from "@/physics/hooks/usePersistedPlaybackSpeed";
import {
  useMetalGradientIds,
  SvgMetalGradients,
  VectorOverlay,
  VectorControls,
  VectorCategoryConfig,
  VectorItem,
  SCIENTIFIC_THEME,
} from "@/components/simulation/visual";
import {
  G_STANDARD,
  systemAcceleration,
  stringTensions,
  motionStateAtTime,
  computeAirTrackTrial,
  energyAtState,
  advanceSimTime,
  photogateEventTimes,
  photogateReadingsAtTime,
  AirTrackTrialResult,
  MotionState,
  GateSetup,
} from "@/physics/airTrackPulleySystem";
import { Play, RotateCcw, Wind, Pause } from "lucide-react";

export interface AirTrackPulleyApparatusProps {
  mode?: "practicum" | "explore";
  /** Cart mass M in kg (default 0.150 = 150g) */
  cartMass?: number;
  /** Hanging mass m in kg (default 0.015 = 15g) */
  hangingMass?: number;
  /** Whether +12.5g slotted mass is attached to the cart */
  cartHasAddedMass?: boolean;
  /** Drop height H0 in meters (default 0.80) */
  dropHeight?: number;
  /** Max rail travel in meters (default 1.10) */
  railTravel?: number;
  /** Gate 1 position from release point in meters (default 0.25) */
  gate1Pos?: number;
  /** Gate 2 position from release point in meters (default 0.65) */
  gate2Pos?: number;
  /** Flag width in meters (default 0.03 = 3 cm) */
  flagWidth?: number;
  /** Residual friction force in N (default 0) */
  frictionForce?: number;
  /** Pulley effective inertia mass in kg (default 0) */
  pulleyEffectiveMass?: number;
  /** Callback fired when a run finishes reaching gate 2 or end */
  onTrialComplete?: (result: AirTrackTrialResult) => void;
  /** Real-time callback fired during animation (t, x, v, energies) */
  onStateUpdate?: (
    state: MotionState,
    energy: { ek: number; ep: number; em: number }
  ) => void;
  /** Simulation playback speed (1.0, 0.75, 0.5, 0.25) */
  speed?: number;
  onSpeedChange?: (speed: number) => void;
  speedStorageKey?: string;
  /** Vector lock props */
  isVectorLocked?: boolean;
  vectorLockMessage?: string;
  hideVectorControls?: boolean;
  className?: string;
}

export interface AirTrackPulleyApparatusRef {
  launch: () => void;
  pause: () => void;
  reset: () => void;
}

// ─── SVG Coordinate System ──────────────────────────────────────────────────
const SVG_W = 1000;
const SVG_H = 340;

// Track layout
const TRACK_X1 = 70;
const TRACK_X2 = 820;
const TRACK_WIDTH_PX = TRACK_X2 - TRACK_X1; // 750 px
const TRACK_LEN_M = 1.25;
const PX_PER_M = TRACK_WIDTH_PX / TRACK_LEN_M; // 600 px/m

const TRACK_Y = 140;
const CART_Y = TRACK_Y - 28;
const CART_LEN_M = 0.12; // 12 cm cart
const CART_LEN_PX = CART_LEN_M * PX_PER_M; // 72 px

// Pulley location at right end of the rail
const PULLEY_X = TRACK_X2 + 25;
const PULLEY_Y = TRACK_Y - 4;
const PULLEY_R = 16;

// Vertical drop zone for hanging mass
const DROP_LINE_X = PULLEY_X + PULLEY_R;
const TABLE_FLOOR_Y = 320;
const DROP_SPAN_PX = TABLE_FLOOR_Y - PULLEY_Y - 40; // ~160 px vertical span
const PX_PER_M_DROP = DROP_SPAN_PX / 0.85; // vertical scale for drop

export const AirTrackPulleyApparatus = forwardRef<
  AirTrackPulleyApparatusRef,
  AirTrackPulleyApparatusProps
>(
  (
    {
      mode = "practicum",
      cartMass = 0.15,
      hangingMass = 0.015,
      cartHasAddedMass = false,
      dropHeight = 0.8,
      railTravel = 1.1,
      gate1Pos = 0.25,
      gate2Pos = 0.65,
      flagWidth = 0.03,
      frictionForce = 0,
      pulleyEffectiveMass = 0,
      onTrialComplete,
      onStateUpdate,
      speed: propSpeed,
      onSpeedChange: propOnSpeedChange,
      speedStorageKey,
      isVectorLocked = false,
      vectorLockMessage,
      hideVectorControls = false,
      className = "",
    },
    ref
  ) => {
    const instanceId = useId().replace(/[:]/g, "_");
    const gradientIds = useMetalGradientIds(`hkem_pulley_${instanceId}`);

    // Permanent Rule: callback props in animation/effect loops MUST be in useRef
    const onTrialCompleteRef = useRef(onTrialComplete);
    onTrialCompleteRef.current = onTrialComplete;
    const onStateUpdateRef = useRef(onStateUpdate);
    onStateUpdateRef.current = onStateUpdate;

    const defaultSpeedKey = speedStorageKey ?? (mode === "explore" ? "hkem-explore" : "hkem-practicum");
    const [internalSpeed, setInternalSpeed] = usePersistedPlaybackSpeed(defaultSpeedKey, 1.0);
    const activeSpeed = propSpeed ?? internalSpeed;
    const handleSpeedChange = propOnSpeedChange ?? setInternalSpeed;
    const speedRef = useRef(activeSpeed);
    speedRef.current = activeSpeed;

    const effectiveCartMass = cartMass + (cartHasAddedMass ? 0.0125 : 0);

    // Apparatus hardware states
    const [compressorOn, setCompressorOn] = useState(true);
    const [isSimulating, setIsSimulating] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    // Kinematic animation state
    const simTimeRef = useRef(0);
    const lastAnimTimeRef = useRef<number | null>(null);
    const animReqRef = useRef<number | null>(null);
    const trialCompletedRef = useRef(false);

    // Rendered positions (in meters)
    const [renderX, setRenderX] = useState(0);
    const [renderV, setRenderV] = useState(0);
    const [renderPhase, setRenderPhase] = useState<
      "rest" | "accelerating" | "coasting" | "stopped"
    >("rest");

    // Photogate indicators and readings (TimerCounter ACCELERATION mode)
    const [gate1Active, setGate1Active] = useState(false);
    const [gate2Active, setGate2Active] = useState(false);
    const [t1, setT1] = useState<number | null>(null);
    const [t2, setT2] = useState<number | null>(null);
    const [t12, setT12] = useState<number | null>(null);

    // Vector toggles
    const [vectorToggles, setVectorToggles] = useState<Record<string, boolean>>({
      velocity: true,
      acceleration: true,
      gravity: true,
      tension: true,
      friction: true,
    });
    const [arrowScale, setArrowScale] = useState(1.0);
    const [showValues, setShowValues] = useState(mode === "explore");

    // Dynamic physics parameters
    const params = useMemo(
      () => ({
        cartMass: effectiveCartMass,
        hangingMass,
        frictionForce: compressorOn ? frictionForce : Math.max(frictionForce, 0.25),
        pulleyEffectiveMass,
      }),
      [effectiveCartMass, hangingMass, compressorOn, frictionForce, pulleyEffectiveMass]
    );

    const geometry = useMemo(
      () => ({
        dropHeight,
        railTravel,
      }),
      [dropHeight, railTravel]
    );

    const gates: GateSetup = useMemo(
      () => ({
        gate1Position: gate1Pos,
        gate2Position: gate2Pos,
        flagWidth,
      }),
      [gate1Pos, gate2Pos, flagWidth]
    );

    const gateEvents = useMemo(
      () => photogateEventTimes(params, geometry, gates),
      [params, geometry, gates]
    );

    const handleToggleCategory = (id: string) => {
      setVectorToggles((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    // ── Reset Handler ──
    const handleReset = useCallback(() => {
      if (animReqRef.current) {
        cancelAnimationFrame(animReqRef.current);
        animReqRef.current = null;
      }
      lastAnimTimeRef.current = null;
      simTimeRef.current = 0;
      trialCompletedRef.current = false;

      setIsSimulating(false);
      setIsPaused(false);
      setGate1Active(false);
      setGate2Active(false);

      setRenderX(0);
      setRenderV(0);
      setRenderPhase("rest");

      setT1(null);
      setT2(null);
      setT12(null);
    }, []);

    // ── Launch Handler ──
    const handleLaunch = useCallback(() => {
      if (isSimulating && !isPaused) return;
      if (isPaused) {
        setIsPaused(false);
        lastAnimTimeRef.current = performance.now();
        return;
      }
      handleReset();
      setIsSimulating(true);
      setIsPaused(false);
      lastAnimTimeRef.current = performance.now();
    }, [isSimulating, isPaused, handleReset]);

    // ── Pause Handler ──
    const handlePause = useCallback(() => {
      if (!isSimulating || isPaused) return;
      setIsPaused(true);
      if (animReqRef.current) {
        cancelAnimationFrame(animReqRef.current);
        animReqRef.current = null;
      }
      lastAnimTimeRef.current = null;
    }, [isSimulating, isPaused]);

    useImperativeHandle(ref, () => ({
      launch: handleLaunch,
      pause: handlePause,
      reset: handleReset,
    }));

    // Auto reset if parameters drastically change
    useEffect(() => {
      handleReset();
    }, [effectiveCartMass, hangingMass, dropHeight, gate1Pos, gate2Pos, handleReset]);

    // ── Physics & Animation Loop ──
    useEffect(() => {
      if (!isSimulating || isPaused) return;

      const loop = (now: number) => {
        if (!lastAnimTimeRef.current) lastAnimTimeRef.current = now;
        const dt = (now - lastAnimTimeRef.current) / 1000;
        lastAnimTimeRef.current = now;

        simTimeRef.current = advanceSimTime(simTimeRef.current, dt, speedRef.current, 0.05);
        const curTime = simTimeRef.current;

        const state = motionStateAtTime(params, geometry, curTime);
        const energy = energyAtState(params, geometry, state);

        setRenderX(state.x);
        setRenderV(state.v);
        setRenderPhase(state.phase);

        onStateUpdateRef.current?.(state, energy);

        // Analytical, playback-speed-invariant photogate readings
        const readings = photogateReadingsAtTime(params, geometry, gates, curTime, gateEvents);
        setGate1Active(readings.gate1Active);
        setGate2Active(readings.gate2Active);
        if (readings.t1 !== null) setT1(readings.t1);
        if (readings.t2 !== null) setT2(readings.t2);
        if (readings.t12 !== null) setT12(readings.t12);

        // Completion check
        if (
          !trialCompletedRef.current &&
          (state.x >= gate2Pos + flagWidth || state.phase === "stopped")
        ) {
          trialCompletedRef.current = true;
          const result = computeAirTrackTrial(params, geometry, gates);
          onTrialCompleteRef.current?.(result);
        }

        if (state.phase === "stopped") {
          setIsSimulating(false);
          return;
        }

        animReqRef.current = requestAnimationFrame(loop);
      };

      animReqRef.current = requestAnimationFrame(loop);

      return () => {
        if (animReqRef.current) cancelAnimationFrame(animReqRef.current);
      };
    }, [isSimulating, isPaused, params, geometry, gates, gateEvents, gate2Pos, flagWidth]);

    // ── SVG Coordinates Calculation ──
    const cartX = TRACK_X1 + renderX * PX_PER_M;
    const flagX = cartX + (CART_LEN_PX - flagWidth * PX_PER_M) / 2;
    const flagW_px = flagWidth * PX_PER_M;

    // Gate screen positions
    const gate1X = TRACK_X1 + gate1Pos * PX_PER_M;
    const gate2X = TRACK_X1 + gate2Pos * PX_PER_M;

    // Hanging mass vertical position
    // Height above floor: h = dropHeight - x (clamped >= 0)
    const currentH = Math.max(0, dropHeight - renderX);
    const dropProgress = Math.min(1, Math.max(0, renderX / dropHeight));
    const hangerY = PULLEY_Y + 15 + dropProgress * DROP_SPAN_PX;

    // String coordinates
    const cartHookX = cartX + CART_LEN_PX;
    const cartHookY = CART_Y + 14;

    // Physics vectors calculation
    const aCurrent = systemAcceleration(params);
    const tensions = stringTensions(params);
    const weightHanging = hangingMass * G_STANDARD;
    const isQualitative = mode === "practicum";
    const showValuesInOverlay = !isQualitative && showValues;

    const vectorCategories: VectorCategoryConfig[] = [
      {
        id: "velocity",
        label: "Kecepatan (v)",
        color: SCIENTIFIC_THEME.vectors.velocity,
        checked: vectorToggles.velocity,
        title: "Vektor kecepatan kereta",
      },
      {
        id: "acceleration",
        label: "Percepatan (a)",
        color: SCIENTIFIC_THEME.vectors.acceleration,
        checked: vectorToggles.acceleration,
        title: "Vektor percepatan sistem",
      },
      {
        id: "tension",
        label: "Tegangan Tali (T)",
        color: SCIENTIFIC_THEME.vectors.tension,
        checked: vectorToggles.tension,
        title: "Gaya tegangan tali pada kereta dan beban gantung",
      },
      {
        id: "gravity",
        label: "Gaya Berat (w)",
        color: SCIENTIFIC_THEME.vectors.gravity,
        checked: vectorToggles.gravity,
        title: "Gaya berat beban gantung (m·g)",
      },
      {
        id: "friction",
        label: "Gaya Gesek (f)",
        color: SCIENTIFIC_THEME.vectors.friction,
        checked: vectorToggles.friction,
        dashed: true,
        title: "Gaya gesek sisa rel udara",
      },
    ];

    const vectorItems: VectorItem[] = [];

    // 1. Velocity on Cart
    if (vectorToggles.velocity && renderV > 1e-4) {
      vectorItems.push({
        id: "v_cart",
        category: "velocity",
        label: "v",
        origin: { x: cartX + CART_LEN_PX / 2, y: CART_Y - 32 },
        components: { dx: renderV, dy: 0 },
        scale: 140,
        color: SCIENTIFIC_THEME.vectors.velocity,
        showValue: showValuesInOverlay,
        valueText: `${renderV.toFixed(2)} m/s`,
      });
    }

    // 2. Acceleration on Cart
    if (vectorToggles.acceleration && aCurrent > 1e-4 && renderPhase !== "stopped") {
      const aVal = renderPhase === "coasting" ? -params.frictionForce / effectiveCartMass : aCurrent;
      vectorItems.push({
        id: "a_cart",
        category: "acceleration",
        label: "a",
        origin: { x: cartX + CART_LEN_PX / 2, y: CART_Y - 48 },
        components: { dx: aVal, dy: 0 },
        scale: 100,
        color: SCIENTIFIC_THEME.vectors.acceleration,
        showValue: showValuesInOverlay,
        valueText: `${Math.abs(aVal).toFixed(2)} m/s²`,
      });
    }

    // 3. String Tension on Cart (pointing right)
    if (vectorToggles.tension && tensions.cartSide > 1e-4 && currentH > 0) {
      vectorItems.push({
        id: "T_cart",
        category: "tension",
        label: "T",
        origin: { x: cartHookX, y: cartHookY },
        components: { dx: tensions.cartSide, dy: 0 },
        scale: 450,
        color: SCIENTIFIC_THEME.vectors.tension,
        showValue: showValuesInOverlay,
        valueText: `${tensions.cartSide.toFixed(3)} N`,
      });
    }

    // 4. String Tension on Hanging Mass (pointing UP)
    if (vectorToggles.tension && tensions.hangingSide > 1e-4 && currentH > 0) {
      vectorItems.push({
        id: "T_hang",
        category: "tension",
        label: "T",
        origin: { x: DROP_LINE_X, y: hangerY },
        components: { dx: 0, dy: -tensions.hangingSide },
        scale: 450,
        color: SCIENTIFIC_THEME.vectors.tension,
        showValue: showValuesInOverlay,
        valueText: `${tensions.hangingSide.toFixed(3)} N`,
      });
    }

    // 5. Gravity on Hanging Mass (pointing DOWN)
    if (vectorToggles.gravity && weightHanging > 1e-4) {
      vectorItems.push({
        id: "w_hang",
        category: "gravity",
        label: "w = m·g",
        origin: { x: DROP_LINE_X, y: hangerY + 22 },
        components: { dx: 0, dy: weightHanging },
        scale: 450,
        color: SCIENTIFIC_THEME.vectors.gravity,
        showValue: showValuesInOverlay,
        valueText: `${weightHanging.toFixed(3)} N`,
      });
    }

    // 6. Friction on Cart (pointing LEFT)
    if (vectorToggles.friction && params.frictionForce > 1e-4) {
      vectorItems.push({
        id: "f_cart",
        category: "friction",
        label: "f",
        origin: { x: cartX + 12, y: CART_Y + 24 },
        components: { dx: -params.frictionForce, dy: 0 },
        scale: 450,
        color: SCIENTIFIC_THEME.vectors.friction,
        dashed: true,
        showValue: showValuesInOverlay,
        valueText: `${params.frictionForce.toFixed(3)} N`,
      });
    }

    return (
      <div className={`flex flex-col gap-4 w-full select-none ${className}`}>
        {/* Canvas Frame */}
        <div className="relative w-full rounded-2xl bg-gradient-to-b from-slate-950 via-[#0a0f1d] to-slate-950 border border-cyan-500/20 shadow-[0_10px_40px_rgba(0,0,0,0.7)] p-4 overflow-hidden">
          {/* Ambient Glows */}
          <div className="absolute top-0 left-1/4 w-96 h-28 bg-cyan-500/5 blur-3xl pointer-events-none" />
          <div className="absolute top-0 right-1/4 w-96 h-28 bg-blue-500/5 blur-3xl pointer-events-none" />

          {/* Top Control Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2 px-2 pb-2 border-b border-slate-800/80 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                REL UDARA &amp; KATROL PRESISI (HKEM)
              </span>
              <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                  Kereta M:{" "}
                  <strong className="text-cyan-300">
                    {(effectiveCartMass * 1000).toFixed(1)} g
                  </strong>
                </span>
                <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                  Beban m:{" "}
                  <strong className="text-amber-300">
                    {(hangingMass * 1000).toFixed(1)} g
                  </strong>
                </span>
                <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                  a_teori:{" "}
                  <strong className="text-purple-400">{aCurrent.toFixed(3)} m/s²</strong>
                </span>
              </div>
            </div>

            {/* Buttons & Speed Control */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCompressorOn((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                  compressorOn
                    ? "bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                    : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                }`}
                title="Bantalan Udara (Kompresor Rel)"
              >
                <Wind className={`w-3.5 h-3.5 ${compressorOn ? "animate-spin text-cyan-400" : ""}`} />
                Kompresor: {compressorOn ? "ON" : "OFF"}
              </button>

              <PlaybackSpeedControl
                speed={activeSpeed}
                onSpeedChange={handleSpeedChange}
              />

              <button
                data-testid="btn-play"
                onClick={handleLaunch}
                disabled={isSimulating && !isPaused}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                  isSimulating && !isPaused
                    ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                    : "bg-cyan-600 hover:bg-cyan-500 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95"
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isPaused ? "Lanjutkan" : "Lepaskan Kereta"}
              </button>

              {mode === "explore" && isSimulating && (
                <button
                  onClick={handlePause}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-950/80 border border-amber-600 text-amber-300 hover:text-white"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Jeda
                </button>
              )}

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

          {/* SVG Canvas */}
          <div className="w-full flex justify-center items-center py-2">
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="w-full h-auto max-h-[340px] drop-shadow-2xl overflow-visible"
            >
              <SvgMetalGradients ids={gradientIds} />

              {/* Table / Floor Line at Bottom */}
              <line
                x1={TRACK_X1 - 30}
                y1={TABLE_FLOOR_Y}
                x2={SVG_W - 30}
                y2={TABLE_FLOOR_Y}
                stroke="#334155"
                strokeWidth="2"
              />
              <rect
                x={DROP_LINE_X - 35}
                y={TABLE_FLOOR_Y}
                width="70"
                height="12"
                fill="#1e293b"
                rx="2"
              />
              <text
                x={DROP_LINE_X}
                y={TABLE_FLOOR_Y + 10}
                fill="#64748b"
                fontSize="8"
                fontFamily="monospace"
                textAnchor="middle"
              >
                LANTAI (h=0)
              </text>

              {/* Support Legs for Air Track */}
              <rect
                x={TRACK_X1 + 100}
                y={TRACK_Y + 16}
                width="20"
                height="100"
                fill="#334155"
                rx="3"
              />
              <rect
                x={TRACK_X2 - 120}
                y={TRACK_Y + 16}
                width="20"
                height="100"
                fill="#334155"
                rx="3"
              />
              <ellipse
                cx={TRACK_X1 + 110}
                cy={TRACK_Y + 116}
                rx="24"
                ry="5"
                fill="#1e293b"
              />
              <ellipse
                cx={TRACK_X2 - 110}
                cy={TRACK_Y + 116}
                rx="24"
                ry="5"
                fill="#1e293b"
              />

              {/* Air Track Triangular Beam */}
              <path
                d={`M ${TRACK_X1 - 20} ${TRACK_Y} L ${TRACK_X2 + 10} ${TRACK_Y} L ${TRACK_X2} ${TRACK_Y + 18} L ${TRACK_X1 - 10} ${TRACK_Y + 18} Z`}
                fill={`url(#${gradientIds.aluminum})`}
                stroke="#64748b"
                strokeWidth="1.5"
              />

              {/* Air stream jets if compressor ON */}
              {compressorOn && (
                <g opacity="0.6">
                  {Array.from({ length: 25 }).map((_, i) => {
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

              {/* End Stop / Left Bumper */}
              <rect
                x={TRACK_X1 - 26}
                y={TRACK_Y - 26}
                width="12"
                height="44"
                fill="#475569"
                rx="2"
              />
              <rect
                x={TRACK_X2 - 2}
                y={TRACK_Y - 26}
                width="10"
                height="44"
                fill="#475569"
                rx="2"
              />

              {/* Centimeter Scale along track */}
              <g opacity="0.7" fontFamily="monospace" fontSize="8" fill="#94a3b8">
                {Array.from({ length: 13 }).map((_, i) => {
                  const sx = TRACK_X1 + i * 0.1 * PX_PER_M;
                  return (
                    <g key={sx}>
                      <line
                        x1={sx}
                        y1={TRACK_Y + 3}
                        x2={sx}
                        y2={TRACK_Y + 12}
                        stroke="#cbd5e1"
                        strokeWidth="1"
                      />
                      <text x={sx} y={TRACK_Y + 22} textAnchor="middle">
                        {i * 10}
                      </text>
                    </g>
                  );
                })}
                <text x={TRACK_X2 - 40} y={TRACK_Y + 34} textAnchor="start" fill="#64748b">
                  Posisi Rel (cm)
                </text>
              </g>

              {/* Photogate 1 (Gate 1) */}
              <g transform={`translate(${gate1X}, 0)`}>
                <rect
                  x="-5"
                  y={TRACK_Y - 100}
                  width="10"
                  height="120"
                  fill={`url(#${gradientIds.chassisDark})`}
                  stroke="#475569"
                  rx="2"
                />
                <path
                  d={`M -20 ${TRACK_Y - 100} H 20 V ${TRACK_Y - 40} H 12 V ${TRACK_Y - 90} H -12 V ${TRACK_Y - 40} H -20 Z`}
                  fill="#1e293b"
                  stroke="#06b6d4"
                  strokeWidth="1.5"
                />
                <line
                  x1="-12"
                  y1={TRACK_Y - 55}
                  x2="12"
                  y2={TRACK_Y - 55}
                  stroke={gate1Active ? "#ef4444" : "rgba(6,182,212,0.5)"}
                  strokeWidth={gate1Active ? "2.5" : "1.5"}
                  strokeDasharray={gate1Active ? "none" : "2,2"}
                />
                <circle
                  cx="0"
                  cy={TRACK_Y - 110}
                  r="4.5"
                  fill={gate1Active ? "#ef4444" : "#334155"}
                  stroke={gate1Active ? "#fca5a5" : "#475569"}
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
                  G1 ({(gate1Pos * 100).toFixed(0)}cm)
                </text>
              </g>

              {/* Photogate 2 (Gate 2) */}
              <g transform={`translate(${gate2X}, 0)`}>
                <rect
                  x="-5"
                  y={TRACK_Y - 100}
                  width="10"
                  height="120"
                  fill={`url(#${gradientIds.chassisDark})`}
                  stroke="#475569"
                  rx="2"
                />
                <path
                  d={`M -20 ${TRACK_Y - 100} H 20 V ${TRACK_Y - 40} H 12 V ${TRACK_Y - 90} H -12 V ${TRACK_Y - 40} H -20 Z`}
                  fill="#1e293b"
                  stroke="#06b6d4"
                  strokeWidth="1.5"
                />
                <line
                  x1="-12"
                  y1={TRACK_Y - 55}
                  x2="12"
                  y2={TRACK_Y - 55}
                  stroke={gate2Active ? "#ef4444" : "rgba(6,182,212,0.5)"}
                  strokeWidth={gate2Active ? "2.5" : "1.5"}
                  strokeDasharray={gate2Active ? "none" : "2,2"}
                />
                <circle
                  cx="0"
                  cy={TRACK_Y - 110}
                  r="4.5"
                  fill={gate2Active ? "#ef4444" : "#334155"}
                  stroke={gate2Active ? "#fca5a5" : "#475569"}
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
                  G2 ({(gate2Pos * 100).toFixed(0)}cm)
                </text>
              </g>

              {/* Pulley Assembly at Rail End */}
              <g transform={`translate(${PULLEY_X}, ${PULLEY_Y})`}>
                {/* Pulley Bracket Mount */}
                <rect
                  x="-6"
                  y="-8"
                  width="12"
                  height="26"
                  fill="#334155"
                  stroke="#64748b"
                  rx="2"
                />
                {/* Pulley Wheel */}
                <circle
                  cx="0"
                  cy="0"
                  r={PULLEY_R}
                  fill={`url(#${gradientIds.brass})`}
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                />
                <circle cx="0" cy="0" r="4" fill="#0f172a" stroke="#94a3b8" />
                {/* Spoke marks on pulley */}
                <line x1="-12" y1="0" x2="12" y2="0" stroke="#78350f" strokeWidth="1" />
                <line x1="0" y1="-12" x2="0" y2="12" stroke="#78350f" strokeWidth="1" />
              </g>

              {/* String (Connecting Cart Hook -> Pulley -> Hanging Mass) */}
              <g>
                {/* Horizontal String segment */}
                <line
                  x1={cartHookX}
                  y1={cartHookY}
                  x2={PULLEY_X}
                  y2={PULLEY_Y - PULLEY_R + 3}
                  stroke="#f8fafc"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  opacity="0.9"
                />
                {/* Quarter arc around pulley */}
                <path
                  d={`M ${PULLEY_X} ${PULLEY_Y - PULLEY_R + 3} A ${PULLEY_R} ${PULLEY_R} 0 0 1 ${DROP_LINE_X} ${PULLEY_Y + 3}`}
                  fill="none"
                  stroke="#f8fafc"
                  strokeWidth="1.5"
                />
                {/* Vertical String segment dropping down to hanging mass */}
                <line
                  x1={DROP_LINE_X}
                  y1={PULLEY_Y + 3}
                  x2={DROP_LINE_X}
                  y2={hangerY}
                  stroke="#f8fafc"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  opacity="0.9"
                />
              </g>

              {/* Glider / Cart */}
              <g transform={`translate(${cartX}, ${CART_Y})`}>
                {/* Cart Body */}
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
                {/* Skid Cutout */}
                <polygon
                  points={`6,28 14,24 ${CART_LEN_PX - 14},24 ${CART_LEN_PX - 6},28`}
                  fill="#0f172a"
                />

                {/* Additional Slotted Mass (+12.5g) if mounted */}
                {cartHasAddedMass && (
                  <g transform={`translate(${CART_LEN_PX / 2 - 16}, -14)`}>
                    <rect
                      x="0"
                      y="0"
                      width="32"
                      height="12"
                      fill={`url(#${gradientIds.brass})`}
                      stroke="#cbd5e1"
                      strokeWidth="1"
                      rx="2"
                    />
                    <text
                      x="16"
                      y="9"
                      fill="#f8fafc"
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      +12.5g
                    </text>
                  </g>
                )}

                {/* Light Blocker Flag (Single flag w = 3 cm) */}
                <g transform={`translate(${(CART_LEN_PX - flagW_px) / 2}, -30)`}>
                  <rect
                    x="0"
                    y="0"
                    width={flagW_px}
                    height="30"
                    fill="#020617"
                    stroke="#38bdf8"
                    strokeWidth="1"
                  />
                  <rect
                    x="2"
                    y="2"
                    width={flagW_px - 4}
                    height="26"
                    fill="#0369a1"
                    opacity="0.6"
                  />
                  <text
                    x={flagW_px / 2}
                    y="18"
                    fill="#e0f2fe"
                    fontSize="7"
                    fontWeight="bold"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    w=3cm
                  </text>
                </g>

                {/* Hook / Hoop at Cart Front */}
                <circle cx={CART_LEN_PX} cy="14" r="3.5" fill="none" stroke="#e2e8f0" strokeWidth="1.5" />

                {/* Label inside Cart */}
                <text
                  x={CART_LEN_PX / 2}
                  y="18"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  M ({(effectiveCartMass * 1000).toFixed(1)}g)
                </text>
              </g>

              {/* Hanging Mass Hanger Assembly */}
              <g transform={`translate(${DROP_LINE_X}, ${hangerY})`}>
                {/* Hanger Hook Ring */}
                <circle cx="0" cy="0" r="3" fill="none" stroke="#e2e8f0" strokeWidth="1.5" />
                <line x1="0" y1="3" x2="0" y2="8" stroke="#cbd5e1" strokeWidth="1.5" />
                {/* Hanger Disc / Slotted Weights */}
                <rect
                  x="-12"
                  y="8"
                  width="24"
                  height="16"
                  fill={`url(#${gradientIds.brass})`}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  rx="2"
                />
                <text
                  x="0"
                  y="19"
                  fill="#ffffff"
                  fontSize="8"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {(hangingMass * 1000).toFixed(0)}g
                </text>
                {/* Bottom weight stopper rod */}
                <line x1="0" y1="24" x2="0" y2="30" stroke="#94a3b8" strokeWidth="1.5" />
              </g>

              {/* Height Indicator Label for Hanging Mass */}
              <g transform={`translate(${DROP_LINE_X + 22}, ${(hangerY + TABLE_FLOOR_Y) / 2})`}>
                <line
                  x1="0"
                  y1={-(TABLE_FLOOR_Y - hangerY) / 2 + 10}
                  x2="0"
                  y2={(TABLE_FLOOR_Y - hangerY) / 2 - 5}
                  stroke="#f59e0b"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <text
                  x="6"
                  y="3"
                  fill="#f59e0b"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  h = {(currentH * 100).toFixed(1)} cm
                </text>
              </g>

              {/* Vector Overlay */}
              {!isVectorLocked && (
                <VectorOverlay
                  vectors={vectorItems}
                  userScale={arrowScale}
                  maxArrowLength={140}
                  showValues={showValuesInOverlay}
                />
              )}
            </svg>
          </div>
        </div>

        {/* Vector Controls Panel */}
        {!hideVectorControls && (
          <VectorControls
            categories={vectorCategories}
            onToggleCategory={handleToggleCategory}
            arrowScale={arrowScale}
            onScaleChange={setArrowScale}
            showValues={showValues}
            onToggleShowValues={() => setShowValues((prev) => !prev)}
            isQualitative={isQualitative}
            isLocked={isVectorLocked}
            lockMessage={vectorLockMessage}
          />
        )}

        {/* Digital Timer Counter in ACCELERATION mode */}
        <TimerCounter
          mode="ACCELERATION"
          t1={t1}
          t2={t2}
          t12={t12}
          gate1Active={gate1Active}
          gate2Active={gate2Active}
          onReset={handleReset}
          label="DIGITAL TIMER COUNTER — FUNGSI ACCELERATION"
        />
      </div>
    );
  }
);

AirTrackPulleyApparatus.displayName = "AirTrackPulleyApparatus";
