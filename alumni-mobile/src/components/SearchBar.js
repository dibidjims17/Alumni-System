// src/components/SearchBar.js
import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

export default function SearchBar({ placeholder, value, onChangeText, onSubmit }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: c.surface, borderColor: c.border },
      ]}
    >
      <TouchableOpacity
        style={styles.iconButton}
        onPress={onSubmit}
        accessibilityLabel="Search"
      >
        <Search size={18} color={c.primary} />
      </TouchableOpacity>
      <TextInput
        style={[styles.input, { color: c.text }]}
        placeholder={placeholder}
        placeholderTextColor={c.placeholder}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        autoCapitalize="none"
      />
      {value.length > 0 && (
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {
            onChangeText('');
            onSubmit();
          }}
          accessibilityLabel="Clear search"
        >
          <X size={18} color={c.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
  },
  iconButton: {
    padding: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
  },
});
