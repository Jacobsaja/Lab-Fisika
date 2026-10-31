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

describe("E. BUG GATING & B. ALASAN TERKUNCI - Regression Tests", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("GJB: in SIMULATION step, displays blocked reason with live count, unlocks at 25", () => {
    render(<GJBPage />);
    const nextBtn = screen.getByTestId("practicum-next-step");
    // Step 0: INTRO -> SETUP
    fireEvent.click(nextBtn);
    // Step 1: SETUP -> SIMULATION
    fireEvent.click(nextBtn);

    // 0 rows -> Locked with reason
    expect(nextBtn).toBeDisabled();
    expect(screen.getByTestId("next-blocked-reason")).toHaveTextContent("Catat minimal 25 data pengamatan (0/25)");

    // Add 23 rows (23/25) -> Still locked with updated reason
    const addRowBtn = screen.getByText("+ Tambah Baris");
    for (let i = 0; i < 23; i++) {
      fireEvent.click(addRowBtn);
    }
    expect(nextBtn).toBeDisabled();
    expect(screen.getByTestId("next-blocked-reason")).toHaveTextContent("Catat minimal 25 data pengamatan (23/25)");

    // Add 2 more rows (25/25) -> Unlocked, reason disappears
    fireEvent.click(addRowBtn);
    fireEvent.click(addRowBtn);
    expect(nextBtn).toBeEnabled();
    expect(screen.queryByTestId("next-blocked-reason")).not.toBeInTheDocument();
  });

  test("Atwood GLB: in SIMULATION step with 0 rows, shows blocked reason", () => {
    render(<AtwoodGLBPage />);
    const nextBtn = screen.getByTestId("practicum-next-step");
    fireEvent.click(nextBtn); // INTRO -> SETUP
    fireEvent.click(nextBtn); // SETUP -> SIMULATION

    // 0 rows -> Locked
    expect(nextBtn).toBeDisabled();
    expect(screen.getByTestId("next-blocked-reason")).toHaveTextContent("Catat minimal 5 data variasi jarak BC (0/5)");
  });

  test("Atwood GLBB: in SIMULATION step with 0 rows, shows blocked reason", () => {
    render(<AtwoodGLBBPage />);
    const nextBtn = screen.getByTestId("practicum-next-step");
    fireEvent.click(nextBtn); // INTRO -> SETUP
    fireEvent.click(nextBtn); // SETUP -> SIMULATION

    // 0 rows -> Locked
    expect(nextBtn).toBeDisabled();
    expect(screen.getByTestId("next-blocked-reason")).toHaveTextContent("Catat minimal 5 data GLBB lengkap (0/5)");
  });
});
