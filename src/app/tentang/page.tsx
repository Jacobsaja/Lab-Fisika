"use client";

import React from "react";
import Link from "next/link";
import {
  FlaskConical,
  Activity,
  Zap,
  ShieldCheck,
  Code2,
  Cpu,
  Code,
  Mail,
  ArrowLeft
} from "lucide-react";

export default function TentangPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#06080D",
        fontFamily: "'Inter', sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Background Glows */}
      <div className="absolute top-0 left-[20%] w-[800px] h-[800px] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-[10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />

      {/* Top Navbar */}
      <header
        style={{
          padding: "32px 60px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          zIndex: 10
        }}
      >
        <div style={{ flex: 1, display: "flex" }}>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
            }}
            className="group"
          >
            <div style={{
              background: "rgba(255,255,255,0.1)",
              padding: "8px",
              borderRadius: "8px",
              backdropFilter: "blur(10px)",
              transition: "all 0.3s"
            }} className="group-hover:bg-white/20">
              <ArrowLeft className="w-5 h-5 text-white" />
            </div>
            <span style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "1px", color: "white" }}>
              KEMBALI
            </span>
          </Link>
        </div>

        <nav
          style={{
            display: "flex",
            background: "rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "100px",
            padding: "4px",
          }}
        >
          <Link href="/" style={{ padding: "8px 24px", fontSize: "0.875rem", fontWeight: 600, color: "white", textDecoration: "none", borderRadius: "100px", transition: "background 0.2s" }} className="hover:bg-white/10">
            BERANDA
          </Link>
          <Link href="/tentang" style={{ padding: "8px 24px", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-bg)", background: "white", textDecoration: "none", borderRadius: "100px" }}>
            TENTANG
          </Link>
        </nav>

        <div style={{ flex: 1 }} />
      </header>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-16 pt-12 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

        {/* Left Column: Text & Features */}
        <div className="flex flex-col gap-8">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold text-sm mb-6">
              <FlaskConical className="w-4 h-4" />
              Platform Edukasi Masa Depan
            </div>
            <h1 className="text-5xl font-extrabold text-white tracking-tight leading-[1.1] mb-6">
              Simulasi Fisika <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                Presisi Tinggi.
              </span>
            </h1>
            <p className="text-lg text-white/70 leading-relaxed text-balance">
              Virtual Lab Fisika ini dirancang untuk mensimulasikan hukum-hukum alam dengan akurasi matematis absolut.
              Menyediakan lingkungan eksperimen yang aman, interaktif, dan tak terbatas bagi mahasiswa maupun pelajar untuk mengeksplorasi konsep-konsep fisika fundamental.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
            <FeatureCard
              icon={<Activity className="w-6 h-6 text-emerald-400" />}
              title="Fixed-Timestep Engine"
              desc="Simulasi berjalan secara deterministik tanpa gangguan frame-rate."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6 text-amber-400" />}
              title="Real-Time Data"
              desc="Pengambilan data dan grafik dihasilkan secara instan saat simulasi berjalan."
            />
            <FeatureCard
              icon={<ShieldCheck className="w-6 h-6 text-blue-400" />}
              title="Aman & Praktis"
              desc="Eksperimen tanpa risiko kerusakan alat atau bahaya keselamatan."
            />
            <FeatureCard
              icon={<Code2 className="w-6 h-6 text-purple-400" />}
              title="18 Modul Lengkap"
              desc="Mencakup materi dari kinematika dasar hingga elektromagnetika lanjutan."
            />
          </div>
        </div>

        {/* Right Column: Cards & Visuals */}
        <div className="relative">
          {/* Decorative floating elements */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl animate-pulse" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl animate-pulse delay-1000" />

          <div className="flex flex-col gap-6">
            {/* Engine Tech Card */}
            <div className="relative overflow-hidden p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl group hover:border-white/20 transition-colors">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <Cpu className="w-10 h-10 text-white/50 mb-6 group-hover:text-blue-400 transition-colors" />
              <h3 className="text-2xl font-bold text-white mb-2">Arsitektur Modern</h3>
              <p className="text-white/60 leading-relaxed mb-6">
                Dibangun menggunakan Next.js 15, React 19, dan perhitungan vektor presisi tinggi secara langsung di browser tanpa keterlambatan server.
              </p>
              <div className="flex gap-4">
                <TechBadge name="Next.js" />
                <TechBadge name="React" />
                <TechBadge name="TypeScript" />
              </div>
            </div>

            {/* Developer Card */}
            <div className="relative overflow-hidden p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl group hover:border-white/20 transition-colors">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 p-[2px]">
                  <div className="w-full h-full bg-[#0B1020] rounded-full flex items-center justify-center">
                    <span className="text-xl font-bold text-white">JS</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Jacob Simorangkir</h3>
                  <span className="text-white/50 text-sm">Lab Fisika Virtual</span>
                </div>
              </div>
              <div className="flex gap-4">
                <a href="https://github.com/Jacobsaja/Lab-Fisika" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-medium">
                  <Code className="w-4 h-4" />
                  Source Code
                </a>
                <a href="https://www.instagram.com/itsjacbs?stkn=MTZ5bGg1NG1jMGQ3Ng==" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-medium">
                  <Mail className="w-4 h-4" />
                  Hubungi Kami
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h4 className="text-white font-semibold mb-1">{title}</h4>
        <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function TechBadge({ name }: { name: string }) {
  return (
    <span className="px-3 py-1 rounded-full border border-white/10 text-white/70 text-xs font-semibold bg-white/5">
      {name}
    </span>
  );
}
