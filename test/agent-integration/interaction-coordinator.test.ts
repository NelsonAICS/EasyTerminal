import { describe, expect, it, vi } from 'vitest'
import { createInteractionCoordinator } from '../../electron/agent-integration/interaction-coordinator'
import { FakeAgentAdapter } from '../../electron/agent-integration/adapters/fake-agent-adapter'
import { createSessionStore } from '../../electron/agent-integration/session-store'
import { createTerminalSessionRegistry } from '../../electron/agent-integration/terminal-session-registry'

const permissionEvent = (expiresAt?: number) => ({
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
  payload: { title: '批准命令', ...(expiresAt ? { expiresAt } : {}) },
})

function setup() {
  const store = createSessionStore()
  const registry = createTerminalSessionRegistry()
  registry.register({ terminalSessionId: 'tab-A', instanceId: 'instance-A', channelToken: 'token-A' })
  const adapter = new FakeAgentAdapter()
  store.ingest(permissionEvent(), adapter)
  const sendHook = vi.fn()
  const coordinator = createInteractionCoordinator({ store, registry, adapters: [adapter], transport: { sendHook, writePty: vi.fn() } })
  return { store, registry, adapter, coordinator, sendHook }
}

describe('InteractionCoordinator', () => {
  it('ISL-RESP-001/009 enters responding and rejects duplicate submissions', async () => {
    const { coordinator, sendHook } = setup()
    const response = { interactionId: 'interaction-A', terminalSessionId: 'tab-A', revision: 1, action: 'allow_once' as const }
    const first = await coordinator.submit(response)
    const second = await coordinator.submit(response)

    expect(first).toMatchObject({ ok: true, status: 'responding' })
    expect(second).toMatchObject({ ok: false, code: 'duplicate' })
    expect(sendHook).toHaveBeenCalledTimes(1)
  })

  it('ISL-RESP-004 rejects allow_always when Adapter does not declare it', async () => {
    const { coordinator } = setup()
    const result = await coordinator.submit({ interactionId: 'interaction-A', terminalSessionId: 'tab-A', revision: 1, action: 'allow_always' })
    expect(result).toMatchObject({ ok: false, code: 'unsupported_action' })
  })

  it('ISL-RESP-007 preserves free text including shell characters', async () => {
    const { coordinator, sendHook } = setup()
    const result = await coordinator.submit({
      interactionId: 'interaction-A', terminalSessionId: 'tab-A', revision: 1, action: 'deny', reason: '请检查 `$(echo 不应执行)`',
    })
    expect(result.ok).toBe(true)
    expect(sendHook).toHaveBeenCalledWith(expect.objectContaining({ reason: '请检查 `$(echo 不应执行)`' }), expect.anything())
  })

  it('ISL-RESP-010 marks the card failed when transport rejects', async () => {
    const { coordinator, store } = setup()
    const result = await coordinator.submit({ interactionId: 'interaction-A', terminalSessionId: 'tab-A', revision: 1, action: 'allow_once' })
    expect(result.ok).toBe(true)
    const ackResult = coordinator.handleAck({
      schemaVersion: 1,
      eventId: 'ack-1',
      eventType: 'interaction.ack',
      agentType: 'fake-agent',
      source: 'hook',
      terminalSessionId: 'tab-A',
      agentSessionId: 'agent-A',
      instanceId: 'instance-A',
      channelToken: 'token-A',
      interactionId: 'interaction-A',
      revision: 1,
      occurredAt: Date.now(),
      payload: { interactionId: 'interaction-A', revision: 1, accepted: false, reason: '拒绝执行' },
    })
    expect(ackResult).toMatchObject({ ok: true })
    expect(store.getInteraction('interaction-A')?.status).toBe('failed')
  })

  it('ISL-RESP-014 rejects stale revision', async () => {
    const { coordinator } = setup()
    const result = await coordinator.submit({ interactionId: 'interaction-A', terminalSessionId: 'tab-A', revision: 0, action: 'allow_once' })
    expect(result).toMatchObject({ ok: false, code: 'stale_revision' })
  })

  it('ISL-RESP-013 expires before sending', async () => {
    const store = createSessionStore()
    const registry = createTerminalSessionRegistry()
    registry.register({ terminalSessionId: 'tab-A', instanceId: 'instance-A', channelToken: 'token-A' })
    const adapter = new FakeAgentAdapter()
    store.ingest(permissionEvent(100), adapter)
    const coordinator = createInteractionCoordinator({ store, registry, adapters: [adapter], transport: { sendHook: vi.fn(), writePty: vi.fn() } })
    coordinator.expire(100)
    const result = await coordinator.submit({ interactionId: 'interaction-A', terminalSessionId: 'tab-A', revision: 1, action: 'allow_once' })
    expect(result).toMatchObject({ ok: false, code: 'interaction_not_pending' })
  })

  it('rejects malformed IPC response values and malformed ACK payloads', async () => {
    const { coordinator } = setup()
    expect(await coordinator.submit({ interactionId: 'interaction-A', terminalSessionId: 'tab-A', revision: 1, action: 'deny', value: { unsafe: true } as unknown as string })).toMatchObject({ ok: false, code: 'invalid_response' })
    expect(coordinator.handleAck({
      schemaVersion: 1, eventId: 'ack-bad', eventType: 'interaction.ack', agentType: 'fake-agent', source: 'hook', terminalSessionId: 'tab-A', agentSessionId: 'agent-A', instanceId: 'instance-A', channelToken: 'token-A', interactionId: 'interaction-A', revision: 1, occurredAt: Date.now(), payload: {} as never,
    })).toMatchObject({ ok: false, code: 'invalid_ack' })
  })

  it('rejects an ACK that arrives before the corresponding response', () => {
    const { coordinator } = setup()
    expect(coordinator.handleAck({
      schemaVersion: 1, eventId: 'ack-early', eventType: 'interaction.ack', agentType: 'fake-agent', source: 'hook', terminalSessionId: 'tab-A', agentSessionId: 'agent-A', instanceId: 'instance-A', channelToken: 'token-A', interactionId: 'interaction-A', revision: 1, occurredAt: Date.now(), payload: { interactionId: 'interaction-A', revision: 1, accepted: true },
    })).toMatchObject({ ok: false, code: 'ack_without_response' })
  })

  it('ISL-RESP-011/016 keeps a failed card and permits a later retry', async () => {
    const store = createSessionStore()
    const registry = createTerminalSessionRegistry()
    registry.register({ terminalSessionId: 'tab-A', instanceId: 'instance-A', channelToken: 'token-A' })
    const adapter = new FakeAgentAdapter()
    store.ingest(permissionEvent(), adapter)
    let shouldFail = true
    const coordinator = createInteractionCoordinator({
      store, registry, adapters: [adapter],
      transport: { sendHook: vi.fn(() => { if (shouldFail) throw new Error('连接断开') }), writePty: vi.fn() },
    })
    const response = { interactionId: 'interaction-A', terminalSessionId: 'tab-A', revision: 1, action: 'allow_once' as const }
    expect(await coordinator.submit(response)).toMatchObject({ ok: false, code: 'transport_failed' })
    expect(store.getInteraction('interaction-A')?.status).toBe('failed')
    shouldFail = false
    expect(await coordinator.submit(response)).toMatchObject({ ok: true, status: 'responding' })
  })
})
