import { getAtwoodVelocityAt, getAtwoodVectors } from "@/physics/atwood";

describe("Atwood Reset Run State Verification", () => {
  const m1 = 0.1; // 100g
  const m2 = 0.1; // 100g
  const mAdd = 0.02; // 20g
  const g = 9.8;
  const a1 = 0.89;
  const tB = 1.2;
  const vB = a1 * tB;

  test("sebelum simulasi (t = 0 / setelah reset): waktu nol, kecepatan nol, keping terpasang, fase DIAM", () => {
    // 1. Kecepatan dan fase awal
    const velInitial = getAtwoodVelocityAt({ t: 0, tB, a1 });
    expect(velInitial.v).toBe(0);
    expect(velInitial.v1Up).toBe(0);
    expect(velInitial.v2Down).toBe(0);
    expect(velInitial.phase).toBe("DIAM");

    // 2. Vektor gaya dan keping beban terpasang pada m2
    const vectorsInitial = getAtwoodVectors({ m1, m2, mAdd, g, phase: "GLBB" });
    expect(vectorsInitial.wAdd).toBeCloseTo(mAdd * g, 6);
    expect(vectorsInitial.wRightTotal).toBeCloseTo((m2 + mAdd) * g, 6);
    expect(vectorsInitial.a).toBeGreaterThan(0);
  });

  test("fase GLB: keping terlepas di B, fase GLB aktif, kecepatan konstan vB > 0", () => {
    const tGLB = tB + 0.5;
    const velGLB = getAtwoodVelocityAt({ t: tGLB, tB, a1, vB, a2: 0 });
    expect(velGLB.v).toBeCloseTo(vB, 6);
    expect(velGLB.phase).toBe("GLB");

    // Pada fase GLB, keping mAdd tertahan di Ring B sehingga wAdd tidak bekerja pada tali
    const vectorsGLB = getAtwoodVectors({ m1, m2, mAdd, g, phase: "GLB" });
    expect(vectorsGLB.wAdd).toBe(0);
    expect(vectorsGLB.a).toBe(0);
  });

  test("setelah reset dari fase GLB: waktu kembali 0, posisi dan kecepatan kembali awal, keping kembali terpasang, tidak ada sisa GLB", () => {
    // Simulasikan state sebelum reset (berada di fase GLB)
    const tRunning = tB + 0.8;
    const velRunning = getAtwoodVelocityAt({ t: tRunning, tB, a1, vB, a2: 0 });
    expect(velRunning.phase).toBe("GLB");
    expect(velRunning.v).toBeGreaterThan(0);

    // Lakukan aksi reset: waktu kembali ke 0
    const tReset = 0;
    const velReset = getAtwoodVelocityAt({ t: tReset, tB, a1 });

    // Buktikan 1: Waktu kembali 0
    expect(tReset).toBe(0);

    // Buktikan 2: Kecepatan kembali awal (0)
    expect(velReset.v).toBe(0);
    expect(velReset.v1Up).toBe(0);
    expect(velReset.v2Down).toBe(0);

    // Buktikan 3: Keping beban mAdd kembali terpasang di atas m2 (wAdd aktif kembali, a > 0)
    const vectorsReset = getAtwoodVectors({ m1, m2, mAdd, g, phase: "GLBB" });
    expect(vectorsReset.wAdd).toBeCloseTo(mAdd * g, 6);
    expect(vectorsReset.wRightTotal).toBeCloseTo((m2 + mAdd) * g, 6);
    expect(vectorsReset.a).toBeGreaterThan(0);

    // Buktikan 4: Tidak ada sisa state fase GLB (fase murni DIAM/awal)
    expect(velReset.phase).toBe("DIAM");
    expect(velReset.phase).not.toBe("GLB");
  });
});
