import { useEffect, useRef, useState } from 'react'
import { BookOpen, ChevronRight, Clipboard, Command, Pin, Play, Search, ShieldAlert, Sparkles, TerminalSquare, X } from 'lucide-react'
import {
  COMMAND_MANUAL_CATEGORIES,
  COMMAND_MANUAL_ENTRIES,
  type ManualEntry,
  type ManualFilterId,
} from '../data/commandManual'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    require?: any
  }
}

const electron = window.require ? window.require('electron') : null

export interface QuickTool {
  name: string
  cmd: string
}

interface CommandManualModalProps {
  quickTools: QuickTool[]
  initialSearch?: string
  onClose: () => void
  onInsertCommand: (command: string) => void
  onRunCommand: (command: string) => void
  onPinTool: (tool: QuickTool) => void
}

const LOCAL_VERIFIED_COUNT = COMMAND_MANUAL_ENTRIES.filter(entry => entry.verification === 'local').length

const matchesSearch = (entry: ManualEntry, query: string) => {
  if (!query) return true

  const haystack = [
    entry.title,
    entry.summary,
    entry.purpose,
    entry.syntax,
    entry.example || '',
    entry.note || '',
    ...entry.tags,
  ].join(' ').toLowerCase()

  return haystack.includes(query)
}

const getActionCommand = (entry: ManualEntry) => entry.actionCommand || entry.example

export function CommandManualModal({
  quickTools,
  initialSearch = '',
  onClose,
  onInsertCommand,
  onRunCommand,
  onPinTool,
}: CommandManualModalProps) {
  const [search, setSearch] = useState(initialSearch)
  const [activeFilter, setActiveFilter] = useState<ManualFilterId>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const copyTimerRef = useRef<number | null>(null)

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSearch(initialSearch)
  }, [initialSearch])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current)
      }
    }
  }, [])

  const normalizedSearch = search.trim().toLowerCase()

  const filteredEntries = COMMAND_MANUAL_ENTRIES.filter(entry => {
    const matchesFilter = activeFilter === 'all' || entry.category === activeFilter
    return matchesFilter && matchesSearch(entry, normalizedSearch)
  })

  const categorySummaries = COMMAND_MANUAL_CATEGORIES.map(category => ({
    ...category,
    count: COMMAND_MANUAL_ENTRIES.filter(entry =>
      entry.category === category.id && matchesSearch(entry, normalizedSearch)
    ).length,
  }))

  const copyToClipboard = async (entryId: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      electron?.clipboard?.writeText(value)
    }

    setCopiedId(entryId)
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current)
    }
    copyTimerRef.current = window.setTimeout(() => {
      setCopiedId(null)
    }, 1600)
  }

  return (
    <div
      className="absolute inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="glass-panel relative flex h-[min(86vh,920px)] w-[min(1180px,calc(100vw-40px))] overflow-hidden rounded-[30px] border border-[var(--panel-border)] bg-[var(--bg-base)]/90 shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.08),transparent_28%)]" />

        <aside className="relative hidden min-h-0 w-[300px] shrink-0 border-r border-[var(--panel-border)]/80 bg-[var(--panel-bg)]/45 lg:flex lg:flex-col">
          <div className="flex-1 overflow-y-auto p-5">
            <div className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/75 p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)]/12 text-[var(--accent)]">
                  <BookOpen size={20} />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">命令手册</div>
                  <div className="mt-1 text-lg font-semibold text-[var(--text-primary)]">开发命令速查</div>
                </div>
              </div>

              <p className="text-sm leading-6 text-[var(--text-secondary)]">
                查命令作用、看格式、复制示例、插入输入框，或者直接发到当前终端执行。
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl border border-[var(--panel-border)] bg-black/15 px-3 py-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">收录</div>
                  <div className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{COMMAND_MANUAL_ENTRIES.length}</div>
                  <div className="mt-1 text-[var(--text-secondary)]">条命令/快捷项</div>
                </div>
                <div className="rounded-2xl border border-[var(--panel-border)] bg-black/15 px-3 py-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">校验</div>
                  <div className="mt-2 text-xl font-semibold text-emerald-300">{LOCAL_VERIFIED_COUNT}</div>
                  <div className="mt-1 text-[var(--text-secondary)]">条本机 CLI 校验</div>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                <Sparkles size={12} />
                分类浏览
              </div>
              <div className="space-y-2.5">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                    activeFilter === 'all'
                      ? 'border-[var(--accent)]/45 bg-[var(--accent)]/10 text-[var(--text-primary)]'
                      : 'border-[var(--panel-border)] bg-[var(--panel-bg)]/55 text-[var(--text-secondary)] hover:border-[var(--panel-border-glow)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">全部</div>
                      <div className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">按搜索结果聚合全部命令</div>
                    </div>
                    <span className="rounded-full bg-black/20 px-2 py-1 text-[11px] font-medium">{COMMAND_MANUAL_ENTRIES.filter(entry => matchesSearch(entry, normalizedSearch)).length}</span>
                  </div>
                </button>

                {categorySummaries.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setActiveFilter(category.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                      activeFilter === category.id
                        ? 'border-[var(--accent)]/45 bg-[var(--accent)]/10 text-[var(--text-primary)]'
                        : 'border-[var(--panel-border)] bg-[var(--panel-bg)]/55 text-[var(--text-secondary)] hover:border-[var(--panel-border-glow)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{category.label}</div>
                        <div className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{category.description}</div>
                      </div>
                      <span className="rounded-full bg-black/20 px-2 py-1 text-[11px] font-medium">{category.count}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/65 p-5">
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                <TerminalSquare size={12} />
                使用方式
              </div>
              <div className="space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
                <div>查命令：搜索作用、命令名、参数格式或工具名。</div>
                <div>插入命令：把示例直接放进底部输入框，继续修改后再发。</div>
                <div>直接执行：对安全命令一键下发到当前终端标签页。</div>
                <div>加入快捷工具栏：把高频命令固定到底部 Quick Tools。</div>
              </div>
            </div>
          </div>
        </aside>

        <section className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="border-b border-[var(--panel-border)] px-5 py-5 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                  <Command size={13} />
                  命令手册
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                  快捷键与命令速查中心
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
                  覆盖 EasyTerminal 操作、Linux 常用命令、Node/npm 开发命令，以及 Claude Code / Codex 常见调用格式。
                </p>
              </div>

              <button
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text-secondary)] transition-colors hover:border-[var(--panel-border-glow)] hover:text-[var(--text-primary)]"
                title="关闭命令手册"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/80 pl-11 pr-12 text-sm text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-secondary)] focus:border-[var(--accent)]/45 focus:bg-[var(--panel-bg)]"
                  placeholder="搜索命令名、作用、参数格式、工具名，例如：查看目录、安装依赖、codex review..."
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/5 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                    title="清空搜索"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)]/75 px-3 py-2">F1 / Cmd(Ctrl)+/ 打开</span>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-emerald-200">AI Agent 命令基于本机 `--help` 校验</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 lg:hidden">
              <button
                onClick={() => setActiveFilter('all')}
                className={`rounded-full px-3 py-1.5 text-xs transition-all ${
                  activeFilter === 'all'
                    ? 'bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/40'
                    : 'bg-white/[0.04] text-[var(--text-secondary)] ring-1 ring-white/8 hover:text-[var(--text-primary)]'
                }`}
              >
                全部
              </button>
              {categorySummaries.map(category => (
                <button
                  key={category.id}
                  onClick={() => setActiveFilter(category.id)}
                  className={`rounded-full px-3 py-1.5 text-xs transition-all ${
                    activeFilter === category.id
                      ? 'bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/40'
                      : 'bg-white/[0.04] text-[var(--text-secondary)] ring-1 ring-white/8 hover:text-[var(--text-primary)]'
                  }`}
                >
                  {category.label} · {category.count}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="text-sm text-[var(--text-secondary)]">
                当前显示 <span className="font-semibold text-[var(--text-primary)]">{filteredEntries.length}</span> 条结果
                {activeFilter !== 'all' && (
                  <span className="ml-2 rounded-full border border-white/8 bg-white/[0.03] px-2 py-1 text-[11px]">
                    {COMMAND_MANUAL_CATEGORIES.find(category => category.id === activeFilter)?.label}
                  </span>
                )}
              </div>
              <div className="hidden items-center gap-2 text-xs text-[var(--text-secondary)] md:flex">
                <ChevronRight size={13} />
                复制不会关闭弹层，插入和执行会自动回到当前终端流程
              </div>
            </div>

            {filteredEntries.length === 0 ? (
              <div className="flex h-full min-h-[320px] items-center justify-center">
                <div className="max-w-md rounded-[28px] border border-dashed border-white/10 bg-black/20 px-8 py-10 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-sky-300">
                    <Search size={22} />
                  </div>
                  <div className="mt-4 text-lg font-medium text-[var(--text-primary)]">没有找到匹配项</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    试试搜索命令英文名、中文作用、参数关键字，或者切回“全部”分类重新查看。
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {filteredEntries.map(entry => {
                  const actionCommand = getActionCommand(entry)
                  const isPinned = !!actionCommand && quickTools.some(tool => tool.cmd === actionCommand)

                  return (
                    <article
                      key={entry.id}
                      className="group relative overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/65 p-5 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.45)] transition-all hover:border-[var(--panel-border-glow)]"
                    >
                      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <div className="absolute -right-16 top-0 h-32 w-32 rounded-full bg-[var(--accent)]/10 blur-3xl" />
                      </div>

                      <div className="relative">
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-sky-500/12 px-2.5 py-1 text-[11px] font-medium text-sky-200">
                            {COMMAND_MANUAL_CATEGORIES.find(category => category.id === entry.category)?.label}
                          </span>
                          <span className="rounded-full border border-white/8 bg-black/20 px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                            {entry.type === 'shortcut' ? '快捷键' : '命令'}
                          </span>
                          {entry.verification === 'local' && (
                            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                              本机 CLI 校验
                            </span>
                          )}
                          {entry.dangerous && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-200">
                              <ShieldAlert size={12} />
                              高风险
                            </span>
                          )}
                        </div>

                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{entry.title}</h3>
                            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{entry.summary}</p>
                          </div>
                        </div>

                        <div className="mt-4 rounded-[24px] border border-[var(--panel-border)] bg-black/15 p-4">
                          <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">命令格式</div>
                          <code className="block whitespace-pre-wrap break-all text-sm leading-6 text-[var(--text-primary)]">
                            {entry.syntax}
                          </code>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/60 p-4">
                            <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">具体作用</div>
                            <p className="text-sm leading-6 text-[var(--text-primary)]">{entry.purpose}</p>
                          </div>

                          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/60 p-4">
                            <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">示例命令</div>
                            {entry.example ? (
                              <code className="block whitespace-pre-wrap break-all text-sm leading-6 text-[var(--text-primary)]">
                                {entry.example}
                              </code>
                            ) : (
                              <p className="text-sm leading-6 text-[var(--text-secondary)]">这是一个快捷键动作，没有对应的 shell 命令。</p>
                            )}
                          </div>
                        </div>

                        {entry.note && (
                          <div className="mt-4 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/8 px-4 py-3 text-sm leading-6 text-[var(--text-primary)]">
                            {entry.note}
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          {entry.tags.map(tag => (
                            <span
                              key={`${entry.id}-${tag}`}
                              className="rounded-full bg-black/20 px-2.5 py-1 text-[11px] text-[var(--text-secondary)] ring-1 ring-white/6"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        {actionCommand && (
                          <div className="mt-5 flex flex-wrap gap-2">
                            <button
                              onClick={() => onInsertCommand(actionCommand)}
                              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-[var(--text-primary)] transition-all hover:border-white/18 hover:bg-white/[0.08]"
                            >
                              <TerminalSquare size={14} />
                              插入输入框
                            </button>

                            {!entry.dangerous && (
                              <button
                                onClick={() => onRunCommand(actionCommand)}
                                className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-500/12 px-4 py-2 text-sm text-sky-100 transition-all hover:bg-sky-500/18"
                              >
                                <Play size={14} />
                                直接执行
                              </button>
                            )}

                            <button
                              onClick={() => copyToClipboard(entry.id, actionCommand)}
                              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-[var(--text-primary)] transition-all hover:border-white/18 hover:bg-white/[0.08]"
                            >
                              <Clipboard size={14} />
                              {copiedId === entry.id ? '已复制' : '复制示例'}
                            </button>

                            <button
                              onClick={() => onPinTool({ name: entry.pinLabel || entry.title, cmd: actionCommand })}
                              disabled={isPinned}
                              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all ${
                                isPinned
                                  ? 'cursor-not-allowed border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
                                  : 'border-white/10 bg-white/[0.05] text-[var(--text-primary)] hover:border-white/18 hover:bg-white/[0.08]'
                              }`}
                            >
                              <Pin size={14} />
                              {isPinned ? '已加入快捷工具栏' : '加入快捷工具栏'}
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
