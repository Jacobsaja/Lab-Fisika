import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { HintBox, getVisibleHintCount } from "@/components/practicum/HintBox";

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

  it("calls onHintRevealed without throwing React setState during render errors", () => {
    function ParentComponent() {
      const [count, setCount] = useState(0);
      return (
        <div>
          <span data-testid="parent-count">{count}</span>
          <HintBox
            hints={["Petunjuk 1", "Petunjuk 2", "Petunjuk 3"]}
            onHintRevealed={(c) => setCount(c)}
          />
        </div>
      );
    }

    render(<ParentComponent />);

    const revealBtn = screen.getByRole("button", { name: /Tampilkan Petunjuk/i });
    expect(revealBtn).toBeInTheDocument();

    // Click 1
    fireEvent.click(revealBtn);
    expect(screen.getByTestId("parent-count")).toHaveTextContent("1");
    expect(screen.getByText("Petunjuk 1")).toBeInTheDocument();

    // Click 2
    const nextBtn = screen.getByRole("button", { name: /Tampilkan petunjuk 2 dari 3/i });
    fireEvent.click(nextBtn);
    expect(screen.getByTestId("parent-count")).toHaveTextContent("2");
    expect(screen.getByText("Petunjuk 2")).toBeInTheDocument();
  });
});
