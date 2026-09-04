// Alumni Admin theming — light/dark evergreen, applied as CSS variables on :root.
import { createContext, useContext, useEffect, useState, useCallback } from "react";

const THEME_KEY = "adminThemeMode"; // "light" | "dark"

const LIGHT = {
  "--primary": "#1B5E20",
  "--primary-strong": "#14471A",
  "--on-primary": "#FFFFFF",
  "--bg": "#F2F5F0",
  "--surface": "#FFFFFF",
  "--surface-alt": "#E9EFE6",
  "--border": "#D5DED1",
  "--text": "#1B231D",
  "--muted": "#5C6B60",
  "--placeholder": "#9AA79E",
  "--danger": "#C0392B",
  "--success": "#2E7D32",
  "--sidebar": "#0C2013",
  "--sidebar-item": "#14301C",
  "--sidebar-border": "#1E4327",
  "--sidebar-text": "#E4EFE7",
  "--sidebar-muted": "#8FA996",
  "--sidebar-active": "#66BB6A",
};

const DARK = {
  "--primary": "#4CAF7D",
  "--primary-strong": "#3C9C6C",
  "--on-primary": "#0B130D",
  "--bg": "#0D130F",
  "--surface": "#161F19",
  "--surface-alt": "#1F2B23",
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
