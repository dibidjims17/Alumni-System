// src/screens/EventsListScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../api/client';
import SearchBar from '../components/SearchBar';
import SectionTabs from '../components/SectionTabs';

const COMMUNITY_TABS = [
  { key: 'News', label: 'News', screen: 'NewsList' },
  { key: 'Events', label: 'Events', screen: 'EventsList' },
  { key: 'Alumni', label: 'Alumni', screen: 'Directory' },
];

export default function EventsListScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [search, setSearch] = useState('');

  async function loadEvents(activeSearch = '') {
    try {
      const query = activeSearch.trim()
        ? `/Events?page=1&search=${encodeURIComponent(activeSearch.trim())}`
        : '/Events?page=1';
      const res = await apiClient.get(query);
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
      setSearch('');
      loadEvents('');
    }, [])
  );

  async function toggleRsvp(event) {    if (togglingId) return;
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

  function submitSearch() {
    setLoading(true);
    loadEvents(search);
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <SectionTabs items={COMMUNITY_TABS} active="EventsList" navigation={navigation} />
      <View style={styles.searchRow}>
        <SearchBar
          placeholder="Search events or locations"
          value={search}
          onChangeText={setSearch}
          onSubmit={submitSearch}
        />
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={events}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.infoText}>
              {search.trim() ? 'No events match your search.' : 'No upcoming events.'}
            </Text>
          }
          />
        )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f6' },
  searchRow: {
    margin: 16,
    marginBottom: 8,
  },
  list: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
  },
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
