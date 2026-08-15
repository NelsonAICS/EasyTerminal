import { BrowserWindow } from 'electron'

/** Execute an isolated browser script for the browser tool surface. */
export async function executeBrowserScript(options: { url: string; script: string; timeout?: number }): Promise<string> {
  const { url, script, timeout = 30_000 } = options
  return new Promise((resolve, reject) => {
    const browserWindow = new BrowserWindow({
      width: 1024,
      height: 768,
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true, partition: 'workflow-browser' },
    })
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      try { browserWindow.destroy() } catch { /* ignore cleanup failure */ }
      reject(new Error('Browser execution timed out'))
    }, timeout)
    const cleanup = () => {
      clearTimeout(timer)
      try { browserWindow.destroy() } catch { /* ignore cleanup failure */ }
    }
    const fail = (message: string) => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error(message))
    }
    browserWindow.webContents.once('did-finish-load', () => {
      if (settled) return
      browserWindow.webContents.executeJavaScript(script).then((result) => {
        if (settled) return
        settled = true
        cleanup()
        resolve(String(result ?? ''))
      }).catch((error) => fail(`Script error: ${String(error)}`))
    })
    browserWindow.webContents.once('did-fail-load', (_event, _code, description) => fail(`Failed to load: ${description}`))
    browserWindow.loadURL(url).catch((error) => fail(`Navigation error: ${String(error)}`))
  })
}
