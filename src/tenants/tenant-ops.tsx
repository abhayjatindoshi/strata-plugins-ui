import { type ReactNode, useMemo } from 'react';
import { useStrataContext } from '../react/strata-provider';
import { useOpRunner } from './use-op-runner';
import type { CloudProvider, ProviderOp } from './provider';
import type { WizardClassNames, WizardLabels } from '../wizard/use-wizard-host';
import './tenants.css';

export type TenantOpsProps = {
  readonly labels?: Readonly<Record<string, ReactNode>>;
  readonly mode?: 'light' | 'dark';
  readonly wizardClassNames?: WizardClassNames;
  readonly wizardLabels?: WizardLabels;
  readonly onError?: (error: Error, op: ProviderOp, provider: CloudProvider) => void;
};

/**
 * Renders one button per `page-action` op across all providers.
 * Owns the wizard element for multi-step flows.
 */
export function TenantOps(props: TenantOpsProps) {
  const { config } = useStrataContext();
  const providers = config.providers?.all ?? [];
  const ready = !!config.auth && !!config.commonSteps;

  const runner = useOpRunner({
    mode: props.mode,
    wizardClassNames: props.wizardClassNames,
    wizardLabels: props.wizardLabels,
    onError: props.onError,
  });

  const pageActions = useMemo(
    () =>
      providers.flatMap((p) =>
        p.ops.filter((o) => o.placement === 'page-action').map((o) => ({ provider: p, op: o })),
      ),
    [providers],
  );

  if (!ready) return null;

  return (
    <>
      <div data-slot="tenant-ops" data-theme={props.mode}>
        {pageActions.map(({ provider, op }) => (
          <button
            key={`${provider.name}:${op.name}`}
            type="button"
            data-slot="tenant-ops-button"
            onClick={() => { void runner.runOp(provider, op); }}
          >
            {props.labels?.[op.name] ?? <>{op.icon}{op.label}</>}
          </button>
        ))}
      </div>
      {runner.wizardElement}
    </>
  );
}
