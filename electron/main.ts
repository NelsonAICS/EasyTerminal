process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

import { app, BrowserWindow, ipcMain, nativeTheme, Menu, screen, dialog, nativeImage, globalShortcut, clipboard } from 'electron'
import { join, dirname, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as os from 'node:os'
import * as pty from 'node-pty'
import { exec, execSync } from 'child_process'
import * as fs from 'node:fs'
import { contextManager } from './context-manager'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Enable GPU Acceleration for better transparent window rendering on macOS
// app.disableHardwareAcceleration()

// Force dark theme for a consistent, sleek terminal look
nativeTheme.themeSource = 'dark'

let win: BrowserWindow | null = null
let islandWin: BrowserWindow | null = null

// Fix for transparent windows on macOS causing SharedImageManager::ProduceSkia errors
app.commandLine.appendSwitch('disable-features', 'IOSurfaceCapturer,HardwareMediaKeyHandling')
app.commandLine.appendSwitch('enable-transparent-visuals')

const shell = os.platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash'

// Fix PATH for macOS packaged apps so terminal commands like 'claude', 'node', 'npm' work.
if (process.platform === 'darwin' && app.isPackaged) {
  try {
    const userPath = execSync(`${shell} -l -c "echo \\$PATH"`).toString().trim()
    if (userPath) {
      process.env.PATH = userPath
    }
  } catch {
    // Ignored
  }
}

// Check if tmux exists
let hasTmux = false
try {
  if (os.platform() !== 'win32') {
    execSync('which tmux', { stdio: 'ignore' })
    hasTmux = true
  }
} catch {
    hasTmux = false
  }

let isQuitting = false;

app.on('before-quit', () => {
  isQuitting = true;
});

const terminals: Record<string, pty.IPty> = {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sessionLoggers: Record<string, any> = {}
const currentCwd = process.env.HOME || process.cwd()

const getIconPath = () => {
  const p = app.isPackaged 
    ? join(__dirname, '../dist/icon.png') 
    : join(__dirname, '../build/icon.png')
  console.log('Icon path:', p);
  return p;
}

const getNativeIcon = () => {
  return nativeImage.createFromPath(getIconPath())
}

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 800,
    titleBarStyle: 'hiddenInset',
    transparent: true,
    backgroundColor: '#00000000',
    ...(process.platform !== 'darwin' && { icon: getNativeIcon() }),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      // allow webview to load local files during dev
      webSecurity: false
    },
  })

  // Intercept window close event to show confirmation dialog
  win.on('close', (e) => {
    // Prevent default closing if we haven't decided to quit yet
    if (!isQuitting) {
      e.preventDefault();
      console.log('Main window is closing! (event fired)');

      // Only show confirmation if we have running terminals
      const hasRunningTerminals = Object.keys(terminals).length > 0;
      
      if (hasRunningTerminals) {
        const choice = dialog.showMessageBoxSync(win!, {
          type: 'question',
          buttons: ['取消 (Cancel)', '不保留记录退出 (Discard & Quit)', '保留记录退出 (Save & Quit)'],
          defaultId: 2,
          cancelId: 0,
          title: '确认退出',
          message: '确定要退出 EasyTerminal 吗？',
          detail: '退出将终止所有正在运行的终端会话。您是否要保留当前会话的上下文记录？',
          icon: getNativeIcon()
        });
        
        if (choice === 0) {
          return; // User clicked Cancel, stop here
        }

        // choice === 1 means Discard, choice === 2 means Save
        const shouldSave = choice === 2;

        for (const id in terminals) {
          try { 
            if (sessionLoggers[id]) {
              if (shouldSave) {
                sessionLoggers[id].end();
              } else {
                // Call a destroy method that closes the stream and deletes the file
                if (typeof sessionLoggers[id].destroy === 'function') {
                  sessionLoggers[id].destroy();
                } else {
                  sessionLoggers[id].end();
                }
              }
              delete sessionLoggers[id];
            }
            terminals[id].kill() 
          } catch {
            // Ignored
          }
          delete terminals[id]
        }
      } else {
        // No running terminals, just cleanup and quit normally
        for (const id in terminals) {
          delete terminals[id]
        }
      }
      
      // Destroy island window to prevent ghost process
      if (islandWin && !islandWin.isDestroyed()) {
        console.log('Destroying island window');
        islandWin.destroy()
        islandWin = null;
      }
      
      // Set quitting flag and trigger actual app quit
      isQuitting = true;
      
      // Clean up win reference early to avoid extra callbacks
      const currentWin = win;
      win = null;
      if (currentWin && !currentWin.isDestroyed()) {
        currentWin.destroy();
      }
      
      app.quit();
    }
  });

  islandWin = new BrowserWindow({
    width: 600,
    height: 600,
    x: Math.round((screen.getPrimaryDisplay().workAreaSize.width - 600) / 2),
    y: 20,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    show: false,
    ...(process.platform !== 'darwin' && { icon: getNativeIcon() }),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  })
  
  islandWin.setAlwaysOnTop(true, 'screen-saver')
  islandWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // Enable click-through for transparent areas (macOS supports this well)
  islandWin.setIgnoreMouseEvents(true, { forward: true })

  win.webContents.on('render-process-gone', (e, details) => {
    console.error('win render-process-gone:', details);
  });
  
  win.webContents.on('crashed', () => {
    console.error('win crashed!');
  });
  
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('win did-fail-load:', errorCode, errorDescription);
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    islandWin.loadURL(process.env.VITE_DEV_SERVER_URL + '#island')
    win.webContents.openDevTools()
  } else {
    win.loadFile(join(__dirname, '../dist/index.html'))
    islandWin.loadFile(join(__dirname, '../dist/index.html'), { hash: 'island' })
  }

}

app.setName('EasyTerminal')

// Store the last time the global shortcut was triggered to prevent duplicate fires
let lastShortcutTrigger = 0;

app.whenReady().then(() => {
  // Always ensure dock is visible
  if (process.platform === 'darwin') {
    app.dock.show();
    if (!app.isPackaged) {
      const icon = getNativeIcon();
      app.dock.setIcon(icon);
    }
  }

  ipcMain.handle('get-context-path', () => contextManager.basePath)

  ipcMain.handle('get-webview-preload-path', () => {
    // In dev: /Users/.../public/webview-preload.js
    // In prod: /Users/.../Contents/Resources/app.asar/dist/webview-preload.js
    const p = app.isPackaged
      ? join(__dirname, '../dist/webview-preload.js')
      : join(__dirname, '../public/webview-preload.js')
    console.log('Resolved webview preload path:', p)
    return p
  })

  createWindow()

  // 注册全局快捷键 (Scheme A)
  // 当用户按下 Cmd+Shift+C 时，自动模拟 Cmd+C 复制选中内容，然后再提取剪贴板
  const shortcutKey = 'CommandOrControl+Shift+C';
  
  if (globalShortcut.isRegistered(shortcutKey)) {
    globalShortcut.unregister(shortcutKey);
  }

  const shortcutRegistered = globalShortcut.register(shortcutKey, () => {
    // 节流机制：防止 macOS 上模拟按键时产生的按键粘连或开发环境热重载导致的二次触发
    const now = Date.now();
    if (now - lastShortcutTrigger < 1000) {
      console.log('[GlobalShortcut] Ignored duplicate trigger within 1s');
      return;
    }
    lastShortcutTrigger = now;

    if (process.platform === 'darwin') {
      // 1. 记录下当前的剪贴板内容（用于恢复或对比）
      const oldClipboardText = clipboard.readText();
      console.log(`[GlobalShortcut] Triggered. Old clipboard length: ${oldClipboardText.length}`);

      // 2. 清空剪贴板，以便明确检测到 Cmd+C 是否成功写入了新内容
      clipboard.clear();

      // 3. 延迟 300ms，等待用户松开物理按键 (Cmd+Shift+C 中的 Shift 等)，防止干扰模拟按键
      setTimeout(() => {
        // 4. 模拟 Cmd+C 按键
        // 针对 WPS 等软件，使用更底层的 key code 8 (C键) 而不是 keystroke "c"，以防被中文输入法拦截
        const script = 'tell application "System Events" to key code 8 using {command down}';
        
        exec(`osascript -e '${script}'`, (error) => {
          if (error) {
            console.error('[GlobalShortcut] Failed to simulate Cmd+C', error);
            clipboard.writeText(oldClipboardText); // 恢复剪贴板
            if (win && !win.isDestroyed()) {
              win.webContents.send('notification:show', {
                title: 'Permission Required',
                body: 'Please grant Accessibility permission in System Settings to capture selected text.',
                type: 'error'
              });
            }
            return;
          }

          // 5. 开启轮询 (Polling) 机制等待剪贴板被新内容填充
          let attempts = 0;
          const maxAttempts = 15; // 最多等 1.5 秒 (15 * 100ms)

          const checkClipboard = () => {
            // 强制底层重新同步系统剪贴板状态
            clipboard.availableFormats();
            const newText = clipboard.readText();
            
            console.log(`[GlobalShortcut] Polling ${attempts + 1}/${maxAttempts}... New length: ${newText.length}, Is empty: ${!newText}`);
            
            // 如果剪贴板不再为空，说明 Cmd+C 成功复制了新内容！
            if (newText && newText.trim() !== '') {
              const result = contextManager.saveContextSnippet(newText, 'GlobalShortcut');
              if (result) {
                if (result.isSensitive) {
                  if (islandWin && !islandWin.isDestroyed()) {
                    islandWin.showInactive();
                    islandWin.webContents.send('island:prompt', {
                      message: '⚠️ 已保存，但检测到内容可能包含敏感隐私（如账号、资产等），请注意数据安全。',
                      options: [{ key: 'ok', label: '我知道了' }],
                      sessionId: 'system',
                      sessionName: 'Privacy Alert'
                    });
                  }
                } else {
                  if (win && !win.isDestroyed()) {
                    win.webContents.send('notification:show', {
                      title: 'Context Captured',
                      body: 'Selected text saved successfully.',
                      type: 'success'
                    });
                  }
                }
              }
              return; // 结束轮询
            }
            
            // 如果超时了还是空，说明用户可能没选中任何文本，或者 Cmd+C 依然被拦截
            if (attempts >= maxAttempts) {
              console.log('[GlobalShortcut] Timeout reached. Cmd+C failed or no text selected.');
              clipboard.writeText(oldClipboardText); // 恢复旧剪贴板内容
              if (win && !win.isDestroyed()) {
                win.webContents.send('notification:show', {
                  title: 'Capture Failed',
                  body: 'No text was selected or copy failed. Please try Cmd+C manually.',
                  type: 'warning'
                });
              }
              return; // 结束轮询，并且【不保存】任何内容
            }
            
            // 还没内容，再等 100ms 继续查
            attempts++;
            setTimeout(checkClipboard, 100);
          };

          // 启动第一次检查
          setTimeout(checkClipboard, 100);
        });
      }, 300); // 延迟结束
    } else {
      // Windows / Linux fallback (assumes text is already copied by user manually before pressing hotkey)
      setTimeout(() => {
        const text = clipboard.readText();
        if (text && text.trim()) {
          const result = contextManager.saveContextSnippet(text, 'GlobalShortcut');
          if (result) {
            if (result.isSensitive) {
              if (islandWin && !islandWin.isDestroyed()) {
                islandWin.showInactive();
                islandWin.webContents.send('island:prompt', {
                  message: '⚠️ 已保存，但检测到内容可能包含敏感隐私（如账号、资产等），请注意数据安全。',
                  options: [{ key: 'ok', label: '我知道了' }],
                  sessionId: 'system',
                  sessionName: 'Privacy Alert'
                });
              }
            } else {
              if (win && !win.isDestroyed()) {
                win.webContents.send('notification:show', {
                  title: 'Context Captured',
                  body: 'Clipboard saved successfully.',
                  type: 'success'
                });
              }
            }
          }
        }
      }, 100);
    }
  });

  if (!shortcutRegistered) {
    console.error(`[GlobalShortcut] Failed to register ${shortcutKey}. It might be used by another app.`);
  }

  /* 
  // Disable automatic clipboard sniffing as per user request
  setInterval(() => {
    if (process.platform === 'darwin') clipboard.availableFormats();
    const text = clipboard.readText();
    if (text && text.trim()) {
      contextManager.saveContextSnippet(text, 'ClipboardSniffer');
    }
  }, 60 * 60 * 1000);
  */
  
  ipcMain.on('window:resize', (_event, width: number) => {
    if (win && !win.isDestroyed()) {
      const bounds = win.getBounds()
      win.setBounds({
        x: bounds.x,
        y: bounds.y,
        width: width,
        height: bounds.height // Keep current height to avoid vertical jumping
      }, true) // true = animate on macOS
    }
  })

  // Set up PTY IPC
  ipcMain.on('pty:kill', (_event, id) => {
    if (terminals[id]) {
      if (sessionLoggers[id]) {
        sessionLoggers[id].end()
        delete sessionLoggers[id]
      }
      try {
        terminals[id].kill()
      } catch {
        // Ignored
      }
      delete terminals[id]
    }
  })

  ipcMain.on('pty:create', (event, id) => {
    if (terminals[id]) return

    let command = shell
    let args: string[] = []
    
    if (hasTmux) {
      // Use tmux to create or attach to a session
      command = 'tmux'
      args = ['new-session', '-A', '-s', `easy_term_${id}`]
    } else if (os.platform() !== 'win32') {
      // Launch as login shell so aliases and profiles (.zshrc) are loaded
      args = ['-l']
    }

    const ptyProcess = pty.spawn(command, args, {
      name: 'xterm-256color',
      cols: 80,
      rows: 30,
      cwd: currentCwd,
      env: process.env as Record<string, string>
    })

    // Create non-blocking logger for this session
    sessionLoggers[id] = contextManager.createSessionLogger(id, id);

    ptyProcess.onData((data) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send(`pty:data:${id}`, data)
      }
      
      // Stream to local Markdown file seamlessly
      if (sessionLoggers[id]) {
        sessionLoggers[id].write(data);
      }
    })

    terminals[id] = ptyProcess
    event.reply(`pty:created:${id}`)
  })

  ipcMain.on('pty:write', (_event, id, data) => {
    terminals[id]?.write(data)
  })

  ipcMain.on('pty:resize', (_event, id, cols, rows) => {
    terminals[id]?.resize(cols, rows)
  })

  // Simple Autocomplete via IPC
  ipcMain.handle('autocomplete:path', async (_event, partialPath: string) => {
    try {
      const searchDir = partialPath.startsWith('/') ? dirname(partialPath) : currentCwd
      const searchPrefix = basename(partialPath)
      
      if (!fs.existsSync(searchDir)) return []
      
      const files = fs.readdirSync(searchDir)
      return files
        .filter(f => f.startsWith(searchPrefix))
        .map(f => {
          const fullPath = join(searchDir, f)
          const isDir = fs.statSync(fullPath).isDirectory()
          return isDir ? f + '/' : f
        })
    } catch {
        return []
      }
  })

  ipcMain.handle('file:read', async (_event, filePath: string) => {
    try {
      const fullPath = filePath.startsWith('/') ? filePath : join(currentCwd, filePath)
      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath, 'utf-8')
      }
      return ''
    } catch {
        return ''
      }
  })

  ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
    try {
      const fullPath = filePath.startsWith('/') ? filePath : join(currentCwd, filePath)
      fs.writeFileSync(fullPath, content, 'utf-8')
      return true
    } catch {
        return false
      }
  })

  // fs module
  ipcMain.handle('fs:homedir', () => process.env.HOME || process.cwd())
  ipcMain.handle('fs:parent', (_event, dirPath: string) => dirname(dirPath))
  ipcMain.handle('fs:list', async (_event, dirPath: string) => {
    try {
      if (!fs.existsSync(dirPath)) return []
      
      let files: fs.Dirent[] = []
      try {
        files = fs.readdirSync(dirPath, { withFileTypes: true })
      } catch (e) {
        // Fallback for permissions or other read errors on the directory itself
        console.error('Directory read error:', e)
        return []
      }
      
      // Filter out hidden files by default for cleaner UI
      const result = files
        .filter(f => !f.name.startsWith('.'))
        .map(f => {
          let isDir = false
          try {
            isDir = f.isDirectory()
          } catch {
            // Some files (like broken symlinks) might throw on isDirectory()
            isDir = false
          }
          return {
            name: f.name,
            isDirectory: isDir,
            path: join(dirPath, f.name)
          }
        })
        .sort((a, b) => {
          if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name)
          return a.isDirectory ? -1 : 1
        })
        
      return result
    } catch (e) {
      console.error('fs:list outer error:', e)
      return []
    }
  })

  // Read image as base64
  ipcMain.handle('file:read-image', async (_event, filePath: string) => {
    try {
      const fullPath = filePath.startsWith('/') ? filePath : join(currentCwd, filePath)
      if (fs.existsSync(fullPath)) {
        const data = fs.readFileSync(fullPath)
        const ext = extname(fullPath).toLowerCase().replace('.', '')
        const mimeType = ext === 'jpg' ? 'jpeg' : ext
        return `data:image/${mimeType};base64,${data.toString('base64')}`
      }
      return null
    } catch (e) {
      console.error('read-image error:', e)
      return null
    }
  })

  // Island IPC
  ipcMain.on('island:trigger', (_event, msg: string) => {
    if (islandWin && !islandWin.isDestroyed()) {
      islandWin.showInactive()
      // Note: Do not disable ignoreMouseEvents, let the transparent click-through handle it
      islandWin.webContents.send('island:show', msg)
    }
  })

  ipcMain.on('island:save-context', (event, data: { text: string, source: string }) => {
    if (data.text && data.text.trim()) {
      const result = contextManager.saveContextSnippet(data.text, data.source);
      if (result) {
        event.reply('island:save-result', { success: true, filePath: result.filePath, isSensitive: result.isSensitive });
      } else {
        event.reply('island:save-result', { success: false, reason: 'duplicate_or_error' });
      }
    }
  })

  ipcMain.on('island:status', (_event, msg: string) => {
    if (islandWin && !islandWin.isDestroyed()) {
      islandWin.showInactive()
      islandWin.webContents.send('island:status', msg)
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ipcMain.on('island:prompt', (_event, data: { message: string, options: any[], sessionId: string }) => {
    if (islandWin && !islandWin.isDestroyed()) {
      islandWin.showInactive()
      islandWin.webContents.send('island:prompt', data)
    }
  })

  ipcMain.on('island:action', async (_event, action: string | string[], sessionId?: string) => {
    if (islandWin) {
      if (sessionId && terminals[sessionId]) {
        if (Array.isArray(action)) {
          for (const stroke of action) {
            terminals[sessionId].write(stroke)
            // Small delay to ensure TUI processes arrow keys before Enter
            await new Promise(resolve => setTimeout(resolve, 30))
          }
        } else if (action === 'approve') {
          terminals[sessionId].write('y\r')
        } else if (action === 'deny') {
          terminals[sessionId].write('n\r')
        } else {
          terminals[sessionId].write(action)
        }
      } else if (win && !win.isDestroyed()) {
        win.webContents.send(`pty:data:default_tab`, `\r\n[Agent] User clicked ${action}\r\n`)
      }
    }
  })

  ipcMain.on('island:set-ignore-mouse-events', (_event, ignore: boolean) => {
    if (islandWin) {
      islandWin.setIgnoreMouseEvents(ignore, { forward: true })
    }
  })

  // Context Menu
  ipcMain.on('export:save-file', async (event, { content, format, defaultName }) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      const { canceled, filePath } = await dialog.showSaveDialog(window!, {
        title: `Save ${format.toUpperCase()}`,
        defaultPath: defaultName,
        filters: [{ name: format.toUpperCase(), extensions: [format] }]
      });
      if (!canceled && filePath) {
        fs.writeFileSync(filePath, content, 'utf-8');
      }
    } catch (e) {
      console.error('Failed to save file', e);
    }
  });

  ipcMain.on('export:save-pdf', async (event, { htmlContent, defaultName }) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      const { canceled, filePath } = await dialog.showSaveDialog(window!, {
        title: 'Save PDF',
        defaultPath: defaultName,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });
      if (!canceled && filePath) {
        const pdfWindow = new BrowserWindow({ show: false });
        await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
        const pdfData = await pdfWindow.webContents.printToPDF({
          printBackground: true,
          margins: { marginType: 'default' }
        });
        fs.writeFileSync(filePath, pdfData);
        pdfWindow.close();
      }
    } catch (e) {
      console.error('Failed to save PDF', e);
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ipcMain.on('menu:show', (event, type: 'file' | 'general', contextData: any) => {
    const template: Electron.MenuItemConstructorOptions[] = []

    if (type === 'file' && contextData) {
      template.push(
        { label: '复制路径 (Copy Path)', click: () => event.reply('menu:action', 'copy-path', contextData) },
        { label: '插入终端 (Insert Path)', click: () => event.reply('menu:action', 'insert-path', contextData) }
      )
      if (!contextData.isDirectory) {
        template.push(
          { label: '编辑文件 (Edit File)', click: () => event.reply('menu:action', 'edit-file', contextData) }
        )
      }
    } else if (type === 'general') {
      template.push(
        { label: '新增文本文件 (New Text File)', click: () => event.reply('menu:action', 'new-file', contextData) },
        { type: 'separator' },
        { label: '刷新 (Refresh)', click: () => event.reply('menu:action', 'refresh', contextData) },
        { label: '粘贴到终端 (Paste)', click: () => event.reply('menu:action', 'paste', contextData) },
        { label: '在终端打开 (Open in Terminal)', click: () => event.reply('menu:action', 'open-terminal', contextData) }
      )
    }

    const menu = Menu.buildFromTemplate(template)
    menu.popup({ window: BrowserWindow.fromWebContents(event.sender) || undefined })
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  win = null
  islandWin = null
  // We want to fully quit the app when all windows are closed on macOS too
  // since this is a terminal application
  if (!isQuitting) {
    isQuitting = true;
    app.quit()
  }
})

app.on('activate', () => {
  if (win === null) {
    createWindow()
  } else {
    win.show()
    win.focus()
  }
})
