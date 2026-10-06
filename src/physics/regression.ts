/**
 * Generic Linear Regression Utility for Laboratory Physics Experiments
 * 
 * Fits data to the model y = bx (or laboratory-standard slope calculation with uncertainty)
 * using the formulas specified in the laboratory manual:
 * 
 * b = [N·Σ(xᵢyᵢ) − Σxᵢ·Σyᵢ] / [N·Σxᵢ² − (Σxᵢ)²]
 * Δy² = (1/(N−2))·[Σyᵢ² − (Σxᵢ²(Σyᵢ)² − 2ΣxᵢΣyᵢΣ(xᵢyᵢ) + N·Σ(xᵢyᵢ)²)/(N·Σxᵢ² − (Σxᵢ)²)]
 * Δb = Δy·√(N/(N·Σxᵢ² − (Σxᵢ)²))
 * TK = (1 − Δb/b) × 100%
 */

export interface RegressionPoint {
  x: number;
  y: number;
}

export interface LinearRegressionResult {
  sumX: number;
  sumY: number;
  sumX2: number;
  sumY2: number;
  sumXY: number;
  a: number;
  b: number;
  r2: number;
  deltaY2: number;
  deltaY: number;
  deltaB: number;
  deltaA: number;
  tk: number;
}

/**
 * Calculates linear regression parameters and uncertainties for given (x, y) data points.
 * 
 * @param data Array of { x, y } data points (minimum 3 points required)
 * @throws Error if data points are less than 3 or if denominator is 0 (no variation in x)
 */
export function calculateLinearRegression(data: RegressionPoint[]): LinearRegressionResult {
  const N = data.length;
  if (N < 3) {
    throw new Error("Dibutuhkan minimal 3 titik data untuk regresi (rekomendasi 5)");
  }

  let sumX = 0;
  let sumY = 0;
  let sumX2 = 0;
  let sumY2 = 0;
  let sumXY = 0;

  for (const d of data) {
    sumX += d.x;
    sumY += d.y;
    sumX2 += d.x * d.x;
    sumY2 += d.y * d.y;
    sumXY += d.x * d.y;
  }

  const denominator = N * sumX2 - sumX * sumX;

  if (Math.abs(denominator) < 1e-10) {
    throw new Error("Denominator nol: Variasi x tidak mencukupi. Pastikan nilai x bervariasi.");
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
  const tk = (1 - deltaB / Math.abs(b)) * 100;

  const a = (sumY - b * sumX) / N;
  const deltaA = deltaY * Math.sqrt(sumX2 / denominator);

  const denomY = N * sumY2 - sumY * sumY;
  let r2 = 0;
  if (denominator > 0 && denomY > 0) {
    const r = (N * sumXY - sumX * sumY) / Math.sqrt(denominator * denomY);
    r2 = r * r;
  }

  return {
    sumX,
    sumY,
    sumX2,
    sumY2,
    sumXY,
    a,
    b,
    r2,
    deltaY2,
    deltaY,
    deltaB,
    deltaA,
    tk,
  };
}
