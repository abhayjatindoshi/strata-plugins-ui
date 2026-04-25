import {
  CloudFileExplorer,
  type CloudFileExplorerIcons,
  type CloudFileExplorerLabels,
  type CloudFileExplorerProps,
} from '../cloud/cloud-file-explorer';
import type {
  CloudFile,
} from 'strata-adapters/cloud';
import './google-drive-explorer.css';
import { GoogleDriveFileIcon } from './google-drive-file-icon';
import {
  BackIcon,
  CloseIcon,
  DriveSpinnerIcon,
  NewFolderIcon,
  RefreshIcon,
  SearchIcon,
} from './icons';

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
  'className' | 'icons' | 'labels'
> & {
  /** Force a theme; defaults to `prefers-color-scheme`. */
  readonly theme?: 'light' | 'dark';
  /** Override any individual labels. */
  readonly labels?: CloudFileExplorerLabels;
};

/**
 * Google-Drive-themed wrapper around `<CloudFileExplorer>`. Passes a single
 * root `className` and ships Drive's palette (light + dark) via a side-effect
 * CSS import. Brand CSS targets elements via `[data-slot]` selectors.
 */
export function GoogleDriveExplorer({
  theme,
  labels,
  ...rest
}: GoogleDriveExplorerProps) {
  const className = theme
    ? `strata-gdrive strata-gdrive-theme-${theme}`
    : 'strata-gdrive';

  return (
    <CloudFileExplorer
      {...rest}
      className={className}
      icons={ICONS}
      labels={{ ...LABELS, ...labels }}
    />
  );
}
