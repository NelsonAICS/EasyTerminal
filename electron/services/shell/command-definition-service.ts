import type { CommandArgumentDefinition, CommandDefinition } from './command-definition'

export type CommandLifecycleStatus = 'draft' | 'tested' | 'published'

export interface ManagedCommandDefinition extends Omit<CommandDefinition, 'status'> {
  status: CommandLifecycleStatus
  description?: string
  lastTest?: { testedAt: string; args: string[] }
}

export interface CommandDefinitionStore {
  get<T>(key: string, defaultValue: T): T
  set(key: string, value: unknown): void
}

export const COMMAND_STORE_KEY = 'workflow_v2_shell_commands'

function clone<T>(value: T): T { return structuredClone(value) }

function validateArguments(argumentsList: CommandArgumentDefinition[] = []): void {
  const ids = new Set<string>()
  for (const argument of argumentsList) {
    if (!argument.name.trim() || ids.has(argument.name)) throw new Error(`Duplicate or empty command argument: ${argument.name}`)
    ids.add(argument.name)
  }
}

export class CommandDefinitionService {
  constructor(private readonly store: CommandDefinitionStore) {}

  list(): ManagedCommandDefinition[] { return this.read().map(clone) }

  saveDraft(input: Omit<ManagedCommandDefinition, 'status' | 'lastTest'>): ManagedCommandDefinition {
    if (!/^[a-z][a-z0-9._-]{1,63}$/i.test(input.id)) throw new Error('Command id must use letters, numbers, dot, dash or underscore')
    if (!input.executable.trim() || input.executable.includes('\n')) throw new Error('Command executable must be a single non-empty path')
    validateArguments(input.arguments)
    const definitions = this.read()
    const existing = definitions.find((item) => item.id === input.id)
    if (existing?.status === 'published') throw new Error('Published commands are immutable; create a new command id')
    const next: ManagedCommandDefinition = { ...clone(input), status: 'draft' }
    this.store.set(COMMAND_STORE_KEY, existing ? definitions.map((item) => item === existing ? next : item) : [...definitions, next])
    return clone(next)
  }

  test(id: string, args: string[]): ManagedCommandDefinition {
    const definitions = this.read()
    const definition = definitions.find((item) => item.id === id)
    if (!definition) throw new Error(`Command definition not found: ${id}`)
    const expected = definition.arguments ?? []
    if (args.length < expected.filter((item) => item.required !== false).length || args.length > expected.length) throw new Error('Test arguments do not match the declared command arguments')
    definition.status = 'tested'
    definition.lastTest = { testedAt: new Date().toISOString(), args: clone(args) }
    this.store.set(COMMAND_STORE_KEY, definitions)
    return clone(definition)
  }

  publish(id: string): CommandDefinition {
    const definitions = this.read()
    const definition = definitions.find((item) => item.id === id)
    if (!definition) throw new Error(`Command definition not found: ${id}`)
    if (definition.status !== 'tested') throw new Error('Command must pass the test bench before publishing')
    definition.status = 'published'
    this.store.set(COMMAND_STORE_KEY, definitions)
    return { ...clone(definition), status: 'published' }
  }

  private read(): ManagedCommandDefinition[] {
    const value = this.store.get<unknown>(COMMAND_STORE_KEY, [])
    return Array.isArray(value) ? value as ManagedCommandDefinition[] : []
  }
}
