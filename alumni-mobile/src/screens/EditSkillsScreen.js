// src/screens/EditSkillsScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
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

export default function EditSkillsScreen({ route, navigation }) {
  const { skills: initialSkills } = route.params;
  const [skills, setSkills] = useState(initialSkills || []);
  const [newSkill, setNewSkill] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { markSaved } = useUnsavedChangesGuard(navigation, [skills, newSkill]);

  function handleAddSkill() {
    const trimmed = newSkill.trim();
    if (!trimmed) return;
    // Avoid case-sensitive duplicates
    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Already added', `"${trimmed}" is already in your skills list.`);
      return;
    }
    setSkills([...skills, trimmed]);
    setNewSkill('');
  }

  function handleRemoveSkill(skillToRemove) {
    setSkills(skills.filter((s) => s !== skillToRemove));
  }

  async function handleSave() {
    setIsSubmitting(true);
    try {
      await apiClient.put('/Profile/skills', skills);
      markSaved();
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Could not save skills.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.label}>Add a skill</Text>
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            value={newSkill}
            onChangeText={setNewSkill}
            placeholder="e.g. React Native"
            onSubmitEditing={handleAddSkill}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddSkill}>
            <Text style={styles.buttonText}>Add</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Your skills</Text>
        {skills.length === 0 ? (
          <Text style={styles.emptyText}>No skills added yet.</Text>
        ) : (
          <View style={styles.tagWrap}>
            {skills.map((skill) => (
              <View key={skill} style={styles.tag}>
                <Text style={styles.tagText}>{skill}</Text>
                <TouchableOpacity onPress={() => handleRemoveSkill(skill)}>
                  <Text style={styles.tagRemove}> x</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.buttonText}>Save</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  label: { fontSize: 12, marginTop: 12, marginBottom: 6 },
  addRow: { flexDirection: 'row' },
  addInput: {
    flex: 1,
    borderWidth: 1,
    padding: 10,
    marginRight: 8,
  },
  addButton: {
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: { fontSize: 13 },
  tagRemove: { fontSize: 13 },
  emptyText: { fontSize: 13 },
  saveButton: {
    marginTop: 24,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonText: { fontSize: 14 },
});