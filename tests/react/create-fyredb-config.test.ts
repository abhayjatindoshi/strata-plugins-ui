import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFyreDbConfig } from '@/react/create-fyredb-config';

vi.mock('@fyre-db/plugins', () => ({
  LocalStorageAdapter: class {
    constructor(public readonly appId: string) {}
  },
  Pbkdf2EncryptionService: class {
    readonly kind = 'pbkdf2';
    constructor(public readonly opts: unknown) {}
  },
  AesGcmEncryptionStrategy: class {
    readonly kind = 'aesgcm';
  },
}));

const setupStepMock = vi.fn();
const unlockStepMock = vi.fn();
vi.mock('@/steps/index', () => ({
  encryptionSetupStep: (...args: unknown[]) => setupStepMock(...args),
  encryptionUnlockStep: (...args: unknown[]) => unlockStepMock(...args),
}));

const baseInput = { appId: 'my-app', entities: [] } as const;

describe('createFyreDbConfig', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('generates and persists a device id when none exists', () => {
    const config = createFyreDbConfig({ ...baseInput });
    expect(config.deviceId).toBeTruthy();
    expect(localStorage.getItem('my-app_device_id')).toBe(config.deviceId);
  });

  it('reuses an existing persisted device id', () => {
    localStorage.setItem('my-app_device_id', 'persisted-id');
    const config = createFyreDbConfig({ ...baseInput });
    expect(config.deviceId).toBe('persisted-id');
  });

  it('honors an explicit device id and skips localStorage', () => {
    const config = createFyreDbConfig({ ...baseInput, deviceId: 'explicit' });
    expect(config.deviceId).toBe('explicit');
    expect(localStorage.getItem('my-app_device_id')).toBeNull();
  });

  it('defaults the local adapter to LocalStorageAdapter', () => {
    const config = createFyreDbConfig({ ...baseInput });
    expect(config.localAdapter).toMatchObject({ appId: 'my-app' });
  });

  it('uses a provided local adapter', () => {
    // Minimal StorageAdapter stand-in; only identity is asserted.
    const localAdapter = { name: 'custom' } as unknown as Parameters<typeof createFyreDbConfig>[0]['localAdapter'];
    const config = createFyreDbConfig({ ...baseInput, localAdapter });
    expect(config.localAdapter).toBe(localAdapter);
  });

  it('builds a default Pbkdf2 encryption service', () => {
    const config = createFyreDbConfig({ ...baseInput });
    expect(config.encryption).toMatchObject({ kind: 'pbkdf2' });
  });

  it('disables encryption when encryption is false', () => {
    const config = createFyreDbConfig({ ...baseInput, encryption: false });
    expect(config.encryption).toBeUndefined();
  });

  it('uses a provided encryption service', () => {
    const encryption = { kind: 'custom' } as unknown as Parameters<typeof createFyreDbConfig>[0]['encryption'];
    const config = createFyreDbConfig({ ...baseInput, encryption });
    expect(config.encryption).toBe(encryption);
  });

  it('defaults the tenant label to "workspace"', () => {
    const config = createFyreDbConfig({ ...baseInput });
    expect(config.tenantLabels).toEqual({ lower: 'workspace', sentence: 'Workspace', upper: 'WORKSPACE' });
  });

  it('builds tenant labels from a custom mixed-case label', () => {
    const config = createFyreDbConfig({ ...baseInput, tenantLabel: 'hOUSEHOLD' });
    expect(config.tenantLabels).toEqual({ lower: 'household', sentence: 'Household', upper: 'HOUSEHOLD' });
  });

  it('provides default common steps when none supplied', () => {
    const config = createFyreDbConfig({ ...baseInput });
    expect(config.commonSteps).not.toBeNull();
    config.commonSteps?.encryptionSetup();
    config.commonSteps?.encryptionUnlock();
    expect(setupStepMock).toHaveBeenCalled();
    expect(unlockStepMock).toHaveBeenCalled();
  });

  it('uses provided common steps', () => {
    const commonSteps = { encryptionSetup: vi.fn(), encryptionUnlock: vi.fn() } as unknown as NonNullable<
      Parameters<typeof createFyreDbConfig>[0]['commonSteps']
    >;
    const config = createFyreDbConfig({ ...baseInput, commonSteps });
    expect(config.commonSteps).toBe(commonSteps);
  });

  it('passes through optional services and keys', () => {
    const cloud = { name: 'cloud' } as unknown as Parameters<typeof createFyreDbConfig>[0]['cloud'];
    const providers = { name: 'providers' } as unknown as Parameters<typeof createFyreDbConfig>[0]['providers'];
    const auth = { name: 'auth' } as unknown as Parameters<typeof createFyreDbConfig>[0]['auth'];
    const migrations = [] as unknown as Parameters<typeof createFyreDbConfig>[0]['migrations'];
    const config = createFyreDbConfig({
      ...baseInput,
      cloud,
      providers,
      auth,
      migrations,
      credentialCacheKey: 'cred-key',
    });
    expect(config.cloud).toBe(cloud);
    expect(config.providers).toBe(providers);
    expect(config.auth).toBe(auth);
    expect(config.migrations).toBe(migrations);
    expect(config.credentialCacheKey).toBe('cred-key');
    expect(config.appId).toBe('my-app');
    expect(config.entities).toBe(baseInput.entities);
  });
});
