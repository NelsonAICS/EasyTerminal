import type { TerminalSessionRegistration } from './terminal-session-registry'

export const getTmuxSessionName = (terminalSessionId: string): string => `easy_term_${terminalSessionId}`

export function buildAgentEnvironment(
  baseEnvironment: NodeJS.ProcessEnv,
  registration: Pick<TerminalSessionRegistration, 'terminalSessionId' | 'channelToken' | 'instanceId'>,
  hookSocket: string,
): Record<string, string> {
  const environment: Record<string, string> = {}
  for (const [key, value] of Object.entries(baseEnvironment)) {
    if (typeof value === 'string') environment[key] = value
  }
  environment.EASYTERMINAL_TERMINAL_SESSION_ID = registration.terminalSessionId
  environment.EASYTERMINAL_CHANNEL_TOKEN = registration.channelToken
  environment.EASYTERMINAL_HOOK_SOCKET = hookSocket
  environment.EASYTERMINAL_INSTANCE_ID = registration.instanceId
  return environment
}
