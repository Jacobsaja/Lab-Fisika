/**
 * Pure Physics Engine & Analytical Models for Modul 11: Sifat-Sifat Gelombang (SSG)
 * Topic: Wave Optics - Single-Slit & Multi-Slit Interference and Diffraction
 *
 * System Model & Physics Rules:
 * 1. Monochromatic Laser Light:
 *    Wavelength lambda = 632 nm (default), Distance slit-to-screen L = 1.6 m (default).
 * 2. Slit Parameters (Configurable & Presets):
 *    - Slit II (N = 2): a = 0.04 mm, d = 0.5 mm (from lab manual).
 *    - Slit III (N = 3): a = 0.04 mm, d = 0.5 mm (ASSUMPTION: same as slit II, only N differs).
 *    - Slit IIIII (N = 5): a = 0.04 mm, d = 0.5 mm (ASSUMPTION: same as slit II, only N differs).
 * 3. Module Lab Manual Formulas (Used for Student Journal & Table 11.1 - 11.3):
 *    - Single slit dark: y_n = n · lambda · L / a
 *    - Single slit bright: y_n = (n + 1/2) · lambda · L / a (y_0 = 0)
 *    - Multi-slit primary bright: y_n = n · lambda · L / d
 *    - Multi-slit dark: y_n = (1/2 + (n - 1)) · lambda · L / d
 *      NOTE: The above dark formula from the lab manual is strictly valid ONLY for N = 2.
 *    - General estimated position used in student tables:
 *      y(Tn, N) = (Tn / (N - 1)) · (lambda · L / d), for Tn = 0, 1, 2, 3, 4.
 *    - Counts between primaries: n(Ts) = N - 2, n(G) = N - 1.
 * 4. Exact Fraunhofer Wave Optics (Used for Physical Screen Intensity & Graph):
 *    I(y) = sinc^2(beta) · [sin(N·alpha) / (N · sin(alpha))]^2
 *    alpha = pi · d · y / (lambda · L), beta = pi · a · y / (lambda · L)
 *    Fraunhofer exact minima occur at: y = k · lambda · L / (N · d), where k != m · N.
 * 5. Relative Uncertainty (KSR%):
 *    KSR% = |y_teori - y_praktikum| / y_teori * 100%.
 *    For y_teori = 0 (Tn = 0), returns null (undefined, not scored).
 *
 * Pure, deterministic, React-free.
 */

// ─── Physical Constants & Default Configuration ──────────────────────────────

/** Standard semiconductor / He-Ne laser wavelength in meters (632 nm) */
export const DEFAULT_LASER_WAVELENGTH = 632e-9;

/** Default distance between slit wheel and projection screen in meters (1.6 m) */
export const DEFAULT_SCREEN_DISTANCE_L = 1.6;

/** Standard millimeter block ruler reading resolution in mm */
export const READING_RESOLUTION_MM = 0.5;

/** Precision zoom reading resolution in mm */
export const ZOOM_READING_RESOLUTION_MM = 0.1;

export interface SlitDefinition {
  id: string;
  name: string;
  N: number;
  /** Slit width in meters */
  a: number;
  /** Slit separation (center-to-center) in meters */
  d: number;
}

/**
 * Standard slit wheel presets for the lab experiment.
 *
 * ASSUMPTION:
 * The lab manual explicitly specifies dimensions for Slit II: a = 0.04 mm, d = 0.5 mm.
 * Dimensions for Slit III and Slit IIIII are NOT explicitly provided in the manual text.
 * By standard laboratory equipment convention, we assume that slit width 'a' (0.04 mm)
 * and center-to-center separation 'd' (0.5 mm) remain identical across the set,
 * differing only by slit count N (2, 3, 5).
 */
export const SSG_SLIT_PRESETS: Record<"slit2" | "slit3" | "slit5", SlitDefinition> = {
  slit2: {
    id: "slit2",
    name: "Celah II",
    N: 2,
    a: 0.04e-3, // 0.04 mm
    d: 0.5e-3,  // 0.5 mm
  },
  slit3: {
    id: "slit3",
    name: "Celah III",
    N: 3,
    a: 0.04e-3, // 0.04 mm (ASSUMPTION)
    d: 0.5e-3,  // 0.5 mm (ASSUMPTION)
  },
  slit5: {
    id: "slit5",
    name: "Celah IIIII",
    N: 5,
    a: 0.04e-3, // 0.04 mm (ASSUMPTION)
    d: 0.5e-3,  // 0.5 mm (ASSUMPTION)
  },
};

// ─── Input Validation ────────────────────────────────────────────────────────

export interface WaveOpticsParams {
  lambda: number;
  L: number;
  a: number;
  d: number;
  N: number;
}

/**
 * Validates optical system parameters.
 */
export function validateWaveOpticsParams(params: WaveOpticsParams): boolean {
  return (
    Number.isFinite(params.lambda) &&
    params.lambda > 0 &&
    Number.isFinite(params.L) &&
    params.L > 0 &&
    Number.isFinite(params.a) &&
    params.a > 0 &&
    Number.isFinite(params.d) &&
    params.d > 0 &&
    Number.isInteger(params.N) &&
    params.N >= 1
  );
}

// ─── Analytical Module Formulas (Student Lab Manual) ─────────────────────────

/**
 * Single-slit dark fringe position (diffraction minimum) in meters:
 * y_n = n · lambda · L / a (n = 1, 2, 3, ...)
 */
export function singleSlitDarkPosition(
  n: number,
  lambda = DEFAULT_LASER_WAVELENGTH,
  L = DEFAULT_SCREEN_DISTANCE_L,
  a = SSG_SLIT_PRESETS.slit2.a
): number {
  if (n <= 0 || lambda <= 0 || L <= 0 || a <= 0) return 0;
  return (n * lambda * L) / a;
}

/**
 * Single-slit bright fringe position (approximate diffraction secondary maximum) in meters:
 * y_0 = 0 (central maximum)
 * y_n = (n + 1/2) · lambda · L / a (n = 1, 2, 3, ...)
 */
export function singleSlitBrightPosition(
  n: number,
  lambda = DEFAULT_LASER_WAVELENGTH,
  L = DEFAULT_SCREEN_DISTANCE_L,
  a = SSG_SLIT_PRESETS.slit2.a
): number {
  if (n < 0 || lambda <= 0 || L <= 0 || a <= 0) return 0;
  if (n === 0) return 0;
  return ((n + 0.5) * lambda * L) / a;
}

/**
 * Multi-slit primary bright fringe position (interference principal maximum) in meters:
 * y_n = n · lambda · L / d (n = 0, 1, 2, ...)
 */
export function multiSlitPrimaryPosition(
  n: number,
  lambda = DEFAULT_LASER_WAVELENGTH,
  L = DEFAULT_SCREEN_DISTANCE_L,
  d = SSG_SLIT_PRESETS.slit2.d
): number {
  if (n < 0 || lambda <= 0 || L <= 0 || d <= 0) return 0;
  return (n * lambda * L) / d;
}

/**
 * Multi-slit dark fringe position according to the lab manual formula:
 * y_n = (1/2 + (n - 1)) · lambda · L / d
 *
 * IMPORTANT NOTE:
 * This lab manual formula is strictly valid ONLY for N = 2 (Young's double slit).
 * For N >= 3, the minima do not occur at half-integer multiples of lambda*L/d;
 * instead, Fraunhofer exact minima occur at k · lambda · L / (N · d) for k != m · N.
 * Explore mode graphics and markers must use `fraunhoferMinimaPositions()`.
 */
export function multiSlitDarkPositionModule(
  n: number,
  lambda = DEFAULT_LASER_WAVELENGTH,
  L = DEFAULT_SCREEN_DISTANCE_L,
  d = SSG_SLIT_PRESETS.slit2.d
): number {
  if (n <= 0 || lambda <= 0 || L <= 0 || d <= 0) return 0;
  return ((0.5 + (n - 1)) * lambda * L) / d;
}

/**
 * Number of secondary bright fringes between two adjacent primary maxima:
 * n(Ts) = N - 2  (for N >= 2)
 */
export function secondaryMaximaCount(N: number): number {
  return Math.max(0, N - 2);
}

/**
 * Number of dark fringes (minima) between two adjacent primary maxima:
 * n(G) = N - 1   (for N >= 1)
 */
export function darkCountBetweenPrimaries(N: number): number {
  return Math.max(0, N - 1);
}

/**
 * Determines whether peak index Tn corresponds to a primary principal maximum.
 * Pattern Tn is a primary peak if Tn mod (N - 1) === 0.
 * Otherwise, it is a secondary maximum.
 */
export function isPrimaryPattern(tn: number, N: number): boolean {
  if (tn < 0 || N < 1) return false;
  if (N === 1) return tn === 0;
  return tn % (N - 1) === 0;
}

/**
 * Classifies peak index Tn as "primer" or "sekunder".
 */
export function getPatternClassification(tn: number, N: number): "primer" | "sekunder" {
  return isPrimaryPattern(tn, N) ? "primer" : "sekunder";
}

/**
 * General estimated bright pattern position used in Student Table 11.1 - 11.3:
 * y(Tn, N) = (Tn / (N - 1)) · (lambda · L / d) in meters,
 * for Tn = 0, 1, 2, 3, 4.
 *
 * For N = 1 (single slit), returns 0 for Tn = 0, or (Tn + 0.5) * lambda * L / a.
 */
export function estimatedPatternPosition(
  tn: number,
  N: number,
  lambda = DEFAULT_LASER_WAVELENGTH,
  L = DEFAULT_SCREEN_DISTANCE_L,
  d = SSG_SLIT_PRESETS.slit2.d,
  a = SSG_SLIT_PRESETS.slit2.a
): number {
  if (tn < 0 || lambda <= 0 || L <= 0) return 0;
  if (tn === 0) return 0;

  if (N <= 1) {
    if (a <= 0) return 0;
    return ((tn + 0.5) * lambda * L) / a;
  }

  if (d <= 0) return 0;
  return (tn / (N - 1)) * ((lambda * L) / d);
}

/**
 * Relative Uncertainty Percentage (Ketidakpastian Relatif / KSR%):
 * KSR% = |y_teori - y_praktikum| / y_teori * 100%.
 *
 * Returns `null` if y_teori === 0 (or |y_teori| < 1e-9), such as at Tn = 0 (central maximum).
 * This ensures the UI displays "-" and avoids invalid division by zero or unwarranted badges.
 */
export function relativeUncertaintyPercent(
  yTeori: number,
  yPraktikum: number
): number | null {
  if (!Number.isFinite(yTeori) || !Number.isFinite(yPraktikum)) return null;
  if (Math.abs(yTeori) < 1e-9) {
    return null; // Division by zero undefined; no KSR evaluation for Tn = 0
  }
  return (Math.abs(yTeori - yPraktikum) / Math.abs(yTeori)) * 100;
}

// ─── Exact Fraunhofer Physical Wave Optics (Render & Numerical Finder) ───────

/**
 * Calculates normalized Fraunhofer diffraction & interference intensity I(y) / I_0 in [0, 1].
 *
 * Formula:
 * I(y) = sinc^2(beta) · [sin(N · alpha) / (N · sin(alpha))]^2
 * where:
 *   alpha = pi · d · y / (lambda · L)   (Interference phase factor)
 *   beta  = pi · a · y / (lambda · L)   (Single-slit diffraction phase factor)
 *
 * Numerically stable for y -> 0, beta -> 0, and alpha -> k * pi.
 */
export function fraunhoferIntensity(
  y: number,
  lambda = DEFAULT_LASER_WAVELENGTH,
  L = DEFAULT_SCREEN_DISTANCE_L,
  a = SSG_SLIT_PRESETS.slit2.a,
  d = SSG_SLIT_PRESETS.slit2.d,
  N = 2
): number {
  if (lambda <= 0 || L <= 0 || a <= 0 || N < 1) return 0;

  const k_factor = (Math.PI * y) / (lambda * L);
  const beta = a * k_factor;
  const alpha = d * k_factor;

  // 1. Single-slit diffraction factor: sinc^2(beta)
  let diffFactor: number;
  const absBeta = Math.abs(beta);
  if (absBeta < 1e-7) {
    // Taylor expansion: sinc(x) = 1 - x^2/6
    const sinc = 1 - (beta * beta) / 6;
    diffFactor = sinc * sinc;
  } else {
    const sinc = Math.sin(beta) / beta;
    diffFactor = sinc * sinc;
  }

  // 2. Multi-slit interference factor: [sin(N * alpha) / (N * sin(alpha))]^2
  let intFactor: number;
  if (N <= 1) {
    intFactor = 1;
  } else {
    const sinAlpha = Math.sin(alpha);
    if (Math.abs(sinAlpha) < 1e-7) {
      // Principal maximum limit: lim_{alpha -> k*pi} sin(N*alpha) / sin(alpha) = N * (-1)^(k*(N-1))
      intFactor = 1.0;
    } else {
      const ratio = Math.sin(N * alpha) / (N * sinAlpha);
      intFactor = ratio * ratio;
    }
  }

  const result = diffFactor * intFactor;
  // Numerical clamp to [0, 1]
  return Math.max(0, Math.min(1, result));
}

/**
 * Returns exact positive Fraunhofer minima positions (in meters) for multi-slit interference:
 * y_k = k · lambda · L / (N · d), for integer k >= 1 where k mod N != 0.
 *
 * When k mod N === 0, sin(alpha) = 0 and it corresponds to a primary maximum, NOT a minimum.
 */
export function fraunhoferMinimaPositions(
  count: number,
  lambda = DEFAULT_LASER_WAVELENGTH,
  L = DEFAULT_SCREEN_DISTANCE_L,
  d = SSG_SLIT_PRESETS.slit2.d,
  N = 2
): number[] {
  if (count <= 0 || lambda <= 0 || L <= 0 || d <= 0 || N < 1) return [];

  const minima: number[] = [];
  let k = 1;
  while (minima.length < count) {
    if (N === 1) {
      // Single slit minima occur at k * lambda * L / a
      break;
    }
    if (k % N !== 0) {
      minima.push((k * lambda * L) / (N * d));
    }
    k++;
  }
  return minima;
}

/**
 * Helper: Finds the m-th positive integer k that is NOT a multiple of N (m >= 1).
 */
export function getKthNonMultipleOfN(m: number, N: number): number {
  if (m <= 0 || N <= 1) return m;
  let count = 0;
  let k = 0;
  while (count < m) {
    k++;
    if (k % N !== 0) {
      count++;
    }
  }
  return k;
}

/**
 * Golden Section Search to find the local maximum of fn(y) within interval [a, b].
 *
 * Uses strict x-axis bracket tolerance tol = 1e-12 (xatol) and up to 100 iterations,
 * ensuring high precision (< 0.1 um) even on broad / gently-curved secondary peaks.
 */
export function goldenSectionMax(
  fn: (y: number) => number,
  a: number,
  b: number,
  tol = 1e-12,
  maxIter = 100
): number {
  const phi = (1 + Math.sqrt(5)) / 2;
  const resphi = 2 - phi;

  let x1 = a + resphi * (b - a);
  let x2 = b - resphi * (b - a);
  let f1 = fn(x1);
  let f2 = fn(x2);

  for (let i = 0; i < maxIter && Math.abs(b - a) > tol; i++) {
    if (f1 < f2) {
      a = x1;
      x1 = x2;
      f1 = f2;
      x2 = b - resphi * (b - a);
      f2 = fn(x2);
    } else {
      b = x2;
      x2 = x1;
      f2 = f1;
      x1 = a + resphi * (b - a);
      f1 = fn(x1);
    }
  }

  return (a + b) / 2;
}

/**
 * Finds the exact continuous position (in meters) of peak index Tn using Fraunhofer physics.
 *
 * Peak Tn is bounded between consecutive Fraunhofer minima:
 * - Tn = 0: 0.0 (central principal maximum)
 * - Tn >= 1: local maximum inside the interval between minimum Tn and minimum Tn + 1.
 */
export function findFraunhoferPeakContinuous(
  tn: number,
  N: number,
  lambda = DEFAULT_LASER_WAVELENGTH,
  L = DEFAULT_SCREEN_DISTANCE_L,
  a = SSG_SLIT_PRESETS.slit2.a,
  d = SSG_SLIT_PRESETS.slit2.d
): number {
  if (tn <= 0 || lambda <= 0 || L <= 0 || a <= 0 || N < 1) return 0;

  if (N === 1) {
    // Single slit diffraction peaks
    const yLow = (tn * lambda * L) / a;
    const yHigh = ((tn + 1) * lambda * L) / a;
    const intensityFn = (y: number) => fraunhoferIntensity(y, lambda, L, a, d, 1);
    return goldenSectionMax(intensityFn, yLow, yHigh);
  }

  // Multi-slit N >= 2:
  // Lower bound is minimum Tn; upper bound is minimum Tn + 1.
  const kLow = getKthNonMultipleOfN(tn, N);
  const kHigh = getKthNonMultipleOfN(tn + 1, N);

  const yLow = (kLow * lambda * L) / (N * d);
  const yHigh = (kHigh * lambda * L) / (N * d);

  const intensityFn = (y: number) => fraunhoferIntensity(y, lambda, L, a, d, N);
  return goldenSectionMax(intensityFn, yLow, yHigh);
}

/**
 * Quantizes a numeric value in mm to a specific reading resolution (e.g. 0.5 mm or 0.1 mm).
 */
export function quantizeToResolution(valMm: number, resolutionMm: number): number {
  if (resolutionMm <= 0 || !Number.isFinite(valMm)) return valMm;
  const factor = 1 / resolutionMm;
  return Math.round(valMm * factor) / factor;
}

/**
 * Numerical peak finder for peak Tn, quantized to the specified reading resolution (in mm).
 *
 * This function powers the "Bantu Lengkapi" feature for y_praktikum, ensuring that
 * simulated experimental measurements faithfully reflect true physical Fraunhofer peaks
 * as observed on the virtual millimeter block ruler, rather than the simplified module formula.
 */
export function findFraunhoferPeakNumerical(
  tn: number,
  N: number,
  lambda = DEFAULT_LASER_WAVELENGTH,
  L = DEFAULT_SCREEN_DISTANCE_L,
  a = SSG_SLIT_PRESETS.slit2.a,
  d = SSG_SLIT_PRESETS.slit2.d,
  resolutionMm = READING_RESOLUTION_MM
): number {
  if (tn <= 0) return 0;
  const yContinuousMeters = findFraunhoferPeakContinuous(tn, N, lambda, L, a, d);
  const yContinuousMm = yContinuousMeters * 1000;
  return quantizeToResolution(yContinuousMm, resolutionMm);
}

// ─── Visual Rendering Helpers (Wavelength Mapping & Adaptive Screen Span) ────

/**
 * Maps optical wavelength in nanometers (400 - 700 nm) to an RGB color string "r, g, b".
 *
 * NOTE: This is a simplified perceptual color approximation for educational UI visualization,
 * mapping visible spectrum bands (violet, cyan, green, yellow, orange, red).
 */
export function wavelengthToRgb(lambdaNm: number): string {
  if (lambdaNm < 480) return "139, 92, 246"; // Violet / Blue (e.g. 405 nm)
  if (lambdaNm < 510) return "6, 182, 212";  // Cyan (e.g. 488 nm)
  if (lambdaNm < 560) return "34, 197, 94";  // Green (e.g. 532 nm)
  if (lambdaNm < 590) return "234, 179, 8";  // Yellow (e.g. 589 nm)
  if (lambdaNm < 620) return "249, 115, 22"; // Orange (e.g. 605 nm)
  return "239, 68, 68";                      // Red (e.g. 632.8 nm He-Ne)
}

/**
 * Maps optical wavelength in nanometers to a Hex color string "#rrggbb".
 */
export function wavelengthToHex(lambdaNm: number): string {
  if (lambdaNm < 480) return "#8b5cf6";
  if (lambdaNm < 510) return "#06b6d4";
  if (lambdaNm < 560) return "#22c55e";
  if (lambdaNm < 590) return "#eab308";
  if (lambdaNm < 620) return "#f97316";
  return "#ef4444";
}

/**
 * Calculates optimal projection screen horizontal span (+/- spanMm)
 * so that multiple interference / diffraction orders remain clearly visible
 * across wide parameter variations (lambda 400-700nm, L 0.5-3.0m, a 0.02-0.2mm, d 0.1-1.0mm).
 *
 * Scaling Rules:
 * - For N = 1 (single-slit): scaled by diffraction width y_diff = lambda * L / a
 * - For N >= 2 (multi-slit): scaled by primary interference order y_interf = lambda * L / d
 * - Clamped within safe visual range [6.0 mm, 30.0 mm] to preserve digital millimeter paper readability.
 */
export function calculateAdaptiveScreenSpanMm(
  lambda: number,
  L: number,
  a: number,
  d: number,
  N: number
): number {
  if (N <= 1) {
    const yDark1Mm = ((lambda * L) / Math.max(1e-6, a)) * 1000;
    const target = yDark1Mm * 2.5;
    return Math.max(6.0, Math.min(30.0, Math.round(target)));
  }
  const yPrim1Mm = ((lambda * L) / Math.max(1e-6, d)) * 1000;
  const target = yPrim1Mm * 3.5;
  return Math.max(6.0, Math.min(30.0, Math.round(target)));
}

/**
 * Maps screen distance L (meters) to rail measurement reading in cm.
 * Slit disk carrier is fixed at 0 cm mark.
 */
export function screenDistanceToRailCm(L: number): number {
  return Math.round(L * 100 * 100) / 100;
}

/**
 * Exact geometric optical path difference between adjacent slits:
 * Δ = d * sin(θ) where θ = atan(y / L)
 * (Tidak menggunakan aproksimasi sudut kecil d*y/L).
 */
export function pathDifference(y: number, d: number, L: number): number {
  if (L <= 0) return 0;
  const theta = Math.atan(y / L);
  return d * Math.sin(theta);
}

/**
 * Path difference expressed in units of optical wavelength λ:
 * Δ / λ = (d * sin(atan(y / L))) / λ
 */
export function pathDifferenceInWavelengths(
  y: number,
  d: number,
  L: number,
  lambda: number
): number {
  if (lambda <= 0) return 0;
  return pathDifference(y, d, L) / lambda;
}

export interface InterferenceClassification {
  type: "terang_primer" | "gelap" | "antara" | "disabled";
  label: string;
  order: number | null;
  description: string;
}

/**
 * Classifies optical interference state at a given path difference ratio Δ / λ for N slits.
 * - Near integer (|Δ/λ - round| <= tolerance): Terang Primer (m = 0, ±1, ±2...)
 * - Near half-integer (|Δ/λ - (m+0.5)| <= tolerance): Gelap (hanya untuk N = 2)
 * - Otherwise: Antara (untuk N >= 3, terdapat N-2 terang sekunder dan N-1 minimum di antaranya)
 * - For N = 1: Disabled (celah tunggal)
 */
export function classifyInterference(
  deltaOverLambda: number,
  N: number,
  tolerance = 0.05
): InterferenceClassification {
  if (N <= 1) {
    return {
      type: "disabled",
      label: "Tidak Aktif",
      order: null,
      description: "Fitur Titik P interferensi celah majemuk dinonaktifkan untuk celah tunggal (N = 1).",
    };
  }

  const absVal = Math.abs(deltaOverLambda);
  const nearestInt = Math.round(absVal);
  const distToInt = Math.abs(absVal - nearestInt);

  if (distToInt <= tolerance) {
    const orderSign = deltaOverLambda >= 0 ? nearestInt : -nearestInt;
    return {
      type: "terang_primer",
      label: `Terang Primer (m = ${orderSign})`,
      order: orderSign,
      description: `Beda lintasan Δ = ${nearestInt}λ memenuhi syarat interferensi konstruktif maksimum primer.`,
    };
  }

  const nearestHalf = Math.round(absVal - 0.5) + 0.5;
  const distToHalf = Math.abs(absVal - nearestHalf);

  if (N === 2 && distToHalf <= tolerance) {
    return {
      type: "gelap",
      label: "Gelap (Destruktif)",
      order: null,
      description: "Beda lintasan Δ = (m + ½)λ menghasilkan destruktif total sempurna untuk N = 2.",
    };
  }

  return {
    type: "antara",
    label: "Antara",
    order: null,
    description:
      N >= 3
        ? `Di antara terang primer. Untuk N = ${N}, terdapat ${N - 2} terang sekunder dan ${N - 1} minimum.`
        : "Di antara terang primer dan gelap.",
  };
}

/**
 * Calculates the y position (in mm) of the adjacent primary interference peak
 * (order m = ... -2, -1, 0, 1, 2 ...) in direction 'next' or 'prev'.
 */
export function getAdjacentPrimaryPeakYMm(
  currentYMm: number,
  direction: "prev" | "next",
  lambda: number,
  L: number,
  d: number,
  spanMm = 30
): number {
  if (d <= 0 || L <= 0 || lambda <= 0) return 0;
  const yPrimMm = ((lambda * L) / d) * 1000;
  if (yPrimMm <= 0) return 0;

  const currentM = currentYMm / yPrimMm;
  const roundedM = Math.round(currentM);
  let targetM: number;

  if (Math.abs(currentM - roundedM) < 0.15) {
    targetM = direction === "next" ? roundedM + 1 : roundedM - 1;
  } else if (direction === "next") {
    targetM = Math.ceil(currentM);
  } else {
    targetM = Math.floor(currentM);
  }

  const targetYMm = targetM * yPrimMm;
  const clampedMm = Math.max(-spanMm, Math.min(spanMm, targetYMm));
  return Math.round(clampedMm * 10) / 10;
}

