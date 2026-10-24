import React from "react";
import { render } from "@testing-library/react";
import { RotationalVectorArrow } from "@/components/simulation/visual/RotationalVectorArrow";
import { SCIENTIFIC_THEME } from "@/components/simulation/visual/tokens";

describe("RotationalVectorArrow Component", () => {
  const defaultProps = {
    id: "test-rot-arrow",
    center: { x: 100, y: 100 },
    radius: 40,
    direction: "cw" as const,
    value: 12.5,
    label: "ω",
    color: SCIENTIFIC_THEME.vectors.velocity,
    showValue: true,
    valueText: "12.5 rad/s",
  };

  test("renders SVG arc path and arrowhead polygon when value is above threshold", () => {
    const { container } = render(
      <svg>
        <RotationalVectorArrow {...defaultProps} />
      </svg>
    );

    const group = container.querySelector("#test-rot-arrow");
    expect(group).not.toBeNull();

    // Arc path
    const path = group?.querySelector("path");
    expect(path).not.toBeNull();
    expect(path?.getAttribute("stroke")).toBe(SCIENTIFIC_THEME.vectors.velocity);

    // Tangential arrowhead polygon
    const polygon = group?.querySelector("polygon");
    expect(polygon).not.toBeNull();
    expect(polygon?.getAttribute("fill")).toBe(SCIENTIFIC_THEME.vectors.velocity);

    // Badge text with label and formatted value
    expect(container.textContent).toContain("ω");
    expect(container.textContent).toContain("12.5 rad/s");
  });

  test("returns null (does not render stubs) when value is below minThreshold", () => {
    const { container } = render(
      <svg>
        <RotationalVectorArrow {...defaultProps} value={0} minThreshold={0.01} />
      </svg>
    );

    expect(container.querySelector("#test-rot-arrow")).toBeNull();
  });

  test("returns null when radius <= 0", () => {
    const { container } = render(
      <svg>
        <RotationalVectorArrow {...defaultProps} radius={0} />
      </svg>
    );

    expect(container.querySelector("#test-rot-arrow")).toBeNull();
  });

  test("supports counter-clockwise (ccw) rotation direction", () => {
    const { container } = render(
      <svg>
        <RotationalVectorArrow {...defaultProps} direction="ccw" label="α" color={SCIENTIFIC_THEME.vectors.acceleration} />
      </svg>
    );

    const path = container.querySelector("path");
    expect(path).not.toBeNull();
    // In SVG arc command, sweepFlag for CCW is 0
    expect(path?.getAttribute("d")).toContain(" 0 0 ");
  });

  test("supports dashed stroke for distinguishing acceleration from velocity", () => {
    const { container } = render(
      <svg>
        <RotationalVectorArrow
          {...defaultProps}
          label="α"
          color={SCIENTIFIC_THEME.vectors.acceleration}
          dashed={true}
          strokeDasharray="4 3"
        />
      </svg>
    );

    const path = container.querySelector("path");
    expect(path?.getAttribute("stroke-dasharray")).toBe("4 3");
  });

  test("hides numeric value when showValue is false (qualitative mode)", () => {
    const { container } = render(
      <svg>
        <RotationalVectorArrow {...defaultProps} showValue={false} />
      </svg>
    );

    expect(container.textContent).toContain("ω");
    expect(container.textContent).not.toContain("12.5 rad/s");
  });
});
