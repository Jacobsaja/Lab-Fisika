"use client";

import { useState, useCallback } from "react";
import { DEFAULT_PLAYBACK_SPEEDS } from "@/components/simulation/PlaybackSpeedControl";

/**
 * Module-level storage mapping a simulation key to its chosen speed multiplier.
 * Persists across component unmounts/remounts within the application session.
 */
const speedStore = new Map<string, number>();

/**
 * Validates if a speed value is present in the standard playback speeds list.
 */
export function isValidPlaybackSpeed(speed: number): boolean {
  return DEFAULT_PLAYBACK_SPEEDS.some((valid) => Math.abs(valid - speed) < 1e-4);
}

/**
 * Returns a valid playback speed, falling back to safeDefault (1.0).
 */
function resolveValidSpeed(candidate: number, safeDefault: number = 1.0): number {
  if (isValidPlaybackSpeed(candidate)) {
    return candidate;
  }
  if (isValidPlaybackSpeed(safeDefault)) {
    return safeDefault;
  }
  return DEFAULT_PLAYBACK_SPEEDS[0]; // 1.0
}

/**
 * Clears all cached playback speeds (primarily for isolated test assertions).
 */
export function clearPersistedPlaybackSpeeds(): void {
  speedStore.clear();
}

/**
 * Custom hook to manage and persist playback speed per apparatus/module key.
 *
 * Behaviors:
 * - Falls back to defaultSpeed if no speed has been chosen yet.
 * - Restores persisted speed on component remount with the same key.
 * - Isolates speeds across different keys.
 * - Strictly rejects speeds not in DEFAULT_PLAYBACK_SPEEDS.
 */
export function usePersistedPlaybackSpeed(
  key: string,
  defaultSpeed: number = 1.0
): [number, (newSpeed: number) => void] {
  const safeDefault = resolveValidSpeed(defaultSpeed, 1.0);

  const [speed, setSpeedState] = useState<number>(() => {
    const existing = speedStore.get(key);
    if (existing !== undefined && isValidPlaybackSpeed(existing)) {
      return existing;
    }
    speedStore.set(key, safeDefault);
    return safeDefault;
  });

  const setSpeed = useCallback(
    (newSpeed: number) => {
      if (!isValidPlaybackSpeed(newSpeed)) {
        return;
      }
      speedStore.set(key, newSpeed);
      setSpeedState(newSpeed);
    },
    [key]
  );

  return [speed, setSpeed] as const;
}
