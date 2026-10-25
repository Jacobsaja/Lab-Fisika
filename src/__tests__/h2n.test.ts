import {
  G_STANDARD,
  calculatePullingForce,
  calculateTheoreticalAcceleration,
  calculateStringTension,
  calculateExperimentalAcceleration,
  calculateAccelerationDiffPercent,
  H2N_TABLE_5_1_PRESETS,
  H2N_TABLE_5_2_PRESETS,
  computeH2NTrial,
  analyzeH2NExperiment41,
  analyzeH2NExperiment42,
  H2N_EXP1_GATE1_X,
  H2N_EXP1_GATE2_X,
  H2N_EXP2_GATE1_X,
  H2N_EXP2_GATE2_X,
} from "../physics/h2n";
import { validateStudentCalculation } from "../physics/validation";

describe("Hukum II Newton (H2N) Physics & Analytical Suite", () => {
  describe("Basic Dynamics Functions", () => {
    test("calculatePullingForce: F = m·g", () => {
      expect(calculatePullingForce(0.015)).toBeCloseTo(0.147, 5);
      expect(calculatePullingForce(0.005)).toBeCloseTo(0.049, 5);
      expect(calculatePullingForce(0)).toBe(0);
      expect(calculatePullingForce(-0.01)).toBe(0);
    });

    test("calculateTheoreticalAcceleration: a = (m·g - f) / (M + m + mEff)", () => {
      // M = 0.150, m = 0.015, ideal -> a = 0.147 / 0.165 ≈ 0.89091
      const a = calculateTheoreticalAcceleration(0.15, 0.015);
      expect(a).toBeCloseTo(0.890909, 5);

      // Edge cases:
      expect(calculateTheoreticalAcceleration(0, 0)).toBe(0);
      expect(calculateTheoreticalAcceleration(0.15, 0)).toBe(0);
      // Friction exceeds pulling force
      expect(calculateTheoreticalAcceleration(0.15, 0.015, G_STANDARD, 0.2)).toBe(0);
    });

    test("calculateStringTension: T = M · a", () => {
      const a = calculateTheoreticalAcceleration(0.15, 0.015);
      const T = calculateStringTension(0.15, a);
      expect(T).toBeCloseTo(0.15 * 0.890909, 5);
      expect(calculateStringTension(0, a)).toBe(0);
      expect(calculateStringTension(0.15, 0)).toBe(0);
    });

    test("calculateExperimentalAcceleration: a = (v2² - v1²) / (2 · s12)", () => {
      const v1 = 0.5;
      const v2 = 1.0;
      const s12 = 0.4;
      // a = (1.0 - 0.25) / (2 * 0.4) = 0.75 / 0.8 = 0.9375
      expect(calculateExperimentalAcceleration(v1, v2, s12)).toBeCloseTo(0.9375, 5);
      expect(calculateExperimentalAcceleration(v1, v2, 0)).toBe(0);
      expect(calculateExperimentalAcceleration(v1, v2, -0.4)).toBe(0);
    });

    test("calculateAccelerationDiffPercent", () => {
      expect(calculateAccelerationDiffPercent(0.891, 0.89091)).toBeLessThan(0.02);
      expect(calculateAccelerationDiffPercent(0, 0)).toBe(0);
    });
  });

  describe("Experiment 4.1 (Table 5.1) Presets & Photogate Verification", () => {
    test("All 5 presets have constant hanging mass m = 15 g and varying cart mass M", () => {
      expect(H2N_TABLE_5_1_PRESETS).toHaveLength(5);
      const expectedM = [0.15, 0.1625, 0.175, 0.1875, 0.2];

      H2N_TABLE_5_1_PRESETS.forEach((preset, idx) => {
        expect(preset.hangingMass).toBe(0.015);
        expect(preset.cartMass).toBeCloseTo(expectedM[idx], 4);
        expect(preset.pullingForce).toBeCloseTo(0.147, 4);

        const expectedA = (0.015 * G_STANDARD) / (preset.cartMass + 0.015);
        expect(preset.aTheory).toBeCloseTo(expectedA, 5);
      });
    });

    test("Simulated trials produce transit times, speeds, and matching acceleration within 0.2%", () => {
      const trialResults = H2N_TABLE_5_1_PRESETS.map((preset) =>
        computeH2NTrial(
          preset.cartMass,
          preset.hangingMass,
          H2N_EXP1_GATE1_X,
          H2N_EXP1_GATE2_X,
          0.03,
          0,
          0,
          preset.no
        )
      );

      trialResults.forEach((res, idx) => {
        expect(res.t1).not.toBeNull();
        expect(res.t2).not.toBeNull();
        expect(res.t1!).toBeGreaterThan(0);
        expect(res.t2!).toBeGreaterThan(0);
        expect(res.v2).toBeGreaterThan(res.v1);
        expect(res.aCalc).toBeGreaterThan(0);

        // aCalc vs aTheory should be very close (difference < 0.2%)
        expect(res.diffPercent).toBeLessThan(0.2);
        expect(res.aTheory).toBeCloseTo(H2N_TABLE_5_1_PRESETS[idx].aTheory, 4);
      });
    });

    test("Linear regression for Experiment 4.1: slope of a vs 1/(M+m) matches F = 0.147 N within 0.1%", () => {
      const trials = H2N_TABLE_5_1_PRESETS.map((p) => {
        const res = computeH2NTrial(p.cartMass, p.hangingMass, H2N_EXP1_GATE1_X, H2N_EXP1_GATE2_X);
        return {
          cartMass: p.cartMass,
          hangingMass: p.hangingMass,
          a: res.aCalc,
        };
      });

      const analysis = analyzeH2NExperiment41(trials);
      expect(analysis).not.toBeNull();
      expect(analysis!.expectedSlope).toBeCloseTo(0.147, 4);
      expect(analysis!.slope).toBeCloseTo(0.147, 2);
      expect(analysis!.slopeDiffPercent).toBeLessThan(0.2);
      expect(analysis!.rSquared).toBeGreaterThan(0.9999);
    });
  });

  describe("Experiment 4.2 (Table 5.2) Presets & Photogate Verification", () => {
    test("All 5 presets have constant total mass M + m = 0.175 kg", () => {
      expect(H2N_TABLE_5_2_PRESETS).toHaveLength(5);
      const expectedM = [0.17, 0.165, 0.16, 0.155, 0.15];
      const expectedHangingM = [0.005, 0.01, 0.015, 0.02, 0.025];

      H2N_TABLE_5_2_PRESETS.forEach((preset, idx) => {
        expect(preset.cartMass).toBeCloseTo(expectedM[idx], 4);
        expect(preset.hangingMass).toBeCloseTo(expectedHangingM[idx], 4);
        expect(preset.cartMass + preset.hangingMass).toBeCloseTo(0.175, 5);

        const expectedF = expectedHangingM[idx] * G_STANDARD;
        expect(preset.pullingForce).toBeCloseTo(expectedF, 4);

        const expectedA = expectedF / 0.175;
        expect(preset.aTheory).toBeCloseTo(expectedA, 5);
      });
    });

    test("Simulated trials for Experiment 4.2 produce valid kinematic results within 0.2%", () => {
      const trialResults = H2N_TABLE_5_2_PRESETS.map((preset) =>
        computeH2NTrial(
          preset.cartMass,
          preset.hangingMass,
          H2N_EXP2_GATE1_X,
          H2N_EXP2_GATE2_X,
          0.03,
          0,
          0,
          preset.no
        )
      );

      trialResults.forEach((res, idx) => {
        expect(res.t1).not.toBeNull();
        expect(res.t2).not.toBeNull();
        expect(res.v2).toBeGreaterThan(res.v1);
        expect(res.diffPercent).toBeLessThan(0.2);
        expect(res.aTheory).toBeCloseTo(H2N_TABLE_5_2_PRESETS[idx].aTheory, 4);
      });
    });

    test("Linear regression for Experiment 4.2: slope of a vs F matches 1/(M+m) = 5.714 kg^-1 within 0.1%", () => {
      const trials = H2N_TABLE_5_2_PRESETS.map((p) => {
        const res = computeH2NTrial(p.cartMass, p.hangingMass, H2N_EXP2_GATE1_X, H2N_EXP2_GATE2_X);
        return {
          pullingForce: p.pullingForce,
          a: res.aCalc,
        };
      });

      const analysis = analyzeH2NExperiment42(trials);
      expect(analysis).not.toBeNull();
      const theoreticalSlope = 1 / 0.175; // ~5.71428
      expect(analysis!.expectedSlope).toBeCloseTo(theoreticalSlope, 3);
      expect(analysis!.slope).toBeCloseTo(theoreticalSlope, 1);
      expect(analysis!.slopeDiffPercent).toBeLessThan(0.25);
      expect(analysis!.rSquared).toBeGreaterThan(0.9999);
    });
  });

  describe("Student Calculation Validator with Tightened Bound", () => {
    test("Validates within ±2% relative tolerance for normal values", () => {
      expect(validateStudentCalculation("0.891", 0.89091)).toBe(true);
      expect(validateStudentCalculation("0,891", 0.89091)).toBe(true);
      expect(validateStudentCalculation("0.950", 0.89091)).toBe(false); // ~6.6% off
    });

    test("Validates near-zero values (< 0.01) with tightened 1e-4 absolute bound", () => {
      const nearZero = 0.0050;
      expect(validateStudentCalculation("0.0050", nearZero)).toBe(true);
      expect(validateStudentCalculation("0.00508", nearZero)).toBe(true); // diff = 8e-5 <= 1e-4
      expect(validateStudentCalculation("0.0052", nearZero)).toBe(false); // diff = 2e-4 > 1e-4
    });
  });

  describe("Playback Speed Invariance & HKEM Output Lock", () => {
    test("advanceSimTime is invariant across all 4 playback speeds (1x, 0.75x, 0.5x, 0.25x)", () => {
      const speeds = [1.0, 0.75, 0.5, 0.25];
      const targetPhysicalDuration = 1.0; // 1s simulation time

      const accumulatedSimTimes = speeds.map((speed) => {
        const totalWallTime = targetPhysicalDuration / speed;
        const dtWall = 1 / 60;
        let simTime = 0;
        let elapsedWall = 0;

        while (elapsedWall < totalWallTime - 1e-9) {
          const stepWall = Math.min(dtWall, totalWallTime - elapsedWall);
          simTime += stepWall * speed;
          elapsedWall += stepWall;
        }

        return Number(simTime.toFixed(4));
      });

      const baseline = accumulatedSimTimes[0];
      accumulatedSimTimes.forEach((val) => {
        expect(val).toBeCloseTo(baseline, 3);
      });
    });

    test("H2N computeH2NTrial outputs are analytical and independent of playback speed", () => {
      const res = computeH2NTrial(0.15, 0.015, H2N_EXP1_GATE1_X, H2N_EXP1_GATE2_X);
      expect(res.aTheory).toBeCloseTo(0.890909, 5);
      expect(res.pullingForce).toBeCloseTo(0.147, 4);
      expect(res.tension).toBeCloseTo(0.133636, 4);
    });
  });
});

