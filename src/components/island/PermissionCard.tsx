import { useState } from 'react'
import type { IslandInteraction } from './island-types'
import type { AgentCapability } from '../../types/agent-interaction'
import { ReplyComposer } from './ReplyComposer'
import type { IslandIpc } from './island-types'

export function PermissionCard({ interaction, ipc, draft = '', onDraftChange, onAction }: { interaction: IslandInteraction; ipc: IslandIpc | null; draft?: string; onDraftChange?: (value: string) => void; onAction: (action: AgentCapability, reason?: string) => void }) {
  const [showReason, setShowReason] = useState(false)
  const isSending = interaction.status === 'responding'
  const isDisabled = !['pending', 'failed'].includes(interaction.status) || isSending
  const allowAlways = interaction.capabilities.includes('allow_always')
  const allowOnce = interaction.capabilities.includes('allow_once')
  const deny = interaction.capabilities.includes('deny')

  return (
    <section className="island-card" aria-label="权限请求">
      <h2>{interaction.title}</h2>
      {interaction.detail && <pre className="island-code-block">{interaction.detail}</pre>}
      {interaction.status === 'failed' && <div className="island-status-error">发送失败，请重试或返回终端处理。</div>}
      {showReason ? (
        <ReplyComposer interactionId={interaction.interactionId} initialValue={draft} onDraftChange={onDraftChange} ipc={ipc} placeholder="说明拒绝原因（可选）" allowEmpty disabled={isDisabled} submitLabel="确认拒绝" onCancel={() => setShowReason(false)} onSubmit={reason => onAction('deny', reason)} />
      ) : (
        <div className="island-action-row">
          {deny && <button type="button" className="island-button island-button-secondary" disabled={isDisabled} onClick={() => setShowReason(true)}>拒绝并说明</button>}
          {deny && <button type="button" className="island-button island-button-quiet" disabled={isDisabled} onClick={() => onAction('deny')}>拒绝</button>}
          {allowAlways && <button type="button" className="island-button island-button-quiet" disabled={isDisabled} onClick={() => onAction('allow_always')}>对此规则始终允许</button>}
          {allowOnce && <button type="button" className="island-button island-button-primary" disabled={isDisabled} onClick={() => onAction('allow_once')}>{isSending ? '发送中…' : '仅本次允许'}</button>}
        </div>
      )}
    </section>
  )
}
