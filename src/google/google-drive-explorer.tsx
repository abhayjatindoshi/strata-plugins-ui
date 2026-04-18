import { useEffect } from 'react';
import {
  CloudFileExplorer,
  type CloudFileExplorerClassNames,
  type CloudFileExplorerIcons,
  type CloudFileExplorerLabels,
  type CloudFileExplorerProps,
} from '../cloud/cloud-file-explorer';
import type {
  CloudFile,
} from 'strata-adapters/cloud';
import { GOOGLE_DRIVE_EXPLORER_CSS } from './google-drive-explorer.css';
import {
  BackIcon,
  CloseIcon,
  DriveSpinnerIcon,
  GoogleDriveFileIcon,
  NewFolderIcon,
  RefreshIcon,
  SearchIcon,
} from './icons';

const STYLE_TAG_ATTR = 'data-strata-gdrive-explorer';

let stylesInjected = false;

function injectStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  if (document.querySelector(`style[${STYLE_TAG_ATTR}]`)) {
    stylesInjected = true;
    return;
  }
  const style = document.createElement('style');
  style.setAttribute(STYLE_TAG_ATTR, '');
  style.textContent = GOOGLE_DRIVE_EXPLORER_CSS;
  document.head.appendChild(style);
  stylesInjected = true;
}

const BASE_CLASS_NAMES: CloudFileExplorerClassNames = {
  overlay: 'strata-gdrive-overlay',
  content: 'strata-gdrive-content',
  header: 'strata-gdrive-header',
  headerTitle: 'strata-gdrive-header-title',
  title: 'strata-gdrive-title',
  description: 'strata-gdrive-description',
  searchWrap: 'strata-gdrive-search-wrap',
  search: 'strata-gdrive-search',
  closeButton: 'strata-gdrive-close',
  body: 'strata-gdrive-body',
  sidebar: 'strata-gdrive-sidebar',
  sidebarItem: 'strata-gdrive-sidebar-item',
  sidebarItemIcon: 'strata-gdrive-sidebar-icon',
  main: 'strata-gdrive-main',
  toolbar: 'strata-gdrive-toolbar',
  backButton: 'strata-gdrive-back',
  breadcrumb: 'strata-gdrive-breadcrumb',
  breadcrumbItem: 'strata-gdrive-breadcrumb-item',
  breadcrumbSeparator: 'strata-gdrive-breadcrumb-sep',
  refreshButton: 'strata-gdrive-refresh',
  columnHeader: 'strata-gdrive-col-header',
  list: 'strata-gdrive-list',
  row: 'strata-gdrive-row',
  rowName: 'strata-gdrive-row-name',
  rowDate: 'strata-gdrive-row-date',
  rowSize: 'strata-gdrive-row-size',
  rowIcon: 'strata-gdrive-row-icon',
  empty: 'strata-gdrive-empty',
  loading: 'strata-gdrive-loading',
  footer: 'strata-gdrive-footer',
  newFolderButton: 'strata-gdrive-new-folder',
  newFolderPopoverContent: 'strata-gdrive-new-folder-popover',
  newFolderInput: 'strata-gdrive-new-folder-input',
  newFolderCreate: 'strata-gdrive-new-folder-create',
  cancelButton: 'strata-gdrive-cancel',
  selectButton: 'strata-gdrive-select',
};

const ICONS: CloudFileExplorerIcons = {
  folder: (file: CloudFile) => <GoogleDriveFileIcon file={file} />,
  file: (file: CloudFile) => <GoogleDriveFileIcon file={file} />,
  close: <CloseIcon />,
  search: <SearchIcon />,
  refresh: <RefreshIcon />,
  newFolder: <NewFolderIcon />,
  loading: <DriveSpinnerIcon />,
  back: <BackIcon />,
  separator: '›',
};

const LABELS: CloudFileExplorerLabels = {
  title: 'Select from Drive',
  search: 'Search in Drive',
  empty: 'No files found',
  loading: 'Loading…',
  newFolder: 'New folder',
  columnName: 'Name',
  columnDate: 'Date modified',
  columnSize: 'File size',
};

export type GoogleDriveExplorerProps = Omit<
  CloudFileExplorerProps,
  'classNames' | 'icons' | 'labels'
> & {
  /** Force a theme; defaults to `prefers-color-scheme`. */
  readonly theme?: 'light' | 'dark';
  /** Override any individual labels. */
  readonly labels?: CloudFileExplorerLabels;
};

/**
 * Google-Drive-themed wrapper around `<CloudFileExplorer>`. Preconfigures
 * classNames, icons, and labels; injects Drive's palette (light + dark) on
 * first mount. Consumers supply `service`, `open`, `onOpenChange`, `onSelect`.
 */
export function GoogleDriveExplorer({
  theme,
  labels,
  ...rest
}: GoogleDriveExplorerProps) {
  useEffect(() => {
    injectStyles();
  }, []);

  const classNames: CloudFileExplorerClassNames = theme
    ? {
        ...BASE_CLASS_NAMES,
        content: `${BASE_CLASS_NAMES.content} strata-gdrive-theme-${theme}`,
      }
    : BASE_CLASS_NAMES;

  return (
    <CloudFileExplorer
      {...rest}
      classNames={classNames}
      icons={ICONS}
      labels={{ ...LABELS, ...labels }}
    />
  );
}
