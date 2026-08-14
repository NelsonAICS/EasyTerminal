export type AgentInteractionKind =
  | 'permission'
  | 'question'
  | 'plan'
  | 'notification'
  | 'completion'

export type AgentEventSource = 'hook' | 'plugin' | 'native-tool' | 'terminal-fallback'

export type InteractionResponseMode = 'hook-response' | 'pty-input' | 'view-only'

export type AgentInteractionStatus =
  | 'pending'
  | 'responding'
  | 'acknowledged'
  | 'failed'
  | 'expired'
  | 'cancelled'

export type AgentCapability =
  | 'allow_once'
  | 'allow_always'
  | 'deny'
  | 'answer_options'
  | 'answer_text'
  | 'answer_multiple'
  | 'plan_feedback'
  | 'accept_plan'
  | 'send_message'
  | 'jump_to_terminal'

export interface AgentCapabilities {
  observeLifecycle: boolean
  observeTools: boolean
  approveOnce: boolean
  approveAlways: boolean
  answerChoice: boolean
  answerText: boolean
  answerMultiple: boolean
  planFeedback: boolean
  responseAck: boolean
  sendMessage: boolean
}

export interface InteractionOption {
  value: string
  label: string
  description?: string
  selected?: boolean
  disabled?: boolean
}

export interface AgentEventEnvelope<T = unknown> {
  schemaVersion: 1
  eventId: string
  eventType: string
  agentType: string
  source: AgentEventSource
  terminalSessionId: string
  agentSessionId: string
  instanceId: string
  channelToken: string
  interactionId?: string
  toolCallId?: string
  revision: number
  occurredAt: number
  payload: T
}

export interface PendingInteraction {
  interactionId: string
  terminalSessionId: string
  terminalSessionName?: string
  agentSessionId: string
  agentType: string
  kind: AgentInteractionKind
  revision: number
  status: AgentInteractionStatus
  title: string
  detail?: string
  options: InteractionOption[]
  capabilities: AgentCapability[]
  responseMode: InteractionResponseMode
  createdAt: number
  expiresAt?: number
  source: AgentEventSource
  toolCallId?: string
  agentCapabilities: AgentCapabilities
}

export interface InteractionResponse {
  interactionId: string
  terminalSessionId: string
  revision: number
  action: AgentCapability
  value?: string | string[]
  reason?: string
}

export interface AgentAck {
  interactionId: string
  revision: number
  accepted: boolean
  reason?: string
}
