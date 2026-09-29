"use client";

import React, { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { Tooltip } from "@/components/ui/Tooltip";
import { NumberInput, ParameterSlider } from "@/components/ui/NumberInput";
import { ModeCard } from "@/components/ui/ModeCard";
import { HintBox } from "@/components/practicum/HintBox";
import { ExperimentTimer } from "@/components/practicum/ExperimentTimer";
import { DataTable, type ColumnDef } from "@/components/practicum/DataTable";
import { QuestionCard, type Question } from "@/components/practicum/QuestionCard";
import { Compass, FlaskConical } from "lucide-react";

// ─── DUMMY DATA (dev only) ─────────────────────────────────────────────────────

const DUMMY_HINTS = [
  "Ingat hukum Newton kedua: Resultan gaya = massa × percepatan (F = ma).",
  "Untuk bidang miring, uraikan gaya gravitasi menjadi komponen sejajar dan tegak lurus bidang.",
  "Gaya normal adalah komponen gaya yang tegak lurus permukaan bidang miring: N = mg cos θ.",
];

const DUMMY_QUESTIONS: Question[] = [
  {
    id: "q1",
    type: "numeric",
    prompt: "Sebuah benda bermassa 5 kg jatuh bebas dari ketinggian 20 m. Berapa kecepatannya saat menyentuh tanah? (g = 9.8 m/s²)",
    expectedValue: 19.8,
    tolerance: 0.5,
    toleranceType: "absolute",
    unit: "m/s",
    feedbackHint: "Gunakan persamaan energi kinetik = energi potensial, atau v² = 2gh.",
  },
  {
    id: "q2",
    type: "text",
    prompt: "Jelaskan perbedaan antara kecepatan (velocity) dan laju (speed) dalam fisika.",
    keywords: ["vektor", "besaran", "arah"],
    minLength: 30,
    feedbackHint: "Pikirkan tentang apakah besaran tersebut memiliki arah atau tidak.",
  },
  {
    id: "q3",
    type: "multiple-choice",
    prompt: "Manakah yang merupakan contoh besaran vektor?",
    options: ["Massa", "Waktu", "Perpindahan", "Suhu"],
    correctIndex: 2,
    feedbackHint: "Besaran vektor memiliki besar dan arah.",
  },
  {
    id: "q4",
    type: "short-calculation",
    prompt: "Hitung gaya yang diperlukan untuk memberikan percepatan 3 m/s² pada benda bermassa 8 kg.",
    expectedValue: 24,
    tolerance: 0.1,
    toleranceType: "absolute",
    unit: "N",
    feedbackHint: "Terapkan Hukum Newton Kedua: F = m × a.",
  },
];

interface PendulumRow extends Record<string, unknown> {
  trial: number;
  length_cm: number;
  period_s: number;
  g_calc: number;
}

const PENDULUM_COLUMNS: ColumnDef<PendulumRow>[] = [
  { key: "trial", header: "Percobaan", editable: false },
  { key: "length_cm", header: "Panjang", unit: "cm", precision: 1, editable: true },
  { key: "period_s", header: "Periode T", unit: "s", precision: 3, editable: true },
  { key: "g_calc", header: "g hitung", unit: "m/s²", precision: 2, editable: false },
];

let trialCounter = 1;
function newPendulumRow(): PendulumRow {
  const n = trialCounter++;
  return { trial: n, length_cm: 0, period_s: 0, g_calc: 0 };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const NAV_TABS = [
  { id: "layout", label: "Tabs / Modal / Tooltip" },
  { id: "inputs", label: "Inputs" },
  { id: "hints", label: "HintBox" },
  { id: "timer", label: "Timer" },
  { id: "table", label: "DataTable" },
  { id: "questions", label: "QuestionCard" },
  { id: "cards", label: "ModeCard" },
];

export default function DevComponentsPage() {
  const [activeTab, setActiveTab] = useState("layout");
  const [modalOpen, setModalOpen] = useState(false);
  const [numberValue, setNumberValue] = useState(9.8);
  const [sliderValue, setSliderValue] = useState(0.5);
  const [pendulumRows, setPendulumRows] = useState<PendulumRow[]>([]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--color-bg)",
        color: "var(--color-text)",
        padding: "0",
      }}
    >
      {/* Dev banner */}
      <div
        role="banner"
        style={{
          background: "rgba(251, 191, 36, 0.15)",
          border: "0 0 1px 0",
          borderBottom: "1px solid rgba(251, 191, 36, 0.3)",
          padding: "8px 24px",
          textAlign: "center",
          fontSize: "0.8125rem",
          fontWeight: 600,
          color: "var(--color-warning)",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        ⚠ DEV ONLY — /dev/components — Tidak ditampilkan di produksi
      </div>

      <div style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto" }}>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            marginBottom: "8px",
            color: "var(--color-text)",
          }}
        >
          Component Showcase
        </h1>
        <p style={{ fontSize: "0.9375rem", color: "var(--color-text-2)", marginBottom: "32px" }}>
          Semua komponen UI ditampilkan dalam berbagai state menggunakan dummy data berlabel.
        </p>

        {/* Tab navigation */}
        <div style={{ marginBottom: "32px", overflowX: "auto" }}>
          <Tabs tabs={NAV_TABS} activeId={activeTab} onChange={setActiveTab} />
        </div>

        {/* ── Tabs / Modal / Tooltip ─────────────────────────────────── */}
        {activeTab === "layout" && (
          <Section title="Tabs, Modal, Tooltip">
            <Subsection title="Tabs — keyboard navigable (←/→/Home/End)">
              <Tabs
                tabs={[
                  { id: "a", label: "Tab A" },
                  { id: "b", label: "Tab B" },
                  { id: "c", label: "Tab C" },
                ]}
                activeId="b"
                onChange={() => {}}
              />
            </Subsection>

            <Subsection title="Modal — focus trap, Esc untuk tutup">
              <button className="btn-primary" onClick={() => setModalOpen(true)}>
                Buka Modal
              </button>
              <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Contoh Modal (Dummy)"
              >
                <p style={{ color: "var(--color-text-2)", marginBottom: "20px" }}>
                  Ini adalah contoh modal dengan focus trap. Tekan <kbd>Esc</kbd> atau klik di luar
                  untuk menutup. Tab dan Shift+Tab akan bersiklus di dalam elemen yang dapat difokus.
                </p>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button className="btn-ghost" onClick={() => setModalOpen(false)}>
                    Batal
                  </button>
                  <button className="btn-primary" onClick={() => setModalOpen(false)}>
                    Konfirmasi
                  </button>
                </div>
              </Modal>
            </Subsection>

            <Subsection title="Tooltip — posisi: atas / bawah / kiri / kanan">
              <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                {(["top", "bottom", "left", "right"] as const).map((pos) => (
                  <Tooltip key={pos} content={`Tooltip posisi ${pos}`} position={pos}>
                    <button className="btn-ghost">{pos}</button>
                  </Tooltip>
                ))}
              </div>
            </Subsection>
          </Section>
        )}

        {/* ── Inputs ─────────────────────────────────────────────────── */}
        {activeTab === "inputs" && (
          <Section title="NumberInput & ParameterSlider">
            <Subsection title="NumberInput — g (gravitasi)">
              <div style={{ maxWidth: "320px" }}>
                <NumberInput
                  label="Percepatan Gravitasi"
                  unit="m/s²"
                  value={numberValue}
                  onChange={setNumberValue}
                  min={1}
                  max={30}
                  step={0.1}
                  precision={2}
                />
              </div>
            </Subsection>

            <Subsection title="NumberInput — dinonaktifkan">
              <div style={{ maxWidth: "320px" }}>
                <NumberInput
                  label="Nilai Terkunci (disabled)"
                  unit="kg"
                  value={5.0}
                  onChange={() => {}}
                  disabled
                />
              </div>
            </Subsection>

            <Subsection title="ParameterSlider — koefisien restitusi">
              <div style={{ maxWidth: "400px" }}>
                <ParameterSlider
                  label="Koefisien Restitusi"
                  value={sliderValue}
                  onChange={setSliderValue}
                  min={0}
                  max={1}
                  step={0.01}
                  precision={2}
                />
              </div>
            </Subsection>

            <Subsection title="ParameterSlider — massa benda (dengan satuan)">
              <div style={{ maxWidth: "400px" }}>
                <ParameterSlider
                  label="Massa Benda"
                  unit="kg"
                  value={2.5}
                  onChange={() => {}}
                  min={0.1}
                  max={10}
                  step={0.1}
                  precision={1}
                />
              </div>
            </Subsection>
          </Section>
        )}

        {/* ── HintBox ────────────────────────────────────────────────── */}
        {activeTab === "hints" && (
          <Section title="HintBox — reveal progresif">
            <Subsection title="Petunjuk kosong (tidak ditampilkan)">
              <HintBox hints={[]} />
              <p style={{ color: "var(--color-text-2)", fontSize: "0.875rem", fontStyle: "italic" }}>
                (HintBox tidak ditampilkan jika hints kosong)
              </p>
            </Subsection>
            <Subsection title="3 petunjuk bertahap — klik untuk reveal">
              <div style={{ maxWidth: "560px" }}>
                <HintBox hints={DUMMY_HINTS} />
              </div>
            </Subsection>
          </Section>
        )}

        {/* ── Timer ──────────────────────────────────────────────────── */}
        {activeTab === "timer" && (
          <Section title="ExperimentTimer">
            <Subsection title="Tanpa durasi rekomendasi">
              <div style={{ maxWidth: "320px" }}>
                <ExperimentTimer />
              </div>
            </Subsection>
            <Subsection title="Dengan durasi rekomendasi 10 detik — peringatan lembut jika melebihi">
              <div style={{ maxWidth: "320px" }}>
                <ExperimentTimer recommendedDurationSec={10} />
              </div>
            </Subsection>
          </Section>
        )}

        {/* ── DataTable ──────────────────────────────────────────────── */}
        {activeTab === "table" && (
          <Section title="DataTable — generik & dapat diedit">
            <Subsection title="Tabel data percobaan pendulum">
              <DataTable
                columns={PENDULUM_COLUMNS}
                rows={pendulumRows}
                onRowsChange={setPendulumRows}
                newRowFactory={newPendulumRow}
                maxRows={20}
                caption="Data Percobaan Pendulum (Dummy)"
              />
            </Subsection>
          </Section>
        )}

        {/* ── QuestionCard ───────────────────────────────────────────── */}
        {activeTab === "questions" && (
          <Section title="QuestionCard — 4 tipe pertanyaan">
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "680px" }}>
              {DUMMY_QUESTIONS.map((q, idx) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  questionNumber={idx + 1}
                  onAnswerChange={(id, result) => console.log("[dev] answer:", id, result)}
                />
              ))}
            </div>
          </Section>
        )}

        {/* ── ModeCard ───────────────────────────────────────────────── */}
        {activeTab === "cards" && (
          <Section title="ModeCard — Jelajah & Praktikum">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "20px",
                maxWidth: "700px",
              }}
            >
              <ModeCard
                title="Jelajah"
                subtitle="Sandbox Bebas"
                description="Eksperimen tanpa batas dan tanpa penilaian. Ubah parameter, amati hasilnya."
                href="#"
                icon={<Compass className="w-7 h-7 text-blue-400" />}
                accentColor="var(--color-primary)"
              />
              <ModeCard
                title="Praktikum"
                subtitle="Terpandu"
                description="Ikuti praktikum terstruktur dengan tujuan, langkah, dan pertanyaan."
                href="#"
                icon={<FlaskConical className="w-7 h-7 text-purple-400" />}
                accentColor="#A78BFA"
                badge="3 tersedia"
                isNew
              />
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

/* ─── Layout helpers ─────────────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "48px" }}>
      <h2
        style={{
          fontSize: "1.25rem",
          fontWeight: 700,
          color: "var(--color-text)",
          marginBottom: "24px",
          paddingBottom: "12px",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>{children}</div>
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3
        style={{
          fontSize: "0.8125rem",
          fontWeight: 600,
          color: "var(--color-text-2)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "16px",
        }}
      >
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>{children}</div>
    </div>
  );
}
