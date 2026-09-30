"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { simulateOscillationTime } from "@/physics/momentOfInertia";
import { Activity } from "lucide-react";

interface TorsionalOscillatorProps {
  i0True: number;
  kappaTrue: number;
  className?: string;
}

export function TorsionalOscillator({ i0True, kappaTrue, className = "" }: TorsionalOscillatorProps) {
  const [angleDeg, setAngleDeg] = useState(0);
  const [isPulled, setIsPulled] = useState(false);
  const [isOscillating, setIsOscillating] = useState(false);
  const [displayedTime, setDisplayedTime] = useState<number>(0);
  const [finalTime, setFinalTime] = useState<number | null>(null);
  
  // Timer State
  const [mode, setMode] = useState<"CYCLE" | "TIMING">("CYCLE"); // We just keep CYCLE for UI
  const cyclesTarget = 5; // Fixed to 5 for Bagian B

  const reqRef = useRef<number>(null);

  const handlePull = () => {
    if (isOscillating) return;
    setIsPulled(true);
    setAngleDeg(90); // Simpangkan 90 derajat
    setDisplayedTime(0);
    setFinalTime(null);
  };

  const handleRelease = useCallback(() => {
    if (!isPulled || isOscillating) return;
    
    setIsPulled(false);
    setIsOscillating(true);
    setDisplayedTime(0);

    // Dapatkan ground truth time dari modul fisika untuk 5 getaran (plus noise eksperimen)
    const totalTimeSimulated = simulateOscillationTime(i0True, kappaTrue, cyclesTarget, true);
    
    // T0 = t_total / 5
    const T0 = totalTimeSimulated / cyclesTarget;
    // Frekuensi sudut (omega) untuk animasi kosmetik
    const omega = (2 * Math.PI) / T0; 

    let startAnim: number | null = null;
    const initialAngle = 90;

    const animate = (timestamp: number) => {
      if (!startAnim) startAnim = timestamp;
      const elapsedMs = timestamp - startAnim;
      const elapsedSec = elapsedMs / 1000;

      if (elapsedSec >= totalTimeSimulated) {
        // Berhenti setelah mencapai totalTimeSimulated (persis 5 getaran selesai di photogate)
        setAngleDeg(0); 
        setDisplayedTime(totalTimeSimulated);
        setFinalTime(totalTimeSimulated);
        setIsOscillating(false);
      } else {
        // Damped harmonic oscillator kosmetik
        // theta(t) = theta_0 * e^(-gamma * t) * cos(omega * t)
        // Kita redam tipis (gamma kecil, misal 0.05) agar terlihat realistis
        const gamma = 0.05;
        const damping = Math.exp(-gamma * elapsedSec);
        const currentAngle = initialAngle * damping * Math.cos(omega * elapsedSec);
        
        setAngleDeg(currentAngle);
        setDisplayedTime(elapsedSec);
        
        reqRef.current = requestAnimationFrame(animate);
      }
    };

    reqRef.current = requestAnimationFrame(animate);
  }, [isPulled, isOscillating, i0True, kappaTrue]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = () => {
    if (isOscillating) return;
    setDisplayedTime(0);
    setFinalTime(null);
    setAngleDeg(0);
    setIsPulled(false);
  };

  useEffect(() => {
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, []);

  return (
    <div className={`relative w-full rounded-xl border border-white/10 bg-[#f5f7fa] overflow-hidden shadow-2xl flex flex-col lg:flex-row ${className}`}>
      
      {/* ── Kiri: Visual Alat (Piringan & Gerbang Cahaya) ── */}
      <div className="flex-1 flex flex-col relative border-r border-slate-300">
        <div className="bg-[#111827] text-white p-4 flex justify-between items-center z-10 border-b border-white/20">
          <div>
            <h3 className="font-bold text-lg tracking-wide">ALAT MOMEN INERSIA (BAGIAN B)</h3>
            <p className="text-emerald-400 text-sm font-mono mt-1 font-bold">PIRINGAN KOSONG (TANPA BEBAN)</p>
          </div>
        </div>

        <div className="flex-1 min-h-[400px] flex justify-center items-center relative overflow-hidden">
          <svg viewBox="0 0 400 400" className="w-full h-full max-h-[500px] drop-shadow-xl select-none">
            {/* Tiang & Base */}
            <rect x="185" y="50" width="30" height="300" fill="#94a3b8" />
            <rect x="130" y="350" width="140" height="20" fill="#1e293b" rx="4" />
            
            {/* Gerbang Cahaya (Photogate) U-Shape di posisi sudut 0 (bawah) */}
            <g transform="translate(200, 310)">
              <path d="M -20 0 L -20 -30 L -10 -30 L -10 -10 L 10 -10 L 10 -30 L 20 -30 L 20 0 Z" fill="#0f172a" />
              {/* Sinar infra merah menyala jika sedang mengukur */}
              <line x1="-10" y1="-20" x2="10" y2="-20" stroke={isOscillating ? "#ef4444" : "#ef444455"} strokeWidth="2" strokeDasharray="2 2" />
              <text x="30" y="-15" fontSize="10" fill="#64748b" fontWeight="bold">PHOTOGATE</text>
            </g>

            {/* Susunan Piringan / Oscillator */}
            <g style={{ transform: `rotate(${angleDeg}deg)`, transformOrigin: "200px 200px" }}>
              {/* Piringan Utama */}
              <circle cx="200" cy="200" r="100" fill="#cbd5e1" stroke="#64748b" strokeWidth="4" />
              
              {/* Garis-garis pola di piringan agar terlihat berputar */}
              <line x1="200" y1="100" x2="200" y2="300" stroke="#94a3b8" strokeWidth="2" />
              <line x1="100" y1="200" x2="300" y2="200" stroke="#94a3b8" strokeWidth="2" />
              <circle cx="200" cy="200" r="80" fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="10 5" />
              
              {/* Batang penunjuk (Flag) yang akan memotong cahaya photogate */}
              <rect x="198" y="280" width="4" height="20" fill="#1e293b" />

              {/* Poros tengah */}
              <circle cx="200" cy="200" r="15" fill="#334155" />
              <circle cx="200" cy="200" r="5" fill="#0f172a" />
            </g>
          </svg>

          {/* Kontrol Manual Tarik Piringan */}
          <div className="absolute bottom-6 left-6 flex gap-3">
             <button
              onClick={handlePull}
              disabled={isOscillating || isPulled}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-400 text-white font-bold rounded-lg shadow-md transition-colors"
            >
              Simpangkan 90°
            </button>
            <button
              onClick={handleRelease}
              disabled={!isPulled || isOscillating}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white font-bold rounded-lg shadow-md transition-colors"
            >
              Lepas (Mulai)
            </button>
          </div>
        </div>
      </div>

      {/* ── Kanan: Panel Instrumen (Scaler Counter) ── */}
      <div className="w-full lg:w-72 bg-[#e2e8f0] p-6 flex flex-col gap-6 shrink-0 relative shadow-inner z-10 border-t lg:border-t-0 border-slate-300">
        
        {/* Scaler Counter Display */}
        <div className="bg-[#1e293b] rounded-xl p-4 shadow-lg flex flex-col gap-2 relative border border-[#0f172a]">
          <div className="flex justify-between items-center text-white/50 text-[10px] font-bold tracking-wider">
            <span>SCALER TIMER</span>
            <Activity className={`w-3 h-3 ${isOscillating ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
          </div>
          
          <div className="flex gap-2 items-center mb-1">
            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
              MODE: {mode}
            </span>
            <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
              N = {cyclesTarget}
            </span>
          </div>

          <div className="bg-black rounded border-2 border-[#0f172a] p-3 shadow-inner relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc0JyBoZWlnaHQ9JzQnPjxyZWN0IHdpZHRoPSc0JyBoZWlnaHQ9JzInIGZpbGw9JyMxMTEnLz48L3N2Zz4=')] opacity-50 mix-blend-overlay" />
            <div
              className="font-mono text-4xl text-right text-red-500 font-bold tracking-widest"
              style={{ textShadow: "0 0 10px rgba(239,68,68,0.5)" }}
            >
              {displayedTime.toFixed(3)}
            </div>
          </div>
          <div className="text-right text-white/40 text-[10px] font-bold">
            SECONDS (s)
          </div>

          {/* Buttons on Counter */}
          <div className="flex justify-between mt-3 gap-2">
            <button 
              onClick={handleReset}
              disabled={isOscillating}
              className="flex-1 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 disabled:opacity-50 text-white text-[10px] font-bold py-1.5 rounded border-b-2 border-slate-900 active:border-t-2 active:border-b-0 transition-all"
            >
              FUNCTION (RESET)
            </button>
            <button 
              disabled={true} // Fixed to 5
              className="flex-1 bg-slate-700 opacity-50 text-white text-[10px] font-bold py-1.5 rounded border-b-2 border-slate-900 cursor-not-allowed"
            >
              CH.OVER (5 GET)
            </button>
          </div>
        </div>

        {/* Feedback / Instructions */}
        <div className="mt-auto p-4 bg-white/50 border border-slate-300 rounded-lg">
          <h4 className="text-xs font-bold text-slate-700 mb-1">Instruksi Bagian B:</h4>
          <ol className="text-[11px] text-slate-600 space-y-1 list-decimal pl-4">
            <li>Simpangkan piringan 90°.</li>
            <li>Lepas untuk memulai osilasi.</li>
            <li>Timer otomatis berhenti setelah {cyclesTarget} getaran.</li>
            <li>Catat waktu, lalu tekan FUNCTION untuk reset. Ulangi 5x.</li>
          </ol>
        </div>

        {finalTime !== null && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg animate-fade-in">
            <p className="text-xs text-emerald-700 font-bold text-center">WAKTU TERCATAT (5 GETARAN)</p>
            <p className="text-lg text-center text-emerald-600 font-mono mt-1 font-bold">
              {finalTime.toFixed(3)} s
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
