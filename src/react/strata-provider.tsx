import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Strata } from '@strata/core';
import type { StorageAdapter } from '@strata/core';
import type { AccessToken, AuthState } from '@strata/plugins';
import type { StrataConfig } from './create-strata-config';
import { log } from '@/log';

type StrataContextValue = {
  readonly config: StrataConfig;
  readonly strata: Strata | null;
  readonly authState: AuthState;
};

const StrataContext = createContext<StrataContextValue | null>(null);

export type StrataProviderProps = {
  readonly config: StrataConfig;
  readonly children: ReactNode;
};

/**
 * Top-level provider. Owns auth subscription, `Strata` lifecycle, and
 * exposes config + state to the tree via context.
 */
export function StrataProvider({ config, children }: StrataProviderProps) {
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

  // ── Strata lifecycle ─────────────────────────────────────
  // Rebuild when auth state or cloud adapter changes.
  const [strata, setStrata] = useState<Strata | null>(null);

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

    const instance = new Strata({
      appId: config.appId,
      deviceId: config.deviceId,
      entities: config.entities,
      migrations: config.migrations,
      localAdapter: config.localAdapter,
      cloudAdapter: cloudAdapter ?? undefined,
      encryptionService: config.encryption,
    });
    log.strata('created instance (cloud=%s)', !!cloudAdapter);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStrata(instance);

    return () => {
      setStrata(null);
      log.strata('disposing instance');
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
  const value = useMemo<StrataContextValue>(
    () => ({ config, strata, authState }),
    [config, strata, authState],
  );

  return (
    <StrataContext.Provider value={value}>{children}</StrataContext.Provider>
  );
}

// ─── Internal hook (used by guards, pages within strata-plugins-ui) ────

export function useStrataContext(): StrataContextValue {
  const ctx = useContext(StrataContext);
  if (!ctx) throw new Error('useStrataContext: missing <StrataProvider>');
  return ctx;
}

// ─── Public hooks ──────────────────────────────────────────

export function useStrata(): Strata | null {
  return useStrataContext().strata;
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
  const { config, authState } = useStrataContext();
  const { auth } = config;

  const supportedAuths = useMemo<readonly SupportedAuthEntry[]>(
    () => auth?.supportedAuths() ?? [],
    [auth],
  );

  const logout = useCallback(async () => {
    if (!auth) throw new Error('useAuth: no auth configured');
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