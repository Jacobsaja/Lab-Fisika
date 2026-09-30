import {
  DEFAULT_DRUM_RADIUS,
  DEFAULT_GRAVITY,
  degToRad,
  radToDeg,
  calculateForce,
  calculateTorque,
  calculateTorqueFromMass,
  calculateDeflectionAngleRad,
  calculateDeflectionAngleDeg,
  simulateDeflectionAngle,
  calculateAverageAngle,
  calculateTable82Row,
  calculateSpiralSpringRegression,
  calculatePeriodT0,
  calculateSelfMomentOfInertia,
  simulateOscillationTime,
  saveMomentOfInertiaResult,
  loadMomentOfInertiaResult,
  clearMomentOfInertiaResult,
} from "../physics/momentOfInertia";
import { MomentOfInertiaPart1Result } from "../types/momentOfInertia";

describe("Momen Inersia I Physics Module", () => {
  describe("Konversi Sudut", () => {
    it("mengonversi derajat ke radian dengan benar", () => {
      expect(degToRad(0)).toBe(0);
      expect(degToRad(90)).toBeCloseTo(Math.PI / 2, 6);
      expect(degToRad(180)).toBeCloseTo(Math.PI, 6);
      expect(degToRad(360)).toBeCloseTo(2 * Math.PI, 6);
    });

    it("mengonversi radian ke derajat dengan benar", () => {
      expect(radToDeg(0)).toBe(0);
      expect(radToDeg(Math.PI / 2)).toBeCloseTo(90, 6);
      expect(radToDeg(Math.PI)).toBeCloseTo(180, 6);
      expect(radToDeg(2 * Math.PI)).toBeCloseTo(360, 6);
    });

    it("konsisten saat roundtrip konversi", () => {
      const angle = 47.35;
      expect(radToDeg(degToRad(angle))).toBeCloseTo(angle, 6);
    });
  });

  describe("Gaya dan Torka (τ = F × R)", () => {
    it("menghitung gaya berat F = M × g dengan benar", () => {
      const massKg = 0.1; // 100 gram
      const f = calculateForce(massKg, 9.81);
      expect(f).toBeCloseTo(0.981, 4);
    });

    it("mengembalikan 0 jika massa <= 0", () => {
      expect(calculateForce(0)).toBe(0);
      expect(calculateForce(-0.05)).toBe(0);
    });

    it("menghitung torka τ = F × R dengan benar", () => {
      const f = 0.981; // N
      const r = 0.025; // 2.5 cm
      const tau = calculateTorque(f, r);
      expect(tau).toBeCloseTo(0.024525, 6);
    });

    it("menghitung torka langsung dari massa dengan benar", () => {
      const massKg = 0.15; // 150 g
      const r = DEFAULT_DRUM_RADIUS; // 0.025 m
      const g = DEFAULT_GRAVITY;     // 9.81 m/s^2
      // F = 0.15 * 9.81 = 1.4715 N
      // τ = 1.4715 * 0.025 = 0.0367875 Nm
      const tau = calculateTorqueFromMass(massKg, r, g);
      expect(tau).toBeCloseTo(0.0367875, 6);
    });
  });

  describe("Simpangan Sudut (τ = κ · θ)", () => {
    const kappa = 0.03; // Nm/rad
    const radius = 0.025; // m
    const g = 9.81;

    it("menghitung simpangan teoritis dalam radian dan derajat", () => {
      const massKg = 0.1; // 100 g
      const tau = calculateTorqueFromMass(massKg, radius, g); // 0.024525 Nm
      const thetaRad = calculateDeflectionAngleRad(tau, kappa);
      const thetaDeg = calculateDeflectionAngleDeg(tau, kappa);

      // θ_rad = 0.024525 / 0.03 = 0.8175 rad
      expect(thetaRad).toBeCloseTo(0.8175, 5);
      // θ_deg = 0.8175 * 180 / π ≈ 46.8392°
      expect(thetaDeg).toBeCloseTo(46.8392, 3);
    });

    it("mensimulasikan pembacaan tanpa noise menghasilkan nilai teoritis presisi", () => {
      const massKg = 0.2;
      const { angleDeg, angleRad } = simulateDeflectionAngle(massKg, kappa, radius, g, false);

      const expectedTau = 0.2 * 9.81 * 0.025; // 0.04905 Nm
      const expectedRad = expectedTau / kappa;
      const expectedDeg = radToDeg(expectedRad);

      expect(angleDeg).toBeCloseTo(expectedDeg, 5);
      expect(angleRad).toBeCloseTo(expectedRad, 5);
    });

    it("mensimulasikan pembacaan dengan noise tetap berada di sekitar nilai teoritis", () => {
      const massKg = 0.15;
      const theor = simulateDeflectionAngle(massKg, kappa, radius, g, false);
      const withNoise = simulateDeflectionAngle(massKg, kappa, radius, g, true);

      // Perbedaan akibat noise harus kecil (< 0.25°)
      expect(Math.abs(withNoise.angleDeg - theor.angleDeg)).toBeLessThan(0.25);
    });

    it("menghitung rata-rata sudut dari 5 pengukuran (θ1..θ5)", () => {
      const trials = [46.7, 46.8, 46.9, 46.8, 46.8];
      const { avgDeg, avgRad } = calculateAverageAngle(trials);

      expect(avgDeg).toBeCloseTo(46.8, 4);
      expect(avgRad).toBeCloseTo(degToRad(46.8), 4);
    });

    it("menghasilkan 0 jika array sudut kosong", () => {
      const res = calculateAverageAngle([]);
      expect(res.avgDeg).toBe(0);
      expect(res.avgRad).toBe(0);
    });

    it("menghasilkan baris Tabel 8.2 secara konsisten", () => {
      const massKg = 0.05;
      const thetaAvgRad = 0.40875;
      const row = calculateTable82Row(massKg, thetaAvgRad, 0.025, 9.81);

      expect(row.massKg).toBe(0.05);
      expect(row.thetaAvgRad).toBe(0.40875);
      expect(row.fNewton).toBeCloseTo(0.05 * 9.81, 5);
      expect(row.tauNm).toBeCloseTo(0.05 * 9.81 * 0.025, 6);
    });
  });

  describe("Regresi Linier Pegas Spiral (Bagian A)", () => {
    it("menghitung regresi sempurna untuk data sintetis tanpa noise", () => {
      const kappaTrue = 0.028; // Nm/rad
      const masses = [0.05, 0.10, 0.15, 0.20, 0.25]; // kg
      const radius = DEFAULT_DRUM_RADIUS;
      const g = 9.81;

      const data = masses.map((m) => {
        const tau = m * g * radius;
        const thetaRad = tau / kappaTrue;
        return { thetaRad, torqueNm: tau };
      });

      const res = calculateSpiralSpringRegression(data);

      expect(res.kappa).toBeCloseTo(kappaTrue, 6);
      expect(res.b).toBeCloseTo(kappaTrue, 6);
      expect(res.deltaKappa).toBeCloseTo(0, 5);
      expect(res.deltaB).toBeCloseTo(0, 5);
      expect(res.tk).toBeCloseTo(100.0, 4);
      expect(res.tableRows).toHaveLength(5);

      // Verifikasi baris tabel Tabel 8.4
      res.tableRows.forEach((row, i) => {
        expect(row.xi).toBeCloseTo(data[i].thetaRad, 6);
        expect(row.yi).toBeCloseTo(data[i].torqueNm, 6);
        expect(row.xi2).toBeCloseTo(data[i].thetaRad ** 2, 6);
        expect(row.yi2).toBeCloseTo(data[i].torqueNm ** 2, 6);
        expect(row.xiyi).toBeCloseTo(data[i].thetaRad * data[i].torqueNm, 6);
      });
    });

    it("menghitung regresi linier dengan toleransi noise yang realistis", () => {
      const kappaTrue = 0.035;
      const masses = [0.05, 0.10, 0.15, 0.20, 0.25];
      const radius = 0.025;
      const g = 9.81;

      // Berikan sedikit noise (±1.5%) pada sudut yang dibaca
      const perturbations = [1.01, 0.99, 1.015, 0.985, 1.005];
      const data = masses.map((m, idx) => {
        const tau = m * g * radius;
        const thetaRad = (tau / kappaTrue) * perturbations[idx];
        return { thetaRad, torqueNm: tau };
      });

      const res = calculateSpiralSpringRegression(data);

      // Hasil kappa harus tetap sangat dekat dengan 0.035
      expect(res.kappa).toBeGreaterThan(0.033);
      expect(res.kappa).toBeLessThan(0.037);

      // Ketidakpastian harus bernilai positif
      expect(res.deltaKappa).toBeGreaterThan(0);

      // Tingkat ketelitian (TK) realistis di rentang 90% - 99.9%
      expect(res.tk).toBeGreaterThan(90);
      expect(res.tk).toBeLessThan(100);
    });

    it("melempar error jika data kurang dari 3 titik", () => {
      const smallData = [
        { thetaRad: 0.1, torqueNm: 0.003 },
        { thetaRad: 0.2, torqueNm: 0.006 },
      ];
      expect(() => calculateSpiralSpringRegression(smallData)).toThrow(/minimal 3 titik/);
    });

    it("melempar error jika denominator bernilai nol (tidak ada variasi x)", () => {
      const flatData = [
        { thetaRad: 0.5, torqueNm: 0.01 },
        { thetaRad: 0.5, torqueNm: 0.02 },
        { thetaRad: 0.5, torqueNm: 0.03 },
      ];
      expect(() => calculateSpiralSpringRegression(flatData)).toThrow(/Denominator nol/);
    });
  });

  describe("Percobaan Momen Inersia Diri Alat (Bagian B)", () => {
    it("menghitung periode getaran diri T0 dari 5 getaran", () => {
      // 5 trial waktu untuk 5 getaran
      const times = [10.1, 10.2, 9.9, 10.0, 9.8]; // rata-rata = 10.0 s
      const { avgTimeSec, t0Sec } = calculatePeriodT0(times);

      expect(avgTimeSec).toBeCloseTo(10.0, 4);
      // T0 = 10.0 / 5 = 2.0 s
      expect(t0Sec).toBeCloseTo(2.0, 4);
    });

    it("mengembalikan 0 untuk calculatePeriodT0 jika array kosong", () => {
      const res = calculatePeriodT0([]);
      expect(res.avgTimeSec).toBe(0);
      expect(res.t0Sec).toBe(0);
    });

    it("menghitung momen inersia diri I0 = κ · T0² / (4π²)", () => {
      const kappa = 0.03; // Nm/rad
      const t0 = 2.0;     // s
      // I0 = (0.03 * 4) / (4 * π^2) = 0.12 / 39.4784176... ≈ 0.0030396355 kg·m²
      const i0 = calculateSelfMomentOfInertia(kappa, t0);
      expect(i0).toBeCloseTo(0.0030396, 6);
    });

    it("menangani edge case T0 = 0 atau negatif", () => {
      expect(calculateSelfMomentOfInertia(0.03, 0)).toBe(0);
      expect(calculateSelfMomentOfInertia(0.03, -1.5)).toBe(0);
      expect(calculateSelfMomentOfInertia(0, 2.0)).toBe(0);
      expect(calculateSelfMomentOfInertia(-0.01, 2.0)).toBe(0);
    });

    it("mensimulasikan waktu osilasi 5 getaran tanpa noise", () => {
      const i0 = 0.003;
      const kappa = 0.03;
      // T0 = 2π * sqrt(0.003 / 0.03) = 2π * sqrt(0.1) ≈ 1.98691765 s
      // 5 * T0 ≈ 9.934588 s
      const tTotal = simulateOscillationTime(i0, kappa, 5, false);
      expect(tTotal).toBeCloseTo(9.934588, 4);
    });

    it("mensimulasikan waktu osilasi dengan noise kecil", () => {
      const i0 = 0.003;
      const kappa = 0.03;
      const theor = simulateOscillationTime(i0, kappa, 5, false);
      const withNoise = simulateOscillationTime(i0, kappa, 5, true);

      // Noise ±0.3% -> deviasi maksimum sekitar 0.05 s
      expect(Math.abs(withNoise - theor)).toBeLessThan(0.1);
    });

    it("menangani edge case simulasi waktu osilasi jika parameter non-positif", () => {
      expect(simulateOscillationTime(0, 0.03)).toBe(0);
      expect(simulateOscillationTime(0.003, 0)).toBe(0);
      expect(simulateOscillationTime(0.003, 0.03, 0)).toBe(0);
    });
  });

  describe("Penyimpanan Hasil ke LocalStorage", () => {
    beforeEach(() => {
      clearMomentOfInertiaResult();
    });

    it("menyimpan dan membaca hasil akhir praktikum dengan lengkap", () => {
      const mockResult: MomentOfInertiaPart1Result = {
        kappa: 0.03125,
        deltaKappa: 0.00045,
        tkKappa: 98.56,
        t0: 1.985,
        i0: 0.00311,
        rDrum: DEFAULT_DRUM_RADIUS,
        completedAt: new Date().toISOString(),
        table83: {
          timesSec: [9.92, 9.94, 9.91, 9.95, 9.93],
          avgTimeSec: 9.93,
          t0Sec: 1.986,
        },
      };

      const saveOk = saveMomentOfInertiaResult(mockResult);
      expect(saveOk).toBe(true);

      const loaded = loadMomentOfInertiaResult();
      expect(loaded).not.toBeNull();
      expect(loaded?.kappa).toBeCloseTo(0.03125, 5);
      expect(loaded?.deltaKappa).toBeCloseTo(0.00045, 5);
      expect(loaded?.tkKappa).toBeCloseTo(98.56, 2);
      expect(loaded?.t0).toBeCloseTo(1.985, 3);
      expect(loaded?.i0).toBeCloseTo(0.00311, 5);
      expect(loaded?.rDrum).toBe(DEFAULT_DRUM_RADIUS);
      expect(loaded?.table83?.timesSec).toHaveLength(5);
    });

    it("mengembalikan null jika belum ada data yang tersimpan", () => {
      clearMomentOfInertiaResult();
      expect(loadMomentOfInertiaResult()).toBeNull();
    });

    it("dapat menghapus data tersimpan", () => {
      const mockResult: MomentOfInertiaPart1Result = {
        kappa: 0.03,
        deltaKappa: 0.0005,
        tkKappa: 98.3,
        t0: 2.0,
        i0: 0.003,
        rDrum: 0.025,
        completedAt: new Date().toISOString(),
      };

      saveMomentOfInertiaResult(mockResult);
      expect(loadMomentOfInertiaResult()).not.toBeNull();

      clearMomentOfInertiaResult();
      expect(loadMomentOfInertiaResult()).toBeNull();
    });
  });
});
