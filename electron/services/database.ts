// Database — SQLite-based persistent storage for Agent features
// Tables: prompts, skills, knowledge_docs, knowledge_chunks, workflows

import Database from 'better-sqlite3';
import { join } from 'node:path';
import { app } from 'electron';

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
  `);

  ensureColumn(db, 'workflows', 'category', "TEXT DEFAULT 'general'");
  ensureColumn(db, 'workflows', 'tags', "TEXT DEFAULT '[]'");
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
