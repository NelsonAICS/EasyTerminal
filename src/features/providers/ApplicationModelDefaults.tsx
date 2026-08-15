import { useEffect, useState } from 'react'
import type { ApplicationModelDefaults, ModelRef, ProviderSummary } from '../../types/model-provider'

interface ApplicationModelDefaultsProps {
  providers: ProviderSummary[]
  defaults: ApplicationModelDefaults
  onSave: (defaults: ApplicationModelDefaults) => Promise<void>
}

function refKey(ref: ModelRef | null): string {
  return ref ? `${ref.providerId}:${ref.modelId}` : ''
}

function parseRef(value: string): ModelRef | null {
  const separator = value.indexOf(':')
  if (separator < 1) return null
  return { providerId: value.slice(0, separator), modelId: value.slice(separator + 1) }
}

export function ApplicationModelDefaults({ providers, defaults, onSave }: ApplicationModelDefaultsProps) {
  const [draft, setDraft] = useState(defaults)
  const [saving, setSaving] = useState(false)
  useEffect(() => setDraft(defaults), [defaults])

  const usableProviders = providers.filter((provider) => provider.health === 'connected' && (provider.hasCredential || provider.kind === 'ollama'))
  const llmModels = usableProviders.flatMap((provider) => provider.models.filter((model) => model.capabilities.includes('chat')).map((model) => ({ provider, model })))
  const embeddingModels = usableProviders.flatMap((provider) => provider.models.filter((model) => model.capabilities.includes('embedding')).map((model) => ({ provider, model })))

  const save = async () => {
    setSaving(true)
    try { await onSave(draft) } finally { setSaving(false) }
  }

  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-muted)] p-4">
      <h3 className="text-sm font-medium text-[var(--text-primary)]">应用默认模型</h3>
      <p className="mt-1 text-[10px] text-[var(--text-secondary)]">对话、Prompt 优化统一使用默认 LLM；知识库索引使用默认 Embedding。工作流节点可单独选择模型。</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-[var(--text-secondary)]">默认 LLM
          <select value={refKey(draft.defaultLlmModelRef)} onChange={(event) => setDraft((current) => ({ ...current, defaultLlmModelRef: parseRef(event.target.value) }))} className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2.5 py-2 text-xs text-[var(--text-primary)]">
            <option value="">未设置</option>
            {llmModels.map(({ provider, model }) => <option key={`${provider.id}:${model.id}`} value={`${provider.id}:${model.id}`}>{provider.name} / {model.id}</option>)}
          </select>
        </label>
        <label className="text-xs text-[var(--text-secondary)]">默认 Embedding
          <select value={refKey(draft.defaultEmbeddingModelRef)} onChange={(event) => setDraft((current) => ({ ...current, defaultEmbeddingModelRef: parseRef(event.target.value) }))} className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2.5 py-2 text-xs text-[var(--text-primary)]">
            <option value="">未设置</option>
            {embeddingModels.map(({ provider, model }) => <option key={`${provider.id}:${model.id}`} value={`${provider.id}:${model.id}`}>{provider.name} / {model.id}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-3 flex justify-end">
        <button onClick={() => void save()} disabled={saving} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs text-white disabled:opacity-50">{saving ? '保存中…' : '保存默认值'}</button>
      </div>
    </section>
  )
}
