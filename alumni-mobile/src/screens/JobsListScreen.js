// src/screens/JobsListScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';

export default function JobsListScreen({ navigation }) {
  const { student } = useAuth();
  const isGraduate = student?.schoolYear === 'Graduate';

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  async function fetchJobs(activeSearch = '') {
    try {
      const query = activeSearch.trim()
        ? `/Jobs?page=1&search=${encodeURIComponent(activeSearch.trim())}`
        : '/Jobs?page=1';
      const res = await apiClient.get(query);
      setItems(res.data.items || []);
    } catch (err) {
      // silent — empty list will show
    }
  }

  useFocusEffect(
    useCallback(() => {
      if (!isGraduate) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setSearch('');
      fetchJobs('').finally(() => setIsLoading(false));
    }, [isGraduate])
  );

  async function handleRefresh() {
    setIsRefreshing(true);
    await fetchJobs(search);
    setIsRefreshing(false);
  }

  function submitSearch() {
    setIsLoading(true);
    fetchJobs(search).finally(() => setIsLoading(false));
  }

  function resetSearch() {
    setSearch('');
    setIsLoading(true);
    fetchJobs('').finally(() => setIsLoading(false));
  }

  function renderItem({ item }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
      >
        <Text style={styles.title}>{item.jobTitle}</Text>
        <Text style={styles.company}>{item.company} - {item.location}</Text>
        <Text style={styles.meta}>{item.employmentType} - {item.industry}</Text>
        {item.hasApplied && <Text style={styles.appliedTag}>Applied</Text>}
      </TouchableOpacity>
    );
  }

  if (!isGraduate) {
    return (
      <View style={styles.container}>
        <TopBar active="JobsList" navigation={navigation} />
        <View style={styles.centered}>
          <Text style={styles.infoText}>
            Job listings are available for Graduate students only.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopBar active="JobsList" navigation={navigation} />
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search title or company"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={submitSearch}
          returnKeyType="search"
        />
        {search.trim() !== '' && (
          <TouchableOpacity style={styles.resetButton} onPress={resetSearch}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        )}
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
              {search.trim() ? 'No jobs match your search.' : 'No jobs posted yet.'}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  listContent: { padding: 16 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 0,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    padding: 10,
  },
  resetButton: {
    padding: 10,
  },
  resetText: { fontSize: 13, color: '#1a4fd8' },
  card: {
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  title: { fontSize: 16, marginBottom: 4 },
  company: { fontSize: 13, marginBottom: 4 },
  meta: { fontSize: 11 },
  appliedTag: { fontSize: 11, marginTop: 6 },
  emptyText: { textAlign: 'center', marginTop: 40 },
  infoText: { fontSize: 13, textAlign: 'center' },
});