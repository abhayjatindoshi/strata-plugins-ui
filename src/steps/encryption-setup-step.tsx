import { useState } from 'react';
import type { Step } from '../wizard/types';
import type { ProviderTheme } from '../tenants/provider';

export type EncryptionSetupStepLabels = {
  readonly title?: string;
  readonly description?: string;
  readonly enableLabel?: string;
  readonly enableHint?: string;
  readonly passwordLabel?: string;
  readonly confirmLabel?: string;
  readonly passwordPlaceholder?: string;
  readonly confirmPlaceholder?: string;
  readonly mismatchError?: string;
  readonly warning?: string;
  readonly submit?: string;
  readonly cancel?: string;
};

export type EncryptionSetupStepOptions = {
  readonly mode?: 'light' | 'dark';
  readonly theme?: ProviderTheme;
  readonly labels?: EncryptionSetupStepLabels;
};

const DEFAULT_LABELS: Required<EncryptionSetupStepLabels> = {
  title: 'Encryption',
  description: 'Protect your workspace data with a password.',
  enableLabel: 'Enable encryption',
  enableHint: 'Your data will be encrypted locally and in the cloud.',
  passwordLabel: 'Password',
  confirmLabel: 'Confirm password',
  passwordPlaceholder: 'Enter password',
  confirmPlaceholder: 'Re-enter password',
  mismatchError: 'Passwords do not match.',
  warning: 'There is no recovery if you forget this password.',
  submit: 'Continue',
  cancel: 'Cancel',
};

/**
 * Common step for encryption setup during workspace creation.
 * Returns the password string if encryption is enabled, or `null`
 * if the user leaves it disabled.
 */
export function encryptionSetupStep(opts: EncryptionSetupStepOptions = {}): Step<string | null> {
  const labels = { ...DEFAULT_LABELS, ...opts.labels };
  return {
    id: 'encryption-setup',
    theme: 'app',
    render: ({ onComplete, onCancel }) => (
      <EncryptionSetupBody
        mode={opts.mode}
        theme={opts.theme}
        labels={labels}
        onComplete={onComplete}
        onCancel={onCancel}
      />
    ),
  };
}

function EncryptionSetupBody({
  mode,
  theme,
  labels,
  onComplete,
  onCancel,
}: {
  readonly mode?: 'light' | 'dark';
  readonly theme?: ProviderTheme;
  readonly labels: Required<EncryptionSetupStepLabels>;
  readonly onComplete: (password: string | null) => void;
  readonly onCancel: () => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showMismatch, setShowMismatch] = useState(false);

  const canSubmit = !enabled || (password.length > 0 && password === confirm);

  const handleSubmit = () => {
    if (!enabled) {
      onComplete(null);
      return;
    }
    if (password !== confirm) {
      setShowMismatch(true);
      return;
    }
    onComplete(password);
  };

  return (
    <form
      data-slot="step"
      data-step="encryption-setup"
      data-theme={mode}
      className={theme?.className}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <div data-slot="step-header">
        <div data-slot="step-header-text">
          <h2 data-slot="step-title">{labels.title}</h2>
          <p data-slot="step-description">{labels.description}</p>
        </div>
      </div>

      <div data-slot="step-body">
        <div data-slot="step-field">
          <label data-slot="step-checkbox-label">
            <input
              data-slot="step-checkbox"
              type="checkbox"
              checked={enabled}
              onChange={(e) => {
                setEnabled(e.target.checked);
                if (!e.target.checked) {
                  setPassword('');
                  setConfirm('');
                  setShowMismatch(false);
                }
              }}
            />
            <span>{labels.enableLabel}</span>
          </label>
          <p data-slot="step-hint">{labels.enableHint}</p>
        </div>

        {enabled && (
          <>
            <div data-slot="step-field">
              <label data-slot="step-label">{labels.passwordLabel}</label>
              <input
                data-slot="step-input"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setShowMismatch(false);
                }}
                placeholder={labels.passwordPlaceholder}
                autoComplete="new-password"
                autoFocus
                required
              />
            </div>

            <div data-slot="step-field">
              <label data-slot="step-label">{labels.confirmLabel}</label>
              <input
                data-slot="step-input"
                type="password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setShowMismatch(false);
                }}
                placeholder={labels.confirmPlaceholder}
                autoComplete="new-password"
                required
              />
            </div>

            {showMismatch && (
              <p data-slot="step-error">{labels.mismatchError}</p>
            )}

            <p data-slot="step-warning">{labels.warning}</p>
          </>
        )}
      </div>

      <div data-slot="step-footer">
        <button type="button" data-slot="step-cancel" onClick={onCancel}>
          {labels.cancel}
        </button>
        <button type="submit" data-slot="step-submit" disabled={!canSubmit}>
          {labels.submit}
        </button>
      </div>
    </form>
  );
}
