"use client";

import React from "react";
import Link from "next/link";

interface ModeCardProps {
  title: string;
  subtitle: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  isNew?: boolean;
  accentColor?: string;
  className?: string;
}

export function ModeCard({
  title,
  subtitle,
  description,
  href,
  icon,
  badge,
  isNew,
  accentColor = "var(--color-primary)",
  className = "",
}: ModeCardProps) {
  return (
    <Link
      href={href}
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        padding: "28px",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        textDecoration: "none",
        transition: "border-color var(--transition), transform var(--transition), box-shadow var(--transition)",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = accentColor;
        el.style.transform = "translateY(-3px)";
        el.style.boxShadow = `0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px ${accentColor}20`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "var(--color-border)";
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "none";
      }}
      aria-label={`${title}: ${description}`}
    >
      {/* Subtle glow accent */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          opacity: 0.6,
        }}
      />

      {/* Icon + badge row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "var(--radius-md)",
            background: `${accentColor}20`,
            border: `1px solid ${accentColor}40`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
          }}
          aria-hidden="true"
        >
          {icon}
        </div>
        <div style={{ display: "flex", gap: "6px", flexDirection: "column", alignItems: "flex-end" }}>
          {isNew && (
            <span
              style={{
                fontSize: "0.6875rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--color-success)",
                background: "rgba(74, 222, 128, 0.15)",
                border: "1px solid rgba(74, 222, 128, 0.3)",
                padding: "3px 8px",
                borderRadius: "20px",
              }}
            >
              Baru
            </span>
          )}
          {badge && (
            <span
              style={{
                fontSize: "0.6875rem",
                fontWeight: 600,
                color: "var(--color-text-2)",
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                padding: "3px 8px",
                borderRadius: "20px",
              }}
            >
              {badge}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <p
          style={{
            margin: 0,
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: accentColor,
          }}
        >
          {subtitle}
        </p>
        <h3
          style={{
            margin: 0,
            fontSize: "1.375rem",
            fontWeight: 700,
            color: "var(--color-text)",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: "0.9rem",
            color: "var(--color-text-2)",
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      </div>

      {/* CTA arrow */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "0.875rem",
          fontWeight: 600,
          color: accentColor,
          marginTop: "auto",
        }}
        aria-hidden="true"
      >
        Mulai
        <span style={{ fontSize: "18px", transition: "transform var(--transition)" }}>→</span>
      </div>
    </Link>
  );
}
