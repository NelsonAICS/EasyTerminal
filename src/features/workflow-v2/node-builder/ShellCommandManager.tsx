import { useEffect, useState } from 'react'
import { Plus, Save, ShieldCheck } from 'lucide-react'
import type { CommandArgumentDefinition } from '../../../../electron/services/shell/command-definition'

interface ManagedCommand {
  id: string
  name: string
  executable: string
  arguments?: CommandArgumentDefinition[]
  allowedCwdRoots?: string[]
  allowedEnv?: string[]
  maxOutputBytes?: number
  timeoutMs?: number
  status: 'draft' | 'tested' | 'published'
  lastTest?: { testedAt: string; args: string[] }
}

interface Draft extends ManagedCommand { argumentsJson: string; cwdRootsJson: string; envJson: string }

const emptyDraft = (): Draft => ({
  id: `command.${Date.now()}`,
  name: '新命令',
  executable: '/bin/echo',
  arguments: [],
  allowedCwdRoots: ['.'],
  allowedEnv: [],
  maxOutputBytes: 1_048_576,
  timeoutMs: 30_000,
  status: 'draft',
  argumentsJson: '[]',
  cwdRootsJson: JSON.stringify(['.'], null, 2),
  envJson: '[]',
})

const api = () => window.electronAPI?.workflowV2.shellCommands

export function ShellCommandManager() {
  const [commands, setCommands] = useState<ManagedCommand[]>([])
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    const service = api()
    if (!service) return
    setCommands(await service.list() as ManagedCommand[])
  }

  useEffect(() => {
    let active = true
    const service = api()
    if (!service) return
    void service.list().then((value) => { if (active) setCommands(value as ManagedCommand[]) })
    return () => { active = false }
  }, [])

  const select = (command: ManagedCommand) => setDraft({
    ...command,
    argumentsJson: JSON.stringify(command.arguments ?? [], null, 2),
    cwdRootsJson: JSON.stringify(command.allowedCwdRoots ?? [], null, 2),
    envJson: JSON.stringify(command.allowedEnv ?? [], null, 2),
  })

  const save = async () => {
    try {
      const service = api()
      if (!service) throw new Error('主进程通信不可用')
      const argumentsList = JSON.parse(draft.argumentsJson) as CommandArgumentDefinition[]
      const cwdRoots = JSON.parse(draft.cwdRootsJson) as string[]
      const env = JSON.parse(draft.envJson) as string[]
      const saved = await service.saveDraft({ id: draft.id, name: draft.name, executable: draft.executable, arguments: argumentsList, allowedCwdRoots: cwdRoots, allowedEnv: env, maxOutputBytes: draft.maxOutputBytes, timeoutMs: draft.timeoutMs }) as ManagedCommand
      setDraft({ ...saved, argumentsJson: JSON.stringify(saved.arguments ?? [], null, 2), cwdRootsJson: JSON.stringify(saved.allowedCwdRoots ?? [], null, 2), envJson: JSON.stringify(saved.allowedEnv ?? [], null, 2) })
      await refresh()
      setError(null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : '保存命令失败') }
  }

  const test = async () => {
    try {
      const service = api()
      if (!service) throw new Error('主进程通信不可用')
      const args = JSON.parse(draft.argumentsJson) as CommandArgumentDefinition[]
      const tested = await service.test({ id: draft.id, args: args.map((argument) => argument.type === 'number' ? '1' : argument.type === 'boolean' ? 'true' : 'test') }) as ManagedCommand
      select(tested)
      await refresh()
      setError(null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : '命令测试失败') }
  }

  const publish = async () => {
    try {
      const service = api()
      if (!service) throw new Error('主进程通信不可用')
      const published = await service.publish({ id: draft.id }) as ManagedCommand
      select(published)
      await refresh()
      setError(null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : '发布命令失败') }
  }

  return <div className="flex h-full min-h-0 gap-4 p-5">
    <aside className="w-60 shrink-0 overflow-y-auto rounded-xl border border-[var(--panel-border)] bg-[var(--surface-muted)] p-2"><div className="mb-2 flex items-center justify-between px-2"><span className="text-xs text-[var(--text-secondary)]">受控命令</span><button onClick={() => setDraft(emptyDraft())} className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--panel-border)]"><Plus size={14} /></button></div>{commands.map((command) => <button key={command.id} onClick={() => select(command)} className={`mb-1 w-full rounded-lg px-2.5 py-2 text-left ${draft.id === command.id ? 'bg-[var(--accent)]/15' : 'hover:bg-[var(--panel-bg)]'}`}><div className="truncate text-xs">{command.name}</div><div className="mt-1 text-[10px] text-[var(--text-secondary)]">{command.id} · {command.status}</div></button>)}</aside>
    <main className="min-w-0 flex-1 space-y-4 overflow-y-auto"><section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-medium">Shell 命令管理</h2><p className="mt-1 text-[10px] text-[var(--text-secondary)]">只发布固定可执行文件和声明参数，工作流不能提交任意 Shell 字符串。</p></div><button onClick={() => void save()} className="flex items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs text-white"><Save size={13} />保存草稿</button></div>{error && <p className="mb-3 rounded-lg bg-red-500/10 p-2 text-xs text-red-300">{error}</p>}<div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-[var(--text-secondary)]">命令 ID<input value={draft.id} onChange={(event) => setDraft({ ...draft, id: event.target.value })} disabled={draft.status === 'published'} className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-2.5 py-2 text-xs" /></label><label className="text-xs text-[var(--text-secondary)]">名称<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-2.5 py-2 text-xs" /></label><label className="text-xs text-[var(--text-secondary)] sm:col-span-2">固定可执行文件路径<input value={draft.executable} onChange={(event) => setDraft({ ...draft, executable: event.target.value })} disabled={draft.status === 'published'} className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-2.5 py-2 font-mono text-xs" /></label><label className="text-xs text-[var(--text-secondary)]">参数定义 JSON<textarea value={draft.argumentsJson} onChange={(event) => setDraft({ ...draft, argumentsJson: event.target.value })} className="mt-1 h-32 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] p-2 font-mono text-[10px]" /></label><label className="text-xs text-[var(--text-secondary)]">允许工作目录 JSON<textarea value={draft.cwdRootsJson} onChange={(event) => setDraft({ ...draft, cwdRootsJson: event.target.value })} className="mt-1 h-32 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] p-2 font-mono text-[10px]" /></label><label className="text-xs text-[var(--text-secondary)]">允许环境变量 JSON<textarea value={draft.envJson} onChange={(event) => setDraft({ ...draft, envJson: event.target.value })} className="mt-1 h-24 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] p-2 font-mono text-[10px]" /></label><label className="text-xs text-[var(--text-secondary)]">超时 / 最大输出<input type="number" value={draft.timeoutMs ?? 30_000} onChange={(event) => setDraft({ ...draft, timeoutMs: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-2.5 py-2 text-xs" /></label></div><div className="mt-4 flex items-center gap-2"><button onClick={() => void test()} disabled={draft.status === 'published'} className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-xs">测试声明</button><button onClick={() => void publish()} disabled={draft.status !== 'tested'} className="flex items-center gap-1 rounded-lg border border-emerald-400/30 px-3 py-2 text-xs text-emerald-300 disabled:opacity-40"><ShieldCheck size={13} />发布命令</button><span className="text-[10px] text-[var(--text-secondary)]">状态：{draft.status}</span></div></section></main>
  </div>
}
