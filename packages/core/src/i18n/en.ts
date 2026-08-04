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
};
