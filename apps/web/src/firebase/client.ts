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

/*
 * A build with no configuration is a blank white screen, and the person
 * looking at it has no way to tell whether it is them, their phone, or us.
 *
 * `pnpm build` reads `.env.production`, which is deliberately not in the
 * repository — the values differ per project and the production one is
 * supplied by CI. Miss that step and Vite substitutes `undefined` for every
 * variable, `initializeApp` fails somewhere deep inside the SDK, and the
 * failure surfaces as nothing at all.
 *
 * So say which variables are missing, by name, while the message can still
 * reach whoever built it. The fallback markup in index.html is what the
 * person sees; this is what the log says.
 */
const missing = Object.entries(config)
  .filter(([, value]) => typeof value !== 'string' || value.length === 0)
  .map(([key]) => key);

if (missing.length > 0) {
  throw new Error(
    `Firebase is not configured: ${missing.join(', ')} missing. ` +
      'A production build needs apps/web/.env.production (see .env.example); ' +
      'local development uses .env.development and needs no real project.',
  );
}

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
