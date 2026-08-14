// CapabilityPanel — Visual interface for browsing and managing registered capabilities

import { useState, useEffect, useCallback } from 'react';
import { Search, Zap, BookOpen, Workflow, Database, Layers, Monitor, Play, ChevronRight, Shield, MemoryStick, Info } from 'lucide-react';
import type { CapabilityDefinition, CapabilityKind, CapabilityInvokeResult } from '../types/capability';

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

const KIND_CONFIG: Record<CapabilityKind, { icon: typeof Zap; label: string; color: string; bgColor: string }> = {
  prompt: { icon: Zap, label: '提示词', color: 'text-blue-400', bgColor: 'bg-blue-500/15' },
  skill: { icon: BookOpen, label: '技能', color: 'text-cyan-400', bgColor: 'bg-cyan-500/15' },
  workflow: { icon: Workflow, label: '工作流', color: 'text-purple-400', bgColor: 'bg-purple-500/15' },
  knowledge: { icon: Database, label: '知识库', color: 'text-green-400', bgColor: 'bg-green-500/15' },
  context: { icon: MemoryStick, label: '上下文', color: 'text-amber-400', bgColor: 'bg-amber-500/15' },
  ui: { icon: Monitor, label: 'UI', color: 'text-rose-400', bgColor: 'bg-rose-500/15' },
};

const ALL_KINDS: CapabilityKind[] = ['prompt', 'skill', 'workflow', 'knowledge', 'context', 'ui'];

interface InvokeState {
  capabilityId: string;
  loading: boolean;
  result: CapabilityInvokeResult | null;
}

export function CapabilityPanel() {
  const [capabilities, setCapabilities] = useState<CapabilityDefinition[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeKinds, setActiveKinds] = useState<Set<CapabilityKind>>(new Set(ALL_KINDS));
  const [invokeState, setInvokeState] = useState<InvokeState | null>(null);

  const loadCapabilities = useCallback(async () => {
    if (!ipcRenderer) return;
    const kinds = activeKinds.size < ALL_KINDS.length ? Array.from(activeKinds) : undefined;
    const data = await ipcRenderer.invoke('capability:list', searchQuery || undefined, kinds);
    setCapabilities(data || []);
  }, [searchQuery, activeKinds]);

  useEffect(() => { void Promise.resolve().then(() => loadCapabilities()); }, [loadCapabilities]);

  const selected = capabilities.find(c => c.id === selectedId) || null;

  const toggleKind = (kind: CapabilityKind) => {
    setActiveKinds(prev => {
      const next = new Set(prev);
      if (next.has(kind)) {
        if (next.size > 1) next.delete(kind);
      } else {
        next.add(kind);
      }
      return next;
    });
  };

  const handleInvoke = async (cap: CapabilityDefinition) => {
    if (!ipcRenderer) return;
    setInvokeState({ capabilityId: cap.id, loading: true, result: null });

    // For UI capabilities, show info instead of actual invocation
    if (cap.kind === 'ui') {
      setInvokeState({
        capabilityId: cap.id,
        loading: false,
        result: {
          capabilityId: cap.id,
          success: true,
          data: 'UI 能力由 Agent 在运行时自动触发，无需手动执行。',
        },
      });
      return;
    }

    try {
      const result = await ipcRenderer.invoke('capability:invoke', cap.id, {});
      setInvokeState({ capabilityId: cap.id, loading: false, result: result as CapabilityInvokeResult });
    } catch (err: unknown) {
      setInvokeState({
        capabilityId: cap.id,
        loading: false,
        result: {
          capabilityId: cap.id,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        },
      });
    }
  };

  const selectedKindConfig = selected ? KIND_CONFIG[selected.kind] : null;

  return (
    <div className="flex h-full">
      {/* Left: Capability List */}
      <div className="w-80 border-r border-[var(--panel-border)] flex flex-col shrink-0">
        {/* Search */}
        <div className="p-3 border-b border-[var(--panel-border)]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-[var(--text-secondary)]" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索能力..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--surface-muted)] border border-[var(--panel-border)] text-[var(--text-primary)] text-xs focus:border-[var(--accent)]/50 focus:outline-none placeholder:text-[var(--text-secondary)]"
            />
          </div>
        </div>

        {/* Kind Filter Chips */}
        <div className="px-3 py-2 border-b border-[var(--panel-border)] flex flex-wrap gap-1.5">
          {ALL_KINDS.map(kind => {
            const config = KIND_CONFIG[kind];
            const active = activeKinds.has(kind);
            return (
              <button
                key={kind}
                onClick={() => toggleKind(kind)}
                className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors ${active ? config.bgColor + ' ' + config.color : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]'}`}
              >
                <config.icon size={10} />
                {config.label}
              </button>
            );
          })}
        </div>

        {/* Capability List */}
        <div className="flex-1 overflow-y-auto">
          {capabilities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-secondary)] text-xs">
              <Info size={20} className="mb-2 opacity-40" />
              暂无匹配的能力
            </div>
          ) : (
            <div className="p-1">
              {capabilities.map(cap => {
                const config = KIND_CONFIG[cap.kind];
                const isSelected = cap.id === selectedId;
                return (
                  <div
                    key={cap.id}
                    onClick={() => { setSelectedId(cap.id); setInvokeState(null); }}
                    className={`px-3 py-2.5 rounded-lg cursor-pointer transition-colors mb-0.5 ${isSelected ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/30' : 'hover:bg-[var(--surface-muted)]'}`}
                  >
                    <div className="flex items-center gap-2">
                      <config.icon size={13} className={config.color + ' shrink-0'} />
                      <span className="text-xs font-medium text-[var(--text-primary)] truncate">{cap.title}</span>
                      {isSelected && <ChevronRight size={12} className="text-[var(--accent)] shrink-0 ml-auto" />}
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 ml-5 line-clamp-2 leading-relaxed">
                      {cap.description}
                    </p>
                    {cap.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 ml-5 flex-wrap">
                        {cap.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer: count */}
        <div className="px-3 py-2 border-t border-[var(--panel-border)] text-[10px] text-[var(--text-secondary)]">
          共 {capabilities.length} 项能力
        </div>
      </div>

      {/* Right: Capability Detail */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)]">
            <Layers size={32} className="mb-3 opacity-30" />
            <span className="text-xs">选择一个能力查看详情</span>
          </div>
        ) : (
          <div className="p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${selectedKindConfig?.bgColor} flex items-center justify-center`}>
                  {(() => {
                    const Icon = selectedKindConfig?.icon;
                    return Icon ? <Icon size={20} className={selectedKindConfig?.color} /> : null;
                  })()}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">{selected.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${selectedKindConfig?.bgColor} ${selectedKindConfig?.color}`}>
                      {selectedKindConfig?.label}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono">{selected.id}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleInvoke(selected)}
                disabled={invokeState?.capabilityId === selected.id && invokeState.loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-medium hover:bg-[var(--accent)]/80 transition-colors disabled:opacity-50"
              >
                <Play size={12} />
                {invokeState?.capabilityId === selected.id && invokeState.loading ? '执行中...' : '执行'}
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-5">{selected.description}</p>

            {/* Tags */}
            {selected.tags.length > 0 && (
              <div className="mb-5">
                <h4 className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-2">标签</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selected.tags.map(tag => (
                    <span key={tag} className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--surface-muted)] text-[var(--text-primary)]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Input Schema */}
            {Object.keys(selected.inputSchema).length > 0 && (
              <div className="mb-5">
                <h4 className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
                  <ChevronRight size={11} /> 输入参数
                </h4>
                <div className="bg-[var(--surface-muted)] rounded-xl p-3">
                  {Object.entries(selected.inputSchema).map(([key, value]) => {
                    const prop = value as Record<string, unknown>;
                    const schema = selected.inputSchema as Record<string, unknown>;
                    const required = Array.isArray(schema.required) ? schema.required as string[] : [];
                    const isRequired = required.includes(key);
                    return (
                      <div key={key} className="flex items-start gap-2 py-1.5 border-b border-[var(--panel-border)] last:border-0">
                        <code className="text-[11px] font-mono text-[var(--accent)] shrink-0">{key}</code>
                        {isRequired && <span className="text-[9px] px-1 rounded bg-red-500/15 text-red-400">必填</span>}
                        <span className="text-[11px] text-[var(--text-secondary)] font-mono">{String(prop.type || 'any')}</span>
                        {(prop.description as string) && (
                          <span className="text-[11px] text-[var(--text-secondary)]">— {String(prop.description)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Output Schema */}
            <div className="mb-5">
              <h4 className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
                <ChevronRight size={11} /> 输出类型
              </h4>
              <div className="bg-[var(--surface-muted)] rounded-xl p-3">
                <code className="text-[11px] font-mono text-[var(--accent)]">
                  {selected.outputSchema?.type
                    ? String(selected.outputSchema.type)
                    : typeof selected.outputSchema === 'string'
                      ? selected.outputSchema
                      : 'any'}
                </code>
              </div>
            </div>

            {/* Memory Policy */}
            <div className="mb-5">
              <h4 className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
                <MemoryStick size={11} /> 记忆策略
              </h4>
              <div className="bg-[var(--surface-muted)] rounded-xl p-3 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${selected.memoryPolicy.captureInput ? 'bg-green-400' : 'bg-white/20'}`} />
                  <span className="text-[11px] text-[var(--text-primary)]">捕获输入</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${selected.memoryPolicy.captureOutput ? 'bg-green-400' : 'bg-white/20'}`} />
                  <span className="text-[11px] text-[var(--text-primary)]">捕获输出</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${selected.memoryPolicy.summarizeOutput ? 'bg-amber-400' : 'bg-white/20'}`} />
                  <span className="text-[11px] text-[var(--text-primary)]">摘要输出</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--text-secondary)]">作用域:</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--panel-border)] text-[var(--text-primary)]">
                    {selected.memoryPolicy.defaultScope}
                  </span>
                </div>
              </div>
            </div>

            {/* Entrypoint */}
            <div className="mb-5">
              <h4 className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
                <Zap size={11} /> 入口点
              </h4>
              <div className="bg-[var(--surface-muted)] rounded-xl p-3 flex items-center gap-3">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)]/15 text-[var(--accent)] uppercase font-medium">
                  {selected.entrypoint?.type || 'local-js'}
                </span>
                <code className="text-[11px] font-mono text-[var(--text-primary)]">
                  {selected.entrypoint?.target || selected.id}
                </code>
              </div>
            </div>

            {/* Permissions */}
            {selected.permissions.length > 0 && (
              <div className="mb-5">
                <h4 className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
                  <Shield size={11} /> 权限
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selected.permissions.map(p => (
                    <span key={p} className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--surface-muted)] text-[var(--text-primary)]">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Execution Result */}
            {invokeState && invokeState.capabilityId === selected.id && (
              <div>
                <h4 className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  执行结果
                </h4>
                <div className={`rounded-xl p-3 text-xs ${invokeState.result?.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  {invokeState.result?.success ? (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <span className="text-green-400 font-medium">执行成功</span>
                      </div>
                      <pre className="mt-2 text-[var(--text-primary)] whitespace-pre-wrap break-all max-h-48 overflow-y-auto font-mono leading-relaxed">
                        {typeof invokeState.result.data === 'object'
                          ? JSON.stringify(invokeState.result.data, null, 2)
                          : String(invokeState.result.data ?? '无返回数据')}
                      </pre>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-2 h-2 rounded-full bg-red-400" />
                        <span className="text-red-400 font-medium">执行失败</span>
                      </div>
                      <p className="mt-1 text-[var(--text-secondary)]">{invokeState.result?.error}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
