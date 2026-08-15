export type PortType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'json'
  | 'table'
  | 'messages'
  | 'documents'
  | 'artifact'
  | 'error'

export interface WorkflowPosition {
  x: number
  y: number
}

export interface PortDefinition {
  id: string
  type: PortType
  label?: string
  description?: string
  required?: boolean
  multiple?: boolean
}

export interface WorkflowNodeDTO {
  id: string
  type: string
  version: number
  position: WorkflowPosition
  config: Record<string, unknown>
}

export interface WorkflowEdgeDTO {
  id: string
  sourceNodeId: string
  sourcePort: string
  targetNodeId: string
  targetPort: string
}

export interface WorkflowSettings {
  maxConcurrency: number
  defaultNodeTimeoutMs: number
}

export interface WorkflowDefinitionDTO {
  id: string
  name: string
  schemaVersion: number
  revision: number
  nodes: WorkflowNodeDTO[]
  edges: WorkflowEdgeDTO[]
  settings: WorkflowSettings
}

export type WorkflowNodeStatus =
  | 'queued'
  | 'running'
  | 'waiting_confirmation'
  | 'succeeded'
  | 'failed'
  | 'skipped'
  | 'cancelled'
  | 'cancelled_by_user'
  | 'outcome_unknown'

export interface WorkflowNodeError {
  code: string
  message: string
  nodeId?: string
  port?: string
  retryable?: boolean
  details?: Record<string, unknown>
}

export interface WorkflowRunEvent {
  workflowId: string
  revision: number
  runId: string
  nodeId?: string
  sequence: number
  status: WorkflowNodeStatus | 'started' | 'completed'
  timestamp: string
  message?: string
  error?: WorkflowNodeError
}
