import { compileWorkflow, type WorkflowRegistries } from './compiler';
import { executeCompiledWorkflow } from './runtime';
import { WorkflowCheckpointSaver } from './checkpoint-saver';
import { WorkflowDomainError } from '../../../src/features/workflow-v2/domain/errors';
import type { WorkflowDefinitionDTO, WorkflowNodeError, WorkflowRunEvent } from '../../../src/features/workflow-v2/domain/types';
import type { PublishedNodeDefinition } from './node-definition';
import type { SqliteDatabase } from './sqlite';
import { WorkflowRepository } from './repository';
import { WorkflowRunRepository, type WorkflowRunRecord } from './run-repository';

export interface WorkflowRunEventSink {
  (event: WorkflowRunEvent): void;
}

export interface WorkflowStartInput {
  workflowId: string;
  revision?: number;
  input: Record<string, unknown>;
  runId?: string;
}

interface ActiveRun {
  runId: string;
  workflow: WorkflowDefinitionDTO;
  input: Record<string, unknown>;
  controller: AbortController;
  sink?: WorkflowRunEventSink;
  resume: boolean;
}

function makeError(error: unknown): WorkflowNodeError {
  if (error instanceof WorkflowDomainError) return { code: error.code, message: error.message, details: error.details };
  if (error && typeof error === 'object') {
    const value = error as { code?: unknown; message?: unknown; details?: unknown };
    return {
      code: typeof value.code === 'string' ? value.code : 'WORKFLOW_EXECUTION_FAILED',
      message: typeof value.message === 'string' ? value.message : 'Workflow execution failed',
      details: value.details && typeof value.details === 'object' ? value.details as Record<string, unknown> : undefined,
    };
  }
  return { code: 'WORKFLOW_EXECUTION_FAILED', message: String(error) };
}

function findConfirmationError(error: unknown): { details: Record<string, unknown>; nodeId?: string } | undefined {
  let current: unknown = error;
  for (let i = 0; i < 4 && current; i += 1) {
    if (typeof current === 'object') {
      const value = current as { code?: unknown; details?: unknown; nodeId?: unknown; cause?: unknown };
      if (value.code === 'WORKFLOW_CONFIRMATION_REQUIRED' && value.details && typeof value.details === 'object') {
        return { details: value.details as Record<string, unknown>, nodeId: typeof value.nodeId === 'string' ? value.nodeId : undefined };
      }
      current = value.cause;
    } else break;
  }
  return undefined;
}

export class WorkflowRunManager {
  private readonly active = new Map<string, ActiveRun>();

  constructor(
    private readonly database: SqliteDatabase,
    private readonly workflows: WorkflowRepository,
    private readonly runs: WorkflowRunRepository,
    private readonly registries: WorkflowRegistries,
  ) {}

  async start(input: WorkflowStartInput, sink?: WorkflowRunEventSink): Promise<{ runId: string; workflowId: string; revision: number }> {
    const persisted = this.workflows.requireRevision(input.workflowId, input.revision);
    const runId = input.runId ?? `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    this.runs.createRun({ id: runId, workflowId: persisted.workflowId, revision: persisted.revision, input: input.input });
    this.runs.startRun(runId);
    const active: ActiveRun = {
      runId,
      workflow: persisted.definition,
      input: structuredClone(input.input),
      controller: new AbortController(),
      sink,
      resume: false,
    };
    this.active.set(runId, active);
    void this.execute(active);
    return { runId, workflowId: persisted.workflowId, revision: persisted.revision };
  }

  cancel(runId: string): WorkflowRunRecord {
    const active = this.active.get(runId);
    if (active) {
      active.controller.abort();
      return this.runs.requireRun(runId);
    }
    const run = this.runs.requireRun(runId);
    if (run.status === 'waiting_confirmation' || run.status === 'running' || run.status === 'pending') return this.runs.finishRun(runId, 'cancelled');
    return run;
  }

  async resumeConfirmation(confirmationId: string, approved: boolean, sink?: WorkflowRunEventSink): Promise<WorkflowRunRecord> {
    const confirmation = this.runs.getConfirmation(confirmationId);
    if (!confirmation) throw new WorkflowDomainError('RUN_NOT_FOUND', 'Confirmation was not found', { confirmationId });
    const resolved = this.runs.resolveConfirmation(confirmationId, approved);
    if (!approved) {
      const cancelled = this.runs.finishRun(resolved.runId, 'cancelled', { error: { code: 'CANCELLED_BY_USER', message: '用户拒绝了副作用操作', nodeId: resolved.nodeId } });
      this.emit(resolved.runId, { workflowId: cancelled.workflowId, revision: cancelled.revision, runId: cancelled.id, nodeId: resolved.nodeId, sequence: 0, status: 'cancelled_by_user', timestamp: new Date().toISOString() }, sink);
      return cancelled;
    }
    const run = this.runs.requireRun(resolved.runId);
    const persisted = this.workflows.requireRevision(run.workflowId, run.revision);
    const active = this.active.get(run.id) ?? {
      runId: run.id,
      workflow: persisted.definition,
      input: run.input,
      controller: new AbortController(),
      sink,
      resume: true,
    };
    active.workflow = structuredClone(persisted.definition);
    const node = active.workflow.nodes.find((item) => item.id === resolved.nodeId);
    if (node) node.config = { ...node.config, confirmed: true };
    active.resume = true;
    active.sink = sink ?? active.sink;
    this.active.set(run.id, active);
    this.runs.startRun(run.id);
    void this.execute(active);
    return this.runs.requireRun(run.id);
  }

  getRun(runId: string): WorkflowRunRecord {
    return this.runs.requireRun(runId);
  }

  getPendingConfirmation(runId: string) {
    return this.runs.getPendingConfirmation(runId);
  }

  /** Add a newly published definition without rebuilding the Electron process. */
  registerNodeDefinition(definition: PublishedNodeDefinition): void {
    if (!this.registries.nodes.get(definition.type, definition.version)) {
      this.registries.nodes.register(definition)
    }
  }

  private async execute(active: ActiveRun): Promise<void> {
    const saver = new WorkflowCheckpointSaver(this.database, { workflowId: active.workflow.id, revision: active.workflow.revision });
    try {
      const compiled = compileWorkflow(active.workflow, this.registries, { checkpointer: saver });
      const result = await executeCompiledWorkflow(compiled, active.input, {
        runId: active.runId,
        threadId: active.runId,
        signal: active.controller.signal,
        resume: active.resume,
      });
      for (const event of result.events) {
        this.runs.recordNodeRun({
          runId: active.runId,
          nodeId: event.nodeId ?? 'unknown',
          sequence: event.sequence,
          status: event.status === 'succeeded' ? 'succeeded' : 'running',
          input: {},
          output: event.nodeId ? result.outputs[event.nodeId] ?? {} : {},
          error: null,
          startedAt: event.timestamp,
          completedAt: event.timestamp,
        });
        this.emit(active.runId, event, active.sink);
      }
      this.runs.finishRun(active.runId, 'succeeded', { output: result.outputs });
    } catch (error) {
      const confirmation = findConfirmationError(error);
      if (confirmation) {
        const nodeId = confirmation.nodeId ?? String(confirmation.details.nodeId ?? 'unknown');
        const confirmationRecord = this.runs.createConfirmation({ id: `confirmation-${active.runId}-${Date.now().toString(36)}`, runId: active.runId, nodeId, payload: confirmation.details });
        const run = this.runs.finishRun(active.runId, 'waiting_confirmation');
        this.emit(active.runId, { workflowId: run.workflowId, revision: run.revision, runId: run.id, nodeId, sequence: 0, status: 'waiting_confirmation', timestamp: new Date().toISOString(), message: confirmationRecord.id }, active.sink);
        return;
      }
      const nodeError = makeError(error);
      const cancelled = active.controller.signal.aborted;
      const run = this.runs.finishRun(active.runId, cancelled ? 'cancelled' : 'failed', { error: nodeError });
      this.emit(active.runId, { workflowId: run.workflowId, revision: run.revision, runId: run.id, sequence: 0, status: cancelled ? 'cancelled' : 'failed', timestamp: new Date().toISOString(), error: nodeError }, active.sink);
    } finally {
      if (this.active.get(active.runId)?.resume || !this.runs.getPendingConfirmation(active.runId)) this.active.delete(active.runId);
    }
  }

  private emit(runId: string, event: WorkflowRunEvent, sink?: WorkflowRunEventSink): void {
    sink?.(event);
  }
}
