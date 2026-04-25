import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Strata } from 'strata-data-sync';
import type { AccessToken, AuthState } from 'strata-adapters';
import type { StrataConfig } from './create-strata-config';

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
      setAuthState({ status: 'signed-out' });
      return;
    }
    const sub = auth.state$.subscribe(setAuthState);
    return () => sub.unsubscribe();
  }, [auth]);

  // ── Strata lifecycle ─────────────────────────────────────
  // Construct when signed-in (or when auth-less); dispose via
  // the effect cleanup. The null state between sign-out and
  // the next render is handled by the cleanup setting strata
  // to null before the next effect run.
  const [strata, setStrata] = useState<Strata | null>(null);

  useEffect(() => {
    const shouldBuild = !auth || authState.status === 'signed-in';
    if (!shouldBuild) return;

    const authName = authState.status === 'signed-in' ? authState.name : undefined;
    const cloudAdapter = authName ? config.cloud.resolve(authName) : undefined;

    const instance = new Strata({
      appId: config.appId,
      deviceId: config.deviceId,
      entities: config.entities,
      migrations: config.migrations,
      localAdapter: config.localAdapter,
      cloudAdapter,
      encryptionService: config.encryption,
    });
    setStrata(instance);

    return () => {
      setStrata(null);
      void instance.dispose();
    };
    // `config` is module-scope and stable; `authState.status` drives rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, authState.status]);

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