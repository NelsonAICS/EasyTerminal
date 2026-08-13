import { useMemo, useState } from 'react';
import { ArrowUp, CheckSquare, Clock3, Copy, File, FilePlus2, Folder, FolderPlus, RefreshCw, Search, Star } from 'lucide-react';
import { type FileEntry } from '../types/agent-extension';
import { UIBadge, UIButton, UIInput } from './ui';

interface FileExplorerPanelProps {
  currentDir: string;
  files: FileEntry[];
  activeFile: string | null;
  selectedPaths: string[];
  onGoUp: () => void;
  onOpen: (entry: FileEntry) => void;
  onRefresh: () => void;
  onSelectPaths: (paths: string[]) => void;
  onCreateFile: () => void;
  onCreateFolder: (name: string) => void;
}

const formatSize = (size?: number) => {
  if (!size) return '--';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export function FileExplorerPanel({
  currentDir,
  files,
  activeFile,
  selectedPaths,
  onGoUp,
  onOpen,
  onRefresh,
  onSelectPaths,
  onCreateFile,
  onCreateFolder,
}: FileExplorerPanelProps) {
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);

  const filteredFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const source = normalizedQuery
      ? files.filter(file =>
          file.name.toLowerCase().includes(normalizedQuery) ||
          file.extension?.toLowerCase().includes(normalizedQuery),
        )
      : files;

    return [...source].sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [files, query]);

  const folderCount = files.filter(file => file.isDirectory).length;
  const breadcrumbs = currentDir.split('/').filter(Boolean);

  const toggleSelection = (path: string) => {
    if (selectedPaths.includes(path)) {
      onSelectPaths(selectedPaths.filter(item => item !== path));
      return;
    }
    onSelectPaths([...selectedPaths, path]);
  };

  return (
    <div className="relative z-40 flex h-full w-full flex-col bg-transparent">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <div className="absolute top-0 left-0 w-full h-8 z-50 pointer-events-none" style={{ WebkitAppRegion: 'drag' } as any}></div>

      <div className="border-b border-[color:color-mix(in_srgb,var(--panel-border)_56%,transparent)] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] tracking-[0.22em] text-[var(--text-secondary)]">文件系统</div>
            <div className="mt-2 truncate text-[1.55rem] font-semibold leading-tight text-[var(--text-primary)]">{currentDir.split('/').pop() || '/'}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <UIButton onClick={onGoUp} tone="ghost" size="icon" className="h-8 w-8 rounded-lg text-[var(--text-secondary)]" title="返回上一级">
              <ArrowUp size={15} />
            </UIButton>
            <UIButton onClick={onRefresh} tone="ghost" size="icon" className="h-8 w-8 rounded-lg text-[var(--text-secondary)]" title="刷新">
              <RefreshCw size={15} />
            </UIButton>
            <UIButton onClick={onCreateFile} tone="ghost" size="icon" className="h-8 w-8 rounded-lg text-[var(--text-secondary)]" title="新建文件">
              <FilePlus2 size={15} />
            </UIButton>
            <UIButton
              onClick={() => {
                const name = window.prompt('请输入文件夹名称');
                if (name?.trim()) onCreateFolder(name.trim());
              }}
              tone="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-[var(--text-secondary)]"
              title="新建文件夹"
            >
              <FolderPlus size={15} />
            </UIButton>
          </div>
        </div>

        <div className="shell-surface-soft mt-5 flex items-center gap-3 rounded-[1.25rem] border border-[var(--panel-border)] px-4 py-3 text-[11px] text-[var(--text-secondary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap no-scrollbar">
            / {breadcrumbs.join(' / ') || currentDir}
          </div>
          <UIButton
            onClick={() => void navigator.clipboard.writeText(currentDir)}
            tone="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 rounded-lg text-[var(--text-secondary)]"
            title="复制路径"
          >
            <Copy size={13} />
          </UIButton>
        </div>

        <div className="mt-4 relative">
          <Search size={14} className="absolute left-3 top-2.5 text-[var(--text-secondary)]" />
          <UIInput
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="搜索文件、目录、扩展名"
            className="h-9 pl-9 pr-3 text-xs"
          />
        </div>

        <div className="mt-4 flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
          <UIBadge className="shell-surface-soft px-2.5 py-1 text-[var(--text-secondary)]">项目 {files.length}</UIBadge>
          <UIBadge className="shell-surface-soft px-2.5 py-1 text-[var(--text-secondary)]">目录 {folderCount}</UIBadge>
          <UIBadge className="shell-surface-soft px-2.5 py-1 text-[var(--text-secondary)]">已选 {selectedPaths.length}</UIBadge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {filteredFiles.map(file => {
          const isSelected = selectedPaths.includes(file.path);
          const isFavorite = favorites.includes(file.path);

          return (
            <div
              key={file.path}
              className={`group mb-3 flex cursor-pointer items-start gap-3 rounded-[1.35rem] border px-4 py-3.5 transition-all ${
                activeFile === file.path
                  ? 'border-[var(--panel-border-glow)] bg-[color:color-mix(in_srgb,var(--surface-strong)_84%,transparent)] shadow-[0_18px_34px_-28px_var(--shadow-color)]'
                  : 'border-[var(--panel-border)] bg-[color:color-mix(in_srgb,var(--surface-strong)_48%,transparent)] hover:border-[var(--panel-border-glow)]/70 hover:bg-[color:color-mix(in_srgb,var(--surface-strong)_72%,transparent)]'
              }`}
              onClick={() => onOpen(file)}
            >
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  toggleSelection(file.path);
                }}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <CheckSquare size={14} className={isSelected ? 'text-[var(--accent)]' : ''} />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  {file.isDirectory
                    ? <Folder size={15} className="shrink-0 text-[var(--accent)]" />
                    : <File size={15} className="shrink-0 text-[var(--text-secondary)]" />}
                  <span className="truncate text-[14px] font-medium text-[var(--text-primary)]">{file.name}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-secondary)]">
                  <span>{file.isDirectory ? '文件夹' : (file.extension ? `${file.extension.toUpperCase()} 文件` : '文件')}</span>
                  <span>{file.isDirectory ? '--' : formatSize(file.size)}</span>
                  <span>{file.mtime ? new Date(file.mtime).toLocaleDateString() : '--'}</span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 pl-2">
                <div className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1 whitespace-nowrap">
                  <Clock3 size={11} className="shrink-0" />
                </div>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setFavorites(isFavorite ? favorites.filter(item => item !== file.path) : [...favorites, file.path]);
                  }}
                  className="text-[var(--text-secondary)] hover:text-yellow-300"
                >
                  <Star size={14} className={isFavorite ? 'fill-yellow-300 text-yellow-300' : ''} />
                </button>
              </div>
            </div>
          );
        })}

        {filteredFiles.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-[var(--text-secondary)]">
            没有匹配的文件
          </div>
        )}
      </div>
    </div>
  );
}
