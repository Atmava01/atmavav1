"use client";

import { Search, Command, Sun, Moon } from "lucide-react";
import { useAdminTheme } from "./ThemeContext";

interface Props {
  title: string;
  subtitle?: string;
  onOpenPalette: () => void;
  actions?: React.ReactNode;
}

export function TopBar({ title, subtitle, onOpenPalette, actions }: Props) {
  const { isDark, toggleTheme } = useAdminTheme();

  return (
    <div
      className="sticky top-0 z-30 flex items-center justify-between gap-4 px-6 md:px-10 py-4"
      style={{
        background: "var(--adm-topbar)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--adm-topbar-border)",
      }}
    >
      {/* Title */}
      <div className="min-w-0">
        <h1
          className="truncate adm-text"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "1.35rem",
            fontWeight: 300,
            letterSpacing: "0.01em",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs mt-0.5 truncate adm-text-3">{subtitle}</p>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {actions}

        {/* CMD+K */}
        <button
          onClick={onOpenPalette}
          className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all adm-text-3"
          style={{
            background: "var(--adm-input)",
            border: "1px solid var(--adm-border)",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--adm-elevated)")}
          onMouseLeave={e => (e.currentTarget.style.background = "var(--adm-input)")}
        >
          <Search size={13} />
          <span className="text-xs hidden sm:block">Search</span>
          <div className="hidden sm:flex items-center gap-0.5 ml-0.5">
            <Command size={11} />
            <span className="text-xs" style={{ fontFamily: "monospace" }}>K</span>
          </div>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all adm-text-3"
          style={{
            background: "var(--adm-input)",
            border: "1px solid var(--adm-border)",
          }}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--adm-elevated)")}
          onMouseLeave={e => (e.currentTarget.style.background = "var(--adm-input)")}
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </div>
  );
}
