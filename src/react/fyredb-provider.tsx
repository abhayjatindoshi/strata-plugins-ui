import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { FyreDb } from '@fyre-db/core';
import type { StorageAdapter } from '@fyre-db/core';
import type { AccessToken, AuthState } from '@fyre-db/plugins';
import { FyreDbPluginConfigError } from '@fyre-db/plugins';
import type { FyreDbConfig } from './create-fyredb-config';
import { log } from '@/log';

type FyreDbContextValue = {
  readonly config: FyreDbConfig;
  readonly fyredb: FyreDb | null;
  readonly authState: AuthState;
};

const FyreDbContext = createContext<FyreDbContextValue | null>(null);

export type FyreDbProviderProps = {
  readonly config: FyreDbConfig;
  readonly children: ReactNode;
};

/**
 * Top-level provider. Owns auth subscription, `FyreDb` lifecycle, and
 * exposes config + state to the tree via context.
 */
export function FyreDbProvider({ config, children }: FyreDbProviderProps) {
  const { auth } = config;

  // ── Auth state ───────────────────────────────────────────
  const [authState, setAuthState] = useState<AuthState>(
    auth ? { status: 'loading' } : { status: 'signed-out' },
  );

  useEffect(() => {
    if (!auth) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthState({ status: 'signed-out' });
      return;
    }
    const sub = auth.state$.subscribe(setAuthState);
    return () => { sub.unsubscribe(); };
  }, [auth]);

  // ── FyreDb lifecycle ─────────────────────────────────────
  // Rebuild when auth state or cloud adapter changes.
  const [fyredb, setFyreDb] = useState<FyreDb | null>(null);

  // Track the cloud adapter reactively via cloud.active$.
  const [cloudAdapter, setCloudAdapter] = useState<StorageAdapter | null>(
    () => config.cloud?.active ?? null,
  );

  useEffect(() => {
    if (!config.cloud) return;
    const sub = config.cloud.active$.subscribe((adapter) => {
      setCloudAdapter(adapter);
    });
    return () => { sub.unsubscribe(); };
  }, [config.cloud]);

  useEffect(() => {
    const shouldBuild = !auth || authState.status === 'signed-in';
    if (!shouldBuild) return;

    const instance = new FyreDb({
      appId: config.appId,
      deviceId: config.deviceId,
      entities: config.entities,
      migrations: config.migrations,
      localAdapter: config.localAdapter,
      cloudAdapter: cloudAdapter ?? undefined,
      encryptionService: config.encryption,
    });
    log.fyredb('created instance (cloud=%s)', !!cloudAdapter);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFyreDb(instance);

    return () => {
      setFyreDb(null);
      log.fyredb('disposing instance');
      void instance.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, authState.status, cloudAdapter]);

  // ── Dispose CloudProviderService on unmount ──────────────
  useEffect(() => {
    return () => {
      config.providers?.dispose();
    };
  }, [config.providers]);

  // ── Context value ────────────────────────────────────────
  const value = useMemo<FyreDbContextValue>(
    () => ({ config, fyredb, authState }),
    [config, fyredb, authState],
  );

  return (
    <FyreDbContext.Provider value={value}>{children}</FyreDbContext.Provider>
  );
}

// ─── Internal hook (used by guards, pages within @fyre-db/plugins-ui) ────

export function useFyreDbContext(): FyreDbContextValue {
  const ctx = useContext(FyreDbContext);
  if (!ctx) throw new FyreDbPluginConfigError('useFyreDbContext: missing <FyreDbProvider>');
  return ctx;
}

// ─── Public hooks ──────────────────────────────────────────

export function useFyreDb(): FyreDb | null {
  return useFyreDbContext().fyredb;
}

export type SupportedAuthEntry = {
  readonly name: string;
  readonly login: () => Promise<void>;
};

export type UseAuthResult = {
  readonly status: 'loading' | 'signed-in' | 'signed-out';
  readonly name?: string;
  readonly supportedAuths: readonly SupportedAuthEntry[];
  readonly logout: () => Promise<void>;
  readonly getAccessToken: () => Promise<AccessToken | null>;
};

export function useAuth(): UseAuthResult {
  const { config, authState } = useFyreDbContext();
  const { auth } = config;

  const supportedAuths = useMemo<readonly SupportedAuthEntry[]>(
    () => auth?.supportedAuths() ?? [],
    [auth],
  );

  const logout = useCallback(async () => {
    if (!auth) throw new FyreDbPluginConfigError('useAuth: no auth configured');
    await auth.logout();
  }, [auth]);

  const getAccessToken = useCallback(
    () => auth?.getAccessToken() ?? Promise.resolve(null),
    [auth],
  );

  return {
    status: authState.status,
    name: authState.name,
    supportedAuths,
    logout,
    getAccessToken,
  };
}