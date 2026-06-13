import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type {
  CloudFile,
  CloudFileExplorerValidator,
  CloudFileService,
  CloudSpace,
} from '@fyre-db/plugins';

vi.mock('@fyre-db/plugins', () => {
  class FyreDbError extends Error {
    readonly kind: string;
    constructor(message: string, opts: { kind: string }) {
      super(message);
      this.name = 'FyreDbError';
      this.kind = opts.kind;
    }
  }
  return { FyreDbError };
});

import { useCloudFileExplorer } from '@/cloud/use-cloud-file-explorer';

const spaceA: CloudSpace = { id: 'a', displayName: 'Space A' };
const spaceB: CloudSpace = { id: 'b', displayName: 'Space B' };

const folder1: CloudFile = { id: 'f1', name: 'Beta', isFolder: true };
const folder2: CloudFile = { id: 'f2', name: 'Alpha', isFolder: true };
const fileX: CloudFile = { id: 'x', name: 'doc.txt', isFolder: false };
const fileY: CloudFile = { id: 'y', name: 'aaa.txt', isFolder: false };

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeService(overrides: Partial<CloudFileService> = {}): CloudFileService {
  return {
    getSpaces: vi.fn(async () => [spaceA, spaceB]),
    getListing: vi.fn(async () => [folder1, folder2, fileX, fileY]),
    createFolder: vi.fn(async () => folder1),
    read: vi.fn(),
    write: vi.fn(),
    delete: vi.fn(),
    deriveTenantId: vi.fn(),
    ...overrides,
  } as unknown as CloudFileService;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useCloudFileExplorer — spaces loading', () => {
  it('loads spaces and selects the first when opened', async () => {
    const service = makeService();
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.spaces).toBeDefined());
    expect(result.current.state.spaces).toEqual([spaceA, spaceB]);
    expect(result.current.state.currentSpace).toEqual(spaceA);
  });

  it('does not load when closed', () => {
    const service = makeService();
    renderHook(() => useCloudFileExplorer({ service, open: false }));
    expect(service.getSpaces).not.toHaveBeenCalled();
  });

  it('filters spaces through the validator', async () => {
    const service = makeService();
    const validator = baseValidator({ isSpaceVisible: (s) => s.id === 'b' });
    const { result } = renderHook(() =>
      useCloudFileExplorer({ service, validator, open: true }),
    );
    await waitFor(() => expect(result.current.state.spaces).toBeDefined());
    expect(result.current.state.spaces).toEqual([spaceB]);
  });

  it('captures a non-abort error from getSpaces', async () => {
    const service = makeService({ getSpaces: vi.fn(async () => { throw new Error('boom'); }) });
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.error).not.toBeNull());
    expect(result.current.state.error?.message).toBe('boom');
  });

  it('ignores an AbortError from getSpaces', async () => {
    const abort = new DOMException('aborted', 'AbortError');
    const service = makeService({ getSpaces: vi.fn(async () => { throw abort; }) });
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.loading).toBe(true));
    // error stays null because the abort path returns early
    await new Promise((r) => setTimeout(r, 10));
    expect(result.current.state.error).toBeNull();
  });

  it('wraps a non-Error rejection via toError', async () => {
    const service = makeService({ getSpaces: vi.fn(async () => { throw 'stringly'; }) });
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.error).not.toBeNull());
    expect(result.current.state.error?.message).toBe('stringly');
  });

  it('returns early in the then-callback when aborted before resolution', async () => {
    const d = deferred<readonly CloudSpace[]>();
    const service = makeService({ getSpaces: vi.fn(() => d.promise) });
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.loading).toBe(true));
    act(() => { result.current.reset(); });
    await act(async () => {
      d.resolve([spaceA]);
      await d.promise;
    });
    expect(result.current.state.spaces).toBeUndefined();
  });
});

describe('useCloudFileExplorer — listing', () => {
  it('loads and sorts files (folders first, then alpha)', async () => {
    const service = makeService();
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.files).toBeDefined());
    expect(result.current.state.files?.map((f) => f.id)).toEqual(['f2', 'f1', 'y', 'x']);
  });

  it('lists inside an opened folder and orders files after folders', async () => {
    const getListing = vi.fn()
      .mockResolvedValueOnce([folder1])
      .mockResolvedValue([folder2, fileX]);
    const service = makeService({ getListing });
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.files).toEqual([folder1]));
    act(() => { result.current.openFolder(folder1); });
    await waitFor(() => {
      expect(getListing.mock.calls.at(-1)?.[1]).toBe('f1');
    });
    await waitFor(() =>
      expect(result.current.state.files?.map((f) => f.id)).toEqual(['f2', 'x']),
    );
  });

  it('orders files after folders regardless of input order', async () => {
    const service = makeService({
      getListing: vi.fn(async () => [folder1, fileX, folder2]),
    });
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.files).toBeDefined());
    expect(result.current.state.files?.map((f) => f.id)).toEqual(['f2', 'f1', 'x']);
  });

  it('returns early in the listing then-callback when aborted', async () => {
    const d = deferred<readonly CloudFile[]>();
    const service = makeService({ getListing: vi.fn(() => d.promise) });
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.currentSpace).toEqual(spaceA));
    await waitFor(() => expect(result.current.state.loading).toBe(true));
    act(() => { result.current.reset(); });
    await act(async () => {
      d.resolve([folder1]);
      await d.promise;
    });
    expect(result.current.state.files).toBeUndefined();
  });

  it('filters files through the validator', async () => {
    const service = makeService();
    const validator = baseValidator({ isFileVisible: (f) => f.isFolder });
    const { result } = renderHook(() =>
      useCloudFileExplorer({ service, validator, open: true }),
    );
    await waitFor(() => expect(result.current.state.files).toBeDefined());
    expect(result.current.state.files?.every((f) => f.isFolder)).toBe(true);
  });

  it('keeps previous files and sets error when listing fails', async () => {
    const getListing = vi.fn()
      .mockResolvedValueOnce([folder1])
      .mockRejectedValueOnce(new Error('list-fail'));
    const service = makeService({ getListing });
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.files).toEqual([folder1]));
    act(() => { result.current.refresh(); });
    await waitFor(() => expect(result.current.state.error?.message).toBe('list-fail'));
    expect(result.current.state.files).toEqual([folder1]);
  });

  it('ignores an AbortError from getListing', async () => {
    const abort = new DOMException('aborted', 'AbortError');
    const getListing = vi.fn()
      .mockResolvedValueOnce([folder1])
      .mockRejectedValueOnce(abort);
    const service = makeService({ getListing });
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.files).toEqual([folder1]));
    act(() => { result.current.refresh(); });
    await waitFor(() => expect(getListing.mock.calls.length).toBe(2));
    await new Promise((r) => setTimeout(r, 10));
    expect(result.current.state.error).toBeNull();
  });

  it('ignores a listing rejection after the controller was aborted', async () => {
    const d = deferred<readonly CloudFile[]>();
    const getListing = vi.fn()
      .mockResolvedValueOnce([folder1])
      .mockImplementationOnce(() => d.promise);
    const service = makeService({ getListing });
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.files).toEqual([folder1]));
    act(() => { result.current.refresh(); });
    await waitFor(() => expect(getListing.mock.calls.length).toBe(2));
    act(() => { result.current.reset(); });
    await act(async () => {
      d.reject(new Error('late'));
      await d.promise.catch(() => undefined);
    });
    expect(result.current.state.error).toBeNull();
  });

  it('debounces when there is a search term', async () => {
    const service = makeService();
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.files).toBeDefined());
    act(() => { result.current.setSearch('query'); });
    await waitFor(() =>
      expect((service.getListing as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(1),
    );
    const lastCall = (service.getListing as ReturnType<typeof vi.fn>).mock.calls.at(-1);
    expect(lastCall?.[2]).toBe('query');
  });
});

describe('useCloudFileExplorer — navigation & selection', () => {
  it('switchSpace is a no-op for the same space', async () => {
    const service = makeService();
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.currentSpace).toEqual(spaceA));
    const before = result.current.state;
    act(() => { result.current.switchSpace(spaceA); });
    expect(result.current.state).toBe(before);
  });

  it('switchSpace resets state for a different space', async () => {
    const service = makeService();
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.currentSpace).toEqual(spaceA));
    act(() => { result.current.switchSpace(spaceB); });
    expect(result.current.state.currentSpace).toEqual(spaceB);
    expect(result.current.state.history).toEqual([]);
  });

  it('openFolder ignores non-folders and pushes folders', async () => {
    const service = makeService();
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.currentSpace).toEqual(spaceA));
    act(() => { result.current.openFolder(fileX); });
    expect(result.current.state.history).toEqual([]);
    act(() => { result.current.openFolder(folder1); });
    expect(result.current.state.history).toEqual([folder1]);
    expect(result.current.state.currentFolder).toEqual(folder1);
  });

  it('navigateUpTo handles root, a found folder, and an unknown folder', async () => {
    const service = makeService();
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.currentSpace).toEqual(spaceA));
    act(() => { result.current.openFolder(folder1); });
    act(() => { result.current.openFolder(folder2); });
    // unknown folder → no change
    const before = result.current.state;
    act(() => { result.current.navigateUpTo({ id: 'nope', name: 'x', isFolder: true }); });
    expect(result.current.state).toBe(before);
    // found folder → truncates history
    act(() => { result.current.navigateUpTo(folder1); });
    expect(result.current.state.history).toEqual([folder1]);
    // root
    act(() => { result.current.navigateUpTo(undefined); });
    expect(result.current.state.history).toEqual([]);
    expect(result.current.state.currentFolder).toBeUndefined();
  });

  it('selectFile respects the validator gate', async () => {
    const service = makeService();
    const validator = baseValidator({ isFileEnabled: (f) => f.isFolder });
    const { result } = renderHook(() =>
      useCloudFileExplorer({ service, validator, open: true }),
    );
    await waitFor(() => expect(result.current.state.currentSpace).toEqual(spaceA));
    act(() => { result.current.selectFile(fileX); });
    expect(result.current.state.selected).toBeUndefined();
    act(() => { result.current.selectFile(folder1); });
    expect(result.current.state.selected).toEqual(folder1);
    act(() => { result.current.selectFile(undefined); });
    expect(result.current.state.selected).toBeUndefined();
  });

  it('pick prefers selection, then current folder', async () => {
    const service = makeService();
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.currentSpace).toEqual(spaceA));
    expect(result.current.pick).toBeUndefined();
    act(() => { result.current.openFolder(folder1); });
    expect(result.current.pick).toEqual(folder1);
    act(() => { result.current.selectFile(fileX); });
    expect(result.current.pick).toEqual(fileX);
  });
});

describe('useCloudFileExplorer — refresh, retry, createFolder', () => {
  it('refresh is a no-op without a current space', () => {
    const service = makeService();
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: false }));
    act(() => { result.current.refresh(); });
    expect(service.getListing).not.toHaveBeenCalled();
  });

  it('retry reloads spaces when none are loaded', async () => {
    const service = makeService({ getSpaces: vi.fn(async () => { throw new Error('x'); }) });
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.error).not.toBeNull());
    act(() => { result.current.retry(); });
    expect((service.getSpaces as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(1);
  });

  it('retry does nothing when spaces are loaded but empty', async () => {
    const service = makeService({ getSpaces: vi.fn(async () => []) });
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.spaces).toEqual([]));
    act(() => { result.current.retry(); });
    expect((service.getSpaces as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    expect(service.getListing).not.toHaveBeenCalled();
  });

  it('retry reloads the listing when spaces exist', async () => {
    const service = makeService();
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.files).toBeDefined());
    const before = (service.getListing as ReturnType<typeof vi.fn>).mock.calls.length;
    act(() => { result.current.retry(); });
    await waitFor(() =>
      expect((service.getListing as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(before),
    );
  });

  it('createFolder ignores empty input', async () => {
    const service = makeService();
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.currentSpace).toEqual(spaceA));
    await act(async () => { await result.current.createFolder('   '); });
    expect(service.createFolder).not.toHaveBeenCalled();
  });

  it('createFolder creates and reloads on success', async () => {
    const service = makeService();
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.currentSpace).toEqual(spaceA));
    await act(async () => { await result.current.createFolder('New'); });
    expect(service.createFolder).toHaveBeenCalledWith(spaceA, 'New', null);
  });

  it('createFolder surfaces an error', async () => {
    const service = makeService({
      createFolder: vi.fn(async () => { throw new Error('mk-fail'); }),
    });
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.currentSpace).toEqual(spaceA));
    await act(async () => { await result.current.createFolder('New'); });
    expect(result.current.state.error?.message).toBe('mk-fail');
  });

  it('reset clears all state', async () => {
    const service = makeService();
    const { result } = renderHook(() => useCloudFileExplorer({ service, open: true }));
    await waitFor(() => expect(result.current.state.spaces).toBeDefined());
    act(() => { result.current.reset(); });
    expect(result.current.state.spaces).toBeUndefined();
    expect(result.current.state.currentSpace).toBeUndefined();
  });
});

function baseValidator(
  overrides: Partial<CloudFileExplorerValidator>,
): CloudFileExplorerValidator {
  return {
    isSpaceVisible: () => true,
    isSpaceEnabled: () => true,
    isFileVisible: () => true,
    isFileEnabled: () => true,
    folderCreationEnabled: () => true,
    ...overrides,
  };
}
