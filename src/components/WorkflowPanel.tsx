import { WorkflowV2Panel } from '../features/workflow-v2/WorkflowV2Panel'

/**
 * Workflow entry point. The previous canvas and its client-side execution
 * model were removed; all workflow editing and execution now uses Workflow V2
 * (React Flow + LangGraph) so the saved graph is the same graph that runs.
 */
export function WorkflowPanel({ onClose }: { onInsertToInput?: (value: string) => void; onClose?: () => void }) {
  return <WorkflowV2Panel onClose={onClose} />
}

export default WorkflowPanel
