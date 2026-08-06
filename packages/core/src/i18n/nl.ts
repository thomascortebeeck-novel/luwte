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
  // Bipolar: allebei de uiteinden zijn iets, geen tekort aan het andere.
  checkinArousal: 'Was je onrustig of eerder traag?',
  checkinArousalLow: 'traag',
  checkinArousalHigh: 'onrustig',
  checkinFlatness: 'Kon je vandaag iets voelen?',
  checkinDiary: 'Iets dat je wil onthouden van vandaag?',
  // Dezelfde vraag, anders gesteld. Eén per dag, en de eerste hierboven doet
  // gewoon mee — zodat er niets verdwijnt op de dagen dat die aan de beurt is.
  diaryPromptAlright: 'Wat viel vandaag mee?',
  diaryPromptSmall: 'Was er iets kleins dat goed was?',
  diaryPromptWho: 'Wie sprak je vandaag?',
  diaryPromptHelped: 'Waar had je vandaag iets aan?',
  diaryPromptEffort: 'Wat kostte vandaag moeite?',
  diaryPromptTomorrow: 'Is er iets dat je morgen niet wil vergeten?',
  checkinDone: 'Bewaard.',

  todayEmpty: 'Vandaag staat er niets. Dat mag.',
  optionalPractice: 'Als je zin hebt.',
  medicationSection: 'Wat je vandaag neemt en waarvoor.',

  feedEmpty: 'Nog niets vandaag.',
  kudosSent: 'Verstuurd.',

  insightsHeader: 'De laatste twee weken.',
  insightsCaveat: 'Dit zijn geen conclusies. Dit is wat je hebt opgeschreven.',
  windlineLabel: 'Overzicht van de laatste veertien dagen',

  healthImportAsk:
    'Je horloge weet wanneer je sliep. Wil je dat luwte dat overneemt zodat je het niet hoeft in te vullen?',
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
  navSections: 'Navigatie',
  navCrisis: 'Hulp nu',
  navBack: 'Terug',

  settingsTheme: 'Licht of donker',
  settingsLocale: 'Taal',
  settingsThemeIntro:
    'luwte opent donker, ook overdag. Dat is prettiger om te lezen als je slaap verstoord is.',
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
  signInGoogle: 'Verder met Google',

  // Een account maken, en aanmelden. Twee duidelijke paden in plaats van
  // raden welke van de twee je bedoelde.
  registerTitle: 'Account maken',
  registerSubmit: 'Account maken',
  registerPasswordLabel: 'Kies een wachtwoord',
  registerPasswordHint: 'Minstens acht tekens. Kies iets dat je onthoudt.',
  authSwitchToRegister: 'Nog geen account',
  authSwitchToSignIn: 'Ik heb al een account',
  authShowPassword: 'Toon wachtwoord',
  authHidePassword: 'Verberg wachtwoord',
  authForgotPassword: 'Wachtwoord vergeten',
  authResetSubmit: 'Wachtwoord opnieuw instellen',
  authResetIntro: 'We sturen je een mail waarmee je een nieuw wachtwoord kan kiezen.',
  /*
   * Zegt niet of het adres bestaat. Dat zou verklappen dat deze persoon een
   * logboek bijhoudt, en dat kan iedereen navragen zonder wachtwoord.
   */
  authResetSent: 'Is er een account met dit adres, dan staat er nu een mail in je mailbox.',
  authPasswordTooShort: 'Kies een wachtwoord van minstens acht tekens.',
  authPasswordSameAsEmail: 'Kies iets anders dan je e-mailadres.',
  authTooManyAttempts: 'Te veel pogingen na elkaar. Wacht even en probeer opnieuw.',
  authOffline: 'Geen verbinding. Aanmelden lukt alleen online.',
  authWrongCredentials: 'Dat e-mailadres of dat wachtwoord klopt niet.',
  authRegisterFailed: 'Account maken lukte niet. Heb je hier al een account, meld je dan aan.',
  signInGoogleNote:
    'Kies je Google, dan weet Google dat je luwte gebruikt. Wat je hier schrijft, ziet Google niet.',
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
  onboardingDoctorTitle: 'Kijkt er een zorgverlener met je mee?',
  onboardingDoctorExplanation:
    'Je kan die nu toevoegen of later. Is er niemand, dan beheer je je medicatie gewoon zelf.',
  onboardingDoctorNow: 'Nu toevoegen',
  onboardingDoctorLater: 'Later',
  onboardingFinish: 'Klaar',
  // Verification — the clinician's side
  verifyTitle: 'Laten nakijken dat je zorgverlener bent',
  verifyIntro:
    'Een mens kijkt dit na voor je iemand kan opvolgen. Zolang dat niet gebeurd is, zie je niemand.',
  verifyName: 'Je naam, zoals patiënten die kennen',
  verifyDiscipline: 'Wat je doet',
  verifyRiziv: 'Je RIZIV-nummer',
  verifyRizivHint: 'Elf cijfers. We kijken het na in het RIZIV-register.',
  verifyPractice: 'Waar je werkt',
  verifySend: 'Versturen',
  verifyPending: 'Je aanvraag is verstuurd. Iemand kijkt ernaar.',
  verifyDeclined: 'Je aanvraag is niet goedgekeurd. Neem contact op als je denkt dat dat fout is.',
  verifyNotYet: 'Je bent nog niet nagekeken, dus je ziet nog niemand.',
  disciplinePsychiater: 'Psychiater',
  disciplineHuisarts: 'Huisarts',
  disciplinePsycholoog: 'Psycholoog',
  disciplineVerpleegkundige: 'Verpleegkundige',
  disciplineAndere: 'Iets anders',

  // A patient adding their doctor
  findTitle: 'Je dokter toevoegen',
  findIntro: 'Kreeg je een code van je dokter? Typ die hier. Of zoek op naam.',
  findCode: 'De code van je dokter',
  findLook: 'Opzoeken',
  findUnknown: 'Die code kennen we niet. Kijk hem na of vraag hem opnieuw.',
  findConfirm: 'Klopt dat?',
  findAdd: 'Ja, dit is mijn dokter',
  findRelation: 'Wat is dit voor jou?',
  findDone: 'Toegevoegd. Je kan altijd veranderen wat die persoon ziet.',
  findWhatTheySee: 'Die ziet je check-ins en je medicatie. Jij kan dat aanpassen.',
  findByName: 'Zoeken op naam',
  findName: 'De naam van je dokter',
  findNameHint:
    'Je vindt hier alleen zorgverleners die luwte al gebruiken. Er bestaat geen lijst van alle dokters in België.',
  findSearch: 'Zoeken',
  findNobody:
    'Niemand gevonden met die naam. Vraag je dokter naar een code of nodig die uit met een link.',
  findAsk: 'Dit vragen',
  findAskWhatTheySee:
    'Zegt die persoon ja, dan ziet die je check-ins en je medicatie. Jij kan dat altijd aanpassen.',
  findAsked:
    'Gevraagd. Je dokter ziet het als die luwte opent. Er verandert niets tot die ja zegt.',
  myCodeTitle: 'Je code',
  myCodeIntro: 'Geef deze code aan iemand die je wil opvolgen.',

  // What has been asked of a clinician, in their own console
  inboxTitle: 'Vragen aan jou',
  inboxAsks: 'vraagt of je mee mag kijken.',
  inboxSees: 'Wat je dan ziet:',
  inboxAccept: 'Aannemen',
  inboxLeave:
    'Doe je niets, dan vervalt de vraag na een week. Er wordt niemand iets gezegd.',
  grantCheckins: 'Hoe het gaat, dag per dag',
  grantMedication: 'Welke medicatie er genomen wordt',
  grantDoses: 'Of de medicatie genomen is',
  grantHealth: 'Wat het horloge doorgaf',
  grantFeed: 'Wat er gedeeld wordt',
  grantCalendar: 'De agenda',
  grantPlan: 'Wat er gedaan wordt als het minder gaat',

  // Het plan — eigen woorden, eigen lijst. luwte legt hier nooit iets naast.
  planTitle: 'Als het minder gaat',
  planLink: 'Als het minder gaat',
  planIntro:
    'Waar merk je zelf het eerst aan dat het minder gaat en wat doe je dan? Je eigen woorden. luwte kijkt hier niets mee na.',
  planEmpty: 'Je hebt hier nog niets staan.',
  planSign: 'Wat merk je?',
  planAction: 'Wat doe je dan?',
  planActionHint: 'Mag je later invullen.',
  planAdd: 'Iets toevoegen',
  planSave: 'Bewaren',
  planRemove: 'Weghalen',
  planExamples: 'Bijvoorbeeld',
  planExampleSleep: 'Ik slaap minder dan vijf uur, twee nachten na elkaar.',
  planExampleWithdraw: 'Ik neem de telefoon niet meer op.',
  planExampleThoughts: 'Mijn gedachten gaan sneller dan ik ze kan volgen.',
  planExampleMedication: 'Ik denk dat ik mijn medicatie niet meer nodig heb.',
  planShared: 'Wat deze persoon geschreven heeft voor als het minder gaat.',

  // Verification — the admin's side
  adminTitle: 'Aanvragen',
  adminEmpty: 'Er wacht niemand.',
  adminApprove: 'Goedkeuren',
  adminDecline: 'Niet goedkeuren',
  adminDecided: 'Beslist',
  adminCheckFirst: 'Kijk het nummer na in het RIZIV-register voor je beslist.',

  onboardingWhoTitle: 'Wat breng je hier?',
  onboardingWhoPatient: 'Ik hou zelf iets bij',
  onboardingWhoSupporter: 'Ik volg iemand die dat doet',
  onboardingWhoClinician: 'Ik ben zorgverlener',
  onboardingSupporterWhat:
    'Iemand deelt hier iets met jou. Dit is hun schriftje, niet het jouwe.',
  onboardingSupporterSeeing:
    'Je ziet alleen wat zij kiezen te delen. Zij kunnen dat elk moment veranderen zonder het te zeggen.',
  onboardingClinicianWhat:
    'Dit is het schriftje van je patiënt. Je ziet wat zij delen en wanneer hun medicatie veranderde.',
  onboardingClinicianVerify:
    'Een mens kijkt na of je zorgverlener bent. Tot dat gebeurd is, zie je nog niets van iemand.',

  // Consent
  consentTitle: 'Waar je ja tegen zegt',
  consentIntro:
    'luwte bewaart gezondheidsgegevens. Daar heb je uitdrukkelijk toestemming voor nodig en die kan je later weer intrekken.',
  consentEssentialLabel: 'Een account en je instellingen bewaren',
  consentEssentialExplanation:
    'Je naam, je taal en het uur van je herinnering. Zonder dit werkt de app niet.',
  consentHealthLabel: 'Bewaren wat je invult over hoe je je voelt',
  consentHealthExplanation:
    'Stemming, onrust, vlakheid, slaap, medicatie. Dit zijn gezondheidsgegevens. Ze staan in België en niemand ziet ze tenzij jij dat kiest.',
  consentEssentialFollowingExplanation:
    'Je naam en je taal. Zonder dit werkt de app niet.',
  consentRemindersFollowingExplanation:
    'Een melding wanneer iemand iets deelt. Je kan dit later uitzetten.',
  consentFollowingIntro:
    'Je krijgt iets te zien over de gezondheid van iemand anders. Daar hoort één afspraak bij.',
  consentConfidentialityLabel: 'Wat je hier leest, blijft bij jou',
  consentConfidentialityExplanation:
    'Je deelt het niet verder, ook niet met familie. Wie het nog mag zien, kiest de persoon zelf.',
  consentRemindersLabel: 'Je een herinnering sturen',
  consentRemindersExplanation:
    'Eén melding per dag op het uur dat jij koos. Je kan dit later uitzetten.',
  consentWatchLabel: 'Gegevens van je horloge',
  /*
   * Wat er gelezen wordt, waar het blijft en wat luwte er niet mee doet. Die
   * laatste zin is geen bescheidenheid maar de MDR-lijn: luwte mag een
   * meting doorgeven en er nooit zelf iets uit besluiten.
   */
  consentWatchExplanation:
    'Hoe lang je sliep en wat je hartslag in rust was. Dat blijft op je telefoon tot jij het deelt en luwte zegt er nooit iets over.',
  consentRequired: 'Nodig',
  consentOptional: 'Mag je weigeren',
  consentAccept: 'Ja, dat mag',
  consentMissing: 'De eerste twee zijn nodig om verder te kunnen.',
  consentWhereToChange: 'Je kan dit later veranderen bij Gegevens en privacy.',

  // Check-in
  checkinSleepHours: 'Hoeveel uur heb je geslapen?',
  checkinHoursSuffix: 'uur',
  checkinStart: 'Invullen',
  checkinLater: 'Later vandaag vragen we hoe het ging.',
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

  // Wat je opschreef is van jou: meenemen of laten verdwijnen (AVG art. 15 en 17).
  settingsData: 'Je gegevens',
  settingsDataIntro: 'Alles wat je opschreef is van jou. Je kan het meenemen of laten verdwijnen.',
  settingsExport: 'Alles downloaden',
  settingsExportExplanation:
    'Eén bestand met alles wat je ooit invulde. Het wordt op je toestel gemaakt en gaat nergens langs.',
  settingsExporting: 'Bezig met verzamelen.',
  settingsDelete: 'Alles verwijderen',
  settingsDeleteExplanation:
    'Je logboek, je medicatie, je kring en je account. Daarna is er niets meer.',
  settingsDeleteConfirm: 'Wil je echt alles verwijderen?',
  settingsDeleteConfirmAction: 'Ja, verwijder alles',
  settingsDeleteCancel: 'Toch niet',
  settingsDeleting: 'Bezig met verwijderen.',
  /*
   * Firebase weigert het verwijderen van een aanmelding die te lang geleden
   * is. De gegevens zijn dan al weg, dus dat eerst zeggen — anders lijkt het
   * alsof er niets gebeurd is.
   */
  settingsDeleteSignInAgain:
    'Je gegevens zijn weg. Meld je opnieuw aan om ook je aanmelding te verwijderen.',

  notifyCheckinLabel: 'Je dagelijkse herinnering',
  notifyCheckinExplanation: 'Eén melding op het uur dat jij koos. Mis je ze, dan gebeurt er niets.',
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
  medicationEmpty: 'Hier komt wat je neemt als je het invult.',
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
  doseNoteAsk: 'Iets anders genomen?',
  doseNoteSaid: 'Je schreef er iets bij',
  doseNoteTitle: 'Wat nam je echt?',
  doseNoteActual: 'Wat je nam',
  doseNoteActualHint: 'Bijvoorbeeld: de helft of 150 mg.',
  doseNoteWhy: 'Waarom, als je dat wil opschrijven',
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
  practiceGrounding: 'Kijk even rond en tel mee.',
  practiceWalk: 'Ga even naar buiten.',

  // Ademen — kort, met open ogen, en er wordt niets van bijgehouden.
  breathingTitle: 'Ademen',
  breathingIntro: 'Vier keer traag in en uit. Je mag altijd stoppen.',
  breathingIn: 'in',
  breathingHold: 'houd vast',
  breathingOut: 'uit',
  breathingStart: 'Beginnen',
  breathingStop: 'Stoppen',
  breathingDone: 'Klaar.',
  breathingProgress: 'Hoeveel ademhalingen je gehad hebt',

  // Gronden — 5-4-3-2-1. Alles wijst naar buiten, naar de kamer.
  groundingTitle: 'Even rondkijken',
  groundingIntro: 'Tel in je hoofd. Er hoeft niets ingevuld te worden.',
  groundingSee: 'dingen die je ziet',
  groundingHear: 'dingen die je hoort',
  groundingTouch: 'dingen die je kan voelen',
  groundingSmell: 'dingen die je ruikt',
  groundingTaste: 'ding dat je proeft',
  groundingNext: 'Verder',
  groundingDone: 'Klaar.',

  // Insights
  insightsTitle: 'Overzicht',
  insightsWindow2: '2 weken',
  insightsWindow6: '6 weken',
  insightsWindow12: '12 weken',
  insightsEmpty: 'Nog niets om te tonen. Dat komt vanzelf.',
  insightsChartLabel: 'Grafiek van je stemming, onrust, vlakheid en slaap',
  diaryTitle: 'Wat je opschreef',
  diaryEmpty: 'Je hebt nog niets opgeschreven.',
  adherenceLabel: 'Medicatie genomen',
  reportDoseNotes: 'Dagen waarop er iets anders genomen is',

  // Report — printed, taken to an appointment
  reportTitle: 'Voor je afspraak',
  reportOpen: 'Maak een overzicht',
  reportPrint: 'Opslaan of afdrukken',
  reportExplanation:
    'Dit maakt een blad dat je kan meenemen of doorsturen. Het wordt op je eigen toestel gemaakt en gaat nergens anders heen.',
  reportPeriod: 'Periode',

  // PRD 6.4 — per persoon, in gewone zinnen. Nooit als labels van schakelaars.
  permCheckins: 'Kan zien hoe je je voelde.',
  // D29 — twee zinnen, want het zijn twee vragen. Iemand mag zien wat je
  // neemt zonder te zien of je het nam.
  permMedication: 'Kan zien welke medicatie je neemt.',
  permDoses: 'Kan zien of je je medicatie nam.',
  permHealth: 'Kan zien wat je horloge doorgaf.',
  permFeed: 'Kan zien wat je deelt en kan reageren.',
  permCalendar: 'Kan je agenda zien en iets voorstellen.',
  permPlan: 'Kan lezen wat je doet als het minder gaat.',

  // D29 — iets over medicatie aanzetten wordt in woorden bevestigd. Iets
  // uitzetten niet: wie toegang intrekt hoeft niets uit te leggen.
  confirmTitle: 'Wat dit betekent',
  confirmMedication: 'ziet dan welke medicatie je neemt en waarvoor.',
  confirmDoses: 'ziet dan elke dag of je je medicatie nam.',
  confirmNeverPushed:
    'Er wordt niemand iets gestuurd als je iets neemt of overslaat. Ze kunnen het opzoeken, meer niet.',
  confirmYes: 'Ja, dat mag',
  confirmNo: 'Toch niet',

  // Wat je zelf veranderd hebt aan wie wat ziet. Alleen jij ziet deze lijst.
  permLogTitle: 'Wat je veranderde',
  permLogLink: 'Wat je veranderde',
  permLogIntro: 'Wat je aan wie gaf en wanneer. Alleen jij ziet dit.',
  permLogEmpty: 'Je hebt nog niets veranderd.',
  permLogGave: 'Gegeven',
  permLogTook: 'Ingetrokken',

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
  circleRoleClinician: 'Arts',
  // D30 — leest je medicatie als je dat geeft, schrijft ze nooit voor, en
  // stelt voor in plaats van in te plannen. Net als een naaste.
  circleRoleNurse: 'Verpleegkundige',
  circleRoleNurseNote: 'Kan geen medicatie voorschrijven en stelt voor in plaats van in te plannen.',
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
  calendarTitle: 'Je agenda',
  calendarEmptyDay: 'Niets gepland.',
  calendarAdd: 'Iets plannen',
  calendarViewLabel: 'Weergave',
  calendarViewDay: 'Dag',
  calendarViewWeek: 'Week',
  calendarPrevious: 'Eerder',
  calendarNext: 'Later',
  calendarBackToToday: 'Terug naar vandaag',
  calendarUntimed: 'Zonder tijdstip',
  calendarWhat: 'Wat ga je doen?',
  calendarWhen: 'Hoe laat',
  calendarWhenHint: 'Mag je ook leeg laten.',
  calendarWithPerson: 'Met wie',
  calendarRepeat: 'Herhalen',
  calendarRepeatNever: 'Eén keer',
  calendarRepeatDaily: 'Elke dag',
  calendarRepeatWeekly: 'Elke week',
  calendarRepeatWeekdays: 'Op weekdagen',
  calendarRepeatFortnightly: 'Om de twee weken',
  calendarRepeatMonthly: 'Elke maand',
  calendarRepeatYearly: 'Elk jaar',
  calendarSave: 'Bewaren',
  calendarToday: 'Vandaag',

  // Wat je vooraf denkt. Optioneel, en later zie je het naast hoe het ging.
  calendarExpect: 'Hoe denk je dat het zal zijn?',
  calendarExpectHint: 'Mag je overslaan. Later zie je dit naast hoe het ging.',
  calendarExpectPleasure: 'Hoe aangenaam, denk je?',
  calendarExpectMastery: 'Hoe zwaar, denk je?',

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
  ratingExpected: 'Vooraf dacht je dit',
  // Korte naamwoorden, want de vragen staan in de verleden tijd en "vooraf
  // dacht je dit: hoe voelde het?" loopt niet.
  ratingPleasureShort: 'aangenaam',
  ratingMasteryShort: 'zwaar',
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
