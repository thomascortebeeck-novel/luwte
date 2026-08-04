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

  checkins: (patientId: string) => `patients/${patientId}/checkins`,
  /** dateKey is the local calendar day, yyyy-MM-dd. */
  checkin: (patientId: string, dateKey: string) =>
    `patients/${patientId}/checkins/${dateKey}`,

  weeklies: (patientId: string) => `patients/${patientId}/weekly`,
  /** weekKey is the ISO week, yyyy-'W'ww. */
  weekly: (patientId: string, weekKey: string) => `patients/${patientId}/weekly/${weekKey}`,

  medications: (patientId: string) => `patients/${patientId}/medications`,
  medication: (patientId: string, medId: string) =>
    `patients/${patientId}/medications/${medId}`,

  circle: (patientId: string) => `patients/${patientId}/circle`,
  circleMember: (patientId: string, memberUid: string) =>
    `patients/${patientId}/circle/${memberUid}`,

  invites: () => 'invites',
  invite: (code: string) => `invites/${code}`,

  doses: (patientId: string) => `patients/${patientId}/doses`,
  /** doseId is `yyyy-MM-dd_medId_HHmm`. */
  dose: (patientId: string, id: string) => `patients/${patientId}/doses/${id}`,
} as const;
