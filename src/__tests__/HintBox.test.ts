import { getVisibleHintCount } from "@/components/practicum/HintBox";

describe("HintBox — hint reveal logic", () => {
  it("starts with 0 revealed hints", () => {
    expect(getVisibleHintCount(3, 0)).toBe(0);
  });

  it("reveals one hint at a time up to total", () => {
    expect(getVisibleHintCount(3, 1)).toBe(1);
    expect(getVisibleHintCount(3, 2)).toBe(2);
    expect(getVisibleHintCount(3, 3)).toBe(3);
  });

  it("does not exceed total hint count", () => {
    expect(getVisibleHintCount(3, 5)).toBe(3);
    expect(getVisibleHintCount(0, 0)).toBe(0);
    expect(getVisibleHintCount(1, 100)).toBe(1);
  });
});
