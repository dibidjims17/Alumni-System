import React, { useState, useRef } from 'react';
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
import { useTheme } from '../theme/ThemeContext';
import PrimaryButton from '../components/ui/PrimaryButton';
import PasswordField from '../components/ui/PasswordField';
import { alert as appAlert } from '../components/AppAlert';

export default function ResetPasswordScreen({ route, navigation }) {
  const { identifier } = route.params;
  const { theme } = useTheme();
  const c = theme.colors;
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef([]);

  function handleDigitChange(text, index) {
    // Handles pasting a full 6-digit code into a single box too
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, 6).split('');
      const nextDigits = [...digits];
      pasted.forEach((d, i) => {
        if (index + i < 6) nextDigits[index + i] = d;
      });
      setDigits(nextDigits);
      const lastFilled = Math.min(index + pasted.length, 5);
      inputRefs.current[lastFilled]?.focus();
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = cleaned;
    setDigits(nextDigits);

    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(e, index) {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleSubmit() {
    const code = digits.join('');
    if (code.length !== 6 || !newPassword || !confirmPassword) {
      appAlert('Missing info', 'Please enter the full 6-digit code and fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      appAlert('Mismatch', 'New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 6) {
      appAlert('Too short', 'New password should be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/Auth/reset-password', {
        identifier,
        code,
        newPassword,
      });
      appAlert('Success', 'Your password has been reset. Please log in.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Invalid or expired code. Please try again.';
      appAlert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={[styles.title, { color: c.text }]}>Reset Password</Text>
      <Text style={[styles.subtitle, { color: c.textMuted }]}>
        Enter the 6-digit code sent to your email, along with your new
        password.
      </Text>

      <View style={styles.codeRow}>
        {digits.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={[
              styles.codeBox,
              {
                backgroundColor: digit ? c.surface : c.surfaceAlt,
                borderColor: digit ? c.primary : c.border,
                borderWidth: digit ? 2 : 1,
                color: c.text,
              },
            ]}
            value={digit}
            onChangeText={(text) => handleDigitChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
            selectTextOnFocus
            autoFocus={index === 0}
          />
        ))}
      </View>

      <PasswordField
        placeholder="New Password"
        value={newPassword}
        onChangeText={setNewPassword}
        style={styles.field}
      />

      <PasswordField
        placeholder="Confirm New Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={styles.field}
      />

      <PrimaryButton
        title="Reset Password"
        onPress={handleSubmit}
        loading={isSubmitting}
        style={{ marginTop: 8 }}
      />

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate('ForgotPassword')}
      >
        <Text style={[styles.linkText, { color: c.primary }]}>Didn't get a code? Try again</Text>
      </TouchableOpacity>

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
  field: {
    marginBottom: 16,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  codeBox: {
    flex: 1,
    maxWidth: 52,
    height: 52,
    borderRadius: 12,
    fontSize: 20,
    fontWeight: '700',
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
