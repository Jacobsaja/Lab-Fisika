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
  const N = data.length;
  if (N < 3) {
    throw new Error("Dibutuhkan minimal 3 titik data untuk regresi (rekomendasi 5)");
  }

  let sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0, sumXY = 0;
  
  for (const d of data) {
    sumX += d.x;
    sumY += d.y;
    sumX2 += d.x * d.x;
    sumY2 += d.y * d.y;
    sumXY += d.x * d.y;
  }

  const denominator = (N * sumX2 - sumX * sumX);
  
  if (Math.abs(denominator) < 1e-10) {
    throw new Error("Denominator nol: Variasi x (t^2) tidak mencukupi. Pastikan ketinggian bervariasi.");
  }

  const b = (N * sumXY - sumX * sumY) / denominator;

  // Rumus ketidakpastian persis sesuai modul:
  // Δy² = (1/(N−2)) · [Σyᵢ² − (Σxᵢ²·(Σyᵢ)² − 2·Σxᵢ·Σyᵢ·Σ(xᵢyᵢ) + N·Σ(xᵢyᵢ)²) / (N·Σxᵢ² − (Σxᵢ)²)]
  const term2_num = sumX2 * sumY * sumY - 2 * sumX * sumY * sumXY + N * sumXY * sumXY;
  const term2 = term2_num / denominator;
  const deltaY2 = (1 / (N - 2)) * (sumY2 - term2);
  
  // Mencegah NaN karena floating point precision error saat deltaY2 sangat dekat dengan 0 negatif
  const deltaY = Math.sqrt(Math.max(0, deltaY2)); 
  
  const deltaB = deltaY * Math.sqrt(N / denominator);

  const g = 2 * b;
  const deltaG = 2 * deltaB;
  const tk = (1 - deltaG / g) * 100;

  return {
    sumX, sumY, sumX2, sumY2, sumXY,
    b, deltaY2, deltaY, deltaB,
    g, deltaG, tk
  };
}
