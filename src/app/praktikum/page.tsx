"use client";

import React from "react";
import Link from "next/link";
import { FlaskConical, ChevronLeft } from "lucide-react";
import { PRACTICUMS } from "@/data/practicums";

const AVAILABLE_PRAKTIKUM_IDS = new Set([
  "pap",
  "gjb",
  "atwood-glbb",
  "atwood-glb",
  "gmb",
  "menggelinding",
  "momen-inersia-1",
  "momen-inersia-2",
  "osilasi-torsional",
  "hkm",
  "h2n",
  "hkem",
  "ssg",
]);

const CATEGORIES = [
  {
    id: "pengukuran",
    label: "Pengukuran & Ketelitian",
    ids: ["pap"],
  },
  {
    id: "mekanika",
    label: "Mekanika Klasik",
    ids: [
      "gjb",
      "atwood-glbb",
      "atwood-glb",
      "gmb",
      "menggelinding",
      "momen-inersia-1",
      "momen-inersia-2",
      "gerak-osilasi",
      "osilasi-torsional",
      "hkm",
      "h2n",
      "hkem",
    ],
  },
  {
    id: "gelombang",
    label: "Gelombang & Optika",
    ids: ["rgb", "ssg"],
  },
  {
    id: "listrik-magnet",
    label: "Listrik & Magnet",
    ids: ["pbl", "em", "em-2", "pbl-2", "pl", "jw", "kap"],
  },
];

export default function PraktikumIndexPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-200">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between h-16 bg-slate-900 border-b border-slate-800 px-6 shadow-sm">
        <Link
          href="/"
          className="flex items-center gap-3 text-white hover:opacity-80 transition-opacity"
          aria-label="Kembali ke Beranda"
        >
          <ChevronLeft className="w-5 h-5 text-slate-400" />
          <div className="bg-white/10 p-1.5 rounded-md">
            <FlaskConical className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold tracking-wide">LAB FISIKA</span>
        </Link>
        <div className="text-sm font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
          MODE PRAKTIKUM
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 sm:p-10 flex flex-col gap-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-white">Praktikum Virtual Terpandu</h1>
          <p className="text-slate-400 leading-relaxed">
            Ikuti prosedur eksperimen laboratorium fisika dasar langkah demi langkah: pahami tujuan modul, atur instrumen perakitan, lakukan pengukuran dan pencatatan data ke tabel, hitung analisis regresi atau grafik, serta selesaikan pertanyaan evaluasi.
          </p>
        </div>

        <div className="flex flex-col gap-12">
          {CATEGORIES.map((cat) => {
            const items = cat.ids
              .map((id) => PRACTICUMS.find((p) => p.id === id))
              .filter(Boolean) as typeof PRACTICUMS;

            if (items.length === 0) return null;

            return (
              <section key={cat.id} className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-slate-200">{cat.label}</h2>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item) => {
                    const isAvailable = AVAILABLE_PRAKTIKUM_IDS.has(item.id);

                    if (isAvailable) {
                      return (
                        <Link
                          key={item.id}
                          href={`/praktikum/${item.id}`}
                          className="bg-slate-900 border border-slate-700 hover:border-blue-500/50 p-5 rounded-xl flex flex-col gap-3 transition-colors group relative overflow-hidden"
                        >
                          <div
                            className="absolute top-0 left-0 w-1 h-full"
                            style={{ backgroundColor: item.accent }}
                          />
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">
                              {item.title}
                            </h3>
                            <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 shrink-0">
                              {item.tagline}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {item.description}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-auto pt-2">
                            {item.info.map((inf, i) => (
                              <span
                                key={i}
                                className="text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded"
                              >
                                {inf.label}: <strong className="text-slate-200">{inf.value}</strong>
                              </span>
                            ))}
                          </div>
                        </Link>
                      );
                    }

                    return (
                      <div
                        key={item.id}
                        className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl flex flex-col gap-3 opacity-60 relative overflow-hidden select-none"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-bold text-slate-300">{item.title}</h3>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full shrink-0">
                            Segera Hadir
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {item.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-auto pt-2">
                          {item.info.map((inf, i) => (
                            <span
                              key={i}
                              className="text-[11px] text-slate-500 bg-slate-800/40 px-2 py-0.5 rounded"
                            >
                              {inf.label}: {inf.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
