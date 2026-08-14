import { AgentAdapter, DEFAULT_CAPABILITIES, asRecord, asString } from './agent-adapter'
import type { AgentEventEnvelope, InteractionResponse, PendingInteraction } from '../../../src/types/agent-interaction'

export class TerminalFallbackAdapter implements AgentAdapter {
  readonly agentType = 'terminal-fallback'
  readonly capabilities = { ...DEFAULT_CAPABILITIES }
  canHandle(event: AgentEventEnvelope): boolean { return event.agentType === this.agentType && event.source === 'terminal-fallback' }
  parseEvent(event: AgentEventEnvelope) {
    const payload = asRecord(event.payload)
    if (!event.interactionId) return null
    return {
      interactionId: event.interactionId,
      kind: 'notification' as const,
      title: asString(payload.title, '终端中有待处理内容'),
      ...(asString(payload.detail) ? { detail: asString(payload.detail) } : {}),
      options: [],
      capabilities: ['jump_to_terminal' as const],
      responseMode: 'view-only' as const,
      agentCapabilities: this.capabilities,
    }
  }
  serializeResponse(response: InteractionResponse, interaction: PendingInteraction): unknown {
    void response
    void interaction
    return null
  }
}
