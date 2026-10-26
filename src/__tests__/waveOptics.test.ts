/**
 * Unit Tests for Wave Optics Physics Engine (Modul 11: Sifat-Sifat Gelombang - SSG)
 *
 * Verifies:
 * 1. Manual reference calculations (lambda*L/d = 2.0224 mm, lambda*L/a = 25.28 mm)
 * 2. Secondary maxima counts n(Ts) and dark counts n(G) for N = 1, 2, 3, 5
 * 3. Pattern classification (primer vs sekunder)
 * 4. Single-slit diffraction (N = 1) limits and positions
 * 5. Fraunhofer intensity mathematical properties:
 *    - Symmetry I(-y) = I(y)
 *    - Maximum at y = 0: I(0) = 1.0 (anti-NaN/inf)
 * 6. Primary peak consistency between module formula and Fraunhofer exact
 * 7. Multi-slit dark position module formula limitation (valid strictly for N = 2)
 * 8. Relative uncertainty (KSR%) null for y_teori = 0
 * 9. Explicit documentation & quantification of difference between module linear estimation
 *    and physical Fraunhofer peaks for N = 3 and N = 5
 * 10. Numerical peak finding and ruler quantization (0.5 mm & 0.1 mm)
 */

import {
  DEFAULT_LASER_WAVELENGTH,
  DEFAULT_SCREEN_DISTANCE_L,
  READING_RESOLUTION_MM,
  ZOOM_READING_RESOLUTION_MM,
  SSG_SLIT_PRESETS,
  validateWaveOpticsParams,
  singleSlitDarkPosition,
  singleSlitBrightPosition,
  multiSlitPrimaryPosition,
  multiSlitDarkPositionModule,
  secondaryMaximaCount,
  darkCountBetweenPrimaries,
  isPrimaryPattern,
  getPatternClassification,
  estimatedPatternPosition,
  relativeUncertaintyPercent,
  fraunhoferIntensity,
  fraunhoferMinimaPositions,
  findFraunhoferPeakContinuous,
  findFraunhoferPeakNumerical,
  quantizeToResolution,
} from "@/physics/waveOptics";

describe("Wave Optics Physics Engine (SSG)", () => {
  const lambda = DEFAULT_LASER_WAVELENGTH; // 632 nm = 632e-9 m
  const L = DEFAULT_SCREEN_DISTANCE_L;     // 1.6 m
  const a = SSG_SLIT_PRESETS.slit2.a;      // 0.04 mm = 0.04e-3 m
  const d = SSG_SLIT_PRESETS.slit2.d;      // 0.5 mm = 0.5e-3 m

  describe("1. Parameter Validation & Manual Reference Calculations", () => {
    test("validates optical parameters properly", () => {
      expect(validateWaveOpticsParams({ lambda, L, a, d, N: 2 })).toBe(true);
      expect(validateWaveOpticsParams({ lambda: -1, L, a, d, N: 2 })).toBe(false);
      expect(validateWaveOpticsParams({ lambda, L: 0, a, d, N: 2 })).toBe(false);
      expect(validateWaveOpticsParams({ lambda, L, a: 0, d, N: 2 })).toBe(false);
      expect(validateWaveOpticsParams({ lambda, L, a, d, N: 0 })).toBe(false);
      expect(validateWaveOpticsParams({ lambda, L, a, d, N: 2.5 })).toBe(false);
    });

    test("matches manual reference values: lambda*L/d = 2.0224 mm and lambda*L/a = 25.28 mm", () => {
      // (632e-9 * 1.6) / 0.5e-3 = 1.0112e-6 / 0.5e-3 = 2.0224e-3 m = 2.0224 mm
      const primarySpacing = (lambda * L) / d;
      expect(primarySpacing * 1000).toBeCloseTo(2.0224, 4);

      // (632e-9 * 1.6) / 0.04e-3 = 1.0112e-6 / 0.04e-3 = 25.28e-3 m = 25.28 mm
      const singleSlitSpacing = (lambda * L) / a;
      expect(singleSlitSpacing * 1000).toBeCloseTo(25.28, 4);
    });
  });

  describe("2. Fringes Counts & Pattern Classification", () => {
    test("calculates secondary maxima count n(Ts) = N - 2", () => {
      expect(secondaryMaximaCount(1)).toBe(0);
      expect(secondaryMaximaCount(2)).toBe(0);
      expect(secondaryMaximaCount(3)).toBe(1);
      expect(secondaryMaximaCount(5)).toBe(3);
    });

    test("calculates dark fringe count n(G) = N - 1", () => {
      expect(darkCountBetweenPrimaries(1)).toBe(0);
      expect(darkCountBetweenPrimaries(2)).toBe(1);
      expect(darkCountBetweenPrimaries(3)).toBe(2);
      expect(darkCountBetweenPrimaries(5)).toBe(4);
    });

    test("correctly classifies pattern as primer or sekunder", () => {
      // Celah II (N = 2): Tn mod (2 - 1) === 0 for all Tn -> all primary
      for (let tn = 0; tn <= 4; tn++) {
        expect(isPrimaryPattern(tn, 2)).toBe(true);
        expect(getPatternClassification(tn, 2)).toBe("primer");
      }

      // Celah III (N = 3): Tn mod 2 === 0 -> T0, T2, T4 are primer; T1, T3 are sekunder
      expect(getPatternClassification(0, 3)).toBe("primer");
      expect(getPatternClassification(1, 3)).toBe("sekunder");
      expect(getPatternClassification(2, 3)).toBe("primer");
      expect(getPatternClassification(3, 3)).toBe("sekunder");
      expect(getPatternClassification(4, 3)).toBe("primer");

      // Celah IIIII (N = 5): Tn mod 4 === 0 -> T0, T4 are primer; T1, T2, T3 are sekunder
      expect(getPatternClassification(0, 5)).toBe("primer");
      expect(getPatternClassification(1, 5)).toBe("sekunder");
      expect(getPatternClassification(2, 5)).toBe("sekunder");
      expect(getPatternClassification(3, 5)).toBe("sekunder");
      expect(getPatternClassification(4, 5)).toBe("primer");
    });
  });

  describe("3. Single-Slit Diffraction (N = 1)", () => {
    test("computes dark positions at n * lambda * L / a", () => {
      expect(singleSlitDarkPosition(1, lambda, L, a) * 1000).toBeCloseTo(25.28, 4);
      expect(singleSlitDarkPosition(2, lambda, L, a) * 1000).toBeCloseTo(50.56, 4);
    });

    test("computes bright positions at y0 = 0 and (n + 0.5) * lambda * L / a", () => {
      expect(singleSlitBrightPosition(0, lambda, L, a)).toBe(0);
      expect(singleSlitBrightPosition(1, lambda, L, a) * 1000).toBeCloseTo(37.92, 4);
    });
  });

  describe("4. Fraunhofer Physical Intensity: Stability, Symmetry & Limits", () => {
    test("is perfectly normalized and non-NaN at y = 0: I(0) = 1.0", () => {
      [1, 2, 3, 5].forEach((N) => {
        const I0 = fraunhoferIntensity(0, lambda, L, a, d, N);
        expect(I0).toBeCloseTo(1.0, 6);
        expect(Number.isNaN(I0)).toBe(false);
      });
    });

    test("exhibits even symmetry: I(-y) = I(y)", () => {
      const testPositions = [0.0005, 0.001, 0.0020224, 0.005];
      [2, 3, 5].forEach((N) => {
        testPositions.forEach((y) => {
          const iPos = fraunhoferIntensity(y, lambda, L, a, d, N);
          const iNeg = fraunhoferIntensity(-y, lambda, L, a, d, N);
          expect(iPos).toBeCloseTo(iNeg, 8);
        });
      });
    });

    test("stays strictly bounded in [0, 1]", () => {
      for (let y = -0.01; y <= 0.01; y += 0.0005) {
        const I = fraunhoferIntensity(y, lambda, L, a, d, 5);
        expect(I).toBeGreaterThanOrEqual(0);
        expect(I).toBeLessThanOrEqual(1.000001);
      }
    });
  });

  describe("5. Primary Peak Consistency Between Module Formula and Fraunhofer", () => {
    test("primary peaks from module formula match exact Fraunhofer primary positions", () => {
      // Primary peaks are located at integer multiples of lambda*L/d:
      // y_m = m * 2.0224 mm.
      // Slit II (N = 2): Tn = 0, 1, 2, 3, 4 are m = 0, 1, 2, 3, 4.
      for (let m = 0; m <= 4; m++) {
        const yModuleMm = multiSlitPrimaryPosition(m, lambda, L, d) * 1000;
        const expectedMm = m * 2.0224;
        expect(yModuleMm).toBeCloseTo(expectedMm, 4);

        if (m > 0) {
          const yFraunhoferContMeters = findFraunhoferPeakContinuous(m, 2, lambda, L, a, d);
          const yFraunhoferContMm = yFraunhoferContMeters * 1000;
          // The single slit envelope sinc^2(beta) causes a slight physical inward shift
          // (on the order of 2 - 47 micrometers for m = 1..4), so continuous difference is < 0.05 mm:
          const shiftMm = Math.abs(yFraunhoferContMm - expectedMm);
          expect(shiftMm).toBeLessThan(0.05);

          // When read on the millimeter block ruler (0.5 mm or 0.1 mm resolution),
          // the quantized values match the module primary positions:
          const quantized05 = quantizeToResolution(yFraunhoferContMm, READING_RESOLUTION_MM);
          const quantizedModule05 = quantizeToResolution(expectedMm, READING_RESOLUTION_MM);
          expect(quantized05).toBe(quantizedModule05);

          const quantized01 = quantizeToResolution(yFraunhoferContMm, ZOOM_READING_RESOLUTION_MM);
          const quantizedModule01 = quantizeToResolution(expectedMm, ZOOM_READING_RESOLUTION_MM);
          expect(quantized01).toBe(quantizedModule01);
        }
      }
    });
  });

  describe("6. Multi-slit Dark Position Formula Limitation", () => {
    test("lab manual dark formula is valid strictly for N = 2, but differs for N >= 3", () => {
      // For N = 2: minima occur at (0.5 + (n - 1)) * lambda * L / d = 0.5, 1.5, 2.5 * 2.0224 mm
      const n1Module = multiSlitDarkPositionModule(1, lambda, L, d) * 1000;
      const n2Module = multiSlitDarkPositionModule(2, lambda, L, d) * 1000;
      expect(n1Module).toBeCloseTo(1.0112, 4); // 0.5 * 2.0224 mm
      expect(n2Module).toBeCloseTo(3.0336, 4); // 1.5 * 2.0224 mm

      const minimaN2 = fraunhoferMinimaPositions(2, lambda, L, d, 2).map((y) => y * 1000);
      expect(minimaN2[0]).toBeCloseTo(n1Module, 4);
      expect(minimaN2[1]).toBeCloseTo(n2Module, 4);

      // For N = 3: Fraunhofer exact minima occur at k * lambda * L / (3 * d) for k = 1, 2, 4, 5...
      // k = 1 -> y = (1/3) * 2.0224 mm = 0.6741 mm.
      // The module formula would give 1.0112 mm (off by ~0.337 mm).
      const minimaN3 = fraunhoferMinimaPositions(2, lambda, L, d, 3).map((y) => y * 1000);
      expect(minimaN3[0]).toBeCloseTo((1 / 3) * 2.0224, 4);
      expect(minimaN3[1]).toBeCloseTo((2 / 3) * 2.0224, 4);
      expect(Math.abs(minimaN3[0] - n1Module)).toBeGreaterThan(0.3);
    });
  });

  describe("7. Relative Uncertainty (KSR%) Edge Cases", () => {
    test("returns null when y_teori = 0 (Tn = 0 central maximum)", () => {
      expect(relativeUncertaintyPercent(0, 0)).toBeNull();
      expect(relativeUncertaintyPercent(0, 0.5)).toBeNull();
      expect(relativeUncertaintyPercent(1e-10, 0)).toBeNull();
    });

    test("computes correct percentage when y_teori > 0", () => {
      // y_teori = 2.0, y_praktikum = 2.0 -> 0%
      expect(relativeUncertaintyPercent(2.0, 2.0)).toBeCloseTo(0, 4);

      // y_teori = 2.0, y_praktikum = 2.02 -> 1%
      expect(relativeUncertaintyPercent(2.0, 2.02)).toBeCloseTo(1.0, 4);

      // y_teori = 2.0, y_praktikum = 1.96 -> 2%
      expect(relativeUncertaintyPercent(2.0, 1.96)).toBeCloseTo(2.0, 4);
    });
  });

  describe("8. Explicit Comparison: Module Estimation vs Exact Fraunhofer Peaks (N = 3 and N = 5)", () => {
    test("N = 3 (Celah III): Compares module linear spacing vs physical Fraunhofer peaks", () => {
      // Module formula: y(Tn, 3) = (Tn / 2) * (lambda * L / d) = Tn * 1.0112 mm
      // For N = 3, secondary peak (Tn = 1) is located at alpha = pi/2, where pure interference peaks at 1.0112 mm.
      // With single-slit envelope sinc^2(beta), the peak shifts slightly inward.
      const N = 3;
      const differences: { tn: number; type: string; yEstMm: number; yFraunhoferMm: number; diffMm: number }[] = [];

      for (let tn = 0; tn <= 4; tn++) {
        const yEstMeters = estimatedPatternPosition(tn, N, lambda, L, d, a);
        const yEstMm = yEstMeters * 1000;
        const yFraunhoferContMeters = findFraunhoferPeakContinuous(tn, N, lambda, L, a, d);
        const yFraunhoferMm = yFraunhoferContMeters * 1000;
        const diffMm = Math.abs(yEstMm - yFraunhoferMm);

        differences.push({
          tn,
          type: getPatternClassification(tn, N),
          yEstMm,
          yFraunhoferMm,
          diffMm,
        });

        if (tn === 0) {
          expect(diffMm).toBeCloseTo(0, 6);
        } else if (tn === 1 || tn === 3) {
          // Secondary peaks for N = 3 have a very slight envelope shift (< 0.01 mm)
          expect(diffMm).toBeLessThan(0.02);
        } else {
          // Primary peaks (T2, T4)
          expect(diffMm).toBeLessThan(0.01);
        }
      }

      // Explicitly log the verified differences for documentation:
      // T1 (secondary): yEst = 1.0112 mm, yFraunhofer ~ 1.009 mm -> diff ~ 0.002 mm
      // T2 (primary):   yEst = 2.0224 mm, yFraunhofer ~ 2.022 mm -> diff ~ 0.000 mm
      // T3 (secondary): yEst = 3.0336 mm, yFraunhofer ~ 3.023 mm -> diff ~ 0.010 mm
      // T4 (primary):   yEst = 4.0448 mm, yFraunhofer ~ 4.044 mm -> diff ~ 0.000 mm
      expect(differences.length).toBe(5);
    });

    test("N = 5 (Celah IIIII): Quantifies and asserts the secondary peak shift between module estimation and Fraunhofer", () => {
      // Module formula: y(Tn, 5) = (Tn / 4) * (lambda * L / d) = Tn * 0.5056 mm
      // In physical wave optics, the 3 secondary peaks of N = 5 are NOT uniformly spaced at 1/4, 2/4, 3/4!
      // T1 (first secondary): occurs at alpha ~ 0.286*pi (y ~ 0.578 mm), whereas module assumes 0.25*pi (y = 0.5056 mm).
      // Difference for T1: ~ 0.072 mm.
      // T2 (second secondary): is centrally symmetric at alpha = 0.5*pi (y ~ 1.011 mm), matching module 2/4 = 0.5 (y = 1.0112 mm).
      // Difference for T2: < 0.005 mm.
      // T3 (third secondary): symmetric to T1 at alpha ~ 0.714*pi (y ~ 1.442 mm), whereas module assumes 0.75*pi (y = 1.5168 mm).
      // Difference for T3: ~ 0.074 mm.
      // T4 (first non-zero primary): matches at y = 2.0224 mm.
      const N = 5;
      const t1Est = estimatedPatternPosition(1, N, lambda, L, d, a) * 1000;
      const t1Fraunhofer = findFraunhoferPeakContinuous(1, N, lambda, L, a, d) * 1000;
      const t1Diff = Math.abs(t1Est - t1Fraunhofer);

      expect(t1Est).toBeCloseTo(0.5056, 4);
      expect(t1Fraunhofer).toBeGreaterThan(0.56);
      expect(t1Fraunhofer).toBeLessThan(0.60);
      expect(t1Diff).toBeGreaterThan(0.06); // Verified physical shift of ~0.07 mm!
      expect(t1Diff).toBeLessThan(0.09);

      // T2 (middle secondary peak) is symmetric around alpha = pi/2:
      const t2Est = estimatedPatternPosition(2, N, lambda, L, d, a) * 1000;
      const t2Fraunhofer = findFraunhoferPeakContinuous(2, N, lambda, L, a, d) * 1000;
      const t2Diff = Math.abs(t2Est - t2Fraunhofer);
      expect(t2Est).toBeCloseTo(1.0112, 4);
      expect(t2Diff).toBeLessThan(0.01); // Negligible difference for center secondary peak

      // T3 (third secondary peak):
      const t3Est = estimatedPatternPosition(3, N, lambda, L, d, a) * 1000;
      const t3Fraunhofer = findFraunhoferPeakContinuous(3, N, lambda, L, a, d) * 1000;
      const t3Diff = Math.abs(t3Est - t3Fraunhofer);
      expect(t3Est).toBeCloseTo(1.5168, 4);
      expect(t3Diff).toBeGreaterThan(0.06); // Verified physical shift of ~0.07 mm!
      expect(t3Diff).toBeLessThan(0.09);

      // T4 (primary peak):
      const t4Est = estimatedPatternPosition(4, N, lambda, L, d, a) * 1000;
      const t4Fraunhofer = findFraunhoferPeakContinuous(4, N, lambda, L, a, d) * 1000;
      const t4Diff = Math.abs(t4Est - t4Fraunhofer);
      expect(t4Est).toBeCloseTo(2.0224, 4);
      expect(t4Diff).toBeLessThan(0.005);
    });
  });

  describe("9. Ruler Reading Quantization & Numerical Peak Finding", () => {
    test("quantizes correctly to 0.5 mm and 0.1 mm resolutions", () => {
      expect(quantizeToResolution(1.0112, READING_RESOLUTION_MM)).toBe(1.0);
      expect(quantizeToResolution(1.26, READING_RESOLUTION_MM)).toBe(1.5);
      expect(quantizeToResolution(1.24, READING_RESOLUTION_MM)).toBe(1.0);

      expect(quantizeToResolution(1.0112, ZOOM_READING_RESOLUTION_MM)).toBe(1.0);
      expect(quantizeToResolution(1.26, ZOOM_READING_RESOLUTION_MM)).toBe(1.3);
      expect(quantizeToResolution(1.24, ZOOM_READING_RESOLUTION_MM)).toBe(1.2);
    });

    test("findFraunhoferPeakNumerical quantizes experimental assistant values to ruler resolution", () => {
      // For N = 2:
      // T0: 0.0 mm
      // T1: 2.0224 mm -> quantized to 0.5 mm = 2.0 mm; to 0.1 mm = 2.0 mm
      expect(findFraunhoferPeakNumerical(0, 2, lambda, L, a, d, READING_RESOLUTION_MM)).toBe(0);
      expect(findFraunhoferPeakNumerical(1, 2, lambda, L, a, d, READING_RESOLUTION_MM)).toBe(2.0);
      expect(findFraunhoferPeakNumerical(2, 2, lambda, L, a, d, READING_RESOLUTION_MM)).toBe(4.0);

      // For N = 5:
      // T1 Fraunhofer continuous is ~0.578 mm.
      // Quantized to 0.5 mm resolution -> 0.5 mm
      // Quantized to 0.1 mm resolution -> 0.6 mm
      expect(findFraunhoferPeakNumerical(1, 5, lambda, L, a, d, READING_RESOLUTION_MM)).toBe(0.5);
      expect(findFraunhoferPeakNumerical(1, 5, lambda, L, a, d, ZOOM_READING_RESOLUTION_MM)).toBe(0.6);
    });
  });
});
