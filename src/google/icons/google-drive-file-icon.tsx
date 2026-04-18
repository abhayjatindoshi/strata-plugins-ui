import type { CloudFile } from 'strata-adapters/cloud';
import type { GoogleIconProps } from './icon-base';
import FolderIcon from './folder.svg?react';
import GenericFileIcon from './generic-file.svg?react';
import GoogleDocIcon from './google-doc.svg?react';
import GoogleSheetIcon from './google-sheet.svg?react';
import GoogleSlidesIcon from './google-slides.svg?react';
import GoogleFormIcon from './google-form.svg?react';
import PdfIcon from './pdf.svg?react';
import ImageIcon from './image.svg?react';

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
