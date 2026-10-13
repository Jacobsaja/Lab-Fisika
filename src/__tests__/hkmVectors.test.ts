import { getHkmVectors, solve1DCollision } from "@/physics/momentum/momentum";

describe("Physics - getHkmVectors", () => {
  test("menghitung pA, pB, dan pTotal = pA + pB dengan tepat", () => {
    const vectors = getHkmVectors({
      mA: 0.15,
      mB: 0.20,
      vA: 0.40,
      vB: -0.10,
    });

    expect(vectors.vA).toBe(0.40);
    expect(vectors.vB).toBe(-0.10);
    expect(vectors.pA).toBeCloseTo(0.15 * 0.40, 6);
    expect(vectors.pB).toBeCloseTo(0.20 * -0.10, 6);
    expect(vectors.pTotal).toBeCloseTo(vectors.pA + vectors.pB, 6);
  });

  test("p_total sebelum = sesudah (kekal) untuk tiga jenis tumbukan", () => {
    const mA = 0.15;
    const mB = 0.25;
    const vA = 0.50;
    const vB = 0.0;

    // 1. Lenting Sempurna (e = 1.0)
    const colElastic = solve1DCollision(mA, mB, vA, vB, 1.0);
    const vecBeforeElastic = getHkmVectors({ mA, mB, vA, vB });
    const vecAfterElastic = getHkmVectors({ mA, mB, vA: colElastic.vAPrime, vB: colElastic.vBPrime });
    expect(vecAfterElastic.pTotal).toBeCloseTo(vecBeforeElastic.pTotal, 6);

    // 2. Lenting Sebagian (e = 0.6)
    const colPartial = solve1DCollision(mA, mB, vA, vB, 0.6);
    const vecBeforePartial = getHkmVectors({ mA, mB, vA, vB });
    const vecAfterPartial = getHkmVectors({ mA, mB, vA: colPartial.vAPrime, vB: colPartial.vBPrime });
    expect(vecAfterPartial.pTotal).toBeCloseTo(vecBeforePartial.pTotal, 6);

    // 3. Tidak Lenting Sama Sekali (e = 0.0)
    const colInelastic = solve1DCollision(mA, mB, vA, vB, 0.0);
    const vecBeforeInelastic = getHkmVectors({ mA, mB, vA, vB });
    const vecAfterInelastic = getHkmVectors({ mA, mB, vA: colInelastic.vAPrime, vB: colInelastic.vBPrime });
    expect(vecAfterInelastic.pTotal).toBeCloseTo(vecBeforeInelastic.pTotal, 6);
  });

  test("vektor nol saat kereta berhenti (kasus lenting mA = mB, vB = 0)", () => {
    const mA = 0.15;
    const mB = 0.15;
    const vA = 0.45;
    const vB = 0.0;

    // Sebelum tumbukan: Cart B diam (vektor nol)
    const vecBefore = getHkmVectors({ mA, mB, vA, vB });
    expect(vecBefore.vB).toBe(0);
    expect(vecBefore.pB).toBe(0);

    // Sesudah tumbukan lenting sama massa: Cart A berhenti total (vA' = 0, pA' = 0)
    const col = solve1DCollision(mA, mB, vA, vB, 1.0);
    expect(col.vAPrime).toBeCloseTo(0, 6);

    const vecAfter = getHkmVectors({ mA, mB, vA: col.vAPrime, vB: col.vBPrime });
    expect(vecAfter.vA).toBeCloseTo(0, 6);
    expect(vecAfter.pA).toBeCloseTo(0, 6);
    expect(vecAfter.vB).toBeCloseTo(vA, 6);
    expect(vecAfter.pTotal).toBeCloseTo(vecBefore.pTotal, 6);
  });

  test("arah negatif (tanda minus dipertahankan) untuk kereta yang memantul", () => {
    // Cart A lebih ringan dari Cart B menabrak Cart B diam -> Cart A terpental balik (vA' < 0)
    const mA = 0.10;
    const mB = 0.30;
    const vA = 0.50;
    const vB = 0.0;

    const col = solve1DCollision(mA, mB, vA, vB, 1.0);
    expect(col.vAPrime).toBeLessThan(0); // Cart A memantul ke kiri

    const vecAfter = getHkmVectors({ mA, mB, vA: col.vAPrime, vB: col.vBPrime });
    expect(vecAfter.vA).toBeLessThan(0);
    expect(vecAfter.pA).toBeLessThan(0);
    expect(vecAfter.vB).toBeGreaterThan(0);
    expect(vecAfter.pB).toBeGreaterThan(0);
    expect(vecAfter.pTotal).toBeCloseTo(mA * vA, 6);
  });
});
