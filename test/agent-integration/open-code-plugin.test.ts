import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'
import { createHookServer } from '../../electron/agent-integration/hook-server'
import { OpenCodeAdapter } from '../../electron/agent-integration/adapters/opencode-adapter'
import { createInteractionCoordinator } from '../../electron/agent-integration/interaction-coordinator'
import { createSessionStore } from '../../electron/agent-integration/session-store'
import { createTerminalSessionRegistry } from '../../electron/agent-integration/terminal-session-registry'
import { installOpenCodePlugin } from '../../electron/agent-integration/open-code-plugin'

const temporaryDirectories: string[] = []
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true })
})

describe('OpenCode plugin bridge', () => {
  it('installs into the official global plugin directory', () => {
    const directory = fs.mkdtempSync(path.join('/private/tmp', 'easy-terminal-opencode-install-'))
    temporaryDirectories.push(directory)
    const result = installOpenCodePlugin({ homePath: directory })
    expect(result.changed).toBe(true)
    expect(result.pluginPath).toBe(path.join(directory, '.config', 'opencode', 'plugins', 'easyterminal-agent-bridge.mjs'))
    expect(fs.readFileSync(result.pluginPath, 'utf8')).toContain("event.type !== 'permission.asked'")
  })

  it('ISL-E2E-OPENCODE-002 forwards permission.asked and replies through the OpenCode API', async () => {
    const directory = fs.mkdtempSync(path.join('/private/tmp', 'easy-terminal-opencode-'))
    temporaryDirectories.push(directory)
    const installResult = installOpenCodePlugin({ homePath: directory })
    const runnerPath = path.join(directory, 'runner.mjs')
    fs.writeFileSync(runnerPath, `
      const plugin = (await import(process.argv[2])).default
      const client = {
        postSessionIdPermissionsPermissionId: async input => {
          process.stdout.write(JSON.stringify(input))
          return true
        },
      }
      const hooks = await plugin({ client })
      await hooks.event({ event: JSON.parse(process.env.EASYTERMINAL_OPENCODE_EVENT) })
    `)

    const registry = createTerminalSessionRegistry()
    const registration = registry.register({ terminalSessionId: 'tab-A', instanceId: 'instance-A' })
    const store = createSessionStore()
    const adapter = new OpenCodeAdapter()
    let interactionId = ''
    const coordinator = createInteractionCoordinator({
      store,
      registry,
      adapters: [adapter],
      transport: { sendHook: (payload, interaction) => server.sendResponse(payload, interaction), writePty: () => undefined },
    })
    const server = createHookServer({
      socketPath: path.join(directory, 'hook.sock'),
      registry,
      store,
      adapters: [adapter],
      onInteraction: receivedInteractionId => {
        interactionId = receivedInteractionId
        const interaction = store.getInteraction(receivedInteractionId)
        if (interaction) setTimeout(() => void coordinator.submit({
          interactionId: receivedInteractionId,
          terminalSessionId: interaction.terminalSessionId,
          revision: interaction.revision,
          action: 'allow_once',
        }), 0)
      },
      onAck: event => coordinator.handleAck(event),
    })
    await server.start()

    const event = {
      type: 'permission.asked',
      properties: {
        id: 'per-1',
        sessionID: 'opencode-session-A',
        permission: 'bash',
        patterns: ['npm test'],
        always: ['npm test'],
        tool: { name: 'bash', callID: 'call-1' },
        metadata: { input: { command: 'npm test' } },
      },
    }
    const child = spawn(process.execPath, [runnerPath, installResult.pluginPath], {
      env: {
        ...process.env,
        EASYTERMINAL_TERMINAL_SESSION_ID: registration.terminalSessionId,
        EASYTERMINAL_CHANNEL_TOKEN: registration.channelToken,
        EASYTERMINAL_HOOK_SOCKET: server.socketPath,
        EASYTERMINAL_INSTANCE_ID: registration.instanceId,
        EASYTERMINAL_OPENCODE_EVENT: JSON.stringify(event),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const stdout = new Promise<string>((resolve, reject) => {
      let value = ''
      child.stdout.setEncoding('utf8')
      child.stdout.on('data', chunk => { value += String(chunk) })
      child.once('error', reject)
      child.once('close', () => resolve(value))
    })

    const output = await stdout
    await server.stop()

    expect(JSON.parse(output)).toEqual({ path: { id: 'opencode-session-A', permissionID: 'per-1' }, body: { response: 'once' } })
    expect(interactionId).toBe('opencode-per-1')
    expect(store.getInteraction(interactionId)?.status).toBe('acknowledged')
  })
})
