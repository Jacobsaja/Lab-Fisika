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
});
