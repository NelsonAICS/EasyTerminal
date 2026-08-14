import type { AgentCapability, AgentInteractionStatus, InteractionOption, PendingInteraction } from '../../types/agent-interaction'

export type IslandInteraction = PendingInteraction
export type IslandStatus = AgentInteractionStatus | 'notice'

export interface IslandNotice {
  id: string
  title: string
  detail: string
  tone?: 'info' | 'success' | 'warning' | 'error'
}

export interface InteractionSubmit {
  interactionId: string
  terminalSessionId: string
  revision: number
  action: AgentCapability
  value?: string | string[]
  reason?: string
}

type IslandIpcListener = (...args: unknown[]) => void

export type IslandIpc = {
  send: (channel: string, ...args: unknown[]) => void
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  on: (channel: string, listener: IslandIpcListener) => void
  removeListener: (channel: string, listener: IslandIpcListener) => void
  once: (channel: string, listener: IslandIpcListener) => void
}

export const isInteractiveStatus = (status: AgentInteractionStatus): boolean =>
  status === 'pending' || status === 'failed'

export const sourceLabel = (interaction: IslandInteraction): string => {
  if (interaction.responseMode === 'view-only') return '仅查看'
  if (interaction.source === 'terminal-fallback' || interaction.responseMode === 'pty-input') return '兼容模式'
  if (interaction.source === 'hook' || interaction.source === 'native-tool') return '已验证'
  return '插件事件'
}

export const kindLabel = (kind: IslandInteraction['kind']): string => ({
  permission: '权限请求',
  question: '需要回答',
  plan: '计划确认',
  notification: '通知',
  completion: '已完成',
}[kind])

export type { AgentCapability, AgentInteractionStatus, InteractionOption, PendingInteraction }
