import type {
  AgentCapabilities,
  AgentCapability,
  AgentEventEnvelope,
  InteractionResponse,
  PendingInteraction,
} from '../../../src/types/agent-interaction'

export interface AdapterInteraction {
  interactionId: string
  kind: PendingInteraction['kind']
  title: string
  detail?: string
  options: PendingInteraction['options']
  capabilities: AgentCapability[]
  responseMode: PendingInteraction['responseMode']
  toolCallId?: string
  expiresAt?: number
  agentCapabilities: AgentCapabilities
}

export interface AgentAdapter {
  readonly agentType: string
  readonly capabilities: AgentCapabilities
  canHandle(event: AgentEventEnvelope): boolean
  parseEvent(event: AgentEventEnvelope): AdapterInteraction | null
  serializeResponse(response: InteractionResponse, interaction: PendingInteraction): unknown
}

export const DEFAULT_CAPABILITIES: AgentCapabilities = {
  observeLifecycle: true,
  observeTools: false,
  approveOnce: false,
  approveAlways: false,
  answerChoice: false,
  answerText: false,
  answerMultiple: false,
  planFeedback: false,
  responseAck: false,
  sendMessage: false,
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const asRecord = (value: unknown): Record<string, unknown> => isRecord(value) ? value : {}

export const asString = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : fallback

export const asBoolean = (value: unknown, fallback = false): boolean => typeof value === 'boolean' ? value : fallback

export const normalizeOptions = (value: unknown) => {
  if (!Array.isArray(value)) return []
  return value.flatMap((item, index) => {
    const option = asRecord(item)
    const optionValue = asString(option.value ?? option.id ?? option.key, String(index + 1))
    const label = asString(option.label ?? option.title ?? option.text, optionValue)
    if (!label) return []
    return [{
      value: optionValue,
      label,
      ...(asString(option.description) ? { description: asString(option.description) } : {}),
      ...(typeof option.selected === 'boolean' ? { selected: option.selected } : {}),
    }]
  })
}

export const capabilityList = (capabilities: AgentCapabilities, kind: PendingInteraction['kind']): AgentCapability[] => {
  const result: AgentCapability[] = ['jump_to_terminal']
  if (kind === 'permission') {
    if (capabilities.approveOnce) result.push('allow_once')
    if (capabilities.approveAlways) result.push('allow_always')
    if (capabilities.approveOnce || capabilities.approveAlways) result.push('deny')
  }
  if (kind === 'question') {
    if (capabilities.answerChoice) result.push('answer_options')
    if (capabilities.answerMultiple) result.push('answer_multiple')
    if (capabilities.answerText) result.push('answer_text')
  }
  if (kind === 'plan') {
    if (capabilities.planFeedback) result.push('plan_feedback')
    if (capabilities.answerText && capabilities.planFeedback) result.push('accept_plan')
  }
  if (kind === 'completion' && capabilities.sendMessage) result.push('send_message')
  return result
}
