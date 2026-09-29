"use client";

import React, { useCallback } from "react";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeId, onChange, className = "" }: TabsProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      let nextIndex = currentIndex;
      if (e.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
      else if (e.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") nextIndex = 0;
      else if (e.key === "End") nextIndex = tabs.length - 1;
      else return;
      e.preventDefault();
      onChange(tabs[nextIndex].id);
      (document.getElementById(`tab-${tabs[nextIndex].id}`) as HTMLElement)?.focus();
    },
    [tabs, onChange]
  );

  return (
    <div
      role="tablist"
      aria-label="Navigation tabs"
      className={className}
      style={{
        display: "flex",
        gap: "4px",
        padding: "4px",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        width: "fit-content",
      }}
    >
      {tabs.map((tab, idx) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: isActive ? "var(--color-primary)" : "transparent",
              color: isActive ? "#0B1020" : "var(--color-text-2)",
              fontWeight: isActive ? 600 : 500,
              fontSize: "0.875rem",
              cursor: "pointer",
              transition: "background var(--transition), color var(--transition)",
              whiteSpace: "nowrap",
            }}
          >
            {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
