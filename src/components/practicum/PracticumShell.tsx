"use client";

import React, { useState, useEffect } from "react";
import { PracticumConfig, PracticumStep } from "@/types/practicum";
import { usePracticumSession } from "@/hooks/usePracticumSession";
import { ArrowLeft, ChevronRight, CheckCircle2, RotateCcw, Play, Pause, ListTodo } from "lucide-react";
import Link from "next/link";
import { ExperimentTimer } from "./ExperimentTimer";
import { DataTable } from "./DataTable";
import { QuestionCard } from "./QuestionCard";

interface PracticumShellProps {
  config: PracticumConfig;
  simulationComponent: React.ReactNode;
  isNextDisabled?: boolean;
}

const STEPS: { id: PracticumStep; label: string }[] = [
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
  
  useEffect(() => {
    setMounted(true);
    // Auto-start timer on mount if not completed
    if (!state.isCompleted && state.currentStep !== "INTRO" && state.currentStep !== "REVIEW") {
      setIsTimerRunning(true);
    }
  }, [state.isCompleted, state.currentStep]);

  if (!mounted) return null; // Avoid hydration mismatch

  const stepIndex = STEPS.findIndex(s => s.id === state.currentStep);

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
          <button onClick={resetSession} className="flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors p-2">
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

            {state.currentStep === "QUESTIONS" && (
              <div className="animate-fade-in space-y-8">
                <h2 className="text-xl font-bold">Evaluasi</h2>
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
              disabled={stepIndex === STEPS.length - 1 || isNextDisabled}
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
              {simulationComponent}
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
