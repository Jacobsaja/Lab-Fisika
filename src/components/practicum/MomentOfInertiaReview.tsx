"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
import {
  MI2AnswerField,
  MI2Trial,
  computeMI2ReferenceValues,
  validateMI2Answers,
  AnswerFeedback
} from "@/physics/momentOfInertia2";
import {
  MI2_ROW_KEYS,
  Row,
  rowToMI2Trial,
  formatMI2Reference
} from "./MomentOfInertiaCalculationPanel";

const FIELDS: MI2AnswerField[] = ["period", "inertiaTheory", "inertiaMeasured", "ksr"];

const FIELD_LABEL: Record<MI2AnswerField, { label: string; unit: string }> = {
  period: { label: "Periode (T)", unit: "s" },
  inertiaTheory: { label: "I Teori", unit: "kg·m²" },
  inertiaMeasured: { label: "I Eks", unit: "kg·m²" },
  ksr: { label: "KSR", unit: "%" },
};

const DIAGNOSIS_TEXT: Record<string, string> = {
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

const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));
const attemptsOf = (row: Row) => Number(row[MI2_ROW_KEYS.attempts]) || 0;
const revealedOf = (row: Row) => Number(row[MI2_ROW_KEYS.revealed]) === 1;

export function MI2Review({ rows }: { rows: Row[] }) {
  const measured = rows
    .map((row, i) => ({ row, i, trial: rowToMI2Trial(row) }))
    .filter((x): x is { row: Row; i: number; trial: MI2Trial } => x.trial !== null);

  let correctCount = 0;
  let filledCount = 0;
  const revealedCount = measured.filter(({ row }) => revealedOf(row)).length;

  const evaluated = measured.map(({ row, i, trial }) => {
    const fb = validateMI2Answers(trial, {
      period: str(row[MI2_ROW_KEYS.period]),
      inertiaTheory: str(row[MI2_ROW_KEYS.inertiaTheory]),
      inertiaMeasured: str(row[MI2_ROW_KEYS.inertiaMeasured]),
      ksr: str(row[MI2_ROW_KEYS.ksr]),
    });
    FIELDS.forEach((f) => {
      if (fb[f].status !== "empty") filledCount++;
      if (fb[f].status === "correct") correctCount++;
    });
    return { row, i, trial, fb };
  });

  return (
    <div className="w-full h-full p-8 flex flex-col items-center overflow-y-auto bg-[#0a0f1c]">
      <div className="w-full max-w-6xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Tinjauan Perhitungan Teori</h2>
          <p className="text-white/60 text-sm">
            Isian Anda ditampilkan apa adanya beserta status kesesuaiannya. Nilai acuan hanya ditampilkan untuk baris yang sudah Anda coba.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-xs text-white/50">Isian sesuai</div>
            <div className="text-2xl font-bold text-emerald-300">{correctCount} / {measured.length * FIELDS.length}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-xs text-white/50">Isian terisi</div>
            <div className="text-2xl font-bold text-white">{filledCount} / {measured.length * FIELDS.length}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-xs text-white/50">&quot;Tampilkan nilai teori&quot; dipakai</div>
            <div className={`text-2xl font-bold ${revealedCount > 0 ? "text-amber-300" : "text-white"}`}>{revealedCount} baris</div>
          </div>
        </div>

        <div className="bg-[#11182A] border border-white/10 rounded-xl overflow-x-auto shadow-2xl">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-white/5 border-b border-white/10 text-white/50 text-xs">
              <tr>
                <th className="p-3">No</th>
                <th className="p-3">Bentuk</th>
                <th className="p-3">I0 / T0 acuan</th>
                <th className="p-3">Waktu (rata-rata)</th>
                {FIELDS.map((f) => (
                  <th key={f} className="p-3">{FIELD_LABEL[f].label} ({FIELD_LABEL[f].unit})</th>
                ))}
                <th className="p-3">Percobaan</th>
                <th className="p-3">Teori dibuka</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {evaluated.length === 0 && (
                <tr><td colSpan={10} className="p-6 text-center text-white/50 italic">Belum ada baris pengukuran.</td></tr>
              )}
              {evaluated.map(({ row, i, trial, fb }) => {
                const showReference = attemptsOf(row) > 0 || revealedOf(row);
                const ref = showReference ? computeMI2ReferenceValues(trial) : null;
                const T5_avg = (trial.t5_1 + trial.t5_2 + trial.t5_3 + trial.t5_4 + trial.t5_5) / 5;
                
                return (
                  <tr key={i} className="align-top">
                    <td className="p-3 font-mono">{i + 1}</td>
                    <td className="p-3">{trial.shape === "solid-sphere" ? "Bola Pejal" : "Silinder Pejal"}</td>
                    <td className="p-3 font-mono text-xs">
                      <div>I0 = {trial.i0.toPrecision(4)}</div>
                      <div>T0 = {trial.t0.toFixed(3)}</div>
                    </td>
                    <td className="p-3 font-mono text-xs">
                      <div>t5 = {T5_avg.toFixed(3)} s</div>
                    </td>
                    {FIELDS.map((f) => (
                      <td key={f} className="p-3">
                        <div className="font-mono mb-1">{str(row[MI2_ROW_KEYS[f]]) || "—"}</div>
                        <StatusBadge feedback={fb[f]} />
                        {fb[f].status === "check_formula" && fb[f].diagnosis && (
                          <div className="text-[11px] text-rose-200/70 mt-1 max-w-[180px]">{DIAGNOSIS_TEXT[fb[f].diagnosis!]}</div>
                        )}
                        {ref && fb[f].status !== "correct" && (
                          <div className="text-[11px] text-white/40 mt-1 font-mono">acuan: {formatMI2Reference(f, ref[f])}</div>
                        )}
                      </td>
                    ))}
                    <td className="p-3 font-mono">{attemptsOf(row)}</td>
                    <td className="p-3">
                      {revealedOf(row)
                        ? <span className="text-amber-300 font-semibold">Ya</span>
                        : <span className="text-white/50">Tidak</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
