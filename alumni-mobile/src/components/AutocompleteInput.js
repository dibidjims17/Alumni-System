// src/components/AutocompleteInput.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function AutocompleteInput({ value, onChangeText, suggestions, onSearch, placeholder, apiType }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef(null);

  // Static suggestions path (no API)
  useEffect(() => {
    if (!onSearch && showSuggestions && value.trim().length > 0) {
      setFiltered(
        suggestions
          ?.filter((s) => s.toLowerCase().includes(value.trim().toLowerCase()))
          .slice(0, 5) || []
      );
    } else if (!onSearch) {
      setFiltered([]);
    }
  }, [value, showSuggestions, suggestions, onSearch]);

  // API-backed search path
  const handleSearch = useCallback((text) => {
    if (!onSearch) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text.trim()) {
      setFiltered([]);
      setIsLoading(false);
      return;
    }

    setShowSuggestions(true);
    setIsLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await onSearch(text.trim(), apiType);
        setFiltered(results || []);
      } catch {
        setFiltered([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);
  }, [onSearch, apiType]);

  function handleChangeText(text) {
    onChangeText(text);
    handleSearch(text);
  }

  function handleSelect(suggestion) {
    onChangeText(suggestion);
    setFiltered([]);
    setShowSuggestions(false);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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
          {isLoading ? (
            <ActivityIndicator size="small" style={styles.loading} />
          ) : (
            filtered.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.dropdownItem, { borderTopColor: c.border }]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.6}
              >
                <Text style={[styles.dropdownText, { color: c.text }]}>{item}</Text>
              </TouchableOpacity>
            ))
          )}
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
  loading: {
    marginVertical: 8,
    alignSelf: 'center',
  },
  dropdown: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dropdownText: { fontSize: 14 },
});
