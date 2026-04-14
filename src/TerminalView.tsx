import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { ImageAddon } from '@xterm/addon-image'
import '@xterm/xterm/css/xterm.css'
import { getThemePreset } from './lib/themes'
// import AgentVisualizer from './AgentVisualizer'
// import type { AgentState } from './AgentVisualizer'

declare global {
  interface Window {
    require?: any;
  }
}

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null

interface TerminalViewProps {
  id: string
  name: string
  agentId?: string
  isActive: boolean
  fontSize: number
  themeName: string
}

export default function TerminalView({ id, name, isActive, fontSize, themeName }: TerminalViewProps) {
  const xtermRef = useRef<HTMLDivElement>(null)
  const termInstance = useRef<Terminal | null>(null)
  const fitAddon = useRef<FitAddon | null>(null)
  const [isReady, setIsReady] = useState(false)
  // const [agentState, setAgentState] = useState<AgentState>('idle')
  // const agentStateRef = useRef<AgentState>('idle')

  const updateAgentState = (_newState: any) => {
    // if (agentStateRef.current !== newState) {
    //   agentStateRef.current = newState
    //   setAgentState(newState)
    // }
  }

  // Use a ref to keep track of the latest name to avoid stale closures in useEffect
  const nameRef = useRef(name)
  useEffect(() => {
    nameRef.current = name
  }, [name])

  useEffect(() => {
    const handleExport = (e: any) => {
      if (e.detail?.sessionId === id) {
        if (e.detail.format === 'md') exportToMarkdown();
        if (e.detail.format === 'pdf') exportToPDF();
      }
    };
    window.addEventListener('export-terminal', handleExport);
    return () => window.removeEventListener('export-terminal', handleExport);
  }, [id, name]);

  const exportToMarkdown = () => {
    if (!termInstance.current || !ipcRenderer) return
    const buffer = termInstance.current.buffer.active
    let text = ''
    for (let i = 0; i < buffer.length; i++) {
      const line = buffer.getLine(i)
      if (line) {
        text += line.translateToString(true) + '\n'
      }
    }
    text = text.replace(/\n+$/, '')
    const markdown = `\`\`\`sh\n${text}\n\`\`\``
    ipcRenderer.send('export:save-file', {
      content: markdown,
      format: 'md',
      defaultName: `terminal-${name}-${Date.now()}.md`
    })
  }

  const exportToPDF = () => {
    if (!termInstance.current || !ipcRenderer) return
    const buffer = termInstance.current.buffer.active
    let text = ''
    for (let i = 0; i < buffer.length; i++) {
      const line = buffer.getLine(i)
      if (line) {
        text += line.translateToString(true) + '\n'
      }
    }
    text = text.replace(/\n+$/, '')
    
    // Securely escape HTML characters to prevent XSS
    const escapeHtml = (unsafe: string) => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
    
    const safeText = escapeHtml(text)

    const htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              background-color: #ffffff;
              color: #333333;
              font-family: "JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace;
              padding: 20px;
              font-size: 12px;
              line-height: 1.5;
              white-space: pre-wrap;
              word-wrap: break-word;
            }
          </style>
        </head>
        <body>${safeText}</body>
      </html>
    `
    ipcRenderer.send('export:save-pdf', {
      htmlContent,
      defaultName: `terminal-${name}-${Date.now()}.pdf`
    })
  }

  const buildTerminalOptions = (themeId: string, nextFontSize: number) => {
    const preset = getThemePreset(themeId)
    return {
      theme: {
        background: 'transparent',
        ...preset.terminal,
      },
      // Keep terminal geometry stable across themes.
      fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Menlo, Monaco, Consolas, monospace',
      fontSize: nextFontSize,
      fontWeight: preset.terminalOptions?.fontWeight ?? 400,
      fontWeightBold: preset.terminalOptions?.fontWeightBold ?? 700,
      lineHeight: 1.4,
      letterSpacing: 0,
      cursorStyle: preset.terminalOptions?.cursorStyle ?? 'block',
      cursorWidth: preset.terminalOptions?.cursorWidth ?? 1,
      cursorBlink: true,
      allowTransparency: true,
    } as const
  }

  useEffect(() => {
    if (!ipcRenderer || !xtermRef.current) return

    const terminalOptions = buildTerminalOptions(themeName, fontSize)

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

    // Delay fitting until the container actually has dimensions
    setTimeout(() => {
      fit.fit()
      setIsReady(true)
    }, 100)

    ipcRenderer.send('pty:create', id)

    let parseTimeout: ReturnType<typeof setTimeout> | null = null
    let lastPromptHash: string | null = null
    
    const parseTerminalScreen = () => {
      if (!isActive) return
      const buffer = term.buffer.active
      const lines = []
      const start = Math.max(0, buffer.baseY + buffer.cursorY - 20)
      const end = Math.min(buffer.length - 1, buffer.baseY + buffer.cursorY + 5)
      
      for (let i = start; i <= end; i++) {
        const line = buffer.getLine(i)
        if (line) lines.push(line.translateToString(true))
      }
      const text = lines.join('\n')

      // Detect interactive menus (like Inquirer.js or Claude Code)
      const isInteractive = text.includes('Enter to select') || text.includes('Use arrow keys') || text.includes('?');
      
      if (isInteractive) {
        const linesArr = text.split('\n');
        const options: any[] = [];
        let selectedIndex = 0;
        let question = 'Agent Interaction Required';

        let selectedLineIndex = -1;
        let isPureInputPrompt = false;

        // Search from bottom to top to always find the newest prompt
        for (let i = linesArr.length - 1; i >= 0; i--) {
          // Match standard option line (like > 1. Yes)
          if (linesArr[i].match(/^[\s│]*[>❯●◉]/)) {
            selectedLineIndex = i;
            // If the line only contains the prompt cursor and maybe spaces, it's an input prompt
            if (linesArr[i].match(/^[\s│]*[>❯●◉]\s*$/)) {
              isPureInputPrompt = true;
            }
            break;
          }
        }

        if (selectedLineIndex !== -1 && !isPureInputPrompt) {
          // Check if there is a shell prompt after this option block, meaning it's a dead prompt
          let isDeadPrompt = false;
          for (let i = selectedLineIndex + 1; i < linesArr.length; i++) {
            if (linesArr[i].match(/[%$#]\s*$/) || linesArr[i].includes('Aborted')) {
              isDeadPrompt = true;
              break;
            }
          }

          if (isDeadPrompt) {
            selectedLineIndex = -1;
          }
        }

        if (selectedLineIndex !== -1 && !isPureInputPrompt) {
          // Find options block boundaries FIRST
          let start = selectedLineIndex;
          while (start > 0) {
            const prevLine = linesArr[start - 1];
            if (prevLine.includes('选择：') || prevLine.includes('?')) break;
            
            const hasMarker = /^[\s│]*([>❯●◉○]\s+|\d+\.\s+)/.test(prevLine);
            const isIndented = /^[\s│]*\s{2,}/.test(prevLine);
            
            if (prevLine.trim() !== '' && !hasMarker && !isIndented) break;
            start--;
          }
          
          let end = selectedLineIndex;
          while (end < linesArr.length - 1) {
            if (linesArr[end + 1].includes('Enter to select') || linesArr[end + 1].includes('Esc to cancel')) break;
            
            const nextLine = linesArr[end + 1];
            const hasMarker = /^[\s│]*([>❯●◉○]\s+|\d+\.\s+)/.test(nextLine);
            const isIndented = /^[\s│]*\s{2,}/.test(nextLine);
            if (nextLine.trim() !== '' && !hasMarker && !isIndented) break;
            
            end++;
          }

          // Extract question block by finding the nearest non-empty text block above the options
          let qEnd = start - 1;
          while (qEnd >= 0 && (linesArr[qEnd].trim() === '' || /^[─-]{2,}$/.test(linesArr[qEnd].trim()) || /^│\s*[─-]{2,}/.test(linesArr[qEnd]))) {
            qEnd--;
          }
          
          if (qEnd >= 0) {
            let qStart = qEnd;
            while (qStart > 0 && linesArr[qStart - 1].trim() !== '' && !/^[─-]{2,}$/.test(linesArr[qStart - 1].trim()) && !/^│\s*[─-]{2,}/.test(linesArr[qStart - 1])) {
              qStart--;
            }
            question = linesArr.slice(qStart, qEnd + 1)
              .map(l => l.replace(/^[\s│□]+/, '').trim()) // Remove box drawing characters
              .filter(l => l !== '')
              .join('\n').trim();
          }
          
          let currentOpt: any = null;
          for (let i = start; i <= end; i++) {
            const line = linesArr[i];
            if (line.trim() === '') continue;
            
            // Avoid treating normal log output like "  /Users/nelson" or "│  Agent is thinking" as options
            const match = line.match(/^[\s│]*([>❯●◉○]\s*)?(?:(\d+)\.\s+)?([^?]+)$/);
            if (match) {
              const indicator = match[1];
              const number = match[2];
              const label = match[3].trim();
              const isSelected = !!indicator && ['>', '❯', '●', '◉'].some(c => indicator.includes(c));
              
              // It's a valid option if it has a direct indicator or a number
              if (indicator || number) {
                // Filter out non-options and common terminal artifacts
                if (label.length > 0 && 
                    label !== 'Enter to select' && 
                    label !== 'Use arrow keys' && 
                    !label.includes('Security guide') &&
                    !label.includes('Tips for getting started') &&
                    !label.includes('Recent activity') &&
                    !label.startsWith('/') // Exclude paths like /Users/nelson
                ) {
                  currentOpt = { label, number, isSelected, description: '' };
                  options.push(currentOpt);
                  if (isSelected) selectedIndex = options.length - 1;
                }
              } else if (currentOpt && line.match(/^[\s│]{4,}/)) {
                // Multi-line option description support
                // Only append if it looks like a description (not a path, not a random log)
                if (label && !label.startsWith('/')) {
                  currentOpt.description += (currentOpt.description ? ' ' : '') + label;
                }
              }
            }
          }
        } else if (isPureInputPrompt) {
          // It's a text input prompt, we should look upwards to see if it's asking a multiple choice question (A, B, C etc)
          let optEnd = selectedLineIndex - 1;
          while (optEnd >= 0) {
            const line = linesArr[optEnd].trim();
            if (line.match(/^([A-Za-z]|\d+)[).]\s+(.+)$/)) break;
            optEnd--;
          }
          
          if (optEnd >= 0) {
            let optStart = optEnd;
            while (optStart >= 0) {
              const line = linesArr[optStart].trim();
              if (!line.match(/^([A-Za-z]|\d+)[).]\s+(.+)$/) && line !== '') break;
              optStart--;
            }
            optStart++;
            
            for (let i = optStart; i <= optEnd; i++) {
              const line = linesArr[i].trim();
              if (line === '') continue;
              const match = line.match(/^([A-Za-z]|\d+)[).]\s+(.+)$/);
              if (match) {
                options.push({
                  label: match[2].trim(),
                  number: match[1], // We use the letter/number as the shortcut
                  isSelected: false,
                  description: ''
                });
              }
            }
            
            let qEnd = optStart - 1;
            while (qEnd >= 0 && linesArr[qEnd].trim() === '') qEnd--;
            
            if (qEnd >= 0) {
              let qStart = qEnd;
              while (qStart > 0 && linesArr[qStart - 1].trim() !== '') qStart--;
              question = linesArr.slice(qStart, qEnd + 1).map(l => l.replace(/^[\s│□]+/, '').trim()).join('\n').trim();
            }
          }
        }

        const isRealPrompt = options.length > 1 || options.some(opt => /^(yes|no|y|n|cancel|exit|confirm|approve|deny|ok|continue)$/i.test(opt.label));

        if (isRealPrompt && (options.some(o => o.isSelected || o.number) || isPureInputPrompt)) {
          const hasIndicator = options.some(o => o.isSelected);
          
          const formattedOptions = options.map((opt, idx) => {
            let actionStrokes: string[] = [];
            
            if (hasIndicator) {
              const moveOffset = idx - selectedIndex;
              if (moveOffset > 0) {
                for(let i=0; i<moveOffset; i++) actionStrokes.push('\x1b[B');
              } else if (moveOffset < 0) {
                for(let i=0; i<Math.abs(moveOffset); i++) actionStrokes.push('\x1b[A');
              }
              actionStrokes.push('\r');
            } else if (opt.number) {
              actionStrokes.push(opt.number, '\r');
            } else {
              const lowerLabel = opt.label.toLowerCase();
              if (lowerLabel.startsWith('yes') || lowerLabel === 'y') {
                actionStrokes.push('y', '\r');
              } else if (lowerLabel.startsWith('no') || lowerLabel === 'n') {
                actionStrokes.push('n', '\r');
              } else {
                actionStrokes.push('\r');
              }
            }

            return {
              key: `opt_${idx}`,
              label: opt.number ? `${opt.number}. ${opt.label}` : opt.label,
              description: opt.description,
              actionSequence: actionStrokes
            };
          });

          // Create a signature based ONLY on the question, ignoring options changes during answering/animations
          // Use absoluteLine so if an identical question appears lower in the buffer, it's treated as new
          const absoluteLine = start + selectedLineIndex;
          const promptSignature = JSON.stringify({ question, absoluteLine });

          if (promptSignature !== lastPromptHash) {
            lastPromptHash = promptSignature;
            updateAgentState('waiting')
            ipcRenderer.send('island:prompt', { message: question, options: formattedOptions, sessionId: id, sessionName: nameRef.current })
          }
        } else {
          lastPromptHash = null;
        }
      } else {
        lastPromptHash = null;
      }
    }

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

    const handleData = (_: any, data: string) => {
      term.write(data)
      
      // Accumulate output for token/cost parsing
      // Remove ANSI escape codes to make parsing more robust
      const cleanData = data.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
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
        let t = tokenMatch[1].toLowerCase().replace(/,/g, '');
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

      if (parseTimeout) clearTimeout(parseTimeout)
      parseTimeout = setTimeout(parseTerminalScreen, 150)
    }
    ipcRenderer.on(`pty:data:${id}`, handleData)

    term.onData((data) => {
      if (isActive) {
        ipcRenderer.send('pty:write', id, data)
      }
    })

    const handleResize = () => {
      if (fitAddon.current && termInstance.current && xtermRef.current?.offsetParent) {
        fitAddon.current.fit()
        ipcRenderer.send('pty:resize', id, termInstance.current.cols, termInstance.current.rows)
      }
    }
    window.addEventListener('resize', handleResize)

    // Handle direct terminal writes (e.g. image insertion via OSC 1337)
    const handleWriteDirect = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (termInstance.current && typeof detail === 'string') {
        termInstance.current.write(detail)
      }
    }
    window.addEventListener(`terminal:write:${id}`, handleWriteDirect)

    return () => {
      ipcRenderer.removeListener(`pty:data:${id}`, handleData)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener(`terminal:write:${id}`, handleWriteDirect)
      term.dispose()
    }
  }, [id]) // Initialize once per ID

  // Handle activation changes
  useEffect(() => {
    if (isActive && isReady && fitAddon.current && termInstance.current) {
      // Small delay allows the DOM to render before measuring
      requestAnimationFrame(() => {
        if (xtermRef.current?.offsetParent) {
          fitAddon.current?.fit()
          ipcRenderer?.send('pty:resize', id, termInstance.current!.cols, termInstance.current!.rows)
          termInstance.current?.focus()
        }
      })
    }
  }, [isActive, isReady])

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
          fitAddon.current.fit()
          ipcRenderer?.send('pty:resize', id, termInstance.current!.cols, termInstance.current!.rows)
        }
      })
    }
  }, [fontSize, isReady])

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
