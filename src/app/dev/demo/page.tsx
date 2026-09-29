"use client";

import React, { useState, useEffect, useRef } from "react";
import { SimulationModel, Particle, Vector2, Vec2 } from "@/physics/core";
import { useSimulationLoop } from "@/physics/hooks/useSimulationLoop";
import { SimulationContainer } from "@/components/simulation/SimulationContainer";
import { CartesianPlane } from "@/components/simulation/CartesianPlane";
import { LineGraph, DataPoint } from "@/components/simulation/LineGraph";
import { NumberInput } from "@/components/ui/NumberInput";

// ─── Demo Physics Model ────────────────────────────────────────────────────────

interface DemoParams {
  initialX: number;
  initialY: number;
  velocityX: number;
}

interface DemoState {
  particle: Particle;
}

const DemoModel: SimulationModel<DemoParams, DemoState> = {
  init(params) {
    return {
      particle: {
        position: { x: params.initialX, y: params.initialY },
        velocity: { x: params.velocityX, y: 0 },
        mass: 1,
        radius: 1,
      },
    };
  },
  step(state, dt) {
    // Pure integration: p = p + v*dt
    const nextPos = Vec2.add(state.particle.position, Vec2.scale(state.particle.velocity, dt));
    return {
      particle: {
        ...state.particle,
        position: nextPos,
      },
    };
  },
};

// ─── Demo Page ────────────────────────────────────────────────────────────────

export default function DemoSimulationPage() {
  const [params, setParams] = useState<DemoParams>({
    initialX: -5,
    initialY: 0,
    velocityX: 2,
  });

  const { state, time, isPlaying, play, pause, reset, speed, setSpeed } =
    useSimulationLoop(DemoModel, params);

  // Collect history for the graph
  const [history, setHistory] = useState<DataPoint[]>([]);
  
  useEffect(() => {
    if (time === 0) {
      setHistory([{ t: 0, val: state.particle.position.x }]);
    } else {
      // Throttle graph updates slightly to avoid massive arrays, or just push every frame since it's a demo
      setHistory(prev => [...prev, { t: time, val: state.particle.position.x }]);
    }
  }, [time, state.particle.position.x]);

  return (
    <div className="p-8 max-w-6xl mx-auto h-screen flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Simulation Framework Demo</h1>
        <p className="text-gray-400 text-sm">
          A pure, deterministic physics loop decoupled from frame rate. The particle moves at a constant velocity.
        </p>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Left Column: UI Controls */}
        <div className="w-80 flex flex-col gap-6 overflow-y-auto">
          <div className="card p-6 flex flex-col gap-4">
            <h3 className="font-semibold text-white">Parameter</h3>
            <NumberInput
              label="Kecepatan Awal (X)"
              value={params.velocityX}
              onChange={(val) => setParams((p) => ({ ...p, velocityX: val }))}
              min={-10}
              max={10}
              step={0.5}
              unit="m/s"
            />
            <p className="text-xs text-gray-500 mt-2">
              Mengubah parameter akan me-reset simulasi ke t=0.
            </p>
          </div>
          
          <div className="card p-6 flex flex-col gap-4 flex-1">
            <h3 className="font-semibold text-white">Grafik Posisi X</h3>
            <div className="flex-1 min-h-[200px] relative">
              {/* Responsive container for the graph */}
              <div className="absolute inset-0">
                <LineGraph
                  data={history}
                  width={280}
                  height={200}
                  yLabel="X (m)"
                  timeWindow={10}
                  color="#3B82F6"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Simulation View */}
        <div className="flex-1">
          <SimulationContainer
            time={time}
            isPlaying={isPlaying}
            onPlay={play}
            onPause={pause}
            onReset={reset}
            speed={speed}
            onSpeedChange={setSpeed}
            title="Sistem Partikel 1D"
          >
            <CartesianPlane width={800} height={600} pixelsPerUnit={40}>
              {/* Render the particle */}
              <circle
                cx={state.particle.position.x}
                cy={state.particle.position.y}
                r={0.5} // World units
                fill="#3B82F6"
                className="shadow-glow"
              />
              <text 
                x={state.particle.position.x} 
                y={state.particle.position.y - 0.8} 
                fill="white" 
                fontSize={0.4} 
                textAnchor="middle"
                style={{ transform: "scale(1, -1)" }}
              >
                ({state.particle.position.x.toFixed(1)})
              </text>
            </CartesianPlane>
          </SimulationContainer>
        </div>
      </div>
    </div>
  );
}
