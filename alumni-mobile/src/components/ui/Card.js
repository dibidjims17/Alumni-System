// src/components/ui/Card.js
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export default function Card({ children, style, padded = true }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadow,
        },
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
    // Subtle depth so light-mode cards lift off the deepened background.
    ...Platform.select({
      ios: {
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 2,
      },
    }),
  },
  padded: {
    padding: 14,
  },
});
