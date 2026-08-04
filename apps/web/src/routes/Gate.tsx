import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAccount } from '../providers/AccountProvider';
import { useAuth } from '../providers/AuthProvider';

/**
 * Decides which of sign-in, onboarding, consent or the app itself a person
 * should be looking at.
 *
 * While auth or the account record is still loading it renders nothing rather
 * than a spinner (BRAND 3.6) and, more importantly, rather than the sign-in
 * screen — flashing sign-in on every launch reads as having been logged out.
 */
export function Gate({ children }: { children: ReactNode }) {
  const { status: authStatus } = useAuth();
  const { patient, status: accountStatus } = useAccount();
  const location = useLocation();

  if (authStatus === 'loading') return null;

  if (authStatus === 'signed-out') {
    return location.pathname === '/signin' ? <>{children}</> : <Navigate to="/signin" replace />;
  }

  if (accountStatus === 'loading') return null;

  const named = (patient?.displayName ?? '').length > 0;
  const onboarded = patient?.onboarded === true;

  // Signed in, so the sign-in screen is no longer the right place to be.
  if (location.pathname === '/signin') return <Navigate to="/" replace />;

  if (!named) {
    return location.pathname === '/onboarding' ? (
      <>{children}</>
    ) : (
      <Navigate to="/onboarding" replace />
    );
  }

  if (!onboarded) {
    return location.pathname === '/consent' ? <>{children}</> : <Navigate to="/consent" replace />;
  }

  // Onboarding and consent are both behind them; going back would only offer
  // a second consent record for the same version.
  if (location.pathname === '/onboarding' || location.pathname === '/consent') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
