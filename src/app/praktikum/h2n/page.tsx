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
  G_STANDARD,
  H2N_TABLE_5_1_PRESETS,
  H2N_TABLE_5_2_PRESETS,
  H2N_EXP1_GATE1_X,
  H2N_EXP1_GATE2_X,
  H2N_EXP2_GATE1_X,
  H2N_EXP2_GATE2_X,
  H2N_FLAG_WIDTH,
  H2N_DROP_HEIGHT_H0,
  H2N_RAIL_TRAVEL,
  computeH2NTrial,
  H2NTrialResult,
  analyzeH2NExperiment41,
  analyzeH2NExperiment42,
} from "@/physics/h2n";
import {
  StudentCalculationTable,
  StudentCalcColumn,
  StudentCalcRow,
} from "@/components/practicum/StudentCalculationTable";
import { LineGraph } from "@/components/simulation/LineGraph";
import { SCIENTIFIC_THEME } from "@/components/simulation/visual";
import {
  CheckCircle2,
  AlertCircle,
  Activity,
  Zap,
  Scale,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Gauge,
  Weight,
} from "lucide-react";

const REQUIRED_TRIALS_PER_EXP = 5;

const CALC_COLUMNS_EXP1: StudentCalcColumn[] = [
  { key: "v1", header: "v1 (m/s)", precision: 3 },
  { key: "v2", header: "v2 (m/s)", precision: 3 },
  { key: "a", header: "a (m/s²)", precision: 3, highlightHeaderClass: "text-cyan-300 font-bold" },
];

const CALC_COLUMNS_EXP2: StudentCalcColumn[] = [
  { key: "v1", header: "v1 (m/s)", precision: 3 },
  { key: "v2", header: "v2 (m/s)", precision: 3 },
  { key: "a", header: "a (m/s²)", precision: 3, highlightHeaderClass: "text-emerald-300 font-bold" },
];

const CONFIG: PracticumConfig = {
  id: "h2n",
  title: "Hukum II Newton",
  category: "Mekanika",
  recommendedDurationSec: 2400, // 40 mins
  introduction:
    "Praktikum ini bertujuan untuk membuktikan secara empiris Hukum II Newton (F = m·a) melalui dua percobaan terstruktur: (1) Mengetahui hubungan antara percepatan dan massa benda pada gaya tarik tetap, serta (2) Mengetahui hubungan antara percepatan dan gaya tarik pada massa total sistem tetap.",
  objectives: [
    "Memahami Hukum II Newton tentang dinamika gerak lurus.",
    "Mengetahui hubungan antara massa benda (M) dan percepatan benda (a) pada gaya tetap.",
    "Mengetahui hubungan antara gaya tarik (F) yang bekerja dan percepatan benda (a) pada massa total tetap.",
    "Menentukan percepatan eksperimen (a = (v2² − v1²)/(2·s12)) menggunakan gerbang cahaya pencatat waktu digital mode ACCELERATION.",
    "Menganalisis hubungan variabel melalui grafik regresi linier serta membandingkan gradien eksperimen dengan nilai teoretis.",
  ],
  instructions: [
    "FASE PERSIAPAN: Timbang massa kereta dasar (M) dan beban tambahan (12.5 g dan 5 g) menggunakan neraca Ohaus.",
    "PERCOBAAN A (Tabel 5.1): Variasikan massa kereta M = 150 g s/d 200 g dengan massa beban gantung tetap m = 15 g (F = 0.147 N). Gerbang cahaya diatur pada x1 = 25 cm dan x2 = 65 cm (s12 = 40 cm).",
    "Lepaskan kereta dari keadaan diam, catat t1 dan t2, lalu klik tombol 'Catat Data Percobaan A'.",
    "PERCOBAAN B (Tabel 5.2): Pindahkan beban 5 g dari atas kereta ke penggantung beban sehingga gaya tarik F bertambah (1F s/d 5F) sementara massa total sistem (M + m = 175 g) tetap konstan. Gerbang cahaya diatur pada x1 = 5 cm dan x2 = 45 cm (s12 = 40 cm).",
    "Klik tombol 'Catat Data Percobaan B' untuk kelima variasi gaya.",
    "FASE LAPORAN: Lengkapi perhitungan mandiri nilai v1, v2, dan a pada Tabel 5.1 dan Tabel 5.2, lalu analisis grafik regresi linier yang terbentuk.",
    "Jawab seluruh pertanyaan evaluasi dan buat kesimpulan ilmiah akhir.",
  ],
  columns: [
    { key: "exp", label: "Percobaan", unit: "" },
    { key: "no", label: "No", unit: "" },
    { key: "M", label: "M", unit: "g" },
    { key: "m", label: "m", unit: "g" },
    { key: "F", label: "F", unit: "N" },
    { key: "t1", label: "t1", unit: "s" },
    { key: "t2", label: "t2", unit: "s" },
  ],
  hints: [
    "Kecepatan kereta dihitung dari lebar penghalang w = 0.03 m dibagi waktu transit gerbang: v = w / t. Percepatan dihitung dengan rumus a = (v2² − v1²) / (2 · s12) dengan jarak antar gerbang s12 = 0.40 m.",
    "Pada Percobaan A (m tetap, gaya tetap), penambahan massa kereta M menyebabkan percepatan sistem berkurang (a berbanding terbalik dengan massa total).",
    "Pada Percobaan B (massa total sistem tetap M+m = 175 g), penambahan beban gantung meningkatkan gaya tarik F sehingga percepatan bertambah secara linier (a berbanding lurus dengan gaya tarik F). Gradien grafik a terhadap F sama dengan 1/(M+m).",
  ],
  questions: [
    {
      id: "h2n-q1",
      type: "multiple-choice",
      prompt:
        "Berdasarkan hasil Percobaan A (Tabel 5.1), bagaimanakah hubungan antara percepatan kereta (a) dan massa kereta (M) ketika gaya tarik (F) dijaga konstan?",
      options: [
        "Percepatan berbanding terbalik dengan massa sistem; semakin besar massa kereta, semakin kecil percepatannya.",
        "Percepatan berbanding lurus dengan massa kereta; semakin besar massa kereta, semakin besar percepatannya.",
        "Percepatan bernilai konstan dan tidak dipengaruhi oleh perubahan massa kereta.",
        "Percepatan bertambah secara kuadratik terhadap penambahan massa kereta.",
      ],
      correctIndex: 0,
      feedbackHint:
        "Sesuai Hukum II Newton a = F / M_total: jika gaya penggerak F tetap, maka peningkatan massa inersia akan memperkecil percepatan.",
    },
    {
      id: "h2n-q2",
      type: "multiple-choice",
      prompt:
        "Berdasarkan hasil Percobaan B (Tabel 5.2), bagaimanakah hubungan antara percepatan kereta (a) dan gaya tarik (F = m·g) ketika massa total sistem (M + m) dijaga konstan?",
      options: [
        "Percepatan berbanding lurus dengan gaya tarik; peningkatan gaya tarik menghasilkan peningkatan percepatan yang sebanding.",
        "Percepatan berbanding terbalik dengan gaya tarik yang bekerja pada sistem.",
        "Percepatan tidak bergantung pada gaya tarik melainkan hanya pada ketinggian jatuh beban.",
        "Percepatan menurun secara eksponensial seiring bertambahnya beban gantung.",
      ],
      correctIndex: 0,
      feedbackHint:
        "Hukum II Newton menyatakan a = F / M_total. Dengan M_total konstan, grafik a terhadap F berupa garis lurus melewati titik asal.",
    },
    {
      id: "h2n-q3",
      type: "multiple-choice",
      prompt:
        "Apakah makna fisis dari gradien garis regresi linier pada grafik percepatan terhadap gaya tarik (a vs F) pada Percobaan B?",
      options: [
        "Gradien merepresentasikan nilai kebalikan dari massa total sistem: gradien = 1 / (M + m).",
        "Gradien merepresentasikan kecepatan awal kereta saat dilepaskan.",
        "Gradien merepresentasikan besar gaya gesekan statis antara kereta dan rel udara.",
        "Gradien merepresentasikan momen inersia katrol di ujung rel.",
      ],
      correctIndex: 0,
      feedbackHint:
        "Persamaan garis regresi y = b·x bersesuaian dengan a = [1 / (M + m)] · F, sehingga gradien b = 1 / (M + m).",
    },
    {
      id: "h2n-q4",
      type: "numeric",
      prompt:
        "Pada Percobaan 1 Tabel 5.1 (M = 150 g, m = 15 g), percepatan teoretis adalah a_teori = (0.015 · 9.8) / (0.150 + 0.015) = 0.8909 m/s². Jika percepatan hitung dari gerbang cahaya diperoleh a_hitung = 0.8921 m/s², hitunglah persentase selisihnya (|a_hitung − a_teori| / a_teori × 100%)!",
      expectedValue: 0.13,
      tolerance: 0.05,
      toleranceType: "absolute",
      unit: "%",
      feedbackHint:
        "Hitung: |0.8921 - 0.8909| / 0.8909 * 100% = 0.0012 / 0.8909 * 100% ≈ 0.135%.",
    },
    {
      id: "h2n-q5",
      type: "multiple-choice",
      prompt:
        "Dalam percobaan di laboratorium nyata, faktor apa saja yang dapat menimbulkan sedikit perbedaan antara percepatan eksperimen dan teoretis?",
      options: [
        "Gesekan residual rel udara, momen inersia putar katrol, pendekatan kecepatan sesaat v = w/t, dan ketelitian digital counter.",
        "Medan magnet bumi yang memperlambat laju massa kereta aluminium secara ekstrem.",
        "Peniup rel udara menyerap massa kereta sehingga massa berkurang sepanjang lintasan.",
        "Massa beban gantung menyusut akibat gesekan dengan udara ruangan.",
      ],
      correctIndex: 0,
      feedbackHint:
        "Adanya gesekan tipis bantalan udara, inersia rotasi katrol riil, serta pengukuran kecepatan rata-rata pada bendera selebar w = 3 cm merupakan sumber utama ketidakpastian eksperimen.",
    },
    {
      id: "h2n-q6",
      type: "numeric",
      prompt:
        "Soal Penerapan: Sebuah kereta bermassa M = 0.200 kg di atas rel udara tanpa gesekan ditarik oleh beban gantung m = 0.020 kg melalui katrol ideal (g = 9.8 m/s²). Hitunglah percepatan teoretis sistem dalam satuan m/s²!",
      expectedValue: 0.891,
      tolerance: 0.02,
      toleranceType: "absolute",
      unit: "m/s²",
      feedbackHint:
        "Gunakan rumus a = (m * g) / (M + m) = (0.020 * 9.8) / (0.200 + 0.020) = 0.196 / 0.220 ≈ 0.891 m/s².",
    },
    {
      id: "h2n-q7",
      type: "text",
      prompt:
        "Tuliskan kesimpulan ilmiah Anda: Apakah Hukum II Newton (F = m·a) terbukti dari data percobaan Anda? Jelaskan kesesuaian hubungan percepatan terhadap massa (Percobaan A) dan terhadap gaya tarik (Percobaan B) berdasarkan grafik regresi yang Anda peroleh!",
      keywords: ["hukum ii newton", "terbukti", "sebanding", "berbanding terbalik", "gaya", "massa", "regresi"],
      minLength: 25,
      feedbackHint:
        "Nyatakan dengan tegas bahwa Hukum II Newton terbukti, jelaskan bahwa a berbanding terbalik dengan massa pada gaya konstan, dan a sebanding lurus dengan gaya pada massa konstan.",
    },
  ],
  simulationType: "NewtonSecondLaw",
};

export default function H2NPracticumPage() {
  const apparatusRef = useRef<AirTrackPulleyApparatusRef>(null);

  // Practicum sub-tabs
  const [activeTab, setActiveTab] = useState<"PERSIAPAN" | "EXP1" | "EXP2">("PERSIAPAN");
  const [selectedOhausObject, setSelectedOhausObject] = useState<
    "kereta" | "beban12" | "beban5"
  >("kereta");

  // Active presets for both experiments
  const [activePresetExp1, setActivePresetExp1] = useState(0);
  const [activePresetExp2, setActivePresetExp2] = useState(0);

  // Completed trials storage
  const [completedTrialsExp1, setCompletedTrialsExp1] = useState<
    Record<number, H2NTrialResult>
  >({});
  const [completedTrialsExp2, setCompletedTrialsExp2] = useState<
    Record<number, H2NTrialResult>
  >({});

  // Student calculation inputs for Table 5.1 (Exp 1: v1, v2, a)
  const [studentCalcExp1, setStudentCalcExp1] = useState<
    Record<number, { v1: string; v2: string; a: string }>
  >({
    1: { v1: "", v2: "", a: "" },
    2: { v1: "", v2: "", a: "" },
    3: { v1: "", v2: "", a: "" },
    4: { v1: "", v2: "", a: "" },
    5: { v1: "", v2: "", a: "" },
  });

  // Student calculation inputs for Table 5.2 (Exp 2: v1, v2, a)
  const [studentCalcExp2, setStudentCalcExp2] = useState<
    Record<number, { v1: string; v2: string; a: string }>
  >({
    1: { v1: "", v2: "", a: "" },
    2: { v1: "", v2: "", a: "" },
    3: { v1: "", v2: "", a: "" },
    4: { v1: "", v2: "", a: "" },
    5: { v1: "", v2: "", a: "" },
  });

  // Assisted cells tracking
  const [assistedCellsExp1, setAssistedCellsExp1] = useState<Record<string, boolean>>({});
  const [assistedCellsExp2, setAssistedCellsExp2] = useState<Record<string, boolean>>({});

  const [hasValidatedExp1, setHasValidatedExp1] = useState(false);
  const [hasValidatedExp2, setHasValidatedExp2] = useState(false);

  const totalCollectedTrials =
    Object.keys(completedTrialsExp1).length + Object.keys(completedTrialsExp2).length;
  const hasCompletedAllTrials = totalCollectedTrials >= 10;

  // Auto-fill assistance for Experiment 4.1
  const handleAutoFillExp1 = () => {
    const filled: typeof studentCalcExp1 = { ...studentCalcExp1 };
    const assisted: Record<string, boolean> = { ...assistedCellsExp1 };

    H2N_TABLE_5_1_PRESETS.forEach((p) => {
      const trial =
        completedTrialsExp1[p.no] ||
        computeH2NTrial(
          p.cartMass,
          p.hangingMass,
          H2N_EXP1_GATE1_X,
          H2N_EXP1_GATE2_X,
          H2N_FLAG_WIDTH,
          0,
          0,
          p.no
        );
      filled[p.no] = {
        v1: trial.v1.toFixed(3),
        v2: trial.v2.toFixed(3),
        a: trial.aCalc.toFixed(3),
      };
      assisted[`${p.no}_v1`] = true;
      assisted[`${p.no}_v2`] = true;
      assisted[`${p.no}_a`] = true;
    });

    setStudentCalcExp1(filled);
    setAssistedCellsExp1(assisted);
    setHasValidatedExp1(true);
  };

  // Auto-fill assistance for Experiment 4.2
  const handleAutoFillExp2 = () => {
    const filled: typeof studentCalcExp2 = { ...studentCalcExp2 };
    const assisted: Record<string, boolean> = { ...assistedCellsExp2 };

    H2N_TABLE_5_2_PRESETS.forEach((p) => {
      const trial =
        completedTrialsExp2[p.no] ||
        computeH2NTrial(
          p.cartMass,
          p.hangingMass,
          H2N_EXP2_GATE1_X,
          H2N_EXP2_GATE2_X,
          H2N_FLAG_WIDTH,
          0,
          0,
          p.no
        );
      filled[p.no] = {
        v1: trial.v1.toFixed(3),
        v2: trial.v2.toFixed(3),
        a: trial.aCalc.toFixed(3),
      };
      assisted[`${p.no}_v1`] = true;
      assisted[`${p.no}_v2`] = true;
      assisted[`${p.no}_a`] = true;
    });

    setStudentCalcExp2(filled);
    setAssistedCellsExp2(assisted);
    setHasValidatedExp2(true);
  };

  // Student calculation rows for Table 5.1
  const calcRowsExp1: StudentCalcRow[] = useMemo(() => {
    return H2N_TABLE_5_1_PRESETS.map((p) => {
      const trial = completedTrialsExp1[p.no];
      return {
        rowId: p.no,
        label: `${p.no} (${(p.cartMass * 1000).toFixed(1)}g)`,
        values: studentCalcExp1[p.no] ?? { v1: "", v2: "", a: "" },
        expected: trial
          ? {
              v1: trial.v1,
              v2: trial.v2,
              a: trial.aCalc,
            }
          : undefined,
      };
    });
  }, [completedTrialsExp1, studentCalcExp1]);

  // Student calculation rows for Table 5.2
  const calcRowsExp2: StudentCalcRow[] = useMemo(() => {
    return H2N_TABLE_5_2_PRESETS.map((p) => {
      const trial = completedTrialsExp2[p.no];
      return {
        rowId: p.no,
        label: `${p.no} (${(p.hangingMass * 1000).toFixed(0)}g / ${p.pullingForce.toFixed(3)}N)`,
        values: studentCalcExp2[p.no] ?? { v1: "", v2: "", a: "" },
        expected: trial
          ? {
              v1: trial.v1,
              v2: trial.v2,
              a: trial.aCalc,
            }
          : undefined,
      };
    });
  }, [completedTrialsExp2, studentCalcExp2]);

  // Reference Table Data for Experiment 4.1
  const refTableExp1 = useMemo(() => {
    return {
      title: "Kunci Jawaban Teoretis Percobaan A (Tabel 5.1)",
      description: "Data referensi kinematika gerbang cahaya pada variasi massa kereta M (gaya F = 0.147 N).",
      headers: ["No", "M (g)", "m (g)", "t1 (s)", "t2 (s)", "v1 (m/s)", "v2 (m/s)", "a_hitung (m/s²)", "a_teori (m/s²)", "Selisih (%)"],
      rows: H2N_TABLE_5_1_PRESETS.map((p) => {
        const trial = completedTrialsExp1[p.no];
        if (!trial) return [`P${p.no}`, `${(p.cartMass * 1000).toFixed(1)}`, "15.0", "-", "-", "-", "-", "-", p.aTheory.toFixed(4), "-"];
        return [
          `P${p.no}`,
          (trial.cartMass * 1000).toFixed(1),
          (trial.hangingMass * 1000).toFixed(1),
          trial.t1 !== null ? trial.t1.toFixed(4) : "-",
          trial.t2 !== null ? trial.t2.toFixed(4) : "-",
          trial.v1.toFixed(3),
          trial.v2.toFixed(3),
          trial.aCalc.toFixed(3),
          trial.aTheory.toFixed(4),
          `${trial.diffPercent.toFixed(2)}%`,
        ];
      }),
    };
  }, [completedTrialsExp1]);

  // Reference Table Data for Experiment 4.2
  const refTableExp2 = useMemo(() => {
    return {
      title: "Kunci Jawaban Teoretis Percobaan B (Tabel 5.2)",
      description: "Data referensi kinematika gerbang cahaya pada variasi gaya tarik F (massa total sistem M+m = 175 g).",
      headers: ["No", "m (g)", "F (N)", "t1 (s)", "t2 (s)", "v1 (m/s)", "v2 (m/s)", "a_hitung (m/s²)", "a_teori (m/s²)", "Selisih (%)"],
      rows: H2N_TABLE_5_2_PRESETS.map((p) => {
        const trial = completedTrialsExp2[p.no];
        if (!trial) return [`P${p.no}`, `${(p.hangingMass * 1000).toFixed(0)}`, p.pullingForce.toFixed(3), "-", "-", "-", "-", "-", p.aTheory.toFixed(4), "-"];
        return [
          `P${p.no}`,
          (trial.hangingMass * 1000).toFixed(0),
          trial.pullingForce.toFixed(3),
          trial.t1 !== null ? trial.t1.toFixed(4) : "-",
          trial.t2 !== null ? trial.t2.toFixed(4) : "-",
          trial.v1.toFixed(3),
          trial.v2.toFixed(3),
          trial.aCalc.toFixed(3),
          trial.aTheory.toFixed(4),
          `${trial.diffPercent.toFixed(2)}%`,
        ];
      }),
    };
  }, [completedTrialsExp2]);

  // Linear Regression Analysis for Experiment 4.1: a vs 1/(M+m)
  const regressionExp1 = useMemo(() => {
    const trials = H2N_TABLE_5_1_PRESETS.map((p) => {
      const trial = completedTrialsExp1[p.no];
      const aVal = trial ? trial.aCalc : p.aTheory;
      return {
        cartMass: p.cartMass,
        hangingMass: p.hangingMass,
        a: aVal,
      };
    });
    return analyzeH2NExperiment41(trials);
  }, [completedTrialsExp1]);

  // Linear Regression Analysis for Experiment 4.2: a vs F
  const regressionExp2 = useMemo(() => {
    const trials = H2N_TABLE_5_2_PRESETS.map((p) => {
      const trial = completedTrialsExp2[p.no];
      const aVal = trial ? trial.aCalc : p.aTheory;
      return {
        pullingForce: p.pullingForce,
        a: aVal,
      };
    });
    return analyzeH2NExperiment42(trials);
  }, [completedTrialsExp2]);

  // Regression points for Chart 1: a vs 1/(M+m)
  const chartPointsExp1 = useMemo(() => {
    return H2N_TABLE_5_1_PRESETS.map((p) => {
      const trial = completedTrialsExp1[p.no];
      const aVal = trial ? trial.aCalc : p.aTheory;
      return {
        t: 1 / (p.cartMass + p.hangingMass),
        val: aVal,
      };
    });
  }, [completedTrialsExp1]);

  // Regression points for Chart 2: a vs F
  const chartPointsExp2 = useMemo(() => {
    return H2N_TABLE_5_2_PRESETS.map((p) => {
      const trial = completedTrialsExp2[p.no];
      const aVal = trial ? trial.aCalc : p.aTheory;
      return {
        t: p.pullingForce,
        val: aVal,
      };
    });
  }, [completedTrialsExp2]);

  // Handle Recording Trial in Experiment 4.1
  const handleRecordExp1 = (ctx: PracticumShellContext) => {
    const p = H2N_TABLE_5_1_PRESETS[activePresetExp1];
    const res = computeH2NTrial(
      p.cartMass,
      p.hangingMass,
      H2N_EXP1_GATE1_X,
      H2N_EXP1_GATE2_X,
      H2N_FLAG_WIDTH,
      0,
      0,
      p.no
    );
    setCompletedTrialsExp1((prev) => ({ ...prev, [p.no]: res }));

    ctx.addDataRow({
      exp: "A (Tabel 5.1)",
      no: p.no,
      M: (p.cartMass * 1000).toFixed(1),
      m: (p.hangingMass * 1000).toFixed(1),
      F: p.pullingForce.toFixed(3),
      t1: res.t1 !== null ? res.t1.toFixed(4) : "-",
      t2: res.t2 !== null ? res.t2.toFixed(4) : "-",
    });
  };

  // Handle Recording Trial in Experiment 4.2
  const handleRecordExp2 = (ctx: PracticumShellContext) => {
    const p = H2N_TABLE_5_2_PRESETS[activePresetExp2];
    const res = computeH2NTrial(
      p.cartMass,
      p.hangingMass,
      H2N_EXP2_GATE1_X,
      H2N_EXP2_GATE2_X,
      H2N_FLAG_WIDTH,
      0,
      0,
      p.no
    );
    setCompletedTrialsExp2((prev) => ({ ...prev, [p.no]: res }));

    ctx.addDataRow({
      exp: "B (Tabel 5.2)",
      no: p.no,
      M: (p.cartMass * 1000).toFixed(1),
      m: (p.hangingMass * 1000).toFixed(1),
      F: p.pullingForce.toFixed(3),
      t1: res.t1 !== null ? res.t1.toFixed(4) : "-",
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
      nextBlockedReason={(state) => {
        if (state.currentStep === "SIMULATION" && !hasCompletedAllTrials) {
          return `Selesaikan 10 percobaan praktikum (${totalCollectedTrials}/10)`;
        }
        return null;
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
                      Laporan Akhir: Pembuktian Hukum II Newton
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                      Verifikasi empiris hubungan massa, gaya, dan percepatan (F = m·a) melalui analisis data gerbang cahaya dan regresi linier.
                    </p>
                  </div>
                  <div className="bg-emerald-950/80 border border-emerald-500/50 px-4 py-2 rounded-xl text-right">
                    <div className="text-[10px] text-emerald-400 uppercase font-mono font-bold">Status Data</div>
                    <div className="text-lg font-bold text-emerald-300 font-mono">10 / 10 Percobaan Lengkap</div>
                  </div>
                </div>

                {/* TABEL 5.1: PERCOBAAN A (Massa Kereta Berubah, Gaya Tetap) */}
                <StudentCalculationTable
                  title="Tabel 5.1: Perhitungan Mandiri Percobaan A (v1, v2, a pada Gaya Tetap)"
                  description="Hitung nilai kecepatan di gerbang 1 (v1 = w/t1), gerbang 2 (v2 = w/t2), dan percepatan a = (v2² − v1²)/(2·s12) dengan jarak s12 = 0.40 m untuk setiap massa kereta."
                  columns={CALC_COLUMNS_EXP1}
                  rows={calcRowsExp1}
                  assistedCells={assistedCellsExp1}
                  hasValidated={hasValidatedExp1}
                  onCellChange={(rowId, colKey, val) => {
                    setStudentCalcExp1((prev) => ({
                      ...prev,
                      [rowId]: { ...prev[rowId as number], [colKey]: val },
                    }));
                    setAssistedCellsExp1((prev) => ({
                      ...prev,
                      [`${rowId}_${colKey}`]: false,
                    }));
                  }}
                  onValidate={() => setHasValidatedExp1(true)}
                  onAutoFillAssistance={handleAutoFillExp1}
                  referenceTable={refTableExp1}
                />

                {/* TABEL 5.2: PERCOBAAN B (Gaya Tarik Berubah, Massa Total Tetap) */}
                <StudentCalculationTable
                  title="Tabel 5.2: Perhitungan Mandiri Percobaan B (v1, v2, a pada Massa Total Tetap)"
                  description="Hitung nilai v1, v2, dan percepatan a = (v2² − v1²)/(2·s12) dengan jarak s12 = 0.40 m untuk setiap variasi gaya tarik F (1F s/d 5F) pada massa total konstan M+m = 175 g."
                  columns={CALC_COLUMNS_EXP2}
                  rows={calcRowsExp2}
                  assistedCells={assistedCellsExp2}
                  hasValidated={hasValidatedExp2}
                  onCellChange={(rowId, colKey, val) => {
                    setStudentCalcExp2((prev) => ({
                      ...prev,
                      [rowId]: { ...prev[rowId as number], [colKey]: val },
                    }));
                    setAssistedCellsExp2((prev) => ({
                      ...prev,
                      [`${rowId}_${colKey}`]: false,
                    }));
                  }}
                  onValidate={() => setHasValidatedExp2(true)}
                  onAutoFillAssistance={handleAutoFillExp2}
                  referenceTable={refTableExp2}
                />

                {/* GRAFIK & REGRESI LINIER */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
                  <div>
                    <h3 className="text-lg font-bold font-mono text-cyan-300 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-cyan-400" />
                      Analisis Grafik Regresi Linier Hukum II Newton
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Perbandingan empiris gradien garis regresi terhadap nilai teoretis Hukum II Newton.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Grafik 1: a vs 1/(M+m) */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                      <div className="text-xs font-mono font-bold text-cyan-300 flex items-center justify-between">
                        <span>Grafik 1: a terhadap 1/(M+m) (Percobaan A)</span>
                        <span className="text-[11px] text-slate-400">Teori: slope = F = 0.147 N</span>
                      </div>
                      <div className="w-full flex justify-center bg-black/40 rounded-xl p-2 border border-slate-800/80 overflow-hidden">
                        <LineGraph
                          data={chartPointsExp1}
                          width={380}
                          height={200}
                          xLabel="1 / (M+m) (kg⁻¹)"
                          yLabel="a (m/s²)"
                          color={SCIENTIFIC_THEME.accents.cyan}
                          drawPoints={true}
                          drawLine={true}
                          regressionLine={
                            regressionExp1
                              ? {
                                  slope: regressionExp1.slope,
                                  intercept: regressionExp1.intercept,
                                }
                              : undefined
                          }
                        />
                      </div>
                      {regressionExp1 && (
                        <div className="text-[11px] font-mono space-y-1 text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          <div>
                            Gradien Eksperimen (<strong className="text-cyan-300">b</strong>):{" "}
                            <strong>{regressionExp1.slope.toFixed(4)} N</strong> (Teori: 0.1470 N)
                          </div>
                          <div>
                            Selisih Gradien:{" "}
                            <strong className="text-emerald-400">
                              {regressionExp1.slopeDiffPercent.toFixed(2)}%
                            </strong>
                            , Korelasi r² ={" "}
                            <strong className="text-purple-300">{regressionExp1.rSquared.toFixed(4)}</strong>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Grafik 2: a vs F */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                      <div className="text-xs font-mono font-bold text-emerald-300 flex items-center justify-between">
                        <span>Grafik 2: a terhadap F (Percobaan B)</span>
                        <span className="text-[11px] text-slate-400">Teori: slope = 1/(M+m) = 5.714 kg⁻¹</span>
                      </div>
                      <div className="w-full flex justify-center bg-black/40 rounded-xl p-2 border border-slate-800/80 overflow-hidden">
                        <LineGraph
                          data={chartPointsExp2}
                          width={380}
                          height={200}
                          xLabel="F (N)"
                          yLabel="a (m/s²)"
                          color={SCIENTIFIC_THEME.accents.emerald}
                          drawPoints={true}
                          drawLine={true}
                          regressionLine={
                            regressionExp2
                              ? {
                                  slope: regressionExp2.slope,
                                  intercept: regressionExp2.intercept,
                                }
                              : undefined
                          }
                        />
                      </div>
                      {regressionExp2 && (
                        <div className="text-[11px] font-mono space-y-1 text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          <div>
                            Gradien Eksperimen (<strong className="text-emerald-300">b</strong>):{" "}
                            <strong>{regressionExp2.slope.toFixed(4)} kg⁻¹</strong> (Teori: 5.7143 kg⁻¹)
                          </div>
                          <div>
                            Selisih Gradien:{" "}
                            <strong className="text-emerald-400">
                              {regressionExp2.slopeDiffPercent.toFixed(2)}%
                            </strong>
                            , Korelasi r² ={" "}
                            <strong className="text-purple-300">{regressionExp2.rSquared.toFixed(4)}</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Scientific Conclusion Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono">
                      <Zap className="w-4 h-4" />
                      Kesimpulan Percobaan A (a vs M)
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-mono">
                      Pada gaya tarik konstan F = 0.147 N, percepatan terbukti berbanding terbalik dengan massa total sistem. Penambahan massa kereta M dari 150 g menjadi 200 g memperkecil percepatan dari 0.891 m/s² menjadi 0.684 m/s² dengan regresi linier a terhadap 1/(M+m) memiliki r² &gt; 0.9999.
                    </p>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono">
                      <TrendingUp className="w-4 h-4" />
                      Kesimpulan Percobaan B (a vs F)
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-mono">
                      Pada massa total sistem konstan M+m = 175 g, percepatan terbukti berbanding lurus dengan gaya tarik F. Peningkatan gaya dari 0.049 N (1F) ke 0.245 N (5F) melipatgandakan percepatan dari 0.280 m/s² ke 1.400 m/s² dengan gradien garis tepat sama dengan 1/(M+m) (selisih &lt; 0.2%).
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

        const currentExp1 = H2N_TABLE_5_1_PRESETS[activePresetExp1];
        const currentExp2 = H2N_TABLE_5_2_PRESETS[activePresetExp2];

        return (
          <div className="w-full h-full flex flex-col overflow-y-auto p-4 lg:p-6 gap-6 bg-[#030712]">
            {/* Top Phase Control Ribbon */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 border border-cyan-500/20 p-2.5 rounded-2xl">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("PERSIAPAN")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-mono text-xs font-bold transition-all ${
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
                  data-testid="tab-exp1"
                  type="button"
                  onClick={() => setActiveTab("EXP1")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-mono text-xs font-bold transition-all ${
                    activeTab === "EXP1"
                      ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.6)]"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  Tahap 2: Percobaan A (Tabel 5.1)
                </button>

                <ArrowRight className="w-4 h-4 text-slate-600" />

                <button
                  data-testid="tab-exp2"
                  type="button"
                  onClick={() => setActiveTab("EXP2")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-mono text-xs font-bold transition-all ${
                    activeTab === "EXP2"
                      ? "bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.6)]"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Tahap 3: Percobaan B (Tabel 5.2)
                </button>
              </div>

              {/* Progress counter */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Total Data Percobaan:</span>
                <strong
                  className={`font-bold ${
                    hasCompletedAllTrials ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {totalCollectedTrials} / 10 Percobaan
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
                        Penimbangan Massa Kereta &amp; Beban Tambahan
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Geser anting pada ketiga lengan neraca Ohaus sampai penunjuk tepat setimbang di garis nol.
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
                        Kereta (150 g)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedOhausObject("beban12")}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                          selectedOhausObject === "beban12"
                            ? "bg-teal-500 text-white shadow"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Beban 12.5 g
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedOhausObject("beban5")}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                          selectedOhausObject === "beban5"
                            ? "bg-teal-500 text-white shadow"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Beban 5 g
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-6 rounded-xl border border-white/5 flex flex-col items-center">
                    <p className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider font-mono">
                      Objek di Atas Piringan:{" "}
                      <strong className="text-teal-300">
                        {selectedOhausObject === "kereta"
                          ? "Kereta Rel Udara (Glider, M = 150 g)"
                          : selectedOhausObject === "beban12"
                          ? "Beban Tambahan Kereta (12.5 g)"
                          : "Beban Penggantung / Tambahan (5 g)"}
                      </strong>
                    </p>
                    <div className="w-full max-w-2xl">
                      <OhausBalance
                        valueGrams={
                          selectedOhausObject === "kereta"
                            ? 150
                            : selectedOhausObject === "beban12"
                            ? 12.5
                            : 5
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("EXP1")}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                  >
                    Mulai Percobaan A (Tabel 5.1) <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: PERCOBAAN A (Massa Berubah, Gaya Tetap) */}
            {activeTab === "EXP1" && (
              <>
                <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">Variasi Massa Kereta (M):</span>
                    <div className="flex gap-1.5">
                      {H2N_TABLE_5_1_PRESETS.map((p, idx) => {
                        const isRecorded = !!completedTrialsExp1[p.no];
                        const isCurrent = activePresetExp1 === idx;
                        return (
                          <button
                            key={p.no}
                            type="button"
                            onClick={() => {
                              setActivePresetExp1(idx);
                              apparatusRef.current?.reset();
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                              isCurrent
                                ? "bg-cyan-600 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                                : isRecorded
                                ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
                                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                            }`}
                          >
                            P{p.no} ({(p.cartMass * 1000).toFixed(1)}g)
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-slate-400">
                      Beban Gantung: <strong className="text-amber-400">m = 15 g (F = 0.147 N)</strong>
                    </span>
                    <span className="text-slate-400">
                      Gerbang: <strong className="text-cyan-300">25 cm &amp; 65 cm (s12 = 40 cm)</strong>
                    </span>
                  </div>
                </div>

                <div className="w-full">
                  <AirTrackPulleyApparatus
                    ref={apparatusRef}
                    mode="practicum"
                    cartMass={currentExp1.cartMass}
                    cartAddedMassLabel={currentExp1.cartAddedLabel}
                    hangingMass={currentExp1.hangingMass}
                    dropHeight={H2N_DROP_HEIGHT_H0}
                    railTravel={H2N_RAIL_TRAVEL}
                    gate1Pos={H2N_EXP1_GATE1_X}
                    gate2Pos={H2N_EXP1_GATE2_X}
                    flagWidth={H2N_FLAG_WIDTH}
                    speedStorageKey="h2n-playback-speed-cache"
                    isVectorLocked={isVectorLocked}
                    vectorLockMessage={vectorLockMessage}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs font-mono text-slate-300">
                    <p className="font-bold text-white mb-0.5">{currentExp1.description}</p>
                    <p className="text-slate-400">
                      Massa Kereta M = {(currentExp1.cartMass * 1000).toFixed(1)} g, Beban Gantung m = 15 g, Gaya Tarik F = 0.147 N
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleRecordExp1(ctx)}
                      className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    >
                      <Zap className="w-4 h-4" />
                      Catat Data Percobaan A (P{currentExp1.no})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("EXP2")}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono transition-all border border-slate-700 flex items-center gap-1.5"
                    >
                      Lanjut ke Percobaan B <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* TAB 3: PERCOBAAN B (Gaya Berubah, Massa Total Tetap) */}
            {activeTab === "EXP2" && (
              <>
                <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">Variasi Gaya Tarik (1F s/d 5F):</span>
                    <div className="flex gap-1.5">
                      {H2N_TABLE_5_2_PRESETS.map((p, idx) => {
                        const isRecorded = !!completedTrialsExp2[p.no];
                        const isCurrent = activePresetExp2 === idx;
                        return (
                          <button
                            key={p.no}
                            type="button"
                            onClick={() => {
                              setActivePresetExp2(idx);
                              apparatusRef.current?.reset();
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                              isCurrent
                                ? "bg-emerald-600 border-emerald-400 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                                : isRecorded
                                ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
                                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                            }`}
                          >
                            P{p.no} ({p.pullingForce.toFixed(3)}N)
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-slate-400">
                      Massa Total Sistem: <strong className="text-emerald-400">M + m = 175 g (Tetap)</strong>
                    </span>
                    <span className="text-slate-400">
                      Gerbang: <strong className="text-cyan-300">5 cm &amp; 45 cm (s12 = 40 cm)</strong>
                    </span>
                  </div>
                </div>

                <div className="w-full">
                  <AirTrackPulleyApparatus
                    ref={apparatusRef}
                    mode="practicum"
                    cartMass={currentExp2.cartMass}
                    cartAddedMassLabel={currentExp2.cartAddedLabel}
                    hangingMass={currentExp2.hangingMass}
                    dropHeight={H2N_DROP_HEIGHT_H0}
                    railTravel={H2N_RAIL_TRAVEL}
                    gate1Pos={H2N_EXP2_GATE1_X}
                    gate2Pos={H2N_EXP2_GATE2_X}
                    flagWidth={H2N_FLAG_WIDTH}
                    speedStorageKey="h2n-playback-speed-cache"
                    isVectorLocked={isVectorLocked}
                    vectorLockMessage={vectorLockMessage}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs font-mono text-slate-300">
                    <p className="font-bold text-white mb-0.5">{currentExp2.description}</p>
                    <p className="text-slate-400">
                      Beban Gantung m = {(currentExp2.hangingMass * 1000).toFixed(0)} g (F = {currentExp2.pullingForce.toFixed(3)} N), Massa Kereta M = {(currentExp2.cartMass * 1000).toFixed(1)} g, Total = 175 g
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleRecordExp2(ctx)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                    >
                      <Zap className="w-4 h-4" />
                      Catat Data Percobaan B (P{currentExp2.no})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("EXP1")}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono transition-all border border-slate-700"
                    >
                      Kembali ke Percobaan A
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      }}
    />
  );
}
