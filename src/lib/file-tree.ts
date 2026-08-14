import type {
  FileTreeDirectoryState,
  FileTreeEntry,
  FileTreeState,
  ListDirectoryResult,
} from '../types/agent-extension';

export interface VisibleFileTreeEntry {
  entry: FileTreeEntry;
  depth: number;
}

export function createFileTreeState(rootPath: string): FileTreeState {
  return {
    rootPath,
    directories: {
      [rootPath]: {
        path: rootPath,
        entries: [],
        loadState: 'idle',
      },
    },
    expandedPaths: [],
  };
}

export function beginDirectoryLoad(
  state: FileTreeState,
  path: string,
  requestId: string,
): FileTreeState {
  const previous = state.directories[path];
  const nextDirectory: FileTreeDirectoryState = {
    path,
    entries: previous?.entries || [],
    loadState: 'loading',
    requestId,
    ...(previous?.error ? { error: previous.error } : {}),
  };

  return {
    ...state,
    directories: {
      ...state.directories,
      [path]: nextDirectory,
    },
  };
}

export function applyDirectoryResult(
  state: FileTreeState,
  result: ListDirectoryResult,
): FileTreeState {
  const current = state.directories[result.path];
  // A retry or a quick switch may leave an older response in flight. Only the
  // response belonging to the latest request for this directory is accepted.
  if (!current || current.requestId !== result.requestId) return state;

  const nextDirectory: FileTreeDirectoryState = result.ok
    ? {
        path: result.path,
        entries: result.entries,
        loadState: 'loaded',
        requestId: result.requestId,
      }
    : {
        path: result.path,
        entries: current.entries,
        loadState: 'error',
        requestId: result.requestId,
        error: result.error,
      };

  return {
    ...state,
    directories: {
      ...state.directories,
      [result.path]: nextDirectory,
    },
  };
}

export function toggleDirectory(state: FileTreeState, path: string): FileTreeState {
  const expanded = new Set(state.expandedPaths);
  if (expanded.has(path)) expanded.delete(path);
  else expanded.add(path);
  return { ...state, expandedPaths: [...expanded] };
}

export function setTreeRoot(state: FileTreeState, rootPath: string): FileTreeState {
  if (state.rootPath === rootPath) return state;
  return {
    ...state,
    rootPath,
    directories: state.directories[rootPath]
      ? state.directories
      : {
          ...state.directories,
          [rootPath]: {
            path: rootPath,
            entries: [],
            loadState: 'idle',
          },
        },
  };
}

export function flattenVisibleEntries(state: FileTreeState): VisibleFileTreeEntry[] {
  const visible: VisibleFileTreeEntry[] = [];
  const expanded = new Set(state.expandedPaths);

  const visit = (directoryPath: string, depth: number) => {
    const directory = state.directories[directoryPath];
    if (!directory) return;

    const entries = [...directory.entries].sort((a, b) => {
      const aDirectory = a.kind === 'directory';
      const bDirectory = b.kind === 'directory';
      if (aDirectory !== bDirectory) return aDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      visible.push({ entry, depth });
      if (entry.kind === 'directory' && expanded.has(entry.path)) {
        visit(entry.path, depth + 1);
      }
    }
  };

  visit(state.rootPath, 0);
  return visible;
}

export function findTreeEntry(state: FileTreeState, path: string): FileTreeEntry | undefined {
  for (const directory of Object.values(state.directories)) {
    const entry = directory.entries.find(item => item.path === path);
    if (entry) return entry;
  }
  return undefined;
}
