// src/screens/YearCorrectionScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import PrimaryButton from '../components/ui/PrimaryButton';
import Skeleton from '../components/ui/Skeleton';
import { alert as appAlert } from '../components/AppAlert';

const YEAR_OPTIONS = ['1', '2', '3', '4', 'Graduate'];

function statusStyle(status, c) {
  if (status === 'Approved') return { backgroundColor: c.tintSuccess, color: c.success };
  if (status === 'Declined') return { backgroundColor: c.tintDanger, color: c.danger };
  return { backgroundColor: c.tintWarning, color: '#B45309' };
}

export default function YearCorrectionScreen({ navigation }) {
  const { student } = useAuth();
  const { theme } = useTheme();
  const c = theme.colors;

  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [requestedYear, setRequestedYear] = useState(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentYear = student?.schoolYear || '—';
  const pending = requests.find((r) => r.status === 'Pending');
  const choices = YEAR_OPTIONS.filter((y) => y !== student?.schoolYear);

  async function fetchRequests() {
    try {
      const res = await apiClient.get('/Profile/year-change-requests');
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      // A missing history must not block the form.
    }
  }

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchRequests().finally(() => setIsLoading(false));
    }, [])
  );

  async function handleRefresh() {
    setIsRefreshing(true);
    await fetchRequests();
    setIsRefreshing(false);
  }

  async function handleSubmit() {
    if (!requestedYear) {
      appAlert('Missing info', 'Please choose your correct year level.');
      return;
    }
    if (!reason.trim()) {
      appAlert('Missing info', 'Please tell us briefly why the record is wrong.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/Profile/year-change-requests', {
        requestedSchoolYear: requestedYear,
        reason: reason.trim(),
      });
      appAlert('Submitted', res.data?.message || 'Request submitted for review.');
      setRequestedYear(null);
      setReason('');
      await fetchRequests();
    } catch (err) {
      appAlert('Error', err.response?.data?.message || 'Could not submit the request.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[c.primary]} tintColor={c.primary} />}
      >
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.label, { color: c.textMuted }]}>RECORDED YEAR LEVEL</Text>
          <Text style={[styles.current, { color: c.text }]}>{currentYear}</Text>
          <Text style={[styles.hint, { color: c.textMuted }]}>
            Wrong? Pick the correct one below. An administrator reviews every request.
          </Text>
        </View>

        {isLoading ? (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Skeleton width="60%" height={15} style={{ marginBottom: 8 }} />
            <Skeleton width="100%" height={44} borderRadius={10} />
          </View>
        ) : pending ? (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.pendingTitle, { color: c.text }]}>Request under review</Text>
            <Text style={[styles.pendingText, { color: c.textMuted }]}>
              {pending.currentSchoolYear} → {pending.requestedSchoolYear} • sent{' '}
              {pending.createdAt ? new Date(pending.createdAt).toLocaleDateString() : ''}
            </Text>
            <Text style={[styles.pendingText, { color: c.textMuted }]}>
              You'll see the decision here once an administrator reviews it.
            </Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.label, { color: c.textMuted }]}>CORRECT YEAR LEVEL</Text>
            <View style={styles.choices}>
              {choices.map((year) => {
                const selected = requestedYear === year;
                return (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.choice,
                      { borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primaryTint : c.surface },
                    ]}
                    onPress={() => setRequestedYear(year)}
                  >
                    {selected && <Check size={15} color={c.primary} />}
                    <Text style={[styles.choiceText, { color: selected ? c.primary : c.text }]}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.label, { color: c.textMuted, marginTop: 14 }]}>WHY IS IT WRONG?</Text>
            <TextInput
              style={[styles.reason, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
              placeholder="e.g. Graduated March 2026, records were never updated"
              placeholderTextColor={c.placeholder}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <PrimaryButton title="Submit for review" onPress={handleSubmit} loading={isSubmitting} style={{ marginTop: 12 }} />
          </View>
        )}

        {requests.length > 0 && (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.label, { color: c.textMuted }]}>REQUEST HISTORY</Text>
            {requests.map((r) => {
              const pill = statusStyle(r.status, c);
              return (
                <View key={r.id} style={[styles.historyRow, { borderColor: c.border }]}>
                  <View style={styles.historyMain}>
                    <Text style={[styles.historyTitle, { color: c.text }]}>
                      {r.currentSchoolYear} → {r.requestedSchoolYear}
                    </Text>
                    <Text style={[styles.historySub, { color: c.textMuted }]} numberOfLines={2}>
                      {r.reason}
                      {r.status !== 'Pending' && r.reviewNote ? ` • Admin: ${r.reviewNote}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: pill.backgroundColor }]}>
                    <Text style={[styles.pillText, { color: pill.color }]}>{r.status}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity onPress={() => navigation.navigate('ChangePassword')}>
          <Text style={[styles.changePwLink, { color: c.primary }]}>
            Change Password
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 12,
  },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
  current: { fontSize: 26, fontWeight: '800' },
  hint: { fontSize: 12.5, marginTop: 6, lineHeight: 18 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  choiceText: { fontSize: 14, fontWeight: '700' },
  reason: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 84,
    marginTop: 4,
  },
  pendingTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  pendingText: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 10,
  },
  historyMain: { flex: 1 },
  historyTitle: { fontSize: 14, fontWeight: '700' },
  historySub: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, fontWeight: '700' },
  changePwLink: { textAlign: 'center', fontSize: 13, fontWeight: '600', marginTop: 6 },
});
