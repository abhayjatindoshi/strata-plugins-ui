import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProviderTheme, OpContext } from '@/tenants/provider';

type ServiceInstance = {
  getAccessToken: unknown;
  read: ReturnType<typeof vi.fn>;
  write: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  deriveTenantId: ReturnType<typeof vi.fn>;
  getSpaces: ReturnType<typeof vi.fn>;
  getListing: ReturnType<typeof vi.fn>;
  createFolder: ReturnType<typeof vi.fn>;
};

const { instances } = vi.hoisted(() => ({ instances: [] as ServiceInstance[] }));

vi.mock('@fyre-db/plugins', () => {
  class MockGoogleDriveService {
    readonly getAccessToken: unknown;
    read = vi.fn(() => 'read');
    write = vi.fn(() => 'write');
    delete = vi.fn(() => 'delete');
    deriveTenantId = vi.fn(() => 'tid');
    getSpaces = vi.fn(async () => ['spaces']);
    getListing = vi.fn(async () => ['listing']);
    createFolder = vi.fn(async () => ({ id: 'nf', name: 'n', isFolder: true }));
    constructor(g: unknown) {
      this.getAccessToken = g;
      instances.push(this as unknown as ServiceInstance);
    }
  }
  return { GoogleDriveService: MockGoogleDriveService };
});
vi.mock('@/google/steps/google-create-workspace', () => ({
  googleCreateWorkspaceStep: vi.fn(() => ({ id: 's', theme: 'provider', render: () => null })),
}));

import { GoogleDriveProvider } from '@/google/google-drive-provider';
import { googleDriveTheme } from '@/google/google-drive-theme';
import { googleCreateWorkspaceStep } from '@/google/steps/google-create-workspace';

const createResult = {
  name: 'WS',
  space: { id: 'drive', displayName: 'My Drive' },
  folderId: 'fid',
  shareable: true,
};
const expectedMeta = { providerName: 'google', space: 'drive', folderId: 'fid', shareable: true };

type RunCtx = OpContext & {
  tenants: {
    probe: ReturnType<typeof vi.fn>;
    join: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

function makeCtx(opts: {
  exists: boolean;
  password?: string | null;
}): RunCtx {
  const runStep = vi.fn();
  runStep.mockResolvedValueOnce(createResult);
  if (!opts.exists) runStep.mockResolvedValueOnce(opts.password ?? null);
  return {
    auth: {} as never,
    tenants: {
      probe: vi.fn(async () => ({ exists: opts.exists })),
      join: vi.fn(async () => ({ id: 't' })),
      create: vi.fn(async () => ({ id: 't' })),
      open: vi.fn(),
      remove: vi.fn(),
    },
    wizard: { runStep, setEstimatedTotal: vi.fn() },
    commonSteps: {
      encryptionSetup: vi.fn(() => ({ id: 'enc', theme: 'provider', render: () => null })),
      encryptionUnlock: vi.fn(() => ({ id: 'unlock', theme: 'provider', render: () => null })),
    },
    providerTheme: googleDriveTheme,
    mode: 'light',
  } as unknown as RunCtx;
}

beforeEach(() => {
  instances.length = 0;
  vi.clearAllMocks();
});

describe('GoogleDriveProvider', () => {
  function build(theme?: ProviderTheme) {
    const getAccessToken = vi.fn(async () => null);
    const provider = new GoogleDriveProvider({ getAccessToken, theme });
    return { provider, getAccessToken, service: instances[0] };
  }

  it('exposes identity and the default theme', () => {
    const { provider } = build();
    expect(provider.name).toBe('google');
    expect(provider.label).toBe('Google Drive');
    expect(provider.theme).toBe(googleDriveTheme);
  });

  it('accepts a custom theme override', () => {
    const theme: ProviderTheme = { color: '#123' };
    const { provider } = build(theme);
    expect(provider.theme).toBe(theme);
  });

  it('passes the token getter to the service', () => {
    const { getAccessToken, service } = build();
    expect(service.getAccessToken).toBe(getAccessToken);
  });

  it('delegates storage and file methods to the service', async () => {
    const { provider, service } = build();
    expect(provider.read(undefined, 'k')).toBe('read');
    expect(provider.write(undefined, 'k', new Uint8Array())).toBe('write');
    expect(provider.delete(undefined, 'k')).toBe('delete');
    expect(provider.deriveTenantId({})).toBe('tid');
    await expect(provider.getSpaces()).resolves.toEqual(['spaces']);
    await expect(provider.getListing({ id: 'd', displayName: 'D' }, null, '')).resolves.toEqual(['listing']);
    await expect(provider.createFolder({ id: 'd', displayName: 'D' }, 'n', null)).resolves.toEqual({
      id: 'nf',
      name: 'n',
      isFolder: true,
    });
    expect(service.read).toHaveBeenCalledWith(undefined, 'k');
  });

  it('exposes a single create op', () => {
    const { provider } = build();
    expect(provider.ops).toHaveLength(1);
    expect(provider.ops[0]).toMatchObject({ name: 'create', label: 'Create', placement: 'page-action' });
  });

  it('run joins an existing workspace', async () => {
    const { provider } = build();
    const ctx = makeCtx({ exists: true });
    await provider.ops[0].run(ctx);
    expect(ctx.tenants.join).toHaveBeenCalledWith({ name: 'WS', meta: expectedMeta });
    expect(ctx.tenants.create).not.toHaveBeenCalled();
    expect(ctx.wizard.runStep).toHaveBeenCalledTimes(1);
    expect(googleCreateWorkspaceStep).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'light', theme: googleDriveTheme }),
    );
  });

  it('run creates a new encrypted workspace when a password is supplied', async () => {
    const { provider } = build();
    const ctx = makeCtx({ exists: false, password: 'secret' });
    await provider.ops[0].run(ctx);
    expect(ctx.tenants.create).toHaveBeenCalledWith({
      name: 'WS',
      meta: expectedMeta,
      encryption: { credential: 'secret' },
    });
  });

  it('run creates an unencrypted workspace when no password is supplied', async () => {
    const { provider } = build();
    const ctx = makeCtx({ exists: false, password: null });
    await provider.ops[0].run(ctx);
    expect(ctx.tenants.create).toHaveBeenCalledWith({
      name: 'WS',
      meta: expectedMeta,
      encryption: undefined,
    });
  });
});
