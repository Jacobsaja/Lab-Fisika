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
    const t0 = performance.now();
    render(<SSGExplorePage />);
    const t1 = performance.now();
    const renderTimeMs = t1 - t0;

    // Verify render time is tracked
    expect(renderTimeMs).toBeLessThan(500);

    // Default lambda 632 nm and N = 2
    expect(screen.getAllByText(/632 nm/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/N = 2/i)).toBeInTheDocument();

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
});
