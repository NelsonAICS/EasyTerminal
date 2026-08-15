import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { WorkflowFlowNode } from '../react-flow-adapter'

export function WorkflowNodeCard({ data, selected }: NodeProps<WorkflowFlowNode>) {
  const node = data.workflowNode
  const definition = data.definition
  const inputPorts = definition?.inputPorts ?? []
  const outputPorts = definition?.outputPorts ?? []
  const nodeTitle = String(node.config.label ?? definition?.type ?? node.type)

  return <div className={`workflow-node-card ${selected ? 'is-selected' : ''}`}>
    <div className="workflow-node-header"><div className="min-w-0"><div className="truncate text-xs font-semibold text-[var(--text-primary)]">{nodeTitle}</div><div className="mt-1 truncate font-mono text-[9px] text-[var(--text-secondary)]">{node.type}@{node.version}</div></div><span className="workflow-node-badge">节点</span></div>
    <div className="workflow-node-body">
      <div className="workflow-port-column">{inputPorts.length > 0 ? inputPorts.map((port) => <div key={`in-${port.id}`} className="workflow-port-row workflow-port-input"><span className="truncate">{port.label || port.id}</span><Handle type="target" position={Position.Left} id={port.id} className="workflow-handle" style={{ top: '50%', left: -5, transform: 'translateY(-50%)' }} /></div>) : <span className="workflow-port-empty">无输入</span>}</div>
      <div className="workflow-port-column workflow-port-output-column">{outputPorts.length > 0 ? outputPorts.map((port) => <div key={`out-${port.id}`} className="workflow-port-row workflow-port-output"><span className="truncate">{port.label || port.id}</span><Handle type="source" position={Position.Right} id={port.id} className="workflow-handle" style={{ top: '50%', right: -5, transform: 'translateY(-50%)' }} /></div>) : <span className="workflow-port-empty">无输出</span>}</div>
    </div>
    {!definition && <div className="workflow-node-error">未找到已发布节点定义</div>}
  </div>
}
