// src/screens/MyApplicationsScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../api/client';

export default function MyApplicationsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchApplications() {
    try {
      const res = await apiClient.get('/Jobs/my-applications');
      setItems(res.data || []);
    } catch (err) {
      // silent
    }
  }

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchApplications().finally(() => setIsLoading(false));
    }, [])
  );

  function renderItem({ item }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('JobDetail', { jobId: item.jobId })}
      >
        <Text style={styles.title}>{item.jobTitle}</Text>
        <Text style={styles.company}>{item.company}</Text>
        <Text style={styles.meta}>Applied {new Date(item.appliedAt).toLocaleDateString()}</Text>
        <Text style={styles.status}>Status: {item.status}</Text>
        <Text style={styles.meta}>Resume attached: {item.attachResume ? 'Yes' : 'No'}</Text>
      </TouchableOpacity>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        <Text style={styles.emptyText}>You haven't applied to any jobs yet.</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  card: {
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  title: { fontSize: 15, marginBottom: 4 },
  company: { fontSize: 13, marginBottom: 4 },
  meta: { fontSize: 11, marginBottom: 2 },
  status: { fontSize: 12, marginTop: 4, marginBottom: 2 },
  emptyText: { textAlign: 'center', marginTop: 40 },
});