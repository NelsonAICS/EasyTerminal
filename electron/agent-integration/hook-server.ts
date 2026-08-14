import net from 'node:net'
import fs from 'node:fs'
import type { AgentAck, AgentEventEnvelope } from '../../src/types/agent-interaction'
import { validateEventEnvelope } from './protocol-validator'
import type { TerminalSessionRegistry } from './terminal-session-registry'
import type { SessionStore } from './session-store'
import type { AgentAdapter } from './adapters/agent-adapter'
import { TerminalFallbackAdapter } from './adapters/terminal-fallback-adapter'
import type { PendingInteraction } from '../../src/types/agent-interaction'

export type HookResult =
  | { ok: true; interactionId?: string; reason?: string }
  | { ok: false; code: string; message: string }

export interface HookServerOptions {
  socketPath: string
  registry: TerminalSessionRegistry
  store: SessionStore
  adapters: AgentAdapter[]
  onInteraction?: (interactionId: string) => void
  onEvent?: (event: AgentEventEnvelope) => void
  onAck?: (event: AgentEventEnvelope<AgentAck>) => HookResult
  onError?: (error: Error) => void
}

const MAX_LINE_BYTES = 512 * 1024

export interface HookServer {
  start(): Promise<void>
  stop(): Promise<void>
  handleEnvelope(input: unknown): HookResult
  sendResponse(payload: unknown, interaction: PendingInteraction): Promise<void>
  socketPath: string
}

export function createHookServer(options: HookServerOptions): HookServer {
  let server: net.Server | undefined
  const fallbackAdapter = new TerminalFallbackAdapter()
  const responseWriters = new Map<string, (payload: unknown) => void>()
  const authFailures = new Map<string, { count: number; windowStartedAt: number }>()

  const handleEnvelope = (input: unknown): HookResult => {
    const validation = validateEventEnvelope(input)
    if (!validation.ok) return { ok: false, code: validation.code, message: validation.message }
    const event = validation.value
    const registration = options.registry.authenticate(event.terminalSessionId, event.instanceId, event.channelToken)
    if (!registration) {
      const now = Date.now()
      const key = `${event.terminalSessionId}:${event.instanceId}`
      const current = authFailures.get(key)
      const failure = !current || now - current.windowStartedAt >= 10_000
        ? { count: 1, windowStartedAt: now }
        : { count: current.count + 1, windowStartedAt: current.windowStartedAt }
      authFailures.set(key, failure)
      if (failure.count > 10) return { ok: false, code: 'rate_limited', message: '请求过于频繁，请稍后重试' }
      return { ok: false, code: 'unauthorized_session', message: 'event is not bound to a live EasyTerminal PTY' }
    }
    authFailures.delete(`${event.terminalSessionId}:${event.instanceId}`)

    options.onEvent?.(event)
    if (event.eventType === 'interaction.ack') {
      if (!options.onAck) return { ok: false, code: 'ack_handler_unavailable', message: 'ACK handler is not available' }
      return options.onAck(event as AgentEventEnvelope<AgentAck>)
    }

    const adapter = options.adapters.find(candidate => candidate.canHandle(event))
      ?? (event.source === 'terminal-fallback' ? fallbackAdapter : undefined)
    if (!adapter) return { ok: false, code: 'adapter_unavailable', message: 'no adapter safely supports this agent event' }

    const result = options.store.ingest(event as AgentEventEnvelope, adapter)
    if (!result.accepted && result.duplicate) return { ok: true, reason: 'duplicate_event' }
    if (!result.accepted) return { ok: false, code: result.reason ?? 'event_rejected', message: result.reason ?? 'event rejected' }
    if (result.interaction) options.onInteraction?.(result.interaction.interactionId)
    return { ok: true, ...(result.interaction ? { interactionId: result.interaction.interactionId } : {}), ...(result.reason ? { reason: result.reason } : {}) }
  }

  return {
    socketPath: options.socketPath,
    sendResponse: async (payload, interaction) => {
      const writer = responseWriters.get(interaction.interactionId)
      if (!writer) throw new Error('hook_connection_unavailable')
      writer({ type: 'interaction.response', payload })
    },
    start: async () => {
      if (server) return
      if (process.platform !== 'win32') {
        try { fs.unlinkSync(options.socketPath) } catch { /* no old socket */ }
      }
      server = net.createServer(socket => {
        let buffer = ''
        const interactionIds = new Set<string>()
        socket.setEncoding('utf8')
        const writeResponse = (payload: unknown) => {
          if (!socket.destroyed) socket.write(`${JSON.stringify(payload)}\n`)
        }
        socket.on('close', () => {
          for (const interactionId of interactionIds) {
            if (responseWriters.get(interactionId) === writeResponse) responseWriters.delete(interactionId)
          }
        })
        socket.on('data', chunk => {
          buffer += chunk
          if (Buffer.byteLength(buffer, 'utf8') > MAX_LINE_BYTES) {
            socket.end(JSON.stringify({ ok: false, code: 'payload_too_large', message: 'request too large' }) + '\n')
            return
          }
          let newlineIndex = buffer.indexOf('\n')
          while (newlineIndex >= 0) {
            const line = buffer.slice(0, newlineIndex).trim()
            buffer = buffer.slice(newlineIndex + 1)
            if (line) {
              let input: unknown
              try { input = JSON.parse(line) } catch {
                socket.write(JSON.stringify({ ok: false, code: 'invalid_json', message: 'request must be valid JSON' }) + '\n')
                newlineIndex = buffer.indexOf('\n')
                continue
              }
              const result = handleEnvelope(input)
              socket.write(`${JSON.stringify(result)}\n`)
              if (result.ok && result.interactionId) {
                interactionIds.add(result.interactionId)
                responseWriters.set(result.interactionId, writeResponse)
              }
            }
            newlineIndex = buffer.indexOf('\n')
          }
        })
      })
      server.on('error', error => options.onError?.(error))
      await new Promise<void>((resolve, reject) => {
        server?.once('listening', () => resolve())
        server?.once('error', reject)
        server?.listen(options.socketPath)
      })
      if (process.platform !== 'win32') {
        try { fs.chmodSync(options.socketPath, 0o600) } catch (error) { options.onError?.(error as Error) }
      }
    },
    stop: async () => {
      if (!server) return
      const current = server
      server = undefined
      await new Promise<void>(resolve => current.close(() => resolve()))
      if (process.platform !== 'win32') {
        try { fs.unlinkSync(options.socketPath) } catch { /* already removed */ }
      }
    },
    handleEnvelope,
  }
}
