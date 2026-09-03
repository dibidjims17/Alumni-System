// src/screens/JobPreferencesScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../api/client';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { useTheme } from '../theme/ThemeContext';
import PrimaryButton from '../components/ui/PrimaryButton';
import AutocompleteInput from '../components/AutocompleteInput';
import { JOB_TITLE_SUGGESTIONS, INDUSTRY_SUGGESTIONS } from '../data/suggestionLists';

export default function JobPreferencesScreen({ navigation }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preferredJobTitle, setPreferredJobTitle] = useState('');
  const [preferredIndustry, setPreferredIndustry] = useState('');
  const [preferredLocation, setPreferredLocation] = useState('');
  const [isOpenToWork, setIsOpenToWork] = useState(false);
  const [hasSetPreferencesBefore, setHasSetPreferencesBefore] = useState(true);

  const { markSaved, resetDirty } = useUnsavedChangesGuard(navigation, [
    preferredJobTitle, preferredIndustry, preferredLocation, isOpenToWork,
  ]);

  async function fetchPreferences() {
    try {
      const res = await apiClient.get('/Profile/job-preferences');
      if (res.data && !res.data.message) {
        setPreferredJobTitle(res.data.preferredJobTitle || '');
        setPreferredIndustry(res.data.preferredIndustry || '');
        setPreferredLocation(res.data.preferredLocation || '');
        setIsOpenToWork(!!res.data.isOpenToWork);
        setHasSetPreferencesBefore(true);
      } else {
        setHasSetPreferencesBefore(false);
      }
      resetDirty();
    } catch (err) {
      // No saved preferences yet returns 404 — that is not an error.
      if (err.response?.status === 404) {
        setHasSetPreferencesBefore(false);
        resetDirty();
      } else {
        Alert.alert('Error', 'Could not load job preferences.');
      }
    }
  }

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchPreferences().finally(() => setIsLoading(false));
    }, [])
  );

  async function handleSave() {
    setIsSubmitting(true);
    try {
      await apiClient.put('/Profile/job-preferences', {
        preferredJobTitle,
        preferredIndustry,
        preferredLocation,
        isOpenToWork,
      });
      markSaved();
      setHasSetPreferencesBefore(true);
      Alert.alert('Saved', 'Job preferences updated.');
    } catch (err) {
      Alert.alert('Error', 'Could not save job preferences.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={{ padding: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      {!hasSetPreferencesBefore && (
        <Text style={[styles.noticeText, { color: c.textMuted }]}>
          You haven't set job preferences yet.
        </Text>
      )}

      <Text style={[styles.label, { color: c.textMuted }]}>Preferred Job Title</Text>
      <AutocompleteInput
        value={preferredJobTitle}
        onChangeText={setPreferredJobTitle}
        suggestions={JOB_TITLE_SUGGESTIONS}
      />

      <Text style={[styles.label, { color: c.textMuted }]}>Preferred Industry</Text>
      <AutocompleteInput
        value={preferredIndustry}
        onChangeText={setPreferredIndustry}
        suggestions={INDUSTRY_SUGGESTIONS}
      />

      <Text style={[styles.label, { color: c.textMuted }]}>Preferred Location</Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: c.surface, borderColor: c.border, color: c.text },
        ]}
        value={preferredLocation}
        onChangeText={setPreferredLocation}
      />

      <View style={styles.switchRow}>
        <Text style={[styles.label, { color: c.text }]}>Open to Work</Text>
        <Switch
          value={isOpenToWork}
          onValueChange={setIsOpenToWork}
          trackColor={{ true: c.primary }}
        />
      </View>

      <PrimaryButton
        title="Save"
        onPress={handleSave}
        loading={isSubmitting}
        style={{ marginTop: 24 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noticeText: { fontSize: 12, marginBottom: 12 },
  label: { fontSize: 12, marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
});
