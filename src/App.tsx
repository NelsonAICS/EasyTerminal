import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, X, Save, Sparkles, TerminalSquare, Plus, Settings2, Command, HelpCircle, Download, Eye, Edit3, Globe, PanelRightClose, PanelRightOpen, MousePointer2, ZoomIn, ZoomOut, Database, Server, FileText, Box, Workflow, Component } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import 'github-markdown-css/github-markdown.css'
import TerminalView from './TerminalView'
import { ApiManager } from './components/ApiManager'
import { PromptPanel } from './components/PromptPanel'
import { SkillPanel } from './components/SkillPanel'
import { KnowledgePanel } from './components/KnowledgePanel'
import { AgentMigrationPanel } from './components/AgentMigrationPanel'
import { ContextVaultPanel } from './components/ContextVaultPanel'
import { WorkflowPanel } from './components/WorkflowPanel'
import { FileExplorerPanel } from './components/FileExplorerPanel'
import { UIShowcasePanel } from './components/UIShowcasePanel'
import { CommandManualModal, type QuickTool } from './components/CommandManualModal'
import { UIModal } from './components/ui'
import { searchManualCommandSuggestions } from './data/commandManual'
import { getThemePreset, THEME_PRESETS } from './lib/themes'
import { type FileEntry } from './types/agent-extension'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    require?: any;
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

const DEFAULT_TOOLS: QuickTool[] = [
  { name: 'claude', cmd: 'claude' },
  { name: 'openclaw', cmd: 'openclaw' },
  { name: 'codex', cmd: 'codex' },
  { name: 'ls -la', cmd: 'ls -la' },
  { name: 'pwd', cmd: 'pwd' },
  { name: 'clear', cmd: 'clear' },
  { name: 'git status', cmd: 'git status' },
]

function App() {
  const mainAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const webviewRef = useRef<any>(null)
  const panelDragRef = useRef<{ type: 'workspace' | 'explorer'; pointerId: number } | null>(null)

  const [theme, setTheme] = useState('obsidian')
  const [fontSize, setFontSize] = useState(14)
  const [showSettings, setShowSettings] = useState(false)
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
  const [editSessionName, setEditSessionName] = useState('')

  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<InputSuggestion[]>([])
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
  const [isInputComposing, setIsInputComposing] = useState(false)
  const [pendingImages, setPendingImages] = useState<PendingImagePreview[]>([])

  const [editorFile, setEditorFile] = useState<string | null>(null)
  const [editorContent, setEditorContent] = useState<string>('')
  const [previewMode, setPreviewMode] = useState<boolean>(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<{file: string, src: string} | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [agentPanel, setAgentPanel] = useState<'context' | 'prompts' | 'skills' | 'knowledge' | 'migration' | 'ui' | null>(null)
  const [showWorkflowStudio, setShowWorkflowStudio] = useState(false)
  const [workspaceWidth, setWorkspaceWidth] = useState(760)
  const [explorerWidth, setExplorerWidth] = useState(460)
  const [showExplorer, setShowExplorer] = useState(true)
  const [inputUrl, setInputUrl] = useState<string>('')
  const [isPickerActive, setIsPickerActive] = useState<boolean>(false)
  const [webviewPreloadPath, setWebviewPreloadPath] = useState<string>('')
  const [webviewZoom, setWebviewZoom] = useState<number>(1)
  const [analytics, setAnalytics] = useState<{cost?: number, tokens?: number}>({cost: 0, tokens: 0})
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
    ipcRenderer.invoke('store:set', 'ui_font_size', fontSize).catch(() => undefined)
  }, [fontSize])

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

  const openAgentPanel = useCallback((panel: NonNullable<typeof agentPanel>) => {
    setShowWorkflowStudio(false)
    setEditorFile(null)
    setPreviewImage(null)
    setAgentPanel(current => (current === panel ? null : panel))
  }, [])

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

  const handleDeletePath = (targetPath: string) => {
    if (!ipcRenderer) return
    const confirmed = window.confirm(`确认删除：${targetPath} ?`)
    if (!confirmed) return
    ipcRenderer.invoke('fs:delete', targetPath).then(() => {
      if (activeFile === targetPath) {
        setActiveFile(null)
        setEditorFile(null)
        setPreviewImage(null)
      }
      loadFiles(currentDir)
    })
  }

  const copyPathToClipboard = (targetPath: string) => {
    navigator.clipboard.writeText(targetPath).catch(() => {
      if (electron?.clipboard) {
        electron.clipboard.writeText(targetPath)
      }
    })
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

  const quoteShellValue = (value: string) => (value.includes(' ') ? `"${value}"` : value)

  const replaceLastToken = (source: string, replacement: string) => {
    if (!source.trim()) return replacement
    if (/\s$/.test(source)) return `${source}${replacement}`
    const lastSpaceIndex = source.lastIndexOf(' ')
    return lastSpaceIndex === -1 ? replacement : `${source.slice(0, lastSpaceIndex + 1)}${replacement}`
  }

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

    const isCdCommand = /^\s*cd(?:\s+.*)?$/.test(val)

    if (isCdCommand) {
      await loadFileSuggestions(val)
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
    }
  }

  const handleSend = () => {
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
        handleSend()
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
      ? '上下文保险箱'
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
                : ''

  const agentPanelDescription =
    agentPanel === 'context'
      ? '把沉淀的会话、片段和项目资产集中放到弹出页里统一查看与编辑。'
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
                : ''

  return (
    <div 
      className={`flex h-screen font-sans selection:bg-blue-500/30 overflow-hidden relative text-[var(--text-primary)] ${getThemePreset(theme).className}`}
      style={{ background: 'var(--bg-gradient)' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      
      {/* Title bar drag region (top edge) */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <div className="absolute top-0 left-0 w-full h-8 z-50 pointer-events-none" style={{ WebkitAppRegion: 'drag' } as any}></div>

      {/* Left Sidebar (Sessions) */}
      <div className="w-16 shrink-0 border-r border-[var(--panel-border)] flex flex-col items-center py-10 z-40 bg-[var(--panel-bg)] backdrop-blur-xl">
        <div className="flex-1 flex flex-col gap-4 items-center">
          {sessions.map((s) => (
            <div 
              key={s.id}
              className="relative group flex flex-col items-center gap-1"
            >
              <div
                onClick={() => setActiveSessionId(s.id)}
                onDoubleClick={() => {
                  setEditingSessionId(s.id);
                  setEditSessionName(s.name);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setEditingSessionId(s.id);
                  setEditSessionName(s.name);
                }}
                className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all shrink-0 ${
                  activeSessionId === s.id 
                    ? 'bg-[var(--accent)] text-white shadow-[0_0_15px_var(--accent)] scale-110' 
                    : 'bg-[var(--panel-border)] text-[var(--text-secondary)] hover:bg-[var(--panel-border-glow)] hover:scale-105'
                }`}
                title={s.name + ' (Double-click or Right-click to rename)'}
              >
                <TerminalSquare size={16} />
                
                {/* Hover Close Button */}
                {sessions.length > 1 && (
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Are you sure you want to close session: ${s.name}?`)) {
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
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-red-600 shadow-md z-10"
                    title="Close Session"
                  >
                    <X size={10} strokeWidth={3} />
                  </div>
                )}
              </div>
              
              {/* Inline Editor or Display Name */}
              {editingSessionId === s.id ? (
                <input
                  autoFocus
                  value={editSessionName}
                  onChange={(e) => setEditSessionName(e.target.value)}
                  onBlur={() => {
                    if (editSessionName.trim()) {
                      setSessions(sessions.map(sess => sess.id === s.id ? { ...sess, name: editSessionName.trim() } : sess));
                    }
                    setEditingSessionId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (editSessionName.trim()) {
                        setSessions(sessions.map(sess => sess.id === s.id ? { ...sess, name: editSessionName.trim() } : sess));
                      }
                      setEditingSessionId(null);
                    } else if (e.key === 'Escape') {
                      setEditingSessionId(null);
                    }
                  }}
                  className="text-[10px] w-14 text-center bg-black/40 text-white rounded px-1 outline-none border border-[var(--accent)] shadow-lg"
                />
              ) : (
                s.name && <span className="text-[10px] w-14 text-center opacity-80 leading-tight truncate" title={s.name}>{s.name}</span>
              )}
            </div>
          ))}
          <div 
            onClick={createNewSession}
            className="w-10 h-10 rounded-full border border-dashed border-[var(--text-secondary)] text-[var(--text-secondary)] flex items-center justify-center cursor-pointer hover:bg-[var(--panel-border)] hover:text-[var(--text-primary)] transition-all"
            title="New Session"
          >
            <Plus size={16} />
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-auto">
          <div className="group relative"
            onClick={() => {
              openAgentPanel('context');
              setPreviewUrl(null);
            }}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:bg-[var(--panel-border)] transition-all ${agentPanel === 'context' ? 'text-cyan-300 bg-[var(--panel-border)]' : 'text-[var(--text-secondary)] hover:text-cyan-300'}`}>
              <Database size={18} />
            </div>
            <span className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-black/80 text-white text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none z-50 shadow-lg border border-white/10">上下文保险箱</span>
          </div>
          <div className="group relative"
            onClick={() => {
              setShowWorkflowStudio(false)
              setShowApiManager(true)
            }}
          >
            <div className="w-10 h-10 rounded-full text-[var(--text-secondary)] flex items-center justify-center cursor-pointer hover:bg-[var(--panel-border)] hover:text-blue-400 transition-all">
              <Server size={18} />
            </div>
            <span className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-black/80 text-white text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none z-50 shadow-lg border border-white/10">API 管理</span>
          </div>
          <div className="group relative"
            onClick={() => { openAgentPanel('prompts'); setPreviewUrl(null); }}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:bg-[var(--panel-border)] transition-all ${agentPanel === 'prompts' ? 'text-blue-400 bg-[var(--panel-border)]' : 'text-[var(--text-secondary)] hover:text-blue-400'}`}>
              <FileText size={18} />
            </div>
            <span className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-black/80 text-white text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none z-50 shadow-lg border border-white/10">Prompt 助手</span>
          </div>
          <div className="group relative"
            onClick={() => { openAgentPanel('skills'); setPreviewUrl(null); }}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:bg-[var(--panel-border)] transition-all ${agentPanel === 'skills' ? 'text-cyan-400 bg-[var(--panel-border)]' : 'text-[var(--text-secondary)] hover:text-cyan-400'}`}>
              <Box size={18} />
            </div>
            <span className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-black/80 text-white text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none z-50 shadow-lg border border-white/10">Skill Hub</span>
          </div>
          <div className="group relative"
            onClick={() => { openAgentPanel('knowledge'); setPreviewUrl(null); }}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:bg-[var(--panel-border)] transition-all ${agentPanel === 'knowledge' ? 'text-green-400 bg-[var(--panel-border)]' : 'text-[var(--text-secondary)] hover:text-green-400'}`}>
              <Database size={18} />
            </div>
            <span className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-black/80 text-white text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none z-50 shadow-lg border border-white/10">知识库</span>
          </div>
          <div className="group relative"
            onClick={() => {
              setAgentPanel(null);
              setShowWorkflowStudio(prev => !prev);
              setEditorFile(null);
              setPreviewImage(null);
              setPreviewUrl(null);
            }}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:bg-[var(--panel-border)] transition-all ${showWorkflowStudio ? 'text-purple-300 bg-[var(--panel-border)]' : 'text-[var(--text-secondary)] hover:text-purple-300'}`}>
              <Workflow size={18} />
            </div>
            <span className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-black/80 text-white text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none z-50 shadow-lg border border-white/10">工作流工作台</span>
          </div>
          <div className="group relative"
            onClick={() => { openAgentPanel('ui'); setPreviewUrl(null); }}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:bg-[var(--panel-border)] transition-all ${agentPanel === 'ui' ? 'text-sky-300 bg-[var(--panel-border)]' : 'text-[var(--text-secondary)] hover:text-sky-300'}`}>
              <Component size={18} />
            </div>
            <span className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-black/80 text-white text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none z-50 shadow-lg border border-white/10">UI 组件库</span>
          </div>
          <div className="group relative"
            onClick={() => { openAgentPanel('migration'); setPreviewUrl(null); }}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:bg-[var(--panel-border)] transition-all ${agentPanel === 'migration' ? 'text-amber-300 bg-[var(--panel-border)]' : 'text-[var(--text-secondary)] hover:text-amber-300'}`}>
              <Download size={18} />
            </div>
            <span className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-black/80 text-white text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none z-50 shadow-lg border border-white/10">迁移中心</span>
          </div>
          <div className="group relative"
            onClick={() => openManualCenter(input)}
          >
            <div className="w-10 h-10 rounded-full text-[var(--text-secondary)] flex items-center justify-center cursor-pointer hover:bg-[var(--panel-border)] hover:text-[var(--text-primary)] transition-all">
              <HelpCircle size={18} />
            </div>
            <span className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-black/80 text-white text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none z-50 shadow-lg border border-white/10">命令手册 / F1</span>
          </div>
          <div className="group relative"
            onClick={() => setShowSettings(!showSettings)}
          >
            <div className="w-10 h-10 rounded-full text-[var(--text-secondary)] flex items-center justify-center cursor-pointer hover:bg-[var(--panel-border)] hover:text-[var(--text-primary)] transition-all">
              <Settings2 size={18} />
            </div>
            <span className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-black/80 text-white text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none z-50 shadow-lg border border-white/10">偏好设置</span>
          </div>
        </div>
      </div>

      <UIModal open={!!agentPanel} className="h-[92vh] max-w-[1660px] bg-[linear-gradient(180deg,rgba(11,16,29,0.98),rgba(7,11,21,0.99))]">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-6 border-b border-[var(--panel-border)] px-8 py-6">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--text-secondary)]">Management Page</div>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{agentPanelTitle}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">{agentPanelDescription}</p>
            </div>
            <button
              onClick={() => setAgentPanel(null)}
              className="rounded-full border border-[var(--panel-border)] bg-white/5 p-2 text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]"
            >
              <X size={18} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden px-5 pb-5">
            <div className="h-full overflow-hidden rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--panel-bg)]/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              {agentPanel === 'context' && (
                <ContextVaultPanel
                  onOpenFile={openEditorPath}
                  onInsertToInput={(value) => setInput(prev => prev.trim() ? `${prev}\n${value}` : value)}
                />
              )}
              {agentPanel === 'prompts' && <PromptPanel />}
              {agentPanel === 'skills' && <SkillPanel />}
              {agentPanel === 'knowledge' && <KnowledgePanel />}
              {agentPanel === 'ui' && <UIShowcasePanel />}
              {agentPanel === 'migration' && <AgentMigrationPanel />}
            </div>
          </div>
        </div>
      </UIModal>

      <UIModal open={!!editorFile} className="h-[92vh] max-w-[1580px] bg-[linear-gradient(180deg,rgba(12,18,31,0.98),rgba(8,12,24,0.99))]">
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

      <UIModal open={!!previewImage} className="h-[88vh] max-w-[1320px] bg-[linear-gradient(180deg,rgba(12,18,31,0.98),rgba(8,12,24,0.99))]">
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
            <div className="flex-1 overflow-auto bg-black/20 p-6">
              <div className="flex min-h-full items-center justify-center">
                <img src={previewImage.src} alt={previewImage.file} className="max-w-full max-h-full object-contain rounded-[1.5rem] shadow-2xl" />
              </div>
            </div>
          </div>
        )}
      </UIModal>

      {/* Main Area */}
      <div ref={mainAreaRef} className="flex-1 flex relative overflow-hidden p-5 z-10 w-full min-w-0">
        
        {/* Left Column: Terminal & Input */}
        <div className="min-w-[25rem] flex-1 flex flex-col relative transition-all duration-300">
        
        {/* Terminal Area with Header */}
        <div className="flex-1 glass-panel rounded-3xl overflow-hidden relative shadow-2xl min-h-0 flex flex-col mb-4">
          
          {/* Terminal Header */}
          <div className="h-10 bg-[var(--panel-bg)]/50 border-b border-[var(--panel-border)] flex items-center justify-between px-4 shrink-0 z-10 backdrop-blur-md">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <TerminalSquare size={14} />
              <span className="text-xs font-medium text-[var(--text-primary)]">
                {sessions.find(s => s.id === activeSessionId)?.name || 'Terminal'}
              </span>
              {(analytics.cost !== undefined || analytics.tokens !== undefined) && (
                <div className="ml-4 flex items-center gap-3 text-[10px] font-mono bg-[var(--panel-border)]/50 px-2 py-0.5 rounded-full border border-[var(--panel-border)]">
                  {analytics.tokens !== undefined && <span className="text-blue-400">{analytics.tokens.toLocaleString()} tkns</span>}
                  {analytics.cost !== undefined && <span className="text-green-400">${analytics.cost.toFixed(4)}</span>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setPreviewUrl('http://localhost:3000')
                  setInputUrl('http://localhost:3000')
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-[var(--panel-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-[11px] font-bold"
                title="Preview Localhost"
              >
                <Globe size={12} /> Web
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('export-terminal', { detail: { format: 'md', sessionId: activeSessionId } }))}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-[var(--panel-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-[11px] font-bold"
                title="Export as Markdown"
              >
                <Download size={12} /> MD
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('export-terminal', { detail: { format: 'pdf', sessionId: activeSessionId } }))}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-[var(--panel-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-[11px] font-bold"
                title="Export as PDF"
              >
                <Download size={12} /> PDF
              </button>
              <button
                onClick={() => setShowExplorer(prev => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-[var(--panel-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-[11px] font-bold"
                title={showExplorer ? '隐藏文件系统' : '打开文件系统'}
              >
                {showExplorer ? <PanelRightClose size={12} /> : <PanelRightOpen size={12} />}
                FILE
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
                />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Input Area (No longer absolute, part of flex layout) */}
          <div className="w-full max-w-4xl mx-auto flex flex-col z-50 shrink-0 pb-2">
          
          {/* Quick Tools Bar */}
          <div className="flex items-center gap-2 mb-3 w-full pl-2">
            <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
              <button
                onClick={() => openManualCenter(input)}
                className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--accent)]/12 hover:bg-[var(--accent)]/18 border border-[var(--accent)]/30 text-[12px] font-medium text-[var(--text-primary)] transition-all shadow-sm backdrop-blur-md"
                title="打开命令手册"
              >
                <HelpCircle size={13} className="text-[var(--accent)]" />
                命令手册
                <span className="rounded-md bg-black/20 px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-secondary)]">F1</span>
              </button>

              {quickTools.map((tool, i) => (
                <div key={i} className="relative group/tool shrink-0 flex items-center">
                  <button 
                    onClick={() => sendTerminalCommand(tool.cmd)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--panel-bg)] hover:bg-[var(--panel-border-glow)] border border-[var(--panel-border)] text-[12px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-sm backdrop-blur-md"
                  >
                    <Command size={12} className="opacity-50" />
                    {tool.name}
                  </button>
                  {isEditingTools && (
                    <button 
                      onClick={() => removeTool(i)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center shadow-lg"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              ))}
              
              {/* Add Custom Tool Button */}
              <button 
                onClick={() => setIsEditingTools(!isEditingTools)}
                className="shrink-0 flex items-center justify-center w-7 h-7 rounded-xl bg-[var(--panel-bg)] border border-dashed border-[var(--text-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-colors ml-1"
                title="Edit Tools"
              >
                {isEditingTools ? <X size={14} /> : <Plus size={14} />}
              </button>
            </div>
          </div>

          {/* Add Tool Popover */}
          {isEditingTools && (
            <div className="absolute bottom-[140px] mb-2 glass-panel rounded-xl p-4 shadow-2xl flex flex-col gap-3 w-64 animate-in fade-in slide-in-from-bottom-2 z-50">
              <div className="text-sm font-medium text-[var(--text-primary)]">Add Shortcut</div>
              <input 
                placeholder="Button Name (e.g. status)"
                className="bg-black/20 border border-[var(--panel-border)] rounded-md px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                value={newToolName}
                onChange={e => setNewToolName(e.target.value)}
              />
              <input 
                placeholder="Command (e.g. git status)"
                className="bg-black/20 border border-[var(--panel-border)] rounded-md px-3 py-1.5 text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                value={newToolCmd}
                onChange={e => setNewToolCmd(e.target.value)}
              />
              <button 
                onClick={handleAddTool}
                className="bg-[var(--accent)] text-white text-xs font-medium py-1.5 rounded-md hover:bg-blue-400 transition-colors"
              >
                Add
              </button>
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
          <div className="relative group w-full shrink-0" onPaste={handlePaste}>
            <div className="absolute -inset-[1px] bg-gradient-to-r from-[var(--accent)] via-purple-500 to-[var(--accent)] rounded-2xl blur-md opacity-20 group-focus-within:opacity-50 transition duration-500 pointer-events-none"></div>
            <div className="relative flex h-[11.25rem] flex-col glass-panel rounded-[1.75rem] shadow-2xl transition-all border border-[var(--panel-border)] bg-[var(--panel-bg)]/92 focus-within:bg-[var(--panel-bg)]">
              {pendingImages.length > 0 && (
                <div className="px-5 pt-4">
                  <div className="flex max-w-full gap-2 overflow-x-auto no-scrollbar pb-1">
                    {pendingImages.map((pendingImage) => (
                      <div key={pendingImage.id} className="inline-flex min-w-0 shrink-0 max-w-full items-center gap-3 rounded-full border border-[var(--panel-border)] bg-white/5 px-2 py-2 shadow-[0_12px_30px_-22px_rgba(0,0,0,0.65)] backdrop-blur-xl">
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ file: pendingImage.name, src: pendingImage.src })}
                          className="flex min-w-0 items-center gap-3 text-left"
                          title="查看大图"
                        >
                          <img
                            src={pendingImage.src}
                            alt={pendingImage.name}
                            className="h-11 w-11 rounded-full border border-white/10 object-cover shadow-lg"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-[var(--text-primary)]">{pendingImage.name}</span>
                              <span className="rounded-full bg-[var(--accent)]/12 px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--accent)]">
                                image
                              </span>
                            </div>
                            <div className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
                              {pendingImage.width && pendingImage.height ? `${pendingImage.width}×${pendingImage.height}` : '图片已就绪'}
                              {' · '}
                              {(pendingImage.byteSize / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ file: pendingImage.name, src: pendingImage.src })}
                          className="rounded-full p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-white/6 hover:text-[var(--text-primary)]"
                          title="打开大图预览"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingImages(prev => prev.filter(item => item.id !== pendingImage.id))}
                          className="rounded-full p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                          title="移除图片"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <textarea
                ref={textareaRef}
                className={`w-full bg-transparent border-none outline-none text-[var(--text-primary)] text-[13px] font-mono placeholder:text-[var(--text-secondary)] resize-none overflow-y-auto px-5 pb-3 leading-7 no-scrollbar ${pendingImages.length > 0 ? 'h-[60px] pt-3' : 'h-[118px] pt-5'}`}
                placeholder="Ask Agent，输入命令，或直接输入“查看目录 / 安装依赖 / 代码审查”..."
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
              <div className="flex items-center justify-between px-4 pb-4 pt-2 border-t border-transparent group-focus-within:border-[var(--panel-border)]/50 transition-colors">
                 <div className="flex items-center gap-2 pl-1 opacity-70">
                    <Sparkles size={16} className="text-[var(--accent)]" />
                    <span className="text-[11px] text-[var(--text-secondary)] font-sans tracking-wide">Tab 补全 · ↑↓ 切换候选 · Ctrl+R 历史 · Ctrl+T 文件 · Ctrl+V 粘贴图片</span>
                 </div>
                 
                 <div className="flex items-center gap-2">
                   {input.length > 0 && (
                     <button 
                       onClick={() => { 
                         setInput(''); 
                         updateSuggestions([]); 
                         textareaRef.current?.focus();
                       }}
                       className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--panel-border)] transition-all flex items-center gap-1.5"
                       title="Clear input"
                     >
                       <X size={14} /> Clear
                     </button>
                   )}
                   <button 
                     onClick={handleSend}
                     className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${input.trim() || pendingImages.length > 0 ? 'bg-[var(--accent)] text-white shadow-md hover:opacity-90' : 'bg-[var(--panel-border)] text-[var(--text-secondary)]'}`}
                   >
                     <span className="text-[13px] font-medium">Send</span>
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
            <div className="absolute inset-y-10 left-1/2 w-px -translate-x-1/2 rounded-full bg-[var(--panel-border)]" />
            <div className="absolute left-1/2 top-1/2 h-20 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--surface-muted)] shadow-[0_0_0_1px_var(--panel-border)]" />
          </div>
        )}

        {showWorkspace && previewUrl && (
          <div
            className="shrink-0 flex flex-col glass-panel rounded-[2rem] overflow-hidden relative shadow-2xl min-h-0 animate-in slide-in-from-right-4 duration-300 border border-[var(--panel-border)] bg-[var(--panel-bg)]/80 backdrop-blur-xl"
            style={{ width: `${workspaceWidth}px` }}
          >
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="h-12 flex items-center justify-between px-6 border-b border-[var(--panel-border)] bg-[var(--panel-bg)] shrink-0">
                <div className="flex items-center gap-3 text-sm font-mono text-[var(--text-secondary)] overflow-hidden">
                  <Globe size={14} className="text-blue-400 shrink-0" />
                  <span className="text-[var(--text-primary)] font-medium">Browser</span>
                </div>
                <div className="flex gap-3 shrink-0">
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    className="bg-black/20 border border-[var(--panel-border)] rounded-md px-3 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-blue-500/50 w-48"
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

                  <div className="flex items-center gap-1.5 px-2 bg-black/10 rounded-full border border-[var(--panel-border)]">
                    <button onClick={() => setWebviewZoom(Math.max(0.1, webviewZoom - 0.1))} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                      <ZoomOut size={12} />
                    </button>
                    <span className="text-[10px] font-mono text-[var(--text-primary)] w-8 text-center">{Math.round(webviewZoom * 100)}%</span>
                    <button onClick={() => setWebviewZoom(Math.min(3, webviewZoom + 0.1))} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                      <ZoomIn size={12} />
                    </button>
                  </div>

                  <button onClick={toggleDomPicker} className={`text-xs font-mono px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${isPickerActive ? 'bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-transparent text-[var(--text-secondary)] border-[var(--panel-border)] hover:text-[var(--text-primary)]'}`}>
                    <MousePointer2 size={14} className={isPickerActive ? 'animate-pulse' : ''} /> {isPickerActive ? 'Picking...' : 'Pick'}
                  </button>
                  <button onClick={() => setPreviewUrl(null)} className="text-xs font-mono px-4 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-full border border-red-500/20 transition-colors flex items-center gap-1.5">
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
              <div className="absolute inset-y-10 left-1/2 w-px -translate-x-1/2 rounded-full bg-[var(--panel-border)]" />
              <div className="absolute left-1/2 top-1/2 h-20 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--surface-muted)] shadow-[0_0_0_1px_var(--panel-border)]" />
            </div>

            <div
              className="h-full shrink-0 overflow-hidden rounded-[2rem] shadow-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/80 backdrop-blur-xl"
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
                onDelete={handleDeletePath}
                onCopyPath={copyPathToClipboard}
                onToggleVisibility={() => setShowExplorer(false)}
              />
            </div>
          </>
        )}
      </div>

      {/* Settings Popover */}
      {showSettings && (
        <div className="absolute bottom-6 left-20 z-50 flex max-h-[calc(100vh-3rem)] w-[26rem] flex-col overflow-hidden rounded-3xl glass-panel animate-in fade-in slide-in-from-bottom-4">
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
                        <span className="h-2.5 flex-1 rounded-full bg-white/10" />
                        <span className="h-2.5 flex-1 rounded-full bg-black/25" />
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
                      <div className="mt-3 rounded-xl border border-[var(--panel-border)] bg-black/10 px-2.5 py-2">
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
                          <span className="h-2.5 flex-1 rounded-full bg-white/10" />
                          <span className="h-2.5 flex-1 rounded-full bg-black/25" />
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
                    <div className="mt-3 rounded-xl border border-[var(--panel-border)] bg-black/10 px-3 py-2">
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
            </div>
          </div>
        </div>
      )}

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
        <CommandManualModal
          quickTools={quickTools}
          initialSearch={manualInitialSearch}
          onClose={() => setShowHelp(false)}
          onInsertCommand={insertManualCommand}
          onRunCommand={runManualCommand}
          onPinTool={addQuickTool}
        />
      )}

      {showWorkflowStudio && (
        <UIModal open={showWorkflowStudio} className="h-[92vh] max-w-[1660px] bg-[linear-gradient(180deg,rgba(11,16,29,0.98),rgba(7,11,21,0.99))]">
          <WorkflowPanel
            onInsertToInput={(value) => setInput(prev => prev.trim() ? `${prev}\n\n${value}` : value)}
            onClose={() => setShowWorkflowStudio(false)}
          />
        </UIModal>
      )}

      {/* API Manager Modal */}
      {showApiManager && (
        <ApiManager onClose={() => setShowApiManager(false)} />
      )}
    </div>
  )
}

export default App
