import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Loader2, Plus, RefreshCw, X } from 'lucide-react'
import type { PublishedNodeDefinition } from '../../../electron/services/workflow-v2/node-definition'
import type { WorkflowDefinitionDTO } from './domain/types'
import { WorkflowEditor } from './editor/WorkflowEditor'
import { RunDrawer } from './editor/RunDrawer'
import './workflow-v2.css'

interface WorkflowSummary {
  id: string
  name: string
  description: string
  latestRevision: number
  status: string
  createdAt: string
  updatedAt: string
}

interface WorkflowV2PanelProps {
  onClose?: () => void
}

const emptyWorkflow = (id: string): WorkflowDefinitionDTO => ({
  id,
  name: '新工作流',
  schemaVersion: 1,
  revision: 1,
  nodes: [],
  edges: [],
  settings: { maxConcurrency: 4, defaultNodeTimeoutMs: 30_000 },
})

function getApi() {
  if (!window.electronAPI?.workflowV2) throw new Error('工作流运行时尚未连接，请重启应用后重试')
  return window.electronAPI.workflowV2
}

export function WorkflowV2Panel({ onClose }: WorkflowV2PanelProps) {
  const [summaries, setSummaries] = useState<WorkflowSummary[]>([])
  const [definitions, setDefinitions] = useState<PublishedNodeDefinition[]>([])
  const [selected, setSelected] = useState<WorkflowDefinitionDTO | null>(null)
  const [runInput, setRunInput] = useState('{\n  "query": ""\n}')
  const [runId, setRunId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (preferredId?: string) => {
    setLoading(true)
    setError(null)
    try {
      const api = getApi()
      const [summaryResult, definitionResult] = await Promise.all([api.list(), api.listDefinitions()])
      const nextSummaries = (summaryResult ?? []) as WorkflowSummary[]
      setSummaries(nextSummaries)
      setDefinitions((definitionResult ?? []) as PublishedNodeDefinition[])
      const nextId = preferredId ?? nextSummaries[0]?.id
      if (nextId) setSelected(await api.get(nextId) as WorkflowDefinitionDTO)
      else setSelected(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '工作流加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const create = async () => {
    const workflow = emptyWorkflow(`workflow-${Date.now().toString(36)}`)
    try {
      setSaving(true)
      const saved = await getApi().saveRevision(workflow) as WorkflowDefinitionDTO
      setSelected(saved)
      await load(saved.id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '工作流创建失败')
    } finally {
      setSaving(false)
    }
  }

  const save = async (workflow: WorkflowDefinitionDTO) => {
    try {
      setSaving(true)
      const latest = await getApi().get(workflow.id) as WorkflowDefinitionDTO
      const next = { ...workflow, revision: latest.revision + 1 }
      const saved = await getApi().saveRevision(next) as WorkflowDefinitionDTO
      setSelected(saved)
      await load(saved.id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '工作流保存失败')
    } finally {
      setSaving(false)
    }
  }

  const run = async (workflow: WorkflowDefinitionDTO) => {
    try {
      const parsed = JSON.parse(runInput) as unknown
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('运行输入必须是 JSON 对象')
      const result = await getApi().execute({ workflowId: workflow.id, revision: workflow.revision, input: parsed })
      setRunId(result.runId)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '工作流启动失败')
    }
  }

  if (loading) return <div className="flex h-full items-center justify-center text-sm text-[var(--text-secondary)]"><Loader2 className="mr-2 animate-spin" size={16} />加载工作流…</div>

  return <div className="workflow-v2-panel flex h-full min-h-0 flex-col bg-[var(--panel-bg)] text-[var(--text-primary)]">
    <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-[var(--panel-border)] bg-[color:color-mix(in_srgb,var(--surface-muted)_42%,transparent)] px-6">
      <div className="min-w-0"><div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">WORKFLOW STUDIO</div><h2 className="mt-1 truncate text-lg font-semibold tracking-tight">可视化工作流</h2></div>
      <div className="flex shrink-0 items-center gap-2">
        <button onClick={() => void load(selected?.id)} className="icon-button" title="刷新工作流" aria-label="刷新工作流"><RefreshCw size={15} /></button>
        <button onClick={() => void create()} disabled={saving} className="primary-button"><Plus size={14} />新建工作流</button>
        {onClose && <button onClick={onClose} className="icon-button" title="关闭工作流工作台" aria-label="关闭工作流工作台"><X size={16} /></button>}
      </div>
    </header>
    {error && <div className="flex shrink-0 items-center gap-2 border-b border-red-400/20 bg-red-500/10 px-5 py-2 text-xs text-red-200"><AlertCircle size={14} />{error}</div>}
    <div className="flex min-h-0 flex-1">
      <aside className="workflow-list w-[17rem] shrink-0 overflow-y-auto border-r border-[var(--panel-border)] bg-[color:color-mix(in_srgb,var(--surface-muted)_42%,transparent)] px-4 py-5">
        <div className="mb-4 flex items-end justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">我的工作流</div><p className="mt-1 text-[11px] text-[var(--text-secondary)]">选择一个流程继续编辑</p></div><span className="rounded-full bg-[var(--surface-strong)] px-2 py-1 text-[10px] text-[var(--text-secondary)]">{summaries.length}</span></div>
        <div className="space-y-2">
          {summaries.map((item) => <button key={item.id} onClick={() => void load(item.id)} className={`workflow-list-item ${selected?.id === item.id ? 'is-selected' : ''}`}><div className="flex min-w-0 items-center justify-between gap-2"><div className="truncate text-sm font-medium">{item.name}</div><span className="shrink-0 text-[10px] text-[var(--text-secondary)]">v{item.latestRevision}</span></div><div className="mt-1 truncate font-mono text-[10px] text-[var(--text-secondary)]">{item.id}</div></button>)}
          {summaries.length === 0 && <p className="rounded-xl border border-dashed border-[var(--panel-border)] p-4 text-xs leading-5 text-[var(--text-secondary)]">还没有工作流。点击右上角“新建工作流”开始。</p>}
        </div>
      </aside>
      {selected ? <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden p-5">
        <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-[var(--panel-border)] pb-4">
          <div className="min-w-0 flex-1"><input value={selected.name} onChange={(event) => setSelected({ ...selected, name: event.target.value })} className="w-full max-w-lg border-b border-transparent bg-transparent text-xl font-semibold tracking-tight outline-none transition-colors focus:border-[var(--accent)]" aria-label="工作流名称" /><div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[var(--text-secondary)]"><span className="font-mono">{selected.id}</span><span>·</span><span>修订 {selected.revision}</span><span>·</span><span>拖拽节点并连接端口构建执行链</span></div></div>
          <label className="flex shrink-0 items-center gap-2 text-[10px] text-[var(--text-secondary)]"><span>运行输入 JSON</span><input value={runInput} onChange={(event) => setRunInput(event.target.value)} className="h-10 w-[min(19rem,28vw)] rounded-xl border border-[var(--panel-border)] bg-[var(--surface-strong)] px-3 font-mono text-[10px] text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--panel-border-glow)]" aria-label="运行输入 JSON" /></label>
        </div>
        <div className="min-h-0 flex-1"><WorkflowEditor workflow={selected} definitions={definitions} onSave={save} onRun={run} /></div>
        <div className="mt-3 flex shrink-0 items-center justify-between gap-3 text-[10px] text-[var(--text-secondary)]"><span>手动运行 · 运行输入必须是 JSON 对象</span><span>SQL / Shell 等副作用节点会在运行面板中请求确认</span></div>
        <RunDrawer key={runId ?? 'empty'} runId={runId} onClose={() => setRunId(null)} />
      </main> : <div className="flex flex-1 items-center justify-center text-sm text-[var(--text-secondary)]">选择或新建一个工作流</div>}
    </div>
  </div>
}
