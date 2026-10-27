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

    it("calls onResetMarkers and resets active marker when N changes", () => {
      const handleReset = jest.fn();
      const handleSelect = jest.fn();
      const { rerender } = render(
        <ScreenPatternView
          N={2}
          onResetMarkers={handleReset}
          onSelectMarker={handleSelect}
        />
      );

      // Slit changes from N=2 to N=3
      rerender(
        <ScreenPatternView
          N={3}
          onResetMarkers={handleReset}
          onSelectMarker={handleSelect}
        />
      );

      expect(handleReset).toHaveBeenCalledTimes(1);
      expect(handleSelect).toHaveBeenCalledWith(1);
    });

    it("renders light point classification tags (Pusat, Primer, Sekunder) for pins", () => {
      render(
        <ScreenPatternView
          N={3}
          markers={[
            { id: "m0", tn: 0, label: "T0", yMm: 0 },
            { id: "m1", tn: 1, label: "T1", yMm: 1.0 },
            { id: "m2", tn: 2, label: "T2", yMm: 2.0 },
          ]}
        />
      );

      expect(screen.getByText("Pusat")).toBeInTheDocument();
      expect(screen.getByText("Sekunder")).toBeInTheDocument();
      expect(screen.getByText("Primer")).toBeInTheDocument();
    });

    it("renders standby overlay when laser is turned off (dimmer = 0)", () => {
      render(
        <ScreenPatternView
          N={2}
          dimmer={0}
        />
      );

      expect(screen.getByText(/Laser Nonaktif \(Standby\)/i)).toBeInTheDocument();
    });

    it("distinguishes mode 'practicum' (renders markers, presets, drag tip) vs mode 'explore' (no markers, clean header)", () => {
      // 1. Practicum mode
      const { rerender } = render(
        <ScreenPatternView
          mode="practicum"
          N={2}
          markers={[
            { id: "m0", tn: 0, label: "T0", yMm: 0 },
            { id: "m1", tn: 1, label: "T1", yMm: 2.0 },
          ]}
        />
      );

      expect(screen.getByText("T0")).toBeInTheDocument();
      expect(screen.getByText("T1")).toBeInTheDocument();
      expect(screen.getByText("1.0× Normal")).toBeInTheDocument();
      expect(screen.getByText(/Klik pada layar atau seret pin/i)).toBeInTheDocument();

      // 2. Explore mode
      rerender(
        <ScreenPatternView
          mode="explore"
          N={2}
          markers={[
            { id: "m0", tn: 0, label: "T0", yMm: 0 },
            { id: "m1", tn: 1, label: "T1", yMm: 2.0 },
          ]}
        />
      );

      // In explore mode, markers, presets, and drag instructions are NOT rendered
      expect(screen.queryByText("T0")).not.toBeInTheDocument();
      expect(screen.queryByText("T1")).not.toBeInTheDocument();
      expect(screen.queryByText("1.0× Normal")).not.toBeInTheDocument();
      expect(screen.queryByText(/Klik pada layar atau seret pin/i)).not.toBeInTheDocument();
      expect(screen.getByText("Layar Proyeksi")).toBeInTheDocument();
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

    it("displays locked message when T0 is active and navigates to T1", () => {
      const handleSelectTn = jest.fn();
      render(
        <VirtualRulerMarkerTool
          N={2}
          activeTn={0}
          markers={[
            { id: "m0", tn: 0, label: "T0", yMm: 0 },
            { id: "m1", tn: 1, label: "T1", yMm: 0 },
          ]}
          onSelectTn={handleSelectTn}
          onUpdateMarker={jest.fn()}
          onResetMarkers={jest.fn()}
        />
      );

      expect(screen.getByText(/Terang Pusat \(T₀\) = 0.0 mm/i)).toBeInTheDocument();
      const nextBtn = screen.getByRole("button", { name: /Mulai Ukur Terang T₁/i });
      fireEvent.click(nextBtn);
      expect(handleSelectTn).toHaveBeenCalledWith(1);
    });

    it("updates position via interactive range slider", () => {
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

      const slider = screen.getByTitle(/Geser posisi T1/i);
      fireEvent.change(slider, { target: { value: "3.5" } });
      expect(handleUpdate).toHaveBeenCalledWith(1, 3.5, false);
    });

    it("triggers Bantu Semua Puncak and auto-calculates all peaks", () => {
      const handleUpdate = jest.fn();
      render(
        <VirtualRulerMarkerTool
          N={2}
          activeTn={1}
          markers={[
            { id: "m0", tn: 0, label: "T0", yMm: 0 },
            { id: "m1", tn: 1, label: "T1", yMm: 0 },
            { id: "m2", tn: 2, label: "T2", yMm: 0 },
            { id: "m3", tn: 3, label: "T3", yMm: 0 },
            { id: "m4", tn: 4, label: "T4", yMm: 0 },
          ]}
          onSelectTn={jest.fn()}
          onUpdateMarker={handleUpdate}
          onResetMarkers={jest.fn()}
        />
      );

      const assistAllBtn = screen.getByRole("button", { name: /Bantu Semua Puncak/i });
      fireEvent.click(assistAllBtn);
      // Should update T0 to 0, and T1 to T4 with quantized peaks
      expect(handleUpdate).toHaveBeenCalledWith(0, 0, true);
      expect(handleUpdate).toHaveBeenCalledWith(1, 2.0, true);
      expect(handleUpdate).toHaveBeenCalledWith(2, 4.0, true);
      expect(handleUpdate).toHaveBeenCalledWith(3, 6.0, true);
      expect(handleUpdate).toHaveBeenCalledWith(4, 8.0, true);
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

    it("handles mouse hover and displays scaled coordinate readout", () => {
      const { container } = render(
        <IntensityProfileGraph
          N={2}
          spanMm={10}
        />
      );

      const graphDiv = container.querySelector(".cursor-crosshair")!;
      graphDiv.getBoundingClientRect = jest.fn(() => ({
        width: 1520,
        height: 440,
        top: 0,
        left: 0,
        right: 1520,
        bottom: 440,
        x: 0,
        y: 0,
        toJSON: () => {},
      }));

      fireEvent.mouseMove(graphDiv, { clientX: 790, clientY: 100 });
      expect(screen.getByText(/I\/I₀:/i)).toBeInTheDocument();
    });
  });

  describe("OpticalBenchApparatus", () => {
    it("renders bench rail, laser diode status, distance L = 1.60 m, and allows slit switching in practicum mode", () => {
      const handleSelectSlit = jest.fn();
      render(
        <OpticalBenchApparatus
          slitKey="slit2"
          onSelectSlit={handleSelectSlit}
          distanceL={1.6}
          mode="practicum"
        />
      );

      expect(screen.getByText(/^Bangku Optik$/i)).toBeInTheDocument();
      expect(screen.getByText("L = 1.60 m")).toBeInTheDocument();
      expect(screen.getByText("Celah II (N=2)")).toBeInTheDocument();

      // Click Celah III button
      const slit3Btn = screen.getByRole("button", { name: /^Celah III \(N=3\)/i });
      fireEvent.click(slit3Btn);
      expect(handleSelectSlit).toHaveBeenCalledWith("slit3");
    });

    it("dynamically updates laser label, color, and badge based on lambdaNm", () => {
      const { rerender } = render(
        <OpticalBenchApparatus
          lambdaNm={532}
          isLaserOn={true}
          distanceL={1.6}
        />
      );

      // Verify label Laser 532 nm is present and NO static 632 nm is shown
      expect(screen.getByText("Laser 532 nm")).toBeInTheDocument();
      expect(screen.queryByText(/632 nm/i)).not.toBeInTheDocument();

      // Rerender with 400 nm (violet)
      rerender(
        <OpticalBenchApparatus
          lambdaNm={400}
          isLaserOn={true}
          distanceL={1.6}
        />
      );
      expect(screen.getByText("Laser 400 nm")).toBeInTheDocument();
      expect(screen.queryByText(/532 nm/i)).not.toBeInTheDocument();

      // Rerender with 700 nm (red)
      rerender(
        <OpticalBenchApparatus
          lambdaNm={700}
          isLaserOn={true}
          distanceL={1.6}
        />
      );
      expect(screen.getByText("Laser 700 nm")).toBeInTheDocument();
    });

    it("turns off beam and updates status when isLaserOn is false or dimmer is 0", () => {
      const handleToggle = jest.fn();
      const { rerender } = render(
        <OpticalBenchApparatus
          isLaserOn={false}
          onToggleLaser={handleToggle}
          dimmer={1.0}
        />
      );

      expect(screen.getByText(/Laser:\s*Mati/i)).toBeInTheDocument();
      // Beam fan notice text should NOT be rendered when laser is off
      expect(screen.queryByText("skema, tidak berskala")).not.toBeInTheDocument();

      // Dimmer 0
      rerender(
        <OpticalBenchApparatus
          isLaserOn={true}
          onToggleLaser={handleToggle}
          dimmer={0}
        />
      );
      expect(screen.queryByText("skema, tidak berskala")).not.toBeInTheDocument();
    });

    it("renders slit count N dynamically for N = 1 through 6 in disc and inset", () => {
      const { rerender } = render(
        <OpticalBenchApparatus
          N={1}
          aMm={0.04}
          dMm={0.5}
        />
      );

      expect(screen.getByText("Celah Tunggal (N=1)")).toBeInTheDocument();
      expect(screen.getByText("Perbesar Celah (N = 1)")).toBeInTheDocument();

      // Test N = 4
      rerender(
        <OpticalBenchApparatus
          N={4}
          aMm={0.04}
          dMm={0.5}
        />
      );
      expect(screen.getByText("Piringan Celah (N=4)")).toBeInTheDocument();
      expect(screen.getByText("Perbesar Celah (N = 4)")).toBeInTheDocument();

      // Test N = 6
      rerender(
        <OpticalBenchApparatus
          N={6}
          aMm={0.04}
          dMm={0.5}
        />
      );
      expect(screen.getByText("Piringan Celah (N=6)")).toBeInTheDocument();
      expect(screen.getByText("Perbesar Celah (N = 6)")).toBeInTheDocument();
    });

    it("hides slit pills in explore mode and toggles geometry diagram", () => {
      const handleToggleGeom = jest.fn();
      const { rerender } = render(
        <OpticalBenchApparatus
          mode="explore"
          N={2}
          showGeometry={false}
          onToggleGeometry={handleToggleGeom}
        />
      );

      // In explore mode, bottom pills "Pilih Piringan Celah:" should NOT be present
      expect(screen.queryByText("Pilih Piringan Celah:")).not.toBeInTheDocument();

      // Geometry toggle button is available
      const geomBtn = screen.getByRole("button", { name: /diagram geometri/i });
      expect(geomBtn).toBeInTheDocument();
      fireEvent.click(geomBtn);
      expect(handleToggleGeom).toHaveBeenCalledTimes(1);

      // When showGeometry is true, ray optics annotations appear
      rerender(
        <OpticalBenchApparatus
          mode="explore"
          N={2}
          showGeometry={true}
          onToggleGeometry={handleToggleGeom}
        />
      );
      expect(screen.getByText(/Δr = d·sin\(θ\) = λ/i)).toBeInTheDocument();
      expect(screen.getByText("Titik P (Orde 1)")).toBeInTheDocument();
    });
  });
});
