"use client";

import { useEffect, useState } from "react";

const THEMES = [
  {
    key: "blue",
    label: "Ocean Blue",
    accent: "#2563eb",
    bg: "radial-gradient(circle at top, rgba(37,99,235,0.18), transparent 22%), linear-gradient(180deg,rgba(255,255,255,0.02),transparent 20%), #0a0a0a",
  },
  {
    key: "violet",
    label: "Electric Violet",
    accent: "#7c3aed",
    bg: "radial-gradient(circle at top, rgba(124,58,237,0.18), transparent 22%), linear-gradient(180deg,rgba(255,255,255,0.02),transparent 20%), #0a0a0a",
  },
  {
    key: "emerald",
    label: "Emerald",
    accent: "#059669",
    bg: "radial-gradient(circle at top, rgba(5,150,105,0.18), transparent 22%), linear-gradient(180deg,rgba(255,255,255,0.02),transparent 20%), #0a0a0a",
  },
  {
    key: "rose",
    label: "Rose",
    accent: "#e11d48",
    bg: "radial-gradient(circle at top, rgba(225,29,72,0.18), transparent 22%), linear-gradient(180deg,rgba(255,255,255,0.02),transparent 20%), #0a0a0a",
  },
  {
    key: "amber",
    label: "Amber",
    accent: "#d97706",
    bg: "radial-gradient(circle at top, rgba(217,119,6,0.18), transparent 22%), linear-gradient(180deg,rgba(255,255,255,0.02),transparent 20%), #0a0a0a",
  },
  {
    key: "cyan",
    label: "Neon Cyan",
    accent: "#0891b2",
    bg: "radial-gradient(circle at top, rgba(8,145,178,0.18), transparent 22%), linear-gradient(180deg,rgba(255,255,255,0.02),transparent 20%), #0a0a0a",
  },
];

export function ThemePicker() {
  const [activeKey, setActiveKey] = useState("blue");

  // Read saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem("repcore-theme");
    if (saved) {
      const theme = THEMES.find((t) => t.key === saved);
      if (theme) {
        applyTheme(theme);
        setActiveKey(theme.key);
      }
    }
  }, []);

  const applyTheme = (theme: (typeof THEMES)[0]) => {
    document.documentElement.style.setProperty("--accent", theme.accent);
    document.body.style.background = theme.bg;
    localStorage.setItem("repcore-theme", theme.key);
  };

  const handleSelect = (theme: (typeof THEMES)[0]) => {
    setActiveKey(theme.key);
    applyTheme(theme);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {THEMES.map((theme) => {
          const isActive = activeKey === theme.key;
          return (
            <button
              key={theme.key}
              type="button"
              onClick={() => handleSelect(theme)}
              className={`flex flex-col items-center gap-2 rounded-2xl p-3 border transition-all duration-200 active:scale-95 ${
                isActive
                  ? "border-white/30 bg-white/10 scale-105"
                  : "border-border bg-white/[0.03] hover:bg-white/[0.06]"
              }`}
              title={theme.label}
            >
              <div
                className="h-8 w-8 rounded-full shadow-lg ring-2"
                style={{
                  background: theme.accent,
                  boxShadow: `0 0 12px ${theme.accent}60`,
                  border: `2px solid ${isActive ? "white" : "transparent"}`,
                  outline: isActive ? "2px solid white" : "2px solid transparent",
                  outlineOffset: "2px",
                }}
              />
              <span className="text-[10px] font-medium text-muted-foreground leading-tight text-center">
                {theme.label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Theme is saved locally on this device. Your members and data are unaffected.
      </p>
    </div>
  );
}

// Also export an initializer script to inject before React hydrates
export function ThemeInitScript() {
  const script = `
    try {
      const key = localStorage.getItem('repcore-theme');
      const themes = ${JSON.stringify(THEMES)};
      const theme = themes.find(t => t.key === key);
      if (theme) {
        document.documentElement.style.setProperty('--accent', theme.accent);
      }
    } catch(e) {}
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
