import type { SqliteDatabase } from './sqlite';

/**
 * Workflow V2 schema. Every statement is idempotent so app startup can run
 * this migration repeatedly without touching legacy workflow data.
 */
export function initializeWorkflowV2Tables(database: SqliteDatabase): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS node_definitions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      latest_version INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS node_definition_versions (
      definition_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      definition_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (definition_id, version),
      FOREIGN KEY (definition_id) REFERENCES node_definitions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workflows_v2 (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      latest_revision INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workflow_v2_revisions (
      workflow_id TEXT NOT NULL,
      revision INTEGER NOT NULL,
      definition_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (workflow_id, revision),
      FOREIGN KEY (workflow_id) REFERENCES workflows_v2(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workflow_v2_runs (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      revision INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      input_json TEXT NOT NULL DEFAULT '{}',
      output_json TEXT NOT NULL DEFAULT '{}',
      error_json TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (workflow_id, revision)
        REFERENCES workflow_v2_revisions(workflow_id, revision)
    );
    CREATE INDEX IF NOT EXISTS idx_workflow_v2_runs_workflow
      ON workflow_v2_runs(workflow_id, revision, created_at);

    CREATE TABLE IF NOT EXISTS workflow_v2_node_runs (
      run_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      status TEXT NOT NULL,
      input_json TEXT NOT NULL DEFAULT '{}',
      output_json TEXT NOT NULL DEFAULT '{}',
      error_json TEXT,
      started_at TEXT,
      completed_at TEXT,
      PRIMARY KEY (run_id, node_id, sequence),
      FOREIGN KEY (run_id) REFERENCES workflow_v2_runs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workflow_v2_confirmations (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT,
      FOREIGN KEY (run_id) REFERENCES workflow_v2_runs(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_workflow_v2_confirmations_run
      ON workflow_v2_confirmations(run_id, status);

    CREATE TABLE IF NOT EXISTS workflow_v2_checkpoints (
      thread_id TEXT NOT NULL,
      checkpoint_ns TEXT NOT NULL DEFAULT '',
      checkpoint_id TEXT NOT NULL,
      parent_checkpoint_id TEXT,
      workflow_id TEXT NOT NULL,
      revision INTEGER NOT NULL,
      checkpoint_type TEXT NOT NULL,
      checkpoint_blob BLOB NOT NULL,
      metadata_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id),
      FOREIGN KEY (workflow_id, revision)
        REFERENCES workflow_v2_revisions(workflow_id, revision)
    );
    CREATE INDEX IF NOT EXISTS idx_workflow_v2_checkpoints_thread
      ON workflow_v2_checkpoints(thread_id, checkpoint_ns, checkpoint_id);

    CREATE TABLE IF NOT EXISTS workflow_v2_checkpoint_writes (
      thread_id TEXT NOT NULL,
      checkpoint_ns TEXT NOT NULL DEFAULT '',
      checkpoint_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      write_index INTEGER NOT NULL,
      channel TEXT NOT NULL,
      value_type TEXT NOT NULL,
      value_blob BLOB NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, write_index),
      FOREIGN KEY (thread_id, checkpoint_ns, checkpoint_id)
        REFERENCES workflow_v2_checkpoints(thread_id, checkpoint_ns, checkpoint_id)
        ON DELETE CASCADE
    );
  `)
}
