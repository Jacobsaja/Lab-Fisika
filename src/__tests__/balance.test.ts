import { calculateOhausBalance, BALANCE_TOLERANCE_G } from "../physics/balance";

describe("calculateOhausBalance", () => {
  it("Kasus Tepat Seimbang: Massa benda sama persis dengan total massa slider", () => {
    const sliders = { topGrams: 0, middleGrams: 10, bottomGrams: 5.5 };
    const objectMass = 15.5;

    const result = calculateOhausBalance(sliders, objectMass);

    expect(result.totalSliderMass).toBe(15.5);
    expect(result.difference).toBe(0);
    expect(result.isBalanced).toBe(true);
    expect(result.pointerDeflection).toBe(0);
  });

  it("Kasus Dalam Toleransi (Tidak Nol Persis): Selisih masih di bawah threshold", () => {
    const sliders = { topGrams: 0, middleGrams: 20, bottomGrams: 3.12 }; // Total 23.12
    const objectMass = 23.15; // Selisih = 0.03 (masih <= 0.05)

    const result = calculateOhausBalance(sliders, objectMass);

    expect(result.totalSliderMass).toBe(23.12);
    expect(Math.abs(result.difference)).toBeCloseTo(0.03);
    expect(result.isBalanced).toBe(true);
    expect(result.pointerDeflection).toBeGreaterThan(0); // Jarum sedikit di atas
  });

  it("Kasus Di Luar Toleransi: Selisih tipis tapi melebihi threshold", () => {
    const sliders = { topGrams: 0, middleGrams: 20, bottomGrams: 3.12 }; // Total 23.12
    const objectMass = 23.18; // Selisih = 0.06 (melebihi 0.05)

    const result = calculateOhausBalance(sliders, objectMass);

    expect(result.totalSliderMass).toBe(23.12);
    expect(Math.abs(result.difference)).toBeCloseTo(0.06);
    expect(result.isBalanced).toBe(false); // Karena 0.06 > 0.05
  });

  it("Kasus Overshoot (Slider Lebih Berat): Jarum anjlok ke bawah", () => {
    const sliders = { topGrams: 100, middleGrams: 0, bottomGrams: 0 };
    const objectMass = 23.15; // Jauh lebih ringan dari slider

    const result = calculateOhausBalance(sliders, objectMass);

    expect(result.totalSliderMass).toBe(100);
    expect(result.difference).toBe(23.15 - 100);
    expect(result.isBalanced).toBe(false);
    expect(result.pointerDeflection).toBe(-1); // Pegged down
  });

  it("Kasus Jauh Dari Seimbang (Benda Jauh Lebih Berat): Jarum mentok atas", () => {
    const sliders = { topGrams: 0, middleGrams: 0, bottomGrams: 0 };
    const objectMass = 350.0;

    const result = calculateOhausBalance(sliders, objectMass);

    expect(result.totalSliderMass).toBe(0);
    expect(result.difference).toBe(350.0);
    expect(result.isBalanced).toBe(false);
    expect(result.pointerDeflection).toBe(1); // Pegged up
  });

  it("Kasus Awal (objectMass = 0, slider = 0): Neraca kosong dan seimbang", () => {
    const sliders = { topGrams: 0, middleGrams: 0, bottomGrams: 0 };
    const objectMass = 0;

    const result = calculateOhausBalance(sliders, objectMass);

    expect(result.totalSliderMass).toBe(0);
    expect(result.difference).toBe(0);
    expect(result.isBalanced).toBe(true);
    expect(result.pointerDeflection).toBe(0);
  });
});
