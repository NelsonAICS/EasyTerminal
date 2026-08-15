import type { ModelRef } from '../../../../src/types/model-provider'
import type { LLMMessage, LLMResponse, LLMTool } from '../../llm-gateway'
import type { NodeExecutor, PublishedNodeDefinition } from '../node-definition'

export interface LLMNodeService {
  chat(modelRef: ModelRef, messages: LLMMessage[], tools?: LLMTool[], systemPrompt?: string): Promise<LLMResponse>
  getDefaultModelRef(): ModelRef | null
}

export const llmDefinition: PublishedNodeDefinition = {
  type: 'llm',
  version: 1,
  status: 'published',
  executorKind: 'llm',
  inputPorts: [
    { id: 'query', type: 'text', required: true },
    { id: 'context', type: 'text' },
    { id: 'documents', type: 'documents' },
    { id: 'citations', type: 'json' },
  ],
  outputPorts: [
    { id: 'answer', type: 'text' },
    { id: 'citations', type: 'json' },
    { id: 'usage', type: 'json' },
  ],
  configSchema: { modelRef: 'ModelRef?', systemPrompt: 'string?' },
  risk: 'network',
}

function modelRefFromConfig(config: Record<string, unknown>, service: LLMNodeService): ModelRef {
  const configured = config.modelRef
  if (configured && typeof configured === 'object') {
    const value = configured as Record<string, unknown>
    if (typeof value.providerId === 'string' && typeof value.modelId === 'string') {
      return { providerId: value.providerId, modelId: value.modelId }
    }
  }
  const defaultRef = service.getDefaultModelRef()
  if (!defaultRef) throw new Error('No LLM model is configured for this node')
  return defaultRef
}

export function createLLMExecutor(service?: LLMNodeService): NodeExecutor {
  return async ({ inputs, config }) => {
    if (!service) throw new Error('LLM node service is not configured in the workflow runtime')
    if (typeof inputs.query !== 'string') throw new Error('LLM node requires a text query input')
    const context = typeof inputs.context === 'string'
      ? inputs.context
      : Array.isArray(inputs.documents)
        ? inputs.documents.map((document) => typeof document === 'string' ? document : JSON.stringify(document)).join('\n\n')
        : ''
    const userContent = context ? `Context:\n${context}\n\nQuestion:\n${inputs.query}` : inputs.query
    const response = await service.chat(
      modelRefFromConfig(config, service),
      [{ role: 'user', content: userContent }],
      undefined,
      typeof config.systemPrompt === 'string' ? config.systemPrompt : undefined,
    )
    return {
      answer: response.content,
      citations: inputs.citations ?? [],
      usage: response.usage ?? {},
    }
  }
}

export const llmExecutor: NodeExecutor = createLLMExecutor()
