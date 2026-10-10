"use client";

import React, { useState, useRef, useCallback } from "react";
import { PracticumShell, PracticumShellContext } from "@/components/practicum/PracticumShell";
import { PracticumConfig } from "@/types/practicum";
import { TorsionalPendulum, TorsionalPendulumRef } from "@/components/practicum/instruments/TorsionalPendulum";
import { LineGraph, DataPoint } from "@/components/simulation/LineGraph";
import { DataTable } from "@/components/practicum/DataTable";
import { Settings, Play, Square } from "lucide-react";
import { totalInertia, rodInertia, loadInertia } from "@/physics/torsionalOscillation";

const CONFIG: PracticumConfig = {
  id: "osilasi-torsional",
  title: "Osilasi Torsional",
  category: "Mekanika",
  recommendedDurationSec: 1800,
  introduction: "Dalam eksperimen ini, Anda akan mengamati gerak osilasi pendulum torsi, memahami konsep momen inersia, dan menentukan periode osilasi dari berbagai variasi jarak beban.",
  objectives: [
    "Mengamati gerak osilasi pendulum torsi.",
    "Memahami konsep momen inersia.",
    "Menentukan konstanta torsi kawat atau periode eksperimen."
  ],
  instructions: [
    "Atur jarak beban (r) menjadi 10 cm.",
    "Klik 'PLAY SENSOR' untuk menyimpangkan pendulum sebesar 90 derajat dan melepaskannya.",
    "Tunggu hingga 5 getaran penuh (sistem akan otomatis berhenti) dan catat waktu 5T yang muncul.",
    "Masukkan data waktu ke dalam tabel dan hitung T ukur.",
    "Ubah jarak beban menjadi 15 cm dan 20 cm, lalu ulangi prosedur yang sama.",
    "Lengkapi tabel perhitungan dan hitung KSR antara T ukur dengan T teori."
  ],
  columns: [
    { key: "r", label: "Posisi r", unit: "cm" },
    { key: "t5", label: "Waktu 5T", unit: "s" },
    { key: "tu", label: "T ukur", unit: "s" },
    { key: "tt", label: "T teori", unit: "s" },
    { key: "ksr", label: "KSR", unit: "%" },
  ],
  questions: [
    {
      id: "ot-q1",
      type: "multiple-choice",
      prompt: "Apa pengaruh penambahan jarak r beban terhadap periode T?",
      options: ["T bertambah", "T berkurang", "T tetap", "T menjadi nol"],
      correctIndex: 0,
      feedbackHint: "Semakin jauh beban, I membesar sehingga periode T juga bertambah."
    },
    {
      id: "ot-q2",
      type: "numeric",
      prompt: "Berapa Momen Inersia (I) total sistem saat r = 20cm? (I0 = 0.005, I_batang = 0.015, I_beban = ...)",
      expectedValue: 0.036,
      tolerance: 0.005,
      toleranceType: "absolute",
      unit: "kg·m²",
      feedbackHint: "I_beban = 2 * 0.2 * (0.2)^2 = 0.016. Total = 0.005 + 0.015 + 0.016 = 0.036"
    }
  ],
  simulationType: "measurement"
};

function TorsionalPracticumSimulation({ state, setRecordedData }: PracticumShellContext) {
  const appRef = useRef<TorsionalPendulumRef>(null);

  // Fixed Parameters
  const I0 = 0.005; // Base inertia kg m^2
  const kappa = 0.5; // Torsion constant N m / rad
  const rodLengthCm = 60;
  const rodMassKg = 0.5;
  const load1MassKg = 0.2;
  const load2MassKg = 0.2;

  // Apparatus state
  const [radiusCm, setRadiusCm] = useState(10);
  const [isOscillating, setIsOscillating] = useState(false);

  // Data capture state
  const [graphData, setGraphData] = useState<DataPoint[]>([]);
  const [, setCurrentT] = useState(0);

  // Derived physics
  const I_rod = rodInertia(rodMassKg, rodLengthCm);
  const I_load = loadInertia(load1MassKg, load2MassKg, radiusCm);
  const I_tot = totalInertia(I0, I_rod, I_load);

  const handleTimeChange = useCallback((t: number, running: boolean, reset: boolean) => {
    setIsOscillating(running);
    if (reset) {
      setGraphData([]);
      setCurrentT(0);
    } else if (!running && t > 0) {
      setCurrentT(t);
    }
  }, []);

  const handleStateUpdate = useCallback((t: number, angleDeg: number, _omega: number) => {
    setCurrentT(t);
    setGraphData(prev => {
      const newData = [...prev, { t, val: angleDeg }];
      if (newData.length > 300) return newData.slice(newData.length - 300);
      return newData;
    });
  }, []);

  return (
    <div className="w-full h-full flex flex-col p-6 gap-6 overflow-y-auto">
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Controls & Graph */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-400" /> Kontrol Benda
            </h3>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="radius-select" className="text-xs text-slate-400 font-bold mb-1 block">Jarak Beban (r)</label>
                <select
                  id="radius-select"
                  value={radiusCm}
                  onChange={e => { setRadiusCm(Number(e.target.value)); appRef.current?.reset(); }}
                  disabled={isOscillating}
                  className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm"
                >
                  <option value="10">10 cm</option>
                  <option value="15">15 cm</option>
                  <option value="20">20 cm</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => appRef.current?.start()}
                disabled={isOscillating}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4" /> PLAY SENSOR
              </button>
              <button
                onClick={() => appRef.current?.reset()}
                disabled={isOscillating}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Square className="w-4 h-4" /> RESET
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg flex-1 min-h-[300px] flex flex-col">
            <h3 className="font-bold text-white mb-2 text-sm">Grafik Sudut (θ) terhadap Waktu (s)</h3>
            <div className="flex-1 relative bg-black/30 rounded border border-slate-800 p-2 overflow-hidden flex items-center justify-center">
               <LineGraph
                 data={graphData}
                 width={400}
                 height={220}
                 xLabel="t (s)" yLabel="Sudut θ (°)"
                 timeWindow={10}
                 yMin={-100}
                 yMax={100}
               />
            </div>
          </div>
        </div>

        {/* Apparatus */}
        <div className="flex-[2] bg-slate-950 rounded-xl border border-slate-800 shadow-xl overflow-hidden flex justify-center items-center relative min-h-[500px]">
          <TorsionalPendulum
             ref={appRef}
             mode="practicum"
             rodLengthCm={rodLengthCm}
             radiusCm={radiusCm}
             totalInertia={I_tot}
             kappa={kappa}
             initialAngleDeg={90}
             onTimeChange={handleTimeChange}
             onStateUpdate={handleStateUpdate}
             className="w-full h-full shadow-none border-none bg-transparent"
          />
        </div>
      </div>

      {state.currentStep === "SIMULATION" && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col gap-4">
           <h3 className="font-bold text-white flex items-center gap-2">Tabel Pengamatan</h3>
           <DataTable
              columns={CONFIG.columns.map(c => ({ key: c.key, header: c.label, unit: c.unit, editable: true }))}
              rows={state.recordedData}
              onRowsChange={setRecordedData}
              newRowFactory={() => ({ r: 10, t5: "", tu: "", tt: "", ksr: "" })}
           />
        </div>
      )}
    </div>
  );
}

export default function TorsionalOscillationPracticumPage() {
  return (
    <PracticumShell
      config={CONFIG}
      simulationComponent={(ctx) => <TorsionalPracticumSimulation key={ctx.resetCount} {...ctx} />}
    />
  );
}
