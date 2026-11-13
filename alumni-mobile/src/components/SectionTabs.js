// src/components/SectionTabs.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function SectionTabs({ items, active, navigation }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={styles.wrap}>
      <View style={[styles.group, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
        {items.map((item) => {
          const isActive = item.screen === active;
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.segment,
                isActive && { backgroundColor: c.surface, borderColor: c.border },
              ]}
              onPress={() => {
                if (item.screen !== active && navigation) {
                  navigation.navigate(item.screen);
                }
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.label,
                  isActive ? { color: c.primary } : { color: c.textMuted },
                ]}
              >
                {item.label}
              </Text>
              {/* Portal active-tab signature: gold underline. */}
              {isActive ? (
                <View style={[styles.underline, { backgroundColor: c.gold }]} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 6, // compact — was 12
  },
  group: {
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    padding: 3, // was 4
    gap: 3, // was 4
  },
  segment: {
    paddingVertical: 6, // was 8
    paddingHorizontal: 14, // was 16
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  underline: {
    height: 2.5,
    borderRadius: 2,
    marginTop: 3, // was 4
    alignSelf: 'stretch',
  },
});
