import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  type Firestore,
} from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app: FirebaseApp = initializeApp(config);

/**
 * PRD 5.6 — the check-in and the Today checklist must work fully offline. A
 * phone with no credit or no signal is common in this population, so the
 * local cache is the source of truth for reads and writes queue until they
 * can sync.
 *
 * Single-tab rather than multi-tab: this is a phone-first app, and the
 * multi-tab manager costs a leader election on every start for a case that
 * barely occurs here.
 */
export const db: Firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager(undefined) }),
});

export const auth: Auth = getAuth(app);

export const usingEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';

if (usingEmulators) {
  // Must happen before any other SDK call, hence at module scope.
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
