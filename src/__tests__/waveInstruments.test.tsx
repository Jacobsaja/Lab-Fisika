import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ScreenPatternView,
  VirtualRulerMarkerTool,
  IntensityProfileGraph,
  OpticalBenchApparatus,
} from "@/components/practicum/instruments/wave";

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    fillText: jest.fn(),
    createLinearGradient: jest.fn(() => ({
      addColorStop: jest.fn(),
    })),
    setLineDash: jest.fn(),
  })) as any;
});

describe("Wave Optics UI Instruments (Langkah 2)", () => {
  describe("ScreenPatternView", () => {
    it("renders projection screen, active resolution 0.5 mm by default, and allows zoom toggle to 0.1 mm", () => {
      render(
        <ScreenPatternView
          N={2}
          exposure={1.8}
          markers={[
            { id: "m0", tn: 0, label: "T0", yMm: 0 },
            { id: "m1", tn: 1, label: "T1", yMm: 2.0 },
          ]}
        />
      );

      // Default resolution 0.5 mm
      expect(screen.getByText(/Resolusi Aktif:/i)).toBeInTheDocument();
      expect(screen.getByText("0.5 mm")).toBeInTheDocument();

      // Click Zoom Magnifier
      const zoomBtn = screen.getByRole("button", { name: /Kaca Pembesar Zoom/i });
      fireEvent.click(zoomBtn);

      // Now zoom is active with 0.1 mm resolution
      expect(screen.getByText("0.1 mm")).toBeInTheDocument();
      expect(screen.getByText(/Jendela Pembesar Zoom 5×/i)).toBeInTheDocument();
    });

    it("triggers onExposureChange when slider is moved", () => {
      const handleExposure = jest.fn();
      render(
        <ScreenPatternView
          N={5}
          exposure={1.8}
          onExposureChange={handleExposure}
        />
      );

      const slider = screen.getByTitle(/Atur kontras kamera/i);
      fireEvent.change(slider, { target: { value: "3.2" } });
      expect(handleExposure).toHaveBeenCalledWith(3.2);
    });
  });

  describe("VirtualRulerMarkerTool", () => {
    it("renders markers T0 to T4 and handles stepper adjustments", () => {
      const handleUpdate = jest.fn();
      render(
        <VirtualRulerMarkerTool
          N={3}
          activeTn={1}
          markers={[
            { id: "m0", tn: 0, label: "T0", yMm: 0 },
            { id: "m1", tn: 1, label: "T1", yMm: 1.0 },
          ]}
          onSelectTn={jest.fn()}
          onUpdateMarker={handleUpdate}
          onResetMarkers={jest.fn()}
        />
      );

      // Should display T0 to T4 tabs
      expect(screen.getByText("T0")).toBeInTheDocument();
      expect(screen.getByText("T1")).toBeInTheDocument();
      expect(screen.getByText("T2")).toBeInTheDocument();
      expect(screen.getByText("T3")).toBeInTheDocument();
      expect(screen.getByText("T4")).toBeInTheDocument();

      // Click Plus stepper (step = 0.5 mm)
      const plusBtn = screen.getByTitle(/Tambah 0.5 mm/i);
      fireEvent.click(plusBtn);
      expect(handleUpdate).toHaveBeenCalledWith(1, 1.5, false);
    });

    it("triggers assist peak calculation with Fraunhofer exact quantized value", () => {
      const handleUpdate = jest.fn();
      render(
        <VirtualRulerMarkerTool
          N={2}
          activeTn={1}
          markers={[
            { id: "m0", tn: 0, label: "T0", yMm: 0 },
            { id: "m1", tn: 1, label: "T1", yMm: 0 },
          ]}
          onSelectTn={jest.fn()}
          onUpdateMarker={handleUpdate}
          onResetMarkers={jest.fn()}
        />
      );

      const assistBtn = screen.getByRole("button", { name: /Bantu Cari T1/i });
      fireEvent.click(assistBtn);
      // For N = 2, T1 is 2.0181 mm -> quantized to 0.5 mm is 2.0 mm
      expect(handleUpdate).toHaveBeenCalledWith(1, 2.0, true);
    });
  });

  describe("IntensityProfileGraph", () => {
    it("renders SVG with peak labels T0 to T4 and diffraction envelope", () => {
      const { container } = render(
        <IntensityProfileGraph
          N={3}
          showEnvelope={true}
          showPeakLabels={true}
        />
      );

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(screen.getByText(/Grafik Profil Intensitas Fraunhofer/i)).toBeInTheDocument();
      expect(screen.getByText(/Selubung Difraksi sinc²\(β\)/i)).toBeInTheDocument();
      expect(screen.getByText("T0")).toBeInTheDocument();
      expect(screen.getByText("T1")).toBeInTheDocument();
      expect(screen.getByText("T2")).toBeInTheDocument();
    });
  });

  describe("OpticalBenchApparatus", () => {
    it("renders bench rail, laser diode status, distance L = 1.60 m, and allows slit switching", () => {
      const handleSelectSlit = jest.fn();
      render(
        <OpticalBenchApparatus
          slitKey="slit2"
          onSelectSlit={handleSelectSlit}
          distanceL={1.6}
        />
      );

      expect(screen.getByText(/Bangku Optik & Sumber Laser/i)).toBeInTheDocument();
      expect(screen.getByText("L = 1.60 m")).toBeInTheDocument();
      expect(screen.getByText("Celah II (N=2)")).toBeInTheDocument();

      // Click Celah III button
      const slit3Btn = screen.getByRole("button", { name: /^Celah III \(N=3\)/i });
      fireEvent.click(slit3Btn);
      expect(handleSelectSlit).toHaveBeenCalledWith("slit3");
    });
  });
});
