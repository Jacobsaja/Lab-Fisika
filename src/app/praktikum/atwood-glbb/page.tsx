"use client";

import React, { useState } from "react";
import { PracticumShell } from "@/components/practicum/PracticumShell";
import { PracticumConfig } from "@/types/practicum";
import { AtwoodApparatus } from "@/components/practicum/instruments/AtwoodApparatus";
import { OhausBalance } from "@/components/practicum/instruments/OhausBalance";
import { Caliper } from "@/components/practicum/instruments/Caliper";
import { usePracticumSession } from "@/hooks/usePracticumSession";
import { calculateTrueAcceleration1, calculateTrueAcceleration2, calculateAtwoodRegression } from "@/physics/atwood";
import { ArrowRight } from "lucide-react";

const CONFIG: PracticumConfig = {
  id: "atwood-glbb",
  title: "Pesawat Atwood: GLBB",
  category: "Mekanika",
  recommendedDurationSec: 1800, // 30 mins
  introduction: "Modul ini berfokus pada Gerak Lurus Berubah Beraturan (GLBB). Anda akan menentukan percepatan sistem Pesawat Atwood menggunakan variasi massa tambahan (m3 saja, dan m3+m4).",
  objectives: [
    "Menentukan percepatan sistem pada gerak lurus berubah beraturan (GLBB).",
    "Membuktikan Hukum Newton II dengan membandingkan percepatan sistem dengan massa yang berbeda."
  ],
  instructions: [
    "FASE PERSIAPAN: Timbang massa m1, m2, m3, dan m4 menggunakan neraca Ohaus. Ukur jejari katrol (r) dengan Jangka Sorong.",
    "Beralih ke tab Tahap 2 (m3). Atur posisi B untuk menentukan jarak A-B.",
    "Klik 'LEPAS KLEM (P)'. Stopwatch akan otomatis mulai (start). Klik STOP pada stopwatch secara manual SAAT BEBAN MELEWATI CINCIN B.",
    "Catat waktu t_m3 di tabel pengamatan.",
    "Beralih ke tab Tahap 3 (m3+m4) DENGAN JARAK A-B YANG SAMA. Ulangi pengukuran dan catat sebagai t_m3_m4.",
    "Ulangi proses ini untuk 5 variasi jarak A-B yang berbeda."
  ],
  columns: [
    { key: "jarak_ab", label: "Jarak AB (s)", unit: "m" },
    { key: "t_m3", label: "Waktu t (m3)", unit: "s" },
    { key: "t_m3_m4", label: "Waktu t (m3+m4)", unit: "s" },
  ],
  questions: [
    {
      id: "atw-glbb-q1",
      type: "multiple-choice",
      prompt: "Berdasarkan data yang Anda peroleh, percepatan manakah yang seharusnya lebih besar secara teoretis?",
      options: [
        "Percepatan dengan beban m3 saja",
        "Percepatan dengan beban m3+m4",
        "Keduanya sama",
        "Tidak dapat ditentukan"
      ],
      correctIndex: 1,
      feedbackHint: "Penambahan massa m4 meningkatkan gaya penggerak (selisih berat) secara proporsional lebih besar daripada peningkatan inersia total sistem, sehingga percepatan (a) menjadi lebih besar."
    }
  ],
  simulationType: "measurement"
};

function GLBBOrchestrator() {
  const { state } = usePracticumSession(CONFIG.id);
  const [activeTab, setActiveTab] = useState<"PERSIAPAN" | "MODUL_2_1_M3" | "MODUL_2_1_M3_M4">("PERSIAPAN");
  const [selectedMass, setSelectedMass] = useState<"m1" | "m2" | "m3" | "m4">("m1");

  // Generate ground truths secara persisten per sesi menggunakan useState
  const [gLocal] = useState(() => 9.75 + Math.random() * 0.1);
  
  // Massa instrumen (dalam gram) - diperbesar untuk memperlambat jatuh
  const m1 = 250;
  const m2 = 250;
  const m3 = 5;
  const m4 = 5;
  const rKatrol = 6.0; // cm

  // Hitung percepatan teoretis sekali saat komponen mount
  const [a1_true] = useState(() => calculateTrueAcceleration1({ m1, m2, m3, m4, g: gLocal }));
  const [a2_true] = useState(() => calculateTrueAcceleration2({ m1, m2, m3, m4, g: gLocal }));
  
  if (state.currentStep === "REVIEW") {
    const data1 = state.recordedData.map(r => ({
      s: parseFloat(String(r.jarak_ab).replace(',', '.')),
      t: parseFloat(String(r.t_m3).replace(',', '.'))
    })).filter(r => !isNaN(r.s) && !isNaN(r.t));

    const data2 = state.recordedData.map(r => ({
      s: parseFloat(String(r.jarak_ab).replace(',', '.')),
      t: parseFloat(String(r.t_m3_m4).replace(',', '.'))
    })).filter(r => !isNaN(r.s) && !isNaN(r.t));

    const reg1 = calculateAtwoodRegression(data1);
    const reg2 = calculateAtwoodRegression(data2);

    return (
      <div className="w-full h-full p-8 flex flex-col items-center overflow-y-auto bg-[#0a0f1c]">
        <div className="w-full max-w-5xl space-y-8">
          <h2 className="text-2xl font-bold text-white mb-2">Analisis Data Regresi (GLBB)</h2>
          <p className="text-white/60 mb-8">
            Berikut adalah tabel perhitungan berdasarkan data yang Anda catat. Silakan hitung nilai percepatan (a), ketidakpastian (Δa), dan Tingkat Ketelitian (TK) untuk masing-masing beban. Ingat bahwa pada regresi ini, nilai a secara langsung sama dengan gradien (slope) garis regresi.
          </p>

          {/* TABEL REGRESI 1 */}
          <div className="bg-[#11182A] border border-white/10 rounded-xl overflow-hidden shadow-2xl p-6">
            <h3 className="font-bold text-blue-400 mb-4 text-lg">Tabel 2.2: Beban Tambahan m3</h3>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-white/5 border-b border-white/10 text-white/50">
                  <tr>
                    <th className="p-3 border-r border-white/10">No</th>
                    <th className="p-3 border-r border-white/10">x = ½t² (s²)</th>
                    <th className="p-3 border-r border-white/10">y = s (m)</th>
                    <th className="p-3 border-r border-white/10">x²</th>
                    <th className="p-3 border-r border-white/10">y²</th>
                    <th className="p-3">xy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/80 font-mono">
                  {reg1.points.map((p, idx) => (
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
                    <td className="p-3 border-r border-white/10">{reg1.sumX.toFixed(4)}</td>
                    <td className="p-3 border-r border-white/10">{reg1.sumY.toFixed(4)}</td>
                    <td className="p-3 border-r border-white/10">{reg1.sumX2.toFixed(4)}</td>
                    <td className="p-3 border-r border-white/10">{reg1.sumY2.toFixed(4)}</td>
                    <td className="p-3">{reg1.sumXY.toFixed(4)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div>
                  <label className="block text-xs font-bold text-white/50 mb-2">Percepatan (a1)</label>
                  <input type="number" step="0.001" placeholder={process.env.NODE_ENV === 'development' ? `Kunci: ${reg1.a.toFixed(3)} m/s²` : "Hasil Anda (contoh: 0.123)"} className="w-full bg-black/30 border border-white/20 rounded-lg p-3 text-white font-mono" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-white/50 mb-2">Ketidakpastian (Δa1)</label>
                  <input type="number" step="0.001" placeholder={process.env.NODE_ENV === 'development' ? `Kunci: ${reg1.deltaA.toFixed(3)} m/s²` : "Hasil Anda (contoh: 0.012)"} className="w-full bg-black/30 border border-white/20 rounded-lg p-3 text-white font-mono" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-white/50 mb-2">Tingkat Ketelitian (TK1)</label>
                  <input type="number" step="0.1" placeholder={process.env.NODE_ENV === 'development' ? `Kunci: ${(reg1.tk * 100).toFixed(1)} %` : "Hasil Anda (contoh: 98.5)"} className="w-full bg-black/30 border border-white/20 rounded-lg p-3 text-white font-mono" />
               </div>
            </div>
          </div>

          {/* TABEL REGRESI 2 */}
          <div className="bg-[#11182A] border border-white/10 rounded-xl overflow-hidden shadow-2xl p-6">
            <h3 className="font-bold text-blue-500 mb-4 text-lg">Tabel 2.3: Beban Tambahan m3 + m4</h3>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-white/5 border-b border-white/10 text-white/50">
                  <tr>
                    <th className="p-3 border-r border-white/10">No</th>
                    <th className="p-3 border-r border-white/10">x = ½t² (s²)</th>
                    <th className="p-3 border-r border-white/10">y = s (m)</th>
                    <th className="p-3 border-r border-white/10">x²</th>
                    <th className="p-3 border-r border-white/10">y²</th>
                    <th className="p-3">xy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/80 font-mono">
                  {reg2.points.map((p, idx) => (
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
                    <td className="p-3 border-r border-white/10">{reg2.sumX.toFixed(4)}</td>
                    <td className="p-3 border-r border-white/10">{reg2.sumY.toFixed(4)}</td>
                    <td className="p-3 border-r border-white/10">{reg2.sumX2.toFixed(4)}</td>
                    <td className="p-3 border-r border-white/10">{reg2.sumY2.toFixed(4)}</td>
                    <td className="p-3">{reg2.sumXY.toFixed(4)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div>
                  <label className="block text-xs font-bold text-white/50 mb-2">Percepatan (a2)</label>
                  <input type="number" step="0.001" placeholder={process.env.NODE_ENV === 'development' ? `Kunci: ${reg2.a.toFixed(3)} m/s²` : "Hasil Anda (contoh: 0.123)"} className="w-full bg-black/30 border border-white/20 rounded-lg p-3 text-white font-mono" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-white/50 mb-2">Ketidakpastian (Δa2)</label>
                  <input type="number" step="0.001" placeholder={process.env.NODE_ENV === 'development' ? `Kunci: ${reg2.deltaA.toFixed(3)} m/s²` : "Hasil Anda (contoh: 0.012)"} className="w-full bg-black/30 border border-white/20 rounded-lg p-3 text-white font-mono" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-white/50 mb-2">Tingkat Ketelitian (TK2)</label>
                  <input type="number" step="0.1" placeholder={process.env.NODE_ENV === 'development' ? `Kunci: ${(reg2.tk * 100).toFixed(1)} %` : "Hasil Anda (contoh: 98.5)"} className="w-full bg-black/30 border border-white/20 rounded-lg p-3 text-white font-mono" />
               </div>
            </div>
          </div>
          
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-xl flex items-center justify-between shadow-lg">
             <div>
                <h3 className="font-bold text-emerald-400 text-lg mb-2">Kesimpulan</h3>
                <p className="text-emerald-100/70 text-sm">Secara teoretis dan eksperimen, terbukti bahwa <strong>a2 &gt; a1</strong> karena tambahan massa m4 memberikan gaya penggerak yang lebih besar secara proporsional dibanding inersianya.</p>
             </div>
             <div className="text-right flex flex-col items-end">
                <span className="text-xs text-emerald-400/50 mb-1 font-bold">HASIL ANDA</span>
                <span className="font-mono font-bold text-xl text-white">a1 = {reg1.a.toFixed(3)} ± {reg1.deltaA.toFixed(3)}</span>
                <span className="font-mono font-bold text-xl text-white mt-1">a2 = {reg2.a.toFixed(3)} ± {reg2.deltaA.toFixed(3)}</span>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center">
      
      {/* TABS KENDALI FASE */}
      <div className="flex flex-wrap justify-center gap-2 mb-6 bg-slate-900/60 p-3 rounded-xl backdrop-blur-md border border-slate-700/50 w-full max-w-4xl shadow-xl z-20">
        <button 
          onClick={() => setActiveTab("PERSIAPAN")} 
          className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === "PERSIAPAN" ? 'bg-teal-500 text-white shadow-[0_0_15px_rgba(20,184,166,0.6)]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Tahap 1: Persiapan
        </button>
        <ArrowRight className="text-slate-600 self-center" size={16} />
        <button 
          onClick={() => setActiveTab("MODUL_2_1_M3")} 
          className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === "MODUL_2_1_M3" ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.6)]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Tahap 2: GLBB (m3)
        </button>
        <ArrowRight className="text-slate-600 self-center" size={16} />
        <button 
          onClick={() => setActiveTab("MODUL_2_1_M3_M4")} 
          className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === "MODUL_2_1_M3_M4" ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.6)]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Tahap 3: GLBB (m3+m4)
        </button>
      </div>

      {/* KONTEN SIMULASI UTAMA */}
      <div className="flex-1 w-full flex justify-center items-center pb-8 px-4 overflow-y-auto">
        <div className="w-full max-w-5xl h-full min-h-[700px] flex items-center justify-center">
          
          {activeTab === "PERSIAPAN" && (
            <div className="w-full flex flex-col gap-6 items-center bg-slate-900/40 p-6 md:p-8 rounded-2xl border border-white/5">
              
              <div className="w-full max-w-4xl bg-slate-800/80 p-6 rounded-xl border border-slate-700">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <h3 className="text-xl font-bold text-white">Penimbangan Beban</h3>
                  <div className="flex bg-slate-900/80 rounded-lg p-1 border border-white/10">
                    {(["m1", "m2", "m3", "m4"] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => setSelectedMass(m)}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                          selectedMass === m 
                            ? "bg-blue-500 text-white shadow-lg" 
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        Massa {m}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="bg-slate-900/50 p-6 rounded-xl border border-white/5 flex flex-col items-center">
                  <p className="text-sm font-bold text-slate-400 mb-6 uppercase tracking-wider">
                    Menimbang {selectedMass === "m1" || selectedMass === "m2" ? "Beban Utama" : "Beban Tambahan"} ({selectedMass})
                  </p>
                  <div className="w-full max-w-2xl scale-100 origin-top">
                    <OhausBalance 
                      valueGrams={
                        selectedMass === "m1" ? m1 :
                        selectedMass === "m2" ? m2 :
                        selectedMass === "m3" ? m3 : m4
                      } 
                    />
                  </div>
                </div>
              </div>

              <div className="w-full max-w-4xl bg-slate-800/80 p-6 rounded-xl border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-6">Pengukuran Jejari Katrol (r)</h3>
                <div className="w-full bg-slate-900/50 p-6 rounded-xl border border-white/5">
                  <Caliper objectWidthMm={rKatrol * 2 * 10} />
                </div>
              </div>

            </div>
          )}

          {activeTab === "MODUL_2_1_M3" && (
            <AtwoodApparatus 
              mode="GLBB" 
              additionalMassConfig="m3" 
              a_true={a1_true} 
            />
          )}

          {activeTab === "MODUL_2_1_M3_M4" && (
            <AtwoodApparatus 
              mode="GLBB" 
              additionalMassConfig="m3_m4" 
              a_true={a2_true} 
            />
          )}

        </div>
      </div>
    </div>
  );
}

export default function AtwoodGLBBPage() {
  const { state } = usePracticumSession(CONFIG.id);
  const isDataStep = state.currentStep === "SIMULATION";
  
  // Validasi: hanya hitung baris yang semua datanya sudah terisi angka valid
  const validRowCount = state.recordedData.filter(r => {
    const s = parseFloat(String(r.jarak_ab).replace(',', '.'));
    const t1 = parseFloat(String(r.t_m3).replace(',', '.'));
    const t2 = parseFloat(String(r.t_m3_m4).replace(',', '.'));
    return !isNaN(s) && !isNaN(t1) && !isNaN(t2);
  }).length;
  
  // Minimal 5 baris variasi jarak
  const hasEnoughData = validRowCount >= 5;
  const isNextDisabled = isDataStep && !hasEnoughData;

  return (
    <PracticumShell 
      config={CONFIG} 
      simulationComponent={<GLBBOrchestrator />}
      isNextDisabled={isNextDisabled}
    />
  );
}
