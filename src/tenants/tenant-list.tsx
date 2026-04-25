import { type ReactNode } from 'react';
import type { Tenant } from 'strata-data-sync';
import { useStrataContext } from '../react/strata-provider';
import { useTenant } from '../react/tenant-provider';
import { useOpRunner } from './use-op-runner';
import type { CloudProvider, ProviderOp } from './provider';
import type { WizardClassNames, WizardLabels } from '../wizard/use-wizard-host';

export type TenantListClassNames = {
  readonly root?: string;
  readonly empty?: string;
  readonly row?: string;
  readonly rowName?: string;
  readonly rowActions?: string;
  readonly rowActionButton?: string;
  readonly menu?: string;
  readonly menuButton?: string;
  readonly menuItem?: string;
  readonly wizard?: WizardClassNames;
};

export type TenantListLabels = {
  readonly empty?: string;
  readonly menuButton?: string;
  readonly wizard?: WizardLabels;
};

export type TenantListProps = {
  readonly classNames?: TenantListClassNames;
  readonly labels?: TenantListLabels;
  readonly onSelect?: (tenant: Tenant) => void;
  readonly onError?: (error: Error, op: ProviderOp, provider: CloudProvider) => void;
};

const DEFAULT_LIST_LABELS: Required<Omit<TenantListLabels, 'wizard'>> = {
  empty: 'No workspaces yet.',
  menuButton: 'More',
};

/**
 * Renders the tenant list with per-tenant action buttons and overflow menu.
 * Owns the wizard element for tenant-scoped multi-step flows.
 */
export function TenantList(props: TenantListProps) {
  const cn = props.classNames ?? {};
  const labels = { ...DEFAULT_LIST_LABELS, ...props.labels };
  const { config } = useStrataContext();
  const { all: tenants } = useTenant();
  const providers = config.providers?.all ?? [];
  const ready = !!config.auth && !!config.commonSteps;

  const runner = useOpRunner({
    authService: config.auth!,
    commonSteps: config.commonSteps!,
    encryption: config.encryption ?? undefined,
    wizardClassNames: cn.wizard,
    wizardLabels: props.labels?.wizard,
    onError: props.onError,
  });

  if (!ready) return null;
  return (
    <>
      <div className={cn.root}>
        {tenants.length === 0 ? (
          <p className={cn.empty}>{labels.empty}</p>
        ) : (
          tenants.map((t) => (
            <TenantRow
              key={t.id}
              tenant={t}
              providers={providers}
              onSelect={() => props.onSelect?.(t)}
              onRunOp={(provider, op) =>
                runner.runOp(provider, op, t)
              }
              classNames={cn}
              labels={labels}
            />
          ))
        )}
      </div>
      {runner.wizardElement}
    </>
  );
}

function TenantRow({
  tenant,
  providers,
  onSelect,
  onRunOp,
  classNames,
  labels,
}: {
  readonly tenant: Tenant;
  readonly providers: readonly CloudProvider[];
  readonly onSelect: () => void;
  readonly onRunOp: (provider: CloudProvider, op: ProviderOp) => Promise<void>;
  readonly classNames: TenantListClassNames;
  readonly labels: { readonly menuButton: string };
}) {
  const provider = providers.find((p) => tenant.meta.providerName === p.name);
  const rowActions = provider?.ops.filter((o) => o.placement === 'tenant-action') ?? [];
  const menuOps = provider?.ops.filter((o) => o.placement === 'tenant-menu') ?? [];

  return (
    <div className={classNames.row}>
      <button type="button" className={classNames.rowName} onClick={onSelect}>
        {tenant.name}
      </button>
      <div className={classNames.rowActions}>
        {rowActions.map((op) => (
          <button
            key={op.name}
            type="button"
            className={classNames.rowActionButton}
            onClick={() => { if (provider) void onRunOp(provider, op); }}
          >
            {op.icon}
            {op.label}
          </button>
        ))}
        {menuOps.length > 0 && provider ? (
          <details className={classNames.menu}>
            <summary className={classNames.menuButton}>{labels.menuButton}</summary>
            {menuOps.map((op) => (
              <button
                key={op.name}
                type="button"
                className={classNames.menuItem}
                onClick={() => { void onRunOp(provider, op); }}
              >
                {op.icon}
                {op.label}
              </button>
            ))}
          </details>
        ) : null}
      </div>
    </div>
  );
}
