import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OpticalBench3D } from "@/components/practicum/instruments/wave/3d/OpticalBench3D";
import * as webglUtils from "@/components/practicum/instruments/wave/3d/webglUtils";
import SSGExplorePage, {
  SSG_BENCH_VIEW_STORAGE_KEY,
} from "@/app/explore/gelombang/ssg/page";

// Mock three for Jest CJS environment
jest.mock("three", () => {
  class MockVector3 {
    x: number;
    y: number;
    z: number;
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    copy(v: MockVector3) {
      this.x = v.x;
      this.y = v.y;
      this.z = v.z;
      return this;
    }
    clone() {
      return new MockVector3(this.x, this.y, this.z);
    }
    lerpVectors(v1: MockVector3, v2: MockVector3, alpha: number) {
      this.x = v1.x + (v2.x - v1.x) * alpha;
      this.y = v1.y + (v2.y - v1.y) * alpha;
      this.z = v1.z + (v2.z - v1.z) * alpha;
      return this;
    }
    project() {
      // Deterministic normalized device coordinate mapping for x in [-0.5, 3.0]
      this.x = ((this.x - 1.2) / 2.2);
      this.y = 0;
      this.z = 0;
      return this;
    }
  }

  class MockPerspectiveCamera {
    position = new MockVector3();
    lookAt = jest.fn();
    updateMatrixWorld = jest.fn();
    updateProjectionMatrix = jest.fn();
  }

  class MockDataTexture {
    data: Uint8Array;
    width: number;
    height: number;
    minFilter = 0;
    magFilter = 0;
    wrapS = 0;
    wrapT = 0;
    needsUpdate = false;
    constructor(data: Uint8Array, width: number, height: number) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  }

  return {
    Vector3: MockVector3,
    PerspectiveCamera: MockPerspectiveCamera,
    DataTexture: MockDataTexture,
    RGBAFormat: 1023,
    UnsignedByteType: 1009,
    LinearFilter: 1006,
    ClampToEdgeWrapping: 1001,
    AdditiveBlending: 2,
    DoubleSide: 2,
  };
});

// Mock @react-three/fiber Canvas with stable references
const mockThreeState = {
  gl: {
    getContext: () => null,
    domElement: {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    render: jest.fn(),
  },
  scene: {},
  camera: {
    position: {
      copy: jest.fn(),
      clone: () => ({ lerpVectors: jest.fn() }),
      lerpVectors: jest.fn(),
    },
    lookAt: jest.fn(),
    updateProjectionMatrix: jest.fn(),
  },
  invalidate: jest.fn(),
};

jest.mock("@react-three/fiber", () => ({
  Canvas: ({ ...props }: any) => (
    <canvas data-testid="mock-r3f-canvas" data-frameloop={props.frameloop} />
  ),
  useThree: () => mockThreeState,
  useFrame: jest.fn(),
}));

describe("OpticalBench3D & Explore SSG 3D Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it("renders 2.5D fallback with status message when WebGL is unavailable", () => {
    jest.spyOn(webglUtils, "isWebGLAvailable").mockReturnValue(false);

    render(
      <OpticalBench3D
        lambdaNm={632}
        N={2}
        distanceL={1.6}
        isLaserOn={true}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      /Akselerasi WebGL tidak didukung pada peramban ini/i
    );
    expect(screen.getByText(/^Bangku Optik$/i)).toBeInTheDocument();
    expect(screen.queryByTestId("mock-r3f-canvas")).not.toBeInTheDocument();
  });

  it("falls back automatically to 2.5D when webglcontextlost fires on the 3D canvas", async () => {
    jest.spyOn(webglUtils, "isWebGLAvailable").mockReturnValue(true);

    render(
      <OpticalBench3D
        lambdaNm={532}
        N={3}
        distanceL={1.6}
        isLaserOn={true}
      />
    );

    const canvasWrapper = await screen.findByTestId("optical-bench-3d-canvas");
    expect(canvasWrapper).toHaveAttribute(
      "aria-label",
      expect.stringMatching(/532 nm.*N = 3.*L = 1\.60 m.*laser Aktif/i)
    );

    fireEvent(canvasWrapper, new Event("webglcontextlost", { bubbles: false, cancelable: true }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        /Konteks WebGL terputus\. Beralih otomatis ke Bangku Optik 2\.5D/i
      );
    });
  });

  it("renders 3D camera presets, projected HTML labels, inset Perbesar Celah, and Point P controls", async () => {
    jest.spyOn(webglUtils, "isWebGLAvailable").mockReturnValue(true);
    const handlePresetChange = jest.fn();
    const handleToggleGeometry = jest.fn();

    render(
      <OpticalBench3D
        mode="explore"
        lambdaNm={632}
        N={2}
        aMm={0.04}
        dMm={0.5}
        distanceL={1.6}
        isLaserOn={true}
        showGeometry={true}
        onToggleGeometry={handleToggleGeometry}
        pointPYMm={2.02}
        cameraPreset="oblique"
        onCameraPresetChange={handlePresetChange}
      />
    );

    await screen.findByTestId("optical-bench-3d-canvas");

    // 3 camera presets with aria-labels
    const sideBtn = screen.getByRole("button", { name: /Preset kamera Samping/i });
    const topBtn = screen.getByRole("button", { name: /Preset kamera Tampak Atas/i });
    expect(screen.getByRole("button", { name: /Preset kamera Serong/i })).toBeInTheDocument();
    expect(sideBtn).toBeInTheDocument();
    expect(topBtn).toBeInTheDocument();

    fireEvent.click(sideBtn);
    expect(handlePresetChange).toHaveBeenCalledWith("side");

    // HTML Inset "Perbesar Celah" and Projected 3D Labels
    expect(screen.getByTestId("inset-perbesar-celah-3d")).toHaveTextContent(/Perbesar Celah/i);
    expect(screen.getByTestId("label-3d-a")).toHaveTextContent("a = 0.04 mm");
    expect(screen.getByTestId("label-3d-d")).toHaveTextContent("d = 0.50 mm");
    expect(screen.getByTestId("label-3d-L")).toHaveTextContent("L = 1.60 m (160 cm)");
    expect(screen.getByTestId("label-3d-laser")).toHaveTextContent(/Laser/i);
    expect(screen.getByTestId("label-3d-slit")).toHaveTextContent(/Piringan Celah/i);
    expect(screen.getByTestId("label-3d-screen")).toHaveTextContent(/Layar/i);
    expect(screen.getByTestId("label-3d-point-p")).toHaveTextContent(/Titik P/i);
    expect(screen.getByTestId("label-3d-rail-0")).toHaveTextContent("0 cm");
    expect(screen.getByTestId("label-3d-rail-150")).toHaveTextContent("150 cm");
    expect(screen.getByTestId("label-3d-rail-300")).toHaveTextContent("300 cm");

    // Point P Mono Panel & Geometri Sinar button behave identically to 2.5D
    expect(screen.getByTestId("point-p-mono-panel")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Diagram Geometri Sinar \(Titik P\)/i }));
    expect(handleToggleGeometry).toHaveBeenCalledTimes(1);
  });

  it("Explore SSG defaults to 2.5D, persists 3D selection in localStorage, and survives fallback when 3D fails", async () => {
    jest.spyOn(webglUtils, "isWebGLAvailable").mockReturnValue(true);

    const { unmount } = render(<SSGExplorePage />);

    const btn25D = screen.getByRole("button", { name: "Tampilan Bangku Optik 2.5D" });
    const btn3D = screen.getByRole("button", { name: "Tampilan Bangku Optik 3D" });

    // Default is 2.5D (3D canvas not mounted)
    expect(btn25D).toHaveAttribute("aria-pressed", "true");
    expect(btn3D).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByTestId("optical-bench-3d-wrapper")).not.toBeInTheDocument();

    // Switch to 3D and verify localStorage persistence
    fireEvent.click(btn3D);
    expect(btn3D).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem(SSG_BENCH_VIEW_STORAGE_KEY)).toBe("3D");
    expect(await screen.findByTestId("optical-bench-3d-wrapper")).toBeInTheDocument();

    unmount();

    // Remount with saved "3D" preference when WebGL fails -> automatically falls back to 2.5D without crashing
    jest.spyOn(webglUtils, "isWebGLAvailable").mockReturnValue(false);
    render(<SSGExplorePage />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        /Akselerasi WebGL tidak didukung pada peramban ini/i
      );
    });
    expect(screen.getByText(/^Bangku Optik$/i)).toBeInTheDocument();
  });
});
