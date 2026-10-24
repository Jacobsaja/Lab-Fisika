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
  validateHkemCalculation,
} from "@/physics/airTrackPulleySystem";
import {
  CheckCircle2,
  AlertCircle,
  Activity,
  Zap,
  Scale,
  ArrowRight,
  TrendingDown,
  Eye,
  EyeOff,
  Calculator,
  Check,
  RotateCcw,
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
// [SIMULATION DESIGN NOTE]:
// The printed lab manual for Module 6 lists cart mass M and hanging mass m
// without specifying exact nominal values for hanging mass. The 5 g multiples
// (5g, 10g, 15g, 20g) used in this simulation provide a structured workflow
// for students, and are a simulation software design choice.
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
    "Lakukan 5 variasi percobaan sesuai Tabel 6.1 (variasi beban gantung pada simulasi ini: m = 5 g, 10 g, 15 g, 20 g, serta penambahan beban kereta M + 12.5 g).",
    "Lepaskan kereta dari keadaan diam, catat waktu lintasan t1 dan t2 yang ditampilkan pada Timer Counter.",
    "Lengkapi data Tabel 6.1 dan hitung mandiri nilai kecepatan, EK, EP, dan EM pada Tabel 6.2 (periksa kebenaran dengan tombol validasi).",
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

  // Student manual calculation inputs for Table 6.2
  const [studentCalc, setStudentCalc] = useState<
    Record<
      number,
      {
        v1: string;
        ek1: string;
        ep1: string;
        em1: string;
        v2: string;
        ek2: string;
        ep2: string;
        em2: string;
      }
    >
  >({
    1: { v1: "", ek1: "", ep1: "", em1: "", v2: "", ek2: "", ep2: "", em2: "" },
    2: { v1: "", ek1: "", ep1: "", em1: "", v2: "", ek2: "", ep2: "", em2: "" },
    3: { v1: "", ek1: "", ep1: "", em1: "", v2: "", ek2: "", ep2: "", em2: "" },
    4: { v1: "", ek1: "", ep1: "", em1: "", v2: "", ek2: "", ep2: "", em2: "" },
    5: { v1: "", ek1: "", ep1: "", em1: "", v2: "", ek2: "", ep2: "", em2: "" },
  });

  // Track which cells were populated via the assist button
  const [assistedCells, setAssistedCells] = useState<Record<string, boolean>>({});

  const [hasValidated, setHasValidated] = useState(false);
  const [showSystemReference, setShowSystemReference] = useState(false);

  const currentPreset = TRIAL_PRESETS[activePresetIndex];
  const totalCollectedTrials = Object.keys(completedTrials).length;
  const hasCompletedAllTrials = totalCollectedTrials >= REQUIRED_TRIALS;

  // Auto-fill student calculation table with system ground truths (learning / verification aid)
  const handleAutoFillAssistance = () => {
    const filledCalc: typeof studentCalc = { ...studentCalc };
    const filledAssisted: Record<string, boolean> = { ...assistedCells };

    TRIAL_PRESETS.forEach((p) => {
      const trial =
        completedTrials[p.no] ||
        computeAirTrackTrial(
          { cartMass: p.cartMass, hangingMass: p.hangingMass },
          { dropHeight: DROP_HEIGHT_H0, railTravel: 1.1 },
          { gate1Position: GATE1_DEFAULT_X, gate2Position: GATE2_DEFAULT_X, flagWidth: FLAG_WIDTH }
        );
      filledCalc[p.no] = {
        v1: trial.v1.toFixed(3),
        ek1: trial.ek1.toFixed(4),
        ep1: trial.ep1.toFixed(4),
        em1: trial.em1.toFixed(4),
        v2: trial.v2.toFixed(3),
        ek2: trial.ek2.toFixed(4),
        ep2: trial.ep2.toFixed(4),
        em2: trial.em2.toFixed(4),
      };
      const keys: (keyof (typeof studentCalc)[number])[] = ["v1", "ek1", "ep1", "em1", "v2", "ek2", "ep2", "em2"];
      keys.forEach((k) => {
        filledAssisted[`${p.no}_${k}`] = true;
      });
    });

    setStudentCalc(filledCalc);
    setAssistedCells(filledAssisted);
    setHasValidated(true);
  };

  // Calculate validation statistics
  const validationStats = useMemo(() => {
    let correctCount = 0;
    let assistedCount = 0;
    const totalFields = TRIAL_PRESETS.length * 8; // 40 fields

    TRIAL_PRESETS.forEach((p) => {
      const trial = completedTrials[p.no];
      if (!trial) return;
      const row = studentCalc[p.no];
      const keys: (keyof typeof row)[] = ["v1", "ek1", "ep1", "em1", "v2", "ek2", "ep2", "em2"];

      keys.forEach((k) => {
        const isAssisted = !!assistedCells[`${p.no}_${k}`];
        const isAccurate = validateHkemCalculation(row[k], trial[k]);
        if (isAccurate) {
          if (isAssisted) {
            assistedCount++;
          } else {
            correctCount++;
          }
        }
      });
    });

    return {
      correctCount,
      assistedCount,
      totalFields,
      percentCorrect: Math.round((correctCount / totalFields) * 100),
    };
  }, [studentCalc, completedTrials, assistedCells]);

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

                {/* Validation Feedback Banner */}
                {hasValidated && (
                  <div
                    className={`p-4 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
                      validationStats.correctCount === validationStats.totalFields
                        ? "bg-emerald-950/80 border-emerald-500 text-emerald-300"
                        : validationStats.assistedCount > 0
                        ? "bg-purple-950/80 border-purple-500 text-purple-300"
                        : "bg-amber-950/80 border-amber-500 text-amber-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {validationStats.correctCount === validationStats.totalFields ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-purple-400 shrink-0" />
                      )}
                      <div>
                        <div className="font-bold text-sm">
                          Hasil Validasi Perhitungan: {validationStats.correctCount} / {validationStats.totalFields} Benar
                          {validationStats.assistedCount > 0 && (
                            <span className="text-purple-300 font-normal ml-2">
                              ({validationStats.assistedCount} dibantu)
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          {validationStats.correctCount === validationStats.totalFields
                            ? "Luar biasa! Seluruh 40 nilai perhitungan kecepatan dan energi mekanik Anda akurat sesuai hukum fisika."
                            : validationStats.assistedCount > 0
                            ? `Terdapat ${validationStats.assistedCount} sel terisi melalui tombol bantuan (tanda ungu) yang dikeluarkan dari skor benar mandiri. Silakan coba hitung mandiri untuk menyelesaikannya.`
                            : "Periksa kembali sel berwarna merah. Pastikan rumus w/t, ½(M+m)v², m·g·h, dan EM = EK + EP dihitung dengan teliti (toleransi ±2%)."}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Interactive Student Calculation Table (Tabel 6.2) */}
                <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-bold font-mono text-cyan-300 flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-cyan-400" />
                        Tabel 6.2: Perhitungan Mandiri Siswa (v, EK, EP, EM)
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Hitung nilai kecepatan (v = w/t), EK = ½(M+m)v², EP = m·g·h, dan EM = EK + EP untuk setiap percobaan. Tabel sistem hanya digunakan untuk memeriksa jawaban.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setHasValidated(true)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-mono font-bold transition-all shadow-[0_0_12px_rgba(37,99,235,0.4)]"
                      >
                        <Check className="w-4 h-4" />
                        Periksa Perhitungan
                      </button>

                      <button
                        type="button"
                        onClick={handleAutoFillAssistance}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-mono transition-all border border-slate-700"
                        title="Isi dengan nilai kunci sistem untuk bantuan belajar"
                      >
                        <Calculator className="w-3.5 h-3.5 text-cyan-400" />
                        Bantu Lengkapi
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead>
                        <tr className="bg-slate-800 text-slate-300 border-b border-slate-700">
                          <th className="p-2.5">No</th>
                          <th className="p-2.5">v1 (m/s)</th>
                          <th className="p-2.5">EK1 (J)</th>
                          <th className="p-2.5">EP1 (J)</th>
                          <th className="p-2.5 text-purple-300 font-bold">EM1 (J)</th>
                          <th className="p-2.5">v2 (m/s)</th>
                          <th className="p-2.5">EK2 (J)</th>
                          <th className="p-2.5">EP2 (J)</th>
                          <th className="p-2.5 text-purple-300 font-bold">EM2 (J)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {TRIAL_PRESETS.map((p) => {
                          const trial = completedTrials[p.no];
                          const row = studentCalc[p.no];

                          const renderInput = (
                            fieldKey: keyof typeof row,
                            expectedNum: number | undefined,
                            precisionHint: string
                          ) => {
                            const cellId = `${p.no}_${fieldKey}`;
                            const val = row[fieldKey];
                            const isAssisted = !!assistedCells[cellId];
                            const accurate =
                              hasValidated && expectedNum !== undefined
                                ? validateHkemCalculation(val, expectedNum)
                                : false;
                            const hasError =
                              hasValidated && expectedNum !== undefined && !accurate;

                            let visualStyle = "bg-slate-950 border-slate-700 text-white focus:border-cyan-400";
                            if (hasValidated) {
                              if (accurate) {
                                if (isAssisted) {
                                  visualStyle = "bg-purple-950/40 border-purple-500 text-purple-300";
                                } else {
                                  visualStyle = "bg-emerald-950/40 border-emerald-500 text-emerald-300";
                                }
                              } else if (hasError) {
                                visualStyle = "bg-rose-950/40 border-rose-500 text-rose-300";
                              }
                            }

                            return (
                              <div className="relative inline-block" key={fieldKey}>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={val}
                                  onChange={(e) => {
                                    const newVal = e.target.value;
                                    setStudentCalc((prev) => ({
                                      ...prev,
                                      [p.no]: { ...prev[p.no], [fieldKey]: newVal },
                                    }));
                                    setAssistedCells((prev) => ({
                                      ...prev,
                                      [cellId]: false,
                                    }));
                                  }}
                                  placeholder={
                                    process.env.NODE_ENV === "development" && expectedNum !== undefined
                                      ? `K: ${expectedNum.toFixed(precisionHint === "v" ? 3 : 4)}`
                                      : "0.000"
                                  }
                                  className={`w-20 px-2 py-1.5 rounded-lg text-xs font-mono transition-all border outline-none ${visualStyle}`}
                                  title={isAssisted ? "Nilai terisi melalui bantuan sistem" : undefined}
                                />
                                {hasValidated && accurate && isAssisted && (
                                  <span
                                    className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-purple-500 ring-2 ring-slate-900"
                                    title="Dibantu"
                                  />
                                )}
                              </div>
                            );
                          };

                          return (
                            <tr key={p.no} className="hover:bg-slate-800/40">
                              <td className="p-2.5 font-bold text-cyan-400">P{p.no}</td>
                              <td className="p-2">{renderInput("v1", trial?.v1, "v")}</td>
                              <td className="p-2">{renderInput("ek1", trial?.ek1, "e")}</td>
                              <td className="p-2">{renderInput("ep1", trial?.ep1, "e")}</td>
                              <td className="p-2">{renderInput("em1", trial?.em1, "e")}</td>
                              <td className="p-2">{renderInput("v2", trial?.v2, "v")}</td>
                              <td className="p-2">{renderInput("ek2", trial?.ek2, "e")}</td>
                              <td className="p-2">{renderInput("ep2", trial?.ep2, "e")}</td>
                              <td className="p-2">{renderInput("em2", trial?.em2, "e")}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Collapsible System Reference Table */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-mono font-bold text-slate-300">
                        Tabel Referensi Sistem (Kunci Jawaban untuk Pemeriksaan)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSystemReference((prev) => !prev)}
                      className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs font-mono transition-all border border-slate-700"
                    >
                      {showSystemReference ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> Sembunyikan Kunci
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" /> Buka Kunci Referensi
                        </>
                      )}
                    </button>
                  </div>

                  {showSystemReference && (
                    <div className="mt-4 pt-4 border-t border-slate-800 overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono border-collapse">
                        <thead>
                          <tr className="bg-slate-800 text-slate-400 border-b border-slate-700">
                            <th className="p-2.5">No</th>
                            <th className="p-2.5">v1 (m/s)</th>
                            <th className="p-2.5">EK1 (J)</th>
                            <th className="p-2.5">EP1 (J)</th>
                            <th className="p-2.5 text-purple-300 font-bold">EM1 (J)</th>
                            <th className="p-2.5">v2 (m/s)</th>
                            <th className="p-2.5">EK2 (J)</th>
                            <th className="p-2.5">EP2 (J)</th>
                            <th className="p-2.5 text-purple-300 font-bold">EM2 (J)</th>
                            <th className="p-2.5 text-emerald-300 font-bold">ΔEM (%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {TRIAL_PRESETS.map((p) => {
                            const trial = completedTrials[p.no];
                            if (!trial) {
                              return (
                                <tr key={p.no} className="opacity-40">
                                  <td className="p-2.5">{p.no}</td>
                                  <td colSpan={9} className="p-2.5 italic text-slate-500">
                                    Belum tercatat
                                  </td>
                                </tr>
                              );
                            }
                            return (
                              <tr key={p.no} className="hover:bg-slate-800/50">
                                <td className="p-2.5 font-bold text-cyan-400">{p.no}</td>
                                <td className="p-2.5 text-slate-300">{trial.v1.toFixed(3)}</td>
                                <td className="p-2.5 text-emerald-400">{trial.ek1.toFixed(4)}</td>
                                <td className="p-2.5 text-amber-400">{trial.ep1.toFixed(4)}</td>
                                <td className="p-2.5 font-bold text-purple-300">{trial.em1.toFixed(4)}</td>
                                <td className="p-2.5 text-slate-300">{trial.v2.toFixed(3)}</td>
                                <td className="p-2.5 text-emerald-400">{trial.ek2.toFixed(4)}</td>
                                <td className="p-2.5 text-amber-400">{trial.ep2.toFixed(4)}</td>
                                <td className="p-2.5 font-bold text-purple-300">{trial.em2.toFixed(4)}</td>
                                <td className="p-2.5 font-bold text-emerald-300">
                                  {Math.abs(trial.differencePercent).toFixed(2)}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
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

            {/* TAB 1: SETUP (Ohaus balance) */}
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

            {/* TAB 2: EXPERIMENT (Air track & timer) */}
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

                {/* Table 6.1 (Experimental data) */}
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
                  <p className="text-[11px] text-slate-400 mt-2 font-mono italic">
                    * Catatan: Variasi massa beban gantung yang digunakan pada simulasi ini adalah 5 g, 10 g, 15 g, dan 20 g.
                  </p>
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
