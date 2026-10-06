/**
 * Uniform Circular Motion (UCM) physics.
 * Pure, deterministic, framework-free.
 *
 * Conventions:
 * - Angles in radians, measured counter-clockwise from the +x axis.
 * - Positive ω = counter-clockwise rotation, negative ω = clockwise.
 * - Coordinates are world coordinates (y axis points UP), origin at the circle center.
 */

import { SimulationModel, Vector2 } from "./core";

export const TWO_PI = 2 * Math.PI;

// ─── Validation ────────────────────────────────────────────────────────────────

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`);
  }
}

function assertRadius(r: number): void {
  assertFinite(r, "Radius");
  if (r < 0) throw new Error("Radius must be non-negative");
}

// ─── ω / T / f conversions ───────────────────────────────────────────────────

/** Period T = 2π/|ω|. Returns Infinity when ω = 0 (no rotation). */
export function periodFromOmega(omega: number): number {
  assertFinite(omega, "Angular velocity");
  if (omega === 0) return Infinity;
  return TWO_PI / Math.abs(omega);
}

/** Frequency f = |ω|/2π. */
export function frequencyFromOmega(omega: number): number {
  assertFinite(omega, "Angular velocity");
  return Math.abs(omega) / TWO_PI;
}

/** Frequency f = 1/T. T = Infinity → f = 0. */
export function frequencyFromPeriod(period: number): number {
  if (period === Infinity) return 0;
  assertFinite(period, "Period");
  if (period <= 0) throw new Error("Period must be positive");
  return 1 / period;
}

/** Period T = 1/f. f = 0 → T = Infinity. */
export function periodFromFrequency(frequency: number): number {
  assertFinite(frequency, "Frequency");
  if (frequency < 0) throw new Error("Frequency must be non-negative");
  if (frequency === 0) return Infinity;
  return 1 / frequency;
}

/** Angular speed magnitude ω = 2π/T. T = Infinity → 0. */
export function omegaFromPeriod(period: number): number {
  if (period === Infinity) return 0;
  assertFinite(period, "Period");
  if (period <= 0) throw new Error("Period must be positive");
  return TWO_PI / period;
}

/** Angular speed magnitude ω = 2πf. */
export function omegaFromFrequency(frequency: number): number {
  assertFinite(frequency, "Frequency");
  if (frequency < 0) throw new Error("Frequency must be non-negative");
  return TWO_PI * frequency;
}

// ─── Kinematics ───────────────────────────────────────────────────────────────

/** θ(t) = θ0 + ωt (unwrapped, may exceed 2π). */
export function angleAt(theta0: number, omega: number, t: number): number {
  return theta0 + omega * t;
}

/** Wraps an angle into [0, 2π). */
export function normalizeAngle(theta: number): number {
  const wrapped = theta % TWO_PI;
  return wrapped < 0 ? wrapped + TWO_PI : wrapped;
}

/** Position on the circle: (r cos θ, r sin θ). */
export function positionAt(r: number, theta: number): Vector2 {
  assertRadius(r);
  return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
}

/** Tangential speed v = |ω| r. */
export function tangentialSpeed(omega: number, r: number): number {
  assertRadius(r);
  assertFinite(omega, "Angular velocity");
  return Math.abs(omega) * r;
}

/**
 * Velocity vector, tangent to the circle:
 * v = (-ω r sin θ, ω r cos θ). Direction follows the sign of ω.
 */
export function velocityAt(r: number, omega: number, theta: number): Vector2 {
  assertRadius(r);
  return { x: -omega * r * Math.sin(theta), y: omega * r * Math.cos(theta) };
}

/** Centripetal acceleration magnitude a_c = ω² r. */
export function centripetalAcceleration(omega: number, r: number): number {
  assertRadius(r);
  assertFinite(omega, "Angular velocity");
  return omega * omega * r;
}

/** Centripetal acceleration magnitude from speed: a_c = v²/r. r = 0 → 0. */
export function centripetalFromSpeed(v: number, r: number): number {
  assertRadius(r);
  assertFinite(v, "Speed");
  if (r === 0) return 0;
  return (v * v) / r;
}

/**
 * Acceleration vector, pointing toward the center:
 * a = (-ω² r cos θ, -ω² r sin θ).
 */
export function accelerationAt(r: number, omega: number, theta: number): Vector2 {
  assertRadius(r);
  const k = omega * omega * r;
  return { x: -k * Math.cos(theta), y: -k * Math.sin(theta) };
}

/** Revolutions travelled (fractional, always ≥ 0): |ω| t / 2π. */
export function revolutionCount(omega: number, t: number): number {
  assertFinite(omega, "Angular velocity");
  assertFinite(t, "Time");
  return Math.abs(omega * t) / TWO_PI;
}

/**
 * Completed full revolutions. A tiny epsilon absorbs floating-point drift
 * from fixed-step time accumulation (e.g. 0.9999999 → 1).
 */
export function completedRevolutions(omega: number, t: number): number {
  return Math.floor(revolutionCount(omega, t) + 1e-9);
}

// ─── Aggregated snapshot ──────────────────────────────────────────────────────

export interface CircularMotionParams {
  /** Radius (m) */
  r: number;
  /** Angular velocity (rad/s), signed */
  omega: number;
  /** Initial angle (rad) */
  theta0: number;
}

export interface CircularMotionSnapshot {
  t: number;
  /** Unwrapped angle (rad) */
  theta: number;
  /** Angle wrapped into [0, 2π) */
  thetaWrapped: number;
  position: Vector2;
  velocity: Vector2;
  acceleration: Vector2;
  /** Tangential speed (m/s) */
  speed: number;
  /** Centripetal acceleration magnitude (m/s²) */
  centripetal: number;
  period: number;
  frequency: number;
  revolutions: number;
  completedRevolutions: number;
}

export function computeSnapshot(params: CircularMotionParams, t: number): CircularMotionSnapshot {
  const { r, omega, theta0 } = params;
  assertRadius(r);
  assertFinite(omega, "Angular velocity");
  assertFinite(theta0, "Initial angle");
  const theta = angleAt(theta0, omega, t);
  return {
    t,
    theta,
    thetaWrapped: normalizeAngle(theta),
    position: positionAt(r, theta),
    velocity: velocityAt(r, omega, theta),
    acceleration: accelerationAt(r, omega, theta),
    speed: tangentialSpeed(omega, r),
    centripetal: centripetalAcceleration(omega, r),
    period: periodFromOmega(omega),
    frequency: frequencyFromOmega(omega),
    revolutions: revolutionCount(omega, t),
    completedRevolutions: completedRevolutions(omega, t),
  };
}

// ─── Measurement-derived quantities (practicum data rows) ─────────────────────

export interface DerivedTrial {
  T: number;
  f: number;
  omega: number;
  v: number;
  a_c: number;
}

/**
 * Derives T, f, ω, v and a_c from a MEASURED time t for N revolutions at radius r.
 * Uses only measured values (never the hidden true ω).
 */
export function deriveFromMeasurement(r: number, N: number, t: number): DerivedTrial {
  assertRadius(r);
  if (!Number.isFinite(N) || N <= 0) throw new Error("N must be a positive number");
  if (!Number.isFinite(t) || t <= 0) throw new Error("Time must be positive");
  const T = t / N;
  const omega = TWO_PI / T;
  const v = omega * r;
  return { T, f: 1 / T, omega, v, a_c: omega * omega * r };
}

/**
 * True when a stopped clock is within `tolerance` revolutions of the target N.
 * Used to reject measurements stopped far from the reference mark.
 */
export function isStopNearTarget(revolutions: number, targetN: number, tolerance = 0.25): boolean {
  if (!Number.isFinite(revolutions) || !Number.isFinite(targetN) || targetN <= 0) return false;
  return Math.abs(revolutions - targetN) <= tolerance;
}

// ─── Simulation model (clock only; kinematics are analytic) ───────────────────

export interface CircularMotionClockState {
  t: number;
}

/**
 * The state only holds time; all kinematics are computed analytically from t,
 * so there is no integration drift in position.
 */
export const circularMotionModel: SimulationModel<CircularMotionParams, CircularMotionClockState> = {
  init: () => ({ t: 0 }),
  step: (state, dt) => ({ t: state.t + dt }),
};
