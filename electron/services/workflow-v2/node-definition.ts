import type { PortDefinition, WorkflowNodeDTO } from '../../../src/features/workflow-v2/domain/types'

export type NodeDefinitionStatus = 'draft' | 'published'
export type NodeRisk = 'safe' | 'network' | 'write' | 'system'

export interface PublishedNodeDefinition {
  type: string
  version: number
  status: NodeDefinitionStatus
  executorKind: string
  inputPorts: PortDefinition[]
  outputPorts: PortDefinition[]
  configSchema: Record<string, unknown>
  risk: NodeRisk
}

export interface NodeExecutorContext {
  node: WorkflowNodeDTO
  definition: PublishedNodeDefinition
  inputs: Record<string, unknown>
  config: Record<string, unknown>
  signal: AbortSignal
  runId: string
}

export type NodeExecutor = (
  context: NodeExecutorContext,
) => Promise<Record<string, unknown>>
