// src/screens/JobDetailScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../api/client';
import { formatSalary, deadlineInfo } from '../utils/jobs';
import { useTheme } from '../theme/ThemeContext';
import PrimaryButton from '../components/ui/PrimaryButton';
import Skeleton from '../components/ui/Skeleton';

export default function JobDetailScreen({ route, navigation }) {
  const { jobId } = route.params;
  const { theme } = useTheme();
  const c = theme.colors;
  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [attachResume, setAttachResume] = useState(true);
  const [myApplication, setMyApplication] = useState(null);
  const [notFound, setNotFound] = useState(false);

  async function handleRefresh() {
    setIsRefreshing(true);
    await fetchJob();
    setIsRefreshing(false);
  }

  async function fetchJob() {
    try {
      setNotFound(false);
      const res = await apiClient.get(`/Jobs/${jobId}`);
      setJob(res.data);

      if (res.data.hasApplied) {
        const appsRes = await apiClient.get('/Jobs/my-applications');
        const match = (appsRes.data || []).find((a) => a.jobId === res.data.id);
        setMyApplication(match || null);
      } else {
        setMyApplication(null);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        Alert.alert('Error', 'Could not load job details.');
      }
    }
  }

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchJob().finally(() => setIsLoading(false));
    }, [jobId])
  );

  function confirmApply() {
    const resumeNote = attachResume
      ? 'Your resume will be attached to this application.'
      : 'You are applying WITHOUT your resume attached.';

    Alert.alert(
      'Confirm Application',
      `Apply to ${job.jobTitle} at ${job.company}?\n\n${resumeNote}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Apply', onPress: handleApply },
      ]
    );
  }

  async function handleApply() {
    setIsApplying(true);
    try {
      await apiClient.post(`/Jobs/${jobId}/apply`, { attachResume });
      await fetchJob();
      Alert.alert('Applied', 'Your application has been submitted.');
    } catch (err) {
      const message = err.response?.data?.message || 'Could not submit application.';
      Alert.alert('Error', message);
    } finally {
      setIsApplying(false);
    }
  }

  if (isLoading) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: c.background }]}
        contentContainerStyle={styles.content}
      >
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Skeleton width="70%" height={19} style={{ marginBottom: 8 }} />
          <Skeleton width="50%" height={14} style={{ marginBottom: 8 }} />
          <Skeleton width="60%" height={15} style={{ marginBottom: 10 }} />
          <View style={styles.skeletonTags}>
            <Skeleton width={80} height={22} borderRadius={999} />
            <Skeleton width={70} height={22} borderRadius={999} />
          </View>
        </View>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Skeleton width="40%" height={14} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={13} style={{ marginBottom: 6 }} />
          <Skeleton width="100%" height={13} style={{ marginBottom: 6 }} />
          <Skeleton width="80%" height={13} />
        </View>
      </ScrollView>
    );
  }

  if (!job) {
    return (
      <View style={[styles.centered, { backgroundColor: c.background }]}>
        <Text style={[styles.notFoundTitle, { color: c.text }]}>No longer available</Text>
        <Text style={[styles.notFoundText, { color: c.textMuted }]}>
          This job may have been removed by an admin.
        </Text>
        <TouchableOpacity
          style={[styles.goBackButton, { borderColor: c.border }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.goBackText, { color: c.primary }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const deadline = deadlineInfo(job.deadline);
  const isClosed = job.deadline && new Date(job.deadline) < new Date();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[c.primary]}
          tintColor={c.primary}
        />
      }
    >
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.title, { color: c.text }]}>{job.jobTitle}</Text>
        <Text style={[styles.company, { color: c.text }]}>
          {job.company}
          {job.location ? (
            <Text style={{ color: c.textMuted }}> • {job.location}</Text>
          ) : null}
        </Text>
        {salary && (
          <Text style={[styles.salary, { color: c.primary }]}>{salary}</Text>
        )}
        <View style={styles.tagRow}>
          {job.employmentType ? (
            <View style={[styles.tag, { backgroundColor: c.surfaceAlt }]}>
              <Text style={[styles.tagText, { color: c.textMuted }]}>
                {job.employmentType}
              </Text>
            </View>
          ) : null}
          {job.industry ? (
            <View style={[styles.tag, { backgroundColor: c.surfaceAlt }]}>
              <Text style={[styles.tagText, { color: c.textMuted }]}>
                {job.industry}
              </Text>
            </View>
          ) : null}
          {deadline ? (
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
          ) : null}
          {isClosed ? (
            <View style={[styles.tag, { backgroundColor: c.danger }]}>
              <Text style={[styles.tagText, { color: '#fff' }]}>Closed</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.sectionTitle, { color: c.text }]}>Description</Text>
        <Text style={[styles.description, { color: c.text }]}>{job.description}</Text>
      </View>

      {job.hasApplied ? (
        <View style={[styles.statusCard, { backgroundColor: c.primaryTint }]}>
          <Text style={[styles.statusText, { color: c.primary }]}>
            You applied to this job.
            {myApplication ? ` Status: ${myApplication.status}` : ''}
          </Text>
        </View>
      ) : job.isActive && !(job.deadline && new Date(job.deadline) < new Date()) ? (
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.switchRow}>
            <Text style={[styles.label, { color: c.text }]}>Attach my resume</Text>
            <Switch value={attachResume} onValueChange={setAttachResume} />
          </View>
          <PrimaryButton
            title="Apply Now"
            onPress={confirmApply}
            disabled={isApplying}
            loading={isApplying}
            style={styles.applyButton}
          />
        </View>
      ) : (
        <View style={[styles.statusCard, { backgroundColor: c.primaryTint }]}>
          <Text style={[styles.statusText, { color: c.primary }]}>
            This job is no longer accepting applications.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  notFoundTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  notFoundText: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  goBackButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderRadius: 8,
  },
  goBackText: { fontSize: 14, fontWeight: '600' },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 12,
  },
  skeletonTags: {
    flexDirection: 'row',
    gap: 6,
  },
  title: { fontSize: 19, fontWeight: '800', lineHeight: 24 },
  company: { fontSize: 14, marginTop: 2 },
  salary: { fontSize: 18, fontWeight: '800', marginTop: 8 },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  tagText: { fontSize: 11, fontWeight: '600' },
  meta: { fontSize: 12, marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  description: { fontSize: 13, lineHeight: 20 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: { fontSize: 13 },
  applyButton: {
    marginTop: 4,
  },
  statusCard: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statusText: { fontSize: 14, textAlign: 'center' },
});
