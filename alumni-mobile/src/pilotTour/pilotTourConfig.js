const enabledSetting = process.env.EXPO_PUBLIC_PILOT_TOUR_ENABLED;

export const PILOT_TOUR_CONFIG = {
  // Development builds show the tour unless explicitly disabled. Release
  // builds stay off unless the pilot environment turns the public flag on.
  enabled: enabledSetting ? enabledSetting === 'true' : __DEV__,
  version: 'pilot-tour-v1',
  feedbackFormUrl: (process.env.EXPO_PUBLIC_PILOT_FEEDBACK_FORM_URL || '').trim(),
};

export const PILOT_TOUR_STEPS = [
  {
    key: 'home',
    title: 'Home and notifications',
    destination: 'Home',
    description: 'Review the dashboard and open your notifications.',
    target: { tab: 'HomeTab', screen: 'Home' },
  },
  {
    key: 'profile',
    title: 'Profile',
    destination: 'Profile',
    description: 'Check your personal details, completeness, and profile photo.',
    target: { tab: 'ProfileTab', screen: 'Profile' },
  },
  {
    key: 'news',
    title: 'Community news',
    destination: 'Community > News',
    description: 'Open a post and try the available Like or Comment controls.',
    target: { tab: 'CommunityTab', screen: 'NewsList' },
  },
  {
    key: 'events',
    title: 'Events',
    destination: 'Community > Events',
    description: 'Open an event and review the RSVP interaction.',
    target: { tab: 'CommunityTab', screen: 'EventsList' },
  },
  {
    key: 'directory',
    title: 'Alumni directory',
    destination: 'Community > Alumni',
    description: 'Search for an alumnus or filter the directory by program.',
    target: { tab: 'CommunityTab', screen: 'Directory' },
  },
  {
    key: 'career',
    title: 'Career overview',
    destination: 'Career > Overview',
    description: 'Review your career record and employment-proof workflow.',
    target: { tab: 'CareerTab', screen: 'CareerHome' },
  },
  {
    key: 'jobs',
    title: 'Job opportunities',
    destination: 'Career > Jobs',
    description: 'Search the job board and open a role. Apply only to a designated test job.',
    target: { tab: 'CareerTab', screen: 'JobsList' },
  },
  {
    key: 'applications',
    title: 'Applications',
    destination: 'Career > Applications',
    description: 'Review application status and the timeline interaction.',
    target: { tab: 'CareerTab', screen: 'MyApplications' },
  },
  {
    key: 'resume',
    title: 'Resume tools',
    destination: 'Profile > Resume',
    description: 'Explore resume generation, PDF selection, and download controls.',
    target: { tab: 'ProfileTab', screen: 'Resume' },
  },
  {
    key: 'documents',
    title: 'Document checklist',
    destination: 'Profile > Documents',
    description: 'Open your document checklist and review its status labels.',
    target: { tab: 'ProfileTab', screen: 'Documents' },
  },
  {
    key: 'suggestion',
    title: 'Suggest a post',
    destination: 'Community > Suggest a Post',
    description: 'Explore the post-suggestion form. Submit only genuine pilot content.',
    target: { tab: 'CommunityTab', screen: 'SuggestPost' },
  },
];

export const TERMINAL_TOUR_STATUSES = new Set(['tried', 'skipped', 'not_applicable']);
