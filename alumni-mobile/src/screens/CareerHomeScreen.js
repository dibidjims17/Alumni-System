// src/screens/CareerHomeScreen.js
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  BriefcaseBusiness,
  BadgeCheck,
  Clock3,
  CircleAlert,
  Target,
  Search,
  ClipboardList,
  ChevronRight,
} from 'lucide-react-native';
import apiClient from '../api/client';
import { useTheme } from '../theme/ThemeContext';
import AppHeader from '../components/AppHeader';
import AppBackground from '../components/AppBackground';
import SectionTabs from '../components/SectionTabs';
import PrimaryButton from '../components/ui/PrimaryButton';
import Skeleton from '../components/ui/Skeleton';

const CAREER_TABS = [
  { key: 'Overview', label: 'Overview', screen: 'CareerHome' },
  { key: 'Jobs', label: 'Jobs', screen: 'JobsList' },
  { key: 'Applications', label: 'Applications', screen: 'MyApplications' },
];

function reviewStatus(record, c) {
  if (!record) {
    return { label: 'Not submitted', color: c.textMuted, backgroundColor: c.surfaceAlt, Icon: BriefcaseBusiness };
  }
  if (record.status === 'Approved') {
    return { label: 'Verified', color: c.success, backgroundColor: c.tintSuccess, Icon: BadgeCheck };
  }
  if (record.status === 'Rejected') {
    return { label: 'Update required', color: c.danger, backgroundColor: c.tintDanger, Icon: CircleAlert };
  }
  return { label: 'Under review', color: c.warning, backgroundColor: c.tintWarning, Icon: Clock3 };
}

function careerTitle(record) {
  if (!record) return 'Add your employment status';
  if (record.jobTitle && record.company) return `${record.jobTitle} at ${record.company}`;
  if (record.jobTitle) return record.jobTitle;
  return record.employmentStatus;
}

function ActionRow({ icon: Icon, title, subtitle, onPress, c }) {
  return (
    <TouchableOpacity
      style={[styles.actionRow, { backgroundColor: c.surface, borderColor: c.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.actionIcon, { backgroundColor: c.primaryTint }]}>
        <Icon size={19} color={c.primary} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={[styles.actionTitle, { color: c.text }]}>{title}</Text>
        <Text style={[styles.actionSubtitle, { color: c.textMuted }]}>{subtitle}</Text>
      </View>
      <ChevronRight size={19} color={c.textMuted} />
    </TouchableOpacity>
  );
}

export default function CareerHomeScreen({ navigation }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [record, setRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  async function loadCareer() {
    try {
      const response = await apiClient.get('/Career/my-record');
      setRecord(response.data || null);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadCareer().finally(() => setIsLoading(false));
    }, [])
  );

  async function refresh() {
    setIsRefreshing(true);
    await loadCareer();
    setIsRefreshing(false);
  }

  function retry() {
    setIsLoading(true);
    loadCareer().finally(() => setIsLoading(false));
  }

  const status = reviewStatus(record, c);
  const StatusIcon = status.Icon;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <AppBackground />
      <AppHeader title="Career" navigation={navigation} />
      <SectionTabs items={CAREER_TABS} active="CareerHome" navigation={navigation} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            colors={[c.primary]}
            tintColor={c.primary}
          />
        }
      >
        <Text style={[styles.eyebrow, { color: c.textMuted }]}>YOUR CAREER</Text>

        {isLoading ? (
          <View style={[styles.careerCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Skeleton width={110} height={24} borderRadius={999} style={{ marginBottom: 16 }} />
            <Skeleton width="72%" height={20} style={{ marginBottom: 9 }} />
            <Skeleton width="90%" height={14} style={{ marginBottom: 18 }} />
            <Skeleton width="100%" height={46} borderRadius={10} />
          </View>
        ) : loadError ? (
          <View style={[styles.careerCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <CircleAlert size={26} color={c.danger} />
            <Text style={[styles.errorTitle, { color: c.text }]}>Couldn't load your career record</Text>
            <Text style={[styles.errorText, { color: c.textMuted }]}>Check your connection and try again.</Text>
            <PrimaryButton title="Retry" onPress={retry} style={styles.primaryAction} />
          </View>
        ) : (
          <View style={[styles.careerCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[styles.statusPill, { backgroundColor: status.backgroundColor }]}>
              <StatusIcon size={14} color={status.color} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>

            <Text style={[styles.careerTitle, { color: c.text }]}>{careerTitle(record)}</Text>
            <Text style={[styles.careerMeta, { color: c.textMuted }]}>
              {record
                ? [record.employmentStatus, record.industry].filter(Boolean).join(' · ')
                : 'Tell the Alumni Office where your career has taken you.'}
            </Text>

            {record?.status === 'Approved' ? (
              <View style={[styles.alignmentRow, { backgroundColor: c.tintInfo }]}>
                <Target size={16} color={c.info} />
                <View style={styles.alignmentCopy}>
                  <Text style={[styles.alignmentLabel, { color: c.info }]}>Course alignment</Text>
                  <Text style={[styles.alignmentValue, { color: c.text }]}>
                    {record.courseAlignment || 'Not assessed yet'}
                  </Text>
                </View>
              </View>
            ) : null}

            {record?.status === 'Rejected' && record.reviewNote ? (
              <View style={[styles.reviewNote, { backgroundColor: c.tintDanger }]}>
                <Text style={[styles.reviewNoteLabel, { color: c.danger }]}>Review note</Text>
                <Text style={[styles.reviewNoteText, { color: c.text }]}>{record.reviewNote}</Text>
              </View>
            ) : null}

            <PrimaryButton
              title={record ? 'View employment details' : 'Add employment details'}
              onPress={() => navigation.navigate('CareerProof')}
              style={styles.primaryAction}
            />
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: c.text }]}>Opportunities</Text>
        <View style={styles.actionList}>
          <ActionRow
            icon={Search}
            title="Browse jobs"
            subtitle="Find roles posted for alumni"
            onPress={() => navigation.navigate('JobsList')}
            c={c}
          />
          <ActionRow
            icon={ClipboardList}
            title="My applications"
            subtitle="Track applications and status updates"
            onPress={() => navigation.navigate('MyApplications')}
            c={c}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 16, paddingBottom: 30 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  careerCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 16,
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 14,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  careerTitle: { fontSize: 20, fontWeight: '700', lineHeight: 27 },
  careerMeta: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  alignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderRadius: 10,
    marginTop: 14,
  },
  alignmentCopy: { flex: 1 },
  alignmentLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  alignmentValue: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  reviewNote: { borderRadius: 10, padding: 11, marginTop: 14 },
  reviewNoteLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  reviewNoteText: { fontSize: 13, lineHeight: 19, marginTop: 3 },
  primaryAction: { marginTop: 16 },
  errorTitle: { fontSize: 16, fontWeight: '700', marginTop: 10 },
  errorText: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 10 },
  actionList: { gap: 10 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: { flex: 1 },
  actionTitle: { fontSize: 14, fontWeight: '700' },
  actionSubtitle: { fontSize: 12, lineHeight: 17, marginTop: 2 },
});
