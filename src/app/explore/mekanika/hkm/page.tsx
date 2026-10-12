"use client";

import React, { useState, useRef, useMemo } from "react";
import { ExploreShell } from "@/components/explore/ExploreShell";
import { AirTrackApparatus, AirTrackApparatusRef } from "@/components/practicum/instruments/AirTrackApparatus";
import { solve1DCollision } from "@/physics/momentum/momentum";
import {
  Play,
  RotateCcw,
  Activity,
  TrendingDown,
  Sliders
} from "lucide-react";

export default function HKMExplorePage() {
  const apparatusRef = useRef<AirTrackApparatusRef>(null);

  // Glider parameters
  const [massA, setMassA] = useState(0.150); // 150g
  const [massB, setMassB] = useState(0.150); // 150g
  const [vA, setVA] = useState(0.40); // 0.4 m/s
  const [restitution, setRestitution] = useState(1.0); // 1.0 = elastic, 0 = inelastic
  const [collisionPreset, setCollisionPreset] = useState<"elastic" | "partial" | "inelastic">("elastic");

  // Measured result from apparatus
  const [measuredResult, setMeasuredResult] = useState<{
    p11: number;
    p21: number;
    p22: number | null;
    vA: number;
    vBPrime: number;
    vAPrime: number;
    pTotalInitial: number;
    pTotalFinal: number;
    eMeasured: number;
  } | null>(null);

  // Live theoretical predictions
  const theory = useMemo(() => {
    return solve1DCollision(massA, massB, vA, 0, restitution);
  }, [massA, massB, vA, restitution]);

  const handlePresetChange = (preset: "elastic" | "partial" | "inelastic") => {
    setCollisionPreset(preset);
    if (preset === "elastic") setRestitution(1.0);
    else if (preset === "inelastic") setRestitution(0.0);
    else setRestitution(0.5);
    apparatusRef.current?.reset();
    setMeasuredResult(null);
  };

  const handleLaunch = () => {
    apparatusRef.current?.launch();
  };

  const handleReset = () => {
    apparatusRef.current?.reset();
    setMeasuredResult(null);
  };

  return (
    <ExploreShell
      title="Hukum Kekekalan Momentum & Tumbukan 1D"
      category="Mekanika"
      description="Sandbox eksperimen tumbukan satu dimensi pada Rel Udara (Air Track). Uji kekekalan momentum linier dan transformasi energi kinetik dengan mengubah massa kereta, kecepatan awal, serta koefisien kelentingan (restitusi)."
    >
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6">
        {/* Main Simulation View */}
        <div className="w-full">
          <AirTrackApparatus
            ref={apparatusRef}
            mode="explore"
            baseMass={massA}
            addedMass={0}
            cartAHasAddedMass={false}
            cartBHasAddedMass={false}
            bumperType={restitution === 1 ? "elastic" : "inelastic"}
            customRestitution={restitution}
            launchSpeed={vA}
            onCollisionComplete={(data) => setMeasuredResult(data)}
          />
        </div>

        {/* Control and Analytics Panels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Interactive Sandbox Controls */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold text-sm">
                <Sliders className="w-4 h-4" />
                Parameter Kereta & Tumbukan
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Bersih
              </button>
            </div>

            {/* Collision Type Presets */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-400">Jenis Tumbukan:</label>
              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                <button
                  onClick={() => handlePresetChange("elastic")}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    collisionPreset === "elastic"
                      ? "bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  Lenting Sempurna
                  <div className="text-[10px] text-emerald-400 font-normal">e = 1.0</div>
                </button>
                <button
                  onClick={() => handlePresetChange("partial")}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    collisionPreset === "partial"
                      ? "bg-amber-950/80 border-amber-500 text-amber-300 font-bold shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  Lenting Sebagian
                  <div className="text-[10px] text-amber-400 font-normal">0 &lt; e &lt; 1</div>
                </button>
                <button
                  onClick={() => handlePresetChange("inelastic")}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    collisionPreset === "inelastic"
                      ? "bg-purple-950/80 border-purple-500 text-purple-300 font-bold shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  Tidak Lenting
                  <div className="text-[10px] text-purple-400 font-normal">e = 0.0</div>
                </button>
              </div>
            </div>

            {/* Restitution Slider (active if partial) */}
            {collisionPreset === "partial" && (
              <div className="space-y-1.5 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Koefisien Restitusi (e):</span>
                  <strong className="text-amber-400">{restitution.toFixed(2)}</strong>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.95"
                  step="0.05"
                  value={restitution}
                  onChange={(e) => setRestitution(parseFloat(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>
            )}

            {/* Mass Cart A */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Massa Kereta A (mA):</span>
                <strong className="text-cyan-400">{(massA * 1000).toFixed(0)} gram</strong>
              </div>
              <input
                type="range"
                min="0.050"
                max="0.400"
                step="0.025"
                value={massA}
                onChange={(e) => {
                  setMassA(parseFloat(e.target.value));
                  handleReset();
                }}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Mass Cart B */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Massa Kereta B (mB):</span>
                <strong className="text-amber-400">{(massB * 1000).toFixed(0)} gram</strong>
              </div>
              <input
                type="range"
                min="0.050"
                max="0.400"
                step="0.025"
                value={massB}
                onChange={(e) => {
                  setMassB(parseFloat(e.target.value));
                  handleReset();
                }}
                className="w-full accent-amber-400"
              />
            </div>

            {/* Launch Speed vA */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Kecepatan Awal Kereta A (vA):</span>
                <strong className="text-cyan-300">{vA.toFixed(2)} m/s</strong>
              </div>
              <input
                type="range"
                min="0.20"
                max="0.80"
                step="0.02"
                value={vA}
                onChange={(e) => {
                  setVA(parseFloat(e.target.value));
                  handleReset();
                }}
                className="w-full accent-cyan-300"
              />
            </div>

            {/* Launch trigger button */}
            <button
              onClick={handleLaunch}
              className="mt-2 w-full py-2.5 rounded-xl font-mono text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              Mulai Tumbukan (Luncurkan Kereta A)
            </button>
          </div>

          {/* Right Column: Live Physics Diagnostics & Analytics */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* Live Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Momentum Card */}
              <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                    <Activity className="w-4 h-4" />
                    Kekekalan Momentum Linier
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                    p = m·v
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400">p Total Sebelum:</span>
                    <strong className="text-cyan-300">{theory.pTotalInitial.toFixed(4)} kg·m/s</strong>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400">p Total Sesudah:</span>
                    <strong className="text-emerald-400">{theory.pTotalFinal.toFixed(4)} kg·m/s</strong>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">Selisih (Δp):</span>
                    <strong className="text-slate-300">
                      {Math.abs(theory.pTotalFinal - theory.pTotalInitial).toFixed(6)} kg·m/s (KEKAL)
                    </strong>
                  </div>
                </div>
              </div>

              {/* Kinetic Energy Card */}
              <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-purple-400 flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4" />
                    Energi Kinetik & Disipasi
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40">
                    Ek = ½ m·v²
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400">Ek Sebelum:</span>
                    <strong className="text-purple-300">{theory.eKInitial.toFixed(4)} Joule</strong>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400">Ek Sesudah:</span>
                    <strong className="text-amber-300">{theory.eKFinal.toFixed(4)} Joule</strong>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">Energi Hilang:</span>
                    <strong className={theory.eKLoss > 0.0001 ? "text-red-400" : "text-emerald-400"}>
                      {theory.eKLoss.toFixed(4)} J ({(theory.eKLossRatio * 100).toFixed(1)}%)
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Velocity Predictions & Comparison Table */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
                <span>Prediksi Teori vs Pengukuran Sensor</span>
                <span className="text-slate-500 font-normal">Photogate & Solver 1D</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                      <th className="p-2.5">Besaran</th>
                      <th className="p-2.5">Nilai Teori</th>
                      <th className="p-2.5">Hasil Terukur Sensor</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    <tr>
                      <td className="p-2.5 text-slate-400">Kecepatan Akhir Kereta A (vA&apos;)</td>
                      <td className="p-2.5 text-amber-300">{theory.vAPrime.toFixed(3)} m/s</td>
                      <td className="p-2.5 text-cyan-300">
                        {measuredResult ? `${measuredResult.vAPrime.toFixed(3)} m/s` : "-"}
                      </td>
                      <td className="p-2.5">
                        {theory.vAPrime === 0 ? "Berhenti" : theory.vAPrime > 0 ? "Maju" : "Memantul"}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-400">Kecepatan Akhir Kereta B (vB&apos;)</td>
                      <td className="p-2.5 text-cyan-300">{theory.vBPrime.toFixed(3)} m/s</td>
                      <td className="p-2.5 text-cyan-300">
                        {measuredResult ? `${measuredResult.vBPrime.toFixed(3)} m/s` : "-"}
                      </td>
                      <td className="p-2.5 text-emerald-400">Maju</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-400">Koefisien Restitusi (e)</td>
                      <td className="p-2.5 font-bold">{restitution.toFixed(2)}</td>
                      <td className="p-2.5 font-bold text-emerald-400">
                        {measuredResult ? measuredResult.eMeasured.toFixed(3) : "-"}
                      </td>
                      <td className="p-2.5 text-slate-400">
                        {restitution === 1 ? "Elastis Murni" : restitution === 0 ? "Inelastis Murni" : "Sebagian"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ExploreShell>
  );
}
