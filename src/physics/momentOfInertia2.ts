/**
 * Physics Engine for Momen Inersia II
 * (Momen Inersia Benda Tegar)
 */

import { GROUND_TRUTH_KAPPA_MIN, GROUND_TRUTH_KAPPA_MAX, GROUND_TRUTH_I0_MIN, GROUND_TRUTH_I0_MAX } from "./momentOfInertia";

// Fallback constants from MI 1 ground truth range averages
export const FALLBACK_I0 = (GROUND_TRUTH_I0_MIN + GROUND_TRUTH_I0_MAX) / 2; // 0.0035 kg·m²
export const FALLBACK_KAPPA = (GROUND_TRUTH_KAPPA_MIN + GROUND_TRUTH_KAPPA_MAX) / 2; // 0.04 Nm/rad
export const FALLBACK_T0 = 2 * Math.PI * Math.sqrt(FALLBACK_I0 / FALLBACK_KAPPA); // ~1.8596 s

/** Body Shapes for MI 2 */
export type RigidBodyShape = "solid-sphere" | "solid-cylinder";

export interface RigidBodyConfig {
  shape: RigidBodyShape;
  massKg: number;
  radiusM: number;
}

/** 
 * Computes theoretical moment of inertia of the body itself
 */
export function getBodyTheoryInertia(body: RigidBodyConfig): number {
  if (body.shape === "solid-sphere") {
    // I = 2/5 M R^2 (Bola Pejal)
    return (2 / 5) * body.massKg * body.radiusM * body.radiusM;
  } else if (body.shape === "solid-cylinder") {
    // I = 1/2 M R^2 (Silinder Pejal)
    return 0.5 * body.massKg * body.radiusM * body.radiusM;
  }
  return 0;
}

/**
 * Predicts the period of the apparatus + attached body
 * T = 2pi * sqrt((I0 + I_body) / kappa)
 */
export function getPredictedPeriodWithBody(i0: number, kappa: number, bodyInertia: number): number {
  if (kappa <= 0 || i0 < 0 || bodyInertia < 0) return 0;
  return 2 * Math.PI * Math.sqrt((i0 + bodyInertia) / kappa);
}

/**
 * Calculates measured inertia from the periods
 * I_measured = ( (T^2 / T0^2) - 1 ) * I0
 */
export function calculateMeasuredInertia(tBody: number, t0: number, i0: number): number {
  if (t0 <= 0 || i0 <= 0 || tBody <= 0) return 0;
  const ratio = (tBody * tBody) / (t0 * t0);
  return (ratio - 1) * i0;
}

/**
 * Calculates Relative Error (KSR)
 * KSR = |I_theory - I_measured| / I_theory * 100%
 */
export function calculateInertiaKSR(iTheory: number, iMeasured: number): number {
  if (iTheory <= 0) return 0;
  return Math.abs(iTheory - iMeasured) / iTheory * 100;
}

/**
 * Generates a deterministic pseudo-random seed based on body shape, trial index, and channel.
 * NO Math.random() is used.
 */
export function generateSensorNoiseSeed(shape: RigidBodyShape, trialIndex: number, channel: number): number {
  const shapeCode = shape === "solid-sphere" ? 1 : 2;
  return shapeCode * 1000 + trialIndex * 10 + channel;
}

/**
 * Simple linear congruential generator for noise.
 */
function pseudoRandom(seed: number): number {
  const a = 1664525;
  const c = 1013904223;
  const m = 4294967296;
  const next = (a * seed + c) % m;
  return next / m;
}

/**
 * Simulates timing for 5 oscillations with deterministic noise for practicum.
 */
export function simulatePracticumFiveOscillations(i0: number, kappa: number, bodyInertia: number, trialIndex: number, shape: RigidBodyShape): number {
  const tTrue = getPredictedPeriodWithBody(i0, kappa, bodyInertia);
  const totalTrue = 5 * tTrue;
  // Deterministic noise amplitude: +/- 0.5%
  const seed = generateSensorNoiseSeed(shape, trialIndex, 0); // channel 0 for timing
  const rand = pseudoRandom(seed);
  const noise = 1 + ((rand * 0.01) - 0.005);
  return totalTrue * noise;
}

// ----------------------------------------------------
// UI VALIDATION (STUDENT-CALCULATES)
// ----------------------------------------------------
export type MI2AnswerField = "period" | "inertiaTheory" | "inertiaMeasured" | "ksr";

export interface MI2Trial {
  shape: RigidBodyShape;
  mass: number;
  r: number;
  t5_1: number;
  t5_2: number;
  t5_3: number;
  t5_4: number;
  t5_5: number;
  i0: number;
  t0: number;
}

export type AnswerStatus = "empty" | "invalid" | "correct" | "too_high" | "too_low" | "check_formula";

export type FormulaDiagnosis =
  | "forgot_divide_by_5"
  | "used_t_instead_of_t_squared"
  | "used_i0_plus_ibody_theory"
  | "mixed_units_g_vs_kg"
  | "mixed_units_cm_vs_m";

export interface AnswerFeedback {
  status: AnswerStatus;
  diagnosis?: FormulaDiagnosis;
}

export function parseAnswer(val: string | number | undefined | null): number | null {
  if (val === undefined || val === null) return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  const cleaned = val.replace(/,/g, ".").trim();
  if (cleaned === "") return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function validateMI2Answers(
  trial: MI2Trial,
  answers: Record<MI2AnswerField, string | number>
): Record<MI2AnswerField, AnswerFeedback> {
  const result: Record<MI2AnswerField, AnswerFeedback> = {
    period: { status: "empty" },
    inertiaTheory: { status: "empty" },
    inertiaMeasured: { status: "empty" },
    ksr: { status: "empty" },
  };
  
  const T5_avg = (trial.t5_1 + trial.t5_2 + trial.t5_3 + trial.t5_4 + trial.t5_5) / 5;
  const trueT = T5_avg / 5;
  
  const trueITheory = getBodyTheoryInertia({ shape: trial.shape, massKg: trial.mass, radiusM: trial.r });
  const trueIMeasured = calculateMeasuredInertia(trueT, trial.t0, trial.i0);
  const trueKSR = calculateInertiaKSR(trueITheory, trueIMeasured);

  const check = (val: number | null, expected: number, field: MI2AnswerField, tolPct = 1.0) => {
    if (val === null) {
      result[field].status = "invalid";
      return;
    }
    const diff = val - expected;
    const maxDiff = Math.max(expected * (tolPct / 100), 0.0001); // absolute floor
    
    if (Math.abs(diff) <= maxDiff) {
      result[field].status = "correct";
      return;
    }

    // Specific diagnoses
    if (field === "period") {
      if (Math.abs(val - T5_avg) < 0.1) {
        result[field] = { status: "check_formula", diagnosis: "forgot_divide_by_5" };
        return;
      }
    } else if (field === "inertiaTheory") {
      // Used I_theory = I0 + I_body
      if (Math.abs(val - (trueITheory + trial.i0)) < 0.0001) {
         result[field] = { status: "check_formula", diagnosis: "used_i0_plus_ibody_theory" };
         return;
      }
      // Used grams instead of kg (val is ~1000x larger)
      if (Math.abs(val - (trueITheory * 1000)) < 0.1) {
         result[field] = { status: "check_formula", diagnosis: "mixed_units_g_vs_kg" };
         return;
      }
    } else if (field === "inertiaMeasured") {
      // Used T instead of T^2 -> I = (T/T0 - 1)*I0
      const wrongIMeasured = (trueT / trial.t0 - 1) * trial.i0;
      if (Math.abs(val - wrongIMeasured) < 0.0001) {
         result[field] = { status: "check_formula", diagnosis: "used_t_instead_of_t_squared" };
         return;
      }
    }

    result[field].status = val > expected ? "too_high" : "too_low";
  };

  const aT = parseAnswer(answers.period);
  if (answers.period !== undefined && answers.period !== "") check(aT, trueT, "period", 1.0);

  const aIT = parseAnswer(answers.inertiaTheory);
  if (answers.inertiaTheory !== undefined && answers.inertiaTheory !== "") check(aIT, trueITheory, "inertiaTheory", 2.0);

  const aIM = parseAnswer(answers.inertiaMeasured);
  if (answers.inertiaMeasured !== undefined && answers.inertiaMeasured !== "") check(aIM, trueIMeasured, "inertiaMeasured", 5.0); // allows more propagation error

  const aKSR = parseAnswer(answers.ksr);
  if (answers.ksr !== undefined && answers.ksr !== "") check(aKSR, trueKSR, "ksr", 5.0);

  return result;
}

export function computeMI2ReferenceValues(trial: MI2Trial) {
  const T5_avg = (trial.t5_1 + trial.t5_2 + trial.t5_3 + trial.t5_4 + trial.t5_5) / 5;
  const trueT = T5_avg / 5;
  const trueITheory = getBodyTheoryInertia({ shape: trial.shape, massKg: trial.mass, radiusM: trial.r });
  const trueIMeasured = calculateMeasuredInertia(trueT, trial.t0, trial.i0);
  const trueKSR = calculateInertiaKSR(trueITheory, trueIMeasured);
  return { period: trueT, inertiaTheory: trueITheory, inertiaMeasured: trueIMeasured, ksr: trueKSR };
}
