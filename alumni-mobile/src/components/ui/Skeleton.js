// src/components/ui/Skeleton.js
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

// Pulsing content placeholder. Pure JS (Animated API) — no native deps.
export default function Skeleton({ width = '100%', height = 14, borderRadius = 6, style }) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.colors.surfaceAlt,
          opacity,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    overflow: 'hidden',
  },
});
