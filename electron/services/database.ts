// Database — SQLite-based persistent storage for Agent features
// Tables: prompts, skills, knowledge_docs, knowledge_chunks, workflows,
//         memory_records, context_snapshots, session_events, user_preferences,
//         browser_sessions, browser_history

import Database from 'better-sqlite3';
import { join } from 'node:path';
import { app } from 'electron';
import { initializeWorkflowV2Tables } from './workflow-v2/schema';
import type { SqliteDatabase } from './workflow-v2/sqlite';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;

  const userDataPath = app.getPath('userData');
  const dbPath = join(userDataPath, 'easyterminal.db');

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initializeTables(db);
  return db;
}

function initializeTables(db: Database.Database) {
  db.exec(`
    -- Prompts
    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      tags TEXT DEFAULT '[]',
      variables TEXT DEFAULT '[]',
      is_template INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Skills
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      manifest_path TEXT DEFAULT '',
      icon TEXT DEFAULT '',
      category TEXT DEFAULT 'general',
      tags TEXT DEFAULT '[]',
      input_schema TEXT DEFAULT '{}',
      output_schema TEXT DEFAULT '{}',
      embedding BLOB,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Knowledge Documents
    CREATE TABLE IF NOT EXISTS knowledge_docs (
      id TEXT PRIMARY KEY,
      collection TEXT DEFAULT 'default',
      filename TEXT NOT NULL,
      file_type TEXT DEFAULT 'text',
      content TEXT DEFAULT '',
      chunk_count INTEGER DEFAULT 0,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Knowledge Chunks (for RAG retrieval)
    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id TEXT PRIMARY KEY,
      doc_id TEXT NOT NULL,
      content TEXT NOT NULL,
      chunk_index INTEGER DEFAULT 0,
      embedding BLOB,
      metadata TEXT DEFAULT '{}',
      FOREIGN KEY (doc_id) REFERENCES knowledge_docs(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON knowledge_chunks(doc_id);

    -- Embedding index identity and resumable build state. A collection can
    -- only be queried when its provider/model/dimensions still match.
    CREATE TABLE IF NOT EXISTS knowledge_index_states (
      collection TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      dimensions INTEGER,
      index_version INTEGER NOT NULL DEFAULT 1,
      content_hash TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'parsing',
      total_chunks INTEGER NOT NULL DEFAULT 0,
      embedded_chunks INTEGER NOT NULL DEFAULT 0,
      failed_chunks INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Workflows
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT DEFAULT 'general',
      tags TEXT DEFAULT '[]',
      nodes TEXT DEFAULT '[]',
      edges TEXT DEFAULT '[]',
      variables TEXT DEFAULT '{}',
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Workflow execution history
    CREATE TABLE IF NOT EXISTS workflow_runs (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      result TEXT DEFAULT '{}',
      error TEXT DEFAULT '',
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
    );

    -- Structured memory records
    CREATE TABLE IF NOT EXISTS memory_records (
      id TEXT PRIMARY KEY,
      scope TEXT DEFAULT 'session',
      kind TEXT DEFAULT 'summary',
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      details TEXT DEFAULT '',
      salience REAL DEFAULT 0.5,
      status TEXT DEFAULT 'active',
      source_type TEXT DEFAULT 'manual',
      source_ref TEXT DEFAULT '',
      evidence_refs TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_memory_records_scope_kind ON memory_records(scope, kind);
    CREATE INDEX IF NOT EXISTS idx_memory_records_source_ref ON memory_records(source_ref);

    -- Links between memory records
    CREATE TABLE IF NOT EXISTS memory_links (
      id TEXT PRIMARY KEY,
      from_id TEXT NOT NULL,
      to_id TEXT NOT NULL,
      relation TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (from_id) REFERENCES memory_records(id) ON DELETE CASCADE,
      FOREIGN KEY (to_id) REFERENCES memory_records(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_memory_links_from_id ON memory_links(from_id);
    CREATE INDEX IF NOT EXISTS idx_memory_links_to_id ON memory_links(to_id);

    -- Context snapshots
    CREATE TABLE IF NOT EXISTS context_snapshots (
      id TEXT PRIMARY KEY,
      session_id TEXT DEFAULT '',
      task_id TEXT DEFAULT '',
      version INTEGER DEFAULT 1,
      summary_block TEXT NOT NULL,
      token_estimate INTEGER DEFAULT 0,
      drift_score REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_context_snapshots_session_id ON context_snapshots(session_id);
    CREATE INDEX IF NOT EXISTS idx_context_snapshots_task_id ON context_snapshots(task_id);

    -- Session event log
    CREATE TABLE IF NOT EXISTS session_events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT DEFAULT '',
      token_estimate INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_session_events_session_id ON session_events(session_id);

    -- User preferences (learned from interactions)
    CREATE TABLE IF NOT EXISTS user_preferences (
      id TEXT PRIMARY KEY,
      scope TEXT DEFAULT 'all',
      dimension TEXT NOT NULL,
      value TEXT NOT NULL,
      weight REAL DEFAULT 0.1,
      sample_count INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_user_prefs_scope_dim ON user_preferences(scope, dimension);

    -- Browser sessions
    CREATE TABLE IF NOT EXISTS browser_sessions (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      title TEXT DEFAULT '',
      cookies TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Browser history
    CREATE TABLE IF NOT EXISTS browser_history (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      url TEXT NOT NULL,
      title TEXT DEFAULT '',
      content TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_browser_history_session ON browser_history(session_id);

    -- Browser plugins (userscripts / extensions)
    CREATE TABLE IF NOT EXISTS browser_plugins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      match_pattern TEXT DEFAULT '*://*/*',
      script TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_browser_plugins_enabled ON browser_plugins(enabled);
  `);

  ensureColumn(db, 'workflows', 'category', "TEXT DEFAULT 'general'");
  ensureColumn(db, 'workflows', 'tags', "TEXT DEFAULT '[]'");

  // Workflow V2 is intentionally stored in separate tables. The legacy
  // workflows/workflow_runs tables remain available to existing features and
  // are not migrated implicitly.
  initializeWorkflowV2Tables(db as unknown as SqliteDatabase);
}

function ensureColumn(db: Database.Database, table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some(item => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

// ── Generic CRUD helpers ──────────────────────────────────────────

export function dbAll<T = Record<string, unknown>>(table: string, where?: string, params?: unknown[]): T[] {
  const d = getDatabase();
  const sql = where ? `SELECT * FROM ${table} WHERE ${where}` : `SELECT * FROM ${table}`;
  return d.prepare(sql).all(...(params || [])) as T[];
}

export function dbGet<T = Record<string, unknown>>(table: string, id: string): T | undefined {
  const d = getDatabase();
  return d.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as T | undefined;
}

export function dbInsert(table: string, record: Record<string, unknown>) {
  const d = getDatabase();
  const keys = Object.keys(record);
  const values = Object.values(record);
  const placeholders = keys.map(() => '?').join(', ');
  d.prepare(`INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`).run(...values);
}

export function dbUpdate(table: string, id: string, fields: Record<string, unknown>) {
  const d = getDatabase();
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(fields), id];
  d.prepare(`UPDATE ${table} SET ${sets}, updated_at = datetime('now') WHERE id = ?`).run(...values);
}

export function dbDelete(table: string, id: string) {
  const d = getDatabase();
  d.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
}

export function dbQuery<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] {
  const d = getDatabase();
  return d.prepare(sql).all(...(params || [])) as T[];
}

export function dbRun(sql: string, params?: unknown[]) {
  const d = getDatabase();
  return d.prepare(sql).run(...(params || []));
}

// ── Generate unique ID ────────────────────────────────────────────

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}
