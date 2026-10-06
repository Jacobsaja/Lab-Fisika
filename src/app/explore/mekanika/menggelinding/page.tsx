"use client";

import React, { useState, useEffect, useRef } from "react";
import { ExploreShell } from "@/components/explore/ExploreShell";
import { RollingApparatus, RollingApparatusRef } from "@/components/practicum/instruments/RollingApparatus";
import { CylinderShape, calculateRollingAcceleration } from "@/physics/rollingMotion";
import { Info, Calculator, Settings, Activity, RotateCcw } from "lucide-react";
import { LineGraph } from "@/components/simulation/LineGraph";

export default function RollingExplorePage() {
  const appRef = useRef<RollingApparatusRef>(null);

  // Parameters
  const [shape, setShape] = useState<CylinderShape>("solid");
  const [thetaDeg, setThetaDeg] = useState(15);
  const [mass, setMass] = useState(1); // kg
  const [r, setR] = useState(0.05); // m
  const [rInner, setRInner] = useState(0.04); // m
  
  // Compare mode
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareShape, setCompareShape] = useState<CylinderShape>("hollow");

  // State
  const [simTime, setSimTime] = useState(0);
  const [isFalling, setIsFalling] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const [liveState, setLiveState] = useState({ s: 0, v: 0, omega: 0, theta: 0 });
  const [liveCompareState, setLiveCompareState] = useState<{ s: number, v: number } | undefined>(undefined);
  const [graphData, setGraphData] = useState<{t: number, val: number}[]>([]);

  const g = 9.81;
  const a_pred = calculateRollingAcceleration(shape, thetaDeg, r, rInner, g);
  const a_compare_pred = isCompareMode ? calculateRollingAcceleration(compareShape, thetaDeg, r, rInner, g) : 0;

  const handleTimeChange = (t: number, running: boolean, reset: boolean) => {
    setSimTime(t);
    setIsFalling(running);
    if (reset) {
      setGraphData([]);
    }
  };

  const handleStateUpdate = (state: any, compState?: any) => {
    setLiveState(state);
    setLiveCompareState(compState);
    if (state.v > 0 || state.s > 0) {
      setGraphData(prev => {
        // limit data points
        const newData = [...prev, { t: simTime, val: state.v }];
        if (newData.length > 200) return newData.slice(newData.length - 200);
        return newData;
      });
    }
  };

  const handleReset = () => {
    appRef.current?.reset();
    setResetKey(prev => prev + 1);
    setSimTime(0);
    setIsFalling(false);
    setGraphData([]);
  };

  return (
    <ExploreShell
      title="Gerak Menggelinding"
      category="Mekanika"
      description="Eksplorasi gerak menggelinding pada bidang miring. Amati pengaruh bentuk benda (Momen Inersia) terhadap percepatan dan kecepatan jatuhnya benda tanpa slip."
    >
      <div className="flex flex-col gap-6 p-4 sm:p-6 w-full">
        
        {/* TOP SECTION: Controls & Predictions */}
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Controls */}
          <div className="flex-[3] bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-5 shadow-xl">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-white/90 flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-400"/> Parameter Percobaan
              </h3>
              
              <label className="flex items-center gap-2 text-sm text-blue-300 font-bold bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-500/30 cursor-pointer hover:bg-blue-900/50 transition">
                <input type="checkbox" checked={isCompareMode} onChange={e => { setIsCompareMode(e.target.checked); handleReset(); }} className="w-4 h-4 accent-blue-500" />
                Mode Bandingkan
              </label>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-2 block">BENTUK BENDA UTAMA</label>
                <select value={shape} onChange={e => setShape(e.target.value as CylinderShape)} disabled={isFalling} className="w-full bg-black/30 border border-white/20 rounded p-2 text-white">
                  <option value="solid">Silinder Pejal (Solid)</option>
                  <option value="hollow">Silinder Berongga (Hollow)</option>
                  <option value="block">Balok (Sliding)</option>
                </select>
              </div>

              {isCompareMode && (
                <div>
                  <label className="text-xs font-bold text-blue-400 mb-2 block">BENTUK BENDA KEDUA</label>
                  <select value={compareShape} onChange={e => setCompareShape(e.target.value as CylinderShape)} disabled={isFalling} className="w-full bg-blue-900/20 border border-blue-500/30 rounded p-2 text-blue-200">
                    <option value="solid">Silinder Pejal (Solid)</option>
                    <option value="hollow">Silinder Berongga (Hollow)</option>
                    <option value="block">Balok (Sliding)</option>
                  </select>
                </div>
              )}

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                  <span>SUDUT KEMIRINGAN (θ)</span>
                  <span className="text-white">{thetaDeg}°</span>
                </div>
                <input type="range" min="5" max="45" step="1" value={thetaDeg} onChange={e => setThetaDeg(Number(e.target.value))} disabled={isFalling} className="w-full accent-emerald-500" />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                  <span>MASSA (m)</span>
                  <span className="text-white">{mass} kg</span>
                </div>
                <input type="range" min="0.1" max="5.0" step="0.1" value={mass} onChange={e => setMass(Number(e.target.value))} disabled={isFalling} className="w-full accent-emerald-500" />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                  <span>JARI-JARI LUAR (R)</span>
                  <span className="text-white">{r.toFixed(3)} m</span>
                </div>
                <input type="range" min="0.02" max="0.1" step="0.005" value={r} onChange={e => {
                  const newR = Number(e.target.value);
                  setR(newR);
                  if (rInner >= newR) setRInner(newR - 0.005);
                }} disabled={isFalling} className="w-full accent-emerald-500" />
              </div>

              {(shape === "hollow" || (isCompareMode && compareShape === "hollow")) && (
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                    <span>JARI-JARI DALAM (r)</span>
                    <span className="text-white">{rInner.toFixed(3)} m</span>
                  </div>
                  <input type="range" min="0.01" max={r - 0.005} step="0.005" value={rInner} onChange={e => setRInner(Number(e.target.value))} disabled={isFalling} className="w-full accent-emerald-500" />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <button onClick={handleReset} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-colors flex items-center gap-2">
                <RotateCcw className="w-4 h-4"/> RESET
              </button>
              <button 
                onClick={() => isFalling ? appRef.current?.pause() : appRef.current?.start()}
                className={`px-8 py-2.5 ${isFalling ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'} text-white font-bold rounded-lg shadow-lg transition-colors flex items-center justify-center min-w-[140px]`}
              >
                {isFalling ? 'PAUSE' : 'PLAY'}
              </button>
            </div>
          </div>

          {/* Predictions & Quick Stats */}
          <div className="flex-[2] bg-[#0f172a] rounded-xl border border-blue-900/50 p-5 shadow-xl flex flex-col justify-center">
            <h3 className="font-bold text-white/90 flex items-center gap-2 mb-4">
              <Calculator className="w-4 h-4 text-blue-400"/> Prediksi & Hasil Pengukuran
            </h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Prediksi Percepatan Utama (a)</div>
                  <div className="font-mono text-2xl text-blue-300">{a_pred.toFixed(3)} m/s²</div>
                </div>
                {isCompareMode && (
                  <div>
                    <div className="text-[10px] text-blue-400/60 uppercase tracking-wider mb-1">Prediksi Percepatan Kedua (a)</div>
                    <div className="font-mono text-2xl text-emerald-300">{a_compare_pred.toFixed(3)} m/s²</div>
                  </div>
                )}
              </div>
              
              {/* Hasil Pengukuran Aktual Simulasi (tanpa noise di Explore) */}
              <div className="border-t border-white/10 pt-4">
                <div className="text-[10px] text-emerald-400/60 uppercase tracking-wider mb-2 font-bold">Pengukuran Simulasi Terakhir (a = Δv/Δt)</div>
                <div className="font-mono text-lg text-emerald-400">
                  {simTime > 0 && liveState.v > 0 ? (liveState.v / simTime).toFixed(3) : "0.000"} m/s²
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION: Telemetry Live & Graph */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 bg-black/40 border border-white/10 rounded-xl p-5 shadow-xl">
            <h3 className="font-bold text-white/90 flex items-center gap-2 mb-6">
              <Activity className="w-4 h-4 text-emerald-400"/> Telemetri Live {isCompareMode && "(Benda Utama)"}
            </h3>
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Waktu (t)</div>
                <div className="font-mono text-2xl text-emerald-400">{simTime.toFixed(3)} <span className="text-sm">s</span></div>
              </div>
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Jarak Tempuh (s)</div>
                <div className="font-mono text-2xl text-emerald-400">{liveState.s.toFixed(3)} <span className="text-sm">m</span></div>
              </div>
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Kec. Linear (v)</div>
                <div className="font-mono text-2xl text-emerald-400">{liveState.v.toFixed(3)} <span className="text-sm">m/s</span></div>
              </div>
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Kec. Sudut (ω)</div>
                <div className="font-mono text-2xl text-amber-400">{liveState.omega.toFixed(3)} <span className="text-sm">rad/s</span></div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Sudut Putar Total (θ)</div>
                <div className="font-mono text-2xl text-amber-400">{liveState.theta.toFixed(3)} <span className="text-sm">rad</span></div>
              </div>
            </div>
          </div>

          <div className="flex-[2] bg-[#0a0f1c] rounded-xl border border-white/10 p-5 shadow-xl h-[300px] flex flex-col justify-center items-center relative">
            <h4 className="text-xs font-bold text-slate-400 mb-2 absolute top-4 left-4">Grafik Kecepatan Linear (v - t)</h4>
            <div className="w-full max-w-lg mt-4 flex justify-center">
               <LineGraph 
                 data={graphData}
                 width={500}
                 height={220}
                 xLabel="t (s)" yLabel="v (m/s)"
                 color="#3b82f6"
               />
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Apparatus (Scrollable large view) */}
        <div className="bg-[#0a0f1c] rounded-xl border border-white/10 p-4 sm:p-6 flex flex-col items-center shadow-xl">
          <div className="w-full flex justify-center">
            <RollingApparatus 
              ref={appRef}
              key={resetKey}
              mode="explore"
              shape={shape}
              compareShape={isCompareMode ? compareShape : undefined}
              thetaDeg={thetaDeg}
              mass={mass}
              r={r}
              rInner={rInner}
              onTimeChange={handleTimeChange}
              onStateUpdate={handleStateUpdate}
              className={`w-full ${isCompareMode ? 'h-[750px]' : 'h-[600px]'} min-w-[300px]`}
            />
          </div>
        </div>

        {/* Educational Content */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5 text-sm text-slate-300">
          <h4 className="font-bold text-amber-500 flex items-center gap-2 mb-3">
            <Info className="w-4 h-4"/> Coba ini
          </h4>
          <ul className="list-disc pl-5 space-y-2">
            <li>Ganti silinder pejal dengan silinder berongga pada sudut yang sama. Mana yang lebih cepat sampai ke bawah? Aktifkan mode Bandingkan untuk melihatnya secara langsung.</li>
            <li>Perbesar sudut kemiringan (θ). Bagaimana percepatannya berubah? Apakah kecepatannya mencapai akhir lintasan jauh lebih tinggi?</li>
            <li>Ubah-ubah massa benda. Mengapa waktu jatuhnya sama saja? (Petunjuk: Percepatan tidak bergantung pada massa untuk benda yang menggelinding).</li>
            <li>Bandingkan benda berongga dengan Balok (sliding). Mengapa balok yang meluncur tanpa gesekan memiliki percepatan terbesar?</li>
          </ul>
        </div>

      </div>
    </ExploreShell>
  );
}
