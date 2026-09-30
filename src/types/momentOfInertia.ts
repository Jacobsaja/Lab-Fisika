/**
 * Types & Interfaces for Momen Inersia I & II Practicum
 * (Konstanta Pegas Spiral & Momen Inersia Diri Alat)
 */

import { LinearRegressionResult } from "@/physics/regression";

export const MOMENT_OF_INERTIA_PART1_STORAGE_KEY = "physics-lab:momen-inersia-1-result";

/**
 * Data hasil akhir Praktikum Momen Inersia I yang disimpan ke localStorage
 * dan dapat dibaca oleh Praktikum Momen Inersia II.
 */
export interface MomentOfInertiaPart1Result {
  kappa: number;        // Konstanta pegas spiral (Nm/rad)
  deltaKappa: number;   // Ketidakpastian mutlak konstanta pegas (Nm/rad)
  tkKappa: number;      // Tingkat ketelitian pengukuran kappa (%)
  t0: number;           // Periode osilasi diri alat tanpa beban T0 (s)
  i0: number;           // Momen inersia diri alat I0 (kg·m²)
  rDrum: number;        // Jari-jari drum/katrol alat momen inersia (m)
  completedAt: string;  // Timestamp penyelesaian (ISO string)
  table81?: Table81Row[];
  table82?: Table82Row[];
  table83?: Table83Data;
  regressionResult?: LinearRegressionResult;
}

/**
 * Baris data Tabel 8.1: Penentuan Simpangan Sudut θ
 * Beban M(g) digantung, diukur 5 kali (θ1-θ5) dalam derajat, lalu dihitung rata-rata θ̅ dalam radian.
 */
export interface Table81Row {
  massGrams: number;
  thetasDeg: number[];    // 5 trial θ1..θ5 dalam derajat (°)
  thetaAvgDeg: number;   // Rata-rata θ̅ dalam derajat (°)
  thetaAvgRad: number;   // Rata-rata θ̅ dalam radian (rad)
}

/**
 * Baris data Tabel 8.2: Perhitungan Gaya dan Momen Gaya (Torka)
 * M(kg), θ̅(rad), F=M×g (N), τ=F×R (Nm)
 */
export interface Table82Row {
  massKg: number;        // M (kg)
  thetaAvgRad: number;   // θ̅ (rad)
  fNewton: number;       // F = M * g (N)
  tauNm: number;         // τ = F * R (Nm)
}

/**
 * Baris perhitungan regresi Tabel 8.4
 * y = τ, x = θ̅, b = κ
 */
export interface Table84RegressionRow {
  xi: number;     // θ̅ (rad)
  yi: number;     // τ (Nm)
  xi2: number;    // xi²
  yi2: number;    // yi²
  xiyi: number;   // xi * yi
}

/**
 * Data Tabel 8.3: Percobaan Momen Inersia Diri Alat
 * 5 trial waktu untuk 5 getaran (t1-t5 dalam detik), T0 = rata-rata(t1..t5) / 5
 */
export interface Table83Data {
  timesSec: number[];    // t1..t5 (s)
  avgTimeSec: number;    // rata-rata t (s)
  t0Sec: number;         // T0 = rata-rata t / 5 (s)
}

/**
 * Hasil kalkulasi regresi khusus pegas spiral
 */
export interface SpiralSpringRegressionResult extends LinearRegressionResult {
  kappa: number;       // b = κ (Nm/rad)
  deltaKappa: number;  // Δb = Δκ (Nm/rad)
  tableRows: Table84RegressionRow[];
}
