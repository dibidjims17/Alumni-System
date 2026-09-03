// src/screens/EventsListScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../api/client';

export default function EventsListScreen() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);

  async function loadEvents() {
    try {
      const res = await apiClient.get('/Events?page=1');
      setEvents(res.data.items || []);
    } catch (err) {
      const message = err.response?.data?.message || 'Could not load events.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadEvents();
    }, [])
  );

  async function toggleRsvp(event) {
    if (togglingId) return;
    setTogglingId(event.id);
    try {
      const res = await apiClient.post(`/Events/${event.id}/rsvp`);
      const rsvped = res.data.rsvped;
      setEvents((prev) =>
        prev.map((e) =>
          e.id === event.id
            ? {
                ...e,
                isRsvped: rsvped,
                attendeeCount: Math.max(0, (e.attendeeCount || 0) + (rsvped ? 1 : -1)),
              }
            : e
        )
      );
    } catch (err) {
      const message = err.response?.data?.message || 'Could not update RSVP.';
      Alert.alert('Error', message);
    } finally {
      setTogglingId(null);
    }
  }

  function renderItem({ item }) {
    const dateText = item.eventDate
      ? new Date(item.eventDate).toLocaleString()
      : '';
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.detail}>{dateText}</Text>
        <Text style={styles.detail}>Location: {item.location}</Text>
        <Text style={styles.description}>{item.description}</Text>
        <View style={styles.footer}>
          <Text style={styles.count}>{item.attendeeCount || 0} going</Text>
          <TouchableOpacity
            style={[styles.rsvpButton, item.isRsvped && styles.rsvpButtonActive]}
            onPress={() => toggleRsvp(item)}
            disabled={togglingId === item.id}
          >
            {togglingId === item.id ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text style={styles.rsvpText}>
                {item.isRsvped ? 'Cancel RSVP' : "I'm Going"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={events.length === 0 && styles.centered}
      data={events}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      ListEmptyComponent={<Text style={styles.infoText}>No upcoming events.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  card: { margin: 16, marginBottom: 8, padding: 12, borderWidth: 1 },
  title: { fontSize: 16, fontWeight: 'bold' },
  detail: { fontSize: 12, marginTop: 4, color: '#444' },
  description: { fontSize: 13, marginTop: 8 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  count: { fontSize: 12, color: '#555' },
  rsvpButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  rsvpButtonActive: {
    backgroundColor: '#ddd',
  },
  rsvpText: { fontSize: 13 },
  infoText: { fontSize: 13, textAlign: 'center' },
});
