"use client";

import React, { useState } from "react";
import { PracticumShell } from "@/components/practicum/PracticumShell";
import { PracticumConfig } from "@/types/practicum";
import { AtwoodApparatus } from "@/components/practicum/instruments/AtwoodApparatus";
import { usePracticumSession } from "@/hooks/usePracticumSession";
import { calculateTrueAcceleration2, calculateAtwoodGLBRegression } from "@/physics/atwood";

const CONFIG: PracticumConfig = {
  id: "atwood-glb",
  title: "Pesawat Atwood: GLB",
  category: "Mekanika",
  recommendedDurationSec: 1200, // 20 mins
  introduction: "Modul ini berfokus pada Gerak Lurus Beraturan (GLB). Anda akan mengamati gerak sistem Atwood setelah tercapainya keseimbangan gaya (ketika beban tambahan tertangkap di cincin B).",
  objectives: [
    "Membuktikan bahwa benda bergerak lurus beraturan (GLB) ketika resultan gaya adalah nol.",
    "Menentukan kecepatan konstan sistem setelah beban tambahan dilepaskan."
  ],
  instructions: [
    "Jarak A-B telah ditetapkan secara otomatis sebesar 20 cm.",
    "Beban tambahan yang digunakan adalah kombinasi m3+m4.",
    "Variasikan jarak B-C dengan menggeser landasan C (minimal 5 variasi jarak).",
    "Klik 'LEPAS KLEM (P)'. Beban akan mulai turun dipercepat hingga mencapai B.",
    "Saat beban melewati B (beban tambahan tersangkut), stopwatch akan MENYALA OTOMATIS.",
    "Saat beban m2 mencapai landasan C, KLIK 'STOP' secara manual pada stopwatch.",
    "Catat Jarak B-C dan Waktu t (GLB) di tabel pengamatan."
  ],
  columns: [
    { key: "jarak_bc", label: "Jarak BC (s)", unit: "m" },
    { key: "t_glb", label: "Waktu t (GLB)", unit: "s" },
  ],
  questions: [
    {
      id: "atw-glb-q1",
      type: "multiple-choice",
      prompt: "Pada praktik GLB ini, mengapa percepatan sistem menjadi nol setelah melewati cincin B?",
      options: [
        "Karena gaya gesekan katrol tiba-tiba meningkat.",
        "Karena massa beban utama m1 dan m2 kembali setimbang setelah beban tambahan tersangkut di B.",
        "Karena sistem mengerem secara otomatis.",
        "Karena jarak dari B ke C terlalu pendek."
      ],
      correctIndex: 1,
      feedbackHint: "Berdasarkan Hukum Newton II, a = ΣF / m. Setelah beban tambahan (m3+m4) tersangkut di cincin B, massa di kedua sisi tali menjadi sama (m1 = m2). Oleh karena itu, ΣF (resultan gaya) menjadi nol, yang menyebabkan percepatan a = 0 (kecepatan konstan)."
    }
  ],
  simulationType: "measurement",
  analysis: {
    xColumn: "t_glb",
    yColumn: "jarak_bc",
    xLabel: "Waktu GLB (s)",
    yLabel: "Jarak BC (m)",
    showRegression: true,
  }
};

function GLBOrchestrator() {
  const { state } = usePracticumSession(CONFIG.id);
  // Generate ground truths secara persisten per sesi menggunakan useState
  const [gLocal] = useState(() => 9.75 + Math.random() * 0.1);
  
  // Massa instrumen (dalam gram) - disamakan dengan Modul 2.1
  const m1 = 250;
  const m2 = 250;
  const m3 = 5;
  const m4 = 5;

  // Hitung kecepatan GLB di fase B-C
  const [a2_true] = useState(() => calculateTrueAcceleration2({ m1, m2, m3, m4, g: gLocal }));
  
  // Jarak AB diset konstan 0.2 m (20cm) untuk Modul 2.2
  const [v_true] = useState(() => Math.sqrt(2 * a2_true * 0.2));

  if (state.currentStep === "REVIEW") {
    const data = state.recordedData.map(r => ({
      s: parseFloat(String(r.jarak_bc).replace(',', '.')),
      t: parseFloat(String(r.t_glb).replace(',', '.'))
    })).filter(r => !isNaN(r.s) && !isNaN(r.t));

    const reg = calculateAtwoodGLBRegression(data);

    return (
      <div className="w-full h-full p-8 flex flex-col items-center overflow-y-auto bg-[#0a0f1c]">
        <div className="w-full max-w-5xl space-y-8">
          <h2 className="text-2xl font-bold text-white mb-2">Analisis Data Regresi (GLB)</h2>
          <p className="text-white/60 mb-8">
            Berikut adalah tabel perhitungan berdasarkan data yang Anda catat. Silakan hitung nilai kecepatan konstan (v), ketidakpastian (Δv), dan Tingkat Ketelitian (TK). Ingat bahwa pada regresi ini, nilai kecepatan (v) secara langsung sama dengan gradien (slope) garis regresi.
          </p>

          <div className="bg-[#11182A] border border-white/10 rounded-xl overflow-hidden shadow-2xl p-6">
            <h3 className="font-bold text-blue-400 mb-4 text-lg">Tabel 2.5: Jarak BC vs Waktu GLB</h3>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-white/5 border-b border-white/10 text-white/50">
                  <tr>
                    <th className="p-3 border-r border-white/10">No</th>
                    <th className="p-3 border-r border-white/10">x = t (s)</th>
                    <th className="p-3 border-r border-white/10">y = s (m)</th>
                    <th className="p-3 border-r border-white/10">x²</th>
                    <th className="p-3 border-r border-white/10">y²</th>
                    <th className="p-3">xy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/80 font-mono">
                  {reg.points.map((p, idx) => (
                    <tr key={idx}>
                      <td className="p-3 border-r border-white/10">{idx + 1}</td>
                      <td className="p-3 border-r border-white/10">{p.x.toFixed(4)}</td>
                      <td className="p-3 border-r border-white/10">{p.y.toFixed(4)}</td>
                      <td className="p-3 border-r border-white/10">{(p.x * p.x).toFixed(4)}</td>
                      <td className="p-3 border-r border-white/10">{(p.y * p.y).toFixed(4)}</td>
                      <td className="p-3">{(p.x * p.y).toFixed(4)}</td>
                    </tr>
                  ))}
                  <tr className="bg-white/5 font-bold text-white">
                    <td className="p-3 border-r border-white/10 text-right">Σ</td>
                    <td className="p-3 border-r border-white/10">{reg.sumX.toFixed(4)}</td>
                    <td className="p-3 border-r border-white/10">{reg.sumY.toFixed(4)}</td>
                    <td className="p-3 border-r border-white/10">{reg.sumX2.toFixed(4)}</td>
                    <td className="p-3 border-r border-white/10">{reg.sumY2.toFixed(4)}</td>
                    <td className="p-3">{reg.sumXY.toFixed(4)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div>
                  <label className="block text-xs font-bold text-white/50 mb-2">Kecepatan (v)</label>
                  <input type="number" step="0.001" placeholder={process.env.NODE_ENV === 'development' ? `Kunci: ${reg.v.toFixed(3)} m/s` : "Hasil Anda (contoh: 0.123)"} className="w-full bg-black/30 border border-white/20 rounded-lg p-3 text-white font-mono" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-white/50 mb-2">Ketidakpastian (Δv)</label>
                  <input type="number" step="0.001" placeholder={process.env.NODE_ENV === 'development' ? `Kunci: ${reg.deltaV.toFixed(3)} m/s` : "Hasil Anda (contoh: 0.012)"} className="w-full bg-black/30 border border-white/20 rounded-lg p-3 text-white font-mono" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-white/50 mb-2">Tingkat Ketelitian (TK)</label>
                  <input type="number" step="0.1" placeholder={process.env.NODE_ENV === 'development' ? `Kunci: ${(reg.tk * 100).toFixed(1)} %` : "Hasil Anda (contoh: 98.5)"} className="w-full bg-black/30 border border-white/20 rounded-lg p-3 text-white font-mono" />
               </div>
            </div>
          </div>
          
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-xl flex items-center justify-between shadow-lg">
             <div>
                <h3 className="font-bold text-emerald-400 text-lg mb-2">Kesimpulan</h3>
                <p className="text-emerald-100/70 text-sm">Terbukti bahwa setelah melewati landasan B, sistem bergerak dengan kecepatan konstan (GLB) karena resultan gayanya menjadi nol.</p>
             </div>
             <div className="text-right flex flex-col items-end">
                <span className="text-xs text-emerald-400/50 mb-1 font-bold">HASIL ANDA</span>
                <span className="font-mono font-bold text-xl text-white">v = {reg.v.toFixed(3)} ± {reg.deltaV.toFixed(3)} m/s</span>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center">
      <div className="flex-1 w-full flex justify-center items-center pb-8 px-4 overflow-y-auto">
        <div className="w-full max-w-5xl h-full min-h-[700px] flex items-center justify-center">
          
          <AtwoodApparatus 
            mode="GLB" 
            additionalMassConfig="m3_m4" 
            a_true={a2_true} 
            v_true={v_true} 
          />

        </div>
      </div>
    </div>
  );
}

export default function AtwoodGLBPage() {
  const { state } = usePracticumSession(CONFIG.id);
  const isDataStep = state.currentStep === "SIMULATION";
  
  // Validasi: hanya hitung baris yang semua datanya sudah terisi angka valid
  const validRowCount = state.recordedData.filter(r => {
    const s = parseFloat(String(r.jarak_bc).replace(',', '.'));
    const t = parseFloat(String(r.t_glb).replace(',', '.'));
    return !isNaN(s) && !isNaN(t);
  }).length;
  
  // Minimal 5 baris variasi jarak
  const hasEnoughData = validRowCount >= 5;
  const isNextDisabled = isDataStep && !hasEnoughData;

  return (
    <PracticumShell 
      config={CONFIG} 
      simulationComponent={<GLBOrchestrator />}
      isNextDisabled={isNextDisabled}
    />
  );
}
