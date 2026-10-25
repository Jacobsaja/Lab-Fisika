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
  validateHkemCalculation,
  advanceSimTime,
  photogateEventTimes,
  photogateReadingsAtTime,
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

  describe("validateHkemCalculation", () => {
    const truth = 0.4092;

    test("accepts exact correct answers (with period and comma)", () => {
      expect(validateHkemCalculation("0.4092", truth)).toBe(true);
      expect(validateHkemCalculation("0,4092", truth)).toBe(true);
    });

    test("accepts reasonable 3-significant-figure rounding within ±2%", () => {
      // 0.409 vs 0.4092 has error 0.048% <= 2%
      expect(validateHkemCalculation("0.409", truth)).toBe(true);
      expect(validateHkemCalculation("0,409", truth)).toBe(true);
      // Other standard trials:
      // v2 = 1.0885 -> 1.089 (error 0.046%)
      expect(validateHkemCalculation("1.089", 1.0885)).toBe(true);
      // EM = 0.11979 -> 0.120 (error 0.175%)
      expect(validateHkemCalculation("0.120", 0.11979)).toBe(true);
    });

    test("rejects answers that are 5% off (exceeding ±2% tolerance)", () => {
      const fivePercentHigh = (truth * 1.05).toFixed(4); // 0.4297
      const fivePercentLow = (truth * 0.95).toFixed(4); // 0.3887
      expect(validateHkemCalculation(fivePercentHigh, truth)).toBe(false);
      expect(validateHkemCalculation(fivePercentLow, truth)).toBe(false);
    });

    test("rejects empty and whitespace-only entries", () => {
      expect(validateHkemCalculation("", truth)).toBe(false);
      expect(validateHkemCalculation("   ", truth)).toBe(false);
    });

    test("rejects non-numeric and malformed entries", () => {
      expect(validateHkemCalculation("abc", truth)).toBe(false);
      expect(validateHkemCalculation("0.40m/s", truth)).toBe(false);
      expect(validateHkemCalculation("NaN", truth)).toBe(false);
      expect(validateHkemCalculation("undefined", truth)).toBe(false);
    });

    test("evaluates near-zero values using small absolute bound", () => {
      const nearZeroTruth = 0.00735; // EP2 for m = 5 g at h2 = 0.15 m
      // Exactly 3 sig figs: 0.00735 or reasonable rounding: 0.0074 (|diff| = 0.00005 <= 0.0015)
      expect(validateHkemCalculation("0.00735", nearZeroTruth)).toBe(true);
      expect(validateHkemCalculation("0.0074", nearZeroTruth)).toBe(true);
      // Distant value (|diff| = 0.00265 > 0.0015)
      expect(validateHkemCalculation("0.0100", nearZeroTruth)).toBe(false);
    });
  });

  describe("playback speed invariance & analytical photogate readings", () => {
    test("advanceSimTime scales simulation time at 1x, 0.75x, 0.5x, 0.25x", () => {
      const wallDt = 0.016; // ~60fps
      expect(advanceSimTime(1.0, wallDt, 1.0)).toBeCloseTo(1.016, 6);
      expect(advanceSimTime(1.0, wallDt, 0.75)).toBeCloseTo(1.012, 6);
      expect(advanceSimTime(1.0, wallDt, 0.5)).toBeCloseTo(1.008, 6);
      expect(advanceSimTime(1.0, wallDt, 0.25)).toBeCloseTo(1.004, 6);

      // Clamps lag spikes to maxWallDt (default 0.05s)
      expect(advanceSimTime(1.0, 1.0, 1.0)).toBeCloseTo(1.05, 6);
      // Fallback for invalid speed
      expect(advanceSimTime(1.0, wallDt, 0)).toBeCloseTo(1.016, 6);
    });

    test("photogateReadingsAtTime and computeAirTrackTrial yield identical readings across all 4 speeds", () => {
      const params = { cartMass: 0.15, hangingMass: 0.015 };
      const geometry = { dropHeight: 0.8, railTravel: 1.2 };
      const gates = { gate1Position: 0.3, gate2Position: 0.65, flagWidth: 0.03 };

      const trial = computeAirTrackTrial(params, geometry, gates);
      const events = photogateEventTimes(params, geometry, gates);
      expect(events.gate1Out).not.toBeNull();
      expect(events.gate2Out).not.toBeNull();

      const speeds = [1.0, 0.75, 0.5, 0.25];

      for (const speed of speeds) {
        let simTime = 0;
        let finalReadings = photogateReadingsAtTime(params, geometry, gates, 0, events);
        const wallDt = 0.016; // wall clock frame delta

        // Step through until past gate 2
        while (simTime < (events.gate2Out ?? 0) + 0.1) {
          simTime = advanceSimTime(simTime, wallDt, speed);
          const r = photogateReadingsAtTime(params, geometry, gates, simTime, events);
          if (r.t2 !== null) {
            finalReadings = r;
            break;
          }
        }

        // Must match analytical computeAirTrackTrial exactly regardless of speed
        expect(finalReadings.t1).toBeCloseTo(trial.t1!, 6);
        expect(finalReadings.t2).toBeCloseTo(trial.t2!, 6);
        expect(finalReadings.t12).toBeCloseTo(trial.t12!, 6);
      }
    });

    test("trial calculation (Table 6.1 and 6.2) is strictly independent of playback speed", () => {
      const params = { cartMass: 0.15, hangingMass: 0.015 };
      const geometry = { dropHeight: 0.8, railTravel: 1.2 };
      const gates = { gate1Position: 0.3, gate2Position: 0.65, flagWidth: 0.03 };

      // computeAirTrackTrial does not take speed as an argument; physics is pure and deterministic
      const trial1 = computeAirTrackTrial(params, geometry, gates);
      const trial2 = computeAirTrackTrial(params, geometry, gates);
      expect(trial1.t1).toBe(trial2.t1);
      expect(trial1.v1).toBe(trial2.v1);
      expect(trial1.v2).toBe(trial2.v2);
      expect(trial1.ek1).toBe(trial2.ek1);
      expect(trial1.ep1).toBe(trial2.ep1);
      expect(trial1.em1).toBe(trial2.em1);
      expect(trial1.differencePercent).toBe(trial2.differencePercent);
    });
  });
});

