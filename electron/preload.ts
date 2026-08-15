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
  on: (channel: string, listener: (...args: unknown[]) => void) => void
  removeListener: (channel: string, listener: (...args: unknown[]) => void) => void
} | undefined

if (ipcRenderer) {
  ;(window as Window & { electronAPI?: Record<string, unknown> }).electronAPI = {
    ...(window as Window & { electronAPI?: Record<string, unknown> }).electronAPI,
    agentRespond: (response: unknown) => ipcRenderer.invoke('island:interaction-response', response),
    setIslandInteractive: (request: unknown) => ipcRenderer.invoke('island:set-interactive', request),
    jumpToTerminal: (terminalSessionId: string) => ipcRenderer.invoke('island:jump-to-terminal', terminalSessionId),
    workflowV2: {
      list: () => ipcRenderer.invoke('workflow-v2:list'),
      get: (workflowId: string, revision?: number) => ipcRenderer.invoke('workflow-v2:get', workflowId, revision),
      saveRevision: (definition: unknown) => ipcRenderer.invoke('workflow-v2:save-revision', definition),
      execute: (request: unknown) => ipcRenderer.invoke('workflow-v2:execute', request),
      cancel: (runId: string) => ipcRenderer.invoke('workflow-v2:cancel', { runId }),
      resumeConfirmation: (confirmationId: string, approved: boolean) => ipcRenderer.invoke('workflow-v2:resume-confirmation', { confirmationId, approved }),
      getRun: (runId: string) => ipcRenderer.invoke('workflow-v2:get-run', runId),
      listRuns: (workflowId?: string, limit?: number) => ipcRenderer.invoke('workflow-v2:runs', workflowId, limit),
      getPendingConfirmation: (runId: string) => ipcRenderer.invoke('workflow-v2:get-pending-confirmation', runId),
      listDefinitions: () => ipcRenderer.invoke('workflow-v2:node-definitions:published'),
      shellCommands: {
        list: () => ipcRenderer.invoke('workflow-v2:shell-commands:list'),
        saveDraft: (input: unknown) => ipcRenderer.invoke('workflow-v2:shell-commands:save-draft', input),
        test: (input: unknown) => ipcRenderer.invoke('workflow-v2:shell-commands:test', input),
        publish: (input: unknown) => ipcRenderer.invoke('workflow-v2:shell-commands:publish', input),
      },
      onEvent: (handler: (event: unknown) => void) => {
        const listener = (_event: unknown, payload: unknown) => handler(payload)
        ipcRenderer.on('workflow-v2:event', listener)
        return () => ipcRenderer.removeListener('workflow-v2:event', listener)
      },
    },
  }
}
