import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../strata-provider';
import { log } from '@/log';

export type AuthGuardProps = {
  readonly onUnauthenticated: () => void;
  readonly loading?: ReactNode;
  readonly children: ReactNode;
};

/**
 * Gates rendering on auth status. Router-independent — the app provides
 * `onUnauthenticated` (typically wired to `navigate`).
 */
export function AuthGuard({ onUnauthenticated, loading = null, children }: AuthGuardProps) {
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'signed-out') {
      log.guard('auth signed-out → redirect');
      onUnauthenticated();
    }
  }, [status, onUnauthenticated]);

  if (status === 'loading' || status === 'signed-out') return <>{loading}</>;
  return <>{children}</>;
}
