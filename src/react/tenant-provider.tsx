import { createContext, useCallback, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import type { Tenant } from 'strata-data-sync';
import { useStrataContext } from './strata-provider';

type TenantContextValue = {
  readonly tenant: Tenant | undefined;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly all: readonly Tenant[];
  readonly refreshList: () => void;
};

const noop = () => {};

const TenantContext = createContext<TenantContextValue>({
  tenant: undefined,
  loading: false,
  error: null,
  all: [],
  refreshList: noop,
});

export type TenantProviderProps = {
  readonly tenantId: string | undefined;
  readonly children: ReactNode;
};

/**
 * Opens/closes the active tenant as `tenantId` changes. Transitions are
 * serialized so rapid switches cannot interleave.
 */
export function TenantProvider({ tenantId, children }: TenantProviderProps) {
  const { strata } = useStrataContext();
  const [tenant, setTenant] = useState<Tenant | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [all, setAll] = useState<readonly Tenant[]>([]);

  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const currentTenantId = useRef<string | undefined>(undefined);

  // Reset tracking when strata instance changes (sign-out → sign-in).
  useEffect(() => {
    currentTenantId.current = undefined;
  }, [strata]);

  useEffect(() => {
    if (!strata) return;

    let cancelled = false;

    const transition = async () => {
      if (cancelled) return;
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
      // Close the tenant when unmounting (navigating away).
      if (currentTenantId.current) {
        const id = currentTenantId.current;
        currentTenantId.current = undefined;
        queueRef.current = queueRef.current.then(
          () => strata.tenants.close().catch(() => {}),
        );
      }
    };
  }, [strata, tenantId]);

  useEffect(() => {
    if (!strata) return;
    const sub = strata.tenants.activeTenant$.subscribe(setTenant);
    return () => sub.unsubscribe();
  }, [strata]);

  // Tenant list — shared across all useTenant() consumers.
  const refreshList = useCallback(() => {
    if (!strata) return;
    void strata.tenants.list().then(setAll).catch(() => {});
  }, [strata]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const value = { tenant, loading, error, all, refreshList };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export type UseTenantResult = {
  readonly active: Tenant | undefined;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly all: readonly Tenant[];
  readonly refreshList: () => void;
};

export function useTenant(): UseTenantResult {
  const { tenant: active, loading, error, all, refreshList } = useContext(TenantContext);
  return { active, loading, error, all, refreshList };
}
