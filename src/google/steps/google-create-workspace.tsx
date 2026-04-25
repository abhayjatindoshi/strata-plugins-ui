import { useState, type ReactNode } from 'react';
import type { CloudFile, CloudFileService, CloudSpace } from 'strata-adapters/cloud';
import type { Step } from '../../wizard/types';
import { CloudFileExplorer } from '../../cloud/cloud-file-explorer';
import type { ProviderTheme } from '../../tenants/provider';

export type CreateWorkspaceResult = {
  readonly name: string;
  readonly space: CloudSpace;
  readonly folderId: string;
  readonly shareable: boolean;
};

export type GoogleCreateWorkspaceOptions = {
  readonly service: CloudFileService;
  readonly mode?: 'light' | 'dark';
  readonly theme?: ProviderTheme;
};

const APP_DATA_SPACE: CloudSpace = { id: 'appDataFolder', displayName: 'App data' };

/**
 * Google-specific create workspace step. Single form with:
 * - Name input (auto-fills from folder name when picked)
 * - Shareable checkbox (toggles folder picker)
 * - Folder picker (opens CloudFileExplorer for My Drive + Shared With Me)
 */
export function googleCreateWorkspaceStep(opts: GoogleCreateWorkspaceOptions): Step<CreateWorkspaceResult> {
  return {
    id: 'google-create-workspace',
    theme: 'provider',
    render: ({ onComplete, onCancel }) => (
      <GoogleCreateWorkspaceBody
        service={opts.service}
        mode={opts.mode}
        theme={opts.theme}
        onComplete={onComplete}
        onCancel={onCancel}
      />
    ),
  };
}

function GoogleCreateWorkspaceBody({
  service,
  mode,
  theme,
  onComplete,
  onCancel,
}: {
  readonly service: CloudFileService;
  readonly mode?: 'light' | 'dark';
  readonly theme?: ProviderTheme;
  readonly onComplete: (result: CreateWorkspaceResult) => void;
  readonly onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [shareable, setShareable] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<CloudFile | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<CloudSpace | null>(null);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const canSubmit = name.trim().length > 0 && (!shareable || selectedFolder !== null);

  const handleFolderSelect = (space: CloudSpace, file: CloudFile) => {
    setSelectedSpace(space);
    setSelectedFolder(file);
    setExplorerOpen(false);
    if (!name.trim()) {
      setName(file.name);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    try {
      if (shareable && selectedFolder && selectedSpace) {
        onComplete({
          name: name.trim(),
          space: selectedSpace,
          folderId: selectedFolder.id,
          shareable: true,
        });
      } else {
        // Private: create a folder in appDataFolder
        const folder = await service.createFolder(APP_DATA_SPACE, name.trim(), null);
        onComplete({
          name: name.trim(),
          space: APP_DATA_SPACE,
          folderId: folder.id,
          shareable: false,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const explorerValidator = {
    isSpaceVisible: (s: CloudSpace) => s.id === 'drive' || s.id === 'sharedWithMe',
    isSpaceEnabled: () => true,
    isFileVisible: (f: CloudFile) => f.isFolder,
    isFileEnabled: (f: CloudFile) => f.isFolder,
    folderCreationEnabled: () => true,
  };

  return (
    <>
      <form
        data-slot="step"
        data-step="google-create-workspace"
        data-theme={mode}
        className={theme?.className}
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        <div data-slot="step-header">
          <div data-slot="step-header-text">
            <h2 data-slot="step-title">New Workspace</h2>
            <p data-slot="step-description">Create a new workspace in Google Drive.</p>
          </div>
          <button type="button" data-slot="step-close" onClick={onCancel} aria-label="Close">
            ✕
          </button>
        </div>

        <div data-slot="step-body">
          <div data-slot="step-field">
            <label data-slot="step-checkbox-label">
              <input
                data-slot="step-checkbox"
                type="checkbox"
                checked={shareable}
                onChange={(e) => {
                  setShareable(e.target.checked);
                  if (!e.target.checked) {
                    setSelectedFolder(null);
                    setSelectedSpace(null);
                  }
                }}
              />
              <span>Enable sharing with other users</span>
            </label>
            <p data-slot="step-hint">When sharing is enabled you can invite collaborators.</p>
          </div>

          {shareable && (
            <div data-slot="step-field">
              <label data-slot="step-label">Folder (Drive)</label>
              <div data-slot="step-folder-picker" onClick={() => setExplorerOpen(true)} role="button" tabIndex={0}>
                <input
                  data-slot="step-input"
                  type="text"
                  readOnly
                  value={selectedFolder?.name ?? ''}
                  placeholder="No folder selected"
                  style={{ cursor: 'pointer' }}
                />
                <span data-slot="step-browse">Browse</span>
              </div>
              <p data-slot="step-hint">Choose an empty Google Drive folder.</p>
            </div>
          )}

          <hr data-slot="step-divider" />

          <div data-slot="step-field">
            <label data-slot="step-label" htmlFor="ws-name">Name</label>
            <input
              id="ws-name"
              data-slot="step-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My workspace"
              autoFocus
              required
            />
          </div>
        </div>

        <div data-slot="step-footer">
          <button type="button" data-slot="step-cancel" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="submit" data-slot="step-submit" disabled={!canSubmit || busy}>
            Continue
          </button>
        </div>
      </form>

      <CloudFileExplorer
        open={explorerOpen}
        onOpenChange={setExplorerOpen}
        service={service}
        mode={mode}
        theme={theme}
        validator={explorerValidator}
        searchable={false}
        onSelect={handleFolderSelect}
      />
    </>
  );
}
