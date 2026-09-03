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
import AppHeader from '../components/AppHeader';
import { useTheme } from '../theme/ThemeContext';

const SERVER_ROOT = API_BASE_URL.replace('/api', '');

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
  const { theme } = useTheme();
  const c = theme.colors;
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
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
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
            <Text style={[styles.name, { color: c.text }]}>{item.fullName}</Text>
            <Text style={[styles.meta, { color: c.textMuted }]}>{item.program}</Text>
          </View>
        </View>
        {item.headline ? <Text style={[styles.headline, { color: c.text }]}>{item.headline}</Text> : null}
        {item.location ? <Text style={[styles.meta, { color: c.textMuted }]}>{item.location}</Text> : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top', 'left', 'right']}>
      <AppHeader title="Community" navigation={navigation} />
      <SectionTabs items={COMMUNITY_TABS} active="Directory" navigation={navigation} />
      <View style={styles.content}>
      <SearchBar
        placeholder="Search alumni by name"
        value={search}
        onChangeText={setSearch}
        onSubmit={submitSearch}
      />

      <Text style={[styles.filterLabel, { color: c.textMuted }]}>Program</Text>
      <TouchableOpacity
        style={[styles.dropdown, { borderColor: c.border, backgroundColor: c.surface }]}
        onPress={() => setPickerOpen((v) => !v)}
      >
        <Text
          style={[
            styles.dropdownText,
            { color: program === '' ? c.placeholder : c.text },
          ]}
        >
          {program || 'All programs'}
        </Text>
        {pickerOpen ? (
          <ChevronUp size={16} color={c.textMuted} />
        ) : (
          <ChevronDown size={16} color={c.textMuted} />
        )}
      </TouchableOpacity>

      {pickerOpen && (
        <View style={[styles.dropdownList, { borderColor: c.border, backgroundColor: c.surface }]}>
          {['', ...programs].map((value, index) => {
            const isSelected = value === program;
            return (
              <TouchableOpacity
                key={`${value}-${index}`}
                style={[styles.option, isSelected && { backgroundColor: c.surfaceAlt }]}
                onPress={() => applyProgram(value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: isSelected ? c.primary : c.text, fontWeight: isSelected ? '600' : '400' },
                  ]}
                >
                  {value || 'All programs'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} size="large" color={c.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(_, index) => String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: c.text }]}>
              {search.trim() || program
                ? 'No alumni match your filters.'
                : 'No alumni found yet.'}
            </Text>
          }
          ListFooterComponent={
            items.length > 0 && items.length < total ? (
              <TouchableOpacity
                style={[styles.loadMoreButton, { borderColor: c.border }]}
                onPress={() => loadDirectory(false, search, program)}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <ActivityIndicator size="small" color={c.primary} />
                ) : (
                  <Text style={[styles.loadMoreText, { color: c.text }]}>
                    Load more ({items.length} of {total})
                  </Text>
                )}
              </TouchableOpacity>
            ) : null
          }
        />
      )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1, padding: 16 },
  filterLabel: { fontSize: 12, marginTop: 12, marginBottom: 4 },
  dropdown: {
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: { fontSize: 14 },
  dropdownList: {
    borderWidth: 1,
    borderTopWidth: 0,
  },
  option: { padding: 12 },
  optionText: { fontSize: 14 },
  listContent: { paddingTop: 12, paddingBottom: 24 },
  card: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
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
  meta: { fontSize: 12, marginTop: 2 },
  headline: { fontSize: 13, marginTop: 6 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 13 },
  loadMoreButton: { padding: 12, alignItems: 'center', borderWidth: 1, marginTop: 4 },
  loadMoreText: { fontSize: 13 },
});
