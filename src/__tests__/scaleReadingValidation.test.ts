import { readVernierCaliper } from "../physics/measurement";
import { calculateOhausBalance, OhausSliders } from "../physics/balance";

describe("Batch D Scale Reading Validation - 8 Benchmark Points", () => {
  describe("Caliper (Jangka Sorong) - 8 Reading Benchmarks", () => {
    const caliperBenchmarks = [
      { openMm: 0.0, nstMm: 0.05, expectedMain: 0, expectedVernierIndex: 0, expectedVernier: 0.0, expectedTotal: 0.0 },
      { openMm: 7.35, nstMm: 0.05, expectedMain: 7, expectedVernierIndex: 7, expectedVernier: 0.35, expectedTotal: 7.35 },
      { openMm: 15.5, nstMm: 0.05, expectedMain: 15, expectedVernierIndex: 10, expectedVernier: 0.5, expectedTotal: 15.5 },
      { openMm: 24.85, nstMm: 0.05, expectedMain: 24, expectedVernierIndex: 17, expectedVernier: 0.85, expectedTotal: 24.85 },
      { openMm: 42.1, nstMm: 0.05, expectedMain: 42, expectedVernierIndex: 2, expectedVernier: 0.1, expectedTotal: 42.1 },
      { openMm: 68.75, nstMm: 0.05, expectedMain: 68, expectedVernierIndex: 15, expectedVernier: 0.75, expectedTotal: 68.75 },
      { openMm: 105.4, nstMm: 0.05, expectedMain: 105, expectedVernierIndex: 8, expectedVernier: 0.4, expectedTotal: 105.4 },
      { openMm: 149.95, nstMm: 0.05, expectedMain: 149, expectedVernierIndex: 19, expectedVernier: 0.95, expectedTotal: 149.95 },
    ];

    test.each(caliperBenchmarks)(
      "Point openMm=$openMm (NST $nstMm): main=$expectedMain, vernier=$expectedVernier, total=$expectedTotal",
      ({ openMm, nstMm, expectedMain, expectedVernierIndex, expectedVernier, expectedTotal }) => {
        const result = readVernierCaliper(openMm, nstMm);
        expect(result.mainScaleReading).toBe(expectedMain);
        expect(result.vernierLineIndex).toBe(expectedVernierIndex);
        expect(result.vernierReading).toBeCloseTo(expectedVernier, 4);
        expect(result.totalReading).toBeCloseTo(expectedTotal, 4);
      }
    );
  });

  describe("Ohaus Balance (Neraca Ohaus 3 Lengan) - 8 Rider Combinations", () => {
    const ohausBenchmarks: Array<{
      sliders: OhausSliders;
      objectMass: number;
      expectedTotal: number;
      expectedBalanced: boolean;
    }> = [
      { sliders: { topGrams: 0, middleGrams: 0, bottomGrams: 0 }, objectMass: 0, expectedTotal: 0, expectedBalanced: true },
      { sliders: { topGrams: 20, middleGrams: 0, bottomGrams: 4.5 }, objectMass: 24.5, expectedTotal: 24.5, expectedBalanced: true },
      { sliders: { topGrams: 70, middleGrams: 100, bottomGrams: 2.3 }, objectMass: 172.3, expectedTotal: 172.3, expectedBalanced: true },
      { sliders: { topGrams: 40, middleGrams: 300, bottomGrams: 8.7 }, objectMass: 348.7, expectedTotal: 348.7, expectedBalanced: true },
      { sliders: { topGrams: 90, middleGrams: 400, bottomGrams: 6.2 }, objectMass: 496.2, expectedTotal: 496.2, expectedBalanced: true },
      { sliders: { topGrams: 10, middleGrams: 500, bottomGrams: 9.8 }, objectMass: 519.8, expectedTotal: 519.8, expectedBalanced: true },
      { sliders: { topGrams: 80, middleGrams: 200, bottomGrams: 0.4 }, objectMass: 280.4, expectedTotal: 280.4, expectedBalanced: true },
      { sliders: { topGrams: 100, middleGrams: 500, bottomGrams: 10.0 }, objectMass: 610.0, expectedTotal: 610.0, expectedBalanced: true },
    ];

    test.each(ohausBenchmarks)(
      "Point top=$sliders.topGrams, mid=$sliders.middleGrams, bot=$sliders.bottomGrams: total=$expectedTotal g",
      ({ sliders, objectMass, expectedTotal, expectedBalanced }) => {
        const result = calculateOhausBalance(sliders, objectMass);
        expect(result.totalSliderMass).toBeCloseTo(expectedTotal, 3);
        expect(result.isBalanced).toBe(expectedBalanced);
        expect(result.pointerDeflection).toBeCloseTo(0, 4);
      }
    );
  });
});
