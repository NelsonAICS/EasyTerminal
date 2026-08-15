import type { ModelInfo } from '../../../../src/types/model-provider'
import { chatCompletion, type LLMMessage, type LLMResponse, type LLMTool } from '../../llm-gateway'
import type { ProviderAdapter, ProviderConnection, ProviderTestResult } from '../provider-types'

function modelsEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, '')
  return trimmed.replace(/\/v1(?:\/messages)?$/i, '') + '/v1/models'
}

async function readError(response: Response): Promise<string> {
  return `HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`
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

export class AnthropicAdapter implements ProviderAdapter {
  readonly kind = 'anthropic' as const
  readonly capabilities = ['chat'] as const

  async testConnection(connection: ProviderConnection): Promise<ProviderTestResult> {
    const models = await this.discoverModels(connection)
    return { ok: true, models, message: models.length ? `发现 ${models.length} 个模型` : '连接成功，服务端未返回模型列表' }
  }

  async discoverModels(connection: ProviderConnection): Promise<ModelInfo[]> {
    const response = await fetch(modelsEndpoint(connection.baseUrl), {
      headers: {
        'anthropic-version': '2023-06-01',
        ...(connection.apiKey ? { 'x-api-key': connection.apiKey } : {}),
      },
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
      apiFormat: 'anthropic',
    }, messages, tools, systemPrompt)
  }
}
