// src/screens/JobDetailScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../api/client';

export default function JobDetailScreen({ route, navigation }) {
  const { jobId } = route.params;
  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [attachResume, setAttachResume] = useState(true);
  const [myApplication, setMyApplication] = useState(null);

  async function fetchJob() {
    try {
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
      Alert.alert('Error', 'Could not load job details.');
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

  if (isLoading || !job) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const deadlinePassed = job.deadline && new Date(job.deadline) < new Date();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>{job.jobTitle}</Text>
        <Text style={styles.company}>{job.company}</Text>
        <Text style={styles.meta}>{job.location}</Text>
        <Text style={styles.meta}>{job.employmentType} - {job.industry}</Text>

        {(job.salaryMin || job.salaryMax) && (
          <Text style={styles.meta}>
            Salary: {job.salaryMin ? `₱${job.salaryMin.toLocaleString()}` : '?'} - {job.salaryMax ? `₱${job.salaryMax.toLocaleString()}` : '?'}
          </Text>
        )}

        {job.deadline && (
          <Text style={styles.meta}>
            Deadline: {new Date(job.deadline).toLocaleDateString()}
            {new Date(job.deadline) < new Date() ? ' (Closed)' : ''}
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{job.description}</Text>
      </View>

      {job.hasApplied ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusText}>
            You applied to this job.
            {myApplication ? ` Status: ${myApplication.status}` : ''}
          </Text>
        </View>
      ) : job.isActive && !(job.deadline && new Date(job.deadline) < new Date()) ? (
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Attach my resume</Text>
            <Switch value={attachResume} onValueChange={setAttachResume} />
          </View>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={confirmApply}
            disabled={isApplying}
          >
            {isApplying ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.buttonText}>Apply Now</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.statusCard}>
          <Text style={styles.statusText}>This job is no longer accepting applications.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f6' },
  content: { padding: 16, paddingBottom: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    padding: 14,
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  company: { fontSize: 14, marginBottom: 8, color: '#333' },
  meta: { fontSize: 12, marginBottom: 4, color: '#555' },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  description: { fontSize: 13, lineHeight: 20, color: '#333' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: { fontSize: 13 },
  applyButton: {
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginTop: 4,
  },
  statusCard: {
    backgroundColor: '#e8eefc',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statusText: { fontSize: 14, color: '#1a4fd8', textAlign: 'center' },
  buttonText: { fontSize: 14 },
});
