import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { ProviderTheme } from '../tenants/provider';
import type { Step, WizardController } from './types';
import { WizardCancelled } from './types';
import { ProviderThemeProvider } from './provider-theme-provider';

export type WizardClassNames = {
  readonly overlay?: string;
  readonly content?: string;
  readonly header?: string;
  readonly title?: string;
  readonly counter?: string;
  readonly back?: string;
  readonly cancel?: string;
  readonly body?: string;
};

export type WizardLabels = {
  readonly back?: string;
  readonly cancel?: string;
  readonly counter?: (current: number, total: number) => string;
};

const DEFAULT_LABELS: Required<WizardLabels> = {
  back: 'Back',
  cancel: 'Cancel',
  counter: (c, t) => `${c} of ${t}`,
};

type ActiveStep = {
  readonly step: Step<unknown>;
  readonly resolve: (value: unknown) => void;
  readonly reject: (err: Error) => void;
};

export type UseWizardOptions = {
  readonly providerTheme: ProviderTheme;
  readonly classNames?: WizardClassNames;
  readonly labels?: WizardLabels;
  readonly title?: string;
  readonly onClose?: () => void;
};

export type WizardHostHandle = {
  /** Pass to provider ops. */
  readonly controller: WizardController;
  /** Render this where the wizard modal should mount (typically root of TenantsPage). */
  readonly element: ReactNode;
  /** Open / close the modal — host calls `open()` before invoking an op. */
  open(): void;
  close(): void;
  readonly isOpen: boolean;
};

/**
 * Hook that produces a `WizardController` plus the React element that hosts
 * its modal chrome. Mount the element once (e.g. inside `<TenantsPage>`),
 * then call `controller.runStep(step)` from your op.
 *
 * Behavior:
 * - 1 step total → counter and back button suppressed.
 * - > 1 step → full chrome.
 * - `step.theme === 'provider'` → body wrapped in `<ProviderThemeProvider>`.
 */
export function useWizardHost(opts: UseWizardOptions): WizardHostHandle {
  const labels = useMemo(() => ({ ...DEFAULT_LABELS, ...opts.labels }), [opts.labels]);
  const cn = opts.classNames ?? {};

  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState<ActiveStep | null>(null);
  const [history, setHistory] = useState<ReadonlyArray<Step<unknown>>>([]);
  const [estimatedTotal, setEstimatedTotal] = useState(0);

  const activeRef = useRef<ActiveStep | null>(null);
  activeRef.current = active;

  const cancelActive = useCallback(() => {
    const a = activeRef.current;
    if (a) {
      activeRef.current = null;
      setActive(null);
      a.reject(new WizardCancelled());
    }
    setHistory([]);
    setEstimatedTotal(0);
    setIsOpen(false);
    opts.onClose?.();
  }, [opts]);

  const controller = useMemo<WizardController>(
    () => ({
      runStep<T>(step: Step<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
          setActive({
            step: step as Step<unknown>,
            resolve: resolve as (v: unknown) => void,
            reject,
          });
          setHistory((h) => [...h, step as Step<unknown>]);
        });
      },
      setEstimatedTotal(n: number) {
        setEstimatedTotal(n);
      },
    }),
    [],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) cancelActive();
      else setIsOpen(true);
    },
    [cancelActive],
  );

  const onComplete = useCallback((value: unknown) => {
    const a = activeRef.current;
    if (!a) return;
    activeRef.current = null;
    setActive(null);
    a.resolve(value);
  }, []);

  const stepIndex = history.length;
  const total = Math.max(estimatedTotal, stepIndex);
  const showCounter = total > 1;
  const stepBody = active ? active.step.render({ onComplete, onCancel: cancelActive }) : null;
  const isProviderTheme = active?.step.theme === 'provider';

  const element = (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay data-slot="wizard-overlay" className={cn.overlay} />
        <Dialog.Content data-slot="wizard-content" className={cn.content} aria-describedby={undefined} aria-label={opts.title ?? 'Wizard'}>
          <div data-slot="wizard-header" className={cn.header}>
            {opts.title ? (
              <Dialog.Title data-slot="wizard-title" className={cn.title}>{opts.title}</Dialog.Title>
            ) : (
              <Dialog.Title style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
                Wizard
              </Dialog.Title>
            )}
            {showCounter ? (
              <span data-slot="wizard-counter" className={cn.counter}>{labels.counter(stepIndex, total)}</span>
            ) : null}
            <Dialog.Close asChild>
              <button type="button" data-slot="wizard-cancel" className={cn.cancel}>
                {labels.cancel}
              </button>
            </Dialog.Close>
          </div>
          <div data-slot="wizard-body" className={cn.body}>
            {isProviderTheme && stepBody ? (
              <ProviderThemeProvider theme={opts.providerTheme}>{stepBody}</ProviderThemeProvider>
            ) : (
              stepBody
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );

  return {
    controller,
    element,
    open: () => setIsOpen(true),
    close: cancelActive,
    isOpen,
  };
}
