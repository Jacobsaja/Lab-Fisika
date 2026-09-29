"use client";

import React, { useState, useId } from "react";
import { Plus, Trash2, Eraser } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ColumnDef<TRow extends Record<string, unknown>> {
  key: keyof TRow;
  header: string;
  unit?: string;
  /** Number of decimal places for numeric formatting */
  precision?: number;
  /** Whether to show this column as editable */
  editable?: boolean;
  width?: string;
}

interface DataTableProps<TRow extends Record<string, unknown>> {
  columns: ColumnDef<TRow>[];
  rows: TRow[];
  onRowsChange: (rows: TRow[]) => void;
  /** Factory for a blank new row */
  newRowFactory: () => TRow;
  maxRows?: number;
  className?: string;
  caption?: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatCell<TRow extends Record<string, unknown>>(
  value: TRow[keyof TRow],
  col: ColumnDef<TRow>
): string {
  if (typeof value === "number" && col.precision !== undefined) {
    return value.toFixed(col.precision);
  }
  return String(value ?? "");
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DataTable<TRow extends Record<string, unknown>>({
  columns,
  rows,
  onRowsChange,
  newRowFactory,
  maxRows = 50,
  className = "",
  caption,
}: DataTableProps<TRow>) {
  const [editingCell, setEditingCell] = useState<{
    rowIdx: number;
    key: keyof TRow;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const captionId = useId();

  const addRow = () => {
    if (rows.length >= maxRows) return;
    onRowsChange([...rows, newRowFactory()]);
  };

  const deleteRow = (idx: number) => {
    onRowsChange(rows.filter((_, i) => i !== idx));
    setEditingCell(null);
  };

  const clearAll = () => {
    onRowsChange([]);
    setEditingCell(null);
  };

  const startEdit = (rowIdx: number, key: keyof TRow) => {
    setEditingCell({ rowIdx, key });
    setEditValue(String(rows[rowIdx][key] ?? ""));
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const { rowIdx, key } = editingCell;
    const updated = rows.map((row, i) => {
      if (i !== rowIdx) return row;
      const col = columns.find((c) => c.key === key);
      const rawValue = editValue;
      const numeric = parseFloat(rawValue);
      const value = (col?.precision !== undefined && !isNaN(numeric)
        ? numeric
        : rawValue) as TRow[keyof TRow];
      return { ...row, [key]: value };
    });
    onRowsChange(updated);
    setEditingCell(null);
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Escape") commitEdit();
  };

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={addRow}
          disabled={rows.length >= maxRows}
          className="btn-primary"
          style={{ fontSize: "0.8125rem", padding: "8px 14px" }}
          aria-label="Tambah baris data"
        >
          <Plus className="w-4 h-4" /> Tambah Baris
        </button>
        <button
          onClick={clearAll}
          disabled={rows.length === 0}
          className="btn-ghost"
          style={{ fontSize: "0.8125rem", padding: "8px 14px" }}
          aria-label="Hapus semua data"
        >
          <Eraser className="w-4 h-4" /> Hapus Semua
        </button>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.75rem",
            color: "var(--color-text-2)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {rows.length}/{maxRows} baris
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse" }}
          aria-labelledby={caption ? captionId : undefined}
        >
          {caption && (
            <caption
              id={captionId}
              style={{
                padding: "10px 16px",
                textAlign: "left",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--color-text-2)",
                background: "var(--color-surface-2)",
              }}
            >
              {caption}
            </caption>
          )}
          <thead>
            <tr style={{ background: "var(--color-surface-2)" }}>
              <th
                scope="col"
                style={{
                  padding: "10px 12px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--color-text-2)",
                  textAlign: "center",
                  width: "48px",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                No.
              </th>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  scope="col"
                  style={{
                    padding: "10px 12px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--color-text-2)",
                    textAlign: "right",
                    width: col.width,
                    borderBottom: "1px solid var(--color-border)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {col.header}
                  {col.unit && (
                    <span
                      style={{
                        marginLeft: "4px",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "0.6875rem",
                        color: "var(--color-primary)",
                        fontWeight: 400,
                        textTransform: "none",
                      }}
                    >
                      ({col.unit})
                    </span>
                  )}
                </th>
              ))}
              <th
                scope="col"
                style={{
                  padding: "10px 12px",
                  width: "52px",
                  borderBottom: "1px solid var(--color-border)",
                }}
                aria-label="Aksi"
              />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  style={{
                    padding: "32px 16px",
                    textAlign: "center",
                    color: "var(--color-text-2)",
                    fontSize: "0.875rem",
                    fontStyle: "italic",
                  }}
                >
                  Belum ada data. Klik &quot;Tambah Baris&quot; untuk memulai.
                </td>
              </tr>
            ) : (
              rows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  style={{
                    borderBottom: rowIdx < rows.length - 1 ? "1px solid var(--color-border)" : "none",
                    background: rowIdx % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-2)",
                    transition: "background var(--transition)",
                  }}
                >
                  {/* Row number */}
                  <td
                    style={{
                      padding: "10px 12px",
                      textAlign: "center",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "0.75rem",
                      color: "var(--color-text-2)",
                    }}
                  >
                    {rowIdx + 1}
                  </td>
                  {/* Data cells */}
                  {columns.map((col) => {
                    const isEditing =
                      editingCell?.rowIdx === rowIdx && editingCell?.key === col.key;
                    const cellValue = row[col.key];

                    return (
                      <td
                        key={String(col.key)}
                        style={{ padding: 0, textAlign: "right", position: "relative" }}
                      >
                        {isEditing && col.editable !== false ? (
                          <input
                            type={typeof cellValue === "number" ? "number" : "text"}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={handleCellKeyDown}
                            autoFocus
                            style={{
                              width: "100%",
                              height: "100%",
                              padding: "10px 12px",
                              background: "var(--color-bg)",
                              border: "1px solid var(--color-primary)",
                              borderRadius: "var(--radius-sm)",
                              color: "var(--color-text)",
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: "0.875rem",
                              textAlign: "right",
                              outline: "none",
                              boxSizing: "border-box"
                            }}
                            aria-label={`Nilai ${col.header} baris ${rowIdx + 1}`}
                          />
                        ) : (
                          <button
                            onClick={() =>
                              col.editable !== false && startEdit(rowIdx, col.key)
                            }
                            style={{
                              background: "transparent",
                              border: "none",
                              color:
                                typeof cellValue === "number"
                                  ? "var(--color-text)"
                                  : "var(--color-text-2)",
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: "0.9375rem",
                              fontWeight: 500,
                              cursor: col.editable !== false ? "text" : "default",
                              padding: "10px 12px",
                              width: "100%",
                              height: "100%",
                              textAlign: "right",
                              display: "block",
                            }}
                            aria-label={
                              col.editable !== false
                                ? `Edit ${col.header} baris ${rowIdx + 1}: ${formatCell(cellValue, col)}`
                                : `${col.header} baris ${rowIdx + 1}: ${formatCell(cellValue, col)}`
                            }
                          >
                            {formatCell(cellValue, col)}
                          </button>
                        )}
                      </td>
                    );
                  })}
                  {/* Delete button */}
                  <td style={{ padding: "6px 12px", textAlign: "center" }}>
                    <button
                      onClick={() => deleteRow(rowIdx)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--color-text-2)",
                        cursor: "pointer",
                        padding: "4px 6px",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "14px",
                        transition: "color var(--transition)",
                      }}
                      onMouseOver={(e) =>
                        ((e.currentTarget as HTMLElement).style.color = "var(--color-error)")
                      }
                      onMouseOut={(e) =>
                        ((e.currentTarget as HTMLElement).style.color = "var(--color-text-2)")
                      }
                      aria-label={`Hapus baris ${rowIdx + 1}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
