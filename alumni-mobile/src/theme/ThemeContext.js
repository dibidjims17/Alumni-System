// src/theme/ThemeContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes } from './theme';

const STORAGE_KEY = 'appThemeMode'; // 'light' | 'dark' | 'system'
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setMode(stored);
        }
      })
      .catch(() => {});
  }, []);

  const resolved = mode === 'system' ? systemScheme : mode;
  const theme = themes[resolved === 'dark' ? 'dark' : 'light'];

  function setThemeMode(next) {
    setMode(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }

  // Convenience: explicit light/dark toggle (system-aware default)
  function toggleDarkMode() {
    const nextIsDark = theme.mode === 'dark';
    setThemeMode(nextIsDark ? 'light' : 'dark');
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme.mode === 'dark',
        mode,
        setThemeMode,
        toggleDarkMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
