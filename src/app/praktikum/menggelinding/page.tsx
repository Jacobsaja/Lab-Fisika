"use client";

import React, { useState, useRef, useCallback } from "react";
import { PracticumShell, PracticumShellContext } from "@/components/practicum/PracticumShell";
import { PracticumConfig, PracticumState } from "@/types/practicum";
import { RollingApparatus, RollingApparatusRef } from "@/components/practicum/instruments/RollingApparatus";
import { CylinderShape } from "@/physics/rollingMotion";
import { PRACTICUM_G } from "@/physics/rollingMotionValidation";
import { BrushableLineGraph } from "@/components/simulation/BrushableLineGraph";
import { DataPoint } from "@/components/simulation/LineGraph";
import {
  RollingCalculationPanel,
  RollingReview,
  buildMeasuredRow,
  rowToTrial,
} from "@/components/practicum/RollingCalculationPanel";
import { Settings, Play, Square, Plus } from "lucide-react";

/** Fixed apparatus parameters for this practicum. */
const MASS_KG = 1.0;
const RADIUS_M = 0.05;
const INNER_RADIUS_M = 0.04;
/** Rows needed: Pejal 14°, Pejal 22°, Berongga 14°, Berongga 22°. */
const REQUIRED_ROWS = 4;

const CONFIG: PracticumConfig = {
  id: "menggelinding",
  title: "Gerak Menggelinding pada Bidang Miring",
  category: "Mekanika",
  recommendedDurationSec: 1800,
  introduction: "Dalam eksperimen ini, Anda akan menyelidiki percepatan linier benda tegak (silinder pejal dan berongga) yang menggelinding menuruni bidang miring. Anda akan merekam data sensor kecepatan (v-t), memilih region yang linier untuk mencari slope (percepatan), lalu menghitung sendiri nilai teori dan membandingkannya dengan hasil grafik.",
  objectives: [
    "Mengukur percepatan linier (a) benda menggelinding menggunakan grafik kecepatan-waktu.",
    "Membandingkan percepatan benda pejal dan berongga pada sudut kemiringan yang sama.",
    "Menghitung momen inersia eksperimental benda dari data percepatan linier."
  ],
  instructions: [
    "Pilih Bentuk Benda (Silinder Pejal atau Berongga). Massa m = 1 kg, R = 0,05 m, dan Ri = 0,04 m sudah ditetapkan.",
    "Atur Sudut Kemiringan (θ) menjadi 14° atau 22°.",
    "Tekan PLAY untuk mulai merekam data sensor kecepatan. Biarkan sampai benda mencapai ujung landasan.",
    "Setelah selesai, sorot (drag) bagian grafik yang naik secara linier pada grafik v-t untuk mendapatkan nilai Regresi (Slope = a_graph).",
    "Klik 'Tambahkan Data'. Sistem hanya mencatat bentuk, sudut, dan a_grafik.",
    "Pada panel 'Hitung Nilai Teori', hitung sendiri a_teori, Error (%), dan I eksperimen dari Data Diketahui (g = 9,8 m/s²), lalu klik 'Periksa Jawaban'. Gunakan petunjuk bila perlu.",
    "Ulangi untuk melengkapi 4 baris tabel: Pejal (14°), Pejal (22°), Berongga (14°), dan Berongga (22°)."
  ],
  columns: [
    { key: "shape", label: "Bentuk", unit: "" },
    { key: "angle", label: "Sudut", unit: "°" },
    { key: "a_graph", label: "a Grafik", unit: "m/s²" },
    { key: "a_theory", label: "a Teori (isian)", unit: "m/s²" },
    { key: "error", label: "Error (isian)", unit: "%" },
    { key: "inertia", label: "I Eksperimen (isian)", unit: "kg·m²" },
  ],
  questions: [
    {
      id: "rm-q1",
      type: "numeric",
      // Hypothetical numbers on purpose: they must not match any a_theory of this practicum.
      prompt: "Jika didapatkan percepatan grafik a = 2.10 m/s² dan percepatan teori a = 2.16 m/s², hitunglah persentase errornya (positif) dalam %!",
      expectedValue: 2.778,
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

function countMeasuredRows(state: PracticumState): number {
  return state.recordedData.filter((row) => rowToTrial(row) !== null).length;
}

function RollingPracticumSimulation({ state, setRecordedData, addDataRow }: PracticumShellContext) {
  const appRef = useRef<RollingApparatusRef>(null);

  // Apparatus state
  const [shape, setShape] = useState<CylinderShape>("solid");
  const [thetaDeg, setThetaDeg] = useState(14);
  const [isFalling, setIsFalling] = useState(false);

  // Data capture state
  const [graphData, setGraphData] = useState<DataPoint[]>([]);
  const [selectedSlope, setSelectedSlope] = useState<number | null>(null);

  const handleTimeChange = useCallback((_t: number, running: boolean, reset: boolean) => {
    setIsFalling(running);
    if (reset) {
      setGraphData([]);
      setSelectedSlope(null);
    }
  }, []);

  // Practicum samples carry their own fixed-grid t; the t = 0 initial push has no t and is ignored.
  const handleStateUpdate = useCallback((st: { t?: number; v: number }) => {
    if (st.t !== undefined && st.t > 0) {
      setGraphData((prev) => [...prev, { t: st.t as number, val: st.v }]);
    }
  }, []);

  const handleAddData = () => {
    if (selectedSlope === null || shape === "block") return;
    // Only measured values are recorded; a_theory, Error and I are entered by the student.
    addDataRow(buildMeasuredRow({
      shape,
      thetaDeg,
      aGraph: selectedSlope,
      mass: MASS_KG,
      r: RADIUS_M,
      rInner: INNER_RADIUS_M,
    }));
    appRef.current?.reset();
  };

  if (state.currentStep === "REVIEW") {
    return <RollingReview rows={state.recordedData} />;
  }

  return (
    <div className="w-full h-full flex flex-col p-6 gap-6 overflow-y-auto">
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Controls & Graph */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-400" /> Kontrol Benda
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="rolling-shape-select" className="text-xs text-slate-400 font-bold mb-1 block">Bentuk Benda</label>
                <select
                  id="rolling-shape-select"
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
                <label htmlFor="rolling-angle-select" className="text-xs text-slate-400 font-bold mb-1 block">Sudut Kemiringan (θ)</label>
                <select
                  id="rolling-angle-select"
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
                id="rolling-play-button"
                onClick={() => appRef.current?.start()}
                disabled={isFalling}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4" /> PLAY SENSOR
              </button>
              <button
                id="rolling-reset-button"
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
                onSelectionChange={(_pts, slope) => setSelectedSlope(slope)}
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
                id="rolling-add-data-button"
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
            mass={MASS_KG}
            r={RADIUS_M}
            rInner={INNER_RADIUS_M}
            gLocal={PRACTICUM_G}
            onTimeChange={handleTimeChange}
            onStateUpdate={handleStateUpdate}
            className="w-full h-full min-h-[500px]"
          />
        </div>
      </div>

      {state.currentStep === "SIMULATION" && (
        <RollingCalculationPanel rows={state.recordedData} onRowsChange={setRecordedData} />
      )}
    </div>
  );
}

export default function MenggelindingPracticumPage() {
  return (
    <PracticumShell
      config={CONFIG}
      // Only the 4 measurements are required. Wrong or empty calculations never block progress.
      isNextDisabled={(state) => state.currentStep === "SIMULATION" && countMeasuredRows(state) < REQUIRED_ROWS}
      simulationComponent={(ctx) => <RollingPracticumSimulation key={ctx.resetCount} {...ctx} />}
    />
  );
}
