// src/screens/NotificationsScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../api/client';
import { useTheme } from '../theme/ThemeContext';

export default function NotificationsScreen({ navigation }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  async function fetchNotifications() {
    try {
      const res = await apiClient.get('/Notification');
      setItems(res.data || []);
    } catch (err) {
      // silent
    }
  }

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchNotifications().finally(() => setIsLoading(false));
    }, [])
  );

  async function handleRefresh() {
    setIsRefreshing(true);
    await fetchNotifications();
    setIsRefreshing(false);
  }

  async function handleMarkAllRead() {
    if (isMarkingAllRead) return;
    setIsMarkingAllRead(true);
    try {
      await apiClient.put('/Notification/read-all');
      await fetchNotifications();
    } catch (err) {
      Alert.alert('Error', 'Could not mark notifications as read.');
    } finally {
      setIsMarkingAllRead(false);
    }
  }

  async function handleTapNotification(item) {
    // Mark as read (fire and forget — don't block navigation on it)
    if (!item.isRead) {
      apiClient.put(`/Notification/${item.id}/read`).catch(() => {});
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
    }

    switch (item.type) {
      case 'APPLICATION_STATUS':
        navigation.navigate('CareerTab', { screen: 'MyApplications' });
        break;
      case 'JOB':
        navigation.navigate('CareerTab', {
          screen: 'JobDetail',
          params: { jobId: item.relatedId },
        });
        break;
      case 'EVENT':
        navigation.navigate('CommunityTab', { screen: 'EventsList' });
        break;
      case 'MENTION':
      case 'COMMENT_REPLY':
        navigation.navigate('CommunityTab', {
          screen: 'NewsDetail',
          params: { newsId: item.relatedId },
        });
        break;
      default:
        break;
    }
  }

  function renderItem({ item }) {
    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: c.surface, borderColor: item.isRead ? c.border : c.primary },
          !item.isRead && styles.unreadCard,
        ]}
        onPress={() => handleTapNotification(item)}
      >
        <Text style={[styles.title, { color: c.text }]}>{item.title}</Text>
        <Text style={[styles.message, { color: c.text }]}>{item.message}</Text>
        <Text style={[styles.meta, { color: c.textMuted }]}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </TouchableOpacity>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <TouchableOpacity
        style={[styles.markAllButton, { backgroundColor: c.primaryTint, borderColor: c.primary }]}
        onPress={handleMarkAllRead}
        disabled={isMarkingAllRead}
      >
        {isMarkingAllRead ? (
          <ActivityIndicator size="small" color={c.primary} />
        ) : (
          <Text style={[styles.buttonText, { color: c.primary }]}>Mark all as read</Text>
        )}
      </TouchableOpacity>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: c.text }]}>No notifications yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  markAllButton: {
    margin: 16,
    marginBottom: 0,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  listContent: { padding: 16 },
  card: {
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  unreadCard: {
    borderWidth: 2,
  },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  message: { fontSize: 13, marginBottom: 4 },
  meta: { fontSize: 11 },
  emptyText: { textAlign: 'center', marginTop: 40 },
  buttonText: { fontSize: 13 },
});
