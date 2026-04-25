import { createContext, useCallback, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Tenant, CreateTenantOptions } from 'strata-data-sync';
import { useStrataContext } from './strata-provider';

export type TenantOps = {
  open(tenantId: string, opts?: { credential?: string }): Promise<void>;
  close(): Promise<void>;
  create(opts: CreateTenantOptions): Promise<Tenant>;
  remove(tenantId: string, opts?: { purge?: boolean }): Promise<void>;
};

type TenantContextValue = {
  readonly active: Tenant | undefined;
  readonly ready: boolean;
  readonly all: readonly Tenant[];
  readonly ops: TenantOps;
  readonly refreshList: () => void;
};

const noOps: TenantOps = {
  open: () => Promise.reject(new Error('TenantProvider not mounted')),
  close: () => Promise.reject(new Error('TenantProvider not mounted')),
  create: () => Promise.reject(new Error('TenantProvider not mounted')),
  remove: () => Promise.reject(new Error('TenantProvider not mounted')),
};

const TenantContext = createContext<TenantContextValue>({
  active: undefined,
  ready: false,
  all: [],
  ops: noOps,
  refreshList: () => {},
});

export type TenantProviderProps = {
  readonly children: ReactNode;
};

/**
 * Top-level tenant provider. Observes `activeTenant$` and exposes
 * `open/close/create/remove` operations via context. Does not own
 * routing — consumers decide when to navigate.
 *
 * When `credentialCacheKey` is set on `StrataConfig`, caches the
 * encryption credential in sessionStorage after a successful open so
 * the tenant can be reopened without re-prompting.
 */
export function TenantProvider({ children }: TenantProviderProps) {
  const { strata, config } = useStrataContext();
  const credentialCacheKey = config.credentialCacheKey;
  const [active, setActive] = useState<Tenant | undefined>(
    () => strata?.tenants.activeTenant ?? undefined,
  );
  const [all, setAll] = useState<readonly Tenant[]>([]);

  useEffect(() => {
    if (!strata) {
      setActive(undefined);
      return;
    }
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

  const ops = useCallback((): TenantOps => {
    if (!strata) return noOps;
    return {
      open: async (id, opts) => {
        let credential = opts?.credential;
        if (!credential && credentialCacheKey) {
          try {
            const raw = sessionStorage.getItem(credentialCacheKey);
            if (raw) {
              const cached = JSON.parse(raw) as { tenantId?: string; credential?: string };
              if (cached.tenantId === id && typeof cached.credential === 'string') {
                credential = cached.credential;
              }
            }
          } catch { /* best-effort */ }
        }
        await strata.tenants.open(id, credential ? { credential } : undefined);
        if (credentialCacheKey && credential) {
          try {
            sessionStorage.setItem(credentialCacheKey, JSON.stringify({ tenantId: id, credential }));
          } catch { /* best-effort */ }
        }
      },
      close: async () => {
        await strata.tenants.close();
      },
      create: async (opts) => {
        const t = await strata.tenants.create(opts);
        refreshList();
        return t;
      },
      remove: async (id, opts) => {
        await strata.tenants.remove(id, opts);
        if (credentialCacheKey) {
          try {
            const raw = sessionStorage.getItem(credentialCacheKey);
            if (raw) {
              const cached = JSON.parse(raw) as { tenantId?: string };
              if (cached.tenantId === id) sessionStorage.removeItem(credentialCacheKey);
            }
          } catch { /* best-effort */ }
        }
        refreshList();
      },
    };
  }, [strata, refreshList, credentialCacheKey])();

  const value = { active, ready: !!strata, all, ops, refreshList };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export type UseTenantResult = {
  readonly active: Tenant | undefined;
  readonly ready: boolean;
  readonly all: readonly Tenant[];
  readonly ops: TenantOps;
  readonly refreshList: () => void;
};

export function useTenant(): UseTenantResult {
  return useContext(TenantContext);
}
