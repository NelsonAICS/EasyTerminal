import { useCallback, useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { ImageAddon } from '@xterm/addon-image'
import '@xterm/xterm/css/xterm.css'
import { getThemePreset } from './lib/themes'
// import AgentVisualizer from './AgentVisualizer'
// import type { AgentState } from './AgentVisualizer'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    require?: any;
  }
}

interface TerminalIpc {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  send: (channel: string, ...args: unknown[]) => void
  on: (channel: string, listener: (event: unknown, data: string) => void) => void
  removeListener: (channel: string, listener: (event: unknown, data: string) => void) => void
}

const ipcRenderer = (window.require ? window.require('electron').ipcRenderer : null) as TerminalIpc | null

interface TerminalViewProps {
  id: string
  name: string
  agentId?: string
  isActive: boolean
  fontSize: number
  themeName: string
  autoCaptureTerminal?: boolean
  autoAnalyzeContext?: boolean
}

export default function TerminalView({ id, name, isActive, fontSize, themeName, autoCaptureTerminal, autoAnalyzeContext }: TerminalViewProps) {
  const xtermRef = useRef<HTMLDivElement>(null)
  const termInstance = useRef<Terminal | null>(null)
  const fitAddon = useRef<FitAddon | null>(null)
  const resizeTerminalRef = useRef<() => void>(() => undefined)
  const [isReady, setIsReady] = useState(false)
  // const [agentState, setAgentState] = useState<AgentState>('idle')
  // const agentStateRef = useRef<AgentState>('idle')

  const updateAgentState = (newState: string) => {
    void newState
    // if (agentStateRef.current !== newState) {
    //   agentStateRef.current = newState
    //   setAgentState(newState)
    // }
  }

  // Auto-capture refs
  const captureBufferRef = useRef('')
  const captureDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Use a ref to keep track of the latest name to avoid stale closures in useEffect
  const nameRef = useRef(name)
  const autoCaptureRef = useRef(autoCaptureTerminal)
  const autoAnalyzeContextRef = useRef(autoAnalyzeContext)
  const isActiveRef = useRef(isActive)
  const fontSizeRef = useRef(fontSize)
  const themeNameRef = useRef(themeName)
  useEffect(() => {
    nameRef.current = name
  }, [name])
  useEffect(() => {
    autoCaptureRef.current = autoCaptureTerminal
  }, [autoCaptureTerminal])
  useEffect(() => {
    autoAnalyzeContextRef.current = autoAnalyzeContext
  }, [autoAnalyzeContext])
  useEffect(() => {
    isActiveRef.current = isActive
  }, [isActive])
  useEffect(() => {
    fontSizeRef.current = fontSize
  }, [fontSize])
  useEffect(() => {
    themeNameRef.current = themeName
  }, [themeName])

  const flushCaptureBuffer = useCallback(() => {
    const content = captureBufferRef.current.trim()
    if (!content || content.length < 50) return
    ipcRenderer?.invoke('context:save-snippet', content, `terminal:${id}`)
    // Auto-analyze if enabled
    if (autoAnalyzeContextRef.current) {
      ipcRenderer?.invoke('context:analyze', content).then((result: unknown) => {
        const analysisResult = result as { success?: boolean; analysis?: unknown }
        if (analysisResult.success) {
          window.dispatchEvent(new CustomEvent('context:analysis-complete', {
            detail: { sessionId: id, analysis: analysisResult.analysis }
          }))
        }
      }).catch(() => undefined)
    }
    captureBufferRef.current = ''
  }, [id])

  const exportToMarkdown = useCallback(() => {
    if (!termInstance.current || !ipcRenderer) return
    const buffer = termInstance.current.buffer.active
    let text = ''
    for (let i = 0; i < buffer.length; i++) {
      const line = buffer.getLine(i)
      if (line) text += `${line.translateToString(true)}\n`
    }
    text = text.replace(/\n+$/, '')
    ipcRenderer.send('export:save-file', {
      content: `\`\`\`sh\n${text}\n\`\`\``,
      format: 'md',
      defaultName: `terminal-${name}-${Date.now()}.md`,
    })
  }, [name])

  const exportToPDF = useCallback(() => {
    if (!termInstance.current || !ipcRenderer) return
    const buffer = termInstance.current.buffer.active
    let text = ''
    for (let i = 0; i < buffer.length; i++) {
      const line = buffer.getLine(i)
      if (line) text += `${line.translateToString(true)}\n`
    }
    text = text.replace(/\n+$/, '')
    const escapeHtml = (unsafe: string) => unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
    ipcRenderer.send('export:save-pdf', {
      htmlContent: `<html><body style="white-space:pre-wrap;font-family:monospace">${escapeHtml(text)}</body></html>`,
      defaultName: `terminal-${name}-${Date.now()}.pdf`,
    })
  }, [name])

  useEffect(() => {
    const handleExport = (event: Event) => {
      const detail = (event as CustomEvent<{ sessionId?: string; format?: string }>).detail
      if (detail?.sessionId === id) {
        if (detail.format === 'md') exportToMarkdown()
        if (detail.format === 'pdf') exportToPDF()
      }
    }
    window.addEventListener('export-terminal', handleExport)
    return () => window.removeEventListener('export-terminal', handleExport)
  }, [id, exportToMarkdown, exportToPDF])

  const buildTerminalOptions = (themeId: string, nextFontSize: number) => {
    const preset = getThemePreset(themeId)
    return {
      theme: {
        ...preset.terminal,
      },
      fontFamily: preset.terminalOptions?.fontFamily || '"JetBrains Mono", "Fira Code", "SF Mono", Menlo, Monaco, Consolas, monospace',
      fontSize: nextFontSize,
      fontWeight: preset.terminalOptions?.fontWeight ?? 400,
      fontWeightBold: preset.terminalOptions?.fontWeightBold ?? 700,
      lineHeight: preset.terminalOptions?.lineHeight ?? 1.4,
      letterSpacing: preset.terminalOptions?.letterSpacing ?? 0,
      cursorStyle: preset.terminalOptions?.cursorStyle ?? 'block',
      cursorWidth: preset.terminalOptions?.cursorWidth ?? 1,
      cursorBlink: true,
      allowTransparency: false,
    } as const
  }

  useEffect(() => {
    if (!ipcRenderer || !xtermRef.current) return

    const terminalOptions = buildTerminalOptions(themeNameRef.current, fontSizeRef.current)

    const term = new Terminal({
      ...terminalOptions,
    })
    
    const fit = new FitAddon()
    const imageAddon = new ImageAddon()
    term.loadAddon(fit)
    term.loadAddon(imageAddon)
    term.open(xtermRef.current)
    
    termInstance.current = term
    fitAddon.current = fit

    let lastCols = 0
    let lastRows = 0
    let frame = 0
    const fitAndResize = () => {
      if (!xtermRef.current?.offsetParent || xtermRef.current.clientWidth <= 0 || xtermRef.current.clientHeight <= 0) return
      fit.fit()
      const nextCols = term.cols
      const nextRows = term.rows
      if (nextCols !== lastCols || nextRows !== lastRows) {
        lastCols = nextCols
        lastRows = nextRows
        ipcRenderer.send('pty:resize', id, nextCols, nextRows)
      }
      setIsReady(true)
    }
    const scheduleFit = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(fitAndResize)
    }
    resizeTerminalRef.current = scheduleFit
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleFit) : null
    resizeObserver?.observe(xtermRef.current)
    const initialFitTimer = window.setTimeout(scheduleFit, 100)

    ipcRenderer.send('pty:create', id)

    let idleTimeout: ReturnType<typeof setTimeout> | null = null;
    let accumulatedOutput = '';
    let lastDispatchedCost = -1;
    let lastDispatchedTokens = -1;

    const checkIdleState = () => {
      if (!termInstance.current) return;
      const buffer = termInstance.current.buffer.active;
      const lastLine = buffer.getLine(buffer.baseY + buffer.cursorY)?.translateToString(true) || '';
      
      // If we are currently waiting for Island, keep waiting
      // if (agentStateRef.current === 'waiting') return;

      if (lastLine.match(/[%$#>]\s*$/)) {
        updateAgentState('idle');
      } else {
        updateAgentState('thinking');
      }
    };

    const handleData = (_event: unknown, data: string) => {
      term.write(data)
      
      // Accumulate output for token/cost parsing
      // Remove ANSI escape codes to make parsing more robust
      const cleanData = data.replace(new RegExp(String.fromCharCode(27) + '\\[[0-9;]*[a-zA-Z]', 'g'), '')
      accumulatedOutput += cleanData;
      if (accumulatedOutput.length > 5000) accumulatedOutput = accumulatedOutput.slice(-5000);
      
      // More robust regex for Cost and Tokens matching various CLI tools (Claude Code, Cursor, Aider, etc.)
      const costMatch = accumulatedOutput.match(/(?:Cost|Billing|Spend|Usage|Total)[\s\S]{0,30}?\$([0-9.]+)/i) || 
                        accumulatedOutput.match(/\$([0-9.]+)\s*(?:Cost|Billing|Spend|Usage|Total)/i);
                        
      const tokenMatch = accumulatedOutput.match(/(?:Tokens|Usage)[\s\S]{0,30}?(?:In|Out|Total)?[\s:=-]+([0-9]+[.,]?[0-9]*[kKmM]?)/i) ||
                         accumulatedOutput.match(/([0-9]+[.,]?[0-9]*[kKmM]?)\s*tokens?/i);
      
      // Temporary debug logging to see what we are actually receiving from Claude Code / MiniMax
      // This will print to the DevTools console
      if (data.toLowerCase().includes('cost') || data.toLowerCase().includes('token') || data.includes('$')) {
        console.log('[EasyTerminal Analytics] Captured raw chunk:', JSON.stringify(data));
        console.log('[EasyTerminal Analytics] Accumulated Output context:', JSON.stringify(accumulatedOutput.slice(-200)));
      }
      
      let newCost = -1;
      let newTokens = -1;
      
      if (costMatch) {
        newCost = parseFloat(costMatch[1]);
      }
      
      if (tokenMatch) {
        const t = tokenMatch[1].toLowerCase().replace(/,/g, '');
        if (t.endsWith('m')) newTokens = parseFloat(t) * 1000000;
        else if (t.endsWith('k')) newTokens = parseFloat(t) * 1000;
        else newTokens = parseFloat(t);
      }
      
      if ((newCost !== -1 && newCost !== lastDispatchedCost) ||
          (newTokens !== -1 && newTokens !== lastDispatchedTokens)) {

        lastDispatchedCost = newCost;
        lastDispatchedTokens = newTokens;

        window.dispatchEvent(new CustomEvent('session-analytics', {
          detail: {
            sessionId: id,
            cost: newCost !== -1 ? newCost : undefined,
            tokens: newTokens !== -1 ? newTokens : undefined
          }
        }));
      }

      // Auto-capture terminal output to context
      if (autoCaptureRef.current) {
        captureBufferRef.current += cleanData;
        if (captureBufferRef.current.length > 20000) {
          captureBufferRef.current = captureBufferRef.current.slice(-15000);
        }
        if (captureDebounceRef.current) clearTimeout(captureDebounceRef.current);
        captureDebounceRef.current = setTimeout(flushCaptureBuffer, 2000);
      }

      const lowerData = data.toLowerCase();
      if (lowerData.includes('error') || lowerData.includes('exception') || lowerData.includes('failed')) {
        updateAgentState('error');
      } else {
        // if (agentStateRef.current !== 'error') {
        updateAgentState('working');
        // }
      }

      if (idleTimeout) clearTimeout(idleTimeout);
      idleTimeout = setTimeout(checkIdleState, 2000);

    }
    ipcRenderer.on(`pty:data:${id}`, handleData)

    term.onData((data) => {
      if (isActiveRef.current) {
        ipcRenderer.send('pty:write', id, data)
      }
    })

    window.addEventListener('resize', scheduleFit)

    // Handle direct terminal writes (e.g. image insertion via OSC 1337)
    const handleWriteDirect = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (termInstance.current && typeof detail === 'string') {
        termInstance.current.write(detail)
      }
    }
    window.addEventListener(`terminal:write:${id}`, handleWriteDirect)

    return () => {
      if (captureDebounceRef.current) clearTimeout(captureDebounceRef.current)
      if (captureBufferRef.current.trim().length > 50) flushCaptureBuffer()
      ipcRenderer.removeListener(`pty:data:${id}`, handleData)
      window.removeEventListener('resize', scheduleFit)
      resizeObserver?.disconnect()
      window.clearTimeout(initialFitTimer)
      cancelAnimationFrame(frame)
      resizeTerminalRef.current = () => undefined
      window.removeEventListener(`terminal:write:${id}`, handleWriteDirect)
      term.dispose()
    }
  }, [id, flushCaptureBuffer]) // Initialize once per ID

  // Handle activation changes
  useEffect(() => {
    if (isActive && isReady && fitAddon.current && termInstance.current) {
      // Small delay allows the DOM to render before measuring
      requestAnimationFrame(() => {
        if (xtermRef.current?.offsetParent) {
          resizeTerminalRef.current()
          termInstance.current?.focus()
        }
      })
    }
  }, [id, isActive, isReady])

  // Handle theme changes
  useEffect(() => {
    if (termInstance.current) {
      const terminalOptions = buildTerminalOptions(themeName, fontSize)
      termInstance.current.options.theme = terminalOptions.theme
      termInstance.current.options.fontFamily = terminalOptions.fontFamily
      termInstance.current.options.fontWeight = terminalOptions.fontWeight
      termInstance.current.options.fontWeightBold = terminalOptions.fontWeightBold
      termInstance.current.options.lineHeight = terminalOptions.lineHeight
      termInstance.current.options.letterSpacing = terminalOptions.letterSpacing
      termInstance.current.options.cursorStyle = terminalOptions.cursorStyle
      termInstance.current.options.cursorWidth = terminalOptions.cursorWidth
      termInstance.current.refresh(0, termInstance.current.rows - 1)
    }
  }, [themeName, fontSize])

  // Handle font size changes with requestAnimationFrame for smooth slider
  useEffect(() => {
    if (termInstance.current && isReady) {
      termInstance.current.options.fontSize = fontSize
      requestAnimationFrame(() => {
        if (fitAddon.current && xtermRef.current?.offsetParent) {
          resizeTerminalRef.current()
        }
      })
    }
  }, [fontSize, id, isReady])

  return (
    <div 
      className="w-full h-full p-4 pl-5 absolute inset-0" 
      style={{ opacity: isActive ? 1 : 0, pointerEvents: isActive ? 'auto' : 'none', zIndex: isActive ? 10 : 0 }}
    >
      <div ref={xtermRef} className="w-full h-full" />
      
      {/* Agent Visualizer (Disabled per user request) */}
      {/* <AgentVisualizer agentId={agentId} state={agentState} /> */}
    </div>
  )
}
