// src/screens/ResumeScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNBlobUtil from 'react-native-blob-util';
import Pdf from 'react-native-pdf';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB, matches backend rule

export default function ResumeScreen() {
  const { student } = useAuth();
  const [activeResume, setActiveResume] = useState(null);
  const [localPdfPath, setLocalPdfPath] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const isGraduate = student?.schoolYear === 'Graduate';

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

  async function handlePickAndUpload() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const file = result.assets[0];

    if (file.size && file.size > MAX_SIZE_BYTES) {
      Alert.alert('File too large', 'Resume must be 5MB or smaller.');
      return;
    }

    setIsUploading(true);
    try {
      await apiClient.uploadFile('/Resume/upload', file.uri, file.name, 'application/pdf');
      await fetchActiveResume();
      Alert.alert('Uploaded', 'Your resume has been uploaded successfully.');
    } catch (err) {
      const message = err.response?.data?.message || 'Could not upload resume.';
      Alert.alert('Error', message);
    } finally {
      setIsUploading(false);
    }
  }

  if (!isGraduate) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>
          Resume upload is available for Graduate students only.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {activeResume ? (
        <>
          <Text style={styles.fieldValue}>{activeResume.fileName}</Text>
          <Text style={styles.fieldLabel}>
            Uploaded {new Date(activeResume.uploadedAt).toLocaleDateString()}
          </Text>

          <View style={styles.pdfContainer}>
            {isDownloading ? (
              <ActivityIndicator size="large" />
            ) : localPdfPath ? (
              <Pdf
                source={{ uri: localPdfPath }}
                style={styles.pdf}
                onError={(err) => console.log('PDF RENDER ERROR:', err)}
              />
            ) : (
              <Text style={styles.infoText}>Could not load PDF preview.</Text>
            )}
          </View>
        </>
      ) : (
        <Text style={styles.fieldValue}>No resume uploaded yet.</Text>
      )}

      <TouchableOpacity
        style={styles.uploadButton}
        onPress={handlePickAndUpload}
        disabled={isUploading}
      >
        {isUploading ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.buttonText}>
            {activeResume ? 'Replace Resume' : 'Upload Resume'}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.hintText}>PDF only, max 5MB.</Text>
    </View>
  );
}

const screenHeight = Dimensions.get('window').height;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  fieldValue: { fontSize: 13 },
  fieldLabel: { fontSize: 11, marginTop: 4, marginBottom: 12 },
  pdfContainer: {
    height: screenHeight * 0.5,
    borderWidth: 1,
    marginBottom: 16,
  },
  pdf: { flex: 1 },
  uploadButton: {
    marginTop: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonText: { fontSize: 14 },
  hintText: { fontSize: 11, marginTop: 8, textAlign: 'center' },
  infoText: { fontSize: 13, textAlign: 'center' },
});