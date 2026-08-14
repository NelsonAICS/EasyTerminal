import { AgentAdapter, asRecord, asString, capabilityList, normalizeOptions } from './agent-adapter'
import type { AgentEventEnvelope, InteractionResponse, PendingInteraction } from '../../../src/types/agent-interaction'

const capabilities = {
  observeLifecycle: true,
  observeTools: true,
  approveOnce: true,
  approveAlways: false,
  answerChoice: true,
  answerText: true,
  answerMultiple: true,
  planFeedback: false,
  responseAck: true,
  sendMessage: false,
}

export class OpenCodeAdapter implements AgentAdapter {
  readonly agentType = 'opencode'
  readonly capabilities = capabilities
  canHandle(event: AgentEventEnvelope): boolean { return event.agentType === this.agentType }
  parseEvent(event: AgentEventEnvelope) {
    const payload = asRecord(event.payload)
    if (!event.interactionId) return null
    const kind = event.eventType === 'PermissionRequest' ? 'permission' : event.eventType === 'AskUserQuestion' ? 'question' : null
    if (!kind) return null
    const capabilitiesForEvent = capabilityList(this.capabilities, kind).filter(capability => capability !== 'allow_always' && (capability !== 'answer_multiple' || payload.multiSelect === true || payload.multiple === true))
    return {
      interactionId: event.interactionId,
      kind,
      title: asString(payload.title, kind === 'permission' ? 'OpenCode 权限请求' : 'OpenCode 问题'),
      ...(asString(payload.detail) ? { detail: asString(payload.detail) } : {}),
      options: normalizeOptions(payload.options),
      capabilities: capabilitiesForEvent,
      responseMode: 'hook-response' as const,
      agentCapabilities: this.capabilities,
    }
  }
  serializeResponse(response: InteractionResponse, interaction: PendingInteraction) {
    return { type: 'opencode.response', requestId: interaction.interactionId, updatedInput: response.value, action: response.action, revision: interaction.revision }
  }
}
