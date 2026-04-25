import { useEffect, useState } from 'react';
import type { CloudFileService, CloudSpace } from 'strata-adapters';
import type { Step } from '../../wizard/types';

export type PickSpaceStepClassNames = {
  readonly root?: string;
  readonly title?: string;
  readonly list?: string;
  readonly item?: string;
  readonly itemSelected?: string;
  readonly footer?: string;
  readonly submit?: string;
  readonly cancel?: string;
  readonly loading?: string;
  readonly error?: string;
};

export type PickSpaceStepLabels = {
  readonly title?: string;
  readonly submit?: string;
  readonly cancel?: string;
  readonly loading?: string;
  readonly error?: string;
};

export type PickSpaceStepOptions = {
  readonly service: CloudFileService;
  readonly classNames?: PickSpaceStepClassNames;
  readonly labels?: PickSpaceStepLabels;
  readonly filter?: (space: CloudSpace) => boolean;
};

const DEFAULT_LABELS: Required<PickSpaceStepLabels> = {
  title: 'Pick a space',
  submit: 'Continue',
  cancel: 'Cancel',
  loading: 'Loading…',
  error: 'Could not load spaces.',
};

/** Provider-themed step that lists `service.getSpaces()` and lets the user pick one. */
export function pickSpaceStep(opts: PickSpaceStepOptions): Step<CloudSpace> {
  const labels = { ...DEFAULT_LABELS, ...opts.labels };
  const cn = opts.classNames ?? {};
  return {
    id: 'pick-space',
    theme: 'provider',
    render: ({ onComplete, onCancel }) => (
      <PickSpaceBody
        service={opts.service}
        filter={opts.filter}
        cn={cn}
        labels={labels}
        onSelect={onComplete}
        onCancel={onCancel}
      />
    ),
  };
}

function PickSpaceBody({
  service,
  filter,
  cn,
  labels,
  onSelect,
  onCancel,
}: {
  readonly service: CloudFileService;
  readonly filter?: (space: CloudSpace) => boolean;
  readonly cn: PickSpaceStepClassNames;
  readonly labels: Required<PickSpaceStepLabels>;
  readonly onSelect: (space: CloudSpace) => void;
  readonly onCancel: () => void;
}) {
  const [spaces, setSpaces] = useState<readonly CloudSpace[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState<CloudSpace | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    service
      .getSpaces(ctrl.signal)
      .then((list) => {
        if (cancelled) return;
        const filtered = filter ? list.filter(filter) : [...list];
        setSpaces(filtered);
        if (filtered.length === 1) setPick(filtered[0] ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : labels.error);
      });
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [service, filter, labels.error]);

  return (
    <div className={cn.root}>
      <h2 className={cn.title}>{labels.title}</h2>
      {error ? (
        <p className={cn.error}>{error}</p>
      ) : spaces === null ? (
        <p className={cn.loading}>{labels.loading}</p>
      ) : (
        <ul className={cn.list}>
          {spaces.map((s) => (
            <li
              key={s.id}
              className={`${cn.item ?? ''} ${pick?.id === s.id ? cn.itemSelected ?? '' : ''}`.trim()}
            >
              <button type="button" onClick={() => setPick(s)}>
                {s.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={cn.footer}>
        <button type="button" className={cn.cancel} onClick={onCancel}>
          {labels.cancel}
        </button>
        <button
          type="button"
          className={cn.submit}
          disabled={!pick}
          onClick={() => {
            if (pick) onSelect(pick);
          }}
        >
          {labels.submit}
        </button>
      </div>
    </div>
  );
}
