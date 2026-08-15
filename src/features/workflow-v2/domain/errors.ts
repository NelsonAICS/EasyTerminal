export type WorkflowDomainErrorCode =
  | 'INVALID_WORKFLOW'
  | 'DUPLICATE_NODE_ID'
  | 'DUPLICATE_EDGE_ID'
  | 'INVALID_EDGE'
  | 'INVALID_PORT'
  | 'PORT_TYPE_MISMATCH'
  | 'CYCLE_DETECTED'
  | 'MISSING_REQUIRED_INPUT'
  | 'NODE_NOT_PUBLISHED'
  | 'EXECUTOR_NOT_FOUND'
  | 'RUN_CANCELLED'
  | 'REVISION_CONFLICT'
  | 'REVISION_NOT_FOUND'
  | 'RUN_NOT_FOUND'
  | 'CHECKPOINT_REVISION_MISMATCH'

export class WorkflowDomainError extends Error {
  readonly code: WorkflowDomainErrorCode
  readonly details: Record<string, unknown>

  constructor(code: WorkflowDomainErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'WorkflowDomainError'
    this.code = code
    this.details = details
  }
}
