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
 * 6. Multi-slit dark position module formula limitation (valid strictly for N = 2)
 * 7. Relative uncertainty (KSR%) null for y_teori = 0
 * 8. High-Precision Reference Verification (N = 2, 3, 5) with tolerance < 0.5 um:
 *    - N=2: T1 2.0181, T2 4.0360, T3 6.0538, T4 8.0711 mm (shifts: -4.3, -8.8, -13.4, -18.5 um)
 *    - N=3: T1 1.0109, T2 2.0208, T3 3.0328, T4 4.0415 mm (shifts: -0.3, -1.6, -0.8, -3.3 um)
 *    - N=5: T1 0.5869, T2 1.0111, T3 1.4353, T4 2.0219 mm (shifts: +81.3, -0.1, -81.5, -0.5 um)
 * 9. Physical Sanity: Primary peak shift shrinks as N increases (|shift N=2| > |shift N=3| > |shift N=5|)
 * 10. Independent Dense-Grid Benchmark (step 0.1 um) across multiple parameter sets (lambda 450-700 nm, L 1-2 m, d 0.25-0.5 mm)
 * 11. Ruler Reading Quantization (0.5 mm and 0.1 mm)
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
      const primarySpacing = (lambda * L) / d;
      expect(primarySpacing * 1000).toBeCloseTo(2.0224, 4);

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
      // Celah II (N = 2): Tn mod 1 === 0 -> all primary
      for (let tn = 0; tn <= 4; tn++) {
        expect(isPrimaryPattern(tn, 2)).toBe(true);
        expect(getPatternClassification(tn, 2)).toBe("primer");
      }

      // Celah III (N = 3): T0, T2, T4 are primer; T1, T3 are sekunder
      expect(getPatternClassification(0, 3)).toBe("primer");
      expect(getPatternClassification(1, 3)).toBe("sekunder");
      expect(getPatternClassification(2, 3)).toBe("primer");
      expect(getPatternClassification(3, 3)).toBe("sekunder");
      expect(getPatternClassification(4, 3)).toBe("primer");

      // Celah IIIII (N = 5): T0, T4 are primer; T1, T2, T3 are sekunder
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

  describe("5. Multi-slit Dark Position Formula Limitation", () => {
    test("lab manual dark formula is valid strictly for N = 2, but differs for N >= 3", () => {
      const n1Module = multiSlitDarkPositionModule(1, lambda, L, d) * 1000;
      const n2Module = multiSlitDarkPositionModule(2, lambda, L, d) * 1000;
      expect(n1Module).toBeCloseTo(1.0112, 4);
      expect(n2Module).toBeCloseTo(3.0336, 4);

      const minimaN2 = fraunhoferMinimaPositions(2, lambda, L, d, 2).map((y) => y * 1000);
      expect(minimaN2[0]).toBeCloseTo(n1Module, 4);
      expect(minimaN2[1]).toBeCloseTo(n2Module, 4);

      // For N = 3: Fraunhofer minima at (1/3) * 2.0224 = 0.6741 mm and (2/3) * 2.0224 = 1.3483 mm
      const minimaN3 = fraunhoferMinimaPositions(2, lambda, L, d, 3).map((y) => y * 1000);
      expect(minimaN3[0]).toBeCloseTo((1 / 3) * 2.0224, 4);
      expect(minimaN3[1]).toBeCloseTo((2 / 3) * 2.0224, 4);
      expect(Math.abs(minimaN3[0] - n1Module)).toBeGreaterThan(0.3);
    });
  });

  describe("6. Relative Uncertainty (KSR%) Edge Cases", () => {
    test("returns null when y_teori = 0 (Tn = 0 central maximum)", () => {
      expect(relativeUncertaintyPercent(0, 0)).toBeNull();
      expect(relativeUncertaintyPercent(0, 0.5)).toBeNull();
      expect(relativeUncertaintyPercent(1e-10, 0)).toBeNull();
    });

    test("computes correct percentage when y_teori > 0", () => {
      expect(relativeUncertaintyPercent(2.0, 2.0)).toBeCloseTo(0, 4);
      expect(relativeUncertaintyPercent(2.0, 2.02)).toBeCloseTo(1.0, 4);
      expect(relativeUncertaintyPercent(2.0, 1.96)).toBeCloseTo(2.0, 4);
    });
  });

  describe("7. High-Precision Reference Verification (N = 2, 3, 5)", () => {
    const TOL_MM = 0.0005; // 0.5 um tolerance

    test("N = 2 matches reference: T1 2.0181, T2 4.0360, T3 6.0538, T4 8.0711 mm", () => {
      const N = 2;
      const expectedMm = [0, 2.0181, 4.0360, 6.0538, 8.0711];
      const expectedShiftsUm = [0, -4.3, -8.8, -13.4, -18.5];

      for (let tn = 1; tn <= 4; tn++) {
        const yContMm = findFraunhoferPeakContinuous(tn, N, lambda, L, a, d) * 1000;
        expect(Math.abs(yContMm - expectedMm[tn])).toBeLessThan(TOL_MM);

        const yEstMm = estimatedPatternPosition(tn, N, lambda, L, d, a) * 1000;
        const shiftUm = (yContMm - yEstMm) * 1000;
        expect(shiftUm).toBeCloseTo(expectedShiftsUm[tn], 1);
      }
    });

    test("N = 3 matches reference: T1 1.0109, T2 2.0208, T3 3.0328, T4 4.0415 mm", () => {
      const N = 3;
      const expectedMm = [0, 1.0109, 2.0208, 3.0328, 4.0415];
      const expectedShiftsUm = [0, -0.3, -1.6, -0.8, -3.3];

      for (let tn = 1; tn <= 4; tn++) {
        const yContMm = findFraunhoferPeakContinuous(tn, N, lambda, L, a, d) * 1000;
        expect(Math.abs(yContMm - expectedMm[tn])).toBeLessThan(TOL_MM);

        const yEstMm = estimatedPatternPosition(tn, N, lambda, L, d, a) * 1000;
        const shiftUm = (yContMm - yEstMm) * 1000;
        expect(shiftUm).toBeCloseTo(expectedShiftsUm[tn], 1);
      }
    });

    test("N = 5 matches reference: T1 0.5869, T2 1.0111, T3 1.4353, T4 2.0219 mm", () => {
      const N = 5;
      const expectedMm = [0, 0.5869, 1.0111, 1.4353, 2.0219];
      const expectedShiftsUm = [0, 81.3, -0.1, -81.5, -0.5];

      for (let tn = 1; tn <= 4; tn++) {
        const yContMm = findFraunhoferPeakContinuous(tn, N, lambda, L, a, d) * 1000;
        expect(Math.abs(yContMm - expectedMm[tn])).toBeLessThan(TOL_MM);

        const yEstMm = estimatedPatternPosition(tn, N, lambda, L, d, a) * 1000;
        const shiftUm = (yContMm - yEstMm) * 1000;
        expect(shiftUm).toBeCloseTo(expectedShiftsUm[tn], 1);
      }
    });
  });

  describe("8. Physical Sanity: Primary Peak Shifts Shrink with N", () => {
    test("inward shift of first primary peak (m = 1) decreases monotonically as N increases", () => {
      // Primary peak m = 1 corresponds to:
      // N = 2: Tn = 1 (est = 2.0224 mm) -> shift = -4.3 um
      // N = 3: Tn = 2 (est = 2.0224 mm) -> shift = -1.6 um
      // N = 5: Tn = 4 (est = 2.0224 mm) -> shift = -0.5 um
      const yEstM = multiSlitPrimaryPosition(1, lambda, L, d);

      const yPeakN2 = findFraunhoferPeakContinuous(1, 2, lambda, L, a, d);
      const shiftN2 = Math.abs(yPeakN2 - yEstM);

      const yPeakN3 = findFraunhoferPeakContinuous(2, 3, lambda, L, a, d);
      const shiftN3 = Math.abs(yPeakN3 - yEstM);

      const yPeakN5 = findFraunhoferPeakContinuous(4, 5, lambda, L, a, d);
      const shiftN5 = Math.abs(yPeakN5 - yEstM);

      // Physical justification: As N increases, the interference principal maximum
      // becomes sharper (width ~ 1/N, intensity ~ N^2), making it increasingly resistant
      // to the broad, slowly-varying single slit envelope sinc^2(beta).
      expect(shiftN2).toBeGreaterThan(shiftN3);
      expect(shiftN3).toBeGreaterThan(shiftN5);
    });
  });

  describe("9. Independent Dense-Grid Benchmark (< 0.1 um)", () => {
    /**
     * Brute-force argmax helper on a fine grid of step 0.1 um (1e-7 m).
     */
    function denseGridArgmax(
      yCenter: number,
      halfWindow: number,
      step: number,
      intensityFn: (y: number) => number
    ): number {
      let bestY = yCenter;
      let maxVal = -1;
      const yStart = yCenter - halfWindow;
      const yEnd = yCenter + halfWindow;

      for (let y = yStart; y <= yEnd; y += step) {
        const val = intensityFn(y);
        if (val > maxVal) {
          maxVal = val;
          bestY = y;
        }
      }
      return bestY;
    }

    test("matches dense grid (0.1 um step) for default setup across N = 2, 3, 5", () => {
      [2, 3, 5].forEach((N) => {
        for (let tn = 1; tn <= 4; tn++) {
          const yOpt = findFraunhoferPeakContinuous(tn, N, lambda, L, a, d);
          const intensityFn = (y: number) => fraunhoferIntensity(y, lambda, L, a, d, N);

          // Grid search in +/- 50 um window with 0.1 um step (1e-7 m)
          const yGrid = denseGridArgmax(yOpt, 50e-6, 1e-7, intensityFn);

          // Must match to within the 0.1 um grid step resolution
          expect(Math.abs(yOpt - yGrid)).toBeLessThanOrEqual(1.5e-7);
        }
      });
    });

    test("matches dense grid for varied optical parameters: lambda 450 nm & 700 nm, L 1.0 m & 2.0 m, d 0.25 mm", () => {
      const variedCases = [
        { lambda: 450e-9, L: 1.0, a: 0.04e-3, d: 0.5e-3, N: 3, tn: 2 },
        { lambda: 700e-9, L: 2.0, a: 0.04e-3, d: 0.25e-3, N: 5, tn: 1 },
        { lambda: 450e-9, L: 2.0, a: 0.04e-3, d: 0.25e-3, N: 2, tn: 1 },
        { lambda: 700e-9, L: 1.0, a: 0.04e-3, d: 0.5e-3, N: 5, tn: 3 },
      ];

      variedCases.forEach((c) => {
        const yOpt = findFraunhoferPeakContinuous(c.tn, c.N, c.lambda, c.L, c.a, c.d);
        const intensityFn = (y: number) => fraunhoferIntensity(y, c.lambda, c.L, c.a, c.d, c.N);

        const yGrid = denseGridArgmax(yOpt, 50e-6, 1e-7, intensityFn);
        expect(Math.abs(yOpt - yGrid)).toBeLessThanOrEqual(1.5e-7);
      });
    });
  });

  describe("10. Ruler Reading Quantization & Numerical Peak Finding", () => {
    test("quantizes correctly to 0.5 mm and 0.1 mm resolutions", () => {
      expect(quantizeToResolution(1.0112, READING_RESOLUTION_MM)).toBe(1.0);
      expect(quantizeToResolution(1.26, READING_RESOLUTION_MM)).toBe(1.5);
      expect(quantizeToResolution(1.24, READING_RESOLUTION_MM)).toBe(1.0);

      expect(quantizeToResolution(1.0112, ZOOM_READING_RESOLUTION_MM)).toBe(1.0);
      expect(quantizeToResolution(1.26, ZOOM_READING_RESOLUTION_MM)).toBe(1.3);
      expect(quantizeToResolution(1.24, ZOOM_READING_RESOLUTION_MM)).toBe(1.2);
    });

    test("findFraunhoferPeakNumerical quantizes experimental assistant values to ruler resolution", () => {
      // N = 2:
      // T0: 0.0 mm
      // T1 (2.0181 mm): 0.5 mm -> 2.0 mm; 0.1 mm -> 2.0 mm
      // T2 (4.0360 mm): 0.5 mm -> 4.0 mm; 0.1 mm -> 4.0 mm
      // T3 (6.0538 mm): 0.5 mm -> 6.0 mm; 0.1 mm -> 6.1 mm
      // T4 (8.0711 mm): 0.5 mm -> 8.0 mm; 0.1 mm -> 8.1 mm
      expect(findFraunhoferPeakNumerical(0, 2, lambda, L, a, d, READING_RESOLUTION_MM)).toBe(0);
      expect(findFraunhoferPeakNumerical(1, 2, lambda, L, a, d, READING_RESOLUTION_MM)).toBe(2.0);
      expect(findFraunhoferPeakNumerical(2, 2, lambda, L, a, d, READING_RESOLUTION_MM)).toBe(4.0);
      expect(findFraunhoferPeakNumerical(3, 2, lambda, L, a, d, READING_RESOLUTION_MM)).toBe(6.0);
      expect(findFraunhoferPeakNumerical(4, 2, lambda, L, a, d, READING_RESOLUTION_MM)).toBe(8.0);

      expect(findFraunhoferPeakNumerical(3, 2, lambda, L, a, d, ZOOM_READING_RESOLUTION_MM)).toBe(6.1);
      expect(findFraunhoferPeakNumerical(4, 2, lambda, L, a, d, ZOOM_READING_RESOLUTION_MM)).toBe(8.1);

      // N = 3:
      // T1 (1.0109 mm): 0.5 mm -> 1.0 mm; 0.1 mm -> 1.0 mm
      // T2 (2.0208 mm): 0.5 mm -> 2.0 mm; 0.1 mm -> 2.0 mm
      // T3 (3.0328 mm): 0.5 mm -> 3.0 mm; 0.1 mm -> 3.0 mm
      // T4 (4.0415 mm): 0.5 mm -> 4.0 mm; 0.1 mm -> 4.0 mm
      for (let tn = 1; tn <= 4; tn++) {
        expect(findFraunhoferPeakNumerical(tn, 3, lambda, L, a, d, READING_RESOLUTION_MM)).toBe(tn * 1.0);
        expect(findFraunhoferPeakNumerical(tn, 3, lambda, L, a, d, ZOOM_READING_RESOLUTION_MM)).toBe(tn * 1.0);
      }

      // N = 5:
      // T1 (0.5869 mm): 0.5 mm -> 0.5 mm; 0.1 mm -> 0.6 mm
      // T2 (1.0111 mm): 0.5 mm -> 1.0 mm; 0.1 mm -> 1.0 mm
      // T3 (1.4353 mm): 0.5 mm -> 1.5 mm; 0.1 mm -> 1.4 mm
      // T4 (2.0219 mm): 0.5 mm -> 2.0 mm; 0.1 mm -> 2.0 mm
      expect(findFraunhoferPeakNumerical(1, 5, lambda, L, a, d, READING_RESOLUTION_MM)).toBe(0.5);
      expect(findFraunhoferPeakNumerical(2, 5, lambda, L, a, d, READING_RESOLUTION_MM)).toBe(1.0);
      expect(findFraunhoferPeakNumerical(3, 5, lambda, L, a, d, READING_RESOLUTION_MM)).toBe(1.5);
      expect(findFraunhoferPeakNumerical(4, 5, lambda, L, a, d, READING_RESOLUTION_MM)).toBe(2.0);

      expect(findFraunhoferPeakNumerical(1, 5, lambda, L, a, d, ZOOM_READING_RESOLUTION_MM)).toBe(0.6);
      expect(findFraunhoferPeakNumerical(2, 5, lambda, L, a, d, ZOOM_READING_RESOLUTION_MM)).toBe(1.0);
      expect(findFraunhoferPeakNumerical(3, 5, lambda, L, a, d, ZOOM_READING_RESOLUTION_MM)).toBe(1.4);
      expect(findFraunhoferPeakNumerical(4, 5, lambda, L, a, d, ZOOM_READING_RESOLUTION_MM)).toBe(2.0);
    });
  });
});
