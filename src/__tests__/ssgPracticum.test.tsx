import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SSGPracticumPage, { SSG_CONFIG } from "@/app/praktikum/ssg/page";
import {
  relativeUncertaintyPercent,
  estimatedPatternPosition,
  getPatternClassification,
  SSG_SLIT_PRESETS,
  DEFAULT_LASER_WAVELENGTH,
  DEFAULT_SCREEN_DISTANCE_L,
} from "@/physics/waveOptics";
import { validateStudentCalculation } from "@/physics/validation";
import { checkText, TextQuestion } from "@/components/practicum/QuestionCard";

// Mock localStorage for usePracticumSession
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("SSG Practicum - Physics Validation & Calculations", () => {
  const lambda = DEFAULT_LASER_WAVELENGTH;
  const L = DEFAULT_SCREEN_DISTANCE_L;

  test("relativeUncertaintyPercent returns null for Tn = 0 (central bright fringe)", () => {
    // Tn = 0 has y_teori = 0 -> division by zero is undefined, must return null
    const ksrT0 = relativeUncertaintyPercent(0, 0);
    expect(ksrT0).toBeNull();

    const ksrT0WithSmallOffset = relativeUncertaintyPercent(0, 0.05);
    expect(ksrT0WithSmallOffset).toBeNull();
  });

  test("calculates expected y_teori and KSR% accurately for Celah II (N=2)", () => {
    const slit = SSG_SLIT_PRESETS.slit2;
    // T1: y = 1/(2-1) * (632e-9 * 1.6 / 0.5e-3) = 2.0224 mm
    const yT1Mm = estimatedPatternPosition(1, slit.N, lambda, L, slit.d, slit.a) * 1e3;
    expect(yT1Mm).toBeCloseTo(2.0224, 3);

    // If student marked y_prak = 2.00 mm
    const ksr = relativeUncertaintyPercent(yT1Mm, 2.00);
    expect(ksr).not.toBeNull();
    // |2.0224 - 2.00| / 2.0224 * 100% ≈ 1.107%
    expect(ksr!).toBeCloseTo(1.108, 2);

    // Validate student calculation with +/-2% relative tolerance
    expect(validateStudentCalculation("2.022", yT1Mm)).toBe(true);
    expect(validateStudentCalculation("2.02", yT1Mm)).toBe(true);
    // Erroneous answer outside tolerance
    expect(validateStudentCalculation("3.50", yT1Mm)).toBe(false);

    // Validate KSR input with +/-2% tolerance
    expect(validateStudentCalculation("1.11", ksr!)).toBe(true);
  });

  test("calculates expected y_teori and secondary peak for Celah III (N=3)", () => {
    const slit = SSG_SLIT_PRESETS.slit3;
    // T1: secondary peak, y = 1/(3-1) * (lambda*L / d) = 0.5 * (2.0224 mm) = 1.0112 mm
    const yT1Mm = estimatedPatternPosition(1, slit.N, lambda, L, slit.d, slit.a) * 1e3;
    expect(yT1Mm).toBeCloseTo(1.0112, 3);
    expect(getPatternClassification(1, 3)).toBe("sekunder");
    expect(getPatternClassification(2, 3)).toBe("primer");
  });

  test("calculates expected y_teori and secondary peaks for Celah IIIII (N=5)", () => {
    const slit = SSG_SLIT_PRESETS.slit5;
    // T1: secondary peak, y = 1/(5-1) * (lambda*L / d) = 0.25 * (2.0224 mm) = 0.5056 mm
    const yT1Mm = estimatedPatternPosition(1, slit.N, lambda, L, slit.d, slit.a) * 1e3;
    expect(yT1Mm).toBeCloseTo(0.5056, 3);
    expect(getPatternClassification(1, 5)).toBe("sekunder");
    expect(getPatternClassification(2, 5)).toBe("sekunder");
    expect(getPatternClassification(3, 5)).toBe("sekunder");
    expect(getPatternClassification(4, 5)).toBe("primer");
  });
});

describe("SSG Practicum - Question Keyword Validation (Tahap 5)", () => {
  const q1 = SSG_CONFIG.questions[0] as TextQuestion;
  const q2 = SSG_CONFIG.questions[1] as TextQuestion;

  test("Q1 (L diperbesar) accepts honest reasoning with 'melebar' and 'sebanding'", () => {
    // Correct variations
    expect(
      checkText(
        "Pola interferensi akan melebar karena jarak terang berbanding lurus dengan L",
        q1.keywords,
        q1.minLength,
        q1.forbiddenKeywords
      )
    ).toBe(true);

    expect(
      checkText(
        "Jarak antar terang bertambah lebar sebanding dengan pertambahan jarak layar L",
        q1.keywords,
        q1.minLength,
        q1.forbiddenKeywords
      )
    ).toBe(true);

    // Incorrect / irrelevant variations
    expect(
      checkText("Pola menyempit dan semakin rapat", q1.keywords, q1.minLength, q1.forbiddenKeywords)
    ).toBe(false);

    expect(
      checkText("Tidak ada pengaruh sama sekali", q1.keywords, q1.minLength, q1.forbiddenKeywords)
    ).toBe(false);

    // Contradictory / opposite answers (using 'menyempit' for L diperbesar)
    expect(
      checkText(
        "Pola interferensi akan menyempit karena jarak terang berbanding lurus dengan L",
        q1.keywords,
        q1.minLength,
        q1.forbiddenKeywords
      )
    ).toBe(false);

    // Keyword stuffing / dumping all keywords without consistent direction
    expect(
      checkText(
        "Pola interferensi melebar dan menyempit karena jarak terang sebanding dengan L",
        q1.keywords,
        q1.minLength,
        q1.forbiddenKeywords
      )
    ).toBe(false);
  });

  test("Q2 (L diperkecil) accepts honest reasoning with 'menyempit/rapat' and 'sebanding'", () => {
    // Correct variations
    expect(
      checkText(
        "Pola akan menyempit karena jarak pita terang sebanding dengan L",
        q2.keywords,
        q2.minLength,
        q2.forbiddenKeywords
      )
    ).toBe(true);

    expect(
      checkText(
        "Garis terang semakin rapat dan mengecil berbanding lurus dengan L",
        q2.keywords,
        q2.minLength,
        q2.forbiddenKeywords
      )
    ).toBe(true);

    // Opposite answer (claiming 'melebar' when L diperkecil) must be strictly rejected
    expect(
      checkText(
        "Pola interferensi akan melebar karena jarak terang berbanding lurus dengan L",
        q2.keywords,
        q2.minLength,
        q2.forbiddenKeywords
      )
    ).toBe(false);

    // Keyword stuffing / dumping both 'melebar' and 'menyempit'
    expect(
      checkText(
        "Pola interferensi melebar dan menyempit karena jarak terang sebanding dengan L",
        q2.keywords,
        q2.minLength,
        q2.forbiddenKeywords
      )
    ).toBe(false);

    // Incorrect variations
    expect(
      checkText("Pola semakin melebar dan membesar", q2.keywords, q2.minLength, q2.forbiddenKeywords)
    ).toBe(false);
  });
});

describe("SSG Practicum - Component & Stage Progression Flow", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  test("renders Stage 1 (INTRO) with goals and formulas, next button advances to Stage 2", () => {
    render(<SSGPracticumPage />);

    // Stage 1 content is visible
    expect(screen.getByText(/Ringkasan Teori & Formulasi Celah Majemuk/i)).toBeInTheDocument();
    expect(screen.getByText(/n\(Ts\) = N - 2/i)).toBeInTheDocument();
    expect(screen.getByText(/y = \[Tn \/ \(N - 1\)\]/i)).toBeInTheDocument();

    // Next step button
    const nextBtn = screen.getByTestId("practicum-next-step");
    expect(nextBtn).toBeEnabled();
    fireEvent.click(nextBtn);

    // Now in Stage 2 (SETUP)
    expect(
      screen.getByText(/Tahap 2: Rangkai Alat & Penyelarasan Optis/i)
    ).toBeInTheDocument();
  });

  test("Stage 2 (SETUP): 'Selanjutnya' button is gated until all 5 assembly steps are completed", () => {
    render(<SSGPracticumPage />);

    // Move to Stage 2
    fireEvent.click(screen.getByTestId("practicum-next-step"));

    const nextBtn = screen.getByTestId("practicum-next-step");
    // Initially disabled because 0 / 5 steps are checked
    expect(nextBtn).toBeDisabled();

    // Step 1: Pasang Komponen
    fireEvent.click(screen.getByRole("button", { name: /Pasang Komponen/i }));
    expect(nextBtn).toBeDisabled();

    // Step 2: Atur L = 1,6 m
    fireEvent.click(screen.getByRole("button", { name: /Atur L = 1,6 m/i }));
    expect(nextBtn).toBeDisabled();

    // Step 3: Nyalakan & Dimmer 100%
    fireEvent.click(screen.getByRole("button", { name: /Nyalakan & Dimmer 100%/i }));
    expect(nextBtn).toBeDisabled();

    // Step 4: Sejajarkan Berkas
    fireEvent.click(screen.getByRole("button", { name: /Sejajarkan Berkas/i }));
    expect(nextBtn).toBeDisabled();

    // Step 5: Jepitkan Kertas
    fireEvent.click(screen.getByRole("button", { name: /Jepitkan Kertas/i }));

    // All 5 steps completed! Banner appears and Next is enabled
    expect(
      screen.getByText(/Seluruh prosedur perakitan 4\.1 terpenuhi!/i)
    ).toBeInTheDocument();
    expect(nextBtn).toBeEnabled();
  });

  test("Stage 3 (SIMULATION): Labeled IntensityProfileGraph is strictly hidden; unlabeled student sketch is present", () => {
    render(<SSGPracticumPage />);

    // Step 1 -> Step 2
    fireEvent.click(screen.getByTestId("practicum-next-step"));

    // Complete all 5 setup steps
    fireEvent.click(screen.getByRole("button", { name: /Pasang Komponen/i }));
    fireEvent.click(screen.getByRole("button", { name: /Atur L = 1,6 m/i }));
    fireEvent.click(screen.getByRole("button", { name: /Nyalakan & Dimmer 100%/i }));
    fireEvent.click(screen.getByRole("button", { name: /Sejajarkan Berkas/i }));
    fireEvent.click(screen.getByRole("button", { name: /Jepitkan Kertas/i }));

    // Move to Stage 3 (SIMULATION)
    fireEvent.click(screen.getByTestId("practicum-next-step"));

    // Verify ScreenPatternView is visible in practicum mode
    expect(screen.getByText(/Layar Proyeksi Milimeter Blok/i)).toBeInTheDocument();
    // Unlabeled student sketch view is present
    expect(
      screen.getByText(/Sketsa Pola Garis Terang \(Buku Jurnal Praktikan\)/i)
    ).toBeInTheDocument();

    // CRITICAL REQUIREMENT: Labeled graph must NOT be visible in Stage 3
    expect(
      screen.queryByText(/Profil Intensitas Fraunhofer Berlabel \(Pembanding Analitik\)/i)
    ).not.toBeInTheDocument();
  });
});
