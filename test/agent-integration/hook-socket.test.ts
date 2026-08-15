import net from 'node:net'
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createHookServer } from '../../electron/agent-integration/hook-server'
import { FakeAgentAdapter } from '../../electron/agent-integration/adapters/fake-agent-adapter'
import { createSessionStore } from '../../electron/agent-integration/session-store'
import { createTerminalSessionRegistry } from '../../electron/agent-integration/terminal-session-registry'
import { buildAgentHookSocketPath } from '../../electron/agent-integration/pty-environment'

const connectAndSend = (socketPath: string, input: unknown) => new Promise<Record<string, unknown>>((resolve, reject) => {
  const socket = net.createConnection(socketPath)
  let buffer = ''
  socket.setEncoding('utf8')
  socket.on('connect', () => socket.write(`${JSON.stringify(input)}\n`))
  socket.on('data', chunk => {
    buffer += chunk
    const line = buffer.split('\n')[0]
    if (line) {
      socket.end()
      resolve(JSON.parse(line) as Record<string, unknown>)
    }
  })
  socket.on('error', reject)
})

describe('HookServer socket transport', () => {
  it('ISL-SEC-002 starts a user-only Unix socket and accepts a bound event', async () => {
    const socketPath = buildAgentHookSocketPath(
      `easy-instance-test-${process.pid}-${Date.now()}-with-a-long-uuid-like-value`,
      process.platform,
    )
    const registry = createTerminalSessionRegistry()
    registry.register({ terminalSessionId: 'tab-A', instanceId: 'instance-A', channelToken: 'token-A' })
    const server = createHookServer({ socketPath, registry, store: createSessionStore(), adapters: [new FakeAgentAdapter()] })
    await server.start()
    try {
      if (process.platform !== 'win32') expect(fs.statSync(socketPath).mode & 0o777).toBe(0o600)
      const response = await connectAndSend(socketPath, {
        schemaVersion: 1, eventId: 'socket-event', eventType: 'session.started', agentType: 'fake-agent', source: 'hook',
        terminalSessionId: 'tab-A', agentSessionId: 'agent-A', instanceId: 'instance-A', channelToken: 'token-A', revision: 1,
        occurredAt: Date.now(), payload: { status: 'ready' },
      })
      expect(response).toMatchObject({ ok: true })
    } finally {
      await server.stop()
    }
    expect(fs.existsSync(socketPath)).toBe(false)
  })
})
