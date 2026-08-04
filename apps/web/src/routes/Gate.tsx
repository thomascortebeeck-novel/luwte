import { INVITE_PATH } from '@luwte/core';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { peekPendingInvite } from '../pendingInvite';
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

  /*
   * Someone who followed an invite link before having an account lands here
   * once sign-in and onboarding are done. Sending them back to the invite is
   * the only reason the code was remembered.
   *
   * Only from Today, and only now that everything above has passed — so this
   * cannot bounce with the join screen, which sends the not-yet-ready case
   * back to exactly this point.
   */
  const pending = peekPendingInvite();
  if (pending && location.pathname === '/') {
    return <Navigate to={`${INVITE_PATH}/${pending}`} replace />;
  }

  return <>{children}</>;
}
