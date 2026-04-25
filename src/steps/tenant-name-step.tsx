import type { Step } from '../wizard/types';

export type TenantNameStepClassNames = {
  readonly root?: string;
  readonly label?: string;
  readonly input?: string;
  readonly footer?: string;
  readonly submit?: string;
  readonly cancel?: string;
};

export type TenantNameStepLabels = {
  readonly title?: string;
  readonly placeholder?: string;
  readonly submit?: string;
  readonly cancel?: string;
};

export type TenantNameStepOptions = {
  readonly initial?: string;
  readonly classNames?: TenantNameStepClassNames;
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
 * App-themed; host renders it inside its `WizardController` chrome.
 */
export function tenantNameStep(opts: TenantNameStepOptions = {}): Step<string> {
  const labels = { ...DEFAULT_LABELS, ...opts.labels };
  const cn = opts.classNames ?? {};
  return {
    id: 'tenant-name',
    theme: 'app',
    render: ({ onComplete, onCancel }) => (
      <form
        className={cn.root}
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const name = String(data.get('name') ?? '').trim();
          if (name) onComplete(name);
        }}
      >
        <label className={cn.label}>
          <span>{labels.title}</span>
          <input
            name="name"
            className={cn.input}
            defaultValue={opts.initial ?? ''}
            placeholder={labels.placeholder}
            autoFocus
            required
          />
        </label>
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
