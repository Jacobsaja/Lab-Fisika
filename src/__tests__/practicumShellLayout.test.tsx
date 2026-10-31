import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PracticumShell } from "@/components/practicum/PracticumShell";
import { PracticumConfig } from "@/types/practicum";

const MOCK_CONFIG: PracticumConfig = {
  id: "test-shell",
  title: "Test Practicum Shell",
  category: "Mekanika",
  recommendedDurationSec: 600,
  introduction: "Intro test",
  objectives: ["Objective 1"],
  instructions: ["Instruction 1"],
  columns: [
    { key: "val", label: "Nilai", unit: "m" }
  ],
  questions: []
};

// Mock sessionStorage and localStorage
const mockStorage = () => {
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
};

Object.defineProperty(window, "localStorage", { value: mockStorage() });
Object.defineProperty(window, "sessionStorage", { value: mockStorage() });

describe("C. TATA RUANG SHELL & DATA DRAWER", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  test("Data drawer is open by default in SIMULATION, can be collapsed and re-expanded", () => {
    const { unmount } = render(
      <PracticumShell
        config={MOCK_CONFIG}
        simulationComponent={<div>Sim Area</div>}
      />
    );

    // Navigate to SIMULATION (INTRO -> SETUP -> SIMULATION)
    const nextBtn = screen.getByTestId("practicum-next-step");
    fireEvent.click(nextBtn); // To SETUP
    fireEvent.click(nextBtn); // To SIMULATION

    // Drawer is open by default
    expect(screen.getByTestId("data-drawer-open")).toBeInTheDocument();
    expect(screen.queryByTestId("data-drawer-collapsed")).not.toBeInTheDocument();

    // Click collapse button
    const toggleBtn = screen.getByTestId("btn-toggle-drawer");
    fireEvent.click(toggleBtn);

    // Now drawer is collapsed
    expect(screen.queryByTestId("data-drawer-open")).not.toBeInTheDocument();
    expect(screen.getByTestId("data-drawer-collapsed")).toBeInTheDocument();
    expect(screen.getByText(/0 baris/i)).toBeInTheDocument();

    // Click to re-open
    fireEvent.click(screen.getByTestId("data-drawer-collapsed"));
    expect(screen.getByTestId("data-drawer-open")).toBeInTheDocument();

    unmount();
  });

  test("nextBlockedReason is rendered when next step is disabled, hidden when enabled", () => {
    const { rerender } = render(
      <PracticumShell
        config={MOCK_CONFIG}
        simulationComponent={<div>Sim Area</div>}
        isNextDisabled={true}
        nextBlockedReason="Catat minimal 25 data (0/25)"
      />
    );

    expect(screen.getByTestId("next-blocked-reason")).toBeInTheDocument();
    expect(screen.getByText("Catat minimal 25 data (0/25)")).toBeInTheDocument();

    // When disabled is false, blocked reason should disappear
    rerender(
      <PracticumShell
        config={MOCK_CONFIG}
        simulationComponent={<div>Sim Area</div>}
        isNextDisabled={false}
        nextBlockedReason="Catat minimal 25 data (25/25)"
      />
    );

    expect(screen.queryByTestId("next-blocked-reason")).not.toBeInTheDocument();
  });
});
