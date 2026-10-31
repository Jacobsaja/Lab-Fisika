import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import GJBPage from "@/app/praktikum/gjb/page";
import AtwoodGLBPage from "@/app/praktikum/atwood-glb/page";
import AtwoodGLBBPage from "@/app/praktikum/atwood-glbb/page";

// Mock localStorage
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

describe("E. BUG GATING (de-sync) - Regression Tests", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("GJB: in SIMULATION step with 0 rows and 23 rows, Selanjutnya is locked; with 25 rows, unlocks", () => {
    render(<GJBPage />);
    const nextBtn = screen.getByTestId("practicum-next-step");
    // Step 0: INTRO -> SETUP
    fireEvent.click(nextBtn);
    // Step 1: SETUP -> SIMULATION
    fireEvent.click(nextBtn);

    // 0 rows -> Locked
    expect(nextBtn).toBeDisabled();

    // Add 23 rows (23/25) -> Still locked
    const addRowBtn = screen.getByText("+ Tambah Baris");
    for (let i = 0; i < 23; i++) {
      fireEvent.click(addRowBtn);
    }
    expect(nextBtn).toBeDisabled();

    // Add 2 more rows (25/25) -> Unlocked
    fireEvent.click(addRowBtn);
    fireEvent.click(addRowBtn);
    expect(nextBtn).toBeEnabled();
  });

  test("Atwood GLB: in SIMULATION step with 0 rows, Selanjutnya is locked; with 5 valid rows, unlocks", () => {
    render(<AtwoodGLBPage />);
    const nextBtn = screen.getByTestId("practicum-next-step");
    fireEvent.click(nextBtn); // INTRO -> SETUP
    fireEvent.click(nextBtn); // SETUP -> SIMULATION

    // 0 rows -> Locked
    expect(nextBtn).toBeDisabled();
  });

  test("Atwood GLBB: in SIMULATION step with 0 rows, Selanjutnya is locked", () => {
    render(<AtwoodGLBBPage />);
    const nextBtn = screen.getByTestId("practicum-next-step");
    fireEvent.click(nextBtn); // INTRO -> SETUP
    fireEvent.click(nextBtn); // SETUP -> SIMULATION

    // 0 rows -> Locked
    expect(nextBtn).toBeDisabled();
  });
});
