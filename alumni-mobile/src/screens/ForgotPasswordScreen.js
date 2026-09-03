import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import apiClient from '../api/client';
import { alert as appAlert } from '../components/AppAlert';
import { useTheme } from '../theme/ThemeContext';
import PrimaryButton from '../components/ui/PrimaryButton';

export default function ForgotPasswordScreen({ navigation }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [identifier, setIdentifier] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!identifier.trim()) {
      appAlert('Missing info', 'Please enter your student number or email.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/Auth/forgot-password', {
        identifier: identifier.trim(),
      });
      // Backend always returns a generic success message regardless of
      // whether the identifier matched an account — don't branch on match.
      setSubmitted(true);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Something went wrong. Please try again.';
      appAlert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <Text style={[styles.title, { color: c.text }]}>Check Your Email</Text>
        <Text style={[styles.subtitle, { color: c.textMuted }]}>
          If an account exists for "{identifier.trim()}", a 6-digit reset
          code has been sent. The code expires in 15 minutes.
        </Text>

        <PrimaryButton
          title="Enter Code"
          onPress={() =>
            navigation.navigate('ResetPassword', { identifier: identifier.trim() })
          }
          style={{ marginTop: 8 }}
        />

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={[styles.linkText, { color: c.primary }]}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={[styles.title, { color: c.text }]}>Forgot Password</Text>
      <Text style={[styles.subtitle, { color: c.textMuted }]}>
        Enter your student number or email and we'll send you a reset code.
      </Text>

      <TextInput
        style={[
          styles.input,
          { backgroundColor: c.surface, borderColor: c.border, color: c.text },
        ]}
        placeholder="Student Number or Email"
        placeholderTextColor={c.placeholder}
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <PrimaryButton
        title="Send Reset Code"
        onPress={handleSubmit}
        loading={isSubmitting}
        style={{ marginTop: 8 }}
      />

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={[styles.linkText, { color: c.primary }]}>Back to Login</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
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
    padding: 12,
    marginBottom: 16,
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
