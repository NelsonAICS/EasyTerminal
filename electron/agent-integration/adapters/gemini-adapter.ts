import { AgentAdapter, asRecord, asString, capabilityList } from './agent-adapter'
import type { AgentEventEnvelope, InteractionResponse, PendingInteraction } from '../../../src/types/agent-interaction'

const capabilities = {
  observeLifecycle: true,
  observeTools: true,
  approveOnce: true,
  approveAlways: false,
  answerChoice: false,
  answerText: false,
  answerMultiple: false,
  planFeedback: false,
  responseAck: true,
  sendMessage: false,
}

export class GeminiAdapter implements AgentAdapter {
  readonly agentType = 'gemini-cli'
  readonly capabilities = capabilities
  canHandle(event: AgentEventEnvelope): boolean { return event.agentType === this.agentType }
  parseEvent(event: AgentEventEnvelope) {
    const payload = asRecord(event.payload)
    if (!event.interactionId || event.eventType !== 'BeforeTool') return null
    return {
      interactionId: event.interactionId,
      kind: 'permission' as const,
      title: asString(payload.title, 'Gemini 工具审批'),
      ...(asString(payload.command ?? payload.detail) ? { detail: asString(payload.command ?? payload.detail) } : {}),
      options: [],
      capabilities: capabilityList(this.capabilities, 'permission'),
      responseMode: 'hook-response' as const,
      agentCapabilities: this.capabilities,
    }
  }
  serializeResponse(response: InteractionResponse, interaction: PendingInteraction) {
    return { type: 'gemini.response', requestId: interaction.interactionId, action: response.action, revision: interaction.revision }
  }
}
