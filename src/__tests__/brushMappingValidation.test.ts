import { mapPixelToTime, mapTimeToPixel } from "../components/simulation/BrushableLineGraph";

describe("BrushableLineGraph Drag-to-Time Mapping Validation", () => {
  const graphW = 500;
  const tMin = 0.0;
  const tMax = 5.0;

  // Old implementation formula from commit before remake:
  // const ratio = px / graphW;
  // return tMin + ratio * (tMax - tMin);
  function legacyMapPixelToTime(px: number, gW: number, minT: number, maxT: number): number {
    const clampedPx = Math.max(0, Math.min(px, gW));
    const ratio = clampedPx / gW;
    return minT + ratio * (maxT - minT);
  }

  test("Drag Position 1 (Start of Graph, px = 0): produces exactly tMin", () => {
    const px = 0;
    const legacyT = legacyMapPixelToTime(px, graphW, tMin, tMax);
    const newT = mapPixelToTime(px, graphW, tMin, tMax);

    expect(newT).toBe(tMin);
    expect(newT).toBe(legacyT);
    expect(mapTimeToPixel(newT, graphW, tMin, tMax)).toBe(0);
  });

  test("Drag Position 2 (Midpoint, px = 250): produces exactly half time", () => {
    const px = 250;
    const legacyT = legacyMapPixelToTime(px, graphW, tMin, tMax);
    const newT = mapPixelToTime(px, graphW, tMin, tMax);

    expect(newT).toBe(2.5);
    expect(newT).toBe(legacyT);
    expect(mapTimeToPixel(newT, graphW, tMin, tMax)).toBe(250);
  });

  test("Drag Position 3 (End of Graph, px = 500): produces exactly tMax", () => {
    const px = 500;
    const legacyT = legacyMapPixelToTime(px, graphW, tMin, tMax);
    const newT = mapPixelToTime(px, graphW, tMin, tMax);

    expect(newT).toBe(tMax);
    expect(newT).toBe(legacyT);
    expect(mapTimeToPixel(newT, graphW, tMin, tMax)).toBe(500);
  });

  test("Quarter Point (px = 125): matches legacy exactly", () => {
    const px = 125;
    const legacyT = legacyMapPixelToTime(px, graphW, tMin, tMax);
    const newT = mapPixelToTime(px, graphW, tMin, tMax);

    expect(newT).toBe(1.25);
    expect(newT).toBe(legacyT);
    expect(mapTimeToPixel(newT, graphW, tMin, tMax)).toBe(125);
  });

  test("Clamping handles outside drag (px = -50 and px = 600)", () => {
    expect(mapPixelToTime(-50, graphW, tMin, tMax)).toBe(tMin);
    expect(mapPixelToTime(600, graphW, tMin, tMax)).toBe(tMax);
  });
});
