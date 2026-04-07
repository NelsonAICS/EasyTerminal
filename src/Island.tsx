import { useState, useEffect } from 'react'

declare global {
  interface Window {
    require?: any;
  }
}

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null

type IslandState = 'hidden' | 'dot' | 'collapsed' | 'expanded'

type PromptData = { message: string, options: any[], sessionId: string, sessionName?: string }

export default function Island() {
  const [islandState, setIslandState] = useState<IslandState>('hidden')
  const [prompts, setPrompts] = useState<PromptData[]>([])
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0)

  const currentPrompt = prompts[currentPromptIndex]
  const message = currentPrompt?.message || ''
  const options = currentPrompt?.options || []
  const sessionId = currentPrompt?.sessionId || null
  const sessionName = currentPrompt?.sessionName || ''

  useEffect(() => {
    if (!ipcRenderer) return

    const handleShow = (_: any, msg: string) => {
      setPrompts([{ message: msg, options: [], sessionId: 'system', sessionName: 'System' }])
      setCurrentPromptIndex(0)
      setIslandState('expanded')
    }

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

  const handleAction = (action: string | string[]) => {
    if (ipcRenderer && sessionId && sessionId !== 'system') {
      ipcRenderer.send('island:action', action, sessionId)
    }
    
    // Remove current prompt and decide next state
    setPrompts(prev => {
      const newPrompts = prev.filter((_, idx) => idx !== currentPromptIndex)
      if (newPrompts.length === 0) {
        setIslandState('hidden')
        if (ipcRenderer) ipcRenderer.send('island:set-ignore-mouse-events', true)
        return []
      }
      
      // If we have other prompts, jump to the previous one or 0
      const newIndex = Math.max(0, currentPromptIndex - 1)
      setCurrentPromptIndex(newIndex)
      return newPrompts
    })
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

  return (
    <div className="w-screen h-screen flex justify-center items-start pt-3 overflow-hidden bg-transparent" style={{ WebkitAppRegion: 'drag' } as any}>
      <div 
        className={`relative group transition-all duration-500 ease-[cubic-bezier(0.25,1,0.25,1)] ${islandState === 'hidden' ? 'opacity-0 -translate-y-10 scale-95 pointer-events-none' : 'opacity-100 translate-y-0 scale-100'}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div 
          onClick={handleSingleClick}
          onDoubleClick={handleDoubleClick}
          className={`relative bg-[#151517]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),_0_20px_50px_rgba(0,0,0,0.6)] border border-white/5 flex flex-col items-center justify-center pointer-events-auto transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden cursor-pointer
            ${islandState === 'dot' ? 'w-10 h-10 rounded-full' : ''}
            ${islandState === 'collapsed' ? 'w-[280px] h-11 rounded-full' : ''}
            ${islandState === 'expanded' ? 'w-[420px] rounded-[32px]' : ''}
            ${islandState === 'hidden' ? 'w-10 h-10 rounded-full' : ''}
          `} 
          style={{ 
            WebkitAppRegion: 'no-drag',
            height: islandState === 'expanded' ? 'auto' : undefined,
            minHeight: islandState === 'expanded' ? '160px' : undefined
          } as any}
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
                    <span className="truncate max-w-full block font-semibold">{opt.label}</span>
                    {opt.description && (
                      <span className="text-[12px] text-white/50 truncate max-w-full block mt-0.5 font-normal leading-tight">
                        {opt.description}
                      </span>
                    )}
                  </button>
                ))
              ) : (
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
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}