import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { EMPTY, type Observable } from 'rxjs';
import type { FyreDbApp, FyreDbStatus, Session, AuthState } from '@fyre-db/plugins';
import { FyreDbPluginConfigError } from '@fyre-db/plugins';
import type { FyreDb, Tenant } from '@fyre-db/core';
import { encryptionSetupStep } from '../steps/encryption-setup-step';
import type { CommonStepFactories } from '../tenants/provider';

// ─── Tenant labels ─────────────────────────────────────────

export type TenantLabels = {
  readonly lower: string;
  readonly sentence: string;
  readonly upper: string;
};

function buildTenantLabels(label: string): TenantLabels {
  return {
    lower: label.toLowerCase(),
    sentence: label.charAt(0).toUpperCase() + label.slice(1).toLowerCase(),
    upper: label.toUpperCase(),
  };
}

const DEFAULT_COMMON_STEPS: CommonStepFactories = { encryptionSetup: encryptionSetupStep };

// ─── Context ───────────────────────────────────────────────

type FyreDbAppContextValue = {
  readonly app: FyreDbApp;
  readonly commonSteps: CommonStepFactories;
  readonly tenantLabels: TenantLabels;
};

const FyreDbAppContext = createContext<FyreDbAppContextValue | null>(null);

export type FyreDbAppProviderProps = {
  readonly app: FyreDbApp;
  /** Step factories for the create-tenant wizard. Defaults to the built-in encryption setup step. */
  readonly commonSteps?: CommonStepFactories;
  /** Display label for a tenant (e.g. 'household'). Defaults to 'workspace'. */
  readonly tenantLabel?: string;
  readonly children: ReactNode;
};

/**
 * Puts a long-lived `FyreDbApp` (plus the wizard's step factories and tenant
 * labels) on context. The app owns all lifecycle — provider, tenant, session,
 * unlock — so this provider only exposes it for hooks to observe.
 */
export function FyreDbAppProvider({ app, commonSteps, tenantLabel, children }: FyreDbAppProviderProps) {
  const value = useMemo<FyreDbAppContextValue>(
    () => ({
      app,
      commonSteps: commonSteps ?? DEFAULT_COMMON_STEPS,
      tenantLabels: buildTenantLabels(tenantLabel ?? 'workspace'),
    }),
    [app, commonSteps, tenantLabel],
  );
  return <FyreDbAppContext.Provider value={value}>{children}</FyreDbAppContext.Provider>;
}

/** Internal — full context for wizard components. */
export function useFyreDbAppContext(): FyreDbAppContextValue {
  const ctx = useContext(FyreDbAppContext);
  if (!ctx) throw new FyreDbPluginConfigError('useFyreDbApp: missing <FyreDbAppProvider>');
  return ctx;
}

export function useFyreDbApp(): FyreDbApp {
  return useFyreDbAppContext().app;
}

// ─── Reactive hooks ────────────────────────────────────────

/** Subscribe a component to an observable, reading the current value via a sync getter. */
function useObservableValue<T>(obs: Observable<T>, getSnapshot: () => T): T {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const sub = obs.subscribe(() => { onChange(); });
      return () => { sub.unsubscribe(); };
    },
    [obs],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useStatus(): FyreDbStatus {
  const app = useFyreDbApp();
  return useObservableValue(app.status$, () => app.status);
}

export type UseProviderResult = {
  readonly active: string | null;
  readonly available: readonly string[];
};

export function useProvider(): UseProviderResult {
  const app = useFyreDbApp();
  const active = useObservableValue(app.provider$, () => app.provider);
  const available = useMemo(() => app.providers, [app]);
  return useMemo(() => ({ active, available }), [active, available]);
}

export type UseTenantResult = {
  readonly active: Tenant | undefined;
  readonly all: readonly Tenant[];
};

export function useTenant(): UseTenantResult {
  const app = useFyreDbApp();
  const active = useObservableValue(app.tenant$, () => app.tenant);
  const all = useObservableValue(app.tenants$, () => app.tenants);
  return useMemo(() => ({ active, all }), [active, all]);
}

export function useSession(): Session | null {
  const app = useFyreDbApp();
  return useObservableValue(app.session$, () => app.session);
}

const SIGNED_OUT_STATE: AuthState = { status: 'signed-out' };

/**
 * The current auth state — status, active adapter `name`, and the signed-in
 * account's `profile` (id/email/name/picture) when the server resolved it.
 * Returns a stable signed-out state for local-only apps (no auth service).
 */
export function useAuthState(): AuthState {
  const app = useFyreDbApp();
  const auth = app.auth;
  const obs: Observable<AuthState> = auth ? auth.state$ : EMPTY;
  return useObservableValue(obs, () => auth?.state ?? SIGNED_OUT_STATE);
}

/** The active core `FyreDb` while a tenant is open, else `null`. */
export function useDb(): FyreDb | null {
  const app = useFyreDbApp();
  const session = useSession();
  return session ? app.db : null;
}

export type UseAuthActionsResult = {
  readonly signIn: (provider: string) => Promise<void>;
  readonly signOut: () => Promise<void>;
  readonly useLocalOnly: () => Promise<void>;
  readonly unlock: (password: string) => Promise<void>;
};

export function useAuthActions(): UseAuthActionsResult {
  const app = useFyreDbApp();
  return useMemo(
    () => ({
      signIn: (provider: string) => app.signIn(provider),
      signOut: () => app.signOut(),
      useLocalOnly: () => app.useLocalOnly(),
      unlock: (password: string) => app.unlock(password),
    }),
    [app],
  );
}
