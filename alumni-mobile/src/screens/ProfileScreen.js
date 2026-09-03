// src/screens/ProfileScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Menu, X, Moon, Sun, KeyRound, LogOut } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import apiClient from '../api/client';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import ProfileCompleteness from '../components/ProfileCompleteness';

const SERVER_ROOT = API_BASE_URL.replace('/api', '');
const MAX_PICTURE_BYTES = 5 * 1024 * 1024;

export default function ProfileScreen({ navigation }) {
  const { theme, isDark, toggleDarkMode } = useTheme();
  const { student, logout } = useAuth();
  const c = theme.colors;

  const [profile, setProfile] = useState(null);
  const [jobPreferences, setJobPreferences] = useState(null);
  const [hasResume, setHasResume] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  async function fetchProfile() {
    try {
      const res = await apiClient.get('/Profile');
      setProfile(res.data);
    } catch (err) {
      Alert.alert('Error', 'Could not load profile.');
    }
  }

  async function fetchJobPreferences() {
    try {
      const res = await apiClient.get('/Profile/job-preferences');
      if (res.data && !res.data.message) {
        setJobPreferences(res.data);
      } else {
        setJobPreferences(null);
      }
    } catch (err) {
      // Job preferences are optional — never block profile loading
    }
  }

  async function fetchResumeStatus() {
    try {
      await apiClient.get('/Resume/active');
      setHasResume(true);
    } catch (err) {
      setHasResume(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      Promise.all([fetchProfile(), fetchJobPreferences(), fetchResumeStatus()]).finally(() =>
        setIsLoading(false)
      );
    }, [])
  );

  async function handleChangePicture() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const file = result.assets[0];
      if (!file.mimeType || !file.mimeType.startsWith('image/')) {
        Alert.alert('Invalid file', 'Please choose an image file.');
        return;
      }
      if (file.size && file.size > MAX_PICTURE_BYTES) {
        Alert.alert('File too large', 'Profile picture must be 5MB or smaller.');
        return;
      }

      await apiClient.uploadFile('/Profile/picture', file.uri, file.name, file.mimeType);
      await fetchProfile();
    } catch (err) {
      const message = err.response?.data?.message || 'Could not upload profile picture.';
      Alert.alert('Error', message);
    }
  }

  function confirmRemovePicture() {
    Alert.alert('Remove photo', 'Remove your profile picture and go back to the default?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: handleRemovePicture },
    ]);
  }

  async function handleRemovePicture() {
    try {
      await apiClient.delete('/Profile/picture');
      await fetchProfile();
    } catch (err) {
      const message = err.response?.data?.message || 'Could not remove profile picture.';
      Alert.alert('Error', message);
    }
  }

  function confirmSignOut() {
    setMenuOpen(false);
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }

  function menuRow({ icon, label, color, onPress }) {
    return (
      <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
        {icon}
        <Text style={[styles.menuLabel, { color: color || c.text }]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setMenuOpen(true)}
          accessibilityLabel="Menu"
        >
          <Menu size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>Profile</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={handleChangePicture} accessibilityLabel="Change profile picture">
          <Image
            source={
              profile.profilePictureUrl
                ? { uri: `${SERVER_ROOT}/${profile.profilePictureUrl}` }
                : require('../../assets/defaultPFP.png')
            }
            style={styles.avatar}
          />
        </TouchableOpacity>
        {profile.profilePictureUrl ? (
          <TouchableOpacity onPress={confirmRemovePicture}>
            <Text style={[styles.removePhotoText, { color: c.primary }]}>Remove photo</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={[styles.name, { color: c.text }]}>{profile.fullName}</Text>
        <Text style={[styles.subtext, { color: c.textMuted }]}>
          {profile.studentNumber} - {profile.program}
        </Text>
        {profile.headline ? (
          <Text style={[styles.headline, { color: c.text }]}>{profile.headline}</Text>
        ) : null}

        <ProfileCompleteness
          profile={profile}
          jobPreferences={jobPreferences}
          hasResume={hasResume}
          navigation={navigation}
        />

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => navigation.navigate('EditProfile', { profile })}
        >
          <Text style={[styles.actionCardText, { color: c.text }]}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => navigation.navigate('Resume')}
        >
          <Text style={[styles.actionCardText, { color: c.text }]}>Resume</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => navigation.navigate('CareerTab', { screen: 'MyApplications' })}
        >
          <Text style={[styles.actionCardText, { color: c.text }]}>My Applications</Text>
        </TouchableOpacity>

        <View style={[styles.actionCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.sectionHeader, { color: c.text }]}>About</Text>
          <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Bio</Text>
          <Text style={[styles.fieldValue, { color: c.text }]}>{profile.bio || 'Not set'}</Text>
          <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Location</Text>
          <Text style={[styles.fieldValue, { color: c.text }]}>{profile.location || 'Not set'}</Text>
          <Text style={[styles.fieldLabel, { color: c.textMuted }]}>LinkedIn</Text>
          <Text style={[styles.fieldValue, { color: c.text }]}>{profile.linkedInUrl || 'Not set'}</Text>
          <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Phone</Text>
          <Text style={[styles.fieldValue, { color: c.text }]}>{profile.phone || 'Not set'}</Text>
        </View>
      </ScrollView>

      <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: c.overlay }]}>
          <TouchableOpacity style={styles.modalBackdropTouch} onPress={() => setMenuOpen(false)} />
          <View style={[styles.menuSheet, { backgroundColor: c.surface }]}>
            <View style={styles.menuHeader}>
              <Text style={[styles.menuTitle, { color: c.text }]}>Menu</Text>
              <TouchableOpacity onPress={() => setMenuOpen(false)} accessibilityLabel="Close menu">
                <X size={20} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={[styles.menuRow, { borderBottomColor: c.border }]}>
              {isDark ? <Moon size={20} color={c.primary} /> : <Sun size={20} color={c.primary} />}
              <Text style={[styles.menuLabel, { color: c.text }]}>Dark Mode</Text>
              <Switch
                value={isDark}
                onValueChange={toggleDarkMode}
                trackColor={{ true: c.primary }}
                thumbColor="#fff"
              />
            </View>

            {menuRow({
              icon: <KeyRound size={20} color={c.textMuted} />,
              label: 'Change Password',
              onPress: () => {
                setMenuOpen(false);
                navigation.navigate('ChangePassword');
              },
            })}

            {menuRow({
              icon: <LogOut size={20} color={c.danger} />,
              label: 'Sign Out',
              color: c.danger,
              onPress: confirmSignOut,
            })}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconButton: { padding: 6, minWidth: 36 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 40 },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignSelf: 'center',
    marginBottom: 6,
  },
  removePhotoText: { fontSize: 12, textAlign: 'center', marginBottom: 10 },
  name: { fontSize: 21, fontWeight: '700', textAlign: 'center' },
  subtext: { fontSize: 13, marginTop: 2, textAlign: 'center' },
  headline: { fontSize: 14, marginTop: 6, textAlign: 'center', fontStyle: 'italic' },
  actionCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  actionCardText: { fontSize: 15, fontWeight: '600' },
  sectionHeader: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  fieldLabel: { fontSize: 11, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  fieldValue: { fontSize: 14, marginTop: 2 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  modalBackdropTouch: { flex: 1 },
  menuSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
  },
  menuTitle: { fontSize: 16, fontWeight: '700' },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuLabel: { flex: 1, marginLeft: 14, fontSize: 15 },
});
