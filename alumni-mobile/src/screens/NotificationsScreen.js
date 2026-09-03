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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../api/client';
import TopBar from '../components/TopBar';

export default function NotificationsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    try {
      await apiClient.put('/Notification/read-all');
      fetchNotifications();
    } catch (err) {
      // silent
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
        navigation.navigate('MyApplications');
        break;
      case 'JOB':
        navigation.navigate('JobDetail', { jobId: item.relatedId });
        break;
      case 'MENTION':
      case 'COMMENT_REPLY':
        navigation.navigate('NewsDetail', { newsId: item.relatedId });
        break;
      default:
        break;
    }
  }

  function renderItem({ item }) {
    return (
      <TouchableOpacity
        style={[styles.card, !item.isRead && styles.unreadCard]}
        onPress={() => handleTapNotification(item)}
      >
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <TopBar active="Notifications" navigation={navigation} />
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <>
          <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllRead}>
            <Text style={styles.buttonText}>Mark all as read</Text>
          </TouchableOpacity>

          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
            }
            ListEmptyComponent={<Text style={styles.emptyText}>No notifications yet.</Text>}
          />
        </>
      )}
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
  },
  unreadCard: {
    borderWidth: 2,
  },
  title: { fontSize: 14, marginBottom: 4 },
  message: { fontSize: 13, marginBottom: 4 },
  meta: { fontSize: 11 },
  emptyText: { textAlign: 'center', marginTop: 40 },
  buttonText: { fontSize: 13 },
});