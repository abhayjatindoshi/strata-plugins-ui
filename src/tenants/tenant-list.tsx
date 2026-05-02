import { type ReactNode } from 'react';
import type { Tenant } from '@strata/core';
import { useStrataContext } from '../react/strata-provider';
import { useTenant } from '../react/tenant-provider';
import { useOpRunner } from './use-op-runner';
import type { CloudProvider, ProviderOp } from './provider';
import type { WizardClassNames, WizardLabels } from '../wizard/use-wizard-host';
import './tenants.css';

export type TenantListLabels = {
  readonly empty?: string;
  readonly delete?: ReactNode;
  readonly menuTrigger?: ReactNode;
  readonly actionLabels?: Readonly<Record<string, ReactNode>>;
  readonly wizard?: WizardLabels;
};

export type TenantListProps = {
  readonly mode?: 'light' | 'dark';
  readonly labels?: TenantListLabels;
  readonly wizardClassNames?: WizardClassNames;
  readonly onSelect?: (tenant: Tenant) => void;
  readonly onDelete?: (tenant: Tenant) => void;
  readonly onError?: (error: Error, op: ProviderOp, provider: CloudProvider) => void;
};

const DEFAULT_LIST_LABELS: Required<Omit<TenantListLabels, 'wizard' | 'actionLabels'>> = {
  empty: 'No workspaces yet.',
  delete: 'Delete',
  menuTrigger: '⋮',
};

/**
 * Renders the tenant list with per-tenant action buttons and overflow menu.
 * Owns the wizard element for tenant-scoped multi-step flows.
 */
export function TenantList(props: TenantListProps) {
  const { config } = useStrataContext();
  const tl = config.tenantLabels;
  const labels = {
    ...DEFAULT_LIST_LABELS,
    empty: `No ${tl.lower}s yet.`,
    ...props.labels,
  };
  const { all: tenants } = useTenant();
  const providers = config.providers?.all ?? [];
  const ready = !!config.auth && !!config.commonSteps;

  const runner = useOpRunner({
    wizardClassNames: props.wizardClassNames,
    wizardLabels: props.labels?.wizard,
    onError: props.onError,
  });

  if (!ready) return null;
  return (
    <>
      <ul data-slot="tenant-list" data-theme={props.mode}>
        {tenants.length === 0 ? (
          <p data-slot="tenant-empty">{labels.empty}</p>
        ) : (
          tenants.map((t) => (
            <TenantRow
              key={t.id}
              tenant={t}
              providers={providers}
              onSelect={() => props.onSelect?.(t)}
              onDelete={props.onDelete ? () => { props.onDelete?.(t); } : undefined}
              onRunOp={(provider, op) =>
                runner.runOp(provider, op, t)
              }
              labels={labels}
            />
          ))
        )}
      </ul>
      {runner.wizardElement}
    </>
  );
}

function TenantRow({
  tenant,
  providers,
  onSelect,
  onDelete,
  onRunOp,
  labels,
}: {
  readonly tenant: Tenant;
  readonly providers: readonly CloudProvider[];
  readonly onSelect: () => void;
  readonly onDelete?: () => void;
  readonly onRunOp: (provider: CloudProvider, op: ProviderOp) => Promise<void>;
  readonly labels: { readonly delete: ReactNode; readonly menuTrigger: ReactNode; readonly actionLabels?: Readonly<Record<string, ReactNode>> };
}) {
  const provider = providers.find((p) => tenant.meta.providerName === p.name);
  const allOps = provider?.ops.filter(
    (o) => o.placement === 'tenant-action' || o.placement === 'tenant-menu',
  ) ?? [];

  return (
    <li data-slot="tenant-row">
      <button type="button" data-slot="tenant-row-name" onClick={onSelect}>
        {tenant.name}
      </button>
      <details data-slot="tenant-menu">
        <summary data-slot="tenant-menu-trigger">{labels.menuTrigger}</summary>
        <ul data-slot="tenant-actions">
          {allOps.map((op) => (
            <li key={op.name}>
              <button
                type="button"
                data-slot="tenant-action"
                onClick={() => { if (provider) void onRunOp(provider, op); }}
              >
                {labels.actionLabels?.[op.name] ?? <>{op.icon}{op.label}</>}
              </button>
            </li>
          ))}
          {onDelete && (
            <li>
              <button
                type="button"
                data-slot="tenant-action"
                onClick={onDelete}
              >
                {labels.delete}
              </button>
            </li>
          )}
        </ul>
      </details>
    </li>
  );
}
