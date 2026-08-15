import { describe, expect, it } from 'vitest'

import {
  workflowDefinitionSchema,
  workflowEdgeSchema,
  workflowNodeSchema,
} from '../../src/features/workflow-v2/domain/schemas'

const validNode = {
  id: 'input',
  type: 'input',
  version: 1,
  position: { x: 0, y: 0 },
  config: {},
}

describe('workflow-v2 domain schemas', () => {
  it('accepts a versioned graph with explicit edge ports', () => {
    const result = workflowDefinitionSchema.safeParse({
      id: 'workflow-1',
      name: 'Typed workflow',
      schemaVersion: 1,
      revision: 1,
      nodes: [validNode],
      edges: [],
      settings: { maxConcurrency: 4, defaultNodeTimeoutMs: 30_000 },
    })

    expect(result.success).toBe(true)
  })

  it('requires source and target port names on edges', () => {
    const result = workflowEdgeSchema.safeParse({
      id: 'edge-1',
      sourceNodeId: 'input',
      targetNodeId: 'output',
    })

    expect(result.success).toBe(false)
  })

  it('rejects invalid graph limits and duplicate node ids', () => {
    const duplicateNodeGraph = {
      id: 'workflow-1',
      name: 'Invalid workflow',
      schemaVersion: 1,
      revision: 1,
      nodes: [validNode, { ...validNode }],
      edges: [],
      settings: { maxConcurrency: 0, defaultNodeTimeoutMs: -1 },
    }

    expect(workflowDefinitionSchema.safeParse(duplicateNodeGraph).success).toBe(false)
  })

  it('keeps false, zero, empty text and null as valid values', () => {
    const result = workflowNodeSchema.safeParse({
      ...validNode,
      config: { falseValue: false, zeroValue: 0, emptyValue: '', nullValue: null },
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.config).toEqual({ falseValue: false, zeroValue: 0, emptyValue: '', nullValue: null })
    }
  })
})
