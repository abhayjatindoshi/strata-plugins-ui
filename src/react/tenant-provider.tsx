import { createContext, useCallback, useContext, useMemo, useState, useEffect, useRef, type ReactNode } from 'react';
import type { Tenant, CreateTenantOptions, JoinTenantOptions, ProbeResult } from '@fyre-db/core';
import { FyreDbError, FyreDbPluginConfigError } from '@fyre-db/plugins';
import { useFyreDbContext } from './fyredb-provider';
import { xorEncode, xorDecode } from '../utils/xor';
import type { PlacedOp } from '../tenants/cloud-provider-service';
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
  readonly pageActions: readonly PlacedOp[];
  readonly requestOpen: (tenantId: string, opts?: { credential?: string }) => void;
};

const noOps: TenantOps = {
  close: () => Promise.reject(new FyreDbPluginConfigError('TenantProvider not mounted')),
  probe: () => Promise.reject(new FyreDbPluginConfigError('TenantProvider not mounted')),
  create: () => Promise.reject(new FyreDbPluginConfigError('TenantProvider not mounted')),
  join: () => Promise.reject(new FyreDbPluginConfigError('TenantProvider not mounted')),
  remove: () => Promise.reject(new FyreDbPluginConfigError('TenantProvider not mounted')),
};

const TenantContext = createContext<TenantContextValue>({
  active: undefined,
  status: 'idle',
  error: null,
  all: [],
  ops: noOps,
  pageActions: [],
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
 * - Resets when the FyreDb instance changes
 */
export function TenantProvider({ children }: TenantProviderProps) {
  const { fyredb, config } = useFyreDbContext();
  const credentialCacheKey = config.credentialCacheKey;
  const [active, setActive] = useState<Tenant | undefined>(undefined);
  const [statusState, setStatusState] = useState<TenantStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [all, setAll] = useState<readonly Tenant[]>([]);
  const [pageActions, setPageActions] = useState<readonly PlacedOp[]>([]);
  const inflightRef = useRef<{ tenantId: string; aborted: boolean } | null>(null);
  const statusRef = useRef<TenantStatus>('idle');

  const setStatus = useCallback((s: TenantStatus) => {
    statusRef.current = s;
    setStatusState(s);
  }, []);

  // Subscribe to active tenant + reset on fyredb change.
  // Note: we do NOT clear the credential cache here — fyredb can transition
  // through null during init/refresh. Credentials are cleared by explicit
  // signals: ops.close(), ops.remove(), or tab close (sessionStorage).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(undefined);
    setStatus('idle');
    setError(null);
    inflightRef.current = null;
    if (!fyredb) return;
    const activeSub = fyredb.tenants.activeTenant$.subscribe(setActive);
    const listSub = fyredb.tenants.tenants$.subscribe(setAll);
    return () => { activeSub.unsubscribe(); listSub.unsubscribe(); };
  }, [fyredb, setStatus]);

  // Subscribe to cloud adapter changes to derive page actions
  useEffect(() => {
    if (!config.cloud) return;
    const sub = config.cloud.active$.subscribe((adapter) => {
      const provider = adapter ? config.providers?.get(adapter.name) : undefined;
      if (provider) {
        setPageActions(provider.ops.filter((o) => o.placement === 'page-action').map((o) => ({ provider, op: o })));
      } else {
        setPageActions([]);
      }
    });
    return () => { sub.unsubscribe(); };
  }, [config.cloud, config.providers]);

  const requestOpen = useCallback((tenantId: string, opts?: { credential?: string }) => {
    if (!fyredb) return;

    // Already hydrated for this tenant — no-op
    if (fyredb.tenants.activeTenant?.id === tenantId && statusRef.current === 'hydrated') return;

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

    fyredb.tenants.open(tenantId, credential ? { credential } : undefined).then(() => {
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
      const e = err instanceof Error ? err : new FyreDbError(String(err), { kind: 'unknown' });
      log.tenant.error('open failed for %s: %s', tenantId, e.message);
      setStatus('error');
      setError(e);
    });
  }, [fyredb, credentialCacheKey, config.deviceId, setStatus]);

  const ops: TenantOps = useMemo(() => ({
    close: async () => {
      if (!fyredb) return;
      if (inflightRef.current) inflightRef.current.aborted = true;
      await fyredb.tenants.close();
      if (credentialCacheKey) sessionStorage.removeItem(credentialCacheKey);
      setStatus('idle');
      setError(null);
    },
    probe: async (ref) => {
      if (!fyredb) throw new FyreDbPluginConfigError('FyreDb not initialized');
      return fyredb.tenants.probe(ref);
    },
    create: async (createOpts) => {
      if (!fyredb) throw new FyreDbPluginConfigError('FyreDb not initialized');
      return fyredb.tenants.create(createOpts);
    },
    join: async (joinOpts) => {
      if (!fyredb) throw new FyreDbPluginConfigError('FyreDb not initialized');
      return fyredb.tenants.join(joinOpts);
    },
    remove: async (id, removeOpts) => {
      if (!fyredb) throw new FyreDbPluginConfigError('FyreDb not initialized');
      await fyredb.tenants.remove(id, removeOpts);
      if (credentialCacheKey) sessionStorage.removeItem(credentialCacheKey);
    },
  }), [fyredb, credentialCacheKey, setStatus]);

  return (
    <TenantContext.Provider value={{ active, status: statusState, error, all, ops, pageActions, requestOpen }}>
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
  readonly pageActions: readonly PlacedOp[];
  readonly requestOpen: (tenantId: string, opts?: { credential?: string }) => void;
};

export function useTenant(): UseTenantResult {
  return useContext(TenantContext);
}
