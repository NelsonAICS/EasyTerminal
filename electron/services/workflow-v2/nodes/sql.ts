import type { NodeExecutor, PublishedNodeDefinition } from '../node-definition'
import { DatabaseAdapterRegistry } from '../../database-adapters/registry'
import { analyzeSql } from '../../database-adapters/sqlite-adapter'
import type { SqlParameter, SqlQueryResult } from '../../database-adapters/types'

export interface SqlNodeService {
  execute(databaseId: string, sql: string, params: SqlParameter[], signal: AbortSignal): Promise<SqlQueryResult>
}

export class SqlConfirmationRequired extends Error {
  readonly code = 'WORKFLOW_CONFIRMATION_REQUIRED'
  readonly details: Record<string, unknown>

  constructor(details: Record<string, unknown>) {
    super('SQL 写操作需要用户确认后才能执行')
    this.name = 'SqlConfirmationRequired'
    this.details = details
  }
}

export const sqlDefinition: PublishedNodeDefinition = {
  type: 'sql',
  version: 1,
  status: 'published',
  executorKind: 'sql',
  inputPorts: [
    { id: 'sql', type: 'text', required: true },
    { id: 'params', type: 'json' },
    { id: 'confirmed', type: 'boolean' },
  ],
  outputPorts: [
    { id: 'result', type: 'table' },
    { id: 'metadata', type: 'json' },
  ],
  configSchema: { databaseId: 'string', requireConfirmation: 'boolean?' },
  risk: 'write',
}

function paramsFromInput(value: unknown): SqlParameter[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new Error('SQL params must be an array; bind values separately from the SQL template')
  return value.map((item) => {
    if (item === null || typeof item === 'string' || typeof item === 'number' || typeof item === 'bigint' || typeof item === 'boolean' || item instanceof Uint8Array) return item
    throw new Error('SQL params contain an unsupported value')
  })
}

export function createSqlExecutor(service?: SqlNodeService): NodeExecutor {
  return async ({ inputs, config, signal, node }) => {
    if (!service) throw new Error('SQL node service is not configured in the workflow runtime')
    if (typeof inputs.sql !== 'string' || !inputs.sql.trim()) throw new Error('SQL node requires a non-empty SQL input')
    const analysis = analyzeSql(inputs.sql)
    if ((config.requireConfirmation !== false) && analysis.requiresConfirmation && inputs.confirmed !== true && config.confirmed !== true) {
      throw new SqlConfirmationRequired({
        nodeId: node.id,
        sql: inputs.sql,
        statementKind: analysis.kind,
        verb: analysis.verb,
        dangerous: analysis.dangerous,
        reason: analysis.reason,
        paramsCount: Array.isArray(inputs.params) ? inputs.params.length : 0,
      })
    }
    const databaseId = typeof config.databaseId === 'string' && config.databaseId ? config.databaseId : 'default'
    const result = await service.execute(databaseId, inputs.sql, paramsFromInput(inputs.params), signal)
    return {
      result,
      metadata: { ...analysis, databaseId },
    }
  }
}

export function createSqlService(adapters: DatabaseAdapterRegistry): SqlNodeService {
  return {
    execute: (databaseId, sql, params, signal) => adapters.get(databaseId).execute(sql, params, signal),
  }
}

export const sqlExecutor: NodeExecutor = createSqlExecutor()
