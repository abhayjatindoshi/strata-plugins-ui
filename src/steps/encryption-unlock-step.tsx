import { useState } from 'react';
import type { Step } from '../wizard/types';
import type { ProviderTheme } from '../tenants/provider';

export type EncryptionUnlockStepLabels = {
  readonly title?: string;
  readonly description?: string;
  readonly passwordLabel?: string;
  readonly passwordPlaceholder?: string;
  readonly submit?: string;
  readonly cancel?: string;
};

export type EncryptionUnlockStepOptions = {
  readonly mode?: 'light' | 'dark';
  readonly theme?: ProviderTheme;
  readonly labels?: EncryptionUnlockStepLabels;
};

const DEFAULT_LABELS: Required<EncryptionUnlockStepLabels> = {
  title: 'Unlock Workspace',
  description: 'Enter the password used when this workspace was created.',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Enter password',
  submit: 'Unlock',
  cancel: 'Cancel',
};

/**
 * Common step that prompts for an encryption password to unlock
 * an existing encrypted workspace. Returns the password string.
 */
export function encryptionUnlockStep(opts: EncryptionUnlockStepOptions = {}): Step<string> {
  const labels = { ...DEFAULT_LABELS, ...opts.labels };
  return {
    id: 'encryption-unlock',
    theme: 'app',
    render: ({ onComplete, onCancel }) => (
      <EncryptionUnlockBody
        mode={opts.mode}
        theme={opts.theme}
        labels={labels}
        onComplete={onComplete}
        onCancel={onCancel}
      />
    ),
  };
}

function EncryptionUnlockBody({
  mode,
  theme,
  labels,
  onComplete,
  onCancel,
}: {
  readonly mode?: 'light' | 'dark';
  readonly theme?: ProviderTheme;
  readonly labels: Required<EncryptionUnlockStepLabels>;
  readonly onComplete: (password: string) => void;
  readonly onCancel: () => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  return (
    <form
      data-slot="step"
      data-step="encryption-unlock"
      data-theme={mode}
      className={theme?.className}
      onSubmit={(e) => {
        e.preventDefault();
        if (!password) {
          setError('Password is required.');
          return;
        }
        onComplete(password);
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
          <label data-slot="step-label">{labels.passwordLabel}</label>
          <input
            data-slot="step-input"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            placeholder={labels.passwordPlaceholder}
            autoComplete="current-password"
            autoFocus
            required
          />
        </div>

        {error && <p data-slot="step-error">{error}</p>}
      </div>

      <div data-slot="step-footer">
        <button type="button" data-slot="step-cancel" onClick={onCancel}>
          {labels.cancel}
        </button>
        <button type="submit" data-slot="step-submit" disabled={!password}>
          {labels.submit}
        </button>
      </div>
    </form>
  );
}
