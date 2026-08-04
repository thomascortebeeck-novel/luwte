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
};
