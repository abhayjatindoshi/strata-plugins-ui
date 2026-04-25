import type { ReactNode } from 'react';

/**
 * Thrown by `WizardController.runStep` when the user cancels the wizard.
 * Provider ops should let this propagate — `<TenantsPage>` catches it and
 * tears down the modal cleanly.
 */
export class WizardCancelled extends Error {
  constructor(message = 'Wizard cancelled') {
    super(message);
    this.name = 'WizardCancelled';
  }
}

/**
 * One screen inside a wizard. The controller renders `render()` and resolves
 * `runStep` when the step calls `onComplete(value)`. Calling `onCancel()`
 * causes `runStep` to reject with `WizardCancelled`.
 */
export interface Step<T> {
  readonly id: string;
  /**
   * `'provider'` wraps the body in `<ProviderThemeProvider>` so brand colors
   * apply. `'app'` renders inside the host's app theme (no extra wrapper).
   */
  readonly theme: 'provider' | 'app';
  render(props: {
    onComplete: (value: T) => void;
    onCancel: () => void;
  }): ReactNode;
}

/**
 * Host-supplied UI runner that mounts the wizard chrome (modal frame, header,
 * counter, back / next) and renders steps one at a time. Provider ops drive
 * it via `runStep`.
 *
 * Behavior:
 * - 1 step total → counter and back button suppressed.
 * - > 1 step → full chrome (`2 of 4`, back, cancel).
 * - `step.theme === 'provider'` → body wrapped in provider theme.
 * - `step.theme === 'app'` → body wrapped in app theme.
 */
export interface WizardController {
  /** Render `step` in the current wizard, return its result, or throw `WizardCancelled`. */
  runStep<T>(step: Step<T>): Promise<T>;
  /** Optional total — lets the controller show counters intelligently. */
  setEstimatedTotal(n: number): void;
}
