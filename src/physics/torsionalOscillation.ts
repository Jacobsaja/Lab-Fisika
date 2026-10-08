/**
 * Physics Engine for Torsional Pendulum Oscillation
 * 
 * Rules:
 * - All length inputs (length, r) are in centimeters (cm).
 * - All mass inputs are in kilograms (kg).
 * - The engine converts cm to m internally.
 * - Inertia is returned in kg·m².
 */

export const rodInertia = (massKg: number, lengthCm: number): number => {
  if (massKg <= 0 || lengthCm <= 0) return 0;
  const lengthM = lengthCm / 100;
  return (1 / 12) * massKg * Math.pow(lengthM, 2);
};

export const loadInertia = (m1Kg: number, m2Kg: number, rCm: number): number => {
  if (m1Kg < 0 || m2Kg < 0 || rCm < 0) return 0;
  const rM = rCm / 100;
  return (m1Kg + m2Kg) * Math.pow(rM, 2);
};

export const totalInertia = (I0: number, I_rod: number, I_load: number): number => {
  return Math.max(0, I0 + I_rod + I_load);
};

export const angularFrequency = (I: number, kappa: number): number => {
  if (I <= 0 || kappa <= 0) return 0;
  return Math.sqrt(kappa / I);
};

export const period = (I: number, kappa: number): number => {
  if (I <= 0 || kappa <= 0) return Infinity;
  return 2 * Math.PI * Math.sqrt(I / kappa);
};

export const angleAt = (t: number, A: number, omega: number, phi: number = 0): number => {
  return A * Math.cos(omega * t + phi);
};

export const averagePeriod = (fiveOscillationTimes: number[]): number => {
  if (fiveOscillationTimes.length === 0) return 0;
  const sum = fiveOscillationTimes.reduce((a, b) => a + b, 0);
  // sum is the total time for N trials of 5 oscillations each.
  // mean(5T) = sum / N. And T = mean(5T) / 5.
  return (sum / fiveOscillationTimes.length) / 5;
};

export const relativeError = (theory: number, measured: number): number => {
  if (theory === 0) return 0;
  return (Math.abs(theory - measured) / theory) * 100;
};
