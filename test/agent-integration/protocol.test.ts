import { describe, expect, it } from 'vitest'
import { validateEventEnvelope, PROTOCOL_LIMITS } from '../../electron/agent-integration/protocol-validator'

const validEvent = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  eventId: 'event-1',
  eventType: 'interaction.permission',
  agentType: 'fake-agent',
  source: 'hook',
  terminalSessionId: 'tab-A',
  agentSessionId: 'agent-A',
  instanceId: 'instance-A',
  channelToken: 'token-A',
  interactionId: 'interaction-A',
  revision: 1,
  occurredAt: Date.now(),
  payload: { title: 'Approve command' },
  ...overrides,
})

describe('agent event protocol validation', () => {
  it('ISL-UNIT-001 accepts a complete valid envelope', () => {
    const result = validateEventEnvelope(validEvent())
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.terminalSessionId).toBe('tab-A')
  })

  it('ISL-UNIT-002 rejects a missing schemaVersion', () => {
    const result = validateEventEnvelope(validEvent({ schemaVersion: undefined }))
    expect(result).toMatchObject({ ok: false, code: 'invalid_schema', field: 'schemaVersion' })
  })

  it('ISL-UNIT-008 rejects oversized identifiers', () => {
    const result = validateEventEnvelope(validEvent({ eventId: 'x'.repeat(PROTOCOL_LIMITS.eventId + 1) }))
    expect(result).toMatchObject({ ok: false, code: 'field_too_long', field: 'eventId' })
  })

  it('ISL-UNIT-009 rejects an oversized payload', () => {
    const result = validateEventEnvelope(validEvent({ payload: { text: 'x'.repeat(PROTOCOL_LIMITS.payloadBytes) } }))
    expect(result).toMatchObject({ ok: false, code: 'payload_too_large', field: 'payload' })
  })

  it('ISL-UNIT-010 rejects prototype-pollution keys', () => {
    const payload = JSON.parse('{"__proto__":{"polluted":true}}')
    const result = validateEventEnvelope(validEvent({ payload }))
    expect(result).toMatchObject({ ok: false, code: 'unsafe_payload' })
    expect((Object.prototype as { polluted?: boolean }).polluted).toBeUndefined()
  })
})
