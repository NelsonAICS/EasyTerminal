import type { PortDefinition } from '../../../src/features/workflow-v2/domain/types'
import type { NodeRisk, PublishedNodeDefinition } from './node-definition'

export type NodeLifecycleStatus = 'draft' | 'tested' | 'published'

export interface ManagedNodeDefinition extends Omit<PublishedNodeDefinition, 'status'> {
  name: string
  description: string
  status: NodeLifecycleStatus
  lastTest?: {
    input: Record<string, unknown>
    output?: Record<string, unknown>
    error?: string
    testedAt: string
  }
}

export interface NodeDefinitionStore {
  get<T>(key: string, defaultValue: T): T
  set(key: string, value: unknown): void
}

export const ALLOWED_EXECUTOR_KINDS = [
  'prompt',
  'llm',
  'retriever',
  'sql',
  'shell',
  'condition',
  'json-transform',
  'trusted-function',
] as const

const STORE_KEY = 'workflow_v2_node_definitions'

function clone<T>(value: T): T {
  return structuredClone(value)
}

function validatePorts(ports: PortDefinition[]): void {
  const ids = new Set<string>()
  for (const port of ports) {
    if (!port.id.trim() || ids.has(port.id)) throw new Error(`Duplicate or empty port id: ${port.id}`)
    ids.add(port.id)
  }
}

export class NodeDefinitionService {
  private readonly store: NodeDefinitionStore

  constructor(store: NodeDefinitionStore) {
    this.store = store
  }

  list(): ManagedNodeDefinition[] {
    return this.read().map(clone)
  }

  saveDraft(input: {
    type: string
    version: number
    name: string
    description?: string
    executorKind: string
    inputPorts: PortDefinition[]
    outputPorts: PortDefinition[]
    configSchema?: Record<string, unknown>
    risk: NodeRisk
  }): ManagedNodeDefinition {
    if (!/^[a-z][a-z0-9._-]{1,63}$/i.test(input.type)) throw new Error('Node type must use letters, numbers, dot, dash or underscore')
    if (!Number.isInteger(input.version) || input.version < 1) throw new Error('Node version must be a positive integer')
    if (!ALLOWED_EXECUTOR_KINDS.includes(input.executorKind as typeof ALLOWED_EXECUTOR_KINDS[number])) throw new Error(`Executor kind is not allowed: ${input.executorKind}`)
    validatePorts(input.inputPorts)
    validatePorts(input.outputPorts)
    const definitions = this.read()
    const existing = definitions.find((definition) => definition.type === input.type && definition.version === input.version)
    if (existing?.status === 'published') throw new Error('Published node versions are immutable; create a new version')
    const next: ManagedNodeDefinition = {
      type: input.type,
      version: input.version,
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      status: 'draft',
      executorKind: input.executorKind,
      inputPorts: clone(input.inputPorts),
      outputPorts: clone(input.outputPorts),
      configSchema: clone(input.configSchema ?? {}),
      risk: input.risk,
    }
    const nextDefinitions = existing
      ? definitions.map((definition) => definition === existing ? next : definition)
      : [...definitions, next]
    this.store.set(STORE_KEY, nextDefinitions)
    return clone(next)
  }

  test(type: string, version: number, input: Record<string, unknown>): ManagedNodeDefinition {
    const definitions = this.read()
    const definition = definitions.find((item) => item.type === type && item.version === version)
    if (!definition) throw new Error(`Node definition not found: ${type}@${version}`)
    if (definition.status === 'published') return clone(definition)
    const missing = definition.inputPorts.filter((port) => port.required && !(port.id in input)).map((port) => port.id)
    if (missing.length) throw new Error(`Test input is missing required ports: ${missing.join(', ')}`)
    definition.status = 'tested'
    definition.lastTest = { input: clone(input), output: clone(input), testedAt: new Date().toISOString() }
    this.store.set(STORE_KEY, definitions)
    return clone(definition)
  }

  publish(type: string, version: number): PublishedNodeDefinition {
    const definitions = this.read()
    const definition = definitions.find((item) => item.type === type && item.version === version)
    if (!definition) throw new Error(`Node definition not found: ${type}@${version}`)
    if (definition.status !== 'tested') throw new Error('Node must pass the test bench before publishing')
    if (definitions.some((item) => item !== definition && item.type === type && item.version === version && item.status === 'published')) {
      throw new Error('Published node version already exists')
    }
    definition.status = 'published'
    this.store.set(STORE_KEY, definitions)
    return {
      type: definition.type,
      version: definition.version,
      status: 'published',
      executorKind: definition.executorKind,
      inputPorts: clone(definition.inputPorts),
      outputPorts: clone(definition.outputPorts),
      configSchema: clone(definition.configSchema),
      risk: definition.risk,
    }
  }

  private read(): ManagedNodeDefinition[] {
    const value = this.store.get<unknown>(STORE_KEY, [])
    return Array.isArray(value) ? value as ManagedNodeDefinition[] : []
  }
}

export { STORE_KEY }
