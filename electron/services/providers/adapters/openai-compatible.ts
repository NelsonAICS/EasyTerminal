import { resolveEmbeddingEndpoint } from '../../../../src/shared/api-endpoints'
import type { ModelInfo } from '../../../../src/types/model-provider'
import { chatCompletion, type LLMMessage, type LLMResponse, type LLMTool } from '../../llm-gateway'
import type { ProviderAdapter, ProviderConnection, ProviderTestResult } from '../provider-types'

function modelEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, '')
  return trimmed.replace(/\/(?:chat\/completions|messages|embeddings)$/i, '') + '/models'
}

async function readError(response: Response): Promise<string> {
  const body = await response.text()
  return `HTTP ${response.status}: ${body.slice(0, 300)}`
}

function toModels(data: unknown): ModelInfo[] {
  const values = data && typeof data === 'object' && Array.isArray((data as { data?: unknown[] }).data)
    ? (data as { data: unknown[] }).data
    : []
  return values.flatMap((item): ModelInfo[] => {
    if (!item || typeof item !== 'object' || typeof (item as { id?: unknown }).id !== 'string') return []
    return [{ id: (item as { id: string }).id, capabilities: ['chat'], source: 'discovered' }]
  })
}

export class OpenAICompatibleAdapter implements ProviderAdapter {
  readonly kind = 'openai_compatible' as const
  readonly capabilities = ['chat', 'embedding'] as const

  async testConnection(connection: ProviderConnection): Promise<ProviderTestResult> {
    const models = await this.discoverModels(connection)
    return { ok: true, models, message: models.length ? `发现 ${models.length} 个模型` : '连接成功，服务端未返回模型列表' }
  }

  async discoverModels(connection: ProviderConnection): Promise<ModelInfo[]> {
    const response = await fetch(modelEndpoint(connection.baseUrl), {
      headers: connection.apiKey ? { Authorization: `Bearer ${connection.apiKey}` } : undefined,
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) throw new Error(await readError(response))
    return toModels(await response.json())
  }

  chat(
    connection: ProviderConnection,
    modelId: string,
    messages: LLMMessage[],
    tools?: LLMTool[],
    systemPrompt?: string,
  ): Promise<LLMResponse> {
    return chatCompletion({
      provider: connection.id,
      baseUrl: connection.baseUrl,
      chatEndpoint: connection.chatEndpoint,
      apiKey: connection.apiKey,
      model: modelId,
      apiFormat: 'openai_chat',
    }, messages, tools, systemPrompt)
  }

  async embed(connection: ProviderConnection, modelId: string, input: string | string[]): Promise<number[][]> {
    const response = await fetch(resolveEmbeddingEndpoint(connection.baseUrl, connection.embeddingEndpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(connection.apiKey ? { Authorization: `Bearer ${connection.apiKey}` } : {}),
      },
      body: JSON.stringify({ model: modelId, input }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) throw new Error(await readError(response))
    const payload = await response.json() as { data?: Array<{ embedding?: number[] }> }
    const embeddings = payload.data?.map((item) => item.embedding).filter((item): item is number[] => Array.isArray(item)) ?? []
    if (!embeddings.length) throw new Error('Embedding API returned no vectors')
    return embeddings
  }
}
