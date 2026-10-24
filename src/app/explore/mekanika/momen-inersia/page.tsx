"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ExploreShell } from "@/components/explore/ExploreShell";
import { TorsionalOscillator, TorsionalOscillatorRef } from "@/components/practicum/instruments/TorsionalOscillator";
import { PlaybackSpeedControl } from "@/components/simulation/PlaybackSpeedControl";
import { usePersistedPlaybackSpeed } from "@/physics/hooks/usePersistedPlaybackSpeed";
import { Info, Calculator, Settings, Activity, RotateCcw } from "lucide-react";
import { LineGraph } from "@/components/simulation/LineGraph";
import { SCIENTIFIC_THEME } from "@/components/simulation/visual/tokens";

export default function MomenInersiaExplorePage() {
  const appRef = useRef<TorsionalOscillatorRef>(null);
  const [speed, setSpeed] = usePersistedPlaybackSpeed("momen-inersia", 1.0);

  // Parameters
  const [i0True, setI0True] = useState(0.003); // kg.m2
  const [kappaTrue, setKappaTrue] = useState(0.04); // Nm/rad
  const [initialAngle, setInitialAngle] = useState(90); // deg
  
  // State
  const [simTime, setSimTime] = useState(0);
  const [isOscillating, setIsOscillating] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const [liveState, setLiveState] = useState({ thetaDeg: 0, omegaRad: 0 });
  const [graphData, setGraphData] = useState<{t: number, val: number}[]>([]);
  const [measuredPeriod, setMeasuredPeriod] = useState<number | null>(null);

  // Theoretical Period
  const T_pred = 2 * Math.PI * Math.sqrt(i0True / kappaTrue);

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
      // limit data points
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

  // Reset if parameters change
  useEffect(() => {
    handleReset();
  }, [i0True, kappaTrue, initialAngle]);

  return (
    <ExploreShell 
      title="Momen Inersia I"
      description="Eksplorasi gerak osilasi harmonik rotasional. Amati hubungan konstanta pegas dan momen inersia terhadap periode."
      category="Mekanika"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
        
        {/* Left Column: Controls (4/12) */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-slate-900/90 rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
            <div className="bg-slate-800/50 border-b border-slate-800/80 p-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-400" />
              <h2 className="font-semibold text-slate-200">Parameter Alat</h2>
            </div>
            
            <div className="p-5 space-y-5">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-300">Momen Inersia Diri (I₀)</label>
                  <span className="text-sm text-cyan-400 font-mono">{i0True.toFixed(4)} kg·m²</span>
                </div>
                <input 
                  type="range" 
                  min="0.001" max="0.01" step="0.0005"
                  value={i0True}
                  onChange={(e) => setI0True(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-300">Konstanta Pegas (κ)</label>
                  <span className="text-sm text-cyan-400 font-mono">{kappaTrue.toFixed(3)} Nm/rad</span>
                </div>
                <input 
                  type="range" 
                  min="0.01" max="0.1" step="0.005"
                  value={kappaTrue}
                  onChange={(e) => setKappaTrue(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-300">Simpangan Awal (θ₀)</label>
                  <span className="text-sm text-cyan-400 font-mono">{initialAngle}°</span>
                </div>
                <input 
                  type="range" 
                  min="10" max="150" step="5"
                  value={initialAngle}
                  onChange={(e) => setInitialAngle(parseFloat(e.target.value))}
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
              <p>👉 <strong>Gandakan momen inersia (I₀).</strong> Apa yang terjadi pada periode? (Petunjuk: Hubungan kuadratik).</p>
              <p>👉 <strong>Perbesar konstanta pegas (κ).</strong> Apakah ayunan menjadi lebih cepat atau lebih lambat?</p>
              <p>👉 <strong>Ubah simpangan awal (θ₀).</strong> Apakah periode dipengaruhi oleh seberapa jauh Anda menarik piringan?</p>
            </div>
          </div>
        </div>

        {/* Right Column: Visualization & Graph (8/12) */}
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
                  <RotateCcw className="w-4 h-4" />
                  Reset
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
                initialAngle={initialAngle}
                speed={speed}
                onSpeedChange={setSpeed}
                onTimeChange={handleTimeChange}
                onStateUpdate={handleStateUpdate}
                onCycleComplete={handleCycleComplete}
                className="scale-90 shadow-none border-none bg-transparent" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-semibold text-slate-300">Periode Prediksi (T)</h3>
                </div>
                <div className="text-2xl font-mono text-cyan-400">
                  {T_pred.toFixed(3)} <span className="text-sm font-sans text-slate-400">s</span>
                </div>
              </div>
              
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-semibold text-slate-300">Periode Terukur (T)</h3>
                </div>
                <div className="text-2xl font-mono text-emerald-400">
                  {measuredPeriod ? (
                    <>{measuredPeriod.toFixed(3)} <span className="text-sm font-sans text-slate-400">s</span></>
                  ) : (
                    <span className="text-slate-500 text-base">Menunggu 1 getaran...</span>
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
