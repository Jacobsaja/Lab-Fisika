"use client";

import React from "react";

interface ModuleVisualizerProps {
  icon: React.ReactNode;
  accent: string;
  id: string;
}

const MATH_FORMULAS = [
  "F = m a",
  "v = v₀ + a t",
  "E = m c²",
  "λ = v / f",
  "V = I R",
  "τ = I α",
  "p = m v",
  "F = G (m₁ m₂) / r²",
  "Q = C V",
  "Φ = B A cos(θ)"
];

export function ModuleVisualizer({ icon, accent, id }: ModuleVisualizerProps) {
  // Use id to seed some randomness so it looks consistent for the same module
  const seed = id.charCodeAt(0) + (id.charCodeAt(1) || 0);

  return (
    <div className="relative flex items-center justify-center w-full h-full overflow-visible group perspective-1000">
      
      {/* 1. Deep Background Glow */}
      <div 
        className="absolute w-96 h-96 rounded-full blur-[100px] opacity-30 transition-all duration-1000 group-hover:scale-110 group-hover:opacity-50"
        style={{ background: accent }}
      />
      
      {/* 2. Rotating Sacred Geometry / Grid */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 transition-all duration-700 group-hover:opacity-40">
        <svg viewBox="0 0 400 400" className="w-[120%] h-[120%] animate-[spin_60s_linear_infinite]">
          {/* Inner Grid */}
          <circle cx="200" cy="200" r="150" fill="none" stroke="white" strokeWidth="1" strokeDasharray="4 8" />
          <circle cx="200" cy="200" r="100" fill="none" stroke="white" strokeWidth="0.5" />
          {/* Crosshairs */}
          <line x1="200" y1="20" x2="200" y2="380" stroke="white" strokeWidth="0.5" strokeDasharray="2 4" />
          <line x1="20" y1="200" x2="380" y2="200" stroke="white" strokeWidth="0.5" strokeDasharray="2 4" />
          
          {/* Outer Orbit */}
          <ellipse cx="200" cy="200" rx="180" ry="120" fill="none" stroke={accent} strokeWidth="2" transform="rotate(30 200 200)" />
          <ellipse cx="200" cy="200" rx="180" ry="120" fill="none" stroke={accent} strokeWidth="1" strokeDasharray="5 5" transform="rotate(-60 200 200)" />
        </svg>
      </div>

      {/* 3. Floating Math Formulas */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl" style={{ maskImage: "radial-gradient(circle at center, black 20%, transparent 80%)" }}>
        {MATH_FORMULAS.map((formula, idx) => {
          // Deterministic pseudo-randomness based on seed and idx
          const s1 = (seed * (idx + 1) * 17) % 100;
          const s2 = (seed * (idx + 1) * 23) % 100;
          const left = `${10 + (s1 * 0.8)}%`;
          const top = `${10 + (s2 * 0.8)}%`;
          const delay = `${(s1 % 5)}s`;
          const duration = `${10 + (s2 % 10)}s`;
          
          return (
            <div 
              key={idx}
              className="absolute text-white/10 font-mono text-sm font-bold whitespace-nowrap animate-float"
              style={{ left, top, animationDelay: delay, animationDuration: duration }}
            >
              {formula}
            </div>
          );
        })}
      </div>

      {/* 4. The Core Icon */}
      <div 
        className="relative z-10 transition-transform duration-700 ease-out group-hover:scale-125 group-hover:rotate-[5deg]"
        style={{
          filter: `drop-shadow(0 0 30px ${accent}) drop-shadow(0 0 60px ${accent}80)`
        }}
      >
        {/* Render the icon inside a nice glass container */}
        <div className="relative flex items-center justify-center p-12 rounded-full border border-white/10 bg-black/20 backdrop-blur-sm">
          {/* Inner ring */}
          <div 
            className="absolute inset-0 rounded-full border-2 border-transparent animate-[spin_10s_linear_infinite]"
            style={{ borderTopColor: accent, borderRightColor: accent }}
          />
          {icon}
        </div>
      </div>
      
      {/* 5. Particle Dust */}
      <div className="absolute inset-0 pointer-events-none">
         {[...Array(10)].map((_, i) => (
           <div 
             key={i}
             className="absolute rounded-full animate-pulse"
             style={{
               width: `${2 + (i % 3)}px`,
               height: `${2 + (i % 3)}px`,
               background: accent,
               left: `${(seed * i * 37) % 100}%`,
               top: `${(seed * i * 53) % 100}%`,
               animationDelay: `${i * 0.2}s`,
               animationDuration: `${2 + (i % 3)}s`
             }}
           />
         ))}
      </div>

    </div>
  );
}
