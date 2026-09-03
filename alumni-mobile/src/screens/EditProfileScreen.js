// src/screens/EditProfileScreen.js
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
  Switch,
} from 'react-native';
import apiClient from '../api/client';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { useTheme } from '../theme/ThemeContext';
import PrimaryButton from '../components/ui/PrimaryButton';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function EditProfileScreen({ route, navigation }) {
  const { profile } = route.params;
  const { theme } = useTheme();
  const c = theme.colors;

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
      <ScrollView
        style={[styles.container, { backgroundColor: c.background }]}
        contentContainerStyle={styles.content}
      >
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Basic info</Text>

          <Text style={[styles.label, { color: c.textMuted }]}>Headline</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: c.surface, borderColor: c.border, color: c.text },
            ]}
            value={headline}
            onChangeText={setHeadline}
          />

          <Text style={[styles.label, { color: c.textMuted }]}>Bio</Text>
          <TextInput
            style={[
              styles.input,
              styles.multiline,
              { backgroundColor: c.surface, borderColor: c.border, color: c.text },
            ]}
            value={bio}
            onChangeText={setBio}
            multiline
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
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Contact</Text>

          <Text style={[styles.label, { color: c.textMuted }]}>LinkedIn URL</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: c.surface, borderColor: c.border, color: c.text },
            ]}
            value={linkedInUrl}
            onChangeText={setLinkedInUrl}
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: c.textMuted }]}>Phone</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: c.surface, borderColor: c.border, color: c.text },
            ]}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={[styles.label, { color: c.textMuted }]}>Date of Birth</Text>
          <TouchableOpacity
            style={[
              styles.input,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text
              style={[
                dateOfBirth ? styles.inputText : styles.inputPlaceholder,
                { color: dateOfBirth ? c.text : c.placeholder },
              ]}
            >
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

          <Text style={[styles.label, { color: c.textMuted }]}>Address</Text>
          <TextInput
            style={[
              styles.input,
              styles.multiline,
              { backgroundColor: c.surface, borderColor: c.border, color: c.text },
            ]}
            value={address}
            onChangeText={setAddress}
            multiline
          />
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={[styles.switchLabel, { color: c.text }]}>
                Show me in the alumni directory
              </Text>
              <Text style={[styles.switchHint, { color: c.textMuted }]}>
                Other graduates can find you by name
              </Text>
            </View>
            <Switch
              value={showInDirectory}
              onValueChange={setShowInDirectory}
              trackColor={{ true: c.primary }}
            />
          </View>
        </View>

        <PrimaryButton
          title="Save"
          onPress={handleSave}
          loading={isSubmitting}
          style={{ marginTop: 4 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  label: { fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  inputText: { fontSize: 14 },
  inputPlaceholder: { fontSize: 14 },
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
  switchLabel: { fontSize: 14, fontWeight: '600' },
  switchHint: { fontSize: 12, marginTop: 2 },
});
