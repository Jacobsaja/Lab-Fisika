import { getAtwoodVectors } from "@/physics/atwood";

describe("Physics - getAtwoodVectors", () => {
  const g = 9.8;

  test("pada sistem seimbang (m1 = m2, mAdd = 0) tidak ada percepatan dan T = m*g", () => {
    const vectors = getAtwoodVectors({
      m1: 0.10,
      m2: 0.10,
      mAdd: 0,
      g,
    });

    expect(vectors.a).toBe(0);
    expect(vectors.a1).toBe(0);
    expect(vectors.a2).toBe(0);
    expect(vectors.w1).toBeCloseTo(0.10 * g, 6);
    expect(vectors.w2).toBeCloseTo(0.10 * g, 6);
    expect(vectors.T).toBeCloseTo(0.10 * g, 6);
    expect(vectors.netForceLeft).toBeCloseTo(0, 6);
    expect(vectors.netForceRight).toBeCloseTo(0, 6);
  });

  test("hukum II Newton terpenuhi: T - w1 = m1*a dan w_right - T = m_right*a", () => {
    const m1 = 0.10; // 100g
    const m2 = 0.10; // 100g
    const mAdd = 0.02; // 20g
    const mRight = m2 + mAdd; // 120g

    const vectors = getAtwoodVectors({
      m1,
      m2,
      mAdd,
      g,
    });

    // Percepatan teoritis: a = (mRight - m1)*g / (m1 + mRight)
    const expectedA = ((mRight - m1) * g) / (m1 + mRight);
    expect(vectors.a).toBeCloseTo(expectedA, 6);
    expect(vectors.a1).toBeCloseTo(expectedA, 6);
    expect(vectors.a2).toBeCloseTo(expectedA, 6);

    // Keseimbangan dinamik massa kiri: T - w1 = m1 * a
    expect(vectors.T - vectors.w1).toBeCloseTo(m1 * expectedA, 6);
    expect(vectors.netForceLeft).toBeCloseTo(m1 * expectedA, 6);

    // Keseimbangan dinamik massa kanan: w_right - T = m_right * a
    expect(vectors.wRightTotal - vectors.T).toBeCloseTo(mRight * expectedA, 6);
    expect(vectors.netForceRight).toBeCloseTo(mRight * expectedA, 6);
  });

  test("arah a berbalik ketika massa kiri lebih besar dari massa kanan", () => {
    const m1 = 0.15; // 150g (kiri lebih berat)
    const m2 = 0.10; // 100g
    const mAdd = 0;

    const vectors = getAtwoodVectors({
      m1,
      m2,
      mAdd,
      g,
    });

    // a1 negatif (m1 bergerak ke bawah), a2 negatif (m2 bergerak ke atas)
    expect(vectors.a1).toBeLessThan(0);
    expect(vectors.a2).toBeLessThan(0);
    expect(vectors.a).toBeCloseTo(Math.abs(vectors.a1), 6);

    // Keseimbangan tetap berlaku
    expect(vectors.T - vectors.w1).toBeCloseTo(m1 * vectors.a1, 6);
    expect(vectors.wRightTotal - vectors.T).toBeCloseTo(m2 * vectors.a2, 6);
  });

  test("setelah keping beban lepas di Ring B (fase GLB, m1 = m2), a = 0 dan T = m1*g", () => {
    const vectors = getAtwoodVectors({
      m1: 0.10,
      m2: 0.10,
      mAdd: 0.02,
      g,
      phase: "GLB", // Keping mAdd tertahan di Ring B
    });

    expect(vectors.a).toBe(0);
    expect(vectors.a1).toBe(0);
    expect(vectors.a2).toBe(0);
    expect(vectors.wAdd).toBe(0);
    expect(vectors.wRightTotal).toBeCloseTo(0.10 * g, 6);
    expect(vectors.T).toBeCloseTo(0.10 * g, 6);
    expect(vectors.netForceLeft).toBeCloseTo(0, 6);
    expect(vectors.netForceRight).toBeCloseTo(0, 6);
  });
});
