"use client";

import React, { useMemo, useState } from "react";
import {
  DEFAULT_LASER_WAVELENGTH,
  DEFAULT_SCREEN_DISTANCE_L,
  SSG_SLIT_PRESETS,
  fraunhoferIntensity,
  fraunhoferMinimaPositions,
  findFraunhoferPeakContinuous,
  isPrimaryPattern,
} from "@/physics/waveOptics";
import { Activity, Info } from "lucide-react";

export interface IntensityProfileGraphProps {
  lambda?: number;
  L?: number;
  a?: number;
  d?: number;
  N?: number;
  spanMm?: number; // e.g. 10 or 12 mm
  showEnvelope?: boolean;
  showMinimaMarkers?: boolean;
  showPeakLabels?: boolean;
  className?: string;
}

/**
 * High-precision scientific night intensity profile graph I(y) / I_0 vs y (mm).
 * Renders the exact Fraunhofer multi-slit interference profile modulated by the
 * single-slit diffraction envelope, with distinct badges for primary peaks,
 * secondary peaks, and minima.
 */
export function IntensityProfileGraph({
  lambda = DEFAULT_LASER_WAVELENGTH,
  L = DEFAULT_SCREEN_DISTANCE_L,
  a = SSG_SLIT_PRESETS.slit2.a,
  d = SSG_SLIT_PRESETS.slit2.d,
  N = 2,
  spanMm = 10.0,
  showEnvelope = true,
  showMinimaMarkers = true,
  showPeakLabels = true,
  className = "",
}: IntensityProfileGraphProps) {
  const [hoverData, setHoverData] = useState<{ yMm: number; I: number; xPx: number; yPx: number } | null>(null);

  const graphW = 760;
  const graphH = 220;
  const padding = { top: 24, right: 24, bottom: 36, left: 54 };

  const plotW = graphW - padding.left - padding.right;
  const plotH = graphH - padding.top - padding.bottom;

  // Generate sample points for I(y) across [-spanMm, +spanMm]
  const { pathData, envelopePathData, peakPoints, minimaPoints } = useMemo(() => {
    const numSamples = 400;
    const points: [number, number][] = [];
    const envPoints: [number, number][] = [];

    const originX = padding.left + plotW / 2;
    const pxPerMm = (plotW / 2) / spanMm;

    for (let i = 0; i <= numSamples; i++) {
      const yMm = -spanMm + (i / numSamples) * (2 * spanMm);
      const yM = yMm * 1e-3;

      const I = fraunhoferIntensity(yM, lambda, L, a, d, N);
      const xPx = originX + yMm * pxPerMm;
      const yPx = padding.top + plotH * (1 - I);

      points.push([xPx, yPx]);

      // Envelope sinc^2(beta)
      const beta = (Math.PI * a * yM) / (lambda * L);
      const sinc = Math.abs(beta) < 1e-7 ? 1 - (beta * beta) / 6 : Math.sin(beta) / beta;
      const envI = Math.min(1, sinc * sinc);
      const envYPx = padding.top + plotH * (1 - envI);
      envPoints.push([xPx, envYPx]);
    }

    const pathData = points.reduce((acc, [x, y], idx) => {
      return idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, "");

    const envelopePathData = envPoints.reduce((acc, [x, y], idx) => {
      return idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, "");

    // Find prominent positive and negative peaks for labeling (T0 to T4)
    const peaks: { tn: number; yMm: number; I: number; xPx: number; yPx: number; isPrimary: boolean }[] = [];
    // Central peak T0
    peaks.push({
      tn: 0,
      yMm: 0,
      I: 1.0,
      xPx: originX,
      yPx: padding.top,
      isPrimary: true,
    });

    for (let tn = 1; tn <= 4; tn++) {
      const peakMeters = findFraunhoferPeakContinuous(tn, N, lambda, L, a, d);
      const peakMm = peakMeters * 1000;
      if (peakMm <= spanMm) {
        const I = fraunhoferIntensity(peakMeters, lambda, L, a, d, N);
        const xPx = originX + peakMm * pxPerMm;
        const yPx = padding.top + plotH * (1 - I);
        peaks.push({
          tn,
          yMm: peakMm,
          I,
          xPx,
          yPx,
          isPrimary: isPrimaryPattern(tn, N),
        });
      }
    }

    // Minima points (first few within spanMm)
    const rawMinima = fraunhoferMinimaPositions(16, lambda, L, d, N);
    const minima: { yMm: number; xPx: number; yPx: number }[] = [];

    rawMinima.forEach((yM) => {
      const yMm = yM * 1000;
      if (yMm <= spanMm) {
        const xPx = originX + yMm * pxPerMm;
        minima.push({
          yMm,
          xPx,
          yPx: padding.top + plotH,
        });
      }
    });

    return { pathData, envelopePathData, peakPoints: peaks, minimaPoints: minima };
  }, [lambda, L, a, d, N, spanMm, plotW, plotH, padding.left, padding.top]);

  // Handle mouse move to display (y, I) readout
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const originX = padding.left + plotW / 2;
    const pxPerMm = (plotW / 2) / spanMm;

    const yMm = (mouseX - originX) / pxPerMm;
    if (Math.abs(yMm) <= spanMm) {
      const yM = yMm * 1e-3;
      const I = fraunhoferIntensity(yM, lambda, L, a, d, N);
      const xPx = originX + yMm * pxPerMm;
      const yPx = padding.top + plotH * (1 - I);
      setHoverData({ yMm, I, xPx, yPx });
    }
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  // Ticks for axes
  const xTicks = useMemo(() => {
    const ticks: { valMm: number; xPx: number }[] = [];
    const originX = padding.left + plotW / 2;
    const pxPerMm = (plotW / 2) / spanMm;

    const step = spanMm >= 15 ? 5 : 2;
    for (let mm = -Math.floor(spanMm); mm <= Math.floor(spanMm); mm += step) {
      ticks.push({ valMm: mm, xPx: originX + mm * pxPerMm });
    }
    return ticks;
  }, [spanMm, plotW, padding.left]);

  const yTicks = [
    { val: 0.0, yPx: padding.top + plotH },
    { val: 0.25, yPx: padding.top + plotH * 0.75 },
    { val: 0.5, yPx: padding.top + plotH * 0.5 },
    { val: 0.75, yPx: padding.top + plotH * 0.25 },
    { val: 1.0, yPx: padding.top },
  ];

  return (
    <div className={`p-4 rounded-xl glass-panel border border-slate-800 flex flex-col gap-3 ${className}`}>
      {/* Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-100">Grafik Profil Intensitas Fraunhofer</h4>
            <p className="text-[11px] text-slate-400">
              Distribusi intensitas relatif I(y) / I₀ terhadap posisi layar y (mm)
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-rose-500 inline-block" />
            <span className="text-slate-300">Intensitas I(y)</span>
          </div>
          {showEnvelope && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-cyan-400/80 inline-block" />
              <span className="text-cyan-300">Selubung Difraksi sinc²(β)</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span className="text-amber-300">Puncak Primer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
            <span className="text-purple-300">Puncak Sekunder</span>
          </div>
        </div>
      </div>

      {/* Main SVG Graph */}
      <div className="relative w-full overflow-hidden bg-slate-950/80 rounded-lg border border-slate-800 select-none">
        <svg
          viewBox={`0 0 ${graphW} ${graphH}`}
          className="w-full h-auto block"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Subtle Grid Lines */}
          {yTicks.map((t) => (
            <g key={t.val}>
              <line
                x1={padding.left}
                y1={t.yPx}
                x2={graphW - padding.right}
                y2={t.yPx}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth={1}
              />
              <text
                x={padding.left - 8}
                y={t.yPx + 3}
                fill="rgba(255, 255, 255, 0.4)"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="end"
              >
                {t.val.toFixed(2)}
              </text>
            </g>
          ))}

          {xTicks.map((t) => (
            <g key={t.valMm}>
              <line
                x1={t.xPx}
                y1={padding.top}
                x2={t.xPx}
                y2={padding.top + plotH}
                stroke={t.valMm === 0 ? "rgba(6, 182, 212, 0.3)" : "rgba(255, 255, 255, 0.05)"}
                strokeWidth={t.valMm === 0 ? 1.5 : 1}
              />
              <text
                x={t.xPx}
                y={padding.top + plotH + 16}
                fill={t.valMm === 0 ? "#38bdf8" : "rgba(255, 255, 255, 0.4)"}
                fontSize="9"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {t.valMm}
              </text>
            </g>
          ))}

          {/* Axes Titles */}
          <text
            x={padding.left + plotW / 2}
            y={graphH - 6}
            fill="rgba(255, 255, 255, 0.6)"
            fontSize="10"
            fontFamily="monospace"
            textAnchor="middle"
          >
            Posisi Layar y (mm)
          </text>

          <text
            x={14}
            y={padding.top + plotH / 2}
            fill="rgba(255, 255, 255, 0.6)"
            fontSize="10"
            fontFamily="monospace"
            textAnchor="middle"
            transform={`rotate(-90, 14, ${padding.top + plotH / 2})`}
          >
            I / I₀
          </text>

          {/* Single Slit Diffraction Envelope sinc^2(beta) */}
          {showEnvelope && (
            <path
              d={envelopePathData}
              fill="none"
              stroke="#06b6d4"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              opacity={0.6}
            />
          )}

          {/* Fraunhofer Multi-slit Intensity Curve */}
          <path
            d={pathData}
            fill="none"
            stroke="#ef4444"
            strokeWidth={2}
            strokeLinecap="round"
          />

          {/* Fraunhofer Exact Minima Markers */}
          {showMinimaMarkers &&
            minimaPoints.map((m, idx) => (
              <circle
                key={`min-${idx}`}
                cx={m.xPx}
                cy={m.yPx}
                r={2}
                fill="#64748b"
                opacity={0.8}
              />
            ))}

          {/* Peak Points & Labels */}
          {showPeakLabels &&
            peakPoints.map((p) => (
              <g key={`peak-${p.tn}`}>
                {/* Vertical guideline */}
                <line
                  x1={p.xPx}
                  y1={p.yPx}
                  x2={p.xPx}
                  y2={padding.top + plotH}
                  stroke={p.isPrimary ? "rgba(245, 158, 11, 0.3)" : "rgba(168, 85, 247, 0.3)"}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />

                {/* Point dot */}
                <circle
                  cx={p.xPx}
                  cy={p.yPx}
                  r={p.isPrimary ? 3.5 : 2.5}
                  fill={p.isPrimary ? "#f59e0b" : "#c084fc"}
                  stroke="#020617"
                  strokeWidth={1.5}
                />

                {/* Peak Label */}
                <text
                  x={p.xPx}
                  y={p.yPx - 6}
                  fill={p.isPrimary ? "#fcd34d" : "#e9d5ff"}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  T{p.tn}
                </text>
              </g>
            ))}

          {/* Hover Crosshair & Tooltip */}
          {hoverData && (
            <g>
              <line
                x1={hoverData.xPx}
                y1={padding.top}
                x2={hoverData.xPx}
                y2={padding.top + plotH}
                stroke="#38bdf8"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <circle
                cx={hoverData.xPx}
                cy={hoverData.yPx}
                r={4}
                fill="#38bdf8"
                stroke="#020617"
                strokeWidth={2}
              />
            </g>
          )}
        </svg>

        {/* Hover Readout Tooltip */}
        {hoverData && (
          <div
            style={{
              left: `${(hoverData.xPx / graphW) * 100}%`,
              top: "10px",
            }}
            className="absolute -translate-x-1/2 pointer-events-none bg-slate-900/95 border border-cyan-500/50 px-2 py-1 rounded text-[11px] font-mono text-white shadow-lg flex items-center gap-2 z-20"
          >
            <span className="text-cyan-300">y: {hoverData.yMm >= 0 ? `+${hoverData.yMm.toFixed(2)}` : hoverData.yMm.toFixed(2)} mm</span>
            <span className="text-slate-400">|</span>
            <span className="text-rose-400">I/I₀: {hoverData.I.toFixed(3)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 italic">
        <Info className="w-3.5 h-3.5 text-slate-500" />
        <span>
          Garis putus-putus biru adalah selubung difraksi celah tunggal sinc²(β). Puncak primer termodulasi oleh selubung ini.
        </span>
      </div>
    </div>
  );
}
