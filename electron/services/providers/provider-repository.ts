import type {
  ApplicationModelDefaults,
  ModelInfo,
  ProviderInput,
  ProviderSummary,
} from '../../../src/types/model-provider'
import type {
  ProviderConnection,
  ProviderKeyValueStore,
  ProviderSecretVault,
  StoredProviderConfig,
} from './provider-types'

const PROVIDERS_KEY = 'workflow_v2_providers'
const DEFAULTS_KEY = 'workflow_v2_model_defaults'

function clone<T>(value: T): T {
  return structuredClone(value)
}

function normalizeModels(models: ModelInfo[] | undefined): ModelInfo[] {
  return (models ?? [])
    .filter((model) => typeof model?.id === 'string' && model.id.trim().length > 0)
    .map((model) => ({
      id: model.id.trim(),
      capabilities: [...new Set(model.capabilities)].filter((capability) => capability === 'chat' || capability === 'embedding'),
      contextWindow: model.contextWindow,
      source: model.source === 'manual' ? 'manual' : 'discovered',
    }))
}

function normalizeProvider(input: ProviderInput, previous?: StoredProviderConfig): StoredProviderConfig {
  if (!input.id.trim() || !input.name.trim()) throw new Error('Provider id and name are required')
  if (!/^https?:\/\//i.test(input.baseUrl.trim())) throw new Error('Provider baseUrl must be an http(s) URL')
  return {
    id: input.id.trim(),
    name: input.name.trim(),
    kind: input.kind,
    baseUrl: input.baseUrl.trim().replace(/\/$/, ''),
    chatEndpoint: input.chatEndpoint?.trim() || undefined,
    embeddingEndpoint: input.embeddingEndpoint?.trim() || undefined,
    models: normalizeModels(input.models ?? previous?.models),
    health: previous?.health ?? 'unknown',
    errorMessage: undefined,
    updatedAt: new Date().toISOString(),
  }
}

function toSummary(provider: StoredProviderConfig, hasCredential: boolean): ProviderSummary {
  const capabilities = [...new Set(provider.models.flatMap((model) => model.capabilities))]
  return {
    ...clone(provider),
    capabilities,
    hasCredential,
  }
}

export class ProviderRepository {
  constructor(
    private readonly store: ProviderKeyValueStore,
    private readonly secrets: ProviderSecretVault,
  ) {}

  list(): ProviderSummary[] {
    const providers = this.readProviders()
    return providers.map((provider) => toSummary(provider, Boolean(this.secrets.get(provider.id))))
  }

  get(providerId: string): ProviderSummary | undefined {
    const provider = this.readProviders().find((item) => item.id === providerId)
    return provider ? toSummary(provider, Boolean(this.secrets.get(provider.id))) : undefined
  }

  getConnection(providerId: string): ProviderConnection {
    const provider = this.readProviders().find((item) => item.id === providerId)
    if (!provider) throw new Error(`Provider not found: ${providerId}`)
    return { ...clone(provider), apiKey: this.secrets.get(providerId) ?? '' }
  }

  save(input: ProviderInput, secret?: string): ProviderSummary {
    const providers = this.readProviders()
    const previous = providers.find((provider) => provider.id === input.id)
    const provider = normalizeProvider(input, previous)
    const next = providers.some((item) => item.id === provider.id)
      ? providers.map((item) => item.id === provider.id ? provider : item)
      : [...providers, provider]
    this.store.set(PROVIDERS_KEY, next)
    if (secret !== undefined) {
      if (secret.trim()) this.secrets.set(provider.id, secret)
      else this.secrets.delete(provider.id)
    }
    return toSummary(provider, Boolean(this.secrets.get(provider.id)))
  }

  remove(providerId: string): void {
    this.store.set(PROVIDERS_KEY, this.readProviders().filter((provider) => provider.id !== providerId))
    this.secrets.delete(providerId)
    const defaults = this.getDefaults()
    this.setDefaults({
      defaultLlmModelRef: defaults.defaultLlmModelRef?.providerId === providerId ? null : defaults.defaultLlmModelRef,
      defaultEmbeddingModelRef: defaults.defaultEmbeddingModelRef?.providerId === providerId ? null : defaults.defaultEmbeddingModelRef,
    })
  }

  updateModels(providerId: string, models: ModelInfo[]): ProviderSummary {
    const providers = this.readProviders()
    const provider = providers.find((item) => item.id === providerId)
    if (!provider) throw new Error(`Provider not found: ${providerId}`)
    provider.models = normalizeModels(models)
    provider.updatedAt = new Date().toISOString()
    provider.health = 'connected'
    provider.errorMessage = undefined
    this.store.set(PROVIDERS_KEY, providers)
    return toSummary(provider, Boolean(this.secrets.get(providerId)))
  }

  updateHealth(providerId: string, health: StoredProviderConfig['health'], errorMessage?: string): ProviderSummary {
    const providers = this.readProviders()
    const provider = providers.find((item) => item.id === providerId)
    if (!provider) throw new Error(`Provider not found: ${providerId}`)
    provider.health = health
    provider.errorMessage = errorMessage
    provider.updatedAt = new Date().toISOString()
    this.store.set(PROVIDERS_KEY, providers)
    return toSummary(provider, Boolean(this.secrets.get(providerId)))
  }

  getDefaults(): ApplicationModelDefaults {
    const defaults = this.store.get<ApplicationModelDefaults>(DEFAULTS_KEY, {
      defaultLlmModelRef: null,
      defaultEmbeddingModelRef: null,
    })
    return {
      defaultLlmModelRef: defaults?.defaultLlmModelRef ?? null,
      defaultEmbeddingModelRef: defaults?.defaultEmbeddingModelRef ?? null,
    }
  }

  setDefaults(defaults: ApplicationModelDefaults): ApplicationModelDefaults {
    const normalized: ApplicationModelDefaults = {
      defaultLlmModelRef: defaults.defaultLlmModelRef ? { ...defaults.defaultLlmModelRef } : null,
      defaultEmbeddingModelRef: defaults.defaultEmbeddingModelRef ? { ...defaults.defaultEmbeddingModelRef } : null,
    }
    this.store.set(DEFAULTS_KEY, normalized)
    return clone(normalized)
  }

  /** One-time migration from the old renderer-visible provider array. */
  migrateLegacyProviders(legacy: unknown): number {
    if (this.readProviders().length > 0 || !Array.isArray(legacy)) return 0
    let migrated = 0
    for (const item of legacy) {
      if (!item || typeof item !== 'object') continue
      const value = item as Record<string, unknown>
      const id = typeof value.id === 'string' ? value.id : ''
      const name = typeof value.name === 'string' ? value.name : id
      const baseUrl = typeof value.baseUrl === 'string' ? value.baseUrl : ''
      if (!id || !name || !baseUrl) continue
      const apiFormat = value.apiFormat
      const kind = apiFormat === 'anthropic' || id === 'anthropic' || id === 'minimax' || id === 'doubao'
        ? 'anthropic'
        : id === 'ollama' ? 'ollama' : 'openai_compatible'
      const modelText = typeof value.models === 'string' ? value.models : ''
      const models = modelText.split(',').map((model) => model.trim()).filter(Boolean).map((model): ModelInfo => ({
        id: model,
        capabilities: ['chat'],
        source: 'manual',
      }))
      this.save({
        id,
        name,
        kind,
        baseUrl,
        chatEndpoint: typeof value.chatEndpoint === 'string' ? value.chatEndpoint : undefined,
        embeddingEndpoint: typeof value.embeddingEndpoint === 'string' ? value.embeddingEndpoint : undefined,
        models,
      }, typeof value.apiKey === 'string' ? value.apiKey : undefined)
      migrated += 1
    }
    return migrated
  }

  private readProviders(): StoredProviderConfig[] {
    const value = this.store.get<unknown>(PROVIDERS_KEY, [])
    if (!Array.isArray(value)) return []
    return value.filter((item): item is StoredProviderConfig => Boolean(item && typeof item === 'object' && typeof (item as StoredProviderConfig).id === 'string')).map((item) => ({
      ...item,
      models: normalizeModels(item.models),
      health: item.health ?? 'unknown',
      updatedAt: item.updatedAt ?? new Date(0).toISOString(),
    }))
  }
}

export { PROVIDERS_KEY, DEFAULTS_KEY }
