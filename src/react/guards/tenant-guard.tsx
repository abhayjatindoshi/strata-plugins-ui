import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTenant } from '../tenant-provider';
import { useStrataContext, useAuth } from '../strata-provider';

export type TenantGuardProps = {
  readonly tenantId: string | undefined;
  readonly onUnauthenticated: () => void;
  readonly mode?: 'light' | 'dark';
  readonly loading?: ReactNode;
  readonly children: ReactNode;
};

/**
 * Pure gate. Requests the tenant via `requestOpen()` and renders
 * based on the provider's `status`:
 * - `loading` → shows loading
 * - `error` (credential needed) → shows unlock step
 * - `error` (other) → redirects via `onUnauthenticated`
 * - `hydrated` + matching tenant → renders children
 */
export function TenantGuard({ tenantId, onUnauthenticated, mode, loading = null, children }: TenantGuardProps) {
  const { active, status, error, requestOpen } = useTenant();
  const { config } = useStrataContext();
  const { name: authName } = useAuth();
  const [unlockStep, setUnlockStep] = useState<ReactNode>(null);
  const requestOpenRef = useRef(requestOpen);
  requestOpenRef.current = requestOpen;

  // Request open only when tenantId changes
  useEffect(() => {
    if (!tenantId) {
      onUnauthenticated();
      return;
    }
    requestOpenRef.current(tenantId);
  }, [tenantId, onUnauthenticated]);

  // Handle error state
  useEffect(() => {
    if (status !== 'error' || !error || !tenantId) return;

    const needsCredential = error.message === 'Credential required for encrypted tenant';
    if (!needsCredential) {
      onUnauthenticated();
      return;
    }

    const providerTheme = authName
      ? config.providers?.all?.find((p) => p.name === authName)?.theme
      : undefined;
    const step = config.commonSteps?.encryptionUnlock({ mode, theme: providerTheme });
    if (!step) {
      onUnauthenticated();
      return;
    }

    setUnlockStep(
      step.render({
        onComplete: (password: string) => {
          setUnlockStep(null);
          requestOpenRef.current(tenantId, { credential: password });
        },
        onCancel: () => {
          onUnauthenticated();
        },
      }),
    );
  }, [status, error, tenantId, config, authName, mode, onUnauthenticated]);

  // Clear unlock step when leaving error state
  useEffect(() => {
    if (status !== 'error') setUnlockStep(null);
  }, [status]);

  if (unlockStep) return <>{unlockStep}</>;
  if (active?.id === tenantId && status === 'hydrated') return <>{children}</>;
  return <>{loading}</>;
}
