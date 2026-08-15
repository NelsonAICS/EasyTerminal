import { describe, expect, it, vi } from 'vitest'

import { compileWorkflow } from '../../electron/services/workflow-v2/compiler'
import { createCoreWorkflowRegistries, executeCompiledWorkflow } from '../../electron/services/workflow-v2/runtime'
import { createIndexState, isIndexCompatible, markNeedsReindex, transitionIndexState } from '../../electron/services/knowledge-index'
import { renderPromptTemplate } from '../../electron/services/workflow-v2/nodes/prompt'
import type { WorkflowDefinitionDTO } from '../../src/features/workflow-v2/domain/types'

describe('workflow-v2 RAG and LLM nodes', () => {
  it('tracks embedding identity, dimensions and reindex state', () => {
    let state = createIndexState('docs', { providerId: 'ollama', modelId: 'nomic-embed-text', contentHash: 'hash' })
    state = transitionIndexState(state, 'embedding', { totalChunks: 2 })
    state = transitionIndexState(state, 'indexed', { dimensions: 3, embeddedChunks: 2 })
    expect(isIndexCompatible(state, { providerId: 'ollama', modelId: 'nomic-embed-text', dimensions: 3 })).toBe(true)
    expect(isIndexCompatible(state, { providerId: 'openai', modelId: 'text-embedding-3-small', dimensions: 3 })).toBe(false)
    expect(markNeedsReindex(state, 'model changed').status).toBe('needs_reindex')
  })

  it('renders only connected typed prompt inputs and rejects hidden node references', () => {
    expect(renderPromptTemplate('Question: {{query}}\nContext: {{context}}', { query: 'What?', context: 'Facts' })).toContain('Facts')
    expect(() => renderPromptTemplate('{{result.retriever}}', {})).toThrow(/typed input/i)
  })

  it('passes query and retrieval context to the LLM and preserves citations', async () => {
    const chat = vi.fn(async (_modelRef, messages) => {
      expect(messages[0].content).toContain('Paris')
      expect(messages[0].content).toContain('What is the capital?')
      return { content: 'Paris', usage: { input_tokens: 10, output_tokens: 1 } }
    })
    const workflow: WorkflowDefinitionDTO = {
      id: 'rag-workflow',
      name: 'RAG answer',
      schemaVersion: 1,
      revision: 1,
      nodes: [
        { id: 'input', type: 'input.text', version: 1, position: { x: 0, y: 0 }, config: {} },
        { id: 'retriever', type: 'retriever', version: 1, position: { x: 220, y: -80 }, config: { topK: 3 } },
        { id: 'llm', type: 'llm', version: 1, position: { x: 440, y: 0 }, config: {} },
        { id: 'output', type: 'output.text', version: 1, position: { x: 660, y: 0 }, config: {} },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'input', sourcePort: 'query', targetNodeId: 'retriever', targetPort: 'query' },
        { id: 'e2', sourceNodeId: 'input', sourcePort: 'query', targetNodeId: 'llm', targetPort: 'query' },
        { id: 'e3', sourceNodeId: 'retriever', sourcePort: 'documents', targetNodeId: 'llm', targetPort: 'documents' },
        { id: 'e4', sourceNodeId: 'retriever', sourcePort: 'contextText', targetNodeId: 'llm', targetPort: 'context' },
        { id: 'e5', sourceNodeId: 'retriever', sourcePort: 'citations', targetNodeId: 'llm', targetPort: 'citations' },
        { id: 'e6', sourceNodeId: 'llm', sourcePort: 'answer', targetNodeId: 'output', targetPort: 'value' },
      ],
      settings: { maxConcurrency: 4, defaultNodeTimeoutMs: 30_000 },
    }
    const registries = createCoreWorkflowRegistries({
      llm: {
        chat,
        getDefaultModelRef: () => ({ providerId: 'fake', modelId: 'fake-chat' }),
      },
      retriever: {
        retrieve: async () => ({
          query: 'What is the capital?',
          contextText: 'Paris is the capital of France.',
          chunks: [{ id: 'chunk-1', documentId: 'doc-1', content: 'Paris is the capital of France.', score: 0.99, source: 'facts.txt', metadata: {} }],
          citations: [{ chunkId: 'chunk-1', documentId: 'doc-1', source: 'facts.txt', score: 0.99 }],
          truncated: false,
        }),
      },
    })
    const result = await executeCompiledWorkflow(compileWorkflow(workflow, registries), { query: 'What is the capital?' }, { runId: 'rag-run' })
    expect(chat).toHaveBeenCalledTimes(1)
    expect(result.outputs.output.value).toBe('Paris')
    expect(result.outputs.llm.citations).toEqual([{ chunkId: 'chunk-1', documentId: 'doc-1', source: 'facts.txt', score: 0.99 }])
  })
})
