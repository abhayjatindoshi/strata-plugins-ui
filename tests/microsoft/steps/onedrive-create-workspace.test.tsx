import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { CloudFileExplorerProps } from '@/cloud/cloud-file-explorer';
import type { CloudFileService } from '@fyre-db/plugins';

const pickedFolder = { id: 'fold', name: 'PickedFolder', isFolder: true };
const pickedSpace = { id: 'personal', displayName: 'OneDrive' };

vi.mock('@/react/fyredb-app-provider', () => ({
  useFyreDbAppContext: () => ({
    tenantLabels: { lower: 'workspace', sentence: 'Workspace', upper: 'WORKSPACE' },
  }),
}));

const { captured } = vi.hoisted(() => ({
  captured: {} as { validator?: CloudFileExplorerProps['validator'] },
}));

vi.mock('@/cloud/cloud-file-explorer', () => ({
  CloudFileExplorer: (props: CloudFileExplorerProps) => {
    captured.validator = props.validator;
    return props.open ? (
      <div data-testid="explorer">
        <button type="button" onClick={() => props.onSelect(pickedSpace, pickedFolder)}>
          do-select
        </button>
        <button type="button" onClick={() => props.onOpenChange(false)}>
          close-explorer
        </button>
      </div>
    ) : null;
  },
}));

import { onedriveCreateWorkspaceStep } from '@/microsoft/steps/onedrive-create-workspace';

type Deferred = { promise: Promise<{ id: string; name: string; isFolder: boolean }>; resolve: () => void };
function deferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<{ id: string; name: string; isFolder: boolean }>((res) => {
    resolve = () => { res({ id: 'created', name: 'x', isFolder: true }); };
  });
  return { promise, resolve };
}

function makeService(createFolder?: CloudFileService['createFolder']): CloudFileService {
  return {
    createFolder: createFolder ?? vi.fn(async () => ({ id: 'created', name: 'x', isFolder: true })),
    getSpaces: vi.fn(),
    getListing: vi.fn(),
    read: vi.fn(),
    write: vi.fn(),
    delete: vi.fn(),
    deriveTenantId: vi.fn(),
  } as unknown as CloudFileService;
}

function renderStep(service: CloudFileService) {
  const onComplete = vi.fn();
  const onCancel = vi.fn();
  const step = onedriveCreateWorkspaceStep({ service, mode: 'dark' });
  render(<>{step.render({ onComplete, onCancel })}</>);
  return { onComplete, onCancel };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('onedriveCreateWorkspaceStep', () => {
  it('disables submit until a name is entered', () => {
    renderStep(makeService());
    expect(screen.getByText('Continue')).toBeDisabled();
  });

  it('creates a private workspace in approot', async () => {
    const service = makeService();
    const { onComplete } = renderStep(service);
    fireEvent.change(screen.getByLabelText('Workspace name'), { target: { value: 'My WS' } });
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(service.createFolder).toHaveBeenCalledWith(
      { id: 'approot', displayName: 'App data' },
      'My WS',
      null,
    );
    expect(onComplete).toHaveBeenCalledWith({
      name: 'My WS',
      space: { id: 'approot', displayName: 'App data' },
      folderId: 'created',
      shareable: false,
    });
  });

  it('creates a shareable workspace from a picked folder, keeping the typed name', async () => {
    const service = makeService();
    const { onComplete } = renderStep(service);
    fireEvent.change(screen.getByLabelText('Workspace name'), { target: { value: 'Named' } });
    fireEvent.click(screen.getByText('Enable sharing with other users'));
    fireEvent.click(screen.getByText('Browse'));
    fireEvent.click(await screen.findByText('do-select'));
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(onComplete).toHaveBeenCalledWith({
      name: 'Named',
      space: pickedSpace,
      folderId: 'fold',
      shareable: true,
    });
    expect(service.createFolder).not.toHaveBeenCalled();
  });

  it('auto-fills the name from the folder, then clears the folder when sharing is disabled', async () => {
    renderStep(makeService());
    fireEvent.click(screen.getByText('Enable sharing with other users'));
    fireEvent.click(screen.getByText('Browse'));
    fireEvent.click(await screen.findByText('do-select'));
    const nameInput = screen.getByLabelText('Workspace name') as HTMLInputElement;
    expect(nameInput.value).toBe('PickedFolder');
    fireEvent.click(screen.getByText('Enable sharing with other users'));
    expect(screen.queryByText('Browse')).not.toBeInTheDocument();
  });

  it('closes the explorer via onOpenChange', async () => {
    renderStep(makeService());
    fireEvent.click(screen.getByText('Enable sharing with other users'));
    fireEvent.click(screen.getByText('Browse'));
    fireEvent.click(await screen.findByText('close-explorer'));
    expect(screen.queryByTestId('explorer')).not.toBeInTheDocument();
  });

  it('shows an Error message when creation fails', async () => {
    const service = makeService(vi.fn(async () => { throw new Error('nope'); }));
    renderStep(service);
    fireEvent.change(screen.getByLabelText('Workspace name'), { target: { value: 'WS' } });
    fireEvent.click(screen.getByText('Continue'));
    expect(await screen.findByText('nope')).toBeInTheDocument();
  });

  it('shows a fallback message for a non-Error failure', async () => {
    const service = makeService(vi.fn(async () => { throw 'bad'; }));
    renderStep(service);
    fireEvent.change(screen.getByLabelText('Workspace name'), { target: { value: 'WS' } });
    fireEvent.click(screen.getByText('Continue'));
    expect(await screen.findByText('Failed to create workspace')).toBeInTheDocument();
  });

  it('ignores a second submit while busy', async () => {
    const d = deferred();
    const createFolder = vi.fn(() => d.promise);
    const service = makeService(createFolder as unknown as CloudFileService['createFolder']);
    renderStep(service);
    const form = document.querySelector('form') as HTMLFormElement;
    fireEvent.change(screen.getByLabelText('Workspace name'), { target: { value: 'WS' } });
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(createFolder).toHaveBeenCalledTimes(1);
    await act(async () => { d.resolve(); await d.promise; });
  });

  it('cancels from both the close icon and the cancel button', () => {
    const { onCancel } = renderStep(makeService());
    fireEvent.click(screen.getByLabelText('Close'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('gates the explorer to OneDrive folders', () => {
    renderStep(makeService());
    const v = captured.validator;
    if (!v) throw new Error('validator not captured');
    const folder = { id: 'a', name: 'a', isFolder: true };
    const doc = { id: 'b', name: 'b', isFolder: false };
    expect(v.isSpaceVisible({ id: 'personal', displayName: '' })).toBe(true);
    expect(v.isSpaceVisible({ id: 'shared', displayName: '' })).toBe(true);
    expect(v.isSpaceVisible({ id: 'other', displayName: '' })).toBe(false);
    expect(v.isSpaceEnabled({ id: 'personal', displayName: '' })).toBe(true);
    expect(v.isFileVisible(doc)).toBe(true);
    expect(v.isFileEnabled(folder)).toBe(true);
    expect(v.isFileEnabled(doc)).toBe(false);
    expect(v.folderCreationEnabled({ id: 'personal', displayName: '' }, null)).toBe(true);
  });
});
