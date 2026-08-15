import { describe, expect, it } from 'vitest'

import { ExecutorRegistry } from '../../electron/services/workflow-v2/executor-registry'
import { NodeDefinitionRegistry } from '../../electron/services/workflow-v2/node-registry'
import type { NodeExecutor, PublishedNodeDefinition } from '../../electron/services/workflow-v2/node-definition'

const definition = (version: number, status: PublishedNodeDefinition['status'] = 'published'): PublishedNodeDefinition => ({
  type: 'test.transform',
  version,
  status,
  executorKind: 'test.transform',
  inputPorts: [{ id: 'value', type: 'number', required: true }],
  outputPorts: [{ id: 'value', type: 'number' }],
  configSchema: {},
  risk: 'safe',
})

describe('workflow-v2 registries', () => {
  it('registers immutable published node versions', () => {
    const registry = new NodeDefinitionRegistry()

    registry.register(definition(1))
    registry.register(definition(2))

    expect(registry.getPublished('test.transform', 1)?.version).toBe(1)
    expect(registry.getPublished('test.transform', 2)?.version).toBe(2)
    expect(() => registry.register(definition(1))).toThrow(/already registered/i)
  })

  it('does not expose draft definitions as runnable definitions', () => {
    const registry = new NodeDefinitionRegistry()
    registry.register(definition(1, 'draft'))

    expect(registry.getPublished('test.transform', 1)).toBeUndefined()
  })

  it('registers executors and rejects unknown or duplicate kinds', async () => {
    const registry = new ExecutorRegistry()
    const executor: NodeExecutor = async ({ inputs }) => ({ value: inputs.value })

    registry.register('test.transform', executor)

    expect(registry.get('test.transform')).toBe(executor)
    expect(() => registry.get('missing')).toThrow(/not found/i)
    expect(() => registry.register('test.transform', executor)).toThrow(/already registered/i)
    await expect(registry.get('test.transform')({
      node: definition(1),
      inputs: { value: 7 },
      config: {},
      signal: new AbortController().signal,
      runId: 'run-1',
    })).resolves.toEqual({ value: 7 })
  })
})
