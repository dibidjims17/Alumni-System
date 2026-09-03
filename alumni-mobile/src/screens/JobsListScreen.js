// src/screens/JobsListScreen.js
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
import { useAuth } from '../context/AuthContext';
import SearchBar from '../components/SearchBar';
import SectionTabs from '../components/SectionTabs';

const CAREER_TABS = [
  { key: 'Jobs', label: 'Jobs', screen: 'JobsList' },
  { key: 'Applications', label: 'Applications', screen: 'MyApplications' },
];

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
        <SectionTabs items={CAREER_TABS} active="JobsList" navigation={navigation} />
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
      <SectionTabs items={CAREER_TABS} active="JobsList" navigation={navigation} />
      <View style={styles.searchRow}>
        <SearchBar
          placeholder="Search jobs or companies"
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
    margin: 16,
    marginBottom: 0,
  },
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