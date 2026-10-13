/**
 * Design tokens for the "Scientific Night" visual system.
 * Used across all physics laboratory simulation apparatuses.
 */

export const SCIENTIFIC_THEME = {
  // Canvas Backgrounds
  canvasBg: "linear-gradient(180deg, #020617 0%, #0a0f1d 50%, #020617 100%)",
  canvasBgHex: "#0a0f1d",
  canvasBorder: "rgba(6, 182, 212, 0.2)",
  canvasBorderSubtle: "rgba(255, 255, 255, 0.08)",
  canvasShadow: "0 12px 40px rgba(0, 0, 0, 0.7)",

  // Ambient Glows (static background only)
  glowPrimary: "rgba(6, 182, 212, 0.08)",
  glowSecondary: "rgba(59, 130, 246, 0.08)",
  glowAccent: "rgba(245, 158, 11, 0.08)",

  // Grid Tokens
  gridColor: "rgba(255, 255, 255, 0.04)",
  gridAxis: "rgba(6, 182, 212, 0.25)",
  gridDot: "rgba(255, 255, 255, 0.08)",

  // Metal Palettes (Hex stops for SVG gradients)
  metals: {
    steel: {
      light: "#cbd5e1",
      mid: "#64748b",
      dark: "#334155",
      deep: "#1e293b",
      highlight: "#f8fafc",
    },
    aluminum: {
      light: "#e2e8f0",
      mid: "#94a3b8",
      dark: "#475569",
      deep: "#334155",
      highlight: "#ffffff",
    },
    brass: {
      light: "#fef3c7",
      mid: "#f59e0b",
      dark: "#b45309",
      deep: "#78350f",
      highlight: "#fffbeb",
    },
    chassisDark: {
      light: "#334155",
      mid: "#1e293b",
      dark: "#0f172a",
      deep: "#020617",
      border: "#475569",
    },
  },

  // Semantic Accent Colors (High Contrast)
  accents: {
    cyan: "#06b6d4",       // Primary velocity / sensor 1 / active
    sky: "#38bdf8",        // Light highlight
    blue: "#3b82f6",       // Body A / Primary mass
    amber: "#f59e0b",      // Body B / Torque / Force / Friction
    yellow: "#eab308",     // Clamp / Release trigger
    emerald: "#10b981",    // Ground / Equilibrium / Success LED
    red: "#ef4444",        // Active IR beam / Acceleration vector
    rose: "#f43f5e",       // Critical indicator
    purple: "#8b5cf6",     // Inertia / Energy / Phase 2
    indigo: "#6366f1",     // Momentum vector (Body A & B)
    fuchsia: "#d946ef",    // Total momentum vector (System Σp)
  },

  // Semantic Vector Category Palettes (Consistent with graph series)
  vectors: {
    position: "#06b6d4",       // Cyan (Posisi)
    velocity: "#10b981",       // Emerald (Kecepatan)
    acceleration: "#8b5cf6",   // Violet (Percepatan)
    force: "#f59e0b",          // Amber (Gaya)
    momentum: "#6366f1",       // Electric Indigo (Momentum kereta pA & pB)
    momentumTotal: "#d946ef",  // Vivid Fuchsia (Momentum total sistem Σp)
  },

  // Text & Scale Labels
  typography: {
    fontMono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
    scaleText: "#94a3b8",
    scaleTextMajor: "#e2e8f0",
    scaleTick: "#64748b",
    scaleTickMajor: "#cbd5e1",
    labelMuted: "#64748b",
  },
} as const;
