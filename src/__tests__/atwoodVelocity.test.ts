import { getAtwoodVelocityAt } from "@/physics/atwood";

describe("Physics - getAtwoodVelocityAt (vektor kecepatan Atwood)", () => {
  const a1 = 0.7;
  const tB = 1.2;
  const vB = a1 * tB;

  test("kecepatan nol pada t = 0", () => {
    const s = getAtwoodVelocityAt({ t: 0, tB, a1 });
    expect(s.v).toBe(0);
    expect(s.phase).toBe("DIAM");
  });

  test("fase GLBB: v = a1 · t", () => {
    const s = getAtwoodVelocityAt({ t: 0.5, tB, a1 });
    expect(s.v).toBeCloseTo(a1 * 0.5, 10);
    expect(s.phase).toBe("GLBB");
  });

  test("fase GLB (a2 = 0): kecepatan konstan = vB", () => {
    const s1 = getAtwoodVelocityAt({ t: tB + 0.3, tB, a1, vB, a2: 0 });
    const s2 = getAtwoodVelocityAt({ t: tB + 1.0, tB, a1, vB, a2: 0 });
    expect(s1.v).toBeCloseTo(vB, 10);
    expect(s2.v).toBeCloseTo(vB, 10);
    expect(s1.phase).toBe("GLB");
  });

  test("kontinu di titik B", () => {
    const before = getAtwoodVelocityAt({ t: tB, tB, a1, vB, a2: 0 });
    const after = getAtwoodVelocityAt({ t: tB + 1e-9, tB, a1, vB, a2: 0 });
    expect(after.v).toBeCloseTo(before.v, 6);
  });

  test("fase 2 dengan a2 ≠ 0: v = vB + a2 (t − tB)", () => {
    const s = getAtwoodVelocityAt({ t: tB + 0.4, tB, a1, vB, a2: 0.2 });
    expect(s.v).toBeCloseTo(vB + 0.2 * 0.4, 10);
    expect(s.phase).toBe("GLBB");
  });

  test("tali tak mulur: |v1| = |v2|", () => {
    const s = getAtwoodVelocityAt({ t: 0.9, tB, a1 });
    expect(s.v1Up).toBe(s.v2Down);
    expect(s.v1Up).toBe(s.v);
  });

  test("setelah menyentuh landasan (t ≥ tEnd): v = 0", () => {
    const s = getAtwoodVelocityAt({ t: 5, tB, a1, vB, a2: 0, tEnd: 3 });
    expect(s.v).toBe(0);
    expect(s.phase).toBe("SELESAI");
  });

  test("tidak pernah negatif dan tidak bergerak bila a1 ≤ 0", () => {
    expect(getAtwoodVelocityAt({ t: tB + 100, tB, a1, vB, a2: -0.5 }).v).toBe(0);
    expect(getAtwoodVelocityAt({ t: 1, tB: Infinity, a1: 0 }).v).toBe(0);
  });
});
