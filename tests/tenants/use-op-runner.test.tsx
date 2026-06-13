import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { WizardCancelled } from '@/wizard/types';
import type { CloudProvider, OpContext, ProviderOp } from '@/tenants/provider';
import { useOpRunner } from '@/tenants/use-op-runner';

// ── Mocks ────────────────────────────────────────────────
const wizardOpen = vi.fn();
const wizardClose = vi.fn();
const wizardController = { runStep: vi.fn(), setEstimatedTotal: vi.fn() };

vi.mock('@/wizard/use-wizard-host', () => ({
  useWizardHost: () => ({
    controller: wizardController,
    element: 'WIZARD_ELEMENT',
    open: wizardOpen,
    close: wizardClose,
    isOpen: true,
  }),
}));

const tenantOps = {
  probe: vi.fn(() => Promise.resolve({ exists: true })),
  create: vi.fn(() => Promise.resolve({ id: 'created' })),
  join: vi.fn(() => Promise.resolve({ id: 'joined' })),
  remove: vi.fn(() => Promise.resolve()),
};
const requestOpen = vi.fn();

vi.mock('@/react/tenant-provider', () => ({
  useTenant: () => ({ ops: tenantOps, requestOpen }),
}));

type TestConfig = {
  auth?: unknown;
  commonSteps?: unknown;
  encryption?: unknown;
};
let mockConfig: TestConfig;

vi.mock('@/react/fyredb-provider', () => ({
  useFyreDbContext: () => ({ config: mockConfig }),
}));

vi.mock('@fyre-db/plugins', () => ({
  FyreDbError: class FyreDbError extends Error {
    constructor(message: string, _opts?: unknown) {
      super(message);
      this.name = 'FyreDbError';
    }
  },
}));

// ── Fixtures ─────────────────────────────────────────────
function makeProvider(): CloudProvider {
  return {
    name: 'gdrive',
    label: 'Google Drive',
    theme: { color: '#1A73E8', accent: '#0F4DA8' },
    ops: [],
  };
}

function makeOp(run: ProviderOp['run']): ProviderOp {
  return { name: 'connect', label: 'Connect', placement: 'page-action', run };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockConfig = { auth: { id: 'auth' }, commonSteps: { encryptionSetup: vi.fn() }, encryption: { id: 'enc' } };
});

describe('useOpRunner', () => {
  it('exposes the wizard element and running state', () => {
    const { result } = renderHook(() => useOpRunner());
    expect(result.current.wizardElement).toBe('WIZARD_ELEMENT');
    expect(result.current.isRunning).toBe(true);
  });

  it('no-ops when auth is missing', async () => {
    mockConfig = { auth: undefined, commonSteps: { x: 1 } };
    const { result } = renderHook(() => useOpRunner());
    await act(async () => {
      await result.current.runOp(makeProvider(), makeOp(vi.fn()));
    });
    expect(wizardOpen).not.toHaveBeenCalled();
  });

  it('no-ops when commonSteps is missing', async () => {
    mockConfig = { auth: { id: 'auth' }, commonSteps: undefined };
    const run = vi.fn();
    const { result } = renderHook(() => useOpRunner());
    await act(async () => {
      await result.current.runOp(makeProvider(), makeOp(run));
    });
    expect(run).not.toHaveBeenCalled();
    expect(wizardOpen).not.toHaveBeenCalled();
  });

  it('opens the wizard, builds the OpContext, runs the op, and closes', async () => {
    let captured: OpContext | undefined;
    const run = vi.fn(async (ctx: OpContext) => { captured = ctx; });
    const provider = makeProvider();
    const op = makeOp(run);
    const tenant = { id: 't-1' };

    const { result } = renderHook(() => useOpRunner({ mode: 'dark' }));
    await act(async () => {
      // tenant param is typed as Tenant; the runner never inspects it here.
      await result.current.runOp(provider, op, tenant as never);
    });

    expect(wizardOpen).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledTimes(1);
    expect(wizardClose).toHaveBeenCalledTimes(1);
    expect(captured).toBeDefined();
    expect(captured?.auth).toBe(mockConfig.auth);
    expect(captured?.encryption).toBe(mockConfig.encryption);
    expect(captured?.commonSteps).toBe(mockConfig.commonSteps);
    expect(captured?.providerTheme).toBe(provider.theme);
    expect(captured?.mode).toBe('dark');
    expect(captured?.tenant).toBe(tenant);
    expect(captured?.wizard).toBe(wizardController);
  });

  it('routes tenant operations through the TenantProvider', async () => {
    const run = vi.fn(async (ctx: OpContext) => {
      await ctx.tenants.probe({ meta: {} });
      await ctx.tenants.create({ name: 'n', meta: {} });
      await ctx.tenants.join({ name: 'n', meta: {} });
      await ctx.tenants.open('t-1', { credential: 'c' });
      await ctx.tenants.remove('t-1', { purge: true });
    });

    const { result } = renderHook(() => useOpRunner());
    await act(async () => {
      await result.current.runOp(makeProvider(), makeOp(run));
    });

    expect(tenantOps.probe).toHaveBeenCalledWith({ meta: {} });
    expect(tenantOps.create).toHaveBeenCalledWith({ name: 'n', meta: {} });
    expect(tenantOps.join).toHaveBeenCalledWith({ name: 'n', meta: {} });
    expect(requestOpen).toHaveBeenCalledWith('t-1', { credential: 'c' });
    expect(tenantOps.remove).toHaveBeenCalledWith('t-1', { purge: true });
  });

  it('swallows WizardCancelled without calling onError', async () => {
    const onError = vi.fn();
    const run = vi.fn(() => Promise.reject(new WizardCancelled()));
    const { result } = renderHook(() => useOpRunner({ onError }));

    await act(async () => {
      await expect(result.current.runOp(makeProvider(), makeOp(run))).resolves.toBeUndefined();
    });

    expect(onError).not.toHaveBeenCalled();
    expect(wizardClose).toHaveBeenCalledTimes(1);
  });

  it('reports Error failures via onError and rethrows', async () => {
    const onError = vi.fn();
    const failure = new Error('boom');
    const run = vi.fn(() => Promise.reject(failure));
    const provider = makeProvider();
    const op = makeOp(run);
    const { result } = renderHook(() => useOpRunner({ onError }));

    await act(async () => {
      await expect(result.current.runOp(provider, op)).rejects.toBe(failure);
    });

    expect(onError).toHaveBeenCalledWith(failure, op, provider);
    expect(wizardClose).toHaveBeenCalledTimes(1);
  });

  it('wraps non-Error throws in FyreDbError', async () => {
    const onError = vi.fn();
    const run = vi.fn(() => Promise.reject('string-failure'));
    const { result } = renderHook(() => useOpRunner({ onError }));

    await act(async () => {
      await expect(result.current.runOp(makeProvider(), makeOp(run))).rejects.toThrow('string-failure');
    });

    expect(onError).toHaveBeenCalledTimes(1);
    const [err] = onError.mock.calls[0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('string-failure');
  });

  it('works without an onError handler on failure', async () => {
    const run = vi.fn(() => Promise.reject(new Error('no-handler')));
    const { result } = renderHook(() => useOpRunner());

    await act(async () => {
      await expect(result.current.runOp(makeProvider(), makeOp(run))).rejects.toThrow('no-handler');
    });
    expect(wizardClose).toHaveBeenCalledTimes(1);
  });
});
