import { calculateLinearRegression, LinearRegressionResult } from './regression';

export interface AtwoodConfig {
  m1: number; // mass 1 (grams or kg, keep consistent)
  m2: number; // mass 2 (grams or kg)
  m3: number; // additional mass 1 (grams or kg)
  m4: number; // additional mass 2 (grams or kg)
  g?: number; // local gravity (default 9.8)
}

export interface AtwoodDataRow {
  s: number; // Jarak AB (meters)
  t: number; // Waktu (seconds)
}

export interface AtwoodRegressionResult {
  a: number;
  deltaA: number;
  tk: number;
  
  // Komponen regresi untuk Tabel 2.2 / Tabel 2.3
  sumX: number;
  sumY: number;
  sumX2: number;
  sumY2: number;
  sumXY: number;
  
  // Raw points generated for regression table display
  points: { x: number; y: number }[];
}

/**
 * Menghitung percepatan teoretis (ground truth) untuk 1 beban tambahan (m3).
 * Rumus: a = (m_tambahan * g) / (m1 + m2 + m_tambahan)
 */
export function calculateTrueAcceleration1(config: AtwoodConfig): number {
  const g = config.g ?? 9.8;
  const mTambahan = config.m3;
  return (mTambahan * g) / (config.m1 + config.m2 + mTambahan);
}

/**
 * Menghitung percepatan teoretis (ground truth) untuk 2 beban tambahan (m3 + m4).
 * Rumus: a = (m_tambahan * g) / (m1 + m2 + m_tambahan)
 */
export function calculateTrueAcceleration2(config: AtwoodConfig): number {
  const g = config.g ?? 9.8;
  const mTambahan = config.m3 + config.m4;
  return (mTambahan * g) / (config.m1 + config.m2 + mTambahan);
}

/**
 * Menghitung waktu jatuh dari A ke B secara teoritis dengan tambahan noise waktu reaksi.
 * t = sqrt(2s / a)
 * @param s Jarak AB dalam meter
 * @param a Percepatan dalam m/s^2
 * @param noise Jeda/noise tambahan (misalnya waktu reaksi manual stopwatch), default ~ 0.05 - 0.1
 */
export function calculateFallTime(s: number, a: number, includeNoise: boolean = true): number {
  const t_ideal = Math.sqrt((2 * s) / a);
  if (!includeNoise) return t_ideal;
  
  // Noise berbasis persentase kecil (±0.3% dari t_ideal) sesuai instruksi
  const noiseFactor = 1 + (Math.random() * 0.006 - 0.003); 
  return t_ideal * noiseFactor;
}

/**
 * Melakukan regresi linier untuk data GLBB Pesawat Atwood.
 * Model: s = (1/2) * a * t^2
 * Dilinierkan menjadi:
 * y = s
 * x = (1/2) * t^2
 * b = a  (sehingga percepatan a = b secara langsung)
 */
export function calculateAtwoodRegression(data: AtwoodDataRow[]): AtwoodRegressionResult {
  const points = data.map(row => {
    return {
      x: 0.5 * row.t * row.t, // x = (1/2)t^2
      y: row.s                // y = s
    };
  });
  
  const regResult = calculateLinearRegression(points);
  
  return {
    a: regResult.b,             // a = b langsung (tanpa dikali 2)
    deltaA: regResult.deltaB,   // Delta a = Delta b
    tk: regResult.tk,
    
    sumX: regResult.sumX,
    sumY: regResult.sumY,
    sumX2: regResult.sumX2,
    sumY2: regResult.sumY2,
    sumXY: regResult.sumXY,
    
    points
  };
}

export function getAtwoodExploreState(
  t: number, 
  m1: number, 
  m2: number, 
  mAdd: number, 
  s_B: number, // Jarak pelepasan massa tambahan
  g: number
) {
  // Percepatan Fase 1 (sebelum B)
  // m2 bergerak ke bawah jika m2 + mAdd > m1
  const mTotal1 = m1 + m2 + mAdd;
  const a1 = mTotal1 > 0 ? ((m2 + mAdd - m1) * g) / mTotal1 : 0;
  
  if (a1 <= 0) {
    // Tidak bergerak atau bergerak ke atas (tidak ditangani alat ini)
    return { s: 0, v: 0, a: 0, phase: "DIAM" };
  }

  const t_B = Math.sqrt((2 * s_B) / a1);
  
  if (t <= t_B) {
    return {
      s: 0.5 * a1 * t * t,
      v: a1 * t,
      a: a1,
      phase: "GLBB",
      t_transition: t_B
    };
  } else {
    // Fase 2 (setelah B)
    const v_B = a1 * t_B;
    const mTotal2 = m1 + m2;
    // Percepatan Fase 2 (setelah massa tambahan dilepas)
    const a2 = mTotal2 > 0 ? ((m2 - m1) * g) / mTotal2 : 0;
    
    const t2 = t - t_B;
    return {
      s: s_B + v_B * t2 + 0.5 * a2 * t2 * t2,
      v: v_B + a2 * t2,
      a: a2,
      phase: a2 === 0 ? "GLB" : "GLBB",
      t_transition: t_B
    };
  }
}

// -------------------------------------------------------------
// FASE GLB (MODUL 2.2) - GERAK LURUS BERATURAN (B ke C)
// -------------------------------------------------------------

export interface AtwoodGLBDataRow {
  s: number; // Jarak BC (meters)
  t: number; // Waktu BC (seconds)
}

export interface AtwoodGLBRegressionResult {
  v: number;
  deltaV: number;
  tk: number;
  
  sumX: number;
  sumY: number;
  sumX2: number;
  sumY2: number;
  sumXY: number;
  
  points: { x: number; y: number }[];
}

/**
 * Menghitung waktu tempuh GLB dari B ke C secara teoritis dengan tambahan noise waktu reaksi.
 * t = s / v
 * @param s Jarak BC dalam meter
 * @param v Kecepatan konstan dalam m/s
 * @param includeNoise Default true (tambah noise manual stopwatch)
 */
export function calculateGLBTime(s: number, v: number, includeNoise: boolean = true): number {
  const t_ideal = s / v;
  if (!includeNoise) return t_ideal;
  
  // Noise berbasis persentase kecil (±0.3% dari t_ideal) sesuai instruksi
  const noiseFactor = 1 + (Math.random() * 0.006 - 0.003); 
  return t_ideal * noiseFactor;
}

/**
 * Melakukan regresi linier untuk data GLB Pesawat Atwood.
 * Model: s = v * t
 * Dilinierkan menjadi:
 * y = s
 * x = t
 * b = v  (sehingga kecepatan v = b secara langsung)
 */
export function calculateAtwoodGLBRegression(data: AtwoodGLBDataRow[]): AtwoodGLBRegressionResult {
  const points = data.map(row => {
    return {
      x: row.t, // x = t
      y: row.s  // y = s
    };
  });
  
  const regResult = calculateLinearRegression(points);
  
  return {
    v: regResult.b,             // v = b langsung
    deltaV: regResult.deltaB,   // Delta v = Delta b
    tk: regResult.tk,
    
    sumX: regResult.sumX,
    sumY: regResult.sumY,
    sumX2: regResult.sumX2,
    sumY2: regResult.sumY2,
    sumXY: regResult.sumXY,
    
    points
  };
}

// -------------------------------------------------------------
// FASE VECTOR OVERLAY - GAYA & PERCEPATAN PESAWAT ATWOOD (KATROL IDEAL)
// -------------------------------------------------------------

export interface AtwoodVectors {
  w1: number; // N (Gaya berat m1, arah ke bawah)
  w2: number; // N (Gaya berat m2, arah ke bawah)
  wAdd: number; // N (Gaya berat keping tambahan mAdd bila ada, arah ke bawah)
  wRightTotal: number; // N (Total berat di sisi kanan)
  T: number; // N (Gaya tegangan tali katrol ideal, sama di kedua sisi)
  a: number; // m/s² (Besar percepatan translasi sistem)
  a1: number; // m/s² (Percepatan m1: positif = ke atas, negatif = ke bawah)
  a2: number; // m/s² (Percepatan m2: positif = ke bawah, negatif = ke atas)
  netForceLeft: number; // N (T - w1)
  netForceRight: number; // N (wRightTotal - T)
}

/**
 * Pure function that computes force and acceleration vectors for Atwood apparatus.
 * Assumes ideal massless pulley and light inextensible string (T1 = T2 = T).
 */
export function getAtwoodVectors(params: {
  m1: number; // kg
  m2: number; // kg
  mAdd?: number; // kg (default 0)
  g?: number; // m/s² (default 9.8)
  phase?: "GLBB" | "GLB" | "DIAM";
}): AtwoodVectors {
  const g = params.g ?? 9.8;
  const m1 = Math.max(0, params.m1);
  const m2 = Math.max(0, params.m2);
  const mAdd = params.phase === "GLB" ? 0 : Math.max(0, params.mAdd ?? 0);
  const mRight = m2 + mAdd;
  const mTotal = m1 + mRight;

  const w1 = m1 * g;
  const w2 = m2 * g;
  const wAdd = mAdd * g;
  const wRightTotal = mRight * g;

  if (mTotal <= 0) {
    return {
      w1: 0,
      w2: 0,
      wAdd: 0,
      wRightTotal: 0,
      T: 0,
      a: 0,
      a1: 0,
      a2: 0,
      netForceLeft: 0,
      netForceRight: 0,
    };
  }

  // Jika fase GLB (keping telah lepas di Ring B) dan m1 == m2: percepatan nol
  if (params.phase === "GLB" || Math.abs(mRight - m1) < 1e-9) {
    const T = (m1 * mRight * 2 * g) / (m1 + mRight);
    return {
      w1,
      w2,
      wAdd: 0,
      wRightTotal: w2,
      T,
      a: 0,
      a1: 0,
      a2: 0,
      netForceLeft: 0,
      netForceRight: 0,
    };
  }

  // Percepatan sistem ideal: a = (mRight - m1) * g / (m1 + mRight)
  const aRaw = ((mRight - m1) * g) / mTotal;
  const aMag = Math.abs(aRaw);

  // Tegangan tali katrol ideal: T = (2 * m1 * mRight * g) / (m1 + mRight)
  const T = (2 * m1 * mRight * g) / mTotal;

  // Percepatan per sisi (tanda arah):
  // a1: gerak massa kiri (positif ke atas)
  // a2: gerak massa kanan (positif ke bawah)
  const a1 = aRaw;
  const a2 = aRaw;

  return {
    w1,
    w2,
    wAdd,
    wRightTotal,
    T,
    a: aMag,
    a1,
    a2,
    netForceLeft: T - w1,
    netForceRight: wRightTotal - T,
  };
}
