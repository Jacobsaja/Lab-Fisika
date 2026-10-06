import { calculateLinearRegression } from '../physics/regression';

describe('Linear Regression', () => {
  it('calculates slope, intercept, and r2 correctly for a known dataset', () => {
    // Dataset:
    // x: 1, 2, 3, 4, 5
    // y: 2, 4, 5, 4, 5
    // b = 0.4
    // a = 2.8
    // r2 = 0.2666666...
    const data = [
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 5 },
      { x: 4, y: 4 },
      { x: 5, y: 5 },
    ];

    const result = calculateLinearRegression(data);

    expect(result.b).toBeCloseTo(0.6, 5);
    expect(result.a).toBeCloseTo(2.2, 5);
    expect(result.r2).toBeCloseTo(0.6, 5);
    expect(result.deltaB).toBeCloseTo(0.28284, 5);
    expect(result.deltaA).toBeCloseTo(0.93808, 5);
    expect(result.tk).toBeCloseTo(52.86, 2);
  });
});
