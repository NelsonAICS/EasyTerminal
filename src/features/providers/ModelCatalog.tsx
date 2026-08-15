import { RefreshCw } from 'lucide-react'
import type { ProviderSummary } from '../../types/model-provider'

interface ModelCatalogProps {
  provider: ProviderSummary
  onRefresh: () => Promise<void>
  isRefreshing: boolean
}

export function ModelCatalog({ provider, onRefresh, isRefreshing }: ModelCatalogProps) {
  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-muted)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--text-primary)]">模型目录</h3>
          <p className="mt-1 text-[10px] text-[var(--text-secondary)]">只有发现并验证过的模型才能设置为应用默认模型。</p>
        </div>
        <button onClick={() => void onRefresh()} disabled={isRefreshing} className="flex items-center gap-1 rounded-lg border border-[var(--panel-border)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] disabled:opacity-50">
          <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} /> 刷新
        </button>
      </div>
      {provider.models.length === 0 ? (
        <p className="py-4 text-center text-xs text-[var(--text-secondary)]">暂未发现模型，请刷新或手动调用节点时填写模型 ID。</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {provider.models.map((model) => (
            <div key={model.id} className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2">
              <div className="truncate font-mono text-xs text-[var(--text-primary)]" title={model.id}>{model.id}</div>
              <div className="mt-1 flex gap-1">
                {model.capabilities.map((capability) => <span key={capability} className="rounded bg-[var(--accent)]/15 px-1.5 py-0.5 text-[10px] text-[var(--accent)]">{capability}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
