// src/screens/HomeScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import {
  Newspaper,
  Briefcase,
  CalendarDays,
  Users,
  User,
  Bell,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import apiClient from '../api/client';

const TILES = [
  { key: 'news', label: 'News', Icon: Newspaper, target: ['CommunityTab', 'NewsList'] },
  { key: 'jobs', label: 'Jobs', Icon: Briefcase, target: ['CareerTab', 'JobsList'] },
  { key: 'events', label: 'Events', Icon: CalendarDays, target: ['CommunityTab', 'EventsList'] },
  { key: 'directory', label: 'Find Alumni', Icon: Users, target: ['CommunityTab', 'Directory'] },
  { key: 'profile', label: 'Profile', Icon: User, target: ['ProfileTab', 'Profile'] },
];

export default function HomeScreen({ navigation }) {
  const { student } = useAuth();
  const { theme } = useTheme();
  const c = theme.colors;
  const { width } = useWindowDimensions();
  // Column count follows the actual window width so phones, landscape
  // tablets, and split-screen windows all get a fitting grid.
  const numColumns = width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const tileBasis = numColumns === 2 ? '48%' : numColumns === 3 ? '31%' : '23%';
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      apiClient
        .get('/Notification/unread-count')
        .then((res) => setUnreadCount(res.data.count || 0))
        .catch(() => {});
    }, [])
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: c.text }]}>Welcome, {student?.fullName}</Text>
          <Text style={[styles.detail, { color: c.textMuted }]}>
            {student?.studentNumber} • {student?.program}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => navigation.navigate('Notifications')}
          accessibilityLabel="Notifications"
        >
          <Bell size={26} color={c.primary} />
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: c.badge }]}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : String(unreadCount)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {TILES.map(({ key, label, Icon, target }) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.tile,
                { backgroundColor: c.surface, borderColor: c.border, flexBasis: tileBasis },
              ]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate(target[0], { screen: target[1] })}
            >
              <Icon size={32} color={c.primary} />
              <Text style={[styles.tileLabel, { color: c.text }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.3,
    lineHeight: 32,
  },
  detail: {
    fontSize: 14,
    marginTop: 4,
  },
  bellButton: {
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  tile: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 26,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tileLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
  },
});
