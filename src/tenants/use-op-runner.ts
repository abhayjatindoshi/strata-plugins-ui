import { useCallback, useMemo, useRef } from 'react';
import type { Tenant } from '@fyre-db/core';
import { FyreDbError } from '@fyre-db/plugins';
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
import { useFyreDbAppContext } from '../react/fyredb-app-provider';
import { log } from '@/log';

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
 * FyreDbProvider context. Tenant operations route through TenantProvider.
 */
export function useOpRunner(opts: UseOpRunnerOptions = {}): UseOpRunnerResult {
  const themeRef = useRef({ color: '#1A73E8', accent: undefined as string | undefined });
  const { app, commonSteps } = useFyreDbAppContext();
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
    probe: (ref) => app.probeTenant(ref),
    create: (o) => app.createTenant(o),
    join: (o) => app.joinTenant(o),
    open: (id, o) => app.openTenant(id, o),
    remove: (id, o) => app.removeTenant(id, o),
  }), [app]);
  const tenantsRef = useRef(tenants);
  // eslint-disable-next-line react-hooks/refs
  tenantsRef.current = tenants;

  const runOp = useCallback(
    async (provider: CloudProvider, op: ProviderOp, tenant?: Tenant) => {
      const auth = app.auth;
      if (!auth) return;
      themeRef.current = {
        color: provider.theme.color,
        accent: provider.theme.accent,
      };
      wizardRef.current.open();
      const ctx: OpContext = {
        auth,
        tenants: tenantsRef.current,
        encryption: app.encryption,
        wizard: wizardRef.current.controller,
        commonSteps,
        providerTheme: provider.theme,
        mode: optsRef.current.mode,
        tenant,
      };
      try {
        log.ops('running %s:%s', provider.name, op.name);
        await op.run(ctx);
      } catch (err) {
        if (err instanceof WizardCancelled) {
          log.ops('cancelled %s:%s', provider.name, op.name);
          return;
        }
        const e = err instanceof Error ? err : new FyreDbError(String(err), { kind: 'unknown' });
        log.ops.error('failed %s:%s: %s', provider.name, op.name, e.message);
        optsRef.current.onError?.(e, op, provider);
        throw e;
      } finally {
        wizardRef.current.close();
      }
    },
    [app, commonSteps],
  );

  return {
    wizardElement: wizard.element,
    runOp,
    isRunning: wizard.isOpen,
  };
}