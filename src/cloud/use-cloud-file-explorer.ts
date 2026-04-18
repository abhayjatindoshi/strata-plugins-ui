import { useCallback, useEffect, useMemo, useState } from 'react';
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
};

export type CloudFileExplorerApi = {
  readonly state: CloudFileExplorerState;
  readonly switchSpace: (space: CloudSpace) => void;
  readonly openFolder: (file: CloudFile) => void;
  readonly navigateUpTo: (folder: CloudFile | undefined) => void;
  readonly selectFile: (file: CloudFile | undefined) => void;
  readonly setSearch: (search: string | undefined) => void;
  readonly refresh: () => void;
  readonly createFolder: (name: string) => Promise<void>;
  readonly reset: () => void;
  /** Resolved current pick — selection wins, otherwise the current folder. */
  readonly pick: CloudFile | undefined;
};

const INITIAL_STATE: CloudFileExplorerState = {
  spaces: undefined,
  currentSpace: undefined,
  files: undefined,
  currentFolder: undefined,
  history: [],
  selected: undefined,
  search: undefined,
  loading: false,
};

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
  const [state, setState] = useState<CloudFileExplorerState>(INITIAL_STATE);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  // Load spaces when the explorer opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setState(INITIAL_STATE);
    void service.getSpaces().then((spaces) => {
      if (cancelled) return;
      const visible = validator
        ? spaces.filter((s) => validator.isSpaceVisible(s))
        : [...spaces];
      setState((s) => ({
        ...s,
        spaces: visible,
        currentSpace: visible[0],
      }));
    });
    return () => {
      cancelled = true;
    };
  }, [open, service, validator]);

  const loadFiles = useCallback(
    async (
      space: CloudSpace,
      parentFolder: CloudFile | undefined,
      search: string | undefined,
    ) => {
      setState((s) => ({ ...s, loading: true }));
      try {
        const parentId = parentFolder?.isFolder ? parentFolder.id : undefined;
        const listing = await service.getListing(space, parentId, search);
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
      } catch {
        setState((s) => ({ ...s, files: [], selected: undefined, loading: false }));
      }
    },
    [service, validator],
  );

  // Load listing whenever space / folder / search change.
  useEffect(() => {
    if (!open || !state.currentSpace) return;
    void loadFiles(state.currentSpace, state.currentFolder, state.search);
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
    }));
  }, []);

  const navigateUpTo = useCallback((folder: CloudFile | undefined) => {
    setState((s) => {
      if (!folder) {
        return { ...s, history: [], currentFolder: undefined, search: undefined, selected: undefined };
      }
      const index = s.history.findIndex((f) => f.id === folder.id);
      if (index === -1) return s;
      return {
        ...s,
        history: s.history.slice(0, index + 1),
        currentFolder: folder,
        search: undefined,
        selected: undefined,
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
    void loadFiles(state.currentSpace, state.currentFolder, state.search);
  }, [loadFiles, state.currentSpace, state.currentFolder, state.search]);

  const createFolder = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!state.currentSpace || !trimmed) return;
      setState((s) => ({ ...s, loading: true }));
      try {
        await service.createFolder(state.currentSpace, trimmed, state.currentFolder?.id);
        await loadFiles(state.currentSpace, state.currentFolder, state.search);
      } finally {
        setState((s) => ({ ...s, loading: false }));
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
    createFolder,
    reset,
    pick,
  };
}
