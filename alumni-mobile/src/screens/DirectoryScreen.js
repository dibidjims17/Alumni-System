// src/screens/DirectoryScreen.js
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../api/client';

function buildQuery(search, program, schoolYear, page) {
  const params = new URLSearchParams();
  if (search.trim()) params.append('search', search.trim());
  if (program) params.append('program', program);
  if (schoolYear) params.append('schoolYear', schoolYear);
  params.append('page', String(page));
  return `/Directory?${params.toString()}`;
}

export default function DirectoryScreen() {
  const [search, setSearch] = useState('');
  const [program, setProgram] = useState('');
  const [schoolYear, setSchoolYear] = useState('');
  const [filters, setFilters] = useState({ programs: [], schoolYears: [] });

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageRef = useRef(1);

  async function loadFilters() {
    try {
      const res = await apiClient.get('/Directory/filters');
      setFilters({
        programs: res.data.programs || [],
        schoolYears: res.data.schoolYears || [],
      });
    } catch (err) {
      // filters are a nicety — search still works without them
    }
  }

  async function loadDirectory(resetPage, activeSearch, activeProgram, activeYear) {
    if (isLoadingMore) return;
    const targetPage = resetPage ? 1 : pageRef.current + 1;
    if (resetPage) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    try {
      const res = await apiClient.get(buildQuery(activeSearch, activeProgram, activeYear, targetPage));
      const newItems = res.data.items || [];
      if (resetPage) {
        setItems(newItems);
      } else {
        setItems((prev) => [...prev, ...newItems]);
      }
      setTotal(res.data.total || 0);
      pageRef.current = targetPage;
    } catch (err) {
      const message = err.response?.data?.message || 'Could not load directory.';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadFilters();
      setSearch('');
      setProgram('');
      setSchoolYear('');
      loadDirectory(true, '', '', '');
    }, [])
  );

  function applyFilters(nextProgram, nextYear) {
    setProgram(nextProgram);
    setSchoolYear(nextYear);
    loadDirectory(true, search, nextProgram, nextYear);
  }

  function submitSearch() {
    loadDirectory(true, search, program, schoolYear);
  }

  function renderChips(values, selected, onSelect) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        <TouchableOpacity
          style={[styles.chip, selected === '' && styles.chipActive]}
          onPress={() => onSelect('')}
        >
          <Text style={styles.chipText}>All</Text>
        </TouchableOpacity>
        {values.map((value) => (
          <TouchableOpacity
            key={value}
            style={[styles.chip, selected === value && styles.chipActive]}
            onPress={() => onSelect(value)}
          >
            <Text style={styles.chipText}>{value}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  function renderItem({ item }) {
    return (
      <View style={styles.card}>
        <Text style={styles.name}>{item.fullName}</Text>
        <Text style={styles.meta}>
          {item.program}{item.schoolYear ? ` • ${item.schoolYear}` : ''}
        </Text>
        {item.headline ? <Text style={styles.headline}>{item.headline}</Text> : null}
        {item.location ? <Text style={styles.meta}>{item.location}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by name"
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={submitSearch}
        returnKeyType="search"
      />

      <Text style={styles.filterLabel}>Program</Text>
      {renderChips(filters.programs, program, (value) => applyFilters(value, schoolYear))}

      <Text style={styles.filterLabel}>Batch</Text>
      {renderChips(filters.schoolYears, schoolYear, (value) => applyFilters(program, value))}

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} size="large" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(_, index) => String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No alumni found. Try a different search.</Text>
          }
          ListFooterComponent={
            items.length > 0 && items.length < total ? (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => loadDirectory(false, search, program, schoolYear)}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Text style={styles.loadMoreText}>
                    Load more ({items.length} of {total})
                  </Text>
                )}
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  searchInput: {
    borderWidth: 1,
    padding: 10,
  },
  filterLabel: { fontSize: 12, marginTop: 12, marginBottom: 4 },
  chipRow: { flexGrow: 0, marginBottom: 4 },
  chip: {
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#ddd',
  },
  chipText: { fontSize: 12 },
  listContent: { paddingTop: 12, paddingBottom: 24 },
  card: {
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  name: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, color: '#555', marginTop: 2 },
  headline: { fontSize: 13, marginTop: 6 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 13 },
  loadMoreButton: { padding: 12, alignItems: 'center', borderWidth: 1, marginTop: 4 },
  loadMoreText: { fontSize: 13 },
});
