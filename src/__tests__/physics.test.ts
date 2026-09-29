import { renderHook, act } from "@testing-library/react";
import { useSimulationLoop } from "../physics/hooks/useSimulationLoop";
import { SimulationModel, Vec2 } from "../physics/core";

// Mock requestAnimationFrame for deterministic testing
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Physics Core (Particle Stepping)", () => {
  it("should add vectors correctly", () => {
    expect(Vec2.add({ x: 1, y: 2 }, { x: -1, y: 3 })).toEqual({ x: 0, y: 5 });
  });

  it("should scale vectors correctly", () => {
    expect(Vec2.scale({ x: 1, y: -2 }, 2.5)).toEqual({ x: 2.5, y: -5 });
  });
});

describe("Fixed-Timestep Accumulator (useSimulationLoop)", () => {
  // A simple test model
  const TestModel: SimulationModel<{ v: number }, { x: number }> = {
    init: (params) => ({ x: 0 }),
    step: (state, dt, params) => ({ x: state.x + params.v * dt }),
  };

  it("should produce the exact same final state regardless of frame rate (deterministic)", () => {
    let rAFCallback: FrameRequestCallback | null = null;
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rAFCallback = cb;
      return 1;
    });

    const { result } = renderHook(() => useSimulationLoop(TestModel, { v: 10 }, 1 / 60));

    act(() => {
      result.current.play();
    });

    act(() => {
      let t = 100;
      if (rAFCallback) rAFCallback(t);

      // Add exactly 2 seconds over 20 frames (100ms each)
      for (let i = 0; i < 20; i++) {
        t += 100;
        if (rAFCallback) rAFCallback(t);
      }
    });

    const stateFast = result.current.state.x;
    const timeFast = result.current.time;

    // Reset and simulate stuttery frame rate
    act(() => {
      result.current.reset();
      result.current.play();
    });

    act(() => {
      let t = 100;
      if (rAFCallback) rAFCallback(t);

      for (let i = 0; i < 10; i++) {
        t += 200;
        if (rAFCallback) rAFCallback(t);
      }
    });

    const stateSlow = result.current.state.x;
    const timeSlow = result.current.time;

    // We only care that the fixed timestep accumulator is deterministic.
    // They should produce the exact same final state.
    expect(stateFast).toBeCloseTo(stateSlow, 5);
    expect(timeFast).toBeCloseTo(timeSlow, 5);
    
    // Exact equality is expected for deterministic systems, but floating point math might have 
    // negligible rounding differences at the very far ends.
    // Given the simplicity, they should be strictly identical if the accumulator works perfectly.
  });
});
