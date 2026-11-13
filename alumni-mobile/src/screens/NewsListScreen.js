// src/screens/NewsListScreen.js
import React, { useState, useCallback, useRef } from 'react';
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
import { Heart, MessageCircle, Globe } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { assetUrl } from '../utils/media';
import SearchBar from '../components/SearchBar';
import SectionTabs from '../components/SectionTabs';
import AppHeader from '../components/AppHeader';
import AppBackground from '../components/AppBackground';
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
  // Natural image sizes (from onLoad) so feed images render at their true
  // aspect ratio instead of being cropped to a fixed height.
  const [imageDims, setImageDims] = useState({});
  // Post bodies expanded via "See more" (Facebook-style inline expand).
  const [expandedBodies, setExpandedBodies] = useState(() => new Set());
  // Focus callbacks are stable, so mirror search in a ref for silent refetches.
  const searchRef = useRef('');
  const hasLoadedRef = useRef(false);
  searchRef.current = search;

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
      if (hasLoadedRef.current) {
        // Refocus: refresh silently so search text and results persist.
        fetchNews(searchRef.current);
        return;
      }
      setIsLoading(true);
      fetchNews('').finally(() => {
        hasLoadedRef.current = true;
        setIsLoading(false);
      });
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
        activeOpacity={0.75}
        onPress={() => navigation.navigate('NewsDetail', { newsId: item.id })}
      >
        {/* Facebook-style post: avatar + name/time header, full-width text,
            full-width image, reaction counts, Like/Comment action bar. */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.postHeader}>
            {authorUrl ? (
              <Image source={{ uri: authorUrl }} style={styles.postAvatar} />
            ) : (
              <View style={[styles.postAvatar, styles.postAvatarFallback, { backgroundColor: c.primaryTint }]}>
                <Text style={[styles.postAvatarText, { color: c.primary }]}>
                  {(item.postedByAdminName || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.postHeaderText}>
              <Text style={[styles.postAuthor, { color: c.text }]} numberOfLines={1}>
                {item.postedByAdminName}
              </Text>
              <View style={styles.postMetaRow}>
                <Text style={[styles.postDate, { color: c.textMuted }]} numberOfLines={1}>
                  {item.postedAt ? new Date(item.postedAt).toLocaleDateString() : ''}
                </Text>
                <Globe size={11} color={c.textMuted} />
              </View>
            </View>
          </View>

          <Text style={[styles.postTitle, { color: c.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          {(() => {
            // Facebook-style body: ONE line + inline "See more". RN drops
            // trailing text past the ellipsis, so the string is cut to a
            // screen-aware budget that leaves room for " See more" on line 1;
            // numberOfLines 2 is only a safety net for estimate drift.
            const body = item.content || '';
            const textWidth = screenWidth - 60; // card + postBody padding
            const charsPerLine = Math.max(20, Math.floor(textWidth / 6.9));
            const budget = Math.max(24, charsPerLine - 12);
            const needsMore = body.length > budget;
            const isExpanded = expandedBodies.has(item.id);
            const shown =
              needsMore && !isExpanded ? `${body.slice(0, budget).trimEnd()}…` : body;
            return (
              <Text
                style={[styles.postBody, { color: c.textMuted }]}
                numberOfLines={isExpanded ? undefined : 2}
              >
                {shown}
                {needsMore && !isExpanded && (
                  <Text
                    style={[styles.seeMore, { color: c.primary }]}
                    onPress={() =>
                      setExpandedBodies((prev) => {
                        const next = new Set(prev);
                        next.add(item.id);
                        return next;
                      })
                    }
                  >
                    {' '}See more
                  </Text>
                )}
                {needsMore && isExpanded && (
                  <Text
                    style={[styles.seeMore, { color: c.primary }]}
                    onPress={() =>
                      setExpandedBodies((prev) => {
                        const next = new Set(prev);
                        next.delete(item.id);
                        return next;
                      })
                    }
                  >
                    {' '}See less
                  </Text>
                )}
              </Text>
            );
          })()}

          {imageUrl && (() => {
            // Facebook feed behavior: image fills the card width at its true
            // aspect ratio (no crop); extreme portraits are capped so one
            // image can't swallow the feed — tapping opens the raw image.
            const dims = imageDims[imageUrl];
            const cardWidth = screenWidth - 32; // listContent padding, 16 × 2
            const naturalHeight = dims ? cardWidth * (dims.height / dims.width) : 200;
            const imageHeight = Math.min(Math.max(naturalHeight, 120), 660);
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setViewerImage(imageUrl)}
                accessibilityLabel="View image fullscreen"
              >
                <Image
                  source={{ uri: imageUrl }}
                  style={[styles.postImage, { height: imageHeight, backgroundColor: c.surfaceAlt }]}
                  resizeMode="cover"
                  onLoad={(event) => {
                    const nw = event?.nativeEvent?.source?.width;
                    const nh = event?.nativeEvent?.source?.height;
                    if (nw > 0 && nh > 0) {
                      setImageDims((prev) =>
                        prev[imageUrl] ? prev : { ...prev, [imageUrl]: { width: nw, height: nh } }
                      );
                    }
                  }}
                />
              </TouchableOpacity>
            );
          })()}

          {(item.heartCount > 0 || item.commentCount > 0) && (
            <View style={styles.countsRow}>
              <View style={styles.countItem}>
                <View style={[styles.countBadge, { backgroundColor: c.heart }]}>
                  <Heart size={9} color="#FFFFFF" fill="#FFFFFF" />
                </View>
                <Text style={[styles.countText, { color: c.textMuted }]}>{item.heartCount}</Text>
              </View>
              <View style={styles.countItem}>
                <Text style={[styles.countText, { color: c.textMuted }]}>{item.commentCount}</Text>
                <View style={[styles.countBadge, { backgroundColor: c.primary }]}>
                  <MessageCircle size={9} color="#FFFFFF" fill="#FFFFFF" />
                </View>
              </View>
            </View>
          )}

          <View style={[styles.postDivider, { backgroundColor: c.border }]} />
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => toggleHeart(item)}
              disabled={heartingId === item.id}
              accessibilityLabel={item.isHearted ? 'Unlike' : 'Like'}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Heart
                size={17}
                color={item.isHearted ? c.heart : c.textMuted}
                fill={item.isHearted ? c.heart : 'none'}
              />
              <Text style={[styles.actionLabel, { color: item.isHearted ? c.heart : c.textMuted }]}>
                {item.isHearted ? 'Liked' : 'Like'}
              </Text>
            </TouchableOpacity>
            <View style={[styles.actionDivider, { backgroundColor: c.border }]} />
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('NewsDetail', { newsId: item.id })}
              accessibilityLabel="Open comments"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <MessageCircle size={17} color={c.textMuted} />
              <Text style={[styles.actionLabel, { color: c.textMuted }]}>Comment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top', 'left', 'right']}>
      <AppBackground />
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
              <View style={styles.skeletonBody}>
                <View style={styles.skeletonHeadRow}>
                  <Skeleton width={40} height={40} borderRadius={20} />
                  <View style={styles.skeletonHeadText}>
                    <Skeleton width="55%" height={13} style={{ marginBottom: 6 }} />
                    <Skeleton width="35%" height={11} />
                  </View>
                </View>
                <Skeleton width="100%" height={190} borderRadius={0} />
                <Skeleton width="80%" height={15} style={{ marginTop: 12, marginBottom: 8 }} />
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
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[c.primary]}
              tintColor={c.primary}
            />
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
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
    overflow: 'hidden',
  },
  skeletonBody: {
    padding: 14,
  },
  skeletonHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  skeletonHeadText: {
    flex: 1,
    marginLeft: 10,
  },
  searchRow: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 14, // portal card radius
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
    overflow: 'hidden',
  },
  // ── Facebook-style post ────────────────────────────────────────
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  postAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAvatarText: {
    fontSize: 17,
    fontWeight: '800',
  },
  postHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  postAuthor: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  postMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 5,
  },
  postDate: {
    fontSize: 12,
  },
  postTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    lineHeight: 21,
    paddingHorizontal: 14,
  },
  postBody: {
    fontSize: 13.5,
    lineHeight: 20,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  seeMore: {
    fontWeight: '700',
  },
  postImage: {
    width: '100%',
    marginTop: 12,
  },
  countsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginTop: 12,
  },
  countItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countBadge: {
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  postDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 9,
  },
  actionDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: 6,
  },
  actionLabel: {
    fontSize: 13,
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
