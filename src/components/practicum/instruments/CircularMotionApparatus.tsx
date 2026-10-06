"use client";

import React, { useMemo, useState } from "react";
import { ClipboardPlus, Info } from "lucide-react";
import { useSimulationLoop } from "@/physics/hooks/useSimulationLoop";
import {
  TWO_PI,
  circularMotionModel,
  computeSnapshot,
  deriveFromMeasurement,
  isStopNearTarget,
  CircularMotionParams,
} from "@/physics/circularMotion";
import { SimulationContainer } from "@/components/simulation/SimulationContainer";
import { UniformCircularMotionView, UCM_COLORS } from "@/components/simulation/UniformCircularMotionView";
import { ReadoutPanel, formatReadout } from "@/components/simulation/ReadoutPanel";
import { ToggleChip } from "@/components/simulation/ToggleChip";
import { ParameterSlider, NumberInput } from "@/components/ui/NumberInput";

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
}

export function CircularMotionApparatus({
  mode = "practicum",
  onRecord,
  recordedDataCount = 0,
  isDataStep = true,
}: CircularMotionApparatusProps) {
  const [r, setR] = useState(0.5);
  const [targetN, setTargetN] = useState(5);
  const [omega, setOmega] = useState(GMB_MOTOR_OMEGA);
  const [theta0, setTheta0] = useState(0);
  
  const [showVelocity, setShowVelocity] = useState(true);
  const [showAcceleration, setShowAcceleration] = useState(true);
  const [lastRecordedTime, setLastRecordedTime] = useState<number | null>(null);

  const actualOmega = mode === "practicum" ? GMB_MOTOR_OMEGA : omega;
  const actualTheta0 = mode === "practicum" ? 0 : theta0;

  const params = useMemo<CircularMotionParams>(
    () => ({ r, omega: actualOmega, theta0: actualTheta0 }),
    [r, actualOmega, actualTheta0]
  );
  
  const sim = useSimulationLoop(circularMotionModel, params);
  const snapshot = computeSnapshot(params, sim.time);

  const alreadyRecorded = lastRecordedTime !== null && lastRecordedTime === sim.time;
  const nearTarget = isStopNearTarget(snapshot.revolutions, targetN, STOP_TOLERANCE_REV);

  let blockReason: string | null = null;
  if (!isDataStep) blockReason = "Pencatatan data aktif pada langkah \"Jalankan & Catat Data\".";
  else if (sim.isPlaying) blockReason = "Jeda simulasi terlebih dahulu untuk mencatat waktu.";
  else if (sim.time <= 0) blockReason = "Jalankan simulasi dari posisi START, lalu jeda setelah N putaran.";
  else if (alreadyRecorded) blockReason = "Pengukuran ini sudah dicatat. Reset jam untuk percobaan berikutnya.";
  else if (!nearTarget) blockReason = `Partikel belum tepat menempuh ${targetN} putaran. Reset dan ulangi pengukuran.`;

  const handleRecord = () => {
    if (blockReason || !onRecord) return;
    const t = round(sim.time, 2);
    const derived = deriveFromMeasurement(r, targetN, t);
    onRecord({
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
      <div className="flex-1 min-w-0 h-[min(72vh,640px)] min-h-[420px]">
        <SimulationContainer
          title={mode === "explore" ? "Eksplorasi Gerak Melingkar" : "Alat Gerak Melingkar"}
          time={sim.time}
          isPlaying={sim.isPlaying}
          onPlay={sim.play}
          onPause={sim.pause}
          onReset={sim.reset}
          speed={sim.speed}
          onSpeedChange={sim.setSpeed}
        >
          <div className="absolute inset-0 p-2 sm:p-4">
            <UniformCircularMotionView
              snapshot={snapshot}
              r={r}
              omega={actualOmega}
              theta0={actualTheta0}
              maxRadius={R_MAX}
              showVelocity={showVelocity}
              showAcceleration={showAcceleration}
            />
          </div>
        </SimulationContainer>
      </div>

      {/* Controls */}
      <aside className="w-full 2xl:w-[340px] shrink-0 flex flex-col gap-4">
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-white/90">
            {mode === "explore" ? "Parameter" : "Pengaturan Percobaan"}
          </h2>
          
          <ParameterSlider
            label="Jari-jari (r)"
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

          <div className="flex flex-wrap gap-2">
            <ToggleChip id="gmb-toggle-velocity" label="Vektor Kecepatan" checked={showVelocity} onChange={setShowVelocity} color={UCM_COLORS.velocity} />
            <ToggleChip id="gmb-toggle-acceleration" label="Vektor Percepatan" checked={showAcceleration} onChange={setShowAcceleration} color={UCM_COLORS.acceleration} />
          </div>
        </section>

        <ReadoutPanel
          items={[
            { id: "t", label: "Waktu", symbol: "t", value: formatReadout(sim.time, 2), unit: "s", color: "#60A5FA" },
            { id: "rev", label: "Putaran Selesai", symbol: "n", value: String(snapshot.completedRevolutions), color: UCM_COLORS.particle },
            { id: "theta", label: "Sudut", symbol: "θ", value: formatReadout(thetaDeg, 1), unit: "°", color: UCM_COLORS.angle },
            { id: "r", label: "Jari-jari", symbol: "r", value: formatReadout(r, 2), unit: "m" },
            ...(mode === "explore" ? [
              { id: "T", label: "Periode", symbol: "T", value: formatReadout(snapshot.period, 2), unit: "s", color: "#FBBF24" },
              { id: "f", label: "Frekuensi", symbol: "f", value: formatReadout(snapshot.frequency, 3), unit: "Hz", color: "#FBBF24" },
              { id: "v", label: "Kec. Tangensial", symbol: "v", value: formatReadout(snapshot.speed, 2), unit: "m/s", color: UCM_COLORS.velocity },
              { id: "ac", label: "Perc. Sentripetal", symbol: "a_c", value: formatReadout(snapshot.centripetal, 2), unit: "m/s²", color: UCM_COLORS.acceleration },
            ] : [])
          ]}
        />

        {mode === "practicum" && (
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-3">
            <button
              id="gmb-record-button"
              type="button"
              onClick={handleRecord}
              disabled={blockReason !== null}
              className="btn-primary w-full justify-center disabled:opacity-40"
              style={{ fontSize: "0.875rem", padding: "10px 16px", cursor: blockReason ? "not-allowed" : "pointer", transform: blockReason ? "none" : undefined }}
            >
              <ClipboardPlus className="w-4 h-4" /> Catat Data
            </button>
            <p className="text-xs leading-relaxed flex gap-2" style={{ color: blockReason ? "var(--color-text-2)" : "var(--color-success)" }} aria-live="polite">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {blockReason ?? `Siap dicatat: r = ${r.toFixed(2)} m, N = ${targetN}, t = ${sim.time.toFixed(2)} s.`}
            </p>
            <p className="text-[0.7rem] text-white/40 leading-relaxed">
              Tips: gunakan kecepatan 0.5x atau 0.25x agar lebih mudah menjeda tepat di garis START. Mengubah r atau menekan Reset (↺) mengembalikan jam ke 0.
            </p>
          </section>
        )}
      </aside>
    </div>
  );
}
