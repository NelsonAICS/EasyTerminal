import { useEffect, useState } from 'react'
import { KeyRound, Save } from 'lucide-react'
import type { ProviderInput, ProviderKind, ProviderSummary } from '../../types/model-provider'

export interface ProviderDraft extends ProviderInput {
  apiKey: string
}

interface ProviderFormProps {
  provider: ProviderSummary | null
  onSave: (draft: ProviderDraft) => Promise<void>
  onTest: () => Promise<void>
  isTesting: boolean
}

function toDraft(provider: ProviderSummary | null): ProviderDraft {
  return {
    id: provider?.id ?? `provider_${Date.now()}`,
    name: provider?.name ?? '自定义 Provider',
    kind: provider?.kind ?? 'openai_compatible',
    baseUrl: provider?.baseUrl ?? 'https://api.example.com/v1',
    chatEndpoint: provider?.chatEndpoint ?? '',
    embeddingEndpoint: provider?.embeddingEndpoint ?? '',
    models: provider?.models ?? [],
    apiKey: '',
  }
}

function modelsSignature(models: ProviderDraft['models'] | ProviderSummary['models']): string {
  return JSON.stringify(models ?? [])
}

export function ProviderForm({ provider, onSave, onTest, isTesting }: ProviderFormProps) {
  const [draft, setDraft] = useState<ProviderDraft>(() => toDraft(provider))
  const [saving, setSaving] = useState(false)
  const [testNotice, setTestNotice] = useState<string | null>(null)

  useEffect(() => {
    setDraft(toDraft(provider))
    setTestNotice(null)
  }, [provider])

  const hasUnsavedChanges = !provider
    || draft.name !== provider.name
    || draft.kind !== provider.kind
    || draft.baseUrl !== provider.baseUrl
    || (draft.chatEndpoint ?? '') !== (provider.chatEndpoint ?? '')
    || (draft.embeddingEndpoint ?? '') !== (provider.embeddingEndpoint ?? '')
    || modelsSignature(draft.models) !== modelsSignature(provider.models)
    || draft.apiKey.trim().length > 0

  const missingCredential = Boolean(provider)
    && !provider?.hasCredential
    && draft.kind !== 'ollama'

  const update = <K extends keyof ProviderDraft>(key: K, value: ProviderDraft[K]) => {
    setTestNotice(null)
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const save = async () => {
    setTestNotice(null)
    setSaving(true)
    try {
      await onSave(draft)
      setDraft((current) => ({ ...current, apiKey: '' }))
    } finally {
      setSaving(false)
    }
  }

  const test = async () => {
    if (hasUnsavedChanges) {
      setTestNotice('请先点击“保存 Provider”，再测试连接。测试只会使用主进程中已保存的配置。')
      return
    }
    if (!provider) {
      setTestNotice('请先保存 Provider，再测试连接。')
      return
    }
    if (missingCredential) {
      setTestNotice('请先填写 API Key 并保存 Provider，再测试连接。')
      return
    }
    setTestNotice(null)
    await onTest()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-[var(--text-secondary)]">
          Provider ID
          <input value={draft.id} disabled={Boolean(provider)} onChange={(event) => update('id', event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-60" />
        </label>
        <label className="text-xs text-[var(--text-secondary)]">
          名称
          <input value={draft.name} onChange={(event) => update('name', event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm text-[var(--text-primary)]" />
        </label>
      </div>

      <label className="block text-xs text-[var(--text-secondary)]">
        协议类型
        <select value={draft.kind} onChange={(event) => update('kind', event.target.value as ProviderKind)} className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm text-[var(--text-primary)]">
          <option value="openai_compatible">OpenAI Compatible</option>
          <option value="anthropic">Anthropic Messages</option>
          <option value="ollama">Ollama 本地服务</option>
        </select>
      </label>

      <label className="block text-xs text-[var(--text-secondary)]">
        API 地址
        <input value={draft.baseUrl} onChange={(event) => update('baseUrl', event.target.value)} placeholder="https://api.example.com/v1" className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 font-mono text-sm text-[var(--text-primary)]" />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-[var(--text-secondary)]">
          Chat Endpoint（可选）
          <input value={draft.chatEndpoint ?? ''} onChange={(event) => update('chatEndpoint', event.target.value)} placeholder="/chat/completions" className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 font-mono text-xs text-[var(--text-primary)]" />
        </label>
        <label className="text-xs text-[var(--text-secondary)]">
          Embedding Endpoint（可选）
          <input value={draft.embeddingEndpoint ?? ''} onChange={(event) => update('embeddingEndpoint', event.target.value)} placeholder="/embeddings" className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 font-mono text-xs text-[var(--text-primary)]" />
        </label>
      </div>

      <label className="block text-xs text-[var(--text-secondary)]">
        <span className="flex items-center gap-1"><KeyRound size={12} /> API Key</span>
        <input type="password" value={draft.apiKey} onChange={(event) => update('apiKey', event.target.value)} placeholder={provider?.hasCredential ? '已保存密钥；留空表示保持不变' : '仅通过主进程加密保存'} className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 font-mono text-sm text-[var(--text-primary)]" />
      </label>

      {hasUnsavedChanges && <p className="text-[11px] text-amber-300" role="status">当前有未保存修改，请先点击“保存 Provider”；测试连接只使用已保存的配置。</p>}
      {testNotice && <p className="text-[11px] text-amber-300" role="alert" aria-live="polite">{testNotice}</p>}

      <div className="flex justify-end gap-2">
        <button
          onClick={() => void test()}
          disabled={isTesting || (!hasUnsavedChanges && (missingCredential || !provider))}
          title={hasUnsavedChanges ? '请先保存 Provider，再测试连接' : missingCredential ? '请先填写 API Key 并保存' : undefined}
          className={`rounded-lg border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${hasUnsavedChanges ? 'border-amber-500/40 text-amber-200' : 'border-[var(--panel-border)] text-[var(--text-primary)]'}`}
        >
          {isTesting ? '测试中…' : hasUnsavedChanges ? '先保存后测试' : '测试连接'}
        </button>
        <button onClick={() => void save()} disabled={saving || !draft.id || !draft.name || !draft.baseUrl} className="flex items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs text-white disabled:cursor-not-allowed disabled:opacity-50">
          <Save size={13} /> {saving ? '保存中…' : '保存 Provider'}
        </button>
      </div>
    </div>
  )
}
