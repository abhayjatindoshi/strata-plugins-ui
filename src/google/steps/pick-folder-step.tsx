import type { CloudFile, CloudFileService, CloudSpace } from 'strata-adapters';
import type { Step } from '../../wizard/types';

export type PickFolderStepClassNames = {
  readonly root?: string;
  readonly title?: string;
  readonly footer?: string;
  readonly submit?: string;
  readonly cancel?: string;
};

export type PickFolderStepLabels = {
  readonly title?: string;
  readonly submit?: string;
  readonly cancel?: string;
};

export type PickFolderStepOptions = {
  readonly service: CloudFileService;
  readonly space: CloudSpace;
  readonly classNames?: PickFolderStepClassNames;
  readonly labels?: PickFolderStepLabels;
};

/**
 * Placeholder provider-themed step that lets the user pick a folder within
 * `space`. Future revisions will mount `<CloudFileExplorer>` inside the
 * wizard chrome; for now this step asks the explorer host to handle the pick.
 */
export function pickFolderStep(_opts: PickFolderStepOptions): Step<CloudFile> {
  return {
    id: 'pick-folder',
    theme: 'provider',
    render: () => null,
  };
}
