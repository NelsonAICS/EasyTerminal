// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector: string, text: string) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency] as string)
  }
})

// The renderer currently runs with Electron's legacy nodeIntegration bridge.
// Keep the Agent interaction surface typed and narrow so new UI code does not
// need to reach into arbitrary ipcRenderer channels.
const electron = (window as Window & { require?: (name: string) => { ipcRenderer: unknown } }).require?.('electron')
const ipcRenderer = electron?.ipcRenderer as {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  send: (channel: string, ...args: unknown[]) => void
} | undefined

if (ipcRenderer) {
  ;(window as Window & { electronAPI?: Record<string, unknown> }).electronAPI = {
    ...(window as Window & { electronAPI?: Record<string, unknown> }).electronAPI,
    agentRespond: (response: unknown) => ipcRenderer.invoke('island:interaction-response', response),
    setIslandInteractive: (request: unknown) => ipcRenderer.invoke('island:set-interactive', request),
    jumpToTerminal: (terminalSessionId: string) => ipcRenderer.invoke('island:jump-to-terminal', terminalSessionId),
  }
}
