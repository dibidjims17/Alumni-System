// src/components/AppHeader.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Menu } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import MenuSheet from './MenuSheet';

// Shared themed header bar with a hamburger menu. Used by every tab root
// so headers blend in; the menu itself lives in MenuSheet (also used by
// the custom Home header).
export default function AppHeader({ title, navigation }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <View style={[styles.bar, { borderBottomColor: c.border, backgroundColor: c.surface }]}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setMenuOpen(true)}
          accessibilityLabel="Menu"
        >
          <Menu size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>{title}</Text>
        <View style={styles.iconButton} />
      </View>
      <View style={[styles.accent, { backgroundColor: c.primary }]} />
      <MenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        navigation={navigation}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconButton: { padding: 6, minWidth: 36 },
  accent: { height: 2, opacity: 0.9 },
  title: { fontSize: 19, fontWeight: '800', letterSpacing: 0.3 },
});
