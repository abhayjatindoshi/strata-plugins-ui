import { useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import type {
  CloudFile,
  CloudFileExplorerValidator,
  CloudFileService,
  CloudSpace,
} from 'strata-adapters/cloud';
import { useCloudFileExplorer, type CloudFileExplorerApi } from './use-cloud-file-explorer';

/** className hooks for every slot. Brand wrappers pass classes per slot. */
export type CloudFileExplorerClassNames = {
  readonly overlay?: string;
  readonly content?: string;
  readonly header?: string;
  readonly headerTitle?: string;
  readonly title?: string;
  readonly description?: string;
  readonly searchWrap?: string;
  readonly search?: string;
  readonly closeButton?: string;
  readonly body?: string;
  readonly sidebar?: string;
  readonly sidebarItem?: string;
  readonly sidebarItemActive?: string;
  readonly sidebarItemDisabled?: string;
  readonly sidebarItemIcon?: string;
  readonly main?: string;
  readonly toolbar?: string;
  readonly backButton?: string;
  readonly pageTitle?: string;
  readonly breadcrumb?: string;
  readonly breadcrumbItem?: string;
  readonly breadcrumbSeparator?: string;
  readonly refreshButton?: string;
  readonly columnHeader?: string;
  readonly colName?: string;
  readonly colDate?: string;
  readonly colSize?: string;
  readonly list?: string;
  readonly row?: string;
  readonly rowSelected?: string;
  readonly rowDisabled?: string;
  readonly rowName?: string;
  readonly rowDate?: string;
  readonly rowSize?: string;
  readonly rowIcon?: string;
  readonly empty?: string;
  readonly loading?: string;
  readonly footer?: string;
  readonly newFolderButton?: string;
  readonly newFolderPopoverContent?: string;
  readonly newFolderInput?: string;
  readonly newFolderCreate?: string;
  readonly cancelButton?: string;
  readonly selectButton?: string;
};

/** Custom icons per slot. Everything is optional — brand decides. */
export type CloudFileExplorerIcons = {
  readonly home?: ReactNode;
  readonly folder?: ReactNode | ((file: CloudFile) => ReactNode);
  readonly file?: ReactNode | ((file: CloudFile) => ReactNode);
  readonly space?: ReactNode | ((space: CloudSpace) => ReactNode);
  readonly separator?: ReactNode;
  readonly refresh?: ReactNode;
  readonly newFolder?: ReactNode;
  readonly close?: ReactNode;
  readonly search?: ReactNode;
  readonly loading?: ReactNode;
  readonly back?: ReactNode;
};

/** User-facing labels. All optional with English defaults. */
export type CloudFileExplorerLabels = {
  readonly title?: string;
  readonly description?: string;
  readonly home?: string;
  readonly search?: string;
  readonly empty?: string;
  readonly loading?: string;
  readonly newFolder?: string;
  readonly newFolderPlaceholder?: string;
  readonly create?: string;
  readonly cancel?: string;
  readonly select?: string;
  readonly close?: string;
  readonly back?: string;
  readonly columnName?: string;
  readonly columnDate?: string;
  readonly columnSize?: string;
};

const DEFAULT_LABELS: Required<CloudFileExplorerLabels> = {
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
  readonly classNames?: CloudFileExplorerClassNames;
  readonly icons?: CloudFileExplorerIcons;
  readonly labels?: CloudFileExplorerLabels;
  readonly formatters?: CloudFileExplorerFormatters;
};

/**
 * Unstyled Radix-based cloud file browser. Layout: header with title + search,
 * left sidebar of spaces, main column with breadcrumbs / column headers /
 * rows, footer with new-folder + cancel + select.
 *
 * Brand wrappers (e.g. `<GoogleDriveExplorer>`) pass `classNames`, `icons`,
 * and `labels` to skin it. Behavior lives in `useCloudFileExplorer`.
 */
export function CloudFileExplorer({
  open,
  onOpenChange,
  service,
  validator,
  onSelect,
  searchable = true,
  classNames = {},
  icons = {},
  labels = {},
  formatters = {},
}: CloudFileExplorerProps) {
  const api = useCloudFileExplorer({ service, validator, open });
  const l = { ...DEFAULT_LABELS, ...labels };
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
        <Dialog.Overlay className={classNames.overlay} />
        <Dialog.Content className={classNames.content}>
          <div className={classNames.header}>
            <div className={classNames.headerTitle}>
              <Dialog.Title className={classNames.title}>{l.title}</Dialog.Title>
              <Dialog.Description className={classNames.description}>
                {l.description}
              </Dialog.Description>
            </div>
            {searchable && (
              <div className={classNames.searchWrap}>
                {icons.search}
                <input
                  type="search"
                  placeholder={l.search}
                  className={classNames.search}
                  value={api.state.search ?? ''}
                  onChange={(e) => api.setSearch(e.target.value || undefined)}
                />
              </div>
            )}
            <Dialog.Close asChild>
              <button
                type="button"
                className={classNames.closeButton}
                aria-label={l.close}
              >
                {icons.close}
              </button>
            </Dialog.Close>
          </div>

          <div className={classNames.body}>
            <aside className={classNames.sidebar}>
              {api.state.spaces?.map((space) => {
                const isActive = api.state.currentSpace?.id === space.id;
                const disabled =
                  api.state.loading ||
                  (validator ? !validator.isSpaceEnabled(space) : false);
                const classes = joinClasses(
                  classNames.sidebarItem,
                  isActive ? classNames.sidebarItemActive : undefined,
                  disabled ? classNames.sidebarItemDisabled : undefined,
                );
                return (
                  <button
                    key={space.id}
                    type="button"
                    className={classes}
                    disabled={disabled}
                    data-active={isActive ? '' : undefined}
                    onClick={() => api.switchSpace(space)}
                  >
                    {icons.space && (
                      <span className={classNames.sidebarItemIcon}>
                        {resolveIcon(icons.space, space)}
                      </span>
                    )}
                    <span>{space.displayName}</span>
                  </button>
                );
              })}
              <button
                type="button"
                className={classNames.refreshButton}
                onClick={api.refresh}
                aria-label={l.loading}
                data-loading={api.state.loading ? '' : undefined}
              >
                {icons.refresh}
              </button>
            </aside>

            <div className={classNames.main}>
              {api.state.history.length > 0 && (
                <div className={classNames.toolbar}>
                  <button
                    type="button"
                    className={classNames.backButton}
                    onClick={() => {
                      const parent = api.state.history[api.state.history.length - 2];
                      api.navigateUpTo(parent);
                    }}
                    aria-label={l.back}
                  >
                    {icons.back}
                  </button>
                  <nav aria-label="breadcrumb" className={classNames.breadcrumb}>
                    {api.state.history.map((folder, index) => (
                      <span key={folder.id} style={{ display: 'contents' }}>
                        {index > 0 && (
                          <span
                            className={classNames.breadcrumbSeparator}
                            aria-hidden="true"
                          >
                            {icons.separator ?? '›'}
                          </span>
                        )}
                        <BreadcrumbButton
                          className={classNames.breadcrumbItem}
                          onClick={() => api.navigateUpTo(folder)}
                        >
                          <span>{folder.name}</span>
                        </BreadcrumbButton>
                      </span>
                    ))}
                  </nav>
                </div>
              )}

              <div className={classNames.columnHeader}>
                <div className={classNames.colName}>{l.columnName}</div>
                <div className={classNames.colDate}>{l.columnDate}</div>
                <div className={classNames.colSize}>{l.columnSize}</div>
              </div>

              <div
                className={classNames.list}
                data-loading={api.state.loading ? '' : undefined}
              >
                {api.state.loading && (
                  <div className={classNames.loading} role="status" aria-live="polite">
                    {icons.loading ?? <span>{l.loading}</span>}
                  </div>
                )}
                {!api.state.loading && api.state.files?.length === 0 && (
                  <div className={classNames.empty}>{l.empty}</div>
                )}
                {api.state.files?.map((file) => {
                  const isSelected = api.state.selected?.id === file.id;
                  const disabled = validator ? !validator.isFileEnabled(file) : false;
                  const rowClasses = joinClasses(
                    classNames.row,
                    isSelected ? classNames.rowSelected : undefined,
                    disabled ? classNames.rowDisabled : undefined,
                  );
                  return (
                    <button
                      key={file.id}
                      type="button"
                      className={rowClasses}
                      disabled={disabled}
                      data-selected={isSelected ? '' : undefined}
                      data-folder={file.isFolder ? '' : undefined}
                      onDoubleClick={() => {
                        if (file.isFolder) api.openFolder(file);
                      }}
                      onClick={() => {
                        if (file.isFolder) api.openFolder(file);
                        else api.selectFile(file);
                      }}
                    >
                      <div className={classNames.rowName}>
                        <span className={classNames.rowIcon}>
                          {file.isFolder
                            ? resolveIcon(icons.folder, file)
                            : resolveIcon(icons.file, file)}
                        </span>
                        <span>{file.name}</span>
                      </div>
                      <div className={classNames.rowDate}>
                        {fmt.formatDate(file.modifiedTime)}
                      </div>
                      <div className={classNames.rowSize}>
                        {fmt.formatSize(file.size)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={classNames.footer}>
            {api.state.currentSpace && (
              <NewFolderPopover
                disabled={
                  validator
                    ? !validator.folderCreationEnabled(
                        api.state.currentSpace,
                        api.state.currentFolder,
                      )
                    : false
                }
                classNames={classNames}
                icons={icons}
                labels={l}
                onCreate={api.createFolder}
              />
            )}
            <div style={{ flex: 1 }} />
            <button
              type="button"
              className={classNames.cancelButton}
              onClick={() => onOpenChange(false)}
            >
              {l.cancel}
            </button>
            <button
              type="button"
              className={classNames.selectButton}
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

function BreadcrumbButton({
  className,
  onClick,
  children,
}: {
  readonly className?: string;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  );
}

function resolveIcon<T>(
  icon: ReactNode | ((item: T) => ReactNode) | undefined,
  item: T,
): ReactNode {
  if (typeof icon === 'function') return (icon as (x: T) => ReactNode)(item);
  return icon ?? null;
}

function joinClasses(...parts: ReadonlyArray<string | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

function defaultFormatDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  });
}

function defaultFormatSize(bytes: number | undefined): string {
  if (bytes === undefined || !Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function NewFolderPopover({
  disabled,
  classNames,
  icons,
  labels,
  onCreate,
}: {
  readonly disabled: boolean;
  readonly classNames: CloudFileExplorerClassNames;
  readonly icons: CloudFileExplorerIcons;
  readonly labels: Required<CloudFileExplorerLabels>;
  readonly onCreate: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(undefined);
    try {
      await onCreate(name);
      setName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create folder');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={classNames.newFolderButton}
          disabled={disabled}
        >
          {icons.newFolder}
          <span>{labels.newFolder}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={classNames.newFolderPopoverContent}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={labels.newFolderPlaceholder}
            className={classNames.newFolderInput}
            autoFocus
          />
          <button
            type="button"
            className={classNames.newFolderCreate}
            disabled={busy || !name.trim()}
            onClick={() => void submit()}
          >
            {labels.create}
          </button>
          {error && <div role="alert">{error}</div>}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
