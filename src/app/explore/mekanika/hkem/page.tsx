"use client";

import React, { useState, useRef, useMemo, useCallback } from "react";
import { ExploreShell } from "@/components/explore/ExploreShell";
import {
  AirTrackPulleyApparatus,
  AirTrackPulleyApparatusRef,
} from "@/components/practicum/instruments/AirTrackPulleyApparatus";
import {
  computeAirTrackTrial,
  AirTrackTrialResult,
  MotionState,
} from "@/physics/airTrackPulleySystem";
import { LineGraph, DataPoint } from "@/components/simulation/LineGraph";
import { SCIENTIFIC_THEME } from "@/components/simulation/visual";
import { Sliders, Activity, Flame, RotateCcw, Zap } from "lucide-react";

export default function HKEMExplorePage() {
  const apparatusRef = useRef<AirTrackPulleyApparatusRef>(null);

  // Parameters
  const [baseCartMass, setBaseCartMass] = useState(0.15); // 150g
  const [hasAddedMass, setHasAddedMass] = useState(false); // +12.5g
  const [hangingMassGrams, setHangingMassGrams] = useState(15); // 5, 10, 15, 20g
  const [gate1Pos, setGate1Pos] = useState(0.25); // m
  const [gate2Pos, setGate2Pos] = useState(0.65); // m
  const [flagWidthMm, setFlagWidthMm] = useState(30); // 30 mm = 3 cm
  const [frictionForce, setFrictionForce] = useState(0); // N (default ideal = 0)
  const [pulleyEffMassGrams, setPulleyEffMassGrams] = useState(0); // g

  // Measured trial result from apparatus
  const [trialResult, setTrialResult] = useState<AirTrackTrialResult | null>(null);

  // Energy vs time graph streaming data
  const [graphPointsEk, setGraphPointsEk] = useState<DataPoint[]>([]);
  const [graphPointsEp, setGraphPointsEp] = useState<DataPoint[]>([]);
  const [graphPointsEm, setGraphPointsEm] = useState<DataPoint[]>([]);

  const cartMassKg = baseCartMass + (hasAddedMass ? 0.0125 : 0);
  const hangingMassKg = hangingMassGrams / 1000;
  const flagWidthM = flagWidthMm / 1000;
  const pulleyEffMassKg = pulleyEffMassGrams / 1000;

  // Real-time animation callback to capture energy vs time
  const handleStateUpdate = useCallback(
    (state: MotionState, energy: { ek: number; ep: number; em: number }) => {
      setGraphPointsEk((prev) => {
        const next = [...prev, { t: state.t, val: energy.ek }];
        return next.length > 250 ? next.slice(next.length - 250) : next;
      });
      setGraphPointsEp((prev) => {
        const next = [...prev, { t: state.t, val: energy.ep }];
        return next.length > 250 ? next.slice(next.length - 250) : next;
      });
      setGraphPointsEm((prev) => {
        const next = [...prev, { t: state.t, val: energy.em }];
        return next.length > 250 ? next.slice(next.length - 250) : next;
      });
    },
    []
  );

  const handleReset = () => {
    apparatusRef.current?.reset();
    setTrialResult(null);
    setGraphPointsEk([]);
    setGraphPointsEp([]);
    setGraphPointsEm([]);
  };

  // Live theoretical prediction
  const theory = useMemo(() => {
    const params = {
      cartMass: cartMassKg,
      hangingMass: hangingMassKg,
      frictionForce,
      pulleyEffectiveMass: pulleyEffMassKg,
    };
    const geometry = { dropHeight: 0.8, railTravel: 1.1 };
    const gates = { gate1Position: gate1Pos, gate2Position: gate2Pos, flagWidth: flagWidthM };
    return computeAirTrackTrial(params, geometry, gates);
  }, [cartMassKg, hangingMassKg, frictionForce, pulleyEffMassKg, gate1Pos, gate2Pos, flagWidthM]);

  return (
    <ExploreShell
      title="Hukum Kekekalan Energi Mekanik"
      category="Mekanika"
      description="Eksplorasi konservasi energi mekanik (kinetik dan potensial gravitasi) pada sistem rel udara dan katrol. Variasikan massa kereta, massa beban gantung, posisi gerbang cahaya, dan amati transformasi energi secara grafis dan analitik."
    >
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6">
        {/* Main Apparatus Simulation */}
        <div className="w-full">
          <AirTrackPulleyApparatus
            ref={apparatusRef}
            mode="explore"
            cartMass={baseCartMass}
            cartHasAddedMass={hasAddedMass}
            hangingMass={hangingMassKg}
            dropHeight={0.8}
            railTravel={1.1}
            gate1Pos={gate1Pos}
            gate2Pos={gate2Pos}
            flagWidth={flagWidthM}
            frictionForce={frictionForce}
            pulleyEffectiveMass={pulleyEffMassKg}
            onTrialComplete={(res) => setTrialResult(res)}
            onStateUpdate={handleStateUpdate}
          />
        </div>

        {/* Control & Analysis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Interactive Sandbox Controls */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold text-sm">
                <Sliders className="w-4 h-4" />
                Parameter Sistem Rel &amp; Katrol
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>

            {/* Cart Mass & Toggle +12.5g */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Massa Kereta Dasar (M):</span>
                <strong className="text-cyan-400">{(cartMassKg * 1000).toFixed(1)} gram</strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setHasAddedMass((prev) => !prev);
                    handleReset();
                  }}
                  className={`flex-1 p-2 rounded-xl border text-xs font-mono font-bold transition-all ${
                    hasAddedMass
                      ? "bg-amber-950/80 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {hasAddedMass ? "Beban Tambahan +12.5 g (Terpasang)" : "+ Pasang Beban 12.5 g"}
                </button>
              </div>
            </div>

            {/* Hanging Mass Selection (5, 10, 15, 20 g) */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400 flex justify-between">
                <span>Beban Gantung (m):</span>
                <strong className="text-amber-400">{hangingMassGrams} gram</strong>
              </label>
              <div className="grid grid-cols-4 gap-2 font-mono text-xs">
                {[5, 10, 15, 20].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setHangingMassGrams(val);
                      handleReset();
                    }}
                    className={`py-1.5 rounded-lg border text-center transition-all ${
                      hangingMassGrams === val
                        ? "bg-cyan-600 border-cyan-400 text-white font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {val} g
                  </button>
                ))}
              </div>
            </div>

            {/* Photogate 1 Position */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Posisi Gerbang 1 (x1):</span>
                <strong className="text-cyan-300">{(gate1Pos * 100).toFixed(0)} cm</strong>
              </div>
              <input
                type="range"
                min="0.15"
                max="0.45"
                step="0.05"
                value={gate1Pos}
                onChange={(e) => {
                  setGate1Pos(parseFloat(e.target.value));
                  handleReset();
                }}
                className="w-full accent-cyan-400 h-1.5 bg-slate-950 rounded cursor-pointer"
              />
            </div>

            {/* Photogate 2 Position */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Posisi Gerbang 2 (x2):</span>
                <strong className="text-cyan-300">{(gate2Pos * 100).toFixed(0)} cm</strong>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.80"
                step="0.05"
                value={gate2Pos}
                onChange={(e) => {
                  setGate2Pos(parseFloat(e.target.value));
                  handleReset();
                }}
                className="w-full accent-cyan-400 h-1.5 bg-slate-950 rounded cursor-pointer"
              />
            </div>

            {/* Flag Width */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Lebar Penghalang (w):</span>
                <strong className="text-slate-200">{flagWidthMm} mm</strong>
              </div>
              <input
                type="range"
                min="20"
                max="50"
                step="5"
                value={flagWidthMm}
                onChange={(e) => {
                  setFlagWidthMm(parseInt(e.target.value, 10));
                  handleReset();
                }}
                className="w-full accent-cyan-400 h-1.5 bg-slate-950 rounded cursor-pointer"
              />
            </div>

            {/* Non-Ideal Parameters (Residual Friction & Pulley Inertia) */}
            <div className="border-t border-slate-800 pt-3 space-y-3">
              <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-bold">
                Parameter Non-Ideal (Uji Disipasi)
              </div>

              {/* Friction Force */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Gaya Gesek Rel (f):</span>
                  <strong className={frictionForce > 0 ? "text-amber-400" : "text-emerald-400"}>
                    {frictionForce.toFixed(3)} N {frictionForce === 0 ? "(Ideal)" : ""}
                  </strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.04"
                  step="0.005"
                  value={frictionForce}
                  onChange={(e) => {
                    setFrictionForce(parseFloat(e.target.value));
                    handleReset();
                  }}
                  className="w-full accent-amber-400 h-1.5 bg-slate-950 rounded cursor-pointer"
                />
              </div>

              {/* Pulley Effective Mass */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Inersia Katrol (m_eff):</span>
                  <strong className={pulleyEffMassGrams > 0 ? "text-purple-400" : "text-emerald-400"}>
                    {pulleyEffMassGrams} g {pulleyEffMassGrams === 0 ? "(Ideal)" : ""}
                  </strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="2.5"
                  value={pulleyEffMassGrams}
                  onChange={(e) => {
                    setPulleyEffMassGrams(parseFloat(e.target.value));
                    handleReset();
                  }}
                  className="w-full accent-purple-400 h-1.5 bg-slate-950 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Live Graphs & Energy Comparison Table */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* Energy Cards at Gate 1 and Gate 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Gate 1 Energy Card */}
              <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-4 shadow-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    Titik 1 (Gerbang 1, x1 = {(gate1Pos * 100).toFixed(0)} cm)
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                    h1 = {(theory.h1 * 100).toFixed(1)} cm
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-800">
                    <span className="text-slate-400">Kecepatan (v1 = w/t1):</span>
                    <strong className="text-cyan-300">
                      {trialResult ? trialResult.v1.toFixed(3) : theory.v1.toFixed(3)} m/s
                    </strong>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-800">
                    <span className="text-slate-400">Energi Kinetik (EK1):</span>
                    <strong className="text-emerald-400">
                      {(trialResult ? trialResult.ek1 : theory.ek1).toFixed(4)} J
                    </strong>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-800">
                    <span className="text-slate-400">Energi Potensial (EP1):</span>
                    <strong className="text-amber-400">
                      {(trialResult ? trialResult.ep1 : theory.ep1).toFixed(4)} J
                    </strong>
                  </div>
                  <div className="flex justify-between items-center pt-1 font-bold">
                    <span className="text-slate-200">Energi Mekanik (EM1):</span>
                    <strong className="text-purple-300">
                      {(trialResult ? trialResult.em1 : theory.em1).toFixed(4)} J
                    </strong>
                  </div>
                </div>
              </div>

              {/* Gate 2 Energy Card */}
              <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 shadow-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                    <Flame className="w-4 h-4" />
                    Titik 2 (Gerbang 2, x2 = {(gate2Pos * 100).toFixed(0)} cm)
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                    h2 = {(theory.h2 * 100).toFixed(1)} cm
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-800">
                    <span className="text-slate-400">Kecepatan (v2 = w/t2):</span>
                    <strong className="text-emerald-300">
                      {trialResult ? trialResult.v2.toFixed(3) : theory.v2.toFixed(3)} m/s
                    </strong>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-800">
                    <span className="text-slate-400">Energi Kinetik (EK2):</span>
                    <strong className="text-emerald-400">
                      {(trialResult ? trialResult.ek2 : theory.ek2).toFixed(4)} J
                    </strong>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-800">
                    <span className="text-slate-400">Energi Potensial (EP2):</span>
                    <strong className="text-amber-400">
                      {(trialResult ? trialResult.ep2 : theory.ep2).toFixed(4)} J
                    </strong>
                  </div>
                  <div className="flex justify-between items-center pt-1 font-bold">
                    <span className="text-slate-200">Energi Mekanik (EM2):</span>
                    <strong className="text-purple-300">
                      {(trialResult ? trialResult.em2 : theory.em2).toFixed(4)} J
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Conservation Status Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Selisih Energi Mekanik (EM1 − EM2):
                </div>
                <div className="text-xs font-mono text-slate-400">
                  Nilai ΔEM:{" "}
                  <strong className="text-white">
                    {(trialResult ? trialResult.difference : theory.difference).toFixed(5)} J
                  </strong>{" "}
                  (Persentase Selisih:{" "}
                  <strong
                    className={
                      Math.abs(trialResult ? trialResult.differencePercent : theory.differencePercent) < 1.0
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }
                  >
                    {(trialResult ? trialResult.differencePercent : theory.differencePercent).toFixed(2)}%
                  </strong>
                  )
                </div>
              </div>

              <div
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border ${
                  Math.abs(trialResult ? trialResult.differencePercent : theory.differencePercent) < 1.5
                    ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300"
                    : "bg-amber-950/80 border-amber-500/50 text-amber-300"
                }`}
              >
                {Math.abs(trialResult ? trialResult.differencePercent : theory.differencePercent) < 1.5
                  ? "EM KEKAL (EM1 ≈ EM2)"
                  : "TERJADI DISIPASI ENERGI"}
              </div>
            </div>

            {/* Streaming Energy Graph */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-xs font-mono flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Grafik Energi terhadap Waktu (t)
                </h3>
                <div className="flex items-center gap-3 text-[11px] font-mono">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                    EK (Kinetik)
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                    EP (Potensial)
                  </span>
                  <span className="flex items-center gap-1 text-purple-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
                    EM (Mekanik)
                  </span>
                </div>
              </div>

              <div className="w-full flex justify-center bg-black/40 rounded-xl p-2 border border-slate-800/80 overflow-hidden">
                <LineGraph
                  data={graphPointsEm.length > 0 ? graphPointsEm : [{ t: 0, val: 0.1 }]}
                  width={480}
                  height={190}
                  color={SCIENTIFIC_THEME.accents.purple}
                  xLabel="Waktu t (s)"
                  yLabel="Energi (J)"
                  timeWindow={4}
                  yMin={0}
                  yMax={Math.max(0.2, theory.em1 * 1.3)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ExploreShell>
  );
}
