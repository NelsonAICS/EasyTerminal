import type { LLMMessage, LLMResponse, LLMTool } from '../llm-gateway'
import type {
  ModelCapability,
  ModelInfo,
  ProviderKind,
} from '../../../src/types/model-provider'

export interface StoredProviderConfig {
  id: string
  name: string
  kind: ProviderKind
  baseUrl: string
  chatEndpoint?: string
  embeddingEndpoint?: string
  models: ModelInfo[]
  health: 'unknown' | 'testing' | 'connected' | 'error'
  errorMessage?: string
  updatedAt: string
}

export interface ProviderConnection extends StoredProviderConfig {
  apiKey: string
}

export interface ProviderTestResult {
  ok: boolean
  message?: string
  models?: ModelInfo[]
}

export interface ProviderAdapter {
  readonly kind: ProviderKind
  readonly capabilities: readonly ModelCapability[]
  testConnection(connection: ProviderConnection): Promise<ProviderTestResult>
  discoverModels(connection: ProviderConnection): Promise<ModelInfo[]>
  chat(
    connection: ProviderConnection,
    modelId: string,
    messages: LLMMessage[],
    tools?: LLMTool[],
    systemPrompt?: string,
  ): Promise<LLMResponse>
  embed?(connection: ProviderConnection, modelId: string, input: string | string[]): Promise<number[][]>
}

export interface ProviderKeyValueStore {
  get<T>(key: string, defaultValue: T): T
  set(key: string, value: unknown): void
  delete(key: string): void
}

export interface ProviderSecretVault {
  get(providerId: string): string | undefined
  set(providerId: string, value: string): void
  delete(providerId: string): void
}
