import type { Step } from '../wizard/types';
import type { ProviderTheme } from '../tenants/provider';

export type TenantNameStepLabels = {
  readonly title?: string;
  readonly placeholder?: string;
  readonly submit?: string;
  readonly cancel?: string;
};

export type TenantNameStepOptions = {
  readonly initial?: string;
  readonly mode?: 'light' | 'dark';
  readonly theme?: ProviderTheme;
  readonly labels?: TenantNameStepLabels;
};

const DEFAULT_LABELS: Required<TenantNameStepLabels> = {
  title: 'Name this workspace',
  placeholder: 'My workspace',
  submit: 'Continue',
  cancel: 'Cancel',
};

/**
 * Bundled common step that prompts for a tenant display name.
 * Uses `data-slot` attributes for styling. When a `ProviderTheme`
 * is passed, the root gets the provider's className so brand CSS
 * applies automatically.
 */
export function tenantNameStep(opts: TenantNameStepOptions = {}): Step<string> {
  const labels = {
    ...DEFAULT_LABELS,
    cancel: opts.theme?.labels?.cancel ?? DEFAULT_LABELS.cancel,
    submit: opts.theme?.labels?.select ?? DEFAULT_LABELS.submit,
    ...opts.labels,
  };
  return {
    id: 'tenant-name',
    theme: 'app',
    render: ({ onComplete, onCancel }) => (
      <form
        data-slot="step"
        data-step="tenant-name"
        data-theme={opts.mode}
        className={opts.theme?.className}
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const name = String(data.get('name') ?? '').trim();
          if (name) onComplete(name);
        }}
      >
        <div data-slot="step-header">
          <h2 data-slot="step-title">{labels.title}</h2>
        </div>
        <div data-slot="step-body">
          <input
            name="name"
            data-slot="step-input"
            defaultValue={opts.initial ?? ''}
            placeholder={labels.placeholder}
            autoFocus
            required
          />
        </div>
        <div data-slot="step-footer">
          <button type="button" data-slot="step-cancel" onClick={onCancel}>
            {labels.cancel}
          </button>
          <button type="submit" data-slot="step-submit">
            {labels.submit}
          </button>
        </div>
      </form>
    ),
  };
}
