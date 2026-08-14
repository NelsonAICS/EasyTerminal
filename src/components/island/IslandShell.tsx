import type { MouseEvent, PropsWithChildren } from 'react'

export function IslandShell({ expanded, interactive, onClick, onMouseEnter, onMouseLeave, children }: PropsWithChildren<{ expanded: boolean; interactive: boolean; onClick?: (event: MouseEvent<HTMLDivElement>) => void; onMouseEnter?: () => void; onMouseLeave?: () => void }>) {
  return <div className={`island-shell ${expanded ? 'island-shell-expanded' : 'island-shell-collapsed'} ${interactive ? 'island-shell-interactive' : ''}`} onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
    {children}
  </div>
}
