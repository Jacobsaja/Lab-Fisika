import {
  ANSWER_RELATIVE_TOLERANCE,
  ERROR_PCT_ABSOLUTE_TOLERANCE,
  INERTIA_RELATIVE_TOLERANCE,
  PRACTICUM_G,
  RollingTrial,
  computeReferenceValues,
  isWithinTolerance,
  parseAnswer,
  validateErrorAnswer,
  validateInertiaAnswer,
  validateRollingAnswers,
  validateTheoryAnswer,
} from "../physics/rollingMotionValidation";

const DEG = Math.PI / 180;
const g = PRACTICUM_G;

/** Build a trial whose measured a_graph is a fixed fraction of the true a_theory. */
function makeTrial(shape: "solid" | "hollow", thetaDeg: number, aGraphFactor = 0.98): RollingTrial {
  const base: RollingTrial = {
    shape,
    thetaDeg,
    mass: 1,
    r: 0.05,
    rInner: shape === "hollow" ? 0.04 : 0,
    aGraph: 1,
  };
  const { aTheory } = computeReferenceValues(base);
  return { ...base, aGraph: aTheory * aGraphFactor };
}

const CASES: Array<["solid" | "hollow", number]> = [
  ["solid", 14],
  ["solid", 22],
  ["hollow", 14],
  ["hollow", 22],
];

describe("parseAnswer", () => {
  it("parses dot and Indonesian comma decimals", () => {
    expect(parseAnswer("1.58")).toBe(1.58);
    expect(parseAnswer(" 1,58 ")).toBe(1.58);
    expect(parseAnswer(2.5)).toBe(2.5);
    expect(parseAnswer("1e-3")).toBe(0.001);
  });
  it("returns null for empty and NaN for garbage", () => {
    expect(parseAnswer("")).toBeNull();
    expect(parseAnswer("   ")).toBeNull();
    expect(parseAnswer(undefined)).toBeNull();
    expect(parseAnswer("abc")).toBeNaN();
    expect(parseAnswer("1.2.3")).toBeNaN();
  });
});

describe("isWithinTolerance — edge cases", () => {
  it("accepts exactly on the relative boundary (inclusive)", () => {
    expect(isWithinTolerance(1.02, 1, ANSWER_RELATIVE_TOLERANCE)).toBe(true);
    expect(isWithinTolerance(0.98, 1, ANSWER_RELATIVE_TOLERANCE)).toBe(true);
  });
  it("rejects just beyond the boundary", () => {
    expect(isWithinTolerance(1.0201, 1, ANSWER_RELATIVE_TOLERANCE)).toBe(false);
    expect(isWithinTolerance(0.9799, 1, ANSWER_RELATIVE_TOLERANCE)).toBe(false);
  });
  it("uses the larger of relative and absolute tolerance", () => {
    expect(isWithinTolerance(2.09, 2, 0.02, 0.1)).toBe(true); // abs 0.1 > rel 0.04
    expect(isWithinTolerance(2.11, 2, 0.02, 0.1)).toBe(false);
  });
});

describe("computeReferenceValues", () => {
  it.each(CASES)("%s at %i° matches the textbook formulas", (shape, theta) => {
    const trial = makeTrial(shape, theta);
    const ref = computeReferenceValues(trial);
    const k = shape === "solid" ? 0.5 : 0.5 * (1 + (0.04 / 0.05) ** 2);
    expect(ref.k).toBeCloseTo(k, 12);
    expect(ref.aTheory).toBeCloseTo((g * Math.sin(theta * DEG)) / (1 + k), 12);
    expect(ref.errorPct).toBeCloseTo(2, 9); // aGraph = 0.98·aTheory
    expect(ref.inertia).toBeCloseTo(1 * 0.05 ** 2 * ((g * Math.sin(theta * DEG)) / trial.aGraph - 1), 12);
  });
  it("hollow cylinder has a smaller a_theory than solid at the same angle", () => {
    for (const theta of [14, 22]) {
      expect(computeReferenceValues(makeTrial("hollow", theta)).aTheory)
        .toBeLessThan(computeReferenceValues(makeTrial("solid", theta)).aTheory);
    }
  });
});

describe("validateTheoryAnswer", () => {
  it.each(CASES)("%s %i°: exact, +2% and −2% are 'correct'", (shape, theta) => {
    const trial = makeTrial(shape, theta);
    const { aTheory } = computeReferenceValues(trial);
    expect(validateTheoryAnswer(trial, aTheory).status).toBe("correct");
    expect(validateTheoryAnswer(trial, aTheory * 1.02).status).toBe("correct");
    expect(validateTheoryAnswer(trial, aTheory * 0.98).status).toBe("correct");
  });

  it.each(CASES)("%s %i°: ±3% gives too_high / too_low", (shape, theta) => {
    const trial = makeTrial(shape, theta);
    const { aTheory } = computeReferenceValues(trial);
    expect(validateTheoryAnswer(trial, aTheory * 1.03).status).toBe("too_high");
    expect(validateTheoryAnswer(trial, aTheory * 0.97).status).toBe("too_low");
  });

  it("accepts a string with a decimal comma", () => {
    const trial = makeTrial("solid", 14);
    const { aTheory } = computeReferenceValues(trial);
    expect(validateTheoryAnswer(trial, aTheory.toFixed(3).replace(".", ",")).status).toBe("correct");
  });

  it.each(CASES)("%s %i°: forgetting 1/(1+k) → check_formula", (shape, theta) => {
    const trial = makeTrial(shape, theta);
    const fb = validateTheoryAnswer(trial, g * Math.sin(theta * DEG));
    expect(fb).toEqual({ status: "check_formula", diagnosis: "missing_inertia_factor" });
  });

  it.each([14, 22])("solid %i°: using k = 1 → wrong_inertia_factor", (theta) => {
    const trial = makeTrial("solid", theta);
    const fb = validateTheoryAnswer(trial, (g * Math.sin(theta * DEG)) / 2);
    expect(fb).toEqual({ status: "check_formula", diagnosis: "wrong_inertia_factor" });
  });

  it.each([14, 22])("hollow %i°: treating it as a solid (k = 0.5) → wrong_inertia_factor", (theta) => {
    const trial = makeTrial("hollow", theta);
    const fb = validateTheoryAnswer(trial, (g * Math.sin(theta * DEG)) / 1.5);
    expect(fb).toEqual({ status: "check_formula", diagnosis: "wrong_inertia_factor" });
  });

  it("14°: calculator in radian mode → degree_radian_mixup", () => {
    for (const shape of ["solid", "hollow"] as const) {
      const trial = makeTrial(shape, 14);
      const { k } = computeReferenceValues(trial);
      const fb = validateTheoryAnswer(trial, (g * Math.sin(14)) / (1 + k));
      expect(fb).toEqual({ status: "check_formula", diagnosis: "degree_radian_mixup" });
    }
  });

  it("22°: cos instead of sin → cos_instead_of_sin", () => {
    const trial = makeTrial("solid", 22);
    const fb = validateTheoryAnswer(trial, (g * Math.cos(22 * DEG)) / 1.5);
    expect(fb).toEqual({ status: "check_formula", diagnosis: "cos_instead_of_sin" });
  });

  it("answer in cm/s² → unit_scale", () => {
    const trial = makeTrial("hollow", 22);
    const { aTheory } = computeReferenceValues(trial);
    expect(validateTheoryAnswer(trial, aTheory * 100)).toEqual({ status: "check_formula", diagnosis: "unit_scale" });
  });

  it("empty and invalid entries", () => {
    const trial = makeTrial("solid", 14);
    expect(validateTheoryAnswer(trial, "").status).toBe("empty");
    expect(validateTheoryAnswer(trial, "satu koma lima").status).toBe("invalid");
  });

  it("feedback never contains the reference value", () => {
    const trial = makeTrial("solid", 14);
    for (const v of [0, 1, 1.5, 2.3, 100]) {
      const fb = validateTheoryAnswer(trial, v);
      expect(Object.keys(fb).every((key) => key === "status" || key === "diagnosis")).toBe(true);
      Object.values(fb).forEach((val) => expect(typeof val).toBe("string"));
    }
  });
});

describe("validateErrorAnswer", () => {
  it.each(CASES)("%s %i°: correct error is accepted", (shape, theta) => {
    const trial = makeTrial(shape, theta);
    const { errorPct } = computeReferenceValues(trial);
    expect(validateErrorAnswer(trial, errorPct).status).toBe("correct");
  });

  it("absolute tolerance edge (0.1 percentage point)", () => {
    const trial = makeTrial("solid", 14); // error = 2 %
    expect(validateErrorAnswer(trial, 2 + ERROR_PCT_ABSOLUTE_TOLERANCE).status).toBe("correct");
    expect(validateErrorAnswer(trial, 2 - ERROR_PCT_ABSOLUTE_TOLERANCE).status).toBe("correct");
    expect(validateErrorAnswer(trial, 2.15).status).toBe("too_high");
    expect(validateErrorAnswer(trial, 1.85).status).toBe("too_low");
  });

  it("relative tolerance takes over for large errors", () => {
    const trial = makeTrial("hollow", 22, 0.8); // error = 20 %, rel tol = 0.4 pp
    expect(validateErrorAnswer(trial, 20.39).status).toBe("correct");
    expect(validateErrorAnswer(trial, 20.5).status).toBe("too_high");
  });

  it("fraction instead of percent → fraction_not_percent", () => {
    const trial = makeTrial("solid", 22, 0.9); // 10 %
    expect(validateErrorAnswer(trial, 0.1)).toEqual({ status: "check_formula", diagnosis: "fraction_not_percent" });
  });

  it("dividing by a_graph instead of a_theory → wrong_reference", () => {
    const trial = makeTrial("hollow", 14, 0.8); // 20 % vs 25 %
    const { aTheory } = computeReferenceValues(trial);
    const wrong = (Math.abs(aTheory - trial.aGraph) / trial.aGraph) * 100;
    expect(validateErrorAnswer(trial, wrong)).toEqual({ status: "check_formula", diagnosis: "wrong_reference" });
  });

  it("negative error → sign", () => {
    const trial = makeTrial("solid", 14, 0.9);
    expect(validateErrorAnswer(trial, -10)).toEqual({ status: "check_formula", diagnosis: "sign" });
  });

  it("is consistent with the student's own (accepted) a_theory", () => {
    const trial = makeTrial("solid", 14, 0.95); // true error 5 %
    const { aTheory } = computeReferenceValues(trial);
    const studentA = aTheory * 1.015; // within 2 %, accepted
    const consistentError = (Math.abs(studentA - trial.aGraph) / studentA) * 100; // ≈ 6.4 %
    expect(validateErrorAnswer(trial, consistentError).status).toBe("too_high"); // without context
    expect(validateErrorAnswer(trial, consistentError, studentA).status).toBe("correct");
    // A wrong a_theory does not make its derived error acceptable.
    const badA = aTheory * 1.2;
    const badError = (Math.abs(badA - trial.aGraph) / badA) * 100;
    expect(validateErrorAnswer(trial, badError, badA).status).not.toBe("correct");
  });
});

describe("validateInertiaAnswer", () => {
  it.each(CASES)("%s %i°: correct and ±5% accepted, ±6% rejected", (shape, theta) => {
    const trial = makeTrial(shape, theta);
    const { inertia } = computeReferenceValues(trial);
    expect(validateInertiaAnswer(trial, inertia).status).toBe("correct");
    expect(validateInertiaAnswer(trial, inertia * (1 + INERTIA_RELATIVE_TOLERANCE)).status).toBe("correct");
    expect(validateInertiaAnswer(trial, inertia * (1 - INERTIA_RELATIVE_TOLERANCE)).status).toBe("correct");
    expect(validateInertiaAnswer(trial, inertia * 1.06).status).toBe("too_high");
    expect(validateInertiaAnswer(trial, inertia * 0.94).status).toBe("too_low");
  });

  it.each(CASES)("%s %i°: forgetting the −1 → missing_minus_one", (shape, theta) => {
    const trial = makeTrial(shape, theta);
    const v = 1 * 0.05 ** 2 * ((g * Math.sin(theta * DEG)) / trial.aGraph);
    expect(validateInertiaAnswer(trial, v)).toEqual({ status: "check_formula", diagnosis: "missing_minus_one" });
  });

  it("R in cm → unit_scale; R not squared → radius_not_squared", () => {
    const trial = makeTrial("solid", 14);
    const { inertia } = computeReferenceValues(trial);
    expect(validateInertiaAnswer(trial, inertia * 1e4)).toEqual({ status: "check_formula", diagnosis: "unit_scale" });
    expect(validateInertiaAnswer(trial, inertia / 0.05)).toEqual({ status: "check_formula", diagnosis: "radius_not_squared" });
  });

  it("using a_theory instead of a_graph → used_theory_acceleration", () => {
    const trial = makeTrial("solid", 22, 0.9);
    expect(validateInertiaAnswer(trial, 0.5 * 1 * 0.05 ** 2)).toEqual({
      status: "check_formula",
      diagnosis: "used_theory_acceleration",
    });
  });

  it("does not misdiagnose when the mistake candidate is close to the correct value", () => {
    // aGraph ≈ aTheory, so I_theory is only ~6 % below I_exp: a slightly low
    // answer must be 'too_low', not 'used_theory_acceleration'.
    const trial = makeTrial("solid", 14, 0.98);
    expect(validateInertiaAnswer(trial, 0.5 * 1 * 0.05 ** 2).status).toBe("too_low");
  });
});

describe("validateRollingAnswers", () => {
  it("validates a full row and never blocks on wrong fields", () => {
    const trial = makeTrial("hollow", 22);
    const ref = computeReferenceValues(trial);
    const fb = validateRollingAnswers(trial, {
      aTheory: ref.aTheory.toFixed(3),
      errorPct: "50",
      inertia: "",
    });
    expect(fb.aTheory.status).toBe("correct");
    expect(fb.errorPct.status).toBe("too_high");
    expect(fb.inertia.status).toBe("empty");
  });
});
