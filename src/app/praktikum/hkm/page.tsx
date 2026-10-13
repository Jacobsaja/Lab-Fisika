"use client";

import React, { useState, useMemo, useRef } from "react";
import { PracticumShell, PracticumShellContext } from "@/components/practicum/PracticumShell";
import { PracticumConfig, PracticumState } from "@/types/practicum";
import { AirTrackApparatus, AirTrackApparatusRef } from "@/components/practicum/instruments/AirTrackApparatus";
import {
  getModulCaseTheory,
  simulateModulTrial,
} from "@/physics/momentum/momentum";
import { ModulCase, ModulTrialData } from "@/physics/momentum/types";
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  TrendingDown,
  Activity,
} from "lucide-react";

// Standard equipment specifications from laboratory manual
const BASE_MASS = 0.150; // m = 150 gram (base glider)
const ADDED_MASS = 0.050; // M = 50 gram (slotted weight attached to Cart A in cases B & D)
const FLAG_WIDTH = 0.030; // 3 cm double-finger photogate flag
const TRIALS_PER_CASE = 3;

const CONFIG: PracticumConfig = {
  id: "hkm",
  title: "Hukum Kekekalan Momentum",
  category: "Mekanika",
  recommendedDurationSec: 1800, // 30 mins
  introduction:
    "Praktikum ini bertujuan untuk membuktikan berlakunya Hukum Kekekalan Momentum pada sistem dua benda dan menganalisis perbedaan antara tumbukan lenting sempurna serta tumbukan tidak lenting sama sekali menggunakan Rel Udara (Air Track) dan Pencatat Waktu Digital.",
  objectives: [
    "Membuktikan bahwa momentum total sistem dua benda sebelum dan sesudah tumbukan adalah kekal.",
    "Membedakan karakteristik fisis tumbukan lenting sempurna (e = 1) dan tumbukan tidak lenting sama sekali (e = 0).",
    "Menentukan kecepatan dan momentum dari waktu perlintasan gerbang cahaya (P11, P21, P22).",
    "Menganalisis kehilangan energi kinetik pada tumbukan tidak lenting sama sekali.",
  ],
  instructions: [
    "Bagian 4.1 Tumbukan Lenting Sempurna: Pasang pegas tumbuk baja pada Kereta A.",
    "- Kasus A: Beban sama (mA = mB = 150g). Lakukan 3 kali percobaan. Catat waktu P11 (tA) dan P21 (tB'). Kereta A berhenti, P22 tidak ada.",
    "- Kasus B: Pasang beban tambahan M=50g pada Kereta A (mA = 200g, mB = 150g). Lakukan 3 kali percobaan. Catat P11, P21, dan P22.",
    "Bagian 4.2 Tumbukan Tidak Lenting Sama Sekali: Ganti bumper dengan velcro/perekat.",
    "- Kasus C: Beban sama (mA = mB = 150g). Lakukan 3 kali percobaan. Kedua kereta menyatu.",
    "- Kasus D: Pasang beban tambahan M=50g pada Kereta A (mA = 200g, mB = 150g). Lakukan 3 kali percobaan.",
    "Setelah melengkapi 12 data percobaan (4 kasus × 3 trial), lanjutkan ke pertanyaan evaluasi.",
  ],
  columns: [
    { key: "case_id", label: "Kasus", unit: "" },
    { key: "trial_num", label: "Percobaan", unit: "" },
    { key: "p11", label: "P11 (t_A)", unit: "s" },
    { key: "p21", label: "P21 (t_B')", unit: "s" },
    { key: "p22", label: "P22 (t_A')", unit: "s" },
    { key: "p_init", label: "p Awal", unit: "kg·m/s" },
    { key: "p_final", label: "p Akhir", unit: "kg·m/s" },
    { key: "ksr", label: "KSR", unit: "%" },
  ],
  hints: [
    "Pada Kasus A (lenting sempurna, massa sama), seluruh momentum Kereta A ditransfer ke Kereta B. Kereta A berhenti di antara gerbang, sehingga register P22 kosong (--.----).",
    "Pada Kasus B (mA = m + M, lenting), Kereta A lebih berat dari Kereta B, sehingga Kereta A tetap bergerak maju setelah menabrak dan memicu register P22.",
    "Pada Kasus C dan D (tidak lenting, e = 0), kedua kereta saling menempel dan bergerak bersama dengan kecepatan akhir yang sama.",
  ],
  questions: [
    {
      id: "hkm-q1",
      type: "multiple-choice",
      prompt:
        "Berdasarkan hasil eksperimen pada semua kasus (lenting sempurna maupun tidak lenting), apakah momentum linier total sistem sebelum tumbukan sama dengan momentum total sesudah tumbukan?",
      options: [
        "Ya, momentum total sistem selalu kekal (konstan) pada semua jenis tumbukan selama tidak ada gaya luar netto yang bekerja pada sistem.",
        "Tidak, momentum hanya kekal pada tumbukan lenting sempurna saja.",
        "Tidak, momentum selalu berkurang drastis pada tumbukan tidak lenting.",
        "Momentum selalu meningkat setelah tumbukan karena bertambahnya energi kinetik.",
      ],
      correctIndex: 0,
      feedbackHint:
        "Hukum Kekekalan Momentum berlaku universal untuk setiap jenis tumbukan selama sistem terisolasi dari gaya luar.",
    },
    {
      id: "hkm-q2",
      type: "multiple-choice",
      prompt:
        "Mengapa pada tumbukan tidak lenting sama sekali (Kasus C dan D), energi kinetik total sistem sesudah tumbukan selalu berkurang dibandingkan sebelum tumbukan?",
      options: [
        "Sebagian energi kinetik terdisipasi dan berubah menjadi bentuk energi lain (panas/kalor, bunyi, dan energi deformasi bahan perekat).",
        "Energi kinetik terserap oleh hembusan udara dari kompresor rel.",
        "Karena massa total kedua kereta berkurang drastis setelah bertumbukan.",
        "Karena kecepatan kedua kereta langsung menjadi nol sesaat setelah tumbukan.",
      ],
      correctIndex: 0,
      feedbackHint:
        "Hukum kekekalan energi menyatakan energi tidak hilang, melainkan berubah menjadi kalor, bunyi, dan deformasi saat kedua kereta menyatu.",
    },
    {
      id: "hkm-q3",
      type: "multiple-choice",
      prompt:
        "Bagaimana cara membedakan jenis tumbukan berdasarkan nilai koefisien restitusi (e) hasil eksperimen?",
      options: [
        "e ≈ 1 untuk lenting sempurna, 0 < e < 1 untuk lenting sebagian, dan e = 0 untuk tidak lenting sama sekali.",
        "e = 0 untuk lenting sempurna, dan e = 1 untuk tidak lenting.",
        "Nilai e selalu bernilai negatif pada tumbukan elastis.",
        "Nilai e selalu bernilai konstan 0.5 pada semua eksperimen.",
      ],
      correctIndex: 0,
      feedbackHint:
        "Koefisien restitusi mengukur kelentingan: e = -(vA' - vB') / (vA - vB). Nilai e = 1 berarti lenting sempurna, e = 0 berarti tidak lenting sama sekali.",
    },
    {
      id: "hkm-q4",
      type: "numeric",
      prompt:
        "Misalkan massa kereta dasar m = 0.150 kg dan beban tambahan M = 0.050 kg dipasang pada Kereta A (Kasus D: tidak lenting). Jika vA = 0.400 m/s, berapakah kecepatan akhir teoritis kedua kereta (v') dalam m/s?",
      expectedValue: 0.2286,
      tolerance: 0.015,
      toleranceType: "absolute",
      unit: "m/s",
      feedbackHint:
        "Gunakan rumus Kasus D dari modul: v' = ((m + M) * vA) / (2m + M) = (0.200 * 0.400) / 0.350.",
    },
    {
      id: "hkm-q5",
      type: "text",
      prompt:
        "Sebutkan dua faktor fisis di laboratorium yang dapat menjadi sumber galat (ketidakpastian) dalam percobaan rel udara ini sehingga momentum akhir sedikit berbeda dari momentum awal!",
      keywords: ["gesekan", "udara", "kemiringan", "datar", "level", "penghalang", "sensor", "gerbang"],
      minLength: 15,
      feedbackHint:
        "Pertimbangkan gesekan udara sisa pada rel, kerataan/kemiringan meja rel udara, atau presisi pengukuran lebar bendera cahaya.",
    },
  ],
  simulationType: "Momentum",
};

export default function HKMPage() {
  const apparatusRef = useRef<AirTrackApparatusRef>(null);

  // Tab case selector in SIMULATION step
  const [activeCase, setActiveCase] = useState<ModulCase>("A");

  // Keep track of session seed for reproducible trials
  const [sessionSeed] = useState(() => Math.floor(Math.random() * 10000) + 1);

  // Store trial records by case in local state for rich presentation
  const [caseTrials, setCaseTrials] = useState<Record<ModulCase, ModulTrialData[]>>({
    A: [],
    B: [],
    C: [],
    D: [],
  });

  // Theoretical models for all 4 cases
  const theories = useMemo(() => {
    return {
      A: getModulCaseTheory({ caseId: "A", baseMass: BASE_MASS, addedMass: ADDED_MASS, vA: 0.42, flagWidth: FLAG_WIDTH }),
      B: getModulCaseTheory({ caseId: "B", baseMass: BASE_MASS, addedMass: ADDED_MASS, vA: 0.42, flagWidth: FLAG_WIDTH }),
      C: getModulCaseTheory({ caseId: "C", baseMass: BASE_MASS, addedMass: ADDED_MASS, vA: 0.42, flagWidth: FLAG_WIDTH }),
      D: getModulCaseTheory({ caseId: "D", baseMass: BASE_MASS, addedMass: ADDED_MASS, vA: 0.42, flagWidth: FLAG_WIDTH }),
    };
  }, []);

  const totalCollectedTrials =
    caseTrials.A.length + caseTrials.B.length + caseTrials.C.length + caseTrials.D.length;
  const hasCompletedAllTrials = totalCollectedTrials >= 12;

  // Record a trial to active case
  const recordTrialToActiveCase = (
    ctx: PracticumShellContext,
    customData?: ModulTrialData
  ) => {
    const currentList = caseTrials[activeCase];
    if (currentList.length >= TRIALS_PER_CASE) return;

    const trialIndex = currentList.length + 1;
    const trialData =
      customData ||
      simulateModulTrial(
        {
          caseId: activeCase,
          baseMass: BASE_MASS,
          addedMass: ADDED_MASS,
          vA: 0.42,
          flagWidth: FLAG_WIDTH,
        },
        trialIndex,
        sessionSeed
      );

    const updated = [...currentList, trialData];
    setCaseTrials((prev) => ({ ...prev, [activeCase]: updated }));

    // Sync to PracticumShell recordedData
    ctx.addDataRow({
      case_id: `Kasus ${activeCase}`,
      trial_num: trialIndex,
      p11: trialData.p11,
      p21: trialData.p21,
      p22: trialData.p22 !== null ? trialData.p22 : "-",
      p_init: trialData.pTotalInitial,
      p_final: trialData.pTotalFinal,
      ksr: `${trialData.ksrP}%`,
    });
  };

  return (
    <PracticumShell
      config={CONFIG}
      isNextDisabled={(state: PracticumState) => {
        if (state.currentStep === "SIMULATION") {
          return !hasCompletedAllTrials;
        }
        return false;
      }}
      simulationComponent={(ctx: PracticumShellContext) => {
        if (ctx.state.currentStep === "REVIEW") {
          // Render Final Comprehensive Review Section
          return (
            <div className="w-full h-full p-6 lg:p-10 flex flex-col items-center overflow-y-auto bg-[#070b14] text-white">
              <div className="w-full max-w-5xl space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
                  <div>
                    <h2 className="text-2xl font-bold font-mono text-cyan-400 flex items-center gap-2">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      Laporan Akhir: Pembuktian Hukum Kekekalan Momentum
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                      Ringkasan data eksperimen Rel Udara (Tabel 7.1 s/d 7.9) dan analisis kekekalan momentum.
                    </p>
                  </div>
                  <div className="bg-emerald-950/80 border border-emerald-500/50 px-4 py-2 rounded-xl text-right">
                    <div className="text-[10px] text-emerald-400 uppercase font-mono font-bold">Status Verifikasi</div>
                    <div className="text-lg font-bold text-emerald-300 font-mono">12 / 12 Data Selesai</div>
                  </div>
                </div>

                {/* Theoretical Comparison Table (Tabel 7.9) */}
                <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl">
                  <h3 className="text-lg font-bold font-mono text-cyan-300 mb-2 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    Tabel 7.9: Perbandingan Kecepatan & Momentum Akhir (Teori vs Eksperimen)
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Membandingkan nilai teoritis modul dengan rata-rata hasil pengukuran photogate untuk keempat kasus A-D.
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead>
                        <tr className="bg-slate-800 text-slate-300 border-b border-slate-700">
                          <th className="p-3">Kasus</th>
                          <th className="p-3">Kondisi Tumbukan</th>
                          <th className="p-3">vA Teori (m/s)</th>
                          <th className="p-3">vA&apos; Teori (m/s)</th>
                          <th className="p-3">vB&apos; Teori (m/s)</th>
                          <th className="p-3">p Awal (kg·m/s)</th>
                          <th className="p-3">p Akhir (kg·m/s)</th>
                          <th className="p-3">Rata-rata e</th>
                          <th className="p-3">Rata-rata KSR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {(["A", "B", "C", "D"] as ModulCase[]).map((cid) => {
                          const th = theories[cid];
                          const trials = caseTrials[cid];
                          const avgPInit =
                            trials.length > 0
                              ? trials.reduce((acc, t) => acc + t.pTotalInitial, 0) / trials.length
                              : th.pTotalInitial;
                          const avgPFin =
                            trials.length > 0
                              ? trials.reduce((acc, t) => acc + t.pTotalFinal, 0) / trials.length
                              : th.pTotalFinal;
                          const avgE =
                            trials.length > 0
                              ? trials.reduce((acc, t) => acc + t.restitution, 0) / trials.length
                              : th.restitution;
                          const avgKSR =
                            trials.length > 0
                              ? trials.reduce((acc, t) => acc + t.ksrP, 0) / trials.length
                              : 0.8;

                          return (
                            <tr key={cid} className="hover:bg-slate-800/50">
                              <td className="p-3 font-bold text-cyan-400">Kasus {cid}</td>
                              <td className="p-3 text-slate-300">
                                {cid === "A" && "Lenting, mA = mB"}
                                {cid === "B" && "Lenting, mA = m + M"}
                                {cid === "C" && "Tidak Lenting, mA = mB"}
                                {cid === "D" && "Tidak Lenting, mA = m + M"}
                              </td>
                              <td className="p-3 text-slate-400">{th.vA.toFixed(3)}</td>
                              <td className="p-3 text-amber-300">{th.vAPrime.toFixed(3)}</td>
                              <td className="p-3 text-cyan-300">{th.vBPrime.toFixed(3)}</td>
                              <td className="p-3">{avgPInit.toFixed(4)}</td>
                              <td className="p-3 text-emerald-400">{avgPFin.toFixed(4)}</td>
                              <td className="p-3 font-bold">{avgE.toFixed(3)}</td>
                              <td className="p-3 text-emerald-300 font-bold">{avgKSR.toFixed(2)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Analysis Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Card 1: Linear Momentum Conservation */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono">
                      <Sparkles className="w-4 h-4" />
                      Kesimpulan Hukum Kekekalan Momentum
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Pada keempat variasi eksperimen (Kasus A, B, C, dan D), nilai momentum total sebelum tumbukan
                      (<span className="font-mono text-cyan-300">p_awal</span>) terbukti sama dengan momentum total setelah tumbukan
                      (<span className="font-mono text-emerald-300">p_akhir</span>) dengan galat rata-rata di bawah{" "}
                      <strong className="text-emerald-400">1.5%</strong>.
                      Hal ini memverifikasi bahwa momentum linier total sistem dua benda selalu kekal selama gaya gesekan udara dapat diminimalkan.
                    </p>
                  </div>

                  {/* Card 2: Kinetic Energy Dissipation */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2 text-purple-400 font-bold font-mono">
                      <TrendingDown className="w-4 h-4" />
                      Analisis Disipasi Energi Kinetik
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Pada tumbukan lenting sempurna (Kasus A & B, <span className="font-mono text-emerald-400">e ≈ 1</span>),
                      energi kinetik total sistem hampir tidak berkurang. Namun pada tumbukan tidak lenting sama sekali (Kasus C & D,{" "}
                      <span className="font-mono text-purple-400">e ≈ 0</span>), energi kinetik berkurang drastis (hingga ~50%)
                      karena terdisipasi menjadi energi deformasi perekat, kalor, dan getaran saat kedua kereta menyatu.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // Standard SIMULATION / SETUP Step
        const currentCaseTrials = caseTrials[activeCase];

        return (
          <div className="w-full h-full flex flex-col overflow-y-auto p-4 lg:p-6 gap-6 bg-[#030712]">
            {/* Top Case Tabs Ribbon */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 border border-cyan-500/20 p-2.5 rounded-2xl">
              <div className="flex flex-wrap items-center gap-1.5">
                {(["A", "B", "C", "D"] as ModulCase[]).map((cid) => {
                  const count = caseTrials[cid].length;
                  const isCurrent = activeCase === cid;
                  return (
                    <button
                      key={cid}
                      onClick={() => setActiveCase(cid)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
                        isCurrent
                          ? "bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                          : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                      }`}
                    >
                      <span>Kasus {cid}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          count === TRIALS_PER_CASE
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {count}/{TRIALS_PER_CASE}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Progress counter */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Total Progres:</span>
                <strong
                  className={`font-bold ${
                    hasCompletedAllTrials ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {totalCollectedTrials} / 12 Percobaan
                </strong>
              </div>
            </div>

            {/* Case Description Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3 text-xs">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-slate-200">
                  {activeCase === "A" && "Kasus A: Tumbukan Lenting Sempurna (Massa Sama: mA = mB = 150g, vB = 0)"}
                  {activeCase === "B" && "Kasus B: Tumbukan Lenting Sempurna (Massa Berbeda: mA = 200g, mB = 150g, vB = 0)"}
                  {activeCase === "C" && "Kasus C: Tumbukan Tidak Lenting (Massa Sama: mA = mB = 150g, vB = 0)"}
                  {activeCase === "D" && "Kasus D: Tumbukan Tidak Lenting (Massa Berbeda: mA = 200g, mB = 150g, vB = 0)"}
                </div>
                <p className="text-slate-400">
                  {activeCase === "A" &&
                    "Kereta A mentransfer seluruh kecepatannya ke Kereta B (vB' = vA, vA' = 0). Kereta A berhenti di antara gerbang, register P22 tidak muncul."}
                  {activeCase === "B" &&
                    "Beban tambahan M=50g terpasang di Kereta A. Setelah menabrak, Kereta A tetap meluncur maju (vA' > 0) dan memicu pulsa kedua P22 di Gerbang 2."}
                  {activeCase === "C" &&
                    "Bumper velcro terpasang. Kedua kereta menyatu dan meluncur bersama melewati Gerbang 2 dengan kecepatan v' = vA / 2."}
                  {activeCase === "D" &&
                    "Bumper velcro terpasang dengan beban M di Kereta A. Kedua kereta menyatu dengan kecepatan v' = ((m + M) vA) / (2m + M)."}
                </p>
              </div>
            </div>

            {/* Air Track Apparatus & Synchronized Timer */}
            <div className="w-full">
              <AirTrackApparatus
                ref={apparatusRef}
                mode="practicum"
                activeCase={activeCase}
                baseMass={BASE_MASS}
                addedMass={ADDED_MASS}
                isVectorLocked={currentCaseTrials.length === 0 && (ctx.hintsRevealedCount ?? 0) < 3}
                vectorLockMessage="Vektor kualitatif terkunci. Silakan catat minimal 1 data percobaan pada Kasus ini atau buka Petunjuk Level 3 untuk membukanya."
              />
            </div>

            {/* Record Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-cyan-500/30 p-4 rounded-xl shadow-lg">
              <div className="text-xs font-mono text-slate-300">
                Percobaan saat ini:{" "}
                <strong className="text-cyan-400">
                  Kasus {activeCase} (Trial {currentCaseTrials.length + 1} dari {TRIALS_PER_CASE})
                </strong>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => recordTrialToActiveCase(ctx)}
                  disabled={currentCaseTrials.length >= TRIALS_PER_CASE}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all ${
                    currentCaseTrials.length >= TRIALS_PER_CASE
                      ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {currentCaseTrials.length >= TRIALS_PER_CASE
                    ? "Kasus Ini Lengkap (3/3)"
                    : `Catat Data Trial ${currentCaseTrials.length + 1}`}
                </button>
              </div>
            </div>

            {/* Case Data Table */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-hidden shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold font-mono text-cyan-300">
                  Tabel Data: Kasus {activeCase}
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  Standar Modul 7 Fisika Dasar I
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                      <th className="p-2.5">Percobaan</th>
                      <th className="p-2.5">P11 (t_A)</th>
                      <th className="p-2.5">P21 (t_B&apos;)</th>
                      <th className="p-2.5">P22 (t_A&apos;)</th>
                      <th className="p-2.5">vA (m/s)</th>
                      <th className="p-2.5">vB&apos; (m/s)</th>
                      <th className="p-2.5">vA&apos; (m/s)</th>
                      <th className="p-2.5">p Awal (kg·m/s)</th>
                      <th className="p-2.5">p Akhir (kg·m/s)</th>
                      <th className="p-2.5">KSR (%)</th>
                      <th className="p-2.5">Nilai e</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {currentCaseTrials.map((tr) => (
                      <tr key={tr.trialIndex} className="hover:bg-slate-900/60">
                        <td className="p-2.5 font-bold text-slate-300">Trial {tr.trialIndex}</td>
                        <td className="p-2.5 text-cyan-300">{tr.p11.toFixed(4)} s</td>
                        <td className="p-2.5 text-cyan-300">{tr.p21.toFixed(4)} s</td>
                        <td className="p-2.5 text-amber-300">
                          {tr.p22 !== null ? `${tr.p22.toFixed(4)} s` : "-"}
                        </td>
                        <td className="p-2.5">{tr.vA.toFixed(3)}</td>
                        <td className="p-2.5 text-cyan-400">{tr.vBPrime.toFixed(3)}</td>
                        <td className="p-2.5 text-amber-400">
                          {tr.vAPrime > 0 ? tr.vAPrime.toFixed(3) : "0.000"}
                        </td>
                        <td className="p-2.5">{tr.pTotalInitial.toFixed(4)}</td>
                        <td className="p-2.5 text-emerald-400 font-bold">
                          {tr.pTotalFinal.toFixed(4)}
                        </td>
                        <td className="p-2.5 text-emerald-300">{tr.ksrP.toFixed(2)}%</td>
                        <td className="p-2.5 font-bold">{tr.restitution.toFixed(3)}</td>
                      </tr>
                    ))}

                    {/* Placeholder rows if fewer than 3 trials collected */}
                    {Array.from({ length: TRIALS_PER_CASE - currentCaseTrials.length }).map(
                      (_, i) => (
                        <tr key={`empty-${i}`} className="opacity-40 text-slate-600">
                          <td className="p-2.5">Trial {currentCaseTrials.length + 1 + i}</td>
                          <td className="p-2.5">--.----</td>
                          <td className="p-2.5">--.----</td>
                          <td className="p-2.5">--.----</td>
                          <td className="p-2.5">--.---</td>
                          <td className="p-2.5">--.---</td>
                          <td className="p-2.5">--.---</td>
                          <td className="p-2.5">--.----</td>
                          <td className="p-2.5">--.----</td>
                          <td className="p-2.5">--.--%</td>
                          <td className="p-2.5">-.---</td>
                        </tr>
                      )
                    )}

                    {/* Rata-Rata Row */}
                    {currentCaseTrials.length === TRIALS_PER_CASE && (
                      <tr className="bg-slate-900/90 font-bold border-t-2 border-cyan-500/40 text-cyan-300">
                        <td className="p-2.5">Rata-Rata</td>
                        <td className="p-2.5">
                          {(
                            currentCaseTrials.reduce((a, b) => a + b.p11, 0) / TRIALS_PER_CASE
                          ).toFixed(4)}{" "}
                          s
                        </td>
                        <td className="p-2.5">
                          {(
                            currentCaseTrials.reduce((a, b) => a + b.p21, 0) / TRIALS_PER_CASE
                          ).toFixed(4)}{" "}
                          s
                        </td>
                        <td className="p-2.5 text-amber-300">
                          {activeCase === "A"
                            ? "-"
                            : (
                                currentCaseTrials.reduce((a, b) => a + (b.p22 || 0), 0) /
                                TRIALS_PER_CASE
                              ).toFixed(4) + " s"}
                        </td>
                        <td className="p-2.5">
                          {(
                            currentCaseTrials.reduce((a, b) => a + b.vA, 0) / TRIALS_PER_CASE
                          ).toFixed(3)}
                        </td>
                        <td className="p-2.5 text-cyan-400">
                          {(
                            currentCaseTrials.reduce((a, b) => a + b.vBPrime, 0) /
                            TRIALS_PER_CASE
                          ).toFixed(3)}
                        </td>
                        <td className="p-2.5 text-amber-400">
                          {(
                            currentCaseTrials.reduce((a, b) => a + b.vAPrime, 0) /
                            TRIALS_PER_CASE
                          ).toFixed(3)}
                        </td>
                        <td className="p-2.5">
                          {(
                            currentCaseTrials.reduce((a, b) => a + b.pTotalInitial, 0) /
                            TRIALS_PER_CASE
                          ).toFixed(4)}
                        </td>
                        <td className="p-2.5 text-emerald-400">
                          {(
                            currentCaseTrials.reduce((a, b) => a + b.pTotalFinal, 0) /
                            TRIALS_PER_CASE
                          ).toFixed(4)}
                        </td>
                        <td className="p-2.5 text-emerald-300">
                          {(
                            currentCaseTrials.reduce((a, b) => a + b.ksrP, 0) / TRIALS_PER_CASE
                          ).toFixed(2)}
                          %
                        </td>
                        <td className="p-2.5">
                          {(
                            currentCaseTrials.reduce((a, b) => a + b.restitution, 0) /
                            TRIALS_PER_CASE
                          ).toFixed(3)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Instruction Footer Status */}
            {!hasCompletedAllTrials && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Anda telah mengumpulkan {totalCollectedTrials}/12 percobaan. Lengkapi 3 trial
                    pada setiap Kasus A, B, C, dan D untuk membuka tahap kuis pertanyaan.
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      }}
    />
  );
}
