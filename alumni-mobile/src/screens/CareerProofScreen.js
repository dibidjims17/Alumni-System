// src/screens/CareerProofScreen.js
//
// Career & Employment: the graduate declares their current occupation and
// uploads the two documents that prove it (certificate of employment and
// work ID). The alumni office then approves or rejects the submission.
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { BadgeCheck, FileImage, Clock, XCircle, Plus } from 'lucide-react-native';
import apiClient from '../api/client';
import AppBackground from '../components/AppBackground';
import AppHeader from '../components/AppHeader';
import Skeleton from '../components/ui/Skeleton';
import PrimaryButton from '../components/ui/PrimaryButton';
import AutocompleteInput from '../components/AutocompleteInput';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { assetUrl } from '../utils/media';
import { alert as appAlert } from '../components/AppAlert';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB, matches backend rule

const EMPLOYMENT_STATUSES = ['Employed', 'Self-Employed', 'Unemployed', 'Further Studies'];
// These two imply the alumnus holds a job, so job details are required.
const OCCUPIED_STATUSES = ['Employed', 'Self-Employed'];

export default function CareerProofScreen({ navigation }) {
  const { student } = useAuth();
  const { theme } = useTheme();
  const c = theme.colors;

  const isGraduate = student?.schoolYear === 'Graduate';

  const [record, setRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [employmentStatus, setEmploymentStatus] = useState('Employed');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [industry, setIndustry] = useState('');
  const [dateStarted, setDateStarted] = useState('');

  // Newly picked files. When null, the copy already on file is reused.
  const [certificate, setCertificate] = useState(null);
  const [workId, setWorkId] = useState(null);

  const isOccupied = OCCUPIED_STATUSES.includes(employmentStatus);
  const isPending = record?.status === 'Pending';
  const isApproved = record?.status === 'Approved';

  async function fetchRecord() {
    try {
      const res = await apiClient.get('/Career/my-record');
      const data = res.data || null;
      setRecord(data);
      if (data) {
        setEmploymentStatus(data.employmentStatus || 'Employed');
        setJobTitle(data.jobTitle || '');
        setCompany(data.company || '');
        setIndustry(data.industry || '');
        setDateStarted(data.dateStarted ? data.dateStarted.split('T')[0] : '');
      }
    } catch (err) {
      setRecord(null);
    }
  }

  useFocusEffect(
    useCallback(() => {
      if (!isGraduate) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setCertificate(null);
      setWorkId(null);
      fetchRecord().finally(() => setIsLoading(false));
    }, [isGraduate])
  );

  async function fetchSuggestions(term, type) {
    const res = await apiClient.get(
      `/Suggestions?term=${encodeURIComponent(term)}&type=${encodeURIComponent(type)}`
    );
    return res.data || [];
  }

  async function pickImage() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
      copyToCacheDirectory: true,
    });

    if (result.canceled) return null;

    const file = result.assets[0];
    const looksLikeImage = file.mimeType
      ? file.mimeType.startsWith('image/')
      : /\.(jpe?g|png|gif|webp|bmp)$/i.test(file.name || '');

    if (!looksLikeImage) {
      appAlert('Invalid file', 'Please choose an image file.');
      return null;
    }

    if (file.size && file.size > MAX_SIZE_BYTES) {
      appAlert('File too large', 'Images must be 5MB or smaller.');
      return null;
    }

    return file;
  }

  async function handlePickCertificate() {
    const file = await pickImage();
    if (file) setCertificate(file);
  }

  async function handlePickWorkId() {
    const file = await pickImage();
    if (file) setWorkId(file);
  }

  function validate() {
    if (isOccupied && !jobTitle.trim()) {
      appAlert('Missing info', 'Job title is required for this employment status.');
      return false;
    }
    if (isOccupied && !company.trim()) {
      appAlert('Missing info', 'Company is required for this employment status.');
      return false;
    }
    const hasCertificate = !!certificate || !!record?.certificatePath;
    const hasWorkId = !!workId || !!record?.workIdPath;
    if (!hasCertificate || !hasWorkId) {
      appAlert(
        'Documents required',
        'Both a certificate of employment and a work ID are required.'
      );
      return false;
    }
    return true;
  }

  function handleSubmit() {
    if (isSubmitting || !validate()) return;

    // Re-submitting a verified record puts it back into review — make sure
    // that is a deliberate choice.
    if (isApproved) {
      appAlert(
        'Submit again?',
        'Your career record is currently verified. Submitting again will place it back in review.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit', onPress: doSubmit },
        ]
      );
      return;
    }

    doSubmit();
  }

  async function doSubmit() {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('employmentStatus', employmentStatus);
      formData.append('jobTitle', jobTitle.trim());
      formData.append('company', company.trim());
      formData.append('industry', industry.trim());
      formData.append('dateStarted', dateStarted.trim());

      // Omitted files fall back to the copies already on file server-side.
      if (certificate) {
        formData.append('certificate', {
          uri: certificate.uri,
          name: certificate.name,
          type: certificate.mimeType || 'image/jpeg',
        });
      }
      if (workId) {
        formData.append('workId', {
          uri: workId.uri,
          name: workId.name,
          type: workId.mimeType || 'image/jpeg',
        });
      }

      const res = await apiClient.uploadForm('/Career/proof', formData);
      await fetchRecord();
      setCertificate(null);
      setWorkId(null);
      appAlert('Submitted', res.data?.message || 'Your proof of occupation has been submitted.');
    } catch (err) {
      const message = err.response?.data?.message || 'Could not submit your proof of occupation.';
      appAlert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isGraduate) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top', 'left', 'right']}>
        <AppBackground />
        <AppHeader title="Career & Employment" navigation={navigation} showBack />
        <View style={[styles.centered, { backgroundColor: c.background }]}>
          <Text style={[styles.infoText, { color: c.textMuted }]}>
            Career tracking is available to graduates only.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top', 'left', 'right']}>
        <AppBackground />
        <AppHeader title="Career & Employment" navigation={navigation} showBack />
        <View style={styles.loadingWrap}>
          <View style={[styles.skeletonCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Skeleton width="55%" height={15} style={{ marginBottom: 8 }} />
            <Skeleton width="80%" height={12} />
          </View>
          <Skeleton width="100%" height={48} borderRadius={10} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top', 'left', 'right']}>
      <AppBackground />
      <AppHeader title="Career & Employment" navigation={navigation} showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Review status ─────────────────────────────── */}
          {record ? (
            <View style={[styles.statusCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={styles.statusHeader}>
                <StatusChip status={record.status} c={c} />
                <Text style={[styles.statusDate, { color: c.textMuted }]}>
                  {record.reviewedAt || record.updatedAt
                    ? `Updated ${new Date(record.reviewedAt || record.updatedAt).toLocaleDateString()}`
                    : `Submitted ${new Date(record.createdAt).toLocaleDateString()}`}
                </Text>
              </View>

              {isApproved ? (
                <View style={styles.verifiedRow}>
                  <BadgeCheck size={16} color={c.success} />
                  <Text style={[styles.verifiedText, { color: c.success }]}>
                    Career record verified
                  </Text>
                </View>
              ) : null}

              <Text style={[styles.summary, { color: c.text }]}>
                {[record.jobTitle, record.company].filter(Boolean).join(' at ') ||
                  record.employmentStatus}
              </Text>
              <Text style={[styles.summarySub, { color: c.textMuted }]}>
                {record.employmentStatus}
                {record.industry ? ` · ${record.industry}` : ''}
              </Text>

              {record.status === 'Rejected' && record.reviewNote ? (
                <View style={[styles.noteBox, { backgroundColor: c.tintDanger }]}>
                  <Text style={[styles.noteLabel, { color: c.danger }]}>Reason</Text>
                  <Text style={[styles.noteText, { color: c.text }]}>{record.reviewNote}</Text>
                </View>
              ) : null}

              {isPending ? (
                <View style={[styles.noteBox, { backgroundColor: c.tintWarning }]}>
                  <Clock size={13} color={c.warning} />
                  <Text style={[styles.pendingText, { color: c.warning }]}>
                    Awaiting review by the Alumni Office. You can update your submission below.
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={[styles.statusCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.introTitle, { color: c.text }]}>No career record yet</Text>
              <Text style={[styles.introText, { color: c.textMuted }]}>
                Tell the Alumni Office what you do now and prove it with your certificate of
                employment and work ID. Both documents are required.
              </Text>
            </View>
          )}

          {/* ── Declared occupation ──────────────────────── */}
          <Text style={[styles.groupTitle, { color: c.text }]}>Current occupation</Text>

          <Text style={[styles.label, { color: c.textMuted }]}>Employment Status *</Text>
          <View style={styles.chipRow}>
            {EMPLOYMENT_STATUSES.map((status) => {
              const selected = employmentStatus === status;
              return (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? c.primary : c.surface,
                      borderColor: selected ? c.primary : c.border,
                    },
                  ]}
                  onPress={() => setEmploymentStatus(status)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.chipText, { color: selected ? c.onPrimary : c.text }]}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {isOccupied ? (
            <>
              <Text style={[styles.label, { color: c.textMuted }]}>Job Title *</Text>
              <AutocompleteInput
                value={jobTitle}
                onChangeText={setJobTitle}
                onSearch={fetchSuggestions}
                apiType="jobtitle"
                placeholder="e.g. Web Developer"
              />

              <Text style={[styles.label, { color: c.textMuted }]}>Company *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: c.surface, borderColor: c.border, color: c.text },
                ]}
                value={company}
                onChangeText={setCompany}
                placeholder="e.g. Acme Corporation"
                placeholderTextColor={c.placeholder}
              />
            </>
          ) : null}

          <Text style={[styles.label, { color: c.textMuted }]}>Industry</Text>
          <AutocompleteInput
            value={industry}
            onChangeText={setIndustry}
            onSearch={fetchSuggestions}
            apiType="industry"
            placeholder="e.g. Information Technology"
          />

          <Text style={[styles.label, { color: c.textMuted }]}>
            {isOccupied ? 'Date Started (YYYY-MM-DD)' : 'Date Started (YYYY-MM-DD, optional)'}
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: c.surface, borderColor: c.border, color: c.text },
            ]}
            value={dateStarted}
            onChangeText={setDateStarted}
            placeholder="2023-06-01"
            placeholderTextColor={c.placeholder}
            autoCapitalize="none"
          />

          {/* ── Proof documents ──────────────────────────── */}
          <Text style={[styles.groupTitle, { color: c.text }]}>Proof documents</Text>
          <Text style={[styles.hint, { color: c.textMuted }]}>
            JPG, PNG, WEBP, GIF or BMP · max 5MB each
          </Text>

          <FileSlot
            label="Certificate of Employment"
            pickedFile={certificate}
            existingPath={record?.certificatePath}
            existingName={record?.certificateFileName}
            onPick={handlePickCertificate}
            onClear={() => setCertificate(null)}
            c={c}
          />

          <FileSlot
            label="Work ID"
            pickedFile={workId}
            existingPath={record?.workIdPath}
            existingName={record?.workIdFileName}
            onPick={handlePickWorkId}
            onClear={() => setWorkId(null)}
            c={c}
          />

          <PrimaryButton
            title={
              isSubmitting
                ? 'Submitting…'
                : isPending
                ? 'Update Submission'
                : record
                ? 'Submit Again'
                : 'Submit for Review'
            }
            onPress={handleSubmit}
            loading={isSubmitting}
            style={{ marginTop: 20 }}
          />

          <Text style={[styles.footnote, { color: c.textMuted }]}>
            Your submission is reviewed by the Alumni Office. You will see the result here.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StatusChip({ status, c }) {
  const palette = {
    Pending: { bg: c.tintWarning, fg: c.warning },
    Approved: { bg: c.tintSuccess, fg: c.success },
    Rejected: { bg: c.tintDanger, fg: c.danger },
  }[status] || { bg: c.tintInfo, fg: c.info };

  const Icon = status === 'Approved' ? BadgeCheck : status === 'Rejected' ? XCircle : Clock;

  return (
    <View style={[styles.statusChip, { backgroundColor: palette.bg }]}>
      <Icon size={13} color={palette.fg} />
      <Text style={[styles.statusChipText, { color: palette.fg }]}>{status}</Text>
    </View>
  );
}

function FileSlot({ label, pickedFile, existingPath, existingName, onPick, onClear, c }) {
  const previewUri = pickedFile ? pickedFile.uri : assetUrl(existingPath);
  const displayName = pickedFile ? pickedFile.name : existingName;

  return (
    <View style={[styles.fileSlot, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={styles.fileHeader}>
        <FileImage size={16} color={c.primary} />
        <Text style={[styles.fileLabel, { color: c.text }]}>{label} *</Text>
      </View>

      {previewUri ? (
        <View style={styles.filePreviewRow}>
          <Image source={{ uri: previewUri }} style={[styles.fileThumb, { backgroundColor: c.surfaceAlt }]} resizeMode="cover" />
          <View style={styles.fileMeta}>
            <Text style={[styles.fileName, { color: c.text }]} numberOfLines={2}>
              {displayName || 'Image on file'}
            </Text>
            {pickedFile ? (
              <Text style={[styles.fileState, { color: c.success }]}>New image selected</Text>
            ) : (
              <Text style={[styles.fileState, { color: c.textMuted }]}>Already uploaded</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.fileClear}
            onPress={onClear}
            disabled={!pickedFile}
            accessibilityLabel={`Remove selected ${label}`}
          >
            {pickedFile ? <XCircle size={18} color={c.danger} /> : null}
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.fileButton, { borderColor: c.primary }]}
        onPress={onPick}
        activeOpacity={0.8}
      >
        <Plus size={15} color={c.primary} />
        <Text style={[styles.fileButtonText, { color: c.primary }]}>
          {previewUri ? 'Replace image' : `Upload ${label}`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  loadingWrap: { padding: 16 },
  skeletonCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 12,
  },
  infoText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  statusCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusChipText: { fontSize: 11, fontWeight: '700' },
  statusDate: { fontSize: 11 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  verifiedText: { fontSize: 12, fontWeight: '700' },
  summary: { fontSize: 15, fontWeight: '700' },
  summarySub: { fontSize: 12, marginTop: 3 },
  introTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  introText: { fontSize: 12.5, lineHeight: 19 },
  noteBox: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'flex-start',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  noteLabel: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  noteText: { fontSize: 12.5, lineHeight: 18, flex: 1 },
  pendingText: { fontSize: 12, lineHeight: 17, flex: 1 },

  groupTitle: { fontSize: 14, fontWeight: '800', marginTop: 4, marginBottom: 2 },
  hint: { fontSize: 11, marginBottom: 8 },
  label: { fontSize: 12, marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 12.5, fontWeight: '600' },

  fileSlot: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  fileHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  fileLabel: { fontSize: 13, fontWeight: '700' },
  filePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  fileThumb: {
    width: 54,
    height: 54,
    borderRadius: 8,
  },
  fileMeta: { flex: 1 },
  fileName: { fontSize: 12.5, fontWeight: '600' },
  fileState: { fontSize: 11, marginTop: 3 },
  fileClear: { padding: 4 },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 10,
  },
  fileButtonText: { fontSize: 13, fontWeight: '700' },

  footnote: { fontSize: 11, textAlign: 'center', marginTop: 12, lineHeight: 16 },
});
