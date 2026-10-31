import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { DataTable, ColumnDef } from "@/components/practicum/DataTable";

interface MockRow {
  id: number;
  x: number;
  y: string;
}

const COLUMNS: ColumnDef<MockRow>[] = [
  { key: "x", header: "Posisi X", unit: "cm", precision: 2, editable: true },
  { key: "y", header: "Keterangan", editable: true },
];

describe("1. DataTable Keyboard Navigation & ARIA Grid", () => {
  const newRowFactory = (): MockRow => ({ id: Date.now(), x: 0, y: "" });

  it("renders with proper ARIA grid structure", () => {
    const rows: MockRow[] = [{ id: 1, x: 10.5, y: "Titik A" }];
    const onRowsChange = jest.fn();

    render(
      <DataTable
        columns={COLUMNS}
        rows={rows}
        onRowsChange={onRowsChange}
        newRowFactory={newRowFactory}
        caption="Tabel Uji ARIA"
      />
    );

    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.getAllByRole("row").length).toBeGreaterThanOrEqual(2); // 1 header + 1 data row
    expect(screen.getAllByRole("columnheader").length).toBe(COLUMNS.length + 2); // No + cols + Aksi
    expect(screen.getAllByRole("gridcell").length).toBeGreaterThanOrEqual(COLUMNS.length);
  });

  it("enters edit mode on click and on focus", () => {
    const rows: MockRow[] = [{ id: 1, x: 10.5, y: "Titik A" }];
    const onRowsChange = jest.fn();

    render(
      <DataTable
        columns={COLUMNS}
        rows={rows}
        onRowsChange={onRowsChange}
        newRowFactory={newRowFactory}
      />
    );

    // Initial state has button
    const cellBtn = screen.getByRole("button", { name: /Edit Posisi X/i });
    expect(cellBtn).toBeInTheDocument();

    // Focus triggers edit mode
    fireEvent.focus(cellBtn);
    const input = screen.getByLabelText(/Nilai Posisi X baris 1/i);
    expect(input).toBeInTheDocument();
  });

  it("Enter commits edit and moves to the next row or appends row", () => {
    let rows: MockRow[] = [
      { id: 1, x: 10, y: "A" },
      { id: 2, x: 20, y: "B" },
    ];
    const onRowsChange = jest.fn((newRows) => {
      rows = newRows;
    });

    const { rerender } = render(
      <DataTable
        columns={COLUMNS}
        rows={rows}
        onRowsChange={onRowsChange}
        newRowFactory={newRowFactory}
      />
    );

    // Focus first row x cell
    fireEvent.focus(screen.getByRole("button", { name: /Edit Posisi X baris 1/i }));
    const inputRow1 = screen.getByLabelText(/Nilai Posisi X baris 1/i);
    fireEvent.change(inputRow1, { target: { value: "15.5" } });
    fireEvent.keyDown(inputRow1, { key: "Enter" });

    expect(onRowsChange).toHaveBeenCalled();
    expect(rows[0].x).toBe(15.5);

    // Rerender with updated rows to verify row 2 is now in edit
    rerender(
      <DataTable
        columns={COLUMNS}
        rows={rows}
        onRowsChange={onRowsChange}
        newRowFactory={newRowFactory}
      />
    );

    const inputRow2 = screen.getByLabelText(/Nilai Posisi X baris 2/i);
    expect(inputRow2).toBeInTheDocument();
  });

  it("Tab and Shift+Tab navigate between editable columns", () => {
    let rows: MockRow[] = [{ id: 1, x: 10, y: "A" }];
    const onRowsChange = jest.fn((newRows) => {
      rows = newRows;
    });

    const { rerender } = render(
      <DataTable
        columns={COLUMNS}
        rows={rows}
        onRowsChange={onRowsChange}
        newRowFactory={newRowFactory}
      />
    );

    // Start editing column 1 (x)
    fireEvent.focus(screen.getByRole("button", { name: /Edit Posisi X baris 1/i }));
    const inputX = screen.getByLabelText(/Nilai Posisi X baris 1/i);
    fireEvent.change(inputX, { target: { value: "12.0" } });

    // Press Tab to move to column 2 (y)
    fireEvent.keyDown(inputX, { key: "Tab" });
    expect(onRowsChange).toHaveBeenCalled();

    rerender(
      <DataTable
        columns={COLUMNS}
        rows={rows}
        onRowsChange={onRowsChange}
        newRowFactory={newRowFactory}
      />
    );

    const inputY = screen.getByLabelText(/Nilai Keterangan baris 1/i);
    expect(inputY).toBeInTheDocument();

    // Press Shift+Tab to move back to column 1 (x)
    fireEvent.keyDown(inputY, { key: "Tab", shiftKey: true });

    rerender(
      <DataTable
        columns={COLUMNS}
        rows={rows}
        onRowsChange={onRowsChange}
        newRowFactory={newRowFactory}
      />
    );

    expect(screen.getByLabelText(/Nilai Posisi X baris 1/i)).toBeInTheDocument();
  });

  it("ArrowDown and ArrowUp navigate rows vertically", () => {
    let rows: MockRow[] = [
      { id: 1, x: 1, y: "A" },
      { id: 2, x: 2, y: "B" },
    ];
    const onRowsChange = jest.fn((newRows) => {
      rows = newRows;
    });

    const { rerender } = render(
      <DataTable
        columns={COLUMNS}
        rows={rows}
        onRowsChange={onRowsChange}
        newRowFactory={newRowFactory}
      />
    );

    // Start editing row 1
    fireEvent.focus(screen.getByRole("button", { name: /Edit Posisi X baris 1/i }));
    const input1 = screen.getByLabelText(/Nilai Posisi X baris 1/i);

    // ArrowDown
    fireEvent.keyDown(input1, { key: "ArrowDown" });
    rerender(
      <DataTable
        columns={COLUMNS}
        rows={rows}
        onRowsChange={onRowsChange}
        newRowFactory={newRowFactory}
      />
    );

    expect(screen.getByLabelText(/Nilai Posisi X baris 2/i)).toBeInTheDocument();

    // ArrowUp
    const input2 = screen.getByLabelText(/Nilai Posisi X baris 2/i);
    fireEvent.keyDown(input2, { key: "ArrowUp" });
    rerender(
      <DataTable
        columns={COLUMNS}
        rows={rows}
        onRowsChange={onRowsChange}
        newRowFactory={newRowFactory}
      />
    );

    expect(screen.getByLabelText(/Nilai Posisi X baris 1/i)).toBeInTheDocument();
  });

  it("Escape cancels edit without saving changes", () => {
    const rows: MockRow[] = [{ id: 1, x: 10, y: "A" }];
    const onRowsChange = jest.fn();

    render(
      <DataTable
        columns={COLUMNS}
        rows={rows}
        onRowsChange={onRowsChange}
        newRowFactory={newRowFactory}
      />
    );

    fireEvent.focus(screen.getByRole("button", { name: /Edit Posisi X baris 1/i }));
    const input = screen.getByLabelText(/Nilai Posisi X baris 1/i);
    fireEvent.change(input, { target: { value: "999" } });
    fireEvent.keyDown(input, { key: "Escape" });

    // onRowsChange should NOT be called on Escape
    expect(onRowsChange).not.toHaveBeenCalled();
    // Reverts to button
    expect(screen.getByRole("button", { name: /Edit Posisi X baris 1/i })).toBeInTheDocument();
  });
});
