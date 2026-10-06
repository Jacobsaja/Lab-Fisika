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
  Info
} from "lucide-react";
import { PRACTICUMS } from "@/data/practicums";
import { ModuleVisualizer } from "@/components/ui/ModuleVisualizer";

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomePage() {
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, isTransitioning]);

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
      <style dangerouslySetInnerHTML={{__html: `
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
