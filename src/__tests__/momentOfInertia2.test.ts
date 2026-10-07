import {
  FALLBACK_I0,
  FALLBACK_T0,
  getBodyTheoryInertia,
  getPredictedPeriodWithBody,
  calculateMeasuredInertia,
  calculateInertiaKSR,
  simulatePracticumFiveOscillations,
  generateSensorNoiseSeed
} from "@/physics/momentOfInertia2";

describe("Moment Of Inertia II (MI 2) Physics", () => {
  const i0 = 0.01;
  const kappa = 0.04;
  const T0 = Math.PI; // ≈ 3.14159...

  it("hand-checked case: solid sphere m=1, R=0.1", () => {
    const I = getBodyTheoryInertia({ shape: "solid-sphere", massKg: 1, radiusM: 0.1 });
    expect(I).toBeCloseTo(0.004, 5);

    const T = getPredictedPeriodWithBody(i0, kappa, I);
    expect(T).toBeCloseTo(3.717, 3); // ~3.717

    const ratioSquared = (T * T) / (T0 * T0);
    expect(ratioSquared).toBeCloseTo(1.4, 4);

    const I_measured = calculateMeasuredInertia(T, T0, i0);
    expect(I_measured).toBeCloseTo(0.004, 5);
  });

  it("hand-checked case: solid cylinder m=1, R=0.1", () => {
    const I = getBodyTheoryInertia({ shape: "solid-cylinder", massKg: 1, radiusM: 0.1 });
    expect(I).toBeCloseTo(0.005, 5);

    const T = getPredictedPeriodWithBody(i0, kappa, I);
    expect(T).toBeCloseTo(3.848, 3); // ~3.848
  });

  it("returns T0 when body inertia approaches 0", () => {
    const T = getPredictedPeriodWithBody(i0, kappa, 0);
    expect(T).toBeCloseTo(T0, 5);
  });

  it("calculates KSR = 0 for exact match", () => {
    const ksr = calculateInertiaKSR(0.004, 0.004);
    expect(ksr).toBe(0);
  });

  it("generates deterministic seeded noise", () => {
    const s1 = simulatePracticumFiveOscillations(i0, kappa, 0.004, 1, "solid-sphere");
    const s2 = simulatePracticumFiveOscillations(i0, kappa, 0.004, 1, "solid-sphere");
    const s3 = simulatePracticumFiveOscillations(i0, kappa, 0.004, 2, "solid-sphere"); // diff trial
    expect(s1).toBe(s2);
    expect(s1).not.toBe(s3);
  });
});
