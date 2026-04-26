import { useState } from 'react';
import type { Step } from '../wizard/types';
import type { ProviderTheme } from '../tenants/provider';
import { useStrataContext } from '../react/strata-provider';

export type EncryptionSetupStepOptions = {
  readonly mode?: 'light' | 'dark';
  readonly theme?: ProviderTheme;
};

/**
 * Common step for encryption setup during tenant creation.
 * Returns the password string if encryption is enabled, or `null`
 * if the user leaves it disabled.
 */
export function encryptionSetupStep(opts: EncryptionSetupStepOptions = {}): Step<string | null> {
  return {
    id: 'encryption-setup',
    theme: 'app',
    render: ({ onComplete, onCancel }) => (
      <EncryptionSetupBody
        mode={opts.mode}
        theme={opts.theme}
        onComplete={onComplete}
        onCancel={onCancel}
      />
    ),
  };
}

function EncryptionSetupBody({
  mode,
  theme,
  onComplete,
  onCancel,
}: {
  readonly mode?: 'light' | 'dark';
  readonly theme?: ProviderTheme;
  readonly onComplete: (password: string | null) => void;
  readonly onCancel: () => void;
}) {
  const { config } = useStrataContext();
  const tl = config.tenantLabels;
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
          <h2 data-slot="step-title">Encryption</h2>
          <p data-slot="step-description">Protect your {tl.lower} data with a password.</p>
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
            <span>Enable encryption</span>
          </label>
          <p data-slot="step-hint">Your data will be encrypted locally and in the cloud.</p>
        </div>

        {enabled && (
          <>
            <div data-slot="step-field">
              <label data-slot="step-label">Password</label>
              <input
                data-slot="step-input"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setShowMismatch(false);
                }}
                placeholder="Enter password"
                autoComplete="new-password"
                autoFocus
                required
              />
            </div>

            <div data-slot="step-field">
              <label data-slot="step-label">Confirm password</label>
              <input
                data-slot="step-input"
                type="password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setShowMismatch(false);
                }}
                placeholder="Re-enter password"
                autoComplete="new-password"
                required
              />
            </div>

            {showMismatch && (
              <p data-slot="step-error">Passwords do not match.</p>
            )}

            <p data-slot="step-warning">There is no recovery if you forget this password.</p>
          </>
        )}
      </div>

      <div data-slot="step-footer">
        <button type="button" data-slot="step-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" data-slot="step-submit" disabled={!canSubmit}>
          Continue
        </button>
      </div>
    </form>
  );
}
