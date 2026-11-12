// src/components/ui/PrimaryButton.js
import React from 'react';
import { Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export default function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: c.primary },
        // Disabled: muted surface instead of white-on-tint (unreadable).
        isDisabled && { backgroundColor: c.surfaceAlt },
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={isDisabled ? c.textMuted : c.onPrimary} />
      ) : (
        <Text style={[styles.text, { color: isDisabled ? c.textMuted : c.onPrimary }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    borderRadius: 10, // portal button radius
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
  },
});
