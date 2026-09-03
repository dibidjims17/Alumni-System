// src/screens/EventDetailScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../api/client';

export default function EventDetailScreen({ route }) {
  const { eventId } = route.params;
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  async function fetchEvent() {
    try {
      const res = await apiClient.get(`/Events/${eventId}`);
      setEvent(res.data);
    } catch (err) {
      Alert.alert('Error', 'Could not load this event.');
    }
  }

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchEvent().finally(() => setIsLoading(false));
    }, [eventId])
  );

  async function toggleRsvp() {
    if (isToggling || !event) return;
    setIsToggling(true);
    try {
      const res = await apiClient.post(`/Events/${event.id}/rsvp`);
      const rsvped = res.data.rsvped;
      setEvent((prev) =>
        prev
          ? {
              ...prev,
              isRsvped: rsvped,
              attendeeCount: Math.max(0, (prev.attendeeCount || 0) + (rsvped ? 1 : -1)),
            }
          : prev
      );
    } catch (err) {
      const message = err.response?.data?.message || 'Could not update RSVP.';
      Alert.alert('Error', message);
    } finally {
      setIsToggling(false);
    }
  }

  if (isLoading || !event) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.detail}>
        {event.eventDate ? new Date(event.eventDate).toLocaleString() : ''}
      </Text>
      <Text style={styles.detail}>Location: {event.location}</Text>
      {event.postedByAdminName ? (
        <Text style={styles.detail}>Posted by {event.postedByAdminName}</Text>
      ) : null}

      <Text style={styles.sectionTitle}>About this event</Text>
      <Text style={styles.description}>{event.description}</Text>

      <Text style={styles.count}>{event.attendeeCount || 0} going</Text>

      <TouchableOpacity
        style={[styles.rsvpButton, event.isRsvped && styles.rsvpButtonActive]}
        onPress={toggleRsvp}
        disabled={isToggling}
      >
        {isToggling ? (
          <ActivityIndicator size="small" />
        ) : (
          <Text style={styles.rsvpText}>
            {event.isRsvped ? 'Cancel RSVP' : "I'm Going"}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  detail: { fontSize: 13, color: '#555', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  description: { fontSize: 14, lineHeight: 21, color: '#333' },
  count: { fontSize: 13, color: '#555', marginTop: 16 },
  rsvpButton: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  rsvpButtonActive: {
    backgroundColor: '#ddd',
  },
  rsvpText: { fontSize: 14 },
});
