"use client";

import React from "react";
import { CircularMotionSnapshot } from "@/physics/circularMotion";
import { worldToSvg, worldDeltaToSvg, arcPath, clampVectorLength, ViewTransform } from "./svgGeometry";
import { VectorArrow } from "./VectorArrow";

export const UCM_COLORS = {
  path: "rgba(148, 163, 184, 0.35)",
  particle: "#F59E0B",
  radius: "rgba(226, 232, 240, 0.55)",
  angle: "#A78BFA",
  velocity: "#22D3EE",
  acceleration: "#FB7185",
  reference: "#34D399",
} as const;

interface UniformCircularMotionViewProps {
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
  /** Pixels per (m/s) for the velocity arrow */
  velocityScale?: number;
  /** Pixels per (m/s²) for the acceleration arrow */
  accelerationScale?: number;
  className?: string;
}

const SIZE = 520;
const PATH_MAX_PX = 195;

/**
 * Pure SVG view of a particle in uniform circular motion.
 * Responsive via viewBox; contains no simulation state.
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
  velocityScale = 40,
  accelerationScale = 10,
  className = "",
}: UniformCircularMotionViewProps) {
  const view: ViewTransform = { originX: SIZE / 2, originY: SIZE / 2, scale: PATH_MAX_PX / Math.max(maxRadius, 1e-6) };
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
  const trail = omega !== 0 && pathPx > 0 ? arcPath(center, pathPx, snapshot.theta - direction * 1.1, snapshot.theta) : "";
  const angleArcRadius = Math.min(42, Math.max(18, pathPx * 0.3));
  const angleArc = showAngleArc ? arcPath(center, angleArcRadius, 0, snapshot.thetaWrapped) : "";
  const angleLabel = {
    x: center.x + (angleArcRadius + 14) * Math.cos(snapshot.thetaWrapped / 2),
    y: center.y - (angleArcRadius + 14) * Math.sin(snapshot.thetaWrapped / 2),
  };

  const refInner = worldToSvg({ x: (r - 0.08 * maxRadius) * Math.cos(theta0), y: (r - 0.08 * maxRadius) * Math.sin(theta0) }, view);
  const refOuter = worldToSvg({ x: (r + 0.08 * maxRadius) * Math.cos(theta0), y: (r + 0.08 * maxRadius) * Math.sin(theta0) }, view);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={`w-full h-full select-none ${className}`}
      role="img"
      aria-label="Simulasi gerak melingkar beraturan"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="ucm-particle-grad" cx="35%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor={UCM_COLORS.particle} />
        </radialGradient>
        <radialGradient id="ucm-bg-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(245, 158, 11, 0.10)" />
          <stop offset="100%" stopColor="rgba(245, 158, 11, 0)" />
        </radialGradient>
      </defs>

      {/* Background glow and reference rings */}
      <circle cx={center.x} cy={center.y} r={PATH_MAX_PX + 40} fill="url(#ucm-bg-glow)" />
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <circle key={k} cx={center.x} cy={center.y} r={PATH_MAX_PX * k} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
      ))}

      {/* Axes */}
      <g stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="4 6">
        <line x1={20} y1={center.y} x2={SIZE - 20} y2={center.y} />
        <line x1={center.x} y1={20} x2={center.x} y2={SIZE - 20} />
      </g>
      <text x={SIZE - 24} y={center.y - 8} fill="rgba(255,255,255,0.35)" fontSize={12} fontFamily="'JetBrains Mono', monospace">x</text>
      <text x={center.x + 8} y={30} fill="rgba(255,255,255,0.35)" fontSize={12} fontFamily="'JetBrains Mono', monospace">y</text>

      {/* Circular path */}
      {pathPx > 0 && (
        <circle cx={center.x} cy={center.y} r={pathPx} fill="none" stroke={UCM_COLORS.path} strokeWidth={2} strokeDasharray="6 6" />
      )}

      {/* Start / reference mark */}
      {showReferenceMark && pathPx > 0 && (
        <g>
          <line x1={refInner.x} y1={refInner.y} x2={refOuter.x} y2={refOuter.y} stroke={UCM_COLORS.reference} strokeWidth={3} strokeLinecap="round" />
          <text
            x={refOuter.x + 10 * Math.cos(theta0)}
            y={refOuter.y - 10 * Math.sin(theta0)}
            fill={UCM_COLORS.reference}
            fontSize={11}
            fontWeight={700}
            fontFamily="'JetBrains Mono', monospace"
            textAnchor={Math.cos(theta0) >= 0 ? "start" : "end"}
            dominantBaseline="middle"
          >
            START
          </text>
        </g>
      )}

      {/* Motion trail */}
      {trail && <path d={trail} fill="none" stroke={UCM_COLORS.particle} strokeOpacity={0.45} strokeWidth={4} strokeLinecap="round" />}

      {/* Angle arc */}
      {angleArc && (
        <g>
          <path d={angleArc} fill="none" stroke={UCM_COLORS.angle} strokeWidth={2} />
          <text x={angleLabel.x} y={angleLabel.y} fill={UCM_COLORS.angle} fontSize={13} fontWeight={700} fontFamily="'JetBrains Mono', monospace" textAnchor="middle" dominantBaseline="middle">
            θ
          </text>
        </g>
      )}

      {/* Radius line */}
      <line x1={center.x} y1={center.y} x2={particle.x} y2={particle.y} stroke={UCM_COLORS.radius} strokeWidth={2} />
      {pathPx > 30 && (
        <text
          x={(center.x + particle.x) / 2 + 10 * Math.sin(snapshot.theta)}
          y={(center.y + particle.y) / 2 + 10 * Math.cos(snapshot.theta)}
          fill={UCM_COLORS.radius}
          fontSize={13}
          fontWeight={700}
          fontFamily="'JetBrains Mono', monospace"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          r
        </text>
      )}

      {/* Center */}
      <circle cx={center.x} cy={center.y} r={5} fill="#E2E8F0" />
      <circle cx={center.x} cy={center.y} r={9} fill="none" stroke="rgba(226,232,240,0.3)" />

      {/* Vectors */}
      {showAcceleration && <VectorArrow from={particle} delta={aDelta} color={UCM_COLORS.acceleration} label="a" labelSubscript="c" />}
      {showVelocity && <VectorArrow from={particle} delta={vDelta} color={UCM_COLORS.velocity} label="v" />}

      {/* Particle */}
      <circle cx={particle.x} cy={particle.y} r={16} fill="rgba(245, 158, 11, 0.18)" />
      <circle cx={particle.x} cy={particle.y} r={10} fill="url(#ucm-particle-grad)" stroke="#FFFBEB" strokeWidth={1.5} />
    </svg>
  );
}
