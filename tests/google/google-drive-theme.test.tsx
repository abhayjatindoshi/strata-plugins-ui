import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import type { CloudFile } from '@fyre-db/plugins';
import { googleDriveTheme } from '@/google/google-drive-theme';

const file: CloudFile = { id: 'f', name: 'n', isFolder: true };

describe('googleDriveTheme', () => {
  it('exposes brand colors, className and labels', () => {
    expect(googleDriveTheme.color).toBe('#1A73E8');
    expect(googleDriveTheme.accent).toBe('#34A853');
    expect(googleDriveTheme.className).toBe('fyredb-gdrive');
    expect(googleDriveTheme.labels?.title).toBe('Select from Drive');
  });

  it('renders folder and file icon factories', () => {
    const folderNode = (googleDriveTheme.icons?.folder as (f: CloudFile) => React.ReactNode)(file);
    const fileNode = (googleDriveTheme.icons?.file as (f: CloudFile) => React.ReactNode)({
      ...file,
      isFolder: false,
    });
    const a = render(<>{folderNode}</>);
    const b = render(<>{fileNode}</>);
    expect(a.container.querySelector('svg')).toBeTruthy();
    expect(b.container.querySelector('svg')).toBeTruthy();
  });
});
