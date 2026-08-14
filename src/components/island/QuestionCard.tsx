import { useState } from 'react'
import type { AgentCapability } from '../../types/agent-interaction'
import type { IslandInteraction, IslandIpc } from './island-types'
import { ReplyComposer } from './ReplyComposer'

export function QuestionCard({ interaction, ipc, draft = '', onDraftChange, onAction }: { interaction: IslandInteraction; ipc: IslandIpc | null; draft?: string; onDraftChange?: (value: string) => void; onAction: (action: AgentCapability, value?: string | string[]) => void }) {
  const [selected, setSelected] = useState<string[]>([])
  const [other, setOther] = useState(false)
  const multiple = interaction.capabilities.includes('answer_multiple')
  const canText = interaction.capabilities.includes('answer_text')
  const isDisabled = !['pending', 'failed'].includes(interaction.status)

  const choose = (value: string) => {
    if (multiple) setSelected(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value])
    else onAction('answer_options', value)
  }

  return (
    <section className="island-card" aria-label="问题">
      <div className="island-card-title-row"><h2>{interaction.title}</h2>{multiple && <span className="island-inline-label">多选</span>}</div>
      {interaction.detail && <p className="island-detail">{interaction.detail}</p>}
      <div className="island-option-list">
        {interaction.options.map((option, index) => {
          const isSelected = selected.includes(option.value)
          return <button type="button" key={option.value} className={`island-option ${isSelected ? 'island-option-selected' : ''}`} disabled={isDisabled || option.disabled} onClick={() => choose(option.value)}>
            <span className="island-option-index">{index + 1}</span>
            <span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
            {multiple && <span className="island-checkbox" aria-hidden="true">{isSelected ? '✓' : ''}</span>}
          </button>
        })}
        {canText && <button type="button" className={`island-option ${other ? 'island-option-selected' : ''}`} disabled={isDisabled} onClick={() => setOther(true)}><span className="island-option-index">{interaction.options.length + 1}</span><span><strong>其他</strong><small>直接输入回复</small></span></button>}
      </div>
      {other && canText && <ReplyComposer interactionId={interaction.interactionId} initialValue={draft} onDraftChange={onDraftChange} ipc={ipc} disabled={isDisabled} onSubmit={value => onAction('answer_text', value)} />}
      {multiple && <div className="island-action-row"><span className="island-selected-count">已选 {selected.length} 项</span><button type="button" className="island-button island-button-primary" disabled={isDisabled || selected.length === 0} onClick={() => onAction('answer_multiple', selected)}>确认选择</button></div>}
    </section>
  )
}
