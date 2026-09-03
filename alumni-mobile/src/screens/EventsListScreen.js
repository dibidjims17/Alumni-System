// src/screens/EventsListScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../api/client';
import SearchBar from '../components/SearchBar';
import SectionTabs from '../components/SectionTabs';
import AppHeader from '../components/AppHeader';
import Skeleton from '../components/ui/Skeleton';
import { useTheme } from '../theme/ThemeContext';

const COMMUNITY_TABS = [
  { key: 'News', label: 'News', screen: 'NewsList' },
  { key: 'Events', label: 'Events', screen: 'EventsList' },
  { key: 'Alumni', label: 'Alumni', screen: 'Directory' },
];

export default function EventsListScreen({ navigation }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadEvents(search);
    setIsRefreshing(false);
  }

  function renderItem({ item }) {
    const dateText = item.eventDate
      ? new Date(item.eventDate).toLocaleString()
      : '';
    return (
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
        >
          <Text style={[styles.title, { color: c.text }]}>{item.title}</Text>
          <Text style={[styles.detail, { color: c.textMuted }]}>{dateText}</Text>
          <Text style={[styles.detail, { color: c.textMuted }]}>Location: {item.location}</Text>
          <Text style={[styles.description, { color: c.text }]} numberOfLines={3}>
            {item.description}
          </Text>
        </TouchableOpacity>
        <View style={styles.footer}>
          <Text style={[styles.count, { color: c.textMuted }]}>{item.attendeeCount || 0} going</Text>
          <TouchableOpacity
            style={[
              styles.rsvpButton,
              { borderColor: c.border },
              item.isRsvped && { backgroundColor: c.border },
            ]}
            onPress={() => toggleRsvp(item)}
            disabled={togglingId === item.id}
          >
            {togglingId === item.id ? (
              <ActivityIndicator size="small" color={c.primary} />
            ) : (
              <Text style={[styles.rsvpText, { color: c.text }]}>
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
      <AppHeader title="Community" navigation={navigation} />
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
        <View style={styles.skeletonList}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.skeletonCard, { backgroundColor: c.surface, borderColor: c.border }]}
            >
              <Skeleton width="60%" height={17} style={{ marginBottom: 8 }} />
              <Skeleton width="90%" height={12} style={{ marginBottom: 6 }} />
              <Skeleton width="70%" height={12} style={{ marginBottom: 10 }} />
              <View style={styles.skeletonFooter}>
                <Skeleton width={70} height={12} />
                <Skeleton width={90} height={28} borderRadius={4} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={events}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <Text style={[styles.infoText, { color: c.textMuted }]}>
              {search.trim() ? 'No events match your search.' : 'No upcoming events.'}
            </Text>
          }
          />
        )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: {
    margin: 16,
    marginBottom: 8,
  },
  list: { flex: 1 },
  skeletonList: {
    padding: 16,
  },
  skeletonCard: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginBottom: 10,
  },
  skeletonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  card: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
  },
  title: { fontSize: 16, fontWeight: '700' },
  detail: { fontSize: 12, marginTop: 4 },
  description: { fontSize: 13, marginTop: 8 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  count: { fontSize: 12, fontWeight: '600' },
  rsvpButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  rsvpText: { fontSize: 13 },
  infoText: { fontSize: 14, textAlign: 'center' },
});
