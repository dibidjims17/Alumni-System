// src/screens/EditProfileScreen.js
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
  Switch,
} from 'react-native';
import apiClient from '../api/client';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import DateTimePicker from '@react-native-community/datetimepicker';

const ACCENT = '#1a4fd8';

export default function EditProfileScreen({ route, navigation }) {
  const { profile } = route.params;

  const [headline, setHeadline] = useState(profile.headline || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [location, setLocation] = useState(profile.location || '');
  const [linkedInUrl, setLinkedInUrl] = useState(profile.linkedInUrl || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [address, setAddress] = useState(profile.address || '');
  const [dateOfBirth, setDateOfBirth] = useState(
    profile.dateOfBirth ? new Date(profile.dateOfBirth) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showInDirectory, setShowInDirectory] = useState(profile.showInDirectory ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { markSaved } = useUnsavedChangesGuard(navigation, [
    headline, bio, location, linkedInUrl, phone, address, dateOfBirth, showInDirectory,
  ]);

  async function handleSave() {
    setIsSubmitting(true);
    try {
      await apiClient.put('/Profile', {
        headline,
        bio,
        location,
        linkedInUrl,
        phone,
        dateOfBirth: dateOfBirth ? dateOfBirth.toISOString() : null,
        address,
        showInDirectory,
      });
      markSaved();
      navigation.goBack();
    } catch (err) {
      const message = err.response?.data?.message || 'Could not save profile.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Basic info</Text>

          <Text style={styles.label}>Headline</Text>
          <TextInput style={styles.input} value={headline} onChangeText={setHeadline} />

          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={bio}
            onChangeText={setBio}
            multiline
          />

          <Text style={styles.label}>Location</Text>
          <TextInput style={styles.input} value={location} onChangeText={setLocation} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact</Text>

          <Text style={styles.label}>LinkedIn URL</Text>
          <TextInput
            style={styles.input}
            value={linkedInUrl}
            onChangeText={setLinkedInUrl}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Date of Birth</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text style={dateOfBirth ? styles.inputText : styles.inputPlaceholder}>
              {dateOfBirth ? dateOfBirth.toLocaleDateString() : 'Select date'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dateOfBirth || new Date(2000, 0, 1)}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (event.type === 'set' && selectedDate) {
                  setDateOfBirth(selectedDate);
                }
              }}
            />
          )}

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={address}
            onChangeText={setAddress}
            multiline
          />
        </View>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.switchLabel}>Show me in the alumni directory</Text>
              <Text style={styles.switchHint}>Other graduates can find you by name</Text>
            </View>
            <Switch value={showInDirectory} onValueChange={setShowInDirectory} />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f6' },
  content: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  label: { fontSize: 12, fontWeight: '600', color: '#555', marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 12,
    fontSize: 14,
  },
  inputText: { fontSize: 14, color: '#1a1a1a' },
  inputPlaceholder: { fontSize: 14, color: '#999' },
  multiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchText: { flex: 1, marginRight: 12 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  switchHint: { fontSize: 12, color: '#777', marginTop: 2 },
  saveButton: {
    marginTop: 4,
    padding: 14,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: ACCENT,
  },
  saveButtonDisabled: {
    backgroundColor: '#b3c4ea',
  },
  saveButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
