import { ExecutorRegistry } from './executor-registry'
import type { NodeExecutor } from './node-definition'
import { NodeDefinitionRegistry } from './node-registry'
import { conditionDefinition, conditionExecutor } from './nodes/condition'
import { inputDefinition, inputExecutor, textInputDefinition, textInputExecutor, jsonInputDefinition, jsonInputExecutor } from './nodes/input'
import { jsonTransformDefinition, jsonTransformExecutor } from './nodes/json-transform'
import { outputDefinition, outputExecutor } from './nodes/output'
import { textOutputDefinition, textOutputExecutor } from './nodes/text-output'
import { llmDefinition, createLLMExecutor, type LLMNodeService } from './nodes/llm'
import { promptDefinition, promptExecutor } from './nodes/prompt'
import { retrieverDefinition, createRetrieverExecutor, type RetrieverNodeService } from './nodes/retriever'
import { sqlDefinition, createSqlExecutor, type SqlNodeService } from './nodes/sql'
import { shellDefinition, createShellExecutor, type ShellNodeService } from './nodes/shell'
import type { CompiledWorkflow } from './compiler'
import type { WorkflowRunEvent } from '../../../src/features/workflow-v2/domain/types'

export interface CoreWorkflowRegistries {
  nodes: NodeDefinitionRegistry
  executors: ExecutorRegistry
}

export interface WorkflowRuntimeServices {
  llm?: LLMNodeService
  retriever?: RetrieverNodeService
  sql?: SqlNodeService
  shell?: ShellNodeService
}

export function createCoreWorkflowRegistries(services: WorkflowRuntimeServices = {}): CoreWorkflowRegistries {
  const nodes = new NodeDefinitionRegistry()
  const executors = new ExecutorRegistry()
  const definitions = [
    inputDefinition,
    jsonTransformDefinition,
    conditionDefinition,
    outputDefinition,
    textInputDefinition,
    jsonInputDefinition,
    textOutputDefinition,
    promptDefinition,
    llmDefinition,
    retrieverDefinition,
    sqlDefinition,
    shellDefinition,
  ]
  const executorEntries: Array<[string, NodeExecutor]> = [
    ['input', inputExecutor],
    ['json-transform', jsonTransformExecutor],
    ['condition', conditionExecutor],
    ['output', outputExecutor],
    ['input.text', textInputExecutor],
    ['input.json', jsonInputExecutor],
    ['output.text', textOutputExecutor],
    ['prompt', promptExecutor],
    ['llm', createLLMExecutor(services.llm)],
    ['retriever', createRetrieverExecutor(services.retriever)],
    ['sql', createSqlExecutor(services.sql)],
    ['shell', createShellExecutor(services.shell)],
  ]
  definitions.forEach((definition) => nodes.register(definition))
  executorEntries.forEach(([kind, executor]) => executors.register(kind, executor))
  return { nodes, executors }
}

export interface WorkflowExecutionOptions {
  runId: string
  signal?: AbortSignal
  threadId?: string
  /** Continue from the checkpoint associated with this thread. */
  resume?: boolean
}

export interface WorkflowExecutionResult {
  outputs: Record<string, Record<string, unknown>>
  events: WorkflowRunEvent[]
}

export async function executeCompiledWorkflow(
  compiled: CompiledWorkflow,
  input: Record<string, unknown>,
  options: WorkflowExecutionOptions,
): Promise<WorkflowExecutionResult> {
  const state = await compiled.graph.invoke(
    options.resume ? null : { runInput: input, outputs: {}, events: [] },
    {
      configurable: {
        runId: options.runId,
        thread_id: options.threadId ?? options.runId,
        workflowId: compiled.definition.id,
        revision: compiled.definition.revision,
      },
      signal: options.signal,
    },
  )
  return {
    outputs: state.outputs,
    events: state.events,
  }
}
