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
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import apiClient from '../api/client';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';

export default function EditEducationScreen({ route, navigation }) {
  const existing = route.params?.education || null;
  const isEditing = !!existing;

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
  const { markSaved } = useUnsavedChangesGuard(navigation, [
    degree, fieldOfStudy, school, startYear, endYear, isCurrentlyStudying,
  ]);

  async function handleSave() {
    if (!degree.trim() || !school.trim() || !startYear.trim()) {
      Alert.alert('Missing info', 'Degree, school, and start year are required.');
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
      Alert.alert('Error', 'Could not save education.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    Alert.alert('Delete', 'Remove this education entry?', [
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
            Alert.alert('Error', 'Could not delete education.');
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
        <Text style={styles.label}>Degree *</Text>
        <TextInput style={styles.input} value={degree} onChangeText={setDegree} />

        <Text style={styles.label}>Field of Study</Text>
        <TextInput style={styles.input} value={fieldOfStudy} onChangeText={setFieldOfStudy} />

        <Text style={styles.label}>School *</Text>
        <TextInput style={styles.input} value={school} onChangeText={setSchool} />

        <Text style={styles.label}>Start Year *</Text>
        <TextInput
          style={styles.input}
          value={startYear}
          onChangeText={setStartYear}
          keyboardType="number-pad"
          placeholder="2022"
        />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Currently Studying</Text>
          <Switch value={isCurrentlyStudying} onValueChange={setIsCurrentlyStudying} />
        </View>

        {!isCurrentlyStudying && (
          <>
            <Text style={styles.label}>End Year</Text>
            <TextInput
              style={styles.input}
              value={endYear}
              onChangeText={setEndYear}
              keyboardType="number-pad"
              placeholder="2024"
            />
          </>
        )}

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