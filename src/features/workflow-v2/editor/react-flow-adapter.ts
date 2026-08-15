import type { Edge, Node } from '@xyflow/react'
import type { WorkflowDefinitionDTO, WorkflowEdgeDTO, WorkflowNodeDTO } from '../domain/types'
import type { PublishedNodeDefinition } from '../../../../electron/services/workflow-v2/node-definition'

export interface WorkflowFlowNodeData {
  [key: string]: unknown
  workflowNode: WorkflowNodeDTO
  definition?: PublishedNodeDefinition
}

export type WorkflowFlowNode = Node<WorkflowFlowNodeData, 'workflow'>

export function toFlowGraph(workflow: WorkflowDefinitionDTO, definitions: PublishedNodeDefinition[] = []): { nodes: WorkflowFlowNode[]; edges: Edge[] } {
  const definitionMap = new Map(definitions.map((definition) => [`${definition.type}@${definition.version}`, definition]))
  return {
    nodes: workflow.nodes.map((node) => ({
      id: node.id,
      type: 'workflow',
      position: node.position,
      data: { workflowNode: structuredClone(node), definition: definitionMap.get(`${node.type}@${node.version}`) },
    })),
    edges: workflow.edges.map((edge) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      sourceHandle: edge.sourcePort,
      target: edge.targetNodeId,
      targetHandle: edge.targetPort,
      type: 'smoothstep',
    })),
  }
}

export function fromFlowGraph(
  workflow: Pick<WorkflowDefinitionDTO, 'id' | 'name' | 'schemaVersion' | 'revision' | 'settings'>,
  nodes: WorkflowFlowNode[],
  edges: Edge[],
): WorkflowDefinitionDTO {
  return {
    ...workflow,
    nodes: nodes.map((node) => ({ ...structuredClone(node.data.workflowNode), position: { x: node.position.x, y: node.position.y } })),
    edges: edges.flatMap((edge): WorkflowEdgeDTO[] => edge.sourceHandle && edge.targetHandle ? [{
      id: edge.id,
      sourceNodeId: edge.source,
      sourcePort: edge.sourceHandle,
      targetNodeId: edge.target,
      targetPort: edge.targetHandle,
    }] : []),
  }
}
