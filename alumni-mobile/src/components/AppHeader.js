// src/components/AppHeader.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Moon, Sun, Bell, ChevronLeft } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import apiClient from '../api/client';

// Shared themed header bar: CDM portal style — deep-green bar that fills the
// status-bar inset, white title/icons, signature gold strip beneath.
// Used by tab roots (no back) and pushed detail screens.
export default function AppHeader({ title, navigation, showBack }) {
  const { theme, isDark, toggleDarkMode } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
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
    <View
      style={[
        styles.topFill,
        {
          backgroundColor: c.brandDeep,
          // Extend the green up into the safe-area inset: the parent already
          // pads by insets.top, so the negative margin + matching padding
          // cancel out for content while the green covers the status bar.
          paddingTop: insets.top,
          marginTop: -insets.top,
        },
      ]}
    >
      <View style={styles.bar}>
        {showBack && navigation?.canGoBack?.() ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}
        <Text style={[styles.title, { color: '#FFFFFF' }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={toggleDarkMode}
            accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={22} color="#FFFFFF" /> : <Moon size={22} color="#FFFFFF" />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={goToNotifications}
            accessibilityLabel="Notifications"
          >
            <Bell size={22} color={c.gold} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: c.tintDanger }]}>
                <Text style={[styles.badgeText, { color: c.danger }]}>
                  {unreadCount > 99 ? '99+' : String(unreadCount)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      {/* Signature gold strip under the header (portal pattern). */}
      <View style={[styles.accent, { backgroundColor: c.gold }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  topFill: {},
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: { flex: 1, fontSize: 19, fontWeight: '800', letterSpacing: 0.3 },
  backButton: { padding: 4, marginLeft: -4, marginRight: 2 },
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
    fontSize: 10,
    fontWeight: '600',
  },
  accent: { height: 3 },
});
