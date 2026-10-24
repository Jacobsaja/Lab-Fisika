import {
  G_STANDARD,
  systemAcceleration,
  coastingDeceleration,
  stringTensions,
  velocityAtPosition,
  timeToReachPosition,
  gateTransitTime,
  measuredVelocity,
  motionStateAtTime,
  timeAtPosition,
  gateTransitTimeTwoPhase,
  kineticEnergy,
  potentialEnergy,
  mechanicalEnergy,
  hangingHeight,
  energyDifference,
  energyDifferencePercent,
  computeAirTrackTrial,
  energyAtState,
} from "@/physics/airTrackPulleySystem";

describe("airTrackPulleySystem physics engine", () => {
  describe("systemAcceleration and dynamics", () => {
    test("computes ideal acceleration a = m*g / (M + m)", () => {
      const M = 0.15; // 150g
      const m = 0.015; // 15g
      const expectedA = (m * G_STANDARD) / (M + m);
      const a = systemAcceleration({ cartMass: M, hangingMass: m });
      expect(a).toBeCloseTo(expectedA, 6);
    });

    test("includes friction and pulley effective mass", () => {
      const M = 0.15;
      const m = 0.015;
      const f = 0.02; // 0.02 N friction
      const mEff = 0.005; // 5g effective pulley inertia
      const expectedA = (m * G_STANDARD - f) / (M + m + mEff);
      const a = systemAcceleration({
        cartMass: M,
        hangingMass: m,
        frictionForce: f,
        pulleyEffectiveMass: mEff,
      });
      expect(a).toBeCloseTo(expectedA, 6);
    });

    test("returns 0 when friction exceeds driving force or when masses are 0", () => {
      expect(systemAcceleration({ cartMass: 0.15, hangingMass: 0 })).toBe(0);
      expect(systemAcceleration({ cartMass: 0, hangingMass: 0 })).toBe(0);
      expect(
        systemAcceleration({
          cartMass: 0.15,
          hangingMass: 0.01,
          frictionForce: 10, // larger than m*g
        })
      ).toBe(0);
    });

    test("handles edge cases gracefully without NaN or Infinity", () => {
      expect(systemAcceleration({ cartMass: -0.15, hangingMass: -0.01 })).toBe(0);
      expect(systemAcceleration({ cartMass: NaN, hangingMass: Infinity })).toBe(0);
      expect(coastingDeceleration({ cartMass: 0, hangingMass: 0, frictionForce: 0.01 })).toBe(0);
      expect(velocityAtPosition(-1, 0.5)).toBe(0);
      expect(velocityAtPosition(1, -0.5)).toBe(0);
      expect(timeToReachPosition(0, 0.5)).toBeNull();
      expect(timeToReachPosition(1, -0.5)).toBe(0);
    });
  });

  describe("string tensions", () => {
    test("tensions are equal when system is ideal", () => {
      const M = 0.15;
      const m = 0.02;
      const { cartSide, hangingSide } = stringTensions({ cartMass: M, hangingMass: m });
      expect(cartSide).toBeCloseTo(hangingSide, 6);
      expect(cartSide).toBeGreaterThan(0);
      expect(cartSide).toBeLessThan(m * G_STANDARD);
    });

    test("static tension equals m*g when cart cannot move", () => {
      const { cartSide, hangingSide } = stringTensions({
        cartMass: 0.15,
        hangingMass: 0.02,
        frictionForce: 10,
      });
      expect(cartSide).toBeCloseTo(0.02 * G_STANDARD, 6);
      expect(hangingSide).toBeCloseTo(0.02 * G_STANDARD, 6);
    });
  });

  describe("kinematics and photogate transit time", () => {
    test("kinematic consistency v^2 = 2 * a * x", () => {
      const a = 1.2;
      const x1 = 0.3;
      const x2 = 0.8;
      const v1 = velocityAtPosition(a, x1);
      const v2 = velocityAtPosition(a, x2);
      const dist = x2 - x1;
      expect(v2 * v2).toBeCloseTo(v1 * v1 + 2 * a * dist, 6);
    });

    test("gate transit time matches difference of arrival times", () => {
      const a = 0.89;
      const xGate = 0.4;
      const w = 0.03; // 3 cm
      const tIn = Math.sqrt((2 * xGate) / a);
      const tOut = Math.sqrt((2 * (xGate + w)) / a);
      const dtExpected = tOut - tIn;

      const dt = gateTransitTime(a, xGate, w);
      expect(dt).not.toBeNull();
      expect(dt!).toBeCloseTo(dtExpected, 8);
    });

    test("measured velocity w/dt is very close to instantaneous velocity at gate midpoint", () => {
      const a = 0.89;
      const xGate = 0.4;
      const w = 0.03;
      const dt = gateTransitTime(a, xGate, w)!;
      const vMeas = measuredVelocity(w, dt);
      const vMid = velocityAtPosition(a, xGate + w / 2);
      // Average transit velocity should approximate midpoint velocity within 0.1%
      expect(Math.abs(vMeas - vMid) / vMid).toBeLessThan(0.001);
    });
  });

  describe("energies and conservation in ideal system", () => {
    test("mechanical energy is conserved in ideal case (instantaneous speeds)", () => {
      const M = 0.15;
      const m = 0.015;
      const H0 = 0.8;
      const x1 = 0.2;
      const x2 = 0.6;
      const a = systemAcceleration({ cartMass: M, hangingMass: m });

      const h1 = hangingHeight(H0, x1);
      const h2 = hangingHeight(H0, x2);

      const v1True = velocityAtPosition(a, x1);
      const v2True = velocityAtPosition(a, x2);

      const em1True = kineticEnergy(M, m, v1True) + potentialEnergy(m, h1);
      const em2True = kineticEnergy(M, m, v2True) + potentialEnergy(m, h2);

      expect(em2True).toBeCloseTo(em1True, 7);
    });

    test("photogate measured energy difference is minimal (<0.5%) due to transit averaging", () => {
      const params = { cartMass: 0.15, hangingMass: 0.015 };
      const geometry = { dropHeight: 0.85, railTravel: 1.2 };
      const gates = { gate1Position: 0.25, gate2Position: 0.7, flagWidth: 0.03 };

      const trial = computeAirTrackTrial(params, geometry, gates);
      expect(trial.t1).not.toBeNull();
      expect(trial.t2).not.toBeNull();
      expect(trial.v2).toBeGreaterThan(trial.v1);
      expect(trial.ek2).toBeGreaterThan(trial.ek1);
      expect(trial.ep2).toBeLessThan(trial.ep1);

      // In ideal case, EM1 and EM2 should differ by less than 0.5% because of w/t averaging
      expect(Math.abs(trial.differencePercent)).toBeLessThan(0.5);
    });

    test("friction reduces mechanical energy (EM2 < EM1)", () => {
      const params = {
        cartMass: 0.15,
        hangingMass: 0.015,
        frictionForce: 0.02,
      };
      const geometry = { dropHeight: 0.85, railTravel: 1.2 };
      const gates = { gate1Position: 0.25, gate2Position: 0.7, flagWidth: 0.03 };

      const trial = computeAirTrackTrial(params, geometry, gates);
      expect(trial.difference).toBeGreaterThan(0);
      expect(trial.differencePercent).toBeGreaterThan(0);
      expect(trial.em2).toBeLessThan(trial.em1);
    });
  });

  describe("5 combinations of (M, m) from laboratory manual Table 6.1", () => {
    const trials = [
      { M: 0.15, m: 0.005 },
      { M: 0.15, m: 0.01 },
      { M: 0.15, m: 0.015 },
      { M: 0.15, m: 0.02 },
      { M: 0.1625, m: 0.015 }, // M + 12.5g
    ];

    test.each(trials)("runs trial with M=$M kg and m=$m kg correctly", ({ M, m }) => {
      const geometry = { dropHeight: 0.8, railTravel: 1.2 };
      const gates = { gate1Position: 0.3, gate2Position: 0.65, flagWidth: 0.03 };

      const res = computeAirTrackTrial({ cartMass: M, hangingMass: m }, geometry, gates);

      expect(res.acceleration).toBeGreaterThan(0);
      expect(res.t1).toBeGreaterThan(0);
      expect(res.t2).toBeGreaterThan(0);
      expect(res.t2!).toBeLessThan(res.t1!); // speed increases, so transit time decreases
      expect(res.v2).toBeGreaterThan(res.v1);
      expect(res.ek1).toBeGreaterThan(0);
      expect(res.ek2).toBeGreaterThan(res.ek1);
      expect(res.ep1).toBeGreaterThan(res.ep2);
      expect(Math.abs(res.differencePercent)).toBeLessThan(0.5);
    });
  });

  describe("two-phase motion simulation", () => {
    test("accelerates until dropHeight then coasts with friction", () => {
      const params = { cartMass: 0.15, hangingMass: 0.015, frictionForce: 0.01 };
      const geometry = { dropHeight: 0.5, railTravel: 1.2 };
      const a1 = systemAcceleration(params);
      const tLand = Math.sqrt((2 * geometry.dropHeight) / a1);

      const beforeLanding = motionStateAtTime(params, geometry, tLand * 0.5);
      expect(beforeLanding.phase).toBe("accelerating");
      expect(beforeLanding.a).toBeCloseTo(a1, 6);

      const afterLanding = motionStateAtTime(params, geometry, tLand + 0.3);
      expect(afterLanding.phase).toBe("coasting");
      expect(afterLanding.x).toBeGreaterThan(geometry.dropHeight);
      expect(afterLanding.a).toBeLessThan(0); // deceleration
    });

    test("energyAtState calculates instantaneous energy", () => {
      const params = { cartMass: 0.15, hangingMass: 0.015 };
      const geometry = { dropHeight: 0.5, railTravel: 1.2 };
      const state = { t: 0.5, x: 0.2, v: 0.6, a: 0.89, phase: "accelerating" as const };
      const e = energyAtState(params, geometry, state);
      expect(e.ek).toBeGreaterThan(0);
      expect(e.ep).toBeGreaterThan(0);
      expect(e.em).toBe(e.ek + e.ep);
    });
  });
});
