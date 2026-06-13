import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import { Subject, BehaviorSubject } from 'rxjs';
import type { ReactNode } from 'react';
import type { FyreDbConfig } from '@/react/create-fyredb-config';

/** Spies shared with the hoisted `@fyre-db/core` mock in each test file. */
export type ProviderSpies = {
  readonly ctorSpy: ReturnType<typeof vi.fn>;
  readonly disposeSpy: ReturnType<typeof vi.fn>;
};

/** Public surface of the provider module under test (fyredb / strata share it). */
export type ProviderModule = {
  readonly FyreDbProvider: (props: { readonly config: FyreDbConfig; readonly children: ReactNode }) => ReactNode;
  readonly useFyreDbContext: () => unknown;
  readonly useFyreDb: () => unknown;
  readonly useAuth: () => {
    readonly status: string;
    readonly name?: string;
    readonly supportedAuths: ReadonlyArray<{ readonly name: string }>;
    readonly logout: () => Promise<void>;
    readonly getAccessToken: () => Promise<unknown>;
  };
};

type FakeAuth = {
  readonly state$: Subject<{ status: string; name?: string }>;
  readonly supportedAuths: ReturnType<typeof vi.fn>;
  readonly logout: ReturnType<typeof vi.fn>;
  readonly getAccessToken: ReturnType<typeof vi.fn>;
};

function makeAuth(): FakeAuth {
  return {
    state$: new Subject(),
    supportedAuths: vi.fn(() => [{ name: 'google', login: vi.fn() }]),
    logout: vi.fn(() => Promise.resolve()),
    getAccessToken: vi.fn(() => Promise.resolve({ token: 't', expiresAt: 1 })),
  };
}

function makeCloud(adapter: { name: string } | null) {
  return { active: adapter, active$: new BehaviorSubject(adapter) };
}

function makeConfig(over: Partial<FyreDbConfig> = {}): FyreDbConfig {
  // Test double: only the fields the provider reads are populated.
  return {
    appId: 'app',
    deviceId: 'dev',
    entities: [],
    migrations: undefined,
    localAdapter: {} as unknown as FyreDbConfig['localAdapter'],
    cloud: undefined,
    providers: undefined,
    auth: undefined,
    encryption: undefined,
    commonSteps: null,
    credentialCacheKey: undefined,
    tenantLabels: { lower: 'w', sentence: 'W', upper: 'W' },
    ...over,
  } as FyreDbConfig;
}

export function runProviderSuite(name: string, mod: ProviderModule, spies: ProviderSpies): void {
  describe(name, () => {
    beforeEach(() => {
      spies.ctorSpy.mockClear();
      spies.disposeSpy.mockClear();
    });

    function wrapperFor(config: FyreDbConfig) {
      return ({ children }: { readonly children: ReactNode }) => (
        <mod.FyreDbProvider config={config}>{children}</mod.FyreDbProvider>
      );
    }

    it('throws when the context hook is used without a provider', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      function Probe() {
        mod.useFyreDbContext();
        return null;
      }
      expect(() => render(<Probe />)).toThrow(/missing <FyreDbProvider>/);
      vi.restoreAllMocks();
    });

    it('with no auth: signed-out and a FyreDb instance is built', () => {
      const config = makeConfig();
      const { result } = renderHook(() => ({ auth: mod.useAuth(), db: mod.useFyreDb() }), {
        wrapper: wrapperFor(config),
      });
      expect(result.current.auth.status).toBe('signed-out');
      expect(result.current.auth.supportedAuths).toEqual([]);
      expect(result.current.db).not.toBeNull();
      expect(spies.ctorSpy).toHaveBeenCalledTimes(1);
    });

    it('with auth: loading → signed-in builds the instance and exposes auth ops', async () => {
      const auth = makeAuth();
      const config = makeConfig({ auth: auth as unknown as FyreDbConfig['auth'] });
      const { result } = renderHook(() => ({ auth: mod.useAuth(), db: mod.useFyreDb() }), {
        wrapper: wrapperFor(config),
      });

      expect(result.current.auth.status).toBe('loading');
      expect(result.current.db).toBeNull();
      expect(result.current.auth.supportedAuths).toEqual([{ name: 'google', login: expect.any(Function) }]);

      act(() => {
        auth.state$.next({ status: 'signed-in', name: 'me' });
      });

      expect(result.current.auth.status).toBe('signed-in');
      expect(result.current.auth.name).toBe('me');
      expect(result.current.db).not.toBeNull();
      expect(spies.ctorSpy).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.auth.logout();
      });
      expect(auth.logout).toHaveBeenCalled();

      const token = await result.current.auth.getAccessToken();
      expect(token).toEqual({ token: 't', expiresAt: 1 });
    });

    it('logout rejects and getAccessToken resolves null when no auth is configured', async () => {
      const config = makeConfig();
      const { result } = renderHook(() => mod.useAuth(), { wrapper: wrapperFor(config) });
      await expect(result.current.logout()).rejects.toThrow(/no auth configured/);
      await expect(result.current.getAccessToken()).resolves.toBeNull();
    });

    it('rebuilds the instance when the cloud adapter changes', () => {
      const cloud = makeCloud({ name: 'gdrive' });
      const config = makeConfig({ cloud: cloud as unknown as FyreDbConfig['cloud'] });
      renderHook(() => mod.useFyreDb(), { wrapper: wrapperFor(config) });

      expect(spies.ctorSpy).toHaveBeenCalledTimes(1);
      act(() => {
        cloud.active$.next({ name: 'dropbox' });
      });
      expect(spies.ctorSpy).toHaveBeenCalledTimes(2);
      expect(spies.disposeSpy).toHaveBeenCalledTimes(1);
    });

    it('disposes the FyreDb instance and provider service on unmount', () => {
      const providers = { dispose: vi.fn() };
      const config = makeConfig({ providers: providers as unknown as FyreDbConfig['providers'] });
      const { unmount } = renderHook(() => mod.useFyreDb(), { wrapper: wrapperFor(config) });
      expect(spies.ctorSpy).toHaveBeenCalledTimes(1);
      unmount();
      expect(spies.disposeSpy).toHaveBeenCalledTimes(1);
      expect(providers.dispose).toHaveBeenCalledTimes(1);
    });
  });
}
