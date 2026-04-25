import type {
  AccessToken,
  CloudFile,
  CloudFileService,
  CloudSpace,
} from 'strata-adapters';
import { GoogleDriveService } from 'strata-adapters';
import type { StorageAdapter, Tenant } from 'strata-data-sync';
import type {
  CloudProvider,
  OpContext,
  ProviderOp,
  ProviderTheme,
} from '../tenants/provider';
import { pickSpaceStep, createFolderStep } from './steps/google-steps';

const GOOGLE_THEME: ProviderTheme = { color: '#1A73E8', accent: '#34A853' };

export type GoogleDriveProviderOptions = {
  readonly getAccessToken: () => Promise<AccessToken | null>;
  readonly theme?: ProviderTheme;
};

/**
 * Bundled Google Drive provider. Implements `CloudProvider`, `StorageAdapter`,
 * and `CloudFileService` from a single instance — the same object can be
 * passed to `new Strata({ storage: { cloud } })`, `<TenantsPage providers>`,
 * and `<GoogleDriveExplorer service>`.
 *
 * Per PLUGGABLES_V2 §11.
 */
export class GoogleDriveProvider implements CloudProvider, CloudFileService, StorageAdapter {
  readonly name = 'google';
  readonly label = 'Google Drive';
  readonly theme: ProviderTheme;
  readonly ops: readonly ProviderOp[];
  private readonly service: GoogleDriveService;

  constructor(options: GoogleDriveProviderOptions) {
    this.service = new GoogleDriveService(options.getAccessToken);
    this.theme = options.theme ?? GOOGLE_THEME;
    this.ops = [makeCreateOp(this.service), makeOpenOp(), makeShareOp()];
  }

  // StorageAdapter delegation
  read(tenant: Tenant | undefined, key: string) { return this.service.read(tenant, key); }
  write(tenant: Tenant | undefined, key: string, data: Uint8Array) { return this.service.write(tenant, key, data); }
  delete(tenant: Tenant | undefined, key: string) { return this.service.delete(tenant, key); }
  deriveTenantId(meta: Record<string, unknown>) { return this.service.deriveTenantId(meta); }

  // CloudFileService delegation
  getSpaces(signal?: AbortSignal): Promise<readonly CloudSpace[]> {
    return this.service.getSpaces(signal);
  }
  getListing(space: CloudSpace, parentId: string | null, search: string, signal?: AbortSignal): Promise<readonly CloudFile[]> {
    return this.service.getListing(space, parentId, search, signal);
  }
  createFolder(space: CloudSpace, name: string, parentId: string | null, signal?: AbortSignal): Promise<CloudFile> {
    return this.service.createFolder(space, name, parentId, signal);
  }
}

function makeCreateOp(service: GoogleDriveService): ProviderOp {
  return {
    name: 'create',
    label: 'Create new',
    placement: 'page-action',
    async run(ctx: OpContext) {
      ctx.wizard.setEstimatedTotal(3);
      const space = await ctx.wizard.runStep(pickSpaceStep({ service }));
      const folder = await ctx.wizard.runStep(createFolderStep({ service, space, parent: null }));
      const name = await ctx.wizard.runStep(ctx.commonSteps.tenantName());
      const requiresPassword = (ctx.encryption?.targets.length ?? 0) > 0;
      const password = requiresPassword
        ? await ctx.wizard.runStep(ctx.commonSteps.encryptionPassword({ intent: 'create' }))
        : null;
      await ctx.tenants.create({
        name,
        meta: { providerName: 'google', space: space.id, folderId: folder.id },
        encryption: password ? { credential: password } : undefined,
      });
    },
  };
}

function makeOpenOp(): ProviderOp {
  return {
    name: 'open',
    label: 'Open',
    placement: 'tenant-action',
    async run(ctx: OpContext) {
      if (!ctx.tenant) return;
      if (!ctx.tenant.encrypted) {
        await ctx.tenants.open(ctx.tenant.id);
        return;
      }
      const password = await ctx.wizard.runStep(ctx.commonSteps.encryptionPassword({ intent: 'open' }));
      await ctx.tenants.open(ctx.tenant.id, { credential: password });
    },
  };
}

function makeShareOp(): ProviderOp {
  return {
    name: 'share',
    label: 'Share',
    placement: 'tenant-menu',
    async run(_ctx: OpContext) { /* placeholder */ },
  };
}