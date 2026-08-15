import { useEffect, useState } from 'react'
import type { WorkflowRunEvent } from '../domain/types'

interface RunDrawerProps {
  runId: string | null
  onClose: () => void
}

const ipcRenderer = window.require ? window.require('electron').ipcRenderer as { invoke: (channel: string, ...args: unknown[]) => Promise<unknown>; on: (channel: string, listener: (...args: unknown[]) => void) => void; removeListener: (channel: string, listener: (...args: unknown[]) => void) => void } : null

export function RunDrawer({ runId, onClose }: RunDrawerProps) {
  const [events, setEvents] = useState<WorkflowRunEvent[]>([])
  const [confirmation, setConfirmation] = useState<{ id: string; payload: Record<string, unknown> } | null>(null)
  useEffect(() => {
    if (!runId || !ipcRenderer) return
    void ipcRenderer.invoke('workflow-v2:get-pending-confirmation', runId).then((value) => {
      setConfirmation(value as { id: string; payload: Record<string, unknown> } | null)
    })
    const listener = (...args: unknown[]) => {
      const payload = args[1] as WorkflowRunEvent | undefined
      if (!payload) return
      if (payload.runId !== runId) return
      setEvents((current) => [...current, payload])
      if (payload.status === 'waiting_confirmation' && payload.message) {
        void ipcRenderer!.invoke('workflow-v2:get-pending-confirmation', runId).then((value) => setConfirmation(value as { id: string; payload: Record<string, unknown> } | null))
      }
    }
    ipcRenderer.on('workflow-v2:event', listener)
    return () => ipcRenderer?.removeListener('workflow-v2:event', listener)
  }, [runId])
  if (!runId) return null
  const cancel = () => void ipcRenderer?.invoke('workflow-v2:cancel', { runId })
  const resolveConfirmation = (approved: boolean) => {
    if (!confirmation) return
    void ipcRenderer?.invoke('workflow-v2:resume-confirmation', { confirmationId: confirmation.id, approved }).then(() => setConfirmation(null))
  }
  return <aside className="absolute right-4 top-4 z-20 flex max-h-[calc(100%-2rem)] w-80 flex-col rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/95 p-4 shadow-2xl backdrop-blur"><div className="flex items-center justify-between"><h3 className="text-sm font-medium text-[var(--text-primary)]">运行 {runId}</h3><button onClick={onClose} className="text-xs text-[var(--text-secondary)]">关闭</button></div><div className="mt-3 flex-1 space-y-2 overflow-y-auto">{events.map((event, index) => <div key={`${event.sequence}-${index}`} className="rounded-lg bg-[var(--surface-muted)] p-2 text-[10px]"><div className="flex justify-between text-[var(--text-secondary)]"><span>{event.nodeId || 'workflow'}</span><span>{event.status}</span></div>{event.error && <p className="mt-1 text-red-300">{event.error.message}</p>}</div>)}{events.length === 0 && <p className="text-xs text-[var(--text-secondary)]">等待运行事件…</p>}</div>{confirmation && <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/10 p-3"><p className="text-xs text-amber-200">节点请求执行副作用操作</p><pre className="mt-2 max-h-24 overflow-auto text-[10px] text-amber-100">{JSON.stringify(confirmation.payload, null, 2)}</pre><div className="mt-2 flex justify-end gap-2"><button onClick={() => resolveConfirmation(false)} className="rounded px-2 py-1 text-[10px] text-red-300">拒绝</button><button onClick={() => resolveConfirmation(true)} className="rounded bg-amber-500 px-2 py-1 text-[10px] text-black">确认执行</button></div></div>}<button onClick={cancel} className="mt-3 rounded-lg border border-red-400/30 px-3 py-2 text-xs text-red-300">取消运行</button></aside>
}
