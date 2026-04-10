import { BrowserWindow, Menu, app, clipboard, dialog, globalShortcut, ipcMain, nativeImage, nativeTheme, screen } from "electron";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as os from "node:os";
import * as pty from "node-pty";
import { exec, execSync } from "child_process";
import * as fs from "node:fs";
import * as fs$1 from "fs";
import { join as join$1 } from "path";
//#region \0rolldown/runtime.js
var __commonJSMin = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
//#endregion
//#region electron/nlp-service.ts
var NLPService = class {
	constructor(basePath) {
		this.indexPath = join$1(basePath, "tfidf_index.json");
		this.segmenter = new Intl.Segmenter(["zh-CN", "en-US"], { granularity: "word" });
		this.stopWords = new Set([
			"the",
			"and",
			"in",
			"to",
			"a",
			"of",
			"for",
			"on",
			"with",
			"as",
			"by",
			"at",
			"an",
			"be",
			"this",
			"that",
			"are",
			"or",
			"from",
			"can",
			"it",
			"is",
			"we",
			"you",
			"they",
			"i",
			"my",
			"me",
			"your",
			"he",
			"she",
			"his",
			"her",
			"how",
			"what",
			"where",
			"when",
			"why",
			"who",
			"which",
			"will",
			"would",
			"could",
			"should",
			"do",
			"does",
			"did",
			"have",
			"has",
			"had",
			"not",
			"no",
			"yes",
			"but",
			"if",
			"so",
			"then",
			"than",
			"there",
			"their",
			"them",
			"these",
			"those",
			"的",
			"了",
			"和",
			"是",
			"就",
			"都",
			"而",
			"及",
			"与",
			"着",
			"或",
			"一个",
			"没有",
			"我们",
			"你们",
			"他们",
			"自己",
			"这",
			"那",
			"这里",
			"那里",
			"在",
			"也",
			"把",
			"被",
			"让",
			"向",
			"往",
			"从",
			"对",
			"对于",
			"关于",
			"由于",
			"因为",
			"所以",
			"如果",
			"虽然",
			"但是",
			"然而",
			"那么",
			"可是",
			"不过",
			"只是",
			"不仅",
			"而且",
			"并且",
			"不但",
			"反而",
			"甚至",
			"以",
			"或者",
			"还是",
			"与其",
			"不如",
			"宁可",
			"也不",
			"不管",
			"无论",
			"即使",
			"哪怕",
			"只要",
			"只有",
			"除非",
			"就是",
			"既然",
			"为了",
			"以便",
			"以免",
			"免得",
			"以致",
			"以至",
			"以及",
			"乃至",
			"直至",
			"可以",
			"怎么",
			"什么",
			"为什么",
			"谁",
			"哪个",
			"哪些",
			"怎么做",
			"可以"
		]);
	}
	getTokens(text) {
		return [...this.segmenter.segment(text)].filter((s) => s.isWordLike).map((s) => s.segment.toLowerCase()).filter((w) => !this.stopWords.has(w) && w.length > 1 && !/^[\d\.]+$/.test(w));
	}
	loadIndex() {
		if (fs$1.existsSync(this.indexPath)) try {
			return JSON.parse(fs$1.readFileSync(this.indexPath, "utf-8"));
		} catch (e) {
			console.error("[NLPService] failed to load index", e);
		}
		return {
			docCount: 0,
			df: {}
		};
	}
	saveIndex(index) {
		try {
			fs$1.writeFileSync(this.indexPath, JSON.stringify(index), "utf-8");
		} catch (e) {
			console.error("[NLPService] failed to save index", e);
		}
	}
	/**
	* 提取文本中的 Top K 关键词
	*/
	extractKeywords(text, topK = 3) {
		const tokens = this.getTokens(text);
		if (tokens.length === 0) return [];
		const tf = {};
		tokens.forEach((t) => {
			tf[t] = (tf[t] || 0) + 1;
		});
		const index = this.loadIndex();
		new Set(tokens).forEach((t) => {
			index.df[t] = (index.df[t] || 0) + 1;
		});
		index.docCount += 1;
		setTimeout(() => this.saveIndex(index), 0);
		const tfidf = {};
		const N = index.docCount;
		Object.keys(tf).forEach((t) => {
			const idf = Math.log((N + 1) / (index.df[t] + 1)) + 1;
			tfidf[t] = tf[t] * idf;
		});
		return Object.entries(tfidf).sort((a, b) => b[1] - a[1]).map((entry) => entry[0]).slice(0, topK);
	}
};
//#endregion
//#region electron/context-manager.ts
var import_privacy_filter = (/* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.PrivacyFilter = void 0;
	exports.PrivacyFilter = function() {
		function PrivacyFilter() {}
		/**
		* 检查文本是否包含敏感信息（财产、通讯/聊天记录、账号/密码等）。
		* 如果返回 true，则表示该文本含有敏感信息，不应作为 Context 保存。
		*/
		PrivacyFilter.isSensitive = function(text) {
			if (!text) return false;
			var financePatterns = [
				/银行卡号|信用卡|支付宝|微信支付|余额|转账|汇款|收款|付款码|订单号/i,
				/[$¥€£]\s*\d+(?:,\d{3})*(?:\.\d{2})?/,
				/\b\d{16,19}\b/,
				/btc|eth|usdt|钱包地址/i
			];
			var accountPatterns = [
				/密码|password|pwd|passwd|secret/i,
				/账号|用户名|username|login_id/i,
				/api[_-]?key|access[_-]?token|auth[_-]?token|bearer|jwt/i,
				/sk-[a-zA-Z0-9]{20,}/,
				/ak-[a-zA-Z0-9]{20,}/,
				/[\w.-]+@[\w.-]+\.\w+/,
				/\b1[3-9]\d{9}\b/,
				/\b\d{15,18}\b/
			];
			var chatPatterns = [
				/聊天记录|聊天历史|chat history/i,
				/\[\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\]/,
				/^\s*(?:[A-Za-z0-9_\u4e00-\u9fa5]+)\s*[:：]\s*.+$/m,
				/微信|QQ|WhatsApp|Telegram|钉钉/i,
				/你好|在吗|在干嘛|吃饭了吗/
			];
			for (var _i = 0, financePatterns_1 = financePatterns; _i < financePatterns_1.length; _i++) {
				var pattern = financePatterns_1[_i];
				if (pattern.test(text)) return true;
			}
			for (var _a = 0, accountPatterns_1 = accountPatterns; _a < accountPatterns_1.length; _a++) {
				var pattern = accountPatterns_1[_a];
				if (pattern.test(text)) return true;
			}
			for (var _b = 0, chatPatterns_1 = chatPatterns; _b < chatPatterns_1.length; _b++) {
				var pattern = chatPatterns_1[_b];
				if (pattern.test(text)) return true;
			}
			if (text.trim().length < 5) return true;
			return false;
		};
		return PrivacyFilter;
	}();
})))();
function stripAnsi(str) {
	if (!str) return "";
	let text = str;
	text = text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
	text = text.replace(/\r/g, "");
	return text;
}
var ContextManager = class {
	constructor() {
		this.lastSavedText = "";
		this.lastSavedTime = 0;
		if (app.isPackaged) this.basePath = join$1(app.getPath("userData"), "EasyTerminal_Context");
		else this.basePath = join$1(process.cwd(), ".easy_context");
		this.sessionsPath = join$1(this.basePath, "Sessions");
		this.snippetsPath = join$1(this.basePath, "Snippets");
		this.projectsPath = join$1(this.basePath, "Projects");
		this.initDirs();
		this.nlpService = new NLPService(this.basePath);
	}
	initDirs() {
		[
			this.basePath,
			this.sessionsPath,
			this.snippetsPath,
			this.projectsPath
		].forEach((dir) => {
			if (!fs$1.existsSync(dir)) try {
				fs$1.mkdirSync(dir, { recursive: true });
			} catch (e) {
				console.error(`[ContextManager] Failed to create dir: ${dir}`, e);
			}
		});
	}
	createSessionLogger(sessionId, sessionName) {
		const dateObj = /* @__PURE__ */ new Date();
		const dateStr = dateObj.toISOString().replace(/[:.]/g, "-");
		const fileName = `Session_${sessionName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_")}_${dateStr}.md`;
		const filePath = join$1(this.sessionsPath, fileName);
		const frontmatter = `---
id: "${sessionId}"
title: "${sessionName} (${dateObj.toLocaleString()})"
type: "session"
source: "EasyTerminal"
created_at: "${dateObj.toISOString()}"
tags: ["terminal-session"]
---

## Terminal Session Output

\`\`\`text
`;
		let stream = null;
		try {
			fs$1.writeFileSync(filePath, frontmatter, "utf-8");
			stream = fs$1.createWriteStream(filePath, {
				flags: "a",
				encoding: "utf-8"
			});
		} catch (e) {
			console.error("[ContextManager] Failed to initialize session stream", e);
			return {
				write: () => {},
				end: () => {}
			};
		}
		let buffer = "";
		let flushTimeout = null;
		const flush = () => {
			if (buffer.length > 0 && stream && !stream.destroyed) {
				stream.write(buffer);
				buffer = "";
			}
		};
		return {
			write: (data) => {
				const cleanData = stripAnsi(data);
				buffer += cleanData;
				if (buffer.length > 1024) {
					if (flushTimeout) {
						clearTimeout(flushTimeout);
						flushTimeout = null;
					}
					flush();
				} else if (!flushTimeout) flushTimeout = setTimeout(() => {
					flush();
					flushTimeout = null;
				}, 1e3);
			},
			end: () => {
				if (flushTimeout) {
					clearTimeout(flushTimeout);
					flushTimeout = null;
				}
				flush();
				if (stream && !stream.destroyed) {
					stream.write("\n```\n\n*Session closed at " + (/* @__PURE__ */ new Date()).toLocaleString() + "*\n");
					stream.end(() => {
						try {
							const fullContent = fs$1.readFileSync(filePath, "utf-8");
							const contentToAnalyze = fullContent.replace(/^---[\s\S]+?---/, "");
							const keywords = this.nlpService.extractKeywords(contentToAnalyze, 3);
							if (keywords.length > 0) {
								const tagsStr = `["terminal-session", ${keywords.map((k) => `"${k}"`).join(", ")}]`;
								const updatedContent = fullContent.replace(/tags:\s*\["terminal-session"\]/, `tags: ${tagsStr}`);
								fs$1.writeFileSync(filePath, updatedContent, "utf-8");
								console.log(`[ContextManager] Added TF-IDF tags to session: ${keywords.join(", ")}`);
							}
						} catch (e) {
							console.error("[ContextManager] Failed to run TF-IDF tag extraction", e);
						}
					});
				}
			},
			destroy: () => {
				if (flushTimeout) {
					clearTimeout(flushTimeout);
					flushTimeout = null;
				}
				if (stream && !stream.destroyed) stream.end(() => {
					try {
						if (fs$1.existsSync(filePath)) {
							fs$1.unlinkSync(filePath);
							console.log(`[ContextManager] Destroyed session log: ${filePath}`);
						}
					} catch (e) {
						console.error(`[ContextManager] Failed to delete session log: ${filePath}`, e);
					}
				});
				else try {
					if (fs$1.existsSync(filePath)) {
						fs$1.unlinkSync(filePath);
						console.log(`[ContextManager] Destroyed session log: ${filePath}`);
					}
				} catch (e) {
					console.error(`[ContextManager] Failed to delete session log: ${filePath}`, e);
				}
			}
		};
	}
	saveContextSnippet(content, source = "clipboard") {
		try {
			if (!content || !content.trim()) return null;
			const now = Date.now();
			if (this.lastSavedText === content && now - this.lastSavedTime < 3e3) {
				console.log(`[ContextManager] Ignored duplicate snippet save from ${source}`);
				return null;
			}
			this.lastSavedText = content;
			this.lastSavedTime = now;
			const isSensitive = import_privacy_filter.PrivacyFilter.isSensitive(content);
			if (isSensitive) console.log(`[ContextManager] Flagged sensitive content from ${source} (Saving anyway with warning)`);
			const dateObj = /* @__PURE__ */ new Date();
			const dayStr = dateObj.toISOString().split("T")[0];
			const fileName = `Snippets_${dayStr}.md`;
			const filePath = join$1(this.snippetsPath, fileName);
			const newKeywords = this.nlpService.extractKeywords(content, 3);
			const appendBlock = `\n\n## [${dateObj.toLocaleTimeString()}] ${source}\n*Tags: ${newKeywords.join(", ")}*\n\n${content}`;
			if (fs$1.existsSync(filePath)) {
				let existingContent = fs$1.readFileSync(filePath, "utf-8");
				const tagsMatch = existingContent.match(/tags:\s*\[(.*?)\]/);
				let currentTags = [];
				if (tagsMatch) currentTags = tagsMatch[1].split(",").map((t) => t.trim().replace(/^"|"$/g, "")).filter((t) => t && t !== "snippet");
				const tagsStr = `["snippet", ${Array.from(new Set([...currentTags, ...newKeywords])).slice(0, 15).map((k) => `"${k}"`).join(", ")}]`;
				existingContent = existingContent.replace(/tags:\s*\[.*?\]/, `tags: ${tagsStr}`);
				fs$1.writeFileSync(filePath, existingContent + appendBlock, "utf-8");
				console.log(`[ContextManager] Appended snippet to ${fileName}`);
			} else {
				const tagsStr = `["snippet", ${newKeywords.map((k) => `"${k}"`).join(", ")}]`;
				const frontmatter = `---
id: "snippets_${dayStr}"
title: "Snippets ${dayStr}"
type: "daily_snippets"
created_at: "${dateObj.toISOString()}"
tags: ${tagsStr}
---

# Daily Snippets - ${dayStr}`;
				fs$1.writeFileSync(filePath, frontmatter + appendBlock, "utf-8");
				console.log(`[ContextManager] Created new daily snippet file: ${fileName}`);
			}
			return {
				filePath,
				isSensitive
			};
		} catch (e) {
			console.error("[ContextManager] Failed to save snippet", e);
			return null;
		}
	}
};
var contextManager = new ContextManager();
//#endregion
//#region electron/main.ts
process.on("uncaughtException", (err) => {
	console.error("UNCAUGHT EXCEPTION:", err);
});
process.on("unhandledRejection", (err) => {
	console.error("UNHANDLED REJECTION:", err);
});
var __dirname = dirname(fileURLToPath(import.meta.url));
nativeTheme.themeSource = "dark";
var win = null;
var islandWin = null;
app.commandLine.appendSwitch("disable-features", "IOSurfaceCapturer,HardwareMediaKeyHandling");
app.commandLine.appendSwitch("enable-transparent-visuals");
var shell = os.platform() === "win32" ? "powershell.exe" : process.env.SHELL || "bash";
if (process.platform === "darwin" && app.isPackaged) try {
	const userPath = execSync(`${shell} -l -c "echo \\$PATH"`).toString().trim();
	if (userPath) process.env.PATH = userPath;
} catch {}
var hasTmux = false;
try {
	if (os.platform() !== "win32") {
		execSync("which tmux", { stdio: "ignore" });
		hasTmux = true;
	}
} catch {
	hasTmux = false;
}
var isQuitting = false;
app.on("before-quit", () => {
	isQuitting = true;
});
var terminals = {};
var sessionLoggers = {};
var currentCwd = process.env.HOME || process.cwd();
var getIconPath = () => {
	const p = app.isPackaged ? join(__dirname, "../dist/icon.png") : join(__dirname, "../build/icon.png");
	console.log("Icon path:", p);
	return p;
};
var getNativeIcon = () => {
	return nativeImage.createFromPath(getIconPath());
};
function createWindow() {
	win = new BrowserWindow({
		width: 1e3,
		height: 800,
		titleBarStyle: "hiddenInset",
		transparent: true,
		backgroundColor: "#00000000",
		...process.platform !== "darwin" && { icon: getNativeIcon() },
		webPreferences: {
			preload: join(__dirname, "preload.js"),
			nodeIntegration: true,
			contextIsolation: false,
			webviewTag: true,
			webSecurity: false
		}
	});
	win.on("close", (e) => {
		if (!isQuitting) {
			e.preventDefault();
			console.log("Main window is closing! (event fired)");
			if (Object.keys(terminals).length > 0) {
				const choice = dialog.showMessageBoxSync(win, {
					type: "question",
					buttons: [
						"取消 (Cancel)",
						"不保留记录退出 (Discard & Quit)",
						"保留记录退出 (Save & Quit)"
					],
					defaultId: 2,
					cancelId: 0,
					title: "确认退出",
					message: "确定要退出 EasyTerminal 吗？",
					detail: "退出将终止所有正在运行的终端会话。您是否要保留当前会话的上下文记录？",
					icon: getNativeIcon()
				});
				if (choice === 0) return;
				const shouldSave = choice === 2;
				for (const id in terminals) {
					try {
						if (sessionLoggers[id]) {
							if (shouldSave) sessionLoggers[id].end();
							else if (typeof sessionLoggers[id].destroy === "function") sessionLoggers[id].destroy();
							else sessionLoggers[id].end();
							delete sessionLoggers[id];
						}
						terminals[id].kill();
					} catch {}
					delete terminals[id];
				}
			} else for (const id in terminals) delete terminals[id];
			if (islandWin && !islandWin.isDestroyed()) {
				console.log("Destroying island window");
				islandWin.destroy();
				islandWin = null;
			}
			isQuitting = true;
			const currentWin = win;
			win = null;
			if (currentWin && !currentWin.isDestroyed()) currentWin.destroy();
			app.quit();
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
		show: false,
		...process.platform !== "darwin" && { icon: getNativeIcon() },
		webPreferences: {
			preload: join(__dirname, "preload.js"),
			nodeIntegration: true,
			contextIsolation: false
		}
	});
	islandWin.setAlwaysOnTop(true, "screen-saver");
	islandWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
	islandWin.setIgnoreMouseEvents(true, { forward: true });
	win.webContents.on("render-process-gone", (e, details) => {
		console.error("win render-process-gone:", details);
	});
	win.webContents.on("crashed", () => {
		console.error("win crashed!");
	});
	win.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
		console.error("win did-fail-load:", errorCode, errorDescription);
	});
	if (process.env.VITE_DEV_SERVER_URL) {
		win.loadURL(process.env.VITE_DEV_SERVER_URL);
		islandWin.loadURL(process.env.VITE_DEV_SERVER_URL + "#island");
		win.webContents.openDevTools();
	} else {
		win.loadFile(join(__dirname, "../dist/index.html"));
		islandWin.loadFile(join(__dirname, "../dist/index.html"), { hash: "island" });
	}
}
app.setName("EasyTerminal");
var lastShortcutTrigger = 0;
app.whenReady().then(() => {
	if (process.platform === "darwin") {
		app.dock.show();
		if (!app.isPackaged) {
			const icon = getNativeIcon();
			app.dock.setIcon(icon);
		}
	}
	ipcMain.handle("get-context-path", () => contextManager.basePath);
	ipcMain.handle("get-webview-preload-path", () => {
		const p = app.isPackaged ? join(__dirname, "../dist/webview-preload.js") : join(__dirname, "../public/webview-preload.js");
		console.log("Resolved webview preload path:", p);
		return p;
	});
	createWindow();
	const shortcutKey = "CommandOrControl+Shift+C";
	if (globalShortcut.isRegistered(shortcutKey)) globalShortcut.unregister(shortcutKey);
	if (!globalShortcut.register(shortcutKey, () => {
		const now = Date.now();
		if (now - lastShortcutTrigger < 1e3) {
			console.log("[GlobalShortcut] Ignored duplicate trigger within 1s");
			return;
		}
		lastShortcutTrigger = now;
		if (process.platform === "darwin") {
			const oldClipboardText = clipboard.readText();
			console.log(`[GlobalShortcut] Triggered. Old clipboard length: ${oldClipboardText.length}`);
			clipboard.clear();
			setTimeout(() => {
				exec(`osascript -e 'tell application "System Events" to key code 8 using {command down}'`, (error) => {
					if (error) {
						console.error("[GlobalShortcut] Failed to simulate Cmd+C", error);
						clipboard.writeText(oldClipboardText);
						if (win && !win.isDestroyed()) win.webContents.send("notification:show", {
							title: "Permission Required",
							body: "Please grant Accessibility permission in System Settings to capture selected text.",
							type: "error"
						});
						return;
					}
					let attempts = 0;
					const maxAttempts = 15;
					const checkClipboard = () => {
						clipboard.availableFormats();
						const newText = clipboard.readText();
						console.log(`[GlobalShortcut] Polling ${attempts + 1}/${maxAttempts}... New length: ${newText.length}, Is empty: ${!newText}`);
						if (newText && newText.trim() !== "") {
							const result = contextManager.saveContextSnippet(newText, "GlobalShortcut");
							if (result) {
								if (result.isSensitive) {
									if (islandWin && !islandWin.isDestroyed()) {
										islandWin.showInactive();
										islandWin.webContents.send("island:prompt", {
											message: "⚠️ 已保存，但检测到内容可能包含敏感隐私（如账号、资产等），请注意数据安全。",
											options: [{
												key: "ok",
												label: "我知道了"
											}],
											sessionId: "system",
											sessionName: "Privacy Alert"
										});
									}
								} else if (win && !win.isDestroyed()) win.webContents.send("notification:show", {
									title: "Context Captured",
									body: "Selected text saved successfully.",
									type: "success"
								});
							}
							return;
						}
						if (attempts >= maxAttempts) {
							console.log("[GlobalShortcut] Timeout reached. Cmd+C failed or no text selected.");
							clipboard.writeText(oldClipboardText);
							if (win && !win.isDestroyed()) win.webContents.send("notification:show", {
								title: "Capture Failed",
								body: "No text was selected or copy failed. Please try Cmd+C manually.",
								type: "warning"
							});
							return;
						}
						attempts++;
						setTimeout(checkClipboard, 100);
					};
					setTimeout(checkClipboard, 100);
				});
			}, 300);
		} else setTimeout(() => {
			const text = clipboard.readText();
			if (text && text.trim()) {
				const result = contextManager.saveContextSnippet(text, "GlobalShortcut");
				if (result) {
					if (result.isSensitive) {
						if (islandWin && !islandWin.isDestroyed()) {
							islandWin.showInactive();
							islandWin.webContents.send("island:prompt", {
								message: "⚠️ 已保存，但检测到内容可能包含敏感隐私（如账号、资产等），请注意数据安全。",
								options: [{
									key: "ok",
									label: "我知道了"
								}],
								sessionId: "system",
								sessionName: "Privacy Alert"
							});
						}
					} else if (win && !win.isDestroyed()) win.webContents.send("notification:show", {
						title: "Context Captured",
						body: "Clipboard saved successfully.",
						type: "success"
					});
				}
			}
		}, 100);
	})) console.error(`[GlobalShortcut] Failed to register ${shortcutKey}. It might be used by another app.`);
	ipcMain.on("window:resize", (_event, width) => {
		if (win && !win.isDestroyed()) {
			const bounds = win.getBounds();
			win.setBounds({
				x: bounds.x,
				y: bounds.y,
				width,
				height: bounds.height
			}, true);
		}
	});
	ipcMain.on("pty:kill", (_event, id) => {
		if (terminals[id]) {
			if (sessionLoggers[id]) {
				sessionLoggers[id].end();
				delete sessionLoggers[id];
			}
			try {
				terminals[id].kill();
			} catch {}
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
		} else if (os.platform() !== "win32") args = ["-l"];
		const ptyProcess = pty.spawn(command, args, {
			name: "xterm-256color",
			cols: 80,
			rows: 30,
			cwd: currentCwd,
			env: process.env
		});
		sessionLoggers[id] = contextManager.createSessionLogger(id, id);
		ptyProcess.onData((data) => {
			if (win && !win.isDestroyed()) win.webContents.send(`pty:data:${id}`, data);
			if (sessionLoggers[id]) sessionLoggers[id].write(data);
		});
		terminals[id] = ptyProcess;
		event.reply(`pty:created:${id}`);
	});
	ipcMain.on("pty:write", (_event, id, data) => {
		terminals[id]?.write(data);
	});
	ipcMain.on("pty:resize", (_event, id, cols, rows) => {
		terminals[id]?.resize(cols, rows);
	});
	ipcMain.handle("autocomplete:path", async (_event, partialPath) => {
		try {
			const searchDir = partialPath.startsWith("/") ? dirname(partialPath) : currentCwd;
			const searchPrefix = basename(partialPath);
			if (!fs.existsSync(searchDir)) return [];
			return fs.readdirSync(searchDir).filter((f) => f.startsWith(searchPrefix)).map((f) => {
				const fullPath = join(searchDir, f);
				return fs.statSync(fullPath).isDirectory() ? f + "/" : f;
			});
		} catch {
			return [];
		}
	});
	ipcMain.handle("file:read", async (_event, filePath) => {
		try {
			const fullPath = filePath.startsWith("/") ? filePath : join(currentCwd, filePath);
			if (fs.existsSync(fullPath)) return fs.readFileSync(fullPath, "utf-8");
			return "";
		} catch {
			return "";
		}
	});
	ipcMain.handle("file:write", async (_event, filePath, content) => {
		try {
			const fullPath = filePath.startsWith("/") ? filePath : join(currentCwd, filePath);
			fs.writeFileSync(fullPath, content, "utf-8");
			return true;
		} catch {
			return false;
		}
	});
	ipcMain.handle("fs:homedir", () => process.env.HOME || process.cwd());
	ipcMain.handle("fs:parent", (_event, dirPath) => dirname(dirPath));
	ipcMain.handle("fs:list", async (_event, dirPath) => {
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
				} catch {
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
	ipcMain.handle("file:read-image", async (_event, filePath) => {
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
	ipcMain.on("island:trigger", (_event, msg) => {
		if (islandWin && !islandWin.isDestroyed()) {
			islandWin.showInactive();
			islandWin.webContents.send("island:show", msg);
		}
	});
	ipcMain.on("island:save-context", (event, data) => {
		if (data.text && data.text.trim()) {
			const result = contextManager.saveContextSnippet(data.text, data.source);
			if (result) event.reply("island:save-result", {
				success: true,
				filePath: result.filePath,
				isSensitive: result.isSensitive
			});
			else event.reply("island:save-result", {
				success: false,
				reason: "duplicate_or_error"
			});
		}
	});
	ipcMain.on("island:status", (_event, msg) => {
		if (islandWin && !islandWin.isDestroyed()) {
			islandWin.showInactive();
			islandWin.webContents.send("island:status", msg);
		}
	});
	ipcMain.on("island:prompt", (_event, data) => {
		if (islandWin && !islandWin.isDestroyed()) {
			islandWin.showInactive();
			islandWin.webContents.send("island:prompt", data);
		}
	});
	ipcMain.on("island:action", async (_event, action, sessionId) => {
		if (islandWin) {
			if (sessionId && terminals[sessionId]) if (Array.isArray(action)) for (const stroke of action) {
				terminals[sessionId].write(stroke);
				await new Promise((resolve) => setTimeout(resolve, 30));
			}
			else if (action === "approve") terminals[sessionId].write("y\r");
			else if (action === "deny") terminals[sessionId].write("n\r");
			else terminals[sessionId].write(action);
			else if (win && !win.isDestroyed()) win.webContents.send(`pty:data:default_tab`, `\r\n[Agent] User clicked ${action}\r\n`);
		}
	});
	ipcMain.on("island:set-ignore-mouse-events", (_event, ignore) => {
		if (islandWin) islandWin.setIgnoreMouseEvents(ignore, { forward: true });
	});
	ipcMain.on("export:save-file", async (event, { content, format, defaultName }) => {
		try {
			const window = BrowserWindow.fromWebContents(event.sender);
			const { canceled, filePath } = await dialog.showSaveDialog(window, {
				title: `Save ${format.toUpperCase()}`,
				defaultPath: defaultName,
				filters: [{
					name: format.toUpperCase(),
					extensions: [format]
				}]
			});
			if (!canceled && filePath) fs.writeFileSync(filePath, content, "utf-8");
		} catch (e) {
			console.error("Failed to save file", e);
		}
	});
	ipcMain.on("export:save-pdf", async (event, { htmlContent, defaultName }) => {
		try {
			const window = BrowserWindow.fromWebContents(event.sender);
			const { canceled, filePath } = await dialog.showSaveDialog(window, {
				title: "Save PDF",
				defaultPath: defaultName,
				filters: [{
					name: "PDF",
					extensions: ["pdf"]
				}]
			});
			if (!canceled && filePath) {
				const pdfWindow = new BrowserWindow({ show: false });
				await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
				const pdfData = await pdfWindow.webContents.printToPDF({
					printBackground: true,
					margins: { marginType: "default" }
				});
				fs.writeFileSync(filePath, pdfData);
				pdfWindow.close();
			}
		} catch (e) {
			console.error("Failed to save PDF", e);
		}
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
app.on("will-quit", () => {
	globalShortcut.unregisterAll();
});
app.on("window-all-closed", () => {
	win = null;
	islandWin = null;
	if (!isQuitting) {
		isQuitting = true;
		app.quit();
	}
});
app.on("activate", () => {
	if (win === null) createWindow();
	else {
		win.show();
		win.focus();
	}
});
//#endregion
