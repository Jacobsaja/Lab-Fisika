import { useState, useEffect, useRef, useCallback } from "react";
import { SimulationModel } from "../core";

interface UseSimulationLoopResult<TState> {
  state: TState;
  time: number;
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (multiplier: number) => void;
  speed: number;
}

/**
 * A custom hook that runs a pure SimulationModel inside a requestAnimationFrame loop.
 * Uses a fixed timestep accumulator to decouple physics from framerate.
 */
export function useSimulationLoop<TParams, TState>(
  model: SimulationModel<TParams, TState>,
  params: TParams,
  fixedDt: number = 1 / 60
): UseSimulationLoopResult<TState> {
  // We keep the simulation state in a ref to avoid recreating the loop closure.
  // We sync it to React state only when we need to render.
  const [renderState, setRenderState] = useState<TState>(() => model.init(params));
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.0);

  const stateRef = useRef<TState>(renderState);
  const timeRef = useRef<number>(0);
  const isPlayingRef = useRef(isPlaying);
  const speedRef = useRef(speed);
  
  // To detect params changes and reset cleanly
  const prevParamsRef = useRef(params);

  // Time tracking
  const lastWallTimeRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);
  const rAFRef = useRef<number | null>(null);

  // Keep refs in sync
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    speedRef.current = speed;
  }, [isPlaying, speed]);

  const internalReset = useCallback((newParams: TParams) => {
    const freshState = model.init(newParams);
    stateRef.current = freshState;
    timeRef.current = 0;
    accumulatorRef.current = 0;
    lastWallTimeRef.current = null;
    setRenderState(freshState);
    setTime(0);
  }, [model]);

  // Reset when params change
  useEffect(() => {
    if (JSON.stringify(prevParamsRef.current) !== JSON.stringify(params)) {
      prevParamsRef.current = params;
      internalReset(params);
    }
  }, [params, internalReset]);

  const play = useCallback(() => {
    if (!isPlayingRef.current) {
      isPlayingRef.current = true;
      lastWallTimeRef.current = null;
      setIsPlaying(true);
    }
  }, []);

  const pause = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    lastWallTimeRef.current = null;
  }, []);

  const reset = useCallback(() => {
    pause();
    internalReset(params);
  }, [pause, internalReset, params]);

  useEffect(() => {
    const loop = (currentWallTime: number) => {
      if (!isPlayingRef.current) {
        lastWallTimeRef.current = currentWallTime; // Keep last time synced while paused
        rAFRef.current = requestAnimationFrame(loop);
        return;
      }

      if (lastWallTimeRef.current === null) {
        lastWallTimeRef.current = currentWallTime;
      }

      // Cap dt to avoid death spirals if tab is inactive for a long time
      let frameTime = (currentWallTime - lastWallTimeRef.current) / 1000;
      if (frameTime > 0.25) {
        frameTime = 0.25;
      }
      lastWallTimeRef.current = currentWallTime;

      // Apply speed multiplier
      accumulatorRef.current += frameTime * speedRef.current;

      let stepsTaken = 0;
      // Fixed timestep loop
      while (accumulatorRef.current >= fixedDt) {
        stateRef.current = model.step(stateRef.current, fixedDt, params);
        timeRef.current += fixedDt;
        accumulatorRef.current -= fixedDt;
        stepsTaken++;
      }

      // Only trigger a React re-render if state actually advanced
      if (stepsTaken > 0) {
        setRenderState(stateRef.current);
        setTime(timeRef.current);
      }

      rAFRef.current = requestAnimationFrame(loop);
    };

    rAFRef.current = requestAnimationFrame(loop);

    return () => {
      if (rAFRef.current !== null) {
        cancelAnimationFrame(rAFRef.current);
      }
    };
  }, [model, params, fixedDt]);

  return {
    state: renderState,
    time,
    isPlaying,
    play,
    pause,
    reset,
    setSpeed,
    speed,
  };
}
