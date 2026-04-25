import type { Step } from '../wizard/types';

export type EncryptionPasswordStepClassNames = {
  readonly root?: string;
  readonly label?: string;
  readonly input?: string;
  readonly hint?: string;
  readonly footer?: string;
  readonly submit?: string;
  readonly cancel?: string;
};

export type EncryptionPasswordStepLabels = {
  readonly createTitle?: string;
  readonly openTitle?: string;
  readonly createHint?: string;
  readonly openHint?: string;
  readonly placeholder?: string;
  readonly submit?: string;
  readonly cancel?: string;
};

export type EncryptionPasswordStepOptions = {
  /**
   * `'create'` is for first-time setup (no existing password to verify against).
   * `'open'` is for unlocking an existing tenant; the host should validate the
   * returned password against the encryption marker.
   */
  readonly intent: 'create' | 'open';
  readonly classNames?: EncryptionPasswordStepClassNames;
  readonly labels?: EncryptionPasswordStepLabels;
};

const DEFAULT_LABELS: Required<EncryptionPasswordStepLabels> = {
  createTitle: 'Set a password',
  openTitle: 'Enter password',
  createHint:
    'This password encrypts your data on this device and in the cloud. There is no recovery if you forget it.',
  openHint: 'Enter the password used when this workspace was created.',
  placeholder: 'Password',
  submit: 'Continue',
  cancel: 'Cancel',
};

/**
 * Bundled common step that prompts for an encryption password.
 * Returns the entered password as a `string`. App-themed.
 */
export function encryptionPasswordStep(
  opts: EncryptionPasswordStepOptions,
): Step<string> {
  const labels = { ...DEFAULT_LABELS, ...opts.labels };
  const cn = opts.classNames ?? {};
  const title = opts.intent === 'create' ? labels.createTitle : labels.openTitle;
  const hint = opts.intent === 'create' ? labels.createHint : labels.openHint;
  return {
    id: `encryption-password-${opts.intent}`,
    theme: 'app',
    render: ({ onComplete, onCancel }) => (
      <form
        className={cn.root}
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const pw = String(data.get('password') ?? '');
          if (pw) onComplete(pw);
        }}
      >
        <label className={cn.label}>
          <span>{title}</span>
          <input
            name="password"
            type="password"
            className={cn.input}
            placeholder={labels.placeholder}
            autoFocus
            autoComplete={opts.intent === 'create' ? 'new-password' : 'current-password'}
            required
          />
        </label>
        <p className={cn.hint}>{hint}</p>
        <div className={cn.footer}>
          <button type="button" className={cn.cancel} onClick={onCancel}>
            {labels.cancel}
          </button>
          <button type="submit" className={cn.submit}>
            {labels.submit}
          </button>
        </div>
      </form>
    ),
  };
}
