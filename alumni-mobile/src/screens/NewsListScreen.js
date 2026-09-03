// src/screens/NewsListScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Heart, MessageCircle } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../api/client';
import { assetUrl } from '../utils/media';
import SearchBar from '../components/SearchBar';
import SectionTabs from '../components/SectionTabs';

const ACCENT = '#1a4fd8';
const HEART_ACTIVE = '#e0245e';

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
  const [heartingId, setHeartingId] = useState(null);

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

  async function toggleHeart(item) {
    if (heartingId === item.id) return;
    setHeartingId(item.id);
    try {
      const res = await apiClient.post(`/News/${item.id}/heart`);
      const hearted = res.data.hearted;
      setItems((prev) =>
        prev.map((n) =>
          n.id === item.id
            ? { ...n, isHearted: hearted, heartCount: Math.max(0, n.heartCount + (hearted ? 1 : -1)) }
            : n
        )
      );
    } catch (err) {
      // silent — keep the feed usable even if the heart fails
    } finally {
      setHeartingId(null);
    }
  }

  function renderItem({ item }) {
    const imageUrl = assetUrl(item.imagePath);
    return (
      <View style={styles.card}>
        {imageUrl && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('NewsDetail', { newsId: item.id })}
          >
            <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('NewsDetail', { newsId: item.id })}
        >
          <View style={styles.cardBody}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.preview} numberOfLines={2}>
              {item.content}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actions}>
          <View style={styles.actionMeta}>
            <Text style={styles.author}>{item.postedByAdminName}</Text>
            <Text style={styles.date}>
              {item.postedAt ? new Date(item.postedAt).toLocaleDateString() : ''}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => toggleHeart(item)}
              disabled={heartingId === item.id}
              accessibilityLabel={item.isHearted ? 'Unlike' : 'Like'}
            >
              <Heart
                size={18}
                color={item.isHearted ? HEART_ACTIVE : '#777'}
                fill={item.isHearted ? HEART_ACTIVE : 'none'}
              />
              <Text style={[styles.actionText, item.isHearted && styles.actionTextActive]}>
                {item.heartCount}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('NewsDetail', { newsId: item.id })}
              accessibilityLabel="Comments"
            >
              <MessageCircle size={18} color="#777" />
              <Text style={styles.actionText}>{item.commentCount}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
          style={styles.list}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f6',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchRow: {
    margin: 16,
    marginBottom: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 170,
    backgroundColor: '#eee',
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
    lineHeight: 21,
  },
  preview: {
    fontSize: 13,
    color: '#555',
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
  },
  actionMeta: {
    flex: 1,
    marginRight: 8,
  },
  author: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  date: {
    fontSize: 11,
    color: '#888',
    marginTop: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f4f4f6',
    marginLeft: 8,
  },
  actionText: {
    fontSize: 12,
    marginLeft: 4,
    color: '#777',
  },
  actionTextActive: {
    color: HEART_ACTIVE,
  },
  errorText: {
    textAlign: 'center',
    padding: 8,
    color: '#cc0000',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#888',
  },
});
