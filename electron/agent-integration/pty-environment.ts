import { createHash } from 'node:crypto'
import { join } from 'node:path'
import type { TerminalSessionRegistration } from './terminal-session-registry'

export const getTmuxSessionName = (terminalSessionId: string): string => `easy_term_${terminalSessionId}`

/**
 * Unix domain sockets have a small platform-dependent path limit (104 bytes
 * on macOS). Keep the runtime socket in /tmp with a short, unpredictable name
 * instead of combining the long macOS temp directory with a full UUID.
 */
export function buildAgentHookSocketPath(
  instanceId: string,
  platform: NodeJS.Platform,
): string {
  if (platform === 'win32') return `\\\\.\\pipe\\easy-terminal-${instanceId}`
  const suffix = createHash('sha256').update(instanceId).digest('hex').slice(0, 16)
  return join('/tmp', `et-${suffix}.sock`)
}

/**
 * Resolve the shell used by the interactive terminal. GUI-launched macOS apps
 * often do not receive SHELL from the parent process, so falling back to bash
 * silently skips the user's zsh profile and tools such as Claude Code.
 */
export function resolveTerminalShell(platform: NodeJS.Platform, environment: NodeJS.ProcessEnv): string {
  if (platform === 'win32') return environment.ComSpec || 'powershell.exe'
  return environment.SHELL?.trim() || (platform === 'darwin' ? '/bin/zsh' : '/bin/bash')
}

export function buildAgentEnvironment(
  baseEnvironment: NodeJS.ProcessEnv,
  registration: Pick<TerminalSessionRegistration, 'terminalSessionId' | 'channelToken' | 'instanceId'>,
  hookSocket: string,
  shellPath?: string,
): Record<string, string> {
  const environment: Record<string, string> = {}
  for (const [key, value] of Object.entries(baseEnvironment)) {
    if (typeof value === 'string') environment[key] = value
  }
  environment.EASYTERMINAL_TERMINAL_SESSION_ID = registration.terminalSessionId
  environment.EASYTERMINAL_CHANNEL_TOKEN = registration.channelToken
  environment.EASYTERMINAL_HOOK_SOCKET = hookSocket
  environment.EASYTERMINAL_INSTANCE_ID = registration.instanceId
  if (shellPath) environment.SHELL = shellPath
  return environment
}
