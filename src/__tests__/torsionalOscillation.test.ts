
import {
  rodInertia,
  loadInertia,
  totalInertia,
  angularFrequency,
  period,
  angleAt,
  averagePeriod,
  relativeError
} from '../physics/torsionalOscillation';

describe('Torsional Oscillation Engine', () => {
  it('rodInertia calculates correctly and converts cm to m', () => {
    // mass = 0.12 kg, length = 100 cm (1m) => I = 1/12 * 0.12 * 1^2 = 0.01 kg m^2
    expect(rodInertia(0.12, 100)).toBeCloseTo(0.01, 5);
    // Edge cases
    expect(rodInertia(-1, 100)).toBe(0);
    expect(rodInertia(1, -100)).toBe(0);
    expect(rodInertia(0, 100)).toBe(0);
  });

  it('loadInertia calculates correctly and converts cm to m', () => {
    // m1 = 0.1 kg, m2 = 0.1 kg, r = 50 cm (0.5m) => I = (0.2) * 0.25 = 0.05 kg m^2
    expect(loadInertia(0.1, 0.1, 50)).toBeCloseTo(0.05, 5);
    // Edge cases
    expect(loadInertia(-1, 0.1, 50)).toBe(0);
    expect(loadInertia(0.1, -1, 50)).toBe(0);
    expect(loadInertia(0.1, 0.1, -50)).toBe(0);
  });

  it('totalInertia sums properly', () => {
    expect(totalInertia(0.01, 0.02, 0.03)).toBeCloseTo(0.06, 5);
    expect(totalInertia(-0.1, -0.1, -0.1)).toBe(0); // Cannot be negative
  });

  it('angularFrequency and period', () => {
    const I = 0.5;
    const kappa = 2; // I = 0.5, kappa = 2 => omega = sqrt(4) = 2 rad/s
    expect(angularFrequency(I, kappa)).toBeCloseTo(2, 5);
    expect(period(I, kappa)).toBeCloseTo(Math.PI, 5); // T = 2PI/2 = PI

    // Edge cases
    expect(angularFrequency(0, 2)).toBe(0);
    expect(angularFrequency(0.5, 0)).toBe(0);
    expect(period(-1, 2)).toBe(Infinity);
    expect(period(0.5, -2)).toBe(Infinity);
  });

  it('angleAt computes correct angle', () => {
    // A = 2, omega = PI, t = 1, phi = 0 => cos(PI) = -1 => -2
    expect(angleAt(1, 2, Math.PI, 0)).toBeCloseTo(-2, 5);
    // With phase
    expect(angleAt(0, 2, Math.PI, Math.PI/2)).toBeCloseTo(0, 5); // cos(PI/2) = 0
  });

  it('averagePeriod logic', () => {
    // 5T times: [10, 10, 10] => mean(5T) = 10. T = 10/5 = 2.
    expect(averagePeriod([10, 10, 10])).toBeCloseTo(2, 5);
    expect(averagePeriod([9.8, 10, 10.2])).toBeCloseTo(2, 5);
    expect(averagePeriod([])).toBe(0);
  });

  it('relativeError logic', () => {
    expect(relativeError(10, 9)).toBeCloseTo(10, 5);
    expect(relativeError(10, 11)).toBeCloseTo(10, 5);
    expect(relativeError(0, 10)).toBe(0);
  });
});
