import { describe, expect, it } from 'vitest'

import { compileWorkflow } from '../../electron/services/workflow-v2/compiler'
import { createCoreWorkflowRegistries, executeCompiledWorkflow } from '../../electron/services/workflow-v2/runtime'
import type { WorkflowDefinitionDTO } from '../../src/features/workflow-v2/domain/types'

const workflow: WorkflowDefinitionDTO = {
  id: 'workflow-1',
  name: 'Arithmetic workflow',
  schemaVersion: 1,
  revision: 1,
  nodes: [
    { id: 'input', type: 'input', version: 1, position: { x: 0, y: 0 }, config: {} },
    { id: 'transform', type: 'json-transform', version: 1, position: { x: 180, y: 0 }, config: { operation: 'multiply', factor: 2 } },
    { id: 'condition', type: 'condition', version: 1, position: { x: 360, y: 0 }, config: { operator: 'greaterThan', threshold: 5 } },
    { id: 'output', type: 'output', version: 1, position: { x: 540, y: 0 }, config: {} },
  ],
  edges: [
    { id: 'edge-1', sourceNodeId: 'input', sourcePort: 'value', targetNodeId: 'transform', targetPort: 'value' },
    { id: 'edge-2', sourceNodeId: 'transform', sourcePort: 'value', targetNodeId: 'condition', targetPort: 'value' },
    { id: 'edge-3', sourceNodeId: 'condition', sourcePort: 'true', targetNodeId: 'output', targetPort: 'value' },
    { id: 'edge-4', sourceNodeId: 'condition', sourcePort: 'false', targetNodeId: 'output', targetPort: 'value' },
  ],
  settings: { maxConcurrency: 4, defaultNodeTimeoutMs: 30_000 },
}

describe('workflow-v2 runtime', () => {
  it('executes typed input, transform, conditional routing and output', async () => {
    const graph = compileWorkflow(workflow, createCoreWorkflowRegistries())
    const result = await executeCompiledWorkflow(graph, { value: 3 }, { runId: 'run-1' })

    expect(result.outputs.output.value).toBe(6)
    expect(result.outputs.condition.branch).toBe('true')
    expect(result.events.some((event) => event.nodeId === 'output' && event.status === 'succeeded')).toBe(true)
  })

  it('stops before executing a node when its signal is already aborted', async () => {
    const graph = compileWorkflow(workflow, createCoreWorkflowRegistries())
    const controller = new AbortController()
    controller.abort()

    await expect(executeCompiledWorkflow(graph, { value: 3 }, { runId: 'run-2', signal: controller.signal })).rejects.toThrow()
  })
})
