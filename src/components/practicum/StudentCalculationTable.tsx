"use client";

import React, { useMemo, useState } from "react";
import { Calculator, Check, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { validateStudentCalculation } from "@/physics/validation";

export interface StudentCalcColumn {
  key: string;
  header: string;
  precision?: number;
  highlightHeaderClass?: string;
  placeholder?: string;
  readOnly?: boolean;
}

export interface StudentCalcRow {
  rowId: string | number;
  label: string;
  values: Record<string, string>;
  expected?: Record<string, number | null | undefined>;
}

export interface StudentCalculationTableProps {
  title: string;
  description: string;
  columns: StudentCalcColumn[];
  rows: StudentCalcRow[];
  assistedCells: Record<string, boolean>;
  hasValidated: boolean;
  onCellChange: (rowId: string | number, colKey: string, value: string) => void;
  onValidate: () => void;
  onAutoFillAssistance: () => void;
  referenceTable?: {
    title?: string;
    description?: string;
    headers: string[];
    rows: (string | number)[][];
  };
  className?: string;
}

export function StudentCalculationTable({
  title,
  description,
  columns,
  rows,
  assistedCells,
  hasValidated,
  onCellChange,
  onValidate,
  onAutoFillAssistance,
  referenceTable,
  className = "",
}: StudentCalculationTableProps) {
  const [showReference, setShowReference] = useState(false);

  // Validation statistics
  const stats = useMemo(() => {
    let correctCount = 0;
    let assistedCount = 0;
    let totalFields = 0;

    rows.forEach((row) => {
      columns.forEach((col) => {
        if (col.readOnly) return;
        if (row.expected && row.expected[col.key] === null) return;

        totalFields++;
        const cellId = `${row.rowId}_${col.key}`;
        const enteredVal = row.values[col.key] ?? "";
        const expectedVal = row.expected?.[col.key];
        const isAssisted = !!assistedCells[cellId];

        if (
          expectedVal !== undefined &&
          expectedVal !== null &&
          validateStudentCalculation(enteredVal, expectedVal)
        ) {
          if (isAssisted) {
            assistedCount++;
          } else {
            correctCount++;
          }
        }
      });
    });

    return {
      correctCount,
      assistedCount,
      totalFields,
      percentCorrect: totalFields > 0 ? Math.round((correctCount / totalFields) * 100) : 0,
      isPerfect: correctCount === totalFields && totalFields > 0,
    };
  }, [rows, columns, assistedCells]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Validation Feedback Banner */}
      {hasValidated && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
            stats.isPerfect
              ? "bg-emerald-950/80 border-emerald-500 text-emerald-300"
              : stats.assistedCount > 0
              ? "bg-purple-950/80 border-purple-500 text-purple-300"
              : "bg-amber-950/80 border-amber-500 text-amber-300"
          }`}
        >
          <div className="flex items-center gap-3">
            {stats.isPerfect ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-purple-400 shrink-0" />
            )}
            <div>
              <div className="font-bold text-sm">
                Hasil Validasi Perhitungan: {stats.correctCount} / {stats.totalFields} Benar
                {stats.assistedCount > 0 && (
                  <span className="text-purple-300 font-normal ml-2">
                    ({stats.assistedCount} dibantu)
                  </span>
                )}
              </div>
              <div className="text-slate-400 text-[11px] mt-0.5">
                {stats.isPerfect
                  ? `Luar biasa! Seluruh ${stats.totalFields} nilai perhitungan Anda akurat sesuai hukum fisika.`
                  : stats.assistedCount > 0
                  ? `Terdapat ${stats.assistedCount} sel terisi melalui tombol bantuan (tanda ungu) yang dikeluarkan dari skor benar mandiri. Silakan coba hitung mandiri untuk menyelesaikannya.`
                  : "Periksa kembali sel berwarna merah. Pastikan rumus dihitung dengan teliti (toleransi ±2%)."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Calculation Table Card */}
      <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold font-mono text-cyan-300 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-cyan-400" />
              {title}
            </h3>
            <p className="text-xs text-slate-400 mt-1">{description}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onValidate}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-mono font-bold transition-all shadow-[0_0_12px_rgba(37,99,235,0.4)]"
            >
              <Check className="w-4 h-4" />
              Periksa Perhitungan
            </button>

            <button
              type="button"
              onClick={onAutoFillAssistance}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-mono transition-all border border-slate-700"
              title="Isi dengan nilai kunci sistem untuk bantuan belajar"
            >
              <Calculator className="w-3.5 h-3.5 text-cyan-400" />
              Bantu Lengkapi
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-slate-800 text-slate-300 border-b border-slate-700">
                <th className="p-2.5">No</th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`p-2.5 ${col.highlightHeaderClass ?? ""}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((row) => (
                <tr key={row.rowId} className="hover:bg-slate-800/40">
                  <td className="p-2.5 font-bold text-cyan-400">{row.label}</td>
                  {columns.map((col) => {
                    const cellId = `${row.rowId}_${col.key}`;
                    const val = row.values[col.key] ?? "";

                    if (col.readOnly) {
                      return (
                        <td key={col.key} className="p-2 text-slate-300 font-mono">
                          <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg inline-block min-w-[70px] text-center">
                            {val || "-"}
                          </span>
                        </td>
                      );
                    }

                    const isNotApplicable = row.expected && row.expected[col.key] === null;
                    if (isNotApplicable) {
                      return (
                        <td key={col.key} className="p-2 text-center text-slate-500 font-mono">
                          <span className="px-2.5 py-1 bg-slate-950/50 border border-slate-800/60 text-slate-500 rounded-lg inline-block min-w-[70px] text-center">
                            -
                          </span>
                        </td>
                      );
                    }

                    const expectedNum = row.expected?.[col.key];
                    const isAssisted = !!assistedCells[cellId];
                    const accurate =
                      hasValidated && expectedNum !== undefined && expectedNum !== null
                        ? validateStudentCalculation(val, expectedNum)
                        : false;
                    const hasError =
                      hasValidated && expectedNum !== undefined && expectedNum !== null && !accurate;

                    let visualStyle = "bg-slate-950 border-slate-700 text-white focus:border-cyan-400";
                    if (hasValidated) {
                      if (accurate) {
                        if (isAssisted) {
                          visualStyle = "bg-purple-950/40 border-purple-500 text-purple-300";
                        } else {
                          visualStyle = "bg-emerald-950/40 border-emerald-500 text-emerald-300";
                        }
                      } else if (hasError) {
                        visualStyle = "bg-rose-950/40 border-rose-500 text-rose-300";
                      }
                    }

                    const placeholderText =
                      process.env.NODE_ENV === "development" &&
                      expectedNum !== undefined &&
                      expectedNum !== null
                        ? `K: ${expectedNum.toFixed(col.precision ?? 3)}`
                        : col.placeholder ?? "0.000";

                    return (
                      <td key={col.key} className="p-2">
                        <div className="relative inline-block">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={val}
                            onChange={(e) => onCellChange(row.rowId, col.key, e.target.value)}
                            placeholder={placeholderText}
                            className={`w-20 px-2 py-1.5 rounded-lg text-xs font-mono transition-all border outline-none ${visualStyle}`}
                            title={isAssisted ? "Nilai terisi melalui bantuan sistem" : undefined}
                          />
                          {hasValidated && accurate && isAssisted && (
                            <span
                              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-purple-500 ring-2 ring-slate-900"
                              title="Dibantu"
                            />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Optional Reference Table Accordion */}
      {referenceTable && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <button
            type="button"
            onClick={() => setShowReference((prev) => !prev)}
            className="w-full flex items-center justify-between text-left text-sm font-mono text-slate-300 hover:text-cyan-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-bold">Kunci Referensi Sistem</span>
              <span className="text-xs text-slate-400">
                ({referenceTable.title ?? "Perbandingan Hasil Perhitungan Teoretis"})
              </span>
            </div>
            {showReference ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showReference && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 overflow-x-auto">
              {referenceTable.description && (
                <p className="text-xs text-slate-400 mb-3 font-mono">{referenceTable.description}</p>
              )}
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 text-slate-300 border-b border-slate-700">
                    {referenceTable.headers.map((h, idx) => (
                      <th key={idx} className="p-2">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {referenceTable.rows.map((r, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-800/30">
                      {r.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className={`p-2 ${cIdx === 0 ? "font-bold text-cyan-400" : "text-slate-300"}`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
