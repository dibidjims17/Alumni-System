// src/screens/NewsListScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../api/client';
import SearchBar from '../components/SearchBar';
import SectionTabs from '../components/SectionTabs';

const COMMUNITY_TABS = [
  { key: 'News', label: 'News', screen: 'NewsList' },
  { key: 'Events', label: 'Events', screen: 'EventsList' },
  { key: 'Alumni', label: 'Alumni', screen: 'Directory' },
];

export default function NewsListScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  async function fetchNews(activeSearch = '') {
    try {
      const query = activeSearch.trim()
        ? `/News?page=1&search=${encodeURIComponent(activeSearch.trim())}`
        : '/News?page=1';
      const res = await apiClient.get(query);
      setItems(res.data.items || []);
      setError(null);
    } catch (err) {
      setError('Could not load news. Pull down to try again.');
    }
  }

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      setSearch('');
      fetchNews('').finally(() => setIsLoading(false));
    }, [])
  );

  async function handleRefresh() {
    setIsRefreshing(true);
    await fetchNews(search);
    setIsRefreshing(false);
  }

  function submitSearch() {
    setIsLoading(true);
    fetchNews(search).finally(() => setIsLoading(false));
  }

  function renderItem({ item }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('NewsDetail', { newsId: item.id })}
      >
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.preview} numberOfLines={2}>
          {item.content}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{item.postedByAdminName}</Text>
          <Text style={styles.metaText}>
            {item.heartCount} hearts, {item.commentCount} comments
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <SectionTabs items={COMMUNITY_TABS} active="NewsList" navigation={navigation} />
      {error && <Text style={styles.errorText}>{error}</Text>}
      <View style={styles.searchRow}>
        <SearchBar
          placeholder="Search news"
          value={search}
          onChangeText={setSearch}
          onSubmit={submitSearch}
        />
      </View>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {search.trim() ? 'No posts match your search.' : 'No news posts yet.'}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchRow: {
    margin: 16,
    marginBottom: 0,
  },
  listContent: { padding: 16 },
  card: {
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  title: { fontSize: 16, marginBottom: 6 },
  preview: { fontSize: 13, marginBottom: 10 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: { fontSize: 11 },
  errorText: {
    textAlign: 'center',
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
  },
});