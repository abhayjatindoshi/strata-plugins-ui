import {
  LocalStorageAdapter,
  Pbkdf2EncryptionService,
  AesGcmEncryptionStrategy,
} from 'strata-adapters';
import type { ClientAuthService, CloudService } from 'strata-adapters';
import type {
  BlobMigration,
  EncryptionService,
  EntityDefinition,
  StorageAdapter,
} from 'strata-data-sync';
import {
  tenantNameStep,
  tenantCustomizeStep,
  encryptionPasswordStep,
} from '../steps/index';
import type { CommonStepFactories } from '../tenants/provider';
import type { CloudProviderService } from '../tenants/cloud-provider-service';

// ─── Input type ────────────────────────────────────────

export type StrataConfigInput = {
  readonly appId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly entities: ReadonlyArray<EntityDefinition<any>>;
  /** Cloud service — resolves the active storage adapter from auth state. */
  readonly cloud?: CloudService;
  /** Cloud provider service — UI ops for the tenants page. */
  readonly providers?: CloudProviderService;
  /** Auth service. */
  readonly auth?: ClientAuthService;

  // ── overrides (all optional, sensible defaults applied) ──
  readonly deviceId?: string;
  readonly localAdapter?: StorageAdapter;
  /** Pass `false` to disable default encryption. */
  readonly encryption?: EncryptionService | false;
  readonly commonSteps?: CommonStepFactories;
  readonly migrations?: ReadonlyArray<BlobMigration>;
};

// ─── Resolved config ───────────────────────────────────────

export type StrataConfig = {
  readonly appId: string;
  readonly deviceId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly entities: ReadonlyArray<EntityDefinition<any>>;
  readonly migrations?: ReadonlyArray<BlobMigration>;
  readonly localAdapter: StorageAdapter;
  readonly cloud?: CloudService;
  readonly providers?: CloudProviderService;
  readonly auth?: ClientAuthService;
  readonly encryption?: EncryptionService;
  readonly commonSteps: CommonStepFactories | null;
};

// ─── Device ID helper ──────────────────────────────────────

function getOrCreateDeviceId(appId: string): string {
  const key = `${appId}_device_id`;
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

// ─── Builder ───────────────────────────────────────────────

export function createStrataConfig(input: StrataConfigInput): StrataConfig {
  const {
    appId,
    entities,
    auth,
    migrations,
  } = input;

  const deviceId = input.deviceId ?? getOrCreateDeviceId(appId);
  const localAdapter = input.localAdapter ?? new LocalStorageAdapter(appId);
  const cloud = input.cloud;

  const encryption =
    input.encryption === false
      ? undefined
      : input.encryption ??
        new Pbkdf2EncryptionService({
          targets: ['cloud'],
          strategy: new AesGcmEncryptionStrategy(),
        });

  const commonSteps: CommonStepFactories | null =
    input.commonSteps ?? {
      tenantName: tenantNameStep,
      tenantCustomize: tenantCustomizeStep,
      encryptionPassword: encryptionPasswordStep,
    };

  return {
    appId,
    deviceId,
    entities,
    migrations,
    localAdapter,
    cloud,
    providers: input.providers,
    auth,
    encryption,
    commonSteps,
  };
}
