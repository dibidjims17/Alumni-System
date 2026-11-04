// src/screens/EditWorkExperienceScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { alert as appAlert } from '../components/AppAlert';
import KebabMenu from '../components/KebabMenu';
import apiClient from '../api/client';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import DiscardDialog from '../components/DiscardDialog';
import AppBackground from '../components/AppBackground';
import { useTheme } from '../theme/ThemeContext';
import PrimaryButton from '../components/ui/PrimaryButton';

export default function EditWorkExperienceScreen({ route, navigation }) {
  const existing = route.params?.workExperience || null;
  const isEditing = !!existing;
  const { theme } = useTheme();
  const c = theme.colors;

  const [jobTitle, setJobTitle] = useState(existing?.jobTitle || '');
  const [company, setCompany] = useState(existing?.company || '');
  const [location, setLocation] = useState(existing?.location || '');
  const [startDate, setStartDate] = useState(
    existing?.startDate ? existing.startDate.split('T')[0] : ''
  );
  const [endDate, setEndDate] = useState(
    existing?.endDate ? existing.endDate.split('T')[0] : ''
  );
  const [isCurrentJob, setIsCurrentJob] = useState(existing?.isCurrentJob || false);
  const [description, setDescription] = useState(existing?.description || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { markSaved, discardDialog } = useUnsavedChangesGuard(navigation, [
    jobTitle, company, location, startDate, endDate, isCurrentJob, description,
  ]);

  async function handleSave() {
    if (!jobTitle.trim() || !company.trim() || !startDate.trim()) {
      appAlert('Missing info', 'Job title, company, and start date are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const body = {
        id: existing?.id || 0,
        jobTitle: jobTitle.trim(),
        company: company.trim(),
        location: location.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: isCurrentJob || !endDate ? null : new Date(endDate).toISOString(),
        description: description.trim(),
      };

      if (isEditing) {
        await apiClient.put(`/Profile/work-experience/${existing.id}`, body);
      } else {
        await apiClient.post('/Profile/work-experience', body);
      }
      markSaved();
      navigation.goBack();
    } catch (err) {
      appAlert('Error', 'Could not save work experience.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    appAlert('Delete', 'Remove this work experience?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/Profile/work-experience/${existing.id}`);
            markSaved();
            navigation.goBack();
          } catch (err) {
            appAlert('Error', 'Could not delete work experience.');
          }
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <DiscardDialog {...discardDialog} />
      <AppBackground />
      <ScrollView
        style={[styles.container, { backgroundColor: 'transparent' }]}
        contentContainerStyle={{ padding: 16 }}
      >
        <Text style={[styles.label, { color: c.textMuted }]}>Job Title *</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: c.surface, borderColor: c.border, color: c.text },
          ]}
          value={jobTitle}
          onChangeText={setJobTitle}
        />

        <Text style={[styles.label, { color: c.textMuted }]}>Company *</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: c.surface, borderColor: c.border, color: c.text },
          ]}
          value={company}
          onChangeText={setCompany}
        />

        <Text style={[styles.label, { color: c.textMuted }]}>Location</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: c.surface, borderColor: c.border, color: c.text },
          ]}
          value={location}
          onChangeText={setLocation}
        />

        <Text style={[styles.label, { color: c.textMuted }]}>Start Date (YYYY-MM-DD) *</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: c.surface, borderColor: c.border, color: c.text },
          ]}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="2023-06-01"
          placeholderTextColor={c.placeholder}
        />

        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: c.text }]}>Current Job</Text>
          <Switch
            value={isCurrentJob}
            onValueChange={setIsCurrentJob}
            trackColor={{ true: c.primary }}
          />
        </View>

        {!isCurrentJob && (
          <>
            <Text style={[styles.label, { color: c.textMuted }]}>End Date (YYYY-MM-DD)</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: c.surface, borderColor: c.border, color: c.text },
              ]}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="2024-01-01"
              placeholderTextColor={c.placeholder}
            />
          </>
        )}

        <Text style={[styles.label, { color: c.textMuted }]}>Description</Text>
        <TextInput
          style={[
            styles.input,
            styles.multiline,
            { backgroundColor: c.surface, borderColor: c.border, color: c.text },
          ]}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <View style={styles.saveRow}>
          <PrimaryButton
            title={isEditing ? 'Save Changes' : 'Add'}
            onPress={handleSave}
            loading={isSubmitting}
            style={{ flex: 1 }}
          />
          {isEditing && (
            <KebabMenu
              label="Entry options"
              items={[
                { key: 'delete', label: 'Delete', icon: Trash2, danger: true, onPress: handleDelete },
              ]}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  label: { fontSize: 12, marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    fontSize: 14,
  },
  multiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
  },
});
