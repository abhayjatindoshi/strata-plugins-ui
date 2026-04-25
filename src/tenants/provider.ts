import type { ReactNode } from 'react';
import type { EncryptionService, Tenant } from 'strata-data-sync';
import type { ClientAuthService } from 'strata-adapters';
import type { Step, WizardController } from '../wizard/types';

export type ProviderTheme = {
  readonly color: string;
  readonly accent?: string;
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
export type CommonStepFactories = Record<string, (opts?: any) => Step<any>> & {
  tenantName(opts?: { readonly initial?: string }): Step<string>;
  tenantCustomize(opts?: {
    readonly initial?: { readonly color?: string; readonly icon?: string };
  }): Step<{ readonly color: string; readonly icon: string }>;
  encryptionPassword(opts: { readonly intent: 'create' | 'open' }): Step<string>;
};