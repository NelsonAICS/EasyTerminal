import { WorkflowDomainError } from '../../../src/features/workflow-v2/domain/errors';
import type { WorkflowNodeStatus, WorkflowNodeError } from '../../../src/features/workflow-v2/domain/types';
import { fromStoredJson, toStoredJson } from './sqlite';
import type { SqliteDatabase } from './sqlite';
import type { WorkflowRepository } from './repository';

export type WorkflowRunStatus =
  | 'pending'
  | 'running'
  | 'waiting_confirmation'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'outcome_unknown';

export interface WorkflowRunRecord {
  id: string;
  workflowId: string;
  revision: number;
  status: WorkflowRunStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error: WorkflowNodeError | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface WorkflowNodeRunRecord {
  runId: string;
  nodeId: string;
  sequence: number;
  status: WorkflowNodeStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error: WorkflowNodeError | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface WorkflowConfirmationRecord {
  id: string;
  runId: string;
  nodeId: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  resolvedAt: string | null;
}

interface RunRow {
  id: string;
  workflow_id: string;
  revision: number;
  status: WorkflowRunStatus;
  input_json: string;
  output_json: string;
  error_json: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface NodeRunRow {
  run_id: string;
  node_id: string;
  sequence: number;
  status: WorkflowNodeStatus;
  input_json: string;
  output_json: string;
  error_json: string | null;
  started_at: string | null;
  completed_at: string | null;
}

interface ConfirmationRow {
  id: string;
  run_id: string;
  node_id: string;
  payload_json: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  resolved_at: string | null;
}

function toRun(row: RunRow): WorkflowRunRecord {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    revision: row.revision,
    status: row.status,
    input: fromStoredJson(row.input_json, {}),
    output: fromStoredJson(row.output_json, {}),
    error: row.error_json ? fromStoredJson<WorkflowNodeError | null>(row.error_json, null) : null,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

function toNodeRun(row: NodeRunRow): WorkflowNodeRunRecord {
  return {
    runId: row.run_id,
    nodeId: row.node_id,
    sequence: row.sequence,
    status: row.status,
    input: fromStoredJson(row.input_json, {}),
    output: fromStoredJson(row.output_json, {}),
    error: row.error_json ? fromStoredJson<WorkflowNodeError | null>(row.error_json, null) : null,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

function toConfirmation(row: ConfirmationRow): WorkflowConfirmationRecord {
  return {
    id: row.id,
    runId: row.run_id,
    nodeId: row.node_id,
    payload: fromStoredJson(row.payload_json, {}),
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

export class WorkflowRunRepository {
  constructor(
    private readonly database: SqliteDatabase,
    private readonly workflows: WorkflowRepository,
  ) {}

  createRun(input: {
    id: string;
    workflowId: string;
    revision: number;
    input: Record<string, unknown>;
  }): WorkflowRunRecord {
    this.workflows.requireRevision(input.workflowId, input.revision);
    this.database.prepare(`
      INSERT INTO workflow_v2_runs (id, workflow_id, revision, input_json)
      VALUES (?, ?, ?, ?)
    `).run(input.id, input.workflowId, input.revision, toStoredJson(input.input));
    return this.requireRun(input.id);
  }

  getRun(runId: string): WorkflowRunRecord | undefined {
    const row = this.database.prepare('SELECT * FROM workflow_v2_runs WHERE id = ?').get<RunRow>(runId);
    return row ? toRun(row) : undefined;
  }

  listRuns(workflowId?: string, limit = 50): WorkflowRunRecord[] {
    const boundedLimit = Math.max(1, Math.min(Math.floor(limit), 200))
    const rows = workflowId
      ? this.database.prepare('SELECT * FROM workflow_v2_runs WHERE workflow_id = ? ORDER BY created_at DESC LIMIT ?').all<RunRow>(workflowId, boundedLimit)
      : this.database.prepare('SELECT * FROM workflow_v2_runs ORDER BY created_at DESC LIMIT ?').all<RunRow>(boundedLimit)
    return rows.map(toRun)
  }

  requireRun(runId: string): WorkflowRunRecord {
    const run = this.getRun(runId);
    if (!run) throw new WorkflowDomainError('RUN_NOT_FOUND', `Workflow run ${runId} was not found`, { runId });
    return run;
  }

  requireRunForRevision(runId: string, workflowId: string, revision: number): WorkflowRunRecord {
    const run = this.requireRun(runId);
    if (run.workflowId !== workflowId || run.revision !== revision) {
      throw new WorkflowDomainError('CHECKPOINT_REVISION_MISMATCH', 'Run revision does not match the requested workflow revision', {
        runId,
        expectedWorkflowId: workflowId,
        expectedRevision: revision,
        actualWorkflowId: run.workflowId,
        actualRevision: run.revision,
      });
    }
    return run;
  }

  startRun(runId: string): WorkflowRunRecord {
    this.requireRun(runId);
    this.database.prepare(`
      UPDATE workflow_v2_runs
      SET status = 'running', started_at = COALESCE(started_at, datetime('now'))
      WHERE id = ?
    `).run(runId);
    return this.requireRun(runId);
  }

  finishRun(
    runId: string,
    status: Exclude<WorkflowRunStatus, 'pending' | 'running'>,
    result: { output?: Record<string, unknown>; error?: WorkflowNodeError | null } = {},
  ): WorkflowRunRecord {
    this.requireRun(runId);
    this.database.prepare(`
      UPDATE workflow_v2_runs
      SET status = ?, output_json = ?, error_json = ?, completed_at = datetime('now')
      WHERE id = ?
    `).run(status, toStoredJson(result.output ?? {}), result.error ? toStoredJson(result.error) : null, runId);
    return this.requireRun(runId);
  }

  recordNodeRun(record: WorkflowNodeRunRecord): WorkflowNodeRunRecord {
    this.requireRun(record.runId);
    this.database.prepare(`
      INSERT INTO workflow_v2_node_runs
        (run_id, node_id, sequence, status, input_json, output_json, error_json, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(run_id, node_id, sequence) DO UPDATE SET
        status = excluded.status,
        input_json = excluded.input_json,
        output_json = excluded.output_json,
        error_json = excluded.error_json,
        started_at = excluded.started_at,
        completed_at = excluded.completed_at
    `).run(
      record.runId,
      record.nodeId,
      record.sequence,
      record.status,
      toStoredJson(record.input),
      toStoredJson(record.output),
      record.error ? toStoredJson(record.error) : null,
      record.startedAt,
      record.completedAt,
    );
    const row = this.database.prepare(`
      SELECT * FROM workflow_v2_node_runs
      WHERE run_id = ? AND node_id = ? AND sequence = ?
    `).get<NodeRunRow>(record.runId, record.nodeId, record.sequence);
    if (!row) throw new WorkflowDomainError('RUN_NOT_FOUND', 'Node run could not be persisted', { ...record });
    return toNodeRun(row);
  }

  listNodeRuns(runId: string): WorkflowNodeRunRecord[] {
    this.requireRun(runId);
    const rows = this.database.prepare(`
      SELECT * FROM workflow_v2_node_runs
      WHERE run_id = ?
      ORDER BY sequence ASC
    `).all<NodeRunRow>(runId);
    return rows.map(toNodeRun);
  }

  createConfirmation(input: { id: string; runId: string; nodeId: string; payload: Record<string, unknown> }): WorkflowConfirmationRecord {
    this.requireRun(input.runId);
    this.database.prepare(`
      INSERT INTO workflow_v2_confirmations (id, run_id, node_id, payload_json)
      VALUES (?, ?, ?, ?)
    `).run(input.id, input.runId, input.nodeId, toStoredJson(input.payload));
    const row = this.database.prepare('SELECT * FROM workflow_v2_confirmations WHERE id = ?').get<ConfirmationRow>(input.id);
    if (!row) throw new WorkflowDomainError('RUN_NOT_FOUND', 'Confirmation could not be persisted', { confirmationId: input.id });
    return toConfirmation(row);
  }

  getConfirmation(confirmationId: string): WorkflowConfirmationRecord | undefined {
    const row = this.database.prepare('SELECT * FROM workflow_v2_confirmations WHERE id = ?').get<ConfirmationRow>(confirmationId);
    return row ? toConfirmation(row) : undefined;
  }

  getPendingConfirmation(runId: string): WorkflowConfirmationRecord | undefined {
    const row = this.database.prepare(`
      SELECT * FROM workflow_v2_confirmations
      WHERE run_id = ? AND status = 'pending'
      ORDER BY created_at ASC LIMIT 1
    `).get<ConfirmationRow>(runId);
    return row ? toConfirmation(row) : undefined;
  }

  resolveConfirmation(confirmationId: string, approved: boolean): WorkflowConfirmationRecord {
    const confirmation = this.getConfirmation(confirmationId);
    if (!confirmation) throw new WorkflowDomainError('RUN_NOT_FOUND', 'Confirmation was not found', { confirmationId });
    if (confirmation.status !== 'pending') return confirmation;
    this.database.prepare(`
      UPDATE workflow_v2_confirmations
      SET status = ?, resolved_at = datetime('now')
      WHERE id = ?
    `).run(approved ? 'approved' : 'rejected', confirmationId);
    return this.getConfirmation(confirmationId)!;
  }
}
