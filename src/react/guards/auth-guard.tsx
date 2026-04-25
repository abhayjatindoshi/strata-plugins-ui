import { type ReactNode } from 'react';
import { useAuth } from '../strata-provider';

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

  if (status === 'loading') return <>{loading}</>;
  if (status === 'signed-out') {
    onUnauthenticated();
    return <>{loading}</>;
  }
  return <>{children}</>;
}
