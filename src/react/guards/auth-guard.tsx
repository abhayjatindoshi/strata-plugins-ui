import { type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../strata-provider';

export type AuthGuardProps = {
  readonly redirect: string;
  readonly loading?: ReactNode;
  /** Optional sessionStorage key to stash the current URL on redirect. */
  readonly returnUrlKey?: string;
};

/**
 * Gates a route on auth status. No `provider` prop — the service tracks
 * the active session and the guard just asks "are we signed in right now?".
 */
export function AuthGuard({ redirect, loading = null, returnUrlKey }: AuthGuardProps) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <>{loading}</>;
  if (status === 'signed-out') {
    if (returnUrlKey) {
      sessionStorage.setItem(returnUrlKey, location.pathname + location.search);
    }
    return <Navigate to={redirect} replace />;
  }
  return <Outlet />;
}
