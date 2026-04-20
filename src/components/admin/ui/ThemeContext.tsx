"use client";

import { createContext, useContext, useState, useEffect } from "react";

type AdminTheme = "dark" | "light";

interface ThemeContextValue {
  theme: AdminTheme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
  isDark: true,
});

const STORAGE_KEY = "atmava-admin-theme";

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<AdminTheme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as AdminTheme | null;
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === "dark" }}>
      <div data-admin-theme={theme} style={{ minHeight: "100vh" }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useAdminTheme() {
  return useContext(ThemeContext);
}
