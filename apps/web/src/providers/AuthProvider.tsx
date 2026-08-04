import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { auth } from '../firebase/client';

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

type AuthContextValue = {
  user: FirebaseUser | null;
  status: AuthStatus;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * `status` is explicit rather than inferred from `user == null`, so a screen
 * can tell "not signed in" apart from "we do not know yet". Without that the
 * app flashes the sign-in screen on every launch before Firebase restores
 * the session, which reads as being logged out.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setStatus(next ? 'signed-in' : 'signed-out');
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ user, status }), [user, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}
