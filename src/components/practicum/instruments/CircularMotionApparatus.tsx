"use client";

import React, { useMemo, useState, useRef } from "react";
import { ClipboardPlus, Info, Disc3 } from "lucide-react";
import { useSimulationLoop } from "@/physics/hooks/useSimulationLoop";
import {
  TWO_PI,
  circularMotionModel,
  computeSnapshot,
  deriveFromMeasurement,
  isStopNearTarget,
  CircularMotionParams,
  getCircularMotionVectors,
} from "@/physics/circularMotion";
import { worldToSvg } from "@/components/simulation/svgGeometry";
import { SimulationContainer } from "@/components/simulation/SimulationContainer";
import { UniformCircularMotionView, UCM_COLORS } from "@/components/simulation/UniformCircularMotionView";
import { ReadoutPanel, formatReadout } from "@/components/simulation/ReadoutPanel";
import { ParameterSlider, NumberInput } from "@/components/ui/NumberInput";
import {
  VectorItem,
  VectorControls,
  VectorCategoryConfig,
  SCIENTIFIC_THEME,
} from "@/components/simulation/visual";

export const GMB_MOTOR_PERIOD = 1.6;
export const GMB_MOTOR_OMEGA = TWO_PI / GMB_MOTOR_PERIOD;

const R_MIN = 0.2;
const R_MAX = 1.0;
const N_MIN = 1;
const N_MAX = 20;
const STOP_TOLERANCE_REV = 0.25;

const round = (value: number, digits: number) => Number(value.toFixed(digits));

interface CircularMotionApparatusProps {
  mode?: "practicum" | "explore";
  onRecord?: (data: any) => void;
  recordedDataCount?: number;
  isDataStep?: boolean;
  isVectorLocked?: boolean;
}

export function CircularMotionApparatus({
  mode = "practicum",
  onRecord,
  recordedDataCount = 0,
  isDataStep = true,
  isVectorLocked,
}: CircularMotionApparatusProps) {
  const [r, setR] = useState(0.5);
  const [targetN, setTargetN] = useState(5);
  const [omega, setOmega] = useState(GMB_MOTOR_OMEGA);
  const [theta0, setTheta0] = useState(0);

  const [lastRecordedTime, setLastRecordedTime] = useState<number | null>(null);

  // ── Vector Overlay State (Tahap J) ──
  const [vectorState, setVectorState] = useState({
    showVelocity: true,
    showAcceleration: true,
    showCentripetalForce: true,
    arrowScale: 1.0,
    showValues: true,
  });

  const isVectorLockedEffective = mode === "practicum" ? (isVectorLocked ?? (recordedDataCount === 0)) : false;
  const vectorLockMessage = "Vektor kualitatif terkunci. Silakan catat minimal 1 data percobaan pada tabel atau buka Petunjuk Level 3 untuk membukanya.";

  const actualOmega = mode === "practicum" ? GMB_MOTOR_OMEGA : omega;
  const actualTheta0 = mode === "practicum" ? 0 : theta0;

  const params = useMemo<CircularMotionParams>(
    () => ({ r, omega: actualOmega, theta0: actualTheta0 }),
    [r, actualOmega, actualTheta0]
  );

  const sim = useSimulationLoop(circularMotionModel, params);
  const snapshot = computeSnapshot(params, sim.time);

  const localGmbVectors = useMemo(() => {
    const speed = Math.abs(actualOmega) * r;
    const acMag = actualOmega * actualOmega * r;
    const FcMag = 0.20 * acMag;
    return { speed, acMag, FcMag };
  }, [r, actualOmega]);

  const viewTransform = useMemo(() => ({
    originX: 520 / 2,
    originY: 520 / 2,
    scale: 195 / Math.max(R_MAX, 1e-6),
  }), []);

  const vectorCategories: VectorCategoryConfig[] = [
    {
      id: "velocity",
      label: "Kecepatan Tangensial",
      color: SCIENTIFIC_THEME.vectors.velocity,
      checked: vectorState.showVelocity,
      title: "Tampilkan vektor kecepatan tangensial (v)",
    },
    {
      id: "acceleration",
      label: "Percepatan Sentripetal",
      color: SCIENTIFIC_THEME.vectors.acceleration,
      checked: vectorState.showAcceleration,
      title: "Tampilkan vektor percepatan sentripetal (ac)",
    },
    {
      id: "force",
      label: "Gaya Sentripetal",
      color: SCIENTIFIC_THEME.vectors.force,
      dashed: true,
      checked: vectorState.showCentripetalForce,
      title: "Tampilkan vektor gaya sentripetal (Fc = m ac)",
    },
  ];

  const handleToggleCategory = (catId: string) => {
    if (isVectorLockedEffective) return;
    if (catId === "velocity") setVectorState((s) => ({ ...s, showVelocity: !s.showVelocity }));
    else if (catId === "acceleration") setVectorState((s) => ({ ...s, showAcceleration: !s.showAcceleration }));
    else if (catId === "force") setVectorState((s) => ({ ...s, showCentripetalForce: !s.showCentripetalForce }));
  };

  const showValuesInOverlay = mode === "explore" && vectorState.showValues;

  // Memoized vector items anchored to turntable guide arm coordinates.
  // Completely static across animation frames — zero React re-render overhead during spinning!
  const vectorItems = useMemo<VectorItem[]>(() => {
    const items: VectorItem[] = [];
    const localOrigin = {
      x: viewTransform.originX + r * viewTransform.scale,
      y: viewTransform.originY,
    };

    if (vectorState.showVelocity && localGmbVectors.speed > 1e-4) {
      items.push({
        id: "v",
        category: "velocity",
        label: "v",
        origin: localOrigin,
        components: { dx: 0, dy: actualOmega >= 0 ? -localGmbVectors.speed : localGmbVectors.speed },
        color: SCIENTIFIC_THEME.vectors.velocity,
        scale: 35,
        showValue: showValuesInOverlay,
        valueText: `${localGmbVectors.speed.toFixed(2)} m/s`,
      });
    }

    if (vectorState.showAcceleration && localGmbVectors.acMag > 1e-4) {
      items.push({
        id: "ac",
        category: "acceleration",
        label: "ac",
        origin: localOrigin,
        components: { dx: -localGmbVectors.acMag, dy: 0 },
        color: SCIENTIFIC_THEME.vectors.acceleration,
        scale: 10,
        showValue: showValuesInOverlay,
        valueText: `${localGmbVectors.acMag.toFixed(2)} m/s²`,
      });
    }

    if (vectorState.showCentripetalForce && localGmbVectors.FcMag > 1e-4) {
      items.push({
        id: "Fc",
        category: "force",
        label: "Fc",
        origin: localOrigin,
        components: { dx: -localGmbVectors.FcMag, dy: 0 },
        color: SCIENTIFIC_THEME.vectors.force,
        dashed: true,
        strokeDasharray: "5 3",
        scale: 50,
        showValue: showValuesInOverlay,
        valueText: `${localGmbVectors.FcMag.toFixed(2)} N`,
      });
    }

    return items;
  }, [r, actualOmega, vectorState, showValuesInOverlay, localGmbVectors, viewTransform]);

  const alreadyRecorded = lastRecordedTime !== null && lastRecordedTime === sim.time;
  const nearTarget = isStopNearTarget(snapshot.revolutions, targetN, STOP_TOLERANCE_REV);

  let blockReason: string | null = null;
  if (!isDataStep) blockReason = "Pencatatan data aktif pada langkah \"Jalankan & Catat Data\".";
  else if (sim.isPlaying) blockReason = "Jeda simulasi terlebih dahulu untuk mencatat waktu.";
  else if (sim.time <= 0) blockReason = "Jalankan simulasi dari posisi START, lalu jeda setelah N putaran.";
  else if (alreadyRecorded) blockReason = "Pengukuran ini sudah dicatat. Reset jam untuk percobaan berikutnya.";
  else if (!nearTarget) blockReason = `Partikel belum tepat menempuh ${targetN} putaran. Reset dan ulangi pengukuran.`;

  const onRecordRef = useRef(onRecord);
  onRecordRef.current = onRecord;

  const handleRecord = () => {
    if (blockReason || !onRecordRef.current) return;
    const t = round(sim.time, 2);
    const derived = deriveFromMeasurement(r, targetN, t);
    onRecordRef.current({
      trial: recordedDataCount + 1,
      r: round(r, 2),
      N: targetN,
      t,
      T: round(derived.T, 3),
      f: round(derived.f, 3),
      omega: round(derived.omega, 3),
      v: round(derived.v, 3),
      a_c: round(derived.a_c, 3),
    });
    setLastRecordedTime(sim.time);
  };

  const thetaDeg = (snapshot.thetaWrapped * 180) / Math.PI;

  return (
    <div className="w-full min-h-full flex flex-col 2xl:flex-row gap-6 p-4 sm:p-6">
      {/* Simulation */}
      <div className="flex-1 min-w-0 min-h-[480px] flex flex-col">
        <SimulationContainer
          title={mode === "explore" ? "Eksplorasi Gerak Melingkar (Meja Putar Presisi)" : "Alat Gerak Melingkar Beraturan"}
          time={sim.time}
          isPlaying={sim.isPlaying}
          onPlay={sim.play}
          onPause={sim.pause}
          onReset={sim.reset}
          speed={sim.speed}
          onSpeedChange={sim.setSpeed}
        >
          {/* Header Status Bar Pill */}
          <div className="absolute top-3 left-4 z-10 flex items-center gap-2 px-3 py-1 bg-slate-900/80 backdrop-blur-md rounded-full border border-slate-700/60 shadow-lg pointer-events-none">
            <span
              className={`w-2 h-2 rounded-full ${
                sim.isPlaying
                  ? "bg-cyan-400 animate-ping"
                  : sim.time > 0
                  ? "bg-amber-400"
                  : "bg-emerald-400"
              }`}
            />
            <span className="text-[10px] font-mono font-bold tracking-wider text-slate-300">
              {sim.isPlaying ? "MOTOR AKTIF" : sim.time > 0 ? "DIJEDA" : "SIAP"}
            </span>
            <span className="text-slate-600">|</span>
            <Disc3 className={`w-3 h-3 text-cyan-400 ${sim.isPlaying ? "animate-spin" : ""}`} />
            <span className="text-[10px] font-mono text-cyan-300">
              n = {snapshot.completedRevolutions} putaran
            </span>
          </div>

          <div className="absolute inset-0 p-2 sm:p-4">
            <UniformCircularMotionView
              snapshot={snapshot}
              r={r}
              omega={actualOmega}
              theta0={actualTheta0}
              maxRadius={R_MAX}
              vectorItems={vectorItems}
              userVectorScale={vectorState.arrowScale}
              showVectorValues={showValuesInOverlay}
              isVectorLocked={isVectorLockedEffective}
            />
          </div>
        </SimulationContainer>
      </div>

      {/* Controls Aside */}
      <aside className="w-full 2xl:w-[340px] shrink-0 flex flex-col gap-4">
        <section className="rounded-2xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-md p-4 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="text-xs font-bold font-mono tracking-wider text-slate-200 uppercase">
              {mode === "explore" ? "Parameter Meja Putar" : "Pengaturan Percobaan"}
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 font-bold">
              LAB GRADE
            </span>
          </div>

          <ParameterSlider
            label="Jari-jari Lintasan (r)"
            unit="m"
            value={r}
            onChange={(value) => setR(round(value, 2))}
            min={R_MIN}
            max={R_MAX}
            step={0.05}
            precision={2}
            disabled={sim.isPlaying}
          />

          {mode === "practicum" && (
            <NumberInput
              label="Target Jumlah Putaran (N)"
              value={targetN}
              onChange={(value) => setTargetN(Math.round(value))}
              min={N_MIN}
              max={N_MAX}
              step={1}
              disabled={sim.isPlaying}
            />
          )}

          {mode === "explore" && (
            <>
              <ParameterSlider
                label="Kecepatan Sudut (ω)"
                unit="rad/s"
                value={omega}
                onChange={(value) => setOmega(round(value, 2))}
                min={-10}
                max={10}
                step={0.1}
                precision={2}
                disabled={sim.isPlaying}
              />
              <ParameterSlider
                label="Sudut Awal (θ₀)"
                unit="rad"
                value={theta0}
                onChange={(value) => setTheta0(round(value, 2))}
                min={0}
                max={6.28}
                step={0.1}
                precision={2}
                disabled={sim.isPlaying}
              />
            </>
          )}

          {/* Vector Controls (Tahap J) */}
          <div className="pt-2 border-t border-slate-800/80">
            <VectorControls
              categories={vectorCategories}
              onToggleCategory={handleToggleCategory}
              arrowScale={vectorState.arrowScale}
              onScaleChange={(scale) => setVectorState((s) => ({ ...s, arrowScale: scale }))}
              showValues={vectorState.showValues}
              onToggleShowValues={() => setVectorState((s) => ({ ...s, showValues: !s.showValues }))}
              isQualitative={mode === "practicum"}
              isLocked={isVectorLockedEffective}
              lockMessage={vectorLockMessage}
            />
          </div>
        </section>

        <ReadoutPanel
          items={[
            { id: "t", label: "Waktu Tempuh", symbol: "t", value: formatReadout(sim.time, 2), unit: "s", color: "#60A5FA" },
            { id: "rev", label: "Putaran Selesai", symbol: "n", value: String(snapshot.completedRevolutions), color: UCM_COLORS.particle },
            { id: "theta", label: "Posisi Sudut", symbol: "θ", value: formatReadout(thetaDeg, 1), unit: "°", color: UCM_COLORS.angle },
            { id: "r", label: "Jari-jari Sensor", symbol: "r", value: formatReadout(r, 2), unit: "m" },
            ...(mode === "explore"
              ? [
                  { id: "T", label: "Periode Putaran", symbol: "T", value: formatReadout(snapshot.period, 2), unit: "s", color: "#FBBF24" },
                  { id: "f", label: "Frekuensi", symbol: "f", value: formatReadout(snapshot.frequency, 3), unit: "Hz", color: "#FBBF24" },
                  { id: "v", label: "Kec. Tangensial", symbol: "v", value: formatReadout(snapshot.speed, 2), unit: "m/s", color: UCM_COLORS.velocity },
                  { id: "ac", label: "Perc. Sentripetal", symbol: "a_c", value: formatReadout(snapshot.centripetal, 2), unit: "m/s²", color: UCM_COLORS.acceleration },
                ]
              : []),
          ]}
        />

        {mode === "practicum" && (
          <section className="rounded-2xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-md p-4 shadow-xl flex flex-col gap-3">
            <button
              id="gmb-record-button"
              type="button"
              onClick={handleRecord}
              disabled={blockReason !== null}
              className="btn-primary w-full justify-center disabled:opacity-40 transition-all active:scale-95"
              style={{
                fontSize: "0.875rem",
                padding: "11px 16px",
                cursor: blockReason ? "not-allowed" : "pointer",
                transform: blockReason ? "none" : undefined,
              }}
            >
              <ClipboardPlus className="w-4 h-4" /> Catat Data
            </button>
            <p
              className="text-xs leading-relaxed flex gap-2 font-mono"
              style={{ color: blockReason ? "var(--color-text-2)" : "var(--color-success)" }}
              aria-live="polite"
            >
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {blockReason ?? `Siap dicatat: r = ${r.toFixed(2)} m, N = ${targetN}, t = ${sim.time.toFixed(2)} s.`}
            </p>
            <p className="text-[0.7rem] text-slate-400/70 leading-relaxed border-t border-slate-800/80 pt-2">
              Tips: Gunakan kecepatan 0.5x atau 0.25x agar lebih mudah menjeda tepat di garis START. Mengubah r atau menekan Reset (↺) mengembalikan jam ke 0.
            </p>
          </section>
        )}
      </aside>
    </div>
  );
}
