"use client";

import React, { useState, useEffect } from "react";
import { PracticumConfig, PracticumState, PracticumStep } from "@/types/practicum";
import { usePracticumSession } from "@/hooks/usePracticumSession";
import { ArrowLeft, ChevronRight, CheckCircle2, RotateCcw, Play, Pause, ListTodo } from "lucide-react";
import Link from "next/link";
import { ExperimentTimer } from "./ExperimentTimer";
import { DataTable } from "./DataTable";
import { QuestionCard } from "./QuestionCard";
import { calculateLinearRegression, LinearRegressionResult } from "@/physics/regression";
import { LineGraph } from "@/components/simulation/LineGraph";
import { HintBox } from "./HintBox";

/**
 * Context passed to render-prop simulation components so they can read and
 * write the SAME session instance the shell uses (separate hook instances do
 * not stay in sync).
 */
export interface PracticumShellContext {
  state: PracticumState;
  addDataRow: (row: Record<string, string | number>) => void;
  /** Replace all recorded rows (e.g. to update student entries in an existing row). */
  setRecordedData: (rows: Record<string, string | number>[]) => void;
  /** Increments every time the user presses the shell's Reset button. */
  resetCount: number;
}

interface PracticumShellProps {
  config: PracticumConfig;
  /** A node, or a render function receiving the live session context. */
  simulationComponent: React.ReactNode | ((ctx: PracticumShellContext) => React.ReactNode);
  /** A static flag, or a predicate evaluated against the live session state. */
  isNextDisabled?: boolean | ((state: PracticumState) => boolean);
}

const BASE_STEPS: { id: PracticumStep; label: string }[] = [
  { id: "INTRO", label: "Baca Tujuan" },
  { id: "SETUP", label: "Atur Percobaan" },
  { id: "SIMULATION", label: "Jalankan & Catat Data" },
  { id: "QUESTIONS", label: "Jawab Pertanyaan" },
  { id: "REVIEW", label: "Tinjau Hasil" },
];

export function PracticumShell({ config, simulationComponent, isNextDisabled = false }: PracticumShellProps) {
  const { state, setStep, updateElapsedMs, addDataRow, setRecordedData, setAnswer, completePracticum, resetSession } = usePracticumSession(config.id);
  const [mounted, setMounted] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [resetCount, setResetCount] = useState(0);

  // Determine active steps based on config
  const STEPS = React.useMemo(() => {
    if (!config.analysis) return BASE_STEPS;
    const steps = [...BASE_STEPS];
    steps.splice(3, 0, { id: "ANALYSIS", label: "Analisis Data" });
    return steps;
  }, [config.analysis]);

  // Analysis state
  const [xCol, setXCol] = useState(config.analysis?.xColumn || "");
  const [yCol, setYCol] = useState(config.analysis?.yColumn || "");

  // Update cols if config changes
  useEffect(() => {
    if (config.analysis) {
      setXCol(config.analysis.xColumn);
      setYCol(config.analysis.yColumn);
    }
  }, [config.analysis]);

  const analysisData = React.useMemo(() => {
    if (!config.analysis || !xCol || !yCol) return null;
    const points = state.recordedData
      .map(row => ({
        x: Number(row[xCol]),
        y: Number(row[yCol])
      }))
      .filter(p => !isNaN(p.x) && !isNaN(p.y))
      // LineGraph derives its x-range from the first/last point, so sort by x.
      // Regression results are order-independent.
      .sort((p, q) => p.x - q.x);
    
    let regression: LinearRegressionResult | null = null;
    let error = "";
    if (points.length >= 3) {
      try {
        regression = calculateLinearRegression(points);
      } catch (err: any) {
        error = err.message;
      }
    }
    return { points, regression, error };
  }, [state.recordedData, config.analysis, xCol, yCol]);
  
  useEffect(() => {
    setMounted(true);
    // Auto-start timer on mount if not completed
    if (!state.isCompleted && state.currentStep !== "INTRO" && state.currentStep !== "REVIEW") {
      setIsTimerRunning(true);
    }
  }, [state.isCompleted, state.currentStep]);

  if (!mounted) return null; // Avoid hydration mismatch

  const stepIndex = STEPS.findIndex(s => s.id === state.currentStep);
  const nextDisabled = typeof isNextDisabled === "function" ? isNextDisabled(state) : isNextDisabled;
  const showHints =
    !!config.hints && config.hints.length > 0 &&
    (state.currentStep === "SIMULATION" || state.currentStep === "ANALYSIS" || state.currentStep === "QUESTIONS");

  const handleReset = () => {
    resetSession();
    setResetCount(c => c + 1);
  };

  const handleNextStep = () => {
    if (stepIndex < STEPS.length - 1) {
      if (STEPS[stepIndex + 1].id === "REVIEW") {
        completePracticum();
      } else {
        setStep(STEPS[stepIndex + 1].id);
      }
    }
  };

  const handlePrevStep = () => {
    if (stepIndex > 0) {
      setStep(STEPS[stepIndex - 1].id);
    }
  };

  const handleAddData = (row: Record<string, string|number>) => {
    addDataRow(row);
  };

  return (
    <div className="min-h-screen bg-[#06080D] text-white flex flex-col font-sans overflow-hidden">
      
      {/* HEADER */}
      <header className="h-16 border-b border-white/10 flex items-center px-6 justify-between shrink-0 bg-white/[0.02] backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">{config.title}</h1>
            <p className="text-xs text-white/50">{config.category}</p>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="hidden md:flex items-center gap-2">
          {STEPS.map((s, i) => {
            const isActive = i === stepIndex;
            const isPast = i < stepIndex;
            return (
              <React.Fragment key={s.id}>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors
                  ${isActive ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : 
                    isPast ? "text-emerald-400" : "text-white/30"}`}
                >
                  {isPast ? <CheckCircle2 className="w-3 h-3" /> : <span>{i + 1}</span>}
                  <span className="hidden lg:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`w-4 h-[1px] ${isPast ? "bg-emerald-400/50" : "bg-white/10"}`} />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          <button onClick={handleReset} className="flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors p-2">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT PANEL: Instructions & Questions */}
        <div className="w-[400px] border-r border-white/10 bg-white/[0.01] flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          
          <div className="p-6 flex-1 flex flex-col gap-8">
            {state.currentStep === "INTRO" && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold mb-4">Pengantar</h2>
                <p className="text-white/70 leading-relaxed mb-8">{config.introduction}</p>
                <h3 className="font-semibold text-blue-400 mb-3">Tujuan Praktikum:</h3>
                <ul className="space-y-3">
                  {config.objectives.map((obj, i) => (
                    <li key={i} className="flex gap-3 text-white/80">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                      <span className="leading-relaxed">{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(state.currentStep === "SETUP" || state.currentStep === "SIMULATION") && (
              <div className="animate-fade-in flex flex-col gap-6">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5">
                  <h3 className="font-semibold text-blue-400 mb-4 flex items-center gap-2">
                    <ListTodo className="w-4 h-4" /> Instruksi
                  </h3>
                  <ol className="space-y-4">
                    {config.instructions.map((inst, i) => (
                      <li key={i} className="flex gap-3 text-sm text-white/80">
                        <span className="font-bold text-white/40">{i+1}.</span>
                        <span>{inst}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                
                {state.currentStep === "SIMULATION" && (
                   <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5">
                     <p className="text-sm text-amber-200/80">
                       Lakukan simulasi pada alat di samping dan catat hasilnya langsung ke tabel pengamatan di kanan bawah.
                     </p>
                   </div>
                )}
                
                <div className="w-full shadow-lg">
                  <ExperimentTimer 
                    recommendedDurationSec={config.recommendedDurationSec}
                    onTick={() => {}}
                  />
                </div>
              </div>
            )}

            {state.currentStep === "ANALYSIS" && config.analysis && (
              <div className="animate-fade-in flex flex-col gap-6">
                <h2 className="text-xl font-bold">Analisis Data</h2>
                
                {config.analysis.allowSwitching && (
                  <div className="flex gap-4 mb-2">
                    <label className="flex flex-col gap-1 text-sm text-white/70">
                      Sumbu X:
                      <select 
                        value={xCol} 
                        onChange={(e) => setXCol(e.target.value)}
                        className="bg-white/10 border border-white/20 rounded p-1 text-white"
                      >
                        {config.columns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-white/70">
                      Sumbu Y:
                      <select 
                        value={yCol} 
                        onChange={(e) => setYCol(e.target.value)}
                        className="bg-white/10 border border-white/20 rounded p-1 text-white"
                      >
                        {config.columns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </label>
                  </div>
                )}

                <div className="bg-[#11182A] border border-white/10 rounded-xl p-4 min-h-[300px]">
                  {analysisData && analysisData.points.length > 0 ? (
                    <LineGraph 
                      data={analysisData.points.map(p => ({ t: p.x, val: p.y }))}
                      width={350}
                      height={250}
                      xLabel={config.columns.find(c => c.key === xCol)?.label || config.analysis.xLabel}
                      yLabel={config.columns.find(c => c.key === yCol)?.label || config.analysis.yLabel}
                      drawPoints={true}
                      drawLine={false}
                      regressionLine={
                        config.analysis.showRegression && analysisData.regression 
                          ? { slope: analysisData.regression.b, intercept: analysisData.regression.a } 
                          : undefined
                      }
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-white/50 text-sm text-center">
                      Belum ada data untuk dianalisis.<br/>Kembali ke langkah sebelumnya untuk mencatat data.
                    </div>
                  )}
                </div>

                {config.analysis.showRegression && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-2">
                    <h3 className="font-semibold text-blue-400 text-sm">Hasil Regresi Linear (y = a + bx)</h3>
                    {analysisData && analysisData.points.length < 3 ? (
                      <p className="text-sm text-white/60">Dibutuhkan minimal 3 titik data untuk menampilkan regresi.</p>
                    ) : analysisData?.error ? (
                      <p className="text-sm text-red-400">{analysisData.error}</p>
                    ) : analysisData?.regression ? (
                      <div className="grid grid-cols-2 gap-4 font-mono text-sm text-white/90">
                        <div>
                          <span className="text-white/50">Slope (b):</span><br/>
                          {analysisData.regression.b.toPrecision(4)} ± {analysisData.regression.deltaB.toPrecision(2)}
                        </div>
                        <div>
                          <span className="text-white/50">Intercept (a):</span><br/>
                          {analysisData.regression.a.toPrecision(4)} ± {analysisData.regression.deltaA.toPrecision(2)}
                        </div>
                        <div>
                          <span className="text-white/50">R²:</span><br/>
                          {analysisData.regression.r2.toFixed(4)}
                        </div>
                        <div>
                          <span className="text-white/50">Ketelitian (TK):</span><br/>
                          {analysisData.regression.tk.toFixed(2)}%
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {state.currentStep === "QUESTIONS" && (
              <div className="animate-fade-in space-y-8">
                <h2 className="text-xl font-bold">Evaluasi</h2>
                
                {/* Referensi Hasil Analisis untuk menjawab soal */}
                {config.analysis && config.analysis.showRegression && analysisData?.regression && (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4 font-mono text-xs text-white/70 mb-4 shadow-inner">
                    <div className="font-bold text-white/90 mb-2 font-sans">Referensi Analisis Anda:</div>
                    Slope (b): {analysisData.regression.b.toPrecision(4)}<br/>
                    Intercept (a): {analysisData.regression.a.toPrecision(4)}
                  </div>
                )}

                {config.questions.map((q, i) => (
                  <QuestionCard 
                    key={q.id}
                    questionNumber={i + 1}
                    question={q}
                    onAnswerChange={(qid, result) => setAnswer(qid, result)}
                  />
                ))}
              </div>
            )}

            {state.currentStep === "REVIEW" && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold mb-6 text-emerald-400">Praktikum Selesai!</h2>
                <div className="space-y-4 text-white/70">
                  <p>Anda telah menyelesaikan semua langkah praktikum.</p>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-sm mb-1 text-white/50">Total Data Dicatat:</p>
                    <p className="text-xl font-bold text-white">{state.recordedData.length} baris</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-sm mb-1 text-white/50">Pertanyaan Terjawab:</p>
                    <p className="text-xl font-bold text-white">
                      {Object.keys(state.answers).length} / {config.questions.length}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Progressive hints (fixed slot so revealed hints persist across steps) */}
            {showHints && <HintBox key={resetCount} hints={config.hints!} />}
          </div>

          {/* Nav Buttons */}
          <div className="p-6 border-t border-white/10 bg-white/[0.02] flex justify-between shrink-0">
            <button 
              onClick={handlePrevStep}
              disabled={stepIndex === 0}
              className="px-4 py-2 text-sm font-semibold text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Sebelumnya
            </button>
            <button 
              onClick={handleNextStep}
              disabled={stepIndex === STEPS.length - 1 || nextDisabled}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(37,99,235,0.3)]"
            >
              Selanjutnya <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: Simulation & Data */}
        <div className="flex-1 flex flex-col relative bg-[#0B1020]">
          {/* SIMULATION AREA */}
          <div className="flex-1 overflow-y-auto">
            {/* The simulation component is rendered in normal flow so vertical scroll works */}
            <div className="min-h-full w-full pointer-events-auto">
              {typeof simulationComponent === "function"
                ? simulationComponent({ state, addDataRow, setRecordedData, resetCount })
                : simulationComponent}
            </div>
            
          </div>

          {/* DATA TABLE AREA (Only visible in SIMULATION step or REVIEW step) */}
          {(state.currentStep === "SIMULATION" || state.currentStep === "REVIEW") && (
             <div className="h-[300px] border-t border-white/10 bg-[#11182A] p-4 flex flex-col shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-20 animate-slide-up">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-white/90">Tabel Pengamatan</h3>
                 {state.currentStep === "SIMULATION" && (
                   <button 
                     onClick={() => {
                        const emptyRow: Record<string, string> = {};
                        config.columns.forEach(c => emptyRow[c.key] = "");
                        handleAddData(emptyRow);
                     }}
                     className="px-4 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded-md text-sm font-semibold hover:bg-blue-500/30 transition-colors"
                   >
                     + Tambah Baris
                   </button>
                 )}
               </div>
               <div className="flex-1 overflow-auto rounded-lg border border-white/10">
                 <DataTable 
                   columns={config.columns.map(c => ({
                     key: c.key,
                     header: c.label,
                     unit: c.unit,
                   }))}
                   rows={state.recordedData}
                   onRowsChange={(newRows) => {
                     // Since DataTable allows adding, editing, and deleting, we sync the whole array back
                     setRecordedData(newRows as Record<string, string | number>[]);
                   }}
                   newRowFactory={() => {
                     // For manual "Tambah Baris" button
                     const emptyRow: any = {};
                     config.columns.forEach(c => emptyRow[c.key] = "");
                     return emptyRow;
                   }}
                 />
               </div>
             </div>
          )}
        </div>

      </div>
    </div>
  );
}
