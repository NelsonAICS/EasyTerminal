import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'

import { DatabaseAdapterRegistry } from '../../electron/services/database-adapters/registry'
import { SqliteAdapter } from '../../electron/services/database-adapters/sqlite-adapter'
import { compileWorkflow } from '../../electron/services/workflow-v2/compiler'
import { executeCompiledWorkflow, createCoreWorkflowRegistries } from '../../electron/services/workflow-v2/runtime'
import { initializeWorkflowV2Tables } from '../../electron/services/workflow-v2/schema'
import { createShellService } from '../../electron/services/workflow-v2/nodes/shell'
import { CommandRegistry } from '../../electron/services/shell/command-registry'
import { ControlledShellRunner } from '../../electron/services/shell/controlled-shell-runner'
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

describe('workflow-v2 end-to-end paths', () => {
  it('passes query, retrieved context and citations through a RAG graph', async () => {
    let received = ''
    const workflow: WorkflowDefinitionDTO = {
      id: 'e2e-rag', name: 'RAG', schemaVersion: 1, revision: 1,
      nodes: [
        { id: 'input', type: 'input.text', version: 1, position: { x: 0, y: 0 }, config: {} },
        { id: 'retriever', type: 'retriever', version: 1, position: { x: 180, y: 0 }, config: {} },
        { id: 'llm', type: 'llm', version: 1, position: { x: 360, y: 0 }, config: { modelRef: { providerId: 'fake', modelId: 'fake-chat' } } },
        { id: 'output', type: 'output.text', version: 1, position: { x: 540, y: 0 }, config: {} },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'input', sourcePort: 'query', targetNodeId: 'retriever', targetPort: 'query' },
        { id: 'e2', sourceNodeId: 'input', sourcePort: 'query', targetNodeId: 'llm', targetPort: 'query' },
        { id: 'e3', sourceNodeId: 'retriever', sourcePort: 'contextText', targetNodeId: 'llm', targetPort: 'context' },
        { id: 'e4', sourceNodeId: 'retriever', sourcePort: 'citations', targetNodeId: 'llm', targetPort: 'citations' },
        { id: 'e5', sourceNodeId: 'llm', sourcePort: 'answer', targetNodeId: 'output', targetPort: 'value' },
      ],
      settings: { maxConcurrency: 4, defaultNodeTimeoutMs: 30_000 },
    }
    const registries = createCoreWorkflowRegistries({
      retriever: { retrieve: async () => ({ chunks: [{ id: 'c1', content: '巴黎是法国首都', metadata: {} }], contextText: '巴黎是法国首都', citations: [{ chunkId: 'c1', filename: 'facts.md', score: 0.99 }] }) },
      llm: {
        getDefaultModelRef: () => ({ providerId: 'fake', modelId: 'fake-chat' }),
        chat: async (_model, messages) => {
          received = String(messages[0]?.content ?? '')
          return { content: '巴黎', usage: { totalTokens: 3 } }
        },
      },
    })
    const result = await executeCompiledWorkflow(compileWorkflow(workflow, registries), { query: '法国首都是什么？' }, { runId: 'e2e-rag-run' })
    expect(received).toContain('巴黎是法国首都')
    expect(received).toContain('法国首都是什么')
    expect(result.outputs.output.value).toBe('巴黎')
    expect(result.outputs.llm.citations).toEqual([{ chunkId: 'c1', filename: 'facts.md', score: 0.99 }])
  })

  it('executes a confirmed SQLite write path with a structured result', async () => {
    const database = createDatabase()
    initializeWorkflowV2Tables(database)
    const adapters = new DatabaseAdapterRegistry()
    adapters.register('default', new SqliteAdapter(database))
    const workflow: WorkflowDefinitionDTO = {
      id: 'e2e-sql', name: 'SQL', schemaVersion: 1, revision: 1,
      nodes: [{ id: 'input', type: 'input.text', version: 1, position: { x: 0, y: 0 }, config: {} }, { id: 'sql', type: 'sql', version: 1, position: { x: 200, y: 0 }, config: { databaseId: 'default', requireConfirmation: false } }],
      edges: [{ id: 'e1', sourceNodeId: 'input', sourcePort: 'query', targetNodeId: 'sql', targetPort: 'sql' }],
      settings: { maxConcurrency: 4, defaultNodeTimeoutMs: 30_000 },
    }
    const result = await executeCompiledWorkflow(compileWorkflow(workflow, createCoreWorkflowRegistries({ sql: { execute: (id, sql, params, signal) => adapters.get(id).execute(sql, params, signal) } })), { query: 'CREATE TABLE e2e_items (id INTEGER PRIMARY KEY)' }, { runId: 'e2e-sql-run' })
    expect(result.outputs.sql.result.affectedRows).toBe(0)
    expect(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'e2e_items'").get()).toBeTruthy()
  })

  it('runs a shell command through the typed JSON input and controlled runner', async () => {
    const commands = new CommandRegistry()
    commands.register({ id: 'echo', name: 'Echo', executable: '/bin/echo', arguments: [{ name: 'value', type: 'string', required: true }], allowedCwdRoots: [process.cwd()], allowedEnv: [], status: 'published' })
    const workflow: WorkflowDefinitionDTO = {
      id: 'e2e-shell', name: 'Shell', schemaVersion: 1, revision: 1,
      nodes: [
        { id: 'input', type: 'input.json', version: 1, position: { x: 0, y: 0 }, config: {} },
        { id: 'shell', type: 'shell', version: 1, position: { x: 200, y: 0 }, config: { commandId: 'echo' } },
        { id: 'output', type: 'output.text', version: 1, position: { x: 400, y: 0 }, config: {} },
      ],
      edges: [{ id: 'e1', sourceNodeId: 'input', sourcePort: 'value', targetNodeId: 'shell', targetPort: 'args' }, { id: 'e2', sourceNodeId: 'shell', sourcePort: 'stdout', targetNodeId: 'output', targetPort: 'value' }],
      settings: { maxConcurrency: 4, defaultNodeTimeoutMs: 30_000 },
    }
    const result = await executeCompiledWorkflow(compileWorkflow(workflow, createCoreWorkflowRegistries({ shell: createShellService(new ControlledShellRunner(commands)) })), { value: ['workflow-v2'] }, { runId: 'e2e-shell-run' })
    expect(String(result.outputs.output.value)).toContain('workflow-v2')
  })
})
