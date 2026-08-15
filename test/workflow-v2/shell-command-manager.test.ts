import { describe, expect, it } from 'vitest'

import { CommandDefinitionService, type CommandDefinitionStore } from '../../electron/services/shell/command-definition-service'

class MemoryStore implements CommandDefinitionStore {
  private value: unknown = []
  get<T>(_key: string, fallback: T): T { return (this.value ?? fallback) as T }
  set(_key: string, value: unknown): void { this.value = structuredClone(value) }
}

describe('controlled shell command definitions', () => {
  it('requires a declaration test before publishing an immutable command', () => {
    const service = new CommandDefinitionService(new MemoryStore())
    const draft = service.saveDraft({ id: 'echo.safe', name: 'Safe echo', executable: '/bin/echo', arguments: [{ name: 'value', type: 'string', required: true }], allowedCwdRoots: ['.'], allowedEnv: [], maxOutputBytes: 1024, timeoutMs: 1000 })
    expect(draft.status).toBe('draft')
    expect(() => service.publish(draft.id)).toThrow(/test bench/i)
    expect(service.test(draft.id, ['hello']).status).toBe('tested')
    expect(service.publish(draft.id).status).toBe('published')
    expect(() => service.saveDraft({ id: 'echo.safe', name: 'Changed', executable: '/bin/echo', arguments: [], allowedCwdRoots: ['.'], allowedEnv: [] })).toThrow(/immutable/i)
  })
})
