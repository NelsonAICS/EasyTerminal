interface PublishDialogProps {
  open: boolean
  type: string
  version: number
  onCancel: () => void
  onConfirm: () => Promise<void>
}

export function PublishDialog({ open, type, version, onCancel, onConfirm }: PublishDialogProps) {
  if (!open) return null
  return <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4">
    <div className="w-full max-w-sm rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 shadow-2xl">
      <h3 className="text-sm font-medium text-[var(--text-primary)]">发布节点版本</h3>
      <p className="mt-2 text-xs text-[var(--text-secondary)]">发布后 {type}@{version} 不可覆盖修改，后续改动必须创建新版本。</p>
      <div className="mt-4 flex justify-end gap-2"><button onClick={onCancel} className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-xs text-[var(--text-primary)]">取消</button><button onClick={() => void onConfirm()} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs text-white">确认发布</button></div>
    </div>
  </div>
}
