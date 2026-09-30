"use client";

import React, { useState } from "react";
import { PracticumShell } from "@/components/practicum/PracticumShell";
import { OhausBalance } from "@/components/practicum/instruments/OhausBalance";
import { SudutSimpangan } from "@/components/practicum/instruments/SudutSimpangan";
import { TorsionalOscillator } from "@/components/practicum/instruments/TorsionalOscillator";
import { generateMomentOfInertiaGroundTruth, saveMomentOfInertiaResult } from "@/physics/momentOfInertia";
import { PracticumConfig } from "@/types/practicum";

// Konstanta set massa yang tersedia di lab (dalam gram)
const AVAILABLE_MASSES_G = [50, 100, 150, 200, 250];

const practicumConfig: PracticumConfig = {
  id: "momen-inersia-1",
  title: "Momen Inersia I",
  category: "Mekanika",
  introduction: "Pada praktikum ini, Anda akan menentukan konstanta pegas spiral dan momen inersia diri alat.",
  objectives: [
    "Menentukan konstanta pegas spiral (κ)",
    "Menentukan momen inersia diri alat (I₀)",
  ],
  instructions: [
    "Bagian A: Gantung beban secara bertahap dan amati simpangan sudutnya.",
    "Catat data ke Tabel 8.1 dan 8.2.",
    "Bagian B: Simpangkan piringan kosong sebesar 90 derajat lalu lepaskan.",
    "Amati waktu untuk 5 getaran yang dicatat oleh photogate.",
  ],
  simulationType: "Momen Inersia",
  recommendedDurationSec: 1800,
  columns: [
    { key: "massa", label: "Massa (M)", unit: "kg" },
    { key: "sudut", label: "Sudut (θ)", unit: "derajat" },
    { key: "waktu", label: "Waktu 5 Getaran (t)", unit: "s" },
  ],
  questions: [
    {
      id: "q1",
      type: "multiple-choice",
      prompt: "Besaran apa yang diwakili oleh gradien (kemiringan) grafik hubungan antara Torka (τ) pada sumbu-Y terhadap simpangan sudut (θ) pada sumbu-X?",
      options: [
        "Momen Inersia (I)",
        "Konstanta Pegas Spiral (κ)",
        "Percepatan Sudut (α)",
        "Waktu Getaran (T)"
      ],
      correctIndex: 1,
      feedbackHint: "Ingat kembali persamaan τ = κθ, yang merupakan bentuk linear y = mx."
    },
    {
      id: "q2",
      type: "text",
      prompt: "Sebutkan 3 besaran yang dikalikan untuk mendapatkan nilai Torka (τ) pada alat ini!",
      keywords: ["massa", "gravitasi", "jari"],
      minLength: 10,
      feedbackHint: "Terdiri dari massa beban, percepatan gravitasi, dan jari-jari drum."
    },
    {
      id: "q3",
      type: "multiple-choice",
      prompt: "Berdasarkan persamaan osilasi harmonik T₀ = 2π√(I₀/κ), jika konstanta pegas spiral (κ) membesar, bagaimana pengaruhnya terhadap periode osilasi?",
      options: [
        "Periode osilasi menjadi lebih lama",
        "Periode osilasi menjadi lebih singkat",
        "Periode osilasi tetap konstan",
        "Gerak menjadi tidak harmonik"
      ],
      correctIndex: 1,
      feedbackHint: "Perhatikan letak variabel κ pada persamaan (berada di bagian penyebut)."
    }
  ]
};

export default function MomenInersiaPart1Page() {
  // 1. GENERATE GROUND TRUTH SEKALI SAJA SAAT MOUNT
  const [groundTruth] = useState(() => generateMomentOfInertiaGroundTruth());
  
  // State UI & Praktikum
  const [activeTab, setActiveTab] = useState<"A" | "B">("A");
  
  // State Bagian A
  const [selectedMassIndex, setSelectedMassIndex] = useState<number>(-1);
  const activeMassGrams = selectedMassIndex >= 0 ? AVAILABLE_MASSES_G[selectedMassIndex] : 0;
  const activeMassKg = activeMassGrams / 1000;

  // Render UI simulasi interaktif
  const simulationUI = (
    <div className="flex flex-col gap-6 p-6 w-full max-w-5xl mx-auto h-full">
      
      {/* TAB NAVIGATION */}
      <div className="flex bg-white/5 rounded-xl p-1 gap-1 w-full max-w-md border border-white/10 shrink-0">
        <button
          onClick={() => setActiveTab("A")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${
            activeTab === "A" ? "bg-blue-600 text-white shadow" : "text-white/50 hover:bg-white/10"
          }`}
        >
          BAGIAN A (Pegas)
        </button>
        <button
          onClick={() => setActiveTab("B")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${
            activeTab === "B" ? "bg-emerald-600 text-white shadow" : "text-white/50 hover:bg-white/10"
          }`}
        >
          BAGIAN B (Alat)
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
        {activeTab === "A" && (
          <div className="flex flex-col gap-8 animate-fade-in">
            <div className="bg-blue-500/10 border-l-4 border-blue-500 p-4 rounded-r-lg">
              <h3 className="font-bold text-blue-400 mb-1">Bagian A: Mengukur Konstanta Pegas Spiral (κ)</h3>
              <p className="text-sm text-blue-200">
                Pilih beban, timbang dengan Neraca O'Haus, lalu gantungkan pada benang alat Momen Inersia.
                Amati dan catat sudut simpangannya.
              </p>
            </div>

            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6 items-start">
              <div className="flex flex-col gap-4">
                <div className="bg-white/5 p-4 rounded-xl shadow-sm border border-white/10">
                  <h4 className="font-bold text-white/90 mb-3">1. Pilih dan Timbang Beban</h4>
                  <div className="flex gap-2 flex-wrap mb-4">
                    {AVAILABLE_MASSES_G.map((mass, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedMassIndex(idx)}
                        className={`px-4 py-2 rounded-lg font-bold border-2 transition-all ${
                          selectedMassIndex === idx 
                            ? "bg-blue-500 border-blue-500 text-white" 
                            : "bg-transparent border-white/20 text-white/70 hover:border-white/40"
                        }`}
                      >
                        Beban {idx + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setSelectedMassIndex(-1)}
                      className="px-4 py-2 rounded-lg font-bold border-2 border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all ml-auto"
                    >
                      Lepas Beban
                    </button>
                  </div>
                  <OhausBalance valueGrams={activeMassGrams} />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <h4 className="font-bold text-white/90 pl-1">2. Amati Simpangan Sudut</h4>
                <SudutSimpangan 
                  massKg={activeMassKg} 
                  kappaTrue={groundTruth.kappaTrue} 
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "B" && (
          <div className="flex flex-col gap-8 animate-fade-in">
            <div className="bg-emerald-500/10 border-l-4 border-emerald-500 p-4 rounded-r-lg">
              <h3 className="font-bold text-emerald-400 mb-1">Bagian B: Mengukur Momen Inersia Diri Alat (I₀)</h3>
              <p className="text-sm text-emerald-200">
                Piringan KOSONG (tanpa beban). Simpangkan piringan sebesar 90°, lalu lepaskan. 
                Timer akan mencatat waktu untuk tepat 5 getaran.
              </p>
            </div>

            <div className="w-full">
              <TorsionalOscillator 
                i0True={groundTruth.i0True} 
                kappaTrue={groundTruth.kappaTrue} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <PracticumShell
      config={practicumConfig}
      simulationComponent={simulationUI}
    />
  );
}
