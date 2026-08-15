export type SqlParameter = string | number | bigint | boolean | null | Uint8Array

export interface SqlQueryResult {
  columns: string[]
  rows: Array<Record<string, unknown>>
  rowCount: number
  affectedRows: number
  lastInsertId?: number | bigint
}

export interface DatabaseAdapter {
  readonly kind: string
  execute(sql: string, params?: SqlParameter[], signal?: AbortSignal): Promise<SqlQueryResult>
  begin?(signal?: AbortSignal): Promise<void>
  commit?(signal?: AbortSignal): Promise<void>
  rollback?(signal?: AbortSignal): Promise<void>
}

export type SqlStatementKind = 'read' | 'write' | 'ddl' | 'transaction' | 'unknown'

export interface SqlAnalysis {
  kind: SqlStatementKind
  verb: string
  requiresConfirmation: boolean
  dangerous: boolean
  reason: string
}
