import type { Dictionary } from './types';

/**
 * English mirrors the Dutch voice rather than its words. BRAND 4.1 asks for
 * `je` rather than `u`; the English equivalent of that closeness is the
 * contraction, so "That didn't work" rather than "That did not work". The
 * defining sentences keep their full form, because their weight is the point.
 */
export const en: Dictionary = {
  appTagline: 'Out of the wind.',

  onboardingWhat: 'This is not a doctor. This is a notebook that remembers what you forget.',
  onboardingSharing: 'You decide who sees what. Always. You can change it at any time.',

  checkinEntry: 'How was today?',
  checkinMood: 'How did you feel?',
  checkinEnergy: 'How much energy did you have?',
  checkinSleep: 'How did you sleep?',
  checkinAnxiety: 'How restless was it?',
  checkinFlatness: 'Could you feel anything today?',
  checkinDiary: 'Anything you want to remember about today?',
  checkinDone: 'Saved.',

  todayEmpty: "Nothing today. That's allowed.",
  optionalPractice: 'If you feel like it.',
  medicationSection: 'What you take today, and what for.',

  feedEmpty: 'Nothing yet today.',
  kudosSent: 'Sent.',

  insightsHeader: 'The last two weeks.',
  insightsCaveat: 'These are not conclusions. This is what you wrote down.',
  windlineLabel: 'Overview of the last fourteen days',

  healthImportAsk:
    "Your watch knows when you slept. Do you want luwte to take that over, so you don't have to fill it in?",
  dataDeletion: "Gone is gone. We can't undo that.",

  genericError: "That didn't work. Try again later.",
  offline: 'No connection. What you fill in is saved and sent later.',

  crisisTitle: "If it's too much right now, call someone.",
  crisisZelfmoordlijn: 'Suicide helpline (Zelfmoordlijn)',
  crisisCps: 'Centre de Prévention du Suicide',
  crisisEmergency: 'Emergency',
  crisisCallAction: 'Call',

  navToday: 'Today',
  navCrisis: 'Help now',
  navBack: 'Back',

  settingsTheme: 'Light or dark',
  settingsLocale: 'Language',
  themeDark: 'Dark',
  themeLight: 'Light',

  scaleLow: 'little',
  scaleHigh: 'a lot',
  scaleStep1: 'very little',
  scaleStep2: 'little',
  scaleStep3: 'rather little',
  scaleStep4: 'in between',
  scaleStep5: 'rather a lot',
  scaleStep6: 'a lot',
  scaleStep7: 'very much',

  styleguideTitle: 'Style guide',

  // Auth
  signInTitle: 'Welcome',
  signInEmailLabel: 'Your email address',
  signInSendLink: 'Send me a link',
  signInLinkSent: 'Check your inbox. The link stays valid for an hour.',
  signInUsePassword: 'Use a password instead',
  signInUseLink: 'Use a link in my email instead',
  signInPasswordLabel: 'Password',
  signInSubmit: 'Sign in',
  signInInvalidEmail: "That doesn't look like an email address.",
  signInFailed: "Signing in didn't work. Try again later.",
  signOut: 'Sign out',

  // Onboarding
  onboardingNext: 'Continue',
  onboardingNameTitle: 'What should we call you?',
  onboardingNameLabel: 'Your name',
  onboardingHourTitle: 'When does it suit you to look back on your day?',
  onboardingHourExplanation: 'One reminder a day. If you miss it, nothing happens.',
  onboardingFinish: 'Done',

  // Consent
  consentTitle: 'What you are agreeing to',
  consentIntro:
    'luwte stores health data. That needs your explicit permission, and you can withdraw it later.',
  consentEssentialLabel: 'Keep an account and your settings',
  consentEssentialExplanation:
    'Your name, your language and the hour of your reminder. The app does not work without this.',
  consentHealthLabel: 'Store what you write about how you feel',
  consentHealthExplanation:
    'Mood, energy, sleep, restlessness, medication. This is health data. It is stored in Belgium and nobody sees it unless you choose that.',
  consentRemindersLabel: 'Send you a reminder',
  consentRemindersExplanation:
    'One notification a day, at the hour you chose. You can turn this off later.',
  consentRequired: 'Needed',
  consentOptional: 'You may decline',
  consentAccept: 'Yes, that is fine',
  consentMissing: 'The first two are needed to continue.',
  consentWhereToChange: 'You can change this later under Data and privacy.',

  // Check-in
  checkinSleepHours: 'How many hours did you sleep?',
  checkinHoursSuffix: 'hours',
  checkinStart: 'Fill it in',
  checkinSave: 'Save',
  checkinBack: 'Back',
  checkinSkip: 'Skip',
  checkinDiaryPlaceholder: 'Whatever you like',
  checkinEdit: 'Change it',
  checkinDoneToday: 'You filled today in.',
  checkinLocked: 'This day is closed.',

  // The weekly extra, once a week, inline after the daily items
  weeklyIntro: 'Four more questions. They come once a week.',
  weeklyRestlessness: 'How restless did your body feel?',
  weeklyStiffness: 'How stiff did your body feel?',
  weeklySedation: 'How drowsy were you during the day?',
  weeklyHopelessness: 'How hopeless did it feel?',

  // Settings and notifications
  settingsTitle: 'Settings',
  settingsNotifications: 'Notifications',
  settingsNotificationsIntro:
    'You can turn each notification off separately. With all of them off, the app still works.',
  settingsAllowNotifications: 'Allow notifications',
  settingsNotificationsBlocked: 'Your browser is not allowing notifications. You can change that there.',
  settingsReminderHour: 'Your reminder',
  settingsSaved: 'Saved.',

  notifyCheckinLabel: 'Your daily reminder',
  notifyCheckinExplanation: 'One notification, at the hour you chose. If you miss it, nothing happens.',
  notifyMedicationLabel: 'Your medication',
  notifyMedicationExplanation: 'A notification at the times listed on your medication.',
  notifyKudosLabel: 'When someone responds',
  notifyKudosExplanation: 'When someone in your circle responds to what you shared.',
  notifySupportedActivityLabel: 'When someone you follow did something',
  notifySupportedActivityExplanation:
    'When someone you support finished something they had planned. This only works if that person shared their overview with you.',

  // Calendar
  calendarAddReminder: 'Put it in Google Calendar',
  calendarExplanation:
    'This opens Google Calendar with everything filled in. luwte gets no access to your calendar and stores nothing.',
  calendarEventTitle: 'luwte',
  calendarEventDetails: 'A moment to look back on your day.',

  // Medication
  medicationEmpty: 'What you take goes here, if you fill it in.',
  medicationAdd: 'Add medication',
  medicationName: 'Name',
  medicationDose: 'Dose',
  medicationTimes: 'When',
  medicationPurpose: 'What it is for',
  medicationPurposeHint: 'In plain words. Your doctor can add to this later.',
  medicationSave: 'Save',
  medicationTaken: 'Taken',
  medicationHistory: 'What changed',

  // Optional practices — offered, never tracked
  practicesTitle: 'If you feel like it',
  practiceGratitude: 'Write down something that went alright today.',
  practiceBreathing: 'Breathe slowly for a minute.',
  practiceWalk: 'Step outside for a moment.',

  // Insights
  insightsTitle: 'Overview',
  insightsWindow2: '2 weeks',
  insightsWindow6: '6 weeks',
  insightsWindow12: '12 weeks',
  insightsEmpty: 'Nothing to show yet. That will come.',
  insightsChartLabel: 'Chart of your mood, energy, flatness and sleep',
  diaryTitle: 'What you wrote down',
  diaryEmpty: "You haven't written anything down yet.",
  adherenceLabel: 'Medication taken',

  // Report — printed, taken to an appointment
  reportTitle: 'For your appointment',
  reportOpen: 'Make an overview',
  reportPrint: 'Save or print',
  reportExplanation:
    'This makes a sheet you can take with you or send on. It is made on your own device and goes nowhere else.',
  reportPeriod: 'Period',

  // PRD 6.4 — per person, in plain sentences. Never as toggle labels.
  permCheckins: 'Can see how you felt.',
  permMedication: 'Can see what you take and whether you took it.',
  permHealth: 'Can see what your watch reported.',
  permFeed: 'Can see what you share, and can respond.',
  permCalendar: 'Can see your calendar and suggest something.',

  // The circle — who sees anything, and exactly what
  circleTitle: 'Who sees anything',
  circleIntro: 'You decide who sees what. You can change it whenever you like.',
  circleEmpty: "Nobody sees anything yet. That's fine.",
  circleAdd: 'Invite someone',
  circleWhatTheySee: 'What this person sees',
  circleSeesNothing: 'Sees nothing of what you write down yet.',
  circleRevoked: 'Sees nothing any more.',
  circleChange: 'Change',
  circleRevoke: 'Stop their access',
  circleRestore: 'Let them back in',
  circleRoleSupporter: 'Someone close',
  circleRoleClinician: 'Care team',
  circleRelation: 'Who is this to you?',
  circleRelationHint: 'Brother, mum, psychiatrist — your words.',
  circleOpenInvites: 'Invites still open',
  circleInviteWaiting: 'Not taken up yet.',
  circleInviteWithdraw: 'Withdraw',

  // Inviting
  inviteTitle: 'Invite someone',
  inviteWho: 'Who are you inviting?',
  inviteWhatTheySee: 'What this person may see',
  inviteCreate: 'Make a link',
  inviteReady: 'Send this link to the person you are inviting. It lasts seven days and works once.',
  inviteCopy: 'Copy the link',
  inviteCopied: 'Copied.',

  // Accepting, on the invited person's side
  joinTitle: 'You have been invited',
  joinExplain: 'If you accept, here is what you will see:',
  joinNothingYet: 'For now you will see nothing. That can change later.',
  joinAccept: 'Accept',
  joinSignIn: 'Sign in first. Then you can accept this.',
  joinDone: 'Done. You have access now.',
  joinUnusable: 'This link no longer works. Ask for a new one.',
};
