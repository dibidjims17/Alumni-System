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
import { useTheme } from '../theme/ThemeContext';

const COMMUNITY_TABS = [
  { key: 'News', label: 'News', screen: 'NewsList' },
  { key: 'Events', label: 'Events', screen: 'EventsList' },
  { key: 'Alumni', label: 'Alumni', screen: 'Directory' },
];

export default function NewsListScreen({ navigation }) {
  const { theme } = useTheme();
  const c = theme.colors;
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
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        {imageUrl && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('NewsDetail', { newsId: item.id })}
          >
            <Image
              source={{ uri: imageUrl }}
              style={[styles.cardImage, { backgroundColor: c.surfaceAlt }]}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('NewsDetail', { newsId: item.id })}
        >
          <View style={styles.cardBody}>
            <Text style={[styles.title, { color: c.text }]}>{item.title}</Text>
            <Text style={[styles.preview, { color: c.textMuted }]} numberOfLines={2}>
              {item.content}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={[styles.actions, { borderColor: c.border }]}>
          <View style={styles.actionMeta}>
            <Text style={[styles.author, { color: c.text }]}>{item.postedByAdminName}</Text>
            <Text style={[styles.date, { color: c.textMuted }]}>
              {item.postedAt ? new Date(item.postedAt).toLocaleDateString() : ''}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: c.background }]}
              onPress={() => toggleHeart(item)}
              disabled={heartingId === item.id}
              accessibilityLabel={item.isHearted ? 'Unlike' : 'Like'}
            >
              <Heart
                size={18}
                color={item.isHearted ? c.heart : c.textMuted}
                fill={item.isHearted ? c.heart : 'none'}
              />
              <Text
                style={[styles.actionText, { color: item.isHearted ? c.heart : c.textMuted }]}
              >
                {item.heartCount}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: c.background }]}
              onPress={() => navigation.navigate('NewsDetail', { newsId: item.id })}
              accessibilityLabel="Comments"
            >
              <MessageCircle size={18} color={c.textMuted} />
              <Text style={[styles.actionText, { color: c.textMuted }]}>{item.commentCount}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top', 'left', 'right']}>
      <SectionTabs items={COMMUNITY_TABS} active="NewsList" navigation={navigation} />
      {error && <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>}
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
          <ActivityIndicator size="large" color={c.primary} />
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
            <Text style={[styles.emptyText, { color: c.textMuted }]}>
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
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 170,
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 21,
  },
  preview: {
    fontSize: 13,
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
  },
  actionMeta: {
    flex: 1,
    marginRight: 8,
  },
  author: {
    fontSize: 12,
    fontWeight: '500',
  },
  date: {
    fontSize: 11,
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
    marginLeft: 8,
  },
  actionText: {
    fontSize: 12,
    marginLeft: 4,
  },
  errorText: {
    textAlign: 'center',
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
  },
});
