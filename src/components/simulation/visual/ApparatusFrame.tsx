"use client";

import React from "react";
import { SCIENTIFIC_THEME } from "./tokens";

export interface ApparatusTag {
  label: string;
  value: string;
  accent?: "cyan" | "amber" | "emerald" | "purple" | "slate";
}

export interface ApparatusFrameProps {
  title: string;
  subtitle?: string;
  tags?: ApparatusTag[];
  statusBadge?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ApparatusFrame({
  title,
  subtitle,
  tags = [],
  statusBadge,
  headerActions,
  children,
  className = "",
}: ApparatusFrameProps) {
  const getTagColor = (accent: ApparatusTag["accent"] = "slate") => {
    switch (accent) {
      case "cyan":
        return "border-cyan-500/40 text-cyan-300 bg-cyan-950/60";
      case "amber":
        return "border-amber-500/40 text-amber-300 bg-amber-950/60";
      case "emerald":
        return "border-emerald-500/40 text-emerald-300 bg-emerald-950/60";
      case "purple":
        return "border-purple-500/40 text-purple-300 bg-purple-950/60";
      default:
        return "border-slate-800 text-slate-300 bg-slate-900/80";
    }
  };

  return (
    <div
      className={`relative w-full rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-slate-950 via-[#0a0f1d] to-slate-950 shadow-[0_12px_40px_rgba(0,0,0,0.7)] p-3.5 sm:p-5 overflow-hidden flex flex-col ${className}`}
      style={{ fontFamily: SCIENTIFIC_THEME.typography.fontMono }}
    >
      {/* Soft Ambient Background Glows (Static) */}
      <div
        className="absolute top-0 left-1/4 w-96 h-28 blur-3xl pointer-events-none"
        style={{ background: SCIENTIFIC_THEME.glowPrimary }}
      />
      <div
        className="absolute top-0 right-1/4 w-96 h-28 blur-3xl pointer-events-none"
        style={{ background: SCIENTIFIC_THEME.glowSecondary }}
      />

      {/* Ribbon Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-2 border-b border-slate-800/80 shrink-0 z-10">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#06b6d4] shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold tracking-wider text-cyan-300 uppercase truncate">
              {title}
            </h3>
            {statusBadge}
          </div>
          {subtitle && (
            <p className="text-[11px] text-slate-400 tracking-wide pl-4 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right side: Parameter Chips & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((tag, idx) => (
            <div
              key={idx}
              className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md border ${getTagColor(
                tag.accent
              )} font-mono flex items-center gap-1.5`}
            >
              <span className="text-slate-400">{tag.label}:</span>
              <strong>{tag.value}</strong>
            </div>
          ))}

          {headerActions}
        </div>
      </div>

      {/* Canvas / Visual Content Area */}
      <div className="flex-1 w-full min-h-0 relative flex justify-center items-center">
        {children}
      </div>
    </div>
  );
}
