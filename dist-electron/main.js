import { _ as e, b as t, f as n, g as r, h as i, m as a, n as o, p as s, s as c, y as l } from "./knowledge-base-OyYqnYj3.js";
import { A as u, C as d, D as f, E as p, M as m, N as h, O as g, S as _, T as v, _ as y, a as b, b as x, c as S, d as C, f as ee, g as w, h as T, j as E, k as D, m as O, o as te, p as ne, u as re, v as ie, w as ae, x as oe, y as se } from "./workflow-engine-qFVksGcZ.js";
import { a as ce, i as le, r as ue, t as de } from "./api-endpoints-DhjlwvzL.js";
import { n as fe, t as pe } from "./llm-gateway-BfadpyFP.js";
import me, { BrowserWindow as k, Menu as he, app as A, clipboard as ge, dialog as _e, globalShortcut as ve, ipcMain as j, nativeImage as ye, nativeTheme as be, screen as xe } from "electron";
import * as Se from "node:path";
import M, { basename as Ce, dirname as we, extname as Te, join as N, resolve as Ee } from "node:path";
import { fileURLToPath as De } from "node:url";
import * as Oe from "node:os";
import ke from "node:os";
import * as Ae from "node-pty";
import { exec as je, execFileSync as Me, execSync as Ne } from "child_process";
import * as P from "node:fs";
import F from "node:fs";
import * as I from "fs";
import { join as Pe } from "path";
import L from "node:process";
import { isDeepStrictEqual as Fe, promisify as R } from "node:util";
import Ie, { randomBytes as Le, randomUUID as Re } from "node:crypto";
import ze from "node:assert";
import "node:events";
import "node:stream";
import Be from "node:net";
//#region \0rolldown/runtime.js
var Ve = Object.create, He = Object.defineProperty, Ue = Object.getOwnPropertyDescriptor, We = Object.getOwnPropertyNames, Ge = Object.getPrototypeOf, Ke = Object.prototype.hasOwnProperty, qe = (e, t) => () => (e && (t = e(e = 0)), t), z = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports), Je = (e, t) => {
	let n = {};
	for (var r in e) He(n, r, {
		get: e[r],
		enumerable: !0
	});
	return t || He(n, Symbol.toStringTag, { value: "Module" }), n;
}, Ye = (e, t, n, r) => {
	if (t && typeof t == "object" || typeof t == "function") for (var i = We(t), a = 0, o = i.length, s; a < o; a++) s = i[a], !Ke.call(e, s) && s !== n && He(e, s, {
		get: ((e) => t[e]).bind(null, s),
		enumerable: !(r = Ue(t, s)) || r.enumerable
	});
	return e;
}, Xe = (e, t, n) => (n = e == null ? {} : Ve(Ge(e)), Ye(t || !e || !e.__esModule ? He(n, "default", {
	value: e,
	enumerable: !0
}) : n, e)), Ze = (e) => Ke.call(e, "module.exports") ? e["module.exports"] : Ye(He({}, "__esModule", { value: !0 }), e), Qe = class {
	constructor(e) {
		this.indexPath = Pe(e, "tfidf_index.json"), this.segmenter = new Intl.Segmenter(["zh-CN", "en-US"], { granularity: "word" }), this.stopWords = new Set(/* @__PURE__ */ "the.and.in.to.a.of.for.on.with.as.by.at.an.be.this.that.are.or.from.can.it.is.we.you.they.i.my.me.your.he.she.his.her.how.what.where.when.why.who.which.will.would.could.should.do.does.did.have.has.had.not.no.yes.but.if.so.then.than.there.their.them.these.those.的.了.和.是.就.都.而.及.与.着.或.一个.没有.我们.你们.他们.自己.这.那.这里.那里.在.也.把.被.让.向.往.从.对.对于.关于.由于.因为.所以.如果.虽然.但是.然而.那么.可是.不过.只是.不仅.而且.并且.不但.反而.甚至.以.或者.还是.与其.不如.宁可.也不.不管.无论.即使.哪怕.只要.只有.除非.就是.既然.为了.以便.以免.免得.以致.以至.以及.乃至.直至.可以.怎么.什么.为什么.谁.哪个.哪些.怎么做.可以".split("."));
	}
	getTokens(e) {
		return [...this.segmenter.segment(e)].filter((e) => e.isWordLike).map((e) => e.segment.toLowerCase()).filter((e) => !this.stopWords.has(e) && e.length > 1 && !/^[\d.]+$/.test(e));
	}
	loadIndex() {
		if (I.existsSync(this.indexPath)) try {
			return JSON.parse(I.readFileSync(this.indexPath, "utf-8"));
		} catch (e) {
			console.error("[NLPService] failed to load index", e);
		}
		return {
			docCount: 0,
			df: {}
		};
	}
	saveIndex(e) {
		try {
			I.writeFileSync(this.indexPath, JSON.stringify(e), "utf-8");
		} catch (e) {
			console.error("[NLPService] failed to save index", e);
		}
	}
	extractKeywords(e, t = 3) {
		let n = this.getTokens(e);
		if (n.length === 0) return [];
		let r = {};
		n.forEach((e) => {
			r[e] = (r[e] || 0) + 1;
		});
		let i = this.loadIndex();
		new Set(n).forEach((e) => {
			i.df[e] = (i.df[e] || 0) + 1;
		}), i.docCount += 1, setTimeout(() => this.saveIndex(i), 0);
		let a = {}, o = i.docCount;
		return Object.keys(r).forEach((e) => {
			let t = Math.log((o + 1) / (i.df[e] + 1)) + 1;
			a[e] = r[e] * t;
		}), Object.entries(a).sort((e, t) => t[1] - e[1]).map((e) => e[0]).slice(0, t);
	}
}, $e = (/* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.PrivacyFilter = void 0, e.PrivacyFilter = function() {
		function e() {}
		return e.isSensitive = function(e) {
			if (!e) return !1;
			for (var t = [
				/银行卡号|信用卡|支付宝|微信支付|余额|转账|汇款|收款|付款码|订单号/i,
				/[$¥€£]\s*\d+(?:,\d{3})*(?:\.\d{2})?/,
				/\b\d{16,19}\b/,
				/btc|eth|usdt|钱包地址/i
			], n = [
				/密码|password|pwd|passwd|secret/i,
				/账号|用户名|username|login_id/i,
				/api[_-]?key|access[_-]?token|auth[_-]?token|bearer|jwt/i,
				/sk-[a-zA-Z0-9]{20,}/,
				/ak-[a-zA-Z0-9]{20,}/,
				/[\w.-]+@[\w.-]+\.\w+/,
				/\b1[3-9]\d{9}\b/,
				/\b\d{15,18}\b/
			], r = [
				/聊天记录|聊天历史|chat history/i,
				/\[\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\]/,
				/^\s*(?:[A-Za-z0-9_\u4e00-\u9fa5]+)\s*[:：]\s*.+$/m,
				/微信|QQ|WhatsApp|Telegram|钉钉/i,
				/你好|在吗|在干嘛|吃饭了吗/
			], i = 0, a = t; i < a.length; i++) {
				var o = a[i];
				if (o.test(e)) return !0;
			}
			for (var s = 0, c = n; s < c.length; s++) {
				var o = c[s];
				if (o.test(e)) return !0;
			}
			for (var l = 0, u = r; l < u.length; l++) {
				var o = u[l];
				if (o.test(e)) return !0;
			}
			return e.trim().length < 5;
		}, e;
	}();
})))();
function et(e) {
	if (!e) return "";
	let t = e;
	return t = t.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, ""), t = t.replace(/\r/g, ""), t;
}
var tt = new class {
	constructor() {
		this.lastSavedText = "", this.lastSavedTime = 0, A.isPackaged ? this.basePath = Pe(A.getPath("userData"), "EasyTerminal_Context") : this.basePath = Pe(process.cwd(), ".easy_context"), this.sessionsPath = Pe(this.basePath, "Sessions"), this.snippetsPath = Pe(this.basePath, "Snippets"), this.projectsPath = Pe(this.basePath, "Projects"), this.initDirs(), this.nlpService = new Qe(this.basePath);
	}
	initDirs() {
		[
			this.basePath,
			this.sessionsPath,
			this.snippetsPath,
			this.projectsPath
		].forEach((e) => {
			if (!I.existsSync(e)) try {
				I.mkdirSync(e, { recursive: !0 });
			} catch (t) {
				console.error(`[ContextManager] Failed to create dir: ${e}`, t);
			}
		});
	}
	createSessionLogger(e, t) {
		let n = /* @__PURE__ */ new Date(), r = n.toISOString().replace(/[:.]/g, "-"), i = `Session_${t.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_")}_${r}.md`, a = Pe(this.sessionsPath, i), o = `${`---
id: "${e}"
title: "${t} (${n.toLocaleString()})"
type: "session"
source: "EasyTerminal"
created_at: "${n.toISOString()}"
tags: ["terminal-session"]
---

## Terminal Session Output
`}\n\`\`\`text\n`, s = null;
		try {
			I.writeFileSync(a, o, "utf-8"), s = I.createWriteStream(a, {
				flags: "a",
				encoding: "utf-8"
			}), p({
				session_id: e,
				event_type: "session_start",
				payload: JSON.stringify({
					title: t,
					filePath: a
				}),
				token_estimate: 0
			});
		} catch (e) {
			return console.error("[ContextManager] Failed to initialize session stream", e), {
				write: () => {},
				end: () => {}
			};
		}
		let c = "", l = null, u = () => {
			c.length > 0 && s && !s.destroyed && (s.write(c), c = "");
		};
		return {
			write: (e) => {
				let t = et(e);
				c += t, c.length > 1024 ? (l &&= (clearTimeout(l), null), u()) : l ||= setTimeout(() => {
					u(), l = null;
				}, 1e3);
			},
			end: () => {
				l &&= (clearTimeout(l), null), u(), s && !s.destroyed && (s.write("\n```\n\n*Session closed at " + (/* @__PURE__ */ new Date()).toLocaleString() + "*\n"), s.end(() => {
					try {
						let n = I.readFileSync(a, "utf-8"), r = n.replace(/^---[\s\S]+?---/, ""), i = this.nlpService.extractKeywords(r, 3);
						if (i.length > 0) {
							let e = `["terminal-session", ${i.map((e) => `"${e}"`).join(", ")}]`, t = n.replace(/tags:\s*\["terminal-session"\]/, `tags: ${e}`);
							I.writeFileSync(a, t, "utf-8"), console.log(`[ContextManager] Added TF-IDF tags to session: ${i.join(", ")}`);
						}
						let o = r.replace(/```[\s\S]*?```/g, "").replace(/^#+\s+/gm, "").replace(/\s+/g, " ").trim().slice(0, 240) || "Session completed";
						f({
							scope: "session",
							kind: "summary",
							title: `Session ${t}`,
							summary: o,
							details: a,
							salience: .7,
							status: "active",
							source_type: "session",
							source_ref: a,
							evidence_refs: [a]
						}), p({
							session_id: e,
							event_type: "session_end",
							payload: JSON.stringify({
								filePath: a,
								keywords: i,
								summary: o
							}),
							token_estimate: 0
						});
					} catch (e) {
						console.error("[ContextManager] Failed to run TF-IDF tag extraction", e);
					}
				}));
			},
			destroy: () => {
				if (l &&= (clearTimeout(l), null), s && !s.destroyed) s.end(() => {
					try {
						I.existsSync(a) && (I.unlinkSync(a), console.log(`[ContextManager] Destroyed session log: ${a}`));
					} catch (e) {
						console.error(`[ContextManager] Failed to delete session log: ${a}`, e);
					}
				});
				else try {
					I.existsSync(a) && (I.unlinkSync(a), console.log(`[ContextManager] Destroyed session log: ${a}`));
				} catch (e) {
					console.error(`[ContextManager] Failed to delete session log: ${a}`, e);
				}
			}
		};
	}
	saveContextSnippet(e, t = "clipboard") {
		try {
			if (!e || !e.trim()) return null;
			let n = Date.now();
			if (this.lastSavedText === e && n - this.lastSavedTime < 3e3) return console.log(`[ContextManager] Ignored duplicate snippet save from ${t}`), null;
			this.lastSavedText = e, this.lastSavedTime = n;
			let r = $e.PrivacyFilter.isSensitive(e);
			r && console.log(`[ContextManager] Flagged sensitive content from ${t} (Saving anyway with warning)`);
			let i = /* @__PURE__ */ new Date(), a = i.toISOString().split("T")[0], o = `Snippets_${a}.md`, s = Pe(this.snippetsPath, o), c = this.nlpService.extractKeywords(e, 3), l = `\n\n## [${i.toLocaleTimeString()}] ${t}\n*Tags: ${c.join(", ")}*\n\n${e}`;
			if (I.existsSync(s)) {
				let e = I.readFileSync(s, "utf-8"), t = e.match(/tags:\s*\[(.*?)\]/), n = [];
				t && (n = t[1].split(",").map((e) => e.trim().replace(/^"|"$/g, "")).filter((e) => e && e !== "snippet"));
				let r = `["snippet", ${Array.from(new Set([...n, ...c])).slice(0, 15).map((e) => `"${e}"`).join(", ")}]`;
				e = e.replace(/tags:\s*\[.*?\]/, `tags: ${r}`), I.writeFileSync(s, e + l, "utf-8"), console.log(`[ContextManager] Appended snippet to ${o}`);
			} else {
				let e = `["snippet", ${c.map((e) => `"${e}"`).join(", ")}]`, t = `---
id: "snippets_${a}"
title: "Snippets ${a}"
type: "daily_snippets"
created_at: "${i.toISOString()}"
tags: ${e}
---

# Daily Snippets - ${a}`;
				I.writeFileSync(s, t + l, "utf-8"), console.log(`[ContextManager] Created new daily snippet file: ${o}`);
			}
			return f({
				scope: "project",
				kind: "artifact",
				title: `Snippet ${t}`,
				summary: e.trim().slice(0, 240),
				details: s,
				salience: r ? .9 : .5,
				status: "active",
				source_type: "manual",
				source_ref: s,
				evidence_refs: [s]
			}), {
				filePath: s,
				isSensitive: r
			};
		} catch (e) {
			return console.error("[ContextManager] Failed to save snippet", e), null;
		}
	}
	listArtifacts() {
		let e = (e, t) => I.existsSync(e) ? I.readdirSync(e, { withFileTypes: !0 }).filter((e) => e.isFile() && (e.name.endsWith(".md") || e.name.endsWith(".txt"))).map((n) => {
			let r = Pe(e, n.name), i = I.statSync(r), a = I.readFileSync(r, "utf-8"), o = a.match(/title:\s*"(.+?)"/), s = a.match(/tags:\s*\[(.*?)\]/), c = a.replace(/^---[\s\S]+?---/m, "").replace(/```[\s\S]*?```/g, "").replace(/^#+\s+/gm, "").replace(/\s+/g, " ").trim();
			return {
				id: r,
				type: t,
				name: o?.[1] || n.name,
				path: r,
				updatedAt: i.mtime.toISOString(),
				size: i.size,
				preview: c.slice(0, 220),
				tags: s ? s[1].split(",").map((e) => e.trim().replace(/^"|"$/g, "")).filter(Boolean) : []
			};
		}).sort((e, t) => t.updatedAt.localeCompare(e.updatedAt)) : [];
		return {
			basePath: this.basePath,
			sessions: e(this.sessionsPath, "session"),
			snippets: e(this.snippetsPath, "snippet"),
			projects: e(this.projectsPath, "project")
		};
	}
}(), nt = (e) => {
	let t = typeof e;
	return e !== null && (t === "object" || t === "function");
}, rt = new Set([
	"__proto__",
	"prototype",
	"constructor"
]), it = 1e6, at = (e) => e >= "0" && e <= "9";
function ot(e) {
	if (e === "0") return !0;
	if (/^[1-9]\d*$/.test(e)) {
		let t = Number.parseInt(e, 10);
		return t <= 2 ** 53 - 1 && t <= it;
	}
	return !1;
}
function st(e, t) {
	return rt.has(e) ? !1 : (e && ot(e) ? t.push(Number.parseInt(e, 10)) : t.push(e), !0);
}
function ct(e) {
	if (typeof e != "string") throw TypeError(`Expected a string, got ${typeof e}`);
	let t = [], n = "", r = "start", i = !1, a = 0;
	for (let o of e) {
		if (a++, i) {
			n += o, i = !1;
			continue;
		}
		if (o === "\\") {
			if (r === "index") throw Error(`Invalid character '${o}' in an index at position ${a}`);
			if (r === "indexEnd") throw Error(`Invalid character '${o}' after an index at position ${a}`);
			i = !0, r = r === "start" ? "property" : r;
			continue;
		}
		switch (o) {
			case ".":
				if (r === "index") throw Error(`Invalid character '${o}' in an index at position ${a}`);
				if (r === "indexEnd") {
					r = "property";
					break;
				}
				if (!st(n, t)) return [];
				n = "", r = "property";
				break;
			case "[":
				if (r === "index") throw Error(`Invalid character '${o}' in an index at position ${a}`);
				if (r === "indexEnd") {
					r = "index";
					break;
				}
				if (r === "property" || r === "start") {
					if ((n || r === "property") && !st(n, t)) return [];
					n = "";
				}
				r = "index";
				break;
			case "]":
				if (r === "index") {
					if (n === "") n = (t.pop() || "") + "[]", r = "property";
					else {
						let e = Number.parseInt(n, 10);
						!Number.isNaN(e) && Number.isFinite(e) && e >= 0 && e <= 2 ** 53 - 1 && e <= it && n === String(e) ? t.push(e) : t.push(n), n = "", r = "indexEnd";
					}
					break;
				}
				if (r === "indexEnd") throw Error(`Invalid character '${o}' after an index at position ${a}`);
				n += o;
				break;
			default:
				if (r === "index" && !at(o)) throw Error(`Invalid character '${o}' in an index at position ${a}`);
				if (r === "indexEnd") throw Error(`Invalid character '${o}' after an index at position ${a}`);
				r === "start" && (r = "property"), n += o;
		}
	}
	switch (i && (n += "\\"), r) {
		case "property":
			if (!st(n, t)) return [];
			break;
		case "index": throw Error("Index was not closed");
		case "start":
			t.push("");
			break;
	}
	return t;
}
function lt(e) {
	if (typeof e == "string") return ct(e);
	if (Array.isArray(e)) {
		let t = [];
		for (let [n, r] of e.entries()) {
			if (typeof r != "string" && typeof r != "number") throw TypeError(`Expected a string or number for path segment at index ${n}, got ${typeof r}`);
			if (typeof r == "number" && !Number.isFinite(r)) throw TypeError(`Path segment at index ${n} must be a finite number, got ${r}`);
			if (rt.has(r)) return [];
			typeof r == "string" && ot(r) ? t.push(Number.parseInt(r, 10)) : t.push(r);
		}
		return t;
	}
	return [];
}
function ut(e, t, n) {
	if (!nt(e) || typeof t != "string" && !Array.isArray(t)) return n === void 0 ? e : n;
	let r = lt(t);
	if (r.length === 0) return n;
	for (let t = 0; t < r.length; t++) {
		let i = r[t];
		if (e = e[i], e == null) {
			if (t !== r.length - 1) return n;
			break;
		}
	}
	return e === void 0 ? n : e;
}
function dt(e, t, n) {
	if (!nt(e) || typeof t != "string" && !Array.isArray(t)) return e;
	let r = e, i = lt(t);
	if (i.length === 0) return e;
	for (let t = 0; t < i.length; t++) {
		let r = i[t];
		if (t === i.length - 1) e[r] = n;
		else if (!nt(e[r])) {
			let n = typeof i[t + 1] == "number";
			e[r] = n ? [] : {};
		}
		e = e[r];
	}
	return r;
}
function ft(e, t) {
	if (!nt(e) || typeof t != "string" && !Array.isArray(t)) return !1;
	let n = lt(t);
	if (n.length === 0) return !1;
	for (let t = 0; t < n.length; t++) {
		let r = n[t];
		if (t === n.length - 1) return Object.hasOwn(e, r) ? (delete e[r], !0) : !1;
		if (e = e[r], !nt(e)) return !1;
	}
}
function pt(e, t) {
	if (!nt(e) || typeof t != "string" && !Array.isArray(t)) return !1;
	let n = lt(t);
	if (n.length === 0) return !1;
	for (let t of n) {
		if (!nt(e) || !(t in e)) return !1;
		e = e[t];
	}
	return !0;
}
//#endregion
//#region node_modules/conf/node_modules/env-paths/index.js
var mt = ke.homedir(), ht = ke.tmpdir(), { env: gt } = L, _t = (e) => {
	let t = M.join(mt, "Library");
	return {
		data: M.join(t, "Application Support", e),
		config: M.join(t, "Preferences", e),
		cache: M.join(t, "Caches", e),
		log: M.join(t, "Logs", e),
		temp: M.join(ht, e)
	};
}, vt = (e) => {
	let t = gt.APPDATA || M.join(mt, "AppData", "Roaming"), n = gt.LOCALAPPDATA || M.join(mt, "AppData", "Local");
	return {
		data: M.join(n, e, "Data"),
		config: M.join(t, e, "Config"),
		cache: M.join(n, e, "Cache"),
		log: M.join(n, e, "Log"),
		temp: M.join(ht, e)
	};
}, yt = (e) => {
	let t = M.basename(mt);
	return {
		data: M.join(gt.XDG_DATA_HOME || M.join(mt, ".local", "share"), e),
		config: M.join(gt.XDG_CONFIG_HOME || M.join(mt, ".config"), e),
		cache: M.join(gt.XDG_CACHE_HOME || M.join(mt, ".cache"), e),
		log: M.join(gt.XDG_STATE_HOME || M.join(mt, ".local", "state"), e),
		temp: M.join(ht, t, e)
	};
};
function bt(e, { suffix: t = "nodejs" } = {}) {
	if (typeof e != "string") throw TypeError(`Expected a string, got ${typeof e}`);
	return t && (e += `-${t}`), L.platform === "darwin" ? _t(e) : L.platform === "win32" ? vt(e) : yt(e);
}
//#endregion
//#region node_modules/stubborn-utils/dist/attemptify_async.js
var xt = (e, t) => {
	let { onError: n } = t;
	return function(...t) {
		return e.apply(void 0, t).catch(n);
	};
}, St = (e, t) => {
	let { onError: n } = t;
	return function(...t) {
		try {
			return e.apply(void 0, t);
		} catch (e) {
			return n(e);
		}
	};
}, Ct = (e, t) => {
	let { isRetriable: n } = t;
	return function(t) {
		let { timeout: r } = t, i = t.interval ?? 250, a = Date.now() + r;
		return function t(...r) {
			return e.apply(void 0, r).catch((e) => {
				if (!n(e) || Date.now() >= a) throw e;
				let o = Math.round(i * Math.random());
				return o > 0 ? new Promise((e) => setTimeout(e, o)).then(() => t.apply(void 0, r)) : t.apply(void 0, r);
			});
		};
	};
}, wt = (e, t) => {
	let { isRetriable: n } = t;
	return function(t) {
		let { timeout: r } = t, i = Date.now() + r;
		return function(...t) {
			for (;;) try {
				return e.apply(void 0, t);
			} catch (e) {
				if (!n(e) || Date.now() >= i) throw e;
				continue;
			}
		};
	};
}, Tt = {
	isChangeErrorOk: (e) => {
		if (!Tt.isNodeError(e)) return !1;
		let { code: t } = e;
		return t === "ENOSYS" || !Ot && (t === "EINVAL" || t === "EPERM");
	},
	isNodeError: (e) => e instanceof Error,
	isRetriableError: (e) => {
		if (!Tt.isNodeError(e)) return !1;
		let { code: t } = e;
		return t === "EMFILE" || t === "ENFILE" || t === "EAGAIN" || t === "EBUSY" || t === "EACCESS" || t === "EACCES" || t === "EACCS" || t === "EPERM";
	},
	onChangeError: (e) => {
		if (!Tt.isNodeError(e) || !Tt.isChangeErrorOk(e)) throw e;
	}
}, Et = { onError: Tt.onChangeError }, Dt = { onError: () => void 0 }, Ot = L.getuid ? !L.getuid() : !1, B = { isRetriable: Tt.isRetriableError }, V = {
	attempt: {
		chmod: xt(R(F.chmod), Et),
		chown: xt(R(F.chown), Et),
		close: xt(R(F.close), Dt),
		fsync: xt(R(F.fsync), Dt),
		mkdir: xt(R(F.mkdir), Dt),
		realpath: xt(R(F.realpath), Dt),
		stat: xt(R(F.stat), Dt),
		unlink: xt(R(F.unlink), Dt),
		chmodSync: St(F.chmodSync, Et),
		chownSync: St(F.chownSync, Et),
		closeSync: St(F.closeSync, Dt),
		existsSync: St(F.existsSync, Dt),
		fsyncSync: St(F.fsync, Dt),
		mkdirSync: St(F.mkdirSync, Dt),
		realpathSync: St(F.realpathSync, Dt),
		statSync: St(F.statSync, Dt),
		unlinkSync: St(F.unlinkSync, Dt)
	},
	retry: {
		close: Ct(R(F.close), B),
		fsync: Ct(R(F.fsync), B),
		open: Ct(R(F.open), B),
		readFile: Ct(R(F.readFile), B),
		rename: Ct(R(F.rename), B),
		stat: Ct(R(F.stat), B),
		write: Ct(R(F.write), B),
		writeFile: Ct(R(F.writeFile), B),
		closeSync: wt(F.closeSync, B),
		fsyncSync: wt(F.fsyncSync, B),
		openSync: wt(F.openSync, B),
		readFileSync: wt(F.readFileSync, B),
		renameSync: wt(F.renameSync, B),
		statSync: wt(F.statSync, B),
		writeSync: wt(F.writeSync, B),
		writeFileSync: wt(F.writeFileSync, B)
	}
}, kt = {}, At = L.geteuid ? L.geteuid() : -1, jt = L.getegid ? L.getegid() : -1, Mt = !!L.getuid;
L.getuid && L.getuid();
//#endregion
//#region node_modules/atomically/dist/utils/lang.js
var Nt = (e) => e instanceof Error && "code" in e, Pt = (e) => typeof e == "string", Ft = (e) => e === void 0, It = L.platform === "linux", Lt = L.platform === "win32", Rt = [
	"SIGHUP",
	"SIGINT",
	"SIGTERM"
];
Lt || Rt.push("SIGALRM", "SIGABRT", "SIGVTALRM", "SIGXCPU", "SIGXFSZ", "SIGUSR2", "SIGTRAP", "SIGSYS", "SIGQUIT", "SIGIOT"), It && Rt.push("SIGIO", "SIGPOLL", "SIGPWR", "SIGSTKFLT");
//#endregion
//#region node_modules/when-exit/dist/node/index.js
var zt = new class {
	constructor() {
		this.callbacks = /* @__PURE__ */ new Set(), this.exited = !1, this.exit = (e) => {
			if (!this.exited) {
				this.exited = !0;
				for (let e of this.callbacks) e();
				e && (Lt && e !== "SIGINT" && e !== "SIGTERM" && e !== "SIGKILL" ? L.kill(L.pid, "SIGTERM") : L.kill(L.pid, e));
			}
		}, this.hook = () => {
			L.once("exit", () => this.exit());
			for (let e of Rt) try {
				L.once(e, () => this.exit(e));
			} catch {}
		}, this.register = (e) => (this.callbacks.add(e), () => {
			this.callbacks.delete(e);
		}), this.hook();
	}
}().register, H = {
	store: {},
	create: (e) => {
		let t = `000000${Math.floor(Math.random() * 16777215).toString(16)}`.slice(-6);
		return `${e}${`.tmp-${Date.now().toString().slice(-10)}${t}`}`;
	},
	get: (e, t, n = !0) => {
		let r = H.truncate(t(e));
		return r in H.store ? H.get(e, t, n) : (H.store[r] = n, [r, () => delete H.store[r]]);
	},
	purge: (e) => {
		H.store[e] && (delete H.store[e], V.attempt.unlink(e));
	},
	purgeSync: (e) => {
		H.store[e] && (delete H.store[e], V.attempt.unlinkSync(e));
	},
	purgeSyncAll: () => {
		for (let e in H.store) H.purgeSync(e);
	},
	truncate: (e) => {
		let t = M.basename(e);
		if (t.length <= 128) return e;
		let n = /^(\.?)(.*?)((?:\.[^.]+)?(?:\.tmp-\d{10}[a-f0-9]{6})?)$/.exec(t);
		if (!n) return e;
		let r = t.length - 128;
		return `${e.slice(0, -t.length)}${n[1]}${n[2].slice(0, -r)}${n[3]}`;
	}
};
zt(H.purgeSyncAll);
//#endregion
//#region node_modules/atomically/dist/index.js
function Bt(e, t, n = kt) {
	if (Pt(n)) return Bt(e, t, { encoding: n });
	let r = { timeout: n.timeout ?? 1e3 }, i = null, a = null, o = null;
	try {
		let s = V.attempt.realpathSync(e), c = !!s;
		e = s || e, [a, i] = H.get(e, n.tmpCreate || H.create, n.tmpPurge !== !1);
		let l = Mt && Ft(n.chown), u = Ft(n.mode);
		if (c && (l || u)) {
			let t = V.attempt.statSync(e);
			t && (n = { ...n }, l && (n.chown = {
				uid: t.uid,
				gid: t.gid
			}), u && (n.mode = t.mode));
		}
		if (!c) {
			let t = M.dirname(e);
			V.attempt.mkdirSync(t, {
				mode: 511,
				recursive: !0
			});
		}
		o = V.retry.openSync(r)(a, "w", n.mode || 438), n.tmpCreated && n.tmpCreated(a), Pt(t) ? V.retry.writeSync(r)(o, t, 0, n.encoding || "utf8") : Ft(t) || V.retry.writeSync(r)(o, t, 0, t.length, 0), n.fsync !== !1 && (n.fsyncWait === !1 ? V.attempt.fsync(o) : V.retry.fsyncSync(r)(o)), V.retry.closeSync(r)(o), o = null, n.chown && (n.chown.uid !== At || n.chown.gid !== jt) && V.attempt.chownSync(a, n.chown.uid, n.chown.gid), n.mode && n.mode !== 438 && V.attempt.chmodSync(a, n.mode);
		try {
			V.retry.renameSync(r)(a, e);
		} catch (t) {
			if (!Nt(t) || t.code !== "ENAMETOOLONG") throw t;
			V.retry.renameSync(r)(a, H.truncate(e));
		}
		i(), a = null;
	} finally {
		o && V.attempt.closeSync(o), a && H.purge(a);
	}
}
//#endregion
//#region node_modules/conf/node_modules/ajv/dist/compile/codegen/code.js
var Vt = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.regexpCode = e.getEsmExportName = e.getProperty = e.safeStringify = e.stringify = e.strConcat = e.addCodeArg = e.str = e._ = e.nil = e._Code = e.Name = e.IDENTIFIER = e._CodeOrName = void 0;
	var t = class {};
	e._CodeOrName = t, e.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
	var n = class extends t {
		constructor(t) {
			if (super(), !e.IDENTIFIER.test(t)) throw Error("CodeGen: name must be a valid identifier");
			this.str = t;
		}
		toString() {
			return this.str;
		}
		emptyStr() {
			return !1;
		}
		get names() {
			return { [this.str]: 1 };
		}
	};
	e.Name = n;
	var r = class extends t {
		constructor(e) {
			super(), this._items = typeof e == "string" ? [e] : e;
		}
		toString() {
			return this.str;
		}
		emptyStr() {
			if (this._items.length > 1) return !1;
			let e = this._items[0];
			return e === "" || e === "\"\"";
		}
		get str() {
			return this._str ??= this._items.reduce((e, t) => `${e}${t}`, "");
		}
		get names() {
			return this._names ??= this._items.reduce((e, t) => (t instanceof n && (e[t.str] = (e[t.str] || 0) + 1), e), {});
		}
	};
	e._Code = r, e.nil = new r("");
	function i(e, ...t) {
		let n = [e[0]], i = 0;
		for (; i < t.length;) s(n, t[i]), n.push(e[++i]);
		return new r(n);
	}
	e._ = i;
	var a = new r("+");
	function o(e, ...t) {
		let n = [p(e[0])], i = 0;
		for (; i < t.length;) n.push(a), s(n, t[i]), n.push(a, p(e[++i]));
		return c(n), new r(n);
	}
	e.str = o;
	function s(e, t) {
		t instanceof r ? e.push(...t._items) : t instanceof n ? e.push(t) : e.push(d(t));
	}
	e.addCodeArg = s;
	function c(e) {
		let t = 1;
		for (; t < e.length - 1;) {
			if (e[t] === a) {
				let n = l(e[t - 1], e[t + 1]);
				if (n !== void 0) {
					e.splice(t - 1, 3, n);
					continue;
				}
				e[t++] = "+";
			}
			t++;
		}
	}
	function l(e, t) {
		if (t === "\"\"") return e;
		if (e === "\"\"") return t;
		if (typeof e == "string") return t instanceof n || e[e.length - 1] !== "\"" ? void 0 : typeof t == "string" ? t[0] === "\"" ? e.slice(0, -1) + t.slice(1) : void 0 : `${e.slice(0, -1)}${t}"`;
		if (typeof t == "string" && t[0] === "\"" && !(e instanceof n)) return `"${e}${t.slice(1)}`;
	}
	function u(e, t) {
		return t.emptyStr() ? e : e.emptyStr() ? t : o`${e}${t}`;
	}
	e.strConcat = u;
	function d(e) {
		return typeof e == "number" || typeof e == "boolean" || e === null ? e : p(Array.isArray(e) ? e.join(",") : e);
	}
	function f(e) {
		return new r(p(e));
	}
	e.stringify = f;
	function p(e) {
		return JSON.stringify(e).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
	}
	e.safeStringify = p;
	function m(t) {
		return typeof t == "string" && e.IDENTIFIER.test(t) ? new r(`.${t}`) : i`[${t}]`;
	}
	e.getProperty = m;
	function h(t) {
		if (typeof t == "string" && e.IDENTIFIER.test(t)) return new r(`${t}`);
		throw Error(`CodeGen: invalid export name: ${t}, use explicit $id name mapping`);
	}
	e.getEsmExportName = h;
	function g(e) {
		return new r(e.toString());
	}
	e.regexpCode = g;
})), Ht = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.ValueScope = e.ValueScopeName = e.Scope = e.varKinds = e.UsedValueState = void 0;
	var t = Vt(), n = class extends Error {
		constructor(e) {
			super(`CodeGen: "code" for ${e} not defined`), this.value = e.value;
		}
	}, r;
	(function(e) {
		e[e.Started = 0] = "Started", e[e.Completed = 1] = "Completed";
	})(r || (e.UsedValueState = r = {})), e.varKinds = {
		const: new t.Name("const"),
		let: new t.Name("let"),
		var: new t.Name("var")
	};
	var i = class {
		constructor({ prefixes: e, parent: t } = {}) {
			this._names = {}, this._prefixes = e, this._parent = t;
		}
		toName(e) {
			return e instanceof t.Name ? e : this.name(e);
		}
		name(e) {
			return new t.Name(this._newName(e));
		}
		_newName(e) {
			let t = this._names[e] || this._nameGroup(e);
			return `${e}${t.index++}`;
		}
		_nameGroup(e) {
			if ((this._parent?._prefixes)?.has(e) || this._prefixes && !this._prefixes.has(e)) throw Error(`CodeGen: prefix "${e}" is not allowed in this scope`);
			return this._names[e] = {
				prefix: e,
				index: 0
			};
		}
	};
	e.Scope = i;
	var a = class extends t.Name {
		constructor(e, t) {
			super(t), this.prefix = e;
		}
		setValue(e, { property: n, itemIndex: r }) {
			this.value = e, this.scopePath = (0, t._)`.${new t.Name(n)}[${r}]`;
		}
	};
	e.ValueScopeName = a;
	var o = (0, t._)`\n`;
	e.ValueScope = class extends i {
		constructor(e) {
			super(e), this._values = {}, this._scope = e.scope, this.opts = {
				...e,
				_n: e.lines ? o : t.nil
			};
		}
		get() {
			return this._scope;
		}
		name(e) {
			return new a(e, this._newName(e));
		}
		value(e, t) {
			if (t.ref === void 0) throw Error("CodeGen: ref must be passed in value");
			let n = this.toName(e), { prefix: r } = n, i = t.key ?? t.ref, a = this._values[r];
			if (a) {
				let e = a.get(i);
				if (e) return e;
			} else a = this._values[r] = /* @__PURE__ */ new Map();
			a.set(i, n);
			let o = this._scope[r] || (this._scope[r] = []), s = o.length;
			return o[s] = t.ref, n.setValue(t, {
				property: r,
				itemIndex: s
			}), n;
		}
		getValue(e, t) {
			let n = this._values[e];
			if (n) return n.get(t);
		}
		scopeRefs(e, n = this._values) {
			return this._reduceValues(n, (n) => {
				if (n.scopePath === void 0) throw Error(`CodeGen: name "${n}" has no value`);
				return (0, t._)`${e}${n.scopePath}`;
			});
		}
		scopeCode(e = this._values, t, n) {
			return this._reduceValues(e, (e) => {
				if (e.value === void 0) throw Error(`CodeGen: name "${e}" has no value`);
				return e.value.code;
			}, t, n);
		}
		_reduceValues(i, a, o = {}, s) {
			let c = t.nil;
			for (let l in i) {
				let u = i[l];
				if (!u) continue;
				let d = o[l] = o[l] || /* @__PURE__ */ new Map();
				u.forEach((i) => {
					if (d.has(i)) return;
					d.set(i, r.Started);
					let o = a(i);
					if (o) {
						let n = this.opts.es5 ? e.varKinds.var : e.varKinds.const;
						c = (0, t._)`${c}${n} ${i} = ${o};${this.opts._n}`;
					} else if (o = s?.(i)) c = (0, t._)`${c}${o}${this.opts._n}`;
					else throw new n(i);
					d.set(i, r.Completed);
				});
			}
			return c;
		}
	};
})), U = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.or = e.and = e.not = e.CodeGen = e.operators = e.varKinds = e.ValueScopeName = e.ValueScope = e.Scope = e.Name = e.regexpCode = e.stringify = e.getProperty = e.nil = e.strConcat = e.str = e._ = void 0;
	var t = Vt(), n = Ht(), r = Vt();
	Object.defineProperty(e, "_", {
		enumerable: !0,
		get: function() {
			return r._;
		}
	}), Object.defineProperty(e, "str", {
		enumerable: !0,
		get: function() {
			return r.str;
		}
	}), Object.defineProperty(e, "strConcat", {
		enumerable: !0,
		get: function() {
			return r.strConcat;
		}
	}), Object.defineProperty(e, "nil", {
		enumerable: !0,
		get: function() {
			return r.nil;
		}
	}), Object.defineProperty(e, "getProperty", {
		enumerable: !0,
		get: function() {
			return r.getProperty;
		}
	}), Object.defineProperty(e, "stringify", {
		enumerable: !0,
		get: function() {
			return r.stringify;
		}
	}), Object.defineProperty(e, "regexpCode", {
		enumerable: !0,
		get: function() {
			return r.regexpCode;
		}
	}), Object.defineProperty(e, "Name", {
		enumerable: !0,
		get: function() {
			return r.Name;
		}
	});
	var i = Ht();
	Object.defineProperty(e, "Scope", {
		enumerable: !0,
		get: function() {
			return i.Scope;
		}
	}), Object.defineProperty(e, "ValueScope", {
		enumerable: !0,
		get: function() {
			return i.ValueScope;
		}
	}), Object.defineProperty(e, "ValueScopeName", {
		enumerable: !0,
		get: function() {
			return i.ValueScopeName;
		}
	}), Object.defineProperty(e, "varKinds", {
		enumerable: !0,
		get: function() {
			return i.varKinds;
		}
	}), e.operators = {
		GT: new t._Code(">"),
		GTE: new t._Code(">="),
		LT: new t._Code("<"),
		LTE: new t._Code("<="),
		EQ: new t._Code("==="),
		NEQ: new t._Code("!=="),
		NOT: new t._Code("!"),
		OR: new t._Code("||"),
		AND: new t._Code("&&"),
		ADD: new t._Code("+")
	};
	var a = class {
		optimizeNodes() {
			return this;
		}
		optimizeNames(e, t) {
			return this;
		}
	}, o = class extends a {
		constructor(e, t, n) {
			super(), this.varKind = e, this.name = t, this.rhs = n;
		}
		render({ es5: e, _n: t }) {
			let r = e ? n.varKinds.var : this.varKind, i = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
			return `${r} ${this.name}${i};` + t;
		}
		optimizeNames(e, t) {
			if (e[this.name.str]) return this.rhs &&= O(this.rhs, e, t), this;
		}
		get names() {
			return this.rhs instanceof t._CodeOrName ? this.rhs.names : {};
		}
	}, s = class extends a {
		constructor(e, t, n) {
			super(), this.lhs = e, this.rhs = t, this.sideEffects = n;
		}
		render({ _n: e }) {
			return `${this.lhs} = ${this.rhs};` + e;
		}
		optimizeNames(e, n) {
			if (!(this.lhs instanceof t.Name && !e[this.lhs.str] && !this.sideEffects)) return this.rhs = O(this.rhs, e, n), this;
		}
		get names() {
			return D(this.lhs instanceof t.Name ? {} : { ...this.lhs.names }, this.rhs);
		}
	}, c = class extends s {
		constructor(e, t, n, r) {
			super(e, n, r), this.op = t;
		}
		render({ _n: e }) {
			return `${this.lhs} ${this.op}= ${this.rhs};` + e;
		}
	}, l = class extends a {
		constructor(e) {
			super(), this.label = e, this.names = {};
		}
		render({ _n: e }) {
			return `${this.label}:` + e;
		}
	}, u = class extends a {
		constructor(e) {
			super(), this.label = e, this.names = {};
		}
		render({ _n: e }) {
			return `break${this.label ? ` ${this.label}` : ""};` + e;
		}
	}, d = class extends a {
		constructor(e) {
			super(), this.error = e;
		}
		render({ _n: e }) {
			return `throw ${this.error};` + e;
		}
		get names() {
			return this.error.names;
		}
	}, f = class extends a {
		constructor(e) {
			super(), this.code = e;
		}
		render({ _n: e }) {
			return `${this.code};` + e;
		}
		optimizeNodes() {
			return `${this.code}` ? this : void 0;
		}
		optimizeNames(e, t) {
			return this.code = O(this.code, e, t), this;
		}
		get names() {
			return this.code instanceof t._CodeOrName ? this.code.names : {};
		}
	}, p = class extends a {
		constructor(e = []) {
			super(), this.nodes = e;
		}
		render(e) {
			return this.nodes.reduce((t, n) => t + n.render(e), "");
		}
		optimizeNodes() {
			let { nodes: e } = this, t = e.length;
			for (; t--;) {
				let n = e[t].optimizeNodes();
				Array.isArray(n) ? e.splice(t, 1, ...n) : n ? e[t] = n : e.splice(t, 1);
			}
			return e.length > 0 ? this : void 0;
		}
		optimizeNames(e, t) {
			let { nodes: n } = this, r = n.length;
			for (; r--;) {
				let i = n[r];
				i.optimizeNames(e, t) || (te(e, i.names), n.splice(r, 1));
			}
			return n.length > 0 ? this : void 0;
		}
		get names() {
			return this.nodes.reduce((e, t) => E(e, t.names), {});
		}
	}, m = class extends p {
		render(e) {
			return "{" + e._n + super.render(e) + "}" + e._n;
		}
	}, h = class extends p {}, g = class extends m {};
	g.kind = "else";
	var _ = class e extends m {
		constructor(e, t) {
			super(t), this.condition = e;
		}
		render(e) {
			let t = `if(${this.condition})` + super.render(e);
			return this.else && (t += "else " + this.else.render(e)), t;
		}
		optimizeNodes() {
			super.optimizeNodes();
			let t = this.condition;
			if (t === !0) return this.nodes;
			let n = this.else;
			if (n) {
				let e = n.optimizeNodes();
				n = this.else = Array.isArray(e) ? new g(e) : e;
			}
			if (n) return t === !1 ? n instanceof e ? n : n.nodes : this.nodes.length ? this : new e(ne(t), n instanceof e ? [n] : n.nodes);
			if (!(t === !1 || !this.nodes.length)) return this;
		}
		optimizeNames(e, t) {
			if (this.else = this.else?.optimizeNames(e, t), super.optimizeNames(e, t) || this.else) return this.condition = O(this.condition, e, t), this;
		}
		get names() {
			let e = super.names;
			return D(e, this.condition), this.else && E(e, this.else.names), e;
		}
	};
	_.kind = "if";
	var v = class extends m {};
	v.kind = "for";
	var y = class extends v {
		constructor(e) {
			super(), this.iteration = e;
		}
		render(e) {
			return `for(${this.iteration})` + super.render(e);
		}
		optimizeNames(e, t) {
			if (super.optimizeNames(e, t)) return this.iteration = O(this.iteration, e, t), this;
		}
		get names() {
			return E(super.names, this.iteration.names);
		}
	}, b = class extends v {
		constructor(e, t, n, r) {
			super(), this.varKind = e, this.name = t, this.from = n, this.to = r;
		}
		render(e) {
			let t = e.es5 ? n.varKinds.var : this.varKind, { name: r, from: i, to: a } = this;
			return `for(${t} ${r}=${i}; ${r}<${a}; ${r}++)` + super.render(e);
		}
		get names() {
			return D(D(super.names, this.from), this.to);
		}
	}, x = class extends v {
		constructor(e, t, n, r) {
			super(), this.loop = e, this.varKind = t, this.name = n, this.iterable = r;
		}
		render(e) {
			return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(e);
		}
		optimizeNames(e, t) {
			if (super.optimizeNames(e, t)) return this.iterable = O(this.iterable, e, t), this;
		}
		get names() {
			return E(super.names, this.iterable.names);
		}
	}, S = class extends m {
		constructor(e, t, n) {
			super(), this.name = e, this.args = t, this.async = n;
		}
		render(e) {
			return `${this.async ? "async " : ""}function ${this.name}(${this.args})` + super.render(e);
		}
	};
	S.kind = "func";
	var C = class extends p {
		render(e) {
			return "return " + super.render(e);
		}
	};
	C.kind = "return";
	var ee = class extends m {
		render(e) {
			let t = "try" + super.render(e);
			return this.catch && (t += this.catch.render(e)), this.finally && (t += this.finally.render(e)), t;
		}
		optimizeNodes() {
			var e, t;
			return super.optimizeNodes(), (e = this.catch) == null || e.optimizeNodes(), (t = this.finally) == null || t.optimizeNodes(), this;
		}
		optimizeNames(e, t) {
			var n, r;
			return super.optimizeNames(e, t), (n = this.catch) == null || n.optimizeNames(e, t), (r = this.finally) == null || r.optimizeNames(e, t), this;
		}
		get names() {
			let e = super.names;
			return this.catch && E(e, this.catch.names), this.finally && E(e, this.finally.names), e;
		}
	}, w = class extends m {
		constructor(e) {
			super(), this.error = e;
		}
		render(e) {
			return `catch(${this.error})` + super.render(e);
		}
	};
	w.kind = "catch";
	var T = class extends m {
		render(e) {
			return "finally" + super.render(e);
		}
	};
	T.kind = "finally", e.CodeGen = class {
		constructor(e, t = {}) {
			this._values = {}, this._blockStarts = [], this._constants = {}, this.opts = {
				...t,
				_n: t.lines ? "\n" : ""
			}, this._extScope = e, this._scope = new n.Scope({ parent: e }), this._nodes = [new h()];
		}
		toString() {
			return this._root.render(this.opts);
		}
		name(e) {
			return this._scope.name(e);
		}
		scopeName(e) {
			return this._extScope.name(e);
		}
		scopeValue(e, t) {
			let n = this._extScope.value(e, t);
			return (this._values[n.prefix] || (this._values[n.prefix] = /* @__PURE__ */ new Set())).add(n), n;
		}
		getScopeValue(e, t) {
			return this._extScope.getValue(e, t);
		}
		scopeRefs(e) {
			return this._extScope.scopeRefs(e, this._values);
		}
		scopeCode() {
			return this._extScope.scopeCode(this._values);
		}
		_def(e, t, n, r) {
			let i = this._scope.toName(t);
			return n !== void 0 && r && (this._constants[i.str] = n), this._leafNode(new o(e, i, n)), i;
		}
		const(e, t, r) {
			return this._def(n.varKinds.const, e, t, r);
		}
		let(e, t, r) {
			return this._def(n.varKinds.let, e, t, r);
		}
		var(e, t, r) {
			return this._def(n.varKinds.var, e, t, r);
		}
		assign(e, t, n) {
			return this._leafNode(new s(e, t, n));
		}
		add(t, n) {
			return this._leafNode(new c(t, e.operators.ADD, n));
		}
		code(e) {
			return typeof e == "function" ? e() : e !== t.nil && this._leafNode(new f(e)), this;
		}
		object(...e) {
			let n = ["{"];
			for (let [r, i] of e) n.length > 1 && n.push(","), n.push(r), (r !== i || this.opts.es5) && (n.push(":"), (0, t.addCodeArg)(n, i));
			return n.push("}"), new t._Code(n);
		}
		if(e, t, n) {
			if (this._blockNode(new _(e)), t && n) this.code(t).else().code(n).endIf();
			else if (t) this.code(t).endIf();
			else if (n) throw Error("CodeGen: \"else\" body without \"then\" body");
			return this;
		}
		elseIf(e) {
			return this._elseNode(new _(e));
		}
		else() {
			return this._elseNode(new g());
		}
		endIf() {
			return this._endBlockNode(_, g);
		}
		_for(e, t) {
			return this._blockNode(e), t && this.code(t).endFor(), this;
		}
		for(e, t) {
			return this._for(new y(e), t);
		}
		forRange(e, t, r, i, a = this.opts.es5 ? n.varKinds.var : n.varKinds.let) {
			let o = this._scope.toName(e);
			return this._for(new b(a, o, t, r), () => i(o));
		}
		forOf(e, r, i, a = n.varKinds.const) {
			let o = this._scope.toName(e);
			if (this.opts.es5) {
				let e = r instanceof t.Name ? r : this.var("_arr", r);
				return this.forRange("_i", 0, (0, t._)`${e}.length`, (n) => {
					this.var(o, (0, t._)`${e}[${n}]`), i(o);
				});
			}
			return this._for(new x("of", a, o, r), () => i(o));
		}
		forIn(e, r, i, a = this.opts.es5 ? n.varKinds.var : n.varKinds.const) {
			if (this.opts.ownProperties) return this.forOf(e, (0, t._)`Object.keys(${r})`, i);
			let o = this._scope.toName(e);
			return this._for(new x("in", a, o, r), () => i(o));
		}
		endFor() {
			return this._endBlockNode(v);
		}
		label(e) {
			return this._leafNode(new l(e));
		}
		break(e) {
			return this._leafNode(new u(e));
		}
		return(e) {
			let t = new C();
			if (this._blockNode(t), this.code(e), t.nodes.length !== 1) throw Error("CodeGen: \"return\" should have one node");
			return this._endBlockNode(C);
		}
		try(e, t, n) {
			if (!t && !n) throw Error("CodeGen: \"try\" without \"catch\" and \"finally\"");
			let r = new ee();
			if (this._blockNode(r), this.code(e), t) {
				let e = this.name("e");
				this._currNode = r.catch = new w(e), t(e);
			}
			return n && (this._currNode = r.finally = new T(), this.code(n)), this._endBlockNode(w, T);
		}
		throw(e) {
			return this._leafNode(new d(e));
		}
		block(e, t) {
			return this._blockStarts.push(this._nodes.length), e && this.code(e).endBlock(t), this;
		}
		endBlock(e) {
			let t = this._blockStarts.pop();
			if (t === void 0) throw Error("CodeGen: not in self-balancing block");
			let n = this._nodes.length - t;
			if (n < 0 || e !== void 0 && n !== e) throw Error(`CodeGen: wrong number of nodes: ${n} vs ${e} expected`);
			return this._nodes.length = t, this;
		}
		func(e, n = t.nil, r, i) {
			return this._blockNode(new S(e, n, r)), i && this.code(i).endFunc(), this;
		}
		endFunc() {
			return this._endBlockNode(S);
		}
		optimize(e = 1) {
			for (; e-- > 0;) this._root.optimizeNodes(), this._root.optimizeNames(this._root.names, this._constants);
		}
		_leafNode(e) {
			return this._currNode.nodes.push(e), this;
		}
		_blockNode(e) {
			this._currNode.nodes.push(e), this._nodes.push(e);
		}
		_endBlockNode(e, t) {
			let n = this._currNode;
			if (n instanceof e || t && n instanceof t) return this._nodes.pop(), this;
			throw Error(`CodeGen: not in block "${t ? `${e.kind}/${t.kind}` : e.kind}"`);
		}
		_elseNode(e) {
			let t = this._currNode;
			if (!(t instanceof _)) throw Error("CodeGen: \"else\" without \"if\"");
			return this._currNode = t.else = e, this;
		}
		get _root() {
			return this._nodes[0];
		}
		get _currNode() {
			let e = this._nodes;
			return e[e.length - 1];
		}
		set _currNode(e) {
			let t = this._nodes;
			t[t.length - 1] = e;
		}
	};
	function E(e, t) {
		for (let n in t) e[n] = (e[n] || 0) + (t[n] || 0);
		return e;
	}
	function D(e, n) {
		return n instanceof t._CodeOrName ? E(e, n.names) : e;
	}
	function O(e, n, r) {
		if (e instanceof t.Name) return i(e);
		if (!a(e)) return e;
		return new t._Code(e._items.reduce((e, n) => (n instanceof t.Name && (n = i(n)), n instanceof t._Code ? e.push(...n._items) : e.push(n), e), []));
		function i(e) {
			let t = r[e.str];
			return t === void 0 || n[e.str] !== 1 ? e : (delete n[e.str], t);
		}
		function a(e) {
			return e instanceof t._Code && e._items.some((e) => e instanceof t.Name && n[e.str] === 1 && r[e.str] !== void 0);
		}
	}
	function te(e, t) {
		for (let n in t) e[n] = (e[n] || 0) - (t[n] || 0);
	}
	function ne(e) {
		return typeof e == "boolean" || typeof e == "number" || e === null ? !e : (0, t._)`!${ce(e)}`;
	}
	e.not = ne;
	var re = se(e.operators.AND);
	function ie(...e) {
		return e.reduce(re);
	}
	e.and = ie;
	var ae = se(e.operators.OR);
	function oe(...e) {
		return e.reduce(ae);
	}
	e.or = oe;
	function se(e) {
		return (n, r) => n === t.nil ? r : r === t.nil ? n : (0, t._)`${ce(n)} ${e} ${ce(r)}`;
	}
	function ce(e) {
		return e instanceof t.Name ? e : (0, t._)`(${e})`;
	}
})), W = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.checkStrictMode = e.getErrorPath = e.Type = e.useFunc = e.setEvaluated = e.evaluatedPropsToName = e.mergeEvaluated = e.eachItem = e.unescapeJsonPointer = e.escapeJsonPointer = e.escapeFragment = e.unescapeFragment = e.schemaRefOrVal = e.schemaHasRulesButRef = e.schemaHasRules = e.checkUnknownRules = e.alwaysValidSchema = e.toHash = void 0;
	var t = U(), n = Vt();
	function r(e) {
		let t = {};
		for (let n of e) t[n] = !0;
		return t;
	}
	e.toHash = r;
	function i(e, t) {
		return typeof t == "boolean" ? t : Object.keys(t).length === 0 ? !0 : (a(e, t), !o(t, e.self.RULES.all));
	}
	e.alwaysValidSchema = i;
	function a(e, t = e.schema) {
		let { opts: n, self: r } = e;
		if (!n.strictSchema || typeof t == "boolean") return;
		let i = r.RULES.keywords;
		for (let n in t) i[n] || x(e, `unknown keyword: "${n}"`);
	}
	e.checkUnknownRules = a;
	function o(e, t) {
		if (typeof e == "boolean") return !e;
		for (let n in e) if (t[n]) return !0;
		return !1;
	}
	e.schemaHasRules = o;
	function s(e, t) {
		if (typeof e == "boolean") return !e;
		for (let n in e) if (n !== "$ref" && t.all[n]) return !0;
		return !1;
	}
	e.schemaHasRulesButRef = s;
	function c({ topSchemaRef: e, schemaPath: n }, r, i, a) {
		if (!a) {
			if (typeof r == "number" || typeof r == "boolean") return r;
			if (typeof r == "string") return (0, t._)`${r}`;
		}
		return (0, t._)`${e}${n}${(0, t.getProperty)(i)}`;
	}
	e.schemaRefOrVal = c;
	function l(e) {
		return f(decodeURIComponent(e));
	}
	e.unescapeFragment = l;
	function u(e) {
		return encodeURIComponent(d(e));
	}
	e.escapeFragment = u;
	function d(e) {
		return typeof e == "number" ? `${e}` : e.replace(/~/g, "~0").replace(/\//g, "~1");
	}
	e.escapeJsonPointer = d;
	function f(e) {
		return e.replace(/~1/g, "/").replace(/~0/g, "~");
	}
	e.unescapeJsonPointer = f;
	function p(e, t) {
		if (Array.isArray(e)) for (let n of e) t(n);
		else t(e);
	}
	e.eachItem = p;
	function m({ mergeNames: e, mergeToName: n, mergeValues: r, resultToName: i }) {
		return (a, o, s, c) => {
			let l = s === void 0 ? o : s instanceof t.Name ? (o instanceof t.Name ? e(a, o, s) : n(a, o, s), s) : o instanceof t.Name ? (n(a, s, o), o) : r(o, s);
			return c === t.Name && !(l instanceof t.Name) ? i(a, l) : l;
		};
	}
	e.mergeEvaluated = {
		props: m({
			mergeNames: (e, n, r) => e.if((0, t._)`${r} !== true && ${n} !== undefined`, () => {
				e.if((0, t._)`${n} === true`, () => e.assign(r, !0), () => e.assign(r, (0, t._)`${r} || {}`).code((0, t._)`Object.assign(${r}, ${n})`));
			}),
			mergeToName: (e, n, r) => e.if((0, t._)`${r} !== true`, () => {
				n === !0 ? e.assign(r, !0) : (e.assign(r, (0, t._)`${r} || {}`), g(e, r, n));
			}),
			mergeValues: (e, t) => e === !0 ? !0 : {
				...e,
				...t
			},
			resultToName: h
		}),
		items: m({
			mergeNames: (e, n, r) => e.if((0, t._)`${r} !== true && ${n} !== undefined`, () => e.assign(r, (0, t._)`${n} === true ? true : ${r} > ${n} ? ${r} : ${n}`)),
			mergeToName: (e, n, r) => e.if((0, t._)`${r} !== true`, () => e.assign(r, n === !0 ? !0 : (0, t._)`${r} > ${n} ? ${r} : ${n}`)),
			mergeValues: (e, t) => e === !0 ? !0 : Math.max(e, t),
			resultToName: (e, t) => e.var("items", t)
		})
	};
	function h(e, n) {
		if (n === !0) return e.var("props", !0);
		let r = e.var("props", (0, t._)`{}`);
		return n !== void 0 && g(e, r, n), r;
	}
	e.evaluatedPropsToName = h;
	function g(e, n, r) {
		Object.keys(r).forEach((r) => e.assign((0, t._)`${n}${(0, t.getProperty)(r)}`, !0));
	}
	e.setEvaluated = g;
	var _ = {};
	function v(e, t) {
		return e.scopeValue("func", {
			ref: t,
			code: _[t.code] || (_[t.code] = new n._Code(t.code))
		});
	}
	e.useFunc = v;
	var y;
	(function(e) {
		e[e.Num = 0] = "Num", e[e.Str = 1] = "Str";
	})(y || (e.Type = y = {}));
	function b(e, n, r) {
		if (e instanceof t.Name) {
			let i = n === y.Num;
			return r ? i ? (0, t._)`"[" + ${e} + "]"` : (0, t._)`"['" + ${e} + "']"` : i ? (0, t._)`"/" + ${e}` : (0, t._)`"/" + ${e}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
		}
		return r ? (0, t.getProperty)(e).toString() : "/" + d(e);
	}
	e.getErrorPath = b;
	function x(e, t, n = e.opts.strictSchema) {
		if (n) {
			if (t = `strict mode: ${t}`, n === !0) throw Error(t);
			e.self.logger.warn(t);
		}
	}
	e.checkStrictMode = x;
})), Ut = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = U();
	e.default = {
		data: new t.Name("data"),
		valCxt: new t.Name("valCxt"),
		instancePath: new t.Name("instancePath"),
		parentData: new t.Name("parentData"),
		parentDataProperty: new t.Name("parentDataProperty"),
		rootData: new t.Name("rootData"),
		dynamicAnchors: new t.Name("dynamicAnchors"),
		vErrors: new t.Name("vErrors"),
		errors: new t.Name("errors"),
		this: new t.Name("this"),
		self: new t.Name("self"),
		scope: new t.Name("scope"),
		json: new t.Name("json"),
		jsonPos: new t.Name("jsonPos"),
		jsonLen: new t.Name("jsonLen"),
		jsonPart: new t.Name("jsonPart")
	};
})), Wt = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.extendErrors = e.resetErrorsCount = e.reportExtraError = e.reportError = e.keyword$DataError = e.keywordError = void 0;
	var t = U(), n = W(), r = Ut();
	e.keywordError = { message: ({ keyword: e }) => (0, t.str)`must pass "${e}" keyword validation` }, e.keyword$DataError = { message: ({ keyword: e, schemaType: n }) => n ? (0, t.str)`"${e}" keyword must be ${n} ($data)` : (0, t.str)`"${e}" keyword is invalid ($data)` };
	function i(n, r = e.keywordError, i, a) {
		let { it: o } = n, { gen: s, compositeRule: u, allErrors: f } = o, p = d(n, r, i);
		a ?? (u || f) ? c(s, p) : l(o, (0, t._)`[${p}]`);
	}
	e.reportError = i;
	function a(t, n = e.keywordError, i) {
		let { it: a } = t, { gen: o, compositeRule: s, allErrors: u } = a;
		c(o, d(t, n, i)), s || u || l(a, r.default.vErrors);
	}
	e.reportExtraError = a;
	function o(e, n) {
		e.assign(r.default.errors, n), e.if((0, t._)`${r.default.vErrors} !== null`, () => e.if(n, () => e.assign((0, t._)`${r.default.vErrors}.length`, n), () => e.assign(r.default.vErrors, null)));
	}
	e.resetErrorsCount = o;
	function s({ gen: e, keyword: n, schemaValue: i, data: a, errsCount: o, it: s }) {
		/* istanbul ignore if */
		if (o === void 0) throw Error("ajv implementation error");
		let c = e.name("err");
		e.forRange("i", o, r.default.errors, (o) => {
			e.const(c, (0, t._)`${r.default.vErrors}[${o}]`), e.if((0, t._)`${c}.instancePath === undefined`, () => e.assign((0, t._)`${c}.instancePath`, (0, t.strConcat)(r.default.instancePath, s.errorPath))), e.assign((0, t._)`${c}.schemaPath`, (0, t.str)`${s.errSchemaPath}/${n}`), s.opts.verbose && (e.assign((0, t._)`${c}.schema`, i), e.assign((0, t._)`${c}.data`, a));
		});
	}
	e.extendErrors = s;
	function c(e, n) {
		let i = e.const("err", n);
		e.if((0, t._)`${r.default.vErrors} === null`, () => e.assign(r.default.vErrors, (0, t._)`[${i}]`), (0, t._)`${r.default.vErrors}.push(${i})`), e.code((0, t._)`${r.default.errors}++`);
	}
	function l(e, n) {
		let { gen: r, validateName: i, schemaEnv: a } = e;
		a.$async ? r.throw((0, t._)`new ${e.ValidationError}(${n})`) : (r.assign((0, t._)`${i}.errors`, n), r.return(!1));
	}
	var u = {
		keyword: new t.Name("keyword"),
		schemaPath: new t.Name("schemaPath"),
		params: new t.Name("params"),
		propertyName: new t.Name("propertyName"),
		message: new t.Name("message"),
		schema: new t.Name("schema"),
		parentSchema: new t.Name("parentSchema")
	};
	function d(e, n, r) {
		let { createErrors: i } = e.it;
		return i === !1 ? (0, t._)`{}` : f(e, n, r);
	}
	function f(e, t, n = {}) {
		let { gen: r, it: i } = e, a = [p(i, n), m(e, n)];
		return h(e, t, a), r.object(...a);
	}
	function p({ errorPath: e }, { instancePath: i }) {
		let a = i ? (0, t.str)`${e}${(0, n.getErrorPath)(i, n.Type.Str)}` : e;
		return [r.default.instancePath, (0, t.strConcat)(r.default.instancePath, a)];
	}
	function m({ keyword: e, it: { errSchemaPath: r } }, { schemaPath: i, parentSchema: a }) {
		let o = a ? r : (0, t.str)`${r}/${e}`;
		return i && (o = (0, t.str)`${o}${(0, n.getErrorPath)(i, n.Type.Str)}`), [u.schemaPath, o];
	}
	function h(e, { params: n, message: i }, a) {
		let { keyword: o, data: s, schemaValue: c, it: l } = e, { opts: d, propertyName: f, topSchemaRef: p, schemaPath: m } = l;
		a.push([u.keyword, o], [u.params, typeof n == "function" ? n(e) : n || (0, t._)`{}`]), d.messages && a.push([u.message, typeof i == "function" ? i(e) : i]), d.verbose && a.push([u.schema, c], [u.parentSchema, (0, t._)`${p}${m}`], [r.default.data, s]), f && a.push([u.propertyName, f]);
	}
})), Gt = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.boolOrEmptySchema = e.topBoolOrEmptySchema = void 0;
	var t = Wt(), n = U(), r = Ut(), i = { message: "boolean schema is false" };
	function a(e) {
		let { gen: t, schema: i, validateName: a } = e;
		i === !1 ? s(e, !1) : typeof i == "object" && i.$async === !0 ? t.return(r.default.data) : (t.assign((0, n._)`${a}.errors`, null), t.return(!0));
	}
	e.topBoolOrEmptySchema = a;
	function o(e, t) {
		let { gen: n, schema: r } = e;
		r === !1 ? (n.var(t, !1), s(e)) : n.var(t, !0);
	}
	e.boolOrEmptySchema = o;
	function s(e, n) {
		let { gen: r, data: a } = e, o = {
			gen: r,
			keyword: "false schema",
			data: a,
			schema: !1,
			schemaCode: !1,
			schemaValue: !1,
			params: {},
			it: e
		};
		(0, t.reportError)(o, i, void 0, n);
	}
})), Kt = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.getRules = e.isJSONType = void 0;
	var t = new Set([
		"string",
		"number",
		"integer",
		"boolean",
		"null",
		"object",
		"array"
	]);
	function n(e) {
		return typeof e == "string" && t.has(e);
	}
	e.isJSONType = n;
	function r() {
		let e = {
			number: {
				type: "number",
				rules: []
			},
			string: {
				type: "string",
				rules: []
			},
			array: {
				type: "array",
				rules: []
			},
			object: {
				type: "object",
				rules: []
			}
		};
		return {
			types: {
				...e,
				integer: !0,
				boolean: !0,
				null: !0
			},
			rules: [
				{ rules: [] },
				e.number,
				e.string,
				e.array,
				e.object
			],
			post: { rules: [] },
			all: {},
			keywords: {}
		};
	}
	e.getRules = r;
})), qt = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.shouldUseRule = e.shouldUseGroup = e.schemaHasRulesForType = void 0;
	function t({ schema: e, self: t }, r) {
		let i = t.RULES.types[r];
		return i && i !== !0 && n(e, i);
	}
	e.schemaHasRulesForType = t;
	function n(e, t) {
		return t.rules.some((t) => r(e, t));
	}
	e.shouldUseGroup = n;
	function r(e, t) {
		return e[t.keyword] !== void 0 || t.definition.implements?.some((t) => e[t] !== void 0);
	}
	e.shouldUseRule = r;
})), Jt = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.reportTypeError = e.checkDataTypes = e.checkDataType = e.coerceAndCheckDataType = e.getJSONTypes = e.getSchemaTypes = e.DataType = void 0;
	var t = Kt(), n = qt(), r = Wt(), i = U(), a = W(), o;
	(function(e) {
		e[e.Correct = 0] = "Correct", e[e.Wrong = 1] = "Wrong";
	})(o || (e.DataType = o = {}));
	function s(e) {
		let t = c(e.type);
		if (t.includes("null")) {
			if (e.nullable === !1) throw Error("type: null contradicts nullable: false");
		} else {
			if (!t.length && e.nullable !== void 0) throw Error("\"nullable\" cannot be used without \"type\"");
			e.nullable === !0 && t.push("null");
		}
		return t;
	}
	e.getSchemaTypes = s;
	function c(e) {
		let n = Array.isArray(e) ? e : e ? [e] : [];
		if (n.every(t.isJSONType)) return n;
		throw Error("type must be JSONType or JSONType[]: " + n.join(","));
	}
	e.getJSONTypes = c;
	function l(e, t) {
		let { gen: r, data: i, opts: a } = e, s = d(t, a.coerceTypes), c = t.length > 0 && !(s.length === 0 && t.length === 1 && (0, n.schemaHasRulesForType)(e, t[0]));
		if (c) {
			let n = h(t, i, a.strictNumbers, o.Wrong);
			r.if(n, () => {
				s.length ? f(e, t, s) : _(e);
			});
		}
		return c;
	}
	e.coerceAndCheckDataType = l;
	var u = new Set([
		"string",
		"number",
		"integer",
		"boolean",
		"null"
	]);
	function d(e, t) {
		return t ? e.filter((e) => u.has(e) || t === "array" && e === "array") : [];
	}
	function f(e, t, n) {
		let { gen: r, data: a, opts: o } = e, s = r.let("dataType", (0, i._)`typeof ${a}`), c = r.let("coerced", (0, i._)`undefined`);
		o.coerceTypes === "array" && r.if((0, i._)`${s} == 'object' && Array.isArray(${a}) && ${a}.length == 1`, () => r.assign(a, (0, i._)`${a}[0]`).assign(s, (0, i._)`typeof ${a}`).if(h(t, a, o.strictNumbers), () => r.assign(c, a))), r.if((0, i._)`${c} !== undefined`);
		for (let e of n) (u.has(e) || e === "array" && o.coerceTypes === "array") && l(e);
		r.else(), _(e), r.endIf(), r.if((0, i._)`${c} !== undefined`, () => {
			r.assign(a, c), p(e, c);
		});
		function l(e) {
			switch (e) {
				case "string":
					r.elseIf((0, i._)`${s} == "number" || ${s} == "boolean"`).assign(c, (0, i._)`"" + ${a}`).elseIf((0, i._)`${a} === null`).assign(c, (0, i._)`""`);
					return;
				case "number":
					r.elseIf((0, i._)`${s} == "boolean" || ${a} === null
              || (${s} == "string" && ${a} && ${a} == +${a})`).assign(c, (0, i._)`+${a}`);
					return;
				case "integer":
					r.elseIf((0, i._)`${s} === "boolean" || ${a} === null
              || (${s} === "string" && ${a} && ${a} == +${a} && !(${a} % 1))`).assign(c, (0, i._)`+${a}`);
					return;
				case "boolean":
					r.elseIf((0, i._)`${a} === "false" || ${a} === 0 || ${a} === null`).assign(c, !1).elseIf((0, i._)`${a} === "true" || ${a} === 1`).assign(c, !0);
					return;
				case "null":
					r.elseIf((0, i._)`${a} === "" || ${a} === 0 || ${a} === false`), r.assign(c, null);
					return;
				case "array": r.elseIf((0, i._)`${s} === "string" || ${s} === "number"
              || ${s} === "boolean" || ${a} === null`).assign(c, (0, i._)`[${a}]`);
			}
		}
	}
	function p({ gen: e, parentData: t, parentDataProperty: n }, r) {
		e.if((0, i._)`${t} !== undefined`, () => e.assign((0, i._)`${t}[${n}]`, r));
	}
	function m(e, t, n, r = o.Correct) {
		let a = r === o.Correct ? i.operators.EQ : i.operators.NEQ, s;
		switch (e) {
			case "null": return (0, i._)`${t} ${a} null`;
			case "array":
				s = (0, i._)`Array.isArray(${t})`;
				break;
			case "object":
				s = (0, i._)`${t} && typeof ${t} == "object" && !Array.isArray(${t})`;
				break;
			case "integer":
				s = c((0, i._)`!(${t} % 1) && !isNaN(${t})`);
				break;
			case "number":
				s = c();
				break;
			default: return (0, i._)`typeof ${t} ${a} ${e}`;
		}
		return r === o.Correct ? s : (0, i.not)(s);
		function c(e = i.nil) {
			return (0, i.and)((0, i._)`typeof ${t} == "number"`, e, n ? (0, i._)`isFinite(${t})` : i.nil);
		}
	}
	e.checkDataType = m;
	function h(e, t, n, r) {
		if (e.length === 1) return m(e[0], t, n, r);
		let o, s = (0, a.toHash)(e);
		if (s.array && s.object) {
			let e = (0, i._)`typeof ${t} != "object"`;
			o = s.null ? e : (0, i._)`!${t} || ${e}`, delete s.null, delete s.array, delete s.object;
		} else o = i.nil;
		s.number && delete s.integer;
		for (let e in s) o = (0, i.and)(o, m(e, t, n, r));
		return o;
	}
	e.checkDataTypes = h;
	var g = {
		message: ({ schema: e }) => `must be ${e}`,
		params: ({ schema: e, schemaValue: t }) => typeof e == "string" ? (0, i._)`{type: ${e}}` : (0, i._)`{type: ${t}}`
	};
	function _(e) {
		let t = v(e);
		(0, r.reportError)(t, g);
	}
	e.reportTypeError = _;
	function v(e) {
		let { gen: t, data: n, schema: r } = e, i = (0, a.schemaRefOrVal)(e, r, "type");
		return {
			gen: t,
			keyword: "type",
			data: n,
			schema: r.type,
			schemaCode: i,
			schemaValue: i,
			parentSchema: r,
			params: {},
			it: e
		};
	}
})), Yt = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.assignDefaults = void 0;
	var t = U(), n = W();
	function r(e, t) {
		let { properties: n, items: r } = e.schema;
		if (t === "object" && n) for (let t in n) i(e, t, n[t].default);
		else t === "array" && Array.isArray(r) && r.forEach((t, n) => i(e, n, t.default));
	}
	e.assignDefaults = r;
	function i(e, r, i) {
		let { gen: a, compositeRule: o, data: s, opts: c } = e;
		if (i === void 0) return;
		let l = (0, t._)`${s}${(0, t.getProperty)(r)}`;
		if (o) {
			(0, n.checkStrictMode)(e, `default is ignored for: ${l}`);
			return;
		}
		let u = (0, t._)`${l} === undefined`;
		c.useDefaults === "empty" && (u = (0, t._)`${u} || ${l} === null || ${l} === ""`), a.if(u, (0, t._)`${l} = ${(0, t.stringify)(i)}`);
	}
})), Xt = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.validateUnion = e.validateArray = e.usePattern = e.callValidateCode = e.schemaProperties = e.allSchemaProperties = e.noPropertyInData = e.propertyInData = e.isOwnProperty = e.hasPropFunc = e.reportMissingProp = e.checkMissingProp = e.checkReportMissingProp = void 0;
	var t = U(), n = W(), r = Ut(), i = W();
	function a(e, n) {
		let { gen: r, data: i, it: a } = e;
		r.if(d(r, i, n, a.opts.ownProperties), () => {
			e.setParams({ missingProperty: (0, t._)`${n}` }, !0), e.error();
		});
	}
	e.checkReportMissingProp = a;
	function o({ gen: e, data: n, it: { opts: r } }, i, a) {
		return (0, t.or)(...i.map((i) => (0, t.and)(d(e, n, i, r.ownProperties), (0, t._)`${a} = ${i}`)));
	}
	e.checkMissingProp = o;
	function s(e, t) {
		e.setParams({ missingProperty: t }, !0), e.error();
	}
	e.reportMissingProp = s;
	function c(e) {
		return e.scopeValue("func", {
			ref: Object.prototype.hasOwnProperty,
			code: (0, t._)`Object.prototype.hasOwnProperty`
		});
	}
	e.hasPropFunc = c;
	function l(e, n, r) {
		return (0, t._)`${c(e)}.call(${n}, ${r})`;
	}
	e.isOwnProperty = l;
	function u(e, n, r, i) {
		let a = (0, t._)`${n}${(0, t.getProperty)(r)} !== undefined`;
		return i ? (0, t._)`${a} && ${l(e, n, r)}` : a;
	}
	e.propertyInData = u;
	function d(e, n, r, i) {
		let a = (0, t._)`${n}${(0, t.getProperty)(r)} === undefined`;
		return i ? (0, t.or)(a, (0, t.not)(l(e, n, r))) : a;
	}
	e.noPropertyInData = d;
	function f(e) {
		return e ? Object.keys(e).filter((e) => e !== "__proto__") : [];
	}
	e.allSchemaProperties = f;
	function p(e, t) {
		return f(t).filter((r) => !(0, n.alwaysValidSchema)(e, t[r]));
	}
	e.schemaProperties = p;
	function m({ schemaCode: e, data: n, it: { gen: i, topSchemaRef: a, schemaPath: o, errorPath: s }, it: c }, l, u, d) {
		let f = d ? (0, t._)`${e}, ${n}, ${a}${o}` : n, p = [
			[r.default.instancePath, (0, t.strConcat)(r.default.instancePath, s)],
			[r.default.parentData, c.parentData],
			[r.default.parentDataProperty, c.parentDataProperty],
			[r.default.rootData, r.default.rootData]
		];
		c.opts.dynamicRef && p.push([r.default.dynamicAnchors, r.default.dynamicAnchors]);
		let m = (0, t._)`${f}, ${i.object(...p)}`;
		return u === t.nil ? (0, t._)`${l}(${m})` : (0, t._)`${l}.call(${u}, ${m})`;
	}
	e.callValidateCode = m;
	var h = (0, t._)`new RegExp`;
	function g({ gen: e, it: { opts: n } }, r) {
		let a = n.unicodeRegExp ? "u" : "", { regExp: o } = n.code, s = o(r, a);
		return e.scopeValue("pattern", {
			key: s.toString(),
			ref: s,
			code: (0, t._)`${o.code === "new RegExp" ? h : (0, i.useFunc)(e, o)}(${r}, ${a})`
		});
	}
	e.usePattern = g;
	function _(e) {
		let { gen: r, data: i, keyword: a, it: o } = e, s = r.name("valid");
		if (o.allErrors) {
			let e = r.let("valid", !0);
			return c(() => r.assign(e, !1)), e;
		}
		return r.var(s, !0), c(() => r.break()), s;
		function c(o) {
			let c = r.const("len", (0, t._)`${i}.length`);
			r.forRange("i", 0, c, (i) => {
				e.subschema({
					keyword: a,
					dataProp: i,
					dataPropType: n.Type.Num
				}, s), r.if((0, t.not)(s), o);
			});
		}
	}
	e.validateArray = _;
	function v(e) {
		let { gen: r, schema: i, keyword: a, it: o } = e;
		/* istanbul ignore if */
		if (!Array.isArray(i)) throw Error("ajv implementation error");
		if (i.some((e) => (0, n.alwaysValidSchema)(o, e)) && !o.opts.unevaluated) return;
		let s = r.let("valid", !1), c = r.name("_valid");
		r.block(() => i.forEach((n, i) => {
			let o = e.subschema({
				keyword: a,
				schemaProp: i,
				compositeRule: !0
			}, c);
			r.assign(s, (0, t._)`${s} || ${c}`), e.mergeValidEvaluated(o, c) || r.if((0, t.not)(s));
		})), e.result(s, () => e.reset(), () => e.error(!0));
	}
	e.validateUnion = v;
})), Zt = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.validateKeywordUsage = e.validSchemaType = e.funcKeywordCode = e.macroKeywordCode = void 0;
	var t = U(), n = Ut(), r = Xt(), i = Wt();
	function a(e, n) {
		let { gen: r, keyword: i, schema: a, parentSchema: o, it: s } = e, c = n.macro.call(s.self, a, o, s), l = u(r, i, c);
		s.opts.validateSchema !== !1 && s.self.validateSchema(c, !0);
		let d = r.name("valid");
		e.subschema({
			schema: c,
			schemaPath: t.nil,
			errSchemaPath: `${s.errSchemaPath}/${i}`,
			topSchemaRef: l,
			compositeRule: !0
		}, d), e.pass(d, () => e.error(!0));
	}
	e.macroKeywordCode = a;
	function o(e, i) {
		let { gen: a, keyword: o, schema: d, parentSchema: f, $data: p, it: m } = e;
		l(m, i);
		let h = u(a, o, !p && i.compile ? i.compile.call(m.self, d, f, m) : i.validate), g = a.let("valid");
		e.block$data(g, _), e.ok(i.valid ?? g);
		function _() {
			if (i.errors === !1) b(), i.modifying && s(e), x(() => e.error());
			else {
				let t = i.async ? v() : y();
				i.modifying && s(e), x(() => c(e, t));
			}
		}
		function v() {
			let e = a.let("ruleErrs", null);
			return a.try(() => b((0, t._)`await `), (n) => a.assign(g, !1).if((0, t._)`${n} instanceof ${m.ValidationError}`, () => a.assign(e, (0, t._)`${n}.errors`), () => a.throw(n))), e;
		}
		function y() {
			let e = (0, t._)`${h}.errors`;
			return a.assign(e, null), b(t.nil), e;
		}
		function b(o = i.async ? (0, t._)`await ` : t.nil) {
			let s = m.opts.passContext ? n.default.this : n.default.self, c = !("compile" in i && !p || i.schema === !1);
			a.assign(g, (0, t._)`${o}${(0, r.callValidateCode)(e, h, s, c)}`, i.modifying);
		}
		function x(e) {
			a.if((0, t.not)(i.valid ?? g), e);
		}
	}
	e.funcKeywordCode = o;
	function s(e) {
		let { gen: n, data: r, it: i } = e;
		n.if(i.parentData, () => n.assign(r, (0, t._)`${i.parentData}[${i.parentDataProperty}]`));
	}
	function c(e, r) {
		let { gen: a } = e;
		a.if((0, t._)`Array.isArray(${r})`, () => {
			a.assign(n.default.vErrors, (0, t._)`${n.default.vErrors} === null ? ${r} : ${n.default.vErrors}.concat(${r})`).assign(n.default.errors, (0, t._)`${n.default.vErrors}.length`), (0, i.extendErrors)(e);
		}, () => e.error());
	}
	function l({ schemaEnv: e }, t) {
		if (t.async && !e.$async) throw Error("async keyword in sync schema");
	}
	function u(e, n, r) {
		if (r === void 0) throw Error(`keyword "${n}" failed to compile`);
		return e.scopeValue("keyword", typeof r == "function" ? { ref: r } : {
			ref: r,
			code: (0, t.stringify)(r)
		});
	}
	function d(e, t, n = !1) {
		return !t.length || t.some((t) => t === "array" ? Array.isArray(e) : t === "object" ? e && typeof e == "object" && !Array.isArray(e) : typeof e == t || n && e === void 0);
	}
	e.validSchemaType = d;
	function f({ schema: e, opts: t, self: n, errSchemaPath: r }, i, a) {
		/* istanbul ignore if */
		if (Array.isArray(i.keyword) ? !i.keyword.includes(a) : i.keyword !== a) throw Error("ajv implementation error");
		let o = i.dependencies;
		if (o?.some((t) => !Object.prototype.hasOwnProperty.call(e, t))) throw Error(`parent schema must have dependencies of ${a}: ${o.join(",")}`);
		if (i.validateSchema && !i.validateSchema(e[a])) {
			let e = `keyword "${a}" value is invalid at path "${r}": ` + n.errorsText(i.validateSchema.errors);
			if (t.validateSchema === "log") n.logger.error(e);
			else throw Error(e);
		}
	}
	e.validateKeywordUsage = f;
})), Qt = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.extendSubschemaMode = e.extendSubschemaData = e.getSubschema = void 0;
	var t = U(), n = W();
	function r(e, { keyword: r, schemaProp: i, schema: a, schemaPath: o, errSchemaPath: s, topSchemaRef: c }) {
		if (r !== void 0 && a !== void 0) throw Error("both \"keyword\" and \"schema\" passed, only one allowed");
		if (r !== void 0) {
			let a = e.schema[r];
			return i === void 0 ? {
				schema: a,
				schemaPath: (0, t._)`${e.schemaPath}${(0, t.getProperty)(r)}`,
				errSchemaPath: `${e.errSchemaPath}/${r}`
			} : {
				schema: a[i],
				schemaPath: (0, t._)`${e.schemaPath}${(0, t.getProperty)(r)}${(0, t.getProperty)(i)}`,
				errSchemaPath: `${e.errSchemaPath}/${r}/${(0, n.escapeFragment)(i)}`
			};
		}
		if (a !== void 0) {
			if (o === void 0 || s === void 0 || c === void 0) throw Error("\"schemaPath\", \"errSchemaPath\" and \"topSchemaRef\" are required with \"schema\"");
			return {
				schema: a,
				schemaPath: o,
				topSchemaRef: c,
				errSchemaPath: s
			};
		}
		throw Error("either \"keyword\" or \"schema\" must be passed");
	}
	e.getSubschema = r;
	function i(e, r, { dataProp: i, dataPropType: a, data: o, dataTypes: s, propertyName: c }) {
		if (o !== void 0 && i !== void 0) throw Error("both \"data\" and \"dataProp\" passed, only one allowed");
		let { gen: l } = r;
		if (i !== void 0) {
			let { errorPath: o, dataPathArr: s, opts: c } = r;
			u(l.let("data", (0, t._)`${r.data}${(0, t.getProperty)(i)}`, !0)), e.errorPath = (0, t.str)`${o}${(0, n.getErrorPath)(i, a, c.jsPropertySyntax)}`, e.parentDataProperty = (0, t._)`${i}`, e.dataPathArr = [...s, e.parentDataProperty];
		}
		o !== void 0 && (u(o instanceof t.Name ? o : l.let("data", o, !0)), c !== void 0 && (e.propertyName = c)), s && (e.dataTypes = s);
		function u(t) {
			e.data = t, e.dataLevel = r.dataLevel + 1, e.dataTypes = [], r.definedProperties = /* @__PURE__ */ new Set(), e.parentData = r.data, e.dataNames = [...r.dataNames, t];
		}
	}
	e.extendSubschemaData = i;
	function a(e, { jtdDiscriminator: t, jtdMetadata: n, compositeRule: r, createErrors: i, allErrors: a }) {
		r !== void 0 && (e.compositeRule = r), i !== void 0 && (e.createErrors = i), a !== void 0 && (e.allErrors = a), e.jtdDiscriminator = t, e.jtdMetadata = n;
	}
	e.extendSubschemaMode = a;
})), $t = /* @__PURE__ */ z(((e, t) => {
	t.exports = function e(t, n) {
		if (t === n) return !0;
		if (t && n && typeof t == "object" && typeof n == "object") {
			if (t.constructor !== n.constructor) return !1;
			var r, i, a;
			if (Array.isArray(t)) {
				if (r = t.length, r != n.length) return !1;
				for (i = r; i-- !== 0;) if (!e(t[i], n[i])) return !1;
				return !0;
			}
			if (t.constructor === RegExp) return t.source === n.source && t.flags === n.flags;
			if (t.valueOf !== Object.prototype.valueOf) return t.valueOf() === n.valueOf();
			if (t.toString !== Object.prototype.toString) return t.toString() === n.toString();
			if (a = Object.keys(t), r = a.length, r !== Object.keys(n).length) return !1;
			for (i = r; i-- !== 0;) if (!Object.prototype.hasOwnProperty.call(n, a[i])) return !1;
			for (i = r; i-- !== 0;) {
				var o = a[i];
				if (!e(t[o], n[o])) return !1;
			}
			return !0;
		}
		return t !== t && n !== n;
	};
})), en = /* @__PURE__ */ z(((e, t) => {
	var n = t.exports = function(e, t, n) {
		typeof t == "function" && (n = t, t = {}), n = t.cb || n;
		var i = typeof n == "function" ? n : n.pre || function() {}, a = n.post || function() {};
		r(t, i, a, e, "", e);
	};
	n.keywords = {
		additionalItems: !0,
		items: !0,
		contains: !0,
		additionalProperties: !0,
		propertyNames: !0,
		not: !0,
		if: !0,
		then: !0,
		else: !0
	}, n.arrayKeywords = {
		items: !0,
		allOf: !0,
		anyOf: !0,
		oneOf: !0
	}, n.propsKeywords = {
		$defs: !0,
		definitions: !0,
		properties: !0,
		patternProperties: !0,
		dependencies: !0
	}, n.skipKeywords = {
		default: !0,
		enum: !0,
		const: !0,
		required: !0,
		maximum: !0,
		minimum: !0,
		exclusiveMaximum: !0,
		exclusiveMinimum: !0,
		multipleOf: !0,
		maxLength: !0,
		minLength: !0,
		pattern: !0,
		format: !0,
		maxItems: !0,
		minItems: !0,
		uniqueItems: !0,
		maxProperties: !0,
		minProperties: !0
	};
	function r(e, t, a, o, s, c, l, u, d, f) {
		if (o && typeof o == "object" && !Array.isArray(o)) {
			for (var p in t(o, s, c, l, u, d, f), o) {
				var m = o[p];
				if (Array.isArray(m)) {
					if (p in n.arrayKeywords) for (var h = 0; h < m.length; h++) r(e, t, a, m[h], s + "/" + p + "/" + h, c, s, p, o, h);
				} else if (p in n.propsKeywords) {
					if (m && typeof m == "object") for (var g in m) r(e, t, a, m[g], s + "/" + p + "/" + i(g), c, s, p, o, g);
				} else (p in n.keywords || e.allKeys && !(p in n.skipKeywords)) && r(e, t, a, m, s + "/" + p, c, s, p, o);
			}
			a(o, s, c, l, u, d, f);
		}
	}
	function i(e) {
		return e.replace(/~/g, "~0").replace(/\//g, "~1");
	}
})), tn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.getSchemaRefs = e.resolveUrl = e.normalizeId = e._getFullPath = e.getFullPath = e.inlineRef = void 0;
	var t = W(), n = $t(), r = en(), i = new Set([
		"type",
		"format",
		"pattern",
		"maxLength",
		"minLength",
		"maxProperties",
		"minProperties",
		"maxItems",
		"minItems",
		"maximum",
		"minimum",
		"uniqueItems",
		"multipleOf",
		"required",
		"enum",
		"const"
	]);
	function a(e, t = !0) {
		return typeof e == "boolean" ? !0 : t === !0 ? !s(e) : t ? c(e) <= t : !1;
	}
	e.inlineRef = a;
	var o = new Set([
		"$ref",
		"$recursiveRef",
		"$recursiveAnchor",
		"$dynamicRef",
		"$dynamicAnchor"
	]);
	function s(e) {
		for (let t in e) {
			if (o.has(t)) return !0;
			let n = e[t];
			if (Array.isArray(n) && n.some(s) || typeof n == "object" && s(n)) return !0;
		}
		return !1;
	}
	function c(e) {
		let n = 0;
		for (let r in e) if (r === "$ref" || (n++, !i.has(r) && (typeof e[r] == "object" && (0, t.eachItem)(e[r], (e) => n += c(e)), n === Infinity))) return Infinity;
		return n;
	}
	function l(e, t = "", n) {
		return n !== !1 && (t = f(t)), u(e, e.parse(t));
	}
	e.getFullPath = l;
	function u(e, t) {
		return e.serialize(t).split("#")[0] + "#";
	}
	e._getFullPath = u;
	var d = /#\/?$/;
	function f(e) {
		return e ? e.replace(d, "") : "";
	}
	e.normalizeId = f;
	function p(e, t, n) {
		return n = f(n), e.resolve(t, n);
	}
	e.resolveUrl = p;
	var m = /^[a-z_][-a-z0-9._]*$/i;
	function h(e, t) {
		if (typeof e == "boolean") return {};
		let { schemaId: i, uriResolver: a } = this.opts, o = f(e[i] || t), s = { "": o }, c = l(a, o, !1), u = {}, d = /* @__PURE__ */ new Set();
		return r(e, { allKeys: !0 }, (e, t, n, r) => {
			if (r === void 0) return;
			let a = c + t, o = s[r];
			typeof e[i] == "string" && (o = l.call(this, e[i])), g.call(this, e.$anchor), g.call(this, e.$dynamicAnchor), s[t] = o;
			function l(t) {
				let n = this.opts.uriResolver.resolve;
				if (t = f(o ? n(o, t) : t), d.has(t)) throw h(t);
				d.add(t);
				let r = this.refs[t];
				return typeof r == "string" && (r = this.refs[r]), typeof r == "object" ? p(e, r.schema, t) : t !== f(a) && (t[0] === "#" ? (p(e, u[t], t), u[t] = e) : this.refs[t] = a), t;
			}
			function g(e) {
				if (typeof e == "string") {
					if (!m.test(e)) throw Error(`invalid anchor "${e}"`);
					l.call(this, `#${e}`);
				}
			}
		}), u;
		function p(e, t, r) {
			if (t !== void 0 && !n(e, t)) throw h(r);
		}
		function h(e) {
			return /* @__PURE__ */ Error(`reference "${e}" resolves to more than one schema`);
		}
	}
	e.getSchemaRefs = h;
})), nn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.getData = e.KeywordCxt = e.validateFunctionCode = void 0;
	var t = Gt(), n = Jt(), r = qt(), i = Jt(), a = Yt(), o = Zt(), s = Qt(), c = U(), l = Ut(), u = tn(), d = W(), f = Wt();
	function p(e) {
		if (S(e) && (ee(e), x(e))) {
			_(e);
			return;
		}
		m(e, () => (0, t.topBoolOrEmptySchema)(e));
	}
	e.validateFunctionCode = p;
	function m({ gen: e, validateName: t, schema: n, schemaEnv: r, opts: i }, a) {
		i.code.es5 ? e.func(t, (0, c._)`${l.default.data}, ${l.default.valCxt}`, r.$async, () => {
			e.code((0, c._)`"use strict"; ${y(n, i)}`), g(e, i), e.code(a);
		}) : e.func(t, (0, c._)`${l.default.data}, ${h(i)}`, r.$async, () => e.code(y(n, i)).code(a));
	}
	function h(e) {
		return (0, c._)`{${l.default.instancePath}="", ${l.default.parentData}, ${l.default.parentDataProperty}, ${l.default.rootData}=${l.default.data}${e.dynamicRef ? (0, c._)`, ${l.default.dynamicAnchors}={}` : c.nil}}={}`;
	}
	function g(e, t) {
		e.if(l.default.valCxt, () => {
			e.var(l.default.instancePath, (0, c._)`${l.default.valCxt}.${l.default.instancePath}`), e.var(l.default.parentData, (0, c._)`${l.default.valCxt}.${l.default.parentData}`), e.var(l.default.parentDataProperty, (0, c._)`${l.default.valCxt}.${l.default.parentDataProperty}`), e.var(l.default.rootData, (0, c._)`${l.default.valCxt}.${l.default.rootData}`), t.dynamicRef && e.var(l.default.dynamicAnchors, (0, c._)`${l.default.valCxt}.${l.default.dynamicAnchors}`);
		}, () => {
			e.var(l.default.instancePath, (0, c._)`""`), e.var(l.default.parentData, (0, c._)`undefined`), e.var(l.default.parentDataProperty, (0, c._)`undefined`), e.var(l.default.rootData, l.default.data), t.dynamicRef && e.var(l.default.dynamicAnchors, (0, c._)`{}`);
		});
	}
	function _(e) {
		let { schema: t, opts: n, gen: r } = e;
		m(e, () => {
			n.$comment && t.$comment && te(e), E(e), r.let(l.default.vErrors, null), r.let(l.default.errors, 0), n.unevaluated && v(e), w(e), ne(e);
		});
	}
	function v(e) {
		let { gen: t, validateName: n } = e;
		e.evaluated = t.const("evaluated", (0, c._)`${n}.evaluated`), t.if((0, c._)`${e.evaluated}.dynamicProps`, () => t.assign((0, c._)`${e.evaluated}.props`, (0, c._)`undefined`)), t.if((0, c._)`${e.evaluated}.dynamicItems`, () => t.assign((0, c._)`${e.evaluated}.items`, (0, c._)`undefined`));
	}
	function y(e, t) {
		let n = typeof e == "object" && e[t.schemaId];
		return n && (t.code.source || t.code.process) ? (0, c._)`/*# sourceURL=${n} */` : c.nil;
	}
	function b(e, n) {
		if (S(e) && (ee(e), x(e))) {
			C(e, n);
			return;
		}
		(0, t.boolOrEmptySchema)(e, n);
	}
	function x({ schema: e, self: t }) {
		if (typeof e == "boolean") return !e;
		for (let n in e) if (t.RULES.all[n]) return !0;
		return !1;
	}
	function S(e) {
		return typeof e.schema != "boolean";
	}
	function C(e, t) {
		let { schema: n, gen: r, opts: i } = e;
		i.$comment && n.$comment && te(e), D(e), O(e);
		let a = r.const("_errs", l.default.errors);
		w(e, a), r.var(t, (0, c._)`${a} === ${l.default.errors}`);
	}
	function ee(e) {
		(0, d.checkUnknownRules)(e), T(e);
	}
	function w(e, t) {
		if (e.opts.jtd) return ie(e, [], !1, t);
		let r = (0, n.getSchemaTypes)(e.schema);
		ie(e, r, !(0, n.coerceAndCheckDataType)(e, r), t);
	}
	function T(e) {
		let { schema: t, errSchemaPath: n, opts: r, self: i } = e;
		t.$ref && r.ignoreKeywordsWithRef && (0, d.schemaHasRulesButRef)(t, i.RULES) && i.logger.warn(`$ref: keywords ignored in schema at path "${n}"`);
	}
	function E(e) {
		let { schema: t, opts: n } = e;
		t.default !== void 0 && n.useDefaults && n.strictSchema && (0, d.checkStrictMode)(e, "default is ignored in the schema root");
	}
	function D(e) {
		let t = e.schema[e.opts.schemaId];
		t && (e.baseId = (0, u.resolveUrl)(e.opts.uriResolver, e.baseId, t));
	}
	function O(e) {
		if (e.schema.$async && !e.schemaEnv.$async) throw Error("async schema in sync schema");
	}
	function te({ gen: e, schemaEnv: t, schema: n, errSchemaPath: r, opts: i }) {
		let a = n.$comment;
		if (i.$comment === !0) e.code((0, c._)`${l.default.self}.logger.log(${a})`);
		else if (typeof i.$comment == "function") {
			let n = (0, c.str)`${r}/$comment`, i = e.scopeValue("root", { ref: t.root });
			e.code((0, c._)`${l.default.self}.opts.$comment(${a}, ${n}, ${i}.schema)`);
		}
	}
	function ne(e) {
		let { gen: t, schemaEnv: n, validateName: r, ValidationError: i, opts: a } = e;
		n.$async ? t.if((0, c._)`${l.default.errors} === 0`, () => t.return(l.default.data), () => t.throw((0, c._)`new ${i}(${l.default.vErrors})`)) : (t.assign((0, c._)`${r}.errors`, l.default.vErrors), a.unevaluated && re(e), t.return((0, c._)`${l.default.errors} === 0`));
	}
	function re({ gen: e, evaluated: t, props: n, items: r }) {
		n instanceof c.Name && e.assign((0, c._)`${t}.props`, n), r instanceof c.Name && e.assign((0, c._)`${t}.items`, r);
	}
	function ie(e, t, n, a) {
		let { gen: o, schema: s, data: u, allErrors: f, opts: p, self: m } = e, { RULES: h } = m;
		if (s.$ref && (p.ignoreKeywordsWithRef || !(0, d.schemaHasRulesButRef)(s, h))) {
			o.block(() => k(e, "$ref", h.all.$ref.definition));
			return;
		}
		p.jtd || oe(e, t), o.block(() => {
			for (let e of h.rules) g(e);
			g(h.post);
		});
		function g(d) {
			(0, r.shouldUseGroup)(s, d) && (d.type ? (o.if((0, i.checkDataType)(d.type, u, p.strictNumbers)), ae(e, d), t.length === 1 && t[0] === d.type && n && (o.else(), (0, i.reportTypeError)(e)), o.endIf()) : ae(e, d), f || o.if((0, c._)`${l.default.errors} === ${a || 0}`));
		}
	}
	function ae(e, t) {
		let { gen: n, schema: i, opts: { useDefaults: o } } = e;
		o && (0, a.assignDefaults)(e, t.type), n.block(() => {
			for (let n of t.rules) (0, r.shouldUseRule)(i, n) && k(e, n.keyword, n.definition, t.type);
		});
	}
	function oe(e, t) {
		e.schemaEnv.meta || !e.opts.strictTypes || (se(e, t), e.opts.allowUnionTypes || ce(e, t), le(e, e.dataTypes));
	}
	function se(e, t) {
		if (t.length) {
			if (!e.dataTypes.length) {
				e.dataTypes = t;
				return;
			}
			t.forEach((t) => {
				de(e.dataTypes, t) || pe(e, `type "${t}" not allowed by context "${e.dataTypes.join(",")}"`);
			}), fe(e, t);
		}
	}
	function ce(e, t) {
		t.length > 1 && !(t.length === 2 && t.includes("null")) && pe(e, "use allowUnionTypes to allow union type keyword");
	}
	function le(e, t) {
		let n = e.self.RULES.all;
		for (let i in n) {
			let a = n[i];
			if (typeof a == "object" && (0, r.shouldUseRule)(e.schema, a)) {
				let { type: n } = a.definition;
				n.length && !n.some((e) => ue(t, e)) && pe(e, `missing type "${n.join(",")}" for keyword "${i}"`);
			}
		}
	}
	function ue(e, t) {
		return e.includes(t) || t === "number" && e.includes("integer");
	}
	function de(e, t) {
		return e.includes(t) || t === "integer" && e.includes("number");
	}
	function fe(e, t) {
		let n = [];
		for (let r of e.dataTypes) de(t, r) ? n.push(r) : t.includes("integer") && r === "number" && n.push("integer");
		e.dataTypes = n;
	}
	function pe(e, t) {
		let n = e.schemaEnv.baseId + e.errSchemaPath;
		t += ` at "${n}" (strictTypes)`, (0, d.checkStrictMode)(e, t, e.opts.strictTypes);
	}
	var me = class {
		constructor(e, t, n) {
			if ((0, o.validateKeywordUsage)(e, t, n), this.gen = e.gen, this.allErrors = e.allErrors, this.keyword = n, this.data = e.data, this.schema = e.schema[n], this.$data = t.$data && e.opts.$data && this.schema && this.schema.$data, this.schemaValue = (0, d.schemaRefOrVal)(e, this.schema, n, this.$data), this.schemaType = t.schemaType, this.parentSchema = e.schema, this.params = {}, this.it = e, this.def = t, this.$data) this.schemaCode = e.gen.const("vSchema", ge(this.$data, e));
			else if (this.schemaCode = this.schemaValue, !(0, o.validSchemaType)(this.schema, t.schemaType, t.allowUndefined)) throw Error(`${n} value must be ${JSON.stringify(t.schemaType)}`);
			("code" in t ? t.trackErrors : t.errors !== !1) && (this.errsCount = e.gen.const("_errs", l.default.errors));
		}
		result(e, t, n) {
			this.failResult((0, c.not)(e), t, n);
		}
		failResult(e, t, n) {
			this.gen.if(e), n ? n() : this.error(), t ? (this.gen.else(), t(), this.allErrors && this.gen.endIf()) : this.allErrors ? this.gen.endIf() : this.gen.else();
		}
		pass(e, t) {
			this.failResult((0, c.not)(e), void 0, t);
		}
		fail(e) {
			if (e === void 0) {
				this.error(), this.allErrors || this.gen.if(!1);
				return;
			}
			this.gen.if(e), this.error(), this.allErrors ? this.gen.endIf() : this.gen.else();
		}
		fail$data(e) {
			if (!this.$data) return this.fail(e);
			let { schemaCode: t } = this;
			this.fail((0, c._)`${t} !== undefined && (${(0, c.or)(this.invalid$data(), e)})`);
		}
		error(e, t, n) {
			if (t) {
				this.setParams(t), this._error(e, n), this.setParams({});
				return;
			}
			this._error(e, n);
		}
		_error(e, t) {
			(e ? f.reportExtraError : f.reportError)(this, this.def.error, t);
		}
		$dataError() {
			(0, f.reportError)(this, this.def.$dataError || f.keyword$DataError);
		}
		reset() {
			if (this.errsCount === void 0) throw Error("add \"trackErrors\" to keyword definition");
			(0, f.resetErrorsCount)(this.gen, this.errsCount);
		}
		ok(e) {
			this.allErrors || this.gen.if(e);
		}
		setParams(e, t) {
			t ? Object.assign(this.params, e) : this.params = e;
		}
		block$data(e, t, n = c.nil) {
			this.gen.block(() => {
				this.check$data(e, n), t();
			});
		}
		check$data(e = c.nil, t = c.nil) {
			if (!this.$data) return;
			let { gen: n, schemaCode: r, schemaType: i, def: a } = this;
			n.if((0, c.or)((0, c._)`${r} === undefined`, t)), e !== c.nil && n.assign(e, !0), (i.length || a.validateSchema) && (n.elseIf(this.invalid$data()), this.$dataError(), e !== c.nil && n.assign(e, !1)), n.else();
		}
		invalid$data() {
			let { gen: e, schemaCode: t, schemaType: n, def: r, it: a } = this;
			return (0, c.or)(o(), s());
			function o() {
				if (n.length) {
					/* istanbul ignore if */
					if (!(t instanceof c.Name)) throw Error("ajv implementation error");
					let e = Array.isArray(n) ? n : [n];
					return (0, c._)`${(0, i.checkDataTypes)(e, t, a.opts.strictNumbers, i.DataType.Wrong)}`;
				}
				return c.nil;
			}
			function s() {
				if (r.validateSchema) {
					let n = e.scopeValue("validate$data", { ref: r.validateSchema });
					return (0, c._)`!${n}(${t})`;
				}
				return c.nil;
			}
		}
		subschema(e, t) {
			let n = (0, s.getSubschema)(this.it, e);
			(0, s.extendSubschemaData)(n, this.it, e), (0, s.extendSubschemaMode)(n, e);
			let r = {
				...this.it,
				...n,
				items: void 0,
				props: void 0
			};
			return b(r, t), r;
		}
		mergeEvaluated(e, t) {
			let { it: n, gen: r } = this;
			n.opts.unevaluated && (n.props !== !0 && e.props !== void 0 && (n.props = d.mergeEvaluated.props(r, e.props, n.props, t)), n.items !== !0 && e.items !== void 0 && (n.items = d.mergeEvaluated.items(r, e.items, n.items, t)));
		}
		mergeValidEvaluated(e, t) {
			let { it: n, gen: r } = this;
			if (n.opts.unevaluated && (n.props !== !0 || n.items !== !0)) return r.if(t, () => this.mergeEvaluated(e, c.Name)), !0;
		}
	};
	e.KeywordCxt = me;
	function k(e, t, n, r) {
		let i = new me(e, n, t);
		"code" in n ? n.code(i, r) : i.$data && n.validate ? (0, o.funcKeywordCode)(i, n) : "macro" in n ? (0, o.macroKeywordCode)(i, n) : (n.compile || n.validate) && (0, o.funcKeywordCode)(i, n);
	}
	var he = /^\/(?:[^~]|~0|~1)*$/, A = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
	function ge(e, { dataLevel: t, dataNames: n, dataPathArr: r }) {
		let i, a;
		if (e === "") return l.default.rootData;
		if (e[0] === "/") {
			if (!he.test(e)) throw Error(`Invalid JSON-pointer: ${e}`);
			i = e, a = l.default.rootData;
		} else {
			let o = A.exec(e);
			if (!o) throw Error(`Invalid JSON-pointer: ${e}`);
			let s = +o[1];
			if (i = o[2], i === "#") {
				if (s >= t) throw Error(u("property/index", s));
				return r[t - s];
			}
			if (s > t) throw Error(u("data", s));
			if (a = n[t - s], !i) return a;
		}
		let o = a, s = i.split("/");
		for (let e of s) e && (a = (0, c._)`${a}${(0, c.getProperty)((0, d.unescapeJsonPointer)(e))}`, o = (0, c._)`${o} && ${a}`);
		return o;
		function u(e, n) {
			return `Cannot access ${e} ${n} levels up, current level is ${t}`;
		}
	}
	e.getData = ge;
})), rn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = class extends Error {
		constructor(e) {
			super("validation failed"), this.errors = e, this.ajv = this.validation = !0;
		}
	};
})), an = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = tn();
	e.default = class extends Error {
		constructor(e, n, r, i) {
			super(i || `can't resolve reference ${r} from id ${n}`), this.missingRef = (0, t.resolveUrl)(e, n, r), this.missingSchema = (0, t.normalizeId)((0, t.getFullPath)(e, this.missingRef));
		}
	};
})), on = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.resolveSchema = e.getCompilingSchema = e.resolveRef = e.compileSchema = e.SchemaEnv = void 0;
	var t = U(), n = rn(), r = Ut(), i = tn(), a = W(), o = nn(), s = class {
		constructor(e) {
			this.refs = {}, this.dynamicAnchors = {};
			let t;
			typeof e.schema == "object" && (t = e.schema), this.schema = e.schema, this.schemaId = e.schemaId, this.root = e.root || this, this.baseId = e.baseId ?? (0, i.normalizeId)(t?.[e.schemaId || "$id"]), this.schemaPath = e.schemaPath, this.localRefs = e.localRefs, this.meta = e.meta, this.$async = t?.$async, this.refs = {};
		}
	};
	e.SchemaEnv = s;
	function c(e) {
		let a = d.call(this, e);
		if (a) return a;
		let s = (0, i.getFullPath)(this.opts.uriResolver, e.root.baseId), { es5: c, lines: l } = this.opts.code, { ownProperties: u } = this.opts, f = new t.CodeGen(this.scope, {
			es5: c,
			lines: l,
			ownProperties: u
		}), p;
		e.$async && (p = f.scopeValue("Error", {
			ref: n.default,
			code: (0, t._)`require("ajv/dist/runtime/validation_error").default`
		}));
		let m = f.scopeName("validate");
		e.validateName = m;
		let h = {
			gen: f,
			allErrors: this.opts.allErrors,
			data: r.default.data,
			parentData: r.default.parentData,
			parentDataProperty: r.default.parentDataProperty,
			dataNames: [r.default.data],
			dataPathArr: [t.nil],
			dataLevel: 0,
			dataTypes: [],
			definedProperties: /* @__PURE__ */ new Set(),
			topSchemaRef: f.scopeValue("schema", this.opts.code.source === !0 ? {
				ref: e.schema,
				code: (0, t.stringify)(e.schema)
			} : { ref: e.schema }),
			validateName: m,
			ValidationError: p,
			schema: e.schema,
			schemaEnv: e,
			rootId: s,
			baseId: e.baseId || s,
			schemaPath: t.nil,
			errSchemaPath: e.schemaPath || (this.opts.jtd ? "" : "#"),
			errorPath: (0, t._)`""`,
			opts: this.opts,
			self: this
		}, g;
		try {
			this._compilations.add(e), (0, o.validateFunctionCode)(h), f.optimize(this.opts.code.optimize);
			let n = f.toString();
			g = `${f.scopeRefs(r.default.scope)}return ${n}`, this.opts.code.process && (g = this.opts.code.process(g, e));
			let i = Function(`${r.default.self}`, `${r.default.scope}`, g)(this, this.scope.get());
			if (this.scope.value(m, { ref: i }), i.errors = null, i.schema = e.schema, i.schemaEnv = e, e.$async && (i.$async = !0), this.opts.code.source === !0 && (i.source = {
				validateName: m,
				validateCode: n,
				scopeValues: f._values
			}), this.opts.unevaluated) {
				let { props: e, items: n } = h;
				i.evaluated = {
					props: e instanceof t.Name ? void 0 : e,
					items: n instanceof t.Name ? void 0 : n,
					dynamicProps: e instanceof t.Name,
					dynamicItems: n instanceof t.Name
				}, i.source && (i.source.evaluated = (0, t.stringify)(i.evaluated));
			}
			return e.validate = i, e;
		} catch (t) {
			throw delete e.validate, delete e.validateName, g && this.logger.error("Error compiling schema, function code:", g), t;
		} finally {
			this._compilations.delete(e);
		}
	}
	e.compileSchema = c;
	function l(e, t, n) {
		n = (0, i.resolveUrl)(this.opts.uriResolver, t, n);
		let r = e.refs[n];
		if (r) return r;
		let a = p.call(this, e, n);
		if (a === void 0) {
			let r = e.localRefs?.[n], { schemaId: i } = this.opts;
			r && (a = new s({
				schema: r,
				schemaId: i,
				root: e,
				baseId: t
			}));
		}
		if (a !== void 0) return e.refs[n] = u.call(this, a);
	}
	e.resolveRef = l;
	function u(e) {
		return (0, i.inlineRef)(e.schema, this.opts.inlineRefs) ? e.schema : e.validate ? e : c.call(this, e);
	}
	function d(e) {
		for (let t of this._compilations) if (f(t, e)) return t;
	}
	e.getCompilingSchema = d;
	function f(e, t) {
		return e.schema === t.schema && e.root === t.root && e.baseId === t.baseId;
	}
	function p(e, t) {
		let n;
		for (; typeof (n = this.refs[t]) == "string";) t = n;
		return n || this.schemas[t] || m.call(this, e, t);
	}
	function m(e, t) {
		let n = this.opts.uriResolver.parse(t), r = (0, i._getFullPath)(this.opts.uriResolver, n), a = (0, i.getFullPath)(this.opts.uriResolver, e.baseId, void 0);
		if (Object.keys(e.schema).length > 0 && r === a) return g.call(this, n, e);
		let o = (0, i.normalizeId)(r), l = this.refs[o] || this.schemas[o];
		if (typeof l == "string") {
			let t = m.call(this, e, l);
			return typeof t?.schema == "object" ? g.call(this, n, t) : void 0;
		}
		if (typeof l?.schema == "object") {
			if (l.validate || c.call(this, l), o === (0, i.normalizeId)(t)) {
				let { schema: t } = l, { schemaId: n } = this.opts, r = t[n];
				return r && (a = (0, i.resolveUrl)(this.opts.uriResolver, a, r)), new s({
					schema: t,
					schemaId: n,
					root: e,
					baseId: a
				});
			}
			return g.call(this, n, l);
		}
	}
	e.resolveSchema = m;
	var h = new Set([
		"properties",
		"patternProperties",
		"enum",
		"dependencies",
		"definitions"
	]);
	function g(e, { baseId: t, schema: n, root: r }) {
		if (e.fragment?.[0] !== "/") return;
		for (let r of e.fragment.slice(1).split("/")) {
			if (typeof n == "boolean") return;
			let e = n[(0, a.unescapeFragment)(r)];
			if (e === void 0) return;
			n = e;
			let o = typeof n == "object" && n[this.opts.schemaId];
			!h.has(r) && o && (t = (0, i.resolveUrl)(this.opts.uriResolver, t, o));
		}
		let o;
		if (typeof n != "boolean" && n.$ref && !(0, a.schemaHasRulesButRef)(n, this.RULES)) {
			let e = (0, i.resolveUrl)(this.opts.uriResolver, t, n.$ref);
			o = m.call(this, r, e);
		}
		let { schemaId: c } = this.opts;
		if (o ||= new s({
			schema: n,
			schemaId: c,
			root: r,
			baseId: t
		}), o.schema !== o.root.schema) return o;
	}
})), sn = /* @__PURE__ */ Je({
	$id: () => cn,
	additionalProperties: () => !1,
	default: () => pn,
	description: () => ln,
	properties: () => fn,
	required: () => dn,
	type: () => un
}), cn, ln, un, dn, fn, pn, mn = qe((() => {
	cn = "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#", ln = "Meta-schema for $data reference (JSON AnySchema extension proposal)", un = "object", dn = ["$data"], fn = { $data: {
		type: "string",
		anyOf: [{ format: "relative-json-pointer" }, { format: "json-pointer" }]
	} }, pn = {
		$id: cn,
		description: ln,
		type: un,
		required: dn,
		properties: fn,
		additionalProperties: !1
	};
})), hn = /* @__PURE__ */ z(((e, t) => {
	var n = RegExp.prototype.test.bind(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu), r = RegExp.prototype.test.bind(/^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u);
	function i(e) {
		let t = "", n = 0, r = 0;
		for (r = 0; r < e.length; r++) if (n = e[r].charCodeAt(0), n !== 48) {
			if (!(n >= 48 && n <= 57 || n >= 65 && n <= 70 || n >= 97 && n <= 102)) return "";
			t += e[r];
			break;
		}
		for (r += 1; r < e.length; r++) {
			if (n = e[r].charCodeAt(0), !(n >= 48 && n <= 57 || n >= 65 && n <= 70 || n >= 97 && n <= 102)) return "";
			t += e[r];
		}
		return t;
	}
	var a = RegExp.prototype.test.bind(/[^!"$&'()*+,\-.;=_`a-z{}~]/u);
	function o(e) {
		return e.length = 0, !0;
	}
	function s(e, t, n) {
		if (e.length) {
			let r = i(e);
			if (r !== "") t.push(r);
			else return n.error = !0, !1;
			e.length = 0;
		}
		return !0;
	}
	function c(e) {
		let t = 0, n = {
			error: !1,
			address: "",
			zone: ""
		}, r = [], a = [], c = !1, l = !1, u = s;
		for (let i = 0; i < e.length; i++) {
			let s = e[i];
			if (!(s === "[" || s === "]")) if (s === ":") {
				if (c === !0 && (l = !0), !u(a, r, n)) break;
				if (++t > 7) {
					n.error = !0;
					break;
				}
				i > 0 && e[i - 1] === ":" && (c = !0), r.push(":");
				continue;
			} else if (s === "%") {
				if (!u(a, r, n)) break;
				u = o;
			} else {
				a.push(s);
				continue;
			}
		}
		return a.length && (u === o ? n.zone = a.join("") : l ? r.push(a.join("")) : r.push(i(a))), n.address = r.join(""), n;
	}
	function l(e) {
		if (u(e, ":") < 2) return {
			host: e,
			isIPV6: !1
		};
		let t = c(e);
		if (t.error) return {
			host: e,
			isIPV6: !1
		};
		{
			let e = t.address, n = t.address;
			return t.zone && (e += "%" + t.zone, n += "%25" + t.zone), {
				host: e,
				isIPV6: !0,
				escapedHost: n
			};
		}
	}
	function u(e, t) {
		let n = 0;
		for (let r = 0; r < e.length; r++) e[r] === t && n++;
		return n;
	}
	function d(e) {
		let t = e, n = [], r = -1, i = 0;
		for (; i = t.length;) {
			if (i === 1) {
				if (t === ".") break;
				if (t === "/") {
					n.push("/");
					break;
				} else {
					n.push(t);
					break;
				}
			} else if (i === 2) {
				if (t[0] === ".") {
					if (t[1] === ".") break;
					if (t[1] === "/") {
						t = t.slice(2);
						continue;
					}
				} else if (t[0] === "/" && (t[1] === "." || t[1] === "/")) {
					n.push("/");
					break;
				}
			} else if (i === 3 && t === "/..") {
				n.length !== 0 && n.pop(), n.push("/");
				break;
			}
			if (t[0] === ".") {
				if (t[1] === ".") {
					if (t[2] === "/") {
						t = t.slice(3);
						continue;
					}
				} else if (t[1] === "/") {
					t = t.slice(2);
					continue;
				}
			} else if (t[0] === "/" && t[1] === ".") {
				if (t[2] === "/") {
					t = t.slice(2);
					continue;
				} else if (t[2] === "." && t[3] === "/") {
					t = t.slice(3), n.length !== 0 && n.pop();
					continue;
				}
			}
			if ((r = t.indexOf("/", 1)) === -1) {
				n.push(t);
				break;
			} else n.push(t.slice(0, r)), t = t.slice(r);
		}
		return n.join("");
	}
	function f(e, t) {
		let n = t === !0 ? unescape : escape;
		return e.scheme !== void 0 && (e.scheme = n(e.scheme)), e.userinfo !== void 0 && (e.userinfo = n(e.userinfo)), e.host !== void 0 && (e.host = n(e.host)), e.path !== void 0 && (e.path = n(e.path)), e.query !== void 0 && (e.query = n(e.query)), e.fragment !== void 0 && (e.fragment = n(e.fragment)), e;
	}
	function p(e) {
		let t = [];
		if (e.userinfo !== void 0 && (t.push(e.userinfo), t.push("@")), e.host !== void 0) {
			let n = unescape(e.host);
			if (!r(n)) {
				let t = l(n);
				n = t.isIPV6 === !0 ? `[${t.escapedHost}]` : e.host;
			}
			t.push(n);
		}
		return (typeof e.port == "number" || typeof e.port == "string") && (t.push(":"), t.push(String(e.port))), t.length ? t.join("") : void 0;
	}
	t.exports = {
		nonSimpleDomain: a,
		recomposeAuthority: p,
		normalizeComponentEncoding: f,
		removeDotSegments: d,
		isIPv4: r,
		isUUID: n,
		normalizeIPv6: l,
		stringArrayToHexStripped: i
	};
})), gn = /* @__PURE__ */ z(((e, t) => {
	var { isUUID: n } = hn(), r = /([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-.:;=@]|%[\da-f]{2})+)/iu, i = [
		"http",
		"https",
		"ws",
		"wss",
		"urn",
		"urn:uuid"
	];
	function a(e) {
		return i.indexOf(e) !== -1;
	}
	function o(e) {
		return e.secure === !0 ? !0 : e.secure === !1 ? !1 : e.scheme ? e.scheme.length === 3 && (e.scheme[0] === "w" || e.scheme[0] === "W") && (e.scheme[1] === "s" || e.scheme[1] === "S") && (e.scheme[2] === "s" || e.scheme[2] === "S") : !1;
	}
	function s(e) {
		return e.host || (e.error = e.error || "HTTP URIs must have a host."), e;
	}
	function c(e) {
		let t = String(e.scheme).toLowerCase() === "https";
		return (e.port === (t ? 443 : 80) || e.port === "") && (e.port = void 0), e.path ||= "/", e;
	}
	function l(e) {
		return e.secure = o(e), e.resourceName = (e.path || "/") + (e.query ? "?" + e.query : ""), e.path = void 0, e.query = void 0, e;
	}
	function u(e) {
		if ((e.port === (o(e) ? 443 : 80) || e.port === "") && (e.port = void 0), typeof e.secure == "boolean" && (e.scheme = e.secure ? "wss" : "ws", e.secure = void 0), e.resourceName) {
			let [t, n] = e.resourceName.split("?");
			e.path = t && t !== "/" ? t : void 0, e.query = n, e.resourceName = void 0;
		}
		return e.fragment = void 0, e;
	}
	function d(e, t) {
		if (!e.path) return e.error = "URN can not be parsed", e;
		let n = e.path.match(r);
		if (n) {
			let r = t.scheme || e.scheme || "urn";
			e.nid = n[1].toLowerCase(), e.nss = n[2];
			let i = S(`${r}:${t.nid || e.nid}`);
			e.path = void 0, i && (e = i.parse(e, t));
		} else e.error = e.error || "URN can not be parsed.";
		return e;
	}
	function f(e, t) {
		if (e.nid === void 0) throw Error("URN without nid cannot be serialized");
		let n = t.scheme || e.scheme || "urn", r = e.nid.toLowerCase(), i = S(`${n}:${t.nid || r}`);
		i && (e = i.serialize(e, t));
		let a = e, o = e.nss;
		return a.path = `${r || t.nid}:${o}`, t.skipEscape = !0, a;
	}
	function p(e, t) {
		let r = e;
		return r.uuid = r.nss, r.nss = void 0, !t.tolerant && (!r.uuid || !n(r.uuid)) && (r.error = r.error || "UUID is not valid."), r;
	}
	function m(e) {
		let t = e;
		return t.nss = (e.uuid || "").toLowerCase(), t;
	}
	var h = {
		scheme: "http",
		domainHost: !0,
		parse: s,
		serialize: c
	}, g = {
		scheme: "https",
		domainHost: h.domainHost,
		parse: s,
		serialize: c
	}, _ = {
		scheme: "ws",
		domainHost: !0,
		parse: l,
		serialize: u
	}, v = {
		scheme: "wss",
		domainHost: _.domainHost,
		parse: _.parse,
		serialize: _.serialize
	}, y = {
		scheme: "urn",
		parse: d,
		serialize: f,
		skipNormalize: !0
	}, b = {
		scheme: "urn:uuid",
		parse: p,
		serialize: m,
		skipNormalize: !0
	}, x = {
		http: h,
		https: g,
		ws: _,
		wss: v,
		urn: y,
		"urn:uuid": b
	};
	Object.setPrototypeOf(x, null);
	function S(e) {
		return e && (x[e] || x[e.toLowerCase()]) || void 0;
	}
	t.exports = {
		wsIsSecure: o,
		SCHEMES: x,
		isValidSchemeName: a,
		getSchemeHandler: S
	};
})), _n = /* @__PURE__ */ z(((e, t) => {
	var { normalizeIPv6: n, removeDotSegments: r, recomposeAuthority: i, normalizeComponentEncoding: a, isIPv4: o, nonSimpleDomain: s } = hn(), { SCHEMES: c, getSchemeHandler: l } = gn();
	function u(e, t) {
		return typeof e == "string" ? e = m(g(e, t), t) : typeof e == "object" && (e = g(m(e, t), t)), e;
	}
	function d(e, t, n) {
		let r = n ? Object.assign({ scheme: "null" }, n) : { scheme: "null" }, i = f(g(e, r), g(t, r), r, !0);
		return r.skipEscape = !0, m(i, r);
	}
	function f(e, t, n, i) {
		let a = {};
		return i || (e = g(m(e, n), n), t = g(m(t, n), n)), n ||= {}, !n.tolerant && t.scheme ? (a.scheme = t.scheme, a.userinfo = t.userinfo, a.host = t.host, a.port = t.port, a.path = r(t.path || ""), a.query = t.query) : (t.userinfo !== void 0 || t.host !== void 0 || t.port !== void 0 ? (a.userinfo = t.userinfo, a.host = t.host, a.port = t.port, a.path = r(t.path || ""), a.query = t.query) : (t.path ? (t.path[0] === "/" ? a.path = r(t.path) : ((e.userinfo !== void 0 || e.host !== void 0 || e.port !== void 0) && !e.path ? a.path = "/" + t.path : e.path ? a.path = e.path.slice(0, e.path.lastIndexOf("/") + 1) + t.path : a.path = t.path, a.path = r(a.path)), a.query = t.query) : (a.path = e.path, t.query === void 0 ? a.query = e.query : a.query = t.query), a.userinfo = e.userinfo, a.host = e.host, a.port = e.port), a.scheme = e.scheme), a.fragment = t.fragment, a;
	}
	function p(e, t, n) {
		return typeof e == "string" ? (e = unescape(e), e = m(a(g(e, n), !0), {
			...n,
			skipEscape: !0
		})) : typeof e == "object" && (e = m(a(e, !0), {
			...n,
			skipEscape: !0
		})), typeof t == "string" ? (t = unescape(t), t = m(a(g(t, n), !0), {
			...n,
			skipEscape: !0
		})) : typeof t == "object" && (t = m(a(t, !0), {
			...n,
			skipEscape: !0
		})), e.toLowerCase() === t.toLowerCase();
	}
	function m(e, t) {
		let n = {
			host: e.host,
			scheme: e.scheme,
			userinfo: e.userinfo,
			port: e.port,
			path: e.path,
			query: e.query,
			nid: e.nid,
			nss: e.nss,
			uuid: e.uuid,
			fragment: e.fragment,
			reference: e.reference,
			resourceName: e.resourceName,
			secure: e.secure,
			error: ""
		}, a = Object.assign({}, t), o = [], s = l(a.scheme || n.scheme);
		s && s.serialize && s.serialize(n, a), n.path !== void 0 && (a.skipEscape ? n.path = unescape(n.path) : (n.path = escape(n.path), n.scheme !== void 0 && (n.path = n.path.split("%3A").join(":")))), a.reference !== "suffix" && n.scheme && o.push(n.scheme, ":");
		let c = i(n);
		if (c !== void 0 && (a.reference !== "suffix" && o.push("//"), o.push(c), n.path && n.path[0] !== "/" && o.push("/")), n.path !== void 0) {
			let e = n.path;
			!a.absolutePath && (!s || !s.absolutePath) && (e = r(e)), c === void 0 && e[0] === "/" && e[1] === "/" && (e = "/%2F" + e.slice(2)), o.push(e);
		}
		return n.query !== void 0 && o.push("?", n.query), n.fragment !== void 0 && o.push("#", n.fragment), o.join("");
	}
	var h = /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
	function g(e, t) {
		let r = Object.assign({}, t), i = {
			scheme: void 0,
			userinfo: void 0,
			host: "",
			port: void 0,
			path: "",
			query: void 0,
			fragment: void 0
		}, a = !1;
		r.reference === "suffix" && (e = r.scheme ? r.scheme + ":" + e : "//" + e);
		let c = e.match(h);
		if (c) {
			if (i.scheme = c[1], i.userinfo = c[3], i.host = c[4], i.port = parseInt(c[5], 10), i.path = c[6] || "", i.query = c[7], i.fragment = c[8], isNaN(i.port) && (i.port = c[5]), i.host) if (o(i.host) === !1) {
				let e = n(i.host);
				i.host = e.host.toLowerCase(), a = e.isIPV6;
			} else a = !0;
			i.scheme === void 0 && i.userinfo === void 0 && i.host === void 0 && i.port === void 0 && i.query === void 0 && !i.path ? i.reference = "same-document" : i.scheme === void 0 ? i.reference = "relative" : i.fragment === void 0 ? i.reference = "absolute" : i.reference = "uri", r.reference && r.reference !== "suffix" && r.reference !== i.reference && (i.error = i.error || "URI is not a " + r.reference + " reference.");
			let t = l(r.scheme || i.scheme);
			if (!r.unicodeSupport && (!t || !t.unicodeSupport) && i.host && (r.domainHost || t && t.domainHost) && a === !1 && s(i.host)) try {
				i.host = URL.domainToASCII(i.host.toLowerCase());
			} catch (e) {
				i.error = i.error || "Host's domain name can not be converted to ASCII: " + e;
			}
			(!t || t && !t.skipNormalize) && (e.indexOf("%") !== -1 && (i.scheme !== void 0 && (i.scheme = unescape(i.scheme)), i.host !== void 0 && (i.host = unescape(i.host))), i.path &&= escape(unescape(i.path)), i.fragment &&= encodeURI(decodeURIComponent(i.fragment))), t && t.parse && t.parse(i, r);
		} else i.error = i.error || "URI can not be parsed.";
		return i;
	}
	var _ = {
		SCHEMES: c,
		normalize: u,
		resolve: d,
		resolveComponent: f,
		equal: p,
		serialize: m,
		parse: g
	};
	t.exports = _, t.exports.default = _, t.exports.fastUri = _;
})), vn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = _n();
	t.code = "require(\"ajv/dist/runtime/uri\").default", e.default = t;
})), yn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.CodeGen = e.Name = e.nil = e.stringify = e.str = e._ = e.KeywordCxt = void 0;
	var t = nn();
	Object.defineProperty(e, "KeywordCxt", {
		enumerable: !0,
		get: function() {
			return t.KeywordCxt;
		}
	});
	var n = U();
	Object.defineProperty(e, "_", {
		enumerable: !0,
		get: function() {
			return n._;
		}
	}), Object.defineProperty(e, "str", {
		enumerable: !0,
		get: function() {
			return n.str;
		}
	}), Object.defineProperty(e, "stringify", {
		enumerable: !0,
		get: function() {
			return n.stringify;
		}
	}), Object.defineProperty(e, "nil", {
		enumerable: !0,
		get: function() {
			return n.nil;
		}
	}), Object.defineProperty(e, "Name", {
		enumerable: !0,
		get: function() {
			return n.Name;
		}
	}), Object.defineProperty(e, "CodeGen", {
		enumerable: !0,
		get: function() {
			return n.CodeGen;
		}
	});
	var r = rn(), i = an(), a = Kt(), o = on(), s = U(), c = tn(), l = Jt(), u = W(), d = (mn(), Ze(sn).default), f = vn(), p = (e, t) => new RegExp(e, t);
	p.code = "new RegExp";
	var m = [
		"removeAdditional",
		"useDefaults",
		"coerceTypes"
	], h = new Set([
		"validate",
		"serialize",
		"parse",
		"wrapper",
		"root",
		"schema",
		"keyword",
		"pattern",
		"formats",
		"validate$data",
		"func",
		"obj",
		"Error"
	]), g = {
		errorDataPath: "",
		format: "`validateFormats: false` can be used instead.",
		nullable: "\"nullable\" keyword is supported by default.",
		jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
		extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
		missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
		processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
		sourceCode: "Use option `code: {source: true}`",
		strictDefaults: "It is default now, see option `strict`.",
		strictKeywords: "It is default now, see option `strict`.",
		uniqueItems: "\"uniqueItems\" keyword is always validated.",
		unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
		cache: "Map is used as cache, schema object as key.",
		serialize: "Map is used as cache, schema object as key.",
		ajvErrors: "It is default now."
	}, _ = {
		ignoreKeywordsWithRef: "",
		jsPropertySyntax: "",
		unicode: "\"minLength\"/\"maxLength\" account for unicode characters by default."
	}, v = 200;
	function y(e) {
		let t = e.strict, n = e.code?.optimize, r = n === !0 || n === void 0 ? 1 : n || 0, i = e.code?.regExp ?? p, a = e.uriResolver ?? f.default;
		return {
			strictSchema: e.strictSchema ?? t ?? !0,
			strictNumbers: e.strictNumbers ?? t ?? !0,
			strictTypes: e.strictTypes ?? t ?? "log",
			strictTuples: e.strictTuples ?? t ?? "log",
			strictRequired: e.strictRequired ?? t ?? !1,
			code: e.code ? {
				...e.code,
				optimize: r,
				regExp: i
			} : {
				optimize: r,
				regExp: i
			},
			loopRequired: e.loopRequired ?? v,
			loopEnum: e.loopEnum ?? v,
			meta: e.meta ?? !0,
			messages: e.messages ?? !0,
			inlineRefs: e.inlineRefs ?? !0,
			schemaId: e.schemaId ?? "$id",
			addUsedSchema: e.addUsedSchema ?? !0,
			validateSchema: e.validateSchema ?? !0,
			validateFormats: e.validateFormats ?? !0,
			unicodeRegExp: e.unicodeRegExp ?? !0,
			int32range: e.int32range ?? !0,
			uriResolver: a
		};
	}
	var b = class {
		constructor(e = {}) {
			this.schemas = {}, this.refs = {}, this.formats = {}, this._compilations = /* @__PURE__ */ new Set(), this._loading = {}, this._cache = /* @__PURE__ */ new Map(), e = this.opts = {
				...e,
				...y(e)
			};
			let { es5: t, lines: n } = this.opts.code;
			this.scope = new s.ValueScope({
				scope: {},
				prefixes: h,
				es5: t,
				lines: n
			}), this.logger = D(e.logger);
			let r = e.validateFormats;
			e.validateFormats = !1, this.RULES = (0, a.getRules)(), x.call(this, g, e, "NOT SUPPORTED"), x.call(this, _, e, "DEPRECATED", "warn"), this._metaOpts = T.call(this), e.formats && ee.call(this), this._addVocabularies(), this._addDefaultMetaSchema(), e.keywords && w.call(this, e.keywords), typeof e.meta == "object" && this.addMetaSchema(e.meta), C.call(this), e.validateFormats = r;
		}
		_addVocabularies() {
			this.addKeyword("$async");
		}
		_addDefaultMetaSchema() {
			let { $data: e, meta: t, schemaId: n } = this.opts, r = d;
			n === "id" && (r = { ...d }, r.id = r.$id, delete r.$id), t && e && this.addMetaSchema(r, r[n], !1);
		}
		defaultMeta() {
			let { meta: e, schemaId: t } = this.opts;
			return this.opts.defaultMeta = typeof e == "object" ? e[t] || e : void 0;
		}
		validate(e, t) {
			let n;
			if (typeof e == "string") {
				if (n = this.getSchema(e), !n) throw Error(`no schema with key or ref "${e}"`);
			} else n = this.compile(e);
			let r = n(t);
			return "$async" in n || (this.errors = n.errors), r;
		}
		compile(e, t) {
			let n = this._addSchema(e, t);
			return n.validate || this._compileSchemaEnv(n);
		}
		compileAsync(e, t) {
			if (typeof this.opts.loadSchema != "function") throw Error("options.loadSchema should be a function");
			let { loadSchema: n } = this.opts;
			return r.call(this, e, t);
			async function r(e, t) {
				await a.call(this, e.$schema);
				let n = this._addSchema(e, t);
				return n.validate || o.call(this, n);
			}
			async function a(e) {
				e && !this.getSchema(e) && await r.call(this, { $ref: e }, !0);
			}
			async function o(e) {
				try {
					return this._compileSchemaEnv(e);
				} catch (t) {
					if (!(t instanceof i.default)) throw t;
					return s.call(this, t), await c.call(this, t.missingSchema), o.call(this, e);
				}
			}
			function s({ missingSchema: e, missingRef: t }) {
				if (this.refs[e]) throw Error(`AnySchema ${e} is loaded but ${t} cannot be resolved`);
			}
			async function c(e) {
				let n = await l.call(this, e);
				this.refs[e] || await a.call(this, n.$schema), this.refs[e] || this.addSchema(n, e, t);
			}
			async function l(e) {
				let t = this._loading[e];
				if (t) return t;
				try {
					return await (this._loading[e] = n(e));
				} finally {
					delete this._loading[e];
				}
			}
		}
		addSchema(e, t, n, r = this.opts.validateSchema) {
			if (Array.isArray(e)) {
				for (let t of e) this.addSchema(t, void 0, n, r);
				return this;
			}
			let i;
			if (typeof e == "object") {
				let { schemaId: t } = this.opts;
				if (i = e[t], i !== void 0 && typeof i != "string") throw Error(`schema ${t} must be string`);
			}
			return t = (0, c.normalizeId)(t || i), this._checkUnique(t), this.schemas[t] = this._addSchema(e, n, t, r, !0), this;
		}
		addMetaSchema(e, t, n = this.opts.validateSchema) {
			return this.addSchema(e, t, !0, n), this;
		}
		validateSchema(e, t) {
			if (typeof e == "boolean") return !0;
			let n;
			if (n = e.$schema, n !== void 0 && typeof n != "string") throw Error("$schema must be a string");
			if (n = n || this.opts.defaultMeta || this.defaultMeta(), !n) return this.logger.warn("meta-schema not available"), this.errors = null, !0;
			let r = this.validate(n, e);
			if (!r && t) {
				let e = "schema is invalid: " + this.errorsText();
				if (this.opts.validateSchema === "log") this.logger.error(e);
				else throw Error(e);
			}
			return r;
		}
		getSchema(e) {
			let t;
			for (; typeof (t = S.call(this, e)) == "string";) e = t;
			if (t === void 0) {
				let { schemaId: n } = this.opts, r = new o.SchemaEnv({
					schema: {},
					schemaId: n
				});
				if (t = o.resolveSchema.call(this, r, e), !t) return;
				this.refs[e] = t;
			}
			return t.validate || this._compileSchemaEnv(t);
		}
		removeSchema(e) {
			if (e instanceof RegExp) return this._removeAllSchemas(this.schemas, e), this._removeAllSchemas(this.refs, e), this;
			switch (typeof e) {
				case "undefined": return this._removeAllSchemas(this.schemas), this._removeAllSchemas(this.refs), this._cache.clear(), this;
				case "string": {
					let t = S.call(this, e);
					return typeof t == "object" && this._cache.delete(t.schema), delete this.schemas[e], delete this.refs[e], this;
				}
				case "object": {
					let t = e;
					this._cache.delete(t);
					let n = e[this.opts.schemaId];
					return n && (n = (0, c.normalizeId)(n), delete this.schemas[n], delete this.refs[n]), this;
				}
				default: throw Error("ajv.removeSchema: invalid parameter");
			}
		}
		addVocabulary(e) {
			for (let t of e) this.addKeyword(t);
			return this;
		}
		addKeyword(e, t) {
			let n;
			if (typeof e == "string") n = e, typeof t == "object" && (this.logger.warn("these parameters are deprecated, see docs for addKeyword"), t.keyword = n);
			else if (typeof e == "object" && t === void 0) {
				if (t = e, n = t.keyword, Array.isArray(n) && !n.length) throw Error("addKeywords: keyword must be string or non-empty array");
			} else throw Error("invalid addKeywords parameters");
			if (te.call(this, n, t), !t) return (0, u.eachItem)(n, (e) => ne.call(this, e)), this;
			ie.call(this, t);
			let r = {
				...t,
				type: (0, l.getJSONTypes)(t.type),
				schemaType: (0, l.getJSONTypes)(t.schemaType)
			};
			return (0, u.eachItem)(n, r.type.length === 0 ? (e) => ne.call(this, e, r) : (e) => r.type.forEach((t) => ne.call(this, e, r, t))), this;
		}
		getKeyword(e) {
			let t = this.RULES.all[e];
			return typeof t == "object" ? t.definition : !!t;
		}
		removeKeyword(e) {
			let { RULES: t } = this;
			delete t.keywords[e], delete t.all[e];
			for (let n of t.rules) {
				let t = n.rules.findIndex((t) => t.keyword === e);
				t >= 0 && n.rules.splice(t, 1);
			}
			return this;
		}
		addFormat(e, t) {
			return typeof t == "string" && (t = new RegExp(t)), this.formats[e] = t, this;
		}
		errorsText(e = this.errors, { separator: t = ", ", dataVar: n = "data" } = {}) {
			return !e || e.length === 0 ? "No errors" : e.map((e) => `${n}${e.instancePath} ${e.message}`).reduce((e, n) => e + t + n);
		}
		$dataMetaSchema(e, t) {
			let n = this.RULES.all;
			e = JSON.parse(JSON.stringify(e));
			for (let r of t) {
				let t = r.split("/").slice(1), i = e;
				for (let e of t) i = i[e];
				for (let e in n) {
					let t = n[e];
					if (typeof t != "object") continue;
					let { $data: r } = t.definition, a = i[e];
					r && a && (i[e] = oe(a));
				}
			}
			return e;
		}
		_removeAllSchemas(e, t) {
			for (let n in e) {
				let r = e[n];
				(!t || t.test(n)) && (typeof r == "string" ? delete e[n] : r && !r.meta && (this._cache.delete(r.schema), delete e[n]));
			}
		}
		_addSchema(e, t, n, r = this.opts.validateSchema, i = this.opts.addUsedSchema) {
			let a, { schemaId: s } = this.opts;
			if (typeof e == "object") a = e[s];
			else if (this.opts.jtd) throw Error("schema must be object");
			else if (typeof e != "boolean") throw Error("schema must be object or boolean");
			let l = this._cache.get(e);
			if (l !== void 0) return l;
			n = (0, c.normalizeId)(a || n);
			let u = c.getSchemaRefs.call(this, e, n);
			return l = new o.SchemaEnv({
				schema: e,
				schemaId: s,
				meta: t,
				baseId: n,
				localRefs: u
			}), this._cache.set(l.schema, l), i && !n.startsWith("#") && (n && this._checkUnique(n), this.refs[n] = l), r && this.validateSchema(e, !0), l;
		}
		_checkUnique(e) {
			if (this.schemas[e] || this.refs[e]) throw Error(`schema with key or id "${e}" already exists`);
		}
		_compileSchemaEnv(e) {
			/* istanbul ignore if */
			if (e.meta ? this._compileMetaSchema(e) : o.compileSchema.call(this, e), !e.validate) throw Error("ajv implementation error");
			return e.validate;
		}
		_compileMetaSchema(e) {
			let t = this.opts;
			this.opts = this._metaOpts;
			try {
				o.compileSchema.call(this, e);
			} finally {
				this.opts = t;
			}
		}
	};
	b.ValidationError = r.default, b.MissingRefError = i.default, e.default = b;
	function x(e, t, n, r = "error") {
		for (let i in e) {
			let a = i;
			a in t && this.logger[r](`${n}: option ${i}. ${e[a]}`);
		}
	}
	function S(e) {
		return e = (0, c.normalizeId)(e), this.schemas[e] || this.refs[e];
	}
	function C() {
		let e = this.opts.schemas;
		if (e) if (Array.isArray(e)) this.addSchema(e);
		else for (let t in e) this.addSchema(e[t], t);
	}
	function ee() {
		for (let e in this.opts.formats) {
			let t = this.opts.formats[e];
			t && this.addFormat(e, t);
		}
	}
	function w(e) {
		if (Array.isArray(e)) {
			this.addVocabulary(e);
			return;
		}
		this.logger.warn("keywords option as map is deprecated, pass array");
		for (let t in e) {
			let n = e[t];
			n.keyword ||= t, this.addKeyword(n);
		}
	}
	function T() {
		let e = { ...this.opts };
		for (let t of m) delete e[t];
		return e;
	}
	var E = {
		log() {},
		warn() {},
		error() {}
	};
	function D(e) {
		if (e === !1) return E;
		if (e === void 0) return console;
		if (e.log && e.warn && e.error) return e;
		throw Error("logger must implement log, warn and error methods");
	}
	var O = /^[a-z_$][a-z0-9_$:-]*$/i;
	function te(e, t) {
		let { RULES: n } = this;
		if ((0, u.eachItem)(e, (e) => {
			if (n.keywords[e]) throw Error(`Keyword ${e} is already defined`);
			if (!O.test(e)) throw Error(`Keyword ${e} has invalid name`);
		}), t && t.$data && !("code" in t || "validate" in t)) throw Error("$data keyword must have \"code\" or \"validate\" function");
	}
	function ne(e, t, n) {
		var r;
		let i = t?.post;
		if (n && i) throw Error("keyword with \"post\" flag cannot have \"type\"");
		let { RULES: a } = this, o = i ? a.post : a.rules.find(({ type: e }) => e === n);
		if (o || (o = {
			type: n,
			rules: []
		}, a.rules.push(o)), a.keywords[e] = !0, !t) return;
		let s = {
			keyword: e,
			definition: {
				...t,
				type: (0, l.getJSONTypes)(t.type),
				schemaType: (0, l.getJSONTypes)(t.schemaType)
			}
		};
		t.before ? re.call(this, o, s, t.before) : o.rules.push(s), a.all[e] = s, (r = t.implements) == null || r.forEach((e) => this.addKeyword(e));
	}
	function re(e, t, n) {
		let r = e.rules.findIndex((e) => e.keyword === n);
		r >= 0 ? e.rules.splice(r, 0, t) : (e.rules.push(t), this.logger.warn(`rule ${n} is not defined`));
	}
	function ie(e) {
		let { metaSchema: t } = e;
		t !== void 0 && (e.$data && this.opts.$data && (t = oe(t)), e.validateSchema = this.compile(t, !0));
	}
	var ae = { $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#" };
	function oe(e) {
		return { anyOf: [e, ae] };
	}
})), bn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = {
		keyword: "id",
		code() {
			throw Error("NOT SUPPORTED: keyword \"id\", use \"$id\" for schema ID");
		}
	};
})), xn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.callRef = e.getValidate = void 0;
	var t = an(), n = Xt(), r = U(), i = Ut(), a = on(), o = W(), s = {
		keyword: "$ref",
		schemaType: "string",
		code(e) {
			let { gen: n, schema: i, it: o } = e, { baseId: s, schemaEnv: u, validateName: d, opts: f, self: p } = o, { root: m } = u;
			if ((i === "#" || i === "#/") && s === m.baseId) return g();
			let h = a.resolveRef.call(p, m, s, i);
			if (h === void 0) throw new t.default(o.opts.uriResolver, s, i);
			if (h instanceof a.SchemaEnv) return _(h);
			return v(h);
			function g() {
				if (u === m) return l(e, d, u, u.$async);
				let t = n.scopeValue("root", { ref: m });
				return l(e, (0, r._)`${t}.validate`, m, m.$async);
			}
			function _(t) {
				l(e, c(e, t), t, t.$async);
			}
			function v(t) {
				let a = n.scopeValue("schema", f.code.source === !0 ? {
					ref: t,
					code: (0, r.stringify)(t)
				} : { ref: t }), o = n.name("valid"), s = e.subschema({
					schema: t,
					dataTypes: [],
					schemaPath: r.nil,
					topSchemaRef: a,
					errSchemaPath: i
				}, o);
				e.mergeEvaluated(s), e.ok(o);
			}
		}
	};
	function c(e, t) {
		let { gen: n } = e;
		return t.validate ? n.scopeValue("validate", { ref: t.validate }) : (0, r._)`${n.scopeValue("wrapper", { ref: t })}.validate`;
	}
	e.getValidate = c;
	function l(e, t, a, s) {
		let { gen: c, it: l } = e, { allErrors: u, schemaEnv: d, opts: f } = l, p = f.passContext ? i.default.this : r.nil;
		s ? m() : h();
		function m() {
			if (!d.$async) throw Error("async schema referenced by sync schema");
			let i = c.let("valid");
			c.try(() => {
				c.code((0, r._)`await ${(0, n.callValidateCode)(e, t, p)}`), _(t), u || c.assign(i, !0);
			}, (e) => {
				c.if((0, r._)`!(${e} instanceof ${l.ValidationError})`, () => c.throw(e)), g(e), u || c.assign(i, !1);
			}), e.ok(i);
		}
		function h() {
			e.result((0, n.callValidateCode)(e, t, p), () => _(t), () => g(t));
		}
		function g(e) {
			let t = (0, r._)`${e}.errors`;
			c.assign(i.default.vErrors, (0, r._)`${i.default.vErrors} === null ? ${t} : ${i.default.vErrors}.concat(${t})`), c.assign(i.default.errors, (0, r._)`${i.default.vErrors}.length`);
		}
		function _(e) {
			if (!l.opts.unevaluated) return;
			let t = a?.validate?.evaluated;
			if (l.props !== !0) if (t && !t.dynamicProps) t.props !== void 0 && (l.props = o.mergeEvaluated.props(c, t.props, l.props));
			else {
				let t = c.var("props", (0, r._)`${e}.evaluated.props`);
				l.props = o.mergeEvaluated.props(c, t, l.props, r.Name);
			}
			if (l.items !== !0) if (t && !t.dynamicItems) t.items !== void 0 && (l.items = o.mergeEvaluated.items(c, t.items, l.items));
			else {
				let t = c.var("items", (0, r._)`${e}.evaluated.items`);
				l.items = o.mergeEvaluated.items(c, t, l.items, r.Name);
			}
		}
	}
	e.callRef = l, e.default = s;
})), Sn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = bn(), n = xn();
	e.default = [
		"$schema",
		"$id",
		"$defs",
		"$vocabulary",
		{ keyword: "$comment" },
		"definitions",
		t.default,
		n.default
	];
})), Cn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = U(), n = t.operators, r = {
		maximum: {
			okStr: "<=",
			ok: n.LTE,
			fail: n.GT
		},
		minimum: {
			okStr: ">=",
			ok: n.GTE,
			fail: n.LT
		},
		exclusiveMaximum: {
			okStr: "<",
			ok: n.LT,
			fail: n.GTE
		},
		exclusiveMinimum: {
			okStr: ">",
			ok: n.GT,
			fail: n.LTE
		}
	};
	e.default = {
		keyword: Object.keys(r),
		type: "number",
		schemaType: "number",
		$data: !0,
		error: {
			message: ({ keyword: e, schemaCode: n }) => (0, t.str)`must be ${r[e].okStr} ${n}`,
			params: ({ keyword: e, schemaCode: n }) => (0, t._)`{comparison: ${r[e].okStr}, limit: ${n}}`
		},
		code(e) {
			let { keyword: n, data: i, schemaCode: a } = e;
			e.fail$data((0, t._)`${i} ${r[n].fail} ${a} || isNaN(${i})`);
		}
	};
})), wn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = U();
	e.default = {
		keyword: "multipleOf",
		type: "number",
		schemaType: "number",
		$data: !0,
		error: {
			message: ({ schemaCode: e }) => (0, t.str)`must be multiple of ${e}`,
			params: ({ schemaCode: e }) => (0, t._)`{multipleOf: ${e}}`
		},
		code(e) {
			let { gen: n, data: r, schemaCode: i, it: a } = e, o = a.opts.multipleOfPrecision, s = n.let("res"), c = o ? (0, t._)`Math.abs(Math.round(${s}) - ${s}) > 1e-${o}` : (0, t._)`${s} !== parseInt(${s})`;
			e.fail$data((0, t._)`(${i} === 0 || (${s} = ${r}/${i}, ${c}))`);
		}
	};
})), Tn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	function t(e) {
		let t = e.length, n = 0, r = 0, i;
		for (; r < t;) n++, i = e.charCodeAt(r++), i >= 55296 && i <= 56319 && r < t && (i = e.charCodeAt(r), (i & 64512) == 56320 && r++);
		return n;
	}
	e.default = t, t.code = "require(\"ajv/dist/runtime/ucs2length\").default";
})), En = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = U(), n = W(), r = Tn();
	e.default = {
		keyword: ["maxLength", "minLength"],
		type: "string",
		schemaType: "number",
		$data: !0,
		error: {
			message({ keyword: e, schemaCode: n }) {
				let r = e === "maxLength" ? "more" : "fewer";
				return (0, t.str)`must NOT have ${r} than ${n} characters`;
			},
			params: ({ schemaCode: e }) => (0, t._)`{limit: ${e}}`
		},
		code(e) {
			let { keyword: i, data: a, schemaCode: o, it: s } = e, c = i === "maxLength" ? t.operators.GT : t.operators.LT, l = s.opts.unicode === !1 ? (0, t._)`${a}.length` : (0, t._)`${(0, n.useFunc)(e.gen, r.default)}(${a})`;
			e.fail$data((0, t._)`${l} ${c} ${o}`);
		}
	};
})), Dn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = Xt(), n = W(), r = U();
	e.default = {
		keyword: "pattern",
		type: "string",
		schemaType: "string",
		$data: !0,
		error: {
			message: ({ schemaCode: e }) => (0, r.str)`must match pattern "${e}"`,
			params: ({ schemaCode: e }) => (0, r._)`{pattern: ${e}}`
		},
		code(e) {
			let { gen: i, data: a, $data: o, schema: s, schemaCode: c, it: l } = e, u = l.opts.unicodeRegExp ? "u" : "";
			if (o) {
				let { regExp: t } = l.opts.code, o = t.code === "new RegExp" ? (0, r._)`new RegExp` : (0, n.useFunc)(i, t), s = i.let("valid");
				i.try(() => i.assign(s, (0, r._)`${o}(${c}, ${u}).test(${a})`), () => i.assign(s, !1)), e.fail$data((0, r._)`!${s}`);
			} else {
				let n = (0, t.usePattern)(e, s);
				e.fail$data((0, r._)`!${n}.test(${a})`);
			}
		}
	};
})), On = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = U();
	e.default = {
		keyword: ["maxProperties", "minProperties"],
		type: "object",
		schemaType: "number",
		$data: !0,
		error: {
			message({ keyword: e, schemaCode: n }) {
				let r = e === "maxProperties" ? "more" : "fewer";
				return (0, t.str)`must NOT have ${r} than ${n} properties`;
			},
			params: ({ schemaCode: e }) => (0, t._)`{limit: ${e}}`
		},
		code(e) {
			let { keyword: n, data: r, schemaCode: i } = e, a = n === "maxProperties" ? t.operators.GT : t.operators.LT;
			e.fail$data((0, t._)`Object.keys(${r}).length ${a} ${i}`);
		}
	};
})), kn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = Xt(), n = U(), r = W();
	e.default = {
		keyword: "required",
		type: "object",
		schemaType: "array",
		$data: !0,
		error: {
			message: ({ params: { missingProperty: e } }) => (0, n.str)`must have required property '${e}'`,
			params: ({ params: { missingProperty: e } }) => (0, n._)`{missingProperty: ${e}}`
		},
		code(e) {
			let { gen: i, schema: a, schemaCode: o, data: s, $data: c, it: l } = e, { opts: u } = l;
			if (!c && a.length === 0) return;
			let d = a.length >= u.loopRequired;
			if (l.allErrors ? f() : p(), u.strictRequired) {
				let t = e.parentSchema.properties, { definedProperties: n } = e.it;
				for (let e of a) if (t?.[e] === void 0 && !n.has(e)) {
					let t = `required property "${e}" is not defined at "${l.schemaEnv.baseId + l.errSchemaPath}" (strictRequired)`;
					(0, r.checkStrictMode)(l, t, l.opts.strictRequired);
				}
			}
			function f() {
				if (d || c) e.block$data(n.nil, m);
				else for (let n of a) (0, t.checkReportMissingProp)(e, n);
			}
			function p() {
				let n = i.let("missing");
				if (d || c) {
					let t = i.let("valid", !0);
					e.block$data(t, () => h(n, t)), e.ok(t);
				} else i.if((0, t.checkMissingProp)(e, a, n)), (0, t.reportMissingProp)(e, n), i.else();
			}
			function m() {
				i.forOf("prop", o, (n) => {
					e.setParams({ missingProperty: n }), i.if((0, t.noPropertyInData)(i, s, n, u.ownProperties), () => e.error());
				});
			}
			function h(r, a) {
				e.setParams({ missingProperty: r }), i.forOf(r, o, () => {
					i.assign(a, (0, t.propertyInData)(i, s, r, u.ownProperties)), i.if((0, n.not)(a), () => {
						e.error(), i.break();
					});
				}, n.nil);
			}
		}
	};
})), An = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = U();
	e.default = {
		keyword: ["maxItems", "minItems"],
		type: "array",
		schemaType: "number",
		$data: !0,
		error: {
			message({ keyword: e, schemaCode: n }) {
				let r = e === "maxItems" ? "more" : "fewer";
				return (0, t.str)`must NOT have ${r} than ${n} items`;
			},
			params: ({ schemaCode: e }) => (0, t._)`{limit: ${e}}`
		},
		code(e) {
			let { keyword: n, data: r, schemaCode: i } = e, a = n === "maxItems" ? t.operators.GT : t.operators.LT;
			e.fail$data((0, t._)`${r}.length ${a} ${i}`);
		}
	};
})), jn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = $t();
	t.code = "require(\"ajv/dist/runtime/equal\").default", e.default = t;
})), Mn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = Jt(), n = U(), r = W(), i = jn();
	e.default = {
		keyword: "uniqueItems",
		type: "array",
		schemaType: "boolean",
		$data: !0,
		error: {
			message: ({ params: { i: e, j: t } }) => (0, n.str)`must NOT have duplicate items (items ## ${t} and ${e} are identical)`,
			params: ({ params: { i: e, j: t } }) => (0, n._)`{i: ${e}, j: ${t}}`
		},
		code(e) {
			let { gen: a, data: o, $data: s, schema: c, parentSchema: l, schemaCode: u, it: d } = e;
			if (!s && !c) return;
			let f = a.let("valid"), p = l.items ? (0, t.getSchemaTypes)(l.items) : [];
			e.block$data(f, m, (0, n._)`${u} === false`), e.ok(f);
			function m() {
				let t = a.let("i", (0, n._)`${o}.length`), r = a.let("j");
				e.setParams({
					i: t,
					j: r
				}), a.assign(f, !0), a.if((0, n._)`${t} > 1`, () => (h() ? g : _)(t, r));
			}
			function h() {
				return p.length > 0 && !p.some((e) => e === "object" || e === "array");
			}
			function g(r, i) {
				let s = a.name("item"), c = (0, t.checkDataTypes)(p, s, d.opts.strictNumbers, t.DataType.Wrong), l = a.const("indices", (0, n._)`{}`);
				a.for((0, n._)`;${r}--;`, () => {
					a.let(s, (0, n._)`${o}[${r}]`), a.if(c, (0, n._)`continue`), p.length > 1 && a.if((0, n._)`typeof ${s} == "string"`, (0, n._)`${s} += "_"`), a.if((0, n._)`typeof ${l}[${s}] == "number"`, () => {
						a.assign(i, (0, n._)`${l}[${s}]`), e.error(), a.assign(f, !1).break();
					}).code((0, n._)`${l}[${s}] = ${r}`);
				});
			}
			function _(t, s) {
				let c = (0, r.useFunc)(a, i.default), l = a.name("outer");
				a.label(l).for((0, n._)`;${t}--;`, () => a.for((0, n._)`${s} = ${t}; ${s}--;`, () => a.if((0, n._)`${c}(${o}[${t}], ${o}[${s}])`, () => {
					e.error(), a.assign(f, !1).break(l);
				})));
			}
		}
	};
})), Nn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = U(), n = W(), r = jn();
	e.default = {
		keyword: "const",
		$data: !0,
		error: {
			message: "must be equal to constant",
			params: ({ schemaCode: e }) => (0, t._)`{allowedValue: ${e}}`
		},
		code(e) {
			let { gen: i, data: a, $data: o, schemaCode: s, schema: c } = e;
			o || c && typeof c == "object" ? e.fail$data((0, t._)`!${(0, n.useFunc)(i, r.default)}(${a}, ${s})`) : e.fail((0, t._)`${c} !== ${a}`);
		}
	};
})), Pn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = U(), n = W(), r = jn();
	e.default = {
		keyword: "enum",
		schemaType: "array",
		$data: !0,
		error: {
			message: "must be equal to one of the allowed values",
			params: ({ schemaCode: e }) => (0, t._)`{allowedValues: ${e}}`
		},
		code(e) {
			let { gen: i, data: a, $data: o, schema: s, schemaCode: c, it: l } = e;
			if (!o && s.length === 0) throw Error("enum must have non-empty array");
			let u = s.length >= l.opts.loopEnum, d, f = () => d ??= (0, n.useFunc)(i, r.default), p;
			if (u || o) p = i.let("valid"), e.block$data(p, m);
			else {
				/* istanbul ignore if */
				if (!Array.isArray(s)) throw Error("ajv implementation error");
				let e = i.const("vSchema", c);
				p = (0, t.or)(...s.map((t, n) => h(e, n)));
			}
			e.pass(p);
			function m() {
				i.assign(p, !1), i.forOf("v", c, (e) => i.if((0, t._)`${f()}(${a}, ${e})`, () => i.assign(p, !0).break()));
			}
			function h(e, n) {
				let r = s[n];
				return typeof r == "object" && r ? (0, t._)`${f()}(${a}, ${e}[${n}])` : (0, t._)`${a} === ${r}`;
			}
		}
	};
})), Fn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = Cn(), n = wn(), r = En(), i = Dn(), a = On(), o = kn(), s = An(), c = Mn(), l = Nn(), u = Pn();
	e.default = [
		t.default,
		n.default,
		r.default,
		i.default,
		a.default,
		o.default,
		s.default,
		c.default,
		{
			keyword: "type",
			schemaType: ["string", "array"]
		},
		{
			keyword: "nullable",
			schemaType: "boolean"
		},
		l.default,
		u.default
	];
})), In = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.validateAdditionalItems = void 0;
	var t = U(), n = W(), r = {
		keyword: "additionalItems",
		type: "array",
		schemaType: ["boolean", "object"],
		before: "uniqueItems",
		error: {
			message: ({ params: { len: e } }) => (0, t.str)`must NOT have more than ${e} items`,
			params: ({ params: { len: e } }) => (0, t._)`{limit: ${e}}`
		},
		code(e) {
			let { parentSchema: t, it: r } = e, { items: a } = t;
			if (!Array.isArray(a)) {
				(0, n.checkStrictMode)(r, "\"additionalItems\" is ignored when \"items\" is not an array of schemas");
				return;
			}
			i(e, a);
		}
	};
	function i(e, r) {
		let { gen: i, schema: a, data: o, keyword: s, it: c } = e;
		c.items = !0;
		let l = i.const("len", (0, t._)`${o}.length`);
		if (a === !1) e.setParams({ len: r.length }), e.pass((0, t._)`${l} <= ${r.length}`);
		else if (typeof a == "object" && !(0, n.alwaysValidSchema)(c, a)) {
			let n = i.var("valid", (0, t._)`${l} <= ${r.length}`);
			i.if((0, t.not)(n), () => u(n)), e.ok(n);
		}
		function u(a) {
			i.forRange("i", r.length, l, (r) => {
				e.subschema({
					keyword: s,
					dataProp: r,
					dataPropType: n.Type.Num
				}, a), c.allErrors || i.if((0, t.not)(a), () => i.break());
			});
		}
	}
	e.validateAdditionalItems = i, e.default = r;
})), Ln = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.validateTuple = void 0;
	var t = U(), n = W(), r = Xt(), i = {
		keyword: "items",
		type: "array",
		schemaType: [
			"object",
			"array",
			"boolean"
		],
		before: "uniqueItems",
		code(e) {
			let { schema: t, it: i } = e;
			if (Array.isArray(t)) return a(e, "additionalItems", t);
			i.items = !0, !(0, n.alwaysValidSchema)(i, t) && e.ok((0, r.validateArray)(e));
		}
	};
	function a(e, r, i = e.schema) {
		let { gen: a, parentSchema: o, data: s, keyword: c, it: l } = e;
		f(o), l.opts.unevaluated && i.length && l.items !== !0 && (l.items = n.mergeEvaluated.items(a, i.length, l.items));
		let u = a.name("valid"), d = a.const("len", (0, t._)`${s}.length`);
		i.forEach((r, i) => {
			(0, n.alwaysValidSchema)(l, r) || (a.if((0, t._)`${d} > ${i}`, () => e.subschema({
				keyword: c,
				schemaProp: i,
				dataProp: i
			}, u)), e.ok(u));
		});
		function f(e) {
			let { opts: t, errSchemaPath: a } = l, o = i.length, s = o === e.minItems && (o === e.maxItems || e[r] === !1);
			if (t.strictTuples && !s) {
				let e = `"${c}" is ${o}-tuple, but minItems or maxItems/${r} are not specified or different at path "${a}"`;
				(0, n.checkStrictMode)(l, e, t.strictTuples);
			}
		}
	}
	e.validateTuple = a, e.default = i;
})), Rn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = Ln();
	e.default = {
		keyword: "prefixItems",
		type: "array",
		schemaType: ["array"],
		before: "uniqueItems",
		code: (e) => (0, t.validateTuple)(e, "items")
	};
})), zn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = U(), n = W(), r = Xt(), i = In();
	e.default = {
		keyword: "items",
		type: "array",
		schemaType: ["object", "boolean"],
		before: "uniqueItems",
		error: {
			message: ({ params: { len: e } }) => (0, t.str)`must NOT have more than ${e} items`,
			params: ({ params: { len: e } }) => (0, t._)`{limit: ${e}}`
		},
		code(e) {
			let { schema: t, parentSchema: a, it: o } = e, { prefixItems: s } = a;
			o.items = !0, !(0, n.alwaysValidSchema)(o, t) && (s ? (0, i.validateAdditionalItems)(e, s) : e.ok((0, r.validateArray)(e)));
		}
	};
})), Bn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = U(), n = W();
	e.default = {
		keyword: "contains",
		type: "array",
		schemaType: ["object", "boolean"],
		before: "uniqueItems",
		trackErrors: !0,
		error: {
			message: ({ params: { min: e, max: n } }) => n === void 0 ? (0, t.str)`must contain at least ${e} valid item(s)` : (0, t.str)`must contain at least ${e} and no more than ${n} valid item(s)`,
			params: ({ params: { min: e, max: n } }) => n === void 0 ? (0, t._)`{minContains: ${e}}` : (0, t._)`{minContains: ${e}, maxContains: ${n}}`
		},
		code(e) {
			let { gen: r, schema: i, parentSchema: a, data: o, it: s } = e, c, l, { minContains: u, maxContains: d } = a;
			s.opts.next ? (c = u === void 0 ? 1 : u, l = d) : c = 1;
			let f = r.const("len", (0, t._)`${o}.length`);
			if (e.setParams({
				min: c,
				max: l
			}), l === void 0 && c === 0) {
				(0, n.checkStrictMode)(s, "\"minContains\" == 0 without \"maxContains\": \"contains\" keyword ignored");
				return;
			}
			if (l !== void 0 && c > l) {
				(0, n.checkStrictMode)(s, "\"minContains\" > \"maxContains\" is always invalid"), e.fail();
				return;
			}
			if ((0, n.alwaysValidSchema)(s, i)) {
				let n = (0, t._)`${f} >= ${c}`;
				l !== void 0 && (n = (0, t._)`${n} && ${f} <= ${l}`), e.pass(n);
				return;
			}
			s.items = !0;
			let p = r.name("valid");
			l === void 0 && c === 1 ? h(p, () => r.if(p, () => r.break())) : c === 0 ? (r.let(p, !0), l !== void 0 && r.if((0, t._)`${o}.length > 0`, m)) : (r.let(p, !1), m()), e.result(p, () => e.reset());
			function m() {
				let e = r.name("_valid"), t = r.let("count", 0);
				h(e, () => r.if(e, () => g(t)));
			}
			function h(t, i) {
				r.forRange("i", 0, f, (r) => {
					e.subschema({
						keyword: "contains",
						dataProp: r,
						dataPropType: n.Type.Num,
						compositeRule: !0
					}, t), i();
				});
			}
			function g(e) {
				r.code((0, t._)`${e}++`), l === void 0 ? r.if((0, t._)`${e} >= ${c}`, () => r.assign(p, !0).break()) : (r.if((0, t._)`${e} > ${l}`, () => r.assign(p, !1).break()), c === 1 ? r.assign(p, !0) : r.if((0, t._)`${e} >= ${c}`, () => r.assign(p, !0)));
			}
		}
	};
})), Vn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.validateSchemaDeps = e.validatePropertyDeps = e.error = void 0;
	var t = U(), n = W(), r = Xt();
	e.error = {
		message: ({ params: { property: e, depsCount: n, deps: r } }) => {
			let i = n === 1 ? "property" : "properties";
			return (0, t.str)`must have ${i} ${r} when property ${e} is present`;
		},
		params: ({ params: { property: e, depsCount: n, deps: r, missingProperty: i } }) => (0, t._)`{property: ${e},
    missingProperty: ${i},
    depsCount: ${n},
    deps: ${r}}`
	};
	var i = {
		keyword: "dependencies",
		type: "object",
		schemaType: "object",
		error: e.error,
		code(e) {
			let [t, n] = a(e);
			o(e, t), s(e, n);
		}
	};
	function a({ schema: e }) {
		let t = {}, n = {};
		for (let r in e) {
			if (r === "__proto__") continue;
			let i = Array.isArray(e[r]) ? t : n;
			i[r] = e[r];
		}
		return [t, n];
	}
	function o(e, n = e.schema) {
		let { gen: i, data: a, it: o } = e;
		if (Object.keys(n).length === 0) return;
		let s = i.let("missing");
		for (let c in n) {
			let l = n[c];
			if (l.length === 0) continue;
			let u = (0, r.propertyInData)(i, a, c, o.opts.ownProperties);
			e.setParams({
				property: c,
				depsCount: l.length,
				deps: l.join(", ")
			}), o.allErrors ? i.if(u, () => {
				for (let t of l) (0, r.checkReportMissingProp)(e, t);
			}) : (i.if((0, t._)`${u} && (${(0, r.checkMissingProp)(e, l, s)})`), (0, r.reportMissingProp)(e, s), i.else());
		}
	}
	e.validatePropertyDeps = o;
	function s(e, t = e.schema) {
		let { gen: i, data: a, keyword: o, it: s } = e, c = i.name("valid");
		for (let l in t) (0, n.alwaysValidSchema)(s, t[l]) || (i.if((0, r.propertyInData)(i, a, l, s.opts.ownProperties), () => {
			let t = e.subschema({
				keyword: o,
				schemaProp: l
			}, c);
			e.mergeValidEvaluated(t, c);
		}, () => i.var(c, !0)), e.ok(c));
	}
	e.validateSchemaDeps = s, e.default = i;
})), Hn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = U(), n = W();
	e.default = {
		keyword: "propertyNames",
		type: "object",
		schemaType: ["object", "boolean"],
		error: {
			message: "property name must be valid",
			params: ({ params: e }) => (0, t._)`{propertyName: ${e.propertyName}}`
		},
		code(e) {
			let { gen: r, schema: i, data: a, it: o } = e;
			if ((0, n.alwaysValidSchema)(o, i)) return;
			let s = r.name("valid");
			r.forIn("key", a, (n) => {
				e.setParams({ propertyName: n }), e.subschema({
					keyword: "propertyNames",
					data: n,
					dataTypes: ["string"],
					propertyName: n,
					compositeRule: !0
				}, s), r.if((0, t.not)(s), () => {
					e.error(!0), o.allErrors || r.break();
				});
			}), e.ok(s);
		}
	};
})), Un = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = Xt(), n = U(), r = Ut(), i = W();
	e.default = {
		keyword: "additionalProperties",
		type: ["object"],
		schemaType: ["boolean", "object"],
		allowUndefined: !0,
		trackErrors: !0,
		error: {
			message: "must NOT have additional properties",
			params: ({ params: e }) => (0, n._)`{additionalProperty: ${e.additionalProperty}}`
		},
		code(e) {
			let { gen: a, schema: o, parentSchema: s, data: c, errsCount: l, it: u } = e;
			/* istanbul ignore if */
			if (!l) throw Error("ajv implementation error");
			let { allErrors: d, opts: f } = u;
			if (u.props = !0, f.removeAdditional !== "all" && (0, i.alwaysValidSchema)(u, o)) return;
			let p = (0, t.allSchemaProperties)(s.properties), m = (0, t.allSchemaProperties)(s.patternProperties);
			h(), e.ok((0, n._)`${l} === ${r.default.errors}`);
			function h() {
				a.forIn("key", c, (e) => {
					!p.length && !m.length ? v(e) : a.if(g(e), () => v(e));
				});
			}
			function g(r) {
				let o;
				if (p.length > 8) {
					let e = (0, i.schemaRefOrVal)(u, s.properties, "properties");
					o = (0, t.isOwnProperty)(a, e, r);
				} else o = p.length ? (0, n.or)(...p.map((e) => (0, n._)`${r} === ${e}`)) : n.nil;
				return m.length && (o = (0, n.or)(o, ...m.map((i) => (0, n._)`${(0, t.usePattern)(e, i)}.test(${r})`))), (0, n.not)(o);
			}
			function _(e) {
				a.code((0, n._)`delete ${c}[${e}]`);
			}
			function v(t) {
				if (f.removeAdditional === "all" || f.removeAdditional && o === !1) {
					_(t);
					return;
				}
				if (o === !1) {
					e.setParams({ additionalProperty: t }), e.error(), d || a.break();
					return;
				}
				if (typeof o == "object" && !(0, i.alwaysValidSchema)(u, o)) {
					let r = a.name("valid");
					f.removeAdditional === "failing" ? (y(t, r, !1), a.if((0, n.not)(r), () => {
						e.reset(), _(t);
					})) : (y(t, r), d || a.if((0, n.not)(r), () => a.break()));
				}
			}
			function y(t, n, r) {
				let a = {
					keyword: "additionalProperties",
					dataProp: t,
					dataPropType: i.Type.Str
				};
				r === !1 && Object.assign(a, {
					compositeRule: !0,
					createErrors: !1,
					allErrors: !1
				}), e.subschema(a, n);
			}
		}
	};
})), Wn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = nn(), n = Xt(), r = W(), i = Un();
	e.default = {
		keyword: "properties",
		type: "object",
		schemaType: "object",
		code(e) {
			let { gen: a, schema: o, parentSchema: s, data: c, it: l } = e;
			l.opts.removeAdditional === "all" && s.additionalProperties === void 0 && i.default.code(new t.KeywordCxt(l, i.default, "additionalProperties"));
			let u = (0, n.allSchemaProperties)(o);
			for (let e of u) l.definedProperties.add(e);
			l.opts.unevaluated && u.length && l.props !== !0 && (l.props = r.mergeEvaluated.props(a, (0, r.toHash)(u), l.props));
			let d = u.filter((e) => !(0, r.alwaysValidSchema)(l, o[e]));
			if (d.length === 0) return;
			let f = a.name("valid");
			for (let t of d) p(t) ? m(t) : (a.if((0, n.propertyInData)(a, c, t, l.opts.ownProperties)), m(t), l.allErrors || a.else().var(f, !0), a.endIf()), e.it.definedProperties.add(t), e.ok(f);
			function p(e) {
				return l.opts.useDefaults && !l.compositeRule && o[e].default !== void 0;
			}
			function m(t) {
				e.subschema({
					keyword: "properties",
					schemaProp: t,
					dataProp: t
				}, f);
			}
		}
	};
})), Gn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = Xt(), n = U(), r = W(), i = W();
	e.default = {
		keyword: "patternProperties",
		type: "object",
		schemaType: "object",
		code(e) {
			let { gen: a, schema: o, data: s, parentSchema: c, it: l } = e, { opts: u } = l, d = (0, t.allSchemaProperties)(o), f = d.filter((e) => (0, r.alwaysValidSchema)(l, o[e]));
			if (d.length === 0 || f.length === d.length && (!l.opts.unevaluated || l.props === !0)) return;
			let p = u.strictSchema && !u.allowMatchingProperties && c.properties, m = a.name("valid");
			l.props !== !0 && !(l.props instanceof n.Name) && (l.props = (0, i.evaluatedPropsToName)(a, l.props));
			let { props: h } = l;
			g();
			function g() {
				for (let e of d) p && _(e), l.allErrors ? v(e) : (a.var(m, !0), v(e), a.if(m));
			}
			function _(e) {
				for (let t in p) new RegExp(e).test(t) && (0, r.checkStrictMode)(l, `property ${t} matches pattern ${e} (use allowMatchingProperties)`);
			}
			function v(r) {
				a.forIn("key", s, (o) => {
					a.if((0, n._)`${(0, t.usePattern)(e, r)}.test(${o})`, () => {
						let t = f.includes(r);
						t || e.subschema({
							keyword: "patternProperties",
							schemaProp: r,
							dataProp: o,
							dataPropType: i.Type.Str
						}, m), l.opts.unevaluated && h !== !0 ? a.assign((0, n._)`${h}[${o}]`, !0) : !t && !l.allErrors && a.if((0, n.not)(m), () => a.break());
					});
				});
			}
		}
	};
})), Kn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = W();
	e.default = {
		keyword: "not",
		schemaType: ["object", "boolean"],
		trackErrors: !0,
		code(e) {
			let { gen: n, schema: r, it: i } = e;
			if ((0, t.alwaysValidSchema)(i, r)) {
				e.fail();
				return;
			}
			let a = n.name("valid");
			e.subschema({
				keyword: "not",
				compositeRule: !0,
				createErrors: !1,
				allErrors: !1
			}, a), e.failResult(a, () => e.reset(), () => e.error());
		},
		error: { message: "must NOT be valid" }
	};
})), qn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = {
		keyword: "anyOf",
		schemaType: "array",
		trackErrors: !0,
		code: Xt().validateUnion,
		error: { message: "must match a schema in anyOf" }
	};
})), Jn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = U(), n = W();
	e.default = {
		keyword: "oneOf",
		schemaType: "array",
		trackErrors: !0,
		error: {
			message: "must match exactly one schema in oneOf",
			params: ({ params: e }) => (0, t._)`{passingSchemas: ${e.passing}}`
		},
		code(e) {
			let { gen: r, schema: i, parentSchema: a, it: o } = e;
			/* istanbul ignore if */
			if (!Array.isArray(i)) throw Error("ajv implementation error");
			if (o.opts.discriminator && a.discriminator) return;
			let s = i, c = r.let("valid", !1), l = r.let("passing", null), u = r.name("_valid");
			e.setParams({ passing: l }), r.block(d), e.result(c, () => e.reset(), () => e.error(!0));
			function d() {
				s.forEach((i, a) => {
					let s;
					(0, n.alwaysValidSchema)(o, i) ? r.var(u, !0) : s = e.subschema({
						keyword: "oneOf",
						schemaProp: a,
						compositeRule: !0
					}, u), a > 0 && r.if((0, t._)`${u} && ${c}`).assign(c, !1).assign(l, (0, t._)`[${l}, ${a}]`).else(), r.if(u, () => {
						r.assign(c, !0), r.assign(l, a), s && e.mergeEvaluated(s, t.Name);
					});
				});
			}
		}
	};
})), Yn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = W();
	e.default = {
		keyword: "allOf",
		schemaType: "array",
		code(e) {
			let { gen: n, schema: r, it: i } = e;
			/* istanbul ignore if */
			if (!Array.isArray(r)) throw Error("ajv implementation error");
			let a = n.name("valid");
			r.forEach((n, r) => {
				if ((0, t.alwaysValidSchema)(i, n)) return;
				let o = e.subschema({
					keyword: "allOf",
					schemaProp: r
				}, a);
				e.ok(a), e.mergeEvaluated(o);
			});
		}
	};
})), Xn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = U(), n = W(), r = {
		keyword: "if",
		schemaType: ["object", "boolean"],
		trackErrors: !0,
		error: {
			message: ({ params: e }) => (0, t.str)`must match "${e.ifClause}" schema`,
			params: ({ params: e }) => (0, t._)`{failingKeyword: ${e.ifClause}}`
		},
		code(e) {
			let { gen: r, parentSchema: a, it: o } = e;
			a.then === void 0 && a.else === void 0 && (0, n.checkStrictMode)(o, "\"if\" without \"then\" and \"else\" is ignored");
			let s = i(o, "then"), c = i(o, "else");
			if (!s && !c) return;
			let l = r.let("valid", !0), u = r.name("_valid");
			if (d(), e.reset(), s && c) {
				let t = r.let("ifClause");
				e.setParams({ ifClause: t }), r.if(u, f("then", t), f("else", t));
			} else s ? r.if(u, f("then")) : r.if((0, t.not)(u), f("else"));
			e.pass(l, () => e.error(!0));
			function d() {
				let t = e.subschema({
					keyword: "if",
					compositeRule: !0,
					createErrors: !1,
					allErrors: !1
				}, u);
				e.mergeEvaluated(t);
			}
			function f(n, i) {
				return () => {
					let a = e.subschema({ keyword: n }, u);
					r.assign(l, u), e.mergeValidEvaluated(a, l), i ? r.assign(i, (0, t._)`${n}`) : e.setParams({ ifClause: n });
				};
			}
		}
	};
	function i(e, t) {
		let r = e.schema[t];
		return r !== void 0 && !(0, n.alwaysValidSchema)(e, r);
	}
	e.default = r;
})), Zn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = W();
	e.default = {
		keyword: ["then", "else"],
		schemaType: ["object", "boolean"],
		code({ keyword: e, parentSchema: n, it: r }) {
			n.if === void 0 && (0, t.checkStrictMode)(r, `"${e}" without "if" is ignored`);
		}
	};
})), Qn = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = In(), n = Rn(), r = Ln(), i = zn(), a = Bn(), o = Vn(), s = Hn(), c = Un(), l = Wn(), u = Gn(), d = Kn(), f = qn(), p = Jn(), m = Yn(), h = Xn(), g = Zn();
	function _(e = !1) {
		let _ = [
			d.default,
			f.default,
			p.default,
			m.default,
			h.default,
			g.default,
			s.default,
			c.default,
			o.default,
			l.default,
			u.default
		];
		return e ? _.push(n.default, i.default) : _.push(t.default, r.default), _.push(a.default), _;
	}
	e.default = _;
})), $n = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.dynamicAnchor = void 0;
	var t = U(), n = Ut(), r = on(), i = xn(), a = {
		keyword: "$dynamicAnchor",
		schemaType: "string",
		code: (e) => o(e, e.schema)
	};
	function o(e, r) {
		let { gen: i, it: a } = e;
		a.schemaEnv.root.dynamicAnchors[r] = !0;
		let o = (0, t._)`${n.default.dynamicAnchors}${(0, t.getProperty)(r)}`, c = a.errSchemaPath === "#" ? a.validateName : s(e);
		i.if((0, t._)`!${o}`, () => i.assign(o, c));
	}
	e.dynamicAnchor = o;
	function s(e) {
		let { schemaEnv: t, schema: n, self: a } = e.it, { root: o, baseId: s, localRefs: c, meta: l } = t.root, { schemaId: u } = a.opts, d = new r.SchemaEnv({
			schema: n,
			schemaId: u,
			root: o,
			baseId: s,
			localRefs: c,
			meta: l
		});
		return r.compileSchema.call(a, d), (0, i.getValidate)(e, d);
	}
	e.default = a;
})), er = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.dynamicRef = void 0;
	var t = U(), n = Ut(), r = xn(), i = {
		keyword: "$dynamicRef",
		schemaType: "string",
		code: (e) => a(e, e.schema)
	};
	function a(e, i) {
		let { gen: a, keyword: o, it: s } = e;
		if (i[0] !== "#") throw Error(`"${o}" only supports hash fragment reference`);
		let c = i.slice(1);
		if (s.allErrors) l();
		else {
			let t = a.let("valid", !1);
			l(t), e.ok(t);
		}
		function l(e) {
			if (s.schemaEnv.root.dynamicAnchors[c]) {
				let r = a.let("_v", (0, t._)`${n.default.dynamicAnchors}${(0, t.getProperty)(c)}`);
				a.if(r, u(r, e), u(s.validateName, e));
			} else u(s.validateName, e)();
		}
		function u(t, n) {
			return n ? () => a.block(() => {
				(0, r.callRef)(e, t), a.let(n, !0);
			}) : () => (0, r.callRef)(e, t);
		}
	}
	e.dynamicRef = a, e.default = i;
})), tr = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = $n(), n = W();
	e.default = {
		keyword: "$recursiveAnchor",
		schemaType: "boolean",
		code(e) {
			e.schema ? (0, t.dynamicAnchor)(e, "") : (0, n.checkStrictMode)(e.it, "$recursiveAnchor: false is ignored");
		}
	};
})), nr = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = er();
	e.default = {
		keyword: "$recursiveRef",
		schemaType: "string",
		code: (e) => (0, t.dynamicRef)(e, e.schema)
	};
})), rr = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = $n(), n = er(), r = tr(), i = nr();
	e.default = [
		t.default,
		n.default,
		r.default,
		i.default
	];
})), ir = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = Vn();
	e.default = {
		keyword: "dependentRequired",
		type: "object",
		schemaType: "object",
		error: t.error,
		code: (e) => (0, t.validatePropertyDeps)(e)
	};
})), ar = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = Vn();
	e.default = {
		keyword: "dependentSchemas",
		type: "object",
		schemaType: "object",
		code: (e) => (0, t.validateSchemaDeps)(e)
	};
})), or = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = W();
	e.default = {
		keyword: ["maxContains", "minContains"],
		type: "array",
		schemaType: "number",
		code({ keyword: e, parentSchema: n, it: r }) {
			n.contains === void 0 && (0, t.checkStrictMode)(r, `"${e}" without "contains" is ignored`);
		}
	};
})), sr = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = ir(), n = ar(), r = or();
	e.default = [
		t.default,
		n.default,
		r.default
	];
})), cr = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = U(), n = W(), r = Ut();
	e.default = {
		keyword: "unevaluatedProperties",
		type: "object",
		schemaType: ["boolean", "object"],
		trackErrors: !0,
		error: {
			message: "must NOT have unevaluated properties",
			params: ({ params: e }) => (0, t._)`{unevaluatedProperty: ${e.unevaluatedProperty}}`
		},
		code(e) {
			let { gen: i, schema: a, data: o, errsCount: s, it: c } = e;
			/* istanbul ignore if */
			if (!s) throw Error("ajv implementation error");
			let { allErrors: l, props: u } = c;
			u instanceof t.Name ? i.if((0, t._)`${u} !== true`, () => i.forIn("key", o, (e) => i.if(f(u, e), () => d(e)))) : u !== !0 && i.forIn("key", o, (e) => u === void 0 ? d(e) : i.if(p(u, e), () => d(e))), c.props = !0, e.ok((0, t._)`${s} === ${r.default.errors}`);
			function d(r) {
				if (a === !1) {
					e.setParams({ unevaluatedProperty: r }), e.error(), l || i.break();
					return;
				}
				if (!(0, n.alwaysValidSchema)(c, a)) {
					let a = i.name("valid");
					e.subschema({
						keyword: "unevaluatedProperties",
						dataProp: r,
						dataPropType: n.Type.Str
					}, a), l || i.if((0, t.not)(a), () => i.break());
				}
			}
			function f(e, n) {
				return (0, t._)`!${e} || !${e}[${n}]`;
			}
			function p(e, n) {
				let r = [];
				for (let i in e) e[i] === !0 && r.push((0, t._)`${n} !== ${i}`);
				return (0, t.and)(...r);
			}
		}
	};
})), lr = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = U(), n = W();
	e.default = {
		keyword: "unevaluatedItems",
		type: "array",
		schemaType: ["boolean", "object"],
		error: {
			message: ({ params: { len: e } }) => (0, t.str)`must NOT have more than ${e} items`,
			params: ({ params: { len: e } }) => (0, t._)`{limit: ${e}}`
		},
		code(e) {
			let { gen: r, schema: i, data: a, it: o } = e, s = o.items || 0;
			if (s === !0) return;
			let c = r.const("len", (0, t._)`${a}.length`);
			if (i === !1) e.setParams({ len: s }), e.fail((0, t._)`${c} > ${s}`);
			else if (typeof i == "object" && !(0, n.alwaysValidSchema)(o, i)) {
				let n = r.var("valid", (0, t._)`${c} <= ${s}`);
				r.if((0, t.not)(n), () => l(n, s)), e.ok(n);
			}
			o.items = !0;
			function l(i, a) {
				r.forRange("i", a, c, (a) => {
					e.subschema({
						keyword: "unevaluatedItems",
						dataProp: a,
						dataPropType: n.Type.Num
					}, i), o.allErrors || r.if((0, t.not)(i), () => r.break());
				});
			}
		}
	};
})), ur = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = cr(), n = lr();
	e.default = [t.default, n.default];
})), dr = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = U();
	e.default = {
		keyword: "format",
		type: ["number", "string"],
		schemaType: "string",
		$data: !0,
		error: {
			message: ({ schemaCode: e }) => (0, t.str)`must match format "${e}"`,
			params: ({ schemaCode: e }) => (0, t._)`{format: ${e}}`
		},
		code(e, n) {
			let { gen: r, data: i, $data: a, schema: o, schemaCode: s, it: c } = e, { opts: l, errSchemaPath: u, schemaEnv: d, self: f } = c;
			if (!l.validateFormats) return;
			a ? p() : m();
			function p() {
				let a = r.scopeValue("formats", {
					ref: f.formats,
					code: l.code.formats
				}), o = r.const("fDef", (0, t._)`${a}[${s}]`), c = r.let("fType"), u = r.let("format");
				r.if((0, t._)`typeof ${o} == "object" && !(${o} instanceof RegExp)`, () => r.assign(c, (0, t._)`${o}.type || "string"`).assign(u, (0, t._)`${o}.validate`), () => r.assign(c, (0, t._)`"string"`).assign(u, o)), e.fail$data((0, t.or)(p(), m()));
				function p() {
					return l.strictSchema === !1 ? t.nil : (0, t._)`${s} && !${u}`;
				}
				function m() {
					let e = d.$async ? (0, t._)`(${o}.async ? await ${u}(${i}) : ${u}(${i}))` : (0, t._)`${u}(${i})`, r = (0, t._)`(typeof ${u} == "function" ? ${e} : ${u}.test(${i}))`;
					return (0, t._)`${u} && ${u} !== true && ${c} === ${n} && !${r}`;
				}
			}
			function m() {
				let a = f.formats[o];
				if (!a) {
					m();
					return;
				}
				if (a === !0) return;
				let [s, c, p] = h(a);
				s === n && e.pass(g());
				function m() {
					if (l.strictSchema === !1) {
						f.logger.warn(e());
						return;
					}
					throw Error(e());
					function e() {
						return `unknown format "${o}" ignored in schema at path "${u}"`;
					}
				}
				function h(e) {
					let n = e instanceof RegExp ? (0, t.regexpCode)(e) : l.code.formats ? (0, t._)`${l.code.formats}${(0, t.getProperty)(o)}` : void 0, i = r.scopeValue("formats", {
						key: o,
						ref: e,
						code: n
					});
					return typeof e == "object" && !(e instanceof RegExp) ? [
						e.type || "string",
						e.validate,
						(0, t._)`${i}.validate`
					] : [
						"string",
						e,
						i
					];
				}
				function g() {
					if (typeof a == "object" && !(a instanceof RegExp) && a.async) {
						if (!d.$async) throw Error("async format in sync schema");
						return (0, t._)`await ${p}(${i})`;
					}
					return typeof c == "function" ? (0, t._)`${p}(${i})` : (0, t._)`${p}.test(${i})`;
				}
			}
		}
	};
})), fr = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = [dr().default];
})), pr = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.contentVocabulary = e.metadataVocabulary = void 0, e.metadataVocabulary = [
		"title",
		"description",
		"default",
		"deprecated",
		"readOnly",
		"writeOnly",
		"examples"
	], e.contentVocabulary = [
		"contentMediaType",
		"contentEncoding",
		"contentSchema"
	];
})), mr = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = Sn(), n = Fn(), r = Qn(), i = rr(), a = sr(), o = ur(), s = fr(), c = pr();
	e.default = [
		i.default,
		t.default,
		n.default,
		(0, r.default)(!0),
		s.default,
		c.metadataVocabulary,
		c.contentVocabulary,
		a.default,
		o.default
	];
})), hr = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.DiscrError = void 0;
	var t;
	(function(e) {
		e.Tag = "tag", e.Mapping = "mapping";
	})(t || (e.DiscrError = t = {}));
})), gr = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = U(), n = hr(), r = on(), i = an(), a = W();
	e.default = {
		keyword: "discriminator",
		type: "object",
		schemaType: "object",
		error: {
			message: ({ params: { discrError: e, tagName: t } }) => e === n.DiscrError.Tag ? `tag "${t}" must be string` : `value of tag "${t}" must be in oneOf`,
			params: ({ params: { discrError: e, tag: n, tagName: r } }) => (0, t._)`{error: ${e}, tag: ${r}, tagValue: ${n}}`
		},
		code(e) {
			let { gen: o, data: s, schema: c, parentSchema: l, it: u } = e, { oneOf: d } = l;
			if (!u.opts.discriminator) throw Error("discriminator: requires discriminator option");
			let f = c.propertyName;
			if (typeof f != "string") throw Error("discriminator: requires propertyName");
			if (c.mapping) throw Error("discriminator: mapping is not supported");
			if (!d) throw Error("discriminator: requires oneOf keyword");
			let p = o.let("valid", !1), m = o.const("tag", (0, t._)`${s}${(0, t.getProperty)(f)}`);
			o.if((0, t._)`typeof ${m} == "string"`, () => h(), () => e.error(!1, {
				discrError: n.DiscrError.Tag,
				tag: m,
				tagName: f
			})), e.ok(p);
			function h() {
				let r = _();
				o.if(!1);
				for (let e in r) o.elseIf((0, t._)`${m} === ${e}`), o.assign(p, g(r[e]));
				o.else(), e.error(!1, {
					discrError: n.DiscrError.Mapping,
					tag: m,
					tagName: f
				}), o.endIf();
			}
			function g(n) {
				let r = o.name("valid"), i = e.subschema({
					keyword: "oneOf",
					schemaProp: n
				}, r);
				return e.mergeEvaluated(i, t.Name), r;
			}
			function _() {
				let e = {}, t = o(l), n = !0;
				for (let e = 0; e < d.length; e++) {
					let c = d[e];
					if (c?.$ref && !(0, a.schemaHasRulesButRef)(c, u.self.RULES)) {
						let e = c.$ref;
						if (c = r.resolveRef.call(u.self, u.schemaEnv.root, u.baseId, e), c instanceof r.SchemaEnv && (c = c.schema), c === void 0) throw new i.default(u.opts.uriResolver, u.baseId, e);
					}
					let l = c?.properties?.[f];
					if (typeof l != "object") throw Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${f}"`);
					n &&= t || o(c), s(l, e);
				}
				if (!n) throw Error(`discriminator: "${f}" must be required`);
				return e;
				function o({ required: e }) {
					return Array.isArray(e) && e.includes(f);
				}
				function s(e, t) {
					if (e.const) c(e.const, t);
					else if (e.enum) for (let n of e.enum) c(n, t);
					else throw Error(`discriminator: "properties/${f}" must have "const" or "enum"`);
				}
				function c(t, n) {
					if (typeof t != "string" || t in e) throw Error(`discriminator: "${f}" values must be unique strings`);
					e[t] = n;
				}
			}
		}
	};
})), _r = /* @__PURE__ */ Je({
	$comment: () => Tr,
	$dynamicAnchor: () => xr,
	$id: () => yr,
	$schema: () => vr,
	$vocabulary: () => br,
	allOf: () => Cr,
	default: () => Dr,
	properties: () => Er,
	title: () => Sr,
	type: () => wr
}), vr, yr, br, xr, Sr, Cr, wr, Tr, Er, Dr, Or = qe((() => {
	vr = "https://json-schema.org/draft/2020-12/schema", yr = "https://json-schema.org/draft/2020-12/schema", br = {
		"https://json-schema.org/draft/2020-12/vocab/core": !0,
		"https://json-schema.org/draft/2020-12/vocab/applicator": !0,
		"https://json-schema.org/draft/2020-12/vocab/unevaluated": !0,
		"https://json-schema.org/draft/2020-12/vocab/validation": !0,
		"https://json-schema.org/draft/2020-12/vocab/meta-data": !0,
		"https://json-schema.org/draft/2020-12/vocab/format-annotation": !0,
		"https://json-schema.org/draft/2020-12/vocab/content": !0
	}, xr = "meta", Sr = "Core and Validation specifications meta-schema", Cr = [
		{ $ref: "meta/core" },
		{ $ref: "meta/applicator" },
		{ $ref: "meta/unevaluated" },
		{ $ref: "meta/validation" },
		{ $ref: "meta/meta-data" },
		{ $ref: "meta/format-annotation" },
		{ $ref: "meta/content" }
	], wr = ["object", "boolean"], Tr = "This meta-schema also defines keywords that have appeared in previous drafts in order to prevent incompatible extensions as they remain in common use.", Er = {
		definitions: {
			$comment: "\"definitions\" has been replaced by \"$defs\".",
			type: "object",
			additionalProperties: { $dynamicRef: "#meta" },
			deprecated: !0,
			default: {}
		},
		dependencies: {
			$comment: "\"dependencies\" has been split and replaced by \"dependentSchemas\" and \"dependentRequired\" in order to serve their differing semantics.",
			type: "object",
			additionalProperties: { anyOf: [{ $dynamicRef: "#meta" }, { $ref: "meta/validation#/$defs/stringArray" }] },
			deprecated: !0,
			default: {}
		},
		$recursiveAnchor: {
			$comment: "\"$recursiveAnchor\" has been replaced by \"$dynamicAnchor\".",
			$ref: "meta/core#/$defs/anchorString",
			deprecated: !0
		},
		$recursiveRef: {
			$comment: "\"$recursiveRef\" has been replaced by \"$dynamicRef\".",
			$ref: "meta/core#/$defs/uriReferenceString",
			deprecated: !0
		}
	}, Dr = {
		$schema: vr,
		$id: yr,
		$vocabulary: br,
		$dynamicAnchor: xr,
		title: Sr,
		allOf: Cr,
		type: wr,
		$comment: Tr,
		properties: Er
	};
})), kr = /* @__PURE__ */ Je({
	$defs: () => Lr,
	$dynamicAnchor: () => Nr,
	$id: () => jr,
	$schema: () => Ar,
	$vocabulary: () => Mr,
	default: () => Rr,
	properties: () => Ir,
	title: () => Pr,
	type: () => Fr
}), Ar, jr, Mr, Nr, Pr, Fr, Ir, Lr, Rr, zr = qe((() => {
	Ar = "https://json-schema.org/draft/2020-12/schema", jr = "https://json-schema.org/draft/2020-12/meta/applicator", Mr = { "https://json-schema.org/draft/2020-12/vocab/applicator": !0 }, Nr = "meta", Pr = "Applicator vocabulary meta-schema", Fr = ["object", "boolean"], Ir = {
		prefixItems: { $ref: "#/$defs/schemaArray" },
		items: { $dynamicRef: "#meta" },
		contains: { $dynamicRef: "#meta" },
		additionalProperties: { $dynamicRef: "#meta" },
		properties: {
			type: "object",
			additionalProperties: { $dynamicRef: "#meta" },
			default: {}
		},
		patternProperties: {
			type: "object",
			additionalProperties: { $dynamicRef: "#meta" },
			propertyNames: { format: "regex" },
			default: {}
		},
		dependentSchemas: {
			type: "object",
			additionalProperties: { $dynamicRef: "#meta" },
			default: {}
		},
		propertyNames: { $dynamicRef: "#meta" },
		if: { $dynamicRef: "#meta" },
		then: { $dynamicRef: "#meta" },
		else: { $dynamicRef: "#meta" },
		allOf: { $ref: "#/$defs/schemaArray" },
		anyOf: { $ref: "#/$defs/schemaArray" },
		oneOf: { $ref: "#/$defs/schemaArray" },
		not: { $dynamicRef: "#meta" }
	}, Lr = { schemaArray: {
		type: "array",
		minItems: 1,
		items: { $dynamicRef: "#meta" }
	} }, Rr = {
		$schema: Ar,
		$id: jr,
		$vocabulary: Mr,
		$dynamicAnchor: Nr,
		title: Pr,
		type: Fr,
		properties: Ir,
		$defs: Lr
	};
})), Br = /* @__PURE__ */ Je({
	$dynamicAnchor: () => Wr,
	$id: () => Hr,
	$schema: () => Vr,
	$vocabulary: () => Ur,
	default: () => Jr,
	properties: () => qr,
	title: () => Gr,
	type: () => Kr
}), Vr, Hr, Ur, Wr, Gr, Kr, qr, Jr, Yr = qe((() => {
	Vr = "https://json-schema.org/draft/2020-12/schema", Hr = "https://json-schema.org/draft/2020-12/meta/unevaluated", Ur = { "https://json-schema.org/draft/2020-12/vocab/unevaluated": !0 }, Wr = "meta", Gr = "Unevaluated applicator vocabulary meta-schema", Kr = ["object", "boolean"], qr = {
		unevaluatedItems: { $dynamicRef: "#meta" },
		unevaluatedProperties: { $dynamicRef: "#meta" }
	}, Jr = {
		$schema: Vr,
		$id: Hr,
		$vocabulary: Ur,
		$dynamicAnchor: Wr,
		title: Gr,
		type: Kr,
		properties: qr
	};
})), Xr = /* @__PURE__ */ Je({
	$dynamicAnchor: () => ei,
	$id: () => Qr,
	$schema: () => Zr,
	$vocabulary: () => $r,
	default: () => ii,
	properties: () => ri,
	title: () => ti,
	type: () => ni
}), Zr, Qr, $r, ei, ti, ni, ri, ii, ai = qe((() => {
	Zr = "https://json-schema.org/draft/2020-12/schema", Qr = "https://json-schema.org/draft/2020-12/meta/content", $r = { "https://json-schema.org/draft/2020-12/vocab/content": !0 }, ei = "meta", ti = "Content vocabulary meta-schema", ni = ["object", "boolean"], ri = {
		contentEncoding: { type: "string" },
		contentMediaType: { type: "string" },
		contentSchema: { $dynamicRef: "#meta" }
	}, ii = {
		$schema: Zr,
		$id: Qr,
		$vocabulary: $r,
		$dynamicAnchor: ei,
		title: ti,
		type: ni,
		properties: ri
	};
})), oi = /* @__PURE__ */ Je({
	$defs: () => mi,
	$dynamicAnchor: () => ui,
	$id: () => ci,
	$schema: () => si,
	$vocabulary: () => li,
	default: () => hi,
	properties: () => pi,
	title: () => di,
	type: () => fi
}), si, ci, li, ui, di, fi, pi, mi, hi, gi = qe((() => {
	si = "https://json-schema.org/draft/2020-12/schema", ci = "https://json-schema.org/draft/2020-12/meta/core", li = { "https://json-schema.org/draft/2020-12/vocab/core": !0 }, ui = "meta", di = "Core vocabulary meta-schema", fi = ["object", "boolean"], pi = {
		$id: {
			$ref: "#/$defs/uriReferenceString",
			$comment: "Non-empty fragments not allowed.",
			pattern: "^[^#]*#?$"
		},
		$schema: { $ref: "#/$defs/uriString" },
		$ref: { $ref: "#/$defs/uriReferenceString" },
		$anchor: { $ref: "#/$defs/anchorString" },
		$dynamicRef: { $ref: "#/$defs/uriReferenceString" },
		$dynamicAnchor: { $ref: "#/$defs/anchorString" },
		$vocabulary: {
			type: "object",
			propertyNames: { $ref: "#/$defs/uriString" },
			additionalProperties: { type: "boolean" }
		},
		$comment: { type: "string" },
		$defs: {
			type: "object",
			additionalProperties: { $dynamicRef: "#meta" }
		}
	}, mi = {
		anchorString: {
			type: "string",
			pattern: "^[A-Za-z_][-A-Za-z0-9._]*$"
		},
		uriString: {
			type: "string",
			format: "uri"
		},
		uriReferenceString: {
			type: "string",
			format: "uri-reference"
		}
	}, hi = {
		$schema: si,
		$id: ci,
		$vocabulary: li,
		$dynamicAnchor: ui,
		title: di,
		type: fi,
		properties: pi,
		$defs: mi
	};
})), _i = /* @__PURE__ */ Je({
	$dynamicAnchor: () => xi,
	$id: () => yi,
	$schema: () => vi,
	$vocabulary: () => bi,
	default: () => Ti,
	properties: () => wi,
	title: () => Si,
	type: () => Ci
}), vi, yi, bi, xi, Si, Ci, wi, Ti, Ei = qe((() => {
	vi = "https://json-schema.org/draft/2020-12/schema", yi = "https://json-schema.org/draft/2020-12/meta/format-annotation", bi = { "https://json-schema.org/draft/2020-12/vocab/format-annotation": !0 }, xi = "meta", Si = "Format vocabulary meta-schema for annotation results", Ci = ["object", "boolean"], wi = { format: { type: "string" } }, Ti = {
		$schema: vi,
		$id: yi,
		$vocabulary: bi,
		$dynamicAnchor: xi,
		title: Si,
		type: Ci,
		properties: wi
	};
})), Di = /* @__PURE__ */ Je({
	$dynamicAnchor: () => ji,
	$id: () => ki,
	$schema: () => Oi,
	$vocabulary: () => Ai,
	default: () => Fi,
	properties: () => Pi,
	title: () => Mi,
	type: () => Ni
}), Oi, ki, Ai, ji, Mi, Ni, Pi, Fi, Ii = qe((() => {
	Oi = "https://json-schema.org/draft/2020-12/schema", ki = "https://json-schema.org/draft/2020-12/meta/meta-data", Ai = { "https://json-schema.org/draft/2020-12/vocab/meta-data": !0 }, ji = "meta", Mi = "Meta-data vocabulary meta-schema", Ni = ["object", "boolean"], Pi = {
		title: { type: "string" },
		description: { type: "string" },
		default: !0,
		deprecated: {
			type: "boolean",
			default: !1
		},
		readOnly: {
			type: "boolean",
			default: !1
		},
		writeOnly: {
			type: "boolean",
			default: !1
		},
		examples: {
			type: "array",
			items: !0
		}
	}, Fi = {
		$schema: Oi,
		$id: ki,
		$vocabulary: Ai,
		$dynamicAnchor: ji,
		title: Mi,
		type: Ni,
		properties: Pi
	};
})), Li = /* @__PURE__ */ Je({
	$defs: () => Gi,
	$dynamicAnchor: () => Vi,
	$id: () => zi,
	$schema: () => Ri,
	$vocabulary: () => Bi,
	default: () => Ki,
	properties: () => Wi,
	title: () => Hi,
	type: () => Ui
}), Ri, zi, Bi, Vi, Hi, Ui, Wi, Gi, Ki, qi = qe((() => {
	Ri = "https://json-schema.org/draft/2020-12/schema", zi = "https://json-schema.org/draft/2020-12/meta/validation", Bi = { "https://json-schema.org/draft/2020-12/vocab/validation": !0 }, Vi = "meta", Hi = "Validation vocabulary meta-schema", Ui = ["object", "boolean"], Wi = {
		type: { anyOf: [{ $ref: "#/$defs/simpleTypes" }, {
			type: "array",
			items: { $ref: "#/$defs/simpleTypes" },
			minItems: 1,
			uniqueItems: !0
		}] },
		const: !0,
		enum: {
			type: "array",
			items: !0
		},
		multipleOf: {
			type: "number",
			exclusiveMinimum: 0
		},
		maximum: { type: "number" },
		exclusiveMaximum: { type: "number" },
		minimum: { type: "number" },
		exclusiveMinimum: { type: "number" },
		maxLength: { $ref: "#/$defs/nonNegativeInteger" },
		minLength: { $ref: "#/$defs/nonNegativeIntegerDefault0" },
		pattern: {
			type: "string",
			format: "regex"
		},
		maxItems: { $ref: "#/$defs/nonNegativeInteger" },
		minItems: { $ref: "#/$defs/nonNegativeIntegerDefault0" },
		uniqueItems: {
			type: "boolean",
			default: !1
		},
		maxContains: { $ref: "#/$defs/nonNegativeInteger" },
		minContains: {
			$ref: "#/$defs/nonNegativeInteger",
			default: 1
		},
		maxProperties: { $ref: "#/$defs/nonNegativeInteger" },
		minProperties: { $ref: "#/$defs/nonNegativeIntegerDefault0" },
		required: { $ref: "#/$defs/stringArray" },
		dependentRequired: {
			type: "object",
			additionalProperties: { $ref: "#/$defs/stringArray" }
		}
	}, Gi = {
		nonNegativeInteger: {
			type: "integer",
			minimum: 0
		},
		nonNegativeIntegerDefault0: {
			$ref: "#/$defs/nonNegativeInteger",
			default: 0
		},
		simpleTypes: { enum: [
			"array",
			"boolean",
			"integer",
			"null",
			"number",
			"object",
			"string"
		] },
		stringArray: {
			type: "array",
			items: { type: "string" },
			uniqueItems: !0,
			default: []
		}
	}, Ki = {
		$schema: Ri,
		$id: zi,
		$vocabulary: Bi,
		$dynamicAnchor: Vi,
		title: Hi,
		type: Ui,
		properties: Wi,
		$defs: Gi
	};
})), Ji = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = (Or(), Ze(_r).default), n = (zr(), Ze(kr).default), r = (Yr(), Ze(Br).default), i = (ai(), Ze(Xr).default), a = (gi(), Ze(oi).default), o = (Ei(), Ze(_i).default), s = (Ii(), Ze(Di).default), c = (qi(), Ze(Li).default), l = ["/properties"];
	function u(e) {
		return [
			t,
			n,
			r,
			i,
			a,
			u(this, o),
			s,
			u(this, c)
		].forEach((e) => this.addMetaSchema(e, void 0, !1)), this;
		function u(t, n) {
			return e ? t.$dataMetaSchema(n, l) : n;
		}
	}
	e.default = u;
})), Yi = /* @__PURE__ */ z(((e, t) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.MissingRefError = e.ValidationError = e.CodeGen = e.Name = e.nil = e.stringify = e.str = e._ = e.KeywordCxt = e.Ajv2020 = void 0;
	var n = yn(), r = mr(), i = gr(), a = Ji(), o = "https://json-schema.org/draft/2020-12/schema", s = class extends n.default {
		constructor(e = {}) {
			super({
				...e,
				dynamicRef: !0,
				next: !0,
				unevaluated: !0
			});
		}
		_addVocabularies() {
			super._addVocabularies(), r.default.forEach((e) => this.addVocabulary(e)), this.opts.discriminator && this.addKeyword(i.default);
		}
		_addDefaultMetaSchema() {
			super._addDefaultMetaSchema();
			let { $data: e, meta: t } = this.opts;
			t && (a.default.call(this, e), this.refs["http://json-schema.org/schema"] = o);
		}
		defaultMeta() {
			return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(o) ? o : void 0);
		}
	};
	e.Ajv2020 = s, t.exports = e = s, t.exports.Ajv2020 = s, Object.defineProperty(e, "__esModule", { value: !0 }), e.default = s;
	var c = nn();
	Object.defineProperty(e, "KeywordCxt", {
		enumerable: !0,
		get: function() {
			return c.KeywordCxt;
		}
	});
	var l = U();
	Object.defineProperty(e, "_", {
		enumerable: !0,
		get: function() {
			return l._;
		}
	}), Object.defineProperty(e, "str", {
		enumerable: !0,
		get: function() {
			return l.str;
		}
	}), Object.defineProperty(e, "stringify", {
		enumerable: !0,
		get: function() {
			return l.stringify;
		}
	}), Object.defineProperty(e, "nil", {
		enumerable: !0,
		get: function() {
			return l.nil;
		}
	}), Object.defineProperty(e, "Name", {
		enumerable: !0,
		get: function() {
			return l.Name;
		}
	}), Object.defineProperty(e, "CodeGen", {
		enumerable: !0,
		get: function() {
			return l.CodeGen;
		}
	});
	var u = rn();
	Object.defineProperty(e, "ValidationError", {
		enumerable: !0,
		get: function() {
			return u.default;
		}
	});
	var d = an();
	Object.defineProperty(e, "MissingRefError", {
		enumerable: !0,
		get: function() {
			return d.default;
		}
	});
})), Xi = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.formatNames = e.fastFormats = e.fullFormats = void 0;
	function t(e, t) {
		return {
			validate: e,
			compare: t
		};
	}
	e.fullFormats = {
		date: t(a, o),
		time: t(c(!0), l),
		"date-time": t(f(!0), p),
		"iso-time": t(c(), u),
		"iso-date-time": t(f(), m),
		duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
		uri: _,
		"uri-reference": /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
		"uri-template": /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
		url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
		email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
		hostname: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
		ipv4: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
		ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
		regex: T,
		uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
		"json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
		"json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
		"relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
		byte: y,
		int32: {
			type: "number",
			validate: S
		},
		int64: {
			type: "number",
			validate: C
		},
		float: {
			type: "number",
			validate: ee
		},
		double: {
			type: "number",
			validate: ee
		},
		password: !0,
		binary: !0
	}, e.fastFormats = {
		...e.fullFormats,
		date: t(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, o),
		time: t(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, l),
		"date-time": t(/^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, p),
		"iso-time": t(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, u),
		"iso-date-time": t(/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, m),
		uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
		"uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
		email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i
	}, e.formatNames = Object.keys(e.fullFormats);
	function n(e) {
		return e % 4 == 0 && (e % 100 != 0 || e % 400 == 0);
	}
	var r = /^(\d\d\d\d)-(\d\d)-(\d\d)$/, i = [
		0,
		31,
		28,
		31,
		30,
		31,
		30,
		31,
		31,
		30,
		31,
		30,
		31
	];
	function a(e) {
		let t = r.exec(e);
		if (!t) return !1;
		let a = +t[1], o = +t[2], s = +t[3];
		return o >= 1 && o <= 12 && s >= 1 && s <= (o === 2 && n(a) ? 29 : i[o]);
	}
	function o(e, t) {
		if (e && t) return e > t ? 1 : e < t ? -1 : 0;
	}
	var s = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
	function c(e) {
		return function(t) {
			let n = s.exec(t);
			if (!n) return !1;
			let r = +n[1], i = +n[2], a = +n[3], o = n[4], c = n[5] === "-" ? -1 : 1, l = +(n[6] || 0), u = +(n[7] || 0);
			if (l > 23 || u > 59 || e && !o) return !1;
			if (r <= 23 && i <= 59 && a < 60) return !0;
			let d = i - u * c, f = r - l * c - (d < 0 ? 1 : 0);
			return (f === 23 || f === -1) && (d === 59 || d === -1) && a < 61;
		};
	}
	function l(e, t) {
		if (!(e && t)) return;
		let n = (/* @__PURE__ */ new Date("2020-01-01T" + e)).valueOf(), r = (/* @__PURE__ */ new Date("2020-01-01T" + t)).valueOf();
		if (n && r) return n - r;
	}
	function u(e, t) {
		if (!(e && t)) return;
		let n = s.exec(e), r = s.exec(t);
		if (n && r) return e = n[1] + n[2] + n[3], t = r[1] + r[2] + r[3], e > t ? 1 : e < t ? -1 : 0;
	}
	var d = /t|\s/i;
	function f(e) {
		let t = c(e);
		return function(e) {
			let n = e.split(d);
			return n.length === 2 && a(n[0]) && t(n[1]);
		};
	}
	function p(e, t) {
		if (!(e && t)) return;
		let n = new Date(e).valueOf(), r = new Date(t).valueOf();
		if (n && r) return n - r;
	}
	function m(e, t) {
		if (!(e && t)) return;
		let [n, r] = e.split(d), [i, a] = t.split(d), s = o(n, i);
		if (s !== void 0) return s || l(r, a);
	}
	var h = /\/|:/, g = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
	function _(e) {
		return h.test(e) && g.test(e);
	}
	var v = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
	function y(e) {
		return v.lastIndex = 0, v.test(e);
	}
	var b = -(2 ** 31), x = 2 ** 31 - 1;
	function S(e) {
		return Number.isInteger(e) && e <= x && e >= b;
	}
	function C(e) {
		return Number.isInteger(e);
	}
	function ee() {
		return !0;
	}
	var w = /[^\\]\\Z/;
	function T(e) {
		if (w.test(e)) return !1;
		try {
			return new RegExp(e), !0;
		} catch {
			return !1;
		}
	}
})), Zi = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.regexpCode = e.getEsmExportName = e.getProperty = e.safeStringify = e.stringify = e.strConcat = e.addCodeArg = e.str = e._ = e.nil = e._Code = e.Name = e.IDENTIFIER = e._CodeOrName = void 0;
	var t = class {};
	e._CodeOrName = t, e.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
	var n = class extends t {
		constructor(t) {
			if (super(), !e.IDENTIFIER.test(t)) throw Error("CodeGen: name must be a valid identifier");
			this.str = t;
		}
		toString() {
			return this.str;
		}
		emptyStr() {
			return !1;
		}
		get names() {
			return { [this.str]: 1 };
		}
	};
	e.Name = n;
	var r = class extends t {
		constructor(e) {
			super(), this._items = typeof e == "string" ? [e] : e;
		}
		toString() {
			return this.str;
		}
		emptyStr() {
			if (this._items.length > 1) return !1;
			let e = this._items[0];
			return e === "" || e === "\"\"";
		}
		get str() {
			return this._str ??= this._items.reduce((e, t) => `${e}${t}`, "");
		}
		get names() {
			return this._names ??= this._items.reduce((e, t) => (t instanceof n && (e[t.str] = (e[t.str] || 0) + 1), e), {});
		}
	};
	e._Code = r, e.nil = new r("");
	function i(e, ...t) {
		let n = [e[0]], i = 0;
		for (; i < t.length;) s(n, t[i]), n.push(e[++i]);
		return new r(n);
	}
	e._ = i;
	var a = new r("+");
	function o(e, ...t) {
		let n = [p(e[0])], i = 0;
		for (; i < t.length;) n.push(a), s(n, t[i]), n.push(a, p(e[++i]));
		return c(n), new r(n);
	}
	e.str = o;
	function s(e, t) {
		t instanceof r ? e.push(...t._items) : t instanceof n ? e.push(t) : e.push(d(t));
	}
	e.addCodeArg = s;
	function c(e) {
		let t = 1;
		for (; t < e.length - 1;) {
			if (e[t] === a) {
				let n = l(e[t - 1], e[t + 1]);
				if (n !== void 0) {
					e.splice(t - 1, 3, n);
					continue;
				}
				e[t++] = "+";
			}
			t++;
		}
	}
	function l(e, t) {
		if (t === "\"\"") return e;
		if (e === "\"\"") return t;
		if (typeof e == "string") return t instanceof n || e[e.length - 1] !== "\"" ? void 0 : typeof t == "string" ? t[0] === "\"" ? e.slice(0, -1) + t.slice(1) : void 0 : `${e.slice(0, -1)}${t}"`;
		if (typeof t == "string" && t[0] === "\"" && !(e instanceof n)) return `"${e}${t.slice(1)}`;
	}
	function u(e, t) {
		return t.emptyStr() ? e : e.emptyStr() ? t : o`${e}${t}`;
	}
	e.strConcat = u;
	function d(e) {
		return typeof e == "number" || typeof e == "boolean" || e === null ? e : p(Array.isArray(e) ? e.join(",") : e);
	}
	function f(e) {
		return new r(p(e));
	}
	e.stringify = f;
	function p(e) {
		return JSON.stringify(e).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
	}
	e.safeStringify = p;
	function m(t) {
		return typeof t == "string" && e.IDENTIFIER.test(t) ? new r(`.${t}`) : i`[${t}]`;
	}
	e.getProperty = m;
	function h(t) {
		if (typeof t == "string" && e.IDENTIFIER.test(t)) return new r(`${t}`);
		throw Error(`CodeGen: invalid export name: ${t}, use explicit $id name mapping`);
	}
	e.getEsmExportName = h;
	function g(e) {
		return new r(e.toString());
	}
	e.regexpCode = g;
})), Qi = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.ValueScope = e.ValueScopeName = e.Scope = e.varKinds = e.UsedValueState = void 0;
	var t = Zi(), n = class extends Error {
		constructor(e) {
			super(`CodeGen: "code" for ${e} not defined`), this.value = e.value;
		}
	}, r;
	(function(e) {
		e[e.Started = 0] = "Started", e[e.Completed = 1] = "Completed";
	})(r || (e.UsedValueState = r = {})), e.varKinds = {
		const: new t.Name("const"),
		let: new t.Name("let"),
		var: new t.Name("var")
	};
	var i = class {
		constructor({ prefixes: e, parent: t } = {}) {
			this._names = {}, this._prefixes = e, this._parent = t;
		}
		toName(e) {
			return e instanceof t.Name ? e : this.name(e);
		}
		name(e) {
			return new t.Name(this._newName(e));
		}
		_newName(e) {
			let t = this._names[e] || this._nameGroup(e);
			return `${e}${t.index++}`;
		}
		_nameGroup(e) {
			if ((this._parent?._prefixes)?.has(e) || this._prefixes && !this._prefixes.has(e)) throw Error(`CodeGen: prefix "${e}" is not allowed in this scope`);
			return this._names[e] = {
				prefix: e,
				index: 0
			};
		}
	};
	e.Scope = i;
	var a = class extends t.Name {
		constructor(e, t) {
			super(t), this.prefix = e;
		}
		setValue(e, { property: n, itemIndex: r }) {
			this.value = e, this.scopePath = (0, t._)`.${new t.Name(n)}[${r}]`;
		}
	};
	e.ValueScopeName = a;
	var o = (0, t._)`\n`;
	e.ValueScope = class extends i {
		constructor(e) {
			super(e), this._values = {}, this._scope = e.scope, this.opts = {
				...e,
				_n: e.lines ? o : t.nil
			};
		}
		get() {
			return this._scope;
		}
		name(e) {
			return new a(e, this._newName(e));
		}
		value(e, t) {
			if (t.ref === void 0) throw Error("CodeGen: ref must be passed in value");
			let n = this.toName(e), { prefix: r } = n, i = t.key ?? t.ref, a = this._values[r];
			if (a) {
				let e = a.get(i);
				if (e) return e;
			} else a = this._values[r] = /* @__PURE__ */ new Map();
			a.set(i, n);
			let o = this._scope[r] || (this._scope[r] = []), s = o.length;
			return o[s] = t.ref, n.setValue(t, {
				property: r,
				itemIndex: s
			}), n;
		}
		getValue(e, t) {
			let n = this._values[e];
			if (n) return n.get(t);
		}
		scopeRefs(e, n = this._values) {
			return this._reduceValues(n, (n) => {
				if (n.scopePath === void 0) throw Error(`CodeGen: name "${n}" has no value`);
				return (0, t._)`${e}${n.scopePath}`;
			});
		}
		scopeCode(e = this._values, t, n) {
			return this._reduceValues(e, (e) => {
				if (e.value === void 0) throw Error(`CodeGen: name "${e}" has no value`);
				return e.value.code;
			}, t, n);
		}
		_reduceValues(i, a, o = {}, s) {
			let c = t.nil;
			for (let l in i) {
				let u = i[l];
				if (!u) continue;
				let d = o[l] = o[l] || /* @__PURE__ */ new Map();
				u.forEach((i) => {
					if (d.has(i)) return;
					d.set(i, r.Started);
					let o = a(i);
					if (o) {
						let n = this.opts.es5 ? e.varKinds.var : e.varKinds.const;
						c = (0, t._)`${c}${n} ${i} = ${o};${this.opts._n}`;
					} else if (o = s?.(i)) c = (0, t._)`${c}${o}${this.opts._n}`;
					else throw new n(i);
					d.set(i, r.Completed);
				});
			}
			return c;
		}
	};
})), G = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.or = e.and = e.not = e.CodeGen = e.operators = e.varKinds = e.ValueScopeName = e.ValueScope = e.Scope = e.Name = e.regexpCode = e.stringify = e.getProperty = e.nil = e.strConcat = e.str = e._ = void 0;
	var t = Zi(), n = Qi(), r = Zi();
	Object.defineProperty(e, "_", {
		enumerable: !0,
		get: function() {
			return r._;
		}
	}), Object.defineProperty(e, "str", {
		enumerable: !0,
		get: function() {
			return r.str;
		}
	}), Object.defineProperty(e, "strConcat", {
		enumerable: !0,
		get: function() {
			return r.strConcat;
		}
	}), Object.defineProperty(e, "nil", {
		enumerable: !0,
		get: function() {
			return r.nil;
		}
	}), Object.defineProperty(e, "getProperty", {
		enumerable: !0,
		get: function() {
			return r.getProperty;
		}
	}), Object.defineProperty(e, "stringify", {
		enumerable: !0,
		get: function() {
			return r.stringify;
		}
	}), Object.defineProperty(e, "regexpCode", {
		enumerable: !0,
		get: function() {
			return r.regexpCode;
		}
	}), Object.defineProperty(e, "Name", {
		enumerable: !0,
		get: function() {
			return r.Name;
		}
	});
	var i = Qi();
	Object.defineProperty(e, "Scope", {
		enumerable: !0,
		get: function() {
			return i.Scope;
		}
	}), Object.defineProperty(e, "ValueScope", {
		enumerable: !0,
		get: function() {
			return i.ValueScope;
		}
	}), Object.defineProperty(e, "ValueScopeName", {
		enumerable: !0,
		get: function() {
			return i.ValueScopeName;
		}
	}), Object.defineProperty(e, "varKinds", {
		enumerable: !0,
		get: function() {
			return i.varKinds;
		}
	}), e.operators = {
		GT: new t._Code(">"),
		GTE: new t._Code(">="),
		LT: new t._Code("<"),
		LTE: new t._Code("<="),
		EQ: new t._Code("==="),
		NEQ: new t._Code("!=="),
		NOT: new t._Code("!"),
		OR: new t._Code("||"),
		AND: new t._Code("&&"),
		ADD: new t._Code("+")
	};
	var a = class {
		optimizeNodes() {
			return this;
		}
		optimizeNames(e, t) {
			return this;
		}
	}, o = class extends a {
		constructor(e, t, n) {
			super(), this.varKind = e, this.name = t, this.rhs = n;
		}
		render({ es5: e, _n: t }) {
			let r = e ? n.varKinds.var : this.varKind, i = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
			return `${r} ${this.name}${i};` + t;
		}
		optimizeNames(e, t) {
			if (e[this.name.str]) return this.rhs &&= O(this.rhs, e, t), this;
		}
		get names() {
			return this.rhs instanceof t._CodeOrName ? this.rhs.names : {};
		}
	}, s = class extends a {
		constructor(e, t, n) {
			super(), this.lhs = e, this.rhs = t, this.sideEffects = n;
		}
		render({ _n: e }) {
			return `${this.lhs} = ${this.rhs};` + e;
		}
		optimizeNames(e, n) {
			if (!(this.lhs instanceof t.Name && !e[this.lhs.str] && !this.sideEffects)) return this.rhs = O(this.rhs, e, n), this;
		}
		get names() {
			return D(this.lhs instanceof t.Name ? {} : { ...this.lhs.names }, this.rhs);
		}
	}, c = class extends s {
		constructor(e, t, n, r) {
			super(e, n, r), this.op = t;
		}
		render({ _n: e }) {
			return `${this.lhs} ${this.op}= ${this.rhs};` + e;
		}
	}, l = class extends a {
		constructor(e) {
			super(), this.label = e, this.names = {};
		}
		render({ _n: e }) {
			return `${this.label}:` + e;
		}
	}, u = class extends a {
		constructor(e) {
			super(), this.label = e, this.names = {};
		}
		render({ _n: e }) {
			return `break${this.label ? ` ${this.label}` : ""};` + e;
		}
	}, d = class extends a {
		constructor(e) {
			super(), this.error = e;
		}
		render({ _n: e }) {
			return `throw ${this.error};` + e;
		}
		get names() {
			return this.error.names;
		}
	}, f = class extends a {
		constructor(e) {
			super(), this.code = e;
		}
		render({ _n: e }) {
			return `${this.code};` + e;
		}
		optimizeNodes() {
			return `${this.code}` ? this : void 0;
		}
		optimizeNames(e, t) {
			return this.code = O(this.code, e, t), this;
		}
		get names() {
			return this.code instanceof t._CodeOrName ? this.code.names : {};
		}
	}, p = class extends a {
		constructor(e = []) {
			super(), this.nodes = e;
		}
		render(e) {
			return this.nodes.reduce((t, n) => t + n.render(e), "");
		}
		optimizeNodes() {
			let { nodes: e } = this, t = e.length;
			for (; t--;) {
				let n = e[t].optimizeNodes();
				Array.isArray(n) ? e.splice(t, 1, ...n) : n ? e[t] = n : e.splice(t, 1);
			}
			return e.length > 0 ? this : void 0;
		}
		optimizeNames(e, t) {
			let { nodes: n } = this, r = n.length;
			for (; r--;) {
				let i = n[r];
				i.optimizeNames(e, t) || (te(e, i.names), n.splice(r, 1));
			}
			return n.length > 0 ? this : void 0;
		}
		get names() {
			return this.nodes.reduce((e, t) => E(e, t.names), {});
		}
	}, m = class extends p {
		render(e) {
			return "{" + e._n + super.render(e) + "}" + e._n;
		}
	}, h = class extends p {}, g = class extends m {};
	g.kind = "else";
	var _ = class e extends m {
		constructor(e, t) {
			super(t), this.condition = e;
		}
		render(e) {
			let t = `if(${this.condition})` + super.render(e);
			return this.else && (t += "else " + this.else.render(e)), t;
		}
		optimizeNodes() {
			super.optimizeNodes();
			let t = this.condition;
			if (t === !0) return this.nodes;
			let n = this.else;
			if (n) {
				let e = n.optimizeNodes();
				n = this.else = Array.isArray(e) ? new g(e) : e;
			}
			if (n) return t === !1 ? n instanceof e ? n : n.nodes : this.nodes.length ? this : new e(ne(t), n instanceof e ? [n] : n.nodes);
			if (!(t === !1 || !this.nodes.length)) return this;
		}
		optimizeNames(e, t) {
			if (this.else = this.else?.optimizeNames(e, t), super.optimizeNames(e, t) || this.else) return this.condition = O(this.condition, e, t), this;
		}
		get names() {
			let e = super.names;
			return D(e, this.condition), this.else && E(e, this.else.names), e;
		}
	};
	_.kind = "if";
	var v = class extends m {};
	v.kind = "for";
	var y = class extends v {
		constructor(e) {
			super(), this.iteration = e;
		}
		render(e) {
			return `for(${this.iteration})` + super.render(e);
		}
		optimizeNames(e, t) {
			if (super.optimizeNames(e, t)) return this.iteration = O(this.iteration, e, t), this;
		}
		get names() {
			return E(super.names, this.iteration.names);
		}
	}, b = class extends v {
		constructor(e, t, n, r) {
			super(), this.varKind = e, this.name = t, this.from = n, this.to = r;
		}
		render(e) {
			let t = e.es5 ? n.varKinds.var : this.varKind, { name: r, from: i, to: a } = this;
			return `for(${t} ${r}=${i}; ${r}<${a}; ${r}++)` + super.render(e);
		}
		get names() {
			return D(D(super.names, this.from), this.to);
		}
	}, x = class extends v {
		constructor(e, t, n, r) {
			super(), this.loop = e, this.varKind = t, this.name = n, this.iterable = r;
		}
		render(e) {
			return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(e);
		}
		optimizeNames(e, t) {
			if (super.optimizeNames(e, t)) return this.iterable = O(this.iterable, e, t), this;
		}
		get names() {
			return E(super.names, this.iterable.names);
		}
	}, S = class extends m {
		constructor(e, t, n) {
			super(), this.name = e, this.args = t, this.async = n;
		}
		render(e) {
			return `${this.async ? "async " : ""}function ${this.name}(${this.args})` + super.render(e);
		}
	};
	S.kind = "func";
	var C = class extends p {
		render(e) {
			return "return " + super.render(e);
		}
	};
	C.kind = "return";
	var ee = class extends m {
		render(e) {
			let t = "try" + super.render(e);
			return this.catch && (t += this.catch.render(e)), this.finally && (t += this.finally.render(e)), t;
		}
		optimizeNodes() {
			var e, t;
			return super.optimizeNodes(), (e = this.catch) == null || e.optimizeNodes(), (t = this.finally) == null || t.optimizeNodes(), this;
		}
		optimizeNames(e, t) {
			var n, r;
			return super.optimizeNames(e, t), (n = this.catch) == null || n.optimizeNames(e, t), (r = this.finally) == null || r.optimizeNames(e, t), this;
		}
		get names() {
			let e = super.names;
			return this.catch && E(e, this.catch.names), this.finally && E(e, this.finally.names), e;
		}
	}, w = class extends m {
		constructor(e) {
			super(), this.error = e;
		}
		render(e) {
			return `catch(${this.error})` + super.render(e);
		}
	};
	w.kind = "catch";
	var T = class extends m {
		render(e) {
			return "finally" + super.render(e);
		}
	};
	T.kind = "finally", e.CodeGen = class {
		constructor(e, t = {}) {
			this._values = {}, this._blockStarts = [], this._constants = {}, this.opts = {
				...t,
				_n: t.lines ? "\n" : ""
			}, this._extScope = e, this._scope = new n.Scope({ parent: e }), this._nodes = [new h()];
		}
		toString() {
			return this._root.render(this.opts);
		}
		name(e) {
			return this._scope.name(e);
		}
		scopeName(e) {
			return this._extScope.name(e);
		}
		scopeValue(e, t) {
			let n = this._extScope.value(e, t);
			return (this._values[n.prefix] || (this._values[n.prefix] = /* @__PURE__ */ new Set())).add(n), n;
		}
		getScopeValue(e, t) {
			return this._extScope.getValue(e, t);
		}
		scopeRefs(e) {
			return this._extScope.scopeRefs(e, this._values);
		}
		scopeCode() {
			return this._extScope.scopeCode(this._values);
		}
		_def(e, t, n, r) {
			let i = this._scope.toName(t);
			return n !== void 0 && r && (this._constants[i.str] = n), this._leafNode(new o(e, i, n)), i;
		}
		const(e, t, r) {
			return this._def(n.varKinds.const, e, t, r);
		}
		let(e, t, r) {
			return this._def(n.varKinds.let, e, t, r);
		}
		var(e, t, r) {
			return this._def(n.varKinds.var, e, t, r);
		}
		assign(e, t, n) {
			return this._leafNode(new s(e, t, n));
		}
		add(t, n) {
			return this._leafNode(new c(t, e.operators.ADD, n));
		}
		code(e) {
			return typeof e == "function" ? e() : e !== t.nil && this._leafNode(new f(e)), this;
		}
		object(...e) {
			let n = ["{"];
			for (let [r, i] of e) n.length > 1 && n.push(","), n.push(r), (r !== i || this.opts.es5) && (n.push(":"), (0, t.addCodeArg)(n, i));
			return n.push("}"), new t._Code(n);
		}
		if(e, t, n) {
			if (this._blockNode(new _(e)), t && n) this.code(t).else().code(n).endIf();
			else if (t) this.code(t).endIf();
			else if (n) throw Error("CodeGen: \"else\" body without \"then\" body");
			return this;
		}
		elseIf(e) {
			return this._elseNode(new _(e));
		}
		else() {
			return this._elseNode(new g());
		}
		endIf() {
			return this._endBlockNode(_, g);
		}
		_for(e, t) {
			return this._blockNode(e), t && this.code(t).endFor(), this;
		}
		for(e, t) {
			return this._for(new y(e), t);
		}
		forRange(e, t, r, i, a = this.opts.es5 ? n.varKinds.var : n.varKinds.let) {
			let o = this._scope.toName(e);
			return this._for(new b(a, o, t, r), () => i(o));
		}
		forOf(e, r, i, a = n.varKinds.const) {
			let o = this._scope.toName(e);
			if (this.opts.es5) {
				let e = r instanceof t.Name ? r : this.var("_arr", r);
				return this.forRange("_i", 0, (0, t._)`${e}.length`, (n) => {
					this.var(o, (0, t._)`${e}[${n}]`), i(o);
				});
			}
			return this._for(new x("of", a, o, r), () => i(o));
		}
		forIn(e, r, i, a = this.opts.es5 ? n.varKinds.var : n.varKinds.const) {
			if (this.opts.ownProperties) return this.forOf(e, (0, t._)`Object.keys(${r})`, i);
			let o = this._scope.toName(e);
			return this._for(new x("in", a, o, r), () => i(o));
		}
		endFor() {
			return this._endBlockNode(v);
		}
		label(e) {
			return this._leafNode(new l(e));
		}
		break(e) {
			return this._leafNode(new u(e));
		}
		return(e) {
			let t = new C();
			if (this._blockNode(t), this.code(e), t.nodes.length !== 1) throw Error("CodeGen: \"return\" should have one node");
			return this._endBlockNode(C);
		}
		try(e, t, n) {
			if (!t && !n) throw Error("CodeGen: \"try\" without \"catch\" and \"finally\"");
			let r = new ee();
			if (this._blockNode(r), this.code(e), t) {
				let e = this.name("e");
				this._currNode = r.catch = new w(e), t(e);
			}
			return n && (this._currNode = r.finally = new T(), this.code(n)), this._endBlockNode(w, T);
		}
		throw(e) {
			return this._leafNode(new d(e));
		}
		block(e, t) {
			return this._blockStarts.push(this._nodes.length), e && this.code(e).endBlock(t), this;
		}
		endBlock(e) {
			let t = this._blockStarts.pop();
			if (t === void 0) throw Error("CodeGen: not in self-balancing block");
			let n = this._nodes.length - t;
			if (n < 0 || e !== void 0 && n !== e) throw Error(`CodeGen: wrong number of nodes: ${n} vs ${e} expected`);
			return this._nodes.length = t, this;
		}
		func(e, n = t.nil, r, i) {
			return this._blockNode(new S(e, n, r)), i && this.code(i).endFunc(), this;
		}
		endFunc() {
			return this._endBlockNode(S);
		}
		optimize(e = 1) {
			for (; e-- > 0;) this._root.optimizeNodes(), this._root.optimizeNames(this._root.names, this._constants);
		}
		_leafNode(e) {
			return this._currNode.nodes.push(e), this;
		}
		_blockNode(e) {
			this._currNode.nodes.push(e), this._nodes.push(e);
		}
		_endBlockNode(e, t) {
			let n = this._currNode;
			if (n instanceof e || t && n instanceof t) return this._nodes.pop(), this;
			throw Error(`CodeGen: not in block "${t ? `${e.kind}/${t.kind}` : e.kind}"`);
		}
		_elseNode(e) {
			let t = this._currNode;
			if (!(t instanceof _)) throw Error("CodeGen: \"else\" without \"if\"");
			return this._currNode = t.else = e, this;
		}
		get _root() {
			return this._nodes[0];
		}
		get _currNode() {
			let e = this._nodes;
			return e[e.length - 1];
		}
		set _currNode(e) {
			let t = this._nodes;
			t[t.length - 1] = e;
		}
	};
	function E(e, t) {
		for (let n in t) e[n] = (e[n] || 0) + (t[n] || 0);
		return e;
	}
	function D(e, n) {
		return n instanceof t._CodeOrName ? E(e, n.names) : e;
	}
	function O(e, n, r) {
		if (e instanceof t.Name) return i(e);
		if (!a(e)) return e;
		return new t._Code(e._items.reduce((e, n) => (n instanceof t.Name && (n = i(n)), n instanceof t._Code ? e.push(...n._items) : e.push(n), e), []));
		function i(e) {
			let t = r[e.str];
			return t === void 0 || n[e.str] !== 1 ? e : (delete n[e.str], t);
		}
		function a(e) {
			return e instanceof t._Code && e._items.some((e) => e instanceof t.Name && n[e.str] === 1 && r[e.str] !== void 0);
		}
	}
	function te(e, t) {
		for (let n in t) e[n] = (e[n] || 0) - (t[n] || 0);
	}
	function ne(e) {
		return typeof e == "boolean" || typeof e == "number" || e === null ? !e : (0, t._)`!${ce(e)}`;
	}
	e.not = ne;
	var re = se(e.operators.AND);
	function ie(...e) {
		return e.reduce(re);
	}
	e.and = ie;
	var ae = se(e.operators.OR);
	function oe(...e) {
		return e.reduce(ae);
	}
	e.or = oe;
	function se(e) {
		return (n, r) => n === t.nil ? r : r === t.nil ? n : (0, t._)`${ce(n)} ${e} ${ce(r)}`;
	}
	function ce(e) {
		return e instanceof t.Name ? e : (0, t._)`(${e})`;
	}
})), K = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.checkStrictMode = e.getErrorPath = e.Type = e.useFunc = e.setEvaluated = e.evaluatedPropsToName = e.mergeEvaluated = e.eachItem = e.unescapeJsonPointer = e.escapeJsonPointer = e.escapeFragment = e.unescapeFragment = e.schemaRefOrVal = e.schemaHasRulesButRef = e.schemaHasRules = e.checkUnknownRules = e.alwaysValidSchema = e.toHash = void 0;
	var t = G(), n = Zi();
	function r(e) {
		let t = {};
		for (let n of e) t[n] = !0;
		return t;
	}
	e.toHash = r;
	function i(e, t) {
		return typeof t == "boolean" ? t : Object.keys(t).length === 0 ? !0 : (a(e, t), !o(t, e.self.RULES.all));
	}
	e.alwaysValidSchema = i;
	function a(e, t = e.schema) {
		let { opts: n, self: r } = e;
		if (!n.strictSchema || typeof t == "boolean") return;
		let i = r.RULES.keywords;
		for (let n in t) i[n] || x(e, `unknown keyword: "${n}"`);
	}
	e.checkUnknownRules = a;
	function o(e, t) {
		if (typeof e == "boolean") return !e;
		for (let n in e) if (t[n]) return !0;
		return !1;
	}
	e.schemaHasRules = o;
	function s(e, t) {
		if (typeof e == "boolean") return !e;
		for (let n in e) if (n !== "$ref" && t.all[n]) return !0;
		return !1;
	}
	e.schemaHasRulesButRef = s;
	function c({ topSchemaRef: e, schemaPath: n }, r, i, a) {
		if (!a) {
			if (typeof r == "number" || typeof r == "boolean") return r;
			if (typeof r == "string") return (0, t._)`${r}`;
		}
		return (0, t._)`${e}${n}${(0, t.getProperty)(i)}`;
	}
	e.schemaRefOrVal = c;
	function l(e) {
		return f(decodeURIComponent(e));
	}
	e.unescapeFragment = l;
	function u(e) {
		return encodeURIComponent(d(e));
	}
	e.escapeFragment = u;
	function d(e) {
		return typeof e == "number" ? `${e}` : e.replace(/~/g, "~0").replace(/\//g, "~1");
	}
	e.escapeJsonPointer = d;
	function f(e) {
		return e.replace(/~1/g, "/").replace(/~0/g, "~");
	}
	e.unescapeJsonPointer = f;
	function p(e, t) {
		if (Array.isArray(e)) for (let n of e) t(n);
		else t(e);
	}
	e.eachItem = p;
	function m({ mergeNames: e, mergeToName: n, mergeValues: r, resultToName: i }) {
		return (a, o, s, c) => {
			let l = s === void 0 ? o : s instanceof t.Name ? (o instanceof t.Name ? e(a, o, s) : n(a, o, s), s) : o instanceof t.Name ? (n(a, s, o), o) : r(o, s);
			return c === t.Name && !(l instanceof t.Name) ? i(a, l) : l;
		};
	}
	e.mergeEvaluated = {
		props: m({
			mergeNames: (e, n, r) => e.if((0, t._)`${r} !== true && ${n} !== undefined`, () => {
				e.if((0, t._)`${n} === true`, () => e.assign(r, !0), () => e.assign(r, (0, t._)`${r} || {}`).code((0, t._)`Object.assign(${r}, ${n})`));
			}),
			mergeToName: (e, n, r) => e.if((0, t._)`${r} !== true`, () => {
				n === !0 ? e.assign(r, !0) : (e.assign(r, (0, t._)`${r} || {}`), g(e, r, n));
			}),
			mergeValues: (e, t) => e === !0 ? !0 : {
				...e,
				...t
			},
			resultToName: h
		}),
		items: m({
			mergeNames: (e, n, r) => e.if((0, t._)`${r} !== true && ${n} !== undefined`, () => e.assign(r, (0, t._)`${n} === true ? true : ${r} > ${n} ? ${r} : ${n}`)),
			mergeToName: (e, n, r) => e.if((0, t._)`${r} !== true`, () => e.assign(r, n === !0 ? !0 : (0, t._)`${r} > ${n} ? ${r} : ${n}`)),
			mergeValues: (e, t) => e === !0 ? !0 : Math.max(e, t),
			resultToName: (e, t) => e.var("items", t)
		})
	};
	function h(e, n) {
		if (n === !0) return e.var("props", !0);
		let r = e.var("props", (0, t._)`{}`);
		return n !== void 0 && g(e, r, n), r;
	}
	e.evaluatedPropsToName = h;
	function g(e, n, r) {
		Object.keys(r).forEach((r) => e.assign((0, t._)`${n}${(0, t.getProperty)(r)}`, !0));
	}
	e.setEvaluated = g;
	var _ = {};
	function v(e, t) {
		return e.scopeValue("func", {
			ref: t,
			code: _[t.code] || (_[t.code] = new n._Code(t.code))
		});
	}
	e.useFunc = v;
	var y;
	(function(e) {
		e[e.Num = 0] = "Num", e[e.Str = 1] = "Str";
	})(y || (e.Type = y = {}));
	function b(e, n, r) {
		if (e instanceof t.Name) {
			let i = n === y.Num;
			return r ? i ? (0, t._)`"[" + ${e} + "]"` : (0, t._)`"['" + ${e} + "']"` : i ? (0, t._)`"/" + ${e}` : (0, t._)`"/" + ${e}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
		}
		return r ? (0, t.getProperty)(e).toString() : "/" + d(e);
	}
	e.getErrorPath = b;
	function x(e, t, n = e.opts.strictSchema) {
		if (n) {
			if (t = `strict mode: ${t}`, n === !0) throw Error(t);
			e.self.logger.warn(t);
		}
	}
	e.checkStrictMode = x;
})), $i = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = G();
	e.default = {
		data: new t.Name("data"),
		valCxt: new t.Name("valCxt"),
		instancePath: new t.Name("instancePath"),
		parentData: new t.Name("parentData"),
		parentDataProperty: new t.Name("parentDataProperty"),
		rootData: new t.Name("rootData"),
		dynamicAnchors: new t.Name("dynamicAnchors"),
		vErrors: new t.Name("vErrors"),
		errors: new t.Name("errors"),
		this: new t.Name("this"),
		self: new t.Name("self"),
		scope: new t.Name("scope"),
		json: new t.Name("json"),
		jsonPos: new t.Name("jsonPos"),
		jsonLen: new t.Name("jsonLen"),
		jsonPart: new t.Name("jsonPart")
	};
})), ea = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.extendErrors = e.resetErrorsCount = e.reportExtraError = e.reportError = e.keyword$DataError = e.keywordError = void 0;
	var t = G(), n = K(), r = $i();
	e.keywordError = { message: ({ keyword: e }) => (0, t.str)`must pass "${e}" keyword validation` }, e.keyword$DataError = { message: ({ keyword: e, schemaType: n }) => n ? (0, t.str)`"${e}" keyword must be ${n} ($data)` : (0, t.str)`"${e}" keyword is invalid ($data)` };
	function i(n, r = e.keywordError, i, a) {
		let { it: o } = n, { gen: s, compositeRule: u, allErrors: f } = o, p = d(n, r, i);
		a ?? (u || f) ? c(s, p) : l(o, (0, t._)`[${p}]`);
	}
	e.reportError = i;
	function a(t, n = e.keywordError, i) {
		let { it: a } = t, { gen: o, compositeRule: s, allErrors: u } = a;
		c(o, d(t, n, i)), s || u || l(a, r.default.vErrors);
	}
	e.reportExtraError = a;
	function o(e, n) {
		e.assign(r.default.errors, n), e.if((0, t._)`${r.default.vErrors} !== null`, () => e.if(n, () => e.assign((0, t._)`${r.default.vErrors}.length`, n), () => e.assign(r.default.vErrors, null)));
	}
	e.resetErrorsCount = o;
	function s({ gen: e, keyword: n, schemaValue: i, data: a, errsCount: o, it: s }) {
		/* istanbul ignore if */
		if (o === void 0) throw Error("ajv implementation error");
		let c = e.name("err");
		e.forRange("i", o, r.default.errors, (o) => {
			e.const(c, (0, t._)`${r.default.vErrors}[${o}]`), e.if((0, t._)`${c}.instancePath === undefined`, () => e.assign((0, t._)`${c}.instancePath`, (0, t.strConcat)(r.default.instancePath, s.errorPath))), e.assign((0, t._)`${c}.schemaPath`, (0, t.str)`${s.errSchemaPath}/${n}`), s.opts.verbose && (e.assign((0, t._)`${c}.schema`, i), e.assign((0, t._)`${c}.data`, a));
		});
	}
	e.extendErrors = s;
	function c(e, n) {
		let i = e.const("err", n);
		e.if((0, t._)`${r.default.vErrors} === null`, () => e.assign(r.default.vErrors, (0, t._)`[${i}]`), (0, t._)`${r.default.vErrors}.push(${i})`), e.code((0, t._)`${r.default.errors}++`);
	}
	function l(e, n) {
		let { gen: r, validateName: i, schemaEnv: a } = e;
		a.$async ? r.throw((0, t._)`new ${e.ValidationError}(${n})`) : (r.assign((0, t._)`${i}.errors`, n), r.return(!1));
	}
	var u = {
		keyword: new t.Name("keyword"),
		schemaPath: new t.Name("schemaPath"),
		params: new t.Name("params"),
		propertyName: new t.Name("propertyName"),
		message: new t.Name("message"),
		schema: new t.Name("schema"),
		parentSchema: new t.Name("parentSchema")
	};
	function d(e, n, r) {
		let { createErrors: i } = e.it;
		return i === !1 ? (0, t._)`{}` : f(e, n, r);
	}
	function f(e, t, n = {}) {
		let { gen: r, it: i } = e, a = [p(i, n), m(e, n)];
		return h(e, t, a), r.object(...a);
	}
	function p({ errorPath: e }, { instancePath: i }) {
		let a = i ? (0, t.str)`${e}${(0, n.getErrorPath)(i, n.Type.Str)}` : e;
		return [r.default.instancePath, (0, t.strConcat)(r.default.instancePath, a)];
	}
	function m({ keyword: e, it: { errSchemaPath: r } }, { schemaPath: i, parentSchema: a }) {
		let o = a ? r : (0, t.str)`${r}/${e}`;
		return i && (o = (0, t.str)`${o}${(0, n.getErrorPath)(i, n.Type.Str)}`), [u.schemaPath, o];
	}
	function h(e, { params: n, message: i }, a) {
		let { keyword: o, data: s, schemaValue: c, it: l } = e, { opts: d, propertyName: f, topSchemaRef: p, schemaPath: m } = l;
		a.push([u.keyword, o], [u.params, typeof n == "function" ? n(e) : n || (0, t._)`{}`]), d.messages && a.push([u.message, typeof i == "function" ? i(e) : i]), d.verbose && a.push([u.schema, c], [u.parentSchema, (0, t._)`${p}${m}`], [r.default.data, s]), f && a.push([u.propertyName, f]);
	}
})), ta = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.boolOrEmptySchema = e.topBoolOrEmptySchema = void 0;
	var t = ea(), n = G(), r = $i(), i = { message: "boolean schema is false" };
	function a(e) {
		let { gen: t, schema: i, validateName: a } = e;
		i === !1 ? s(e, !1) : typeof i == "object" && i.$async === !0 ? t.return(r.default.data) : (t.assign((0, n._)`${a}.errors`, null), t.return(!0));
	}
	e.topBoolOrEmptySchema = a;
	function o(e, t) {
		let { gen: n, schema: r } = e;
		r === !1 ? (n.var(t, !1), s(e)) : n.var(t, !0);
	}
	e.boolOrEmptySchema = o;
	function s(e, n) {
		let { gen: r, data: a } = e, o = {
			gen: r,
			keyword: "false schema",
			data: a,
			schema: !1,
			schemaCode: !1,
			schemaValue: !1,
			params: {},
			it: e
		};
		(0, t.reportError)(o, i, void 0, n);
	}
})), na = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.getRules = e.isJSONType = void 0;
	var t = new Set([
		"string",
		"number",
		"integer",
		"boolean",
		"null",
		"object",
		"array"
	]);
	function n(e) {
		return typeof e == "string" && t.has(e);
	}
	e.isJSONType = n;
	function r() {
		let e = {
			number: {
				type: "number",
				rules: []
			},
			string: {
				type: "string",
				rules: []
			},
			array: {
				type: "array",
				rules: []
			},
			object: {
				type: "object",
				rules: []
			}
		};
		return {
			types: {
				...e,
				integer: !0,
				boolean: !0,
				null: !0
			},
			rules: [
				{ rules: [] },
				e.number,
				e.string,
				e.array,
				e.object
			],
			post: { rules: [] },
			all: {},
			keywords: {}
		};
	}
	e.getRules = r;
})), ra = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.shouldUseRule = e.shouldUseGroup = e.schemaHasRulesForType = void 0;
	function t({ schema: e, self: t }, r) {
		let i = t.RULES.types[r];
		return i && i !== !0 && n(e, i);
	}
	e.schemaHasRulesForType = t;
	function n(e, t) {
		return t.rules.some((t) => r(e, t));
	}
	e.shouldUseGroup = n;
	function r(e, t) {
		return e[t.keyword] !== void 0 || t.definition.implements?.some((t) => e[t] !== void 0);
	}
	e.shouldUseRule = r;
})), ia = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.reportTypeError = e.checkDataTypes = e.checkDataType = e.coerceAndCheckDataType = e.getJSONTypes = e.getSchemaTypes = e.DataType = void 0;
	var t = na(), n = ra(), r = ea(), i = G(), a = K(), o;
	(function(e) {
		e[e.Correct = 0] = "Correct", e[e.Wrong = 1] = "Wrong";
	})(o || (e.DataType = o = {}));
	function s(e) {
		let t = c(e.type);
		if (t.includes("null")) {
			if (e.nullable === !1) throw Error("type: null contradicts nullable: false");
		} else {
			if (!t.length && e.nullable !== void 0) throw Error("\"nullable\" cannot be used without \"type\"");
			e.nullable === !0 && t.push("null");
		}
		return t;
	}
	e.getSchemaTypes = s;
	function c(e) {
		let n = Array.isArray(e) ? e : e ? [e] : [];
		if (n.every(t.isJSONType)) return n;
		throw Error("type must be JSONType or JSONType[]: " + n.join(","));
	}
	e.getJSONTypes = c;
	function l(e, t) {
		let { gen: r, data: i, opts: a } = e, s = d(t, a.coerceTypes), c = t.length > 0 && !(s.length === 0 && t.length === 1 && (0, n.schemaHasRulesForType)(e, t[0]));
		if (c) {
			let n = h(t, i, a.strictNumbers, o.Wrong);
			r.if(n, () => {
				s.length ? f(e, t, s) : _(e);
			});
		}
		return c;
	}
	e.coerceAndCheckDataType = l;
	var u = new Set([
		"string",
		"number",
		"integer",
		"boolean",
		"null"
	]);
	function d(e, t) {
		return t ? e.filter((e) => u.has(e) || t === "array" && e === "array") : [];
	}
	function f(e, t, n) {
		let { gen: r, data: a, opts: o } = e, s = r.let("dataType", (0, i._)`typeof ${a}`), c = r.let("coerced", (0, i._)`undefined`);
		o.coerceTypes === "array" && r.if((0, i._)`${s} == 'object' && Array.isArray(${a}) && ${a}.length == 1`, () => r.assign(a, (0, i._)`${a}[0]`).assign(s, (0, i._)`typeof ${a}`).if(h(t, a, o.strictNumbers), () => r.assign(c, a))), r.if((0, i._)`${c} !== undefined`);
		for (let e of n) (u.has(e) || e === "array" && o.coerceTypes === "array") && l(e);
		r.else(), _(e), r.endIf(), r.if((0, i._)`${c} !== undefined`, () => {
			r.assign(a, c), p(e, c);
		});
		function l(e) {
			switch (e) {
				case "string":
					r.elseIf((0, i._)`${s} == "number" || ${s} == "boolean"`).assign(c, (0, i._)`"" + ${a}`).elseIf((0, i._)`${a} === null`).assign(c, (0, i._)`""`);
					return;
				case "number":
					r.elseIf((0, i._)`${s} == "boolean" || ${a} === null
              || (${s} == "string" && ${a} && ${a} == +${a})`).assign(c, (0, i._)`+${a}`);
					return;
				case "integer":
					r.elseIf((0, i._)`${s} === "boolean" || ${a} === null
              || (${s} === "string" && ${a} && ${a} == +${a} && !(${a} % 1))`).assign(c, (0, i._)`+${a}`);
					return;
				case "boolean":
					r.elseIf((0, i._)`${a} === "false" || ${a} === 0 || ${a} === null`).assign(c, !1).elseIf((0, i._)`${a} === "true" || ${a} === 1`).assign(c, !0);
					return;
				case "null":
					r.elseIf((0, i._)`${a} === "" || ${a} === 0 || ${a} === false`), r.assign(c, null);
					return;
				case "array": r.elseIf((0, i._)`${s} === "string" || ${s} === "number"
              || ${s} === "boolean" || ${a} === null`).assign(c, (0, i._)`[${a}]`);
			}
		}
	}
	function p({ gen: e, parentData: t, parentDataProperty: n }, r) {
		e.if((0, i._)`${t} !== undefined`, () => e.assign((0, i._)`${t}[${n}]`, r));
	}
	function m(e, t, n, r = o.Correct) {
		let a = r === o.Correct ? i.operators.EQ : i.operators.NEQ, s;
		switch (e) {
			case "null": return (0, i._)`${t} ${a} null`;
			case "array":
				s = (0, i._)`Array.isArray(${t})`;
				break;
			case "object":
				s = (0, i._)`${t} && typeof ${t} == "object" && !Array.isArray(${t})`;
				break;
			case "integer":
				s = c((0, i._)`!(${t} % 1) && !isNaN(${t})`);
				break;
			case "number":
				s = c();
				break;
			default: return (0, i._)`typeof ${t} ${a} ${e}`;
		}
		return r === o.Correct ? s : (0, i.not)(s);
		function c(e = i.nil) {
			return (0, i.and)((0, i._)`typeof ${t} == "number"`, e, n ? (0, i._)`isFinite(${t})` : i.nil);
		}
	}
	e.checkDataType = m;
	function h(e, t, n, r) {
		if (e.length === 1) return m(e[0], t, n, r);
		let o, s = (0, a.toHash)(e);
		if (s.array && s.object) {
			let e = (0, i._)`typeof ${t} != "object"`;
			o = s.null ? e : (0, i._)`!${t} || ${e}`, delete s.null, delete s.array, delete s.object;
		} else o = i.nil;
		s.number && delete s.integer;
		for (let e in s) o = (0, i.and)(o, m(e, t, n, r));
		return o;
	}
	e.checkDataTypes = h;
	var g = {
		message: ({ schema: e }) => `must be ${e}`,
		params: ({ schema: e, schemaValue: t }) => typeof e == "string" ? (0, i._)`{type: ${e}}` : (0, i._)`{type: ${t}}`
	};
	function _(e) {
		let t = v(e);
		(0, r.reportError)(t, g);
	}
	e.reportTypeError = _;
	function v(e) {
		let { gen: t, data: n, schema: r } = e, i = (0, a.schemaRefOrVal)(e, r, "type");
		return {
			gen: t,
			keyword: "type",
			data: n,
			schema: r.type,
			schemaCode: i,
			schemaValue: i,
			parentSchema: r,
			params: {},
			it: e
		};
	}
})), aa = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.assignDefaults = void 0;
	var t = G(), n = K();
	function r(e, t) {
		let { properties: n, items: r } = e.schema;
		if (t === "object" && n) for (let t in n) i(e, t, n[t].default);
		else t === "array" && Array.isArray(r) && r.forEach((t, n) => i(e, n, t.default));
	}
	e.assignDefaults = r;
	function i(e, r, i) {
		let { gen: a, compositeRule: o, data: s, opts: c } = e;
		if (i === void 0) return;
		let l = (0, t._)`${s}${(0, t.getProperty)(r)}`;
		if (o) {
			(0, n.checkStrictMode)(e, `default is ignored for: ${l}`);
			return;
		}
		let u = (0, t._)`${l} === undefined`;
		c.useDefaults === "empty" && (u = (0, t._)`${u} || ${l} === null || ${l} === ""`), a.if(u, (0, t._)`${l} = ${(0, t.stringify)(i)}`);
	}
})), oa = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.validateUnion = e.validateArray = e.usePattern = e.callValidateCode = e.schemaProperties = e.allSchemaProperties = e.noPropertyInData = e.propertyInData = e.isOwnProperty = e.hasPropFunc = e.reportMissingProp = e.checkMissingProp = e.checkReportMissingProp = void 0;
	var t = G(), n = K(), r = $i(), i = K();
	function a(e, n) {
		let { gen: r, data: i, it: a } = e;
		r.if(d(r, i, n, a.opts.ownProperties), () => {
			e.setParams({ missingProperty: (0, t._)`${n}` }, !0), e.error();
		});
	}
	e.checkReportMissingProp = a;
	function o({ gen: e, data: n, it: { opts: r } }, i, a) {
		return (0, t.or)(...i.map((i) => (0, t.and)(d(e, n, i, r.ownProperties), (0, t._)`${a} = ${i}`)));
	}
	e.checkMissingProp = o;
	function s(e, t) {
		e.setParams({ missingProperty: t }, !0), e.error();
	}
	e.reportMissingProp = s;
	function c(e) {
		return e.scopeValue("func", {
			ref: Object.prototype.hasOwnProperty,
			code: (0, t._)`Object.prototype.hasOwnProperty`
		});
	}
	e.hasPropFunc = c;
	function l(e, n, r) {
		return (0, t._)`${c(e)}.call(${n}, ${r})`;
	}
	e.isOwnProperty = l;
	function u(e, n, r, i) {
		let a = (0, t._)`${n}${(0, t.getProperty)(r)} !== undefined`;
		return i ? (0, t._)`${a} && ${l(e, n, r)}` : a;
	}
	e.propertyInData = u;
	function d(e, n, r, i) {
		let a = (0, t._)`${n}${(0, t.getProperty)(r)} === undefined`;
		return i ? (0, t.or)(a, (0, t.not)(l(e, n, r))) : a;
	}
	e.noPropertyInData = d;
	function f(e) {
		return e ? Object.keys(e).filter((e) => e !== "__proto__") : [];
	}
	e.allSchemaProperties = f;
	function p(e, t) {
		return f(t).filter((r) => !(0, n.alwaysValidSchema)(e, t[r]));
	}
	e.schemaProperties = p;
	function m({ schemaCode: e, data: n, it: { gen: i, topSchemaRef: a, schemaPath: o, errorPath: s }, it: c }, l, u, d) {
		let f = d ? (0, t._)`${e}, ${n}, ${a}${o}` : n, p = [
			[r.default.instancePath, (0, t.strConcat)(r.default.instancePath, s)],
			[r.default.parentData, c.parentData],
			[r.default.parentDataProperty, c.parentDataProperty],
			[r.default.rootData, r.default.rootData]
		];
		c.opts.dynamicRef && p.push([r.default.dynamicAnchors, r.default.dynamicAnchors]);
		let m = (0, t._)`${f}, ${i.object(...p)}`;
		return u === t.nil ? (0, t._)`${l}(${m})` : (0, t._)`${l}.call(${u}, ${m})`;
	}
	e.callValidateCode = m;
	var h = (0, t._)`new RegExp`;
	function g({ gen: e, it: { opts: n } }, r) {
		let a = n.unicodeRegExp ? "u" : "", { regExp: o } = n.code, s = o(r, a);
		return e.scopeValue("pattern", {
			key: s.toString(),
			ref: s,
			code: (0, t._)`${o.code === "new RegExp" ? h : (0, i.useFunc)(e, o)}(${r}, ${a})`
		});
	}
	e.usePattern = g;
	function _(e) {
		let { gen: r, data: i, keyword: a, it: o } = e, s = r.name("valid");
		if (o.allErrors) {
			let e = r.let("valid", !0);
			return c(() => r.assign(e, !1)), e;
		}
		return r.var(s, !0), c(() => r.break()), s;
		function c(o) {
			let c = r.const("len", (0, t._)`${i}.length`);
			r.forRange("i", 0, c, (i) => {
				e.subschema({
					keyword: a,
					dataProp: i,
					dataPropType: n.Type.Num
				}, s), r.if((0, t.not)(s), o);
			});
		}
	}
	e.validateArray = _;
	function v(e) {
		let { gen: r, schema: i, keyword: a, it: o } = e;
		/* istanbul ignore if */
		if (!Array.isArray(i)) throw Error("ajv implementation error");
		if (i.some((e) => (0, n.alwaysValidSchema)(o, e)) && !o.opts.unevaluated) return;
		let s = r.let("valid", !1), c = r.name("_valid");
		r.block(() => i.forEach((n, i) => {
			let o = e.subschema({
				keyword: a,
				schemaProp: i,
				compositeRule: !0
			}, c);
			r.assign(s, (0, t._)`${s} || ${c}`), e.mergeValidEvaluated(o, c) || r.if((0, t.not)(s));
		})), e.result(s, () => e.reset(), () => e.error(!0));
	}
	e.validateUnion = v;
})), sa = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.validateKeywordUsage = e.validSchemaType = e.funcKeywordCode = e.macroKeywordCode = void 0;
	var t = G(), n = $i(), r = oa(), i = ea();
	function a(e, n) {
		let { gen: r, keyword: i, schema: a, parentSchema: o, it: s } = e, c = n.macro.call(s.self, a, o, s), l = u(r, i, c);
		s.opts.validateSchema !== !1 && s.self.validateSchema(c, !0);
		let d = r.name("valid");
		e.subschema({
			schema: c,
			schemaPath: t.nil,
			errSchemaPath: `${s.errSchemaPath}/${i}`,
			topSchemaRef: l,
			compositeRule: !0
		}, d), e.pass(d, () => e.error(!0));
	}
	e.macroKeywordCode = a;
	function o(e, i) {
		let { gen: a, keyword: o, schema: d, parentSchema: f, $data: p, it: m } = e;
		l(m, i);
		let h = u(a, o, !p && i.compile ? i.compile.call(m.self, d, f, m) : i.validate), g = a.let("valid");
		e.block$data(g, _), e.ok(i.valid ?? g);
		function _() {
			if (i.errors === !1) b(), i.modifying && s(e), x(() => e.error());
			else {
				let t = i.async ? v() : y();
				i.modifying && s(e), x(() => c(e, t));
			}
		}
		function v() {
			let e = a.let("ruleErrs", null);
			return a.try(() => b((0, t._)`await `), (n) => a.assign(g, !1).if((0, t._)`${n} instanceof ${m.ValidationError}`, () => a.assign(e, (0, t._)`${n}.errors`), () => a.throw(n))), e;
		}
		function y() {
			let e = (0, t._)`${h}.errors`;
			return a.assign(e, null), b(t.nil), e;
		}
		function b(o = i.async ? (0, t._)`await ` : t.nil) {
			let s = m.opts.passContext ? n.default.this : n.default.self, c = !("compile" in i && !p || i.schema === !1);
			a.assign(g, (0, t._)`${o}${(0, r.callValidateCode)(e, h, s, c)}`, i.modifying);
		}
		function x(e) {
			a.if((0, t.not)(i.valid ?? g), e);
		}
	}
	e.funcKeywordCode = o;
	function s(e) {
		let { gen: n, data: r, it: i } = e;
		n.if(i.parentData, () => n.assign(r, (0, t._)`${i.parentData}[${i.parentDataProperty}]`));
	}
	function c(e, r) {
		let { gen: a } = e;
		a.if((0, t._)`Array.isArray(${r})`, () => {
			a.assign(n.default.vErrors, (0, t._)`${n.default.vErrors} === null ? ${r} : ${n.default.vErrors}.concat(${r})`).assign(n.default.errors, (0, t._)`${n.default.vErrors}.length`), (0, i.extendErrors)(e);
		}, () => e.error());
	}
	function l({ schemaEnv: e }, t) {
		if (t.async && !e.$async) throw Error("async keyword in sync schema");
	}
	function u(e, n, r) {
		if (r === void 0) throw Error(`keyword "${n}" failed to compile`);
		return e.scopeValue("keyword", typeof r == "function" ? { ref: r } : {
			ref: r,
			code: (0, t.stringify)(r)
		});
	}
	function d(e, t, n = !1) {
		return !t.length || t.some((t) => t === "array" ? Array.isArray(e) : t === "object" ? e && typeof e == "object" && !Array.isArray(e) : typeof e == t || n && e === void 0);
	}
	e.validSchemaType = d;
	function f({ schema: e, opts: t, self: n, errSchemaPath: r }, i, a) {
		/* istanbul ignore if */
		if (Array.isArray(i.keyword) ? !i.keyword.includes(a) : i.keyword !== a) throw Error("ajv implementation error");
		let o = i.dependencies;
		if (o?.some((t) => !Object.prototype.hasOwnProperty.call(e, t))) throw Error(`parent schema must have dependencies of ${a}: ${o.join(",")}`);
		if (i.validateSchema && !i.validateSchema(e[a])) {
			let e = `keyword "${a}" value is invalid at path "${r}": ` + n.errorsText(i.validateSchema.errors);
			if (t.validateSchema === "log") n.logger.error(e);
			else throw Error(e);
		}
	}
	e.validateKeywordUsage = f;
})), ca = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.extendSubschemaMode = e.extendSubschemaData = e.getSubschema = void 0;
	var t = G(), n = K();
	function r(e, { keyword: r, schemaProp: i, schema: a, schemaPath: o, errSchemaPath: s, topSchemaRef: c }) {
		if (r !== void 0 && a !== void 0) throw Error("both \"keyword\" and \"schema\" passed, only one allowed");
		if (r !== void 0) {
			let a = e.schema[r];
			return i === void 0 ? {
				schema: a,
				schemaPath: (0, t._)`${e.schemaPath}${(0, t.getProperty)(r)}`,
				errSchemaPath: `${e.errSchemaPath}/${r}`
			} : {
				schema: a[i],
				schemaPath: (0, t._)`${e.schemaPath}${(0, t.getProperty)(r)}${(0, t.getProperty)(i)}`,
				errSchemaPath: `${e.errSchemaPath}/${r}/${(0, n.escapeFragment)(i)}`
			};
		}
		if (a !== void 0) {
			if (o === void 0 || s === void 0 || c === void 0) throw Error("\"schemaPath\", \"errSchemaPath\" and \"topSchemaRef\" are required with \"schema\"");
			return {
				schema: a,
				schemaPath: o,
				topSchemaRef: c,
				errSchemaPath: s
			};
		}
		throw Error("either \"keyword\" or \"schema\" must be passed");
	}
	e.getSubschema = r;
	function i(e, r, { dataProp: i, dataPropType: a, data: o, dataTypes: s, propertyName: c }) {
		if (o !== void 0 && i !== void 0) throw Error("both \"data\" and \"dataProp\" passed, only one allowed");
		let { gen: l } = r;
		if (i !== void 0) {
			let { errorPath: o, dataPathArr: s, opts: c } = r;
			u(l.let("data", (0, t._)`${r.data}${(0, t.getProperty)(i)}`, !0)), e.errorPath = (0, t.str)`${o}${(0, n.getErrorPath)(i, a, c.jsPropertySyntax)}`, e.parentDataProperty = (0, t._)`${i}`, e.dataPathArr = [...s, e.parentDataProperty];
		}
		o !== void 0 && (u(o instanceof t.Name ? o : l.let("data", o, !0)), c !== void 0 && (e.propertyName = c)), s && (e.dataTypes = s);
		function u(t) {
			e.data = t, e.dataLevel = r.dataLevel + 1, e.dataTypes = [], r.definedProperties = /* @__PURE__ */ new Set(), e.parentData = r.data, e.dataNames = [...r.dataNames, t];
		}
	}
	e.extendSubschemaData = i;
	function a(e, { jtdDiscriminator: t, jtdMetadata: n, compositeRule: r, createErrors: i, allErrors: a }) {
		r !== void 0 && (e.compositeRule = r), i !== void 0 && (e.createErrors = i), a !== void 0 && (e.allErrors = a), e.jtdDiscriminator = t, e.jtdMetadata = n;
	}
	e.extendSubschemaMode = a;
})), la = /* @__PURE__ */ z(((e, t) => {
	var n = t.exports = function(e, t, n) {
		typeof t == "function" && (n = t, t = {}), n = t.cb || n;
		var i = typeof n == "function" ? n : n.pre || function() {}, a = n.post || function() {};
		r(t, i, a, e, "", e);
	};
	n.keywords = {
		additionalItems: !0,
		items: !0,
		contains: !0,
		additionalProperties: !0,
		propertyNames: !0,
		not: !0,
		if: !0,
		then: !0,
		else: !0
	}, n.arrayKeywords = {
		items: !0,
		allOf: !0,
		anyOf: !0,
		oneOf: !0
	}, n.propsKeywords = {
		$defs: !0,
		definitions: !0,
		properties: !0,
		patternProperties: !0,
		dependencies: !0
	}, n.skipKeywords = {
		default: !0,
		enum: !0,
		const: !0,
		required: !0,
		maximum: !0,
		minimum: !0,
		exclusiveMaximum: !0,
		exclusiveMinimum: !0,
		multipleOf: !0,
		maxLength: !0,
		minLength: !0,
		pattern: !0,
		format: !0,
		maxItems: !0,
		minItems: !0,
		uniqueItems: !0,
		maxProperties: !0,
		minProperties: !0
	};
	function r(e, t, a, o, s, c, l, u, d, f) {
		if (o && typeof o == "object" && !Array.isArray(o)) {
			for (var p in t(o, s, c, l, u, d, f), o) {
				var m = o[p];
				if (Array.isArray(m)) {
					if (p in n.arrayKeywords) for (var h = 0; h < m.length; h++) r(e, t, a, m[h], s + "/" + p + "/" + h, c, s, p, o, h);
				} else if (p in n.propsKeywords) {
					if (m && typeof m == "object") for (var g in m) r(e, t, a, m[g], s + "/" + p + "/" + i(g), c, s, p, o, g);
				} else (p in n.keywords || e.allKeys && !(p in n.skipKeywords)) && r(e, t, a, m, s + "/" + p, c, s, p, o);
			}
			a(o, s, c, l, u, d, f);
		}
	}
	function i(e) {
		return e.replace(/~/g, "~0").replace(/\//g, "~1");
	}
})), ua = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.getSchemaRefs = e.resolveUrl = e.normalizeId = e._getFullPath = e.getFullPath = e.inlineRef = void 0;
	var t = K(), n = $t(), r = la(), i = new Set([
		"type",
		"format",
		"pattern",
		"maxLength",
		"minLength",
		"maxProperties",
		"minProperties",
		"maxItems",
		"minItems",
		"maximum",
		"minimum",
		"uniqueItems",
		"multipleOf",
		"required",
		"enum",
		"const"
	]);
	function a(e, t = !0) {
		return typeof e == "boolean" ? !0 : t === !0 ? !s(e) : t ? c(e) <= t : !1;
	}
	e.inlineRef = a;
	var o = new Set([
		"$ref",
		"$recursiveRef",
		"$recursiveAnchor",
		"$dynamicRef",
		"$dynamicAnchor"
	]);
	function s(e) {
		for (let t in e) {
			if (o.has(t)) return !0;
			let n = e[t];
			if (Array.isArray(n) && n.some(s) || typeof n == "object" && s(n)) return !0;
		}
		return !1;
	}
	function c(e) {
		let n = 0;
		for (let r in e) if (r === "$ref" || (n++, !i.has(r) && (typeof e[r] == "object" && (0, t.eachItem)(e[r], (e) => n += c(e)), n === Infinity))) return Infinity;
		return n;
	}
	function l(e, t = "", n) {
		return n !== !1 && (t = f(t)), u(e, e.parse(t));
	}
	e.getFullPath = l;
	function u(e, t) {
		return e.serialize(t).split("#")[0] + "#";
	}
	e._getFullPath = u;
	var d = /#\/?$/;
	function f(e) {
		return e ? e.replace(d, "") : "";
	}
	e.normalizeId = f;
	function p(e, t, n) {
		return n = f(n), e.resolve(t, n);
	}
	e.resolveUrl = p;
	var m = /^[a-z_][-a-z0-9._]*$/i;
	function h(e, t) {
		if (typeof e == "boolean") return {};
		let { schemaId: i, uriResolver: a } = this.opts, o = f(e[i] || t), s = { "": o }, c = l(a, o, !1), u = {}, d = /* @__PURE__ */ new Set();
		return r(e, { allKeys: !0 }, (e, t, n, r) => {
			if (r === void 0) return;
			let a = c + t, o = s[r];
			typeof e[i] == "string" && (o = l.call(this, e[i])), g.call(this, e.$anchor), g.call(this, e.$dynamicAnchor), s[t] = o;
			function l(t) {
				let n = this.opts.uriResolver.resolve;
				if (t = f(o ? n(o, t) : t), d.has(t)) throw h(t);
				d.add(t);
				let r = this.refs[t];
				return typeof r == "string" && (r = this.refs[r]), typeof r == "object" ? p(e, r.schema, t) : t !== f(a) && (t[0] === "#" ? (p(e, u[t], t), u[t] = e) : this.refs[t] = a), t;
			}
			function g(e) {
				if (typeof e == "string") {
					if (!m.test(e)) throw Error(`invalid anchor "${e}"`);
					l.call(this, `#${e}`);
				}
			}
		}), u;
		function p(e, t, r) {
			if (t !== void 0 && !n(e, t)) throw h(r);
		}
		function h(e) {
			return /* @__PURE__ */ Error(`reference "${e}" resolves to more than one schema`);
		}
	}
	e.getSchemaRefs = h;
})), da = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.getData = e.KeywordCxt = e.validateFunctionCode = void 0;
	var t = ta(), n = ia(), r = ra(), i = ia(), a = aa(), o = sa(), s = ca(), c = G(), l = $i(), u = ua(), d = K(), f = ea();
	function p(e) {
		if (S(e) && (ee(e), x(e))) {
			_(e);
			return;
		}
		m(e, () => (0, t.topBoolOrEmptySchema)(e));
	}
	e.validateFunctionCode = p;
	function m({ gen: e, validateName: t, schema: n, schemaEnv: r, opts: i }, a) {
		i.code.es5 ? e.func(t, (0, c._)`${l.default.data}, ${l.default.valCxt}`, r.$async, () => {
			e.code((0, c._)`"use strict"; ${y(n, i)}`), g(e, i), e.code(a);
		}) : e.func(t, (0, c._)`${l.default.data}, ${h(i)}`, r.$async, () => e.code(y(n, i)).code(a));
	}
	function h(e) {
		return (0, c._)`{${l.default.instancePath}="", ${l.default.parentData}, ${l.default.parentDataProperty}, ${l.default.rootData}=${l.default.data}${e.dynamicRef ? (0, c._)`, ${l.default.dynamicAnchors}={}` : c.nil}}={}`;
	}
	function g(e, t) {
		e.if(l.default.valCxt, () => {
			e.var(l.default.instancePath, (0, c._)`${l.default.valCxt}.${l.default.instancePath}`), e.var(l.default.parentData, (0, c._)`${l.default.valCxt}.${l.default.parentData}`), e.var(l.default.parentDataProperty, (0, c._)`${l.default.valCxt}.${l.default.parentDataProperty}`), e.var(l.default.rootData, (0, c._)`${l.default.valCxt}.${l.default.rootData}`), t.dynamicRef && e.var(l.default.dynamicAnchors, (0, c._)`${l.default.valCxt}.${l.default.dynamicAnchors}`);
		}, () => {
			e.var(l.default.instancePath, (0, c._)`""`), e.var(l.default.parentData, (0, c._)`undefined`), e.var(l.default.parentDataProperty, (0, c._)`undefined`), e.var(l.default.rootData, l.default.data), t.dynamicRef && e.var(l.default.dynamicAnchors, (0, c._)`{}`);
		});
	}
	function _(e) {
		let { schema: t, opts: n, gen: r } = e;
		m(e, () => {
			n.$comment && t.$comment && te(e), E(e), r.let(l.default.vErrors, null), r.let(l.default.errors, 0), n.unevaluated && v(e), w(e), ne(e);
		});
	}
	function v(e) {
		let { gen: t, validateName: n } = e;
		e.evaluated = t.const("evaluated", (0, c._)`${n}.evaluated`), t.if((0, c._)`${e.evaluated}.dynamicProps`, () => t.assign((0, c._)`${e.evaluated}.props`, (0, c._)`undefined`)), t.if((0, c._)`${e.evaluated}.dynamicItems`, () => t.assign((0, c._)`${e.evaluated}.items`, (0, c._)`undefined`));
	}
	function y(e, t) {
		let n = typeof e == "object" && e[t.schemaId];
		return n && (t.code.source || t.code.process) ? (0, c._)`/*# sourceURL=${n} */` : c.nil;
	}
	function b(e, n) {
		if (S(e) && (ee(e), x(e))) {
			C(e, n);
			return;
		}
		(0, t.boolOrEmptySchema)(e, n);
	}
	function x({ schema: e, self: t }) {
		if (typeof e == "boolean") return !e;
		for (let n in e) if (t.RULES.all[n]) return !0;
		return !1;
	}
	function S(e) {
		return typeof e.schema != "boolean";
	}
	function C(e, t) {
		let { schema: n, gen: r, opts: i } = e;
		i.$comment && n.$comment && te(e), D(e), O(e);
		let a = r.const("_errs", l.default.errors);
		w(e, a), r.var(t, (0, c._)`${a} === ${l.default.errors}`);
	}
	function ee(e) {
		(0, d.checkUnknownRules)(e), T(e);
	}
	function w(e, t) {
		if (e.opts.jtd) return ie(e, [], !1, t);
		let r = (0, n.getSchemaTypes)(e.schema);
		ie(e, r, !(0, n.coerceAndCheckDataType)(e, r), t);
	}
	function T(e) {
		let { schema: t, errSchemaPath: n, opts: r, self: i } = e;
		t.$ref && r.ignoreKeywordsWithRef && (0, d.schemaHasRulesButRef)(t, i.RULES) && i.logger.warn(`$ref: keywords ignored in schema at path "${n}"`);
	}
	function E(e) {
		let { schema: t, opts: n } = e;
		t.default !== void 0 && n.useDefaults && n.strictSchema && (0, d.checkStrictMode)(e, "default is ignored in the schema root");
	}
	function D(e) {
		let t = e.schema[e.opts.schemaId];
		t && (e.baseId = (0, u.resolveUrl)(e.opts.uriResolver, e.baseId, t));
	}
	function O(e) {
		if (e.schema.$async && !e.schemaEnv.$async) throw Error("async schema in sync schema");
	}
	function te({ gen: e, schemaEnv: t, schema: n, errSchemaPath: r, opts: i }) {
		let a = n.$comment;
		if (i.$comment === !0) e.code((0, c._)`${l.default.self}.logger.log(${a})`);
		else if (typeof i.$comment == "function") {
			let n = (0, c.str)`${r}/$comment`, i = e.scopeValue("root", { ref: t.root });
			e.code((0, c._)`${l.default.self}.opts.$comment(${a}, ${n}, ${i}.schema)`);
		}
	}
	function ne(e) {
		let { gen: t, schemaEnv: n, validateName: r, ValidationError: i, opts: a } = e;
		n.$async ? t.if((0, c._)`${l.default.errors} === 0`, () => t.return(l.default.data), () => t.throw((0, c._)`new ${i}(${l.default.vErrors})`)) : (t.assign((0, c._)`${r}.errors`, l.default.vErrors), a.unevaluated && re(e), t.return((0, c._)`${l.default.errors} === 0`));
	}
	function re({ gen: e, evaluated: t, props: n, items: r }) {
		n instanceof c.Name && e.assign((0, c._)`${t}.props`, n), r instanceof c.Name && e.assign((0, c._)`${t}.items`, r);
	}
	function ie(e, t, n, a) {
		let { gen: o, schema: s, data: u, allErrors: f, opts: p, self: m } = e, { RULES: h } = m;
		if (s.$ref && (p.ignoreKeywordsWithRef || !(0, d.schemaHasRulesButRef)(s, h))) {
			o.block(() => k(e, "$ref", h.all.$ref.definition));
			return;
		}
		p.jtd || oe(e, t), o.block(() => {
			for (let e of h.rules) g(e);
			g(h.post);
		});
		function g(d) {
			(0, r.shouldUseGroup)(s, d) && (d.type ? (o.if((0, i.checkDataType)(d.type, u, p.strictNumbers)), ae(e, d), t.length === 1 && t[0] === d.type && n && (o.else(), (0, i.reportTypeError)(e)), o.endIf()) : ae(e, d), f || o.if((0, c._)`${l.default.errors} === ${a || 0}`));
		}
	}
	function ae(e, t) {
		let { gen: n, schema: i, opts: { useDefaults: o } } = e;
		o && (0, a.assignDefaults)(e, t.type), n.block(() => {
			for (let n of t.rules) (0, r.shouldUseRule)(i, n) && k(e, n.keyword, n.definition, t.type);
		});
	}
	function oe(e, t) {
		e.schemaEnv.meta || !e.opts.strictTypes || (se(e, t), e.opts.allowUnionTypes || ce(e, t), le(e, e.dataTypes));
	}
	function se(e, t) {
		if (t.length) {
			if (!e.dataTypes.length) {
				e.dataTypes = t;
				return;
			}
			t.forEach((t) => {
				de(e.dataTypes, t) || pe(e, `type "${t}" not allowed by context "${e.dataTypes.join(",")}"`);
			}), fe(e, t);
		}
	}
	function ce(e, t) {
		t.length > 1 && !(t.length === 2 && t.includes("null")) && pe(e, "use allowUnionTypes to allow union type keyword");
	}
	function le(e, t) {
		let n = e.self.RULES.all;
		for (let i in n) {
			let a = n[i];
			if (typeof a == "object" && (0, r.shouldUseRule)(e.schema, a)) {
				let { type: n } = a.definition;
				n.length && !n.some((e) => ue(t, e)) && pe(e, `missing type "${n.join(",")}" for keyword "${i}"`);
			}
		}
	}
	function ue(e, t) {
		return e.includes(t) || t === "number" && e.includes("integer");
	}
	function de(e, t) {
		return e.includes(t) || t === "integer" && e.includes("number");
	}
	function fe(e, t) {
		let n = [];
		for (let r of e.dataTypes) de(t, r) ? n.push(r) : t.includes("integer") && r === "number" && n.push("integer");
		e.dataTypes = n;
	}
	function pe(e, t) {
		let n = e.schemaEnv.baseId + e.errSchemaPath;
		t += ` at "${n}" (strictTypes)`, (0, d.checkStrictMode)(e, t, e.opts.strictTypes);
	}
	var me = class {
		constructor(e, t, n) {
			if ((0, o.validateKeywordUsage)(e, t, n), this.gen = e.gen, this.allErrors = e.allErrors, this.keyword = n, this.data = e.data, this.schema = e.schema[n], this.$data = t.$data && e.opts.$data && this.schema && this.schema.$data, this.schemaValue = (0, d.schemaRefOrVal)(e, this.schema, n, this.$data), this.schemaType = t.schemaType, this.parentSchema = e.schema, this.params = {}, this.it = e, this.def = t, this.$data) this.schemaCode = e.gen.const("vSchema", ge(this.$data, e));
			else if (this.schemaCode = this.schemaValue, !(0, o.validSchemaType)(this.schema, t.schemaType, t.allowUndefined)) throw Error(`${n} value must be ${JSON.stringify(t.schemaType)}`);
			("code" in t ? t.trackErrors : t.errors !== !1) && (this.errsCount = e.gen.const("_errs", l.default.errors));
		}
		result(e, t, n) {
			this.failResult((0, c.not)(e), t, n);
		}
		failResult(e, t, n) {
			this.gen.if(e), n ? n() : this.error(), t ? (this.gen.else(), t(), this.allErrors && this.gen.endIf()) : this.allErrors ? this.gen.endIf() : this.gen.else();
		}
		pass(e, t) {
			this.failResult((0, c.not)(e), void 0, t);
		}
		fail(e) {
			if (e === void 0) {
				this.error(), this.allErrors || this.gen.if(!1);
				return;
			}
			this.gen.if(e), this.error(), this.allErrors ? this.gen.endIf() : this.gen.else();
		}
		fail$data(e) {
			if (!this.$data) return this.fail(e);
			let { schemaCode: t } = this;
			this.fail((0, c._)`${t} !== undefined && (${(0, c.or)(this.invalid$data(), e)})`);
		}
		error(e, t, n) {
			if (t) {
				this.setParams(t), this._error(e, n), this.setParams({});
				return;
			}
			this._error(e, n);
		}
		_error(e, t) {
			(e ? f.reportExtraError : f.reportError)(this, this.def.error, t);
		}
		$dataError() {
			(0, f.reportError)(this, this.def.$dataError || f.keyword$DataError);
		}
		reset() {
			if (this.errsCount === void 0) throw Error("add \"trackErrors\" to keyword definition");
			(0, f.resetErrorsCount)(this.gen, this.errsCount);
		}
		ok(e) {
			this.allErrors || this.gen.if(e);
		}
		setParams(e, t) {
			t ? Object.assign(this.params, e) : this.params = e;
		}
		block$data(e, t, n = c.nil) {
			this.gen.block(() => {
				this.check$data(e, n), t();
			});
		}
		check$data(e = c.nil, t = c.nil) {
			if (!this.$data) return;
			let { gen: n, schemaCode: r, schemaType: i, def: a } = this;
			n.if((0, c.or)((0, c._)`${r} === undefined`, t)), e !== c.nil && n.assign(e, !0), (i.length || a.validateSchema) && (n.elseIf(this.invalid$data()), this.$dataError(), e !== c.nil && n.assign(e, !1)), n.else();
		}
		invalid$data() {
			let { gen: e, schemaCode: t, schemaType: n, def: r, it: a } = this;
			return (0, c.or)(o(), s());
			function o() {
				if (n.length) {
					/* istanbul ignore if */
					if (!(t instanceof c.Name)) throw Error("ajv implementation error");
					let e = Array.isArray(n) ? n : [n];
					return (0, c._)`${(0, i.checkDataTypes)(e, t, a.opts.strictNumbers, i.DataType.Wrong)}`;
				}
				return c.nil;
			}
			function s() {
				if (r.validateSchema) {
					let n = e.scopeValue("validate$data", { ref: r.validateSchema });
					return (0, c._)`!${n}(${t})`;
				}
				return c.nil;
			}
		}
		subschema(e, t) {
			let n = (0, s.getSubschema)(this.it, e);
			(0, s.extendSubschemaData)(n, this.it, e), (0, s.extendSubschemaMode)(n, e);
			let r = {
				...this.it,
				...n,
				items: void 0,
				props: void 0
			};
			return b(r, t), r;
		}
		mergeEvaluated(e, t) {
			let { it: n, gen: r } = this;
			n.opts.unevaluated && (n.props !== !0 && e.props !== void 0 && (n.props = d.mergeEvaluated.props(r, e.props, n.props, t)), n.items !== !0 && e.items !== void 0 && (n.items = d.mergeEvaluated.items(r, e.items, n.items, t)));
		}
		mergeValidEvaluated(e, t) {
			let { it: n, gen: r } = this;
			if (n.opts.unevaluated && (n.props !== !0 || n.items !== !0)) return r.if(t, () => this.mergeEvaluated(e, c.Name)), !0;
		}
	};
	e.KeywordCxt = me;
	function k(e, t, n, r) {
		let i = new me(e, n, t);
		"code" in n ? n.code(i, r) : i.$data && n.validate ? (0, o.funcKeywordCode)(i, n) : "macro" in n ? (0, o.macroKeywordCode)(i, n) : (n.compile || n.validate) && (0, o.funcKeywordCode)(i, n);
	}
	var he = /^\/(?:[^~]|~0|~1)*$/, A = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
	function ge(e, { dataLevel: t, dataNames: n, dataPathArr: r }) {
		let i, a;
		if (e === "") return l.default.rootData;
		if (e[0] === "/") {
			if (!he.test(e)) throw Error(`Invalid JSON-pointer: ${e}`);
			i = e, a = l.default.rootData;
		} else {
			let o = A.exec(e);
			if (!o) throw Error(`Invalid JSON-pointer: ${e}`);
			let s = +o[1];
			if (i = o[2], i === "#") {
				if (s >= t) throw Error(u("property/index", s));
				return r[t - s];
			}
			if (s > t) throw Error(u("data", s));
			if (a = n[t - s], !i) return a;
		}
		let o = a, s = i.split("/");
		for (let e of s) e && (a = (0, c._)`${a}${(0, c.getProperty)((0, d.unescapeJsonPointer)(e))}`, o = (0, c._)`${o} && ${a}`);
		return o;
		function u(e, n) {
			return `Cannot access ${e} ${n} levels up, current level is ${t}`;
		}
	}
	e.getData = ge;
})), fa = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = class extends Error {
		constructor(e) {
			super("validation failed"), this.errors = e, this.ajv = this.validation = !0;
		}
	};
})), pa = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = ua();
	e.default = class extends Error {
		constructor(e, n, r, i) {
			super(i || `can't resolve reference ${r} from id ${n}`), this.missingRef = (0, t.resolveUrl)(e, n, r), this.missingSchema = (0, t.normalizeId)((0, t.getFullPath)(e, this.missingRef));
		}
	};
})), ma = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.resolveSchema = e.getCompilingSchema = e.resolveRef = e.compileSchema = e.SchemaEnv = void 0;
	var t = G(), n = fa(), r = $i(), i = ua(), a = K(), o = da(), s = class {
		constructor(e) {
			this.refs = {}, this.dynamicAnchors = {};
			let t;
			typeof e.schema == "object" && (t = e.schema), this.schema = e.schema, this.schemaId = e.schemaId, this.root = e.root || this, this.baseId = e.baseId ?? (0, i.normalizeId)(t?.[e.schemaId || "$id"]), this.schemaPath = e.schemaPath, this.localRefs = e.localRefs, this.meta = e.meta, this.$async = t?.$async, this.refs = {};
		}
	};
	e.SchemaEnv = s;
	function c(e) {
		let a = d.call(this, e);
		if (a) return a;
		let s = (0, i.getFullPath)(this.opts.uriResolver, e.root.baseId), { es5: c, lines: l } = this.opts.code, { ownProperties: u } = this.opts, f = new t.CodeGen(this.scope, {
			es5: c,
			lines: l,
			ownProperties: u
		}), p;
		e.$async && (p = f.scopeValue("Error", {
			ref: n.default,
			code: (0, t._)`require("ajv/dist/runtime/validation_error").default`
		}));
		let m = f.scopeName("validate");
		e.validateName = m;
		let h = {
			gen: f,
			allErrors: this.opts.allErrors,
			data: r.default.data,
			parentData: r.default.parentData,
			parentDataProperty: r.default.parentDataProperty,
			dataNames: [r.default.data],
			dataPathArr: [t.nil],
			dataLevel: 0,
			dataTypes: [],
			definedProperties: /* @__PURE__ */ new Set(),
			topSchemaRef: f.scopeValue("schema", this.opts.code.source === !0 ? {
				ref: e.schema,
				code: (0, t.stringify)(e.schema)
			} : { ref: e.schema }),
			validateName: m,
			ValidationError: p,
			schema: e.schema,
			schemaEnv: e,
			rootId: s,
			baseId: e.baseId || s,
			schemaPath: t.nil,
			errSchemaPath: e.schemaPath || (this.opts.jtd ? "" : "#"),
			errorPath: (0, t._)`""`,
			opts: this.opts,
			self: this
		}, g;
		try {
			this._compilations.add(e), (0, o.validateFunctionCode)(h), f.optimize(this.opts.code.optimize);
			let n = f.toString();
			g = `${f.scopeRefs(r.default.scope)}return ${n}`, this.opts.code.process && (g = this.opts.code.process(g, e));
			let i = Function(`${r.default.self}`, `${r.default.scope}`, g)(this, this.scope.get());
			if (this.scope.value(m, { ref: i }), i.errors = null, i.schema = e.schema, i.schemaEnv = e, e.$async && (i.$async = !0), this.opts.code.source === !0 && (i.source = {
				validateName: m,
				validateCode: n,
				scopeValues: f._values
			}), this.opts.unevaluated) {
				let { props: e, items: n } = h;
				i.evaluated = {
					props: e instanceof t.Name ? void 0 : e,
					items: n instanceof t.Name ? void 0 : n,
					dynamicProps: e instanceof t.Name,
					dynamicItems: n instanceof t.Name
				}, i.source && (i.source.evaluated = (0, t.stringify)(i.evaluated));
			}
			return e.validate = i, e;
		} catch (t) {
			throw delete e.validate, delete e.validateName, g && this.logger.error("Error compiling schema, function code:", g), t;
		} finally {
			this._compilations.delete(e);
		}
	}
	e.compileSchema = c;
	function l(e, t, n) {
		n = (0, i.resolveUrl)(this.opts.uriResolver, t, n);
		let r = e.refs[n];
		if (r) return r;
		let a = p.call(this, e, n);
		if (a === void 0) {
			let r = e.localRefs?.[n], { schemaId: i } = this.opts;
			r && (a = new s({
				schema: r,
				schemaId: i,
				root: e,
				baseId: t
			}));
		}
		if (a !== void 0) return e.refs[n] = u.call(this, a);
	}
	e.resolveRef = l;
	function u(e) {
		return (0, i.inlineRef)(e.schema, this.opts.inlineRefs) ? e.schema : e.validate ? e : c.call(this, e);
	}
	function d(e) {
		for (let t of this._compilations) if (f(t, e)) return t;
	}
	e.getCompilingSchema = d;
	function f(e, t) {
		return e.schema === t.schema && e.root === t.root && e.baseId === t.baseId;
	}
	function p(e, t) {
		let n;
		for (; typeof (n = this.refs[t]) == "string";) t = n;
		return n || this.schemas[t] || m.call(this, e, t);
	}
	function m(e, t) {
		let n = this.opts.uriResolver.parse(t), r = (0, i._getFullPath)(this.opts.uriResolver, n), a = (0, i.getFullPath)(this.opts.uriResolver, e.baseId, void 0);
		if (Object.keys(e.schema).length > 0 && r === a) return g.call(this, n, e);
		let o = (0, i.normalizeId)(r), l = this.refs[o] || this.schemas[o];
		if (typeof l == "string") {
			let t = m.call(this, e, l);
			return typeof t?.schema == "object" ? g.call(this, n, t) : void 0;
		}
		if (typeof l?.schema == "object") {
			if (l.validate || c.call(this, l), o === (0, i.normalizeId)(t)) {
				let { schema: t } = l, { schemaId: n } = this.opts, r = t[n];
				return r && (a = (0, i.resolveUrl)(this.opts.uriResolver, a, r)), new s({
					schema: t,
					schemaId: n,
					root: e,
					baseId: a
				});
			}
			return g.call(this, n, l);
		}
	}
	e.resolveSchema = m;
	var h = new Set([
		"properties",
		"patternProperties",
		"enum",
		"dependencies",
		"definitions"
	]);
	function g(e, { baseId: t, schema: n, root: r }) {
		if (e.fragment?.[0] !== "/") return;
		for (let r of e.fragment.slice(1).split("/")) {
			if (typeof n == "boolean") return;
			let e = n[(0, a.unescapeFragment)(r)];
			if (e === void 0) return;
			n = e;
			let o = typeof n == "object" && n[this.opts.schemaId];
			!h.has(r) && o && (t = (0, i.resolveUrl)(this.opts.uriResolver, t, o));
		}
		let o;
		if (typeof n != "boolean" && n.$ref && !(0, a.schemaHasRulesButRef)(n, this.RULES)) {
			let e = (0, i.resolveUrl)(this.opts.uriResolver, t, n.$ref);
			o = m.call(this, r, e);
		}
		let { schemaId: c } = this.opts;
		if (o ||= new s({
			schema: n,
			schemaId: c,
			root: r,
			baseId: t
		}), o.schema !== o.root.schema) return o;
	}
})), ha = /* @__PURE__ */ Je({
	$id: () => ga,
	additionalProperties: () => !1,
	default: () => xa,
	description: () => _a,
	properties: () => ba,
	required: () => ya,
	type: () => va
}), ga, _a, va, ya, ba, xa, Sa = qe((() => {
	ga = "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#", _a = "Meta-schema for $data reference (JSON AnySchema extension proposal)", va = "object", ya = ["$data"], ba = { $data: {
		type: "string",
		anyOf: [{ format: "relative-json-pointer" }, { format: "json-pointer" }]
	} }, xa = {
		$id: ga,
		description: _a,
		type: va,
		required: ya,
		properties: ba,
		additionalProperties: !1
	};
})), Ca = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = _n();
	t.code = "require(\"ajv/dist/runtime/uri\").default", e.default = t;
})), wa = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.CodeGen = e.Name = e.nil = e.stringify = e.str = e._ = e.KeywordCxt = void 0;
	var t = da();
	Object.defineProperty(e, "KeywordCxt", {
		enumerable: !0,
		get: function() {
			return t.KeywordCxt;
		}
	});
	var n = G();
	Object.defineProperty(e, "_", {
		enumerable: !0,
		get: function() {
			return n._;
		}
	}), Object.defineProperty(e, "str", {
		enumerable: !0,
		get: function() {
			return n.str;
		}
	}), Object.defineProperty(e, "stringify", {
		enumerable: !0,
		get: function() {
			return n.stringify;
		}
	}), Object.defineProperty(e, "nil", {
		enumerable: !0,
		get: function() {
			return n.nil;
		}
	}), Object.defineProperty(e, "Name", {
		enumerable: !0,
		get: function() {
			return n.Name;
		}
	}), Object.defineProperty(e, "CodeGen", {
		enumerable: !0,
		get: function() {
			return n.CodeGen;
		}
	});
	var r = fa(), i = pa(), a = na(), o = ma(), s = G(), c = ua(), l = ia(), u = K(), d = (Sa(), Ze(ha).default), f = Ca(), p = (e, t) => new RegExp(e, t);
	p.code = "new RegExp";
	var m = [
		"removeAdditional",
		"useDefaults",
		"coerceTypes"
	], h = new Set([
		"validate",
		"serialize",
		"parse",
		"wrapper",
		"root",
		"schema",
		"keyword",
		"pattern",
		"formats",
		"validate$data",
		"func",
		"obj",
		"Error"
	]), g = {
		errorDataPath: "",
		format: "`validateFormats: false` can be used instead.",
		nullable: "\"nullable\" keyword is supported by default.",
		jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
		extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
		missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
		processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
		sourceCode: "Use option `code: {source: true}`",
		strictDefaults: "It is default now, see option `strict`.",
		strictKeywords: "It is default now, see option `strict`.",
		uniqueItems: "\"uniqueItems\" keyword is always validated.",
		unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
		cache: "Map is used as cache, schema object as key.",
		serialize: "Map is used as cache, schema object as key.",
		ajvErrors: "It is default now."
	}, _ = {
		ignoreKeywordsWithRef: "",
		jsPropertySyntax: "",
		unicode: "\"minLength\"/\"maxLength\" account for unicode characters by default."
	}, v = 200;
	function y(e) {
		let t = e.strict, n = e.code?.optimize, r = n === !0 || n === void 0 ? 1 : n || 0, i = e.code?.regExp ?? p, a = e.uriResolver ?? f.default;
		return {
			strictSchema: e.strictSchema ?? t ?? !0,
			strictNumbers: e.strictNumbers ?? t ?? !0,
			strictTypes: e.strictTypes ?? t ?? "log",
			strictTuples: e.strictTuples ?? t ?? "log",
			strictRequired: e.strictRequired ?? t ?? !1,
			code: e.code ? {
				...e.code,
				optimize: r,
				regExp: i
			} : {
				optimize: r,
				regExp: i
			},
			loopRequired: e.loopRequired ?? v,
			loopEnum: e.loopEnum ?? v,
			meta: e.meta ?? !0,
			messages: e.messages ?? !0,
			inlineRefs: e.inlineRefs ?? !0,
			schemaId: e.schemaId ?? "$id",
			addUsedSchema: e.addUsedSchema ?? !0,
			validateSchema: e.validateSchema ?? !0,
			validateFormats: e.validateFormats ?? !0,
			unicodeRegExp: e.unicodeRegExp ?? !0,
			int32range: e.int32range ?? !0,
			uriResolver: a
		};
	}
	var b = class {
		constructor(e = {}) {
			this.schemas = {}, this.refs = {}, this.formats = {}, this._compilations = /* @__PURE__ */ new Set(), this._loading = {}, this._cache = /* @__PURE__ */ new Map(), e = this.opts = {
				...e,
				...y(e)
			};
			let { es5: t, lines: n } = this.opts.code;
			this.scope = new s.ValueScope({
				scope: {},
				prefixes: h,
				es5: t,
				lines: n
			}), this.logger = D(e.logger);
			let r = e.validateFormats;
			e.validateFormats = !1, this.RULES = (0, a.getRules)(), x.call(this, g, e, "NOT SUPPORTED"), x.call(this, _, e, "DEPRECATED", "warn"), this._metaOpts = T.call(this), e.formats && ee.call(this), this._addVocabularies(), this._addDefaultMetaSchema(), e.keywords && w.call(this, e.keywords), typeof e.meta == "object" && this.addMetaSchema(e.meta), C.call(this), e.validateFormats = r;
		}
		_addVocabularies() {
			this.addKeyword("$async");
		}
		_addDefaultMetaSchema() {
			let { $data: e, meta: t, schemaId: n } = this.opts, r = d;
			n === "id" && (r = { ...d }, r.id = r.$id, delete r.$id), t && e && this.addMetaSchema(r, r[n], !1);
		}
		defaultMeta() {
			let { meta: e, schemaId: t } = this.opts;
			return this.opts.defaultMeta = typeof e == "object" ? e[t] || e : void 0;
		}
		validate(e, t) {
			let n;
			if (typeof e == "string") {
				if (n = this.getSchema(e), !n) throw Error(`no schema with key or ref "${e}"`);
			} else n = this.compile(e);
			let r = n(t);
			return "$async" in n || (this.errors = n.errors), r;
		}
		compile(e, t) {
			let n = this._addSchema(e, t);
			return n.validate || this._compileSchemaEnv(n);
		}
		compileAsync(e, t) {
			if (typeof this.opts.loadSchema != "function") throw Error("options.loadSchema should be a function");
			let { loadSchema: n } = this.opts;
			return r.call(this, e, t);
			async function r(e, t) {
				await a.call(this, e.$schema);
				let n = this._addSchema(e, t);
				return n.validate || o.call(this, n);
			}
			async function a(e) {
				e && !this.getSchema(e) && await r.call(this, { $ref: e }, !0);
			}
			async function o(e) {
				try {
					return this._compileSchemaEnv(e);
				} catch (t) {
					if (!(t instanceof i.default)) throw t;
					return s.call(this, t), await c.call(this, t.missingSchema), o.call(this, e);
				}
			}
			function s({ missingSchema: e, missingRef: t }) {
				if (this.refs[e]) throw Error(`AnySchema ${e} is loaded but ${t} cannot be resolved`);
			}
			async function c(e) {
				let n = await l.call(this, e);
				this.refs[e] || await a.call(this, n.$schema), this.refs[e] || this.addSchema(n, e, t);
			}
			async function l(e) {
				let t = this._loading[e];
				if (t) return t;
				try {
					return await (this._loading[e] = n(e));
				} finally {
					delete this._loading[e];
				}
			}
		}
		addSchema(e, t, n, r = this.opts.validateSchema) {
			if (Array.isArray(e)) {
				for (let t of e) this.addSchema(t, void 0, n, r);
				return this;
			}
			let i;
			if (typeof e == "object") {
				let { schemaId: t } = this.opts;
				if (i = e[t], i !== void 0 && typeof i != "string") throw Error(`schema ${t} must be string`);
			}
			return t = (0, c.normalizeId)(t || i), this._checkUnique(t), this.schemas[t] = this._addSchema(e, n, t, r, !0), this;
		}
		addMetaSchema(e, t, n = this.opts.validateSchema) {
			return this.addSchema(e, t, !0, n), this;
		}
		validateSchema(e, t) {
			if (typeof e == "boolean") return !0;
			let n;
			if (n = e.$schema, n !== void 0 && typeof n != "string") throw Error("$schema must be a string");
			if (n = n || this.opts.defaultMeta || this.defaultMeta(), !n) return this.logger.warn("meta-schema not available"), this.errors = null, !0;
			let r = this.validate(n, e);
			if (!r && t) {
				let e = "schema is invalid: " + this.errorsText();
				if (this.opts.validateSchema === "log") this.logger.error(e);
				else throw Error(e);
			}
			return r;
		}
		getSchema(e) {
			let t;
			for (; typeof (t = S.call(this, e)) == "string";) e = t;
			if (t === void 0) {
				let { schemaId: n } = this.opts, r = new o.SchemaEnv({
					schema: {},
					schemaId: n
				});
				if (t = o.resolveSchema.call(this, r, e), !t) return;
				this.refs[e] = t;
			}
			return t.validate || this._compileSchemaEnv(t);
		}
		removeSchema(e) {
			if (e instanceof RegExp) return this._removeAllSchemas(this.schemas, e), this._removeAllSchemas(this.refs, e), this;
			switch (typeof e) {
				case "undefined": return this._removeAllSchemas(this.schemas), this._removeAllSchemas(this.refs), this._cache.clear(), this;
				case "string": {
					let t = S.call(this, e);
					return typeof t == "object" && this._cache.delete(t.schema), delete this.schemas[e], delete this.refs[e], this;
				}
				case "object": {
					let t = e;
					this._cache.delete(t);
					let n = e[this.opts.schemaId];
					return n && (n = (0, c.normalizeId)(n), delete this.schemas[n], delete this.refs[n]), this;
				}
				default: throw Error("ajv.removeSchema: invalid parameter");
			}
		}
		addVocabulary(e) {
			for (let t of e) this.addKeyword(t);
			return this;
		}
		addKeyword(e, t) {
			let n;
			if (typeof e == "string") n = e, typeof t == "object" && (this.logger.warn("these parameters are deprecated, see docs for addKeyword"), t.keyword = n);
			else if (typeof e == "object" && t === void 0) {
				if (t = e, n = t.keyword, Array.isArray(n) && !n.length) throw Error("addKeywords: keyword must be string or non-empty array");
			} else throw Error("invalid addKeywords parameters");
			if (te.call(this, n, t), !t) return (0, u.eachItem)(n, (e) => ne.call(this, e)), this;
			ie.call(this, t);
			let r = {
				...t,
				type: (0, l.getJSONTypes)(t.type),
				schemaType: (0, l.getJSONTypes)(t.schemaType)
			};
			return (0, u.eachItem)(n, r.type.length === 0 ? (e) => ne.call(this, e, r) : (e) => r.type.forEach((t) => ne.call(this, e, r, t))), this;
		}
		getKeyword(e) {
			let t = this.RULES.all[e];
			return typeof t == "object" ? t.definition : !!t;
		}
		removeKeyword(e) {
			let { RULES: t } = this;
			delete t.keywords[e], delete t.all[e];
			for (let n of t.rules) {
				let t = n.rules.findIndex((t) => t.keyword === e);
				t >= 0 && n.rules.splice(t, 1);
			}
			return this;
		}
		addFormat(e, t) {
			return typeof t == "string" && (t = new RegExp(t)), this.formats[e] = t, this;
		}
		errorsText(e = this.errors, { separator: t = ", ", dataVar: n = "data" } = {}) {
			return !e || e.length === 0 ? "No errors" : e.map((e) => `${n}${e.instancePath} ${e.message}`).reduce((e, n) => e + t + n);
		}
		$dataMetaSchema(e, t) {
			let n = this.RULES.all;
			e = JSON.parse(JSON.stringify(e));
			for (let r of t) {
				let t = r.split("/").slice(1), i = e;
				for (let e of t) i = i[e];
				for (let e in n) {
					let t = n[e];
					if (typeof t != "object") continue;
					let { $data: r } = t.definition, a = i[e];
					r && a && (i[e] = oe(a));
				}
			}
			return e;
		}
		_removeAllSchemas(e, t) {
			for (let n in e) {
				let r = e[n];
				(!t || t.test(n)) && (typeof r == "string" ? delete e[n] : r && !r.meta && (this._cache.delete(r.schema), delete e[n]));
			}
		}
		_addSchema(e, t, n, r = this.opts.validateSchema, i = this.opts.addUsedSchema) {
			let a, { schemaId: s } = this.opts;
			if (typeof e == "object") a = e[s];
			else if (this.opts.jtd) throw Error("schema must be object");
			else if (typeof e != "boolean") throw Error("schema must be object or boolean");
			let l = this._cache.get(e);
			if (l !== void 0) return l;
			n = (0, c.normalizeId)(a || n);
			let u = c.getSchemaRefs.call(this, e, n);
			return l = new o.SchemaEnv({
				schema: e,
				schemaId: s,
				meta: t,
				baseId: n,
				localRefs: u
			}), this._cache.set(l.schema, l), i && !n.startsWith("#") && (n && this._checkUnique(n), this.refs[n] = l), r && this.validateSchema(e, !0), l;
		}
		_checkUnique(e) {
			if (this.schemas[e] || this.refs[e]) throw Error(`schema with key or id "${e}" already exists`);
		}
		_compileSchemaEnv(e) {
			/* istanbul ignore if */
			if (e.meta ? this._compileMetaSchema(e) : o.compileSchema.call(this, e), !e.validate) throw Error("ajv implementation error");
			return e.validate;
		}
		_compileMetaSchema(e) {
			let t = this.opts;
			this.opts = this._metaOpts;
			try {
				o.compileSchema.call(this, e);
			} finally {
				this.opts = t;
			}
		}
	};
	b.ValidationError = r.default, b.MissingRefError = i.default, e.default = b;
	function x(e, t, n, r = "error") {
		for (let i in e) {
			let a = i;
			a in t && this.logger[r](`${n}: option ${i}. ${e[a]}`);
		}
	}
	function S(e) {
		return e = (0, c.normalizeId)(e), this.schemas[e] || this.refs[e];
	}
	function C() {
		let e = this.opts.schemas;
		if (e) if (Array.isArray(e)) this.addSchema(e);
		else for (let t in e) this.addSchema(e[t], t);
	}
	function ee() {
		for (let e in this.opts.formats) {
			let t = this.opts.formats[e];
			t && this.addFormat(e, t);
		}
	}
	function w(e) {
		if (Array.isArray(e)) {
			this.addVocabulary(e);
			return;
		}
		this.logger.warn("keywords option as map is deprecated, pass array");
		for (let t in e) {
			let n = e[t];
			n.keyword ||= t, this.addKeyword(n);
		}
	}
	function T() {
		let e = { ...this.opts };
		for (let t of m) delete e[t];
		return e;
	}
	var E = {
		log() {},
		warn() {},
		error() {}
	};
	function D(e) {
		if (e === !1) return E;
		if (e === void 0) return console;
		if (e.log && e.warn && e.error) return e;
		throw Error("logger must implement log, warn and error methods");
	}
	var O = /^[a-z_$][a-z0-9_$:-]*$/i;
	function te(e, t) {
		let { RULES: n } = this;
		if ((0, u.eachItem)(e, (e) => {
			if (n.keywords[e]) throw Error(`Keyword ${e} is already defined`);
			if (!O.test(e)) throw Error(`Keyword ${e} has invalid name`);
		}), t && t.$data && !("code" in t || "validate" in t)) throw Error("$data keyword must have \"code\" or \"validate\" function");
	}
	function ne(e, t, n) {
		var r;
		let i = t?.post;
		if (n && i) throw Error("keyword with \"post\" flag cannot have \"type\"");
		let { RULES: a } = this, o = i ? a.post : a.rules.find(({ type: e }) => e === n);
		if (o || (o = {
			type: n,
			rules: []
		}, a.rules.push(o)), a.keywords[e] = !0, !t) return;
		let s = {
			keyword: e,
			definition: {
				...t,
				type: (0, l.getJSONTypes)(t.type),
				schemaType: (0, l.getJSONTypes)(t.schemaType)
			}
		};
		t.before ? re.call(this, o, s, t.before) : o.rules.push(s), a.all[e] = s, (r = t.implements) == null || r.forEach((e) => this.addKeyword(e));
	}
	function re(e, t, n) {
		let r = e.rules.findIndex((e) => e.keyword === n);
		r >= 0 ? e.rules.splice(r, 0, t) : (e.rules.push(t), this.logger.warn(`rule ${n} is not defined`));
	}
	function ie(e) {
		let { metaSchema: t } = e;
		t !== void 0 && (e.$data && this.opts.$data && (t = oe(t)), e.validateSchema = this.compile(t, !0));
	}
	var ae = { $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#" };
	function oe(e) {
		return { anyOf: [e, ae] };
	}
})), Ta = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = {
		keyword: "id",
		code() {
			throw Error("NOT SUPPORTED: keyword \"id\", use \"$id\" for schema ID");
		}
	};
})), Ea = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.callRef = e.getValidate = void 0;
	var t = pa(), n = oa(), r = G(), i = $i(), a = ma(), o = K(), s = {
		keyword: "$ref",
		schemaType: "string",
		code(e) {
			let { gen: n, schema: i, it: o } = e, { baseId: s, schemaEnv: u, validateName: d, opts: f, self: p } = o, { root: m } = u;
			if ((i === "#" || i === "#/") && s === m.baseId) return g();
			let h = a.resolveRef.call(p, m, s, i);
			if (h === void 0) throw new t.default(o.opts.uriResolver, s, i);
			if (h instanceof a.SchemaEnv) return _(h);
			return v(h);
			function g() {
				if (u === m) return l(e, d, u, u.$async);
				let t = n.scopeValue("root", { ref: m });
				return l(e, (0, r._)`${t}.validate`, m, m.$async);
			}
			function _(t) {
				l(e, c(e, t), t, t.$async);
			}
			function v(t) {
				let a = n.scopeValue("schema", f.code.source === !0 ? {
					ref: t,
					code: (0, r.stringify)(t)
				} : { ref: t }), o = n.name("valid"), s = e.subschema({
					schema: t,
					dataTypes: [],
					schemaPath: r.nil,
					topSchemaRef: a,
					errSchemaPath: i
				}, o);
				e.mergeEvaluated(s), e.ok(o);
			}
		}
	};
	function c(e, t) {
		let { gen: n } = e;
		return t.validate ? n.scopeValue("validate", { ref: t.validate }) : (0, r._)`${n.scopeValue("wrapper", { ref: t })}.validate`;
	}
	e.getValidate = c;
	function l(e, t, a, s) {
		let { gen: c, it: l } = e, { allErrors: u, schemaEnv: d, opts: f } = l, p = f.passContext ? i.default.this : r.nil;
		s ? m() : h();
		function m() {
			if (!d.$async) throw Error("async schema referenced by sync schema");
			let i = c.let("valid");
			c.try(() => {
				c.code((0, r._)`await ${(0, n.callValidateCode)(e, t, p)}`), _(t), u || c.assign(i, !0);
			}, (e) => {
				c.if((0, r._)`!(${e} instanceof ${l.ValidationError})`, () => c.throw(e)), g(e), u || c.assign(i, !1);
			}), e.ok(i);
		}
		function h() {
			e.result((0, n.callValidateCode)(e, t, p), () => _(t), () => g(t));
		}
		function g(e) {
			let t = (0, r._)`${e}.errors`;
			c.assign(i.default.vErrors, (0, r._)`${i.default.vErrors} === null ? ${t} : ${i.default.vErrors}.concat(${t})`), c.assign(i.default.errors, (0, r._)`${i.default.vErrors}.length`);
		}
		function _(e) {
			if (!l.opts.unevaluated) return;
			let t = a?.validate?.evaluated;
			if (l.props !== !0) if (t && !t.dynamicProps) t.props !== void 0 && (l.props = o.mergeEvaluated.props(c, t.props, l.props));
			else {
				let t = c.var("props", (0, r._)`${e}.evaluated.props`);
				l.props = o.mergeEvaluated.props(c, t, l.props, r.Name);
			}
			if (l.items !== !0) if (t && !t.dynamicItems) t.items !== void 0 && (l.items = o.mergeEvaluated.items(c, t.items, l.items));
			else {
				let t = c.var("items", (0, r._)`${e}.evaluated.items`);
				l.items = o.mergeEvaluated.items(c, t, l.items, r.Name);
			}
		}
	}
	e.callRef = l, e.default = s;
})), Da = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = Ta(), n = Ea();
	e.default = [
		"$schema",
		"$id",
		"$defs",
		"$vocabulary",
		{ keyword: "$comment" },
		"definitions",
		t.default,
		n.default
	];
})), Oa = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = G(), n = t.operators, r = {
		maximum: {
			okStr: "<=",
			ok: n.LTE,
			fail: n.GT
		},
		minimum: {
			okStr: ">=",
			ok: n.GTE,
			fail: n.LT
		},
		exclusiveMaximum: {
			okStr: "<",
			ok: n.LT,
			fail: n.GTE
		},
		exclusiveMinimum: {
			okStr: ">",
			ok: n.GT,
			fail: n.LTE
		}
	};
	e.default = {
		keyword: Object.keys(r),
		type: "number",
		schemaType: "number",
		$data: !0,
		error: {
			message: ({ keyword: e, schemaCode: n }) => (0, t.str)`must be ${r[e].okStr} ${n}`,
			params: ({ keyword: e, schemaCode: n }) => (0, t._)`{comparison: ${r[e].okStr}, limit: ${n}}`
		},
		code(e) {
			let { keyword: n, data: i, schemaCode: a } = e;
			e.fail$data((0, t._)`${i} ${r[n].fail} ${a} || isNaN(${i})`);
		}
	};
})), ka = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = G();
	e.default = {
		keyword: "multipleOf",
		type: "number",
		schemaType: "number",
		$data: !0,
		error: {
			message: ({ schemaCode: e }) => (0, t.str)`must be multiple of ${e}`,
			params: ({ schemaCode: e }) => (0, t._)`{multipleOf: ${e}}`
		},
		code(e) {
			let { gen: n, data: r, schemaCode: i, it: a } = e, o = a.opts.multipleOfPrecision, s = n.let("res"), c = o ? (0, t._)`Math.abs(Math.round(${s}) - ${s}) > 1e-${o}` : (0, t._)`${s} !== parseInt(${s})`;
			e.fail$data((0, t._)`(${i} === 0 || (${s} = ${r}/${i}, ${c}))`);
		}
	};
})), Aa = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	function t(e) {
		let t = e.length, n = 0, r = 0, i;
		for (; r < t;) n++, i = e.charCodeAt(r++), i >= 55296 && i <= 56319 && r < t && (i = e.charCodeAt(r), (i & 64512) == 56320 && r++);
		return n;
	}
	e.default = t, t.code = "require(\"ajv/dist/runtime/ucs2length\").default";
})), ja = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = G(), n = K(), r = Aa();
	e.default = {
		keyword: ["maxLength", "minLength"],
		type: "string",
		schemaType: "number",
		$data: !0,
		error: {
			message({ keyword: e, schemaCode: n }) {
				let r = e === "maxLength" ? "more" : "fewer";
				return (0, t.str)`must NOT have ${r} than ${n} characters`;
			},
			params: ({ schemaCode: e }) => (0, t._)`{limit: ${e}}`
		},
		code(e) {
			let { keyword: i, data: a, schemaCode: o, it: s } = e, c = i === "maxLength" ? t.operators.GT : t.operators.LT, l = s.opts.unicode === !1 ? (0, t._)`${a}.length` : (0, t._)`${(0, n.useFunc)(e.gen, r.default)}(${a})`;
			e.fail$data((0, t._)`${l} ${c} ${o}`);
		}
	};
})), Ma = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = oa(), n = K(), r = G();
	e.default = {
		keyword: "pattern",
		type: "string",
		schemaType: "string",
		$data: !0,
		error: {
			message: ({ schemaCode: e }) => (0, r.str)`must match pattern "${e}"`,
			params: ({ schemaCode: e }) => (0, r._)`{pattern: ${e}}`
		},
		code(e) {
			let { gen: i, data: a, $data: o, schema: s, schemaCode: c, it: l } = e, u = l.opts.unicodeRegExp ? "u" : "";
			if (o) {
				let { regExp: t } = l.opts.code, o = t.code === "new RegExp" ? (0, r._)`new RegExp` : (0, n.useFunc)(i, t), s = i.let("valid");
				i.try(() => i.assign(s, (0, r._)`${o}(${c}, ${u}).test(${a})`), () => i.assign(s, !1)), e.fail$data((0, r._)`!${s}`);
			} else {
				let n = (0, t.usePattern)(e, s);
				e.fail$data((0, r._)`!${n}.test(${a})`);
			}
		}
	};
})), Na = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = G();
	e.default = {
		keyword: ["maxProperties", "minProperties"],
		type: "object",
		schemaType: "number",
		$data: !0,
		error: {
			message({ keyword: e, schemaCode: n }) {
				let r = e === "maxProperties" ? "more" : "fewer";
				return (0, t.str)`must NOT have ${r} than ${n} properties`;
			},
			params: ({ schemaCode: e }) => (0, t._)`{limit: ${e}}`
		},
		code(e) {
			let { keyword: n, data: r, schemaCode: i } = e, a = n === "maxProperties" ? t.operators.GT : t.operators.LT;
			e.fail$data((0, t._)`Object.keys(${r}).length ${a} ${i}`);
		}
	};
})), Pa = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = oa(), n = G(), r = K();
	e.default = {
		keyword: "required",
		type: "object",
		schemaType: "array",
		$data: !0,
		error: {
			message: ({ params: { missingProperty: e } }) => (0, n.str)`must have required property '${e}'`,
			params: ({ params: { missingProperty: e } }) => (0, n._)`{missingProperty: ${e}}`
		},
		code(e) {
			let { gen: i, schema: a, schemaCode: o, data: s, $data: c, it: l } = e, { opts: u } = l;
			if (!c && a.length === 0) return;
			let d = a.length >= u.loopRequired;
			if (l.allErrors ? f() : p(), u.strictRequired) {
				let t = e.parentSchema.properties, { definedProperties: n } = e.it;
				for (let e of a) if (t?.[e] === void 0 && !n.has(e)) {
					let t = `required property "${e}" is not defined at "${l.schemaEnv.baseId + l.errSchemaPath}" (strictRequired)`;
					(0, r.checkStrictMode)(l, t, l.opts.strictRequired);
				}
			}
			function f() {
				if (d || c) e.block$data(n.nil, m);
				else for (let n of a) (0, t.checkReportMissingProp)(e, n);
			}
			function p() {
				let n = i.let("missing");
				if (d || c) {
					let t = i.let("valid", !0);
					e.block$data(t, () => h(n, t)), e.ok(t);
				} else i.if((0, t.checkMissingProp)(e, a, n)), (0, t.reportMissingProp)(e, n), i.else();
			}
			function m() {
				i.forOf("prop", o, (n) => {
					e.setParams({ missingProperty: n }), i.if((0, t.noPropertyInData)(i, s, n, u.ownProperties), () => e.error());
				});
			}
			function h(r, a) {
				e.setParams({ missingProperty: r }), i.forOf(r, o, () => {
					i.assign(a, (0, t.propertyInData)(i, s, r, u.ownProperties)), i.if((0, n.not)(a), () => {
						e.error(), i.break();
					});
				}, n.nil);
			}
		}
	};
})), Fa = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = G();
	e.default = {
		keyword: ["maxItems", "minItems"],
		type: "array",
		schemaType: "number",
		$data: !0,
		error: {
			message({ keyword: e, schemaCode: n }) {
				let r = e === "maxItems" ? "more" : "fewer";
				return (0, t.str)`must NOT have ${r} than ${n} items`;
			},
			params: ({ schemaCode: e }) => (0, t._)`{limit: ${e}}`
		},
		code(e) {
			let { keyword: n, data: r, schemaCode: i } = e, a = n === "maxItems" ? t.operators.GT : t.operators.LT;
			e.fail$data((0, t._)`${r}.length ${a} ${i}`);
		}
	};
})), Ia = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = $t();
	t.code = "require(\"ajv/dist/runtime/equal\").default", e.default = t;
})), La = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = ia(), n = G(), r = K(), i = Ia();
	e.default = {
		keyword: "uniqueItems",
		type: "array",
		schemaType: "boolean",
		$data: !0,
		error: {
			message: ({ params: { i: e, j: t } }) => (0, n.str)`must NOT have duplicate items (items ## ${t} and ${e} are identical)`,
			params: ({ params: { i: e, j: t } }) => (0, n._)`{i: ${e}, j: ${t}}`
		},
		code(e) {
			let { gen: a, data: o, $data: s, schema: c, parentSchema: l, schemaCode: u, it: d } = e;
			if (!s && !c) return;
			let f = a.let("valid"), p = l.items ? (0, t.getSchemaTypes)(l.items) : [];
			e.block$data(f, m, (0, n._)`${u} === false`), e.ok(f);
			function m() {
				let t = a.let("i", (0, n._)`${o}.length`), r = a.let("j");
				e.setParams({
					i: t,
					j: r
				}), a.assign(f, !0), a.if((0, n._)`${t} > 1`, () => (h() ? g : _)(t, r));
			}
			function h() {
				return p.length > 0 && !p.some((e) => e === "object" || e === "array");
			}
			function g(r, i) {
				let s = a.name("item"), c = (0, t.checkDataTypes)(p, s, d.opts.strictNumbers, t.DataType.Wrong), l = a.const("indices", (0, n._)`{}`);
				a.for((0, n._)`;${r}--;`, () => {
					a.let(s, (0, n._)`${o}[${r}]`), a.if(c, (0, n._)`continue`), p.length > 1 && a.if((0, n._)`typeof ${s} == "string"`, (0, n._)`${s} += "_"`), a.if((0, n._)`typeof ${l}[${s}] == "number"`, () => {
						a.assign(i, (0, n._)`${l}[${s}]`), e.error(), a.assign(f, !1).break();
					}).code((0, n._)`${l}[${s}] = ${r}`);
				});
			}
			function _(t, s) {
				let c = (0, r.useFunc)(a, i.default), l = a.name("outer");
				a.label(l).for((0, n._)`;${t}--;`, () => a.for((0, n._)`${s} = ${t}; ${s}--;`, () => a.if((0, n._)`${c}(${o}[${t}], ${o}[${s}])`, () => {
					e.error(), a.assign(f, !1).break(l);
				})));
			}
		}
	};
})), Ra = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = G(), n = K(), r = Ia();
	e.default = {
		keyword: "const",
		$data: !0,
		error: {
			message: "must be equal to constant",
			params: ({ schemaCode: e }) => (0, t._)`{allowedValue: ${e}}`
		},
		code(e) {
			let { gen: i, data: a, $data: o, schemaCode: s, schema: c } = e;
			o || c && typeof c == "object" ? e.fail$data((0, t._)`!${(0, n.useFunc)(i, r.default)}(${a}, ${s})`) : e.fail((0, t._)`${c} !== ${a}`);
		}
	};
})), za = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = G(), n = K(), r = Ia();
	e.default = {
		keyword: "enum",
		schemaType: "array",
		$data: !0,
		error: {
			message: "must be equal to one of the allowed values",
			params: ({ schemaCode: e }) => (0, t._)`{allowedValues: ${e}}`
		},
		code(e) {
			let { gen: i, data: a, $data: o, schema: s, schemaCode: c, it: l } = e;
			if (!o && s.length === 0) throw Error("enum must have non-empty array");
			let u = s.length >= l.opts.loopEnum, d, f = () => d ??= (0, n.useFunc)(i, r.default), p;
			if (u || o) p = i.let("valid"), e.block$data(p, m);
			else {
				/* istanbul ignore if */
				if (!Array.isArray(s)) throw Error("ajv implementation error");
				let e = i.const("vSchema", c);
				p = (0, t.or)(...s.map((t, n) => h(e, n)));
			}
			e.pass(p);
			function m() {
				i.assign(p, !1), i.forOf("v", c, (e) => i.if((0, t._)`${f()}(${a}, ${e})`, () => i.assign(p, !0).break()));
			}
			function h(e, n) {
				let r = s[n];
				return typeof r == "object" && r ? (0, t._)`${f()}(${a}, ${e}[${n}])` : (0, t._)`${a} === ${r}`;
			}
		}
	};
})), Ba = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = Oa(), n = ka(), r = ja(), i = Ma(), a = Na(), o = Pa(), s = Fa(), c = La(), l = Ra(), u = za();
	e.default = [
		t.default,
		n.default,
		r.default,
		i.default,
		a.default,
		o.default,
		s.default,
		c.default,
		{
			keyword: "type",
			schemaType: ["string", "array"]
		},
		{
			keyword: "nullable",
			schemaType: "boolean"
		},
		l.default,
		u.default
	];
})), Va = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.validateAdditionalItems = void 0;
	var t = G(), n = K(), r = {
		keyword: "additionalItems",
		type: "array",
		schemaType: ["boolean", "object"],
		before: "uniqueItems",
		error: {
			message: ({ params: { len: e } }) => (0, t.str)`must NOT have more than ${e} items`,
			params: ({ params: { len: e } }) => (0, t._)`{limit: ${e}}`
		},
		code(e) {
			let { parentSchema: t, it: r } = e, { items: a } = t;
			if (!Array.isArray(a)) {
				(0, n.checkStrictMode)(r, "\"additionalItems\" is ignored when \"items\" is not an array of schemas");
				return;
			}
			i(e, a);
		}
	};
	function i(e, r) {
		let { gen: i, schema: a, data: o, keyword: s, it: c } = e;
		c.items = !0;
		let l = i.const("len", (0, t._)`${o}.length`);
		if (a === !1) e.setParams({ len: r.length }), e.pass((0, t._)`${l} <= ${r.length}`);
		else if (typeof a == "object" && !(0, n.alwaysValidSchema)(c, a)) {
			let n = i.var("valid", (0, t._)`${l} <= ${r.length}`);
			i.if((0, t.not)(n), () => u(n)), e.ok(n);
		}
		function u(a) {
			i.forRange("i", r.length, l, (r) => {
				e.subschema({
					keyword: s,
					dataProp: r,
					dataPropType: n.Type.Num
				}, a), c.allErrors || i.if((0, t.not)(a), () => i.break());
			});
		}
	}
	e.validateAdditionalItems = i, e.default = r;
})), Ha = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.validateTuple = void 0;
	var t = G(), n = K(), r = oa(), i = {
		keyword: "items",
		type: "array",
		schemaType: [
			"object",
			"array",
			"boolean"
		],
		before: "uniqueItems",
		code(e) {
			let { schema: t, it: i } = e;
			if (Array.isArray(t)) return a(e, "additionalItems", t);
			i.items = !0, !(0, n.alwaysValidSchema)(i, t) && e.ok((0, r.validateArray)(e));
		}
	};
	function a(e, r, i = e.schema) {
		let { gen: a, parentSchema: o, data: s, keyword: c, it: l } = e;
		f(o), l.opts.unevaluated && i.length && l.items !== !0 && (l.items = n.mergeEvaluated.items(a, i.length, l.items));
		let u = a.name("valid"), d = a.const("len", (0, t._)`${s}.length`);
		i.forEach((r, i) => {
			(0, n.alwaysValidSchema)(l, r) || (a.if((0, t._)`${d} > ${i}`, () => e.subschema({
				keyword: c,
				schemaProp: i,
				dataProp: i
			}, u)), e.ok(u));
		});
		function f(e) {
			let { opts: t, errSchemaPath: a } = l, o = i.length, s = o === e.minItems && (o === e.maxItems || e[r] === !1);
			if (t.strictTuples && !s) {
				let e = `"${c}" is ${o}-tuple, but minItems or maxItems/${r} are not specified or different at path "${a}"`;
				(0, n.checkStrictMode)(l, e, t.strictTuples);
			}
		}
	}
	e.validateTuple = a, e.default = i;
})), Ua = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = Ha();
	e.default = {
		keyword: "prefixItems",
		type: "array",
		schemaType: ["array"],
		before: "uniqueItems",
		code: (e) => (0, t.validateTuple)(e, "items")
	};
})), Wa = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = G(), n = K(), r = oa(), i = Va();
	e.default = {
		keyword: "items",
		type: "array",
		schemaType: ["object", "boolean"],
		before: "uniqueItems",
		error: {
			message: ({ params: { len: e } }) => (0, t.str)`must NOT have more than ${e} items`,
			params: ({ params: { len: e } }) => (0, t._)`{limit: ${e}}`
		},
		code(e) {
			let { schema: t, parentSchema: a, it: o } = e, { prefixItems: s } = a;
			o.items = !0, !(0, n.alwaysValidSchema)(o, t) && (s ? (0, i.validateAdditionalItems)(e, s) : e.ok((0, r.validateArray)(e)));
		}
	};
})), Ga = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = G(), n = K();
	e.default = {
		keyword: "contains",
		type: "array",
		schemaType: ["object", "boolean"],
		before: "uniqueItems",
		trackErrors: !0,
		error: {
			message: ({ params: { min: e, max: n } }) => n === void 0 ? (0, t.str)`must contain at least ${e} valid item(s)` : (0, t.str)`must contain at least ${e} and no more than ${n} valid item(s)`,
			params: ({ params: { min: e, max: n } }) => n === void 0 ? (0, t._)`{minContains: ${e}}` : (0, t._)`{minContains: ${e}, maxContains: ${n}}`
		},
		code(e) {
			let { gen: r, schema: i, parentSchema: a, data: o, it: s } = e, c, l, { minContains: u, maxContains: d } = a;
			s.opts.next ? (c = u === void 0 ? 1 : u, l = d) : c = 1;
			let f = r.const("len", (0, t._)`${o}.length`);
			if (e.setParams({
				min: c,
				max: l
			}), l === void 0 && c === 0) {
				(0, n.checkStrictMode)(s, "\"minContains\" == 0 without \"maxContains\": \"contains\" keyword ignored");
				return;
			}
			if (l !== void 0 && c > l) {
				(0, n.checkStrictMode)(s, "\"minContains\" > \"maxContains\" is always invalid"), e.fail();
				return;
			}
			if ((0, n.alwaysValidSchema)(s, i)) {
				let n = (0, t._)`${f} >= ${c}`;
				l !== void 0 && (n = (0, t._)`${n} && ${f} <= ${l}`), e.pass(n);
				return;
			}
			s.items = !0;
			let p = r.name("valid");
			l === void 0 && c === 1 ? h(p, () => r.if(p, () => r.break())) : c === 0 ? (r.let(p, !0), l !== void 0 && r.if((0, t._)`${o}.length > 0`, m)) : (r.let(p, !1), m()), e.result(p, () => e.reset());
			function m() {
				let e = r.name("_valid"), t = r.let("count", 0);
				h(e, () => r.if(e, () => g(t)));
			}
			function h(t, i) {
				r.forRange("i", 0, f, (r) => {
					e.subschema({
						keyword: "contains",
						dataProp: r,
						dataPropType: n.Type.Num,
						compositeRule: !0
					}, t), i();
				});
			}
			function g(e) {
				r.code((0, t._)`${e}++`), l === void 0 ? r.if((0, t._)`${e} >= ${c}`, () => r.assign(p, !0).break()) : (r.if((0, t._)`${e} > ${l}`, () => r.assign(p, !1).break()), c === 1 ? r.assign(p, !0) : r.if((0, t._)`${e} >= ${c}`, () => r.assign(p, !0)));
			}
		}
	};
})), Ka = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.validateSchemaDeps = e.validatePropertyDeps = e.error = void 0;
	var t = G(), n = K(), r = oa();
	e.error = {
		message: ({ params: { property: e, depsCount: n, deps: r } }) => {
			let i = n === 1 ? "property" : "properties";
			return (0, t.str)`must have ${i} ${r} when property ${e} is present`;
		},
		params: ({ params: { property: e, depsCount: n, deps: r, missingProperty: i } }) => (0, t._)`{property: ${e},
    missingProperty: ${i},
    depsCount: ${n},
    deps: ${r}}`
	};
	var i = {
		keyword: "dependencies",
		type: "object",
		schemaType: "object",
		error: e.error,
		code(e) {
			let [t, n] = a(e);
			o(e, t), s(e, n);
		}
	};
	function a({ schema: e }) {
		let t = {}, n = {};
		for (let r in e) {
			if (r === "__proto__") continue;
			let i = Array.isArray(e[r]) ? t : n;
			i[r] = e[r];
		}
		return [t, n];
	}
	function o(e, n = e.schema) {
		let { gen: i, data: a, it: o } = e;
		if (Object.keys(n).length === 0) return;
		let s = i.let("missing");
		for (let c in n) {
			let l = n[c];
			if (l.length === 0) continue;
			let u = (0, r.propertyInData)(i, a, c, o.opts.ownProperties);
			e.setParams({
				property: c,
				depsCount: l.length,
				deps: l.join(", ")
			}), o.allErrors ? i.if(u, () => {
				for (let t of l) (0, r.checkReportMissingProp)(e, t);
			}) : (i.if((0, t._)`${u} && (${(0, r.checkMissingProp)(e, l, s)})`), (0, r.reportMissingProp)(e, s), i.else());
		}
	}
	e.validatePropertyDeps = o;
	function s(e, t = e.schema) {
		let { gen: i, data: a, keyword: o, it: s } = e, c = i.name("valid");
		for (let l in t) (0, n.alwaysValidSchema)(s, t[l]) || (i.if((0, r.propertyInData)(i, a, l, s.opts.ownProperties), () => {
			let t = e.subschema({
				keyword: o,
				schemaProp: l
			}, c);
			e.mergeValidEvaluated(t, c);
		}, () => i.var(c, !0)), e.ok(c));
	}
	e.validateSchemaDeps = s, e.default = i;
})), qa = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = G(), n = K();
	e.default = {
		keyword: "propertyNames",
		type: "object",
		schemaType: ["object", "boolean"],
		error: {
			message: "property name must be valid",
			params: ({ params: e }) => (0, t._)`{propertyName: ${e.propertyName}}`
		},
		code(e) {
			let { gen: r, schema: i, data: a, it: o } = e;
			if ((0, n.alwaysValidSchema)(o, i)) return;
			let s = r.name("valid");
			r.forIn("key", a, (n) => {
				e.setParams({ propertyName: n }), e.subschema({
					keyword: "propertyNames",
					data: n,
					dataTypes: ["string"],
					propertyName: n,
					compositeRule: !0
				}, s), r.if((0, t.not)(s), () => {
					e.error(!0), o.allErrors || r.break();
				});
			}), e.ok(s);
		}
	};
})), Ja = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = oa(), n = G(), r = $i(), i = K();
	e.default = {
		keyword: "additionalProperties",
		type: ["object"],
		schemaType: ["boolean", "object"],
		allowUndefined: !0,
		trackErrors: !0,
		error: {
			message: "must NOT have additional properties",
			params: ({ params: e }) => (0, n._)`{additionalProperty: ${e.additionalProperty}}`
		},
		code(e) {
			let { gen: a, schema: o, parentSchema: s, data: c, errsCount: l, it: u } = e;
			/* istanbul ignore if */
			if (!l) throw Error("ajv implementation error");
			let { allErrors: d, opts: f } = u;
			if (u.props = !0, f.removeAdditional !== "all" && (0, i.alwaysValidSchema)(u, o)) return;
			let p = (0, t.allSchemaProperties)(s.properties), m = (0, t.allSchemaProperties)(s.patternProperties);
			h(), e.ok((0, n._)`${l} === ${r.default.errors}`);
			function h() {
				a.forIn("key", c, (e) => {
					!p.length && !m.length ? v(e) : a.if(g(e), () => v(e));
				});
			}
			function g(r) {
				let o;
				if (p.length > 8) {
					let e = (0, i.schemaRefOrVal)(u, s.properties, "properties");
					o = (0, t.isOwnProperty)(a, e, r);
				} else o = p.length ? (0, n.or)(...p.map((e) => (0, n._)`${r} === ${e}`)) : n.nil;
				return m.length && (o = (0, n.or)(o, ...m.map((i) => (0, n._)`${(0, t.usePattern)(e, i)}.test(${r})`))), (0, n.not)(o);
			}
			function _(e) {
				a.code((0, n._)`delete ${c}[${e}]`);
			}
			function v(t) {
				if (f.removeAdditional === "all" || f.removeAdditional && o === !1) {
					_(t);
					return;
				}
				if (o === !1) {
					e.setParams({ additionalProperty: t }), e.error(), d || a.break();
					return;
				}
				if (typeof o == "object" && !(0, i.alwaysValidSchema)(u, o)) {
					let r = a.name("valid");
					f.removeAdditional === "failing" ? (y(t, r, !1), a.if((0, n.not)(r), () => {
						e.reset(), _(t);
					})) : (y(t, r), d || a.if((0, n.not)(r), () => a.break()));
				}
			}
			function y(t, n, r) {
				let a = {
					keyword: "additionalProperties",
					dataProp: t,
					dataPropType: i.Type.Str
				};
				r === !1 && Object.assign(a, {
					compositeRule: !0,
					createErrors: !1,
					allErrors: !1
				}), e.subschema(a, n);
			}
		}
	};
})), Ya = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = da(), n = oa(), r = K(), i = Ja();
	e.default = {
		keyword: "properties",
		type: "object",
		schemaType: "object",
		code(e) {
			let { gen: a, schema: o, parentSchema: s, data: c, it: l } = e;
			l.opts.removeAdditional === "all" && s.additionalProperties === void 0 && i.default.code(new t.KeywordCxt(l, i.default, "additionalProperties"));
			let u = (0, n.allSchemaProperties)(o);
			for (let e of u) l.definedProperties.add(e);
			l.opts.unevaluated && u.length && l.props !== !0 && (l.props = r.mergeEvaluated.props(a, (0, r.toHash)(u), l.props));
			let d = u.filter((e) => !(0, r.alwaysValidSchema)(l, o[e]));
			if (d.length === 0) return;
			let f = a.name("valid");
			for (let t of d) p(t) ? m(t) : (a.if((0, n.propertyInData)(a, c, t, l.opts.ownProperties)), m(t), l.allErrors || a.else().var(f, !0), a.endIf()), e.it.definedProperties.add(t), e.ok(f);
			function p(e) {
				return l.opts.useDefaults && !l.compositeRule && o[e].default !== void 0;
			}
			function m(t) {
				e.subschema({
					keyword: "properties",
					schemaProp: t,
					dataProp: t
				}, f);
			}
		}
	};
})), Xa = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = oa(), n = G(), r = K(), i = K();
	e.default = {
		keyword: "patternProperties",
		type: "object",
		schemaType: "object",
		code(e) {
			let { gen: a, schema: o, data: s, parentSchema: c, it: l } = e, { opts: u } = l, d = (0, t.allSchemaProperties)(o), f = d.filter((e) => (0, r.alwaysValidSchema)(l, o[e]));
			if (d.length === 0 || f.length === d.length && (!l.opts.unevaluated || l.props === !0)) return;
			let p = u.strictSchema && !u.allowMatchingProperties && c.properties, m = a.name("valid");
			l.props !== !0 && !(l.props instanceof n.Name) && (l.props = (0, i.evaluatedPropsToName)(a, l.props));
			let { props: h } = l;
			g();
			function g() {
				for (let e of d) p && _(e), l.allErrors ? v(e) : (a.var(m, !0), v(e), a.if(m));
			}
			function _(e) {
				for (let t in p) new RegExp(e).test(t) && (0, r.checkStrictMode)(l, `property ${t} matches pattern ${e} (use allowMatchingProperties)`);
			}
			function v(r) {
				a.forIn("key", s, (o) => {
					a.if((0, n._)`${(0, t.usePattern)(e, r)}.test(${o})`, () => {
						let t = f.includes(r);
						t || e.subschema({
							keyword: "patternProperties",
							schemaProp: r,
							dataProp: o,
							dataPropType: i.Type.Str
						}, m), l.opts.unevaluated && h !== !0 ? a.assign((0, n._)`${h}[${o}]`, !0) : !t && !l.allErrors && a.if((0, n.not)(m), () => a.break());
					});
				});
			}
		}
	};
})), Za = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = K();
	e.default = {
		keyword: "not",
		schemaType: ["object", "boolean"],
		trackErrors: !0,
		code(e) {
			let { gen: n, schema: r, it: i } = e;
			if ((0, t.alwaysValidSchema)(i, r)) {
				e.fail();
				return;
			}
			let a = n.name("valid");
			e.subschema({
				keyword: "not",
				compositeRule: !0,
				createErrors: !1,
				allErrors: !1
			}, a), e.failResult(a, () => e.reset(), () => e.error());
		},
		error: { message: "must NOT be valid" }
	};
})), Qa = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = {
		keyword: "anyOf",
		schemaType: "array",
		trackErrors: !0,
		code: oa().validateUnion,
		error: { message: "must match a schema in anyOf" }
	};
})), $a = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = G(), n = K();
	e.default = {
		keyword: "oneOf",
		schemaType: "array",
		trackErrors: !0,
		error: {
			message: "must match exactly one schema in oneOf",
			params: ({ params: e }) => (0, t._)`{passingSchemas: ${e.passing}}`
		},
		code(e) {
			let { gen: r, schema: i, parentSchema: a, it: o } = e;
			/* istanbul ignore if */
			if (!Array.isArray(i)) throw Error("ajv implementation error");
			if (o.opts.discriminator && a.discriminator) return;
			let s = i, c = r.let("valid", !1), l = r.let("passing", null), u = r.name("_valid");
			e.setParams({ passing: l }), r.block(d), e.result(c, () => e.reset(), () => e.error(!0));
			function d() {
				s.forEach((i, a) => {
					let s;
					(0, n.alwaysValidSchema)(o, i) ? r.var(u, !0) : s = e.subschema({
						keyword: "oneOf",
						schemaProp: a,
						compositeRule: !0
					}, u), a > 0 && r.if((0, t._)`${u} && ${c}`).assign(c, !1).assign(l, (0, t._)`[${l}, ${a}]`).else(), r.if(u, () => {
						r.assign(c, !0), r.assign(l, a), s && e.mergeEvaluated(s, t.Name);
					});
				});
			}
		}
	};
})), eo = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = K();
	e.default = {
		keyword: "allOf",
		schemaType: "array",
		code(e) {
			let { gen: n, schema: r, it: i } = e;
			/* istanbul ignore if */
			if (!Array.isArray(r)) throw Error("ajv implementation error");
			let a = n.name("valid");
			r.forEach((n, r) => {
				if ((0, t.alwaysValidSchema)(i, n)) return;
				let o = e.subschema({
					keyword: "allOf",
					schemaProp: r
				}, a);
				e.ok(a), e.mergeEvaluated(o);
			});
		}
	};
})), to = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = G(), n = K(), r = {
		keyword: "if",
		schemaType: ["object", "boolean"],
		trackErrors: !0,
		error: {
			message: ({ params: e }) => (0, t.str)`must match "${e.ifClause}" schema`,
			params: ({ params: e }) => (0, t._)`{failingKeyword: ${e.ifClause}}`
		},
		code(e) {
			let { gen: r, parentSchema: a, it: o } = e;
			a.then === void 0 && a.else === void 0 && (0, n.checkStrictMode)(o, "\"if\" without \"then\" and \"else\" is ignored");
			let s = i(o, "then"), c = i(o, "else");
			if (!s && !c) return;
			let l = r.let("valid", !0), u = r.name("_valid");
			if (d(), e.reset(), s && c) {
				let t = r.let("ifClause");
				e.setParams({ ifClause: t }), r.if(u, f("then", t), f("else", t));
			} else s ? r.if(u, f("then")) : r.if((0, t.not)(u), f("else"));
			e.pass(l, () => e.error(!0));
			function d() {
				let t = e.subschema({
					keyword: "if",
					compositeRule: !0,
					createErrors: !1,
					allErrors: !1
				}, u);
				e.mergeEvaluated(t);
			}
			function f(n, i) {
				return () => {
					let a = e.subschema({ keyword: n }, u);
					r.assign(l, u), e.mergeValidEvaluated(a, l), i ? r.assign(i, (0, t._)`${n}`) : e.setParams({ ifClause: n });
				};
			}
		}
	};
	function i(e, t) {
		let r = e.schema[t];
		return r !== void 0 && !(0, n.alwaysValidSchema)(e, r);
	}
	e.default = r;
})), no = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = K();
	e.default = {
		keyword: ["then", "else"],
		schemaType: ["object", "boolean"],
		code({ keyword: e, parentSchema: n, it: r }) {
			n.if === void 0 && (0, t.checkStrictMode)(r, `"${e}" without "if" is ignored`);
		}
	};
})), ro = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = Va(), n = Ua(), r = Ha(), i = Wa(), a = Ga(), o = Ka(), s = qa(), c = Ja(), l = Ya(), u = Xa(), d = Za(), f = Qa(), p = $a(), m = eo(), h = to(), g = no();
	function _(e = !1) {
		let _ = [
			d.default,
			f.default,
			p.default,
			m.default,
			h.default,
			g.default,
			s.default,
			c.default,
			o.default,
			l.default,
			u.default
		];
		return e ? _.push(n.default, i.default) : _.push(t.default, r.default), _.push(a.default), _;
	}
	e.default = _;
})), io = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = G();
	e.default = {
		keyword: "format",
		type: ["number", "string"],
		schemaType: "string",
		$data: !0,
		error: {
			message: ({ schemaCode: e }) => (0, t.str)`must match format "${e}"`,
			params: ({ schemaCode: e }) => (0, t._)`{format: ${e}}`
		},
		code(e, n) {
			let { gen: r, data: i, $data: a, schema: o, schemaCode: s, it: c } = e, { opts: l, errSchemaPath: u, schemaEnv: d, self: f } = c;
			if (!l.validateFormats) return;
			a ? p() : m();
			function p() {
				let a = r.scopeValue("formats", {
					ref: f.formats,
					code: l.code.formats
				}), o = r.const("fDef", (0, t._)`${a}[${s}]`), c = r.let("fType"), u = r.let("format");
				r.if((0, t._)`typeof ${o} == "object" && !(${o} instanceof RegExp)`, () => r.assign(c, (0, t._)`${o}.type || "string"`).assign(u, (0, t._)`${o}.validate`), () => r.assign(c, (0, t._)`"string"`).assign(u, o)), e.fail$data((0, t.or)(p(), m()));
				function p() {
					return l.strictSchema === !1 ? t.nil : (0, t._)`${s} && !${u}`;
				}
				function m() {
					let e = d.$async ? (0, t._)`(${o}.async ? await ${u}(${i}) : ${u}(${i}))` : (0, t._)`${u}(${i})`, r = (0, t._)`(typeof ${u} == "function" ? ${e} : ${u}.test(${i}))`;
					return (0, t._)`${u} && ${u} !== true && ${c} === ${n} && !${r}`;
				}
			}
			function m() {
				let a = f.formats[o];
				if (!a) {
					m();
					return;
				}
				if (a === !0) return;
				let [s, c, p] = h(a);
				s === n && e.pass(g());
				function m() {
					if (l.strictSchema === !1) {
						f.logger.warn(e());
						return;
					}
					throw Error(e());
					function e() {
						return `unknown format "${o}" ignored in schema at path "${u}"`;
					}
				}
				function h(e) {
					let n = e instanceof RegExp ? (0, t.regexpCode)(e) : l.code.formats ? (0, t._)`${l.code.formats}${(0, t.getProperty)(o)}` : void 0, i = r.scopeValue("formats", {
						key: o,
						ref: e,
						code: n
					});
					return typeof e == "object" && !(e instanceof RegExp) ? [
						e.type || "string",
						e.validate,
						(0, t._)`${i}.validate`
					] : [
						"string",
						e,
						i
					];
				}
				function g() {
					if (typeof a == "object" && !(a instanceof RegExp) && a.async) {
						if (!d.$async) throw Error("async format in sync schema");
						return (0, t._)`await ${p}(${i})`;
					}
					return typeof c == "function" ? (0, t._)`${p}(${i})` : (0, t._)`${p}.test(${i})`;
				}
			}
		}
	};
})), ao = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.default = [io().default];
})), oo = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.contentVocabulary = e.metadataVocabulary = void 0, e.metadataVocabulary = [
		"title",
		"description",
		"default",
		"deprecated",
		"readOnly",
		"writeOnly",
		"examples"
	], e.contentVocabulary = [
		"contentMediaType",
		"contentEncoding",
		"contentSchema"
	];
})), so = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = Da(), n = Ba(), r = ro(), i = ao(), a = oo();
	e.default = [
		t.default,
		n.default,
		(0, r.default)(),
		i.default,
		a.metadataVocabulary,
		a.contentVocabulary
	];
})), co = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.DiscrError = void 0;
	var t;
	(function(e) {
		e.Tag = "tag", e.Mapping = "mapping";
	})(t || (e.DiscrError = t = {}));
})), lo = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var t = G(), n = co(), r = ma(), i = pa(), a = K();
	e.default = {
		keyword: "discriminator",
		type: "object",
		schemaType: "object",
		error: {
			message: ({ params: { discrError: e, tagName: t } }) => e === n.DiscrError.Tag ? `tag "${t}" must be string` : `value of tag "${t}" must be in oneOf`,
			params: ({ params: { discrError: e, tag: n, tagName: r } }) => (0, t._)`{error: ${e}, tag: ${r}, tagValue: ${n}}`
		},
		code(e) {
			let { gen: o, data: s, schema: c, parentSchema: l, it: u } = e, { oneOf: d } = l;
			if (!u.opts.discriminator) throw Error("discriminator: requires discriminator option");
			let f = c.propertyName;
			if (typeof f != "string") throw Error("discriminator: requires propertyName");
			if (c.mapping) throw Error("discriminator: mapping is not supported");
			if (!d) throw Error("discriminator: requires oneOf keyword");
			let p = o.let("valid", !1), m = o.const("tag", (0, t._)`${s}${(0, t.getProperty)(f)}`);
			o.if((0, t._)`typeof ${m} == "string"`, () => h(), () => e.error(!1, {
				discrError: n.DiscrError.Tag,
				tag: m,
				tagName: f
			})), e.ok(p);
			function h() {
				let r = _();
				o.if(!1);
				for (let e in r) o.elseIf((0, t._)`${m} === ${e}`), o.assign(p, g(r[e]));
				o.else(), e.error(!1, {
					discrError: n.DiscrError.Mapping,
					tag: m,
					tagName: f
				}), o.endIf();
			}
			function g(n) {
				let r = o.name("valid"), i = e.subschema({
					keyword: "oneOf",
					schemaProp: n
				}, r);
				return e.mergeEvaluated(i, t.Name), r;
			}
			function _() {
				let e = {}, t = o(l), n = !0;
				for (let e = 0; e < d.length; e++) {
					let c = d[e];
					if (c?.$ref && !(0, a.schemaHasRulesButRef)(c, u.self.RULES)) {
						let e = c.$ref;
						if (c = r.resolveRef.call(u.self, u.schemaEnv.root, u.baseId, e), c instanceof r.SchemaEnv && (c = c.schema), c === void 0) throw new i.default(u.opts.uriResolver, u.baseId, e);
					}
					let l = c?.properties?.[f];
					if (typeof l != "object") throw Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${f}"`);
					n &&= t || o(c), s(l, e);
				}
				if (!n) throw Error(`discriminator: "${f}" must be required`);
				return e;
				function o({ required: e }) {
					return Array.isArray(e) && e.includes(f);
				}
				function s(e, t) {
					if (e.const) c(e.const, t);
					else if (e.enum) for (let n of e.enum) c(n, t);
					else throw Error(`discriminator: "properties/${f}" must have "const" or "enum"`);
				}
				function c(t, n) {
					if (typeof t != "string" || t in e) throw Error(`discriminator: "${f}" values must be unique strings`);
					e[t] = n;
				}
			}
		}
	};
})), uo = /* @__PURE__ */ Je({
	$id: () => po,
	$schema: () => fo,
	default: () => vo,
	definitions: () => ho,
	properties: () => _o,
	title: () => mo,
	type: () => go
}), fo, po, mo, ho, go, _o, vo, yo = qe((() => {
	fo = "http://json-schema.org/draft-07/schema#", po = "http://json-schema.org/draft-07/schema#", mo = "Core schema meta-schema", ho = {
		schemaArray: {
			type: "array",
			minItems: 1,
			items: { $ref: "#" }
		},
		nonNegativeInteger: {
			type: "integer",
			minimum: 0
		},
		nonNegativeIntegerDefault0: { allOf: [{ $ref: "#/definitions/nonNegativeInteger" }, { default: 0 }] },
		simpleTypes: { enum: [
			"array",
			"boolean",
			"integer",
			"null",
			"number",
			"object",
			"string"
		] },
		stringArray: {
			type: "array",
			items: { type: "string" },
			uniqueItems: !0,
			default: []
		}
	}, go = ["object", "boolean"], _o = {
		$id: {
			type: "string",
			format: "uri-reference"
		},
		$schema: {
			type: "string",
			format: "uri"
		},
		$ref: {
			type: "string",
			format: "uri-reference"
		},
		$comment: { type: "string" },
		title: { type: "string" },
		description: { type: "string" },
		default: !0,
		readOnly: {
			type: "boolean",
			default: !1
		},
		examples: {
			type: "array",
			items: !0
		},
		multipleOf: {
			type: "number",
			exclusiveMinimum: 0
		},
		maximum: { type: "number" },
		exclusiveMaximum: { type: "number" },
		minimum: { type: "number" },
		exclusiveMinimum: { type: "number" },
		maxLength: { $ref: "#/definitions/nonNegativeInteger" },
		minLength: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
		pattern: {
			type: "string",
			format: "regex"
		},
		additionalItems: { $ref: "#" },
		items: {
			anyOf: [{ $ref: "#" }, { $ref: "#/definitions/schemaArray" }],
			default: !0
		},
		maxItems: { $ref: "#/definitions/nonNegativeInteger" },
		minItems: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
		uniqueItems: {
			type: "boolean",
			default: !1
		},
		contains: { $ref: "#" },
		maxProperties: { $ref: "#/definitions/nonNegativeInteger" },
		minProperties: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
		required: { $ref: "#/definitions/stringArray" },
		additionalProperties: { $ref: "#" },
		definitions: {
			type: "object",
			additionalProperties: { $ref: "#" },
			default: {}
		},
		properties: {
			type: "object",
			additionalProperties: { $ref: "#" },
			default: {}
		},
		patternProperties: {
			type: "object",
			additionalProperties: { $ref: "#" },
			propertyNames: { format: "regex" },
			default: {}
		},
		dependencies: {
			type: "object",
			additionalProperties: { anyOf: [{ $ref: "#" }, { $ref: "#/definitions/stringArray" }] }
		},
		propertyNames: { $ref: "#" },
		const: !0,
		enum: {
			type: "array",
			items: !0,
			minItems: 1,
			uniqueItems: !0
		},
		type: { anyOf: [{ $ref: "#/definitions/simpleTypes" }, {
			type: "array",
			items: { $ref: "#/definitions/simpleTypes" },
			minItems: 1,
			uniqueItems: !0
		}] },
		format: { type: "string" },
		contentMediaType: { type: "string" },
		contentEncoding: { type: "string" },
		if: { $ref: "#" },
		then: { $ref: "#" },
		else: { $ref: "#" },
		allOf: { $ref: "#/definitions/schemaArray" },
		anyOf: { $ref: "#/definitions/schemaArray" },
		oneOf: { $ref: "#/definitions/schemaArray" },
		not: { $ref: "#" }
	}, vo = {
		$schema: fo,
		$id: po,
		title: mo,
		definitions: ho,
		type: go,
		properties: _o,
		default: !0
	};
})), bo = /* @__PURE__ */ z(((e, t) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.MissingRefError = e.ValidationError = e.CodeGen = e.Name = e.nil = e.stringify = e.str = e._ = e.KeywordCxt = e.Ajv = void 0;
	var n = wa(), r = so(), i = lo(), a = (yo(), Ze(uo).default), o = ["/properties"], s = "http://json-schema.org/draft-07/schema", c = class extends n.default {
		_addVocabularies() {
			super._addVocabularies(), r.default.forEach((e) => this.addVocabulary(e)), this.opts.discriminator && this.addKeyword(i.default);
		}
		_addDefaultMetaSchema() {
			if (super._addDefaultMetaSchema(), !this.opts.meta) return;
			let e = this.opts.$data ? this.$dataMetaSchema(a, o) : a;
			this.addMetaSchema(e, s, !1), this.refs["http://json-schema.org/schema"] = s;
		}
		defaultMeta() {
			return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(s) ? s : void 0);
		}
	};
	e.Ajv = c, t.exports = e = c, t.exports.Ajv = c, Object.defineProperty(e, "__esModule", { value: !0 }), e.default = c;
	var l = da();
	Object.defineProperty(e, "KeywordCxt", {
		enumerable: !0,
		get: function() {
			return l.KeywordCxt;
		}
	});
	var u = G();
	Object.defineProperty(e, "_", {
		enumerable: !0,
		get: function() {
			return u._;
		}
	}), Object.defineProperty(e, "str", {
		enumerable: !0,
		get: function() {
			return u.str;
		}
	}), Object.defineProperty(e, "stringify", {
		enumerable: !0,
		get: function() {
			return u.stringify;
		}
	}), Object.defineProperty(e, "nil", {
		enumerable: !0,
		get: function() {
			return u.nil;
		}
	}), Object.defineProperty(e, "Name", {
		enumerable: !0,
		get: function() {
			return u.Name;
		}
	}), Object.defineProperty(e, "CodeGen", {
		enumerable: !0,
		get: function() {
			return u.CodeGen;
		}
	});
	var d = fa();
	Object.defineProperty(e, "ValidationError", {
		enumerable: !0,
		get: function() {
			return d.default;
		}
	});
	var f = pa();
	Object.defineProperty(e, "MissingRefError", {
		enumerable: !0,
		get: function() {
			return f.default;
		}
	});
})), xo = /* @__PURE__ */ z(((e) => {
	Object.defineProperty(e, "__esModule", { value: !0 }), e.formatLimitDefinition = void 0;
	var t = bo(), n = G(), r = n.operators, i = {
		formatMaximum: {
			okStr: "<=",
			ok: r.LTE,
			fail: r.GT
		},
		formatMinimum: {
			okStr: ">=",
			ok: r.GTE,
			fail: r.LT
		},
		formatExclusiveMaximum: {
			okStr: "<",
			ok: r.LT,
			fail: r.GTE
		},
		formatExclusiveMinimum: {
			okStr: ">",
			ok: r.GT,
			fail: r.LTE
		}
	};
	e.formatLimitDefinition = {
		keyword: Object.keys(i),
		type: "string",
		schemaType: "string",
		$data: !0,
		error: {
			message: ({ keyword: e, schemaCode: t }) => (0, n.str)`should be ${i[e].okStr} ${t}`,
			params: ({ keyword: e, schemaCode: t }) => (0, n._)`{comparison: ${i[e].okStr}, limit: ${t}}`
		},
		code(e) {
			let { gen: r, data: a, schemaCode: o, keyword: s, it: c } = e, { opts: l, self: u } = c;
			if (!l.validateFormats) return;
			let d = new t.KeywordCxt(c, u.RULES.all.format.definition, "format");
			d.$data ? f() : p();
			function f() {
				let t = r.scopeValue("formats", {
					ref: u.formats,
					code: l.code.formats
				}), i = r.const("fmt", (0, n._)`${t}[${d.schemaCode}]`);
				e.fail$data((0, n.or)((0, n._)`typeof ${i} != "object"`, (0, n._)`${i} instanceof RegExp`, (0, n._)`typeof ${i}.compare != "function"`, m(i)));
			}
			function p() {
				let t = d.schema, i = u.formats[t];
				if (!i || i === !0) return;
				if (typeof i != "object" || i instanceof RegExp || typeof i.compare != "function") throw Error(`"${s}": format "${t}" does not define "compare" function`);
				let a = r.scopeValue("formats", {
					key: t,
					ref: i,
					code: l.code.formats ? (0, n._)`${l.code.formats}${(0, n.getProperty)(t)}` : void 0
				});
				e.fail$data(m(a));
			}
			function m(e) {
				return (0, n._)`${e}.compare(${a}, ${o}) ${i[s].fail} 0`;
			}
		},
		dependencies: ["format"]
	}, e.default = (t) => (t.addKeyword(e.formatLimitDefinition), t);
})), So = /* @__PURE__ */ z(((e, t) => {
	Object.defineProperty(e, "__esModule", { value: !0 });
	var n = Xi(), r = xo(), i = G(), a = new i.Name("fullFormats"), o = new i.Name("fastFormats"), s = (e, t = { keywords: !0 }) => {
		if (Array.isArray(t)) return c(e, t, n.fullFormats, a), e;
		let [i, s] = t.mode === "fast" ? [n.fastFormats, o] : [n.fullFormats, a];
		return c(e, t.formats || n.formatNames, i, s), t.keywords && (0, r.default)(e), e;
	};
	s.get = (e, t = "full") => {
		let r = (t === "fast" ? n.fastFormats : n.fullFormats)[e];
		if (!r) throw Error(`Unknown format "${e}"`);
		return r;
	};
	function c(e, t, n, r) {
		var a;
		(a = e.opts.code).formats ?? (a.formats = (0, i._)`require("ajv-formats/dist/formats").${r}`);
		for (let r of t) e.addFormat(r, n[r]);
	}
	t.exports = e = s, Object.defineProperty(e, "__esModule", { value: !0 }), e.default = s;
})), Co = Yi(), wo = /* @__PURE__ */ Xe(So(), 1), To = (e, t, n, r) => {
	if (n === "length" || n === "prototype" || n === "arguments" || n === "caller") return;
	let i = Object.getOwnPropertyDescriptor(e, n), a = Object.getOwnPropertyDescriptor(t, n);
	!Eo(i, a) && r || Object.defineProperty(e, n, a);
}, Eo = function(e, t) {
	return e === void 0 || e.configurable || e.writable === t.writable && e.enumerable === t.enumerable && e.configurable === t.configurable && (e.writable || e.value === t.value);
}, Do = (e, t) => {
	let n = Object.getPrototypeOf(t);
	n !== Object.getPrototypeOf(e) && Object.setPrototypeOf(e, n);
}, Oo = (e, t) => `/* Wrapped ${e}*/\n${t}`, ko = Object.getOwnPropertyDescriptor(Function.prototype, "toString"), Ao = Object.getOwnPropertyDescriptor(Function.prototype.toString, "name"), jo = (e, t, n) => {
	let r = n === "" ? "" : `with ${n.trim()}() `, i = Oo.bind(null, r, t.toString());
	Object.defineProperty(i, "name", Ao);
	let { writable: a, enumerable: o, configurable: s } = ko;
	Object.defineProperty(e, "toString", {
		value: i,
		writable: a,
		enumerable: o,
		configurable: s
	});
};
function Mo(e, t, { ignoreNonConfigurable: n = !1 } = {}) {
	let { name: r } = e;
	for (let r of Reflect.ownKeys(t)) To(e, t, r, n);
	return Do(e, t), jo(e, t, r), e;
}
//#endregion
//#region node_modules/debounce-fn/index.js
var No = (e, t = {}) => {
	if (typeof e != "function") throw TypeError(`Expected the first argument to be a function, got \`${typeof e}\``);
	let { wait: n = 0, maxWait: r = Infinity, before: i = !1, after: a = !0 } = t;
	if (n < 0 || r < 0) throw RangeError("`wait` and `maxWait` must not be negative.");
	if (!i && !a) throw Error("Both `before` and `after` are false, function wouldn't be called.");
	let o, s, c, l = function(...t) {
		let l = this, u = () => {
			o = void 0, s &&= (clearTimeout(s), void 0), a && (c = e.apply(l, t));
		}, d = () => {
			s = void 0, o &&= (clearTimeout(o), void 0), a && (c = e.apply(l, t));
		}, f = i && !o;
		return clearTimeout(o), o = setTimeout(u, n), r > 0 && r !== Infinity && !s && (s = setTimeout(d, r)), f && (c = e.apply(l, t)), c;
	};
	return Mo(l, e), l.cancel = () => {
		o &&= (clearTimeout(o), void 0), s &&= (clearTimeout(s), void 0);
	}, l;
}, Po = /* @__PURE__ */ z(((e, t) => {
	var n = "2.0.0", r = 256;
	t.exports = {
		MAX_LENGTH: r,
		MAX_SAFE_COMPONENT_LENGTH: 16,
		MAX_SAFE_BUILD_LENGTH: r - 6,
		MAX_SAFE_INTEGER: 2 ** 53 - 1 || 9007199254740991,
		RELEASE_TYPES: [
			"major",
			"premajor",
			"minor",
			"preminor",
			"patch",
			"prepatch",
			"prerelease"
		],
		SEMVER_SPEC_VERSION: n,
		FLAG_INCLUDE_PRERELEASE: 1,
		FLAG_LOOSE: 2
	};
})), Fo = /* @__PURE__ */ z(((e, t) => {
	t.exports = typeof process == "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...e) => console.error("SEMVER", ...e) : () => {};
})), Io = /* @__PURE__ */ z(((e, t) => {
	var { MAX_SAFE_COMPONENT_LENGTH: n, MAX_SAFE_BUILD_LENGTH: r, MAX_LENGTH: i } = Po(), a = Fo();
	e = t.exports = {};
	var o = e.re = [], s = e.safeRe = [], c = e.src = [], l = e.safeSrc = [], u = e.t = {}, d = 0, f = "[a-zA-Z0-9-]", p = [
		["\\s", 1],
		["\\d", i],
		[f, r]
	], m = (e) => {
		for (let [t, n] of p) e = e.split(`${t}*`).join(`${t}{0,${n}}`).split(`${t}+`).join(`${t}{1,${n}}`);
		return e;
	}, h = (e, t, n) => {
		let r = m(t), i = d++;
		a(e, i, t), u[e] = i, c[i] = t, l[i] = r, o[i] = new RegExp(t, n ? "g" : void 0), s[i] = new RegExp(r, n ? "g" : void 0);
	};
	h("NUMERICIDENTIFIER", "0|[1-9]\\d*"), h("NUMERICIDENTIFIERLOOSE", "\\d+"), h("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${f}*`), h("MAINVERSION", `(${c[u.NUMERICIDENTIFIER]})\\.(${c[u.NUMERICIDENTIFIER]})\\.(${c[u.NUMERICIDENTIFIER]})`), h("MAINVERSIONLOOSE", `(${c[u.NUMERICIDENTIFIERLOOSE]})\\.(${c[u.NUMERICIDENTIFIERLOOSE]})\\.(${c[u.NUMERICIDENTIFIERLOOSE]})`), h("PRERELEASEIDENTIFIER", `(?:${c[u.NONNUMERICIDENTIFIER]}|${c[u.NUMERICIDENTIFIER]})`), h("PRERELEASEIDENTIFIERLOOSE", `(?:${c[u.NONNUMERICIDENTIFIER]}|${c[u.NUMERICIDENTIFIERLOOSE]})`), h("PRERELEASE", `(?:-(${c[u.PRERELEASEIDENTIFIER]}(?:\\.${c[u.PRERELEASEIDENTIFIER]})*))`), h("PRERELEASELOOSE", `(?:-?(${c[u.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${c[u.PRERELEASEIDENTIFIERLOOSE]})*))`), h("BUILDIDENTIFIER", `${f}+`), h("BUILD", `(?:\\+(${c[u.BUILDIDENTIFIER]}(?:\\.${c[u.BUILDIDENTIFIER]})*))`), h("FULLPLAIN", `v?${c[u.MAINVERSION]}${c[u.PRERELEASE]}?${c[u.BUILD]}?`), h("FULL", `^${c[u.FULLPLAIN]}$`), h("LOOSEPLAIN", `[v=\\s]*${c[u.MAINVERSIONLOOSE]}${c[u.PRERELEASELOOSE]}?${c[u.BUILD]}?`), h("LOOSE", `^${c[u.LOOSEPLAIN]}$`), h("GTLT", "((?:<|>)?=?)"), h("XRANGEIDENTIFIERLOOSE", `${c[u.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`), h("XRANGEIDENTIFIER", `${c[u.NUMERICIDENTIFIER]}|x|X|\\*`), h("XRANGEPLAIN", `[v=\\s]*(${c[u.XRANGEIDENTIFIER]})(?:\\.(${c[u.XRANGEIDENTIFIER]})(?:\\.(${c[u.XRANGEIDENTIFIER]})(?:${c[u.PRERELEASE]})?${c[u.BUILD]}?)?)?`), h("XRANGEPLAINLOOSE", `[v=\\s]*(${c[u.XRANGEIDENTIFIERLOOSE]})(?:\\.(${c[u.XRANGEIDENTIFIERLOOSE]})(?:\\.(${c[u.XRANGEIDENTIFIERLOOSE]})(?:${c[u.PRERELEASELOOSE]})?${c[u.BUILD]}?)?)?`), h("XRANGE", `^${c[u.GTLT]}\\s*${c[u.XRANGEPLAIN]}$`), h("XRANGELOOSE", `^${c[u.GTLT]}\\s*${c[u.XRANGEPLAINLOOSE]}$`), h("COERCEPLAIN", `(^|[^\\d])(\\d{1,${n}})(?:\\.(\\d{1,${n}}))?(?:\\.(\\d{1,${n}}))?`), h("COERCE", `${c[u.COERCEPLAIN]}(?:$|[^\\d])`), h("COERCEFULL", c[u.COERCEPLAIN] + `(?:${c[u.PRERELEASE]})?(?:${c[u.BUILD]})?(?:$|[^\\d])`), h("COERCERTL", c[u.COERCE], !0), h("COERCERTLFULL", c[u.COERCEFULL], !0), h("LONETILDE", "(?:~>?)"), h("TILDETRIM", `(\\s*)${c[u.LONETILDE]}\\s+`, !0), e.tildeTrimReplace = "$1~", h("TILDE", `^${c[u.LONETILDE]}${c[u.XRANGEPLAIN]}$`), h("TILDELOOSE", `^${c[u.LONETILDE]}${c[u.XRANGEPLAINLOOSE]}$`), h("LONECARET", "(?:\\^)"), h("CARETTRIM", `(\\s*)${c[u.LONECARET]}\\s+`, !0), e.caretTrimReplace = "$1^", h("CARET", `^${c[u.LONECARET]}${c[u.XRANGEPLAIN]}$`), h("CARETLOOSE", `^${c[u.LONECARET]}${c[u.XRANGEPLAINLOOSE]}$`), h("COMPARATORLOOSE", `^${c[u.GTLT]}\\s*(${c[u.LOOSEPLAIN]})$|^$`), h("COMPARATOR", `^${c[u.GTLT]}\\s*(${c[u.FULLPLAIN]})$|^$`), h("COMPARATORTRIM", `(\\s*)${c[u.GTLT]}\\s*(${c[u.LOOSEPLAIN]}|${c[u.XRANGEPLAIN]})`, !0), e.comparatorTrimReplace = "$1$2$3", h("HYPHENRANGE", `^\\s*(${c[u.XRANGEPLAIN]})\\s+-\\s+(${c[u.XRANGEPLAIN]})\\s*$`), h("HYPHENRANGELOOSE", `^\\s*(${c[u.XRANGEPLAINLOOSE]})\\s+-\\s+(${c[u.XRANGEPLAINLOOSE]})\\s*$`), h("STAR", "(<|>)?=?\\s*\\*"), h("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$"), h("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
})), Lo = /* @__PURE__ */ z(((e, t) => {
	var n = Object.freeze({ loose: !0 }), r = Object.freeze({});
	t.exports = (e) => e ? typeof e == "object" ? e : n : r;
})), Ro = /* @__PURE__ */ z(((e, t) => {
	var n = /^[0-9]+$/, r = (e, t) => {
		if (typeof e == "number" && typeof t == "number") return e === t ? 0 : e < t ? -1 : 1;
		let r = n.test(e), i = n.test(t);
		return r && i && (e = +e, t = +t), e === t ? 0 : r && !i ? -1 : i && !r ? 1 : e < t ? -1 : 1;
	};
	t.exports = {
		compareIdentifiers: r,
		rcompareIdentifiers: (e, t) => r(t, e)
	};
})), q = /* @__PURE__ */ z(((e, t) => {
	var n = Fo(), { MAX_LENGTH: r, MAX_SAFE_INTEGER: i } = Po(), { safeRe: a, t: o } = Io(), s = Lo(), { compareIdentifiers: c } = Ro();
	t.exports = class e {
		constructor(t, c) {
			if (c = s(c), t instanceof e) {
				if (t.loose === !!c.loose && t.includePrerelease === !!c.includePrerelease) return t;
				t = t.version;
			} else if (typeof t != "string") throw TypeError(`Invalid version. Must be a string. Got type "${typeof t}".`);
			if (t.length > r) throw TypeError(`version is longer than ${r} characters`);
			n("SemVer", t, c), this.options = c, this.loose = !!c.loose, this.includePrerelease = !!c.includePrerelease;
			let l = t.trim().match(c.loose ? a[o.LOOSE] : a[o.FULL]);
			if (!l) throw TypeError(`Invalid Version: ${t}`);
			if (this.raw = t, this.major = +l[1], this.minor = +l[2], this.patch = +l[3], this.major > i || this.major < 0) throw TypeError("Invalid major version");
			if (this.minor > i || this.minor < 0) throw TypeError("Invalid minor version");
			if (this.patch > i || this.patch < 0) throw TypeError("Invalid patch version");
			l[4] ? this.prerelease = l[4].split(".").map((e) => {
				if (/^[0-9]+$/.test(e)) {
					let t = +e;
					if (t >= 0 && t < i) return t;
				}
				return e;
			}) : this.prerelease = [], this.build = l[5] ? l[5].split(".") : [], this.format();
		}
		format() {
			return this.version = `${this.major}.${this.minor}.${this.patch}`, this.prerelease.length && (this.version += `-${this.prerelease.join(".")}`), this.version;
		}
		toString() {
			return this.version;
		}
		compare(t) {
			if (n("SemVer.compare", this.version, this.options, t), !(t instanceof e)) {
				if (typeof t == "string" && t === this.version) return 0;
				t = new e(t, this.options);
			}
			return t.version === this.version ? 0 : this.compareMain(t) || this.comparePre(t);
		}
		compareMain(t) {
			return t instanceof e || (t = new e(t, this.options)), this.major < t.major ? -1 : this.major > t.major ? 1 : this.minor < t.minor ? -1 : this.minor > t.minor ? 1 : this.patch < t.patch ? -1 : this.patch > t.patch ? 1 : 0;
		}
		comparePre(t) {
			if (t instanceof e || (t = new e(t, this.options)), this.prerelease.length && !t.prerelease.length) return -1;
			if (!this.prerelease.length && t.prerelease.length) return 1;
			if (!this.prerelease.length && !t.prerelease.length) return 0;
			let r = 0;
			do {
				let e = this.prerelease[r], i = t.prerelease[r];
				if (n("prerelease compare", r, e, i), e === void 0 && i === void 0) return 0;
				if (i === void 0) return 1;
				if (e === void 0) return -1;
				if (e === i) continue;
				return c(e, i);
			} while (++r);
		}
		compareBuild(t) {
			t instanceof e || (t = new e(t, this.options));
			let r = 0;
			do {
				let e = this.build[r], i = t.build[r];
				if (n("build compare", r, e, i), e === void 0 && i === void 0) return 0;
				if (i === void 0) return 1;
				if (e === void 0) return -1;
				if (e === i) continue;
				return c(e, i);
			} while (++r);
		}
		inc(e, t, n) {
			if (e.startsWith("pre")) {
				if (!t && n === !1) throw Error("invalid increment argument: identifier is empty");
				if (t) {
					let e = `-${t}`.match(this.options.loose ? a[o.PRERELEASELOOSE] : a[o.PRERELEASE]);
					if (!e || e[1] !== t) throw Error(`invalid identifier: ${t}`);
				}
			}
			switch (e) {
				case "premajor":
					this.prerelease.length = 0, this.patch = 0, this.minor = 0, this.major++, this.inc("pre", t, n);
					break;
				case "preminor":
					this.prerelease.length = 0, this.patch = 0, this.minor++, this.inc("pre", t, n);
					break;
				case "prepatch":
					this.prerelease.length = 0, this.inc("patch", t, n), this.inc("pre", t, n);
					break;
				case "prerelease":
					this.prerelease.length === 0 && this.inc("patch", t, n), this.inc("pre", t, n);
					break;
				case "release":
					if (this.prerelease.length === 0) throw Error(`version ${this.raw} is not a prerelease`);
					this.prerelease.length = 0;
					break;
				case "major":
					(this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) && this.major++, this.minor = 0, this.patch = 0, this.prerelease = [];
					break;
				case "minor":
					(this.patch !== 0 || this.prerelease.length === 0) && this.minor++, this.patch = 0, this.prerelease = [];
					break;
				case "patch":
					this.prerelease.length === 0 && this.patch++, this.prerelease = [];
					break;
				case "pre": {
					let e = Number(n) ? 1 : 0;
					if (this.prerelease.length === 0) this.prerelease = [e];
					else {
						let r = this.prerelease.length;
						for (; --r >= 0;) typeof this.prerelease[r] == "number" && (this.prerelease[r]++, r = -2);
						if (r === -1) {
							if (t === this.prerelease.join(".") && n === !1) throw Error("invalid increment argument: identifier already exists");
							this.prerelease.push(e);
						}
					}
					if (t) {
						let r = [t, e];
						n === !1 && (r = [t]), c(this.prerelease[0], t) === 0 ? isNaN(this.prerelease[1]) && (this.prerelease = r) : this.prerelease = r;
					}
					break;
				}
				default: throw Error(`invalid increment argument: ${e}`);
			}
			return this.raw = this.format(), this.build.length && (this.raw += `+${this.build.join(".")}`), this;
		}
	};
})), zo = /* @__PURE__ */ z(((e, t) => {
	var n = q();
	t.exports = (e, t, r = !1) => {
		if (e instanceof n) return e;
		try {
			return new n(e, t);
		} catch (e) {
			if (!r) return null;
			throw e;
		}
	};
})), Bo = /* @__PURE__ */ z(((e, t) => {
	var n = zo();
	t.exports = (e, t) => {
		let r = n(e, t);
		return r ? r.version : null;
	};
})), Vo = /* @__PURE__ */ z(((e, t) => {
	var n = zo();
	t.exports = (e, t) => {
		let r = n(e.trim().replace(/^[=v]+/, ""), t);
		return r ? r.version : null;
	};
})), Ho = /* @__PURE__ */ z(((e, t) => {
	var n = q();
	t.exports = (e, t, r, i, a) => {
		typeof r == "string" && (a = i, i = r, r = void 0);
		try {
			return new n(e instanceof n ? e.version : e, r).inc(t, i, a).version;
		} catch {
			return null;
		}
	};
})), Uo = /* @__PURE__ */ z(((e, t) => {
	var n = zo();
	t.exports = (e, t) => {
		let r = n(e, null, !0), i = n(t, null, !0), a = r.compare(i);
		if (a === 0) return null;
		let o = a > 0, s = o ? r : i, c = o ? i : r, l = !!s.prerelease.length;
		if (c.prerelease.length && !l) {
			if (!c.patch && !c.minor) return "major";
			if (c.compareMain(s) === 0) return c.minor && !c.patch ? "minor" : "patch";
		}
		let u = l ? "pre" : "";
		return r.major === i.major ? r.minor === i.minor ? r.patch === i.patch ? "prerelease" : u + "patch" : u + "minor" : u + "major";
	};
})), Wo = /* @__PURE__ */ z(((e, t) => {
	var n = q();
	t.exports = (e, t) => new n(e, t).major;
})), Go = /* @__PURE__ */ z(((e, t) => {
	var n = q();
	t.exports = (e, t) => new n(e, t).minor;
})), Ko = /* @__PURE__ */ z(((e, t) => {
	var n = q();
	t.exports = (e, t) => new n(e, t).patch;
})), qo = /* @__PURE__ */ z(((e, t) => {
	var n = zo();
	t.exports = (e, t) => {
		let r = n(e, t);
		return r && r.prerelease.length ? r.prerelease : null;
	};
})), Jo = /* @__PURE__ */ z(((e, t) => {
	var n = q();
	t.exports = (e, t, r) => new n(e, r).compare(new n(t, r));
})), Yo = /* @__PURE__ */ z(((e, t) => {
	var n = Jo();
	t.exports = (e, t, r) => n(t, e, r);
})), Xo = /* @__PURE__ */ z(((e, t) => {
	var n = Jo();
	t.exports = (e, t) => n(e, t, !0);
})), Zo = /* @__PURE__ */ z(((e, t) => {
	var n = q();
	t.exports = (e, t, r) => {
		let i = new n(e, r), a = new n(t, r);
		return i.compare(a) || i.compareBuild(a);
	};
})), Qo = /* @__PURE__ */ z(((e, t) => {
	var n = Zo();
	t.exports = (e, t) => e.sort((e, r) => n(e, r, t));
})), $o = /* @__PURE__ */ z(((e, t) => {
	var n = Zo();
	t.exports = (e, t) => e.sort((e, r) => n(r, e, t));
})), es = /* @__PURE__ */ z(((e, t) => {
	var n = Jo();
	t.exports = (e, t, r) => n(e, t, r) > 0;
})), ts = /* @__PURE__ */ z(((e, t) => {
	var n = Jo();
	t.exports = (e, t, r) => n(e, t, r) < 0;
})), ns = /* @__PURE__ */ z(((e, t) => {
	var n = Jo();
	t.exports = (e, t, r) => n(e, t, r) === 0;
})), rs = /* @__PURE__ */ z(((e, t) => {
	var n = Jo();
	t.exports = (e, t, r) => n(e, t, r) !== 0;
})), is = /* @__PURE__ */ z(((e, t) => {
	var n = Jo();
	t.exports = (e, t, r) => n(e, t, r) >= 0;
})), as = /* @__PURE__ */ z(((e, t) => {
	var n = Jo();
	t.exports = (e, t, r) => n(e, t, r) <= 0;
})), os = /* @__PURE__ */ z(((e, t) => {
	var n = ns(), r = rs(), i = es(), a = is(), o = ts(), s = as();
	t.exports = (e, t, c, l) => {
		switch (t) {
			case "===": return typeof e == "object" && (e = e.version), typeof c == "object" && (c = c.version), e === c;
			case "!==": return typeof e == "object" && (e = e.version), typeof c == "object" && (c = c.version), e !== c;
			case "":
			case "=":
			case "==": return n(e, c, l);
			case "!=": return r(e, c, l);
			case ">": return i(e, c, l);
			case ">=": return a(e, c, l);
			case "<": return o(e, c, l);
			case "<=": return s(e, c, l);
			default: throw TypeError(`Invalid operator: ${t}`);
		}
	};
})), ss = /* @__PURE__ */ z(((e, t) => {
	var n = q(), r = zo(), { safeRe: i, t: a } = Io();
	t.exports = (e, t) => {
		if (e instanceof n) return e;
		if (typeof e == "number" && (e = String(e)), typeof e != "string") return null;
		t ||= {};
		let o = null;
		if (!t.rtl) o = e.match(t.includePrerelease ? i[a.COERCEFULL] : i[a.COERCE]);
		else {
			let n = t.includePrerelease ? i[a.COERCERTLFULL] : i[a.COERCERTL], r;
			for (; (r = n.exec(e)) && (!o || o.index + o[0].length !== e.length);) (!o || r.index + r[0].length !== o.index + o[0].length) && (o = r), n.lastIndex = r.index + r[1].length + r[2].length;
			n.lastIndex = -1;
		}
		if (o === null) return null;
		let s = o[2];
		return r(`${s}.${o[3] || "0"}.${o[4] || "0"}${t.includePrerelease && o[5] ? `-${o[5]}` : ""}${t.includePrerelease && o[6] ? `+${o[6]}` : ""}`, t);
	};
})), cs = /* @__PURE__ */ z(((e, t) => {
	t.exports = class {
		constructor() {
			this.max = 1e3, this.map = /* @__PURE__ */ new Map();
		}
		get(e) {
			let t = this.map.get(e);
			if (t !== void 0) return this.map.delete(e), this.map.set(e, t), t;
		}
		delete(e) {
			return this.map.delete(e);
		}
		set(e, t) {
			if (!this.delete(e) && t !== void 0) {
				if (this.map.size >= this.max) {
					let e = this.map.keys().next().value;
					this.delete(e);
				}
				this.map.set(e, t);
			}
			return this;
		}
	};
})), ls = /* @__PURE__ */ z(((e, t) => {
	var n = /\s+/g;
	t.exports = class e {
		constructor(t, r) {
			if (r = i(r), t instanceof e) return t.loose === !!r.loose && t.includePrerelease === !!r.includePrerelease ? t : new e(t.raw, r);
			if (t instanceof a) return this.raw = t.value, this.set = [[t]], this.formatted = void 0, this;
			if (this.options = r, this.loose = !!r.loose, this.includePrerelease = !!r.includePrerelease, this.raw = t.trim().replace(n, " "), this.set = this.raw.split("||").map((e) => this.parseRange(e.trim())).filter((e) => e.length), !this.set.length) throw TypeError(`Invalid SemVer Range: ${this.raw}`);
			if (this.set.length > 1) {
				let e = this.set[0];
				if (this.set = this.set.filter((e) => !h(e[0])), this.set.length === 0) this.set = [e];
				else if (this.set.length > 1) {
					for (let e of this.set) if (e.length === 1 && g(e[0])) {
						this.set = [e];
						break;
					}
				}
			}
			this.formatted = void 0;
		}
		get range() {
			if (this.formatted === void 0) {
				this.formatted = "";
				for (let e = 0; e < this.set.length; e++) {
					e > 0 && (this.formatted += "||");
					let t = this.set[e];
					for (let e = 0; e < t.length; e++) e > 0 && (this.formatted += " "), this.formatted += t[e].toString().trim();
				}
			}
			return this.formatted;
		}
		format() {
			return this.range;
		}
		toString() {
			return this.range;
		}
		parseRange(e) {
			let t = ((this.options.includePrerelease && p) | (this.options.loose && m)) + ":" + e, n = r.get(t);
			if (n) return n;
			let i = this.options.loose, s = i ? c[l.HYPHENRANGELOOSE] : c[l.HYPHENRANGE];
			e = e.replace(s, D(this.options.includePrerelease)), o("hyphen replace", e), e = e.replace(c[l.COMPARATORTRIM], u), o("comparator trim", e), e = e.replace(c[l.TILDETRIM], d), o("tilde trim", e), e = e.replace(c[l.CARETTRIM], f), o("caret trim", e);
			let g = e.split(" ").map((e) => v(e, this.options)).join(" ").split(/\s+/).map((e) => E(e, this.options));
			i && (g = g.filter((e) => (o("loose invalid filter", e, this.options), !!e.match(c[l.COMPARATORLOOSE])))), o("range list", g);
			let _ = /* @__PURE__ */ new Map(), y = g.map((e) => new a(e, this.options));
			for (let e of y) {
				if (h(e)) return [e];
				_.set(e.value, e);
			}
			_.size > 1 && _.has("") && _.delete("");
			let b = [..._.values()];
			return r.set(t, b), b;
		}
		intersects(t, n) {
			if (!(t instanceof e)) throw TypeError("a Range is required");
			return this.set.some((e) => _(e, n) && t.set.some((t) => _(t, n) && e.every((e) => t.every((t) => e.intersects(t, n)))));
		}
		test(e) {
			if (!e) return !1;
			if (typeof e == "string") try {
				e = new s(e, this.options);
			} catch {
				return !1;
			}
			for (let t = 0; t < this.set.length; t++) if (O(this.set[t], e, this.options)) return !0;
			return !1;
		}
	};
	var r = new (cs())(), i = Lo(), a = us(), o = Fo(), s = q(), { safeRe: c, t: l, comparatorTrimReplace: u, tildeTrimReplace: d, caretTrimReplace: f } = Io(), { FLAG_INCLUDE_PRERELEASE: p, FLAG_LOOSE: m } = Po(), h = (e) => e.value === "<0.0.0-0", g = (e) => e.value === "", _ = (e, t) => {
		let n = !0, r = e.slice(), i = r.pop();
		for (; n && r.length;) n = r.every((e) => i.intersects(e, t)), i = r.pop();
		return n;
	}, v = (e, t) => (e = e.replace(c[l.BUILD], ""), o("comp", e, t), e = S(e, t), o("caret", e), e = b(e, t), o("tildes", e), e = ee(e, t), o("xrange", e), e = T(e, t), o("stars", e), e), y = (e) => !e || e.toLowerCase() === "x" || e === "*", b = (e, t) => e.trim().split(/\s+/).map((e) => x(e, t)).join(" "), x = (e, t) => {
		let n = t.loose ? c[l.TILDELOOSE] : c[l.TILDE];
		return e.replace(n, (t, n, r, i, a) => {
			o("tilde", e, t, n, r, i, a);
			let s;
			return y(n) ? s = "" : y(r) ? s = `>=${n}.0.0 <${+n + 1}.0.0-0` : y(i) ? s = `>=${n}.${r}.0 <${n}.${+r + 1}.0-0` : a ? (o("replaceTilde pr", a), s = `>=${n}.${r}.${i}-${a} <${n}.${+r + 1}.0-0`) : s = `>=${n}.${r}.${i} <${n}.${+r + 1}.0-0`, o("tilde return", s), s;
		});
	}, S = (e, t) => e.trim().split(/\s+/).map((e) => C(e, t)).join(" "), C = (e, t) => {
		o("caret", e, t);
		let n = t.loose ? c[l.CARETLOOSE] : c[l.CARET], r = t.includePrerelease ? "-0" : "";
		return e.replace(n, (t, n, i, a, s) => {
			o("caret", e, t, n, i, a, s);
			let c;
			return y(n) ? c = "" : y(i) ? c = `>=${n}.0.0${r} <${+n + 1}.0.0-0` : y(a) ? c = n === "0" ? `>=${n}.${i}.0${r} <${n}.${+i + 1}.0-0` : `>=${n}.${i}.0${r} <${+n + 1}.0.0-0` : s ? (o("replaceCaret pr", s), c = n === "0" ? i === "0" ? `>=${n}.${i}.${a}-${s} <${n}.${i}.${+a + 1}-0` : `>=${n}.${i}.${a}-${s} <${n}.${+i + 1}.0-0` : `>=${n}.${i}.${a}-${s} <${+n + 1}.0.0-0`) : (o("no pr"), c = n === "0" ? i === "0" ? `>=${n}.${i}.${a}${r} <${n}.${i}.${+a + 1}-0` : `>=${n}.${i}.${a}${r} <${n}.${+i + 1}.0-0` : `>=${n}.${i}.${a} <${+n + 1}.0.0-0`), o("caret return", c), c;
		});
	}, ee = (e, t) => (o("replaceXRanges", e, t), e.split(/\s+/).map((e) => w(e, t)).join(" ")), w = (e, t) => {
		e = e.trim();
		let n = t.loose ? c[l.XRANGELOOSE] : c[l.XRANGE];
		return e.replace(n, (n, r, i, a, s, c) => {
			o("xRange", e, n, r, i, a, s, c);
			let l = y(i), u = l || y(a), d = u || y(s), f = d;
			return r === "=" && f && (r = ""), c = t.includePrerelease ? "-0" : "", l ? n = r === ">" || r === "<" ? "<0.0.0-0" : "*" : r && f ? (u && (a = 0), s = 0, r === ">" ? (r = ">=", u ? (i = +i + 1, a = 0, s = 0) : (a = +a + 1, s = 0)) : r === "<=" && (r = "<", u ? i = +i + 1 : a = +a + 1), r === "<" && (c = "-0"), n = `${r + i}.${a}.${s}${c}`) : u ? n = `>=${i}.0.0${c} <${+i + 1}.0.0-0` : d && (n = `>=${i}.${a}.0${c} <${i}.${+a + 1}.0-0`), o("xRange return", n), n;
		});
	}, T = (e, t) => (o("replaceStars", e, t), e.trim().replace(c[l.STAR], "")), E = (e, t) => (o("replaceGTE0", e, t), e.trim().replace(c[t.includePrerelease ? l.GTE0PRE : l.GTE0], "")), D = (e) => (t, n, r, i, a, o, s, c, l, u, d, f) => (n = y(r) ? "" : y(i) ? `>=${r}.0.0${e ? "-0" : ""}` : y(a) ? `>=${r}.${i}.0${e ? "-0" : ""}` : o ? `>=${n}` : `>=${n}${e ? "-0" : ""}`, c = y(l) ? "" : y(u) ? `<${+l + 1}.0.0-0` : y(d) ? `<${l}.${+u + 1}.0-0` : f ? `<=${l}.${u}.${d}-${f}` : e ? `<${l}.${u}.${+d + 1}-0` : `<=${c}`, `${n} ${c}`.trim()), O = (e, t, n) => {
		for (let n = 0; n < e.length; n++) if (!e[n].test(t)) return !1;
		if (t.prerelease.length && !n.includePrerelease) {
			for (let n = 0; n < e.length; n++) if (o(e[n].semver), e[n].semver !== a.ANY && e[n].semver.prerelease.length > 0) {
				let r = e[n].semver;
				if (r.major === t.major && r.minor === t.minor && r.patch === t.patch) return !0;
			}
			return !1;
		}
		return !0;
	};
})), us = /* @__PURE__ */ z(((e, t) => {
	var n = Symbol("SemVer ANY");
	t.exports = class e {
		static get ANY() {
			return n;
		}
		constructor(t, i) {
			if (i = r(i), t instanceof e) {
				if (t.loose === !!i.loose) return t;
				t = t.value;
			}
			t = t.trim().split(/\s+/).join(" "), s("comparator", t, i), this.options = i, this.loose = !!i.loose, this.parse(t), this.semver === n ? this.value = "" : this.value = this.operator + this.semver.version, s("comp", this);
		}
		parse(e) {
			let t = this.options.loose ? i[a.COMPARATORLOOSE] : i[a.COMPARATOR], r = e.match(t);
			if (!r) throw TypeError(`Invalid comparator: ${e}`);
			this.operator = r[1] === void 0 ? "" : r[1], this.operator === "=" && (this.operator = ""), r[2] ? this.semver = new c(r[2], this.options.loose) : this.semver = n;
		}
		toString() {
			return this.value;
		}
		test(e) {
			if (s("Comparator.test", e, this.options.loose), this.semver === n || e === n) return !0;
			if (typeof e == "string") try {
				e = new c(e, this.options);
			} catch {
				return !1;
			}
			return o(e, this.operator, this.semver, this.options);
		}
		intersects(t, n) {
			if (!(t instanceof e)) throw TypeError("a Comparator is required");
			return this.operator === "" ? this.value === "" ? !0 : new l(t.value, n).test(this.value) : t.operator === "" ? t.value === "" ? !0 : new l(this.value, n).test(t.semver) : (n = r(n), n.includePrerelease && (this.value === "<0.0.0-0" || t.value === "<0.0.0-0") || !n.includePrerelease && (this.value.startsWith("<0.0.0") || t.value.startsWith("<0.0.0")) ? !1 : !!(this.operator.startsWith(">") && t.operator.startsWith(">") || this.operator.startsWith("<") && t.operator.startsWith("<") || this.semver.version === t.semver.version && this.operator.includes("=") && t.operator.includes("=") || o(this.semver, "<", t.semver, n) && this.operator.startsWith(">") && t.operator.startsWith("<") || o(this.semver, ">", t.semver, n) && this.operator.startsWith("<") && t.operator.startsWith(">")));
		}
	};
	var r = Lo(), { safeRe: i, t: a } = Io(), o = os(), s = Fo(), c = q(), l = ls();
})), ds = /* @__PURE__ */ z(((e, t) => {
	var n = ls();
	t.exports = (e, t, r) => {
		try {
			t = new n(t, r);
		} catch {
			return !1;
		}
		return t.test(e);
	};
})), fs = /* @__PURE__ */ z(((e, t) => {
	var n = ls();
	t.exports = (e, t) => new n(e, t).set.map((e) => e.map((e) => e.value).join(" ").trim().split(" "));
})), ps = /* @__PURE__ */ z(((e, t) => {
	var n = q(), r = ls();
	t.exports = (e, t, i) => {
		let a = null, o = null, s = null;
		try {
			s = new r(t, i);
		} catch {
			return null;
		}
		return e.forEach((e) => {
			s.test(e) && (!a || o.compare(e) === -1) && (a = e, o = new n(a, i));
		}), a;
	};
})), ms = /* @__PURE__ */ z(((e, t) => {
	var n = q(), r = ls();
	t.exports = (e, t, i) => {
		let a = null, o = null, s = null;
		try {
			s = new r(t, i);
		} catch {
			return null;
		}
		return e.forEach((e) => {
			s.test(e) && (!a || o.compare(e) === 1) && (a = e, o = new n(a, i));
		}), a;
	};
})), hs = /* @__PURE__ */ z(((e, t) => {
	var n = q(), r = ls(), i = es();
	t.exports = (e, t) => {
		e = new r(e, t);
		let a = new n("0.0.0");
		if (e.test(a) || (a = new n("0.0.0-0"), e.test(a))) return a;
		a = null;
		for (let t = 0; t < e.set.length; ++t) {
			let r = e.set[t], o = null;
			r.forEach((e) => {
				let t = new n(e.semver.version);
				switch (e.operator) {
					case ">": t.prerelease.length === 0 ? t.patch++ : t.prerelease.push(0), t.raw = t.format();
					case "":
					case ">=":
						(!o || i(t, o)) && (o = t);
						break;
					case "<":
					case "<=": break;
					default: throw Error(`Unexpected operation: ${e.operator}`);
				}
			}), o && (!a || i(a, o)) && (a = o);
		}
		return a && e.test(a) ? a : null;
	};
})), gs = /* @__PURE__ */ z(((e, t) => {
	var n = ls();
	t.exports = (e, t) => {
		try {
			return new n(e, t).range || "*";
		} catch {
			return null;
		}
	};
})), _s = /* @__PURE__ */ z(((e, t) => {
	var n = q(), r = us(), { ANY: i } = r, a = ls(), o = ds(), s = es(), c = ts(), l = as(), u = is();
	t.exports = (e, t, d, f) => {
		e = new n(e, f), t = new a(t, f);
		let p, m, h, g, _;
		switch (d) {
			case ">":
				p = s, m = l, h = c, g = ">", _ = ">=";
				break;
			case "<":
				p = c, m = u, h = s, g = "<", _ = "<=";
				break;
			default: throw TypeError("Must provide a hilo val of \"<\" or \">\"");
		}
		if (o(e, t, f)) return !1;
		for (let n = 0; n < t.set.length; ++n) {
			let a = t.set[n], o = null, s = null;
			if (a.forEach((e) => {
				e.semver === i && (e = new r(">=0.0.0")), o ||= e, s ||= e, p(e.semver, o.semver, f) ? o = e : h(e.semver, s.semver, f) && (s = e);
			}), o.operator === g || o.operator === _ || (!s.operator || s.operator === g) && m(e, s.semver) || s.operator === _ && h(e, s.semver)) return !1;
		}
		return !0;
	};
})), vs = /* @__PURE__ */ z(((e, t) => {
	var n = _s();
	t.exports = (e, t, r) => n(e, t, ">", r);
})), ys = /* @__PURE__ */ z(((e, t) => {
	var n = _s();
	t.exports = (e, t, r) => n(e, t, "<", r);
})), bs = /* @__PURE__ */ z(((e, t) => {
	var n = ls();
	t.exports = (e, t, r) => (e = new n(e, r), t = new n(t, r), e.intersects(t, r));
})), xs = /* @__PURE__ */ z(((e, t) => {
	var n = ds(), r = Jo();
	t.exports = (e, t, i) => {
		let a = [], o = null, s = null, c = e.sort((e, t) => r(e, t, i));
		for (let e of c) n(e, t, i) ? (s = e, o ||= e) : (s && a.push([o, s]), s = null, o = null);
		o && a.push([o, null]);
		let l = [];
		for (let [e, t] of a) e === t ? l.push(e) : !t && e === c[0] ? l.push("*") : t ? e === c[0] ? l.push(`<=${t}`) : l.push(`${e} - ${t}`) : l.push(`>=${e}`);
		let u = l.join(" || "), d = typeof t.raw == "string" ? t.raw : String(t);
		return u.length < d.length ? u : t;
	};
})), Ss = /* @__PURE__ */ z(((e, t) => {
	var n = ls(), r = us(), { ANY: i } = r, a = ds(), o = Jo(), s = (e, t, r = {}) => {
		if (e === t) return !0;
		e = new n(e, r), t = new n(t, r);
		let i = !1;
		OUTER: for (let n of e.set) {
			for (let e of t.set) {
				let t = u(n, e, r);
				if (i ||= t !== null, t) continue OUTER;
			}
			if (i) return !1;
		}
		return !0;
	}, c = [new r(">=0.0.0-0")], l = [new r(">=0.0.0")], u = (e, t, n) => {
		if (e === t) return !0;
		if (e.length === 1 && e[0].semver === i) {
			if (t.length === 1 && t[0].semver === i) return !0;
			e = n.includePrerelease ? c : l;
		}
		if (t.length === 1 && t[0].semver === i) {
			if (n.includePrerelease) return !0;
			t = l;
		}
		let r = /* @__PURE__ */ new Set(), s, u;
		for (let t of e) t.operator === ">" || t.operator === ">=" ? s = d(s, t, n) : t.operator === "<" || t.operator === "<=" ? u = f(u, t, n) : r.add(t.semver);
		if (r.size > 1) return null;
		let p;
		if (s && u && (p = o(s.semver, u.semver, n), p > 0 || p === 0 && (s.operator !== ">=" || u.operator !== "<="))) return null;
		for (let e of r) {
			if (s && !a(e, String(s), n) || u && !a(e, String(u), n)) return null;
			for (let r of t) if (!a(e, String(r), n)) return !1;
			return !0;
		}
		let m, h, g, _, v = u && !n.includePrerelease && u.semver.prerelease.length ? u.semver : !1, y = s && !n.includePrerelease && s.semver.prerelease.length ? s.semver : !1;
		v && v.prerelease.length === 1 && u.operator === "<" && v.prerelease[0] === 0 && (v = !1);
		for (let e of t) {
			if (_ = _ || e.operator === ">" || e.operator === ">=", g = g || e.operator === "<" || e.operator === "<=", s) {
				if (y && e.semver.prerelease && e.semver.prerelease.length && e.semver.major === y.major && e.semver.minor === y.minor && e.semver.patch === y.patch && (y = !1), e.operator === ">" || e.operator === ">=") {
					if (m = d(s, e, n), m === e && m !== s) return !1;
				} else if (s.operator === ">=" && !a(s.semver, String(e), n)) return !1;
			}
			if (u) {
				if (v && e.semver.prerelease && e.semver.prerelease.length && e.semver.major === v.major && e.semver.minor === v.minor && e.semver.patch === v.patch && (v = !1), e.operator === "<" || e.operator === "<=") {
					if (h = f(u, e, n), h === e && h !== u) return !1;
				} else if (u.operator === "<=" && !a(u.semver, String(e), n)) return !1;
			}
			if (!e.operator && (u || s) && p !== 0) return !1;
		}
		return !(s && g && !u && p !== 0 || u && _ && !s && p !== 0 || y || v);
	}, d = (e, t, n) => {
		if (!e) return t;
		let r = o(e.semver, t.semver, n);
		return r > 0 ? e : r < 0 || t.operator === ">" && e.operator === ">=" ? t : e;
	}, f = (e, t, n) => {
		if (!e) return t;
		let r = o(e.semver, t.semver, n);
		return r < 0 ? e : r > 0 || t.operator === "<" && e.operator === "<=" ? t : e;
	};
	t.exports = s;
})), Cs = /* @__PURE__ */ Xe((/* @__PURE__ */ z(((e, t) => {
	var n = Io(), r = Po(), i = q(), a = Ro();
	t.exports = {
		parse: zo(),
		valid: Bo(),
		clean: Vo(),
		inc: Ho(),
		diff: Uo(),
		major: Wo(),
		minor: Go(),
		patch: Ko(),
		prerelease: qo(),
		compare: Jo(),
		rcompare: Yo(),
		compareLoose: Xo(),
		compareBuild: Zo(),
		sort: Qo(),
		rsort: $o(),
		gt: es(),
		lt: ts(),
		eq: ns(),
		neq: rs(),
		gte: is(),
		lte: as(),
		cmp: os(),
		coerce: ss(),
		Comparator: us(),
		Range: ls(),
		satisfies: ds(),
		toComparators: fs(),
		maxSatisfying: ps(),
		minSatisfying: ms(),
		minVersion: hs(),
		validRange: gs(),
		outside: _s(),
		gtr: vs(),
		ltr: ys(),
		intersects: bs(),
		simplifyRange: xs(),
		subset: Ss(),
		SemVer: i,
		re: n.re,
		src: n.src,
		tokens: n.t,
		SEMVER_SPEC_VERSION: r.SEMVER_SPEC_VERSION,
		RELEASE_TYPES: r.RELEASE_TYPES,
		compareIdentifiers: a.compareIdentifiers,
		rcompareIdentifiers: a.rcompareIdentifiers
	};
})))(), 1), ws = Object.prototype.toString, Ts = "[object Uint8Array]", Es = "[object ArrayBuffer]";
function Ds(e, t, n) {
	return e ? e.constructor === t ? !0 : ws.call(e) === n : !1;
}
function Os(e) {
	return Ds(e, Uint8Array, Ts);
}
function ks(e) {
	return Ds(e, ArrayBuffer, Es);
}
function As(e) {
	return Os(e) || ks(e);
}
function js(e) {
	if (!Os(e)) throw TypeError(`Expected \`Uint8Array\`, got \`${typeof e}\``);
}
function Ms(e) {
	if (!As(e)) throw TypeError(`Expected \`Uint8Array\` or \`ArrayBuffer\`, got \`${typeof e}\``);
}
function Ns(e, t) {
	if (e.length === 0) return new Uint8Array();
	t ??= e.reduce((e, t) => e + t.length, 0);
	let n = new Uint8Array(t), r = 0;
	for (let t of e) js(t), n.set(t, r), r += t.length;
	return n;
}
var Ps = { utf8: new globalThis.TextDecoder("utf8") };
function Fs(e, t = "utf8") {
	return Ms(e), Ps[t] ??= new globalThis.TextDecoder(t), Ps[t].decode(e);
}
function Is(e) {
	if (typeof e != "string") throw TypeError(`Expected \`string\`, got \`${typeof e}\``);
}
var Ls = new globalThis.TextEncoder();
function Rs(e) {
	return Is(e), Ls.encode(e);
}
Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
//#endregion
//#region node_modules/conf/dist/source/index.js
var zs = "aes-256-cbc", Bs = new Set([
	"aes-256-cbc",
	"aes-256-gcm",
	"aes-256-ctr"
]), Vs = (e) => typeof e == "string" && Bs.has(e), Hs = () => Object.create(null), Us = (e) => e !== void 0, Ws = (e, t) => {
	let n = new Set([
		"undefined",
		"symbol",
		"function"
	]), r = typeof t;
	if (n.has(r)) throw TypeError(`Setting a value of type \`${r}\` for key \`${e}\` is not allowed as it's not supported by JSON`);
}, Gs = "__internal__", Ks = `${Gs}.migrations.version`, qs = class {
	path;
	events;
	#e;
	#t;
	#n;
	#r;
	#i = {};
	#a = !1;
	#o;
	#s;
	#c;
	constructor(e = {}) {
		let t = this.#l(e);
		this.#r = t, this.#u(t), this.#f(t), this.#p(t), this.events = new EventTarget(), this.#t = t.encryptionKey, this.#n = t.encryptionAlgorithm ?? zs, this.path = this.#m(t), this.#h(t), t.watch && this._watch();
	}
	get(e, t) {
		if (this.#r.accessPropertiesByDotNotation) return this._get(e, t);
		let { store: n } = this;
		return e in n ? n[e] : t;
	}
	set(e, t) {
		if (typeof e != "string" && typeof e != "object") throw TypeError(`Expected \`key\` to be of type \`string\` or \`object\`, got ${typeof e}`);
		if (typeof e != "object" && t === void 0) throw TypeError("Use `delete()` to clear values");
		if (this._containsReservedKey(e)) throw TypeError(`Please don't use the ${Gs} key, as it's used to manage this module internal operations.`);
		let { store: n } = this, r = (e, t) => {
			if (Ws(e, t), this.#r.accessPropertiesByDotNotation) dt(n, e, t);
			else {
				if (e === "__proto__" || e === "constructor" || e === "prototype") return;
				n[e] = t;
			}
		};
		if (typeof e == "object") {
			let t = e;
			for (let [e, n] of Object.entries(t)) r(e, n);
		} else r(e, t);
		this.store = n;
	}
	has(e) {
		return this.#r.accessPropertiesByDotNotation ? pt(this.store, e) : e in this.store;
	}
	appendToArray(e, t) {
		Ws(e, t);
		let n = this.#r.accessPropertiesByDotNotation ? this._get(e, []) : e in this.store ? this.store[e] : [];
		if (!Array.isArray(n)) throw TypeError(`The key \`${e}\` is already set to a non-array value`);
		this.set(e, [...n, t]);
	}
	reset(...e) {
		for (let t of e) Us(this.#i[t]) && this.set(t, this.#i[t]);
	}
	delete(e) {
		let { store: t } = this;
		this.#r.accessPropertiesByDotNotation ? ft(t, e) : delete t[e], this.store = t;
	}
	clear() {
		let e = Hs();
		for (let t of Object.keys(this.#i)) Us(this.#i[t]) && (Ws(t, this.#i[t]), this.#r.accessPropertiesByDotNotation ? dt(e, t, this.#i[t]) : e[t] = this.#i[t]);
		this.store = e;
	}
	onDidChange(e, t) {
		if (typeof e != "string") throw TypeError(`Expected \`key\` to be of type \`string\`, got ${typeof e}`);
		if (typeof t != "function") throw TypeError(`Expected \`callback\` to be of type \`function\`, got ${typeof t}`);
		return this._handleValueChange(() => this.get(e), t);
	}
	onDidAnyChange(e) {
		if (typeof e != "function") throw TypeError(`Expected \`callback\` to be of type \`function\`, got ${typeof e}`);
		return this._handleStoreChange(e);
	}
	get size() {
		return Object.keys(this.store).filter((e) => !this._isReservedKeyPath(e)).length;
	}
	get store() {
		try {
			let e = F.readFileSync(this.path, this.#t ? null : "utf8");
			return ((e) => {
				let t = this._deserialize(e);
				return this.#a || this._validate(t), Object.assign(Hs(), t);
			})(this._decryptData(e));
		} catch (e) {
			if (e?.code === "ENOENT") return this._ensureDirectory(), Hs();
			if (this.#r.clearInvalidConfig) {
				let t = e;
				if (t.name === "SyntaxError" || t.message?.startsWith("Config schema violation:") || t.message === "Failed to decrypt config data.") return Hs();
			}
			throw e;
		}
	}
	set store(e) {
		if (this._ensureDirectory(), !pt(e, Gs)) try {
			let t = F.readFileSync(this.path, this.#t ? null : "utf8"), n = this._decryptData(t), r = this._deserialize(n);
			pt(r, Gs) && dt(e, Gs, ut(r, Gs));
		} catch {}
		this.#a || this._validate(e), this._write(e), this.events.dispatchEvent(new Event("change"));
	}
	*[Symbol.iterator]() {
		for (let [e, t] of Object.entries(this.store)) this._isReservedKeyPath(e) || (yield [e, t]);
	}
	_closeWatcher() {
		this.#o &&= (this.#o.close(), void 0), this.#s &&= (F.unwatchFile(this.path), !1), this.#c = void 0;
	}
	_decryptData(e) {
		let t = this.#t;
		if (!t) return typeof e == "string" ? e : Fs(e);
		let n = this.#n, r = n === "aes-256-gcm" ? 16 : 0, i = ":".codePointAt(0), a = typeof e == "string" ? e.codePointAt(16) : e[16];
		if (!(i !== void 0 && a === i)) {
			if (n === "aes-256-cbc") return typeof e == "string" ? e : Fs(e);
			throw Error("Failed to decrypt config data.");
		}
		let o = (e) => {
			if (r === 0) return { ciphertext: e };
			let t = e.length - r;
			if (t < 0) throw Error("Invalid authentication tag length.");
			return {
				ciphertext: e.slice(0, t),
				authenticationTag: e.slice(t)
			};
		}, s = e.slice(0, 16), c = e.slice(17), l = typeof c == "string" ? Rs(c) : c, u = (e) => {
			let { ciphertext: r, authenticationTag: i } = o(l), a = Ie.pbkdf2Sync(t, e, 1e4, 32, "sha512"), c = Ie.createDecipheriv(n, a, s);
			return i && c.setAuthTag(i), Fs(Ns([c.update(r), c.final()]));
		};
		try {
			return u(s);
		} catch {
			try {
				return u(s.toString());
			} catch {}
		}
		if (n === "aes-256-cbc") return typeof e == "string" ? e : Fs(e);
		throw Error("Failed to decrypt config data.");
	}
	_handleStoreChange(e) {
		let t = this.store, n = () => {
			let n = t, r = this.store;
			Fe(r, n) || (t = r, e.call(this, r, n));
		};
		return this.events.addEventListener("change", n), () => {
			this.events.removeEventListener("change", n);
		};
	}
	_handleValueChange(e, t) {
		let n = e(), r = () => {
			let r = n, i = e();
			Fe(i, r) || (n = i, t.call(this, i, r));
		};
		return this.events.addEventListener("change", r), () => {
			this.events.removeEventListener("change", r);
		};
	}
	_deserialize = (e) => JSON.parse(e);
	_serialize = (e) => JSON.stringify(e, void 0, "	");
	_validate(e) {
		if (!this.#e || this.#e(e) || !this.#e.errors) return;
		let t = this.#e.errors.map(({ instancePath: e, message: t = "" }) => `\`${e.slice(1)}\` ${t}`);
		throw Error("Config schema violation: " + t.join("; "));
	}
	_ensureDirectory() {
		F.mkdirSync(M.dirname(this.path), { recursive: !0 });
	}
	_write(e) {
		let t = this._serialize(e), n = this.#t;
		if (n) {
			let e = Ie.randomBytes(16), r = Ie.pbkdf2Sync(n, e, 1e4, 32, "sha512"), i = Ie.createCipheriv(this.#n, r, e), a = Ns([i.update(Rs(t)), i.final()]), o = [
				e,
				Rs(":"),
				a
			];
			this.#n === "aes-256-gcm" && o.push(i.getAuthTag()), t = Ns(o);
		}
		if (L.env.SNAP) F.writeFileSync(this.path, t, { mode: this.#r.configFileMode });
		else try {
			Bt(this.path, t, { mode: this.#r.configFileMode });
		} catch (e) {
			if (e?.code === "EXDEV") {
				F.writeFileSync(this.path, t, { mode: this.#r.configFileMode });
				return;
			}
			throw e;
		}
	}
	_watch() {
		if (this._ensureDirectory(), F.existsSync(this.path) || this._write(Hs()), L.platform === "win32" || L.platform === "darwin") {
			this.#c ??= No(() => {
				this.events.dispatchEvent(new Event("change"));
			}, { wait: 100 });
			let e = M.dirname(this.path), t = M.basename(this.path);
			this.#o = F.watch(e, {
				persistent: !1,
				encoding: "utf8"
			}, (e, n) => {
				n && n !== t || typeof this.#c == "function" && this.#c();
			});
		} else this.#c ??= No(() => {
			this.events.dispatchEvent(new Event("change"));
		}, { wait: 1e3 }), F.watchFile(this.path, { persistent: !1 }, (e, t) => {
			typeof this.#c == "function" && this.#c();
		}), this.#s = !0;
	}
	_migrate(e, t, n) {
		let r = this._get(Ks, "0.0.0"), i = Object.keys(e).filter((e) => this._shouldPerformMigration(e, r, t)), a = structuredClone(this.store);
		for (let o of i) try {
			n && n(this, {
				fromVersion: r,
				toVersion: o,
				finalVersion: t,
				versions: i
			});
			let s = e[o];
			s?.(this), this._set(Ks, o), r = o, a = structuredClone(this.store);
		} catch (e) {
			this.store = a;
			let t = e instanceof Error ? e.message : String(e);
			throw Error(`Something went wrong during the migration! Changes applied to the store until this failed migration will be restored. ${t}`);
		}
		(this._isVersionInRangeFormat(r) || !Cs.default.eq(r, t)) && this._set(Ks, t);
	}
	_containsReservedKey(e) {
		return typeof e == "string" ? this._isReservedKeyPath(e) : !e || typeof e != "object" ? !1 : this._objectContainsReservedKey(e);
	}
	_objectContainsReservedKey(e) {
		if (!e || typeof e != "object") return !1;
		for (let [t, n] of Object.entries(e)) if (this._isReservedKeyPath(t) || this._objectContainsReservedKey(n)) return !0;
		return !1;
	}
	_isReservedKeyPath(e) {
		return e === Gs || e.startsWith(`${Gs}.`);
	}
	_isVersionInRangeFormat(e) {
		return Cs.default.clean(e) === null;
	}
	_shouldPerformMigration(e, t, n) {
		return this._isVersionInRangeFormat(e) ? t !== "0.0.0" && Cs.default.satisfies(t, e) ? !1 : Cs.default.satisfies(n, e) : !(Cs.default.lte(e, t) || Cs.default.gt(e, n));
	}
	_get(e, t) {
		return ut(this.store, e, t);
	}
	_set(e, t) {
		let { store: n } = this;
		dt(n, e, t), this.store = n;
	}
	#l(e) {
		let t = {
			configName: "config",
			fileExtension: "json",
			projectSuffix: "nodejs",
			clearInvalidConfig: !1,
			accessPropertiesByDotNotation: !0,
			configFileMode: 438,
			...e
		};
		if (t.encryptionAlgorithm ??= zs, !Vs(t.encryptionAlgorithm)) throw TypeError(`The \`encryptionAlgorithm\` option must be one of: ${[...Bs].join(", ")}`);
		if (!t.cwd) {
			if (!t.projectName) throw Error("Please specify the `projectName` option.");
			t.cwd = bt(t.projectName, { suffix: t.projectSuffix }).config;
		}
		return typeof t.fileExtension == "string" && (t.fileExtension = t.fileExtension.replace(/^\.+/, "")), t;
	}
	#u(e) {
		if (!(e.schema ?? e.ajvOptions ?? e.rootSchema)) return;
		if (e.schema && typeof e.schema != "object") throw TypeError("The `schema` option must be an object.");
		let t = wo.default.default, n = new Co.Ajv2020({
			allErrors: !0,
			useDefaults: !0,
			...e.ajvOptions
		});
		t(n);
		let r = {
			...e.rootSchema,
			type: "object",
			properties: e.schema
		};
		this.#e = n.compile(r), this.#d(e.schema);
	}
	#d(e) {
		let t = Object.entries(e ?? {});
		for (let [e, n] of t) {
			if (!n || typeof n != "object" || !Object.hasOwn(n, "default")) continue;
			let { default: t } = n;
			t !== void 0 && (this.#i[e] = t);
		}
	}
	#f(e) {
		e.defaults && Object.assign(this.#i, e.defaults);
	}
	#p(e) {
		e.serialize && (this._serialize = e.serialize), e.deserialize && (this._deserialize = e.deserialize);
	}
	#m(e) {
		let t = typeof e.fileExtension == "string" ? e.fileExtension : void 0, n = t ? `.${t}` : "";
		return M.resolve(e.cwd, `${e.configName ?? "config"}${n}`);
	}
	#h(e) {
		if (e.migrations) {
			this.#g(e), this._validate(this.store);
			return;
		}
		let t = this.store, n = Object.assign(Hs(), e.defaults ?? {}, t);
		this._validate(n);
		try {
			ze.deepEqual(t, n);
		} catch {
			this.store = n;
		}
	}
	#g(e) {
		let { migrations: t, projectVersion: n } = e;
		if (t) {
			if (!n) throw Error("Please specify the `projectVersion` option.");
			this.#a = !0;
			try {
				let r = this.store, i = Object.assign(Hs(), e.defaults ?? {}, r);
				try {
					ze.deepEqual(r, i);
				} catch {
					this._write(i);
				}
				this._migrate(t, n, e.beforeEachMigration);
			} finally {
				this.#a = !1;
			}
		}
	}
}, { app: Js, ipcMain: Ys, shell: Xs } = me, Zs = !1, Qs = () => {
	if (!Ys || !Js) throw Error("Electron Store: You need to call `.initRenderer()` from the main process.");
	let e = {
		defaultCwd: Js.getPath("userData"),
		appVersion: Js.getVersion()
	};
	return Zs ? e : (Ys.on("electron-store-get-data", (t) => {
		t.returnValue = e;
	}), Zs = !0, e);
}, $s = class extends qs {
	constructor(e) {
		let t, n;
		if (L.type === "renderer") {
			let e = me.ipcRenderer.sendSync("electron-store-get-data");
			if (!e) throw Error("Electron Store: You need to call `.initRenderer()` from the main process.");
			({defaultCwd: t, appVersion: n} = e);
		} else Ys && Js && ({defaultCwd: t, appVersion: n} = Qs());
		e = {
			name: "config",
			...e
		}, e.projectVersion ||= n, e.cwd ? e.cwd = M.isAbsolute(e.cwd) ? e.cwd : M.join(t, e.cwd) : e.cwd = t, e.configName = e.name, delete e.name, super(e);
	}
	static initRenderer() {
		Qs();
	}
	async openInEditor() {
		let e = await Xs.openPath(this.path);
		if (e) throw Error(e);
	}
}, ec = {
	casual: /\b(hey|cool|awesome|great|thanks?|please|appreciate)\b/i,
	formal: /\b(please|kindly|would you|could|i would appreciate)\b/i,
	technical: /\b(api|function|method|call|invoke|execute|implement)\b/i,
	brief: /\b(just|quick|simple|brief)\b/i,
	detailed: /\b(detailed|thorough|complete|full)\b/i
}, tc = {
	modern: /\b(typescript|rust|go|modern|es2022)\b/i,
	classic: /\b(javascript|java|python|classic)\b/i,
	functional: /\b(map|filter|reduce|lambda|pure)\b/i,
	oop: /\b(class|object|inherit|extends)\b/i,
	imperative: /\b(let|var|const|assignment|loop)\b/i
}, nc = [
	"git",
	"npm",
	"yarn",
	"pnpm",
	"node",
	"python",
	"pip",
	"docker",
	"kubectl",
	"bash",
	"shell",
	"grep",
	"sed",
	"awk",
	"make",
	"cmake",
	"curl",
	"wget",
	"http",
	"api",
	"rest",
	"graphql"
];
function rc(e) {
	if (!e || e.length < 10) return;
	let t = e.toLowerCase();
	for (let [e, n] of Object.entries(ec)) n.test(t) && oc("all", "tone", e, .3);
	for (let [e, n] of Object.entries(tc)) n.test(t) && oc("all", "code_style", e, .2);
}
function ic(e, t) {
	if (!e) return;
	let n = t.toLowerCase();
	for (let e of nc) n.includes(e) && oc("skill", "tool", e, .5);
	oc("skill", "tool", e, .3);
}
function ac(e) {
	e && oc("prompt", "language", e, .4);
}
function oc(t, n, a, o) {
	let s = r("SELECT * FROM user_preferences WHERE scope = ? AND dimension = ? AND value = ?", [
		t,
		n,
		a
	])[0];
	s ? e("UPDATE user_preferences SET weight = ?, sample_count = ?, updated_at = datetime(\"now\") WHERE id = ?", [
		Math.min(1, s.weight + o),
		s.sample_count + 1,
		s.id
	]) : i("user_preferences", {
		id: l(),
		scope: t,
		dimension: n,
		value: a,
		weight: o,
		sample_count: 1
	});
}
function sc(e) {
	let t = "SELECT * FROM user_preferences", r = [];
	return e && (t += " WHERE scope = ?", r.push(e)), t += " ORDER BY weight DESC, sample_count DESC", n(t, ...r).map((e) => ({
		id: e.id,
		scope: e.scope,
		dimension: e.dimension,
		value: e.value,
		weight: e.weight,
		sample_count: e.sample_count,
		created_at: e.created_at,
		updated_at: e.updated_at
	}));
}
function cc() {
	let e = sc();
	if (e.length === 0) return "";
	let t = e.find((e) => e.dimension === "tone" && e.weight > .3), n = e.find((e) => e.dimension === "code_style" && e.weight > .3), r = e.find((e) => e.dimension === "tool" && e.weight > .3), i = e.find((e) => e.dimension === "language" && e.weight > .3), a = [];
	return t && a.push(`语气风格：${{
		casual: "保持轻松友好的语气，像朋友之间交流",
		formal: "使用正式礼貌的语言",
		technical: "使用准确的技术术语",
		brief: "简洁明了，直接给出要点",
		detailed: "提供详细完整的解释"
	}[t.value] || "自然流畅"}`), n && a.push(`代码风格：${{
		modern: "优先使用现代编程实践",
		classic: "使用经过验证的经典方法",
		functional: "推荐函数式编程风格",
		oop: "使用面向对象设计",
		imperative: "清晰明确的命令式代码"
	}[n.value] || "根据场景选择合适风格"}`), r && r.weight > .5 && a.push(`常用工具：${r.value}，优先使用熟悉的工具`), i && a.push(`首选语言：${i.value}`), a.length > 0 ? `\n[\u7528\u6237\u5047\u5957]\n${a.join("\n")}` : "";
}
//#endregion
//#region electron/services/context-orchestrator.ts
function lc(e) {
	return Math.ceil(e.length / 4);
}
function uc(e, t) {
	return e.length <= t ? e : `${e.slice(0, Math.max(0, t - 1)).trimEnd()}…`;
}
function dc(e) {
	return P.existsSync(e) ? P.readdirSync(e, { withFileTypes: !0 }).filter((e) => e.isFile() && e.name.endsWith(".md")).map((t) => Se.join(e, t.name)).sort((e, t) => e.localeCompare(t)) : [];
}
function fc(e) {
	let t = [
		Se.join(e, "README.md"),
		Se.join(e, "Agent_Extension_Design.md"),
		...dc(Se.join(e, "design")),
		...dc(Se.join(e, "docs"))
	];
	return Array.from(new Set(t)).filter((e) => P.existsSync(e));
}
function pc(e, t) {
	let n = fc(e).slice(0, 6), r = [], i = [], a = t;
	for (let t of n) {
		if (a <= 0) break;
		let n = P.readFileSync(t, "utf-8").replace(/^---[\s\S]+?---/m, "").replace(/\s+/g, " ").trim();
		if (!n) continue;
		let o = uc(n, Math.min(a, 700));
		r.push(`[${Se.relative(e, t)}]\n${o}`), i.push(t), a -= o.length;
	}
	return {
		block: r.join("\n\n---\n\n"),
		refs: i
	};
}
function mc(e, t, n) {
	let r = t.slice(0, n).map((e) => `- ${e.title}: ${e.summary}`);
	return r.length === 0 ? "" : `${e}\n${r.join("\n")}`;
}
var hc = class {
	constructor(e) {
		this.deps = e;
	}
	async buildContextPacket(e = {}) {
		let t = Math.max(1200, e.totalBudget || 6e3), n = Math.max(600, e.reservedForResponse || Math.floor(t * .4)), r = t - n, i = Math.floor(r * .3), a = Math.floor(r * .25), o = Math.floor(r * .2), s = Math.floor(r * .15), l = Math.floor(r * .1), u = pc(this.deps.projectRoot, i * 4), d = m({
			scope: e.sessionId ? "session" : "project",
			status: "active",
			limit: 10
		}), f = m({
			scope: "project",
			status: "active",
			limit: 12
		}).filter((e) => e.kind === "decision" || e.kind === "artifact" || e.kind === "summary"), p = m({
			status: "active",
			limit: 6
		}).filter((e) => e.kind === "style" || e.kind === "constraint"), h = uc(mc("Working Memory", d, 6), a * 4), g = uc(mc("Episodic Memory", f, 6), o * 4), _ = uc(mc("Style And Constraints", p, 5), l * 4) || void 0, v = "", y = [];
		if (e.query?.trim()) try {
			let t = this.deps.getEmbeddingConfig();
			t.model && (v = uc((await c(e.query, t, 3)).map((e) => {
				let t = e.doc?.filename || "unknown";
				return y.push(t), `- ${t}: ${e.chunk.content}`;
			}).join("\n"), s * 4));
		} catch {
			v = "";
		}
		let b = Array.from(new Set([
			...u.refs,
			...d.map((e) => e.source_ref),
			...f.map((e) => e.source_ref),
			...p.map((e) => e.source_ref),
			...y
		].filter(Boolean))), x = lc([
			u.block,
			h,
			g,
			v,
			_ || ""
		].join("\n\n"));
		return {
			anchorBlock: u.block,
			workingBlock: h,
			episodicBlock: g,
			retrievalBlock: v,
			styleBlock: _,
			tokenBudget: {
				total: t,
				reservedForResponse: n,
				usedByContext: x
			},
			refs: b
		};
	}
	async compactContext(e = {}) {
		let t = m({
			scope: e.sessionId ? "session" : "project",
			status: "active",
			limit: 12
		}), n = m({
			scope: "project",
			status: "active",
			limit: 12
		}), r = e.sessionId ? u(e.sessionId, 10) : [], i = n.filter((e) => e.kind === "goal").map((e) => e.summary), a = n.filter((e) => e.kind === "constraint" || e.kind === "style").map((e) => e.summary), o = n.filter((e) => e.kind === "decision" || e.kind === "artifact" || e.kind === "summary").map((e) => e.summary), s = n.filter((e) => e.kind === "issue").map((e) => e.summary), c = n.filter((e) => e.kind === "next_step").map((e) => e.summary), l = t.slice(0, 3).map((e) => e.summary), d = Array.from(new Set([...t.map((e) => e.source_ref), ...n.map((e) => e.source_ref)].filter(Boolean))).slice(0, 10), f = [
			"goal:",
			i.length ? i.slice(0, 3).map((e) => `- ${e}`).join("\n") : "- Continue the current EasyTerminal task without losing the project direction.",
			"immutable_constraints:",
			a.length ? a.slice(0, 5).map((e) => `- ${e}`).join("\n") : "- Keep alignment with existing design documents and preserve current user intent.",
			"decisions:",
			o.length ? o.slice(0, 5).map((e) => `- ${e}`).join("\n") : "- No stable decisions have been recorded yet.",
			"open_questions:",
			s.length ? s.slice(0, 5).map((e) => `- ${e}`).join("\n") : "- None currently recorded.",
			"next_actions:",
			(c.length ? c : l).slice(0, 5).map((e) => `- ${e}`).join("\n") || "- Continue the next planned implementation step.",
			"style_guidance:",
			a.length ? a.slice(0, 3).map((e) => `- ${e}`).join("\n") : "- Preserve the established product and writing style.",
			"evidence_refs:",
			d.length ? d.map((e) => `- ${e}`).join("\n") : "- No evidence refs recorded yet.",
			r.length ? "recent_events:" : "",
			r.length ? r.slice(0, 3).map((e) => `- ${e.event_type}: ${uc(e.payload, 160)}`).join("\n") : ""
		].filter(Boolean).join("\n"), p = (E({
			sessionId: e.sessionId,
			taskId: e.taskId,
			limit: 1
		})[0]?.version || 0) + 1, _ = g({
			session_id: e.sessionId || "",
			task_id: e.taskId || "",
			version: p,
			summary_block: f,
			token_estimate: lc(f),
			drift_score: 0,
			status: "candidate"
		}), y = this.deps.driftGuard ? this.deps.driftGuard.checkSummary(f, {
			sessionId: e.sessionId,
			taskId: e.taskId
		}) : null;
		return !y || y.aligned ? (h(_.id, {
			drift_score: y?.score || 1,
			status: "active"
		}), v(_.id)) : h(_.id, {
			drift_score: y.score,
			status: "candidate"
		}), {
			snapshot: E({
				sessionId: e.sessionId,
				taskId: e.taskId,
				limit: 1
			})[0],
			driftCheck: y
		};
	}
};
function gc(e) {
	return new hc(e);
}
//#endregion
//#region electron/services/drift-guard.ts
function _c(e, t) {
	let n = e.split("\n"), r = n.findIndex((e) => e.trim() === `${t}:`);
	if (r === -1) return [];
	let i = [];
	for (let e = r + 1; e < n.length; e += 1) {
		let t = n[e];
		if (t.trim()) {
			if (!t.startsWith("- ") && t.endsWith(":")) break;
			t.startsWith("- ") && i.push(t.slice(2).trim());
		}
	}
	return i;
}
function vc(e) {
	return e.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}
function yc(e) {
	let t = vc(e);
	if (!t) return [];
	let n = t.split(" ").filter((e) => e.length >= 4).slice(0, 4);
	return n.length > 0 ? n : [t.slice(0, 8)];
}
function bc(e, t) {
	let n = vc(e);
	return yc(t).some((e) => n.includes(e));
}
var xc = class {
	checkSummary(e, t = {}) {
		let n = [], r = _c(e, "goal"), i = _c(e, "immutable_constraints"), a = _c(e, "style_guidance"), o = _c(e, "evidence_refs"), s = m({
			kind: "goal",
			status: "active",
			limit: 20
		}), c = m({
			kind: "constraint",
			status: "active",
			limit: 20
		}), l = m({
			kind: "style",
			status: "active",
			limit: 20
		}), u = r.join("\n"), d = i.join("\n"), f = a.join("\n");
		for (let e of s) bc(u, e.summary) || n.push({
			type: "goal",
			message: `Summary no longer clearly reflects active goal: ${e.title}`,
			anchorRef: e.source_ref
		});
		for (let e of c) !bc(d, e.summary) && !bc(f, e.summary) && n.push({
			type: "constraint",
			message: `Immutable constraint appears missing: ${e.title}`,
			anchorRef: e.source_ref
		});
		for (let e of l) bc(f, e.summary) || n.push({
			type: "style",
			message: `Style guidance appears missing: ${e.title}`,
			anchorRef: e.source_ref
		});
		o.length === 0 && n.push({
			type: "scope",
			message: "Summary is missing evidence refs."
		}), !t.sessionId && !t.taskId && r.length === 0 && n.push({
			type: "scope",
			message: "Summary is missing a goal section for the current task context."
		});
		let p = Math.max(0, 1 - n.length * .2);
		return {
			aligned: n.length === 0,
			score: p,
			conflicts: n
		};
	}
};
function Sc() {
	return new xc();
}
//#endregion
//#region electron/services/capability-registry.ts
var J = {
	captureInput: !0,
	captureOutput: !0,
	summarizeOutput: !1,
	defaultScope: "session"
};
function Cc(e, t) {
	return e.toLowerCase().includes(t);
}
function wc(e) {
	let t = e.trim().toLowerCase();
	return t ? S().filter((e) => e.name.toLowerCase().includes(t) || e.description.toLowerCase().includes(t) || e.tags.some((e) => e.toLowerCase().includes(t))) : S();
}
var Tc = class {
	constructor(e) {
		this.capabilities = /* @__PURE__ */ new Map(), this.context = e;
	}
	register(e, t) {
		this.capabilities.set(e.id, {
			definition: e,
			invoke: t
		});
	}
	list(e) {
		let t = e?.query?.trim().toLowerCase() || "", n = e?.kinds ? new Set(e.kinds) : null;
		return Array.from(this.capabilities.values()).map((e) => e.definition).filter((e) => n && !n.has(e.kind) ? !1 : t ? Cc(e.id, t) || Cc(e.title, t) || Cc(e.description, t) || e.tags.some((e) => Cc(e, t)) : !0).sort((e, t) => e.title.localeCompare(t.title));
	}
	get(e) {
		return this.capabilities.get(e)?.definition;
	}
	async invoke(e, t) {
		let n = this.capabilities.get(e);
		if (!n) return {
			capabilityId: e,
			success: !1,
			error: "Capability not found"
		};
		try {
			return {
				capabilityId: e,
				success: !0,
				data: await n.invoke(t, this.context)
			};
		} catch (t) {
			return {
				capabilityId: e,
				success: !1,
				error: t instanceof Error ? t.message : "Unknown capability error"
			};
		}
	}
};
function Ec(e) {
	let t = new Tc(e);
	return t.register({
		id: "prompt.search",
		kind: "prompt",
		title: "Search Prompts",
		description: "Search saved prompt templates by keyword, title, content, or tags.",
		tags: [
			"prompt",
			"search",
			"template"
		],
		inputSchema: {
			type: "object",
			properties: { query: { type: "string" } },
			required: ["query"]
		},
		outputSchema: { type: "array" },
		permissions: [],
		memoryPolicy: J,
		entrypoint: {
			type: "local-js",
			target: "promptManager.searchPrompts"
		}
	}, async (e) => d(String(e.query || ""))), t.register({
		id: "prompt.render",
		kind: "prompt",
		title: "Render Prompt",
		description: "Render a saved prompt template using provided variables.",
		tags: [
			"prompt",
			"render",
			"template"
		],
		inputSchema: {
			type: "object",
			properties: {
				promptId: { type: "string" },
				values: { type: "object" }
			},
			required: ["promptId"]
		},
		outputSchema: { type: "string" },
		permissions: [],
		memoryPolicy: J,
		entrypoint: {
			type: "local-js",
			target: "promptManager.renderPrompt"
		}
	}, async (e) => _(String(e.promptId || ""), e.values || {})), t.register({
		id: "prompt.optimize",
		kind: "prompt",
		title: "Optimize Prompt",
		description: "Rewrite a draft prompt using the configured reasoning model.",
		tags: [
			"prompt",
			"optimize",
			"llm"
		],
		inputSchema: {
			type: "object",
			properties: {
				draftPrompt: { type: "string" },
				providerId: { type: "string" },
				model: { type: "string" }
			},
			required: ["draftPrompt"]
		},
		outputSchema: { type: "string" },
		permissions: [],
		memoryPolicy: J,
		entrypoint: {
			type: "local-js",
			target: "promptManager.optimizePrompt"
		}
	}, async (e, t) => {
		let n = t.getLLMConfig(typeof e.providerId == "string" ? e.providerId : void 0, typeof e.model == "string" ? e.model : void 0);
		if (!n) throw Error("No reasoning model configured");
		return oe(n, String(e.draftPrompt || ""));
	}), t.register({
		id: "skill.search",
		kind: "skill",
		title: "Search Skills",
		description: "Search indexed skills by semantic similarity using the configured embedding model.",
		tags: [
			"skill",
			"search",
			"embedding"
		],
		inputSchema: {
			type: "object",
			properties: {
				query: { type: "string" },
				topK: { type: "number" }
			},
			required: ["query"]
		},
		outputSchema: { type: "array" },
		permissions: [],
		memoryPolicy: J,
		entrypoint: {
			type: "local-js",
			target: "skillManager.searchSkills"
		}
	}, async (e, t) => {
		let n = typeof e.topK == "number" ? e.topK : Number(e.topK || 5);
		return T(String(e.query || ""), t.getEmbeddingConfig(), n);
	}), t.register({
		id: "skill.get",
		kind: "skill",
		title: "Get Skill",
		description: "Get a skill definition and metadata by id.",
		tags: ["skill", "metadata"],
		inputSchema: {
			type: "object",
			properties: { skillId: { type: "string" } },
			required: ["skillId"]
		},
		outputSchema: { type: "object" },
		permissions: [],
		memoryPolicy: J,
		entrypoint: {
			type: "local-js",
			target: "skillManager.getSkill"
		}
	}, async (e) => {
		let t = C(String(e.skillId || ""));
		if (!t) throw Error("Skill not found");
		return t;
	}), t.register({
		id: "workflow.search",
		kind: "workflow",
		title: "Search Workflows",
		description: "Search workflows by name, description, or tags.",
		tags: [
			"workflow",
			"search",
			"dag"
		],
		inputSchema: {
			type: "object",
			properties: { query: { type: "string" } }
		},
		outputSchema: { type: "array" },
		permissions: [],
		memoryPolicy: {
			...J,
			summarizeOutput: !0,
			defaultScope: "project"
		},
		entrypoint: {
			type: "local-js",
			target: "workflowEngine.listWorkflows"
		}
	}, async (e) => wc(String(e.query || ""))), t.register({
		id: "workflow.get",
		kind: "workflow",
		title: "Get Workflow",
		description: "Get workflow details by id.",
		tags: [
			"workflow",
			"metadata",
			"dag"
		],
		inputSchema: {
			type: "object",
			properties: { workflowId: { type: "string" } },
			required: ["workflowId"]
		},
		outputSchema: { type: "object" },
		permissions: [],
		memoryPolicy: {
			...J,
			summarizeOutput: !0,
			defaultScope: "project"
		},
		entrypoint: {
			type: "local-js",
			target: "workflowEngine.getWorkflow"
		}
	}, async (e) => {
		let t = te(String(e.workflowId || ""));
		if (!t) throw Error("Workflow not found");
		return t;
	}), t.register({
		id: "workflow.execute",
		kind: "workflow",
		title: "Execute Workflow",
		description: "Execute a workflow using the configured reasoning and embedding models.",
		tags: [
			"workflow",
			"execute",
			"dag"
		],
		inputSchema: {
			type: "object",
			properties: {
				workflowId: { type: "string" },
				variables: { type: "object" },
				providerId: { type: "string" },
				model: { type: "string" }
			},
			required: ["workflowId"]
		},
		outputSchema: { type: "object" },
		permissions: [],
		memoryPolicy: {
			...J,
			summarizeOutput: !0,
			defaultScope: "project"
		},
		entrypoint: {
			type: "local-js",
			target: "workflowEngine.executeWorkflow"
		}
	}, async (e, t) => {
		let n = t.getLLMConfig(typeof e.providerId == "string" ? e.providerId : void 0, typeof e.model == "string" ? e.model : void 0);
		if (!n) throw Error("No reasoning model configured");
		return b(String(e.workflowId || ""), n, e.variables || {}, t.getEmbeddingConfig());
	}), t.register({
		id: "knowledge.search",
		kind: "knowledge",
		title: "Search Knowledge Base",
		description: "Retrieve the most relevant chunks from the local knowledge base.",
		tags: [
			"knowledge",
			"rag",
			"search"
		],
		inputSchema: {
			type: "object",
			properties: {
				query: { type: "string" },
				topK: { type: "number" },
				collection: { type: "string" }
			},
			required: ["query"]
		},
		outputSchema: { type: "array" },
		permissions: [],
		memoryPolicy: {
			...J,
			summarizeOutput: !0,
			defaultScope: "project"
		},
		entrypoint: {
			type: "local-js",
			target: "knowledgeBase.retrieveContext"
		}
	}, async (e, t) => {
		let n = typeof e.topK == "number" ? e.topK : Number(e.topK || 5);
		return c(String(e.query || ""), t.getEmbeddingConfig(), n, typeof e.collection == "string" ? e.collection : void 0);
	}), t.register({
		id: "knowledge.build_context",
		kind: "knowledge",
		title: "Build Knowledge Context",
		description: "Build a RAG-enhanced prompt from local knowledge base documents.",
		tags: [
			"knowledge",
			"rag",
			"prompt"
		],
		inputSchema: {
			type: "object",
			properties: {
				query: { type: "string" },
				topK: { type: "number" },
				collection: { type: "string" }
			},
			required: ["query"]
		},
		outputSchema: { type: "string" },
		permissions: [],
		memoryPolicy: {
			...J,
			summarizeOutput: !0,
			defaultScope: "project"
		},
		entrypoint: {
			type: "local-js",
			target: "knowledgeBase.buildRAGPrompt"
		}
	}, async (e, t) => {
		let n = typeof e.topK == "number" ? e.topK : Number(e.topK || 5);
		return o(String(e.query || ""), t.getEmbeddingConfig(), n, typeof e.collection == "string" ? e.collection : void 0);
	}), t.register({
		id: "context.list",
		kind: "context",
		title: "List Context Artifacts",
		description: "List saved session logs, snippets, and project context artifacts.",
		tags: [
			"context",
			"vault",
			"artifacts"
		],
		inputSchema: {
			type: "object",
			properties: {}
		},
		outputSchema: { type: "object" },
		permissions: [],
		memoryPolicy: {
			...J,
			captureInput: !1,
			defaultScope: "project"
		},
		entrypoint: {
			type: "local-js",
			target: "contextManager.listArtifacts"
		}
	}, async (e, t) => t.listContextArtifacts()), t.register({
		id: "context.capture",
		kind: "context",
		title: "Capture Context Snippet",
		description: "Save a snippet into the local context vault.",
		tags: [
			"context",
			"vault",
			"snippet"
		],
		inputSchema: {
			type: "object",
			properties: {
				content: { type: "string" },
				source: { type: "string" }
			},
			required: ["content"]
		},
		outputSchema: { type: "object" },
		permissions: [],
		memoryPolicy: {
			...J,
			summarizeOutput: !0,
			defaultScope: "project"
		},
		entrypoint: {
			type: "local-js",
			target: "contextManager.saveContextSnippet"
		}
	}, async (e, t) => t.saveContextSnippet(String(e.content || ""), typeof e.source == "string" ? e.source : void 0)), t.register({
		id: "context.records",
		kind: "context",
		title: "List Context Records",
		description: "List structured context memory records by scope, kind, or query.",
		tags: [
			"context",
			"records",
			"memory"
		],
		inputSchema: {
			type: "object",
			properties: {
				scope: { type: "string" },
				kind: { type: "string" },
				status: { type: "string" },
				query: { type: "string" },
				limit: { type: "number" }
			}
		},
		outputSchema: { type: "array" },
		permissions: [],
		memoryPolicy: {
			...J,
			captureInput: !1,
			summarizeOutput: !0,
			defaultScope: "project"
		},
		entrypoint: {
			type: "local-js",
			target: "contextStore.queryRecords"
		}
	}, async (e, t) => t.queryContextRecords(e)), t.register({
		id: "context.snapshots",
		kind: "context",
		title: "List Context Snapshots",
		description: "List saved context snapshots by session, task, or status.",
		tags: [
			"context",
			"snapshots",
			"memory"
		],
		inputSchema: {
			type: "object",
			properties: {
				sessionId: { type: "string" },
				taskId: { type: "string" },
				status: { type: "string" },
				limit: { type: "number" }
			}
		},
		outputSchema: { type: "array" },
		permissions: [],
		memoryPolicy: {
			...J,
			captureInput: !1,
			summarizeOutput: !0,
			defaultScope: "project"
		},
		entrypoint: {
			type: "local-js",
			target: "contextStore.listSnapshots"
		}
	}, async (e, t) => t.listContextSnapshots(e)), t.register({
		id: "context.session_events",
		kind: "context",
		title: "List Session Events",
		description: "List recent structured session events for a given session id.",
		tags: [
			"context",
			"session",
			"events"
		],
		inputSchema: {
			type: "object",
			properties: {
				sessionId: { type: "string" },
				limit: { type: "number" }
			},
			required: ["sessionId"]
		},
		outputSchema: { type: "array" },
		permissions: [],
		memoryPolicy: {
			...J,
			captureInput: !1,
			summarizeOutput: !0,
			defaultScope: "session"
		},
		entrypoint: {
			type: "local-js",
			target: "contextStore.listSessionEvents"
		}
	}, async (e, t) => t.listSessionEvents(String(e.sessionId || ""), typeof e.limit == "number" ? e.limit : Number(e.limit || 50))), t.register({
		id: "ui.present_result",
		kind: "ui",
		title: "Present Result Panel",
		description: "Render a result panel in the EasyTerminal UI using the UI intent channel.",
		tags: [
			"ui",
			"intent",
			"result"
		],
		inputSchema: {
			type: "object",
			properties: {
				title: { type: "string" },
				description: { type: "string" },
				payload: { type: "object" }
			}
		},
		outputSchema: { type: "object" },
		permissions: [],
		memoryPolicy: {
			...J,
			captureInput: !1,
			captureOutput: !1,
			summarizeOutput: !1,
			defaultScope: "session"
		},
		entrypoint: {
			type: "ipc",
			target: "ui:intent:set"
		}
	}, async (e, t) => t.setUIIntent({
		id: `ui_intent_${Date.now()}`,
		type: "show_result_panel",
		title: typeof e.title == "string" ? e.title : "Agent 返回",
		description: typeof e.description == "string" ? e.description : "通过 UI Intent 渲染的结构化结果。",
		payload: e.payload || {}
	})), t.register({
		id: "ui.show_context_snapshot",
		kind: "ui",
		title: "Show Context Snapshot",
		description: "Render a context snapshot in the EasyTerminal UI using the UI intent channel.",
		tags: [
			"ui",
			"intent",
			"context",
			"snapshot"
		],
		inputSchema: {
			type: "object",
			properties: {
				snapshotId: { type: "string" },
				title: { type: "string" }
			},
			required: ["snapshotId"]
		},
		outputSchema: { type: "object" },
		permissions: [],
		memoryPolicy: {
			...J,
			captureInput: !1,
			captureOutput: !1,
			summarizeOutput: !1,
			defaultScope: "session"
		},
		entrypoint: {
			type: "ipc",
			target: "ui:intent:set"
		}
	}, async (e, t) => {
		let n = String(e.snapshotId || ""), r = E({ limit: 200 }).find((e) => e.id === n);
		if (!r) throw Error("Snapshot not found");
		return t.setUIIntent({
			id: `ui_snapshot_${r.id}`,
			type: "show_context_snapshot",
			title: typeof e.title == "string" ? e.title : `上下文快照 v${r.version}`,
			description: "通过 UI Intent 渲染的上下文快照。",
			payload: {
				snapshotId: r.id,
				sessionId: r.session_id,
				taskId: r.task_id,
				status: r.status,
				driftScore: r.drift_score,
				summary: r.summary_block
			}
		});
	}), t.register({
		id: "ui.clear_intent",
		kind: "ui",
		title: "Clear UI Intent",
		description: "Clear the current UI intent panel.",
		tags: [
			"ui",
			"intent",
			"clear"
		],
		inputSchema: {
			type: "object",
			properties: {}
		},
		outputSchema: { type: "boolean" },
		permissions: [],
		memoryPolicy: {
			...J,
			captureInput: !1,
			captureOutput: !1,
			summarizeOutput: !1,
			defaultScope: "session"
		},
		entrypoint: {
			type: "ipc",
			target: "ui:intent:clear"
		}
	}, async (e, t) => t.clearUIIntent()), t;
}
//#endregion
//#region electron/services/island-manager.ts
var Dc = () => ({
	isRealPrompt: !1,
	confidence: 0,
	menuType: "none",
	question: "",
	options: [],
	selectedIndex: -1
}), Oc = class {
	constructor() {
		this.state = {
			agentState: "idle",
			taskProgress: {
				current: 0,
				total: 0,
				label: ""
			},
			lastMessage: ""
		}, this.store = new $s({ name: "island-config" }), this.config = {
			sensitivity: this.store.get("island.sensitivity", .75),
			smartDetection: this.store.get("island.smartDetection", !0),
			ignorePatterns: this.store.get("island.ignorePatterns", []),
			minOptions: this.store.get("island.minOptions", 2),
			maxOptions: this.store.get("island.maxOptions", 8)
		};
	}
	getConfig() {
		return {
			...this.config,
			ignorePatterns: [...this.config.ignorePatterns]
		};
	}
	updateConfig(e) {
		this.config = {
			...this.config,
			...e
		};
		for (let [t, n] of Object.entries(e)) this.store.set(`island.${t}`, n);
		return this.getConfig();
	}
	detect(e, t) {
		return Dc();
	}
	getState() {
		return {
			...this.state,
			taskProgress: { ...this.state.taskProgress }
		};
	}
	setAgentState(e) {
		this.state.agentState = e;
	}
	setTaskProgress(e, t, n) {
		this.state.taskProgress = {
			current: e,
			total: t,
			label: n
		};
	}
	setLastMessage(e) {
		this.state.lastMessage = e;
	}
}, kc = null;
function Ac() {
	return kc ||= new Oc(), kc;
}
//#endregion
//#region electron/services/unified-search.ts
var jc = 5;
async function Mc(e) {
	let { query: t, modules: n, topK: r = jc, embeddingConfig: i } = e, a = Date.now(), o = n || [
		"prompt",
		"skill",
		"knowledge",
		"workflow",
		"context"
	], s = [], c = {}, l = [];
	o.includes("prompt") && l.push(Nc(t, r)), o.includes("skill") && l.push(Pc(t, i, r)), o.includes("knowledge") && l.push(Fc(t, i, r)), o.includes("workflow") && l.push(Ic(t, r)), o.includes("context") && l.push(Lc(t, r));
	let u = await Promise.allSettled(l), d = o;
	for (let e = 0; e < u.length; e++) {
		let t = u[e], n = d[e];
		if (t.status === "fulfilled" && t.value.length > 0) {
			let e = t.value;
			c[n] = e.length, s.push(...e);
		} else c[n] = 0;
	}
	return s.sort((e, t) => t.score - e.score), {
		results: s,
		totalCount: s.length,
		moduleCounts: c,
		query: t,
		took: Date.now() - a
	};
}
async function Nc(e, t) {
	try {
		return d(e).slice(0, t).map((e, t) => ({
			source: "prompt",
			id: e.id,
			title: e.title,
			description: e.content.substring(0, 150),
			score: Math.max(.9 - t * .1, .5),
			metadata: {
				category: e.category,
				tags: e.tags
			}
		}));
	} catch {
		return [];
	}
}
async function Pc(e, t, n) {
	try {
		return t ? (await T(e, t, n || jc)).map((e, t) => ({
			source: "skill",
			id: e.id,
			title: e.name,
			description: e.description,
			score: e.similarity ?? Math.max(.8 - t * .1, .4),
			metadata: {}
		})) : ne().filter((t) => t.name.toLowerCase().includes(e.toLowerCase()) || t.description.toLowerCase().includes(e.toLowerCase())).slice(0, n).map((e, t) => ({
			source: "skill",
			id: e.id,
			title: e.name,
			description: e.description,
			score: Math.max(.8 - t * .1, .4),
			metadata: {}
		}));
	} catch {
		return [];
	}
}
async function Fc(e, t, n) {
	try {
		return t ? (await c(e, t, n || jc)).map((e, t) => {
			let n = {};
			try {
				n = e.metadata ? JSON.parse(e.metadata) : {};
			} catch {}
			return {
				source: "knowledge",
				id: e.id,
				title: n.filename || `片段 ${t + 1}`,
				description: e.content.substring(0, 150),
				score: Math.max(.8 - t * .1, .4),
				metadata: n
			};
		}) : [];
	} catch {
		return [];
	}
}
async function Ic(e, t) {
	try {
		return S(e).slice(0, t).map((e, t) => ({
			source: "workflow",
			id: e.id,
			title: e.name,
			description: e.description,
			score: Math.max(.85 - t * .1, .5),
			metadata: { tags: e.tags },
			url: `workflow://${e.id}`
		}));
	} catch {
		return [];
	}
}
async function Lc(e, t) {
	try {
		return m({
			query: e,
			limit: t
		}).map((e, t) => ({
			source: "context",
			id: e.id,
			title: e.title,
			description: e.summary,
			score: Math.max(.7 - t * .08, .3),
			metadata: {
				kind: e.kind,
				sourceType: e.source_type
			},
			url: `context://${e.id}`
		}));
	} catch {
		return [];
	}
}
//#endregion
//#region electron/agent-integration/terminal-session-registry.ts
var Rc = () => `easy-instance-${Re()}`, zc = () => Le(32).toString("hex");
function Bc() {
	let e = /* @__PURE__ */ new Map();
	return {
		register(t) {
			let n = e.get(t.terminalSessionId);
			n && (n.alive = !1);
			let r = {
				terminalSessionId: t.terminalSessionId,
				channelToken: t.channelToken ?? zc(),
				instanceId: t.instanceId,
				label: t.label ?? t.terminalSessionId,
				...t.tmuxSessionName ? { tmuxSessionName: t.tmuxSessionName } : {},
				...t.pty ? { pty: t.pty } : {},
				alive: !0,
				createdAt: Date.now()
			};
			return e.set(t.terminalSessionId, r), r;
		},
		get: (t) => e.get(t),
		authenticate(t, n, r) {
			let i = e.get(t);
			if (!(!i || !i.alive) && !(i.instanceId !== n || i.channelToken !== r)) return i;
		},
		updateLabel(t, n) {
			let r = e.get(t);
			return !r || !r.alive || n.length === 0 ? !1 : (r.label = n, !0);
		},
		attachPty(t, n) {
			let r = e.get(t);
			return !r || !r.alive ? !1 : (r.pty = n, !0);
		},
		markPtyExit(t) {
			let n = e.get(t);
			return n ? (n.alive = !1, !0) : !1;
		},
		invalidate(t) {
			let n = e.get(t);
			return n ? (n.alive = !1, !0) : !1;
		},
		list: () => [...e.values()].map((e) => ({ ...e }))
	};
}
//#endregion
//#region electron/agent-integration/pty-environment.ts
var Vc = (e) => `easy_term_${e}`;
function Hc(e, t, n) {
	let r = {};
	for (let [t, n] of Object.entries(e)) typeof n == "string" && (r[t] = n);
	return r.EASYTERMINAL_TERMINAL_SESSION_ID = t.terminalSessionId, r.EASYTERMINAL_CHANNEL_TOKEN = t.channelToken, r.EASYTERMINAL_HOOK_SOCKET = n, r.EASYTERMINAL_INSTANCE_ID = t.instanceId, r;
}
//#endregion
//#region electron/agent-integration/session-store.ts
var Uc = {
	"terminal-fallback": 0,
	plugin: 1,
	hook: 3,
	"native-tool": 4
}, Wc = {
	permission: 0,
	plan: 1,
	question: 2,
	notification: 3,
	completion: 4
}, Gc = (e) => [
	"session.started",
	"session.processing",
	"session.completed",
	"session.error",
	"SessionStart",
	"UserPromptSubmit",
	"Stop",
	"SessionEnd",
	"TurnStarted",
	"TurnCompleted"
].includes(e), Kc = (e) => {
	if (e === "session.started" || e === "SessionStart") return "ready";
	if (e === "session.processing" || e === "UserPromptSubmit" || e === "TurnStarted") return "processing";
	if (e === "session.completed" || e === "Stop" || e === "SessionEnd" || e === "TurnCompleted") return "completed";
	if (e === "session.error") return "error";
}, qc = (e) => {
	if (e === "permission") return "waiting_permission";
	if (e === "question") return "waiting_question";
	if (e === "plan") return "waiting_plan";
}, Jc = (e) => ({
	...e,
	options: e.options.map((e) => ({ ...e })),
	capabilities: [...e.capabilities],
	agentCapabilities: { ...e.agentCapabilities }
});
function Yc() {
	let e = /* @__PURE__ */ new Map(), t = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Set(), r = [], i = /* @__PURE__ */ new Map(), a = (e) => {
		if (n.add(e), r.push(e), r.length > 1e4) {
			let e = r.shift();
			e && n.delete(e);
		}
	}, o = (t, n) => {
		let r = t.terminalSessionId, i = e.get(r), a = {
			terminalSessionId: r,
			agentSessionId: t.agentSessionId,
			agentType: t.agentType,
			status: n,
			revision: Math.max(i?.revision ?? 0, t.revision),
			lastEventAt: t.occurredAt
		};
		return e.set(r, a), a;
	}, s = (e) => {
		let n = [];
		for (let [r, i] of t) i.terminalSessionId === e && ["pending", "responding"].includes(i.status) && (i.status = "cancelled", n.push(r), t.delete(r));
		return n;
	};
	return {
		ingest(r, c) {
			if (n.has(r.eventId)) return {
				accepted: !1,
				duplicate: !0,
				reason: "duplicate_event"
			};
			let l = e.get(r.terminalSessionId);
			if (l?.status === "completed" && r.revision <= l.revision) return a(r.eventId), {
				accepted: !1,
				stale: !0,
				reason: "completed_session_revision"
			};
			a(r.eventId);
			let u = Kc(r.eventType);
			if (u) {
				let e = u === "completed" || u === "error" ? s(r.terminalSessionId) : [];
				return o(r, u), {
					accepted: !0,
					cancelledInteractions: e
				};
			}
			if (Gc(r.eventType)) return { accepted: !0 };
			let d = c.parseEvent(r);
			if (!d) return {
				accepted: !0,
				reason: "non_interactive_event"
			};
			let f = t.get(d.interactionId), p = i.get(d.interactionId) ?? -1;
			if (r.revision < p) return {
				accepted: !1,
				stale: !0,
				reason: "stale_revision"
			};
			if (f && r.revision === f.revision) {
				if ([
					"acknowledged",
					"expired",
					"cancelled",
					"responding"
				].includes(f.status)) return {
					accepted: !1,
					stale: !0,
					reason: "interaction_closed_or_responding"
				};
				if (Uc[r.source] <= Uc[f.source]) return {
					accepted: !1,
					stale: !0,
					reason: "same_or_lower_priority"
				};
			}
			let m = Date.now(), h = {
				interactionId: d.interactionId,
				terminalSessionId: r.terminalSessionId,
				agentSessionId: r.agentSessionId,
				agentType: r.agentType,
				kind: d.kind,
				revision: r.revision,
				status: "pending",
				title: d.title,
				...d.detail ? { detail: d.detail } : {},
				options: d.options,
				capabilities: d.capabilities,
				responseMode: d.responseMode,
				createdAt: f?.createdAt ?? m,
				...d.expiresAt ? { expiresAt: d.expiresAt } : {},
				source: r.source,
				...d.toolCallId ? { toolCallId: d.toolCallId } : {},
				agentCapabilities: d.agentCapabilities
			};
			return t.set(d.interactionId, h), i.set(d.interactionId, r.revision), o(r, qc(h.kind) ?? "processing"), {
				accepted: !0,
				interaction: Jc(h)
			};
		},
		getInteraction(e) {
			let n = t.get(e);
			return n ? Jc(n) : void 0;
		},
		listPending() {
			return [...t.values()].filter((e) => e.status !== "acknowledged" && e.status !== "cancelled").sort((e, t) => Wc[e.kind] - Wc[t.kind] || e.createdAt - t.createdAt).map(Jc);
		},
		getSession(t, n) {
			let r = e.get(t);
			if (!(!r || n && r.agentSessionId !== n)) return { ...r };
		},
		markResponding(e) {
			let n = t.get(e);
			return n ? ["pending", "failed"].includes(n.status) ? n.expiresAt !== void 0 && n.expiresAt <= Date.now() ? (n.status = "expired", {
				ok: !1,
				reason: "expired"
			}) : (n.status = "responding", {
				ok: !0,
				interaction: Jc(n)
			}) : {
				ok: !1,
				reason: n.status === "responding" ? "duplicate" : "interaction_not_pending"
			} : {
				ok: !1,
				reason: "interaction_not_found"
			};
		},
		markFailed(e, n) {
			let r = t.get(e);
			if (r) return r.status = "failed", r.detail = `${r.detail ? `${r.detail}\n` : ""}${n}`, Jc(r);
		},
		markAcknowledged(e) {
			let n = t.get(e);
			if (n) return n.status = "acknowledged", Jc(n);
		},
		markExpired(e = Date.now()) {
			let n = [];
			for (let [r, i] of t) i.expiresAt !== void 0 && i.expiresAt <= e && ["pending", "responding"].includes(i.status) && (i.status = "expired", n.push(r));
			return n;
		},
		cancelForTerminalSession(t) {
			let n = s(t), r = e.get(t);
			return r && (r.status = "completed"), n;
		},
		remove(e) {
			return t.delete(e);
		}
	};
}
//#endregion
//#region electron/agent-integration/protocol-validator.ts
var Xc = {
	eventId: 256,
	eventType: 128,
	agentType: 128,
	sessionId: 256,
	token: 512,
	interactionId: 256,
	toolCallId: 256,
	payloadBytes: 256 * 1024
}, Zc = (e) => typeof e == "object" && !!e && !Array.isArray(e), Qc = (e) => {
	if (Array.isArray(e)) return e.some(Qc);
	if (!Zc(e)) return !1;
	for (let t of Object.keys(e)) if (t === "__proto__" || t === "prototype" || t === "constructor" || Qc(e[t])) return !0;
	return !1;
}, $c = (e, t, n) => ({
	ok: !1,
	code: e,
	...n ? { field: n } : {},
	message: t
}), el = (e, t, n) => {
	let r = e[t];
	return typeof r != "string" || r.length === 0 ? $c("invalid_field", `${t} must be a non-empty string`, t) : r.length > n ? $c("field_too_long", `${t} exceeds ${n} characters`, t) : r;
};
function tl(e) {
	if (!Zc(e)) return $c("invalid_schema", "event envelope must be an object");
	if (Qc(e)) return $c("unsafe_payload", "event contains an unsafe object key");
	if (e.schemaVersion !== 1) return $c("invalid_schema", "schemaVersion must equal 1", "schemaVersion");
	let t = [
		["eventId", Xc.eventId],
		["eventType", Xc.eventType],
		["agentType", Xc.agentType],
		["terminalSessionId", Xc.sessionId],
		["agentSessionId", Xc.sessionId],
		["instanceId", Xc.sessionId],
		["channelToken", Xc.token]
	];
	for (let [n, r] of t) {
		let t = el(e, n, r);
		if (typeof t != "string") return t;
	}
	if (![
		"hook",
		"plugin",
		"native-tool",
		"terminal-fallback"
	].includes(e.source)) return $c("invalid_field", "source is not a supported event source", "source");
	for (let t of ["interactionId", "toolCallId"]) if (e[t] !== void 0) {
		let n = el(e, t, t === "interactionId" ? Xc.interactionId : Xc.toolCallId);
		if (typeof n != "string") return n;
	}
	if (!Number.isSafeInteger(e.revision) || e.revision < 0) return $c("invalid_field", "revision must be a non-negative safe integer", "revision");
	if (!Number.isFinite(e.occurredAt) || e.occurredAt <= 0) return $c("invalid_field", "occurredAt must be a positive timestamp", "occurredAt");
	if (!Object.prototype.hasOwnProperty.call(e, "payload")) return $c("invalid_schema", "payload is required", "payload");
	let n;
	try {
		n = Buffer.byteLength(JSON.stringify(e.payload), "utf8");
	} catch {
		return $c("invalid_field", "payload must be JSON serializable", "payload");
	}
	return n > Xc.payloadBytes ? $c("payload_too_large", `payload exceeds ${Xc.payloadBytes} bytes`, "payload") : {
		ok: !0,
		value: e
	};
}
//#endregion
//#region electron/agent-integration/adapters/agent-adapter.ts
var nl = {
	observeLifecycle: !0,
	observeTools: !1,
	approveOnce: !1,
	approveAlways: !1,
	answerChoice: !1,
	answerText: !1,
	answerMultiple: !1,
	planFeedback: !1,
	responseAck: !1,
	sendMessage: !1
}, rl = (e) => typeof e == "object" && !!e && !Array.isArray(e), il = (e) => rl(e) ? e : {}, Y = (e, t = "") => typeof e == "string" ? e : t, al = (e, t = !1) => typeof e == "boolean" ? e : t, ol = (e) => Array.isArray(e) ? e.flatMap((e, t) => {
	let n = il(e), r = Y(n.value ?? n.id ?? n.key, String(t + 1)), i = Y(n.label ?? n.title ?? n.text, r);
	return i ? [{
		value: r,
		label: i,
		...Y(n.description) ? { description: Y(n.description) } : {},
		...typeof n.selected == "boolean" ? { selected: n.selected } : {}
	}] : [];
}) : [], sl = (e, t) => {
	let n = ["jump_to_terminal"];
	return t === "permission" && (e.approveOnce && n.push("allow_once"), e.approveAlways && n.push("allow_always"), (e.approveOnce || e.approveAlways) && n.push("deny")), t === "question" && (e.answerChoice && n.push("answer_options"), e.answerMultiple && n.push("answer_multiple"), e.answerText && n.push("answer_text")), t === "plan" && (e.planFeedback && n.push("plan_feedback"), e.answerText && e.planFeedback && n.push("accept_plan")), t === "completion" && e.sendMessage && n.push("send_message"), n;
}, cl = class {
	constructor() {
		this.agentType = "terminal-fallback", this.capabilities = { ...nl };
	}
	canHandle(e) {
		return e.agentType === this.agentType && e.source === "terminal-fallback";
	}
	parseEvent(e) {
		let t = il(e.payload);
		return e.interactionId ? {
			interactionId: e.interactionId,
			kind: "notification",
			title: Y(t.title, "终端中有待处理内容"),
			...Y(t.detail) ? { detail: Y(t.detail) } : {},
			options: [],
			capabilities: ["jump_to_terminal"],
			responseMode: "view-only",
			agentCapabilities: this.capabilities
		} : null;
	}
	serializeResponse(e, t) {
		return null;
	}
}, ll = 512 * 1024;
function ul(e) {
	let t, n = new cl(), r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map(), a = (t) => {
		let r = tl(t);
		if (!r.ok) return {
			ok: !1,
			code: r.code,
			message: r.message
		};
		let a = r.value;
		if (!e.registry.authenticate(a.terminalSessionId, a.instanceId, a.channelToken)) {
			let e = Date.now(), t = `${a.terminalSessionId}:${a.instanceId}`, n = i.get(t), r = !n || e - n.windowStartedAt >= 1e4 ? {
				count: 1,
				windowStartedAt: e
			} : {
				count: n.count + 1,
				windowStartedAt: n.windowStartedAt
			};
			return i.set(t, r), r.count > 10 ? {
				ok: !1,
				code: "rate_limited",
				message: "请求过于频繁，请稍后重试"
			} : {
				ok: !1,
				code: "unauthorized_session",
				message: "event is not bound to a live EasyTerminal PTY"
			};
		}
		if (i.delete(`${a.terminalSessionId}:${a.instanceId}`), e.onEvent?.(a), a.eventType === "interaction.ack") return e.onAck ? e.onAck(a) : {
			ok: !1,
			code: "ack_handler_unavailable",
			message: "ACK handler is not available"
		};
		let o = e.adapters.find((e) => e.canHandle(a)) ?? (a.source === "terminal-fallback" ? n : void 0);
		if (!o) return {
			ok: !1,
			code: "adapter_unavailable",
			message: "no adapter safely supports this agent event"
		};
		let s = e.store.ingest(a, o);
		return !s.accepted && s.duplicate ? {
			ok: !0,
			reason: "duplicate_event"
		} : s.accepted ? (s.interaction && e.onInteraction?.(s.interaction.interactionId), {
			ok: !0,
			...s.interaction ? { interactionId: s.interaction.interactionId } : {},
			...s.reason ? { reason: s.reason } : {}
		}) : {
			ok: !1,
			code: s.reason ?? "event_rejected",
			message: s.reason ?? "event rejected"
		};
	};
	return {
		socketPath: e.socketPath,
		sendResponse: async (e, t) => {
			let n = r.get(t.interactionId);
			if (!n) throw Error("hook_connection_unavailable");
			n({
				type: "interaction.response",
				payload: e
			});
		},
		start: async () => {
			if (!t) {
				if (process.platform !== "win32") try {
					F.unlinkSync(e.socketPath);
				} catch {}
				if (t = Be.createServer((e) => {
					let t = "", n = /* @__PURE__ */ new Set();
					e.setEncoding("utf8");
					let i = (t) => {
						e.destroyed || e.write(`${JSON.stringify(t)}\n`);
					};
					e.on("close", () => {
						for (let e of n) r.get(e) === i && r.delete(e);
					}), e.on("data", (o) => {
						if (t += o, Buffer.byteLength(t, "utf8") > ll) {
							e.end(JSON.stringify({
								ok: !1,
								code: "payload_too_large",
								message: "request too large"
							}) + "\n");
							return;
						}
						let s = t.indexOf("\n");
						for (; s >= 0;) {
							let o = t.slice(0, s).trim();
							if (t = t.slice(s + 1), o) {
								let c;
								try {
									c = JSON.parse(o);
								} catch {
									e.write(JSON.stringify({
										ok: !1,
										code: "invalid_json",
										message: "request must be valid JSON"
									}) + "\n"), s = t.indexOf("\n");
									continue;
								}
								let l = a(c);
								e.write(`${JSON.stringify(l)}\n`), l.ok && l.interactionId && (n.add(l.interactionId), r.set(l.interactionId, i));
							}
							s = t.indexOf("\n");
						}
					});
				}), t.on("error", (t) => e.onError?.(t)), await new Promise((n, r) => {
					t?.once("listening", () => n()), t?.once("error", r), t?.listen(e.socketPath);
				}), process.platform !== "win32") try {
					F.chmodSync(e.socketPath, 384);
				} catch (t) {
					e.onError?.(t);
				}
			}
		},
		stop: async () => {
			if (!t) return;
			let n = t;
			if (t = void 0, await new Promise((e) => n.close(() => e())), process.platform !== "win32") try {
				F.unlinkSync(e.socketPath);
			} catch {}
		},
		handleEnvelope: a
	};
}
//#endregion
//#region electron/agent-integration/interaction-coordinator.ts
var dl = (e) => [
	"answer_options",
	"answer_multiple",
	"answer_text",
	"plan_feedback",
	"send_message"
].includes(e), fl = (e, t) => e.capabilities.includes(t);
function pl(e) {
	let t = (t) => e.adapters.find((e) => e.agentType === t.agentType);
	return {
		async submit(n) {
			if (!n || typeof n != "object" || typeof n.interactionId != "string" || typeof n.terminalSessionId != "string" || !Number.isSafeInteger(n.revision) || typeof n.action != "string") return {
				ok: !1,
				code: "invalid_response",
				message: "响应格式不合法"
			};
			if (n.value !== void 0 && !(typeof n.value == "string" || Array.isArray(n.value) && n.value.every((e) => typeof e == "string"))) return {
				ok: !1,
				code: "invalid_response",
				message: "响应值必须是字符串或字符串数组"
			};
			if (n.reason !== void 0 && typeof n.reason != "string") return {
				ok: !1,
				code: "invalid_response",
				message: "拒绝原因必须是字符串"
			};
			let r = e.store.getInteraction(n.interactionId);
			if (!r) return {
				ok: !1,
				code: "interaction_not_found",
				message: "交互不存在或已关闭"
			};
			if (n.action === "jump_to_terminal") return {
				ok: !1,
				code: "ui_only_action",
				message: "返回终端不是 Agent 响应动作",
				interaction: r
			};
			if (r.terminalSessionId !== n.terminalSessionId) return {
				ok: !1,
				code: "session_mismatch",
				message: "交互不属于当前终端标签页",
				interaction: r
			};
			if (r.revision !== n.revision) return {
				ok: !1,
				code: "stale_revision",
				message: "交互内容已更新，请重新确认",
				interaction: r
			};
			if (!fl(r, n.action)) return {
				ok: !1,
				code: "unsupported_action",
				message: "当前 Agent 不支持该操作",
				interaction: r
			};
			if (dl(n.action) && n.value === void 0) return {
				ok: !1,
				code: "missing_value",
				message: "该操作需要输入内容",
				interaction: r
			};
			let i = e.store.markResponding(n.interactionId);
			if (!i.ok) return {
				ok: !1,
				code: i.reason,
				message: i.reason === "duplicate" ? "该操作正在发送中" : "交互当前不可操作",
				interaction: r
			};
			let a = i.interaction, o = t(a);
			if (!o) {
				let t = e.store.markFailed(a.interactionId, "未找到匹配的 Agent Adapter");
				return t && e.onStateChange?.(t), {
					ok: !1,
					code: "adapter_unavailable",
					message: "无法安全回传到该 Agent",
					interaction: t
				};
			}
			let s = o.serializeResponse(n, a);
			try {
				if (a.responseMode === "view-only") throw Error("view_only");
				if (a.responseMode === "pty-input") {
					let t = e.registry.get(a.terminalSessionId);
					if (!t?.alive || !t.pty) throw Error("session_closed");
					await e.transport.writePty(a.terminalSessionId, s, a);
				} else await e.transport.sendHook(s, a);
				return e.onStateChange?.(a), {
					ok: !0,
					status: "responding",
					interaction: a
				};
			} catch (t) {
				let n = t instanceof Error && t.message === "session_closed" ? "EasyTerminal 标签页已关闭" : t instanceof Error && t.message === "view_only" ? "该交互仅支持查看，请返回终端处理" : t instanceof Error ? t.message : "回传失败", r = e.store.markFailed(a.interactionId, n);
				return r && e.onStateChange?.(r), {
					ok: !1,
					code: t instanceof Error && t.message === "session_closed" ? "session_closed" : "transport_failed",
					message: n,
					interaction: r
				};
			}
		},
		handleAck(t) {
			if (!t.payload || typeof t.payload != "object" || typeof t.payload.accepted != "boolean") return {
				ok: !1,
				code: "invalid_ack",
				message: "ACK payload 格式不合法"
			};
			if (!e.registry.authenticate(t.terminalSessionId, t.instanceId, t.channelToken)) return {
				ok: !1,
				code: "unauthorized_session",
				message: "ACK 来源不是当前 EasyTerminal PTY"
			};
			let n = t.interactionId;
			if (!n) return {
				ok: !1,
				code: "invalid_ack",
				message: "ACK 缺少 interactionId"
			};
			let r = e.store.getInteraction(n);
			if (!r) return {
				ok: !1,
				code: "interaction_not_found",
				message: "ACK 对应的交互不存在"
			};
			if (r.terminalSessionId !== t.terminalSessionId || r.revision !== t.revision) return {
				ok: !1,
				code: "stale_revision",
				message: "ACK 版本已过期",
				interaction: r
			};
			if (r.status !== "responding") return {
				ok: !1,
				code: "ack_without_response",
				message: "ACK 未对应正在发送的响应",
				interaction: r
			};
			let i = t.payload.accepted ? e.store.markAcknowledged(n) : e.store.markFailed(n, t.payload.reason ?? "Agent 拒绝了该响应");
			return i ? (e.onStateChange?.(i), {
				ok: !0,
				status: t.payload.accepted ? "acknowledged" : "failed",
				interaction: i
			}) : {
				ok: !1,
				code: "interaction_not_found",
				message: "交互已被清理"
			};
		},
		expire(t = Date.now()) {
			let n = e.store.markExpired(t);
			for (let t of n) {
				let n = e.store.getInteraction(t);
				n && e.onStateChange?.(n);
			}
			return n;
		}
	};
}
//#endregion
//#region electron/agent-integration/adapters/claude-code-adapter.ts
var ml = {
	observeLifecycle: !0,
	observeTools: !0,
	approveOnce: !0,
	approveAlways: !0,
	answerChoice: !0,
	answerText: !0,
	answerMultiple: !0,
	planFeedback: !0,
	responseAck: !0,
	sendMessage: !1
}, hl = class {
	constructor() {
		this.agentType = "claude-code", this.capabilities = ml;
	}
	canHandle(e) {
		return e.agentType === this.agentType;
	}
	parseEvent(e) {
		let t = il(e.payload);
		if ([
			"SessionStart",
			"UserPromptSubmit",
			"PostToolUse",
			"Stop",
			"SessionEnd"
		].includes(e.eventType) || !e.interactionId) return null;
		let n = e.eventType === "PermissionRequest" || e.eventType === "PreToolUse" ? "permission" : e.eventType === "AskUserQuestion" ? "question" : e.eventType === "PlanApproval" ? "plan" : null;
		if (!n) return null;
		let r = sl(this.capabilities, n), i = al(t.allowAlways, this.capabilities.approveAlways), a = r.filter((e) => e === "allow_always" ? i : e === "answer_multiple" ? t.multiSelect === !0 || t.multiple === !0 : !0);
		return {
			interactionId: e.interactionId,
			kind: n,
			title: Y(t.title, n === "permission" ? "请求执行工具" : n === "plan" ? "计划确认" : "需要回答问题"),
			...Y(t.detail ?? t.toolInput ?? t.command) ? { detail: Y(t.detail ?? t.toolInput ?? t.command) } : {},
			options: ol(t.options ?? t.questions),
			capabilities: a,
			responseMode: "hook-response",
			...Y(t.toolCallId) || e.toolCallId ? { toolCallId: Y(t.toolCallId, e.toolCallId) } : {},
			agentCapabilities: this.capabilities
		};
	}
	serializeResponse(e, t) {
		let n = e.action === "allow_once" ? "allow" : e.action === "allow_always" ? "allow_always" : e.action === "deny" ? "deny" : e.action;
		return {
			hook: "claude-code",
			type: "response",
			interactionId: t.interactionId,
			toolCallId: t.toolCallId,
			revision: t.revision,
			action: n,
			...e.value === void 0 ? {} : { value: e.value },
			...e.reason === void 0 ? {} : { reason: e.reason }
		};
	}
}, gl = {
	observeLifecycle: !0,
	observeTools: !0,
	approveOnce: !0,
	approveAlways: !1,
	answerChoice: !0,
	answerText: !0,
	answerMultiple: !0,
	planFeedback: !1,
	responseAck: !0,
	sendMessage: !1
}, _l = class {
	constructor() {
		this.agentType = "codex-cli", this.capabilities = gl;
	}
	canHandle(e) {
		return e.agentType === this.agentType;
	}
	parseEvent(e) {
		let t = il(e.payload);
		if ([
			"SessionStart",
			"TurnStarted",
			"TaskStarted",
			"TurnCompleted",
			"SessionEnd"
		].includes(e.eventType) || !e.interactionId) return null;
		let n = e.eventType === "CommandApproval" || e.eventType === "ToolApproval" ? "permission" : e.eventType === "request_user_input" ? "question" : e.eventType === "PlanReview" ? "plan" : null;
		if (!n) return null;
		let r = sl(this.capabilities, n).filter((e) => e !== "allow_always" && (e !== "answer_multiple" || t.multiSelect === !0 || t.multiple === !0));
		return {
			interactionId: e.interactionId,
			kind: n,
			title: Y(t.title, n === "permission" ? "命令执行审批" : "Codex 需要你的回答"),
			...Y(t.command ?? t.detail) ? { detail: Y(t.command ?? t.detail) } : {},
			options: ol(t.options ?? t.questions),
			capabilities: r,
			responseMode: e.source === "terminal-fallback" ? "pty-input" : "hook-response",
			...e.toolCallId || Y(t.callId) ? { toolCallId: Y(t.callId, e.toolCallId) } : {},
			agentCapabilities: this.capabilities
		};
	}
	serializeResponse(e, t) {
		return {
			type: "codex.response",
			callId: t.toolCallId,
			interactionId: t.interactionId,
			revision: t.revision,
			action: e.action,
			...e.value === void 0 ? {} : { answers: e.value },
			...e.reason === void 0 ? {} : { reason: e.reason }
		};
	}
}, vl = {
	observeLifecycle: !0,
	observeTools: !0,
	approveOnce: !0,
	approveAlways: !1,
	answerChoice: !0,
	answerText: !0,
	answerMultiple: !0,
	planFeedback: !0,
	responseAck: !0,
	sendMessage: !0
}, yl = class {
	constructor() {
		this.agentType = "fake-agent", this.capabilities = vl;
	}
	canHandle(e) {
		return e.agentType === this.agentType;
	}
	parseEvent(e) {
		let t = il(e.payload), n = e.eventType;
		if (n === "session.started" || n === "session.processing" || n === "session.completed" || n === "session.error") return null;
		let r = n.endsWith(".permission") ? "permission" : n.endsWith(".question") ? "question" : n.endsWith(".plan") ? "plan" : n.endsWith(".completion") ? "completion" : null;
		if (!r || !e.interactionId) return null;
		let i = sl(this.capabilities, r), a = Array.isArray(t.capabilities) ? t.capabilities.filter((e) => typeof e == "string") : [], o = a.length > 0 ? i.filter((e) => a.includes(e)) : i;
		return {
			interactionId: e.interactionId,
			kind: r,
			title: Y(t.title, r === "permission" ? "需要用户确认" : "需要用户输入"),
			...Y(t.detail) ? { detail: Y(t.detail) } : {},
			options: ol(t.options),
			capabilities: o,
			responseMode: "hook-response",
			...e.toolCallId ? { toolCallId: e.toolCallId } : {},
			...Number.isFinite(t.expiresAt) ? { expiresAt: t.expiresAt } : {},
			agentCapabilities: this.capabilities
		};
	}
	serializeResponse(e, t) {
		return {
			type: "interaction.response",
			interactionId: t.interactionId,
			revision: t.revision,
			action: e.action,
			...e.value === void 0 ? {} : { value: e.value },
			...e.reason === void 0 ? {} : { reason: e.reason }
		};
	}
}, bl = {
	observeLifecycle: !0,
	observeTools: !0,
	approveOnce: !0,
	approveAlways: !1,
	answerChoice: !1,
	answerText: !1,
	answerMultiple: !1,
	planFeedback: !1,
	responseAck: !0,
	sendMessage: !1
}, xl = class {
	constructor() {
		this.agentType = "gemini-cli", this.capabilities = bl;
	}
	canHandle(e) {
		return e.agentType === this.agentType;
	}
	parseEvent(e) {
		let t = il(e.payload);
		return !e.interactionId || e.eventType !== "BeforeTool" ? null : {
			interactionId: e.interactionId,
			kind: "permission",
			title: Y(t.title, "Gemini 工具审批"),
			...Y(t.command ?? t.detail) ? { detail: Y(t.command ?? t.detail) } : {},
			options: [],
			capabilities: sl(this.capabilities, "permission"),
			responseMode: "hook-response",
			agentCapabilities: this.capabilities
		};
	}
	serializeResponse(e, t) {
		return {
			type: "gemini.response",
			requestId: t.interactionId,
			action: e.action,
			revision: t.revision
		};
	}
}, Sl = {
	observeLifecycle: !0,
	observeTools: !0,
	approveOnce: !0,
	approveAlways: !1,
	answerChoice: !0,
	answerText: !0,
	answerMultiple: !0,
	planFeedback: !1,
	responseAck: !0,
	sendMessage: !1
}, Cl = class {
	constructor() {
		this.agentType = "opencode", this.capabilities = Sl;
	}
	canHandle(e) {
		return e.agentType === this.agentType;
	}
	parseEvent(e) {
		let t = il(e.payload);
		if (!e.interactionId) return null;
		let n = e.eventType === "PermissionRequest" ? "permission" : e.eventType === "AskUserQuestion" ? "question" : null;
		if (!n) return null;
		let r = sl(this.capabilities, n).filter((e) => e !== "allow_always" && (e !== "answer_multiple" || t.multiSelect === !0 || t.multiple === !0));
		return {
			interactionId: e.interactionId,
			kind: n,
			title: Y(t.title, n === "permission" ? "OpenCode 权限请求" : "OpenCode 问题"),
			...Y(t.detail) ? { detail: Y(t.detail) } : {},
			options: ol(t.options),
			capabilities: r,
			responseMode: "hook-response",
			agentCapabilities: this.capabilities
		};
	}
	serializeResponse(e, t) {
		return {
			type: "opencode.response",
			requestId: t.interactionId,
			updatedInput: e.value,
			action: e.action,
			revision: t.revision
		};
	}
}, wl = () => [
	new yl(),
	new hl(),
	new _l(),
	new xl(),
	new Cl(),
	new cl()
];
process.on("uncaughtException", (e) => {
	console.error("UNCAUGHT EXCEPTION:", e);
}), process.on("unhandledRejection", (e) => {
	console.error("UNHANDLED REJECTION:", e);
});
var Tl = new $s();
j.handle("store:get", (e, t, n) => Tl.get(t, n)), j.handle("store:set", (e, t, n) => (Tl.set(t, n), !0)), j.handle("store:delete", (e, t) => (Tl.delete(t), !0)), j.handle("theme:set", (e, t) => (be.themeSource = t, be.themeSource)), j.handle("ollama:check", async (e, t) => {
	let n = t || "http://localhost:11434";
	try {
		let e = await fetch(`${n}/api/tags`, { signal: AbortSignal.timeout(3e3) });
		if (!e.ok) return {
			running: !1,
			models: []
		};
		let t = await e.json(), r = [
			"embed",
			"bge",
			"e5",
			"nomic-embed",
			"mxbai-embed",
			"snowflake-arctic-embed"
		], i = (t.models || []).map((e) => ({
			name: e.name,
			size: e.size,
			modified_at: e.modified_at
		}));
		return {
			running: !0,
			models: i,
			embeddingModels: i.filter((e) => r.some((t) => e.name.toLowerCase().includes(t)))
		};
	} catch {
		return {
			running: !1,
			models: []
		};
	}
}), j.handle("ollama:test-embedding", async (e, t, n) => {
	try {
		let e = await fetch(`${t}/api/embeddings`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: n,
				prompt: "test"
			}),
			signal: AbortSignal.timeout(15e3)
		});
		if (!e.ok) {
			let t = await e.text();
			return {
				success: !1,
				error: `HTTP ${e.status}: ${t.substring(0, 150)}`
			};
		}
		let r = await e.json();
		return r.embedding && r.embedding.length > 0 ? {
			success: !0,
			dimensions: r.embedding.length
		} : {
			success: !1,
			error: "返回数据中没有 embedding 向量"
		};
	} catch (e) {
		return {
			success: !1,
			error: e instanceof Error ? e.message : "连接失败"
		};
	}
}), j.handle("system:scan-api-keys", () => {
	let e = {}, t = Oe.homedir();
	try {
		let n = N(t, ".claude.json");
		if (P.existsSync(n)) {
			let t = P.readFileSync(n, "utf-8"), r = JSON.parse(t);
			r.primaryApiKey && (e.claude_code = r.primaryApiKey);
		}
	} catch (e) {
		console.error("Failed to read ~/.claude.json", e);
	}
	try {
		let n = N(t, ".claude", "settings.json");
		if (P.existsSync(n)) {
			let t = P.readFileSync(n, "utf-8"), r = JSON.parse(t);
			r.env && (r.env.ANTHROPIC_AUTH_TOKEN ? e.claude_code = r.env.ANTHROPIC_AUTH_TOKEN : r.env.ANTHROPIC_API_KEY && (e.claude_code = r.env.ANTHROPIC_API_KEY));
		}
	} catch (e) {
		console.error("Failed to read ~/.claude/settings.json", e);
	}
	try {
		let n = N(t, ".codex", "auth.json");
		if (P.existsSync(n)) {
			let t = P.readFileSync(n, "utf-8"), r = JSON.parse(t);
			r.OPENAI_API_KEY && (e.codex = r.OPENAI_API_KEY);
		}
	} catch (e) {
		console.error("Failed to read ~/.codex/auth.json", e);
	}
	try {
		let n = N(t, ".config", "github-copilot", "config.json");
		if (P.existsSync(n)) {
			let t = P.readFileSync(n, "utf-8"), r = JSON.parse(t);
			(r.githubToken || r.token) && (e.github_copilot = r.githubToken || r.token);
		}
	} catch (e) {
		console.error("Failed to read GitHub Copilot config", e);
	}
	try {
		let n = N(t, ".openclaw", "config.json");
		if (P.existsSync(n)) {
			let t = P.readFileSync(n, "utf-8"), r = JSON.parse(t);
			r.apiKey ? e.openclaw = r.apiKey : r.anthropicApiKey ? e.openclaw = r.anthropicApiKey : r.env && (r.env.ANTHROPIC_API_KEY || r.env.ANTHROPIC_AUTH_TOKEN) && (e.openclaw = r.env.ANTHROPIC_API_KEY || r.env.ANTHROPIC_AUTH_TOKEN);
		}
	} catch (e) {
		console.error("Failed to read ~/.openclaw/config.json", e);
	}
	try {
		let n = N(t, ".cc-switch", "config.json");
		if (P.existsSync(n)) {
			let t = P.readFileSync(n, "utf-8"), r = JSON.parse(t);
			if (r.providers) for (let [t, n] of Object.entries(r.providers)) {
				let r = n;
				r.apiKey && (t === "anthropic" && !e.claude_code ? e.anthropic = String(r.apiKey) : t === "openai" && !e.codex ? e.openai = String(r.apiKey) : t === "gemini" ? e.gemini = String(r.apiKey) : t === "deepseek" ? e.deepseek = String(r.apiKey) : t === "zhipu" ? e.zhipu = String(r.apiKey) : t === "minimax" ? e.minimax = String(r.apiKey) : t === "kimi" && (e.kimi = String(r.apiKey)));
			}
		}
	} catch (e) {
		console.error("Failed to read ~/.cc-switch/config.json", e);
	}
	return !e.codex && process.env.OPENAI_API_KEY && (e.openai = process.env.OPENAI_API_KEY), !e.claude_code && !e.anthropic && (process.env.ANTHROPIC_AUTH_TOKEN ? e.anthropic = process.env.ANTHROPIC_AUTH_TOKEN : process.env.ANTHROPIC_API_KEY && (e.anthropic = process.env.ANTHROPIC_API_KEY, e.claude_code = process.env.ANTHROPIC_API_KEY)), !e.gemini && process.env.GEMINI_API_KEY && (e.gemini = process.env.GEMINI_API_KEY), e;
});
var El = (e) => {
	try {
		return P.existsSync(e) ? P.readFileSync(e, "utf-8") : null;
	} catch {
		return null;
	}
}, Dl = (e) => {
	try {
		let t = El(e);
		if (!t) return null;
		let n = JSON.parse(t);
		return n && typeof n == "object" ? n : null;
	} catch {
		return null;
	}
}, Ol = (e) => {
	try {
		return P.existsSync(e) ? P.readdirSync(e, { withFileTypes: !0 }) : [];
	} catch {
		return [];
	}
}, kl = (e, t = 24) => Ol(e).filter((e) => e.isDirectory()).map((e) => e.name).sort((e, t) => e.localeCompare(t)).slice(0, t), X = (e, t = "any") => Ol(e).filter((e) => t === "file" ? e.isFile() : t === "dir" ? e.isDirectory() : !0).length, Al = (e) => {
	let t = El(e);
	return t ? t.split("\n").filter((e) => e.trim()).length : 0;
}, jl = (e, t = 24) => Array.from(new Set(e.map((e) => e.trim()).filter(Boolean))).slice(0, t), Ml = (e) => e && typeof e == "object" && !Array.isArray(e) ? e : null, Nl = (e) => Array.isArray(e) ? e.filter((e) => typeof e == "string") : [], Pl = (e) => e.startsWith("-") ? e.replace(/^-/, "/").replace(/-/g, "/") : e, Fl = (e) => {
	let t = Nl(Ml(e?.permissions)?.allow), n = {}, r = {}, i = /* @__PURE__ */ new Set();
	for (let e of t) {
		let t = e.match(/^([A-Za-z][A-Za-z0-9_-]*)/);
		if (t) {
			let e = t[1];
			n[e] = (n[e] || 0) + 1;
		}
		let a = e.match(/^Bash\((?:[A-Z0-9_]+=[^ )]+\s+)*([A-Za-z0-9._-]+)/);
		if (a) {
			let e = a[1];
			r[e] = (r[e] || 0) + 1;
		}
		e.toLowerCase().includes("mcporter") && i.add("mcporter"), (e.match(/[A-Za-z0-9._-]*mcp[A-Za-z0-9._-]*/gi) || []).forEach((e) => i.add(e));
	}
	let a = Object.entries(r).sort((e, t) => t[1] - e[1]).slice(0, 4).map(([e]) => e), o = [];
	return n.Bash && o.push({
		label: "命令执行偏好",
		detail: `放行 ${n.Bash} 条 Bash 权限，常见命令包括 ${a.join("、") || "bash"}。`,
		count: n.Bash
	}), n.WebFetch && o.push({
		label: "网页抓取习惯",
		detail: `记录到 ${n.WebFetch} 条 WebFetch 权限，偏向边抓取边处理资料。`,
		count: n.WebFetch
	}), n.WebSearch && o.push({
		label: "联网检索习惯",
		detail: `存在 ${n.WebSearch} 条 WebSearch 权限。`,
		count: n.WebSearch
	}), i.size > 0 && o.push({
		label: "MCP / 工具桥接习惯",
		detail: `检测到 ${i.size} 个 MCP 相关线索，说明用户有跨工具调用习惯。`,
		count: i.size
	}), {
		habits: o,
		mcpHints: jl(Array.from(i), 18),
		allowRuleCount: t.length
	};
}, Il = (e) => {
	let t = {
		projects: [],
		plugins: []
	}, n = null, r = null, i = /* @__PURE__ */ new Set();
	for (let a of e.split("\n")) {
		let e = a.trim();
		if (!e || e.startsWith("#")) continue;
		let o = e.match(/^model\s*=\s*"([^"]+)"/);
		if (o) {
			t.model = o[1];
			continue;
		}
		let s = e.match(/^model_reasoning_effort\s*=\s*"([^"]+)"/);
		if (s) {
			t.reasoningEffort = s[1];
			continue;
		}
		let c = e.match(/^\[projects\."(.+)"\]$/);
		if (c) {
			n = c[1], r = null, t.projects.push({ path: n });
			continue;
		}
		let l = e.match(/^\[plugins\."(.+)"\]$/);
		if (l) {
			r = l[1], n = null, t.plugins.push(r);
			continue;
		}
		let u = e.match(/^trust_level\s*=\s*"([^"]+)"/);
		if (u && n) {
			let e = t.projects.find((e) => e.path === n);
			e && (e.trustLevel = u[1]);
			continue;
		}
		let d = e.match(/^enabled\s*=\s*(true|false)/);
		d && r && d[1] === "true" && i.add(r);
	}
	return t.plugins = jl(Array.from(i.size > 0 ? i : new Set(t.plugins)), 24), t;
}, Ll = (e) => {
	let t = [], n = Nl(e?.workspaces), r = Nl(e?.projects), i = Nl(e?.trustedPaths), a = Ml(e?.workspaces), o = Ml(e?.mcpServers) || Ml(e?.mcp) || Ml(e?.mcp_servers), s = e?.plugins;
	for (let e of [
		...n,
		...r,
		...i
	]) t.push({
		label: Ce(e) || e,
		path: e
	});
	if (a) for (let e of Object.keys(a)) t.push({
		label: Ce(e) || e,
		path: e
	});
	let c = Array.isArray(s) ? s.filter((e) => typeof e == "string") : Object.keys(Ml(s) || {});
	return {
		model: typeof e?.model == "string" ? e.model : typeof e?.modelName == "string" ? e.modelName : void 0,
		reasoningEffort: typeof e?.reasoningEffort == "string" ? e.reasoningEffort : typeof e?.reasoning == "string" ? e.reasoning : void 0,
		workspaces: jl(t.map((e) => `${e.label}|||${e.path}`), 18).map((e) => {
			let [t, n] = e.split("|||");
			return {
				label: t,
				path: n
			};
		}),
		plugins: jl(c, 18),
		mcpServers: jl(Object.keys(o || {}), 18),
		apiConfigured: !!(e?.apiKey || e?.anthropicApiKey || e?.openaiApiKey || Ml(e?.env)?.ANTHROPIC_API_KEY || Ml(e?.env)?.OPENAI_API_KEY)
	};
};
j.handle("agent:migration-scan", () => {
	let e = Oe.homedir(), t = N(e, ".claude"), n = N(t, "settings.json"), r = N(t, "settings.local.json"), i = N(t, "plugins", "installed_plugins.json"), a = Dl(n), o = Dl(r), s = Dl(i), c = kl(N(t, "skills"), 18), l = kl(N(t, "projects"), 50), u = Fl(o), d = Object.keys(Ml(s?.plugins) || {}), f = c.filter((e) => e.toLowerCase().includes("mcp")), p = !!(Ml(a?.env)?.ANTHROPIC_AUTH_TOKEN || Ml(a?.env)?.ANTHROPIC_API_KEY || Dl(N(e, ".claude.json"))?.primaryApiKey), m = N(e, ".codex"), h = N(m, "config.toml"), g = N(m, "auth.json"), _ = Il(El(h) || ""), v = Dl(g), y = kl(N(m, "skills"), 18), b = N(e, ".openclaw"), x = N(b, "config.json"), S = Ll(Dl(x)), C = {};
	for (let [e, n] of [
		["claude", t],
		["codex", m],
		["openclaw", b]
	]) if (P.existsSync(n)) try {
		P.readdirSync(n);
	} catch (t) {
		let n = typeof t == "object" && t && "code" in t ? String(t.code || "EIO") : "EIO";
		C[e] = n === "EACCES" || n === "EPERM" ? "没有权限读取来源目录。" : "来源目录读取失败。";
	}
	return {
		scannedAt: (/* @__PURE__ */ new Date()).toISOString(),
		sources: [
			{
				id: "claude",
				label: "Claude Code",
				detected: P.existsSync(t),
				rootPath: t,
				apiConfigured: p,
				model: void 0,
				reasoningEffort: void 0,
				configFiles: [
					P.existsSync(n) ? "settings.json" : "",
					P.existsSync(r) ? "settings.local.json" : "",
					P.existsSync(i) ? "plugins/installed_plugins.json" : ""
				].filter(Boolean),
				skills: c,
				skillsCount: X(N(t, "skills"), "dir"),
				plugins: jl(d.map((e) => e.split("@")[0]), 18),
				pluginsCount: d.length,
				mcpServers: jl([...u.mcpHints, ...f], 18),
				mcpCount: jl([...u.mcpHints, ...f], 999).length,
				workspaces: l.map((e) => {
					let t = Pl(e);
					return {
						label: Ce(t) || e,
						path: t
					};
				}),
				habitSignals: [...u.habits, ...u.allowRuleCount > 0 ? [{
					label: "权限策略沉淀",
					detail: `本地累计 ${u.allowRuleCount} 条权限放行记录，可用于迁移常用工具策略。`,
					count: u.allowRuleCount
				}] : []],
				memorySignals: [
					...Al(N(t, "history.jsonl")) > 0 ? [{
						label: "对话 / 历史记录",
						detail: `history.jsonl 中有 ${Al(N(t, "history.jsonl"))} 条记录。`,
						count: Al(N(t, "history.jsonl"))
					}] : [],
					...X(N(t, "sessions")) > 0 ? [{
						label: "会话快照",
						detail: `sessions 目录中有 ${X(N(t, "sessions"))} 个条目。`,
						count: X(N(t, "sessions"))
					}] : [],
					...X(N(t, "plans")) > 0 ? [{
						label: "规划沉淀",
						detail: `plans 目录中有 ${X(N(t, "plans"))} 个条目。`,
						count: X(N(t, "plans"))
					}] : [],
					...X(N(t, "tasks")) > 0 ? [{
						label: "任务历史",
						detail: `tasks 目录中有 ${X(N(t, "tasks"))} 个条目。`,
						count: X(N(t, "tasks"))
					}] : []
				],
				notes: [d.length > 0 ? `检测到 ${d.length} 个插件安装记录。` : "", c.length > 0 ? "skills 数量较多，界面中默认只展示样本。" : ""].filter(Boolean)
			},
			{
				id: "codex",
				label: "Codex",
				detected: P.existsSync(m),
				rootPath: m,
				apiConfigured: !!(v?.OPENAI_API_KEY || v?.openai_api_key || v?.token),
				model: _.model,
				reasoningEffort: _.reasoningEffort,
				configFiles: [P.existsSync(h) ? "config.toml" : "", P.existsSync(g) ? "auth.json" : ""].filter(Boolean),
				skills: y,
				skillsCount: X(N(m, "skills"), "dir"),
				plugins: _.plugins,
				pluginsCount: _.plugins.length,
				mcpServers: [],
				mcpCount: 0,
				workspaces: _.projects.map((e) => ({
					label: Ce(e.path) || e.path,
					path: e.path,
					trustLevel: e.trustLevel
				})),
				habitSignals: [..._.projects.length > 0 ? [{
					label: "工作区信任策略",
					detail: `检测到 ${_.projects.length} 个项目信任配置。`,
					count: _.projects.length
				}] : [], ..._.plugins.length > 0 ? [{
					label: "插件工作流",
					detail: `启用了 ${_.plugins.length} 个插件，可迁移为目标平台的 tools / extensions。`,
					count: _.plugins.length
				}] : []],
				memorySignals: [
					...Al(N(m, "history.jsonl")) > 0 ? [{
						label: "命令历史",
						detail: `history.jsonl 中有 ${Al(N(m, "history.jsonl"))} 条记录。`,
						count: Al(N(m, "history.jsonl"))
					}] : [],
					...X(N(m, "sessions")) > 0 ? [{
						label: "会话记录",
						detail: `sessions 目录中有 ${X(N(m, "sessions"))} 个条目。`,
						count: X(N(m, "sessions"))
					}] : [],
					...X(N(m, "shell_snapshots")) > 0 ? [{
						label: "Shell 快照",
						detail: `shell_snapshots 中有 ${X(N(m, "shell_snapshots"))} 个条目。`,
						count: X(N(m, "shell_snapshots"))
					}] : [],
					...P.existsSync(N(m, "logs_2.sqlite")) ? [{
						label: "日志数据库",
						detail: "存在本地日志数据库，可作为长期沉淀线索。"
					}] : []
				],
				notes: [_.model ? `当前默认模型为 ${_.model}。` : "", _.reasoningEffort ? `推理强度为 ${_.reasoningEffort}。` : ""].filter(Boolean)
			},
			{
				id: "openclaw",
				label: "OpenClaw",
				detected: P.existsSync(b),
				rootPath: b,
				apiConfigured: S.apiConfigured,
				model: S.model,
				reasoningEffort: S.reasoningEffort,
				configFiles: [P.existsSync(x) ? "config.json" : ""].filter(Boolean),
				skills: kl(N(b, "skills"), 18),
				skillsCount: X(N(b, "skills"), "dir"),
				plugins: S.plugins,
				pluginsCount: S.plugins.length,
				mcpServers: S.mcpServers,
				mcpCount: S.mcpServers.length,
				workspaces: S.workspaces,
				habitSignals: [...S.plugins.length > 0 ? [{
					label: "扩展生态",
					detail: `检测到 ${S.plugins.length} 个插件或扩展项。`,
					count: S.plugins.length
				}] : [], ...S.mcpServers.length > 0 ? [{
					label: "MCP 配置",
					detail: `检测到 ${S.mcpServers.length} 个 MCP / server 线索。`,
					count: S.mcpServers.length
				}] : []],
				memorySignals: [
					...Al(N(b, "history.jsonl")) > 0 ? [{
						label: "历史记录",
						detail: `history.jsonl 中有 ${Al(N(b, "history.jsonl"))} 条记录。`,
						count: Al(N(b, "history.jsonl"))
					}] : [],
					...X(N(b, "sessions")) > 0 ? [{
						label: "会话记录",
						detail: `sessions 目录中有 ${X(N(b, "sessions"))} 个条目。`,
						count: X(N(b, "sessions"))
					}] : [],
					...X(N(b, "memories")) > 0 ? [{
						label: "记忆目录",
						detail: `memories 目录中有 ${X(N(b, "memories"))} 个条目。`,
						count: X(N(b, "memories"))
					}] : []
				],
				notes: [P.existsSync(b) ? "采用宽松解析，优先抽取可迁移信息。" : "当前机器未发现 ~/.openclaw，本项保留用于后续迁移。"]
			}
		],
		errors: Object.values(C),
		sourceErrors: C
	};
});
var Rl = {
	enabled: !1,
	port: 8080,
	appId: null
}, zl = null;
j.handle("proxy:enable", async (e, t) => {
	try {
		console.log(`[Proxy] Enabling proxy for app: ${t}`), zl &&= (zl.kill(), null);
		let e = Tl.get("api_agents", []), n = Tl.get("model_providers", []), r = e.find((e) => e.id === t);
		if (!r) return {
			success: !1,
			error: "App not found"
		};
		let i = n.find((e) => e.id === r.providerId);
		if (!i || !i.apiKey) return {
			success: !1,
			error: "Provider or API key not found"
		};
		let a = Oe.homedir(), o = N(a, ".easyterminal", "proxy-config.json"), s = {
			appId: t,
			provider: {
				id: i.id,
				baseUrl: i.baseUrl,
				apiKey: i.apiKey,
				chatEndpoint: i.chatEndpoint,
				embeddingEndpoint: i.embeddingEndpoint
			},
			port: Rl.port
		}, c = N(a, ".easyterminal");
		return P.existsSync(c) || P.mkdirSync(c, { recursive: !0 }), P.writeFileSync(o, JSON.stringify(s, null, 2)), Rl.enabled = !0, Rl.appId = t, console.log(`[Proxy] Proxy enabled for ${t} on port ${Rl.port}`), {
			success: !0,
			port: Rl.port,
			appId: t
		};
	} catch (e) {
		return console.error("[Proxy] Failed to enable proxy:", e), {
			success: !1,
			error: String(e)
		};
	}
}), j.handle("proxy:disable", async () => {
	try {
		return console.log("[Proxy] Disabling proxy"), zl &&= (zl.kill(), null), Rl.enabled = !1, Rl.appId = null, { success: !0 };
	} catch (e) {
		return console.error("[Proxy] Failed to disable proxy:", e), {
			success: !1,
			error: String(e)
		};
	}
}), j.handle("proxy:status", async () => ({
	enabled: Rl.enabled,
	port: Rl.port,
	appId: Rl.appId
})), j.handle("app-config:read", async (e, t, n) => Tl.get("app_configs", {})[t]?.[n] ?? null), j.handle("app-config:write", async (e, t, n, r) => {
	let i = Tl.get("app_configs", {});
	return i[t] || (i[t] = {}), i[t][n] = r, Tl.set("app_configs", i), !0;
}), j.handle("provider:test", async (e, t) => {
	try {
		let { id: e, baseUrl: n, apiKey: r, models: i, apiFormat: a, chatEndpoint: o } = t, s = n, c = { "Content-Type": "application/json" }, l = null;
		e === "gemini" ? (s = ue(n, i.split(",")[0] || "gemini-1.5-flash", r, o), l = JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] })) : e === "ollama" ? (s = le(n, o), l = JSON.stringify({
			model: i.split(",")[0] || "llama3",
			messages: [{
				role: "user",
				content: "hi"
			}],
			stream: !1
		})) : a === "anthropic" || e === "anthropic" || e === "minimax" || e === "doubao" ? (s = de(n, o), c["x-api-key"] = r, c["anthropic-version"] = "2023-06-01", l = JSON.stringify({
			model: i.split(",")[0] || "claude-3-haiku-20240307",
			max_tokens: 1,
			messages: [{
				role: "user",
				content: "hi"
			}]
		})) : (s = ce(n, o), c.Authorization = `Bearer ${r}`, l = JSON.stringify({
			model: i.split(",")[0] || "gpt-3.5-turbo",
			messages: [{
				role: "user",
				content: "hi"
			}],
			max_tokens: 1
		}));
		let u = await fetch(s, {
			method: "POST",
			headers: c,
			body: l
		});
		if (u.ok) return { success: !0 };
		{
			let e = await u.text();
			return {
				success: !1,
				error: `HTTP ${u.status}: ${e.substring(0, 150)}`
			};
		}
	} catch (e) {
		return {
			success: !1,
			error: e instanceof Error ? e.message : "Network error"
		};
	}
});
var Bl = we(De(import.meta.url)), Vl = Tl.get("ui_theme", "obsidian");
be.themeSource = [
	"porcelain",
	"meadow",
	"catppuccin-latte"
].includes(String(Vl)) ? "light" : "dark";
var Z = null, Q = null;
A.commandLine.appendSwitch("disable-features", "IOSurfaceCapturer,HardwareMediaKeyHandling"), A.commandLine.appendSwitch("enable-transparent-visuals");
var Hl = Oe.platform() === "win32" ? "powershell.exe" : process.env.SHELL || "bash";
if (process.platform === "darwin" && A.isPackaged) try {
	let e = Ne(`${Hl} -l -c "echo \\$PATH"`).toString().trim();
	e && (process.env.PATH = e);
} catch {}
var Ul = !1;
try {
	Oe.platform() !== "win32" && (Ne("which tmux", { stdio: "ignore" }), Ul = !0);
} catch {
	Ul = !1;
}
var Wl = !1;
A.on("before-quit", () => {
	Wl = !0;
});
var $ = {}, Gl = {}, Kl = process.env.HOME || process.cwd(), ql = null, Jl = Rc(), Yl = Bc(), Xl = Yc(), Zl = null, Ql = null;
function $l(e) {
	if (!Q || Q.isDestroyed()) return;
	let t = Yl.get(e.terminalSessionId)?.label ?? e.terminalSessionId;
	Q.showInactive(), Q.webContents.send("island:interaction", {
		...e,
		terminalSessionName: t
	});
}
function eu(e) {
	if (!Q || Q.isDestroyed()) return;
	let t = Yl.get(e.terminalSessionId)?.label ?? e.terminalSessionId;
	Q.webContents.send("island:interaction-state", {
		...e,
		terminalSessionName: t
	});
}
function tu() {
	return process.platform === "win32" ? `\\\\.\\pipe\\easy-terminal-${Jl}` : N(A.getPath("temp"), `easy-terminal-${Jl}.sock`);
}
function nu() {
	let e = wl();
	Ql = pl({
		store: Xl,
		registry: Yl,
		adapters: e,
		transport: {
			sendHook: async (e, t) => {
				if (!Zl) throw Error("hook_server_unavailable");
				await Zl.sendResponse(e, t);
			},
			writePty: async (e, t, n) => {
				let r = Yl.get(e);
				if (!r?.alive || !r.pty) throw Error("session_closed");
				r.pty.write(`${JSON.stringify(t)}\r`), console.warn(`[AgentIntegration] PTY compatibility response for ${n.interactionId}`);
			}
		},
		onStateChange: eu
	}), Zl = ul({
		socketPath: tu(),
		registry: Yl,
		store: Xl,
		adapters: e,
		onInteraction: (e) => {
			let t = Xl.getInteraction(e);
			t && $l(t);
		},
		onAck: (e) => Ql?.handleAck(e) ?? {
			ok: !1,
			code: "coordinator_unavailable",
			message: "响应协调器未初始化"
		}
	}), Zl.start().catch((e) => console.error("[AgentIntegration] Failed to start Hook Server:", e));
}
function ru(e) {
	ql = e, Z && !Z.isDestroyed() && Z.webContents.send("ui:intent:updated", e);
}
var iu = () => {
	let e = A.isPackaged ? N(Bl, "../dist/icon.png") : N(Bl, "../build/icon.png");
	return console.log("Icon path:", e), e;
}, au = () => ye.createFromPath(iu());
function ou() {
	Z = new k({
		width: 1e3,
		height: 800,
		titleBarStyle: "hiddenInset",
		transparent: !0,
		backgroundColor: "#00000000",
		...process.platform !== "darwin" && { icon: au() },
		webPreferences: {
			preload: N(Bl, "preload.js"),
			nodeIntegration: !0,
			contextIsolation: !1,
			webviewTag: !0,
			webSecurity: !1
		}
	});
	let e = A.isPackaged ? N(Bl, "../dist/webview-preload.js") : N(Bl, "../public/webview-preload.js");
	Z.webContents.on("will-attach-webview", (t, n, r) => {
		let i = typeof r.preload == "string" ? r.preload.replace(/^file:\/\//, "") : "";
		if (i && Ee(i) !== Ee(e)) {
			t.preventDefault(), console.warn("[WebView] blocked untrusted preload:", r.preload);
			return;
		}
		n.preload = e, n.allowRunningInsecureContent = !1, n.webSecurity = !0;
	}), Z.webContents.setWindowOpenHandler(({ url: e }) => {
		try {
			let t = new URL(e);
			(t.protocol === "http:" || t.protocol === "https:") && Hl.openExternal(t.toString());
		} catch {}
		return { action: "deny" };
	}), Z.on("close", (e) => {
		if (!Wl) {
			if (e.preventDefault(), console.log("Main window is closing! (event fired)"), Object.keys($).length > 0) {
				let e = _e.showMessageBoxSync(Z, {
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
					icon: au()
				});
				if (e === 0) return;
				let t = e === 2;
				for (let e in $) {
					try {
						Gl[e] && (t ? Gl[e].end() : typeof Gl[e].destroy == "function" ? Gl[e].destroy() : Gl[e].end(), delete Gl[e]), $[e].kill();
					} catch {}
					delete $[e];
				}
			} else for (let e in $) delete $[e];
			Q && !Q.isDestroyed() && (console.log("Destroying island window"), Q.destroy(), Q = null);
			for (let e of Object.keys($)) Yl.invalidate(e), Xl.cancelForTerminalSession(e);
			Zl?.stop(), Wl = !0;
			let t = Z;
			Z = null, t && !t.isDestroyed() && t.destroy(), A.quit();
		}
	}), Q = new k({
		width: 600,
		height: 600,
		x: Math.round((xe.getPrimaryDisplay().workAreaSize.width - 600) / 2),
		y: 20,
		transparent: !0,
		backgroundColor: "#00000000",
		frame: !1,
		hasShadow: !1,
		alwaysOnTop: !0,
		resizable: !1,
		movable: !1,
		show: !1,
		...process.platform !== "darwin" && { icon: au() },
		webPreferences: {
			preload: N(Bl, "preload.js"),
			nodeIntegration: !0,
			contextIsolation: !1
		}
	}), Q.setAlwaysOnTop(!0, "screen-saver"), Q.setVisibleOnAllWorkspaces(!0, { visibleOnFullScreen: !0 }), Q.setFocusable(!1), Q.setIgnoreMouseEvents(!0, { forward: !0 }), Z.webContents.on("render-process-gone", (e, t) => {
		console.error("win render-process-gone:", t);
	}), Z.webContents.on("did-fail-load", (e, t, n) => {
		console.error("win did-fail-load:", t, n);
	}), process.env.VITE_DEV_SERVER_URL ? (Z.loadURL(process.env.VITE_DEV_SERVER_URL), Q.loadURL(process.env.VITE_DEV_SERVER_URL + "#island"), Z.webContents.openDevTools()) : (Z.loadFile(N(Bl, "../dist/index.html")), Q.loadFile(N(Bl, "../dist/index.html"), { hash: "island" }));
}
A.setName("EasyTerminal");
var su = 0;
function cu(e, t) {
	let n = Tl.get("model_providers", []), r = Tl.get("app_settings"), i = e || r?.reasoningModel?.providerId, a = t || r?.reasoningModel?.model, o = n.find((e) => e.id === i);
	return !o || !a ? null : {
		provider: o.id,
		baseUrl: o.baseUrl,
		chatEndpoint: o.chatEndpoint,
		apiKey: o.apiKey,
		model: a,
		apiFormat: o.apiFormat
	};
}
function lu() {
	let e = Tl.get("app_settings")?.embeddingModel;
	if (!e) return {
		source: "local",
		localUrl: "http://localhost:11434",
		model: ""
	};
	if (e.source === "local") return {
		source: "local",
		localUrl: e.localUrl || "http://localhost:11434",
		model: e.model
	};
	if (e.source === "provider") {
		let t = Tl.get("model_providers", []).find((t) => t.id === e.providerId);
		return {
			source: "provider",
			providerBaseUrl: t?.baseUrl,
			providerEmbeddingEndpoint: t?.embeddingEndpoint,
			providerApiKey: t?.apiKey,
			model: e.model
		};
	}
	return {
		source: "custom",
		customBaseUrl: e.customBaseUrl,
		customEmbeddingEndpoint: e.customEmbeddingEndpoint,
		customApiKey: e.customApiKey,
		model: e.model
	};
}
var uu = Ec({
	getLLMConfig: cu,
	getEmbeddingConfig: lu,
	listContextArtifacts: () => tt.listArtifacts(),
	saveContextSnippet: (e, t) => tt.saveContextSnippet(e, t),
	queryContextRecords: (e) => m(e),
	listContextSnapshots: (e) => E(e),
	listSessionEvents: (e, t) => u(e, t),
	setUIIntent: (e) => {
		let t = {
			...e,
			createdAt: e.createdAt || (/* @__PURE__ */ new Date()).toISOString()
		};
		return ru(t), t;
	},
	clearUIIntent: () => (ru(null), !0)
}), du = Sc(), fu = gc({
	getEmbeddingConfig: lu,
	projectRoot: process.cwd(),
	driftGuard: du
});
j.handle("prompt:list", (e, t) => x(t)), j.handle("prompt:get", (e, t) => se(t)), j.handle("prompt:create", (e, t) => y(t)), j.handle("prompt:update", (e, t, n) => ae(t, n)), j.handle("prompt:delete", (e, t) => ie(t)), j.handle("prompt:render", (e, t, n) => _(t, n)), j.handle("prompt:search", (e, t) => d(t)), j.handle("prompt:optimize", async (e, t) => {
	let n = cu();
	if (!n) throw Error("No reasoning model configured");
	return oe(n, t);
}), j.handle("skill:list", (e, t) => ne(t)), j.handle("skill:get", (e, t) => C(t)), j.handle("skill:delete", (e, t) => re(t)), j.handle("skill:toggle", (e, t, n) => w(t, n)), j.handle("skill:categories", () => ee()), j.handle("skill:reindex", async () => O(lu())), j.handle("skill:search", async (e, t, n) => T(t, lu(), n)), j.handle("kb:list", async (e, t) => (await import("./knowledge-base-fphKqt1d.js")).listDocuments(t)), j.handle("kb:get", async (e, t) => (await import("./knowledge-base-fphKqt1d.js")).getDocument(t)), j.handle("kb:delete", async (e, t) => (await import("./knowledge-base-fphKqt1d.js")).deleteDocument(t)), j.handle("kb:collections", async () => (await import("./knowledge-base-fphKqt1d.js")).getCollections()), j.handle("kb:add-document", async (e, t, n) => {
	let r = await import("./knowledge-base-fphKqt1d.js"), i = lu();
	return r.addDocument(t, i, n);
}), j.handle("kb:retrieve", async (e, t, n, r) => {
	let i = await import("./knowledge-base-fphKqt1d.js"), a = lu();
	return i.retrieveContext(t, a, n, r);
}), j.handle("kb:build-rag-prompt", async (e, t, n, r) => {
	let i = await import("./knowledge-base-fphKqt1d.js"), a = lu();
	return i.buildRAGPrompt(t, a, n, r);
}), j.handle("workflow:list", async () => (await import("./workflow-engine-BTguir-y.js")).listWorkflows()), j.handle("workflow:get", async (e, t) => (await import("./workflow-engine-BTguir-y.js")).getWorkflow(t)), j.handle("workflow:create", async (e, t) => (await import("./workflow-engine-BTguir-y.js")).createWorkflow(t)), j.handle("workflow:update", async (e, t, n) => (await import("./workflow-engine-BTguir-y.js")).updateWorkflow(t, n)), j.handle("workflow:delete", async (e, t) => (await import("./workflow-engine-BTguir-y.js")).deleteWorkflow(t)), j.handle("workflow:runs", async (e, t) => (await import("./workflow-engine-BTguir-y.js")).listWorkflowRuns(t)), j.handle("workflow:build-agent-prompt", async (e, t) => (await import("./workflow-engine-BTguir-y.js")).buildWorkflowAgentPrompt(t)), j.handle("workflow:execute", async (e, t, n) => {
	let r = await import("./workflow-engine-BTguir-y.js"), i = cu();
	if (!i) throw Error("No reasoning model configured");
	let a = lu();
	return r.executeWorkflow(t, i, n, a, {
		onNodeStart: (e) => {
			Z && !Z.isDestroyed() && Z.webContents.send("workflow:status", {
				type: "node_start",
				nodeId: e.id,
				nodeType: e.type,
				nodeLabel: e.label,
				timestamp: (/* @__PURE__ */ new Date()).toISOString()
			});
		},
		onNodeComplete: (e) => {
			Z && !Z.isDestroyed() && Z.webContents.send("workflow:status", {
				type: "node_complete",
				nodeId: e.id,
				nodeType: e.type,
				nodeLabel: e.label,
				timestamp: (/* @__PURE__ */ new Date()).toISOString()
			});
		},
		onLog: (e) => {
			Z && !Z.isDestroyed() && Z.webContents.send("workflow:log", e);
		}
	});
}), j.handle("capability:list", (e, t, n) => uu.list({
	query: t,
	kinds: n
})), j.handle("capability:get", (e, t) => uu.get(t)), j.handle("capability:invoke", async (e, t, n) => uu.invoke(t, n || {}));
var pu = null, mu = async () => {
	if (!pu) {
		let { createAgentRuntime: e } = await import("./agent-runtime-C-o1saFC.js");
		pu = e({
			getLLMConfig: cu,
			buildContextPacket: (e) => fu.buildContextPacket(e),
			capabilityRegistry: uu,
			readFile: async (e) => {
				try {
					return P.readFileSync(e, "utf-8").substring(0, 1e4);
				} catch (e) {
					return `Error reading file: ${e instanceof Error ? e.message : "Unknown error"}`;
				}
			},
			runCommand: async (e) => new Promise((t) => {
				je(e, { timeout: 3e4 }, (e, n, r) => {
					t(e ? `Error: ${e.message}\n${r}` : n || r || "(no output)");
				});
			}),
			sendStreamEvent: (e) => {
				Z && !Z.isDestroyed() && Z.webContents.send("agent:stream", e);
			}
		});
	}
	return pu;
};
j.handle("agent:react", async (e, t, n, r) => (await mu()).run(t, n, r)), j.handle("ui:intent:get-current", () => ql), j.handle("ui:intent:set", (e, t) => {
	let n = {
		...t,
		createdAt: t.createdAt || (/* @__PURE__ */ new Date()).toISOString()
	};
	return ru(n), n;
}), j.handle("ui:intent:clear", () => (ru(null), !0)), j.handle("ui:intent:action", (e, t, n) => (console.log("[UIIntent] Action triggered:", t, n?.id || ql?.id || "no-intent"), {
	ok: !0,
	actionId: t,
	intentId: n?.id || ql?.id || null
})), j.handle("llm:chat", async (e, t, n, r) => {
	let i = cu(n, r);
	if (!i) throw Error("No LLM configured");
	return pe(i, t);
}), j.handle("llm:simple", async (e, t, n, r, i) => {
	let a = cu(r, i);
	if (!a) throw Error("No LLM configured");
	return fe(a, t, n);
}), j.handle("db:init", () => (t(), !0)), j.handle("preference:learn-prompt", (e, t) => {
	rc(t);
}), j.handle("preference:learn-skill", (e, t, n) => {
	ic(t, n);
}), j.handle("preference:learn-language", (e, t) => {
	ac(t);
}), j.handle("preference:get", (e, t) => sc(t)), j.handle("preference:build-block", () => cc()), A.whenReady().then(() => {
	if (process.platform === "darwin" && A.dock && (A.dock.show(), !A.isPackaged)) {
		let e = au();
		A.dock.setIcon(e);
	}
	j.handle("get-context-path", () => tt.basePath), j.handle("get-webview-preload-path", () => {
		let e = A.isPackaged ? N(Bl, "../dist/webview-preload.js") : N(Bl, "../public/webview-preload.js");
		return console.log("Resolved webview preload path:", e), e;
	}), nu(), ou();
	let t = "CommandOrControl+Shift+C";
	ve.isRegistered(t) && ve.unregister(t), ve.register(t, () => {
		let e = Date.now();
		if (e - su < 1e3) {
			console.log("[GlobalShortcut] Ignored duplicate trigger within 1s");
			return;
		}
		if (su = e, process.platform === "darwin") {
			let e = ge.readText();
			console.log(`[GlobalShortcut] Triggered. Old clipboard length: ${e.length}`), ge.clear(), setTimeout(() => {
				je("osascript -e 'tell application \"System Events\" to key code 8 using {command down}'", (t) => {
					if (t) {
						console.error("[GlobalShortcut] Failed to simulate Cmd+C", t), ge.writeText(e), Z && !Z.isDestroyed() && Z.webContents.send("notification:show", {
							title: "Permission Required",
							body: "Please grant Accessibility permission in System Settings to capture selected text.",
							type: "error"
						});
						return;
					}
					let n = 0, r = () => {
						ge.availableFormats();
						let t = ge.readText();
						if (console.log(`[GlobalShortcut] Polling ${n + 1}/15... New length: ${t.length}, Is empty: ${!t}`), t && t.trim() !== "") {
							let e = tt.saveContextSnippet(t, "GlobalShortcut");
							e && (e.isSensitive ? Q && !Q.isDestroyed() && (Q.showInactive(), Q.webContents.send("island:prompt", {
								message: "⚠️ 已保存，但检测到内容可能包含敏感隐私（如账号、资产等），请注意数据安全。",
								options: [{
									key: "ok",
									label: "我知道了"
								}],
								sessionId: "system",
								sessionName: "Privacy Alert"
							})) : Z && !Z.isDestroyed() && Z.webContents.send("notification:show", {
								title: "Context Captured",
								body: "Selected text saved successfully.",
								type: "success"
							}));
							return;
						}
						if (n >= 15) {
							console.log("[GlobalShortcut] Timeout reached. Cmd+C failed or no text selected."), ge.writeText(e), Z && !Z.isDestroyed() && Z.webContents.send("notification:show", {
								title: "Capture Failed",
								body: "No text was selected or copy failed. Please try Cmd+C manually.",
								type: "warning"
							});
							return;
						}
						n++, setTimeout(r, 100);
					};
					setTimeout(r, 100);
				});
			}, 300);
		} else setTimeout(() => {
			let e = ge.readText();
			if (e && e.trim()) {
				let t = tt.saveContextSnippet(e, "GlobalShortcut");
				t && (t.isSensitive ? Q && !Q.isDestroyed() && (Q.showInactive(), Q.webContents.send("island:prompt", {
					message: "⚠️ 已保存，但检测到内容可能包含敏感隐私（如账号、资产等），请注意数据安全。",
					options: [{
						key: "ok",
						label: "我知道了"
					}],
					sessionId: "system",
					sessionName: "Privacy Alert"
				})) : Z && !Z.isDestroyed() && Z.webContents.send("notification:show", {
					title: "Context Captured",
					body: "Clipboard saved successfully.",
					type: "success"
				}));
			}
		}, 100);
	}) || console.error(`[GlobalShortcut] Failed to register ${t}. It might be used by another app.`), j.on("pty:kill", (e, t) => {
		if (Yl.invalidate(t), Xl.cancelForTerminalSession(t), $[t]) {
			Gl[t] && (Gl[t].end(), delete Gl[t]);
			try {
				$[t].kill();
			} catch {}
			delete $[t];
		}
	}), j.on("pty:rename", (e, t, n) => {
		Yl.updateLabel(t, n);
	}), j.on("pty:create", (e, t) => {
		if ($[t]) return;
		let n = Hl, r = [], i = Ul ? Vc(t) : void 0, a = Yl.register({
			terminalSessionId: t,
			instanceId: Jl,
			label: t,
			...i ? { tmuxSessionName: i } : {}
		});
		if (Ul) {
			n = "tmux", r = [
				"new-session",
				"-A",
				"-s",
				i
			];
			for (let [e, t] of Object.entries({
				EASYTERMINAL_TERMINAL_SESSION_ID: a.terminalSessionId,
				EASYTERMINAL_CHANNEL_TOKEN: a.channelToken,
				EASYTERMINAL_HOOK_SOCKET: tu(),
				EASYTERMINAL_INSTANCE_ID: a.instanceId
			})) try {
				Me("tmux", [
					"set-environment",
					"-t",
					i,
					e,
					t
				], { stdio: "ignore" });
			} catch {}
		} else Oe.platform() !== "win32" && (r = ["-l"]);
		let o = Ae.spawn(n, r, {
			name: "xterm-256color",
			cols: 80,
			rows: 30,
			cwd: Kl,
			env: Hc(process.env, a, tu())
		});
		Yl.attachPty(t, o), Gl[t] = tt.createSessionLogger(t, t), o.onData((e) => {
			Z && !Z.isDestroyed() && Z.webContents.send(`pty:data:${t}`, e), Gl[t] && Gl[t].write(e);
		}), o.onExit(() => {
			Yl.markPtyExit(t), Xl.cancelForTerminalSession(t), delete $[t], delete Gl[t];
		}), $[t] = o, e.reply(`pty:created:${t}`);
	}), j.on("pty:write", (e, t, n) => {
		$[t]?.write(n);
	}), j.on("pty:resize", (e, t, n, r) => {
		$[t]?.resize(n, r);
	}), j.handle("autocomplete:path", async (e, t, n) => {
		try {
			let e = n && P.existsSync(n) ? n : Kl, r = we(t), i = t.startsWith("/") ? we(t) : r === "." ? e : N(e, r), a = Ce(t), o = t.startsWith("/") || r === "." ? "" : `${r.replace(/\\/g, "/")}/`;
			return P.existsSync(i) ? P.readdirSync(i).filter((e) => e.startsWith(a)).map((e) => {
				let t = N(i, e);
				return `${o}${P.statSync(t).isDirectory() ? `${e}/` : e}`;
			}) : [];
		} catch {
			return [];
		}
	});
	let n = null, i = null, o = 0, c = (e) => {
		let t = e.trim();
		if (!t || t.includes("�") || t.length > 64 || t.startsWith("/") && !t.startsWith("./") && !t.startsWith("../")) return !1;
		for (let e = 0; e < t.length; e++) if (t.charCodeAt(e) < 32) return !1;
		return /^(?:[A-Za-z0-9_.-]+|\.{1,2}\/[A-Za-z0-9_./-]+)$/.test(t);
	}, l = (e = 120) => {
		let t = Date.now();
		if (i && t - o < 15e3) return i.slice(0, e);
		let n = process.env.HOME || "/", r = [{
			path: N(n, ".zsh_history"),
			normalize: (e) => {
				let t = e.indexOf(";");
				return (t >= 0 ? e.slice(t + 1) : e).trim();
			}
		}, {
			path: N(n, ".bash_history"),
			normalize: (e) => e.trim()
		}], a = [], s = /* @__PURE__ */ new Set();
		for (let t of r) {
			try {
				if (!P.existsSync(t.path)) continue;
				let n = P.readFileSync(t.path, "utf-8").split("\n").map(t.normalize).filter(Boolean);
				for (let t of n.reverse()) if (!t.includes("�") && !(t.length > 280) && !s.has(t) && (s.add(t), a.push(t), a.length >= e)) break;
			} catch {}
			if (a.length >= e) break;
		}
		return i = a, o = t, a.slice(0, e);
	}, d = (e, t = 80) => {
		let n = [], r = /* @__PURE__ */ new Set();
		for (let i of e) {
			let e = i.trim().split(/\s+/)[0];
			if (!(!e || !c(e) || r.has(e)) && (r.add(e), n.push(e), n.length >= t)) break;
		}
		return n;
	}, h = (e, t) => {
		let n = e.toLowerCase(), r = 0, i = 0;
		if (n.startsWith(t)) r = 1200 + t.length * 12;
		else {
			for (let e = 0; e < n.length && i < t.length; e++) n[e] === t[i] && (r += 10, (e === 0 || "/_- .".includes(n[e - 1])) && (r += 8), i++);
			if (i < t.length) return null;
		}
		return r;
	}, _ = (e, t = 5, n = 1200) => {
		let r = [], i = new Set([
			".git",
			"node_modules",
			"dist",
			"dist-electron",
			"release"
		]), a = (o, s) => {
			if (r.length >= n || s > t) return;
			let c = o ? N(e, o) : e, l;
			try {
				l = P.readdirSync(c, { withFileTypes: !0 });
			} catch {
				return;
			}
			for (let e of l) {
				if (r.length >= n) break;
				if (i.has(e.name)) continue;
				let t = o ? `${o.replace(/\\/g, "/")}/${e.name}` : e.name;
				e.isDirectory() ? (r.push({
					path: `${t}/`,
					isDir: !0
				}), a(t, s + 1)) : e.isFile() && r.push({
					path: t.replace(/\\/g, "/"),
					isDir: !1
				});
			}
		};
		return a("", 0), r;
	};
	j.handle("autocomplete:fuzzy", async (e, t) => {
		if (!t.trim()) return [];
		if (!n) try {
			let e = (process.env.PATH || "").split(":").filter(Boolean), t = /* @__PURE__ */ new Set();
			for (let n of e) try {
				let e = P.readdirSync(n);
				for (let r of e) try {
					let e = N(n, r), i = P.statSync(e);
					i.isFile() && i.mode & 73 && t.add(r);
				} catch {}
			} catch {}
			n = Array.from(t).sort();
		} catch {
			n = [];
		}
		let r = t.toLowerCase(), i = l(), a = d(i), o = [...new Set([
			...i,
			...a,
			...n
		])], s = [];
		for (let e of o) {
			let t = h(e, r);
			if (t === null) continue;
			let n = i.indexOf(e), o = a.indexOf(e), c = n >= 0 ? (i.length - n) * 3 : 0, l = o >= 0 ? (a.length - o) * 2 : 0;
			s.push({
				cmd: e,
				score: t
			}), s[s.length - 1].score += c + l;
		}
		return s.sort((e, t) => t.score - e.score), s.slice(0, 8).map((e) => e.cmd);
	}), j.handle("autocomplete:history", async (e, t) => {
		let n = l(120), r = t.trim().toLowerCase();
		if (!r) return n.slice(0, 12);
		let i = [];
		for (let e of n) {
			let t = h(e, r);
			if (t === null) continue;
			let a = (n.length - n.indexOf(e)) * 4;
			i.push({
				cmd: e,
				score: t + a
			});
		}
		return i.sort((e, t) => t.score - e.score).slice(0, 12).map((e) => e.cmd);
	}), j.handle("autocomplete:files", async (e, t, n, r) => {
		let i = n && P.existsSync(n) ? n : Kl, a = t.trim().toLowerCase(), o = r?.localOnly ?? !1, s = r?.preferDirectories ?? !1, c = r?.directoriesFirst ?? !1;
		try {
			let e = P.readdirSync(i, { withFileTypes: !0 }).map((e) => ({
				path: e.isDirectory() ? `${e.name}/` : e.name,
				isDir: e.isDirectory()
			}));
			if (!a) return e.sort((e, t) => Number(t.isDir) - Number(e.isDir) || e.path.localeCompare(t.path)).slice(0, 16).map((e) => ({
				path: e.path,
				isDir: e.isDir
			}));
			let t = o ? e : _(i, 5, 1200), n = [];
			for (let e of t) {
				let t = e.path.replace(/\\/g, "/"), r = t.toLowerCase(), i = Ce(t.replace(/\/$/, "")).toLowerCase(), o = Math.max(h(r, a) ?? -1, h(i, a) ?? -1);
				o < 0 || n.push({
					path: t,
					isDir: e.isDir,
					score: o + (s && e.isDir ? 16 : e.isDir ? 6 : 0)
				});
			}
			return n.sort((e, t) => c && e.isDir !== t.isDir ? Number(t.isDir) - Number(e.isDir) : t.score - e.score || e.path.localeCompare(t.path)).slice(0, 12).map((e) => ({
				path: e.path,
				isDir: e.isDir
			}));
		} catch {
			return [];
		}
	}), j.handle("dialog:open-file", async (e) => {
		let t = k.fromWebContents(e.sender), n = await _e.showOpenDialog(t || void 0, { properties: ["openFile"] });
		return n.canceled ? null : n.filePaths[0] || null;
	}), j.handle("context:list", () => tt.listArtifacts()), j.handle("context:save-snippet", (e, t, n) => tt.saveContextSnippet(t, n)), j.handle("context:record", (e, t) => f(t)), j.handle("context:session-event", (e, t) => p(t)), j.handle("context:records", (e, t) => m(t)), j.handle("context:snapshot:create", (e, t) => g(t)), j.handle("context:snapshots", (e, t) => E(t)), j.handle("context:session-events", (e, t, n) => u(t, n)), j.handle("context:recent-events", (e, t) => D(t)), j.handle("context:build-packet", (e, t) => fu.buildContextPacket(t)), j.handle("context:compact", (e, t) => fu.compactContext(t)), j.handle("context:drift-check", (e, t, n) => du.checkSummary(t, n)), j.handle("context:analyze", async (e, t) => {
		let n = cu();
		if (!n) throw Error("No reasoning model configured");
		try {
			return {
				success: !0,
				analysis: await fe(n, `请分析这段内容：\n\n${t}`, "你是一个代码和终端输出分析助手。请分析以下内容，提取关键信息：\n\n1. 错误和警告信息\n2. 重要的文件路径和命令\n3. 当前工作目录状态\n4. 关键的系统/环境信息\n5. 可能的下一步行动建议\n\n请用简洁的markdown格式返回分析结果。如果内容没有有价值的信息，返回\"无可分析内容\"。")
			};
		} catch (e) {
			return console.error("[Context Analyze] Error:", e), {
				success: !1,
				error: String(e)
			};
		}
	}), j.handle("context:export-json", async (e) => {
		let t = k.fromWebContents(e.sender), n = tt.listArtifacts(), r = m({ limit: 500 }), i = E({ limit: 200 }), a = D(300), o = n.snippets.map((e) => {
			let t = "";
			try {
				t = P.readFileSync(e.path, "utf-8");
			} catch {
				t = "";
			}
			return {
				id: e.id,
				name: e.name,
				path: e.path,
				updatedAt: e.updatedAt,
				tags: e.tags,
				content: t
			};
		}), s = {
			version: 1,
			exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
			basePath: n.basePath,
			counts: {
				records: r.length,
				snapshots: i.length,
				events: a.length,
				snippets: o.length
			},
			records: r,
			snapshots: i,
			events: a,
			snippets: o
		}, c = `easyterminal-context-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`, { canceled: l, filePath: u } = await _e.showSaveDialog(t || void 0, {
			title: "导出上下文数据",
			defaultPath: c,
			filters: [{
				name: "JSON",
				extensions: ["json"]
			}]
		});
		return l || !u ? {
			success: !1,
			canceled: !0
		} : (P.writeFileSync(u, JSON.stringify(s, null, 2), "utf-8"), {
			success: !0,
			filePath: u,
			counts: s.counts
		});
	});
	let v = (e) => {
		if (!e || typeof e != "object" || Array.isArray(e)) throw Error("JSON 顶层必须是对象。");
		let t = e, n = (e) => {
			let n = t[e];
			if (n === void 0) return [];
			if (!Array.isArray(n) || n.some((e) => !e || typeof e != "object" || Array.isArray(e))) throw Error(`${String(e)} 必须是对象数组。`);
			return n;
		}, r = {
			records: n("records"),
			snapshots: n("snapshots"),
			events: n("events"),
			snippets: n("snippets")
		};
		if (!r.records.length && !r.snapshots.length && !r.events.length && !r.snippets.length) throw Error("文件中没有可导入的上下文数组。");
		return r;
	}, y = (e) => {
		let t = 0, n = 0, r = 0, i = 0;
		for (let n of e.records) typeof n.title != "string" || typeof n.summary != "string" || (f({
			scope: n.scope || "project",
			kind: n.kind || "summary",
			title: n.title,
			summary: n.summary,
			details: typeof n.details == "string" ? n.details : "",
			salience: typeof n.salience == "number" ? n.salience : .5,
			status: n.status || "active",
			source_type: n.source_type || "manual",
			source_ref: typeof n.source_ref == "string" ? n.source_ref : "ImportedContext",
			evidence_refs: Array.isArray(n.evidence_refs) ? n.evidence_refs.filter((e) => typeof e == "string") : []
		}), t += 1);
		for (let t of e.snapshots) typeof t.summary_block == "string" && (g({
			session_id: typeof t.session_id == "string" ? t.session_id : "",
			task_id: typeof t.task_id == "string" ? t.task_id : "",
			version: typeof t.version == "number" ? t.version : 1,
			summary_block: t.summary_block,
			token_estimate: typeof t.token_estimate == "number" ? t.token_estimate : Math.ceil(t.summary_block.length / 4),
			drift_score: typeof t.drift_score == "number" ? t.drift_score : 0,
			status: t.status || "candidate"
		}), n += 1);
		for (let t of e.events) typeof t.payload == "string" && (p({
			session_id: typeof t.session_id == "string" ? t.session_id : "imported_session",
			event_type: t.event_type || "manual_capture",
			payload: t.payload,
			token_estimate: typeof t.token_estimate == "number" ? t.token_estimate : Math.ceil(t.payload.length / 4)
		}), r += 1);
		for (let t of e.snippets) typeof t.content != "string" || !t.content.trim() || (tt.saveContextSnippet(t.content.trim(), typeof t.name == "string" ? `Imported:${t.name}` : "ImportedContext"), i += 1);
		return {
			records: t,
			snapshots: n,
			events: r,
			snippets: i
		};
	};
	j.handle("context:import-preview", async (e) => {
		let t = k.fromWebContents(e.sender), n = await _e.showOpenDialog(t || void 0, {
			title: "导入上下文数据",
			properties: ["openFile"],
			filters: [{
				name: "JSON",
				extensions: ["json"]
			}]
		});
		if (n.canceled || !n.filePaths[0]) return {
			success: !1,
			canceled: !0
		};
		try {
			let e = n.filePaths[0], t = v(JSON.parse(P.readFileSync(e, "utf-8")));
			return {
				success: !0,
				filePath: e,
				payload: t,
				counts: {
					records: t.records.filter((e) => typeof e.title == "string" && typeof e.summary == "string").length,
					snapshots: t.snapshots.filter((e) => typeof e.summary_block == "string").length,
					events: t.events.filter((e) => typeof e.payload == "string").length,
					snippets: t.snippets.filter((e) => typeof e.content == "string" && !!e.content.trim()).length
				}
			};
		} catch (e) {
			return {
				success: !1,
				error: e instanceof Error ? e.message : "无法读取或校验 JSON。"
			};
		}
	}), j.handle("context:import-confirm", (e, t) => {
		try {
			return {
				success: !0,
				counts: y(v(t))
			};
		} catch (e) {
			return {
				success: !1,
				error: e instanceof Error ? e.message : "导入失败。"
			};
		}
	}), j.handle("context:import-json", async (e) => {
		let t = await (async () => {
			let t = k.fromWebContents(e.sender), n = await _e.showOpenDialog(t || void 0, {
				title: "导入上下文数据",
				properties: ["openFile"],
				filters: [{
					name: "JSON",
					extensions: ["json"]
				}]
			});
			if (n.canceled || !n.filePaths[0]) return {
				success: !1,
				canceled: !0
			};
			try {
				return {
					success: !0,
					filePath: n.filePaths[0],
					payload: v(JSON.parse(P.readFileSync(n.filePaths[0], "utf-8")))
				};
			} catch (e) {
				return {
					success: !1,
					error: e instanceof Error ? e.message : "无法读取或校验 JSON。"
				};
			}
		})();
		return t.success ? {
			success: !0,
			filePath: t.filePath,
			counts: y(t.payload)
		} : t;
	}), j.handle("file:read", async (e, t) => {
		try {
			let e = t.startsWith("/") ? t : N(Kl, t);
			return P.existsSync(e) ? P.readFileSync(e, "utf-8") : "";
		} catch {
			return "";
		}
	}), j.handle("file:write", async (e, t, n) => {
		try {
			let e = t.startsWith("/") ? t : N(Kl, t);
			return P.writeFileSync(e, n, "utf-8"), !0;
		} catch {
			return !1;
		}
	}), j.handle("fs:homedir", () => process.env.HOME || process.cwd()), j.handle("fs:parent", (e, t) => we(t)), j.handle("fs:list", async (e, t, n) => {
		try {
			if (!P.existsSync(t)) return [];
			let e = [];
			try {
				e = P.readdirSync(t, { withFileTypes: !0 });
			} catch (e) {
				return console.error("Directory read error:", e), [];
			}
			return e.filter((e) => n?.includeHidden ? !0 : !e.name.startsWith(".")).map((e) => {
				let n = !1, r = 0, i = "";
				try {
					n = e.isDirectory();
					let a = P.statSync(N(t, e.name));
					r = a.size, i = a.mtime.toISOString();
				} catch {
					n = !1;
				}
				return {
					name: e.name,
					isDirectory: n,
					path: N(t, e.name),
					size: r,
					mtime: i,
					extension: Te(e.name).replace(".", "").toLowerCase()
				};
			}).sort((e, t) => e.isDirectory === t.isDirectory ? e.name.localeCompare(t.name) : e.isDirectory ? -1 : 1);
		} catch (e) {
			return console.error("fs:list outer error:", e), [];
		}
	}), j.handle("fs:tree:list", async (e, t) => {
		let n = typeof t?.requestId == "string" ? t.requestId : "", r = typeof t?.path == "string" ? Ee(t.path) : "";
		if (!n || !r) return {
			ok: !1,
			requestId: n,
			path: r,
			error: {
				code: "EINVAL",
				message: "目录请求缺少有效路径或 requestId。"
			}
		};
		try {
			let e = await P.promises.readdir(r, { withFileTypes: !0 }), i = await Promise.all(e.filter((e) => t.includeHidden === !0 || !e.name.startsWith(".")).map(async (e) => {
				let t = N(r, e.name), n = e.isDirectory() ? "directory" : "file", i, a;
				try {
					let e = await P.promises.lstat(t);
					n = e.isSymbolicLink() ? "symlink" : e.isDirectory() ? "directory" : "file", i = e.size, a = e.mtime.toISOString();
				} catch {
					n = e.isSymbolicLink() ? "symlink" : n;
				}
				return {
					name: e.name,
					path: t,
					kind: n,
					...i === void 0 ? {} : { size: i },
					...a ? { mtime: a } : {},
					extension: Te(e.name).replace(".", "").toLowerCase() || void 0
				};
			}));
			return i.sort((e, t) => {
				let n = e.kind === "directory";
				return n === (t.kind === "directory") ? e.name.localeCompare(t.name) : n ? -1 : 1;
			}), {
				ok: !0,
				requestId: n,
				path: r,
				entries: i
			};
		} catch (e) {
			let t = typeof e == "object" && e && "code" in e ? String(e.code || "EIO") : "EIO";
			return {
				ok: !1,
				requestId: n,
				path: r,
				error: {
					code: t,
					message: t === "EACCES" || t === "EPERM" ? "没有权限读取此目录。" : t === "ENOENT" ? "目录不存在，可能已被移动或删除。" : "读取目录失败，请稍后重试。"
				}
			};
		}
	}), j.handle("fs:mkdir", async (e, t) => {
		try {
			return P.mkdirSync(t, { recursive: !0 }), !0;
		} catch {
			return !1;
		}
	}), j.handle("fs:rename", async (e, t, n) => {
		try {
			return P.renameSync(t, n), !0;
		} catch {
			return !1;
		}
	}), j.handle("fs:delete", async (e, t) => {
		try {
			return await Hl.trashItem(Ee(t)), { ok: !0 };
		} catch {
			return {
				ok: !1,
				error: "无法将项目移入系统废纸篓。"
			};
		}
	}), j.handle("fs:stat", async (e, t) => {
		try {
			let e = P.statSync(t);
			return {
				size: e.size,
				mtime: e.mtime.toISOString(),
				ctime: e.ctime.toISOString(),
				isDirectory: e.isDirectory()
			};
		} catch {
			return null;
		}
	}), j.handle("file:read-image", async (e, t) => {
		try {
			let e = t.startsWith("/") ? t : N(Kl, t);
			if (P.existsSync(e)) {
				let t = P.readFileSync(e), n = Te(e).toLowerCase().replace(".", "");
				return `data:image/${n === "jpg" ? "jpeg" : n};base64,${t.toString("base64")}`;
			}
			return null;
		} catch (e) {
			return console.error("read-image error:", e), null;
		}
	}), j.handle("island:get-detection-config", () => Ac().getConfig()), j.handle("island:update-detection-config", (e, t) => Ac().updateConfig(t)), j.handle("island:detect-tui", (e, t, n) => Ac().detect(t, n)), j.handle("island:get-state", () => Ac().getState()), j.on("island:set-agent-state", (e, t) => {
		Ac().setAgentState(t);
	}), j.on("island:trigger", (e, t) => {
		Q && !Q.isDestroyed() && (Q.showInactive(), Q.webContents.send("island:show", t));
	}), j.on("island:save-context", (e, t) => {
		if (t.text && t.text.trim()) {
			let n = tt.saveContextSnippet(t.text, t.source);
			n ? e.reply("island:save-result", {
				success: !0,
				filePath: n.filePath,
				isSensitive: n.isSensitive
			}) : e.reply("island:save-result", {
				success: !1,
				reason: "duplicate_or_error"
			});
		}
	}), j.on("island:status", (e, t) => {
		Q && !Q.isDestroyed() && (Q.showInactive(), Q.webContents.send("island:status", t));
	}), j.handle("webview:open-external", async (e, t) => {
		try {
			let e = new URL(t);
			return e.protocol !== "http:" && e.protocol !== "https:" ? {
				ok: !1,
				error: "只允许打开 http 或 https 地址。"
			} : (await Hl.openExternal(e.toString()), { ok: !0 });
		} catch {
			return {
				ok: !1,
				error: "地址无效或系统浏览器无法打开。"
			};
		}
	}), j.handle("browser:send-to-terminal", (e, t) => (t && t.trim() && tt.saveContextSnippet(t, "browser-selection"), !0)), j.handle("browser:save-history", (t, n) => (e("INSERT INTO browser_history (id, url, title, content) VALUES (?, ?, ?, ?)", [
		generateId(),
		n.url,
		n.title,
		n.content || ""
	]), !0)), j.handle("browser:get-history", (e, t) => r("SELECT * FROM browser_history ORDER BY created_at DESC LIMIT ?", [t || 50])), j.handle("browser:plugin:list", () => r("SELECT * FROM browser_plugins ORDER BY created_at DESC")), j.handle("browser:plugin:create", (t, n) => {
		let r = generateId();
		return e("INSERT INTO browser_plugins (id, name, description, match_pattern, script, enabled) VALUES (?, ?, ?, ?, ?, ?)", [
			r,
			n.name,
			n.description || "",
			n.matchPattern || "*://*/*",
			n.script,
			n.enabled === !1 ? 0 : 1
		]), a("browser_plugins", r);
	}), j.handle("browser:plugin:update", (t, n, r) => {
		if (!a("browser_plugins", n)) return null;
		let i = {};
		return r.name !== void 0 && (i.name = r.name), r.description !== void 0 && (i.description = r.description), r.matchPattern !== void 0 && (i.match_pattern = r.matchPattern), r.script !== void 0 && (i.script = r.script), r.enabled !== void 0 && (i.enabled = r.enabled ? 1 : 0), e(`UPDATE browser_plugins SET ${Object.keys(i).map((e) => `${e} = ?`).join(", ")}, updated_at = datetime('now') WHERE id = ?`, [...Object.values(i), n]), a("browser_plugins", n);
	}), j.handle("browser:plugin:delete", (e, t) => (s("browser_plugins", t), !0)), j.handle("browser:plugin:get-enabled", () => r("SELECT * FROM browser_plugins WHERE enabled = 1 ORDER BY created_at DESC")), j.handle("search:unified", async (e, t, n, r) => {
		let { buildLLMConfig: i } = await import("./llm-gateway-DrSAyc8F.js"), a = i(), o = a ? {
			source: "provider",
			providerBaseUrl: a.baseUrl,
			providerApiKey: a.apiKey,
			model: a.model
		} : void 0;
		return Mc({
			query: t,
			modules: n || [
				"prompt",
				"skill",
				"knowledge",
				"workflow",
				"context"
			],
			topK: r || 5,
			embeddingConfig: o
		});
	}), j.handle("workflow:browser-execute", async (e, t) => workflowEngine.executeBrowserScript(t)), j.on("island:prompt", (e, t) => {
		Q && !Q.isDestroyed() && (Q.showInactive(), Q.webContents.send("island:prompt", t));
	}), j.handle("island:interaction-response", async (e, t) => !Q || e.sender !== Q.webContents ? {
		ok: !1,
		code: "forbidden",
		message: "只有灵动岛窗口可以提交交互响应"
	} : Ql ? Ql.submit(t) : {
		ok: !1,
		code: "coordinator_unavailable",
		message: "响应协调器未初始化"
	}), j.handle("island:set-interactive", (e, t) => !Q || e.sender !== Q.webContents ? {
		ok: !1,
		code: "forbidden"
	} : !t?.interactionId || typeof t.interactive != "boolean" ? {
		ok: !1,
		code: "invalid_request"
	} : t.interactive ? (Q.setIgnoreMouseEvents(!1), Q.setFocusable(!0), Q.show(), Q.focus(), {
		ok: !0,
		focused: !0
	}) : (Q.setFocusable(!1), Q.setIgnoreMouseEvents(!0, { forward: !0 }), {
		ok: !0,
		focused: !1
	})), j.handle("island:jump-to-terminal", (e, t) => {
		if (!Q || e.sender !== Q.webContents) return {
			ok: !1,
			code: "forbidden"
		};
		let n = Yl.get(t);
		return !n || !n.alive ? {
			ok: !1,
			code: "session_closed"
		} : (Z && !Z.isDestroyed() && (Z.show(), Z.focus(), Z.webContents.send("terminal:focus-session", t)), Q.setFocusable(!1), Q.setIgnoreMouseEvents(!0, { forward: !0 }), { ok: !0 });
	}), j.on("island:action", () => {
		console.warn("[AgentIntegration] Ignored legacy island:action without a structured interaction");
	}), j.on("island:set-ignore-mouse-events", (e, t) => {
		Q && Q.setIgnoreMouseEvents(t, { forward: !0 });
	}), j.on("export:save-file", async (e, { content: t, format: n, defaultName: r }) => {
		try {
			let i = k.fromWebContents(e.sender), { canceled: a, filePath: o } = await _e.showSaveDialog(i, {
				title: `Save ${n.toUpperCase()}`,
				defaultPath: r,
				filters: [{
					name: n.toUpperCase(),
					extensions: [n]
				}]
			});
			!a && o && P.writeFileSync(o, t, "utf-8");
		} catch (e) {
			console.error("Failed to save file", e);
		}
	}), j.on("export:save-pdf", async (e, { htmlContent: t, defaultName: n }) => {
		try {
			let r = k.fromWebContents(e.sender), { canceled: i, filePath: a } = await _e.showSaveDialog(r, {
				title: "Save PDF",
				defaultPath: n,
				filters: [{
					name: "PDF",
					extensions: ["pdf"]
				}]
			});
			if (!i && a) {
				let e = new k({ show: !1 });
				await e.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(t)}`);
				let n = await e.webContents.printToPDF({
					printBackground: !0,
					margins: { marginType: "default" }
				});
				P.writeFileSync(a, n), e.close();
			}
		} catch (e) {
			console.error("Failed to save PDF", e);
		}
	}), j.on("menu:show", (e, t, n) => {
		let r = [];
		t === "file" && n ? (r.push({
			label: "复制路径 (Copy Path)",
			click: () => e.reply("menu:action", "copy-path", n)
		}, {
			label: "插入终端 (Insert Path)",
			click: () => e.reply("menu:action", "insert-path", n)
		}), n.isDirectory || r.push({
			label: "编辑文件 (Edit File)",
			click: () => e.reply("menu:action", "edit-file", n)
		})) : t === "general" && r.push({
			label: "新增文本文件 (New Text File)",
			click: () => e.reply("menu:action", "new-file", n)
		}, { type: "separator" }, {
			label: "刷新 (Refresh)",
			click: () => e.reply("menu:action", "refresh", n)
		}, {
			label: "粘贴到终端 (Paste)",
			click: () => e.reply("menu:action", "paste", n)
		}, {
			label: "在终端打开 (Open in Terminal)",
			click: () => e.reply("menu:action", "open-terminal", n)
		}), he.buildFromTemplate(r).popup({ window: k.fromWebContents(e.sender) || void 0 });
	});
}), A.on("will-quit", () => {
	ve.unregisterAll();
}), A.on("window-all-closed", () => {
	Z = null, Q = null, Wl || (Wl = !0, A.quit());
}), A.on("activate", () => {
	Z === null ? ou() : (Z.show(), Z.focus());
});
//#endregion
