import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import type { CloudFile } from '@fyre-db/plugins';
import { oneDriveTheme } from '@/microsoft/onedrive-theme';

const file: CloudFile = { id: 'f', name: 'n', isFolder: true };

describe('oneDriveTheme', () => {
  it('exposes brand colors, className and labels', () => {
    expect(oneDriveTheme.color).toBe('#0078D4');
    expect(oneDriveTheme.accent).toBe('#0364B8');
    expect(oneDriveTheme.className).toBe('fyredb-onedrive');
    expect(oneDriveTheme.labels?.title).toBe('Select from OneDrive');
  });

  it('renders folder and file icon factories', () => {
    const folderNode = (oneDriveTheme.icons?.folder as (f: CloudFile) => React.ReactNode)(file);
    const fileNode = (oneDriveTheme.icons?.file as (f: CloudFile) => React.ReactNode)({
      ...file,
      isFolder: false,
      name: 'a.pdf',
    });
    const a = render(<>{folderNode}</>);
    const b = render(<>{fileNode}</>);
    expect(a.container.querySelector('svg')).toBeTruthy();
    expect(b.container.querySelector('svg')).toBeTruthy();
  });
});
