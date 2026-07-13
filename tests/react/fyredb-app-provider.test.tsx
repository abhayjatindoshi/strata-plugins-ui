import { describe, it, expect, vi } from 'vitest';
import { render, renderHook, act, screen } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import type { ReactNode } from 'react';
import type { FyreDbApp, FyreDbStatus, Session, AuthState } from '@fyre-db/plugins';
import type { Tenant } from '@fyre-db/core';
import {
  FyreDbAppProvider,
  useFyreDbApp,
  useFyreDbAppContext,
  useStatus,
  useProvider,
  useTenant,
  useSession,
  useDb,
  useAuthActions,
  useAuthState,
} from '@/react/fyredb-app-provider';

function tenant(id: string): Tenant {
  return { id, name: id, meta: {} } as unknown as Tenant;
}

function makeApp() {
  const status$ = new BehaviorSubject<FyreDbStatus>('connecting');
  const provider$ = new BehaviorSubject<string | null>(null);
  const tenant$ = new BehaviorSubject<Tenant | undefined>(undefined);
  const tenants$ = new BehaviorSubject<readonly Tenant[]>([]);
  const session$ = new BehaviorSubject<Session | null>(null);
  const authState$ = new BehaviorSubject<AuthState>({ status: 'loading' });
  const dbInstance = { tag: 'db' };
  const signIn = vi.fn(() => Promise.resolve());
  const signOut = vi.fn(() => Promise.resolve());
  const useLocalOnly = vi.fn(() => Promise.resolve());
  const unlock = vi.fn(() => Promise.resolve());
  const auth = { state$: authState$, get state() { return authState$.value; } };
  const app = {
    status$, get status() { return status$.value; },
    provider$, get provider() { return provider$.value; },
    get providers() { return ['google', 'onedrive']; },
    tenant$, get tenant() { return tenant$.value; },
    tenants$, get tenants() { return tenants$.value; },
    session$, get session() { return session$.value; },
    get db() { return dbInstance; },
    get auth() { return auth; },
    signIn, signOut, useLocalOnly, unlock,
  } as unknown as FyreDbApp;
  return {
    app, status$, provider$, tenant$, tenants$, session$, authState$, dbInstance,
    spies: { signIn, signOut, useLocalOnly, unlock },
  };
}

function wrapperFor(app: FyreDbApp, props?: { commonSteps?: never; tenantLabel?: string }) {
  return ({ children }: { children: ReactNode }) => (
    <FyreDbAppProvider app={app} tenantLabel={props?.tenantLabel}>{children}</FyreDbAppProvider>
  );
}

describe('FyreDbAppProvider', () => {
  it('throws when a context hook is used without a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function Probe() { useFyreDbAppContext(); return null; }
    expect(() => render(<Probe />)).toThrow(/missing <FyreDbAppProvider>/);
    vi.restoreAllMocks();
  });

  it('exposes the app and default tenant labels / common steps', () => {
    const { app } = makeApp();
    const { result } = renderHook(() => useFyreDbAppContext(), { wrapper: wrapperFor(app) });
    expect(result.current.app).toBe(app);
    expect(result.current.tenantLabels).toEqual({ lower: 'workspace', sentence: 'Workspace', upper: 'WORKSPACE' });
    expect(result.current.commonSteps.encryptionSetup).toBeTypeOf('function');
  });

  it('builds labels from an explicit tenantLabel and accepts custom common steps', () => {
    const { app } = makeApp();
    const customStep = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FyreDbAppProvider app={app} tenantLabel="HouseHold" commonSteps={{ encryptionSetup: customStep }}>
        {children}
      </FyreDbAppProvider>
    );
    const { result } = renderHook(() => useFyreDbAppContext(), { wrapper });
    expect(result.current.tenantLabels).toEqual({ lower: 'household', sentence: 'Household', upper: 'HOUSEHOLD' });
    expect(result.current.commonSteps.encryptionSetup).toBe(customStep);
  });

  it('renders children', () => {
    const { app } = makeApp();
    render(<FyreDbAppProvider app={app}><span>hi</span></FyreDbAppProvider>);
    expect(screen.getByText('hi')).toBeInTheDocument();
  });

  it('useFyreDbApp returns the app', () => {
    const { app } = makeApp();
    const { result } = renderHook(() => useFyreDbApp(), { wrapper: wrapperFor(app) });
    expect(result.current).toBe(app);
  });

  it('useStatus tracks status$', () => {
    const { app, status$ } = makeApp();
    const { result } = renderHook(() => useStatus(), { wrapper: wrapperFor(app) });
    expect(result.current).toBe('connecting');
    act(() => { status$.next('ready'); });
    expect(result.current).toBe('ready');
  });

  it('useProvider exposes the active provider and the available list', () => {
    const { app, provider$ } = makeApp();
    const { result } = renderHook(() => useProvider(), { wrapper: wrapperFor(app) });
    expect(result.current).toEqual({ active: null, available: ['google', 'onedrive'] });
    act(() => { provider$.next('google'); });
    expect(result.current.active).toBe('google');
  });

  it('useTenant exposes the active tenant and the full list', () => {
    const { app, tenant$, tenants$ } = makeApp();
    const { result } = renderHook(() => useTenant(), { wrapper: wrapperFor(app) });
    expect(result.current).toEqual({ active: undefined, all: [] });
    act(() => { tenants$.next([tenant('a')]); tenant$.next(tenant('a')); });
    expect(result.current.active?.id).toBe('a');
    expect(result.current.all).toHaveLength(1);
  });

  it('useSession tracks session$', () => {
    const { app, session$ } = makeApp();
    const { result } = renderHook(() => useSession(), { wrapper: wrapperFor(app) });
    expect(result.current).toBeNull();
    act(() => { session$.next({ id: 1, tenant: tenant('a') } as Session); });
    expect(result.current?.id).toBe(1);
  });

  it('useDb is null without a session and the db once a session exists', () => {
    const { app, session$, dbInstance } = makeApp();
    const { result } = renderHook(() => useDb(), { wrapper: wrapperFor(app) });
    expect(result.current).toBeNull();
    act(() => { session$.next({ id: 1, tenant: tenant('a') } as Session); });
    expect(result.current).toBe(dbInstance);
  });

  it('useAuthActions delegates to the app', async () => {
    const { app, spies } = makeApp();
    const { result } = renderHook(() => useAuthActions(), { wrapper: wrapperFor(app) });
    await act(async () => {
      await result.current.signIn('google');
      await result.current.signOut();
      await result.current.useLocalOnly();
      await result.current.unlock('pw');
    });
    expect(spies.signIn).toHaveBeenCalledWith('google');
    expect(spies.signOut).toHaveBeenCalledTimes(1);
    expect(spies.useLocalOnly).toHaveBeenCalledTimes(1);
    expect(spies.unlock).toHaveBeenCalledWith('pw');
  });

  it('useAuthState tracks the auth service state$', () => {
    const { app, authState$ } = makeApp();
    const { result } = renderHook(() => useAuthState(), { wrapper: wrapperFor(app) });
    expect(result.current).toEqual({ status: 'loading' });
    const profile = { provider: 'google', userId: 'u-1', email: 'a@b.com', name: 'Ada', picture: '' };
    act(() => { authState$.next({ status: 'signed-in', name: 'google', profile }); });
    expect(result.current).toEqual({ status: 'signed-in', name: 'google', profile });
  });

  it('useAuthState returns signed-out for a local-only app (no auth service)', () => {
    const { app } = makeApp();
    Object.defineProperty(app, 'auth', { get: () => undefined });
    const { result } = renderHook(() => useAuthState(), { wrapper: wrapperFor(app) });
    expect(result.current).toEqual({ status: 'signed-out' });
  });
});
