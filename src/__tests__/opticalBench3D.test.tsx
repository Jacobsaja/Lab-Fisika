import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { OpticalBench3D } from "@/components/practicum/instruments/wave/3d/OpticalBench3D";
import * as webglUtils from "@/components/practicum/instruments/wave/3d/webglUtils";

// Mock @react-three/fiber Canvas
jest.mock("@react-three/fiber", () => ({
  Canvas: ({ children, ...props }: any) => (
    <div data-testid="mock-r3f-canvas" data-frameloop={props.frameloop}>
      {children}
    </div>
  ),
  useThree: () => ({
    camera: {
      position: { clone: () => ({ lerpVectors: jest.fn() }) },
      lookAt: jest.fn(),
      updateProjectionMatrix: jest.fn(),
    },
    invalidate: jest.fn(),
  }),
  useFrame: jest.fn(),
}));

describe("OpticalBench3D (Spike Component)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders 2.5D fallback when WebGL is unavailable", () => {
    jest.spyOn(webglUtils, "isWebGLAvailable").mockReturnValue(false);

    render(
      <OpticalBench3D
        lambdaNm={632}
        N={2}
        distanceL={1.6}
        isLaserOn={true}
      />
    );

    // Fallback banner should be displayed
    expect(screen.getByRole("status")).toHaveTextContent(
      /Akselerasi WebGL tidak didukung pada peramban ini/i
    );

    // 2.5D OpticalBenchApparatus header appears
    expect(screen.getByText(/^Bangku Optik$/i)).toBeInTheDocument();
    expect(screen.queryByTestId("mock-r3f-canvas")).not.toBeInTheDocument();
  });

  it("renders 2.5D fallback when forceFallback2D is true", () => {
    jest.spyOn(webglUtils, "isWebGLAvailable").mockReturnValue(true);

    render(
      <OpticalBench3D
        lambdaNm={532}
        N={3}
        forceFallback2D={true}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      /Mode simulasi cadangan aktif/i
    );
    expect(screen.getByText(/^Bangku Optik$/i)).toBeInTheDocument();
  });

  it("renders 3D toolbar and camera presets when WebGL is available", async () => {
    jest.spyOn(webglUtils, "isWebGLAvailable").mockReturnValue(true);
    const handlePresetChange = jest.fn();

    render(
      <OpticalBench3D
        lambdaNm={632}
        N={2}
        distanceL={1.6}
        cameraPreset="oblique"
        onCameraPresetChange={handlePresetChange}
      />
    );

    // 3D Toolbar with 3 presets
    expect(screen.getByText("Kamera 3D (Preset):")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Serong/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Samping/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tampak Atas/i })).toBeInTheDocument();

    // Switch camera preset
    fireEvent.click(screen.getByRole("button", { name: /Samping/i }));
    expect(handlePresetChange).toHaveBeenCalledWith("side");
  });
});
