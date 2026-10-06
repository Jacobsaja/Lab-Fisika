"use client";

import React, { useState } from "react";
import { ExploreShell } from "@/components/explore/ExploreShell";
import { FreeFallApparatus } from "@/components/practicum/instruments/FreeFallApparatus";
import { calculateFallTime, getVelocity, getDisplacement } from "@/physics/freefall";
import { Info, Calculator, Settings, Activity, RotateCcw } from "lucide-react";

const PLANETS = [
  { id: "bumi", name: "Bumi", g: 9.81 },
  { id: "bulan", name: "Bulan", g: 1.62 },
  { id: "mars", name: "Mars", g: 3.71 },
  { id: "jupiter", name: "Jupiter", g: 24.79 },
  { id: "kustom", name: "Kustom", g: 9.81 },
];

export default function GJBExplorePage() {
  const [activePlanetId, setActivePlanetId] = useState("bumi");
  const [customG, setCustomG] = useState(9.81);
  const [height, setHeight] = useState(10.0);
  const [mass, setMass] = useState(100);

  // Live state from simulation
  const [simTime, setSimTime] = useState(0);
  const [isFalling, setIsFalling] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const activePlanet = PLANETS.find(p => p.id === activePlanetId) || PLANETS[0];
  const g = activePlanetId === "kustom" ? customG : activePlanet.g;

  // Theoretical predictions
  const { t: predictedT } = calculateFallTime(height, g, false);
  const predictedV = getVelocity(predictedT, g);

  // Live readouts
  const liveV = getVelocity(simTime, g);
  const hFallen = getDisplacement(simTime, g);
  const remainingY = Math.max(0, height - hFallen);

  const handleTimeChange = (t: number, falling: boolean, reset: boolean) => {
    setSimTime(t);
    if (reset) {
      setIsFalling(false);
    } else {
      setIsFalling(falling);
    }
  };

  const handleReset = () => {
    setResetKey(prev => prev + 1);
    setSimTime(0);
    setIsFalling(false);
  };

  return (
    <ExploreShell
      title="Gerak Jatuh Bebas"
      category="Mekanika"
      description="Eksplorasi percepatan gravitasi tanpa hambatan udara. Amati bagaimana ketinggian dan gravitasi planet memengaruhi waktu jatuh dan kecepatan benda."
    >
      <div className="flex flex-col gap-6 p-4 sm:p-6 w-full">
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-5">
            <h3 className="font-bold text-white/90 flex items-center gap-2"><Settings className="w-4 h-4"/> Parameter Percobaan</h3>
            
            {/* Planet Selection */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-white/50 font-bold uppercase tracking-wider">Lokasi / Gravitasi (g)</label>
              <div className="flex flex-wrap gap-2">
                {PLANETS.map(p => (
                  <button 
                    key={p.id} 
                    onClick={() => setActivePlanetId(p.id)} 
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activePlanetId === p.id ? "bg-blue-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              {activePlanetId === "kustom" && (
                <div className="mt-2 flex gap-2 items-center">
                  <input type="range" min={0.1} max={30} step={0.1} value={customG} onChange={e => setCustomG(parseFloat(e.target.value))} className="flex-1" />
                  <span className="font-mono text-sm text-white bg-black/30 px-2 py-1 rounded">{customG} m/s²</span>
                </div>
              )}
              {activePlanetId !== "kustom" && (
                <div className="mt-1 text-sm font-mono text-blue-300">g = {g} m/s²</div>
              )}
            </div>

            {/* Height Selection */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-white/50 font-bold uppercase tracking-wider flex justify-between">
                <span>Tinggi Jatuh (H)</span>
                <span className="text-white font-mono">{height.toFixed(2)} m</span>
              </label>
              <input type="range" min={0.2} max={12.0} step={0.1} value={height} onChange={e => setHeight(parseFloat(e.target.value))} className="w-full" />
            </div>

            {/* Mass Selection */}
            <div className="flex flex-col gap-2 bg-black/20 p-3 rounded-lg border border-white/5">
              <label className="text-xs text-white/50 font-bold uppercase tracking-wider flex justify-between">
                <span>Massa Benda (m)</span>
                <span className="text-white font-mono">{mass} g</span>
              </label>
              <input type="range" min={10} max={1000} step={10} value={mass} onChange={e => setMass(parseInt(e.target.value))} className="w-full" />
              <div className="text-[11px] text-amber-400/80 flex items-start gap-1.5 mt-1">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Massa tidak memengaruhi waktu jatuh dalam kondisi tanpa hambatan udara (vakum). Silakan buktikan sendiri.</span>
              </div>
            </div>
          </div>

          {/* Predictions & Live Readouts */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-5">
              <h3 className="font-bold text-indigo-300 flex items-center gap-2 mb-4"><Calculator className="w-4 h-4"/> Prediksi Teoritis</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-indigo-400/70 mb-1">Waktu Jatuh (t)</div>
                  <div className="font-mono text-2xl text-white">{predictedT.toFixed(3)} s</div>
                </div>
                <div>
                  <div className="text-xs text-indigo-400/70 mb-1">Kecepatan Tumbuk (v)</div>
                  <div className="font-mono text-2xl text-white">{predictedV.toFixed(2)} m/s</div>
                </div>
              </div>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-white/90 flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-400"/> Telemetri Live</h3>
                <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg text-xs font-semibold transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Bola
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                <div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Waktu (t)</div>
                  <div className="font-mono text-xl text-emerald-400">{simTime.toFixed(3)} s</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Kecepatan (v)</div>
                  <div className="font-mono text-xl text-emerald-400">{liveV.toFixed(2)} m/s</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Jarak Tempuh (Δy)</div>
                  <div className="font-mono text-xl text-blue-400">{hFallen.toFixed(3)} m</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Sisa Ketinggian (y)</div>
                  <div className="font-mono text-xl text-blue-400">{remainingY.toFixed(3)} m</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Apparatus */}
        <div className="bg-[#0a0f1c] rounded-xl border border-white/10 p-4 sm:p-6 flex flex-col items-center">
          <div className="w-full max-w-4xl flex justify-center">
            <FreeFallApparatus 
              key={resetKey}
              mode="explore" 
              gLocal={g} 
              controlledHeight={height} 
              onTimeChange={handleTimeChange} 
              onHeightChange={setHeight}
              scaleMaxMeters={12.0} // Ensure it fits the 12m max range
            />
          </div>
        </div>

        {/* Coba Ini */}
        <div className="w-full bg-blue-950/30 border border-blue-900/50 rounded-xl p-5 flex flex-col gap-3 mt-4">
          <h3 className="font-bold text-blue-400 flex items-center gap-2">💡 Coba Ini</h3>
          <ul className="text-sm text-blue-200/70 flex flex-col gap-3 list-disc pl-4 marker:text-blue-500">
            <li><strong>Hand check:</strong> Atur H = 10 m pada gravitasi Bumi (g = 9.81 m/s²). Cocokkan prediksi teoritis (t ≈ 1.43 s) dengan hasil dari simulasi alat.</li>
            <li><strong>Uji Gravitasi:</strong> Ganti planet ke Bulan tanpa mengubah tinggi H = 10 m. Perhatikan bagaimana waktu jatuhnya menjadi jauh lebih lambat (t ≈ 3.51 s).</li>
            <li><strong>Uji Ketinggian:</strong> Gandakan tinggi jatuh (misalnya dari 5 m menjadi 10 m). Apakah waktu jatuhnya juga dua kali lipat? (Petunjuk: Hubungan t dan h adalah akar kuadrat).</li>
          </ul>
        </div>

      </div>
    </ExploreShell>
  );
}
