import { useEffect, useState } from 'react'
import { Plus, Save } from 'lucide-react'
import { PortEditor } from './PortEditor'
import { NodeTestBench } from './NodeTestBench'
import { PublishDialog } from './PublishDialog'
import type { PortDefinition } from '../domain/types'
import type { NodeRisk } from '../../../../electron/services/workflow-v2/node-definition'
import type { ManagedNodeDefinition } from '../../../../electron/services/workflow-v2/node-definition-service'
import type { PublishedNodeDefinition } from '../../../../electron/services/workflow-v2/node-definition'

const ipcRenderer = window.require ? window.require('electron').ipcRenderer as { invoke: (channel: string, ...args: unknown[]) => Promise<unknown> } : null
const EXECUTOR_KINDS = ['prompt', 'llm', 'retriever', 'sql', 'shell', 'condition', 'json-transform', 'trusted-function']

type Draft = ManagedNodeDefinition
const emptyDraft = (): Draft => ({
  type: `custom.node.${Date.now()}`,
  version: 1,
  name: '新节点',
  description: '',
  executorKind: 'prompt',
  inputPorts: [],
  outputPorts: [],
  configSchema: {},
  risk: 'safe',
  status: 'draft',
})

export function NodeDefinitionManager() {
  const [definitions, setDefinitions] = useState<ManagedNodeDefinition[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [publishOpen, setPublishOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!ipcRenderer) return
    const result = await ipcRenderer.invoke('workflow-v2:node-definitions:list') as ManagedNodeDefinition[]
    setDefinitions(result)
    if (selected) {
      const current = result.find((definition) => `${definition.type}@${definition.version}` === selected)
      if (current) setDraft(current)
    }
  }
  useEffect(() => {
    if (!ipcRenderer) return
    let active = true
    void ipcRenderer.invoke('workflow-v2:node-definitions:list').then((value) => {
      if (active) setDefinitions(value as ManagedNodeDefinition[])
    })
    return () => { active = false }
  }, [])

  const choose = (definition: ManagedNodeDefinition) => {
    setSelected(`${definition.type}@${definition.version}`)
    setDraft({ ...definition })
    setError(null)
  }

  const saveDraft = async (): Promise<ManagedNodeDefinition> => {
    if (!ipcRenderer) throw new Error('主进程通信不可用')
    const saved = await ipcRenderer.invoke('workflow-v2:node-definitions:save-draft', draft) as ManagedNodeDefinition
    setDefinitions((current) => current.some((definition) => definition.type === saved.type && definition.version === saved.version)
      ? current.map((definition) => definition.type === saved.type && definition.version === saved.version ? saved : definition)
      : [...current, saved])
    setSelected(`${saved.type}@${saved.version}`)
    setDraft(saved)
    return saved
  }

  const testDraft = async (values: Record<string, unknown>) => {
    const saved = await saveDraft()
    const tested = await ipcRenderer!.invoke('workflow-v2:node-definitions:test', { type: saved.type, version: saved.version, values }) as ManagedNodeDefinition
    setDefinitions((current) => current.map((definition) => definition.type === tested.type && definition.version === tested.version ? tested : definition))
    setDraft(tested)
    return tested.lastTest
  }

  const publish = async () => {
    try {
      const published = await ipcRenderer!.invoke('workflow-v2:node-definitions:publish', { type: draft.type, version: draft.version }) as PublishedNodeDefinition
      setDraft((current) => ({ ...current, ...published, status: 'published' }))
      setPublishOpen(false)
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : '发布失败') }
  }

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }))

  return <div className="flex h-full min-h-0 gap-4 p-5">
    <aside className="w-60 shrink-0 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-muted)] p-2">
      <div className="mb-2 flex items-center justify-between px-2"><span className="text-xs text-[var(--text-secondary)]">节点定义</span><button onClick={() => { setSelected(null); setDraft(emptyDraft()) }} className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--panel-border)]"><Plus size={14} /></button></div>
      {definitions.map((definition) => <button key={`${definition.type}@${definition.version}`} onClick={() => choose(definition)} className={`mb-1 w-full rounded-lg px-2.5 py-2 text-left ${selected === `${definition.type}@${definition.version}` ? 'bg-[var(--accent)]/15' : 'hover:bg-[var(--panel-bg)]'}`}><div className="truncate text-xs text-[var(--text-primary)]">{definition.name}</div><div className="mt-1 text-[10px] text-[var(--text-secondary)]">{definition.type}@{definition.version} · {definition.status}</div></button>)}
    </aside>
    <main className="min-w-0 flex-1 space-y-4 overflow-y-auto">
      {error && <div className="rounded-lg bg-red-500/10 p-2 text-xs text-red-300">{error}</div>}
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-medium text-[var(--text-primary)]">节点开发中心</h2><p className="mt-1 text-[10px] text-[var(--text-secondary)]">只能选择受控执行器，不能在节点中注入任意 JavaScript。</p></div><button onClick={() => void saveDraft().catch((cause) => setError(cause instanceof Error ? cause.message : '保存失败'))} className="flex items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs text-white"><Save size={13} />保存草稿</button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-[var(--text-secondary)]">类型<input value={draft.type} onChange={(event) => update('type', event.target.value)} disabled={draft.status === 'published'} className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-2.5 py-2 text-xs text-[var(--text-primary)] disabled:opacity-60" /></label>
          <label className="text-xs text-[var(--text-secondary)]">版本<input type="number" min={1} value={draft.version} onChange={(event) => update('version', Number(event.target.value))} disabled={draft.status === 'published'} className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-2.5 py-2 text-xs text-[var(--text-primary)] disabled:opacity-60" /></label>
          <label className="text-xs text-[var(--text-secondary)]">名称<input value={draft.name} onChange={(event) => update('name', event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-2.5 py-2 text-xs text-[var(--text-primary)]" /></label>
          <label className="text-xs text-[var(--text-secondary)]">执行器<select value={draft.executorKind} onChange={(event) => update('executorKind', event.target.value)} disabled={draft.status === 'published'} className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-2.5 py-2 text-xs text-[var(--text-primary)]">{EXECUTOR_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select></label>
          <label className="text-xs text-[var(--text-secondary)] sm:col-span-2">描述<textarea value={draft.description} onChange={(event) => update('description', event.target.value)} className="mt-1 h-16 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-2.5 py-2 text-xs text-[var(--text-primary)]" /></label>
          <label className="text-xs text-[var(--text-secondary)]">风险等级<select value={draft.risk} onChange={(event) => update('risk', event.target.value as NodeRisk)} className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-2.5 py-2 text-xs text-[var(--text-primary)]"><option value="safe">safe</option><option value="network">network</option><option value="write">write</option><option value="system">system</option></select></label>
        </div>
      </section>
      <PortEditor title="输入端口" value={draft.inputPorts} onChange={(inputPorts: PortDefinition[]) => update('inputPorts', inputPorts)} />
      <PortEditor title="输出端口" value={draft.outputPorts} onChange={(outputPorts: PortDefinition[]) => update('outputPorts', outputPorts)} />
      <NodeTestBench onTest={testDraft} disabled={draft.status === 'published'} />
      <div className="flex justify-end"><button onClick={() => setPublishOpen(true)} disabled={draft.status !== 'tested'} className="rounded-lg border border-[var(--accent)] px-3 py-2 text-xs text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40">发布不可变版本</button></div>
    </main>
    <PublishDialog open={publishOpen} type={draft.type} version={draft.version} onCancel={() => setPublishOpen(false)} onConfirm={publish} />
  </div>
}
