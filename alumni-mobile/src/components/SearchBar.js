// src/components/SearchBar.js
import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Search, X } from 'lucide-react-native';

const ACCENT = '#1a4fd8';

export default function SearchBar({ placeholder, value, onChangeText, onSubmit }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={onSubmit}
        accessibilityLabel="Search"
      >
        <Search size={18} color={ACCENT} />
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#999"
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
          <X size={18} color="#888" />
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
    borderColor: '#ccc',
    backgroundColor: '#fff',
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
