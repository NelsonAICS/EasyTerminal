import type { ModelRef } from '../../../src/types/model-provider'
import { ProviderRepository } from './provider-repository'

export type ResolvableModelRole = 'llm' | 'embedding'

export class ModelResolver {
  constructor(private readonly repository: ProviderRepository) {}

  resolveDefault(role: ResolvableModelRole): ModelRef {
    const defaults = this.repository.getDefaults()
    const modelRef = role === 'llm' ? defaults.defaultLlmModelRef : defaults.defaultEmbeddingModelRef
    if (!modelRef) throw new Error(`No default ${role} model has been configured`)
    return { ...modelRef }
  }

  resolve(modelRef: ModelRef): { providerId: string; modelId: string } {
    const provider = this.repository.get(modelRef.providerId)
    if (!provider) throw new Error(`Provider not found: ${modelRef.providerId}`)
    if (!provider.models.some((model) => model.id === modelRef.modelId)) {
      throw new Error(`Model not found: ${modelRef.providerId}/${modelRef.modelId}`)
    }
    return { providerId: modelRef.providerId, modelId: modelRef.modelId }
  }
}
