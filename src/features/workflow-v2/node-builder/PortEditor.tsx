import { Plus, Trash2 } from 'lucide-react'
import type { PortDefinition, PortType } from '../domain/types'

const PORT_TYPES: PortType[] = ['text', 'number', 'boolean', 'json', 'table', 'messages', 'documents', 'artifact', 'error']

interface PortEditorProps {
  title: string
  value: PortDefinition[]
  onChange: (ports: PortDefinition[]) => void
}

export function PortEditor({ title, value, onChange }: PortEditorProps) {
  const update = (index: number, patch: Partial<PortDefinition>) => onChange(value.map((port, current) => current === index ? { ...port, ...patch } : port))
  const remove = (index: number) => onChange(value.filter((_port, current) => current !== index))
  return (
    <section className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] p-3">
      <div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium text-[var(--text-primary)]">{title}</span><button onClick={() => onChange([...value, { id: `port_${value.length + 1}`, type: 'text' }])} className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--panel-border)]"><Plus size={13} /></button></div>
      <div className="space-y-2">
        {value.map((port, index) => <div key={`${port.id}-${index}`} className="flex items-center gap-1.5">
          <input value={port.id} onChange={(event) => update(index, { id: event.target.value })} className="min-w-0 flex-1 rounded border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 py-1.5 text-xs text-[var(--text-primary)]" placeholder="portId" />
          <select value={port.type} onChange={(event) => update(index, { type: event.target.value as PortType })} className="w-28 rounded border border-[var(--panel-border)] bg-[var(--panel-bg)] px-1 py-1.5 text-[10px] text-[var(--text-primary)]">{PORT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select>
          <label className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]"><input type="checkbox" checked={Boolean(port.required)} onChange={(event) => update(index, { required: event.target.checked })} />必填</label>
          <button onClick={() => remove(index)} className="rounded p-1 text-red-400 hover:bg-red-500/10"><Trash2 size={12} /></button>
        </div>)}
        {value.length === 0 && <p className="text-[10px] text-[var(--text-secondary)]">暂无端口</p>}
      </div>
    </section>
  )
}
