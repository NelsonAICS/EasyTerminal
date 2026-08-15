import { useCallback, useEffect, useMemo, type DragEvent } from 'react'
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { arePortTypesCompatible } from '../domain/ports'
import type { WorkflowDefinitionDTO, WorkflowNodeDTO } from '../domain/types'
import type { PublishedNodeDefinition } from '../../../../electron/services/workflow-v2/node-definition'
import { NodeInspector } from './NodeInspector'
import { NodeLibrary } from './NodeLibrary'
import { toFlowGraph, fromFlowGraph, type WorkflowFlowNode } from './react-flow-adapter'
import { WorkflowNodeCard } from './nodes/WorkflowNodeCard'
import './workflow-editor.css'

const nodeTypes = { workflow: WorkflowNodeCard }

interface WorkflowEditorProps {
  workflow: WorkflowDefinitionDTO
  definitions: PublishedNodeDefinition[]
  onSave?: (workflow: WorkflowDefinitionDTO) => Promise<void> | void
  onRun?: (workflow: WorkflowDefinitionDTO) => Promise<void> | void
}

function EditorCanvas({ workflow, definitions, onSave, onRun }: WorkflowEditorProps) {
  const initial = useMemo(() => toFlowGraph(workflow, definitions), [workflow, definitions])
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowFlowNode>(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)
  const { screenToFlowPosition } = useReactFlow()

  useEffect(() => {
    const next = toFlowGraph(workflow, definitions)
    setNodes(next.nodes)
    setEdges(next.edges)
  }, [workflow, definitions, setNodes, setEdges])

  const definitionMap = useMemo(() => new Map(definitions.map((definition) => [`${definition.type}@${definition.version}`, definition])), [definitions])
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) return
    const source = nodes.find((node) => node.id === connection.source)
    const target = nodes.find((node) => node.id === connection.target)
    const sourcePort = source?.data.definition?.outputPorts.find((port) => port.id === connection.sourceHandle)
    const targetPort = target?.data.definition?.inputPorts.find((port) => port.id === connection.targetHandle)
    if (!sourcePort || !targetPort || !arePortTypesCompatible(sourcePort.type, targetPort.type)) return
    if (!targetPort.multiple && edges.some((edge) => edge.target === connection.target && edge.targetHandle === connection.targetHandle)) return
    setEdges((current) => addEdge({ ...connection, id: `edge-${Date.now()}`, type: 'smoothstep' }, current))
  }, [edges, nodes, setEdges])

  const onDrop = useCallback((event: DragEvent) => {
    event.preventDefault()
    const raw = event.dataTransfer.getData('application/workflow-node')
    if (!raw) return
    try {
      const requested = JSON.parse(raw) as { type: string; version: number }
      const definition = definitionMap.get(`${requested.type}@${requested.version}`)
      if (!definition) return
      const node: WorkflowNodeDTO = {
        id: `node-${Date.now()}`,
        type: definition.type,
        version: definition.version,
        position: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
        config: {},
      }
      setNodes((current) => [...current, { id: node.id, type: 'workflow', position: node.position, data: { workflowNode: node, definition } }])
    } catch {
      // Ignore malformed drag payloads from outside the editor.
    }
  }, [definitionMap, screenToFlowPosition, setNodes])

  const selectedNode = nodes.find((node) => node.selected)?.data.workflowNode ?? null
  const updateSelectedNode = (updated: WorkflowNodeDTO) => setNodes((current) => current.map((node) => node.id === updated.id ? { ...node, data: { ...node.data, workflowNode: updated } } : node))
  const materialize = () => fromFlowGraph(workflow, nodes, edges as Edge[])

  return <div className="workflow-editor-shell">
    <NodeLibrary definitions={definitions} />
    <div className="workflow-editor-canvas" onDrop={onDrop} onDragOver={(event) => event.preventDefault()}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView fitViewOptions={{ padding: 0.24, maxZoom: 1.1 }} defaultEdgeOptions={{ type: 'smoothstep' }}>
        <Background gap={24} size={1} color="rgba(148, 163, 184, 0.16)" />
        <Controls />
        <MiniMap nodeColor={() => 'var(--accent)'} />
        <Panel position="top-right" className="workflow-editor-actions flex gap-2">
          <button onClick={() => void onSave?.(materialize())} className="secondary-button">保存修订</button>
          <button onClick={() => void onRun?.(materialize())} className="primary-button">运行</button>
        </Panel>
      </ReactFlow>
    </div>
    <NodeInspector key={selectedNode?.id ?? 'empty'} node={selectedNode} onChange={updateSelectedNode} />
  </div>
}

export function WorkflowEditor(props: WorkflowEditorProps) {
  return <ReactFlowProvider><EditorCanvas {...props} /></ReactFlowProvider>
}
