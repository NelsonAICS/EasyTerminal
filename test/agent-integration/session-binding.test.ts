import { describe, expect, it } from 'vitest'
import {
  createChannelToken,
  createInstanceId,
  createTerminalSessionRegistry,
} from '../../electron/agent-integration/terminal-session-registry'
import { buildAgentEnvironment, buildAgentHookSocketPath, getTmuxSessionName, resolveTerminalShell } from '../../electron/agent-integration/pty-environment'

describe('EasyTerminal terminal session identity', () => {
  it('ISL-BIND-001 creates unique identity material for a tab', () => {
    const registry = createTerminalSessionRegistry()
    const registration = registry.register({ terminalSessionId: 'tab-A', instanceId: createInstanceId(), label: 'Frontend' })

    expect(registration.channelToken).toHaveLength(64)
    expect(registration.instanceId).toMatch(/^easy-instance-/)
    expect(registry.authenticate('tab-A', registration.instanceId, registration.channelToken)).toBe(registration)
  })

  it('ISL-BIND-002 keeps two tabs isolated', () => {
    const registry = createTerminalSessionRegistry()
    const a = registry.register({ terminalSessionId: 'tab-A', instanceId: 'instance-A' })
    const b = registry.register({ terminalSessionId: 'tab-B', instanceId: 'instance-A' })

    expect(registry.authenticate('tab-A', 'instance-A', a.channelToken)?.terminalSessionId).toBe('tab-A')
    expect(registry.authenticate('tab-B', 'instance-A', a.channelToken)).toBeUndefined()
    expect(registry.authenticate('tab-A', 'instance-A', b.channelToken)).toBeUndefined()
  })

  it('ISL-BIND-005 invalidates a closed tab and rejects its old token', () => {
    const registry = createTerminalSessionRegistry()
    const registration = registry.register({ terminalSessionId: 'tab-A', instanceId: 'instance-A' })

    expect(registry.invalidate('tab-A')).toBe(true)
    expect(registry.authenticate('tab-A', 'instance-A', registration.channelToken)).toBeUndefined()
  })

  it('ISL-BIND-006 rotates token when a tab identity is registered again', () => {
    const registry = createTerminalSessionRegistry()
    const first = registry.register({ terminalSessionId: 'tab-A', instanceId: 'instance-A' })
    const second = registry.register({ terminalSessionId: 'tab-A', instanceId: 'instance-A' })

    expect(second.channelToken).not.toBe(first.channelToken)
    expect(registry.authenticate('tab-A', 'instance-A', first.channelToken)).toBeUndefined()
    expect(registry.authenticate('tab-A', 'instance-A', second.channelToken)).toBe(second)
  })

  it('ISL-BIND-007/008 derives stable tmux names and injects all four variables', () => {
    const registration = {
      terminalSessionId: 'tab-A',
      channelToken: createChannelToken(),
      instanceId: 'instance-A',
    }
    const environment = buildAgentEnvironment({ PATH: '/usr/bin', EMPTY: undefined }, registration, '/tmp/easy.sock')

    expect(getTmuxSessionName('tab-A')).toBe('easy_term_tab-A')
    expect(environment).toMatchObject({
      PATH: '/usr/bin',
      EASYTERMINAL_TERMINAL_SESSION_ID: 'tab-A',
      EASYTERMINAL_CHANNEL_TOKEN: registration.channelToken,
      EASYTERMINAL_HOOK_SOCKET: '/tmp/easy.sock',
      EASYTERMINAL_INSTANCE_ID: 'instance-A',
    })
    expect(environment.EMPTY).toBeUndefined()
  })

  it('uses zsh when a GUI-launched macOS process has no SHELL', () => {
    expect(resolveTerminalShell('darwin', {})).toBe('/bin/zsh')
    expect(resolveTerminalShell('darwin', { SHELL: '/custom/zsh' })).toBe('/custom/zsh')
    expect(resolveTerminalShell('win32', {})).toBe('powershell.exe')
  })

  it('pins the PTY SHELL when the resolved shell is explicit', () => {
    const registration = {
      terminalSessionId: 'tab-A',
      channelToken: createChannelToken(),
      instanceId: 'instance-A',
    }
    const environment = buildAgentEnvironment({ SHELL: '/bin/bash' }, registration, '/tmp/easy.sock', '/bin/zsh')
    expect(environment.SHELL).toBe('/bin/zsh')
  })

  it('keeps the macOS hook socket path below the Unix socket limit', () => {
    const socketPath = buildAgentHookSocketPath(
      'easy-instance-cedd96c1-c39d-4175-b4d6-67dec83ec286',
      'darwin',
    )
    expect(socketPath).toMatch(/^\/tmp\/et-[0-9a-f]{16}\.sock$/)
    expect(Buffer.byteLength(socketPath)).toBeLessThan(104)
  })
})
