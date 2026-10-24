"use client";

import React, { useState, useRef, useMemo } from "react";
import { PracticumShell, PracticumShellContext } from "@/components/practicum/PracticumShell";
import { PracticumConfig, PracticumState } from "@/types/practicum";
import {
  AirTrackPulleyApparatus,
  AirTrackPulleyApparatusRef,
} from "@/components/practicum/instruments/AirTrackPulleyApparatus";
import { OhausBalance } from "@/components/practicum/instruments/OhausBalance";
import {
  computeAirTrackTrial,
  AirTrackTrialResult,
} from "@/physics/airTrackPulleySystem";
import {
  CheckCircle2,
  AlertCircle,
  Activity,
  Zap,
  Scale,
  ArrowRight,
  Flame,
  TrendingDown,
} from "lucide-react";

// Standard laboratory configuration from Physics Lab Manual 6
const BASE_CART_MASS = 0.15; // 150 g
const ADDED_MASS_CART = 0.0125; // 12.5 g
const DROP_HEIGHT_H0 = 0.8; // 80 cm
const GATE1_DEFAULT_X = 0.25; // 25 cm from start
const GATE2_DEFAULT_X = 0.65; // 65 cm from start
const FLAG_WIDTH = 0.03; // 3 cm
const REQUIRED_TRIALS = 5;

// Trial presets from Table 6.1
interface TrialPreset {
  no: number;
  label: string;
  cartMass: number;
  hasCartWeight: boolean;
  hangingMass: number; // kg
  hangingMassLabel: string;
}

const TRIAL_PRESETS: TrialPreset[] = [
  { no: 1, label: "Percobaan 1 (M=150g, m=5g)", cartMass: BASE_CART_MASS, hasCartWeight: false, hangingMass: 0.005, hangingMassLabel: "5 g" },
  { no: 2, label: "Percobaan 2 (M=150g, m=10g)", cartMass: BASE_CART_MASS, hasCartWeight: false, hangingMass: 0.010, hangingMassLabel: "10 g" },
  { no: 3, label: "Percobaan 3 (M=150g, m=15g)", cartMass: BASE_CART_MASS, hasCartWeight: false, hangingMass: 0.015, hangingMassLabel: "15 g" },
  { no: 4, label: "Percobaan 4 (M=150g, m=20g)", cartMass: BASE_CART_MASS, hasCartWeight: false, hangingMass: 0.020, hangingMassLabel: "20 g" },
  { no: 5, label: "Percobaan 5 (M+12.5g, m=15g)", cartMass: BASE_CART_MASS + ADDED_MASS_CART, hasCartWeight: true, hangingMass: 0.015, hangingMassLabel: "15 g" },
];

const CONFIG: PracticumConfig = {
  id: "hkem",
  title: "Hukum Kekekalan Energi Mekanik",
  category: "Mekanika",
  recommendedDurationSec: 1800, // 30 mins
  introduction:
    "Praktikum ini bertujuan untuk memahami transformasi energi potensial gravitasi menjadi energi kinetik pada sistem kereta rel udara dan beban gantung, serta membuktikan berlakunya Hukum Kekekalan Energi Mekanik (EM1 = EM2) pada sistem tertutup.",
  objectives: [
    "Memahami perubahan energi potensial benda terhadap energi kinetiknya selama bergerak.",
    "Membuktikan berlakunya Hukum Kekekalan Energi Mekanik pada sistem rel udara dan beban gantung.",
    "Menentukan kecepatan kereta di dua gerbang cahaya menggunakan pencatat waktu digital mode ACCELERATION.",
    "Menganalisis faktor-faktor penyebab terjadinya selisih energi mekanik (ΔEM) pada kondisi nyata laboratorium.",
  ],
  instructions: [
    "FASE PERSIAPAN: Lakukan penimbangan massa kereta dasar (M) dan beban tambahan (12.5 g) menggunakan neraca Ohaus.",
    "FASE EKSPERIMEN: Hubungkan benang dari pengait kereta melewati katrol di ujung rel, lalu gantungkan beban m.",
    "Atur Timer Counter ke fungsi ACCELERATION. Posisi Gerbang 1 berada pada 25 cm dan Gerbang 2 pada 65 cm.",
    "Lakukan 5 variasi percobaan sesuai Tabel 6.1 (m = 5g, 10g, 15g, 20g, dan M + 12.5g).",
    "Lepaskan kereta dari keadaan diam, catat waktu lintasan t1 dan t2 yang ditampilkan pada Timer Counter.",
    "Lengkapi data Tabel 6.1 dan hitung nilai kecepatan, EK, EP, dan EM pada Tabel 6.2.",
    "Jawab seluruh pertanyaan evaluasi dan buat kesimpulan akhir.",
  ],
  columns: [
    { key: "no", label: "No", unit: "" },
    { key: "M", label: "M", unit: "kg" },
    { key: "m", label: "m", unit: "kg" },
    { key: "h1", label: "h1", unit: "m" },
    { key: "t1", label: "t1", unit: "s" },
    { key: "h2", label: "h2", unit: "m" },
    { key: "t2", label: "t2", unit: "s" },
  ],
  hints: [
    "Ketinggian beban h diukur terhadap lantai: h = H0 − x. Ketika kereta berada di gerbang 1 (x1 = 0.25 m) dengan H0 = 0.80 m, ketinggian h1 = 0.55 m.",
    "Kecepatan kereta diukur dari waktu penghalang w = 0.03 m melewati gerbang: v = w / t. Karena kereta dipercepat, kecepatan di gerbang 2 selalu lebih besar daripada di gerbang 1 (v2 > v1).",
    "Energi kinetik total sistem mencakup kereta dan beban gantung: EK = ½(M + m)v². Energi potensial murni berasal dari beban gantung: EP = m·g·h. Energi mekanik EM = EK + EP.",
  ],
  questions: [
    {
      id: "hkem-q1",
      type: "multiple-choice",
      prompt:
        "Bagaimana perubahan energi potensial (EP) dan energi kinetik (EK) sistem saat kereta bergerak dari Gerbang 1 menuju Gerbang 2?",
      options: [
        "EP berkurang karena ketinggian beban gantung menurun, sedangkan EK bertambah karena kecepatan sistem meningkat.",
        "EP bertambah dan EK berkurang karena adanya gaya gesekan udara.",
        "Baik EP maupun EK sama-sama berkurang sepanjang lintasan.",
        "EP tetap konstan sedangkan EK terus bertambah.",
      ],
      correctIndex: 0,
      feedbackHint:
        "Perhatikan bahwa beban gantung semakin mendekati lantai (h2 < h1), sementara tarikan tali mempercepat kereta dan beban (v2 > v1).",
    },
    {
      id: "hkem-q2",
      type: "multiple-choice",
      prompt:
        "Berdasarkan data perhitungan Anda pada Tabel 6.2, apakah nilai energi mekanik total di titik 1 (EM1) mendekati nilai energi mekanik total di titik 2 (EM2)?",
      options: [
        "Ya, EM1 ≈ EM2 dengan selisih yang sangat kecil, membuktikan bahwa Hukum Kekekalan Energi Mekanik berlaku.",
        "Tidak, EM2 bernilai dua kali lipat lebih besar dari EM1.",
        "Tidak, EM2 selalu menjadi nol saat mencapai gerbang kedua.",
        "Hukum kekekalan energi mekanik sama sekali tidak berlaku pada sistem massa-katrol.",
      ],
      correctIndex: 0,
      feedbackHint:
        "Dalam sistem ideal tanpa gesekan, penurunan energi potensial diubah seluruhnya menjadi pertambahan energi kinetik (ΔEP = ΔEK) sehingga EM kekal.",
    },
    {
      id: "hkem-q3",
      type: "multiple-choice",
      prompt:
        "Di laboratorium nyata, sering kali ditemukan sedikit selisih (EM1 > EM2). Faktor apa saja yang paling tepat menjelaskan timbulnya selisih tersebut?",
      options: [
        "Gesekan residual rel udara, momen inersia putar katrol, dan pendekatan kecepatan rata-rata transit v = w/t.",
        "Kesalahan pembacaan massa bumi oleh neraca Ohaus.",
        "Kabel sensor inframerah menyerap energi kinetik kereta secara elektromagnetik.",
        "Beban gantung memuai saat meluncur ke arah lantai.",
      ],
      correctIndex: 0,
      feedbackHint:
        "Gesekan sisa rel udara, energi yang diserap untuk memutar katrol, serta pendekatan w/t sebagai kecepatan sesaat merupakan sumber ketidakpastian fisis utama.",
    },
    {
      id: "hkem-q4",
      type: "numeric",
      prompt:
        "Sebuah sistem memiliki massa kereta M = 0.150 kg dan beban gantung m = 0.015 kg (massa total = 0.165 kg). Jika kecepatan kereta di Gerbang 2 terukur v2 = 0.600 m/s, hitunglah energi kinetik total sistem EK2 (dalam satuan Joule)!",
      expectedValue: 0.0297,
      tolerance: 0.002,
      toleranceType: "absolute",
      unit: "J",
      feedbackHint: "Gunakan rumus energi kinetik sistem: EK = 0.5 * (M + m) * v2^2 = 0.5 * 0.165 * (0.600)^2.",
    },
    {
      id: "hkem-q5",
      type: "text",
      prompt:
        "Tuliskan kesimpulan ilmiah Anda: Apakah Hukum Kekekalan Energi Mekanik terbukti pada percobaan ini? Jelaskan hubungan antara penurunan energi potensial dan peningkatan energi kinetik berdasarkan data Anda!",
      keywords: ["kekal", "energi", "potensial", "kinetik", "terbukti", "sama", "mendekati"],
      minLength: 20,
      feedbackHint:
        "Nyatakan dengan tegas apakah hukum kekekalan energi mekanik terbukti dan jelaskan bahwa penurunan EP diubah menjadi pertambahan EK.",
    },
  ],
  simulationType: "EnergyConservation",
};

export default function HKEMPracticumPage() {
  const apparatusRef = useRef<AirTrackPulleyApparatusRef>(null);

  // Active step tab in simulation: "PERSIAPAN" vs "EKSPERIMEN"
  const [activeTab, setActiveTab] = useState<"PERSIAPAN" | "EKSPERIMEN">("PERSIAPAN");
  const [selectedOhausObject, setSelectedOhausObject] = useState<"kereta" | "bebanTambahan">("kereta");

  // Selected trial preset (1 to 5)
  const [activePresetIndex, setActivePresetIndex] = useState(0);

  // Stored detailed trials
  const [completedTrials, setCompletedTrials] = useState<Record<number, AirTrackTrialResult>>({});

  const currentPreset = TRIAL_PRESETS[activePresetIndex];
  const totalCollectedTrials = Object.keys(completedTrials).length;
  const hasCompletedAllTrials = totalCollectedTrials >= REQUIRED_TRIALS;

  // Handle recording a completed trial
  const handleRecordTrial = (ctx: PracticumShellContext) => {
    const trialNo = currentPreset.no;
    const params = {
      cartMass: currentPreset.cartMass,
      hangingMass: currentPreset.hangingMass,
    };
    const geometry = { dropHeight: DROP_HEIGHT_H0, railTravel: 1.1 };
    const gates = {
      gate1Position: GATE1_DEFAULT_X,
      gate2Position: GATE2_DEFAULT_X,
      flagWidth: FLAG_WIDTH,
    };

    const res = computeAirTrackTrial(params, geometry, gates);
    setCompletedTrials((prev) => ({ ...prev, [trialNo]: res }));

    // Sync to PracticumShell recordedData
    ctx.addDataRow({
      no: trialNo,
      M: currentPreset.cartMass.toFixed(4),
      m: currentPreset.hangingMass.toFixed(4),
      h1: res.h1.toFixed(3),
      t1: res.t1 !== null ? res.t1.toFixed(4) : "-",
      h2: res.h2.toFixed(3),
      t2: res.t2 !== null ? res.t2.toFixed(4) : "-",
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
        // ── 1. REVIEW STEP ──
        if (ctx.state.currentStep === "REVIEW") {
          return (
            <div className="w-full h-full p-6 lg:p-10 flex flex-col items-center overflow-y-auto bg-[#070b14] text-white">
              <div className="w-full max-w-5xl space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
                  <div>
                    <h2 className="text-2xl font-bold font-mono text-cyan-400 flex items-center gap-2">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      Laporan Akhir: Pembuktian Hukum Kekekalan Energi Mekanik
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                      Verifikasi kuantitatif data Tabel 6.1 dan Tabel 6.2 pada sistem Rel Udara dan Beban Gantung.
                    </p>
                  </div>
                  <div className="bg-emerald-950/80 border border-emerald-500/50 px-4 py-2 rounded-xl text-right">
                    <div className="text-[10px] text-emerald-400 uppercase font-mono font-bold">Status Data</div>
                    <div className="text-lg font-bold text-emerald-300 font-mono">5 / 5 Percobaan Lengkap</div>
                  </div>
                </div>

                {/* Comprehensive Energy Verification Table (Tabel 6.2) */}
                <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl">
                  <h3 className="text-lg font-bold font-mono text-cyan-300 mb-2 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    Tabel 6.2: Perhitungan Energi Kinetik, Potensial, dan Mekanik (Titik 1 vs Titik 2)
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Data diperoleh dari pengukuran waktu perlintasan bendera w = 3 cm di Gerbang 1 dan Gerbang 2.
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead>
                        <tr className="bg-slate-800 text-slate-300 border-b border-slate-700">
                          <th className="p-3">No</th>
                          <th className="p-3">v1 (m/s)</th>
                          <th className="p-3">EK1 (J)</th>
                          <th className="p-3">EP1 (J)</th>
                          <th className="p-3 text-purple-300 font-bold">EM1 (J)</th>
                          <th className="p-3">v2 (m/s)</th>
                          <th className="p-3">EK2 (J)</th>
                          <th className="p-3">EP2 (J)</th>
                          <th className="p-3 text-purple-300 font-bold">EM2 (J)</th>
                          <th className="p-3 text-emerald-300 font-bold">ΔEM (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {TRIAL_PRESETS.map((p) => {
                          const trial = completedTrials[p.no];
                          if (!trial) {
                            return (
                              <tr key={p.no} className="opacity-40">
                                <td className="p-3">{p.no}</td>
                                <td colSpan={9} className="p-3 italic text-slate-500">
                                  Belum tercatat
                                </td>
                              </tr>
                            );
                          }
                          return (
                            <tr key={p.no} className="hover:bg-slate-800/50">
                              <td className="p-3 font-bold text-cyan-400">{p.no}</td>
                              <td className="p-3 text-slate-300">{trial.v1.toFixed(3)}</td>
                              <td className="p-3 text-emerald-400">{trial.ek1.toFixed(4)}</td>
                              <td className="p-3 text-amber-400">{trial.ep1.toFixed(4)}</td>
                              <td className="p-3 font-bold text-purple-300">{trial.em1.toFixed(4)}</td>
                              <td className="p-3 text-slate-300">{trial.v2.toFixed(3)}</td>
                              <td className="p-3 text-emerald-400">{trial.ek2.toFixed(4)}</td>
                              <td className="p-3 text-amber-400">{trial.ep2.toFixed(4)}</td>
                              <td className="p-3 font-bold text-purple-300">{trial.em2.toFixed(4)}</td>
                              <td className="p-3 font-bold text-emerald-300">
                                {Math.abs(trial.differencePercent).toFixed(2)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Analysis Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono">
                      <Zap className="w-4 h-4" />
                      Kesimpulan Konservasi Energi
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Pada seluruh variasi massa kereta dan beban gantung (Percobaan 1 s/d 5), nilai energi mekanik total di Titik 1 (<span className="font-mono text-purple-300">EM1</span>) terbukti konsisten sama dengan nilai di Titik 2 (<span className="font-mono text-purple-300">EM2</span>) dengan selisih rata-rata di bawah <strong className="text-emerald-400">0.5%</strong>. Hal ini memverifikasi secara langsung berlakunya <strong>Hukum Kekekalan Energi Mekanik</strong>.
                    </p>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2 text-amber-400 font-bold font-mono">
                      <TrendingDown className="w-4 h-4" />
                      Analisis Transformasi Energi
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Seiring pergerakan kereta dari Gerbang 1 ke Gerbang 2, energi potensial beban gantung berkurang (<span className="font-mono text-amber-300">ΔEP &lt; 0</span>) karena beban mendekati lantai. Penurunan energi potensial ini sebanding dengan pertambahan energi kinetik sistem (<span className="font-mono text-emerald-300">ΔEK &gt; 0</span>), membuktikan konversi sempurna EP menjadi EK.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // ── 2. SETUP & SIMULATION STEPS ──
        const isVectorLocked = totalCollectedTrials === 0 && (ctx.hintsRevealedCount ?? 0) < 3;
        const vectorLockMessage =
          "Vektor kualitatif terkunci. Silakan catat minimal 1 data percobaan pada tabel atau buka Petunjuk Level 3 untuk membukanya.";

        return (
          <div className="w-full h-full flex flex-col overflow-y-auto p-4 lg:p-6 gap-6 bg-[#030712]">
            {/* Top Phase Control Ribbon */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 border border-cyan-500/20 p-2.5 rounded-2xl">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("PERSIAPAN")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all ${
                    activeTab === "PERSIAPAN"
                      ? "bg-teal-500 text-white shadow-[0_0_15px_rgba(20,184,166,0.6)]"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  <Scale className="w-4 h-4" />
                  Tahap 1: Penimbangan (Ohaus)
                </button>

                <ArrowRight className="w-4 h-4 text-slate-600" />

                <button
                  data-testid="tab-simulation"
                  type="button"
                  onClick={() => setActiveTab("EKSPERIMEN")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all ${
                    activeTab === "EKSPERIMEN"
                      ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.6)]"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  Tahap 2: Simulasi Rel &amp; Timer
                </button>
              </div>

              {/* Progress counter */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Progres Pengambilan Data:</span>
                <strong
                  className={`font-bold ${
                    hasCompletedAllTrials ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {totalCollectedTrials} / {REQUIRED_TRIALS} Percobaan
                </strong>
              </div>
            </div>

            {/* TAB 1: PERSIAPAN (Penimbangan Ohaus) */}
            {activeTab === "PERSIAPAN" && (
              <div className="w-full flex flex-col gap-6 items-center bg-slate-900/40 p-6 md:p-8 rounded-2xl border border-white/5">
                <div className="w-full max-w-4xl bg-slate-800/80 p-6 rounded-xl border border-slate-700">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Scale className="w-5 h-5 text-teal-400" />
                        Penimbangan Massa Kereta Menggunakan Neraca O&apos;haus
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Geser beban anting pada ketiga lengan neraca Ohaus sampai jarum penunjuk tepat berada di titik setimbang (garis 0).
                      </p>
                    </div>

                    <div className="flex bg-slate-900/80 rounded-lg p-1 border border-white/10 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedOhausObject("kereta")}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                          selectedOhausObject === "kereta"
                            ? "bg-teal-500 text-white shadow"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Kereta Dasar (M = 150 g)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedOhausObject("bebanTambahan")}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                          selectedOhausObject === "bebanTambahan"
                            ? "bg-teal-500 text-white shadow"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Beban Tambahan (12.5 g)
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-6 rounded-xl border border-white/5 flex flex-col items-center">
                    <p className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider font-mono">
                      Objek di Atas Piringan:{" "}
                      <strong className="text-teal-300">
                        {selectedOhausObject === "kereta"
                          ? "Kereta Rel Udara (Glider)"
                          : "Beban Logam Tambahan"}
                      </strong>
                    </p>
                    <div className="w-full max-w-2xl">
                      <OhausBalance
                        valueGrams={selectedOhausObject === "kereta" ? 150 : 12.5}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("EKSPERIMEN")}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                >
                  Lanjut ke Percobaan Rel Udara <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* TAB 2: EKSPERIMEN (Rel Udara & Timer) */}
            {activeTab === "EKSPERIMEN" && (
              <>
                {/* Preset Selector Ribbon */}
                <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 mr-1">Pilih Percobaan:</span>
                    {TRIAL_PRESETS.map((p, idx) => {
                      const isRecorded = completedTrials[p.no] !== undefined;
                      const isSelected = activePresetIndex === idx;
                      return (
                        <button
                          key={p.no}
                          type="button"
                          onClick={() => setActivePresetIndex(idx)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]"
                              : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                          }`}
                        >
                          <span>Percobaan {p.no}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              isRecorded
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {isRecorded ? "Selesai" : "Siap"}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-xs font-mono text-slate-400">
                    Konfigurasi:{" "}
                    <strong className="text-cyan-400">
                      M = {(currentPreset.cartMass * 1000).toFixed(1)} g
                    </strong>
                    ,{" "}
                    <strong className="text-amber-400">
                      m = {currentPreset.hangingMassLabel}
                    </strong>
                  </div>
                </div>

                {/* Apparatus */}
                <div className="w-full">
                  <AirTrackPulleyApparatus
                    ref={apparatusRef}
                    mode="practicum"
                    cartMass={BASE_CART_MASS}
                    cartHasAddedMass={currentPreset.hasCartWeight}
                    hangingMass={currentPreset.hangingMass}
                    dropHeight={DROP_HEIGHT_H0}
                    railTravel={1.1}
                    gate1Pos={GATE1_DEFAULT_X}
                    gate2Pos={GATE2_DEFAULT_X}
                    flagWidth={FLAG_WIDTH}
                    isVectorLocked={isVectorLocked}
                    vectorLockMessage={vectorLockMessage}
                  />
                </div>

                {/* Record Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-cyan-500/30 p-4 rounded-xl shadow-lg">
                  <div className="text-xs font-mono text-slate-300">
                    Percobaan aktif:{" "}
                    <strong className="text-cyan-400">{currentPreset.label}</strong>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRecordTrial(ctx)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {completedTrials[currentPreset.no]
                      ? `Perbarui Data Percobaan ${currentPreset.no}`
                      : `Catat Data Percobaan ${currentPreset.no}`}
                  </button>
                </div>

                {/* Table 6.1 (Data Eksperimen) */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-hidden shadow-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-bold font-mono text-cyan-300 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Tabel 6.1: Data Pengamatan Rel Udara (ACCELERATION)
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      Standar Modul 6 Fisika Dasar I
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                          <th className="p-2.5">No</th>
                          <th className="p-2.5">Massa Kereta M (kg)</th>
                          <th className="p-2.5">Beban Gantung m (kg)</th>
                          <th className="p-2.5">Ketinggian h1 (m)</th>
                          <th className="p-2.5">Waktu t1 (s)</th>
                          <th className="p-2.5">Ketinggian h2 (m)</th>
                          <th className="p-2.5">Waktu t2 (s)</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {TRIAL_PRESETS.map((p) => {
                          const t = completedTrials[p.no];
                          return (
                            <tr key={p.no} className="hover:bg-slate-900/60">
                              <td className="p-2.5 font-bold text-slate-300">Percobaan {p.no}</td>
                              <td className="p-2.5">{p.cartMass.toFixed(4)}</td>
                              <td className="p-2.5 text-amber-300">{p.hangingMass.toFixed(4)}</td>
                              <td className="p-2.5">{(DROP_HEIGHT_H0 - GATE1_DEFAULT_X).toFixed(3)}</td>
                              <td className="p-2.5 text-cyan-300">
                                {t ? `${t.t1?.toFixed(4)} s` : "--.----"}
                              </td>
                              <td className="p-2.5">{(DROP_HEIGHT_H0 - GATE2_DEFAULT_X).toFixed(3)}</td>
                              <td className="p-2.5 text-cyan-300">
                                {t ? `${t.t2?.toFixed(4)} s` : "--.----"}
                              </td>
                              <td className="p-2.5">
                                {t ? (
                                  <span className="text-emerald-400 font-bold">Tercatat</span>
                                ) : (
                                  <span className="text-slate-600">Menunggu</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {!hasCompletedAllTrials && (
                  <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-amber-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>
                        Anda telah mencatat {totalCollectedTrials}/5 percobaan. Selesaikan kelima variasi percobaan untuk melanjutkan ke tahap evaluasi pertanyaan.
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      }}
    />
  );
}
