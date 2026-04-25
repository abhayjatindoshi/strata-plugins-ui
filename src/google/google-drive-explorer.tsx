import {
  CloudFileExplorer,
  type CloudFileExplorerProps,
} from '../cloud/cloud-file-explorer';
import type { ProviderLabels } from '../tenants/provider';
import './google-drive-explorer.css';
import { googleDriveTheme } from './google-drive-theme';

export type GoogleDriveExplorerProps = Omit<
  CloudFileExplorerProps,
  'className' | 'icons' | 'labels' | 'theme'
> & {
  /** Override any individual labels. */
  readonly labels?: ProviderLabels;
};

/**
 * Google-Drive-themed wrapper around `<CloudFileExplorer>`. Uses
 * `googleDriveTheme` for icons/labels and ships Drive's palette
 * (light + dark) via a side-effect CSS import. Dark mode is
 * triggered by a `.dark` class on a parent element.
 */
export function GoogleDriveExplorer({
  labels,
  ...rest
}: GoogleDriveExplorerProps) {
  return (
    <CloudFileExplorer
      {...rest}
      theme={{
        ...googleDriveTheme,
        labels: { ...googleDriveTheme.labels, ...labels },
      }}
    />
  );
}
