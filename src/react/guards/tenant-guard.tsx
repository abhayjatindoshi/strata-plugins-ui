import { useEffect, useState, type ReactNode } from 'react';
import { useTenant } from '../tenant-provider';
import { useStrataContext } from '../strata-provider';

export type TenantGuardProps = {
  readonly tenantId: string | undefined;
  readonly onUnauthenticated: () => void;
  readonly loading?: ReactNode;
  readonly children: ReactNode;
};

/**
 * Gates rendering on the active tenant. Auto-opens the tenant if it isn't
 * already active. If the tenant is encrypted and no credential was provided
 * (e.g. page refresh), renders the `encryptionPassword` common step inline
 * to collect it.
 *
 * Router-independent — the app passes `tenantId` and `onUnauthenticated`
 * (typically wired to `navigate`).
 */
export function TenantGuard({ tenantId, onUnauthenticated, loading = null, children }: TenantGuardProps) {
  const { active, ready, ops } = useTenant();
  const { config } = useStrataContext();
  const [state, setState] = useState<'idle' | 'opening' | 'needs-credential' | 'ready' | 'error'>('idle');
  const [PasswordStep, setPasswordStep] = useState<ReactNode>(null);

  useEffect(() => {
    if (!tenantId) {
      onUnauthenticated();
      return;
    }

    if (active?.id === tenantId) {
      setState('ready');
      return;
    }

    if (!ready) return;
    if (state === 'needs-credential' || state === 'opening') return;

    let cancelled = false;
    setState('opening');
    ops.open(tenantId).then(() => {
      if (!cancelled) setState('ready');
    }).catch(() => {
      if (!cancelled) setState('needs-credential');
    });
    return () => { cancelled = true; };
  }, [tenantId, active, ready, ops, onUnauthenticated, state]);

  useEffect(() => {
    if (state !== 'needs-credential' || !tenantId) return;

    const step = config.commonSteps?.encryptionPassword({ intent: 'open' });
    if (!step) {
      onUnauthenticated();
      return;
    }

    setPasswordStep(
      step.render({
        onComplete: (password: string) => {
          setPasswordStep(null);
          setState('opening');
          ops.open(tenantId, { credential: password }).then(() => {
            setState('ready');
          }).catch(() => {
            onUnauthenticated();
          });
        },
        onCancel: () => {
          onUnauthenticated();
        },
      }),
    );
  }, [state, tenantId, config.commonSteps, ops, onUnauthenticated]);

  if (state === 'needs-credential' && PasswordStep) return <>{PasswordStep}</>;
  if (state === 'ready' && active?.id === tenantId) return <>{children}</>;
  return <>{loading}</>;
}
