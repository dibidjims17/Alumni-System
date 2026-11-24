// src/screens/TracerStudyScreen.js
// Graduate Tracer Study — the pre-screening questionnaire graduates answer
// before the app unlocks. Questions follow the school's paper form
// (Graduate_Tracer_Study_Questionnaire.docx, Sections A–E) in a step-by-
// step flow with a review screen, mirroring ProfileSetupWizardScreen.
import React, { useState, useEffect, useRef } from 'react';
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
import apiClient from '../api/client';
import AutocompleteInput from '../components/AutocompleteInput';
import PrimaryButton from '../components/ui/PrimaryButton';
import { alert as appAlert } from '../components/AppAlert';
import AppBackground from '../components/AppBackground';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
const SECTIONS = [
  { code: 'A', title: 'Graduate Profile', range: 'Questions 1-4' },
  { code: 'B', title: 'Employment Status', range: 'Employment branch' },
  { code: 'C', title: 'Employment Details', range: 'Questions 5-9' },
  { code: 'D', title: 'Alignment to Course', range: 'Questions 10-13' },
  { code: 'E', title: 'Feedback', range: 'Questions 14-15' },
  { code: null, title: 'Review Answers', range: 'Final step' },
];

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
const SALARY_LABELS = {
  'Below 10k': 'Below PHP 10,000',
  '10k-15k': 'PHP 10,000-15,000',
  '15k-20k': 'PHP 15,000-20,000',
  '20k-30k': 'PHP 20,000-30,000',
  'Above 30k': 'Above PHP 30,000',
};
const MONTHS_TO_JOB_LABELS = {
  '<1': 'Less than 1 month',
  '1-3': '1-3 months',
  '4-6': '4-6 months',
  '7-12': '7-12 months',
  '>12': 'More than 12 months',
};
const JOB_SOURCE_LABELS = {
  'Walk-in': 'Walk-in application',
  Online: 'Online application',
  Referral: 'Referral',
  'School Job Fair': 'School job fair',
  'OJT / Internship': 'OJT / internship',
};
const RELATEDNESS_LABELS = {
  'Highly Related': 'Highly related',
  Related: 'Related',
  'Somewhat Related': 'Somewhat related',
  'NOT Related': 'Not related',
};
const CURRENT_YEAR = new Date().getFullYear();

export default function TracerStudyScreen({ navigation, onExit }) {
  const { theme } = useTheme();
  const { student } = useAuth();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);

  const [step, setStep] = useState(0);
  const [noticeAccepted, setNoticeAccepted] = useState(!SHOW_PARTICIPATION_NOTICE);
  const [showAll, setShowAll] = useState(false);
  const [stepError, setStepError] = useState('');

  // Section A — Graduate Profile (prefilled from the account)
  const fullName = student?.fullName || '';
  const [sex, setSex] = useState('');
  const [course, setCourse] = useState(student?.program || '');
  const [yearGraduated, setYearGraduated] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [emailOrFb, setEmailOrFb] = useState(student?.email || '');
  // Legacy field retained only so editing an older response does not erase
  // it. The official paper form asks one optional Present Address question.
  const [permanentAddress, setPermanentAddress] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');

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

  // Section D — Alignment to Program
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
  // Job Details is only truly skipped once a status has been chosen —
  // before that the section is undecided, not skipped.
  const jobDetailsSkipped = employmentStatus !== '' && !employed;
  // "View all" in beta still previews the employed branch before a status is
  // chosen; once a non-employed answer is selected, show the honest skip state.
  const showJobQuestions = employed || (showAll && employmentStatus === '');

  // Edit-after-submit (§8 Q2): when a submitted response is re-opened,
  // prefill every field from GET /Tracer/me and flip the flow into
  // "editing" mode (banner, review copy, Update answers button).
  const [editing, setEditing] = useState(false);

  // Live mode only — beta preview stays local and never fetches. Reads
  // whatever the graduate saved (draft or submitted) so nothing is lost
  // when they come back; a failed/absent load just starts blank.
  useEffect(() => {
    if (TRACER_BETA) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get('/Tracer/me');
        const d = res.data;
        if (cancelled || !d) return; // 200-null = never answered
        if (d.sex) setSex(d.sex);
        if (d.program) setCourse(d.program);
        if (d.yearGraduated != null) setYearGraduated(String(d.yearGraduated));
        if (d.contactNo) setContactNo(d.contactNo);
        if (d.emailOrFb) setEmailOrFb(d.emailOrFb);
        if (d.permanentAddress) setPermanentAddress(d.permanentAddress);
        if (d.presentAddress) setCurrentLocation(d.presentAddress);
        else if (d.permanentAddress) setCurrentLocation(d.permanentAddress);
        if (d.employmentStatus) setEmploymentStatus(d.employmentStatus);
        if (d.companyName) setCompanyName(d.companyName);
        if (d.position) setPosition(d.position);
        if (d.companyType) setCompanyType(d.companyType);
        if (d.companyTypeOther) setCompanyTypeOther(d.companyTypeOther);
        if (d.salaryBand) setSalaryBand(d.salaryBand);
        if (d.monthsToJob) setMonthsToJob(d.monthsToJob);
        if (d.jobSource) setJobSource(d.jobSource);
        if (d.courseRelatedness) setCourseRelatedness(d.courseRelatedness);
        if (d.courseRelatednessComment) setRelatednessComment(d.courseRelatednessComment);
        if (d.skillsUsed) {
          setSkillsUsed(
            d.skillsUsed.split(',').map((s) => s.trim()).filter(Boolean)
          );
        }
        if (d.skillsUsedOther) setSkillsUsedOther(d.skillsUsedOther);
        if (d.skillsWanted) setSkillsWanted(d.skillsWanted);
        if (d.satisfied) setSatisfied(d.satisfied);
        if (d.satisfiedReason) setSatisfiedReason(d.satisfiedReason);
        if (d.wouldRecommend) setWouldRecommend(d.wouldRecommend);
        setEditing(!!d.completed);
        if (!d.completed && d.currentStep >= 1 && d.currentStep <= 5) {
          setStep(d.currentStep - 1);
        }
      } catch (e) {
        // No saved answers (or offline) — start blank, same as before.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Exit = Skip (beta) or goBack when opened from the Profile menu.
  function exitFlow() {
    if (onExit) onExit();
    else navigation.goBack();
  }

  // Same messages as the backend so a live submit can never surprise us.
  function validateStep(index) {
    if (index === 0) {
      if (sex !== 'Male' && sex !== 'Female') return 'Step 1: please choose your sex.';
      if (!course.trim()) return 'Step 1: program graduated is required.';
      const graduationYear = Number(yearGraduated);
      if (!/^\d{4}$/.test(yearGraduated) || graduationYear < 1900 || graduationYear > CURRENT_YEAR)
        return `Step 1: enter a valid graduation year from 1900 to ${CURRENT_YEAR}.`;
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
        return 'Step 4: please rate how related your job is to your program.';
      if (!relatednessComment.trim())
        return 'Step 4: please explain how your job uses what you learned in your program.';
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
        return 'Step 5: please say whether you would recommend your program.';
    }
    return null;
  }

  function next() {
    // Beta preview: validation is relaxed so every step can be explored
    // without filling required fields. Live mode validates strictly.
    if (!TRACER_BETA) {
      const error = validateStep(step);
      if (error) {
        showValidationError(error);
        return;
      }
    }
    setStepError('');
    // Section B branch: unemployed / studying skips Job Details entirely.
    if (step === 1 && !employed) {
      saveDraft(3);
      setStep(3);
      return;
    }
    if (step < SECTIONS.length - 1) {
      saveDraft(step + 1);
      setStep(step + 1);
    }
  }

  function nextButtonTitle() {
    if (step === 0) return 'Continue to Employment';
    if (step === 1 && !employmentStatus) return 'Continue';
    if (step === 1) return employed ? 'Continue to Job Details' : 'Continue to Alignment';
    if (step === 2) return 'Continue to Alignment';
    if (step === 3) return 'Continue to Feedback';
    return 'Review answers';
  }

  // Fire-and-forget draft save as the respondent moves between steps
  // (live mode only). Editing a submitted row keeps Status=Submitted —
  // SaveDraft never demotes it — so the gate stays open mid-edit and
  // SubmittedAt only bumps on the final update.
  function saveDraft(targetStep) {
    if (TRACER_BETA) return;
    apiClient
      .put('/Tracer/draft', buildPayload(targetStep))
      .catch(() => {
        // Best-effort: the final submit re-sends the full payload anyway.
      });
  }

  function back() {
    setStepError('');
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
    setShowAll(false);
    setStepError('');
    setStep(index);
  }

  function toggleSkill(skill) {
    setSkillsUsed((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  async function fetchSuggestions(term, type) {
    const res = await apiClient.get(
      `/Suggestions?term=${encodeURIComponent(term)}&type=${encodeURIComponent(type)}`
    );
    return res.data || [];
  }

  function cleanStepError(message) {
    return String(message || '').replace(/^Step \d+:\s*/i, '');
  }

  function showValidationError(message, targetStep = step) {
    setShowAll(false);
    setStep(targetStep);
    setStepError(cleanStepError(message));
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  }

  // Client payload identical to TracerAnswersDto (used by the live path).
  // atStep overrides which step the payload claims (draft saves record the
  // step being entered so an interrupted respondent resumes there).
  function buildPayload(atStep = step) {
    return {
      currentStep: atStep + 1,
      program: course.trim() || null,
      yearGraduated: /^\d{4}$/.test(yearGraduated) ? Number(yearGraduated) : null,
      sex: sex || null,
      contactNo: contactNo.trim() || null,
      emailOrFb: emailOrFb.trim() || null,
      permanentAddress: permanentAddress.trim() || null,
      presentAddress: currentLocation.trim() || null,
      employmentStatus: employmentStatus || null,
      companyName: employed ? companyName.trim() || null : null,
      position: employed ? position.trim() || null : null,
      companyType: employed ? companyType || null : null,
      companyTypeOther:
        employed && companyType === 'Others' ? companyTypeOther.trim() || null : null,
      salaryBand: employed ? salaryBand || null : null,
      monthsToJob: employed ? monthsToJob || null : null,
      jobSource: employed ? jobSource || null : null,
      courseRelatedness: employed ? courseRelatedness || null : null,
      courseRelatednessComment: employed ? relatednessComment.trim() || null : null,
      skillsUsed: employed && skillsUsed.length ? skillsUsed.join(', ') : null,
      skillsUsedOther:
        employed && skillsUsed.includes('Others') ? skillsUsedOther.trim() || null : null,
      skillsWanted: skillsWanted.trim() || null,
      satisfied: satisfied || null,
      satisfiedReason: satisfiedReason.trim() || null,
      wouldRecommend: wouldRecommend || null,
    };
  }

  async function submit() {
    // Beta preview: also skip final validation (nothing is recorded anyway).
    if (!TRACER_BETA) {
      const stepsToValidate = employed ? [0, 1, 2, 3, 4] : [0, 1, 3, 4];
      for (const targetStep of stepsToValidate) {
        const error = validateStep(targetStep);
        if (error) {
          showValidationError(error, targetStep);
          return;
        }
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
      const res = await apiClient.post('/Tracer/submit', buildPayload());
      const updated = editing || res.data?.message === 'Your answers have been updated.';
      appAlert(
        'Thank you!',
        updated
          ? 'Your answers have been updated. Your Alma Mater appreciates your responses.'
          : 'Your Tracer Study has been submitted. Your Alma Mater appreciates your answers.',
        [{ text: 'Continue', onPress: exitFlow }]
      );
    } catch (err) {
      const message = err.response?.data?.message || 'Could not submit. Please try again.';
      const stepMatch = /^Step ([1-5]):/i.exec(message);
      if (stepMatch) {
        showValidationError(message, Number(stepMatch[1]) - 1);
        return;
      }
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
        {/* Green brand band — keeps the status bar on-theme (portal hero). */}
        <View style={[styles.noticeTop, { backgroundColor: c.brandDeep, paddingTop: insets.top + 10 }]}>
          <Text style={styles.noticeTopText}>GRADUATE TRACER STUDY</Text>
        </View>
        <View style={[styles.noticeTopAccent, { backgroundColor: c.gold }]} />
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
              'Usually takes 2-3 minutes: 5 questionnaire sections plus a final review.',
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
        <View
          style={[
            styles.footer,
            {
              borderTopColor: c.border,
              backgroundColor: c.background,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
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
            style={[styles.nextButton, styles.noticeBeginButton]}
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

      {/* Progress header — Step N of 6, section dots, beta Skip / View all.
          Green portal header: fills the status-bar inset, gold strip below. */}
      <View
        style={[
          styles.progressWrap,
          { backgroundColor: c.brandDeep, paddingTop: insets.top + 14 },
        ]}
      >
        <View style={styles.progressTop}>
          <Text style={[styles.stepCount, { color: 'rgba(255,255,255,0.75)' }]}>
            {showAll
              ? 'All questions - Sections A-E'
              : step === SECTIONS.length - 1
                ? `Final review - ${step + 1} of ${SECTIONS.length}`
                : `Section ${SECTIONS[step].code} - ${step + 1} of ${SECTIONS.length}`}
          </Text>
          <View style={styles.headerActions}>
            {TRACER_BETA && !showAll && (
              <TouchableOpacity onPress={() => setShowAll(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.skipButtonText, { color: c.gold }]}>View all</Text>
              </TouchableOpacity>
            )}
            {TRACER_BETA && (
              <TouchableOpacity onPress={exitFlow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.skipButtonText, { color: c.gold }]}>Skip →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {!showAll && (
          <View style={styles.dots}>
            {SECTIONS.map((section, i) => {
              const skipped = i === 2 && jobDetailsSkipped && step !== 2;
              const done = i <= step && !skipped;
              return (
                <View
                  key={section.title}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: done ? c.gold : 'rgba(255,255,255,0.16)',
                      borderColor: skipped
                        ? 'rgba(255,255,255,0.45)'
                        : done
                          ? c.gold
                          : 'rgba(255,255,255,0.35)',
                      borderStyle: skipped ? 'dashed' : 'solid',
                    },
                  ]}
                />
              );
            })}
          </View>
        )}
        {TRACER_BETA && (
          <Text style={[styles.betaNote, { color: c.goldSoft }]}>
            BETA PREVIEW — answers are not saved
          </Text>
        )}
        {!TRACER_BETA && editing && (
          <Text style={[styles.betaNote, { color: c.goldSoft }]}>
            Editing your submitted answers — tap Update answers when done
          </Text>
        )}
      </View>
      <View style={[styles.progressAccent, { backgroundColor: c.gold }]} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {stepError && !showAll ? (
          <View
            style={[
              styles.validationBanner,
              { backgroundColor: c.tintDanger, borderColor: c.danger },
            ]}
            accessibilityRole="alert"
          >
            <Text style={[styles.validationTitle, { color: c.danger }]}>Please check this section</Text>
            <Text style={[styles.validationText, { color: c.text }]}>{stepError}</Text>
          </View>
        ) : null}
        {/* ── Step 1 · Section A ─────────────────────────── */}
        {(showAll || step === 0) && (
          <View>
            <SectionIntro
              code="A"
              title="Graduate Profile"
              range="Questions 1-4"
              description="Confirm your basic graduate information. Required items are marked clearly."
              c={c}
            />

            <InfoNote
              text="Please answer honestly. Your responses are confidential and used for school improvement only."
              c={c}
            />

            <QuestionCard
              number="1"
              title="Full name and sex"
              required
              helper="The report uses the name linked to your alumni account."
              c={c}
            >
              <Field label="Full name" c={c} hint="from your account">
                <AccountValue value={fullName || 'Name unavailable'} c={c} />
              </Field>
              <Field label="Sex" c={c}>
                <ChoiceGroup
                  options={['Male', 'Female']}
                  value={sex}
                  onChange={setSex}
                  columns={2}
                  c={c}
                />
              </Field>
            </QuestionCard>

            <QuestionCard number="2" title="Course and year graduated" required c={c}>
              <Field label="Course graduated" c={c} hint="choose a suggestion for consistent records">
                <AutocompleteInput
                  value={course}
                  onChangeText={setCourse}
                  onSearch={fetchSuggestions}
                  apiType="program"
                  placeholder="Type BSIT, BSCS, BSCPE..."
                />
              </Field>
              <Field label="Year graduated" c={c} hint={`1900-${CURRENT_YEAR}`}>
                <TextInput
                  style={[styles.input, inputColors(c)]}
                  value={yearGraduated}
                  onChangeText={(value) => setYearGraduated(value.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="e.g. 2026"
                  placeholderTextColor={c.placeholder}
                />
              </Field>
            </QuestionCard>

            <QuestionCard
              number="3"
              title="Contact number and Email / Facebook"
              required
              helper="Contact number is required; Email / Facebook is optional."
              c={c}
            >
              <Field label="Contact number" c={c}>
                <TextInput
                  style={[styles.input, inputColors(c)]}
                  value={contactNo}
                  onChangeText={setContactNo}
                  keyboardType="phone-pad"
                  placeholder="09xxxxxxxxx"
                  placeholderTextColor={c.placeholder}
                />
              </Field>
              <Field label="Email / Facebook (optional)" c={c}>
                <TextInput
                  style={[styles.input, inputColors(c)]}
                  value={emailOrFb}
                  onChangeText={setEmailOrFb}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="Email address or Facebook profile"
                  placeholderTextColor={c.placeholder}
                />
              </Field>
            </QuestionCard>

            <QuestionCard
              number="4"
              title="Present address"
              optional
              helper="Your city or municipality and province are enough."
              c={c}
            >
              <TextInput
                style={[styles.input, styles.multiline, inputColors(c)]}
                value={currentLocation}
                onChangeText={setCurrentLocation}
                multiline
                placeholder="City / Municipality, Province"
                placeholderTextColor={c.placeholder}
              />
            </QuestionCard>
          </View>
        )}

        {/* ── Step 2 · Section B ─────────────────────────── */}
        {(showAll || step === 1) && (
          <View style={showAll ? [styles.allSection, { borderTopColor: c.border }] : undefined}>
            <SectionIntro
              code="B"
              title="Employment Status"
              range="Choose one answer"
              description="Your answer determines whether the current-employment questions apply to you."
              c={c}
            />

            <QuestionCard number="B" title="What is your current employment status?" required c={c}>
              <ChoiceGroup
                options={EMPLOYMENT_OPTIONS}
                value={employmentStatus}
                onChange={setEmploymentStatus}
                c={c}
              />
              {employmentStatus ? (
                <InfoNote
                  compact
                  text={
                    employed
                      ? 'Next: tell us about your current job.'
                      : 'Current-employment questions will be skipped. You will continue to Section D.'
                  }
                  c={c}
                />
              ) : null}
            </QuestionCard>
          </View>
        )}

        {/* ── Step 3 · Section C (conditional) ───────────── */}
        {(showAll || step === 2) && (
          <View style={showAll ? [styles.allSection, { borderTopColor: c.border }] : undefined}>
            <SectionIntro
              code="C"
              title="Current Employment Details"
              range="Questions 5-9"
              description="Answer these questions about the job or self-employment you have now."
              c={c}
            />

            {showJobQuestions ? (
              <>
                <QuestionCard
                  number="5"
                  title="Company name and position / job title"
                  required
                  helper="If self-employed, enter your business name or Freelance and your role."
                  c={c}
                >
                  <Field label="Company name" c={c}>
                    <TextInput
                      style={[styles.input, inputColors(c)]}
                      value={companyName}
                      onChangeText={setCompanyName}
                      placeholder="e.g. ACME Corporation"
                      placeholderTextColor={c.placeholder}
                    />
                  </Field>
                  <Field label="Position / job title" c={c} hint="choose a suggestion if it matches">
                    <AutocompleteInput
                      value={position}
                      onChangeText={setPosition}
                      onSearch={fetchSuggestions}
                      apiType="jobtitle"
                      placeholder="e.g. Junior Web Developer"
                    />
                  </Field>
                </QuestionCard>

                <QuestionCard number="6" title="What type of company do you work for?" required c={c}>
                  <ChoiceGroup
                    options={COMPANY_TYPES}
                    value={companyType}
                    onChange={setCompanyType}
                    columns={2}
                    c={c}
                  />
                  {companyType === 'Others' ? (
                    <Field label="Please specify (required)" c={c}>
                      <TextInput
                        style={[styles.input, inputColors(c)]}
                        value={companyTypeOther}
                        onChangeText={setCompanyTypeOther}
                        placeholder="Company type"
                        placeholderTextColor={c.placeholder}
                      />
                    </Field>
                  ) : null}
                </QuestionCard>

                <QuestionCard number="7" title="What is your monthly salary range?" required c={c}>
                  <ChoiceGroup
                    options={SALARY_BANDS}
                    labels={SALARY_LABELS}
                    value={salaryBand}
                    onChange={setSalaryBand}
                    c={c}
                  />
                </QuestionCard>

                <QuestionCard
                  number="8"
                  title="How many months after graduation did you get this job?"
                  required
                  helper="If self-employed, count until you started your business or freelance work."
                  c={c}
                >
                  <ChoiceGroup
                    options={MONTHS_TO_JOB}
                    labels={MONTHS_TO_JOB_LABELS}
                    value={monthsToJob}
                    onChange={setMonthsToJob}
                    columns={2}
                    c={c}
                  />
                </QuestionCard>

                <QuestionCard number="9" title="How did you get the job?" required c={c}>
                  <ChoiceGroup
                    options={JOB_SOURCES}
                    labels={JOB_SOURCE_LABELS}
                    value={jobSource}
                    onChange={setJobSource}
                    columns={2}
                    c={c}
                  />
                </QuestionCard>
              </>
            ) : (
              <InfoNote
                text="Section C is not applicable because you reported that you are not currently employed. No job details are required."
                c={c}
              />
            )}
          </View>
        )}

        {/* ── Step 4 · Section D ─────────────────────────── */}
        {(showAll || step === 3) && (
          <View style={showAll ? [styles.allSection, { borderTopColor: c.border }] : undefined}>
            <SectionIntro
              code="D"
              title="Alignment to Course"
              range="Questions 10-13"
              description="This section helps the school understand course relevance and skill gaps."
              important
              c={c}
            />

            {showJobQuestions ? (
              <>
                <QuestionCard
                  number="10"
                  title="Is your current job related to the course you graduated from?"
                  required
                  c={c}
                >
                  <ChoiceGroup
                    options={RELATEDNESS}
                    labels={RELATEDNESS_LABELS}
                    value={courseRelatedness}
                    onChange={setCourseRelatedness}
                    columns={2}
                    c={c}
                  />
                </QuestionCard>

                <QuestionCard
                  number="11"
                  title="How does your job use what you learned in your course?"
                  required
                  helper="A short, specific example is enough."
                  c={c}
                >
                  <TextInput
                    style={[styles.input, styles.multiline, inputColors(c)]}
                    value={relatednessComment}
                    onChangeText={setRelatednessComment}
                    multiline
                    placeholder="e.g. I use programming and database skills in my current role."
                    placeholderTextColor={c.placeholder}
                  />
                </QuestionCard>

                <QuestionCard
                  number="12"
                  title="Which skills or subjects from your course do you use most at work?"
                  required
                  helper="Select all that apply."
                  c={c}
                >
                  <MultiChoiceGroup
                    options={SKILL_OPTIONS}
                    values={skillsUsed}
                    onToggle={toggleSkill}
                    c={c}
                  />
                  {skillsUsed.includes('Others') ? (
                    <Field label="Please specify the other skill (required)" c={c}>
                      <TextInput
                        style={[styles.input, inputColors(c)]}
                        value={skillsUsedOther}
                        onChangeText={setSkillsUsedOther}
                        placeholder="Other skill or subject"
                        placeholderTextColor={c.placeholder}
                      />
                    </Field>
                  ) : null}
                </QuestionCard>
              </>
            ) : (
              <InfoNote
                text="Questions 10-12 are about a current job, so they are not required for your employment status."
                c={c}
              />
            )}

            <QuestionCard
              number="13"
              title="What skills do you wish the school taught you more?"
              optional
              helper="Your answer helps identify topics for future students and alumni training."
              c={c}
            >
              <TextInput
                style={[styles.input, styles.multiline, inputColors(c)]}
                value={skillsWanted}
                onChangeText={setSkillsWanted}
                multiline
                placeholder="e.g. More hands-on projects, cloud deployment, or client communication"
                placeholderTextColor={c.placeholder}
              />
            </QuestionCard>
          </View>
        )}

        {/* ── Step 5 · Section E ─────────────────────────── */}
        {(showAll || step === 4) && (
          <View style={showAll ? [styles.allSection, { borderTopColor: c.border }] : undefined}>
            <SectionIntro
              code="E"
              title="Feedback"
              range="Questions 14-15"
              description="These are the final questions before you review your answers."
              c={c}
            />

            <QuestionCard
              number="14"
              title="Are you satisfied with the training you received?"
              required
              c={c}
            >
              <ChoiceGroup
                options={YES_NO}
                value={satisfied}
                onChange={setSatisfied}
                columns={2}
                c={c}
              />
              {satisfied ? (
                <Field
                  label={
                    satisfied === 'No'
                      ? 'Why are you not satisfied? (required)'
                      : 'What worked well? (optional)'
                  }
                  c={c}
                >
                  <TextInput
                    style={[styles.input, styles.multiline, inputColors(c)]}
                    value={satisfiedReason}
                    onChangeText={setSatisfiedReason}
                    multiline
                    placeholder={
                      satisfied === 'No'
                        ? 'Tell us what could be improved.'
                        : 'Share what helped you most, if you wish.'
                    }
                    placeholderTextColor={c.placeholder}
                  />
                </Field>
              ) : null}
            </QuestionCard>

            <QuestionCard
              number="15"
              title="Would you recommend your course to others?"
              required
              c={c}
            >
              <ChoiceGroup
                options={YES_NO}
                value={wouldRecommend}
                onChange={setWouldRecommend}
                columns={2}
                c={c}
              />
            </QuestionCard>
          </View>
        )}

        {/* ── Step 6 · Review & Submit ───────────────────── */}
        {step === 5 && !showAll && (
          <View>
            <SectionIntro
              code="6"
              title="Review Your Answers"
              range="Final step"
              description={
                editing
                  ? 'Check your changes, then tap Update answers to save them.'
                  : 'Check each section before submitting. Use Edit to correct an answer.'
              }
              c={c}
            />

            <InfoNote
              text="Your answers contribute to the school's employment, course-alignment, and curriculum-improvement reports."
              c={c}
            />

            <Summary
              title="A · Graduate Profile"
              editTo={0}
              onEdit={jumpTo}
              rows={[
                ['1. Full name', fullName],
                ['1. Sex', sex],
                ['2. Course graduated', course],
                ['2. Year graduated', yearGraduated],
                ['3. Contact number', contactNo],
                ['3. Email / Facebook', emailOrFb],
                ['4. Present address', currentLocation],
              ]}
              c={c}
            />
            <Summary
              title="B · Employment Status"
              editTo={1}
              onEdit={jumpTo}
              rows={[['Current employment status', employmentStatus]]}
              c={c}
            />
            <Summary
              title="C · Current Employment Details"
              editTo={employed ? 2 : 1}
              onEdit={jumpTo}
              skipped={jobDetailsSkipped}
              rows={[
                ['5. Company name', companyName],
                ['5. Position / job title', position],
                ['6. Type of company', companyType === 'Others' ? `Others - ${companyTypeOther}` : companyType],
                ['7. Monthly salary', SALARY_LABELS[salaryBand] || salaryBand],
                ['8. Months to job', MONTHS_TO_JOB_LABELS[monthsToJob] || monthsToJob],
                ['9. How you got the job', JOB_SOURCE_LABELS[jobSource] || jobSource],
              ]}
              c={c}
            />
            <Summary
              title="D · Alignment to Course"
              editTo={3}
              onEdit={jumpTo}
              rows={
                employed
                  ? [
                      ['10. Job-course relationship', RELATEDNESS_LABELS[courseRelatedness] || ''],
                      ['11. Explanation', relatednessComment],
                      ['12. Skills used most', skillsUsed.join(', ') + (skillsUsedOther ? ` - ${skillsUsedOther}` : '')],
                      ['13. Skills wanted', skillsWanted],
                    ]
                  : [
                      ['10-12. Current-job questions', 'Not applicable - no current job'],
                      ['13. Skills wanted', skillsWanted],
                    ]
              }
              c={c}
            />
            <Summary
              title="E · Feedback"
              editTo={4}
              onEdit={jumpTo}
              rows={[
                ['14. Satisfied with training', satisfied],
                ['14. Reason', satisfiedReason],
                ['15. Would recommend course', wouldRecommend],
              ]}
              c={c}
            />
          </View>
        )}
      </ScrollView>

      {/* Footer nav — mirrors the profile wizard; in "View all" it offers step/exit */}
      <View
        style={[
          styles.footer,
          {
            borderTopColor: c.border,
            backgroundColor: c.background,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        {showAll ? (
          <TouchableOpacity style={styles.backButton} onPress={() => setShowAll(false)}>
            <Text style={[styles.backText, { color: c.textMuted }]}>← Step-by-step</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.backButton} onPress={back}>
            <Text style={[styles.backText, { color: c.textMuted }]}>
              {step === 0 ? 'Cancel' : '← Back'}
            </Text>
          </TouchableOpacity>
        )}
        {showAll ? (
          <PrimaryButton title="Exit preview" onPress={exitFlow} style={styles.nextButton} />
        ) : step < SECTIONS.length - 1 ? (
          <PrimaryButton title={nextButtonTitle()} onPress={next} style={styles.nextButton} />
        ) : (
          <PrimaryButton
            title={
              TRACER_BETA
                ? 'Submit (preview)'
                : editing
                  ? 'Update answers'
                  : 'Submit'
            }
            onPress={submit}
            style={styles.nextButton}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Small building blocks ──────────────────────────────────────────────────

function SectionIntro({ code, title, range, description, important, c }) {
  const kicker = code === '6' ? 'FINAL REVIEW' : `SECTION ${code}`;
  return (
    <View style={styles.sectionIntro}>
      <View style={styles.sectionMetaRow}>
        <View style={[styles.sectionCode, { backgroundColor: c.primaryTint }]}>
          <Text style={[styles.sectionCodeText, { color: c.primary }]}>{kicker}</Text>
        </View>
        <Text style={[styles.sectionRange, { color: c.textMuted }]}>{range}</Text>
      </View>
      <Text style={[styles.sectionTitle, { color: c.text }]}>{title}</Text>
      <Text style={[styles.sectionDescription, { color: c.textMuted }]}>{description}</Text>
      {important ? (
        <View style={[styles.importantBadge, { backgroundColor: c.tintWarning }]}>
          <Text style={[styles.importantText, { color: c.warning }]}>MOST IMPORTANT TO THE SCHOOL</Text>
        </View>
      ) : null}
    </View>
  );
}

function InfoNote({ text, c, compact = false }) {
  return (
    <View
      style={[
        styles.infoNote,
        { backgroundColor: c.tintInfo, borderColor: c.info },
        compact && styles.infoNoteCompact,
      ]}
    >
      <Text style={[styles.infoNoteText, { color: c.text }]}>{text}</Text>
    </View>
  );
}

function QuestionCard({ number, title, required, optional, helper, children, c }) {
  return (
    <View style={[styles.questionCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={styles.questionHead}>
        <View style={[styles.questionNumber, { backgroundColor: c.primaryTint }]}>
          <Text style={[styles.questionNumberText, { color: c.primary }]}>{number}</Text>
        </View>
        <View style={styles.questionHeading}>
          <Text style={[styles.questionTitle, { color: c.text }]}>{title}</Text>
          {required || optional ? (
            <Text
              style={[
                styles.requirementText,
                { color: required ? c.danger : c.textMuted },
              ]}
            >
              {required ? 'REQUIRED' : 'OPTIONAL'}
            </Text>
          ) : null}
        </View>
      </View>
      {helper ? <Text style={[styles.questionHelper, { color: c.textMuted }]}>{helper}</Text> : null}
      <View style={styles.questionBody}>{children}</View>
    </View>
  );
}

function AccountValue({ value, c }) {
  return (
    <View style={[styles.accountValue, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
      <Text style={[styles.accountValueText, { color: c.text }]}>{value}</Text>
      <Text style={[styles.accountValueHint, { color: c.textMuted }]}>Linked to your account</Text>
    </View>
  );
}

function ChoiceGroup({ options, labels = {}, value, onChange, columns = 1, c }) {
  return (
    <View style={styles.choiceGroup}>
      {options.map((option) => (
        <Radio
          key={option}
          label={labels[option] || option}
          selected={value === option}
          onPress={() => onChange(option)}
          c={c}
          half={columns === 2}
        />
      ))}
    </View>
  );
}

function MultiChoiceGroup({ options, values, onToggle, c }) {
  return (
    <View style={styles.choiceGroup}>
      {options.map((option) => {
        const selected = values.includes(option);
        return (
          <TouchableOpacity
            key={option}
            style={[
              styles.multiChoice,
              {
                backgroundColor: selected ? c.primaryTint : c.surface,
                borderColor: selected ? c.primary : c.border,
              },
            ]}
            onPress={() => onToggle(option)}
            activeOpacity={0.72}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: selected ? c.primary : c.border,
                  backgroundColor: selected ? c.primary : c.surface,
                },
              ]}
            >
              {selected ? <Text style={[styles.checkboxMark, { color: c.onPrimary }]}>✓</Text> : null}
            </View>
            <Text style={[styles.multiChoiceText, { color: c.text }]}>{option}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Field({ label, children, c, hint }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: c.text }]}>{label}</Text>
      {hint ? <Text style={[styles.fieldHint, { color: c.textMuted }]}>{hint}</Text> : null}
      {children}
    </View>
  );
}

function Radio({ label, selected, onPress, c, half }) {
  return (
    <TouchableOpacity
      style={[
        styles.radioRow,
        half ? styles.radioHalf : styles.radioFull,
        {
          borderColor: selected ? c.primary : c.border,
          backgroundColor: selected ? c.primaryTint : c.surface,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.72}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
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
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: c.primaryTint }]}
          onPress={() => onEdit(editTo)}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${title}`}
        >
          <Text style={[styles.editText, { color: c.primary }]}>Edit</Text>
        </TouchableOpacity>
      </View>
      {skipped ? (
        <Text style={[styles.skippedText, { color: c.textMuted }]}>
          Skipped — not employed
        </Text>
      ) : (
        rows.map(([label, value]) => {
          const displayValue = String(value || '').trim();
          return (
            <View key={label} style={[styles.summaryRow, { borderTopColor: c.border }]}>
              <Text style={[styles.summaryLabel, { color: c.textMuted }]}>{label}</Text>
              <Text style={[styles.summaryValue, { color: displayValue ? c.text : c.textMuted }]}>
                {displayValue || 'Not provided'}
              </Text>
            </View>
          );
        })
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  noticeBeginButton: { flex: 1, marginLeft: 12, paddingHorizontal: 24 },
  allSection: { marginTop: 28, paddingTop: 22, borderTopWidth: StyleSheet.hairlineWidth },
  stepCount: { fontSize: 12, fontWeight: '600' },
  skipButtonText: { fontSize: 13, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 6, marginTop: 8 },
  dot: { flex: 1, height: 6, borderRadius: 3, borderWidth: 1 },
  betaNote: { fontSize: 10, fontWeight: '700', marginTop: 8, letterSpacing: 0.4 },
  content: { padding: 16, paddingBottom: 28 },
  noticeTop: { paddingHorizontal: 20, paddingBottom: 10 },
  noticeTopText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  noticeTopAccent: { height: 3 },
  progressAccent: { height: 3 },
  noticeContent: { padding: 20, paddingBottom: 24, flexGrow: 1, justifyContent: 'center' },
  noticeCard: { borderRadius: 16, borderWidth: 1, padding: 20 },
  noticeBadge: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
  noticeTitle: { fontSize: 20, fontWeight: '700', marginTop: 8, lineHeight: 27 },
  noticeBody: { fontSize: 13, marginTop: 8, lineHeight: 19 },
  noticeBullet: { flexDirection: 'row', marginTop: 12 },
  noticeBulletDot: { fontSize: 16, lineHeight: 20, marginRight: 8, fontWeight: '700' },
  noticeBulletText: { flex: 1, fontSize: 13, lineHeight: 20 },
  validationBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  validationTitle: { fontSize: 12.5, fontWeight: '800' },
  validationText: { fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  sectionIntro: { marginBottom: 16 },
  sectionMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sectionCode: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  sectionCodeText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6 },
  sectionRange: { fontSize: 11.5, fontWeight: '600' },
  sectionTitle: { fontSize: 22, fontWeight: '700', lineHeight: 28, marginTop: 9 },
  sectionDescription: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  importantBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
  },
  importantText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.45 },
  infoNote: {
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  infoNoteCompact: { marginTop: 12, marginBottom: 0 },
  infoNoteText: { fontSize: 12.5, lineHeight: 19 },
  questionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  questionHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  questionNumber: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionNumberText: { fontSize: 12, fontWeight: '800' },
  questionHeading: { flex: 1, minWidth: 0 },
  questionTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  requirementText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.7, marginTop: 4 },
  questionHelper: { fontSize: 11.5, lineHeight: 17, marginTop: 9 },
  questionBody: { marginTop: 6 },
  field: { marginTop: 12 },
  fieldLabel: { fontSize: 12.5, lineHeight: 17, fontWeight: '700', marginBottom: 5 },
  fieldHint: { fontSize: 11, lineHeight: 15, marginTop: -2, marginBottom: 5 },
  accountValue: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  accountValueText: { fontSize: 14, fontWeight: '700' },
  accountValueHint: { fontSize: 10.5, marginTop: 2 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 46,
  },
  multiline: { minHeight: 104, textAlignVertical: 'top' },
  choiceGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: { fontSize: 14, fontWeight: '800', lineHeight: 16 },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  radioFull: { width: '100%' },
  radioHalf: { width: '48.5%' },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    marginRight: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: { width: 8, height: 8, borderRadius: 4 },
  radioLabel: { fontSize: 12.5, lineHeight: 17, fontWeight: '600', flex: 1 },
  multiChoice: {
    width: '48.5%',
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 10,
  },
  multiChoiceText: { flex: 1, fontSize: 12, lineHeight: 16, fontWeight: '600' },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 15,
    marginTop: 14,
  },
  summaryHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryTitle: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '700', marginRight: 10 },
  editButton: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  editText: { fontSize: 12, fontWeight: '800' },
  summaryRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 9, marginTop: 9 },
  summaryLabel: { fontSize: 11, lineHeight: 15, fontWeight: '700' },
  summaryValue: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  skippedText: { fontSize: 13, marginTop: 10, lineHeight: 18, fontStyle: 'italic' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  backButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  backText: { fontSize: 14, fontWeight: '600' },
  nextButton: { minWidth: 164, paddingHorizontal: 12 },
});
