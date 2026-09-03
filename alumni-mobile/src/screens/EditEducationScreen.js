// src/screens/EditEducationScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { alert as appAlert } from '../components/AppAlert';
import apiClient from '../api/client';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import DiscardDialog from '../components/DiscardDialog';
import { useTheme } from '../theme/ThemeContext';
import PrimaryButton from '../components/ui/PrimaryButton';

export default function EditEducationScreen({ route, navigation }) {
  const existing = route.params?.education || null;
  const isEditing = !!existing;
  const { theme } = useTheme();
  const c = theme.colors;

  const [degree, setDegree] = useState(existing?.degree || '');
  const [fieldOfStudy, setFieldOfStudy] = useState(existing?.fieldOfStudy || '');
  const [school, setSchool] = useState(existing?.school || '');
  const [startYear, setStartYear] = useState(
    existing?.startYear ? String(existing.startYear) : ''
  );
  const [endYear, setEndYear] = useState(
    existing?.endYear ? String(existing.endYear) : ''
  );
  const [isCurrentlyStudying, setIsCurrentlyStudying] = useState(
    existing?.isCurrentlyStudying || false
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { markSaved, discardDialog } = useUnsavedChangesGuard(navigation, [
    degree, fieldOfStudy, school, startYear, endYear, isCurrentlyStudying,
  ]);

  async function handleSave() {
    if (!degree.trim() || !school.trim() || !startYear.trim()) {
      appAlert('Missing info', 'Degree, school, and start year are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const body = {
        id: existing?.id || 0,
        degree: degree.trim(),
        fieldOfStudy: fieldOfStudy.trim(),
        school: school.trim(),
        startYear: parseInt(startYear, 10),
        endYear: isCurrentlyStudying || !endYear ? null : parseInt(endYear, 10),
      };

      if (isEditing) {
        await apiClient.put(`/Profile/education/${existing.id}`, body);
      } else {
        await apiClient.post('/Profile/education', body);
      }
      markSaved();
      navigation.goBack();
    } catch (err) {
      appAlert('Error', 'Could not save education.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    appAlert('Delete', 'Remove this education entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/Profile/education/${existing.id}`);
                markSaved();
                navigation.goBack();
          } catch (err) {
            appAlert('Error', 'Could not delete education.');
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
      <ScrollView
        style={[styles.container, { backgroundColor: c.background }]}
        contentContainerStyle={{ padding: 16 }}
      >
        <Text style={[styles.label, { color: c.textMuted }]}>Degree *</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: c.surface, borderColor: c.border, color: c.text },
          ]}
          value={degree}
          onChangeText={setDegree}
        />

        <Text style={[styles.label, { color: c.textMuted }]}>Field of Study</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: c.surface, borderColor: c.border, color: c.text },
          ]}
          value={fieldOfStudy}
          onChangeText={setFieldOfStudy}
        />

        <Text style={[styles.label, { color: c.textMuted }]}>School *</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: c.surface, borderColor: c.border, color: c.text },
          ]}
          value={school}
          onChangeText={setSchool}
        />

        <Text style={[styles.label, { color: c.textMuted }]}>Start Year *</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: c.surface, borderColor: c.border, color: c.text },
          ]}
          value={startYear}
          onChangeText={setStartYear}
          keyboardType="number-pad"
          placeholder="2022"
          placeholderTextColor={c.placeholder}
        />

        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: c.text }]}>Currently Studying</Text>
          <Switch
            value={isCurrentlyStudying}
            onValueChange={setIsCurrentlyStudying}
            trackColor={{ true: c.primary }}
          />
        </View>

        {!isCurrentlyStudying && (
          <>
            <Text style={[styles.label, { color: c.textMuted }]}>End Year</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: c.surface, borderColor: c.border, color: c.text },
              ]}
              value={endYear}
              onChangeText={setEndYear}
              keyboardType="number-pad"
              placeholder="2024"
              placeholderTextColor={c.placeholder}
            />
          </>
        )}

        <PrimaryButton
          title={isEditing ? 'Save Changes' : 'Add'}
          onPress={handleSave}
          loading={isSubmitting}
          style={{ marginTop: 24 }}
        />

        {isEditing && (
          <TouchableOpacity
            style={[styles.deleteButton, { borderColor: c.border }]}
            onPress={handleDelete}
          >
            <Text style={[styles.deleteButtonText, { color: c.danger }]}>Delete</Text>
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
    borderRadius: 12,
    padding: 10,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  deleteButton: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
  },
  deleteButtonText: { fontSize: 14, fontWeight: '600' },
});
