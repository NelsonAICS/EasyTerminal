process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

import { app, BrowserWindow, ipcMain, nativeTheme, Menu, screen, dialog, nativeImage } from 'electron'
import { join, dirname, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as os from 'node:os'
import * as pty from 'node-pty'
import { execSync } from 'node:child_process'
import * as fs from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Enable GPU Acceleration for better transparent window rendering on macOS
// app.disableHardwareAcceleration()

// Force dark theme for a consistent, sleek terminal look
nativeTheme.themeSource = 'dark'

let win: BrowserWindow | null = null
let islandWin: BrowserWindow | null = null

const shell = os.platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash'

// Fix PATH for macOS packaged apps so terminal commands like 'claude', 'node', 'npm' work.
if (process.platform === 'darwin' && app.isPackaged) {
  try {
    const userPath = execSync(`${shell} -l -c 'echo $PATH'`, { encoding: 'utf-8' }).trim()
    if (userPath) {
      process.env.PATH = userPath
    }
  } catch (e) {
    console.error('Failed to get login shell PATH', e)
  }
}

// Check if tmux exists
let hasTmux = false
try {
  if (os.platform() !== 'win32') {
    execSync('which tmux', { stdio: 'ignore' })
    hasTmux = true
  }
} catch (e) {
  hasTmux = false
}

let isQuitting = false;

app.on('before-quit', () => {
  isQuitting = true;
});

const terminals: Record<string, pty.IPty> = {}
let currentCwd = process.env.HOME || process.cwd()

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
    width: 1100,
    height: 750,
    titleBarStyle: 'hiddenInset',
    transparent: true,
    backgroundColor: '#00000000',
    ...(process.platform !== 'darwin' && { icon: getNativeIcon() }),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
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
          buttons: ['取消 (Cancel)', '退出 (Quit)'],
          defaultId: 1,
          cancelId: 0,
          title: '确认退出',
          message: '确定要退出 EasyTerminal 吗？',
          detail: '退出将终止所有正在运行的终端会话。',
          icon: getNativeIcon()
        });
        
        if (choice === 0) {
          return; // User clicked Cancel, stop here
        }
      }
      
      // User clicked Quit (or no terminals running), clean up PTYs
      for (const id in terminals) {
        try { terminals[id].kill() } catch (err) {}
        delete terminals[id]
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

app.whenReady().then(() => {
  // Always ensure dock is visible
  if (process.platform === 'darwin') {
    app.dock.show();
    if (!app.isPackaged) {
      const icon = getNativeIcon();
      app.dock.setIcon(icon);
    }
  }

  createWindow()
  
  // Set up PTY IPC
  ipcMain.on('pty:kill', (event, id) => {
    if (terminals[id]) {
      terminals[id].kill()
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

    ptyProcess.onData((data) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send(`pty:data:${id}`, data)
      }
    })

    terminals[id] = ptyProcess
    event.reply(`pty:created:${id}`)
  })

  ipcMain.on('pty:write', (event, id, data) => {
    terminals[id]?.write(data)
  })

  ipcMain.on('pty:resize', (event, id, cols, rows) => {
    terminals[id]?.resize(cols, rows)
  })

  // Simple Autocomplete via IPC
  ipcMain.handle('autocomplete:path', async (event, partialPath: string) => {
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
    } catch (e) {
      return []
    }
  })

  ipcMain.handle('file:read', async (event, filePath: string) => {
    try {
      const fullPath = filePath.startsWith('/') ? filePath : join(currentCwd, filePath)
      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath, 'utf-8')
      }
      return ''
    } catch (e) {
      return ''
    }
  })

  ipcMain.handle('file:write', async (event, filePath: string, content: string) => {
    try {
      const fullPath = filePath.startsWith('/') ? filePath : join(currentCwd, filePath)
      fs.writeFileSync(fullPath, content, 'utf-8')
      return true
    } catch (e) {
      return false
    }
  })

  // fs module
  ipcMain.handle('fs:homedir', () => process.env.HOME || process.cwd())
  ipcMain.handle('fs:parent', (event, dirPath: string) => dirname(dirPath))
  ipcMain.handle('fs:list', async (event, dirPath: string) => {
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
          } catch (e) {
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
  ipcMain.handle('file:read-image', async (event, filePath: string) => {
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
  ipcMain.on('island:trigger', (event, msg: string) => {
    if (islandWin && !islandWin.isDestroyed()) {
      islandWin.showInactive()
      // Note: Do not disable ignoreMouseEvents, let the transparent click-through handle it
      islandWin.webContents.send('island:show', msg)
    }
  })

  ipcMain.on('island:status', (event, msg: string) => {
    if (islandWin && !islandWin.isDestroyed()) {
      islandWin.showInactive()
      islandWin.webContents.send('island:status', msg)
    }
  })

  ipcMain.on('island:prompt', (event, data: { message: string, options: any[], sessionId: string }) => {
    if (islandWin && !islandWin.isDestroyed()) {
      islandWin.showInactive()
      islandWin.webContents.send('island:prompt', data)
    }
  })

  ipcMain.on('island:action', async (event, action: string | string[], sessionId?: string) => {
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

  ipcMain.on('island:set-ignore-mouse-events', (event, ignore: boolean) => {
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
