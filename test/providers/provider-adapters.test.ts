import { describe, expect, it, vi } from 'vitest'

import { AnthropicAdapter } from '../../electron/services/providers/adapters/anthropic'
import { OllamaAdapter } from '../../electron/services/providers/adapters/ollama'
import type { ProviderConnection } from '../../electron/services/providers/provider-types'

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

const connection = (kind: ProviderConnection['kind'], baseUrl: string): ProviderConnection => ({
  id: kind,
  name: kind,
  kind,
  baseUrl,
  models: [],
  health: 'unknown',
  updatedAt: new Date().toISOString(),
  apiKey: 'secret',
})

describe('provider adapters', () => {
  it('uses Anthropic headers for discovery and the existing gateway for chat', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      expect(headers.get('anthropic-version')).toBe('2023-06-01')
      if (init?.method === 'POST') {
        return jsonResponse({ content: [{ type: 'text', text: 'anthropic reply' }], usage: { input_tokens: 1, output_tokens: 2 }, stop_reason: 'end_turn' })
      }
      return jsonResponse({ data: [{ id: 'claude-test' }] })
    })
    vi.stubGlobal('fetch', fetchMock)
    const adapter = new AnthropicAdapter()
    expect((await adapter.discoverModels(connection('anthropic', 'https://anthropic.test')))[0]?.id).toBe('claude-test')
    expect((await adapter.chat(connection('anthropic', 'https://anthropic.test'), 'claude-test', [{ role: 'user', content: 'hi' }])).content).toBe('anthropic reply')
  })

  it('supports Ollama model discovery, chat and embedding endpoints', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/tags')) return jsonResponse({ models: [{ name: 'llama3' }, { name: 'nomic-embed-text' }] })
      if (url.endsWith('/api/chat')) return jsonResponse({ message: { content: 'ollama reply' }, done_reason: 'stop' })
      if (url.endsWith('/api/embeddings')) return jsonResponse({ embedding: [0.4, 0.5] })
      return jsonResponse({}, 404)
    })
    vi.stubGlobal('fetch', fetchMock)
    const adapter = new OllamaAdapter()
    const models = await adapter.discoverModels(connection('ollama', 'http://localhost:11434'))
    expect(models.find((model) => model.id === 'nomic-embed-text')?.capabilities).toEqual(['embedding'])
    expect((await adapter.chat(connection('ollama', 'http://localhost:11434'), 'llama3', [{ role: 'user', content: 'hi' }])).content).toBe('ollama reply')
    expect(await adapter.embed(connection('ollama', 'http://localhost:11434'), 'nomic-embed-text', 'text')).toEqual([[0.4, 0.5]])
  })
})
