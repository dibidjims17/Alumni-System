// Alumni Admin theming — light/dark evergreen, applied as CSS variables on :root.
import { createContext, useContext, useEffect, useState, useCallback } from "react";

const THEME_KEY = "adminThemeMode"; // "light" | "dark"

const LIGHT = {
  "--primary": "#1B5E20",
  "--primary-strong": "#123F16",
  "--on-primary": "#FFFFFF",
  "--bg": "#E8EEE7",
  "--surface": "#FFFFFF",
  "--surface-alt": "#E4ECE1",
  "--border": "#C9D6C4",
  "--text": "#17211A",
  "--muted": "#57685B",
  "--placeholder": "#93A198",
  "--danger": "#B3261E",
  "--success": "#257A2B",
  "--sidebar": "#0C2013",
  "--sidebar-item": "#14301C",
  "--sidebar-border": "#1E4327",
  "--sidebar-text": "#E4EFE7",
  "--sidebar-muted": "#8FA996",
  "--sidebar-active": "#66BB6A",
  // Character tokens — give light mode the same depth dark mode gets for free.
  "--hero-from": "#0F3513",
  "--hero-to": "#2E7D32",
  "--hero-text": "#FFFFFF",
  "--hero-muted": "rgba(255,255,255,0.76)",
  "--stat-shadow": "0 1px 2px rgba(27,94,32,0.08), 0 10px 26px rgba(27,94,32,0.10)",
  "--tile-bg": "#E7F0E4",
};

const DARK = {
  "--primary": "#4CAF7D",
  "--primary-strong": "#3C9C6C",
  "--on-primary": "#0B130D",
  "--bg": "#0B1110",
  "--surface": "#141D18",
  "--surface-alt": "#1E2A22",
  "--border": "#2A372F",
  "--text": "#E3EAE4",
  "--muted": "#94A499",
  "--placeholder": "#5E6E63",
  "--danger": "#E57373",
  "--success": "#66BB6A",
  "--sidebar": "#0A1A10",
  "--sidebar-item": "#122619",
  "--sidebar-border": "#1C3A26",
  "--sidebar-text": "#E1EBE4",
  "--sidebar-muted": "#87A191",
  "--sidebar-active": "#66BB6A",
  "--hero-from": "#0A1F10",
  "--hero-to": "#1B4A24",
  "--hero-text": "#EAF4EC",
  "--hero-muted": "rgba(234,244,236,0.68)",
  "--stat-shadow": "0 1px 2px rgba(0,0,0,0.4), 0 12px 32px rgba(0,0,0,0.35)",
  "--tile-bg": "#1E2A22",
};

export function applyThemeVars(vars) {
  const root = document.documentElement;
  Object.keys(vars).forEach((key) => root.style.setProperty(key, vars[key]));
}

const ThemeCtx = createContext({ isDark: false, mode: "light", toggle: () => {} });

export function AdminThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) === "dark";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    applyThemeVars(isDark ? DARK : LIGHT);
  }, [isDark]);

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      } catch {}
      return next;
    });
  }, []);

  return (
    <ThemeCtx.Provider value={{ isDark, mode: isDark ? "dark" : "light", toggle }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useAdminTheme() {
  return useContext(ThemeCtx);
}
