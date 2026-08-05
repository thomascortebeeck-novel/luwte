/**
 * Dutch is the source of truth for every string in luwte. BRAND.md section 4.2
 * is reproduced here verbatim; en.ts mirrors the voice, not the words.
 *
 * One deliberate deviation from BRAND 4.2: the wordmark is written `luwte`
 * lowercase, per BRAND 1 ("always lowercase, never capitalised"). The copy
 * library in BRAND 4.2 writes "Luwte" mid-sentence, which contradicts it.
 * The explicit rule wins and copy-lint enforces it.
 */
export const nl = {
  appTagline: 'Uit de wind.',

  onboardingWhat: 'Dit is geen dokter. Dit is een schriftje dat onthoudt wat jij vergeet.',
  onboardingSharing: 'Jij bepaalt wie wat ziet. Altijd. Je kan het elk moment veranderen.',

  checkinEntry: 'Hoe was vandaag?',
  checkinMood: 'Hoe voelde je je?',
  checkinEnergy: 'Hoeveel energie had je?',
  checkinSleep: 'Hoe heb je geslapen?',
  checkinAnxiety: 'Hoe onrustig was het?',
  checkinFlatness: 'Kon je vandaag iets voelen?',
  checkinDiary: 'Iets dat je wil onthouden van vandaag?',
  checkinDone: 'Bewaard.',

  todayEmpty: 'Vandaag staat er niets. Dat mag.',
  optionalPractice: 'Als je zin hebt.',
  medicationSection: 'Wat je vandaag neemt, en waarvoor.',

  feedEmpty: 'Nog niets vandaag.',
  kudosSent: 'Verstuurd.',

  insightsHeader: 'De laatste twee weken.',
  insightsCaveat: 'Dit zijn geen conclusies. Dit is wat je hebt opgeschreven.',
  windlineLabel: 'Overzicht van de laatste veertien dagen',

  healthImportAsk:
    'Je horloge weet wanneer je sliep. Wil je dat luwte dat overneemt, zodat je het niet hoeft in te vullen?',
  dataDeletion: 'Weg is weg. Dat kunnen we niet terugdraaien.',

  genericError: 'Dat is niet gelukt. Probeer het straks nog eens.',
  offline: 'Geen verbinding. Wat je invult wordt bewaard en later verstuurd.',

  // BRAND 4.4 — the one surface where the voice is direct. No metaphor, no softness.
  crisisTitle: 'Als het nu te zwaar is, bel iemand.',
  crisisZelfmoordlijn: 'Zelfmoordlijn',
  crisisCps: 'Centre de Prévention du Suicide',
  crisisEmergency: 'Noodgeval',
  crisisCallAction: 'Bellen',

  navToday: 'Vandaag',
  navCrisis: 'Hulp nu',
  navBack: 'Terug',

  settingsTheme: 'Licht of donker',
  settingsLocale: 'Taal',
  themeDark: 'Donker',
  themeLight: 'Licht',

  scaleLow: 'weinig',
  scaleHigh: 'veel',
  scaleStep1: 'heel weinig',
  scaleStep2: 'weinig',
  scaleStep3: 'eerder weinig',
  scaleStep4: 'ertussenin',
  scaleStep5: 'eerder veel',
  scaleStep6: 'veel',
  scaleStep7: 'heel veel',

  styleguideTitle: 'Stijlgids',

  // Auth
  signInTitle: 'Welkom',
  signInEmailLabel: 'Je e-mailadres',
  signInSendLink: 'Stuur me een link',
  signInLinkSent: 'Kijk in je mailbox. De link blijft een uur geldig.',
  signInUsePassword: 'Liever een wachtwoord',
  signInUseLink: 'Liever een link in je mail',
  signInPasswordLabel: 'Wachtwoord',
  signInSubmit: 'Aanmelden',
  signInInvalidEmail: 'Dat lijkt geen e-mailadres.',
  signInFailed: 'Aanmelden is niet gelukt. Probeer het straks nog eens.',
  signOut: 'Afmelden',

  // Onboarding
  onboardingNext: 'Verder',
  onboardingNameTitle: 'Hoe mogen we je noemen?',
  onboardingNameLabel: 'Je naam',
  onboardingHourTitle: 'Wanneer past het om even stil te staan bij je dag?',
  onboardingHourExplanation:
    'Eén herinnering per dag. Mis je ze, dan gebeurt er niets.',
  onboardingFinish: 'Klaar',

  // Consent
  consentTitle: 'Waar je ja tegen zegt',
  consentIntro:
    'luwte bewaart gezondheidsgegevens. Daar heb je uitdrukkelijk toestemming voor nodig, en die kan je later weer intrekken.',
  consentEssentialLabel: 'Een account en je instellingen bewaren',
  consentEssentialExplanation:
    'Je naam, je taal en het uur van je herinnering. Zonder dit werkt de app niet.',
  consentHealthLabel: 'Bewaren wat je invult over hoe je je voelt',
  consentHealthExplanation:
    'Stemming, energie, slaap, onrust, medicatie. Dit zijn gezondheidsgegevens. Ze staan in België en niemand ziet ze tenzij jij dat kiest.',
  consentRemindersLabel: 'Je een herinnering sturen',
  consentRemindersExplanation:
    'Eén melding per dag op het uur dat jij koos. Je kan dit later uitzetten.',
  consentRequired: 'Nodig',
  consentOptional: 'Mag je weigeren',
  consentAccept: 'Ja, dat mag',
  consentMissing: 'De eerste twee zijn nodig om verder te kunnen.',
  consentWhereToChange: 'Je kan dit later veranderen bij Gegevens en privacy.',

  // Check-in
  checkinSleepHours: 'Hoeveel uur heb je geslapen?',
  checkinHoursSuffix: 'uur',
  checkinStart: 'Invullen',
  checkinSave: 'Bewaren',
  checkinBack: 'Terug',
  checkinSkip: 'Overslaan',
  checkinDiaryPlaceholder: 'Wat je maar wil',
  checkinEdit: 'Aanpassen',
  checkinDoneToday: 'Je hebt vandaag ingevuld.',
  checkinLocked: 'Deze dag is afgesloten.',

  // The weekly extra, once a week, inline after the daily items
  weeklyIntro: 'Nog vier vragen. Die komen één keer per week.',
  weeklyRestlessness: 'Hoe rusteloos voelde je lichaam?',
  weeklyStiffness: 'Hoe stijf voelde je lichaam?',
  weeklySedation: 'Hoe suf was je overdag?',
  weeklyHopelessness: 'Hoe uitzichtloos voelde het?',

  // Settings and notifications
  settingsTitle: 'Instellingen',
  settingsNotifications: 'Meldingen',
  settingsNotificationsIntro:
    'Je kan elke melding apart uitzetten. Staan ze allemaal uit, dan werkt de app gewoon verder.',
  settingsAllowNotifications: 'Meldingen toelaten',
  settingsNotificationsBlocked:
    'Je browser laat geen meldingen toe. Dat kan je daar aanpassen.',
  settingsReminderHour: 'Je herinnering',
  settingsSaved: 'Bewaard.',

  notifyCheckinLabel: 'Je dagelijkse herinnering',
  notifyCheckinExplanation: 'Eén melding, op het uur dat jij koos. Mis je ze, dan gebeurt er niets.',
  notifyMedicationLabel: 'Je medicatie',
  notifyMedicationExplanation: 'Een melding op de uren die op je medicatie staan.',
  notifyKudosLabel: 'Als iemand iets laat weten',
  notifyKudosExplanation: 'Wanneer iemand uit je kring reageert op wat je deelde.',
  notifySupportedActivityLabel: 'Als iemand die je volgt iets deed',
  notifySupportedActivityExplanation:
    'Wanneer iemand die jij steunt iets afrondde dat gepland stond. Dit werkt alleen als die persoon je zijn overzicht liet zien.',

  // Calendar
  calendarAddReminder: 'Zet in Google Agenda',
  calendarExplanation:
    'Dit opent Google Agenda met alles al ingevuld. luwte krijgt geen toegang tot je agenda en bewaart niets.',
  calendarEventTitle: 'luwte',
  calendarEventDetails: 'Even stilstaan bij je dag.',

  // Medication
  medicationEmpty: 'Hier komt wat je neemt, als je het invult.',
  medicationAdd: 'Medicatie toevoegen',
  medicationName: 'Naam',
  medicationDose: 'Dosis',
  medicationTimes: 'Wanneer',
  medicationPurpose: 'Waarvoor het is',
  medicationPurposeHint: 'In gewone woorden. Je dokter kan dit later aanvullen.',
  medicationSave: 'Bewaren',
  medicationTaken: 'Genomen',
  medicationHistory: 'Wat er veranderde',
  medicationByClinician: 'Dit zette je zorgverlener klaar.',
  medicationPropose: 'Vraag een wijziging',
  medicationProposeIntro:
    'Je zorgverlener zette dit klaar, dus die kijkt er eerst naar. Schrijf op wat je anders zou willen.',
  medicationProposeNote: 'Waarom?',
  medicationProposeNoteHint: 'In je eigen woorden. Alleen je zorgverlener leest dit.',
  medicationStopping: 'Ik zou hiermee willen stoppen',
  medicationProposeSend: 'Versturen',
  medicationProposePending: 'Je vroeg een wijziging. Je zorgverlener kijkt ernaar.',
  medicationPrescriberGone:
    'Wie dit klaarzette, volgt je hier niet meer op. Je kan deze lijn weer zelf beheren.',
  medicationRelease: 'Weer zelf beheren',
  medicationOnlyClinician: 'Alleen je zorgverlener ziet je medicatie.',

  consolePendingTitle: 'Gevraagde wijzigingen',
  consolePendingBy: 'Gevraagd door de persoon zelf.',
  consoleApprove: 'Doorvoeren',
  consoleDeclineChange: 'Niet doen',

  // Optional practices — offered, never tracked
  practicesTitle: 'Als je zin hebt',
  practiceGratitude: 'Schrijf iets op dat vandaag meeviel.',
  practiceBreathing: 'Adem een minuut traag in en uit.',
  practiceWalk: 'Ga even naar buiten.',

  // Insights
  insightsTitle: 'Overzicht',
  insightsWindow2: '2 weken',
  insightsWindow6: '6 weken',
  insightsWindow12: '12 weken',
  insightsEmpty: 'Nog niets om te tonen. Dat komt vanzelf.',
  insightsChartLabel: 'Grafiek van je stemming, energie, vlakheid en slaap',
  diaryTitle: 'Wat je opschreef',
  diaryEmpty: 'Je hebt nog niets opgeschreven.',
  adherenceLabel: 'Medicatie genomen',

  // Report — printed, taken to an appointment
  reportTitle: 'Voor je afspraak',
  reportOpen: 'Maak een overzicht',
  reportPrint: 'Opslaan of afdrukken',
  reportExplanation:
    'Dit maakt een blad dat je kan meenemen of doorsturen. Het wordt op je eigen toestel gemaakt en gaat nergens anders heen.',
  reportPeriod: 'Periode',

  // PRD 6.4 — per persoon, in gewone zinnen. Nooit als labels van schakelaars.
  permCheckins: 'Kan zien hoe je je voelde.',
  permMedication: 'Kan zien wat je neemt en of je het nam.',
  permHealth: 'Kan zien wat je horloge doorgaf.',
  permFeed: 'Kan zien wat je deelt, en kan reageren.',
  permCalendar: 'Kan je agenda zien en iets voorstellen.',

  // De kring — wie iets ziet, en wat precies
  circleTitle: 'Wie iets ziet',
  circleIntro: 'Jij bepaalt wie wat ziet. Je kan het elk moment veranderen.',
  circleEmpty: 'Nog niemand ziet iets. Dat mag.',
  circleAdd: 'Iemand uitnodigen',
  circleWhatTheySee: 'Wat deze persoon ziet',
  circleSeesNothing: 'Ziet nog niets van wat je invult.',
  circleRevoked: 'Ziet niets meer.',
  circleChange: 'Aanpassen',
  circleRevoke: 'Toegang stoppen',
  circleRestore: 'Weer toelaten',
  circleRoleSupporter: 'Naaste',
  circleRoleClinician: 'Zorgverlener',
  circleRelation: 'Wie is dit voor jou?',
  circleRelationHint: 'Bijvoorbeeld broer, mama, psychiater.',
  circleOpenInvites: 'Uitnodigingen die openstaan',
  circleInviteWaiting: 'Nog niet aangenomen.',
  circleInviteWithdraw: 'Intrekken',

  // Uitnodigen
  inviteTitle: 'Iemand uitnodigen',
  inviteWho: 'Wie nodig je uit?',
  inviteWhatTheySee: 'Wat deze persoon mag zien',
  inviteCreate: 'Maak een link',
  inviteReady: 'Stuur deze link naar wie je uitnodigt. Ze blijft zeven dagen geldig en werkt één keer.',
  inviteCopy: 'Kopieer de link',
  inviteCopied: 'Gekopieerd.',

  // Aannemen, aan de kant van wie uitgenodigd wordt
  joinTitle: 'Je bent uitgenodigd',
  joinExplain: 'Als je dit aanneemt, zie je het volgende:',
  joinNothingYet: 'Voorlopig zie je nog niets. Dat kan later veranderen.',
  joinAccept: 'Aannemen',
  joinSignIn: 'Meld je eerst aan. Daarna kan je dit aannemen.',
  joinDone: 'Klaar. Je hebt nu toegang.',
  joinUnusable: 'Deze link werkt niet meer. Vraag er een nieuwe.',

  // De console van de zorgverlener
  consoleTitle: 'Wie je opvolgt',
  consoleEmpty: 'Nog niemand heeft je toegang gegeven.',
  consoleOpen: 'Bekijken',
  consoleNoName: 'Zonder naam',
  consoleCaveat:
    'Dit is wat deze persoon zelf opschreef. Het zijn geen metingen en geen conclusies.',
  consoleNothingShared: 'Deze persoon deelt hier niets van.',
  consoleMedicationTitle: 'Wat je voorschrijft',
  consoleMedicationOwn: 'Deze regel schreef de persoon zelf op.',
  consoleMedicationMine: 'Deze regel staat op jouw naam.',
  consoleTakeOver: 'Overnemen',
  consoleSaveChange: 'Wijziging bewaren',
  consoleChangeLog: 'Wat er veranderde',
  consoleBackToOwn: 'Naar je eigen luwte',

  // De agenda
  calendarTitle: 'Je week',
  calendarEmptyDay: 'Niets gepland.',
  calendarAdd: 'Iets plannen',
  calendarWhat: 'Wat ga je doen?',
  calendarWhen: 'Hoe laat',
  calendarWhenHint: 'Mag je ook leeg laten.',
  calendarWithPerson: 'Met wie',
  calendarRepeat: 'Herhalen',
  calendarRepeatNever: 'Eén keer',
  calendarRepeatDaily: 'Elke dag',
  calendarRepeatWeekly: 'Elke week',
  calendarRepeatWeekdays: 'Op weekdagen',
  calendarSave: 'Bewaren',
  calendarToday: 'Vandaag',

  // Voorstellen van iemand anders — apart, en nooit meteen in de agenda
  suggestionsTitle: 'Voorgesteld',
  suggestionsIntro: 'Iemand uit je kring stelde dit voor. Jij beslist of het doorgaat.',
  suggestionsEmpty: 'Er staat niets open.',
  suggestionsAccept: 'Zet het erin',
  suggestionsDecline: 'Liever niet',
  suggestionsPending: 'Voorgesteld',
  suggestBadge: 'Voorstel',

  // Wat je ervan vond, na afloop. Twee tikken, en overslaan mag altijd.
  ratingTitle: 'Hoe was het?',
  ratingPleasure: 'Hoe voelde het?',
  ratingMastery: 'Hoe zwaar was het?',
  ratingSkip: 'Laat maar',
  ratingSave: 'Bewaren',
  activityDone: 'Gedaan',
  activityMarkDone: 'Dit heb ik gedaan',

  // De feed — wat je deelde, en wat je kring terugstuurt
  feedTitle: 'Gedeeld',
  feedShared: 'Gedaan',
  feedWrite: 'Iets delen',
  feedPlaceholder: 'Wat je maar wil',
  feedPost: 'Delen',
  feedComment: 'Iets terugzeggen',
  feedCommentPlaceholder: 'Wat je maar wil',
  feedCommentSend: 'Versturen',
  reactionHeart: 'Hart',
  reactionClap: 'Applaus',
  reactionProud: 'Trots',

  settingsSharing: 'Wat je deelt',
  shareCompletionsLabel: 'Deel wat je afrondde',
  shareCompletionsExplanation:
    'Wie je de feed liet zien, ziet wat je gepland had en deed. Je medicatie staat er nooit bij.',

  // De kant van wie iemand steunt
  followingTitle: 'Wie je volgt',
  followingEmpty: 'Nog niemand deelt iets met je.',
  followingOpen: 'Bekijken',
  followingSuggest: 'Iets voorstellen',
  followingSuggestIntro:
    'Wat je voorstelt komt apart te staan, niet meteen in de agenda. Die persoon beslist zelf.',
  followingSuggestSent: 'Voorgesteld. Die persoon beslist zelf.',
  followingCalendar: 'Wat gepland staat',
} as const satisfies Record<string, string>;
