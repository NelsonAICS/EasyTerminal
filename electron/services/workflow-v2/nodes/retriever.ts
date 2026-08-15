import type { ModelRef } from '../../../../src/types/model-provider'
import type { WorkflowRetrievalResult } from '../../knowledge-base'
import type { NodeExecutor, PublishedNodeDefinition } from '../node-definition'

export interface RetrieverNodeService {
  retrieve(
    query: string,
    options: { topK?: number; collection?: string; modelRef?: ModelRef; signal: AbortSignal },
  ): Promise<WorkflowRetrievalResult>
}

export const retrieverDefinition: PublishedNodeDefinition = {
  type: 'retriever',
  version: 1,
  status: 'published',
  executorKind: 'retriever',
  inputPorts: [{ id: 'query', type: 'text', required: true }],
  outputPorts: [
    { id: 'documents', type: 'documents' },
    { id: 'contextText', type: 'text' },
    { id: 'citations', type: 'json' },
  ],
  configSchema: { topK: 'number?', collection: 'string?', modelRef: 'ModelRef?' },
  risk: 'network',
}

function configuredModelRef(config: Record<string, unknown>): ModelRef | undefined {
  const value = config.modelRef
  if (!value || typeof value !== 'object') return undefined
  const ref = value as Record<string, unknown>
  return typeof ref.providerId === 'string' && typeof ref.modelId === 'string'
    ? { providerId: ref.providerId, modelId: ref.modelId }
    : undefined
}

export function createRetrieverExecutor(service?: RetrieverNodeService): NodeExecutor {
  return async ({ inputs, config, signal }) => {
    if (!service) throw new Error('Retriever node service is not configured in the workflow runtime')
    if (signal.aborted) throw new Error('Retriever node was cancelled')
    if (typeof inputs.query !== 'string') throw new Error('Retriever node requires a text query input')
    const result = await service.retrieve(inputs.query, {
      topK: typeof config.topK === 'number' ? config.topK : 5,
      collection: typeof config.collection === 'string' ? config.collection : undefined,
      modelRef: configuredModelRef(config),
      signal,
    })
    return {
      documents: result.chunks,
      contextText: result.contextText,
      citations: result.citations,
    }
  }
}

export const retrieverExecutor: NodeExecutor = createRetrieverExecutor()
