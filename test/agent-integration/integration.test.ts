import { spawn } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const fixture = path.resolve(process.cwd(), 'test/fixtures/fake-agent-cli.mjs')

describe('Fake Agent CLI integration fixture', () => {
  it('ISL-INT-001/010 emits structured identity events and keeps prose separate', async () => {
    const child = spawn(process.execPath, [fixture], {
      env: {
        ...process.env,
        EASYTERMINAL_TERMINAL_SESSION_ID: 'tab-A',
        EASYTERMINAL_CHANNEL_TOKEN: 'token-A',
        EASYTERMINAL_HOOK_SOCKET: '/private/tmp/easy-test.sock',
        EASYTERMINAL_INSTANCE_ID: 'instance-A',
        FAKE_AGENT_SESSION_ID: 'fake-session-A',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const lines: string[] = []
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', chunk => lines.push(...String(chunk).trim().split('\n').filter(Boolean)))
    child.stdin.write('approval-like-text\n')
    child.stdin.write('permission interaction-A\n')
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('fixture did not emit events')), 2000)
      const check = () => {
        if (lines.some(line => line.includes('interaction-A'))) {
          clearTimeout(timeout)
          resolve()
        } else setTimeout(check, 10)
      }
      check()
    })
    child.kill()

    const structured = lines
      .filter(line => line.startsWith('{'))
      .map(line => JSON.parse(line) as { event: Record<string, unknown> })
      .find(item => item.event.interactionId === 'interaction-A')
    expect(structured?.event).toMatchObject({ terminalSessionId: 'tab-A', channelToken: 'token-A', instanceId: 'instance-A', agentSessionId: 'fake-session-A' })
    expect(lines.some(line => line.includes('Do you want to continue?'))).toBe(true)
  })
})
