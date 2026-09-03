// src/screens/DirectoryScreen.js
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../api/client';
import { API_BASE_URL } from '../config';
import SearchBar from '../components/SearchBar';
import SectionTabs from '../components/SectionTabs';

const SERVER_ROOT = API_BASE_URL.replace('/api', '');
const ACCENT = '#1a4fd8';

const COMMUNITY_TABS = [
  { key: 'News', label: 'News', screen: 'NewsList' },
  { key: 'Events', label: 'Events', screen: 'EventsList' },
  { key: 'Alumni', label: 'Alumni', screen: 'Directory' },
];

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
  const [pickerOpen, setPickerOpen] = useState(false);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
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
      setSearch('');
      setProgram('');
      setPickerOpen(false);
      loadDirectory(true, '', '');
    }, [])
  );

  function applyProgram(nextProgram) {
    setProgram(nextProgram);
    setPickerOpen(false);
    loadDirectory(true, search, nextProgram);
  }

  function submitSearch() {
    setPickerOpen(false);
    loadDirectory(true, search, program);
  }

  function renderItem({ item }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Image
            source={
              item.profilePictureUrl
                ? { uri: `${SERVER_ROOT}/${item.profilePictureUrl}` }
                : require('../../assets/defaultPFP.png')
            }
            style={styles.avatar}
          />
          <View style={styles.cardText}>
            <Text style={styles.name}>{item.fullName}</Text>
            <Text style={styles.meta}>{item.program}</Text>
          </View>
        </View>
        {item.headline ? <Text style={styles.headline}>{item.headline}</Text> : null}
        {item.location ? <Text style={styles.meta}>{item.location}</Text> : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <SectionTabs items={COMMUNITY_TABS} active="Directory" navigation={navigation} />
      <SearchBar
        placeholder="Search alumni by name"
        value={search}
        onChangeText={setSearch}
        onSubmit={submitSearch}
      />

      <Text style={styles.filterLabel}>Program</Text>
      <TouchableOpacity style={styles.dropdown} onPress={() => setPickerOpen((v) => !v)}>
        <Text style={[styles.dropdownText, program === '' && styles.dropdownPlaceholder]}>
          {program || 'All programs'}
        </Text>
        {pickerOpen ? (
          <ChevronUp size={16} color="#555" />
        ) : (
          <ChevronDown size={16} color="#555" />
        )}
      </TouchableOpacity>

      {pickerOpen && (
        <View style={styles.dropdownList}>
          {['', ...programs].map((value, index) => {
            const isSelected = value === program;
            return (
              <TouchableOpacity
                key={`${value}-${index}`}
                style={[styles.option, isSelected && styles.optionActive]}
                onPress={() => applyProgram(value)}
              >
                <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                  {value || 'All programs'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} size="large" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(_, index) => String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {search.trim() || program
                ? 'No alumni match your filters.'
                : 'No alumni found yet.'}
            </Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f4f4f6' },
  filterLabel: { fontSize: 12, marginTop: 12, marginBottom: 4, color: '#555' },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  dropdownText: { fontSize: 14 },
  dropdownPlaceholder: { color: '#999' },
  dropdownList: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  option: { padding: 12 },
  optionActive: { backgroundColor: '#eee' },
  optionText: { fontSize: 14, color: '#333' },
  optionTextActive: { color: ACCENT, fontWeight: '600' },
  listContent: { paddingTop: 12, paddingBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    padding: 12,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  cardText: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, color: '#555', marginTop: 2 },
  headline: { fontSize: 13, marginTop: 6 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 13 },
  loadMoreButton: { padding: 12, alignItems: 'center', borderWidth: 1, marginTop: 4 },
  loadMoreText: { fontSize: 13 },
});
