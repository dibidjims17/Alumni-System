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
    borderRadius: 14, // portal card radius (13–14)
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
    // Soft portal depth: wide, low-alpha green shadow.
    ...Platform.select({
      ios: {
        shadowOpacity: 0.1,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
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
