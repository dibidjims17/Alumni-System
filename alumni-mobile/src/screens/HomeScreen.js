// src/screens/HomeScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

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
      <Text style={styles.title}>Welcome, {student?.fullName}</Text>
      <Text style={styles.detail}>Student #: {student?.studentNumber}</Text>
      <Text style={styles.detail}>Program: {student?.program}</Text>
      <Text style={styles.detail}>Year: {student?.schoolYear}</Text>

      <TouchableOpacity
        style={styles.newsButton}
        onPress={() => navigation.navigate('NewsList')}
      >
        <Text style={styles.buttonText}>View News</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.newsButton}
        onPress={() => navigation.navigate('JobsList')}
      >
        <Text style={styles.buttonText}>View Jobs</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.newsButton}
        onPress={() => navigation.navigate('EventsList')}
      >
        <Text style={styles.buttonText}>View Events</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.newsButton}
        onPress={() => navigation.navigate('Notifications')}
      >
        <Text style={styles.buttonText}>
          Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.newsButton}
        onPress={() => navigation.navigate('Profile')}
      >
        <Text style={styles.buttonText}>View Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.buttonText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  detail: {
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  newsButton: {
    marginTop: 24,
    padding: 12,
    alignItems: 'center',
  },
  logoutButton: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
  },
});