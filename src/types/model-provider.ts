export type ProviderKind = 'openai_compatible' | 'anthropic' | 'ollama'

export type ModelCapability = 'chat' | 'embedding'

export interface ModelRef {
  providerId: string
  modelId: string
}

export interface ModelInfo {
  id: string
  capabilities: ModelCapability[]
  contextWindow?: number
  source: 'discovered' | 'manual'
}

export type ProviderHealth = 'unknown' | 'testing' | 'connected' | 'error'

/** Safe Provider DTO. It never contains an API key. */
export interface ProviderSummary {
  id: string
  name: string
  kind: ProviderKind
  baseUrl: string
  chatEndpoint?: string
  embeddingEndpoint?: string
  models: ModelInfo[]
  capabilities: ModelCapability[]
  hasCredential: boolean
  health: ProviderHealth
  errorMessage?: string
  updatedAt: string
}

export interface ProviderInput {
  id: string
  name: string
  kind: ProviderKind
  baseUrl: string
  chatEndpoint?: string
  embeddingEndpoint?: string
  models?: ModelInfo[]
}

export interface ApplicationModelDefaults {
  defaultLlmModelRef: ModelRef | null
  defaultEmbeddingModelRef: ModelRef | null
}
