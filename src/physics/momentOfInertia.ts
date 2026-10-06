/**
 * Physics Engine for Momen Inersia I
 * (Konstanta Pegas Spiral & Momen Inersia Diri Alat)
 * 
 * Dasar Teori:
 * 1. Bagian A: Konstanta Pegas Spiral (κ)
 *    τ = κ · θ (torka sebanding dengan simpangan sudut)
 *    τ = F · R = (M · g) · R
 *    Dengan R = jari-jari drum/katrol alat momen inersia (konstanta alat).
 * 
 * 2. Regresi Linier:
 *    y = τ, x = θ̅ (rata-rata simpangan dalam radian)
 *    b = κ, Δb = Δκ
 *    b = [N·Σ(xᵢyᵢ) − Σxᵢ·Σyᵢ] / [N·Σxᵢ² − (Σxᵢ)²]
 *    Pelaporan: {κ ± Δκ}, TK = (1 − Δb/b) × 100%
 * 
 * 3. Bagian B: Momen Inersia Diri Alat (I₀)
 *    T₀ = 2π√(I₀/κ)  =>  I₀ = κ · T₀² / (4π²)
 *    T₀ = rata-rata(t₁...t₅) / 5 (periode osilasi bebas 1 getaran)
 */

import { calculateLinearRegression } from "./regression";
import {
  MOMENT_OF_INERTIA_PART1_STORAGE_KEY,
  MomentOfInertiaPart1Result,
  Table82Row,
  Table84RegressionRow,
  SpiralSpringRegressionResult,
} from "@/types/momentOfInertia";

// ── Konstanta Fisika & Alat ──────────────────────────────────────────
export const DEFAULT_DRUM_RADIUS = 0.025; // 25 mm = 0.025 m (jari-jari drum katrol)
export const DEFAULT_GRAVITY = 9.81;      // m/s^2 (percepatan gravitasi)

// Rentang ground truth realistis alat laboratorium
// Dipersempit ke 0.03 - 0.05 Nm/rad agar simpangan maksimum beban 0.25 kg tetap < 120°
export const GROUND_TRUTH_KAPPA_MIN = 0.03; // Nm/rad
export const GROUND_TRUTH_KAPPA_MAX = 0.05; // Nm/rad
export const GROUND_TRUTH_I0_MIN = 0.002;   // kg·m²
export const GROUND_TRUTH_I0_MAX = 0.005;   // kg·m²

export interface MomentOfInertiaGroundTruth {
  kappaTrue: number;
  i0True: number;
}

/**
 * Menghasilkan ground truth konstanta pegas spiral (kappa) dan momen inersia alat (I0) 
 * secara acak satu kali di awal sesi praktikum.
 */
export function generateMomentOfInertiaGroundTruth(): MomentOfInertiaGroundTruth {
  const kappaTrue = GROUND_TRUTH_KAPPA_MIN + Math.random() * (GROUND_TRUTH_KAPPA_MAX - GROUND_TRUTH_KAPPA_MIN);
  const i0True = GROUND_TRUTH_I0_MIN + Math.random() * (GROUND_TRUTH_I0_MAX - GROUND_TRUTH_I0_MIN);
  return { kappaTrue, i0True };
}

// ── Konversi Satuan & Kalkulasi Gaya/Torka ───────────────────────────

/**
 * Konversi sudut dari derajat ke radian:
 * 1° = π / 180 rad
 */
export function degToRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Konversi sudut dari radian ke derajat:
 * 1 rad = 180 / π derajat
 */
export function radToDeg(rad: number): number {
  return rad * (180 / Math.PI);
}

/**
 * Menghitung gaya berat beban: F = M * g
 * @param massKg Massa beban dalam kilogram (kg)
 * @param g Percepatan gravitasi (m/s²), default 9.81 m/s²
 */
export function calculateForce(massKg: number, g: number = DEFAULT_GRAVITY): number {
  if (massKg <= 0) return 0;
  return massKg * g;
}

/**
 * Menghitung momen gaya (torka): τ = F * R
 * @param forceN Gaya dalam Newton (N)
 * @param radiusM Jari-jari drum dalam meter (m), default 0.025 m
 */
export function calculateTorque(forceN: number, radiusM: number = DEFAULT_DRUM_RADIUS): number {
  if (forceN <= 0 || radiusM <= 0) return 0;
  return forceN * radiusM;
}

/**
 * Menghitung torka langsung dari massa: τ = (M * g) * R
 * @param massKg Massa beban dalam kg
 * @param radiusM Jari-jari drum dalam meter, default DEFAULT_DRUM_RADIUS
 * @param g Gravitasi lokal, default DEFAULT_GRAVITY
 */
export function calculateTorqueFromMass(
  massKg: number,
  radiusM: number = DEFAULT_DRUM_RADIUS,
  g: number = DEFAULT_GRAVITY
): number {
  const f = calculateForce(massKg, g);
  return calculateTorque(f, radiusM);
}

// ── Simpangan Sudut & Pembacaan Skala (Protractor) ───────────────────

/**
 * Menghitung simpangan sudut teoritis dalam radian:
 * τ = κ · θ  =>  θ = τ / κ
 * @param torqueNm Momen gaya (Nm)
 * @param kappa Konstanta pegas spiral (Nm/rad)
 */
export function calculateDeflectionAngleRad(torqueNm: number, kappa: number): number {
  if (kappa <= 0 || torqueNm <= 0) return 0;
  return torqueNm / kappa;
}

/**
 * Menghitung simpangan sudut teoritis dalam derajat (°).
 */
export function calculateDeflectionAngleDeg(torqueNm: number, kappa: number): number {
  const rad = calculateDeflectionAngleRad(torqueNm, kappa);
  return radToDeg(rad);
}

/**
 * Mensimulasikan pembacaan jarum pada skala busur derajat oleh user.
 * Dapat menambahkan variasi acak kecil (noise pembacaan / paralaks) jika addNoise = true.
 * @param massKg Massa beban tergantung dalam kg
 * @param kappa Konstanta pegas spiral ground truth (Nm/rad)
 * @param radiusM Jari-jari drum (m)
 * @param g Gravitasi lokal (m/s²)
 * @param addNoise Menambahkan variasi acak ±0.15° untuk simulasi pengulangan
 */
export function simulateDeflectionAngle(
  massKg: number,
  kappa: number,
  radiusM: number = DEFAULT_DRUM_RADIUS,
  g: number = DEFAULT_GRAVITY,
  addNoise: boolean = false
): { angleDeg: number; angleRad: number } {
  if (massKg <= 0 || kappa <= 0) {
    return { angleDeg: 0, angleRad: 0 };
  }

  const tau = calculateTorqueFromMass(massKg, radiusM, g);
  let angleDeg = calculateDeflectionAngleDeg(tau, kappa);

  if (addNoise) {
    // Noise pembacaan skala ±0.15 derajat
    const noise = (Math.random() * 0.3) - 0.15;
    angleDeg = Math.max(0, angleDeg + noise);
  }

  return {
    angleDeg,
    angleRad: degToRad(angleDeg),
  };
}

/**
 * Menghitung rata-rata sudut dari 5 pengukuran (dalam derajat)
 * dan mengonversi ke radian (θ̅).
 * @param thetasDeg Array nilai simpangan sudut θ1..θ5 dalam derajat
 */
export function calculateAverageAngle(thetasDeg: number[]): { avgDeg: number; avgRad: number } {
  if (!thetasDeg || thetasDeg.length === 0) {
    return { avgDeg: 0, avgRad: 0 };
  }

  const sum = thetasDeg.reduce((acc, val) => acc + val, 0);
  const avgDeg = sum / thetasDeg.length;
  const avgRad = degToRad(avgDeg);

  return { avgDeg, avgRad };
}

/**
 * Menghasilkan baris data Tabel 8.2 dari M (kg) dan θ̅ (rad)
 */
export function calculateTable82Row(
  massKg: number,
  thetaAvgRad: number,
  radiusM: number = DEFAULT_DRUM_RADIUS,
  g: number = DEFAULT_GRAVITY
): Table82Row {
  const fNewton = calculateForce(massKg, g);
  const tauNm = calculateTorque(fNewton, radiusM);

  return {
    massKg,
    thetaAvgRad,
    fNewton,
    tauNm,
  };
}

// ── Regresi Linier Pegas Spiral (Bagian A) ────────────────────────────

/**
 * Menghitung regresi linier penentuan konstanta pegas spiral (κ):
 * y = τ, x = θ̅, b = κ
 * 
 * Menggunakan modul generic calculateLinearRegression.
 * @param data Array objek berisi { thetaRad: θ̅ (rad), torqueNm: τ (Nm) }
 */
export function calculateSpiralSpringRegression(
  data: { thetaRad: number; torqueNm: number }[]
): SpiralSpringRegressionResult {
  const regressionPoints = data.map((d) => ({
    x: d.thetaRad,
    y: d.torqueNm,
  }));

  const regResult = calculateLinearRegression(regressionPoints);

  const tableRows: Table84RegressionRow[] = regressionPoints.map((p) => ({
    xi: p.x,
    yi: p.y,
    xi2: p.x * p.x,
    yi2: p.y * p.y,
    xiyi: p.x * p.y,
  }));

  return {
    ...regResult,
    kappa: regResult.b,
    deltaKappa: regResult.deltaB,
    tableRows,
  };
}

// ── Bagian B: Percobaan Momen Inersia Diri Alat (I₀) ─────────────────

/**
 * Menghitung periode getaran diri T₀ dari 5 trial waktu untuk 5 getaran (t1..t5).
 * Sesuai modul:
 * t = rata-rata(t1..t5)
 * T₀ = rata-rata(t1..t5) / 5
 * @param timesSec Array waktu t1..t5 (s)
 */
export function calculatePeriodT0(timesSec: number[]): { avgTimeSec: number; t0Sec: number } {
  if (!timesSec || timesSec.length === 0) {
    return { avgTimeSec: 0, t0Sec: 0 };
  }

  const sum = timesSec.reduce((acc, val) => acc + val, 0);
  const avgTimeSec = sum / timesSec.length;
  const t0Sec = avgTimeSec / 5;

  return { avgTimeSec, t0Sec };
}

/**
 * Menghitung momen inersia diri alat (I₀) menggunakan konstanta pegas spiral (κ)
 * dan periode getaran diri (T₀):
 * T₀ = 2π√(I₀/κ)  =>  I₀ = κ · T₀² / (4π²)
 * @param kappa Konstanta pegas spiral (Nm/rad)
 * @param t0 Periode getaran diri alat (s)
 */
export function calculateSelfMomentOfInertia(kappa: number, t0: number): number {
  if (kappa <= 0 || t0 <= 0) return 0;

  const fourPiSquared = 4 * Math.PI * Math.PI;
  return (kappa * t0 * t0) / fourPiSquared;
}

/**
 * Mensimulasikan waktu osilasi untuk N getaran (default 5 getaran):
 * T₀ = 2π√(I₀/κ)
 * t_total = numCycles * T₀
 * @param i0 Momen inersia diri alat (kg·m²)
 * @param kappa Konstanta pegas spiral (Nm/rad)
 * @param numCycles Jumlah getaran (default 5)
 * @param addNoise Jika true, tambahkan sedikit variasi acak (±0.3%)
 */
export function simulateOscillationTime(
  i0: number,
  kappa: number,
  numCycles: number = 5,
  addNoise: boolean = false
): number {
  if (i0 <= 0 || kappa <= 0 || numCycles <= 0) return 0;

  const t0Theoretical = 2 * Math.PI * Math.sqrt(i0 / kappa);
  let totalTime = numCycles * t0Theoretical;

  if (addNoise) {
    // Noise acak ±0.3%
    const noise = 1 + (Math.random() * 0.006 - 0.003);
    totalTime *= noise;
  }

  return totalTime;
}

/**
 * Menghitung state osilator torsional tak teredam (undamped) pada waktu t.
 * @param t Waktu (s)
 * @param initialAngleDeg Sudut simpangan awal (derajat)
 * @param i0 Momen inersia (kg.m^2)
 * @param kappa Konstanta pegas (Nm/rad)
 */
export function getTorsionalState(t: number, initialAngleDeg: number, i0: number, kappa: number) {
  if (i0 <= 0 || kappa <= 0) return { thetaDeg: 0, omegaRad: 0, period: 0 };
  const T = 2 * Math.PI * Math.sqrt(i0 / kappa);
  const omega = (2 * Math.PI) / T; // = sqrt(kappa / i0)
  
  // theta(t) = theta0 * cos(omega * t)
  const thetaDeg = initialAngleDeg * Math.cos(omega * t);
  // d(theta)/dt = -theta0 * omega * sin(omega * t)
  // Konversi theta0 ke radian untuk omegaRad
  const theta0Rad = (initialAngleDeg * Math.PI) / 180;
  const omegaRad = -theta0Rad * omega * Math.sin(omega * t);

  return { thetaDeg, omegaRad, period: T };
}


// ── Persistence: LocalStorage Helpers ────────────────────────────────

/**
 * Menyimpan hasil akhir Praktikum Momen Inersia I ke localStorage
 * sehingga bisa dibaca oleh Praktikum Momen Inersia II.
 */
export function saveMomentOfInertiaResult(result: MomentOfInertiaPart1Result): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }

  try {
    window.localStorage.setItem(
      MOMENT_OF_INERTIA_PART1_STORAGE_KEY,
      JSON.stringify(result)
    );
    return true;
  } catch (err) {
    console.error("Gagal menyimpan hasil Momen Inersia I ke localStorage:", err);
    return false;
  }
}

/**
 * Membaca hasil Praktikum Momen Inersia I dari localStorage.
 */
export function loadMomentOfInertiaResult(): MomentOfInertiaPart1Result | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(MOMENT_OF_INERTIA_PART1_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MomentOfInertiaPart1Result;
  } catch (err) {
    console.error("Gagal membaca hasil Momen Inersia I dari localStorage:", err);
    return null;
  }
}

/**
 * Menghapus data hasil Momen Inersia I di localStorage.
 */
export function clearMomentOfInertiaResult(): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  window.localStorage.removeItem(MOMENT_OF_INERTIA_PART1_STORAGE_KEY);
}
