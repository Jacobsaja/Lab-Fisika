import { calculateFallTime, calculateAverageTSquared, calculateFreefallRegression, FreefallRegressionData, getVelocity, getDisplacement } from "../physics/freefall";

describe("Gerak Jatuh Bebas (GJB) Physics Module", () => {
  describe("calculateFallTime", () => {
    it("menghasilkan waktu jatuh yang tepat secara teoritis saat noise dimatikan", () => {
      // h = 1.0 m, g = 9.8 m/s^2 => t = sqrt(2*1.0/9.8) = 0.45175395 s
      const { t, t_squared } = calculateFallTime(1.0, 9.8, false);
      expect(t).toBeCloseTo(0.45175395, 5);
      expect(t_squared).toBeCloseTo(0.20408163, 5);
    });

    it("menambahkan noise kecil saat diaktifkan", () => {
      const g = 9.81;
      const h = 0.8; // t_teoritis = sqrt(1.6/9.81) = 0.4038...
      
      const { t: t1 } = calculateFallTime(h, g, true);
      const { t: t2 } = calculateFallTime(h, g, true);
      
      // Karena ada noise acak, t1 kemungkinan besar tidak persis sama dengan t2
      // Namun keduanya masih sangat dekat dengan t_teoritis
      const t_theor = Math.sqrt((2 * h) / g);
      expect(Math.abs(t1 - t_theor)).toBeLessThan(0.01); // Error harus sangat kecil (< 10 ms)
      expect(Math.abs(t2 - t_theor)).toBeLessThan(0.01);
    });
  });

  describe("calculateAverageTSquared", () => {
    it("menghitung rata-rata dengan benar untuk 5 nilai t^2", () => {
      const arr = [0.10, 0.12, 0.11, 0.09, 0.13];
      // sum = 0.55 => avg = 0.11
      expect(calculateAverageTSquared(arr)).toBeCloseTo(0.11, 5);
    });

    it("mengembalikan 0 tanpa error jika array kosong", () => {
      expect(calculateAverageTSquared([])).toBe(0);
    });
  });

  describe("calculateFreefallRegression", () => {
    it("menghitung regresi sempurna untuk data teoritis tanpa noise (g = 9.8)", () => {
      const g_true = 9.8;
      const data: FreefallRegressionData[] = [
        { y: 0.4, x: (2 * 0.4) / g_true },
        { y: 0.6, x: (2 * 0.6) / g_true },
        { y: 0.8, x: (2 * 0.8) / g_true },
        { y: 1.0, x: (2 * 1.0) / g_true },
        { y: 1.2, x: (2 * 1.2) / g_true }
      ];

      const res = calculateFreefallRegression(data);

      expect(res.b).toBeCloseTo(4.9, 5); // b = 1/2 g
      expect(res.g).toBeCloseTo(9.8, 5); // g = 2b
      // deltaY2 harus 0 secara teoritis, TK = 100%
      expect(res.deltaG).toBeCloseTo(0, 4);
      expect(res.tk).toBeCloseTo(100.0, 4);
    });

    it("menghasilkan nilai regresi yang logis meskipun data mengandung noise", () => {
      const g_true = 9.81;
      const data: FreefallRegressionData[] = [
        { y: 0.4, x: ((2 * 0.4) / g_true) * 1.01 }, // +1% noise
        { y: 0.6, x: ((2 * 0.6) / g_true) * 0.99 }, // -1% noise
        { y: 0.8, x: ((2 * 0.8) / g_true) * 1.02 }, // +2% noise
        { y: 1.0, x: ((2 * 1.0) / g_true) * 0.98 }, // -2% noise
        { y: 1.2, x: ((2 * 1.2) / g_true) * 1.005 } // +0.5% noise
      ];

      const res = calculateFreefallRegression(data);

      // g_measured harus tetap dekat dengan 9.81
      expect(res.g).toBeGreaterThan(9.5);
      expect(res.g).toBeLessThan(10.1);
      
      // TK harus berada di rentang 90% - 99.9% akibat noise
      expect(res.tk).toBeGreaterThan(90);
      expect(res.tk).toBeLessThan(100);
      
      // Delta g harus positif
      expect(res.deltaG).toBeGreaterThan(0);
    });

    it("mengembalikan error jika semua nilai h (y) sama (variasi x nol)", () => {
      const data: FreefallRegressionData[] = [
        { y: 1.0, x: 0.2 },
        { y: 1.0, x: 0.2 },
        { y: 1.0, x: 0.2 },
        { y: 1.0, x: 0.2 },
        { y: 1.0, x: 0.2 }
      ];

      expect(() => calculateFreefallRegression(data)).toThrow(/Denominator nol/);
    });
  });

  describe("getVelocity and getDisplacement", () => {
    it("menghitung kecepatan v = gt", () => {
      expect(getVelocity(1.42857, 9.8)).toBeCloseTo(14.0, 1);
    });
    
    it("menghitung perpindahan h = 1/2 gt^2", () => {
      expect(getDisplacement(1.42857, 9.8)).toBeCloseTo(10.0, 1);
    });
    
    it("mendukung kecepatan awal (v0)", () => {
      expect(getVelocity(2, 9.8, 5)).toBe(24.6);
      expect(getDisplacement(2, 9.8, 5)).toBe(29.6);
    });
  });

  describe("getFreeFallVectors (Tahap J)", () => {
    const { getFreeFallVectors } = require("../physics/freefall");

    it("memastikan percepatan a = g konstan saat tanpa hambatan udara", () => {
      const g = 9.81;
      const vec0 = getFreeFallVectors({ t: 0, g });
      const vec1 = getFreeFallVectors({ t: 0.5, g });
      const vec2 = getFreeFallVectors({ t: 1.0, g });

      expect(vec0.a).toBe(g);
      expect(vec1.a).toBe(g);
      expect(vec2.a).toBe(g);
    });

    it("memastikan kecepatan v = g * t dan bernilai nol pada t = 0", () => {
      const g = 9.80;
      const vec0 = getFreeFallVectors({ t: 0, g });
      expect(vec0.v).toBe(0);

      const t1 = 0.45;
      const vec1 = getFreeFallVectors({ t: t1, g });
      expect(vec1.v).toBeCloseTo(g * t1, 5);

      const t2 = 1.2;
      const vec2 = getFreeFallVectors({ t: t2, g });
      expect(vec2.v).toBeCloseTo(g * t2, 5);
    });

    it("memastikan semua vektor mengarah vertikal ke bawah (directionY = +1)", () => {
      const vec = getFreeFallVectors({ t: 0.3, g: 9.79, mass: 0.05 });
      expect(vec.directionY).toBe(1);
      // Pada koordinat SVG, dy positif berarti mengarah ke bawah
      expect(vec.w).toBeGreaterThan(0);
      expect(vec.v).toBeGreaterThan(0);
      expect(vec.a).toBeGreaterThan(0);
    });

    it("menghitung gaya berat w = m * g konstan", () => {
      const mass = 0.05; // 50 g
      const g = 9.81;
      const vec = getFreeFallVectors({ t: 0.8, g, mass });
      expect(vec.w).toBeCloseTo(mass * g, 5);
    });
  });
});
