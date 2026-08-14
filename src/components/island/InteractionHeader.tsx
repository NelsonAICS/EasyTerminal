import { CheckCircle2, CircleAlert, CircleDot, ShieldCheck } from 'lucide-react'
import type { IslandInteraction } from './island-types'
import { kindLabel, sourceLabel } from './island-types'

export function InteractionHeader({ interaction, index, total }: { interaction: IslandInteraction; index: number; total: number }) {
  const statusIcon = interaction.status === 'failed' || interaction.status === 'expired'
    ? <CircleAlert size={15} className="text-amber-300" />
    : interaction.status === 'acknowledged'
      ? <CheckCircle2 size={15} className="text-emerald-300" />
      : <CircleDot size={15} className="text-blue-300" />

  return (
    <header className="island-header">
      <div className="island-identity">
        {statusIcon}
        <span className="island-agent-name">{interaction.agentType}</span>
        <span className="island-separator">·</span>
        <span className="island-session-name">{interaction.terminalSessionName || interaction.terminalSessionId}</span>
      </div>
      <div className="island-header-meta">
        <span className="island-source-badge">
          <ShieldCheck size={11} />
          {sourceLabel(interaction)}
        </span>
        {total > 1 && <span className="island-queue-count">{index + 1}/{total}</span>}
      </div>
      <div className="island-kind-label">{kindLabel(interaction.kind)}</div>
    </header>
  )
}
