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
  readonly menu?: string;
  readonly menuTrigger?: string;
  readonly actions?: string;
  readonly action?: string;
  readonly wizard?: WizardClassNames;
};

export type TenantListLabels = {
  readonly empty?: string;
  readonly delete?: ReactNode;
  readonly menuTrigger?: ReactNode;
  readonly actionLabels?: Readonly<Record<string, ReactNode>>;
  readonly wizard?: WizardLabels;
};

export type TenantListProps = {
  readonly classNames?: TenantListClassNames;
  readonly labels?: TenantListLabels;
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
  const cn = props.classNames ?? {};
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
      <ul className={cn.root}>
        {tenants.length === 0 ? (
          <p className={cn.empty}>{labels.empty}</p>
        ) : (
          tenants.map((t) => (
            <TenantRow
              key={t.id}
              tenant={t}
              providers={providers}
              onSelect={() => props.onSelect?.(t)}
              onDelete={props.onDelete ? () => props.onDelete!(t) : undefined}
              onRunOp={(provider, op) =>
                runner.runOp(provider, op, t)
              }
              classNames={cn}
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
  classNames,
  labels,
}: {
  readonly tenant: Tenant;
  readonly providers: readonly CloudProvider[];
  readonly onSelect: () => void;
  readonly onDelete?: () => void;
  readonly onRunOp: (provider: CloudProvider, op: ProviderOp) => Promise<void>;
  readonly classNames: TenantListClassNames;
  readonly labels: { readonly delete: ReactNode; readonly menuTrigger: ReactNode; readonly actionLabels?: Readonly<Record<string, ReactNode>> };
}) {
  const provider = providers.find((p) => tenant.meta.providerName === p.name);
  const allOps = provider?.ops.filter(
    (o) => o.placement === 'tenant-action' || o.placement === 'tenant-menu',
  ) ?? [];

  return (
    <li className={classNames.row}>
      <button type="button" className={classNames.rowName} onClick={onSelect}>
        {tenant.name}
      </button>
      <details className={classNames.menu}>
        <summary className={classNames.menuTrigger}>{labels.menuTrigger}</summary>
        <ul className={classNames.actions}>
          {allOps.map((op) => (
            <li key={op.name}>
              <button
                type="button"
                className={classNames.action}
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
              className={classNames.action}
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
