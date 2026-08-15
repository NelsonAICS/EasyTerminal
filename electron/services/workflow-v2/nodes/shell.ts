import type { NodeExecutor, PublishedNodeDefinition } from '../node-definition'
import type { ControlledShellRunner, ShellRunResult } from '../../shell/controlled-shell-runner'

export interface ShellNodeService {
  run(commandId: string, options: { args?: string[]; cwd?: string; env?: Record<string, string>; signal: AbortSignal; timeoutMs?: number }): Promise<ShellRunResult>
}

export const shellDefinition: PublishedNodeDefinition = {
  type: 'shell',
  version: 1,
  status: 'published',
  executorKind: 'shell',
  inputPorts: [
    { id: 'args', type: 'json' },
    { id: 'cwd', type: 'text' },
    { id: 'env', type: 'json' },
  ],
  outputPorts: [
    { id: 'stdout', type: 'text' },
    { id: 'stderr', type: 'text' },
    { id: 'result', type: 'json' },
  ],
  configSchema: { commandId: 'string', timeoutMs: 'number?' },
  risk: 'system',
}

export function createShellExecutor(service?: ShellNodeService): NodeExecutor {
  return async ({ inputs, config, signal }) => {
    if (!service) throw new Error('Shell node service is not configured in the workflow runtime')
    if (typeof config.commandId !== 'string' || !config.commandId) throw new Error('Shell node requires a registered commandId')
    const args = inputs.args === undefined ? [] : inputs.args
    if (!Array.isArray(args) || args.some((arg) => typeof arg !== 'string')) throw new Error('Shell args must be a string array')
    const env = inputs.env === undefined ? undefined : inputs.env
    if (env !== undefined && (!env || typeof env !== 'object' || Array.isArray(env) || Object.values(env).some((value) => typeof value !== 'string'))) {
      throw new Error('Shell env must be a string object')
    }
    const result = await service.run(config.commandId, {
      args,
      cwd: typeof inputs.cwd === 'string' ? inputs.cwd : undefined,
      env: env as Record<string, string> | undefined,
      signal,
      timeoutMs: typeof config.timeoutMs === 'number' ? config.timeoutMs : undefined,
    })
    return { stdout: result.stdout, stderr: result.stderr, result }
  }
}

export function createShellService(runner: ControlledShellRunner): ShellNodeService {
  return { run: (commandId, options) => runner.run(commandId, options) }
}

export const shellExecutor: NodeExecutor = createShellExecutor()
