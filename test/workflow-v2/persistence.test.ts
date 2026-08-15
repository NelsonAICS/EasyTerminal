import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'

import { initializeWorkflowV2Tables } from '../../electron/services/workflow-v2/schema'
import { WorkflowCheckpointSaver } from '../../electron/services/workflow-v2/checkpoint-saver'
import { WorkflowRepository } from '../../electron/services/workflow-v2/repository'
import { WorkflowRunRepository } from '../../electron/services/workflow-v2/run-repository'
import { compileWorkflow } from '../../electron/services/workflow-v2/compiler'
import { createCoreWorkflowRegistries } from '../../electron/services/workflow-v2/runtime'
import type { SqliteDatabase } from '../../electron/services/workflow-v2/sqlite'
import { emptyCheckpoint } from '@langchain/langgraph'
import { WorkflowDomainError } from '../../src/features/workflow-v2/domain/errors'
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
      }
    },
  }
}

function makeWorkflow(revision = 1): WorkflowDefinitionDTO {
  return {
    id: 'workflow-persisted',
    name: 'Persisted workflow',
    schemaVersion: 1,
    revision,
    nodes: [],
    edges: [],
    settings: { maxConcurrency: 4, defaultNodeTimeoutMs: 30_000 },
  }
}

function makeArithmeticWorkflow(revision = 1): WorkflowDefinitionDTO {
  return {
    id: 'workflow-interruptible',
    name: 'Interruptible workflow',
    schemaVersion: 1,
    revision,
    nodes: [
      { id: 'input', type: 'input', version: 1, position: { x: 0, y: 0 }, config: {} },
      { id: 'transform', type: 'json-transform', version: 1, position: { x: 180, y: 0 }, config: { operation: 'multiply', factor: 2 } },
      { id: 'condition', type: 'condition', version: 1, position: { x: 360, y: 0 }, config: { operator: 'greaterThan', threshold: 5 } },
      { id: 'output', type: 'output', version: 1, position: { x: 540, y: 0 }, config: {} },
    ],
    edges: [
      { id: 'edge-1', sourceNodeId: 'input', sourcePort: 'value', targetNodeId: 'transform', targetPort: 'value' },
      { id: 'edge-2', sourceNodeId: 'transform', sourcePort: 'value', targetNodeId: 'condition', targetPort: 'value' },
      { id: 'edge-3', sourceNodeId: 'condition', sourcePort: 'true', targetNodeId: 'output', targetPort: 'value' },
      { id: 'edge-4', sourceNodeId: 'condition', sourcePort: 'false', targetNodeId: 'output', targetPort: 'value' },
    ],
    settings: { maxConcurrency: 4, defaultNodeTimeoutMs: 30_000 },
  }
}

describe('workflow-v2 persistence', () => {
  it('runs the V2 migration repeatedly without changing legacy tables', () => {
    const database = createDatabase()
    database.exec('CREATE TABLE workflows (id TEXT PRIMARY KEY, name TEXT NOT NULL)')
    initializeWorkflowV2Tables(database)
    initializeWorkflowV2Tables(database)

    const tables = database.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name LIKE '%workflow%v2%'
      ORDER BY name
    `).all<{ name: string }>().map((row) => row.name)
    expect(tables).toEqual(expect.arrayContaining([
      'workflows_v2',
      'workflow_v2_revisions',
      'workflow_v2_runs',
      'workflow_v2_node_runs',
      'workflow_v2_checkpoints',
      'workflow_v2_checkpoint_writes',
    ]))
    expect(database.prepare("SELECT name FROM sqlite_master WHERE name = 'workflows'").get()).toBeTruthy()
  })

  it('stores immutable revisions and binds runs to the selected revision', () => {
    const database = createDatabase()
    initializeWorkflowV2Tables(database)
    const workflows = new WorkflowRepository(database)
    const runs = new WorkflowRunRepository(database, workflows)

    const first = workflows.createWorkflow(makeWorkflow(), { createdBy: 'test' })
    expect(first.revision).toBe(1)
    const changed = makeWorkflow(2)
    changed.name = 'Changed name'
    workflows.createRevision(changed, { createdBy: 'test' })

    const loadedFirst = workflows.requireRevision('workflow-persisted', 1)
    loadedFirst.definition.name = 'local mutation'
    expect(workflows.requireRevision('workflow-persisted', 1).definition.name).toBe('Persisted workflow')
    expect(workflows.getRevision('workflow-persisted')?.revision).toBe(2)
    expect(() => workflows.createRevision(changed, { createdBy: 'test' })).toThrow(WorkflowDomainError)

    const run = runs.createRun({ id: 'run-1', workflowId: 'workflow-persisted', revision: 1, input: { value: 3 } })
    expect(run.revision).toBe(1)
    runs.startRun(run.id)
    runs.recordNodeRun({
      runId: run.id,
      nodeId: 'input',
      sequence: 1,
      status: 'succeeded',
      input: { value: 3 },
      output: { value: 3 },
      error: null,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    })
    const completed = runs.finishRun(run.id, 'succeeded', { output: { value: 3 } })
    expect(completed.status).toBe('succeeded')
    expect(runs.listRuns('workflow-persisted')).toHaveLength(1)
    expect(runs.listNodeRuns(run.id)).toHaveLength(1)
    expect(() => runs.requireRunForRevision(run.id, 'workflow-persisted', 2)).toThrow(/revision/i)
  })

  it('persists checkpoints and rejects a saver bound to another revision', async () => {
    const database = createDatabase()
    initializeWorkflowV2Tables(database)
    const workflows = new WorkflowRepository(database)
    workflows.createWorkflow(makeWorkflow())
    workflows.createRevision(makeWorkflow(2))

    const saver = new WorkflowCheckpointSaver(database, { workflowId: 'workflow-persisted', revision: 1 })
    const checkpoint = { ...emptyCheckpoint(), id: 'checkpoint-1', ts: new Date().toISOString() }
    const metadata = { source: 'input' as const, step: -1, parents: {} }
    const config = await saver.put({ configurable: { thread_id: 'run-1' } }, checkpoint, metadata)
    await saver.putWrites(config, [['value', { value: 3 }]], 'task-1')

    const tuple = await saver.getTuple(config)
    expect(tuple?.checkpoint.id).toBe('checkpoint-1')
    expect(tuple?.pendingWrites?.[0]?.[1]).toBe('value')
    expect(tuple?.pendingWrites?.[0]?.[2]).toEqual({ value: 3 })

    const otherRevisionSaver = new WorkflowCheckpointSaver(database, { workflowId: 'workflow-persisted', revision: 2 })
    await expect(otherRevisionSaver.getTuple(config)).rejects.toThrow(/revision/i)
  })

  it('can resume after an interrupt without switching to the latest revision', async () => {
    const database = createDatabase()
    initializeWorkflowV2Tables(database)
    const workflows = new WorkflowRepository(database)
    const revisionOne = makeArithmeticWorkflow()
    workflows.createWorkflow(revisionOne)
    workflows.createRevision(makeArithmeticWorkflow(2))
    const saver = new WorkflowCheckpointSaver(database, { workflowId: revisionOne.id, revision: 1 })
    const pausedGraph = compileWorkflow(revisionOne, createCoreWorkflowRegistries(), {
      checkpointer: saver,
      interruptAfter: ['transform'],
    })
    const config = { configurable: { thread_id: 'run-resume', runId: 'run-resume' } }
    const paused = await pausedGraph.graph.invoke({ runInput: { value: 3 }, outputs: {}, events: [] }, config)
    expect(paused.outputs.transform.value).toBe(6)
    expect(await saver.getTuple(config)).toBeTruthy()

    const resumedGraph = compileWorkflow(revisionOne, createCoreWorkflowRegistries(), { checkpointer: saver })
    const resumed = await resumedGraph.graph.invoke(null, config)
    expect(resumed.outputs.output.value).toBe(6)
    expect(resumed.outputs.condition.branch).toBe('true')
  })
})
