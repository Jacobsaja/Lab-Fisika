"use client";

import React from "react";
import Link from "next/link";
import { Compass } from "lucide-react";
import { PracticumShell } from "@/components/practicum/PracticumShell";
import { PracticumConfig, PracticumState } from "@/types/practicum";
import {
  CircularMotionApparatus,
  GMB_MOTOR_OMEGA,
  GMB_MOTOR_PERIOD,
} from "@/components/practicum/instruments/CircularMotionApparatus";
import { TWO_PI, tangentialSpeed, centripetalAcceleration } from "@/physics/circularMotion";

// Reference radius used in the numeric questions (m).
const Q_RADIUS = 0.5;
// Short-calculation scenario (independent of the apparatus).
const CALC_N = 12;
const CALC_T_TOTAL = 9.6;
const CALC_R = 0.8;
const CALC_OMEGA = TWO_PI / (CALC_T_TOTAL / CALC_N);

const MIN_ROWS = 5;
const MIN_DISTINCT_N = 3;
const MIN_DISTINCT_R = 2;

const CONFIG: PracticumConfig = {
  id: "gmb",
  title: "Gerak Melingkar Beraturan",
  category: "Mekanika",
  recommendedDurationSec: 1200, // 20 mins
  introduction:
    "Pada Gerak Melingkar Beraturan (GMB), benda bergerak pada lintasan lingkaran dengan kelajuan tetap. Walaupun kelajuannya tetap, arah kecepatannya selalu berubah sehingga benda mengalami percepatan sentripetal yang mengarah ke pusat lingkaran. Dalam praktikum ini Anda mengukur waktu (t) untuk sejumlah putaran (N) menggunakan jam simulasi, lalu menentukan Periode, Frekuensi, Kecepatan Sudut, Kecepatan Tangensial, dan Percepatan Sentripetal.",
  objectives: [
    "Menentukan Periode (T) gerak melingkar dari grafik t terhadap N menggunakan regresi linear.",
    "Menghitung Frekuensi (f), Kecepatan Sudut (ω), Kecepatan Tangensial (v), dan Percepatan Sentripetal (a_c).",
    "Menjelaskan arah vektor kecepatan dan percepatan sentripetal pada GMB.",
    "Menganalisis pengaruh Jari-jari (r) terhadap v dan a_c pada kecepatan sudut tetap.",
  ],
  instructions: [
    "Atur Jari-jari (r) dengan slider dan tentukan Target Jumlah Putaran (N).",
    "Tekan Reset (↺) pada alat agar jam kembali ke 0 dan partikel berada di garis START.",
    "Tekan Mulai (▶). Amati partikel dan hitung putarannya melalui penghitung putaran.",
    "Tekan Jeda (❚❚) tepat saat partikel kembali ke garis START setelah N putaran. Gunakan kecepatan 0.5x atau 0.25x agar lebih teliti.",
    "Tekan \"Catat Data\". Nilai r, N, dan t masuk ke tabel; T, f, ω, v, dan a_c dihitung dari t yang Anda ukur.",
    `Ulangi hingga minimal ${MIN_ROWS} percobaan dengan minimal ${MIN_DISTINCT_N} nilai N berbeda dan ${MIN_DISTINCT_R} jari-jari berbeda.`,
  ],
  hints: [
    "Periode adalah waktu untuk satu putaran penuh. Jika t diukur untuk N putaran, bagaimana t berubah ketika N dilipatgandakan?",
    "Grafik t (sumbu-y) terhadap N (sumbu-x) seharusnya berupa garis lurus yang melalui titik asal. Pikirkan besaran apa yang diwakili oleh kemiringannya.",
    "Setelah T diperoleh, gunakan ω = 2π/T, v = ωr, dan a_c = ω²r = v²/r. Perhatikan satuan setiap besaran.",
  ],
  columns: [
    { key: "trial", label: "Percobaan", unit: "" },
    { key: "r", label: "Jari-jari (r)", unit: "m" },
    { key: "N", label: "Jumlah Putaran (N)", unit: "" },
    { key: "t", label: "Waktu N Putaran (t)", unit: "s" },
    { key: "T", label: "Periode (T)", unit: "s" },
    { key: "f", label: "Frekuensi (f)", unit: "Hz" },
    { key: "omega", label: "Kecepatan Sudut (ω)", unit: "rad/s" },
    { key: "v", label: "Kecepatan Tangensial (v)", unit: "m/s" },
    { key: "a_c", label: "Percepatan Sentripetal (a_c)", unit: "m/s²" },
  ],
  questions: [
    {
      id: "gmb-q1",
      type: "numeric",
      prompt: "Berdasarkan kemiringan (slope) grafik t terhadap N pada langkah Analisis Data, berapakah Periode (T) gerak melingkar?",
      expectedValue: GMB_MOTOR_PERIOD,
      tolerance: 0.05,
      toleranceType: "relative",
      unit: "s",
      feedbackHint: "Kemiringan grafik menyatakan perubahan t untuk setiap pertambahan satu putaran. Periksa kembali nilai slope pada hasil regresi.",
    },
    {
      id: "gmb-q2",
      type: "numeric",
      prompt: "Dengan Periode yang Anda peroleh, berapakah Kecepatan Sudut (ω) motor?",
      expectedValue: GMB_MOTOR_OMEGA,
      tolerance: 0.05,
      toleranceType: "relative",
      unit: "rad/s",
      feedbackHint: "Satu putaran penuh setara dengan 2π radian. Hubungkan sudut satu putaran dengan waktu satu putaran.",
    },
    {
      id: "gmb-q3",
      type: "numeric",
      prompt: `Berapakah Kecepatan Tangensial (v) partikel pada jari-jari r = ${Q_RADIUS.toFixed(2)} m?`,
      expectedValue: tangentialSpeed(GMB_MOTOR_OMEGA, Q_RADIUS),
      tolerance: 0.05,
      toleranceType: "relative",
      unit: "m/s",
      feedbackHint: "Kecepatan tangensial bergantung pada kecepatan sudut dan jari-jari lintasan. Pastikan r dalam meter.",
    },
    {
      id: "gmb-q4",
      type: "numeric",
      prompt: `Berapakah besar Percepatan Sentripetal (a_c) partikel pada jari-jari r = ${Q_RADIUS.toFixed(2)} m?`,
      expectedValue: centripetalAcceleration(GMB_MOTOR_OMEGA, Q_RADIUS),
      tolerance: 0.07,
      toleranceType: "relative",
      unit: "m/s²",
      feedbackHint: "Percepatan sentripetal dapat dihitung dari ω dan r, atau dari v dan r. Periksa apakah ada besaran yang perlu dikuadratkan.",
    },
    {
      id: "gmb-q5",
      type: "multiple-choice",
      prompt: "Bagaimana arah vektor Kecepatan Tangensial (v) pada setiap titik lintasan GMB?",
      options: [
        "Menuju pusat lingkaran",
        "Menjauhi pusat lingkaran sepanjang jari-jari",
        "Menyinggung lingkaran, tegak lurus terhadap jari-jari",
        "Selalu searah sumbu-x positif",
      ],
      correctIndex: 2,
      feedbackHint: "Aktifkan Vektor Kecepatan pada alat dan amati sudut antara panah v dan garis jari-jari saat partikel bergerak.",
    },
    {
      id: "gmb-q6",
      type: "multiple-choice",
      prompt: "Bagaimana arah vektor Percepatan Sentripetal (a_c) pada GMB?",
      options: [
        "Searah dengan vektor kecepatan",
        "Selalu menuju pusat lingkaran",
        "Menjauhi pusat lingkaran",
        "Tidak memiliki arah karena kelajuannya tetap",
      ],
      correctIndex: 1,
      feedbackHint: "Aktifkan Vektor Percepatan dan amati ke mana panah a_c menunjuk di berbagai posisi partikel.",
    },
    {
      id: "gmb-q7",
      type: "multiple-choice",
      prompt: "Jika Jari-jari (r) dijadikan dua kali semula dengan Kecepatan Sudut (ω) tetap, bagaimana Percepatan Sentripetal (a_c)?",
      options: [
        "Tetap sama",
        "Menjadi setengah kali semula",
        "Menjadi dua kali semula",
        "Menjadi empat kali semula",
      ],
      correctIndex: 2,
      feedbackHint: "Perhatikan pangkat r dalam rumus a_c ketika ω dijaga tetap. Bandingkan kolom a_c pada dua percobaan dengan r berbeda.",
    },
    {
      id: "gmb-q8",
      type: "short-calculation",
      prompt: `Sebuah benda menempuh ${CALC_N} putaran dalam ${CALC_T_TOTAL} s pada lintasan berjari-jari ${CALC_R} m. Hitung Percepatan Sentripetal (a_c) benda tersebut.`,
      expectedValue: centripetalAcceleration(CALC_OMEGA, CALC_R),
      tolerance: 0.03,
      toleranceType: "relative",
      unit: "m/s²",
      steps: ["Tentukan Periode T dari t dan N.", "Hitung ω = 2π/T.", "Hitung a_c = ω²r."],
      feedbackHint: "Kerjakan bertahap: periode, lalu kecepatan sudut, lalu percepatan sentripetal. Hindari pembulatan terlalu awal.",
    },
    {
      id: "gmb-q9",
      type: "text",
      prompt:
        "Bandingkan dua percobaan Anda yang memiliki jari-jari berbeda. Jelaskan besaran mana yang berubah dan mana yang tetap (periode, kecepatan tangensial, percepatan sentripetal), serta kaitannya dengan jari-jari.",
      keywords: ["periode", "kecepatan", "jari"],
      minLength: 60,
      feedbackHint: "Jawaban perlu membahas periode, kecepatan tangensial, dan pengaruh jari-jari secara eksplisit, didukung data dari tabel Anda.",
    },
  ],
  simulationType: "circular-motion",
  analysis: {
    xColumn: "N",
    yColumn: "t",
    xLabel: "Jumlah Putaran N",
    yLabel: "Waktu t (s)",
    showRegression: true,
    // Enables switching axes, e.g. v (y) vs r (x): slope = ω at fixed ω.
    allowSwitching: true,
  },
};

interface DataProgress {
  validRows: number;
  distinctN: number;
  distinctR: number;
  ready: boolean;
}

function getDataProgress(state: PracticumState): DataProgress {
  const valid = state.recordedData.filter((row) =>
    [row.r, row.N, row.t].every((v) => v !== "" && Number.isFinite(Number(v)) && Number(v) > 0)
  );
  const distinctN = new Set(valid.map((row) => Number(row.N))).size;
  const distinctR = new Set(valid.map((row) => Number(row.r))).size;
  return {
    validRows: valid.length,
    distinctN,
    distinctR,
    ready: valid.length >= MIN_ROWS && distinctN >= MIN_DISTINCT_N && distinctR >= MIN_DISTINCT_R,
  };
}

export default function GMBPage() {
  return (
    <PracticumShell
      config={CONFIG}
      isNextDisabled={(state) => state.currentStep === "SIMULATION" && !getDataProgress(state).ready}
      simulationComponent={(ctx) => {
        const progress = getDataProgress(ctx.state);
        const showProgress = ctx.state.currentStep === "SIMULATION" && !progress.ready;
        return (
          <div className="relative w-full">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 pt-4">
              <Link
                href="/explore/mekanika/gmb"
                id="gmb-explore-link"
                className="inline-flex items-center gap-2 text-xs font-semibold text-amber-300/80 hover:text-amber-200 transition-colors"
              >
                <Compass className="w-4 h-4" /> Buka Mode Eksplorasi
              </Link>
              {showProgress && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 px-3 py-2 rounded-lg shadow-lg" role="status">
                  <p className="text-yellow-400 text-xs font-bold">DATA BELUM LENGKAP</p>
                  <p className="text-white/70 text-xs font-mono">
                    Baris {progress.validRows}/{MIN_ROWS} · N berbeda {progress.distinctN}/{MIN_DISTINCT_N} · r berbeda {progress.distinctR}/{MIN_DISTINCT_R}
                  </p>
                </div>
              )}
            </div>
            <CircularMotionApparatus 
              key={ctx.resetCount} 
              mode="practicum"
              isDataStep={ctx.state.currentStep === "SIMULATION"}
              recordedDataCount={ctx.state.recordedData.length}
              onRecord={ctx.addDataRow}
            />
          </div>
        );
      }}
    />
  );
}
