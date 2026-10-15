import { SCIENTIFIC_THEME } from "@/components/simulation/visual/tokens";

describe("SCIENTIFIC_THEME Vector Tokens", () => {
  // Convert hex color to HSL
  function hexToHsl(hex: string): { h: number; s: number; l: number } {
    const cleanHex = hex.replace("#", "");
    const num = parseInt(cleanHex, 16);
    const r = ((num >> 16) & 255) / 255;
    const g = ((num >> 8) & 255) / 255;
    const b = (num & 255) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
      if (max === r) {
        h = ((g - b) / delta) % 6;
      } else if (max === g) {
        h = (b - r) / delta + 2;
      } else {
        h = (r - g) / delta + 4;
      }
      h = Math.round(h * 60);
      if (h < 0) h += 360;
    }

    const l = (max + min) / 2;
    const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

    return { h, s, l };
  }

  // Calculate circular angular difference between two hues
  function circularHueDifference(h1: number, h2: number): number {
    const diff = Math.abs(h1 - h2);
    return Math.min(diff, 360 - diff);
  }

  // Calculate WCAG relative luminance
  function getLuminance(hex: string): number {
    const cleanHex = hex.replace("#", "");
    const num = parseInt(cleanHex, 16);
    const rgb = [
      ((num >> 16) & 255) / 255,
      ((num >> 8) & 255) / 255,
      (num & 255) / 255,
    ].map((val) => {
      return val <= 0.04045 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }

  // Calculate WCAG contrast ratio against canvas background
  function getContrastRatio(hexForeground: string, hexBackground: string): number {
    const l1 = getLuminance(hexForeground);
    const l2 = getLuminance(hexBackground);
    const brighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (brighter + 0.05) / (darker + 0.05);
  }

  const { vectors, canvasBgHex } = SCIENTIFIC_THEME;

  // Distinct physical quantity categories mapped to their canonical vector color
  const distinctCategories: Record<string, string> = {
    position: vectors.position,
    velocity: vectors.velocity,
    acceleration: vectors.acceleration,
    forceGravity: vectors.gravity,
    friction: vectors.friction,
    tensionNormal: vectors.tensionNormal,
    momentum: vectors.momentum,
  };

  test("exact token hex values match specification", () => {
    expect(vectors.position).toBe("#38bdf8");
    expect(vectors.velocity).toBe("#10b981");
    expect(vectors.acceleration).toBe("#c084fc");
    expect(vectors.force).toBe("#f59e0b");
    expect(vectors.gravity).toBe("#f59e0b");
    expect(vectors.friction).toBe("#a3e635");
    expect(vectors.tensionNormal).toBe("#ec4899");
    expect(vectors.momentum).toBe("#6677ff");
    expect(vectors.momentumTotal).toBe("#6677ff");
  });

  test("all distinct physical quantity categories have hue difference >= 30 degrees", () => {
    const categoryEntries = Object.entries(distinctCategories);

    for (let i = 0; i < categoryEntries.length; i++) {
      for (let j = i + 1; j < categoryEntries.length; j++) {
        const [catA, colorA] = categoryEntries[i];
        const [catB, colorB] = categoryEntries[j];

        const hueA = hexToHsl(colorA).h;
        const hueB = hexToHsl(colorB).h;
        const diff = circularHueDifference(hueA, hueB);

        expect(diff).toBeGreaterThanOrEqual(30);
      }
    }
  });

  test("all vector colors have contrast ratio >= 4.5:1 against canvas background #0a0f1d", () => {
    const vectorHexList = Object.entries(vectors);

    for (const [, colorHex] of vectorHexList) {
      const contrast = getContrastRatio(colorHex, canvasBgHex);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("no vector colors have hue in forbidden red range (345° to 15°)", () => {
    const vectorHexList = Object.entries(vectors);

    for (const [, colorHex] of vectorHexList) {
      const { h } = hexToHsl(colorHex);
      const isForbiddenRed = h >= 345 || h <= 15;
      expect(isForbiddenRed).toBe(false);
    }
  });
});
