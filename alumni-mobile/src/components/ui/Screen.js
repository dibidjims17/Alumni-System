// src/components/ui/Screen.js
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

// Root layout for a screen. Pads below the top inset when no native header is
// shown, keeps content off the bottom inset, and applies the themed background.
export default function Screen({
  children,
  scroll = false,
  edges = ['top', 'left', 'right'],
  contentStyle,
  style,
}) {
  const { theme } = useTheme();
  const inner = (
    <SafeAreaView style={[styles.base, { backgroundColor: theme.colors.background }, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );

  if (!scroll) return inner;

  return (
    <SafeAreaView
      style={[styles.base, { backgroundColor: theme.colors.background }, style]}
      edges={edges}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, contentStyle]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
});
