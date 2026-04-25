import { useEffect, useMemo, useState } from 'react';
import type { EncryptionService, Strata, Tenant } from 'strata-data-sync';
import type { ClientAuthService } from 'strata-adapters';
import { useStrataContext } from '../react/strata-provider';
import { useOpRunner } from './use-op-runner';
import type {
  CloudProvider,
  CommonStepFactories,
  ProviderOp,
} from './provider';
import type { WizardClassNames, WizardLabels } from '../wizard/use-wizard-host';

export type TenantsPageClassNames = {
  readonly root?: string;
  readonly header?: string;
  readonly title?: string;
  readonly pageActions?: string;
  readonly pageActionButton?: string;
  readonly list?: string;
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

export type TenantsPageLabels = {
  readonly title?: string;
  readonly empty?: string;
  readonly menuButton?: string;
  readonly wizard?: WizardLabels;
};

export type TenantsPageProps = {
  /** Optional — falls back to `<StrataProvider>` context. */
  readonly strata?: Strata;
  readonly authService?: ClientAuthService;
  readonly providers?: readonly CloudProvider[];
  readonly commonSteps?: CommonStepFactories;
  readonly encryption?: EncryptionService;
  readonly classNames?: TenantsPageClassNames;
  readonly labels?: TenantsPageLabels;
  readonly onTenantOpened?: (tenant: Tenant) => void;
  readonly onError?: (error: Error, op: ProviderOp, provider: CloudProvider) => void;
};

const DEFAULT_LABELS: Required<Omit<TenantsPageLabels, 'wizard'>> = {
  title: 'Workspaces',
  empty: 'No workspaces yet.',
  menuButton: 'More',
};

/**
 * Skeleton tenants page. Accepts every dependency as a prop and falls back
 * to `<StrataProvider>` context when omitted. Surfaces every `ProviderOp`
 * at its configured `placement` and dispatches via `useOpRunner`.
 *
 * Per PLUGGABLES_V2 §19.
 */
export function TenantsPage(props: TenantsPageProps) {
  const cn = props.classNames ?? {};
  const labels = { ...DEFAULT_LABELS, ...props.labels };

  const ctx = useStrataContext();
  const strata = props.strata ?? ctx.strata;
  const authService = props.authService ?? ctx.config.auth;
  const providers = props.providers ?? ctx.config.cloud.providers;
  const commonSteps = props.commonSteps ?? ctx.config.commonSteps;
  const encryption = props.encryption ?? ctx.config.encryption ?? undefined;

  if (!strata) throw new Error('TenantsPage: no Strata instance — pass `strata` prop or render under <StrataProvider>.');
  if (!authService) throw new Error('TenantsPage: no ClientAuthService — pass `authService` prop or set on <StrataProvider>.');
  if (!commonSteps) throw new Error('TenantsPage: no commonSteps — pass `commonSteps` prop or set on <StrataProvider>.');

  const runner = useOpRunner({
    strata,
    authService,
    commonSteps,
    encryption,
    wizardClassNames: cn.wizard,
    wizardLabels: props.labels?.wizard,
    onError: props.onError,
  });

  const [tenants, setTenants] = useState<readonly Tenant[]>([]);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      strata.tenants
        .list()
        .then((list) => {
          if (!cancelled) setTenants(list);
        })
        .catch(() => { /* leave as-is */ });
    };
    refresh();
    const sub = strata.tenants.activeTenant$.subscribe(() => refresh());
    return () => {
      cancelled = true;
      sub.unsubscribe();
    };
  }, [strata]);

  const pageActions = useMemo(
    () =>
      providers.flatMap((p) =>
        p.ops.filter((o) => o.placement === 'page-action').map((o) => ({ provider: p, op: o })),
      ),
    [providers],
  );

  return (
    <div className={cn.root}>
      <header className={cn.header}>
        <h1 className={cn.title}>{labels.title}</h1>
        <div className={cn.pageActions}>
          {pageActions.map(({ provider, op }) => (
            <button
              key={`${provider.name}:${op.name}`}
              type="button"
              className={cn.pageActionButton}
              onClick={() => { void runner.runOp(provider, op); }}
            >
              {op.icon}
              {op.label}
            </button>
          ))}
        </div>
      </header>

      <div className={cn.list}>
        {tenants.length === 0 ? (
          <p className={cn.empty}>{labels.empty}</p>
        ) : (
          tenants.map((t) => (
            <TenantRow
              key={t.id}
              tenant={t}
              providers={providers}
              onRunOp={(provider, op) =>
                runner.runOp(provider, op, t).then(() => {
                  if (op.placement === 'tenant-action' && op.name === 'open') {
                    props.onTenantOpened?.(t);
                  }
                })
              }
              classNames={cn}
              labels={labels}
            />
          ))
        )}
      </div>

      {runner.wizardElement}
    </div>
  );
}

function TenantRow({
  tenant,
  providers,
  onRunOp,
  classNames,
  labels,
}: {
  readonly tenant: Tenant;
  readonly providers: readonly CloudProvider[];
  readonly onRunOp: (provider: CloudProvider, op: ProviderOp) => Promise<void>;
  readonly classNames: TenantsPageClassNames;
  readonly labels: { readonly menuButton: string };
}) {
  const provider = providers.find((p) => tenant.meta.providerName === p.name);
  const rowActions = provider?.ops.filter((o) => o.placement === 'tenant-action') ?? [];
  const menuOps = provider?.ops.filter((o) => o.placement === 'tenant-menu') ?? [];

  return (
    <div className={classNames.row}>
      <span className={classNames.rowName}>{tenant.name}</span>
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