import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  Clipboard,
  FolderKanban,
  Layers3,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react'
import {
  type AgentMigrationScan,
  type AgentMigrationSource,
  type AgentMigrationWorkspace,
} from '../types/agent-extension'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    require?: any
  }
}

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null
const electron = window.require ? window.require('electron') : null

type SourceSelection = 'all' | AgentMigrationSource['id']

const SOURCE_ORDER: AgentMigrationSource['id'][] = ['claude', 'codex', 'openclaw']

const copyText = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    electron?.clipboard?.writeText(value)
  }
}

const formatWorkspace = (workspace: AgentMigrationWorkspace) => {
  return workspace.trustLevel
    ? `${workspace.path} (${workspace.trustLevel})`
    : workspace.path
}

const buildInventoryMarkdown = (sources: AgentMigrationSource[]) => {
  return sources.map(source => {
    const workspaceText = source.workspaces.length
      ? source.workspaces.map(workspace => `- ${formatWorkspace(workspace)}`).join('\n')
      : '- 未检测到工作空间'

    const skillsText = source.skills.length
      ? source.skills.map(skill => `- ${skill}`).join('\n')
      : '- 未检测到可迁移 skills'

    const pluginsText = source.plugins.length
      ? source.plugins.map(plugin => `- ${plugin}`).join('\n')
      : '- 未检测到插件 / 扩展'

    const mcpText = source.mcpServers.length
      ? source.mcpServers.map(item => `- ${item}`).join('\n')
      : '- 未检测到 MCP / 工具桥接'

    const habitText = source.habitSignals.length
      ? source.habitSignals.map(item => `- ${item.label}：${item.detail}`).join('\n')
      : '- 暂无明确习惯特征'

    const memoryText = source.memorySignals.length
      ? source.memorySignals.map(item => `- ${item.label}：${item.detail}`).join('\n')
      : '- 未发现可归档记忆痕迹'

    return `## ${source.label}
- 根目录：${source.rootPath}
- 已配置认证：${source.apiConfigured ? '是（已脱敏）' : '否 / 未检测到'}
- 模型：${source.model || '未检测到'}
- 推理强度：${source.reasoningEffort || '未检测到'}

### 工作空间
${workspaceText}

### Skills
${skillsText}

### 插件 / 扩展
${pluginsText}

### MCP / 工具桥接
${mcpText}

### 使用习惯
${habitText}

### 记忆与沉淀痕迹
${memoryText}`
  }).join('\n\n')
}

const buildMigrationPrompt = (sources: AgentMigrationSource[]) => {
  const inventory = buildInventoryMarkdown(sources)
  return `你现在要接管一个已经长期使用多种 AI Agent 的开发工作流。请把下面这份“迁移档案”视为用户长期积累下来的记忆、偏好、skills、MCP、工作空间和操作习惯，并在当前平台完成最大程度的等价迁移。

你的目标：
1. 识别哪些配置可以直接沿用，哪些需要在当前平台寻找等价替代。
2. 尽量保留用户的工作方式、命令偏好、目录信任策略、skills / 插件生态和常用项目上下文。
3. 不要要求用户重复提供已经在档案中存在的信息。
4. 对敏感信息保持脱敏处理；如果真的缺少密钥，只提醒需要补充，不要猜测或生成伪值。
5. 如果某些 features 在当前平台不存在，请转换为最接近的 prompt、workflow、tool policy 或 setup 建议。

请按下面格式输出：
1. 迁移摘要：你理解到的用户习惯、偏好和工具生态。
2. 等价映射：原 Agent 能力 -> 当前平台的替代方案。
3. 缺失项清单：还需要用户补什么。
4. 初始化步骤：建议执行的配置动作、插件/skill/MCP 接入、工作区恢复顺序。
5. 长期沉淀建议：如何继续把这些记忆、skills、MCP 和项目经验沉淀成可迁移资产。

以下是本机提取到的迁移档案：

${inventory}`
}

export function AgentMigrationPanel() {
  const [scan, setScan] = useState<AgentMigrationScan | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedSourceId, setSelectedSourceId] = useState<SourceSelection>('all')
  const [copied, setCopied] = useState<'prompt' | 'json' | null>(null)

  const loadScan = async () => {
    if (!ipcRenderer) return
    setLoading(true)
    try {
      const result = await ipcRenderer.invoke('agent:migration-scan')
      setScan(result || null)
    } catch (error) {
      console.error('Failed to scan local agent migration data:', error)
      setScan(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadScan()
  }, [])

  const orderedSources = scan?.sources
    ? [...scan.sources].sort((a, b) => SOURCE_ORDER.indexOf(a.id) - SOURCE_ORDER.indexOf(b.id))
    : []

  const selectedSources = selectedSourceId === 'all'
    ? orderedSources.filter(source => source.detected)
    : orderedSources.filter(source => source.id === selectedSourceId)

  const selectedSource = selectedSourceId === 'all'
    ? null
    : orderedSources.find(source => source.id === selectedSourceId) || null

  const migrationPrompt = selectedSources.length > 0
    ? buildMigrationPrompt(selectedSources)
    : '当前没有检测到可迁移的本地 Agent 配置。'

  const exportJson = JSON.stringify({
    scannedAt: scan?.scannedAt || null,
    sources: selectedSources,
  }, null, 2)

  const totalDetected = orderedSources.filter(source => source.detected).length
  const totalSkills = orderedSources.reduce((sum, source) => sum + source.skillsCount, 0)
  const totalProjects = orderedSources.reduce((sum, source) => sum + source.workspaces.length, 0)
  const totalIntegrations = orderedSources.reduce((sum, source) => sum + source.pluginsCount + source.mcpCount, 0)

  const handleCopy = async (kind: 'prompt' | 'json', value: string) => {
    await copyText(value)
    setCopied(kind)
    window.setTimeout(() => setCopied(null), 1600)
  }

  return (
    <div className="flex h-full">
      <div className="w-[18.5rem] shrink-0 border-r border-white/10 bg-black/20">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/35">Agent Migration</div>
              <h3 className="mt-2 text-base font-semibold text-white">迁移中心</h3>
              <p className="mt-2 text-xs leading-5 text-white/45">
                提取本机 Agent 的记忆痕迹、skills、工作区、插件和 MCP 线索，并生成可复制的迁移 Prompt。
              </p>
            </div>
            <div className="mt-0.5 rounded-2xl bg-amber-500/10 p-2 text-amber-300">
              <Workflow size={18} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">检测到</div>
              <div className="mt-2 text-lg font-semibold text-white">{totalDetected}</div>
              <div className="text-[11px] text-white/40">个本地 Agent</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">沉淀资产</div>
              <div className="mt-2 text-lg font-semibold text-white">{totalSkills + totalProjects}</div>
              <div className="text-[11px] text-white/40">skills + 项目</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <button
            onClick={() => setSelectedSourceId('all')}
            className={`mb-2 w-full rounded-2xl border px-3 py-3 text-left transition-colors ${
              selectedSourceId === 'all'
                ? 'border-amber-400/40 bg-amber-400/10 text-white'
                : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">统一迁移档案</div>
                <div className="mt-1 text-[11px] leading-5 text-white/45">
                  合并已检测到的本地 Agent，生成统一迁移 Prompt。
                </div>
              </div>
              <Layers3 size={16} className="shrink-0 text-amber-300" />
            </div>
          </button>

          <div className="space-y-2">
            {orderedSources.map(source => (
              <button
                key={source.id}
                onClick={() => setSelectedSourceId(source.id)}
                className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${
                  selectedSourceId === source.id
                    ? 'border-amber-400/40 bg-amber-400/10 text-white'
                    : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{source.label}</span>
                      {source.detected ? (
                        <CheckCircle2 size={13} className="text-emerald-300" />
                      ) : (
                        <AlertCircle size={13} className="text-white/25" />
                      )}
                    </div>
                    <div className="mt-1 text-[11px] leading-5 text-white/45">
                      {source.detected
                        ? `${source.skillsCount} skills · ${source.workspaces.length} 项目 · ${source.pluginsCount + source.mcpCount} 集成`
                        : '当前机器未检测到本地配置'}
                    </div>
                    {source.model && (
                      <div className="mt-2 text-[11px] text-amber-200/85">{source.model}</div>
                    )}
                  </div>
                  <div className={`rounded-full px-2 py-1 text-[10px] ${
                    source.apiConfigured ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-white/35'
                  }`}>
                    {source.apiConfigured ? '已认证' : '未认证'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 p-3">
          <button
            onClick={loadScan}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400/15 px-3 py-2 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-400/25 disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? '扫描中...' : '重新扫描本机 Agent'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/35">
                <ShieldCheck size={12} />
                检测到
              </div>
              <div className="mt-3 text-2xl font-semibold text-white">{totalDetected}</div>
              <div className="mt-1 text-xs text-white/40">个 Agent</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/35">
                <Sparkles size={12} />
                Skills
              </div>
              <div className="mt-3 text-2xl font-semibold text-white">{totalSkills}</div>
              <div className="mt-1 text-xs text-white/40">可迁移技能</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/35">
                <FolderKanban size={12} />
                工作区
              </div>
              <div className="mt-3 text-2xl font-semibold text-white">{totalProjects}</div>
              <div className="mt-1 text-xs text-white/40">项目上下文</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/35">
                <Brain size={12} />
                集成
              </div>
              <div className="mt-3 text-2xl font-semibold text-white">{totalIntegrations}</div>
              <div className="mt-1 text-xs text-white/40">插件 + MCP</div>
            </div>
          </div>

          {selectedSource ? (
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold text-white">{selectedSource.label}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] ${
                      selectedSource.detected ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-white/35'
                    }`}>
                      {selectedSource.detected ? '已检测' : '未检测到'}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-white/45">{selectedSource.rootPath}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedSource.model && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                      {selectedSource.model}
                    </span>
                  )}
                  {selectedSource.reasoningEffort && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                      reasoning: {selectedSource.reasoningEffort}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-black/15 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">可迁移摘要</div>
                  <div className="mt-3 space-y-2 text-sm text-white/75">
                    <div>认证状态：{selectedSource.apiConfigured ? '已配置（已脱敏）' : '未检测到'}</div>
                    <div>配置文件：{selectedSource.configFiles.length > 0 ? selectedSource.configFiles.join('、') : '未检测到'}</div>
                    <div>Skills：{selectedSource.skillsCount}</div>
                    <div>插件 / 扩展：{selectedSource.pluginsCount}</div>
                    <div>MCP / 工具桥接：{selectedSource.mcpCount}</div>
                    <div>工作区：{selectedSource.workspaces.length}</div>
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/15 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">习惯与记忆</div>
                  <div className="mt-3 space-y-2 text-sm text-white/75">
                    {selectedSource.habitSignals.length === 0 && selectedSource.memorySignals.length === 0 && (
                      <div className="text-white/45">当前没有检测到明显的使用痕迹。</div>
                    )}
                    {selectedSource.habitSignals.slice(0, 3).map(signal => (
                      <div key={signal.label}>- {signal.label}：{signal.detail}</div>
                    ))}
                    {selectedSource.memorySignals.slice(0, 3).map(signal => (
                      <div key={signal.label}>- {signal.label}：{signal.detail}</div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-black/15 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">工作空间</div>
                  <div className="mt-3 space-y-2 text-sm text-white/70">
                    {selectedSource.workspaces.length === 0 && <div className="text-white/45">未检测到工作区。</div>}
                    {selectedSource.workspaces.slice(0, 8).map(workspace => (
                      <div key={workspace.path} className="rounded-2xl bg-white/5 px-3 py-2">
                        <div className="font-medium text-white">{workspace.label}</div>
                        <div className="mt-1 break-all text-[11px] text-white/40">{workspace.path}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/15 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">Skills / 插件</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedSource.skills.slice(0, 18).map(skill => (
                      <span key={skill} className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-200">
                        {skill}
                      </span>
                    ))}
                    {selectedSource.plugins.slice(0, 12).map(plugin => (
                      <span key={plugin} className="rounded-full bg-purple-500/10 px-2.5 py-1 text-[11px] text-purple-200">
                        {plugin}
                      </span>
                    ))}
                    {selectedSource.skills.length === 0 && selectedSource.plugins.length === 0 && (
                      <div className="text-sm text-white/45">未检测到 skills / 插件。</div>
                    )}
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/15 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">MCP / 线索</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedSource.mcpServers.slice(0, 12).map(item => (
                      <span key={item} className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200">
                        {item}
                      </span>
                    ))}
                    {selectedSource.notes.slice(0, 6).map(note => (
                      <div key={note} className="w-full rounded-2xl bg-white/5 px-3 py-2 text-sm text-white/60">
                        {note}
                      </div>
                    ))}
                    {selectedSource.mcpServers.length === 0 && selectedSource.notes.length === 0 && (
                      <div className="text-sm text-white/45">未检测到额外线索。</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-white">统一迁移档案</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">
                    这里会把本机已检测到的 Claude Code、Codex、OpenClaw 信息统一整理成一份“跨 Agent 迁移提示词”。
                    你可以把这份 Prompt 发给任意新的 AI Agent，让它更快复现你原有的个人工作流。
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {orderedSources.map(source => (
                  <div key={source.id} className="rounded-3xl border border-white/10 bg-black/15 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-white">{source.label}</div>
                      <span className={`rounded-full px-2 py-1 text-[10px] ${
                        source.detected ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-white/35'
                      }`}>
                        {source.detected ? '已检测' : '未检测到'}
                      </span>
                    </div>
                    <div className="mt-3 text-sm text-white/65">
                      {source.detected
                        ? `${source.skillsCount} skills · ${source.workspaces.length} 项目 · ${source.pluginsCount + source.mcpCount} 集成`
                        : '该 Agent 当前没有可读取的本地配置。'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-white/35">Migration Prompt</div>
                <h3 className="mt-2 text-lg font-semibold text-white">可直接复制给新 Agent 的迁移提示词</h3>
              </div>
              <button
                onClick={() => handleCopy('prompt', migrationPrompt)}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-500/15 px-3 py-2 text-xs font-medium text-blue-200 transition-colors hover:bg-blue-500/25"
              >
                <Clipboard size={14} />
                {copied === 'prompt' ? '已复制' : '复制 Prompt'}
              </button>
            </div>
            <pre className="mt-4 max-h-[360px] overflow-auto rounded-3xl border border-white/10 bg-black/20 p-4 text-[12px] leading-6 text-white/80 whitespace-pre-wrap">
              {migrationPrompt}
            </pre>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-white/35">Structured Export</div>
                <h3 className="mt-2 text-lg font-semibold text-white">结构化 JSON 导出</h3>
              </div>
              <button
                onClick={() => handleCopy('json', exportJson)}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-500/25"
              >
                <Clipboard size={14} />
                {copied === 'json' ? '已复制' : '复制 JSON'}
              </button>
            </div>
            <pre className="mt-4 max-h-[320px] overflow-auto rounded-3xl border border-white/10 bg-black/20 p-4 text-[12px] leading-6 text-white/75">
              {exportJson}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
