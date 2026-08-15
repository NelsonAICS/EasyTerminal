import type { LLMMessage, LLMResponse } from '../../llm-gateway'
import type { ModelInfo } from '../../../../src/types/model-provider'
import type { ProviderAdapter, ProviderConnection, ProviderTestResult } from '../provider-types'

function endpoint(baseUrl: string, override: string | undefined, suffix: string): string {
  if (override?.trim()) return /^https?:\/\//i.test(override) ? override : `${baseUrl.replace(/\/$/, '')}/${override.replace(/^\//, '')}`
  return `${baseUrl.replace(/\/v1\/?$/i, '').replace(/\/$/, '')}${suffix}`
}

async function readError(response: Response): Promise<string> {
  return `HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`
}

function isEmbeddingModel(id: string): boolean {
  return /embed|bge|e5|nomic|mxbai|snowflake/i.test(id)
}

export class OllamaAdapter implements ProviderAdapter {
  readonly kind = 'ollama' as const
  readonly capabilities = ['chat', 'embedding'] as const

  async testConnection(connection: ProviderConnection): Promise<ProviderTestResult> {
    const models = await this.discoverModels(connection)
    return { ok: true, models, message: models.length ? `发现 ${models.length} 个本地模型` : 'Ollama 已连接，但没有模型' }
  }

  async discoverModels(connection: ProviderConnection): Promise<ModelInfo[]> {
    const response = await fetch(endpoint(connection.baseUrl, undefined, '/api/tags'), {
      signal: AbortSignal.timeout(5_000),
    })
    if (!response.ok) throw new Error(await readError(response))
    const payload = await response.json() as { models?: Array<{ name?: string }> }
    return (payload.models ?? []).flatMap((model): ModelInfo[] => {
      if (!model.name) return []
      return [{
        id: model.name,
        capabilities: isEmbeddingModel(model.name) ? ['embedding'] : ['chat'],
        source: 'discovered',
      }]
    })
  }

  async chat(
    connection: ProviderConnection,
    modelId: string,
    messages: LLMMessage[],
  ): Promise<LLMResponse> {
    const response = await fetch(endpoint(connection.baseUrl, connection.chatEndpoint, '/api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelId, messages, stream: false }),
      signal: AbortSignal.timeout(120_000),
    })
    if (!response.ok) throw new Error(await readError(response))
    const payload = await response.json() as {
      message?: { content?: string }
      done_reason?: string
      prompt_eval_count?: number
      eval_count?: number
    }
    return {
      content: payload.message?.content ?? '',
      usage: { input_tokens: payload.prompt_eval_count ?? 0, output_tokens: payload.eval_count ?? 0 },
      stop_reason: payload.done_reason,
    }
  }

  async embed(connection: ProviderConnection, modelId: string, input: string | string[]): Promise<number[][]> {
    const values = Array.isArray(input) ? input : [input]
    const vectors: number[][] = []
    for (const prompt of values) {
      const response = await fetch(endpoint(connection.baseUrl, connection.embeddingEndpoint, '/api/embeddings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId, prompt }),
        signal: AbortSignal.timeout(60_000),
      })
      if (!response.ok) throw new Error(await readError(response))
      const payload = await response.json() as { embedding?: number[] }
      if (!Array.isArray(payload.embedding)) throw new Error('Ollama embedding API returned no vector')
      vectors.push(payload.embedding)
    }
    return vectors
  }
}
