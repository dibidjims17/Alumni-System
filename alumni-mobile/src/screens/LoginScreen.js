// src/screens/LoginScreen.js
// Login styled after the school portal's mobile look: deep-green hero card
// (brand + badge + two-line headline + feature list) stacked over a white
// form card with a gold section label. Brand colors on the hero are fixed;
// everything inside the form card follows the active theme (light/dark).
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
  ScrollView,
} from 'react-native';
import { MapPin, CalendarDays, Users } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { alert as appAlert } from '../components/AppAlert';
import { useTheme } from '../theme/ThemeContext';
import PasswordField from '../components/ui/PasswordField';
import AppBackground from '../components/AppBackground';
import { signInWithGoogle, isGoogleCancelled, googleSetupMessage } from '../auth/google';

export default function LoginScreen({ navigation }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const { theme, isDark } = useTheme();
  const c = theme.colors;

  async function handleLogin() {
    if (!identifier.trim() || !password) {
      appAlert('Missing info', 'Please enter your alumni number and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(identifier.trim(), password);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data ||
        'Invalid alumni number or password.';
      appAlert('Login failed', typeof message === 'string' ? message : 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setIsGoogleSubmitting(true);
    try {
      const idToken = await signInWithGoogle();
      await loginWithGoogle(idToken);
    } catch (err) {
      if (isGoogleCancelled(err)) return; // user dismissed the picker
      const message =
        err.response?.data?.message ||
        (typeof err.message === 'string' ? err.message : 'Google sign-in failed.');
      appAlert('Google sign-in failed', message);
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  const setupHint = googleSetupMessage();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: 'transparent' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppBackground />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero — school-portal style art panel ─────────────────── */}
        <View style={styles.hero}>
          <View style={[styles.heroBlob, { top: -56, right: -36 }]} />
          <View style={[styles.heroBlob, styles.heroBlobAlt, { bottom: -48, left: -30 }]} />

          <View style={styles.brandRow}>
            <Image
              source={require('../../assets/schoolLogo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.brandName}>Reunio</Text>
              <Text style={styles.brandSub}>Alumni Connect</Text>
            </View>
          </View>

          <View style={styles.badge}>
            <MapPin size={12} color="#F2F6EE" />
            <Text style={styles.badgeText}>ALUMNI PORTAL</Text>
          </View>

          <Text style={styles.heroTitle}>
            Less distance.{'\n'}
            <Text style={styles.heroTitleAccent}>More reunion.</Text>
          </Text>

          <Text style={styles.heroCopy}>
            From your batchmates to your next reunion — your alumni life, connected.
          </Text>

          <View style={styles.featureList}>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <CalendarDays size={13} color="#CFE8D8" />
              </View>
              <Text style={styles.featureText}>Reunions &amp; events, all in one place</Text>
            </View>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Users size={13} color="#CFE8D8" />
              </View>
              <Text style={styles.featureText}>Find your batch, stay in touch</Text>
            </View>
          </View>
        </View>

        {/* ── Form card ────────────────────────────────────────────── */}
        <View
          style={[
            styles.formCard,
            { backgroundColor: c.surface, borderColor: c.border, shadowColor: c.shadow },
            isDark && { shadowOpacity: 0.35 },
          ]}
        >
          <View style={styles.labelRow}>
            <View style={[styles.labelBar, { backgroundColor: c.warning }]} />
            <Text style={[styles.formLabel, { color: c.warning }]}>ALUMNI ACCESS</Text>
          </View>
          <Text style={[styles.formTitle, { color: c.text }]}>Welcome back</Text>
          <Text style={[styles.formSub, { color: c.textMuted }]}>
            Sign in to stay connected to your alumni community.
          </Text>

          <TextInput
            style={[
              styles.input,
              { backgroundColor: c.surface, borderColor: c.border, color: c.text },
            ]}
            placeholder="Alumni Number or Email"
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
            style={{ marginBottom: 14, borderRadius: 10 }}
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

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
            <Text style={[styles.dividerText, { color: c.textMuted }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              styles.googleButton,
              { borderColor: c.border, backgroundColor: c.surface },
            ]}
            onPress={handleGoogleLogin}
            disabled={isGoogleSubmitting}
            activeOpacity={0.85}
          >
            {isGoogleSubmitting ? (
              <ActivityIndicator color={c.primary} />
            ) : (
              <Text style={[styles.buttonText, { color: c.text }]}>Ⓖ  Continue with Google</Text>
            )}
          </TouchableOpacity>
          {setupHint ? (
            <Text style={[styles.setupHint, { color: c.textMuted }]}>{setupHint}</Text>
          ) : null}

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={[styles.forgotPassword, { color: c.primary }]}>
              Forgot Password?
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // ── Hero ──────────────────────────────────────────────────────────
  hero: {
    borderRadius: 24,
    backgroundColor: '#203C31',
    paddingVertical: 22,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  heroBlob: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  heroBlobAlt: {
    backgroundColor: 'rgba(169,219,192,0.10)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandLogo: {
    width: 46,
    height: 46,
  },
  brandName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  brandSub: {
    fontSize: 12,
    color: 'rgba(242,246,238,0.72)',
    marginTop: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    color: '#F2F6EE',
  },
  heroTitle: {
    fontSize: 29,
    fontWeight: '600',
    letterSpacing: -1,
    color: '#FFFFFF',
    marginTop: 18,
    lineHeight: 35,
  },
  heroTitleAccent: {
    color: '#A9DBC0',
  },
  heroCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(242,246,238,0.85)',
    marginTop: 10,
  },
  featureList: {
    marginTop: 14,
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(242,246,238,0.9)',
  },

  // ── Form card ─────────────────────────────────────────────────────
  formCard: {
    marginTop: 14,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
    marginRight: 8,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.6,
    marginTop: 8,
  },
  formSub: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 14,
    fontSize: 15,
  },
  button: {
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  googleButton: {
    borderWidth: 1,
    marginTop: 0,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  setupHint: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 11,
  },
  forgotPassword: {
    textAlign: 'center',
    marginTop: 18,
    fontSize: 14,
    fontWeight: '600',
  },
});
