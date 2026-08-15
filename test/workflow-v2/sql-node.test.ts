import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'

import { DatabaseAdapterRegistry } from '../../electron/services/database-adapters/registry'
import { analyzeSql, SqliteAdapter } from '../../electron/services/database-adapters/sqlite-adapter'
import type { SqliteDatabase } from '../../electron/services/workflow-v2/sqlite'
import { createSqlExecutor, createSqlService, SqlConfirmationRequired } from '../../electron/services/workflow-v2/nodes/sql'

function createAdapter(): SqliteAdapter {
  const raw = new DatabaseSync(':memory:')
  return new SqliteAdapter({
    exec: (sql) => raw.exec(sql),
    prepare: (sql) => {
      const statement = raw.prepare(sql)
      return {
        run: (...params) => statement.run(...params) as { changes: number; lastInsertRowid?: number | bigint },
        get: <T = Record<string, unknown>>(...params: unknown[]) => statement.get(...params) as T | undefined,
        all: <T = Record<string, unknown>>(...params: unknown[]) => statement.all(...params) as T[],
        columns: () => statement.columns().map((column) => ({ name: column.name })),
      }
    },
  } as SqliteDatabase)
}

describe('workflow-v2 SQL adapter and node', () => {
  it('classifies read/write/DDL and flags dangerous statements', () => {
    expect(analyzeSql('SELECT * FROM users').kind).toBe('read')
    expect(analyzeSql('UPDATE users SET name = ? WHERE id = ?').requiresConfirmation).toBe(true)
    expect(analyzeSql('DELETE FROM users').dangerous).toBe(true)
    expect(analyzeSql('DROP TABLE users').kind).toBe('ddl')
  })

  it('supports parameterized SQLite DDL, writes, reads and transactions', async () => {
    const adapter = createAdapter()
    await adapter.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)')
    const inserted = await adapter.execute('INSERT INTO users (name) VALUES (?)', ['Alice'])
    expect(inserted.affectedRows).toBe(1)
    expect(inserted.lastInsertId).toBe(1)
    const selected = await adapter.execute('SELECT id, name FROM users WHERE name = ?', ['Alice'])
    expect(selected.columns).toEqual(['id', 'name'])
    expect(selected.rows).toEqual([{ id: 1, name: 'Alice' }])
    await adapter.begin?.()
    await adapter.execute('UPDATE users SET name = ? WHERE id = ?', ['Bob', 1])
    await adapter.rollback?.()
    expect((await adapter.execute('SELECT name FROM users WHERE id = ?', [1])).rows[0].name).toBe('Alice')
  })

  it('requires confirmation for writes and returns structured results for reads', async () => {
    const adapters = new DatabaseAdapterRegistry()
    adapters.register('default', createAdapter())
    const service = createSqlService(adapters)
    const executor = createSqlExecutor(service)
    const context = {
      node: { id: 'sql', type: 'sql', version: 1, position: { x: 0, y: 0 }, config: {} },
      definition: { type: 'sql', version: 1, status: 'published' as const, executorKind: 'sql', inputPorts: [], outputPorts: [], configSchema: {}, risk: 'write' as const },
      signal: new AbortController().signal,
      runId: 'run-sql',
      config: { databaseId: 'default' },
    }
    await executor({ ...context, inputs: { sql: 'CREATE TABLE items (id INTEGER PRIMARY KEY, value TEXT)', confirmed: true } }).then(() => undefined)
    await expect(executor({ ...context, inputs: { sql: 'INSERT INTO items (value) VALUES (?)', params: ['x'] } })).rejects.toBeInstanceOf(SqlConfirmationRequired)
    const result = await executor({ ...context, inputs: { sql: 'INSERT INTO items (value) VALUES (?)', params: ['x'], confirmed: true } })
    expect(result.result.affectedRows).toBe(1)
    const read = await executor({ ...context, inputs: { sql: 'SELECT * FROM items' } })
    expect(read.result.rows).toHaveLength(1)
  })
})
