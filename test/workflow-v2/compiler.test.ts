import { describe, expect, it } from 'vitest'

import { compileWorkflow } from '../../electron/services/workflow-v2/compiler'
import { createCoreWorkflowRegistries } from '../../electron/services/workflow-v2/runtime'
import { WorkflowDomainError } from '../../src/features/workflow-v2/domain/errors'
import type { WorkflowDefinitionDTO } from '../../src/features/workflow-v2/domain/types'

function makeWorkflow(overrides: Partial<WorkflowDefinitionDTO> = {}): WorkflowDefinitionDTO {
  return {
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
    ...overrides,
  }
}

describe('workflow-v2 compiler', () => {
  it('rejects cycles, missing ports and incompatible port types before compile', () => {
    const registries = createCoreWorkflowRegistries()
    const cycle = makeWorkflow({
      edges: [
        { id: 'edge-1', sourceNodeId: 'input', sourcePort: 'value', targetNodeId: 'transform', targetPort: 'value' },
        { id: 'edge-2', sourceNodeId: 'transform', sourcePort: 'value', targetNodeId: 'condition', targetPort: 'value' },
        { id: 'edge-3', sourceNodeId: 'condition', sourcePort: 'true', targetNodeId: 'output', targetPort: 'value' },
        { id: 'edge-4', sourceNodeId: 'output', sourcePort: 'value', targetNodeId: 'transform', targetPort: 'value' },
      ],
    })

    expect(() => compileWorkflow(cycle, registries)).toThrow(WorkflowDomainError)
    expect(() => compileWorkflow(makeWorkflow({
      edges: [{ id: 'bad', sourceNodeId: 'input', sourcePort: 'missing', targetNodeId: 'transform', targetPort: 'value' }],
    }), registries)).toThrow(/port/i)
  })
})
