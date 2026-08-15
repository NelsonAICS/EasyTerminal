import type { AgentAdapter } from './adapters/agent-adapter'
import type { AgentEventEnvelope, AgentEventSource, PendingInteraction } from '../../src/types/agent-interaction'

export type AgentSessionStatus = 'ready' | 'processing' | 'waiting_permission' | 'waiting_question' | 'waiting_plan' | 'completed' | 'error'

export interface AgentSessionSnapshot {
  terminalSessionId: string
  agentSessionId: string
  agentType: string
  status: AgentSessionStatus
  revision: number
  lastEventAt: number
}

export interface SessionIngestResult {
  accepted: boolean
  duplicate?: boolean
  stale?: boolean
  interaction?: PendingInteraction
  cancelledInteractions?: string[]
  reason?: string
}

export interface SessionStore {
  ingest(event: AgentEventEnvelope, adapter: AgentAdapter): SessionIngestResult
  getInteraction(interactionId: string): PendingInteraction | undefined
  listPending(): PendingInteraction[]
  getSession(terminalSessionId: string, agentSessionId?: string): AgentSessionSnapshot | undefined
  markResponding(interactionId: string): { ok: true; interaction: PendingInteraction } | { ok: false; reason: string }
  markFailed(interactionId: string, reason: string): PendingInteraction | undefined
  markAcknowledged(interactionId: string): PendingInteraction | undefined
  markExpired(now?: number): string[]
  cancelForTerminalSession(terminalSessionId: string): string[]
  remove(interactionId: string): boolean
}

const sourcePriority: Record<AgentEventSource, number> = {
  'terminal-fallback': 0,
  'plugin': 1,
  'hook': 3,
  'native-tool': 4,
}

const interactionPriority: Record<PendingInteraction['kind'], number> = {
  permission: 0,
  plan: 1,
  question: 2,
  notification: 3,
  completion: 4,
}

const isLifecycleEvent = (eventType: string): boolean =>
  ['session.started', 'session.processing', 'session.completed', 'session.error', 'SessionStart', 'UserPromptSubmit', 'Stop', 'SessionEnd', 'TurnStarted', 'TurnCompleted'].includes(eventType)

const lifecycleStatus = (eventType: string): AgentSessionStatus | undefined => {
  if (eventType === 'session.started' || eventType === 'SessionStart') return 'ready'
  if (eventType === 'session.processing' || eventType === 'UserPromptSubmit' || eventType === 'TurnStarted') return 'processing'
  if (eventType === 'session.completed' || eventType === 'Stop' || eventType === 'SessionEnd' || eventType === 'TurnCompleted') return 'completed'
  if (eventType === 'session.error') return 'error'
  return undefined
}

const interactionStatus = (kind: PendingInteraction['kind']): AgentSessionStatus | undefined => {
  if (kind === 'permission') return 'waiting_permission'
  if (kind === 'question') return 'waiting_question'
  if (kind === 'plan') return 'waiting_plan'
  return undefined
}

const cloneInteraction = (interaction: PendingInteraction): PendingInteraction => ({
  ...interaction,
  options: interaction.options.map(option => ({ ...option })),
  capabilities: [...interaction.capabilities],
  agentCapabilities: { ...interaction.agentCapabilities },
})

export function createSessionStore(): SessionStore {
  const sessions = new Map<string, AgentSessionSnapshot>()
  const pending = new Map<string, PendingInteraction>()
  const eventIds = new Set<string>()
  const eventIdOrder: string[] = []
  const latestInteractionRevision = new Map<string, number>()

  const rememberEvent = (eventId: string) => {
    eventIds.add(eventId)
    eventIdOrder.push(eventId)
    if (eventIdOrder.length > 10_000) {
      const old = eventIdOrder.shift()
      if (old) eventIds.delete(old)
    }
  }

  const updateSession = (event: AgentEventEnvelope, status: AgentSessionStatus) => {
    const key = event.terminalSessionId
    const existing = sessions.get(key)
    const next: AgentSessionSnapshot = {
      terminalSessionId: key,
      agentSessionId: event.agentSessionId,
      agentType: event.agentType,
      status,
      revision: Math.max(existing?.revision ?? 0, event.revision),
      lastEventAt: event.occurredAt,
    }
    sessions.set(key, next)
    return next
  }

  const cancelPendingForSession = (terminalSessionId: string): string[] => {
    const cancelled: string[] = []
    for (const [interactionId, interaction] of pending) {
      if (interaction.terminalSessionId === terminalSessionId && ['pending', 'responding'].includes(interaction.status)) {
        interaction.status = 'cancelled'
        cancelled.push(interactionId)
        pending.delete(interactionId)
      }
    }
    return cancelled
  }

  return {
    ingest(event, adapter) {
      if (eventIds.has(event.eventId)) return { accepted: false, duplicate: true, reason: 'duplicate_event' }

      const currentSession = sessions.get(event.terminalSessionId)
      if (currentSession?.status === 'completed' && event.revision <= currentSession.revision) {
        rememberEvent(event.eventId)
        return { accepted: false, stale: true, reason: 'completed_session_revision' }
      }
      rememberEvent(event.eventId)

      const status = lifecycleStatus(event.eventType)
      if (status) {
        const cancelledInteractions = status === 'completed' || status === 'error'
          ? cancelPendingForSession(event.terminalSessionId)
          : []
        updateSession(event, status)
        return { accepted: true, cancelledInteractions }
      }
      if (isLifecycleEvent(event.eventType)) return { accepted: true }

      const parsed = adapter.parseEvent(event)
      if (!parsed) return { accepted: true, reason: 'non_interactive_event' }

      const existing = pending.get(parsed.interactionId)
      const previousRevision = latestInteractionRevision.get(parsed.interactionId) ?? -1
      if (event.revision < previousRevision) return { accepted: false, stale: true, reason: 'stale_revision' }
      if (existing && event.revision === existing.revision) {
        if (['acknowledged', 'expired', 'cancelled', 'responding'].includes(existing.status)) {
          return { accepted: false, stale: true, reason: 'interaction_closed_or_responding' }
        }
        if (sourcePriority[event.source] <= sourcePriority[existing.source]) {
          return { accepted: false, stale: true, reason: 'same_or_lower_priority' }
        }
      }

      const now = Date.now()
      const interaction: PendingInteraction = {
        interactionId: parsed.interactionId,
        terminalSessionId: event.terminalSessionId,
        agentSessionId: event.agentSessionId,
        agentType: event.agentType,
        kind: parsed.kind,
        revision: event.revision,
        status: 'pending',
        title: parsed.title,
        ...(parsed.detail ? { detail: parsed.detail } : {}),
        options: parsed.options,
        capabilities: parsed.capabilities,
        responseMode: parsed.responseMode,
        createdAt: existing?.createdAt ?? now,
        ...(parsed.expiresAt ? { expiresAt: parsed.expiresAt } : {}),
        source: event.source,
        ...(parsed.toolCallId ? { toolCallId: parsed.toolCallId } : {}),
        agentCapabilities: parsed.agentCapabilities,
      }
      pending.set(parsed.interactionId, interaction)
      latestInteractionRevision.set(parsed.interactionId, event.revision)
      updateSession(event, interactionStatus(interaction.kind) ?? 'processing')
      return { accepted: true, interaction: cloneInteraction(interaction) }
    },

    getInteraction(interactionId) {
      const interaction = pending.get(interactionId)
      return interaction ? cloneInteraction(interaction) : undefined
    },

    listPending() {
      return [...pending.values()]
        .filter(interaction => interaction.status !== 'acknowledged' && interaction.status !== 'cancelled')
        .sort((a, b) => interactionPriority[a.kind] - interactionPriority[b.kind] || a.createdAt - b.createdAt)
        .map(cloneInteraction)
    },

    getSession(terminalSessionId, agentSessionId) {
      const session = sessions.get(terminalSessionId)
      if (!session || (agentSessionId && session.agentSessionId !== agentSessionId)) return undefined
      return { ...session }
    },

    markResponding(interactionId) {
      const interaction = pending.get(interactionId)
      if (!interaction) return { ok: false, reason: 'interaction_not_found' }
      if (!['pending', 'failed'].includes(interaction.status)) return { ok: false, reason: interaction.status === 'responding' ? 'duplicate' : 'interaction_not_pending' }
      if (interaction.expiresAt !== undefined && interaction.expiresAt <= Date.now()) {
        interaction.status = 'expired'
        return { ok: false, reason: 'expired' }
      }
      interaction.status = 'responding'
      return { ok: true, interaction: cloneInteraction(interaction) }
    },

    markFailed(interactionId, reason) {
      const interaction = pending.get(interactionId)
      if (!interaction) return undefined
      interaction.status = 'failed'
      const detailLines = interaction.detail ? interaction.detail.split('\n') : []
      if (!detailLines.includes(reason)) detailLines.push(reason)
      interaction.detail = detailLines.join('\n')
      return cloneInteraction(interaction)
    },

    markAcknowledged(interactionId) {
      const interaction = pending.get(interactionId)
      if (!interaction) return undefined
      interaction.status = 'acknowledged'
      return cloneInteraction(interaction)
    },

    markExpired(now = Date.now()) {
      const expired: string[] = []
      for (const [interactionId, interaction] of pending) {
        if (interaction.expiresAt !== undefined && interaction.expiresAt <= now && ['pending', 'responding'].includes(interaction.status)) {
          interaction.status = 'expired'
          expired.push(interactionId)
        }
      }
      return expired
    },

    cancelForTerminalSession(terminalSessionId) {
      const cancelled = cancelPendingForSession(terminalSessionId)
      const session = sessions.get(terminalSessionId)
      if (session) session.status = 'completed'
      return cancelled
    },

    remove(interactionId) {
      return pending.delete(interactionId)
    },
  }
}
