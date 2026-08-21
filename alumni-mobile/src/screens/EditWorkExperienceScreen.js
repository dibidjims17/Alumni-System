// src/screens/EditWorkExperienceScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import apiClient from '../api/client';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';

export default function EditWorkExperienceScreen({ route, navigation }) {
  const existing = route.params?.workExperience || null;
  const isEditing = !!existing;

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

  const { markSaved } = useUnsavedChangesGuard(navigation, [
    jobTitle, company, location, startDate, endDate, isCurrentJob, description,
  ]);

  async function handleSave() {
    if (!jobTitle.trim() || !company.trim() || !startDate.trim()) {
      Alert.alert('Missing info', 'Job title, company, and start date are required.');
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
      Alert.alert('Error', 'Could not save work experience.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    Alert.alert('Delete', 'Remove this work experience?', [
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
            Alert.alert('Error', 'Could not delete work experience.');
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
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.label}>Job Title *</Text>
        <TextInput style={styles.input} value={jobTitle} onChangeText={setJobTitle} />

        <Text style={styles.label}>Company *</Text>
        <TextInput style={styles.input} value={company} onChangeText={setCompany} />

        <Text style={styles.label}>Location</Text>
        <TextInput style={styles.input} value={location} onChangeText={setLocation} />

        <Text style={styles.label}>Start Date (YYYY-MM-DD) *</Text>
        <TextInput
          style={styles.input}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="2023-06-01"
        />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Current Job</Text>
          <Switch value={isCurrentJob} onValueChange={setIsCurrentJob} />
        </View>

        {!isCurrentJob && (
          <>
            <Text style={styles.label}>End Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="2024-01-01"
            />
          </>
        )}

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.buttonText}>{isEditing ? 'Save Changes' : 'Add'}</Text>
          )}
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  label: { fontSize: 12, marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    padding: 10,
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
  saveButton: {
    marginTop: 24,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  deleteButton: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonText: { fontSize: 14 },
});