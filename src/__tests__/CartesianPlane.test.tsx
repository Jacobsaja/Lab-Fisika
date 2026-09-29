import React from "react";
import { render } from "@testing-library/react";
import { CartesianPlane } from "../components/simulation/CartesianPlane";

describe("CartesianPlane", () => {
  it("should flip the Y-axis and translate the origin to the specified coordinates", () => {
    // If we have a width 800 and height 600, default origin is (400, 300).
    // The transform should be translate(400, 300) scale(ppu, -ppu)
    const { container } = render(
      <CartesianPlane width={800} height={600} pixelsPerUnit={40}>
        <circle data-testid="particle" cx="10" cy="5" r="1" />
      </CartesianPlane>
    );

    // Find the main group that holds the children
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();

    const childrenGroup = container.querySelector("g[transform]");
    expect(childrenGroup).not.toBeNull();
    
    const transformAttr = childrenGroup?.getAttribute("transform");
    expect(transformAttr).toBe("translate(400, 300) scale(40, -40)");

    // Particle should be inside this group
    const particle = container.querySelector("circle[data-testid='particle']");
    expect(particle).not.toBeNull();
  });

  it("should respect a custom origin", () => {
    const { container } = render(
      <CartesianPlane width={800} height={600} pixelsPerUnit={50} origin={{ x: 100, y: 500 }}>
        <rect />
      </CartesianPlane>
    );

    const childrenGroup = container.querySelector("g[transform]");
    expect(childrenGroup?.getAttribute("transform")).toBe("translate(100, 500) scale(50, -50)");
  });
});
