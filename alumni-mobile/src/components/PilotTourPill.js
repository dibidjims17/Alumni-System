import React, { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Map,
  MinusCircle,
  Play,
  RotateCcw,
  X,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import apiClient from '../api/client';
import { alert as appAlert } from './AppAlert';
import {
  PILOT_TOUR_CONFIG,
  PILOT_TOUR_STEPS,
  TERMINAL_TOUR_STATUSES,
} from '../pilotTour/pilotTourConfig';

const STATUS_LABELS = {
  pending: 'Not started',
  in_progress: 'In progress',
  tried: 'Tried',
  skipped: 'Skipped',
  not_applicable: 'Not applicable',
};

function createParticipantCode() {
  const time = Date.now().toString(36).slice(-5).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `R-${time}-${random}`;
}

function blankProgress(version = PILOT_TOUR_CONFIG.version) {
  return {
    version,
    participantCode: createParticipantCode(),
    startedAt: null,
    completedAt: null,
    feedbackOpenedAt: null,
    statuses: {},
  };
}

function statusFor(progress, stepKey) {
  return progress?.statuses?.[stepKey] || 'pending';
}

function StatusIcon({ status, color }) {
  if (status === 'tried') return <CheckCircle2 size={19} color={color} />;
  if (status === 'in_progress') return <Play size={19} color={color} />;
  if (status === 'skipped' || status === 'not_applicable') {
    return <MinusCircle size={19} color={color} />;
  }
  return <Circle size={19} color={color} />;
}

export default function PilotTourPill({ navigation }) {
  const { student } = useAuth();
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const [progress, setProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [remoteConfig, setRemoteConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(PILOT_TOUR_CONFIG.enabled);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const effectiveVersion = remoteConfig?.version || PILOT_TOUR_CONFIG.version;
  const feedbackFormUrl =
    remoteConfig?.feedbackFormUrl || PILOT_TOUR_CONFIG.feedbackFormUrl;
  const isEligible =
    PILOT_TOUR_CONFIG.enabled &&
    remoteConfig?.enabled === true &&
    student?.schoolYear === 'Graduate' &&
    !!student?.id;
  const storageKey = student?.id
    ? `reunio:${effectiveVersion}:${student.id}`
    : null;

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!PILOT_TOUR_CONFIG.enabled || !student?.id) {
      setRemoteConfig(null);
      setConfigLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setConfigLoading(true);
    apiClient
      .get('/AppConfig')
      .then((response) => {
        if (!cancelled) setRemoteConfig(response.data?.pilotTour || { enabled: false });
      })
      .catch(() => {
        // Production fails closed. Development can still preview the UI when
        // the local API has not yet been restarted with the new endpoint.
        if (!cancelled) {
          setRemoteConfig({
            enabled: __DEV__,
            version: PILOT_TOUR_CONFIG.version,
            feedbackFormUrl: PILOT_TOUR_CONFIG.feedbackFormUrl,
          });
        }
      })
      .finally(() => {
        if (!cancelled) setConfigLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [student?.id]);

  useEffect(() => {
    let cancelled = false;
    if (!isEligible || !storageKey) {
      setProgress(null);
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setIsLoading(true);
    AsyncStorage.getItem(storageKey)
      .then((saved) => {
        if (cancelled) return;
        if (!saved) {
          setProgress(blankProgress(effectiveVersion));
          return;
        }
        try {
          const parsed = JSON.parse(saved);
          setProgress(
            parsed?.version === effectiveVersion
              ? { ...blankProgress(effectiveVersion), ...parsed, statuses: parsed.statuses || {} }
              : blankProgress(effectiveVersion)
          );
        } catch {
          setProgress(blankProgress(effectiveVersion));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveVersion, isEligible, storageKey]);

  const completedCount = useMemo(
    () =>
      PILOT_TOUR_STEPS.filter((step) =>
        TERMINAL_TOUR_STATUSES.has(statusFor(progress, step.key))
      ).length,
    [progress]
  );
  const allComplete = completedCount === PILOT_TOUR_STEPS.length;
  const suggestedStep = useMemo(
    () =>
      PILOT_TOUR_STEPS.find((step) => statusFor(progress, step.key) === 'in_progress') ||
      PILOT_TOUR_STEPS.find((step) => !TERMINAL_TOUR_STATUSES.has(statusFor(progress, step.key))) ||
      PILOT_TOUR_STEPS[0],
    [progress]
  );
  const selectedStep =
    PILOT_TOUR_STEPS.find((step) => step.key === selectedKey) || suggestedStep;
  const selectedStatus = statusFor(progress, selectedStep.key);

  function commitProgress(next) {
    setProgress(next);
    if (storageKey) {
      AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
    }
  }

  function ensureStarted(current) {
    return current.startedAt ? current : { ...current, startedAt: new Date().toISOString() };
  }

  function openTour() {
    const current = progress || blankProgress(effectiveVersion);
    if (!current.startedAt) commitProgress(ensureStarted(current));
    setSelectedKey(suggestedStep.key);
    setSheetVisible(true);
  }

  function updateStatus(stepKey, status) {
    const current = ensureStarted(progress || blankProgress(effectiveVersion));
    const statuses = { ...current.statuses, [stepKey]: status };
    const nowComplete = PILOT_TOUR_STEPS.every((step) =>
      TERMINAL_TOUR_STATUSES.has(statuses[step.key] || 'pending')
    );
    const next = {
      ...current,
      statuses,
      completedAt: nowComplete ? current.completedAt || new Date().toISOString() : null,
    };
    commitProgress(next);

    if (TERMINAL_TOUR_STATUSES.has(status)) {
      const nextPending = PILOT_TOUR_STEPS.find(
        (step) => !TERMINAL_TOUR_STATUSES.has(statuses[step.key] || 'pending')
      );
      if (nextPending) setSelectedKey(nextPending.key);
    }
  }

  function openFeature(step) {
    if (!TERMINAL_TOUR_STATUSES.has(statusFor(progress, step.key))) {
      updateStatus(step.key, 'in_progress');
    }
    setSheetVisible(false);
    navigation.navigate(step.target.tab, { screen: step.target.screen });
  }

  async function openFeedback() {
    if (!feedbackFormUrl) {
      appAlert(
        'Feedback form not configured',
        'Add the published Google Form responder URL to EXPO_PUBLIC_PILOT_FEEDBACK_FORM_URL.'
      );
      return;
    }

    try {
      await Linking.openURL(feedbackFormUrl);
      commitProgress({
        ...(progress || blankProgress(effectiveVersion)),
        feedbackOpenedAt: new Date().toISOString(),
      });
    } catch {
      appAlert('Could not open form', 'Check the feedback link and try again.');
    }
  }

  function confirmReset() {
    appAlert('Reset pilot tour?', 'All local tour progress on this device will be cleared.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          const next = blankProgress(effectiveVersion);
          commitProgress(next);
          setSelectedKey(PILOT_TOUR_STEPS[0].key);
        },
      },
    ]);
  }

  if (configLoading || !isEligible || isLoading || !progress || keyboardVisible) return null;

  const pillTitle = allComplete ? 'Tour complete' : `Pilot Tour ${completedCount}/${PILOT_TOUR_STEPS.length}`;
  const pillSubtitle = allComplete ? 'Give feedback' : `Next: ${suggestedStep.destination}`;
  const progressPercent = Math.round((completedCount / PILOT_TOUR_STEPS.length) * 100);

  return (
    <>
      <TouchableOpacity
        style={[
          styles.pill,
          {
            bottom: 62 + insets.bottom,
            backgroundColor: c.brandDeep,
            borderColor: c.gold,
          },
        ]}
        onPress={openTour}
        activeOpacity={0.86}
        accessibilityRole="button"
        accessibilityLabel={`${pillTitle}. ${pillSubtitle}`}
      >
        <View style={[styles.pillIcon, { backgroundColor: c.gold }]}>
          <Map size={17} color={c.brandDeep} />
        </View>
        <View style={styles.pillCopy}>
          <Text style={styles.pillTitle}>{pillTitle}</Text>
          <Text style={styles.pillSubtitle} numberOfLines={1}>{pillSubtitle}</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setSheetVisible(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: c.overlay }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setSheetVisible(false)}
            activeOpacity={1}
            accessibilityLabel="Close pilot tour"
          />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: c.surface,
                borderColor: c.border,
                paddingBottom: Math.max(insets.bottom, 14),
              },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderCopy}>
                <Text style={[styles.sheetTitle, { color: c.text }]}>Reunio Pilot Tour</Text>
                <Text style={[styles.sheetSub, { color: c.textMuted }]}>
                  Try each feature, skip it, or mark it not applicable.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: c.surfaceAlt }]}
                onPress={() => setSheetVisible(false)}
                accessibilityLabel="Close"
              >
                <X size={18} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.progressHead}>
              <Text style={[styles.progressText, { color: c.text }]}>
                {completedCount} of {PILOT_TOUR_STEPS.length} reviewed
              </Text>
              <Text style={[styles.progressPercent, { color: c.primary }]}>{progressPercent}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: c.surfaceAlt }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercent}%`, backgroundColor: c.primary },
                ]}
              />
            </View>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.currentCard, { backgroundColor: c.primaryTint, borderColor: c.border }]}>
                <Text style={[styles.currentEyebrow, { color: c.primary }]}>CURRENT STOP</Text>
                <Text style={[styles.currentTitle, { color: c.text }]}>{selectedStep.title}</Text>
                <Text style={[styles.destination, { color: c.primary }]}>
                  Go to: {selectedStep.destination}
                </Text>
                <Text style={[styles.currentDescription, { color: c.textMuted }]}>
                  {selectedStep.description}
                </Text>

                <TouchableOpacity
                  style={[styles.openButton, { backgroundColor: c.primary }]}
                  onPress={() => openFeature(selectedStep)}
                  activeOpacity={0.84}
                >
                  <Play size={16} color={c.onPrimary} />
                  <Text style={[styles.openButtonText, { color: c.onPrimary }]}>
                    {TERMINAL_TOUR_STATUSES.has(selectedStatus)
                      ? 'Open feature again'
                      : 'Try this feature'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.statusActions}>
                  {[
                    ['tried', 'Tried'],
                    ['skipped', 'Skip'],
                    ['not_applicable', 'N/A'],
                  ].map(([status, label]) => {
                    const active = selectedStatus === status;
                    return (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusButton,
                          {
                            backgroundColor: active ? c.tintSuccess : c.surface,
                            borderColor: active ? c.success : c.border,
                          },
                        ]}
                        onPress={() => updateStatus(selectedStep.key, status)}
                      >
                        <Text
                          style={[
                            styles.statusButtonText,
                            { color: active ? c.success : c.text },
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <Text style={[styles.listTitle, { color: c.text }]}>Feature checklist</Text>
              {PILOT_TOUR_STEPS.map((step, index) => {
                const status = statusFor(progress, step.key);
                const selected = selectedStep.key === step.key;
                const statusColor =
                  status === 'tried'
                    ? c.success
                    : status === 'in_progress'
                      ? c.info
                      : status === 'skipped' || status === 'not_applicable'
                        ? c.warning
                        : c.textMuted;
                return (
                  <TouchableOpacity
                    key={step.key}
                    style={[
                      styles.stepRow,
                      {
                        backgroundColor: selected ? c.surfaceAlt : c.surface,
                        borderColor: selected ? c.primary : c.border,
                      },
                    ]}
                    onPress={() => setSelectedKey(step.key)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.stepNumber, { color: c.textMuted }]}>{index + 1}</Text>
                    <StatusIcon status={status} color={statusColor} />
                    <View style={styles.stepCopy}>
                      <Text style={[styles.stepTitle, { color: c.text }]}>{step.title}</Text>
                      <Text style={[styles.stepStatus, { color: statusColor }]}>
                        {STATUS_LABELS[status]}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {allComplete ? (
                <View style={[styles.feedbackCard, { backgroundColor: c.tintSuccess }]}>
                  <CheckCircle2 size={24} color={c.success} />
                  <Text style={[styles.feedbackTitle, { color: c.text }]}>Tour complete</Text>
                  <Text style={[styles.feedbackText, { color: c.textMuted }]}>
                    Pilot code: {progress.participantCode}. Use this code if the feedback form asks for it.
                  </Text>
                  <TouchableOpacity
                    style={[styles.feedbackButton, { backgroundColor: c.success }]}
                    onPress={openFeedback}
                  >
                    <ExternalLink size={16} color="#FFFFFF" />
                    <Text style={styles.feedbackButtonText}>Open feedback form</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <Text style={[styles.safetyNote, { color: c.textMuted }]}>
                The tour never submits a job application, RSVP, career proof, or post automatically.
              </Text>
              <TouchableOpacity style={styles.resetButton} onPress={confirmReset}>
                <RotateCcw size={14} color={c.danger} />
                <Text style={[styles.resetText, { color: c.danger }]}>Reset local tour progress</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    right: 12,
    zIndex: 1000,
    elevation: 18,
    maxWidth: 220,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.24,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
  },
  pillIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillCopy: { flexShrink: 1 },
  pillTitle: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' },
  pillSubtitle: { color: 'rgba(255,255,255,0.76)', fontSize: 10.5, marginTop: 1 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9AA49D',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sheetHeaderCopy: { flex: 1 },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
  sheetSub: { fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  progressText: { fontSize: 12.5, fontWeight: '700' },
  progressPercent: { fontSize: 12.5, fontWeight: '800' },
  progressTrack: { height: 7, borderRadius: 4, overflow: 'hidden', marginTop: 7 },
  progressFill: { height: '100%', borderRadius: 4 },
  sheetScroll: { marginTop: 14 },
  sheetContent: { paddingBottom: 18 },
  currentCard: { borderWidth: 1, borderRadius: 16, padding: 15 },
  currentEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  currentTitle: { fontSize: 17, fontWeight: '800', marginTop: 5 },
  destination: { fontSize: 12.5, fontWeight: '700', marginTop: 4 },
  currentDescription: { fontSize: 12.5, lineHeight: 18, marginTop: 5 },
  openButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 11,
    marginTop: 14,
  },
  openButtonText: { fontSize: 14, fontWeight: '800' },
  statusActions: { flexDirection: 'row', gap: 8, marginTop: 9 },
  statusButton: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusButtonText: { fontSize: 11.5, fontWeight: '700' },
  listTitle: { fontSize: 15, fontWeight: '800', marginTop: 20, marginBottom: 9 },
  stepRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  stepNumber: { width: 18, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  stepCopy: { flex: 1 },
  stepTitle: { fontSize: 13, fontWeight: '700' },
  stepStatus: { fontSize: 10.5, fontWeight: '700', marginTop: 2 },
  feedbackCard: { alignItems: 'center', borderRadius: 16, padding: 16, marginTop: 12 },
  feedbackTitle: { fontSize: 16, fontWeight: '800', marginTop: 7 },
  feedbackText: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 4 },
  feedbackButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    alignSelf: 'stretch',
    borderRadius: 11,
    marginTop: 12,
  },
  feedbackButtonText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' },
  safetyNote: { fontSize: 11.5, lineHeight: 17, textAlign: 'center', marginTop: 16 },
  resetButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 7,
  },
  resetText: { fontSize: 12, fontWeight: '700' },
});
