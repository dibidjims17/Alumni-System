// src/components/AutocompleteInput.js
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function AutocompleteInput({ value, onChangeText, suggestions, placeholder }) {
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
        style={styles.input}
        value={value}
        onChangeText={handleChangeText}
        placeholder={placeholder}
      />
      {filtered.length > 0 && (
        <View style={styles.dropdown}>
          {filtered.slice(0, 5).map((item) => (
            <TouchableOpacity
              key={item}
              style={styles.dropdownItem}
              onPress={() => handleSelect(item)}
              activeOpacity={0.6}
            >
              <Text style={styles.dropdownText}>{item}</Text>
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
    padding: 10,
  },
  dropdown: {
    borderWidth: 1,
    borderTopWidth: 0,
  },
  dropdownItem: {
    padding: 10,
    borderTopWidth: 1,
  },
  dropdownText: { fontSize: 13 },
});