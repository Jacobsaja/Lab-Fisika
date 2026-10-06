import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface ExploreShellProps {
  title: string;
  description: string;
  category: string;
  children: React.ReactNode;
}

export function ExploreShell({ title, description, category, children }: ExploreShellProps) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center h-14 bg-slate-900 border-b border-slate-800 px-4 shrink-0 shadow-sm">
        <Link 
          href="/explore" 
          className="mr-4 text-slate-400 hover:text-white transition-colors p-2 -ml-2 rounded-lg hover:bg-white/5"
          aria-label="Kembali ke Eksplorasi"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex flex-col">
          <div className="text-[10px] uppercase tracking-wider font-bold text-amber-500 mb-0.5">
            Eksplorasi · {category}
          </div>
          <h1 className="text-sm font-bold text-slate-100">{title}</h1>
        </div>
      </header>

      {/* Intro Bar */}
      <div className="bg-slate-900/50 border-b border-slate-800/50 p-4 shrink-0">
        <p className="text-slate-300 text-sm max-w-4xl mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      {/* Main Simulation Area */}
      <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto relative">
        {children}
      </main>
    </div>
  );
}
