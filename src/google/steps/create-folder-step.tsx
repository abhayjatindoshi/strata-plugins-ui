import { useState } from 'react';
import type { CloudFile, CloudFileService, CloudSpace } from 'strata-adapters';
import type { Step } from '../../wizard/types';

export type CreateFolderStepClassNames = {
  readonly root?: string;
  readonly title?: string;
  readonly input?: string;
  readonly footer?: string;
  readonly submit?: string;
  readonly cancel?: string;
};

export type CreateFolderStepLabels = {
  readonly title?: string;
  readonly placeholder?: string;
  readonly submit?: string;
  readonly cancel?: string;
};

export type CreateFolderStepOptions = {
  readonly service: CloudFileService;
  readonly space: CloudSpace;
  readonly parent: CloudFile | null;
  readonly classNames?: CreateFolderStepClassNames;
  readonly labels?: CreateFolderStepLabels;
};

const DEFAULT_LABELS: Required<CreateFolderStepLabels> = {
  title: 'Create a folder',
  placeholder: 'Folder name',
  submit: 'Create',
  cancel: 'Cancel',
};

/** Provider-themed step that creates a new folder via `service.createFolder`. */
export function createFolderStep(opts: CreateFolderStepOptions): Step<CloudFile> {
  const labels = { ...DEFAULT_LABELS, ...opts.labels };
  const cn = opts.classNames ?? {};
  return {
    id: 'create-folder',
    theme: 'provider',
    render: ({ onComplete, onCancel }) => (
      <CreateFolderBody
        service={opts.service}
        space={opts.space}
        parent={opts.parent}
        cn={cn}
        labels={labels}
        onCreated={onComplete}
        onCancel={onCancel}
      />
    ),
  };
}

function CreateFolderBody({
  service,
  space,
  parent,
  cn,
  labels,
  onCreated,
  onCancel,
}: {
  readonly service: CloudFileService;
  readonly space: CloudSpace;
  readonly parent: CloudFile | null;
  readonly cn: CreateFolderStepClassNames;
  readonly labels: Required<CreateFolderStepLabels>;
  readonly onCreated: (folder: CloudFile) => void;
  readonly onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      className={cn.root}
      onSubmit={(e) => {
        e.preventDefault();
        if (busy) return;
        const data = new FormData(e.currentTarget);
        const name = String(data.get('name') ?? '').trim();
        if (!name) return;
        setBusy(true);
        service
          .createFolder(space, name, parent?.id ?? null)
          .then(onCreated)
          .finally(() => setBusy(false));
      }}
    >
      <h2 className={cn.title}>{labels.title}</h2>
      <input
        name="name"
        className={cn.input}
        placeholder={labels.placeholder}
        autoFocus
        required
      />
      <div className={cn.footer}>
        <button type="button" className={cn.cancel} onClick={onCancel} disabled={busy}>
          {labels.cancel}
        </button>
        <button type="submit" className={cn.submit} disabled={busy}>
          {labels.submit}
        </button>
      </div>
    </form>
  );
}
