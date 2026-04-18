import type { SVGProps } from 'react';
import type { CloudFile } from 'strata-adapters/cloud';
import FolderIcon from './icons/folder.svg?react';
import GenericFileIcon from './icons/generic-file.svg?react';
import GoogleDocIcon from './icons/google-doc.svg?react';
import GoogleSheetIcon from './icons/google-sheet.svg?react';
import GoogleSlidesIcon from './icons/google-slides.svg?react';
import GoogleFormIcon from './icons/google-form.svg?react';
import PdfIcon from './icons/pdf.svg?react';
import ImageIcon from './icons/image.svg?react';

/**
 * Picks the correct file-type icon for a Drive `CloudFile` based on its
 * `mimeType`. Falls back to the generic file glyph.
 */
export function GoogleDriveFileIcon({
  file,
  ...props
}: { readonly file: CloudFile } & SVGProps<SVGSVGElement>) {
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
