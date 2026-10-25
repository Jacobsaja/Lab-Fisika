/**
 * Pure Physics Engine & Analytical Models for Modul 5: Hukum II Newton (H2N)
 *
 * System Model:
 * Glider / cart on a horizontal air track connected via an inextensible string over a light pulley
 * to a hanging mass falling under gravity.
 *
 * Governing Equations:
 * 1. Pulling force (driving force):
 *    F = m · g
 * 2. System total inertia:
 *    M_total = M + m + m_eff (ideal: m_eff = 0)
 * 3. Theoretical acceleration:
 *    a_teori = (m·g − f) / (M + m + m_eff)   (ideal: f = 0, m_eff = 0 → F / (M + m))
 * 4. String tension on cart:
 *    T = M · a
 * 5. Measured velocities at photogates:
 *    v1 = w / t1,  v2 = w / t2  (w = flag width = 3 cm)
 * 6. Experimental acceleration from kinematic relation:
 *    a_hitung = (v2² − v1²) / (2 · s12)
 *
 * Reuses core mechanics from `airTrackPulleySystem.ts` without duplicating dynamics.
 * Pure, deterministic, React-free.
 */

import {
  G_STANDARD,
  systemAcceleration,
  computeAirTrackTrial,
  AirTrackTrialResult,
  GateSetup,
  AirTrackGeometry,
} from "./airTrackPulleySystem";
import { calculateLinearRegression, LinearRegressionResult } from "./regression";

export { G_STANDARD };

// ─── Default Dimensions & Apparatus Geometry ─────────────────────────────────

export const H2N_DROP_HEIGHT_H0 = 0.8; // 80 cm
export const H2N_RAIL_TRAVEL = 1.1; // 110 cm
export const H2N_FLAG_WIDTH = 0.03; // 3 cm

// Experiment 4.1: Gate locations: x1 = 25 cm, x2 = 65 cm → s12 = 40 cm
export const H2N_EXP1_GATE1_X = 0.25;
export const H2N_EXP1_GATE2_X = 0.65;
export const H2N_EXP1_S12 = 0.4;

// Experiment 4.2: Gate locations: x1 = 5 cm, x2 = 45 cm → s12 = 40 cm
export const H2N_EXP2_GATE1_X = 0.05;
export const H2N_EXP2_GATE2_X = 0.45;
export const H2N_EXP2_S12 = 0.4;

// ─── Pure Dynamics Helper Functions ──────────────────────────────────────────

/**
 * Calculates gravitational pulling force F = m · g (N).
 */
export function calculatePullingForce(mKg: number, g = G_STANDARD): number {
  if (!(mKg > 0) || !(g > 0) || !Number.isFinite(mKg)) return 0;
  return mKg * g;
}

/**
 * Calculates theoretical acceleration a_teori = (m·g − f) / (M + m + m_eff).
 * For ideal conditions (f = 0, m_eff = 0), a = (m·g) / (M + m).
 */
export function calculateTheoreticalAcceleration(
  cartMassKg: number,
  hangingMassKg: number,
  g = G_STANDARD,
  frictionForce = 0,
  pulleyEffectiveMass = 0
): number {
  return systemAcceleration({
    cartMass: cartMassKg,
    hangingMass: hangingMassKg,
    g,
    frictionForce,
    pulleyEffectiveMass,
  });
}

/**
 * String tension T = M · a (for cart mass M accelerating at a).
 */
export function calculateStringTension(cartMassKg: number, acceleration: number): number {
  if (!(cartMassKg > 0) || !(acceleration > 0)) return 0;
  return cartMassKg * acceleration;
}

/**
 * Calculates experimental acceleration from measured photogate speeds:
 * a_hitung = (v2² − v1²) / (2 · s12).
 * Returns 0 if s12 <= 0 or inputs are invalid.
 */
export function calculateExperimentalAcceleration(
  v1: number,
  v2: number,
  s12: number
): number {
  if (!(s12 > 0) || !Number.isFinite(s12) || !Number.isFinite(v1) || !Number.isFinite(v2)) {
    return 0;
  }
  const diffSq = v2 * v2 - v1 * v1;
  return diffSq / (2 * s12);
}

/**
 * Calculates absolute percentage difference between calculated acceleration and theoretical:
 * |a_hitung − a_teori| / a_teori × 100 %.
 */
export function calculateAccelerationDiffPercent(
  aCalc: number,
  aTheory: number
): number {
  if (!(aTheory > 0) || !Number.isFinite(aTheory) || !Number.isFinite(aCalc)) return 0;
  return (Math.abs(aCalc - aTheory) / aTheory) * 100;
}

// ─── Trial Preset Definitions ────────────────────────────────────────────────

export interface H2NTrialPreset {
  no: number;
  /** Cart mass M in kg */
  cartMass: number;
  /** Hanging mass m in kg */
  hangingMass: number;
  /** Pulling force F in N */
  pullingForce: number;
  /** Theoretical acceleration in m/s² */
  aTheory: number;
  /** String tension T in N */
  tension: number;
  /** Optional label for extra slotted mass on cart */
  cartAddedLabel?: string;
  description: string;
}

/**
 * Percobaan 4.1 (Tabel 5.1):
 * Pengaruh Variasi Massa Kereta (M) pada Gaya Tetap (m = 15 g, F = 0.147 N).
 * Base cart mass = 150 g, with 0 to 4 slotted masses of 12.5 g added to cart.
 */
export const H2N_TABLE_5_1_PRESETS: H2NTrialPreset[] = [
  {
    no: 1,
    cartMass: 0.15,
    hangingMass: 0.015,
    pullingForce: 0.015 * G_STANDARD,
    aTheory: (0.015 * G_STANDARD) / (0.15 + 0.015),
    tension: 0.15 * ((0.015 * G_STANDARD) / (0.15 + 0.015)),
    description: "Kereta dasar (M = 150 g, tanpa beban tambahan)",
  },
  {
    no: 2,
    cartMass: 0.1625,
    hangingMass: 0.015,
    pullingForce: 0.015 * G_STANDARD,
    aTheory: (0.015 * G_STANDARD) / (0.1625 + 0.015),
    tension: 0.1625 * ((0.015 * G_STANDARD) / (0.1625 + 0.015)),
    cartAddedLabel: "+12.5g",
    description: "Kereta + 1 beban 12.5 g (M = 162.5 g)",
  },
  {
    no: 3,
    cartMass: 0.175,
    hangingMass: 0.015,
    pullingForce: 0.015 * G_STANDARD,
    aTheory: (0.015 * G_STANDARD) / (0.175 + 0.015),
    tension: 0.175 * ((0.015 * G_STANDARD) / (0.175 + 0.015)),
    cartAddedLabel: "+25g",
    description: "Kereta + 2 beban 12.5 g (M = 175.0 g)",
  },
  {
    no: 4,
    cartMass: 0.1875,
    hangingMass: 0.015,
    pullingForce: 0.015 * G_STANDARD,
    aTheory: (0.015 * G_STANDARD) / (0.1875 + 0.015),
    tension: 0.1875 * ((0.015 * G_STANDARD) / (0.1875 + 0.015)),
    cartAddedLabel: "+37.5g",
    description: "Kereta + 3 beban 12.5 g (M = 187.5 g)",
  },
  {
    no: 5,
    cartMass: 0.2,
    hangingMass: 0.015,
    pullingForce: 0.015 * G_STANDARD,
    aTheory: (0.015 * G_STANDARD) / (0.2 + 0.015),
    tension: 0.2 * ((0.015 * G_STANDARD) / (0.2 + 0.015)),
    cartAddedLabel: "+50g",
    description: "Kereta + 4 beban 12.5 g (M = 200.0 g)",
  },
];

/**
 * Percobaan 4.2 (Tabel 5.2):
 * Pengaruh Variasi Gaya Tarik (F = m·g) pada Massa Total Sistem Tetap (M + m = 175 g = 0.175 kg).
 * Penggantung 5 g ditambah 0-4 beban 5 g yang dipindahkan dari kereta.
 * As a result, M decreases as m increases, keeping M + m = 0.175 kg constant.
 */
export const H2N_TABLE_5_2_PRESETS: H2NTrialPreset[] = [
  {
    no: 1,
    cartMass: 0.17, // 150g + 4x 5g on cart
    hangingMass: 0.005, // 5g hanger
    pullingForce: 0.005 * G_STANDARD, // 0.049 N (1F)
    aTheory: (0.005 * G_STANDARD) / 0.175, // 0.280 m/s²
    tension: 0.17 * ((0.005 * G_STANDARD) / 0.175),
    cartAddedLabel: "+20g",
    description: "Beban gantung 5 g (1F), 4 beban di kereta (M+m = 175 g)",
  },
  {
    no: 2,
    cartMass: 0.165, // 150g + 3x 5g on cart
    hangingMass: 0.01, // 5g + 5g
    pullingForce: 0.01 * G_STANDARD, // 0.098 N (2F)
    aTheory: (0.01 * G_STANDARD) / 0.175, // 0.560 m/s²
    tension: 0.165 * ((0.01 * G_STANDARD) / 0.175),
    cartAddedLabel: "+15g",
    description: "Beban gantung 10 g (2F), 3 beban di kereta (M+m = 175 g)",
  },
  {
    no: 3,
    cartMass: 0.16, // 150g + 2x 5g on cart
    hangingMass: 0.015, // 5g + 2x 5g
    pullingForce: 0.015 * G_STANDARD, // 0.147 N (3F)
    aTheory: (0.015 * G_STANDARD) / 0.175, // 0.840 m/s²
    tension: 0.16 * ((0.015 * G_STANDARD) / 0.175),
    cartAddedLabel: "+10g",
    description: "Beban gantung 15 g (3F), 2 beban di kereta (M+m = 175 g)",
  },
  {
    no: 4,
    cartMass: 0.155, // 150g + 1x 5g on cart
    hangingMass: 0.02, // 5g + 3x 5g
    pullingForce: 0.02 * G_STANDARD, // 0.196 N (4F)
    aTheory: (0.02 * G_STANDARD) / 0.175, // 1.120 m/s²
    tension: 0.155 * ((0.02 * G_STANDARD) / 0.175),
    cartAddedLabel: "+5g",
    description: "Beban gantung 20 g (4F), 1 beban di kereta (M+m = 175 g)",
  },
  {
    no: 5,
    cartMass: 0.15, // 150g + 0 beban di kereta
    hangingMass: 0.025, // 5g + 4x 5g
    pullingForce: 0.025 * G_STANDARD, // 0.245 N (5F)
    aTheory: (0.025 * G_STANDARD) / 0.175, // 1.400 m/s²
    tension: 0.15 * ((0.025 * G_STANDARD) / 0.175),
    cartAddedLabel: undefined,
    description: "Beban gantung 25 g (5F), 0 beban di kereta (M+m = 175 g)",
  },
];

// ─── Trial Execution Result ──────────────────────────────────────────────────

export interface H2NTrialResult {
  no: number;
  cartMass: number;
  hangingMass: number;
  pullingForce: number;
  t1: number | null;
  t2: number | null;
  v1: number;
  v2: number;
  aCalc: number;
  aTheory: number;
  diffPercent: number;
  tension: number;
  totalMass: number;
  s12: number;
}

/**
 * Computes an H2N simulation trial using the exact photogate kinematics from airTrackPulleySystem.
 */
export function computeH2NTrial(
  cartMassKg: number,
  hangingMassKg: number,
  gate1X: number,
  gate2X: number,
  flagWidth = H2N_FLAG_WIDTH,
  frictionForce = 0,
  pulleyEffectiveMass = 0,
  trialNo = 1
): H2NTrialResult {
  const geometry: AirTrackGeometry = {
    dropHeight: H2N_DROP_HEIGHT_H0,
    railTravel: H2N_RAIL_TRAVEL,
  };
  const gates: GateSetup = {
    gate1Position: gate1X,
    gate2Position: gate2X,
    flagWidth,
  };
  const params = {
    cartMass: cartMassKg,
    hangingMass: hangingMassKg,
    frictionForce,
    pulleyEffectiveMass,
  };

  const raw = computeAirTrackTrial(params, geometry, gates);
  const s12 = Math.abs(gate2X - gate1X);
  const aCalc = calculateExperimentalAcceleration(raw.v1, raw.v2, s12);
  const F = calculatePullingForce(hangingMassKg);
  const diffPercent = calculateAccelerationDiffPercent(aCalc, raw.acceleration);
  const tension = calculateStringTension(cartMassKg, raw.acceleration);

  return {
    no: trialNo,
    cartMass: cartMassKg,
    hangingMass: hangingMassKg,
    pullingForce: F,
    t1: raw.t1,
    t2: raw.t2,
    v1: raw.v1,
    v2: raw.v2,
    aCalc,
    aTheory: raw.acceleration,
    diffPercent,
    tension,
    totalMass: cartMassKg + hangingMassKg,
    s12,
  };
}

// ─── Linear Regression Analysis Helpers ──────────────────────────────────────

export interface H2NRegressionAnalysis {
  regression: LinearRegressionResult;
  slope: number;
  intercept: number;
  rSquared: number;
  expectedSlope: number;
  slopeDiffPercent: number;
}

/**
 * Experiment 4.1 Analysis:
 * Plot a (y-axis) vs 1/(M+m) (x-axis).
 * Theoretical relation: a = F · [1 / (M + m)].
 * Expected slope = F = 0.015 · 9.8 = 0.147 N.
 */
export function analyzeH2NExperiment41(
  trials: { cartMass: number; hangingMass: number; a: number }[]
): H2NRegressionAnalysis | null {
  if (!trials || trials.length < 3) return null;
  const points = trials.map((t) => ({
    x: 1 / (t.cartMass + t.hangingMass),
    y: t.a,
  }));
  const regression = calculateLinearRegression(points);
  const expectedSlope = 0.015 * G_STANDARD; // 0.147 N
  const slopeDiffPercent = (Math.abs(regression.b - expectedSlope) / expectedSlope) * 100;
  return {
    regression,
    slope: regression.b,
    intercept: regression.a,
    rSquared: regression.r2,
    expectedSlope,
    slopeDiffPercent,
  };
}

/**
 * Experiment 4.2 Analysis:
 * Plot a (y-axis) vs F (x-axis).
 * Theoretical relation: a = [1 / (M + m)] · F.
 * Expected slope = 1 / 0.175 ≈ 5.714 kg⁻¹.
 */
export function analyzeH2NExperiment42(
  trials: { pullingForce: number; a: number }[]
): H2NRegressionAnalysis | null {
  if (!trials || trials.length < 3) return null;
  const points = trials.map((t) => ({
    x: t.pullingForce,
    y: t.a,
  }));
  const regression = calculateLinearRegression(points);
  const expectedSlope = 1 / 0.175; // ~5.714 kg^-1
  const slopeDiffPercent = (Math.abs(regression.b - expectedSlope) / expectedSlope) * 100;
  return {
    regression,
    slope: regression.b,
    intercept: regression.a,
    rSquared: regression.r2,
    expectedSlope,
    slopeDiffPercent,
  };
}

