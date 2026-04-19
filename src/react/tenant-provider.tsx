import { useState, useEffect, useRef, type ReactNode } from 'react';
import type { Tenant } from 'strata-data-sync';
import { TenantContext } from './context';
import { useStrata } from './hooks/use-strata';

export type TenantProviderProps = {
  readonly tenantId: string | undefined;
  readonly children: ReactNode;
};

/**
 * Opens/closes the active tenant on `strata` as `tenantId` changes. Tenant
 * transitions are serialized via a chained-promise queue so rapid switches
 * cannot interleave (the previous open/close always settles before the next
 * one begins).
 */
export function TenantProvider({ tenantId, children }: TenantProviderProps) {
  const { strata } = useStrata();
  const [tenant, setTenant] = useState<Tenant | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Per-instance serialization queue. Every transition appends to `queueRef`,
  // so they always run in submission order even when re-renders fire fast.
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const currentTenantId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!strata) return;

    let cancelled = false;

    const transition = async () => {
      if (cancelled) return;
      // No-op if we're already on this tenant (or both undefined).
      if ((tenantId ?? null) === (currentTenantId.current ?? null)) return;

      setLoading(true);
      setError(null);
      try {
        if (currentTenantId.current) {
          await strata.tenants.close();
          currentTenantId.current = undefined;
        }
        if (tenantId) {
          await strata.tenants.open(tenantId);
          if (cancelled) {
            // A newer transition superseded us — close before bailing.
            await strata.tenants.close().catch(() => {});
            return;
          }
          currentTenantId.current = tenantId;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          currentTenantId.current = undefined;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    queueRef.current = queueRef.current.then(transition, transition);

    return () => {
      cancelled = true;
    };
  }, [strata, tenantId]);

  useEffect(() => {
    if (!strata) return;
    const sub = strata.tenants.activeTenant$.subscribe(setTenant);
    return () => sub.unsubscribe();
  }, [strata]);

  return (
    <TenantContext.Provider value={{ tenant, loading, error }}>
      {children}
    </TenantContext.Provider>
  );
}
