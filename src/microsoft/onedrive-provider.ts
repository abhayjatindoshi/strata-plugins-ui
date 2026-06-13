import type {
  AccessToken,
  CloudFile,
  CloudFileService,
  CloudSpace,
  CloudAdapter,
} from '@fyre-db/plugins';
import { OneDriveService } from '@fyre-db/plugins';
import type { Tenant } from '@fyre-db/core';
import './onedrive.css';
import type {
  CloudProvider,
  OpContext,
  ProviderOp,
  ProviderTheme,
} from '../tenants/provider';
import { onedriveCreateWorkspaceStep } from './steps/onedrive-create-workspace';
import { oneDriveTheme } from './onedrive-theme';

export type OneDriveProviderOptions = {
  readonly getAccessToken: () => Promise<AccessToken | null>;
  readonly theme?: ProviderTheme;
};

export class OneDriveProvider implements CloudProvider, CloudFileService, CloudAdapter {
  readonly name = 'microsoft';
  readonly label = 'OneDrive';
  readonly theme: ProviderTheme;
  readonly ops: readonly ProviderOp[];
  private readonly service: OneDriveService;

  constructor(options: OneDriveProviderOptions) {
    this.service = new OneDriveService(options.getAccessToken);
    this.theme = options.theme ?? oneDriveTheme;
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

function makeCreateOp(service: OneDriveService): ProviderOp {
  return {
    name: 'create',
    label: 'Create',
    placement: 'page-action',
    async run(ctx: OpContext) {
      const result = await ctx.wizard.runStep(
        onedriveCreateWorkspaceStep({
          service,
          mode: ctx.mode,
          theme: ctx.providerTheme,
        }),
      );

      const meta = { providerName: 'microsoft', space: result.space.id, folderId: result.folderId, shareable: result.shareable };
      const probe = await ctx.tenants.probe({ meta });

      if (probe.exists) {
        await ctx.tenants.join({ name: result.name, meta });
      } else {
        const password = await ctx.wizard.runStep(
          ctx.commonSteps.encryptionSetup({ theme: ctx.providerTheme, mode: ctx.mode }),
        );
        await ctx.tenants.create({
          name: result.name,
          meta,
          encryption: password ? { credential: password } : undefined,
        });
      }
    },
  };
}
