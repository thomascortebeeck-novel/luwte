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

  activities: (patientId: string) => `patients/${patientId}/activities`,
  activity: (patientId: string, activityId: string) =>
    `patients/${patientId}/activities/${activityId}`,

  completions: (patientId: string) => `patients/${patientId}/completions`,
  /** completionKey is `activityId_yyyy-MM-dd`. */
  completion: (patientId: string, key: string) => `patients/${patientId}/completions/${key}`,

  posts: (patientId: string) => `patients/${patientId}/posts`,
  post: (patientId: string, postId: string) => `patients/${patientId}/posts/${postId}`,
  /** Keyed by uid, so reacting twice changes your mind rather than stacking. */
  reaction: (patientId: string, postId: string, memberUid: string) =>
    `patients/${patientId}/posts/${postId}/reactions/${memberUid}`,
  reactions: (patientId: string, postId: string) =>
    `patients/${patientId}/posts/${postId}/reactions`,
  comments: (patientId: string, postId: string) =>
    `patients/${patientId}/posts/${postId}/comments`,
  comment: (patientId: string, postId: string, commentId: string) =>
    `patients/${patientId}/posts/${postId}/comments/${commentId}`,

  circle: (patientId: string) => `patients/${patientId}/circle`,
  circleMember: (patientId: string, memberUid: string) =>
    `patients/${patientId}/circle/${memberUid}`,

  invites: () => 'invites',
  invite: (code: string) => `invites/${code}`,

  /** PRD 6.7 — written by an admin only, from the panel (D27). */
  clinicians: () => 'clinicians',
  clinician: (uid: string) => `clinicians/${uid}`,

  /** Somebody asking to be verified. Applying grants nothing. */
  clinicianRequests: () => 'clinicianRequests',
  clinicianRequest: (uid: string) => `clinicianRequests/${uid}`,

  /** The nameplate, keyed by connection code. Written by an admin only. */
  clinicianDirectory: () => 'clinicianDirectory',
  clinicianDirectoryEntry: (code: string) => `clinicianDirectory/${code}`,

  /**
   * The root of the whole chain: bootstrapped with the Admin SDK and never
   * writable from a client, which is what keeps "an admin decided" meaningful.
   */
  admin: (uid: string) => `admins/${uid}`,

  doses: (patientId: string) => `patients/${patientId}/doses`,
  /** doseId is `yyyy-MM-dd_medId_HHmm`. */
  dose: (patientId: string, id: string) => `patients/${patientId}/doses/${id}`,
} as const;
