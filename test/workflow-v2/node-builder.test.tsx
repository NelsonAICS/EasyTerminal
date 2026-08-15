import { describe, expect, it } from 'vitest'

import { NodeDefinitionService } from '../../electron/services/workflow-v2/node-definition-service'
import type { NodeDefinitionStore } from '../../electron/services/workflow-v2/node-definition-service'

class MemoryStore implements NodeDefinitionStore {
  private value: unknown = []
  get<T>(_key: string, defaultValue: T): T { return (this.value ?? defaultValue) as T }
  set(_key: string, value: unknown): void { this.value = structuredClone(value) }
}

describe('workflow-v2 node definition center', () => {
  it('enforces draft -> tested -> immutable published lifecycle', () => {
    const service = new NodeDefinitionService(new MemoryStore())
    const draft = service.saveDraft({
      type: 'custom.prompt',
      version: 1,
      name: 'Prompt node',
      executorKind: 'prompt',
      inputPorts: [{ id: 'query', type: 'text', required: true }],
      outputPorts: [{ id: 'text', type: 'text' }],
      configSchema: { template: 'string' },
      risk: 'safe',
    })
    expect(draft.status).toBe('draft')
    expect(() => service.publish(draft.type, 1)).toThrow(/test bench/i)
    expect(() => service.test(draft.type, 1, {})).toThrow(/required ports/i)
    const tested = service.test(draft.type, 1, { query: 'hello' })
    expect(tested.status).toBe('tested')
    expect(service.publish(draft.type, 1).status).toBe('published')
    expect(() => service.saveDraft({
      type: 'custom.prompt', version: 1, name: 'Changed', executorKind: 'prompt', inputPorts: [], outputPorts: [], risk: 'safe',
    })).toThrow(/immutable/i)
  })
})
