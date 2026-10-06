import {
  TWO_PI,
  periodFromOmega,
  frequencyFromOmega,
  frequencyFromPeriod,
  periodFromFrequency,
  omegaFromPeriod,
  omegaFromFrequency,
  angleAt,
  normalizeAngle,
  positionAt,
  tangentialSpeed,
  velocityAt,
  centripetalAcceleration,
  centripetalFromSpeed,
  accelerationAt,
  revolutionCount,
  completedRevolutions,
  computeSnapshot,
  deriveFromMeasurement,
  isStopNearTarget,
  circularMotionModel,
} from "../physics/circularMotion";
import { worldToSvg, arcPath, clampVectorLength } from "../components/simulation/svgGeometry";

const dot = (a: { x: number; y: number }, b: { x: number; y: number }) => a.x * b.x + a.y * b.y;
const mag = (a: { x: number; y: number }) => Math.hypot(a.x, a.y);

describe("Uniform Circular Motion physics", () => {
  describe("ω / T / f conversions", () => {
    it("T = 2π/ω and f = ω/2π", () => {
      expect(periodFromOmega(Math.PI)).toBeCloseTo(2, 10);
      expect(frequencyFromOmega(Math.PI)).toBeCloseTo(0.5, 10);
    });

    it("round-trips ω → T → f → ω", () => {
      const omega = 3.7;
      const T = periodFromOmega(omega);
      const f = frequencyFromPeriod(T);
      expect(omegaFromFrequency(f)).toBeCloseTo(omega, 10);
      expect(omegaFromPeriod(T)).toBeCloseTo(omega, 10);
      expect(periodFromFrequency(f)).toBeCloseTo(T, 10);
      expect(f * T).toBeCloseTo(1, 12);
    });

    it("ω = 0 gives T = ∞ and f = 0", () => {
      expect(periodFromOmega(0)).toBe(Infinity);
      expect(frequencyFromOmega(0)).toBe(0);
      expect(frequencyFromPeriod(Infinity)).toBe(0);
      expect(omegaFromPeriod(Infinity)).toBe(0);
      expect(periodFromFrequency(0)).toBe(Infinity);
    });

    it("negative ω uses magnitude for T and f", () => {
      expect(periodFromOmega(-Math.PI)).toBeCloseTo(2, 10);
      expect(frequencyFromOmega(-Math.PI)).toBeCloseTo(0.5, 10);
    });

    it("rejects invalid period/frequency", () => {
      expect(() => frequencyFromPeriod(0)).toThrow();
      expect(() => omegaFromPeriod(-1)).toThrow();
      expect(() => omegaFromFrequency(-1)).toThrow();
      expect(() => periodFromOmega(NaN)).toThrow();
    });
  });

  describe("speed and centripetal acceleration", () => {
    it("v = ωr and a_c = ω²r = v²/r", () => {
      const omega = 4;
      const r = 0.5;
      const v = tangentialSpeed(omega, r);
      expect(v).toBeCloseTo(2, 12);
      expect(centripetalAcceleration(omega, r)).toBeCloseTo(8, 12);
      expect(centripetalFromSpeed(v, r)).toBeCloseTo(8, 12);
    });

    it("r doubled at the same ω doubles a_c", () => {
      expect(centripetalAcceleration(3, 1.2) / centripetalAcceleration(3, 0.6)).toBeCloseTo(2, 12);
    });

    it("negative ω gives positive speed and acceleration magnitudes", () => {
      expect(tangentialSpeed(-4, 0.5)).toBeCloseTo(2, 12);
      expect(centripetalAcceleration(-4, 0.5)).toBeCloseTo(8, 12);
    });

    it("edge cases: ω = 0 and r = 0", () => {
      expect(tangentialSpeed(0, 1)).toBe(0);
      expect(centripetalAcceleration(0, 1)).toBe(0);
      expect(tangentialSpeed(5, 0)).toBe(0);
      expect(centripetalAcceleration(5, 0)).toBe(0);
      expect(centripetalFromSpeed(0, 0)).toBe(0);
    });

    it("rejects negative radius", () => {
      expect(() => tangentialSpeed(1, -1)).toThrow(/non-negative/);
      expect(() => positionAt(-1, 0)).toThrow();
    });
  });

  describe("positions at key angles", () => {
    const r = 2;
    it.each([
      [0, 2, 0],
      [Math.PI / 2, 0, 2],
      [Math.PI, -2, 0],
      [2 * Math.PI, 2, 0],
    ])("θ = %p → (%p, %p)", (theta, x, y) => {
      const p = positionAt(r, theta);
      expect(p.x).toBeCloseTo(x, 10);
      expect(p.y).toBeCloseTo(y, 10);
    });

    it("θ(t) = θ0 + ωt", () => {
      expect(angleAt(0.5, 2, 3)).toBeCloseTo(6.5, 12);
      expect(angleAt(0.5, -2, 3)).toBeCloseTo(-5.5, 12);
    });

    it("normalizeAngle wraps into [0, 2π)", () => {
      expect(normalizeAngle(-Math.PI / 2)).toBeCloseTo(1.5 * Math.PI, 12);
      expect(normalizeAngle(5 * Math.PI)).toBeCloseTo(Math.PI, 12);
      expect(normalizeAngle(0)).toBe(0);
    });
  });

  describe("vectors", () => {
    it("velocity is tangent (⊥ radius) with magnitude ωr", () => {
      const r = 1.5, omega = 2.2, theta = 0.9;
      const p = positionAt(r, theta);
      const v = velocityAt(r, omega, theta);
      expect(dot(p, v)).toBeCloseTo(0, 10);
      expect(mag(v)).toBeCloseTo(omega * r, 10);
    });

    it("at θ = 0 with ω > 0 velocity points +y (CCW); with ω < 0 it points -y", () => {
      expect(velocityAt(1, 2, 0).y).toBeCloseTo(2, 12);
      expect(velocityAt(1, -2, 0).y).toBeCloseTo(-2, 12);
    });

    it("acceleration points toward the center with magnitude ω²r", () => {
      const r = 1.5, omega = 2.2, theta = 2.1;
      const p = positionAt(r, theta);
      const a = accelerationAt(r, omega, theta);
      // a is antiparallel to position
      expect(dot(p, a) / (mag(p) * mag(a))).toBeCloseTo(-1, 10);
      expect(mag(a)).toBeCloseTo(omega * omega * r, 10);
    });
  });

  describe("revolutions and periodicity", () => {
    it("counts revolutions as |ω|t/2π", () => {
      const omega = TWO_PI / 1.6; // T = 1.6 s
      expect(revolutionCount(omega, 4.8)).toBeCloseTo(3, 10);
      expect(revolutionCount(-omega, 4.8)).toBeCloseTo(3, 10);
      expect(completedRevolutions(omega, 4.79)).toBe(2);
      expect(completedRevolutions(omega, 4.8)).toBe(3);
      expect(revolutionCount(0, 100)).toBe(0);
    });

    it("state repeats after one period", () => {
      const params = { r: 0.8, omega: 2.5, theta0: 0.3 };
      const T = periodFromOmega(params.omega);
      const s0 = computeSnapshot(params, 1.1);
      const s1 = computeSnapshot(params, 1.1 + T);
      expect(s1.position.x).toBeCloseTo(s0.position.x, 10);
      expect(s1.position.y).toBeCloseTo(s0.position.y, 10);
      expect(s1.velocity.x).toBeCloseTo(s0.velocity.x, 10);
      expect(s1.acceleration.y).toBeCloseTo(s0.acceleration.y, 10);
      expect(s1.revolutions - s0.revolutions).toBeCloseTo(1, 10);
    });

    it("ω = 0 keeps the particle at θ0", () => {
      const s = computeSnapshot({ r: 1, omega: 0, theta0: Math.PI / 2 }, 10);
      expect(s.position.x).toBeCloseTo(0, 12);
      expect(s.position.y).toBeCloseTo(1, 12);
      expect(s.speed).toBe(0);
      expect(s.period).toBe(Infinity);
    });

    it("r = 0 keeps the particle at the center", () => {
      const s = computeSnapshot({ r: 0, omega: 3, theta0: 0 }, 2);
      expect(mag(s.position)).toBe(0);
      expect(s.centripetal).toBe(0);
    });
  });

  describe("deriveFromMeasurement", () => {
    it("derives T, f, ω, v, a_c from measured t for N revolutions", () => {
      const d = deriveFromMeasurement(0.5, 5, 8);
      expect(d.T).toBeCloseTo(1.6, 12);
      expect(d.f).toBeCloseTo(0.625, 12);
      expect(d.omega).toBeCloseTo(TWO_PI / 1.6, 12);
      expect(d.v).toBeCloseTo((TWO_PI / 1.6) * 0.5, 12);
      expect(d.a_c).toBeCloseTo((TWO_PI / 1.6) ** 2 * 0.5, 12);
    });

    it("rejects invalid N or t", () => {
      expect(() => deriveFromMeasurement(0.5, 0, 8)).toThrow();
      expect(() => deriveFromMeasurement(0.5, 5, 0)).toThrow();
    });

    it("isStopNearTarget accepts stops within ±0.25 rev only", () => {
      expect(isStopNearTarget(3.1, 3)).toBe(true);
      expect(isStopNearTarget(2.8, 3)).toBe(true);
      expect(isStopNearTarget(3.3, 3)).toBe(false);
      expect(isStopNearTarget(1, 0)).toBe(false);
      expect(isStopNearTarget(NaN, 3)).toBe(false);
    });
  });

  describe("circularMotionModel", () => {
    it("advances only the clock", () => {
      const params = { r: 1, omega: 1, theta0: 0 };
      let s = circularMotionModel.init(params);
      for (let i = 0; i < 60; i++) s = circularMotionModel.step(s, 1 / 60, params);
      expect(s.t).toBeCloseTo(1, 10);
    });
  });
});

describe("svgGeometry", () => {
  it("worldToSvg flips the y axis", () => {
    const view = { originX: 100, originY: 100, scale: 50 };
    expect(worldToSvg({ x: 1, y: 1 }, view)).toEqual({ x: 150, y: 50 });
  });

  it("arcPath is empty for zero sweep and valid otherwise", () => {
    expect(arcPath({ x: 0, y: 0 }, 10, 1, 1)).toBe("");
    expect(arcPath({ x: 0, y: 0 }, 10, 0, Math.PI / 2)).toMatch(/^M .* A 10 10 0 0 0 /);
  });

  it("clampVectorLength respects bounds", () => {
    expect(clampVectorLength(0, 10, 5, 50)).toBe(0);
    expect(clampVectorLength(0.1, 10, 5, 50)).toBe(5);
    expect(clampVectorLength(100, 10, 5, 50)).toBe(50);
  });
});
