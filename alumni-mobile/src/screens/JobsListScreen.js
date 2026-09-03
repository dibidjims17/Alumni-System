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
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import SearchBar from '../components/SearchBar';
import SectionTabs from '../components/SectionTabs';
import AppHeader from '../components/AppHeader';

const CAREER_TABS = [
  { key: 'Jobs', label: 'Jobs', screen: 'JobsList' },
  { key: 'Applications', label: 'Applications', screen: 'MyApplications' },
];

export default function JobsListScreen({ navigation }) {
  const { student } = useAuth();
  const { theme } = useTheme();
  const c = theme.colors;
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

  function formatSalary(min, max) {
    const peso = (v) => `₱${Number(v).toLocaleString()}`;
    if (min && max) return `${peso(min)} – ${peso(max)}`;
    if (min) return `${peso(min)}+`;
    if (max) return `Up to ${peso(max)}`;
    return null;
  }

  function deadlineInfo(deadline) {
    if (!deadline) return null;
    const days = Math.ceil((new Date(deadline) - Date.now()) / 86400000);
    if (days < 0) return null;
    if (days === 0) return { text: 'Closes today', urgent: true };
    if (days === 1) return { text: 'Closes tomorrow', urgent: true };
    if (days <= 7) return { text: `Closing in ${days}d`, urgent: true };
    return {
      text: `Apply by ${new Date(deadline).toLocaleDateString()}`,
      urgent: false,
    };
  }

  function renderItem({ item }) {
    const salary = formatSalary(item.salaryMin, item.salaryMax);
    const deadline = deadlineInfo(item.deadline);
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
        onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
        activeOpacity={0.7}
      >
        <Text style={[styles.title, { color: c.text }]}>{item.jobTitle}</Text>
        <Text style={[styles.company, { color: c.text }]}>
          {item.company}
          {item.location ? (
            <Text style={{ color: c.textMuted }}> • {item.location}</Text>
          ) : null}
        </Text>
        {salary && (
          <Text style={[styles.salary, { color: c.primary }]}>{salary}</Text>
        )}
        <View style={styles.tagRow}>
          {item.employmentType ? (
            <View style={[styles.tag, { backgroundColor: c.surfaceAlt }]}>
              <Text style={[styles.tagText, { color: c.textMuted }]}>
                {item.employmentType}
              </Text>
            </View>
          ) : null}
          {deadline && (
            <View
              style={[
                styles.tag,
                deadline.urgent
                  ? { backgroundColor: c.danger }
                  : { backgroundColor: c.surfaceAlt },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  { color: deadline.urgent ? '#fff' : c.textMuted },
                ]}
              >
                {deadline.text}
              </Text>
            </View>
          )}
          {item.hasApplied && (
            <View style={[styles.tag, { backgroundColor: c.primaryTint }]}>
              <Text style={[styles.tagText, { color: c.primary }]}>Applied</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  if (!isGraduate) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: c.background }]}
        edges={['top', 'left', 'right']}
      >
        <AppHeader title="Career" navigation={navigation} />
        <SectionTabs items={CAREER_TABS} active="JobsList" navigation={navigation} />
        <View style={styles.centered}>
          <Text style={[styles.infoText, { color: c.text }]}>
            Job listings are available for Graduate students only.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.background }]}
      edges={['top', 'left', 'right']}
    >
      <AppHeader title="Career" navigation={navigation} />
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
            <Text style={[styles.emptyText, { color: c.text }]}>
              {search.trim() ? 'No jobs match your search.' : 'No jobs posted yet.'}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  listContent: { padding: 16, paddingBottom: 24 },
  searchRow: {
    margin: 16,
    marginBottom: 8,
  },
  card: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginBottom: 10,
  },
  title: { fontSize: 17, fontWeight: '700', lineHeight: 22 },
  company: { fontSize: 13, marginTop: 2 },
  salary: { fontSize: 15, fontWeight: '800', marginTop: 6 },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  tagText: { fontSize: 11, fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 40 },
  infoText: { fontSize: 13, textAlign: 'center' },
});
