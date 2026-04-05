import { BrowserWindow, Menu, app, ipcMain, nativeTheme, screen } from "electron";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as os from "node:os";
import * as pty from "node-pty";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
//#region electron/main.ts
var __dirname = dirname(fileURLToPath(import.meta.url));
nativeTheme.themeSource = "dark";
var win = null;
var islandWin = null;
var shell = os.platform() === "win32" ? "powershell.exe" : process.env.SHELL || "bash";
var hasTmux = false;
try {
	if (os.platform() !== "win32") {
		execSync("which tmux", { stdio: "ignore" });
		hasTmux = true;
	}
} catch (e) {
	hasTmux = false;
}
var terminals = {};
var currentCwd = process.env.HOME || process.cwd();
function createWindow() {
	win = new BrowserWindow({
		width: 1100,
		height: 750,
		titleBarStyle: "hiddenInset",
		transparent: true,
		backgroundColor: "#00000000",
		webPreferences: {
			preload: join(__dirname, "preload.js"),
			nodeIntegration: true,
			contextIsolation: false
		}
	});
	islandWin = new BrowserWindow({
		width: 600,
		height: 600,
		x: Math.round((screen.getPrimaryDisplay().workAreaSize.width - 600) / 2),
		y: 20,
		transparent: true,
		backgroundColor: "#00000000",
		frame: false,
		hasShadow: false,
		alwaysOnTop: true,
		resizable: false,
		movable: false,
		skipTaskbar: true,
		show: false,
		webPreferences: {
			preload: join(__dirname, "preload.js"),
			nodeIntegration: true,
			contextIsolation: false
		}
	});
	islandWin.setAlwaysOnTop(true, "screen-saver");
	islandWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
	islandWin.setIgnoreMouseEvents(true, { forward: true });
	if (process.env.VITE_DEV_SERVER_URL) {
		win.loadURL(process.env.VITE_DEV_SERVER_URL);
		islandWin.loadURL(process.env.VITE_DEV_SERVER_URL + "#island");
		win.webContents.openDevTools();
	} else {
		win.loadFile(join(__dirname, "../dist/index.html"));
		islandWin.loadFile(join(__dirname, "../dist/index.html"), { hash: "island" });
	}
}
app.whenReady().then(() => {
	createWindow();
	ipcMain.on("pty:kill", (event, id) => {
		if (terminals[id]) {
			terminals[id].kill();
			delete terminals[id];
		}
	});
	ipcMain.on("pty:create", (event, id) => {
		if (terminals[id]) return;
		let command = shell;
		let args = [];
		if (hasTmux) {
			command = "tmux";
			args = [
				"new-session",
				"-A",
				"-s",
				`easy_term_${id}`
			];
		}
		const ptyProcess = pty.spawn(command, args, {
			name: "xterm-256color",
			cols: 80,
			rows: 30,
			cwd: currentCwd,
			env: process.env
		});
		ptyProcess.onData((data) => {
			win?.webContents.send(`pty:data:${id}`, data);
		});
		terminals[id] = ptyProcess;
		event.reply(`pty:created:${id}`);
	});
	ipcMain.on("pty:write", (event, id, data) => {
		terminals[id]?.write(data);
	});
	ipcMain.on("pty:resize", (event, id, cols, rows) => {
		terminals[id]?.resize(cols, rows);
	});
	ipcMain.handle("autocomplete:path", async (event, partialPath) => {
		try {
			const searchDir = partialPath.startsWith("/") ? dirname(partialPath) : currentCwd;
			const searchPrefix = basename(partialPath);
			if (!fs.existsSync(searchDir)) return [];
			return fs.readdirSync(searchDir).filter((f) => f.startsWith(searchPrefix)).map((f) => {
				const fullPath = join(searchDir, f);
				return fs.statSync(fullPath).isDirectory() ? f + "/" : f;
			});
		} catch (e) {
			return [];
		}
	});
	ipcMain.handle("file:read", async (event, filePath) => {
		try {
			const fullPath = filePath.startsWith("/") ? filePath : join(currentCwd, filePath);
			if (fs.existsSync(fullPath)) return fs.readFileSync(fullPath, "utf-8");
			return "";
		} catch (e) {
			return "";
		}
	});
	ipcMain.handle("file:write", async (event, filePath, content) => {
		try {
			const fullPath = filePath.startsWith("/") ? filePath : join(currentCwd, filePath);
			fs.writeFileSync(fullPath, content, "utf-8");
			return true;
		} catch (e) {
			return false;
		}
	});
	ipcMain.handle("fs:homedir", () => process.env.HOME || process.cwd());
	ipcMain.handle("fs:parent", (event, dirPath) => dirname(dirPath));
	ipcMain.handle("fs:list", async (event, dirPath) => {
		try {
			if (!fs.existsSync(dirPath)) return [];
			let files = [];
			try {
				files = fs.readdirSync(dirPath, { withFileTypes: true });
			} catch (e) {
				console.error("Directory read error:", e);
				return [];
			}
			return files.filter((f) => !f.name.startsWith(".")).map((f) => {
				let isDir = false;
				try {
					isDir = f.isDirectory();
				} catch (e) {
					isDir = false;
				}
				return {
					name: f.name,
					isDirectory: isDir,
					path: join(dirPath, f.name)
				};
			}).sort((a, b) => {
				if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
				return a.isDirectory ? -1 : 1;
			});
		} catch (e) {
			console.error("fs:list outer error:", e);
			return [];
		}
	});
	ipcMain.handle("file:read-image", async (event, filePath) => {
		try {
			const fullPath = filePath.startsWith("/") ? filePath : join(currentCwd, filePath);
			if (fs.existsSync(fullPath)) {
				const data = fs.readFileSync(fullPath);
				const ext = extname(fullPath).toLowerCase().replace(".", "");
				return `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${data.toString("base64")}`;
			}
			return null;
		} catch (e) {
			console.error("read-image error:", e);
			return null;
		}
	});
	ipcMain.on("island:trigger", (event, msg) => {
		if (islandWin) {
			islandWin.showInactive();
			islandWin.webContents.send("island:show", msg);
		}
	});
	ipcMain.on("island:status", (event, msg) => {
		if (islandWin) {
			islandWin.showInactive();
			islandWin.webContents.send("island:status", msg);
		}
	});
	ipcMain.on("island:prompt", (event, data) => {
		if (islandWin) {
			islandWin.showInactive();
			islandWin.webContents.send("island:prompt", data);
		}
	});
	ipcMain.on("island:action", async (event, action, sessionId) => {
		if (islandWin) {
			if (sessionId && terminals[sessionId]) if (Array.isArray(action)) for (const stroke of action) {
				terminals[sessionId].write(stroke);
				await new Promise((resolve) => setTimeout(resolve, 30));
			}
			else if (action === "approve") terminals[sessionId].write("y\r");
			else if (action === "deny") terminals[sessionId].write("n\r");
			else terminals[sessionId].write(action);
			else if (win) win.webContents.send(`pty:data:default_tab`, `\r\n[Agent] User clicked ${action}\r\n`);
		}
	});
	ipcMain.on("island:set-ignore-mouse-events", (event, ignore) => {
		if (islandWin) islandWin.setIgnoreMouseEvents(ignore, { forward: true });
	});
	ipcMain.on("menu:show", (event, type, contextData) => {
		const template = [];
		if (type === "file" && contextData) {
			template.push({
				label: "复制路径 (Copy Path)",
				click: () => event.reply("menu:action", "copy-path", contextData)
			}, {
				label: "插入终端 (Insert Path)",
				click: () => event.reply("menu:action", "insert-path", contextData)
			});
			if (!contextData.isDirectory) template.push({
				label: "编辑文件 (Edit File)",
				click: () => event.reply("menu:action", "edit-file", contextData)
			});
		} else if (type === "general") template.push({
			label: "新增文本文件 (New Text File)",
			click: () => event.reply("menu:action", "new-file", contextData)
		}, { type: "separator" }, {
			label: "刷新 (Refresh)",
			click: () => event.reply("menu:action", "refresh", contextData)
		}, {
			label: "粘贴到终端 (Paste)",
			click: () => event.reply("menu:action", "paste", contextData)
		}, {
			label: "在终端打开 (Open in Terminal)",
			click: () => event.reply("menu:action", "open-terminal", contextData)
		});
		Menu.buildFromTemplate(template).popup({ window: BrowserWindow.fromWebContents(event.sender) || void 0 });
	});
});
app.on("window-all-closed", () => {
	win = null;
	if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
	const allWindows = BrowserWindow.getAllWindows();
	if (allWindows.length) allWindows[0].focus();
	else createWindow();
});
//#endregion
