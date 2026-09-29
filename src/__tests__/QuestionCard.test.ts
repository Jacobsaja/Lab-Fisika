import {
  checkNumeric,
  checkText,
  checkMultipleChoice,
} from "@/components/practicum/QuestionCard";

// ─── checkNumeric ─────────────────────────────────────────────────────────────

describe("QuestionCard — checkNumeric (absolute tolerance)", () => {
  const expected = 9.8;
  const tolerance = 0.1;

  it("returns true when value is exactly correct", () => {
    expect(checkNumeric(9.8, expected, tolerance, "absolute")).toBe(true);
  });

  it("returns true within tolerance boundary", () => {
    // Use values comfortably inside the ±0.1 window to avoid IEEE-754 rounding
    expect(checkNumeric(9.75, expected, tolerance, "absolute")).toBe(true);
    expect(checkNumeric(9.85, expected, tolerance, "absolute")).toBe(true);
  });

  it("returns false just outside tolerance", () => {
    expect(checkNumeric(9.60, expected, tolerance, "absolute")).toBe(false);
    expect(checkNumeric(9.95, expected, tolerance, "absolute")).toBe(false);
  });
});

describe("QuestionCard — checkNumeric (relative tolerance)", () => {
  const expected = 100;
  const tolerance = 0.05; // 5%

  it("returns true within 5% relative tolerance", () => {
    expect(checkNumeric(100, expected, tolerance, "relative")).toBe(true);
    expect(checkNumeric(95, expected, tolerance, "relative")).toBe(true);
    expect(checkNumeric(105, expected, tolerance, "relative")).toBe(true);
  });

  it("returns false outside 5% relative tolerance", () => {
    expect(checkNumeric(94, expected, tolerance, "relative")).toBe(false);
    expect(checkNumeric(106, expected, tolerance, "relative")).toBe(false);
  });
});

// ─── checkText ────────────────────────────────────────────────────────────────

describe("QuestionCard — checkText", () => {
  it("passes when all keywords are present (case-insensitive)", () => {
    expect(checkText("Kecepatan adalah BESARAN vektor yang memiliki arah", ["vektor", "besaran", "arah"])).toBe(true);
  });

  it("fails when a keyword is missing", () => {
    expect(checkText("Kecepatan adalah besaran vektor", ["vektor", "besaran", "arah"])).toBe(false);
  });

  it("fails when text is too short (minLength)", () => {
    expect(checkText("vektor besaran arah", ["vektor", "besaran", "arah"], 50)).toBe(false);
  });

  it("passes when text meets minLength and has all keywords", () => {
    const longText = "Kecepatan adalah besaran vektor karena memiliki besar dan arah yang jelas dalam fisika";
    expect(checkText(longText, ["vektor", "besaran", "arah"], 30)).toBe(true);
  });

  it("handles empty keyword array (always true if length ok)", () => {
    expect(checkText("apapun", [], 0)).toBe(true);
  });
});

// ─── checkMultipleChoice ─────────────────────────────────────────────────────

describe("QuestionCard — checkMultipleChoice", () => {
  it("returns true for correct index", () => {
    expect(checkMultipleChoice(2, 2)).toBe(true);
  });

  it("returns false for wrong index", () => {
    expect(checkMultipleChoice(0, 2)).toBe(false);
    expect(checkMultipleChoice(3, 2)).toBe(false);
  });
});
