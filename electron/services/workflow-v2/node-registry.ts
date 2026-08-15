import { WorkflowDomainError } from '../../../src/features/workflow-v2/domain/errors'
import type { PublishedNodeDefinition } from './node-definition'

function definitionKey(type: string, version: number): string {
  return `${type}@${version}`
}

export class NodeDefinitionRegistry {
  private readonly definitions = new Map<string, PublishedNodeDefinition>()

  register(definition: PublishedNodeDefinition): void {
    if (definition.version < 1 || !Number.isInteger(definition.version)) {
      throw new WorkflowDomainError('INVALID_WORKFLOW', 'Node definition version must be a positive integer', {
        type: definition.type,
        version: definition.version,
      })
    }

    const key = definitionKey(definition.type, definition.version)
    if (this.definitions.has(key)) {
      throw new WorkflowDomainError('INVALID_WORKFLOW', `Node definition ${key} is already registered`, { key })
    }

    this.definitions.set(key, structuredClone(definition))
  }

  get(type: string, version: number): PublishedNodeDefinition | undefined {
    const definition = this.definitions.get(definitionKey(type, version))
    return definition ? structuredClone(definition) : undefined
  }

  getPublished(type: string, version: number): PublishedNodeDefinition | undefined {
    const definition = this.get(type, version)
    return definition?.status === 'published' ? definition : undefined
  }

  listPublished(): PublishedNodeDefinition[] {
    return [...this.definitions.values()]
      .filter((definition) => definition.status === 'published')
      .map((definition) => structuredClone(definition))
  }
}
