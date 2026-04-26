import { createContext, useCallback, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import type { Tenant, CreateTenantOptions } from 'strata-data-sync';
import { useStrataContext } from './strata-provider';
import { xorEncode, xorDecode } from '../utils/xor';

export type TenantStatus = 'idle' | 'loading' | 'hydrated' | 'error';

export type TenantOps = {
  close(): Promise<void>;
  create(opts: CreateTenantOptions): Promise<Tenant>;
  remove(tenantId: string, opts?: { purge?: boolean }): Promise<void>;
};

type TenantContextValue = {
  readonly active: Tenant | undefined;
  readonly status: TenantStatus;
  readonly error: Error | null;
  readonly all: readonly Tenant[];
  readonly ops: TenantOps;
  readonly requestOpen: (tenantId: string, opts?: { credential?: string }) => void;
  readonly refreshList: () => void;
};

const noOps: TenantOps = {
  close: () => Promise.reject(new Error('TenantProvider not mounted')),
  create: () => Promise.reject(new Error('TenantProvider not mounted')),
  remove: () => Promise.reject(new Error('TenantProvider not mounted')),
};

const TenantContext = createContext<TenantContextValue>({
  active: undefined,
  status: 'idle',
  error: null,
  all: [],
  ops: noOps,
  requestOpen: () => {},
  refreshList: () => {},
});

export type TenantProviderProps = {
  readonly children: ReactNode;
};

/**
 * Top-level tenant provider. Owns the tenant lifecycle:
 * - `requestOpen(id)` triggers open + hydration
 * - Deduplicates concurrent requests for the same tenant
 * - Tracks `status` ('idle' | 'loading' | 'hydrated' | 'error')
 * - Resets when the Strata instance changes
 */
export function TenantProvider({ children }: TenantProviderProps) {
  const { strata, config } = useStrataContext();
  const credentialCacheKey = config.credentialCacheKey;
  const [active, setActive] = useState<Tenant | undefined>(undefined);
  const [statusState, setStatusState] = useState<TenantStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [all, setAll] = useState<readonly Tenant[]>([]);
  const inflightRef = useRef<{ tenantId: string; aborted: boolean } | null>(null);
  const statusRef = useRef<TenantStatus>('idle');

  const setStatus = useCallback((s: TenantStatus) => {
    statusRef.current = s;
    setStatusState(s);
  }, []);

  // Subscribe to active tenant + reset on strata change
  useEffect(() => {
    setActive(undefined);
    setStatus('idle');
    setError(null);
    inflightRef.current = null;
    if (!strata && credentialCacheKey) {
      sessionStorage.removeItem(credentialCacheKey);
    }
    if (!strata) return;
    const sub = strata.tenants.activeTenant$.subscribe(setActive);
    return () => sub.unsubscribe();
  }, [strata]);

  const refreshList = useCallback(() => {
    if (!strata) return;
    void strata.tenants.list().then(setAll).catch(() => {});
  }, [strata]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const requestOpen = useCallback((tenantId: string, opts?: { credential?: string }) => {
    if (!strata) return;

    // Already hydrated for this tenant — no-op
    if (strata.tenants.activeTenant?.id === tenantId && statusRef.current === 'hydrated') return;

    // Already inflight for this tenant — no-op
    if (inflightRef.current?.tenantId === tenantId && !inflightRef.current.aborted) return;

    // Abort any previous inflight
    if (inflightRef.current) {
      inflightRef.current.aborted = true;
    }

    const flight = { tenantId, aborted: false };
    inflightRef.current = flight;
    setStatus('loading');
    setError(null);

    // Resolve credential from cache if not provided
    let credential = opts?.credential;
    if (!credential && credentialCacheKey) {
      try {
        const raw = sessionStorage.getItem(credentialCacheKey);
        if (raw) {
          const decoded = JSON.parse(xorDecode(raw, config.deviceId)) as { tenantId?: string; credential?: string };
          if (decoded.tenantId === tenantId && typeof decoded.credential === 'string') {
            credential = decoded.credential;
          }
        }
      } catch { /* best-effort */ }
    }

    strata.tenants.open(tenantId, credential ? { credential } : undefined).then(() => {
      if (flight.aborted) return;
      setStatus('hydrated');
      setError(null);
      if (credentialCacheKey && credential) {
        try {
          sessionStorage.setItem(
            credentialCacheKey,
            xorEncode(JSON.stringify({ tenantId, credential }), config.deviceId),
          );
        } catch { /* best-effort */ }
      }
    }).catch((err: unknown) => {
      if (flight.aborted) return;
      inflightRef.current = null;
      const e = err instanceof Error ? err : new Error(String(err));
      setStatus('error');
      setError(e);
    });
  }, [strata, credentialCacheKey]);

  const ops: TenantOps = {
    close: async () => {
      if (!strata) return;
      if (inflightRef.current) inflightRef.current.aborted = true;
      await strata.tenants.close();
      if (credentialCacheKey) sessionStorage.removeItem(credentialCacheKey);
      setStatus('idle');
      setError(null);
    },
    create: async (createOpts) => {
      if (!strata) throw new Error('Strata not initialized');
      const t = await strata.tenants.create(createOpts);
      refreshList();
      return t;
    },
    remove: async (id, removeOpts) => {
      if (!strata) throw new Error('Strata not initialized');
      await strata.tenants.remove(id, removeOpts);
      if (credentialCacheKey) sessionStorage.removeItem(credentialCacheKey);
      refreshList();
    },
  };

  return (
    <TenantContext.Provider value={{ active, status: statusState, error, all, ops, requestOpen, refreshList }}>
      {children}
    </TenantContext.Provider>
  );
}

export type UseTenantResult = {
  readonly active: Tenant | undefined;
  readonly status: TenantStatus;
  readonly error: Error | null;
  readonly all: readonly Tenant[];
  readonly ops: TenantOps;
  readonly requestOpen: (tenantId: string, opts?: { credential?: string }) => void;
  readonly refreshList: () => void;
};

export function useTenant(): UseTenantResult {
  return useContext(TenantContext);
}
