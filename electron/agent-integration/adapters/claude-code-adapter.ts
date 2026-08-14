import type { AgentEventEnvelope, InteractionResponse, PendingInteraction } from '../../../src/types/agent-interaction'
import {
  AgentAdapter,
  asBoolean,
  asRecord,
  asString,
  capabilityList,
  normalizeOptions,
} from './agent-adapter'

const capabilities = {
  observeLifecycle: true,
  observeTools: true,
  approveOnce: true,
  approveAlways: true,
  answerChoice: true,
  answerText: true,
  answerMultiple: true,
  planFeedback: true,
  responseAck: true,
  sendMessage: false,
}

export class ClaudeCodeAdapter implements AgentAdapter {
  readonly agentType = 'claude-code'
  readonly capabilities = capabilities

  canHandle(event: AgentEventEnvelope): boolean {
    return event.agentType === this.agentType
  }

  parseEvent(event: AgentEventEnvelope) {
    const payload = asRecord(event.payload)
    if (['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'Stop', 'SessionEnd'].includes(event.eventType)) return null
    if (!event.interactionId) return null

    const kind = event.eventType === 'PermissionRequest' || event.eventType === 'PreToolUse' ? 'permission'
      : event.eventType === 'AskUserQuestion' ? 'question'
        : event.eventType === 'PlanApproval' ? 'plan' : null
    if (!kind) return null

    const interactionCapabilities = capabilityList(this.capabilities, kind)
    // Older Claude hook versions can be configured as single-approval only.
    // The adapter never upgrades the event beyond the explicit payload claim.
    const allowAlways = asBoolean(payload.allowAlways, this.capabilities.approveAlways)
    const filteredCapabilities = interactionCapabilities.filter(capability => {
      if (capability === 'allow_always') return allowAlways
      if (capability === 'answer_multiple') return payload.multiSelect === true || payload.multiple === true
      return true
    })
    return {
      interactionId: event.interactionId,
      kind,
      title: asString(payload.title, kind === 'permission' ? '请求执行工具' : kind === 'plan' ? '计划确认' : '需要回答问题'),
      ...(asString(payload.detail ?? payload.toolInput ?? payload.command) ? { detail: asString(payload.detail ?? payload.toolInput ?? payload.command) } : {}),
      options: normalizeOptions(payload.options ?? payload.questions),
      capabilities: filteredCapabilities,
      responseMode: 'hook-response' as const,
      ...(asString(payload.toolCallId) || event.toolCallId ? { toolCallId: asString(payload.toolCallId, event.toolCallId) } : {}),
      agentCapabilities: this.capabilities,
    }
  }

  serializeResponse(response: InteractionResponse, interaction: PendingInteraction) {
    const action = response.action === 'allow_once' ? 'allow'
      : response.action === 'allow_always' ? 'allow_always'
        : response.action === 'deny' ? 'deny'
          : response.action
    return {
      hook: 'claude-code',
      type: 'response',
      interactionId: interaction.interactionId,
      toolCallId: interaction.toolCallId,
      revision: interaction.revision,
      action,
      ...(response.value !== undefined ? { value: response.value } : {}),
      ...(response.reason !== undefined ? { reason: response.reason } : {}),
    }
  }
}
