import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FileText, ChevronRight } from 'lucide-react-native';
import apiClient from '../api/client';
import AppBackground from '../components/AppBackground';
import { useTheme } from '../theme/ThemeContext';
import Skeleton from '../components/ui/Skeleton';

export default function DocumentsScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  async function fetchDocuments() {
    try {
      const res = await apiClient.get('/Documents/my-documents');
      setItems(res.data || []);
    } catch (err) {
      // silent — empty state shown below
    }
  }

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchDocuments().finally(() => setIsLoading(false));
    }, [])
  );

  async function handleRefresh() {
    setIsRefreshing(true);
    await fetchDocuments();
    setIsRefreshing(false);
  }

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function statusStyle(status) {
    if (status === 'Released') {
      return { backgroundColor: c.tintSuccess, color: c.success };
    }
    return { backgroundColor: c.tintWarning, color: c.warning };
  }

  function renderItem({ item }) {
    const chip = statusStyle(item.status);
    const isExpanded = expandedId === item.id;
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
        onPress={() => toggleExpand(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconWrap}>
            <FileText size={18} color={c.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.docName, { color: c.text }]}>{item.displayName}</Text>
            <Text style={[styles.updatedAt, { color: c.textMuted }]}>
              Updated {new Date(item.updatedAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: chip.backgroundColor }]}>
            <Text style={[styles.statusText, { color: chip.color }]}>{item.status}</Text>
          </View>
          <ChevronRight
            size={16}
            color={c.textMuted}
            style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
          />
        </View>
        {isExpanded && item.notes ? (
          <Text style={[styles.notes, { color: c.text }]}>{item.notes}</Text>
        ) : null}
      </TouchableOpacity>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        <AppBackground />
        <View style={styles.loadingWrap}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[styles.skeletonCard, { backgroundColor: c.surface, borderColor: c.border }]}
            >
              <Skeleton width="45%" height={14} style={{ marginBottom: 8 }} />
              <Skeleton width="30%" height={11} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <AppBackground />
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          items.length > 0 ? (
            <Text style={[styles.intro, { color: c.textMuted }]}>
              Release status of your academic documents. Pull to refresh.
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: c.text }]}>
            No documents on file yet. Contact the Alumni Office if you expect
            to see your Transcript of Records or Diploma here.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { padding: 16 },
  skeletonCard: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginBottom: 12,
  },
  listContent: { padding: 16 },
  intro: { fontSize: 12, marginBottom: 12 },
  card: {
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerText: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  updatedAt: { fontSize: 11 },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginRight: 6,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  notes: {
    fontSize: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.3)',
  },
  emptyText: { textAlign: 'center', marginTop: 40, paddingHorizontal: 20, fontSize: 13, lineHeight: 20 },
});
