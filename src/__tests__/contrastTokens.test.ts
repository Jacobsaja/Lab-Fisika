// WCAG 2.1 Contrast Ratio Verification for Theme Tokens

function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function getContrastRatio(foregroundHex: string, backgroundHex: string): number {
  const l1 = getLuminance(foregroundHex);
  const l2 = getLuminance(backgroundHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("D. KONTRAS THEME TOKENS (WCAG 2.1 AA >= 4.5:1)", () => {
  const surfaces: Record<string, string> = {
    "Root Background (#06080D)": "#06080D",
    "Simulation Area (#0B1020)": "#0B1020",
    "Surface (#0D111A)": "#0D111A",
    "Panel Table (#11182A)": "#11182A",
    "Slate-900 Header (#0F172A)": "#0F172A",
    "Surface-2 Card (#141A26)": "#141A26",
    "Slate-950 (#020617)": "#020617",
  };

  const oldText3 = "#64748B";
  const newText3 = "#71849D";
  const text2 = "#94A3B8";

  test("Old --color-text-3 (#64748B) fails WCAG AA on all dark surfaces", () => {
    for (const [name, bgHex] of Object.entries(surfaces)) {
      const cr = getContrastRatio(oldText3, bgHex);
      expect(cr).toBeLessThan(4.5);
    }
  });

  test("New --color-text-3 (#71849D) passes WCAG AA (>= 4.5:1) on ALL specified surfaces", () => {
    for (const [name, bgHex] of Object.entries(surfaces)) {
      const cr = getContrastRatio(newText3, bgHex);
      expect(cr).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("Text-2 (#94A3B8) remains intact and provides high contrast (~7:1 to ~8:1)", () => {
    for (const [name, bgHex] of Object.entries(surfaces)) {
      const cr = getContrastRatio(text2, bgHex);
      expect(cr).toBeGreaterThanOrEqual(6.5);
    }
  });
});
