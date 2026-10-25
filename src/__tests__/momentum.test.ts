import {
  momentum,
  velocityFromGate,
  gateTimeFromVelocity,
  totalMomentum,
  kineticEnergy,
  totalKineticEnergy,
  energyLossRatio,
  restitutionCoefficient,
  solve1DCollision,
  getModulCaseTheory,
  simulateModulTrial,
  calculateKSR,
  createMulberry32,
  createInitialHkmState,
  stepHkm,
  advanceHkmSimulation,
  DEFAULT_HKM_FIXED_DT,
  HkmSimulationConfig,
} from "../physics/momentum/momentum";

describe("Linear Momentum Physics Core", () => {
  describe("Basic definitions", () => {
    it("calculates momentum p = m * v correctly", () => {
      expect(momentum(0.15, 0.4)).toBeCloseTo(0.06, 6);
      expect(momentum(0.2, 0)).toBe(0);
      expect(momentum(0.1, -0.5)).toBeCloseTo(-0.05, 6);
    });

    it("calculates velocity from photogate transit time", () => {
      const flagWidth = 0.03; // 3 cm
      const time = 0.075; // 75 ms
      expect(velocityFromGate(flagWidth, time)).toBeCloseTo(0.4, 6);
      expect(velocityFromGate(flagWidth, 0)).toBe(0);
      expect(velocityFromGate(flagWidth, -0.1)).toBe(0);
    });

    it("calculates gate time from velocity", () => {
      const flagWidth = 0.03;
      expect(gateTimeFromVelocity(flagWidth, 0.5)).toBeCloseTo(0.06, 6);
      expect(gateTimeFromVelocity(flagWidth, -0.5)).toBeCloseTo(0.06, 6);
      expect(gateTimeFromVelocity(flagWidth, 0)).toBeNull();
    });

    it("calculates total momentum of multi-body systems", () => {
      const items = [
        { mass: 0.15, velocity: 0.5 },
        { mass: 0.2, velocity: -0.2 },
      ];
      // 0.15*0.5 + 0.2*(-0.2) = 0.075 - 0.04 = 0.035
      expect(totalMomentum(items)).toBeCloseTo(0.035, 6);
    });

    it("calculates kinetic energy and total kinetic energy", () => {
      expect(kineticEnergy(0.2, 0.5)).toBeCloseTo(0.025, 6);
      const items = [
        { mass: 0.2, velocity: 0.5 },
        { mass: 0.1, velocity: 0.4 },
      ];
      // 0.5*0.2*0.25 + 0.5*0.1*0.16 = 0.025 + 0.008 = 0.033
      expect(totalKineticEnergy(items)).toBeCloseTo(0.033, 6);
    });

    it("calculates energy loss ratio", () => {
      expect(energyLossRatio(0.1, 0.05)).toBeCloseTo(0.5, 6);
      expect(energyLossRatio(0.1, 0.1)).toBe(0);
      expect(energyLossRatio(0, 0)).toBe(0);
    });

    it("calculates restitution coefficient", () => {
      // vA = 1, vB = 0, vA' = 0, vB' = 1 -> e = -(0-1)/(1-0) = 1
      expect(restitutionCoefficient(1, 0, 0, 1)).toBeCloseTo(1.0, 6);
      // vA = 1, vB = 0, vA' = 0.5, vB' = 0.5 -> e = -(0.5-0.5)/(1-0) = 0
      expect(restitutionCoefficient(1, 0, 0.5, 0.5)).toBeCloseTo(0.0, 6);
    });
  });

  describe("solve1DCollision - Conservation and Restitution", () => {
    it("conserves linear momentum in elastic collisions (e = 1)", () => {
      const res = solve1DCollision(0.15, 0.25, 0.6, -0.3, 1.0);
      expect(res.pTotalFinal).toBeCloseTo(res.pTotalInitial, 6);
      expect(res.eKFinal).toBeCloseTo(res.eKInitial, 6);
      expect(res.eKLoss).toBeCloseTo(0, 6);
      expect(res.restitution).toBe(1.0);
    });

    it("conserves linear momentum in inelastic collisions (0 < e < 1)", () => {
      const res = solve1DCollision(0.2, 0.15, 0.5, 0, 0.6);
      expect(res.pTotalFinal).toBeCloseTo(res.pTotalInitial, 6);
      expect(res.eKFinal).toBeLessThan(res.eKInitial);
      expect(res.eKLossRatio).toBeGreaterThan(0);
    });

    it("conserves momentum and sets vA' = vB' in perfectly inelastic collisions (e = 0)", () => {
      const res = solve1DCollision(0.15, 0.2, 0.4, 0, 0.0);
      expect(res.pTotalFinal).toBeCloseTo(res.pTotalInitial, 6);
      expect(res.vAPrime).toBeCloseTo(res.vBPrime, 6);
      expect(res.restitution).toBe(0.0);
      // Theoretical common velocity: (0.15 * 0.4) / (0.15 + 0.2) = 0.06 / 0.35 ≈ 0.171428
      expect(res.vAPrime).toBeCloseTo(0.06 / 0.35, 6);
    });

    it("handles boundary cases: equal mass, stationary target (vB = 0)", () => {
      const res = solve1DCollision(0.15, 0.15, 0.5, 0, 1.0);
      expect(res.vAPrime).toBeCloseTo(0, 6);
      expect(res.vBPrime).toBeCloseTo(0.5, 6);
    });

    it("handles extreme mass difference: mA >> mB", () => {
      const res = solve1DCollision(1000, 0.1, 1.0, 0, 1.0);
      // Cart A barely slows down, Cart B shoots forward at ~2*vA
      expect(res.vAPrime).toBeCloseTo(1.0, 2);
      expect(res.vBPrime).toBeCloseTo(2.0, 2);
    });

    it("handles extreme mass difference: mA << mB", () => {
      const res = solve1DCollision(0.1, 1000, 1.0, 0, 1.0);
      // Cart A bounces backward at ~-vA, Cart B barely moves
      expect(res.vAPrime).toBeCloseTo(-1.0, 2);
      expect(res.vBPrime).toBeCloseTo(0.0, 2);
    });
  });

  describe("Modul 7 Theoretical Cases (Tabel 7.9)", () => {
    const baseMass = 0.15; // m = 150g
    const addedMass = 0.05; // M = 50g
    const vA = 0.4; // 0.4 m/s

    it("Case A: mA = mB, lenting, vB = 0 -> vB' = vA, vA' = 0", () => {
      const theory = getModulCaseTheory({
        caseId: "A",
        baseMass,
        addedMass,
        vA,
        flagWidth: 0.03,
      });

      expect(theory.mA).toBe(baseMass);
      expect(theory.mB).toBe(baseMass);
      expect(theory.vAPrime).toBeCloseTo(0, 6);
      expect(theory.vBPrime).toBeCloseTo(vA, 6);
      expect(theory.restitution).toBe(1.0);
      expect(theory.hasP22).toBe(false); // Cart A stops, no P22 pulse
    });

    it("Case B: mA != mB (mA = m + M, mB = m), lenting, vB = 0 -> vB' = vA + vA' - vB", () => {
      const theory = getModulCaseTheory({
        caseId: "B",
        baseMass,
        addedMass,
        vA,
        flagWidth: 0.03,
      });

      expect(theory.mA).toBe(baseMass + addedMass);
      expect(theory.mB).toBe(baseMass);
      expect(theory.restitution).toBe(1.0);

      // Verify formula in modul: vB' = vA + vA' - vB
      expect(theory.vBPrime).toBeCloseTo(theory.vA + theory.vAPrime - theory.vB, 6);

      // Verify specific analytical formula: vA' = (M / (2m + M)) * vA
      const expectedVAPrime = (addedMass / (2 * baseMass + addedMass)) * vA;
      expect(theory.vAPrime).toBeCloseTo(expectedVAPrime, 6);

      // Cart A moves forward (vA' > 0) so it also passes Gate 2
      expect(theory.vAPrime).toBeGreaterThan(0);
      expect(theory.hasP22).toBe(true);
    });

    it("Case C: mA = mB, tidak lenting -> vA' = vB' = vA / 2", () => {
      const theory = getModulCaseTheory({
        caseId: "C",
        baseMass,
        addedMass,
        vA,
        flagWidth: 0.03,
      });

      expect(theory.mA).toBe(baseMass);
      expect(theory.mB).toBe(baseMass);
      expect(theory.restitution).toBe(0.0);
      expect(theory.vAPrime).toBeCloseTo(vA / 2, 6);
      expect(theory.vBPrime).toBeCloseTo(vA / 2, 6);
      expect(theory.hasP22).toBe(true);
    });

    it("Case D: mA != mB (mA = m + M, mB = m), tidak lenting -> vA' = vB' = (m + M) vA / (2m + M)", () => {
      const theory = getModulCaseTheory({
        caseId: "D",
        baseMass,
        addedMass,
        vA,
        flagWidth: 0.03,
      });

      expect(theory.mA).toBe(baseMass + addedMass);
      expect(theory.mB).toBe(baseMass);
      expect(theory.restitution).toBe(0.0);

      const expectedVPrime = ((baseMass + addedMass) * vA) / (2 * baseMass + addedMass);
      expect(theory.vAPrime).toBeCloseTo(expectedVPrime, 6);
      expect(theory.vBPrime).toBeCloseTo(expectedVPrime, 6);
      expect(theory.hasP22).toBe(true);
    });
  });

  describe("Deterministic simulation trials & noise", () => {
    it("produces repeatable results given the same session seed and trial index", () => {
      const params = {
        caseId: "B" as const,
        baseMass: 0.15,
        addedMass: 0.05,
        vA: 0.4,
        flagWidth: 0.03,
      };

      const trial1A = simulateModulTrial(params, 1, 12345);
      const trial1B = simulateModulTrial(params, 1, 12345);
      const trial2 = simulateModulTrial(params, 2, 12345);

      expect(trial1A).toEqual(trial1B);
      expect(trial1A.p11).not.toEqual(trial2.p11);
    });

    it("Case A has p22 as null", () => {
      const params = {
        caseId: "A" as const,
        baseMass: 0.15,
        addedMass: 0.05,
        vA: 0.4,
        flagWidth: 0.03,
      };
      const trial = simulateModulTrial(params, 1, 999);
      expect(trial.p22).toBeNull();
      expect(trial.vAPrime).toBe(0);
    });

    it("Case B has valid numeric p22", () => {
      const params = {
        caseId: "B" as const,
        baseMass: 0.15,
        addedMass: 0.05,
        vA: 0.4,
        flagWidth: 0.03,
      };
      const trial = simulateModulTrial(params, 1, 999);
      expect(trial.p22).not.toBeNull();
      expect(typeof trial.p22).toBe("number");
      expect(trial.vAPrime).toBeGreaterThan(0);
    });

    it("calculates KSR correctly", () => {
      expect(calculateKSR(100, 98)).toBeCloseTo(2.0, 4);
      expect(calculateKSR(0.5, 0.5)).toBeCloseTo(0, 4);
      expect(calculateKSR(0, 0)).toBe(0);
    });
  });

  describe("Fixed-step substepping & playback speed invariance", () => {
    const baseConfig: HkmSimulationConfig = {
      effectiveMA: 0.20, // 200g
      effectiveMB: 0.15, // 150g
      restitution: 1.0, // Elastic (Case B) -> Cart A continues moving (P22)
      launchSpeed: 0.42,
      compressorOn: true,
      hasP22Expected: true,
    };

    it("yields 100% identical photogate readings P11, P21, P22 across all 4 playback speeds", () => {
      const speeds = [1.0, 0.75, 0.5, 0.25];
      const results: { p11: number | null; p21: number | null; p22: number | null }[] = [];

      for (const speed of speeds) {
        let state = createInitialHkmState(baseConfig);
        let acc = 0;
        const frameDt = 0.016; // 60 fps frame delta

        // Run until state is completed or 20s sim time
        while (!state.completed && state.t < 15) {
          const stepRes = advanceHkmSimulation(state, baseConfig, frameDt, speed, acc, DEFAULT_HKM_FIXED_DT);
          state = stepRes.state;
          acc = stepRes.accumulator;
        }

        expect(state.p11).not.toBeNull();
        expect(state.p21).not.toBeNull();
        expect(state.p22).not.toBeNull();

        results.push({
          p11: state.p11,
          p21: state.p21,
          p22: state.p22,
        });
      }

      // Check all 4 speeds give exactly the same gate readings down to microsecond precision
      const baseline = results[0];
      for (let i = 1; i < results.length; i++) {
        expect(results[i].p11).toBeCloseTo(baseline.p11!, 5);
        expect(results[i].p21).toBeCloseTo(baseline.p21!, 5);
        expect(results[i].p22).toBeCloseTo(baseline.p22!, 5);
      }
    });

    it("yields identical photogate readings independent of frame render rate (30 fps vs 60 fps vs 120 fps)", () => {
      const frameRates = [
        1 / 30, // 30 fps
        1 / 60, // 60 fps
        1 / 120, // 120 fps
      ];
      const results: { p11: number | null; p21: number | null; p22: number | null }[] = [];

      for (const frameDt of frameRates) {
        let state = createInitialHkmState(baseConfig);
        let acc = 0;

        while (!state.completed && state.t < 15) {
          const stepRes = advanceHkmSimulation(state, baseConfig, frameDt, 1.0, acc, DEFAULT_HKM_FIXED_DT);
          state = stepRes.state;
          acc = stepRes.accumulator;
        }

        results.push({
          p11: state.p11,
          p21: state.p21,
          p22: state.p22,
        });
      }

      const baseline = results[0];
      for (let i = 1; i < results.length; i++) {
        expect(results[i].p11).toBeCloseTo(baseline.p11!, 4);
        expect(results[i].p21).toBeCloseTo(baseline.p21!, 4);
        expect(results[i].p22).toBeCloseTo(baseline.p22!, 4);
      }
    });

    it("prevents tunneling and double collisions across extreme velocities", () => {
      const launchSpeeds = [0.2, 0.5, 0.8, 1.2];

      for (const v0 of launchSpeeds) {
        const config: HkmSimulationConfig = {
          ...baseConfig,
          launchSpeed: v0,
          restitution: 0.8,
        };

        let state = createInitialHkmState(config);
        let acc = 0;
        let collisionCount = 0;

        while (!state.completed && state.t < 10) {
          const prevState = state;
          const stepRes = advanceHkmSimulation(state, config, 0.016, 1.0, acc, DEFAULT_HKM_FIXED_DT);
          state = stepRes.state;
          acc = stepRes.accumulator;

          if (!prevState.collided && state.collided) {
            collisionCount++;
          }
        }

        // Must collide exactly once
        expect(collisionCount).toBe(1);
        expect(state.p11).toBeGreaterThan(0);
        expect(state.p21).toBeGreaterThan(0);
      }
    });

    it("supports perfectly inelastic collisions (e = 0, Case C/D) without cart overlap", () => {
      const inelasticConfig: HkmSimulationConfig = {
        effectiveMA: 0.15,
        effectiveMB: 0.15,
        restitution: 0.0,
        launchSpeed: 0.40,
        compressorOn: true,
        hasP22Expected: true,
      };

      let state = createInitialHkmState(inelasticConfig);
      let acc = 0;

      while (!state.completed && state.t < 10) {
        const stepRes = advanceHkmSimulation(state, inelasticConfig, 0.016, 1.0, acc, DEFAULT_HKM_FIXED_DT);
        state = stepRes.state;
        acc = stepRes.accumulator;

        // After collision, carts must move with equal velocity and stick together
        if (state.collided) {
          expect(state.vA).toBeCloseTo(state.vB, 4);
          expect(state.xB - state.xA).toBeCloseTo(0.12, 4); // cart length = 0.12 m
        }
      }

      expect(state.p11).not.toBeNull();
      expect(state.p21).not.toBeNull();
      expect(state.p22).not.toBeNull();
    });

    it("validates student question hkm-q4 expected theoretical value (v' = 0.2286 ± 0.015 m/s)", () => {
      const q4Theory = getModulCaseTheory({
        caseId: "D",
        baseMass: 0.150,
        addedMass: 0.050,
        vA: 0.400,
        flagWidth: 0.03,
      });

      expect(q4Theory.vAPrime).toBeCloseTo(0.2286, 3);
      expect(q4Theory.vBPrime).toBeCloseTo(0.2286, 3);
      expect(Math.abs(q4Theory.vAPrime - 0.2286)).toBeLessThanOrEqual(0.015);
    });
  });
});

