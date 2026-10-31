"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { isWebGLAvailable } from "./webglUtils";
import { OpticalBenchApparatus } from "../OpticalBenchApparatus";
import { AlertTriangle, Box, Eye, Layers } from "lucide-react";
import type { CameraPreset } from "./OpticalBench3DScene";

// Dynamic import with SSR disabled to prevent server-side Canvas / WebGL crashes
const OpticalBench3DScene = dynamic(() => import("./OpticalBench3DScene"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 font-mono text-xs">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
        <span>Memuat Kanvas 3D Bangku Optik...</span>
      </div>
    </div>
  ),
});

export interface OpticalBench3DProps {
  lambdaNm?: number;
  N?: number;
  aMm?: number;
  dMm?: number;
  distanceL?: number;
  isLaserOn?: boolean;
  dimmer?: number;
  cameraPreset?: CameraPreset;
  onCameraPresetChange?: (preset: CameraPreset) => void;
  onFrameRendered?: () => void;
  className?: string;
  forceFallback2D?: boolean; // Useful for tests and simulating missing WebGL
}

/**
 * OpticalBench3D: Evaluated Spike Component.
 *
 * Wraps Three.js/R3F with runtime WebGL detection.
 * If WebGL is unavailable or the WebGL context is lost,
 * it seamlessly degrades to the established 2.5D OpticalBenchApparatus.
 */
export function OpticalBench3D({
  lambdaNm = 632.8,
  N = 2,
  aMm = 0.04,
  dMm = 0.5,
  distanceL = 1.6,
  isLaserOn = true,
  dimmer = 1.0,
  cameraPreset = "oblique",
  onCameraPresetChange,
  onFrameRendered,
  className = "",
  forceFallback2D = false,
}: OpticalBench3DProps) {
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null);
  const [contextLost, setContextLost] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<CameraPreset>(cameraPreset);

  useEffect(() => {
    setActivePreset(cameraPreset);
  }, [cameraPreset]);

  // Check WebGL availability on client mount
  useEffect(() => {
    if (forceFallback2D) {
      setHasWebGL(false);
      return;
    }
    const available = isWebGLAvailable();
    setHasWebGL(available);
  }, [forceFallback2D]);

  const handlePresetSelect = (preset: CameraPreset) => {
    setActivePreset(preset);
    onCameraPresetChange?.(preset);
  };

  const isFallbackNeeded = forceFallback2D || hasWebGL === false || contextLost;

  // ─── 2.5D Fallback Mode ─────────────────────────────────────────────────────
  if (isFallbackNeeded) {
    return (
      <div className={`flex flex-col gap-3 ${className}`}>
        <div
          role="status"
          className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs shadow-md"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            {forceFallback2D
              ? "Mode simulasi cadangan aktif: WebGL dinonaktifkan secara manual."
              : contextLost
              ? "Konteks WebGL terputus. Beralih otomatis ke Bangku Optik 2.5D."
              : "Akselerasi WebGL tidak didukung pada peramban ini. Menampilkan Bangku Optik 2.5D sebagai cadangan visual."}
          </span>
        </div>

        <OpticalBenchApparatus
          mode="explore"
          lambdaNm={lambdaNm}
          N={N}
          aMm={aMm}
          dMm={dMm}
          distanceL={distanceL}
          isLaserOn={isLaserOn}
          dimmer={dimmer}
        />
      </div>
    );
  }

  // ─── 3D R3F Interactive Scene ──────────────────────────────────────────────
  return (
    <div className={`flex flex-col gap-3 ${className}`} data-testid="optical-bench-3d-wrapper">
      {/* 3D View Toolbar: Camera Presets */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-200">Kamera 3D (Preset):</span>
        </div>

        <div className="flex items-center gap-1.5" role="group" aria-label="Pilihan Preset Kamera 3D">
          {(
            [
              { key: "oblique", label: "Serong (3/4)", icon: Eye },
              { key: "side", label: "Samping", icon: Layers },
              { key: "top", label: "Tampak Atas", icon: Box },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => handlePresetSelect(key)}
              aria-pressed={activePreset === key}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs border transition-all flex items-center gap-1.5 cursor-pointer ${
                activePreset === key
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-sm shadow-cyan-500/20"
                  : "bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3D Canvas Scene */}
      <OpticalBench3DScene
        lambdaNm={lambdaNm}
        N={N}
        aMm={aMm}
        dMm={dMm}
        distanceL={distanceL}
        isLaserOn={isLaserOn}
        dimmer={dimmer}
        cameraPreset={activePreset}
        onFrameRendered={onFrameRendered}
      />
    </div>
  );
}

export default OpticalBench3D;
