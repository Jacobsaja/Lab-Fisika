"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { calculateFallTime, getFreeFallVectors } from "@/physics/freefall";
import { PlaybackSpeedControl } from "@/components/simulation/PlaybackSpeedControl";
import { usePersistedPlaybackSpeed } from "@/physics/hooks/usePersistedPlaybackSpeed";
import { Activity, Radio } from "lucide-react";
import {
  useMetalGradientIds,
  SvgMetalGradients,
  SvgGridBackground,
  SvgElectromagnet,
  SvgContactPlate,
  SvgMetalBall,
  DigitalDisplayCard,
  SCIENTIFIC_THEME,
  VectorOverlay,
  VectorItem,
  VectorControls,
  VectorCategoryConfig,
} from "@/components/simulation/visual";
import { Stepper } from "@/components/common/Stepper";

// ── Physical Scale & Simulation Coordinates ──────────────────────────
const TIANG_TOP_Y = 50;   // Top of the vertical mast in SVG
const GROUND_Y = 1550;    // Base of mast / contact plate level (lengthened to 1500px span)
const TOTAL_SPAN = GROUND_Y - TIANG_TOP_Y; // 1500 px
const VIEW_W = 440;
const VIEW_H = 1680;
const CENTER_X = 220;

// Visual offset: ball sits just underneath the electromagnet pole tip.
// Physical height h is strictly measured from magnetY (zero calibration bias).
const BALL_VISUAL_OFFSET = 20;

export interface FreeFallApparatusProps {
  className?: string;
  gLocal?: number; // Local gravity acceleration (m/s²)
  mode?: "practicum" | "explore";
  onHeightChange?: (h: number) => void;
  onTimeChange?: (t: number, isFalling: boolean, reset: boolean) => void;
  scaleMaxMeters?: number;
  controlledHeight?: number; // In meters
  isVectorLocked?: boolean;
  speed?: number;
  onSpeedChange?: (speed: number) => void;
  speedStorageKey?: string;
}

export function FreeFallApparatus({ 
  className = "", 
  gLocal = 9.79, 
  mode = "practicum", 
  onHeightChange, 
  onTimeChange,
  scaleMaxMeters = 1.2,
  controlledHeight,
  isVectorLocked = false,
  speed: propSpeed,
  onSpeedChange: propOnSpeedChange,
  speedStorageKey,
}: FreeFallApparatusProps) {
  const [internalSpeed, setInternalSpeed] = usePersistedPlaybackSpeed(speedStorageKey || "gjb", 0.5);
  const activeSpeed = propSpeed ?? internalSpeed;
  const handleSpeedChange = propOnSpeedChange ?? setInternalSpeed;

  const gradientIds = useMetalGradientIds("freefall");
  const svgRef = useRef<SVGSVGElement>(null);
  const reqRef = useRef<number | null>(null);
  const ballRef = useRef<SVGCircleElement>(null);
  const isAutoScrollingRef = useRef(false);
  const idealYRef = useRef<number | null>(null);

  const PX_PER_METER = TOTAL_SPAN / scaleMaxMeters;

  // ── State ──
  const [magnetY, setMagnetY] = useState(250);       // SVG Y coordinate of electromagnet
  const [isDragging, setIsDragging] = useState(false);
  const [isMorsePressed, setIsMorsePressed] = useState(false);
  const [isFalling, setIsFalling] = useState(false);
  const [ballY, setBallY] = useState(250 + BALL_VISUAL_OFFSET);
  const [displayedTime, setDisplayedTime] = useState<number>(0);
  const [finalTime, setFinalTime] = useState<number | null>(null);

  // Callback refs to strictly obey AGENTS.md rule
  const onHeightChangeRef = useRef(onHeightChange);
  onHeightChangeRef.current = onHeightChange;

  const onTimeChangeRef = useRef(onTimeChange);
  onTimeChangeRef.current = onTimeChange;

  // ── Vector Overlay State (Tahap J) ──
  const [vectorState, setVectorState] = useState({
    showWeight: true,
    showVelocity: true,
    showAcceleration: true,
    arrowScale: 1.0,
    showValues: true,
  });

  const isLockedEffective = mode === "practicum" ? isVectorLocked : false;
  const lockMessage = "Vektor kualitatif terkunci. Silakan catat minimal 1 data percobaan pada tabel atau buka Petunjuk Level 3 untuk membukanya.";

  const liveVectors = useMemo(() => {
    return getFreeFallVectors({
      t: displayedTime,
      g: gLocal,
      mass: 0.05,
      isFalling,
    });
  }, [displayedTime, gLocal, isFalling]);

  const vectorCategories: VectorCategoryConfig[] = [
    {
      id: "weight",
      label: "Gaya Berat",
      color: SCIENTIFIC_THEME.vectors.gravity,
      checked: vectorState.showWeight,
      title: "Tampilkan gaya berat (w = mg)",
    },
    {
      id: "velocity",
      label: "Kecepatan",
      color: SCIENTIFIC_THEME.vectors.velocity,
      checked: vectorState.showVelocity,
      title: "Tampilkan kecepatan sesaat (v = gt)",
    },
    {
      id: "acceleration",
      label: "Percepatan",
      color: SCIENTIFIC_THEME.vectors.acceleration,
      checked: vectorState.showAcceleration,
      title: "Tampilkan percepatan gravitasi (a = g)",
    },
  ];

  const handleToggleCategory = (catId: string) => {
    if (isLockedEffective) return;
    if (catId === "weight") setVectorState((s) => ({ ...s, showWeight: !s.showWeight }));
    else if (catId === "velocity") setVectorState((s) => ({ ...s, showVelocity: !s.showVelocity }));
    else if (catId === "acceleration") setVectorState((s) => ({ ...s, showAcceleration: !s.showAcceleration }));
  };

  const showValuesInOverlay = mode === "explore" && vectorState.showValues;

  const vectorItems: VectorItem[] = [];
  if (vectorState.showWeight) {
    vectorItems.push({
      id: "w",
      category: "weight",
      label: "w",
      origin: { x: CENTER_X + 55, y: ballY },
      components: { dx: 0, dy: liveVectors.w },
      color: SCIENTIFIC_THEME.vectors.gravity,
      scale: 120,
      showValue: showValuesInOverlay,
      valueText: `${liveVectors.w.toFixed(2)} N`,
    });
  }
  if (vectorState.showVelocity && liveVectors.v > 1e-4) {
    vectorItems.push({
      id: "v",
      category: "velocity",
      label: "v",
      origin: { x: CENTER_X + 90, y: ballY },
      components: { dx: 0, dy: liveVectors.v },
      color: SCIENTIFIC_THEME.vectors.velocity,
      scale: 25,
      showValue: showValuesInOverlay,
      valueText: `${liveVectors.v.toFixed(2)} m/s`,
    });
  }
  if (vectorState.showAcceleration) {
    vectorItems.push({
      id: "a",
      category: "acceleration",
      label: "a",
      origin: { x: CENTER_X + 125, y: ballY },
      components: { dx: 0, dy: liveVectors.a },
      color: SCIENTIFIC_THEME.vectors.acceleration,
      scale: 10,
      showValue: showValuesInOverlay,
      valueText: `${liveVectors.a.toFixed(2)} m/s²`,
    });
  }

  // Sync controlledHeight -> magnetY
  useEffect(() => {
    if (controlledHeight !== undefined && !isDragging && !isFalling && !isMorsePressed) {
      const newY = GROUND_Y - (controlledHeight * PX_PER_METER);
      if (Math.abs(magnetY - newY) > 0.01) {
        setMagnetY(newY);
        setBallY(newY + BALL_VISUAL_OFFSET);
      }
    }
  }, [controlledHeight, PX_PER_METER, isDragging, isFalling, isMorsePressed, magnetY]);

  // ── Coordinate Conversion ──
  const pixelsToMeters = useCallback(
    (svgY: number) => Math.max(0, (GROUND_Y - svgY) / PX_PER_METER),
    [PX_PER_METER]
  );

  // ── Magnet Dragging ──
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isMorsePressed || isFalling) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !svgRef.current) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());

    // Magnet height travel range across the lengthened track
    let newY = svgP.y;
    if (newY < TIANG_TOP_Y + 40) newY = TIANG_TOP_Y + 40;
    if (newY > GROUND_Y - 80) newY = GROUND_Y - 80;

    setMagnetY(newY);
    onHeightChangeRef.current?.(pixelsToMeters(newY));
    
    if (!isFalling && !isMorsePressed) {
      setBallY(newY + BALL_VISUAL_OFFSET);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsDragging(false);
    }
  };

  // ── Morse Key Actuation ──
  const handleMorsePress = () => {
    if (isDragging) return;
    setIsMorsePressed(true);
    setIsFalling(false);
    setBallY(magnetY + BALL_VISUAL_OFFSET); // Ball adheres to electromagnet
    setDisplayedTime(0);
    setFinalTime(null);
    onTimeChangeRef.current?.(0, false, true);
    if (reqRef.current) cancelAnimationFrame(reqRef.current);

    // Initial focus on the armed sphere
    if (ballRef.current) {
      const targetViewportY = Math.max(80, Math.min(window.innerHeight * 0.28, 250));
      const currentRect = ballRef.current.getBoundingClientRect();
      const diff = currentRect.top - targetViewportY;
      scrollAncestorBy(diff, ballRef.current);
    }
  };

  // ── Ball Drop Trigger ──
  const triggerDrop = useCallback(() => {
    if (isFalling) return;
    setIsMorsePressed(false);
    setIsFalling(true);
    setDisplayedTime(0);
    setFinalTime(null);
    if (reqRef.current) cancelAnimationFrame(reqRef.current);

    isAutoScrollingRef.current = true;
    const targetViewportY = Math.max(80, Math.min(window.innerHeight * 0.28, 250));
    idealYRef.current = targetViewportY;

    // Immediately align camera to falling sphere at start
    if (ballRef.current) {
      const currentRect = ballRef.current.getBoundingClientRect();
      const diff = currentRect.top - targetViewportY;
      scrollAncestorBy(diff, ballRef.current);
    }

    const h = pixelsToMeters(magnetY);
    const { t: actualTime } = calculateFallTime(h, gLocal, mode === "practicum");

    const ballStartY = magnetY + BALL_VISUAL_OFFSET;
    const ballEndY = GROUND_Y - 12; // Striking the brass contact pad
    let startAnim: number | null = null;
    
    // Duration in milliseconds scaled by chosen playback speed
    const durationMs = (actualTime * 1000) / activeSpeed;

    const animate = (timestamp: number) => {
      if (!startAnim) startAnim = timestamp;
      const progress = (timestamp - startAnim) / durationMs;

      if (progress >= 1) {
        setBallY(ballEndY);
        setDisplayedTime(actualTime);
        setFinalTime(actualTime);
        setIsFalling(false);
        onTimeChangeRef.current?.(actualTime, false, false);
      } else {
        // Quadratic trajectory (progress²) replicating constant acceleration
        const currentY = ballStartY + (ballEndY - ballStartY) * progress * progress;
        setBallY(currentY);
        
        const currTime = actualTime * progress;
        setDisplayedTime(currTime);
        onTimeChangeRef.current?.(currTime, true, false);

        // Dynamic 60 FPS Camera Tracking Shot
        if (isAutoScrollingRef.current && ballRef.current && idealYRef.current !== null) {
          const currentRect = ballRef.current.getBoundingClientRect();
          const diff = currentRect.top - idealYRef.current;
          if (Math.abs(diff) > 0.5) { 
            scrollAncestorBy(diff, ballRef.current);
          }
        }
        
        reqRef.current = requestAnimationFrame(animate);
      }
    };

    reqRef.current = requestAnimationFrame(animate);
  }, [isFalling, magnetY, gLocal, mode, activeSpeed, pixelsToMeters]);

  const handleMorseRelease = useCallback(() => {
    if (!isMorsePressed) return;
    triggerDrop();
  }, [isMorsePressed, triggerDrop]);

  // Clean up RAF on unmount & cancel camera tracking on user scroll
  useEffect(() => {
    const cancelAutoScroll = () => {
      isAutoScrollingRef.current = false;
    };
    
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
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, []);

  // ── High-Contrast Engraved Scale Ticks ──
  const scaleTicks = useMemo(() => {
    const ticks: React.ReactNode[] = [];
    const isLargeScale = scaleMaxMeters > 2;

    if (isLargeScale) {
      // Metric scale in meters (Explore Mode, up to scaleMaxMeters)
      const maxMeters = Math.ceil(scaleMaxMeters);
      for (let m = 0; m <= maxMeters; m += 0.1) {
        const roundedM = Math.round(m * 10) / 10;
        const y = GROUND_Y - roundedM * PX_PER_METER;
        if (y < TIANG_TOP_Y - 5 || y > GROUND_Y + 5) continue;

        const isWholeMeter = Math.round(roundedM) === roundedM;
        const isHalfMeter = !isWholeMeter && Math.round(roundedM * 2) === roundedM * 2;

        let tickLen: number;
        let sw: number;
        let color: string;

        if (isWholeMeter) {
          tickLen = 24;
          sw = 2;
          color = SCIENTIFIC_THEME.typography.scaleTickMajor;
        } else if (isHalfMeter) {
          tickLen = 16;
          sw = 1.4;
          color = "#cbd5e1";
        } else {
          tickLen = 9;
          sw = 0.9;
          color = SCIENTIFIC_THEME.typography.scaleTick;
        }

        ticks.push(
          <line
            key={`m-${roundedM}`}
            x1={0}
            y1={y}
            x2={tickLen}
            y2={y}
            stroke={color}
            strokeWidth={sw}
          />
        );

        if (isWholeMeter && roundedM > 0) {
          ticks.push(
            <text
              key={`lbl-${roundedM}`}
              x={-8}
              y={y + 5}
              fontSize="13"
              fontFamily={SCIENTIFIC_THEME.typography.fontMono}
              fill={SCIENTIFIC_THEME.typography.scaleTextMajor}
              textAnchor="end"
              fontWeight="bold"
            >
              {roundedM}
            </text>
          );
        }
      }
    } else {
      // Centimeter/Millimeter scale (Practicum Mode, up to 120 cm)
      const maxMm = scaleMaxMeters * 1000;
      for (let mm = 0; mm <= maxMm; mm += 1) {
        const y = GROUND_Y - (mm / 1000) * PX_PER_METER;
        if (y < TIANG_TOP_Y - 5 || y > GROUND_Y + 5) continue;

        const isTenCm = mm % 100 === 0;
        const isFiveCm = !isTenCm && mm % 50 === 0;
        const isCm = !isTenCm && !isFiveCm && mm % 10 === 0;
        const isFiveMm = !isTenCm && !isFiveCm && !isCm && mm % 5 === 0;

        if (!isTenCm && !isFiveCm && !isCm && !isFiveMm && mm % 2 !== 0) continue;

        let tickLen: number;
        let sw: number;
        let color: string;

        if (isTenCm) {
          tickLen = 22;
          sw = 1.8;
          color = SCIENTIFIC_THEME.typography.scaleTickMajor;
        } else if (isFiveCm) {
          tickLen = 15;
          sw = 1.4;
          color = "#cbd5e1";
        } else if (isCm) {
          tickLen = 10;
          sw = 1;
          color = SCIENTIFIC_THEME.typography.scaleTick;
        } else if (isFiveMm) {
          tickLen = 6;
          sw = 0.8;
          color = "#64748b";
        } else {
          tickLen = 3;
          sw = 0.5;
          color = "#475569";
        }

        ticks.push(
          <line
            key={`mm-${mm}`}
            x1={0}
            y1={y}
            x2={tickLen}
            y2={y}
            stroke={color}
            strokeWidth={sw}
          />
        );

        if (isTenCm && mm > 0) {
          ticks.push(
            <text
              key={`lbl-${mm}`}
              x={-7}
              y={y + 4.5}
              fontSize="12"
              fontFamily={SCIENTIFIC_THEME.typography.fontMono}
              fill={SCIENTIFIC_THEME.typography.scaleTextMajor}
              textAnchor="end"
              fontWeight="600"
            >
              {mm / 10}
            </text>
          );
        }
      }
    }

    return ticks;
  }, [scaleMaxMeters, PX_PER_METER]);

  const currentHeightMeters = pixelsToMeters(magnetY);

  return (
    <div
      className={`relative w-full rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-slate-950 via-[#0a0f1d] to-slate-950 shadow-[0_12px_40px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden ${className}`}
      style={{ fontFamily: SCIENTIFIC_THEME.typography.fontMono }}
    >
      {/* Top Header Information Ribbon */}
      <div className="w-full flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-slate-950/60 text-[11px] text-slate-400 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
          <h3 className="font-bold tracking-wider text-cyan-300 uppercase">
            ALAT GERAK JATUH BEBAS (GJB)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 font-bold">
            h = {scaleMaxMeters > 2 
              ? `${currentHeightMeters.toFixed(2)} m` 
              : `${(currentHeightMeters * 100).toFixed(1)} cm`}
          </span>
          <span className="px-2 py-0.5 rounded border border-slate-800 bg-slate-900/60 text-slate-300 font-mono">
            g = {gLocal.toFixed(2)} m/s²
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row w-full relative min-h-0">
        {/* ── LEFT SECTION: SVG EXPERIMENT APPARATUS ── */}
        <div className="flex-1 h-full min-h-0 flex justify-center items-center p-2 sm:p-4 touch-none select-none relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="w-full max-w-[560px] h-auto drop-shadow-2xl"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
          >
            {/* Instance-unique SVG Metal Gradients */}
            <SvgMetalGradients ids={gradientIds} />

            {/* Precision Coordinate Grid */}
            <SvgGridBackground width={VIEW_W} height={VIEW_H} gridSize={30} opacity={0.3} />

            {/* ── 1. STRUCTURAL VERTICAL MAST ── */}
            {/* Mast Outer Frame Channel */}
            <rect
              x={CENTER_X - 22}
              y={TIANG_TOP_Y}
              width="44"
              height={GROUND_Y - TIANG_TOP_Y}
              rx="3"
              fill={`url(#${gradientIds.chassisDark})`}
              stroke="#1e293b"
              strokeWidth="1.5"
            />
            {/* Stainless Steel Center Guide Rail */}
            <rect
              x={CENTER_X - 16}
              y={TIANG_TOP_Y}
              width="32"
              height={GROUND_Y - TIANG_TOP_Y}
              fill={`url(#${gradientIds.steelVertical})`}
              opacity="0.9"
            />

            {/* Precision Engraved Scale Ruler */}
            <g transform={`translate(${CENTER_X - 16}, 0)`}>{scaleTicks}</g>

            {/* Scale Unit Badge (m atau cm) */}
            <text
              x={CENTER_X - 48}
              y={GROUND_Y + 45}
              fontSize="12"
              fontFamily={SCIENTIFIC_THEME.typography.fontMono}
              fill={SCIENTIFIC_THEME.typography.labelMuted}
              textAnchor="middle"
              fontWeight="bold"
            >
              {scaleMaxMeters > 2 ? "(m)" : "(cm)"}
            </text>

            {/* ── 2. BASE GROUNDING & BRASS CONTACT PLATE ── */}
            <SvgContactPlate
              x={CENTER_X}
              y={GROUND_Y}
              width={160}
              brassFillId={gradientIds.brass}
              chassisFillId={gradientIds.chassisDark}
            />

            {/* ── 3. ADJUSTABLE ELECTROMAGNET RELEASE ── */}
            <SvgElectromagnet
              x={CENTER_X + 13}
              y={magnetY}
              armed={isMorsePressed}
              coilFillId={gradientIds.copper}
              chassisFillId={gradientIds.chassisDark}
              isDragging={isDragging}
              disabled={isMorsePressed || isFalling}
              onPointerDown={handlePointerDown}
            />

            {/* ── 4. PRECISION FALLING METAL SPHERE (ZERO FILTERS) ── */}
            <SvgMetalBall
              ref={ballRef}
              cx={CENTER_X}
              cy={ballY}
              r={12}
              fillId={gradientIds.ballChrome}
            />

            {/* ── 5. PHYSICAL VECTOR OVERLAY (TAHAP J) ── */}
            {!isLockedEffective && (
              <VectorOverlay
                vectors={vectorItems}
                userScale={vectorState.arrowScale}
                showValues={showValuesInOverlay}
                maxArrowLength={140}
              />
            )}
          </svg>
        </div>

        {/* ── RIGHT SECTION: ELECTRONIC SCALER COUNTER & MORSE ACTUATOR ── */}
        <div className="w-full lg:w-80 bg-slate-900/90 border-t lg:border-t-0 lg:border-l border-cyan-500/20 p-5 sm:p-6 flex flex-col justify-between shrink-0 relative shadow-inner z-10 backdrop-blur-md">
          
          {/* Top: Precision Digital Scaler Counter & Vector Controls */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <DigitalDisplayCard
                label="SCALER COUNTER"
                value={displayedTime.toFixed(3)}
                unit="s"
                variant="red"
                size="lg"
                indicatorLed={{
                  active: isFalling || isMorsePressed,
                  color: isFalling ? "red" : isMorsePressed ? "emerald" : "cyan",
                  label: isFalling ? "PULSE" : isMorsePressed ? "ARMED" : "STANDBY",
                }}
              />
              <div className="text-right text-slate-500 text-[10px] font-bold font-mono px-1">
                RESOLUSI: 0.001 s
              </div>
            </div>

            {/* Recorded Fall Time Result Badge */}
            {finalTime !== null && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl shadow-lg flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                    WAKTU JATUH (t)
                  </p>
                  <p className="text-lg font-mono font-bold text-emerald-300">
                    {finalTime.toFixed(3)} s
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    KETINGGIAN (h)
                  </p>
                  <p className="text-sm font-mono text-cyan-300 font-bold">
                    {scaleMaxMeters > 2 
                      ? `${currentHeightMeters.toFixed(2)} m` 
                      : `${(currentHeightMeters * 100).toFixed(1)} cm`}
                  </p>
                </div>
              </div>
            )}

            {/* Stepper for Height Adjustment */}
            <Stepper
              label="Atur Ketinggian (h)"
              value={Number((currentHeightMeters * 100).toFixed(1))}
              onChange={(newCm) => {
                if (isMorsePressed || isFalling) return;
                const newMeters = newCm / 100;
                let newY = GROUND_Y - (newMeters * PX_PER_METER);
                if (newY < TIANG_TOP_Y + 40) newY = TIANG_TOP_Y + 40;
                if (newY > GROUND_Y - 80) newY = GROUND_Y - 80;
                setMagnetY(newY);
                onHeightChangeRef.current?.(pixelsToMeters(newY));
                if (!isFalling && !isMorsePressed) {
                  setBallY(newY + BALL_VISUAL_OFFSET);
                }
              }}
              min={10}
              max={115}
              fineStep={1}
              coarseStep={5}
              unit="cm"
              precision={1}
              disabled={isFalling || isMorsePressed}
              className="my-1"
            />

            {/* ── Vector Controls (Tahap J) ── */}
            <VectorControls
              categories={vectorCategories}
              onToggleCategory={handleToggleCategory}
              arrowScale={vectorState.arrowScale}
              onScaleChange={(scale) => setVectorState((s) => ({ ...s, arrowScale: scale }))}
              showValues={vectorState.showValues}
              onToggleShowValues={() => setVectorState((s) => ({ ...s, showValues: !s.showValues }))}
              isQualitative={mode === "practicum"}
              isLocked={isLockedEffective}
              lockMessage={lockMessage}
              className="mt-1"
            />
          </div>

          {/* Bottom: Quick Release & Tactical Morse Key Push Switch */}
          <div className="mt-6 md:mt-0 flex flex-col items-center gap-3">
            <PlaybackSpeedControl
              speed={activeSpeed}
              onSpeedChange={handleSpeedChange}
              disabled={isFalling}
              className="justify-center w-full"
            />
            <button
              data-testid="btn-play"
              onClick={triggerDrop}
              disabled={isFalling || isMorsePressed}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs tracking-wider rounded-lg shadow-md disabled:opacity-40 transition-all uppercase flex items-center justify-center gap-2"
            >
              LEPAS BOLA (QUICK DROP)
            </button>
            <button
              data-testid="btn-reset"
              onClick={handleMorsePress}
              disabled={isFalling}
              className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs tracking-wider rounded-lg border border-slate-700 disabled:opacity-40 transition-all uppercase flex items-center justify-center gap-2"
            >
              RESET BOLA
            </button>
            <div className="flex items-center gap-2 text-slate-300 text-xs font-bold tracking-wider uppercase mb-1">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              SAKLAR PELEPAS (MORSE KEY)
            </div>

            {/* Industrial Momentary Button */}
            <button
              onPointerDown={handleMorsePress}
              onPointerUp={handleMorseRelease}
              onPointerLeave={handleMorseRelease}
              className={`
                w-24 h-24 rounded-full relative outline-none select-none transition-all duration-75 flex items-center justify-center
                ${
                  isMorsePressed
                    ? "bg-emerald-600 shadow-[inset_0_4px_12px_rgba(0,0,0,0.8),0_0_20px_rgba(16,185,129,0.5)] translate-y-1.5"
                    : "bg-gradient-to-b from-slate-700 to-slate-800 shadow-[0_10px_25px_rgba(0,0,0,0.7),inset_0_-4px_10px_rgba(0,0,0,0.4)] hover:brightness-110 active:translate-y-1.5"
                }
              `}
              style={{ border: "6px solid #475569" }}
            >
              <div className="w-16 h-16 rounded-full border border-slate-600 flex flex-col items-center justify-center text-center p-1 pointer-events-none">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                  {isMorsePressed ? "ARMED" : "HOLD"}
                </span>
                <span className="text-[8px] text-slate-400 leading-none mt-0.5">
                  {isMorsePressed ? "MAGNET ON" : "TEKAN"}
                </span>
              </div>
            </button>

            <p className="text-[11px] text-center text-slate-400 px-2 leading-relaxed">
              <strong>Tahan (Klik Kiri)</strong> untuk menyalakan magnet dan menempelkan bola. <strong>Lepas</strong> untuk menjatuhkan.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
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
