import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AgentCapability, PendingInteraction } from './types/agent-interaction'
import { IslandShell } from './components/island/IslandShell'
import { InteractionHeader } from './components/island/InteractionHeader'
import { InteractionActionBar } from './components/island/InteractionActionBar'
import { PermissionCard } from './components/island/PermissionCard'
import { QuestionCard } from './components/island/QuestionCard'
import { PlanCard } from './components/island/PlanCard'
import { QuickReplyCard } from './components/island/QuickReplyCard'
import type { IslandIpc } from './components/island/island-types'
import './components/island/island.css'

type LegacyNotice = {
  id: string
  title: string
  detail: string
  sessionId: 'system'
  kind: 'notice'
}

type QueueItem = PendingInteraction | LegacyNotice

const electron = window.require ? window.require('electron') : null
const ipcRenderer = (electron?.ipcRenderer || null) as IslandIpc | null

const isInteraction = (item: QueueItem): item is PendingInteraction => item.kind !== 'notice'

export default function Island() {
  const [expanded, setExpanded] = useState(false)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [lastResponses, setLastResponses] = useState<Record<string, { action: AgentCapability; value?: string | string[]; reason?: string }>>({})
  const [dragOver, setDragOver] = useState(false)
  const [interactive, setInteractive] = useState(false)
  const queueRef = useRef(queue)
  const currentIndexRef = useRef(currentIndex)

  useEffect(() => { queueRef.current = queue }, [queue])
  useEffect(() => { currentIndexRef.current = currentIndex }, [currentIndex])

  const current = queue[currentIndex]
  const currentInteraction = current && isInteraction(current) ? current : null
  const pendingCount = queue.filter(item => isInteraction(item) && !['acknowledged', 'cancelled'].includes(item.status)).length

  const setInteraction = (next: PendingInteraction) => {
    setQueue(items => {
      const index = items.findIndex(item => isInteraction(item) && item.interactionId === next.interactionId)
      if (index < 0) return [...items, next]
      const copy = [...items]
      copy[index] = next
      return copy
    })
  }

  const removeNotice = (id: string) => setQueue(items => items.filter(item => isInteraction(item) || item.id !== id))

  useEffect(() => {
    if (!ipcRenderer) return

    const handleInteraction = (_event: unknown, input: unknown) => {
      const interaction = input as PendingInteraction
      if (!interaction || typeof interaction.interactionId !== 'string') return
      setInteraction(interaction)
      setExpanded(true)
      setCurrentIndex(() => {
        const existing = queueRef.current.findIndex(item => isInteraction(item) && item.interactionId === interaction.interactionId)
        return existing >= 0 ? existing : queueRef.current.length
      })
    }

    const handleInteractionState = (_event: unknown, input: unknown) => {
      const interaction = input as PendingInteraction
      if (!interaction || typeof interaction.interactionId !== 'string') return
      setInteraction(interaction)
      if (interaction.status === 'acknowledged') {
        setDrafts(previous => {
          const next = { ...previous }
          delete next[interaction.interactionId]
          return next
        })
        window.setTimeout(() => {
          setQueue(items => items.filter(item => !isInteraction(item) || item.interactionId !== interaction.interactionId))
          setCurrentIndex(index => Math.max(0, Math.min(index, queueRef.current.length - 2)))
        }, 180)
      }
    }

    const addNotice = (_event: unknown, detailInput: unknown, title = 'EasyTerminal') => {
      const detail = typeof detailInput === 'string' ? detailInput : '收到一条通知'
      const notice: LegacyNotice = { id: `notice-${Date.now()}-${Math.random()}`, title, detail, sessionId: 'system', kind: 'notice' }
      setQueue(items => [...items.filter(item => item.kind !== 'notice'), notice])
      setCurrentIndex(0)
      setExpanded(true)
    }

    const handleShow = (_event: unknown, detail: unknown) => addNotice(_event, detail)
    const handleStatus = (_event: unknown, detail: unknown) => addNotice(_event, detail, '状态')
    const handleLegacyPrompt = (_event: unknown, input: unknown) => {
      const data = (input && typeof input === 'object' ? input : {}) as { message?: string; sessionId?: string }
      // Old renderer prompt messages are not trusted approvals. Keep them as
      // a neutral notice until the Agent sends a structured event.
      addNotice(_event, data?.message || '终端中有待处理内容', '兼容提示')
    }

    ipcRenderer.on('island:interaction', handleInteraction)
    ipcRenderer.on('island:interaction-state', handleInteractionState)
    ipcRenderer.on('island:show', handleShow)
    ipcRenderer.on('island:status', handleStatus)
    ipcRenderer.on('island:prompt', handleLegacyPrompt)
    return () => {
      ipcRenderer.removeListener('island:interaction', handleInteraction)
      ipcRenderer.removeListener('island:interaction-state', handleInteractionState)
      ipcRenderer.removeListener('island:show', handleShow)
      ipcRenderer.removeListener('island:status', handleStatus)
      ipcRenderer.removeListener('island:prompt', handleLegacyPrompt)
    }
  }, [])

  const currentPosition = useMemo(() => queue.length ? `${currentIndex + 1}/${queue.length}` : '', [currentIndex, queue.length])

  const setInteractiveState = useCallback(async (next: boolean, reason: 'composer-focus' | 'composer-blur' | 'action-complete') => {
    setInteractive(next)
    if (currentInteraction) {
      await ipcRenderer?.invoke('island:set-interactive', { interactionId: currentInteraction.interactionId, interactive: next, reason })
    }
  }, [currentInteraction])

  const submit = async (action: AgentCapability, value?: string | string[], reason?: string) => {
    if (!currentInteraction || !ipcRenderer || currentInteraction.status === 'responding') return
    const response = {
      interactionId: currentInteraction.interactionId,
      terminalSessionId: currentInteraction.terminalSessionId,
      revision: currentInteraction.revision,
      action,
      ...(value !== undefined ? { value } : {}),
      ...(reason !== undefined ? { reason } : {}),
    }
    setLastResponses(previous => ({ ...previous, [currentInteraction.interactionId]: { action, ...(value !== undefined ? { value } : {}), ...(reason !== undefined ? { reason } : {}) } }))
    const result = await ipcRenderer.invoke('island:interaction-response', response) as { ok?: boolean; interaction?: PendingInteraction }
    if (result?.interaction) setInteraction(result.interaction)
    if (result?.ok) {
      await setInteractiveState(false, 'action-complete')
    }
  }

  const retry = async () => {
    if (!currentInteraction) return
    const previous = lastResponses[currentInteraction.interactionId]
    if (previous) await submit(previous.action, previous.value, previous.reason)
  }

  const handleShellClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement
    if (target.closest('[data-interactive-target="true"], button, textarea, input, pre, .island-option-list')) return
    setExpanded(value => !value)
  }

  const closeDisplay = useCallback(() => {
    setExpanded(false)
    void setInteractiveState(false, 'action-complete')
  }, [setInteractiveState])

  const moveQueue = useCallback((delta: number) => {
    setCurrentIndex(index => Math.max(0, Math.min(queue.length - 1, index + delta)))
  }, [queue.length])

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setDragOver(false)
    const text = event.dataTransfer.getData('text/plain')
    if (!text.trim() || !ipcRenderer) return
    const notice: LegacyNotice = { id: `notice-${Date.now()}`, title: '上下文保存', detail: '正在保存拖入内容……', sessionId: 'system', kind: 'notice' }
    setQueue(items => [...items, notice])
    setCurrentIndex(queue.length)
    setExpanded(true)
    ipcRenderer.once('island:save-result', (_event: unknown, input: unknown) => {
      const result = (input && typeof input === 'object' ? input : {}) as { success: boolean; isSensitive?: boolean }
      setQueue(items => items.map(item => !isInteraction(item) && item.id === notice.id ? { ...notice, title: result.isSensitive ? '隐私提醒' : '上下文保存', detail: result.success ? (result.isSensitive ? '已保存，但内容可能包含敏感隐私。' : '内容已保存。') : '保存失败。' } : item))
    })
    ipcRenderer.send('island:save-context', { text, source: 'DragDropIsland' })
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!expanded || interactive) return
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 'j') { event.preventDefault(); moveQueue(1); return }
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'k') { event.preventDefault(); moveQueue(-1); return }
      if (event.key === 'Escape') { event.preventDefault(); closeDisplay() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [expanded, interactive, queue.length, closeDisplay, moveQueue])

  const card = current && isInteraction(current) ? (
    current.kind === 'permission' ? <PermissionCard key={current.interactionId} interaction={current} ipc={ipcRenderer} draft={drafts[current.interactionId] || ''} onDraftChange={value => setDrafts(previous => ({ ...previous, [current.interactionId]: value }))} onAction={(action, reason) => void submit(action, undefined, reason)} />
      : current.kind === 'question' ? <QuestionCard key={current.interactionId} interaction={current} ipc={ipcRenderer} draft={drafts[current.interactionId] || ''} onDraftChange={value => setDrafts(previous => ({ ...previous, [current.interactionId]: value }))} onAction={(action, value) => void submit(action, value)} />
        : current.kind === 'plan' ? <PlanCard key={current.interactionId} interaction={current} ipc={ipcRenderer} draft={drafts[current.interactionId] || ''} onDraftChange={value => setDrafts(previous => ({ ...previous, [current.interactionId]: value }))} onAction={(action, value) => void submit(action, value)} />
          : <QuickReplyCard key={current.interactionId} interaction={current} ipc={ipcRenderer} draft={drafts[current.interactionId] || ''} onDraftChange={value => setDrafts(previous => ({ ...previous, [current.interactionId]: value }))} onAction={(action, value) => void submit(action, value)} />
  ) : current ? <section className="island-card" aria-label="通知"><h2>{current.title}</h2><p className="island-detail">{current.detail}</p><button type="button" className="island-button island-button-primary" onClick={() => removeNotice(current.id)}>关闭</button></section> : null

  return <div className="island-root" onDragEnter={event => { event.preventDefault(); setDragOver(true) }} onDragOver={event => event.preventDefault()} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
    <IslandShell expanded={expanded} interactive={interactive || dragOver} onClick={handleShellClick} onMouseEnter={() => ipcRenderer?.send('island:set-ignore-mouse-events', false)} onMouseLeave={() => { if (!interactive) ipcRenderer?.send('island:set-ignore-mouse-events', true) }}>
      {expanded && current ? <>
        {isInteraction(current) && <InteractionHeader interaction={current} index={currentIndex} total={queue.length} />}
        {!isInteraction(current) && <div className="island-header"><strong>{current.title}</strong><span>{currentPosition}</span></div>}
        {card}
        {isInteraction(current) && <InteractionActionBar interaction={current} ipc={ipcRenderer} onRetry={() => void retry()} onAction={action => { if (action === 'jump_to_terminal') closeDisplay() }} />}
        {queue.length > 1 && <div className="island-footer island-queue-nav"><button type="button" className="island-button island-button-quiet" disabled={currentIndex === 0} onClick={() => moveQueue(-1)}>上一项</button><span>{pendingCount} 项待处理</span><button type="button" className="island-button island-button-quiet" disabled={currentIndex === queue.length - 1} onClick={() => moveQueue(1)}>下一项</button></div>}
      </> : <button type="button" className="island-collapsed-status" onClick={() => setExpanded(true)}><span className="island-status-dot" />{currentInteraction ? `${currentInteraction.agentType} · ${currentInteraction.terminalSessionId}` : 'EasyTerminal'}{pendingCount > 0 && <b>{pendingCount}</b>}</button>}
    </IslandShell>
  </div>
}
