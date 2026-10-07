"use client";

import React, { useEffect, useRef, useState } from "react";
import { Calculator, CheckCircle2, Eye, AlertTriangle, ArrowUp, ArrowDown, HelpCircle } from "lucide-react";
import { HintBox } from "./HintBox";
import {
  AnswerFeedback,
  FormulaDiagnosis,
  MI2AnswerField,
  MI2Trial,
  computeMI2ReferenceValues,
  parseAnswer,
  validateMI2Answers,
  RigidBodyShape
} from "@/physics/momentOfInertia2";

export const MI2_ROW_KEYS = {
  shape: "shape",
  t5_1: "t5_1",
  t5_2: "t5_2",
  t5_3: "t5_3",
  t5_4: "t5_4",
  t5_5: "t5_5",
  period: "period",
  inertiaTheory: "inertia_theory",
  inertiaMeasured: "inertia_measured",
  ksr: "ksr",
  // hidden
  shapeCode: "shape_code",
  mass: "mass",
  r: "r",
  i0: "i0",
  t0: "t0",
  attempts: "check_attempts",
  revealed: "theory_revealed",
  checkedPeriod: "checked_period",
  checkedInertiaTheory: "checked_inertia_theory",
  checkedInertiaMeasured: "checked_inertia_measured",
  checkedKsr: "checked_ksr",
} as const;

export type Row = Record<string, string | number>;

const FIELD_KEY: Record<MI2AnswerField, string> = {
  period: MI2_ROW_KEYS.period,
  inertiaTheory: MI2_ROW_KEYS.inertiaTheory,
  inertiaMeasured: MI2_ROW_KEYS.inertiaMeasured,
  ksr: MI2_ROW_KEYS.ksr,
};

const CHECKED_KEY: Record<MI2AnswerField, string> = {
  period: MI2_ROW_KEYS.checkedPeriod,
  inertiaTheory: MI2_ROW_KEYS.checkedInertiaTheory,
  inertiaMeasured: MI2_ROW_KEYS.checkedInertiaMeasured,
  ksr: MI2_ROW_KEYS.checkedKsr,
};

const FIELDS: MI2AnswerField[] = ["period", "inertiaTheory", "inertiaMeasured", "ksr"];

export function buildMI2MeasuredRow(params: {
  shape: RigidBodyShape;
  mass: number;
  r: number;
  t5_1: number;
  t5_2: number;
  t5_3: number;
  t5_4: number;
  t5_5: number;
  i0: number;
  t0: number;
}): Row {
  return {
    [MI2_ROW_KEYS.shape]: params.shape === "solid-sphere" ? "Bola Pejal" : "Silinder Pejal",
    [MI2_ROW_KEYS.t5_1]: Number(params.t5_1.toFixed(3)),
    [MI2_ROW_KEYS.t5_2]: Number(params.t5_2.toFixed(3)),
    [MI2_ROW_KEYS.t5_3]: Number(params.t5_3.toFixed(3)),
    [MI2_ROW_KEYS.t5_4]: Number(params.t5_4.toFixed(3)),
    [MI2_ROW_KEYS.t5_5]: Number(params.t5_5.toFixed(3)),
    [MI2_ROW_KEYS.period]: "",
    [MI2_ROW_KEYS.inertiaTheory]: "",
    [MI2_ROW_KEYS.inertiaMeasured]: "",
    [MI2_ROW_KEYS.ksr]: "",
    [MI2_ROW_KEYS.shapeCode]: params.shape,
    [MI2_ROW_KEYS.mass]: params.mass,
    [MI2_ROW_KEYS.r]: params.r,
    [MI2_ROW_KEYS.i0]: params.i0,
    [MI2_ROW_KEYS.t0]: params.t0,
    [MI2_ROW_KEYS.attempts]: 0,
    [MI2_ROW_KEYS.revealed]: 0,
    [MI2_ROW_KEYS.checkedPeriod]: "",
    [MI2_ROW_KEYS.checkedInertiaTheory]: "",
    [MI2_ROW_KEYS.checkedInertiaMeasured]: "",
    [MI2_ROW_KEYS.checkedKsr]: "",
  };
}

export function rowToMI2Trial(row: Row): MI2Trial | null {
  const code = String(row[MI2_ROW_KEYS.shapeCode] ?? "");
  const shape: RigidBodyShape | null = code === "solid-sphere" || code === "solid-cylinder" ? code as RigidBodyShape : null;
  const num = (key: string) => {
    const v = parseAnswer(row[key]);
    return v === null || !Number.isFinite(v) ? 0 : v;
  };
  if (!shape) return null;
  return {
    shape,
    mass: num(MI2_ROW_KEYS.mass),
    r: num(MI2_ROW_KEYS.r),
    t5_1: num(MI2_ROW_KEYS.t5_1),
    t5_2: num(MI2_ROW_KEYS.t5_2),
    t5_3: num(MI2_ROW_KEYS.t5_3),
    t5_4: num(MI2_ROW_KEYS.t5_4),
    t5_5: num(MI2_ROW_KEYS.t5_5),
    i0: num(MI2_ROW_KEYS.i0),
    t0: num(MI2_ROW_KEYS.t0),
  };
}

const attemptsOf = (row: Row) => Number(row[MI2_ROW_KEYS.attempts]) || 0;
const revealedOf = (row: Row) => Number(row[MI2_ROW_KEYS.revealed]) === 1;
const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));

const FIELD_LABEL: Record<MI2AnswerField, { label: string; unit: string; placeholder: string }> = {
  period: { label: "Periode (T)", unit: "s", placeholder: "contoh: 1,234" },
  inertiaTheory: { label: "I Teori", unit: "kg·m²", placeholder: "contoh: 0,00123" },
  inertiaMeasured: { label: "I Eksperimen", unit: "kg·m²", placeholder: "contoh: 0,00123" },
  ksr: { label: "KSR", unit: "%", placeholder: "contoh: 2,5" },
};

const FIELD_HINTS: Record<MI2AnswerField, string[]> = {
  period: [
    "Waktu yang Anda ukur adalah untuk 5 getaran (t5).",
    "Hitung rata-rata dari t5, lalu bagi dengan 5 untuk mendapatkan T.",
    "T = rata-rata(t5) / 5."
  ],
  inertiaTheory: [
    "Momen inersia TEORI adalah momen inersia dari benda itu sendiri (TANPA alat).",
    "Gunakan I = (2/5)·M·R² untuk Bola Pejal, dan I = (1/2)·M·R² untuk Silinder Pejal.",
    "Pastikan satuan M dalam kg dan R dalam meter."
  ],
  inertiaMeasured: [
    "Hitung I hasil EKSPERIMEN berdasarkan perbandingan periode.",
    "Rumus: I_eks = [ (T² / T0²) - 1 ] × I0.",
    "Gunakan I0 dan T0 acuan yang tersedia pada panel data diketahui."
  ],
  ksr: [
    "Hitung Kesalahan Relatif (KSR) antara teori dan eksperimen benda.",
    "KSR = |I_teori - I_eksperimen| / I_teori × 100%.",
    "Ingat, kita membandingkan inersia benda (tanpa tambahan alat) dengan inersia eksperimen."
  ],
};

const DIAGNOSIS_TEXT: Record<FormulaDiagnosis, string> = {
  forgot_divide_by_5: "Anda memasukkan rata-rata waktu 5 getaran. Jangan lupa membaginya dengan 5 untuk mendapatkan T.",
  used_i0_plus_ibody_theory: "Jangan jumlahkan dengan I0 untuk teori KSR. Gunakan murni I teori dari bentuk geometri benda.",
  used_t_instead_of_t_squared: "Periksa kembali rumus I_eks. Gunakan kuadrat periode (T² dan T0²).",
  mixed_units_g_vs_kg: "Periksa satuan massa: massa harus dalam kg (kilogram), bukan gram.",
  mixed_units_cm_vs_m: "Periksa satuan jari-jari: jari-jari harus dalam meter, bukan sentimeter."
};

function StatusBadge({ feedback }: { feedback: AnswerFeedback }) {
  const base = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border";
  switch (feedback.status) {
    case "correct": return <span className={`${base} bg-emerald-500/15 text-emerald-300 border-emerald-500/40`}><CheckCircle2 className="w-3 h-3" />Sesuai</span>;
    case "too_high": return <span className={`${base} bg-amber-500/15 text-amber-300 border-amber-500/40`}><ArrowUp className="w-3 h-3" />Terlalu besar</span>;
    case "too_low": return <span className={`${base} bg-amber-500/15 text-amber-300 border-amber-500/40`}><ArrowDown className="w-3 h-3" />Terlalu kecil</span>;
    case "check_formula": return <span className={`${base} bg-rose-500/15 text-rose-300 border-rose-500/40`}><AlertTriangle className="w-3 h-3" />Cek satuan/rumus</span>;
    case "invalid": return <span className={`${base} bg-rose-500/15 text-rose-300 border-rose-500/40`}>Format angka tidak valid</span>;
    default: return <span className={`${base} bg-slate-700/40 text-slate-400 border-slate-600`}>Belum diisi</span>;
  }
}

export function formatMI2Reference(field: MI2AnswerField, value: number): string {
  if (field === "period") return `${value.toFixed(3)} s`;
  if (field === "ksr") return `${value.toFixed(2)} %`;
  return `${value.toPrecision(4)} kg·m²`;
}

interface MI2CalculationPanelProps {
  rows: Row[];
  onRowsChange: (rows: Row[]) => void;
}

export function MomentOfInertiaCalculationPanel({ rows, onRowsChange }: MI2CalculationPanelProps) {
  const [selected, setSelected] = useState(Math.max(0, rows.length - 1));
  const prevLength = useRef(rows.length);

  useEffect(() => {
    if (rows.length > prevLength.current) setSelected(rows.length - 1);
    if (selected >= rows.length) setSelected(Math.max(0, rows.length - 1));
    prevLength.current = rows.length;
  }, [rows.length, selected]);

  if (rows.length === 0) {
    return (
      <section className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg">
        <h3 className="font-bold text-white flex items-center gap-2 text-sm">
          <Calculator className="w-4 h-4 text-violet-400" /> Hitung Nilai Teori (Manual)
        </h3>
        <p className="text-slate-400 text-sm mt-2">Rekam data dan klik &quot;Tambahkan Data&quot; terlebih dahulu.</p>
      </section>
    );
  }

  const index = Math.min(selected, rows.length - 1);
  const row = rows[index];
  const trial = rowToMI2Trial(row);
  const attempts = attemptsOf(row);
  const revealed = revealedOf(row);

  const updateRow = (patch: Row) => {
    onRowsChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const checkedFeedback = trial
    ? validateMI2Answers(trial, {
        period: str(row[CHECKED_KEY.period]),
        inertiaTheory: str(row[CHECKED_KEY.inertiaTheory]),
        inertiaMeasured: str(row[CHECKED_KEY.inertiaMeasured]),
        ksr: str(row[CHECKED_KEY.ksr]),
      })
    : null;

  const allEmpty = FIELDS.every((f) => str(row[FIELD_KEY[f]]).trim() === "");

  const handleCheck = () => {
    updateRow({
      [MI2_ROW_KEYS.attempts]: attempts + 1,
      [CHECKED_KEY.period]: str(row[FIELD_KEY.period]),
      [CHECKED_KEY.inertiaTheory]: str(row[FIELD_KEY.inertiaTheory]),
      [CHECKED_KEY.inertiaMeasured]: str(row[FIELD_KEY.inertiaMeasured]),
      [CHECKED_KEY.ksr]: str(row[FIELD_KEY.ksr]),
    });
  };

  const handleReveal = () => {
    if (attempts < 1) return;
    updateRow({ [MI2_ROW_KEYS.revealed]: 1 });
  };

  const reference = trial && revealed && attempts >= 1 ? computeMI2ReferenceValues(trial) : null;

  return (
    <section className="bg-slate-900 border border-violet-500/30 rounded-xl p-5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="font-bold text-white flex items-center gap-2 text-sm">
          <Calculator className="w-4 h-4 text-violet-400" /> Hitung Nilai Teori (Manual)
        </h3>
        <div className="flex flex-wrap gap-2">
          {rows.map((r, i) => {
            const t = rowToMI2Trial(r);
            const tried = attemptsOf(r) > 0;
            return (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                  i === index
                    ? "bg-violet-500/20 border-violet-400 text-violet-200"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                }`}
              >
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${tried ? "bg-emerald-400" : "bg-slate-500"}`} />
                Baris {i + 1}{t ? ` · ${t.shape === "solid-sphere" ? "Bola" : "Silinder"}` : ""}
              </button>
            );
          })}
        </div>
      </div>

      {!trial ? (
        <p className="text-sm text-amber-300/80">Baris ini tidak valid.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
          <aside className="bg-black/30 border border-slate-700 rounded-lg p-4 font-mono text-xs text-slate-300 space-y-1.5 h-fit">
            <div className="font-sans font-bold text-slate-200 text-sm mb-2">Data Diketahui</div>
            <div>Bentuk = {trial.shape === "solid-sphere" ? "Bola Pejal" : "Silinder Pejal"}</div>
            <div>M = {trial.mass} kg</div>
            <div>R = {trial.r} m</div>
            <div>I0 = {trial.i0.toPrecision(4)} kg·m²</div>
            <div>T0 = {trial.t0.toFixed(3)} s</div>
            <div className="pt-1.5 mt-1.5 border-t border-slate-700 text-emerald-300 flex flex-col gap-0.5">
              <span>Waktu 5 getaran (s):</span>
              <span>1: {trial.t5_1.toFixed(3)}</span>
              <span>2: {trial.t5_2.toFixed(3)}</span>
              <span>3: {trial.t5_3.toFixed(3)}</span>
              <span>4: {trial.t5_4.toFixed(3)}</span>
              <span>5: {trial.t5_5.toFixed(3)}</span>
            </div>
          </aside>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FIELDS.map((field) => {
                const meta = FIELD_LABEL[field];
                const current = str(row[FIELD_KEY[field]]);
                const checked = str(row[CHECKED_KEY[field]]);
                const isStale = attempts > 0 && current !== checked;
                const fb = checkedFeedback?.[field];
                return (
                  <div key={field} className="flex flex-col gap-2">
                    <label className="text-xs text-slate-400 font-bold">
                      {meta.label} <span className="text-violet-300 font-mono font-normal">({meta.unit})</span>
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={current}
                      placeholder={meta.placeholder}
                      onChange={(e) => updateRow({ [FIELD_KEY[field]]: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 focus:border-violet-400 outline-none rounded-lg p-2 text-white font-mono text-sm"
                    />
                    <div className="min-h-[22px] flex flex-col gap-1">
                      {attempts > 0 && fb && !isStale && <StatusBadge feedback={fb} />}
                      {attempts > 0 && isStale && (
                        <span className="text-[11px] text-slate-400 italic">Diubah — klik Periksa</span>
                      )}
                      {attempts > 0 && !isStale && fb?.status === "check_formula" && fb.diagnosis && (
                        <span className="text-[11px] text-rose-200/80">{DIAGNOSIS_TEXT[fb.diagnosis]}</span>
                      )}
                    </div>
                    <HintBox key={`${index}-${field}`} hints={FIELD_HINTS[field]} />
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleCheck}
                disabled={allEmpty}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold text-sm rounded-lg flex items-center gap-2 transition"
              >
                <CheckCircle2 className="w-4 h-4" /> Periksa Jawaban
              </button>
              <button
                onClick={handleReveal}
                disabled={attempts < 1 || revealed}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white font-bold text-sm rounded-lg flex items-center gap-2 transition"
              >
                <Eye className="w-4 h-4" /> Tampilkan nilai teori
              </button>
              <span className="text-xs text-slate-500">Percobaan: {attempts}</span>
            </div>

            {reference && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-100/90">
                <div className="font-bold mb-1">Nilai teori:</div>
                <div className="font-mono flex flex-wrap gap-x-6 gap-y-1">
                  <span>T = {formatMI2Reference("period", reference.period)}</span>
                  <span>I Teori = {formatMI2Reference("inertiaTheory", reference.inertiaTheory)}</span>
                  <span>I Eks = {formatMI2Reference("inertiaMeasured", reference.inertiaMeasured)}</span>
                  <span>KSR = {formatMI2Reference("ksr", reference.ksr)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
