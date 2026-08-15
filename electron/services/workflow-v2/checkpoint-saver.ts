import {
  BaseCheckpointSaver,
  type Checkpoint,
  type CheckpointMetadata,
  type CheckpointTuple,
} from '@langchain/langgraph';
import type { RunnableConfig } from '@langchain/core/runnables';
import { WorkflowDomainError } from '../../../src/features/workflow-v2/domain/errors';
import { initializeWorkflowV2Tables } from './schema';
import { asUint8Array, fromStoredJson, toStoredJson } from './sqlite';
import type { SqliteDatabase } from './sqlite';

type PendingWrite = [channel: string, value: unknown];
type CheckpointListOptions = {
  limit?: number;
  before?: RunnableConfig;
  filter?: Record<string, unknown>;
};

interface CheckpointRow {
  thread_id: string;
  checkpoint_ns: string;
  checkpoint_id: string;
  parent_checkpoint_id: string | null;
  workflow_id: string;
  revision: number;
  checkpoint_type: string;
  checkpoint_blob: unknown;
  metadata_json: string;
}

interface CheckpointWriteRow {
  task_id: string;
  channel: string;
  value_type: string;
  value_blob: unknown;
}

export interface WorkflowCheckpointSaverOptions {
  workflowId: string;
  revision: number;
}

function getConfigurable(config: RunnableConfig): Record<string, unknown> {
  return (config.configurable ?? {}) as Record<string, unknown>;
}

function getThreadId(config: RunnableConfig): string | undefined {
  const threadId = getConfigurable(config).thread_id;
  return typeof threadId === 'string' && threadId.length > 0 ? threadId : undefined;
}

function getNamespace(config: RunnableConfig): string {
  const namespace = getConfigurable(config).checkpoint_ns;
  return typeof namespace === 'string' ? namespace : '';
}

function getCheckpointId(config: RunnableConfig): string | undefined {
  const checkpointId = getConfigurable(config).checkpoint_id;
  return typeof checkpointId === 'string' && checkpointId.length > 0 ? checkpointId : undefined;
}

export class WorkflowCheckpointSaver extends BaseCheckpointSaver {
  constructor(
    private readonly database: SqliteDatabase,
    private readonly options: WorkflowCheckpointSaverOptions,
  ) {
    super();
    initializeWorkflowV2Tables(database);
    if (!options.workflowId || !Number.isInteger(options.revision) || options.revision < 1) {
      throw new WorkflowDomainError('INVALID_WORKFLOW', 'A valid workflow revision is required for checkpoints', options);
    }
  }

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const threadId = getThreadId(config);
    if (!threadId) return undefined;
    const checkpointNs = getNamespace(config);
    const checkpointId = getCheckpointId(config);
    const row = checkpointId
      ? this.database.prepare(`
          SELECT * FROM workflow_v2_checkpoints
          WHERE thread_id = ? AND checkpoint_ns = ? AND checkpoint_id = ?
        `).get<CheckpointRow>(threadId, checkpointNs, checkpointId)
      : this.database.prepare(`
          SELECT * FROM workflow_v2_checkpoints
          WHERE thread_id = ? AND checkpoint_ns = ?
          ORDER BY checkpoint_id DESC
          LIMIT 1
        `).get<CheckpointRow>(threadId, checkpointNs);
    if (!row) return undefined;
    this.assertRevision(row);
    const pendingRows = this.database.prepare(`
      SELECT task_id, channel, value_type, value_blob
      FROM workflow_v2_checkpoint_writes
      WHERE thread_id = ? AND checkpoint_ns = ? AND checkpoint_id = ?
      ORDER BY task_id ASC, write_index ASC
    `).all<CheckpointWriteRow>(threadId, checkpointNs, row.checkpoint_id);
    const pendingWrites = await Promise.all(pendingRows.map(async (pending) => [
      pending.task_id,
      pending.channel,
      await this.serde.loadsTyped(pending.value_type, asUint8Array(pending.value_blob)),
    ] as [string, string, unknown]));
    const tuple: CheckpointTuple = {
      config: {
        configurable: {
          thread_id: threadId,
          checkpoint_ns: checkpointNs,
          checkpoint_id: row.checkpoint_id,
        },
      },
      checkpoint: await this.serde.loadsTyped(row.checkpoint_type, asUint8Array(row.checkpoint_blob)) as Checkpoint,
      metadata: fromStoredJson<CheckpointMetadata | undefined>(row.metadata_json, undefined),
      pendingWrites,
    };
    if (row.parent_checkpoint_id) {
      tuple.parentConfig = {
        configurable: {
          thread_id: threadId,
          checkpoint_ns: checkpointNs,
          checkpoint_id: row.parent_checkpoint_id,
        },
      };
    }
    return tuple;
  }

  async *list(config: RunnableConfig, options: CheckpointListOptions = {}): AsyncGenerator<CheckpointTuple> {
    const threadId = getThreadId(config);
    const checkpointNs = getConfigurable(config).checkpoint_ns;
    const beforeId = getCheckpointId(options.before ?? {});
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (threadId) {
      conditions.push('thread_id = ?');
      params.push(threadId);
    }
    if (typeof checkpointNs === 'string') {
      conditions.push('checkpoint_ns = ?');
      params.push(checkpointNs);
    }
    if (beforeId) {
      conditions.push('checkpoint_id < ?');
      params.push(beforeId);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = this.database.prepare(`
      SELECT * FROM workflow_v2_checkpoints
      ${where}
      ORDER BY checkpoint_id DESC
    `).all<CheckpointRow>(...params);
    let yielded = 0;
    for (const row of rows) {
      if (options.limit !== undefined && yielded >= Math.max(0, options.limit)) return;
      this.assertRevision(row);
      const metadata = fromStoredJson<CheckpointMetadata | undefined>(row.metadata_json, undefined);
      if (options.filter && metadata && !Object.entries(options.filter).every(([key, value]) => metadata[key] === value)) {
        continue;
      }
      const tuple = await this.getTuple({
        configurable: {
          thread_id: row.thread_id,
          checkpoint_ns: row.checkpoint_ns,
          checkpoint_id: row.checkpoint_id,
        },
      });
      if (tuple) {
        yielded += 1;
        yield tuple;
      }
    }
  }

  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
  ): Promise<RunnableConfig> {
    const threadId = getThreadId(config);
    if (!threadId) {
      throw new WorkflowDomainError('INVALID_WORKFLOW', 'Checkpoint config requires configurable.thread_id');
    }
    const checkpointNs = getNamespace(config);
    const parentCheckpointId = getCheckpointId(config) ?? null;
    const [checkpointType, checkpointBlob] = await this.serde.dumpsTyped(checkpoint);
    const existing = this.database.prepare(`
      SELECT * FROM workflow_v2_checkpoints
      WHERE thread_id = ? AND checkpoint_ns = ? AND checkpoint_id = ?
    `).get<CheckpointRow>(threadId, checkpointNs, checkpoint.id);
    if (existing) this.assertRevision(existing);
    this.database.prepare(`
      INSERT INTO workflow_v2_checkpoints
        (thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id,
         workflow_id, revision, checkpoint_type, checkpoint_blob, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(thread_id, checkpoint_ns, checkpoint_id) DO UPDATE SET
        parent_checkpoint_id = excluded.parent_checkpoint_id,
        checkpoint_type = excluded.checkpoint_type,
        checkpoint_blob = excluded.checkpoint_blob,
        metadata_json = excluded.metadata_json
    `).run(
      threadId,
      checkpointNs,
      checkpoint.id,
      parentCheckpointId,
      this.options.workflowId,
      this.options.revision,
      checkpointType,
      checkpointBlob,
      toStoredJson(metadata),
    );
    return {
      configurable: {
        thread_id: threadId,
        checkpoint_ns: checkpointNs,
        checkpoint_id: checkpoint.id,
      },
    };
  }

  async putWrites(config: RunnableConfig, writes: PendingWrite[], taskId: string): Promise<void> {
    const threadId = getThreadId(config);
    const checkpointId = getCheckpointId(config);
    if (!threadId || !checkpointId) {
      throw new WorkflowDomainError('INVALID_WORKFLOW', 'Checkpoint writes require thread_id and checkpoint_id');
    }
    const checkpointNs = getNamespace(config);
    const row = this.database.prepare(`
      SELECT * FROM workflow_v2_checkpoints
      WHERE thread_id = ? AND checkpoint_ns = ? AND checkpoint_id = ?
    `).get<CheckpointRow>(threadId, checkpointNs, checkpointId);
    if (!row) throw new WorkflowDomainError('REVISION_NOT_FOUND', 'Checkpoint does not exist', { threadId, checkpointId });
    this.assertRevision(row);
    for (const [index, [channel, value]] of writes.entries()) {
      const [valueType, valueBlob] = await this.serde.dumpsTyped(value);
      this.database.prepare(`
        INSERT INTO workflow_v2_checkpoint_writes
          (thread_id, checkpoint_ns, checkpoint_id, task_id, write_index, channel, value_type, value_blob)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(thread_id, checkpoint_ns, checkpoint_id, task_id, write_index) DO NOTHING
      `).run(threadId, checkpointNs, checkpointId, taskId, index, channel, valueType, valueBlob);
    }
  }

  async deleteThread(threadId: string): Promise<void> {
    this.database.prepare('DELETE FROM workflow_v2_checkpoints WHERE thread_id = ?').run(threadId);
  }

  private assertRevision(row: Pick<CheckpointRow, 'workflow_id' | 'revision'>): void {
    if (row.workflow_id !== this.options.workflowId || row.revision !== this.options.revision) {
      throw new WorkflowDomainError('CHECKPOINT_REVISION_MISMATCH', 'Checkpoint belongs to a different workflow revision', {
        expectedWorkflowId: this.options.workflowId,
        expectedRevision: this.options.revision,
        actualWorkflowId: row.workflow_id,
        actualRevision: row.revision,
      });
    }
  }
}
