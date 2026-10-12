// src/screens/ProfileSetupWizardScreen.js
// Step-by-step profile fill: About -> Contact -> Education -> Work ->
// Skills -> Job prefs & visibility. Anything can be skipped; Finish saves
// everything that was filled in.
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import apiClient from '../api/client';
import { useTheme } from '../theme/ThemeContext';
import PrimaryButton from '../components/ui/PrimaryButton';
import { alert as appAlert } from '../components/AppAlert';

const STEPS = ['About', 'Contact', 'Education', 'Work', 'Skills', 'Finish'];

export default function ProfileSetupWizardScreen({ navigation }) {
  const { theme } = useTheme();
  const c = theme.colors;

  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false);

  // Step 0 — About
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  // Step 1 — Contact
  const [phone, setPhone] = useState('');
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [address, setAddress] = useState('');
  const [dobText, setDobText] = useState('');
  // Step 2 — Education (one entry)
  const [degree, setDegree] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [school, setSchool] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [studying, setStudying] = useState(false);
  // Step 3 — Work (one entry)
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [workStart, setWorkStart] = useState('');
  const [workEnd, setWorkEnd] = useState('');
  const [currentJob, setCurrentJob] = useState(false);
  const [workDesc, setWorkDesc] = useState('');
  // Step 4 — Skills
  const [existingSkills, setExistingSkills] = useState([]);
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState('');
  // Step 5 — Job prefs + visibility
  const [prefTitle, setPrefTitle] = useState('');
  const [prefIndustry, setPrefIndustry] = useState('');
  const [prefLocation, setPrefLocation] = useState('');
  const [openToWork, setOpenToWork] = useState(false);
  const [showInDirectory, setShowInDirectory] = useState(true);

  const [existingCounts, setExistingCounts] = useState({ education: 0, work: 0 });

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/Profile');
        const p = res.data || {};
        setHeadline(p.headline || '');
        setBio(p.bio || '');
        setLocation(p.location || '');
        setPhone(p.phone || '');
        setLinkedInUrl(p.linkedInUrl || '');
        setAddress(p.address || '');
        setDobText(p.dateOfBirth ? String(p.dateOfBirth).split('T')[0] : '');
        setShowInDirectory(p.showInDirectory ?? true);
        setExistingSkills(p.skills || []);
        setExistingCounts({
          education: (p.educations || []).length,
          work: (p.workExperiences || []).length,
        });
      } catch {
        // Prefill is a nicety — the wizard still works empty.
      }
      try {
        const res = await apiClient.get('/Profile/job-preferences');
        if (res.data && !res.data.message) {
          setPrefTitle(res.data.preferredJobTitle || '');
          setPrefIndustry(res.data.preferredIndustry || '');
          setPrefLocation(res.data.preferredLocation || '');
          setOpenToWork(!!res.data.isOpenToWork);
        }
      } catch {
        // 404 = never set — fine.
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
  }
  function back() {
    if (step > 0) setStep(step - 1);
    else navigation.goBack();
  }

  function addSkill() {
    const t = newSkill.trim();
    if (!t) return;
    if ([...existingSkills, ...skills].some((s) => s.toLowerCase() === t.toLowerCase())) {
      appAlert('Already added', `"${t}" is already in your skills list.`);
      return;
    }
    setSkills([...skills, t]);
    setNewSkill('');
  }

  function parseDateOrNull(text) {
    const t = (text || '').trim();
    if (!t) return null;
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? 'invalid' : d.toISOString();
  }

  async function handleFinish() {
    // Light validation on the final screen only.
    if (dobText.trim()) {
      const parsed = parseDateOrNull(dobText);
      if (parsed === 'invalid') {
        appAlert('Check birthday', 'Use YYYY-MM-DD, e.g. 2002-10-16 — or leave it blank.');
        return;
      }
      if (new Date(dobText) > new Date()) {
        appAlert('Check birthday', 'Birthday cannot be in the future.');
        return;
      }
    }
    setIsFinishing(true);
    try {
      // 1. Core profile (always safe to overwrite with our accumulated values).
      await apiClient.put('/Profile', {
        headline: headline.trim(),
        bio: bio.trim(),
        location: location.trim(),
        linkedInUrl: linkedInUrl.trim(),
        phone: phone.trim(),
        dateOfBirth: dobText.trim() ? new Date(dobText.trim()).toISOString() : null,
        address: address.trim(),
        showInDirectory,
      });

      // 2. Education entry (only if the required fields were filled).
      if (degree.trim() && school.trim() && startYear.trim()) {
        await apiClient.post('/Profile/education', {
          id: 0,
          degree: degree.trim(),
          fieldOfStudy: fieldOfStudy.trim(),
          school: school.trim(),
          startYear: parseInt(startYear.trim(), 10),
          endYear: studying || !endYear.trim() ? null : parseInt(endYear.trim(), 10),
        });
      }

      // 3. Work entry (only if the required fields were filled).
      if (jobTitle.trim() && company.trim() && workStart.trim()) {
        await apiClient.post('/Profile/work-experience', {
          id: 0,
          jobTitle: jobTitle.trim(),
          company: company.trim(),
          location: workLocation.trim(),
          startDate: new Date(workStart.trim()).toISOString(),
          endDate: currentJob || !workEnd.trim() ? null : new Date(workEnd.trim()).toISOString(),
          description: workDesc.trim(),
        });
      }

      // 4. Skills merge (only if new ones were added).
      if (skills.length > 0) {
        await apiClient.put('/Profile/skills', [...existingSkills, ...skills]);
      }

      // 5. Job preferences (only if anything was filled).
      if (prefTitle.trim() || prefIndustry.trim() || prefLocation.trim() || openToWork) {
        await apiClient.put('/Profile/job-preferences', {
          preferredJobTitle: prefTitle.trim(),
          preferredIndustry: prefIndustry.trim(),
          preferredLocation: prefLocation.trim(),
          isOpenToWork: openToWork,
        });
      }

      appAlert('All set', 'Your profile has been updated.', [
        { text: 'View profile', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const message = err.response?.data?.message || 'Could not save. Check dates and try again.';
      appAlert('Error', message);
    } finally {
      setIsFinishing(false);
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Progress header */}
      <View style={styles.progressWrap}>
        <Text style={[styles.stepCount, { color: c.textMuted }]}>
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </Text>
        <View style={styles.dots}>
          {STEPS.map((s, i) => (
            <View
              key={s}
              style={[
                styles.dot,
                { backgroundColor: i <= step ? c.primary : c.border },
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <View>
            <Text style={[styles.stepTitle, { color: c.text }]}>Tell us about you</Text>
            <Text style={[styles.stepSub, { color: c.textMuted }]}>
              This headline shows under your name in the directory.
            </Text>
            <Field label="Headline" c={c}>
              <TextInput style={[styles.input, inputColors(c)]} value={headline}
                onChangeText={setHeadline} placeholder="e.g. Junior Web Developer"
                placeholderTextColor={c.placeholder} />
            </Field>
            <Field label="Bio" c={c}>
              <TextInput style={[styles.input, styles.multiline, inputColors(c)]} value={bio}
                onChangeText={setBio} multiline placeholder="A few sentences about you"
                placeholderTextColor={c.placeholder} />
            </Field>
            <Field label="Location" c={c}>
              <TextInput style={[styles.input, inputColors(c)]} value={location}
                onChangeText={setLocation} placeholder="e.g. Montalban, Rizal"
                placeholderTextColor={c.placeholder} />
            </Field>
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={[styles.stepTitle, { color: c.text }]}>How can people reach you?</Text>
            <Text style={[styles.stepSub, { color: c.textMuted }]}>All optional — fill what you’re comfortable sharing.</Text>
            <Field label="Phone" c={c}>
              <TextInput style={[styles.input, inputColors(c)]} value={phone}
                onChangeText={setPhone} keyboardType="phone-pad" placeholder="09xxxxxxxxx"
                placeholderTextColor={c.placeholder} />
            </Field>
            <Field label="LinkedIn URL" c={c}>
              <TextInput style={[styles.input, inputColors(c)]} value={linkedInUrl}
                onChangeText={setLinkedInUrl} autoCapitalize="none"
                placeholder="https://linkedin.com/in/you" placeholderTextColor={c.placeholder} />
            </Field>
            <Field label="Address" c={c}>
              <TextInput style={[styles.input, styles.multiline, inputColors(c)]} value={address}
                onChangeText={setAddress} multiline placeholderTextColor={c.placeholder} />
            </Field>
            <Field label="Birthday (YYYY-MM-DD)" c={c}>
              <TextInput style={[styles.input, inputColors(c)]} value={dobText}
                onChangeText={setDobText} placeholder="2002-10-16"
                placeholderTextColor={c.placeholder} />
            </Field>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={[styles.stepTitle, { color: c.text }]}>Add education</Text>
            <Text style={[styles.stepSub, { color: c.textMuted }]}>
              {existingCounts.education > 0
                ? `You already have ${existingCounts.education} saved — add another or skip.`
                : 'Your degree goes here. You can add more later.'}
            </Text>
            <Field label="Degree *" c={c}>
              <TextInput style={[styles.input, inputColors(c)]} value={degree}
                onChangeText={setDegree} placeholder="e.g. BS Information Technology"
                placeholderTextColor={c.placeholder} />
            </Field>
            <Field label="Field of study" c={c}>
              <TextInput style={[styles.input, inputColors(c)]} value={fieldOfStudy}
                onChangeText={setFieldOfStudy} placeholder="e.g. Information Technology"
                placeholderTextColor={c.placeholder} />
            </Field>
            <Field label="School *" c={c}>
              <TextInput style={[styles.input, inputColors(c)]} value={school}
                onChangeText={setSchool} placeholderTextColor={c.placeholder} />
            </Field>
            <View style={styles.row2}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Field label="Start year *" c={c}>
                  <TextInput style={[styles.input, inputColors(c)]} value={startYear}
                    onChangeText={setStartYear} keyboardType="number-pad" placeholder="2023"
                    placeholderTextColor={c.placeholder} />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="End year" c={c}>
                  <TextInput style={[styles.input, inputColors(c)]} value={endYear}
                    onChangeText={setEndYear} keyboardType="number-pad" placeholder="2026"
                    placeholderTextColor={c.placeholder} editable={!studying} />
                </Field>
              </View>
            </View>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: c.text }]}>Still studying</Text>
              <Switch value={studying} onValueChange={setStudying} trackColor={{ true: c.primary }} />
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={[styles.stepTitle, { color: c.text }]}>Add work experience</Text>
            <Text style={[styles.stepSub, { color: c.textMuted }]}>
              {existingCounts.work > 0
                ? `You already have ${existingCounts.work} saved — add another or skip.`
                : 'Your most recent role first. More can be added later.'}
            </Text>
            <Field label="Job title *" c={c}>
              <TextInput style={[styles.input, inputColors(c)]} value={jobTitle}
                onChangeText={setJobTitle} placeholder="e.g. Junior Web Developer"
                placeholderTextColor={c.placeholder} />
            </Field>
            <Field label="Company *" c={c}>
              <TextInput style={[styles.input, inputColors(c)]} value={company}
                onChangeText={setCompany} placeholderTextColor={c.placeholder} />
            </Field>
            <Field label="Location" c={c}>
              <TextInput style={[styles.input, inputColors(c)]} value={workLocation}
                onChangeText={setWorkLocation} placeholder="e.g. Manila"
                placeholderTextColor={c.placeholder} />
            </Field>
            <View style={styles.row2}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Field label="Start (YYYY-MM-DD) *" c={c}>
                  <TextInput style={[styles.input, inputColors(c)]} value={workStart}
                    onChangeText={setWorkStart} placeholder="2026-07-01"
                    placeholderTextColor={c.placeholder} />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="End (YYYY-MM-DD)" c={c}>
                  <TextInput style={[styles.input, inputColors(c)]} value={workEnd}
                    onChangeText={setWorkEnd} placeholderTextColor={c.placeholder} editable={!currentJob} />
                </Field>
              </View>
            </View>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: c.text }]}>Current job</Text>
              <Switch value={currentJob} onValueChange={setCurrentJob} trackColor={{ true: c.primary }} />
            </View>
            <Field label="Description" c={c}>
              <TextInput style={[styles.input, styles.multiline, inputColors(c)]} value={workDesc}
                onChangeText={setWorkDesc} multiline placeholder="What did you do there?"
                placeholderTextColor={c.placeholder} />
            </Field>
          </View>
        )}

        {step === 4 && (
          <View>
            <Text style={[styles.stepTitle, { color: c.text }]}>Add your skills</Text>
            <Text style={[styles.stepSub, { color: c.textMuted }]}>
              {existingSkills.length > 0
                ? `Already have: ${existingSkills.join(', ')}`
                : 'Type a skill, tap +, repeat.'}
            </Text>
            <View style={styles.addRow}>
              <TextInput style={[styles.addInput, inputColors(c)]} value={newSkill}
                onChangeText={setNewSkill} placeholder="e.g. React"
                placeholderTextColor={c.placeholder} onSubmitEditing={addSkill} />
              <TouchableOpacity style={[styles.addButton, { backgroundColor: c.primary }]} onPress={addSkill}>
                <Text style={[styles.addButtonText, { color: c.onPrimary }]}>+</Text>
              </TouchableOpacity>
            </View>
            {skills.length > 0 && (
              <View style={styles.chipRow}>
                {skills.map((s) => (
                  <TouchableOpacity key={s} style={[styles.chip, { backgroundColor: c.surfaceAlt }]}
                    onPress={() => setSkills(skills.filter((x) => x !== s))}>
                    <Text style={[styles.chipText, { color: c.text }]}>{s} ✕</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {step === 5 && (
          <View>
            <Text style={[styles.stepTitle, { color: c.text }]}>Last step: job hunt</Text>
            <Text style={[styles.stepSub, { color: c.textMuted }]}>
              These power job matches and your directory visibility.
            </Text>
            <Field label="Preferred job title" c={c}>
              <TextInput style={[styles.input, inputColors(c)]} value={prefTitle}
                onChangeText={setPrefTitle} placeholder="e.g. Web Developer"
                placeholderTextColor={c.placeholder} />
            </Field>
            <Field label="Preferred industry" c={c}>
              <TextInput style={[styles.input, inputColors(c)]} value={prefIndustry}
                onChangeText={setPrefIndustry} placeholder="e.g. Information Technology"
                placeholderTextColor={c.placeholder} />
            </Field>
            <Field label="Preferred location" c={c}>
              <TextInput style={[styles.input, inputColors(c)]} value={prefLocation}
                onChangeText={setPrefLocation} placeholder="e.g. Manila"
                placeholderTextColor={c.placeholder} />
            </Field>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: c.text }]}>Open to work</Text>
              <Switch value={openToWork} onValueChange={setOpenToWork} trackColor={{ true: c.primary }} />
            </View>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={[styles.switchLabel, { color: c.text }]}>Show me in the alumni directory</Text>
              </View>
              <Switch value={showInDirectory} onValueChange={setShowInDirectory} trackColor={{ true: c.primary }} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer nav */}
      <View style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.background }]}>
        <TouchableOpacity style={styles.backButton} onPress={back}>
          <Text style={[styles.backText, { color: c.textMuted }]}>
            {step === 0 ? 'Cancel' : '← Back'}
          </Text>
        </TouchableOpacity>
        {step < STEPS.length - 1 ? (
          <View style={styles.nextWrap}>
            <TouchableOpacity onPress={next}>
              <Text style={[styles.skipText, { color: c.textMuted }]}>Skip →</Text>
            </TouchableOpacity>
            <PrimaryButton title="Next" onPress={next} style={styles.nextButton} />
          </View>
        ) : (
          <PrimaryButton title="Finish" onPress={handleFinish} loading={isFinishing} style={styles.nextButton} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children, c }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

function inputColors(c) {
  return { backgroundColor: c.surface, borderColor: c.border, color: c.text };
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  progressWrap: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  stepCount: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { flex: 1, height: 6, borderRadius: 3 },
  content: { padding: 20, paddingBottom: 24 },
  stepTitle: { fontSize: 22, fontWeight: '700' },
  stepSub: { fontSize: 13, marginTop: 4 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  row2: { flexDirection: 'row' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  switchLabel: { fontSize: 14, fontWeight: '600' },
  addRow: { flexDirection: 'row', marginTop: 14, gap: 8 },
  addInput: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14 },
  addButton: { width: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { fontSize: 22, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  chip: { borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, marginBottom: 8 },
  chipText: { fontSize: 13, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: 10 },
  backText: { fontSize: 14, fontWeight: '600' },
  nextWrap: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  skipText: { fontSize: 14, fontWeight: '600' },
  nextButton: { minWidth: 120 },
});
