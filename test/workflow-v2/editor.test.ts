import { describe, expect, it } from 'vitest'

import { fromFlowGraph, toFlowGraph } from '../../src/features/workflow-v2/editor/react-flow-adapter'
import type { WorkflowDefinitionDTO } from '../../src/features/workflow-v2/domain/types'

const workflow: WorkflowDefinitionDTO = {
  id: 'editor-workflow',
  name: 'Editor workflow',
  schemaVersion: 1,
  revision: 1,
  nodes: [
    { id: 'a', type: 'input.text', version: 1, position: { x: 10, y: 20 }, config: {} },
    { id: 'b', type: 'prompt', version: 1, position: { x: 200, y: 20 }, config: { template: '{{query}}' } },
  ],
  edges: [{ id: 'e1', sourceNodeId: 'a', sourcePort: 'query', targetNodeId: 'b', targetPort: 'query' }],
  settings: { maxConcurrency: 4, defaultNodeTimeoutMs: 30_000 },
}

describe('workflow editor adapter', () => {
  it('round-trips React Flow graph data without losing typed handles or positions', () => {
    const flow = toFlowGraph(workflow)
    expect(flow.edges[0].sourceHandle).toBe('query')
    expect(flow.edges[0].targetHandle).toBe('query')
    const roundTrip = fromFlowGraph(workflow, flow.nodes, flow.edges)
    expect(roundTrip.nodes.map((node) => node.position)).toEqual(workflow.nodes.map((node) => node.position))
    expect(roundTrip.edges).toEqual(workflow.edges)
  })
})
