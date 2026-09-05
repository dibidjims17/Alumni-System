// src/screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { alert as appAlert } from '../components/AppAlert';
import { useTheme } from '../theme/ThemeContext';
import PasswordField from '../components/ui/PasswordField';

export default function LoginScreen({ navigation }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const { theme } = useTheme();
  const c = theme.colors;

  async function handleLogin() {
    if (!identifier.trim() || !password) {
      appAlert('Missing info', 'Please enter your student number and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(identifier.trim(), password);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data ||
        'Invalid student number or password.';
      appAlert('Login failed', typeof message === 'string' ? message : 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Image
        source={require('../../assets/schoolLogo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={[styles.kicker, { color: c.primary }]}>REUNIO · ALUMNI CONNECT</Text>
      <Text style={[styles.title, { color: c.text }]}>Welcome back</Text>

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

      <PasswordField
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={{ marginBottom: 14 }}
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: c.primary }]}
        onPress={handleLogin}
        disabled={isSubmitting}
        activeOpacity={0.85}
      >
        {isSubmitting ? (
          <ActivityIndicator color={c.onPrimary} />
        ) : (
          <Text style={[styles.buttonText, { color: c.onPrimary }]}>Log In</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={[styles.forgotPassword, { color: c.primary }]}>
          Forgot Password?
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  logo: {
    width: 130,
    height: 130,
    alignSelf: 'center',
    marginBottom: 8,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textAlign: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 28,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    fontSize: 15,
  },
  button: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  forgotPassword: {
    textAlign: 'center',
    marginTop: 18,
    fontSize: 14,
    fontWeight: '600',
  },
});
