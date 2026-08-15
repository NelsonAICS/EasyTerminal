import { describe, expect, it } from 'vitest'
import { FakeAgentAdapter } from '../../electron/agent-integration/adapters/fake-agent-adapter'
import { createSessionStore } from '../../electron/agent-integration/session-store'

const event = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 1 as const,
  eventId: `event-${Math.random()}`,
  eventType: 'interaction.permission',
  agentType: 'fake-agent',
  source: 'hook' as const,
  terminalSessionId: 'tab-A',
  agentSessionId: 'agent-A',
  instanceId: 'instance-A',
  channelToken: 'token-A',
  interactionId: 'interaction-A',
  revision: 1,
  occurredAt: Date.now(),
  payload: { title: '批准命令', detail: 'npm test' },
  ...overrides,
})

describe('SessionStore', () => {
  it('ISL-UNIT-006 handles duplicate eventId exactly once', () => {
    const store = createSessionStore()
    const adapter = new FakeAgentAdapter()
    const first = store.ingest(event({ eventId: 'same-event' }), adapter)
    const second = store.ingest(event({ eventId: 'same-event' }), adapter)

    expect(first.interaction?.interactionId).toBe('interaction-A')
    expect(second).toMatchObject({ accepted: false, duplicate: true })
    expect(store.listPending()).toHaveLength(1)
  })

  it('ISL-UNIT-021 keeps multiple interactionIds in one agent session', () => {
    const store = createSessionStore()
    const adapter = new FakeAgentAdapter()
    store.ingest(event({ eventId: 'event-1', interactionId: 'interaction-1' }), adapter)
    store.ingest(event({ eventId: 'event-2', interactionId: 'interaction-2' }), adapter)

    expect(store.listPending().map(item => item.interactionId)).toEqual(['interaction-1', 'interaction-2'])
  })

  it('ISL-UNIT-023 orders permission before plan before question', () => {
    const store = createSessionStore()
    const adapter = new FakeAgentAdapter()
    store.ingest(event({ eventId: 'event-question', eventType: 'interaction.question', interactionId: 'question', occurredAt: 1 }), adapter)
    store.ingest(event({ eventId: 'event-plan', eventType: 'interaction.plan', interactionId: 'plan', occurredAt: 2 }), adapter)
    store.ingest(event({ eventId: 'event-permission', eventType: 'interaction.permission', interactionId: 'permission', occurredAt: 3 }), adapter)

    expect(store.listPending().map(item => item.interactionId)).toEqual(['permission', 'plan', 'question'])
  })

  it('ISL-UNIT-025 updates the same interaction on a newer revision', () => {
    const store = createSessionStore()
    const adapter = new FakeAgentAdapter()
    store.ingest(event({ eventId: 'event-1', revision: 1, payload: { title: '旧内容' } }), adapter)
    const result = store.ingest(event({ eventId: 'event-2', revision: 2, payload: { title: '新内容' } }), adapter)

    expect(result.interaction).toMatchObject({ interactionId: 'interaction-A', revision: 2, title: '新内容' })
    expect(store.listPending()).toHaveLength(1)
  })

  it('ISL-UNIT-014 completion cancels all pending interactions for the session', () => {
    const store = createSessionStore()
    const adapter = new FakeAgentAdapter()
    store.ingest(event({ eventId: 'event-1', interactionId: 'interaction-1' }), adapter)
    const result = store.ingest(event({ eventId: 'event-complete', eventType: 'session.completed', interactionId: undefined, revision: 2 }), adapter)

    expect(result.cancelledInteractions).toEqual(['interaction-1'])
    expect(store.listPending()).toHaveLength(0)
    expect(store.getSession('tab-A')?.status).toBe('completed')
  })

  it('ISL-UNIT-015 expires interactions and prevents responding', () => {
    const store = createSessionStore()
    const adapter = new FakeAgentAdapter()
    store.ingest(event({ payload: { title: '批准命令', expiresAt: 100 } }), adapter)

    expect(store.markExpired(100)).toEqual(['interaction-A'])
    expect(store.markResponding('interaction-A')).toMatchObject({ ok: false, reason: 'interaction_not_pending' })
  })

  it('does not reopen an acknowledged interaction on a repeated revision', () => {
    const store = createSessionStore()
    const adapter = new FakeAgentAdapter()
    store.ingest(event({ eventId: 'event-1' }), adapter)
    const current = store.getInteraction('interaction-A')
    expect(current).toBeDefined()
    store.markAcknowledged('interaction-A')

    const repeated = store.ingest(event({ eventId: 'event-2', source: 'native-tool', revision: current?.revision }), adapter)
    expect(repeated).toMatchObject({ accepted: false, stale: true, reason: 'interaction_closed_or_responding' })
    expect(store.getInteraction('interaction-A')?.status).toBe('acknowledged')
  })

  it('does not append the same transport failure repeatedly', () => {
    const store = createSessionStore()
    const adapter = new FakeAgentAdapter()
    store.ingest(event({ eventId: 'event-failure' }), adapter)

    store.markFailed('interaction-A', 'hook_connection_unavailable')
    store.markFailed('interaction-A', 'hook_connection_unavailable')

    expect(store.getInteraction('interaction-A')?.detail).toBe('npm test\nhook_connection_unavailable')
  })
})
