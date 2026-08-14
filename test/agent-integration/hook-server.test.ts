import { describe, expect, it, vi } from 'vitest'
import { createHookServer } from '../../electron/agent-integration/hook-server'
import { FakeAgentAdapter } from '../../electron/agent-integration/adapters/fake-agent-adapter'
import { createSessionStore } from '../../electron/agent-integration/session-store'
import { createTerminalSessionRegistry } from '../../electron/agent-integration/terminal-session-registry'

const makeEvent = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 1 as const,
  eventId: 'event-1',
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
  payload: { title: '批准命令' },
  ...overrides,
})

describe('HookServer', () => {
  it('ISL-UNIT-003/004/005 rejects wrong tab, token and instance', () => {
    const registry = createTerminalSessionRegistry()
    registry.register({ terminalSessionId: 'tab-A', instanceId: 'instance-A', channelToken: 'token-A' })
    const server = createHookServer({ socketPath: '/tmp/not-started.sock', registry, store: createSessionStore(), adapters: [new FakeAgentAdapter()] })

    expect(server.handleEnvelope(makeEvent({ terminalSessionId: 'tab-B' }))).toMatchObject({ ok: false, code: 'unauthorized_session' })
    expect(server.handleEnvelope(makeEvent({ channelToken: 'wrong' }))).toMatchObject({ ok: false, code: 'unauthorized_session' })
    expect(server.handleEnvelope(makeEvent({ instanceId: 'instance-B' }))).toMatchObject({ ok: false, code: 'unauthorized_session' })
  })

  it('ISL-UNIT-001 accepts an authorized event and emits an interaction', () => {
    const onInteraction = vi.fn()
    const registry = createTerminalSessionRegistry()
    registry.register({ terminalSessionId: 'tab-A', instanceId: 'instance-A', channelToken: 'token-A' })
    const server = createHookServer({ socketPath: '/tmp/not-started.sock', registry, store: createSessionStore(), adapters: [new FakeAgentAdapter()], onInteraction })

    expect(server.handleEnvelope(makeEvent())).toMatchObject({ ok: true, interactionId: 'interaction-A' })
    expect(onInteraction).toHaveBeenCalledWith('interaction-A')
  })

  it('ISL-UNIT-027/028 lets structured events supersede fallback events', () => {
    const registry = createTerminalSessionRegistry()
    registry.register({ terminalSessionId: 'tab-A', instanceId: 'instance-A', channelToken: 'token-A' })
    const store = createSessionStore()
    const server = createHookServer({ socketPath: '/tmp/not-started.sock', registry, store, adapters: [new FakeAgentAdapter()] })
    const fallback = makeEvent({ eventId: 'fallback', source: 'terminal-fallback', agentType: 'terminal-fallback', eventType: 'interaction.notification', payload: { title: '终端提示' } })

    expect(server.handleEnvelope(fallback)).toMatchObject({ ok: true })
    expect(server.handleEnvelope(makeEvent({ eventId: 'structured', source: 'hook', payload: { title: '原生权限' } }))).toMatchObject({ ok: true })
    expect(store.listPending().filter(item => item.interactionId === 'interaction-A')).toHaveLength(1)
    expect(store.listPending().some(item => item.source === 'terminal-fallback')).toBe(false)
  })

  it('ISL-ADAPTER-006 does not open approvals for an unknown Agent', () => {
    const registry = createTerminalSessionRegistry()
    registry.register({ terminalSessionId: 'tab-A', instanceId: 'instance-A', channelToken: 'token-A' })
    const server = createHookServer({ socketPath: '/tmp/not-started.sock', registry, store: createSessionStore(), adapters: [new FakeAgentAdapter()] })

    expect(server.handleEnvelope(makeEvent({ agentType: 'unknown-agent' }))).toMatchObject({ ok: false, code: 'adapter_unavailable' })
  })
})
