"use client";

import React, { useState, useRef, useMemo, useCallback } from "react";
import { ExploreShell } from "@/components/explore/ExploreShell";
import {
  AirTrackPulleyApparatus,
  AirTrackPulleyApparatusRef,
} from "@/components/practicum/instruments/AirTrackPulleyApparatus";
import {
  G_STANDARD,
  calculatePullingForce,
  calculateTheoreticalAcceleration,
  calculateStringTension,
  computeH2NTrial,
  H2NTrialResult,
  H2N_DROP_HEIGHT_H0,
  H2N_RAIL_TRAVEL,
  H2N_EXP1_GATE1_X,
  H2N_EXP1_GATE2_X,
} from "@/physics/h2n";
import { MotionState } from "@/physics/airTrackPulleySystem";
import { LineGraph, DataPoint } from "@/components/simulation/LineGraph";
import { SCIENTIFIC_THEME } from "@/components/simulation/visual";
import { Sliders, Activity, Zap, RotateCcw, Weight, Gauge, ArrowRight } from "lucide-react";

export default function H2NExplorePage() {
  const apparatusRef = useRef<AirTrackPulleyApparatusRef>(null);

  // Parameters
  const [cartBaseGrams, setCartBaseGrams] = useState(150); // 150g base cart
  const [extraWeightsCount, setExtraWeightsCount] = useState(0); // 0..4 weights of 12.5g
  const [hangingMassGrams, setHangingMassGrams] = useState(15); // 5, 10, 15, 20, 25g
  const [gate1Pos, setGate1Pos] = useState(H2N_EXP1_GATE1_X); // 0.25 m
  const [gate2Pos, setGate2Pos] = useState(H2N_EXP1_GATE2_X); // 0.65 m
  const [flagWidthMm, setFlagWidthMm] = useState(30); // 30 mm = 3 cm
  const [frictionForce, setFrictionForce] = useState(0); // N (default ideal = 0)
  const [pulleyEffMassGrams, setPulleyEffMassGrams] = useState(0); // g

  // Measured trial result from apparatus
  const [trialResult, setTrialResult] = useState<H2NTrialResult | null>(null);

  // Streaming graph points
  const [graphPointsV, setGraphPointsV] = useState<DataPoint[]>([]);
  const [graphPointsS, setGraphPointsS] = useState<DataPoint[]>([]);

  const totalCartMassGrams = cartBaseGrams + extraWeightsCount * 12.5;
  const cartMassKg = totalCartMassGrams / 1000;
  const hangingMassKg = hangingMassGrams / 1000;
  const flagWidthM = flagWidthMm / 1000;
  const pulleyEffMassKg = pulleyEffMassGrams / 1000;

  const addedLabel =
    extraWeightsCount > 0 ? `+${(extraWeightsCount * 12.5).toFixed(1)}g` : undefined;

  // Real-time animation callback to capture v(t) and s(t)
  const handleStateUpdate = useCallback((state: MotionState) => {
    setGraphPointsV((prev) => {
      const next = [...prev, { t: state.t, val: state.v }];
      return next.length > 250 ? next.slice(next.length - 250) : next;
    });
    setGraphPointsS((prev) => {
      const next = [...prev, { t: state.t, val: state.x }];
      return next.length > 250 ? next.slice(next.length - 250) : next;
    });
  }, []);

  const handleReset = () => {
    apparatusRef.current?.reset();
    setTrialResult(null);
    setGraphPointsV([]);
    setGraphPointsS([]);
  };

  // Live theoretical predictions
  const theory = useMemo(() => {
    const F = calculatePullingForce(hangingMassKg, G_STANDARD);
    const a = calculateTheoreticalAcceleration(
      cartMassKg,
      hangingMassKg,
      G_STANDARD,
      frictionForce,
      pulleyEffMassKg
    );
    const T = calculateStringTension(cartMassKg, a);
    const netForce = Math.max(0, F - frictionForce);
    const totalMass = cartMassKg + hangingMassKg;
    return {
      F,
      a,
      T,
      netForce,
      totalMass,
    };
  }, [cartMassKg, hangingMassKg, frictionForce, pulleyEffMassKg]);

  return (
    <ExploreShell
      title="Hukum II Newton (F = m·a)"
      category="Mekanika"
      description="Eksplorasi hubungan antara gaya tarik, massa total sistem, percepatan (F = m·a), serta tegangan tali pada rel udara horizontal dengan katrol. Variasikan massa kereta, beban gantung, dan amati dinamika gerak secara grafis dan analitik."
    >
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6">
        {/* Main Apparatus Simulation */}
        <div className="w-full">
          <AirTrackPulleyApparatus
            ref={apparatusRef}
            mode="explore"
            cartMass={cartMassKg}
            cartAddedMassLabel={addedLabel}
            hangingMass={hangingMassKg}
            dropHeight={H2N_DROP_HEIGHT_H0}
            railTravel={H2N_RAIL_TRAVEL}
            gate1Pos={gate1Pos}
            gate2Pos={gate2Pos}
            flagWidth={flagWidthM}
            frictionForce={frictionForce}
            pulleyEffectiveMass={pulleyEffMassKg}
            speedStorageKey="h2n-playback-speed-cache"
            onTrialComplete={() => {
              const res = computeH2NTrial(
                cartMassKg,
                hangingMassKg,
                gate1Pos,
                gate2Pos,
                flagWidthM,
                frictionForce,
                pulleyEffMassKg
              );
              setTrialResult(res);
            }}
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
                Parameter Rel &amp; Beban
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>

            {/* Cart Mass & Extra 12.5g masses */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Massa Kereta (M):</span>
                <strong className="text-cyan-400">
                  {totalCartMassGrams.toFixed(1)} g ({cartMassKg.toFixed(4)} kg)
                </strong>
              </div>
              <div className="grid grid-cols-5 gap-1.5 font-mono text-xs">
                {[0, 1, 2, 3, 4].map((count) => {
                  const mVal = 150 + count * 12.5;
                  const isSelected = extraWeightsCount === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        setCartBaseGrams(150);
                        setExtraWeightsCount(count);
                        handleReset();
                      }}
                      className={`py-1.5 px-1 rounded-lg border text-center transition-all ${
                        isSelected
                          ? "bg-cyan-600 border-cyan-400 text-white font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {mVal.toFixed(1)}g
                      <div className="text-[9px] text-slate-400 font-normal">
                        {count === 0 ? "Dasar" : `+${count * 12.5}g`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hanging Mass Selection (5, 10, 15, 20, 25 g) */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400 flex justify-between">
                <span>Beban Gantung (m):</span>
                <strong className="text-amber-400">
                  {hangingMassGrams} g ({(hangingMassKg * 9.8).toFixed(3)} N)
                </strong>
              </label>
              <div className="grid grid-cols-5 gap-1.5 font-mono text-xs">
                {[5, 10, 15, 20, 25].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setHangingMassGrams(val);
                      handleReset();
                    }}
                    className={`py-1.5 rounded-lg border text-center transition-all ${
                      hangingMassGrams === val
                        ? "bg-amber-600 border-amber-400 text-white font-bold shadow-[0_0_10px_rgba(245,158,11,0.3)]"
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
                min="0.05"
                max="0.35"
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
                min="0.40"
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
                <span className="text-slate-400">Lebar Penghalang Cahaya (w):</span>
                <strong className="text-slate-200">{flagWidthMm} mm</strong>
              </div>
              <input
                type="range"
                min="10"
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

            {/* Non-idealities (Friction & Pulley Inertia) */}
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                Efek Non-Ideal (Opsional)
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Gaya Gesek Rel Udara (f):</span>
                  <strong className="text-rose-400">{frictionForce.toFixed(3)} N</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.05"
                  step="0.005"
                  value={frictionForce}
                  onChange={(e) => {
                    setFrictionForce(parseFloat(e.target.value));
                    handleReset();
                  }}
                  className="w-full accent-rose-500 h-1.5 bg-slate-950 rounded cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Massa Efektif Katrol (m_eff):</span>
                  <strong className="text-purple-400">{pulleyEffMassGrams.toFixed(1)} g</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={pulleyEffMassGrams}
                  onChange={(e) => {
                    setPulleyEffMassGrams(parseFloat(e.target.value));
                    handleReset();
                  }}
                  className="w-full accent-purple-500 h-1.5 bg-slate-950 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Student Note */}
            <p className="text-[11px] text-slate-400 mt-2 font-mono leading-relaxed border-t border-slate-800/80 pt-3">
              Catatan: Lebar penghalang cahaya 3 cm, ketinggian jatuh H₀ = 0,80 m, dan percepatan gravitasi g = 9,8 m/s² digunakan sebagai parameter standar laboratorium.
            </p>
          </div>

          {/* Right Column: Analytics & Real-Time Graphs */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Live Analytics Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg">
                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Gaya Tarik (F = m·g)
                </div>
                <div className="text-lg font-bold font-mono text-amber-300 mt-1">
                  {theory.F.toFixed(4)} <span className="text-xs font-normal text-slate-400">N</span>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg">
                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                  <Weight className="w-3.5 h-3.5 text-cyan-400" />
                  Massa Total (M + m)
                </div>
                <div className="text-lg font-bold font-mono text-cyan-300 mt-1">
                  {(theory.totalMass * 1000).toFixed(1)}{" "}
                  <span className="text-xs font-normal text-slate-400">g</span>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg">
                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                  Percepatan Teori (a)
                </div>
                <div className="text-lg font-bold font-mono text-emerald-300 mt-1">
                  {theory.a.toFixed(4)}{" "}
                  <span className="text-xs font-normal text-slate-400">m/s²</span>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg">
                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  Tegangan Tali (T)
                </div>
                <div className="text-lg font-bold font-mono text-purple-300 mt-1">
                  {theory.T.toFixed(4)} <span className="text-xs font-normal text-slate-400">N</span>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg">
                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-rose-400" />
                  Gaya Bersih (ΣF)
                </div>
                <div className="text-lg font-bold font-mono text-rose-300 mt-1">
                  {theory.netForce.toFixed(4)}{" "}
                  <span className="text-xs font-normal text-slate-400">N</span>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg">
                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                  a_hitung (Gerbang)
                </div>
                <div className="text-lg font-bold font-mono text-blue-300 mt-1">
                  {trialResult !== null ? trialResult.aCalc.toFixed(4) : "—"}{" "}
                  <span className="text-xs font-normal text-slate-400">m/s²</span>
                </div>
              </div>
            </div>

            {/* Real-time Graphs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Velocity vs Time Graph */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col">
                <div className="text-xs font-mono font-bold text-cyan-400 mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Grafik Kecepatan v(t)
                </div>
                <div className="w-full flex justify-center bg-black/40 rounded-xl p-2 border border-slate-800/80 overflow-hidden">
                  <LineGraph
                    data={graphPointsV.length > 0 ? graphPointsV : [{ t: 0, val: 0 }]}
                    width={320}
                    height={180}
                    xLabel="Waktu (s)"
                    yLabel="v (m/s)"
                    color={SCIENTIFIC_THEME.accents.cyan}
                    timeWindow={4}
                    yMin={0}
                    yMax={1.5}
                  />
                </div>
              </div>

              {/* Position vs Time Graph */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col">
                <div className="text-xs font-mono font-bold text-emerald-400 mb-2 flex items-center gap-2">
                  <Gauge className="w-4 h-4" />
                  Grafik Posisi x(t)
                </div>
                <div className="w-full flex justify-center bg-black/40 rounded-xl p-2 border border-slate-800/80 overflow-hidden">
                  <LineGraph
                    data={graphPointsS.length > 0 ? graphPointsS : [{ t: 0, val: 0 }]}
                    width={320}
                    height={180}
                    xLabel="Waktu (s)"
                    yLabel="x (m)"
                    color={SCIENTIFIC_THEME.accents.emerald}
                    timeWindow={4}
                    yMin={0}
                    yMax={1.1}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ExploreShell>
  );
}
