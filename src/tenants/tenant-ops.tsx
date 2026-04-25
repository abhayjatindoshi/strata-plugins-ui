import { useMemo } from 'react';
import { useStrataContext } from '../react/strata-provider';
import { useOpRunner } from './use-op-runner';
import type { CloudProvider, ProviderOp } from './provider';
import type { WizardClassNames, WizardLabels } from '../wizard/use-wizard-host';

export type TenantOpsClassNames = {
  readonly root?: string;
  readonly button?: string;
  readonly wizard?: WizardClassNames;
};

export type TenantOpsProps = {
  readonly classNames?: TenantOpsClassNames;
  readonly wizardLabels?: WizardLabels;
  readonly onError?: (error: Error, op: ProviderOp, provider: CloudProvider) => void;
};

/**
 * Renders one button per `page-action` op across all providers.
 * Owns the wizard element for multi-step flows.
 */
export function TenantOps(props: TenantOpsProps) {
  const cn = props.classNames ?? {};
  const { config } = useStrataContext();
  const providers = config.providers?.all ?? [];
  const ready = !!config.auth && !!config.commonSteps;

  const runner = useOpRunner({
    authService: config.auth!,
    commonSteps: config.commonSteps!,
    encryption: config.encryption ?? undefined,
    wizardClassNames: cn.wizard,
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
      <div className={cn.root}>
        {pageActions.map(({ provider, op }) => (
          <button
            key={`${provider.name}:${op.name}`}
            type="button"
            className={cn.button}
            onClick={() => { void runner.runOp(provider, op); }}
          >
            {op.icon}
            {op.label}
          </button>
        ))}
      </div>
      {runner.wizardElement}
    </>
  );
}
