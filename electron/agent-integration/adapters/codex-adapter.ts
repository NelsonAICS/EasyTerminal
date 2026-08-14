import type { AgentEventEnvelope, InteractionResponse, PendingInteraction } from '../../../src/types/agent-interaction'
import { AgentAdapter, asRecord, asString, capabilityList, normalizeOptions } from './agent-adapter'

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

export class CodexAdapter implements AgentAdapter {
  readonly agentType = 'codex-cli'
  readonly capabilities = capabilities

  canHandle(event: AgentEventEnvelope): boolean {
    return event.agentType === this.agentType
  }

  parseEvent(event: AgentEventEnvelope) {
    const payload = asRecord(event.payload)
    if (['SessionStart', 'TurnStarted', 'TaskStarted', 'TurnCompleted', 'SessionEnd'].includes(event.eventType)) return null
    if (!event.interactionId) return null

    const kind = event.eventType === 'CommandApproval' || event.eventType === 'ToolApproval' ? 'permission'
      : event.eventType === 'request_user_input' ? 'question'
        : event.eventType === 'PlanReview' ? 'plan' : null
    if (!kind) return null
    const capabilitiesForEvent = capabilityList(this.capabilities, kind).filter(capability => capability !== 'allow_always' && (capability !== 'answer_multiple' || payload.multiSelect === true || payload.multiple === true))
    return {
      interactionId: event.interactionId,
      kind,
      title: asString(payload.title, kind === 'permission' ? '命令执行审批' : 'Codex 需要你的回答'),
      ...(asString(payload.command ?? payload.detail) ? { detail: asString(payload.command ?? payload.detail) } : {}),
      options: normalizeOptions(payload.options ?? payload.questions),
      capabilities: capabilitiesForEvent,
      responseMode: event.source === 'terminal-fallback' ? 'pty-input' as const : 'hook-response' as const,
      ...(event.toolCallId || asString(payload.callId) ? { toolCallId: asString(payload.callId, event.toolCallId) } : {}),
      agentCapabilities: this.capabilities,
    }
  }

  serializeResponse(response: InteractionResponse, interaction: PendingInteraction) {
    return {
      type: 'codex.response',
      callId: interaction.toolCallId,
      interactionId: interaction.interactionId,
      revision: interaction.revision,
      action: response.action,
      ...(response.value !== undefined ? { answers: response.value } : {}),
      ...(response.reason !== undefined ? { reason: response.reason } : {}),
    }
  }
}
