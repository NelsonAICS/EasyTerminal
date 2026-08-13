import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Send, X, Save, Sparkles, TerminalSquare, Plus, Settings2, Command, HelpCircle, Download, Eye, Edit3, Globe, PanelRightClose, PanelRightOpen, MousePointer2, ZoomIn, ZoomOut, Archive, Server, FileText, Box, Workflow, Layout, Cpu, BookOpen, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import 'github-markdown-css/github-markdown.css'
import TerminalView from './TerminalView'
import { PromptPanel } from './components/PromptPanel'
import { SkillPanel } from './components/SkillPanel'
import { KnowledgePanel } from './components/KnowledgePanel'
import { FileExplorerPanel } from './components/FileExplorerPanel'
import { UIShowcasePanel } from './components/UIShowcasePanel'
import { BrowserPanel } from './components/BrowserPanel'
import { UIIntentRenderer } from './components/UIIntentRenderer'
import { UIButton, UIInput, UIModal } from './components/ui'
import { searchManualCommandSuggestions } from './data/commandManual'
import { TERMINAL_AGENT_COPY } from './lib/ui-copy'
import { getThemePreset, THEME_PRESETS } from './lib/themes'
import { type FileEntry, type UIIntent } from './types/agent-extension'
import type { QuickTool } from './components/CommandManualModal'

// Lazy-load heavy panel components for faster initial render
const ApiManager = React.lazy(() => import('./components/ApiManager').then(m => ({ default: m.ApiManager })))
const ContextVaultPanel = React.lazy(() => import('./components/ContextVaultPanel').then(m => ({ default: m.ContextVaultPanel })))
const WorkflowPanel = React.lazy(() => import('./components/WorkflowPanel').then(m => ({ default: m.WorkflowPanel })))
const AgentMigrationPanel = React.lazy(() => import('./components/AgentMigrationPanel').then(m => ({ default: m.AgentMigrationPanel })))
const CommandManualModal = React.lazy(() => import('./components/CommandManualModal').then(m => ({ default: m.CommandManualModal })))
const CapabilityPanel = React.lazy(() => import('./components/CapabilityPanel').then(m => ({ default: m.CapabilityPanel })))

// Fallback spinner for lazy-loaded components
const PanelLoader = () => (
  <div className="w-full h-full flex items-center justify-center">
    <Loader2 size={24} className="text-[var(--accent)] animate-spin" />
  </div>
)

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    require?: any;
    electronAPI?: {
      storeGet: (key: string, defaultValue?: unknown) => Promise<unknown>
      storeSet: (key: string, value: unknown) => Promise<boolean>
      storeDelete: (key: string) => Promise<boolean>
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webview: any;
    }
  }
}

const electron = window.require ? window.require('electron') : null
const ipcRenderer = electron?.ipcRenderer
const webUtils = electron?.webUtils

interface Session {
  id: string
  name: string
  agentId: string
}

interface InputSuggestion {
  id: string
  label: string
  value: string
  hint: string
  kind: 'manual' | 'command' | 'path' | 'history' | 'file'
  replaceMode: 'all' | 'last-token'
}

interface PendingImagePreview {
  src: string
  base64: string
  name: string
  mime: string
  byteSize: number
  id: string
  width?: number
  height?: number
}

interface TerminalAgentCommandSuggestion {
  command: string
  summary: string
}

interface RecentTerminalAgentCommand {
  id: string
  command: string
  summary: string
  usedAt: string
}

const DEFAULT_TOOLS: QuickTool[] = [
  { name: 'claude', cmd: 'claude' },
  { name: 'openclaw', cmd: 'openclaw' },
  { name: 'codex', cmd: 'codex' },
  { name: 'ls -la', cmd: 'ls -la' },
  { name: 'pwd', cmd: 'pwd' },
  { name: 'clear', cmd: 'clear' },
  { name: 'git status', cmd: 'git status' },
]

const TERMINAL_AGENT_HELP = `${TERMINAL_AGENT_COPY.helpTitle}

/agent <task>
  让内建 Agent 自主决定如何调用 prompt、skill、workflow、context 和 knowledge 能力。

/skill <query>
/skill get <skillId>
  搜索已收录的 Skill，或根据 id 查看某个 Skill。

/prompt <query>
/prompt search <query>
/prompt optimize <draft>
/prompt render <promptId> {"var":"value"}
  搜索已保存的 Prompt，优化 Prompt 草稿，或渲染 Prompt 模板。

/workflow <query>
/workflow search <query>
/workflow get <workflowId>
/workflow run <workflowId> {"input":"value"}
  搜索 Workflow、查看 Workflow 定义，或用 JSON 变量执行 Workflow。

/context list
/context records [query]
/context snapshots
/context events
/context capture <text>
  浏览上下文资产、查看结构化记录与快照、查看当前会话事件，或把内容写入 Context Vault。

/help agent
  打开应用内命令手册，并自动定位到终端 Agent 教程。`

const TERMINAL_AGENT_COMMANDS: TerminalAgentCommandSuggestion[] = [
  { command: '/agent ', summary: '让内建 Agent 自主调用 prompt / skill / workflow / context 能力' },
  { command: '/skill ', summary: '搜索 Skill' },
  { command: '/skill get ', summary: '根据 id 查看一个 Skill' },
  { command: '/prompt ', summary: '搜索 Prompt' },
  { command: '/prompt optimize ', summary: '优化 Prompt 草稿' },
  { command: '/prompt render ', summary: '渲染 Prompt 模板，后接 promptId 和 JSON 变量' },
  { command: '/workflow ', summary: '搜索 Workflow' },
  { command: '/workflow get ', summary: '查看 Workflow 定义' },
  { command: '/workflow run ', summary: '执行 Workflow，后接 workflowId 和 JSON 变量' },
  { command: '/context list', summary: '查看 Context Vault 资产' },
  { command: '/context records ', summary: '查看结构化记录，可追加查询词' },
  { command: '/context snapshots', summary: '查看上下文快照' },
  { command: '/context events', summary: '查看当前终端会话事件' },
  { command: '/context capture ', summary: '把内容写入 Context Vault' },
  { command: '/help agent', summary: '打开终端 Agent 教程' },
  { command: '/et help', summary: '打开 EasyTerminal 命令手册' },
]

function truncateTerminalOutput(value: string, maxLength = 12000) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength)}\n... [内容已截断]`
}

function clampInlineText(value: string, maxLength = 120) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1)}…`
}

function safeParseJsonObject(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return {}
  return JSON.parse(trimmed) as Record<string, unknown>
}

function formatTerminalValue(value: unknown) {
  if (value === null || value === undefined) return TERMINAL_AGENT_COPY.emptyValue
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    const lines = value.slice(0, 8).map((item, index) => {
      if (item && typeof item === 'object') {
        const entry = item as Record<string, unknown>
        const title = String(entry.title || entry.name || entry.id || `item_${index + 1}`)
        const detail = clampInlineText(String(entry.summary || entry.description || entry.kind || '').trim(), 140)
        return `${index + 1}. ${title}${detail ? `\n   ${detail}` : ''}`
      }
      return `${index + 1}. ${clampInlineText(String(item), 140)}`
    })
    if (value.length > 8) lines.push(`... ${value.length - 8} more item(s)`)
    return truncateTerminalOutput(lines.join('\n'))
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (Array.isArray(record.sessions) || Array.isArray(record.snippets) || Array.isArray(record.projects)) {
      const sections = [
        `会话数：${Array.isArray(record.sessions) ? record.sessions.length : 0}`,
        `片段数：${Array.isArray(record.snippets) ? record.snippets.length : 0}`,
        `项目数：${Array.isArray(record.projects) ? record.projects.length : 0}`,
      ]
      return truncateTerminalOutput(sections.join('\n'))
    }
    const preferredEntries = ['title', 'summary', 'description', 'id', 'status', 'kind']
      .map(key => [key, record[key]] as const)
      .filter(([, fieldValue]) => typeof fieldValue === 'string' && String(fieldValue).trim())
      .slice(0, 4)

    if (preferredEntries.length > 0) {
      return truncateTerminalOutput(
        preferredEntries
          .map(([key, fieldValue]) => `${key}: ${clampInlineText(String(fieldValue), 180)}`)
          .join('\n')
      )
    }
  }
  if (typeof value === 'string') return truncateTerminalOutput(value)
  try {
    return truncateTerminalOutput(JSON.stringify(value, null, 2))
  } catch {
    return String(value)
  }
}

function formatCapabilityTerminalResult(label: string, result: { success?: boolean; error?: string; data?: unknown }) {
  if (!result?.success) {
    return {
      tone: 'error' as const,
      body: `${TERMINAL_AGENT_COPY.capabilityFailed(label)}\n${result?.error || TERMINAL_AGENT_COPY.unknownError}`,
    }
  }

  return {
    tone: 'success' as const,
    body: `${TERMINAL_AGENT_COPY.capabilityCompleted(label)}\n\n${formatTerminalValue(result.data)}`,
  }
}

function formatAgentTerminalResult(result: {
  answer?: string;
  steps?: Array<{ type: string; tool?: string }>;
  iterations?: number;
  availableTools?: string[];
}) {
  const usedTools = Array.from(new Set(
    (result.steps || [])
      .filter(step => step.type === 'action' && step.tool)
      .map(step => step.tool as string)
  ))

  const parts = [
    result.answer?.trim() || TERMINAL_AGENT_COPY.noAnswer,
    usedTools.length ? `已用能力：${usedTools.join(', ')}` : '',
    typeof result.iterations === 'number' ? `迭代次数：${result.iterations}` : '',
  ].filter(Boolean)

  return truncateTerminalOutput(parts.join('\n\n'))
}

function App() {
  const mainAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const webviewRef = useRef<any>(null)
  const panelDragRef = useRef<{ type: 'workspace' | 'explorer'; pointerId: number } | null>(null)
  const terminalAgentCommandRunnerRef = useRef<((command: string) => Promise<void>) | null>(null)
  const autocompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [theme, setTheme] = useState('obsidian')
  const [fontSize, setFontSize] = useState(14)
  const [showSettings, setShowSettings] = useState(false)
  const [autoCaptureTerminal, setAutoCaptureTerminal] = useState(false)
  const [autoAnalyzeContext, setAutoAnalyzeContext] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [manualInitialSearch, setManualInitialSearch] = useState('')
  const [showApiManager, setShowApiManager] = useState(false)

  const [quickTools, setQuickTools] = useState(DEFAULT_TOOLS)
  const [quickToolsLoaded, setQuickToolsLoaded] = useState(() => !ipcRenderer)
  const [newToolName, setNewToolName] = useState('')
  const [newToolCmd, setNewToolCmd] = useState('')
  const [isEditingTools, setIsEditingTools] = useState(false)

  const [sessions, setSessions] = useState<Session[]>([
    { id: 'tab_1', name: 'Main', agentId: 'agent_1' }
  ])
  const [activeSessionId, setActiveSessionId] = useState('tab_1')
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingSessionName, setEditingSessionName] = useState('')

  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<InputSuggestion[]>([])
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
  const [isInputComposing, setIsInputComposing] = useState(false)
  const [pendingImages, setPendingImages] = useState<PendingImagePreview[]>([])
  const [recentTerminalAgentCommands, setRecentTerminalAgentCommands] = useState<RecentTerminalAgentCommand[]>([])

  const [editorFile, setEditorFile] = useState<string | null>(null)
  const [editorContent, setEditorContent] = useState<string>('')
  const [previewMode, setPreviewMode] = useState<boolean>(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<{file: string, src: string} | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [agentPanel, setAgentPanel] = useState<'context' | 'prompts' | 'skills' | 'knowledge' | 'migration' | 'ui' | 'capabilities' | 'browser' | null>(null)
  const [uiIntent, setUiIntent] = useState<UIIntent | null>(null)
  const [streamingIntentId, setStreamingIntentId] = useState<string | null>(null)
  const [showWorkflowStudio, setShowWorkflowStudio] = useState(false)
  const [workspaceWidth, setWorkspaceWidth] = useState(760)
  const [explorerWidth, setExplorerWidth] = useState(460)
  const [showExplorer, setShowExplorer] = useState(true)
  const [inputUrl, setInputUrl] = useState<string>('')
  const [isPickerActive, setIsPickerActive] = useState<boolean>(false)
  const [webviewPreloadPath, setWebviewPreloadPath] = useState<string>('')
  const [webviewZoom, setWebviewZoom] = useState<number>(1)
  const [analytics, setAnalytics] = useState<{cost?: number, tokens?: number}>({cost: 0, tokens: 0})
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const workspaceWidthRef = useRef(workspaceWidth)
  const explorerWidthRef = useRef(explorerWidth)

  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.invoke('get-webview-preload-path').then((p: string) => {
        setWebviewPreloadPath(`file://${p}`);
      });
    }
  }, []);

  useEffect(() => {
    workspaceWidthRef.current = workspaceWidth
  }, [workspaceWidth])

  useEffect(() => {
    explorerWidthRef.current = explorerWidth
  }, [explorerWidth])

  useEffect(() => {
    if (!ipcRenderer) return

    Promise.all([
      ipcRenderer.invoke('store:get', 'ui_theme', 'obsidian'),
      ipcRenderer.invoke('store:get', 'ui_font_size', 14),
    ]).then(([storedTheme, storedFontSize]: [string, number]) => {
      if (typeof storedTheme === 'string') setTheme(storedTheme)
      if (typeof storedFontSize === 'number') setFontSize(storedFontSize)
    })
  }, [])

  useEffect(() => {
    if (!ipcRenderer) return
    ipcRenderer.invoke('store:set', 'ui_theme', theme).catch(() => undefined)
  }, [theme])

  useEffect(() => {
    if (!ipcRenderer) return

    ipcRenderer.invoke('ui:intent:get-current').then((intent: UIIntent | null) => {
      setUiIntent(intent || null)
    }).catch(() => undefined)

    const handleIntentUpdated = (_event: unknown, nextIntent: UIIntent | null) => {
      setUiIntent(nextIntent || null)
    }

    ipcRenderer.on('ui:intent:updated', handleIntentUpdated)
    return () => {
      ipcRenderer.removeListener('ui:intent:updated', handleIntentUpdated)
    }
  }, [])

  useEffect(() => {
    if (!ipcRenderer) return
    ipcRenderer.invoke('store:set', 'ui_font_size', fontSize).catch(() => undefined)
  }, [fontSize])

  useEffect(() => {
    if (!ipcRenderer) return
    ipcRenderer.invoke('store:get', 'context:autoCaptureTerminal', false).then((val: unknown) => {
      if (typeof val === 'boolean') setAutoCaptureTerminal(val)
    }).catch(() => undefined)
    ipcRenderer.invoke('store:get', 'context:autoAnalyzeContext', false).then((val: unknown) => {
      if (typeof val === 'boolean') setAutoAnalyzeContext(val)
    }).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!ipcRenderer) return
    ipcRenderer.invoke('store:set', 'context:autoCaptureTerminal', autoCaptureTerminal).catch(() => undefined)
  }, [autoCaptureTerminal])

  useEffect(() => {
    if (!ipcRenderer) return
    ipcRenderer.invoke('store:set', 'context:autoAnalyzeContext', autoAnalyzeContext).catch(() => undefined)
  }, [autoAnalyzeContext])

  useEffect(() => {
    if (!ipcRenderer) return

    ipcRenderer
      .invoke('store:get', 'quick_tools', DEFAULT_TOOLS)
      .then((storedTools: unknown) => {
        if (Array.isArray(storedTools)) {
          const normalized = storedTools.filter((tool): tool is QuickTool => {
            return !!tool &&
              typeof tool === 'object' &&
              typeof (tool as QuickTool).name === 'string' &&
              typeof (tool as QuickTool).cmd === 'string'
          })

          if (normalized.length > 0) {
            setQuickTools(normalized)
          }
        }
      })
      .finally(() => {
        setQuickToolsLoaded(true)
      })
  }, [])

  useEffect(() => {
    if (!ipcRenderer || !quickToolsLoaded) return
    ipcRenderer.invoke('store:set', 'quick_tools', quickTools).catch(() => undefined)
  }, [quickTools, quickToolsLoaded])

  useEffect(() => {
    if (!ipcRenderer) return
    ipcRenderer
      .invoke('store:get', 'terminal_agent_recent_commands', [])
      .then((storedCommands: unknown) => {
        if (!Array.isArray(storedCommands)) return
        const normalized = storedCommands.filter((item): item is RecentTerminalAgentCommand => {
          return !!item &&
            typeof item === 'object' &&
            typeof (item as RecentTerminalAgentCommand).id === 'string' &&
            typeof (item as RecentTerminalAgentCommand).command === 'string' &&
            typeof (item as RecentTerminalAgentCommand).summary === 'string' &&
            typeof (item as RecentTerminalAgentCommand).usedAt === 'string'
        })
        setRecentTerminalAgentCommands(normalized.slice(0, 8))
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!ipcRenderer) return
    ipcRenderer.invoke('store:set', 'terminal_agent_recent_commands', recentTerminalAgentCommands).catch(() => undefined)
  }, [recentTerminalAgentCommands])

  // Handle window resizing based on preview state
  useEffect(() => {
    if (!ipcRenderer) return;
    const hasPreview = !!previewUrl;
    // 1600px when preview open, 1000px when closed. Use current height to avoid jumping.
    ipcRenderer.send('window:resize', hasPreview ? 1600 : 1000);
  }, [previewUrl]);

  const [currentDir, setCurrentDir] = useState<string>('')
  const [dirFiles, setDirFiles] = useState<FileEntry[]>([])
  const [selectedPaths, setSelectedPaths] = useState<string[]>([])
  
  const loadFiles = (dir: string) => {
    if (ipcRenderer) {
      ipcRenderer.invoke('fs:list', dir).then((files: FileEntry[]) => {
        setDirFiles(files || [])
        setSelectedPaths([])
      })
    }
  }

  const [activeFile, setActiveFile] = useState<string | null>(null)
  
  const [showNewFileModal, setShowNewFileModal] = useState(false)
  const [newFileName, setNewFileName] = useState('')

  const focusInputBox = () => {
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
    })
  }

  const showWorkspace = !!previewUrl

  const closeFloatingPages = useCallback(() => {
    setAgentPanel(null)
    setShowWorkflowStudio(false)
    setEditorFile(null)
    setPreviewImage(null)
  }, [])

  const closeUiIntent = useCallback(() => {
    setUiIntent(null)
    ipcRenderer?.invoke('ui:intent:clear').catch(() => undefined)
  }, [])

  const handleUiIntentAction = useCallback((actionId: string) => {
    const actionData = (uiIntent?.payload?.actionData || {}) as Record<string, unknown>

    if (actionId === 'insert-input' && typeof actionData.resultText === 'string') {
      const resultText = actionData.resultText
      setInput(prev => prev.trim() ? `${prev}\n\n${resultText}` : resultText)
      focusInputBox()
    } else if (actionId === 'save-result-context' && typeof actionData.resultText === 'string') {
      ipcRenderer?.invoke('context:save-snippet', actionData.resultText, 'TerminalAgentResult').catch(() => undefined)
    } else if (actionId === 'run-workflow' && typeof actionData.workflowCommand === 'string') {
      void terminalAgentCommandRunnerRef.current?.(actionData.workflowCommand)
    }

    ipcRenderer?.invoke('ui:intent:action', actionId, uiIntent).catch(() => undefined)
  }, [uiIntent])

  const openEditorPath = useCallback((path: string) => {
    closeFloatingPages()
    setEditorFile(path)
    setActiveFile(path)
    setPreviewMode(path.toLowerCase().endsWith('.md'))
    ipcRenderer?.invoke('file:read', path).then((content: string) => {
      setEditorContent(content)
    }).catch(() => {
      setEditorContent('')
    })
  }, [closeFloatingPages])

  const openImageAsset = useCallback((path: string, src: string, label?: string) => {
    closeFloatingPages()
    setPreviewImage({ file: label || path, src })
    setActiveFile(path)
  }, [closeFloatingPages])

  const clampPanels = useCallback((nextWorkspace: number, nextExplorer: number) => {
    const mainArea = mainAreaRef.current
    if (!mainArea) {
      return { workspace: nextWorkspace, explorer: showExplorer ? nextExplorer : 0 }
    }

    const totalWidth = mainArea.getBoundingClientRect().width
    const minTerminal = 420
    const minWorkspace = 560
    const minExplorer = 320
    const splitterWidth = (showWorkspace ? 12 : 0) + (showExplorer ? 12 : 0)
    const reserved = splitterWidth
    const maxPanelsWidth = totalWidth - minTerminal - reserved

    if (!showExplorer) {
      if (!showWorkspace) {
        return { workspace: nextWorkspace, explorer: nextExplorer }
      }
      const maxWorkspace = Math.max(minWorkspace, maxPanelsWidth)
      const workspace = Math.max(minWorkspace, Math.min(maxWorkspace, nextWorkspace))
      return { workspace, explorer: nextExplorer }
    }

    const maxExplorer = showWorkspace
      ? Math.min(620, Math.max(minExplorer, maxPanelsWidth - minWorkspace))
      : Math.min(620, Math.max(minExplorer, totalWidth - minTerminal - reserved))

    let explorer = Math.max(minExplorer, Math.min(maxExplorer, nextExplorer))
    let workspace = nextWorkspace

    if (showWorkspace) {
      const maxWorkspace = Math.max(minWorkspace, maxPanelsWidth - explorer)
      workspace = Math.max(minWorkspace, Math.min(maxWorkspace, workspace))
      const totalPanels = workspace + explorer

      if (totalPanels > maxPanelsWidth) {
        const overflow = totalPanels - maxPanelsWidth
        const workspaceShrinkable = Math.max(0, workspace - minWorkspace)
        const reduceWorkspace = Math.min(workspaceShrinkable, overflow)
        workspace -= reduceWorkspace
        const remainder = overflow - reduceWorkspace
        if (remainder > 0) {
          explorer = Math.max(minExplorer, explorer - remainder)
        }
      }
    }

    return { workspace, explorer }
  }, [showExplorer, showWorkspace])

  useEffect(() => {
    const applyPanelResize = (clientX: number) => {
      const drag = panelDragRef.current
      const mainArea = mainAreaRef.current
      if (!drag || !mainArea) return

      const rect = mainArea.getBoundingClientRect()
      const styles = window.getComputedStyle(mainArea)
      const paddingRight = parseFloat(styles.paddingRight || '0')
      const innerRight = rect.right - paddingRight

      if (drag.type === 'explorer') {
        if (!showExplorer) return
        const nextExplorer = innerRight - clientX - 6
        const clamped = clampPanels(workspaceWidthRef.current, nextExplorer)
        workspaceWidthRef.current = clamped.workspace
        explorerWidthRef.current = clamped.explorer
        setWorkspaceWidth(clamped.workspace)
        setExplorerWidth(clamped.explorer)
        return
      }

      const nextWorkspace = innerRight - clientX - (showExplorer ? explorerWidthRef.current + 12 : 0) - 6
      const clamped = clampPanels(nextWorkspace, explorerWidthRef.current)
      workspaceWidthRef.current = clamped.workspace
      explorerWidthRef.current = clamped.explorer
      setWorkspaceWidth(clamped.workspace)
      setExplorerWidth(clamped.explorer)
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!panelDragRef.current) return
      applyPanelResize(event.clientX)
    }

    const handlePointerUp = () => {
      panelDragRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [clampPanels, showExplorer])

  useEffect(() => {
    const apply = () => {
      const clamped = clampPanels(workspaceWidthRef.current, explorerWidthRef.current)
      workspaceWidthRef.current = clamped.workspace
      explorerWidthRef.current = clamped.explorer
      setWorkspaceWidth(clamped.workspace)
      setExplorerWidth(clamped.explorer)
    }
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [clampPanels])

  const sendTerminalCommand = (command: string) => {
    if (ipcRenderer) {
      ipcRenderer.send('pty:write', activeSessionId, command + '\r')
    }
  }

  const addQuickTool = (tool: QuickTool) => {
    setQuickTools(prev => {
      if (prev.some(existing => existing.cmd === tool.cmd)) {
        return prev
      }
      return [...prev, tool]
    })
  }

  const insertManualCommand = (command: string) => {
    setInput(prev => prev.trim() ? `${prev}\n${command}` : command)
    updateSuggestions([])
    setShowHelp(false)
    focusInputBox()
  }

  const applySuggestion = (suggestion: InputSuggestion) => {
    if (suggestion.replaceMode === 'last-token') {
      setInput(prev => replaceLastToken(prev, suggestion.value))
    } else {
      setInput(suggestion.value)
    }

    updateSuggestions([])
    focusInputBox()
  }

  const runManualCommand = (command: string) => {
    sendTerminalCommand(command)
    updateSuggestions([])
    setShowHelp(false)
    focusInputBox()
  }

  const openManualCenter = (search = '') => {
    setManualInitialSearch(search.trim())
    setShowHelp(true)
  }

  const writeTerminalSystemMessage = useCallback((title: string, body: string, tone: 'info' | 'success' | 'error' = 'info') => {
    const color =
      tone === 'success'
        ? '\x1b[32m'
        : tone === 'error'
          ? '\x1b[31m'
          : '\x1b[36m'
    const reset = '\x1b[0m'
    const normalizedBody = body.replace(/\r?\n/g, '\r\n')
    const payload = `\r\n${color}[EasyTerminal] ${title}${reset}\r\n${normalizedBody}\r\n`
    window.dispatchEvent(new CustomEvent(`terminal:write:${activeSessionId}`, { detail: payload }))
  }, [activeSessionId])

  const formatWorkflowNodeTitle = useCallback((nodeType?: string, nodeLabel?: string, nodeId?: string) => {
    if (nodeLabel || nodeType) {
      return `${nodeLabel || nodeId || 'Unknown'}${nodeType ? ` (${nodeType})` : ''}`
    }
    return nodeId || 'Unknown'
  }, [])

  const resolveWorkflowLogTone = useCallback((logType: 'info' | 'error' | 'output'): 'success' | 'error' | 'info' => {
    if (logType === 'error') return 'error'
    if (logType === 'output') return 'success'
    return 'info'
  }, [])

  const persistTerminalAgentActivity = useCallback(async (
    commandLine: string,
    resultText: string,
    status: 'success' | 'error',
    commandKind: 'agent' | 'skill' | 'prompt' | 'workflow' | 'context' | 'help'
  ) => {
    if (!ipcRenderer) return

    const trimmedResult = truncateTerminalOutput(resultText, 4000)
    await Promise.all([
      ipcRenderer.invoke('context:session-event', {
        session_id: activeSessionId,
        event_type: 'user_prompt',
        payload: commandLine,
        token_estimate: Math.ceil(commandLine.length / 4),
      }),
      ipcRenderer.invoke('context:session-event', {
        session_id: activeSessionId,
        event_type: 'assistant_reply',
        payload: `${status.toUpperCase()}: ${trimmedResult}`,
        token_estimate: Math.ceil(trimmedResult.length / 4),
      }),
      ipcRenderer.invoke('context:record', {
        scope: 'session',
        kind: status === 'error' ? 'issue' : 'summary',
        title: TERMINAL_AGENT_COPY.activityRecordTitle(commandLine.split(' ')[0]),
        summary: TERMINAL_AGENT_COPY.activitySummary(commandKind, status, commandLine),
        details: trimmedResult,
        salience: status === 'error' ? 0.86 : 0.58,
        status: 'active',
        source_type: 'tool',
        source_ref: activeSessionId,
        evidence_refs: [commandLine.split(' ')[0], commandKind],
      }),
    ]).catch(() => undefined)
  }, [activeSessionId])

  useEffect(() => {
    if (!ipcRenderer) return

    const handleWorkflowStatus = (
      _event: unknown,
      status: { type?: string; nodeId?: string; nodeType?: string; nodeLabel?: string }
    ) => {
      const displayName = formatWorkflowNodeTitle(status?.nodeType, status?.nodeLabel, status?.nodeId)
      const actionLabel = status?.type === 'node_complete' ? '完成' : '开始'
      writeTerminalSystemMessage(`Workflow ${actionLabel}`, displayName, 'info')
    }

    const handleWorkflowLog = (
      _event: unknown,
      log: { nodeId?: string; type?: 'info' | 'error' | 'output'; message?: string }
    ) => {
      if (!log) return
      const line = `[${log.nodeId || 'workflow'}] ${log.message || ''}`.trim()
      const tone = resolveWorkflowLogTone(log.type || 'info')
      writeTerminalSystemMessage('Workflow 日志', line || '收到运行日志', tone)
    }

    ipcRenderer.on('workflow:status', handleWorkflowStatus)
    ipcRenderer.on('workflow:log', handleWorkflowLog)

    return () => {
      ipcRenderer.removeListener('workflow:status', handleWorkflowStatus)
      ipcRenderer.removeListener('workflow:log', handleWorkflowLog)
    }
  }, [ipcRenderer, formatWorkflowNodeTitle, resolveWorkflowLogTone, writeTerminalSystemMessage])

  const primaryThemePresets = THEME_PRESETS.filter(themePreset => !themePreset.id.startsWith('catppuccin-'))
  const catppuccinThemePresets = THEME_PRESETS.filter(themePreset => themePreset.id.startsWith('catppuccin-'))
  const activeThemePreset = getThemePreset(theme)

  // Apply theme class to root
  useEffect(() => {
    // Instead of body, we'll apply it to the main wrapper in render
  }, [theme])

  // Initial load of current directory
  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.invoke('fs:homedir').then((dir: string) => {
        setCurrentDir(dir)
        loadFiles(dir)
      })
    }
   
  }, [])

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const wantsManual = event.key === 'F1' || ((event.metaKey || event.ctrlKey) && event.key === '/')
      if (wantsManual) {
        event.preventDefault()
        setShowHelp(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  // Handle Webview IPC messages for DOM Picker
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleIpcMessage = (event: any) => {
      if (event.channel === 'element-picked') {
        const data = event.args[0];
        setIsPickerActive(false);
        
        // Format the picked element into a readable context snippet
        const contextStr = `[Picked Element Context]\nTag: <${data.tagName}>\nSelector: ${data.selector}\nText: ${data.textContent}\nOuter HTML:\n${data.outerHTML}\n`;
        
        // Insert into input box
        setInput(prev => prev + (prev ? '\n\n' : '') + contextStr);
        textareaRef.current?.focus();
      } else if (event.channel === 'picker-status-changed') {
        setIsPickerActive(event.args[0]);
      }
    };

    webview.addEventListener('ipc-message', handleIpcMessage);
    
    // Ensure preload script is attached
    webview.addEventListener('dom-ready', () => {
      console.log('Webview DOM ready, isPickerActive:', isPickerActive);
      if (isPickerActive) {
        try {
          webview.send('toggle-picker', true);
        } catch (e) {
          console.error('Failed to send toggle-picker on dom-ready', e);
        }
      }
    });

    return () => {
      webview.removeEventListener('ipc-message', handleIpcMessage);
    };
  }, [previewUrl, isPickerActive]);

  useEffect(() => {
    if (webviewRef.current) {
      try {
        webviewRef.current.setZoomFactor(webviewZoom);
      } catch {
        // webview might not be ready
      }
    }
  }, [webviewZoom]);

  const toggleDomPicker = () => {
    const webview = webviewRef.current;
    if (webview) {
      const newState = !isPickerActive;
      setIsPickerActive(newState);
      
      console.log('Sending toggle-picker to webview:', newState);
      
      try {
        webview.send('toggle-picker', newState);
      } catch (e) {
        console.error('Failed to send toggle-picker, webview might not be ready or preload failed', e);
      }
    }
  };
  // Context menu listener
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAnalytics = (e: any) => {
      if (e.detail?.sessionId === activeSessionId) {
        setAnalytics(prev => ({
          ...prev,
          cost: e.detail.cost !== undefined ? e.detail.cost : prev.cost,
          tokens: e.detail.tokens !== undefined ? e.detail.tokens : prev.tokens
        }))
      }
    }
    window.addEventListener('session-analytics', handleAnalytics)
    
    if (!ipcRenderer) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleMenuAction = (_event: any, action: string, contextData: any) => {
      if (action === 'copy-path') {
        navigator.clipboard.writeText(contextData.path).catch(() => {
          if (electron && electron.clipboard) {
            electron.clipboard.writeText(contextData.path)
          }
        })
      } else if (action === 'insert-path') {
        setInput(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + contextData.path)
      } else if (action === 'edit-file') {
          openEditorPath(contextData.path)
        } else if (action === 'new-file') {
          setShowNewFileModal(true)
          setNewFileName('untitled.txt')
        } else if (action === 'refresh') {
        loadFiles(currentDir)
      } else if (action === 'paste') {
        if (electron && electron.clipboard) {
          const text = electron.clipboard.readText()
          if (text) setInput(prev => prev + text)
        } else {
          navigator.clipboard.readText().then(text => {
            if (text) setInput(prev => prev + text)
          })
        }
      } else if (action === 'open-terminal') {
        ipcRenderer.send('pty:write', activeSessionId, `cd ${currentDir}\r`)
      }
    }

    ipcRenderer.on('menu:action', handleMenuAction)
    return () => {
      window.removeEventListener('session-analytics', handleAnalytics)
      ipcRenderer?.removeListener('menu:action', handleMenuAction)
    }
  }, [currentDir, activeSessionId, openEditorPath])



  const handleCreateNewFile = () => {
    if (newFileName && newFileName.trim()) {
      const newPath = currentDir + '/' + newFileName.trim()
      if (ipcRenderer) {
        ipcRenderer.invoke('file:write', newPath, '').then(() => {
          loadFiles(currentDir)
          closeFloatingPages()
          setEditorFile(newPath)
          setEditorContent('')
          setActiveFile(newPath)
          setPreviewMode(false)
          setShowNewFileModal(false)
        })
      }
    }
  }

  const openFileEntry = (file: FileEntry) => {
    if (file.isDirectory) {
      handleDirClick(file.path)
      return
    }

    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)) {
      if (ipcRenderer) {
        ipcRenderer.invoke('file:read-image', file.path).then((src: string | null) => {
          if (src) {
            openImageAsset(file.path, src, file.name)
          }
        })
      }
      return
    }

    if (/\.(txt|md|js|ts|jsx|tsx|json|html|css|py|java|c|cpp|go|rs|sh|bash|zsh|yml|yaml|xml|toml|csv|ini|conf)$/i.test(file.name) || file.name.startsWith('.')) {
      openEditorPath(file.path)
    }
  }

  const handleCreateFolder = (name: string) => {
    if (!ipcRenderer || !name.trim()) return
    ipcRenderer.invoke('fs:mkdir', `${currentDir}/${name.trim()}`).then(() => loadFiles(currentDir))
  }

  const handleDirClick = (dir: string) => {
    setCurrentDir(dir)
    loadFiles(dir)
  }

  const handleParentDir = () => {
    if (ipcRenderer) {
      ipcRenderer.invoke('fs:parent', currentDir).then((dir: string) => {
        setCurrentDir(dir)
        loadFiles(dir)
      })
    }
  }

  const updateSuggestions = useCallback((next: InputSuggestion[]) => {
    setSuggestions(next)
    setActiveSuggestionIndex(next.length > 0 ? 0 : -1)
  }, [])

  const recordRecentTerminalAgentCommand = useCallback((command: string, summary: string) => {
    const normalizedCommand = command.trim()
    if (!normalizedCommand.startsWith('/')) return
    const entry: RecentTerminalAgentCommand = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      command: normalizedCommand,
      summary,
      usedAt: new Date().toISOString(),
    }

    setRecentTerminalAgentCommands(prev => {
      const deduped = prev.filter(item => item.command !== normalizedCommand)
      return [entry, ...deduped].slice(0, 8)
    })
  }, [])

  const quoteShellValue = (value: string) => (value.includes(' ') ? `"${value}"` : value)

  const replaceLastToken = (source: string, replacement: string) => {
    if (!source.trim()) return replacement
    if (/\s$/.test(source)) return `${source}${replacement}`
    const lastSpaceIndex = source.lastIndexOf(' ')
    return lastSpaceIndex === -1 ? replacement : `${source.slice(0, lastSpaceIndex + 1)}${replacement}`
  }

  const buildPromptRenderTemplate = (variables: string[]) => {
    if (!variables.length) return '{}'
    return JSON.stringify(Object.fromEntries(variables.map(variable => [variable, ''])))
  }

  const buildWorkflowRunTemplate = (variables: Record<string, string>) => {
    const keys = Object.keys(variables || {})
    if (!keys.length) return '{"input":""}'
    return JSON.stringify(Object.fromEntries(keys.map(key => [key, variables[key] || ''])))
  }

  const deriveWorkflowCommand = useCallback((resultData: unknown) => {
    const normalizeWorkflow = (workflow: unknown) => {
      if (!workflow || typeof workflow !== 'object') return null
      const record = workflow as Record<string, unknown>
      if (typeof record.id !== 'string' || !record.id.trim()) return null
      return `/workflow run ${record.id} ${buildWorkflowRunTemplate((record.variables || {}) as Record<string, string>)}`
    }

    if (Array.isArray(resultData) && resultData.length === 1) {
      return normalizeWorkflow(resultData[0])
    }

    return normalizeWorkflow(resultData)
  }, [])

  const loadTerminalAgentSuggestions = useCallback(async (query: string) => {
    if (!ipcRenderer) {
      const normalizedQuery = query.toLowerCase()
      const staticSuggestions = TERMINAL_AGENT_COMMANDS
        .filter(item => item.command.toLowerCase().includes(normalizedQuery) || item.summary.toLowerCase().includes(normalizedQuery))
        .slice(0, 8)
        .map((item, index) => ({
          id: `slash-${index}-${item.command}`,
          label: item.command.trim(),
          value: item.command,
          hint: item.summary,
          kind: 'manual' as const,
          replaceMode: 'all' as const,
        }))
      updateSuggestions(staticSuggestions)
      return
    }

    const normalizedQuery = query.toLowerCase()
    const baseSuggestions: InputSuggestion[] = TERMINAL_AGENT_COMMANDS
      .filter(item => item.command.toLowerCase().includes(normalizedQuery) || item.summary.toLowerCase().includes(normalizedQuery))
      .slice(0, 6)
      .map((item, index) => ({
        id: `slash-${index}-${item.command}`,
        label: item.command.trim(),
        value: item.command,
        hint: item.summary,
        kind: 'manual' as const,
        replaceMode: 'all' as const,
      }))

    if (/^\/prompt\s+render(?:\s+.*)?$/i.test(query)) {
      const match = query.match(/^\/prompt\s+render\s+(\S*)/i)
      const promptToken = match?.[1]?.trim().toLowerCase() || ''
      const prompts = await ipcRenderer.invoke('prompt:list')
      const promptSuggestions = ((prompts as Array<{ id: string; title: string; variables?: string[] }>) || [])
        .filter(prompt => !promptToken || prompt.id.toLowerCase().includes(promptToken) || prompt.title.toLowerCase().includes(promptToken))
        .slice(0, 6)
        .map(prompt => ({
          id: `prompt-render-${prompt.id}`,
          label: `${prompt.title} (${prompt.id})`,
          value: `/prompt render ${prompt.id} ${buildPromptRenderTemplate(prompt.variables || [])}`,
          hint: prompt.variables?.length ? `变量: ${prompt.variables.join(', ')}` : '无变量，直接可渲染',
          kind: 'manual' as const,
          replaceMode: 'all' as const,
        }))
      updateSuggestions([...promptSuggestions, ...baseSuggestions].slice(0, 8))
      return
    }

    if (/^\/workflow\s+(run|get)(?:\s+.*)?$/i.test(query)) {
      const match = query.match(/^\/workflow\s+(run|get)\s+(\S*)/i)
      const mode = match?.[1]?.toLowerCase() || 'get'
      const workflowToken = match?.[2]?.trim().toLowerCase() || ''
      const workflows = await ipcRenderer.invoke('workflow:list')
      const workflowSuggestions = ((workflows as Array<{ id: string; name: string; variables?: Record<string, string> }>) || [])
        .filter(workflow => !workflowToken || workflow.id.toLowerCase().includes(workflowToken) || workflow.name.toLowerCase().includes(workflowToken))
        .slice(0, 6)
        .map(workflow => ({
          id: `workflow-${mode}-${workflow.id}`,
          label: `${workflow.name} (${workflow.id})`,
          value: mode === 'run'
            ? `/workflow run ${workflow.id} ${buildWorkflowRunTemplate(workflow.variables || {})}`
            : `/workflow get ${workflow.id}`,
          hint: mode === 'run'
            ? `执行工作流${Object.keys(workflow.variables || {}).length ? ` · 参数: ${Object.keys(workflow.variables || {}).join(', ')}` : ''}`
            : '查看工作流定义',
          kind: 'manual' as const,
          replaceMode: 'all' as const,
        }))
      updateSuggestions([...workflowSuggestions, ...baseSuggestions].slice(0, 8))
      return
    }

    updateSuggestions(baseSuggestions.slice(0, 8))
  }, [updateSuggestions])

  const buildPendingImageFromFile = useCallback((file: File, dataUrl: string, mimeType: string) => {
    const base64 = dataUrl.split(',')[1]
    const imageId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const name = file.name || `pasted-image.${mimeType.split('/')[1] || 'png'}`
    const basePreview: PendingImagePreview = {
      id: imageId,
      src: dataUrl,
      base64,
      name,
      mime: mimeType,
      byteSize: file.size,
    }

    const image = new Image()
    image.onload = () => {
      setPendingImages(prev => [
        ...prev,
        {
          ...basePreview,
          width: image.naturalWidth,
          height: image.naturalHeight,
        },
      ])
    }
    image.onerror = () => {
      setPendingImages(prev => [...prev, basePreview])
    }
    image.src = dataUrl
  }, [])

  const loadHistorySuggestions = useCallback(async (query: string) => {
    if (!ipcRenderer) return
    const results = await ipcRenderer.invoke('autocomplete:history', query)
    updateSuggestions(
      (results as string[]).map((cmd, index) => ({
        id: `history-${index}-${cmd}`,
        label: cmd,
        value: cmd,
        hint: '历史命令 · Ctrl+R',
        kind: 'history' as const,
        replaceMode: 'all' as const,
      }))
    )
  }, [updateSuggestions])

  const loadFileSuggestions = useCallback(async (query: string) => {
    if (!ipcRenderer) return
    const isCdCommand = /^\s*cd(?:\s+.*)?$/.test(query)
    const normalizedQuery = isCdCommand
      ? query.replace(/^\s*cd\s*/, '')
      : (/\s$/.test(query) ? '' : query.split(/\s+/).pop() || query)
    const results = await ipcRenderer.invoke('autocomplete:files', normalizedQuery, currentDir, {
      directoriesFirst: true,
      localOnly: isCdCommand,
      preferDirectories: isCdCommand,
    })
    updateSuggestions(
      ((results as Array<{ path: string; isDir: boolean }>) || []).map((entry, index) => ({
        id: `file-${index}-${entry.path}`,
        label: entry.path,
        value: quoteShellValue(entry.path),
        hint: entry.isDir ? (isCdCommand ? '当前目录 · 目录优先' : '目录候选 · Ctrl+T') : (isCdCommand ? '当前目录文件' : '文件候选 · Ctrl+T'),
        kind: 'file' as const,
        replaceMode: 'last-token' as const,
      }))
    )
  }, [currentDir, updateSuggestions])

  const handleInputChange = async (val: string, options?: { force?: boolean }) => {
    setInput(val)

    if (isInputComposing && !options?.force) {
      updateSuggestions([])
      return
    }

    const trimmed = val.trim()

    if (!trimmed) {
      updateSuggestions([])
      return
    }

    if (trimmed.startsWith('/')) {
      // Debounce terminal agent suggestions
      if (autocompleteTimerRef.current) clearTimeout(autocompleteTimerRef.current)
      autocompleteTimerRef.current = setTimeout(() => { void loadTerminalAgentSuggestions(trimmed) }, 200)
      return
    }

    const isCdCommand = /^\s*cd(?:\s+.*)?$/.test(val)

    if (isCdCommand) {
      // Debounce file suggestions
      if (autocompleteTimerRef.current) clearTimeout(autocompleteTimerRef.current)
      autocompleteTimerRef.current = setTimeout(() => { void loadFileSuggestions(val) }, 200)
      return
    }

    // If typing a path (contains /), use path autocomplete
    const parts = val.split(' ')
    const lastPart = parts[parts.length - 1]
    if (lastPart.includes('/')) {
      if (!ipcRenderer) {
        updateSuggestions([])
        return
      }
      // Debounce path autocomplete
      if (autocompleteTimerRef.current) clearTimeout(autocompleteTimerRef.current)
      autocompleteTimerRef.current = setTimeout(async () => {
        const results = await ipcRenderer.invoke('autocomplete:path', lastPart, currentDir)
        updateSuggestions(
          (results as string[]).slice(0, 8).map((path: string, index: number) => ({
            id: `path-${index}-${path}`,
            label: path,
            value: quoteShellValue(path),
            hint: '路径补全',
            kind: 'path' as const,
            replaceMode: 'last-token' as const,
          }))
        )
      }, 200)
    } else {
      const manualSuggestions = searchManualCommandSuggestions(trimmed, 5).map(item => ({
        id: `manual-${item.entryId}`,
        label: item.title,
        value: item.command,
        hint: item.hint,
        kind: 'manual' as const,
          replaceMode: 'all' as const,
        }))

      if (!ipcRenderer) {
        updateSuggestions(manualSuggestions)
        return
      }

      // Debounce fuzzy autocomplete
      if (autocompleteTimerRef.current) clearTimeout(autocompleteTimerRef.current)
      autocompleteTimerRef.current = setTimeout(async () => {
        const results = await ipcRenderer.invoke('autocomplete:fuzzy', trimmed)
        const cliSuggestions = (results as string[])
          .filter((cmd: string) => !manualSuggestions.some(item => item.value === cmd))
          .slice(0, 8)
          .map((cmd: string, index: number) => ({
            id: `cmd-${index}-${cmd}`,
            label: cmd,
            value: cmd,
            hint: cmd.includes(' ') ? '历史命令' : '终端命令',
            kind: (cmd.includes(' ') ? 'history' : 'command') as 'history' | 'command',
            replaceMode: 'all' as const,
          }))

        updateSuggestions([...manualSuggestions, ...cliSuggestions].slice(0, 8))
      }, 200)
    }
  }

  const runTerminalAgentCommand = useCallback(async (rawInput: string) => {
    if (!ipcRenderer) return false

    const trimmed = rawInput.trim()
    if (!trimmed.startsWith('/')) return false

    const payload = trimmed.slice(1).trim()
    if (!payload) {
      writeTerminalSystemMessage(TERMINAL_AGENT_COPY.shellTitle, TERMINAL_AGENT_HELP)
      return true
    }

    const [commandToken, ...restTokens] = payload.split(' ')
    const command = commandToken.toLowerCase()
    const rest = restTokens.join(' ').trim()

    const publishTerminalAgentIntent = async (
      title: string,
      description: string,
      resultText: string,
      kind: 'agent' | 'skill' | 'prompt' | 'workflow' | 'context' | 'help',
      options?: { workflowCommand?: string | null; streamingId?: string },
    ) => {
      const actions = kind === 'help'
        ? []
        : [
            { id: 'insert-input', label: '插入输入框', variant: 'secondary' as const },
            { id: 'save-result-context', label: '保存到 Context', variant: 'primary' as const },
            ...(options?.workflowCommand
              ? [{ id: 'run-workflow', label: '执行 Workflow', variant: 'secondary' as const }]
              : []),
          ]

      await ipcRenderer.invoke('ui:intent:set', {
        id: options?.streamingId || `terminal_agent_${Date.now()}`,
        type: 'show_result_panel',
        title,
        description,
        payload: {
          commandType: kind,
          sourceCommand: trimmed,
          resultText,
          actionData: {
            sourceCommand: trimmed,
            resultText,
            workflowCommand: options?.workflowCommand || undefined,
          },
        },
        actions,
      })
      // Clear streaming state after intent is published
      if (options?.streamingId) {
        setStreamingIntentId(null)
      }
    }

    const runAgent = async (query: string, toolNames?: string[]) => {
      const streamingId = `terminal_agent_${Date.now()}`
      setStreamingIntentId(streamingId)
      writeTerminalSystemMessage(TERMINAL_AGENT_COPY.agentRunningTitle, `${TERMINAL_AGENT_COPY.requestPrefix}：${query}`)

      // Set up streaming listener
      const streamListener = (_event: unknown, data: { type: string; content: string; tool?: string }) => {
        const { type, content, tool } = data
        const maxLen = 500
        const truncated = content.length > maxLen ? content.substring(0, maxLen) + '...' : content
        switch (type) {
          case 'thought':
            writeTerminalSystemMessage('\u{1F4AD} Thinking', truncated)
            break
          case 'action':
            writeTerminalSystemMessage('\u{1F916} Action', `[${tool ?? 'unknown'}]\n${truncated}`)
            break
          case 'observation': {
            const obs = content.length > maxLen ? content.substring(0, maxLen) + '...' : content
            writeTerminalSystemMessage('\u{1F440} Observation', obs)
            break
          }
          case 'complete':
            // Final answer will be shown separately, skip duplicate
            break
          case 'error':
            writeTerminalSystemMessage('\u{26A0} Error', truncated, 'error')
            break
        }
      }
      ipcRenderer?.on('agent:stream', streamListener)

      try {
        const result = await ipcRenderer.invoke('agent:react', query, toolNames, { sessionId: activeSessionId })
        const formatted = formatAgentTerminalResult(result)
        writeTerminalSystemMessage(TERMINAL_AGENT_COPY.agentResultTitle, formatted, 'success')
        await publishTerminalAgentIntent(TERMINAL_AGENT_COPY.agentResultPanelTitle, TERMINAL_AGENT_COPY.agentResultPanelDescription, formatted, command as 'agent' | 'context', { streamingId })
        await persistTerminalAgentActivity(trimmed, formatted, 'success', command as 'agent' | 'context')
        recordRecentTerminalAgentCommand(trimmed, query.slice(0, 96))
      } finally {
        ipcRenderer?.removeListener('agent:stream', streamListener)
        setStreamingIntentId(null)
      }
    }

    const runCapability = async (capabilityId: string, input: Record<string, unknown>, label: string) => {
      const streamingId = `terminal_capability_${Date.now()}`
      setStreamingIntentId(streamingId)
      writeTerminalSystemMessage(TERMINAL_AGENT_COPY.capabilityRunningTitle, `${label}\n${formatTerminalValue(input)}`)
      try {
        const result = await ipcRenderer.invoke('capability:invoke', capabilityId, input)
        const formatted = formatCapabilityTerminalResult(label, result)
        const workflowCommand = capabilityId === 'workflow.get' || capabilityId === 'workflow.search'
          ? deriveWorkflowCommand(result?.data)
          : null
        writeTerminalSystemMessage(TERMINAL_AGENT_COPY.capabilityResultTitle, formatted.body, formatted.tone)
        await publishTerminalAgentIntent(
          TERMINAL_AGENT_COPY.capabilityResultPanelTitle(label),
          TERMINAL_AGENT_COPY.capabilityResultPanelDescription,
          formatted.body,
          command as 'skill' | 'prompt' | 'workflow' | 'context',
          { workflowCommand, streamingId }
        )
        await persistTerminalAgentActivity(trimmed, formatted.body, formatted.tone === 'error' ? 'error' : 'success', command as 'skill' | 'prompt' | 'workflow' | 'context')
        recordRecentTerminalAgentCommand(trimmed, label)
      } finally {
        setStreamingIntentId(null)
      }
    }

    try {
      switch (command) {
        case 'help':
          if (!rest || rest === 'agent' || rest === 'easyterminal' || rest === 'terminal-agent') {
            openManualCenter('agent')
            writeTerminalSystemMessage(TERMINAL_AGENT_COPY.helpOpenedTitle, TERMINAL_AGENT_COPY.helpOpenedMessage)
            await persistTerminalAgentActivity(trimmed, '已打开终端 Agent 帮助。', 'success', 'help')
            recordRecentTerminalAgentCommand(trimmed, '打开终端 Agent 帮助')
            return true
          }
          return false
        case 'agent':
          if (!rest || rest === 'help') {
            writeTerminalSystemMessage(TERMINAL_AGENT_COPY.shellHelpTitle, TERMINAL_AGENT_HELP)
            await publishTerminalAgentIntent(TERMINAL_AGENT_COPY.helpIntentTitle, TERMINAL_AGENT_COPY.helpIntentDescription, TERMINAL_AGENT_HELP, 'help')
            recordRecentTerminalAgentCommand(trimmed, '查看 /agent 帮助')
            return true
          }
          await runAgent(rest)
          return true
        case 'skill':
          if (!rest || rest === 'help') {
            writeTerminalSystemMessage(TERMINAL_AGENT_COPY.skillHelpTitle, '/skill <query>\n/skill get <skillId>')
            return true
          }
          if (rest.startsWith('get ')) {
            await runCapability('skill.get', { skillId: rest.slice(4).trim() }, 'skill.get')
            return true
          }
          await runCapability('skill.search', { query: rest.replace(/^search\s+/i, ''), topK: 5 }, 'skill.search')
          return true
        case 'prompt':
          if (!rest || rest === 'help') {
            writeTerminalSystemMessage(TERMINAL_AGENT_COPY.promptHelpTitle, '/prompt <query>\n/prompt search <query>\n/prompt optimize <draft>\n/prompt render <promptId> {"var":"value"}')
            return true
          }
          if (rest.startsWith('optimize ')) {
            await runCapability('prompt.optimize', { draftPrompt: rest.slice(9).trim() }, 'prompt.optimize')
            return true
          }
          if (rest.startsWith('render ')) {
            const renderPayload = rest.slice(7).trim()
            const [promptIdToken, ...valuesTokens] = renderPayload.split(' ')
            if (!promptIdToken) {
              writeTerminalSystemMessage(TERMINAL_AGENT_COPY.promptHelpTitle, `${TERMINAL_AGENT_COPY.usagePrefix} /prompt render <promptId> {"var":"value"}`, 'error')
              return true
            }
            const values = safeParseJsonObject(valuesTokens.join(' '))
            await runCapability('prompt.render', { promptId: promptIdToken, values }, 'prompt.render')
            return true
          }
          await runCapability('prompt.search', { query: rest.replace(/^search\s+/i, '') }, 'prompt.search')
          return true
        case 'workflow':
          if (!rest || rest === 'help') {
            writeTerminalSystemMessage(TERMINAL_AGENT_COPY.workflowHelpTitle, '/workflow <query>\n/workflow search <query>\n/workflow get <workflowId>\n/workflow run <workflowId> {"input":"value"}')
            return true
          }
          if (rest.startsWith('get ')) {
            await runCapability('workflow.get', { workflowId: rest.slice(4).trim() }, 'workflow.get')
            return true
          }
          if (rest.startsWith('run ')) {
            const runPayload = rest.slice(4).trim()
            const [workflowIdToken, ...variablesTokens] = runPayload.split(' ')
            if (!workflowIdToken) {
              writeTerminalSystemMessage(TERMINAL_AGENT_COPY.workflowHelpTitle, `${TERMINAL_AGENT_COPY.usagePrefix} /workflow run <workflowId> {"input":"value"}`, 'error')
              return true
            }
            const variables = safeParseJsonObject(variablesTokens.join(' '))
            await runCapability('workflow.execute', { workflowId: workflowIdToken, variables }, 'workflow.execute')
            return true
          }
          await runCapability('workflow.search', { query: rest.replace(/^search\s+/i, '') }, 'workflow.search')
          return true
        case 'context':
          if (!rest || rest === 'help') {
            writeTerminalSystemMessage(TERMINAL_AGENT_COPY.contextHelpTitle, '/context list\n/context records [query]\n/context snapshots\n/context events\n/context capture <text>')
            return true
          }
          if (rest === 'list') {
            await runCapability('context.list', {}, 'context.list')
            return true
          }
          if (rest === 'snapshots') {
            await runCapability('context.snapshots', { limit: 10 }, 'context.snapshots')
            return true
          }
          if (rest === 'events') {
            await runCapability('context.session_events', { sessionId: activeSessionId, limit: 20 }, 'context.session_events')
            return true
          }
          if (rest.startsWith('capture ')) {
            await runCapability('context.capture', { content: rest.slice(8).trim(), source: 'TerminalAgentCommand' }, 'context.capture')
            return true
          }
          if (rest === 'records') {
            await runCapability('context.records', { limit: 10 }, 'context.records')
            return true
          }
          if (rest.startsWith('records ')) {
            await runCapability('context.records', { query: rest.slice(8).trim(), limit: 10 }, 'context.records')
            return true
          }
          await runAgent(rest, ['context.list', 'context.records', 'context.snapshots', 'context.session_events', 'context.capture'])
          return true
        case 'et':
          if (!rest || rest === 'help' || rest === 'manual') {
            openManualCenter('agent')
            writeTerminalSystemMessage(TERMINAL_AGENT_COPY.helpOpenedTitle, TERMINAL_AGENT_COPY.helpOpenedMessage)
            await persistTerminalAgentActivity(trimmed, '已打开终端 Agent 帮助。', 'success', 'help')
            recordRecentTerminalAgentCommand(trimmed, '打开终端 Agent 帮助')
            return true
          }
          writeTerminalSystemMessage(TERMINAL_AGENT_COPY.easyTerminalHelpTitle, TERMINAL_AGENT_HELP)
          await publishTerminalAgentIntent(TERMINAL_AGENT_COPY.helpIntentTitle, TERMINAL_AGENT_COPY.helpIntentDescription, TERMINAL_AGENT_HELP, 'help')
          await persistTerminalAgentActivity(trimmed, TERMINAL_AGENT_HELP, 'success', 'help')
          recordRecentTerminalAgentCommand(trimmed, '查看 EasyTerminal 帮助')
          return true
        default:
          return false
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : TERMINAL_AGENT_COPY.unknownCommandError
      writeTerminalSystemMessage(
        TERMINAL_AGENT_COPY.errorTitle,
        message,
        'error'
      )
      await persistTerminalAgentActivity(trimmed, message, 'error', (['agent', 'skill', 'prompt', 'workflow', 'context'].includes(command) ? command : 'help') as 'agent' | 'skill' | 'prompt' | 'workflow' | 'context' | 'help')
      return true
    }
  }, [activeSessionId, openManualCenter, persistTerminalAgentActivity, recordRecentTerminalAgentCommand, writeTerminalSystemMessage, setStreamingIntentId])

  const executeRecentTerminalAgentCommand = useCallback(async (command: string) => {
    const handled = await runTerminalAgentCommand(command)
    if (handled) {
      setInput('')
      updateSuggestions([])
    }
  }, [runTerminalAgentCommand, updateSuggestions])

  useEffect(() => {
    terminalAgentCommandRunnerRef.current = executeRecentTerminalAgentCommand
    return () => {
      terminalAgentCommandRunnerRef.current = null
    }
  }, [executeRecentTerminalAgentCommand])

  const handleSend = async () => {
    // Handle pending image paste
    if (pendingImages.length > 0) {
      for (const pendingImage of pendingImages) {
        const nameB64 = btoa(pendingImage.name)
        const osc = `\x1b]1337;File=inline=1;size=${pendingImage.byteSize};name=${nameB64}:${pendingImage.base64}\x07`
        window.dispatchEvent(new CustomEvent(`terminal:write:${activeSessionId}`, { detail: osc }))
      }

      if (input.trim() && ipcRenderer) {
        ipcRenderer.send('pty:write', activeSessionId, input + '\r')
      }

      setPendingImages([])
      setInput('')
      updateSuggestions([])
      return
    }

    if (!input.trim()) return
    
    const trimmedInput = input.trim()
    const handledByTerminalAgent = await runTerminalAgentCommand(trimmedInput)
    if (handledByTerminalAgent) {
      setInput('')
      updateSuggestions([])
      return
    }

    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(trimmedInput)
    
    if (trimmedInput.startsWith('vim ')) {
      const file = trimmedInput.split(' ')[1]
      setEditorFile(file)
      if (ipcRenderer) {
        ipcRenderer.invoke('file:read', file).then((content: string) => {
          setEditorContent(content)
          setActiveFile(file)
        }).catch(() => {
          setEditorContent('')
        })
      }
    } else if (isImage && !trimmedInput.includes(' ')) {
      // Direct image file path handling
      if (ipcRenderer) {
        ipcRenderer.invoke('file:read-image', trimmedInput).then((src: string | null) => {
          if (src) {
            setPreviewImage({ file: trimmedInput, src })
          } else {
            // Fallback to pty if file not found
            ipcRenderer.send('pty:write', activeSessionId, trimmedInput + '\r')
          }
        })
      }
    } else if (trimmedInput.startsWith('notify ')) {
          const msg = trimmedInput.replace('notify ', '')
          if (ipcRenderer) {
            ipcRenderer.send('island:trigger', msg)
          }
        } else if (trimmedInput.startsWith('status ')) {
          const msg = trimmedInput.replace('status ', '')
          if (ipcRenderer) {
            ipcRenderer.send('island:status', msg)
          }
        } else {
      if (ipcRenderer) {
        // Send exactly as string to preserve compatibility with Agent CLI inputs like Claude
        ipcRenderer.send('pty:write', activeSessionId, input + '\r')
      }
    }
    setInput('')
    updateSuggestions([])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing || isInputComposing) {
      return
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
      e.preventDefault()
      void loadHistorySuggestions(input)
      return
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
      e.preventDefault()
      void loadFileSuggestions(input)
      return
    }

    if (suggestions.length > 0 && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      setActiveSuggestionIndex(prev => {
        const next = e.key === 'ArrowDown' ? prev + 1 : prev - 1
        if (next < 0) return suggestions.length - 1
        if (next >= suggestions.length) return 0
        return next
      })
      return
    }

    if (e.key === 'Escape' && suggestions.length > 0) {
      e.preventDefault()
      updateSuggestions([])
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      if (suggestions.length > 0) {
        const targetIndex = activeSuggestionIndex >= 0 ? activeSuggestionIndex : 0
        applySuggestion(suggestions[targetIndex])
      } else if (input.trim()) {
        void handleInputChange(input, { force: true })
      }
      return
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!input) {
        // Many interactive TUIs (like Inquirer.js) prefer pure \r or \n
        if (ipcRenderer) ipcRenderer.send('pty:write', activeSessionId, '\r')
      } else {
        void handleSend()
      }
    } else if (e.key === 'ArrowUp' && !input) {
      e.preventDefault()
      // Use standard ANSI escape sequences for arrow keys
      if (ipcRenderer) ipcRenderer.send('pty:write', activeSessionId, '\x1b[A')
    } else if (e.key === 'ArrowDown' && !input) {
      e.preventDefault()
      if (ipcRenderer) ipcRenderer.send('pty:write', activeSessionId, '\x1b[B')
    } else if (e.key === 'ArrowLeft' && !input) {
      e.preventDefault()
      if (ipcRenderer) ipcRenderer.send('pty:write', activeSessionId, '\x1b[D')
    } else if (e.key === 'ArrowRight' && !input) {
      e.preventDefault()
      if (ipcRenderer) ipcRenderer.send('pty:write', activeSessionId, '\x1b[C')
    } else if (e.key === 'Backspace' && !input) {
      // Allow sending backspace (\x7f is the standard backspace character) to pty when input is empty
      if (ipcRenderer) ipcRenderer.send('pty:write', activeSessionId, '\x7f')
    }
  }

  const saveEditor = () => {
    if (ipcRenderer && editorFile) {
      setSaveStatus('Saving...')
      ipcRenderer.invoke('file:write', editorFile, editorContent).then(() => {
        setSaveStatus('Saved!')
        setTimeout(() => setSaveStatus(null), 2000)
      }).catch(() => {
        setSaveStatus('Failed to save')
        setTimeout(() => setSaveStatus(null), 3000)
      })
    }
  }

  const handleAddTool = () => {
    if (newToolName && newToolCmd) {
      addQuickTool({ name: newToolName, cmd: newToolCmd })
      setNewToolName('')
      setNewToolCmd('')
      setIsEditingTools(false)
    }
  }

  const removeTool = (index: number) => {
    setQuickTools(prev => prev.filter((_, i) => i !== index))
  }

  const createNewSession = () => {
    const newId = `tab_${Date.now()}`
    const newName = `Tab ${sessions.length + 1}`
    const newAgentId = `agent_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    setSessions([...sessions, { id: newId, name: newName, agentId: newAgentId }])
    setActiveSessionId(newId)
  }

  const startRenamingSession = (sessionId: string) => {
    const targetSession = sessions.find(session => session.id === sessionId)
    if (!targetSession) return
    setEditingSessionId(sessionId)
    setEditingSessionName(targetSession.name)
  }

  const commitSessionRename = () => {
    if (!editingSessionId) return
    const nextName = editingSessionName.trim()
    const targetSession = sessions.find(session => session.id === editingSessionId)
    if (!targetSession) {
      setEditingSessionId(null)
      setEditingSessionName('')
      return
    }
    if (!nextName || nextName === targetSession.name) {
      setEditingSessionId(null)
      setEditingSessionName('')
      return
    }
    setSessions(prev => prev.map(session => (
      session.id === editingSessionId
        ? { ...session, name: nextName }
        : session
    )))
    setEditingSessionId(null)
    setEditingSessionName('')
  }

  const cancelSessionRename = () => {
    setEditingSessionId(null)
    setEditingSessionName('')
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          buildPendingImageFromFile(file, dataUrl, item.type)
        }
        reader.readAsDataURL(file)
      }
    }
  }

  // Handle Drag & Drop Files
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()

    // Handle drag from internal sidebar
    const internalPath = e.dataTransfer.getData('text/plain')
    if (internalPath) {
      setInput(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + internalPath)
      return
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const path = webUtils ? webUtils.getPathForFile(file as any) : (file as any).path
      if (path) {
        setInput(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + path)
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const beginPanelResize = (type: 'workspace' | 'explorer') => (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    panelDragRef.current = { type, pointerId: event.pointerId }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const agentPanelTitle =
    agentPanel === 'context'
      ? '上下文管理台'
      : agentPanel === 'prompts'
        ? 'Prompt 助手'
        : agentPanel === 'skills'
          ? 'Skill Hub'
          : agentPanel === 'knowledge'
            ? '知识库'
            : agentPanel === 'ui'
              ? 'UI 组件库'
              : agentPanel === 'migration'
                ? '迁移中心'
                : agentPanel === 'capabilities'
                  ? '能力中心'
                  : agentPanel === 'browser'
                    ? '内置浏览器'
                    : ''

  const agentPanelDescription =
    agentPanel === 'context'
      ? '集中处理上下文的存储、检索、分析和导入导出，详情只在右侧临时展开。'
      : agentPanel === 'prompts'
        ? '在独立页面里管理 Prompt 模板、变量和优化结果，不再压缩主工作区。'
        : agentPanel === 'skills'
          ? '集中浏览和筛选可用技能，让技能管理回到完整页面视图。'
          : agentPanel === 'knowledge'
            ? '用完整管理页维护知识条目、检索结果和导入内容。'
            : agentPanel === 'ui'
              ? '组件库与样式样例改成独立弹页，避免挤压终端与文件系统。'
              : agentPanel === 'migration'
                ? '迁移资料和生成结果统一在弹出页里查看、复制与编辑。'
                : agentPanel === 'capabilities'
                  ? '浏览和执行所有已注册的能力，包括提示词、技能、工作流、知识库、上下文和 UI 交互能力。'
                : agentPanel === 'browser'
                  ? '内置浏览器，支持浏览网页、登录 AI 服务、选中文本发送到终端。'
                : ''

  const activeSession = sessions.find(s => s.id === activeSessionId)
  const shellToolbarButtonClass = 'shell-surface-soft inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[0.95rem] border shell-border px-3 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--panel-border-glow)] hover:bg-[var(--surface-strong)] hover:text-[var(--text-primary)]'
  const splitterTrackClass = 'absolute inset-y-10 left-1/2 w-px -translate-x-1/2 rounded-full bg-[color:color-mix(in_srgb,var(--panel-border)_42%,transparent)]'
  const splitterThumbClass = 'absolute left-1/2 top-1/2 h-16 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:color-mix(in_srgb,var(--surface-muted)_72%,transparent)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--panel-border)_48%,transparent),0_8px_18px_-18px_var(--shadow-color)]'

  return (
    <div 
      className={`relative flex h-screen overflow-hidden font-sans text-[var(--text-primary)] selection:bg-blue-500/30 ${getThemePreset(theme).className}`}
      style={{ background: 'var(--bg-gradient)' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.03] to-transparent" />
        <div className="absolute left-[9%] top-[12%] h-56 w-56 rounded-full bg-[var(--accent)]/10 blur-3xl" />
        <div className="absolute right-[8%] top-[8%] h-48 w-48 rounded-full bg-sky-400/10 blur-3xl" />
      </div>
      
      {/* Title bar drag region (top edge) */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <div className="absolute top-0 left-0 w-full h-8 z-50 pointer-events-none" style={{ WebkitAppRegion: 'drag' } as any}></div>

      {/* Left Sidebar */}
      <div className="relative z-40 flex w-[5.25rem] shrink-0">
        <div className="shell-overlay absolute inset-y-0 left-0 right-0 border-r border-r-[color:color-mix(in_srgb,var(--panel-border)_26%,transparent)] backdrop-blur-xl shadow-[inset_-1px_0_0_color-mix(in_srgb,var(--panel-border)_18%,transparent),18px_0_36px_-34px_var(--shadow-color)]" />

        <div className="relative flex h-full w-full flex-col items-center px-2 pb-4 pt-10">
          <div className="flex w-full flex-col items-center gap-3">
            <div className="flex w-full flex-col items-center gap-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setActiveSessionId(s.id)}
                  onDoubleClick={() => startRenamingSession(s.id)}
                  className="group relative flex w-full cursor-pointer flex-col items-center gap-2"
                  title={s.name}
                >
                  <div className={`flex h-[3rem] w-[3rem] items-center justify-center rounded-[0.95rem] border transition-all duration-150 ${
                    activeSessionId === s.id
                      ? 'border-[var(--panel-border-glow)] bg-[color:color-mix(in_srgb,var(--surface-strong)_88%,transparent)] text-[var(--text-primary)] shadow-[0_12px_24px_-20px_var(--shadow-color)]'
                      : 'border-[var(--panel-border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:border-[var(--panel-border-glow)] hover:bg-[var(--surface-strong)] hover:text-[var(--text-primary)]'
                  }`}>
                    <TerminalSquare size={17} />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      startRenamingSession(s.id)
                    }}
                    className="absolute right-2 top-9 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--panel-border)] bg-[var(--surface-strong)] text-[var(--text-secondary)] opacity-0 shadow-sm transition-all group-hover:opacity-100 hover:border-[var(--panel-border-glow)] hover:text-[var(--text-primary)]"
                    title="重命名会话"
                    type="button"
                  >
                    <Edit3 size={10} />
                  </button>
                  <div className="flex w-full flex-col items-center px-1">
                    {editingSessionId === s.id ? (
                      <input
                        autoFocus
                        value={editingSessionName}
                        onChange={(e) => setEditingSessionName(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={commitSessionRename}
                        onKeyDown={(e) => {
                          e.stopPropagation()
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            commitSessionRename()
                          } else if (e.key === 'Escape') {
                            e.preventDefault()
                            cancelSessionRename()
                          }
                        }}
                        className="h-6 w-full max-w-[3.9rem] rounded-md border border-[var(--panel-border-glow)] bg-[var(--surface-strong)] px-1 text-center text-[11px] font-medium text-[var(--text-primary)] outline-none"
                      />
                    ) : (
                      <div className={`max-w-[3.9rem] truncate text-center text-[11px] font-medium leading-5 ${activeSessionId === s.id ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                        {s.name}
                      </div>
                    )}
                  </div>
                  {sessions.length > 1 && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Close session: ${s.name}?`)) {
                          const newSessions = sessions.filter(sess => sess.id !== s.id);
                          setSessions(newSessions);
                          if (activeSessionId === s.id) {
                            setActiveSessionId(newSessions[0].id);
                          }
                          if (ipcRenderer) {
                            ipcRenderer.send('pty:kill', s.id);
                          }
                        }
                      }}
                      className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                      title="Close Session"
                    >
                      <X size={9} strokeWidth={3} />
                    </div>
                  )}
                </div>
              ))}
              <div
                onClick={createNewSession}
                className="flex h-[3rem] w-[3rem] cursor-pointer items-center justify-center rounded-[0.95rem] border border-dashed border-[var(--panel-border)] text-[var(--text-secondary)] transition-colors hover:border-[var(--panel-border-glow)] hover:bg-[var(--surface-strong)] hover:text-[var(--text-primary)]"
                title="New Session"
              >
                <Plus size={17} />
              </div>
            </div>
          </div>

          <div className="flex min-h-0 w-full flex-1 flex-col">
            {!sidebarCollapsed && (
              <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-4 overflow-x-visible overflow-y-auto no-scrollbar pt-5">
              {[
              { panel: 'context', icon: Archive, label: '上下文管理台', color: 'cyan', onClick: () => { setAgentPanel(current => current === 'context' ? null : 'context'); setPreviewUrl(null); } },
              { panel: 'api', icon: Server, label: 'API 管理', color: 'blue', onClick: () => { setShowWorkflowStudio(false); setShowApiManager(true); } },
              { panel: 'prompts', icon: FileText, label: 'Prompt 助手', color: 'blue', onClick: () => { setAgentPanel(current => current === 'prompts' ? null : 'prompts'); setPreviewUrl(null); } },
              { panel: 'skills', icon: Box, label: 'Skill Hub', color: 'cyan', onClick: () => { setAgentPanel(current => current === 'skills' ? null : 'skills'); setPreviewUrl(null); } },
              { panel: 'knowledge', icon: BookOpen, label: '知识库', color: 'green', onClick: () => { setAgentPanel(current => current === 'knowledge' ? null : 'knowledge'); setPreviewUrl(null); } },
              { panel: 'workflow', icon: Workflow, label: '工作流管理台', color: 'purple', onClick: () => { setAgentPanel(null); setShowWorkflowStudio(prev => !prev); setEditorFile(null); setPreviewImage(null); setPreviewUrl(null); } },
              { panel: 'ui', icon: Layout, label: 'UI 组件库', color: 'sky', onClick: () => { setAgentPanel(current => current === 'ui' ? null : 'ui'); setPreviewUrl(null); } },
              { panel: 'migration', icon: Download, label: '迁移中心', color: 'amber', onClick: () => { setAgentPanel(current => current === 'migration' ? null : 'migration'); setPreviewUrl(null); } },
              { panel: 'capabilities', icon: Cpu, label: '能力中心', color: 'violet', onClick: () => { setAgentPanel(current => current === 'capabilities' ? null : 'capabilities'); setPreviewUrl(null); } },
              { panel: 'browser', icon: Globe, label: '内置浏览器', color: 'emerald', onClick: () => { setAgentPanel(current => current === 'browser' ? null : 'browser'); setPreviewUrl(null); } },
              { panel: 'manual', icon: HelpCircle, label: '命令手册 / F1', color: '', onClick: () => openManualCenter(input) },
              { panel: 'settings', icon: Settings2, label: '偏好设置', color: '', onClick: () => setShowSettings(!showSettings) },
              ].map(({ panel, icon: Icon, label, color, onClick }) => {
                const isActive = agentPanel === panel || (panel === 'workflow' && showWorkflowStudio) || (panel === 'api' && showApiManager);
                const colorMap: Record<string, string> = {
                  cyan: 'hover:text-cyan-300',
                  blue: 'hover:text-blue-300',
                  green: 'hover:text-emerald-300',
                  purple: 'hover:text-purple-300',
                  sky: 'hover:text-sky-300',
                  amber: 'hover:text-amber-300',
                  violet: 'hover:text-violet-300',
                  emerald: 'hover:text-emerald-300',
                };
                const activeColorMap: Record<string, string> = {
                  cyan: 'border-cyan-400/20 bg-cyan-400/12 text-cyan-100',
                  blue: 'border-blue-400/20 bg-blue-400/12 text-blue-100',
                  green: 'border-emerald-400/20 bg-emerald-400/12 text-emerald-100',
                  purple: 'border-purple-400/20 bg-purple-400/12 text-purple-100',
                  sky: 'border-sky-400/20 bg-sky-400/12 text-sky-100',
                  amber: 'border-amber-400/20 bg-amber-400/12 text-amber-100',
                  violet: 'border-violet-400/20 bg-violet-400/12 text-violet-100',
                  emerald: 'border-emerald-400/20 bg-emerald-400/12 text-emerald-100',
                };
                return (
                  <div key={panel} className="group relative">
                    <div
                      onClick={onClick}
                      title={label}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-[var(--text-secondary)] transition-all duration-150 ${
                        isActive && color
                          ? activeColorMap[color]
                          : `border-transparent ${color ? colorMap[color] : 'hover:text-[var(--text-primary)]'} hover:bg-[var(--surface-muted)]`
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                  </div>
                );
              })}
              </div>
            )}

            <div className="group relative mt-auto flex w-full items-center justify-center pt-4">
              <div
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
                className="shell-surface-soft flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border shell-border text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-strong)] hover:text-[var(--text-primary)]"
              >
                {sidebarCollapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
              </div>
            </div>
          </div>
        </div>
      </div>

      <UIModal open={!!agentPanel} className="h-[92vh] max-w-[1660px]">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-6 border-b border-[var(--panel-border)] px-8 py-6">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--text-secondary)]">管理台</div>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{agentPanelTitle}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">{agentPanelDescription}</p>
            </div>
            <button
              onClick={() => setAgentPanel(null)}
              className="shell-surface-soft rounded-full border border-[var(--panel-border)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-strong)] hover:text-[var(--text-primary)]"
            >
              <X size={18} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden px-5 pb-5">
            <div className="h-full overflow-hidden rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--panel-bg)]/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <React.Suspense fallback={<PanelLoader />}>
                {agentPanel === 'context' && (
                  <ContextVaultPanel
                    activeSessionId={activeSessionId}
                    onOpenFile={openEditorPath}
                    onInsertToInput={(value) => setInput(prev => prev.trim() ? `${prev}\n${value}` : value)}
                  />
                )}
                {agentPanel === 'prompts' && <PromptPanel />}
                {agentPanel === 'skills' && <SkillPanel />}
                {agentPanel === 'knowledge' && <KnowledgePanel />}
                {agentPanel === 'ui' && <UIShowcasePanel />}
                {agentPanel === 'migration' && <AgentMigrationPanel />}
                {agentPanel === 'capabilities' && <CapabilityPanel />}
                {agentPanel === 'browser' && <BrowserPanel />}
              </React.Suspense>
            </div>
          </div>
        </div>
      </UIModal>

      <UIIntentRenderer
        intent={uiIntent}
        onClose={closeUiIntent}
        onAction={handleUiIntentAction}
        isStreaming={streamingIntentId !== null && uiIntent?.id === streamingIntentId}
      />

      <UIModal open={!!editorFile} className="h-[92vh] max-w-[1580px]">
        {editorFile && (
          <div className="flex h-full flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--panel-border)] px-6 py-4">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">Editor</div>
                <div className="mt-2 flex items-center gap-3 text-sm font-mono text-[var(--text-secondary)] min-w-0 overflow-hidden">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]"></span>
                  <span className="truncate text-[var(--text-primary)]" title={editorFile}>{editorFile}</span>
                  {saveStatus && (
                    <span className={`text-[10px] shrink-0 rounded-full px-2 py-0.5 ${
                      saveStatus === 'Saved!' ? 'bg-green-500/20 text-green-400' :
                      saveStatus === 'Saving...' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {saveStatus}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-3 shrink-0">
                {editorFile.toLowerCase().endsWith('.md') && (
                  <button
                    onClick={() => setPreviewMode(!previewMode)}
                    className="text-xs font-mono px-4 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-full border border-blue-500/20 transition-colors flex items-center gap-1.5"
                  >
                    {previewMode ? <><Edit3 size={14} /> Edit</> : <><Eye size={14} /> Preview</>}
                  </button>
                )}
                {!previewMode && (
                  <button onClick={saveEditor} className="text-xs font-mono px-4 py-1.5 bg-[var(--accent)]/10 text-[var(--text-primary)] hover:bg-[var(--accent)]/20 rounded-full border border-[var(--accent)]/20 transition-colors flex items-center gap-1.5">
                    <Save size={14} /> Save
                  </button>
                )}
                <button onClick={() => { setEditorFile(null); setActiveFile(null); }} className="text-xs font-mono px-4 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-full border border-red-500/20 transition-colors flex items-center gap-1.5">
                  <X size={14} /> Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              {previewMode ? (
                <div className="markdown-body h-full overflow-y-auto p-8 text-sm" style={{ color: 'var(--text-primary)', backgroundColor: 'transparent' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {editorContent}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="relative h-full bg-[var(--panel-bg)]/45 p-5">
                  <textarea
                    value={editorContent}
                    onChange={(e) => setEditorContent(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                        e.preventDefault()
                        saveEditor()
                      }
                    }}
                    className="h-full w-full resize-none rounded-[1.5rem] border border-[var(--panel-border)] bg-black/15 p-5 font-mono text-sm leading-relaxed text-[var(--text-primary)] outline-none no-scrollbar"
                    spellCheck="false"
                    placeholder="Start typing..."
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </UIModal>

      <UIModal open={!!previewImage} className="h-[88vh] max-w-[1320px]">
        {previewImage && (
          <div className="flex h-full flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--panel-border)] px-6 py-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">Asset Preview</div>
                <div className="mt-2 flex items-center gap-3 text-sm font-mono text-[var(--text-secondary)]">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]"></span>
                  <span className="text-[var(--text-primary)]">{previewImage.file}</span>
                </div>
              </div>
              <button onClick={() => { setPreviewImage(null); setActiveFile(null); }} className="text-xs font-mono px-4 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-full border border-red-500/20 transition-colors flex items-center gap-1.5">
                <X size={14} /> Close
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-[color:color-mix(in_srgb,var(--surface-muted)_88%,transparent)] p-6">
              <div className="flex min-h-full items-center justify-center">
                <img src={previewImage.src} alt={previewImage.file} className="max-w-full max-h-full object-contain rounded-[1.5rem] shadow-2xl" />
              </div>
            </div>
          </div>
        )}
      </UIModal>

      {/* Main Area */}
      <div ref={mainAreaRef} className="relative z-10 flex w-full min-w-0 flex-1 overflow-hidden px-3 pb-3 pt-8">
        
        {/* Left Column: Terminal & Input */}
        <div className="relative flex min-w-[25rem] flex-1 flex-col transition-none">
        
        {/* Terminal Area with Header */}
        <div className="shell-panel relative mb-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.4rem] border shell-border shadow-[0_18px_40px_-28px_var(--shadow-color)]">
          
          {/* Terminal Header */}
          <div className="shell-surface z-10 flex h-11 shrink-0 items-center justify-between border-b shell-border px-4">
            <div className="flex shrink-0 items-center gap-4 text-[var(--text-secondary)]">
                  <div className="shell-surface-soft flex h-7 w-7 items-center justify-center rounded-lg border shell-border">
                <TerminalSquare size={14} />
              </div>
              <span className="whitespace-nowrap text-[15px] font-semibold text-[var(--text-primary)]">
                {activeSession?.name || 'Terminal'}
              </span>
              {(analytics.cost !== undefined || analytics.tokens !== undefined) && (
                <div className="shell-surface-soft ml-2 hidden items-center gap-3 rounded-full border shell-border px-3 py-1 text-[10px] font-mono lg:flex">
                  {analytics.tokens !== undefined && <span className="text-blue-400">{analytics.tokens.toLocaleString()} tkns</span>}
                  {analytics.cost !== undefined && <span className="text-green-400">${analytics.cost.toFixed(4)}</span>}
                </div>
              )}
            </div>
            <div className="ml-4 flex min-w-0 items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => {
                  setPreviewUrl('http://localhost:3000')
                  setInputUrl('http://localhost:3000')
                }}
                className={shellToolbarButtonClass}
                title="Preview Localhost"
              >
                <Globe size={12} /> Web
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('export-terminal', { detail: { format: 'md', sessionId: activeSessionId } }))}
                className={shellToolbarButtonClass}
                title="Export as Markdown"
              >
                <Download size={12} /> MD
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('export-terminal', { detail: { format: 'pdf', sessionId: activeSessionId } }))}
                className={shellToolbarButtonClass}
                title="Export as PDF"
              >
                <Download size={12} /> PDF
              </button>
              <button
                onClick={() => setShowExplorer(prev => !prev)}
                className={shellToolbarButtonClass}
                title={showExplorer ? '隐藏文件系统' : '打开文件系统'}
              >
                {showExplorer ? <PanelRightClose size={12} /> : <PanelRightOpen size={12} />}
                文件
              </button>
            </div>
          </div>

          {/* Terminal Instances */}
          <div className="flex-1 relative min-h-0">
            {sessions.map(s => (
              <div 
                key={s.id} 
                className="absolute inset-0"
                style={{ 
                  display: s.id === activeSessionId ? 'block' : 'none',
                  visibility: s.id === activeSessionId ? 'visible' : 'hidden'
                }}
              >
                <TerminalView
                  id={s.id}
                  name={s.name}
                  agentId={s.agentId}
                  isActive={s.id === activeSessionId}
                  fontSize={fontSize}
                  themeName={theme}
                  autoCaptureTerminal={autoCaptureTerminal}
                  autoAnalyzeContext={autoAnalyzeContext}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Input Area (No longer absolute, part of flex layout) */}
          <div className="z-50 mx-auto flex w-full max-w-5xl shrink-0 flex-col pb-1">

          {/* Add Tool Popover */}
          {isEditingTools && (
            <div className="absolute bottom-[140px] z-50 mb-2 flex w-72 flex-col gap-3 rounded-[1.5rem] border border-[var(--panel-border)] bg-[color:color-mix(in_srgb,var(--surface-strong)_96%,var(--bg-base))] p-4 shadow-[0_24px_48px_-28px_var(--shadow-color)] animate-in fade-in slide-in-from-bottom-2">
              <div className="text-sm font-medium text-[var(--text-primary)]">Add Shortcut</div>
              <UIInput
                placeholder="Button Name (e.g. status)"
                className="h-10 text-xs"
                value={newToolName}
                onChange={e => setNewToolName(e.target.value)}
              />
              <UIInput
                placeholder="Command (e.g. git status)"
                className="h-10 text-xs font-mono"
                value={newToolCmd}
                onChange={e => setNewToolCmd(e.target.value)}
              />
              <UIButton
                onClick={handleAddTool}
                tone="primary"
                className="justify-center"
              >
                Add
              </UIButton>
            </div>
          )}

          {/* Autocomplete / Fuzzy Suggestions */}
          {suggestions.length > 0 && (
            <div className="flex gap-2 mb-3 px-2 overflow-x-auto no-scrollbar animate-in slide-in-from-bottom-2">
              {suggestions.slice(0, 8).map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  onClick={() => {
                    setActiveSuggestionIndex(index)
                    applySuggestion(suggestion)
                  }}
                  className={`shrink-0 min-w-[190px] max-w-[320px] text-left px-3.5 py-2 rounded-xl text-[var(--text-primary)] transition-all border ${activeSuggestionIndex === index ? 'bg-[var(--accent)]/14 border-[var(--accent)]/45 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_12px_28px_-18px_var(--accent)]' : 'glass-panel glass-glow border-[var(--panel-border)] hover:bg-[var(--panel-border-glow)]'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Command size={11} className="text-[var(--accent)] opacity-70" />
                      <span className="truncate text-sm font-medium">
                        {suggestion.kind === 'manual' ? suggestion.label : suggestion.value}
                      </span>
                    </div>
                    <span className="rounded-full border border-[var(--panel-border)] bg-black/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      {suggestion.kind}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-[var(--text-secondary)] truncate">
                    {suggestion.value}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="text-[11px] text-[var(--text-secondary)] truncate">
                      {suggestion.hint}
                    </div>
                    {activeSuggestionIndex === index && (
                      <span className="rounded-md bg-[var(--accent)]/18 px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-primary)]">
                        Tab
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Prompt Box */}
          <div className="relative w-full shrink-0" onPaste={handlePaste}>
            <div className="shell-panel mb-3 flex items-center gap-2 overflow-x-auto rounded-[1.1rem] border shell-border px-3 py-2.5 shadow-[0_12px_28px_-22px_var(--shadow-color)] no-scrollbar">
                <button
                  onClick={() => openManualCenter(input)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-[0.95rem] border border-[var(--accent)]/22 bg-[var(--accent)]/8 px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)] transition-all hover:bg-[var(--accent)]/12"
                  title="打开命令手册"
                >
                  <HelpCircle size={13} className="text-[var(--accent)]" />
                  命令手册
                  <span className="rounded-md bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-secondary)]">F1</span>
                </button>

                {quickTools.map((tool, i) => (
                  <div key={i} className="relative group/tool flex shrink-0 items-center">
                    <button
                      onClick={() => sendTerminalCommand(tool.cmd)}
                      className="shell-surface-soft flex items-center gap-1.5 rounded-[0.95rem] border shell-border px-3 py-1.5 text-[12px] font-mono text-[var(--text-secondary)] transition-all hover:border-[var(--panel-border-glow)] hover:bg-[var(--surface-strong)] hover:text-[var(--text-primary)]"
                    >
                      <Command size={12} className="opacity-50" />
                      {tool.name}
                    </button>
                    {isEditingTools && (
                      <button
                        onClick={() => removeTool(i)}
                        className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white shadow-lg"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                ))}

                {recentTerminalAgentCommands.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setInput(item.command)
                      focusInputBox()
                    }}
                    className="shell-surface-soft shrink-0 rounded-[0.95rem] border shell-border px-3 py-1.5 text-[11px] font-mono text-[var(--text-secondary)] transition-colors hover:border-[var(--panel-border-glow)] hover:bg-[var(--surface-strong)] hover:text-[var(--text-primary)]"
                    title={item.command}
                  >
                    {item.command}
                  </button>
                ))}

                <button
                  onClick={() => setIsEditingTools(!isEditingTools)}
                  className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.95rem] border border-dashed border-[var(--panel-border)] bg-transparent text-[var(--text-secondary)] transition-colors hover:border-[var(--panel-border-glow)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                  title="Edit Tools"
                >
                  {isEditingTools ? <X size={14} /> : <Plus size={14} />}
                </button>
            </div>

            <div className="shell-panel relative flex flex-col overflow-hidden rounded-[1.25rem] border shell-border shadow-[0_16px_32px_-24px_var(--shadow-color)] transition-all focus-within:border-[var(--panel-border-glow)]">
              {pendingImages.length > 0 && (
                <div className="px-4 pb-1 pt-3">
                  <div className="flex max-w-full gap-2 overflow-x-auto no-scrollbar pb-1">
                    {pendingImages.map((pendingImage) => (
                      <div key={pendingImage.id} className="shell-surface-soft inline-flex min-w-0 max-w-full shrink-0 items-center gap-2 rounded-full border shell-border px-2 py-1.5 shadow-[0_10px_24px_-24px_var(--shadow-color)]">
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ file: pendingImage.name, src: pendingImage.src })}
                          className="flex min-w-0 items-center gap-2 text-left"
                          title="查看大图"
                        >
                          <img
                            src={pendingImage.src}
                            alt={pendingImage.name}
                            className="h-8 w-8 rounded-full border border-[var(--panel-border)] object-cover"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="max-w-[10rem] truncate text-[13px] font-semibold text-[var(--text-primary)]">{pendingImage.name}</span>
                              <span className="rounded-full bg-[var(--accent)]/12 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--accent)]">
                                image
                              </span>
                            </div>
                            <div className="truncate text-[11px] text-[var(--text-secondary)]">
                              {(pendingImage.byteSize / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ file: pendingImage.name, src: pendingImage.src })}
                          className="rounded-full p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                          title="打开大图预览"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingImages(prev => prev.filter(item => item.id !== pendingImage.id))}
                          className="rounded-full p-1 text-[var(--text-secondary)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                          title="移除图片"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

                <textarea
                  ref={textareaRef}
                  className={`w-full resize-none overflow-y-auto border-none bg-transparent px-6 pb-2 text-[14px] leading-7 tracking-[0.01em] text-[var(--text-primary)] outline-none no-scrollbar placeholder:text-[var(--text-secondary)] ${pendingImages.length > 0 ? 'h-[104px] pt-3' : 'h-[156px] pt-7'} font-sans`}
                  placeholder="Ask Agent, 输入命令，或直接输入“查看目录 / 安装依赖 / 代码审查”..."
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onCompositionStart={() => {
                    setIsInputComposing(true)
                    updateSuggestions([])
                  }}
                  onCompositionEnd={(e) => {
                    setIsInputComposing(false)
                    void handleInputChange(e.currentTarget.value, { force: true })
                  }}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />

                {/* Bottom Toolbar */}
                <div className="flex items-center justify-between gap-3 border-t border-[color:color-mix(in_srgb,var(--panel-border)_70%,transparent)] px-5 py-3 transition-colors">
                   <div className="flex min-w-0 flex-1 items-center gap-2 pl-0.5">
                      <Sparkles size={15} className="text-[var(--accent)]" />
                      <span className="truncate text-[11px] font-medium tracking-[0.01em] text-[var(--text-secondary)]">Tab 补全 · ↑↓ 切换候选 · Ctrl+R 历史 · Ctrl+T 文件 · Ctrl+V 粘贴图片</span>
                   </div>

                   <div className="flex items-center gap-2">
                     {input.length > 0 && (
                       <button
                         onClick={() => {
                         setInput('');
                         updateSuggestions([]);
                         textareaRef.current?.focus();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-[0.95rem] border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-strong)] hover:text-[var(--text-primary)]"
                        title="Clear input"
                      >
                        <X size={13} /> Clear
                       </button>
                     )}
                      <button
                        onClick={handleSend}
                        className={`inline-flex min-w-[8.5rem] items-center justify-center gap-2 rounded-[1rem] border px-4 py-2 text-[13px] font-medium transition-all ${
                          input.trim() || pendingImages.length > 0
                           ? 'border-[var(--accent)]/24 bg-[color:color-mix(in_srgb,var(--accent)_28%,#1a1716)] text-white shadow-[0_14px_24px_-18px_rgba(115,133,230,0.36)] hover:brightness-105'
                           : 'border-[var(--panel-border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]'
                       }`}
                     >
                       <span>Send</span>
                       <Send size={14} />
                     </button>
                   </div>
                </div>
            </div>
          </div>
        </div>


        </div> {/* End of Left Column */}

        {showWorkspace && (
          <div className="relative w-3 shrink-0 cursor-col-resize" onPointerDown={beginPanelResize('workspace')}>
            <div className={splitterTrackClass} />
            <div className={splitterThumbClass} />
          </div>
        )}

        {showWorkspace && previewUrl && (
          <div
            className="relative min-h-0 shrink-0 animate-in slide-in-from-right-4 duration-300 overflow-hidden rounded-[1.4rem] border border-[var(--panel-border)] bg-[color:color-mix(in_srgb,var(--panel-bg)_94%,transparent)] shadow-[0_18px_40px_-28px_var(--shadow-color)]"
            style={{ width: `${workspaceWidth}px` }}
          >
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex h-11 shrink-0 items-center justify-between border-b border-[var(--panel-border)] bg-[var(--surface-muted)] px-4">
                <div className="flex items-center gap-3 text-sm font-mono text-[var(--text-secondary)] overflow-hidden">
                  <Globe size={14} className="text-blue-400 shrink-0" />
                  <span className="text-[var(--text-primary)] font-medium">Browser</span>
                </div>
                <div className="flex gap-3 shrink-0">
                  <UIInput
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    className="h-9 w-52 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const target = e.currentTarget;
                        let val = target.value;
                        if (!val.startsWith('http')) val = 'http://' + val;
                        setInputUrl(val);
                        setPreviewUrl(val);
                        target.blur();
                      }
                    }}
                  />

                  <div className="flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--surface-strong)] px-2">
                    <button onClick={() => setWebviewZoom(Math.max(0.1, webviewZoom - 0.1))} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                      <ZoomOut size={12} />
                    </button>
                    <span className="text-[10px] font-mono text-[var(--text-primary)] w-8 text-center">{Math.round(webviewZoom * 100)}%</span>
                    <button onClick={() => setWebviewZoom(Math.min(3, webviewZoom + 0.1))} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                      <ZoomIn size={12} />
                    </button>
                  </div>

                  <button onClick={toggleDomPicker} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-mono transition-colors ${isPickerActive ? 'border-blue-500/38 bg-blue-500/12 text-blue-300 shadow-[0_10px_24px_-18px_rgba(59,130,246,0.4)]' : 'border-[var(--panel-border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                    <MousePointer2 size={14} className={isPickerActive ? 'animate-pulse' : ''} /> {isPickerActive ? 'Picking...' : 'Pick'}
                  </button>
                  <button onClick={() => setPreviewUrl(null)} className="flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-1.5 text-xs font-mono text-red-300 transition-colors hover:bg-red-500/16">
                    <PanelRightClose size={14} /> Close
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-white relative overflow-hidden group/webview">
                {isPickerActive && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none bg-blue-500 text-white text-xs px-4 py-1.5 rounded-full shadow-lg font-mono animate-bounce">
                    Hover elements to inspect. Click to pick.
                  </div>
                )}
                <webview
                  ref={webviewRef}
                  src={previewUrl}
                  className="w-full h-full border-none outline-none"
                  preload={webviewPreloadPath || undefined}
                ></webview>
              </div>
            </div>
          </div>
        )}
        
        {showExplorer && (
          <>
            <div className="relative w-3 shrink-0 cursor-col-resize" onPointerDown={beginPanelResize('explorer')}>
              <div className={splitterTrackClass} />
              <div className={splitterThumbClass} />
            </div>

            <div
              className="h-full shrink-0 overflow-hidden rounded-[1.4rem] border border-[var(--panel-border)] bg-[color:color-mix(in_srgb,var(--panel-bg)_94%,transparent)] shadow-[0_18px_40px_-28px_var(--shadow-color)]"
              style={{ width: `${explorerWidth}px` }}
            >
              <FileExplorerPanel
                currentDir={currentDir}
                files={dirFiles}
                activeFile={activeFile}
                selectedPaths={selectedPaths}
                onGoUp={handleParentDir}
                onOpen={openFileEntry}
                onRefresh={() => loadFiles(currentDir)}
                onSelectPaths={setSelectedPaths}
                onCreateFile={() => {
                  setShowNewFileModal(true)
                  setNewFileName('untitled.txt')
                }}
                onCreateFolder={handleCreateFolder}
              />
            </div>
          </>
        )}
      </div>

      {/* Settings Popover */}
      <UIModal open={showSettings} className="h-[82vh] max-w-[980px] bg-[color:var(--surface-strong)]">
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-6 py-5">
            <h3 className="text-lg font-medium text-[var(--text-primary)]">偏好设置</h3>
            <button onClick={() => setShowSettings(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><X size={16} /></button>
          </div>

          <div className="scroll-panel flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-wider text-[var(--text-secondary)]">工作台主题</label>
                <div className="grid grid-cols-2 gap-3">
                  {primaryThemePresets.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`rounded-2xl border p-3 text-left transition-colors ${theme === t.id ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--panel-border)] bg-[var(--surface-muted)] hover:border-[var(--panel-border-glow)]'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{t.name}</span>
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.accent }}></span>
                      </div>
                      <div className="mt-2 text-[11px] leading-5 text-[var(--text-secondary)]">{t.description}</div>
                      <div className="mt-3 flex gap-1">
                        <span className="h-2.5 flex-1 rounded-full" style={{ backgroundColor: t.accent, opacity: 0.9 }} />
                        <span className="h-2.5 flex-1 rounded-full bg-[var(--surface-muted)]" />
                        <span className="h-2.5 flex-1 rounded-full bg-[var(--surface-strong)]" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-[var(--panel-border)] bg-[var(--surface-muted)] p-4">
                <div className="text-xs font-medium text-[var(--text-primary)]">Catppuccin Flavor</div>
                <div className="mt-1 text-[11px] leading-5 text-[var(--text-secondary)]">
                  Catppuccin 本身是同一套配色系统的不同 flavor，我额外给它叠了字体、字距、行高和光标风格，让终端内文字观感也一起变化。
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {catppuccinThemePresets.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`rounded-2xl border p-3 text-left transition-colors ${theme === t.id ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--panel-border)] bg-[var(--surface-muted)]/70 hover:border-[var(--panel-border-glow)]'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{t.name.replace('Catppuccin ', '')}</span>
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.accent }}></span>
                      </div>
                      <div className="mt-2 text-[11px] leading-5 text-[var(--text-secondary)]">{t.description}</div>
                      <div className="mt-3 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-strong)] px-2.5 py-2">
                        <div
                          className="truncate text-[12px] text-[var(--text-primary)]"
                          style={{
                            fontFamily: t.terminalOptions?.fontFamily,
                            letterSpacing: t.terminalOptions?.letterSpacing ? `${t.terminalOptions.letterSpacing}px` : undefined,
                            lineHeight: t.terminalOptions?.lineHeight,
                            fontWeight: t.terminalOptions?.fontWeight,
                          }}
                        >
                          echo $SHELL
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          <span className="h-2.5 flex-1 rounded-full" style={{ backgroundColor: t.accent, opacity: 0.92 }} />
                          <span className="h-2.5 flex-1 rounded-full bg-[var(--surface-muted)]" />
                          <span className="h-2.5 flex-1 rounded-full bg-[var(--surface-strong)]" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-[var(--panel-border)] bg-[var(--surface-muted)] p-4">
                <div className="text-xs font-medium text-[var(--text-primary)]">当前风格预览</div>
                <div className="mt-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-strong)] p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">{activeThemePreset.name}</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">{activeThemePreset.description}</div>
                    </div>
                    <div className="rounded-full px-3 py-1 text-[11px] font-medium text-white" style={{ backgroundColor: activeThemePreset.accent }}>
                      Accent
                    </div>
                  </div>
                  {activeThemePreset.terminalOptions && (
                    <div className="mt-3 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-strong)] px-3 py-2">
                      <div
                        className="text-[12px] text-[var(--text-primary)]"
                        style={{
                          fontFamily: activeThemePreset.terminalOptions.fontFamily,
                          letterSpacing: activeThemePreset.terminalOptions.letterSpacing ? `${activeThemePreset.terminalOptions.letterSpacing}px` : undefined,
                          lineHeight: activeThemePreset.terminalOptions.lineHeight,
                          fontWeight: activeThemePreset.terminalOptions.fontWeight,
                        }}
                      >
                        user@easyterminal % ls -la
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        {activeThemePreset.terminalOptions.cursorStyle ?? 'block'} cursor
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-wider text-[var(--text-secondary)]">终端字号 (Font Size)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="12" max="24"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="flex-1 accent-[var(--accent)]"
                  />
                  <span className="w-8 text-center text-sm font-mono text-[var(--text-primary)]">{fontSize}px</span>
                </div>
              </div>

              <div>
                <label className="mb-3 block text-xs uppercase tracking-wider text-[var(--text-secondary)]">上下文管理</label>
                <div className="space-y-3">
                  {/* Auto Capture Terminal Output */}
                  <div className="flex items-center justify-between rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-muted)] p-3">
                    <div>
                      <div className="text-sm font-medium text-[var(--text-primary)]">自动捕获终端输出</div>
                      <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">自动将终端输出保存到上下文资产</div>
                    </div>
                    <button
                      onClick={() => {
                        const newVal = !autoCaptureTerminal
                        setAutoCaptureTerminal(newVal)
                        window.electronAPI?.storeSet('context:autoCaptureTerminal', newVal)
                      }}
                      className={`relative h-6 w-11 rounded-full transition-colors ${autoCaptureTerminal ? 'bg-[var(--accent)]' : 'bg-[var(--panel-border)]'}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${autoCaptureTerminal ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  {/* Auto Analyze Context */}
                  <div className="flex items-center justify-between rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-muted)] p-3">
                    <div>
                      <div className="text-sm font-medium text-[var(--text-primary)]">自动分析上下文</div>
                      <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">命令执行后自动分析上下文内容</div>
                    </div>
                    <button
                      onClick={() => {
                        const newVal = !autoAnalyzeContext
                        setAutoAnalyzeContext(newVal)
                        window.electronAPI?.storeSet('context:autoAnalyzeContext', newVal)
                      }}
                      className={`relative h-6 w-11 rounded-full transition-colors ${autoAnalyzeContext ? 'bg-[var(--accent)]' : 'bg-[var(--panel-border)]'}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${autoAnalyzeContext ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UIModal>

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel rounded-2xl p-6 w-80 shadow-2xl flex flex-col gap-4 relative">
            <h3 className="text-lg font-medium text-[var(--text-primary)]">新建文本文件</h3>
            <input
              autoFocus
              className="bg-black/20 border border-[var(--panel-border)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-colors"
              value={newFileName}
              onChange={e => setNewFileName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateNewFile()
                if (e.key === 'Escape') setShowNewFileModal(false)
              }}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button 
                onClick={() => setShowNewFileModal(false)} 
                className="px-4 py-1.5 rounded-md text-sm text-[var(--text-secondary)] hover:bg-[var(--panel-border)] transition-colors"
              >
                取消 (Cancel)
              </button>
              <button 
                onClick={handleCreateNewFile} 
                className="px-4 py-1.5 rounded-md text-sm bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
              >
                创建 (Create)
              </button>
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <React.Suspense fallback={
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 size={24} className="text-[var(--accent)] animate-spin" />
          </div>
        }>
          <CommandManualModal
            quickTools={quickTools}
            initialSearch={manualInitialSearch}
            onClose={() => setShowHelp(false)}
            onInsertCommand={insertManualCommand}
            onRunCommand={runManualCommand}
            onPinTool={addQuickTool}
          />
        </React.Suspense>
      )}

      {showWorkflowStudio && (
        <UIModal open={showWorkflowStudio} onClose={() => setShowWorkflowStudio(false)} className="h-[92vh] max-w-[1660px]">
          <div className="h-full overflow-hidden rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--panel-bg)]/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <React.Suspense fallback={<PanelLoader />}>
              <WorkflowPanel
                onInsertToInput={(value) => setInput(prev => prev.trim() ? `${prev}\n\n${value}` : value)}
                onClose={() => setShowWorkflowStudio(false)}
              />
            </React.Suspense>
          </div>
        </UIModal>
      )}

      {/* API Manager Modal */}
      {showApiManager && (
        <React.Suspense fallback={
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 size={24} className="text-[var(--accent)] animate-spin" />
          </div>
        }>
          <ApiManager onClose={() => setShowApiManager(false)} />
        </React.Suspense>
      )}
    </div>
  )
}

export default App
