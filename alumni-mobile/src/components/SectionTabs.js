// src/components/SectionTabs.js
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

const ACCENT = '#1a4fd8';

export default function SectionTabs({ items, active, navigation }) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {items.map((item) => {
          const isActive = item.screen === active;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => {
                if (item.screen !== active && navigation) {
                  navigation.navigate(item.screen);
                }
              }}
            >
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  chipActive: {
    borderBottomColor: ACCENT,
  },
  label: {
    fontSize: 13,
    color: '#666',
  },
  labelActive: {
    color: ACCENT,
    fontWeight: '600',
  },
});
