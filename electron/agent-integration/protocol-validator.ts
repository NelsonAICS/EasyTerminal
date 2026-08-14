import type { AgentEventEnvelope, AgentEventSource } from '../../src/types/agent-interaction'

export const PROTOCOL_LIMITS = {
  eventId: 256,
  eventType: 128,
  agentType: 128,
  sessionId: 256,
  token: 512,
  interactionId: 256,
  toolCallId: 256,
  payloadBytes: 256 * 1024,
} as const

export type ProtocolErrorCode =
  | 'invalid_schema'
  | 'invalid_field'
  | 'field_too_long'
  | 'payload_too_large'
  | 'unsafe_payload'

export interface ProtocolValidationError {
  ok: false
  code: ProtocolErrorCode
  field?: string
  message: string
}

export interface ProtocolValidationSuccess<T> {
  ok: true
  value: AgentEventEnvelope<T>
}

export type ProtocolValidationResult<T> = ProtocolValidationSuccess<T> | ProtocolValidationError

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const hasUnsafeKey = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(hasUnsafeKey)
  if (!isRecord(value)) return false
  for (const key of Object.keys(value)) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') return true
    if (hasUnsafeKey(value[key])) return true
  }
  return false
}

const fail = (code: ProtocolErrorCode, message: string, field?: string): ProtocolValidationError => ({
  ok: false,
  code,
  ...(field ? { field } : {}),
  message,
})

const requiredString = (
  input: Record<string, unknown>,
  field: string,
  maxLength: number,
): ProtocolValidationError | string => {
  const value = input[field]
  if (typeof value !== 'string' || value.length === 0) return fail('invalid_field', `${field} must be a non-empty string`, field)
  if (value.length > maxLength) return fail('field_too_long', `${field} exceeds ${maxLength} characters`, field)
  return value
}

export function validateEventEnvelope<T = unknown>(input: unknown): ProtocolValidationResult<T> {
  if (!isRecord(input)) return fail('invalid_schema', 'event envelope must be an object')
  if (hasUnsafeKey(input)) return fail('unsafe_payload', 'event contains an unsafe object key')
  if (input.schemaVersion !== 1) return fail('invalid_schema', 'schemaVersion must equal 1', 'schemaVersion')

  const stringFields: Array<[string, number]> = [
    ['eventId', PROTOCOL_LIMITS.eventId],
    ['eventType', PROTOCOL_LIMITS.eventType],
    ['agentType', PROTOCOL_LIMITS.agentType],
    ['terminalSessionId', PROTOCOL_LIMITS.sessionId],
    ['agentSessionId', PROTOCOL_LIMITS.sessionId],
    ['instanceId', PROTOCOL_LIMITS.sessionId],
    ['channelToken', PROTOCOL_LIMITS.token],
  ]
  for (const [field, maxLength] of stringFields) {
    const result = requiredString(input, field, maxLength)
    if (typeof result !== 'string') return result
  }

  if (!['hook', 'plugin', 'native-tool', 'terminal-fallback'].includes(input.source as string)) {
    return fail('invalid_field', 'source is not a supported event source', 'source')
  }
  for (const field of ['interactionId', 'toolCallId']) {
    if (input[field] !== undefined) {
      const limit = field === 'interactionId' ? PROTOCOL_LIMITS.interactionId : PROTOCOL_LIMITS.toolCallId
      const result = requiredString(input, field, limit)
      if (typeof result !== 'string') return result
    }
  }
  if (!Number.isSafeInteger(input.revision) || (input.revision as number) < 0) {
    return fail('invalid_field', 'revision must be a non-negative safe integer', 'revision')
  }
  if (!Number.isFinite(input.occurredAt) || (input.occurredAt as number) <= 0) {
    return fail('invalid_field', 'occurredAt must be a positive timestamp', 'occurredAt')
  }
  if (!Object.prototype.hasOwnProperty.call(input, 'payload')) return fail('invalid_schema', 'payload is required', 'payload')

  let payloadBytes: number
  try {
    payloadBytes = Buffer.byteLength(JSON.stringify(input.payload), 'utf8')
  } catch {
    return fail('invalid_field', 'payload must be JSON serializable', 'payload')
  }
  if (payloadBytes > PROTOCOL_LIMITS.payloadBytes) return fail('payload_too_large', `payload exceeds ${PROTOCOL_LIMITS.payloadBytes} bytes`, 'payload')

  return { ok: true, value: input as AgentEventEnvelope<T> }
}

export function isAgentEventSource(value: string): value is AgentEventSource {
  return ['hook', 'plugin', 'native-tool', 'terminal-fallback'].includes(value)
}
