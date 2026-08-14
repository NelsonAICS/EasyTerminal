import { Fragment, useMemo, useState } from 'react';
import { ArrowUp, ChevronDown, ChevronRight, Copy, File, FilePlus2, Folder, FolderPlus, RefreshCw, Search, Star } from 'lucide-react';
import { type FileEntry, type FileTreeEntry, type FileTreeState } from '../types/agent-extension';
import { flattenVisibleEntries, findTreeEntry } from '../lib/file-tree';
import { UIBadge, UIButton, UIInput } from './ui';

interface FileExplorerPanelProps {
  currentDir: string;
  tree: FileTreeState;
  activeFile: string | null;
  selectedPaths: string[];
  favoritePaths: string[];
  recentDirs: string[];
  onGoUp: () => void;
  onOpen: (entry: FileEntry) => void;
  onEnterDirectory: (path: string) => void;
  onToggleDirectory: (path: string) => void;
  onRetryDirectory: (path: string) => void;
  onRefresh: () => void;
  onSelectPaths: (paths: string[]) => void;
  onToggleFavorite: (path: string) => void;
  onOpenRecent: (path: string) => void;
  onCreateFile: () => void;
  onCreateFolder: (name: string) => void;
}

type ExplorerView = 'tree' | 'favorites' | 'recent';

const toFileEntry = (entry: FileTreeEntry): FileEntry => ({
  name: entry.name,
  isDirectory: entry.kind === 'directory',
  path: entry.path,
  size: entry.size,
  mtime: entry.mtime,
  extension: entry.extension,
});

const pathLabel = (path: string) => path.split(/[\\/]/).filter(Boolean).pop() || path || '/';

export function FileExplorerPanel({
  currentDir,
  tree,
  activeFile,
  selectedPaths,
  favoritePaths,
  recentDirs,
  onGoUp,
  onOpen,
  onEnterDirectory,
  onToggleDirectory,
  onRetryDirectory,
  onRefresh,
  onSelectPaths,
  onToggleFavorite,
  onOpenRecent,
  onCreateFile,
  onCreateFolder,
}: FileExplorerPanelProps) {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<ExplorerView>('tree');
  const rootDirectory = tree.directories[currentDir];
  const normalizedQuery = query.trim().toLowerCase();

  const visibleEntries = useMemo(() => {
    if (view === 'tree') {
      return flattenVisibleEntries(tree)
        .filter(item => !normalizedQuery || item.entry.name.toLowerCase().includes(normalizedQuery) || item.entry.extension?.toLowerCase().includes(normalizedQuery));
    }

    const paths = view === 'favorites' ? favoritePaths : recentDirs;
    return paths.map(path => ({
      depth: 0,
      entry: findTreeEntry(tree, path) || {
        name: pathLabel(path),
        path,
        kind: 'directory' as const,
      },
    })).filter(item => !normalizedQuery || item.entry.name.toLowerCase().includes(normalizedQuery));
  }, [tree, view, favoritePaths, recentDirs, normalizedQuery]);

  const rootEntries = rootDirectory?.entries || [];
  const folderCount = rootEntries.filter(file => file.kind === 'directory').length;

  const toggleSelection = (path: string) => {
    onSelectPaths(selectedPaths.includes(path)
      ? selectedPaths.filter(item => item !== path)
      : [...selectedPaths, path]);
  };

  const handleOpen = (entry: FileTreeEntry) => {
    if (entry.kind === 'directory') {
      if (view === 'recent') onOpenRecent(entry.path);
      else onEnterDirectory(entry.path);
      return;
    }
    onOpen(toFileEntry(entry));
  };

  return (
    <div className="relative z-40 flex h-full min-h-0 w-full flex-col bg-transparent">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <div className="pointer-events-none absolute left-0 top-0 z-50 h-8 w-full" style={{ WebkitAppRegion: 'drag' } as any}></div>

      <div className="shrink-0 border-b border-[var(--panel-border)] px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] tracking-[0.18em] text-[var(--text-secondary)]">文件系统</div>
            <div className="mt-1 truncate text-lg font-semibold text-[var(--text-primary)]" title={currentDir}>{pathLabel(currentDir)}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <UIButton onClick={onGoUp} tone="ghost" size="icon" className="h-8 w-8 rounded-lg" title="返回上一级"><ArrowUp size={14} /></UIButton>
            <UIButton onClick={onRefresh} tone="ghost" size="icon" className="h-8 w-8 rounded-lg" title="刷新当前目录"><RefreshCw size={14} className={rootDirectory?.loadState === 'loading' ? 'animate-spin' : ''} /></UIButton>
            <UIButton onClick={onCreateFile} tone="ghost" size="icon" className="h-8 w-8 rounded-lg" title="新建文件"><FilePlus2 size={14} /></UIButton>
            <UIButton
              onClick={() => {
                const name = window.prompt('请输入文件夹名称');
                if (name?.trim()) onCreateFolder(name.trim());
              }}
              tone="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              title="新建文件夹"
            >
              <FolderPlus size={14} />
            </UIButton>
          </div>
        </div>

        <div className="shell-surface-soft mt-2 flex items-center gap-2 rounded-xl border border-[var(--panel-border)] px-3 py-2 text-[10px] text-[var(--text-secondary)]">
          <div className="min-w-0 flex-1 truncate" title={currentDir}>{currentDir || '/'}</div>
          <UIButton
            onClick={() => void navigator.clipboard.writeText(currentDir)}
            tone="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 rounded-lg"
            title="复制路径"
          >
            <Copy size={12} />
          </UIButton>
        </div>

        <div className="relative mt-2">
          <Search size={13} className="absolute left-3 top-2.5 text-[var(--text-secondary)]" />
          <UIInput value={query} onChange={event => setQuery(event.target.value)} placeholder="筛选已加载目录" className="h-8 pl-8 pr-2 text-xs" />
        </div>

        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(['tree', 'favorites', 'recent'] as ExplorerView[]).map(item => (
            <button
              key={item}
              type="button"
              onClick={() => setView(item)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] transition-colors ${view === item ? 'border-[var(--accent)]/50 bg-[var(--accent)]/12 text-[var(--text-primary)]' : 'border-[var(--panel-border)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]'}`}
            >
              {item === 'tree' ? '目录树' : item === 'favorites' ? `收藏 ${favoritePaths.length}` : `最近 ${recentDirs.length}`}
            </button>
          ))}
          <UIBadge className="ml-auto shrink-0 px-2 py-1 text-[10px]">{rootEntries.length} 项 · {folderCount} 目录</UIBadge>
        </div>
      </div>

      <div className="scroll-panel min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {view === 'tree' && rootDirectory?.loadState === 'loading' && rootEntries.length === 0 && (
          <div className="px-2 py-8 text-center text-xs text-[var(--text-secondary)]">正在读取目录…</div>
        )}

        {view === 'tree' && rootDirectory?.loadState === 'error' && (
          <div className="mx-1 my-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-3 text-xs text-red-700 dark:text-red-200">
            <div className="font-medium">{rootDirectory.error?.code === 'ENOENT' ? '目录不存在' : rootDirectory.error?.code === 'EACCES' || rootDirectory.error?.code === 'EPERM' ? '没有读取权限' : '读取目录失败'}</div>
            <div className="mt-1 leading-5">{rootDirectory.error?.message || '无法读取当前目录。'}</div>
            <button type="button" onClick={() => onRetryDirectory(currentDir)} className="mt-2 rounded-lg border border-red-400/30 px-2 py-1 text-[11px] text-red-700 hover:bg-red-500/10 dark:text-red-200">重试</button>
          </div>
        )}

        {rootDirectory?.loadState === 'loaded' && rootEntries.length === 0 && view === 'tree' && !normalizedQuery && (
          <div className="px-2 py-8 text-center text-xs text-[var(--text-secondary)]">目录为空</div>
        )}

        {visibleEntries.map(({ entry, depth }) => {
          const isDirectory = entry.kind === 'directory';
          const isExpanded = tree.expandedPaths.includes(entry.path);
          const isSelected = selectedPaths.includes(entry.path);
          const isFavorite = favoritePaths.includes(entry.path);
          const childState = tree.directories[entry.path];

          return (
            <Fragment key={`${entry.path}:${depth}`}>
              <div className="group flex min-w-0 items-center gap-1 rounded-lg px-1 py-1 hover:bg-[var(--surface-muted)]" style={{ paddingLeft: `${depth * 14 + 4}px` }}>
              {isDirectory ? (
                <button
                  type="button"
                  onClick={() => onToggleDirectory(entry.path)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-strong)] hover:text-[var(--text-primary)]"
                  title={isExpanded ? '折叠目录' : '展开目录'}
                >
                  {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
              ) : <span className="h-6 w-6 shrink-0" />}

              <button
                type="button"
                onClick={() => toggleSelection(entry.path)}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] ${isSelected ? 'text-[var(--accent)]' : ''}`}
                title={isSelected ? '取消选择' : '选择'}
              >
                <span className={`h-3.5 w-3.5 rounded border ${isSelected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--panel-border)]'}`} />
              </button>

              <button
                type="button"
                onDoubleClick={() => handleOpen(entry)}
                onClick={() => undefined}
                className={`flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 text-left ${activeFile === entry.path ? 'bg-[var(--accent)]/10' : ''}`}
                title={entry.path}
              >
                {isDirectory ? <Folder size={15} className="shrink-0 text-[var(--accent)]" /> : <File size={15} className="shrink-0 text-[var(--text-secondary)]" />}
                <span className="min-w-0 flex-1 truncate text-xs text-[var(--text-primary)]">{entry.name}</span>
                {isDirectory && childState?.loadState === 'loading' && <RefreshCw size={11} className="shrink-0 animate-spin text-[var(--text-secondary)]" />}
                {isDirectory && childState?.loadState === 'error' && <span className="shrink-0 text-[11px] text-red-600 dark:text-red-300" title={childState.error?.message || '读取目录失败'}>!</span>}
                {entry.kind === 'symlink' && <span className="shrink-0 text-[10px] text-[var(--text-secondary)]">链接</span>}
              </button>

              <button
                type="button"
                onClick={() => onToggleFavorite(entry.path)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[var(--text-secondary)] opacity-60 hover:bg-[var(--surface-strong)] hover:text-amber-600 group-hover:opacity-100 dark:hover:text-amber-300"
                title={isFavorite ? '取消收藏' : '收藏'}
              >
                <Star size={13} className={isFavorite ? 'fill-amber-400 text-amber-500' : ''} />
              </button>
              </div>
              {isDirectory && isExpanded && childState?.loadState === 'loaded' && childState.entries.length === 0 && (
                <div className="py-1 text-[10px] italic text-[var(--text-secondary)]" style={{ paddingLeft: `${(depth + 1) * 14 + 42}px` }}>目录为空</div>
              )}
              {isDirectory && isExpanded && childState?.loadState === 'error' && (
                <div className="flex items-center gap-2 py-1 text-[10px] text-red-600 dark:text-red-300" style={{ paddingLeft: `${(depth + 1) * 14 + 42}px` }}>
                  <span className="truncate">{childState.error?.code === 'EACCES' || childState.error?.code === 'EPERM' ? '没有读取权限' : childState.error?.code === 'ENOENT' ? '目录不存在' : '读取失败'}</span>
                  <button type="button" onClick={() => onRetryDirectory(entry.path)} className="shrink-0 underline underline-offset-2">重试</button>
                </div>
              )}
            </Fragment>
          );
        })}

        {visibleEntries.length === 0 && (view !== 'tree' || rootDirectory?.loadState !== 'loaded' || normalizedQuery) && (
          <div className="px-2 py-8 text-center text-xs text-[var(--text-secondary)]">{view === 'favorites' ? '还没有收藏路径' : view === 'recent' ? '还没有最近目录' : '没有匹配的已加载项目'}</div>
        )}
      </div>

      <div className="shrink-0 border-t border-[var(--panel-border)] px-3 py-2 text-[10px] text-[var(--text-secondary)]">
        双击目录进入，箭头逐级加载；双击文件打开。{rootDirectory?.loadState === 'error' ? ' 当前目录可重试。' : ''}
      </div>
    </div>
  );
}
