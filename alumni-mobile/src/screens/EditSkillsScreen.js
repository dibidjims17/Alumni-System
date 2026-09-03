// src/screens/EditSkillsScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import apiClient from '../api/client';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { useTheme } from '../theme/ThemeContext';
import PrimaryButton from '../components/ui/PrimaryButton';

export default function EditSkillsScreen({ route, navigation }) {
  const { skills: initialSkills } = route.params;
  const { theme } = useTheme();
  const c = theme.colors;
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
      <ScrollView
        style={[styles.container, { backgroundColor: c.background }]}
        contentContainerStyle={{ padding: 16 }}
      >
        <Text style={[styles.label, { color: c.textMuted }]}>Add a skill</Text>
        <View style={styles.addRow}>
          <TextInput
            style={[
              styles.addInput,
              { backgroundColor: c.surface, borderColor: c.border, color: c.text },
            ]}
            value={newSkill}
            onChangeText={setNewSkill}
            placeholder="e.g. React Native"
            placeholderTextColor={c.placeholder}
            onSubmitEditing={handleAddSkill}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addButton, { borderColor: c.primary }]}
            onPress={handleAddSkill}
          >
            <Text style={[styles.addButtonText, { color: c.primary }]}>Add</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: c.textMuted }]}>Your skills</Text>
        {skills.length === 0 ? (
          <Text style={[styles.emptyText, { color: c.textMuted }]}>No skills added yet.</Text>
        ) : (
          <View style={styles.tagWrap}>
            {skills.map((skill) => (
              <View
                key={skill}
                style={[styles.tag, { backgroundColor: c.surface, borderColor: c.border }]}
              >
                <Text style={[styles.tagText, { color: c.text }]}>{skill}</Text>
                <TouchableOpacity onPress={() => handleRemoveSkill(skill)}>
                  <Text style={[styles.tagRemove, { color: c.danger }]}> x</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <PrimaryButton
          title="Save"
          onPress={handleSave}
          loading={isSubmitting}
          style={{ marginTop: 24 }}
        />
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
    borderRadius: 12,
    padding: 10,
    marginRight: 8,
  },
  addButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addButtonText: { fontSize: 14, fontWeight: '600' },
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
});
