"use client";

import React from "react";
import { PracticumShell } from "@/components/practicum/PracticumShell";
import { PracticumConfig } from "@/types/practicum";
import { MoveUp } from "lucide-react";

// DUMMY CONFIGURATION
const DUMMY_CONFIG: PracticumConfig = {
  id: "dummy-prac-01",
  title: "Dummy Practicum: Verification",
  category: "Test Environment",
  recommendedDurationSec: 300, // 5 mins
  introduction: "Ini adalah modul dummy untuk memverifikasi fungsionalitas dari PracticumShell, mencakup penyimpanan progress (localStorage), sinkronisasi data tabel, timer, dan kartu pertanyaan.",
  objectives: [
    "Memverifikasi alur langkah dari INTRO hingga REVIEW.",
    "Menguji persistensi localStorage saat refresh.",
    "Memvalidasi kartu pertanyaan dan tabel pencatatan data."
  ],
  instructions: [
    "Atur parameter simulasi (jika ada).",
    "Klik tombol 'Mulai' untuk menjalankan simulasi fisika.",
    "Buka bagian 'Catat Data' dan rekam hasil saat waktu tertentu tercapai."
  ],
  columns: [
    { key: "waktu", label: "Waktu (t)", unit: "s" },
    { key: "posisi", label: "Posisi (x)", unit: "m" },
    { key: "kecepatan", label: "Kecepatan (v)", unit: "m/s" },
  ],
  questions: [
    {
      id: "q1",
      type: "multiple-choice",
      prompt: "Apa tujuan utama dari simulasi ini?",
      options: ["Memvalidasi shell praktikum", "Bermain game", "Menghitung energi", "Menjatuhkan benda"],
      correctIndex: 0,
      feedbackHint: "Coba baca kembali teks pengantar di awal modul."
    },
    {
      id: "q2",
      type: "numeric",
      prompt: "Jika kecepatan awal benda adalah 0 m/s dan percepatan 2 m/s², berapa kecepatannya pada detik ke-5?",
      expectedValue: 10,
      tolerance: 0.1,
      toleranceType: "absolute",
      unit: "m/s",
      feedbackHint: "Gunakan rumus kinematika v = v0 + at"
    }
  ],
  simulationType: "dummy"
};

// DUMMY SIMULATION COMPONENT
function DummySimulation() {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-blue-900/20 border border-blue-500/30 rounded-2xl">
      <div className="w-32 h-32 bg-blue-500 rounded-full animate-bounce shadow-[0_0_40px_rgba(59,130,246,0.6)] flex items-center justify-center">
        <MoveUp className="text-white w-12 h-12 animate-pulse" />
      </div>
      <p className="mt-8 text-white/60 font-mono">Area Simulasi Kosong (Placeholder)</p>
    </div>
  );
}

export default function DummyPracticumPage() {
  return (
    <PracticumShell 
      config={DUMMY_CONFIG}
      simulationComponent={<DummySimulation />}
    />
  );
}
