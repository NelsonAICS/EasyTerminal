import type { AgentEventEnvelope, InteractionResponse, PendingInteraction } from '../../../src/types/agent-interaction'
import {
  AgentAdapter,
  asRecord,
  asString,
  capabilityList,
  normalizeOptions,
} from './agent-adapter'

const capabilities = {
  observeLifecycle: true,
  observeTools: true,
  approveOnce: true,
  approveAlways: false,
  answerChoice: true,
  answerText: true,
  answerMultiple: true,
  planFeedback: true,
  responseAck: true,
  sendMessage: true,
}

export class FakeAgentAdapter implements AgentAdapter {
  readonly agentType = 'fake-agent'
  readonly capabilities = capabilities

  canHandle(event: AgentEventEnvelope): boolean {
    return event.agentType === this.agentType
  }

  parseEvent(event: AgentEventEnvelope) {
    const payload = asRecord(event.payload)
    const type = event.eventType
    if (type === 'session.started' || type === 'session.processing' || type === 'session.completed' || type === 'session.error') return null

    const kind = type.endsWith('.permission') ? 'permission'
      : type.endsWith('.question') ? 'question'
        : type.endsWith('.plan') ? 'plan'
          : type.endsWith('.completion') ? 'completion' : null
    if (!kind || !event.interactionId) return null

    const interactionCapabilities = capabilityList(this.capabilities, kind)
    const requested = Array.isArray(payload.capabilities) ? payload.capabilities.filter((value): value is string => typeof value === 'string') : []
    const filteredCapabilities = requested.length > 0
      ? interactionCapabilities.filter(capability => requested.includes(capability))
      : interactionCapabilities
    return {
      interactionId: event.interactionId,
      kind,
      title: asString(payload.title, kind === 'permission' ? '需要用户确认' : '需要用户输入'),
      ...(asString(payload.detail) ? { detail: asString(payload.detail) } : {}),
      options: normalizeOptions(payload.options),
      capabilities: filteredCapabilities,
      responseMode: 'hook-response' as const,
      ...(event.toolCallId ? { toolCallId: event.toolCallId } : {}),
      ...(Number.isFinite(payload.expiresAt) ? { expiresAt: payload.expiresAt as number } : {}),
      agentCapabilities: this.capabilities,
    }
  }

  serializeResponse(response: InteractionResponse, interaction: PendingInteraction) {
    return {
      type: 'interaction.response',
      interactionId: interaction.interactionId,
      revision: interaction.revision,
      action: response.action,
      ...(response.value !== undefined ? { value: response.value } : {}),
      ...(response.reason !== undefined ? { reason: response.reason } : {}),
    }
  }
}
