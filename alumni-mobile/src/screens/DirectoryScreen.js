// src/screens/DirectoryScreen.js
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../api/client';
import TopBar from '../components/TopBar';

function buildQuery(search, program, page) {
  const params = new URLSearchParams();
  if (search.trim()) params.append('search', search.trim());
  if (program) params.append('program', program);
  params.append('page', String(page));
  return `/Directory?${params.toString()}`;
}

export default function DirectoryScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [program, setProgram] = useState('');
  const [programs, setPrograms] = useState([]);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [programPickerOpen, setProgramPickerOpen] = useState(false);
  const pageRef = useRef(1);

  async function loadFilters() {
    try {
      const res = await apiClient.get('/Directory/filters');
      setPrograms(res.data.programs || []);
    } catch (err) {
      // filters are a nicety — search still works without them
    }
  }

  async function loadDirectory(resetPage, activeSearch, activeProgram) {
    if (isLoadingMore) return;
    const targetPage = resetPage ? 1 : pageRef.current + 1;
    if (resetPage) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    try {
      const res = await apiClient.get(buildQuery(activeSearch, activeProgram, targetPage));
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
      resetFilters();
    }, [])
  );

  function applyProgram(nextProgram) {
    setProgram(nextProgram);
    setProgramPickerOpen(false);
    loadDirectory(true, search, nextProgram);
  }

  function submitSearch() {
    loadDirectory(true, search, program);
  }

  function resetFilters() {
    setSearch('');
    setProgram('');
    loadDirectory(true, '', '');
  }

  function renderItem({ item }) {
    return (
      <View style={styles.card}>
        <Text style={styles.name}>{item.fullName}</Text>
        <Text style={styles.meta}>{item.program}</Text>
        {item.headline ? <Text style={styles.headline}>{item.headline}</Text> : null}
        {item.location ? <Text style={styles.meta}>{item.location}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.outer}>
      <TopBar active="Directory" navigation={navigation} />
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
      <TouchableOpacity style={styles.dropdown} onPress={() => setProgramPickerOpen(true)}>
        <Text style={styles.dropdownText}>{program || 'All programs'}</Text>
        <Text style={styles.dropdownArrow}>▾</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
        <Text style={styles.buttonText}>Reset filter</Text>
      </TouchableOpacity>

      <Modal
        visible={programPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setProgramPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBody}>
            <Text style={styles.modalTitle}>Select program</Text>
            <FlatList
              data={['', ...programs]}
              keyExtractor={(value, index) => `${value}-${index}`}
              renderItem={({ item: value }) => (
                <TouchableOpacity
                  style={[styles.option, value === program && styles.optionActive]}
                  onPress={() => applyProgram(value)}
                >
                  <Text style={styles.optionText}>{value || 'All programs'}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setProgramPickerOpen(false)}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
                onPress={() => loadDirectory(false, search, program)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  container: { flex: 1, padding: 16 },
  searchInput: {
    borderWidth: 1,
    padding: 10,
  },
  filterLabel: { fontSize: 12, marginTop: 12, marginBottom: 4 },
  dropdown: {
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: { fontSize: 13 },
  dropdownArrow: { fontSize: 13 },
  resetButton: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonText: { fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalBody: { backgroundColor: '#fff', padding: 16, maxHeight: '70%' },
  modalTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  option: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' },
  optionActive: { backgroundColor: '#eee' },
  optionText: { fontSize: 14 },
  modalClose: { marginTop: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
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
