import {
  calculateRollingAcceleration,
  CylinderShape,
  generateSensorSample,
  sensorNoiseSeed,
  SENSOR_NOISE_STD,
  SENSOR_SAMPLE_INTERVAL_S,
} from "../physics/rollingMotion";

describe("rollingMotion", () => {
  const g = 9.8;
  const r = 0.05;
  const rInner = 0.04;

  it("calculates solid cylinder correctly at 14 degrees", () => {
    const a = calculateRollingAcceleration("solid", 14, r, 0, g);
    // a = g * sin(14) / 1.5
    const expected = (g * Math.sin((14 * Math.PI) / 180)) / 1.5;
    expect(a).toBeCloseTo(expected, 4);
    expect(a).toBeCloseTo(1.58, 2);
  });

  it("calculates solid cylinder correctly at 22 degrees", () => {
    const a = calculateRollingAcceleration("solid", 22, r, 0, g);
    const expected = (g * Math.sin((22 * Math.PI) / 180)) / 1.5;
    expect(a).toBeCloseTo(expected, 4);
    expect(a).toBeCloseTo(2.45, 2);
  });

  it("calculates hollow cylinder correctly", () => {
    // k = 0.5 * (1 + (Ri/Ro)^2)
    const k = 0.5 * (1 + Math.pow(rInner / r, 2));
    const a = calculateRollingAcceleration("hollow", 14, r, rInner, g);
    const expected = (g * Math.sin((14 * Math.PI) / 180)) / (1 + k);
    expect(a).toBeCloseTo(expected, 4);
  });

  it("limits to k=1 for thin ring (Ri -> Ro)", () => {
    const a = calculateRollingAcceleration("hollow", 14, r, r - 0.0001, g);
    // thin ring k -> 1, so a = g * sin(14) / 2
    const expected = (g * Math.sin((14 * Math.PI) / 180)) / 2;
    expect(a).toBeCloseTo(expected, 2);
  });

  it("gives a=0 when theta=0", () => {
    expect(calculateRollingAcceleration("solid", 0, r, 0, g)).toBeCloseTo(0, 5);
    expect(calculateRollingAcceleration("hollow", 0, r, rInner, g)).toBeCloseTo(0, 5);
    expect(calculateRollingAcceleration("block", 0, r, 0, g)).toBeCloseTo(0, 5);
  });

  it("handles Ri=0 for hollow cylinder by behaving like solid", () => {
    // If Ri=0, hollow should evaluate to same as solid (k=0.5)
    const aSolid = calculateRollingAcceleration("solid", 14, r, 0, g);
    const aHollowZeroRi = calculateRollingAcceleration("hollow", 14, r, 0, g);
    expect(aSolid).toBeCloseTo(aHollowZeroRi, 5);
  });

  it("I round-trip: compute a from I, then I from a", () => {
    const m = 1.0;
    const R = 0.05;
    const theta = 14;
    const a = calculateRollingAcceleration("solid", theta, R, 0, g);
    
    // Reverse engineer I from a:
    // a = g * sin(theta) / (1 + I/(m*R^2))
    // 1 + I/(m*R^2) = (g * sin(theta)) / a
    // I = m * R^2 * ((g * sin(theta) / a) - 1)
    
    const computedI = m * Math.pow(R, 2) * ((g * Math.sin((theta * Math.PI) / 180) / a) - 1);
    
    // True I for solid is 0.5 * m * R^2
    const trueI = 0.5 * m * Math.pow(R, 2);
    expect(computedI).toBeCloseTo(trueI, 5);
  });
});

describe("rollingMotion — deterministic sensor noise", () => {
  const g = 9.8;
  const r = 0.05;
  const rInner = 0.04;
  const indices = Array.from({ length: 30 }, (_, i) => i + 1);
  const series = (shape: CylinderShape, theta: number, a: number) =>
    indices.map((i) => generateSensorSample(shape, theta, i, a, r));

  it("seed formula depends only on shape, angle, sample index and channel", () => {
    // seed = shapeCode·1e7 + round(θ·10)·1e4 + index·10 + channelOffset
    expect(sensorNoiseSeed("solid", 14, 5, "v")).toBe(1 * 1e7 + 140 * 1e4 + 50 + 1);
    expect(sensorNoiseSeed("hollow", 22, 0, "s")).toBe(2 * 1e7 + 220 * 1e4 + 0 + 0);
    expect(sensorNoiseSeed("solid", 14, 5, "omega")).toBe(1 * 1e7 + 140 * 1e4 + 50 + 2);
  });

  it("same inputs give identical samples (and never call Math.random / clocks)", () => {
    const randomSpy = jest.spyOn(Math, "random");
    const dateSpy = jest.spyOn(Date, "now");
    const a = calculateRollingAcceleration("solid", 14, r, 0, g);
    const first = series("solid", 14, a);
    const second = series("solid", 14, a);
    expect(second).toEqual(first);
    expect(randomSpy).not.toHaveBeenCalled();
    expect(dateSpy).not.toHaveBeenCalled();
    randomSpy.mockRestore();
    dateSpy.mockRestore();
  });

  it("samples sit on the fixed time grid t = index · interval", () => {
    const a = calculateRollingAcceleration("solid", 14, r, 0, g);
    series("solid", 14, a).forEach((s, k) => {
      expect(s.t).toBeCloseTo(indices[k] * SENSOR_SAMPLE_INTERVAL_S, 12);
    });
  });

  it("different angle gives different samples", () => {
    const a = calculateRollingAcceleration("solid", 14, r, 0, g);
    // Same a on purpose: only the seed (angle) differs.
    const noise14 = series("solid", 14, a).map((s) => s.v - a * s.t);
    const noise22 = series("solid", 22, a).map((s) => s.v - a * s.t);
    expect(noise22).not.toEqual(noise14);
  });

  it("different shape gives different samples", () => {
    const a = calculateRollingAcceleration("solid", 14, r, 0, g);
    const solidNoise = series("solid", 14, a).map((s) => s.v - a * s.t);
    const hollowNoise = series("hollow", 14, a).map((s) => s.v - a * s.t);
    expect(hollowNoise).not.toEqual(solidNoise);
  });

  it("a_theory is unchanged by noise; noise offset is independent of a", () => {
    const before = calculateRollingAcceleration("hollow", 22, r, rInner, g);
    const samples = series("hollow", 22, before);
    const after = calculateRollingAcceleration("hollow", 22, r, rInner, g);
    expect(after).toBe(before);

    const offsetsA = samples.map((s) => s.v - before * s.t);
    const offsetsB = series("hollow", 22, before * 2).map((s) => s.v - before * 2 * s.t);
    offsetsA.forEach((o, k) => expect(offsetsB[k]).toBeCloseTo(o, 10));
  });

  it("noise is bounded and roughly zero-mean (amplitude sanity)", () => {
    const a = calculateRollingAcceleration("solid", 14, r, 0, g);
    const offsets = series("solid", 14, a).map((s) => s.v - a * s.t);
    offsets.forEach((o) => expect(Math.abs(o)).toBeLessThan(6 * SENSOR_NOISE_STD.v));
    const mean = offsets.reduce((p, q) => p + q, 0) / offsets.length;
    expect(Math.abs(mean)).toBeLessThan(2 * SENSOR_NOISE_STD.v);
  });
});
