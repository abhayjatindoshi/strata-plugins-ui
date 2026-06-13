import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import type { ReactNode } from 'react';
import { TenantProvider, useTenant, type UseTenantResult } from '@/react/tenant-provider';
import { xorEncode } from '@/utils/xor';

// ── Mocks ───────────────────────────────────────────────────

let ctxValue: { fyredb: unknown; config: unknown };
vi.mock('@/react/fyredb-provider', () => ({
  useFyreDbContext: () => ctxValue,
}));

vi.mock('@fyre-db/plugins', () => ({
  FyreDbError: class extends Error {
    readonly kind: string;
    constructor(message: string, opts: { kind: string }) {
      super(message);
      this.name = 'FyreDbError';
      this.kind = opts.kind;
    }
  },
  FyreDbPluginConfigError: class extends Error {
    constructor(message?: string) {
      super(message);
      this.name = 'FyreDbPluginConfigError';
    }
  },
}));

// ── Helpers ─────────────────────────────────────────────────

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

type FakeTenants = {
  activeTenant$: BehaviorSubject<unknown>;
  tenants$: BehaviorSubject<readonly unknown[]>;
  activeTenant: { id: string } | undefined;
  open: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  probe: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  join: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};

function makeFyreDb(active?: { id: string }): { tenants: FakeTenants } {
  const tenants: FakeTenants = {
    activeTenant$: new BehaviorSubject<unknown>(active),
    tenants$: new BehaviorSubject<readonly unknown[]>([]),
    activeTenant: active,
    open: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
    probe: vi.fn(() => Promise.resolve({ exists: true })),
    create: vi.fn(() => Promise.resolve({ id: 'created' })),
    join: vi.fn(() => Promise.resolve({ id: 'joined' })),
    remove: vi.fn(() => Promise.resolve()),
  };
  return { tenants };
}

let api: UseTenantResult;
function Probe() {
  api = useTenant();
  return (
    <div>
      <span data-testid="status">{api.status}</span>
      <span data-testid="active">{api.active?.id ?? 'none'}</span>
      <span data-testid="error">{api.error?.message ?? 'none'}</span>
      <span data-testid="all">{api.all.length}</span>
      <span data-testid="pa">{api.pageActions.length}</span>
    </div>
  );
}

function renderProvider(children: ReactNode = <Probe />) {
  return render(<TenantProvider>{children}</TenantProvider>);
}

beforeEach(() => {
  sessionStorage.clear();
  ctxValue = { fyredb: null, config: {} };
});

// ── Default context (no provider) ───────────────────────────

describe('useTenant default context', () => {
  it('exposes idle defaults and rejecting ops outside a provider', async () => {
    render(<Probe />);
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(api.requestOpen('whatever')).toBeUndefined();
    await expect(api.ops.close()).rejects.toThrow(/not mounted/);
    await expect(api.ops.probe({ meta: {} })).rejects.toThrow(/not mounted/);
    await expect(api.ops.create({ name: 'n', meta: {} })).rejects.toThrow(/not mounted/);
    await expect(api.ops.join({ name: 'n', meta: {} })).rejects.toThrow(/not mounted/);
    await expect(api.ops.remove('id')).rejects.toThrow(/not mounted/);
  });
});

// ── No fyredb ───────────────────────────────────────────────

describe('TenantProvider without a FyreDb instance', () => {
  it('stays idle and ops throw / no-op', async () => {
    ctxValue = { fyredb: null, config: {} };
    renderProvider();
    expect(screen.getByTestId('status')).toHaveTextContent('idle');

    act(() => {
      api.requestOpen('t1'); // no-op: no fyredb
    });
    expect(screen.getByTestId('status')).toHaveTextContent('idle');

    await act(async () => {
      await api.ops.close(); // returns early
    });
    await expect(api.ops.probe({ meta: {} })).rejects.toThrow(/not initialized/);
    await expect(api.ops.create({ name: 'n', meta: {} })).rejects.toThrow(/not initialized/);
    await expect(api.ops.join({ name: 'n', meta: {} })).rejects.toThrow(/not initialized/);
    await expect(api.ops.remove('id')).rejects.toThrow(/not initialized/);
  });
});

// ── Open lifecycle ──────────────────────────────────────────

describe('TenantProvider open lifecycle', () => {
  it('subscribes to active tenant and list on mount', () => {
    const db = makeFyreDb({ id: 't1' });
    db.tenants.tenants$.next([{ id: 't1' }, { id: 't2' }]);
    ctxValue = { fyredb: db, config: {} };
    renderProvider();
    expect(screen.getByTestId('active')).toHaveTextContent('t1');
    expect(screen.getByTestId('all')).toHaveTextContent('2');
  });

  it('hydrates on requestOpen and caches the credential', async () => {
    const db = makeFyreDb({ id: 't1' });
    ctxValue = { fyredb: db, config: { credentialCacheKey: 'cred', deviceId: 'dev' } };
    renderProvider();

    await act(async () => {
      api.requestOpen('t1', { credential: 'pw' });
    });

    expect(db.tenants.open).toHaveBeenCalledWith('t1', { credential: 'pw' });
    expect(screen.getByTestId('status')).toHaveTextContent('hydrated');
    expect(screen.getByTestId('error')).toHaveTextContent('none');
    expect(sessionStorage.getItem('cred')).not.toBeNull();
  });

  it('opens without credential when none is provided or cached', async () => {
    const db = makeFyreDb({ id: 't1' });
    ctxValue = { fyredb: db, config: {} };
    renderProvider();
    await act(async () => {
      api.requestOpen('t1');
    });
    expect(db.tenants.open).toHaveBeenCalledWith('t1', undefined);
  });

  it('opens without credential when the cache key is set but empty', async () => {
    const db = makeFyreDb({ id: 't1' });
    ctxValue = { fyredb: db, config: { credentialCacheKey: 'cred', deviceId: 'dev' } };
    renderProvider();
    await act(async () => {
      api.requestOpen('t1');
    });
    expect(db.tenants.open).toHaveBeenCalledWith('t1', undefined);
  });

  it('reads a cached credential matching the tenant', async () => {
    const db = makeFyreDb({ id: 't1' });
    sessionStorage.setItem('cred', xorEncode(JSON.stringify({ tenantId: 't1', credential: 'cached' }), 'dev'));
    ctxValue = { fyredb: db, config: { credentialCacheKey: 'cred', deviceId: 'dev' } };
    renderProvider();
    await act(async () => {
      api.requestOpen('t1');
    });
    expect(db.tenants.open).toHaveBeenCalledWith('t1', { credential: 'cached' });
  });

  it('ignores a cached credential for a different tenant', async () => {
    const db = makeFyreDb({ id: 't1' });
    sessionStorage.setItem('cred', xorEncode(JSON.stringify({ tenantId: 'other', credential: 'x' }), 'dev'));
    ctxValue = { fyredb: db, config: { credentialCacheKey: 'cred', deviceId: 'dev' } };
    renderProvider();
    await act(async () => {
      api.requestOpen('t1');
    });
    expect(db.tenants.open).toHaveBeenCalledWith('t1', undefined);
  });

  it('ignores a cached entry whose credential is not a string', async () => {
    const db = makeFyreDb({ id: 't1' });
    sessionStorage.setItem('cred', xorEncode(JSON.stringify({ tenantId: 't1', credential: 123 }), 'dev'));
    ctxValue = { fyredb: db, config: { credentialCacheKey: 'cred', deviceId: 'dev' } };
    renderProvider();
    await act(async () => {
      api.requestOpen('t1');
    });
    expect(db.tenants.open).toHaveBeenCalledWith('t1', undefined);
  });

  it('tolerates an unparseable cached credential', async () => {
    const db = makeFyreDb({ id: 't1' });
    sessionStorage.setItem('cred', xorEncode('not-json', 'dev'));
    ctxValue = { fyredb: db, config: { credentialCacheKey: 'cred', deviceId: 'dev' } };
    renderProvider();
    await act(async () => {
      api.requestOpen('t1');
    });
    expect(db.tenants.open).toHaveBeenCalledWith('t1', undefined);
  });

  it('no-ops when already hydrated for the same tenant', async () => {
    const db = makeFyreDb({ id: 't1' });
    ctxValue = { fyredb: db, config: {} };
    renderProvider();
    await act(async () => {
      api.requestOpen('t1');
    });
    expect(db.tenants.open).toHaveBeenCalledTimes(1);
    act(() => {
      api.requestOpen('t1'); // hydrated → no-op
    });
    expect(db.tenants.open).toHaveBeenCalledTimes(1);
  });

  it('no-ops when a request for the same tenant is already inflight', async () => {
    const db = makeFyreDb({ id: 't1' });
    const d = deferred<void>();
    db.tenants.open.mockReturnValueOnce(d.promise);
    ctxValue = { fyredb: db, config: {} };
    renderProvider();
    act(() => {
      api.requestOpen('t1');
    });
    act(() => {
      api.requestOpen('t1'); // inflight → no-op
    });
    expect(db.tenants.open).toHaveBeenCalledTimes(1);
    await act(async () => {
      d.resolve();
      await d.promise;
    });
    expect(screen.getByTestId('status')).toHaveTextContent('hydrated');
  });

  it('aborts a previous inflight request when a new tenant is requested', async () => {
    const db = makeFyreDb({ id: 't2' });
    const first = deferred<void>();
    db.tenants.open.mockReturnValueOnce(first.promise); // t1
    ctxValue = { fyredb: db, config: {} };
    renderProvider();
    act(() => {
      api.requestOpen('t1');
    });
    act(() => {
      api.requestOpen('t2'); // aborts t1, starts t2 (resolves immediately)
    });
    await act(async () => {
      first.resolve(); // t1 resolves but is aborted → ignored
      await first.promise;
    });
    expect(screen.getByTestId('status')).toHaveTextContent('hydrated');
    expect(db.tenants.open).toHaveBeenCalledTimes(2);
  });

  it('sets error state when open rejects with an Error', async () => {
    const db = makeFyreDb({ id: 't1' });
    db.tenants.open.mockReturnValueOnce(Promise.reject(new Error('boom')));
    ctxValue = { fyredb: db, config: {} };
    renderProvider();
    await act(async () => {
      api.requestOpen('t1');
    });
    expect(screen.getByTestId('status')).toHaveTextContent('error');
    expect(screen.getByTestId('error')).toHaveTextContent('boom');
  });

  it('wraps a non-Error rejection from open', async () => {
    const db = makeFyreDb({ id: 't1' });
    db.tenants.open.mockReturnValueOnce(Promise.reject('string-failure'));
    ctxValue = { fyredb: db, config: {} };
    renderProvider();
    await act(async () => {
      api.requestOpen('t1');
    });
    expect(screen.getByTestId('status')).toHaveTextContent('error');
    expect(screen.getByTestId('error')).toHaveTextContent('string-failure');
  });

  it('ignores a rejection from an aborted inflight request', async () => {
    const db = makeFyreDb({ id: 't2' });
    const first = deferred<void>();
    db.tenants.open.mockReturnValueOnce(first.promise); // t1
    ctxValue = { fyredb: db, config: {} };
    renderProvider();
    act(() => {
      api.requestOpen('t1');
    });
    act(() => {
      api.requestOpen('t2');
    });
    await act(async () => {
      first.reject(new Error('aborted-failure'));
      await first.promise.catch(() => {});
    });
    // t2 succeeded; t1's rejection was ignored.
    expect(screen.getByTestId('status')).toHaveTextContent('hydrated');
    expect(screen.getByTestId('error')).toHaveTextContent('none');
  });
});

// ── Ops ─────────────────────────────────────────────────────

describe('TenantProvider ops', () => {
  it('close aborts inflight, clears cache, and returns to idle', async () => {
    const db = makeFyreDb({ id: 't1' });
    const d = deferred<void>();
    db.tenants.open.mockReturnValueOnce(d.promise);
    sessionStorage.setItem('cred', 'present');
    ctxValue = { fyredb: db, config: { credentialCacheKey: 'cred' } };
    renderProvider();
    act(() => {
      api.requestOpen('t1'); // inflight
    });
    await act(async () => {
      await api.ops.close();
    });
    expect(db.tenants.close).toHaveBeenCalled();
    expect(sessionStorage.getItem('cred')).toBeNull();
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
  });

  it('close with no inflight and no cache key still resets', async () => {
    const db = makeFyreDb({ id: 't1' });
    ctxValue = { fyredb: db, config: {} };
    renderProvider();
    await act(async () => {
      await api.ops.close();
    });
    expect(db.tenants.close).toHaveBeenCalled();
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
  });

  it('probe, create and join delegate to the FyreDb tenants API', async () => {
    const db = makeFyreDb({ id: 't1' });
    ctxValue = { fyredb: db, config: {} };
    renderProvider();
    await expect(api.ops.probe({ meta: { a: 1 } })).resolves.toEqual({ exists: true });
    await expect(api.ops.create({ name: 'n', meta: {} })).resolves.toEqual({ id: 'created' });
    await expect(api.ops.join({ name: 'n', meta: {} })).resolves.toEqual({ id: 'joined' });
  });

  it('remove delegates and clears the credential cache when configured', async () => {
    const db = makeFyreDb({ id: 't1' });
    sessionStorage.setItem('cred', 'present');
    ctxValue = { fyredb: db, config: { credentialCacheKey: 'cred' } };
    renderProvider();
    await act(async () => {
      await api.ops.remove('t1', { purge: true });
    });
    expect(db.tenants.remove).toHaveBeenCalledWith('t1', { purge: true });
    expect(sessionStorage.getItem('cred')).toBeNull();
  });

  it('remove without a cache key skips cache removal', async () => {
    const db = makeFyreDb({ id: 't1' });
    ctxValue = { fyredb: db, config: {} };
    renderProvider();
    await act(async () => {
      await api.ops.remove('t1');
    });
    expect(db.tenants.remove).toHaveBeenCalledWith('t1', undefined);
  });
});

// ── Page actions (cloud) ────────────────────────────────────

describe('TenantProvider page actions', () => {
  const provider = {
    name: 'gdrive',
    ops: [
      { name: 'a', placement: 'page-action' },
      { name: 'b', placement: 'tenant-menu' },
    ],
  };

  it('derives page actions from the active cloud provider and reacts to changes', () => {
    const db = makeFyreDb({ id: 't1' });
    const active$ = new BehaviorSubject<{ name: string } | null>({ name: 'gdrive' });
    const providers = { get: vi.fn((name: string) => (name === 'gdrive' ? provider : undefined)) };
    ctxValue = { fyredb: db, config: { cloud: { active$ }, providers } };
    renderProvider();
    expect(screen.getByTestId('pa')).toHaveTextContent('1');

    act(() => {
      active$.next(null); // no adapter → no actions
    });
    expect(screen.getByTestId('pa')).toHaveTextContent('0');

    act(() => {
      active$.next({ name: 'unknown' }); // provider not found → no actions
    });
    expect(screen.getByTestId('pa')).toHaveTextContent('0');
  });

  it('yields no page actions when providers are not configured', () => {
    const db = makeFyreDb({ id: 't1' });
    const active$ = new BehaviorSubject<{ name: string } | null>({ name: 'gdrive' });
    ctxValue = { fyredb: db, config: { cloud: { active$ } } };
    renderProvider();
    expect(screen.getByTestId('pa')).toHaveTextContent('0');
  });
});
