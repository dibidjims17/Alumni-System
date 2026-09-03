// src/screens/MyApplicationsScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../api/client';
import SectionTabs from '../components/SectionTabs';
import AppHeader from '../components/AppHeader';
import { useTheme } from '../theme/ThemeContext';

const CAREER_TABS = [
  { key: 'Jobs', label: 'Jobs', screen: 'JobsList' },
  { key: 'Applications', label: 'Applications', screen: 'MyApplications' },
];

export default function MyApplicationsScreen({ navigation }) {
  const { theme } = useTheme();
  const c = theme.colors;

  const STATUS_STYLES = {
    Pending: { backgroundColor: c.surfaceAlt, color: c.textMuted },
    Reviewed: { backgroundColor: c.primaryTint, color: c.primary },
    Shortlisted: { backgroundColor: c.primaryTint, color: c.success },
    Rejected: { backgroundColor: c.surfaceAlt, color: c.danger },
  };

  function statusStyle(status) {
    return STATUS_STYLES[status] || STATUS_STYLES.Pending;
  }

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [historyFor, setHistoryFor] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  async function openHistory(item) {
    setHistoryFor(item);
    setHistory([]);
    setLoadingHistory(true);
    try {
      const res = await apiClient.get(`/Jobs/my-applications/${item.id}/history`);
      setHistory(res.data || []);
    } catch (err) {
      // silent
    } finally {
      setLoadingHistory(false);
    }
  }

  function renderItem({ item }) {
    const pill = statusStyle(item.status);
    return (
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <TouchableOpacity onPress={() => navigation.navigate('JobDetail', { jobId: item.jobId })}>
          <Text style={[styles.title, { color: c.text }]}>{item.jobTitle}</Text>
          <Text style={[styles.company, { color: c.text }]}>{item.company}</Text>
          <Text style={[styles.meta, { color: c.textMuted }]}>
            Applied {new Date(item.appliedAt).toLocaleDateString()}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: pill.backgroundColor }]}>
            <Text style={[styles.statusPillText, { color: pill.color }]}>{item.status}</Text>
          </View>
          <Text style={[styles.meta, { color: c.textMuted }]}>
            Resume attached: {item.attachResume ? 'Yes' : 'No'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.timelineButton} onPress={() => openHistory(item)}>
          <Text style={[styles.timelineText, { color: c.primary }]}>View timeline</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.background }]}
      edges={['top', 'left', 'right']}
    >
      <AppHeader title="Career" navigation={navigation} />
      <SectionTabs items={CAREER_TABS} active="MyApplications" navigation={navigation} />
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
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: c.text }]}>
              You haven't applied to any jobs yet.
            </Text>
          }
        />
      )}

      <Modal visible={historyFor != null} animationType="slide" transparent onRequestClose={() => setHistoryFor(null)}>
        <View style={[styles.modalBackdrop, { backgroundColor: c.overlay }]}>
          <View style={[styles.modalBody, { backgroundColor: c.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Timeline</Text>
              <TouchableOpacity onPress={() => setHistoryFor(null)}>
                <Text style={[styles.closeText, { color: c.primary }]}>Close</Text>
              </TouchableOpacity>
            </View>

            {historyFor && (
              <Text style={[styles.modalJob, { color: c.text }]}>
                {historyFor.jobTitle} — applied {new Date(historyFor.appliedAt).toLocaleDateString()}
              </Text>
            )}

            {loadingHistory ? (
              <ActivityIndicator style={{ marginTop: 24 }} size="large" />
            ) : history.length === 0 ? (
              <Text style={[styles.emptyText, { color: c.text }]}>No status updates yet.</Text>
            ) : (
              <FlatList
                data={history}
                keyExtractor={(h) => String(h.id)}
                contentContainerStyle={{ paddingBottom: 12 }}
                renderItem={({ item: h }) => (
                  <View style={[styles.historyItem, { borderColor: c.border }]}>
                    <Text style={[styles.historyDate, { color: c.textMuted }]}>
                      {new Date(h.createdAt).toLocaleString()}
                    </Text>
                    <Text style={[styles.historyChange, { color: c.text }]}>
                      {h.fromStatus} → {h.toStatus}
                    </Text>
                    {h.adminNotes ? (
                      <Text style={[styles.historyNote, { color: c.textMuted }]}>{h.adminNotes}</Text>
                    ) : null}
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 24 },
  card: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginBottom: 10,
  },
  title: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  company: { fontSize: 13, marginBottom: 4 },
  meta: { fontSize: 11, marginBottom: 2 },
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 4,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  statusPillText: { fontSize: 11, fontWeight: '600' },
  timelineButton: { marginTop: 8, alignSelf: 'flex-start' },
  timelineText: { fontSize: 12, textDecorationLine: 'underline' },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 13 },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 24 },
  modalBody: { padding: 16, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: 'bold' },
  closeText: { fontSize: 13 },
  modalJob: { fontSize: 12, marginTop: 8, marginBottom: 8 },
  historyItem: { borderTopWidth: 1, paddingVertical: 8 },
  historyDate: { fontSize: 11 },
  historyChange: { fontSize: 14, marginTop: 2, fontWeight: '600' },
  historyNote: { fontSize: 12, marginTop: 2 },
});
