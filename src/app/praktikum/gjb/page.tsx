"use client";

import React, { useMemo } from "react";
import { PracticumShell } from "@/components/practicum/PracticumShell";
import { PracticumConfig } from "@/types/practicum";
import { FreeFallApparatus } from "@/components/practicum/instruments/FreeFallApparatus";
import { usePracticumSession } from "@/hooks/usePracticumSession";

const CONFIG: PracticumConfig = {
  id: "gjb-01",
  title: "Gerak Jatuh Bebas",
  category: "Mekanika",
  recommendedDurationSec: 1200, // 20 mins
  introduction: "Dalam eksperimen ini, Anda akan mempelajari konsep gerak jatuh bebas (GJB). Anda akan menjatuhkan sebuah bola logam dari berbagai ketinggian (h) menggunakan sebuah elektromagnet dan mengukur waktu jatuhnya (t). Data ini akan digunakan untuk menentukan percepatan gravitasi bumi (g) menggunakan regresi linier.",
  objectives: [
    "Memahami konsep gerak jatuh bebas dan percepatan gravitasi.",
    "Menentukan percepatan gravitasi setempat (g) menggunakan gerak jatuh bebas dan regresi linier.",
  ],
  instructions: [
    "Geser magnet pada tiang berskala untuk mengatur ketinggian (h) jatuhnya bola (minimal gunakan 5 variasi ketinggian berbeda).",
    "Baca skala dengan teliti sebelum menjatuhkan bola.",
    "Tekan dan tahan tombol MORSE KEY untuk mengaktifkan elektromagnet dan menempelkan bola logam.",
    "Lepaskan tombol MORSE KEY untuk menjatuhkan bola. Scaler counter akan mencatat waktu jatuh (t).",
    "Catat nilai ketinggian h (meter) dan waktu t (sekon) pada tabel pengamatan.",
    "Ulangi pengukuran waktu (t) sebanyak 5 kali untuk setiap variasi ketinggian (h) agar didapatkan data yang akurat.",
    "Lengkapi tabel dengan total 25 baris data (5 variasi h × 5 percobaan/h)."
  ],
  columns: [
    { key: "h", label: "Ketinggian (h)", unit: "m" },
    { key: "t", label: "Waktu (t)", unit: "s" },
    { key: "t_sq", label: "t²", unit: "s²" },
  ],
  questions: [
    {
      id: "gjb-q1",
      type: "multiple-choice",
      prompt: "Berdasarkan persamaan gerak jatuh bebas h = ½ g t², jika Anda memplot grafik h pada sumbu-y dan t² pada sumbu-x, maka percepatan gravitasi (g) dapat ditentukan dari:",
      options: ["Nilai perpotongan sumbu-y (intercept)", "2 kali nilai kemiringan (slope) grafik", "Setengah dari nilai kemiringan grafik", "Luas di bawah kurva grafik"],
      correctIndex: 1,
      feedbackHint: "Jika h = (½ g) t², dan persamaan garis lurus adalah y = mx, maka m = ½ g. Sehingga g = 2m."
    },
    {
      id: "gjb-q2",
      type: "multiple-choice",
      prompt: "Mengapa penting untuk melakukan 5 kali pengulangan pengukuran waktu pada setiap ketinggian yang sama?",
      options: [
        "Untuk mengurangi efek ketidakpastian acak (seperti jeda waktu reaksi relay elektromagnet) dan memperoleh nilai rata-rata yang lebih representatif.",
        "Agar bola logam tidak menjadi terlalu panas karena gesekan dengan udara.",
        "Karena waktu jatuh selalu berubah-ubah secara drastis meskipun ketinggiannya presisi sama.",
        "Untuk memenuhi syarat minimal praktikum 25 baris tabel."
      ],
      correctIndex: 0,
      feedbackHint: "Pengukuran berulang selalu bertujuan meminimalkan kesalahan acak yang muncul pada instrumen pengukuran riil."
    },
    {
      id: "gjb-q3",
      type: "numeric",
      prompt: "Misalkan untuk h = 1.0 m, rata-rata waktu jatuh adalah t = 0.45 s. Berapakah rata-rata t² (dalam s²)?",
      expectedValue: 0.2025,
      tolerance: 0.005,
      toleranceType: "absolute",
      unit: "s²",
      feedbackHint: "Hitung kuadrat dari rata-rata waktu: (0.45)²."
    }
  ],
  simulationType: "measurement" // or "simulation" if preferable
};

export default function GJBPage() {
  const { state } = usePracticumSession(CONFIG.id);
  
  // We use useMemo to generate gLocal once per component mount (simulating 1 session value)
  // Generating a value between 9.75 and 9.85
  const gLocal = useMemo(() => {
    return 9.75 + Math.random() * 0.1;
  }, []);

  // Validation: To proceed from SIMULATION to QUESTIONS, user needs at least 25 rows
  const isDataStep = state.currentStep === "SIMULATION";
  const rowCount = state.recordedData.length;
  // Let's require exactly 25 rows, or at least 25 rows. The requirement said "5 ketinggian berbeda x 5 trial (25 titik data mentah)".
  // For simplicity, we just check rowCount >= 25. 
  // We can also check if all h, t, and t_sq fields are filled but just row count is a good start.
  const hasEnoughData = rowCount >= 25;
  
  const isNextDisabled = isDataStep && !hasEnoughData;

  return (
    <PracticumShell 
      config={CONFIG} 
      simulationComponent={
        <div className="w-full h-full flex justify-center items-center p-8">
          <div className="w-full max-w-4xl max-h-[80vh]">
            <FreeFallApparatus gLocal={gLocal} />
          </div>
          
          {isDataStep && !hasEnoughData && (
             <div className="absolute top-4 right-4 bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-lg max-w-xs shadow-lg animate-pulse">
               <p className="text-yellow-400 text-xs font-bold mb-1">DATA BELUM LENGKAP</p>
               <p className="text-white/70 text-xs">Anda baru mengumpulkan {rowCount}/25 data. Tombol Selanjutnya terkunci.</p>
             </div>
          )}
        </div>
      }
      isNextDisabled={isNextDisabled}
    />
  );
}
