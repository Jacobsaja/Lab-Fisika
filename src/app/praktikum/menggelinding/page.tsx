"use client";

import React, { useMemo, useState, useRef, useCallback } from "react";
import { PracticumShell } from "@/components/practicum/PracticumShell";
import { PracticumConfig } from "@/types/practicum";
import { RollingApparatus, RollingApparatusRef } from "@/components/practicum/instruments/RollingApparatus";
import { usePracticumSession } from "@/hooks/usePracticumSession";
import { CylinderShape, calculateRollingAcceleration } from "@/physics/rollingMotion";
import { BrushableLineGraph } from "@/components/simulation/BrushableLineGraph";
import { DataPoint } from "@/components/simulation/LineGraph";
import { Settings, Play, Square, Plus } from "lucide-react";

const CONFIG: PracticumConfig = {
  id: "menggelinding",
  title: "Gerak Menggelinding pada Bidang Miring",
  category: "Mekanika",
  recommendedDurationSec: 1800,
  introduction: "Dalam eksperimen ini, Anda akan menyelidiki percepatan linier benda tegak (silinder pejal dan berongga) yang menggelinding menuruni bidang miring. Anda akan merekam data sensor kecepatan (v-t), memilih region yang linier untuk mencari slope (percepatan), lalu membandingkan hasil grafik dengan teori.",
  objectives: [
    "Mengukur percepatan linier (a) benda menggelinding menggunakan grafik kecepatan-waktu.",
    "Membandingkan percepatan benda pejal dan berongga pada sudut kemiringan yang sama.",
    "Menghitung momen inersia eksperimental benda dari data percepatan linier."
  ],
  instructions: [
    "Pilih Bentuk Benda (Silinder Pejal atau Berongga). Atur massanya (m) ke 1 kg dan R = 0.05 m.",
    "Atur Sudut Kemiringan (θ) menjadi 14° atau 22°.",
    "Tekan PLAY untuk mulai merekam data sensor kecepatan. Biarkan sampai benda mencapai ujung landasan.",
    "Setelah selesai, sorot (drag) bagian grafik yang naik secara linier pada grafik v-t di bawah untuk mendapatkan nilai Regresi (Slope = a_graph).",
    "Klik 'Tambahkan Data' untuk memasukkan hasil ke tabel (a_theory tidak akan ditampilkan sebelum data terekam).",
    "Ulangi proses ini untuk melengkapi 4 baris tabel: Pejal (14°), Pejal (22°), Berongga (14°), dan Berongga (22°)."
  ],
  columns: [
    { key: "shape", label: "Bentuk", unit: "" },
    { key: "angle", label: "Sudut", unit: "°" },
    { key: "a_graph", label: "a Grafik", unit: "m/s²" },
    { key: "a_theory", label: "a Teori", unit: "m/s²" },
    { key: "error", label: "Error", unit: "%" },
    { key: "inertia", label: "I Eksperimen", unit: "kg·m²" },
  ],
  questions: [
    {
      id: "rm-q1",
      type: "numeric",
      prompt: "Jika didapatkan percepatan grafik a = 1.55 m/s² dan percepatan teori a = 1.58 m/s², hitunglah persentase errornya (positif) dalam %!",
      expectedValue: 1.898,
      tolerance: 0.1,
      toleranceType: "absolute",
      unit: "%",
      feedbackHint: "Gunakan rumus: |(a_teori - a_grafik) / a_teori| × 100%."
    },
    {
      id: "rm-q2",
      type: "multiple-choice",
      prompt: "Berdasarkan eksperimen, manakah yang mencapai dasar lebih cepat jika dilepaskan dari sudut yang sama?",
      options: ["Silinder Pejal", "Silinder Berongga", "Keduanya tiba bersamaan", "Tidak dapat ditentukan"],
      correctIndex: 0,
      feedbackHint: "Percepatan berbanding terbalik dengan faktor inersia k. Silinder pejal (k=0.5) memiliki resistansi lebih rendah dari silinder berongga (k > 0.5)."
    },
    {
      id: "rm-q3",
      type: "multiple-choice",
      prompt: "Apa yang terjadi pada percepatan linier jika sudut kemiringan (θ) diperbesar?",
      options: ["Percepatan menurun", "Percepatan tetap", "Percepatan meningkat", "Bergantung pada massa benda"],
      correctIndex: 2,
      feedbackHint: "Sesuai rumus a = (g·sinθ)/(1+k), jika θ membesar, nilai sinθ juga membesar, sehingga percepatannya ikut membesar."
    },
    {
      id: "rm-q4",
      type: "text",
      prompt: "Dari pengukuran percepatan linier (a_grafik), turunkan perhitungan momen inersia (I) pada silinder pejal! Jelaskan mengapa silinder berongga memiliki percepatan lebih lambat.",
      keywords: ["distribusi", "massa", "luar", "inersia"],
      feedbackHint: "Ingat bahwa I = mR²(g·sinθ/a - 1). Benda berongga memiliki massa yang lebih jauh dari sumbu rotasi, menyebabkan momen inersia lebih besar."
    }
  ],
  simulationType: "measurement"
};

export default function MenggelindingPracticumPage() {
  const { state, addDataRow } = usePracticumSession(CONFIG.id);
  const appRef = useRef<RollingApparatusRef>(null);

  const gLocal = 9.81;

  // Apparatus state
  const [shape, setShape] = useState<CylinderShape>("solid");
  const [thetaDeg, setThetaDeg] = useState(14);
  const [mass, setMass] = useState(1.0);
  const [r, setR] = useState(0.05);
  const [rInner, setRInner] = useState(0.04);
  const [isFalling, setIsFalling] = useState(false);
  
  // Data capture state
  const [graphData, setGraphData] = useState<DataPoint[]>([]);
  const [selectedSlope, setSelectedSlope] = useState<number | null>(null);

  const handleTimeChange = useCallback((t: number, running: boolean, reset: boolean) => {
    setIsFalling(running);
    if (reset) {
      setGraphData([]);
      setSelectedSlope(null);
    }
  }, []);

  const handleStateUpdate = useCallback((st: any) => {
    if (st.v !== undefined && st.s > 0) {
      setGraphData(prev => [...prev, { t: st.t !== undefined ? st.t : (prev.length * 0.05), val: st.v }]);
    }
  }, []);

  const handleAddData = () => {
    if (selectedSlope === null) return;
    
    const a_graph = selectedSlope;
    const a_theory = calculateRollingAcceleration(shape, thetaDeg, r, rInner, gLocal);
    const error = Math.abs((a_theory - a_graph) / a_theory) * 100;
    
    // I = m * R^2 * ((g * sin(theta) / a) - 1)
    const inertia = mass * Math.pow(r, 2) * ((gLocal * Math.sin((thetaDeg * Math.PI) / 180) / a_graph) - 1);
    
    addDataRow({
      shape: shape === "solid" ? "Pejal" : "Berongga",
      angle: thetaDeg,
      a_graph: Number(a_graph.toFixed(3)),
      a_theory: Number(a_theory.toFixed(3)),
      error: Number(error.toFixed(2)),
      inertia: Number(inertia.toFixed(5)),
    });
    
    appRef.current?.reset();
  };

  const isDataStep = state.currentStep === "SIMULATION";
  // The objective is to record 4 rows: Pejal 14, Pejal 22, Berongga 14, Berongga 22.
  const rowCount = state.recordedData.length;
  const hasEnoughData = rowCount >= 4;
  const isNextDisabled = isDataStep && !hasEnoughData;

  return (
    <PracticumShell 
      config={CONFIG} 
      isNextDisabled={isNextDisabled}
      simulationComponent={
        <div className="w-full h-full flex flex-col xl:flex-row p-6 gap-6 overflow-y-auto">
          {/* Controls & Graph */}
          <div className="flex-1 flex flex-col gap-6">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-400" /> Kontrol Benda
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-bold mb-1 block">Bentuk Benda</label>
                  <select 
                    value={shape} 
                    onChange={e => { setShape(e.target.value as CylinderShape); appRef.current?.reset(); }}
                    disabled={isFalling}
                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm"
                  >
                    <option value="solid">Silinder Pejal</option>
                    <option value="hollow">Silinder Berongga</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold mb-1 block">Sudut Kemiringan (θ)</label>
                  <select 
                    value={thetaDeg} 
                    onChange={e => { setThetaDeg(Number(e.target.value)); appRef.current?.reset(); }}
                    disabled={isFalling}
                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm"
                  >
                    <option value="14">14°</option>
                    <option value="22">22°</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button 
                  onClick={() => appRef.current?.start()} 
                  disabled={isFalling}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" /> PLAY SENSOR
                </button>
                <button 
                  onClick={() => appRef.current?.reset()} 
                  disabled={isFalling}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Square className="w-4 h-4" /> RESET
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg flex-1 min-h-[300px] flex flex-col">
              <h3 className="font-bold text-white mb-2 text-sm">Sensor Grafik v-t (Drag/Sorot area linear)</h3>
              <div className="flex-1 relative bg-black/30 rounded border border-slate-800 p-2 overflow-hidden">
                <BrushableLineGraph 
                  data={graphData}
                  width={400}
                  height={220}
                  xLabel="t (s)" yLabel="v (m/s)"
                  onSelectionChange={(pts, slope) => setSelectedSlope(slope)}
                />
              </div>
              
              <div className="mt-4 flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">Hasil Regresi (Slope = a_graph):</span>
                  <span className="font-mono text-xl text-emerald-400">
                    {selectedSlope !== null ? `${selectedSlope.toFixed(3)} m/s²` : "Tarik area grafik"}
                  </span>
                </div>
                
                <button
                  onClick={handleAddData}
                  disabled={selectedSlope === null || isFalling}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:bg-slate-700 text-white font-bold text-sm rounded-lg flex items-center gap-2 transition"
                >
                  <Plus className="w-4 h-4"/> Tambahkan Data
                </button>
              </div>
            </div>
          </div>

          {/* Apparatus */}
          <div className="flex-[2] bg-slate-950 rounded-xl border border-slate-800 shadow-xl overflow-hidden flex justify-center items-center">
            <RollingApparatus 
              ref={appRef}
              mode="practicum"
              shape={shape}
              thetaDeg={thetaDeg}
              mass={mass}
              r={r}
              rInner={rInner}
              gLocal={gLocal}
              onTimeChange={handleTimeChange}
              onStateUpdate={handleStateUpdate}
              className="w-full h-full min-h-[500px]"
            />
          </div>
        </div>
      }
    />
  );
}
