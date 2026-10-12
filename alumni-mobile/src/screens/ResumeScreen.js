// src/screens/ResumeScreen.js
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNBlobUtil from 'react-native-blob-util';
import Pdf from 'react-native-pdf';
import { Download, Trash2 } from 'lucide-react-native';
import apiClient from '../api/client';
import Skeleton from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import PrimaryButton from '../components/ui/PrimaryButton';
import { API_BASE_URL } from '../config';
import { alert as appAlert } from '../components/AppAlert';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB, matches backend rule

export default function ResumeScreen({ navigation }) {
  const { student } = useAuth();
  const { theme } = useTheme();
  const c = theme.colors;
  const [activeResume, setActiveResume] = useState(null);
  const [localPdfPath, setLocalPdfPath] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const isGraduate = student?.schoolYear === 'Graduate';

  // Header actions: download to device + remove, next to the title.
  useEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        activeResume ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={handleDownloadToDevice}
              disabled={isDownloading}
              accessibilityLabel="Download resume to device"
              style={{ padding: 8 }}
            >
              <Download size={20} color={c.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={confirmRemoveResume}
              accessibilityLabel="Remove resume"
              style={{ padding: 8 }}
            >
              <Trash2 size={20} color={c.danger} />
            </TouchableOpacity>
          </View>
        ) : undefined,
    });
  });

  async function fetchActiveResume() {
    try {
      const res = await apiClient.get('/Resume/active');
      setActiveResume(res.data);
      await downloadForViewing(res.data.id);
    } catch (err) {
      setActiveResume(null);
      setLocalPdfPath(null);
    }
  }

  async function downloadForViewing(resumeId) {
    setIsDownloading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const dest = `${RNBlobUtil.fs.dirs.CacheDir}/resume_${resumeId}.pdf`;
      const url = `${API_BASE_URL}/Resume/${resumeId}/download`;

      const res = await RNBlobUtil.fetch('GET', url, {
        Authorization: `Bearer ${token}`,
      });

      const base64Data = res.base64();

      await RNBlobUtil.fs.writeFile(dest, base64Data, 'base64');

      setLocalPdfPath(dest);
    } catch (err) {
      setLocalPdfPath(null);
    } finally {
      setIsDownloading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      if (!isGraduate) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      fetchActiveResume().finally(() => setIsLoading(false));
    }, [isGraduate])
  );

  // Save the active resume onto the device (Downloads via the system
  // Download Manager on Android; app documents on iOS).
  async function handleDownloadToDevice() {
    if (!activeResume || isDownloading) return;
    setIsDownloading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const url = `${API_BASE_URL}/Resume/${activeResume.id}/download`;
      const fileName = activeResume.fileName || 'resume.pdf';
      if (Platform.OS === 'android') {
        const { config, fs } = RNBlobUtil;
        await config({
          fileCache: false,
          addAndroidDownloads: {
            useDownloadManager: true,
            notification: true,
            mime: 'application/pdf',
            title: fileName,
            description: 'Reunio resume download',
            path: `${fs.dirs.DownloadDir}/${fileName}`,
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

  function confirmRemoveResume() {
    if (!activeResume) return;
    appAlert('Remove resume', `Delete "${activeResume.fileName}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: handleRemoveResume },
    ]);
  }

  async function handleRemoveResume() {
    try {
      await apiClient.delete(`/Resume/${activeResume.id}`);
      setActiveResume(null);
      setLocalPdfPath(null);
      appAlert('Removed', 'Your resume has been deleted.');
    } catch (err) {
      appAlert('Error', 'Could not delete resume. Please try again.');
    }
  }

  async function handleGenerate() {    setIsGenerating(true);
    try {
      await apiClient.post('/Resume/generate');
      await fetchActiveResume();
      appAlert('Generated', 'Your ATS-friendly CV is ready.');
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Could not generate CV. Complete your profile first.';
      appAlert('Error', message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function pickPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });

    if (result.canceled) return null;

    const file = result.assets[0];

    if (file.size && file.size > MAX_SIZE_BYTES) {
      appAlert('File too large', 'Resume must be 5MB or smaller.');
      return null;
    }

    return file;
  }

  async function handlePickAndUpload() {
    const file = await pickPdf();
    if (!file) return;

    setIsUploading(true);
    try {
      await apiClient.uploadFile('/Resume/upload', file.uri, file.name, 'application/pdf');
      await fetchActiveResume();
      appAlert('Uploaded', 'Your resume has been uploaded successfully.');
    } catch (err) {
      const message = err.response?.data?.message || 'Could not upload resume.';
      appAlert('Error', message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleUploadAndFill() {
    const file = await pickPdf();
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await apiClient.uploadFile('/Resume/upload-fill', file.uri, file.name, 'application/pdf');
      await fetchActiveResume();
      const filled = res.data?.filled || {};
      const parts = [];
      if (filled.workAdded > 0) parts.push(`${filled.workAdded} work experience`);
      if (filled.educationAdded > 0) parts.push(`${filled.educationAdded} education`);
      if (filled.skillsAdded > 0) parts.push(`${filled.skillsAdded} skills`);
      if (filled.phoneSet) parts.push('phone number');
      if (filled.bioSet) parts.push('bio');
      if (filled.headlineSet) parts.push('headline');
      if (filled.contactSet) parts.push('contact info');
      appAlert(
        'Profile updated',
        parts.length > 0
          ? `Resume saved. Filled from your PDF: ${parts.join(', ')}. Review everything in Profile.`
          : 'Resume saved. Nothing new could be confidently read — your existing profile was left untouched.'
      );
    } catch (err) {
      const message = err.response?.data?.message || 'Could not process resume.';
      appAlert('Error', message);
    } finally {
      setIsUploading(false);
    }
  }

  if (!isGraduate) {
    return (
      <View style={[styles.centered, { backgroundColor: c.background }]}>
        <Text style={[styles.infoText, { color: c.textMuted }]}>
          Resume upload is available for Graduate students only.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: c.background, padding: 16 }]}>
        <View style={[styles.skeletonCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Skeleton width="70%" height={15} style={{ marginBottom: 8 }} />
          <Skeleton width="45%" height={12} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={220} borderRadius={8} />
        </View>
        <Skeleton width="100%" height={48} borderRadius={10} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {activeResume ? (
        <>
          <Text style={[styles.fieldValue, { color: c.text }]}>{activeResume.fileName}</Text>
          <Text style={[styles.fieldLabel, { color: c.textMuted }]}>
            {activeResume.source === 'Generated' ? 'Generated' : 'Uploaded'}{' '}
            {new Date(activeResume.uploadedAt).toLocaleDateString()}
          </Text>

          <View style={[styles.pdfContainer, { backgroundColor: c.surface, borderColor: c.border }]}>
            {isDownloading ? (
              <ActivityIndicator size="large" />
            ) : localPdfPath ? (
              <Pdf
                source={{ uri: localPdfPath }}
                style={styles.pdf}
                onError={(err) => console.log('PDF RENDER ERROR:', err)}
              />
            ) : (
              <Text style={[styles.infoText, { color: c.textMuted }]}>Could not load PDF preview.</Text>
            )}
          </View>
        </>
      ) : (
        <Text style={[styles.fieldValue, { color: c.text }]}>No resume uploaded yet.</Text>
      )}

      <PrimaryButton
        title="Generate ATS CV from Profile"
        onPress={handleGenerate}
        loading={isGenerating}
        style={{ marginTop: 8 }}
      />

      <PrimaryButton
        title="Upload & Auto-fill Profile"
        onPress={handleUploadAndFill}
        loading={isUploading}
        style={{ marginTop: 8 }}
      />

      <PrimaryButton
        title={activeResume ? 'Replace Resume' : 'Upload Resume'}
        onPress={handlePickAndUpload}
        loading={isUploading}
        style={{ marginTop: 8 }}
      />

      <Text style={[styles.hintText, { color: c.textMuted }]}>PDF only, max 5MB.</Text>
    </View>
  );
}

const screenHeight = Dimensions.get('window').height;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  skeletonCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 12,
  },
  fieldValue: { fontSize: 13 },
  fieldLabel: { fontSize: 11, marginTop: 4, marginBottom: 12 },
  pdfContainer: {
    height: screenHeight * 0.5,
    borderWidth: 1,
    marginBottom: 16,
  },
  pdf: { flex: 1 },
  hintText: { fontSize: 11, marginTop: 8, textAlign: 'center' },
  infoText: { fontSize: 13, textAlign: 'center' },
});
