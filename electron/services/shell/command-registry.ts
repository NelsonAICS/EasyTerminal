import type { CommandDefinition } from './command-definition'

export class CommandRegistry {
  private readonly commands = new Map<string, CommandDefinition>()

  register(definition: CommandDefinition): void {
    if (!definition.id.trim() || !definition.executable.trim()) throw new Error('Command id and executable are required')
    if (this.commands.has(definition.id)) throw new Error(`Command already registered: ${definition.id}`)
    this.commands.set(definition.id, structuredClone(definition))
  }

  getPublished(commandId: string): CommandDefinition {
    const definition = this.commands.get(commandId)
    if (!definition || definition.status !== 'published') throw new Error(`Published command not found: ${commandId}`)
    return structuredClone(definition)
  }

  listPublished(): CommandDefinition[] {
    return [...this.commands.values()].filter((definition) => definition.status === 'published').map((definition) => structuredClone(definition))
  }
}
