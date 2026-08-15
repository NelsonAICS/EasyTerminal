/**
 * The small part of better-sqlite3 used by Workflow V2.
 *
 * Keeping this interface local makes the repositories easy to test with
 * Node's built-in SQLite implementation and keeps the domain independent of
 * one particular SQLite driver.
 */
export interface SqliteStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid?: number | bigint }
  get<T = Record<string, unknown>>(...params: unknown[]): T | undefined
  all<T = Record<string, unknown>>(...params: unknown[]): T[]
  columns?(): Array<{ name: string }>
}

export interface SqliteDatabase {
  exec(sql: string): void
  prepare(sql: string): SqliteStatement
  transaction?<T>(callback: () => T): () => T
}

export function runInTransaction<T>(database: SqliteDatabase, callback: () => T): T {
  if (database.transaction) return database.transaction(callback)()

  database.exec('BEGIN IMMEDIATE')
  try {
    const result = callback()
    database.exec('COMMIT')
    return result
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}

export function toStoredJson(value: unknown): string {
  return JSON.stringify(value ?? null)
}

export function fromStoredJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function asUint8Array(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
  }
  if (typeof value === 'string') return new TextEncoder().encode(value)
  return new Uint8Array()
}
