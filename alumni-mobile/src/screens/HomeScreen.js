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
  ChevronRight,
  CheckCheck,
  Moon,
  Sun,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import apiClient from '../api/client';

const TILES = [
  { key: 'news', label: 'News', sub: 'Updates & stories', Icon: Newspaper, target: ['CommunityTab', 'NewsList'] },
  { key: 'jobs', label: 'Jobs', sub: 'Openings & applications', Icon: Briefcase, target: ['CareerTab', 'JobsList'] },
  { key: 'events', label: 'Events', sub: 'Reunions & fairs', Icon: CalendarDays, target: ['CommunityTab', 'EventsList'] },
  { key: 'directory', label: 'Find Alumni', sub: 'Batchmates & directory', Icon: Users, target: ['CommunityTab', 'Directory'] },
  { key: 'profile', label: 'Profile', sub: 'You & your résumé', Icon: User, target: ['ProfileTab', 'Profile'] },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen({ navigation }) {
  const { student } = useAuth();
  const { theme, isDark, toggleDarkMode } = useTheme();
  const c = theme.colors;
  const { width } = useWindowDimensions();
  // Column count follows the actual window width so phones, landscape
  // tablets, and split-screen windows all get a fitting grid.
  const numColumns = width >= 900 ? 3 : width >= 600 ? 2 : 2;
  const tileBasis = numColumns === 3 ? '31%' : '48%';
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      apiClient
        .get('/Notification/unread-count')
        .then((res) => setUnreadCount(res.data.count || 0))
        .catch(() => {});
    }, [])
  );

  const firstName = (student?.fullName || 'Alumni').split(' ')[0];
  const initial = (student?.fullName || 'A').charAt(0).toUpperCase();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: c.primary }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.greet, { color: c.textMuted }]}>
            {greeting()},
          </Text>
          <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
            {firstName}
          </Text>
          <Text style={[styles.detail, { color: c.textMuted }]} numberOfLines={1}>
            {student?.studentNumber} • {student?.program}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={toggleDarkMode}
            accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={22} color={c.primary} /> : <Moon size={22} color={c.primary} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => navigation.navigate('Notifications')}
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: c.primaryStrong }]}>
          <View style={styles.heroGlow} />
          <View style={styles.heroGlowSmall} />
          <Text style={styles.heroKicker}>REUNIO · ALUMNI CONNECT</Text>
          <Text style={styles.heroTitle}>
            {unreadCount > 0
              ? `${unreadCount} new notification${unreadCount === 1 ? '' : 's'}`
              : "You're all caught up"}
          </Text>
          <Text style={styles.heroSub}>
            {unreadCount > 0
              ? 'Application updates, jobs, and news waiting for you.'
              : 'No new alerts. Explore jobs, news, and events below.'}
          </Text>
          <TouchableOpacity
            style={styles.heroButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Notifications')}
          >
            {unreadCount > 0 ? (
              <Bell size={15} color="#14471A" />
            ) : (
              <CheckCheck size={15} color="#14471A" />
            )}
            <Text style={styles.heroButtonText}>
              {unreadCount > 0 ? 'View notifications' : 'Review anyway'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLabel, { color: c.textMuted }]}>EXPLORE</Text>

        <View style={styles.grid}>
          {TILES.map(({ key, label, sub, Icon, target }) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.tile,
                { backgroundColor: c.surface, borderColor: c.border, flexBasis: tileBasis },
              ]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate(target[0], { screen: target[1] })}
            >
              <View style={[styles.tileIcon, { backgroundColor: c.primaryTint }]}>
                <Icon size={22} color={c.primary} />
              </View>
              <View style={styles.tileText}>
                <Text style={[styles.tileLabel, { color: c.text }]}>{label}</Text>
                <Text style={[styles.tileSub, { color: c.textMuted }]} numberOfLines={1}>
                  {sub}
                </Text>
              </View>
              <ChevronRight size={16} color={c.textMuted} />
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
    marginBottom: 18,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '800',
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  greet: {
    fontSize: 13,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.3,
    lineHeight: 28,
  },
  detail: {
    fontSize: 12.5,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  hero: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    right: -60,
    top: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  heroGlowSmall: {
    position: 'absolute',
    right: 60,
    bottom: -70,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  heroKicker: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 14,
    gap: 6,
  },
  heroButtonText: {
    color: '#14471A',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  tileIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    flex: 1,
  },
  tileLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  tileSub: {
    fontSize: 11.5,
    marginTop: 1,
  },
});
