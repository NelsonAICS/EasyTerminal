import type {
  ApplicationModelDefaults,
  ModelCapability,
  ModelInfo,
  ModelRef,
  ProviderInput,
  ProviderSummary,
} from '../../../src/types/model-provider'
import type { LLMMessage, LLMResponse, LLMTool } from '../llm-gateway'
import { ProviderRepository } from './provider-repository'
import type { ProviderAdapter, ProviderConnection, ProviderTestResult } from './provider-types'
import { AnthropicAdapter } from './adapters/anthropic'
import { OllamaAdapter } from './adapters/ollama'
import { OpenAICompatibleAdapter } from './adapters/openai-compatible'

export class ProviderAdapterRegistry {
  private readonly adapters = new Map<ProviderAdapter['kind'], ProviderAdapter>()

  register(adapter: ProviderAdapter): void {
    if (this.adapters.has(adapter.kind)) throw new Error(`Provider adapter already registered: ${adapter.kind}`)
    this.adapters.set(adapter.kind, adapter)
  }

  get(kind: ProviderAdapter['kind']): ProviderAdapter {
    const adapter = this.adapters.get(kind)
    if (!adapter) throw new Error(`Provider adapter not registered: ${kind}`)
    return adapter
  }
}

export interface ProviderRegistryOptions {
  repository: ProviderRepository
  adapters: ProviderAdapterRegistry
}

export class ProviderRegistry {
  private readonly repository: ProviderRepository
  private readonly adapters: ProviderAdapterRegistry

  constructor(options: ProviderRegistryOptions) {
    this.repository = options.repository
    this.adapters = options.adapters
  }

  list(): ProviderSummary[] {
    return this.repository.list()
  }

  save(input: ProviderInput, secret?: string): ProviderSummary {
    return this.repository.save(input, secret)
  }

  remove(providerId: string): void {
    this.repository.remove(providerId)
  }

  getDefaults(): ApplicationModelDefaults {
    return this.repository.getDefaults()
  }

  setDefaults(defaults: ApplicationModelDefaults): ApplicationModelDefaults {
    if (defaults.defaultLlmModelRef) this.assertReady(defaults.defaultLlmModelRef, 'chat')
    if (defaults.defaultEmbeddingModelRef) this.assertReady(defaults.defaultEmbeddingModelRef, 'embedding')
    return this.repository.setDefaults(defaults)
  }

  async test(providerId: string): Promise<ProviderTestResult> {
    const connection = this.repository.getConnection(providerId)
    const adapter = this.adapters.get(connection.kind)
    this.repository.updateHealth(providerId, 'testing')
    try {
      const result = await adapter.testConnection(connection)
      if (result.models) this.repository.updateModels(providerId, result.models)
      this.repository.updateHealth(providerId, 'connected')
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Provider connection failed'
      this.repository.updateHealth(providerId, 'error', message)
      throw error
    }
  }

  async discoverModels(providerId: string): Promise<ModelInfo[]> {
    const connection = this.repository.getConnection(providerId)
    const models = await this.adapters.get(connection.kind).discoverModels(connection)
    this.repository.updateModels(providerId, models)
    return models
  }

  async chat(
    modelRef: ModelRef,
    messages: LLMMessage[],
    tools?: LLMTool[],
    systemPrompt?: string,
  ): Promise<LLMResponse> {
    const connection = this.resolve(modelRef, 'chat')
    return this.adapters.get(connection.kind).chat(connection, modelRef.modelId, messages, tools, systemPrompt)
  }

  async embed(modelRef: ModelRef, input: string | string[]): Promise<number[][]> {
    const connection = this.resolve(modelRef, 'embedding')
    const adapter = this.adapters.get(connection.kind)
    if (!adapter.embed) throw new Error(`Provider ${connection.id} does not support embeddings`)
    return adapter.embed(connection, modelRef.modelId, input)
  }

  private resolve(modelRef: ModelRef, capability: ModelCapability): ProviderConnection {
    const connection = this.repository.getConnection(modelRef.providerId)
    const model = connection.models.find((item) => item.id === modelRef.modelId)
    if (connection.models.length > 0 && !model) {
      throw new Error(`Model ${modelRef.modelId} was not discovered for provider ${modelRef.providerId}`)
    }
    if (model && !model.capabilities.includes(capability)) {
      throw new Error(`Model ${modelRef.modelId} does not support ${capability}`)
    }
    return connection
  }

  private assertReady(modelRef: ModelRef, capability: ModelCapability): void {
    const connection = this.resolve(modelRef, capability)
    const provider = this.repository.get(modelRef.providerId)
    if (!provider || provider.health !== 'connected') {
      throw new Error(`Provider ${modelRef.providerId} must pass a connection test before it can be selected`)
    }
    if (connection.kind !== 'ollama' && !connection.apiKey) {
      throw new Error(`Provider ${modelRef.providerId} has no credential`)
    }
  }
}

export function createDefaultProviderAdapters(): ProviderAdapterRegistry {
  const registry = new ProviderAdapterRegistry()
  registry.register(new OpenAICompatibleAdapter())
  registry.register(new AnthropicAdapter())
  registry.register(new OllamaAdapter())
  return registry
}
