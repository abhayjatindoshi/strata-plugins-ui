import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CloudFile,
  CloudFileExplorerValidator,
  CloudFileService,
  CloudSpace,
} from 'strata-adapters/cloud';

export type UseCloudFileExplorerOptions = {
  readonly service: CloudFileService;
  readonly validator?: CloudFileExplorerValidator;
  /** When the explorer is hidden, state loading pauses and a `reset()` on open re-initialises it. */
  readonly open: boolean;
};

export type CloudFileExplorerState = {
  readonly spaces: ReadonlyArray<CloudSpace> | undefined;
  readonly currentSpace: CloudSpace | undefined;
  readonly files: ReadonlyArray<CloudFile> | undefined;
  readonly currentFolder: CloudFile | undefined;
  readonly history: ReadonlyArray<CloudFile>;
  readonly selected: CloudFile | undefined;
  readonly search: string | undefined;
  readonly loading: boolean;
  readonly error: Error | null;
};

export type CloudFileExplorerApi = {
  readonly state: CloudFileExplorerState;
  readonly switchSpace: (space: CloudSpace) => void;
  readonly openFolder: (file: CloudFile) => void;
  readonly navigateUpTo: (folder: CloudFile | undefined) => void;
  readonly selectFile: (file: CloudFile | undefined) => void;
  readonly setSearch: (search: string | undefined) => void;
  readonly refresh: () => void;
  readonly retry: () => void;
  readonly createFolder: (name: string) => Promise<void>;
  readonly reset: () => void;
  /** Resolved current pick — selection wins, otherwise the current folder. */
  readonly pick: CloudFile | undefined;
};

const initialState = (): CloudFileExplorerState => ({
  spaces: undefined,
  currentSpace: undefined,
  files: undefined,
  currentFolder: undefined,
  history: [],
  selected: undefined,
  search: undefined,
  loading: false,
  error: null,
});

const SEARCH_DEBOUNCE_MS = 300;

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

/**
 * Provider-agnostic state hook behind `<CloudFileExplorer>`. Manages spaces,
 * current folder + history, listing + search, selection, and folder creation.
 *
 * Stays headless: knows nothing about dialogs, layout, or styling. Brand
 * components render the returned state however they like.
 */
export function useCloudFileExplorer({
  service,
  validator,
  open,
}: UseCloudFileExplorerOptions): CloudFileExplorerApi {
  const [state, setState] = useState<CloudFileExplorerState>(initialState);

  const spacesAbortRef = useRef<AbortController | null>(null);
  const listingAbortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    spacesAbortRef.current?.abort();
    listingAbortRef.current?.abort();
    setState(initialState());
  }, []);

  const loadSpaces = useCallback(() => {
    spacesAbortRef.current?.abort();
    const controller = new AbortController();
    spacesAbortRef.current = controller;

    setState((s) => ({ ...s, loading: true, error: null }));
    service.getSpaces(controller.signal)
      .then((spaces) => {
        if (controller.signal.aborted) return;
        const visible = validator
          ? spaces.filter((sp) => validator.isSpaceVisible(sp))
          : [...spaces];
        setState((s) => ({
          ...s,
          spaces: visible,
          currentSpace: visible[0],
          loading: false,
        }));
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isAbort(err)) return;
        setState((s) => ({ ...s, error: toError(err), loading: false }));
      });
  }, [service, validator]);

  // Load spaces when the explorer opens.
  useEffect(() => {
    if (!open) return;
    setState(initialState());
    loadSpaces();
    return () => {
      spacesAbortRef.current?.abort();
    };
  }, [open, loadSpaces]);

  const loadFiles = useCallback(
    (
      space: CloudSpace,
      parentFolder: CloudFile | undefined,
      search: string | undefined,
    ) => {
      listingAbortRef.current?.abort();
      const controller = new AbortController();
      listingAbortRef.current = controller;

      setState((s) => ({ ...s, loading: true, error: null }));
      const parentId = parentFolder?.isFolder ? parentFolder.id : null;
      service.getListing(space, parentId, search ?? '', controller.signal)
        .then((listing) => {
          if (controller.signal.aborted) return;
          const filtered = (validator
            ? listing.filter((f) => validator.isFileVisible(f))
            : [...listing]
          ).sort((a, b) =>
            a.isFolder === b.isFolder
              ? a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
              : a.isFolder
                ? -1
                : 1,
          );
          setState((s) => ({ ...s, files: filtered, selected: undefined, loading: false }));
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted || isAbort(err)) return;
          // Keep previous files visible so the user retains context.
          setState((s) => ({ ...s, selected: undefined, loading: false, error: toError(err) }));
        });
    },
    [service, validator],
  );

  // Load listing whenever space / folder / search change. Debounce search
  // input (300ms); space/folder changes fire immediately.
  useEffect(() => {
    if (!open || !state.currentSpace) return;
    const debounceMs = state.search && state.search.length > 0 ? SEARCH_DEBOUNCE_MS : 0;
    const space = state.currentSpace;
    const folder = state.currentFolder;
    const search = state.search;
    const handle = window.setTimeout(() => {
      loadFiles(space, folder, search);
    }, debounceMs);
    return () => {
      window.clearTimeout(handle);
    };
  }, [open, state.currentSpace, state.currentFolder, state.search, loadFiles]);

  const switchSpace = useCallback((space: CloudSpace) => {
    setState((s) =>
      s.currentSpace?.id === space.id
        ? s
        : {
            ...s,
            currentSpace: space,
            currentFolder: undefined,
            history: [],
            search: undefined,
            selected: undefined,
            error: null,
          },
    );
  }, []);

  const openFolder = useCallback((file: CloudFile) => {
    if (!file.isFolder) return;
    setState((s) => ({
      ...s,
      currentFolder: file,
      history: [...s.history, file],
      search: undefined,
      selected: undefined,
      error: null,
    }));
  }, []);

  const navigateUpTo = useCallback((folder: CloudFile | undefined) => {
    setState((s) => {
      if (!folder) {
        return {
          ...s,
          history: [],
          currentFolder: undefined,
          search: undefined,
          selected: undefined,
          error: null,
        };
      }
      const index = s.history.findIndex((f) => f.id === folder.id);
      if (index === -1) return s;
      return {
        ...s,
        history: s.history.slice(0, index + 1),
        currentFolder: folder,
        search: undefined,
        selected: undefined,
        error: null,
      };
    });
  }, []);

  const selectFile = useCallback(
    (file: CloudFile | undefined) => {
      if (file && validator && !validator.isFileEnabled(file)) return;
      setState((s) => ({ ...s, selected: file }));
    },
    [validator],
  );

  const setSearch = useCallback((search: string | undefined) => {
    setState((s) => ({ ...s, search }));
  }, []);

  const refresh = useCallback(() => {
    if (!state.currentSpace) return;
    loadFiles(state.currentSpace, state.currentFolder, state.search);
  }, [loadFiles, state.currentSpace, state.currentFolder, state.search]);

  const retry = useCallback(() => {
    if (!state.spaces) {
      loadSpaces();
      return;
    }
    if (state.currentSpace) {
      loadFiles(state.currentSpace, state.currentFolder, state.search);
    }
  }, [loadSpaces, loadFiles, state.spaces, state.currentSpace, state.currentFolder, state.search]);

  const createFolder = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!state.currentSpace || !trimmed) return;
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        await service.createFolder(state.currentSpace, trimmed, state.currentFolder?.id ?? null);
        loadFiles(state.currentSpace, state.currentFolder, state.search);
      } catch (err) {
        setState((s) => ({ ...s, loading: false, error: toError(err) }));
      }
    },
    [service, loadFiles, state.currentSpace, state.currentFolder, state.search],
  );

  const pick = useMemo(
    () => state.selected ?? state.currentFolder,
    [state.selected, state.currentFolder],
  );

  return {
    state,
    switchSpace,
    openFolder,
    navigateUpTo,
    selectFile,
    setSearch,
    refresh,
    retry,
    createFolder,
    reset,
    pick,
  };
}
