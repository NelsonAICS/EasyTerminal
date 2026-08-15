import { spawn } from 'node:child_process'
import { resolve, relative, isAbsolute } from 'node:path'
import type { CommandDefinition } from './command-definition'
import { CommandRegistry } from './command-registry'

export interface ShellRunResult {
  stdout: string
  stderr: string
  exitCode: number | null
  signal: NodeJS.Signals | null
  durationMs: number
  truncated: boolean
}

export interface ShellRunOptions {
  args?: string[]
  cwd?: string
  env?: Record<string, string>
  signal?: AbortSignal
  timeoutMs?: number
}

function isWithinRoot(candidate: string, root: string): boolean {
  const path = resolve(candidate)
  const rootPath = resolve(root)
  const remainder = relative(rootPath, path)
  return remainder === '' || (!remainder.startsWith('..') && !isAbsolute(remainder))
}

function validateArgs(definition: CommandDefinition, args: string[]): void {
  const definitions = definition.arguments ?? []
  const requiredCount = definitions.filter((argument) => argument.required !== false).length
  if (args.length < requiredCount || args.length > definitions.length) {
    throw new Error(`Command ${definition.id} expects ${requiredCount}-${definitions.length} declared arguments`)
  }
  args.forEach((value, index) => {
    const argument = definitions[index]
    if (!argument) throw new Error(`Argument ${index} is not declared for command ${definition.id}`)
    if (argument.maxLength !== undefined && value.length > argument.maxLength) throw new Error(`Argument ${argument.name} is too long`)
    if (argument.pattern && !new RegExp(argument.pattern).test(value)) throw new Error(`Argument ${argument.name} is invalid`)
    if (argument.type === 'number' && !Number.isFinite(Number(value))) throw new Error(`Argument ${argument.name} must be a number`)
    if (argument.type === 'boolean' && value !== 'true' && value !== 'false') throw new Error(`Argument ${argument.name} must be a boolean`)
  })
}

export class ControlledShellRunner {
  constructor(private readonly registry: CommandRegistry) {}

  async run(commandId: string, options: ShellRunOptions = {}): Promise<ShellRunResult> {
    const definition = this.registry.getPublished(commandId)
    const args = options.args ?? []
    validateArgs(definition, args)
    const cwd = options.cwd ? resolve(options.cwd) : process.cwd()
    const roots = definition.allowedCwdRoots ?? [process.cwd()]
    if (!roots.some((root) => isWithinRoot(cwd, root))) throw new Error(`Working directory is outside allowed roots for ${commandId}`)
    const allowedEnv = new Set(definition.allowedEnv ?? [])
    const env: Record<string, string> = {}
    for (const [key, value] of Object.entries(options.env ?? {})) {
      if (!allowedEnv.has(key)) throw new Error(`Environment variable is not allowed: ${key}`)
      env[key] = value
    }
    const timeoutMs = Math.max(100, Math.min(options.timeoutMs ?? definition.timeoutMs ?? 30_000, 86_400_000))
    const maxOutputBytes = Math.max(1, Math.min(definition.maxOutputBytes ?? 1_048_576, 16_777_216))
    const startedAt = Date.now()

    return new Promise((resolvePromise, reject) => {
      const child = spawn(definition.executable, args, { cwd, env, shell: false, windowsHide: true })
      let stdout = ''
      let stderr = ''
      let outputBytes = 0
      let truncated = false
      let settled = false
      const append = (target: 'stdout' | 'stderr', chunk: Buffer) => {
        if (truncated) return
        const remaining = maxOutputBytes - outputBytes
        if (chunk.byteLength > remaining) {
          const text = chunk.subarray(0, Math.max(0, remaining)).toString('utf8')
          if (target === 'stdout') stdout += text
          else stderr += text
          outputBytes = maxOutputBytes
          truncated = true
          child.kill('SIGTERM')
          return
        }
        outputBytes += chunk.byteLength
        if (target === 'stdout') stdout += chunk.toString('utf8')
        else stderr += chunk.toString('utf8')
      }
      const finish = (result: ShellRunResult) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        options.signal?.removeEventListener('abort', onAbort)
        resolvePromise(result)
      }
      const onAbort = () => child.kill('SIGTERM')
      const timeout = setTimeout(() => child.kill('SIGTERM'), timeoutMs)
      child.stdout.on('data', (chunk: Buffer) => append('stdout', chunk))
      child.stderr.on('data', (chunk: Buffer) => append('stderr', chunk))
      child.once('error', (error) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        options.signal?.removeEventListener('abort', onAbort)
        reject(error)
      })
      child.once('close', (exitCode, signal) => finish({ stdout, stderr, exitCode, signal, durationMs: Date.now() - startedAt, truncated }))
      if (options.signal?.aborted) onAbort()
      else options.signal?.addEventListener('abort', onAbort, { once: true })
    })
  }
}
