"use client";

import React from "react";
import { Play, Pause, RotateCcw, FastForward } from "lucide-react";

interface SimulationContainerProps {
  children: React.ReactNode;
  time: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
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
  title = "Simulasi"
}: SimulationContainerProps) {
  const SPEEDS = [0.25, 0.5, 1.0, 2.0, 4.0];

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
      <div className="flex-1 relative bg-black/20 overflow-hidden rounded-xl mx-4 border border-white/5 shadow-inner">
        {children}
      </div>

      {/* Controls Footer */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-t border-white/5">
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <button
              onClick={onPause}
              className="btn-primary rounded-full w-12 h-12 p-0 flex items-center justify-center shadow-md shadow-blue-500/20"
              aria-label="Jeda Simulasi"
            >
              <Pause className="w-5 h-5 fill-white" />
            </button>
          ) : (
            <button
              onClick={onPlay}
              className="btn-primary rounded-full w-12 h-12 p-0 flex items-center justify-center shadow-md shadow-blue-500/20"
              aria-label="Mulai Simulasi"
            >
              <Play className="w-5 h-5 fill-white ml-1" />
            </button>
          )}
          
          <button
            onClick={onReset}
            className="btn-ghost rounded-full w-10 h-10 p-0 flex items-center justify-center ml-2"
            aria-label="Reset Simulasi"
          >
            <RotateCcw className="w-4 h-4 text-gray-300" />
          </button>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-2 bg-white/5 rounded-full p-1 border border-white/5">
          <div className="flex items-center justify-center px-3 text-gray-400">
            <FastForward className="w-4 h-4" />
          </div>
          <div className="flex gap-1">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`px-3 py-1.5 text-xs font-mono rounded-full transition-colors ${
                  speed === s 
                    ? "bg-blue-500 text-white shadow-md" 
                    : "text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
