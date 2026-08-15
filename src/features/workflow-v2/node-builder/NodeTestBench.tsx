import { useState } from 'react'

interface NodeTestBenchProps {
  onTest: (values: Record<string, unknown>) => Promise<unknown>
  disabled?: boolean
}

export function NodeTestBench({ onTest, disabled }: NodeTestBenchProps) {
  const [input, setInput] = useState('{}')
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const run = async () => {
    setRunning(true); setError(null)
    try {
      const values = JSON.parse(input) as Record<string, unknown>
      setResult(await onTest(values))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '测试失败')
      setResult(null)
    } finally { setRunning(false) }
  }
  return <section className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] p-3">
    <div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium text-[var(--text-primary)]">测试台</span><button onClick={() => void run()} disabled={disabled || running} className="rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-[10px] text-white disabled:opacity-50">{running ? '测试中…' : '运行测试'}</button></div>
    <textarea value={input} onChange={(event) => setInput(event.target.value)} className="h-20 w-full rounded border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2 font-mono text-xs text-[var(--text-primary)]" spellCheck={false} />
    {error && <p className="mt-2 rounded bg-red-500/10 p-2 text-[10px] text-red-300">{error}</p>}
    {result !== null && <pre className="mt-2 max-h-36 overflow-auto rounded bg-[var(--panel-bg)] p-2 text-[10px] text-green-300">{JSON.stringify(result, null, 2)}</pre>}
  </section>
}
