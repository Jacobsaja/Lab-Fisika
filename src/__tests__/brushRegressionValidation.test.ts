import { calculateLinearRegression } from "../physics/regression";
import { DataPoint } from "../components/simulation/LineGraph";

describe("Brush Selection & Linear Regression Equivalence Test (3 Benchmark Selections)", () => {
  // Realistic kinematics data (e.g. rolling ball v(t) or s(t) on incline)
  const sampleKinematicsData: DataPoint[] = [
    { t: 0.1, val: 0.082 },
    { t: 0.2, val: 0.179 },
    { t: 0.3, val: 0.278 },
    { t: 0.4, val: 0.381 },
    { t: 0.5, val: 0.485 },
    { t: 0.6, val: 0.589 },
    { t: 0.7, val: 0.694 },
    { t: 0.8, val: 0.798 },
    { t: 0.9, val: 0.902 },
    { t: 1.0, val: 1.008 },
  ];

  function runBrushSelection(data: DataPoint[], startT: number, endT: number) {
    const selected = data.filter((d) => d.t >= startT && d.t <= endT);
    if (selected.length < 3) return { slope: null, intercept: null, pointsCount: selected.length };
    const reg = calculateLinearRegression(selected.map((d) => ({ x: d.t, y: d.val })));
    return { slope: reg.b, intercept: reg.a, pointsCount: selected.length };
  }

  test("Selection 1: Early phase (t = 0.1 s to 0.4 s)", () => {
    const result = runBrushSelection(sampleKinematicsData, 0.1, 0.4);
    expect(result.pointsCount).toBe(4);
    expect(result.slope).toBeCloseTo(0.996, 3);
    expect(result.intercept).toBeCloseTo(-0.019, 3);
  });

  test("Selection 2: Mid phase (t = 0.3 s to 0.7 s)", () => {
    const result = runBrushSelection(sampleKinematicsData, 0.3, 0.7);
    expect(result.pointsCount).toBe(5);
    expect(result.slope).toBeCloseTo(1.040, 3);
    expect(result.intercept).toBeCloseTo(-0.035, 3);
  });

  test("Selection 3: Late phase (t = 0.5 s to 1.0 s)", () => {
    const result = runBrushSelection(sampleKinematicsData, 0.5, 1.0);
    expect(result.pointsCount).toBe(6);
    expect(result.slope).toBeCloseTo(1.045, 3);
    expect(result.intercept).toBeCloseTo(-0.038, 3);
  });
});
