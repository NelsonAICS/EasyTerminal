import type { SqliteDatabase } from '../workflow-v2/sqlite'
import type { DatabaseAdapter, SqlParameter, SqlQueryResult, SqlAnalysis } from './types'

function normalizedSql(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '').trim()
}

export function analyzeSql(sql: string): SqlAnalysis {
  const normalized = normalizedSql(sql)
  const verb = normalized.match(/^([a-z]+)/i)?.[1]?.toUpperCase() ?? ''
  const pragmaWrite = verb === 'PRAGMA' && /\bPRAGMA\s+[^=;]+=/i.test(normalized)
  const dangerous = /^(DROP|ALTER)\b/i.test(normalized)
    || /^(UPDATE|DELETE)\b/i.test(normalized) && !/\bWHERE\b/i.test(normalized)
    || /\bPRAGMA\s+[^=;]+=/i.test(normalized)
  const kind: SqlAnalysis['kind'] = pragmaWrite
    ? 'write'
    : verb === 'SELECT' || verb === 'PRAGMA' || verb === 'EXPLAIN' || verb === 'WITH'
    ? 'read'
    : verb === 'INSERT' || verb === 'UPDATE' || verb === 'DELETE' || verb === 'REPLACE'
      ? 'write'
      : verb === 'CREATE' || verb === 'ALTER' || verb === 'DROP' || verb === 'VACUUM'
        ? 'ddl'
        : verb === 'BEGIN' || verb === 'COMMIT' || verb === 'ROLLBACK' || verb === 'SAVEPOINT' || verb === 'RELEASE'
          ? 'transaction'
          : 'unknown'
  return {
    kind,
    verb,
    requiresConfirmation: kind !== 'read',
    dangerous,
    reason: dangerous ? '语句可能影响大量数据或数据库结构' : kind === 'read' ? '只读查询' : '语句会产生数据库副作用',
  }
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error('SQL execution was cancelled')
}

export class SqliteAdapter implements DatabaseAdapter {
  readonly kind = 'sqlite'

  constructor(private readonly database: SqliteDatabase) {}

  async execute(sql: string, params: SqlParameter[] = [], signal?: AbortSignal): Promise<SqlQueryResult> {
    assertNotAborted(signal)
    const statement = this.database.prepare(sql)
    const analysis = analyzeSql(sql)
    if (analysis.kind === 'read') {
      const rows = statement.all<Record<string, unknown>>(...params)
      const columns = statement.columns?.().map((column) => column.name) ?? Object.keys(rows[0] ?? {})
      assertNotAborted(signal)
      return { columns, rows, rowCount: rows.length, affectedRows: 0 }
    }
    const result = statement.run(...params)
    assertNotAborted(signal)
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      affectedRows: result.changes,
      lastInsertId: result.lastInsertRowid,
    }
  }

  async begin(signal?: AbortSignal): Promise<void> {
    await this.execute('BEGIN', [], signal)
  }

  async commit(signal?: AbortSignal): Promise<void> {
    await this.execute('COMMIT', [], signal)
  }

  async rollback(signal?: AbortSignal): Promise<void> {
    await this.execute('ROLLBACK', [], signal)
  }
}
