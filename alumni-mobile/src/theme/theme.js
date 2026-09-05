// src/theme/theme.js

const light = {
  mode: 'light',
  // Comforting dark-green palette
  colors: {
    primary: '#1B5E20',
    primaryStrong: '#14471A',
    onPrimary: '#FFFFFF',
    primaryTint: '#DCE8D8',
    background: '#E9EFE7',
    surface: '#FFFFFF',
    surfaceAlt: '#E2EBDE',
    border: '#C7D4C1',
    text: '#17211A',
    textMuted: '#57685B',
    placeholder: '#93A198',
    danger: '#B3261E',
    success: '#257A2B',
    heart: '#E0245E',
    badge: '#C0392B',
    overlay: 'rgba(0,0,0,0.5)',
    // Semantic tints for pills, icon tiles, and status chips.
    tintSuccess: '#DDEBD9',
    tintWarning: '#F7E8CF',
    tintInfo: '#DCE9F5',
    tintDanger: '#F6DCD7',
    // Card depth (iOS shadow + Android elevation baseline).
    shadow: '#1B5E20',
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
    // Semantic tints for pills, icon tiles, and status chips.
    tintSuccess: '#22392B',
    tintWarning: '#3D3220',
    tintInfo: '#22303E',
    tintDanger: '#3E2422',
    // Card depth (iOS shadow + Android elevation baseline).
    shadow: '#000000',
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
