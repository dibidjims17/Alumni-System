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
import { useTheme } from '../theme/ThemeContext';

export default function EventDetailScreen({ route }) {
  const { eventId } = route.params;
  const { theme } = useTheme();
  const c = theme.colors;
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
      <View style={[styles.centered, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.title, { color: c.text }]}>{event.title}</Text>
        <Text style={[styles.detail, { color: c.textMuted }]}>
          {event.eventDate ? new Date(event.eventDate).toLocaleString() : ''}
        </Text>
        <Text style={[styles.detail, { color: c.textMuted }]}>Location: {event.location}</Text>
        {event.postedByAdminName ? (
          <Text style={[styles.detail, { color: c.textMuted }]}>Posted by {event.postedByAdminName}</Text>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.sectionTitle, { color: c.text }]}>About this event</Text>
        <Text style={[styles.description, { color: c.text }]}>{event.description}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.count, { color: c.textMuted }]}>{event.attendeeCount || 0} going</Text>

        <TouchableOpacity
          style={[
            styles.rsvpButton,
            { borderColor: c.border },
            event.isRsvped && { backgroundColor: c.border },
          ]}
          onPress={toggleRsvp}
          disabled={isToggling}
        >
          {isToggling ? (
            <ActivityIndicator size="small" color={c.primary} />
          ) : (
            <Text style={[styles.rsvpText, { color: c.text }]}>
              {event.isRsvped ? 'Cancel RSVP' : "I'm Going"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  detail: { fontSize: 13, marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  description: { fontSize: 14, lineHeight: 21 },
  count: { fontSize: 13, marginBottom: 12 },
  rsvpButton: {
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  rsvpText: { fontSize: 14 },
});
