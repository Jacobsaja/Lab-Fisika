"use client";

import React, { useState, useMemo, useCallback } from "react";
import { PracticumShell, PracticumShellContext } from "@/components/practicum/PracticumShell";
import { PracticumConfig, PracticumState } from "@/types/practicum";
import {
  OpticalBenchApparatus,
} from "@/components/practicum/instruments/wave/OpticalBenchApparatus";
import {
  ScreenPatternView,
  MarkerPoint,
} from "@/components/practicum/instruments/wave/ScreenPatternView";
import {
  VirtualRulerMarkerTool,
} from "@/components/practicum/instruments/wave/VirtualRulerMarkerTool";
import {
  IntensityProfileGraph,
} from "@/components/practicum/instruments/wave/IntensityProfileGraph";
import {
  StudentCalculationTable,
  StudentCalcColumn,
  StudentCalcRow,
} from "@/components/practicum/StudentCalculationTable";
import {
  DEFAULT_LASER_WAVELENGTH,
  DEFAULT_SCREEN_DISTANCE_L,
  SSG_SLIT_PRESETS,
  fraunhoferIntensity,
  findFraunhoferPeakNumerical,
  getPatternClassification,
  quantizeToResolution,
  relativeUncertaintyPercent,
  estimatedPatternPosition,
} from "@/physics/waveOptics";
import {
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
  Sparkles,
  Sliders,
  Scale,
  RotateCcw,
  BookOpen,
  Wrench,
  HelpCircle,
  Maximize2,
  Eye,
  Check,
  Power,
  ChevronRight,
  Info,
} from "lucide-react";

// ─── Module Practicum Configuration ──────────────────────────────────────────

export const SSG_CONFIG: PracticumConfig = {
  id: "ssg",
  title: "Sifat-Sifat Gelombang (Interferensi & Difraksi Cahaya)",
  category: "Gelombang",
  recommendedDurationSec: 2400, // 40 mins
  introduction:
    "Praktikum ini mempelajari karakteristik gelombang elektromagnetik melalui fenomena interferensi dan difraksi cahaya monokromatis pada celah ganda (N=2) dan celah majemuk (N=3, N=5). Dengan berkas laser semikonduktor (λ = 632 nm) pada jarak layar L = 1,6 m, Anda akan mengamati pita-pita terang pusat, utama, dan sekunder pada kertas milimeter blok, menentukan posisinya dengan penanda digital presisi, serta mengevaluasi kesesuaian rumus teoretis celah majemuk melalui perhitungan Kesalahan Relatif (KSR%).",
  objectives: [
    "Mengamati dan menganalisis pola interferensi serta difraksi cahaya monokromatis pada celah ganda (N=2) dan celah majemuk (N=3, N=5).",
    "Menentukan posisi garis terang pusat (T0), terang sekunder (Ts), dan terang utama (Tu) pada layar milimeter blok.",
    "Menghitung nilai teoretis jarak terang y dan Kesalahan Relatif (KSR%) dari data pengukuran mandiri.",
  ],
  instructions: [
    "Tahap 1: Pahami tujuan modul dan formulasi celah majemuk.",
    "Tahap 2: Rangkai alat sesuai prosedur 4.1 (pasang komponen, jarak L = 1,6 m, nyalakan laser & dimmer maksimum, jepit kertas milimeter blok).",
    "Tahap 3: Lakukan pengukuran posisi terang T0 s/d T4 untuk Celah II, Celah III, dan Celah IIIII menggunakan penanda jarum digital dan kaca pembesar 0,1 mm, lalu salin ke tabel.",
    "Tahap 4: Lengkapi perhitungan mandiri y_teori dan KSR% pada Tabel 11.1, 11.2, dan 11.3.",
    "Tahap 5: Jawab pertanyaan evaluasi dan analisis pengaruh variasi jarak layar L.",
    "Tahap 6: Tinjau ringkasan hasil pengukuran, profil intensitas Fraunhofer berlabel, dan perbandingan teori vs modul.",
  ],
  columns: [
    { key: "celah", label: "Celah", unit: "" },
    { key: "tn", label: "Titik", unit: "" },
    { key: "pola", label: "Pola", unit: "" },
    { key: "y_prak", label: "y_praktikum", unit: "mm" },
    { key: "y_teori", label: "y_teori", unit: "mm" },
    { key: "ksr", label: "KSR", unit: "%" },
  ],
  hints: [
    "Perhatikan posisi jarak celah ke layar L dalam persamaan celah majemuk y = (Tn/(N-1))·(λL/d). Variabel L berada pada pembilang pecahan.",
    "Karena L berada pada pembilang, jarak terang y berbanding lurus (proporsional) terhadap L. Hubungan matematis ini bersifat linier: y ∝ L.",
    "Jika L diperbesar, jarak antar pita terang membesar (pola melebar). Sebaliknya jika L diperkecil, jarak antar garis terang mengecil (pola menyempit atau semakin rapat).",
  ],
  questions: [
    {
      id: "ssg-q1",
      type: "text",
      prompt:
        "Bagaimana pengaruh jarak celah ke layar (L) terhadap pola interferensi jika L diperbesar? Jelaskan hubungannya berdasarkan rumus jarak terang y!",
      keywords: [
        "lebar|melebar|bertambah|besar",
        "sebanding|lurus|pembilang|proporsional",
      ],
      minLength: 15,
      feedbackHint:
        "Ingat bahwa jarak terang y berbanding lurus dengan L (y ∝ L). Jika L diperbesar, jarak antar garis terang bertambah sehingga pola interferensi melebar.",
    },
    {
      id: "ssg-q2",
      type: "text",
      prompt:
        "Bagaimana pengaruh jarak celah ke layar (L) terhadap pola interferensi jika L diperkecil? Jelaskan hubungannya berdasarkan rumus jarak terang y!",
      keywords: [
        "sempit|menyempit|rapat|merapat|berkurang|mengecil",
        "sebanding|lurus|proporsional|berkurang",
      ],
      minLength: 15,
      feedbackHint:
        "Karena y sebanding dengan L, memperkecil nilai L akan memperkecil jarak antar terang, menyebabkan pola garis terang menyempit atau semakin rapat.",
    },
  ],
  simulationType: "WaveOptics",
  analysis: {
    xColumn: "tn",
    yColumn: "y_prak",
    xLabel: "Orde Terang (Tn)",
    yLabel: "Jarak Terang y (mm)",
    showRegression: true,
    allowSwitching: false,
  },
};

// ─── Table Columns for StudentCalculationTable ───────────────────────────────

const CALC_TABLE_COLUMNS: StudentCalcColumn[] = [
  { key: "pola", header: "Pola", readOnly: true },
  { key: "y_prak", header: "y_praktikum (mm)", readOnly: true },
  { key: "y_teori", header: "y_teori (mm)", precision: 3, placeholder: "0.000" },
  { key: "ksr", header: "KSR (%)", precision: 2, placeholder: "0.00" },
];

export type SlitKey = "slit2" | "slit3" | "slit5";

const SLIT_TABS: { key: SlitKey; label: string; tableTitle: string; tableNumber: string }[] = [
  { key: "slit2", label: "Celah II (N=2)", tableTitle: "Tabel 11.1: Celah II (N=2)", tableNumber: "11.1" },
  { key: "slit3", label: "Celah III (N=3)", tableTitle: "Tabel 11.2: Celah III (N=3)", tableNumber: "11.2" },
  { key: "slit5", label: "Celah IIIII (N=5)", tableTitle: "Tabel 11.3: Celah IIIII (N=5)", tableNumber: "11.3" },
];

// Helper to construct initial marker points for a given slit
function createInitialMarkers(slitKey: SlitKey): MarkerPoint[] {
  const slit = SSG_SLIT_PRESETS[slitKey];
  return [0, 1, 2, 3, 4].map((tn) => {
    const isPrimary = tn === 0 || tn % (slit.N - 1) === 0;
    let initialY = 0;
    if (tn > 0) {
      // Nominal linear formula estimate quantized to standard resolution
      const rawY = estimatedPatternPosition(tn, slit.N, DEFAULT_LASER_WAVELENGTH, DEFAULT_SCREEN_DISTANCE_L, slit.d, slit.a) * 1e3;
      initialY = quantizeToResolution(rawY, 0.5);
    }
    return {
      id: `${slitKey}_T${tn}`,
      tn,
      label: tn === 0 ? "T₀ (Pusat)" : isPrimary ? `T${tn} (Utama)` : `T${tn} (Sekunder)`,
      yMm: initialY,
      isAssisted: false,
    };
  });
}

// ─── Unlabeled Student Journal Sketch Component (Tahap 3) ───────────────────

interface StudentSketchViewProps {
  markers: MarkerPoint[];
  slitKey: SlitKey;
}

function StudentSketchView({ markers, slitKey }: StudentSketchViewProps) {
  const slit = SSG_SLIT_PRESETS[slitKey];
  const maxSpanMm = 10.0;
  const svgW = 680;
  const svgH = 110;
  const baseY = 80;
  const scale = (svgW - 80) / (2 * maxSpanMm);
  const centerX = svgW / 2;

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span>Sketsa Pola Garis Terang (Buku Jurnal Praktikan)</span>
        </span>
        <span className="text-[11px] font-mono text-slate-500">
          Tinggi garis proporsional terhadap intensitas relatif · Tanpa label jawaban
        </span>
      </div>

      <div className="w-full overflow-x-auto bg-[#040814] rounded-lg border border-slate-900 p-2">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto select-none">
          {/* Grid lines and ticks */}
          {[-8, -6, -4, -2, 0, 2, 4, 6, 8].map((tick) => {
            const x = centerX + tick * scale;
            return (
              <g key={tick}>
                <line x1={x} y1={20} x2={x} y2={baseY} stroke="#1e293b" strokeWidth={1} strokeDasharray="2,2" />
                <line x1={x} y1={baseY} x2={x} y2={baseY + 5} stroke="#475569" strokeWidth={1} />
                <text x={x} y={baseY + 16} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="monospace">
                  {tick > 0 ? `+${tick}` : tick}
                </text>
              </g>
            );
          })}

          {/* Baseline axis */}
          <line x1={30} y1={baseY} x2={svgW - 30} y2={baseY} stroke="#475569" strokeWidth={1.5} />
          <text x={svgW - 25} y={baseY + 16} textAnchor="end" fill="#64748b" fontSize={9} fontFamily="monospace">
            y (mm)
          </text>

          {/* Student marked fringes (both +y and symmetric -y) */}
          {markers.map((m) => {
            if (m.yMm > maxSpanMm) return null;
            const I = fraunhoferIntensity(
              m.yMm * 1e-3,
              DEFAULT_LASER_WAVELENGTH,
              DEFAULT_SCREEN_DISTANCE_L,
              slit.a,
              slit.d,
              slit.N
            );
            const barH = Math.max(6, I * 55);

            const xPos = centerX + m.yMm * scale;
            const xNeg = centerX - m.yMm * scale;

            return (
              <g key={m.tn}>
                {/* Positive line */}
                <line
                  x1={xPos}
                  y1={baseY}
                  x2={xPos}
                  y2={baseY - barH}
                  stroke="#ef4444"
                  strokeWidth={m.tn === 0 ? 3 : 2}
                  strokeLinecap="round"
                />
                <circle cx={xPos} cy={baseY - barH} r={2.5} fill="#fca5a5" />

                {/* Symmetric negative line */}
                {m.yMm > 0 && (
                  <>
                    <line
                      x1={xNeg}
                      y1={baseY}
                      x2={xNeg}
                      y2={baseY - barH}
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                    <circle cx={xNeg} cy={baseY - barH} r={2.5} fill="#fca5a5" />
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── Main Practicum Page Component ──────────────────────────────────────────

export default function SSGPracticumPage() {
  // ── 1. Tahap 2: Setup & Assembly Checklist State ──
  const [setupChecklist, setSetupChecklist] = useState({
    componentsMounted: false,
    distanceSet: false,
    laserPowerMax: false,
    laserAligned: false,
    screenPaperClipped: false,
  });

  const allSetupDone = useMemo(() => {
    return (
      setupChecklist.componentsMounted &&
      setupChecklist.distanceSet &&
      setupChecklist.laserPowerMax &&
      setupChecklist.laserAligned &&
      setupChecklist.screenPaperClipped
    );
  }, [setupChecklist]);

  // Optical bench live controls
  const [laserOn, setLaserOn] = useState(true);
  const [dimmer, setDimmer] = useState(1.0);
  const [distanceL, setDistanceL] = useState(DEFAULT_SCREEN_DISTANCE_L);

  // ── 2. Tahap 3: Experiment State ──
  const [activeSlitKey, setActiveSlitKey] = useState<SlitKey>("slit2");
  const [activeTn, setActiveTn] = useState<number>(0);
  const [exposure, setExposure] = useState<number>(1.8); // Default 1.8x contrast
  const [zoomActive, setZoomActive] = useState<boolean>(false);

  // Markers stored per slit key
  const [slitMarkers, setSlitMarkers] = useState<Record<SlitKey, MarkerPoint[]>>({
    slit2: createInitialMarkers("slit2"),
    slit3: createInitialMarkers("slit3"),
    slit5: createInitialMarkers("slit5"),
  });

  // Recorded student experimental positions (y_praktikum in mm) per slit
  const [recordedSlitData, setRecordedSlitData] = useState<Record<SlitKey, Record<number, number> | null>>({
    slit2: null,
    slit3: null,
    slit5: null,
  });

  // Feedback banner after copying to table
  const [copySuccessMessage, setCopySuccessMessage] = useState<string | null>(null);

  // ── 3. Tahap 4: Student Calculations State ──
  const [activeCalcSlitKey, setActiveCalcSlitKey] = useState<SlitKey>("slit2");

  // Inputs for Table 11.1, 11.2, 11.3: { y_teori, ksr }
  const [studentCalcValues, setStudentCalcValues] = useState<
    Record<SlitKey, Record<number, { y_teori: string; ksr: string }>>
  >({
    slit2: { 0: { y_teori: "", ksr: "" }, 1: { y_teori: "", ksr: "" }, 2: { y_teori: "", ksr: "" }, 3: { y_teori: "", ksr: "" }, 4: { y_teori: "", ksr: "" } },
    slit3: { 0: { y_teori: "", ksr: "" }, 1: { y_teori: "", ksr: "" }, 2: { y_teori: "", ksr: "" }, 3: { y_teori: "", ksr: "" }, 4: { y_teori: "", ksr: "" } },
    slit5: { 0: { y_teori: "", ksr: "" }, 1: { y_teori: "", ksr: "" }, 2: { y_teori: "", ksr: "" }, 3: { y_teori: "", ksr: "" }, 4: { y_teori: "", ksr: "" } },
  });

  // Assisted cells tracking: "slitKey_rowId_colKey": boolean
  const [assistedCells, setAssistedCells] = useState<Record<string, boolean>>({});
  // Validation trigger flags per slit
  const [hasValidated, setHasValidated] = useState<Record<SlitKey, boolean>>({
    slit2: false,
    slit3: false,
    slit5: false,
  });

  // ── Handler: Update Marker in Tahap 3 ──
  const handleUpdateMarker = (tn: number, yMm: number, isAssisted = false) => {
    setSlitMarkers((prev) => {
      const current = prev[activeSlitKey];
      const updated = current.map((m) => (m.tn === tn ? { ...m, yMm, isAssisted } : m));
      return { ...prev, [activeSlitKey]: updated };
    });
  };

  // ── Handler: Reset Markers for Active Slit ──
  const handleResetActiveMarkers = () => {
    setSlitMarkers((prev) => ({
      ...prev,
      [activeSlitKey]: createInitialMarkers(activeSlitKey),
    }));
  };

  // ── Handler: Auto-assist all markers for active slit ──
  const handleAutoAssistAllMarkers = () => {
    const slit = SSG_SLIT_PRESETS[activeSlitKey];
    setSlitMarkers((prev) => {
      const updated = prev[activeSlitKey].map((m) => {
        if (m.tn === 0) return { ...m, yMm: 0, isAssisted: true };
        const peakMm = findFraunhoferPeakNumerical(
          m.tn,
          slit.N,
          DEFAULT_LASER_WAVELENGTH,
          DEFAULT_SCREEN_DISTANCE_L,
          slit.d,
          slit.a
        );
        const resolution = zoomActive ? 0.1 : 0.5;
        const roundedMm = quantizeToResolution(peakMm, resolution);
        return { ...m, yMm: roundedMm, isAssisted: true };
      });
      return { ...prev, [activeSlitKey]: updated };
    });
  };

  // ── Handler: Copy measurements to Table (Student Click Required) ──
  const handleApplyToTable = (ctx: PracticumShellContext, measurements: Record<number, number>) => {
    setRecordedSlitData((prev) => ({ ...prev, [activeSlitKey]: measurements }));

    // Sync to PracticumShell recordedData
    const slit = SSG_SLIT_PRESETS[activeSlitKey];
    const newRows: Record<string, string | number>[] = [0, 1, 2, 3, 4].map((tn) => {
      const isPrimary = tn === 0 || tn % (slit.N - 1) === 0;
      const yPrak = measurements[tn] ?? 0;
      return {
        celah: slit.name,
        tn: `T${tn}`,
        pola: tn === 0 ? "Pusat" : isPrimary ? "Primer" : "Sekunder",
        y_prak: yPrak.toFixed(2),
        y_teori: "-",
        ksr: "-",
      };
    });

    // Replace or append recorded rows for this slit
    const existing = ctx.state.recordedData.filter((r) => r.celah !== slit.name);
    ctx.setRecordedData([...existing, ...newRows]);

    setCopySuccessMessage(`Data pengukuran ${slit.name} berhasil disalin ke tabel pengamatan!`);
    setTimeout(() => setCopySuccessMessage(null), 4000);
  };

  // Check if all 3 slits have recorded measurements
  const allSlitsRecorded = useMemo(() => {
    return (
      recordedSlitData.slit2 !== null &&
      recordedSlitData.slit3 !== null &&
      recordedSlitData.slit5 !== null
    );
  }, [recordedSlitData]);

  // ── Tahap 4: Build Calculation Rows for StudentCalculationTable ──
  const buildCalcRows = useCallback(
    (slitKey: SlitKey): StudentCalcRow[] => {
      const slit = SSG_SLIT_PRESETS[slitKey];
      const measurements = recordedSlitData[slitKey];

      return [0, 1, 2, 3, 4].map((tn) => {
        const isPrimary = tn === 0 || tn % (slit.N - 1) === 0;
        const polaLabel = tn === 0 ? "Terang Pusat" : isPrimary ? "Terang Utama (Primer)" : "Terang Sekunder";

        // y_praktikum from Tahap 3
        const yPrak = measurements ? measurements[tn] ?? 0 : 0;
        const yPrakStr = measurements ? yPrak.toFixed(2) : "-";

        // Theoretical expected position y_teori in mm
        const yTeoriMm =
          estimatedPatternPosition(tn, slit.N, DEFAULT_LASER_WAVELENGTH, DEFAULT_SCREEN_DISTANCE_L, slit.d, slit.a) *
          1e3;

        // Theoretical expected KSR% calculated against student's OWN y_praktikum
        const expectedKsr =
          tn === 0 ? null : relativeUncertaintyPercent(yTeoriMm, yPrak);

        const currentVal = studentCalcValues[slitKey][tn];

        return {
          rowId: tn,
          label: `T${tn}`,
          values: {
            pola: polaLabel,
            y_prak: yPrakStr,
            y_teori: currentVal.y_teori,
            ksr: tn === 0 ? "-" : currentVal.ksr,
          },
          expected: measurements
            ? {
                y_teori: yTeoriMm,
                // KSR for Tn = 0 is null (not evaluated, renders "-")
                ksr: expectedKsr,
              }
            : undefined,
        };
      });
    },
    [recordedSlitData, studentCalcValues]
  );

  // ── Tahap 4: "Bantu Lengkapi" for Active Slit ──
  const handleAutoFillAssistance = (slitKey: SlitKey) => {
    const slit = SSG_SLIT_PRESETS[slitKey];
    const measurements = recordedSlitData[slitKey] ?? { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };

    const filled: Record<number, { y_teori: string; ksr: string }> = { ...studentCalcValues[slitKey] };
    const newAssisted: Record<string, boolean> = { ...assistedCells };

    [0, 1, 2, 3, 4].forEach((tn) => {
      const yTeoriMm =
        estimatedPatternPosition(tn, slit.N, DEFAULT_LASER_WAVELENGTH, DEFAULT_SCREEN_DISTANCE_L, slit.d, slit.a) * 1e3;
      const yPrak = measurements[tn] ?? 0;
      const ksrVal = relativeUncertaintyPercent(yTeoriMm, yPrak);

      filled[tn] = {
        y_teori: yTeoriMm.toFixed(3),
        ksr: tn === 0 ? "-" : ksrVal !== null ? ksrVal.toFixed(2) : "-",
      };

      newAssisted[`${slitKey}_${tn}_y_teori`] = true;
      if (tn > 0) {
        newAssisted[`${slitKey}_${tn}_ksr`] = true;
      }
    });

    setStudentCalcValues((prev) => ({ ...prev, [slitKey]: filled }));
    setAssistedCells(newAssisted);
    setHasValidated((prev) => ({ ...prev, [slitKey]: true }));
  };

  // ── Reference Table for Accordion in Tahap 4 ──
  const buildReferenceTableData = (slitKey: SlitKey) => {
    const slit = SSG_SLIT_PRESETS[slitKey];
    const measurements = recordedSlitData[slitKey];

    return {
      title: `Kunci Referensi Nilai Teori & KSR (${slit.name})`,
      description:
        "Nilai acuan teoretis dihitung menggunakan rumus modul y = (Tn/(N-1))·(λL/d). KSR dihitung terhadap y_praktikum milik Anda.",
      headers: ["Titik", "Pola", "y_praktikum (mm)", "y_teori (mm)", "KSR (%)"],
      rows: [0, 1, 2, 3, 4].map((tn) => {
        const isPrimary = tn === 0 || tn % (slit.N - 1) === 0;
        const pola = tn === 0 ? "Pusat" : isPrimary ? "Primer" : "Sekunder";
        const yPrak = measurements ? measurements[tn]?.toFixed(2) ?? "-" : "-";
        const yTeoriMm =
          estimatedPatternPosition(tn, slit.N, DEFAULT_LASER_WAVELENGTH, DEFAULT_SCREEN_DISTANCE_L, slit.d, slit.a) *
          1e3;
        const expectedKsr =
          tn === 0 || !measurements ? null : relativeUncertaintyPercent(yTeoriMm, measurements[tn] ?? 0);

        return [
          `T${tn}`,
          pola,
          yPrak,
          yTeoriMm.toFixed(3),
          tn === 0 ? "-" : expectedKsr !== null ? `${expectedKsr.toFixed(2)}%` : "-",
        ];
      }),
    };
  };

  return (
    <PracticumShell
      config={SSG_CONFIG}
      isNextDisabled={(state: PracticumState) => {
        if (state.currentStep === "SETUP") {
          return !allSetupDone;
        }
        if (state.currentStep === "SIMULATION") {
          return !allSlitsRecorded;
        }
        if (state.currentStep === "QUESTIONS") {
          return Object.keys(state.answers).length < SSG_CONFIG.questions.length;
        }
        return false;
      }}
      simulationComponent={(ctx: PracticumShellContext) => {
        // ──────────────────────────────────────────────────────────────────
        // TAHAP 1: INTRO (Tujuan & Teori)
        // ──────────────────────────────────────────────────────────────────
        if (ctx.state.currentStep === "INTRO") {
          return (
            <div className="w-full h-full p-6 lg:p-10 flex flex-col items-center overflow-y-auto bg-[#070b14] text-white">
              <div className="w-full max-w-4xl space-y-6">
                <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border border-blue-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Ringkasan Teori & Formulasi Celah Majemuk</h2>
                      <p className="text-xs text-slate-400">Modul 11 Virtual Lab: Sifat-Sifat Gelombang</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed mb-4">
                    Ketika berkas cahaya monokromatis melewati celah majemuk dengan N celah, pola yang terbentuk di layar adalah hasil superposisi difraksi tiap celah tunggal dan interferensi antar-celah.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                      <div className="text-cyan-400 font-bold font-sans flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-cyan-400" />
                        Puncak Sekunder
                      </div>
                      <div className="text-base text-cyan-200 font-bold">n(Ts) = N - 2</div>
                      <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                        Jumlah terang sekunder yang berada di antara dua terang utama yang berdekatan.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                      <div className="text-amber-400 font-bold font-sans flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-amber-400" />
                        Jarak Terang y(Tn, N)
                      </div>
                      <div className="text-sm text-amber-200 font-bold">y = [Tn / (N - 1)] · (λL / d)</div>
                      <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                        Pendekatan posisi terang ke-n pada layar untuk λ = 632 nm dan jarak celah-layar L = 1,6 m.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                      <div className="text-emerald-400 font-bold font-sans flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Kesalahan Relatif
                      </div>
                      <div className="text-sm text-emerald-200 font-bold">KSR = |(yTeori - yPrak) / yTeori| × 100%</div>
                      <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                        Evaluasi presisi. Khusus Terang Pusat (T0 = 0), KSR ditampilkan "-" dan tidak dinilai.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-slate-300">
                      Pelajari tujuan modul di panel kiri, lalu tekan <strong>Selanjutnya</strong> untuk merangkai alat laboratorium.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // ──────────────────────────────────────────────────────────────────
        // TAHAP 2: SETUP (Rangkai Alat Prosedur 4.1)
        // ──────────────────────────────────────────────────────────────────
        if (ctx.state.currentStep === "SETUP") {
          return (
            <div className="w-full h-full p-4 lg:p-6 flex flex-col gap-5 overflow-y-auto bg-[#070b14] text-white">
              {/* Top Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
                <div>
                  <h2 className="text-lg font-bold font-mono text-cyan-400 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-cyan-400" />
                    Tahap 2: Rangkai Alat & Penyelarasan Optis (Prosedur 4.1)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Lakukan 5 langkah perakitan instrumen secara berurutan. Setiap langkah divalidasi langsung oleh sistem.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-slate-400">Status Perakitan:</span>
                  <span
                    className={`font-bold px-3 py-1 rounded-full border ${
                      allSetupDone
                        ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/50"
                        : "bg-amber-950/60 text-amber-300 border-amber-500/50"
                    }`}
                  >
                    {Object.values(setupChecklist).filter(Boolean).length} / 5 Selesai
                  </span>
                </div>
              </div>

              {/* Optical Bench Apparatus Live View */}
              <OpticalBenchApparatus
                slitKey="slit2"
                isLaserOn={laserOn && setupChecklist.laserPowerMax}
                onToggleLaser={() => {
                  setLaserOn((prev) => !prev);
                  if (!laserOn) {
                    setSetupChecklist((prev) => ({ ...prev, laserPowerMax: true }));
                  }
                }}
                dimmer={dimmer}
                onDimmerChange={(val) => {
                  setDimmer(val);
                  if (val >= 0.95 && laserOn) {
                    setSetupChecklist((prev) => ({ ...prev, laserPowerMax: true }));
                  }
                }}
                distanceL={distanceL}
              />

              {/* 5-Step Interactive Checklist */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  Daftar Periksa Prosedur Rangkai Alat (Prosedur 4.1)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Step 1 */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                      setupChecklist.componentsMounted
                        ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                        : "bg-slate-950/60 border-slate-800 text-slate-300"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>1. Pasang Komponen Rel</span>
                        {setupChecklist.componentsMounted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <span className="text-[10px] text-amber-400 font-mono">Belum</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Susun laser, dimmer, set celah putar, dan layar proyeksi pada rel optik aluminium.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSetupChecklist((prev) => ({ ...prev, componentsMounted: !prev.componentsMounted }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        setupChecklist.componentsMounted
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-blue-600 hover:bg-blue-500 text-white"
                      }`}
                    >
                      {setupChecklist.componentsMounted ? "Komponen Terpasang ✓" : "Pasang Komponen"}
                    </button>
                  </div>

                  {/* Step 2 */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                      setupChecklist.distanceSet
                        ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                        : "bg-slate-950/60 border-slate-800 text-slate-300"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>2. Jarak Celah-Layar L = 1,6 m</span>
                        {setupChecklist.distanceSet ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <span className="text-[10px] text-amber-400 font-mono">Belum</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Atur posisi layar pada rel presisi tepat 1,60 m (1600 mm) dari posisi celah.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDistanceL(1.6);
                        setSetupChecklist((prev) => ({ ...prev, distanceSet: true }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        setupChecklist.distanceSet
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-blue-600 hover:bg-blue-500 text-white"
                      }`}
                    >
                      {setupChecklist.distanceSet ? "Jarak Terkunci 1,6 m ✓" : "Atur L = 1,6 m"}
                    </button>
                  </div>

                  {/* Step 3 */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                      setupChecklist.laserPowerMax
                        ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                        : "bg-slate-950/60 border-slate-800 text-slate-300"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>3. Nyalakan Laser & Dimmer Maks</span>
                        {setupChecklist.laserPowerMax ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <span className="text-[10px] text-amber-400 font-mono">Belum</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Nyalakan adaptor catu daya laser dan atur potensiometer dimmer ke 100%.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLaserOn(true);
                        setDimmer(1.0);
                        setSetupChecklist((prev) => ({ ...prev, laserPowerMax: true }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        setupChecklist.laserPowerMax
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-rose-600 hover:bg-rose-500 text-white"
                      }`}
                    >
                      {setupChecklist.laserPowerMax ? "Laser Nyala Maksimum ✓" : "Nyalakan & Dimmer 100%"}
                    </button>
                  </div>

                  {/* Step 4 */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                      setupChecklist.laserAligned
                        ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                        : "bg-slate-950/60 border-slate-800 text-slate-300"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>4. Penjajaran Laser ke Celah</span>
                        {setupChecklist.laserAligned ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <span className="text-[10px] text-amber-400 font-mono">Belum</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Posisikan laser tegak lurus menembus tepat di tengah piringan celah set putar.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSetupChecklist((prev) => ({ ...prev, laserAligned: !prev.laserAligned }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        setupChecklist.laserAligned
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-blue-600 hover:bg-blue-500 text-white"
                      }`}
                    >
                      {setupChecklist.laserAligned ? "Berkas Terjajar Sempurna ✓" : "Sejajarkan Berkas"}
                    </button>
                  </div>

                  {/* Step 5 */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                      setupChecklist.screenPaperClipped
                        ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                        : "bg-slate-950/60 border-slate-800 text-slate-300"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>5. Pasang Kertas Milimeter Blok</span>
                        {setupChecklist.screenPaperClipped ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <span className="text-[10px] text-amber-400 font-mono">Belum</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Jepitkan kertas milimeter blok pada bidang tangkap layar sebagai referensi skala ukur.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSetupChecklist((prev) => ({ ...prev, screenPaperClipped: !prev.screenPaperClipped }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        setupChecklist.screenPaperClipped
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-blue-600 hover:bg-blue-500 text-white"
                      }`}
                    >
                      {setupChecklist.screenPaperClipped ? "Kertas Terjepit Rapi ✓" : "Jepitkan Kertas"}
                    </button>
                  </div>
                </div>

                {/* All Done Notification */}
                {allSetupDone && (
                  <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/60 flex items-center justify-between animate-fade-in text-xs font-mono">
                    <div className="flex items-center gap-2.5 text-emerald-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <strong>Seluruh prosedur perakitan 4.1 terpenuhi!</strong> Alat bangku optik telah siap untuk pengambilan data eksperimen.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        }

        // ──────────────────────────────────────────────────────────────────
        // TAHAP 3: SIMULATION (Eksperimen 3 Celah)
        // ──────────────────────────────────────────────────────────────────
        if (ctx.state.currentStep === "SIMULATION") {
          const currentSlit = SSG_SLIT_PRESETS[activeSlitKey];
          const currentMarkers = slitMarkers[activeSlitKey];

          return (
            <div className="w-full h-full p-4 lg:p-6 flex flex-col gap-5 overflow-y-auto bg-[#070b14] text-white">
              {/* Slit Selection Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 border border-cyan-500/20 p-2.5 rounded-2xl">
                <div className="flex items-center gap-2">
                  {SLIT_TABS.map((tab) => {
                    const isRecorded = recordedSlitData[tab.key] !== null;
                    const isActive = activeSlitKey === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                          setActiveSlitKey(tab.key);
                          setActiveTn(0);
                        }}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
                          isActive
                            ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.6)]"
                            : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                        }`}
                      >
                        {isRecorded ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : null}
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Progress count */}
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-slate-400">Progres Pengukuran:</span>
                  <span
                    className={`font-bold ${
                      allSlitsRecorded ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {Object.values(recordedSlitData).filter(Boolean).length} / 3 Celah Selesai
                  </span>
                </div>
              </div>

              {/* Success Notification Banner */}
              {copySuccessMessage && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl flex items-center gap-2 text-xs font-mono text-emerald-300 animate-slide-up">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{copySuccessMessage}</span>
                </div>
              )}

              {/* Locked Apparatus Parameters Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 px-4 py-2.5 rounded-xl text-xs font-mono">
                <div className="flex items-center gap-4 text-slate-300">
                  <span>
                    <strong className="text-cyan-400">λ:</strong> 632 nm
                  </span>
                  <span>
                    <strong className="text-purple-400">L:</strong> 1,60 m
                  </span>
                  <span>
                    <strong className="text-amber-400">a (lebar):</strong> {(currentSlit.a * 1e3).toFixed(2)} mm
                    {activeSlitKey !== "slit2" ? " (nilai alat)" : ""}
                  </span>
                  <span>
                    <strong className="text-emerald-400">d (jarak):</strong> {(currentSlit.d * 1e3).toFixed(2)} mm
                    {activeSlitKey !== "slit2" ? " (nilai alat)" : ""}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Parameter terkunci sesuai prosedur praktikum
                </div>
              </div>

              {/* Screen Pattern Projection View in Practicum Mode */}
              <ScreenPatternView
                mode="practicum"
                lambda={DEFAULT_LASER_WAVELENGTH}
                L={DEFAULT_SCREEN_DISTANCE_L}
                a={currentSlit.a}
                d={currentSlit.d}
                N={currentSlit.N}
                spanMm={12.0}
                dimmer={dimmer}
                exposure={exposure}
                onExposureChange={setExposure}
                markers={currentMarkers}
                activeMarkerTn={activeTn}
                onSelectMarker={setActiveTn}
                onMarkerChange={handleUpdateMarker}
                onResetMarkers={handleResetActiveMarkers}
                isZoomActive={zoomActive}
                onToggleZoom={() => setZoomActive((prev) => !prev)}
                onResetZoom={() => {}}
                showSecondaryHighlight={true}
              />

              {/* Virtual Ruler Marker Tool */}
              <VirtualRulerMarkerTool
                N={currentSlit.N}
                lambda={DEFAULT_LASER_WAVELENGTH}
                L={DEFAULT_SCREEN_DISTANCE_L}
                a={currentSlit.a}
                d={currentSlit.d}
                markers={currentMarkers}
                activeTn={activeTn}
                onSelectTn={setActiveTn}
                onUpdateMarker={handleUpdateMarker}
                onResetMarkers={handleResetActiveMarkers}
                onAutoAssistAll={handleAutoAssistAllMarkers}
                onApplyToTable={(measurements) => handleApplyToTable(ctx, measurements)}
                isZoomActive={zoomActive}
              />

              {/* Unlabeled Student Journal Sketch (Tahap 3 Step 5) */}
              <StudentSketchView markers={currentMarkers} slitKey={activeSlitKey} />

              {/* Note: IntensityProfileGraph BERLABEL is strictly hidden in Tahap 3 */}
            </div>
          );
        }

        // ──────────────────────────────────────────────────────────────────
        // TAHAP 4: ANALYSIS (Perhitungan Mandiri Tabel 11.1 - 11.3)
        // ──────────────────────────────────────────────────────────────────
        if (ctx.state.currentStep === "ANALYSIS") {
          const currentTab = SLIT_TABS.find((t) => t.key === activeCalcSlitKey) ?? SLIT_TABS[0];
          const calcRows = buildCalcRows(activeCalcSlitKey);
          const refTable = buildReferenceTableData(activeCalcSlitKey);

          return (
            <div className="w-full h-full p-4 lg:p-6 flex flex-col gap-6 overflow-y-auto bg-[#070b14] text-white">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
                <div>
                  <h2 className="text-lg font-bold font-mono text-cyan-400 flex items-center gap-2">
                    <Scale className="w-5 h-5 text-cyan-400" />
                    Tahap 4: Perhitungan Mandiri Siswa (Tabel 11.1, 11.2, 11.3)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Hitung nilai teoretis y_teori = [Tn / (N - 1)] · (λL / d) dan Kesalahan Relatif KSR%. Validasi toleransi ±2% dievaluasi terhadap nilai y_praktikum Anda sendiri.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {SLIT_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveCalcSlitKey(tab.key)}
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
                        activeCalcSlitKey === tab.key
                          ? "bg-cyan-600 text-white shadow-[0_0_12px_rgba(8,145,178,0.5)]"
                          : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                      }`}
                    >
                      {tab.tableNumber}
                    </button>
                  ))}
                </div>
              </div>

              {/* StudentCalculationTable Component */}
              <StudentCalculationTable
                title={currentTab.tableTitle}
                description="Lengkapi isian kolom y_teori dan KSR% untuk masing-masing titik terang T0 s/d T4. Khusus T0, KSR ditampilkan '-' dan tidak dinilai."
                columns={CALC_TABLE_COLUMNS}
                rows={calcRows}
                assistedCells={assistedCells}
                hasValidated={hasValidated[activeCalcSlitKey]}
                onCellChange={(rowId, colKey, val) => {
                  const tn = Number(rowId);
                  setStudentCalcValues((prev) => ({
                    ...prev,
                    [activeCalcSlitKey]: {
                      ...prev[activeCalcSlitKey],
                      [tn]: {
                        ...prev[activeCalcSlitKey][tn],
                        [colKey]: val,
                      },
                    },
                  }));
                  setAssistedCells((prev) => ({
                    ...prev,
                    [`${activeCalcSlitKey}_${rowId}_${colKey}`]: false,
                  }));
                }}
                onValidate={() =>
                  setHasValidated((prev) => ({ ...prev, [activeCalcSlitKey]: true }))
                }
                onAutoFillAssistance={() => handleAutoFillAssistance(activeCalcSlitKey)}
                referenceTable={refTable}
              />
            </div>
          );
        }

        // ──────────────────────────────────────────────────────────────────
        // TAHAP 5: QUESTIONS (Evaluasi & Kesimpulan)
        // ──────────────────────────────────────────────────────────────────
        if (ctx.state.currentStep === "QUESTIONS") {
          return (
            <div className="w-full h-full p-6 lg:p-10 flex flex-col items-center overflow-y-auto bg-[#070b14] text-white">
              <div className="w-full max-w-3xl space-y-6">
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-cyan-500/20">
                  <h2 className="text-lg font-bold font-mono text-cyan-300 flex items-center gap-2 mb-2">
                    <HelpCircle className="w-5 h-5 text-cyan-400" />
                    Tahap 5: Evaluasi & Penarikan Kesimpulan Ilmiah
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Jawab pertanyaan evaluasi di panel sebelah kiri menggunakan penalaran matematis dari persamaan y = (Tn/(N-1))·(λL/d). Manfaatkan kotak petunjuk progresif di bawah pertanyaan bila memerlukan bantuan.
                  </p>
                </div>
              </div>
            </div>
          );
        }

        // ──────────────────────────────────────────────────────────────────
        // TAHAP 6: REVIEW (Ringkasan Akhir & Analisis Fisika Lanjutan)
        // ──────────────────────────────────────────────────────────────────
        if (ctx.state.currentStep === "REVIEW") {
          return (
            <div className="w-full h-full p-4 lg:p-8 flex flex-col gap-6 overflow-y-auto bg-[#070b14] text-white">
              {/* Review Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
                <div>
                  <h2 className="text-xl font-bold font-mono text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    Laporan Akhir: Karakteristik Gelombang Cahaya pada Celah Majemuk
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ringkasan data pengukuran, profil intensitas Fraunhofer analitik, dan perbandingan teori.
                  </p>
                </div>
                <div className="bg-emerald-950/80 border border-emerald-500/50 px-4 py-1.5 rounded-xl text-right">
                  <div className="text-[10px] text-emerald-400 uppercase font-mono font-bold">Status Data</div>
                  <div className="text-sm font-bold text-emerald-300 font-mono">3 / 3 Celah Lengkap</div>
                </div>
              </div>

              {/* Labeled Intensity Profile Graph (Now explicitly allowed!) */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span>Profil Intensitas Fraunhofer Berlabel (Pembanding Analitik)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {SLIT_TABS.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveSlitKey(tab.key)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                          activeSlitKey === tab.key
                            ? "bg-purple-600 text-white"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <IntensityProfileGraph
                  lambda={DEFAULT_LASER_WAVELENGTH}
                  L={DEFAULT_SCREEN_DISTANCE_L}
                  a={SSG_SLIT_PRESETS[activeSlitKey].a}
                  d={SSG_SLIT_PRESETS[activeSlitKey].d}
                  N={SSG_SLIT_PRESETS[activeSlitKey].N}
                  spanMm={10.0}
                  showEnvelope={true}
                  showMinimaMarkers={true}
                  showPeakLabels={true}
                />
              </div>

              {/* Neutral Scientific Explanation Panel: Why N=5 Secondary Peak KSR is Larger */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/30 border border-indigo-500/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2.5 text-indigo-300 font-bold text-sm">
                  <Info className="w-5 h-5 text-indigo-400 shrink-0" />
                  <span>Catatan Fisika: Mengapa KSR Terang Sekunder N = 5 Lebih Besar?</span>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed space-y-2">
                  <p>
                    Pada Tabel 11.3 (Celah IIIII, N=5), praktikan mungkin mendapati nilai <strong>KSR terang sekunder (T1 dan T3)</strong> lebih besar dibandingkan terang lainnya. Hal ini <strong>bukan kesalahan pengukuran praktikan</strong>, melainkan disebabkan oleh perbedaan mendasar antara model pendekatan modul dan fisika gelombang nyata:
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-400 font-mono text-[11px]">
                    <li>
                      <strong className="text-slate-200">Model Rumus Modul:</strong> Mengasumsikan puncak-puncak sekunder membagi rata jarak antar terang utama secara linier: <span className="text-amber-300">y(T1, 5) = ¼·(λL/d) = 0,506 mm</span>.
                    </li>
                    <li>
                      <strong className="text-slate-200">Fisika Fraunhofer Nyata:</strong> Intensitas sesungguhnya merupakan perkalian faktor interferensi kisi dengan selubung difraksi celah tunggal: <span className="text-cyan-300">I(y) = sinc²(β) · [sin(Nα)/(N·sin α)]²</span>. Kemiringan selubung difraksi dan penyebut sin²(α) menggeser puncak sekunder fisik absolut ke arah luar sekitar <strong className="text-emerald-400">+81 µm pada T1 (y ≈ 0,587 mm)</strong> dan <strong className="text-emerald-400">-81 µm pada T3</strong>.
                    </li>
                  </ul>
                  <p className="text-[11px] text-slate-400 italic">
                    Pergeseran fisik ini membuktikan bahwa cahaya merambat dan berdifraksi secara kontinu sesuai optika gelombang Maxwell, bukan sekadar garis diskrit sederhana.
                  </p>
                </div>
              </div>

              {/* Comparison Table Reused from Explore */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                    <Scale className="w-4 h-4" />
                    <span>Perbandingan Nilai: Fraunhofer Sebenarnya vs Rumus Modul vs Pengukuran Praktikan</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Celah: {SSG_SLIT_PRESETS[activeSlitKey].name} (N = {SSG_SLIT_PRESETS[activeSlitKey].N})
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                        <th className="py-2 px-3">Titik Terang</th>
                        <th className="py-2 px-3">Jenis Puncak</th>
                        <th className="py-2 px-3">y_praktikum (Milik Anda)</th>
                        <th className="py-2 px-3">Rumus Modul y(Tn, N)</th>
                        <th className="py-2 px-3">Puncak Fraunhofer Nyata</th>
                        <th className="py-2 px-3 text-right">Pergeseran Fisik (|Δy|)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {[0, 1, 2, 3, 4].map((tn) => {
                        const slit = SSG_SLIT_PRESETS[activeSlitKey];
                        const isPrimary = tn === 0 || tn % (slit.N - 1) === 0;
                        const yPrak = recordedSlitData[activeSlitKey]?.[tn]?.toFixed(2) ?? "-";
                        const yModul =
                          estimatedPatternPosition(tn, slit.N, DEFAULT_LASER_WAVELENGTH, DEFAULT_SCREEN_DISTANCE_L, slit.d, slit.a) * 1e3;
                        const yExact =
                          tn === 0
                            ? 0
                            : findFraunhoferPeakNumerical(tn, slit.N, DEFAULT_LASER_WAVELENGTH, DEFAULT_SCREEN_DISTANCE_L, slit.d, slit.a);
                        const diffUm = Math.abs(yExact - yModul) * 1000;

                        return (
                          <tr key={tn} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-amber-300">T{tn}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-sans font-semibold uppercase ${
                                  tn === 0
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : isPrimary
                                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                    : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                }`}
                              >
                                {tn === 0 ? "Pusat" : isPrimary ? "Primer" : "Sekunder"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-white">{yPrak} mm</td>
                            <td className="py-2.5 px-3 text-amber-200">{yModul.toFixed(3)} mm</td>
                            <td className="py-2.5 px-3 text-cyan-200">{yExact.toFixed(4)} mm</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                              {diffUm < 0.5 ? "0.0 µm" : `±${diffUm.toFixed(1)} µm`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        }

        return null;
      }}
    />
  );
}
