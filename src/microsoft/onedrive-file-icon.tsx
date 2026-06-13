import type { CloudFile } from '@fyre-db/plugins';
import {
  FluentFolderIcon,
  FluentFileIcon,
  FluentExcelIcon,
  FluentWordIcon,
  FluentPowerPointIcon,
  FluentPdfIcon,
} from './icons';

const SIZE = 20;

function resolveIcon(file: CloudFile) {
  if (file.isFolder) return <FluentFolderIcon width={SIZE} height={SIZE} />;

  const ext = file.name.split('.').pop()?.toLowerCase();
  const mime = file.mimeType?.toLowerCase();

  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || mime?.includes('spreadsheet')) {
    return <FluentExcelIcon width={SIZE} height={SIZE} />;
  }
  if (ext === 'docx' || ext === 'doc' || mime?.includes('word')) {
    return <FluentWordIcon width={SIZE} height={SIZE} />;
  }
  if (ext === 'pptx' || ext === 'ppt' || mime?.includes('presentation')) {
    return <FluentPowerPointIcon width={SIZE} height={SIZE} />;
  }
  if (ext === 'pdf' || mime === 'application/pdf') {
    return <FluentPdfIcon width={SIZE} height={SIZE} />;
  }

  return <FluentFileIcon width={SIZE} height={SIZE} />;
}

export function OneDriveFileIcon({ file }: { readonly file: CloudFile }) {
  return resolveIcon(file);
}
