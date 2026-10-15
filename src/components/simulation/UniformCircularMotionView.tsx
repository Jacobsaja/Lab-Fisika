"use client";

import React, { useId, useMemo, useRef, useState, useEffect } from "react";
import { CircularMotionSnapshot } from "@/physics/circularMotion";
import { worldToSvg, worldDeltaToSvg, arcPath, clampVectorLength, ViewTransform } from "./svgGeometry";
import { VectorArrow } from "./VectorArrow";
import { useMetalGradientIds, SvgMetalGradients } from "./visual/SvgMetalGradients";
import { VectorOverlay, VectorItem } from "./visual/VectorOverlay";

export const UCM_COLORS = {
  path: "rgba(56, 189, 248, 0.35)",
  particle: "#F59E0B",
  radius: "rgba(148, 163, 184, 0.75)",
  angle: "#A78BFA",
  velocity: "#22D3EE",
  acceleration: "#FB7185",
  reference: "#34D399",
} as const;

export interface UniformCircularMotionViewProps {
  snapshot: CircularMotionSnapshot;
  /** Radius (m) of the current motion */
  r: number;
  /** Signed angular velocity (rad/s); used for trail direction */
  omega: number;
  /** Initial angle (rad); a reference/start mark is drawn here */
  theta0: number;
  /** Largest radius the view must fit (m); fixes the drawing scale */
  maxRadius: number;
  showVelocity?: boolean;
  showAcceleration?: boolean;
  showAngleArc?: boolean;
  showReferenceMark?: boolean;
  /** Physical vector overlay items (Tahap J) */
  vectorItems?: VectorItem[];
  userVectorScale?: number;
  showVectorValues?: boolean;
  isVectorLocked?: boolean;
  /** Pixels per (m/s) for the velocity arrow */
  velocityScale?: number;
  /** Pixels per (m/s²) for the acceleration arrow */
  accelerationScale?: number;
  className?: string;
}

const SIZE = 520;
const PATH_MAX_PX = 195;

/**
 * High-precision SVG view of a laboratory rotating turntable apparatus for uniform circular motion.
 * Designed under the "Scientific Night" aesthetic.
 * All gradients and patterns scoped with unique instance IDs.
 * Zero SVG filters on moving elements for 60 FPS performance.
 */
export function UniformCircularMotionView({
  snapshot,
  r,
  omega,
  theta0,
  maxRadius,
  showVelocity = true,
  showAcceleration = true,
  showAngleArc = true,
  showReferenceMark = true,
  vectorItems,
  userVectorScale = 1.0,
  showVectorValues = true,
  isVectorLocked = false,
  velocityScale = 40,
  accelerationScale = 10,
  className = "",
}: UniformCircularMotionViewProps) {
  const instanceId = useId().replace(/[:]/g, "_");
  const gradientIds = useMetalGradientIds(`gmb_${instanceId}`);

  const view: ViewTransform = {
    originX: SIZE / 2,
    originY: SIZE / 2,
    scale: PATH_MAX_PX / Math.max(maxRadius, 1e-6),
  };
  const center = { x: view.originX, y: view.originY };
  const pathPx = r * view.scale;
  const particle = worldToSvg(snapshot.position, view);

  // Vector arrows: direction from physics, length clamped for readability.
  const vLen = clampVectorLength(snapshot.speed, velocityScale, 22, 140);
  const aLen = clampVectorLength(snapshot.centripetal, accelerationScale, 22, Math.max(22, pathPx * 0.85));
  const vDir = worldDeltaToSvg(snapshot.velocity, 1);
  const aDir = worldDeltaToSvg(snapshot.acceleration, 1);
  const vMag = Math.hypot(vDir.x, vDir.y);
  const aMag = Math.hypot(aDir.x, aDir.y);
  const vDelta = vMag > 0 ? { x: (vDir.x / vMag) * vLen, y: (vDir.y / vMag) * vLen } : { x: 0, y: 0 };
  const aDelta = aMag > 0 ? { x: (aDir.x / aMag) * aLen, y: (aDir.y / aMag) * aLen } : { x: 0, y: 0 };

  const direction = omega >= 0 ? 1 : -1;
  const trail =
    omega !== 0 && pathPx > 0
      ? arcPath(center, pathPx, snapshot.theta - direction * 1.25, snapshot.theta)
      : "";
  const angleArcRadius = Math.min(48, Math.max(22, pathPx * 0.35));
  const angleArc = showAngleArc ? arcPath(center, angleArcRadius, 0, snapshot.thetaWrapped) : "";
  const angleLabel = {
    x: center.x + (angleArcRadius + 16) * Math.cos(snapshot.thetaWrapped / 2),
    y: center.y - (angleArcRadius + 16) * Math.sin(snapshot.thetaWrapped / 2),
  };

  // Optical sensor positions at theta0
  const refInner = worldToSvg(
    { x: (r - 0.12 * maxRadius) * Math.cos(theta0), y: (r - 0.12 * maxRadius) * Math.sin(theta0) },
    view
  );
  const refOuter = worldToSvg(
    { x: (r + 0.12 * maxRadius) * Math.cos(theta0), y: (r + 0.12 * maxRadius) * Math.sin(theta0) },
    view
  );

  // Trajectory-based optical tacho beam crossing detection with ~90ms pulse latch
  const [isLatched, setIsLatched] = useState(false);
  const prevThetaRef = useRef<number>(snapshot.theta);
  const latchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rotatingAssemblyRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const uPrev = (prevThetaRef.current - theta0) / (2 * Math.PI);
    const uCurr = (snapshot.theta - theta0) / (2 * Math.PI);
    prevThetaRef.current = snapshot.theta;

    const didCross =
      omega > 0
        ? Math.floor(uCurr + 1e-7) > Math.floor(uPrev + 1e-7)
        : omega < 0
        ? Math.ceil(uCurr - 1e-7) < Math.ceil(uPrev - 1e-7)
        : false;

    if (didCross) {
      setIsLatched(true);
      if (latchTimerRef.current) clearTimeout(latchTimerRef.current);
      latchTimerRef.current = setTimeout(() => {
        setIsLatched(false);
      }, 90);
    }
  }, [snapshot.theta, theta0, omega]);

  useEffect(() => {
    return () => {
      if (latchTimerRef.current) clearTimeout(latchTimerRef.current);
    };
  }, []);

  // When particle is at or very near start position (standing still or initial state)
  const isAtStart = snapshot.t <= 0.001 || Math.abs(snapshot.thetaWrapped - theta0) < 0.08;
  const isBeamInterrupted = isAtStart || isLatched;

  // Degrees of rotation for radial guide track
  const rotationDeg = -(snapshot.theta * 180) / Math.PI;

  useEffect(() => {
    if (rotatingAssemblyRef.current) {
      rotatingAssemblyRef.current.setAttribute("transform", `rotate(${rotationDeg}, ${center.x}, ${center.y})`);
    }
  }, [rotationDeg, center.x, center.y]);

  // 360-degree protractor markings memoized
  const protractorTicks = useMemo(() => {
    const ticks: React.ReactNode[] = [];
    const rInnerMinor = 216;
    const rInnerMajor = 212;
    const rOuter = 226;
    const rText = 237;

    const roundCoord = (val: number) => Math.round(val * 100) / 100;

    for (let deg = 0; deg < 360; deg += 5) {
      const rad = (deg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const isMajor = deg % 30 === 0;
      const isMedium = deg % 10 === 0;
      const rIn = isMajor ? rInnerMajor : isMedium ? rInnerMinor : 220;

      ticks.push(
        <line
          key={`deg-${deg}`}
          x1={roundCoord(center.x + rIn * cos)}
          y1={roundCoord(center.y - rIn * sin)}
          x2={roundCoord(center.x + rOuter * cos)}
          y2={roundCoord(center.y - rOuter * sin)}
          stroke={isMajor ? "#94a3b8" : isMedium ? "#475569" : "#334155"}
          strokeWidth={isMajor ? 1.5 : 1}
        />
      );

      if (isMajor) {
        ticks.push(
          <text
            key={`deg-txt-${deg}`}
            x={roundCoord(center.x + rText * cos)}
            y={roundCoord(center.y - rText * sin + 3.5)}
            fill="#94a3b8"
            fontSize="9"
            fontFamily="monospace"
            fontWeight="bold"
            textAnchor="middle"
          >
            {deg}°
          </text>
        );
      }
    }
    return ticks;
  }, [center.x, center.y]);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={`w-full h-full select-none ${className}`}
      role="img"
      aria-label="Simulasi gerak melingkar beraturan - Laboratory Turntable Apparatus"
      preserveAspectRatio="xMidYMid meet"
    >
      <SvgMetalGradients ids={gradientIds} />

      <defs>
        {/* Particle / Weight Radial Glow (Static) */}
        <radialGradient id={`ucm-glow-${instanceId}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(56, 189, 248, 0.15)" />
          <stop offset="70%" stopColor="rgba(56, 189, 248, 0.03)" />
          <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
        </radialGradient>

        {/* Outer Turntable Housing Gradient */}
        <radialGradient id={`ucm-chassis-${instanceId}`} cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="50%" stopColor="#0f172a" />
          <stop offset="90%" stopColor="#090d16" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>

        {/* Optical Sensor Fork Gradient */}
        <linearGradient id={`ucm-sensor-${instanceId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="50%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      {/* 1. Instrument Base Plate / Chassis */}
      <rect
        x="6"
        y="6"
        width={SIZE - 12}
        height={SIZE - 12}
        rx="24"
        fill={`url(#ucm-chassis-${instanceId})`}
        stroke="#334155"
        strokeWidth="1.5"
      />
      {/* Subtle Inner Bezel Highlight */}
      <rect
        x="8"
        y="8"
        width={SIZE - 16}
        height={SIZE - 16}
        rx="22"
        fill="none"
        stroke="rgba(255, 255, 255, 0.08)"
        strokeWidth="1"
      />

      {/* Corner Hex Mounting Screws */}
      {[
        { cx: 24, cy: 24 },
        { cx: SIZE - 24, cy: 24 },
        { cx: 24, cy: SIZE - 24 },
        { cx: SIZE - 24, cy: SIZE - 24 },
      ].map((pos, idx) => (
        <g key={`hex-${idx}`}>
          <circle cx={pos.cx} cy={pos.cy} r="6" fill="#1e293b" stroke="#475569" strokeWidth="1" />
          <circle cx={pos.cx} cy={pos.cy} r="3" fill="#0f172a" stroke="#64748b" strokeWidth="0.8" />
        </g>
      ))}

      {/* Static Atmospheric Glow */}
      <circle cx={center.x} cy={center.y} r={PATH_MAX_PX + 45} fill={`url(#ucm-glow-${instanceId})`} />

      {/* 2. Outer Fixed Protractor Bezel (Stator Ring) */}
      <circle
        cx={center.x}
        cy={center.y}
        r="246"
        fill="none"
        stroke={`url(#${gradientIds.turntableRim})`}
        strokeWidth="8"
      />
      <circle
        cx={center.x}
        cy={center.y}
        r="242"
        fill="none"
        stroke="#1e293b"
        strokeWidth="1.5"
      />
      <circle
        cx={center.x}
        cy={center.y}
        r="214"
        fill="none"
        stroke="#334155"
        strokeWidth="1.2"
      />

      {/* Protractor 360-degree Graduations */}
      <g>{protractorTicks}</g>

      {/* Precision Reticle Crosshair Axes */}
      <g stroke="rgba(148, 163, 184, 0.18)" strokeWidth="1" strokeDasharray="3 4">
        <line x1={center.x - 212} y1={center.y} x2={center.x + 212} y2={center.y} />
        <line x1={center.x} y1={center.y - 212} x2={center.x} y2={center.y + 212} />
      </g>
      <text
        x={center.x + 204}
        y={center.y - 6}
        fill="rgba(148, 163, 184, 0.5)"
        fontSize="10"
        fontFamily="monospace"
        fontWeight="bold"
      >
        +X
      </text>
      <text
        x={center.x + 6}
        y={center.y - 200}
        fill="rgba(148, 163, 184, 0.5)"
        fontSize="10"
        fontFamily="monospace"
        fontWeight="bold"
      >
        +Y
      </text>

      {/* 3. Rotating Turntable Platter (Machined Slate / Gunmetal Disc) */}
      <circle
        cx={center.x}
        cy={center.y}
        r="212"
        fill={`url(#${gradientIds.turntablePlatter})`}
        stroke="#0f172a"
        strokeWidth="2"
      />
      {/* Platter Outer Chamfer Ring */}
      <circle
        cx={center.x}
        cy={center.y}
        r="209"
        fill="none"
        stroke="rgba(255, 255, 255, 0.08)"
        strokeWidth="1"
      />

      {/* Concentric Machined Guide Tracks */}
      {[0.25, 0.5, 0.75, 1.0].map((frac) => (
        <circle
          key={`track-${frac}`}
          cx={center.x}
          cy={center.y}
          r={PATH_MAX_PX * frac}
          fill="none"
          stroke="rgba(255, 255, 255, 0.06)"
          strokeWidth="1"
          strokeDasharray="2 4"
        />
      ))}

      {/* Active Motion Path Orbit Circle */}
      {pathPx > 0 && (
        <circle
          cx={center.x}
          cy={center.y}
          r={pathPx}
          fill="none"
          stroke={UCM_COLORS.path}
          strokeWidth="1.8"
          strokeDasharray="5 5"
        />
      )}

      {/* Dynamic Motion Trail Behind Particle */}
      {trail && (
        <path
          d={trail}
          fill="none"
          stroke="#38bdf8"
          strokeOpacity="0.65"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      )}

      {/* 4. Optical Tacho Sensor / Photogate (Mounted at theta0) */}
      {showReferenceMark && pathPx > 0 && (
        <g>
          {/* Optical Slit Beam */}
          <line
            x1={refInner.x}
            y1={refInner.y}
            x2={refOuter.x}
            y2={refOuter.y}
            stroke={isBeamInterrupted ? "#22c55e" : UCM_COLORS.reference}
            strokeWidth={isBeamInterrupted ? 3 : 2}
            strokeDasharray={isBeamInterrupted ? "none" : "2 2"}
          />
          {/* U-Shaped Sensor Bracket Inner Head */}
          <circle
            cx={refInner.x}
            cy={refInner.y}
            r="4"
            fill={`url(#ucm-sensor-${instanceId})`}
            stroke="#475569"
            strokeWidth="1"
          />
          {/* U-Shaped Sensor Bracket Outer Head with LED */}
          <g transform={`translate(${refOuter.x}, ${refOuter.y})`}>
            <rect
              x="-6"
              y="-6"
              width="12"
              height="12"
              rx="3"
              fill={`url(#ucm-sensor-${instanceId})`}
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* Tacho Status LED Indicator */}
            <circle
              cx="0"
              cy="0"
              r="2.5"
              fill={isBeamInterrupted ? "#4ade80" : "#1e3a5f"}
              stroke={isBeamInterrupted ? "#16a34a" : "#0f172a"}
              strokeWidth="0.8"
            />
          </g>
          {/* Label Badge */}
          <text
            x={refOuter.x + 12 * Math.cos(theta0)}
            y={refOuter.y - 12 * Math.sin(theta0) + 3}
            fill={isBeamInterrupted ? "#4ade80" : UCM_COLORS.reference}
            fontSize="9"
            fontWeight="bold"
            fontFamily="monospace"
            textAnchor={Math.cos(theta0) >= 0 ? "start" : "end"}
          >
            START / TACHO
          </text>
        </g>
      )}

      {/* 5. Dynamic Angle Arc & Sector */}
      {angleArc && (
        <g>
          <path d={angleArc} fill="none" stroke={UCM_COLORS.angle} strokeWidth="2" strokeDasharray="3 3" />
          <g transform={`translate(${angleLabel.x}, ${angleLabel.y})`}>
            <rect
              x="-14"
              y="-9"
              width="28"
              height="18"
              rx="4"
              fill="#0f172a"
              stroke={UCM_COLORS.angle}
              strokeWidth="1"
            />
            <text
              x="0"
              y="3"
              fill={UCM_COLORS.angle}
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
              textAnchor="middle"
            >
              θ
            </text>
          </g>
        </g>
      )}

      {/* 6. Rotating Radial Guide Arm & Extrusion Slot (Spins with theta via DOM ref) */}
      <g
        ref={rotatingAssemblyRef}
        id="gmb-rotating-assembly"
        transform={`rotate(${rotationDeg}, ${center.x}, ${center.y})`}
      >
        {/* Aluminium Slotted Guide Rail (from center to full radius) */}
        <rect
          x={center.x}
          y={center.y - 4}
          width={PATH_MAX_PX + 10}
          height="8"
          rx="2"
          fill={`url(#${gradientIds.aluminum})`}
          stroke="#1e293b"
          strokeWidth="1"
        />
        {/* Central Guide Groove Channel */}
        <line
          x1={center.x + 12}
          y1={center.y}
          x2={center.x + PATH_MAX_PX + 8}
          y2={center.y}
          stroke="#090d16"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Metric Graduation Ticks along the Guide Rail */}
        {[0.2, 0.4, 0.6, 0.8, 1.0].map((frac) => {
          const tickX = center.x + (PATH_MAX_PX * frac * maxRadius) / maxRadius;
          return (
            <line
              key={`rail-tick-${frac}`}
              x1={tickX}
              y1={center.y - 3}
              x2={tickX}
              y2={center.y - 1}
              stroke="#334155"
              strokeWidth="1"
            />
          );
        })}

        {/* 9. Tangential Velocity, Centripetal Acceleration & Force (Tahap J: VectorOverlay) */}
        {!isVectorLocked && vectorItems && vectorItems.length > 0 ? (
          <VectorOverlay
            vectors={vectorItems}
            userScale={userVectorScale}
            showValues={showVectorValues}
            maxArrowLength={140}
          />
        ) : !isVectorLocked && !vectorItems ? (
          <>
            {showAcceleration && (
              <VectorArrow
                from={{ x: center.x + pathPx, y: center.y }}
                delta={aDelta}
                color={UCM_COLORS.acceleration}
                label="a"
                labelSubscript="c"
              />
            )}
            {showVelocity && (
              <VectorArrow
                from={{ x: center.x + pathPx, y: center.y }}
                delta={vDelta}
                color={UCM_COLORS.velocity}
                label="v"
              />
            )}
          </>
        ) : null}

        {/* 10. Sliding Sensor Mass Carriage (Beban Sensor Luncur) */}
        <g transform={`translate(${center.x + pathPx}, ${center.y})`}>
          {/* Sensor Carriage Base Block */}
          <rect
            x="-14"
            y="-14"
            width="28"
            height="28"
            rx="5"
            fill={`url(#${gradientIds.sliderCarriage})`}
            stroke="#0369a1"
            strokeWidth="1.5"
          />
          {/* Brass Mass Collar Layer */}
          <rect
            x="-10"
            y="-10"
            width="20"
            height="20"
            rx="3"
            fill={`url(#${gradientIds.brass})`}
            stroke="#78350f"
            strokeWidth="1"
          />
          {/* Center Optical Shutter Flag / Locking Screw */}
          <circle cx="0" cy="0" r="4.5" fill="#1e293b" stroke="#f1f5f9" strokeWidth="1" />
          <circle cx="0" cy="0" r="2" fill="#38bdf8" />
          {/* Tacho sensor interrupter tab extending to the side */}
          <rect x="12" y="-2" width="5" height="4" rx="1" fill="#f59e0b" stroke="#78350f" strokeWidth="0.8" />
        </g>
      </g>

      {/* 7. Center Direct-Drive Motor Hub & Bearing Assembly */}
      {/* Outer Bearing Collar */}
      <circle
        cx={center.x}
        cy={center.y}
        r="24"
        fill={`url(#${gradientIds.turntableRim})`}
        stroke="#0f172a"
        strokeWidth="1.5"
      />
      {/* Knurled Brass Center Arbor */}
      <circle
        cx={center.x}
        cy={center.y}
        r="17"
        fill={`url(#${gradientIds.brass})`}
        stroke="#78350f"
        strokeWidth="1.2"
      />
      {/* Stainless Motor Spindle Pin */}
      <circle
        cx={center.x}
        cy={center.y}
        r="8"
        fill={`url(#${gradientIds.steel})`}
        stroke="#1e293b"
        strokeWidth="1"
      />
      <circle cx={center.x} cy={center.y} r="3" fill="#0284c7" />

      {/* 8. Radius Dimension Line & Callout */}
      {pathPx > 35 && (
        <g pointerEvents="none">
          <line
            x1={center.x}
            y1={center.y}
            x2={particle.x}
            y2={particle.y}
            stroke={UCM_COLORS.radius}
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          {/* Radius Value Badge */}
          <g
            transform={`translate(${
              (center.x + particle.x) / 2 + 12 * Math.sin(snapshot.theta)
            }, ${
              (center.y + particle.y) / 2 + 12 * Math.cos(snapshot.theta)
            })`}
          >
            <rect
              x="-24"
              y="-8"
              width="48"
              height="16"
              rx="4"
              fill="#090d16"
              stroke="#38bdf8"
              strokeWidth="0.8"
            />
            <text
              x="0"
              y="3"
              fill="#38bdf8"
              fontSize="9"
              fontWeight="bold"
              fontFamily="monospace"
              textAnchor="middle"
            >
              r={r.toFixed(2)}m
            </text>
          </g>
        </g>
      )}

    </svg>
  );
}
