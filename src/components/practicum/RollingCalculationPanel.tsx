"use client";

import React, { useEffect, useRef, useState } from "react";
import { Calculator, CheckCircle2, Eye, AlertTriangle, ArrowUp, ArrowDown, HelpCircle } from "lucide-react";
import { HintBox } from "./HintBox";
import {
  AnswerFeedback,
  FormulaDiagnosis,
  PRACTICUM_G,
  RollingAnswerField,
  RollingTrial,
  computeReferenceValues,
  parseAnswer,
  validateRollingAnswers,
} from "@/physics/rollingMotionValidation";

// ─── Row model ──────────────────────────────────────────────────────────────

/** Keys used in the recorded data rows. Visible columns + hidden bookkeeping keys. */
export const ROLLING_ROW_KEYS = {
  shape: "shape",
  angle: "angle",
  aGraph: "a_graph",
  aTheory: "a_theory",
  errorPct: "error",
  inertia: "inertia",
  // hidden
  shapeCode: "shape_code",
  mass: "mass",
  r: "r",
  rInner: "r_inner",
  attempts: "check_attempts",
  revealed: "theory_revealed",
  checkedATheory: "checked_a_theory",
  checkedErrorPct: "checked_error",
  checkedInertia: "checked_inertia",
} as const;

type Row = Record<string, string | number>;

const FIELD_KEY: Record<RollingAnswerField, string> = {
  aTheory: ROLLING_ROW_KEYS.aTheory,
  errorPct: ROLLING_ROW_KEYS.errorPct,
  inertia: ROLLING_ROW_KEYS.inertia,
};

const CHECKED_KEY: Record<RollingAnswerField, string> = {
  aTheory: ROLLING_ROW_KEYS.checkedATheory,
  errorPct: ROLLING_ROW_KEYS.checkedErrorPct,
  inertia: ROLLING_ROW_KEYS.checkedInertia,
};

const FIELDS: RollingAnswerField[] = ["aTheory", "errorPct", "inertia"];

/** Measured row: only shape, angle and a_graph are known; student fields start empty. */
export function buildMeasuredRow(params: {
  shape: "solid" | "hollow";
  thetaDeg: number;
  aGraph: number;
  mass: number;
  r: number;
  rInner: number;
}): Row {
  return {
    [ROLLING_ROW_KEYS.shape]: params.shape === "solid" ? "Pejal" : "Berongga",
    [ROLLING_ROW_KEYS.angle]: params.thetaDeg,
    [ROLLING_ROW_KEYS.aGraph]: Number(params.aGraph.toFixed(3)),
    [ROLLING_ROW_KEYS.aTheory]: "",
    [ROLLING_ROW_KEYS.errorPct]: "",
    [ROLLING_ROW_KEYS.inertia]: "",
    [ROLLING_ROW_KEYS.shapeCode]: params.shape,
    [ROLLING_ROW_KEYS.mass]: params.mass,
    [ROLLING_ROW_KEYS.r]: params.r,
    [ROLLING_ROW_KEYS.rInner]: params.shape === "hollow" ? params.rInner : 0,
    [ROLLING_ROW_KEYS.attempts]: 0,
    [ROLLING_ROW_KEYS.revealed]: 0,
    [ROLLING_ROW_KEYS.checkedATheory]: "",
    [ROLLING_ROW_KEYS.checkedErrorPct]: "",
    [ROLLING_ROW_KEYS.checkedInertia]: "",
  };
}

/** Reconstructs the trial (known inputs) from a row; null if the row has no usable measurement. */
export function rowToTrial(row: Row): RollingTrial | null {
  const code = String(row[ROLLING_ROW_KEYS.shapeCode] ?? "");
  const label = String(row[ROLLING_ROW_KEYS.shape] ?? "").toLowerCase();
  const shape: "solid" | "hollow" | null =
    code === "solid" || code === "hollow" ? code
      : label.startsWith("pejal") ? "solid"
      : label.startsWith("berongga") ? "hollow"
      : null;
  const thetaDeg = parseAnswer(row[ROLLING_ROW_KEYS.angle]);
  const aGraph = parseAnswer(row[ROLLING_ROW_KEYS.aGraph]);
  if (!shape || thetaDeg === null || aGraph === null || !Number.isFinite(thetaDeg) || !Number.isFinite(aGraph) || aGraph <= 0) {
    return null;
  }
  const num = (key: string, fallback: number) => {
    const v = parseAnswer(row[key]);
    return v === null || !Number.isFinite(v) ? fallback : v;
  };
  return {
    shape,
    thetaDeg,
    aGraph,
    mass: num(ROLLING_ROW_KEYS.mass, 1),
    r: num(ROLLING_ROW_KEYS.r, 0.05),
    rInner: shape === "hollow" ? num(ROLLING_ROW_KEYS.rInner, 0.04) : 0,
    g: PRACTICUM_G,
  };
}

const attemptsOf = (row: Row) => Number(row[ROLLING_ROW_KEYS.attempts]) || 0;
const revealedOf = (row: Row) => Number(row[ROLLING_ROW_KEYS.revealed]) === 1;
const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));

// ─── Texts (Indonesian UI) ──────────────────────────────────────────────────

const FIELD_LABEL: Record<RollingAnswerField, { label: string; unit: string; placeholder: string }> = {
  aTheory: { label: "a Teori", unit: "m/s²", placeholder: "contoh: 1,234" },
  errorPct: { label: "Error", unit: "%", placeholder: "contoh: 2,5" },
  inertia: { label: "I Eksperimen", unit: "kg·m²", placeholder: "contoh: 0,00123" },
};

const FIELD_HINTS: Record<RollingAnswerField, string[]> = {
  aTheory: [
    "Benda menggelinding tanpa slip: sebagian energi menjadi energi rotasi, sehingga percepatannya lebih kecil dari g·sinθ.",
    "Gunakan a = g·sinθ / (1 + k), dengan k = I / (m·R²).",
    "Silinder pejal: k = ½. Silinder berongga tebal: k = ½·(1 + Ri²/R²). Pastikan kalkulator dalam mode derajat.",
  ],
  errorPct: [
    "Error membandingkan a hasil grafik dengan a hasil teori.",
    "Error (%) = |a_teori − a_grafik| / a_teori × 100%.",
    "Pembaginya a_teori (bukan a_grafik), dan hasilnya dinyatakan positif dalam persen.",
  ],
  inertia: [
    "Susun ulang rumus a = g·sinθ / (1 + I/(m·R²)) untuk mendapatkan I.",
    "I = m·R²·(g·sinθ / a − 1), dengan a dari grafik (a_grafik).",
    "Gunakan satuan SI: m dalam kg dan R dalam meter (bukan cm). Hasilnya dalam kg·m².",
  ],
};

const DIAGNOSIS_TEXT: Record<FormulaDiagnosis, string> = {
  missing_inertia_factor: "Sepertinya faktor rotasi 1/(1 + k) belum diterapkan dengan benar.",
  wrong_inertia_factor: "Periksa nilai k untuk bentuk benda ini.",
  degree_radian_mixup: "Periksa mode kalkulator: derajat atau radian.",
  cos_instead_of_sin: "Periksa fungsi trigonometri yang dipakai (sin atau cos).",
  unit_scale: "Periksa satuan (m vs cm, kg vs g).",
  fraction_not_percent: "Nilai tampaknya masih pecahan — nyatakan dalam persen.",
  wrong_reference: "Periksa pembagi pada rumus error.",
  sign: "Error dinyatakan sebagai nilai positif (mutlak).",
  missing_minus_one: "Ada suku yang terlewat dalam rumus I.",
  radius_not_squared: "Periksa pangkat jari-jari R.",
  used_theory_acceleration: "I eksperimen dihitung dari a hasil grafik, bukan a teori.",
};

function StatusBadge({ feedback }: { feedback: AnswerFeedback }) {
  const base = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border";
  switch (feedback.status) {
    case "correct":
      return <span className={`${base} bg-emerald-500/15 text-emerald-300 border-emerald-500/40`}><CheckCircle2 className="w-3 h-3" />Sesuai</span>;
    case "too_high":
      return <span className={`${base} bg-amber-500/15 text-amber-300 border-amber-500/40`}><ArrowUp className="w-3 h-3" />Terlalu besar</span>;
    case "too_low":
      return <span className={`${base} bg-amber-500/15 text-amber-300 border-amber-500/40`}><ArrowDown className="w-3 h-3" />Terlalu kecil</span>;
    case "check_formula":
      return <span className={`${base} bg-rose-500/15 text-rose-300 border-rose-500/40`}><AlertTriangle className="w-3 h-3" />Cek satuan/rumus</span>;
    case "invalid":
      return <span className={`${base} bg-rose-500/15 text-rose-300 border-rose-500/40`}>Format angka tidak valid</span>;
    default:
      return <span className={`${base} bg-slate-700/40 text-slate-400 border-slate-600`}>Belum diisi</span>;
  }
}

export function formatReference(field: RollingAnswerField, value: number): string {
  if (field === "aTheory") return `${value.toFixed(3)} m/s²`;
  if (field === "errorPct") return `${value.toFixed(2)} %`;
  return `${value.toPrecision(4)} kg·m²`;
}

// ─── Calculation panel (SIMULATION step) ────────────────────────────────────

interface RollingCalculationPanelProps {
  rows: Row[];
  onRowsChange: (rows: Row[]) => void;
}

export function RollingCalculationPanel({ rows, onRowsChange }: RollingCalculationPanelProps) {
  const [selected, setSelected] = useState(Math.max(0, rows.length - 1));
  const prevLength = useRef(rows.length);

  // Jump to the newest row whenever a measurement is added.
  useEffect(() => {
    if (rows.length > prevLength.current) setSelected(rows.length - 1);
    if (selected >= rows.length) setSelected(Math.max(0, rows.length - 1));
    prevLength.current = rows.length;
  }, [rows.length, selected]);

  if (rows.length === 0) {
    return (
      <section className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg" aria-labelledby="rolling-calc-title">
        <h3 id="rolling-calc-title" className="font-bold text-white flex items-center gap-2 text-sm">
          <Calculator className="w-4 h-4 text-violet-400" /> Hitung Nilai Teori (Manual)
        </h3>
        <p className="text-slate-400 text-sm mt-2">Rekam data dan klik &quot;Tambahkan Data&quot; terlebih dahulu.</p>
      </section>
    );
  }

  const index = Math.min(selected, rows.length - 1);
  const row = rows[index];
  const trial = rowToTrial(row);
  const attempts = attemptsOf(row);
  const revealed = revealedOf(row);

  const updateRow = (patch: Row) => {
    onRowsChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const checkedFeedback = trial
    ? validateRollingAnswers(trial, {
        aTheory: str(row[CHECKED_KEY.aTheory]),
        errorPct: str(row[CHECKED_KEY.errorPct]),
        inertia: str(row[CHECKED_KEY.inertia]),
      })
    : null;

  const allEmpty = FIELDS.every((f) => str(row[FIELD_KEY[f]]).trim() === "");

  const handleCheck = () => {
    updateRow({
      [ROLLING_ROW_KEYS.attempts]: attempts + 1,
      [CHECKED_KEY.aTheory]: str(row[FIELD_KEY.aTheory]),
      [CHECKED_KEY.errorPct]: str(row[FIELD_KEY.errorPct]),
      [CHECKED_KEY.inertia]: str(row[FIELD_KEY.inertia]),
    });
  };

  const handleReveal = () => {
    if (attempts < 1) return;
    updateRow({ [ROLLING_ROW_KEYS.revealed]: 1 });
  };

  const reference = trial && revealed && attempts >= 1 ? computeReferenceValues(trial) : null;

  return (
    <section className="bg-slate-900 border border-violet-500/30 rounded-xl p-5 shadow-lg" aria-labelledby="rolling-calc-title">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 id="rolling-calc-title" className="font-bold text-white flex items-center gap-2 text-sm">
          <Calculator className="w-4 h-4 text-violet-400" /> Hitung Nilai Teori (Manual)
        </h3>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Pilih baris data">
          {rows.map((r, i) => {
            const t = rowToTrial(r);
            const tried = attemptsOf(r) > 0;
            return (
              <button
                key={i}
                id={`rolling-row-tab-${i + 1}`}
                role="tab"
                aria-selected={i === index}
                onClick={() => setSelected(i)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                  i === index
                    ? "bg-violet-500/20 border-violet-400 text-violet-200"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                }`}
              >
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${tried ? "bg-emerald-400" : "bg-slate-500"}`} />
                Baris {i + 1}{t ? ` · ${t.shape === "solid" ? "Pejal" : "Berongga"} ${t.thetaDeg}°` : ""}
              </button>
            );
          })}
        </div>
      </div>

      {!trial ? (
        <p className="text-sm text-amber-300/80">
          Baris ini tidak memiliki data sensor (bentuk, sudut, a grafik). Gunakan tombol &quot;Tambahkan Data&quot; untuk merekam baris pengukuran.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
          {/* Reference panel: known inputs only */}
          <aside className="bg-black/30 border border-slate-700 rounded-lg p-4 font-mono text-xs text-slate-300 space-y-1.5 h-fit" aria-label="Data yang diketahui">
            <div className="font-sans font-bold text-slate-200 text-sm mb-2">Data Diketahui</div>
            <div>Bentuk : {trial.shape === "solid" ? "Silinder pejal" : "Silinder berongga"}</div>
            <div>m      = {trial.mass} kg</div>
            <div>R      = {trial.r} m</div>
            <div>Ri     = {trial.shape === "hollow" ? `${trial.rInner} m` : "— (pejal)"}</div>
            <div>θ      = {trial.thetaDeg}°</div>
            <div>g      = {PRACTICUM_G} m/s²</div>
            <div className="pt-1.5 mt-1.5 border-t border-slate-700 text-emerald-300">a_grafik = {trial.aGraph.toFixed(3)} m/s²</div>
          </aside>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {FIELDS.map((field) => {
                const meta = FIELD_LABEL[field];
                const current = str(row[FIELD_KEY[field]]);
                const checked = str(row[CHECKED_KEY[field]]);
                const isStale = attempts > 0 && current !== checked;
                const fb = checkedFeedback?.[field];
                const inputId = `rolling-input-${field}-row-${index + 1}`;
                return (
                  <div key={field} className="flex flex-col gap-2">
                    <label htmlFor={inputId} className="text-xs text-slate-400 font-bold">
                      {meta.label} <span className="text-violet-300 font-mono font-normal">({meta.unit})</span>
                    </label>
                    <input
                      id={inputId}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={current}
                      placeholder={meta.placeholder}
                      onChange={(e) => updateRow({ [FIELD_KEY[field]]: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 focus:border-violet-400 outline-none rounded-lg p-2 text-white font-mono text-sm"
                    />
                    <div className="min-h-[22px] flex flex-col gap-1" aria-live="polite">
                      {attempts > 0 && fb && !isStale && <StatusBadge feedback={fb} />}
                      {attempts > 0 && isStale && (
                        <span className="text-[11px] text-slate-400 italic">Diubah — klik Periksa untuk umpan balik baru</span>
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
                id="rolling-check-button"
                onClick={handleCheck}
                disabled={allEmpty}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold text-sm rounded-lg flex items-center gap-2 transition"
              >
                <CheckCircle2 className="w-4 h-4" /> Periksa Jawaban
              </button>
              <button
                id="rolling-reveal-button"
                onClick={handleReveal}
                disabled={attempts < 1 || revealed}
                title={attempts < 1 ? "Coba hitung dan periksa minimal satu kali terlebih dahulu" : undefined}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white font-bold text-sm rounded-lg flex items-center gap-2 transition"
              >
                <Eye className="w-4 h-4" /> Tampilkan nilai teori
              </button>
              <span className="text-xs text-slate-500">Percobaan: {attempts}</span>
            </div>

            {reference && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-100/90" role="status">
                <div className="font-bold mb-1">Nilai teori (penggunaan tombol ini dicatat):</div>
                <div className="font-mono flex flex-wrap gap-x-6 gap-y-1">
                  <span>a teori = {formatReference("aTheory", reference.aTheory)}</span>
                  <span>Error = {formatReference("errorPct", reference.errorPct)}</span>
                  <span>I = {formatReference("inertia", reference.inertia)}</span>
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <HelpCircle className="w-3 h-3" />
              Anda tetap boleh lanjut ke baris atau langkah berikutnya walaupun jawaban belum sesuai. Jawaban disimpan apa adanya.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Review (REVIEW step) ───────────────────────────────────────────────────

export function RollingReview({ rows }: { rows: Row[] }) {
  const measured = rows
    .map((row, i) => ({ row, i, trial: rowToTrial(row) }))
    .filter((x): x is { row: Row; i: number; trial: RollingTrial } => x.trial !== null);

  let correctCount = 0;
  let filledCount = 0;
  const revealedCount = measured.filter(({ row }) => revealedOf(row)).length;

  const evaluated = measured.map(({ row, i, trial }) => {
    const fb = validateRollingAnswers(trial, {
      aTheory: str(row[FIELD_KEY.aTheory]),
      errorPct: str(row[FIELD_KEY.errorPct]),
      inertia: str(row[FIELD_KEY.inertia]),
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
                <th className="p-3">θ</th>
                <th className="p-3">a Grafik (m/s²)</th>
                {FIELDS.map((f) => (
                  <th key={f} className="p-3">{FIELD_LABEL[f].label} ({FIELD_LABEL[f].unit})</th>
                ))}
                <th className="p-3">Percobaan</th>
                <th className="p-3">Nilai teori dibuka</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {evaluated.length === 0 && (
                <tr><td colSpan={9} className="p-6 text-center text-white/50 italic">Belum ada baris pengukuran.</td></tr>
              )}
              {evaluated.map(({ row, i, trial, fb }) => {
                const showReference = attemptsOf(row) > 0 || revealedOf(row);
                const ref = showReference ? computeReferenceValues(trial) : null;
                return (
                  <tr key={i} className="align-top">
                    <td className="p-3 font-mono">{i + 1}</td>
                    <td className="p-3">{trial.shape === "solid" ? "Pejal" : "Berongga"}</td>
                    <td className="p-3 font-mono">{trial.thetaDeg}°</td>
                    <td className="p-3 font-mono">{trial.aGraph.toFixed(3)}</td>
                    {FIELDS.map((f) => (
                      <td key={f} className="p-3">
                        <div className="font-mono mb-1">{str(row[FIELD_KEY[f]]) || "—"}</div>
                        <StatusBadge feedback={fb[f]} />
                        {fb[f].status === "check_formula" && fb[f].diagnosis && (
                          <div className="text-[11px] text-rose-200/70 mt-1 max-w-[180px]">{DIAGNOSIS_TEXT[fb[f].diagnosis!]}</div>
                        )}
                        {ref && fb[f].status !== "correct" && (
                          <div className="text-[11px] text-white/40 mt-1 font-mono">acuan: {formatReference(f, ref[f])}</div>
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
