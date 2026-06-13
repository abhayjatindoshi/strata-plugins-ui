import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { CloudFileExplorerProps } from '@/cloud/cloud-file-explorer';

const captured: { props?: CloudFileExplorerProps } = {};
vi.mock('@/cloud/cloud-file-explorer', () => ({
  CloudFileExplorer: (props: CloudFileExplorerProps) => {
    captured.props = props;
    return <div data-testid="explorer" />;
  },
}));

import { GoogleDriveExplorer } from '@/google/google-drive-explorer';
import { googleDriveTheme } from '@/google/google-drive-theme';

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  service: {} as never,
  onSelect: vi.fn(),
};

describe('GoogleDriveExplorer', () => {
  it('applies the Google Drive theme', () => {
    render(<GoogleDriveExplorer {...baseProps} />);
    expect(captured.props?.theme?.className).toBe(googleDriveTheme.className);
    expect(captured.props?.theme?.labels?.title).toBe(googleDriveTheme.labels?.title);
  });

  it('merges custom labels over the theme defaults', () => {
    render(<GoogleDriveExplorer {...baseProps} labels={{ title: 'Custom' }} />);
    expect(captured.props?.theme?.labels?.title).toBe('Custom');
    // unrelated theme labels remain intact
    expect(captured.props?.theme?.labels?.empty).toBe(googleDriveTheme.labels?.empty);
  });
});
