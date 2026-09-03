import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import PrimaryButton from '../components/ui/PrimaryButton';

export default function ChangePasswordScreen({ navigation }) {
  const { student, changePassword, logout } = useAuth();
  const { theme } = useTheme();
  const c = theme.colors;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Too short', 'New password should be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      // Forced flow (first login) auto-redirects once mustChangePassword flips.
      // Voluntary flow from Profile: confirm and go back.
      if (!student.mustChangePassword) {
        Alert.alert('Success', 'Your password has been changed.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Could not change password. Please check your current password and try again.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={[styles.title, { color: c.text }]}>Change Password</Text>
      {student.mustChangePassword && (
        <Text style={[styles.subtitle, { color: c.textMuted }]}>
          Welcome, {student?.fullName}. Please set a new password to continue.
        </Text>
      )}

      <TextInput
        style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
        placeholder="Current Password"
        placeholderTextColor={c.placeholder}
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        autoCapitalize="none"
      />

      <TextInput
        style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
        placeholder="New Password"
        placeholderTextColor={c.placeholder}
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        autoCapitalize="none"
      />

      <TextInput
        style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
        placeholder="Confirm New Password"
        placeholderTextColor={c.placeholder}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoCapitalize="none"
      />

      <PrimaryButton
        title="Change Password"
        onPress={handleSubmit}
        loading={isSubmitting}
        style={{ marginTop: 8 }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    fontSize: 15,
  },
});
