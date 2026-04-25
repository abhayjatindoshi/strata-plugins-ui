import type { CloudFile } from 'strata-adapters/cloud';
import type { ProviderTheme } from '../tenants/provider';
import { GoogleDriveFileIcon } from './google-drive-file-icon';
import {
  BackIcon,
  CloseIcon,
  DriveSpinnerIcon,
  NewFolderIcon,
  RefreshIcon,
  SearchIcon,
} from './icons';

/**
 * Shared Google Drive theme. One source of truth for all Google-branded
 * components — CloudFileExplorer, step dialogs, etc.
 *
 * Usage:
 * ```tsx
 * <CloudFileExplorer theme={googleDriveTheme} />
 * ```
 */
export type GoogleDriveTheme = ProviderTheme;

export const googleDriveTheme: GoogleDriveTheme = {
  color: '#1A73E8',
  accent: '#34A853',
  className: 'strata-gdrive',
  icons: {
    folder: (file: CloudFile) => <GoogleDriveFileIcon file={file} />,
    file: (file: CloudFile) => <GoogleDriveFileIcon file={file} />,
    close: <CloseIcon />,
    search: <SearchIcon />,
    refresh: <RefreshIcon />,
    newFolder: <NewFolderIcon />,
    loading: <DriveSpinnerIcon />,
    back: <BackIcon />,
    separator: '›',
  },
  labels: {
    title: 'Select from Drive',
    search: 'Search in Drive',
    empty: 'No files found',
    loading: 'Loading…',
    newFolder: 'New folder',
    columnName: 'Name',
    columnDate: 'Date modified',
    columnSize: 'File size',
  },
};
