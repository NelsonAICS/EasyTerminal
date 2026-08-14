import type { AgentCapability } from '../../types/agent-interaction'
import type { IslandInteraction, IslandIpc } from './island-types'
import { ReplyComposer } from './ReplyComposer'

export function PlanCard({ interaction, ipc, draft = '', onDraftChange, onAction }: { interaction: IslandInteraction; ipc: IslandIpc | null; draft?: string; onDraftChange?: (value: string) => void; onAction: (action: AgentCapability, value?: string) => void }) {
  const isDisabled = !['pending', 'failed'].includes(interaction.status)
  const canFeedback = interaction.capabilities.includes('plan_feedback')
  const canAccept = interaction.capabilities.includes('accept_plan')

  return <section className="island-card" aria-label="计划确认">
    <div className="island-card-title-row"><h2>{interaction.title}</h2><span className="island-inline-label">计划</span></div>
    <div className="island-markdown-content">{interaction.detail || 'Agent 未提供计划正文。'}</div>
    {canFeedback && <ReplyComposer interactionId={interaction.interactionId} initialValue={draft} onDraftChange={onDraftChange} ipc={ipc} disabled={isDisabled} onSubmit={value => onAction('plan_feedback', value)} submitLabel="发送修改意见" />}
    <div className="island-action-row">
      <button type="button" className="island-button island-button-secondary" disabled={isDisabled} onClick={() => void ipc?.invoke('island:jump-to-terminal', interaction.terminalSessionId)}>返回终端审阅</button>
      {canAccept && <button type="button" className="island-button island-button-primary" disabled={isDisabled} onClick={() => onAction('accept_plan')}>接受计划</button>}
    </div>
  </section>
}
