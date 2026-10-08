"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  Play,
  Share2,
  Bookmark,
  Info,
  Atom,
  Orbit,
  Rocket
} from "lucide-react";
import { PRACTICUMS } from "@/data/practicums";
import { ModuleVisualizer } from "@/components/ui/ModuleVisualizer";

// ─── Component ────────────────────────────────────────────────────────────────

function LandingView({ onEnter }: { onEnter: () => void }) {
  const MATH_FORMULAS = [
    "F = m a", "v = v₀ + a t", "E = m c²", "λ = v / f",
    "V = I R", "τ = I α", "p = m v", "F = G (m₁ m₂) / r²",
    "Q = C V", "Φ = B A cos(θ)", "∇ × E = -∂B/∂t", "iℏ ∂Ψ/∂t = ĤΨ",
    "S = k log W", "Δx Δp ≥ ℏ/2", "PV = nRT"
  ];

  return (
    <div style={{
      height: "100dvh",
      width: "100vw",
      background: "#020617",
      color: "white",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes pulse-glow {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(56, 189, 248, 0.5)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 50px rgba(56, 189, 248, 0.9)); transform: scale(1.05); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(10deg); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(-10deg); }
        }
        @keyframes float-up {
          0% { transform: translateY(100px); opacity: 0; }
          20% { opacity: 0.15; }
          80% { opacity: 0.15; }
          100% { transform: translateY(-100px); opacity: 0; }
        }
        @keyframes spin-slow {
          100% { transform: rotate(360deg); }
        }
        @keyframes spin-slow-reverse {
          100% { transform: rotate(-360deg); }
        }
        @keyframes pan-bg {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 100%; }
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 40px 100px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2);
        }
        .neon-text {
          background: linear-gradient(to right, #38bdf8, #818cf8, #c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .animated-grid {
          position: absolute;
          inset: -100%;
          background-image: 
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), 
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 80px 80px;
          animation: pan-bg 40s linear infinite;
          transform: perspective(1000px) rotateX(60deg) scale(2.5) translateY(-100px);
          pointer-events: none;
        }
      `}} />

      {/* Deep Background Glows */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "70vw", height: "70vw", background: "radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, transparent 60%)", filter: "blur(80px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "10%", left: "10%", width: "40vw", height: "40vw", background: "radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 60%)", filter: "blur(60px)", pointerEvents: "none", animation: "float-slow 12s infinite" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "10%", width: "40vw", height: "40vw", background: "radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 60%)", filter: "blur(60px)", pointerEvents: "none", animation: "float-fast 15s infinite" }} />

      {/* Sacred Geometry Rotating Background */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", opacity: 0.25 }}>
        <svg viewBox="0 0 800 800" style={{ width: "150vh", height: "150vh", animation: "spin-slow 120s linear infinite" }}>
          {/* Outer Orbits */}
          <ellipse cx="400" cy="400" rx="350" ry="150" fill="none" stroke="#38bdf8" strokeWidth="2" transform="rotate(30 400 400)" />
          <ellipse cx="400" cy="400" rx="350" ry="150" fill="none" stroke="#c084fc" strokeWidth="2" transform="rotate(-60 400 400)" />
          <circle cx="400" cy="400" r="300" fill="none" stroke="white" strokeWidth="1" strokeDasharray="10 20" />
          <circle cx="400" cy="400" r="200" fill="none" stroke="white" strokeWidth="0.5" />
          <path d="M 100 400 L 700 400 M 400 100 L 400 700" stroke="white" strokeWidth="0.5" strokeDasharray="5 15" />
        </svg>
      </div>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", opacity: 0.15 }}>
        <svg viewBox="0 0 800 800" style={{ width: "120vh", height: "120vh", animation: "spin-slow-reverse 90s linear infinite" }}>
          <ellipse cx="400" cy="400" rx="250" ry="100" fill="none" stroke="#818cf8" strokeWidth="3" transform="rotate(45 400 400)" />
          <ellipse cx="400" cy="400" rx="250" ry="100" fill="none" stroke="#38bdf8" strokeWidth="3" transform="rotate(-45 400 400)" />
          <polygon points="400,100 660,600 140,600" fill="none" stroke="white" strokeWidth="1" strokeDasharray="4 8" />
          <polygon points="400,700 140,200 660,200" fill="none" stroke="white" strokeWidth="1" strokeDasharray="4 8" />
        </svg>
      </div>

      {/* Floating Math Formulas */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", maskImage: "radial-gradient(circle at center, black 40%, transparent 80%)", WebkitMaskImage: "radial-gradient(circle at center, black 40%, transparent 80%)" }}>
        {MATH_FORMULAS.map((formula, idx) => (
          <div 
            key={idx}
            style={{
              position: "absolute",
              color: "rgba(255,255,255,0.4)",
              fontFamily: "monospace",
              fontSize: "1.25rem",
              fontWeight: "bold",
              whiteSpace: "nowrap",
              left: `${10 + ((idx * 37) % 80)}%`,
              top: `${10 + ((idx * 53) % 80)}%`,
              animation: "float-up 15s linear infinite",
              animationDelay: `${(idx * 0.9)}s`,
              animationDuration: `${10 + (idx % 8)}s`
            }}
          >
            {formula}
          </div>
        ))}
      </div>

      {/* Particle Dust */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {[...Array(25)].map((_, i) => (
          <div 
            key={`dust-${i}`}
            style={{
              position: "absolute",
              borderRadius: "50%",
              width: `${2 + (i % 4)}px`,
              height: `${2 + (i % 4)}px`,
              background: i % 2 === 0 ? "#38bdf8" : "#c084fc",
              left: `${(i * 47) % 100}%`,
              top: `${(i * 73) % 100}%`,
              animation: "pulse-glow 3s infinite, float-slow 8s infinite",
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${3 + (i % 4)}s`,
              boxShadow: "0 0 10px currentColor"
            }}
          />
        ))}
      </div>

      {/* 3D Grid floor */}
      <div className="animated-grid" />

      {/* Main Glassmorphism Card */}
      <div className="glass-card" style={{ zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "24px", padding: "40px", borderRadius: "32px", maxWidth: "800px", margin: "0 20px" }}>
        
        {/* Core Icon container with spinning rings */}
        <div style={{ position: "relative", filter: "drop-shadow(0 0 30px rgba(56, 189, 248, 0.6))" }}>
          <div style={{ position: "absolute", inset: "-10px", borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#38bdf8", borderRightColor: "#c084fc", animation: "spin-slow 4s linear infinite" }} />
          <div style={{ position: "absolute", inset: "-20px", borderRadius: "50%", border: "1px dashed rgba(255,255,255,0.2)", animation: "spin-slow-reverse 8s linear infinite" }} />
          
          <div style={{ animation: "pulse-glow 4s ease-in-out infinite", background: "rgba(3, 7, 18, 0.7)", padding: "20px", borderRadius: "50%", border: "1px solid rgba(56, 189, 248, 0.4)", backdropFilter: "blur(10px)" }}>
            <FlaskConical className="w-16 h-16 text-sky-400" />
          </div>
        </div>
        
        <div style={{ position: "relative", zIndex: 2 }}>
          <h1 style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 12px 0", lineHeight: 1.1 }}>
            Lab Fisika <span className="neon-text">Virtual</span>
          </h1>
          <p style={{ fontSize: "clamp(1rem, 1.8vw, 1.15rem)", color: "rgba(255,255,255,0.8)", maxWidth: "540px", margin: "0 auto", lineHeight: 1.6, fontWeight: 300 }}>
            Eksplorasi hukum alam melalui simulasi interaktif. Belajar mekanika, dinamika, dan pengukuran dalam lingkungan digital yang imersif.
          </p>
        </div>

        <button 
          onClick={onEnter}
          style={{
            marginTop: "8px",
            background: "linear-gradient(135deg, #0ea5e9, #6366f1, #a855f7)",
            backgroundSize: "200% 200%",
            animation: "pan-bg 4s ease infinite",
            color: "white",
            border: "1px solid rgba(255,255,255,0.3)",
            padding: "16px 40px",
            borderRadius: "100px",
            fontSize: "1.1rem",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            boxShadow: "0 15px 40px rgba(99, 102, 241, 0.4), inset 0 2px 0 rgba(255,255,255,0.4)",
            transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
            position: "relative",
            overflow: "hidden"
          }}
          onMouseEnter={(e) => { 
            e.currentTarget.style.transform = "scale(1.08) translateY(-4px)"; 
            e.currentTarget.style.boxShadow = "0 30px 60px rgba(99, 102, 241, 0.6), inset 0 2px 0 rgba(255,255,255,0.5)"; 
          }}
          onMouseLeave={(e) => { 
            e.currentTarget.style.transform = "scale(1) translateY(0)"; 
            e.currentTarget.style.boxShadow = "0 15px 40px rgba(99, 102, 241, 0.4), inset 0 2px 0 rgba(255,255,255,0.4)"; 
          }}
        >
          <span style={{ position: "relative", zIndex: 2, letterSpacing: "1px" }}>INISIASI SIMULASI</span>
          <div style={{ background: "rgba(255,255,255,0.25)", borderRadius: "50%", padding: "6px", position: "relative", zIndex: 2, backdropFilter: "blur(8px)" }}>
            <ChevronRight className="w-6 h-6 text-white" strokeWidth={3} />
          </div>
        </button>
      </div>

      {/* Footer Disclaimer */}
      <div style={{ position: "absolute", bottom: "16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", zIndex: 10, width: "100%", padding: "0 24px" }}>
        <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", margin: 0, fontWeight: 500, letterSpacing: "0.1em" }}>
          DIBUAT OLEH <span style={{ color: "white", fontWeight: 800 }}>Jacob S</span>
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.05)", padding: "6px 20px", borderRadius: "100px", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(12px)" }}>
          <Info className="w-3 h-3 text-sky-400" />
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", margin: 0, fontWeight: 400 }}>
            <strong style={{ color: "rgba(255,255,255,0.9)" }}>Disclaimer:</strong> Aplikasi ini bersifat tidak resmi (unofficial) dan ditujukan murni untuk keperluan edukasi.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [showApp, setShowApp] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const activeData = PRACTICUMS[activeIndex];

  const handleNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % PRACTICUMS.length);
      setIsTransitioning(false);
    }, 250);
  };

  const handlePrev = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveIndex((prev) => (prev - 1 + PRACTICUMS.length) % PRACTICUMS.length);
      setIsTransitioning(false);
    }, 250);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!showApp) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, isTransitioning, showApp]);

  if (!showApp) {
    return <LandingView onEnter={() => setShowApp(true)} />;
  }

  return (
    <main
      style={{
        height: "100dvh",
        width: "100vw",
        background: activeData.bgGradient,
        color: "var(--color-text)",
        overflow: "hidden",
        position: "relative",
        transition: "background 800ms ease",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Add keyframes globally just for this layout */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}} />

      {/* ─── Top Navbar ─────────────────────────────────────────────── */}
      <header
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: "24px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Logo */}
        <div style={{ flex: 1, display: "flex" }}>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
            }}
          >
            <div style={{
              background: "rgba(255,255,255,0.1)",
              padding: "8px",
              borderRadius: "8px",
              backdropFilter: "blur(10px)",
            }}>
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <span style={{ fontWeight: 700, fontSize: "1.125rem", letterSpacing: "1px", color: "white" }}>
              LAB FISIKA
            </span>
          </Link>
        </div>

        {/* Center Pill Nav */}
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
          <Link href="/explore" style={{ padding: "8px 24px", fontSize: "0.875rem", fontWeight: 600, color: "white", textDecoration: "none", borderRadius: "100px", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
            EKSPLORASI
          </Link>
          <Link href="/praktikum" style={{ padding: "8px 24px", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-bg)", background: "white", textDecoration: "none", borderRadius: "100px" }}>
            PRAKTIKUM
          </Link>
          <Link href="/tentang" style={{ padding: "8px 24px", fontSize: "0.875rem", fontWeight: 600, color: "white", textDecoration: "none", borderRadius: "100px", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
            TENTANG
          </Link>
        </nav>

        {/* Right Icons */}
        <div style={{ display: "flex", gap: "16px", flex: 1, justifyContent: "flex-end" }}>
          <button style={{ background: "transparent", border: "none", color: "white", cursor: "pointer", opacity: 0.7 }}><Share2 className="w-5 h-5" /></button>
          <button style={{ background: "transparent", border: "none", color: "white", cursor: "pointer", opacity: 0.7 }}><Bookmark className="w-5 h-5" /></button>
        </div>
      </header>

      {/* ─── Main Content (3 Columns) ───────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1.4fr 1fr",
          alignItems: "center",
          padding: "80px 60px 0 60px",
          gap: "40px",
        }}
      >
        {/* LEFT COLUMN: Controls stay completely stationary */}
        <div
          style={{
            height: "480px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            position: "relative",
          }}
        >
          {/* Arrow Controls (Fixed in place, comfortably below header) */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
            <button
              onClick={handlePrev}
              aria-label="Previous slide"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                backdropFilter: "blur(10px)",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNext}
              aria-label="Next slide"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                backdropFilter: "blur(10px)",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Animated Slide Content (Title, Description, CTA) */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              opacity: isTransitioning ? 0 : 1,
              transform: isTransitioning ? "translateY(6px)" : "translateY(0px)",
              transition: "opacity 200ms ease, transform 200ms ease",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "clamp(1.75rem, 2.75vw, 3rem)",
                  fontWeight: 800,
                  lineHeight: 1.15,
                  letterSpacing: "-0.02em",
                  color: "white",
                  marginBottom: "14px",
                  textWrap: "balance",
                  textShadow: "0 4px 24px rgba(0,0,0,0.5)"
                }}
              >
                {activeData.title.split(" ").map((word, i, arr) => (
                  <React.Fragment key={i}>
                    {i === arr.length - 1 ? <span style={{ color: activeData.accent }}>{word}</span> : word}
                    {i < arr.length - 1 && " "}
                  </React.Fragment>
                ))}
              </h1>
              <p
                style={{
                  fontSize: "1rem",
                  color: "rgba(255,255,255,0.7)",
                  lineHeight: 1.5,
                  maxWidth: "400px",
                  fontWeight: 400,
                }}
              >
                {activeData.description}
              </p>
            </div>

            <Link
              href={`/praktikum/${activeData.id}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                background: "white",
                color: "black",
                padding: "14px 22px",
                borderRadius: "100px",
                fontWeight: 700,
                fontSize: "0.95rem",
                textDecoration: "none",
                width: "fit-content",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                transition: "transform 0.2s",
                marginTop: "auto",
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              Mulai Praktikum
              <div style={{ background: "black", color: "white", borderRadius: "50%", padding: "6px" }}>
                <ChevronRight className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </div>

        {/* CENTER COLUMN: The "Product" (Physics Visual) */}
        <div
          style={{
            height: "480px",
            position: "relative",
            opacity: isTransitioning ? 0 : 1,
            transform: isTransitioning ? "scale(0.96)" : "scale(1)",
            transition: "opacity 200ms ease, transform 200ms ease",
          }}
        >
          <ModuleVisualizer
            id={activeData.id}
            accent={activeData.accent}
            icon={activeData.icon}
          />
        </div>

        {/* RIGHT COLUMN: Info / Specs */}
        <div
          style={{
            height: "480px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "flex-end",
            textAlign: "right",
          }}
        >
          {/* Animated Info blocks */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "28px",
              alignItems: "flex-end",
              opacity: isTransitioning ? 0 : 1,
              transform: isTransitioning ? "translateY(6px)" : "translateY(0px)",
              transition: "opacity 200ms ease, transform 200ms ease",
            }}
          >
            {/* Big Tagline */}
            <div>
              <span style={{ fontSize: "1.35rem", fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>
                {activeData.tagline}
              </span>
            </div>

            {/* Info blocks */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {activeData.info.map((item, idx) => (
                <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: "1.15rem", color: "white", fontWeight: 500 }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stationary Pagination numbers */}
          <div>
            <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", marginBottom: "10px", display: "block" }}>
              Pilih Modul (Halaman {activeIndex + 1}/{PRACTICUMS.length}):
            </span>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              {/* Pagination window of 3 */}
              {[
                activeIndex === 0 ? 0 : activeIndex === PRACTICUMS.length - 1 ? PRACTICUMS.length - 3 : activeIndex - 1,
                activeIndex === 0 ? 1 : activeIndex === PRACTICUMS.length - 1 ? PRACTICUMS.length - 2 : activeIndex,
                activeIndex === 0 ? 2 : activeIndex === PRACTICUMS.length - 1 ? PRACTICUMS.length - 1 : activeIndex + 1,
              ].map((idx) => (
                <button
                  key={PRACTICUMS[idx].id}
                  onClick={() => {
                    if (isTransitioning || activeIndex === idx) return;
                    setIsTransitioning(true);
                    setTimeout(() => {
                      setActiveIndex(idx);
                      setIsTransitioning(false);
                    }, 200);
                  }}
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: activeIndex === idx ? "white" : "rgba(255,255,255,0.1)",
                    color: activeIndex === idx ? "black" : "white",
                    border: "none",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {(idx + 1).toString().padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Bottom Bar ───────────────────────────────────────────── */}
      <footer
        style={{
          padding: "24px 60px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "rgba(255,255,255,0.5)",
          fontSize: "0.875rem",
        }}
      >
        <div style={{ display: "flex", gap: "24px" }}>
          <span>© 2026 Lab Fisika Virtual</span>
          <span>Edukasi Sains</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Info className="w-4 h-4" />
          <span>Gunakan panah keyboard (← →) untuk navigasi</span>
        </div>
      </footer>
    </main>
  );
}
