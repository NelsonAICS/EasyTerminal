import { describe, expect, it, vi } from 'vitest'

import type { ModelInfo } from '../../src/types/model-provider'
import { ProviderRepository } from '../../electron/services/providers/provider-repository'
import {
  ProviderAdapterRegistry,
  ProviderRegistry,
  createDefaultProviderAdapters,
} from '../../electron/services/providers/provider-registry'
import type { ProviderKeyValueStore, ProviderSecretVault } from '../../electron/services/providers/provider-types'

class MemoryStore implements ProviderKeyValueStore {
  private readonly values = new Map<string, unknown>()
  get<T>(key: string, defaultValue: T): T {
    return (this.values.has(key) ? this.values.get(key) : defaultValue) as T
  }
  set(key: string, value: unknown): void { this.values.set(key, structuredClone(value)) }
  delete(key: string): void { this.values.delete(key) }
}

class MemorySecrets implements ProviderSecretVault {
  private readonly values = new Map<string, string>()
  get(providerId: string): string | undefined { return this.values.get(providerId) }
  set(providerId: string, value: string): void { this.values.set(providerId, value) }
  delete(providerId: string): void { this.values.delete(providerId) }
}

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

describe('provider registry', () => {
  it('keeps secrets out of summaries and routes discovery, test and chat through one adapter', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/models')) return jsonResponse({ data: [{ id: 'fake-chat' }] })
      if (url.endsWith('/chat/completions')) return jsonResponse({
        choices: [{ message: { content: 'hello' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 2, completion_tokens: 1 },
      })
      if (url.endsWith('/embeddings')) return jsonResponse({ data: [{ embedding: [0.1, 0.2] }] })
      throw new Error(`unexpected URL ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const repository = new ProviderRepository(new MemoryStore(), new MemorySecrets())
    const registry = new ProviderRegistry({ repository, adapters: createDefaultProviderAdapters() })
    registry.save({ id: 'fake', name: 'Fake', kind: 'openai_compatible', baseUrl: 'https://fake.test/v1' }, 'secret-key')

    const summary = registry.list()[0]
    expect(summary?.hasCredential).toBe(true)
    expect(summary && 'apiKey' in summary).toBe(false)

    const testResult = await registry.test('fake')
    expect(testResult.ok).toBe(true)
    expect(registry.list()[0]?.health).toBe('connected')
    expect(registry.list()[0]?.models[0]?.id).toBe('fake-chat')

    const result = await registry.chat({ providerId: 'fake', modelId: 'fake-chat' }, [{ role: 'user', content: 'hi' }])
    expect(result.content).toBe('hello')
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/chat/completions'))).toBe(true)
  })

  it('requires a verified model before selecting application defaults', async () => {
    const repository = new ProviderRepository(new MemoryStore(), new MemorySecrets())
    const registry = new ProviderRegistry({ repository, adapters: createDefaultProviderAdapters() })
    const models: ModelInfo[] = [{ id: 'verified', capabilities: ['chat'], source: 'discovered' }]
    registry.save({ id: 'fake', name: 'Fake', kind: 'openai_compatible', baseUrl: 'https://fake.test/v1', models }, 'key')
    expect(() => registry.setDefaults({ defaultLlmModelRef: { providerId: 'fake', modelId: 'verified' }, defaultEmbeddingModelRef: null })).toThrow(/connection test/i)
    repository.updateHealth('fake', 'connected')
    expect(registry.setDefaults({ defaultLlmModelRef: { providerId: 'fake', modelId: 'verified' }, defaultEmbeddingModelRef: null }).defaultLlmModelRef?.modelId).toBe('verified')
  })

  it('rejects duplicate adapters', () => {
    const adapters = new ProviderAdapterRegistry()
    const defaults = createDefaultProviderAdapters()
    adapters.register(defaults.get('ollama'))
    expect(() => adapters.register(defaults.get('ollama'))).toThrow(/already registered/i)
  })
})
