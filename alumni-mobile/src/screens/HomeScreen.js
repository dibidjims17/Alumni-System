// src/screens/HomeScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Newspaper, Briefcase, CalendarDays, Users, User, Bell, LogOut } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

const ACCENT = '#1a4fd8';

const TILES = [
  { key: 'news', label: 'News', screen: 'NewsList', Icon: Newspaper },
  { key: 'jobs', label: 'Jobs', screen: 'JobsList', Icon: Briefcase },
  { key: 'events', label: 'Events', screen: 'EventsList', Icon: CalendarDays },
  { key: 'directory', label: 'Find Alumni', screen: 'Directory', Icon: Users },
  { key: 'profile', label: 'Profile', screen: 'Profile', Icon: User },
];

export default function HomeScreen({ navigation }) {
  const { student, logout } = useAuth();
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
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Welcome, {student?.fullName}</Text>
          <Text style={styles.detail}>
            {student?.studentNumber} • {student?.program}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => navigation.navigate('Notifications')}
          accessibilityLabel="Notifications"
        >
          <Bell size={26} color={ACCENT} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : String(unreadCount)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {TILES.map(({ key, label, screen, Icon }) => (
          <TouchableOpacity
            key={key}
            style={styles.tile}
            onPress={() => navigation.navigate(screen)}
          >
            <Icon size={32} color={ACCENT} />
            <Text style={styles.tileLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <LogOut size={16} color={ACCENT} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
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
    fontSize: 20,
  },
  detail: {
    fontSize: 13,
    marginTop: 2,
    color: '#555',
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
    backgroundColor: '#cc0000',
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
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  tileLabel: {
    fontSize: 14,
    marginTop: 8,
  },
  logoutButton: {
    marginTop: 'auto',
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    fontSize: 14,
  },
});
