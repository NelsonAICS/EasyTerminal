import { useMemo, useState } from 'react';
import { ArrowUp, CheckSquare, Clock3, Copy, File, FilePlus2, Folder, FolderPlus, PanelRightClose, RefreshCw, Search, Star, Trash2 } from 'lucide-react';
import { type FileEntry } from '../types/agent-extension';
import { UIBadge, UIButton, UIInput, UIPanel } from './ui';

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
  onDelete: (path: string) => void;
  onCopyPath: (path: string) => void;
  onToggleVisibility?: () => void;
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
  onDelete,
  onCopyPath,
  onToggleVisibility,
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

  const activeEntry = filteredFiles.find(file => file.path === activeFile) || files.find(file => file.path === activeFile) || null;
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
    <div className="h-full w-full border-l border-[var(--panel-border)] flex flex-col z-40 bg-[var(--panel-bg)] backdrop-blur-xl relative">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <div className="absolute top-0 left-0 w-full h-8 z-50 pointer-events-none" style={{ WebkitAppRegion: 'drag' } as any}></div>

      <div className="border-b border-[var(--panel-border)] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] tracking-[0.22em] text-[var(--text-secondary)]">文件系统</div>
            <div className="mt-1 text-lg font-semibold text-[var(--text-primary)] truncate">{currentDir.split('/').pop() || '/'}</div>
          </div>
          <div className="flex items-center gap-1">
            {onToggleVisibility && (
              <UIButton onClick={onToggleVisibility} tone="ghost" size="icon" className="text-[var(--text-secondary)]" title="隐藏文件栏">
                <PanelRightClose size={16} />
              </UIButton>
            )}
            <UIButton onClick={onGoUp} tone="ghost" size="icon" className="text-[var(--text-secondary)]" title="返回上一级">
              <ArrowUp size={16} />
            </UIButton>
            <UIButton onClick={onRefresh} tone="ghost" size="icon" className="text-[var(--text-secondary)]" title="刷新">
              <RefreshCw size={16} />
            </UIButton>
            <UIButton onClick={onCreateFile} tone="ghost" size="icon" className="text-[var(--text-secondary)]" title="新建文件">
              <FilePlus2 size={16} />
            </UIButton>
            <UIButton
              onClick={() => {
                const name = window.prompt('请输入文件夹名称');
                if (name?.trim()) onCreateFolder(name.trim());
              }}
              tone="ghost"
              size="icon"
              className="text-[var(--text-secondary)]"
              title="新建文件夹"
            >
              <FolderPlus size={16} />
            </UIButton>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2 text-[11px] text-[var(--text-secondary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] overflow-x-auto no-scrollbar">
          / {breadcrumbs.join(' / ') || currentDir}
        </div>

        <div className="mt-3 relative">
          <Search size={14} className="absolute left-3 top-2.5 text-[var(--text-secondary)]" />
          <UIInput
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="搜索文件、目录、扩展名"
            className="h-9 bg-[var(--surface-muted)] pl-9 pr-3 text-xs text-[var(--text-primary)]"
          />
        </div>

        <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
          <UIBadge className="bg-[var(--surface-muted)] text-[var(--text-secondary)] px-2.5 py-1">项目 {files.length}</UIBadge>
          <UIBadge className="bg-[var(--surface-muted)] text-[var(--text-secondary)] px-2.5 py-1">目录 {folderCount}</UIBadge>
          <UIBadge className="bg-[var(--surface-muted)] text-[var(--text-secondary)] px-2.5 py-1">已选 {selectedPaths.length}</UIBadge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {filteredFiles.map(file => {
          const isSelected = selectedPaths.includes(file.path);
          const isFavorite = favorites.includes(file.path);

          return (
            <div
              key={file.path}
              className={`group mb-2 flex items-start gap-3 rounded-2xl border px-4 py-3 cursor-pointer transition-colors ${
                activeFile === file.path
                  ? 'border-[var(--panel-border-glow)] bg-[var(--surface-muted)]'
                  : 'border-[var(--panel-border)] bg-transparent hover:bg-[var(--surface-muted)]/70'
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
                  <span className="truncate text-[12.5px] font-medium text-[var(--text-primary)]">{file.name}</span>
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

      <UIPanel className="rounded-none border-x-0 border-b-0 border-t border-[var(--panel-border)] bg-[var(--surface-strong)]/72 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] tracking-[0.18em] text-[var(--text-secondary)]">当前文件</div>
            <div className="mt-1 text-sm font-semibold text-[var(--text-primary)] truncate">{activeEntry?.name || '未选中文件'}</div>
          </div>
          {activeEntry && (
            <div className="flex items-center gap-2">
              <UIButton onClick={() => onCopyPath(activeEntry.path)} tone="neutral" size="sm" className="bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <Copy size={11} className="inline mr-1" />复制路径
              </UIButton>
              <UIButton onClick={() => onDelete(activeEntry.path)} tone="danger" size="sm" className="bg-red-500/12 text-red-300 hover:text-red-200">
                <Trash2 size={11} className="inline mr-1" />删除
              </UIButton>
            </div>
          )}
        </div>
        <div className="mt-2 space-y-1 text-[11px] text-[var(--text-secondary)]">
          <div>路径：{activeEntry?.path || currentDir}</div>
          <div>大小：{activeEntry?.isDirectory ? '--' : formatSize(activeEntry?.size)}</div>
          <div>修改：{activeEntry?.mtime ? new Date(activeEntry.mtime).toLocaleString() : '--'}</div>
          <div>收藏：{favorites.length}</div>
        </div>
      </UIPanel>
    </div>
  );
}
