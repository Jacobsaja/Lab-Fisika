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
