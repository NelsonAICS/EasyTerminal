import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'

import { DatabaseAdapterRegistry } from '../../electron/services/database-adapters/registry'
import { SqliteAdapter } from '../../electron/services/database-adapters/sqlite-adapter'
import { initializeWorkflowV2Tables } from '../../electron/services/workflow-v2/schema'
import { WorkflowRepository } from '../../electron/services/workflow-v2/repository'
import { WorkflowRunRepository } from '../../electron/services/workflow-v2/run-repository'
import { WorkflowRunManager } from '../../electron/services/workflow-v2/run-manager'
import { createCoreWorkflowRegistries } from '../../electron/services/workflow-v2/runtime'
import type { SqliteDatabase } from '../../electron/services/workflow-v2/sqlite'
import type { WorkflowDefinitionDTO } from '../../src/features/workflow-v2/domain/types'

function createDatabase(): SqliteDatabase {
  const raw = new DatabaseSync(':memory:')
  raw.exec('PRAGMA foreign_keys = ON')
  return {
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
  }
}

function makeSqlWorkflow(): WorkflowDefinitionDTO {
  return {
    id: 'workflow-run-manager',
    name: 'SQL confirmation workflow',
    schemaVersion: 1,
    revision: 1,
    nodes: [
      { id: 'input', type: 'input.text', version: 1, position: { x: 0, y: 0 }, config: {} },
      { id: 'sql', type: 'sql', version: 1, position: { x: 240, y: 0 }, config: { databaseId: 'default' } },
    ],
    edges: [{ id: 'edge-input-sql', sourceNodeId: 'input', sourcePort: 'query', targetNodeId: 'sql', targetPort: 'sql' }],
    settings: { maxConcurrency: 4, defaultNodeTimeoutMs: 30_000 },
  }
}

async function waitForStatus(manager: WorkflowRunManager, runId: string, expected: string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (manager.getRun(runId).status === expected) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error(`run ${runId} did not reach ${expected}; current=${manager.getRun(runId).status}`)
}

describe('workflow-v2 run manager', () => {
  it('pauses for SQL confirmation and resumes the same immutable revision', async () => {
    const database = createDatabase()
    initializeWorkflowV2Tables(database)
    const workflows = new WorkflowRepository(database)
    const runs = new WorkflowRunRepository(database, workflows)
    const adapters = new DatabaseAdapterRegistry()
    adapters.register('default', new SqliteAdapter(database))
    const registries = createCoreWorkflowRegistries({
      sql: {
        execute: (databaseId, sql, params, signal) => adapters.get(databaseId).execute(sql, params, signal),
      },
    })
    const workflow = makeSqlWorkflow()
    workflows.createWorkflow(workflow)
    const manager = new WorkflowRunManager(database, workflows, runs, registries)

    const started = await manager.start({
      workflowId: workflow.id,
      input: { query: 'CREATE TABLE approved_items (id INTEGER PRIMARY KEY, value TEXT)' },
    })
    await waitForStatus(manager, started.runId, 'waiting_confirmation')
    const pending = manager.getPendingConfirmation(started.runId)
    expect(pending?.nodeId).toBe('sql')
    expect(pending?.payload.sql).toContain('approved_items')

    const resumed = await manager.resumeConfirmation(pending!.id, true)
    expect(resumed.revision).toBe(1)
    await waitForStatus(manager, started.runId, 'succeeded')
    expect(manager.getRun(started.runId).revision).toBe(1)
    expect(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'approved_items'").get()).toBeTruthy()
  })

  it('records a user rejection without executing the SQL statement', async () => {
    const database = createDatabase()
    initializeWorkflowV2Tables(database)
    const workflows = new WorkflowRepository(database)
    const runs = new WorkflowRunRepository(database, workflows)
    const adapters = new DatabaseAdapterRegistry()
    adapters.register('default', new SqliteAdapter(database))
    const manager = new WorkflowRunManager(
      database,
      workflows,
      runs,
      createCoreWorkflowRegistries({ sql: { execute: (databaseId, sql, params, signal) => adapters.get(databaseId).execute(sql, params, signal) } }),
    )
    const workflow = makeSqlWorkflow()
    workflows.createWorkflow(workflow)
    const started = await manager.start({
      workflowId: workflow.id,
      input: { query: 'CREATE TABLE rejected_items (id INTEGER PRIMARY KEY)' },
    })
    await waitForStatus(manager, started.runId, 'waiting_confirmation')
    const pending = manager.getPendingConfirmation(started.runId)
    const rejected = await manager.resumeConfirmation(pending!.id, false)
    expect(rejected.status).toBe('cancelled')
    expect(rejected.error?.code).toBe('CANCELLED_BY_USER')
    expect(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'rejected_items'").get()).toBeUndefined()
  })
})
