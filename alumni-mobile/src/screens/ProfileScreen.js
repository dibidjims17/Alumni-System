// src/screens/ProfileScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import apiClient from '../api/client';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import ProfileCompleteness from '../components/ProfileCompleteness';
import AppHeader from '../components/AppHeader';
import Skeleton from '../components/ui/Skeleton';
import { alert as appAlert } from '../components/AppAlert';

const SERVER_ROOT = API_BASE_URL.replace('/api', '');
const MAX_PICTURE_BYTES = 5 * 1024 * 1024;

export default function ProfileScreen({ navigation }) {
  const { theme } = useTheme();
  const { student } = useAuth();
  const c = theme.colors;

  const [profile, setProfile] = useState(null);
  const [jobPreferences, setJobPreferences] = useState(null);
  const [hasResume, setHasResume] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function fetchProfile() {
    try {
      const res = await apiClient.get('/Profile');
      setProfile(res.data);
    } catch (err) {
      appAlert('Error', 'Could not load profile.');
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

  async function handleRefresh() {
    setIsRefreshing(true);
    await Promise.all([fetchProfile(), fetchJobPreferences(), fetchResumeStatus()]);
    setIsRefreshing(false);
  }

  async function handleChangePicture() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const file = result.assets[0];
      if (!file.mimeType || !file.mimeType.startsWith('image/')) {
        appAlert('Invalid file', 'Please choose an image file.');
        return;
      }
      if (file.size && file.size > MAX_PICTURE_BYTES) {
        appAlert('File too large', 'Profile picture must be 5MB or smaller.');
        return;
      }

      await apiClient.uploadFile('/Profile/picture', file.uri, file.name, file.mimeType);
      await fetchProfile();
    } catch (err) {
      const message = err.response?.data?.message || 'Could not upload profile picture.';
      appAlert('Error', message);
    }
  }

  function confirmRemovePicture() {
    appAlert('Remove photo', 'Remove your profile picture and go back to the default?', [
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
      appAlert('Error', message);
    }
  }

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
        <AppHeader title="Profile" navigation={navigation} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Skeleton width={104} height={104} borderRadius={52} style={styles.skeletonAvatar} />
          <Skeleton width="50%" height={21} style={styles.skeletonCenter} />
          <Skeleton width="35%" height={13} style={[styles.skeletonCenter, { marginTop: 6 }]} />
          <View style={[styles.skeletonCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Skeleton width="45%" height={14} style={{ marginBottom: 10 }} />
            <Skeleton width="100%" height={13} style={{ marginBottom: 6 }} />
            <Skeleton width="80%" height={13} />
          </View>
          <View style={[styles.skeletonCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Skeleton width="35%" height={14} style={{ marginBottom: 10 }} />
            <Skeleton width="100%" height={13} style={{ marginBottom: 6 }} />
            <Skeleton width="90%" height={13} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top', 'left', 'right']}>
      <AppHeader title="Profile" navigation={navigation} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
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

        <View style={[styles.actionCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeader, { color: c.text }]}>Job Preferences</Text>
            <TouchableOpacity onPress={() => navigation.navigate('JobPreferences')}>
              <Text style={[styles.editLink, { color: c.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>
          {jobPreferences ? (
            <>
              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Preferred Job Title</Text>
              <Text style={[styles.fieldValue, { color: c.text }]}>
                {jobPreferences.preferredJobTitle || 'Not set'}
              </Text>
              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Preferred Industry</Text>
              <Text style={[styles.fieldValue, { color: c.text }]}>
                {jobPreferences.preferredIndustry || 'Not set'}
              </Text>
              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Preferred Location</Text>
              <Text style={[styles.fieldValue, { color: c.text }]}>
                {jobPreferences.preferredLocation || 'Not set'}
              </Text>
              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Open to Work</Text>
              <Text style={[styles.fieldValue, { color: c.text }]}>
                {jobPreferences.isOpenToWork ? 'Yes' : 'No'}
              </Text>
            </>
          ) : (
            <Text style={[styles.fieldValue, { color: c.text }]}>
              No job preferences set yet.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  skeletonAvatar: { alignSelf: 'center', marginBottom: 12 },
  skeletonCenter: { alignSelf: 'center' },
  skeletonCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginTop: 14,
  },
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
  sectionHeader: { fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editLink: { fontSize: 13, fontWeight: '600' },
  fieldLabel: { fontSize: 11, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  fieldValue: { fontSize: 14, marginTop: 2 },
});
