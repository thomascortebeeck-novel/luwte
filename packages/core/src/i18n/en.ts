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
  // Bipolar: both ends are a state, not a shortage of the other.
  checkinArousal: 'Were you restless, or more slowed down?',
  checkinArousalLow: 'slowed down',
  checkinArousalHigh: 'restless',
  checkinFlatness: 'Could you feel anything today?',
  checkinDiary: 'Anything you want to remember about today?',
  // The same question, asked differently. One a day, and the first one above
  // takes its turn like the rest, so nothing is lost when it comes round.
  diaryPromptAlright: 'What went alright today?',
  diaryPromptSmall: 'Was there something small that was good?',
  diaryPromptWho: 'Who did you speak to today?',
  diaryPromptHelped: 'What helped today?',
  diaryPromptEffort: 'What took effort today?',
  diaryPromptTomorrow: 'Anything you do not want to forget tomorrow?',
  checkinDone: 'Saved.',

  todayEmpty: "Nothing today. That's allowed.",
  optionalPractice: 'If you feel like it.',
  medicationSection: 'What you take today and what for.',

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
  navSections: 'Navigation',
  navCrisis: 'Help now',
  navBack: 'Back',

  settingsTheme: 'Light or dark',
  settingsLocale: 'Language',
  settingsThemeIntro:
    'luwte opens dark, in the daytime too. That reads more easily when your sleep is disrupted.',
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
  signInGoogle: 'Continue with Google',

  // Creating an account, and signing in. Two clear paths rather than guessing
  // which of the two somebody meant.
  registerTitle: 'Create an account',
  registerSubmit: 'Create account',
  registerPasswordLabel: 'Choose a password',
  registerPasswordHint: 'At least eight characters. Choose something you will remember.',
  authSwitchToRegister: 'I do not have an account yet',
  authSwitchToSignIn: 'I already have an account',
  authShowPassword: 'Show password',
  authHidePassword: 'Hide password',
  authForgotPassword: 'Forgotten your password',
  authResetSubmit: 'Reset your password',
  authResetIntro: 'We send you an email so you can choose a new password.',
  /*
   * Says nothing about whether the address exists. That would reveal this
   * person keeps a logbook, and anyone can ask without a password.
   */
  authResetSent: 'If there is an account with this address, an email is on its way.',
  authPasswordTooShort: 'Choose a password of at least eight characters.',
  authPasswordSameAsEmail: 'Choose something other than your email address.',
  authTooManyAttempts: 'Too many attempts in a row. Wait a moment and try again.',
  authOffline: 'No connection. Signing in needs the internet.',
  authWrongCredentials: 'That email address or that password is not right.',
  authRegisterFailed:
    'Creating an account did not work. If you already have one, sign in instead.',
  signInGoogleNote:
    'If you choose Google, Google knows you use luwte. What you write here, Google does not see.',
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
  onboardingDoctorTitle: 'Is a care provider looking along with you?',
  onboardingDoctorExplanation:
    'You can add them now, or later. If there is nobody, you simply manage your medication yourself.',
  onboardingDoctorNow: 'Add now',
  onboardingDoctorLater: 'Later',
  onboardingFinish: 'Done',
  // Verification — the clinician's side
  verifyTitle: 'Have it checked that you are a clinician',
  verifyIntro:
    'A person checks this before you can follow anybody. Until that happens, you see nobody.',
  verifyName: 'Your name, as patients know it',
  verifyDiscipline: 'What you do',
  verifyRiziv: 'Your RIZIV number',
  verifyRizivHint: 'Eleven digits. We check it against the RIZIV register.',
  verifyPractice: 'Where you work',
  verifySend: 'Send',
  verifyPending: 'Your request has been sent. Someone is looking at it.',
  verifyDeclined: 'Your request was not approved. Get in touch if you think that is wrong.',
  verifyNotYet: 'You have not been checked yet, so you see nobody.',
  disciplinePsychiater: 'Psychiatrist',
  disciplineHuisarts: 'GP',
  disciplinePsycholoog: 'Psychologist',
  disciplineVerpleegkundige: 'Nurse',
  disciplineAndere: 'Something else',

  // A patient adding their doctor
  findTitle: 'Add your doctor',
  findIntro: 'Did your doctor give you a code? Type it here. Or search by name.',
  findCode: 'Your doctor’s code',
  findLook: 'Look it up',
  findUnknown: 'We do not know that code. Check it, or ask for it again.',
  findConfirm: 'Is that right?',
  findAdd: 'Yes, this is my doctor',
  findRelation: 'What is this person to you?',
  findDone: 'Added. You can always change what this person sees.',
  findWhatTheySee: 'They see your check-ins and your medication. You can change that.',
  findByName: 'Search by name',
  findName: 'Your doctor’s name',
  findNameHint:
    'You will only find care providers who already use luwte. There is no list of every doctor in Belgium.',
  findSearch: 'Search',
  findNobody:
    'Nobody found with that name. Ask your doctor for a code, or invite them with a link.',
  findAsk: 'Ask this person',
  findAskWhatTheySee:
    'If they say yes, they see your check-ins and your medication. You can always change that.',
  findAsked:
    'Asked. Your doctor sees it when they open luwte. Nothing changes until they say yes.',
  myCodeTitle: 'Your code',
  myCodeIntro: 'Give this code to somebody who wants you to follow them.',

  // What has been asked of a clinician, in their own console
  inboxTitle: 'Asked of you',
  inboxAsks: 'asks whether you may look along.',
  inboxSees: 'What you would see:',
  inboxAccept: 'Accept',
  inboxLeave:
    'Do nothing and the request expires after a week. Nobody is told either way.',
  grantCheckins: 'How things are going, day by day',
  grantMedication: 'Which medication is being taken',
  grantDoses: 'Whether the medication was taken',
  grantHealth: 'What the watch reported',
  grantFeed: 'What gets shared',
  grantCalendar: 'The calendar',
  grantPlan: 'What gets done when things get harder',

  // The plan — own words, own list. luwte never checks anything against it.
  planTitle: 'When things get harder',
  planLink: 'When things get harder',
  planIntro:
    'What do you notice first when things start going downhill, and what do you do then? Your own words. luwte does not check anything against this.',
  planEmpty: 'You have nothing here yet.',
  planSign: 'What do you notice?',
  planAction: 'What do you do then?',
  planActionHint: 'You can fill this in later.',
  planAdd: 'Add something',
  planSave: 'Save',
  planRemove: 'Remove',
  planExamples: 'For example',
  planExampleSleep: 'I sleep less than five hours, two nights running.',
  planExampleWithdraw: 'I stop answering the phone.',
  planExampleThoughts: 'My thoughts move faster than I can follow them.',
  planExampleMedication: 'I start thinking I do not need my medication any more.',
  planShared: 'What this person wrote down for when things get harder.',

  // The six steps of a safety plan (Stanley and Brown).
  planWarningTitle: 'What you notice',
  planWarningIntro: 'What do you notice first when things get harder?',
  planWarningLabel: 'What you notice',
  planWarningDetail: 'What you then do',
  planCopingTitle: 'What you can do alone',
  planCopingIntro: 'Things you can do without anyone else to let it settle.',
  planCopingLabel: 'What you do',
  planCopingDetail: 'Why it helps',
  planDistractionTitle: 'Where you can go',
  planDistractionIntro: 'Places or people that take your mind somewhere else for a while.',
  planDistractionLabel: 'Where or who',
  planDistractionDetail: 'When that suits',
  planHelpTitle: 'Who you can call',
  planHelpIntro: 'People you may call when it gets heavy. Add their number.',
  planHelpLabel: 'Who',
  planHelpDetail: 'Number',
  planProfessionalTitle: 'Your care providers',
  planProfessionalIntro: 'Your doctor, your support worker or the out-of-hours line. With their number.',
  planProfessionalLabel: 'Who',
  planProfessionalDetail: 'Number',
  planSaferTitle: 'What you arranged',
  planSaferIntro: 'Arrangements you made to keep yourself safer.',
  planSaferLabel: 'The arrangement',
  planSaferDetail: 'With whom',

  // Verification — the admin's side
  adminTitle: 'Requests',
  adminEmpty: 'Nobody is waiting.',
  adminApprove: 'Approve',
  adminDecline: 'Do not approve',
  adminDecided: 'Decided',
  adminCheckFirst: 'Check the number against the RIZIV register before you decide.',

  onboardingWhoTitle: 'What brings you here?',
  onboardingWhoPatient: 'I am keeping track of my own days',
  onboardingWhoSupporter: 'I am following someone who is',
  onboardingWhoClinician: 'I am part of a care team',
  onboardingSupporterWhat:
    'Someone is sharing something with you here. This is their notebook, not yours.',
  onboardingSupporterSeeing:
    'You see only what they choose to share. They can change that at any moment, without saying so.',
  onboardingClinicianWhat:
    'This is your patient’s notebook. You see what they share, and when their medication changed.',
  onboardingClinicianVerify:
    'A person checks that you are a clinician. Until that has happened, you see nobody’s record.',

  // Consent
  consentTitle: 'What you are agreeing to',
  consentIntro:
    'luwte stores health data. That needs your explicit permission, and you can withdraw it later.',
  consentEssentialLabel: 'Keep an account and your settings',
  consentEssentialExplanation:
    'Your name, your language and the hour of your reminder. The app does not work without this.',
  consentHealthLabel: 'Store what you write about how you feel',
  consentHealthExplanation:
    'Mood, restlessness, flatness, sleep, medication. This is health data. It is stored in Belgium and nobody sees it unless you choose that.',
  consentEssentialFollowingExplanation:
    'Your name and your language. The app does not work without this.',
  consentRemindersFollowingExplanation:
    'A notification when someone shares something. You can turn this off later.',
  consentFollowingIntro:
    'You are about to see something about someone else’s health. One agreement comes with that.',
  consentConfidentialityLabel: 'What you read here stays with you',
  consentConfidentialityExplanation:
    'You do not pass it on, not even to family. Who else may see it is the person’s own choice.',
  consentRemindersLabel: 'Send you a reminder',
  consentRemindersExplanation:
    'One notification a day, at the hour you chose. You can turn this off later.',
  consentWatchLabel: 'Data from your watch',
  /*
   * What is read, where it stays, and what luwte does not do with it. That
   * last clause is not modesty but the MDR line: luwte may pass a measurement
   * on and may never draw a conclusion from it.
   */
  consentWatchExplanation:
    'How long you slept and what your resting heart rate was. It stays on your phone until you share it and luwte never says anything about it.',
  consentRequired: 'Needed',
  consentOptional: 'You may decline',
  consentAccept: 'Yes, that is fine',
  consentMissing: 'The first two are needed to continue.',
  consentWhereToChange: 'You can change this later under Data and privacy.',

  // Check-in
  checkinSleepHours: 'How many hours did you sleep?',
  checkinHoursSuffix: 'hours',
  checkinStart: 'Fill it in',
  checkinLater: 'Later today we will ask how it went.',
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

  // What you wrote down is yours: take it with you or let it go (GDPR 15 and 17).
  settingsData: 'Your data',
  settingsDataIntro:
    'Everything you wrote down is yours. You can take it with you or let it go.',
  settingsExport: 'Download everything',
  settingsExportExplanation:
    'One file with everything you ever filled in. It is made on your device and goes nowhere else.',
  settingsExporting: 'Collecting.',
  settingsDelete: 'Delete everything',
  settingsDeleteExplanation:
    'Your logbook, your medication, your circle and your account. After that there is nothing left.',
  settingsDeleteConfirm: 'Do you really want to delete everything?',
  settingsDeleteConfirmAction: 'Yes, delete everything',
  settingsDeleteCancel: 'Not now',
  settingsDeleting: 'Deleting.',
  /*
   * Firebase refuses to delete a sign-in that is too old. The data is already
   * gone by then, so say that first — otherwise it reads as nothing happened.
   */
  settingsDeleteSignInAgain:
    'Your data is gone. Sign in again to remove your sign-in as well.',

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
  medicationByClinician: 'Your care team set this one.',
  doseNoteAsk: 'Took something different?',
  doseNoteSaid: 'You wrote something about this',
  doseNoteTitle: 'What did you actually take?',
  doseNoteActual: 'What you took',
  doseNoteActualHint: 'For example: half, or 150 mg.',
  doseNoteWhy: 'Why, if you want to write it down',
  medicationPropose: 'Ask for a change',
  medicationProposeIntro:
    'Your care team set this one, so they look at it first. Write down what you would want instead.',
  medicationProposeNote: 'Why?',
  medicationProposeNoteHint: 'In your own words. Only your care team reads this.',
  medicationStopping: 'I would like to stop taking this',
  medicationProposeSend: 'Send',
  medicationProposePending: 'You asked for a change. Your care team is looking at it.',
  medicationPrescriberGone:
    'Whoever set this one no longer follows you here. You can look after this line yourself again.',
  medicationRelease: 'Look after it myself',
  medicationOnlyClinician: 'Only your care team sees your medication.',

  consolePendingTitle: 'Changes asked for',
  consolePendingBy: 'Asked for by the person themselves.',
  consoleApprove: 'Make the change',
  consoleDeclineChange: 'Leave it',

  // Optional practices — offered, never tracked
  practicesTitle: 'If you feel like it',
  practiceGratitude: 'Write down something that went alright today.',
  practiceBreathing: 'Breathe slowly for a minute.',
  practiceGrounding: 'Look around for a moment and count along.',
  practiceWalk: 'Step outside for a moment.',

  // Breathing — short, eyes open, and nothing about it is recorded.
  breathingTitle: 'Breathing',
  breathingIntro: 'Four slow breaths. You can stop whenever you want.',
  breathingIn: 'in',
  breathingHold: 'hold',
  breathingOut: 'out',
  breathingStart: 'Start',
  breathingStop: 'Stop',
  breathingDone: 'Done.',
  breathingProgress: 'How many breaths you have had',

  // Grounding — 5-4-3-2-1. Every step points outwards, at the room.
  groundingTitle: 'A look around',
  groundingIntro: 'Count in your head. There is nothing to fill in.',
  groundingSee: 'things you can see',
  groundingHear: 'things you can hear',
  groundingTouch: 'things you can feel',
  groundingSmell: 'things you can smell',
  groundingTaste: 'thing you can taste',
  groundingNext: 'Next',
  groundingDone: 'Done.',

  // Insights
  insightsTitle: 'Overview',
  insightsWindow2: '2 weeks',
  insightsWindow6: '6 weeks',
  insightsWindow12: '12 weeks',
  insightsEmpty: 'Nothing to show yet. That will come.',
  insightsChartLabel: 'Chart of your mood, restlessness, flatness and sleep',
  diaryTitle: 'What you wrote down',
  diaryEmpty: "You haven't written anything down yet.",
  adherenceLabel: 'Medication taken',
  reportDoseNotes: 'Days when something different was taken',

  // Report — printed, taken to an appointment
  reportTitle: 'For your appointment',
  reportOpen: 'Make an overview',
  reportPrint: 'Save or print',
  reportExplanation:
    'This makes a sheet you can take with you or send on. It is made on your own device and goes nowhere else.',
  reportPeriod: 'Period',

  // PRD 6.4 — per person, in plain sentences. Never as toggle labels.
  permCheckins: 'Can see how you felt.',
  // D29 — two sentences, because they are two questions. Somebody may see
  // what you take without seeing whether you took it.
  permMedication: 'Can see which medication you take.',
  permDoses: 'Can see whether you took your medication.',
  permHealth: 'Can see what your watch reported.',
  permFeed: 'Can see what you share and can respond.',
  permCalendar: 'Can see your calendar and suggest something.',
  permPlan: 'Can read what you do when things get harder.',

  // D29 — turning something about medication on is confirmed in words.
  // Turning it off is not: taking access away needs no explanation.
  confirmTitle: 'What this means',
  confirmMedication: 'will then see which medication you take and what for.',
  confirmDoses: 'will then see, every day, whether you took your medication.',
  confirmNeverPushed:
    'Nobody is sent anything when you take something or skip it. They can look it up, and that is all.',
  confirmYes: 'Yes, that is fine',
  confirmNo: 'Rather not',

  // What you changed about who sees what. Only you see this list.
  permLogTitle: 'What you changed',
  permLogLink: 'What you changed',
  permLogIntro: 'What you gave to whom and when. Only you see this.',
  permLogEmpty: 'You have not changed anything yet.',
  permLogGave: 'Given',
  permLogTook: 'Withdrawn',

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
  circleRoleClinician: 'Doctor',
  // D30 — reads your medication if you grant it, never prescribes, and
  // suggests rather than schedules. The same as someone close.
  circleRoleNurse: 'Nurse',
  circleRoleNurseNote: 'Cannot prescribe medication and suggests rather than schedules.',
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

  // The clinician's console
  consoleTitle: 'The people you follow',
  consoleEmpty: 'Nobody has given you access yet.',
  consoleOpen: 'Open',
  consoleNoName: 'No name given',
  consoleCaveat:
    'This is what this person wrote down themselves. It is not a measurement and not a conclusion.',
  consoleNothingShared: 'This person does not share any of this.',
  consoleMedicationTitle: 'What you prescribe',
  consoleMedicationOwn: 'This line is the person’s own note.',
  consoleMedicationMine: 'This line is in your name.',
  consoleTakeOver: 'Take this on',
  consoleSaveChange: 'Save the change',
  consoleChangeLog: 'What changed',
  consoleBackToOwn: 'Back to your own luwte',

  // The calendar
  calendarTitle: 'Your calendar',
  calendarEmptyDay: 'Nothing planned.',
  calendarAdd: 'Plan something',
  calendarViewLabel: 'View',
  calendarViewDay: 'Day',
  calendarViewWeek: 'Week',
  calendarPrevious: 'Earlier',
  calendarNext: 'Later',
  calendarBackToToday: 'Back to today',
  calendarUntimed: 'No set time',
  calendarWhat: 'What are you doing?',
  calendarWhen: 'What time',
  calendarWhenHint: 'You can leave this empty.',
  calendarWithPerson: 'With whom',
  calendarRepeat: 'Repeat',
  calendarRepeatNever: 'Once',
  calendarRepeatDaily: 'Every day',
  calendarRepeatWeekly: 'Every week',
  calendarRepeatWeekdays: 'On weekdays',
  calendarRepeatFortnightly: 'Every two weeks',
  calendarRepeatMonthly: 'Every month',
  calendarRepeatYearly: 'Every year',
  calendarSave: 'Save',
  calendarToday: 'Today',

  // What you think beforehand. Optional, and shown later beside how it went.
  calendarExpect: 'What do you think it will be like?',
  calendarExpectHint: 'You can skip this. Later you see it beside how it went.',
  calendarExpectPleasure: 'How pleasant, do you think?',
  calendarExpectMastery: 'How hard, do you think?',

  // Suggestions from someone else — separate, and never straight onto the day
  suggestionsTitle: 'Suggested',
  suggestionsIntro: 'Someone in your circle suggested this. You decide whether it happens.',
  suggestionsEmpty: 'Nothing waiting.',
  suggestionsAccept: 'Put it in',
  suggestionsDecline: 'Rather not',
  suggestionsPending: 'Suggested',
  suggestBadge: 'Suggestion',

  // How it went, afterwards. Two taps, and skipping is always fine.
  ratingTitle: 'How was it?',
  ratingPleasure: 'How did it feel?',
  ratingMastery: 'How hard was it?',
  ratingSkip: 'Never mind',
  ratingSave: 'Save',
  ratingExpected: 'Beforehand you thought this',
  // Short nouns: the questions are past tense, and "beforehand you thought
  // this: how did it feel?" does not read.
  ratingPleasureShort: 'pleasant',
  ratingMasteryShort: 'hard',
  activityDone: 'Done',
  activityMarkDone: 'I did this',

  // The feed — what you shared, and what your circle sends back
  feedTitle: 'Shared',
  feedShared: 'Done',
  feedWrite: 'Share something',
  feedPlaceholder: 'Whatever you like',
  feedPost: 'Share',
  feedComment: 'Say something back',
  feedCommentPlaceholder: 'Whatever you like',
  feedCommentSend: 'Send',
  reactionHeart: 'Heart',
  reactionClap: 'Applause',
  reactionProud: 'Proud',

  settingsSharing: 'What you share',
  shareCompletionsLabel: 'Share what you finished',
  shareCompletionsExplanation:
    'Whoever you let see the feed sees what you planned and did. Your medication is never part of it.',

  // The side of someone who supports another person
  followingTitle: 'Who you follow',
  followingEmpty: 'Nobody shares anything with you yet.',
  followingOpen: 'Open',
  followingSuggest: 'Suggest something',
  followingSuggestIntro:
    'What you suggest sits on its own, not straight into the calendar. That person decides.',
  followingSuggestSent: 'Suggested. That person decides.',
  followingCalendar: 'What is planned',
};
