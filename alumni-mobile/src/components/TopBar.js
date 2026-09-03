// src/components/TopBar.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { House, Newspaper, Briefcase, CalendarDays, Users, User, Bell } from 'lucide-react-native';
import apiClient from '../api/client';

const ACCENT = '#1a4fd8';

const TABS = [
  { key: 'Home', screen: 'Home', Icon: House },
  { key: 'News', screen: 'NewsList', Icon: Newspaper },
  { key: 'Jobs', screen: 'JobsList', Icon: Briefcase },
  { key: 'Events', screen: 'EventsList', Icon: CalendarDays },
  { key: 'Directory', screen: 'Directory', Icon: Users },
  { key: 'Profile', screen: 'Profile', Icon: User },
];

export default function TopBar({ active, navigation }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    apiClient
      .get('/Notification/unread-count')
      .then((res) => setUnreadCount(res.data.count || 0))
      .catch(() => {});
  }, []);

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
        {TABS.map(({ key, screen, Icon }) => {
          const isActive = key === active;
          const color = isActive ? ACCENT : '#555';
          return (
            <TouchableOpacity
              key={key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => goTo(screen)}
            >
              <Icon size={20} color={color} />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{key}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={styles.tab} onPress={() => goTo('Notifications')}>
          <View>
            <Bell size={20} color="#555" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : String(unreadCount)}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.tabLabel}>Alerts</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingHorizontal: 12,
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
});
