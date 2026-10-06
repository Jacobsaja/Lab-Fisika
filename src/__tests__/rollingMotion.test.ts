import { calculateRollingAcceleration } from "../physics/rollingMotion";

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
