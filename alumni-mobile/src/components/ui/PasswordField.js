// src/components/ui/PasswordField.js
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';

// Themed password input with a show/hide eye toggle.
export default function PasswordField({ value, onChangeText, placeholder, style }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [visible, setVisible] = useState(false);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: c.surface, borderColor: c.border },
        style,
      ]}
    >
      <TextInput
        style={[styles.input, { color: c.text }]}
        placeholder={placeholder}
        placeholderTextColor={c.placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => setVisible((v) => !v)}
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? (
          <EyeOff size={20} color={c.textMuted} />
        ) : (
          <Eye size={20} color={c.textMuted} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingRight: 4,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 15,
  },
  iconButton: {
    padding: 10,
  },
});
