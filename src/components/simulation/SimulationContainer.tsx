"use client";

import React from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import {
  PlaybackSpeedControl,
  DEFAULT_PLAYBACK_SPEEDS,
} from "./PlaybackSpeedControl";

interface SimulationContainerProps {
  children: React.ReactNode;
  time: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  availableSpeeds?: readonly number[];
  title?: string;
}

function formatSimTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

/**
 * A UI wrapper for simulations, providing playback controls, time display,
 * and speed multipliers.
 */
export function SimulationContainer({
  children,
  time,
  isPlaying,
  onPlay,
  onPause,
  onReset,
  speed,
  onSpeedChange,
  availableSpeeds,
  title = "Simulasi"
}: SimulationContainerProps) {
  return (
    <div className="flex flex-col gap-4 w-full h-full glass-panel rounded-xl overflow-hidden shadow-lg border border-white/10">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-b border-white/5">
        <h2 className="text-lg font-semibold text-white tracking-tight">{title}</h2>
        <div className="flex items-center gap-6">
          {/* Time Display */}
          <div className="font-mono text-xl text-blue-400 font-bold tabular-nums">
            {formatSimTime(time)}
          </div>
        </div>
      </div>

      {/* Main Simulation Area */}
      <div className="flex-1 min-h-[380px] relative bg-black/20 overflow-hidden rounded-xl mx-4 border border-white/5 shadow-inner">
        {children}
      </div>

      {/* Controls Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-white/5 border-t border-white/5">
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <button
              data-testid="btn-pause"
              onClick={onPause}
              className="btn-primary rounded-full w-12 h-12 p-0 flex items-center justify-center shadow-md shadow-blue-500/20"
              aria-label="Jeda Simulasi"
            >
              <Pause className="w-5 h-5 fill-white" />
            </button>
          ) : (
            <button
              data-testid="btn-play"
              onClick={onPlay}
              className="btn-primary rounded-full w-12 h-12 p-0 flex items-center justify-center shadow-md shadow-blue-500/20"
              aria-label="Mulai Simulasi"
            >
              <Play className="w-5 h-5 fill-white ml-1" />
            </button>
          )}
          
          <button
            data-testid="btn-reset"
            onClick={onReset}
            className="btn-ghost rounded-full w-10 h-10 p-0 flex items-center justify-center ml-2"
            aria-label="Reset Simulasi"
          >
            <RotateCcw className="w-4 h-4 text-gray-300" />
          </button>
        </div>

        {/* Playback Speed Controls */}
        <PlaybackSpeedControl
          speed={speed}
          onSpeedChange={onSpeedChange}
          availableSpeeds={availableSpeeds ?? DEFAULT_PLAYBACK_SPEEDS}
        />
      </div>
    </div>
  );
}
