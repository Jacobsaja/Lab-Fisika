import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from "react";
import { CylinderShape, calculateRollingAcceleration, getRollingState, applySensorNoise } from "@/physics/rollingMotion";

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
    },
    ref
  ) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const reqRef = useRef<number | null>(null);

    const [isAnimating, setIsAnimating] = useState(false);
    const [simTime, setSimTime] = useState(0);

    const simTimeRef = useRef(0);
    const lastTimestampRef = useRef<number | null>(null);
    const isAnimatingRef = useRef(false);

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
        setSimTime(0);
        setS1(0);
        setTheta1(0);
        setS2(0);
        setTheta2(0);
        if (onTimeChange) onTimeChange(0, false, true);
        
        // Push initial state
        if (onStateUpdate) {
           onStateUpdate(getRollingState(0, a1, r, shape === "block"), compareShape ? getRollingState(0, a2, r, compareShape === "block") : undefined);
        }
      },
    }));

    // Auto update state on prop change if not running
    useEffect(() => {
      if (!isAnimatingRef.current && simTimeRef.current === 0) {
        if (onStateUpdate) {
           onStateUpdate(getRollingState(0, a1, r, shape === "block"), compareShape ? getRollingState(0, a2, r, compareShape === "block") : undefined);
        }
      }
    }, [a1, a2, shape, compareShape, r]);

    const animate = (timestamp: number) => {
      if (!isAnimatingRef.current) return;

      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      
      // Use slow-mo for better visualization
      const deltaT = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      // Real time step (unscaled for physics, maybe scaled for visual speed if we want)
      const SLOW_MO = 0.5; // running at half speed visually
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
          // Add deterministic seeded noise to measurements in practicum mode
          const noisyState1 = {
             s: applySensorNoise(state1.s, currentT * 123.45, 0.005),
             v: applySensorNoise(state1.v, currentT * 678.90), // Uses default SENSOR_NOISE_AMPLITUDE
             omega: applySensorNoise(state1.omega, currentT * 234.56, 0.05),
             theta: state1.theta
          };
          onStateUpdate(noisyState1, state2);
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

    // --- RENDER HELPERS ---
    const renderTrackAndBody = (
      baseY: number,
      currentS: number,
      currentAngle: number,
      bodyShape: CylinderShape,
      color: string,
      label: string
    ) => {
      const thetaRad = (thetaDeg * Math.PI) / 180;
      
      const pivotX = GROUND_X;
      const pivotY = baseY;
      
      const topX = pivotX - INCLINE_LENGTH_PX * Math.cos(thetaRad);
      const topY = pivotY - INCLINE_LENGTH_PX * Math.sin(thetaRad);

      // Object position (s is clamped to max length visually)
      const visualS = Math.min(currentS, INCLINE_LENGTH_M) * PX_PER_METER;
      const cx = topX + visualS * Math.cos(thetaRad);
      const cy = topY + visualS * Math.sin(thetaRad);

      const rPx = r * PX_PER_METER;
      const rInnerPx = rInner * PX_PER_METER;

      // Normal vector for lifting the object above track (pointing UP and RIGHT)
      const nx = Math.sin(thetaRad);
      const ny = Math.cos(thetaRad);

      const objX = cx + nx * rPx;
      const objY = cy - ny * rPx;

      return (
        <g>
          {/* Label */}
          <text x="50" y={baseY - 150} fill={color} fontWeight="bold" fontSize="16">{label}</text>
          
          {/* Ground */}
          <line x1="50" y1={baseY} x2={GROUND_X + 100} y2={baseY} stroke="#334155" strokeWidth="4" />
          
          {/* Incline */}
          <polygon 
            points={`${pivotX},${pivotY} ${topX},${topY} ${topX},${pivotY}`} 
            fill="#475569" 
            opacity="0.3" 
            stroke="#94a3b8" 
            strokeWidth="2" 
          />
          <line x1={pivotX} y1={pivotY} x2={topX} y2={topY} stroke="#f59e0b" strokeWidth="4" />
          
          {/* Angle Arc */}
          <path 
            d={`M ${pivotX - 50} ${pivotY} A 50 50 0 0 1 ${pivotX - 50 * Math.cos(thetaRad)} ${pivotY - 50 * Math.sin(thetaRad)}`} 
            fill="none" stroke="#ef4444" strokeWidth="2" 
          />
          <text x={pivotX - 70} y={pivotY - 15} fill="#ef4444" fontSize="14" fontWeight="bold">θ = {thetaDeg}°</text>

          {/* Body */}
          <g transform={`translate(${objX}, ${objY}) rotate(${currentAngle * 180 / Math.PI})`}>
            {bodyShape === "block" ? (
              <rect x={-rPx} y={-rPx} width={rPx * 2} height={rPx * 2} fill={color} stroke="#1e293b" strokeWidth="2" />
            ) : (
              <>
                <circle cx="0" cy="0" r={rPx} fill={color} opacity="0.9" stroke="#1e293b" strokeWidth="2" />
                {bodyShape === "hollow" && (
                  <circle cx="0" cy="0" r={rInnerPx} fill="#f5f7fa" stroke="#1e293b" strokeWidth="2" />
                )}
                {/* Cross/spokes to show rotation clearly */}
                <line x1={-rPx} y1="0" x2={bodyShape === "hollow" ? -rInnerPx : 0} y2="0" stroke="#1e293b" strokeWidth="3" />
                <line x1={rPx} y1="0" x2={bodyShape === "hollow" ? rInnerPx : 0} y2="0" stroke="#1e293b" strokeWidth="3" />
                <line x1="0" y1={-rPx} x2="0" y2={bodyShape === "hollow" ? -rInnerPx : 0} stroke="#1e293b" strokeWidth="3" />
                <line x1="0" y1={rPx} x2="0" y2={bodyShape === "hollow" ? rInnerPx : 0} stroke="#1e293b" strokeWidth="3" />
              </>
            )}
          </g>
        </g>
      );
    };

    return (
      <div className={`relative w-full rounded-xl border border-white/10 bg-[#f5f7fa] overflow-hidden shadow-2xl flex flex-col ${className}`}>
        <div className="flex-1 w-full h-full flex justify-center p-4 touch-none select-none min-h-[400px]">
          <svg
            ref={svgRef}
            viewBox="0 0 1000 600"
            className="h-full w-auto max-w-full drop-shadow-xl"
          >
            {compareShape ? (
              <>
                {renderTrackAndBody(280, s1, theta1, shape, "#3b82f6", `TRACK 1: ${shape.toUpperCase()}`)}
                {renderTrackAndBody(550, s2, theta2, compareShape, "#10b981", `TRACK 2: ${compareShape.toUpperCase()}`)}
              </>
            ) : (
              renderTrackAndBody(500, s1, theta1, shape, "#3b82f6", `Benda: ${shape.toUpperCase()}`)
            )}
          </svg>
        </div>
      </div>
    );
  }
);
RollingApparatus.displayName = "RollingApparatus";
