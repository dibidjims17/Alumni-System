// src/screens/NewsListScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { Heart, MessageCircle } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { assetUrl } from '../utils/media';
import SearchBar from '../components/SearchBar';
import SectionTabs from '../components/SectionTabs';
import AppHeader from '../components/AppHeader';
import ImageViewer from '../components/ImageViewer';
import Skeleton from '../components/ui/Skeleton';
import { useTheme } from '../theme/ThemeContext';

const COMMUNITY_TABS = [
  { key: 'News', label: 'News', screen: 'NewsList' },
  { key: 'Events', label: 'Events', screen: 'EventsList' },
  { key: 'Alumni', label: 'Alumni', screen: 'Directory' },
];

export default function NewsListScreen({ navigation }) {
  const { theme } = useTheme();
  const { student } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const thumbWidth = Math.round(screenWidth * 0.5);
  const c = theme.colors;
  // The alumni directory is graduate-only; news and events stay open
  // as community teasers.
  const tabs = student?.schoolYear === 'Graduate'
    ? COMMUNITY_TABS
    : COMMUNITY_TABS.filter((t) => t.screen !== 'Directory');
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [heartingId, setHeartingId] = useState(null);
  const [viewerImage, setViewerImage] = useState(null);

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

  function clearSearch() {
    setSearch('');
    setIsLoading(true);
    fetchNews('').finally(() => setIsLoading(false));
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
    const authorUrl = assetUrl(item.postedByAdminPicture);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('NewsDetail', { newsId: item.id })}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: c.surface, borderColor: c.border },
            imageUrl && styles.cardWithImage,
          ]}
        >
          {imageUrl && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setViewerImage(imageUrl)}
              accessibilityLabel="View image fullscreen"
              style={[styles.thumbPress, { width: thumbWidth }]}
            >
              <Image
                source={{ uri: imageUrl }}
                style={[styles.thumb, { backgroundColor: c.surfaceAlt }]}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
          <View style={styles.cardContent}>
            <View style={styles.authorRow}>
              {authorUrl ? (
                <Image source={{ uri: authorUrl }} style={styles.authorAvatar} />
              ) : (
                <View style={[styles.authorFallback, { backgroundColor: c.surfaceAlt }]}>
                  <Text style={[styles.authorFallbackText, { color: c.primary }]}>
                    {(item.postedByAdminName || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={[styles.author, { color: c.text }]} numberOfLines={1}>
                {item.postedByAdminName}
              </Text>
              <Text style={[styles.authorDate, { color: c.textMuted }]} numberOfLines={1}>
                {item.postedAt ? ` · ${new Date(item.postedAt).toLocaleDateString()}` : ''}
              </Text>
            </View>
            <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[styles.preview, { color: c.textMuted }]} numberOfLines={2}>
              {item.content}
            </Text>
            <View style={styles.metaRow}>
              <TouchableOpacity
                style={styles.metaAction}
                onPress={() => toggleHeart(item)}
                disabled={heartingId === item.id}
                accessibilityLabel={item.isHearted ? 'Unlike' : 'Like'}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Heart
                  size={15}
                  color={item.isHearted ? c.heart : c.textMuted}
                  fill={item.isHearted ? c.heart : 'none'}
                />
                <Text style={[styles.metaText, { color: item.isHearted ? c.heart : c.textMuted }]}>
                  {item.heartCount}
                </Text>
              </TouchableOpacity>
              <View style={styles.metaAction}>
                <MessageCircle size={15} color={c.textMuted} />
                <Text style={[styles.metaText, { color: c.textMuted }]}>
                  {item.commentCount}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top', 'left', 'right']}>
      <AppHeader title="Community" navigation={navigation} />
      <SectionTabs items={tabs} active="NewsList" navigation={navigation} />
      {error && <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>}
      <View style={styles.searchRow}>
        <SearchBar
          placeholder="Search news"
          value={search}
          onChangeText={setSearch}
          onSubmit={submitSearch}
          onClear={clearSearch}
        />
      </View>
      {isLoading ? (
        <View style={styles.skeletonList}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.skeletonCard,
                { backgroundColor: c.surface, borderColor: c.border },
              ]}
            >
              <Skeleton width={thumbWidth} height={190} borderRadius={0} />
              <View style={styles.skeletonBody}>
                <Skeleton width="80%" height={15} style={{ marginBottom: 8 }} />
                <Skeleton width="100%" height={13} style={{ marginBottom: 6 }} />
                <Skeleton width="60%" height={12} />
              </View>
            </View>
          ))}
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
      <ImageViewer imageUrl={viewerImage} onClose={() => setViewerImage(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  skeletonList: {
    padding: 16,
  },
  skeletonCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
    overflow: 'hidden',
  },
  skeletonBody: {
    flex: 1,
    padding: 12,
  },
  searchRow: {
    marginHorizontal: 16,
    marginTop: 12,
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
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardWithImage: {
    minHeight: 240,
  },
  thumbPress: {
    alignSelf: 'stretch',
  },
  thumb: {
    flex: 1,
    width: '100%',
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 21,
  },
  preview: {
    fontSize: 13,
    lineHeight: 19,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
  },
  authorFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorFallbackText: {
    fontSize: 12,
    fontWeight: '700',
  },
  author: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  authorDate: {
    fontSize: 11,
    flexShrink: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  metaAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
  },
  metaText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
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
