import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { AuthState } from 'strata-adapters';
import { AuthService } from 'strata-adapters';
import type { StrataConfig } from 'strata-adapters';
import { createStrataInstance, type StrataInstance } from 'strata-adapters';
import { StrataContext } from './context';

export type StrataProviderProps = {
  readonly config: StrataConfig;
  readonly children: ReactNode;
};

export function StrataProvider({ config, children }: StrataProviderProps) {
  // Snapshot config on first render. Subsequent prop changes are ignored to
  // avoid recreating AuthService / Strata mid-session (which would lose state).
  const configRef = useRef<StrataConfig>(config);
  const cfg = configRef.current;

  const authService = useMemo(
    () =>
      new AuthService({
        providers: cfg.providers,
        strategy: cfg.strategy,
        sessionKey: cfg.storageKeys.session,
        returnUrlKey: cfg.storageKeys.returnUrl,
        featureCredsKey: cfg.storageKeys.featureCreds,
      }),
    [cfg],
  );

  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });
  const [instance, setInstance] = useState<StrataInstance | null>(null);
  const instanceRef = useRef<StrataInstance | null>(null);
  const activeProviderRef = useRef<string | null>(null);

  useEffect(() => {
    void authService.tryRestoreSession();
    const sub = authService.state$.subscribe(setAuthState);
    return () => sub.unsubscribe();
  }, [authService]);

  useEffect(() => {
    const isAuthed = authState.status === 'authenticated' && !!authState.provider;
    const next = isAuthed ? authState.provider! : null;
    if (next === activeProviderRef.current) return;

    if (instanceRef.current) {
      const prev = instanceRef.current;
      instanceRef.current = null;
      activeProviderRef.current = null;
      setInstance(null);
      void prev.dispose();
    }

    if (!next) return;

    const provider = cfg.providers.find((p) => p.name === next);
    // Provider invariants (login feature requires cloud) are validated by
    // `defineProvider().build()`. Bail silently if the provider was removed
    // from config between sessions.
    if (!provider?.cloud) return;

    const inst = createStrataInstance({
      auth: authService,
      cloud: provider.cloud,
      appId: cfg.appId,
      deviceIdKey: cfg.storageKeys.deviceId,
      entities: cfg.entities,
      encryption: cfg.encryption,
      migrations: cfg.migrations,
      options: cfg.options,
    });
    instanceRef.current = inst;
    activeProviderRef.current = next;
    setInstance(inst);
  }, [authState, authService, cfg]);

  useEffect(() => {
    return () => {
      void instanceRef.current?.dispose();
      instanceRef.current = null;
      activeProviderRef.current = null;
    };
  }, []);

  return (
    <StrataContext.Provider
      value={{
        strata: instance?.strata ?? null,
        authState,
        authService,
      }}
    >
      {children}
    </StrataContext.Provider>
  );
}
