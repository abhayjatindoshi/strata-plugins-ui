import type { ReactNode } from 'react';
import type { EncryptionService, Tenant } from 'strata-data-sync';
import type { ClientAuthService } from 'strata-adapters';
import type { Step, WizardController } from '../wizard/types';
import type { CloudFile, CloudSpace } from 'strata-adapters/cloud';

export type ProviderIcons = {
  readonly home?: ReactNode;
  readonly folder?: ReactNode | ((file: CloudFile) => ReactNode);
  readonly file?: ReactNode | ((file: CloudFile) => ReactNode);
  readonly space?: ReactNode | ((space: CloudSpace) => ReactNode);
  readonly separator?: ReactNode;
  readonly refresh?: ReactNode;
  readonly newFolder?: ReactNode;
  readonly close?: ReactNode;
  readonly search?: ReactNode;
  readonly loading?: ReactNode;
  readonly back?: ReactNode;
  readonly open?: ReactNode;
};

export type ProviderLabels = {
  readonly title?: string;
  readonly description?: string;
  readonly home?: string;
  readonly search?: string;
  readonly empty?: string;
  readonly loading?: string;
  readonly newFolder?: string;
  readonly newFolderPlaceholder?: string;
  readonly create?: string;
  readonly cancel?: string;
  readonly select?: string;
  readonly close?: string;
  readonly back?: string;
  readonly refresh?: string;
  readonly retry?: string;
  readonly open?: string;
  readonly errorTitle?: string;
  readonly columnName?: string;
  readonly columnDate?: string;
  readonly columnSize?: string;
};

export type ProviderTheme = {
  readonly color: string;
  readonly accent?: string;
  readonly className?: string;
  readonly icons?: ProviderIcons;
  readonly labels?: ProviderLabels;
};

export type OpPlacement = 'page-action' | 'tenant-menu' | 'tenant-action';

export type TenantOpsApi = {
  list(): Promise<readonly Tenant[]>;
  create(opts: {
    readonly name: string;
    readonly meta: Record<string, unknown>;
    readonly id?: string;
    readonly encryption?: { readonly credential: string };
  }): Promise<Tenant>;
  open(tenantId: string, opts?: { credential?: string }): Promise<void>;
  remove(tenantId: string, opts?: { purge?: boolean }): Promise<void>;
};

export type OpContext = {
  readonly auth: ClientAuthService;
  readonly tenants: TenantOpsApi;
  readonly encryption?: EncryptionService;
  readonly wizard: WizardController;
  readonly commonSteps: CommonStepFactories;
  readonly providerTheme: ProviderTheme;
  readonly mode?: 'light' | 'dark';
  readonly tenant?: Tenant;
};

/**
 * One named action a provider exposes. Per PLUGGABLES_V2 §12.
 */
export interface ProviderOp {
  readonly name: string;
  readonly label: string;
  readonly placement: OpPlacement;
  readonly icon?: ReactNode;
  run(ctx: OpContext): Promise<void>;
}

/**
 * Tenants-page citizen. Per PLUGGABLES_V2 §11.
 * `commonSteps` is owned by the host (passed via `<TenantsPage commonSteps={...}>`).
 */
export interface CloudProvider {
  readonly name: string;
  readonly label: string;
  readonly theme: ProviderTheme;
  readonly ops: readonly ProviderOp[];
}

/**
 * Cross-cutting step factories. Per PLUGGABLES_V2 §14.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CommonStepFactories = Record<string, (opts?: any) => Step<unknown>> & {
  encryptionSetup(opts?: { readonly theme?: ProviderTheme; readonly mode?: 'light' | 'dark' }): Step<string | null>;
  encryptionUnlock(opts?: { readonly theme?: ProviderTheme; readonly mode?: 'light' | 'dark' }): Step<string>;
};