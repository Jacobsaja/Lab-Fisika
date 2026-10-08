"use client";

import React, { useState } from "react";
import { ExploreShell } from "@/components/explore/ExploreShell";
import { TorsionalPendulum } from "@/components/practicum/instruments/TorsionalPendulum";
import { ParameterSlider } from "@/components/ui/NumberInput";
import { Play, Square, RotateCcw } from "lucide-react";
import { rodInertia, loadInertia, totalInertia } from "@/physics/torsionalOscillation";

export default function TorsionalOscillationExplorePage() {
  const [rodLengthCm, setRodLengthCm] = useState(60);
  const [rodMassKg, setRodMassKg] = useState(0.5);
  const [load1MassKg, setLoad1MassKg] = useState(0.2);
  const [load2MassKg, setLoad2MassKg] = useState(0.2);
  const [radiusCm, setRadiusCm] = useState(20);
  const [kappa, setKappa] = useState(0.5); // N m / rad
  const [initialAngleDeg, setInitialAngleDeg] = useState(90);
  
  const I0 = 0.005; // Base inertia of the holding clamp
  const I_rod = rodInertia(rodMassKg, rodLengthCm);
  const I_load = loadInertia(load1MassKg, load2MassKg, radiusCm);
  const I_total = totalInertia(I0, I_rod, I_load);

  const pendulumRef = React.useRef<any>(null);

  return (
    <ExploreShell
      title="Osilasi Torsional"
      category="Mekanika"
      description="Eksplorasi gerak osilasi pendulum torsi. Atur massa batang, beban, jarak beban dari pusat rotasi, serta konstanta torsi kawat untuk melihat pengaruhnya pada periode dan frekuensi sudut."
    >
      <div className="w-full h-full flex flex-col md:flex-row gap-6">
        
        {/* Controls Panel */}
        <div className="w-full md:w-[350px] flex flex-col gap-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 overflow-y-auto">
          <div className="flex gap-4 mb-4">
            <button onClick={() => pendulumRef.current?.start()} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl font-bold transition-all">
              <Play className="w-5 h-5" /> Play
            </button>
            <button onClick={() => pendulumRef.current?.pause()} className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white p-3 rounded-xl font-bold transition-all">
              <Square className="w-5 h-5" /> Pause
            </button>
            <button onClick={() => pendulumRef.current?.reset()} className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white p-3 rounded-xl font-bold transition-all">
              <RotateCcw className="w-5 h-5" /> Reset
            </button>
          </div>

          <div className="space-y-4">
            <ParameterSlider
              label="Massa Batang (kg)"
              value={rodMassKg}
              min={0.1}
              max={2.0}
              step={0.1}
              onChange={setRodMassKg}
            />
            <ParameterSlider
              label="Panjang Batang (cm)"
              value={rodLengthCm}
              min={20}
              max={100}
              step={5}
              onChange={setRodLengthCm}
            />
            <ParameterSlider
              label="Massa Beban 1 (kg)"
              value={load1MassKg}
              min={0}
              max={1.0}
              step={0.05}
              onChange={setLoad1MassKg}
            />
            <ParameterSlider
              label="Massa Beban 2 (kg)"
              value={load2MassKg}
              min={0}
              max={1.0}
              step={0.05}
              onChange={setLoad2MassKg}
            />
            <ParameterSlider
              label="Jari-jari / Jarak Beban (cm)"
              value={radiusCm}
              min={0}
              max={50}
              step={5}
              onChange={setRadiusCm}
            />
            <ParameterSlider
              label="Konstanta Torsi κ (N·m/rad)"
              value={kappa}
              min={0.1}
              max={5.0}
              step={0.1}
              onChange={setKappa}
            />
            <ParameterSlider
              label="Sudut Awal (°)"
              value={initialAngleDeg}
              min={10}
              max={180}
              step={10}
              onChange={setInitialAngleDeg}
            />
          </div>
          
          <div className="mt-4 p-4 bg-slate-800 rounded-xl border border-slate-700">
            <h3 className="text-slate-300 font-bold mb-2">Nilai Inersia (I)</h3>
            <div className="flex justify-between text-sm text-slate-400">
              <span>I Batang:</span>
              <span className="text-slate-200 font-mono">{I_rod.toFixed(4)} kg·m²</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400 mt-1">
              <span>I Beban:</span>
              <span className="text-slate-200 font-mono">{I_load.toFixed(4)} kg·m²</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400 mt-1">
              <span>I Total (termasuk I₀):</span>
              <span className="text-sky-400 font-bold font-mono">{I_total.toFixed(4)} kg·m²</span>
            </div>
          </div>
        </div>

        {/* Visualizer Panel */}
        <div className="flex-1 flex items-center justify-center bg-slate-900/30 rounded-2xl border border-slate-800 p-8">
          <div className="w-full max-w-[600px] aspect-square">
            <TorsionalPendulum
              ref={pendulumRef}
              mode="explore"
              rodLengthCm={rodLengthCm}
              radiusCm={radiusCm}
              totalInertia={I_total}
              kappa={kappa}
              initialAngleDeg={initialAngleDeg}
              className="w-full h-full shadow-none border-none bg-transparent"
            />
          </div>
        </div>
        
      </div>
    </ExploreShell>
  );
}
