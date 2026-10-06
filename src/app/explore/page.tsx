"use client";

import React from "react";
import Link from "next/link";
import { FlaskConical, ChevronLeft, RotateCw } from "lucide-react";
import { PRACTICUMS } from "@/data/practicums";
import { EXPLORE_REGISTRY } from "@/data/exploreRegistry";

const CATEGORIES = [
  { id: "pengukuran", label: "Pengukuran" },
  { id: "mekanika", label: "Mekanika" },
  { id: "gelombang", label: "Gelombang" },
  { id: "listrik", label: "Listrik" },
  { id: "elektromagnetisme", label: "Elektromagnetisme" },
];

export default function ExploreIndexPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-200">
      <header className="sticky top-0 z-50 flex items-center justify-between h-16 bg-slate-900 border-b border-slate-800 px-6 shadow-sm">
        <Link href="/" className="flex items-center gap-3 text-white hover:opacity-80 transition-opacity">
          <ChevronLeft className="w-5 h-5 text-slate-400" />
          <div className="bg-white/10 p-1.5 rounded-md">
            <FlaskConical className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold tracking-wide">LAB FISIKA</span>
        </Link>
        <div className="text-sm font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
          MODE EKSPLORASI
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 sm:p-10 flex flex-col gap-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-white">Eksplorasi Bebas</h1>
          <p className="text-slate-400">
            Jelajahi berbagai simulasi interaktif tanpa batas waktu, tugas, maupun penilaian. Mode ini sangat cocok untuk memvisualisasikan fenomena fisika sebelum Anda melakukan praktikum terpandu.
          </p>
        </div>

        <div className="flex flex-col gap-12">
          {CATEGORIES.map((cat) => {
            // Find modules that belong to this category from EXPLORE_REGISTRY
            const modules = Object.values(EXPLORE_REGISTRY).filter(m => m.category === cat.id);
            if (modules.length === 0) return null;

            return (
              <section key={cat.id} className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-slate-200">{cat.label}</h2>
                  <div className="flex-1 h-px bg-slate-800"></div>
                </div>

                {modules.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {modules.map((mod) => (
                      mod.available ? (
                        <Link 
                          key={mod.id} 
                          href={mod.route}
                          className="bg-slate-900 border border-slate-700 hover:border-amber-500/50 p-5 rounded-xl flex flex-col gap-3 transition-colors group relative overflow-hidden"
                        >
                          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                          <h3 className="font-bold text-white group-hover:text-amber-400 transition-colors">{mod.title}</h3>
                          <p className="text-xs text-slate-400 leading-relaxed">{mod.desc}</p>
                        </Link>
                      ) : (
                        <div key={mod.id} className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl flex flex-col gap-3 opacity-60">
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold text-slate-300">{mod.title}</h3>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">Segera Hadir</span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">{mod.desc}</p>
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 italic bg-slate-900/30 p-4 rounded-lg border border-slate-800/50 text-center">
                    Belum ada modul eksplorasi untuk kategori ini. Segera hadir.
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
