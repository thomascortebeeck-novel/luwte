/**
 * Every Firestore path in one place, so no screen contains a string literal
 * and a collection can be renamed without a search across the app.
 */
export const paths = {
  user: (uid: string) => `users/${uid}`,
  users: () => 'users',

  patient: (patientId: string) => `patients/${patientId}`,
  patients: () => 'patients',

  consents: (patientId: string) => `patients/${patientId}/consents`,
  consent: (patientId: string, consentId: string) =>
    `patients/${patientId}/consents/${consentId}`,
} as const;
