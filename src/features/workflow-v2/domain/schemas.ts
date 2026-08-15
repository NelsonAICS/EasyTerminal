import { z } from 'zod'

const portTypes = [
  'text',
  'number',
  'boolean',
  'json',
  'table',
  'messages',
  'documents',
  'artifact',
  'error',
] as const

const configSchema = z.record(z.string(), z.unknown())

export const workflowPositionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
})

export const portDefinitionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(portTypes),
  label: z.string().optional(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  multiple: z.boolean().optional(),
})

export const workflowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  version: z.number().int().positive(),
  position: workflowPositionSchema,
  config: configSchema,
})

export const workflowEdgeSchema = z.object({
  id: z.string().min(1),
  sourceNodeId: z.string().min(1),
  sourcePort: z.string().min(1),
  targetNodeId: z.string().min(1),
  targetPort: z.string().min(1),
})

export const workflowSettingsSchema = z.object({
  maxConcurrency: z.number().int().min(1).max(64),
  defaultNodeTimeoutMs: z.number().int().min(100).max(86_400_000),
})

export const workflowDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  schemaVersion: z.number().int().positive(),
  revision: z.number().int().positive(),
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
  settings: workflowSettingsSchema,
}).superRefine((workflow, context) => {
  const nodeIds = new Set<string>()
  for (const [index, node] of workflow.nodes.entries()) {
    if (nodeIds.has(node.id)) {
      context.addIssue({
        code: 'custom',
        path: ['nodes', index, 'id'],
        message: `Duplicate node id: ${node.id}`,
      })
    }
    nodeIds.add(node.id)
  }

  const edgeIds = new Set<string>()
  for (const [index, edge] of workflow.edges.entries()) {
    if (edgeIds.has(edge.id)) {
      context.addIssue({
        code: 'custom',
        path: ['edges', index, 'id'],
        message: `Duplicate edge id: ${edge.id}`,
      })
    }
    edgeIds.add(edge.id)
  }
})

export type WorkflowDefinitionInput = z.infer<typeof workflowDefinitionSchema>
