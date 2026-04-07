import { BrowserWindow as e, Menu as t, app as n, dialog as r, ipcMain as i, nativeImage as a, nativeTheme as o, screen as s } from "electron";
import { basename as c, dirname as l, extname as u, join as d } from "node:path";
import { fileURLToPath as f } from "node:url";
import * as p from "node:os";
import * as m from "node-pty";
import { execSync as h } from "node:child_process";
import * as g from "node:fs";
process.on("uncaughtException", (e) => {
	console.error("UNCAUGHT EXCEPTION:", e);
}), process.on("unhandledRejection", (e) => {
	console.error("UNHANDLED REJECTION:", e);
});
var _ = l(f(import.meta.url));
o.themeSource = "dark";
var v = null, y = null, b = p.platform() === "win32" ? "powershell.exe" : process.env.SHELL || "bash";
if (process.platform === "darwin" && n.isPackaged) try {
	let e = h(`${b} -l -c 'echo $PATH'`, { encoding: "utf-8" }).trim();
	e && (process.env.PATH = e);
} catch (e) {
	console.error("Failed to get login shell PATH", e);
}
var x = !1;
try {
	p.platform() !== "win32" && (h("which tmux", { stdio: "ignore" }), x = !0);
} catch {
	x = !1;
}
var S = !1;
n.on("before-quit", () => {
	S = !0;
});
var C = {}, w = process.env.HOME || process.cwd(), T = () => {
	let e = n.isPackaged ? d(_, "../dist/icon.png") : d(_, "../build/icon.png");
	return console.log("Icon path:", e), e;
}, E = () => a.createFromPath(T());
function D() {
	v = new e({
		width: 1100,
		height: 750,
		titleBarStyle: "hiddenInset",
		transparent: !0,
		backgroundColor: "#00000000",
		...process.platform !== "darwin" && { icon: E() },
		webPreferences: {
			preload: d(_, "preload.js"),
			nodeIntegration: !0,
			contextIsolation: !1
		}
	}), v.on("close", (e) => {
		if (!S) {
			if (e.preventDefault(), console.log("Main window is closing! (event fired)"), Object.keys(C).length > 0 && r.showMessageBoxSync(v, {
				type: "question",
				buttons: ["取消 (Cancel)", "退出 (Quit)"],
				defaultId: 1,
				cancelId: 0,
				title: "确认退出",
				message: "确定要退出 EasyTerminal 吗？",
				detail: "退出将终止所有正在运行的终端会话。",
				icon: E()
			}) === 0) return;
			for (let e in C) {
				try {
					C[e].kill();
				} catch {}
				delete C[e];
			}
			y && !y.isDestroyed() && (console.log("Destroying island window"), y.destroy(), y = null), S = !0;
			let t = v;
			v = null, t && !t.isDestroyed() && t.destroy(), n.quit();
		}
	}), y = new e({
		width: 600,
		height: 600,
		x: Math.round((s.getPrimaryDisplay().workAreaSize.width - 600) / 2),
		y: 20,
		transparent: !0,
		backgroundColor: "#00000000",
		frame: !1,
		hasShadow: !1,
		alwaysOnTop: !0,
		resizable: !1,
		movable: !1,
		show: !1,
		...process.platform !== "darwin" && { icon: E() },
		webPreferences: {
			preload: d(_, "preload.js"),
			nodeIntegration: !0,
			contextIsolation: !1
		}
	}), y.setAlwaysOnTop(!0, "screen-saver"), y.setVisibleOnAllWorkspaces(!0, { visibleOnFullScreen: !0 }), y.setIgnoreMouseEvents(!0, { forward: !0 }), v.webContents.on("render-process-gone", (e, t) => {
		console.error("win render-process-gone:", t);
	}), v.webContents.on("crashed", () => {
		console.error("win crashed!");
	}), v.webContents.on("did-fail-load", (e, t, n) => {
		console.error("win did-fail-load:", t, n);
	}), process.env.VITE_DEV_SERVER_URL ? (v.loadURL(process.env.VITE_DEV_SERVER_URL), y.loadURL(process.env.VITE_DEV_SERVER_URL + "#island"), v.webContents.openDevTools()) : (v.loadFile(d(_, "../dist/index.html")), y.loadFile(d(_, "../dist/index.html"), { hash: "island" }));
}
n.setName("EasyTerminal"), n.whenReady().then(() => {
	if (process.platform === "darwin" && (n.dock.show(), !n.isPackaged)) {
		let e = E();
		n.dock.setIcon(e);
	}
	D(), i.on("pty:kill", (e, t) => {
		C[t] && (C[t].kill(), delete C[t]);
	}), i.on("pty:create", (e, t) => {
		if (C[t]) return;
		let n = b, r = [];
		x ? (n = "tmux", r = [
			"new-session",
			"-A",
			"-s",
			`easy_term_${t}`
		]) : p.platform() !== "win32" && (r = ["-l"]);
		let i = m.spawn(n, r, {
			name: "xterm-256color",
			cols: 80,
			rows: 30,
			cwd: w,
			env: process.env
		});
		i.onData((e) => {
			v && !v.isDestroyed() && v.webContents.send(`pty:data:${t}`, e);
		}), C[t] = i, e.reply(`pty:created:${t}`);
	}), i.on("pty:write", (e, t, n) => {
		C[t]?.write(n);
	}), i.on("pty:resize", (e, t, n, r) => {
		C[t]?.resize(n, r);
	}), i.handle("autocomplete:path", async (e, t) => {
		try {
			let e = t.startsWith("/") ? l(t) : w, n = c(t);
			return g.existsSync(e) ? g.readdirSync(e).filter((e) => e.startsWith(n)).map((t) => {
				let n = d(e, t);
				return g.statSync(n).isDirectory() ? t + "/" : t;
			}) : [];
		} catch {
			return [];
		}
	}), i.handle("file:read", async (e, t) => {
		try {
			let e = t.startsWith("/") ? t : d(w, t);
			return g.existsSync(e) ? g.readFileSync(e, "utf-8") : "";
		} catch {
			return "";
		}
	}), i.handle("file:write", async (e, t, n) => {
		try {
			let e = t.startsWith("/") ? t : d(w, t);
			return g.writeFileSync(e, n, "utf-8"), !0;
		} catch {
			return !1;
		}
	}), i.handle("fs:homedir", () => process.env.HOME || process.cwd()), i.handle("fs:parent", (e, t) => l(t)), i.handle("fs:list", async (e, t) => {
		try {
			if (!g.existsSync(t)) return [];
			let e = [];
			try {
				e = g.readdirSync(t, { withFileTypes: !0 });
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
					path: d(t, e.name)
				};
			}).sort((e, t) => e.isDirectory === t.isDirectory ? e.name.localeCompare(t.name) : e.isDirectory ? -1 : 1);
		} catch (e) {
			return console.error("fs:list outer error:", e), [];
		}
	}), i.handle("file:read-image", async (e, t) => {
		try {
			let e = t.startsWith("/") ? t : d(w, t);
			if (g.existsSync(e)) {
				let t = g.readFileSync(e), n = u(e).toLowerCase().replace(".", "");
				return `data:image/${n === "jpg" ? "jpeg" : n};base64,${t.toString("base64")}`;
			}
			return null;
		} catch (e) {
			return console.error("read-image error:", e), null;
		}
	}), i.on("island:trigger", (e, t) => {
		y && !y.isDestroyed() && (y.showInactive(), y.webContents.send("island:show", t));
	}), i.on("island:status", (e, t) => {
		y && !y.isDestroyed() && (y.showInactive(), y.webContents.send("island:status", t));
	}), i.on("island:prompt", (e, t) => {
		y && !y.isDestroyed() && (y.showInactive(), y.webContents.send("island:prompt", t));
	}), i.on("island:action", async (e, t, n) => {
		if (y) if (n && C[n]) if (Array.isArray(t)) for (let e of t) C[n].write(e), await new Promise((e) => setTimeout(e, 30));
		else t === "approve" ? C[n].write("y\r") : t === "deny" ? C[n].write("n\r") : C[n].write(t);
		else v && !v.isDestroyed() && v.webContents.send("pty:data:default_tab", `\r\n[Agent] User clicked ${t}\r\n`);
	}), i.on("island:set-ignore-mouse-events", (e, t) => {
		y && y.setIgnoreMouseEvents(t, { forward: !0 });
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
			!s && c && g.writeFileSync(c, n, "utf-8");
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
				g.writeFileSync(s, r), t.close();
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
	v = null, y = null, S || (S = !0, n.quit());
}), n.on("activate", () => {
	v === null ? D() : (v.show(), v.focus());
});
//#endregion
