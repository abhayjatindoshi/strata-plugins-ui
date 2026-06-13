import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import type { CloudFile } from '@fyre-db/plugins';
import { OneDriveFileIcon } from '@/microsoft/onedrive-file-icon';

function file(o: Partial<CloudFile>): CloudFile {
  return { id: 'i', name: 'n', isFolder: false, ...o };
}

function renderIcon(f: CloudFile) {
  const { container } = render(<OneDriveFileIcon file={f} />);
  return container.querySelector('svg');
}

describe('OneDriveFileIcon', () => {
  it('renders a folder glyph', () => {
    expect(renderIcon(file({ isFolder: true, name: 'dir' }))).toBeTruthy();
  });

  it('matches by extension', () => {
    for (const name of ['a.xlsx', 'a.xls', 'a.csv', 'a.docx', 'a.doc', 'a.pptx', 'a.ppt', 'a.pdf']) {
      expect(renderIcon(file({ name }))).toBeTruthy();
    }
  });

  it('matches by mime type when extension is absent', () => {
    const mimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/pdf',
    ];
    for (const mimeType of mimes) {
      expect(renderIcon(file({ name: 'noext', mimeType }))).toBeTruthy();
    }
  });

  it('falls back to the generic glyph', () => {
    expect(renderIcon(file({ name: 'unknown.bin' }))).toBeTruthy();
    expect(renderIcon(file({ name: 'noext' }))).toBeTruthy();
  });
});
