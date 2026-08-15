import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import type { BaseCheckpointSaver } from '@langchain/langgraph'

import { arePortTypesCompatible } from '../../../src/features/workflow-v2/domain/ports'
import { workflowDefinitionSchema } from '../../../src/features/workflow-v2/domain/schemas'
import { WorkflowDomainError } from '../../../src/features/workflow-v2/domain/errors'
import type {
  WorkflowDefinitionDTO,
  WorkflowNodeDTO,
  WorkflowRunEvent,
} from '../../../src/features/workflow-v2/domain/types'
import type { ExecutorRegistry } from './executor-registry'
import type { NodeDefinitionRegistry } from './node-registry'
import type { PublishedNodeDefinition } from './node-definition'

export interface WorkflowRegistries {
  nodes: NodeDefinitionRegistry
  executors: ExecutorRegistry
}

interface WorkflowState {
  runInput: Record<string, unknown>
  outputs: Record<string, Record<string, unknown>>
  events: WorkflowRunEvent[]
}

const workflowState = Annotation.Root({
  runInput: Annotation<Record<string, unknown>>(),
  outputs: Annotation<Record<string, Record<string, unknown>>>({
    reducer: (left, right) => ({ ...left, ...right }),
    default: () => ({}),
  }),
  events: Annotation<WorkflowRunEvent[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
})

export interface CompiledWorkflow {
  definition: WorkflowDefinitionDTO
  graph: ReturnType<StateGraph<typeof workflowState.spec>['compile']>
}

export interface WorkflowCompileOptions {
  checkpointer?: BaseCheckpointSaver | false
  interruptBefore?: string[]
  interruptAfter?: string[]
}

function findPort(definition: PublishedNodeDefinition, direction: 'inputPorts' | 'outputPorts', portId: string) {
  return definition[direction].find((port) => port.id === portId)
}

function assertAcyclic(workflow: WorkflowDefinitionDTO): void {
  const adjacency = new Map<string, string[]>()
  for (const node of workflow.nodes) adjacency.set(node.id, [])
  for (const edge of workflow.edges) {
    adjacency.get(edge.sourceNodeId)?.push(edge.targetNodeId)
  }

  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (nodeId: string): void => {
    if (visiting.has(nodeId)) {
      throw new WorkflowDomainError('CYCLE_DETECTED', `Workflow contains a cycle at ${nodeId}`, { nodeId })
    }
    if (visited.has(nodeId)) return
    visiting.add(nodeId)
    for (const targetId of adjacency.get(nodeId) ?? []) visit(targetId)
    visiting.delete(nodeId)
    visited.add(nodeId)
  }

  for (const node of workflow.nodes) visit(node.id)
}

function validateWorkflow(workflow: WorkflowDefinitionDTO, registries: WorkflowRegistries): Map<string, PublishedNodeDefinition> {
  const parsed = workflowDefinitionSchema.safeParse(workflow)
  if (!parsed.success) {
    throw new WorkflowDomainError('INVALID_WORKFLOW', 'Workflow definition failed schema validation', {
      issues: parsed.error.issues,
    })
  }

  const definitions = new Map<string, PublishedNodeDefinition>()
  const nodeIds = new Set<string>()
  for (const node of workflow.nodes) {
    if (nodeIds.has(node.id)) {
      throw new WorkflowDomainError('DUPLICATE_NODE_ID', `Duplicate node id ${node.id}`, { nodeId: node.id })
    }
    nodeIds.add(node.id)
    const definition = registries.nodes.getPublished(node.type, node.version)
    if (!definition) {
      throw new WorkflowDomainError('NODE_NOT_PUBLISHED', `Node ${node.type}@${node.version} is not published`, {
        nodeId: node.id,
        type: node.type,
        version: node.version,
      })
    }
    registries.executors.get(definition.executorKind)
    definitions.set(node.id, definition)
  }

  const edgeIds = new Set<string>()
  const incoming = new Map<string, Set<string>>()
  for (const node of workflow.nodes) incoming.set(node.id, new Set())
  for (const edge of workflow.edges) {
    if (edgeIds.has(edge.id)) {
      throw new WorkflowDomainError('DUPLICATE_EDGE_ID', `Duplicate edge id ${edge.id}`, { edgeId: edge.id })
    }
    edgeIds.add(edge.id)
    if (edge.sourceNodeId === edge.targetNodeId) {
      throw new WorkflowDomainError('CYCLE_DETECTED', `Self edge ${edge.id} is not allowed`, { edgeId: edge.id })
    }
    const sourceDefinition = definitions.get(edge.sourceNodeId)
    const targetDefinition = definitions.get(edge.targetNodeId)
    if (!sourceDefinition || !targetDefinition) {
      throw new WorkflowDomainError('INVALID_EDGE', `Edge ${edge.id} references a missing node`, { edgeId: edge.id })
    }
    const sourcePort = findPort(sourceDefinition, 'outputPorts', edge.sourcePort)
    const targetPort = findPort(targetDefinition, 'inputPorts', edge.targetPort)
    if (!sourcePort || !targetPort) {
      throw new WorkflowDomainError('INVALID_PORT', `Edge ${edge.id} references a missing port`, { edgeId: edge.id })
    }
    if (!arePortTypesCompatible(sourcePort.type, targetPort.type)) {
      throw new WorkflowDomainError('PORT_TYPE_MISMATCH', `Edge ${edge.id} connects incompatible port types`, {
        edgeId: edge.id,
        sourceType: sourcePort.type,
        targetType: targetPort.type,
      })
    }
    const portKey = `${edge.targetNodeId}:${edge.targetPort}`
    const targetInputs = incoming.get(edge.targetNodeId)
    if (targetInputs && !targetPort.multiple && targetInputs.has(portKey)) {
      throw new WorkflowDomainError('INVALID_EDGE', `Input port ${portKey} accepts only one edge`, { edgeId: edge.id })
    }
    targetInputs?.add(portKey)
  }

  for (const node of workflow.nodes) {
    const definition = definitions.get(node.id)
    if (!definition) continue
    const connected = incoming.get(node.id) ?? new Set<string>()
    for (const port of definition.inputPorts) {
      if (port.required && !connected.has(`${node.id}:${port.id}`)) {
        throw new WorkflowDomainError('MISSING_REQUIRED_INPUT', `Required input ${node.id}:${port.id} is not connected`, {
          nodeId: node.id,
          port: port.id,
        })
      }
    }
  }

  assertAcyclic(workflow)
  return definitions
}

function collectInputs(
  node: WorkflowNodeDTO,
  workflow: WorkflowDefinitionDTO,
  state: WorkflowState,
): Record<string, unknown> {
  const incoming = workflow.edges.filter((edge) => edge.targetNodeId === node.id)
  if (incoming.length === 0) return state.runInput

  const inputs: Record<string, unknown> = {}
  for (const edge of incoming) {
    const sourceOutputs = state.outputs[edge.sourceNodeId]
    if (sourceOutputs && edge.sourcePort in sourceOutputs) {
      inputs[edge.targetPort] = sourceOutputs[edge.sourcePort]
    }
  }
  return inputs
}

export function compileWorkflow(
  workflow: WorkflowDefinitionDTO,
  registries: WorkflowRegistries,
  options: WorkflowCompileOptions = {},
): CompiledWorkflow {
  const definitions = validateWorkflow(workflow, registries)
  const graphBuilder = new StateGraph(workflowState)
  const incomingCounts = new Map<string, number>()
  const outgoingCounts = new Map<string, number>()
  for (const node of workflow.nodes) {
    incomingCounts.set(node.id, 0)
    outgoingCounts.set(node.id, 0)
  }
  for (const edge of workflow.edges) {
    incomingCounts.set(edge.targetNodeId, (incomingCounts.get(edge.targetNodeId) ?? 0) + 1)
    outgoingCounts.set(edge.sourceNodeId, (outgoingCounts.get(edge.sourceNodeId) ?? 0) + 1)
  }

  for (const node of workflow.nodes) {
    const definition = definitions.get(node.id)
    if (!definition) continue
    const executor = registries.executors.get(definition.executorKind)
    graphBuilder.addNode(node.id, async (state, config) => {
      const runnableConfig = config as { signal?: AbortSignal; configurable?: Record<string, unknown> }
      const signal = runnableConfig.signal ?? new AbortController().signal
      if (signal.aborted) {
        throw new WorkflowDomainError('RUN_CANCELLED', 'Workflow run was cancelled before node execution', { nodeId: node.id })
      }
      const runId = typeof runnableConfig.configurable?.runId === 'string' ? runnableConfig.configurable.runId : 'unknown-run'
      const result = await executor({
        node,
        definition,
        inputs: collectInputs(node, workflow, state as WorkflowState),
        config: node.config,
        signal,
        runId,
      })
      const event: WorkflowRunEvent = {
        workflowId: workflow.id,
        revision: workflow.revision,
        runId,
        nodeId: node.id,
        sequence: (state as WorkflowState).events.length + 1,
        status: 'succeeded',
        timestamp: new Date().toISOString(),
      }
      return { outputs: { [node.id]: result }, events: [event] }
    })
  }

  // A node with several regular predecessors must wait for all of them. A
  // separate edge per predecessor is an OR-style trigger in LangGraph; the
  // array form creates the required barrier for typed joins such as
  // Retriever.documents + Input.query -> LLM.
  const regularIncoming = new Map<string, Set<string>>()
  for (const edge of workflow.edges) {
    const sourceDefinition = definitions.get(edge.sourceNodeId)
    if (sourceDefinition?.type === 'condition') continue
    const sources = regularIncoming.get(edge.targetNodeId) ?? new Set<string>()
    sources.add(edge.sourceNodeId)
    regularIncoming.set(edge.targetNodeId, sources)
  }
  for (const [targetNodeId, sources] of regularIncoming) {
    const sourceNodeIds = [...sources]
    if (sourceNodeIds.length === 1) graphBuilder.addEdge(sourceNodeIds[0], targetNodeId)
    else graphBuilder.addEdge(sourceNodeIds, targetNodeId)
  }

  for (const node of workflow.nodes) {
    if ((incomingCounts.get(node.id) ?? 0) === 0) graphBuilder.addEdge(START, node.id)
    if ((outgoingCounts.get(node.id) ?? 0) === 0) graphBuilder.addEdge(node.id, END)
  }

  for (const node of workflow.nodes) {
    const definition = definitions.get(node.id)
    if (definition?.type !== 'condition') continue
    const branches = workflow.edges.filter((edge) => edge.sourceNodeId === node.id)
    const routeMap: Record<string, string> = {}
    for (const edge of branches) routeMap[edge.sourcePort] = edge.targetNodeId
    graphBuilder.addConditionalEdges(node.id, (state) => {
      const branch = (state as WorkflowState).outputs[node.id]?.branch
      if (typeof branch !== 'string' || !routeMap[branch]) {
        throw new WorkflowDomainError('INVALID_WORKFLOW', `Condition ${node.id} returned unknown branch`, { nodeId: node.id, branch })
      }
      return branch
    }, routeMap)
  }

  return {
    definition: structuredClone(workflow),
    graph: graphBuilder.compile({
      checkpointer: options.checkpointer,
      interruptBefore: options.interruptBefore,
      interruptAfter: options.interruptAfter,
    }),
  }
}
