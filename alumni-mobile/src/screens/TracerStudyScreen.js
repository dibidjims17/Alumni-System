// src/screens/TracerStudyScreen.js
// Graduate Tracer Study — the pre-screening questionnaire graduates answer
// before the app unlocks. Questions follow the school's paper form
// (Graduate_Tracer_Study_Questionnaire.docx, Sections A–E) in a step-by-
// step flow with a review screen, mirroring ProfileSetupWizardScreen.
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import PrimaryButton from '../components/ui/PrimaryButton';
import { alert as appAlert } from '../components/AppAlert';
import AppBackground from '../components/AppBackground';

// ─── BETA SWITCH ────────────────────────────────────────────────────────────
//   true  = PREVIEW ONLY. A Skip button is shown in the header and NOTHING
//           ever reaches the server — no drafts, no submit.
//   false = LIVE. Next auto-saves a draft, Submit records the response via
//           POST /api/Tracer/submit (P1 backend already tested), and the
//           Skip button disappears (school requirement: must answer).
// ────────────────────────────────────────────────────────────────────────────
const TRACER_BETA = true;

// "You are about to participate" notice shown once before Step 1. Per the
// release plan respondents won't need it once the QR/website flow explains
// the study, so it is tied to the beta flag — flipping TRACER_BETA to false
// removes it together with the rest of the beta chrome. Set this to `true`
// if you later decide to keep it after all.
const SHOW_PARTICIPATION_NOTICE = TRACER_BETA;

// Option sets — kept identical to TracerService's validation lists so the
// client and server can never disagree on what a valid answer is.
const SECTIONS = ['Profile', 'Employment', 'Job Details', 'Course Alignment', 'Feedback', 'Review'];

const EMPLOYMENT_OPTIONS = [
  'Employed (Full-time)',
  'Employed (Part-time / Contractual)',
  'Self-Employed / Freelance',
  'Unemployed (Looking for work)',
  'Unemployed (Not looking)',
  'Currently Studying',
];
const EMPLOYED_OPTIONS = new Set(EMPLOYMENT_OPTIONS.slice(0, 3));

const COMPANY_TYPES = ['Govt', 'Private', 'BPO', 'School', 'Own Business', 'Others'];
const SALARY_BANDS = ['Below 10k', '10k-15k', '15k-20k', '20k-30k', 'Above 30k'];
const MONTHS_TO_JOB = ['<1', '1-3', '4-6', '7-12', '>12'];
const JOB_SOURCES = ['Walk-in', 'Online', 'Referral', 'School Job Fair', 'OJT / Internship'];
const RELATEDNESS = ['Highly Related', 'Related', 'Somewhat Related', 'NOT Related'];
const SKILL_OPTIONS = ['Major Subjects', 'Computer / Technical', 'Communication', 'OJT Experience', 'Others'];
const YES_NO = ['Yes', 'No'];

export default function TracerStudyScreen({ navigation, onExit }) {
  const { theme } = useTheme();
  const { student } = useAuth();
  const c = theme.colors;

  const [step, setStep] = useState(0);
  const [noticeAccepted, setNoticeAccepted] = useState(!SHOW_PARTICIPATION_NOTICE);

  // Section A — Graduate Profile (prefilled from the account)
  const [fullName, setFullName] = useState(student?.fullName || '');
  const [sex, setSex] = useState('');
  const [course, setCourse] = useState(student?.program || '');
  const [yearGraduated, setYearGraduated] = useState(student?.schoolYear || '');
  const [contactNo, setContactNo] = useState('');
  const [emailOrFb, setEmailOrFb] = useState('');
  const [presentAddress, setPresentAddress] = useState('');

  // Section B — Employment Status (the branch point)
  const [employmentStatus, setEmploymentStatus] = useState('');

  // Section C — Current Employment Details (employed only)
  const [companyName, setCompanyName] = useState('');
  const [position, setPosition] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [companyTypeOther, setCompanyTypeOther] = useState('');
  const [salaryBand, setSalaryBand] = useState('');
  const [monthsToJob, setMonthsToJob] = useState('');
  const [jobSource, setJobSource] = useState('');

  // Section D — Alignment to Course
  const [courseRelatedness, setCourseRelatedness] = useState('');
  const [relatednessComment, setRelatednessComment] = useState('');
  const [skillsUsed, setSkillsUsed] = useState([]);
  const [skillsUsedOther, setSkillsUsedOther] = useState('');
  const [skillsWanted, setSkillsWanted] = useState('');

  // Section E — Feedback
  const [satisfied, setSatisfied] = useState('');
  const [satisfiedReason, setSatisfiedReason] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState('');

  const employed = EMPLOYED_OPTIONS.has(employmentStatus);

  // Exit = Skip (beta) or goBack when opened from the Profile menu.
  function exitFlow() {
    if (onExit) onExit();
    else navigation.goBack();
  }

  // Same messages as the backend so a live submit can never surprise us.
  function validateStep(index) {
    if (index === 0) {
      if (sex !== 'Male' && sex !== 'Female') return 'Step 1: please choose your sex.';
      if (!contactNo.trim()) return 'Step 1: contact number is required.';
    }
    if (index === 1) {
      if (!EMPLOYMENT_OPTIONS.includes(employmentStatus))
        return 'Step 2: please choose your employment status.';
    }
    if (index === 2 && employed) {
      if (!companyName.trim()) return 'Step 3: company name is required.';
      if (!position.trim()) return 'Step 3: position / job title is required.';
      if (!companyType) return 'Step 3: please choose the type of company.';
      if (companyType === 'Others' && !companyTypeOther.trim())
        return 'Step 3: please specify the type of company.';
      if (!salaryBand) return 'Step 3: please choose your monthly salary range.';
      if (!monthsToJob) return 'Step 3: please choose how many months after graduation you got this job.';
      if (!jobSource) return 'Step 3: please choose how you got the job.';
    }
    if (index === 3 && employed) {
      if (!RELATEDNESS.includes(courseRelatedness))
        return 'Step 4: please rate how related your job is to your course.';
      if (!relatednessComment.trim())
        return 'Step 4: please explain how your job uses what you learned in your course.';
      if (skillsUsed.length === 0)
        return 'Step 4: please pick the skills you use most at work.';
      if (skillsUsed.includes('Others') && !skillsUsedOther.trim())
        return 'Step 4: please specify which other skills you use.';
    }
    if (index === 4) {
      if (!YES_NO.includes(satisfied))
        return 'Step 5: please say whether you are satisfied with your training.';
      if (satisfied === 'No' && !satisfiedReason.trim())
        return 'Step 5: please tell us why you are not satisfied.';
      if (!YES_NO.includes(wouldRecommend))
        return 'Step 5: please say whether you would recommend your course.';
    }
    return null;
  }

  function next() {
    // Beta preview: validation is relaxed so every step can be explored
    // without filling required fields. Live mode validates strictly.
    if (!TRACER_BETA) {
      const error = validateStep(step);
      if (error) {
        appAlert('Almost there', error);
        return;
      }
    }
    // Section B branch: unemployed / studying skips Job Details entirely.
    if (step === 1 && !employed) {
      setStep(3);
      return;
    }
    if (step < SECTIONS.length - 1) setStep(step + 1);
  }

  function back() {
    if (step === 0) {
      exitFlow();
      return;
    }
    // Step back over the skipped section too.
    if (step === 3 && !employed) {
      setStep(1);
      return;
    }
    setStep(step - 1);
  }

  function jumpTo(index) {
    setStep(index);
  }

  function toggleSkill(skill) {
    setSkillsUsed((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  // Client payload identical to TracerAnswersDto (used by the live path).
  function buildPayload() {
    return {
      currentStep: step + 1,
      sex: sex || null,
      contactNo: contactNo.trim() || null,
      emailOrFb: emailOrFb.trim() || null,
      presentAddress: presentAddress.trim() || null,
      employmentStatus: employmentStatus || null,
      companyName: employed ? companyName.trim() || null : null,
      position: employed ? position.trim() || null : null,
      companyType: employed ? companyType || null : null,
      companyTypeOther: employed ? companyTypeOther.trim() || null : null,
      salaryBand: employed ? salaryBand || null : null,
      monthsToJob: employed ? monthsToJob || null : null,
      jobSource: employed ? jobSource || null : null,
      courseRelatedness: courseRelatedness || null,
      courseRelatednessComment: relatednessComment.trim() || null,
      skillsUsed: skillsUsed.length ? skillsUsed.join(', ') : null,
      skillsUsedOther: skillsUsedOther.trim() || null,
      skillsWanted: skillsWanted.trim() || null,
      satisfied: satisfied || null,
      satisfiedReason: satisfiedReason.trim() || null,
      wouldRecommend: wouldRecommend || null,
    };
  }

  async function submit() {
    // Beta preview: also skip final validation (nothing is recorded anyway).
    if (!TRACER_BETA) {
      const error = validateStep(0) || validateStep(1) || validateStep(3) || validateStep(4);
      if (error) {
        appAlert('Almost there', error);
        return;
      }
    }

    if (TRACER_BETA) {
      // Beta preview: nothing is recorded anywhere.
      appAlert(
        'Beta preview',
        'Looks great! In beta mode nothing is recorded — the live version will submit these answers.',
        [{ text: 'OK', onPress: exitFlow }]
      );
      return;
    }

    // LIVE PATH (TRACER_BETA = false) — wire to the P1 backend.
    try {
      const apiClient = (await import('../api/client')).default;
      await apiClient.post('/Tracer/submit', buildPayload());
      appAlert('Thank you!', 'Your Tracer Study has been submitted. Your Alma Mater appreciates your answers.', [
        { text: 'Continue', onPress: exitFlow },
      ]);
    } catch (err) {
      const message = err.response?.data?.message || 'Could not submit. Please try again.';
      appAlert('Error', message);
    }
  }

  // ── Participation notice (beta) ─────────────────────────────────────
  // Warns respondents that they are joining the Graduate Tracer Study
  // before any question is shown. Renders instead of the wizard until
  // "I Understand — Begin" is tapped; hidden once TRACER_BETA is false.
  if (!noticeAccepted) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <AppBackground />
        <ScrollView contentContainerStyle={styles.noticeContent}>
          <View style={[styles.noticeCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.noticeBadge, { color: c.warning || c.primary }]}>
              ⚠ PARTICIPATION NOTICE
            </Text>
            <Text style={[styles.noticeTitle, { color: c.text }]}>
              You are about to participate in the Graduate Tracer Study
            </Text>
            <Text style={[styles.noticeBody, { color: c.textMuted }]}>
              Please read the following before you start:
            </Text>
            {[
              'Takes about 2 minutes — 6 short sections based on the official school questionnaire.',
              'Your answers are confidential and used for school improvement only.',
              'You can review and edit everything on the last step before submitting.',
              'Completing the study is required of every graduate before the app unlocks.',
            ].map((line) => (
              <View key={line} style={styles.noticeBullet}>
                <Text style={[styles.noticeBulletDot, { color: c.primary }]}>•</Text>
                <Text style={[styles.noticeBulletText, { color: c.text }]}>{line}</Text>
              </View>
            ))}
            {TRACER_BETA && (
              <Text style={[styles.betaNote, { color: c.warning || c.textMuted, marginTop: 14 }]}>
                BETA PREVIEW — nothing you enter is saved
              </Text>
            )}
          </View>
        </ScrollView>
        <View style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.background }]}>
          {TRACER_BETA ? (
            <TouchableOpacity style={styles.backButton} onPress={exitFlow}>
              <Text style={[styles.backText, { color: c.textMuted }]}>Skip for now</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}
          <PrimaryButton
            title="I Understand — Begin"
            onPress={() => setNoticeAccepted(true)}
            style={styles.nextButton}
          />
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'transparent' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppBackground />

      {/* Progress header — Step N of 6, section dots, beta Skip */}
      <View style={styles.progressWrap}>
        <View style={styles.progressTop}>
          <Text style={[styles.stepCount, { color: c.textMuted }]}>
            Step {step + 1} of {SECTIONS.length} · {SECTIONS[step]}
          </Text>
          {TRACER_BETA && (
            <TouchableOpacity onPress={exitFlow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.skipButtonText, { color: c.primary }]}>Skip →</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.dots}>
          {SECTIONS.map((s, i) => {
            const skipped = i === 2 && !employed && step !== 2;
            return (
              <View
                key={s}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i <= step && !skipped ? c.primary : c.surface,
                    borderColor: skipped ? c.border : i <= step ? c.primary : c.border,
                    borderStyle: skipped ? 'dashed' : 'solid',
                  },
                ]}
              />
            );
          })}
        </View>
        {TRACER_BETA && (
          <Text style={[styles.betaNote, { color: c.warning || c.textMuted }]}>
            BETA PREVIEW — answers are not saved
          </Text>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* ── Step 1 · Section A ─────────────────────────── */}
        {step === 0 && (
          <View>
            <Text style={[styles.stepTitle, { color: c.text }]}>Graduate Profile</Text>
            <Text style={[styles.stepSub, { color: c.textMuted }]}>
              Please answer honestly. All information will be kept confidential and used for
              school improvement only.
            </Text>
            <Field label="Full Name" c={c} hint="from your account">
              <TextInput
                style={[styles.input, inputColors(c)]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Full name"
                placeholderTextColor={c.placeholder}
              />
            </Field>
            <Text style={[styles.label, { color: c.textMuted, marginTop: 16 }]}>Sex *</Text>
            <View style={styles.radioRowWrap}>
              {['Male', 'Female'].map((opt) => (
                <Radio
                  key={opt}
                  label={opt}
                  selected={sex === opt}
                  onPress={() => setSex(opt)}
                  c={c}
                />
              ))}
            </View>
            <Field label="Course Graduated" c={c} hint="from your account">
              <TextInput
                style={[styles.input, inputColors(c)]}
                value={course}
                onChangeText={setCourse}
                placeholder="e.g. BS Information Technology"
                placeholderTextColor={c.placeholder}
              />
            </Field>
            <Field label="Year Graduated" c={c} hint="from your account">
              <TextInput
                style={[styles.input, inputColors(c)]}
                value={yearGraduated}
                onChangeText={setYearGraduated}
                placeholder="e.g. 2026"
                placeholderTextColor={c.placeholder}
              />
            </Field>
            <Field label="Contact No. *" c={c}>
              <TextInput
                style={[styles.input, inputColors(c)]}
                value={contactNo}
                onChangeText={setContactNo}
                keyboardType="phone-pad"
                placeholder="09xxxxxxxxx"
                placeholderTextColor={c.placeholder}
              />
            </Field>
            <Field label="Email / FB" c={c}>
              <TextInput
                style={[styles.input, inputColors(c)]}
                value={emailOrFb}
                onChangeText={setEmailOrFb}
                autoCapitalize="none"
                placeholder="email or Facebook profile"
                placeholderTextColor={c.placeholder}
              />
            </Field>
            <Field label="Present Address" c={c}>
              <TextInput
                style={[styles.input, styles.multiline, inputColors(c)]}
                value={presentAddress}
                onChangeText={setPresentAddress}
                multiline
                placeholder="House no., street, city, province"
                placeholderTextColor={c.placeholder}
              />
            </Field>
          </View>
        )}

        {/* ── Step 2 · Section B ─────────────────────────── */}
        {step === 1 && (
          <View>
            <Text style={[styles.stepTitle, { color: c.text }]}>Employment Status</Text>
            <Text style={[styles.stepSub, { color: c.textMuted }]}>
              Check one — this decides which sections follow.
            </Text>
            <View style={{ marginTop: 12 }}>
              {EMPLOYMENT_OPTIONS.map((opt) => (
                <Radio
                  key={opt}
                  label={opt}
                  selected={employmentStatus === opt}
                  onPress={() => setEmploymentStatus(opt)}
                  c={c}
                  big
                />
              ))}
            </View>
            <Text style={[styles.branchHint, { color: c.textMuted }]}>
              {employmentStatus
                ? employed
                  ? 'Employed → next you will describe your current job.'
                  : 'Not employed → you will skip straight to Course Alignment.'
                : ''}
            </Text>
          </View>
        )}

        {/* ── Step 3 · Section C (conditional) ───────────── */}
        {step === 2 && (
          <View>
            <Text style={[styles.stepTitle, { color: c.text }]}>Current Employment Details</Text>
            <Text style={[styles.stepSub, { color: c.textMuted }]}>
              About the job you have now.
            </Text>
            <Field label="Company Name *" c={c}>
              <TextInput
                style={[styles.input, inputColors(c)]}
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="e.g. ACME Corporation"
                placeholderTextColor={c.placeholder}
              />
            </Field>
            <Field label="Position / Job Title *" c={c}>
              <TextInput
                style={[styles.input, inputColors(c)]}
                value={position}
                onChangeText={setPosition}
                placeholder="e.g. Junior Web Developer"
                placeholderTextColor={c.placeholder}
              />
            </Field>
            <Text style={[styles.label, { color: c.textMuted, marginTop: 16 }]}>Type of Company *</Text>
            <View style={styles.radioRowWrap}>
              {COMPANY_TYPES.map((opt) => (
                <Radio
                  key={opt}
                  label={opt}
                  selected={companyType === opt}
                  onPress={() => setCompanyType(opt)}
                  c={c}
                />
              ))}
            </View>
            {companyType === 'Others' && (
              <Field label="Please specify *" c={c}>
                <TextInput
                  style={[styles.input, inputColors(c)]}
                  value={companyTypeOther}
                  onChangeText={setCompanyTypeOther}
                  placeholder="Company type"
                  placeholderTextColor={c.placeholder}
                />
              </Field>
            )}
            <Text style={[styles.label, { color: c.textMuted, marginTop: 16 }]}>Monthly Salary *</Text>
            <View style={styles.radioRowWrap}>
              {SALARY_BANDS.map((opt) => (
                <Radio
                  key={opt}
                  label={opt}
                  selected={salaryBand === opt}
                  onPress={() => setSalaryBand(opt)}
                  c={c}
                />
              ))}
            </View>
            <Text style={[styles.label, { color: c.textMuted, marginTop: 16 }]}>
              Months after graduation until this job *
            </Text>
            <View style={styles.radioRowWrap}>
              {MONTHS_TO_JOB.map((opt) => (
                <Radio
                  key={opt}
                  label={opt}
                  selected={monthsToJob === opt}
                  onPress={() => setMonthsToJob(opt)}
                  c={c}
                />
              ))}
            </View>
            <Text style={[styles.label, { color: c.textMuted, marginTop: 16 }]}>
              How did you get the job? *
            </Text>
            <View style={styles.radioRowWrap}>
              {JOB_SOURCES.map((opt) => (
                <Radio
                  key={opt}
                  label={opt}
                  selected={jobSource === opt}
                  onPress={() => setJobSource(opt)}
                  c={c}
                  big
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Step 4 · Section D ─────────────────────────── */}
        {step === 3 && (
          <View>
            <Text style={[styles.stepTitle, { color: c.text }]}>Alignment to Course</Text>
            <Text style={[styles.stepSub, { color: c.textMuted }]}>
              The section your Alma Mater cares about most.
            </Text>
            <Text style={[styles.label, { color: c.textMuted, marginTop: 16 }]}>
              Is your current job RELATED to your course?
              {employed ? ' *' : ' (optional — no current job)'}
            </Text>
            <View style={styles.radioRowWrap}>
              {RELATEDNESS.map((opt) => (
                <Radio
                  key={opt}
                  label={opt}
                  selected={courseRelatedness === opt}
                  onPress={() => setCourseRelatedness(opt)}
                  c={c}
                  big
                />
              ))}
            </View>
            <Field
              label={
                employed
                  ? 'Explain: how does your job use what you learned? *'
                  : 'Explain: how does your job use what you learned?'
              }
              c={c}
            >
              <TextInput
                style={[styles.input, styles.multiline, inputColors(c)]}
                value={relatednessComment}
                onChangeText={setRelatednessComment}
                multiline
                placeholder="A few sentences"
                placeholderTextColor={c.placeholder}
              />
            </Field>
            <Text style={[styles.label, { color: c.textMuted, marginTop: 16 }]}>
              Which skills/subjects do you use MOST at work?{employed ? ' *' : ''}
            </Text>
            <View style={styles.chipRow}>
              {SKILL_OPTIONS.map((opt) => {
                const on = skillsUsed.includes(opt);
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.chip,
                      { backgroundColor: on ? c.primary : c.surfaceAlt, borderColor: on ? c.primary : c.border },
                    ]}
                    onPress={() => toggleSkill(opt)}
                  >
                    <Text style={[styles.chipText, { color: on ? c.onPrimary : c.text }]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {skillsUsed.includes('Others') && (
              <Field label="Please specify *" c={c}>
                <TextInput
                  style={[styles.input, inputColors(c)]}
                  value={skillsUsedOther}
                  onChangeText={setSkillsUsedOther}
                  placeholder="Other skills"
                  placeholderTextColor={c.placeholder}
                />
              </Field>
            )}
            <Field label="What skills do you wish the school taught you MORE?" c={c}>
              <TextInput
                style={[styles.input, styles.multiline, inputColors(c)]}
                value={skillsWanted}
                onChangeText={setSkillsWanted}
                multiline
                placeholder="e.g. more hands-on projects, cloud deployment"
                placeholderTextColor={c.placeholder}
              />
            </Field>
          </View>
        )}

        {/* ── Step 5 · Section E ─────────────────────────── */}
        {step === 4 && (
          <View>
            <Text style={[styles.stepTitle, { color: c.text }]}>Feedback</Text>
            <Text style={[styles.stepSub, { color: c.textMuted }]}>
              Last questions — then you can review everything.
            </Text>
            <Text style={[styles.label, { color: c.textMuted, marginTop: 16 }]}>
              Are you satisfied with the training you received? *
            </Text>
            <View style={styles.radioRowWrap}>
              {YES_NO.map((opt) => (
                <Radio
                  key={opt}
                  label={opt}
                  selected={satisfied === opt}
                  onPress={() => setSatisfied(opt)}
                  c={c}
                  big
                />
              ))}
            </View>
            <Field label={satisfied === 'No' ? 'Why? *' : 'Why? (optional)'} c={c}>
              <TextInput
                style={[styles.input, styles.multiline, inputColors(c)]}
                value={satisfiedReason}
                onChangeText={setSatisfiedReason}
                multiline
                placeholder="What worked, what could be better"
                placeholderTextColor={c.placeholder}
              />
            </Field>
            <Text style={[styles.label, { color: c.textMuted, marginTop: 16 }]}>
              Would you recommend your course to others? *
            </Text>
            <View style={styles.radioRowWrap}>
              {YES_NO.map((opt) => (
                <Radio
                  key={opt}
                  label={opt}
                  selected={wouldRecommend === opt}
                  onPress={() => setWouldRecommend(opt)}
                  c={c}
                  big
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Step 6 · Review & Submit ───────────────────── */}
        {step === 5 && (
          <View>
            <Text style={[styles.stepTitle, { color: c.text }]}>Review your answers</Text>
            <Text style={[styles.stepSub, { color: c.textMuted }]}>
              Check everything before submitting — tap Edit to change a section.
            </Text>

            <Summary
              title="A · Graduate Profile"
              editTo={0}
              onEdit={jumpTo}
              rows={[
                ['Full Name', fullName],
                ['Sex', sex],
                ['Course Graduated', course],
                ['Year Graduated', yearGraduated],
                ['Contact No.', contactNo],
                ['Email / FB', emailOrFb],
                ['Present Address', presentAddress],
              ]}
              c={c}
            />
            <Summary
              title="B · Employment Status"
              editTo={1}
              onEdit={jumpTo}
              rows={[['Status', employmentStatus]]}
              c={c}
            />
            <Summary
              title="C · Current Employment Details"
              editTo={employed ? 2 : 1}
              onEdit={jumpTo}
              skipped={!employed}
              rows={[
                ['Company', companyName],
                ['Position', position],
                ['Type of Company', companyType === 'Others' ? `Others — ${companyTypeOther}` : companyType],
                ['Monthly Salary', salaryBand],
                ['Months to job', monthsToJob],
                ['How you got the job', jobSource],
              ]}
              c={c}
            />
            <Summary
              title="D · Alignment to Course"
              editTo={3}
              onEdit={jumpTo}
              rows={[
                ['Job related to course', courseRelatedness || (employed ? '' : '— (not employed)')],
                ['Explanation', relatednessComment],
                ['Skills used most', skillsUsed.join(', ') + (skillsUsedOther ? ` — ${skillsUsedOther}` : '')],
                ['Skills you wanted more of', skillsWanted],
              ]}
              c={c}
            />
            <Summary
              title="E · Feedback"
              editTo={4}
              onEdit={jumpTo}
              rows={[
                ['Satisfied with training', satisfied],
                ['Why', satisfiedReason],
                ['Would recommend course', wouldRecommend],
              ]}
              c={c}
            />
          </View>
        )}
      </ScrollView>

      {/* Footer nav — mirrors the profile wizard */}
      <View style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.background }]}>
        <TouchableOpacity style={styles.backButton} onPress={back}>
          <Text style={[styles.backText, { color: c.textMuted }]}>
            {step === 0 ? 'Cancel' : '← Back'}
          </Text>
        </TouchableOpacity>
        {step < SECTIONS.length - 1 ? (
          <PrimaryButton title="Next" onPress={next} style={styles.nextButton} />
        ) : (
          <PrimaryButton title={TRACER_BETA ? 'Submit (preview)' : 'Submit'} onPress={submit} style={styles.nextButton} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Small building blocks ──────────────────────────────────────────────────

function Field({ label, children, c, hint }) {
  return (
    <View style={{ marginTop: 14 }}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text>
        {hint ? <Text style={[styles.labelHint, { color: c.textMuted }]}>· {hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Radio({ label, selected, onPress, c, big }) {
  return (
    <TouchableOpacity
      style={[
        styles.radioRow,
        {
          borderColor: selected ? c.primary : c.border,
          backgroundColor: selected ? (c.surfaceAlt || c.surface) : c.surface,
        },
        big && styles.radioRowBig,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.radioDot,
          { borderColor: selected ? c.primary : c.textMuted },
        ]}
      >
        {selected ? <View style={[styles.radioInner, { backgroundColor: c.primary }]} /> : null}
      </View>
      <Text style={[styles.radioLabel, { color: c.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Summary({ title, rows, editTo, onEdit, c, skipped }) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={styles.summaryHead}>
        <Text style={[styles.summaryTitle, { color: c.text }]}>{title}</Text>
        <TouchableOpacity onPress={() => onEdit(editTo)}>
          <Text style={[styles.editText, { color: c.primary }]}>Edit</Text>
        </TouchableOpacity>
      </View>
      {skipped ? (
        <Text style={[styles.skippedText, { color: c.textMuted }]}>
          Skipped — not employed
        </Text>
      ) : (
        rows.map(([label, value]) =>
          String(value || '').trim() ? (
            <View key={label} style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: c.textMuted }]}>{label}</Text>
              <Text style={[styles.summaryValue, { color: c.text }]}>{String(value)}</Text>
            </View>
          ) : null
        )
      )}
    </View>
  );
}

function inputColors(c) {
  return { backgroundColor: c.surface, borderColor: c.border, color: c.text };
}

const styles = StyleSheet.create({
  progressWrap: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepCount: { fontSize: 12, fontWeight: '600' },
  skipButtonText: { fontSize: 13, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 6, marginTop: 8 },
  dot: { flex: 1, height: 6, borderRadius: 3, borderWidth: 1 },
  betaNote: { fontSize: 10, fontWeight: '700', marginTop: 8, letterSpacing: 0.4 },
  content: { padding: 20, paddingBottom: 24 },
  noticeContent: { padding: 20, paddingBottom: 24, flexGrow: 1, justifyContent: 'center' },
  noticeCard: { borderRadius: 16, borderWidth: 1, padding: 20 },
  noticeBadge: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
  noticeTitle: { fontSize: 20, fontWeight: '700', marginTop: 8, lineHeight: 27 },
  noticeBody: { fontSize: 13, marginTop: 8, lineHeight: 19 },
  noticeBullet: { flexDirection: 'row', marginTop: 12 },
  noticeBulletDot: { fontSize: 16, lineHeight: 20, marginRight: 8, fontWeight: '700' },
  noticeBulletText: { flex: 1, fontSize: 13, lineHeight: 20 },
  stepTitle: { fontSize: 22, fontWeight: '700' },
  stepSub: { fontSize: 13, marginTop: 4, lineHeight: 19 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  label: { fontSize: 12, fontWeight: '600' },
  labelHint: { fontSize: 11, marginLeft: 6, fontStyle: 'italic' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  radioRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 0,
  },
  radioRowBig: { width: '100%', borderRadius: 12, paddingVertical: 12 },
  radioDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: { width: 8, height: 8, borderRadius: 4 },
  radioLabel: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  branchHint: { fontSize: 12, marginTop: 14, fontStyle: 'italic' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 14,
  },
  summaryHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryTitle: { fontSize: 14, fontWeight: '700' },
  editText: { fontSize: 13, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', marginTop: 8 },
  summaryLabel: { width: 130, fontSize: 12, fontWeight: '600' },
  summaryValue: { flex: 1, fontSize: 13 },
  skippedText: { fontSize: 13, marginTop: 8, fontStyle: 'italic' },
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
  nextButton: { minWidth: 140 },
});
