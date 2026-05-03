import { createContext, useCallback, useContext, useMemo, useState, useEffect, useRef, type ReactNode } from 'react';
import type { Tenant, CreateTenantOptions, JoinTenantOptions, ProbeResult } from '@strata/core';
import { StrataError, StrataPluginConfigError } from '@strata/plugins';
import { useStrataContext } from './strata-provider';
import { xorEncode, xorDecode } from '../utils/xor';
import { log } from '@/log';

export type TenantStatus = 'idle' | 'loading' | 'hydrated' | 'error';

export type TenantOps = {
  close(): Promise<void>;
  probe(ref: { meta: Record<string, unknown> }): Promise<ProbeResult>;
  create(opts: CreateTenantOptions): Promise<Tenant>;
  join(opts: JoinTenantOptions): Promise<Tenant>;
  remove(tenantId: string, opts?: { purge?: boolean }): Promise<void>;
};

type TenantContextValue = {
  readonly active: Tenant | undefined;
  readonly status: TenantStatus;
  readonly error: Error | null;
  readonly all: readonly Tenant[];
  readonly ops: TenantOps;
  readonly requestOpen: (tenantId: string, opts?: { credential?: string }) => void;
};

const noOps: TenantOps = {
  close: () => Promise.reject(new StrataPluginConfigError('TenantProvider not mounted')),
  probe: () => Promise.reject(new StrataPluginConfigError('TenantProvider not mounted')),
  create: () => Promise.reject(new StrataPluginConfigError('TenantProvider not mounted')),
  join: () => Promise.reject(new StrataPluginConfigError('TenantProvider not mounted')),
  remove: () => Promise.reject(new StrataPluginConfigError('TenantProvider not mounted')),
};

const TenantContext = createContext<TenantContextValue>({
  active: undefined,
  status: 'idle',
  error: null,
  all: [],
  ops: noOps,
  requestOpen: () => {},
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

  // Subscribe to active tenant + reset on strata change.
  // Note: we do NOT clear the credential cache here — strata can transition
  // through null during init/refresh. Credentials are cleared by explicit
  // signals: ops.close(), ops.remove(), or tab close (sessionStorage).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(undefined);
    setStatus('idle');
    setError(null);
    inflightRef.current = null;
    if (!strata) return;
    const activeSub = strata.tenants.activeTenant$.subscribe(setActive);
    const listSub = strata.tenants.tenants$.subscribe(setAll);
    return () => { activeSub.unsubscribe(); listSub.unsubscribe(); };
  }, [strata, setStatus]);

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
    log.tenant('requestOpen %s', tenantId);
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
      log.tenant('hydrated %s', tenantId);
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
      const e = err instanceof Error ? err : new StrataError(String(err), { kind: 'unknown' });
      log.tenant.error('open failed for %s: %s', tenantId, e.message);
      setStatus('error');
      setError(e);
    });
  }, [strata, credentialCacheKey, config.deviceId, setStatus]);

  const ops: TenantOps = useMemo(() => ({
    close: async () => {
      if (!strata) return;
      if (inflightRef.current) inflightRef.current.aborted = true;
      await strata.tenants.close();
      if (credentialCacheKey) sessionStorage.removeItem(credentialCacheKey);
      setStatus('idle');
      setError(null);
    },
    probe: async (ref) => {
      if (!strata) throw new StrataPluginConfigError('Strata not initialized');
      return strata.tenants.probe(ref);
    },
    create: async (createOpts) => {
      if (!strata) throw new StrataPluginConfigError('Strata not initialized');
      return strata.tenants.create(createOpts);
    },
    join: async (joinOpts) => {
      if (!strata) throw new StrataPluginConfigError('Strata not initialized');
      return strata.tenants.join(joinOpts);
    },
    remove: async (id, removeOpts) => {
      if (!strata) throw new StrataPluginConfigError('Strata not initialized');
      await strata.tenants.remove(id, removeOpts);
      if (credentialCacheKey) sessionStorage.removeItem(credentialCacheKey);
    },
  }), [strata, credentialCacheKey, setStatus]);

  return (
    <TenantContext.Provider value={{ active, status: statusState, error, all, ops, requestOpen }}>
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
};

export function useTenant(): UseTenantResult {
  return useContext(TenantContext);
}
