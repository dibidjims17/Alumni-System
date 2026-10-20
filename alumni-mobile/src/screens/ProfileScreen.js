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
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import RNBlobUtil from 'react-native-blob-util';
import apiClient from '../api/client';
import { API_BASE_URL } from '../config';
import { LogOut } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import ProfileCompleteness, { computeCompleteness } from '../components/ProfileCompleteness';
import AppHeader from '../components/AppHeader';
import AppBackground from '../components/AppBackground';
import Skeleton from '../components/ui/Skeleton';
import { alert as appAlert } from '../components/AppAlert';

const SERVER_ROOT = API_BASE_URL.replace('/api', '');
const MAX_PICTURE_BYTES = 5 * 1024 * 1024;

function formatDateRange(start, end, isCurrent) {
  const s = start ? start.split('T')[0] : '—';
  if (isCurrent || !end) return `${s} – Present`;
  return `${s} – ${end.split('T')[0]}`;
}

export default function ProfileScreen({ navigation }) {
  const { theme } = useTheme();
  const { student, logout } = useAuth();
  const c = theme.colors;

  function confirmSignOut() {
    appAlert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }

  const [profile, setProfile] = useState(null);
  const [jobPreferences, setJobPreferences] = useState(null);
  const [activeResume, setActiveResume] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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
      const res = await apiClient.get('/Resume/active');
      setActiveResume(res.data);
    } catch (err) {
      setActiveResume(null);
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

  // Save the active resume PDF onto the device (Downloads folder on
  // Android via the system Download Manager; app documents on iOS).
  async function handleDownloadResume() {
    if (!activeResume) return;
    setIsDownloading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const url = `${API_BASE_URL}/Resume/${activeResume.id}/download`;
      const fileName = activeResume.fileName || 'resume.pdf';
      if (Platform.OS === 'android') {
        await RNBlobUtil.config({
          fileCache: false,
          addAndroidDownloads: {
            useDownloadManager: true,
            notification: true,
            mime: 'application/pdf',
            title: fileName,
            description: 'Reunio resume download',
            path: `${RNBlobUtil.fs.dirs.DownloadDir}/${fileName}`,
          },
        }).fetch('GET', url, { Authorization: `Bearer ${token}` });
        appAlert('Downloaded', `${fileName} saved to Downloads.`);
      } else {
        const dest = `${RNBlobUtil.fs.dirs.DocumentDir}/${fileName}`;
        const res = await RNBlobUtil.fetch('GET', url, { Authorization: `Bearer ${token}` });
        await RNBlobUtil.fs.writeFile(dest, res.base64(), 'base64');
        appAlert('Downloaded', `${fileName} saved to app documents.`);
      }
    } catch (err) {
      appAlert('Error', 'Could not download resume. Check your connection and try again.');
    } finally {
      setIsDownloading(false);
    }
  }

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['top']}>
        <AppBackground />
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

  const workList = profile.workExperiences || [];
  const eduList = profile.educations || [];
  const skillList = profile.skills || [];
  const { percent } = computeCompleteness(profile, jobPreferences, !!activeResume);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['top', 'left', 'right']}>
      <AppBackground />
      <AppHeader title="Profile" navigation={navigation} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* ── Identity header ─────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
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
            {profile.studentNumber} · {profile.program}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('YearCorrection')}
            accessibilityLabel="Request year level correction"
          >
            <Text style={[styles.yearLine, { color: c.primary }]}>
              Year level: {student?.schoolYear || '—'} — wrong? Request a correction
            </Text>
          </TouchableOpacity>
          {profile.headline ? (
            <Text style={[styles.headline, { color: c.text }]}>{profile.headline}</Text>
          ) : null}

          <ProfileCompleteness
            profile={profile}
            jobPreferences={jobPreferences}
            hasResume={!!activeResume}
            navigation={navigation}
          />
          {percent < 100 ? (
            <TouchableOpacity
              style={[styles.wizardButton, { backgroundColor: c.primary }]}
              onPress={() => navigation.navigate('ProfileWizard')}
            >
              <Text style={[styles.wizardButtonText, { color: c.onPrimary }]}>
                Complete your profile step by step
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ── About ───────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeader, { color: c.text }]}>About</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EditProfile', { profile })}>
              <Text style={[styles.editLink, { color: c.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>
          <InfoRow label="Bio" value={profile.bio} c={c} />
          <InfoRow label="Location" value={profile.location} c={c} />
          <InfoRow label="Phone" value={profile.phone} c={c} />
          <InfoRow label="LinkedIn" value={profile.linkedInUrl} c={c} />
          <InfoRow label="Address" value={profile.address} c={c} />
          <InfoRow
            label="Birthday"
            value={profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : ''}
            c={c}
          />
        </View>

        {/* ── Work experience ─────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeader, { color: c.text }]}>
              Work Experience{workList.length > 0 ? ` (${workList.length})` : ''}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('EditWorkExperience', {})}>
              <Text style={[styles.editLink, { color: c.primary }]}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {workList.length === 0 ? (
            <EmptyNote c={c} text="No work experience yet — tap + Add." />
          ) : (
            workList.map((w) => (
              <TouchableOpacity
                key={w.id}
                style={[styles.entry, { borderTopColor: c.border }]}
                onPress={() => navigation.navigate('EditWorkExperience', { workExperience: w })}
              >
                <Text style={[styles.entryTitle, { color: c.text }]}>{w.jobTitle}</Text>
                <Text style={[styles.entrySub, { color: c.textMuted }]}>
                  {w.company}{w.location ? ` · ${w.location}` : ''}
                </Text>
                <Text style={[styles.entryMeta, { color: c.textMuted }]}>
                  {formatDateRange(w.startDate, w.endDate, w.isCurrentJob)}
                </Text>
                {w.description ? (
                  <Text style={[styles.entryDesc, { color: c.text }]} numberOfLines={3}>
                    {w.description}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ── Education ───────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeader, { color: c.text }]}>
              Education{eduList.length > 0 ? ` (${eduList.length})` : ''}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('EditEducation', {})}>
              <Text style={[styles.editLink, { color: c.primary }]}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {eduList.length === 0 ? (
            <EmptyNote c={c} text="No education yet — tap + Add." />
          ) : (
            eduList.map((e) => (
              <TouchableOpacity
                key={e.id}
                style={[styles.entry, { borderTopColor: c.border }]}
                onPress={() => navigation.navigate('EditEducation', { education: e })}
              >
                <Text style={[styles.entryTitle, { color: c.text }]}>{e.degree}</Text>
                <Text style={[styles.entrySub, { color: c.textMuted }]}>
                  {e.school}{e.fieldOfStudy ? ` · ${e.fieldOfStudy}` : ''}
                </Text>
                <Text style={[styles.entryMeta, { color: c.textMuted }]}>
                  {e.startYear}{e.endYear ? ` – ${e.endYear}` : ' – Present'}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ── Skills ──────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeader, { color: c.text }]}>
              Skills{skillList.length > 0 ? ` (${skillList.length})` : ''}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('EditSkills', { skills: skillList })}>
              <Text style={[styles.editLink, { color: c.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>
          {skillList.length === 0 ? (
            <EmptyNote c={c} text="No skills yet — tap Edit to add some." />
          ) : (
            <View style={styles.chipRow}>
              {skillList.map((s, i) => (
                <View key={`${s}-${i}`} style={[styles.chip, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                  <Text style={[styles.chipText, { color: c.text }]}>{s}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Job preferences ─────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeader, { color: c.text }]}>Job Preferences</Text>
            <TouchableOpacity onPress={() => navigation.navigate('JobPreferences')}>
              <Text style={[styles.editLink, { color: c.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>
          {jobPreferences ? (
            <>
              <InfoRow label="Preferred title" value={jobPreferences.preferredJobTitle} c={c} />
              <InfoRow label="Industry" value={jobPreferences.preferredIndustry} c={c} />
              <InfoRow label="Location" value={jobPreferences.preferredLocation} c={c} />
              <InfoRow
                label="Open to work"
                value={jobPreferences.isOpenToWork ? 'Yes' : 'No'}
                alwaysShow
                c={c}
              />
            </>
          ) : (
            <EmptyNote c={c} text="No job preferences set yet." />
          )}
        </View>

        {/* ── Resume ──────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeader, { color: c.text }]}>Résumé</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Resume')}>
              <Text style={[styles.editLink, { color: c.primary }]}>Manage</Text>
            </TouchableOpacity>
          </View>
          {activeResume ? (
            <>
              <Text style={[styles.fieldValue, { color: c.text }]}>{activeResume.fileName}</Text>
              <TouchableOpacity
                style={[styles.downloadButton, { borderColor: c.border }]}
                onPress={handleDownloadResume}
                disabled={isDownloading}
              >
                <Text style={[styles.downloadButtonText, { color: c.primary }]}>
                  {isDownloading ? 'Downloading…' : '⬇ Download to device'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <EmptyNote c={c} text="No résumé yet — open Manage to generate or upload one." />
          )}
        </View>

        {/* ── Account ─────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.sectionHeader, { color: c.text }]}>Account</Text>
          <TouchableOpacity
            style={styles.accountRow}
            onPress={() => navigation.navigate('CareerTab', { screen: 'MyApplications' })}
          >
            <Text style={[styles.accountRowText, { color: c.text }]}>My Applications</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.accountRow}
            onPress={() => navigation.navigate('Documents')}
          >
            <Text style={[styles.accountRowText, { color: c.text }]}>My Documents</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.accountRow}
            onPress={() => navigation.navigate('ChangePassword')}
          >
            <Text style={[styles.accountRowText, { color: c.text }]}>Change Password</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.signOutRow} onPress={confirmSignOut}>
            <LogOut size={15} color={c.danger} />
            <Text style={[styles.signOutText, { color: c.danger }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, alwaysShow, c }) {
  if (!alwaysShow && (!value || !String(value).trim())) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.fieldLabel, { color: c.textMuted }]}>{label}</Text>
      <Text style={[styles.fieldValue, { color: c.text }]}>{value || 'Not set'}</Text>
    </View>
  );
}

function EmptyNote({ text, c }) {
  return <Text style={[styles.emptyNote, { color: c.textMuted }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  skeletonAvatar: { alignSelf: 'center', marginBottom: 12 },
  skeletonCenter: { alignSelf: 'center' },
  skeletonCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginTop: 14,
  },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignSelf: 'center',
    marginBottom: 6,
  },
  removePhotoText: { fontSize: 12, textAlign: 'center', marginBottom: 10 },
  name: { fontSize: 21, fontWeight: '700', textAlign: 'center' },
  subtext: { fontSize: 13, marginTop: 2, textAlign: 'center' },
  yearLine: { fontSize: 12.5, marginTop: 6, textAlign: 'center', fontWeight: '600' },
  headline: { fontSize: 14, marginTop: 8, textAlign: 'center', fontStyle: 'italic' },
  wizardButton: {
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  wizardButtonText: { fontWeight: '700', fontSize: 14 },
  sectionHeader: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  editLink: { fontSize: 13, fontWeight: '700' },
  infoRow: { marginTop: 10 },
  fieldLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
  fieldValue: { fontSize: 14, marginTop: 2 },
  emptyNote: { fontSize: 13, marginTop: 8, fontStyle: 'italic' },
  entry: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    marginTop: 6,
  },
  entryTitle: { fontSize: 15, fontWeight: '700' },
  entrySub: { fontSize: 13, marginTop: 2 },
  entryMeta: { fontSize: 12, marginTop: 2 },
  entryDesc: { fontSize: 13, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  chip: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  downloadButton: {
    marginTop: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
  },
  downloadButtonText: { fontSize: 14, fontWeight: '700' },
  accountRow: { paddingVertical: 12 },
  accountRowText: { fontSize: 15, fontWeight: '600' },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  signOutText: { fontSize: 15, fontWeight: '700' },
});
