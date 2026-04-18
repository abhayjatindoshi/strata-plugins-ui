import type { CloudFile } from 'strata-adapters/cloud';
import type { GoogleIconProps } from './icon-base';
import { FolderIcon } from './folder-icon';
import { GenericFileIcon } from './generic-file-icon';
import { GoogleDocIcon } from './google-doc-icon';
import { GoogleSheetIcon } from './google-sheet-icon';
import { GoogleSlidesIcon } from './google-slides-icon';
import { GoogleFormIcon } from './google-form-icon';
import { PdfIcon } from './pdf-icon';
import { ImageIcon } from './image-icon';

/**
 * Picks the correct file-type icon for a Drive `CloudFile` based on its
 * `mimeType`. Falls back to the generic file glyph.
 */
export function GoogleDriveFileIcon({
  file,
  ...props
}: { readonly file: CloudFile } & GoogleIconProps) {
  if (file.isFolder) return <FolderIcon {...props} />;
  switch (file.mimeType) {
    case 'application/vnd.google-apps.document':
      return <GoogleDocIcon {...props} />;
    case 'application/vnd.google-apps.spreadsheet':
      return <GoogleSheetIcon {...props} />;
    case 'application/vnd.google-apps.presentation':
      return <GoogleSlidesIcon {...props} />;
    case 'application/vnd.google-apps.form':
      return <GoogleFormIcon {...props} />;
    case 'application/pdf':
      return <PdfIcon {...props} />;
    default:
      if (file.mimeType?.startsWith('image/')) return <ImageIcon {...props} />;
      return <GenericFileIcon {...props} />;
  }
}
