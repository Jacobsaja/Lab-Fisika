/**
 * Validation of student-calculated values for the Rolling Motion practicum.
 *
 * Pure functions only (no React, no randomness). The student computes, by hand:
 *   - a_theory  = g·sinθ / (1 + k)
 *   - Error (%) = |a_theory − a_graph| / a_theory × 100
 *   - I_exp     = m·R²·(g·sinθ / a_graph − 1)
 *
 * Feedback never contains the reference value; it only reports a status and,
 * when recognisable, a diagnosis code for a typical formula/unit mistake.
 */
import { calculateRollingAcceleration } from "./rollingMotion";

/** Gravitational acceleration given to students in the practicum. */
export const PRACTICUM_G = 9.8;

/** Relative tolerance for a_theory (2 %). */
export const ANSWER_RELATIVE_TOLERANCE = 0.02;

/**
 * Relative tolerance for I_exp. Wider than for a_theory because
 * I ∝ (g·sinθ/a − 1) amplifies rounding of sinθ or a by roughly ×3
 * (solid cylinder), so a student rounding sinθ to 3 significant digits
 * would otherwise be marked wrong.
 */
export const INERTIA_RELATIVE_TOLERANCE = 0.05;

/**
 * Absolute tolerance for Error (%) in percentage points. The error is a small
 * number (often < 5 %), so a purely relative tolerance would be unreasonably tight.
 * An error entry is accepted when it is within ANSWER_RELATIVE_TOLERANCE OR this value.
 */
export const ERROR_PCT_ABSOLUTE_TOLERANCE = 0.1;

/** Tiny slack so values exactly on the tolerance boundary are accepted despite float rounding. */
const FLOAT_EPSILON = 1e-9;

/**
 * A typical-mistake candidate is only diagnosed when it lies more than
 * CANDIDATE_SEPARATION × tolerance away from the correct value.
 */
export const CANDIDATE_SEPARATION = 2;

export type RollingAnswerField = "aTheory" | "errorPct" | "inertia";

export type AnswerStatus =
  | "empty"
  | "invalid"
  | "correct"
  | "too_high"
  | "too_low"
  | "check_formula";

export type FormulaDiagnosis =
  | "missing_inertia_factor"
  | "wrong_inertia_factor"
  | "degree_radian_mixup"
  | "cos_instead_of_sin"
  | "unit_scale"
  | "fraction_not_percent"
  | "wrong_reference"
  | "sign"
  | "missing_minus_one"
  | "radius_not_squared"
  | "used_theory_acceleration";

export interface AnswerFeedback {
  status: AnswerStatus;
  diagnosis?: FormulaDiagnosis;
}

export interface RollingTrial {
  shape: "solid" | "hollow";
  thetaDeg: number;
  /** kg */
  mass: number;
  /** m */
  r: number;
  /** m (only used for hollow) */
  rInner: number;
  /** Measured acceleration from the v–t regression, m/s² */
  aGraph: number;
  /** Defaults to PRACTICUM_G */
  g?: number;
}

export interface RollingReferenceValues {
  /** I_cm / (m·R²) */
  k: number;
  aTheory: number;
  errorPct: number;
  inertia: number;
}

export type RawAnswer = string | number | null | undefined;

export interface RollingAnswers {
  aTheory: RawAnswer;
  errorPct: RawAnswer;
  inertia: RawAnswer;
}

export type RollingRowFeedback = Record<RollingAnswerField, AnswerFeedback>;

// ─── Helpers ────────────────────────────────────────────────────────────────

const DEG = Math.PI / 180;

export function inertiaFactor(shape: "solid" | "hollow", r: number, rInner: number): number {
  return shape === "solid" ? 0.5 : 0.5 * (1 + (rInner / r) ** 2);
}

/**
 * Parses a student entry. Accepts numbers, "1.58", "1,58" (Indonesian decimal comma)
 * and surrounding whitespace. Returns null for empty input, NaN for unparseable input.
 */
export function parseAnswer(raw: RawAnswer): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : NaN;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const normalised = trimmed.replace(",", ".");
  if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(normalised)) return NaN;
  return Number(normalised);
}

/** True when |value − reference| ≤ max(relTol·|reference|, absTol) (inclusive). */
export function isWithinTolerance(
  value: number,
  reference: number,
  relTol: number,
  absTol: number = 0
): boolean {
  const allowed = Math.max(relTol * Math.abs(reference), absTol);
  return Math.abs(value - reference) <= allowed + FLOAT_EPSILON;
}

export function computeReferenceValues(trial: RollingTrial): RollingReferenceValues {
  const g = trial.g ?? PRACTICUM_G;
  const k = inertiaFactor(trial.shape, trial.r, trial.rInner);
  const aTheory = calculateRollingAcceleration(trial.shape, trial.thetaDeg, trial.r, trial.rInner, g);
  const errorPct = (Math.abs(aTheory - trial.aGraph) / aTheory) * 100;
  const inertia = trial.mass * trial.r ** 2 * ((g * Math.sin(trial.thetaDeg * DEG)) / trial.aGraph - 1);
  return { k, aTheory, errorPct, inertia };
}

interface Candidate {
  value: number;
  diagnosis: FormulaDiagnosis;
}

function classify(
  value: number | null,
  reference: number,
  relTol: number,
  absTol: number,
  candidates: Candidate[],
  alsoCorrect: number[] = []
): AnswerFeedback {
  if (value === null) return { status: "empty" };
  if (Number.isNaN(value)) return { status: "invalid" };
  if (isWithinTolerance(value, reference, relTol, absTol)) return { status: "correct" };
  for (const alt of alsoCorrect) {
    if (isWithinTolerance(value, alt, relTol, absTol)) return { status: "correct" };
  }
  for (const c of candidates) {
    if (!Number.isFinite(c.value)) continue;
    // Only use candidates clearly separated from the correct answer (> 2× tolerance);
    // otherwise a slightly-off answer could be misdiagnosed as a formula mistake.
    if (isWithinTolerance(c.value, reference, CANDIDATE_SEPARATION * relTol, CANDIDATE_SEPARATION * absTol)) continue;
    if (isWithinTolerance(value, c.value, relTol, absTol)) {
      return { status: "check_formula", diagnosis: c.diagnosis };
    }
  }
  return { status: value > reference ? "too_high" : "too_low" };
}

// ─── Field validators ───────────────────────────────────────────────────────

export function validateTheoryAnswer(trial: RollingTrial, raw: RawAnswer): AnswerFeedback {
  const g = trial.g ?? PRACTICUM_G;
  const { k, aTheory } = computeReferenceValues(trial);
  const sinDeg = Math.sin(trial.thetaDeg * DEG);
  const sinRad = Math.sin(trial.thetaDeg); // calculator left in radian mode
  const cosDeg = Math.cos(trial.thetaDeg * DEG);
  const ratio2 = (trial.rInner / trial.r) ** 2;

  const wrongKs = trial.shape === "solid"
    ? [1, 0.4, 2 / 3, 0.5 * (1 + ratio2)]
    : [0.5, 1, 0.4, 0.5 * (1 - ratio2), 1 + ratio2, ratio2];

  const candidates: Candidate[] = [
    { value: g * sinDeg, diagnosis: "missing_inertia_factor" },
    { value: g * sinDeg * (1 + k), diagnosis: "missing_inertia_factor" },
    ...wrongKs.map((kw) => ({ value: (g * sinDeg) / (1 + kw), diagnosis: "wrong_inertia_factor" as const })),
    { value: (g * sinRad) / (1 + k), diagnosis: "degree_radian_mixup" },
    { value: g * sinRad, diagnosis: "degree_radian_mixup" },
    { value: (g * cosDeg) / (1 + k), diagnosis: "cos_instead_of_sin" },
    { value: aTheory * 100, diagnosis: "unit_scale" },
    { value: aTheory / 100, diagnosis: "unit_scale" },
  ];

  return classify(parseAnswer(raw), aTheory, ANSWER_RELATIVE_TOLERANCE, 0, candidates);
}

/**
 * @param studentATheory The student's own a_theory entry. If it was accepted as
 *   correct, an error computed consistently from it is also accepted.
 */
export function validateErrorAnswer(
  trial: RollingTrial,
  raw: RawAnswer,
  studentATheory?: RawAnswer
): AnswerFeedback {
  const { aTheory, errorPct } = computeReferenceValues(trial);
  const diff = Math.abs(aTheory - trial.aGraph);

  const alsoCorrect: number[] = [];
  const studentA = parseAnswer(studentATheory);
  if (
    studentA !== null && !Number.isNaN(studentA) && studentA !== 0 &&
    isWithinTolerance(studentA, aTheory, ANSWER_RELATIVE_TOLERANCE)
  ) {
    alsoCorrect.push((Math.abs(studentA - trial.aGraph) / studentA) * 100);
  }

  const candidates: Candidate[] = [
    { value: errorPct / 100, diagnosis: "fraction_not_percent" },
    { value: (diff / trial.aGraph) * 100, diagnosis: "wrong_reference" },
    { value: -errorPct, diagnosis: "sign" },
  ];

  return classify(
    parseAnswer(raw),
    errorPct,
    ANSWER_RELATIVE_TOLERANCE,
    ERROR_PCT_ABSOLUTE_TOLERANCE,
    candidates,
    alsoCorrect
  );
}

export function validateInertiaAnswer(trial: RollingTrial, raw: RawAnswer): AnswerFeedback {
  const g = trial.g ?? PRACTICUM_G;
  const { k, aTheory, inertia } = computeReferenceValues(trial);
  const { mass: m, r, aGraph, thetaDeg } = trial;
  const sinDeg = Math.sin(thetaDeg * DEG);

  const candidates: Candidate[] = [
    { value: m * r ** 2 * ((g * sinDeg) / aGraph), diagnosis: "missing_minus_one" },
    { value: m * r * ((g * sinDeg) / aGraph - 1), diagnosis: "radius_not_squared" },
    { value: m * r ** 2 * ((g * Math.sin(thetaDeg)) / aGraph - 1), diagnosis: "degree_radian_mixup" },
    { value: m * r ** 2 * ((g * Math.cos(thetaDeg * DEG)) / aGraph - 1), diagnosis: "cos_instead_of_sin" },
    { value: k * m * r ** 2, diagnosis: "used_theory_acceleration" },
    { value: m * r ** 2 * ((g * sinDeg) / aTheory - 1), diagnosis: "used_theory_acceleration" },
    { value: inertia * 1e4, diagnosis: "unit_scale" }, // R in cm
    { value: inertia * 1e3, diagnosis: "unit_scale" }, // m in g
    { value: inertia * 1e7, diagnosis: "unit_scale" }, // both
  ];

  return classify(parseAnswer(raw), inertia, INERTIA_RELATIVE_TOLERANCE, 0, candidates);
}

export function validateRollingAnswers(trial: RollingTrial, answers: RollingAnswers): RollingRowFeedback {
  return {
    aTheory: validateTheoryAnswer(trial, answers.aTheory),
    errorPct: validateErrorAnswer(trial, answers.errorPct, answers.aTheory),
    inertia: validateInertiaAnswer(trial, answers.inertia),
  };
}
