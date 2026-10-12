// src/components/AppBackground.js
// App-wide dimmed backdrop: the alumni background artwork at low opacity
// so content stays readable. Opacity adapts to the theme — dark surfaces
// swallow the artwork, so it runs stronger there. Place as the FIRST child
// of a root container whose own background is transparent.
// Usage: <View style={{ flex: 1, backgroundColor: 'transparent' }}><AppBackground />...</View>
import React from 'react';
import { ImageBackground, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function AppBackground({ opacity, darkOpacity }) {
  const { theme } = useTheme();
  const resolved =
    opacity ??
    (theme.mode === 'dark' ? (darkOpacity ?? 0.22) : 0.1);
  return (
    <ImageBackground
      source={require('../../assets/background.png')}
      style={StyleSheet.absoluteFill}
      imageStyle={{ opacity: resolved }}
      resizeMode="cover"
      pointerEvents="none"
    />
  );
}
