import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SSGExplorePage from "@/app/explore/gelombang/ssg/page";
import {
  wavelengthToRgb,
  wavelengthToHex,
  calculateAdaptiveScreenSpanMm,
} from "@/physics/waveOptics";

// Mock canvas getContext for jsdom
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    arc: jest.fn(),
    createRadialGradient: jest.fn(() => ({
      addColorStop: jest.fn(),
    })),
    createLinearGradient: jest.fn(() => ({
      addColorStop: jest.fn(),
    })),
    fillText: jest.fn(),
    measureText: jest.fn(() => ({ width: 40 })),
    setLineDash: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
  })) as any;
});

describe("Wave Optics Color & Adaptive Scaling Helpers", () => {
  it("maps wavelengths correctly across the visible spectrum", () => {
    // 405 nm -> Violet
    expect(wavelengthToRgb(405)).toBe("139, 92, 246");
    expect(wavelengthToHex(405)).toBe("#8b5cf6");

    // 488 nm -> Cyan
    expect(wavelengthToRgb(488)).toBe("6, 182, 212");
    expect(wavelengthToHex(488)).toBe("#06b6d4");

    // 532 nm -> Green
    expect(wavelengthToRgb(532)).toBe("34, 197, 94");
    expect(wavelengthToHex(532)).toBe("#22c55e");

    // 589 nm -> Yellow
    expect(wavelengthToRgb(589)).toBe("234, 179, 8");
    expect(wavelengthToHex(589)).toBe("#eab308");

    // 605 nm -> Orange
    expect(wavelengthToRgb(605)).toBe("249, 115, 22");
    expect(wavelengthToHex(605)).toBe("#f97316");

    // 632.8 nm (He-Ne) -> Red
    expect(wavelengthToRgb(632.8)).toBe("239, 68, 68");
    expect(wavelengthToHex(632.8)).toBe("#ef4444");
  });

  it("calculates adaptive screen spans within safe bounds [6, 30] mm", () => {
    // Standard setup: lambda=632nm, L=1.6m, a=0.04mm, d=0.5mm, N=2
    const spanDefault = calculateAdaptiveScreenSpanMm(632e-9, 1.6, 0.04e-3, 0.5e-3, 2);
    expect(spanDefault).toBeGreaterThanOrEqual(6);
    expect(spanDefault).toBeLessThanOrEqual(30);

    // Single slit (N=1)
    const spanSingle = calculateAdaptiveScreenSpanMm(632e-9, 1.6, 0.04e-3, 0.5e-3, 1);
    expect(spanSingle).toBeGreaterThanOrEqual(6);
    expect(spanSingle).toBeLessThanOrEqual(30);

    // Extreme large L and small d
    const spanLarge = calculateAdaptiveScreenSpanMm(700e-9, 3.0, 0.02e-3, 0.1e-3, 5);
    expect(spanLarge).toBeLessThanOrEqual(30);
  });
});

describe("Explore SSG Page UI & Invariants", () => {
  it("renders with default parameters and allows resetting", () => {
    render(<SSGExplorePage />);

    // Default lambda 632 nm and N = 2
    expect(screen.getAllByText(/632 nm/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/N = 2/i).length).toBeGreaterThanOrEqual(1);

    // Change wavelength
    const lambdaSlider = screen.getByLabelText(/Panjang Gelombang/i);
    fireEvent.change(lambdaSlider, { target: { value: "532" } });
    expect(screen.getAllByText(/532 nm/i).length).toBeGreaterThanOrEqual(1);

    // Click Reset Parameter
    const resetBtn = screen.getByRole("button", { name: /Reset Parameter/i });
    fireEvent.click(resetBtn);

    // Restores default
    expect(screen.getAllByText(/632 nm/i).length).toBeGreaterThanOrEqual(1);
  });

  it("disables slit separation d and displays single-slit info when N = 1", () => {
    render(<SSGExplorePage />);

    // Click N = 1 button
    const btnN1 = screen.getByRole("button", { name: "1" });
    fireEvent.click(btnN1);

    // Verify N = 1 active
    expect(screen.getByText(/N = 1 \(Celah Tunggal\)/i)).toBeInTheDocument();

    // Slider d should be disabled
    const dSlider = screen.getByLabelText(/Jarak Antar-Celah/i);
    expect(dSlider).toBeDisabled();

    // Single slit output panel appears
    expect(screen.getByText(/λ·L \/ a \(Gelap Orde 1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Lebar Terang Pusat \(2λ·L\/a\)/i)).toBeInTheDocument();
  });

  it("enforces d >= a invariant when moving sliders", () => {
    render(<SSGExplorePage />);

    // In double slit (N=2), d=0.50 mm, a=0.04 mm
    expect(screen.getByText(/d \(0.50 mm\) ≥ a \(0.04 mm\)/i)).toBeInTheDocument();

    // Increase a up to 0.20 mm
    const aSlider = screen.getByLabelText(/Lebar Celah/i);
    fireEvent.change(aSlider, { target: { value: "0.20" } });

    // Slider a cannot exceed d (0.50 mm), updated invariant badge displays
    expect(screen.getByText(/d \(0.50 mm\) ≥ a \(0.20 mm\)/i)).toBeInTheDocument();
  });

  it("toggles comparison with module formulas for N >= 2", () => {
    render(<SSGExplorePage />);

    const compareCheckbox = screen.getByLabelText(/Bandingkan dengan Rumus Modul/i);
    expect(compareCheckbox).not.toBeChecked();

    fireEvent.click(compareCheckbox);
    expect(compareCheckbox).toBeChecked();

    // Comparative table appears
    expect(screen.getByText(/Perbandingan: Puncak Fraunhofer vs Rumus Modul/i)).toBeInTheDocument();
    expect(screen.getByText(/Catatan Fisika Penting:/i)).toBeInTheDocument();
  });

  it("presents clean projection screen in explore mode without markers, preset buttons, or drag tips", () => {
    render(<SSGExplorePage />);

    // Single unified header
    expect(screen.getByText("Layar Proyeksi")).toBeInTheDocument();
    expect(screen.getByText(/1 kotak = 1 mm/i)).toBeInTheDocument();

    // No marker pins T0-T4 or drag instructions in Explore
    expect(screen.queryByText(/T0 \(Terang Pusat\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Klik atau seret jarum penanda/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/1.0× Normal/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/1.8× Praktikum/i)).not.toBeInTheDocument();

    // Only "Kaca pembesar" toggle present initially
    const zoomToggle = screen.getByRole("button", { name: /Kaca pembesar/i });
    expect(zoomToggle).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reset zoom/i })).not.toBeInTheDocument();

    // Toggle zoom -> "Reset zoom" and "resolusi aktif: 0,1 mm" appear
    fireEvent.click(zoomToggle);
    expect(screen.getByRole("button", { name: /Reset zoom/i })).toBeInTheDocument();
    expect(screen.getByText(/resolusi aktif: 0,1 mm/i)).toBeInTheDocument();
  });

  it("renders single hairline readout on cursor hover/touch over screen canvas", () => {
    const { container } = render(<SSGExplorePage />);

    const screenCanvasDiv = container.querySelector(".cursor-crosshair") as HTMLDivElement;
    expect(screenCanvasDiv).toBeInTheDocument();

    // Mock bounding rect: width = 800, left = 0
    screenCanvasDiv.getBoundingClientRect = jest.fn(() => ({
      width: 800,
      height: 176,
      top: 0,
      left: 0,
      right: 800,
      bottom: 176,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));

    // Hover over canvas
    fireEvent.mouseMove(screenCanvasDiv, { clientX: 480 });

    // Expect floating hairline readout with coordinate y and normalized intensity I/I0
    expect(screen.getByText(/y = /i)).toBeInTheDocument();
    expect(screen.getByText(/I\/I0 =/i)).toBeInTheDocument();

    // Mouse leave removes the hairline
    fireEvent.mouseLeave(screenCanvasDiv);
    expect(screen.queryByText(/y = /i)).not.toBeInTheDocument();
  });

  describe("Interactive Titik P in Explore SSG (Item 2 & 3)", () => {
    it("is off by default and toggles on via Geometri Sinar (Titik P)", () => {
      render(<SSGExplorePage />);

      // Default: clean view, no Point P slider, no mono panel
      expect(screen.queryByRole("slider", { name: /Titik P/i })).not.toBeInTheDocument();
      expect(screen.queryByTestId("point-p-mono-panel")).not.toBeInTheDocument();

      // Find toggle button and activate
      const toggleBtn = screen.getByRole("button", { name: /Geometri Sinar \(Titik P\)/i });
      expect(toggleBtn).toBeInTheDocument();
      fireEvent.click(toggleBtn);

      // Now active: slider, mono panel, and ray geometry appear
      expect(screen.getByRole("slider", { name: /Titik P/i })).toBeInTheDocument();
      expect(screen.getByTestId("point-p-mono-panel")).toBeInTheDocument();
      expect(screen.getByTestId("ray-geometry-group")).toBeInTheDocument();
    });

    it("moves Point P by step 0.1 mm via arrow keys", () => {
      render(<SSGExplorePage />);

      // Turn on Point P
      fireEvent.click(screen.getByRole("button", { name: /Geometri Sinar \(Titik P\)/i }));

      const pointPHandle = screen.getByRole("slider", { name: /Titik P/i });
      const initialVal = parseFloat(pointPHandle.getAttribute("aria-valuenow") || "0");

      // Press ArrowRight -> increases by 0.1 mm
      fireEvent.keyDown(pointPHandle, { key: "ArrowRight" });
      const afterRightVal = parseFloat(pointPHandle.getAttribute("aria-valuenow") || "0");
      expect(afterRightVal).toBeCloseTo(initialVal + 0.1, 1);

      // Press ArrowLeft -> decreases by 0.1 mm
      fireEvent.keyDown(pointPHandle, { key: "ArrowLeft" });
      const afterLeftVal = parseFloat(pointPHandle.getAttribute("aria-valuenow") || "0");
      expect(afterLeftVal).toBeCloseTo(initialVal, 1);
    });

    it("moves Point P by dragging on the screen canvas", () => {
      const { container } = render(<SSGExplorePage />);

      // Turn on Point P
      fireEvent.click(screen.getByRole("button", { name: /Geometri Sinar \(Titik P\)/i }));

      const screenCanvasDiv = container.querySelector(".cursor-crosshair") as HTMLDivElement;
      screenCanvasDiv.getBoundingClientRect = jest.fn(() => ({
        width: 800,
        height: 176,
        top: 0,
        left: 0,
        right: 800,
        bottom: 176,
        x: 0,
        y: 0,
        toJSON: () => {},
      }));

      // Click at clientX = 480 (to the right of center 400)
      fireEvent.mouseDown(screenCanvasDiv, { clientX: 480 });

      const pointPHandle = screen.getByRole("slider", { name: /Titik P/i });
      const newVal = parseFloat(pointPHandle.getAttribute("aria-valuenow") || "0");
      expect(newVal).toBeGreaterThan(0);
    });

    it("jumps to adjacent primary bright fringes using jumping buttons", () => {
      render(<SSGExplorePage />);

      // Turn on Point P
      fireEvent.click(screen.getByRole("button", { name: /Geometri Sinar \(Titik P\)/i }));

      const nextBtn = screen.getByRole("button", { name: /Lompat ke terang primer berikutnya/i });
      const prevBtn = screen.getByRole("button", { name: /Lompat ke terang primer sebelumnya/i });
      const pointPHandle = screen.getByRole("slider", { name: /Titik P/i });

      // Jump Next
      const startVal = parseFloat(pointPHandle.getAttribute("aria-valuenow") || "0");
      fireEvent.click(nextBtn);
      const afterNextVal = parseFloat(pointPHandle.getAttribute("aria-valuenow") || "0");
      expect(afterNextVal).toBeGreaterThan(startVal);

      // Jump Prev
      fireEvent.click(prevBtn);
      const afterPrevVal = parseFloat(pointPHandle.getAttribute("aria-valuenow") || "0");
      expect(afterPrevVal).toBeLessThan(afterNextVal);
    });

    it("disables Point P feature when N = 1 (single slit)", () => {
      render(<SSGExplorePage />);

      // Switch to N = 1
      fireEvent.click(screen.getByRole("button", { name: "1", exact: true }));

      // Turn on geometry
      fireEvent.click(screen.getByRole("button", { name: /Geometri Sinar \(Titik P\)/i }));

      // Expect disabled notice
      expect(screen.getByText(/Celah tunggal \(N = 1\): Fitur Titik P/i)).toBeInTheDocument();
      // Jumping buttons should not be present
      expect(screen.queryByRole("button", { name: /Lompat ke terang primer berikutnya/i })).not.toBeInTheDocument();
    });
  });
});
