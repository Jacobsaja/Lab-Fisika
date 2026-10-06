"use client";

import React, { useState } from "react";
import { ExploreShell } from "@/components/explore/ExploreShell";
import { Caliper } from "@/components/practicum/instruments/Caliper";
import { OhausBalance } from "@/components/practicum/instruments/OhausBalance";
import { countSignificantFigures, formatMeasurement, uncertaintyFromLeastCount } from "@/physics/measurement";
import { Calculator, Ruler, Target } from "lucide-react";

export default function PAPExplorePage() {
  const [instrument, setInstrument] = useState<"caliper" | "ohaus">("caliper");
  const [usePreset, setUsePreset] = useState(true);
  const [customValue, setCustomValue] = useState(12.34);
  const [activeObjectId, setActiveObjectId] = useState("c1");
  const [showTrueValue, setShowTrueValue] = useState(false);
  
  const [currentReading, setCurrentReading] = useState(0);
  const [sigFigInput, setSigFigInput] = useState("");

  const CALIPER_OBJECTS = [
    { id: "c1", name: "Balok Logam (Lebar Celah)", trueValue: 18.55, mode: "inner" },
    { id: "c2", name: "Koin Rp500 (Diameter)", trueValue: 27.45, mode: "outer" },
  ];
  const OHAUS_OBJECTS = [
    { id: "o1", name: "Balok Tembaga", trueValue: 435.60 },
    { id: "o2", name: "Silinder Kuningan", trueValue: 124.30 },
  ];

  const objects = instrument === "caliper" ? CALIPER_OBJECTS : OHAUS_OBJECTS;
  const activeObject = objects.find(o => o.id === activeObjectId) || objects[0];
  
  const trueValue = usePreset ? activeObject.trueValue : customValue;
  const mode = usePreset ? (activeObject as any).mode || "outer" : "outer";
  const name = usePreset ? activeObject.name : "Benda Kustom";

  const nst = instrument === "caliper" ? 0.05 : 0.1;
  const unit = instrument === "caliper" ? "mm" : "g";
  const deltaX = uncertaintyFromLeastCount(nst);
  const finalResult = formatMeasurement(currentReading, deltaX);

  const sigFigAnalysis = countSignificantFigures(sigFigInput);
  const difference = Math.abs(currentReading - trueValue);

  return (
    <ExploreShell
      title="Pengukuran dan Angka Penting"
      category="Pengukuran"
      description="Eksplorasi penggunaan alat ukur dasar (Jangka Sorong & Neraca O'haus). Pelajari ketelitian alat, ketidakpastian tunggal, serta aturan angka penting secara bebas."
    >
      <div className="flex flex-col gap-6 p-4 sm:p-6 w-full">
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-4">
            <h3 className="font-bold text-white/90 flex items-center gap-2"><Ruler className="w-4 h-4"/> Instrumen & Objek</h3>
            <div className="flex gap-2">
              <button onClick={() => { setInstrument("caliper"); setUsePreset(true); setActiveObjectId("c1"); }} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${instrument === "caliper" ? "bg-blue-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}>Jangka Sorong</button>
              <button onClick={() => { setInstrument("ohaus"); setUsePreset(true); setActiveObjectId("o1"); }} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${instrument === "ohaus" ? "bg-blue-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}>Neraca O'haus</button>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm font-bold text-white/50">Mode Objek:</span>
              <div className="flex gap-2 text-xs">
                <button onClick={() => setUsePreset(true)} className={`px-3 py-1 rounded-md transition-colors ${usePreset ? "bg-white/20 text-white" : "text-white/40 hover:bg-white/10"}`}>Preset</button>
                <button onClick={() => setUsePreset(false)} className={`px-3 py-1 rounded-md transition-colors ${!usePreset ? "bg-white/20 text-white" : "text-white/40 hover:bg-white/10"}`}>Kustom</button>
              </div>
            </div>

            {usePreset ? (
              <div className="flex flex-wrap gap-2">
                {objects.map(obj => (
                  <button key={obj.id} onClick={() => setActiveObjectId(obj.id)} className={`px-3 py-2 rounded-lg text-sm transition-colors ${activeObjectId === obj.id ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-white/60 border border-transparent hover:bg-white/10"}`}>
                    {obj.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="text-xs text-white/60">Nilai Sebenarnya ({unit}): {customValue}</label>
                <input type="range" min={0} max={instrument === "caliper" ? 150 : 610} step={0.01} value={customValue} onChange={e => setCustomValue(parseFloat(e.target.value))} className="w-full" />
                <input type="number" min={0} max={instrument === "caliper" ? 150 : 610} step={0.01} value={customValue} onChange={e => setCustomValue(parseFloat(e.target.value))} className="bg-black/30 text-white p-2 rounded-md font-mono text-sm border border-white/20 focus:outline-none focus:border-blue-500" />
              </div>
            )}
          </div>

          {/* Reading Result */}
          <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-4">
            <h3 className="font-bold text-white/90 flex items-center gap-2"><Target className="w-4 h-4"/> Laporan Pengukuran</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Nilai Ukur (x)</div>
                <div className="font-mono text-xl text-emerald-400">{currentReading} {unit}</div>
              </div>
              <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Ketidakpastian (Δx)</div>
                <div className="font-mono text-xl text-amber-400">{deltaX} {unit}</div>
                <div className="text-[9px] text-white/30 mt-1">½ × NST ({nst})</div>
              </div>
            </div>
            <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30 text-center mt-auto">
              <div className="text-xs text-blue-300/70 uppercase tracking-wider mb-2">Penulisan Laporan Akhir (x ± Δx)</div>
              <div className="font-mono text-2xl font-bold text-white">{finalResult} {unit}</div>
            </div>
          </div>
        </div>

        {/* Instrument Rendering */}
        <div className="bg-[#0a0f1c] rounded-xl border border-white/10 p-6 flex flex-col items-center overflow-hidden">
          <div className="w-full flex justify-end mb-4">
            <button onClick={() => setShowTrueValue(!showTrueValue)} className="text-xs flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full text-white/60 transition-colors">
              {showTrueValue ? "Sembunyikan" : "Tampilkan"} Nilai Sebenarnya
            </button>
          </div>
          
          <div className="w-full max-w-3xl">
            {instrument === "caliper" ? (
              <Caliper mode="explore" objectWidthMm={trueValue} objectName={name} measurementMode={mode as any} nstMm={nst} onReadingChange={setCurrentReading} />
            ) : (
              <OhausBalance valueGrams={trueValue} onReadingChange={setCurrentReading} />
            )}
          </div>

          {showTrueValue && (
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm font-mono bg-white/5 px-6 py-3 rounded-lg border border-white/10">
              <div className="text-white/60">Asli: <span className="text-white font-bold">{trueValue} {unit}</span></div>
              <div className="text-white/60">Terbaca: <span className="text-emerald-400 font-bold">{currentReading} {unit}</span></div>
              <div className="text-white/60">Selisih: <span className={difference > 0 ? "text-amber-400" : "text-emerald-400"}>{difference.toFixed(3)} {unit}</span></div>
            </div>
          )}
        </div>

        {/* SigFig Analysis */}
        <div className="flex flex-col md:flex-row gap-6 mt-4">
          <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-4">
            <h3 className="font-bold text-white/90 flex items-center gap-2"><Calculator className="w-4 h-4"/> Analisis Angka Penting</h3>
            <p className="text-xs text-white/50 leading-relaxed">Ketik sembarang angka untuk melihat aturan angka penting yang berlaku, atau ambil langsung dari pembacaan alat.</p>
            
            <div className="flex gap-2">
              <input type="text" value={sigFigInput} onChange={e => setSigFigInput(e.target.value)} placeholder="Contoh: 0.0500" className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white font-mono focus:outline-none focus:border-blue-500" />
              <button onClick={() => setSigFigInput(currentReading.toString())} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap">
                Ambil dari Alat
              </button>
            </div>

            {sigFigInput && (
              <div className="mt-4 flex flex-col gap-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">{sigFigAnalysis.count}</span>
                  <span className="text-white/60 text-sm uppercase font-bold tracking-wider">Angka Penting</span>
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  {sigFigAnalysis.groups.map((g, i) => (
                    <div key={i} className="flex gap-3 items-start bg-black/20 p-2.5 rounded-lg border border-white/5">
                      <div className={`font-mono font-bold text-lg px-2 py-0.5 rounded ${g.isSignificant ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/10 text-red-400/70"}`}>
                        {g.text}
                      </div>
                      <div className="text-xs text-white/70 mt-1 leading-relaxed">{g.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-full md:w-1/3 bg-blue-950/30 border border-blue-900/50 rounded-xl p-5 flex flex-col gap-3">
            <h3 className="font-bold text-blue-400 flex items-center gap-2">💡 Coba Ini</h3>
            <ul className="text-sm text-blue-200/70 flex flex-col gap-3 list-disc pl-4 marker:text-blue-500">
              <li>Ubah mode objek ke "Kustom" dan masukkan nilai <strong className="text-white">12.34</strong> pada jangka sorong. Amati apakah hasil ukur persis sama atau dibulatkan ke kelipatan NST terdekat.</li>
              <li>Klik "Ambil dari Alat" di panel angka penting, lalu tambahkan nol di belakangnya (misal <code className="bg-black/30 px-1 rounded text-white font-mono">12.3500</code>). Apakah jumlah angka pentingnya berubah?</li>
              <li>Bandingkan penulisan ketidakpastian antara jangka sorong (Δx = 0.025 atau 0.05) dengan neraca O'haus.</li>
            </ul>
          </div>
        </div>

      </div>
    </ExploreShell>
  );
}
