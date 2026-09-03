// src/screens/HomeScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Newspaper, Briefcase, CalendarDays, Users, User, LogOut } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';

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

  return (
    <View style={styles.container}>
      <TopBar active="Home" navigation={navigation} />

      <View style={styles.body}>
        <Text style={styles.title}>Welcome, {student?.fullName}</Text>
        <Text style={styles.detail}>
          {student?.studentNumber} • {student?.program}
        </Text>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 20,
  },
  detail: {
    fontSize: 13,
    marginTop: 2,
    color: '#555',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 24,
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
