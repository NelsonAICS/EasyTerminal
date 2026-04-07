import { BrowserWindow as e, Menu as t, app as n, dialog as r, ipcMain as i, nativeTheme as a, screen as o } from "electron";
import { basename as s, dirname as c, extname as l, join as u } from "node:path";
import { fileURLToPath as d } from "node:url";
import * as f from "node:os";
import * as p from "node-pty";
import { execSync as m } from "node:child_process";
import * as h from "node:fs";
//#region electron/main.ts
var g = c(d(import.meta.url));
a.themeSource = "dark";
var _ = null, v = null, y = f.platform() === "win32" ? "powershell.exe" : process.env.SHELL || "bash", b = !1;
try {
	f.platform() !== "win32" && (m("which tmux", { stdio: "ignore" }), b = !0);
} catch {
	b = !1;
}
var x = {}, S = process.env.HOME || process.cwd();
function C() {
	_ = new e({
		width: 1100,
		height: 750,
		titleBarStyle: "hiddenInset",
		transparent: !0,
		backgroundColor: "#00000000",
		webPreferences: {
			preload: u(g, "preload.js"),
			nodeIntegration: !0,
			contextIsolation: !1
		}
	}), v = new e({
		width: 600,
		height: 600,
		x: Math.round((o.getPrimaryDisplay().workAreaSize.width - 600) / 2),
		y: 20,
		transparent: !0,
		backgroundColor: "#00000000",
		frame: !1,
		hasShadow: !1,
		alwaysOnTop: !0,
		resizable: !1,
		movable: !1,
		skipTaskbar: !0,
		show: !1,
		webPreferences: {
			preload: u(g, "preload.js"),
			nodeIntegration: !0,
			contextIsolation: !1
		}
	}), v.setAlwaysOnTop(!0, "screen-saver"), v.setVisibleOnAllWorkspaces(!0, { visibleOnFullScreen: !0 }), v.setIgnoreMouseEvents(!0, { forward: !0 }), process.env.VITE_DEV_SERVER_URL ? (_.loadURL(process.env.VITE_DEV_SERVER_URL), v.loadURL(process.env.VITE_DEV_SERVER_URL + "#island"), _.webContents.openDevTools()) : (_.loadFile(u(g, "../dist/index.html")), v.loadFile(u(g, "../dist/index.html"), { hash: "island" }));
}
n.whenReady().then(() => {
	C(), i.on("pty:kill", (e, t) => {
		x[t] && (x[t].kill(), delete x[t]);
	}), i.on("pty:create", (e, t) => {
		if (x[t]) return;
		let n = y, r = [];
		b && (n = "tmux", r = [
			"new-session",
			"-A",
			"-s",
			`easy_term_${t}`
		]);
		let i = p.spawn(n, r, {
			name: "xterm-256color",
			cols: 80,
			rows: 30,
			cwd: S,
			env: process.env
		});
		i.onData((e) => {
			_?.webContents.send(`pty:data:${t}`, e);
		}), x[t] = i, e.reply(`pty:created:${t}`);
	}), i.on("pty:write", (e, t, n) => {
		x[t]?.write(n);
	}), i.on("pty:resize", (e, t, n, r) => {
		x[t]?.resize(n, r);
	}), i.handle("autocomplete:path", async (e, t) => {
		try {
			let e = t.startsWith("/") ? c(t) : S, n = s(t);
			return h.existsSync(e) ? h.readdirSync(e).filter((e) => e.startsWith(n)).map((t) => {
				let n = u(e, t);
				return h.statSync(n).isDirectory() ? t + "/" : t;
			}) : [];
		} catch {
			return [];
		}
	}), i.handle("file:read", async (e, t) => {
		try {
			let e = t.startsWith("/") ? t : u(S, t);
			return h.existsSync(e) ? h.readFileSync(e, "utf-8") : "";
		} catch {
			return "";
		}
	}), i.handle("file:write", async (e, t, n) => {
		try {
			let e = t.startsWith("/") ? t : u(S, t);
			return h.writeFileSync(e, n, "utf-8"), !0;
		} catch {
			return !1;
		}
	}), i.handle("fs:homedir", () => process.env.HOME || process.cwd()), i.handle("fs:parent", (e, t) => c(t)), i.handle("fs:list", async (e, t) => {
		try {
			if (!h.existsSync(t)) return [];
			let e = [];
			try {
				e = h.readdirSync(t, { withFileTypes: !0 });
			} catch (e) {
				return console.error("Directory read error:", e), [];
			}
			return e.filter((e) => !e.name.startsWith(".")).map((e) => {
				let n = !1;
				try {
					n = e.isDirectory();
				} catch {
					n = !1;
				}
				return {
					name: e.name,
					isDirectory: n,
					path: u(t, e.name)
				};
			}).sort((e, t) => e.isDirectory === t.isDirectory ? e.name.localeCompare(t.name) : e.isDirectory ? -1 : 1);
		} catch (e) {
			return console.error("fs:list outer error:", e), [];
		}
	}), i.handle("file:read-image", async (e, t) => {
		try {
			let e = t.startsWith("/") ? t : u(S, t);
			if (h.existsSync(e)) {
				let t = h.readFileSync(e), n = l(e).toLowerCase().replace(".", "");
				return `data:image/${n === "jpg" ? "jpeg" : n};base64,${t.toString("base64")}`;
			}
			return null;
		} catch (e) {
			return console.error("read-image error:", e), null;
		}
	}), i.on("island:trigger", (e, t) => {
		v && (v.showInactive(), v.webContents.send("island:show", t));
	}), i.on("island:status", (e, t) => {
		v && (v.showInactive(), v.webContents.send("island:status", t));
	}), i.on("island:prompt", (e, t) => {
		v && (v.showInactive(), v.webContents.send("island:prompt", t));
	}), i.on("island:action", async (e, t, n) => {
		if (v) if (n && x[n]) if (Array.isArray(t)) for (let e of t) x[n].write(e), await new Promise((e) => setTimeout(e, 30));
		else t === "approve" ? x[n].write("y\r") : t === "deny" ? x[n].write("n\r") : x[n].write(t);
		else _ && _.webContents.send("pty:data:default_tab", `\r\n[Agent] User clicked ${t}\r\n`);
	}), i.on("island:set-ignore-mouse-events", (e, t) => {
		v && v.setIgnoreMouseEvents(t, { forward: !0 });
	}), i.on("export:save-file", async (t, { content: n, format: i, defaultName: a }) => {
		try {
			let o = e.fromWebContents(t.sender), { canceled: s, filePath: c } = await r.showSaveDialog(o, {
				title: `Save ${i.toUpperCase()}`,
				defaultPath: a,
				filters: [{
					name: i.toUpperCase(),
					extensions: [i]
				}]
			});
			!s && c && h.writeFileSync(c, n, "utf-8");
		} catch (e) {
			console.error("Failed to save file", e);
		}
	}), i.on("export:save-pdf", async (t, { htmlContent: n, defaultName: i }) => {
		try {
			let a = e.fromWebContents(t.sender), { canceled: o, filePath: s } = await r.showSaveDialog(a, {
				title: "Save PDF",
				defaultPath: i,
				filters: [{
					name: "PDF",
					extensions: ["pdf"]
				}]
			});
			if (!o && s) {
				let t = new e({ show: !1 });
				await t.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(n)}`);
				let r = await t.webContents.printToPDF({
					printBackground: !0,
					margins: { marginType: "default" }
				});
				h.writeFileSync(s, r), t.close();
			}
		} catch (e) {
			console.error("Failed to save PDF", e);
		}
	}), i.on("menu:show", (n, r, i) => {
		let a = [];
		r === "file" && i ? (a.push({
			label: "复制路径 (Copy Path)",
			click: () => n.reply("menu:action", "copy-path", i)
		}, {
			label: "插入终端 (Insert Path)",
			click: () => n.reply("menu:action", "insert-path", i)
		}), i.isDirectory || a.push({
			label: "编辑文件 (Edit File)",
			click: () => n.reply("menu:action", "edit-file", i)
		})) : r === "general" && a.push({
			label: "新增文本文件 (New Text File)",
			click: () => n.reply("menu:action", "new-file", i)
		}, { type: "separator" }, {
			label: "刷新 (Refresh)",
			click: () => n.reply("menu:action", "refresh", i)
		}, {
			label: "粘贴到终端 (Paste)",
			click: () => n.reply("menu:action", "paste", i)
		}, {
			label: "在终端打开 (Open in Terminal)",
			click: () => n.reply("menu:action", "open-terminal", i)
		}), t.buildFromTemplate(a).popup({ window: e.fromWebContents(n.sender) || void 0 });
	});
}), n.on("window-all-closed", () => {
	_ = null, process.platform !== "darwin" && n.quit();
}), n.on("activate", () => {
	let t = e.getAllWindows();
	t.length ? t[0].focus() : C();
});
//#endregion
