import { useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import { ApplicationModelDefaults } from './ApplicationModelDefaults'
import { ModelCatalog } from './ModelCatalog'
import { ProviderForm, type ProviderDraft } from './ProviderForm'
import type { ApplicationModelDefaults as Defaults, ProviderSummary } from '../../types/model-provider'

const ipcRenderer = window.require ? window.require('electron').ipcRenderer as {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
} : null

const EMPTY_DEFAULTS: Defaults = { defaultLlmModelRef: null, defaultEmbeddingModelRef: null }

function statusLabel(provider: ProviderSummary): string {
  if (provider.health === 'connected') return '已连接'
  if (provider.health === 'error') return '连接失败'
  if (provider.health === 'testing') return '测试中'
  return '未验证'
}

export function ProviderManager() {
  const [providers, setProviders] = useState<ProviderSummary[]>([])
  const [defaults, setDefaults] = useState<Defaults>(EMPTY_DEFAULTS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedProvider = useMemo(() => providers.find((provider) => provider.id === selectedId) ?? null, [providers, selectedId])

  const load = async () => {
    if (!ipcRenderer) {
      setError('当前窗口没有可用的主进程通信接口')
      setLoading(false)
      return
    }
    try {
      const [providerData, defaultsData] = await Promise.all([
        ipcRenderer.invoke('provider-v2:list'),
        ipcRenderer.invoke('provider-v2:defaults:get'),
      ])
      const nextProviders = providerData as ProviderSummary[]
      setProviders(nextProviders)
      setDefaults((defaultsData as Defaults) ?? EMPTY_DEFAULTS)
      setSelectedId((current) => current && nextProviders.some((provider) => provider.id === current) ? current : nextProviders[0]?.id ?? null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '加载 Provider 失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const saveProvider = async (draft: ProviderDraft) => {
    if (!ipcRenderer) return
    setError(null)
    const saved = await ipcRenderer.invoke('provider-v2:save', {
      provider: {
        id: draft.id,
        name: draft.name,
        kind: draft.kind,
        baseUrl: draft.baseUrl,
        chatEndpoint: draft.chatEndpoint,
        embeddingEndpoint: draft.embeddingEndpoint,
        models: draft.models,
      },
      ...(draft.apiKey ? { apiKey: draft.apiKey } : {}),
    }) as ProviderSummary
    setProviders((current) => current.some((provider) => provider.id === saved.id)
      ? current.map((provider) => provider.id === saved.id ? saved : provider)
      : [...current, saved])
    setSelectedId(saved.id)
  }

  const testProvider = async () => {
    if (!ipcRenderer || !selectedProvider) return
    setTesting(true)
    setError(null)
    try {
      await ipcRenderer.invoke('provider-v2:test', selectedProvider.id)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Provider 连接测试失败')
      await load()
    } finally {
      setTesting(false)
    }
  }

  const refreshModels = async () => {
    if (!ipcRenderer || !selectedProvider) return
    setRefreshing(true)
    setError(null)
    try {
      await ipcRenderer.invoke('provider-v2:discover-models', selectedProvider.id)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '模型发现失败')
    } finally {
      setRefreshing(false)
    }
  }

  const deleteProvider = async () => {
    if (!ipcRenderer || !selectedProvider || !window.confirm(`确定删除 Provider「${selectedProvider.name}」吗？`)) return
    await ipcRenderer.invoke('provider-v2:delete', selectedProvider.id)
    setProviders((current) => current.filter((provider) => provider.id !== selectedProvider.id))
    setSelectedId(null)
  }

  const saveDefaults = async (nextDefaults: Defaults) => {
    if (!ipcRenderer) return
    const saved = await ipcRenderer.invoke('provider-v2:defaults:set', nextDefaults) as Defaults
    setDefaults(saved)
  }

  if (loading) return <div className="flex h-full items-center justify-center text-xs text-[var(--text-secondary)]"><RefreshCw size={14} className="mr-2 animate-spin" />加载 Provider…</div>

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}
      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(13rem,14rem)_minmax(0,1fr)] gap-4">
        <aside className="min-h-0 overflow-y-auto rounded-xl border border-[var(--panel-border)] bg-[var(--surface-muted)] p-2">
          <div className="mb-2 flex items-center justify-between px-2 py-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Providers</span>
            <button onClick={() => setSelectedId(null)} className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--panel-border)] hover:text-[var(--text-primary)]" title="新建 Provider"><Plus size={14} /></button>
          </div>
          <div className="space-y-1">
            {providers.map((provider) => (
              <button key={provider.id} onClick={() => setSelectedId(provider.id)} className={`w-full rounded-lg px-2.5 py-2 text-left transition-colors ${selectedId === provider.id ? 'bg-[var(--accent)]/15 text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--panel-bg)]'}`}>
                <div className="truncate text-xs font-medium">{provider.name}</div>
                <div className="mt-1 flex items-center justify-between text-[10px]"><span>{provider.kind}</span><span className={provider.health === 'connected' ? 'text-green-400' : provider.health === 'error' ? 'text-red-400' : ''}>{statusLabel(provider)}</span></div>
              </button>
            ))}
            {providers.length === 0 && <p className="px-2 py-4 text-center text-[10px] text-[var(--text-secondary)]">还没有 Provider</p>}
          </div>
        </aside>

        <main className="min-h-0 min-w-0 overflow-y-auto rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
          <div className="mb-4 flex items-start justify-between">
            <div><h2 className="text-sm font-medium text-[var(--text-primary)]">Provider 连接</h2><p className="mt-1 text-[10px] text-[var(--text-secondary)]">配置只在主进程保存；Renderer 只显示连接状态和模型目录。</p></div>
            {selectedProvider && <button onClick={() => void deleteProvider()} className="rounded-lg p-2 text-red-400 hover:bg-red-500/10" title="删除 Provider"><Trash2 size={14} /></button>}
          </div>
          <ProviderForm provider={selectedProvider} onSave={saveProvider} onTest={testProvider} isTesting={testing} />
          {selectedProvider && <div className="mt-5"><ModelCatalog provider={selectedProvider} onRefresh={refreshModels} isRefreshing={refreshing} /></div>}
        </main>
      </div>

      <div className="shrink-0">
        <ApplicationModelDefaults providers={providers} defaults={defaults} onSave={saveDefaults} />
      </div>
    </div>
  )
}
