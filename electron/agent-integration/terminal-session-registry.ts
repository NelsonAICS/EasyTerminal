import { randomBytes, randomUUID } from 'node:crypto'
import type { IPty } from 'node-pty'

export interface TerminalSessionRegistration {
  terminalSessionId: string
  channelToken: string
  instanceId: string
  label: string
  tmuxSessionName?: string
  pty?: IPty
  alive: boolean
  createdAt: number
}

export interface TerminalSessionRegistrationInput {
  terminalSessionId: string
  instanceId: string
  label?: string
  tmuxSessionName?: string
  pty?: IPty
  channelToken?: string
}

export interface TerminalSessionRegistry {
  register(input: TerminalSessionRegistrationInput): TerminalSessionRegistration
  get(terminalSessionId: string): TerminalSessionRegistration | undefined
  authenticate(terminalSessionId: string, instanceId: string, channelToken: string): TerminalSessionRegistration | undefined
  updateLabel(terminalSessionId: string, label: string): boolean
  attachPty(terminalSessionId: string, pty: IPty): boolean
  markPtyExit(terminalSessionId: string): boolean
  invalidate(terminalSessionId: string): boolean
  list(): TerminalSessionRegistration[]
}

export const createInstanceId = (): string => `easy-instance-${randomUUID()}`
export const createChannelToken = (): string => randomBytes(32).toString('hex')

export function createTerminalSessionRegistry(): TerminalSessionRegistry {
  const registrations = new Map<string, TerminalSessionRegistration>()

  return {
    register(input) {
      const existing = registrations.get(input.terminalSessionId)
      if (existing) existing.alive = false
      const registration: TerminalSessionRegistration = {
        terminalSessionId: input.terminalSessionId,
        channelToken: input.channelToken ?? createChannelToken(),
        instanceId: input.instanceId,
        label: input.label ?? input.terminalSessionId,
        ...(input.tmuxSessionName ? { tmuxSessionName: input.tmuxSessionName } : {}),
        ...(input.pty ? { pty: input.pty } : {}),
        alive: true,
        createdAt: Date.now(),
      }
      registrations.set(input.terminalSessionId, registration)
      return registration
    },
    get: terminalSessionId => registrations.get(terminalSessionId),
    authenticate(terminalSessionId, instanceId, channelToken) {
      const registration = registrations.get(terminalSessionId)
      if (!registration || !registration.alive) return undefined
      if (registration.instanceId !== instanceId || registration.channelToken !== channelToken) return undefined
      return registration
    },
    updateLabel(terminalSessionId, label) {
      const registration = registrations.get(terminalSessionId)
      if (!registration || !registration.alive || label.length === 0) return false
      registration.label = label
      return true
    },
    attachPty(terminalSessionId, pty) {
      const registration = registrations.get(terminalSessionId)
      if (!registration || !registration.alive) return false
      registration.pty = pty
      return true
    },
    markPtyExit(terminalSessionId) {
      const registration = registrations.get(terminalSessionId)
      if (!registration) return false
      registration.alive = false
      return true
    },
    invalidate(terminalSessionId) {
      const registration = registrations.get(terminalSessionId)
      if (!registration) return false
      registration.alive = false
      return true
    },
    list: () => [...registrations.values()].map(registration => ({ ...registration })),
  }
}
