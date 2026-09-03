// src/components/AppHeader.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  Modal,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Menu, X, Moon, Sun, KeyRound, LogOut } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { alert as appAlert } from './AppAlert';

// Shared themed header bar with a hamburger menu (dark mode, change
// password, sign out). Used by every tab root so headers blend in.
export default function AppHeader({ title, navigation }) {
  const { theme, isDark, toggleDarkMode } = useTheme();
  const { logout } = useAuth();
  const c = theme.colors;
  const [menuOpen, setMenuOpen] = useState(false);

  function confirmSignOut() {
    setMenuOpen(false);
    appAlert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }

  function goToChangePassword() {
    setMenuOpen(false);
    navigation.navigate('ProfileTab', { screen: 'ChangePassword' });
  }

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

      <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: c.overlay }]}>
          <TouchableOpacity style={styles.modalBackdropTouch} onPress={() => setMenuOpen(false)} />
          <View style={[styles.menuSheet, { backgroundColor: c.surface }]}>
            <View style={styles.menuHeader}>
              <Text style={[styles.menuTitle, { color: c.text }]}>Menu</Text>
              <TouchableOpacity onPress={() => setMenuOpen(false)} accessibilityLabel="Close menu">
                <X size={20} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={[styles.menuRow, { borderBottomColor: c.border }]}>
              {isDark ? <Moon size={20} color={c.primary} /> : <Sun size={20} color={c.primary} />}
              <Text style={[styles.menuLabel, { color: c.text }]}>Dark Mode</Text>
              <Switch
                value={isDark}
                onValueChange={toggleDarkMode}
                trackColor={{ true: c.primary }}
                thumbColor="#fff"
              />
            </View>

            <TouchableOpacity style={[styles.menuRow, { borderBottomColor: c.border }]} onPress={goToChangePassword}>
              <KeyRound size={20} color={c.textMuted} />
              <Text style={[styles.menuLabel, { color: c.text }]}>Change Password</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuRow} onPress={confirmSignOut}>
              <LogOut size={20} color={c.danger} />
              <Text style={[styles.menuLabel, { color: c.danger }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  title: { fontSize: 19, fontWeight: '800', letterSpacing: 0.3 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  modalBackdropTouch: { flex: 1 },
  menuSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
  },
  menuTitle: { fontSize: 16, fontWeight: '700' },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuLabel: { flex: 1, marginLeft: 14, fontSize: 15 },
});
