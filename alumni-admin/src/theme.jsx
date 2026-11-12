// Alumni Admin theming — light/dark evergreen, applied as CSS variables on :root.
import { createContext, useContext, useEffect, useState, useCallback } from "react";

const THEME_KEY = "adminThemeMode"; // "light" | "dark"

const LIGHT = {
  "--primary": "#104B38",
  "--primary-strong": "#0C3A2B",
  "--on-primary": "#FFFFFF",
  "--bg": "#F4F8F5",
  "--surface": "#FFFFFF",
  "--surface-alt": "#F0F5E9",
  "--border": "#CBDCC5",
  "--text": "#173428",
  "--muted": "#57685B",
  "--placeholder": "#93A198",
  "--danger": "#B3261E",
  "--success": "#257A2B",
  // Status spectrum — one source of truth so pages stop hardcoding
  // hex pills (which break dark mode). Tint = translucent bg for pills.
  "--warning": "#B45309",
  "--warning-tint": "rgba(239,108,0,0.14)",
  "--info": "#1565C0",
  "--info-tint": "rgba(21,101,192,0.12)",
  "--success-tint": "rgba(46,125,50,0.13)",
  "--danger-tint": "rgba(194,57,43,0.10)",
  "--violet": "#6A1B9A",
  "--violet-tint": "rgba(106,27,154,0.12)",
  // ── CDM portal design system (school identity) ──────────────────
  // Signature gold accents + fixed deep-green brand surfaces. Same
  // values in dark mode — brand surfaces don't invert.
  "--gold": "#D4BD40",
  "--gold-strong": "#C5A63F",
  "--gold-soft": "#FFF2A3",
  "--brand-deep": "#203C31",
  // Shape + depth scale.
  "--radius-sm": "8px",
  "--radius-md": "12px",
  "--radius-lg": "14px",
  "--radius-pill": "999px",
  "--shadow-sm": "0 1px 2px rgba(25,61,46,0.05), 0 4px 18px rgba(25,61,46,0.035)",
  "--shadow-md": "0 4px 18px rgba(25,61,46,0.07), 0 12px 32px rgba(25,61,46,0.10)",
  // Type. Inter ships only if approved (needs internet for the webfont);
  // until then this resolves to the platform system stack.
  "--font": "\"Inter\", system-ui, \"Segoe UI\", Roboto, sans-serif",
  "--sidebar": "#173428",
  "--sidebar-item": "rgba(255,255,255,0.08)",
  "--sidebar-border": "#244B36",
  "--sidebar-text": "#E4EFE7",
  "--sidebar-muted": "#B4CBBD",
  "--sidebar-active": "#D4BD40",
  // Character tokens — give light mode the same depth dark mode gets for free.
  "--hero-from": "#203C31",
  "--hero-to": "#104B38",
  "--hero-text": "#FFFFFF",
  "--hero-muted": "rgba(255,255,255,0.76)",
  "--stat-shadow": "0 4px 18px rgba(25,61,46,0.07), 0 12px 32px rgba(25,61,46,0.10)",
  "--tile-bg": "#EDF5E7",
  // Decorative overlays — the hero/profile banners keep a dark gradient in
  // both modes, so these white washes are shared by light and dark.
  "--hero-ring": "rgba(255,255,255,0.09)",
  "--hero-ring-soft": "rgba(255,255,255,0.06)",
  "--hero-chip": "rgba(255,255,255,0.14)",
  "--hero-chip-border": "rgba(255,255,255,0.24)",
  // Scrim behind modal/dialog overlays.
  "--overlay": "rgba(0,0,0,0.5)",
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
  "--warning": "#F0A04B",
  "--warning-tint": "rgba(239,108,0,0.22)",
  "--info": "#7FB3EC",
  "--info-tint": "rgba(127,179,236,0.18)",
  "--success-tint": "rgba(102,187,106,0.18)",
  "--danger-tint": "rgba(229,115,115,0.18)",
  "--violet": "#CE93D8",
  "--violet-tint": "rgba(206,147,216,0.18)",
  // ── CDM portal design system (school identity) ──────────────────
  // Identical gold/brand values as light — brand surfaces don't invert.
  "--gold": "#D4BD40",
  "--gold-strong": "#C5A63F",
  "--gold-soft": "#FFF2A3",
  "--brand-deep": "#203C31",
  "--radius-sm": "8px",
  "--radius-md": "12px",
  "--radius-lg": "14px",
  "--radius-pill": "999px",
  "--shadow-sm": "0 1px 2px rgba(0,0,0,0.4), 0 4px 14px rgba(0,0,0,0.3)",
  "--shadow-md": "0 1px 2px rgba(0,0,0,0.4), 0 12px 32px rgba(0,0,0,0.35)",
  "--font": "\"Inter\", system-ui, \"Segoe UI\", Roboto, sans-serif",
  "--sidebar": "#0A1A10",
  "--sidebar-item": "#122619",
  "--sidebar-border": "#1C3A26",
  "--sidebar-text": "#E1EBE4",
  "--sidebar-muted": "#B4CBBD",
  "--sidebar-active": "#D4BD40",
  // Hero stays the fixed brand gradient in BOTH modes (white text on it).
  "--hero-from": "#203C31",
  "--hero-to": "#104B38",
  "--hero-text": "#FFFFFF",
  "--hero-muted": "rgba(255,255,255,0.76)",
  "--stat-shadow": "0 1px 2px rgba(0,0,0,0.4), 0 12px 32px rgba(0,0,0,0.35)",
  "--tile-bg": "#1E2A22",
  "--hero-ring": "rgba(255,255,255,0.09)",
  "--hero-ring-soft": "rgba(255,255,255,0.06)",
  "--hero-chip": "rgba(255,255,255,0.14)",
  "--hero-chip-border": "rgba(255,255,255,0.24)",
  "--overlay": "rgba(0,0,0,0.5)",
};

export function applyThemeVars(vars, mode = "light") {
  const root = document.documentElement;
  Object.keys(vars).forEach((key) => root.style.setProperty(key, vars[key]));
  // Native controls (selects, date pickers, checkboxes, scrollbars) must
  // follow the active mode too, not stay light-on-dark.
  root.style.colorScheme = mode;
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
    applyThemeVars(isDark ? DARK : LIGHT, isDark ? "dark" : "light");
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
