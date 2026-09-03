// src/components/AutocompleteInput.js
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function AutocompleteInput({ value, onChangeText, suggestions, placeholder }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filtered =
    showSuggestions && value.trim().length > 0
      ? suggestions.filter((s) => s.toLowerCase().includes(value.trim().toLowerCase()))
      : [];

  function handleChangeText(text) {
    setShowSuggestions(true);
    onChangeText(text);
  }

  function handleSelect(suggestion) {
    onChangeText(suggestion);
    setShowSuggestions(false);
  }

  return (
    <View>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: c.surface, borderColor: c.border, color: c.text },
        ]}
        placeholderTextColor={c.placeholder}
        value={value}
        onChangeText={handleChangeText}
        placeholder={placeholder}
      />
      {filtered.length > 0 && (
        <View style={[styles.dropdown, { backgroundColor: c.surface, borderColor: c.border }]}>
          {filtered.slice(0, 5).map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.dropdownItem, { borderTopColor: c.border }]}
              onPress={() => handleSelect(item)}
              activeOpacity={0.6}
            >
              <Text style={[styles.dropdownText, { color: c.text }]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  dropdown: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  dropdownItem: {
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dropdownText: { fontSize: 14 },
});
