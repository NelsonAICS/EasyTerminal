import { WorkflowDomainError } from '../../../src/features/workflow-v2/domain/errors'
import type { NodeExecutor } from './node-definition'

export class ExecutorRegistry {
  private readonly executors = new Map<string, NodeExecutor>()

  register(kind: string, executor: NodeExecutor): void {
    if (!kind.trim()) {
      throw new WorkflowDomainError('INVALID_WORKFLOW', 'Executor kind cannot be empty')
    }
    if (this.executors.has(kind)) {
      throw new WorkflowDomainError('INVALID_WORKFLOW', `Executor ${kind} is already registered`, { kind })
    }
    this.executors.set(kind, executor)
  }

  get(kind: string): NodeExecutor {
    const executor = this.executors.get(kind)
    if (!executor) {
      throw new WorkflowDomainError('EXECUTOR_NOT_FOUND', `Executor ${kind} was not found`, { kind })
    }
    return executor
  }
}
