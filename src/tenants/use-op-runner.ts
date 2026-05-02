import { useCallback, useMemo, useRef } from 'react';
import type { Tenant } from '@strata/core';
import {
  useWizardHost,
  type WizardClassNames,
  type WizardLabels,
} from '../wizard/use-wizard-host';
import { WizardCancelled } from '../wizard/types';
import type {
  CloudProvider,
  OpContext,
  ProviderOp,
  TenantOpsApi,
} from './provider';
import { useTenant } from '../react/tenant-provider';
import { useStrataContext } from '../react/strata-provider';

export type UseOpRunnerOptions = {
  readonly mode?: 'light' | 'dark';
  readonly wizardClassNames?: WizardClassNames;
  readonly wizardLabels?: WizardLabels;
  readonly onError?: (error: Error, op: ProviderOp, provider: CloudProvider) => void;
};

export type UseOpRunnerResult = {
  /** Mount once near the top of the page — provides the wizard modal. */
  readonly wizardElement: import('react').ReactNode;
  /** Invoke an op against a provider; resolves when the op completes or cancels. */
  runOp(provider: CloudProvider, op: ProviderOp, tenant?: Tenant): Promise<void>;
  readonly isRunning: boolean;
};

/**
 * Builds an `OpContext` per invocation, mounts a `WizardController`, and
 * dispatches `op.run(ctx)`. Reads auth, encryption, and commonSteps from
 * StrataProvider context. Tenant operations route through TenantProvider.
 */
export function useOpRunner(opts: UseOpRunnerOptions = {}): UseOpRunnerResult {
  const themeRef = useRef({ color: '#1A73E8', accent: undefined as string | undefined });
  const { config } = useStrataContext();
  const { ops: tenantOps, all: tenantList, requestOpen } = useTenant();
  const optsRef = useRef(opts);
  // eslint-disable-next-line react-hooks/refs
  optsRef.current = opts;

  const wizard = useWizardHost({
    // eslint-disable-next-line react-hooks/refs
    providerTheme: themeRef.current,
    classNames: opts.wizardClassNames,
    labels: opts.wizardLabels,
  });
  const wizardRef = useRef(wizard);
  // eslint-disable-next-line react-hooks/refs
  wizardRef.current = wizard;

  const tenants: TenantOpsApi = useMemo(() => ({
    list: () => Promise.resolve(tenantList),
    create: (o) => tenantOps.create(o),
    open: (id, o) => { requestOpen(id, o); return Promise.resolve(); },
    remove: (id, o) => tenantOps.remove(id, o),
  }), [tenantOps, tenantList, requestOpen]);
  const tenantsRef = useRef(tenants);
  // eslint-disable-next-line react-hooks/refs
  tenantsRef.current = tenants;

  const runOp = useCallback(
    async (provider: CloudProvider, op: ProviderOp, tenant?: Tenant) => {
      if (!config.auth || !config.commonSteps) return;
      themeRef.current = {
        color: provider.theme.color,
        accent: provider.theme.accent,
      };
      wizardRef.current.open();
      const ctx: OpContext = {
        auth: config.auth,
        tenants: tenantsRef.current,
        encryption: config.encryption,
        wizard: wizardRef.current.controller,
        commonSteps: config.commonSteps,
        providerTheme: provider.theme,
        mode: optsRef.current.mode,
        tenant,
      };
      try {
        await op.run(ctx);
      } catch (err) {
        if (err instanceof WizardCancelled) return;
        const e = err instanceof Error ? err : new Error(String(err));
        optsRef.current.onError?.(e, op, provider);
        throw e;
      } finally {
        wizardRef.current.close();
      }
    },
    [config],
  );

  return {
    wizardElement: wizard.element,
    runOp,
    isRunning: wizard.isOpen,
  };
}