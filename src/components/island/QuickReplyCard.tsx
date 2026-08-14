import type { AgentCapability } from '../../types/agent-interaction'
import type { IslandInteraction, IslandIpc } from './island-types'
import { ReplyComposer } from './ReplyComposer'

export function QuickReplyCard({ interaction, ipc, draft = '', onDraftChange, onAction }: { interaction: IslandInteraction; ipc: IslandIpc | null; draft?: string; onDraftChange?: (value: string) => void; onAction: (action: AgentCapability, value?: string) => void }) {
  const canSend = interaction.capabilities.includes('send_message')
  const isDisabled = !['pending', 'failed'].includes(interaction.status)
  return <section className="island-card" aria-label="快速回复">
    <h2>{interaction.title}</h2>
    {interaction.detail && <div className="island-markdown-content">{interaction.detail}</div>}
    {canSend && !isDisabled ? <ReplyComposer interactionId={interaction.interactionId} initialValue={draft} onDraftChange={onDraftChange} ipc={ipc} onSubmit={value => onAction('send_message', value)} placeholder="回复 Agent……" disabled={isDisabled} /> : <button type="button" className="island-button island-button-secondary" onClick={() => void ipc?.invoke('island:jump-to-terminal', interaction.terminalSessionId)}>返回 EasyTerminal 标签页</button>}
  </section>
}
