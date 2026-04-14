import { useState, useEffect } from 'react'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    require?: any;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PromptData = { message: string, options: any[], sessionId: string, sessionName?: string }

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null

type IslandState = 'hidden' | 'dot' | 'collapsed' | 'expanded'

export default function Island() {
  const [islandState, setIslandState] = useState<IslandState>('hidden')
  const [prompts, setPrompts] = useState<PromptData[]>([])
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)

  const currentPrompt = prompts[currentPromptIndex]
  const message = currentPrompt?.message || ''
  const options = currentPrompt?.options || []
  const sessionId = currentPrompt?.sessionId || null
  const sessionName = currentPrompt?.sessionName || ''

  useEffect(() => {
    if (!ipcRenderer) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleShow = (_: any, msg: string) => {
      setPrompts([{ message: msg, options: [], sessionId: 'system', sessionName: 'System' }])
      setCurrentPromptIndex(0)
      setIslandState('expanded')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlePrompt = (_: any, data: PromptData) => {
      setPrompts(prev => {
        const existingIndex = prev.findIndex(p => p.sessionId === data.sessionId)
        if (existingIndex >= 0) {
          const newPrompts = [...prev]
          newPrompts[existingIndex] = data
          return newPrompts
        } else {
          const newPrompts = [...prev, data]
          // If we were empty or only had system prompt, jump to the new one
          if (prev.length === 0 || prev[0].sessionId === 'system') {
            setCurrentPromptIndex(newPrompts.length - 1)
          }
          return newPrompts
        }
      })
      setIslandState('expanded')
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleStatus = (_: any, msg: string) => {
      setPrompts([{ message: msg, options: [], sessionId: 'system', sessionName: 'System' }])
      setCurrentPromptIndex(0)
      setIslandState('collapsed')
    }

    ipcRenderer.on('island:show', handleShow)
    ipcRenderer.on('island:prompt', handlePrompt)
    ipcRenderer.on('island:status', handleStatus)

    return () => {
      ipcRenderer.removeListener('island:show', handleShow)
      ipcRenderer.removeListener('island:prompt', handlePrompt)
      ipcRenderer.removeListener('island:status', handleStatus)
    }
  }, [])

  // Handle auto-dismiss logic
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    setCountdown(null); // Reset countdown on prompt change

    if (islandState === 'expanded' && prompts.length > 0) {
      const currentPrompt = prompts[currentPromptIndex];
      // Only auto-dismiss alerts (like Privacy Alert) that have the 'ok' or no options
      if (currentPrompt.sessionName === 'Privacy Alert' || currentPrompt.sessionId === 'system') {
        const isConfirmOnly = currentPrompt.options?.length === 1 && currentPrompt.options[0].key === 'ok';
        const hasNoOptions = !currentPrompt.options || currentPrompt.options.length === 0;
        
        if (isConfirmOnly || hasNoOptions) {
          setCountdown(3);
          intervalId = setInterval(() => {
            setCountdown((prev) => {
              if (prev === null) return null;
              if (prev <= 1) {
                clearInterval(intervalId);
                handleAction('ok');
                return null;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [islandState, prompts, currentPromptIndex]);

  const handleAction = (action: string | string[]) => {
    if (ipcRenderer && sessionId && sessionId !== 'system') {
      ipcRenderer.send('island:action', action, sessionId)
    }
    
    // Close current prompt
    setPrompts(prev => {
      if (prev.length <= 1) {
        setIslandState('hidden')
        if (ipcRenderer) ipcRenderer.send('island:set-ignore-mouse-events', true)
        return []
      }
      return prev.filter((_, i) => i !== currentPromptIndex)
    })
    setCurrentPromptIndex(Math.max(0, currentPromptIndex - 1))
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPrompts(prev => {
      const newPrompts = prev.filter((_, idx) => idx !== currentPromptIndex)
      if (newPrompts.length === 0) {
        setIslandState('hidden')
        if (ipcRenderer) ipcRenderer.send('island:set-ignore-mouse-events', true)
        return []
      }
      
      const newIndex = Math.max(0, currentPromptIndex - 1)
      setCurrentPromptIndex(newIndex)
      return newPrompts
    })
  }

  const handleSingleClick = () => {
    if (islandState === 'dot') setIslandState('collapsed')
    else if (islandState === 'collapsed') setIslandState('expanded')
    else if (islandState === 'expanded') setIslandState('collapsed')
  }

  const handleDoubleClick = () => {
    if (islandState === 'collapsed' || islandState === 'expanded') {
      setIslandState('dot')
    }
  }

  const handleMouseEnter = () => {
    if (ipcRenderer) {
      ipcRenderer.send('island:set-ignore-mouse-events', false)
    }
  }

  const handleMouseLeave = () => {
    if (ipcRenderer) {
      ipcRenderer.send('island:set-ignore-mouse-events', true)
    }
  }

  // --- Drag and Drop Handlers for Context Collection ---
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    if (islandState !== 'expanded') {
      setIslandState('expanded');
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) setIsDragOver(true);
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    // Get text from drop
    const text = e.dataTransfer.getData('text/plain');
    if (text && text.trim() && ipcRenderer) {
      // Create a temporary loading prompt
      setPrompts([{ message: 'Saving dropped context...', options: [], sessionId: 'system', sessionName: 'System' }]);
      setCurrentPromptIndex(0);
      setIslandState('expanded');
      
      // We will listen for the result
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ipcRenderer.once('island:save-result', (_event: any, result: { success: boolean, filePath?: string, reason?: string, isSensitive?: boolean }) => {
        if (result.success) {
          if (result.isSensitive) {
            setPrompts([{ message: `⚠️ 已保存，但检测到可能包含敏感隐私（如账号、资产等），请注意数据安全。`, options: [], sessionId: 'system', sessionName: 'Privacy Alert' }]);
          } else {
            setPrompts([{ message: `✅ Context saved successfully!\n\nExtracted tags applied.`, options: [], sessionId: 'system', sessionName: 'System' }]);
          }
        } else {
          setPrompts([{ message: `❌ Context ignored or error occurred.`, options: [], sessionId: 'system', sessionName: 'System' }]);
        }
      });

      ipcRenderer.send('island:save-context', { text, source: 'DragDropIsland' });
    } else {
      // Revert state if no text
      if (prompts.length === 0) {
        setIslandState('hidden');
        if (ipcRenderer) ipcRenderer.send('island:set-ignore-mouse-events', true);
      }
    }
  }
  // ----------------------------------------------------

  return (
    <div 
      className="w-screen h-screen flex justify-center items-start pt-3 overflow-hidden bg-transparent" 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style={{ WebkitAppRegion: 'drag' } as any}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div 
        className={`relative group transition-all duration-500 ease-[cubic-bezier(0.25,1,0.25,1)] ${islandState === 'hidden' ? 'opacity-0 -translate-y-10 scale-95 pointer-events-none' : 'opacity-100 translate-y-0 scale-100'}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div 
          onClick={handleSingleClick}
          onDoubleClick={handleDoubleClick}
          className={`relative bg-[#151517]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),_0_20px_50px_rgba(0,0,0,0.6)] border flex flex-col items-center justify-center pointer-events-auto transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden cursor-pointer
            ${isDragOver ? 'border-blue-500/80 bg-blue-900/40 scale-105' : 'border-white/5'}
            ${islandState === 'dot' ? 'w-10 h-10 rounded-full' : ''}
            ${islandState === 'collapsed' ? 'w-[280px] h-11 rounded-full' : ''}
            ${islandState === 'expanded' ? 'w-[420px] rounded-[32px]' : ''}
            ${islandState === 'hidden' ? 'w-10 h-10 rounded-full' : ''}
          `} 
          style={{ 
            WebkitAppRegion: 'no-drag',
            height: islandState === 'expanded' ? 'auto' : undefined,
            minHeight: islandState === 'expanded' ? '160px' : undefined
          } as React.CSSProperties}
        >
          
          {/* Dot State */}
          <div className={`absolute transition-all duration-400 ${islandState === 'dot' ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}`}>
            <div className="w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.9)] animate-pulse"></div>
          </div>

          {/* Collapsed State */}
          <div className={`absolute w-full px-6 flex items-center justify-between gap-3 transition-all duration-400 ${islandState === 'collapsed' ? 'opacity-100 delay-200' : 'opacity-0 pointer-events-none'}`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse shrink-0"></span>
              <span className="text-[14px] font-medium text-white/90 truncate">{message || 'Agent active...'}</span>
            </div>
            <div className="flex gap-1 shrink-0">
              <div className="w-1 h-3 rounded-full bg-white/40 animate-[bounce_1s_infinite_0ms]"></div>
              <div className="w-1 h-4 rounded-full bg-white/60 animate-[bounce_1s_infinite_100ms]"></div>
              <div className="w-1 h-2 rounded-full bg-white/40 animate-[bounce_1s_infinite_200ms]"></div>
            </div>
          </div>

          {/* Expanded State */}
          <div className={`relative w-full h-full p-6 flex flex-col gap-5 transition-all duration-400 ${islandState === 'expanded' ? 'opacity-100 delay-200' : 'opacity-0 absolute pointer-events-none'}`}>
            {isDragOver ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                </div>
                <span className="text-[15px] font-medium text-blue-400">Drop text to save context</span>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.9)] animate-pulse shrink-0"></span>
                      <span className="text-[13px] font-semibold text-white/60 uppercase tracking-widest">
                        {sessionName ? `Agent [${sessionName}]` : 'Agent Action Required'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {prompts.length > 1 && (
                        <div className="flex items-center gap-2 mr-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setCurrentPromptIndex(Math.max(0, currentPromptIndex - 1)) }}
                            disabled={currentPromptIndex === 0}
                            className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-all text-white/70"
                          >
                            {'<'}
                          </button>
                          <span className="text-[12px] font-medium text-white/50">{currentPromptIndex + 1}/{prompts.length}</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setCurrentPromptIndex(Math.min(prompts.length - 1, currentPromptIndex + 1)) }}
                            disabled={currentPromptIndex === prompts.length - 1}
                            className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-all text-white/70"
                          >
                            {'>'}
                          </button>
                        </div>
                      )}
                      <button 
                        onClick={handleClose}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all"
                        title="Dismiss"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  </div>
                  <span className="text-[15px] font-medium text-white leading-relaxed break-words whitespace-pre-wrap">{message || 'Please make a selection to continue.'}</span>
                </div>

                <div className="flex flex-col gap-2 mt-auto pb-1">
                  {options && options.length > 0 ? (
                    options.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={(e) => { e.stopPropagation(); handleAction(opt.actionSequence || opt.key) }}
                        className="w-full py-2.5 px-4 bg-white/10 border border-white/5 rounded-2xl text-left text-[14px] font-medium text-white hover:bg-white/20 transition-all shadow-sm active:scale-95 flex flex-col justify-center"
                        title={opt.description ? `${opt.label}\n${opt.description}` : opt.label}
                      >
                        <span className="truncate max-w-full block font-semibold">
                          {opt.label}
                          {countdown !== null && opt.key === 'ok' ? ` (${countdown}s)` : ''}
                        </span>
                        {opt.description && (
                          <span className="text-[12px] text-white/50 truncate max-w-full block mt-0.5 font-normal leading-tight">
                            {opt.description}
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    sessionId !== 'system' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAction('approve') }}
                          className="flex-1 py-2.5 px-4 bg-blue-500/20 border border-blue-500/30 rounded-2xl text-[14px] font-medium text-blue-400 hover:bg-blue-500/30 transition-all shadow-sm active:scale-95"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAction('deny') }}
                          className="flex-1 py-2.5 px-4 bg-red-500/20 border border-red-500/30 rounded-2xl text-[14px] font-medium text-red-400 hover:bg-red-500/30 transition-all shadow-sm active:scale-95"
                        >
                          Cancel
                        </button>
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}