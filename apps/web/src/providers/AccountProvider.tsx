import type { OnboardingRole } from '@luwte/core';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ensureAccount,
  readPatient,
  readRole,
  type PatientRecord,
} from '../firebase/accounts';
import { useAuth } from './AuthProvider';
import { useLocale } from './LocaleProvider';

export type AccountStatus = 'loading' | 'ready' | 'absent';

type AccountContextValue = {
  patient: PatientRecord | null;
  /**
   * Which onboarding this person went through, and therefore which screens and
   * which consent apply to them. Read from `users/{uid}` rather than inferred,
   * and defaulted to `patient` only until onboarding has answered it.
   */
  role: OnboardingRole;
  status: AccountStatus;
  reload: () => Promise<void>;
};

const AccountContext = createContext<AccountContextValue | null>(null);

/**
 * Loads the patient record for the signed-in person, creating it on first
 * sign-in. Kept separate from AuthProvider because "who you are" and "what we
 * know about you" fail independently — a signed-in person with an unreachable
 * Firestore should not look signed out.
 */
export function AccountProvider({ children }: { children: ReactNode }) {
  const { user, status: authStatus } = useAuth();
  const { locale } = useLocale();
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [role, setRole] = useState<OnboardingRole>('patient');
  const [status, setStatus] = useState<AccountStatus>('loading');

  const load = useCallback(
    async (uid: string) => {
      await ensureAccount(uid, locale);
      const [record, storedRole] = await Promise.all([readPatient(uid), readRole(uid)]);
      setPatient(record);
      setRole(storedRole);
      setStatus(record ? 'ready' : 'absent');
    },
    [locale],
  );

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (!user) {
      setPatient(null);
      setRole('patient');
      setStatus('absent');
      return;
    }
    setStatus('loading');
    void load(user.uid).catch(() => setStatus('absent'));
  }, [user, authStatus, load]);

  const reload = useCallback(async () => {
    if (user) await load(user.uid);
  }, [user, load]);

  const value = useMemo<AccountContextValue>(
    () => ({ patient, role, status, reload }),
    [patient, role, status, reload],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used inside an AccountProvider');
  return ctx;
}
