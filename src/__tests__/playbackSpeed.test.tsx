import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";
import { useSimulationLoop } from "../physics/hooks/useSimulationLoop";
import { SimulationModel } from "../physics/core";
import {
  PlaybackSpeedControl,
  DEFAULT_PLAYBACK_SPEEDS,
  formatSpeedLabel,
} from "../components/simulation/PlaybackSpeedControl";
import {
  usePersistedPlaybackSpeed,
  clearPersistedPlaybackSpeeds,
} from "../physics/hooks/usePersistedPlaybackSpeed";

describe("PlaybackSpeed Foundation (useSimulationLoop & PlaybackSpeedControl)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const LinearModel: SimulationModel<{ v: number }, { x: number }> = {
    init: () => ({ x: 0 }),
    step: (state, dt, params) => ({ x: state.x + params.v * dt }),
  };

  describe("formatSpeedLabel", () => {
    it("formats speeds with Indonesian comma and multiplication symbol", () => {
      expect(formatSpeedLabel(1)).toBe("1×");
      expect(formatSpeedLabel(0.75)).toBe("0,75×");
      expect(formatSpeedLabel(0.5)).toBe("0,5×");
      expect(formatSpeedLabel(0.25)).toBe("0,25×");
      expect(formatSpeedLabel(2)).toBe("2×");
    });
  });

  describe("useSimulationLoop with Playback Speed", () => {
    it("accumulates simTime proportionally to timeScale (1x, 0.75x, 0.5x, 0.25x)", () => {
      const speeds = [1.0, 0.75, 0.5, 0.25];

      for (const targetSpeed of speeds) {
        let rAFCallback: FrameRequestCallback | null = null;
        jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
          rAFCallback = cb;
          return 1;
        });

        const { result } = renderHook(() =>
          useSimulationLoop(LinearModel, { v: 10 }, 0.025, {
            initialSpeed: targetSpeed,
          })
        );

        act(() => {
          result.current.play();
        });

        // Simulate 1 second of wall time over 20 frames (50 ms each)
        act(() => {
          let wallTime = 1000;
          if (rAFCallback) rAFCallback(wallTime);

          for (let i = 0; i < 20; i++) {
            wallTime += 50; // 20 * 50ms = 1000ms = 1.0s
            if (rAFCallback) rAFCallback(wallTime);
          }
        });

        // Expected simTime = 1.0 s * targetSpeed
        const expectedSimTime = 1.0 * targetSpeed;
        expect(result.current.simTime).toBeCloseTo(expectedSimTime, 2);
        expect(result.current.time).toBeCloseTo(expectedSimTime, 2);
        // And model state should be x = v * simTime
        expect(result.current.state.x).toBeCloseTo(10 * expectedSimTime, 2);

        jest.restoreAllMocks();
      }
    });

    it("clamps large wall dt when browser tab lags or is inactive", () => {
      let rAFCallback: FrameRequestCallback | null = null;
      jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
        rAFCallback = cb;
        return 1;
      });

      // Clamp to 0.1 s
      const { result } = renderHook(() =>
        useSimulationLoop(LinearModel, { v: 10 }, 0.025, {
          initialSpeed: 1.0,
          maxFrameTime: 0.1,
        })
      );

      act(() => {
        result.current.play();
      });

      act(() => {
        let wallTime = 1000;
        if (rAFCallback) rAFCallback(wallTime);

        // Huge wall time jump (3 seconds lag in background tab)
        wallTime += 3000;
        if (rAFCallback) rAFCallback(wallTime);
      });

      // dtWall should have been clamped to 0.1s, so simTime should be 0.1s, not 3.0s
      expect(result.current.simTime).toBeCloseTo(0.1, 2);

      jest.restoreAllMocks();
    });

    it("does not advance simTime while paused", () => {
      let rAFCallback: FrameRequestCallback | null = null;
      jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
        rAFCallback = cb;
        return 1;
      });

      const { result } = renderHook(() =>
        useSimulationLoop(LinearModel, { v: 10 }, 0.025)
      );

      act(() => {
        result.current.play();
      });

      // Run for 0.5s (10 frames of 50ms = 500ms)
      act(() => {
        let wallTime = 1000;
        if (rAFCallback) rAFCallback(wallTime);
        for (let i = 0; i < 10; i++) {
          wallTime += 50;
          if (rAFCallback) rAFCallback(wallTime);
        }
      });

      const pausedTime = result.current.simTime;
      expect(pausedTime).toBeCloseTo(0.5, 2);

      // Pause
      act(() => {
        result.current.pause();
      });

      // Wall time passes while paused
      act(() => {
        let wallTime = 2000;
        for (let i = 0; i < 10; i++) {
          wallTime += 50;
          if (rAFCallback) rAFCallback(wallTime);
        }
      });

      // simTime must not have moved
      expect(result.current.simTime).toBe(pausedTime);

      jest.restoreAllMocks();
    });

    it("resets simTime to 0 on reset but strictly preserves chosen speed multiplier", () => {
      let rAFCallback: FrameRequestCallback | null = null;
      jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
        rAFCallback = cb;
        return 1;
      });

      const { result } = renderHook(() =>
        useSimulationLoop(LinearModel, { v: 10 }, 1 / 100)
      );

      // Change speed to 0.25
      act(() => {
        result.current.setSpeed(0.25);
        result.current.play();
      });

      act(() => {
        let wallTime = 1000;
        if (rAFCallback) rAFCallback(wallTime);
        for (let i = 0; i < 10; i++) {
          wallTime += 50;
          if (rAFCallback) rAFCallback(wallTime);
        }
      });

      expect(result.current.simTime).toBeGreaterThan(0);
      expect(result.current.speed).toBe(0.25);

      // Reset
      act(() => {
        result.current.reset();
      });

      // Time should be reset to 0, but speed remains 0.25
      expect(result.current.simTime).toBe(0);
      expect(result.current.time).toBe(0);
      expect(result.current.speed).toBe(0.25);

      jest.restoreAllMocks();
    });
  });

  describe("PlaybackSpeedControl UI Component", () => {
    it("renders with radiogroup semantics and standard speeds 1x, 0.75x, 0.5x, 0.25x in order", () => {
      const handleChange = jest.fn();
      render(
        <PlaybackSpeedControl speed={1.0} onSpeedChange={handleChange} />
      );

      const group = screen.getByRole("radiogroup", { name: "Kecepatan simulasi" });
      expect(group).toBeInTheDocument();

      const radios = screen.getAllByRole("radio");
      expect(radios).toHaveLength(4);

      // Order left to right: 1×, 0,75×, 0,5×, 0,25×
      expect(radios[0]).toHaveTextContent("1×");
      expect(radios[1]).toHaveTextContent("0,75×");
      expect(radios[2]).toHaveTextContent("0,5×");
      expect(radios[3]).toHaveTextContent("0,25×");

      // 1x is selected
      expect(radios[0]).toHaveAttribute("aria-checked", "true");
      expect(radios[0]).toHaveAttribute("tabindex", "0");
      expect(radios[1]).toHaveAttribute("aria-checked", "false");
      expect(radios[1]).toHaveAttribute("tabindex", "-1");
    });

    it("triggers onSpeedChange when a radio button is clicked", () => {
      const handleChange = jest.fn();
      render(
        <PlaybackSpeedControl speed={1.0} onSpeedChange={handleChange} />
      );

      const btnHalf = screen.getByRole("radio", { name: "0,5×" });
      fireEvent.click(btnHalf);

      expect(handleChange).toHaveBeenCalledWith(0.5);
    });

    it("supports keyboard navigation with arrow keys (radiogroup roving tabindex)", () => {
      const handleChange = jest.fn();
      render(
        <PlaybackSpeedControl speed={1.0} onSpeedChange={handleChange} />
      );

      const radios = screen.getAllByRole("radio");
      radios[0].focus();

      // ArrowRight advances to 0,75×
      fireEvent.keyDown(radios[0], { key: "ArrowRight" });
      expect(handleChange).toHaveBeenCalledWith(0.75);

      // ArrowDown advances to 0,5× from index 1
      fireEvent.keyDown(radios[1], { key: "ArrowDown" });
      expect(handleChange).toHaveBeenCalledWith(0.5);

      // ArrowLeft goes back to 1× from index 1
      fireEvent.keyDown(radios[1], { key: "ArrowLeft" });
      expect(handleChange).toHaveBeenCalledWith(1.0);
    });

    it("supports custom availableSpeeds if provided", () => {
      const handleChange = jest.fn();
      const customSpeeds = [0.25, 0.5, 1.0, 2.0, 4.0];
      render(
        <PlaybackSpeedControl
          speed={2.0}
          onSpeedChange={handleChange}
          availableSpeeds={customSpeeds}
        />
      );

      const radios = screen.getAllByRole("radio");
      expect(radios).toHaveLength(5);
      expect(radios[3]).toHaveTextContent("2×");
      expect(radios[3]).toHaveAttribute("aria-checked", "true");
      expect(radios[4]).toHaveTextContent("4×");
    });
  });

  describe("usePersistedPlaybackSpeed hook", () => {
    beforeEach(() => {
      clearPersistedPlaybackSpeeds();
    });

    it("uses defaultSpeed when no value has been chosen yet", () => {
      const { result } = renderHook(() => usePersistedPlaybackSpeed("test-module", 0.5));
      expect(result.current[0]).toBe(0.5);
    });

    it("falls back to 1.0 if an invalid defaultSpeed is provided", () => {
      const { result } = renderHook(() => usePersistedPlaybackSpeed("test-invalid", 3.14));
      expect(result.current[0]).toBe(1.0);
    });

    it("persists chosen speed across component remounts with the same key", () => {
      const { result: firstMount, unmount } = renderHook(() =>
        usePersistedPlaybackSpeed("gmb-key", 1.0)
      );

      expect(firstMount.current[0]).toBe(1.0);

      // Change speed to 0.25x
      act(() => {
        firstMount.current[1](0.25);
      });
      expect(firstMount.current[0]).toBe(0.25);

      // Unmount first component instance
      unmount();

      // Remount a second component instance with the same key
      const { result: secondMount } = renderHook(() =>
        usePersistedPlaybackSpeed("gmb-key", 1.0)
      );
      // Must retain 0.25x!
      expect(secondMount.current[0]).toBe(0.25);
    });

    it("isolates choices across different keys", () => {
      const { result: hookA } = renderHook(() => usePersistedPlaybackSpeed("module-A", 1.0));
      const { result: hookB } = renderHook(() => usePersistedPlaybackSpeed("module-B", 0.5));

      expect(hookA.current[0]).toBe(1.0);
      expect(hookB.current[0]).toBe(0.5);

      act(() => {
        hookA.current[1](0.75);
      });

      expect(hookA.current[0]).toBe(0.75);
      expect(hookB.current[0]).toBe(0.5);
    });

    it("rejects values outside DEFAULT_PLAYBACK_SPEEDS without mutating stored state", () => {
      const { result } = renderHook(() => usePersistedPlaybackSpeed("module-clamp", 1.0));

      act(() => {
        result.current[1](2.5); // Invalid: not in [1, 0.75, 0.5, 0.25]
      });

      // Should remain 1.0
      expect(result.current[0]).toBe(1.0);

      act(() => {
        result.current[1](-1); // Invalid
      });
      expect(result.current[0]).toBe(1.0);
    });
  });
});
