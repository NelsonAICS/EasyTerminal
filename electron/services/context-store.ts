import { dbInsert, dbQuery, dbRun, dbUpdate, generateId } from './database';

export interface MemoryRecord {
  id: string;
  scope: 'global' | 'project' | 'task' | 'session';
  kind: 'goal' | 'constraint' | 'decision' | 'issue' | 'artifact' | 'style' | 'next_step' | 'summary';
  title: string;
  summary: string;
  details?: string;
  salience: number;
  status: 'active' | 'superseded' | 'archived';
  source_type: 'doc' | 'session' | 'tool' | 'workflow' | 'manual';
  source_ref: string;
  evidence_refs: string[];
  created_at: string;
  updated_at: string;
}

interface MemoryRecordRow extends Omit<MemoryRecord, 'evidence_refs'> {
  evidence_refs: string;
}

export interface MemoryLink {
  id: string;
  from_id: string;
  to_id: string;
  relation: 'supports' | 'derived_from' | 'supersedes' | 'conflicts_with' | 'references';
  created_at: string;
}

export interface ContextSnapshot {
  id: string;
  session_id: string;
  task_id: string;
  version: number;
  summary_block: string;
  token_estimate: number;
  drift_score: number;
  status: 'active' | 'candidate' | 'replaced';
  created_at: string;
  updated_at: string;
}

export interface SessionEvent {
  id: string;
  session_id: string;
  event_type: 'session_start' | 'session_end' | 'user_prompt' | 'tool_call' | 'tool_result' | 'assistant_reply' | 'manual_capture';
  payload: string;
  token_estimate: number;
  created_at: string;
  updated_at: string;
}

export interface MemoryRecordFilters {
  scope?: MemoryRecord['scope'];
  kind?: MemoryRecord['kind'];
  status?: MemoryRecord['status'];
  sourceRef?: string;
  query?: string;
  limit?: number;
}

export interface SnapshotFilters {
  sessionId?: string;
  taskId?: string;
  status?: ContextSnapshot['status'];
  limit?: number;
}

function rowToMemoryRecord(row: MemoryRecordRow): MemoryRecord {
  return {
    ...row,
    evidence_refs: JSON.parse(row.evidence_refs || '[]'),
  };
}

export function createRecord(input: Omit<MemoryRecord, 'id' | 'created_at' | 'updated_at'> & { id?: string }): MemoryRecord {
  const id = input.id || generateId();
  dbInsert('memory_records', {
    id,
    scope: input.scope,
    kind: input.kind,
    title: input.title,
    summary: input.summary,
    details: input.details || '',
    salience: input.salience,
    status: input.status,
    source_type: input.source_type,
    source_ref: input.source_ref,
    evidence_refs: JSON.stringify(input.evidence_refs || []),
  });

  const row = dbQuery<MemoryRecordRow>('SELECT * FROM memory_records WHERE id = ?', [id])[0];
  return rowToMemoryRecord(row);
}

export function updateRecord(id: string, fields: Partial<Omit<MemoryRecord, 'id' | 'created_at' | 'updated_at'>>) {
  const nextFields: Record<string, unknown> = { ...fields };
  if (fields.evidence_refs) {
    nextFields.evidence_refs = JSON.stringify(fields.evidence_refs);
  }
  dbUpdate('memory_records', id, nextFields);
}

export function queryRecords(filters: MemoryRecordFilters = {}): MemoryRecord[] {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.scope) {
    clauses.push('scope = ?');
    params.push(filters.scope);
  }
  if (filters.kind) {
    clauses.push('kind = ?');
    params.push(filters.kind);
  }
  if (filters.status) {
    clauses.push('status = ?');
    params.push(filters.status);
  }
  if (filters.sourceRef) {
    clauses.push('source_ref = ?');
    params.push(filters.sourceRef);
  }
  if (filters.query?.trim()) {
    clauses.push('(title LIKE ? OR summary LIKE ? OR details LIKE ?)');
    const query = `%${filters.query.trim()}%`;
    params.push(query, query, query);
  }

  const sql = [
    'SELECT * FROM memory_records',
    clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    'ORDER BY updated_at DESC, created_at DESC',
    `LIMIT ${Math.max(1, Math.min(filters.limit || 50, 500))}`,
  ].filter(Boolean).join(' ');

  return dbQuery<MemoryRecordRow>(sql, params).map(rowToMemoryRecord);
}

export function createMemoryLink(input: Omit<MemoryLink, 'id' | 'created_at'> & { id?: string }): MemoryLink {
  const id = input.id || generateId();
  dbInsert('memory_links', {
    id,
    from_id: input.from_id,
    to_id: input.to_id,
    relation: input.relation,
  });
  return dbQuery<MemoryLink>('SELECT * FROM memory_links WHERE id = ?', [id])[0];
}

export function createSnapshot(input: Omit<ContextSnapshot, 'id' | 'created_at' | 'updated_at'> & { id?: string }): ContextSnapshot {
  const id = input.id || generateId();
  dbInsert('context_snapshots', {
    id,
    session_id: input.session_id,
    task_id: input.task_id,
    version: input.version,
    summary_block: input.summary_block,
    token_estimate: input.token_estimate,
    drift_score: input.drift_score,
    status: input.status,
  });
  return dbQuery<ContextSnapshot>('SELECT * FROM context_snapshots WHERE id = ?', [id])[0];
}

export function activateSnapshot(id: string) {
  const snapshot = dbQuery<ContextSnapshot>('SELECT * FROM context_snapshots WHERE id = ?', [id])[0];
  if (!snapshot) throw new Error('Snapshot not found');

  const whereClauses: string[] = [];
  const params: unknown[] = [];
  if (snapshot.session_id) {
    whereClauses.push('session_id = ?');
    params.push(snapshot.session_id);
  }
  if (snapshot.task_id) {
    whereClauses.push('task_id = ?');
    params.push(snapshot.task_id);
  }
  if (whereClauses.length > 0) {
    dbRun(`UPDATE context_snapshots SET status = 'replaced', updated_at = datetime('now') WHERE ${whereClauses.join(' AND ')} AND id != ? AND status = 'active'`, [...params, id]);
  }
  dbUpdate('context_snapshots', id, { status: 'active' });
}

export function updateSnapshot(id: string, fields: Partial<Omit<ContextSnapshot, 'id' | 'created_at' | 'updated_at'>>) {
  dbUpdate('context_snapshots', id, fields as Record<string, unknown>);
}

export function listSnapshots(filters: SnapshotFilters = {}): ContextSnapshot[] {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.sessionId) {
    clauses.push('session_id = ?');
    params.push(filters.sessionId);
  }
  if (filters.taskId) {
    clauses.push('task_id = ?');
    params.push(filters.taskId);
  }
  if (filters.status) {
    clauses.push('status = ?');
    params.push(filters.status);
  }

  const sql = [
    'SELECT * FROM context_snapshots',
    clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    'ORDER BY updated_at DESC, created_at DESC',
    `LIMIT ${Math.max(1, Math.min(filters.limit || 30, 200))}`,
  ].filter(Boolean).join(' ');

  return dbQuery<ContextSnapshot>(sql, params);
}

export function appendSessionEvent(input: Omit<SessionEvent, 'id' | 'created_at' | 'updated_at'> & { id?: string }): SessionEvent {
  const id = input.id || generateId();
  dbInsert('session_events', {
    id,
    session_id: input.session_id,
    event_type: input.event_type,
    payload: input.payload,
    token_estimate: input.token_estimate,
  });
  return dbQuery<SessionEvent>('SELECT * FROM session_events WHERE id = ?', [id])[0];
}

export function listSessionEvents(sessionId: string, limit: number = 100): SessionEvent[] {
  const safeLimit = Math.max(1, Math.min(limit, 1000));
  return dbQuery<SessionEvent>(
    `SELECT * FROM session_events WHERE session_id = ? ORDER BY created_at DESC LIMIT ${safeLimit}`,
    [sessionId],
  );
}

export function listRecentSessionEvents(limit: number = 100): SessionEvent[] {
  const safeLimit = Math.max(1, Math.min(limit, 1000));
  return dbQuery<SessionEvent>(
    `SELECT * FROM session_events ORDER BY created_at DESC LIMIT ${safeLimit}`,
  );
}
