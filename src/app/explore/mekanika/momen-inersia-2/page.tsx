"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ExploreShell } from "@/components/explore/ExploreShell";
import { TorsionalOscillator, TorsionalOscillatorRef } from "@/components/practicum/instruments/TorsionalOscillator";
import { PlaybackSpeedControl } from "@/components/simulation/PlaybackSpeedControl";
import { usePersistedPlaybackSpeed } from "@/physics/hooks/usePersistedPlaybackSpeed";
import { Info, Calculator, Settings, Activity, RotateCcw } from "lucide-react";
import { LineGraph } from "@/components/simulation/LineGraph";
import { SCIENTIFIC_THEME } from "@/components/simulation/visual/tokens";
import {
  FALLBACK_I0,
  FALLBACK_KAPPA,
  RigidBodyShape,
  getBodyTheoryInertia,
  getPredictedPeriodWithBody
} from "@/physics/momentOfInertia2";

export default function MomenInersia2ExplorePage() {
  const appRef = useRef<TorsionalOscillatorRef>(null);
  const [speed, setSpeed] = usePersistedPlaybackSpeed("momen-inersia-2", 1.0);

  // Apparatus Constants
  const [i0True, setI0True] = useState(FALLBACK_I0); 
  const [kappaTrue, setKappaTrue] = useState(FALLBACK_KAPPA); 
  
  // Body Parameters
  const [shape, setShape] = useState<RigidBodyShape>("solid-sphere");
  const [massKg, setMassKg] = useState(1.0);
  const [radiusM, setRadiusM] = useState(0.1);
  const [initialAngle, setInitialAngle] = useState(90); 
  
  // State
  const [simTime, setSimTime] = useState(0);
  const [isOscillating, setIsOscillating] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const [liveState, setLiveState] = useState({ thetaDeg: 0, omegaRad: 0 });
  const [graphData, setGraphData] = useState<{t: number, val: number}[]>([]);
  const [measuredPeriod, setMeasuredPeriod] = useState<number | null>(null);

  // Theoretical Calculations
  const bodyInertia = getBodyTheoryInertia({ shape, massKg, radiusM });
  const T_pred = getPredictedPeriodWithBody(i0True, kappaTrue, bodyInertia);
  const T0_pred = getPredictedPeriodWithBody(i0True, kappaTrue, 0);

  const handleTimeChange = useCallback((t: number, running: boolean, reset: boolean) => {
    setSimTime(t);
    setIsOscillating(running);
    if (reset) {
      setGraphData([]);
      setMeasuredPeriod(null);
    }
  }, []);

  const handleStateUpdate = useCallback((t: number, thetaDeg: number, omega: number) => {
    setLiveState({ thetaDeg, omegaRad: omega });
    setGraphData(prev => {
      const newData = [...prev, { t, val: thetaDeg }];
      if (newData.length > 200) return newData.slice(newData.length - 200);
      return newData;
    });
  }, []);
  
  const handleCycleComplete = useCallback((period: number) => {
    setMeasuredPeriod(period);
  }, []);

  const handleReset = () => {
    appRef.current?.reset();
    setResetKey(prev => prev + 1);
  };

  useEffect(() => {
    handleReset();
  }, [i0True, kappaTrue, initialAngle, shape, massKg, radiusM]);

  return (
    <ExploreShell 
      title="Momen Inersia II"
      description="Eksplorasi momen inersia benda tegar (silinder, bola). Bandingkan periode osilasi saat alat ditambah beban."
      category="Mekanika"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
        
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-slate-900/90 rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
            <div className="bg-slate-800/50 border-b border-slate-800/80 p-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-400" />
              <h2 className="font-semibold text-slate-200">Benda Tegar</h2>
            </div>
            
            <div className="p-5 space-y-5">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Bentuk Benda</label>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setShape("solid-sphere")}
                    className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${shape === "solid-sphere" ? "bg-cyan-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    Bola Pejal
                  </button>
                  <button
                    onClick={() => setShape("solid-cylinder")}
                    className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${shape === "solid-cylinder" ? "bg-cyan-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    Silinder Pejal
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-300">Massa (m)</label>
                  <span className="text-sm text-cyan-400 font-mono">{massKg.toFixed(2)} kg</span>
                </div>
                <input 
                  type="range" min="0.1" max="5.0" step="0.1"
                  value={massKg} onChange={(e) => setMassKg(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-300">Jari-jari (R)</label>
                  <span className="text-sm text-cyan-400 font-mono">{radiusM.toFixed(2)} m</span>
                </div>
                <input 
                  type="range" min="0.01" max="0.30" step="0.01"
                  value={radiusM} onChange={(e) => setRadiusM(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-300">Simpangan Awal (θ₀)</label>
                  <span className="text-sm text-cyan-400 font-mono">{initialAngle}°</span>
                </div>
                <input 
                  type="range" min="10" max="150" step="5"
                  value={initialAngle} onChange={(e) => setInitialAngle(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
            <div className="bg-slate-800/50 border-b border-slate-800/80 p-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-cyan-400" />
              <h2 className="font-semibold text-slate-200">Coba Ini!</h2>
            </div>
            <div className="p-5 text-sm text-slate-300 space-y-3">
              <p>👉 <strong>Ganti bola dengan silinder yang massa dan jari-jarinya sama.</strong> Mana yang periodenya lebih besar? Mengapa?</p>
              <p>👉 <strong>Gandakan jari-jari.</strong> Berapa kali periode kuadrat berubah?</p>
            </div>
          </div>
        </div>

        {/* Right Column: Visualization & Graph */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          <div className="bg-slate-900/90 rounded-2xl shadow-xl border border-slate-800 p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  data-testid="btn-play"
                  onClick={() => isOscillating ? appRef.current?.pause() : appRef.current?.start()}
                  className={`px-6 py-2.5 rounded-lg font-semibold shadow-sm transition-all text-white flex items-center gap-2 ${
                    isOscillating 
                      ? 'bg-amber-500 hover:bg-amber-600' 
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  {isOscillating ? 'Jeda' : 'Mulai (Lepas)'}
                </button>
                <button
                  data-testid="btn-reset"
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-lg font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all flex items-center gap-2 border border-slate-700"
                >
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
                <PlaybackSpeedControl speed={speed} onSpeedChange={setSpeed} />
              </div>

              <div className="flex gap-4">
                <div className="bg-slate-950 text-emerald-400 font-mono px-4 py-2 rounded-lg text-lg border border-slate-800 shadow-inner flex flex-col items-center min-w-[100px]">
                  <span className="text-[10px] text-slate-400 leading-none mb-1 font-sans font-bold">WAKTU (s)</span>
                  {simTime.toFixed(2)}
                </div>
                <div className="bg-slate-950 text-cyan-400 font-mono px-4 py-2 rounded-lg text-lg border border-slate-800 shadow-inner flex flex-col items-center min-w-[100px]">
                  <span className="text-[10px] text-slate-400 leading-none mb-1 font-sans font-bold">SUDUT (°)</span>
                  {liveState.thetaDeg.toFixed(1)}
                </div>
                <div className="bg-slate-950 text-purple-400 font-mono px-4 py-2 rounded-lg text-lg border border-slate-800 shadow-inner flex flex-col items-center min-w-[100px]">
                  <span className="text-[10px] text-slate-400 leading-none mb-1 font-sans font-bold">ω (rad/s)</span>
                  {liveState.omegaRad.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="h-[400px] w-full flex items-center justify-center relative rounded-xl border border-slate-800 bg-[#060a14] overflow-hidden mb-6">
              <TorsionalOscillator 
                key={resetKey}
                ref={appRef}
                mode="explore"
                i0True={i0True}
                kappaTrue={kappaTrue}
                attachedBodyInertia={bodyInertia}
                attachedBodyShape={shape}
                attachedBodyRadius={radiusM}
                initialAngle={initialAngle}
                speed={speed}
                onSpeedChange={setSpeed}
                onTimeChange={handleTimeChange}
                onStateUpdate={handleStateUpdate}
                onCycleComplete={handleCycleComplete}
                className="scale-90 shadow-none border-none bg-transparent" 
              />
              <div className="absolute top-4 right-4 bg-slate-900/90 p-3 rounded-lg border border-slate-700 shadow-lg text-sm">
                 <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 mb-1">Momen Inersia (I_teori)</div>
                 <div className="font-mono text-cyan-400">{bodyInertia.toPrecision(4)} kg·m²</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
               <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="w-4 h-4 text-slate-400" />
                  <h3 className="font-semibold text-slate-300 text-sm">Periode Alat (T₀)</h3>
                </div>
                <div className="text-xl font-mono text-slate-400">
                  {T0_pred.toFixed(3)} <span className="text-sm font-sans text-slate-500">s</span>
                </div>
              </div>

              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-semibold text-slate-300 text-sm">Periode Prediksi (T)</h3>
                </div>
                <div className="text-xl font-mono text-cyan-400">
                  {T_pred.toFixed(3)} <span className="text-sm font-sans text-slate-500">s</span>
                </div>
              </div>
              
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-semibold text-slate-300 text-sm">Periode Terukur (T)</h3>
                </div>
                <div className="text-xl font-mono text-emerald-400">
                  {measuredPeriod ? (
                    <>{measuredPeriod.toFixed(3)} <span className="text-sm font-sans text-slate-500">s</span></>
                  ) : (
                    <span className="text-slate-500 text-sm">Menunggu 1 getaran...</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 rounded-2xl shadow-xl border border-slate-800 p-6 flex flex-col h-[400px]">
             <div className="mb-4 flex justify-between items-center">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                   <Activity className="w-5 h-5 text-indigo-400" />
                   Grafik Simpangan (θ) thd Waktu (t)
                </h3>
             </div>
             <div className="flex-1 min-h-0">
               {graphData.length > 0 ? (
                  <LineGraph 
                    data={graphData}
                    width={800}
                    height={300}
                    xLabel="Waktu (s)" 
                    yLabel="Simpangan (°)"
                    color={SCIENTIFIC_THEME.vectors.position}
                  />
               ) : (
                  <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-slate-800 rounded-lg text-slate-500 bg-slate-950/40">
                    Jalankan simulasi untuk melihat grafik
                  </div>
               )}
             </div>
          </div>
        </div>

      </div>
    </ExploreShell>
  );
}
