// src/components/ui/PasswordChecklist.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';

// Mirrors MyApp.Shared.PasswordRules on the backend: 8+ chars with upper,
// lower, digit, and special. Live check/X feedback per requirement.
const RULES = [
  { key: 'length', label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { key: 'upper', label: 'One uppercase letter (A–Z)', test: (pw) => /[A-Z]/.test(pw) },
  { key: 'lower', label: 'One lowercase letter (a–z)', test: (pw) => /[a-z]/.test(pw) },
  { key: 'digit', label: 'One number (0–9)', test: (pw) => /[0-9]/.test(pw) },
  { key: 'special', label: 'One special character (!@#$…)', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export function passwordMeetsAll(password) {
  const pw = password || '';
  return RULES.every((rule) => rule.test(pw));
}

export default function PasswordChecklist({ password }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const pw = password || '';
  const untouched = pw.length === 0;

  return (
    <View style={styles.list} accessibilityLabel="Password requirements">
      {RULES.map((rule) => {
        const met = rule.test(pw);
        const color = met ? c.success : untouched ? c.textMuted : c.danger;
        const Icon = met ? Check : X;
        return (
          <View key={rule.key} style={styles.row}>
            <Icon size={14} color={color} />
            <Text style={[styles.label, { color }]}>{rule.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 2,
    marginBottom: 14,
    gap: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  label: {
    fontSize: 12.5,
  },
});
