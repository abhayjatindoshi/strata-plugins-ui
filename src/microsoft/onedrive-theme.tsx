import type { CloudFile } from '@fyre-db/plugins';
import type { ProviderTheme } from '../tenants/provider';
import {
  FluentBackIcon,
  FluentCloseIcon,
  FluentNewFolderIcon,
  FluentRefreshIcon,
  FluentSearchIcon,
  FluentSpinnerIcon,
} from './icons';
import { OneDriveFileIcon } from './onedrive-file-icon';

export type OneDriveTheme = ProviderTheme;

export const oneDriveTheme: OneDriveTheme = {
  color: '#0078D4',
  accent: '#0364B8',
  className: 'fyredb-onedrive',
  icons: {
    folder: (file: CloudFile) => <OneDriveFileIcon file={file} />,
    file: (file: CloudFile) => <OneDriveFileIcon file={file} />,
    close: <FluentCloseIcon />,
    search: <FluentSearchIcon />,
    refresh: <FluentRefreshIcon />,
    newFolder: <FluentNewFolderIcon />,
    back: <FluentBackIcon />,
    loading: <FluentSpinnerIcon />,
    separator: '›',
  },
  labels: {
    title: 'Select from OneDrive',
    search: 'Search in OneDrive',
    empty: 'No files found',
    loading: 'Loading…',
    newFolder: 'New folder',
    columnName: 'Name',
    columnDate: 'Date modified',
    columnSize: 'File size',
  },
};
