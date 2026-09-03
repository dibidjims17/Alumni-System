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
import apiClient from '../api/client';
import SectionTabs from '../components/SectionTabs';

const CAREER_TABS = [
  { key: 'Jobs', label: 'Jobs', screen: 'JobsList' },
  { key: 'Applications', label: 'Applications', screen: 'MyApplications' },
];

export default function MyApplicationsScreen({ navigation }) {
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
    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={() => navigation.navigate('JobDetail', { jobId: item.jobId })}>
          <Text style={styles.title}>{item.jobTitle}</Text>
          <Text style={styles.company}>{item.company}</Text>
          <Text style={styles.meta}>Applied {new Date(item.appliedAt).toLocaleDateString()}</Text>
          <Text style={styles.status}>Status: {item.status}</Text>
          <Text style={styles.meta}>Resume attached: {item.attachResume ? 'Yes' : 'No'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.timelineButton} onPress={() => openHistory(item)}>
          <Text style={styles.timelineText}>View timeline</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
            <Text style={styles.emptyText}>You haven't applied to any jobs yet.</Text>
          }
        />
      )}

      <Modal visible={historyFor != null} animationType="slide" transparent onRequestClose={() => setHistoryFor(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBody}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Timeline</Text>
              <TouchableOpacity onPress={() => setHistoryFor(null)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>

            {historyFor && (
              <Text style={styles.modalJob}>
                {historyFor.jobTitle} — applied {new Date(historyFor.appliedAt).toLocaleDateString()}
              </Text>
            )}

            {loadingHistory ? (
              <ActivityIndicator style={{ marginTop: 24 }} size="large" />
            ) : history.length === 0 ? (
              <Text style={styles.emptyText}>No status updates yet.</Text>
            ) : (
              <FlatList
                data={history}
                keyExtractor={(h) => String(h.id)}
                contentContainerStyle={{ paddingBottom: 12 }}
                renderItem={({ item: h }) => (
                  <View style={styles.historyItem}>
                    <Text style={styles.historyDate}>
                      {new Date(h.createdAt).toLocaleString()}
                    </Text>
                    <Text style={styles.historyChange}>
                      {h.fromStatus} → {h.toStatus}
                    </Text>
                    {h.adminNotes ? <Text style={styles.historyNote}>{h.adminNotes}</Text> : null}
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  container: { flex: 1 },
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
  timelineButton: { marginTop: 8, alignSelf: 'flex-start' },
  timelineText: { fontSize: 12, textDecorationLine: 'underline', color: '#1a4fd8' },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalBody: { backgroundColor: '#fff', padding: 16, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: 'bold' },
  closeText: { fontSize: 13, color: '#1a4fd8' },
  modalJob: { fontSize: 12, color: '#444', marginTop: 8, marginBottom: 8 },
  historyItem: { borderTopWidth: 1, borderColor: '#eee', paddingVertical: 8 },
  historyDate: { fontSize: 11, color: '#777' },
  historyChange: { fontSize: 14, marginTop: 2, fontWeight: '600' },
  historyNote: { fontSize: 12, color: '#555', marginTop: 2 },
});
