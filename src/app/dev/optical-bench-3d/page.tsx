"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { OpticalBench3D } from "@/components/practicum/instruments/wave/3d";
import type { CameraPreset } from "@/components/practicum/instruments/wave/3d";
import {
  DEFAULT_LASER_WAVELENGTH,
  DEFAULT_SCREEN_DISTANCE_L,
  wavelengthToHex,
  wavelengthToRgb,
} from "@/physics/waveOptics";
import {
  Activity,
  ArrowLeft,
  Box,
  Cpu,
  Layers,
  Power,
  RotateCcw,
  Sliders,
  Sparkles,
  Zap,
} from "lucide-react";

export default function OpticalBench3DDevPage() {
  // Physical parameters
  const [lambdaNm, setLambdaNm] = useState<number>(632);
  const [N, setN] = useState<number>(2);
  const [aMm, setAMm] = useState<number>(0.04);
  const [dMm, setDMm] = useState<number>(0.5);
  const [distanceL, setDistanceL] = useState<number>(1.6);
  const [isLaserOn, setIsLaserOn] = useState<boolean>(true);
  const [dimmer, setDimmer] = useState<number>(1.0);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("oblique");
  const [simulateNoWebGL, setSimulateNoWebGL] = useState<boolean>(false);

  // ─── Real Performance Measurement Metrics ─────────────────────────────────
  const [initialRenderTimeMs, setInitialRenderTimeMs] = useState<number | null>(null);
  const [totalRenderedFrames, setTotalRenderedFrames] = useState<number>(0);
  const [fps, setFps] = useState<number>(0);
  const mountStartRef = useRef<number>(performance.now());
  const frameTimesRef = useRef<number[]>([]);

  useEffect(() => {
    // Record initial client mount time
    const mountEnd = performance.now();
    setInitialRenderTimeMs(Math.round((mountEnd - mountStartRef.current) * 10) / 10);
  }, []);

  // Frame render callback fired by R3F invalidate()
  const handleFrameRendered = () => {
    const now = performance.now();
    setTotalRenderedFrames((prev) => prev + 1);

    frameTimesRef.current.push(now);
    // Keep timestamps from the last 1000ms
    frameTimesRef.current = frameTimesRef.current.filter((t) => now - t <= 1000);
    setFps(frameTimesRef.current.length);
  };

  const laserHex = wavelengthToHex(lambdaNm);
  const laserRgb = wavelengthToRgb(lambdaNm);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* ── Top Navigation Header ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between h-14 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <Link
            href="/dev/components"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dev</span>
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase">
              SPIKE EVALUATION
            </span>
            <h1 className="text-sm font-bold text-slate-100">
              Bangku Optik 3D (React Three Fiber)
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>frameloop="demand"</span>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Banner Notice */}
        <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Box className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <span className="font-bold">Eksperimen Kelayakan 3D (Spike):</span>{" "}
              Evaluasi Three.js &amp; R3F untuk Bangku Optik. Halaman produksi Explore &amp; Praktikum tidak disentuh.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSimulateNoWebGL((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border transition-all cursor-pointer ${
              simulateNoWebGL
                ? "bg-amber-500 text-black border-amber-400 shadow-md"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
            }`}
          >
            {simulateNoWebGL ? "Mode Cadangan 2.5D Aktif" : "Uji Cadangan (Matikan WebGL)"}
          </button>
        </div>

        {/* ── 3D Hero Apparatus ── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-2">
              <Box className="w-4 h-4 text-cyan-400" />
              <span>Bangku Optik 3D Interaktif</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              L = {distanceL.toFixed(2)} m · λ = {lambdaNm} nm · N = {N}
            </span>
          </div>

          <OpticalBench3D
            lambdaNm={lambdaNm}
            N={N}
            aMm={aMm}
            dMm={dMm}
            distanceL={distanceL}
            isLaserOn={isLaserOn}
            dimmer={dimmer}
            cameraPreset={cameraPreset}
            onCameraPresetChange={setCameraPreset}
            onFrameRendered={handleFrameRendered}
            forceFallback2D={simulateNoWebGL}
          />
        </div>

        {/* ── Interactive Parameter Controls & Live Telemetry ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Parameter Controls Panel (8 Cols) */}
          <div className="lg:col-span-8 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Uji Interaksi Parameter</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setLambdaNm(632);
                  setN(2);
                  setAMm(0.04);
                  setDMm(0.5);
                  setDistanceL(1.6);
                  setDimmer(1.0);
                  setIsLaserOn(true);
                  setCameraPreset("oblique");
                  setSimulateNoWebGL(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold cursor-pointer text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Reset Parameter</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Wavelength Slider */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Panjang Gelombang (λ)</span>
                  <span
                    className="font-mono font-bold px-2 py-0.5 rounded text-xs border"
                    style={{
                      backgroundColor: `rgba(${laserRgb}, 0.15)`,
                      borderColor: `rgba(${laserRgb}, 0.4)`,
                      color: laserHex,
                    }}
                  >
                    {lambdaNm} nm
                  </span>
                </div>
                <input
                  type="range"
                  min={400}
                  max={700}
                  step={1}
                  value={lambdaNm}
                  onChange={(e) => setLambdaNm(parseInt(e.target.value, 10))}
                  className="w-full cursor-pointer"
                  style={{ accentColor: laserHex }}
                />
              </div>

              {/* 2. Slit Distance L Slider */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Jarak Layar (L)</span>
                  <span className="font-mono font-bold px-2 py-0.5 rounded text-xs bg-slate-800 text-purple-300 border border-slate-700">
                    {distanceL.toFixed(2)} m
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={3.0}
                  step={0.05}
                  value={distanceL}
                  onChange={(e) => setDistanceL(parseFloat(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer"
                />
              </div>

              {/* 3. Number of Slits (N) */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Jumlah Celah (N)</span>
                  <span className="font-mono font-bold px-2 py-0.5 rounded text-xs bg-slate-800 text-amber-300 border border-slate-700">
                    N = {N}
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setN(num)}
                      className={`py-1 rounded font-mono font-bold text-xs border transition-all cursor-pointer ${
                        N === num
                          ? "bg-amber-500 text-black border-amber-300"
                          : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Laser Power & Dimmer */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Laser &amp; Dimmer</span>
                  <button
                    type="button"
                    onClick={() => setIsLaserOn((prev) => !prev)}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                      isLaserOn
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    <span>{isLaserOn ? "Aktif" : "Mati"}</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <input
                    type="range"
                    min={0.0}
                    max={1.0}
                    step={0.05}
                    value={dimmer}
                    onChange={(e) => setDimmer(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <span className="font-mono text-[11px] font-bold text-slate-300 w-8 text-right">
                    {Math.round(dimmer * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Real Telemetry & Performance Panel (4 Cols) */}
          <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5 text-slate-200 font-sans font-bold">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Telemetri &amp; Benchmark Nyata</span>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 font-sans">Waktu Render Awal:</span>
                <span className="text-emerald-400 font-bold">
                  {initialRenderTimeMs !== null ? `${initialRenderTimeMs} ms` : "Mengukur..."}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 font-sans">FPS Sesaat (Saat Geser):</span>
                <span className="text-cyan-300 font-bold">
                  {fps > 0 ? `${fps} FPS` : "0 FPS (Idle / Diam)"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 font-sans">Total Frame Dirender:</span>
                <span className="text-purple-300 font-bold">
                  {totalRenderedFrames} frames
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 font-sans">Status Render Loop:</span>
                <span className={`font-bold ${fps === 0 ? "text-emerald-400" : "text-amber-400"}`}>
                  {fps === 0 ? "0 loop (Idle Diam)" : "Aktif (Demand)"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 font-sans">Modus Kanvas:</span>
                <span className="text-slate-200 font-bold">
                  {simulateNoWebGL ? "2.5D Fallback" : "WebGL 3D (R3F)"}
                </span>
              </div>
            </div>

            <p className="text-[11px] font-sans text-slate-400 mt-1 leading-relaxed">
              * Dengan <code className="text-cyan-300">frameloop="demand"</code>, GPU tidak merender frame berulang kali saat tidak ada interaksi (frame count nol saat diam).
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
