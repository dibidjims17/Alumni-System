// src/components/AppHeader.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Moon, Sun, Bell } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import apiClient from '../api/client';

// Shared themed header bar: title left, dark-mode toggle + notifications
// right. Used by every tab root so headers stay identical.
export default function AppHeader({ title, navigation }) {
  const { theme, isDark, toggleDarkMode } = useTheme();
  const c = theme.colors;
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      apiClient
        .get('/Notification/unread-count')
        .then((res) => setUnreadCount(res.data.count || 0))
        .catch(() => {});
    }, [])
  );

  function goToNotifications() {
    // Notifications lives in the Home stack — route through its tab.
    navigation.navigate('HomeTab', { screen: 'Notifications' });
  }

  return (
    <>
      <View style={[styles.bar, { borderBottomColor: c.border, backgroundColor: c.surface }]}>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={toggleDarkMode}
            accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={22} color={c.primary} /> : <Moon size={22} color={c.primary} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={goToNotifications}
            accessibilityLabel="Notifications"
          >
            <Bell size={22} color={c.primary} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: c.badge }]}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : String(unreadCount)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <View style={[styles.accent, { backgroundColor: c.primary }]} />
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
  title: { flex: 1, fontSize: 19, fontWeight: '800', letterSpacing: 0.3 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: { padding: 6, minWidth: 36, alignItems: 'center' },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  accent: { height: 2, opacity: 0.9 },
});
