"use client";

import React, { useState, useEffect, useRef } from "react";
import { ExploreShell } from "@/components/explore/ExploreShell";
import { AtwoodApparatus, AtwoodApparatusRef } from "@/components/practicum/instruments/AtwoodApparatus";
import { getAtwoodExploreState } from "@/physics/atwood";
import { Info, Calculator, Settings, Activity, RotateCcw } from "lucide-react";
import { LineGraph } from "@/components/simulation/LineGraph";

export default function AtwoodExplorePage() {
  const appRef = useRef<AtwoodApparatusRef>(null);

  const [m1, setM1] = useState(100);
  const [m2, setM2] = useState(100);
  const [mAdd, setMAdd] = useState(15);
  
  const [sB, setSB] = useState(0.4);
  const [sC, setSC] = useState(0.6);

  const [simTime, setSimTime] = useState(0);
  const [isFalling, setIsFalling] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const g = 9.81;

  // Real-time state
  const currentState = getAtwoodExploreState(simTime, m1/1000, m2/1000, mAdd/1000, sB, g);
  
  // Theoretical predictions
  const mTotal1 = (m1 + m2 + mAdd) / 1000;
  const a1_pred = mTotal1 > 0 ? (((m2 + mAdd - m1)/1000) * g) / mTotal1 : 0;
  const t_transition = a1_pred > 0 ? Math.sqrt((2 * sB) / a1_pred) : 0;
  const v_transition = a1_pred * t_transition;

  const mTotal2 = (m1 + m2) / 1000;
  const a2_pred = mTotal2 > 0 ? (((m2 - m1)/1000) * g) / mTotal2 : 0;

  const handleTimeChange = (t: number, falling: boolean, reset: boolean) => {
    setSimTime(t);
    if (reset) setIsFalling(false);
    else setIsFalling(falling);
  };

  const handlePosChange = (newSB: number, newSC: number) => {
    setSB(newSB);
    setSC(newSC);
  };

  const handleReset = () => {
    setResetKey(prev => prev + 1);
    setSimTime(0);
    setIsFalling(false);
  };

  const [graphData, setGraphData] = useState<{t: number, s: number, v: number}[]>([]);
  
  useEffect(() => {
    const data = [];
    const tMax = t_transition > 0 ? t_transition + 2 : 2;
    for (let t = 0; t <= tMax; t += 0.05) {
      const state = getAtwoodExploreState(t, m1/1000, m2/1000, mAdd/1000, sB, g);
      data.push({ t, s: state.s, v: state.v });
    }
    setGraphData(data);
  }, [m1, m2, mAdd, sB, g, t_transition]);

  const vtPoints = graphData.map(d => ({ t: d.t, val: d.v }));
  const stPoints = graphData.map(d => ({ t: d.t, val: d.s }));

  return (
    <ExploreShell
      title="Pesawat Atwood (GLB & GLBB)"
      category="Mekanika"
      description="Simulasi dinamis sistem katrol untuk mengamati transisi dari gerak dipercepat (GLBB) ke gerak beraturan (GLB) saat beban tambahan dilepas."
    >
      <div className="flex flex-col gap-6 p-4 sm:p-6 w-full">
        
        {/* TOP SECTION: Controls & Telemetry */}
        <div className="flex flex-col xl:flex-row gap-6">
          
          {/* Controls */}
          <div className="flex-[3] bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-5 shadow-xl">
            <h3 className="font-bold text-white/90 flex items-center gap-2 mb-2">
              <Settings className="w-4 h-4 text-emerald-400"/> Parameter Percobaan
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                  <span>MASSA 1 (m1)</span>
                  <span className="text-white">{m1} g</span>
                </div>
                <input 
                  type="range" min="50" max="200" step="5" value={m1}
                  onChange={(e) => setM1(Number(e.target.value))}
                  disabled={isFalling}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                  <span>MASSA 2 (m2)</span>
                  <span className="text-white">{m2} g</span>
                </div>
                <input 
                  type="range" min="50" max="200" step="5" value={m2}
                  onChange={(e) => setM2(Number(e.target.value))}
                  disabled={isFalling}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                  <span>MASSA TAMBAHAN (m3)</span>
                  <span className="text-white">{mAdd} g</span>
                </div>
                <input 
                  type="range" min="0" max="50" step="5" value={mAdd}
                  onChange={(e) => setMAdd(Number(e.target.value))}
                  disabled={isFalling}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-2 flex-col sm:flex-row gap-4">
              <p className="text-xs text-amber-500/80 italic flex-1">
                Atur jarak lepas massa (cincin B) dan landasan (C) dengan menggesernya langsung pada alat ukur di bawah.
              </p>
              <button 
                onClick={() => appRef.current?.startDrop()}
                disabled={isFalling}
                className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shrink-0"
              >
                LEPAS BEBAN (PLAY)
              </button>
            </div>
          </div>

          {/* Predictions */}
          <div className="flex-[2] bg-[#0f172a] rounded-xl border border-blue-900/50 p-5 shadow-xl flex flex-col justify-center">
            <h3 className="font-bold text-white/90 flex items-center gap-2 mb-4">
              <Calculator className="w-4 h-4 text-blue-400"/> Prediksi Teoretis
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Percepatan (GLBB)</div>
                <div className="font-mono text-xl text-blue-300">{a1_pred.toFixed(3)} m/s²</div>
              </div>
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Kecepatan di B</div>
                <div className="font-mono text-xl text-blue-300">{v_transition.toFixed(3)} m/s</div>
              </div>
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Percepatan (GLB)</div>
                <div className="font-mono text-xl text-blue-300">{a2_pred.toFixed(3)} m/s²</div>
              </div>
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Fase 2 akan menjadi</div>
                <div className="font-mono text-lg text-blue-300 font-bold">{a2_pred === 0 ? "GLB MURNI" : "GLBB"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION: Telemetry & Graphs */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 bg-black/40 border border-white/10 rounded-xl p-5 shadow-xl flex flex-col relative justify-center">
            <div className="flex justify-between items-center mb-4 relative z-10">
              <h3 className="font-bold text-white/90 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400"/> Telemetri Live
              </h3>
              <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg text-xs font-semibold transition-colors">
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Run
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-4 relative z-10">
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Waktu (t)</div>
                <div className="font-mono text-xl text-emerald-400">{simTime.toFixed(3)} s</div>
              </div>
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Jarak (s)</div>
                <div className="font-mono text-xl text-emerald-400">{currentState.s.toFixed(3)} m</div>
              </div>
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Kecepatan (v)</div>
                <div className="font-mono text-xl text-emerald-400">{currentState.v.toFixed(3)} m/s</div>
              </div>
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Fase Saat Ini</div>
                <div className="font-mono text-xl font-bold text-emerald-400">{currentState.phase}</div>
              </div>
            </div>
            
            {a1_pred <= 0 && (
              <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-[1px] flex items-center justify-center rounded-xl p-4 text-center border border-red-500/30">
                <span className="text-red-400 font-bold bg-red-950/80 px-4 py-2 rounded-lg text-sm border border-red-500/50">
                  Sistem tidak bergerak. Massa Kanan (m1) {m1}g ≥ Massa Kiri Total {m2+mAdd}g
                </span>
              </div>
            )}
          </div>

          <div className="flex-[2] bg-[#0a0f1c] rounded-xl border border-white/10 p-5 shadow-xl h-[300px] relative overflow-hidden flex flex-row">
            <div className="flex-1 border-r border-white/10 pr-4 flex flex-col items-center justify-center">
              <h4 className="text-xs font-bold text-slate-400 mb-2">Grafik Kecepatan (v - t)</h4>
              <LineGraph 
                data={vtPoints}
                width={300}
                height={220}
                xLabel="t (s)" yLabel="v (m/s)"
                color="#3b82f6"
              />
            </div>
            <div className="flex-1 pl-4 flex flex-col items-center justify-center">
              <h4 className="text-xs font-bold text-slate-400 mb-2">Grafik Posisi (s - t)</h4>
              <LineGraph 
                data={stPoints}
                width={300}
                height={220}
                xLabel="t (s)" yLabel="s (m)"
                color="#10b981"
              />
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Apparatus */}
        <div className="bg-[#0a0f1c] rounded-xl border border-white/10 p-4 sm:p-6 flex flex-col items-center shadow-xl">
          <div className="w-full max-w-2xl flex justify-center">
            <AtwoodApparatus 
              ref={appRef}
              key={resetKey}
              mode="explore" 
              additionalMassConfig="m3"
              a_true={a1_pred}
              a_phase2={a2_pred}
              hideControls={true}
              onTimeChange={handleTimeChange}
              onPosChange={handlePosChange}
              className="w-full h-[1200px]"
            />
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5 text-sm text-slate-300">
          <h4 className="font-bold text-amber-500 flex items-center gap-2 mb-3">
            <Info className="w-4 h-4"/> Coba ini
          </h4>
          <ul className="list-disc pl-5 space-y-2">
            <li>Set massa tambahan ke 0g. Apa yang terjadi pada fase 2? Apakah sistem bergerak?</li>
            <li>Perbesar massa tambahan. Bagaimana percepatan dan kecepatan saat fase GLB berubah?</li>
            <li>Geser cincin pelepas (B) pada tiang ke bawah (lebih jauh). Apa yang berubah pada grafik v-t?</li>
            <li>Eksperimen dengan membuat m1 jauh lebih berat dari m2, tetapi mAdd menutupi selisihnya. Apa bedanya dengan m1 ringan?</li>
          </ul>
        </div>

      </div>
    </ExploreShell>
  );
}
