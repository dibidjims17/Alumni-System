// src/screens/EventDetailScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../api/client';
import Skeleton from '../components/ui/Skeleton';
import { useTheme } from '../theme/ThemeContext';

export default function EventDetailScreen({ route, navigation }) {
  const { eventId } = route.params;
  const { theme } = useTheme();
  const c = theme.colors;
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [notFound, setNotFound] = useState(false);

  async function fetchEvent() {
    try {
      setNotFound(false);
      const res = await apiClient.get(`/Events/${eventId}`);
      setEvent(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        Alert.alert('Error', 'Could not load this event.');
      }
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

  async function handleRefresh() {
    setIsRefreshing(true);
    await fetchEvent();
    setIsRefreshing(false);
  }

  if (isLoading) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: c.background }]}
        contentContainerStyle={styles.content}
      >
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Skeleton width="75%" height={20} style={{ marginBottom: 8 }} />
          <Skeleton width="55%" height={13} style={{ marginBottom: 6 }} />
          <Skeleton width="45%" height={13} />
        </View>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Skeleton width="40%" height={14} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={13} style={{ marginBottom: 6 }} />
          <Skeleton width="100%" height={13} style={{ marginBottom: 6 }} />
          <Skeleton width="70%" height={13} />
        </View>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Skeleton width="30%" height={13} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={44} borderRadius={8} />
        </View>
      </ScrollView>
    );
  }

  if (!event) {
    return (
      <View style={[styles.centered, { backgroundColor: c.background }]}>
        <Text style={[styles.notFoundTitle, { color: c.text }]}>No longer available</Text>
        <Text style={[styles.notFoundText, { color: c.textMuted }]}>
          This event may have been removed by an admin.
        </Text>
        <TouchableOpacity
          style={[styles.goBackButton, { borderColor: c.border }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.goBackText, { color: c.primary }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[c.primary]}
          tintColor={c.primary}
        />
      }
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  notFoundTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  notFoundText: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  goBackButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderRadius: 8,
  },
  goBackText: { fontSize: 14, fontWeight: '600' },
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
