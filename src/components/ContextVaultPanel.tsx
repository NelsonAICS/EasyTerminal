import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ClipboardPlus,
  Database,
  Download,
  FolderKanban,
  Layers3,
  RefreshCw,
  ScrollText,
  Search,
  Sparkles,
  TerminalSquare,
  Upload,
  Wand2,
  X,
} from 'lucide-react';

import {
  type ContextArtifact,
  type ContextOverview,
  type ContextPacket,
  type ContextSnapshot,
  type DriftCheckResult,
  type MemoryRecord,
  type SessionEvent,
} from '../types/agent-extension';
import { UIBadge, UIButton, UIInput, UIPanel, UISectionKicker, UITextarea } from './ui';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    require?: any;
  }
}

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

type VaultView = 'assets' | 'records' | 'snapshots' | 'events';

type VaultItem =
  | { id: string; view: 'assets'; label: string; searchText: string; artifact: ContextArtifact }
  | { id: string; view: 'records'; label: string; searchText: string; record: MemoryRecord }
  | { id: string; view: 'snapshots'; label: string; searchText: string; snapshot: ContextSnapshot }
  | { id: string; view: 'events'; label: string; searchText: string; event: SessionEvent };

interface AnalysisState {
  mode: 'packet' | 'compact';
  title: string;
  summary: string;
  body: string;
  meta: string[];
}

type VaultAction = 'save' | 'analyze' | 'compact' | 'import' | 'export' | 'refresh';

interface VaultActionState {
  phase: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
}

type ImportPreview = {
  filePath: string;
  counts: Record<string, number>;
  payload: Record<string, unknown>;
};

const INITIAL_ACTION_STATES: Record<VaultAction, VaultActionState> = {
  save: { phase: 'idle' },
  analyze: { phase: 'idle' },
  compact: { phase: 'idle' },
  import: { phase: 'idle' },
  export: { phase: 'idle' },
  refresh: { phase: 'idle' },
};

const ACTION_LABELS: Record<VaultAction, string> = {
  save: '保存',
  analyze: '分析',
  compact: '压缩',
  import: '导入',
  export: '导出',
  refresh: '刷新',
};

const VIEW_LABELS: Record<VaultView, string> = {
  assets: '资产文件',
  records: '结构化记录',
  snapshots: '压缩快照',
  events: '会话事件',
};

const VIEW_DESCRIPTIONS: Record<VaultView, string> = {
  assets: '项目文件、PDF、代码等原始资产',
  records: '手动保存的决策、约束、链接、笔记',
  snapshots: '上下文包的压缩版本，方便复用',
  events: 'Agent 操作、工具调用、会话轨迹',
};

// Parse analysis body into structured sections
function parseAnalysisBody(body: string): { label: string; content: string; isEmpty: boolean }[] {
  return body.split(/^---\n$/m).map(section => {
    const firstNewline = section.indexOf('\n')
    if (firstNewline === -1) return { label: section.trim(), content: '', isEmpty: !section.trim() }
    const label = section.slice(0, firstNewline).trim()
    const content = section.slice(firstNewline + 1).trim()
    const isEmpty = content === '（空）' || content === '未发现明显漂移' || !content
    return { label, content, isEmpty }
  }).filter(s => s.label)
}

// Try to parse and format JSON, fallback to raw string
function formatPayload(payload: string): string {
  try {
    const parsed = JSON.parse(payload)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return payload
  }
}

// Check if payload looks like JSON
function isJsonPayload(payload: string): boolean {
  const trimmed = payload.trim()
  return (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))
}

const trimText = (value: string, max = 120) => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
};

const formatSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const artifactIcon = (type: ContextArtifact['type']) => {
  if (type === 'session') return <Layers3 size={14} className="text-sky-300" />;
  if (type === 'snippet') return <Sparkles size={14} className="text-cyan-300" />;
  return <FolderKanban size={14} className="text-emerald-300" />;
};

const artifactLabel = (type: ContextArtifact['type']) => {
  if (type === 'session') return '会话';
  if (type === 'snippet') return '片段';
  return '项目';
};

const recordTone = (kind: MemoryRecord['kind']) => {
  if (kind === 'goal') return 'success' as const;
  if (kind === 'constraint') return 'danger' as const;
  if (kind === 'decision') return 'info' as const;
  return 'neutral' as const;
};

const eventBadgeClass = (eventType: SessionEvent['event_type']) => {
  if (eventType === 'tool_call' || eventType === 'tool_result') return 'text-sky-200 bg-sky-500/12 border-sky-400/12';
  if (eventType === 'assistant_reply') return 'text-violet-200 bg-violet-500/12 border-violet-400/12';
  if (eventType === 'manual_capture') return 'text-cyan-100 bg-cyan-500/12 border-cyan-400/12';
  return 'text-white/70 bg-white/6 border-[var(--panel-border)]';
};

function buildPacketAnalysis(packet: ContextPacket): AnalysisState {
  return {
    mode: 'packet',
    title: '上下文包分析',
    summary: '已根据当前项目文档、结构化记录和检索结果生成一份适合直接注入 Agent 的上下文包。',
    body: [
      `Anchor\n${packet.anchorBlock || '（空）'}`,
      `Working\n${packet.workingBlock || '（空）'}`,
      `Episodic\n${packet.episodicBlock || '（空）'}`,
      packet.retrievalBlock ? `Retrieval\n${packet.retrievalBlock}` : '',
      packet.styleBlock ? `Style\n${packet.styleBlock}` : '',
    ].filter(Boolean).join('\n\n---\n\n'),
    meta: [
      `上下文 token ${packet.tokenBudget.usedByContext}`,
      `总预算 ${packet.tokenBudget.total}`,
      `引用 ${packet.refs.length}`,
    ],
  };
}

function buildCompactAnalysis(result: { snapshot: ContextSnapshot; driftCheck?: DriftCheckResult }): AnalysisState {
  const conflicts = result.driftCheck?.conflicts || [];
  return {
    mode: 'compact',
    title: `压缩完成 · 快照 v${result.snapshot.version}`,
    summary: result.driftCheck?.aligned
      ? '已经生成新的压缩快照，并通过一致性检查。'
      : '已经生成新的压缩快照，但发现潜在漂移，请优先检查冲突项。',
    body: [
      result.snapshot.summary_block,
      conflicts.length
        ? `冲突项\n${conflicts.map(conflict => `- [${conflict.type}] ${conflict.message}`).join('\n')}`
        : '冲突项\n- 未发现明显漂移',
    ].join('\n\n---\n\n'),
    meta: [
      `状态 ${result.snapshot.status}`,
      `漂移分数 ${result.snapshot.drift_score.toFixed(2)}`,
      `token 估算 ${result.snapshot.token_estimate}`,
    ],
  };
}

export function ContextVaultPanel({
  activeSessionId,
  onOpenFile,
  onInsertToInput,
}: {
  activeSessionId?: string;
  onOpenFile: (path: string) => void;
  onInsertToInput: (value: string) => void;
}) {
  const [overview, setOverview] = useState<ContextOverview | null>(null);
  const [records, setRecords] = useState<MemoryRecord[]>([]);
  const [snapshots, setSnapshots] = useState<ContextSnapshot[]>([]);
  const [recentEvents, setRecentEvents] = useState<SessionEvent[]>([]);
  const [view, setView] = useState<VaultView>('records');
  const [query, setQuery] = useState('');
  const [manualSnippet, setManualSnippet] = useState('');
  const [analysisQuery, setAnalysisQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [actionStates, setActionStates] = useState<Record<VaultAction, VaultActionState>>(INITIAL_ACTION_STATES);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const resultListRef = useRef<HTMLDivElement | null>(null);
  const resultButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const setActionState = (action: VaultAction, next: VaultActionState) => {
    setActionStates(previous => ({ ...previous, [action]: next }));
  };

  const actionIsBusy = (action: VaultAction) => actionStates[action].phase === 'loading';

  const actionMessageClass = (phase: VaultActionState['phase']) => {
    if (phase === 'error') return 'border-red-400/25 bg-red-500/10 text-red-700 dark:text-red-200';
    if (phase === 'success') return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200';
    return 'border-[var(--panel-border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]';
  };

  const loadOverview = async () => {
    if (!ipcRenderer) return;
    const [assetResult, recordResult, snapshotResult, eventResult] = await Promise.all([
      ipcRenderer.invoke('context:list'),
      ipcRenderer.invoke('context:records', { limit: 120 }),
      ipcRenderer.invoke('context:snapshots', { limit: 60 }),
      ipcRenderer.invoke('context:recent-events', 100),
    ]);
    setOverview(assetResult || null);
    setRecords((recordResult || []) as MemoryRecord[]);
    setSnapshots((snapshotResult || []) as ContextSnapshot[]);
    setRecentEvents((eventResult || []) as SessionEvent[]);
  };

  useEffect(() => {
    void loadOverview().catch(error => {
      setActionState('refresh', { phase: 'error', message: error instanceof Error ? error.message : '读取上下文数据失败。' });
    });
  }, []);

  const items = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const assetItems: VaultItem[] = overview
      ? [...overview.sessions, ...overview.snippets, ...overview.projects].map(artifact => ({
          id: `asset:${artifact.id}`,
          view: 'assets' as const,
          label: artifact.name,
          searchText: `${artifact.name} ${artifact.preview} ${artifact.tags.join(' ')}`.toLowerCase(),
          artifact,
        }))
      : [];

    const recordItems: VaultItem[] = records.map(record => ({
      id: `record:${record.id}`,
      view: 'records',
      label: record.title,
      searchText: `${record.title} ${record.summary} ${record.details || ''} ${record.kind} ${record.scope}`.toLowerCase(),
      record,
    }));

    const snapshotItems: VaultItem[] = snapshots.map(snapshot => ({
      id: `snapshot:${snapshot.id}`,
      view: 'snapshots',
      label: `上下文快照 v${snapshot.version}`,
      searchText: `${snapshot.summary_block} ${snapshot.status} ${snapshot.session_id} ${snapshot.task_id}`.toLowerCase(),
      snapshot,
    }));

    const eventItems: VaultItem[] = recentEvents.map(event => ({
      id: `event:${event.id}`,
      view: 'events',
      label: event.event_type,
      searchText: `${event.event_type} ${event.session_id} ${event.payload}`.toLowerCase(),
      event,
    }));

    const source = view === 'assets'
      ? assetItems
      : view === 'records'
        ? recordItems
        : view === 'snapshots'
          ? snapshotItems
          : eventItems;

    return source
      .filter(item => !normalized || item.searchText.includes(normalized))
      .sort((a, b) => {
        if (a.view === 'assets' && b.view === 'assets') return b.artifact.updatedAt.localeCompare(a.artifact.updatedAt);
        if (a.view === 'records' && b.view === 'records') return b.record.updated_at.localeCompare(a.record.updated_at);
        if (a.view === 'snapshots' && b.view === 'snapshots') return b.snapshot.updated_at.localeCompare(a.snapshot.updated_at);
        if (a.view === 'events' && b.view === 'events') return b.event.created_at.localeCompare(a.event.created_at);
        return a.label.localeCompare(b.label);
      });
  }, [overview, query, records, recentEvents, snapshots, view]);

  const selectedItem = items.find(item => item.id === selectedId) || null;
  const assetCount = overview ? overview.sessions.length + overview.snippets.length + overview.projects.length : 0;

  useEffect(() => {
    if (!selectedItem && !analysis) {
      setDetailOpen(false);
      return;
    }
    setDetailOpen(true);
  }, [selectedItem, analysis]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && detailOpen) {
        event.preventDefault();
        setDetailOpen(false);
        setSelectedId(null);
        setAnalysis(null);
        lastFocusedElementRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [detailOpen]);

  const saveSnippet = async () => {
    if (!ipcRenderer || !manualSnippet.trim()) return;
    setActionState('save', { phase: 'loading', message: '正在保存…' });
    try {
      const result = await ipcRenderer.invoke('context:save-snippet', manualSnippet.trim(), 'ManualNote');
      if (!result) throw new Error('保存接口未返回成功结果。');
      setManualSnippet('');
      await loadOverview();
      setActionState('save', { phase: 'success', message: '已保存新的上下文片段。' });
    } catch (error) {
      setActionState('save', { phase: 'error', message: error instanceof Error ? error.message : '保存失败，原输入已保留。' });
    }
  };

  const exportContext = async () => {
    if (!ipcRenderer) return;
    setActionState('export', { phase: 'loading', message: '正在导出…' });
    try {
      const result = await ipcRenderer.invoke('context:export-json') as { success?: boolean; canceled?: boolean; filePath?: string; error?: string };
      if (result?.success) {
        setActionState('export', { phase: 'success', message: `已导出 JSON：${result.filePath || '文件'}` });
      } else if (!result?.canceled) {
        throw new Error(result?.error || '导出失败，请稍后再试。');
      } else {
        setActionState('export', { phase: 'idle' });
      }
    } catch (error) {
      setActionState('export', { phase: 'error', message: error instanceof Error ? error.message : '导出失败。' });
    }
  };

  const importContext = async () => {
    if (!ipcRenderer) return;
    setActionState('import', { phase: 'loading', message: '正在校验导入文件…' });
    try {
      const result = await ipcRenderer.invoke('context:import-preview') as { success?: boolean; canceled?: boolean; filePath?: string; counts?: Record<string, number>; payload?: Record<string, unknown>; error?: string };
      if (result?.success) {
        setImportPreview({ filePath: result.filePath || '', counts: result.counts || {}, payload: result.payload || {} });
        setActionState('import', { phase: 'success', message: '文件已通过校验，请确认导入范围。' });
      } else if (!result?.canceled) {
        throw new Error(result?.error || '导入失败，请检查 JSON 内容。');
      } else {
        setActionState('import', { phase: 'idle' });
      }
    } catch (error) {
      setActionState('import', { phase: 'error', message: error instanceof Error ? error.message : '导入失败，原数据保持不变。' });
    }
  };

  const confirmImport = async () => {
    if (!ipcRenderer || !importPreview) return;
    setActionState('import', { phase: 'loading', message: '正在写入导入数据…' });
    try {
      const result = await ipcRenderer.invoke('context:import-confirm', importPreview.payload) as { success?: boolean; counts?: Record<string, number>; error?: string };
      if (!result?.success) throw new Error(result?.error || '导入失败，原数据保持不变。');
      const counts = result.counts || importPreview.counts;
      setImportPreview(null);
      await loadOverview();
      setActionState('import', { phase: 'success', message: `已导入：记录 ${counts.records || 0} 条、快照 ${counts.snapshots || 0} 条、事件 ${counts.events || 0} 条、片段 ${counts.snippets || 0} 条。` });
    } catch (error) {
      setActionState('import', { phase: 'error', message: error instanceof Error ? error.message : '导入失败，原数据保持不变。' });
    }
  };

  const analyzeContextPacket = async () => {
    if (!ipcRenderer) return;
    setActionState('analyze', { phase: 'loading', message: '正在生成上下文包…' });
    try {
      const packet = await ipcRenderer.invoke('context:build-packet', {
        sessionId: activeSessionId,
        query: analysisQuery.trim() || query.trim() || '当前上下文分析',
      });
      setAnalysis(buildPacketAnalysis(packet as ContextPacket));
      setActionState('analyze', { phase: 'success', message: '已生成新的上下文包。' });
    } catch (error) {
      setActionState('analyze', { phase: 'error', message: error instanceof Error ? error.message : '分析失败，原数据保持不变。' });
    }
  };

  const compactContext = async () => {
    if (!ipcRenderer) return;
    setActionState('compact', { phase: 'loading', message: '正在压缩上下文…' });
    try {
      const result = await ipcRenderer.invoke('context:compact', {
        sessionId: activeSessionId,
        query: analysisQuery.trim() || query.trim() || '当前上下文压缩',
      });
      setAnalysis(buildCompactAnalysis(result as { snapshot: ContextSnapshot; driftCheck?: DriftCheckResult }));
      await loadOverview();
      setView('snapshots');
      setActionState('compact', { phase: 'success', message: '已生成新的压缩快照。' });
    } catch (error) {
      setActionState('compact', { phase: 'error', message: error instanceof Error ? error.message : '压缩失败，原数据保持不变。' });
    }
  };

  const refreshOverview = async () => {
    setActionState('refresh', { phase: 'loading', message: '正在刷新数据…' });
    try {
      await loadOverview();
      setActionState('refresh', { phase: 'success', message: '数据已刷新。' });
    } catch (error) {
      setActionState('refresh', { phase: 'error', message: error instanceof Error ? error.message : '刷新失败，原数据保持不变。' });
    }
  };

  return (
    <div className="context-vault-panel relative flex h-full min-h-0 min-w-0 overflow-hidden">
      <aside className="flex min-h-0 w-[19rem] shrink-0 flex-col border-r border-[var(--panel-border)] bg-[var(--surface-muted)]/55 p-4">
        <div className="flex min-h-0 h-full flex-col gap-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <UIInput
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="搜索上下文"
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(VIEW_LABELS) as VaultView[]).map(item => (
              <UIButton
                key={item}
                size="sm"
                tone={view === item ? 'primary' : 'ghost'}
                className={view === item ? 'bg-blue-600 text-white hover:bg-blue-500' : ''}
                onClick={() => {
                  setView(item);
                  setSelectedId(null);
                }}
              >
                {VIEW_LABELS[item]}
              </UIButton>
            ))}
          </div>
          <p className="shrink-0 text-[11px] text-[var(--text-secondary)]">{VIEW_DESCRIPTIONS[view]}</p>

          <div className="scroll-panel min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">

          <UIPanel className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <ClipboardPlus size={15} className="text-cyan-300" />
              <span>保存上下文</span>
            </div>
            <UITextarea
              rows={5}
              value={manualSnippet}
              onChange={event => setManualSnippet(event.target.value)}
              placeholder="把决策、约束、链接或笔记直接存起来..."
              onKeyDown={event => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                  event.preventDefault()
                  if (manualSnippet.trim() && !actionIsBusy('save')) void saveSnippet()
                }
              }}
            />
            <UIButton onClick={() => void saveSnippet()} tone="primary" disabled={!manualSnippet.trim() || actionIsBusy('save')} className="w-full bg-blue-600 text-white hover:bg-blue-500 text-xs py-1.5">
              保存片段 <kbd className="ml-1.5 rounded bg-black/25 px-1.5 py-0.5 font-mono text-[10px] normal-case">Ctrl+↵</kbd>
            </UIButton>
          </UIPanel>

          <UIPanel className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Wand2 size={15} className="text-violet-300" />
              <span>分析与压缩</span>
            </div>
            <UIInput
              value={analysisQuery}
              onChange={event => setAnalysisQuery(event.target.value)}
              placeholder="可选：填写当前分析目标"
            />
            <div className="grid gap-2">
              <UIButton onClick={() => void analyzeContextPacket()} tone="neutral" disabled={actionIsBusy('analyze')}>
                生成上下文包
              </UIButton>
              <UIButton onClick={() => void compactContext()} tone="neutral" disabled={actionIsBusy('compact')}>
                压缩为快照
              </UIButton>
            </div>
          </UIPanel>

          <UIPanel className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Database size={15} className="text-emerald-300" />
              <span>导入与导出</span>
            </div>
            <div className="grid gap-2">
              <UIButton onClick={() => void importContext()} tone="ghost" disabled={actionIsBusy('import')}>
                <Upload size={14} />
                导入 JSON
              </UIButton>
              <UIButton onClick={() => void exportContext()} tone="ghost" disabled={actionIsBusy('export')}>
                <Download size={14} />
                导出 JSON
              </UIButton>
              <UIButton onClick={() => void refreshOverview()} tone="ghost" disabled={actionIsBusy('refresh')}>
                <RefreshCw size={14} className={actionIsBusy('refresh') ? 'animate-spin' : ''} />
                刷新数据
              </UIButton>
            </div>
          </UIPanel>

            {Object.entries(actionStates).filter(([, state]) => state.message).map(([key, state]) => (
              <div key={key} className={`rounded-2xl border px-3 py-3 text-xs leading-5 ${actionMessageClass(state.phase)}`}>
                <span className="font-medium">{ACTION_LABELS[key as VaultAction]}：</span>{state.message}
              </div>
            ))}
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col border-r border-[var(--panel-border)]">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--panel-border)] px-5 py-4">
            <div>
              <UISectionKicker>{VIEW_LABELS[view]}</UISectionKicker>
              <div className="mt-1 text-sm text-white/72">共 {items.length} 条结果</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <UIBadge>资产 {assetCount}</UIBadge>
              <UIBadge>记录 {records.length}</UIBadge>
              <UIBadge>快照 {snapshots.length}</UIBadge>
              <UIBadge>事件 {recentEvents.length}</UIBadge>
            </div>
          </div>

          <div
            ref={resultListRef}
            className="scroll-panel min-h-0 flex-1 overflow-y-auto"
            onKeyDown={event => {
              if (!items.length || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return;
              event.preventDefault();
              const currentIndex = selectedId ? items.findIndex(item => item.id === selectedId) : -1;
              const nextIndex = event.key === 'ArrowDown'
                ? Math.min(items.length - 1, currentIndex + 1)
                : Math.max(0, currentIndex === -1 ? items.length - 1 : currentIndex - 1);
              const next = items[nextIndex];
              if (!next) return;
              setSelectedId(next.id);
              setDetailOpen(true);
              resultButtonRefs.current[next.id]?.focus();
            }}
          >
            {items.map(item => (
              <button
                key={item.id}
                ref={element => { resultButtonRefs.current[item.id] = element; }}
                onClick={() => {
                  lastFocusedElementRef.current = document.activeElement as HTMLElement | null;
                  setSelectedId(prev => prev === item.id ? null : item.id);
                  setDetailOpen(true);
                }}
                className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-[var(--panel-border)] px-5 py-4 text-left transition-colors ${
                  selectedId === item.id ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'
                }`}
              >
                <div className="min-w-0">
                  {item.view === 'assets' && (
                    <>
                      <div className="flex items-center gap-2">
                        {artifactIcon(item.artifact.type)}
                        <span className="truncate text-sm font-medium text-white">{item.artifact.name}</span>
                      </div>
                      <div className="mt-2 text-xs leading-6 text-white/45">{trimText(item.artifact.preview || '暂无预览', 140)}</div>
                    </>
                  )}

                  {item.view === 'records' && (
                    <>
                      <div className="flex items-center gap-2">
                        <ScrollText size={14} className="text-sky-300" />
                        <span className="truncate text-sm font-medium text-white">{item.record.title}</span>
                      </div>
                      <div className="mt-2 text-xs leading-6 text-white/45">{trimText(item.record.summary, 140)}</div>
                    </>
                  )}

                  {item.view === 'snapshots' && (
                    <>
                      <div className="flex items-center gap-2">
                        <Database size={14} className="text-cyan-300" />
                        <span className="truncate text-sm font-medium text-white">上下文快照 v{item.snapshot.version}</span>
                      </div>
                      <div className="mt-2 text-xs leading-6 text-white/45">{trimText(item.snapshot.summary_block, 140)}</div>
                    </>
                  )}

                  {item.view === 'events' && (
                    <>
                      <div className="flex items-center gap-2">
                        <TerminalSquare size={14} className="text-violet-300" />
                        <span className="truncate text-sm font-medium text-white">{item.event.event_type}</span>
                      </div>
                      <div className="mt-2 text-xs leading-6 text-white/45">{trimText(isJsonPayload(item.event.payload) ? formatPayload(item.event.payload) : item.event.payload, 140)}</div>
                    </>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 text-xs text-white/42">
                  {item.view === 'assets' && (
                    <>
                      <UIBadge>{artifactLabel(item.artifact.type)}</UIBadge>
                      <span>{formatSize(item.artifact.size)}</span>
                    </>
                  )}
                  {item.view === 'records' && (
                    <>
                      <UIBadge tone={recordTone(item.record.kind)}>{item.record.kind}</UIBadge>
                      <span>{item.record.scope}</span>
                    </>
                  )}
                  {item.view === 'snapshots' && (
                    <>
                      <UIBadge>{item.snapshot.status}</UIBadge>
                      <span>drift {item.snapshot.drift_score.toFixed(2)}</span>
                    </>
                  )}
                  {item.view === 'events' && (
                    <>
                      <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] ${eventBadgeClass(item.event.event_type)}`}>
                        {item.event.event_type}
                      </span>
                      <span>{new Date(item.event.created_at).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </button>
            ))}

            {items.length === 0 && (
              <div className="px-6 py-16 text-center text-sm text-white/35">
                当前视图里还没有匹配的上下文内容。
              </div>
            )}
          </div>
        </section>

        {detailOpen && (
        <aside className="absolute inset-y-0 right-0 z-20 flex min-h-0 w-[min(23rem,calc(100%-1rem))] flex-col overflow-y-auto border-l border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 shadow-2xl xl:relative xl:inset-auto xl:z-auto xl:w-[22rem] xl:shrink-0 xl:bg-[var(--surface-muted)]/35 xl:shadow-none">
          {analysis && (
            <UIPanel className="mb-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <UISectionKicker>{analysis.mode === 'packet' ? '上下文分析' : '压缩结果'}</UISectionKicker>
                  <h3 className="mt-2 text-lg font-semibold text-white">{analysis.title}</h3>
                </div>
                <UIButton tone="ghost" size="icon" onClick={() => { setAnalysis(null); if (!selectedItem) setDetailOpen(false); }}>
                  <X size={14} />
                </UIButton>
              </div>
              <p className="mt-2 text-sm leading-6 text-white/50">{analysis.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {analysis.meta.map(item => (
                  <UIBadge key={item}>{item}</UIBadge>
                ))}
              </div>
              <div className="mt-4 max-h-[17rem] space-y-3 overflow-y-auto">
                {parseAnalysisBody(analysis.body).map((section, idx) => (
                  <div key={idx}>
                    <div className={`text-[11px] font-medium uppercase tracking-wider ${section.isEmpty ? 'text-white/25' : 'text-cyan-300/70'}`}>
                      {section.label}
                    </div>
                    <div className={`mt-1 text-sm leading-5 whitespace-pre-wrap break-words ${section.isEmpty ? 'text-white/20 italic' : 'text-white/65'}`}>
                      {section.content || '（空）'}
                    </div>
                    {idx < parseAnalysisBody(analysis.body).length - 1 && (
                      <div className="mt-3 border-t border-[var(--panel-border)]" />
                    )}
                  </div>
                ))}
              </div>
              <UIButton onClick={() => onInsertToInput(analysis.body)} tone="neutral" className="mt-4 w-full">
                插入到输入框
              </UIButton>
            </UIPanel>
          )}

          <UIPanel className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <UISectionKicker>详情</UISectionKicker>
                <h3 className="mt-2 text-lg font-semibold text-white">详情面板</h3>
              </div>
              {selectedItem && (
                <UIButton tone="ghost" size="icon" onClick={() => { setSelectedId(null); setDetailOpen(Boolean(analysis)); lastFocusedElementRef.current?.focus(); }}>
                  <X size={14} />
                </UIButton>
              )}
            </div>

            {!selectedItem ? (
              <div className="mt-4 text-sm leading-6 text-white/45">
                从左侧选择一条数据后，这里会显示详情和操作。关闭详情只会回到列表，不会退出整个上下文页面。
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {selectedItem.view === 'assets' && (
                  <>
                    <div className="flex items-center gap-2">
                      {artifactIcon(selectedItem.artifact.type)}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white">{selectedItem.artifact.name}</div>
                        <div className="mt-1 text-xs text-white/40">{artifactLabel(selectedItem.artifact.type)}</div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[var(--panel-border)] bg-black/20 p-4 text-xs leading-6 text-white/58 break-all">
                      {selectedItem.artifact.path}
                    </div>
                    <div className="rounded-2xl border border-[var(--panel-border)] bg-black/20 p-4 text-sm leading-6 text-white/72">
                      {selectedItem.artifact.preview || '暂无预览'}
                    </div>
                    <div className="grid gap-2">
                      <UIButton onClick={() => onOpenFile(selectedItem.artifact.path)} tone="neutral">打开文件</UIButton>
                      <UIButton onClick={() => onInsertToInput(`请参考上下文文件：${selectedItem.artifact.path}`)} tone="neutral">插入引用</UIButton>
                    </div>
                  </>
                )}

                {selectedItem.view === 'records' && (
                  <>
                    <div className="flex items-center gap-2">
                      <ScrollText size={15} className="text-sky-300" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white">{selectedItem.record.title}</div>
                        <div className="mt-1 flex gap-2">
                          <UIBadge tone={recordTone(selectedItem.record.kind)}>{selectedItem.record.kind}</UIBadge>
                          <UIBadge>{selectedItem.record.scope}</UIBadge>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[var(--panel-border)] bg-black/20 p-4 text-sm leading-6 text-white/72">
                      {selectedItem.record.summary}
                    </div>
                    {selectedItem.record.details && (
                      <div className="rounded-2xl border border-[var(--panel-border)] bg-black/20 p-4 text-xs leading-6 text-white/58 whitespace-pre-wrap break-words">
                        {selectedItem.record.details}
                      </div>
                    )}
                    <div className="grid gap-2">
                      <UIButton onClick={() => onInsertToInput(selectedItem.record.summary)} tone="neutral">插入摘要</UIButton>
                      {selectedItem.record.source_ref && (
                        <UIButton onClick={() => onOpenFile(selectedItem.record.source_ref)} tone="neutral">打开来源</UIButton>
                      )}
                    </div>
                  </>
                )}

                {selectedItem.view === 'snapshots' && (
                  <>
                    <div className="flex items-center gap-2">
                      <Database size={15} className="text-cyan-300" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white">上下文快照 v{selectedItem.snapshot.version}</div>
                        <div className="mt-1 flex gap-2">
                          <UIBadge>{selectedItem.snapshot.status}</UIBadge>
                          <UIBadge>drift {selectedItem.snapshot.drift_score.toFixed(2)}</UIBadge>
                        </div>
                      </div>
                    </div>
                    <div className="max-h-[16rem] overflow-y-auto rounded-2xl border border-[var(--panel-border)] bg-black/20 p-4 text-sm leading-6 text-white/72 whitespace-pre-wrap break-words">
                      {selectedItem.snapshot.summary_block}
                    </div>
                    <UIButton onClick={() => onInsertToInput(selectedItem.snapshot.summary_block)} tone="neutral" className="w-full">
                      插入快照
                    </UIButton>
                  </>
                )}

                {selectedItem.view === 'events' && (
                  <>
                    <div className="flex items-center gap-2">
                      <TerminalSquare size={15} className="text-violet-300" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white">{selectedItem.event.event_type}</div>
                        <div className="mt-1 text-xs text-white/40">{selectedItem.event.session_id}</div>
                      </div>
                    </div>
                    <div className="max-h-[16rem] overflow-y-auto rounded-2xl border border-[var(--panel-border)] bg-black/20 p-4">
                      {isJsonPayload(selectedItem.event.payload) ? (
                        <pre className="text-xs leading-5 text-sky-200 whitespace-pre-wrap break-words">{formatPayload(selectedItem.event.payload)}</pre>
                      ) : (
                        <div className="text-sm leading-6 text-white/72 whitespace-pre-wrap break-words">{selectedItem.event.payload}</div>
                      )}
                    </div>
                    <UIButton onClick={() => onInsertToInput(selectedItem.event.payload)} tone="neutral" className="w-full">
                      插入事件内容
                    </UIButton>
                  </>
                )}
              </div>
            )}
          </UIPanel>
        </aside>
        )}
      </div>

      {importPreview && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <UISectionKicker>导入预览</UISectionKicker>
                <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">确认写入上下文数据</h3>
              </div>
              <UIButton tone="ghost" size="icon" onClick={() => { setImportPreview(null); setActionState('import', { phase: 'idle' }); }}><X size={14} /></UIButton>
            </div>
            <p className="mt-3 break-all text-xs leading-5 text-[var(--text-secondary)]">{importPreview.filePath}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {Object.entries(importPreview.counts).map(([key, count]) => (
                <div key={key} className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2 text-[var(--text-secondary)]">
                  {key}：<span className="font-medium text-[var(--text-primary)]">{count}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-[var(--text-secondary)]">导入会追加到现有数据，不会覆盖当前输入；确认前不会写入数据库。</p>
            <div className="mt-5 flex justify-end gap-2">
              <UIButton tone="ghost" onClick={() => { setImportPreview(null); setActionState('import', { phase: 'idle' }); }}>取消</UIButton>
              <UIButton tone="primary" onClick={() => void confirmImport()} disabled={actionIsBusy('import')}>{actionIsBusy('import') ? '导入中…' : '确认导入'}</UIButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
