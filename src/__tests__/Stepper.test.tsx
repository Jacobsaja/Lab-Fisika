import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Stepper } from "@/components/common/Stepper";

describe("2. Stepper Reusable Component", () => {
  it("renders with initial value and label", () => {
    const onChange = jest.fn();
    render(
      <Stepper
        label="Ketinggian Jatuh (h)"
        value={100}
        onChange={onChange}
        min={20}
        max={120}
        unit="cm"
      />
    );

    expect(screen.getByText("Ketinggian Jatuh (h)")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toHaveTextContent("100.0 cm");
  });

  it("handles fine and coarse steps via buttons", () => {
    const onChange = jest.fn();
    render(
      <Stepper
        value={50}
        onChange={onChange}
        min={0}
        max={100}
        fineStep={1}
        coarseStep={5}
      />
    );

    // Fine increment
    fireEvent.click(screen.getByLabelText(/Tambah nilai halus/i));
    expect(onChange).toHaveBeenCalledWith(51);

    // Coarse increment
    fireEvent.click(screen.getByLabelText(/Tambah nilai kasar/i));
    expect(onChange).toHaveBeenCalledWith(55);

    // Fine decrement
    fireEvent.click(screen.getByLabelText(/Kurangi nilai halus/i));
    expect(onChange).toHaveBeenCalledWith(49);

    // Coarse decrement
    fireEvent.click(screen.getByLabelText(/Kurangi nilai kasar/i));
    expect(onChange).toHaveBeenCalledWith(45);
  });

  it("handles keyboard navigation when focused on spinbutton", () => {
    const onChange = jest.fn();
    render(
      <Stepper
        value={50}
        onChange={onChange}
        min={10}
        max={100}
        fineStep={1}
        coarseStep={5}
      />
    );

    const spin = screen.getByRole("spinbutton");

    // ArrowUp -> +fine
    fireEvent.keyDown(spin, { key: "ArrowUp" });
    expect(onChange).toHaveBeenCalledWith(51);

    // ArrowDown -> -fine
    fireEvent.keyDown(spin, { key: "ArrowDown" });
    expect(onChange).toHaveBeenCalledWith(49);

    // Shift + ArrowUp -> +coarse
    fireEvent.keyDown(spin, { key: "ArrowUp", shiftKey: true });
    expect(onChange).toHaveBeenCalledWith(55);

    // PageUp -> +coarse
    fireEvent.keyDown(spin, { key: "PageUp" });
    expect(onChange).toHaveBeenCalledWith(55);

    // PageDown -> -coarse
    fireEvent.keyDown(spin, { key: "PageDown" });
    expect(onChange).toHaveBeenCalledWith(45);

    // Home -> min
    fireEvent.keyDown(spin, { key: "Home" });
    expect(onChange).toHaveBeenCalledWith(10);

    // End -> max
    fireEvent.keyDown(spin, { key: "End" });
    expect(onChange).toHaveBeenCalledWith(100);
  });

  it("clamps values to min and max", () => {
    const onChange = jest.fn();
    render(
      <Stepper
        value={98}
        onChange={onChange}
        min={0}
        max={100}
        coarseStep={5}
      />
    );

    fireEvent.click(screen.getByLabelText(/Tambah nilai kasar/i));
    expect(onChange).toHaveBeenCalledWith(100);
  });
});
