import { useEffect, useMemo, useState } from 'react';
import { ClipboardPlus, Database, FileText, FolderKanban, Layers3, Search, Sparkles } from 'lucide-react';
import { type ContextArtifact, type ContextOverview } from '../types/agent-extension';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    require?: any;
  }
}

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

type ContextTab = 'all' | 'sessions' | 'snippets' | 'projects';

const formatSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const artifactIcon = (type: ContextArtifact['type']) => {
  if (type === 'session') return <Layers3 size={15} className="text-blue-300" />;
  if (type === 'snippet') return <Sparkles size={15} className="text-cyan-300" />;
  return <FolderKanban size={15} className="text-emerald-300" />;
};

const artifactLabel = (type: ContextArtifact['type']) => {
  if (type === 'session') return '会话';
  if (type === 'snippet') return '片段';
  return '项目';
};

export function ContextVaultPanel({
  onOpenFile,
  onInsertToInput,
}: {
  onOpenFile: (path: string) => void;
  onInsertToInput: (value: string) => void;
}) {
  const [overview, setOverview] = useState<ContextOverview | null>(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<ContextTab>('all');
  const [manualSnippet, setManualSnippet] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadOverview = async () => {
    if (!ipcRenderer) return;
    const result = await ipcRenderer.invoke('context:list');
    setOverview(result || null);
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const items = useMemo(() => {
    const source = overview
      ? [...overview.sessions, ...overview.snippets, ...overview.projects]
      : [];

    return source
      .filter(item => {
        if (tab !== 'all' && item.type !== tab.slice(0, -1)) return false;
        if (!query.trim()) return true;
        const normalized = query.trim().toLowerCase();
        return item.name.toLowerCase().includes(normalized) ||
          item.preview.toLowerCase().includes(normalized) ||
          item.tags.some(tag => tag.toLowerCase().includes(normalized));
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [overview, query, tab]);

  useEffect(() => {
    if (!items.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !items.some(item => item.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  const selectedItem = items.find(item => item.id === selectedId) || null;

  const saveSnippet = async () => {
    if (!ipcRenderer || !manualSnippet.trim()) return;
    await ipcRenderer.invoke('context:save-snippet', manualSnippet.trim(), 'ManualNote');
    setManualSnippet('');
    await loadOverview();
  };

  return (
    <div className="flex h-full min-w-0">
      <div className="w-[21rem] shrink-0 border-r border-white/10 bg-black/20 p-4">
        <div className="flex h-full flex-col gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">Context Vault</div>
            <h3 className="mt-2 text-lg font-semibold text-white">上下文保险箱</h3>
            <p className="mt-2 text-xs leading-5 text-white/45">
              把会话、片段和项目资产沉淀下来，给 Agent 和工作流做可搜索的长期记忆。
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">会话</div>
              <div className="mt-1 text-lg font-semibold text-white">{overview?.sessions.length || 0}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">片段</div>
              <div className="mt-1 text-lg font-semibold text-white">{overview?.snippets.length || 0}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">项目</div>
              <div className="mt-1 text-lg font-semibold text-white">{overview?.projects.length || 0}</div>
            </div>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-white/35" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="搜索标题、内容、标签"
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-cyan-400/40"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: '全部' },
              { id: 'sessions', label: '会话' },
              { id: 'snippets', label: '片段' },
              { id: 'projects', label: '项目' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setTab(item.id as ContextTab)}
                className={`rounded-full px-3 py-1 text-[11px] ${tab === item.id ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-white/45 hover:bg-white/10 hover:text-white'}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto space-y-2 pr-1">
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`w-full rounded-3xl border px-3 py-3 text-left transition-colors ${
                  selectedId === item.id ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  {artifactIcon(item.type)}
                  <span className="truncate text-sm font-semibold text-white">{item.name}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-white/40">
                  <span className="rounded-full bg-white/10 px-2 py-0.5">{artifactLabel(item.type)}</span>
                  <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                  <span>{formatSize(item.size)}</span>
                </div>
                <div className="mt-2 line-clamp-2 text-[11px] leading-5 text-white/45">
                  {item.preview || '暂无预览内容'}
                </div>
              </button>
            ))}

            {items.length === 0 && (
              <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">
                还没有匹配的上下文资产
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-xs text-white/70">
              <ClipboardPlus size={14} className="text-cyan-300" />
              <span>保存新片段</span>
            </div>
            <textarea
              value={manualSnippet}
              onChange={event => setManualSnippet(event.target.value)}
              rows={4}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400/40"
              placeholder="把这次决策、命令、链接或项目约束记下来..."
            />
            <button onClick={saveSnippet} className="mt-3 w-full rounded-2xl bg-cyan-500/20 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-500/30">
              保存到保险箱
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 overflow-y-auto p-4">
        {selectedItem ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {artifactIcon(selectedItem.type)}
                    <h3 className="truncate text-xl font-semibold text-white">{selectedItem.name}</h3>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] text-white/50">{artifactLabel(selectedItem.type)}</span>
                  </div>
                  <div className="mt-3 break-all text-xs leading-6 text-white/40">{selectedItem.path}</div>
                </div>
                <div className="shrink-0 text-right text-[11px] text-white/35">
                  <div>{new Date(selectedItem.updatedAt).toLocaleString()}</div>
                  <div className="mt-1">{formatSize(selectedItem.size)}</div>
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-black/15 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">内容预览</div>
                <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/70">
                  {selectedItem.preview || '暂无预览内容'}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {selectedItem.tags.map(tag => (
                  <span key={tag} className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-200">{tag}</span>
                ))}
                {selectedItem.tags.length === 0 && (
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/35">暂无标签</span>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button onClick={() => onOpenFile(selectedItem.path)} className="rounded-2xl bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/15">
                  <FileText size={13} className="mr-1 inline" />打开文件
                </button>
                <button onClick={() => onInsertToInput(`请参考上下文文件：${selectedItem.path}`)} className="rounded-2xl bg-cyan-500/20 px-4 py-2 text-xs text-cyan-200 hover:bg-cyan-500/30">
                  <Database size={13} className="mr-1 inline" />插入到输入框
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">使用建议</div>
                <div className="mt-3 space-y-2 text-sm leading-6 text-white/65">
                  <div>适合在 Agent 开始新任务前插入这份上下文，减少重复说明。</div>
                  <div>适合在工作流里作为前置参考资料，和 Prompt / 知识库节点搭配使用。</div>
                  <div>如果是项目资产，建议固定成可复用模板，避免上下文散落在对话里。</div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">资产摘要</div>
                <div className="mt-3 space-y-2 text-sm text-white/70">
                  <div>类型：{artifactLabel(selectedItem.type)}</div>
                  <div>大小：{formatSize(selectedItem.size)}</div>
                  <div>标签数：{selectedItem.tags.length}</div>
                  <div>更新时间：{new Date(selectedItem.updatedAt).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-[2rem] border border-dashed border-white/10 text-sm text-white/35">
            从左侧选择一条上下文资产开始查看
          </div>
        )}
      </div>
    </div>
  );
}
