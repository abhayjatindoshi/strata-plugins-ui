import { Fragment, useState, type KeyboardEvent, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import type {
  CloudFile,
  CloudFileExplorerValidator,
  CloudFileService,
  CloudSpace,
} from '@strata/plugins';
import type { ProviderTheme, ProviderIcons, ProviderLabels } from '../tenants/provider';
import { useCloudFileExplorer, type CloudFileExplorerApi } from './use-cloud-file-explorer';
import { defaultFormatDate, defaultFormatSize } from './format';

const DEFAULT_LABELS: Required<ProviderLabels> = {
  title: 'Select folder',
  description: 'Choose a folder from your cloud storage.',
  home: 'Home',
  search: 'Search',
  empty: 'No files or folders',
  loading: 'Loading…',
  newFolder: 'New folder',
  newFolderPlaceholder: 'Folder name',
  create: 'Create',
  cancel: 'Cancel',
  select: 'Select',
  close: 'Close',
  back: 'Back',
  refresh: 'Refresh',
  retry: 'Retry',
  open: 'Open',
  errorTitle: 'Something went wrong',
  columnName: 'Name',
  columnDate: 'Date modified',
  columnSize: 'File size',
};

/** Formatting helpers exposed for brand wrappers that want custom rendering. */
export type CloudFileExplorerFormatters = {
  readonly formatDate?: (iso: string | undefined) => string;
  readonly formatSize?: (bytes: number | undefined) => string;
};

export type CloudFileExplorerProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly service: CloudFileService;
  readonly validator?: CloudFileExplorerValidator;
  /** Called when the user commits their selection (selected file or current folder). */
  readonly onSelect: (space: CloudSpace, file: CloudFile) => void;
  /** When true, renders a search input in the header. Default: true. */
  readonly searchable?: boolean;
  /** Color mode — sets `data-theme` on root for CSS targeting. */
  readonly mode?: 'light' | 'dark';
  /** Provider theme — supplies className, icons, and labels in one object. */
  readonly theme?: ProviderTheme;
  /** Root className — brand wrappers pass one class, then style via `[data-slot]` selectors. */
  readonly className?: string;
  readonly formatters?: CloudFileExplorerFormatters;
};

/**
 * Unstyled Radix-based cloud file browser. Every element carries a `data-slot`
 * attribute for CSS targeting. State is exposed via `data-*` attributes
 * (`data-active`, `data-selected`, `data-disabled`, `data-loading`,
 * `data-error`, `data-folder`).
 *
 * Brand wrappers pass a single `className` on the root, then style everything
 * via `[data-slot="row"][data-selected]` selectors. Behavior lives in
 * `useCloudFileExplorer`.
 */
export function CloudFileExplorer({
  open,
  onOpenChange,
  service,
  validator,
  onSelect,
  searchable = true,
  mode,
  theme,
  className,
  formatters = {},
}: CloudFileExplorerProps) {
  const resolvedClassName = className ?? theme?.className;
  const icons: ProviderIcons = theme?.icons ?? {};
  const l: Required<ProviderLabels> = { ...DEFAULT_LABELS, ...(theme?.labels ?? {}) };
  const api = useCloudFileExplorer({ service, validator, open });
  const fmt = {
    formatDate: formatters.formatDate ?? defaultFormatDate,
    formatSize: formatters.formatSize ?? defaultFormatSize,
  };

  const handleCommit = () => {
    if (!api.state.currentSpace || !api.pick) return;
    onSelect(api.state.currentSpace, api.pick);
    onOpenChange(false);
    api.reset();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay data-slot="overlay" />
        <Dialog.Content data-slot="content" className={resolvedClassName} data-theme={mode}>
          <div data-slot="header">
            <div data-slot="header-title">
              <Dialog.Title data-slot="title">{l.title}</Dialog.Title>
              <Dialog.Description data-slot="description">
                {l.description}
              </Dialog.Description>
            </div>
            {searchable && (
              <div data-slot="search-wrap">
                {icons.search}
                <input
                  type="search"
                  placeholder={l.search}
                  data-slot="search"
                  value={api.state.search ?? ''}
                  onChange={(e) => { api.setSearch(e.target.value || undefined); }}
                />
              </div>
            )}
            <Dialog.Close asChild>
              <button
                type="button"
                data-slot="close"
                aria-label={l.close}
              >
                {icons.close}
              </button>
            </Dialog.Close>
          </div>

          <div data-slot="body">
            <aside data-slot="sidebar">
              {api.state.spaces?.map((space) => {
                const isActive = api.state.currentSpace?.id === space.id;
                const disabled =
                  api.state.loading ||
                  (validator ? !validator.isSpaceEnabled(space) : false);
                return (
                  <button
                    key={space.id}
                    type="button"
                    data-slot="sidebar-item"
                    disabled={disabled}
                    data-active={isActive ? '' : undefined}
                    data-disabled={disabled ? '' : undefined}
                    onClick={() => { api.switchSpace(space); }}
                  >
                    {icons.space && (
                      <span data-slot="sidebar-icon">
                        {resolveIcon(icons.space, space)}
                      </span>
                    )}
                    <span>{space.displayName}</span>
                  </button>
                );
              })}
              <button
                type="button"
                data-slot="refresh"
                onClick={api.refresh}
                aria-label={l.refresh}
                data-loading={api.state.loading ? '' : undefined}
              >
                {icons.refresh}
              </button>
            </aside>

            <div data-slot="main">
              {api.state.history.length > 0 && (
                <div data-slot="toolbar">
                  <button
                    type="button"
                    data-slot="back"
                    onClick={() => {
                      const parent = api.state.history[api.state.history.length - 2];
                      api.navigateUpTo(parent);
                    }}
                    aria-label={l.back}
                  >
                    {icons.back}
                  </button>
                  <nav aria-label="breadcrumb" data-slot="breadcrumb">
                    <button
                      type="button"
                      data-slot="breadcrumb-item"
                      onClick={() => { api.navigateUpTo(undefined); }}
                    >
                      <span>{l.home}</span>
                    </button>
                    {api.state.history.map((folder) => (
                      <Fragment key={folder.id}>
                        <span data-slot="breadcrumb-sep" aria-hidden="true">
                          {icons.separator ?? '›'}
                        </span>
                        <button
                          type="button"
                          data-slot="breadcrumb-item"
                          onClick={() => { api.navigateUpTo(folder); }}
                        >
                          <span>{folder.name}</span>
                        </button>
                      </Fragment>
                    ))}
                  </nav>
                </div>
              )}

              <div data-slot="col-header">
                <div data-slot="col-name">{l.columnName}</div>
                <div data-slot="col-date">{l.columnDate}</div>
                <div data-slot="col-size">{l.columnSize}</div>
              </div>

              <div
                data-slot="list"
                data-loading={api.state.loading ? '' : undefined}
                data-error={api.state.error ? '' : undefined}
              >
                {api.state.error && !api.state.loading && (
                  <div data-slot="retry-panel" role="alert">
                    <div>
                      <strong>{l.errorTitle}</strong>
                      <div>{api.state.error.message}</div>
                    </div>
                    <button type="button" data-slot="retry" onClick={api.retry}>
                      {l.retry}
                    </button>
                  </div>
                )}
                {api.state.loading && (
                  <div data-slot="loading" role="status" aria-live="polite">
                    {icons.loading ?? <span>{l.loading}</span>}
                  </div>
                )}
                {!api.state.loading && !api.state.error && api.state.files?.length === 0 && (
                  <div data-slot="empty">{l.empty}</div>
                )}
                {api.state.files?.map((file) => {
                  const isSelected = api.state.selected?.id === file.id;
                  const disabled = validator ? !validator.isFileEnabled(file) : false;
                  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
                    if (file.isFolder && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      api.openFolder(file);
                    }
                  };
                  return (
                    <div
                      key={file.id}
                      role="button"
                      tabIndex={disabled ? -1 : 0}
                      data-slot="row"
                      aria-disabled={disabled || undefined}
                      data-selected={isSelected ? '' : undefined}
                      data-disabled={disabled ? '' : undefined}
                      data-folder={file.isFolder ? '' : undefined}
                      onDoubleClick={() => {
                        if (file.isFolder) api.openFolder(file);
                      }}
                      onKeyDown={handleKey}
                      onClick={() => {
                        if (!disabled) api.selectFile(file);
                      }}
                    >
                      <div data-slot="row-name">
                        <span data-slot="row-icon">
                          {file.isFolder
                            ? resolveIcon(icons.folder, file)
                            : resolveIcon(icons.file, file)}
                        </span>
                        <span>{file.name}</span>
                      </div>
                      <div data-slot="row-date">
                        {fmt.formatDate(file.modifiedTime)}
                      </div>
                      <div data-slot="row-size">
                        {fmt.formatSize(file.size)}
                      </div>
                      {file.isFolder && (
                        <button
                          type="button"
                          tabIndex={-1}
                          aria-label={l.open}
                          data-slot="row-open"
                          onClick={(e) => {
                            e.stopPropagation();
                            api.openFolder(file);
                          }}
                        >
                          {icons.open ?? '›'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div data-slot="footer">
            {api.state.currentSpace && (
              <NewFolderPopover
                disabled={
                  validator
                    ? !validator.folderCreationEnabled(
                        api.state.currentSpace,
                        api.state.currentFolder ?? null,
                      )
                    : false
                }
                icons={icons}
                labels={l}
                onCreate={api.createFolder}
              />
            )}
            <div data-slot="spacer" />
            <button
              type="button"
              data-slot="cancel"
              onClick={() => { onOpenChange(false); }}
            >
              {l.cancel}
            </button>
            <button
              type="button"
              data-slot="select"
              disabled={!api.pick}
              onClick={handleCommit}
            >
              {l.select}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Also exported for brand forms that want to compose the explorer body themselves. */
export { useCloudFileExplorer } from './use-cloud-file-explorer';
export type { CloudFileExplorerApi };

function resolveIcon<T>(
  icon: ReactNode | ((item: T) => ReactNode) | undefined,
  item: T,
): ReactNode {
  if (typeof icon === 'function') return (icon as (x: T) => ReactNode)(item);
  return icon ?? null;
}

function NewFolderPopover({
  disabled,
  icons,
  labels,
  onCreate,
}: {
  readonly disabled: boolean;
  readonly icons: ProviderIcons;
  readonly labels: Required<ProviderLabels>;
  readonly onCreate: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(undefined);
    try {
      await onCreate(name);
      setName('');
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create folder');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          data-slot="new-folder"
          disabled={disabled}
        >
          {icons.newFolder}
          <span>{labels.newFolder}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content data-slot="new-folder-popover">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); }}
              placeholder={labels.newFolderPlaceholder}
              data-slot="new-folder-input"
              autoFocus
            />
            <button
              type="submit"
              data-slot="new-folder-create"
              disabled={busy || !name.trim()}
            >
              {labels.create}
            </button>
            {error && <div role="alert">{error}</div>}
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
