import { useMemo, useState, type DragEvent } from 'react'
import { Braces, Bot, FileInput, Search, Terminal, Workflow } from 'lucide-react'
import type { PublishedNodeDefinition } from '../../../../electron/services/workflow-v2/node-definition'

interface NodeLibraryProps { definitions: PublishedNodeDefinition[] }

export function NodeLibrary({ definitions }: NodeLibraryProps) {
  const [query, setQuery] = useState('')

  const dragStart = (event: DragEvent, definition: PublishedNodeDefinition) => {
    event.dataTransfer.setData('application/workflow-node', JSON.stringify({ type: definition.type, version: definition.version }))
    event.dataTransfer.effectAllowed = 'copy'
  }

  const grouped = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const filtered = definitions.filter((definition) => !normalized || `${definition.type} ${definition.executorKind}`.toLowerCase().includes(normalized))
    return filtered.reduce<Record<string, PublishedNodeDefinition[]>>((groups, definition) => {
      const key = definition.executorKind.toLowerCase().includes('llm') || definition.executorKind.toLowerCase().includes('model')
        ? '模型'
        : definition.executorKind.toLowerCase().includes('sql') || definition.executorKind.toLowerCase().includes('shell')
          ? '执行'
          : definition.type.startsWith('input')
            ? '输入'
            : definition.type.startsWith('output')
              ? '输出'
              : '处理'
      if (!groups[key]) groups[key] = []
      groups[key].push(definition)
      return groups
    }, {})
  }, [definitions, query])

  const groupIcon = (group: string) => group === '模型' ? <Bot size={14} /> : group === '执行' ? <Terminal size={14} /> : group === '输入' ? <FileInput size={14} /> : group === '输出' ? <Workflow size={14} /> : <Braces size={14} />
  const riskLabel = (risk: PublishedNodeDefinition['risk']) => risk === 'safe' ? '安全' : risk === 'network' ? '网络' : risk === 'write' ? '写入' : '系统'

  return <aside className="w-60 shrink-0 overflow-y-auto border-r border-[var(--panel-border)] bg-[color:color-mix(in_srgb,var(--surface-muted)_32%,transparent)] px-3 py-4">
    <div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-semibold text-[var(--text-primary)]">节点库</h3><p className="mt-1 text-[10px] text-[var(--text-secondary)]">拖入画布开始搭建</p></div><span className="rounded-full bg-[var(--surface-strong)] px-2 py-1 text-[10px] text-[var(--text-secondary)]">{definitions.length}</span></div>
    <label className="relative block"><Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索节点" aria-label="搜索节点" className="h-9 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-strong)] pl-9 pr-3 text-xs text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] focus:border-[var(--panel-border-glow)]" /></label>
    <div className="mt-4 space-y-4">{Object.entries(grouped).map(([group, items]) => <section key={group}><div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">{groupIcon(group)}<span>{group}</span></div><div className="space-y-1.5">{items.map((definition) => <div key={`${definition.type}@${definition.version}`} draggable onDragStart={(event) => dragStart(event, definition)} className="group cursor-grab rounded-lg border border-transparent bg-[color:color-mix(in_srgb,var(--surface-strong)_70%,transparent)] px-3 py-2.5 transition-colors hover:border-[var(--panel-border)] hover:bg-[var(--surface-strong)] active:cursor-grabbing"><div className="flex items-center justify-between gap-2"><div className="truncate text-xs font-medium text-[var(--text-primary)]">{definition.type}</div><span className="shrink-0 text-[9px] text-[var(--text-secondary)]">v{definition.version}</span></div><div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-[var(--text-secondary)]"><span className="truncate">{definition.executorKind}</span><span className={`shrink-0 rounded px-1.5 py-0.5 ${definition.risk === 'safe' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-300'}`}>{riskLabel(definition.risk)}</span></div></div>)}</div></section>)}{Object.keys(grouped).length === 0 && <div className="rounded-lg border border-dashed border-[var(--panel-border)] p-3 text-center text-[10px] text-[var(--text-secondary)]">没有匹配的节点</div>}</div>
  </aside>
}
