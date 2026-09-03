// src/theme/theme.js

const light = {
  mode: 'light',
  // Comforting dark-green palette
  colors: {
    primary: '#1B5E20',
    primaryStrong: '#14471A',
    onPrimary: '#FFFFFF',
    primaryTint: '#E5EFE4',
    background: '#F2F5F0',
    surface: '#FFFFFF',
    surfaceAlt: '#E9EFE6',
    border: '#D5DED1',
    text: '#1B231D',
    textMuted: '#5C6B60',
    placeholder: '#9AA79E',
    danger: '#C0392B',
    success: '#2E7D32',
    heart: '#E0245E',
    badge: '#C0392B',
    overlay: 'rgba(0,0,0,0.5)',
  },
  radii: {
    sm: 8,
    md: 12,
    lg: 18,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
};

const dark = {
  mode: 'dark',
  colors: {
    primary: '#4CAF7D',
    primaryStrong: '#3C9C6C',
    onPrimary: '#0B130D',
    primaryTint: '#1E3A2A',
    background: '#0D130F',
    surface: '#161F19',
    surfaceAlt: '#1F2B23',
    border: '#2A372F',
    text: '#E3EAE4',
    textMuted: '#94A499',
    placeholder: '#5E6E63',
    danger: '#E57373',
    success: '#66BB6A',
    heart: '#F26B93',
    badge: '#E57373',
    overlay: 'rgba(0,0,0,0.65)',
  },
  radii: {
    sm: 8,
    md: 12,
    lg: 18,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
};

export const themes = { light, dark };

export const RADIUS = light.radii;
export const SPACING = light.spacing;

// Base content size that reads well on any screen (logos/icons, etc.)
export const LOGO_SIZES = {
  screen: { width: 140, height: 140 },
  header: { width: 40, height: 40 },
  thumb: { width: 60, height: 60 },
};
