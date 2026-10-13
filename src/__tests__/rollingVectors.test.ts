import { getRollingVectors, calculateRollingAcceleration } from "@/physics/rollingMotion";

describe("Physics - getRollingVectors", () => {
  const g = 9.8;
  const mass = 0.5; // 500g
  const r = 0.05; // 5cm
  const rInner = 0.03; // 3cm

  test("Gaya Normal sama persis dengan w * cos(theta)", () => {
    [10, 20, 30, 45].forEach((thetaDeg) => {
      const vecSolid = getRollingVectors({ shape: "solid", thetaDeg, mass, r, g });
      const thetaRad = (thetaDeg * Math.PI) / 180;
      const expectedN = mass * g * Math.cos(thetaRad);

      expect(vecSolid.N).toBeCloseTo(expectedN, 6);
      expect(vecSolid.wPerpendicular).toBeCloseTo(expectedN, 6);
      expect(vecSolid.w).toBeCloseTo(mass * g, 6);
    });
  });

  test("Hukum II Newton terpenuhi sepanjang bidang miring: w*sin(theta) - f = m*a", () => {
    [15, 30, 45].forEach((thetaDeg) => {
      const vecSolid = getRollingVectors({ shape: "solid", thetaDeg, mass, r, g });
      const vecHollow = getRollingVectors({ shape: "hollow", thetaDeg, mass, r, rInner, g });

      // Solid cylinder
      expect(vecSolid.wParallel - vecSolid.f).toBeCloseTo(mass * vecSolid.a, 6);

      // Hollow cylinder
      expect(vecHollow.wParallel - vecHollow.f).toBeCloseTo(mass * vecHollow.a, 6);
    });
  });

  test("a = g*sin(theta) / (1 + I/(m*r^2)) untuk silinder pejal dan berongga (a_pejal > a_berongga)", () => {
    const thetaDeg = 30;
    const thetaRad = (thetaDeg * Math.PI) / 180;

    const vecSolid = getRollingVectors({ shape: "solid", thetaDeg, mass, r, g });
    const vecHollow = getRollingVectors({ shape: "hollow", thetaDeg, mass, r, rInner, g });

    // a = g * sin(theta) / (1 + 0.5) = (2/3) * g * sin(theta) for solid
    const expectedASolid = (g * Math.sin(thetaRad)) / (1 + 0.5);
    expect(vecSolid.a).toBeCloseTo(expectedASolid, 6);

    // a for hollow cylinder has higher moment of inertia factor, so smaller linear acceleration
    const hollowFactor = 0.5 * (1 + Math.pow(rInner / r, 2));
    const expectedAHollow = (g * Math.sin(thetaRad)) / (1 + hollowFactor);
    expect(vecHollow.a).toBeCloseTo(expectedAHollow, 6);

    expect(vecSolid.a).toBeGreaterThan(vecHollow.a);
  });

  test("Gaya gesek statis f >= 0 dan bertindak menahan (arah sejajar bidang ke atas)", () => {
    [10, 25, 40].forEach((thetaDeg) => {
      const vecSolid = getRollingVectors({ shape: "solid", thetaDeg, mass, r, g });
      const vecHollow = getRollingVectors({ shape: "hollow", thetaDeg, mass, r, rInner, g });

      expect(vecSolid.f).toBeGreaterThan(0);
      expect(vecHollow.f).toBeGreaterThan(0);

      // f_hollow > f_solid because higher rotational inertia requires more torque to roll
      expect(vecHollow.f).toBeGreaterThan(vecSolid.f);
    });
  });

  test("Balok meluncur tanpa gesekan memiliki f = 0 dan a = g * sin(theta)", () => {
    const thetaDeg = 30;
    const thetaRad = (thetaDeg * Math.PI) / 180;
    const vecBlock = getRollingVectors({ shape: "block", thetaDeg, mass, r, g });

    expect(vecBlock.f).toBeCloseTo(0, 6);
    expect(vecBlock.a).toBeCloseTo(g * Math.sin(thetaRad), 6);
    expect(vecBlock.wParallel).toBeCloseTo(mass * vecBlock.a, 6);
  });
});
