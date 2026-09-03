// src/components/SectionTabs.js
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function SectionTabs({ items, active, navigation }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={[styles.wrap, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
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
              style={[styles.chip, isActive && { borderBottomColor: c.primary }]}
              onPress={() => {
                if (item.screen !== active && navigation) {
                  navigation.navigate(item.screen);
                }
              }}
            >
              <Text
                style={[
                  styles.label,
                  isActive ? { color: c.primary } : { color: c.textMuted },
                ]}
              >
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
  },
  row: {
    flexDirection: 'row',
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
