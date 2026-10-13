"use client";

import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from "react";
import {
  CylinderShape,
  calculateRollingAcceleration,
  getRollingState,
  getRollingVectors,
  generateSensorSample,
  SENSOR_SAMPLE_INTERVAL_S,
} from "@/physics/rollingMotion";
import {
  useMetalGradientIds,
  SvgMetalGradients,
  SvgGridBackground,
  SvgRollingCylinder,
  VectorOverlay,
  VectorControls,
  VectorCategoryConfig,
  ExtraToggleConfig,
  VectorItem,
  SCIENTIFIC_THEME,
} from "@/components/simulation/visual";

export interface RollingVectorState {
  showWeight: boolean;
  showNormal: boolean;
  showFriction: boolean;
  showAcceleration: boolean;
  decomposeWeight: boolean;
  arrowScale: number;
  showValues: boolean;
}

export interface RollingApparatusProps {
  mode: "explore" | "practicum";
  shape: CylinderShape;
  compareShape?: CylinderShape; // If provided, shows a second track for comparison
  thetaDeg: number;
  mass: number; // in kg
  r: number; // in meters
  rInner?: number; // in meters
  gLocal?: number;
  onTimeChange?: (t: number, isRunning: boolean, reset: boolean) => void;
  onStateUpdate?: (state: any, compareState?: any) => void;
  className?: string;
  // Vector overlay & controls props
  vectorControls?: RollingVectorState;
  onVectorControlsChange?: (state: RollingVectorState) => void;
  isVectorLocked?: boolean;
  vectorLockMessage?: string;
  hideVectorControls?: boolean;
}

export interface RollingApparatusRef {
  start: () => void;
  pause: () => void;
  reset: () => void;
}

const PX_PER_METER = 500;
const INCLINE_LENGTH_M = 1.5; // 1.5 meters track
const INCLINE_LENGTH_PX = INCLINE_LENGTH_M * PX_PER_METER;
const GROUND_X = 900;

export const RollingApparatus = forwardRef<RollingApparatusRef, RollingApparatusProps>(
  (
    {
      mode,
      shape,
      compareShape,
      thetaDeg,
      mass,
      r,
      rInner = 0,
      gLocal = 9.8,
      onTimeChange,
      onStateUpdate,
      className = "",
      vectorControls: controlledVectorControls,
      onVectorControlsChange,
      isVectorLocked = false,
      vectorLockMessage,
      hideVectorControls = false,
    },
    ref
  ) => {
    const gradientIds = useMetalGradientIds("rolling");
    const svgRef = useRef<SVGSVGElement>(null);
    const reqRef = useRef<number | null>(null);

    const [isAnimating, setIsAnimating] = useState(false);
    const [simTime, setSimTime] = useState(0);

    const simTimeRef = useRef(0);
    const lastTimestampRef = useRef<number | null>(null);
    const isAnimatingRef = useRef(false);
    /** Next fixed-grid sensor sample to emit (practicum mode). Index 0 (t = 0) is skipped. */
    const nextSampleIndexRef = useRef(1);

    // Vector state
    const isQualitative = mode === "practicum";

    const [internalVectorControls, setInternalVectorControls] = useState<RollingVectorState>({
      showWeight: true,
      showNormal: true,
      showFriction: true,
      showAcceleration: true,
      decomposeWeight: false,
      arrowScale: 1.0,
      showValues: !isQualitative,
    });

    const activeVectorControls = controlledVectorControls ?? internalVectorControls;

    const handleToggleCategory = (id: string) => {
      if (isVectorLocked) return;
      const updated = { ...activeVectorControls };
      if (id === "weight") updated.showWeight = !updated.showWeight;
      if (id === "normal") updated.showNormal = !updated.showNormal;
      if (id === "friction") updated.showFriction = !updated.showFriction;
      if (id === "acceleration") updated.showAcceleration = !updated.showAcceleration;

      if (onVectorControlsChange) {
        onVectorControlsChange(updated);
      } else {
        setInternalVectorControls(updated);
      }
    };

    const handleScaleChange = (scale: number) => {
      if (isVectorLocked) return;
      const updated = { ...activeVectorControls, arrowScale: scale };
      if (onVectorControlsChange) {
        onVectorControlsChange(updated);
      } else {
        setInternalVectorControls(updated);
      }
    };

    const handleToggleShowValues = () => {
      if (isVectorLocked || isQualitative) return;
      const updated = { ...activeVectorControls, showValues: !activeVectorControls.showValues };
      if (onVectorControlsChange) {
        onVectorControlsChange(updated);
      } else {
        setInternalVectorControls(updated);
      }
    };

    const rollingCategories: VectorCategoryConfig[] = [
      {
        id: "weight",
        label: "Gaya Berat",
        color: SCIENTIFIC_THEME.vectors.gravity,
        checked: activeVectorControls.showWeight,
        title: "Tampilkan gaya berat (w)",
      },
      {
        id: "normal",
        label: "Gaya Normal",
        color: SCIENTIFIC_THEME.vectors.tensionNormal,
        checked: activeVectorControls.showNormal,
        title: "Tampilkan gaya normal (N)",
      },
      {
        id: "friction",
        label: "Gaya Gesek",
        color: SCIENTIFIC_THEME.vectors.friction,
        dashed: true,
        checked: activeVectorControls.showFriction,
        title: "Tampilkan gaya gesek statis (f)",
      },
      {
        id: "acceleration",
        label: "Percepatan",
        color: SCIENTIFIC_THEME.vectors.acceleration,
        checked: activeVectorControls.showAcceleration,
        title: "Tampilkan percepatan linier pusat massa (a)",
      },
    ];

    const extraToggles: ExtraToggleConfig[] = [
      {
        id: "decomposeWeight",
        label: "Uraikan berat",
        checked: activeVectorControls.decomposeWeight,
        onToggle: () => {
          if (isVectorLocked) return;
          const updated = { ...activeVectorControls, decomposeWeight: !activeVectorControls.decomposeWeight };
          if (onVectorControlsChange) onVectorControlsChange(updated);
          else setInternalVectorControls(updated);
        },
        title: "Uraikan gaya berat w menjadi komponen sejajar (w∥) dan tegak lurus (w⊥)",
      },
    ];

    // Track 1 & 2 physics params
    const a1 = calculateRollingAcceleration(shape, thetaDeg, r, rInner, gLocal);
    const a2 = compareShape ? calculateRollingAcceleration(compareShape, thetaDeg, r, rInner, gLocal) : 0;

    const [s1, setS1] = useState(0);
    const [theta1, setTheta1] = useState(0);

    const [s2, setS2] = useState(0);
    const [theta2, setTheta2] = useState(0);

    useImperativeHandle(ref, () => ({
      start: () => {
        if (!isAnimatingRef.current) {
          isAnimatingRef.current = true;
          setIsAnimating(true);
          lastTimestampRef.current = performance.now();
          reqRef.current = requestAnimationFrame(animate);
        }
      },
      pause: () => {
        isAnimatingRef.current = false;
        setIsAnimating(false);
        if (reqRef.current) cancelAnimationFrame(reqRef.current);
      },
      reset: () => {
        isAnimatingRef.current = false;
        setIsAnimating(false);
        if (reqRef.current) cancelAnimationFrame(reqRef.current);
        simTimeRef.current = 0;
        nextSampleIndexRef.current = 1;
        setSimTime(0);
        setS1(0);
        setTheta1(0);
        setS2(0);
        setTheta2(0);
        if (onTimeChange) onTimeChange(0, false, true);
        
        // Push initial state
        if (onStateUpdate) {
          onStateUpdate(
            getRollingState(0, a1, r, shape === "block"),
            compareShape ? getRollingState(0, a2, r, compareShape === "block") : undefined
          );
        }
      },
    }));

    const onStateUpdateRef = useRef(onStateUpdate);
    useEffect(() => {
      onStateUpdateRef.current = onStateUpdate;
    }, [onStateUpdate]);

    // Auto update state on prop change if not running
    useEffect(() => {
      if (!isAnimatingRef.current && simTimeRef.current === 0) {
        if (onStateUpdateRef.current) {
          onStateUpdateRef.current(
            getRollingState(0, a1, r, shape === "block"),
            compareShape ? getRollingState(0, a2, r, compareShape === "block") : undefined
          );
        }
      }
    }, [a1, a2, shape, compareShape, r]);

    const animate = (timestamp: number) => {
      if (!isAnimatingRef.current) return;

      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      
      const deltaT = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      // Slow-motion factor 0.5x for crisp visual observation of rotation
      const SLOW_MO = 0.5;
      simTimeRef.current += deltaT * SLOW_MO;
      const currentT = simTimeRef.current;

      setSimTime(currentT);

      const state1 = getRollingState(currentT, a1, r, shape === "block");
      setS1(state1.s);
      setTheta1(state1.theta);

      let state2: any = undefined;
      if (compareShape) {
        state2 = getRollingState(currentT, a2, r, compareShape === "block");
        setS2(state2.s);
        setTheta2(state2.theta);
      }

      if (onStateUpdate) {
        if (mode === "practicum") {
          // Emit deterministic noisy samples on a fixed time grid (t_i = i · interval)
          while (true) {
            const i = nextSampleIndexRef.current;
            const tSample = i * SENSOR_SAMPLE_INTERVAL_S;
            if (tSample > currentT) break;
            if (getRollingState(tSample, a1, r, shape === "block").s > INCLINE_LENGTH_M) break;
            onStateUpdate(generateSensorSample(shape, thetaDeg, i, a1, r), state2);
            nextSampleIndexRef.current = i + 1;
          }
        } else {
          onStateUpdate(state1, state2);
        }
      }

      if (onTimeChange) {
        onTimeChange(currentT, true, false);
      }

      // Check termination
      if (state1.s >= INCLINE_LENGTH_M && (!compareShape || state2.s >= INCLINE_LENGTH_M)) {
        isAnimatingRef.current = false;
        setIsAnimating(false);
        if (onTimeChange) onTimeChange(currentT, false, false);
        return;
      }

      reqRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
      return () => {
        if (reqRef.current) cancelAnimationFrame(reqRef.current);
      };
    }, []);

    // ── RENDER TRACK & ROLLING BODY COMPONENT ──
    const renderTrackAndBody = (
      baseY: number,
      currentS: number,
      currentAngle: number,
      bodyShape: CylinderShape,
      accentColor: string,
      label: string,
      trackIndex: number
    ) => {
      const thetaRad = (thetaDeg * Math.PI) / 180;
      
      const pivotX = GROUND_X;
      const pivotY = baseY;
      
      const topX = pivotX - INCLINE_LENGTH_PX * Math.cos(thetaRad);
      const topY = pivotY - INCLINE_LENGTH_PX * Math.sin(thetaRad);

      // Object position (s clamped to max physical length visually)
      const visualS = Math.min(currentS, INCLINE_LENGTH_M) * PX_PER_METER;
      const cx = topX + visualS * Math.cos(thetaRad);
      const cy = topY + visualS * Math.sin(thetaRad);

      const rPx = r * PX_PER_METER;
      const rInnerPx = rInner * PX_PER_METER;

      // Normal vector lifting object above the track surface (perpendicular to slope)
      const nx = Math.sin(thetaRad);
      const ny = Math.cos(thetaRad);

      const objX = cx + nx * rPx;
      const objY = cy - ny * rPx;

      // Arc radius for protractor angle representation
      const arcR = Math.min(70, INCLINE_LENGTH_PX * 0.2);

      const vecData = getRollingVectors({
        shape: bodyShape,
        thetaDeg,
        mass,
        r,
        rInner,
        g: gLocal,
      });

      const trackVectors: VectorItem[] = [];
      const showValuesInOverlay = !isQualitative && activeVectorControls.showValues;
      const forceScale = 22;
      const accelScale = 25;

      const cosT = Math.cos(thetaRad);
      const sinT = Math.sin(thetaRad);

      // 1. Gaya Berat w
      if (activeVectorControls.showWeight && vecData.w > 0) {
        if (!activeVectorControls.decomposeWeight) {
          // Total weight pointing vertically down from center
          trackVectors.push({
            id: `w-${trackIndex}`,
            category: "weight",
            label: "w",
            origin: { x: objX, y: objY },
            components: { dx: 0, dy: vecData.w },
            color: SCIENTIFIC_THEME.vectors.gravity,
            scale: forceScale,
            showValue: showValuesInOverlay,
            valueText: `${vecData.w.toFixed(2)} N`,
          });
        } else {
          // Decomposed components:
          // wParallel (down the incline): dx = cosT, dy = sinT
          if (vecData.wParallel > 1e-4) {
            trackVectors.push({
              id: `wPar-${trackIndex}`,
              category: "weight",
              label: "w∥",
              origin: { x: objX, y: objY },
              components: { dx: vecData.wParallel * cosT, dy: vecData.wParallel * sinT },
              color: SCIENTIFIC_THEME.vectors.gravity,
              dashed: true,
              strokeDasharray: "5 3",
              scale: forceScale,
              showValue: showValuesInOverlay,
              valueText: `${vecData.wParallel.toFixed(2)} N`,
            });
          }
          // wPerpendicular (perpendicular into the incline): dx = -sinT, dy = cosT
          if (vecData.wPerpendicular > 1e-4) {
            trackVectors.push({
              id: `wPerp-${trackIndex}`,
              category: "weight",
              label: "w⊥",
              origin: { x: objX, y: objY },
              components: { dx: -vecData.wPerpendicular * sinT, dy: vecData.wPerpendicular * cosT },
              color: SCIENTIFIC_THEME.vectors.gravity,
              dashed: true,
              strokeDasharray: "5 3",
              scale: forceScale,
              showValue: showValuesInOverlay,
              valueText: `${vecData.wPerpendicular.toFixed(2)} N`,
            });
          }
        }
      }

      // 2. Gaya Normal N (perpendicular outward from incline contact point)
      if (activeVectorControls.showNormal && vecData.N > 1e-4) {
        trackVectors.push({
          id: `N-${trackIndex}`,
          category: "normal",
          label: "N",
          origin: { x: cx, y: cy },
          components: { dx: vecData.N * sinT, dy: -vecData.N * cosT },
          color: SCIENTIFIC_THEME.vectors.tensionNormal,
          scale: forceScale,
          showValue: showValuesInOverlay,
          valueText: `${vecData.N.toFixed(2)} N`,
        });
      }

      // 3. Gaya Gesek Statis f (along the incline up, from contact point)
      if (activeVectorControls.showFriction && vecData.f > 1e-4) {
        trackVectors.push({
          id: `f-${trackIndex}`,
          category: "friction",
          label: "f",
          origin: { x: cx, y: cy },
          components: { dx: -vecData.f * cosT, dy: -vecData.f * sinT },
          color: SCIENTIFIC_THEME.vectors.friction,
          dashed: true,
          strokeDasharray: "5 3",
          scale: forceScale,
          showValue: showValuesInOverlay,
          valueText: `${vecData.f.toFixed(2)} N`,
        });
      }

      // 4. Percepatan translasi a (along the incline down, from center)
      if (activeVectorControls.showAcceleration && vecData.a > 1e-4) {
        trackVectors.push({
          id: `a-${trackIndex}`,
          category: "acceleration",
          label: "a",
          origin: { x: objX, y: objY },
          components: { dx: vecData.a * cosT, dy: vecData.a * sinT },
          color: SCIENTIFIC_THEME.vectors.acceleration,
          scale: accelScale,
          showValue: showValuesInOverlay,
          valueText: `${vecData.a.toFixed(2)} m/s²`,
        });
      }

      return (
        <g key={`track-${trackIndex}`}>
          {/* 1. Track Parameter Badge / Label (Scientific Instrument Tag) */}
          <g transform={`translate(55, ${baseY - 145})`}>
            <rect
              x="0"
              y="0"
              width="240"
              height="28"
              rx="6"
              fill="rgba(15, 23, 42, 0.9)"
              stroke={accentColor}
              strokeWidth="1.2"
            />
            <circle cx="14" cy="14" r="3.5" fill={accentColor} />
            <text
              x="26"
              y="18"
              fill="#ffffff"
              fontSize="11"
              fontWeight="bold"
              fontFamily={SCIENTIFIC_THEME.typography.fontMono}
              letterSpacing="0.5"
            >
              {label}
            </text>
          </g>

          {/* 2. Bench Ground Support Surface */}
          <line
            x1="45"
            y1={baseY}
            x2={GROUND_X + 80}
            y2={baseY}
            stroke="#334155"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Ground Bench Tick Marks */}
          {[-20, 0, 20, 40, 60].map((dx) => (
            <line
              key={dx}
              x1={GROUND_X + dx}
              y1={baseY + 3}
              x2={GROUND_X + dx - 8}
              y2={baseY + 12}
              stroke="#1e293b"
              strokeWidth="1.5"
            />
          ))}

          {/* 3. Incline Truss Structure / Backing Wedge */}
          <polygon
            points={`${pivotX},${pivotY} ${topX},${topY} ${topX},${pivotY}`}
            fill={`url(#${gradientIds.chassisDark})`}
            opacity="0.6"
            stroke="#334155"
            strokeWidth="1.2"
          />

          {/* Vertical Elevation Support Strut (Jack Stand at topX) */}
          <line
            x1={topX}
            y1={topY}
            x2={topX}
            y2={pivotY}
            stroke={`url(#${gradientIds.steelVertical})`}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <circle cx={topX} cy={topY} r="4" fill="#94a3b8" />
          <circle cx={topX} cy={pivotY} r="5" fill="#475569" />

          {/* 4. Precision Extruded Track Rail Surface */}
          {/* Lower rail shadow */}
          <line
            x1={pivotX}
            y1={pivotY + 2}
            x2={topX}
            y2={topY + 2}
            stroke="#0f172a"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Main Aluminum Track Rail */}
          <line
            x1={pivotX}
            y1={pivotY}
            x2={topX}
            y2={topY}
            stroke={`url(#${gradientIds.inclineRail})`}
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Incline Track Center Groove */}
          <line
            x1={pivotX - 2}
            y1={pivotY}
            x2={topX + 2}
            y2={topY}
            stroke="#0f172a"
            strokeWidth="1.5"
            opacity="0.5"
          />

          {/* Start Line Marker (at top of incline) */}
          <g transform={`translate(${topX}, ${topY}) rotate(${-thetaDeg})`}>
            <line x1="0" y1="-14" x2="0" y2="4" stroke={SCIENTIFIC_THEME.accents.cyan} strokeWidth="2" strokeDasharray="3 2" />
            <text x="-4" y="-18" fill={SCIENTIFIC_THEME.accents.cyan} fontSize="9" fontWeight="bold" fontFamily={SCIENTIFIC_THEME.typography.fontMono} textAnchor="end">
              START
            </text>
          </g>

          {/* Finish Line Marker (at bottom of incline) */}
          <g transform={`translate(${pivotX}, ${pivotY}) rotate(${-thetaDeg})`}>
            <line x1="0" y1="-14" x2="0" y2="4" stroke={SCIENTIFIC_THEME.accents.emerald} strokeWidth="2" strokeDasharray="3 2" />
            <text x="4" y="-18" fill={SCIENTIFIC_THEME.accents.emerald} fontSize="9" fontWeight="bold" fontFamily={SCIENTIFIC_THEME.typography.fontMono} textAnchor="start">
              FINISH
            </text>
          </g>

          {/* 5. Scientific Protractor Arc & Angle Display */}
          <g>
            <path
              d={`M ${pivotX - arcR} ${pivotY} A ${arcR} ${arcR} 0 0 1 ${pivotX - arcR * Math.cos(thetaRad)} ${pivotY - arcR * Math.sin(thetaRad)}`}
              fill="rgba(244, 63, 94, 0.12)"
              stroke={SCIENTIFIC_THEME.accents.red}
              strokeWidth="2"
            />
            {/* Protractor Sector Lines */}
            <line
              x1={pivotX}
              y1={pivotY}
              x2={pivotX - (arcR + 10) * Math.cos(thetaRad)}
              y2={pivotY - (arcR + 10) * Math.sin(thetaRad)}
              stroke={SCIENTIFIC_THEME.accents.red}
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.7"
            />
            {/* Angle Badge Pill */}
            <g transform={`translate(${pivotX - arcR - 28}, ${pivotY - 14})`}>
              <rect x="-24" y="-9" width="48" height="18" rx="4" fill="rgba(15, 23, 42, 0.9)" stroke="#f43f5e" strokeWidth="1" />
              <text
                x="0"
                y="3.5"
                fill="#f43f5e"
                fontSize="10"
                fontWeight="bold"
                fontFamily={SCIENTIFIC_THEME.typography.fontMono}
                textAnchor="middle"
              >
                θ={thetaDeg}°
              </text>
            </g>
          </g>

          {/* 6. Rotating Cylinder / Sliding Block Component */}
          <SvgRollingCylinder
            x={objX}
            y={objY}
            r={rPx}
            rInner={rInnerPx}
            shape={bodyShape}
            rotationRad={currentAngle}
            fillColor={accentColor}
            rimFillId={bodyShape === "hollow" ? gradientIds.hollowRim : undefined}
          />

          {/* 7. Physical Vector Overlay */}
          {!isVectorLocked && (
            <VectorOverlay
              vectors={trackVectors}
              userScale={activeVectorControls.arrowScale}
              maxArrowLength={130}
              showValues={showValuesInOverlay}
            />
          )}
        </g>
      );
    };

    return (
      <div
        className={`relative w-full rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-slate-950 via-[#0a0f1d] to-slate-950 shadow-[0_12px_40px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden ${className}`}
        style={{ fontFamily: SCIENTIFIC_THEME.typography.fontMono }}
      >
        {/* Top Header Information Ribbon */}
        <div className="w-full flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-slate-950/60 text-[11px] text-slate-400 z-10 shrink-0 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
            <h3 className="font-bold tracking-wider text-cyan-300 uppercase">
              APPARATUS GERAK MENGGELINDING
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 font-bold">
              {mode.toUpperCase()}
            </span>
            <span className="px-2 py-0.5 rounded border border-amber-500/30 bg-amber-950/40 text-amber-300 font-bold">
              θ = {thetaDeg}°
            </span>
            <span className="px-2 py-0.5 rounded border border-slate-800 bg-slate-900/60 text-slate-300">
              m = {mass} kg | R = {(r * 100).toFixed(1)} cm
            </span>
          </div>
        </div>

        {/* ── SVG SIMULATION VIEW ── */}
        <div className="flex-1 w-full h-full flex justify-center items-center p-3 sm:p-5 touch-none select-none min-h-[420px] relative">
          <svg
            ref={svgRef}
            viewBox="0 0 1000 600"
            className="h-full w-auto max-w-full drop-shadow-2xl"
            style={{ aspectRatio: "1000 / 600" }}
          >
            {/* Instance-unique Metal & Chassis Gradients */}
            <SvgMetalGradients ids={gradientIds} />

            {/* Coordinate Background Grid */}
            <SvgGridBackground width={1000} height={600} gridSize={30} opacity={0.3} />

            {compareShape ? (
              <>
                {renderTrackAndBody(270, s1, theta1, shape, "#38bdf8", `REL 1: ${shape.toUpperCase()}`, 1)}
                {renderTrackAndBody(540, s2, theta2, compareShape, "#34d399", `REL 2: ${compareShape.toUpperCase()}`, 2)}
              </>
            ) : (
              renderTrackAndBody(490, s1, theta1, shape, "#38bdf8", `BENDA: ${shape.toUpperCase()}`, 1)
            )}
          </svg>
        </div>

        {/* Vector Controls Panel */}
        {!hideVectorControls && (
          <div className="w-full px-4 pb-4 max-w-4xl mx-auto z-10">
            <VectorControls
              categories={rollingCategories}
              onToggleCategory={handleToggleCategory}
              extraToggles={extraToggles}
              arrowScale={activeVectorControls.arrowScale}
              onScaleChange={handleScaleChange}
              showValues={activeVectorControls.showValues}
              onToggleShowValues={handleToggleShowValues}
              isQualitative={isQualitative}
              isLocked={isVectorLocked}
              lockMessage={vectorLockMessage}
            />
          </div>
        )}
      </div>
    );
  }
);

RollingApparatus.displayName = "RollingApparatus";
