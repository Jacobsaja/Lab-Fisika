import { calculateLinearRegression, RegressionPoint } from "./regression";

export interface FallTimeResult {
  t: number;
  t_squared: number;
}

export interface FreefallRegressionData {
  x: number; // t^2 (rata-rata)
  y: number; // h
}

export interface RegressionResult {
  sumX: number;
  sumY: number;
  sumX2: number;
  sumY2: number;
  sumXY: number;
  b: number;
  deltaY2: number;
  deltaY: number;
  deltaB: number;
  g: number;
  deltaG: number;
  tk: number;
}

/**
 * Menghitung waktu jatuh bebas (t) untuk ketinggian (h).
 * Menggunakan rumus: h = 1/2 * g * t^2 => t = sqrt(2h / g)
 * Fungsi ini dipanggil setiap kali tombol dilepas (setiap trial), 
 * sehingga Math.random() akan menghasilkan noise yang berbeda pada setiap jatuhan.
 * @param h Ketinggian dalam meter
 * @param g Percepatan gravitasi lokal (default 9.81 m/s^2)
 * @param addNoise Jika true, tambahkan noise acak sekitar ±0.2% untuk mensimulasikan 
 * variasi kecil waktu reaksi rangkaian elektromagnet/relay saat melepas arus.
 */
export function calculateFallTime(h: number, g: number = 9.81, addNoise: boolean = true): FallTimeResult {
  if (h <= 0) return { t: 0, t_squared: 0 };
  
  // Waktu teoritis murni
  let t = Math.sqrt((2 * h) / g);
  
  if (addNoise) {
    // Noise antara -0.002 hingga +0.002 (-0.2% hingga +0.2%)
    const noise = 1 + (Math.random() * 0.004 - 0.002);
    t = t * noise;
  }
  
  return {
    t: t,
    t_squared: t * t
  };
}

/**
 * Menghitung nilai rata-rata dari t^2 untuk 5 trial pada ketinggian yang sama.
 * Nilai ini yang akan dimasukkan sebagai nilai 'x' pada regresi linier (x_i).
 * @param tSquaredArray Array berisi 5 nilai t^2 dari trial 1 hingga 5
 */
export function calculateAverageTSquared(tSquaredArray: number[]): number {
  if (tSquaredArray.length === 0) return 0;
  const sum = tSquaredArray.reduce((acc, val) => acc + val, 0);
  return sum / tSquaredArray.length;
}


/**
 * Melakukan regresi linier berdasarkan rumus praktikum:
 * y = bx (dengan y = h, x = rata-rata t^2 dari 5 trial)
 * b = (N*Σ(xy) - Σx*Σy) / (N*Σx^2 - (Σx)^2)
 * 
 * g = 2b
 */
export function calculateFreefallRegression(data: FreefallRegressionData[]): RegressionResult {
  const base = calculateLinearRegression(data);
  const g = 2 * base.b;
  const deltaG = 2 * base.deltaB;
  const tk = (1 - deltaG / g) * 100;

  return {
    ...base,
    g,
    deltaG,
    tk,
  };
}

export function getVelocity(t: number, g: number, v0: number = 0): number {
  return v0 + g * t;
}

export function getDisplacement(t: number, g: number, v0: number = 0): number {
  return v0 * t + 0.5 * g * t * t;
}

export interface FreeFallVectorState {
  /** Waktu jatuh yang telah berjalan (detik) */
  t: number;
  /** Percepatan gravitasi lokal (m/s²) */
  g: number;
  /** Massa bola baja (kg), default 0.05 kg (50 g) */
  mass?: number;
  /** Apakah benda sedang dalam status jatuh bebas */
  isFalling?: boolean;
}

export interface FreeFallVectors {
  /** Gaya berat w = m * g (N), konstan mengarah ke bawah */
  w: number;
  /** Kecepatan sesaat v = g * t (m/s), mengarah ke bawah (0 pada t = 0) */
  v: number;
  /** Percepatan gravitasi a = g (m/s²), konstan mengarah ke bawah */
  a: number;
  /** Pengali arah koordinat vertikal (+1 ke bawah) */
  directionY: number;
}

/**
 * Fungsi murni untuk menghitung vektor fisika gerak jatuh bebas (GJB).
 * Model vakum murni tanpa hambatan udara:
 * - Percepatan a = g (konstan)
 * - Kecepatan v = g * t (nol saat t = 0)
 * - Gaya berat w = m * g (konstan)
 * - Semua vektor mengarah vertikal ke bawah (+y pada canvas SVG)
 */
export function getFreeFallVectors(state: FreeFallVectorState): FreeFallVectors {
  const g = state.g > 0 ? state.g : 9.81;
  const mass = state.mass && state.mass > 0 ? state.mass : 0.05;
  const t = Math.max(0, state.t);

  const w = mass * g;
  const v = g * t;
  const a = g;

  return {
    w,
    v,
    a,
    directionY: 1, // Menunjuk ke bawah (arah sumbu +y SVG)
  };
}
