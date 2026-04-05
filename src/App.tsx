import { useState, useEffect, useRef } from 'react'
import { Send, X, Save, Sparkles, TerminalSquare, Plus, Settings2, Command, HelpCircle, Folder, File, ArrowUp } from 'lucide-react'
import Editor from '@monaco-editor/react'
import TerminalView from './TerminalView'

declare global {
  interface Window {
    require?: any;
  }
}

const electron = window.require ? window.require('electron') : null
const ipcRenderer = electron?.ipcRenderer
const webUtils = electron?.webUtils

interface Session {
  id: string
  name: string
}

const DEFAULT_TOOLS = [
  { name: 'ls -la', cmd: 'ls -la' },
  { name: 'pwd', cmd: 'pwd' },
  { name: 'clear', cmd: 'clear' },
  { name: 'git status', cmd: 'git status' },
]

function App() {
  const [theme, setTheme] = useState('obsidian') // 'obsidian', 'neon', 'paper', 'cream'
  const [fontSize, setFontSize] = useState(14)
  const [showSettings, setShowSettings] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const [quickTools, setQuickTools] = useState(DEFAULT_TOOLS)
  const [newToolName, setNewToolName] = useState('')
  const [newToolCmd, setNewToolCmd] = useState('')
  const [isEditingTools, setIsEditingTools] = useState(false)

  const [sessions, setSessions] = useState<Session[]>([
    { id: 'tab_1', name: 'Main' }
  ])
  const [activeSessionId, setActiveSessionId] = useState('tab_1')
  
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editSessionName, setEditSessionName] = useState('')

  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  
  const [editorFile, setEditorFile] = useState<string | null>(null)
  const [editorContent, setEditorContent] = useState<string>('')
  const [previewImage, setPreviewImage] = useState<{file: string, src: string} | null>(null)

  const [currentDir, setCurrentDir] = useState<string>('')
  const [dirFiles, setDirFiles] = useState<any[]>([])
  
  const [activeFile, setActiveFile] = useState<string | null>(null)
  
  const [showNewFileModal, setShowNewFileModal] = useState(false)
  const [newFileName, setNewFileName] = useState('')

  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      // Always keep a comfortable minimum height for the prompt box
      textareaRef.current.style.height = '80px'
      const scrollHeight = textareaRef.current.scrollHeight
      textareaRef.current.style.height = `${Math.max(80, Math.min(scrollHeight, 240))}px`
    }
  }, [input])

  // Context menu listener
  useEffect(() => {
    if (!ipcRenderer) return

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
          setEditorFile(contextData.path)
          setActiveFile(contextData.path)
          ipcRenderer.invoke('file:read', contextData.path).then((content: string) => {
            setEditorContent(content)
          }).catch(() => {
            setEditorContent('')
          })
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
      ipcRenderer.removeListener('menu:action', handleMenuAction)
    }
  }, [currentDir, activeSessionId])

  const loadFiles = (dir: string) => {
    if (ipcRenderer) {
      ipcRenderer.invoke('fs:list', dir).then((files: any[]) => setDirFiles(files))
    }
  }

  const handleCreateNewFile = () => {
    if (newFileName && newFileName.trim()) {
      const newPath = currentDir + '/' + newFileName.trim()
      if (ipcRenderer) {
        ipcRenderer.invoke('file:write', newPath, '').then(() => {
          loadFiles(currentDir)
          setEditorFile(newPath)
          setEditorContent('')
          setActiveFile(newPath)
          setShowNewFileModal(false)
        })
      }
    }
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

  const handleInputChange = async (val: string) => {
    setInput(val)
    if (!ipcRenderer) return
    
    const parts = val.split(' ')
    const lastPart = parts[parts.length - 1]
    
    if (lastPart.length > 0) {
      const results = await ipcRenderer.invoke('autocomplete:path', lastPart)
      setSuggestions(results)
    } else {
      setSuggestions([])
    }
  }

  const handleSend = () => {
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
    setSuggestions([])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    } else if (e.key === 'Tab') {
      e.preventDefault()
      if (suggestions.length > 0) {
        const parts = input.split(' ')
        parts[parts.length - 1] = suggestions[0]
        setInput(parts.join(' '))
        setSuggestions([])
      }
    }
  }

  const saveEditor = () => {
    if (ipcRenderer && editorFile) {
      ipcRenderer.invoke('file:write', editorFile, editorContent).then(() => {
        setEditorFile(null)
      })
    }
  }

  const handleAddTool = () => {
    if (newToolName && newToolCmd) {
      setQuickTools([...quickTools, { name: newToolName, cmd: newToolCmd }])
      setNewToolName('')
      setNewToolCmd('')
      setIsEditingTools(false)
    }
  }

  const removeTool = (index: number) => {
    setQuickTools(quickTools.filter((_, i) => i !== index))
  }

  const createNewSession = () => {
    const newId = `tab_${Date.now()}`
    const newName = `Tab ${sessions.length + 1}`
    setSessions([...sessions, { id: newId, name: newName }])
    setActiveSessionId(newId)
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
      // Use webUtils for Electron >= 31, fallback to file.path
      const path = webUtils ? webUtils.getPathForFile(file as any) : (file as any).path
      if (path) {
        setInput(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + path)
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <div 
      className={`flex h-screen font-sans selection:bg-blue-500/30 overflow-hidden relative text-[var(--text-primary)] ${theme === 'obsidian' ? '' : 'theme-' + theme}`}
      style={{ background: 'var(--bg-gradient)' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      
      {/* Title bar drag region (top edge) */}
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
          <div 
            onClick={() => setShowHelp(true)}
            className="w-10 h-10 rounded-full text-[var(--text-secondary)] flex items-center justify-center cursor-pointer hover:bg-[var(--panel-border)] hover:text-[var(--text-primary)] transition-all"
            title="Help & Shortcuts"
          >
            <HelpCircle size={18} />
          </div>
          <div 
            onClick={() => setShowSettings(!showSettings)}
            className="w-10 h-10 rounded-full text-[var(--text-secondary)] flex items-center justify-center cursor-pointer hover:bg-[var(--panel-border)] hover:text-[var(--text-primary)] transition-all"
            title="Preferences"
          >
            <Settings2 size={18} />
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden p-6 z-10">
        
        {/* Editor Overlay */}
        {editorFile ? (
          <div className="absolute inset-4 z-30 flex flex-col glass-panel rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="h-12 flex items-center justify-between px-6 border-b border-[var(--panel-border)] bg-[var(--panel-bg)]">
              <div className="flex items-center gap-3 text-sm font-mono text-[var(--text-secondary)]">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]"></span>
                <span className="text-[var(--text-primary)]">{editorFile}</span>
              </div>
              <div className="flex gap-3">
                <button onClick={saveEditor} className="text-xs font-mono px-4 py-1.5 bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 rounded-full border border-[var(--accent)]/20 transition-colors flex items-center gap-1.5">
                  <Save size={14} /> Save
                </button>
                <button onClick={() => { setEditorFile(null); setActiveFile(null); }} className="text-xs font-mono px-4 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-full border border-red-500/20 transition-colors flex items-center gap-1.5">
                  <X size={14} /> Close
                </button>
              </div>
            </div>
            <div className="flex-1 pt-4 pb-2">
              <Editor
                height="100%"
                theme={theme === 'paper' || theme === 'cream' ? 'vs-light' : 'vs-dark'}
                language="javascript"
                value={editorContent}
                onChange={(val) => setEditorContent(val || '')}
                options={{ 
                  minimap: { enabled: false }, 
                  padding: { top: 16 },
                  fontSize: fontSize,
                  fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
                }}
              />
            </div>
          </div>
        ) : null}

        {/* Image Preview Overlay */}
        {previewImage ? (
          <div className="absolute inset-4 z-30 flex flex-col glass-panel rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="h-12 flex items-center justify-between px-6 border-b border-[var(--panel-border)] bg-[var(--panel-bg)]">
              <div className="flex items-center gap-3 text-sm font-mono text-[var(--text-secondary)]">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]"></span>
                <span className="text-[var(--text-primary)]">{previewImage.file}</span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setPreviewImage(null); setActiveFile(null); }} className="text-xs font-mono px-4 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-full border border-red-500/20 transition-colors flex items-center gap-1.5">
                  <X size={14} /> Close
                </button>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center p-6 bg-black/20 overflow-auto">
              <img src={previewImage.src} alt={previewImage.file} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
            </div>
          </div>
        ) : null}

          {/* Terminal Instances */}
          <div className="flex-1 glass-panel rounded-3xl overflow-hidden relative shadow-2xl min-h-0 flex flex-col mb-4">
            {sessions.map(s => (
              <TerminalView 
                key={s.id} 
                id={s.id} 
                name={s.name}
                isActive={s.id === activeSessionId && !editorFile} 
                fontSize={fontSize} 
                themeName={theme}
              />
            ))}
          </div>

        {/* Bottom Input Area (No longer absolute, part of flex layout) */}
        <div className="w-full max-w-4xl mx-auto flex flex-col z-50 shrink-0 pb-2">
          
          {/* Quick Tools Bar */}
          <div className="flex items-center gap-2 mb-3 w-full pl-2">
            <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
              {quickTools.map((tool, i) => (
                <div key={i} className="relative group/tool shrink-0 flex items-center">
                  <button 
                    onClick={() => {
                      if (ipcRenderer) {
                        ipcRenderer.send('pty:write', activeSessionId, tool.cmd + '\r')
                      }
                    }}
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

          {/* Autocomplete Bubbles */}
          {suggestions.length > 0 && (
            <div className="flex gap-2 mb-3 px-2 overflow-x-auto no-scrollbar animate-in slide-in-from-bottom-2">
              {suggestions.slice(0, 5).map((s, i) => (
                <button 
                  key={i} 
                  onClick={() => {
                    const parts = input.split(' ')
                    parts[parts.length - 1] = s
                    setInput(parts.join(' '))
                    setSuggestions([])
                  }}
                  className="shrink-0 px-4 py-2 text-sm font-mono glass-panel glass-glow rounded-xl text-[var(--text-primary)] transition-all hover:bg-[var(--panel-border-glow)]"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Prompt Box */}
          <div className="relative group w-full">
            <div className="absolute -inset-[1px] bg-gradient-to-r from-[var(--accent)] via-purple-500 to-[var(--accent)] rounded-2xl blur-md opacity-20 group-focus-within:opacity-50 transition duration-500 pointer-events-none"></div>
            <div className="relative flex flex-col glass-panel rounded-2xl shadow-2xl transition-all border border-[var(--panel-border)] bg-[var(--panel-bg)]/90 focus-within:bg-[var(--panel-bg)]">
              <textarea
                ref={textareaRef}
                className="w-full bg-transparent border-none outline-none text-[var(--text-primary)] text-[15px] font-mono placeholder:text-[var(--text-secondary)] resize-none overflow-y-auto p-4 leading-relaxed no-scrollbar"
                style={{ minHeight: '80px' }}
                placeholder="Ask Agent or type command..."
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              
              {/* Bottom Toolbar */}
              <div className="flex items-center justify-between px-3 pb-3 pt-1 border-t border-transparent group-focus-within:border-[var(--panel-border)]/50 transition-colors">
                 <div className="flex items-center gap-2 pl-1 opacity-70">
                    <Sparkles size={16} className="text-[var(--accent)]" />
                    <span className="text-[11px] text-[var(--text-secondary)] font-sans tracking-wide">Shift + Enter to add a new line</span>
                 </div>
                 
                 <div className="flex items-center gap-2">
                   {input.length > 0 && (
                     <button 
                       onClick={() => { setInput(''); setSuggestions([]); textareaRef.current?.focus(); }}
                       className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--panel-border)] transition-all flex items-center gap-1.5"
                       title="Clear input"
                     >
                       <X size={14} /> Clear
                     </button>
                   )}
                   <button 
                     onClick={handleSend}
                     className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${input.trim() ? 'bg-[var(--accent)] text-white shadow-md hover:opacity-90' : 'bg-[var(--panel-border)] text-[var(--text-secondary)]'}`}
                   >
                     <span className="text-[13px] font-medium">Send</span>
                     <Send size={14} />
                   </button>
                 </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Right Sidebar (File Explorer) */}
      <div className="w-64 shrink-0 border-l border-[var(--panel-border)] flex flex-col z-40 bg-[var(--panel-bg)] backdrop-blur-xl relative">
        <div className="absolute top-0 left-0 w-full h-8 z-50 pointer-events-none" style={{ WebkitAppRegion: 'drag' } as any}></div>
        
        {/* Header / Path */}
        <div className="h-12 border-b border-[var(--panel-border)] flex items-center px-4 shrink-0 gap-2 mt-8 bg-[var(--bg-base)]/50">
          <button 
            onClick={handleParentDir} 
            className="p-1 hover:bg-[var(--panel-border-glow)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="Go up"
          >
            <ArrowUp size={16} />
          </button>
          <div 
            className="text-[13px] font-mono text-[var(--text-primary)] truncate flex-1 flex items-center gap-1 cursor-default" 
            title={currentDir}
          >
            <Folder size={12} className="text-blue-400 opacity-80" />
            <span>{currentDir === '/' ? '/' : currentDir.split('/').pop()}</span>
          </div>
        </div>

        {/* File List */}
        <div 
          className="flex-1 overflow-y-auto p-3 space-y-0.5 no-scrollbar pb-24"
          onContextMenu={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault()
              e.stopPropagation()
              if (ipcRenderer) ipcRenderer.send('menu:show', 'general', { path: currentDir })
            }
          }}
        >
          {dirFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-[var(--text-secondary)] mt-12 opacity-60 gap-3">
              <Folder size={32} className="text-gray-500/50" />
              <div className="text-xs font-mono text-center px-4">
                暂无文件或无权限读取<br/>(无读写权限的系统目录会被过滤)
              </div>
            </div>
          ) : (
            dirFiles.map((file, i) => (
              <div 
                key={i}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', file.path)
                }}
                onClick={() => {
                  if (file.isDirectory) {
                    handleDirClick(file.path)
                  } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)) {
                    if (ipcRenderer) {
                      ipcRenderer.invoke('file:read-image', file.path).then((src: string | null) => {
                        if (src) {
                          setPreviewImage({ file: file.name, src })
                          setActiveFile(file.path)
                        }
                      })
                    }
                  } else if (/\.(txt|md|js|ts|jsx|tsx|json|html|css|py|java|c|cpp|go|rs|sh|bash|zsh|yml|yaml|xml|toml|csv|ini|conf)$/i.test(file.name) || file.name.startsWith('.')) {
                    setEditorFile(file.path)
                    setActiveFile(file.path)
                    if (ipcRenderer) {
                      ipcRenderer.invoke('file:read', file.path).then((content: string) => {
                        setEditorContent(content)
                      }).catch(() => {
                        setEditorContent('')
                      })
                    }
                  } else {
                    // unsupported file type
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (ipcRenderer) ipcRenderer.send('menu:show', 'file', file)
                }}
                className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer group transition-colors select-none ${
                  activeFile === file.path 
                    ? 'bg-[var(--accent)]/20 text-[var(--accent)]' 
                    : 'hover:bg-[var(--panel-border-glow)]'
                }`}
              >
                {file.isDirectory ? (
                  <Folder size={14} className={`shrink-0 transition-colors ${activeFile === file.path ? 'text-[var(--accent)]' : 'text-blue-400 group-hover:text-blue-300'}`} />
                ) : (
                  <File size={14} className={`shrink-0 transition-colors ${activeFile === file.path ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`} />
                )}
                <span className={`text-[13px] truncate font-mono tracking-tight transition-opacity ${activeFile === file.path ? 'text-[var(--accent)] opacity-100 font-medium' : 'text-[var(--text-primary)] opacity-90 group-hover:opacity-100'}`}>{file.name}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Settings Popover */}
      {showSettings && (
        <div className="absolute bottom-6 left-20 glass-panel rounded-2xl p-6 w-72 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-[var(--text-primary)]">偏好设置</h3>
            <button onClick={() => setShowSettings(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><X size={16} /></button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">主题风格 (Theme)</label>
              <div className="grid grid-cols-2 gap-2">
                {[{id: 'obsidian', name: '黑曜石'}, {id: 'neon', name: '霓虹粉紫'}, {id: 'paper', name: '纸质护眼'}, {id: 'cream', name: '奶白高亮'}].map(t => (
                  <button 
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${theme === t.id ? 'bg-[var(--accent)] text-white' : 'bg-[var(--panel-border)] text-[var(--text-primary)] hover:bg-[var(--panel-border-glow)]'}`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">终端字号 (Font Size)</label>
              <div className="flex items-center gap-3">
                <input 
                  type="range" 
                  min="12" max="24" 
                  value={fontSize} 
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="flex-1 accent-[var(--accent)]"
                />
                <span className="text-sm font-mono text-[var(--text-primary)] w-8 text-center">{fontSize}px</span>
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

      {/* Help Modal */}
      {showHelp && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative">
            <button 
              onClick={() => setShowHelp(false)}
              className="absolute top-6 right-6 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-2xl font-medium mb-6 text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles className="text-[var(--accent)]" /> 
              EasyTerminal 快捷操作指南
            </h2>

            <div className="space-y-6 text-[15px] leading-relaxed text-[var(--text-secondary)]">
              
              <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] p-4 rounded-2xl">
                <h4 className="text-[var(--text-primary)] font-medium mb-2 flex items-center gap-2">
                  <TerminalSquare size={16} className="text-blue-400" />
                  智能路径补全与模糊搜索
                </h4>
                <p>输入类似 <code className="text-[var(--accent)] bg-[var(--accent)]/10 px-1 rounded">cd /var/</code> 或 <code className="text-[var(--accent)] bg-[var(--accent)]/10 px-1 rounded">./</code> 这样的路径指令，输入框上方会立即弹出补全气泡。使用 <kbd className="font-mono text-xs border border-[var(--panel-border)] rounded px-1.5 py-0.5">Tab</kbd> 键即可快速补全最可能的路径。</p>
              </div>

              <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] p-4 rounded-2xl">
                <h4 className="text-[var(--text-primary)] font-medium mb-2 flex items-center gap-2">
                  <Save size={16} className="text-green-400" />
                  内联文本编辑 (拦截 Vim)
                </h4>
                <p>再也不需要在 CLI 里和 Vim 纠缠了！直接输入 <code className="text-[var(--accent)] bg-[var(--accent)]/10 px-1 rounded">vim filename.txt</code> 并回车，EasyTerminal 会自动拦截并在应用内展开一个带有代码高亮的 Monaco Editor 供您编辑。</p>
              </div>

              <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] p-4 rounded-2xl">
                <h4 className="text-[var(--text-primary)] font-medium mb-2 flex items-center gap-2">
                  <Command size={16} className="text-purple-400" />
                  系统级 Agent 灵动岛通知
                </h4>
                <p>我们提供了一个系统级全局置顶的悬浮岛，用于 Agent 操作确认。尝试输入 <code className="text-[var(--accent)] bg-[var(--accent)]/10 px-1 rounded">notify 是否确认删除文件？</code>，即可体验无需切屏的跨应用交互确认。</p>
              </div>

              <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] p-4 rounded-2xl">
                <h4 className="text-[var(--text-primary)] font-medium mb-2 flex items-center gap-2">
                  <Plus size={16} className="text-orange-400" />
                  拖拽文件与图片渲染
                </h4>
                <p>您可以直接将文件拖拽进应用，自动输入该文件的绝对路径。另外本终端支持现代图像渲染协议，通过某些 CLI 工具可直接在终端中显示图像输出。</p>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App