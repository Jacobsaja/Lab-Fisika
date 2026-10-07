"use client";

import React, { useState, useEffect } from "react";
import { PracticumShell, PracticumShellContext } from "@/components/practicum/PracticumShell";
import { OhausBalance } from "@/components/practicum/instruments/OhausBalance";
import { Caliper } from "@/components/practicum/instruments/Caliper";
import { TorsionalOscillator } from "@/components/practicum/instruments/TorsionalOscillator";
import { PracticumConfig } from "@/types/practicum";
import { loadMomentOfInertiaResult } from "@/physics/momentOfInertia";
import { FALLBACK_I0, FALLBACK_KAPPA, FALLBACK_T0, RigidBodyShape, getBodyTheoryInertia, simulatePracticumFiveOscillations } from "@/physics/momentOfInertia2";
import { MomentOfInertiaCalculationPanel, buildMI2MeasuredRow, Row, rowToMI2Trial } from "@/components/practicum/MomentOfInertiaCalculationPanel";
import { MI2Review } from "@/components/practicum/MomentOfInertiaReview";

const REQUIRED_ROWS = 2; // satu untuk bola pejal, satu untuk silinder pejal

const practicumConfig: PracticumConfig = {
  id: "momen-inersia-2",
  title: "Momen Inersia II",
  category: "Mekanika",
  introduction: "Pada praktikum ini, Anda akan menentukan momen inersia benda tegar (silinder pejal, bola pejal) dengan mengukurnya melalui osilasi alat momen inersia yang telah diketahui I₀-nya.",
  objectives: [
    "Menentukan momen inersia benda tegar secara eksperimen.",
    "Membandingkan hasil eksperimen dengan perhitungan teoritis.",
  ],
  instructions: [
    "Bagian 1: Timbang massa benda dan ukur jari-jarinya.",
    "Bagian 2: Pasang benda pada alat, simpangkan 90°, dan lepaskan.",
    "Bagian 3: Catat waktu untuk 5 getaran. Ulangi 5 kali untuk setiap benda.",
    "Catat data ke Tabel 8.6 dan 8.7, lalu hitung I eksperimen dan kesalahan relatif (KSR) di Tabel 8.8."
  ],
  simulationType: "Momen Inersia 2",
  recommendedDurationSec: 1800,
  columns: [
    { key: "shape", label: "Benda", unit: "" },
    { key: "mass", label: "Massa (kg)", unit: "kg" },
    { key: "r", label: "Jari-jari (m)", unit: "m" },
    { key: "t5_1", label: "t₁ (s)", unit: "s" },
    { key: "t5_2", label: "t₂ (s)", unit: "s" },
    { key: "t5_3", label: "t₃ (s)", unit: "s" },
    { key: "t5_4", label: "t₄ (s)", unit: "s" },
    { key: "t5_5", label: "t₅ (s)", unit: "s" },
  ],
  questions: [
    {
      id: "q1",
      type: "multiple-choice",
      prompt: "Mengapa periode osilasi silinder pejal lebih besar daripada bola pejal (dengan massa dan jari-jari sama)?",
      options: [
        "Massa silinder lebih berat.",
        "Momen inersia teori silinder lebih besar.",
        "Gesekan udara pada silinder lebih besar.",
        "Karena silinder tidak simetris."
      ],
      correctIndex: 1,
      feedbackHint: "Ingat kembali rumus I = 1/2 MR² vs I = 2/5 MR²."
    },
    {
      id: "q2",
      type: "text",
      prompt: "Sebutkan dua sumber kesalahan yang mungkin memengaruhi perbedaan nilai momen inersia teori dengan hasil eksperimen pada percobaan ini!",
      keywords: ["gesekan", "poros", "waktu", "ketelitian", "simetris"],
      minLength: 15,
      feedbackHint: "Bisa terkait dengan kondisi alat (poros/gesekan) atau kesalahan pengukuran manual."
    },
    {
      id: "q3",
      type: "numeric",
      prompt: "Jika didapatkan rata-rata waktu 5 getaran adalah 18,5 detik, berapakah periode (T) benda tersebut?",
      expectedValue: 3.7,
      tolerance: 0.1,
      toleranceType: "absolute",
      unit: "s",
      feedbackHint: "Periode (T) adalah waktu untuk SATU getaran penuh."
    }
  ]
};

function countMeasuredRows(state: { recordedData: Record<string, string | number>[] }): number {
  return state.recordedData.filter((row) => rowToMI2Trial(row as Row) !== null).length;
}

function MI2PracticumSimulation({ state, setRecordedData, addDataRow }: PracticumShellContext) {
  const [activeTab, setActiveTab] = useState<"A" | "B">("A");
  
  // State for apparatus constants
  const [i0, setI0] = useState(FALLBACK_I0);
  const [kappa, setKappa] = useState(FALLBACK_KAPPA);
  const [t0, setT0] = useState(FALLBACK_T0);
  const [sourceLabel, setSourceLabel] = useState("nilai acuan alat");

  // State for body
  const [shape, setShape] = useState<RigidBodyShape>("solid-sphere");
  const [trialIndex, setTrialIndex] = useState(0);

  // Hardcoded values for the practicum objects
  const bodyData = {
    "solid-sphere": { mass: 1.0, r: 0.05, label: "Bola Pejal" },
    "solid-cylinder": { mass: 1.2, r: 0.05, label: "Silinder Pejal" }
  };

  useEffect(() => {
    // Try to load student's MI 1 result
    const mi1 = loadMomentOfInertiaResult();
    if (mi1 && mi1.i0 > 0 && mi1.kappa > 0 && mi1.t0 > 0) {
      setI0(mi1.i0);
      setKappa(mi1.kappa);
      setT0(mi1.t0);
      setSourceLabel("dari percobaan Momen Inersia I");
    }
  }, []);

  const handleRecord = () => {
    const b = bodyData[shape];
    const bodyInertia = getBodyTheoryInertia({ shape, massKg: b.mass, radiusM: b.r });
    
    // Simulate 5 timings
    const t5_1 = simulatePracticumFiveOscillations(i0, kappa, bodyInertia, trialIndex, shape);
    const t5_2 = simulatePracticumFiveOscillations(i0, kappa, bodyInertia, trialIndex + 1, shape);
    const t5_3 = simulatePracticumFiveOscillations(i0, kappa, bodyInertia, trialIndex + 2, shape);
    const t5_4 = simulatePracticumFiveOscillations(i0, kappa, bodyInertia, trialIndex + 3, shape);
    const t5_5 = simulatePracticumFiveOscillations(i0, kappa, bodyInertia, trialIndex + 4, shape);

    const newRow = buildMI2MeasuredRow({
      shape,
      mass: b.mass,
      r: b.r,
      t5_1, t5_2, t5_3, t5_4, t5_5,
      i0, t0
    });

    addDataRow(newRow);
    setTrialIndex(prev => prev + 5);
  };

  if (state.currentStep === "REVIEW") {
    return <MI2Review rows={state.recordedData as Row[]} />;
  }

  return (
    <div className="flex flex-col gap-6 p-6 w-full h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-6">
        <div className="bg-slate-900 border border-slate-700 text-slate-300 p-3 rounded-lg text-xs font-mono mb-2 flex justify-between">
          <span>Konstanta Alat: I₀ = {i0.toPrecision(4)} kg·m², T₀ = {t0.toFixed(3)} s</span>
          <span className="text-amber-400 italic">({sourceLabel})</span>
        </div>

        <div className="flex bg-white/5 rounded-xl p-1 gap-1 w-full max-w-md border border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab("A")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${
              activeTab === "A" ? "bg-blue-600 text-white shadow" : "text-white/50 hover:bg-white/10"
            }`}
          >
            1. Ukur Benda
          </button>
          <button
            onClick={() => setActiveTab("B")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${
              activeTab === "B" ? "bg-emerald-600 text-white shadow" : "text-white/50 hover:bg-white/10"
            }`}
          >
            2. Osilasi
          </button>
        </div>

        <div className="flex-1 pr-2 pb-10">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setShape("solid-sphere")}
              className={`px-4 py-2 rounded-lg font-bold border-2 transition-all ${
                shape === "solid-sphere" ? "bg-indigo-500 border-indigo-500 text-white" : "border-white/20 text-white/50"
              }`}
            >
              Bola Pejal
            </button>
            <button
              onClick={() => setShape("solid-cylinder")}
              className={`px-4 py-2 rounded-lg font-bold border-2 transition-all ${
                shape === "solid-cylinder" ? "bg-indigo-500 border-indigo-500 text-white" : "border-white/20 text-white/50"
              }`}
            >
              Silinder Pejal
            </button>
          </div>

          {activeTab === "A" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              <OhausBalance valueGrams={bodyData[shape].mass * 1000} />
              <Caliper objectWidthMm={bodyData[shape].r * 2 * 1000} measurementMode="outer" />
            </div>
          )}

          {activeTab === "B" && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <TorsionalOscillator 
                mode="practicum"
                i0True={i0}
                kappaTrue={kappa}
                attachedBodyInertia={getBodyTheoryInertia({ shape, massKg: bodyData[shape].mass, radiusM: bodyData[shape].r })}
                attachedBodyShape={shape}
                attachedBodyRadius={bodyData[shape].r}
              />
              <button
                onClick={handleRecord}
                className="mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all w-fit self-center"
              >
                Simulasikan 5x Pengukuran & Rekam Tabel
              </button>
            </div>
          )}
        </div>
      </div>
      
      {state.currentStep === "SIMULATION" && (
        <MomentOfInertiaCalculationPanel rows={state.recordedData as Row[]} onRowsChange={setRecordedData} />
      )}
    </div>
  );
}

export default function MomenInersia2Page() {
  return (
    <PracticumShell
      config={practicumConfig}
      isNextDisabled={(state) => state.currentStep === "SIMULATION" && countMeasuredRows(state) < REQUIRED_ROWS}
      simulationComponent={(ctx) => <MI2PracticumSimulation key={ctx.resetCount} {...ctx} />}
    />
  );
}
