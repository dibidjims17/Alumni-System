// src/components/TopBar.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { House, Users, Briefcase, User, Bell } from 'lucide-react-native';
import apiClient from '../api/client';

const ACCENT = '#1a4fd8';

const GROUPS = [
  {
    key: 'Home',
    label: 'Home',
    Icon: House,
    defaultScreen: 'Home',
    subs: [{ key: 'Home', label: 'Home', screen: 'Home' }],
  },
  {
    key: 'Community',
    label: 'Community',
    Icon: Users,
    defaultScreen: 'NewsList',
    subs: [
      { key: 'News', label: 'News', screen: 'NewsList' },
      { key: 'Events', label: 'Events', screen: 'EventsList' },
      { key: 'Directory', label: 'Directory', screen: 'Directory' },
    ],
  },
  {
    key: 'Career',
    label: 'Career',
    Icon: Briefcase,
    defaultScreen: 'JobsList',
    subs: [
      { key: 'Jobs', label: 'Jobs', screen: 'JobsList' },
      { key: 'Applications', label: 'Applications', screen: 'MyApplications' },
    ],
  },
  {
    key: 'Account',
    label: 'Account',
    Icon: User,
    defaultScreen: 'Profile',
    subs: [{ key: 'Profile', label: 'Profile', screen: 'Profile' }],
  },
];

function findGroup(active) {
  return GROUPS.find((group) => group.subs.some((sub) => sub.screen === active)) || null;
}

export default function TopBar({ active, navigation }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    apiClient
      .get('/Notification/unread-count')
      .then((res) => setUnreadCount(res.data.count || 0))
      .catch(() => {});
  }, []);

  const activeGroup = findGroup(active);
  const showSubs = activeGroup && activeGroup.subs.length > 1;

  function goTo(screen) {
    if (screen !== active) {
      navigation.navigate(screen);
    }
  }

  return (
    <View style={styles.bar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {GROUPS.map((group) => {
          const isActive = activeGroup?.key === group.key;
          const color = isActive ? ACCENT : '#555';
          return (
            <TouchableOpacity
              key={group.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => goTo(group.defaultScreen)}
            >
              <group.Icon size={20} color={color} />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {group.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={styles.tab} onPress={() => goTo('Notifications')}>
          <View>
            <Bell size={20} color={active === 'Notifications' ? ACCENT : '#555'} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : String(unreadCount)}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={[styles.tabLabel, active === 'Notifications' && styles.tabLabelActive]}
          >
            Alerts
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {showSubs && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subs}
        >
          {activeGroup.subs.map((sub) => {
            const isActive = sub.screen === active;
            return (
              <TouchableOpacity
                key={sub.key}
                style={[styles.sub, isActive && styles.subActive]}
                onPress={() => goTo(sub.screen)}
              >
                <Text style={[styles.subLabel, isActive && styles.subLabelActive]}>
                  {sub.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: ACCENT,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    color: '#555',
  },
  tabLabelActive: {
    color: ACCENT,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#cc0000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  subs: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  sub: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  subActive: {
    borderColor: ACCENT,
    backgroundColor: '#eee',
  },
  subLabel: {
    fontSize: 12,
    color: '#555',
  },
  subLabelActive: {
    color: ACCENT,
    fontWeight: '600',
  },
});
