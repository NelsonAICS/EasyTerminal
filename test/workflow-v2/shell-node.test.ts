import { describe, expect, it } from 'vitest'

import { CommandRegistry } from '../../electron/services/shell/command-registry'
import { ControlledShellRunner } from '../../electron/services/shell/controlled-shell-runner'
import { createShellExecutor, createShellService } from '../../electron/services/workflow-v2/nodes/shell'

function createRegistry(maxOutputBytes = 1_024) {
  const registry = new CommandRegistry()
  registry.register({
    id: 'echo',
    name: 'Echo text',
    executable: '/bin/echo',
    arguments: [{ name: 'message', type: 'string', required: true, maxLength: 10_000 }],
    allowedCwdRoots: [process.cwd()],
    allowedEnv: [],
    maxOutputBytes,
    status: 'published',
  })
  return registry
}

describe('workflow-v2 controlled shell', () => {
  it('runs only a published executable with declared arguments and no shell interpretation', async () => {
    const runner = new ControlledShellRunner(createRegistry())
    const result = await runner.run('echo', { args: ['$(touch should-not-run)'] })
    expect(result.stdout).toContain('$(touch should-not-run)')
    await expect(runner.run('missing', { args: ['x'] })).rejects.toThrow(/published command/i)
    await expect(runner.run('echo', { args: ['a', 'b'] })).rejects.toThrow(/declared arguments/i)
    await expect(runner.run('echo', { args: ['x'], env: { PATH: '/tmp' } })).rejects.toThrow(/not allowed/i)
    await expect(runner.run('echo', { args: ['x'], cwd: '/tmp' })).rejects.toThrow(/outside allowed roots/i)
  })

  it('truncates output and exposes structured result through the Shell node', async () => {
    const runner = new ControlledShellRunner(createRegistry(8))
    const result = await runner.run('echo', { args: ['123456789'] })
    expect(result.truncated).toBe(true)
    expect(result.stdout.length).toBeLessThanOrEqual(8)

    const executor = createShellExecutor(createShellService(runner))
    const output = await executor({
      node: { id: 'shell', type: 'shell', version: 1, position: { x: 0, y: 0 }, config: {} },
      definition: { type: 'shell', version: 1, status: 'published', executorKind: 'shell', inputPorts: [], outputPorts: [], configSchema: {}, risk: 'system' },
      inputs: { args: ['ok'] },
      config: { commandId: 'echo' },
      signal: new AbortController().signal,
      runId: 'run-shell',
    })
    expect(output.result.exitCode).toBe(0)
    expect(output.stdout).toContain('ok')
  })
})
