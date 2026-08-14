import type { AgentAdapter } from './adapters/agent-adapter'
import type { TerminalSessionRegistry } from './terminal-session-registry'
import type { AgentAck, AgentEventEnvelope, AgentCapability, InteractionResponse, PendingInteraction } from '../../src/types/agent-interaction'
import type { SessionStore } from './session-store'

export interface InteractionTransport {
  sendHook: (payload: unknown, interaction: PendingInteraction) => Promise<void> | void
  writePty: (terminalSessionId: string, payload: unknown, interaction: PendingInteraction) => Promise<void> | void
}

export type CoordinatorResult =
  | { ok: true; status: 'responding'; interaction: PendingInteraction }
  | { ok: true; status: 'acknowledged' | 'failed'; interaction: PendingInteraction }
  | { ok: false; code: string; message: string; interaction?: PendingInteraction }

export interface InteractionCoordinator {
  submit(response: InteractionResponse): Promise<CoordinatorResult>
  handleAck(input: AgentEventEnvelope<AgentAck>): CoordinatorResult
  expire(now?: number): string[]
}

const requiresValue = (action: AgentCapability): boolean =>
  ['answer_options', 'answer_multiple', 'answer_text', 'plan_feedback', 'send_message'].includes(action)

const hasCapability = (interaction: PendingInteraction, action: AgentCapability): boolean =>
  interaction.capabilities.includes(action)

export function createInteractionCoordinator(options: {
  store: SessionStore
  registry: TerminalSessionRegistry
  adapters: AgentAdapter[]
  transport: InteractionTransport
  onStateChange?: (interaction: PendingInteraction) => void
}): InteractionCoordinator {
  const findAdapter = (interaction: PendingInteraction) => options.adapters.find(adapter => adapter.agentType === interaction.agentType)

  return {
    async submit(response) {
      if (!response || typeof response !== 'object' || typeof response.interactionId !== 'string' || typeof response.terminalSessionId !== 'string' || !Number.isSafeInteger(response.revision) || typeof response.action !== 'string') {
        return { ok: false, code: 'invalid_response', message: '响应格式不合法' }
      }
      if (response.value !== undefined && !(typeof response.value === 'string' || (Array.isArray(response.value) && response.value.every(item => typeof item === 'string')))) {
        return { ok: false, code: 'invalid_response', message: '响应值必须是字符串或字符串数组' }
      }
      if (response.reason !== undefined && typeof response.reason !== 'string') {
        return { ok: false, code: 'invalid_response', message: '拒绝原因必须是字符串' }
      }
      const interaction = options.store.getInteraction(response.interactionId)
      if (!interaction) return { ok: false, code: 'interaction_not_found', message: '交互不存在或已关闭' }
      if (response.action === 'jump_to_terminal') return { ok: false, code: 'ui_only_action', message: '返回终端不是 Agent 响应动作', interaction }
      if (interaction.terminalSessionId !== response.terminalSessionId) return { ok: false, code: 'session_mismatch', message: '交互不属于当前终端标签页', interaction }
      if (interaction.revision !== response.revision) return { ok: false, code: 'stale_revision', message: '交互内容已更新，请重新确认', interaction }
      if (!hasCapability(interaction, response.action)) return { ok: false, code: 'unsupported_action', message: '当前 Agent 不支持该操作', interaction }
      if (requiresValue(response.action) && response.value === undefined) return { ok: false, code: 'missing_value', message: '该操作需要输入内容', interaction }

      const transition = options.store.markResponding(response.interactionId)
      if (!transition.ok) return { ok: false, code: transition.reason, message: transition.reason === 'duplicate' ? '该操作正在发送中' : '交互当前不可操作', interaction }
      const responding = transition.interaction
      const adapter = findAdapter(responding)
      if (!adapter) {
        const failed = options.store.markFailed(responding.interactionId, '未找到匹配的 Agent Adapter')
        if (failed) options.onStateChange?.(failed)
        return { ok: false, code: 'adapter_unavailable', message: '无法安全回传到该 Agent', interaction: failed }
      }

      const payload = adapter.serializeResponse(response, responding)
      try {
        if (responding.responseMode === 'view-only') throw new Error('view_only')
        if (responding.responseMode === 'pty-input') {
          const registration = options.registry.get(responding.terminalSessionId)
          if (!registration?.alive || !registration.pty) throw new Error('session_closed')
          await options.transport.writePty(responding.terminalSessionId, payload, responding)
        } else {
          await options.transport.sendHook(payload, responding)
        }
        options.onStateChange?.(responding)
        return { ok: true, status: 'responding', interaction: responding }
      } catch (error: unknown) {
        const reason = error instanceof Error && error.message === 'session_closed'
          ? 'EasyTerminal 标签页已关闭'
          : error instanceof Error && error.message === 'view_only'
            ? '该交互仅支持查看，请返回终端处理'
            : error instanceof Error ? error.message : '回传失败'
        const failed = options.store.markFailed(responding.interactionId, reason)
        if (failed) options.onStateChange?.(failed)
        return { ok: false, code: error instanceof Error && error.message === 'session_closed' ? 'session_closed' : 'transport_failed', message: reason, interaction: failed }
      }
    },

    handleAck(input) {
      if (!input.payload || typeof input.payload !== 'object' || typeof input.payload.accepted !== 'boolean') {
        return { ok: false, code: 'invalid_ack', message: 'ACK payload 格式不合法' }
      }
      const registration = options.registry.authenticate(input.terminalSessionId, input.instanceId, input.channelToken)
      if (!registration) return { ok: false, code: 'unauthorized_session', message: 'ACK 来源不是当前 EasyTerminal PTY' }
      const interactionId = input.interactionId
      if (!interactionId) return { ok: false, code: 'invalid_ack', message: 'ACK 缺少 interactionId' }
      const interaction = options.store.getInteraction(interactionId)
      if (!interaction) return { ok: false, code: 'interaction_not_found', message: 'ACK 对应的交互不存在' }
      if (interaction.terminalSessionId !== input.terminalSessionId || interaction.revision !== input.revision) {
        return { ok: false, code: 'stale_revision', message: 'ACK 版本已过期', interaction }
      }
      if (interaction.status !== 'responding') {
        return { ok: false, code: 'ack_without_response', message: 'ACK 未对应正在发送的响应', interaction }
      }
      const next = input.payload.accepted
        ? options.store.markAcknowledged(interactionId)
        : options.store.markFailed(interactionId, input.payload.reason ?? 'Agent 拒绝了该响应')
      if (!next) return { ok: false, code: 'interaction_not_found', message: '交互已被清理' }
      options.onStateChange?.(next)
      return { ok: true, status: input.payload.accepted ? 'acknowledged' : 'failed', interaction: next }
    },

    expire(now = Date.now()) {
      const expiredIds = options.store.markExpired(now)
      for (const interactionId of expiredIds) {
        const interaction = options.store.getInteraction(interactionId)
        if (interaction) options.onStateChange?.(interaction)
      }
      return expiredIds
    },
  }
}
