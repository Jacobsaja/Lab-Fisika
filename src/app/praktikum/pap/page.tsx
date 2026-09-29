"use client";

import React, { useState } from "react";
import { PracticumShell } from "@/components/practicum/PracticumShell";
import { PracticumConfig } from "@/types/practicum";
import { Caliper } from "@/components/practicum/instruments/Caliper";
import { OhausBalance } from "@/components/practicum/instruments/OhausBalance";
import { usePracticumSession } from "@/hooks/usePracticumSession";

const CALIPER_OBJECTS: { id: string; name: string; trueValue: number; mode: "outer" | "inner" | "depth" }[] = [
  { id: "c1", name: "Balok Logam (Lebar Celah)", trueValue: 18.55, mode: "inner" },
  { id: "c2", name: "Balok Logam (Kedalaman Celah)", trueValue: 32.40, mode: "depth" },
  { id: "c3", name: "Koin Rp500 (Diameter Luar)", trueValue: 27.45, mode: "outer" },
  { id: "c4", name: "Kelereng (Diameter Luar)", trueValue: 15.85, mode: "outer" },
];

const OHAUS_OBJECTS = [
  { id: "o1", name: "Balok Tembaga", trueValue: 435.60 },
  { id: "o2", name: "Silinder Kuningan", trueValue: 124.30 },
  { id: "o3", name: "Bandul Baja", trueValue: 275.80 },
  { id: "o4", name: "Pemberat Logam", trueValue: 182.45 },
];
const CONFIG: PracticumConfig = {
  id: "pap-01",
  title: "Pengukuran dan Angka Penting",
  category: "Mekanika",
  recommendedDurationSec: 900, // 15 mins
  introduction: "Dalam eksperimen ini, kita akan mempelajari ketidakpastian, pengolahan data sederhana, dan berbagai macam pengukuran. Anda akan menggunakan Jangka Sorong untuk mengukur dimensi (panjang/diameter) dan Neraca O'haus untuk mengukur massa.",
  objectives: [
    "Mempelajari ketidakpastian, pengolahan data sederhana dan berbagai macam pengukuran.",
    "Menentukan ketidakpastian dalam proses pengukuran.",
    "Memahami aturan angka penting dan penggunaannya.",
    "Dapat mengoperasikan angka penting sesuai dengan aturan."
  ],
  instructions: [
    "Pilih instrumen pengukuran (Jangka Sorong atau Neraca O'haus).",
    "Pilih objek yang ingin diukur dari daftar.",
    "Amati skala instrumen secara manual dan baca nilai pengukurannya dengan teliti.",
    "Klik '+ Tambah Baris' pada tabel pengamatan di panel bawah.",
    "Ketik nama benda secara manual, lalu masukkan nilai ukur (x), ketidakpastian (∆x), dan penulisan {x ± ∆x} sesuai aturan angka penting.",
    "Lakukan ini untuk minimal 4 objek."
  ],
  columns: [
    { key: "nama", label: "Nama Benda", unit: "" },
    { key: "x", label: "x", unit: "satuan" },
    { key: "delta_x", label: "∆x", unit: "satuan" },
    { key: "format", label: "{x ± ∆x}", unit: "satuan" },
  ],
  questions: [
    {
      id: "pap-q1",
      type: "multiple-choice",
      prompt: "Bagian jangka sorong mana yang digunakan untuk mengukur kedalaman celah?",
      options: ["Rahang tetap bawah", "Rahang geser atas", "Rahang bawah (utama)", "Batang pengukur kedalaman (depth probe)"],
      correctIndex: 3,
      feedbackHint: "Ingat fungsi batang tipis yang memanjang keluar dari ujung badan jangka sorong saat rahang digeser."
    },
    {
      id: "pap-q2",
      type: "numeric",
      prompt: "Jika skala utama menunjukkan angka terakhir yang terlewati adalah 12 mm dan garis skala nonius ke-7 berimpit dengan skala utama (ketelitian 0,05 mm), berapa hasil bacaannya dalam mm?",
      expectedValue: 12.35,
      tolerance: 0,
      toleranceType: "absolute",
      unit: "mm",
      feedbackHint: "Hasil = Skala Utama + (Garis Nonius × Ketelitian). Hitung: 12 + (7 × 0,05)."
    },
    {
      id: "pap-q3",
      type: "multiple-choice",
      prompt: "Mengapa pengukuran celah (baik lebar maupun kedalaman) perlu dilakukan secara berulang (misal 3 kali)?",
      options: [
        "Agar alat ukur tidak cepat rusak karena dipakai sekali saja.",
        "Untuk mengurangi dan memperkirakan ketidakpastian acak (random error) serta meningkatkan tingkat kepercayaan hasil.",
        "Untuk mengubah nilai ketelitian (NST) dari jangka sorong.",
        "Untuk memperbesar nilai kesalahan sistematis."
      ],
      correctIndex: 1,
      feedbackHint: "Pengukuran berulang membantu kita mendeteksi variasi kecil atau kesalahan acak setiap kali kita menempatkan alat, sehingga nilai rata-ratanya lebih akurat."
    },
    {
      id: "pap-q4",
      type: "numeric",
      prompt: "Misalkan rata-rata hasil ukur lebar celah adalah 18.55 mm dan ketidakpastian mutlak (Δx) adalah 0.05 mm. Hitung ketidakpastian relatifnya dalam satuan persen (%)! (Tulis angkanya saja)",
      expectedValue: 0.27,
      tolerance: 0.05,
      toleranceType: "absolute",
      unit: "%",
      feedbackHint: "Ketidakpastian Relatif = (Δx / x̄) × 100%. Hitung: (0.05 / 18.55) × 100%."
    }
  ],
  simulationType: "measurement"
};

function PAPSimulation() {
  const { state } = usePracticumSession("pap-01");
  const [instrument, setInstrument] = useState<"caliper" | "ohaus">("caliper");
  const [activeObjectId, setActiveObjectId] = useState("c1");

  const objects = instrument === "caliper" ? CALIPER_OBJECTS : OHAUS_OBJECTS;
  const activeObject = objects.find(o => o.id === activeObjectId) || objects[0];

  if (state.currentStep === "REVIEW") {
    // Collect all true values to map against recorded data
    const allObjects = [...CALIPER_OBJECTS, ...OHAUS_OBJECTS];
    
    return (
      <div className="flex flex-col w-full h-full p-8 gap-6 bg-[#0a0f1c] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-2">Evaluasi Pengukuran Anda</h2>
        <p className="text-white/60 mb-6">Berikut adalah perbandingan antara hasil pengukuran Anda dan ukuran aslinya.</p>
        
        <div className="bg-[#11182A] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 border-b border-white/10 text-white/50 uppercase">
              <tr>
                <th className="p-4 font-semibold">Nama Benda</th>
                <th className="p-4 font-semibold">Ukur Praktikan (x)</th>
                <th className="p-4 font-semibold">Nilai Asli</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {state.recordedData.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-center text-white/40">Belum ada data dicatat.</td></tr>
              ) : (
                state.recordedData.map((row, idx) => {
                  const trueObj = allObjects.find(o => o.name.toLowerCase() === String(row.nama).toLowerCase());
                  const praktikanVal = parseFloat(String(row.x).replace(',', '.'));
                  let status = "Tidak Diketahui";
                  let color = "text-white/40";
                  
                  if (trueObj && !isNaN(praktikanVal)) {
                    // tolerance depending on tool. let's assume 0.05 for caliper, 0.05 for ohaus
                    const diff = Math.abs(praktikanVal - trueObj.trueValue);
                    if (diff <= 0.051) {
                      status = "Tepat/Akurat";
                      color = "text-emerald-400";
                    } else if (diff <= 0.15) {
                      status = "Kurang Tepat (Meleset dikit)";
                      color = "text-amber-400";
                    } else {
                      status = "Tidak Akurat";
                      color = "text-red-400";
                    }
                  }

                  return (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 font-medium text-white">{String(row.nama || "-")}</td>
                      <td className="p-4 font-mono">{String(row.x || "-")}</td>
                      <td className="p-4 font-mono text-blue-300">{trueObj ? trueObj.trueValue : "-"}</td>
                      <td className={`p-4 font-bold ${color}`}>{status}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full p-6 gap-6 bg-[#0a0f1c]">
      
      {/* Control Panel */}
      <div className="flex flex-wrap gap-4 bg-white/5 p-4 rounded-xl border border-white/10 shrink-0">
        <div className="flex flex-col gap-2">
          <label className="text-xs text-white/50 font-bold uppercase">Instrumen</label>
          <div className="flex gap-2">
            <button 
              onClick={() => { setInstrument("caliper"); setActiveObjectId("c1"); }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${instrument === "caliper" ? "bg-blue-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
            >
              Jangka Sorong
            </button>
            <button 
              onClick={() => { setInstrument("ohaus"); setActiveObjectId("o1"); }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${instrument === "ohaus" ? "bg-blue-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
            >
              Neraca O'haus
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-white/50 font-bold uppercase">Objek</label>
          <div className="flex gap-2">
            {objects.map(obj => (
              <button 
                key={obj.id}
                onClick={() => setActiveObjectId(obj.id)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${activeObjectId === obj.id ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-white/60 border border-transparent hover:bg-white/10"}`}
              >
                {obj.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Instrument Display Area */}
      <div className="flex-1 flex flex-col items-center justify-center bg-black/20 rounded-xl border border-white/5 p-8 relative overflow-hidden">
        
        {/* Decorative Grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
        
        <div className="z-10 w-full max-w-2xl flex flex-col items-center gap-6">
          <h2 className="text-2xl font-bold text-white/90">
            Mengukur {activeObject.name}
          </h2>
          <p className="text-white/50 text-sm">Baca nilai ukur pada instrumen di bawah ini secara teliti.</p>

          <div className="w-full">
            {instrument === "caliper" ? (
              <Caliper 
                key={activeObjectId} 
                objectWidthMm={activeObject.trueValue} 
                objectName={activeObject.name.split(" (")[0]} 
                measurementMode={(activeObject as any).mode || "outer"} 
              />
            ) : (
              <OhausBalance valueGrams={activeObject.trueValue} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PAPPracticumPage() {
  return (
    <PracticumShell 
      config={CONFIG}
      simulationComponent={<PAPSimulation />}
    />
  );
}
