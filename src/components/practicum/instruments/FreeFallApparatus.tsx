"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { calculateFallTime } from "@/physics/freefall";
import { Activity } from "lucide-react";

// Animasi slow-mo pedagogis 1.5 detik
const ANIMATION_DURATION_MS = 1500;

// ── Skala & Koordinat ──────────────────────────────────────────────
// 1 mm = 1 px.  1 m = 1000 px.
const PX_PER_METER = 1000;
const TIANG_TOP_Y = 50;   // ujung atas tiang di SVG
const GROUND_Y = 1250;     // dasar tiang (pelat kontak)
// Tiang total: 1250 − 50 = 1200 px = 1.2 m

// Offset kosmetik: bola digambar sedikit di bawah magnet secara visual.
// Offset ini TIDAK mempengaruhi kalkulasi h — h selalu dari magnetY.
const BALL_VISUAL_OFFSET = 20;

interface FreeFallApparatusProps {
  className?: string;
  gLocal?: number; // Ground truth g, di-generate 1× di level PracticumShell
}

export function FreeFallApparatus({ className = "", gLocal = 9.79 }: FreeFallApparatusProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const reqRef = useRef<number>(null);

  // ── State ──
  const [magnetY, setMagnetY] = useState(250);       // koordinat SVG Y
  const [isDragging, setIsDragging] = useState(false);
  const [isMorsePressed, setIsMorsePressed] = useState(false);
  const [isFalling, setIsFalling] = useState(false);
  const [ballY, setBallY] = useState(250 + BALL_VISUAL_OFFSET);
  const [displayedTime, setDisplayedTime] = useState<number>(0);
  const [finalTime, setFinalTime] = useState<number | null>(null);

  // ── Konversi koordinat ──
  // Arrow pembaca di y=0 dalam grup magnet = magnetY dalam SVG.
  // Physics calc menggunakan magnetY. KEDUA TITIK INI IDENTIK.
  const pixelsToMeters = (svgY: number) =>
    Math.max(0, (GROUND_Y - svgY) / PX_PER_METER);

  // ── Magnet dragging ──
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isMorsePressed || isFalling) return; // kunci saat simulasi
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !svgRef.current) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());

    // Rentang magnet: h min ≈ 0.2 m (svgY=1050), h max ≈ 1.1 m (svgY=150)
    let newY = svgP.y;
    if (newY < 150) newY = 150;
    if (newY > 1050) newY = 1050;

    setMagnetY(newY);
    if (!isFalling && !isMorsePressed) {
      setBallY(newY + BALL_VISUAL_OFFSET);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsDragging(false);
    }
  };

  // ── Morse Key ──
  const handleMorsePress = () => {
    if (isDragging) return;
    setIsMorsePressed(true);
    setIsFalling(false);
    setBallY(magnetY + BALL_VISUAL_OFFSET); // bola menempel magnet
    setDisplayedTime(0);
    setFinalTime(null);
    if (reqRef.current) cancelAnimationFrame(reqRef.current);
  };

  const handleMorseRelease = useCallback(() => {
    if (!isMorsePressed) return;
    setIsMorsePressed(false);
    setIsFalling(true);

    // ┌──────────────────────────────────────────────────────────────┐
    // │  h dihitung dari magnetY — IDENTIK dengan posisi arrow.     │
    // │  Tidak ada offset. Tidak ada bias.                          │
    // └──────────────────────────────────────────────────────────────┘
    const h = pixelsToMeters(magnetY);
    const { t: actualTime } = calculateFallTime(h, gLocal, true);

    const ballStartY = magnetY + BALL_VISUAL_OFFSET;
    const ballEndY = GROUND_Y - 12; // sedikit di atas pelat kontak
    let startAnim: number | null = null;

    const animate = (timestamp: number) => {
      if (!startAnim) startAnim = timestamp;
      const progress = (timestamp - startAnim) / ANIMATION_DURATION_MS;

      if (progress >= 1) {
        setBallY(ballEndY);
        setDisplayedTime(actualTime);
        setFinalTime(actualTime);
        setIsFalling(false);
      } else {
        // Interpolasi kuadratik (progress²) meniru percepatan konstan
        const currentY =
          ballStartY + (ballEndY - ballStartY) * progress * progress;
        setBallY(currentY);
        setDisplayedTime(actualTime * progress);
        reqRef.current = requestAnimationFrame(animate);
      }
    };

    reqRef.current = requestAnimationFrame(animate);
  }, [isMorsePressed, magnetY, gLocal]);

  useEffect(() => {
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, []);

  // ── Skala tiang (di-memo karena 1201 elemen) ──
  const scaleTicks = React.useMemo(() => {
    const ticks: React.ReactNode[] = [];
    for (let mm = 0; mm <= 1200; mm++) {
      const y = GROUND_Y - mm; // 1 mm = 1 px

      const isTenCm = mm % 100 === 0;
      const isCm = mm % 10 === 0;
      const isFiveMm = mm % 5 === 0;

      let tickLen: number;
      let sw: number;
      let color: string;

      if (isTenCm) {
        tickLen = 20;
        sw = 2;
        color = "#334155";
      } else if (isCm) {
        tickLen = 10;
        sw = 1;
        color = "#475569";
      } else if (isFiveMm) {
        tickLen = 5;
        sw = 0.7;
        color = "#64748b";
      } else {
        tickLen = 2;
        sw = 0.5;
        color = "#94a3b8";
      }

      ticks.push(
        <line
          key={mm}
          x1={0}
          y1={y}
          x2={tickLen}
          y2={y}
          stroke={color}
          strokeWidth={sw}
        />
      );

      // Label setiap 10 cm
      if (isTenCm && mm > 0) {
        ticks.push(
          <text
            key={`lbl-${mm}`}
            x={-5}
            y={y + 4}
            fontSize="11"
            fontFamily="monospace"
            fill="#334155"
            textAnchor="end"
          >
            {mm / 10}
          </text>
        );
      }
    }
    return ticks;
  }, []);

  return (
    <div
      className={`relative w-full rounded-xl border border-white/10 bg-[#f5f7fa] overflow-hidden shadow-2xl flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="bg-[#111827] text-white p-4 flex justify-between items-center z-10 border-b border-white/20 shrink-0">
        <div>
          <h3 className="font-bold text-lg tracking-wide">
            ALAT GERAK JATUH BEBAS
          </h3>
          <p className="text-white/50 text-sm font-mono mt-1">
            TIANG BERSKALA (NST 1 MM) | SCALER COUNTER
          </p>
        </div>
      </div>

      <div className="flex-1 flex w-full relative">
        {/* ── SVG Area ── */}
        <div className="flex-1 h-full min-h-[700px] flex justify-center items-center p-4">
          <svg
            ref={svgRef}
            viewBox="0 0 400 1350"
            className="h-full w-auto select-none touch-none drop-shadow-xl"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <defs>
              <linearGradient
                id="ff-column-gradient"
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop offset="0%" stopColor="#cbd5e1" />
                <stop offset="50%" stopColor="#f8fafc" />
                <stop offset="100%" stopColor="#94a3b8" />
              </linearGradient>
            </defs>

            {/* Tiang Utama */}
            <rect
              x="185"
              y={TIANG_TOP_Y}
              width="30"
              height={GROUND_Y - TIANG_TOP_Y}
              fill="url(#ff-column-gradient)"
            />

            {/* Skala Tiang (di sebelah kiri tiang) */}
            <g transform="translate(185, 0)">{scaleTicks}</g>

            {/* Label satuan */}
            <text
              x="135"
              y={GROUND_Y + 45}
              fontSize="12"
              fontFamily="monospace"
              fill="#64748b"
              textAnchor="middle"
            >
              (cm)
            </text>

            {/* Pelat Kontak */}
            <rect
              x="145"
              y={GROUND_Y}
              width="110"
              height="20"
              fill="#334155"
              rx="2"
            />
            {/* Bantalan kuningan */}
            <rect
              x="165"
              y={GROUND_Y - 5}
              width="70"
              height="5"
              fill="#eab308"
            />

            {/* Alas / Base */}
            <rect
              x="120"
              y={GROUND_Y + 20}
              width="160"
              height="30"
              fill="#1e293b"
              rx="4"
            />

            {/* ── Elektromagnet Penempel ── */}
            <g
              transform={`translate(215, ${magnetY})`}
              className={
                isDragging
                  ? "cursor-grabbing"
                  : isMorsePressed || isFalling
                    ? "cursor-not-allowed"
                    : "cursor-grab"
              }
              onPointerDown={handlePointerDown}
            >
              <rect
                x="0"
                y="-15"
                width="80"
                height="30"
                fill="#1e293b"
                rx="4"
              />
              <rect x="-10" y="-5" width="10" height="10" fill="#0f172a" />
              {/* LED Indikator */}
              <circle
                cx="65"
                cy="0"
                r="4"
                fill={isMorsePressed ? "#22c55e" : "#ef4444"}
              />
              <text
                x="18"
                y="4"
                fontSize="9"
                fill="white"
                fontWeight="bold"
              >
                MAGNET
              </text>
              {/*
                Garis Pembaca Ketinggian — di y=0 relatif grup.
                Dalam koordinat SVG global ini = magnetY.
                Physics calc: pixelsToMeters(magnetY).
                → Arrow dan physics IDENTIK, nol bias.
              */}
              <line
                x1="-35"
                y1="0"
                x2="0"
                y2="0"
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
              <polygon points="-35,0 -25,-5 -25,5" fill="#ef4444" />
            </g>

            {/* Bola Logam */}
            <circle
              cx="200"
              cy={ballY}
              r="10"
              fill="#94a3b8"
              stroke="#475569"
              strokeWidth="2"
            />
          </svg>
        </div>

        {/* ── Right Panel: Elektronik & Kontrol ── */}
        <div className="w-64 bg-[#e2e8f0] border-l border-white/20 p-6 flex flex-col gap-8 shrink-0 relative shadow-inner z-10">
          {/* Kabel hiasan */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
            <path
              d="M 0 100 Q 100 150 120 200 T 250 300"
              fill="transparent"
              stroke="#1e293b"
              strokeWidth="4"
            />
            <path
              d="M 0 500 C 50 500 100 450 150 400 S 250 300 250 250"
              fill="transparent"
              stroke="#1e293b"
              strokeWidth="4"
            />
          </svg>

          {/* Scaler Counter */}
          <div className="bg-[#1e293b] rounded-xl p-4 shadow-lg flex flex-col gap-2 relative border border-[#0f172a]">
            <div className="flex justify-between items-center text-white/50 text-[10px] font-bold tracking-wider">
              <span>SCALER COUNTER</span>
              <Activity className="w-3 h-3 text-emerald-400" />
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
          </div>

          {/* Morse Key */}
          <div className="mt-4 flex flex-col items-center gap-3">
            <p className="text-sm font-semibold text-[#334155] text-center mb-2">
              MORSE KEY
            </p>

            <button
              onPointerDown={handleMorsePress}
              onPointerUp={handleMorseRelease}
              onPointerLeave={handleMorseRelease}
              className={`
                w-24 h-24 rounded-full relative outline-none select-none transition-all duration-75
                ${
                  isMorsePressed
                    ? "bg-slate-300 shadow-[inset_0_4px_10px_rgba(0,0,0,0.3)] translate-y-2"
                    : "bg-slate-100 shadow-[0_10px_20px_rgba(0,0,0,0.2),inset_0_-4px_10px_rgba(0,0,0,0.1)] hover:bg-white"
                }
              `}
              style={{ border: "8px solid #94a3b8" }}
            >
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/50 to-transparent pointer-events-none" />
            </button>
            <div className="text-[11px] text-center text-slate-500 font-medium px-4 leading-tight">
              Tahan (Klik Kiri) untuk mengaktifkan magnet. Lepas untuk
              menjatuhkan.
            </div>
          </div>

          {/* Feedback setelah drop */}
          {finalTime !== null && (
            <div className="mt-auto p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <p className="text-xs text-emerald-700 font-bold text-center">
                WAKTU TERCATAT
              </p>
              <p className="text-sm text-center text-emerald-600 font-mono mt-1">
                {finalTime.toFixed(3)} s
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
