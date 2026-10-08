"use client";

import React from "react";
import { PracticumLayout } from "@/components/layout/PracticumLayout";
import { ExperimentTimer } from "@/components/practicum/ExperimentTimer";
import { HintBox } from "@/components/practicum/HintBox";
import { TorsionalPendulum } from "@/components/practicum/instruments/TorsionalPendulum";
import { ExperimentTable } from "@/components/practicum/ExperimentTable";
import { QuestionPanel } from "@/components/practicum/QuestionPanel";
import { rodInertia, loadInertia, totalInertia, period, relativeError } from "@/physics/torsionalOscillation";
import { LiveGraphView } from "@/components/simulation/LiveGraphView";

export default function TorsionalOscillationPracticum() {
  const [step, setStep] = React.useState(0);
  const [hintLevel, setHintLevel] = React.useState(0);
  
  // Simulation constants given by module
  const I0 = 0.005; // Base inertia kg m^2
  const kappa = 0.5; // Torsion constant N m / rad
  const rodLengthCm = 60;
  const rodMassKg = 0.5;
  const load1MassKg = 0.2;
  const load2MassKg = 0.2;
  
  // UI State
  const [radiusCm, setRadiusCm] = React.useState(10);
  const [graphData, setGraphData] = React.useState<{ t: number; v: number }[]>([]);
  const [currentT, setCurrentT] = React.useState(0);
  const [isOscillating, setIsOscillating] = React.useState(false);
  
  const pendulumRef = React.useRef<any>(null);

  // Derived physics
  const I_rod = rodInertia(rodMassKg, rodLengthCm);
  const I_load = loadInertia(load1MassKg, load2MassKg, radiusCm);
  const I_tot = totalInertia(I0, I_rod, I_load);
  const currentTheoryPeriod = period(I_tot, kappa);

  const STEPS = [
    { title: "Tujuan Eksperimen", desc: "Memahami osilasi torsional" },
    { title: "Pengukuran Massa", desc: "Mencatat massa batang dan beban" },
    { title: "Variasi Posisi R (10cm)", desc: "Menghitung T untuk r=10cm" },
    { title: "Variasi Posisi R (15cm)", desc: "Menghitung T untuk r=15cm" },
    { title: "Variasi Posisi R (20cm)", desc: "Menghitung T untuk r=20cm" },
    { title: "Evaluasi & Analisis", desc: "Menjawab pertanyaan dan KSR" }
  ];

  const handleStateUpdate = (t: number, angleDeg: number) => {
    setCurrentT(t);
    setGraphData(prev => {
      // Keep only last 10 seconds of data for performance
      const newData = [...prev, { t, v: angleDeg }];
      if (newData.length > 300) return newData.slice(newData.length - 300);
      return newData;
    });
  };

  const handleTimeChange = (t: number, isRunning: boolean, isReset: boolean) => {
    setIsOscillating(isRunning);
    if (isReset) {
      setGraphData([]);
      setCurrentT(0);
    }
  };

  const getHintsForStep = (stepIdx: number) => {
    switch (stepIdx) {
      case 0: return ["Baca tujuan praktikum ini dengan saksama.", "Fokus utama adalah menentukan periode osilasi dari berbagai variasi momen inersia.", "Lanjut ke langkah berikutnya jika sudah siap."];
      case 1: return ["Catat massa batang (0.5 kg) dan massa beban (0.2 kg masing-masing).", "Perhatikan juga panjang batang total (60 cm).", "Gunakan data ini untuk analisis perhitungan I nanti."];
      case 2: return ["Atur beban pada jarak 10 cm dari poros.", "Simpangkan pendulum sekitar 90 derajat lalu lepas.", "Tunggu hingga 5 getaran penuh (sistem akan otomatis berhenti) dan catat waktu 5T."];
      case 3: return ["Ubah jarak beban menjadi 15 cm.", "Ulangi prosedur yang sama: simpangkan, lepas, catat 5T.", "Perhatikan apakah waktu tempuh menjadi lebih lambat atau cepat."];
      case 4: return ["Terakhir, ubah jarak beban menjadi 20 cm.", "Simpangkan, lepas, dan catat 5T untuk posisi ini.", "Nilai ini akan dimasukkan ke dalam tabel pengamatan."];
      case 5: return ["Lengkapi tabel perhitungan berdasar data 5T.", "Hitung KSR (Kesalahan Relatif) antara T ukur dengan T teori.", "Kerjakan pertanyaan akhir untuk menyelesaikan modul."];
      default: return ["Tidak ada petunjuk tambahan."];
    }
  };

  return (
    <PracticumLayout
      title="Osilasi Torsional"
      steps={STEPS}
      currentStep={step}
      onStepChange={(s) => { setStep(s); setHintLevel(0); }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        {/* LEFT PANEL: Instruments */}
        <div className="flex flex-col gap-6">
          <HintBox
            hints={getHintsForStep(step)}
            currentLevel={hintLevel}
            onNextLevel={() => setHintLevel(Math.min(2, hintLevel + 1))}
          />

          <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col items-center justify-center min-h-[400px]">
             {step >= 2 && step <= 4 && (
                <div className="w-full flex justify-between mb-4 px-8 items-center">
                  <div className="text-slate-400 font-medium">Jarak Beban (r): <span className="text-white">{radiusCm} cm</span></div>
                  <div className="flex gap-2">
                    <button onClick={() => setRadiusCm(10)} className={`px-4 py-2 rounded ${radiusCm === 10 ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300'}`}>10 cm</button>
                    <button onClick={() => setRadiusCm(15)} className={`px-4 py-2 rounded ${radiusCm === 15 ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300'}`}>15 cm</button>
                    <button onClick={() => setRadiusCm(20)} className={`px-4 py-2 rounded ${radiusCm === 20 ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300'}`}>20 cm</button>
                  </div>
                </div>
             )}
             {step >= 2 && step <= 4 ? (
               <div className="w-full flex-1">
                 <TorsionalPendulum
                    ref={pendulumRef}
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
             ) : (
               <div className="text-slate-500 italic text-center p-8 border-2 border-dashed border-slate-800 rounded-xl">
                 {step === 0 && "Tujuan Praktikum:\n1. Mengamati gerak osilasi pendulum torsi\n2. Memahami konsep momen inersia\n3. Menentukan konstanta torsi kawat"}
                 {step === 1 && "Spesifikasi Alat:\n- Massa Batang: 0.5 kg\n- Panjang Batang: 60 cm\n- Massa Beban 1: 0.2 kg\n- Massa Beban 2: 0.2 kg\n\nCatat nilai-nilai ini."}
                 {step === 5 && "Alat dinonaktifkan pada tahap Evaluasi. Silakan isi tabel analisis."}
               </div>
             )}
          </div>
          
          {step >= 2 && step <= 4 && (
             <div className="h-64">
               <LiveGraphView 
                 data={graphData} 
                 domainX={[Math.max(0, currentT - 10), Math.max(10, currentT)]} 
                 domainY={[-100, 100]} 
                 labelY="Sudut θ (°)" 
               />
             </div>
          )}
        </div>

        {/* RIGHT PANEL: Data & Questions */}
        <div className="flex flex-col gap-6 overflow-y-auto">
          {step === 5 ? (
            <QuestionPanel
              questions={[
                { id: "q1", type: "multiple-choice", text: "Apa pengaruh penambahan jarak r beban terhadap periode T?", options: ["T bertambah", "T berkurang", "T tetap", "T menjadi nol"], correctValue: "T bertambah", feedback: "Semakin jauh beban, I membesar sehingga periode T juga bertambah." },
                { id: "q2", type: "number", text: "Berapa Momen Inersia (I) total sistem saat r = 20cm? (I0 = 0.005, I_batang = 0.015, I_beban = ...)", correctValue: 0.036, tolerance: 0.005, feedback: "I_beban = 2 * 0.2 * (0.2)^2 = 0.016. Total = 0.005 + 0.015 + 0.016 = 0.036" }
              ]}
              onComplete={() => alert("Praktikum Selesai!")}
            />
          ) : (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col gap-4">
              <h2 className="text-xl font-bold text-white mb-2">Tabel Pengamatan</h2>
              <ExperimentTable
                headers={["Posisi r (cm)", "T_ukur (s)", "T_teori (s)", "KSR (%)"]}
                rows={[
                  { r: "10 cm", tu: "-", tt: period(totalInertia(I0, I_rod, loadInertia(0.2, 0.2, 10)), kappa).toFixed(2), ksr: "-" },
                  { r: "15 cm", tu: "-", tt: period(totalInertia(I0, I_rod, loadInertia(0.2, 0.2, 15)), kappa).toFixed(2), ksr: "-" },
                  { r: "20 cm", tu: "-", tt: period(totalInertia(I0, I_rod, loadInertia(0.2, 0.2, 20)), kappa).toFixed(2), ksr: "-" }
                ]}
              />
              <p className="text-slate-400 text-sm mt-4">
                Catat 5T yang didapat dari simulasi, bagi 5 untuk mendapat T_ukur. Hitung KSR menggunakan persentase deviasi dari T_teori.
              </p>
            </div>
          )}
        </div>
      </div>
    </PracticumLayout>
  );
}
