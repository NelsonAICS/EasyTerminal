import type { AgentCapability } from '../../types/agent-interaction'
import type { IslandInteraction, IslandIpc } from './island-types'

export function InteractionActionBar({ interaction, ipc, onAction, onRetry }: { interaction: IslandInteraction; ipc: IslandIpc | null; onAction?: (action: AgentCapability) => void; onRetry?: () => void }) {
  const canJump = interaction.capabilities.includes('jump_to_terminal')
  const isClosed = ['expired', 'cancelled'].includes(interaction.status)
  return <footer className="island-footer" data-interactive-target="true">
    {isClosed && <span className="island-footer-message">请求已{interaction.status === 'expired' ? '过期' : '取消'}</span>}
    {!isClosed && interaction.status === 'responding' && <span className="island-footer-message">正在等待 Agent ACK…</span>}
    {interaction.status === 'failed' && onRetry && <button type="button" className="island-button island-button-quiet" onClick={onRetry}>重试</button>}
    {canJump && <button type="button" className="island-button island-button-quiet" onClick={() => { void ipc?.invoke('island:jump-to-terminal', interaction.terminalSessionId); onAction?.('jump_to_terminal') }}>返回终端处理</button>}
  </footer>
}
