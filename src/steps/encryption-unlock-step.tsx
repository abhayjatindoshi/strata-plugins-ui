import { useState } from 'react';
import type { Step } from '../wizard/types';
import type { ProviderTheme } from '../tenants/provider';
import { useStrataContext } from '../react/strata-provider';

export type EncryptionUnlockStepOptions = {
  readonly mode?: 'light' | 'dark';
  readonly theme?: ProviderTheme;
};

/**
 * Common step that prompts for an encryption password to unlock
 * an existing encrypted tenant. Returns the password string.
 */
export function encryptionUnlockStep(opts: EncryptionUnlockStepOptions = {}): Step<string> {
  return {
    id: 'encryption-unlock',
    theme: 'app',
    render: ({ onComplete, onCancel }) => (
      <EncryptionUnlockBody
        mode={opts.mode}
        theme={opts.theme}
        onComplete={onComplete}
        onCancel={onCancel}
      />
    ),
  };
}

function EncryptionUnlockBody({
  mode,
  theme,
  onComplete,
  onCancel,
}: {
  readonly mode?: 'light' | 'dark';
  readonly theme?: ProviderTheme;
  readonly onComplete: (password: string) => void;
  readonly onCancel: () => void;
}) {
  const { config } = useStrataContext();
  const tl = config.tenantLabels;
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
          <h2 data-slot="step-title">Unlock {tl.sentence}</h2>
          <p data-slot="step-description">Enter the password used when this {tl.lower} was created.</p>
        </div>
      </div>

      <div data-slot="step-body">
        <div data-slot="step-field">
          <label data-slot="step-label">Password</label>
          <input
            data-slot="step-input"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            placeholder="Enter password"
            autoComplete="current-password"
            autoFocus
            required
          />
        </div>

        {error && <p data-slot="step-error">{error}</p>}
      </div>

      <div data-slot="step-footer">
        <button type="button" data-slot="step-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" data-slot="step-submit" disabled={!password}>
          Unlock
        </button>
      </div>
    </form>
  );
}
