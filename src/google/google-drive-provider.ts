import type {
  AccessToken,
  CloudFile,
  CloudFileService,
  CloudSpace,
  CloudAdapter,
} from 'strata-adapters';
import { GoogleDriveService } from 'strata-adapters';
import type { Tenant } from 'strata-data-sync';
import type {
  CloudProvider,
  OpContext,
  ProviderOp,
  ProviderTheme,
} from '../tenants/provider';
import { googleCreateWorkspaceStep } from './steps/google-create-workspace';
import { googleDriveTheme } from './google-drive-theme';

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
export class GoogleDriveProvider implements CloudProvider, CloudFileService, CloudAdapter {
  readonly name = 'google';
  readonly label = 'Google Drive';
  readonly theme: ProviderTheme;
  readonly ops: readonly ProviderOp[];
  private readonly service: GoogleDriveService;

  constructor(options: GoogleDriveProviderOptions) {
    this.service = new GoogleDriveService(options.getAccessToken);
    this.theme = options.theme ?? googleDriveTheme;
    this.ops = [makeCreateOp(this.service)];
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
    label: 'Create',
    placement: 'page-action',
    async run(ctx: OpContext) {
      ctx.wizard.setEstimatedTotal(2);
      const result = await ctx.wizard.runStep(
        googleCreateWorkspaceStep({
          service,
          mode: ctx.mode,
          theme: ctx.providerTheme,
        }),
      );
      const password = await ctx.wizard.runStep(
        ctx.commonSteps.encryptionSetup({ theme: ctx.providerTheme, mode: ctx.mode }),
      );
      await ctx.tenants.create({
        name: result.name,
        meta: { providerName: 'google', space: result.space.id, folderId: result.folderId, shareable: result.shareable },
        encryption: password ? { credential: password } : undefined,
      });
    },
  };
}