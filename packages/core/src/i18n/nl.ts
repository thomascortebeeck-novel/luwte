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
} as const satisfies Record<string, string>;
