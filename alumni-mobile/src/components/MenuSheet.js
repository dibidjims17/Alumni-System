// src/components/MenuSheet.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  Modal,
  StyleSheet,
} from 'react-native';
import { X, Moon, Sun, KeyRound, LogOut, GraduationCap } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { alert as appAlert } from './AppAlert';

// Shared slide-up menu (dark mode, change password, year correction,
// sign out). Used by AppHeader and the Home header alike so every screen
// offers the same options.
export default function MenuSheet({ visible, onClose, navigation }) {
  const { theme, isDark, toggleDarkMode } = useTheme();
  const { logout } = useAuth();
  const c = theme.colors;

  function go(screen) {
    onClose();
    navigation.navigate('ProfileTab', { screen });
  }

  function confirmSignOut() {
    onClose();
    appAlert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, { backgroundColor: c.overlay }]}>
        <TouchableOpacity style={styles.modalBackdropTouch} onPress={onClose} />
        <View style={[styles.menuSheet, { backgroundColor: c.surface }]}>
          <View style={styles.menuHeader}>
            <Text style={[styles.menuTitle, { color: c.text }]}>Menu</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close menu">
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

          <TouchableOpacity style={[styles.menuRow, { borderBottomColor: c.border }]} onPress={() => go('ChangePassword')}>
            <KeyRound size={20} color={c.textMuted} />
            <Text style={[styles.menuLabel, { color: c.text }]}>Change Password</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuRow, { borderBottomColor: c.border }]} onPress={() => go('YearCorrection')}>
            <GraduationCap size={20} color={c.textMuted} />
            <Text style={[styles.menuLabel, { color: c.text }]}>Year Level Correction</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuRow} onPress={confirmSignOut}>
            <LogOut size={20} color={c.danger} />
            <Text style={[styles.menuLabel, { color: c.danger }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
