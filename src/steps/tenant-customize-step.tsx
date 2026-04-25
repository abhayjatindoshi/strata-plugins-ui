import type { Step } from '../wizard/types';

export type TenantCustomization = {
  readonly color: string;
  readonly icon: string;
};

export type TenantCustomizeStepClassNames = {
  readonly root?: string;
  readonly section?: string;
  readonly label?: string;
  readonly colorInput?: string;
  readonly iconInput?: string;
  readonly footer?: string;
  readonly submit?: string;
  readonly cancel?: string;
};

export type TenantCustomizeStepLabels = {
  readonly title?: string;
  readonly colorLabel?: string;
  readonly iconLabel?: string;
  readonly submit?: string;
  readonly cancel?: string;
};

export type TenantCustomizeStepOptions = {
  readonly initial?: Partial<TenantCustomization>;
  readonly classNames?: TenantCustomizeStepClassNames;
  readonly labels?: TenantCustomizeStepLabels;
};

const DEFAULT_LABELS: Required<TenantCustomizeStepLabels> = {
  title: 'Customize',
  colorLabel: 'Color',
  iconLabel: 'Icon',
  submit: 'Continue',
  cancel: 'Cancel',
};

const DEFAULT_COLOR = '#1A73E8';
const DEFAULT_ICON = 'folder';

/**
 * Bundled common step that prompts for a tenant color + icon.
 * Returns `{ color, icon }`. App-themed.
 */
export function tenantCustomizeStep(
  opts: TenantCustomizeStepOptions = {},
): Step<TenantCustomization> {
  const labels = { ...DEFAULT_LABELS, ...opts.labels };
  const cn = opts.classNames ?? {};
  const initialColor = opts.initial?.color ?? DEFAULT_COLOR;
  const initialIcon = opts.initial?.icon ?? DEFAULT_ICON;
  return {
    id: 'tenant-customize',
    theme: 'app',
    render: ({ onComplete, onCancel }) => (
      <form
        className={cn.root}
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          onComplete({
            color: String(data.get('color') ?? initialColor),
            icon: String(data.get('icon') ?? initialIcon).trim() || initialIcon,
          });
        }}
      >
        <div className={cn.section}>
          <label className={cn.label}>
            <span>{labels.colorLabel}</span>
            <input
              name="color"
              type="color"
              className={cn.colorInput}
              defaultValue={initialColor}
            />
          </label>
        </div>
        <div className={cn.section}>
          <label className={cn.label}>
            <span>{labels.iconLabel}</span>
            <input
              name="icon"
              className={cn.iconInput}
              defaultValue={initialIcon}
            />
          </label>
        </div>
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
