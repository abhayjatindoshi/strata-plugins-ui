import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import type { CloudFile } from '@fyre-db/plugins';
import { GoogleDriveFileIcon } from '@/google/google-drive-file-icon';

function file(o: Partial<CloudFile>): CloudFile {
  return { id: 'i', name: 'n', isFolder: false, ...o };
}

function renderIcon(f: CloudFile) {
  const { container } = render(<GoogleDriveFileIcon file={f} />);
  return container.querySelector('svg');
}

describe('GoogleDriveFileIcon', () => {
  it('renders a folder glyph', () => {
    expect(renderIcon(file({ isFolder: true }))).toBeTruthy();
  });

  it('renders type-specific glyphs for known mime types', () => {
    const mimes = [
      'application/vnd.google-apps.document',
      'application/vnd.google-apps.spreadsheet',
      'application/vnd.google-apps.presentation',
      'application/vnd.google-apps.form',
      'application/pdf',
      'image/png',
    ];
    for (const mimeType of mimes) {
      expect(renderIcon(file({ mimeType }))).toBeTruthy();
    }
  });

  it('falls back to the generic glyph for unknown types and missing mime', () => {
    expect(renderIcon(file({ mimeType: 'text/plain' }))).toBeTruthy();
    expect(renderIcon(file({}))).toBeTruthy();
  });

  it('passes through svg props', () => {
    const { container } = render(
      <GoogleDriveFileIcon file={file({})} className="ic" data-testid="g" />,
    );
    expect(container.querySelector('svg.ic')).toBeTruthy();
  });
});
